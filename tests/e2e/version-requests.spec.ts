import { test, expect } from "@playwright/test";
import { buildAuthState } from "./helpers";

const STATE_FILE = "tests/e2e/.auth-ver.json";

test.beforeAll(async ({ browser }) => {
  await buildAuthState(browser, STATE_FILE, "ver");
});

test.use({ storageState: STATE_FILE });

test.describe("Version Requests page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/version-requests");
  });

  test("page renders its heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /version request/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows 'no pending requests' state for a brand-new user", async ({ page }) => {
    // Target the h3 heading specifically to avoid strict mode violation
    // (the page also has a <p> containing "You're all caught up" which also matches)
    await expect(
      page.getByRole("heading", { name: /no pending requests/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("page uses a light background (Stitch theme regression guard)", async ({ page }) => {
    // Check that the page body / main container is not dark
    const bg = await page.evaluate(() => {
      const main = document.querySelector("main") ?? document.body;
      return window.getComputedStyle(main).backgroundColor;
    });
    const m = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (m) {
      const [r, g, b] = [+m[1], +m[2], +m[3]];
      // Sum > 700 means it's a light colour (#f8f9ff = 248+249+255 = 752)
      expect(r + g + b).toBeGreaterThan(700);
    }
  });
});
