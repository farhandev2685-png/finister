import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and, desc } from "drizzle-orm";
import { getCtx } from "@/lib/tenant";
import { db, schema } from "@/lib/db";
import { creditedByInvoice } from "@/lib/queries";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { ClientEditDialog } from "@/components/forms/client-edit-dialog";
import { EngagementForm } from "@/components/forms/engagement-form";
import { ClientActions } from "@/components/client-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
function fmtDate(d) {
  if (!d) return "—";
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
export default async function ClientDetailPage(props) {
  const {
    id
  } = await props.params;
  const ctx = await getCtx();
  const cl = await db.query.client.findFirst({
    where: and(eq(schema.client.id, id), eq(schema.client.organizationId, ctx.orgId)),
    with: {
      assignedTo: {
        columns: {
          name: true
        }
      },
      engagements: {
        with: {
          service: true
        }
      },
      invoices: {
        orderBy: [desc(schema.invoice.invoiceDate)]
      },
      payments: {
        orderBy: [desc(schema.payment.paymentDate)],
        with: {
          invoice: {
            columns: {
              invoiceNo: true
            }
          }
        }
      },
      tasks: {
        orderBy: [desc(schema.complianceTask.dueDate)],
        with: {
          assignedTo: {
            columns: {
              name: true
            }
          }
        }
      }
    }
  });
  if (!cl) notFound();
  const [services, credits, members] = await Promise.all([db.query.service.findMany({
    where: and(eq(schema.service.organizationId, ctx.orgId), eq(schema.service.isActive, true))
  }), creditedByInvoice(ctx.orgId), db.query.member.findMany({
    where: eq(schema.member.organizationId, ctx.orgId)
  })]);
  const memberNames = new Map(members.map(m => [m.userId, m.userId]));
  const users = memberNames.size ? await db.query.user.findMany({
    columns: {
      id: true,
      name: true
    }
  }) : [];
  const staffOptions = users.filter(u => memberNames.has(u.id));
  const outstanding = cl.invoices.reduce((acc, inv) => {
    if (inv.status === "cancelled") return acc;
    const bal = inv.totalPaise - (credits.get(inv.id) ?? BigInt(0));
    return bal > 0 ? acc + bal : acc;
  }, BigInt(0));
  return <div>
      <PageHeader title={cl.name} description={`${cl.type} · ${[cl.city, cl.state].filter(Boolean).join(", ") || "—"}`}>
        <Button size="sm" variant="outline" render={<Link href={`/payments/new?client=${cl.id}`} />}>
          Record payment
        </Button>
        <Button size="sm" variant="outline" render={<Link href={`/invoices/new?client=${cl.id}`} />}>
          New invoice
        </Button>
        <ClientEditDialog clientId={cl.id} defaultValues={cl} />
        <ClientActions clientId={cl.id} isActive={cl.isActive} staff={staffOptions} assignedToId={cl.assignedToId} />
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatINR(outstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>PAN: {cl.pan || "—"} · GSTIN: {cl.gstin || "—"}</p>
            <p className="text-muted-foreground">{cl.email || "—"} · {cl.phone || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assigned to</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{cl.assignedTo?.name ?? "Unassigned"}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="engagements">
        <TabsList>
          <TabsTrigger value="engagements">Engagements ({cl.engagements.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({cl.invoices.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments & TDS ({cl.payments.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({cl.tasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="engagements" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Engagements</CardTitle>
              <EngagementForm clientId={cl.id} services={services.map(s => ({
              id: s.id,
              name: s.name,
              defaultFee: Number(s.defaultFeePaise) / 100
            }))} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cl.engagements.length === 0 && <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No engagements yet — add the services you provide to this client.
                      </TableCell>
                    </TableRow>}
                  {cl.engagements.map(e => <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.service.name}</TableCell>
                      <TableCell className="uppercase text-muted-foreground">{e.service.category}</TableCell>
                      <TableCell className="capitalize">{e.frequency.replace("_", " ")}</TableCell>
                      <TableCell className="text-right">{formatINR(e.feePaise)}</TableCell>
                      <TableCell>
                        <Badge variant={e.isActive ? "secondary" : "outline"}>
                          {e.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cl.invoices.length === 0 && <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No invoices yet.
                      </TableCell>
                    </TableRow>}
                  {cl.invoices.map(inv => {
                  const credited = credits.get(inv.id) ?? BigInt(0);
                  const bal = inv.status === "cancelled" ? BigInt(0) : inv.totalPaise - credited;
                  const overdue = bal > 0 && inv.dueDate < new Date();
                  const shownStatus = overdue && inv.status !== "paid" ? "overdue" : inv.status;
                  return <TableRow key={inv.id}>
                        <TableCell>
                          <Link href={`/invoices/${inv.id}`} className="font-medium underline-offset-4 hover:underline">
                            {inv.invoiceNo}
                          </Link>
                        </TableCell>
                        <TableCell>{fmtDate(inv.invoiceDate)}</TableCell>
                        <TableCell>{fmtDate(inv.dueDate)}</TableCell>
                        <TableCell className="text-right">{formatINR(inv.totalPaise)}</TableCell>
                        <TableCell className="text-right">{formatINR(bal)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[shownStatus] ?? "secondary"} className="capitalize">
                            {shownStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>;
                })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">TDS ({`u/s`} 194J)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cl.payments.length === 0 && <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No payments recorded.
                      </TableCell>
                    </TableRow>}
                  {cl.payments.map(p => <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.receiptNo ?? "—"}</TableCell>
                      <TableCell>{fmtDate(p.paymentDate)}</TableCell>
                      <TableCell className="text-muted-foreground">{p.invoice?.invoiceNo ?? "Advance"}</TableCell>
                      <TableCell className="uppercase">{p.mode}</TableCell>
                      <TableCell className="text-right">{formatINR(p.amountReceivedPaise)}</TableCell>
                      <TableCell className="text-right">
                        {p.tdsDeductedPaise > 0 ? formatINR(p.tdsDeductedPaise) : "—"}
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cl.tasks.length === 0 && <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No tasks. Add an engagement to auto-generate compliance deadlines.
                      </TableCell>
                    </TableRow>}
                  {cl.tasks.map(t => {
                  const overdue = t.status !== "completed" && t.dueDate < new Date();
                  return <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell className="text-muted-foreground">{t.period ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={overdue ? "destructive" : "outline"}>{fmtDate(t.dueDate)}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{t.assignedTo?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={t.status === "completed" ? "secondary" : "outline"} className="capitalize">
                            {t.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                      </TableRow>;
                })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>;
}
