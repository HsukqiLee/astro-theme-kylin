import { createDirectus, rest, staticToken, type QueryFields } from '@directus/sdk';
import { getSecret } from 'astro:env/server';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort: number | null;
  parent: string | Category | null;
  children?: Category[];
  posts?: Post[];
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  thumbnail: string | null;
  status: 'draft' | 'published';
  type: 'post' | 'page';
  published_at: string | null;
  date_updated: string | null;
  category: string | Category | null;
  tags?: PostTag[];
  categories?: PostCategory[];
  comments?: Comment[];
}

export interface PostTag {
  id: number;
  posts_id: string | Post | null;
  tags_id: string | Tag | null;
}

export interface PostCategory {
  id: number;
  posts_id: string | Post | null;
  categories_id: string | Category | null;
}

export interface Comment {
  id: string;
  author: string;
  email: string | null;
  website: string | null;
  content: string;
  status: string;
  ip: string | null;
  ua: string | null;
  date_created: string | null;
  post: string | Post;
  parent: string | Comment | null;
  replies?: Comment[];
}

export interface Schema {
  posts: Post[];
  categories: Category[];
  tags: Tag[];
  comments: Comment[];
  posts_tags: PostTag[];
  posts_categories: PostCategory[];
}

export const DIRECTUS_URL = process.env.DIRECTUS_URL ?? import.meta.env.DIRECTUS_URL ?? 'http://127.0.0.1:8055';

const token = getSecret('DIRECTUS_TOKEN');
if (!token) throw new Error('DIRECTUS_TOKEN is required; run npm run setup:directus.');
export const directus = createDirectus<Schema>(DIRECTUS_URL).with(staticToken(token)).with(rest());

export const postCardFields: QueryFields<Schema, Post> = [
  'id', 'title', 'slug', 'excerpt', 'thumbnail', 'published_at',
  { category: ['id', 'name', 'slug', { parent: ['id', 'name', 'slug'] }] }
];

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
