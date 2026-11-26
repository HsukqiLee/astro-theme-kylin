import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const base = process.env.DIRECTUS_URL || 'http://127.0.0.1:8055';
const root = new URL('../', import.meta.url);
let token;
async function api(path, method = 'GET', body) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(60_000)
  });
  const json = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${json.errors?.[0]?.message || ''}`);
  return json.data;
}

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in directus/runtime.env.');
}
token = (await api('/auth/login', 'POST', {
  email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD
})).access_token;

let collections = await api('/collections');
if (!collections.some(c => c.collection === 'posts')) {
  const snapshot = JSON.parse(await readFile(new URL('directus/schema.snapshot.json', root), 'utf8'));
  const diff = await api('/schema/diff', 'POST', snapshot);
  await api('/schema/apply', 'POST', diff);
  collections = await api('/collections');
}
for (const collection of ['posts', 'categories', 'tags', 'comments', 'posts_tags', 'posts_categories']) {
  if (!collections.some(c => c.collection === collection)) throw new Error(`Missing collection: ${collection}`);
}

const policies = await api('/policies');
const permissions = (await api('/permissions?limit=-1')).filter(p => !p.system);
const access = await api('/access?limit=-1');
const publicPolicy = policies.find(p => access.some(a => !a.role && !a.user && a.policy === p.id));
if (!publicPolicy) throw new Error('Directus public policy was not found.');
await mkdir(new URL('directus/backups/', root), { recursive: true });
await writeFile(new URL(`directus/backups/permissions-${Date.now()}.json`, root), JSON.stringify({ policies, permissions, access }, null, 2));

async function permission(policy, collection, action) {
  const existing = permissions.find(p => p.policy === policy && p.collection === collection && p.action === action);
  const payload = { policy, collection, action, fields: ['*'], permissions: null, validation: null, presets: null };
  await api(existing ? `/permissions/${existing.id}` : '/permissions', existing ? 'PATCH' : 'POST', payload);
}

const blogCollections = ['posts', 'categories', 'tags', 'comments', 'posts_tags', 'posts_categories'];
for (const p of permissions.filter(p => p.policy === publicPolicy.id && blogCollections.includes(p.collection))) {
  await api(`/permissions/${p.id}`, 'DELETE');
}

let policy = policies.find(p => p.name === 'Kylin Website');
if (!policy) policy = await api('/policies', 'POST', { name: 'Kylin Website', icon: 'web', admin_access: false, app_access: false });
const roles = await api('/roles');
let role = roles.find(r => r.name === 'Kylin Website');
if (!role) role = await api('/roles', 'POST', { name: 'Kylin Website', icon: 'web' });
if (!access.some(a => a.role === role.id && a.policy === policy.id)) {
  await api('/access', 'POST', { role: role.id, policy: policy.id });
}
for (const collection of blogCollections) await permission(policy.id, collection, 'read');
await permission(policy.id, 'comments', 'create');
await api('/fields/comments/date_created', 'PATCH', { meta: { special: ['date-created'], readonly: true } });
await api('/fields/posts/date_updated', 'PATCH', { meta: { special: ['date-updated'], readonly: true } });

const email = 'kylin-website@blog.tsinbei.com';
const users = await api(`/users?filter[email][_eq]=${encodeURIComponent(email)}`);
const serviceToken = randomBytes(32).toString('hex');
const user = { email, role: role.id, status: 'active', token: serviceToken, first_name: 'Kylin', last_name: 'Website' };
await api(users[0] ? `/users/${users[0].id}` : '/users', users[0] ? 'PATCH' : 'POST', user);

const envPath = new URL('.env', root);
let env = '';
try { env = await readFile(envPath, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const [key, value] of Object.entries({ DIRECTUS_URL: base, DIRECTUS_TOKEN: serviceToken })) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  env = pattern.test(env) ? env.replace(pattern, line) : `${env.trimEnd()}\n${line}\n`;
}
await writeFile(envPath, env.trimStart(), { mode: 0o600 });
const snapshot = await api('/schema/snapshot');
await writeFile(new URL('directus/schema.snapshot.json', root), JSON.stringify(snapshot, null, 2));
console.log('Directus schema exported; anonymous content access disabled; website service token saved to .env. Restart Astro to load it.');
