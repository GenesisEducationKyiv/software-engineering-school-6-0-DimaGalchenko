const createSubscriptionService = require("./subscriptionService");
const createSubscriptionRepository = require("./subscriptionRepository");
const createSubscriptionRoutes = require("./routes");
const createSubscriptionGrpcServer = require("./grpc/server");
const createInternalRoutes = require("./internalRoutes");

module.exports = {
  createSubscriptionService,
  createSubscriptionRepository,
  createSubscriptionRoutes,
  createSubscriptionGrpcServer,
  createInternalRoutes,
};
