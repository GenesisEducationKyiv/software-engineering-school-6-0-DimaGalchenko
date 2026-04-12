const CACHE_TTL = 600;

const createCacheService = (redisClient) => {
  const get = async (key) => {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  };

  const set = async (key, value, ttl = CACHE_TTL) => {
    await redisClient.set(key, JSON.stringify(value), "EX", ttl);
  };

  return { get, set };
};

const createNullCacheService = () => ({
  get: async () => null,
  set: async () => {},
});

module.exports = { createCacheService, createNullCacheService };
