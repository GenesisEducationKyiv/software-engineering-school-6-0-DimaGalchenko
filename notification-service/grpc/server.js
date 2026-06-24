const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PROTO_PATH = path.join(__dirname, "notification.proto");

const createGrpcServer = (emailService) => {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const proto = grpc.loadPackageDefinition(packageDefinition).notification;

  const handlers = {
    Send: async (call, callback) => {
      try {
        const { template_id, email, data } = call.request;
        await emailService.send(template_id, email, { ...data, email });
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
          throw err;
        }
        console.log(`Notification gRPC server running on port ${port}`);
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
