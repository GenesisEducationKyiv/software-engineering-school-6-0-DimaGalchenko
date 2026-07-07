const {
  createSubscriptionRepository,
  createSubscriptionService,
} = require("../../../modules/subscription");
const { generateToken } = require("../../../shared/tokenService");
const createApp = require("../../../app");

const buildApp = (pool) => {
  const subscriptionRepository = createSubscriptionRepository(pool);

  const githubService = {
    validateRepository: jest.fn().mockResolvedValue(undefined),
  };

  const notificationClient = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  const subscriptionService = createSubscriptionService({
    subscriptionRepository,
    githubService,
    notificationClient,
    generateToken,
  });

  const app = createApp(subscriptionService, undefined, {
    info: () => {},
    warn: () => {},
    error: () => {},
  });

  return { app, githubService, notificationClient };
};

module.exports = { buildApp };
