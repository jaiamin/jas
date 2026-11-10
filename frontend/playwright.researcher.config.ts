import { defineConfig } from "@playwright/test";
import base from "./playwright.config.js";

export default defineConfig({
  ...base,
  testMatch: "researcher-design.trial.ts",
  webServer: base.webServer
    ? {
        ...base.webServer,
        command: "JAS_TEST_RESEARCHER=1 ../.venv/bin/python e2e/server.py",
      }
    : undefined,
});
