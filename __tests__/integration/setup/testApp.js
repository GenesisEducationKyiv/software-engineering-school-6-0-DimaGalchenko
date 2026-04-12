const createSubscriptionRepository = require("../../../repositories/subscriptionRepository");
const createSubscriptionService = require("../../../services/subscriptionService");
const createApp = require("../../../app");

const buildApp = (pool) => {
  const subscriptionRepository = createSubscriptionRepository(pool);

  const githubService = {
    validateRepository: jest.fn().mockResolvedValue(undefined),
  };

  const emailService = {
    sendConfirmation: jest.fn().mockResolvedValue(undefined),
  };

  const subscriptionService = createSubscriptionService({
    subscriptionRepository,
    githubService,
    emailService,
  });

  const app = createApp(subscriptionService);

  return { app, githubService, emailService };
};

module.exports = { buildApp };
