const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3001";

test.beforeEach(async () => {
  const res = await fetch(`${BASE}/__test__/reset`, { method: "POST" });
  expect(res.ok).toBeTruthy();
});

async function subscribe(email, repo) {
  const res = await fetch(`${BASE}/api/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, repo }),
  });
  const body = await res.json();
  expect(res.ok, `Subscribe failed: ${JSON.stringify(body)}`).toBeTruthy();
}

async function getTokens(email) {
  const res = await fetch(
    `${BASE}/__test__/tokens?email=${encodeURIComponent(email)}`,
  );
  const tokens = await res.json();
  expect(tokens.length, `No tokens found for ${email}`).toBeGreaterThan(0);
  return tokens;
}

test.describe("Index page - Subscribe tab", () => {
  test("page loads with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("GitHub Release Notifications");
    await expect(page.locator("h1")).toHaveText("GitHub Release Notifications");
  });

  test("subscribe form submits successfully", async ({ page }) => {
    await page.goto("/");
    await page.fill("#email", "e2e@example.com");
    await page.fill("#repo", "owner/repo");
    await page.click('button[type="submit"]');

    await expect(page.locator("#alert")).toHaveText(
      "Subscription successful. Confirmation email sent.",
    );
    await expect(page.locator("#alert")).toHaveClass(/success/);
  });

  test("invalid repo format shows error", async ({ page }) => {
    await page.goto("/");
    await page.fill("#email", "e2e@example.com");
    await page.fill("#repo", "badrepo");
    await page.click('button[type="submit"]');

    await expect(page.locator("#alert")).toContainText("Invalid repository");
    await expect(page.locator("#alert")).toHaveClass(/error/);
  });
});

test.describe("Index page - My Subscriptions tab", () => {
  test("tab switching works", async ({ page }) => {
    await page.goto("/");

    const subscriptionsTab = page.locator('[data-tab="subscriptions"]');
    await subscriptionsTab.click();
    await expect(subscriptionsTab).toHaveClass(/active/);
    await expect(page.locator("#subscriptions")).toHaveClass(/active/);
    await expect(page.locator("#subscribe")).not.toHaveClass(/active/);
  });

  test("lookup with no subscriptions shows empty message", async ({ page }) => {
    await page.goto("/");
    await page.click('[data-tab="subscriptions"]');
    await page.fill("#lookup-email", "nobody@example.com");
    await page.click('#subscriptions button[type="submit"]');

    await expect(page.locator("#subscriptions-list")).toContainText(
      "No active subscriptions found.",
    );
  });

  test("lookup shows confirmed subscriptions", async ({ page }) => {
    await subscribe("e2e@example.com", "owner/repo");
    const tokens = await getTokens("e2e@example.com");
    await fetch(`${BASE}/api/confirm/${tokens[0].confirm_token}`);

    await page.goto("/");
    await page.click('[data-tab="subscriptions"]');
    await page.fill("#lookup-email", "e2e@example.com");
    await page.click('#subscriptions button[type="submit"]');

    await expect(page.locator("#subscriptions-list")).toContainText(
      "owner/repo",
    );
    await expect(page.locator(".badge.confirmed")).toHaveText("Confirmed");
  });
});

test.describe("Confirm page", () => {
  test("invalid token shows failure", async ({ page }) => {
    await page.goto("/confirm/invalid-token-123");

    await expect(page.locator("h1")).toHaveText("Confirmation Failed");
    await expect(page.locator("#root")).toHaveClass(/error/);
  });

  test("valid token shows success", async ({ page }) => {
    await subscribe("confirm@example.com", "owner/repo");
    const tokens = await getTokens("confirm@example.com");

    await page.goto(`/confirm/${tokens[0].confirm_token}`);

    await expect(page.locator("h1")).toHaveText("Subscription Confirmed!");
    await expect(page.locator("#root")).toHaveClass(/success/);
  });
});

test.describe("Unsubscribe page", () => {
  test("invalid token shows failure", async ({ page }) => {
    await page.goto("/unsubscribe/invalid-token-123");

    await expect(page.locator("h1")).toHaveText("Unsubscribe Failed");
    await expect(page.locator("#root")).toHaveClass(/error/);
  });

  test("valid token shows success", async ({ page }) => {
    await subscribe("unsub@example.com", "owner/repo");
    const tokens = await getTokens("unsub@example.com");

    await page.goto(`/unsubscribe/${tokens[0].unsubscribe_token}`);

    await expect(page.locator("h1")).toHaveText("Unsubscribed");
    await expect(page.locator("#root")).toHaveClass(/success/);
  });
});

test.describe("Full E2E flow", () => {
  test("subscribe -> confirm -> verify -> unsubscribe -> verify removed", async ({
    page,
  }) => {
    await page.goto("/");
    await page.fill("#email", "flow@example.com");
    await page.fill("#repo", "owner/repo");
    await page.click('#subscribe button[type="submit"]');
    await expect(page.locator("#alert")).toHaveText(
      "Subscription successful. Confirmation email sent.",
    );

    const tokens = await getTokens("flow@example.com");
    await page.goto(`/confirm/${tokens[0].confirm_token}`);
    await expect(page.locator("h1")).toHaveText("Subscription Confirmed!");

    await page.goto("/");
    await page.click('[data-tab="subscriptions"]');
    await page.fill("#lookup-email", "flow@example.com");
    await page.click('#subscriptions button[type="submit"]');
    await expect(page.locator("#subscriptions-list")).toContainText(
      "owner/repo",
    );
    await expect(page.locator(".badge.confirmed")).toHaveText("Confirmed");

    await page.goto(`/unsubscribe/${tokens[0].unsubscribe_token}`);
    await expect(page.locator("h1")).toHaveText("Unsubscribed");

    await page.goto("/");
    await page.click('[data-tab="subscriptions"]');
    await page.fill("#lookup-email", "flow@example.com");
    await page.click('#subscriptions button[type="submit"]');
    await expect(page.locator("#subscriptions-list")).toContainText(
      "No active subscriptions found.",
    );
  });
});
