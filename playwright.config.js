const { defineConfig, devices } = require('@playwright/test');

const port = process.env.PLAYWRIGHT_PORT || '3010';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;

module.exports = defineConfig({
  testDir: 'e2e',
  timeout: 60000,
  expect: { timeout: 20000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'on-first-retry'
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npx next start -H 127.0.0.1 -p ${port}`,
        url: `${baseURL}/`,
        reuseExistingServer: !process.env.CI,
        timeout: 60000
      }
});
