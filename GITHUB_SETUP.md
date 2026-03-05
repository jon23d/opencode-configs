# GitHub Setup

This document covers how to configure the GitHub integration for OpenCode.
GitHub can be used as the issue tracker, the git host, or both.

---

## Overview

The GitHub integration uses a **Personal Access Token (PAT)** for authentication.
No OAuth2 flow is required — you create the token once, store it as an environment
variable, and it works indefinitely (until you revoke it or it expires).

GitHub Enterprise Server is supported in addition to github.com.

---

## Step 1: Create a Personal Access Token

### github.com

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**
   (or Classic tokens if you prefer — both work)
2. Click **Generate new token**
3. Set an expiration (recommended: 1 year; rotate when needed)
4. Select the repository (or repositories) this token will access
5. Grant the following permissions:

   **For issue tracking only:**
   - Issues: Read and write
   - Metadata: Read (required)

   **For creating pull requests:**
   - Pull requests: Read and write
   - Contents: Read and write (to push branches)
   - Metadata: Read (required)

6. Click **Generate token** and copy the value — you will not see it again

### GitHub Enterprise Server

Same steps, but navigate to:
`https://{your-github-enterprise-host}/settings/tokens`

---

## Step 2: Set environment variables

Add the following to your shell profile (`.zshrc`, `.bashrc`, etc.) or to the
`.env` file in your project root (never commit secrets to version control):

```bash
# Required
export GITHUB_ACCESS_TOKEN="github_pat_..."

# Optional — overrides agent-config.json repo_url at runtime
# export GITHUB_REPO_URL="https://github.com/owner/repo"
```

`GITHUB_ACCESS_TOKEN` is the only required secret. The repo URL lives in
`agent-config.json` (non-secret).

---

## Step 3: Configure `agent-config.json`

Add a `agent-config.json` to your **project repository root** (not this config
repo). The schema depends on your setup:

### GitHub for both issues and git hosting

```json
{
  "issue_tracker": {
    "provider": "github",
    "github": { "repo_url": "https://github.com/owner/repo" }
  },
  "git_host": {
    "provider": "github",
    "github": { "repo_url": "https://github.com/owner/repo" }
  }
}
```

### GitHub for issues, Gitea for code hosting

```json
{
  "issue_tracker": {
    "provider": "github",
    "github": { "repo_url": "https://github.com/owner/repo" }
  },
  "git_host": {
    "provider": "gitea",
    "gitea": { "repo_url": "https://git.example.com/owner/repo" }
  }
}
```

### Jira for issues, GitHub for code hosting

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
    "provider": "github",
    "github": { "repo_url": "https://github.com/owner/repo" }
  }
}
```

---

## Step 4: Verify

Ask build to list open issues:

> "Show me the open GitHub issues"

Or ask it to read a specific issue:

> "Load issue #42"

If the token is missing or invalid, the tools will return a clear error message
telling you exactly which variable to set.

---

## GitHub Enterprise Server

The tools detect GitHub Enterprise automatically based on the hostname in
`repo_url`. If the hostname is not `github.com`, the API base is constructed as:

```
{origin}/api/v3/repos/{owner}/{repo}
```

For example, if your repo URL is `https://github.mycompany.com/team/project`,
the API base becomes `https://github.mycompany.com/api/v3/repos/team/project`.

No additional configuration is needed — just use your GitHub Enterprise URL
in `repo_url`.

---

## Environment variable reference

| Variable | Required | Description |
|---|---|---|
| `GITHUB_ACCESS_TOKEN` | Yes | Personal access token (fine-grained or classic) |
| `GITHUB_REPO_URL` | No | Overrides `agent-config.json` repo_url at runtime |

---

## Tool reference

| Tool | Reads from |
|---|---|
| `github-get-issue` | `issue_tracker.github.repo_url` (or `GITHUB_REPO_URL`) |
| `github-list-issues` | `issue_tracker.github.repo_url` (or `GITHUB_REPO_URL`) |
| `github-create-issue` | `issue_tracker.github.repo_url` (or `GITHUB_REPO_URL`) |
| `github-update-issue` | `issue_tracker.github.repo_url` (or `GITHUB_REPO_URL`) |
| `github-add-comment` | `issue_tracker.github.repo_url` (or `GITHUB_REPO_URL`) |
| `github-create-pr` | `git_host.github.repo_url` (or `GITHUB_REPO_URL`) |

---

## Known limitations

- **No file attachments via REST API.** GitHub's REST API does not support
  uploading attachments to issues. If screenshots are needed, commit them to
  the feature branch and reference them with relative paths in the PR body,
  or upload them to an external image host.

- **No dependency tracking API.** GitHub has no native issue dependency API.
  Dependencies cannot be listed or managed programmatically.

- **Issues endpoint includes pull requests.** The GitHub issues list endpoint
  returns both issues and PRs. The `github-list-issues` tool filters PRs
  client-side, so only true issues are shown.
