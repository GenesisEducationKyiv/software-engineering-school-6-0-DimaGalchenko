const createSubscriptionService = require("./subscriptionService");
const createSubscriptionRepository = require("./subscriptionRepository");
const createSubscriptionRoutes = require("./routes");
const createSubscriptionGrpcServer = require("./grpc/server");
const createInternalRoutes = require("./internalRoutes");
const createSubscriptionConfirmationSaga = require("./subscriptionConfirmationSaga");
const createNotificationResultConsumer = require("./notificationResultConsumer");

module.exports = {
  createSubscriptionService,
  createSubscriptionRepository,
  createSubscriptionRoutes,
  createSubscriptionGrpcServer,
  createInternalRoutes,
  createSubscriptionConfirmationSaga,
  createNotificationResultConsumer,
};
