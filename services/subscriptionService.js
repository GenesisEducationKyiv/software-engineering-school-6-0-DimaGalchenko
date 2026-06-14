const { NotFoundError, ConflictError } = require("../utils/errors");
const {
  validateEmail,
  validateRepo,
  validateToken,
} = require("./subscriptionValidator");

const createSubscriptionService = ({
  subscriptionRepository,
  githubService,
  emailService,
  generateToken,
}) => {
  const subscribe = async (email, repo) => {
    validateEmail(email);
    validateRepo(repo);

    await githubService.validateRepository(repo);

    const existing = await subscriptionRepository.findByEmailAndRepo(
      email,
      repo,
    );

    if (existing && existing.confirmed) {
      throw new ConflictError("Email already subscribed to this repository");
    }

    if (existing && !existing.confirmed) {
      await emailService.sendConfirmation(email, existing.confirm_token);
      return;
    }

    const confirmToken = generateToken();
    const unsubscribeToken = generateToken();

    await subscriptionRepository.create({
      email,
      repo,
      confirmToken,
      unsubscribeToken,
    });
    await emailService.sendConfirmation(email, confirmToken);
  };

  const confirm = async (token) => {
    validateToken(token);

    const subscription = await subscriptionRepository.findByConfirmToken(token);

    if (!subscription) {
      throw new NotFoundError("Token not found");
    }

    await subscriptionRepository.confirmByToken(token);
  };

  const unsubscribe = async (token) => {
    validateToken(token);

    const subscription =
      await subscriptionRepository.findByUnsubscribeToken(token);

    if (!subscription) {
      throw new NotFoundError("Token not found");
    }

    await subscriptionRepository.deleteByUnsubscribeToken(token);
  };

  const listByEmail = async (email) => {
    validateEmail(email);

    return await subscriptionRepository.findConfirmedByEmail(email);
  };

  const listAllByEmail = async (email) => {
    validateEmail(email);

    return await subscriptionRepository.findAllByEmail(email);
  };

  return { subscribe, confirm, unsubscribe, listByEmail, listAllByEmail };
};

module.exports = createSubscriptionService;
