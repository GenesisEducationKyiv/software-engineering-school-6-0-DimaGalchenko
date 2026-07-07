const createHttpNotificationClient = require("./httpNotificationClient");
const createGrpcNotificationClient = require("./grpcNotificationClient");

const createNotificationClient = (config) => {
  const { transport, grpcUrl, httpUrl } = config.notification;

  if (transport === "grpc") {
    if (!grpcUrl) {
      throw new Error("NOTIFICATION_GRPC_URL is required for grpc transport");
    }
    return createGrpcNotificationClient(grpcUrl);
  }

  if (transport === "http") {
    if (!httpUrl) {
      throw new Error("NOTIFICATION_HTTP_URL is required for http transport");
    }
    return createHttpNotificationClient(httpUrl);
  }

  throw new Error(
    `Unknown notification transport: "${transport}" (expected "http" or "grpc")`,
  );
};

module.exports = { createNotificationClient };
