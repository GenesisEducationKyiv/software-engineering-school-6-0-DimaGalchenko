const { Router } = require("express");

const createRoutes = (emailService) => {
  const router = Router();

  router.post("/notifications/send", async (req, res) => {
    const { templateId, email, data } = req.body ?? {};

    if (typeof templateId !== "string" || templateId.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "templateId is required" });
    }
    if (typeof email !== "string" || email.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "email is required" });
    }

    const payload = data && typeof data === "object" ? data : {};
    await emailService.send(templateId, email, { ...payload, email });
    res.json({ success: true, message: "Notification sent" });
  });

  return router;
};

module.exports = createRoutes;
