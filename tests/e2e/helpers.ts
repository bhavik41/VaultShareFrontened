import type { Page } from "@playwright/test";
import * as fs   from "fs";
import * as path from "path";

export const BASE   = "http://localhost:5174";
export const API    = "http://localhost:5001/api";
export const TEST_ENDPOINT = `${API}/test/session`;

export interface TestUser {
  id:    string;
  name:  string;
  email: string;
  token: string;
  refreshToken: string;
}

/** Creates (or retrieves) a test user via the backend test-only endpoint and returns real JWTs. */
export async function createTestUser(tag = ""): Promise<TestUser> {
  const ts    = Date.now();
  const email = `e2e${ts}${tag}@vaultshare.test`;
  const name  = `E2E ${tag} ${ts}`;

  const res = await fetch(TEST_ENDPOINT, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, name }),
  });
  if (!res.ok) throw new Error(`Test session endpoint failed: ${res.status} ${await res.text()}`);

  const data = await res.json() as {
    token: string; refreshToken: string;
    user: { id: string; name: string; email: string };
  };

  return { ...data.user, token: data.token, refreshToken: data.refreshToken };
}

/**
 * Injects auth tokens into the page's localStorage so the Redux store picks
 * them up on next navigation, bypassing the email-OTP flow entirely.
 */
export async function injectAuth(page: Page, user: TestUser) {
  await page.goto(`${BASE}/signin`); // any page to init the origin
  await page.evaluate(({ token, refreshToken, email }) => {
    localStorage.setItem("token",        token);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("userEmail",    email);
  }, { token: user.token, refreshToken: user.refreshToken, email: user.email });
}

/**
 * Creates a Playwright-compatible storage-state JSON file for a fresh test user
 * WITHOUT opening a browser context (avoids the test.use({ storageState }) fixture
 * inheritance that causes ENOENT when the file doesn't exist yet).
 *
 * Call this in test.beforeAll; pair with test.use({ storageState: stateFile }).
 */
export async function buildAuthState(
  _browser: import("@playwright/test").Browser,
  stateFile: string,
  tag: string,
): Promise<TestUser> {
  const user = await createTestUser(tag);

  const state = {
    cookies: [],
    origins: [{
      origin: BASE,
      localStorage: [
        { name: "token",        value: user.token },
        { name: "refreshToken", value: user.refreshToken },
        { name: "userEmail",    value: user.email },
      ],
    }],
  };

  const dir = path.dirname(stateFile);
  if (dir) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

  return user;
}
