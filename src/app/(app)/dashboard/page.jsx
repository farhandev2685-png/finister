import Link from "next/link";
import { ArrowUpRight, HandCoins, Plus, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import { getCtx } from "@/lib/tenant";
import { dashboardStats, dashboardAnalytics, upcomingTasks, recentPayments, recentInvoices, creditedByInvoice } from "@/lib/queries";
import { formatINR, formatINRCompact } from "@/lib/money";
import { CashflowChart, DonutChart } from "@/components/dashboard-charts";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
function fmtDate(d) {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
function timeAgo(d) {
  const mins = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return fmtDate(d);
}
function tint(color, alpha = 14) {
  return {
    background: `color-mix(in oklch, ${color} ${alpha}%, transparent)`,
    color
  };
}
function pillOutline(color) {
  return {
    borderColor: `color-mix(in oklch, ${color} 45%, transparent)`,
    color,
    background: `color-mix(in oklch, ${color} 9%, transparent)`
  };
}
const AGING_COLORS = ["var(--chart-3)", "var(--chart-2)", "var(--chart-4)", "oklch(0.62 0.19 45)", "var(--chart-5)"];
/* Green ramp for the pipeline donut, like the reference "Statistic" card. */
const DONUT_META = {
  sent: {
    label: "Awaiting payment",
    color: "var(--chart-2)",
    dark: false
  },
  partial: {
    label: "Partially paid",
    color: "var(--chart-3)",
    dark: true
  },
  draft: {
    label: "Draft",
    color: "oklch(0.76 0.02 150)",
    dark: false
  },
  paid: {
    label: "Paid",
    color: "var(--chart-1)",
    dark: true
  }
};
const PILL_COLORS = {
  paid: "var(--chart-3)",
  sent: "var(--chart-4)",
  partial: "var(--chart-4)",
  overdue: "var(--chart-5)",
  draft: "var(--muted-foreground)"
};
const STAT_TONES = {
  good: "bg-lime text-forest",
  bad: "bg-destructive text-white",
  neutral: "bg-muted text-muted-foreground"
};
const ACTIVITY_COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "oklch(0.55 0.1 165)"];
export default async function DashboardPage() {
  const ctx = await getCtx();
  const [stats, a, tasks, payments, invoices, credits] = await Promise.all([dashboardStats(ctx.orgId), dashboardAnalytics(ctx.orgId), upcomingTasks(ctx.orgId, 6), recentPayments(ctx.orgId, 6), recentInvoices(ctx.orgId, 7), creditedByInvoice(ctx.orgId)]);
  const now = new Date();
  const overduePct = stats.outstandingPaise > 0 ? Math.round(Number(a.overduePaise) / Number(stats.outstandingPaise) * 100) : 0;
  const collectedDelta = a.collectedPrevMonthPaise > 0 ? Math.round((Number(stats.collectedThisMonthPaise) - Number(a.collectedPrevMonthPaise)) / Number(a.collectedPrevMonthPaise) * 100) : null;
  const statCards = [{
    label: "Collected",
    value: formatINRCompact(stats.collectedThisMonthPaise),
    pill: collectedDelta === null ? "This month" : `${collectedDelta >= 0 ? "+" : ""}${collectedDelta}%`,
    pillTone: collectedDelta === null ? "neutral" : collectedDelta >= 0 ? "good" : "bad",
    caption: a.collectedPrevMonthPaise > 0 ? `Last month ${formatINRCompact(a.collectedPrevMonthPaise)}` : "No payments last month",
    href: "/payments"
  }, {
    label: "Outstanding",
    value: formatINRCompact(stats.outstandingPaise),
    pill: overduePct > 0 ? `${overduePct}% overdue` : "On track",
    pillTone: overduePct > 0 ? "bad" : "good",
    caption: `${stats.openInvoices} open ${stats.openInvoices === 1 ? "invoice" : "invoices"}`,
    href: "/invoices?status=open"
  }, {
    label: "TDS receivable",
    value: formatINRCompact(stats.tdsThisFyPaise),
    pill: "To reconcile",
    pillTone: "neutral",
    caption: `FY ${a.fy} · Sec 26AS`,
    href: "/payments"
  }];
  const agingTotal = a.aging.reduce((s, b) => s + b.amount, 0);
  const invoiceCount = a.status.reduce((s, x) => s + x.count, 0);
  const maxDebtor = a.topDebtors[0]?.amount ?? 0;
  const donutData = a.status.filter(s => s.count > 0).map(s => ({
    name: DONUT_META[s.status].label,
    value: s.count,
    color: DONUT_META[s.status].color
  }));
  const dueLabel = due => {
    const days = Math.ceil((due.getTime() - now.getTime()) / 86400000);
    if (days < 0) return {
      text: `${-days}d overdue`,
      cls: "text-destructive"
    };
    if (days === 0) return {
      text: "Today",
      cls: "text-[var(--chart-4)]"
    };
    if (days <= 3) return {
      text: `in ${days}d`,
      cls: "text-[var(--chart-4)]"
    };
    return {
      text: `in ${days}d`,
      cls: "text-muted-foreground"
    };
  };
  return <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">
          FY {a.fy} · Apr–Mar · {ctx.orgName}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href="/payments/new" />}>
            <HandCoins className="mr-1 h-4 w-4" /> Record payment
          </Button>
          <Button size="sm" className="bg-lime text-forest hover:bg-lime/90" render={<Link href="/invoices/new" />}>
            <Plus className="mr-1 h-4 w-4" /> New invoice
          </Button>
        </div>
      </div>

      {stats.tasksOverdue > 0 && <div className="mb-5 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm">
          <TriangleAlert className="h-4 w-4 shrink-0 text-destructive" />
          <span>
            <span className="font-semibold">{stats.tasksOverdue}</span> compliance{" "}
            {stats.tasksOverdue === 1 ? "task is" : "tasks are"} overdue
          </span>
          <Link href="/compliance" className="ml-auto inline-flex items-center gap-1 font-medium text-destructive hover:underline">
            Review <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative flex min-h-[176px] flex-col overflow-hidden rounded-2xl bg-forest p-5 text-white shadow-[0_1px_3px_rgb(23_23_43/0.06),0_8px_24px_-12px_rgb(23_23_43/0.1)]">
          <div className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full border-[20px] border-white/5" />
          <div className="pointer-events-none absolute -right-4 -top-8 h-28 w-28 rounded-full border-[12px] border-white/5" />
          <div className="relative flex items-start justify-between gap-2">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
              {ctx.orgName}
            </p>
            <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-lime" />
          </div>
          <div className="relative mt-auto pt-8">
            <p className="text-[11px] font-medium text-white/60">Total outstanding</p>
            <p className="mt-1 text-[30px] font-semibold leading-none tracking-tight tabular-nums">
              {formatINR(stats.outstandingPaise, {
              decimals: 0
            })}
            </p>
          </div>
          <div className="relative mt-5 flex items-end justify-between">
            <div>
              <p className="text-[9px] font-medium uppercase tracking-widest text-white/45">Fiscal year</p>
              <p className="mt-0.5 text-[11px] font-semibold text-white/85">FY {a.fy}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-medium uppercase tracking-widest text-white/45">Open invoices</p>
              <p className="mt-0.5 text-[11px] font-semibold text-white/85">{stats.openInvoices}</p>
            </div>
          </div>
        </div>

        {statCards.map(k => <Link key={k.label} href={k.href} className="group flex flex-col rounded-2xl bg-card p-5 ring-1 ring-foreground/5 shadow-[0_1px_3px_rgb(23_23_43/0.06),0_8px_24px_-12px_rgb(23_23_43/0.1)] transition-shadow hover:shadow-md">
            <p className="text-[13px] font-medium text-muted-foreground">{k.label}</p>
            <p className="mt-2 text-[30px] font-semibold leading-none tracking-tight tabular-nums">{k.value}</p>
            <div className="mt-auto flex items-center gap-2 pt-4">
              <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${STAT_TONES[k.pillTone]}`}>
                {k.pillTone === "good" && <TrendingUp className="h-3 w-3" />}
                {k.pillTone === "bad" && <TrendingDown className="h-3 w-3" />}
                {k.pill}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">{k.caption}</span>
            </div>
          </Link>)}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold">Cashflow</CardTitle>
            <p className="mt-1.5 text-xs text-muted-foreground">Total billed</p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              {formatINR(a.billedThisFyPaise, {
              decimals: 0
            })}
            </p>
            <CardAction>
              <span className="rounded-full border px-3 py-1 text-[11px] font-medium text-muted-foreground">
                FY {a.fy}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-1">
            <CashflowChart data={a.monthly} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold">Invoice pipeline</CardTitle>
            <CardAction>
              <Link href="/invoices" className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5 pt-2">
            {invoiceCount === 0 ? <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No invoices yet.</p>
                <Link href="/invoices/new" className="mt-1 inline-block text-sm font-medium text-primary hover:underline">
                  Create your first invoice
                </Link>
              </div> : <>
                <DonutChart data={donutData} center={<>
                      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Total</span>
                      <span className="text-[26px] font-semibold leading-tight tabular-nums">{invoiceCount}</span>
                      <span className="text-[11px] text-muted-foreground">invoices</span>
                    </>} />
                <div className="w-full space-y-2.5">
                  {a.status.filter(s => s.count > 0).map(s => {
                const meta = DONUT_META[s.status];
                return <div key={s.status} className="flex items-center gap-2.5 text-[13px]">
                          <span className="min-w-11 rounded-md px-1.5 py-0.5 text-center text-[11px] font-bold" style={{
                    background: meta.color,
                    color: meta.dark ? "#fff" : "var(--forest)"
                  }}>
                            {Math.round(s.count / invoiceCount * 100)}%
                          </span>
                          <span className="truncate text-muted-foreground">{meta.label}</span>
                          <span className="ml-auto font-medium tabular-nums">
                            {formatINRCompact(Math.round(s.amount * 100))}
                          </span>
                        </div>;
              })}
                </div>
              </>}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-[15px] font-semibold">Recent invoices</CardTitle>
          <p className="text-xs text-muted-foreground">Latest invoices across clients</p>
          <CardAction>
            <Link href="/invoices" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? <div className="px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
              <Link href="/invoices/new" className="mt-1 inline-block text-sm font-medium text-primary hover:underline">
                Create your first invoice
              </Link>
            </div> : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="pr-6 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(inv => {
              const balance = inv.totalPaise - (credits.get(inv.id) ?? BigInt(0));
              const shown = balance > 0 && inv.dueDate < now && inv.status !== "paid" ? "overdue" : inv.status;
              return <TableRow key={inv.id}>
                      <TableCell className="pl-6">
                        <Link href={`/invoices/${inv.id}`} className="font-medium underline-offset-4 hover:underline">
                          {inv.invoiceNo}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{inv.client.name}</TableCell>
                      <TableCell className="text-muted-foreground">{fmtDate(inv.invoiceDate)}</TableCell>
                      <TableCell className="text-muted-foreground">{fmtDate(inv.dueDate)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatINR(inv.totalPaise, {
                    decimals: 0
                  })}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <span className="inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize" style={pillOutline(PILL_COLORS[shown] ?? "var(--chart-5)")}>
                          {shown}
                        </span>
                      </TableCell>
                    </TableRow>;
            })}
              </TableBody>
            </Table>}
        </CardContent>
        {invoices.length > 0 && <div className="flex items-center justify-between border-t px-6 py-3 text-xs text-muted-foreground">
            <span>
              Showing 1 to {invoices.length} of {invoiceCount} invoices
            </span>
            <Link href="/invoices" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>}
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
            <CardAction>
              <Link href="/payments" className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            {payments.length === 0 ? <div className="px-6 py-10 text-center">
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                <Link href="/payments/new" className="mt-1 inline-block text-sm font-medium text-primary hover:underline">
                  Record your first payment
                </Link>
              </div> : <ul className="divide-y">
                {payments.map((p, i) => <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={tint(ACTIVITY_COLORS[i % ACTIVITY_COLORS.length], 16)}>
                      <HandCoins className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">
                        {formatINRCompact(p.amountReceivedPaise)} received
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.client.name}
                        {p.invoice ? ` · ${p.invoice.invoiceNo}` : " · advance"}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(p.paymentDate)}</span>
                  </li>)}
              </ul>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Receivables aging</CardTitle>
            <CardAction>
              <Link href="/invoices?status=open" className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4">
            {agingTotal === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No outstanding balances.</p> : <>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  {a.aging.map((b, i) => b.amount > 0 ? <div key={b.label} className="h-full first:rounded-l-full last:rounded-r-full" style={{
                width: `${b.amount / agingTotal * 100}%`,
                background: AGING_COLORS[i]
              }} /> : null)}
                </div>
                <div className="space-y-2">
                  {a.aging.map((b, i) => <div key={b.label} className="flex items-center gap-2 text-[13px]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{
                  background: AGING_COLORS[i]
                }} />
                      <span className="text-muted-foreground">{b.label}</span>
                      <span className="text-muted-foreground/60">· {b.count}</span>
                      <span className="ml-auto font-medium tabular-nums">
                        {formatINRCompact(Math.round(b.amount * 100))}
                      </span>
                    </div>)}
                </div>
                <div className="mt-auto flex items-center justify-between border-t pt-3 text-sm">
                  <span className="text-muted-foreground">Total receivable</span>
                  <span className="font-semibold tabular-nums">
                    {formatINR(Math.round(agingTotal * 100), {
                  decimals: 0
                })}
                  </span>
                </div>
              </>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Deadlines</CardTitle>
            <CardAction>
              {stats.tasksOverdue > 0 ? <Badge variant="destructive">{stats.tasksOverdue} overdue</Badge> : stats.tasksDueSoon > 0 ? <Badge variant="secondary">{stats.tasksDueSoon} due soon</Badge> : <Link href="/compliance" className="text-xs font-medium text-primary hover:underline">
                  View all
                </Link>}
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            {tasks.length === 0 ? <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                Nothing due in 30 days — you&apos;re all caught up.
              </p> : <ul className="divide-y">
                {tasks.map(t => {
              const due = dueLabel(t.dueDate);
              return <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <span className="text-sm font-semibold leading-none tabular-nums">
                          {t.dueDate.getDate()}
                        </span>
                        <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide">
                          {t.dueDate.toLocaleDateString("en-IN", {
                      month: "short"
                    })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{t.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {t.client.name}
                          {t.assignedTo ? ` · ${t.assignedTo.name}` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 text-xs font-medium ${due.cls}`}>{due.text}</span>
                    </li>;
            })}
              </ul>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top outstanding clients</CardTitle>
            <CardAction>
              <Link href="/clients" className="text-xs font-medium text-primary hover:underline">
                All clients
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4">
            {a.topDebtors.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">
                No open balances — everyone&apos;s paid up.
              </p> : a.topDebtors.map(d => <Link key={d.clientId} href={`/clients/${d.clientId}`} className="group block">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="truncate text-[13px] font-medium group-hover:underline">{d.name}</span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                      {formatINRCompact(Math.round(d.amount * 100))}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{
                width: `${Math.max(2, d.amount / maxDebtor * 100)}%`,
                background: "var(--chart-1)",
                opacity: 0.75
              }} />
                  </div>
                </Link>)}
          </CardContent>
        </Card>
      </div>
    </div>;
}
