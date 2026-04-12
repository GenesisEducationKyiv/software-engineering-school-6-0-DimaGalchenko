const EMAIL_WRAPPER_START = `
<div style="background:#0d1117;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#161b22;border:1px solid #30363d;border-radius:8px;padding:32px;">`;

const EMAIL_WRAPPER_END = `
  </div>
  <p style="text-align:center;margin-top:16px;font-size:12px;color:#484f58;">GitHub Release Notifications</p>
</div>`;

const createEmailService = ({ sender, config }) => {
  const sendConfirmation = async (email, confirmToken) => {
    const confirmUrl = `${config.baseUrl}/confirm/${confirmToken}`;

    await sender.send({
      from: config.email.from,
      to: email,
      subject: "Confirm your subscription",
      html: `${EMAIL_WRAPPER_START}
        <h2 style="color:#f0f6fc;margin:0 0 8px;font-size:20px;">Confirm Your Subscription</h2>
        <p style="color:#8b949e;margin:0 0 24px;font-size:14px;">Click the button below to start receiving release notifications.</p>
        <a href="${confirmUrl}" style="display:inline-block;padding:10px 24px;background:#238636;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Confirm Subscription</a>
        <p style="color:#484f58;margin-top:24px;font-size:12px;">Or copy this link: ${confirmUrl}</p>
      ${EMAIL_WRAPPER_END}`,
    });
  };

  const sendReleaseNotification = async (email, repo, tagName, htmlUrl, unsubscribeToken) => {
    const unsubscribeUrl = `${config.baseUrl}/unsubscribe/${unsubscribeToken}`;

    await sender.send({
      from: config.email.from,
      to: email,
      subject: `New release ${tagName} for ${repo}`,
      html: `${EMAIL_WRAPPER_START}
        <h2 style="color:#f0f6fc;margin:0 0 8px;font-size:20px;">New Release Available</h2>
        <p style="color:#8b949e;margin:0 0 16px;font-size:14px;">A new release has been published.</p>
        <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:16px;margin-bottom:24px;">
          <p style="color:#58a6ff;font-weight:600;margin:0 0 4px;font-size:15px;">${repo}</p>
          <p style="color:#f0f6fc;margin:0;font-size:18px;font-weight:600;">${tagName}</p>
        </div>
        <a href="${htmlUrl}" style="display:inline-block;padding:10px 24px;background:#238636;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">View on GitHub</a>
        <hr style="border:none;border-top:1px solid #30363d;margin:24px 0 16px;">
        <p style="margin:0;font-size:12px;color:#484f58;"><a href="${unsubscribeUrl}" style="color:#484f58;">Unsubscribe</a> from ${repo} notifications</p>
      ${EMAIL_WRAPPER_END}`,
    });
  };

  return { sendConfirmation, sendReleaseNotification };
};

module.exports = createEmailService;
