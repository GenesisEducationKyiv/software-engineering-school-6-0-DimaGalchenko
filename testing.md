# Testing

Requires **Node.js >= 18** and **Docker** (for integration/E2E tests via Testcontainers).

## Commands

| Command                    | What it runs                                                        |
| -------------------------- | ------------------------------------------------------------------- |
| `npm test`                 | Unit tests (Jest, `__tests__/unit/`)                                |
| `npm run test:integration` | Integration tests (Jest + Testcontainers, `__tests__/integration/`) |
| `npm run test:e2e`         | E2E tests (Playwright + Testcontainers, `e2e/`)                     |

For E2E, install the browser first: `npx playwright install --with-deps chromium`

## CI

Four parallel GitHub Actions jobs: **lint**, **unit-tests**, **integration-tests**, **e2e-tests**. See `.github/workflows/ci.yml`.
