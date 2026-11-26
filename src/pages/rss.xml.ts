import rss from '@astrojs/rss';
import { readItems } from '@directus/sdk';
import { directus, type Post } from '../lib/directus';
import { siteConfig } from '../lib/config';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await directus.request(
    readItems('posts', {
      fields: ['title', 'slug', 'excerpt', 'published_at'],
      filter: { status: { _eq: 'published' }, type: { _eq: 'post' } },
      sort: ['-published_at'],
      limit: 20
    })
  )) as Post[];

  return rss({
    title: siteConfig.title,
    description: `${siteConfig.title}的最新文章`,
    site: context.site!,
    items: posts.map((p) => ({
      title: p.title,
      link: `/archives/${p.slug}/`,
      pubDate: p.published_at ? new Date(p.published_at) : new Date(),
      description: p.excerpt || ''
    }))
  });
}
