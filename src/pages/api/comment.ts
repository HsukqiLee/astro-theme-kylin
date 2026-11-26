import type { APIRoute } from 'astro';
import { createItem, readItems } from '@directus/sdk';
import { directus } from '../../lib/directus';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const fail = (error: string, status = 400) => Response.json({ ok: false, error }, { status });
  const origin = request.headers.get('origin');
  const siteOrigin = new URL(process.env.SITE_URL || 'https://blog.tsinbei.com').origin;
  if (origin && origin !== siteOrigin && origin !== new URL(request.url).origin) return fail('评论需要从本站提交。', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return fail('提交格式不正确。', 415);
  let body;
  try {
    const text = await request.text();
    if (text.length > 12_000) return fail('评论内容过长。', 413);
    body = JSON.parse(text);
  } catch {
    return fail('提交格式不正确。');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('提交格式不正确。');
  const { post, parent } = body;
  const author = typeof body.author === 'string' ? body.author.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const website = typeof body.website === 'string' ? body.website.trim() : '';
  if (typeof post !== 'string' || !uuid.test(post)) return fail('文章不存在。');
  if (parent != null && (typeof parent !== 'string' || !uuid.test(parent))) return fail('回复的评论不存在。');
  if (!author || author.length > 200) return fail('昵称需为 1–200 个字符。');
  if (!email || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('请填写有效的邮箱。');
  if (!content || content.length > 2000) return fail('评论需为 1–2000 个字符。');
  if (website) {
    try {
      const url = new URL(website);
      if (!['http:', 'https:'].includes(url.protocol) || website.length > 200) return fail('网址需以 http:// 或 https:// 开头。');
    } catch {
      return fail('请填写有效的网址。');
    }
  }
  try {
    const posts = await directus.request(readItems('posts', {
      fields: ['id'], filter: { id: { _eq: post }, status: { _eq: 'published' }, type: { _eq: 'post' } }, limit: 1
    }));
    if (!posts.length) return fail('文章不存在。', 404);
    if (parent) {
      const parents = await directus.request(readItems('comments', {
        fields: ['id'], filter: { id: { _eq: parent }, post: { _eq: post }, status: { _eq: 'approved' } }, limit: 1
      }));
      if (!parents.length) return fail('回复的评论不存在或尚未公开。');
    }
    await directus.request(createItem('comments', {
      post, parent: parent || null, author, email, website: website || null, content,
      status: 'pending',
      ip: clientAddress || null, ua: request.headers.get('user-agent')?.slice(0, 200) || null
    }));
    return Response.json({ ok: true, status: 'pending' }, { status: 201 });
  } catch (error) {
    console.error('Comment submission failed', error);
    return fail('评论暂时无法提交，请稍后再试。', 503);
  }
};
