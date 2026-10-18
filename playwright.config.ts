import { defineConfig } from "@playwright/test";

// Browser journeys run on the fixed demo prices so their budgets stay
// meaningful as Torob's real prices move; a separate port keeps them off a
// developer's live-price server on 3000.
const port = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: `http://localhost:${port}`,
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx next dev -p ${port}`,
    url: `http://localhost:${port}`,
    env: { PRICE_SOURCE: "demo" },
    reuseExistingServer: true,
    timeout: 180000,
  },
});
