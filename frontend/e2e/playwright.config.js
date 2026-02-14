const { defineConfig, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const HOME_DIR = process.env.HOME || '';
const PLAYWRIGHT_CACHE = path.join(HOME_DIR, 'Library', 'Caches', 'ms-playwright');

function resolveChromiumExecutablePath() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    path.join(
      PLAYWRIGHT_CACHE,
      'chromium_headless_shell-1208',
      'chrome-headless-shell-mac-arm64',
      'chrome-headless-shell'
    ),
    path.join(
      PLAYWRIGHT_CACHE,
      'chromium_headless_shell-1208',
      'chrome-headless-shell-mac-x64',
      'chrome-headless-shell'
    ),
    path.join(
      PLAYWRIGHT_CACHE,
      'chromium-1208',
      'chrome-mac-arm64',
      'Google Chrome for Testing.app',
      'Contents',
      'MacOS',
      'Google Chrome for Testing'
    )
  ].filter(Boolean);

  const found = candidates.find((candidatePath) => fs.existsSync(candidatePath));
  return found || undefined;
}

const chromiumExecutablePath = resolveChromiumExecutablePath();

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45 * 1000,
  expect: { timeout: 8000 },
  workers: Number(process.env.E2E_WORKERS || 1),
  fullyParallel: false,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : undefined
      }
    }
  ]
});
