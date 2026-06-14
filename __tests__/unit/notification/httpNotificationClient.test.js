const createHttpNotificationClient = require("../../../modules/notification/httpNotificationClient");

describe("HttpNotificationClient", () => {
  let client;
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn();
    client = createHttpNotificationClient("http://localhost:3001");
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("sendConfirmation", () => {
    it("sends POST request to confirmation endpoint", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await client.sendConfirmation("user@example.com", "token-123");

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:3001/api/notifications/confirmation",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "user@example.com",
            confirmToken: "token-123",
          }),
        },
      );
    });

    it("throws on non-OK response", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: "Server error" }),
      });

      await expect(
        client.sendConfirmation("user@example.com", "token-123"),
      ).rejects.toThrow("Server error");
    });
  });

  describe("sendReleaseNotification", () => {
    it("sends POST request to release endpoint", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await client.sendReleaseNotification(
        "user@example.com",
        "owner/repo",
        "v1.0.0",
        "https://github.com/owner/repo/releases/tag/v1.0.0",
        "unsub-token",
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:3001/api/notifications/release",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "user@example.com",
            repo: "owner/repo",
            tagName: "v1.0.0",
            htmlUrl: "https://github.com/owner/repo/releases/tag/v1.0.0",
            unsubscribeToken: "unsub-token",
          }),
        },
      );
    });
  });
});
