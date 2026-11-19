import { Asterisk, Check } from "lucide-react";
const FEATURES = ["GST, TDS & ITR compliance calendar", "Invoicing with automatic TDS tracking", "Client-wise receivables and aging", "One workspace for your whole firm"];
export default function AuthLayout({
  children
}) {
  return <div className="flex min-h-svh">
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-forest p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full border-[36px] border-white/5" />
        <div className="pointer-events-none absolute -right-10 top-20 h-56 w-56 rounded-full border-[24px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full border-[30px] border-white/5" />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime text-forest">
            <Asterisk className="size-5" strokeWidth={2.5} />
          </div>
          <p className="text-lg font-bold tracking-tight">finister</p>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">
            Practice management, beautifully simple.
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/65">
            Clients, invoices, TDS and compliance deadlines — everything your CA
            firm needs, in one place.
          </p>
          <ul className="mt-8 space-y-2.5">
            {FEATURES.map(f => <li key={f} className="flex items-center gap-2.5 text-sm text-white/75">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime/15">
                  <Check className="h-3 w-3 text-lime" strokeWidth={3} />
                </span>
                {f}
              </li>)}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} finister</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime text-forest">
              <Asterisk className="size-5" strokeWidth={2.5} />
            </div>
            <p className="text-lg font-bold tracking-tight">finister</p>
          </div>
          {children}
        </div>
      </div>
    </div>;
}
