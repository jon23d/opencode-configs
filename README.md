# OpenCode Agent Configuration

This repository contains the agent definitions, skills, and tools that shape how the OpenCode AI coding assistant behaves when working on development tasks. It is the configuration layer that determines the workflow, standards, and conventions that all agents follow.

## Quickstart

Clone the contents of this repository to `~/.opencode`. Restart OpenCode to use the configuration. To test it, ask for it to 'create a simple CLI application that adds two numbers'. You should see unit tests.

## What This Repository Is

When OpenCode executes a task, it loads configuration from this repository to determine:

- **How to approach development** — the TDD workflow, testing conventions, and design principles
- **What skills to apply** — when to use UI design patterns, API design standards, database schema conventions
- **What quality gates apply** — code review requirements, security review requirements, test requirements
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
├── agents/
│   ├── build.md                                # Product owner and orchestrator (default agent)
│   ├── architect.md                            # Technical architect subagent
│   ├── engineer.md                             # Software engineer (primary, Tab to switch)
│   ├── logger.md                               # Task logging and notifications subagent
│   ├── qa.md                                   # E2E testing and OpenAPI spec verification subagent
│   ├── code-reviewer.md                        # Code review subagent
│   └── security-reviewer.md                    # Security review subagent
├── skills/
│   ├── tdd/SKILL.md                            # Test-driven development workflow
│   ├── testing-best-practices/SKILL.md         # Language-specific testing conventions
│   ├── ui-design/SKILL.md                      # React UI design principles
│   ├── api-design/SKILL.md                     # REST API design principles
│   ├── javascript-application-design/SKILL.md  # JS/TS project conventions
│   ├── database-schema-design/SKILL.md         # PostgreSQL/Prisma schema conventions
│   ├── project-manager/SKILL.md                # Roadmap and task logging conventions
│   ├── e2e-testing/SKILL.md                    # Playwright E2E testing conventions
│   ├── openapi-spec-verification/SKILL.md      # OpenAPI spec-vs-reality comparison
│   └── swagger-ui-verification/SKILL.md        # Swagger UI and raw spec access checks
└── tools/
    └── send-telegram.ts                        # Telegram notification tool
```

## How It Affects OpenCode Behavior

### Orchestration Model

**Build is the orchestrator.** All agents report back to build, and build decides what happens next. Each agent has an "agent contract" at the top of its definition specifying who invokes it, what it expects, what it returns, who it reports to, and what skills it loads by default. Build can override skill loading when delegating tasks.

### Agents

1. **Build** (`agents/build.md`) — The default agent. Product owner and orchestrator. Scopes work, invokes other agents in the correct order, verifies quality gates, manages the roadmap.

2. **Architect** (`agents/architect.md`) — Invoked by build for non-trivial tasks. Reads the codebase and produces implementation plans. Read-only — never writes code.

3. **Engineer** (`agents/engineer.md`) — Implements against plans using TDD. Invokes code-reviewer and security-reviewer during the coding loop. Reports results back to build.

4. **QA** (`agents/qa.md`) — Invoked by build after engineer reports success, when endpoints or UI were changed. Runs Playwright E2E tests and verifies OpenAPI specs match the running API. Returns a structured JSON verdict.

5. **Logger** (`agents/logger.md`) — Invoked by build after all quality gates pass. Loads the `project-manager` skill, writes the task log, and sends the Telegram notification.

6. **Code Reviewer** (`agents/code-reviewer.md`) — Invoked by engineer after code changes. Returns a structured JSON verdict.

7. **Security Reviewer** (`agents/security-reviewer.md`) — Invoked by engineer after code-reviewer passes. Returns a structured JSON security verdict.

### Skills

Skills are loaded on-demand to shape an agent's approach. Each agent's contract lists its default skills, and build can override or extend them when delegating a task.

**Engineer defaults:** `tdd`, `testing-best-practices`. Optional: `ui-design`, `api-design`, `database-schema-design`, `javascript-application-design`

**Architect:** `api-design`, `database-schema-design` (based on task type)

**QA defaults:** `e2e-testing`. When endpoints changed: `openapi-spec-verification`, `swagger-ui-verification`

**Logger:** `project-manager`

### Standard Workflow

```
User Request
    ↓
Build (clarify, check roadmap)
    ↓
Architect (plan — if non-trivial)
    ↓
Build (review plan)
    ↓
Engineer (implement with TDD → invoke reviewers)
    ↓
Build (verify quality gates)
    ↓
QA (E2E tests + OpenAPI verification — if endpoints/UI changed)
    ↓
Logger (write task log, send notification)
    ↓
Build (update roadmap, report to user)
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
