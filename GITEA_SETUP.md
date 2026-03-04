# Gitea Issue Tracking for OpenCode

The build agent can read, create, update, and comment on Gitea issues. When you start a session with a ticket number (e.g. "pick up ticket #42"), it will automatically load the ticket, use its description as the spec, post progress comments, and close the ticket when the work is done.

## Setup

### 1. Add gitea.json to your application repo

Create a `gitea.json` file at the root of the project you're working on (not this config repo):

```json
{
  "repoUrl": "https://gitea.example.com/your-org/your-repo"
}
```

This file contains no secrets and can be committed to the project repo. Each project has its own `gitea.json` pointing at its own repository.

### 2. Create a Gitea access token

1. Log in to your Gitea instance
2. Go to **Settings → Applications → Access Tokens**
3. Create a token with **Issue** read/write scope (no other scopes required)
4. Copy the token — Gitea only shows it once

### 3. Set the access token as an environment variable

```bash
export GITEA_ACCESS_TOKEN=your_token_here
```

Add this to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.) so it's set automatically on every session.

### 4. Restart OpenCode

OpenCode will pick up the environment variable on next launch. When you open a project that has a `gitea.json`, the Gitea tools will automatically use that repo.

---

## How it works

- **Repo URL** — read from `gitea.json` at the root of the project OpenCode is running in. Overridden by `GITEA_REPO_URL` env var if set.
- **Access token** — read from `GITEA_ACCESS_TOKEN` env var only (never stored in files)
- **No token or no `gitea.json`** → all Gitea tools skip gracefully; engineering work continues unaffected

## Overriding the repo URL for a single session

If you need to point at a different repository without editing `gitea.json`, set `GITEA_REPO_URL` in your environment before launching OpenCode:

```bash
GITEA_REPO_URL=https://gitea.example.com/other-org/other-repo opencode
```

The env var takes precedence over `gitea.json`.
