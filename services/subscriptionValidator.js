const { ValidationError } = require("../utils/errors");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REPO_REGEX = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

const validateEmail = (email) => {
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new ValidationError("Invalid email address");
  }
};

const validateRepo = (repo) => {
  if (!repo || !REPO_REGEX.test(repo)) {
    throw new ValidationError(
      "Invalid repository format. Expected: owner/repo",
    );
  }
};

const validateToken = (token) => {
  if (!token) {
    throw new ValidationError("Invalid token");
  }
};

module.exports = { validateEmail, validateRepo, validateToken };
