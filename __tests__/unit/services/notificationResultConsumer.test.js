const createNotificationResultConsumer = require("../../../modules/subscription/notificationResultConsumer");

let capturedEachMessage;
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockSubscribe = jest.fn().mockResolvedValue(undefined);
const mockRun = jest.fn().mockImplementation(({ eachMessage }) => {
  capturedEachMessage = eachMessage;
  return Promise.resolve();
});
const mockDisconnect = jest.fn().mockResolvedValue(undefined);

jest.mock("kafkajs", () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    consumer: jest.fn().mockReturnValue({
      connect: mockConnect,
      subscribe: mockSubscribe,
      run: mockRun,
      disconnect: mockDisconnect,
    }),
  })),
}));

describe("notificationResultConsumer", () => {
  let saga;
  let logger;

  beforeEach(async () => {
    jest.clearAllMocks();
    capturedEachMessage = undefined;
    mockRun.mockImplementation(({ eachMessage }) => {
      capturedEachMessage = eachMessage;
      return Promise.resolve();
    });
    saga = { onResult: jest.fn().mockResolvedValue(undefined) };
    logger = { info: jest.fn(), error: jest.fn() };
    const consumer = createNotificationResultConsumer({
      kafkaBroker: "localhost:9092",
      saga,
      logger,
    });
    await consumer.start();
  });

  it("subscribes to the notification.results topic", () => {
    expect(mockSubscribe).toHaveBeenCalledWith({
      topic: "notification.results",
      fromBeginning: false,
    });
  });

  it("forwards a parsed result to saga.onResult", async () => {
    const payload = { sagaId: 3, templateId: "confirmation", status: "sent" };
    await capturedEachMessage({
      message: { value: Buffer.from(JSON.stringify(payload)) },
    });
    expect(saga.onResult).toHaveBeenCalledWith(payload);
  });

  it("logs and does not throw on invalid JSON", async () => {
    await expect(
      capturedEachMessage({ message: { value: Buffer.from("nope") } }),
    ).resolves.not.toThrow();
    expect(logger.error).toHaveBeenCalled();
    expect(saga.onResult).not.toHaveBeenCalled();
  });
});
