const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  grpcPort: parseInt(process.env.GRPC_PORT, 10) || 50052,
  baseUrl: process.env.BASE_URL || "http://localhost:3000",
  email: {
    provider: process.env.EMAIL_PROVIDER || "",
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || "",
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
    resendApiKey: process.env.RESEND_API_KEY || "",
  },
};

module.exports = config;
