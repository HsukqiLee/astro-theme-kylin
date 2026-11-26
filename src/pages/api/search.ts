import type { APIRoute } from 'astro';
import { readItems } from '@directus/sdk';
import { directus, type Post } from '../../lib/directus';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return Response.json({ results: [] });
  if (q.length > 200) return Response.json({ results: [], error: '关键词不能超过 200 个字符。' }, { status: 400 });

  try {
    const posts = (await directus.request(
      readItems('posts', {
        fields: ['id', 'title', 'slug', 'excerpt', 'published_at'],
        filter: {
          _and: [
            { status: { _eq: 'published' } },
            { type: { _eq: 'post' } },
            { _or: [{ title: { _contains: q } }, { content: { _contains: q } }] }
          ]
        },
        limit: 12,
        sort: ['-published_at']
      })
    )) as Post[];
    return Response.json({ results: posts });
  } catch (e) {
    console.error('Search failed', e);
    return Response.json({ results: [], error: '搜索暂时不可用，请稍后再试。' }, { status: 503 });
  }
};
