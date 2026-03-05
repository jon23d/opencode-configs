# Global Development Rules

## Agent hierarchy

These agents work together. **Build is the orchestrator** — it delegates to other agents and they report back.

- **build** (default) — Product owner and orchestrator. Scopes work, delegates, and verifies quality gates. Tracks work via Gitea issues. Invokes all other agents in the correct order.
- **architect** (`@architect`) — Subagent invoked by build. Reads the codebase and produces a written plan. Required for tasks touching APIs, schema, or multiple files.
- **backend-engineer** (Tab to switch) — Implements backend work: endpoints, services, database, business logic. Invokes reviewers directly during the coding loop. Reports back to build when reviewers pass.
- **frontend-engineer** (Tab to switch) — Implements frontend work: React components, UI interactions, client-side logic. Takes screenshots of all UI changes. Invokes reviewers directly during the coding loop. Reports back to build when reviewers pass.
- **devops-engineer** (Tab to switch) — Produces Dockerfiles, Kubernetes manifests, and CI/CD pipeline configuration. Prioritises provider-agnostic infrastructure with Docker as the portability layer. Invoked by build when new services are introduced or deployment work is requested. Always recommends and confirms before generating Kubernetes manifests. Invokes security-reviewer on all produced infrastructure files.
- **code-reviewer** / **security-reviewer** / **observability-reviewer** — Invoked by backend-engineer and frontend-engineer after every change. All three must pass before a task is done. devops-engineer invokes security-reviewer only.
- **qa** (`@qa`) — Invoked by build after engineer reports success, when endpoints or UI were changed. Runs Playwright E2E tests and verifies OpenAPI specs match the running API.
- **developer-advocate** (`@developer-advocate`) — Invoked by build on every ticket after all quality gates pass. Keeps `README.md`, `docker-compose.yml`, external service mocks, and `docs/` up to date so a new engineer can always clone and run the project. Handles local dev infrastructure; devops-engineer handles production infrastructure.
- **logger** (`@logger`) — Invoked by build after developer-advocate completes. Writes the task log (using the `project-manager` skill) and sends the Telegram notification.

For simple, self-contained tasks (single-file edits, copy fixes, config tweaks), architect sign-off is optional. When in doubt, ask build.

---

## Mandatory workflow

These rules are non-negotiable and apply to every coding task without exception.

CRITICAL: Before writing any implementation code, write a failing test first.
Load the `tdd` skill at the start of every coding task and follow it exactly.

CRITICAL: After completing any code changes, the implementing engineer must invoke
the `code-reviewer`, `security-reviewer`, and `observability-reviewer` subagents
with the list of modified or created file paths. Do not consider a task complete
until all three reviewers have returned a `"pass"` or `"pass_with_issues"` verdict
with no `critical` or `major` issues. Invoke in order: code-reviewer first, then
security-reviewer, then observability-reviewer.

## Running tests

Always run `pnpm test` from the monorepo root — full suite, no scope flags. See the `testing-best-practices` skill for the complete rule.

## Dependency injection

Always use dependency injection in backend code. Never use DI in React components.

## Definition of done

A coding task is NEVER complete until all of the following are true:

1. A failing test was written before any implementation code
2. All tests pass — `pnpm test` from the monorepo root, full suite, zero errors (see `testing-best-practices` skill)
3. Playwright E2E tests have been written for any new or modified endpoints or user-facing flows, and `pnpm test:e2e` passes (see `e2e-testing` skill)
4. The `code-reviewer` subagent has returned a `"pass"` or `"pass_with_issues"` verdict with no `critical` or `major` issues
5. The `security-reviewer` subagent has returned a `"pass"` or `"pass_with_issues"` verdict with no `critical` or `major` issues
6. The `observability-reviewer` subagent has returned a `"pass"` or `"pass_with_issues"` verdict with no `critical` or `major` issues
7. The `@qa` agent has verified E2E tests pass and OpenAPI specs match running endpoints (if the task involved endpoint changes or UI work)
8. Screenshots have been taken of all UI changes
9. The `@devops-engineer` agent has been invoked and its `security-reviewer` has passed (if the task introduced a new service or changed deployment infrastructure)
10. The `@developer-advocate` agent has updated `README.md`, `docker-compose.yml`, service mocks, and `docs/` to reflect any changes from this task (including follow-up items from `@devops-engineer`)
11. A pull request has been opened whose body contains: a prose summary, changed files table, tests added, all reviewer verdicts, embedded screenshots (if any UI changes), documentation updates, and follow-up items. The PR body is the task log — no separate log file is written.
12. The `@logger` agent has sent a Telegram notification with the PR URL (or confirmed it was skipped)

**Responsibility:** Items 1–3 and 4–6 are verified by the implementing engineer (`@backend-engineer`, `@frontend-engineer`, or both). Item 7 is handled by `@qa` (invoked by `build`). Item 8 is verified by `@frontend-engineer`. Item 9 is handled by `@devops-engineer` (invoked by `build` when a new service is introduced or deployment infrastructure changes). Item 10 is handled by `@developer-advocate` (invoked by `build`). Items 11–12 are handled by `build` (PR) and `@logger` (Telegram), in that order.

If you have written code and have not yet invoked all three reviewers, you have not
finished the task. Do not summarise, do not ask what to do next, do not say the
task is done. Invoke the reviewers first.

## TDD gate

If you are about to write implementation code and there is no failing test for
that code, stop. Write the test first. There are no exceptions. Do not write
implementation code that is not demanded by a failing test.