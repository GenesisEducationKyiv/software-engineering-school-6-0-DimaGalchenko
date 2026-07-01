const createHttpNotificationClient = require("./httpNotificationClient");
const createGrpcNotificationClient = require("./grpcNotificationClient");

const createNotificationClient = (config) => {
  if (config.notification.transport === "grpc") {
    return createGrpcNotificationClient(config.notification.grpcUrl);
  }
  return createHttpNotificationClient(config.notification.httpUrl);
};

module.exports = { createNotificationClient };
