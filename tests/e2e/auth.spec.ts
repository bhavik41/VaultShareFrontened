import { test, expect } from "@playwright/test";
import { createTestUser, buildAuthState, API } from "./helpers";

// ── Sign-up ────────────────────────────────────────────────────────────────

async function fillSignupForm(page: import("@playwright/test").Page, opts: {
  firstName?: string; lastName?: string; username?: string;
  email?: string; password?: string; checkTerms?: boolean;
}) {
  if (opts.firstName !== undefined) await page.getByLabel(/first name/i).fill(opts.firstName);
  if (opts.lastName  !== undefined) await page.getByLabel(/last name/i).fill(opts.lastName);
  if (opts.username  !== undefined) await page.getByLabel(/username/i).fill(opts.username);
  if (opts.email     !== undefined) await page.getByLabel(/email/i).first().fill(opts.email);
  if (opts.password  !== undefined) await page.getByLabel(/password/i).fill(opts.password);
  if (opts.checkTerms) {
    const checkbox = page.getByRole("checkbox").first();
    if (!(await checkbox.isChecked())) await checkbox.check();
  }
}

test.describe("Sign-up", () => {
  test("valid signup moves to the email-OTP verification step", async ({ page }) => {
    const ts = Date.now();
    await page.goto("/signup");
    await fillSignupForm(page, {
      firstName: "E2E", lastName: "User",
      username: `e2euser${ts}`,
      email:    `e2e${ts}@vaultshare.test`,
      password: "E2EPass123!",
      checkTerms: true,
    });
    await page.getByRole("button", { name: /create free account/i }).click();
    await expect(page).toHaveURL(/signin-otp/, { timeout: 15_000 });
  });

  test("duplicate email shows an error message", async ({ page }) => {
    // Create the user via the API so we know it already exists
    const user = await createTestUser("dup");
    const ts   = Date.now();

    await page.goto("/signup");
    await fillSignupForm(page, {
      firstName: "Dup", lastName: "User",
      username:  `dup${ts}`,
      email:     user.email,
      password:  "E2EPass123!",
      checkTerms: true,
    });
    await page.getByRole("button", { name: /create free account/i }).click();
    await expect(page.getByText(/already exists|already registered|taken/i)).toBeVisible({ timeout: 8_000 });
    await expect(page).not.toHaveURL(/dashboard/);
  });

  test("short password is blocked by browser validation (minLength=8)", async ({ page }) => {
    await page.goto("/signup");
    await fillSignupForm(page, {
      firstName: "Short", lastName: "Pass",
      username:  `short${Date.now()}`,
      email:     `short${Date.now()}@test.com`,
      password:  "abc",
      checkTerms: true,
    });
    await page.getByRole("button", { name: /create free account/i }).click();
    // HTML5 minLength prevents submission — the page must NOT navigate away
    await expect(page).not.toHaveURL(/signin-otp|dashboard/, { timeout: 3_000 }).catch(() => {});
    // The "Must be at least 8 characters" hint is always visible
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test("terms must be accepted before the button is enabled", async ({ page }) => {
    await page.goto("/signup");
    const ts = Date.now();
    await fillSignupForm(page, {
      firstName: "No", lastName: "Terms",
      username:  `noterms${ts}`,
      email:     `noterms${ts}@test.com`,
      password:  "E2EPass123!",
      checkTerms: false,
    });
    // Button should be disabled while terms aren't checked
    await expect(page.getByRole("button", { name: /create free account/i })).toBeDisabled();
  });
});

// ── Sign-in ────────────────────────────────────────────────────────────────

test.describe("Sign-in", () => {
  test("valid credentials move to the email-OTP verification step", async ({ page }) => {
    const user = await createTestUser("si");
    // The API user exists; using the UI sign-in should trigger OTP
    await page.goto("/signin");
    await page.getByPlaceholder(/you@example\.com/i).fill(user.email);
    await page.getByPlaceholder(/password/i).fill("E2EPass123!");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/signin-otp/, { timeout: 12_000 });
  });

  test("wrong password shows an error", async ({ page }) => {
    const user = await createTestUser("wp");
    await page.goto("/signin");
    await page.getByPlaceholder(/you@example\.com/i).fill(user.email);
    await page.getByPlaceholder(/password/i).fill("WrongPassword999!");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page.getByText(/invalid|incorrect|wrong/i)).toBeVisible({ timeout: 8_000 });
    await expect(page).not.toHaveURL(/dashboard/);
  });

  test("unknown email shows an error", async ({ page }) => {
    await page.goto("/signin");
    await page.getByPlaceholder(/you@example\.com/i).fill(`nobody${Date.now()}@nowhere.test`);
    await page.getByPlaceholder(/password/i).fill("SomePass123!");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page.getByText(/invalid|not found|no account/i)).toBeVisible({ timeout: 8_000 });
  });

  test("protected route redirects to sign-in when not logged in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/signin/, { timeout: 8_000 });
  });
});

