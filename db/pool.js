const { Pool } = require("pg");

const createPool = (connectionString) => new Pool({ connectionString });

module.exports = createPool;
