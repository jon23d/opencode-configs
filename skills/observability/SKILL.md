---
name: observability
description: Observability standards and instrumentation conventions. Load this skill when reviewing code for observability gaps, or when implementing logging, metrics, tracing, or health checks. Covers the four observability signals and stack-specific conventions for each supported language.
---

# Observability Standards

Observability is the ability to understand what a system is doing in production from
its external outputs alone. This skill defines what "good" looks like across four
primary signals and governs how the `observability-reviewer` evaluates code.

---

## The Four Signals

Every production service should emit all four signals. The absence of any one of them
creates a category of failure that is invisible to operators.

| Signal | What it answers |
|---|---|
| **Logs** | What happened and when, in enough detail to reconstruct a sequence of events |
| **Metrics** | How often and how fast — rates, latencies, counts, and queue depths over time |
| **Traces** | Where time is spent across service and async boundaries |
| **Health** | Is the service currently able to serve its purpose? |

---

## Universal Principles

These apply regardless of language, framework, or telemetry library.

### Logs

**Be structured.** Log output must be machine-parseable. Every log line should be a
key-value map or JSON object, not a free-form string. Unstructured logs cannot be
reliably queried, filtered, or alerted on.

**Use levels correctly.**

| Level | When to use |
|---|---|
| `trace` / `debug` | Development noise — loops, intermediate values, verbose state. Must not appear in production at default log level. |
| `info` | Meaningful lifecycle events: service started, job completed, user action taken. Should be low-volume. |
| `warn` | Something unexpected happened but the service recovered. Worth investigating if it recurs. |
| `error` | A failure that requires attention. Service may continue, but the operation failed. |
| `fatal` | Service cannot continue. Immediately precedes exit. |

**Propagate correlation IDs.** Every log line in a request-scoped path must include a
correlation or trace ID. This is the single most important thing for debuggability:
without it, log lines from concurrent requests are impossible to untangle.

- Extract the ID from the incoming request (e.g. `X-Correlation-ID`, `traceparent` header)
- Generate one if none is present
- Thread it through to every log line and every outgoing call within that request scope

**Never log sensitive data.** The following must never appear in log output:
passwords, secrets, API keys, tokens, full PII (names, emails, phone numbers,
addresses in combination), payment card data, or full request bodies by default.
Log identifiers (user ID, order ID) — not values (email address, card number).

**Log errors with context.** A useful error log includes: the error message and stack,
the correlation ID, and the identifiers of the resources involved. It does not include
the full input payload by default.

### Metrics

**Measure what matters.** Not every function needs a metric. Prioritise:

1. **Request/task throughput** — how many operations per unit time
2. **Latency** — p50, p95, p99 for I/O-bound operations (HTTP, DB, cache, queue)
3. **Error rate** — errors as a distinct count or label, not absorbed into success
4. **Queue/batch depth** — for async systems, how much work is waiting

**Naming conventions** (stack-specific conventions below, but general rules):

- Use `snake_case`
- Prefix with the service name: `payments_charge_duration_ms`
- For counters, suffix with `_total`: `payments_charge_errors_total`
- For histograms/timers, suffix with the unit: `_duration_ms`, `_bytes`

**Avoid high-cardinality labels.** Labels like `user_id`, `request_id`, or `url_path`
with arbitrary values create metric cardinality explosions. Use bounded label values
(e.g. `status=success|error`, `method=GET|POST`).

### Distributed Tracing

**Instrument service boundaries.** At minimum, create or continue a trace span at
every point where work crosses a boundary: incoming HTTP request, outgoing HTTP call,
database query, message publish, message consume.

**Propagate context.** Extract trace context from incoming requests (W3C `traceparent`
header is the standard). Inject it into outgoing requests and async messages.

**Name spans usefully.** A span name should identify the operation type and resource:
`GET /users/:id`, `db.query users`, `queue.publish order.created`.

**Add attributes for debuggability.** Useful span attributes:
- `http.method`, `http.status_code`, `http.url` (sanitised)
- `db.system`, `db.operation`, `db.table`
- `messaging.system`, `messaging.destination`
- `error.type`, `error.message` when the span represents a failure

### Health Endpoints

