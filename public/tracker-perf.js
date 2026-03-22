// Loaded async by tracker.js after idle — collects Core Web Vitals
var _s = document.currentScript;
var _siteId = _s && _s.getAttribute("data-site-id");
var _sessionId = _s && _s.getAttribute("data-session-id");
var _api = (_s && _s.getAttribute("data-api")) || "";
if (_siteId) {
  var _metrics = {};
  function _flush() {
    if (!_metrics.lcp && !_metrics.cls && !_metrics.inp && !_metrics.fcp && !_metrics.ttfb) return;
    var body = JSON.stringify({
      siteId: _siteId,
      sessionId: _sessionId,
      pathname: location.pathname,
      lcp: _metrics.lcp || null,
      cls: _metrics.cls || null,
      inp: _metrics.inp || null,
      fcp: _metrics.fcp || null,
      ttfb: _metrics.ttfb || null,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(_api + "/api/track/perf", new Blob([body], { type: "application/json" }));
    } else {
      fetch(_api + "/api/track/perf", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true }).catch(function () {});
    }
    _metrics = {};
  }
  // Load web-vitals as ESM module
  var _mod = document.createElement("script");
  _mod.type = "module";
  _mod.textContent = [
    'import{onLCP,onCLS,onINP,onFCP,onTTFB}from"https://unpkg.com/web-vitals@4/dist/web-vitals.js?module";',
    'var m=window.__wvm={};',
    'onLCP(function(e){m.lcp=e.value;});',
    'onCLS(function(e){m.cls=e.value;});',
    'onINP(function(e){m.inp=e.value;});',
    'onFCP(function(e){m.fcp=e.value;});',
    'onTTFB(function(e){m.ttfb=e.value;});',
  ].join("");
  document.head.appendChild(_mod);
  // Poll the shared metrics object and flush on hide/unload
  function _syncAndFlush() {
    var wm = window.__wvm || {};
    if (wm.lcp) _metrics.lcp = wm.lcp;
    if (wm.cls !== undefined) _metrics.cls = wm.cls;
    if (wm.inp) _metrics.inp = wm.inp;
    if (wm.fcp) _metrics.fcp = wm.fcp;
    if (wm.ttfb) _metrics.ttfb = wm.ttfb;
    _flush();
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") _syncAndFlush();
  });
  window.addEventListener("pagehide", _syncAndFlush);
  // Also flush after 10s as a fallback for SPAs
  setTimeout(_syncAndFlush, 10000);
}
