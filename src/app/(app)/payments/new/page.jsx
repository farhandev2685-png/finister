import { eq, and, ne } from "drizzle-orm";
import { getCtx } from "@/lib/tenant";
import { db, schema } from "@/lib/db";
import { creditedByInvoice } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { PaymentForm } from "@/components/forms/payment-form";
import { Card, CardContent } from "@/components/ui/card";
export default async function NewPaymentPage(props) {
  const sp = await props.searchParams;
  const defaultClientId = typeof sp.client === "string" ? sp.client : undefined;
  const defaultInvoiceId = typeof sp.invoice === "string" ? sp.invoice : undefined;
  const ctx = await getCtx();
  const [clients, invoices, credits] = await Promise.all([db.query.client.findMany({
    where: and(eq(schema.client.organizationId, ctx.orgId), eq(schema.client.isActive, true)),
    columns: {
      id: true,
      name: true
    },
    orderBy: (t, {
      asc
    }) => [asc(t.name)]
  }), db.query.invoice.findMany({
    where: and(eq(schema.invoice.organizationId, ctx.orgId), ne(schema.invoice.status, "cancelled")),
    columns: {
      id: true,
      clientId: true,
      invoiceNo: true,
      totalPaise: true
    }
  }), creditedByInvoice(ctx.orgId)]);
  const openInvoices = invoices.map(inv => ({
    id: inv.id,
    clientId: inv.clientId,
    invoiceNo: inv.invoiceNo,
    balancePaise: Number(inv.totalPaise - (credits.get(inv.id) ?? BigInt(0)))
  })).filter(i => i.balancePaise > 0);
  return <div>
      <PageHeader title="Record payment" />
      <Card>
        <CardContent className="pt-6">
          <PaymentForm clients={clients} openInvoices={openInvoices} defaultClientId={defaultClientId} defaultInvoiceId={defaultInvoiceId} />
        </CardContent>
      </Card>
    </div>;
}
