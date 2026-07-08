const createKafkaNotificationClient = require("./kafkaNotificationClient");

const createNotificationClient = (config, logger) =>
  createKafkaNotificationClient({ kafkaBroker: config.kafkaBroker, logger });

module.exports = { createNotificationClient };
