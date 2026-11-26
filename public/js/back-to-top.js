(function () {
  'use strict';

  var button, footer, mainColumn, leftSidebar, rightSidebar;
  var lastScrollTop = 0;
  var rightMargin = 20;
  var bottomMargin = 20;
  var lastState = null;

  var state = {};
  state.base = { classname: 'card has-text-centered', left: '', width: 64, bottom: bottomMargin, 'border-radius': 4 };
  state['desktop-hidden'] = Object.assign({}, state.base, { classname: state.base.classname + ' rise-up' });
  state['desktop-visible'] = Object.assign({}, state['desktop-hidden'], { classname: state['desktop-hidden'].classname + ' fade-in' });
  state['desktop-dock'] = Object.assign({}, state['desktop-visible'], { classname: state['desktop-visible'].classname + ' fade-in', width: 40, 'border-radius': '50%' });
  state['mobile-hidden'] = Object.assign({}, state.base, { classname: state.base.classname + ' fade-in', right: rightMargin });
  state['mobile-visible'] = Object.assign({}, state['mobile-hidden'], { classname: state['mobile-hidden'].classname + ' rise-up' });

  function isStateEquals(prev, next) {
    for (var p in prev) { if (!Object.prototype.hasOwnProperty.call(next, p) || next[p] !== prev[p]) return false; }
    for (var q in next) { if (!Object.prototype.hasOwnProperty.call(prev, q) || prev[q] !== prev[q]) return false; }
    return true;
  }

  function applyState(st) {
    if (lastState !== null && isStateEquals(lastState, st)) return;
    button.setAttribute('class', st.classname);
    for (var prop in st) {
      if (prop === 'classname') continue;
      button.style[prop] = typeof st[prop] === 'number' ? st[prop] + 'px' : st[prop];
    }
    lastState = st;
  }

  function isDesktop() { return window.innerWidth >= 1078; }
  function isTablet() { return window.innerWidth >= 768 && !isDesktop(); }
  function isScrollUp() { return window.scrollY < lastScrollTop && window.scrollY > 0; }
  function hasLeft() { return !!(leftSidebar && leftSidebar.children.length); }
  function hasRight() { return !!(rightSidebar && rightSidebar.children.length); }

  function getRightSidebarBottom() {
    if (!hasRight()) return 0;
    var max = 0;
    rightSidebar.querySelectorAll('.widget').forEach(function (w) {
      var r = w.getBoundingClientRect();
      max = Math.max(max, r.top + window.scrollY + r.height);
    });
    return max;
  }
  function getScrollBottom() { return window.scrollY + window.innerHeight; }
  function getButtonWidth() { return button.offsetWidth; }
  function getButtonHeight() { return button.offsetHeight; }

  function update() {
    if (!button) return;
    if (isDesktop() || (isTablet() && !hasLeft() && hasRight())) {
      var nextState;
      var padding = (mainColumn.offsetWidth - mainColumn.clientWidth) / 2;
      var maxLeft = window.innerWidth - getButtonWidth() - rightMargin;
      var fr = footer.getBoundingClientRect();
      var maxBottom = fr.top + window.scrollY + getButtonHeight() / 2 + bottomMargin;
      if (getScrollBottom() < getRightSidebarBottom() + padding + getButtonHeight()) {
        nextState = state['desktop-hidden'];
      } else if (getScrollBottom() < maxBottom) {
        nextState = state['desktop-visible'];
      } else {
        nextState = Object.assign({}, state['desktop-dock'], { bottom: getScrollBottom() - maxBottom + bottomMargin });
      }
      var mr = mainColumn.getBoundingClientRect();
      var left = mr.left + mainColumn.offsetWidth + padding;
      nextState = Object.assign({}, nextState, { left: Math.min(left, maxLeft) });
      applyState(nextState);
    } else {
      if (!isScrollUp()) applyState(state['mobile-hidden']);
      else applyState(state['mobile-visible']);
      lastScrollTop = window.scrollY;
    }
  }

  function init() {
    button = document.getElementById('back-to-top');
    footer = document.querySelector('footer.footer');
    mainColumn = document.querySelector('.column-main');
    leftSidebar = document.querySelector('.column-left');
    rightSidebar = document.querySelector('.column-right');
    if (!button) return;
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });
    button.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('astro:after-swap', init);
})();
