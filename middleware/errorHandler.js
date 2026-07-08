const { AppError } = require("../shared/errors");

const createErrorHandler =
  (logger = console) =>
  (err, req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }

    logger.error("Unhandled error", {
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
    });
    res.status(500).json({ message: "Internal server error" });
  };

module.exports = createErrorHandler;
