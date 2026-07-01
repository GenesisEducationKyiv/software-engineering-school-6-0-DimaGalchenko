const createNodemailerSender = (transporter) => ({
  send: ({ from, to, subject, html }) =>
    transporter.sendMail({ from, to, subject, html }),
});

module.exports = createNodemailerSender;
