import Link from "next/link";
import { eq, and, asc } from "drizzle-orm";
import { getCtx } from "@/lib/tenant";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { TaskRowActions } from "@/components/task-row-actions";
import { GenerateTasksButton } from "@/components/generate-tasks-button";
import { TaskCreateForm } from "@/components/forms/task-create-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
function fmtDate(d) {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
export default async function CompliancePage(props) {
  const sp = await props.searchParams;
  const filter = typeof sp.view === "string" ? sp.view : "open";
  const ctx = await getCtx();
  const [tasks, clients, members] = await Promise.all([db.query.complianceTask.findMany({
    where: eq(schema.complianceTask.organizationId, ctx.orgId),
    with: {
      client: {
        columns: {
          id: true,
          name: true
        }
      },
      assignedTo: {
        columns: {
          name: true
        }
      }
    },
    orderBy: [asc(schema.complianceTask.dueDate)]
  }), db.query.client.findMany({
    where: and(eq(schema.client.organizationId, ctx.orgId), eq(schema.client.isActive, true)),
    columns: {
      id: true,
      name: true
    },
    orderBy: (t, {
      asc
    }) => [asc(t.name)]
  }), db.query.member.findMany({
    where: eq(schema.member.organizationId, ctx.orgId)
  })]);
  const memberIds = new Set(members.map(m => m.userId));
  const staff = (await db.query.user.findMany({
    columns: {
      id: true,
      name: true
    }
  })).filter(u => memberIds.has(u.id));
  const now = new Date();
  const filtered = tasks.filter(t => {
    const overdue = t.status !== "completed" && t.dueDate < now;
    if (filter === "all") return true;
    if (filter === "overdue") return overdue;
    if (filter === "completed") return t.status === "completed";
    return t.status !== "completed"; // "open"
  });
  return <div>
      <PageHeader title="Compliance calendar" description="Statutory deadlines across all clients">
        <Button variant={filter === "open" ? "secondary" : "outline"} size="sm" render={<Link href="/compliance" />}>
          Open
        </Button>
        <Button variant={filter === "overdue" ? "secondary" : "outline"} size="sm" render={<Link href="/compliance?view=overdue" />}>
          Overdue
        </Button>
        <Button variant={filter === "completed" ? "secondary" : "outline"} size="sm" render={<Link href="/compliance?view=completed" />}>
          Completed
        </Button>
        <Button variant={filter === "all" ? "secondary" : "outline"} size="sm" render={<Link href="/compliance?view=all" />}>
          All
        </Button>
        <GenerateTasksButton />
        <TaskCreateForm clients={clients} staff={staff} />
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No tasks. Add engagements to clients, or click &quot;Generate FY tasks&quot;.
                  </TableCell>
                </TableRow>}
              {filtered.map(t => {
              const overdue = t.status !== "completed" && t.dueDate < now;
              return <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>
                      <Link href={`/clients/${t.client.id}`} className="underline-offset-4 hover:underline">
                        {t.client.name}
                      </Link>
                    </TableCell>
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
                    <TableCell>
                      <TaskRowActions taskId={t.id} status={t.status} staff={staff} assignedToId={t.assignedToId} />
                    </TableCell>
                  </TableRow>;
            })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>;
}
