const { Resend } = require("resend");

const createResendSender = (apiKey) => {
  const resend = new Resend(apiKey);

  return {
    send: ({ from, to, subject, html }) =>
      resend.emails.send({ from, to, subject, html }),
  };
};

module.exports = createResendSender;
