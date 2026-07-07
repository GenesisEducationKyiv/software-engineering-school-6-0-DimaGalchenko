const express = require("express");
const { createInternalRoutes } = require("./modules/subscription");
const errorHandler = require("./middleware/errorHandler");
const createAuthMiddleware = require("./middleware/authMiddleware");

// Internal routes are served on their own app so they can be bound to an
// unpublished port (reachable only within the Docker network), keeping them
// off the host-facing public server.
const createInternalApp = (subscriptionRepository, apiKey) => {
  const app = express();

  app.use(express.json());

  app.use(
    "/api/internal",
    createAuthMiddleware(apiKey),
    createInternalRoutes(subscriptionRepository),
  );

  app.use(errorHandler);

  return app;
};

module.exports = createInternalApp;
