import { resourceUrl } from './urls';
export interface NavItem { name: string; url: string }
export interface IconItem { title: string; icon: string; url: string }
export interface LinkItem { name: string; url: string }
export interface DonateButton { type: string; image: string; url?: string }

// Values sourced from the live Typecho Kylin theme config (theme:tsinbei).
export const siteConfig = {
  title: '清北博客',
  logoText: '清北博客',
  logoImg: 'https://cdn.tsinbei.com/site/blog/img/navbar-transparent.png',
  logoImgDark: 'https://cdn.tsinbei.com/site/blog/img/navbar-dark-transparent.png',
  favicon: 'https://cdn.tsinbei.com/site/blog/img/favicon.ico',
  installTime: '2021-06-26',

  navbar: [
    { name: '首页', url: '/' },
    { name: '关于', url: '/about/' },
    { name: '归档', url: '/archives/' },
    { name: '专栏', url: '/column/' },
    { name: '友链', url: '/friends/' }
  ] as NavItem[],

  navbarIcons: [] as IconItem[],
  navbarSticky: false, // icarus_navbar_top = 0

  profile: {
    author: 'Hsukqi Lee',
    email: 'blog@tsinbei.com',
    authorTitle: '',
    location: '',
    avatar: resourceUrl('/user/avatar/'),
    followLink: '/rss.xml',
    socialLinks: [
      { title: 'GitHub', icon: 'fab fa-github', url: 'https://github.com/HsukqiLee' },
      { title: 'Twitter', icon: 'fab fa-twitter', url: 'https://twitter.com/@HsukqiLee' },
      { title: 'EMail', icon: 'fas fa-envelope', url: 'mailto:blog@tsinbei.com' }
    ] as IconItem[]
  },

  links: [
    { name: '清北科技', url: 'https://www.tsinbei.com' },
    { name: 'IURT', url: 'https://iurt.net' },
    { name: '数学Wiki', url: 'https://math.sx' },
    { name: '思刻协会', url: 'https://sckur.com' },
    { name: '服务器监控', url: 'https://icmp.ing' }
  ] as LinkItem[],

  footer: {
    icp: '',
    beian: '',
    contentLeft: '',
    links: [
      { title: 'Creative Commons', icons: ['fab fa-creative-commons'], url: 'https://creativecommons.org/' },
      { title: 'GitHub Personal', icons: ['fab fa-github'], url: 'https://github.com/HsukqiLee/' },
      { title: 'GitHub Orgnization', icons: ['fab fa-github-square'], url: 'https://github.com/TsinbeiTech/' }
    ] as { title: string; icons: string[]; url: string }[]
  },

  donate: {
    enabled: true,
    buttons: [
      { type: 'qq', image: 'https://cdn.tsinbei.com/site/blog/img/qq.jpg' },
      { type: 'alipay', image: 'https://cdn.tsinbei.com/site/blog/img/alipay.jpg', url: 'https://qr.alipay.com/fkx19351l1ekhgi8sfb7p0c' },
      { type: 'wechat', image: 'https://cdn.tsinbei.com/site/blog/img/wechat.jpg' },
      { type: 'afdian', image: 'https://cdn.tsinbei.com/site/blog/img/afdian.png', url: 'https://afdian.com/@tsinbei' }
    ] as DonateButton[]
  },

  // mirrors icarus_aside_* (sticky / post_hide) from the Typecho theme config
  aside: {
    leftSticky: true, // icarus_aside_left_sticky = 1
    rightSticky: true, // icarus_aside_right_sticky = 1
    leftPostHide: false, // icarus_aside_left_post_hide = 0
    rightPostHide: false // icarus_aside_right_post_hide = 0
  },

  // hideOnPost / hideOnNonPost mirror icarus_aside_post_hide_widget / icarus_aside_non_post_hide_widget;
  // position / order mirror {widget}_position / {widget}_seq
  sidebar: {
    profile: { enabled: true, position: 'left', order: 0 },
    link: { enabled: true, position: 'left', order: 1 },
    category: { enabled: true, position: 'left', order: 2, hideOnPost: true },
    archive: { enabled: true, position: 'left', order: 3, hideOnPost: true, hideOnNonPost: true },
    toc: { enabled: true, position: 'right', order: 0, hideOnNonPost: true },
    recentpost: { enabled: true, position: 'right', order: 1, hideOnNonPost: true },
    tag: { enabled: true, position: 'right', order: 2, hideOnPost: true }
  } as Record<string, { enabled: boolean; position: 'left' | 'right'; order?: number; hideOnPost?: boolean; hideOnNonPost?: boolean }>,

  options: {
    postLicense: true,
    recentPostLimit: 5,
    tagLimit: 12,
    excerptLength: 50,
    highlightTheme: 'xcode',
    highlightThemeDark: 'tokyo-night-dark'
  },

  // mirrors the icarus_*_enable switches of the original Typecho theme
  features: {
    animation: false, // icarus_animejs_enable = 0 (page-load entrance animation)
    backToTop: true, // icarus_back_to_top_enable = 1
    clipboard: true, // icarus_clipboard_enable = 1
    copyleft: false, // icarus_copyleft_enable = 0
    darkMode: true, // icarus_dark_mode_enable = 1
    gallery: true, // icarus_gallery_enable = 1
    highlight: true, // icarus_highlight_enable = 1
    mathjax: true, // icarus_mathjax_enable = 1
    relativeTime: true, // icarus_moment_enable = 1
    outdatedBrowser: false, // icarus_outdated_browser_enable = 0
    progressbar: false, // icarus_progressbar_enable = 0
    search: true, // icarus_search_enable = 1
    sweetAlert: false, // icarus_sweet_alert_enable (unused in this stack)
    tabs: false // icarus_tabs_enable = 0
  }
};
