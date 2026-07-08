# gRPC vs HTTP/REST — Notification Contract (HW#10)

The internal synchronous call **main app → notification service** ("send a
templated email") is implemented over **both** transports:

- **gRPC** (HTTP/2 + Protobuf) — the primary contract, defined in a `.proto`
  and managed with [`buf`](https://buf.build).
- **HTTP/REST** (HTTP/1.1 + JSON) — kept alongside, not removed.

The transport is selected at runtime with `NOTIFICATION_TRANSPORT=grpc|http`.

## Contract (proto)

Single source of truth, buf-managed:

```
proto/notification/v1/notification.proto   →  package notification.v1
```

```proto
service NotificationService {
  rpc Send(SendRequest) returns (SendResponse);   // unary
}

message SendRequest {
  string template_id = 1;
  string email = 2;
  google.protobuf.Struct data = 3;   // template variables (schemaless JSON)
}

message SendResponse {
  bool success = 1;
  string message = 2;
}
```

`data` is a `google.protobuf.Struct` (typed JSON) rather than per-template
messages: templates and their variables change often, and a schemaless payload
lets the monolith add a variable without a lockstep proto change on both sides.
Trade-off: gRPC's schema checking doesn't cover template variables. If that
bites, the stronger design is a `oneof` of per-template payload messages.

## buf (lint + code generation)

Config: `buf.yaml` (module `proto/`, `STANDARD` lint) and `buf.gen.yaml`
(`protoc-gen-es` → `gen/`, JS + `.d.ts`).

```bash
npm install            # installs buf CLI + protoc-gen-es locally (offline after this)
npm run proto:lint     # buf lint   — STANDARD ruleset, must pass clean
npm run proto:generate # buf generate — emits gen/notification/v1/notification_pb.{js,d.ts}
npm run proto:sync     # copy canonical proto into notification-service (Docker build isolation)
```

`buf lint` passes with zero findings. `buf generate` produces typed message
classes backed by `@bufbuild/protobuf`. Generated code lives in `gen/` and is
git-ignored (it is a build artifact, reproduced by `proto:generate`).

The gRPC runtime itself loads the same canonical `.proto` dynamically via
`@grpc/proto-loader` (`clients/notification/grpcNotificationClient.js`,
`notification-service/grpc/server.js`), so the wire contract and the generated
types come from one file.

## gRPC status codes & error handling

The subscription gRPC server maps domain errors to canonical gRPC status codes
(`modules/subscription/grpc/server.js`):

| Domain error      | gRPC status        |
| ----------------- | ------------------ |
| `ValidationError` | `INVALID_ARGUMENT` |
| `NotFoundError`   | `NOT_FOUND`        |
| `ConflictError`   | `ALREADY_EXISTS`   |
| `RateLimitError`  | `UNAVAILABLE`      |
| (anything else)   | `INTERNAL`         |

The notification `Send` handler validates required fields and returns
`INVALID_ARGUMENT` for missing `template_id`/`email`, `INTERNAL` on send
failure (`notification-service/grpc/server.js`).

## Benchmarks

Two benchmarks, both self-contained (they start a mock notification endpoint
mirroring the real contract — no real email sending):

```bash
npm run bench:transports   # fair REST-vs-gRPC comparison (serial, 1000 reqs each)
npm run bench:rest         # autocannon load test of the REST endpoint (bonus)
```

`autocannon` is an HTTP tool and cannot drive gRPC; for a gRPC-native load test
use [`ghz`](https://ghz.sh). `bench:transports` covers both transports fairly
with a single serial `process.hrtime` loop.

### Measured results (local, single machine)

`bench:transports` — 1000 sequential `send("confirmation")` per transport:

| Metric      | HTTP/REST  | gRPC       |
| ----------- | ---------- | ---------- |
| Avg latency | 0.32 ms    | 0.24 ms    |
| P50 latency | 0.28 ms    | 0.22 ms    |
| P95 latency | 0.54 ms    | 0.33 ms    |
| P99 latency | 1.37 ms    | 0.63 ms    |
| Throughput  | 3130 req/s | 4127 req/s |

gRPC: ~25% lower average latency and ~32% higher throughput on the same box.

`bench:rest` — autocannon, 50 connections, 5s:

| Metric       | REST (autocannon) |
| ------------ | ----------------- |
| Requests/sec | ~13,400 req/s     |
| Avg latency  | 3.35 ms           |
| P99 latency  | 7 ms              |

(Higher absolute throughput than the serial loop because autocannon keeps 50
connections in flight.) Numbers depend on hardware, OS, and load.

### Why gRPC is faster

1. **Binary serialization** — Protobuf is smaller and faster to parse than JSON.
2. **HTTP/2 persistent connection** — multiplexed streams over one TCP
   connection vs HTTP/1.1 connection overhead.
3. **No URL parsing / routing** — dispatch by method ID, not URL matching.
4. **Schema-driven** — no runtime content negotiation.

## Architecture

```
proto/notification/v1/notification.proto   ← canonical contract (buf-managed)
        │  buf lint / buf generate → gen/notification/v1/notification_pb.{js,d.ts}
        │
Main App (monolith)
  └── clients/notification/
        ├── grpcNotificationClient.js  → gRPC/Proto → notification-service:50052  (loads canonical proto)
        └── httpNotificationClient.js  → HTTP/JSON  → notification-service:3001
              selected by NOTIFICATION_TRANSPORT
Notification Service (microservice)
  ├── routes/index.js            → POST /api/notifications/send   (REST)
  └── grpc/server.js             → NotificationService.Send       (gRPC; proto synced via proto:sync)
        └── both call emailService internally
```

## When to use each

| Use case                      | Recommended |
| ----------------------------- | ----------- |
| Scanner bulk notifications    | gRPC        |
| User-triggered subscribe flow | Either      |
| Debugging / manual testing    | HTTP        |
| Cross-language services       | gRPC        |
