import { test, expect } from "@playwright/test";
import { buildAuthState } from "./helpers";

const STATE_FILE = "tests/e2e/.auth-collab.json";

test.beforeAll(async ({ browser }) => {
  await buildAuthState(browser, STATE_FILE, "collab");
});

test.use({ storageState: STATE_FILE });

test.describe("Collaboration page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/collaboration");
  });

  test("page renders its heading", async ({ page }) => {
    // The page has two headings: h1 "Collaboration" and h2 "Shared With Me".
    // Target the h1 specifically to avoid strict mode violation.
    await expect(
      page.getByRole("heading", { name: "Collaboration", exact: true }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows file list or empty state — never a blank page", async ({ page }) => {
    const content = page
      .getByText(/no files|nothing here|shared with you/i)
      .or(page.getByRole("table"))
      .or(page.getByText(/files shared/i));
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  });

  test("text is readable — no near-invisible light text on white background", async ({ page }) => {
    // Regression guard against old text-emerald-200 / text-slate-400 bugs.
    // Counts leaf text nodes whose computed colour is so light it's illegible.
    const badColorCount = await page.evaluate(() => {
      let bad = 0;
      for (const el of document.querySelectorAll("*")) {
        if (el.children.length > 0) continue;               // only leaf nodes
        const text = el.textContent?.trim();
        if (!text || text.length < 2) continue;             // skip empty/icon nodes
        const color = window.getComputedStyle(el).color;
        const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!m) continue;
        const [r, g, b] = [+m[1], +m[2], +m[3]];
        // Perceived luminance on a white background; > 220 ≈ near-invisible
        if (0.299 * r + 0.587 * g + 0.114 * b > 220) bad++;
      }
      return bad;
    });
    expect(badColorCount).toBeLessThan(5); // allow a few decorative/icon elements
  });
});
