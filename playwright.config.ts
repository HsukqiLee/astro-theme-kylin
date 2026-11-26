import { defineConfig } from '@playwright/test';
process.loadEnvFile('.env');
process.loadEnvFile('directus/runtime.env');

export default defineConfig({
  testDir: './tests',
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: { baseURL: 'http://127.0.0.1:4433', channel: 'msedge', colorScheme: 'light', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:4433',
    reuseExistingServer: !process.env.CI,
    env: { HOST: '127.0.0.1', PORT: '4433' },
    timeout: 120_000
  }
});
