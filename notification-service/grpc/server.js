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
    SendConfirmation: async (call, callback) => {
      try {
        await emailService.sendConfirmation(
          call.request.email,
          call.request.confirm_token,
        );
        callback(null, { success: true, message: "Confirmation email sent" });
      } catch (err) {
        callback({
          code: grpc.status.INTERNAL,
          message: err.message,
        });
      }
    },

    SendReleaseNotification: async (call, callback) => {
      try {
        await emailService.sendReleaseNotification(
          call.request.email,
          call.request.repo,
          call.request.tag_name,
          call.request.html_url,
          call.request.unsubscribe_token,
        );
        callback(null, {
          success: true,
          message: "Release notification sent",
        });
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
