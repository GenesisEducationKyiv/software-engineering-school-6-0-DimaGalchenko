const logger = require("../shared/logger");

const errorHandler = (err, _req, res, _next) => {
  logger.error(err);
  res.status(500).json({ success: false, message: "Internal server error" });
};

module.exports = errorHandler;
