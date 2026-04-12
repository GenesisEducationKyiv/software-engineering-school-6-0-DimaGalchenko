const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  databaseUrl: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/release_notifier",
  baseUrl: process.env.BASE_URL || "http://localhost:3000",
  github: {
    token: process.env.GITHUB_TOKEN || "",
    apiBase: "https://api.github.com",
  },
  email: {
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
  },
  scanCron: process.env.SCAN_CRON || "*/1 * * * *",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  apiKey: process.env.API_KEY || "",
};

module.exports = config;
