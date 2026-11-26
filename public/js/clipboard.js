(function () {
  'use strict';
  function init() {
    if (!navigator.clipboard) return;
    document.querySelectorAll('figure.highlight').forEach(function (fig) {
      if (fig.querySelector('.copy')) return;
      var right = fig.querySelector('figcaption .level-right');
      if (!right) return;
      var btn = document.createElement('button');
      btn.className = 'copy button is-borderless is-radiusless is-small';
      btn.title = 'Copy';
      btn.setAttribute('type', 'button');
      btn.innerHTML = '<i class="fas fa-copy"></i>';
      btn.addEventListener('click', function () {
        var code = fig.querySelector('.code pre');
        navigator.clipboard.writeText(code ? code.textContent || '' : '').then(function () {
          btn.innerHTML = '<i class="fas fa-check"></i>';
          setTimeout(function () { btn.innerHTML = '<i class="fas fa-copy"></i>'; }, 1500);
        });
      });
      right.appendChild(btn);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('astro:after-swap', init);
})();
