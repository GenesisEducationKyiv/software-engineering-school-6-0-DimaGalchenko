const { Router } = require("express");
const createSubscriptionRoutes = require("./subscriptionRoutes");

const createRoutes = (subscriptionService) => {
  const router = Router();
  router.use("/", createSubscriptionRoutes(subscriptionService));
  return router;
};

module.exports = createRoutes;
