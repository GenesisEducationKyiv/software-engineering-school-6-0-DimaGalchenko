const { generateToken } = require("../../../services/tokenService");

describe("TokenService", () => {
  describe("generateToken", () => {
    it("returns a valid UUID string", () => {
      const token = generateToken();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(token).toMatch(uuidRegex);
    });

    it("generates unique tokens on each call", () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
    });
  });
});
