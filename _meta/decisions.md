# Architectural Decisions

Design decisions and in-progress discussions for this config repository.
Add new entries in reverse-chronological order (newest first).

---

## Engineers write E2E tests; e2e-testing skill expanded

**Date:** 2026-03-04
**Status:** Resolved

### Context

The `e2e-testing` skill only covered how to *run* and *evaluate* existing Playwright
tests. It had no guidance on how to *write* them. No agent was responsible for
authoring E2E tests — the QA agent only ran and reported on them, and neither
engineer agent was told to create them.

This meant that projects using this config had no Playwright tests unless someone
manually wrote them outside the workflow. The QA agent would either find nothing to
run or report a gap, but nobody was tasked with filling it.

### Decision

**Engineers write E2E tests as part of their implementation workflow.** This is
consistent with the existing "engineers own their tests" philosophy established by
the TDD skill.

Changes made:

- **`skills/e2e-testing/SKILL.md`** — expanded from a runner-only skill to a
  comprehensive authoring guide. New sections: when to write E2E tests, project
  setup (Playwright config, directory structure, package.json script), writing tests
  (test structure, page objects, selectors, authentication fixtures, API endpoint
  tests, what to test, test data, waiting/timing). Original runner and reporting
  sections preserved at the end.

- **`agents/backend-engineer.md`** — added `e2e-testing` as an optional skill (load
  when adding/modifying endpoints). Added workflow step 7: write Playwright E2E tests
  for new/changed API endpoints, run `pnpm test:e2e`.

- **`agents/frontend-engineer.md`** — added `e2e-testing` as an optional skill (load
  when adding/modifying user-facing pages/flows). Added workflow step 7: write
  Playwright E2E tests for new/changed UI flows, run `pnpm test:e2e`.

- **`AGENTS.md`** — definition of done now has 12 items (was 11). New item 3:
  "Playwright E2E tests have been written for any new or modified endpoints or
  user-facing flows, and `pnpm test:e2e` passes."

### Rationale

The QA agent's role is verification — running the full suite, checking OpenAPI specs,
and reporting gaps. It does not write code. Engineers are the right owners because
they understand the feature's intended behaviour, have the acceptance criteria, and
are already in the TDD loop. Writing E2E tests is a natural extension of writing
unit tests: unit tests verify internal behaviour, E2E tests verify the external
contract.

The alternative — upgrading QA to an authoring role — would have required giving it
write access and creating a secondary code-review loop, which conflicts with the
"principle of least access" and adds workflow complexity.

---

## In-app help UX standards added to ui-design skill

**Date:** 2026-03-03
**Status:** Resolved

### Context

User-facing applications produced by the frontend-engineer were not consistently
including contextual help. Icon buttons lacked tooltips, non-obvious fields lacked
descriptions, complex pages had no embedded explanation of what the page does, and
empty states were generic ("Nothing here yet") rather than informative.

Help content was either absent or expected to live in a separate documentation site.
Neither is acceptable for a production application.

### Decision

A new **"In-app help and embedded documentation"** section was added to
`skills/ui-design/SKILL.md`. It is a required part of any frontend task. It covers:

- **Tooltips** — mandatory on all icon-only buttons; should be applied liberally
  on any control that needs a brief one-sentence explanation
- **Help icons and popovers** — for non-obvious form fields and settings that need
  2–4 sentences of explanation; placed immediately after the field label
- **Field-level help text** — always-visible description text beneath any form field
  with format requirements or downstream effects; distinct from validation errors
- **Asides and contextual help panels** — persistent collapsible sidebar on complex
  settings and configuration screens; content updates with the active section
- **Empty states as onboarding** — every empty state must name the entity, explain
  what it is and why the user would want one, and offer a primary creation action;
  generic copy is prohibited
- **Embedded help sections** — collapsible "How this works" accordions on complex
  feature pages; replaces the need to consult external docs for the common case

A **help UX checklist** was added at the end of the section. The frontend-engineer
must verify all items before marking a task done. This checklist is now part of the
definition of done for UI work.

### Rationale

Help is a design element, not a documentation task. Contextual help at the point of
need reduces support load, increases feature adoption, and makes the application
self-explanatory. The patterns chosen (tooltips, popovers, asides, empty states,
accordions) are all available in both Mantine and Tailwind/Radix with no additional
dependencies.

---

## Telemetry stack: OpenTelemetry

**Date:** 2026-03-03
**Status:** Resolved

OpenTelemetry is the standard telemetry SDK across all services. Reasons: vendor-neutral
(exporters are swappable without application code changes), broad auto-instrumentation
coverage for Node.js, and a single SDK covers traces, metrics, and log correlation.

For Node.js/TypeScript:
- `@opentelemetry/sdk-node` + `@opentelemetry/auto-instrumentations-node` for setup
- `@opentelemetry/exporter-otlp-http` for traces/metrics via OTLP
- `@opentelemetry/exporter-prometheus` for Prometheus metrics scraping
- `pino` for structured logging, with OTel trace/span IDs injected via `mixin`

Specific collector, backend, and alerting tooling decisions are deferred — the OTLP
exporter endpoint is read from `OTEL_EXPORTER_OTLP_ENDPOINT` at runtime.

See `skills/observability/SKILL.md` (Node.js/TypeScript section) for implementation patterns.

---

## Observability reviewer agent

**Date:** 2026-03-03
**Status:** Resolved — implemented

### Context

We want to add an agent that enforces observability standards. The motivation: code
review and security review are gated quality checks before a task is done. Observability
is currently not gated — gaps in logging, metrics, and tracing get through without
comment.

### What observability covers

The agent should reason about:

- **Structured logging** — logs are machine-readable (structured/JSON), use appropriate
  severity levels, include correlation/trace IDs, and never log sensitive data (PII,
  tokens, credentials)
