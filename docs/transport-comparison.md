# HTTP vs gRPC Transport Comparison

## Overview

The notification microservice exposes both HTTP (REST/JSON) and gRPC (Protobuf/HTTP2) interfaces. The main application can connect via either transport, configured by `NOTIFICATION_TRANSPORT=http|grpc`.

## How to Run

```bash
node benchmark/compare-transports.js
```

This starts a mock notification service (no real email sending) and sends 1,000 `sendConfirmation` requests through each transport sequentially, measuring per-request latency with `process.hrtime.bigint()`.

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
  ├── modules/notification/
  │     ├── httpNotificationClient.js   → HTTP/JSON → notification-service:3001
  │     └── grpcNotificationClient.js   → gRPC/Proto → notification-service:50052
  │
Notification Service (microservice)
  ├── routes/       → HTTP API handlers
  └── grpc/server   → gRPC handlers
        └── Both call emailService internally
```
