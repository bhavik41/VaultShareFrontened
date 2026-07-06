import { test, expect } from "@playwright/test";
import { buildAuthState } from "./helpers";

const STATE_FILE = "tests/e2e/.auth-nav.json";

test.beforeAll(async ({ browser }) => {
  await buildAuthState(browser, STATE_FILE, "nav");
});

test.use({ storageState: STATE_FILE });

// Actual h1/h2 headings rendered by each page (verified from source):
//   /dashboard        → "All Files" (h2, always present in DashboardPage)
//   /file-sharing     → "Manage File Sharing" (h1)
//   /collaboration    → "Collaboration" (h1) — also has "Shared With Me" h2; use first()
//   /activity         → "My Activity" (h1 in ActivityPage)
//   /groups           → "Groups" (h1)
//   /version-requests → "Version Requests" (h1)
const PAGES = [
  { path: "/dashboard",        heading: /all files/i },
  { path: "/file-sharing",     heading: /manage file sharing/i },
  { path: "/collaboration",    heading: /^collaboration$/i },
  { path: "/activity",         heading: /^my activity$/i },
  { path: "/groups",           heading: /^groups$/i },
  { path: "/version-requests", heading: /^version requests$/i },
];

for (const { path, heading } of PAGES) {
  test(`${path} loads and shows its heading`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({ timeout: 12_000 });

    await page.waitForTimeout(800);
    expect(errors.filter(e => !e.includes("ResizeObserver"))).toHaveLength(0);
  });
}

// Sidebar buttons are split across two areas:
//   main <nav>   → NAV_ITEMS: "My Drive", "Shared with Me", "Groups", "Activity Log", …
//   bottom <div> → BOTTOM_ITEMS: "Team / Sharing", "Version Requests", "Trash"
// Neither set is exclusively inside <nav> for BOTTOM_ITEMS, so we scope to page.
// We re-navigate to /dashboard before each click to avoid stale state.
test("sidebar navigation buttons work end-to-end", async ({ page }) => {
  const items: [string, string][] = [
    ["Team / Sharing",   "/file-sharing"],
    ["Shared with Me",   "/collaboration"],
    ["Activity Log",     "/activity"],
    ["Groups",           "/groups"],
    ["Version Requests", "/version-requests"],
  ];

  for (const [label, expectedPath] of items) {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: label, exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(expectedPath), { timeout: 8_000 });
  }
});

test("VaultShare branding is visible in the sidebar", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /vaultshare/i })).toBeVisible();
});

// We can't use browser.newContext() here because test.use({ storageState }) propagates
// to all context creation. Instead, clear localStorage on the authenticated page to
// simulate a signed-out user and confirm that protected routes redirect to /signin.
test("unauthenticated user is redirected from every protected route", async ({ page }) => {
  // Sign out by clearing auth tokens
  await page.goto("/signin"); // navigate to a public page first
  await page.evaluate(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userEmail");
  });

  for (const { path } of PAGES) {
    await page.goto(path);
    await expect(page).toHaveURL(/signin/, { timeout: 8_000 });
  }
});
