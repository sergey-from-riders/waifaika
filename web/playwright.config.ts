import { defineConfig, devices } from "@playwright/test";

const baseUse = {
  baseURL: "http://127.0.0.1:4173",
  browserName: "chromium" as const,
  launchOptions: {
    ...(process.env.PLAYWRIGHT_CHROME_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  },
  geolocation: { latitude: 43.5855, longitude: 39.7231 },
  locale: "ru-RU",
  permissions: ["geolocation", "clipboard-read", "clipboard-write"] as Array<
    "geolocation" | "clipboard-read" | "clipboard-write"
  >,
  serviceWorkers: "block" as const,
  trace: "off" as const,
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  outputDir: "./test-results",
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  use: baseUse,
  workers: 1,
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "iphone-13-light",
      use: {
        ...devices["iPhone 13"],
        ...baseUse,
        colorScheme: "light" as const,
      },
    },
    {
      name: "iphone-13-dark",
      use: {
        ...devices["iPhone 13"],
        ...baseUse,
        colorScheme: "dark" as const,
      },
    },
    {
      name: "pixel-7-light",
      use: {
        ...devices["Pixel 7"],
        ...baseUse,
        colorScheme: "light" as const,
      },
    },
    {
      name: "pixel-7-dark",
      use: {
        ...devices["Pixel 7"],
        ...baseUse,
        colorScheme: "dark" as const,
      },
    },
  ],
});
