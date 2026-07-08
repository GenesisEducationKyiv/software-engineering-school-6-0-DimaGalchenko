const { Kafka } = require("kafkajs");

const createReleaseEventConsumer = ({
  kafkaBroker,
  subscriptionRepository,
  notificationClient,
  logger,
}) => {
  const kafka = new Kafka({
    clientId: "main-app-release-consumer",
    brokers: [kafkaBroker],
  });
  const consumer = kafka.consumer({ groupId: "main-app-release-consumer" });

  const start = async () => {
    await consumer.connect();
    await consumer.subscribe({
      topic: "release.detected",
      fromBeginning: false,
    });
    await consumer.run({
      eachMessage: async ({ message }) => {
        let payload;
        try {
          payload = JSON.parse(message.value.toString());
        } catch (err) {
          logger.error(
            `[kafka] failed to parse release.detected message: ${err.message}`,
          );
          return;
        }

        const { repo, tagName, htmlUrl } = payload;

        let subscribers;
        try {
          subscribers = await subscriptionRepository.findConfirmedByRepo(repo);
        } catch (err) {
          logger.error(
            `[kafka] failed to fetch subscribers for ${repo}: ${err.message}`,
          );
          return;
        }

        for (const subscriber of subscribers) {
          if (subscriber.last_seen_tag === tagName) {
            continue;
          }

          try {
            await notificationClient.send("release", {
              email: subscriber.email,
              repo,
              tagName,
              htmlUrl,
              unsubscribeToken: subscriber.unsubscribe_token,
            });
            await subscriptionRepository.updateLastSeenTagById(
              subscriber.id,
              tagName,
            );
          } catch (err) {
            logger.error(
              `[kafka] failed to notify ${subscriber.email} for ${repo}@${tagName}: ${err.message}`,
            );
          }
        }
      },
    });
    logger.info("[kafka] release event consumer started");
  };

  const stop = async () => {
    await consumer.disconnect();
  };

  return { start, stop };
};

module.exports = createReleaseEventConsumer;
