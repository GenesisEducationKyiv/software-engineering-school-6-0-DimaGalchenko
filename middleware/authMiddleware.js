const createAuthMiddleware = (apiKey) => {
  if (!apiKey) {
    return (_req, _res, next) => next();
  }

  return (req, res, next) => {
    const provided = req.headers["x-api-key"];

    if (!provided) {
      res.status(401).json({ message: "Missing API key" });
      return;
    }

    if (provided !== apiKey) {
      res.status(401).json({ message: "Invalid API key" });
      return;
    }

    next();
  };
};

module.exports = createAuthMiddleware;
