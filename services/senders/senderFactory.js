const nodemailer = require("nodemailer");
const createNodemailerSender = require("./nodemailerSender");
const createResendSender = require("./resendSender");

const providers = {
  resend: (config) => createResendSender(config.email.resendApiKey),
  nodemailer: (config) => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
    return createNodemailerSender(transporter);
  },
};

const createSender = (config) => {
  const provider = config.email.provider;
  const factory = providers[provider];

  if (!factory) {
    throw new Error(`Unknown email provider: ${provider}`);
  }

  return factory(config);
};

module.exports = createSender;
