const {
  renderConfirmationEmail,
  renderReleaseNotificationEmail,
} = require("./emailTemplates");

const createEmailService = ({ sender, config }) => {
  const sendConfirmation = async (email, confirmToken) => {
    const confirmUrl = `${config.baseUrl}/confirm/${confirmToken}`;

    await sender.send({
      from: config.email.from,
      to: email,
      subject: "Confirm your subscription",
      html: renderConfirmationEmail(confirmUrl),
    });
  };

  const sendReleaseNotification = async (
    email,
    repo,
    tagName,
    htmlUrl,
    unsubscribeToken,
  ) => {
    const unsubscribeUrl = `${config.baseUrl}/unsubscribe/${unsubscribeToken}`;

    await sender.send({
      from: config.email.from,
      to: email,
      subject: `New release ${tagName} for ${repo}`,
      html: renderReleaseNotificationEmail({
        repo,
        tagName,
        htmlUrl,
        unsubscribeUrl,
      }),
    });
  };

  return { sendConfirmation, sendReleaseNotification };
};

module.exports = createEmailService;
