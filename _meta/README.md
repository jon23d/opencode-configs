# Meta: OpenCode Config Repository

This folder is for AI assistants working on this repository. It captures context,
design decisions, and in-progress work so future conversations can be productive
without re-deriving everything from scratch.

---

## What This Repository Is

This is the **OpenCode configuration repository** for a development team. It defines
the agents, skills, and global rules that shape how the OpenCode AI coding assistant
behaves across all projects. It is not a production application — it is the meta-layer
that governs how code is built.

When a developer uses OpenCode on a project, this config determines the workflow,
quality gates, coding standards, and agent delegation model.

---

## OpenCode Documentation

Read these before making changes to agents, skills, or tools:

- **Intro / overview:** https://opencode.ai/docs/
- **Agents** (how to define primary agents and subagents): https://opencode.ai/docs/agents/
- **Rules / AGENTS.md** (global rules file): https://opencode.ai/docs/rules/
- **Skills** (reusable instruction sets loaded on demand): https://opencode.ai/docs/skills/
- **Custom tools:** https://opencode.ai/docs/tools/
- **Plugins:** https://opencode.ai/docs/plugins/

---

## Current Agent Roster

All agents live in `agents/`. The canonical orchestration model is:
**Build orchestrates everything. All agents report back to build.**

### Primary agents (user can Tab-switch to these)

| Agent | File | Role |
|---|---|---|
| `build` | `agents/build.md` | Default. Product owner and orchestrator. Scopes work, manages issue tracker, delegates, verifies quality gates, commits, opens PRs. |
| `backend-engineer` | `agents/backend-engineer.md` | Implements API endpoints, services, DB migrations, business logic. TDD. Invokes code-reviewer, security-reviewer, observability-reviewer. |
| `frontend-engineer` | `agents/frontend-engineer.md` | Implements React components and client-side logic. TDD. Screenshots all UI changes. Invokes reviewers. |
| `devops-engineer` | `agents/devops-engineer.md` | Produces Dockerfiles, Kubernetes manifests, CI/CD pipelines. Provider-agnostic. Confirms before K8s. Invokes security-reviewer. |

### Subagents (invoked by other agents via `@mention`)

| Agent | File | Role | Invoked by |
|---|---|---|---|
| `architect` | `agents/architect.md` | Reads codebase, writes implementation plans. Read-only — never writes code. | `build` (non-trivial tasks) |
| `code-reviewer` | `agents/code-reviewer.md` | Reviews code for quality. Returns structured JSON verdict. | `backend-engineer`, `frontend-engineer` |
| `security-reviewer` | `agents/security-reviewer.md` | Reviews code for security vulnerabilities. Returns structured JSON verdict. | `backend-engineer`, `frontend-engineer`, `devops-engineer` |
| `observability-reviewer` | `agents/observability-reviewer.md` | Reviews code for observability gaps across logging, metrics, tracing, health, error capture, and alertability. Returns structured JSON verdict. | `backend-engineer`, `frontend-engineer` |
| `qa` | `agents/qa.md` | Playwright E2E tests + OpenAPI spec verification. Returns structured JSON verdict. | `build` (after engineer success, when endpoints/UI changed) |
| `developer-advocate` | `agents/developer-advocate.md` | Keeps README, docker-compose, external mocks, and docs/ up to date. | `build` (every ticket, after quality gates pass) |
| `logger` | `agents/logger.md` | Sends Telegram notification with PR URL. Input: PR URL + one-sentence summary. | `build` (after PR is opened) |

### Standard workflow

```
User request
  → build (read agent-config.json, load issue tracker skill, set up worktree, rename session)
  → architect (plan — if non-trivial)
  → build (review plan)
  → backend-engineer and/or frontend-engineer (TDD → code-reviewer → security-reviewer → observability-reviewer)
  → build (verify quality gates)
  → qa (E2E + OpenAPI — if endpoints/UI changed)
  → devops-engineer (if new service or infra change)
  → developer-advocate (docs, docker-compose, mocks)
  → build (upload screenshots, commit, push, open PR with full body as task log)
  → logger (Telegram notification with PR URL)
  → build (report to user, leave worktree for review)
```

---

## Current Skill Roster

All skills live in `skills/<name>/SKILL.md`. Agents load skills on demand.

