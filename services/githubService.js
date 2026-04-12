const { NotFoundError, RateLimitError } = require("../utils/errors");

const createGithubService = ({ config, cacheService }) => {
  const buildHeaders = () => {
    const headers = { "Accept": "application/vnd.github.v3+json" };
    if (config.github.token) {
      headers["Authorization"] = `Bearer ${config.github.token}`;
    }
    return headers;
  };

  const handleRateLimit = (response) => {
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("retry-after"), 10) || 60;
      throw new RateLimitError(retryAfter);
    }
  };

  const validateRepository = async (repo) => {
    const cacheKey = `github:repo:${repo}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return true;
    }

    const response = await fetch(`${config.github.apiBase}/repos/${repo}`, {
      headers: buildHeaders(),
    });

    handleRateLimit(response);

    if (response.status === 404) {
      throw new NotFoundError("Repository not found on GitHub");
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    await cacheService.set(cacheKey, true);

    return true;
  };

  const fetchReleases = async (repo) => {
    const response = await fetch(`${config.github.apiBase}/repos/${repo}/releases?per_page=100`, {
      headers: buildHeaders(),
    });

    handleRateLimit(response);

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    return data.map((release) => ({ tagName: release.tag_name, htmlUrl: release.html_url }));
  };

  return { validateRepository, fetchReleases };
};

module.exports = createGithubService;
