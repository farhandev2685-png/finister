const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});
const inr0 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

/** Format paise as ₹ string. Pass decimals: 0 for whole rupees (₹2,40,000). */
export function formatINR(paise, opts) {
  const rupees = Number(paise) / 100;
  return (opts?.decimals === 0 ? inr0 : inr).format(rupees);
}

/** Compact Indian notation for tight spaces: ₹850, ₹1.5L, ₹2.3Cr. Accepts paise. */
export function formatINRCompact(paise) {
  const r = Number(paise) / 100;
  const abs = Math.abs(r);
  const trim = n => {
    const s = n >= 100 ? n.toFixed(0) : n.toFixed(1);
    return s.endsWith(".0") ? s.slice(0, -2) : s;
  };
  if (abs >= 1e7) return `₹${trim(r / 1e7)}Cr`;
  if (abs >= 1e5) return `₹${trim(r / 1e5)}L`;
  if (abs >= 1e3) return `₹${trim(r / 1e3)}k`;
  return `₹${Math.round(r)}`;
}

/** Parse a rupee string/number ("1,234.56" or 1234.56) into paise */
export function toPaise(rupees) {
  const n = typeof rupees === "string" ? parseFloat(rupees.replace(/,/g, "")) : rupees;
  if (Number.isNaN(n)) return BigInt(0);
  return BigInt(Math.round(n * 100));
}
export function paiseToNumber(paise) {
  return Number(paise) / 100;
}