| Skill | Path | When to load |
|---|---|---|
| `tdd` | `skills/tdd/SKILL.md` | Before writing any code |
| `testing-best-practices` | `skills/testing-best-practices/SKILL.md` | When writing or reviewing tests |
| `api-design` | `skills/api-design/SKILL.md` | When designing REST endpoints |
| `database-schema-design` | `skills/database-schema-design/SKILL.md` | When designing/modifying DB schema |
| `javascript-application-design` | `skills/javascript-application-design/SKILL.md` | JS/TS project structure decisions |
| `ui-design` | `skills/ui-design/SKILL.md` | When building/modifying UI |
| `e2e-testing` | `skills/e2e-testing/SKILL.md` | When writing, running, or evaluating E2E tests |
| `openapi-spec-verification` | `skills/openapi-spec-verification/SKILL.md` | When verifying OpenAPI spec vs running API |
| `swagger-ui-verification` | `skills/swagger-ui-verification/SKILL.md` | When checking API docs are served correctly |
| `dockerfile-best-practices` | `skills/dockerfile-best-practices/SKILL.md` | When writing any Dockerfile |
| `deployment-planning` | `skills/deployment-planning/SKILL.md` | When designing CI/CD or release strategy |
| `kubernetes-manifests` | `skills/kubernetes-manifests/SKILL.md` | When writing K8s manifests (confirm with user first) |
| `observability` | `skills/observability/SKILL.md` | Loaded by `observability-reviewer`. Also load when implementing logging, metrics, tracing, or health checks. |
| `project-manager` | `skills/project-manager/SKILL.md` | When managing task context — not for roadmap (roadmap removed) |
| `gitea-issues` | `skills/gitea-issues/SKILL.md` | Loaded by `build` when `issue_tracker.provider = "gitea"` in `agent-config.json` |
| `jira` | `skills/jira/SKILL.md` | Loaded by `build` when `issue_tracker.provider = "jira"` in `agent-config.json` |
| `github-issues` | `skills/github-issues/SKILL.md` | Loaded by `build` when `issue_tracker.provider = "github"` in `agent-config.json` |
| `worktrees` | `skills/worktrees/SKILL.md` | Loaded by `build` at the start of every session before implementation begins |

---

## Tools

All tools live in `tools/`. Two shared library modules live in `tools/lib/`.

### Shared libraries

| File | Purpose |
|---|---|
| `tools/lib/agent-config.ts` | Reads `agent-config.json` from the project root. Exports config helpers for all providers: `getGiteaIssueConfig()`, `getGiteaHostConfig()`, `getGithubIssueConfig()`, `getGithubHostConfig()`. |
| `tools/lib/jira-client.ts` | Jira API token client. Exports `getJiraClient()` (Basic Auth via `JIRA_EMAIL` + `JIRA_API_TOKEN`, no OAuth2), `toAdf()`, `adfToText()`. |

### Gitea tools

Gitea issue tools read from `agent-config.json → issue_tracker.gitea.repo_url`.
Gitea host tools (PR, attachments) read from `agent-config.json → git_host.gitea.repo_url`.
Both respect `GITEA_REPO_URL` env var as an override. Auth: `GITEA_ACCESS_TOKEN`.

| Tool | Purpose |
|---|---|
| `gitea-get-issue` | Read issue + comments |
| `gitea-list-issues` | List issues by state |
| `gitea-create-issue` | Create a new issue |
| `gitea-update-issue` | Update title, body, state, assignees |
| `gitea-add-comment` | Post a comment |
| `gitea-manage-dependencies` | List/add/remove issue dependencies (resolves display number → internal ID automatically) |
| `gitea-create-pr` | Open a pull request |
| `gitea-upload-attachment` | Upload file as issue/PR attachment (returns markdown embed URL) |

### Jira tools

All Jira tools read from `agent-config.json → issue_tracker.jira`. Auth: OAuth2 via
`JIRA_ACCESS_TOKEN` / `JIRA_REFRESH_TOKEN` + `JIRA_CLIENT_ID` + `JIRA_CLIENT_SECRET`.
See `JIRA_SETUP.md` for the full auth setup and re-authentication instructions.

| Tool | Purpose |
|---|---|
| `jira-get-issue` | Read issue + comments (ADF → plain text) |
| `jira-search-issues` | JQL search |
| `jira-create-issue` | Create issue (plain text → ADF) |
| `jira-update-issue` | Update fields |
| `jira-add-comment` | Post a comment |
| `jira-transition-issue` | Change status (lists available transitions if name omitted) |
| `jira-assign-issue` | Assign by accountId |
| `jira-link-pr` | Post PR URL as comment; optionally create issue-to-issue links |
| `jira-upload-attachment` | Upload screenshot/file attachment |
| `jira-search-users` | Resolve display name/email → accountId |

### GitHub tools

GitHub issue tools read from `agent-config.json → issue_tracker.github.repo_url`.
The PR tool reads from `agent-config.json → git_host.github.repo_url`.
Both respect `GITHUB_REPO_URL` env var as an override. Auth: `GITHUB_ACCESS_TOKEN`.
GitHub Enterprise Server is supported — URL is auto-detected from `repo_url` hostname.
See `GITHUB_SETUP.md` for full setup instructions.

| Tool | Purpose |
|---|---|
| `github-get-issue` | Read issue + comments |
| `github-list-issues` | List issues by state (filters PRs client-side) |
| `github-create-issue` | Create a new issue |
| `github-update-issue` | Update title, body, state, labels, assignees |
| `github-add-comment` | Post a comment |
| `github-create-pr` | Open a pull request (supports `draft` flag) |

### Other tools

| Tool | Purpose |
|---|---|
| `send-telegram` | Send Telegram notification. Requires `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`. See `TELEGRAM_SETUP.md`. |
| `rename-session` | Rename the current OpenCode session. Called by `build` after ticket and slug are known: `Issue #N - slug` (Gitea/GitHub), `PROJ-N - slug` (Jira). Uses `sessionID` from tool context via `PATCH /session/{id}`. |

