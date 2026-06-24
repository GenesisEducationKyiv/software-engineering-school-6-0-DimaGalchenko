const crypto = require("crypto");
const createSubscriptionService = require("../../../modules/subscription/subscriptionService");
const {
  ValidationError,
  NotFoundError,
  ConflictError,
} = require("../../../shared/errors");

const VALID_TOKEN = "550e8400-e29b-41d4-a716-446655440000";
const UNKNOWN_TOKEN = "660e8400-e29b-41d4-a716-446655440000";

const createMockDependencies = () => ({
  subscriptionRepository: {
    findByEmailAndRepo: jest.fn(),
    findByConfirmToken: jest.fn(),
    findByUnsubscribeToken: jest.fn(),
    confirmByToken: jest.fn(),
    deleteByUnsubscribeToken: jest.fn(),
    findConfirmedByEmail: jest.fn(),
    findAllByEmail: jest.fn(),
  },
  githubService: { validateRepository: jest.fn().mockResolvedValue(true) },
  generateToken: () => crypto.randomUUID(),
  saga: {
    start: jest.fn().mockResolvedValue({ id: 1 }),
    resend: jest.fn().mockResolvedValue(undefined),
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
    it("starts the saga for a brand-new subscription", async () => {
      deps.subscriptionRepository.findByEmailAndRepo.mockResolvedValue(null);

      await service.subscribe("user@example.com", "owner/repo");

      expect(deps.githubService.validateRepository).toHaveBeenCalledWith(
        "owner/repo",
      );
      expect(deps.saga.start).toHaveBeenCalledWith(
        "user@example.com",
        "owner/repo",
        expect.any(String),
        expect.any(String),
      );
    });

    it("resends via the saga for an existing unconfirmed subscription", async () => {
      const existing = {
        id: 8,
        email: "user@example.com",
        confirmed: false,
        confirm_token: "ctok",
      };
      deps.subscriptionRepository.findByEmailAndRepo.mockResolvedValue(
        existing,
      );

      await service.subscribe("user@example.com", "owner/repo");

      expect(deps.saga.resend).toHaveBeenCalledWith(existing);
      expect(deps.saga.start).not.toHaveBeenCalled();
    });

    it("throws ConflictError when already confirmed", async () => {
      deps.subscriptionRepository.findByEmailAndRepo.mockResolvedValue({
        id: 8,
        confirmed: true,
      });

      await expect(
        service.subscribe("user@example.com", "owner/repo"),
      ).rejects.toThrow(ConflictError);
    });

    it("throws ValidationError for invalid email", async () => {
      await expect(service.subscribe("invalid", "owner/repo")).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("confirm", () => {
    it("confirms a subscription whose email was sent", async () => {
      deps.subscriptionRepository.findByConfirmToken.mockResolvedValue({
        id: 1,
        confirmation_email_status: "sent",
      });

      await service.confirm(VALID_TOKEN);

      expect(deps.subscriptionRepository.confirmByToken).toHaveBeenCalledWith(
        VALID_TOKEN,
      );
    });

    it("throws NotFoundError for an unknown token", async () => {
      deps.subscriptionRepository.findByConfirmToken.mockResolvedValue(null);

      await expect(service.confirm(UNKNOWN_TOKEN)).rejects.toThrow(
        NotFoundError,
      );
    });

    it("throws ConflictError when the confirmation email failed", async () => {
      deps.subscriptionRepository.findByConfirmToken.mockResolvedValue({
        id: 1,
        confirmation_email_status: "failed",
      });

      await expect(service.confirm(VALID_TOKEN)).rejects.toThrow(ConflictError);
      expect(deps.subscriptionRepository.confirmByToken).not.toHaveBeenCalled();
    });
  });
});
