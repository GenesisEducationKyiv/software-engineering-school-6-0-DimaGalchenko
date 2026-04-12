const request = require("supertest");
const { startDatabase, stopDatabase, truncateAll } = require("./setup/testDatabase");
const { buildApp } = require("./setup/testApp");
const { NotFoundError } = require("../../utils/errors");

jest.setTimeout(30000);

describe("Subscription Integration", () => {
  let pool;
  let app;
  let githubService;
  let emailService;

  beforeAll(async () => {
    pool = await startDatabase();
    const built = buildApp(pool);
    app = built.app;
    githubService = built.githubService;
    emailService = built.emailService;
  });

  beforeEach(async () => {
    await truncateAll();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await stopDatabase();
  });

  describe("POST /api/subscribe", () => {
    it("creates subscription in DB and sends confirmation email", async () => {
      const res = await request(app)
        .post("/api/subscribe")
        .send({ email: "test@example.com", repo: "owner/repo" });

      expect(res.status).toBe(200);
      expect(emailService.sendConfirmation).toHaveBeenCalledWith(
        "test@example.com",
        expect.any(String)
      );

      const { rows } = await pool.query(
        "SELECT * FROM subscriptions WHERE email = $1 AND repo = $2",
          ["test@example.com", "owner/repo"]
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].confirmed).toBe(false);
    });

    it("returns 400 for invalid email", async () => {
      const res = await request(app)
        .post("/api/subscribe")
        .send({ email: "invalid", repo: "owner/repo" });

      expect(res.status).toBe(400);

      const { rows } = await pool.query("SELECT * FROM subscriptions");
      expect(rows).toHaveLength(0);
    });

    it("returns 400 for invalid repo format", async () => {
      const res = await request(app)
        .post("/api/subscribe")
        .send({ email: "test@example.com", repo: "badrepo" });

      expect(res.status).toBe(400);

      const { rows } = await pool.query("SELECT * FROM subscriptions");
      expect(rows).toHaveLength(0);
    });

    it("returns 404 when GitHub repo not found", async () => {
      githubService.validateRepository.mockRejectedValueOnce(
        new NotFoundError("Repository not found on GitHub")
      );

      const res = await request(app)
        .post("/api/subscribe")
        .send({ email: "test@example.com", repo: "owner/nonexistent" });

      expect(res.status).toBe(404);
    });

    it("returns 409 for duplicate confirmed subscription", async () => {
      await request(app)
        .post("/api/subscribe")
        .send({ email: "test@example.com", repo: "owner/repo" });

      const { rows } = await pool.query(
        "SELECT confirm_token FROM subscriptions WHERE email = $1",
        ["test@example.com"]
      );
      await pool.query(
        "UPDATE subscriptions SET confirmed = true WHERE confirm_token = $1",
        [rows[0].confirm_token]
      );

      const res = await request(app)
        .post("/api/subscribe")
        .send({ email: "test@example.com", repo: "owner/repo" });

      expect(res.status).toBe(409);
    });

    it("re-subscribing unconfirmed resends email with existing token", async () => {
      await request(app)
        .post("/api/subscribe")
        .send({ email: "test@example.com", repo: "owner/repo" });

      const { rows: before } = await pool.query(
        "SELECT confirm_token FROM subscriptions WHERE email = $1",
        ["test@example.com"]
      );
      const originalToken = before[0].confirm_token;

      emailService.sendConfirmation.mockClear();

      const res = await request(app)
        .post("/api/subscribe")
        .send({ email: "test@example.com", repo: "owner/repo" });

      expect(res.status).toBe(200);
      expect(emailService.sendConfirmation).toHaveBeenCalledWith(
        "test@example.com",
        originalToken
      );

      const { rows: after } = await pool.query(
        "SELECT * FROM subscriptions WHERE email = $1",
        ["test@example.com"]
      );
      expect(after).toHaveLength(1);
    });
  });

  describe("GET /api/confirm/:token", () => {
    it("confirms subscription in DB", async () => {
      await request(app)
        .post("/api/subscribe")
        .send({ email: "test@example.com", repo: "owner/repo" });

      const { rows } = await pool.query(
        "SELECT confirm_token FROM subscriptions WHERE email = $1",
        ["test@example.com"]
      );
      const token = rows[0].confirm_token;

      const res = await request(app).get(`/api/confirm/${token}`);

      expect(res.status).toBe(200);

      const { rows: updated } = await pool.query(
        "SELECT confirmed FROM subscriptions WHERE confirm_token = $1",
        [token]
      );
      expect(updated[0].confirmed).toBe(true);
    });

    it("returns 404 for unknown token", async () => {
      const res = await request(app).get("/api/confirm/nonexistent-token");

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/unsubscribe/:token", () => {
    it("deletes subscription from DB", async () => {
      await request(app)
        .post("/api/subscribe")
        .send({ email: "test@example.com", repo: "owner/repo" });

      const { rows } = await pool.query(
        "SELECT unsubscribe_token FROM subscriptions WHERE email = $1",
        ["test@example.com"]
      );
      const token = rows[0].unsubscribe_token;

      const res = await request(app).get(`/api/unsubscribe/${token}`);

      expect(res.status).toBe(200);

      const { rows: remaining } = await pool.query(
        "SELECT * FROM subscriptions WHERE email = $1",
        ["test@example.com"]
      );
      expect(remaining).toHaveLength(0);
    });

    it("returns 404 for unknown token", async () => {
      const res = await request(app).get("/api/unsubscribe/nonexistent-token");

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/subscriptions", () => {
    it("returns only confirmed (active) subscriptions", async () => {
      await request(app)
        .post("/api/subscribe")
        .send({ email: "test@example.com", repo: "owner/repo1" });
      await request(app)
        .post("/api/subscribe")
        .send({ email: "test@example.com", repo: "owner/repo2" });

      const { rows } = await pool.query(
        "SELECT confirm_token FROM subscriptions WHERE repo = $1",
        ["owner/repo1"]
      );
      await pool.query(
        "UPDATE subscriptions SET confirmed = true WHERE confirm_token = $1",
        [rows[0].confirm_token]
      );

      const res = await request(app)
        .get("/api/subscriptions")
        .query({ email: "test@example.com" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].repo).toBe("owner/repo1");
      expect(res.body[0].confirmed).toBe(true);
    });

    it("returns empty array for unknown email", async () => {
      const res = await request(app)
        .get("/api/subscriptions")
        .query({ email: "nobody@example.com" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns 400 for invalid email", async () => {
      const res = await request(app)
        .get("/api/subscriptions")
        .query({ email: "invalid" });

      expect(res.status).toBe(400);
    });
  });

  describe("full subscription flow", () => {
    it("subscribe → confirm → list → unsubscribe → list", async () => {
      await request(app)
        .post("/api/subscribe")
        .send({ email: "flow@example.com", repo: "owner/repo" });

      const { rows } = await pool.query(
        "SELECT confirm_token, unsubscribe_token FROM subscriptions WHERE email = $1",
        ["flow@example.com"]
      );
      const { confirm_token: confirmToken, unsubscribe_token: unsubscribeToken } = rows[0];

      const pendingRes = await request(app)
        .get("/api/subscriptions")
        .query({ email: "flow@example.com" });
      expect(pendingRes.body).toHaveLength(0);

      await request(app).get(`/api/confirm/${confirmToken}`);

      const listRes = await request(app)
        .get("/api/subscriptions")
        .query({ email: "flow@example.com" });
      expect(listRes.status).toBe(200);
      expect(listRes.body).toHaveLength(1);
      expect(listRes.body[0].repo).toBe("owner/repo");
      expect(listRes.body[0].confirmed).toBe(true);

      await request(app).get(`/api/unsubscribe/${unsubscribeToken}`);

      const emptyRes = await request(app)
        .get("/api/subscriptions")
        .query({ email: "flow@example.com" });
      expect(emptyRes.status).toBe(200);
      expect(emptyRes.body).toEqual([]);
    });
  });
});
