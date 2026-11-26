import type { APIRoute } from 'astro';
import { randomInt } from 'node:crypto';

export const GET: APIRoute = () => new Response(null, {
  status: 302,
  headers: {
    Location: `https://cdn.tsinbei.com/img/avatar/acg/${randomInt(1, 104)}.webp`,
    'Cache-Control': 'no-store'
  }
});
