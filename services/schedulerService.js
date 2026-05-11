const cron = require("node-cron");

const createSchedulerService = () => {
  let task = null;

  const start = (cronExpression, taskFn) => {
    taskFn();
    task = cron.schedule(cronExpression, taskFn);
  };

  const stop = () => {
    if (task) {
      task.stop();
      task = null;
    }
  };

  return { start, stop };
};

module.exports = createSchedulerService;
