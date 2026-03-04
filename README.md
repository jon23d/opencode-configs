# OpenCode Agent Configuration

This repository contains the agent definitions, skills, and tools that shape how the OpenCode AI coding assistant behaves when working on development tasks. It is the configuration layer that determines the workflow, standards, and conventions that all agents follow.

## Quickstart

Clone the contents of this repository to `~/.opencode`. Restart OpenCode to use the configuration. To test it, ask for it to 'create a simple CLI application that adds two numbers'. You should see unit tests.

## What This Repository Is

When OpenCode executes a task, it loads configuration from this repository to determine:

- **How to approach development** — the TDD workflow, testing conventions, and design principles
- **What skills to apply** — when to use UI design patterns, API design standards, database schema conventions
- **What quality gates apply** — code review, security review, observability review, and test requirements
- **When a task is complete** — the definition of done that must be satisfied before marking work as finished

This is not a production application. It is a meta-configuration repository that influences how other projects are built.

## Relevant OpenCode documentation
* Intro: https://opencode.ai/docs/
* Agents: https://opencode.ai/docs/agents/
* Rules/AGENTS.md: https://opencode.ai/docs/rules/
* Skills: https://opencode.ai/docs/skills/
* Custom Tools: https://opencode.ai/docs/custom-tools/
* Plugins: https://opencode.ai/docs/plugins/

## Environment variables
None are required, but if you want to enable Telegram integration, you must provide TELEGRAM_BOT_TOKEN
and TELEGRAM_CHAT_ID. See TELEGRAM_SETUP.md for setup instructions.

## Repository Structure

```
./
├── AGENTS.md                                   # Global development rules (workflow, definition of done)
├── package.json                                # Dependencies (currently just @opencode-ai/plugin)
├── _meta/                                      # AI assistant context and design decisions
│   ├── README.md                               # Detailed context for AI conversations
│   └── decisions.md                            # Architectural decision log
├── agents/
│   ├── build.md                                # Product owner and orchestrator (default agent)
│   ├── architect.md                            # Technical architect subagent (read-only)
│   ├── backend-engineer.md                     # Backend engineer (primary, Tab to switch)
│   ├── frontend-engineer.md                    # Frontend engineer (primary, Tab to switch)
│   ├── devops-engineer.md                      # DevOps engineer (primary, Tab to switch)
│   ├── code-reviewer.md                        # Code review subagent (read-only)
│   ├── security-reviewer.md                    # Security review subagent (read-only)
│   ├── observability-reviewer.md               # Observability review subagent (read-only)
│   ├── qa.md                                   # E2E testing and OpenAPI verification subagent
│   ├── developer-advocate.md                   # Documentation and dev experience subagent
│   └── logger.md                               # Task logging and notifications subagent
├── skills/
│   ├── tdd/SKILL.md                            # Test-driven development workflow
│   ├── testing-best-practices/SKILL.md         # Language-specific testing conventions
│   ├── ui-design/SKILL.md                      # React UI design principles and in-app help
│   ├── api-design/SKILL.md                     # REST API design principles
│   ├── javascript-application-design/SKILL.md  # JS/TS project conventions
│   ├── database-schema-design/SKILL.md         # PostgreSQL/Prisma schema conventions
│   ├── project-manager/SKILL.md                # Roadmap and task logging conventions
│   ├── e2e-testing/SKILL.md                    # Playwright E2E testing conventions
│   ├── openapi-spec-verification/SKILL.md      # OpenAPI spec-vs-reality comparison
│   ├── swagger-ui-verification/SKILL.md        # Swagger UI and raw spec access checks
│   ├── observability/SKILL.md                  # Observability standards (OTel, pino, metrics)
│   ├── dockerfile-best-practices/SKILL.md      # Dockerfile conventions
│   ├── deployment-planning/SKILL.md            # CI/CD and deployment strategy
│   └── kubernetes-manifests/SKILL.md           # Kubernetes manifest conventions
└── tools/
    └── send-telegram.ts                        # Telegram notification tool
```

