const { Resend } = require("resend");
const logger = require("../../shared/logger");

const createResendSender = (apiKey) => {
  const resend = new Resend(apiKey);

  return {
    send: async ({ from, to, subject, html }) => {
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        html,
      });
      if (error) {
        throw new Error(`Resend error: ${error.message}`);
      }
      logger.info(`[email] sent via resend to ${to} | id: ${data.id}`);
    },
  };
};

module.exports = createResendSender;
