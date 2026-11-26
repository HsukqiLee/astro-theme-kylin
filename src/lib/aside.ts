import { siteConfig } from './config';

export type PageKind = 'post' | 'categories' | 'tags' | 'other';

const REGISTRY = ['Profile', 'Category', 'Link', 'RecentPost', 'Archive', 'Tag', 'Toc'];

const NAME_OF: Record<string, string> = {
  profile: 'Profile',
  category: 'Category',
  link: 'Link',
  recentpost: 'RecentPost',
  archive: 'Archive',
  tag: 'Tag',
  toc: 'Toc'
};

export function asideWidgets(kind: PageKind): { left: string[]; right: string[]; columnCount: number } {
  const isPost = kind === 'post';
  const aside = siteConfig.aside;

  const hidden = new Set<string>();
  for (const [key, cfg] of Object.entries(siteConfig.sidebar)) {
    if (isPost ? cfg.hideOnPost : cfg.hideOnNonPost) hidden.add(key);
  }
  if (kind === 'categories') hidden.add('category');
  if (kind === 'tags') hidden.add('tag');

  const pick = (pos: 'left' | 'right'): string[] => {
    if (isPost && pos === 'left' && aside.leftPostHide) return [];
    if (isPost && pos === 'right' && aside.rightPostHide) return [];
    return Object.entries(siteConfig.sidebar)
      .filter(([key, cfg]) => cfg.enabled && cfg.position === pos && !hidden.has(key))
      .sort((a, b) => {
        const oa = a[1].order ?? 0;
        const ob = b[1].order ?? 0;
        if (oa !== ob) return oa - ob;
        return REGISTRY.indexOf(NAME_OF[a[0]]) - REGISTRY.indexOf(NAME_OF[b[0]]);
      })
      .map(([key]) => key);
  };

  const left = pick('left');
  const right = pick('right');
  return { left, right, columnCount: 1 + (left.length > 0 ? 1 : 0) + (right.length > 0 ? 1 : 0) };
}

export function sideColumnClass(columnCount: number): string {
  return columnCount === 3
    ? 'column is-4-tablet is-4-desktop is-3-widescreen'
    : 'column is-4-tablet is-4-desktop is-4-widescreen';
}
