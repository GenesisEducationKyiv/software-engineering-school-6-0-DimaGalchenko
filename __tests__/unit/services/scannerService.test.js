const createScannerService = require("../../../services/scannerService");
const { RateLimitError } = require("../../../utils/errors");

const createMockDependencies = () => ({
  subscriptionRepository: {
    findDistinctConfirmedRepos: jest.fn(),
    findConfirmedByRepo: jest.fn(),
    updateLastSeenTag: jest.fn(),
    updateLastSeenTagById: jest.fn(),
  },
  githubService: {
    fetchReleases: jest.fn(),
  },
  emailService: {
    sendReleaseNotification: jest.fn().mockResolvedValue(undefined),
  },
});

describe("ScannerService", () => {
  let scanner;
  let deps;

  beforeEach(() => {
    deps = createMockDependencies();
    scanner = createScannerService(deps);
  });

  describe("scan", () => {
    it("fetches releases for each confirmed repo", async () => {
      deps.subscriptionRepository.findDistinctConfirmedRepos.mockResolvedValue(["owner/repo1", "owner/repo2"]);
      deps.githubService.fetchReleases.mockResolvedValue([]);

      await scanner.scan();

      expect(deps.githubService.fetchReleases).toHaveBeenCalledWith("owner/repo1");
      expect(deps.githubService.fetchReleases).toHaveBeenCalledWith("owner/repo2");
    });

    it("skips repos with no releases", async () => {
      deps.subscriptionRepository.findDistinctConfirmedRepos.mockResolvedValue(["owner/repo"]);
      deps.githubService.fetchReleases.mockResolvedValue([]);

      await scanner.scan();

      expect(deps.subscriptionRepository.findConfirmedByRepo).not.toHaveBeenCalled();
    });

    it("notifies subscribers when tag changes", async () => {
      deps.subscriptionRepository.findDistinctConfirmedRepos.mockResolvedValue(["owner/repo"]);
      deps.githubService.fetchReleases.mockResolvedValue([
        { tagName: "v2.0.0", htmlUrl: "https://github.com/owner/repo/releases/tag/v2.0.0" },
        { tagName: "v1.0.0", htmlUrl: "https://github.com/owner/repo/releases/tag/v1.0.0" },
      ]);
      deps.subscriptionRepository.findConfirmedByRepo.mockResolvedValue([
        { id: 1, email: "user@example.com", last_seen_tag: "v1.0.0", unsubscribe_token: "unsub-1" },
      ]);

      await scanner.scan();

      expect(deps.emailService.sendReleaseNotification).toHaveBeenCalledWith(
        "user@example.com",
        "owner/repo",
        "v2.0.0",
        "https://github.com/owner/repo/releases/tag/v2.0.0",
        "unsub-1"
      );
      expect(deps.subscriptionRepository.updateLastSeenTagById).toHaveBeenCalledWith(1, "v2.0.0");
    });

    it("notifies when last_seen_tag is null (first scan)", async () => {
      deps.subscriptionRepository.findDistinctConfirmedRepos.mockResolvedValue(["owner/repo"]);
      deps.githubService.fetchReleases.mockResolvedValue([
        { tagName: "v2.0.0", htmlUrl: "url-v2" },
        { tagName: "v1.0.0", htmlUrl: "url-v1" },
      ]);
      deps.subscriptionRepository.findConfirmedByRepo.mockResolvedValue([
        { id: 1, email: "user@example.com", last_seen_tag: null, unsubscribe_token: "unsub-1" },
      ]);

      await scanner.scan();

      expect(deps.emailService.sendReleaseNotification).toHaveBeenCalledTimes(1);
      expect(deps.emailService.sendReleaseNotification).toHaveBeenCalledWith(
        "user@example.com",
        "owner/repo",
        "v2.0.0",
        "url-v2",
        "unsub-1"
      );
      expect(deps.subscriptionRepository.updateLastSeenTagById).toHaveBeenCalledWith(1, "v2.0.0");
    });

    it("does not notify when tag has not changed", async () => {
      deps.subscriptionRepository.findDistinctConfirmedRepos.mockResolvedValue(["owner/repo"]);
      deps.githubService.fetchReleases.mockResolvedValue([
        { tagName: "v1.0.0", htmlUrl: "url" },
      ]);
      deps.subscriptionRepository.findConfirmedByRepo.mockResolvedValue([
        { email: "user@example.com", last_seen_tag: "v1.0.0", unsubscribe_token: "unsub-1" },
      ]);

      await scanner.scan();

      expect(deps.emailService.sendReleaseNotification).not.toHaveBeenCalled();
    });

    it("stops scanning on rate limit error", async () => {
      deps.subscriptionRepository.findDistinctConfirmedRepos.mockResolvedValue(["owner/repo1", "owner/repo2"]);
      deps.githubService.fetchReleases
        .mockRejectedValueOnce(new RateLimitError(60))
        .mockResolvedValueOnce([{ tagName: "v1.0.0", htmlUrl: "url" }]);

      await scanner.scan();

      expect(deps.githubService.fetchReleases).toHaveBeenCalledTimes(1);
    });

    it("continues scanning other repos on non-rate-limit errors", async () => {
      deps.subscriptionRepository.findDistinctConfirmedRepos.mockResolvedValue(["owner/repo1", "owner/repo2"]);
      deps.githubService.fetchReleases
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce([]);

      await scanner.scan();

      expect(deps.githubService.fetchReleases).toHaveBeenCalledTimes(2);
    });

    it("continues notifying other subscribers when one email fails", async () => {
      deps.subscriptionRepository.findDistinctConfirmedRepos.mockResolvedValue(["owner/repo"]);
      deps.githubService.fetchReleases.mockResolvedValue([
        { tagName: "v2.0.0", htmlUrl: "url" },
        { tagName: "v1.0.0", htmlUrl: "url-old" },
      ]);
      deps.subscriptionRepository.findConfirmedByRepo.mockResolvedValue([
        { id: 1, email: "fail@example.com", last_seen_tag: "v1.0.0", unsubscribe_token: "unsub-1" },
        { id: 2, email: "success@example.com", last_seen_tag: "v1.0.0", unsubscribe_token: "unsub-2" },
      ]);
      deps.emailService.sendReleaseNotification
        .mockRejectedValueOnce(new Error("SMTP error"))
        .mockResolvedValueOnce(undefined);

      await scanner.scan();

      expect(deps.emailService.sendReleaseNotification).toHaveBeenCalledTimes(2);
      expect(deps.subscriptionRepository.updateLastSeenTagById).toHaveBeenCalledWith(2, "v2.0.0");
    });

    it("skips scan if previous scan is still running", async () => {
      let resolveFirst;
      deps.subscriptionRepository.findDistinctConfirmedRepos.mockImplementationOnce(
        () => new Promise((resolve) => { resolveFirst = resolve; })
      );
      deps.subscriptionRepository.findDistinctConfirmedRepos.mockResolvedValue([]);

      const first = scanner.scan();
      const second = scanner.scan();

      resolveFirst([]);
      await first;
      await second;

      expect(deps.subscriptionRepository.findDistinctConfirmedRepos).toHaveBeenCalledTimes(1);
    });

    it("notifies for all missed releases in chronological order", async () => {
      deps.subscriptionRepository.findDistinctConfirmedRepos.mockResolvedValue(["owner/repo"]);
      deps.githubService.fetchReleases.mockResolvedValue([
        { tagName: "v3.0.0", htmlUrl: "url-v3" },
        { tagName: "v2.0.0", htmlUrl: "url-v2" },
        { tagName: "v1.0.0", htmlUrl: "url-v1" },
      ]);
      deps.subscriptionRepository.findConfirmedByRepo.mockResolvedValue([
        { id: 1, email: "user@example.com", last_seen_tag: "v1.0.0", unsubscribe_token: "unsub-1" },
      ]);

      await scanner.scan();

      expect(deps.emailService.sendReleaseNotification).toHaveBeenCalledTimes(2);
      expect(deps.emailService.sendReleaseNotification).toHaveBeenNthCalledWith(
        1, "user@example.com", "owner/repo", "v2.0.0", "url-v2", "unsub-1"
      );
      expect(deps.emailService.sendReleaseNotification).toHaveBeenNthCalledWith(
        2, "user@example.com", "owner/repo", "v3.0.0", "url-v3", "unsub-1"
      );
      expect(deps.subscriptionRepository.updateLastSeenTagById).toHaveBeenCalledWith(1, "v3.0.0");
    });
  });
});
