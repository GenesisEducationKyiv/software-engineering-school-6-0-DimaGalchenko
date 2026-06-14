const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PROTO_PATH = path.join(
  __dirname,
  "..",
  "..",
  "notification-service",
  "grpc",
  "notification.proto",
);

const createGrpcNotificationClient = (grpcUrl) => {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const proto = grpc.loadPackageDefinition(packageDefinition).notification;
  const client = new proto.NotificationService(
    grpcUrl,
    grpc.credentials.createInsecure(),
  );

  const send = (templateId, data) =>
    new Promise((resolve, reject) => {
      client.Send({ template_id: templateId, data }, (err, response) => {
        if (err) {
          return reject(new Error(err.message));
        }
        return resolve(response);
      });
    });

  return { send };
};

module.exports = createGrpcNotificationClient;
