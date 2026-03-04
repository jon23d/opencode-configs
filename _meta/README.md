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
| `build` | `agents/build.md` | Default. Product owner and orchestrator. Scopes work, delegates, verifies quality gates. Invokes all other agents. |
| `backend-engineer` | `agents/backend-engineer.md` | Implements API endpoints, services, DB migrations, business logic. TDD. Invokes code-reviewer and security-reviewer. |
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
| `logger` | `agents/logger.md` | Writes task log, sends Telegram notification. | `build` (after developer-advocate completes) |

### Standard workflow

```
User request
  → build (clarify, check roadmap)
  → architect (plan — if non-trivial)
  → build (review plan)
  → backend-engineer and/or frontend-engineer (TDD → code-reviewer → security-reviewer → observability-reviewer)
  → build (verify quality gates)
  → qa (E2E + OpenAPI — if endpoints/UI changed)
  → devops-engineer (if new service or infra change)
  → developer-advocate (docs, docker-compose, mocks)
  → logger (task log + Telegram)
  → build (update roadmap, report to user)
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
| `e2e-testing` | `skills/e2e-testing/SKILL.md` | When writing, running, or evaluating E2E tests. Engineers load when adding/modifying endpoints or UI flows. QA loads when running the suite. |
| `openapi-spec-verification` | `skills/openapi-spec-verification/SKILL.md` | When verifying OpenAPI spec vs running API |
| `swagger-ui-verification` | `skills/swagger-ui-verification/SKILL.md` | When checking API docs are served correctly |
| `dockerfile-best-practices` | `skills/dockerfile-best-practices/SKILL.md` | When writing any Dockerfile |
| `deployment-planning` | `skills/deployment-planning/SKILL.md` | When designing CI/CD or release strategy |
| `kubernetes-manifests` | `skills/kubernetes-manifests/SKILL.md` | When writing K8s manifests (confirm with user first) |
| `observability` | `skills/observability/SKILL.md` | Loaded automatically by `observability-reviewer`. Also load when implementing logging, metrics, tracing, or health checks. |
| `project-manager` | `skills/project-manager/SKILL.md` | When writing task logs or managing roadmap |

---

## Design Philosophy

These principles have shaped the configuration and should inform future changes:

**Structured quality gates, not ad-hoc checks.** Every reviewer returns a structured
JSON verdict. Agents know exactly what pass/fail means. Build can read verdicts
programmatically.

**Principle of least access.** Reviewer subagents (code-reviewer, security-reviewer)
have no write or bash access. Read-only agents cannot accidentally mutate state.

**Specialisation over generalism.** Backend and frontend engineers are separate agents
with separate permissions and skills, not a single "engineer" agent. This produces
more consistent, role-appropriate output.

**Skills encode conventions; agents encode workflow.** Conventions about how to write
code live in skills (which can be updated independently). Agent files encode
orchestration logic and role boundaries.

**Provider-agnostic infrastructure.** devops-engineer avoids cloud-vendor lock-in
by default. Docker is the portability layer.

**Every task ends with documentation and a log.** developer-advocate and logger run
on every ticket. This is non-negotiable in the definition of done.

---

## Design Decisions

See `_meta/decisions.md` for full context and history.

### Observability reviewer (resolved)

`agents/observability-reviewer.md` and `skills/observability/SKILL.md` have been
added. The agent is a pure reviewer subagent (read-only, no write access), modelled
on `security-reviewer`. It is a required quality gate: both `backend-engineer` and
`frontend-engineer` must invoke it after security-reviewer passes, before reporting
back to build. The skill is stack-agnostic, with Node.js/TypeScript conventions
documented and Python/Go as stubs to be expanded when those languages are adopted.

---

## Tools

`tools/send-telegram.ts` — Custom tool used by the `logger` agent to send Telegram
notifications. Requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` environment
variables. See `TELEGRAM_SETUP.md` for setup.

---

## Notes for Future Conversations

- **The README.md at the repo root is the human-facing doc.** It may lag slightly
  behind the actual state of the repo. Trust the files in `agents/` and `skills/`
  over the README when there is a discrepancy.
- **AGENTS.md is the canonical definition of done.** If you are checking whether a
  workflow step is required, AGENTS.md is authoritative.
- **When proposing a new agent,** follow the pattern in `agents/security-reviewer.md`
  (for read-only subagents) or `agents/devops-engineer.md` (for implementing primaries).
  Every agent needs: a frontmatter block, an agent contract section, and clear role
  boundaries with adjacent agents.
- **When proposing a new skill,** the skill should be self-contained — an agent should
  be able to load it cold and know exactly what conventions to apply.
- **The current tech stack** is Node.js / TypeScript, pnpm, React, PostgreSQL + Prisma,
  Playwright. The config is being designed to accommodate additional languages in future.
