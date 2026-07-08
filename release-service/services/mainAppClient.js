const createMainAppClient = ({ baseUrl, apiKey }) => {
  const headers = {
    "Content-Type": "application/json",
    ...(apiKey ? { "x-api-key": apiKey } : {}),
  };

  const getRepos = async () => {
    const res = await fetch(`${baseUrl}/api/internal/repos`, { headers });
    if (!res.ok) {
      throw new Error(
        `Main app API error ${res.status}: GET /api/internal/repos`,
      );
    }
    const data = await res.json();
    return data.repos;
  };

  return { getRepos };
};

module.exports = createMainAppClient;
