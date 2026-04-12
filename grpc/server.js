const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { ValidationError, NotFoundError, ConflictError, RateLimitError } = require("../utils/errors");

const PROTO_PATH = path.join(__dirname, "subscription.proto");

const STATUS_MAP = {
  ValidationError: grpc.status.INVALID_ARGUMENT,
  NotFoundError: grpc.status.NOT_FOUND,
  ConflictError: grpc.status.ALREADY_EXISTS,
  RateLimitError: grpc.status.UNAVAILABLE,
};

const toGrpcError = (err) => {
  const code = STATUS_MAP[err.name] || grpc.status.INTERNAL;
  return { code, message: err.message };
};

const createGrpcServer = (subscriptionService) => {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const proto = grpc.loadPackageDefinition(packageDefinition).subscription;

  const handlers = {
    Subscribe: async (call, callback) => {
      try {
        await subscriptionService.subscribe(call.request.email, call.request.repo);
        callback(null, { message: "Subscription successful. Confirmation email sent." });
      } catch (err) {
        callback(toGrpcError(err));
      }
    },

    Confirm: async (call, callback) => {
      try {
        await subscriptionService.confirm(call.request.token);
        callback(null, { message: "Subscription confirmed successfully" });
      } catch (err) {
        callback(toGrpcError(err));
      }
    },

    Unsubscribe: async (call, callback) => {
      try {
        await subscriptionService.unsubscribe(call.request.token);
        callback(null, { message: "Unsubscribed successfully" });
      } catch (err) {
        callback(toGrpcError(err));
      }
    },

    GetSubscriptions: async (call, callback) => {
      try {
        const subscriptions = await subscriptionService.listByEmail(call.request.email);
        callback(null, {
          subscriptions: subscriptions.map((sub) => ({
            email: sub.email,
            repo: sub.repo,
            confirmed: sub.confirmed,
            last_seen_tag: sub.last_seen_tag || "",
          })),
        });
      } catch (err) {
        callback(toGrpcError(err));
      }
    },
  };

  const server = new grpc.Server();
  server.addService(proto.SubscriptionService.service, handlers);

  const start = (port) => {
    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
      if (err) {
        console.error("gRPC server failed to start:", err);
        return;
      }
      console.log(`gRPC server is running on port ${port}`);
    });
  };

  return { start, server };
};

module.exports = createGrpcServer;
