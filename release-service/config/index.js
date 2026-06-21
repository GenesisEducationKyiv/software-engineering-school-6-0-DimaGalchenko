const config = {
  mainAppUrl: process.env.MAIN_APP_URL || "http://localhost:3000",
  mainAppApiKey: process.env.MAIN_APP_API_KEY || "",
  kafkaBroker: process.env.KAFKA_BROKER || "localhost:9092",
  github: {
    token: process.env.GITHUB_TOKEN || "",
    apiBase: "https://api.github.com",
  },
  scanCron: process.env.SCAN_CRON || "*/1 * * * *",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  cacheTtl: parseInt(process.env.CACHE_TTL, 10) || 600,
};

module.exports = config;
