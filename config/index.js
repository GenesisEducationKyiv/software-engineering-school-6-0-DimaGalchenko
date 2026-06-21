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
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  apiKey: process.env.API_KEY || "",
  grpcPort: parseInt(process.env.GRPC_PORT, 10) || 50051,
  cacheTtl: parseInt(process.env.CACHE_TTL, 10) || 600,
  kafkaBroker: process.env.KAFKA_BROKER || "localhost:9092",
};

module.exports = config;
