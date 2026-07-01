require("dotenv").config();
const config = require("./config");
const createSender = require("./services/senders/senderFactory");
const createEmailLinkBuilder = require("./services/emailLinkBuilder");
const createEmailService = require("./services/emailService");
const createApp = require("./app");
const createGrpcServer = require("./grpc/server");
const logger = require("./shared/logger");

const start = () => {
  const sender = createSender(config.email);
  const linkBuilder = createEmailLinkBuilder(config.baseUrl);

  const emailService = createEmailService({
    sender,
    emailFrom: config.email.from,
    linkBuilder,
  });

  const app = createApp(emailService);

  const server = app.listen(config.port, () => {
    logger.info(`Notification HTTP server running on port ${config.port}`);
  });

  const grpcServer = createGrpcServer(emailService);
  grpcServer.start(config.grpcPort);

  const shutdown = () => {
    server.close();
    grpcServer.stop();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

start();