## How It Affects OpenCode Behavior

### Orchestration Model

**Build is the orchestrator.** All agents report back to build, and build decides what happens next. Each agent has an "agent contract" at the top of its definition specifying who invokes it, what it expects, what it returns, who it reports to, and what skills it loads by default. Build can override skill loading when delegating tasks.

### Agents

**Primary agents** (user can Tab-switch to these):

1. **Build** (`agents/build.md`) — The default agent. Product owner and orchestrator. Scopes work, invokes other agents in the correct order, verifies quality gates, manages the roadmap.

2. **Backend Engineer** (`agents/backend-engineer.md`) — Implements backend work: endpoints, services, database, business logic. TDD. Invokes code-reviewer, security-reviewer, and observability-reviewer.

3. **Frontend Engineer** (`agents/frontend-engineer.md`) — Implements frontend work: React components, UI interactions, client-side logic. TDD. Screenshots all UI changes. Invokes all three reviewers.

4. **DevOps Engineer** (`agents/devops-engineer.md`) — Produces Dockerfiles, Kubernetes manifests, CI/CD pipelines. Provider-agnostic. Confirms before K8s. Invokes security-reviewer.

**Subagents** (invoked by other agents):

5. **Architect** (`agents/architect.md`) — Invoked by build for non-trivial tasks. Reads the codebase and produces implementation plans. Read-only — never writes code.

6. **Code Reviewer** (`agents/code-reviewer.md`) — Invoked by engineers after code changes. Returns a structured JSON verdict.

7. **Security Reviewer** (`agents/security-reviewer.md`) — Invoked by engineers after code-reviewer passes. Returns a structured JSON security verdict.

8. **Observability Reviewer** (`agents/observability-reviewer.md`) — Invoked by engineers after security-reviewer passes. Reviews code for observability gaps across logging, metrics, tracing, health, error capture, and alertability. Returns a structured JSON verdict.

9. **QA** (`agents/qa.md`) — Invoked by build after all engineers report success and all three reviewers pass. Runs Playwright E2E tests and verifies OpenAPI specs match the running API.

10. **Developer Advocate** (`agents/developer-advocate.md`) — Invoked by build on every ticket after all quality gates pass. Keeps README, docker-compose, external mocks, and docs/ up to date.

11. **Logger** (`agents/logger.md`) — Invoked by build after developer-advocate completes. Writes the task log and sends the Telegram notification.

### Skills

Skills are loaded on-demand to shape an agent's approach. Each agent's contract lists its default skills, and build can override or extend them when delegating a task.

**Backend Engineer defaults:** `tdd`, `testing-best-practices`. Optional: `api-design`, `database-schema-design`, `javascript-application-design`

**Frontend Engineer defaults:** `tdd`, `testing-best-practices`, `ui-design`. Optional: `api-design`, `javascript-application-design`

**Architect:** `api-design`, `database-schema-design` (based on task type)

**DevOps Engineer defaults:** `dockerfile-best-practices`, `deployment-planning`. Optional: `kubernetes-manifests`

**QA defaults:** `e2e-testing`. When endpoints changed: `openapi-spec-verification`, `swagger-ui-verification`

**Observability Reviewer:** `observability`

**Logger:** `project-manager`

### Standard Workflow

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

### Definition of Done

See `AGENTS.md` for the canonical definition. It is the single source of truth for what constitutes a completed task.

## Modifying This Repository

1. **Agent configurations** — Edit files in `agents/` to change agent behavior, tools, or rules
2. **Skills** — Edit files in `skills/` to change domain-specific conventions
3. **Tools** — Add new tools in `tools/` to extend agent capabilities
4. **Global rules** — Edit `AGENTS.md` to change the core workflow

After making changes, verify that OpenCode still functions correctly by running a test task.

## Dependencies

```json
{
  "dependencies": {
    "@opencode-ai/plugin": "1.2.10"
  }
}
```

The `@opencode-ai/plugin` package provides the plugin framework for defining tools. All other configuration is declarative markdown.
