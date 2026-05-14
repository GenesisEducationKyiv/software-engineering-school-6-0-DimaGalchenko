require("dotenv").config();
const Redis = require("ioredis");
const config = require("./config");
const createPool = require("./db/pool");
const runMigrations = require("./db/migrate");
const createSubscriptionRepository = require("./repositories/subscriptionRepository");
const createGithubService = require("./services/githubService");
const {
  createCacheService,
  createNullCacheService,
} = require("./services/cacheService");
const createEmailService = require("./services/emailService");
const createSender = require("./services/senders/senderFactory");
const createSubscriptionService = require("./services/subscriptionService");
const createScannerService = require("./services/scannerService");
const createSchedulerService = require("./services/schedulerService");
const { generateToken } = require("./services/tokenService");
const createApp = require("./app");
const createGrpcServer = require("./grpc/server");

const start = async () => {
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

  const sender = createSender(config);

  const emailService = createEmailService({ sender, config });

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
    emailService,
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
    emailService,
  });

  const app = createApp(subscriptionService, config.apiKey);

  app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });

  const schedulerService = createSchedulerService();
  schedulerService.start(config.scanCron, () => scannerService.scan());

  const grpcServer = createGrpcServer(subscriptionService);
  grpcServer.start(config.grpcPort);
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
