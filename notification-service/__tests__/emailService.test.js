const createEmailService = require("../services/emailService");
const createEmailLinkBuilder = require("../services/emailLinkBuilder");

const createMockSender = () => ({
  send: jest.fn().mockResolvedValue(undefined),
});

describe("EmailService (notification-service)", () => {
  let emailService;
  let mockSender;

  beforeEach(() => {
    mockSender = createMockSender();
    const linkBuilder = createEmailLinkBuilder("http://localhost:3000");
    emailService = createEmailService({
      sender: mockSender,
      emailFrom: "noreply@example.com",
      linkBuilder,
    });
  });

  describe("send", () => {
    it("sends confirmation email with correct subject and link", async () => {
      await emailService.send("confirmation", "user@example.com", {
        confirmToken: "token-abc",
      });

      expect(mockSender.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "noreply@example.com",
          to: "user@example.com",
          subject: "Confirm your subscription",
        }),
      );

      const html = mockSender.send.mock.calls[0][0].html;
      expect(html).toContain("http://localhost:3000/confirm/token-abc");
    });

    it("sends release email with correct subject and data", async () => {
      await emailService.send("release", "user@example.com", {
        repo: "owner/repo",
        tagName: "v2.0.0",
        htmlUrl: "https://github.com/owner/repo/releases/tag/v2.0.0",
        unsubscribeToken: "unsub-token",
      });

      expect(mockSender.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "noreply@example.com",
          to: "user@example.com",
          subject: "v2.0.0 released for owner/repo",
        }),
      );

      const html = mockSender.send.mock.calls[0][0].html;
      expect(html).toContain("owner/repo");
      expect(html).toContain("v2.0.0");
      expect(html).toContain("http://localhost:3000/unsubscribe/unsub-token");
    });

    it("throws for unknown templateId", async () => {
      await expect(
        emailService.send("unknown", "user@example.com", {}),
      ).rejects.toThrow("Unknown template: unknown");
    });
  });
});
