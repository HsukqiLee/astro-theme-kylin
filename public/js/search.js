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

    function open() {
      box.classList.add('show');
      box.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('search-open');
      input.focus();
    }
    function hide() {
      box.classList.remove('show');
      box.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('search-open');
      if (trigger) trigger.focus();
    }

    if (trigger) trigger.addEventListener('click', function (e) { e.preventDefault(); open(); }, options);
    if (close) close.addEventListener('click', function (e) { e.preventDefault(); hide(); }, options);
    box.addEventListener('click', function (e) { if (e.target === box) hide(); }, options);
    box.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusable = Array.from(box.querySelectorAll('input, button, a[href]'));
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }, options);
    document.addEventListener('astro:before-swap', function () {
      document.documentElement.classList.remove('search-open');
    }, options);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.classList.contains('show')) hide();
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
          if (data.error) { results.innerHTML = '<p class="searchbox-message">' + esc(data.error) + '</p>'; return; }
          if (!list.length) {
            results.innerHTML = '<p class="searchbox-message">没有找到相关文章</p>';
            return;
          }
          results.innerHTML = list.map(function (p) {
            return '<a class="searchbox-result-item" href="/archives/' + encodeURIComponent(p.slug) + '/">' +
              '<i class="fas fa-file-alt searchbox-result-icon" aria-hidden="true"></i>' +
              '<div class="searchbox-result-content"><span class="searchbox-result-title">' + esc(p.title) + '</span>' +
              '<p class="searchbox-result-preview">' + esc((p.excerpt || '').slice(0, 90)) + '</p></div></a>';
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
