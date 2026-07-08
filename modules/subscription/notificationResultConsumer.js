const { Kafka } = require("kafkajs");

const createNotificationResultConsumer = ({ kafkaBroker, saga, logger }) => {
  const kafka = new Kafka({
    clientId: "main-app-notification-result-consumer",
    brokers: [kafkaBroker],
  });
  const consumer = kafka.consumer({
    groupId: "main-app-notification-result-consumer",
  });

  const start = async () => {
    await consumer.connect();
    await consumer.subscribe({
      topic: "notification.results",
      fromBeginning: false,
    });
    await consumer.run({
      eachMessage: async ({ message }) => {
        let payload;
        try {
          payload = JSON.parse(message.value.toString());
        } catch (err) {
          logger.error(
            `[kafka] failed to parse notification.results message: ${err.message}`,
          );
          return;
        }

        try {
          await saga.onResult(payload);
        } catch (err) {
          logger.error(
            `[kafka] failed to handle notification result: ${err.message}`,
          );
        }
      },
    });
    logger.info("[kafka] notification result consumer started");
  };

  const stop = async () => {
    await consumer.disconnect();
  };

  return { start, stop };
};

module.exports = createNotificationResultConsumer;
