const { z } = require("zod");
const { ValidationError } = require("../utils/errors");

const emailSchema = z.string().email();
const uuidSchema = z.string().uuid();
const REPO_REGEX = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

const validateEmail = (email) => {
  if (!emailSchema.safeParse(email).success) {
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
  if (!uuidSchema.safeParse(token).success) {
    throw new ValidationError("Invalid token");
  }
};

module.exports = { validateEmail, validateRepo, validateToken };
