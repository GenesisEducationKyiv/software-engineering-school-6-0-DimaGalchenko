const { PostgreSqlContainer } = require("@testcontainers/postgresql");
const { Pool } = require("pg");
const runMigrations = require("../../../db/migrate");

let container;
let pool;

const startDatabase = async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();

  pool = new Pool({
    host: container.getHost(),
    port: container.getMappedPort(5432),
    database: container.getDatabase(),
    user: container.getUsername(),
    password: container.getPassword(),
  });

  await runMigrations(pool);

  return pool;
};

const stopDatabase = async () => {
  if (pool) {
    await pool.end();
  }
  if (container) {
    await container.stop();
  }
};

const truncateAll = async () => {
  await pool.query("TRUNCATE subscriptions RESTART IDENTITY CASCADE");
};

module.exports = { startDatabase, stopDatabase, truncateAll };
