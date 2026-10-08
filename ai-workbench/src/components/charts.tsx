"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "@/components/layout/theme";
import { money } from "@/lib/utils";

function usePalette() {
  const { isDark } = useTheme();
  return {
    accent: isDark ? "#818cf8" : "#4f46e5",
    accent2: isDark ? "#34d399" : "#10b981",
    grid: isDark ? "#27272a" : "#f0f0f2",
    axis: isDark ? "#71717a" : "#a1a1aa",
    tooltipBg: isDark ? "#18181b" : "#ffffff",
    tooltipBorder: isDark ? "#3f3f46" : "#e4e4e7",
    text: isDark ? "#fafafa" : "#18181b",
  };
}

function useTooltipStyle() {
  const p = usePalette();
  return {
    contentStyle: { background: p.tooltipBg, border: `1px solid ${p.tooltipBorder}`, borderRadius: 8, fontSize: 12, color: p.text },
    labelStyle: { color: p.text, marginBottom: 2 },
    itemStyle: { color: p.text },
    cursor: { fill: p.grid, opacity: 0.6 },
  };
}

type Row = Record<string, string | number>;
/** 业务数据（接口类型）在边界处转换成 recharts 需要的行类型 */
const rows = (d: readonly object[]) => d as unknown as Row[];

export function BarSeries({
  data,
  xKey,
  yKey,
  name,
  height = 200,
  isMoney,
}: {
  data: readonly object[];
  xKey: string;
  yKey: string;
  name: string;
  height?: number;
  isMoney?: boolean;
}) {
  const p = usePalette();
  const tt = useTooltipStyle();
  return (
    <div style={{ height }} className="w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows(data)} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={p.grid} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fill: p.axis, fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: p.axis, fontSize: 11 }} allowDecimals={false} width={isMoney ? 56 : 36} tickFormatter={isMoney ? (v: number) => (v >= 1000 ? `${v / 1000}k` : String(v)) : undefined} />
          <Tooltip {...tt} formatter={(v) => [isMoney ? money(Number(v)) : String(v), name]} />
          <Bar dataKey={yKey} fill={p.accent} radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AreaTrend({ data, xKey, yKey, name, height = 220 }: { data: readonly object[]; xKey: string; yKey: string; name: string; height?: number }) {
  const p = usePalette();
  const tt = useTooltipStyle();
  return (
    <div style={{ height }} className="w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows(data)} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p.accent} stopOpacity={0.25} />
              <stop offset="100%" stopColor={p.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={p.grid} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fill: p.axis, fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: p.axis, fontSize: 11 }} width={52} tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
          <Tooltip {...tt} cursor={{ stroke: p.axis }} formatter={(v) => [money(Number(v)), name]} />
          <Area type="monotone" dataKey={yKey} stroke={p.accent} strokeWidth={2} fill="url(#areaFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({ data, height = 200, centerLabel, centerValue }: { data: Array<{ name: string; value: number; color: string }>; height?: number; centerLabel?: string; centerValue?: string | number }) {
  const tt = useTooltipStyle();
  return (
    <div style={{ height }} className="relative w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip {...tt} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke="none" isAnimationActive={false}>
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {centerValue !== undefined && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold">{centerValue}</span>
          {centerLabel && <span className="text-[11px] text-muted">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}

/** 横向排名条（纯 HTML，手机上更易读） */
export function RankBars({ data, format = (v) => money(v), extra }: { data: Array<{ key: string; name: string; value: number; count?: number }>; format?: (v: number) => string; extra?: (d: { count?: number }) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="py-6 text-center text-xs text-muted">暂无数据</p>;
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.key}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate"><span className="mr-2 text-xs text-subtle tabular-nums">{i + 1}</span>{d.name}</span>
            <span className="shrink-0 tabular-nums">{format(d.value)}{extra && <span className="ml-1.5 text-xs text-muted">{extra(d)}</span>}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
