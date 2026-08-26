import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 8000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.PIQ_BASE_URL || 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      grepInvert: /phone-width/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      grep: /phone-width/,
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
      },
    },
  ],
});