---

## Per-project configuration: `agent-config.json`

Each project repo (not this config repo) should have an `agent-config.json` at its root:

```json
{
  "issue_tracker": {
    "provider": "gitea",
    "gitea": { "repo_url": "https://git.example.com/owner/repo" }
  },
  "git_host": {
    "provider": "gitea",
    "gitea": { "repo_url": "https://git.example.com/owner/repo" }
  }
}
```

Or with Jira for issues and Gitea for code hosting:

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
    "gitea": { "repo_url": "https://git.example.com/owner/repo" }
  }
}
```

Or with GitHub for both issues and git hosting:

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

This file contains no secrets. Secrets stay in environment variables. See `GITEA_SETUP.md`, `JIRA_SETUP.md`, and `GITHUB_SETUP.md` for full setup instructions.

---

## Design Philosophy

These principles have shaped the configuration and should inform future changes:

**Structured quality gates, not ad-hoc checks.** Every reviewer returns a structured
JSON verdict. Agents know exactly what pass/fail means. Build can read verdicts
programmatically.

**Principle of least access.** Reviewer subagents (code-reviewer, security-reviewer,
observability-reviewer) have no write or bash access. Read-only agents cannot
accidentally mutate state.

**Specialisation over generalism.** Backend and frontend engineers are separate agents
with separate permissions and skills. `build` owns orchestration; engineers own
implementation.

**Skills encode conventions; agents encode workflow.** Conventions about how to write
code live in skills (updated independently). Agent files encode orchestration logic
and role boundaries.

**Provider-agnostic infrastructure.** devops-engineer avoids cloud-vendor lock-in
by default. Docker is the portability layer.

**Two audiences, two documents.** Every task produces an `agent-logs/YYYY-MM-DD-{slug}/log.md`
with the full agent record (implementation plan, tradeoffs, full reviewer verdicts, errors,
follow-up reasoning, embedded screenshots). The PR body is a clean human summary pointing
to the log. Reviewers read the PR; agents and analysts read the log.

**Screenshots are committed, not uploaded.** Screenshots are saved to `agent-logs/YYYY-MM-DD-{slug}/`
by `@frontend-engineer` and embedded in the PR body via relative paths. This works
universally across Gitea and GitHub without any upload API.

**Issue tracker is a signal, not a blocker.** Ticket tracking (Gitea or Jira) enriches
the workflow but never stalls it. If an API call fails, the agent reports it and
continues. Closing/resolving tickets is always the human's decision.

**Worktrees for isolation.** Every session operates in a dedicated git worktree
(`~/worktrees/{project}/{slug}`). This enables multiple concurrent workstreams and
clean separation between sessions.

---

## Design Decisions

See `_meta/decisions.md` for full context and history.

---

## Notes for Future Conversations

- **`agent-config.json` lives in the project repo, not this config repo.** It is
  per-project and non-secret. The tools read it from `process.cwd()` at runtime.
- **`AGENTS.md` is the canonical definition of done.** If you are checking whether a
  workflow step is required, AGENTS.md is authoritative.
- **The `worktrees` skill is always loaded** at the start of every session, before
  any issue tracker skill.
- **The issue tracker skill is provider-specific.** `build` reads `agent-config.json`,
  checks `issue_tracker.provider`, and loads `gitea-issues`, `jira`, or `github-issues`.
- **Session is renamed** to `Issue #N - slug` or `PROJ-N - slug` as soon as the
  ticket and slug are known (Step 1b of the worktrees skill).
- **Commit, push, and PR are all owned by `build`.** No subagent commits. Build writes
  `agent-logs/{date}-{slug}/log.md`, runs `git add -A`, `git commit`, `git push`, then
  calls the appropriate PR tool (`gitea-create-pr` or `github-create-pr`) based on
  `git_host.provider`. A second commit follows to add the PR URL back into the log.
- **`agent-logs/` accumulates in the project repo.** Each task leaves a folder under
  `agent-logs/YYYY-MM-DD-{slug}/` containing `log.md` and any screenshots. These are
  committed on the feature branch and merged with the PR.
- **When proposing a new agent,** follow the pattern in `agents/security-reviewer.md`
  (for read-only subagents) or `agents/devops-engineer.md` (for implementing primaries).
- **When proposing a new skill,** the skill should be self-contained — an agent should
  be able to load it cold and know exactly what conventions to apply.
- **The current tech stack** is Node.js / TypeScript, pnpm, React, PostgreSQL + Prisma,
  Playwright. The config is designed to accommodate additional languages in future.
- **GitHub uses a PAT, not OAuth2.** No browser flow required — create a fine-grained
  token in GitHub settings, set `GITHUB_ACCESS_TOKEN`. See `GITHUB_SETUP.md`.
- **GitHub Enterprise Server is supported.** The tools detect it automatically from
  the hostname in `repo_url` — no extra config needed beyond the URL.
