# GitHub Release Notification API

**Live demo**: https://software-engineering-school-testcase-2026.onrender.com/

REST API service that allows users to subscribe to email notifications about new releases of any GitHub repository.

## Architecture

The application is a **monolith** consisting of three logical components:

- **API** — Express REST endpoints for managing subscriptions (subscribe, confirm, unsubscribe, list)
- **Scanner** — Background cron job that periodically checks GitHub for new releases across all confirmed subscriptions
- **Notifier** — Email sender (Nodemailer/Gmail) that delivers confirmation and release notification emails

### Key Design Decisions

- **Dependency Injection**: All services receive their dependencies through factory functions, making the code testable and following SOLID principles
- **Error Handling**: Custom error hierarchy (`AppError` -> `ValidationError`, `NotFoundError`, `ConflictError`, `RateLimitError`) with centralized error-handling middleware
- **Per-subscriber `last_seen_tag`**: Each subscription tracks the last notified release tag independently, so late subscribers don't miss the current release
- **Rate Limit Resilience**: When GitHub returns 429 (rate limit), the scanner stops processing remaining repos and retries on the next cron cycle

### Project Structure

```
index.js              — Entry point: migrations, DI wiring, server start
app.js                — Express app factory
routes/               — HTTP route handlers
services/             — Business logic (subscription, github, email, scanner, token)
repositories/         — Database access layer
middleware/           — Error handler, Prometheus metrics, API key auth
migrations/           — SQL migration files (run on startup)
config/               — Environment-based configuration
utils/                — Custom error classes
public/               — Static HTML subscription page
```

## How to Run

### Docker (recommended)

```bash
cp .env.example .env
# Fill in EMAIL_USER and EMAIL_PASS (Gmail app password)
# Optionally set GITHUB_TOKEN for higher rate limits

docker-compose up --build
```

The API will be available at `http://localhost:3000`. The HTML subscription page is served at the root URL.

### Local Development

Requires Node.js 20+ and a running PostgreSQL instance.

```bash
cp .env.example .env
# Configure DATABASE_URL and other variables

npm install
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@localhost:5432/release_notifier` |
| `BASE_URL` | Public URL for email links | `http://localhost:3000` |
| `GITHUB_TOKEN` | GitHub personal access token (optional, increases rate limit from 60 to 5000 req/hr) | — |
| `EMAIL_USER` | Gmail address for sending emails | — |
| `EMAIL_PASS` | Gmail app password | — |
| `SCAN_CRON` | Cron expression for release scanning | `*/1 * * * *` (every minute) |
| `REDIS_URL` | Redis connection URL for caching GitHub API responses (TTL 10 min) | `redis://localhost:6379` |
| `API_KEY` | API key for endpoint authentication (empty = auth disabled) | — |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/subscribe` | Subscribe an email to a GitHub repo's releases |
| GET | `/api/confirm/:token` | Confirm subscription via email token |
| GET | `/api/unsubscribe/:token` | Unsubscribe via email token |
| GET | `/api/subscriptions?email=` | List active subscriptions for an email |
| GET | `/metrics` | Prometheus metrics |

Full API documentation: see `swagger.yaml` (viewable at https://editor.swagger.io/)

## Subscription Flow

1. User sends `POST /api/subscribe` with email and repo (e.g. `golang/go`)
2. Service validates the repo exists via GitHub API
3. A confirmation email is sent with a unique token link
4. User clicks the link (`GET /api/confirm/:token`) to activate the subscription
5. The scanner runs on a cron schedule, checks each subscribed repo for new releases
6. When a new release tag is detected (differs from `last_seen_tag`), a notification email is sent

## API Key Authentication

When `API_KEY` is set, all `/api/*` endpoints require the `x-api-key` header:

```bash
curl -H "x-api-key: your-secret-key" http://localhost:3000/api/subscriptions?email=user@example.com
```

When `API_KEY` is empty (default), authentication is disabled.

## Redis Caching

Repository validation responses are cached in Redis with a 10-minute TTL to reduce rate limit consumption. Only repo existence checks are cached (`github:repo:{owner/repo}`). Release lists are **not** cached to ensure the scanner always detects new releases immediately.

## Testing

```bash
# Lint
npm run lint

# Unit tests
npm test

# Integration tests with real PostgreSQL via testcontainers
npm run test:integration

# Coverage report
npm run test:coverage
```

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Express 5
- **Database**: PostgreSQL 16
- **Cache**: Redis 7 (ioredis)
- **Email**: Nodemailer (Gmail)
- **Scheduling**: node-cron
- **Metrics**: prom-client (Prometheus)
- **Linting**: ESLint
- **Testing**: Jest, Supertest, Testcontainers
- **CI**: GitHub Actions (lint + tests)
