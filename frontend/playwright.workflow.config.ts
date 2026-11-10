import { defineConfig } from "@playwright/test";
import base from "./playwright.config.js";

const baseURL = `http://127.0.0.1:${process.env.JAS_TEST_PORT ?? "18130"}`;
const executablePath = process.env.T12_BROWSER_EXECUTABLE;
const outputDir = process.env.T12_BROWSER_OUTPUT;
if (!executablePath || !outputDir)
  throw new Error(
    "Set the existing headless shell and private T12 output paths",
  );

export default defineConfig({
  ...base,
  testMatch: "workflow.trial.ts",
  timeout: 60000,
  outputDir,
  use: { ...base.use, baseURL, launchOptions: { executablePath } },
  webServer: {
    command: "JAS_TEST_WORKFLOW=1 ../.venv/bin/python -B e2e/server.py",
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
  },
});
