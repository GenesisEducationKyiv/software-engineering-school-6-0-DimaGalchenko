const createSubscriptionConfirmationSaga = require("../../modules/subscription/subscriptionConfirmationSaga");

// In-memory subscription store standing in for the repository + DB.
const createFakeRepo = () => {
  const rows = new Map();
  let nextId = 1;
  return {
    rows,
    create: jest.fn(({ email, repo, confirmToken, unsubscribeToken }) => {
      const id = nextId++;
      const row = {
        id,
        email,
        repo,
        confirm_token: confirmToken,
        unsubscribe_token: unsubscribeToken,
        confirmed: false,
        confirmation_email_status: "pending",
        confirmation_failure_reason: null,
      };
      rows.set(id, row);
      return Promise.resolve(row);
    }),
    updateConfirmationStatus: jest.fn((id, status, reason = null) => {
      const row = rows.get(id);
      row.confirmation_email_status = status;
      row.confirmation_failure_reason = reason;
      return Promise.resolve();
    }),
    delete: jest.fn((id) => {
      rows.delete(id);
    }),
  };
};

describe("subscription confirmation saga (integration)", () => {
  it("completes: pending -> command dispatched -> sent reply -> status sent", async () => {
    const repo = createFakeRepo();
    const notificationClient = { send: jest.fn().mockResolvedValue(undefined) };
    const saga = createSubscriptionConfirmationSaga({
      subscriptionRepository: repo,
      notificationClient,
      logger: { info: jest.fn(), error: jest.fn() },
    });

    const sub = await saga.start("u@e.com", "o/r", "ctok", "utok");
    expect(repo.rows.get(sub.id).confirmation_email_status).toBe("pending");
    expect(notificationClient.send).toHaveBeenCalledWith(
      "confirmation",
      expect.objectContaining({ sagaId: sub.id }),
    );

    // Simulate the notification-service reply arriving over Kafka.
    await saga.onResult({ sagaId: sub.id, status: "sent" });

    expect(repo.rows.get(sub.id).confirmation_email_status).toBe("sent");
  });

  it("compensates: failed reply -> status failed with reason, row preserved", async () => {
    const repo = createFakeRepo();
    const notificationClient = { send: jest.fn().mockResolvedValue(undefined) };
    const saga = createSubscriptionConfirmationSaga({
      subscriptionRepository: repo,
      notificationClient,
      logger: { info: jest.fn(), error: jest.fn() },
    });

    const sub = await saga.start("u@e.com", "o/r", "ctok", "utok");
    await saga.onResult({
      sagaId: sub.id,
      status: "failed",
      error: "SMTP boom",
    });

    const row = repo.rows.get(sub.id);
    expect(row.confirmation_email_status).toBe("failed");
    expect(row.confirmation_failure_reason).toBe("SMTP boom");
    expect(repo.delete).not.toHaveBeenCalled(); // compensation preserves the row for visibility
    expect(repo.rows.has(sub.id)).toBe(true);
  });

  it("compensates immediately when command dispatch fails", async () => {
    const repo = createFakeRepo();
    const notificationClient = {
      send: jest.fn().mockRejectedValue(new Error("broker down")),
    };
    const saga = createSubscriptionConfirmationSaga({
      subscriptionRepository: repo,
      notificationClient,
      logger: { info: jest.fn(), error: jest.fn() },
    });

    const sub = await saga.start("u@e.com", "o/r", "ctok", "utok");

    const row = repo.rows.get(sub.id);
    expect(row.confirmation_email_status).toBe("failed");
    expect(row.confirmation_failure_reason).toBe("dispatch failed");
  });
});
