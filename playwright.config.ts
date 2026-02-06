import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for MCP Weather App testing
 *
 * Tests use ext-apps basic-host running on http://localhost:8080
 * and mcp-map-server running on http://localhost:3001
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Don't auto-start server - requires manual setup
  // See TESTING_GUIDE.md for instructions
});
