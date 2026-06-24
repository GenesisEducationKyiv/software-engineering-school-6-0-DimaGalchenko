const { Router } = require("express");

const createSubscriptionRoutes = (subscriptionService) => {
  const router = Router();

  router.post("/subscribe", async (req, res) => {
    const { email, repo } = req.body;
    await subscriptionService.subscribe(email, repo);
    res
      .status(200)
      .json({ message: "Subscription successful. Confirmation email sent." });
  });

  router.get("/confirm/:token", async (req, res) => {
    await subscriptionService.confirm(req.params.token);
    res.status(200).json({ message: "Subscription confirmed successfully" });
  });

  router.get("/unsubscribe/:token", async (req, res) => {
    await subscriptionService.unsubscribe(req.params.token);
    res.status(200).json({ message: "Unsubscribed successfully" });
  });

  router.get("/subscriptions", async (req, res) => {
    const subscriptions = await subscriptionService.listByEmail(
      req.query.email,
    );
    res.status(200).json(subscriptions);
  });

  return router;
};

module.exports = createSubscriptionRoutes;
