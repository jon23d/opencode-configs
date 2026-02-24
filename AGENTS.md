# Global Development Rules

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
6. A task log has been written
7. A Telegram notification has been sent

If you have written code and have not yet invoked both reviewers, you have not
finished the task. Do not summarize, do not ask what to do next, do not say the
task is done. Invoke the reviewers first.

If both reviewers have passed but no log file exists, you have still not finished
the task. Write the log file first.

## TDD gate

If you are about to write implementation code and there is no failing test for
that code, stop. Write the test first. There are no exceptions. Do not write
implementation code that is not demanded by a failing test.