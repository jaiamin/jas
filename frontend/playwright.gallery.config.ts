import { defineConfig } from "@playwright/test";
import base from "./playwright.config.js";

const baseURL = `http://127.0.0.1:${process.env.JAS_TEST_PORT ?? "8095"}`;

export default defineConfig({
  ...base,
  testMatch: "gallery-public.trial.ts",
  outputDir: "gallery-test-results",
  use: { ...base.use, baseURL },
  webServer: {
    command: "../.venv/bin/python e2e/gallery-server.py",
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
  },
});
