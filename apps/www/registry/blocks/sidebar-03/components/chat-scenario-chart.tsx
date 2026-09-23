"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import type { ChatScenarioPoint } from "./air-chat-scenario";

const metrics = {
  customers: { label: "가입 회선", color: "var(--chart-1)", unit: "회선", divisor: 1 },
  revenue: { label: "매출", color: "var(--chart-2)", unit: "만원", divisor: 10000 },
  profit: { label: "기여이익", color: "var(--chart-3)", unit: "만원", divisor: 10000 },
};
type Metric = keyof typeof metrics;

export function ChatScenarioChart({ points }: { points: ChatScenarioPoint[] }) {
  const [metric, setMetric] = useState<Metric>("customers");
  const config = metrics[metric];
  const baseline = points[0]?.[metric] ?? 0;
  const format = (value: number) => `${(value / config.divisor).toLocaleString("ko-KR", {maximumFractionDigits: 1})}${config.unit}`;
  return <section aria-label="요금 인하 시나리오 차트" className="mb-4 min-w-0 space-y-3 border-b pb-4">
    <div><h3 className="text-sm font-semibold">요금 인하별 예상 변화</h3><p className="mt-1 text-[11px] text-muted-foreground">현행 대비 5%·10%·15% 인하 · 가정 기반 월 환산</p></div>
    <div className="flex flex-wrap gap-1" role="group" aria-label="시뮬레이션 차트 지표">{(Object.keys(metrics) as Metric[]).map(key => <Button key={key} size="sm" variant={metric === key ? "secondary" : "ghost"} className="h-7 px-2 text-[11px]" aria-pressed={metric === key} onClick={() => setMetric(key)}>{metrics[key].label}</Button>)}</div>
    <div className="h-48 w-full min-w-0" role="img" aria-label={`${config.label}: ${points.map(point => `${point.cut}% 인하 ${format(point[metric])}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{top: 12, right: 12, bottom: 0, left: 0}}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="cut" tickFormatter={value => Number(value) === 0 ? "현행" : `−${value}%`} interval={0} tick={{fontSize: 10}} tickLine={false} axisLine={false} />
          <YAxis width={42} domain={[0, "auto"]} tickFormatter={value => (Number(value) / config.divisor).toLocaleString("ko-KR")} tick={{fontSize: 10}} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{background: "var(--background)", borderColor: "var(--border)", borderRadius: 8, fontSize: 11}} labelFormatter={value => Number(value) === 0 ? "현행 유지" : `${value}% 인하`} formatter={value => [format(Number(value)), config.label]} />
          <ReferenceLine y={baseline} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
          <Line type="linear" dataKey={metric} name={config.label} stroke={config.color} strokeWidth={2.5} dot={{r: 4}} activeDot={{r: 6}} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
    <p className="text-[10px] text-muted-foreground">단위: {config.unit} · 회색 점선: 현행 기준 · 가로축: 인하율(시간 추이 아님)</p>
    <div className="grid grid-cols-2 gap-2">{points.map(point => {
      const change = baseline ? (point[metric] / baseline - 1) * 100 : 0;
      return <div key={point.cut} className="rounded-md bg-background/70 px-2 py-2 text-[11px]"><span className="text-muted-foreground">{point.cut ? `${point.cut}% 인하` : "현행 유지"}</span><p className="mt-1 font-semibold tabular-nums">{format(point[metric])}</p><p className="text-muted-foreground">{point.cut ? `${change > 0 ? "+" : ""}${change.toFixed(1)}%` : "기준"}</p></div>;
    })}</div>
  </section>;
}
