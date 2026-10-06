import { defineConfig } from "@playwright/test";
try { process.loadEnvFile(".env.local"); } catch { /* CI can provide credentials through environment variables. */ }
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: { baseURL: process.env.APP_URL || "http://localhost:3001", browserName: "chromium", channel: process.env.PLAYWRIGHT_CHANNEL || "msedge", viewport: { width: 1440, height: 1000 }, screenshot: "only-on-failure" },
  reporter: "list",
});
