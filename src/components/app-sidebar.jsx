"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, FileText, IndianRupee, CalendarCheck, Settings, LogOut, Asterisk } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
const NAV = [{
  href: "/dashboard",
  label: "Dashboard",
  icon: LayoutDashboard
}, {
  href: "/clients",
  label: "Clients",
  icon: Users
}, {
  href: "/invoices",
  label: "Invoices",
  icon: FileText
}, {
  href: "/payments",
  label: "Payments & TDS",
  icon: IndianRupee
}, {
  href: "/compliance",
  label: "Compliance",
  icon: CalendarCheck
}, {
  href: "/settings",
  label: "Settings",
  icon: Settings
}];
function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}
export function AppSidebar({
  orgName,
  userName,
  role
}) {
  const pathname = usePathname();
  const router = useRouter();
  return <aside className="flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime text-forest">
          <Asterisk className="size-5" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold tracking-tight text-foreground">finister</p>
          <p className="truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{orgName}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 pb-4">
        <p className="px-3 pb-2 pt-2 text-[11px] font-medium tracking-wider text-muted-foreground">Menu</p>
        <div className="space-y-1">
          {NAV.map(({
          href,
          label,
          icon: Icon
        }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-colors", active ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm" : "text-sidebar-foreground hover:bg-muted hover:text-foreground")}>
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>;
        })}
        </div>
      </nav>

      <div className="mx-3 mb-3 rounded-2xl bg-forest p-4 text-white shadow-sm">
        <p className="text-[13px] font-semibold leading-snug">Track clients, TDS & compliance in one place.</p>
        <div className="mt-3 flex items-center gap-2.5 border-t border-white/10 pt-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold text-forest">
            {initials(userName) || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{userName}</p>
            <p className="text-[11px] capitalize text-white/55">{role === "admin" ? "manager" : role}</p>
          </div>
          <button title="Sign out" className="flex h-7 w-7 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-lime hover:text-forest" onClick={async () => {
          await authClient.signOut();
          router.push("/login");
          router.refresh();
        }}>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>;
}
