const wrapEmail = (content) => `
<div style="background:#0d1117;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#161b22;border:1px solid #30363d;border-radius:8px;padding:32px;">
${content}
  </div>
  <p style="text-align:center;margin-top:16px;font-size:12px;color:#484f58;">GitHub Release Notifications</p>
</div>`;

module.exports = { wrapEmail };
