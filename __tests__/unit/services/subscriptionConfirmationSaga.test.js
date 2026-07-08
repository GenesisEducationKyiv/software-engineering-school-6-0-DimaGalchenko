const createSubscriptionConfirmationSaga = require("../../../modules/subscription/subscriptionConfirmationSaga");

const createDeps = () => ({
  subscriptionRepository: {
    create: jest.fn().mockResolvedValue({ id: 1, email: "u@e.com" }),
    updateConfirmationStatus: jest.fn().mockResolvedValue(undefined),
  },
  notificationClient: { send: jest.fn().mockResolvedValue(undefined) },
  logger: { info: jest.fn(), error: jest.fn() },
});

describe("subscriptionConfirmationSaga", () => {
  let deps;
  let saga;

  beforeEach(() => {
    deps = createDeps();
    saga = createSubscriptionConfirmationSaga(deps);
  });

  describe("start", () => {
    it("creates a pending subscription and dispatches the confirmation command with sagaId", async () => {
      const sub = await saga.start("u@e.com", "o/r", "ctok", "utok");

      expect(deps.subscriptionRepository.create).toHaveBeenCalledWith({
        email: "u@e.com",
        repo: "o/r",
        confirmToken: "ctok",
        unsubscribeToken: "utok",
      });
      expect(deps.notificationClient.send).toHaveBeenCalledWith(
        "confirmation",
        {
          email: "u@e.com",
          confirmToken: "ctok",
          sagaId: 1,
        },
      );
      expect(sub).toEqual({ id: 1, email: "u@e.com" });
      expect(
        deps.subscriptionRepository.updateConfirmationStatus,
      ).not.toHaveBeenCalled();
    });

    it("compensates to failed when the command dispatch throws", async () => {
      deps.notificationClient.send.mockRejectedValueOnce(
        new Error("broker down"),
      );

      await saga.start("u@e.com", "o/r", "ctok", "utok");

      expect(
        deps.subscriptionRepository.updateConfirmationStatus,
      ).toHaveBeenCalledWith(1, "failed", "dispatch failed");
    });
  });

  describe("resend", () => {
    it("resets status to pending and re-dispatches for an existing subscription", async () => {
      await saga.resend({ id: 5, email: "u@e.com", confirm_token: "ctok" });

      expect(
        deps.subscriptionRepository.updateConfirmationStatus,
      ).toHaveBeenCalledWith(5, "pending");
      expect(deps.notificationClient.send).toHaveBeenCalledWith(
        "confirmation",
        {
          email: "u@e.com",
          confirmToken: "ctok",
          sagaId: 5,
        },
      );
    });
  });

  describe("onResult", () => {
    it("marks the subscription sent on a 'sent' reply", async () => {
      await saga.onResult({ sagaId: 3, status: "sent" });
      expect(
        deps.subscriptionRepository.updateConfirmationStatus,
      ).toHaveBeenCalledWith(3, "sent");
    });

    it("compensates with the error reason on a 'failed' reply", async () => {
      await saga.onResult({ sagaId: 3, status: "failed", error: "SMTP boom" });
      expect(
        deps.subscriptionRepository.updateConfirmationStatus,
      ).toHaveBeenCalledWith(3, "failed", "SMTP boom");
    });
  });
});
