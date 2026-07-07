require("dotenv").config();
const Redis = require("ioredis");
const config = require("./config");
const createPool = require("./db/pool");
const runMigrations = require("./db/migrate");
const {
  createCacheService,
  createNullCacheService,
} = require("./shared/cacheService");
const createLogger = require("./shared/logger");
const { generateToken } = require("./shared/tokenService");
const {
  createSubscriptionService,
  createSubscriptionRepository,
  createSubscriptionGrpcServer,
} = require("./modules/subscription");
const {
  createGithubService,
  createScannerService,
  createSchedulerService,
} = require("./modules/release");
const { createNotificationClient } = require("./clients/notification");
const createApp = require("./app");
const logger = createLogger(config);

const start = async () => {
  const pool = createPool(config.databaseUrl);
  await runMigrations(pool, logger);

  const subscriptionRepository = createSubscriptionRepository(pool);

  let cacheService;
  try {
    const redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      lazyConnect: true,
    });
    redisClient.on("error", (err) => {
      logger.warn("Redis error", { error: err.message });
    });
    await redisClient.connect();
    await redisClient.ping();
    cacheService = createCacheService(redisClient, { ttl: config.cacheTtl });
  } catch (_err) {
    logger.warn("Redis unavailable, running without cache");
    cacheService = createNullCacheService();
  }

  const githubService = createGithubService({ config, cacheService });

  const notificationClient = createNotificationClient(config);

  const subscriptionService = createSubscriptionService({
    subscriptionRepository: {
      findByEmailAndRepo: subscriptionRepository.findByEmailAndRepo,
      create: subscriptionRepository.create,
      findByConfirmToken: subscriptionRepository.findByConfirmToken,
      findByUnsubscribeToken: subscriptionRepository.findByUnsubscribeToken,
      confirmByToken: subscriptionRepository.confirmByToken,
      deleteByUnsubscribeToken: subscriptionRepository.deleteByUnsubscribeToken,
      findConfirmedByEmail: subscriptionRepository.findConfirmedByEmail,
      findAllByEmail: subscriptionRepository.findAllByEmail,
    },
    githubService,
    notificationClient,
    generateToken,
  });

  const scannerService = createScannerService({
    subscriptionRepository: {
      findDistinctConfirmedRepos:
        subscriptionRepository.findDistinctConfirmedRepos,
      findConfirmedByRepo: subscriptionRepository.findConfirmedByRepo,
      updateLastSeenTagById: subscriptionRepository.updateLastSeenTagById,
    },
    githubService,
    notificationClient,
    logger,
  });

  const app = createApp(subscriptionService, config.apiKey, logger);

  const server = app.listen(config.port, () => {
    logger.info(`Server is running on port ${config.port}`);
  });

  const schedulerService = createSchedulerService();
  schedulerService.start(config.scanCron, () => scannerService.scan());

  const grpcServer = createSubscriptionGrpcServer(subscriptionService);
  grpcServer.start(config.grpcPort);

  const shutdown = async () => {
    schedulerService.stop();
    server.close();
    await grpcServer.stop();
    await pool.end();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

start().catch((err) => {
  logger.error("Failed to start server", {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});
