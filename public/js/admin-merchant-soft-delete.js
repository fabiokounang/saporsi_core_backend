/**
 * Soft-delete confirmation modal (CSP-safe: loaded from same origin, no inline script).
 */
(function () {
  "use strict";

  function init() {
    var overlay = document.getElementById("soft-delete-modal");
    if (!overlay) return;

    var merchantEl = document.getElementById("sdm-merchant");
    var cancelBtn = document.getElementById("sdm-cancel");
    var confirmBtn = document.getElementById("sdm-confirm");
    if (!merchantEl || !cancelBtn || !confirmBtn) return;

    var pendingForm = null;

    function openModal(form, labelText) {
      pendingForm = form;
      merchantEl.textContent = labelText || "";
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      confirmBtn.focus();
    }

    function closeModal() {
      pendingForm = null;
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
    }

    cancelBtn.addEventListener("click", closeModal);
    confirmBtn.addEventListener("click", function () {
      if (pendingForm) pendingForm.submit();
      closeModal();
    });

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) closeModal();
    });

    document.querySelectorAll(".js-open-soft-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var form = btn.closest("form");
        var label =
          btn.getAttribute("data-delete-label") || btn.getAttribute("data-merchant") || "";
        openModal(form, label);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
