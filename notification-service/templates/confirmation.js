const { wrapEmail } = require("./layout");

module.exports = {
  subject: "Confirm your subscription",
  enrich: ({ confirmToken }, linkBuilder) => ({
    confirmUrl: linkBuilder.confirmUrl(confirmToken),
  }),
  html: wrapEmail(`
        <h2 style="color:#f0f6fc;margin:0 0 8px;font-size:20px;">Confirm Your Subscription</h2>
        <p style="color:#8b949e;margin:0 0 24px;font-size:14px;">Click the button below to start receiving release notifications.</p>
        <a href="{{confirmUrl}}" style="display:inline-block;padding:10px 24px;background:#238636;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Confirm Subscription</a>
        <p style="color:#484f58;margin-top:24px;font-size:12px;">Or copy this link: {{confirmUrl}}</p>`),
};
