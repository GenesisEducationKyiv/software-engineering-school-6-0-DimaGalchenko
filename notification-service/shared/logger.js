const createLogger = () => ({
  info: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
});

module.exports = createLogger;
