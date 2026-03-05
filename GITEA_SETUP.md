# Gitea Integration for OpenCode

The build agent can read, create, update, and comment on Gitea issues and open pull requests. Configuration is split between `agent-config.json` (non-secret, committed per-project) and environment variables (secrets).

---

## Setup

### 1. Add `agent-config.json` to your project

Create `agent-config.json` at the root of the project you're working on (not this config repo). This file contains no secrets and can be committed:

```json
{
  "issue_tracker": {
    "provider": "gitea",
    "gitea": {
      "repo_url": "https://gitea.example.com/your-org/your-repo"
    }
  },
  "git_host": {
    "provider": "gitea",
    "gitea": {
      "repo_url": "https://gitea.example.com/your-org/your-repo"
    }
  }
}
```

When using Gitea for both issue tracking and code hosting (the typical case), the `repo_url` appears in both sections and points to the same repository.

### 2. Create a Gitea access token

1. Log in to your Gitea instance
2. Go to **Settings → Applications → Access Tokens**
3. Create a token with **Issue** and **Repository** read/write scopes
4. Copy the token — Gitea only shows it once

### 3. Set the access token as an environment variable

```bash
export GITEA_ACCESS_TOKEN=your_token_here
```

Add this to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.) so it's set automatically on every session.

### 4. Restart OpenCode

OpenCode will pick up the environment variable on next launch. When you open a project that has an `agent-config.json`, the Gitea tools will automatically use that repo.

---

## How it works

- **Issue tracker repo URL** — read from `agent-config.json → issue_tracker.gitea.repo_url`. Used by: `gitea-get-issue`, `gitea-list-issues`, `gitea-create-issue`, `gitea-update-issue`, `gitea-add-comment`, `gitea-manage-dependencies`.
- **Git host repo URL** — read from `agent-config.json → git_host.gitea.repo_url`. Used by: `gitea-create-pr`, `gitea-upload-attachment`.
- **Override** — set `GITEA_REPO_URL` to override both sections for a single session.
- **Access token** — read from `GITEA_ACCESS_TOKEN` env var only (never stored in files).
- **No token or no `agent-config.json`** → all Gitea tools skip gracefully; engineering work continues unaffected.

---

## Using Jira for issues and Gitea for code hosting

If you want Jira to track issues but still use Gitea for PRs, set `issue_tracker.provider` to `jira` and keep `git_host.provider` as `gitea`:

```json
{
  "issue_tracker": {
    "provider": "jira",
    "jira": {
      "base_url": "https://mycompany.atlassian.net",
      "project_key": "PROJ"
    }
  },
  "git_host": {
    "provider": "gitea",
    "gitea": {
      "repo_url": "https://gitea.example.com/your-org/your-repo"
    }
  }
}
```

In this configuration, Gitea issue tools are unused and Jira tools handle the ticket lifecycle. See `JIRA_SETUP.md` for Jira credentials setup.

---

## Overriding the repo URL for a single session

```bash
GITEA_REPO_URL=https://gitea.example.com/other-org/other-repo opencode
```

The env var takes precedence over `agent-config.json`.
