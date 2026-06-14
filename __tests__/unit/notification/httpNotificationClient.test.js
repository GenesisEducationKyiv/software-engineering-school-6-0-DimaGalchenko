const createHttpNotificationClient = require("../../../clients/notification/httpNotificationClient");

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

  describe("send", () => {
    it("sends POST to /api/notifications/send with templateId and data", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await client.send("confirmation", {
        email: "user@example.com",
        confirmToken: "token-123",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:3001/api/notifications/send",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: "confirmation",
            data: { email: "user@example.com", confirmToken: "token-123" },
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
        client.send("confirmation", {
          email: "user@example.com",
          confirmToken: "token-123",
        }),
      ).rejects.toThrow("Server error");
    });
  });
});
