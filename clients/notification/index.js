const createHttpNotificationClient = require("./httpNotificationClient");
const createGrpcNotificationClient = require("./grpcNotificationClient");

const createNotificationClient = (config) => {
  if (config.notificationTransport === "grpc") {
    return createGrpcNotificationClient(config.notificationGrpcUrl);
  }
  return createHttpNotificationClient(config.notificationHttpUrl);
};

module.exports = { createNotificationClient };
