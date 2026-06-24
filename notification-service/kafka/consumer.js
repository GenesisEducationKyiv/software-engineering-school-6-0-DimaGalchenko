const { Kafka } = require("kafkajs");

const createNotificationConsumer = ({ emailService, kafkaBroker, logger }) => {
  const kafka = new Kafka({
    clientId: "notification-service",
    brokers: [kafkaBroker],
  });
  const consumer = kafka.consumer({ groupId: "notification-service-group" });

  const start = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: "notifications", fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ message }) => {
        let payload;
        try {
          payload = JSON.parse(message.value.toString());
        } catch (err) {
          logger.error(
            `[kafka] failed to parse notification message: ${err.message}`,
          );
          return;
        }

        const { templateId, email, data } = payload;

        try {
          await emailService.send(templateId, email, data);
          logger.info(`[kafka] sent ${templateId} to ${email}`);
        } catch (err) {
          logger.error(
            `[kafka] failed to send ${templateId} to ${email}: ${err.message}`,
          );
        }
      },
    });
    logger.info("[kafka] notification consumer started");
  };

  const stop = async () => {
    await consumer.disconnect();
  };

  return { start, stop };
};

module.exports = createNotificationConsumer;
