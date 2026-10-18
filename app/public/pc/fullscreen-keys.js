/* Club keyboard boundary: game keys stay in the guest; Alt+Enter belongs to the shell. */
(function () {
  'use strict';
  function isEnter(e) { return e.code === 'Enter' || e.code === 'NumpadEnter' || e.key === 'Enter'; }
  function isF(e) { return (e.code === 'KeyF' || /^[fа]$/i.test(e.key || '')) && !e.ctrlKey && !e.altKey && !e.metaKey; }
  function chord(e) { return isEnter(e) && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey; }
  function swallow(e) { e.preventDefault(); e.stopImmediatePropagation(); }
  window.pcFullscreenKeys = {
    install: function (options) {
      var state = options.state || { enter: false, f: false };
      function toggle(e) {
        if (e.repeat) return;
        try { var result = options.toggle(); if (result && result.catch) result.catch(function () {}); } catch (_) { /* Browser may deny fullscreen. */ }
      }
      window.addEventListener('keydown', function (e) {
        if (!e.isTrusted) return;
        if (chord(e)) { state.enter = true; swallow(e); toggle(e); return; }
        if (isEnter(e) && state.enter) {
          if (e.repeat) { swallow(e); return; }
          state.enter = false; // A new plain Enter must not inherit a lost keyup.
        }
        if (options.allowF && options.allowF() && isF(e)) { state.f = true; swallow(e); toggle(e); }
      }, true);
      window.addEventListener('keyup', function (e) {
        if (!e.isTrusted) return;
        // Alt may be released before Enter; the shared latch also survives iframe focus changes.
        if (isEnter(e) && (state.enter || chord(e))) { state.enter = false; swallow(e); }
        if (isF(e) && state.f) { state.f = false; swallow(e); }
      }, true);
      window.addEventListener('keypress', function (e) {
        if (e.isTrusted && ((isEnter(e) && state.enter) || (isF(e) && state.f))) swallow(e);
      }, true);
      window.addEventListener('pagehide', function () { state.enter = false; state.f = false; });
      return state;
    }
  };
})();
