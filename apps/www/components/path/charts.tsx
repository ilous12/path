"use client";
import type * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { fmt } from "./model";

const axis = {
  axisLine: false,
  tickLine: false,
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
} as const;
const grid = (
  <CartesianGrid
    stroke="var(--border)"
    strokeDasharray="3 4"
    vertical={false}
  />
);

export function ChartTip({
  label,
  rows,
}: {
  label: React.ReactNode;
  rows: {
    color?: string;
    name: string;
    value: React.ReactNode;
    dashed?: boolean;
  }[];
}) {
  return (
    <div className="min-w-44 rounded-lg border bg-popover/95 p-2.5 text-xs text-popover-foreground shadow-lg backdrop-blur">
      <p className="mb-1.5 font-semibold">{label}</p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li className="flex items-center justify-between gap-4" key={r.name}>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className={cn(
                  "inline-block h-0.5 w-3",
                  r.dashed && "border-t-2 border-dashed bg-transparent",
                )}
                style={
                  r.dashed ? { borderColor: r.color } : { background: r.color }
                }
              />
              {r.name}
            </span>
            <span className="font-medium tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type Series = {
  key: string;
  name: string;
  color: string;
  stack?: boolean;
};

/**
 * Daily trend: stacked/overlaid areas for actuals, dashed target, dashed forecast with an
 * uncertainty band, optional highlighted windows (campaigns) and a today marker.
 */
export function TrendChart({
  data,
  series,
  target,
  forecast,
  band,
  today,
  windows = [],
  markers = [],
  height = 260,
  unit = "회선",
}: {
  data: Record<string, unknown>[];
  series: Series[];
  target?: string;
  forecast?: string;
  band?: string;
  today?: string;
  windows?: { from: string; to: string; color: string; label?: string }[];
  markers?: { x: string; color: string; label?: string }[];
  height?: number;
  unit?: string;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer height="100%" width="100%">
        <ComposedChart
          data={data}
          margin={{ top: 16, right: 12, bottom: 0, left: 0 }}
        >
          <defs>
            {series.map((s) => (
              <linearGradient
                id={`g-${s.key}`}
                key={s.key}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity={0.32} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          {grid}
          <XAxis
            {...axis}
            dataKey="key"
            minTickGap={28}
            tickFormatter={(v) => fmt.md(String(v))}
          />
          <YAxis
            {...axis}
            tickFormatter={(v) => fmt.won(Number(v))}
            width={44}
          />
          {windows.map((w) => (
            <ReferenceArea
              fill={w.color}
              fillOpacity={0.09}
              ifOverflow="hidden"
              key={`${w.from}${w.label}`}
              label={
                w.label
                  ? {
                      value: w.label,
                      position: "insideTopLeft",
                      fontSize: 10,
                      fill: w.color,
                    }
                  : undefined
              }
              x1={w.from}
              x2={w.to}
            />
          ))}
          {band && (
            <Area
              activeDot={false}
              dataKey={band}
              fill="var(--primary)"
              fillOpacity={0.12}
              isAnimationActive={false}
              stroke="none"
              type="monotone"
            />
          )}
          {series.map((s) => (
            <Area
              activeDot={{ r: 3 }}
              dataKey={s.key}
              fill={`url(#g-${s.key})`}
              isAnimationActive={false}
              key={s.key}
              name={s.name}
              stackId={s.stack ? "a" : undefined}
              stroke={s.color}
              strokeWidth={2}
              type="monotone"
            />
          ))}
          {forecast && (
            <Line
              dataKey={forecast}
              dot={false}
              isAnimationActive={false}
              stroke="var(--primary)"
              strokeDasharray="5 4"
              strokeWidth={2}
              type="monotone"
            />
          )}
          {target && (
            <Line
              dataKey={target}
              dot={false}
              isAnimationActive={false}
              stroke="var(--foreground)"
              strokeDasharray="2 4"
              strokeOpacity={0.55}
              strokeWidth={1.5}
              type="stepAfter"
            />
          )}
          {markers.map((m) => (
            <ReferenceLine
              key={`${m.x}${m.label}`}
              stroke={m.color}
              strokeDasharray="3 3"
              strokeOpacity={0.8}
              x={m.x}
            />
          ))}
          {today && (
            <ReferenceLine
              label={{
                value: "오늘",
                position: "top",
                fontSize: 10,
                fontWeight: 700,
                fill: "var(--primary)",
              }}
              stroke="var(--primary)"
              strokeWidth={1.5}
              x={today}
              zIndex={3000}
            />
          )}
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTip
                  label={String(label)}
                  rows={[
                    ...series.map((s) => ({
                      name: s.name,
                      color: s.color,
                      value:
                        payload[0].payload[s.key] == null
                          ? "—"
                          : `${fmt.n(Number(payload[0].payload[s.key]))}${unit}`,
                    })),
                    ...(forecast && payload[0].payload[forecast] != null
                      ? [
                          {
                            name: "전망",
                            color: "var(--primary)",
                            dashed: true,
                            value: `${fmt.n(Number(payload[0].payload[forecast]))}${unit}`,
                          },
                        ]
                      : []),
                    ...(target && payload[0].payload[target] != null
                      ? [
                          {
                            name: "목표",
                            color: "var(--foreground)",
                            dashed: true,
                            value: `${fmt.n(Number(payload[0].payload[target]))}${unit}`,
                          },
                        ]
                      : []),
                  ]}
                />
              ) : null
            }
            cursor={{ stroke: "var(--border)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({
  data,
  center,
  sub,
  size = 148,
}: {
  data: { name: string; value: number; color: string }[];
  center: string;
  sub?: string;
  size?: number;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer height="100%" width="100%">
        <PieChart>
          <Pie
            cornerRadius={4}
            data={data}
            dataKey="value"
            innerRadius="70%"
            isAnimationActive={false}
            outerRadius="100%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d) => (
              <Cell fill={d.color} key={d.name} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <ChartTip
                  label={String(payload[0].name)}
                  rows={[
                    { name: "값", value: fmt.n(Number(payload[0].value)) },
                  ]}
                />
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold tabular-nums">{center}</span>
        {sub && (
          <span className="text-[10px] text-muted-foreground">{sub}</span>
        )}
      </div>
    </div>
  );
}

export function BarList({
  items,
  format = (v: number) => fmt.n(v),
}: {
  items: {
    label: React.ReactNode;
    value: number;
    color?: string;
    note?: React.ReactNode;
  }[];
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return (
    <ul className="space-y-2">
      {items.map((i, n) => (
        <li
          className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2 text-[12px]"
          key={n}
        >
          <span className="truncate">{i.label}</span>
          <span className="relative h-2 overflow-hidden rounded-full bg-muted">
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${(Math.abs(i.value) / max) * 100}%`,
                background: i.color ?? "var(--primary)",
              }}
            />
          </span>
          <span className="flex items-center gap-1.5 text-right tabular-nums">
            {format(i.value)}
            {i.note}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StackedArea({
  data,
  series,
  height = 220,
  percent,
}: {
  data: Record<string, unknown>[];
  series: Series[];
  height?: number;
  percent?: boolean;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          stackOffset={percent ? "expand" : undefined}
        >
          {grid}
          <XAxis {...axis} dataKey="key" minTickGap={24} />
          <YAxis
            {...axis}
            tickFormatter={(v) =>
              percent ? `${Math.round(Number(v) * 100)}%` : fmt.won(Number(v))
            }
            width={40}
          />
          {series.map((s) => (
            <Area
              dataKey={s.key}
              fill={s.color}
              fillOpacity={0.55}
              isAnimationActive={false}
              key={s.key}
              name={s.name}
              stackId="s"
              stroke={s.color}
              type="monotone"
            />
          ))}
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTip
                  label={String(label)}
                  rows={series.map((s) => ({
                    name: s.name,
                    color: s.color,
                    value: fmt.n(Number(payload[0].payload[s.key] ?? 0)),
                  }))}
                />
              ) : null
            }
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export type SpectrumPoint = {
  x: number;
  y: number;
  name: string;
  group: string;
  color: string;
  size?: number;
  detail?: string;
};
export function Spectrum({
  points,
  height = 280,
  xLabel,
  yLabel,
}: {
  points: SpectrumPoint[];
  height?: number;
  xLabel: string;
  yLabel: string;
}) {
  const groups = [...new Set(points.map((p) => p.group))];
  return (
    <div style={{ height }}>
      <ResponsiveContainer height="100%" width="100%">
        <ScatterChart margin={{ top: 8, right: 12, bottom: 16, left: 0 }}>
          {grid}
          <XAxis
            {...axis}
            dataKey="x"
            label={{
              value: xLabel,
              position: "insideBottom",
              offset: -8,
              fontSize: 10,
              fill: "var(--muted-foreground)",
            }}
            name={xLabel}
            type="number"
          />
          <YAxis
            {...axis}
            dataKey="y"
            name={yLabel}
            tickFormatter={(v) => fmt.won(Number(v))}
            type="number"
            width={44}
          />
          <ZAxis dataKey="size" range={[30, 140]} />
          {groups.map((g) => {
            const pts = points.filter((p) => p.group === g);
            return (
              <Scatter
                data={pts}
                fill={pts[0].color}
                fillOpacity={g === "시장" ? 0.35 : 0.9}
                isAnimationActive={false}
                key={g}
                name={g}
              />
            );
          })}
          <Tooltip
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as SpectrumPoint | undefined;
              return active && p ? (
                <ChartTip
                  label={p.name}
                  rows={[
                    { name: xLabel, value: `${p.x}` },
                    { name: yLabel, value: `${fmt.n(p.y)}원` },
                    ...(p.detail ? [{ name: "조건", value: p.detail }] : []),
                  ]}
                />
              ) : null;
            }}
            cursor={{ strokeDasharray: "3 3" }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pts = values.map(
    (v, i) =>
      `${(i / (values.length - 1)) * 100},${30 - ((v - min) / (max - min || 1)) * 28}`,
  );
  return (
    <svg
      aria-hidden
      className="size-full"
      preserveAspectRatio="none"
      viewBox="0 0 100 32"
    >
      <polygon
        fill={color}
        fillOpacity={0.15}
        points={`0,32 ${pts.join(" ")} 100,32`}
      />
      <polyline
        fill="none"
        points={pts.join(" ")}
        stroke={color}
        strokeWidth={1.6}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
