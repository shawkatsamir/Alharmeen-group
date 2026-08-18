import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Fake Supabase origin. Both the browser and the Next server (Server Actions,
 * RSC) are pointed here, so nothing in this suite can reach the real project.
 */
export const STUB_SUPABASE_URL = "http://127.0.0.1:54999";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    locale: "ar-EG",
    timezoneId: "Africa/Cairo", // pins toLocaleDateString() output
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node e2e/stub-supabase.mjs",
      url: `${STUB_SUPABASE_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      // `next build && next start`, not `next dev`: the React Compiler is a
      // per-module Babel pass that in dev lands on the first request to each
      // route, which routinely blows past Playwright's navigation timeout.
      command: `npm run build && npm run start -- --port ${PORT}`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: STUB_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_e2e_fake",
        SUPABASE_SERVICE_ROLE_KEY: "",
        NEXT_PUBLIC_BASE_URL: BASE_URL,
        // Cloudflare's documented always-passes test key.
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      },
    },
  ],
});
