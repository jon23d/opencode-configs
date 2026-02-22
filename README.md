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
├── AGENTS.md                    # Global development rules (workflow, definition of done)
├── package.json                 # Dependencies (currently just @opencode-ai/plugin)
├── agents/
│   ├── build.md                 # Primary development agent configuration
│   ├── code-reviewer.md         # Code review subagent configuration
│   └── security-reviewer.md     # Security review subagent configuration
├── skills/
│   ├── tdd.md                   # Test-driven development workflow
│   ├── testing-best-practices.md # Language-specific testing conventions
│   ├── ui-design.md            # React UI design principles
│   ├── api-design.md            # REST API design principles
│   ├── javascript-application-design.md # JS/TS project conventions
│   └── database-schema-design.md # PostgreSQL/Prisma schema conventions
└── tools/
    └── send-telegram.ts        # Telegram notification tool
```

## How It Affects OpenCode Behavior

### Agent Types

This repository defines three agent types that OpenCode uses:

1. **Build Agent** (`agents/build.md`)
   - The primary development agent
   - Implements features, fixes bugs, writes tests
   - Follows TDD workflow without exception
   - Must invoke code-reviewer and security-reviewer after every code change
   - Responsible for task logging and notifications

2. **Code Reviewer** (`agents/code-reviewer.md`)
   - Reviews code for correctness, security, performance, maintainability
   - Enforces project standards (testing, OpenAPI, documentation)
   - Returns structured JSON verdict
   - Runs as a subagent after the build agent completes

3. **Security Reviewer** (`agents/security-reviewer.md`)
   - Dedicated security review
   - Focuses on input validation, auth, secrets, injection, data exposure
   - Returns structured JSON verdict
   - Runs after code-reviewer passes

### Skills

Skills are loaded at the start of a task to shape the agent's approach. The build agent loads mandatory skills first, then optional skills based on task type:

**Mandatory Skills:**
- `tdd` — Test-driven development workflow (red-green-refactor cycle)
- `testing-best-practices` — Language-specific testing conventions

**Optional Skills (loaded based on task):**
- `ui-design` — React UI design (Mantine for business apps, Tailwind for consumer apps)
- `api-design` — REST API design principles
- `database-schema-design` — PostgreSQL/Prisma schema conventions
- `javascript-application-design` — JS/TS project structure and tooling

### Workflow

When a developer gives OpenCode a task, the agent follows this workflow:

1. **Load skills** — Based on task type (TDD and testing-best-practices are always loaded)
2. **Read existing code** — Understand patterns before making changes
3. **Write failing test first** — Per TDD, no implementation without a failing test
4. **Implement the minimum** — Make the test pass with the least code possible
5. **Refactor** — Clean up while tests are green
6. **Run tests** — Using `pnpm test` (not direct test runner invocation)
7. **Invoke code-reviewer** — With all modified files
8. **Invoke security-reviewer** — After code-reviewer passes
9. **Take screenshots** — For UI changes, capture interaction states
10. **Write task log** — Document what was done
11. **Send notification** — Telegram notification on completion

### Definition of Done

A task is never complete until ALL of these are true:

1. A failing test was written before any implementation code
2. All tests pass (`pnpm test`)
3. Code-reviewer returns "pass" or "pass_with_issues" (no critical/major issues)
4. Security-reviewer returns "pass" or "pass_with_issues" (no critical/major issues)
5. Screenshots exist for all UI changes
6. Task log written to `agent-logs/YYYY-MM-DD_HH-MM_task-name.md`
7. Telegram notification sent

## Modifying This Repository

If you need to change how OpenCode behaves:

1. **Agent configurations** — Edit files in `agents/` to change agent behavior, tools, or rules
2. **Skills** — Edit files in `skills/` to change domain-specific conventions
3. **Tools** — Add new tools in `tools/` to extend agent capabilities
4. **Global rules** — Edit `AGENTS.md` to change the core workflow

After making changes, verify that OpenCode still functions correctly by running a test task.

## Dependencies

This repository has a minimal dependency:

```json
{
  "dependencies": {
    "@opencode-ai/plugin": "1.2.10"
  }
}
```

The `@opencode-ai/plugin` package provides the plugin framework for defining tools. All other configuration is declarative markdown.
