const {
  createSubscriptionRepository,
  createSubscriptionService,
  createSubscriptionConfirmationSaga,
} = require("../../../modules/subscription");
const { generateToken } = require("../../../shared/tokenService");
const createApp = require("../../../app");

const noopLogger = { info: () => {}, error: () => {} };

const buildApp = (pool) => {
  const subscriptionRepository = createSubscriptionRepository(pool);

  const githubService = {
    validateRepository: jest.fn().mockResolvedValue(undefined),
  };

  const notificationClient = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  const saga = createSubscriptionConfirmationSaga({
    subscriptionRepository: {
      create: subscriptionRepository.create,
      updateConfirmationStatus: subscriptionRepository.updateConfirmationStatus,
    },
    notificationClient,
    logger: noopLogger,
  });

  const subscriptionService = createSubscriptionService({
    subscriptionRepository,
    githubService,
    generateToken,
    saga,
  });

  const app = createApp(subscriptionService);

  return { app, githubService, notificationClient };
};

module.exports = { buildApp };
