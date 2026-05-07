class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

class RateLimitError extends AppError {
  constructor(retryAfter) {
    super("GitHub API rate limit exceeded", 503);
    this.retryAfter = retryAfter;
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
};
