const { PostgreSqlContainer } = require("@testcontainers/postgresql");
const { Pool } = require("pg");
const runMigrations = require("../db/migrate");
const createSubscriptionRepository = require("../repositories/subscriptionRepository");
const createSubscriptionService = require("../services/subscriptionService");
const createApp = require("../app");

module.exports = async () => {
  const container = await new PostgreSqlContainer("postgres:16-alpine").start();

  const pool = new Pool({
    host: container.getHost(),
    port: container.getMappedPort(5432),
    database: container.getDatabase(),
    user: container.getUsername(),
    password: container.getPassword(),
  });

  await runMigrations(pool);

  const subscriptionRepository = createSubscriptionRepository(pool);

  const githubService = {
    validateRepository: async () => {},
  };

  const emailService = {
    sendConfirmation: async () => {},
  };

  const subscriptionService = createSubscriptionService({
    subscriptionRepository,
    githubService,
    emailService,
  });

  const app = createApp(subscriptionService);

  app.get("/__test__/tokens", async (req, res) => {
    const { email } = req.query;
    const result = await pool.query(
      "SELECT repo, confirm_token, unsubscribe_token, confirmed FROM subscriptions WHERE email = $1",
      [email],
    );
    res.json(result.rows);
  });

  app.post("/__test__/reset", async (_req, res) => {
    await pool.query("TRUNCATE subscriptions RESTART IDENTITY CASCADE");
    res.json({ ok: true });
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(3001, () => resolve(s));
  });

  globalThis.__E2E_SERVER__ = server;
  globalThis.__E2E_POOL__ = pool;
  globalThis.__E2E_CONTAINER__ = container;
};
