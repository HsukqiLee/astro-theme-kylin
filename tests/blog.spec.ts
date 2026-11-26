import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const directusUrl = process.env.DIRECTUS_URL || 'http://127.0.0.1:8055';

test('existing comment can be selected for a reply', async ({ page, request }, testInfo) => {
  const response = await request.get(`${directusUrl}/items/comments`, {
    headers: { Authorization: `Bearer ${process.env.DIRECTUS_TOKEN}` },
    params: { fields: 'id,post.slug,author', 'filter[status][_eq]': 'approved', limit: '1' }
  });
  expect(response.ok()).toBeTruthy();
  const comment = (await response.json()).data[0];
  await page.goto(`/archives/${comment.post.slug}/`);
  await page.locator(`[data-reply-to="${comment.id}"]`).click();
  await expect(page.locator('input[name="parent"]')).toHaveValue(comment.id);
  await expect(page.locator('.reply-hint')).toContainText(comment.author);
  await page.getByRole('button', { name: '取消回复' }).click();
  await expect(page.locator('input[name="parent"]')).toHaveValue('');
  await testInfo.attach('result', { body: JSON.stringify({ replySelected: true }), contentType: 'application/json' });
});

test('publishing, taxonomy, private comments and moderation work through the blog', async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  const login = await request.post(`${directusUrl}/auth/login`, {
    data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }
  });
  expect(login.ok()).toBeTruthy();
  const admin = (await login.json()).data.access_token;
  const marker = `kylin-e2e-${randomUUID()}`;
  const created: { collection: string; id: string | number }[] = [];
  async function create(collection: string, data: object) {
    const response = await request.post(`${directusUrl}/items/${collection}`, { headers: { Authorization: `Bearer ${admin}` }, data });
    expect(response.ok(), await response.text()).toBeTruthy();
    const item = (await response.json()).data;
    created.push({ collection, id: item.id });
    return item;
  }
  async function update(collection: string, id: string, data: object) {
    const response = await request.patch(`${directusUrl}/items/${collection}/${id}`, { headers: { Authorization: `Bearer ${admin}` }, data });
    expect(response.ok(), await response.text()).toBeTruthy();
  }
  try {
    const root = await create('categories', { name: `${marker} <&>`, slug: `${marker}-root` });
    const middle = await create('categories', { name: marker, slug: `${marker}-middle`, parent: root.id });
    const leaf = await create('categories', { name: marker, slug: `${marker}-leaf`, parent: middle.id });
    const tag = await create('tags', { name: marker, slug: marker });
    const post = await create('posts', {
      title: marker, slug: marker, type: 'post', status: 'draft', published_at: new Date().toISOString(),
      excerpt: 'End-to-end blog fixture', category: leaf.id,
      categories: [{ categories_id: root.id }, { categories_id: leaf.id }], tags: [{ tags_id: tag.id }],
      content: '##Title\n\n$x^2$\n\nFootnote[^1]\n\n[^1]: Note\n\n[About](https://blog.tsinbei.com/about.html)\n\n```js\nconsole.log(1);\n```'
    });
    expect((await request.get(`/archives/${marker}/`)).status()).toBe(404);
    expect((await (await request.get(`/api/search?q=${marker}`)).json()).results).toEqual([]);
    await update('posts', post.id, { status: 'published' });
    await page.goto(`/archives/${marker}/`);
    await expect(page.locator('.article-single > h1')).toHaveText(marker);
    await expect(page.locator('.article-single h2')).toHaveText('Title');
    await expect(page.locator('.article-single mjx-container svg')).toHaveCount(1);
    await expect(page.locator('.footnotes li')).toHaveCount(1);
    await expect(page.locator('figure.highlight .gutter')).toHaveCount(1);
    await expect(page.locator('.article-single .content a[href="/about.html"]')).toHaveText('About');
    const oldPage = await request.get('/about.html', { maxRedirects: 0 });
    expect(oldPage.status()).toBe(301);
    expect(oldPage.headers().location).toContain('/about/');
    const avatar = await request.get('/user/avatar/', { maxRedirects: 0 });
    expect(avatar.status()).toBe(302);
    expect(avatar.headers().location).toMatch(/^https:\/\/cdn\.tsinbei\.com\/img\/avatar\/acg\/\d+\.webp$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://blog.tsinbei.com/archives/${marker}/`);
    const search = await (await request.get(`/api/search?q=${marker}`)).json();
    expect(search.results.map((p: { slug: string }) => p.slug)).toContain(marker);
    expect(await (await request.get('/rss.xml')).text()).toContain(`https://blog.tsinbei.com/archives/${marker}/`);
    for (const category of [root, middle, leaf]) {
      await page.goto(`/category/${category.slug}/`);
      await expect(page.locator('.article-item .title')).toContainText(marker);
    }
    await page.goto('/categories/');
    const categoryLink = page.locator(`main a[href="/category/${root.slug}/"]`);
    await expect(categoryLink).toContainText(root.name);
    await expect(categoryLink.locator('.tag')).toHaveText('1');
    await page.goto('/tags/');
    await expect(page.locator(`main a[href="/tag/${marker}/"] .tag`).last()).toHaveText('1');
    await page.goto(`/tag/${marker}/`);
    await expect(page.locator('.article-item .title')).toContainText(marker);

    const parent = await create('comments', { post: post.id, author: 'E2E Parent', email: 'private@example.com', content: 'Approved parent', status: 'approved' });
    await page.goto(`/archives/${marker}/`);
    expect(await page.content()).not.toContain('private@example.com');
    await page.locator(`[data-reply-to="${parent.id}"]`).click();
    await page.locator('textarea[name="content"]').fill(marker);
    await page.locator('input[name="author"]').fill('E2E Reply');
    await page.locator('input[name="email"]').fill('reply@example.com');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await expect(page.locator('.comment-status')).toContainText('审核后公开');
    await expect(page.locator('.comment-content')).toHaveCount(1);
    const commentsResponse = await request.get(`${directusUrl}/items/comments`, {
      headers: { Authorization: `Bearer ${admin}` }, params: { 'filter[post][_eq]': post.id, 'filter[content][_eq]': marker }
    });
    const reply = (await commentsResponse.json()).data[0];
    expect(reply.status).toBe('pending');
    expect(reply.parent).toBe(parent.id);
    expect(reply.date_created).toBeTruthy();
    await update('comments', reply.id, { status: 'approved' });
    await page.reload();
    await expect(page.locator('.comment-children .comment-content')).toHaveText(marker);
    const existingPosts = await (await request.get(`${directusUrl}/items/posts?fields=id&filter[type][_eq]=post&limit=2`, {
      headers: { Authorization: `Bearer ${process.env.DIRECTUS_TOKEN}` }
    })).json();
    const otherPost = existingPosts.data.find((p: { id: string }) => p.id !== post.id);
    const crossPost = await request.post('/api/comment', { data: { post: otherPost.id, parent: parent.id, author: 'E2E', email: 'test@example.com', content: 'Invalid reply' } });
    expect(crossPost.status()).toBe(400);
    const invalidUrl = await request.post('/api/comment', { data: { post: post.id, author: 'E2E', email: 'test@example.com', content: 'Invalid URL', website: 'javascript:alert(1)' } });
    expect(invalidUrl.status()).toBe(400);
    expect((await request.post('/api/comment', { data: [], headers: { Origin: 'https://other.example.com' } })).status()).toBe(403);
    for (const collection of ['posts', 'comments', 'posts_tags', 'posts_categories']) {
      expect((await request.get(`${directusUrl}/items/${collection}`)).status()).toBe(403);
    }
    expect((await request.patch(`${directusUrl}/items/posts/${post.id}`, {
      headers: { Authorization: `Bearer ${process.env.DIRECTUS_TOKEN}` }, data: { title: 'Should be denied' }
    })).status()).toBe(403);
    await testInfo.attach('result', { body: JSON.stringify({ draftHidden: true, publishedVisible: true, taxonomyCount: 1, mathRendered: true, moderation: 'pending-to-approved', privateEmailHidden: true, anonymousApiDenied: true, postWritesDenied: true }), contentType: 'application/json' });
  } finally {
    for (const item of created.reverse()) {
      const response = await request.delete(`${directusUrl}/items/${item.collection}/${item.id}`, { headers: { Authorization: `Bearer ${admin}` } });
      expect([204, 404]).toContain(response.status());
    }
  }
});

