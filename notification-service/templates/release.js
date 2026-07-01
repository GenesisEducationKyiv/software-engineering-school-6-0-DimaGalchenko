const { wrapEmail } = require("./layout");

module.exports = {
  subject: "{{tagName}} released for {{repo}}",
  enrich: ({ unsubscribeToken, ...rest }, linkBuilder) => ({
    ...rest,
    unsubscribeUrl: linkBuilder.unsubscribeUrl(unsubscribeToken),
  }),
  html: wrapEmail(`
        <h2 style="color:#f0f6fc;margin:0 0 8px;font-size:20px;">New Release Available</h2>
        <p style="color:#8b949e;margin:0 0 16px;font-size:14px;">A new release has been published.</p>
        <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:16px;margin-bottom:24px;">
          <p style="color:#58a6ff;font-weight:600;margin:0 0 4px;font-size:15px;">{{repo}}</p>
          <p style="color:#f0f6fc;margin:0;font-size:18px;font-weight:600;">{{tagName}}</p>
        </div>
        <a href="{{htmlUrl}}" style="display:inline-block;padding:10px 24px;background:#238636;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">View on GitHub</a>
        <hr style="border:none;border-top:1px solid #30363d;margin:24px 0 16px;">
        <p style="margin:0;font-size:12px;color:#484f58;"><a href="{{unsubscribeUrl}}" style="color:#484f58;">Unsubscribe</a> from {{repo}} notifications</p>`),
};
