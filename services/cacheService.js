const CACHE_TTL = parseInt(process.env.CACHE_TTL, 10) || 600;

const createCacheService = (redisClient) => {
  const get = async (key) => {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (_err) {
      return null;
    }
  };

  const set = async (key, value, ttl = CACHE_TTL) => {
    try {
      await redisClient.set(key, JSON.stringify(value), "EX", ttl);
    } catch (_err) {
    }
  };

  return { get, set };
};

const createNullCacheService = () => ({
  get: () => Promise.resolve(null),
  set: () => Promise.resolve(),
});

module.exports = { createCacheService, createNullCacheService };
