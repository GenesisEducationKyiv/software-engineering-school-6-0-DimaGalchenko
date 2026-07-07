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
  createReleaseEventConsumer,
} = require("./modules/release");
const { createNotificationClient } = require("./clients/notification");
const createApp = require("./app");
const createInternalApp = require("./internalApp");

const start = async () => {
  const logger = createLogger();
  const pool = createPool(config.databaseUrl);
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
    cacheService = createCacheService(redisClient, { ttl: config.cacheTtl });
  } catch (_err) {
    cacheService = createNullCacheService();
  }

  const githubService = createGithubService({ config, cacheService });

  const notificationClient = createNotificationClient(config, logger);
  try {
    await notificationClient.connect();
  } catch (err) {
    logger.error(
      `[kafka] notification client failed to connect to broker ${config.kafkaBroker}: ${err.message}`,
    );
    throw err;
  }

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

  const app = createApp(subscriptionService, config.apiKey);

  const server = app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });

  // Internal routes run on a separate port that is NOT published to the host
  // in docker-compose, so they are reachable only from within the Docker
  // network (e.g. release-service) and never from the internet.
  const internalApp = createInternalApp(subscriptionRepository, config.apiKey);
  const internalServer = internalApp.listen(config.internalPort, () => {
    console.log(`Internal server is running on port ${config.internalPort}`);
  });

  const grpcServer = createSubscriptionGrpcServer(subscriptionService);
  grpcServer.start(config.grpcPort);

  const shutdown = async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => internalServer.close(resolve));
    await grpcServer.stop();
    await notificationClient.disconnect();
    await releaseEventConsumer.stop();
    await pool.end();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
