/**
 * Mobile drawer + hamburger (CSP-safe). Desktop: sidebar always visible.
 */
(function () {
  "use strict";

  var mq = window.matchMedia("(max-width: 900px)");

  function getEls() {
    return {
      layout: document.querySelector(".app-layout"),
      toggle: document.getElementById("shell-menu-toggle"),
      backdrop: document.getElementById("shell-drawer-backdrop"),
      drawer: document.getElementById("shell-drawer"),
    };
  }

  function closeNav() {
    var els = getEls();
    if (!els.layout || !els.toggle) return;
    els.layout.classList.remove("shell-nav-is-open");
    els.toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (els.backdrop) els.backdrop.setAttribute("aria-hidden", "true");
  }

  function openNav() {
    var els = getEls();
    if (!els.layout || !els.toggle) return;
    els.layout.classList.add("shell-nav-is-open");
    els.toggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    if (els.backdrop) els.backdrop.setAttribute("aria-hidden", "false");
  }

  function toggleNav() {
    var els = getEls();
    if (!els.layout) return;
    if (els.layout.classList.contains("shell-nav-is-open")) closeNav();
    else openNav();
  }

  function init() {
    var els = getEls();
    var closeBtn = document.getElementById("shell-drawer-close");
    if (!els.layout || !els.toggle) return;

    els.toggle.addEventListener("click", toggleNav);
    if (els.backdrop) els.backdrop.addEventListener("click", closeNav);
    if (closeBtn) closeBtn.addEventListener("click", closeNav);

    if (els.drawer) {
      els.drawer.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () {
          if (mq.matches) closeNav();
        });
      });
    }

    mq.addEventListener("change", function (e) {
      if (!e.matches) closeNav();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
