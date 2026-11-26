import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');
const site = process.env.SITE_URL ?? 'https://blog.tsinbei.com';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  site,
  build: { assetsPrefix: process.env.PUBLIC_RESOURCE_ORIGIN || undefined },
  security: {
    allowedDomains: [{ hostname: new URL(site).hostname }, { hostname: 'localhost' }, { hostname: '127.0.0.1' }]
  },
  redirects: {
    '/[slug].html': '/[slug]/',
    '/sitemap.html': '/archives/',
    '/favicon.ico': 'https://cdn.tsinbei.com/site/blog/img/favicon.ico'
  },
  server: { port: 4433, host: true }
});
