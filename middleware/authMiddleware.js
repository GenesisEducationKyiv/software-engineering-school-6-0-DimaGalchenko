const createAuthMiddleware = (apiKey) => {
  if (!apiKey) {
    return (_req, _res, next) => next();
  }

  return (req, res, next) => {
    const provided = req.headers["x-api-key"];

    if (!provided) {
      return res.status(401).json({ message: "Missing API key" });
    }

    if (provided !== apiKey) {
      return res.status(401).json({ message: "Invalid API key" });
    }

    next();
  };
};

module.exports = createAuthMiddleware;
