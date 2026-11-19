import { eq, and, ne, sql, lt } from "drizzle-orm";
import { db, schema } from "./db";
const credited = sql`coalesce(${schema.payment.amountReceivedPaise}, 0) + coalesce(${schema.payment.tdsDeductedPaise}, 0)`;

/** invoiceId → total credited (received + tds), for a tenant. */
export async function creditedByInvoice(orgId) {
  const rows = await db.select({
    invoiceId: schema.payment.invoiceId,
    credited: sql`sum(${credited})`
  }).from(schema.payment).where(and(eq(schema.payment.organizationId, orgId), sql`${schema.payment.invoiceId} is not null`)).groupBy(schema.payment.invoiceId);
  return new Map(rows.map(r => [r.invoiceId, BigInt(r.credited)]));
}

/**
 * Total outstanding per client, computed in SQL:
 * sum over non-cancelled invoices of (total − payments credited), where balance > 0.
 */
export async function outstandingByClient(orgId) {
  const credits = creditsSubquery(orgId);
  const rows = await db.select({
    clientId: schema.invoice.clientId,
    balance: sql`(${schema.invoice.totalPaise} - coalesce(${credits.credited}, 0))`
  }).from(schema.invoice).leftJoin(credits, eq(credits.invoiceId, schema.invoice.id)).where(and(eq(schema.invoice.organizationId, orgId), ne(schema.invoice.status, "cancelled")));
  const map = new Map();
  for (const r of rows) {
    const bal = BigInt(r.balance);
    if (bal > 0) map.set(r.clientId, (map.get(r.clientId) ?? BigInt(0)) + bal);
  }
  return map;
}

/** Subquery: invoiceId → total payments credited, scoped to a tenant. */
function creditsSubquery(orgId) {
  return db.select({
    invoiceId: schema.payment.invoiceId,
    credited: sql`sum(${credited})`.as("credited")
  }).from(schema.payment).where(eq(schema.payment.organizationId, orgId)).groupBy(schema.payment.invoiceId).as("credits");
}
export async function dashboardStats(orgId) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyStartDate = new Date(fyStart, 3, 1);
  const soon = new Date(now.getTime() + 14 * 86400000);
  const credits = creditsSubquery(orgId);
  const [invoices, paymentsAgg, tasksAgg, clientsAgg] = await Promise.all([
  // outstanding total + open invoice count (one row per non-cancelled invoice, balance computed in SQL)
  db.select({
    balance: sql`(${schema.invoice.totalPaise} - coalesce(${credits.credited}, 0))`
  }).from(schema.invoice).leftJoin(credits, eq(credits.invoiceId, schema.invoice.id)).where(and(eq(schema.invoice.organizationId, orgId), ne(schema.invoice.status, "cancelled"))),
  // month collections + FY TDS in one aggregated pass
  db.select({
    collected: sql`coalesce(sum(case when ${schema.payment.paymentDate} >= ${monthStart} and ${schema.payment.paymentDate} < ${monthEnd} then ${schema.payment.amountReceivedPaise} else 0 end), 0)`,
    tds: sql`coalesce(sum(case when ${schema.payment.paymentDate} >= ${fyStartDate} then ${schema.payment.tdsDeductedPaise} else 0 end), 0)`
  }).from(schema.payment).where(eq(schema.payment.organizationId, orgId)), db.select({
    dueSoon: sql`count(*) filter (where ${schema.complianceTask.dueDate} >= ${now} and ${schema.complianceTask.dueDate} <= ${soon})`,
    overdue: sql`count(*) filter (where ${schema.complianceTask.dueDate} < ${now})`
  }).from(schema.complianceTask).where(and(eq(schema.complianceTask.organizationId, orgId), ne(schema.complianceTask.status, "completed"))), db.select({
    count: sql`count(*)`
  }).from(schema.client).where(and(eq(schema.client.organizationId, orgId), eq(schema.client.isActive, true)))]);
  let outstanding = BigInt(0);
  let openInvoices = 0;
  for (const r of invoices) {
    const bal = BigInt(r.balance);
    if (bal > 0) {
      outstanding += bal;
      openInvoices++;
    }
  }
  return {
    outstandingPaise: outstanding,
    collectedThisMonthPaise: BigInt(paymentsAgg[0]?.collected ?? "0"),
    tdsThisFyPaise: BigInt(paymentsAgg[0]?.tds ?? "0"),
    tasksDueSoon: Number(tasksAgg[0]?.dueSoon ?? 0),
    tasksOverdue: Number(tasksAgg[0]?.overdue ?? 0),
    activeClients: Number(clientsAgg[0]?.count ?? 0),
    openInvoices
  };
}
export async function upcomingTasks(orgId, limit = 10) {
  return db.query.complianceTask.findMany({
    where: and(eq(schema.complianceTask.organizationId, orgId), ne(schema.complianceTask.status, "completed"), lt(schema.complianceTask.dueDate, new Date(Date.now() + 30 * 86400000))),
    with: {
      client: {
        columns: {
          name: true
        }
      },
      assignedTo: {
        columns: {
          name: true
        }
      }
    },
    orderBy: (t, {
      asc
    }) => [asc(t.dueDate)],
    limit
  });
}
export async function recentPayments(orgId, limit = 8) {
  return db.query.payment.findMany({
    where: eq(schema.payment.organizationId, orgId),
    with: {
      client: {
        columns: {
          name: true
        }
      },
      invoice: {
        columns: {
          invoiceNo: true
        }
      }
    },
    orderBy: (t, {
      desc
    }) => [desc(t.paymentDate)],
    limit
  });
}
export async function recentInvoices(orgId, limit = 8) {
  return db.query.invoice.findMany({
    where: and(eq(schema.invoice.organizationId, orgId), ne(schema.invoice.status, "cancelled")),
    with: {
      client: {
        columns: {
          name: true
        }
      }
    },
    orderBy: (t, {
      desc
    }) => [desc(t.invoiceDate), desc(t.createdAt)],
    limit
  });
}

