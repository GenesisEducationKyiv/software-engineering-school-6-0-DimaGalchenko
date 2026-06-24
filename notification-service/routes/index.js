const { Router } = require("express");

const createRoutes = (emailService) => {
  const router = Router();

  router.post("/notifications/send", async (req, res) => {
    const { templateId, data } = req.body;
    await emailService.send(templateId, data.email, data);
    res.json({ success: true, message: "Notification sent" });
  });

  return router;
};

module.exports = createRoutes;
