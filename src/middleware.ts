import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
  const siteOrigin = new URL(process.env.SITE_URL || 'https://blog.tsinbei.com').origin;
  const origin = request.headers.get('origin');
  const api = url.pathname.startsWith('/api/');
  if (api && origin && origin !== siteOrigin && origin !== url.origin) {
    return Response.json({ error: '请求来源不受支持。' }, { status: 403 });
  }
  const response = api && request.method === 'OPTIONS'
    ? new Response(null, { status: 204 })
    : await next();
  if (api) {
    response.headers.set('Cache-Control', 'no-store');
    response.headers.append('Vary', 'Origin');
    if (origin === siteOrigin || origin === url.origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    }
  } else if (response.headers.get('content-type')?.includes('text/html')) {
    response.headers.set('Cache-Control', 'no-store');
  }
  return response;
});
