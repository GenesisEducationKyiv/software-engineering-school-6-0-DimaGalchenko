const { Router } = require("express");

const createRoutes = (emailService) => {
  const router = Router();

  router.post("/notifications/confirmation", async (req, res) => {
    const { email, confirmToken } = req.body;
    await emailService.sendConfirmation(email, confirmToken);
    res.json({ success: true, message: "Confirmation email sent" });
  });

  router.post("/notifications/release", async (req, res) => {
    const { email, repo, tagName, htmlUrl, unsubscribeToken } = req.body;
    await emailService.sendReleaseNotification(
      email,
      repo,
      tagName,
      htmlUrl,
      unsubscribeToken,
    );
    res.json({ success: true, message: "Release notification sent" });
  });

  return router;
};

module.exports = createRoutes;
