const createGithubService = require("../../../services/githubService");
const { NotFoundError, RateLimitError } = require("../../../utils/errors");

const createMockConfig = (token = "") => ({
  github: {
    token,
    apiBase: "https://api.github.com",
  },
});

const createMockCacheService = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
});

describe("GithubService", () => {
  let service;
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn();
    service = createGithubService({ config: createMockConfig(), cacheService: createMockCacheService() });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("validateRepository", () => {
    it("returns true when repository exists", async () => {
      global.fetch.mockResolvedValue({ status: 200, ok: true });

      const result = await service.validateRepository("owner/repo");

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/owner/repo",
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });

    it("throws NotFoundError when repository does not exist", async () => {
      global.fetch.mockResolvedValue({ status: 404, ok: false });

      await expect(service.validateRepository("owner/nonexistent"))
        .rejects.toThrow(NotFoundError);
    });

    it("throws RateLimitError on 429 response", async () => {
      global.fetch.mockResolvedValue({
        status: 429,
        ok: false,
        headers: { get: (name) => (name === "retry-after" ? "60" : null) },
      });

      await expect(service.validateRepository("owner/repo"))
        .rejects.toThrow(RateLimitError);
    });

    it("throws generic error on other non-OK responses", async () => {
      global.fetch.mockResolvedValue({ status: 500, ok: false, headers: { get: () => null } });

      await expect(service.validateRepository("owner/repo"))
        .rejects.toThrow("GitHub API error: 500");
    });

    it("includes Authorization header when token is configured", async () => {
      service = createGithubService({ config: createMockConfig("my-token"), cacheService: createMockCacheService() });
      global.fetch.mockResolvedValue({ status: 200, ok: true });

      await service.validateRepository("owner/repo");

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBe("Bearer my-token");
    });

    it("does not include Authorization header without token", async () => {
      global.fetch.mockResolvedValue({ status: 200, ok: true });

      await service.validateRepository("owner/repo");

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBeUndefined();
    });

    it("returns cached result without calling fetch", async () => {
      const mockCache = createMockCacheService();
      mockCache.get.mockResolvedValue(true);
      service = createGithubService({ config: createMockConfig(), cacheService: mockCache });

      const result = await service.validateRepository("owner/repo");

      expect(result).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("caches successful validation", async () => {
      const mockCache = createMockCacheService();
      service = createGithubService({ config: createMockConfig(), cacheService: mockCache });
      global.fetch.mockResolvedValue({ status: 200, ok: true });

      await service.validateRepository("owner/repo");

      expect(mockCache.set).toHaveBeenCalledWith("github:repo:owner/repo", true);
    });
  });

  describe("fetchReleases", () => {
    it("returns array of releases on success", async () => {
      global.fetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: () => Promise.resolve([
          { tag_name: "v2.0.0", html_url: "https://github.com/owner/repo/releases/tag/v2.0.0" },
          { tag_name: "v1.0.0", html_url: "https://github.com/owner/repo/releases/tag/v1.0.0" },
        ]),
      });

      const result = await service.fetchReleases("owner/repo");

      expect(result).toEqual([
        { tagName: "v2.0.0", htmlUrl: "https://github.com/owner/repo/releases/tag/v2.0.0" },
        { tagName: "v1.0.0", htmlUrl: "https://github.com/owner/repo/releases/tag/v1.0.0" },
      ]);
    });

    it("returns empty array when no releases exist", async () => {
      global.fetch.mockResolvedValue({ status: 404, ok: false, headers: { get: () => null } });

      const result = await service.fetchReleases("owner/repo");

      expect(result).toEqual([]);
    });

    it("throws RateLimitError on 429 response", async () => {
      global.fetch.mockResolvedValue({
        status: 429,
        ok: false,
        headers: { get: (name) => (name === "retry-after" ? "30" : null) },
      });

      await expect(service.fetchReleases("owner/repo"))
        .rejects.toThrow(RateLimitError);
    });

  });
});
