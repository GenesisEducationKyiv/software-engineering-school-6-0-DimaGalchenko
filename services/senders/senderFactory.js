const nodemailer = require("nodemailer");
const createNodemailerSender = require("./nodemailerSender");
const createResendSender = require("./resendSender");

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
};

const createSender = (emailConfig) => {
  const factory = providers[emailConfig.provider];

  if (!factory) {
    throw new Error(`Unknown email provider: ${emailConfig.provider}`);
  }

  return factory(emailConfig);
};

module.exports = createSender;
