const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  globalSetup: "./e2e/globalSetup.js",
  globalTeardown: "./e2e/globalTeardown.js",
  use: {
    baseURL: "http://localhost:3001",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
