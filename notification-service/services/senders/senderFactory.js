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

const validators = {
  resend: (emailConfig) => {
    if (!emailConfig.resendApiKey)
      throw new Error("Resend provider requires RESEND_API_KEY");
  },
  nodemailer: (emailConfig) => {
    if (!emailConfig.user || !emailConfig.pass)
      throw new Error("Nodemailer provider requires EMAIL_USER and EMAIL_PASS");
  },
};

const createSender = (emailConfig) => {
  const factory = providers[emailConfig.provider];

  if (!factory) {
    throw new Error(`Unknown email provider: ${emailConfig.provider}`);
  }

  validators[emailConfig.provider]?.(emailConfig);

  return factory(emailConfig);
};

module.exports = createSender;
