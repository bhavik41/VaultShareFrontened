import { test, expect } from "@playwright/test";

function uniqueUser() {
  const stamp = Date.now();
  return {
    firstName: "Smoke",
    lastName: "Tester",
    username: `smoketester${stamp}`,
    email: `smoketester+${stamp}@example.com`,
    password: "SmokeTest123!",
  };
}

test.describe("Public pages load", () => {
  test("landing page renders", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: /vaultshare/i }).first()).toBeVisible();
  });

  test("signin page renders", async ({ page }) => {
    await page.goto("/signin");
    await expect(page.getByRole("heading", { name: /sign in to your account/i })).toBeVisible();
  });

  test("signup page renders", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create an account/i })).toBeVisible();
  });

  test("forgot password page renders", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator("body")).toBeVisible();
    await expect(page).not.toHaveURL(/\/signin$/);
  });

  test("about, contact and team pages render", async ({ page }) => {
    for (const path of ["/about", "/contact", "/team"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }
  });
});

test.describe("Route protection", () => {
  test("unauthenticated user is redirected away from protected routes", async ({ page }) => {
    for (const path of ["/dashboard", "/upload", "/collaboration", "/file-sharing", "/activity"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/signin$/);
    }
  });

  test("unknown route falls back to landing/redirect", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("Auth flows", () => {
  test("signin shows an error for invalid credentials", async ({ page }) => {
    await page.goto("/signin");
    await page.getByPlaceholder("you@example.com").fill("nobody@example.com");
    await page.getByPlaceholder("Password").fill("wrongpassword123");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page.getByText(/invalid|incorrect|not found|error/i)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("signup rejects a password shorter than 8 characters", async ({ page }) => {
    const user = uniqueUser();
    await page.goto("/signup");

    await page.getByLabel("First name").fill(user.firstName);
    await page.getByLabel("Last name").fill(user.lastName);
    await page.getByLabel("Username").fill(user.username);
    await page.getByLabel("Email address").fill(user.email);
    await page.getByLabel("Password").fill("short");
    await page.getByLabel(/agree to the/i).check();

    // Browser-native minlength validation blocks submission; page should stay put.
    await page.getByRole("button", { name: /create free account/i }).click();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("a new user can sign up, land in the app, and sign back in", async ({ page }) => {
    // KNOWN BUG (found by this smoke test): POST /api/auth/signup returns
    // { token, refreshToken, user } directly (see auth.controller.ts signup()),
    // but authSlice.signupThunk.fulfilled unconditionally sets requiresOtp=true
    // and stores tempToken=undefined, sending every new user to /signin-otp.
    // That screen posts to /api/auth/signin/verify-otp, a route that doesn't
    // exist on the backend, so signup can never be completed through the UI.
    // This assertion documents the CORRECT expected behavior and will keep
    // failing until that bug is fixed.
    const user = uniqueUser();

    await page.goto("/signup");
    await page.getByLabel("First name").fill(user.firstName);
    await page.getByLabel("Last name").fill(user.lastName);
    await page.getByLabel("Username").fill(user.username);
    await page.getByLabel("Email address").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByLabel(/agree to the/i).check();
    await page.getByRole("button", { name: /create free account/i }).click();

    // Fresh signup issues tokens directly and should route to the dashboard.
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /my files/i })).toBeVisible();

    // Log out by clearing session, then sign back in with the same credentials.
    await page.evaluate(() => localStorage.clear());
    await page.goto("/signin");
    await page.getByPlaceholder("you@example.com").fill(user.email);
    await page.getByPlaceholder("Password").fill(user.password);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /my files/i })).toBeVisible();
  });
});

test.describe("Dashboard smoke", () => {
  test("logged-in user sees the upload control and files view", async ({ page }) => {
    // Depends on the signup flow reaching the dashboard — see the KNOWN BUG
    // note above. Currently fails at the same point.
    const user = uniqueUser();

    await page.goto("/signup");
    await page.getByLabel("First name").fill(user.firstName);
    await page.getByLabel("Last name").fill(user.lastName);
    await page.getByLabel("Username").fill(user.username);
    await page.getByLabel("Email address").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByLabel(/agree to the/i).check();
    await page.getByRole("button", { name: /create free account/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /my files/i })).toBeVisible();
    await expect(page.getByPlaceholder("Search files...")).toBeVisible();
  });
});
