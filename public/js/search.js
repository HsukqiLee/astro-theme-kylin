(function () {
  'use strict';
  var listeners = null;
  var pending = null;
  var timer = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function init() {
    if (listeners) listeners.abort();
    if (pending) pending.abort();
    clearTimeout(timer);
    listeners = new AbortController();
    var options = { signal: listeners.signal };
    var box = document.getElementById('searchbox');
    var input = document.getElementById('search-input');
    var results = document.getElementById('search-results');
    var trigger = document.querySelector('.navbar-main .search');
    var close = document.getElementById('search-close');
    if (!box || !input || !results) return;

    function open() { box.classList.add('show'); setTimeout(function () { input.focus(); }, 50); }
    function hide() { box.classList.remove('show'); }

    if (trigger) trigger.addEventListener('click', function (e) { e.preventDefault(); open(); }, options);
    if (close) close.addEventListener('click', function (e) { e.preventDefault(); hide(); }, options);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hide();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open(); }
    }, options);

    function doSearch() {
      if (pending) pending.abort();
      var q = input.value.trim();
      if (!q) { results.innerHTML = ''; return; }
      pending = new AbortController();
      var apiOrigin = document.querySelector('meta[name="kylin:api-origin"]')?.content || '';
      fetch(apiOrigin + '/api/search?q=' + encodeURIComponent(q), { signal: pending.signal })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var list = data.results || [];
          if (data.error) { results.textContent = data.error; return; }
          if (!list.length) {
            results.innerHTML = '<div class="ins-search-item"><header><span class="ins-title">没有找到相关文章</span></header></div>';
            return;
          }
          results.innerHTML = list.map(function (p) {
            return '<a class="ins-search-item" href="/archives/' + esc(p.slug) + '/">' +
              '<header><i class="fa fa-file"></i><span class="ins-title">' + esc(p.title) + '</span></header>' +
              '<p class="ins-search-preview">' + esc((p.excerpt || '').slice(0, 90)) + '</p>' +
              '</a>';
          }).join('');
        })
        .catch(function (error) { if (error.name !== 'AbortError') results.textContent = '搜索暂时不可用，请稍后再试。'; });
    }

    input.addEventListener('input', function () {
      if (pending) pending.abort();
      clearTimeout(timer);
      timer = setTimeout(doSearch, 300);
    }, options);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('astro:page-load', init);
})();
