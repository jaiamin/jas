import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: {
    baseURL: process.env.ASS_TEST_URL ?? "http://127.0.0.1:8082",
    trace: "retain-on-failure",
  },
});
