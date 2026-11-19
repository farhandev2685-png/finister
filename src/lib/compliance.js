import { monthLabel, fyStartYear } from "./fy";
export const TASK_TEMPLATES = [
// GST
{
  key: "gstr1",
  title: "GSTR-1 filing",
  category: "gst",
  rule: {
    type: "monthly",
    day: 11
  }
}, {
  key: "gstr3b",
  title: "GSTR-3B filing",
  category: "gst",
  rule: {
    type: "monthly",
    day: 20
  }
},
// TDS
{
  key: "tds_pay",
  title: "TDS payment (challan)",
  category: "tds",
  rule: {
    type: "monthly",
    day: 7
  }
}, {
  key: "tds_return",
  title: "TDS return (24Q/26Q)",
  category: "tds",
  rule: {
    type: "fixed",
    month: 7,
    day: 31
  } // placeholder; expanded below
},
// ITR
{
  key: "itr",
  title: "ITR filing (non-audit)",
  category: "itr",
  rule: {
    type: "fixed",
    month: 7,
    day: 31
  }
}, {
  key: "advance_tax",
  title: "Advance tax instalment",
  category: "itr",
  rule: {
    type: "fixed",
    month: 6,
    day: 15
  } // placeholder; expanded below
},
// Audit
{
  key: "tax_audit",
  title: "Tax audit report",
  category: "audit",
  rule: {
    type: "fixed",
    month: 9,
    day: 30
  }
}, {
  key: "audit_itr",
  title: "ITR filing (audit cases)",
  category: "audit",
  rule: {
    type: "fixed",
    month: 10,
    day: 31
  }
},
// ROC (companies)
{
  key: "aoc4",
  title: "ROC AOC-4 (financials)",
  category: "roc",
  rule: {
    type: "fixed",
    month: 10,
    day: 30
  }
}, {
  key: "mgt7",
  title: "ROC MGT-7 (annual return)",
  category: "roc",
  rule: {
    type: "fixed",
    month: 11,
    day: 29
  }
},
// Bookkeeping
{
  key: "books",
  title: "Monthly books update",
  category: "bookkeeping",
  rule: {
    type: "monthly",
    day: 10
  }
}];
/**
 * Expand a template into concrete due dates for a financial year.
 * FY "2026-27" covers Apr 2026 – Mar 2027.
 */
function expandTemplate(tpl, fy) {
  const y0 = fyStartYear(fy);
  const out = [];
  // Calendar months covered by the FY: Apr(y0)..Dec(y0), Jan..Mar(y0+1)
  const fyMonths = [];
  for (let m = 4; m <= 12; m++) fyMonths.push({
    y: y0,
    m
  });
  for (let m = 1; m <= 3; m++) fyMonths.push({
    y: y0 + 1,
    m
  });
  if (tpl.rule.type === "monthly") {
    for (const {
      y,
      m
    } of fyMonths) {
      out.push({
        title: tpl.title,
        dueDate: new Date(Date.UTC(y, m - 1, tpl.rule.day)),
        period: monthLabel(y, m - 1)
      });
    }
  } else {
    const {
      month,
      day
    } = tpl.rule;
    const y = month >= 4 ? y0 : y0 + 1;
    out.push({
      title: tpl.title,
      dueDate: new Date(Date.UTC(y, month - 1, day)),
      period: `FY ${fy}`
    });
  }
  return out;
}

// Hand-expanded for multi-date templates
const EXTRA_FIXED = {
  tds_return: [{
    month: 7,
    day: 31
  },
  // Q1
  {
    month: 10,
    day: 31
  },
  // Q2
  {
    month: 1,
    day: 31
  },
  // Q3
  {
    month: 5,
    day: 31
  } // Q4 (next FY start year, handled below)
  ],
  advance_tax: [{
    month: 6,
    day: 15,
    label: "Advance tax (15%)"
  }, {
    month: 9,
    day: 15,
    label: "Advance tax (45%)"
  }, {
    month: 12,
    day: 15,
    label: "Advance tax (75%)"
  }, {
    month: 3,
    day: 15,
    label: "Advance tax (100%)"
  }]
};
export function tasksForCategory(category, fy) {
  const y0 = fyStartYear(fy);
  const out = [];
  for (const tpl of TASK_TEMPLATES) {
    if (tpl.category !== category) continue;
    const extra = EXTRA_FIXED[tpl.key];
    if (extra) {
      for (const e of extra) {
        // months 4–12 belong to y0; months 1–5 land in y0+1 (Q4 TDS files in May)
        const y = e.month >= 4 ? y0 : y0 + 1;
        out.push({
          title: e.label ?? tpl.title,
          dueDate: new Date(Date.UTC(y, e.month - 1, e.day)),
          period: `FY ${fy}`
        });
      }
    } else {
      out.push(...expandTemplate(tpl, fy));
    }
  }
  return out;
}
