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
  createSubscriptionConfirmationSaga,
  createNotificationResultConsumer,
} = require("./modules/subscription");
const {
  createGithubService,
  createReleaseEventConsumer,
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

  const notificationClient = createNotificationClient(config, logger);
  await notificationClient.connect();

  const saga = createSubscriptionConfirmationSaga({
    subscriptionRepository: {
      create: subscriptionRepository.create,
      updateConfirmationStatus: subscriptionRepository.updateConfirmationStatus,
    },
    notificationClient,
    logger,
  });

  const subscriptionService = createSubscriptionService({
    subscriptionRepository: {
      findByEmailAndRepo: subscriptionRepository.findByEmailAndRepo,
      findByConfirmToken: subscriptionRepository.findByConfirmToken,
      findByUnsubscribeToken: subscriptionRepository.findByUnsubscribeToken,
      confirmByToken: subscriptionRepository.confirmByToken,
      deleteByUnsubscribeToken: subscriptionRepository.deleteByUnsubscribeToken,
      findConfirmedByEmail: subscriptionRepository.findConfirmedByEmail,
      findAllByEmail: subscriptionRepository.findAllByEmail,
    },
    githubService,
    generateToken,
    saga,
  });

  const releaseEventConsumer = createReleaseEventConsumer({
    kafkaBroker: config.kafkaBroker,
    subscriptionRepository: {
      findConfirmedByRepo: subscriptionRepository.findConfirmedByRepo,
      updateLastSeenTagById: subscriptionRepository.updateLastSeenTagById,
    },
    notificationClient,
    logger,
  });
  await releaseEventConsumer.start();

  const notificationResultConsumer = createNotificationResultConsumer({
    kafkaBroker: config.kafkaBroker,
    saga,
    logger,
  });
  await notificationResultConsumer.start();

  const app = createApp(
    subscriptionService,
    subscriptionRepository,
    config.apiKey,
    logger,
  );

  const server = app.listen(config.port, () => {
    logger.info(`Server is running on port ${config.port}`);
  });

  const grpcServer = createSubscriptionGrpcServer(subscriptionService);
  grpcServer.start(config.grpcPort);

  const shutdown = async () => {
    server.close();
    await grpcServer.stop();
    await notificationClient.disconnect();
    await releaseEventConsumer.stop();
    await notificationResultConsumer.stop();
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
