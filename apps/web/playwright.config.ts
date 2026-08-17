import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    viewport: { width: 1536, height: 1024 },
    colorScheme: 'light',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    reducedMotion: 'reduce',
    channel: 'chrome',
    launchOptions: { args: ['--font-render-hinting=none'] },
  },
  webServer: {
    command: 'pnpm.cmd --filter @saas/web dev',
    url: 'http://127.0.0.1:3000',
    timeout: 120_000,
    reuseExistingServer: true,
  },
});