/** Unfinished compliance tasks already past due — powers the topbar bell badge. */
export async function overdueTaskCount(orgId) {
  const rows = await db.select({
    count: sql`count(*)`
  }).from(schema.complianceTask).where(and(eq(schema.complianceTask.organizationId, orgId), ne(schema.complianceTask.status, "completed"), lt(schema.complianceTask.dueDate, new Date())));
  return Number(rows[0]?.count ?? 0);
}

// ============================================================
// Dashboard analytics — chart/panel aggregates (rupees, not paise,
// for anything crossing the server → client boundary)
// ============================================================

const FY_MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
function monthIndex(date, fyStartYear) {
  return (date.getFullYear() - fyStartYear) * 12 + date.getMonth() - 3;
}
export async function dashboardAnalytics(orgId) {
  const now = new Date();
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyStart = new Date(fyStartYear, 3, 1);
  const fyEnd = new Date(fyStartYear + 1, 3, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [invRows, payRows, credits] = await Promise.all([db.query.invoice.findMany({
    where: and(eq(schema.invoice.organizationId, orgId), ne(schema.invoice.status, "cancelled")),
    columns: {
      id: true,
      clientId: true,
      totalPaise: true,
      invoiceDate: true,
      dueDate: true,
      status: true
    },
    with: {
      client: {
        columns: {
          name: true
        }
      }
    }
  }), db.query.payment.findMany({
    where: eq(schema.payment.organizationId, orgId),
    columns: {
      paymentDate: true,
      amountReceivedPaise: true,
      tdsDeductedPaise: true
    }
  }), creditedByInvoice(orgId)]);
  const monthly = FY_MONTHS.map(month => ({
    month,
    billed: 0,
    collected: 0,
    tds: 0
  }));
  const currentIdx = monthIndex(now, fyStartYear);
  const aging = [{
    label: "Not due yet",
    amount: 0,
    count: 0
  }, {
    label: "1–30 days",
    amount: 0,
    count: 0
  }, {
    label: "31–60 days",
    amount: 0,
    count: 0
  }, {
    label: "61–90 days",
    amount: 0,
    count: 0
  }, {
    label: "90+ days",
    amount: 0,
    count: 0
  }];
  const agingIdx = daysPastDue => daysPastDue < 0 ? 0 : daysPastDue <= 30 ? 1 : daysPastDue <= 60 ? 2 : daysPastDue <= 90 ? 3 : 4;
  const statusAgg = new Map();
  const debtorMap = new Map();
  let overdue = BigInt(0);
  let billedFy = BigInt(0);
  for (const inv of invRows) {
    if (inv.status === "cancelled") continue;
    const balance = inv.totalPaise - (credits.get(inv.id) ?? BigInt(0));
    if (inv.invoiceDate >= fyStart && inv.invoiceDate < fyEnd) {
      billedFy += inv.totalPaise;
      const idx = monthIndex(inv.invoiceDate, fyStartYear);
      if (idx >= 0 && idx < 12) monthly[idx].billed += Number(inv.totalPaise) / 100;
    }
    const s = statusAgg.get(inv.status) ?? {
      status: inv.status,
      count: 0,
      amount: 0
    };
    s.count += 1;
    s.amount += Number(inv.totalPaise) / 100;
    statusAgg.set(inv.status, s);
    if (balance > 0) {
      const daysPastDue = Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400000);
      const b = aging[agingIdx(daysPastDue)];
      b.amount += Number(balance) / 100;
      b.count += 1;
      if (daysPastDue > 0) overdue += balance;
      const d = debtorMap.get(inv.clientId) ?? {
        clientId: inv.clientId,
        name: inv.client.name,
        amount: 0
      };
      d.amount += Number(balance) / 100;
      debtorMap.set(inv.clientId, d);
    }
  }
  let prevMonth = BigInt(0);
  for (const p of payRows) {
    if (p.paymentDate >= fyStart && p.paymentDate < fyEnd) {
      const idx = monthIndex(p.paymentDate, fyStartYear);
      if (idx >= 0 && idx < 12) {
        monthly[idx].collected += Number(p.amountReceivedPaise) / 100;
        monthly[idx].tds += Number(p.tdsDeductedPaise) / 100;
      }
    }
    if (p.paymentDate >= prevMonthStart && p.paymentDate < monthStart) prevMonth += p.amountReceivedPaise;
  }
  const STATUS_ORDER = ["sent", "partial", "draft", "paid"];
  return {
    fy: `${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, "0")}`,
    monthly: monthly.slice(0, Math.max(1, currentIdx + 1)),
    aging,
    status: STATUS_ORDER.map(s => statusAgg.get(s) ?? {
      status: s,
      count: 0,
      amount: 0
    }),
    topDebtors: [...debtorMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 5),
    overduePaise: overdue,
    billedThisFyPaise: billedFy,
    collectedPrevMonthPaise: prevMonth
  };
}
