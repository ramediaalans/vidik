/* All PC engines share one isolated desktop. Canonical URL changes never
 * change document security policy, storage origin, or game save namespaces. */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var route = window.pcClubRoute = {
    initialGame: params.get('game'),
    qaMute: params.has('qaMute'),
    redirecting: false,
    destination: function (game) {
      if (window.crossOriginIsolated === true) return null;
      var target = new URL('/pc/bottleship/club', location.origin);
      target.searchParams.set('game', game.id);
      if (route.qaMute) target.searchParams.set('qaMute', '1');
      return target.pathname + target.search;
    },
    clearLaunch: function () {
      route.initialGame = null;
      var url = new URL(location.href);
      url.pathname = '/pc/';
      url.searchParams.delete('game'); url.searchParams.delete('qaMute');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }
  };
  var ordinary = /^\/pc(?:\/|\/index\.html)?$/.test(location.pathname);
  if (ordinary && !window.crossOriginIsolated) {
    route.redirecting = true;
    location.replace('/pc/bottleship/club' + location.search + location.hash);
    return;
  }
  // Same-origin history replacement does not reload or leave fullscreen.
  var initialGame = route.initialGame;
  route.clearLaunch(); route.initialGame = initialGame;
})();
