(function () {
  var ANALYTICS = { endpoint: "https://localreplyloop.goatcounter.com/count", queue: [] };
  window.__loopAnalytics = ANALYTICS;
  var off = navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true || /^(localhost|127\.|file:)/.test(location.hostname || "file:");
  var send = function (path, title, event) {
    if (off) return;
    var q = "p=" + encodeURIComponent(path) + "&t=" + encodeURIComponent(title || "") + "&r=" + encodeURIComponent(event ? "" : document.referrer) +
            "&s=" + encodeURIComponent(screen.width + "," + screen.height + "," + (window.devicePixelRatio || 1)) + (event ? "&e=true" : "") + "&rnd=" + Math.random().toString(36).slice(2);
    var img = new Image(); img.src = ANALYTICS.endpoint + "?" + q;
  };
  window.loopTrack = function (name, props) {
    var evt = { name: name, props: props || {}, path: location.pathname, ts: new Date().toISOString() };
    ANALYTICS.queue.push(evt);
    if (name === "page_view") send(location.pathname, document.title, false);
    else send(location.pathname.replace(/\/$/, "") + "/" + name + (evt.props.plan ? "-" + evt.props.plan : ""), name, true);
  };
  window.loopTrack("page_view", { title: document.title });
})();
