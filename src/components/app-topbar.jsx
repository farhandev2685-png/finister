"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, Search } from "lucide-react";
const TITLES = {
  dashboard: "Dashboard",
  clients: "Clients",
  invoices: "Invoices",
  payments: "Payments & TDS",
  compliance: "Compliance",
  settings: "Settings"
};
function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}
export function AppTopbar({
  userName,
  overdueCount
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const title = TITLES[pathname.split("/")[1]] ?? "Dashboard";
  return <header className="sticky top-0 z-10 flex h-16 items-center gap-4 bg-background/80 px-6 backdrop-blur">
      <p className="text-[17px] font-semibold tracking-tight">{title}</p>

      <form className="relative ml-auto w-full max-w-sm" onSubmit={e => {
      e.preventDefault();
      const term = q.trim();
      router.push(term ? `/clients?q=${encodeURIComponent(term)}` : "/clients");
    }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" className="h-9 w-full rounded-full border bg-card pl-4 pr-10 text-[13px] shadow-sm outline-none ring-ring/40 transition-shadow placeholder:text-muted-foreground/70 focus:ring-2" />
        <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </form>

      <div className="flex items-center gap-3">
        <Link href="/compliance" title="Compliance deadlines" className="relative flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground">
          <Bell className="h-[18px] w-[18px]" />
          {overdueCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-white">
              {overdueCount > 9 ? "9+" : overdueCount}
            </span>}
        </Link>
        <Link href="/settings" className="flex items-center gap-2.5">
          <span className="hidden text-[13px] font-medium sm:inline">{userName}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lime text-[12px] font-bold text-forest">
            {initials(userName) || "?"}
          </span>
        </Link>
      </div>
    </header>;
}
