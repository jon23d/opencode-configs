# Global Development Rules

## Agent hierarchy

These agents work together. **Build is the orchestrator** — it delegates to other agents and they report back.

- **build** (default) — Product owner and orchestrator. Scopes work, delegates, verifies quality gates, manages the roadmap. Invokes all other agents in the correct order.
- **architect** (`@architect`) — Subagent invoked by build. Reads the codebase and produces a written plan. Required for tasks touching APIs, schema, or multiple files.
- **engineer** (Tab to switch) — Implements against the architect's plan. Invokes reviewers directly during the coding loop. Reports back to build when reviewers pass.
- **code-reviewer** / **security-reviewer** — Invoked by engineer after every code change. Both must pass before a task is done.
- **logger** (`@logger`) — Invoked by build after all quality gates pass. Writes the task log (using the `project-manager` skill) and sends the Telegram notification.

For simple, self-contained tasks (single-file edits, copy fixes, config tweaks), architect sign-off is optional. When in doubt, ask build.

---

## Mandatory workflow

These rules are non-negotiable and apply to every coding task without exception.

CRITICAL: Before writing any implementation code, write a failing test first.
Load the `tdd` skill at the start of every coding task and follow it exactly.

CRITICAL: After completing any code changes, invoke the `code-reviewer` and
`security-reviewer` subagents with the contents of every modified file. Do not
consider a task complete until both reviewers have returned a `"pass"` or
`"pass_with_issues"` verdict with no `critical` or `major` issues.

## Running tests

Always run tests using `pnpm test`. Never invoke the test runner directly with
`vitest`, `jest`, or any other command. The `pnpm test` script is the source of
truth — it runs linting, type checking, and tests together. A passing `vitest`
run is not a passing test suite.

## Dependency injection

Always use dependency injection in backend code. Never use DI in React components.

## Definition of done

A coding task is NEVER complete until all of the following are true:

1. A failing test was written before any implementation code
2. All tests pass — verified by running `pnpm test`
3. The `code-reviewer` subagent has returned a `"pass"` or `"pass_with_issues"` verdict with no `critical` or `major` issues
4. The `security-reviewer` subagent has returned a `"pass"` or `"pass_with_issues"` verdict with no `critical` or `major` issues
5. Screenshots have been taken of all UI changes
6. The `@logger` agent has written a task log to `agent-logs/YYYY-MM-DD-HH-MM/task-name.md`
7. The `@logger` agent has sent a Telegram notification (or confirmed it was skipped)

**Responsibility:** Items 1–5 are verified by `engineer` (who invokes the reviewers). Items 6–7 are handled by `@logger` (invoked by `build` after engineer reports success).

If you have written code and have not yet invoked both reviewers, you have not
finished the task. Do not summarize, do not ask what to do next, do not say the
task is done. Invoke the reviewers first.

## TDD gate

If you are about to write implementation code and there is no failing test for
that code, stop. Write the test first. There are no exceptions. Do not write
implementation code that is not demanded by a failing test.