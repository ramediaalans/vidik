/* StarCraft accepted host presentation: 1024x768 maximum windowed; guest stays 640x480. */
(function () {
  'use strict';
  function computeSize(width, height, fullscreen) {
    width = Math.max(1, Number(width) || 1); height = Math.max(1, Number(height) || 1);
    var scale = Math.min(width / 1024, height / 768, fullscreen ? Infinity : 1);
    return { width: 1024 * scale, height: 768 * scale };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { computeSize: computeSize };
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var params = new URLSearchParams(location.search);
  if (params.get('game') !== 'starcraft-full-ru' || params.get('displayDefault') === 'off') return;
  var style = document.createElement('style');
  style.id = 'sc-club-display-style';
  style.textContent = '#root section[class*="app__panel"]{' +
    'inset:auto!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;' +
    'width:var(--sc-club-width)!important;height:var(--sc-club-height)!important;' +
    'max-width:none!important;max-height:none!important;}' +
    '#root canvas[class*="app__canvas"]{width:100%!important;height:100%!important;' +
    'max-width:100%!important;max-height:100%!important;}';
  document.head.appendChild(style);
  function apply() {
    var fullscreen = !!document.fullscreenElement || !!document.webkitFullscreenElement;
    try { fullscreen = fullscreen || !!parent.document.fullscreenElement || !!parent.document.webkitFullscreenElement; } catch (_) { /* Cross-origin embed. */ }
    var size = computeSize(window.innerWidth, window.innerHeight, fullscreen);
    document.documentElement.style.setProperty('--sc-club-width', size.width + 'px');
    document.documentElement.style.setProperty('--sc-club-height', size.height + 'px');
    var bs = window.__BS__ || (window.__BS__ = {});
    bs.displayDefault = { gameId: 'starcraft-full-ru', width: 1024, height: 768,
      appliedWidth: size.width, appliedHeight: size.height, kind: 'presentation-only',
      mode: fullscreen ? 'fullscreen' : 'windowed', unit: 'CSS pixels', smallWindow: 'fit without cropping' };
  }
  window.pcStarCraftDisplay = { computeSize: computeSize, apply: apply };
  window.addEventListener('resize', apply);
  document.addEventListener('fullscreenchange', apply);
  document.addEventListener('webkitfullscreenchange', apply);
  try { if (parent !== window) parent.document.addEventListener('fullscreenchange', apply); } catch (_) { /* Cross-origin embed. */ }
  apply();
})();
