# Change Log

All notable changes to the "git-auto-set-config" extension will be documented in this file.

## [1.0.1] — 2026-04-22

- Fix: command IDs and configuration namespace corrected (were `git-autoconfig.*`, now `git-auto-set-config.*`), restoring command palette integration and config persistence
- Fix: pressing Escape during config input now silently cancels instead of showing a validation error
- Fix: polling no longer opens a second prompt while the user is already responding to one
- Fix: extension timer no longer reschedules after deactivation
- Fix: `git` not found on activation now shows a clear error message instead of failing silently
- Fix: all four commands now work correctly in multi-root workspaces with a folder picker
- Fix: auto-check now covers all workspace folders, not just the first
- Improve: profile picker shows `Name <email>` labels with extra keys in the description column
- Improve: email input field validates format inline

## [1.0.0]

- Forked and rebranded from [git-autoconfig](https://github.com/ShyykoSerhiy/git-autoconfig)
- Support for setting additional git config keys (e.g. `core.autocrlf`, `commit.gpgsign`) beyond `user.email` and `user.name`
- Fix: configs with identical email/name but different extra keys are now treated as distinct profiles
- Fix: extra keys from a saved profile are verified on each check; missing keys trigger re-prompting
- Fix: replaced deprecated `vscode.workspace.rootPath` with `workspaceFolders` for multi-root workspace support
- Updated all dependencies; migrated from deprecated `vscode` npm package to `@types/vscode` and `@vscode/test-electron`

## [0.0.2] — 2020-09-13

- Feature: Add option to not auto add config

## [0.0.1] — 2017-04-04

- Initial release
