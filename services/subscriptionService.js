const { ValidationError, NotFoundError, ConflictError } = require("../utils/errors");
const { generateToken } = require("./tokenService");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REPO_REGEX = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

const createSubscriptionService = ({ subscriptionRepository, githubService, emailService }) => {
  const validateSubscribeInput = (email, repo) => {
    if (!email || !EMAIL_REGEX.test(email)) {
      throw new ValidationError("Invalid email address");
    }
    if (!repo || !REPO_REGEX.test(repo)) {
      throw new ValidationError("Invalid repository format. Expected: owner/repo");
    }
  };

  const subscribe = async (email, repo) => {
    validateSubscribeInput(email, repo);

    await githubService.validateRepository(repo);

    const existing = await subscriptionRepository.findByEmailAndRepo(email, repo);

    if (existing && existing.confirmed) {
      throw new ConflictError("Email already subscribed to this repository");
    }

    if (existing && !existing.confirmed) {
      await emailService.sendConfirmation(email, existing.confirm_token);
      return;
    }

    const confirmToken = generateToken();
    const unsubscribeToken = generateToken();

    await subscriptionRepository.create({ email, repo, confirmToken, unsubscribeToken });
    await emailService.sendConfirmation(email, confirmToken);
  };

  const confirm = async (token) => {
    if (!token) {
      throw new ValidationError("Invalid token");
    }

    const subscription = await subscriptionRepository.findByConfirmToken(token);

    if (!subscription) {
      throw new NotFoundError("Token not found");
    }

    await subscriptionRepository.confirmByToken(token);
  };

  const unsubscribe = async (token) => {
    if (!token) {
      throw new ValidationError("Invalid token");
    }

    const subscription = await subscriptionRepository.findByUnsubscribeToken(token);

    if (!subscription) {
      throw new NotFoundError("Token not found");
    }

    await subscriptionRepository.deleteByUnsubscribeToken(token);
  };

  const listByEmail = async (email) => {
    if (!email || !EMAIL_REGEX.test(email)) {
      throw new ValidationError("Invalid email");
    }

    return await subscriptionRepository.findConfirmedByEmail(email);
  };

  const listAllByEmail = async (email) => {
    if (!email || !EMAIL_REGEX.test(email)) {
      throw new ValidationError("Invalid email");
    }

    return await subscriptionRepository.findAllByEmail(email);
  };

  return { subscribe, confirm, unsubscribe, listByEmail, listAllByEmail };
};

module.exports = createSubscriptionService;
