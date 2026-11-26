(function () {
  'use strict';

  function init() {
    // wrap article images into lightbox links + caption
    document.querySelectorAll('.article img:not(.not-gallery-item)').forEach(function (img) {
      if (img.closest('a.gallery-item')) return;
      var a = document.createElement('a');
      a.className = 'gallery-item';
      a.href = img.getAttribute('src') || '';
      img.parentNode.insertBefore(a, img);
      a.appendChild(img);
      if (img.alt) {
        var cap = document.createElement('div');
        cap.className = 'has-text-centered is-size-6 has-text-grey caption';
        cap.textContent = img.alt;
        a.insertAdjacentElement('afterend', cap);
      }
    });

    // code highlight (highlight.js v11 vanilla)
    // custom code blocks put raw code in figure.highlight .code > pre (no <code>),
    // so highlight those explicitly; highlightAll covers any plain pre>code left.
    if (typeof hljs !== 'undefined') {
      document.querySelectorAll('figure.highlight .code pre').forEach(function (pre) {
        if (pre.__hljsDone) return;
        pre.__hljsDone = true;
        hljs.highlightElement(pre);
      });
      hljs.highlightAll();
    }

    // lightGallery v2 (vanilla)
    if (typeof lightGallery !== 'undefined') {
      document.querySelectorAll('.article').forEach(function (el) {
        if (el.__lgDone) return;
        el.__lgDone = true;
        lightGallery(el, { selector: '.gallery-item', download: false });
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  // re-init after Astro View Transitions navigation
  document.addEventListener('astro:after-swap', init);
})();
