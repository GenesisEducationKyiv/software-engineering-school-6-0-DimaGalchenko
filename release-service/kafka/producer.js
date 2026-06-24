const { Kafka } = require("kafkajs");

const createKafkaProducer = ({ kafkaBroker, logger }) => {
  const kafka = new Kafka({
    clientId: "release-service",
    brokers: [kafkaBroker],
  });
  const producer = kafka.producer();
  let connected = false;

  const connect = async () => {
    await producer.connect();
    connected = true;
    logger.info("[kafka] release-service producer connected");
  };

  const disconnect = async () => {
    if (connected) {
      await producer.disconnect();
      connected = false;
    }
  };

  const send = async (topic, payload) => {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }],
    });
  };

  return { send, connect, disconnect };
};

module.exports = createKafkaProducer;
