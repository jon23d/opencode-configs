---
name: e2e-testing
description: End-to-end testing conventions using Playwright. Covers test execution, project structure expectations, and failure reporting. Load when running or evaluating E2E tests.
license: MIT
compatibility: opencode
---

## Framework

Playwright is the E2E testing framework. No exceptions.

## Running E2E tests

Run the project's end-to-end test suite with:

```bash
pnpm test:e2e
```

If no `test:e2e` script exists in `package.json`, check for a Playwright config file (`playwright.config.ts` or `playwright.config.js`). If found, run:

```bash
pnpm exec playwright test
```

If no Playwright configuration exists at all, this is a gap. Report it — E2E tests should exist for any project with UI or API endpoints.

## What constitutes a passing E2E suite

- All tests in the Playwright suite pass with exit code 0
- No tests are skipped unless explicitly marked with a reason (`.skip('reason')`)
- No flaky test retries masking real failures — if a test required retries to pass, note it

## Interpreting failures

For each failing test, capture:
- The test name and file path
- The failure message and assertion that failed
- Any relevant screenshot or trace output from Playwright

Do not attempt to fix failing tests. Report them precisely so the engineer can address them.

## Project structure expectations

A well-structured Playwright setup includes:
- Config at project root: `playwright.config.ts`
- Tests in `tests/e2e/` or `e2e/`
- Page objects in `tests/e2e/pages/` or `e2e/pages/` (if the project uses page object pattern)
- Test data via factories (consistent with the `testing-best-practices` skill)

If the project deviates from this structure, note it but do not flag it as a failure — different structures are acceptable as long as tests run and pass.

## Environment

E2E tests typically need a running dev server. Check the Playwright config for `webServer` configuration. If it is configured, Playwright will start the server automatically. If not, the dev server must be started manually before running tests:

```bash
pnpm dev &
# Wait for server to be ready, then run tests
pnpm exec playwright test
```

After tests complete, clean up any background processes you started.
