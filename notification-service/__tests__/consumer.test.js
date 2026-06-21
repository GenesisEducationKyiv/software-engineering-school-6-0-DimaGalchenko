const createNotificationConsumer = require("../kafka/consumer");

// Mock state shared across mock instances
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

const createMockEmailService = () => ({
  send: jest.fn().mockResolvedValue(undefined),
});

const createMockLogger = () => ({
  info: jest.fn(),
  error: jest.fn(),
});

describe("NotificationConsumer", () => {
  let emailService;
  let logger;

  beforeEach(async () => {
    jest.clearAllMocks();
    capturedEachMessage = undefined;
    // Re-setup mockConsumerRun to capture the new callback
    mockConsumerRun.mockImplementation(({ eachMessage }) => {
      capturedEachMessage = eachMessage;
      return Promise.resolve();
    });

    emailService = createMockEmailService();
    logger = createMockLogger();
    const consumer = createNotificationConsumer({
      emailService,
      kafkaBroker: "localhost:9092",
      logger,
    });
    await consumer.start();
  });

  it("sends confirmation email when confirmation message arrives", async () => {
    const payload = {
      templateId: "confirmation",
      email: "user@example.com",
      data: { email: "user@example.com", confirmToken: "tok-123" },
    };
    await capturedEachMessage({
      topic: "notifications",
      message: { value: Buffer.from(JSON.stringify(payload)) },
    });

    expect(emailService.send).toHaveBeenCalledWith(
      "confirmation",
      "user@example.com",
      { email: "user@example.com", confirmToken: "tok-123" },
    );
  });

  it("sends release email when release message arrives", async () => {
    const payload = {
      templateId: "release",
      email: "user@example.com",
      data: {
        email: "user@example.com",
        repo: "owner/repo",
        tagName: "v2.0.0",
        htmlUrl: "https://github.com/owner/repo/releases/tag/v2.0.0",
        unsubscribeToken: "unsub-tok",
      },
    };
    await capturedEachMessage({
      topic: "notifications",
      message: { value: Buffer.from(JSON.stringify(payload)) },
    });

    expect(emailService.send).toHaveBeenCalledWith(
      "release",
      "user@example.com",
      expect.objectContaining({ repo: "owner/repo", tagName: "v2.0.0" }),
    );
  });

  it("logs error and does not throw when message JSON is invalid", async () => {
    await expect(
      capturedEachMessage({
        topic: "notifications",
        message: { value: Buffer.from("not-valid-json") },
      }),
    ).resolves.not.toThrow();

    expect(logger.error).toHaveBeenCalled();
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it("logs error and does not throw when emailService.send fails", async () => {
    emailService.send.mockRejectedValueOnce(new Error("SMTP failure"));
    const payload = {
      templateId: "confirmation",
      email: "user@example.com",
      data: { email: "user@example.com", confirmToken: "tok" },
    };

    await expect(
      capturedEachMessage({
        topic: "notifications",
        message: { value: Buffer.from(JSON.stringify(payload)) },
      }),
    ).resolves.not.toThrow();

    expect(logger.error).toHaveBeenCalled();
  });
});
