# ADR-001: Cron-Based Polling vs GitHub Webhooks

| Field  | Value            |
| ------ | ---------------- |
| Status | **Accepted**     |
| Date   | 2025-05-09       |
| Author | Dmytro Galchenko |

---

## Context

The system needs to detect new releases published on arbitrary public GitHub repositories and notify subscribers via email.

- Users subscribe to repositories they do not own or administer.
- The system must work with any public repository without requiring the repository owner's cooperation.
- GitHub's REST API v3 provides a `/repos/{owner}/{repo}/releases` endpoint that returns the list of releases.
- GitHub also offers Webhooks, but they require configuration on the target repository.

---

## Alternatives Considered

### Alternative 1: Cron-Based Polling

Periodically call the GitHub REST API on a schedule (e.g., every minute) to fetch the latest releases for each tracked repository, compare with the last known release tag, and send notifications for any new ones.

**Pros:**

- Works with any public repository without any setup on the repo side.
- Simple to implement - a single `node-cron` job with sequential API calls.
- No public endpoint or ingress configuration needed.
- Full control over scan frequency.
- No dependency on repository owners or third-party webhook infrastructure.

**Cons:**

- Notification latency up to the polling interval (e.g., up to 1 minute).
- Consumes GitHub API rate limit on every cycle (1 call per tracked repo per cycle).
- Rate limit becomes a bottleneck as the number of tracked repos grows (5,000 req/hr with token).
- Redundant API calls when no new releases have been published.

### Alternative 2: GitHub Webhooks

Register a webhook on each monitored repository to receive push notifications when a new release is created.

**Pros:**

- Near-real-time notifications (seconds after a release is published).
- No wasted API calls - events are pushed only when something happens.
- No rate limit consumption for release detection.

**Cons:**

- Requires admin/write access to the target repository to register webhooks - impossible for repos the user doesn't own.
- Needs a publicly accessible HTTPS endpoint to receive webhook payloads, exposing an additional attack surface (DDoS, spoofed payloads).
- Webhook management complexity: registration, secret validation, retries, deregistration.
- If the webhook endpoint goes down, events are lost (GitHub retries are limited).
- Does not scale to arbitrary repos subscribed by end users.

---

## Decision

**Chosen: Cron-Based Polling (Alternative 1)**

The core requirement is to monitor any public repository without needing the repository owner's involvement. Webhooks require configuration on the target repository, which is not possible when users subscribe to repos they do not control.

Cron-based polling is the only approach that satisfies this constraint. The trade-off of slightly delayed notifications (up to 1 minute) and increased API consumption is acceptable for the current scale (~200 repos, well within the 5,000 req/hr authenticated limit).

---

## Consequences

### Positive

- Any public repository can be monitored without requiring owner cooperation.
- Implementation is straightforward - a single cron job iterating over repos.
- No external ingress or public webhook endpoint required.
- Easy to test (trigger a scan manually) and debug (deterministic, synchronous flow).
- Scan frequency is fully configurable via environment variable.

### Negative

- Notification latency is bounded by the polling interval (default: 1 minute).
- GitHub API rate limit is consumed proportionally to the number of tracked repos per cycle.
- Scaling beyond ~80 repos per minute (with 1-minute interval and authenticated rate limit) requires optimizations such as:
  - Conditional requests (`If-None-Match` / ETags) to avoid counting unmodified responses.
  - Spreading scans across multiple intervals (not all repos every cycle).
  - Multiple GitHub tokens for increased aggregate rate limit.
- Redundant network traffic when no new releases exist.
