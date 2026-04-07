(function () {
  function addMonthsIso(isoDate, months) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate || ""))) return "";
    var y = Number(isoDate.slice(0, 4));
    var m = Number(isoDate.slice(5, 7));
    var d = Number(isoDate.slice(8, 10));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";

    var target = new Date(Date.UTC(y, (m - 1) + months, 1));
    var ty = target.getUTCFullYear();
    var tm = target.getUTCMonth();
    var lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
    var fd = Math.min(d, lastDay);
    var out = new Date(Date.UTC(ty, tm, fd));
    return out.toISOString().slice(0, 10);
  }

  function openDatePicker(input) {
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch (_) {
        // Some browsers may block showPicker without user gesture.
      }
    }
  }

  document.querySelectorAll(".js-date-btn").forEach(function (btn) {
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      var targetId = btn.getAttribute("data-target");
      var input = document.getElementById(targetId);
      openDatePicker(input);
    });
  });

  var manufacturedInput = document.getElementById("manufactured_at");
  var maintenanceInput = document.getElementById("maintenance_at");
  var maintenanceModeEls = document.querySelectorAll('input[name="maintenance_mode"]');
  var maintenanceBtn = document.querySelector('.js-date-btn[data-target="maintenance_at"]');

  if (!manufacturedInput || !maintenanceInput || !maintenanceModeEls.length) return;

  function currentMode() {
    var selected = document.querySelector('input[name="maintenance_mode"]:checked');
    return selected ? selected.value : "auto";
  }

  function syncMaintenanceFromMode() {
    var mode = currentMode();
    var isAuto = mode !== "manual";
    if (isAuto) {
      maintenanceInput.value = addMonthsIso(manufacturedInput.value, 3);
      maintenanceInput.setAttribute("readonly", "readonly");
      maintenanceInput.classList.add("readonly");
      if (maintenanceBtn) {
        maintenanceBtn.setAttribute("disabled", "disabled");
        maintenanceBtn.style.opacity = "0.55";
        maintenanceBtn.style.cursor = "not-allowed";
      }
      return;
    }
    maintenanceInput.removeAttribute("readonly");
    maintenanceInput.classList.remove("readonly");
    if (maintenanceBtn) {
      maintenanceBtn.removeAttribute("disabled");
      maintenanceBtn.style.opacity = "";
      maintenanceBtn.style.cursor = "";
    }
  }

  manufacturedInput.addEventListener("input", syncMaintenanceFromMode);
  manufacturedInput.addEventListener("change", syncMaintenanceFromMode);
  maintenanceModeEls.forEach(function (el) {
    el.addEventListener("change", syncMaintenanceFromMode);
  });
  syncMaintenanceFromMode();
})();
