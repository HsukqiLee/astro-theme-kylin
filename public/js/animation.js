(function () {
  'use strict';

  function qsa(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  function play() {
    qsa('body > .navbar, body > .section, body > .footer').forEach(function (element) {
      element.style.transition = '0s';
      element.style.opacity = '0';
    });
    var navbar = document.querySelector('body > .navbar');
    if (navbar) navbar.style.transform = 'translateY(-100px)';
    ['.column-main > .card',
     '.column-left > .card, .column-right-shadow > .card',
     '.column-right > .card'].forEach(function (selector) {
      qsa(selector).forEach(function (element) {
        element.style.transition = '0s';
        element.style.opacity = '0';
        element.style.transform = 'scale(0.8)';
        element.style.transformOrigin = 'center top';
      });
    });
    setTimeout(function () {
      qsa('body > .navbar, body > .section, body > .footer').forEach(function (element) {
        element.style.opacity = '1';
        element.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
      });
      if (navbar) navbar.style.transform = 'translateY(0)';
      ['.column-main > .card',
       '.column-left > .card, .column-right-shadow > .card',
       '.column-right > .card'].forEach(function (selector) {
        var i = 1;
        qsa(selector).forEach(function (element) {
          setTimeout(function () {
            element.style.opacity = '1';
            element.style.transform = '';
            element.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
          }, i * 60);
          i++;
        });
      });
    }, 30);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', play);
  else play();
  document.addEventListener('astro:after-swap', play);
})();
