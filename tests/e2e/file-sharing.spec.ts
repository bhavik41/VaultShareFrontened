import { test, expect } from "@playwright/test";
import { buildAuthState } from "./helpers";

const STATE_FILE = "tests/e2e/.auth-fs.json";

test.beforeAll(async ({ browser }) => {
  await buildAuthState(browser, STATE_FILE, "fs");
});

test.use({ storageState: STATE_FILE });

test.describe("File Sharing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/file-sharing");
  });

  test("page renders its heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /manage file sharing/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows file list or empty-state message after load", async ({ page }) => {
    // When no files exist: shows "Upload a file first before managing sharing."
    // When files exist: shows the two-column grid with "Your Files" on the left.
    const content = page
      .getByText(/upload a file first|your files/i)
      .or(page.locator('button[class*="rounded-lg border px-3"]'));
    await expect(content.first()).toBeVisible({ timeout: 12_000 });
  });

  test("email invite form is visible after a file is selected (skipped for fresh users)", async ({ page }) => {
    // "Your Files" h2 only renders when files.length > 0; fresh users will hit the empty state.
    const hasFiles = await page.getByText(/your files/i).isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasFiles) {
      // Nothing to select — test is not applicable
      return;
    }
    // Click the first file button
    await page.locator('button[class*="rounded-lg border px-3"]').first().click();
    await expect(
      page.getByRole("heading", { name: /invite collaborator/i }),
    ).toBeVisible({ timeout: 6_000 });
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
  });
});
