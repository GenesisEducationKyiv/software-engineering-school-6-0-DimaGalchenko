const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/release_notifier",
  baseUrl: process.env.BASE_URL || "http://localhost:3000",
  github: {
    token: process.env.GITHUB_TOKEN || "",
    apiBase: "https://api.github.com",
  },
  email: {
    provider: process.env.EMAIL_PROVIDER || "nodemailer",
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || "",
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
    resendApiKey: process.env.RESEND_API_KEY || "",
  },
  scanCron: process.env.SCAN_CRON || "*/1 * * * *",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  apiKey: process.env.API_KEY || "",
  grpcPort: parseInt(process.env.GRPC_PORT, 10) || 50051,
  cacheTtl: parseInt(process.env.CACHE_TTL, 10) || 600,
};

module.exports = config;
