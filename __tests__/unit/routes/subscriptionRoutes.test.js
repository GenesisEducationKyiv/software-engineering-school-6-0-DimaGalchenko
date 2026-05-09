const request = require("supertest");
const createApp = require("../../../app");
const {
  NotFoundError,
  ConflictError,
  ValidationError,
} = require("../../../utils/errors");

const createMockSubscriptionService = () => ({
  subscribe: jest.fn().mockResolvedValue(undefined),
  confirm: jest.fn().mockResolvedValue(undefined),
  unsubscribe: jest.fn().mockResolvedValue(undefined),
  listByEmail: jest.fn().mockResolvedValue([]),
  listAllByEmail: jest.fn().mockResolvedValue([]),
});

describe("Subscription Routes", () => {
  let app;
  let mockService;

  beforeEach(() => {
    mockService = createMockSubscriptionService();
    app = createApp(mockService);
  });

  describe("POST /api/subscribe", () => {
    it("returns 200 on successful subscription", async () => {
      const res = await request(app)
        .post("/api/subscribe")
        .send({ email: "user@example.com", repo: "owner/repo" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe(
        "Subscription successful. Confirmation email sent.",
      );
    });

    it("returns 400 for invalid input", async () => {
      mockService.subscribe.mockRejectedValue(
        new ValidationError("Invalid email address"),
      );

      const res = await request(app)
        .post("/api/subscribe")
        .send({ email: "invalid", repo: "owner/repo" });

      expect(res.status).toBe(400);
    });

    it("returns 404 when repo not found", async () => {
      mockService.subscribe.mockRejectedValue(
        new NotFoundError("Repository not found on GitHub"),
      );

      const res = await request(app)
        .post("/api/subscribe")
        .send({ email: "user@example.com", repo: "owner/nonexistent" });

      expect(res.status).toBe(404);
    });

    it("returns 409 for duplicate subscription", async () => {
      mockService.subscribe.mockRejectedValue(
        new ConflictError("Email already subscribed"),
      );

      const res = await request(app)
        .post("/api/subscribe")
        .send({ email: "user@example.com", repo: "owner/repo" });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/confirm/:token", () => {
    it("returns 200 on successful confirmation", async () => {
      const res = await request(app).get("/api/confirm/valid-token");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Subscription confirmed successfully");
    });

    it("returns 404 for unknown token", async () => {
      mockService.confirm.mockRejectedValue(
        new NotFoundError("Token not found"),
      );

      const res = await request(app).get("/api/confirm/unknown-token");

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/unsubscribe/:token", () => {
    it("returns 200 on successful unsubscribe", async () => {
      const res = await request(app).get("/api/unsubscribe/valid-token");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Unsubscribed successfully");
    });

    it("returns 404 for unknown token", async () => {
      mockService.unsubscribe.mockRejectedValue(
        new NotFoundError("Token not found"),
      );

      const res = await request(app).get("/api/unsubscribe/unknown-token");

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/subscriptions", () => {
    it("returns 200 with subscriptions array", async () => {
      const subscriptions = [
        {
          email: "user@example.com",
          repo: "owner/repo",
          confirmed: true,
          last_seen_tag: "v1.0",
        },
      ];
      mockService.listByEmail.mockResolvedValue(subscriptions);

      const res = await request(app).get(
        "/api/subscriptions?email=user@example.com",
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual(subscriptions);
    });

    it("returns 400 for invalid email", async () => {
      mockService.listByEmail.mockRejectedValue(
        new ValidationError("Invalid email"),
      );

      const res = await request(app).get("/api/subscriptions?email=invalid");

      expect(res.status).toBe(400);
    });
  });
});
