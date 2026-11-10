import { defineConfig } from "@playwright/test";
import base from "./playwright.config.js";

const baseURL = `http://127.0.0.1:${process.env.JAS_TEST_PORT ?? "8094"}`;
export default defineConfig({
  ...base,
  testMatch: ["extension-admission.trial.ts", "extension-integration.trial.ts"],
  use: { ...base.use, baseURL },
  webServer: {
    command: "JAS_TEST_PARTICIPANTS=1 ../.venv/bin/python e2e/server.py",
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
  },
});
