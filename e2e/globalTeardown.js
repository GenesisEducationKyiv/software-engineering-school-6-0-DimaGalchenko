module.exports = async () => {
  const server = globalThis.__E2E_SERVER__;
  const pool = globalThis.__E2E_POOL__;
  const container = globalThis.__E2E_CONTAINER__;

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  } catch (_err) {
    /* ignore */
  }
  try {
    if (pool) {
      await pool.end();
    }
  } catch (_err) {
    /* ignore */
  }
  try {
    if (container) {
      await container.stop();
    }
  } catch (_err) {
    /* ignore */
  }
};
