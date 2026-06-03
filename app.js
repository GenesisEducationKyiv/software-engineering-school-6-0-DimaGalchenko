const path = require("path");
const express = require("express");
const createRoutes = require("./routes");
const createErrorHandler = require("./middleware/errorHandler");
const createAuthMiddleware = require("./middleware/authMiddleware");
const {
  metricsMiddleware,
  register,
} = require("./middleware/metricsMiddleware");

const createApp = (subscriptionService, apiKey, logger) => {
  const app = express();

  app.use(metricsMiddleware);
  app.use((req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
      logger.info("HTTP request", {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: Date.now() - start,
        ip: req.ip,
      });
    });

    next();
  });

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

  app.use(
    "/api",
    createAuthMiddleware(apiKey),
    createRoutes(subscriptionService),
  );
  app.use(createErrorHandler(logger));

  return app;
};

module.exports = createApp;
