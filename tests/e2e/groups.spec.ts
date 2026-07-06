import { test, expect } from "@playwright/test";
import { buildAuthState } from "./helpers";

const STATE_FILE = "tests/e2e/.auth-grp.json";

test.beforeAll(async ({ browser }) => {
  await buildAuthState(browser, STATE_FILE, "grp");
});

test.use({ storageState: STATE_FILE });

test.describe("Groups page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/groups");
  });

  test("page renders its heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /groups/i })).toBeVisible({ timeout: 10_000 });
  });

  test("My Groups and Shared With Me tabs are present", async ({ page }) => {
    // GroupsPage renders in a <div>, not <main> — use page scope.
    // "My Groups" is unique (sidebar has no "My Groups" item).
    // "Shared With Me" (capital W) is unique to the groups tab; sidebar has "Shared with Me" (lowercase w).
    await expect(page.getByRole("button", { name: "My Groups", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Shared With Me", exact: true })).toBeVisible();
  });

  test("New Group button opens the create form", async ({ page }) => {
    await page.getByRole("button", { name: /new group/i }).click();
    await expect(page.getByPlaceholder(/group name/i)).toBeVisible({ timeout: 4_000 });
  });

  test("create-group button is disabled while name is empty", async ({ page }) => {
    await page.getByRole("button", { name: /new group/i }).click();
    await expect(page.getByRole("button", { name: /^create$/i })).toBeDisabled();
  });

  test("creating a group with a name displays it in the list", async ({ page }) => {
    const groupName = `Test Group ${Date.now()}`;
    await page.getByRole("button", { name: /new group/i }).click();
    await page.getByPlaceholder(/group name/i).fill(groupName);
    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page.getByText(groupName)).toBeVisible({ timeout: 10_000 });
  });

  test("clicking a group card opens the member+files view", async ({ page }) => {
    const groupName = `Clickable ${Date.now()}`;
    await page.getByRole("button", { name: /new group/i }).click();
    await page.getByPlaceholder(/group name/i).fill(groupName);
    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page.getByText(groupName)).toBeVisible({ timeout: 10_000 });

    await page.getByText(groupName).click();
    await expect(page.getByRole("heading", { name: new RegExp(groupName, "i") })).toBeVisible();
    await expect(page.getByRole("button", { name: /members/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /files/i })).toBeVisible();
  });

  test("Shared With Me tab switches the view", async ({ page }) => {
    // "Shared With Me" (capital W) is unique to the groups tab — sidebar uses lowercase "with"
    await page.getByRole("button", { name: "Shared With Me", exact: true }).click();
    const content = page
      .getByText(/no files|nothing here|shared with/i)
      .or(page.getByRole("table"));
    await expect(content.first()).toBeVisible({ timeout: 8_000 });
  });
});
