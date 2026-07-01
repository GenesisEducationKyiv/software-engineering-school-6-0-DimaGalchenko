const createCacheService = (redisClient, { ttl: defaultTtl = 600 } = {}) => {
  const get = async (key) => {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (_err) {
      return null;
    }
  };

  const set = async (key, value, ttl = defaultTtl) => {
    await redisClient.set(key, JSON.stringify(value), "EX", ttl);
  };

  return { get, set };
};

const createNullCacheService = () => ({
  get: () => Promise.resolve(null),
  set: () => Promise.resolve(),
});

module.exports = { createCacheService, createNullCacheService };
