require("dotenv").config();
const Redis = require("ioredis");
const nodemailer = require("nodemailer");
const config = require("./config");
const pool = require("./db/pool");
const runMigrations = require("./db/migrate");
const createSubscriptionRepository = require("./repositories/subscriptionRepository");
const createGithubService = require("./services/githubService");
const { createCacheService, createNullCacheService } = require("./services/cacheService");
const createEmailService = require("./services/emailService");
const createSubscriptionService = require("./services/subscriptionService");
const createScannerService = require("./services/scannerService");
const createApp = require("./app");

const start = async () => {
  await runMigrations(pool);

  const subscriptionRepository = createSubscriptionRepository(pool);

  let cacheService;
  try {
    const redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      lazyConnect: true,
    });
    redisClient.on("error", () => {});
    await redisClient.connect();
    await redisClient.ping();
    cacheService = createCacheService(redisClient);
  } catch (_err) {
    cacheService = createNullCacheService();
  }

  const githubService = createGithubService({ config, cacheService });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });

  const emailService = createEmailService({ transporter, config });

  const subscriptionService = createSubscriptionService({
    subscriptionRepository,
    githubService,
    emailService,
  });

  const scannerService = createScannerService({
    subscriptionRepository,
    githubService,
    emailService,
  });

  const app = createApp(subscriptionService, config.apiKey);

  app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });

  scannerService.start(config.scanCron);
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
