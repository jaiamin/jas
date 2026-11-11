import { defineConfig } from "@playwright/test";
import base from "./playwright.config.js";

const baseURL = `http://127.0.0.1:${process.env.JAS_TEST_PORT ?? "18126"}`;
export default defineConfig({
  ...base,
  testMatch: "reliance.trial.ts",
  outputDir: process.env.T11_BROWSER_OUTPUT ?? "test-results",
  use: { ...base.use, baseURL },
  webServer: {
    command:
      "JAS_TEST_PARTICIPANTS=1 JAS_TEST_RELIANCE=1 ../.venv/bin/python e2e/server.py",
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
  },
});
