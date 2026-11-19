/** Indian financial year: April–March. FY for a date → "2026-27". */
export function financialYear(date) {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-based; April = 3
  const start = m >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** Label helper: Oct 2026 → "Oct 2026" */
export function monthLabel(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric"
  });
}

/** FY start year: "2026-27" → 2026 */
export function fyStartYear(fy) {
  return parseInt(fy.slice(0, 4), 10);
}
