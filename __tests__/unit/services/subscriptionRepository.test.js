const createSubscriptionRepository = require("../../../modules/subscription/subscriptionRepository");

const createMockPool = () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
});

describe("subscriptionRepository.updateConfirmationStatus", () => {
  it("updates status and reason for the given id", async () => {
    const pool = createMockPool();
    const repo = createSubscriptionRepository(pool);

    await repo.updateConfirmationStatus(42, "failed", "dispatch failed");

    expect(pool.query).toHaveBeenCalledWith(
      "UPDATE subscriptions SET confirmation_email_status = $1, confirmation_failure_reason = $2 WHERE id = $3",
      ["failed", "dispatch failed", 42],
    );
  });

  it("defaults reason to null when omitted", async () => {
    const pool = createMockPool();
    const repo = createSubscriptionRepository(pool);

    await repo.updateConfirmationStatus(7, "sent");

    expect(pool.query).toHaveBeenCalledWith(
      "UPDATE subscriptions SET confirmation_email_status = $1, confirmation_failure_reason = $2 WHERE id = $3",
      ["sent", null, 7],
    );
  });
});
