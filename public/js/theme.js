(function () {
  'use strict';

  var ac = null; // AbortController to avoid duplicate listeners across navigations

  function adjustNavbar() {
    var start = document.querySelector('.navbar-main .navbar-start');
    var end = document.querySelector('.navbar-main .navbar-end');
    var menu = document.querySelector('.navbar-main .navbar-menu');
    if (!start || !end || !menu) return;
    var w = start.offsetWidth + end.offsetWidth;
    if (document.documentElement.clientWidth < w) menu.classList.add('is-flex-start');
    else menu.classList.remove('is-flex-start');
  }

  function adjustColumns() {
    var left = document.querySelector('.column-left');
    var right = document.querySelector('.column-right');
    var main = document.querySelector('.column-main');
    if (!main) return;
    var hasLeft = !!(left && left.querySelectorAll('.card').length > 0);
    var hasRight = !!(right && right.querySelectorAll('.card').length > 0);
    var count = (!hasLeft && !hasRight) ? 1 : (hasLeft && hasRight) ? 3 : 2;

    document.body.classList.remove('is-1-column', 'is-2-column', 'is-3-column');
    document.body.classList.add('is-' + count + '-column');

    if (!hasLeft && left) left.remove();
    if (!hasRight && right) right.remove();

    if (count === 1) {
      main.classList.remove('is-6-widescreen', 'is-8-tablet', 'is-8-desktop', 'is-8-widescreen');
      main.classList.add('is-12');
    } else if (count === 2) {
      main.classList.remove('is-6-widescreen', 'is-12');
      main.classList.add('is-8-widescreen');
      var aside = hasLeft ? left : right;
      if (aside) {
        aside.classList.remove('is-3-widescreen');
        aside.classList.add('is-4-widescreen');
      }
    }

    if (count === 3 && left && right) {
      var moved = false;
      function resp() {
        var wide = window.innerWidth >= 1280;
        if (wide && moved) {
          moved = false;
          left.querySelectorAll(':scope > .card.card-on-right').forEach(function (c) { right.appendChild(c); });
        } else if (!wide && !moved) {
          moved = true;
          right.querySelectorAll(':scope > .card').forEach(function (c) { c.classList.add('card-on-right'); left.appendChild(c); });
        }
      }
      resp();
      window.addEventListener('resize', resp, { signal: ac.signal });
    }
  }

  function initDarkMode() {
    var btn = document.querySelector('.navbar-main .dark-adjust');
    if (!btn) return;
    function pref() {
      var s = localStorage.getItem('kylin-dark');
      if (s !== null) return s === '1';
      return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    }
    function apply(d) {
      document.body.classList.toggle('dark', d);
      // html carries .dark too so the viewport (page) scrollbar gets dark styles
      document.documentElement.classList.toggle('dark', d);
      document.documentElement.style.scrollbarColor = d ? '#888888 #121212' : 'rgba(0, 0, 0, 0.24) rgba(0, 0, 0, 0.06)';
      var hl = document.getElementById('hljs-theme');
      if (hl) {
        hl.href = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/' +
          (d ? 'tokyo-night-dark.min.css' : 'xcode.min.css');
      }
      var i = document.getElementById('darkModeIcon');
      if (i) {
        i.classList.remove('fa-adjust', 'fa-sun', 'fa-moon');
        i.classList.add(d ? 'fa-sun' : 'fa-moon');
      }
    }
    apply(pref());
    btn.addEventListener('click', function () {
      var d = !document.body.classList.contains('dark');
      apply(d);
      localStorage.setItem('kylin-dark', d ? '1' : '0');
    }, { signal: ac.signal });
  }

  function relativeTime() {
    var flag = document.querySelector('meta[name="kylin:relative-time"]');
    if (!flag || flag.getAttribute('content') !== 'true') return;
    if (typeof Intl === 'undefined' || !Intl.RelativeTimeFormat) return;
    var rtf = new Intl.RelativeTimeFormat(document.documentElement.lang || 'en', { numeric: 'auto' });
    document.querySelectorAll('.article-meta time, .comment-meta time').forEach(function (t) {
      var dt = t.getAttribute('datetime');
      if (!dt) return;
      var diff = (new Date(dt).getTime() - Date.now()) / 1000;
      var abs = Math.abs(diff);
      t.title = t.textContent;
      if (abs < 60) t.textContent = rtf.format(Math.round(diff), 'second');
      else if (abs < 3600) t.textContent = rtf.format(Math.round(diff / 60), 'minute');
      else if (abs < 86400) t.textContent = rtf.format(Math.round(diff / 3600), 'hour');
      else if (abs < 2592000) t.textContent = rtf.format(Math.round(diff / 86400), 'day');
      else if (abs < 31536000) t.textContent = rtf.format(Math.round(diff / 2592000), 'month');
      else t.textContent = rtf.format(Math.round(diff / 31536000), 'year');
    });
  }

  function initToc() {
    var toc = document.getElementById('toc');
    if (!toc) return;
    var mask = document.getElementById('toc-mask');
    if (!mask) {
      mask = document.createElement('div');
      mask.id = 'toc-mask';
      document.body.appendChild(mask);
    }
    function open() { toc.classList.add('is-active'); mask.classList.add('is-active'); }
    function close() { toc.classList.remove('is-active'); mask.classList.remove('is-active'); }
    function toggle() { toc.classList.contains('is-active') ? close() : open(); }
    mask.addEventListener('click', close, { signal: ac.signal });
    var cat = document.querySelector('.navbar-main .catalogue');
    if (cat) cat.addEventListener('click', toggle, { signal: ac.signal });
    toc.querySelectorAll('.menu-list a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href');
        close();
        var target = href && document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
          history.pushState(null, '', href);
        }
      }, { signal: ac.signal });
    });
  }

  function init() {
    if (ac) ac.abort();
    ac = new AbortController();
    adjustNavbar();
    adjustColumns();
    initDarkMode();
    relativeTime();
    initToc();
    window.addEventListener('resize', adjustNavbar, { signal: ac.signal });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  // re-init after Astro View Transitions navigation
  document.addEventListener('astro:after-swap', init);
})();
