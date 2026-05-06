const crypto = require("crypto");

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

    const providedBuf = Buffer.from(provided);
    const expectedBuf = Buffer.from(apiKey);

    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      res.status(401).json({ message: "Invalid API key" });
      return;
    }

    next();
  };
};

module.exports = createAuthMiddleware;
