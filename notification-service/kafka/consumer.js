const { Kafka } = require("kafkajs");

const createNotificationConsumer = ({
  emailService,
  kafkaBroker,
  logger,
  maxRetries = 3,
  retryDelayMs = 500,
}) => {
  const kafka = new Kafka({
    clientId: "notification-service",
    brokers: [kafkaBroker],
  });
  const consumer = kafka.consumer({ groupId: "notification-service-group" });

  const sendWithRetry = async (templateId, email, data) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await emailService.send(templateId, email, data);
        return true;
      } catch (err) {
        const lastAttempt = attempt === maxRetries;
        logger.error(
          `[kafka] send attempt ${attempt}/${maxRetries} failed for ${templateId} to ${email}: ${err.message}${
            lastAttempt ? " (giving up)" : ", retrying"
          }`,
        );
        if (lastAttempt) {
          return false;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelayMs * attempt),
        );
      }
    }
    return false;
  };

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

        const sent = await sendWithRetry(templateId, email, data);
        if (sent) {
          logger.info(`[kafka] sent ${templateId} to ${email}`);
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
