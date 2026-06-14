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

  describe("sendConfirmation", () => {
    it("sends confirmation email with correct link", async () => {
      await emailService.sendConfirmation("user@example.com", "token-abc");

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
  });

  describe("sendReleaseNotification", () => {
    it("sends release email with correct data", async () => {
      await emailService.sendReleaseNotification(
        "user@example.com",
        "owner/repo",
        "v2.0.0",
        "https://github.com/owner/repo/releases/tag/v2.0.0",
        "unsub-token",
      );

      expect(mockSender.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "noreply@example.com",
          to: "user@example.com",
          subject: "New release v2.0.0 for owner/repo",
        }),
      );

      const html = mockSender.send.mock.calls[0][0].html;
      expect(html).toContain("owner/repo");
      expect(html).toContain("v2.0.0");
      expect(html).toContain("http://localhost:3000/unsubscribe/unsub-token");
    });
  });
});
