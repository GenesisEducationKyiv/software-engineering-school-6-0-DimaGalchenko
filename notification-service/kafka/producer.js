const { Kafka } = require("kafkajs");

const createResultProducer = ({ kafkaBroker, logger }) => {
  const kafka = new Kafka({
    clientId: "notification-service",
    brokers: [kafkaBroker],
  });
  const producer = kafka.producer();
  let connected = false;

  const connect = async () => {
    await producer.connect();
    connected = true;
    logger.info("[kafka] notification result producer connected");
  };

  const disconnect = async () => {
    if (connected) {
      await producer.disconnect();
      connected = false;
    }
  };

  const publishResult = async (result) => {
    await producer.send({
      topic: "notification.results",
      messages: [{ value: JSON.stringify(result) }],
    });
    logger.info(
      `[kafka] published notification result for saga ${result.sagaId}: ${result.status}`,
    );
  };

  return { connect, disconnect, publishResult };
};

module.exports = createResultProducer;
