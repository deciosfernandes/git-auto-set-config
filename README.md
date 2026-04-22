# git-auto-set-config

Working with git repos where you can have multiple identities (like one for work, one for personal projects, etc.) can be painful. This extension automatically prompts you to set a local `user.email`, `user.name`, and any additional git config keys for each project you open in VS Code that doesn't have them configured yet.

## Features

- Prompts to set local git config when opening a project that has none configured.
- Convenient selector of previously used configs.
- Support for additional git config keys beyond `user.email` and `user.name` (e.g. `core.autocrlf`, `commit.gpgsign`).
- Ability to ignore specific project roots so the extension won't prompt for them.

![demo](media/demo.gif)

## Commands

| Command | Description |
|---------|-------------|
| `git-auto-set-config: Get Config` | Show the current local git config for this project |
| `git-auto-set-config: Set Config` | Manually set the local git config for this project |
| `git-auto-set-config: Ignore current project root` | Stop prompting for this project |
| `git-auto-set-config: Unignore current project root` | Resume prompting for this project |

## Extension Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `git-auto-set-config.configList` | Saved git configs in format `[{"user.email": "you@example.com", "user.name": "Your Name", "core.autocrlf": "true"}]`. The extension writes to this automatically. | `[]` |
| `git-auto-set-config.ignoreRootList` | List of project roots where the extension should not prompt. | `[]` |
| `git-auto-set-config.queryInterval` | How often (in ms) the extension checks whether local git config is set. | `5000` |

## Release Notes

### 1.0.0

- Forked and rebranded from [git-autoconfig](https://github.com/ShyykoSerhiy/git-autoconfig)
- Support for setting additional git config keys (e.g. `core.autocrlf`, `commit.gpgsign`) beyond `user.email` and `user.name`
- Fix: configs with identical email/name but different extra keys are now treated as distinct profiles
- Fix: extra keys from a saved profile are verified on each check; missing keys trigger re-prompting
- Fix: replaced deprecated `vscode.workspace.rootPath` with `workspaceFolders` for multi-root workspace support
- Updated all dependencies; migrated from deprecated `vscode` npm package to `@types/vscode` and `@vscode/test-electron`

### 0.0.2 — 2020-09-13

- Feature: Add option to not auto add config

### 0.0.1 — 2017-04-04

- Initial release