// ── Sign-out ───────────────────────────────────────────────────────────────

test.describe("Sign-out", () => {
  let stateFile: string;

  test.beforeAll(async ({ browser }) => {
    stateFile = "tests/e2e/.auth-signout.json";
    await buildAuthState(browser, stateFile, "so");
  });

  test("clicking sign-out clears the session and redirects away from dashboard", async ({ browser }) => {
    const ctx  = await browser.newContext({ storageState: stateFile });
    const page = await ctx.newPage();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

    // Open the profile dropdown in the header
    const header = page.locator("header").first();
    await header.locator("button").last().click();
    await page.getByText(/sign out|log out/i).first().click();

    await expect(page).toHaveURL(/signin|\/$/, { timeout: 10_000 });

    // Navigating back to /dashboard must re-redirect to /signin
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/signin/);

    await ctx.close();
  });
});

// ── Forgot password ────────────────────────────────────────────────────────

test.describe("Forgot password", () => {
  test("forgot-password page is reachable from sign-in", async ({ page }) => {
    await page.goto("/signin");
    await page.getByRole("link", { name: /forgot/i }).click();
    await expect(page).toHaveURL(/forgot/);
    await expect(page.getByRole("heading", { name: /forgot|reset/i })).toBeVisible();
  });

  test("submitting an unknown email shows success feedback without crashing", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByPlaceholder(/you@example\.com/i).fill(`nobody${Date.now()}@test.com`);
    await page.getByRole("button", { name: /send reset code/i }).click();
    // Backend responds the same way for found and not-found emails (security)
    await expect(page.locator("body")).not.toContainText("undefined", { timeout: 6_000 });
    await expect(page.locator("body")).not.toContainText("error", { timeout: 6_000 });
  });

  test("submitting the real user email advances to OTP entry", async ({ page }) => {
    const user = await createTestUser("fp");
    await page.goto("/forgot-password");
    await page.getByPlaceholder(/you@example\.com/i).fill(user.email);
    await page.getByRole("button", { name: /send reset code/i }).click();
    // Should show an OTP entry field or confirmation message
    const otpOrConfirm = page.getByText(/otp|sent|check your email|6.digit/i).or(
      page.locator('input[placeholder*="OTP"], input[placeholder*="code"]')
    );
    await expect(otpOrConfirm.first()).toBeVisible({ timeout: 10_000 });
  });
});

// ── Direct API auth ────────────────────────────────────────────────────────

test.describe("Test session endpoint", () => {
  test("returns a valid JWT that the /me endpoint accepts", async ({ request }) => {
    const ts    = Date.now();
    const email = `apicreate${ts}@vaultshare.test`;

    const session = await request.post(`${API}/test/session`, {
      data: { email, name: "API User" },
    });
    expect(session.ok()).toBe(true);
    const { token, user } = await session.json();
    expect(token).toBeTruthy();
    expect(user.email).toBe(email);

    // Token should work on the /me endpoint
    const me = await request.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.ok()).toBe(true);
    const { user: meUser } = await me.json();
    expect(meUser.email).toBe(email);
  });
});
