const createNotificationConsumer = require("../kafka/consumer");

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

const createMockResultProducer = () => ({
  publishResult: jest.fn().mockResolvedValue(undefined),
});

const createMockLogger = () => ({ info: jest.fn(), error: jest.fn() });

const deliver = (payload) =>
  capturedEachMessage({
    topic: "notifications",
    message: { value: Buffer.from(JSON.stringify(payload)) },
  });

describe("NotificationConsumer", () => {
  let emailService;
  let resultProducer;
  let logger;

  beforeEach(async () => {
    jest.clearAllMocks();
    capturedEachMessage = undefined;
    mockConsumerRun.mockImplementation(({ eachMessage }) => {
      capturedEachMessage = eachMessage;
      return Promise.resolve();
    });

    emailService = createMockEmailService();
    resultProducer = createMockResultProducer();
    logger = createMockLogger();
    const consumer = createNotificationConsumer({
      emailService,
      resultProducer,
      kafkaBroker: "localhost:9092",
      logger,
    });
    await consumer.start();
  });

  it("sends the email for a confirmation message", async () => {
    await deliver({
      templateId: "confirmation",
      email: "user@example.com",
      data: { email: "user@example.com", confirmToken: "tok-123" },
      sagaId: 1,
    });

    expect(emailService.send).toHaveBeenCalledWith(
      "confirmation",
      "user@example.com",
      { email: "user@example.com", confirmToken: "tok-123" },
    );
  });

  it("publishes a 'sent' result when sagaId is present and send succeeds", async () => {
    await deliver({
      templateId: "confirmation",
      email: "user@example.com",
      data: { email: "user@example.com", confirmToken: "tok" },
      sagaId: 42,
    });

    expect(resultProducer.publishResult).toHaveBeenCalledWith({
      sagaId: 42,
      templateId: "confirmation",
      status: "sent",
    });
  });

  it("publishes a 'failed' result with the error when send throws", async () => {
    emailService.send.mockRejectedValueOnce(new Error("SMTP failure"));

    await deliver({
      templateId: "confirmation",
      email: "user@example.com",
      data: { email: "user@example.com", confirmToken: "tok" },
      sagaId: 42,
    });

    expect(resultProducer.publishResult).toHaveBeenCalledWith({
      sagaId: 42,
      templateId: "confirmation",
      status: "failed",
      error: "SMTP failure",
    });
  });

  it("does not publish a result when sagaId is absent (release notification)", async () => {
    await deliver({
      templateId: "release",
      email: "user@example.com",
      data: { email: "user@example.com", repo: "o/r", tagName: "v2" },
    });

    expect(resultProducer.publishResult).not.toHaveBeenCalled();
  });

  it("logs and does not throw on invalid JSON", async () => {
    await expect(
      capturedEachMessage({
        topic: "notifications",
        message: { value: Buffer.from("not-valid-json") },
      }),
    ).resolves.not.toThrow();
    expect(logger.error).toHaveBeenCalled();
    expect(emailService.send).not.toHaveBeenCalled();
  });
});
