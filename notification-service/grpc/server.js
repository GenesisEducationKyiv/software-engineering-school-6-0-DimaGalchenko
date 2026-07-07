const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const logger = require("../shared/logger");
const { fromStruct } = require("./structCodec");

const PROTO_PATH = path.join(__dirname, "notification.proto");

const createGrpcServer = (emailService) => {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const proto = grpc.loadPackageDefinition(packageDefinition).notification.v1;

  const handlers = {
    Send: async (call, callback) => {
      const { template_id, email, data } = call.request;

      if (!template_id || !email) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: "template_id and email are required",
        });
      }

      try {
        const payload = fromStruct(data);
        await emailService.send(template_id, email, { ...payload, email });
        callback(null, { success: true, message: "Notification sent" });
      } catch (err) {
        callback({
          code: grpc.status.INTERNAL,
          message: err.message,
        });
      }
    },
  };

  const server = new grpc.Server();
  server.addService(proto.NotificationService.service, handlers);

  const start = (port) => {
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (err) => {
        if (err) {
          logger.error(
            `Failed to bind gRPC server on port ${port}: ${err.message}`,
          );
          process.exit(1);
        }
        logger.info(`Notification gRPC server running on port ${port}`);
      },
    );
  };

  const stop = () =>
    new Promise((resolve, reject) => {
      server.tryShutdown((err) => (err ? reject(err) : resolve()));
    });

  return { start, stop };
};

module.exports = createGrpcServer;
