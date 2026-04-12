const path = require("path");
const express = require("express");
const createRoutes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const createAuthMiddleware = require("./middleware/authMiddleware");
const { metricsMiddleware, register } = require("./middleware/metricsMiddleware");

const createApp = (subscriptionService, apiKey) => {
  const app = express();

  app.use(metricsMiddleware);

  app.get("/metrics", async (req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  });

  app.use(express.json());
  app.use(express.static(path.join(__dirname, "public")));

  app.get("/confirm/:token", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "confirm.html"));
  });

  app.get("/unsubscribe/:token", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "unsubscribe.html"));
  });

  app.use("/api", createAuthMiddleware(apiKey), createRoutes(subscriptionService));
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
