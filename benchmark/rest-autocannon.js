// Autocannon load test of the REST notification endpoint. Self-contained:
// starts a mock endpoint (no real email sending) and hammers it. autocannon is
// HTTP-only; use `npm run bench:transports` (or ghz) for gRPC.

const express = require("express");
const autocannon = require("autocannon");

const PORT = Number(process.env.BENCH_REST_PORT) || 3099;
const CONNECTIONS = Number(process.env.BENCH_CONNECTIONS) || 50;
const DURATION = Number(process.env.BENCH_DURATION) || 10;

const startMockService = () => {
  const app = express();
  app.use(express.json());
  app.post("/api/notifications/send", (_req, res) => {
    res.json({ success: true, message: "Notification sent" });
  });
  return app.listen(PORT);
};

const run = async () => {
  const server = startMockService();

  const instance = autocannon({
    url: `http://localhost:${PORT}/api/notifications/send`,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      templateId: "confirmation",
      email: "bench@example.com",
      data: { confirmToken: "bench-token" },
    }),
    connections: CONNECTIONS,
    duration: DURATION,
  });

  autocannon.track(instance, { renderProgressBar: true });

  const result = await instance;
  server.close();

  console.log("\n=== REST (autocannon) ===");
  console.log(`Requests/sec (avg): ${result.requests.average}`);
  console.log(`Latency avg (ms):   ${result.latency.average}`);
  console.log(`Latency p99 (ms):   ${result.latency.p99}`);
  console.log(`Total 2xx:          ${result["2xx"]}`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