test('search and dark mode work after page transitions on desktop and mobile', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await expect(page.locator('.catalogue')).toHaveCount(0);
  const article = page.locator('main .article-item .title a').first();
  const title = await article.innerText();
  await page.locator('.navbar-main .dark-adjust').click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.locator('.navbar-start a[href="/about/"]').click();
  await expect(page).toHaveURL(/\/about\//);
  await expect(page.locator('.navbar-item.is-active')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.keyboard.press('Control+k');
  await expect(page.locator('#search-input')).toBeVisible();
  await page.locator('#search-input').fill(title);
  await expect(page.locator('.searchbox-result-item .searchbox-result-title').first()).toHaveText(title);
  await page.screenshot({ path: testInfo.outputPath('search-desktop-dark.png') });
  await page.locator('.searchbox-result-item').first().click();
  await expect(page.locator('.article-single > h1')).toHaveText(title);
  await expect(page.locator('html')).not.toHaveClass(/search-open/);
  await page.locator('.navbar-main .dark-adjust').click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.screenshot({ path: testInfo.outputPath('desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.navbar-main .search').click();
  await expect(page.locator('#search-input')).toBeVisible();
  await expect(page.locator('#search-close')).toBeInViewport();
  await page.locator('#search-input').fill(title);
  await expect(page.locator('.searchbox-result-item').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('search-mobile.png') });
  await page.locator('#search-close').click();
  await expect(page.locator('#search-input')).not.toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('mobile.png') });
  await testInfo.attach('result', { body: JSON.stringify({ transitions: true, search: true, darkMode: true, mobileSearch: true }), contentType: 'application/json' });
});
