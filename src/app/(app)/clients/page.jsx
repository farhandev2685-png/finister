import Link from "next/link";
import { eq, and, desc, ilike, or } from "drizzle-orm";
import { getCtx } from "@/lib/tenant";
import { db, schema } from "@/lib/db";
import { outstandingByClient } from "@/lib/queries";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
export default async function ClientsPage(props) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const ctx = await getCtx();
  const search = q ? or(ilike(schema.client.name, `%${q}%`), ilike(schema.client.pan, `%${q}%`), ilike(schema.client.gstin, `%${q}%`)) : undefined;
  const [clients, outstanding] = await Promise.all([db.query.client.findMany({
    where: and(eq(schema.client.organizationId, ctx.orgId), search),
    with: {
      assignedTo: {
        columns: {
          name: true
        }
      }
    },
    orderBy: [desc(schema.client.createdAt)]
  }), outstandingByClient(ctx.orgId)]);
  return <div>
      <PageHeader title="Clients" description={q ? `${clients.length} results for “${q}”` : `${clients.length} clients in your firm`}>
        <Button render={<Link href="/clients/new" />}>
          <Plus className="mr-1 h-4 w-4" /> New client
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>PAN / GSTIN</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 && <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    {q ? `No clients match “${q}”.` : "No clients yet. Add your first client to get started."}
                  </TableCell>
                </TableRow>}
              {clients.map(c => <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/clients/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">{c.type}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[c.pan, c.gstin].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.email || c.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.assignedTo?.name ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatINR(outstanding.get(c.id) ?? BigInt(0))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.isActive ? "secondary" : "outline"}>
                      {c.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>;
}
