import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Generous because CI here renders with software WebGL, where Phaser's clamped
  // delta stretches every transition. On real hardware these finish in a few seconds.
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'list' : [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1200, height: 800 },
    launchOptions: {
      // The sandbox ships Chromium at a fixed path; fall back to Playwright's own.
      executablePath: process.env.CHROMIUM_PATH || undefined,
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
