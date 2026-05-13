# ADR-002: Monolithic Architecture with Logical Separation

| Field  | Value            |
| ------ | ---------------- |
| Status | **Accepted**     |
| Date   | 2026-05-09       |
| Author | Dmytro Galchenko |

---

## Context

The system has three logical components with distinct responsibilities:

- **API** - handles HTTP/gRPC requests for subscription management (subscribe, confirm, unsubscribe, list).
- **Scanner** - a background cron job that polls GitHub for new releases and identifies subscribers to notify.
- **Email Sending** - a shared dependency (`EmailService`) injected into both API (confirmation emails) and Scanner (release notifications), providing email delivery via Gmail SMTP or Resend API.

The question is how to deploy and structure these components: as a single process (monolith), as separate microservices, or as serverless functions.

- The team is a single developer.
- The project is a MVP for a software engineering course.
- The deployment target is Render.com (single container).
- All three components share the same data store (PostgreSQL `subscriptions` table).

---

## Alternatives Considered

### Alternative 1: Monolith with Logical Separation via Dependency Injection

Run all three components (API, Scanner, Notifier) in a single Node.js process. Separate concerns through distinct service classes wired together via manual dependency injection in the entry point (`index.js`).

**Pros:**

- Simplest deployment - one Docker container, one process.
- No inter-service communication overhead (direct function calls).
- Shared database connection pool - no need for service discovery or API contracts between components.
- Easy local development (`docker-compose up` starts everything).
- Dependency injection makes each service independently testable via mocking.
- Lowest infrastructure cost (single Render.com service).

**Cons:**

- Cannot scale components independently (e.g., more scanner instances without more API instances).
- An unhandled error in the scanner could crash the process and take down the API (mitigated by per-repo try/catch in the current implementation).
- Single-process cron means only one instance can run the scanner - no distributed locking.
- All components must use the same language and runtime.

### Alternative 2: Microservices

Deploy API, Scanner, and Notifier as separate services, each with its own process and potentially its own data store. Communicate via HTTP/gRPC or a message queue.

**Pros:**

- Independent scaling: scale the scanner separately from the API.
- Fault isolation: a scanner crash doesn't affect API availability.
- Technology flexibility: each service could use a different language/runtime.
- Clear service boundaries enforce clean architecture.

**Cons:**

- Significant operational complexity for a single developer (3 services to deploy, monitor, and maintain).
- Requires inter-service communication (HTTP calls or message queue), adding latency and failure modes.
- Data consistency challenges if services have separate databases.
- Higher infrastructure cost (3 Render.com services + message broker).
- Distributed debugging is harder (tracing across services).
- Overkill for the current scale (~1,000 subscriptions, ~200 repos).

### Alternative 3: Serverless Functions

Deploy each component as a cloud function (AWS Lambda, Google Cloud Functions, or Vercel Functions). Use a managed scheduler (CloudWatch Events) for the scanner.

**Pros:**

- Pay-per-execution pricing - potentially cheaper at very low traffic.
- Automatic scaling to zero when idle.
- No server management.

**Cons:**

- Cold start latency (problematic for the cron scanner).
- Vendor lock-in to a specific cloud provider.
- Complex local development and testing setup.
- Function execution time limits may constrain scanner runs with many repos.
- State management is more complex (no persistent connections, no in-process cron).
- Requires a separate managed database and cache, increasing architectural complexity.
- Does not align with the current Render.com + Docker deployment target.

---

## Decision

**Chosen: Monolith with Logical Separation via Dependency Injection (Alternative 1)**

For a single-developer MVP at the current scale, the monolithic approach provides the best trade-off between simplicity and maintainability:

1. **Scale fits:** ~1,000 subscriptions and ~200 repos are trivially handled by a single Node.js process.
2. **DI provides modularity:** Services are defined as factory functions that accept their dependencies, making the codebase modular and testable without the operational cost of separate deployments.
3. **Deployment simplicity:** One Dockerfile, one `docker-compose.yml`, one Render.com service.
4. **Migration path:** The DI-based architecture makes it straightforward to extract a service into a separate process later if scaling demands it - the service interfaces are already well-defined.

---

## Consequences

### Positive

- Single deployment artifact - easy to build, deploy, and rollback.
- All components share the same PostgreSQL connection pool and Redis client - no serialization/deserialization overhead.
- Local development requires only `docker-compose up`.
- DI-based architecture allows isolated unit testing of each service with mocked dependencies.
- Minimal infrastructure cost (one container, one database, one Redis instance).
- Fast iteration speed for a single developer.

### Negative

- The scanner cron job runs in the same process as the API - a long-running scan could increase API response latency under resource contention.
- Horizontal scaling requires running multiple instances, but only one instance should execute the scanner to avoid duplicate notifications (no distributed locking in place).
- Cannot independently deploy or version individual components.
- If the system grows significantly (e.g., 10,000+ repos), the scanner would need to be extracted into a separate worker process backed by a job queue (BullMQ, RabbitMQ).
