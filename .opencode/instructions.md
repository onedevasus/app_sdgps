# Auto-Commit Rules

## 1. Commit after every feature or bug fix
After finishing a feature, fixing a bug, or completing any meaningful change that compiles/passes tests, you MUST commit the changes before stopping or switching context.

Commit message format: `type(scope): short description`

Examples: `feat(users): add ROLE_SUPER_ADMIN filter`, `fix(routing): restore parent route children`

## 2. Commit before mode switch
Before you finish a conversation turn that results in code changes, commit those changes. Do not rely on the user to do this manually.

## 3. Check for uncommitted work
If you are about to complete a task and there are uncommitted changes in the working tree (`git status --porcelain` is non-empty), commit them automatically.

## 4. Guard against OpenCode workspace resets
OpenCode resets the workspace to the last commit when switching between plan/build modes. Uncommitted work is LOST. Therefore, committing early and often is critical.
