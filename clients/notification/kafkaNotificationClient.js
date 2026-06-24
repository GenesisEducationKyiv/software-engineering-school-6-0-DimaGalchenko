const { Kafka } = require("kafkajs");

const createKafkaNotificationClient = ({ kafkaBroker, logger }) => {
  const kafka = new Kafka({
    clientId: "main-app",
    brokers: [kafkaBroker],
  });
  const producer = kafka.producer();
  let connected = false;

  const connect = async () => {
    await producer.connect();
    connected = true;
    logger.info("[kafka] notification producer connected");
  };

  const disconnect = async () => {
    if (connected) {
      await producer.disconnect();
      connected = false;
    }
  };

  const send = async (templateId, data) => {
    await producer.send({
      topic: "notifications",
      messages: [
        {
          value: JSON.stringify({ templateId, email: data.email, data }),
        },
      ],
    });
    logger.info(
      `[kafka] published notification: ${templateId} to ${data.email}`,
    );
  };

  return { send, connect, disconnect };
};

module.exports = createKafkaNotificationClient;
