export const INDIAN_STATES = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];
export const GST_RATE = 18;
export const SAC_CODES = [{
  code: "998221",
  label: "Financial auditing services"
}, {
  code: "998222",
  label: "Accounting & bookkeeping services"
}, {
  code: "998223",
  label: "Tax preparation & filing services"
}, {
  code: "998224",
  label: "Payroll services"
}, {
  code: "998225",
  label: "Other accounting services"
}, {
  code: "998311",
  label: "Management consulting"
}];

/**
 * GST split: intra-state → CGST 9% + SGST 9%, inter-state → IGST 18%.
 * Returns paise amounts.
 */
export function computeGst(subtotalPaise, firmState, clientState) {
  const gst = subtotalPaise * BigInt(GST_RATE) / BigInt(100);
  const intraState = firmState && clientState && firmState.toLowerCase() === clientState.toLowerCase();
  if (intraState) {
    const half = gst / BigInt(2);
    return {
      cgst: half,
      sgst: gst - half,
      igst: BigInt(0)
    };
  }
  return {
    cgst: BigInt(0),
    sgst: BigInt(0),
    igst: gst
  };
}
