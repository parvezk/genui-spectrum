## Service health

**1 of 5 services is breaching the SLO: `payments`.** It fails both targets. The other four are healthy.

SLO: p95 latency **under 300 ms** and error rate **under 1%**.

| Service | Status | p95 latency | Error rate | Uptime |
| --- | --- | ---: | ---: | ---: |
| **payments** | 🔴 **Breaching** | **340 ms** (+40 over) | **1.8%** (+0.8 over) | 99.71% |
| search | 🟡 Healthy, closest to the limits | 210 ms | 0.6% | 99.90% |
| api-gateway | 🟢 Healthy | 120 ms | 0.2% | 99.98% |
| notifications | 🟢 Healthy | 95 ms | 0.3% | 99.95% |
| auth | 🟢 Healthy | 85 ms | 0.1% | 99.99% |

### payments needs attention

- **Latency:** 340 ms p95 is 13% over the 300 ms target.
- **Errors:** 1.8% is nearly double the 1% target, and nine times the error rate of api-gateway.
- **Uptime:** 99.71% is the lowest of the five. Over a 30-day month that is about 2 hours 5 minutes of downtime, against roughly 4 minutes for auth.

Slow and failing at the same time usually points to a struggling dependency (database, payment provider) or resource exhaustion, not a code bug in one endpoint. Check recent deploys, upstream provider status and connection pool saturation first.

### Keep an eye on search

`search` is within the SLO, but it has the second-highest latency (210 ms, 70% of the limit) and error rate (0.6%, 60% of the limit). It has the least headroom of the healthy services.

### Healthy

`auth`, `notifications` and `api-gateway` are all at or below 120 ms p95 with error rates of 0.3% or less.
