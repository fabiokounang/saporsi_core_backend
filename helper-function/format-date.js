// helper-function/formatDateId.js
const pad2 = (n) => String(n).padStart(2, "0");

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  // handle MySQL DATETIME string "YYYY-MM-DD HH:mm:ss[.fff]"
  if (typeof value === "string" && value.includes(" ")) {
    // parse as local time safely
    const isoLike = value.replace(" ", "T");
    const d = new Date(isoLike);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * ALWAYS subtract 7 hours from the input time, then format in Indonesian.
 * Output: "28 Desember 2025 16:00:33"
 */
exports.formatDateId = (value) => {
  const d = toDate(value);
  if (!d) return "-";

  // subtract 7 hours
  const fixed = new Date(d.getTime() - (7 * 60 * 60 * 1000));

  const day = fixed.getDate();
  const monthName = MONTHS_ID[fixed.getMonth()];
  const year = fixed.getFullYear();

  const hh = pad2(fixed.getHours());
  const mm = pad2(fixed.getMinutes());
  const ss = pad2(fixed.getSeconds());

  return `${day} ${monthName} ${year} ${hh}:${mm}:${ss}`;
};
