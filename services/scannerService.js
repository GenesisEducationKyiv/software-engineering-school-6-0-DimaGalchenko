const cron = require("node-cron");
const { RateLimitError } = require("../utils/errors");

const createScannerService = ({ subscriptionRepository, githubService, emailService }) => {
  let task = null;
  let scanning = false;

  const getMissedReleases = (releases, lastSeenTag) => {
    if (!lastSeenTag) {
      return releases.length > 0 ? [releases[0]] : [];
    }

    const lastSeenIndex = releases.findIndex((r) => r.tagName === lastSeenTag);
    const newReleases = lastSeenIndex === -1 ? releases : releases.slice(0, lastSeenIndex);
    return newReleases.reverse();
  };

  const processRepo = async (repo) => {
    const releases = await githubService.fetchReleases(repo);

    if (releases.length === 0) {
      return;
    }

    const subscribers = await subscriptionRepository.findConfirmedByRepo(repo);

    for (const subscriber of subscribers) {
      const missed = getMissedReleases(releases, subscriber.last_seen_tag);

      for (const release of missed) {
        try {
          await emailService.sendReleaseNotification(
            subscriber.email,
            repo,
            release.tagName,
            release.htmlUrl,
            subscriber.unsubscribe_token
          );
        } catch (err) {
          console.error(`Failed to notify ${subscriber.email} for ${repo}: ${err.message}`);
        }
      }

      if (missed.length > 0) {
        await subscriptionRepository.updateLastSeenTagById(subscriber.id, releases[0].tagName);
      }
    }
  };

  const scan = async () => {
    if (scanning) {
      return;
    }

    scanning = true;

    try {
      const repos = await subscriptionRepository.findDistinctConfirmedRepos();

      for (const repo of repos) {
        try {
          await processRepo(repo);
        } catch (err) {
          if (err instanceof RateLimitError) {
            console.error(`Rate limited. Pausing scan. Retry after ${err.retryAfter}s`);
            return;
          }
          console.error(`Error scanning ${repo}: ${err.message}`);
        }
      }
    } finally {
      scanning = false;
    }
  };

  const start = (cronExpression) => {
    scan();
    task = cron.schedule(cronExpression, scan);
  };

  const stop = () => {
    if (task) {
      task.stop();
      task = null;
    }
  };

  return { scan, processRepo, start, stop };
};

module.exports = createScannerService;

