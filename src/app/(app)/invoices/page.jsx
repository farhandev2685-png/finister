import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { getCtx } from "@/lib/tenant";
import { db, schema } from "@/lib/db";
import { creditedByInvoice } from "@/lib/queries";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
function fmtDate(d) {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
const statusVariant = {
  draft: "outline",
  sent: "secondary",
  partial: "default",
  paid: "secondary",
  cancelled: "outline",
  overdue: "destructive"
};
export default async function InvoicesPage(props) {
  const sp = await props.searchParams;
  const filter = typeof sp.status === "string" ? sp.status : "all";
  const ctx = await getCtx();
  const [invoices, credits] = await Promise.all([db.query.invoice.findMany({
    where: eq(schema.invoice.organizationId, ctx.orgId),
    with: {
      client: {
        columns: {
          name: true
        }
      }
    },
    orderBy: [desc(schema.invoice.invoiceDate)]
  }), creditedByInvoice(ctx.orgId)]);
  const now = new Date();
  const rows = invoices.map(inv => {
    const credited = credits.get(inv.id) ?? BigInt(0);
    const balance = inv.status === "cancelled" ? BigInt(0) : inv.totalPaise - credited;
    const overdue = balance > 0 && inv.dueDate < now;
    const shown = overdue && inv.status !== "paid" ? "overdue" : inv.status;
    return {
      ...inv,
      balance,
      shown
    };
  }).filter(r => filter === "all" ? true : filter === "open" ? r.balance > 0 : r.shown === filter);
  return <div>
      <PageHeader title="Invoices" description="GST invoices and receivables">
        <Button variant={filter === "all" ? "secondary" : "outline"} size="sm" render={<Link href="/invoices" />}>
          All
        </Button>
        <Button variant={filter === "open" ? "secondary" : "outline"} size="sm" render={<Link href="/invoices?status=open" />}>
          Open
        </Button>
        <Button variant={filter === "overdue" ? "secondary" : "outline"} size="sm" render={<Link href="/invoices?status=overdue" />}>
          Overdue
        </Button>
        <Button render={<Link href="/invoices/new" />}>
          <Plus className="mr-1 h-4 w-4" /> New invoice
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No invoices found.
                  </TableCell>
                </TableRow>}
              {rows.map(inv => <TableRow key={inv.id}>
                  <TableCell>
                    <Link href={`/invoices/${inv.id}`} className="font-medium underline-offset-4 hover:underline">
                      {inv.invoiceNo}
                    </Link>
                  </TableCell>
                  <TableCell>{inv.client.name}</TableCell>
                  <TableCell>{fmtDate(inv.invoiceDate)}</TableCell>
                  <TableCell>{fmtDate(inv.dueDate)}</TableCell>
                  <TableCell className="text-right">{formatINR(inv.totalPaise)}</TableCell>
                  <TableCell className="text-right font-medium">{formatINR(inv.balance)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[inv.shown] ?? "secondary"} className="capitalize">
                      {inv.shown}
                    </Badge>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>;
}
