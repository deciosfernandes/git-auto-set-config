'use strict';
import * as vscode from 'vscode';
import { Git, findGit, Repository, GitError } from './git/git';
import {
    getConfigList,
    updateConfigList,
    GitConfig,
    generateGitConfigKey,
    getConfigQueryInterval,
    addRootToIgnoreList,
    removeRootFromIgnoreList,
    isRootInIgnoreList
} from './config/config';
import {
    COMMAND_GET_CONFIG,
    COMMAND_SET_CONFIG,
    COMMAND_IGNORE_ROOT,
    COMMAND_UNIGNORE_ROOT
} from './consts';

const MESSAGE_PREFIX = 'git-autoconfig: ';

type ProfileItem = vscode.QuickPickItem & { config?: GitConfig; action?: 'custom' | 'ignore' };

let timeoutId: ReturnType<typeof setTimeout>;

export async function activate(context: vscode.ExtensionContext) {
    clearTimeout(timeoutId);

    let git: Git;
    try {
        const gitConf = await findGit(undefined);
        git = new Git({ gitPath: gitConf.path, version: gitConf.version });
    } catch {
        vscode.window.showErrorMessage(`${MESSAGE_PREFIX}git executable not found. Please install git and reload VS Code.`);
        return;
    }

    const findRepositoryRoot = async (fsPath: string, showError = true): Promise<string | null> => {
        try {
            return await git.getRepositoryRoot(fsPath);
        } catch (e) {
            if (showError) {
                let msg = `${MESSAGE_PREFIX}Failed to get git repository root.`;
                if (e instanceof GitError) msg += ` ${e.gitErrorCode}`;
                vscode.window.showWarningMessage(msg);
            }
            return null;
        }
    };

    const pickWorkspaceFolder = async (): Promise<string | null> => {
        const folders = vscode.workspace.workspaceFolders ?? [];
        if (folders.length === 0) return null;
        if (folders.length === 1) return folders[0].uri.fsPath;
        const pick = await vscode.window.showQuickPick(
            folders.map(f => ({ label: f.name, description: f.uri.fsPath, fsPath: f.uri.fsPath })),
            { ignoreFocusOut: true, placeHolder: 'Select workspace folder' }
        );
        return pick?.fsPath ?? null;
    };

    const getGitConfig = async (repository: Repository, showMessages = true): Promise<GitConfig | null> => {
        try {
            const userEmail = (await repository.configGet('local', 'user.email', {})).trim();
            const userName = (await repository.configGet('local', 'user.name', {})).trim();
            const result: GitConfig = { 'user.email': userEmail, 'user.name': userName };

            const matchingProfile = getConfigList().find(c =>
                c['user.email'] === userEmail && c['user.name'] === userName
            );
            if (matchingProfile) {
                for (const key of Object.keys(matchingProfile)) {
                    if (key !== 'user.email' && key !== 'user.name') {
                        try {
                            result[key] = (await repository.configGet('local', key, {})).trim();
                        } catch {
                            return null;
                        }
                    }
                }
            }

            if (showMessages) {
                vscode.window.showInformationMessage(`${MESSAGE_PREFIX}${JSON.stringify(result)}`);
            }
            return result;
        } catch {
            if (showMessages) {
                vscode.window.showWarningMessage(`${MESSAGE_PREFIX}user.email or user.name is not set locally.`);
            }
            return null;
        }
    };

    const applyGitConfig = async (repository: Repository, newConfig: GitConfig): Promise<boolean> => {
        try {
            const configList = getConfigList();
            const newConfigKey = generateGitConfigKey(newConfig);
            if (!configList.find(c => generateGitConfigKey(c) === newConfigKey)) {
                configList.push(newConfig);
                await updateConfigList(configList);
            }
            await repository.config('local', 'user.email', newConfig['user.email']);
            await repository.config('local', 'user.name', newConfig['user.name']);
            for (const key of Object.keys(newConfig)) {
                if (key !== 'user.email' && key !== 'user.name') {
                    await repository.config('local', key, newConfig[key]);
                }
            }
        } catch {
            vscode.window.showErrorMessage(`${MESSAGE_PREFIX}Failed to set local git config.`);
            return false;
        }
        vscode.window.showInformationMessage(`${MESSAGE_PREFIX}Local git config successfully set.`);
        return true;
    };

    const customSetGitConfig = async (): Promise<GitConfig | null> => {
        const userEmail = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: 'user.email like: "you@example.com"',
            prompt: 'Enter the email for your git account.'
        });
        if (!userEmail) {
            vscode.window.showInformationMessage(`${MESSAGE_PREFIX}user.email must not be empty.`);
            return null;
        }
        const userName = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: 'user.name like: "Jane Doe"',
            prompt: 'Enter the name for your git account.'
        });
        if (!userName) {
            vscode.window.showInformationMessage(`${MESSAGE_PREFIX}user.name must not be empty.`);
            return null;
        }
        const newConfig: GitConfig = { 'user.email': userEmail, 'user.name': userName };
        while (true) {
            const extraKey = await vscode.window.showInputBox({
                ignoreFocusOut: true,
                placeHolder: 'e.g. core.autocrlf, commit.gpgsign (leave empty to finish)',
                prompt: 'Optionally enter an additional git config key, or leave empty to finish.'
            });
            if (!extraKey) break;
            const extraValue = await vscode.window.showInputBox({
                ignoreFocusOut: true,
                placeHolder: `Value for ${extraKey}`,
                prompt: `Enter value for ${extraKey}.`
            });
            if (extraValue !== undefined) {
                newConfig[extraKey] = extraValue;
            }
        }
        return newConfig;
    };

    const setGitConfig = async (repositoryRoot?: string) => {
        if (!repositoryRoot) {
            const fsPath = await pickWorkspaceFolder();
            if (!fsPath) return;
            repositoryRoot = await findRepositoryRoot(fsPath);
            if (!repositoryRoot) return;
        }
        const repository = new Repository(git, repositoryRoot);
        const configList = getConfigList();

        let newConfig: GitConfig | null;

        if (configList.length) {
            const items: ProfileItem[] = [
                ...configList.map(c => ({ label: generateGitConfigKey(c), config: c })),
                { label: '$(pencil) Enter custom config...', action: 'custom' as const },
                { label: '$(circle-slash) Ignore this root', action: 'ignore' as const }
            ];
            const pick = await vscode.window.showQuickPick(items, {
                ignoreFocusOut: true,
                placeHolder: 'Select a saved profile, enter a new one, or ignore this root.'
            });
            if (!pick) return;
            if (pick.action === 'ignore') {
                await addRootToIgnoreList(repositoryRoot);
                return;
            }
            newConfig = pick.action === 'custom' ? await customSetGitConfig() : pick.config!;
        } else {
            newConfig = await customSetGitConfig();
        }

        if (newConfig) {
            await applyGitConfig(repository, newConfig);
        }
    };

    const checkForLocalConfig = async () => {
        try {
            for (const folder of vscode.workspace.workspaceFolders ?? []) {
                const repositoryRoot = await findRepositoryRoot(folder.uri.fsPath, false);
                if (!repositoryRoot || isRootInIgnoreList(repositoryRoot)) continue;
                const repository = new Repository(git, repositoryRoot);
                const gitConfig = await getGitConfig(repository, false);
                if (!gitConfig) {
                    console.log(`${MESSAGE_PREFIX}Config not set for ${repositoryRoot}.`);
                    await setGitConfig(repositoryRoot);
                } else {
                    console.log(`${MESSAGE_PREFIX}Config exists for ${repositoryRoot}: ${JSON.stringify(gitConfig)}`);
                }
            }
        } catch (e) {
            console.log(`${MESSAGE_PREFIX}Error in checkForLocalConfig: ${JSON.stringify(e)}`);
        } finally {
            timeoutId = setTimeout(checkForLocalConfig, getConfigQueryInterval());
        }
    };

    timeoutId = setTimeout(checkForLocalConfig, 0);

    const getConfigCommand = vscode.commands.registerCommand(COMMAND_GET_CONFIG, async () => {
        const fsPath = await pickWorkspaceFolder();
        if (!fsPath) return;
        const repositoryRoot = await findRepositoryRoot(fsPath);
        if (!repositoryRoot) return;
        const repository = new Repository(git, repositoryRoot);
        await getGitConfig(repository);
    });

    const setConfigCommand = vscode.commands.registerCommand(COMMAND_SET_CONFIG, async () => {
        await setGitConfig();
    });

    const ignoreRootCommand = vscode.commands.registerCommand(COMMAND_IGNORE_ROOT, async () => {
        const fsPath = await pickWorkspaceFolder();
        if (!fsPath) return;
        const repositoryRoot = await findRepositoryRoot(fsPath);
        if (!repositoryRoot) return;
        await addRootToIgnoreList(repositoryRoot);
    });

    const unignoreRootCommand = vscode.commands.registerCommand(COMMAND_UNIGNORE_ROOT, async () => {
        const fsPath = await pickWorkspaceFolder();
        if (!fsPath) return;
        const repositoryRoot = await findRepositoryRoot(fsPath);
        if (!repositoryRoot) return;
        await removeRootFromIgnoreList(repositoryRoot);
    });

    context.subscriptions.push(getConfigCommand, setConfigCommand, ignoreRootCommand, unignoreRootCommand);
}

export function deactivate() {
    clearTimeout(timeoutId);
}
