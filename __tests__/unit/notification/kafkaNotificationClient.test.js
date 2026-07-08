const createKafkaNotificationClient = require("../../../clients/notification/kafkaNotificationClient");

const mockProducerSend = jest.fn().mockResolvedValue(undefined);
const mockProducerConnect = jest.fn().mockResolvedValue(undefined);
const mockProducerDisconnect = jest.fn().mockResolvedValue(undefined);

jest.mock("kafkajs", () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: jest.fn().mockReturnValue({
      connect: mockProducerConnect,
      disconnect: mockProducerDisconnect,
      send: mockProducerSend,
    }),
  })),
}));

describe("KafkaNotificationClient", () => {
  let client;

  beforeEach(async () => {
    jest.clearAllMocks();
    client = createKafkaNotificationClient({
      kafkaBroker: "localhost:9092",
      logger: { info: jest.fn(), error: jest.fn() },
    });
    await client.connect();
  });

  it("publishes to notifications topic for confirmation", async () => {
    await client.send("confirmation", {
      email: "a@b.com",
      confirmToken: "tok",
    });

    expect(mockProducerSend).toHaveBeenCalledWith(
      expect.objectContaining({ topic: "notifications" }),
    );
    const message = mockProducerSend.mock.calls[0][0].messages[0];
    const parsed = JSON.parse(message.value);
    expect(parsed.templateId).toBe("confirmation");
    expect(parsed.email).toBe("a@b.com");
  });

  it("publishes to notifications topic for release", async () => {
    await client.send("release", {
      email: "a@b.com",
      repo: "o/r",
      tagName: "v1",
    });

    expect(mockProducerSend).toHaveBeenCalledWith(
      expect.objectContaining({ topic: "notifications" }),
    );
    const message = mockProducerSend.mock.calls[0][0].messages[0];
    const parsed = JSON.parse(message.value);
    expect(parsed.templateId).toBe("release");
    expect(parsed.email).toBe("a@b.com");
  });

  it("calls producer.disconnect on disconnect()", async () => {
    await client.disconnect();
    expect(mockProducerDisconnect).toHaveBeenCalled();
  });
});
