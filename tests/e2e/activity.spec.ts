import { test, expect } from "@playwright/test";
import { buildAuthState } from "./helpers";

const STATE_FILE = "tests/e2e/.auth-act.json";

test.beforeAll(async ({ browser }) => {
  await buildAuthState(browser, STATE_FILE, "act");
});

test.use({ storageState: STATE_FILE });

test.describe("Activity page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/activity");
  });

  test("page renders its heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /activity/i })).toBeVisible({ timeout: 10_000 });
  });

  test("all filter tabs are present", async ({ page }) => {
    for (const label of ["All", "Uploads", "Downloads", "Views", "Shares", "Deletes"]) {
      await expect(page.getByRole("button", { name: new RegExp(label, "i") })).toBeVisible();
    }
  });

  test("switching filter tabs does not crash the page", async ({ page }) => {
    const tabs = ["Uploads", "Downloads", "Views", "Shares", "Deletes", "All"];
    for (const tab of tabs) {
      await page.getByRole("button", { name: new RegExp(`^${tab}$`, "i") }).click();
      await page.waitForTimeout(300);
      await expect(page.getByRole("heading", { name: /activity/i })).toBeVisible();
    }
  });

  test("refresh button reloads without crashing", async ({ page }) => {
    await page.getByRole("button", { name: /refresh/i }).click();
    await page.waitForTimeout(1500);
    await expect(page.getByRole("heading", { name: /activity/i })).toBeVisible();
  });

  test("shows empty state or activity items (not a blank page)", async ({ page }) => {
    const content = page
      .getByText(/no activity|no events|today|yesterday/i)
      .or(page.getByText(/uploaded|downloaded|viewed|shared/i));
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  });
});
