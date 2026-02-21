# Global Development Rules

## Mandatory workflow

These rules are non-negotiable and apply to every coding task without exception.

CRITICAL: Before writing any implementation code, write a failing test first.
Load the `tdd` skill at the start of every coding task and follow it exactly.

CRITICAL: After completing any code changes, invoke the `code-reviewer` subagent
with the contents of every modified file. Do not consider a task complete until
the reviewer returns a `"pass"` or `"pass_with_issues"` verdict with no `critical`
or `major` issues.

## Dependency injection

Always use dependency injection in backend code. Never use DI in React components.

## Definition of done

A coding task is NEVER complete until all of the following are true:

1. A failing test was written before any implementation code
2. The `code-reviewer` subagent has returned a JSON verdict
3. The verdict is `"pass"` or `"pass_with_issues"` with no `critical` or `major` issues
4. A task log file has been written to `agent-logs/YYYY-MM-DD_task-name.md`

If you have written code and have not yet invoked the code-reviewer, you have
not finished the task. Do not summarize, do not ask what to do next, do not
say the task is done. Invoke the reviewer first.

If the reviewer has passed but no log file exists, you have still not finished
the task. Write the log file first.

## TDD gate

If you are about to write implementation code and there is no failing test for that code, stop. Write the test first. There are no exceptions. Do not write implementation code that is not demanded by a failing test.

## Task logging

A task is not complete until a log file has been written.

After every task, write a file to `agent-logs/YYYY-MM-DD-HH-MM_task-name.md` with:
- The prompt given
- A bullet list of actions taken
- Files created or modified
- The output of the final code review subagent run, including any issues found and how they were resolved

Do not say a task is done until this file exists.