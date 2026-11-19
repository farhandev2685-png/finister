import { eq, and } from "drizzle-orm";
import { getCtx } from "@/lib/tenant";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { Card, CardContent } from "@/components/ui/card";
export default async function NewInvoicePage(props) {
  const sp = await props.searchParams;
  const defaultClientId = typeof sp.client === "string" ? sp.client : undefined;
  const ctx = await getCtx();
  const [clients, org] = await Promise.all([db.query.client.findMany({
    where: and(eq(schema.client.organizationId, ctx.orgId), eq(schema.client.isActive, true)),
    columns: {
      id: true,
      name: true,
      state: true
    },
    orderBy: (t, {
      asc
    }) => [asc(t.name)]
  }), db.query.organization.findFirst({
    where: eq(schema.organization.id, ctx.orgId)
  })]);
  return <div>
      <PageHeader title="New invoice" description="GST @18% applied automatically — CGST/SGST for same-state clients, IGST otherwise" />
      <Card>
        <CardContent className="pt-6">
          <InvoiceForm clients={clients} firmState={org?.state ?? null} defaultClientId={defaultClientId} />
        </CardContent>
      </Card>
    </div>;
}
