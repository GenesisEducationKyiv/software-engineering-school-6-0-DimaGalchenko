const express = require("express");
const createRoutes = require("./routes");
const errorHandler = require("./middleware/errorHandler");

const createApp = (emailService) => {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", createRoutes(emailService));
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
