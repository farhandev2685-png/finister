import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and, desc } from "drizzle-orm";
import { getCtx } from "@/lib/tenant";
import { db, schema } from "@/lib/db";
import { invoiceCreditedPaise } from "@/lib/actions/invoices";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { InvoiceActions } from "@/components/invoice-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
function fmtDate(d) {
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
export default async function InvoiceDetailPage(props) {
  const {
    id
  } = await props.params;
  const ctx = await getCtx();
  const inv = await db.query.invoice.findFirst({
    where: and(eq(schema.invoice.id, id), eq(schema.invoice.organizationId, ctx.orgId)),
    with: {
      client: true,
      items: true,
      payments: {
        orderBy: [desc(schema.payment.paymentDate)]
      }
    }
  });
  if (!inv) notFound();
  const org = await db.query.organization.findFirst({
    where: eq(schema.organization.id, ctx.orgId)
  });
  const credited = await invoiceCreditedPaise(inv.id);
  const balance = inv.status === "cancelled" ? BigInt(0) : inv.totalPaise - credited;
  return <div>
      <PageHeader title={inv.invoiceNo} description={`${inv.client.name} · ${fmtDate(inv.invoiceDate)}`}>
        <Badge variant={inv.status === "paid" ? "secondary" : inv.status === "cancelled" ? "outline" : "default"} className="capitalize">
          {inv.status}
        </Badge>
        {inv.status !== "cancelled" && balance > 0 && <Button size="sm" render={<Link href={`/payments/new?client=${inv.clientId}&invoice=${inv.id}`} />}>
            Record payment
          </Button>}
        <InvoiceActions invoiceId={inv.id} status={inv.status} />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-between text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">{org?.name}</p>
                <p>GSTIN: {org?.gstin || "—"}</p>
              </div>
              <div className="text-right">
                <p>Due: {fmtDate(inv.dueDate)}</p>
                <p>Place of supply: {inv.placeOfSupply || "—"}</p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>SAC</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inv.items.map(it => <TableRow key={it.id}>
                    <TableCell>{it.description}</TableCell>
                    <TableCell className="text-muted-foreground">{it.sacCode || "—"}</TableCell>
                    <TableCell className="text-right">{it.quantity}</TableCell>
                    <TableCell className="text-right">{formatINR(it.ratePaise)}</TableCell>
                    <TableCell className="text-right">{formatINR(it.amountPaise)}</TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
            <Separator className="my-4" />
            <div className="ml-auto w-72 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatINR(inv.subtotalPaise)}</span>
              </div>
              {inv.cgstPaise > 0 && <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CGST 9%</span>
                    <span>{formatINR(inv.cgstPaise)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SGST 9%</span>
                    <span>{formatINR(inv.sgstPaise)}</span>
                  </div>
                </>}
              {inv.igstPaise > 0 && <div className="flex justify-between">
                  <span className="text-muted-foreground">IGST 18%</span>
                  <span>{formatINR(inv.igstPaise)}</span>
                </div>}
              <div className="flex justify-between border-t pt-1 text-base font-semibold">
                <span>Total</span>
                <span>{formatINR(inv.totalPaise)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Credited (paid + TDS)</span>
                <span>{formatINR(credited)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Balance due</span>
                <span>{formatINR(balance)}</span>
              </div>
            </div>
            {inv.notes && <p className="mt-4 text-sm text-muted-foreground">Notes: {inv.notes}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments against this invoice</CardTitle>
          </CardHeader>
          <CardContent>
            {inv.payments.length === 0 ? <p className="text-sm text-muted-foreground">No payments yet.</p> : <div className="space-y-3">
                {inv.payments.map(p => <div key={p.id} className="rounded-md border p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{formatINR(p.amountReceivedPaise)}</span>
                      <span className="text-muted-foreground">{fmtDate(p.paymentDate)}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-muted-foreground">
                      <span className="uppercase">{p.mode}</span>
                      <span>{p.receiptNo}</span>
                    </div>
                    {p.tdsDeductedPaise > 0 && <p className="mt-1 text-muted-foreground">
                        TDS u/s {p.tdsSection}: {formatINR(p.tdsDeductedPaise)}
                      </p>}
                    {p.referenceNo && <p className="text-muted-foreground">Ref: {p.referenceNo}</p>}
                  </div>)}
              </div>}
          </CardContent>
        </Card>
      </div>
    </div>;
}
