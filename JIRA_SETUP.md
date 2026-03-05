# Jira Integration for OpenCode

The build agent can read, create, update, comment on, and transition Jira issues. It uses Jira Cloud's OAuth 2.0 (3-legged) API to act on your behalf.

---

## First-time setup

### 1. Register an OAuth app in Atlassian

1. Go to [developer.atlassian.com/console/myapps](https://developer.atlassian.com/console/myapps/)
2. Click **Create** → **OAuth 2.0 integration**
3. Give it a name (e.g. "OpenCode Agent")
4. Under **Permissions**, add the following scopes:
   - `read:jira-work`
   - `write:jira-work`
   - `read:jira-user`
5. Under **Authorization**, add a callback URL. Since OpenCode runs in a VM, use a placeholder such as `https://localhost/callback` — you will manually extract the code from the redirect URL in step 3 below.
6. Note your **Client ID** and **Client Secret**.

### 2. Add `agent-config.json` to your project

Create `agent-config.json` at the root of the project you're working on (not this config repo). This file contains no secrets and can be committed:

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
      "repo_url": "https://git.example.com/owner/repo"
    }
  }
}
```

Replace `base_url` with your Atlassian site URL and `project_key` with your default project key.

### 3. Complete the OAuth flow to get tokens

Open this URL in a browser (replace `YOUR_CLIENT_ID` and ensure the `redirect_uri` matches what you registered in step 1):

```
https://auth.atlassian.com/authorize
  ?audience=api.atlassian.com
  &client_id=YOUR_CLIENT_ID
  &scope=read%3Ajira-work%20write%3Ajira-work%20read%3Ajira-user%20offline_access
  &redirect_uri=https%3A%2F%2Flocalhost%2Fcallback
  &response_type=code
  &prompt=consent
```

> **Important:** Include `offline_access` in the scope — this grants a refresh token, which allows the agent to stay authenticated without repeating this flow every hour.

After authorising, your browser will redirect to `https://localhost/callback?code=XXXXXXXX`. Copy the `code` value from the URL.

### 4. Exchange the code for tokens

Run this in your terminal (replace the placeholders):

```bash
curl -s -X POST https://auth.atlassian.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "code": "YOUR_CODE",
    "redirect_uri": "https://localhost/callback"
  }' | jq .
```

The response will contain `access_token` and `refresh_token`.

### 5. Set environment variables

Add these to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
export JIRA_CLIENT_ID=your_client_id
export JIRA_CLIENT_SECRET=your_client_secret
export JIRA_REFRESH_TOKEN=your_refresh_token
# JIRA_ACCESS_TOKEN is optional — the agent will obtain it automatically via the refresh token
# export JIRA_ACCESS_TOKEN=your_access_token
```

Optionally, if you want to override the base URL or project key for a specific session:

```bash
export JIRA_BASE_URL=https://mycompany.atlassian.net
export JIRA_PROJECT_KEY=PROJ
```

### 6. Restart OpenCode

OpenCode will pick up the environment variables on next launch.

---

## How it works

- **Base URL and project key** — read from `agent-config.json` at the root of the project OpenCode is running in. Overridden by `JIRA_BASE_URL` / `JIRA_PROJECT_KEY` env vars if set.
- **Cloud ID** — resolved automatically from the Atlassian accessible-resources API using your access token. Never needs to be set manually.
- **Authentication** — the agent uses `JIRA_ACCESS_TOKEN` if set. If not set (or after first use clears it), it automatically calls the Atlassian token endpoint with `JIRA_REFRESH_TOKEN` + `JIRA_CLIENT_ID` + `JIRA_CLIENT_SECRET` to obtain a fresh token. The new token is cached in memory for the duration of the session.
- **No token or config** → all Jira tools fail gracefully with a message pointing here.

---

## Re-authentication (when your refresh token expires)

Jira Cloud refresh tokens expire after **90 days of inactivity**. When this happens, any Jira tool will return:

> Your Jira refresh token has expired (tokens expire after 90 days of inactivity). Re-authentication is required. See JIRA_SETUP.md for step-by-step instructions.

To fix this, repeat **steps 3–5** above to get a new token pair. You do not need to re-register the OAuth app or change your `agent-config.json`.

After updating `JIRA_REFRESH_TOKEN` in your shell profile, restart OpenCode.

---

## Troubleshooting

**"No Jira site found matching..."** — The `base_url` in `agent-config.json` does not match any site the current OAuth token has access to. Verify the URL is exactly `https://yourcompany.atlassian.net` (no trailing slash, no path).

**"Failed to fetch Jira accessible resources: 401"** — Your access token is invalid and the refresh also failed. Check that `JIRA_REFRESH_TOKEN`, `JIRA_CLIENT_ID`, and `JIRA_CLIENT_SECRET` are all set correctly.

**Field validation errors on create/update** — Your Jira project may have required custom fields. Check the error details returned by the tool and add the missing fields to your request.
