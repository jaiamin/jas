import { defineConfig } from "@playwright/test";

const externalURL = process.env.JAS_TEST_URL ?? process.env.ASS_TEST_URL;
const port = process.env.JAS_TEST_PORT ?? process.env.ASS_TEST_PORT ?? "8094";
const baseURL = externalURL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  forbidOnly: !!process.env.CI,
  webServer: externalURL
    ? undefined
    : {
        command: "../.venv/bin/python e2e/server.py",
        url: `${baseURL}/api/health`,
        reuseExistingServer: false,
        gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
      },
  testDir: "./e2e",
  workers: 1,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
});
