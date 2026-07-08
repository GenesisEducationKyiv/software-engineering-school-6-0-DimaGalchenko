const createGithubService = require("./githubService");
const createScannerService = require("./scannerService");
const createSchedulerService = require("./schedulerService");
const createReleaseEventConsumer = require("./releaseEventConsumer");

module.exports = {
  createGithubService,
  createScannerService,
  createSchedulerService,
  createReleaseEventConsumer,
};
