const { NotFoundError, ConflictError } = require("../../shared/errors");
const {
  validateEmail,
  validateRepo,
  validateToken,
} = require("./subscriptionValidator");

const createSubscriptionService = ({
  subscriptionRepository,
  githubService,
  generateToken,
  saga,
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
      await saga.resend(existing);
      return;
    }

    const confirmToken = generateToken();
    const unsubscribeToken = generateToken();

    await saga.start(email, repo, confirmToken, unsubscribeToken);
  };

  const confirm = async (token) => {
    validateToken(token);

    const subscription = await subscriptionRepository.findByConfirmToken(token);

    if (!subscription) {
      throw new NotFoundError("Token not found");
    }

    if (subscription.confirmation_email_status === "failed") {
      throw new ConflictError(
        "Confirmation email failed for this subscription; cannot confirm",
      );
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
