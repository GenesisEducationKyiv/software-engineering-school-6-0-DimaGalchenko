const createReleaseEventConsumer = require("../../../modules/release/releaseEventConsumer");

let capturedEachMessage;
const mockConsumerConnect = jest.fn().mockResolvedValue(undefined);
const mockConsumerSubscribe = jest.fn().mockResolvedValue(undefined);
const mockConsumerRun = jest.fn().mockImplementation(({ eachMessage }) => {
  capturedEachMessage = eachMessage;
  return Promise.resolve();
});
const mockConsumerDisconnect = jest.fn().mockResolvedValue(undefined);

jest.mock("kafkajs", () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    consumer: jest.fn().mockReturnValue({
      connect: mockConsumerConnect,
      subscribe: mockConsumerSubscribe,
      run: mockConsumerRun,
      disconnect: mockConsumerDisconnect,
    }),
  })),
}));

const createMockDependencies = () => ({
  subscriptionRepository: {
    findConfirmedByRepo: jest.fn(),
    updateLastSeenTagById: jest.fn().mockResolvedValue(undefined),
  },
  notificationClient: {
    send: jest.fn().mockResolvedValue(undefined),
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
});

describe("ReleaseEventConsumer", () => {
  let deps;

  beforeEach(async () => {
    jest.clearAllMocks();
    capturedEachMessage = undefined;
    mockConsumerRun.mockImplementation(({ eachMessage }) => {
      capturedEachMessage = eachMessage;
      return Promise.resolve();
    });

    deps = createMockDependencies();
    const consumer = createReleaseEventConsumer({
      kafkaBroker: "localhost:9092",
      ...deps,
    });
    await consumer.start();
  });

  const makeMessage = (payload) => ({
    topic: "release.detected",
    message: { value: Buffer.from(JSON.stringify(payload)) },
  });

  it("sends release notification for subscriber with stale last_seen_tag", async () => {
    deps.subscriptionRepository.findConfirmedByRepo.mockResolvedValue([
      {
        id: 1,
        email: "user@example.com",
        last_seen_tag: "v1.0.0",
        unsubscribe_token: "unsub-1",
      },
    ]);

    await capturedEachMessage(
      makeMessage({
        repo: "owner/repo",
        tagName: "v2.0.0",
        htmlUrl: "https://github.com/owner/repo/releases/tag/v2.0.0",
      }),
    );

    expect(deps.notificationClient.send).toHaveBeenCalledWith("release", {
      email: "user@example.com",
      repo: "owner/repo",
      tagName: "v2.0.0",
      htmlUrl: "https://github.com/owner/repo/releases/tag/v2.0.0",
      unsubscribeToken: "unsub-1",
    });
    expect(
      deps.subscriptionRepository.updateLastSeenTagById,
    ).toHaveBeenCalledWith(1, "v2.0.0");
  });

  it("skips subscriber whose last_seen_tag already matches", async () => {
    deps.subscriptionRepository.findConfirmedByRepo.mockResolvedValue([
      {
        id: 1,
        email: "user@example.com",
        last_seen_tag: "v2.0.0",
        unsubscribe_token: "unsub-1",
      },
    ]);

    await capturedEachMessage(
      makeMessage({ repo: "owner/repo", tagName: "v2.0.0", htmlUrl: "url" }),
    );

    expect(deps.notificationClient.send).not.toHaveBeenCalled();
    expect(
      deps.subscriptionRepository.updateLastSeenTagById,
    ).not.toHaveBeenCalled();
  });

  it("does not send notification when there are no subscribers", async () => {
    deps.subscriptionRepository.findConfirmedByRepo.mockResolvedValue([]);

    await capturedEachMessage(
      makeMessage({ repo: "owner/repo", tagName: "v2.0.0", htmlUrl: "url" }),
    );

    expect(deps.notificationClient.send).not.toHaveBeenCalled();
  });

  it("continues processing other subscribers when one notification fails", async () => {
    deps.subscriptionRepository.findConfirmedByRepo.mockResolvedValue([
      {
        id: 1,
        email: "fail@example.com",
        last_seen_tag: "v1.0.0",
        unsubscribe_token: "unsub-1",
      },
      {
        id: 2,
        email: "ok@example.com",
        last_seen_tag: "v1.0.0",
        unsubscribe_token: "unsub-2",
      },
    ]);
    deps.notificationClient.send
      .mockRejectedValueOnce(new Error("SMTP error"))
      .mockResolvedValueOnce(undefined);

    await capturedEachMessage(
      makeMessage({ repo: "owner/repo", tagName: "v2.0.0", htmlUrl: "url" }),
    );

    expect(deps.notificationClient.send).toHaveBeenCalledTimes(2);
    expect(
      deps.subscriptionRepository.updateLastSeenTagById,
    ).toHaveBeenCalledWith(2, "v2.0.0");
    expect(deps.logger.error).toHaveBeenCalled();
  });

  it("logs error and returns when message JSON is invalid", async () => {
    await expect(
      capturedEachMessage({
        topic: "release.detected",
        message: { value: Buffer.from("bad-json") },
      }),
    ).resolves.not.toThrow();

    expect(deps.logger.error).toHaveBeenCalled();
    expect(deps.notificationClient.send).not.toHaveBeenCalled();
  });
});