**Every network service must have a health endpoint.** A service without one cannot
be monitored by infrastructure tooling (load balancers, Kubernetes, uptime checkers).

**Health checks must be meaningful.** A health endpoint that always returns `200 OK`
with no checks is worse than useless — it masks failures. Check:
- Database connectivity (can you run a lightweight query?)
- Cache reachability (can you reach the cache server?)
- Any external dependency that the service cannot function without

**Distinguish liveness from readiness if needed.** In environments that support it
(e.g. Kubernetes):
- **Liveness** (`/health/live`): is the process alive and not deadlocked?
- **Readiness** (`/health/ready`): is the service able to handle traffic right now?

A single `/health` endpoint is acceptable when liveness/readiness distinction is
not required by the deployment environment.

---

## Stack-Specific Conventions

### Node.js / TypeScript

> **Status: conventions to be confirmed.** No library decisions have been made yet.
> The patterns below describe what good instrumentation looks like; specific library
> choices will be added once the team has decided on a telemetry stack.

**Logging**

Use a structured logging library (e.g. `pino`, `winston`, `bunyan`). Never use
`console.log` in production code paths — it produces unstructured output and cannot
be controlled by log level.

Pattern for a logger with correlation ID context:

```typescript
// Create a child logger with request-scoped context
const reqLogger = logger.child({ correlationId: req.headers['x-correlation-id'] ?? generateId() })

// Use the child logger throughout the request lifecycle
reqLogger.info({ userId: user.id, action: 'login' }, 'User authenticated')
reqLogger.error({ err, userId: user.id }, 'Login failed')
```

**Metrics**

Whether using `prom-client`, OpenTelemetry SDK, or another library, the pattern is
the same: define instruments at module load time, record values at the point of
observation.

```typescript
// Define once at module scope
const httpRequestDuration = // histogram instrument for request duration

// Record at observation point
httpRequestDuration.record(durationMs, { method: req.method, status: String(res.statusCode) })
```

**Tracing**

OpenTelemetry is the recommended approach for vendor-neutral tracing. Auto-instrumentation
covers most Node.js HTTP and DB libraries. Add manual spans at meaningful business
operation boundaries.

```typescript
const span = tracer.startSpan('processOrder', { attributes: { 'order.id': orderId } })
try {
  // ... operation ...
  span.setStatus({ code: SpanStatusCode.OK })
} catch (err) {
  span.recordException(err)
  span.setStatus({ code: SpanStatusCode.ERROR })
  throw err
} finally {
  span.end()
}
```

**Health endpoints**

```typescript
app.get('/health', async (req, res) => {
  const checks = await Promise.allSettled([
    db.raw('SELECT 1'),          // database connectivity
    cache.ping(),                // cache reachability
  ])
  const healthy = checks.every(c => c.status === 'fulfilled')
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    checks: {
      database: checks[0].status,
      cache: checks[1].status,
    }
  })
})
```

---

### Python

> **Status: stub — expand when Python services are introduced.**

Follow the same four-signal model. Use `structlog` or `python-json-logger` for
structured logging. Use OpenTelemetry SDK for metrics and tracing. Avoid the
stdlib `logging` module's default formatter in production (it produces unstructured
output).

---

### Go

> **Status: stub — expand when Go services are introduced.**

Follow the same four-signal model. Use `slog` (stdlib, Go 1.21+) with a JSON handler,
or `zerolog` / `zap` for structured logging. Use OpenTelemetry SDK for metrics and
tracing. The standard library `net/http` handler wrapping pattern is idiomatic for
correlation ID propagation.

---

## What the Observability Reviewer Checks

Load this skill before reviewing. The reviewer evaluates against the universal
principles above, not against any specific library. A verdict of `"fail"` means
critical or major issues exist that leave operators blind in production.

Severity reference:

| Severity | Examples |
|---|---|
| **critical** | Caught exception with no log, no metric, no rethrow; sensitive data in a log statement; network service with no health endpoint; background worker with zero error signal |
| **major** | Unstructured logging in request path; no correlation ID on any log line in request-scoped code; no latency measurement on I/O operations; health endpoint that always returns 200 |
| **minor** | Log line missing a useful context field; wrong log level; high-cardinality metric label; span missing a useful attribute |
