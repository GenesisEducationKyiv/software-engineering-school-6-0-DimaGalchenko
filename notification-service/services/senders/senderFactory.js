const nodemailer = require("nodemailer");
const createNodemailerSender = require("./nodemailerSender");
const createResendSender = require("./resendSender");
const createConsoleSender = require("./consoleSender");
const logger = require("../../shared/logger");

const providers = {
  resend: (emailConfig) => createResendSender(emailConfig.resendApiKey),
  nodemailer: (emailConfig) => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
    });
    return createNodemailerSender(transporter);
  },
  console: () => createConsoleSender(),
};

const resolveProvider = (emailConfig) => {
  if (emailConfig.provider) return emailConfig.provider;
  if (emailConfig.resendApiKey) return "resend";
  if (emailConfig.user && emailConfig.pass) return "nodemailer";
  return "console";
};

const createSender = (emailConfig) => {
  const provider = resolveProvider(emailConfig);
  const factory = providers[provider];

  if (!factory) {
    throw new Error(`Unknown email provider: ${provider}`);
  }

  if (provider !== "console") {
    logger.info(`[email] using provider: ${provider}`);
  } else {
    logger.warn(
      "[email] no credentials configured — emails will be logged to console only",
    );
  }

  return factory(emailConfig);
};

module.exports = createSender;
