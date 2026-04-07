/**
 * Di viewport sempit, tabel di .shell-content ditampilkan sebagai list kartu
 * (label dari <th> → data-label pada <td>). CSP-safe.
 */
(function () {
  "use strict";

  function labelFromTh(th) {
    var t = th.textContent || "";
    return t.replace(/\s+/g, " ").trim();
  }

  function enhanceTable(table) {
    if (table.getAttribute("data-fx-cards") === "off") return;
    if (table.dataset.fxCardsEnhance === "1") return;

    var thead = table.querySelector("thead");
    var tbody = table.querySelector("tbody");
    if (!thead || !tbody) return;

    var headerRow = thead.querySelector("tr");
    if (!headerRow) return;

    if (headerRow.querySelector("[colspan]")) return;

    var ths = headerRow.querySelectorAll("th");
    if (!ths.length) return;

    var labels = [];
    for (var i = 0; i < ths.length; i++) {
      labels.push(labelFromTh(ths[i]) || "—");
    }

    var rows = tbody.querySelectorAll("tr");
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      if (row.querySelector("td[colspan], th[colspan]")) {
        row.classList.add("fx-tr-span");
        continue;
      }

      var tds = row.querySelectorAll("td");
      for (var c = 0; c < tds.length; c++) {
        tds[c].setAttribute("data-label", labels[c] != null ? labels[c] : "—");
      }
    }

    table.classList.add("fx-table-cards");
    table.dataset.fxCardsEnhance = "1";
  }

  function init() {
    var root = document.querySelector(".shell-content");
    if (!root) return;
    root.querySelectorAll("table").forEach(enhanceTable);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
