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

  const sendConfirmation = (email, confirmToken) =>
    new Promise((resolve, reject) => {
      client.SendConfirmation(
        { email, confirm_token: confirmToken },
        (err, response) => {
          if (err) {
            return reject(new Error(err.message));
          }
          return resolve(response);
        },
      );
    });

  const sendReleaseNotification = (
    email,
    repo,
    tagName,
    htmlUrl,
    unsubscribeToken,
  ) =>
    new Promise((resolve, reject) => {
      client.SendReleaseNotification(
        {
          email,
          repo,
          tag_name: tagName,
          html_url: htmlUrl,
          unsubscribe_token: unsubscribeToken,
        },
        (err, response) => {
          if (err) {
            return reject(new Error(err.message));
          }
          return resolve(response);
        },
      );
    });

  return { sendConfirmation, sendReleaseNotification };
};

module.exports = createGrpcNotificationClient;
