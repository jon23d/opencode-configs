---
name: project-manager
description: Roadmap management, task logging, and sprint planning conventions for this project. Load when managing ROADMAP.md, writing task logs, or planning a batch of work.
license: MIT
compatibility: opencode
---

## Roadmap format

Maintain `ROADMAP.md` at the project root with this structure:

```markdown
# Roadmap

## In Progress
- [ ] [TASK-N] Short description — started: YYYY-MM-DD

## Completed
- [x] [TASK-N] Short description — completed: YYYY-MM-DD

## Backlog
- [ ] [TASK-N] Short description — priority: high | medium | low
```

Rules:
- Task IDs are sequential integers, never reused
- Descriptions are ≤ 80 characters
- Move items to Completed (never delete them) when done
- Keep Backlog sorted by priority descending

## Task log format

Each completed task gets a file at `agent-logs/YYYY-MM-DD-HH-MM/task-name.md`:

```markdown
# Task: <title>
**ID**: TASK-N
**Date**: YYYY-MM-DD
**Agent**: engineer
**Architect plan**: yes | no (simple task)

## What was done
Short prose description of what changed and why.

## Files changed
- `path/to/file.ts` — reason

## Tests added
- Description of each new test

## Reviewer findings
- code-reviewer: pass | pass_with_issues — <any notes>
- security-reviewer: pass | pass_with_issues — <any notes>

## Follow-up items
- Any tech debt, deferred work, or open questions to track
```

The slug should match the task description in kebab-case, e.g. `2025-03-01-add-user-auth.md`.

## Sprint / session planning

At the start of a session, supervisor should:
1. Read `ROADMAP.md`
2. Confirm any In Progress items are still active or move them to Backlog
3. Ask the user to confirm the next 1-3 tasks to work on
4. Check for blockers on any high-priority Backlog items

Keep In Progress to a maximum of 3 items. If more than 3 are in progress, surface this as a risk.