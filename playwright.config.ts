import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
const installed = join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1248', 'chrome-win64', 'chrome.exe')
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  // CI traces showed bounded ~2.4s clicks accumulating past the old 45s story budget.
  // Keep every interaction and assertion, with separate bounded action/navigation waits.
  timeout: process.env.CI ? 120000 : 45000,
  expect: { timeout: 8000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:4317/velora-atelier/',
    headless: true,
    channel: process.env.CI ? 'chrome' : undefined,
    actionTimeout: 15000,
    navigationTimeout: 30000,
    // Reduce optional screen readback overhead; the driver warning's exact cause is not isolated.
    // Preserve action/DOM/ARIA/source traces and every explicitly captured real screenshot.
    trace: { mode: 'retain-on-failure', screenshots: false, snapshots: { dom: true, aria: true, screen: false }, sources: true },
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--disable-dev-shm-usage'],
      ...(!process.env.CI && existsSync(installed) ? { executablePath: installed } : {}),
    },
  },
  webServer: process.env.BASE_URL ? undefined : {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4317/velora-atelier/',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})
