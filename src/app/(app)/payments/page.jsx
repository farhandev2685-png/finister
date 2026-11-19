import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { getCtx } from "@/lib/tenant";
import { db, schema } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { financialYear } from "@/lib/fy";
import { PageHeader } from "@/components/page-header";
import { PaymentRowActions } from "@/components/payment-row-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
function fmtDate(d) {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
export default async function PaymentsPage() {
  const ctx = await getCtx();
  const payments = await db.query.payment.findMany({
    where: eq(schema.payment.organizationId, ctx.orgId),
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
    orderBy: [desc(schema.payment.paymentDate)]
  });
  const now = new Date();
  const fyStart = new Date(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, 3, 1);
  let fyReceived = BigInt(0);
  let fyTds = BigInt(0);
  for (const p of payments) {
    if (p.paymentDate >= fyStart) {
      fyReceived += p.amountReceivedPaise;
      fyTds += p.tdsDeductedPaise;
    }
  }
  return <div>
      <PageHeader title="Payments & TDS" description="Collections and tax deducted at source">
        <Button render={<Link href="/payments/new" />}>
          <Plus className="mr-1 h-4 w-4" /> Record payment
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Received this FY ({financialYear(now)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatINR(fyReceived)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              TDS deducted this FY (receivable — reconcile with 26AS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatINR(fyTds)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Ref</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">TDS</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 && <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>}
              {payments.map(p => <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.receiptNo ?? "—"}</TableCell>
                  <TableCell>{fmtDate(p.paymentDate)}</TableCell>
                  <TableCell>{p.client.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.invoice?.invoiceNo ?? "Advance"}</TableCell>
                  <TableCell className="uppercase">{p.mode}</TableCell>
                  <TableCell className="text-muted-foreground">{p.referenceNo ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatINR(p.amountReceivedPaise)}</TableCell>
                  <TableCell className="text-right">
                    {p.tdsDeductedPaise > 0 ? `${formatINR(p.tdsDeductedPaise)} (${p.tdsSection})` : "—"}
                  </TableCell>
                  <TableCell>
                    <PaymentRowActions paymentId={p.id} canDelete={ctx.role !== "member"} />
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>;
}
