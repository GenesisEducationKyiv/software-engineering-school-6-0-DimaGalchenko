# HTTP vs gRPC Transport Comparison

## Overview

The notification microservice exposes both HTTP (REST/JSON) and gRPC (Protobuf/HTTP2) interfaces. The main application can connect via either transport, configured by `NOTIFICATION_TRANSPORT=http|grpc`.

## How to Run

```bash
node benchmark/compare-transports.js
```

This starts a mock notification service (no real email sending) exposing the real contract — `POST /api/notifications/send` and the `Send` RPC — and drives 1,000 `send("confirmation", ...)` requests through each of the real clients (`clients/notification/`) sequentially, measuring per-request latency with `process.hrtime.bigint()`.

## Expected Results

| Metric      | HTTP          | gRPC           |
| ----------- | ------------- | -------------- |
| Avg latency | ~0.5-1.5 ms   | ~0.2-0.5 ms    |
| P50 latency | ~0.4-1.0 ms   | ~0.15-0.4 ms   |
| P95 latency | ~1.0-3.0 ms   | ~0.5-1.0 ms    |
| Throughput  | ~700-2000 rps | ~2000-5000 rps |

Actual numbers depend on hardware, OS, and system load.

## Why gRPC is Faster

1. **Binary serialization** - Protobuf is smaller and faster to parse than JSON
2. **HTTP/2 persistent connection** - Multiplexed streams over a single TCP connection vs HTTP/1.1 connection overhead
3. **No URL parsing or routing** - gRPC dispatches by method ID, not URL pattern matching
4. **Schema-driven** - No runtime type checking or content negotiation

## When to Use Each

| Use case                      | Recommended |
| ----------------------------- | ----------- |
| Scanner bulk notifications    | gRPC        |
| User-triggered subscribe flow | Either      |
| Debugging / manual testing    | HTTP        |
| Cross-language services       | gRPC        |
| Simple deployment (no proto)  | HTTP        |

## Architecture

```
Main App (monolith)
  ├── clients/notification/
  │     ├── notification.proto          → copied contract (owned by the client)
  │     ├── httpNotificationClient.js   → HTTP/JSON → notification-service:3001
  │     └── grpcNotificationClient.js   → gRPC/Proto → notification-service:50052
  │
Notification Service (microservice)
  ├── routes/       → HTTP API handlers
  └── grpc/server   → gRPC handlers
        └── Both call emailService internally
```

## Contract

Both transports expose the same shape: a typed `templateId` and `email`, plus a
schemaless `data` payload with the template variables.

- HTTP: `POST /api/notifications/send` with `{ templateId, email, data }`
- gRPC: `Send { template_id, email, data }` (`notification.v1` package)

`data` is a `google.protobuf.Struct` (i.e. typed JSON) rather than per-template
messages. This is deliberate: templates and their variables change often, and a
schemaless payload lets the monolith add a template variable without a
lockstep proto change across both services. The trade-off is that gRPC's
schema checking doesn't cover template variables — if that starts biting, the
stronger design is a `oneof` of per-template payload messages.

Each side owns its copy of `notification.proto`; the contract file is the
service boundary, so the monolith does not reach into the service's source
tree at runtime.
