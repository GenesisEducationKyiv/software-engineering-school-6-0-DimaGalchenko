const request = require("supertest");
const express = require("express");
const createAuthMiddleware = require("../../../middleware/authMiddleware");

const buildTestApp = (apiKey) => {
  const app = express();
  app.use(createAuthMiddleware(apiKey));
  app.get("/test", (_req, res) => res.json({ ok: true }));
  return app;
};

describe("AuthMiddleware", () => {
  it("passes through when no API key is configured", async () => {
    const app = buildTestApp("");

    const res = await request(app).get("/test");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("passes through with valid API key", async () => {
    const app = buildTestApp("secret-key");

    const res = await request(app).get("/test").set("x-api-key", "secret-key");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("returns 401 when API key is missing", async () => {
    const app = buildTestApp("secret-key");

    const res = await request(app).get("/test");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Missing API key");
  });

  it("returns 401 when API key is invalid", async () => {
    const app = buildTestApp("secret-key");

    const res = await request(app).get("/test").set("x-api-key", "wrong-key");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid API key");
  });
});
