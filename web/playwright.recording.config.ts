import { defineConfig } from "@playwright/test";

// Opt-in production recording, separate from the offline/local regression suite.
export default defineConfig({
  testDir: "./recordings",
  outputDir: "../../evidence/location-recording",
  timeout: 180_000,
  workers: 1,
  reporter: "list",
  use: {
    browserName: "chromium",
    launchOptions: {
      ...(process.env.PLAYWRIGHT_CHROME_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH }
        : {}),
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
  },
});
