const createSubscriptionService = require("../../../services/subscriptionService");
const { ValidationError, NotFoundError, ConflictError } = require("../../../utils/errors");

const createMockDependencies = () => ({
  subscriptionRepository: {
    findByEmailAndRepo: jest.fn(),
    create: jest.fn(),
    findByConfirmToken: jest.fn(),
    findByUnsubscribeToken: jest.fn(),
    confirmByToken: jest.fn(),
    deleteByUnsubscribeToken: jest.fn(),
    findConfirmedByEmail: jest.fn(),
  },
  githubService: {
    validateRepository: jest.fn().mockResolvedValue(true),
  },
  emailService: {
    sendConfirmation: jest.fn().mockResolvedValue(undefined),
  },
});

describe("SubscriptionService", () => {
  let service;
  let deps;

  beforeEach(() => {
    deps = createMockDependencies();
    service = createSubscriptionService(deps);
  });

  describe("subscribe", () => {
    it("creates subscription and sends confirmation email", async () => {
      deps.subscriptionRepository.findByEmailAndRepo.mockResolvedValue(null);
      deps.subscriptionRepository.create.mockResolvedValue({ id: 1 });

      await service.subscribe("user@example.com", "owner/repo");

      expect(deps.githubService.validateRepository).toHaveBeenCalledWith("owner/repo");
      expect(deps.subscriptionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: "user@example.com", repo: "owner/repo" })
      );
      expect(deps.emailService.sendConfirmation).toHaveBeenCalledWith(
        "user@example.com",
        expect.any(String)
      );
    });

    it("throws ValidationError for invalid email", async () => {
      await expect(service.subscribe("invalid", "owner/repo"))
        .rejects.toThrow(ValidationError);
    });

    it("throws ValidationError for empty email", async () => {
      await expect(service.subscribe("", "owner/repo"))
        .rejects.toThrow(ValidationError);
    });

    it("throws ValidationError for invalid repo format", async () => {
      await expect(service.subscribe("user@example.com", "invalidrepo"))
        .rejects.toThrow(ValidationError);
    });

    it("throws ValidationError for repo with multiple slashes", async () => {
      await expect(service.subscribe("user@example.com", "a/b/c"))
        .rejects.toThrow(ValidationError);
    });

    it("throws ConflictError when already subscribed and confirmed", async () => {
      deps.subscriptionRepository.findByEmailAndRepo.mockResolvedValue({
        confirmed: true,
        confirm_token: "token-123",
      });

      await expect(service.subscribe("user@example.com", "owner/repo"))
        .rejects.toThrow(ConflictError);
    });

    it("resends confirmation when subscription exists but not confirmed", async () => {
      deps.subscriptionRepository.findByEmailAndRepo.mockResolvedValue({
        confirmed: false,
        confirm_token: "existing-token",
      });

      await service.subscribe("user@example.com", "owner/repo");

      expect(deps.subscriptionRepository.create).not.toHaveBeenCalled();
      expect(deps.emailService.sendConfirmation).toHaveBeenCalledWith(
        "user@example.com",
        "existing-token"
      );
    });

    it("propagates NotFoundError from githubService", async () => {
      deps.githubService.validateRepository.mockRejectedValue(
        new NotFoundError("Repository not found on GitHub")
      );

      await expect(service.subscribe("user@example.com", "owner/repo"))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe("confirm", () => {
    it("confirms subscription by token", async () => {
      deps.subscriptionRepository.findByConfirmToken.mockResolvedValue({
        id: 1,
        confirmed: false,
      });

      await service.confirm("valid-token");

      expect(deps.subscriptionRepository.confirmByToken).toHaveBeenCalledWith("valid-token");
    });

    it("throws NotFoundError for unknown token", async () => {
      deps.subscriptionRepository.findByConfirmToken.mockResolvedValue(null);

      await expect(service.confirm("unknown-token"))
        .rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError for empty token", async () => {
      await expect(service.confirm(""))
        .rejects.toThrow(ValidationError);
    });
  });

  describe("unsubscribe", () => {
    it("deletes subscription by unsubscribe token", async () => {
      deps.subscriptionRepository.findByUnsubscribeToken.mockResolvedValue({ id: 1 });

      await service.unsubscribe("valid-token");

      expect(deps.subscriptionRepository.deleteByUnsubscribeToken).toHaveBeenCalledWith("valid-token");
    });

    it("throws NotFoundError for unknown token", async () => {
      deps.subscriptionRepository.findByUnsubscribeToken.mockResolvedValue(null);

      await expect(service.unsubscribe("unknown-token"))
        .rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError for empty token", async () => {
      await expect(service.unsubscribe(""))
        .rejects.toThrow(ValidationError);
    });
  });

  describe("listByEmail", () => {
    it("returns confirmed subscriptions for valid email", async () => {
      const subscriptions = [
        { email: "user@example.com", repo: "owner/repo", confirmed: true, last_seen_tag: "v1.0" },
      ];
      deps.subscriptionRepository.findConfirmedByEmail.mockResolvedValue(subscriptions);

      const result = await service.listByEmail("user@example.com");

      expect(result).toEqual(subscriptions);
    });

    it("returns empty array when no subscriptions exist", async () => {
      deps.subscriptionRepository.findConfirmedByEmail.mockResolvedValue([]);

      const result = await service.listByEmail("user@example.com");

      expect(result).toEqual([]);
    });

    it("throws ValidationError for invalid email", async () => {
      await expect(service.listByEmail("invalid"))
        .rejects.toThrow(ValidationError);
    });
  });
});
