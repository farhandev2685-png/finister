"use client";

import { useId, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINR } from "@/lib/money";
function axisINR(rupees) {
  const abs = Math.abs(rupees);
  if (abs >= 1e7) return `${(rupees / 1e7).toFixed(0)}Cr`;
  if (abs >= 1e5) return `${(rupees / 1e5).toFixed(0)}L`;
  if (abs >= 1e3) return `${(rupees / 1e3).toFixed(0)}k`;
  return `${rupees}`;
}
const SERIES_META = [{
  key: "collected",
  label: "Collected",
  color: "var(--chart-2)"
}, {
  key: "billed",
  label: "Billed",
  color: "var(--chart-1)"
}];
function CashflowTooltip({
  active,
  payload,
  label
}) {
  if (!active || !payload?.length) return null;
  const rows = SERIES_META.map(s => {
    const p = payload.find(x => x.dataKey === s.key || x.dataKey === `${s.key}Neg`);
    return p && p.value !== undefined ? {
      ...s,
      value: Math.abs(p.value)
    } : null;
  }).filter(Boolean);
  return <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium">{label}</p>
      {rows.map(r => <div key={r.key} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{
          background: r.color
        }} />
          <span className="text-muted-foreground">{r.label}</span>
          <span className="ml-auto pl-4 font-medium tabular-nums">
            {formatINR(Math.round(r.value * 100), {
            decimals: 0
          })}
          </span>
        </div>)}
    </div>;
}
const RANGES = [{
  label: "3M",
  n: 3
}, {
  label: "6M",
  n: 6
}, {
  label: "FY",
  n: 12
}];
export function CashflowChart({
  data
}) {
  const [range, setRange] = useState(12);
  const visible = data.slice(Math.max(0, data.length - range)).map(m => ({
    ...m,
    billedNeg: -m.billed
  }));
  return <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-full bg-muted p-0.5">
          {RANGES.map(r => <button key={r.label} onClick={() => setRange(r.n)} className={range === r.n ? "rounded-full bg-forest px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm" : "rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"}>
              {r.label}
            </button>)}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {SERIES_META.map(s => <span key={s.key} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{
              background: s.color
            }} /> {s.label}
            </span>)}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={visible} margin={{
        top: 8,
        right: 8,
        bottom: 0,
        left: 0
      }} barCategoryGap="32%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.7} />
          <XAxis dataKey="month" axisLine={false} tickLine={false} dy={6} tick={{
          fontSize: 11,
          fill: "var(--muted-foreground)"
        }} />
          <YAxis axisLine={false} tickLine={false} width={40} tick={{
          fontSize: 11,
          fill: "var(--muted-foreground)"
        }} tickFormatter={axisINR} />
          <Tooltip content={<CashflowTooltip />} cursor={{
          fill: "var(--muted-foreground)",
          fillOpacity: 0.08
        }} />
          <Bar dataKey="collected" stackId="cf" fill="var(--chart-2)" radius={[7, 7, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          <Bar dataKey="billedNeg" stackId="cf" fill="var(--chart-1)" radius={[0, 0, 7, 7]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>;
}

/** Tiny sparkline for the KPI cards. Values in rupees. */
export function Sparkline({
  data,
  color = "#ffffff",
  className
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const points = data.map((v, i) => ({
    i,
    v
  }));
  return <div className={className} style={{
    width: 96,
    height: 40
  }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{
        top: 4,
        right: 0,
        bottom: 0,
        left: 0
      }}>
          <Bar dataKey="v" fill={color} fillOpacity={0.85} radius={2} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>;
}
export function DonutChart({
  data,
  center
}) {
  return <div className="relative" style={{
    width: 180,
    height: 180
  }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={86} paddingAngle={3} cornerRadius={6} strokeWidth={0} isAnimationActive={false}>
            {data.map(d => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip contentStyle={{
          borderRadius: "0.5rem",
          border: "1px solid var(--border)",
          background: "var(--card)",
          fontSize: 12
        }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        {center}
      </div>
    </div>;
}
