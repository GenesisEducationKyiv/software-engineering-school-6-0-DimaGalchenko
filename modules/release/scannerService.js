const { RateLimitError } = require("../../shared/errors");
const { getMissedReleases } = require("./releaseComparer");

const createScannerService = ({
  subscriptionRepository,
  githubService,
  notificationClient,
  logger,
}) => {
  let scanning = false;

  const processRepo = async (repo) => {
    const releases = await githubService.fetchReleases(repo);

    if (releases.length === 0) {
      return;
    }

    const subscribers = await subscriptionRepository.findConfirmedByRepo(repo);

    for (const subscriber of subscribers) {
      const missed = getMissedReleases(releases, subscriber.last_seen_tag);

      // Advance last_seen_tag only through releases that were actually
      // notified, so a notification outage retries them on the next scan.
      let lastNotifiedTag = null;

      for (const release of missed) {
        try {
          await notificationClient.send("release", {
            email: subscriber.email,
            repo,
            tagName: release.tagName,
            htmlUrl: release.htmlUrl,
            unsubscribeToken: subscriber.unsubscribe_token,
          });
          lastNotifiedTag = release.tagName;
        } catch (err) {
          logger.error(
            `Failed to notify ${subscriber.email} for ${repo}: ${err.message}`,
          );
          break;
        }
      }

      if (lastNotifiedTag) {
        await subscriptionRepository.updateLastSeenTagById(
          subscriber.id,
          lastNotifiedTag,
        );
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
            logger.error(
              `Rate limited. Pausing scan. Retry after ${err.retryAfter}s`,
            );
            return;
          }
          logger.error(`Error scanning ${repo}: ${err.message}`);
        }
      }
    } finally {
      scanning = false;
    }
  };

  return { scan, processRepo };
};

module.exports = createScannerService;
