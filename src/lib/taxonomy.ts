import { aggregate, readItems } from '@directus/sdk';
import { directus, type Category } from './directus';

export interface CategoryNode extends Pick<Category, 'id' | 'name' | 'slug' | 'sort' | 'parent'> { count: number; children: CategoryNode[] }

export async function categoryTree(): Promise<CategoryNode[]> {
  const [categories, links] = await Promise.all([
    directus.request(readItems('categories', { fields: ['id', 'name', 'slug', 'parent', 'sort'], sort: ['sort', 'name'], limit: -1 })),
    directus.request(readItems('posts_categories', {
      fields: ['posts_id', 'categories_id'], limit: -1,
      filter: { posts_id: { status: { _eq: 'published' }, type: { _eq: 'post' } } }
    }))
  ]);
  const ids = new Map<string, Set<string>>();
  for (const link of links) {
    if (typeof link.categories_id !== 'string' || typeof link.posts_id !== 'string') continue;
    if (!ids.has(link.categories_id)) ids.set(link.categories_id, new Set());
    ids.get(link.categories_id)!.add(link.posts_id);
  }
  const nodes = new Map<string, CategoryNode>(categories.map(c => [c.id, { ...c, count: 0, children: [] }]));
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = typeof node.parent === 'object' ? node.parent?.id : node.parent;
    if (parent && nodes.has(parent)) nodes.get(parent)!.children.push(node);
    else roots.push(node);
  }
  function rollup(node: CategoryNode): Set<string> {
    const posts = new Set(ids.get(node.id));
    for (const child of node.children) for (const id of rollup(child)) posts.add(id);
    node.count = posts.size;
    return posts;
  }
  roots.forEach(rollup);
  return roots;
}

export async function tagCounts(): Promise<Record<string, number>> {
  const rows = await directus.request(aggregate('posts_tags', {
    groupBy: ['tags_id'], aggregate: { count: ['id'] },
    query: { limit: -1, filter: { posts_id: { status: { _eq: 'published' }, type: { _eq: 'post' } } } }
  }));
  return Object.fromEntries(rows.filter(row => row.tags_id).map(row => [String(row.tags_id), Number(row.count.id)]));
}