- **Metrics** — meaningful operations emit measurable signals (request counts, latency
  histograms, error rates, business-level counters)
- **Distributed tracing** — operations that cross service or async boundaries create
  spans and propagate trace context correctly
- **Health and readiness** — services expose `/health` (liveness) and `/ready`
  (readiness) endpoints with meaningful checks, not just HTTP 200
- **Error capture** — errors are caught with sufficient context (correlation IDs,
  relevant inputs) for post-hoc debugging without exposing internals to clients
- **Alertability** — code paths that could fail silently emit something observable
  (a log at the right level, a metric increment) so that alerts can be built on top

### Shape decision: reviewer vs. implementer

**Option A — Pure reviewer subagent** (modelled on `security-reviewer`)
- Read-only, no write access
- Invoked after code-reviewer and security-reviewer pass
- Returns structured JSON verdict (pass / pass_with_issues / fail)
- Flags gaps; the engineer fixes them
- Pros: consistent with existing quality gate pattern; safe; focused
- Cons: engineers may struggle to know *how* to fix issues without guidance

**Option B — Implementing subagent**
- Has write access; adds/improves instrumentation itself
- Invoked by engineer after code changes
- Produces instrumented code; still needs its own review
- Pros: actually produces working observability code
- Cons: needs its own code-review loop; riskier; harder to scope

**Option C — Primary agent**
- User-invocable for whole-codebase observability audits
- Can also set up observability infrastructure (collector config, dashboards, alerts)
- More like `devops-engineer` in character
- Pros: powerful for greenfield observability setup
- Cons: doesn't integrate cleanly into the per-ticket quality gate

**Current leaning:** Start with Option A (reviewer subagent) as a quality gate.
A companion primary agent for observability infrastructure setup can be added later.

### Stack-agnosticism

The current stack is Node.js / TypeScript but additional languages will be added.
The agent should be **stack-agnostic**: it reasons about observability *concepts*
rather than specific libraries.

**What stack-agnostic means in practice:**

The agent identifies *what* is missing or wrong (e.g., "this database call has no
duration metric") and *recommends* what to add, but it does not mandate a specific
library. It expresses recommendations in terms of the four signals (logs, metrics,
traces, health) and defers to a companion skill for library-specific guidance.

**The companion `observability` skill** will be where stack-specific conventions live.
The skill will have sections for each supported language/stack. Initially:

```
## Node.js / TypeScript
- Logger: [TBD — pino recommended, but not mandated]
- Metrics: [TBD — prom-client or OpenTelemetry SDK]
- Tracing: [TBD — OpenTelemetry recommended]
...

## Python (future)
...

## Go (future)
...
```

This means: adding support for a new language is a skill update, not an agent rewrite.

**What the reviewer always checks, regardless of stack:**

1. Structured logging: logs must be machine-parseable (not bare `console.log` strings)
2. Correlation propagation: incoming trace/correlation IDs are threaded through to
   outgoing calls and included in log lines
3. Error log level: errors logged at the correct level (not `info`, not swallowed)
4. No sensitive data in logs: no passwords, tokens, PII, full request bodies by default
5. Health endpoints: if a service entry point is present, a health endpoint must exist
6. Silent failure paths: code that catches and discards errors must emit *something*
   observable (at minimum a log with context)

**What varies by stack (in the skill, not the agent):**

- Which logging library is idiomatic
- How metrics are instrumented (push vs. pull, naming conventions)
- How trace context is propagated (W3C traceparent header, etc.)
- Specific health check patterns (e.g. checking DB connectivity)

### Integration into the definition of done

If we add observability-reviewer as a required quality gate, AGENTS.md needs updating.
Proposal: add it as a peer of code-reviewer and security-reviewer — both backend and
frontend engineers invoke it after security-reviewer passes.

Open question: should it be a hard gate (fail = task blocked) or advisory
(pass_with_issues always allowed through)? Security-reviewer treats `critical` and
`major` as hard blockers. We could apply the same model.

### Verdict format (draft)

Following the same JSON pattern as `security-reviewer`:

```json
{
  "verdict": "pass" | "fail" | "pass_with_issues",
  "issues": [
    {
      "severity": "critical" | "major" | "minor",
      "signal": "logging" | "metrics" | "tracing" | "health" | "error-capture" | "alertability",
      "location": "<file and line or function name>",
      "problem": "<what is missing or wrong>",
      "recommendation": "<what should be added or changed, stack-agnostic>"
    }
  ],
  "summary": "<one or two sentences on overall observability posture>"
}
```

Severity guidance:
- **critical** — silent failure path (errors swallowed with no observable signal);
  sensitive data logged; health endpoint entirely absent on a network service
- **major** — unstructured logging in a critical path; no correlation ID threading;
  key business operation with no latency or error metric
- **minor** — missing log context fields; suboptimal log levels; health check that
  returns 200 regardless of actual service health

### Resolution

Option A (pure reviewer subagent) was chosen. Implemented:

- `agents/observability-reviewer.md` — read-only subagent, JSON verdict output,
  invoked by backend-engineer and frontend-engineer after security-reviewer passes
- `skills/observability/SKILL.md` — stack-agnostic principles; Node.js/TypeScript
  conventions documented; Python and Go as stubs
- `AGENTS.md` — updated agent hierarchy, mandatory workflow, and definition of done
  (now 11 items; observability-reviewer is item 5)
- `_meta/README.md` — updated agent roster, skill roster, and workflow diagram

### Future work

- Flesh out Python and Go sections of `skills/observability/SKILL.md` when those
  languages are adopted
- Revisit whether an implementing variant (Option B) is warranted once the team
  has established a telemetry stack and the reviewer has been in use for a while
