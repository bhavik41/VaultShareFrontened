import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FRONTEND_URL = "http://localhost:5173";
const BACKEND_URL = "http://localhost:5001";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  use: {
    baseURL: FRONTEND_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run dev",
      cwd: path.resolve(__dirname, "../VaultShareBackend-1"),
      port: 5001,
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "npm run dev -- --port 5173",
      cwd: __dirname,
      url: FRONTEND_URL,
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
