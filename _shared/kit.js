(function () {
  "use strict";
  var cfg = window.SITE_CONFIG || {};
  var doc = document.documentElement;
  var track = function (name, props) { if (typeof window.loopTrack === "function") window.loopTrack(name, props || {}); };

  // Kill switch: pause checkout + show banner, without touching content.
  if (cfg.killSwitch) {
    doc.dataset.paused = "true";
    document.querySelectorAll('[data-cta="checkout"]').forEach(function (a) {
      a.removeAttribute("href");
      a.setAttribute("aria-disabled", "true");
      a.textContent = "Checkout paused";
    });
  }

  // Sticky header border on scroll
  var header = document.querySelector(".site-header");
  var onScroll = function () { if (header) header.classList.toggle("is-scrolled", window.scrollY > 8); };
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // Mobile nav
  var toggle = document.querySelector(".nav-toggle");
  var mnav = toggle && document.getElementById(toggle.getAttribute("aria-controls"));
  if (toggle && mnav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.setAttribute("aria-label", open ? "Open menu" : "Close menu");
      mnav.classList.toggle("is-open", !open);
    });
    mnav.addEventListener("click", function (e) {
      if (e.target.closest("a")) { toggle.setAttribute("aria-expanded", "false"); mnav.classList.remove("is-open"); toggle.setAttribute("aria-label", "Open menu"); }
    });
  }

  // CTA analytics (stub queue only)
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-cta]");
    if (a) track("cta_click", { cta: a.getAttribute("data-cta"), label: a.textContent.trim(), plan: a.getAttribute("data-plan") || null });
    var plan = e.target.closest("[data-plan]");
    if (plan) {
      var sel = document.querySelector('form[data-contact] select[name="plan"]');
      if (sel) sel.value = plan.getAttribute("data-plan");
    }
  });

  // Self-check widget (client-side only, nothing stored or sent)
  var checker = document.querySelector("[data-checker]");
  if (checker) {
    var boxes = checker.querySelectorAll('input[type="checkbox"]');
    var num = document.querySelector("[data-score-num]");
    var bar = document.querySelector("[data-score-bar]");
    var msg = document.querySelector("[data-score-msg]");
    var render = function () {
      var n = 0; boxes.forEach(function (b) { if (b.checked) n++; });
      var pct = Math.round((n / boxes.length) * 100);
      if (num) num.textContent = n + "/" + boxes.length;
      if (bar) bar.style.width = pct + "%";
      if (msg) msg.textContent = n === boxes.length ? (checker.dataset.msgFull || "Looking healthy.") : n >= boxes.length - 2 ? (checker.dataset.msgMid || "Close — a couple of gaps.") : (checker.dataset.msgLow || "Worth a look.");
    };
    boxes.forEach(function (b) { b.addEventListener("change", function () { render(); track("checker_change", { score: b.checked }); }); });
    render();
  }

  // Contact form → composes an email in the visitor's own mail app. We never send anything.
  var form = document.querySelector("form[data-contact]");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      // The form only composes an email
      // in the visitor's own mail app; nothing is sent through any third-party form processor.
      var to = form.getAttribute("data-email") || cfg.contactEmail;
      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      var biz = (data.get("business") || "").toString().trim();
      var lines = [];
      data.forEach(function (v, k) { if (k !== "consent" && String(v).trim()) lines.push(k.charAt(0).toUpperCase() + k.slice(1) + ": " + v); });
      var subject = (form.getAttribute("data-subject") || "Enquiry") + (biz ? " — " + biz : "");
      var mailto = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
      var status = form.querySelector("[role=status]");
      if (!to) {
        form.setAttribute("data-mailto", "");
        if (status) { status.textContent = "Thanks" + (name ? ", " + name.split(" ")[0] : "") + ". Enquiries open at launch — this form isn't connected to an inbox yet, so nothing was sent or saved."; status.classList.add("is-visible"); }
        track("contact_blocked", {});
        return;
      }
      form.setAttribute("data-mailto", mailto);
      if (status) {
        status.textContent = "Thanks" + (name ? ", " + name.split(" ")[0] : "") + ". Your email app should open with your message ready — nothing is sent until you press Send. If it doesn't open, email " + to + ".";
        status.classList.add("is-visible");
      }
      track("contact_compose", { plan: data.get("plan") || null });
      if (!window.__LOOP_TEST__) window.location.href = mailto;
    });
  }

  // Footer year
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();

(function () {
  "use strict";
  var box = document.querySelector("[data-runway]");
  if (!box) return;
  var gbp = function (n) { return "£" + Math.round(n).toLocaleString("en-GB"); };
  var calc = function () {
    var v = function (n) { var x = parseFloat((box.querySelector('[name="' + n + '"]').value || "0").replace(/[£,\s]/g, "")); return isNaN(x) ? 0 : x; };
    var cash = v("cash"), inc = v("income"), out = v("costs");
    var net = inc - out, res = box.querySelector("[data-runway-out]"), sub = box.querySelector("[data-runway-sub]");
    if (!cash && !inc && !out) { res.textContent = "—"; sub.textContent = "Enter your numbers to see your runway."; return; }
    // 2026-10-19 UPGRADE W9: net == 0 used to say "£0 more" (e.g. only cash entered). Ask for the monthly figures, or say break-even.
    if (!inc && !out) { res.textContent = "—"; sub.textContent = "Add what comes in and what goes out each month to see your runway."; return; }
    if (net === 0) { res.textContent = "Break-even"; sub.textContent = "What comes in matches what you spend each month at today's pace."; return; }
    if (net > 0) { res.textContent = "Cash-positive"; sub.textContent = "You bring in " + gbp(net) + " more than you spend each month at today's pace."; return; }
    var months = cash / -net;
    res.textContent = (months >= 24 ? "24+" : months.toFixed(1)) + " months";
    sub.textContent = "At today's pace you spend " + gbp(-net) + " more than comes in each month.";
    if (typeof window.loopTrack === "function") window.loopTrack("runway_calculated", { bucket: months < 3 ? "<3" : months < 6 ? "3-6" : months < 12 ? "6-12" : "12+" });
  };
  box.addEventListener("input", calc);
  box.addEventListener("submit", function (e) { e.preventDefault(); calc(); });
  calc();
})();
