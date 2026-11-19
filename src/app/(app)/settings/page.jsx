import { eq, desc } from "drizzle-orm";
import { getCtx } from "@/lib/tenant";
import { db, schema } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { FirmForm } from "@/components/forms/firm-form";
import { ServiceForm, ServiceToggle } from "@/components/forms/service-form";
import { InviteForm } from "@/components/forms/invite-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
const roleLabel = {
  owner: "Owner",
  admin: "Manager",
  member: "Staff"
};
export default async function SettingsPage() {
  const ctx = await getCtx();
  const canEdit = ctx.role !== "member";
  const [org, services, members, invitations] = await Promise.all([db.query.organization.findFirst({
    where: eq(schema.organization.id, ctx.orgId)
  }), db.query.service.findMany({
    where: eq(schema.service.organizationId, ctx.orgId),
    orderBy: [desc(schema.service.createdAt)]
  }), db.query.member.findMany({
    where: eq(schema.member.organizationId, ctx.orgId)
  }), db.query.invitation.findMany({
    where: eq(schema.invitation.organizationId, ctx.orgId),
    orderBy: [desc(schema.invitation.expiresAt)]
  })]);
  const memberIds = new Set(members.map(m => m.userId));
  const users = (await db.query.user.findMany({
    columns: {
      id: true,
      name: true,
      email: true
    }
  })).filter(u => memberIds.has(u.id));
  const userById = new Map(users.map(u => [u.id, u]));
  return <div>
      <PageHeader title="Settings" />
      <Tabs defaultValue="firm">
        <TabsList>
          <TabsTrigger value="firm">Firm profile</TabsTrigger>
          <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
          <TabsTrigger value="team">Team ({members.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="firm" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Firm details</CardTitle>
            </CardHeader>
            <CardContent>
              {org && <FirmForm defaultValues={org} canEdit={canEdit} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Service catalog</CardTitle>
              <ServiceForm canEdit={canEdit} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>SAC</TableHead>
                    <TableHead className="text-right">Default fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.length === 0 && <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Add services like &quot;GSTR-3B filing&quot; or &quot;ITR filing&quot; — their category
                        drives the compliance calendar.
                      </TableCell>
                    </TableRow>}
                  {services.map(s => <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="uppercase text-muted-foreground">{s.category}</TableCell>
                      <TableCell className="text-muted-foreground">{s.sacCode}</TableCell>
                      <TableCell className="text-right">{formatINR(s.defaultFeePaise)}</TableCell>
                      <TableCell>
                        <Badge variant={s.isActive ? "secondary" : "outline"}>
                          {s.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <ServiceToggle id={s.id} isActive={s.isActive} canEdit={canEdit} />
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team members</CardTitle>
            </CardHeader>
            <CardContent>
              {canEdit && <div className="mb-4">
                  <InviteForm canInvite={canEdit} />
                </div>}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(m => {
                  const u = userById.get(m.userId);
                  return <TableRow key={m.id}>
                        <TableCell className="font-medium">{u?.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{u?.email ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{roleLabel[m.role] ?? m.role}</Badge>
                        </TableCell>
                      </TableRow>;
                })}
                </TableBody>
              </Table>
              {invitations.length > 0 && <>
                  <p className="mb-2 mt-6 text-sm font-medium">Pending invitations</p>
                  <Table>
                    <TableBody>
                      {invitations.filter(i => i.status === "pending").map(i => <TableRow key={i.id}>
                            <TableCell className="text-muted-foreground">{i.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{i.role === "admin" ? "Manager" : "Staff"}</Badge>
                            </TableCell>
                          </TableRow>)}
                    </TableBody>
                  </Table>
                </>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>;
}
