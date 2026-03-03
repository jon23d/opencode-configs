# Architectural Decisions

Design decisions and in-progress discussions for this config repository.
Add new entries in reverse-chronological order (newest first).

---

## [IN PROGRESS] Observability reviewer agent

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
