const {
  createCacheService,
  createNullCacheService,
} = require("../../../services/cacheService");

const createMockRedis = () => ({
  get: jest.fn(),
  set: jest.fn(),
});

describe("CacheService", () => {
  let cacheService;
  let mockRedis;

  beforeEach(() => {
    mockRedis = createMockRedis();
    cacheService = createCacheService(mockRedis);
  });

  describe("get", () => {
    it("returns parsed JSON when key exists", async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ tagName: "v1.0.0" }));

      const result = await cacheService.get("test-key");

      expect(result).toEqual({ tagName: "v1.0.0" });
      expect(mockRedis.get).toHaveBeenCalledWith("test-key");
    });

    it("returns null when key does not exist", async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.get("missing-key");

      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("stores JSON-stringified value with default TTL", async () => {
      await cacheService.set("test-key", { data: true });

      expect(mockRedis.set).toHaveBeenCalledWith(
        "test-key",
        JSON.stringify({ data: true }),
        "EX",
        600,
      );
    });

    it("stores value with custom TTL", async () => {
      await cacheService.set("test-key", "value", 120);

      expect(mockRedis.set).toHaveBeenCalledWith(
        "test-key",
        JSON.stringify("value"),
        "EX",
        120,
      );
    });
  });

  describe("NullCacheService", () => {
    it("always returns null on get", async () => {
      const nullCache = createNullCacheService();
      const result = await nullCache.get("any-key");
      expect(result).toBeNull();
    });

    it("does nothing on set", async () => {
      const nullCache = createNullCacheService();
      await expect(nullCache.set("key", "value")).resolves.toBeUndefined();
    });
  });
});
