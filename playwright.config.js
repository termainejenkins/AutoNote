import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.mjs",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  outputDir: "test-results/playwright",
  use: {
    headless: false,
    viewport: { width: 1100, height: 900 },
    colorScheme: "light",
    acceptDownloads: true,
  },
});
