# ADR-001: Polling Strategy for Release Detection

| Field  | Value            |
| ------ | ---------------- |
| Status | **Accepted**     |
| Date   | 2026-05-09       |
| Author | Dmytro Galchenko |

---

## Context

The system needs to detect new releases published on arbitrary public GitHub repositories and notify subscribers via email.

- The system must work with any public repository without requiring the repository owner's cooperation.
- GitHub's REST API v3 provides a `/repos/{owner}/{repo}/releases` endpoint that returns the list of releases.
- The task requires using the GitHub REST API for fetching release data.

### Why Polling Is the Only Option

**Webhooks** require admin/write access to register on a repository. Since users subscribe to repos they do not own, webhooks are not viable.

**RSS/Atom feeds** (`https://github.com/{owner}/{repo}/releases.atom`) bypass API rate limits but are not covered by GitHub's API SLA, offer limited metadata (no assets, prerelease flag), and do not satisfy the task requirement to use the GitHub REST API.

Given these constraints, the real question is **how to poll**, not **whether to poll**.

---

## Alternatives Considered

### Alternative 1: Simple Cron Polling

A single `node-cron` job fires on a fixed schedule (e.g., every minute), iterates over all tracked repos sequentially, calls the GitHub REST API for each, and sends notifications for new releases.

**Pros:**

- Simple to implement - one cron job, sequential loop.
- No public endpoint or ingress configuration needed.
- Full control over scan frequency.
- Easy to test (trigger a scan manually) and debug (deterministic, synchronous flow).

**Cons:**

- Every cycle makes one API call per repo, regardless of whether anything changed.
- At 200 repos with 1-minute interval: ~12,000 calls/hr (within the 5,000/hr token limit only if some calls are cached or skipped).
- Notification latency up to the polling interval.

### Alternative 2: Cron Polling with Conditional Requests (ETags)

Same cron approach, but use `If-None-Match` headers with ETags returned by GitHub. Responses with status `304 Not Modified` do not count against the rate limit.

**Pros:**

- Dramatically reduces effective rate limit consumption - most cycles have no new releases.
- Same simplicity as Alternative 1 in terms of architecture.
- Scales to more repos within the same rate limit budget.

**Cons:**

- Requires persisting ETag values per repo (additional storage/complexity).
- Still makes one HTTP request per repo per cycle (network traffic remains, even if 304).
- GitHub's ETag behavior for `/releases` is not always documented clearly.

### Alternative 3: Job Queue with Spread Scheduling

Replace the single cron loop with a distributed job queue (e.g., BullMQ). Spread repo checks across the interval so that not all repos are polled simultaneously.

**Pros:**

- Smooths out API call bursts across the interval.
- Supports horizontal scaling with multiple workers.
- Built-in retry and failure handling.

**Cons:**

- Significant architectural complexity (Redis-backed queue, worker processes).
- Overkill for MVP scale (~200 repos).
- Requires distributed locking to avoid duplicate scans.

---

## Decision

**Chosen: Simple Cron Polling (Alternative 1)**

For the current MVP scale (~200 repos, ~1,000 subscribers), simple cron polling is the most pragmatic choice:

1. **Scale fits:** ~200 API calls per minute is well within the 5,000 req/hr authenticated limit.
2. **Simplicity:** A single `node-cron` job with a sequential loop has the fewest moving parts and is easy to reason about.
3. **Migration path:** The architecture (factory-function DI, separated scanner service) makes it straightforward to adopt ETags (Alternative 2) or a job queue (Alternative 3) later if scaling demands it.

Alternative 2 (ETags) is the natural next step when approaching rate limits and is documented as a future improvement.

---

## Consequences

### Positive

- Any public repository can be monitored without requiring owner cooperation.
- Implementation is straightforward - a single cron job iterating over repos.
- No external ingress or public webhook endpoint required.
- Scan frequency is fully configurable via environment variable.

### Negative

- Notification latency is bounded by the polling interval (default: 1 minute).
- GitHub API rate limit is consumed proportionally to the number of tracked repos per cycle.
- Scaling beyond the current ~200 repos requires adopting conditional requests (ETags) or spreading scans across intervals.
- Redundant network traffic when no new releases exist.
