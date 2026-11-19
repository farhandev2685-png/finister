import { getCtx } from "@/lib/tenant";
import { overdueTaskCount } from "@/lib/queries";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
export default async function AppLayout({
  children
}) {
  const ctx = await getCtx();
  const overdue = await overdueTaskCount(ctx.orgId);
  return <div className="flex min-h-svh">
      <div className="sticky top-0 h-svh shrink-0">
        <AppSidebar orgName={ctx.orgName} userName={ctx.userName} role={ctx.role} />
      </div>
      <main className="min-w-0 flex-1">
        <AppTopbar userName={ctx.userName} overdueCount={overdue} />
        <div className="mx-auto w-full max-w-[1320px] px-6 py-6">{children}</div>
      </main>
    </div>;
}
