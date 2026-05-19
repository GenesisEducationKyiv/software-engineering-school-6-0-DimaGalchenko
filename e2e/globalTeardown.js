module.exports = async () => {
  const server = globalThis.__E2E_SERVER__;
  const pool = globalThis.__E2E_POOL__;
  const container = globalThis.__E2E_CONTAINER__;

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (pool) {
    await pool.end();
  }
  if (container) {
    await container.stop();
  }
};
