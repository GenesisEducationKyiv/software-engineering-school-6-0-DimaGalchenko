const crypto = require("crypto");

const generateToken = () => crypto.randomUUID();

module.exports = { generateToken };
