require("dotenv").config();
const Redis = require("ioredis");
const config = require("./config");
const createLogger = require("./shared/logger");
const { RateLimitError } = require("./shared/errors");
const createMainAppClient = require("./services/mainAppClient");
const createGithubService = require("./services/githubService");
const createSchedulerService = require("./services/schedulerService");
const createKafkaProducer = require("./kafka/producer");

const start = async () => {
  const logger = createLogger();

  const redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 0,
    retryStrategy: () => null,
    lazyConnect: true,
  });
  redis.on("error", (err) => logger.error(`[redis] ${err.message}`));
  try {
    await redis.connect();
    await redis.ping();
    logger.info("[redis] connected");
  } catch (err) {
    logger.error(`[redis] failed to connect: ${err.message}`);
  }

  const cacheService = {
    get: (key) => redis.get(key),
    set: (key, value) => redis.set(key, String(value)),
  };

  const mainAppClient = createMainAppClient({
    baseUrl: config.mainAppUrl,
    apiKey: config.mainAppApiKey,
  });

  const githubService = createGithubService({ config, cacheService });

  const producer = createKafkaProducer({
    kafkaBroker: config.kafkaBroker,
    logger,
  });
  await producer.connect();

  const scan = async () => {
    let repos;
    try {
      repos = await mainAppClient.getRepos();
    } catch (err) {
      logger.error(`[scanner] failed to fetch repos: ${err.message}`);
      return;
    }

    for (const repo of repos) {
      try {
        const releases = await githubService.fetchReleases(repo);
        if (!releases.length) {
          continue;
        }

        const latest = releases[0];
        const lastSeen = await redis.get(`release-service:last-tag:${repo}`);

        if (lastSeen === latest.tagName) {
          continue;
        }

        await producer.send("release.detected", {
          repo,
          tagName: latest.tagName,
          htmlUrl: latest.htmlUrl,
        });
        logger.info(
          `[scanner] published release.detected: ${repo}@${latest.tagName}`,
        );

        await redis.set(`release-service:last-tag:${repo}`, latest.tagName);
      } catch (err) {
        if (err instanceof RateLimitError) {
          logger.error(
            `[scanner] rate limited. Retry after ${err.retryAfter}s`,
          );
          return;
        }
        logger.error(`[scanner] error scanning ${repo}: ${err.message}`);
      }
    }
  };

  const schedulerService = createSchedulerService();
  schedulerService.start(config.scanCron, () => {
    scan().catch((err) =>
      logger.error(`[scanner] unexpected error: ${err.message}`),
    );
  });

  const shutdown = async () => {
    schedulerService.stop();
    await producer.disconnect();
    await redis.quit();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

start().catch((err) => {
  console.error("Failed to start release-service:", err);
  process.exit(1);
});
