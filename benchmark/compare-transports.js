const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const express = require("express");

const createHttpNotificationClient = require("../clients/notification/httpNotificationClient");
const createGrpcNotificationClient = require("../clients/notification/grpcNotificationClient");

const N = 1000;

const PROTO_PATH = path.join(
  __dirname,
  "..",
  "notification-service",
  "grpc",
  "notification.proto",
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const notificationProto =
  grpc.loadPackageDefinition(packageDefinition).notification.v1;

// Mock notification service exposing the real contract:
// POST /api/notifications/send and the Send RPC, without real email sending.
const startMockNotificationService = () => {
  const app = express();
  app.use(express.json());
  app.post("/api/notifications/send", (_req, res) => {
    res.json({ success: true, message: "Notification sent" });
  });

  const httpServer = app.listen(3099);

  const grpcServer = new grpc.Server();
  grpcServer.addService(notificationProto.NotificationService.service, {
    Send: (_call, callback) => {
      callback(null, { success: true, message: "Notification sent" });
    },
  });

  return new Promise((resolve, reject) => {
    grpcServer.bindAsync(
      "0.0.0.0:50099",
      grpc.ServerCredentials.createInsecure(),
      (err) => {
        if (err) {
          return reject(err);
        }
        return resolve({
          stop: () =>
            new Promise((res) => {
              httpServer.close();
              grpcServer.tryShutdown(() => res());
            }),
        });
      },
    );
  });
};

const percentile = (sorted, p) => {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
};

const runBenchmark = async (name, client) => {
  const latencies = [];

  for (let i = 0; i < 5; i++) {
    await client.send("confirmation", {
      email: "bench@example.com",
      confirmToken: "warmup-token",
    });
  }

  for (let i = 0; i < N; i++) {
    const start = process.hrtime.bigint();
    await client.send("confirmation", {
      email: "bench@example.com",
      confirmToken: `token-${i}`,
    });
    const end = process.hrtime.bigint();
    latencies.push(Number(end - start) / 1e6);
  }

  latencies.sort((a, b) => a - b);
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const total = latencies.reduce((a, b) => a + b, 0);

  return {
    name,
    requests: N,
    avgMs: avg.toFixed(2),
    p50Ms: percentile(latencies, 50).toFixed(2),
    p95Ms: percentile(latencies, 95).toFixed(2),
    p99Ms: percentile(latencies, 99).toFixed(2),
    totalMs: total.toFixed(0),
    rps: ((N / total) * 1000).toFixed(0),
  };
};

const main = async () => {
  console.log(`Starting benchmark: ${N} send("confirmation") requests each\n`);

  const service = await startMockNotificationService();

  try {
    const httpClient = createHttpNotificationClient("http://localhost:3099");
    const grpcClient = createGrpcNotificationClient("localhost:50099");

    const httpResult = await runBenchmark("HTTP", httpClient);
    const grpcResult = await runBenchmark("gRPC", grpcClient);

    console.log("=== Transport Comparison Results ===\n");
    console.log("| Metric       | HTTP            | gRPC            |");
    console.log("|--------------|-----------------|-----------------|");
    console.log(
      `| Avg latency  | ${httpResult.avgMs.padStart(12)} ms | ${grpcResult.avgMs.padStart(12)} ms |`,
    );
    console.log(
      `| P50 latency  | ${httpResult.p50Ms.padStart(12)} ms | ${grpcResult.p50Ms.padStart(12)} ms |`,
    );
    console.log(
      `| P95 latency  | ${httpResult.p95Ms.padStart(12)} ms | ${grpcResult.p95Ms.padStart(12)} ms |`,
    );
    console.log(
      `| P99 latency  | ${httpResult.p99Ms.padStart(12)} ms | ${grpcResult.p99Ms.padStart(12)} ms |`,
    );
    console.log(
      `| Throughput   | ${(httpResult.rps + " req/s").padStart(15)} | ${(grpcResult.rps + " req/s").padStart(15)} |`,
    );
    console.log(
      `| Total time   | ${(httpResult.totalMs + " ms").padStart(15)} | ${(grpcResult.totalMs + " ms").padStart(15)} |`,
    );
  } finally {
    await service.stop();
  }
};

main().catch(console.error);
