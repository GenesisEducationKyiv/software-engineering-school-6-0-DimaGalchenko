const {
  renderConfirmationEmail,
  renderReleaseNotificationEmail,
} = require("./emailTemplates");

const createEmailService = ({ sender, emailFrom, linkBuilder }) => {
  const sendConfirmation = async (email, confirmToken) => {
    await sender.send({
      from: emailFrom,
      to: email,
      subject: "Confirm your subscription",
      html: renderConfirmationEmail(linkBuilder.confirmUrl(confirmToken)),
    });
  };

  const sendReleaseNotification = async (
    email,
    repo,
    tagName,
    htmlUrl,
    unsubscribeToken,
  ) => {
    await sender.send({
      from: emailFrom,
      to: email,
      subject: `New release ${tagName} for ${repo}`,
      html: renderReleaseNotificationEmail({
        repo,
        tagName,
        htmlUrl,
        unsubscribeUrl: linkBuilder.unsubscribeUrl(unsubscribeToken),
      }),
    });
  };

  return { sendConfirmation, sendReleaseNotification };
};

module.exports = createEmailService;
