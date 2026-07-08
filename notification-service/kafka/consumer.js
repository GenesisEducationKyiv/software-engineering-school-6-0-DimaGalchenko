const { Kafka } = require("kafkajs");

const createNotificationConsumer = ({
  emailService,
  resultProducer,
  kafkaBroker,
  logger,
}) => {
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

        const { templateId, email, data, sagaId } = payload;

        // Publishing the saga reply must never reclassify the send outcome or
        // abort the handler: a failure on the reply topic is logged and
        // swallowed, so it cannot turn a sent email into a "failed" reply or
        // block the offset commit (which would redeliver and re-send).
        const publishResultSafe = async (result) => {
          if (!sagaId) return;
          try {
            await resultProducer.publishResult(result);
          } catch (err) {
            logger.error(
              `[kafka] failed to publish ${result.status} result for saga ${sagaId}: ${err.message}`,
            );
          }
        };

        let sendError;
        try {
          await emailService.send(templateId, email, data);
          logger.info(`[kafka] sent ${templateId} to ${email}`);
        } catch (err) {
          sendError = err;
          logger.error(
            `[kafka] failed to send ${templateId} to ${email}: ${err.message}`,
          );
        }

        if (sendError) {
          await publishResultSafe({
            sagaId,
            templateId,
            status: "failed",
            error: sendError.message,
          });
        } else {
          await publishResultSafe({ sagaId, templateId, status: "sent" });
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
