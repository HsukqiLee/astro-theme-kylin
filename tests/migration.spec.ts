import { test, expect } from '@playwright/test';

test('all migrated published posts, pages and navigation routes are readable', async ({ request }, testInfo) => {
  test.setTimeout(240_000);
  const backend = process.env.DIRECTUS_URL || 'http://127.0.0.1:8055';
  const headers = { Authorization: `Bearer ${process.env.DIRECTUS_TOKEN}` };
  async function items(collection: string, fields: string) {
    const response = await request.get(`${backend}/items/${collection}`, { headers, params: { fields, limit: '-1' } });
    expect(response.ok()).toBeTruthy();
    return (await response.json()).data;
  }
  const posts = await items('posts', 'id,title,slug,type,status');
  const categories = await items('categories', 'id,slug,parent');
  const tags = await items('tags', 'slug');
  const comments = await items('comments', 'id,post,parent,status');
  const postIds = new Set(posts.map((p: { id: string }) => p.id));
  const commentMap = new Map<string, { post: string; parent: string | null }>(comments.map((c: { id: string }) => [c.id, c]));
  for (const comment of comments) {
    expect(postIds.has(comment.post), `Comment ${comment.id} has an existing post`).toBeTruthy();
    if (comment.parent) {
      expect(commentMap.get(comment.parent)?.post, `Comment ${comment.id} replies within its post`).toBe(comment.post);
    }
  }
  const published = posts.filter((p: { status: string }) => p.status === 'published');
  const contentRoutes = published.map((p: { slug: string; type: string }) => p.type === 'post' ? `/archives/${p.slug}/` : `/${p.slug}/`);
  expect(new Set(contentRoutes).size, 'Published route selectors are unique').toBe(contentRoutes.length);
  const routes = [...new Set([
    '/', '/?page=2', '/archives/', '/categories/', '/tags/', '/rss.xml',
    ...contentRoutes,
    ...categories.map((c: { slug: string }) => `/category/${c.slug}/`),
    ...tags.map((t: { slug: string }) => `/tag/${t.slug}/`)
  ])] as string[];
  const failures: { path: string; status: number }[] = [];
  for (const path of routes) {
    try {
      const response = await request.get(path);
      if (response.status() !== 200) failures.push({ path, status: response.status() });
    } catch {
      failures.push({ path, status: 0 });
    }
  }
  const result = {
    posts: published.filter((p: { type: string }) => p.type === 'post').length,
    pages: published.filter((p: { type: string }) => p.type === 'page').length,
    comments: comments.length, routes: routes.length,
    failures: failures.sort((a, b) => a.path.localeCompare(b.path))
  };
  await testInfo.attach('migration-result', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  expect(failures).toEqual([]);
});
