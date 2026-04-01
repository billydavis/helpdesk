import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "server/.env.test") });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      name: "Server",
      command: "bun run src/index.ts",
      cwd: path.resolve(__dirname, "server"),
      url: "http://localhost:5151/api/health",
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        NODE_ENV: "test",
        PORT: "5151",
      },
    },
    {
      name: "Client",
      command: "bun run dev",
      cwd: path.resolve(__dirname, "client"),
      url: "http://localhost:5174",
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        VITE_PORT: "5174",
        API_TARGET: "http://localhost:5151",
      },
    },
  ],
});
