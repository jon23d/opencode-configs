---
name: worktrees
description: Git worktree lifecycle for isolated per-ticket workstreams. Load this skill whenever the user describes a problem to solve or asks to claim a Gitea ticket, before any implementation work begins.
license: MIT
compatibility: opencode
---

## When to use this skill

Load this skill whenever:

- The user describes a problem or feature to implement
- The user asks to pick up or claim a Gitea ticket
- The user brings review feedback for an existing PR

Do not use this skill if the user explicitly asks to work in the current directory.

## Step 0 — Ensure a git repository exists

Before doing anything else, check whether the project is a git repository:

```bash
git -C . rev-parse --is-inside-work-tree
```

If this command fails or returns false, initialise one:

```bash
git init
```

All subsequent steps depend on git being present.

## Step 1 — Derive the worktree path

**Project name**: the last path component of the current working directory.

> cwd `/home/user/dev/myapp` → project = `myapp`

**Slug**:

- With a ticket number: `{number}-{slugified-title}` — e.g. `42-add-user-auth`
- Without a ticket: slugify the problem description into a short kebab-case phrase — e.g. `fix-login-redirect`

Slugification: lowercase, spaces and special characters become hyphens, max ~40 characters, trim trailing hyphens.

**Worktree path**: `~/worktrees/{project}/{slug}`

**Branch name**: `feature/{slug}`

## Step 2 — Create or re-enter the worktree

First, check whether a worktree for this branch already exists:

```bash
git worktree list
```

**If the worktree already exists** at `~/worktrees/{project}/{slug}` (e.g. returning for review feedback):

- Skip to [Passing the path to subagents](#passing-the-path-to-subagents) — the worktree and branch are ready to use as-is
- Do not re-copy `.env` or re-install dependencies unless the user indicates time has passed and they may be stale

**If the worktree does not exist but the branch does** (worktree was manually removed):

```bash
mkdir -p ~/worktrees/{project}
git worktree add ~/worktrees/{project}/{slug} feature/{slug}
```

Then copy `.env` and install dependencies (steps 3–4).

**If neither the worktree nor the branch exists** (fresh start):

```bash
mkdir -p ~/worktrees/{project}
git worktree add ~/worktrees/{project}/{slug} -b feature/{slug}
```

Then copy `.env` and install dependencies (steps 3–4).

If `git worktree add` fails for any other reason, report to the user and stop.

## Step 3 — Copy environment files

```bash
cp .env ~/worktrees/{project}/{slug}/.env
```

Skip silently if `.env` does not exist. Copy any additional non-tracked env files (`.env.local`, `.env.test`) if present.

`gitea.json` does not need to be copied — it is a tracked file present in the worktree automatically.

## Step 4 — Install dependencies

Delegate to `@backend-engineer` before any implementation begins:

> "Before starting work, run the project's dependency install command (e.g. `pnpm install`, `npm install`, `bun install`) from `{worktree_path}`. Confirm once done."

## Passing the path to subagents

Every Task invocation for the duration of this session **must** include:

> "Your working directory for this task is `{worktree_path}`. All file reads, writes, edits, and bash commands must operate relative to this path. Do not operate on files outside this directory."

This applies without exception to: `@backend-engineer`, `@frontend-engineer`, `@devops-engineer`, `@qa`, `@developer-advocate`, `@code-reviewer`, `@security-reviewer`, `@observability-reviewer`, `@logger`.

## Handling review feedback

When the user brings back review feedback from a PR:

1. Re-enter the existing worktree (Step 2 — "already exists" path). Do not create a new one.
2. Pass the worktree path to the relevant engineer(s) along with the review comments.
3. After changes are made and quality gates pass, push again:
   ```bash
   git push origin feature/{slug}
   ```
   This updates the existing PR automatically — no new PR is needed.
4. Post a comment on the Gitea issue noting the updated push (if a ticket is open).
5. Leave the worktree in place for any further rounds of feedback.

## On completion: push and open PR

After all quality gates pass and `@logger` confirms the task log is written:

1. **Determine the base branch:**
   ```bash
   git symbolic-ref refs/remotes/origin/HEAD
   ```
   Strip `refs/remotes/origin/` to get the name (usually `main` or `develop`). Default to `main` if this fails.

2. **Push the feature branch:**
   ```bash
   git push origin feature/{slug}
   ```

3. **Open a pull request** using `gitea-create-pr`:
   - `head`: `feature/{slug}`
   - `base`: branch from step 1
   - `title`: ticket title or concise summary
   - `body`: reference the ticket number if applicable, summarise what changed, note the task log location

4. **Post the PR URL** on the Gitea issue using `gitea-add-comment` (if a ticket number is available):
   ```
   🔀 PR opened: {pr_url}
   ```

5. **Leave the worktree in place.** The branch may need further changes following review. Report the PR URL to the user and let them know the worktree is still available.

## Explicit cleanup

Only remove the worktree when the user confirms the work is done (PR merged, abandoned, or explicitly dismissed):

```bash
git worktree remove ~/worktrees/{project}/{slug}
```

If removal fails due to untracked or modified files, report this rather than force-removing. Leave cleanup to the user.

## Error handling

- Worktree creation failure → report and stop; do not proceed without an isolated workspace
- `.env` copy failure → report and continue; not a blocker
- Dependency install failure → report and ask whether to continue or abort
- `git push` failure → report; do not open PR until push succeeds
- PR creation failure → report the error with the branch name so the user can open it manually
- Worktree removal failure → report and leave it; never force-remove
