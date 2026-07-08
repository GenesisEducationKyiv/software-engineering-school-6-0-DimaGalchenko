const { Router } = require("express");

const createInternalRoutes = (subscriptionRepository) => {
  const router = Router();

  router.get("/repos", async (_req, res, next) => {
    try {
      const repos = await subscriptionRepository.findDistinctConfirmedRepos();
      res.json({ repos });
    } catch (err) {
      next(err);
    }
  });

  return router;
};

module.exports = createInternalRoutes;
