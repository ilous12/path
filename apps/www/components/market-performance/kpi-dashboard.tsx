"use client";
import { withPeriodMargins, chartObservationRange } from "./chart-period";
import { WorkspaceHeader } from "./workspace-header";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTimelineRange } from "./timeline-range";
import { AnalysisRangeControl } from "./analysis-range-control";
import { RefreshingAnalysis } from "./refreshing-analysis";
import { buildKpi } from "./kpi-model";
const n = (v: number | null, unit = "") =>
  v === null ? "산출 대기" : `${Math.round(v).toLocaleString("ko-KR")}${unit}`;
const pct = (v: number | null) =>
  v === null ? "산출 대기" : `${v.toFixed(2)}%`;
const tooltipStyle = {
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  borderColor: "var(--border)",
  fontSize: 12,
};
export function KpiDashboard() {
  const workspace = useSearchParams().get("workspace") ?? "air";
  const [range, , mode, selectRange] = useTimelineRange(workspace);
  const base = null;
  const contribution = 20;
  const data = useMemo(
    () => buildKpi(range, base, contribution),
    [range, base, contribution],
  );
  const chartRows = useMemo(()=>buildKpi(chartObservationRange(range), base, contribution).rows,[range,base,contribution]);
  const metrics = [
    ["전체 가입", n(data.acquisitions, "회선"), "010 신규 + 번호이동"],
    ["010 신규", n(data.total.newLines, "회선"), "기간 내 신규 번호 개통"],
    ["번호이동", n(data.total.transfers, "회선"), "기간 내 번호이동 유입"],
    ["순증", n(data.netAdds, "회선"), "전체 가입 − 해지"],
    ["매출", n(data.total.revenue, "원"), "선택 기간 합계"],
    ["순익", n(data.total.netProfit, "원"), `순이익률 ${pct(data.margin)}`],
    [
      "해지율 · 월 환산",
      pct(data.monthlyChurn),
      "기초 회선 가정 기반 · 30일 환산",
    ],
    ["LTV · 기여이익 기준", n(data.ltv, "원"), "ARPU × 기여이익률 / 월 해지율"],
  ];
  return (
    <div className="space-y-5 pb-12">
      <WorkspaceHeader>
        <div>
          <h1 className="text-2xl font-semibold">
            {workspace.toUpperCase()} KPI
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            가입 성장·고객 유지·수익성을 함께 확인하세요.
          </p>
        </div>
        <AnalysisRangeControl
          range={range}
          mode={mode}
          onChange={selectRange}
        />
      </WorkspaceHeader>
      <RefreshingAnalysis
        mode="detail"
        refreshKey={`${workspace}:${range.start}:${range.end}`}
      >
      <p className="text-xs text-muted-foreground">
        {range.start} ~ {range.end} · 일별 가입·해지·매출·순익 기준
      </p>
        <div className="space-y-5">
          <section
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="핵심 성과 지표"
          >
            {metrics.map(([title, value, note]) => (
              <article key={title} className="rounded-xl border bg-card p-4">
                <h2 className="text-xs text-muted-foreground">{title}</h2>
                <p className="mt-2 text-xl font-semibold tabular-nums">
                  {value}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">{note}</p>
              </article>
            ))}
          </section>
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="min-w-0 rounded-xl border bg-card p-4">
              <h2 className="font-semibold">회선 성장 · 010 신규 / 번호이동</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={withPeriodMargins(chartRows, "date", range)}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => v.slice(5)}
                      minTickGap={35}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      dataKey="newLines"
                      name="010 신규"
                      stackId="lines"
                      stroke="var(--chart-1)"
                      fill="var(--chart-1)"
                      fillOpacity={0.25}
                      isAnimationActive={false}
                    />
                    <Area
                      dataKey="transfers"
                      name="번호이동"
                      stackId="lines"
                      stroke="var(--chart-2)"
                      fill="var(--chart-2)"
                      fillOpacity={0.25}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="min-w-0 rounded-xl border bg-card p-4">
              <h2 className="font-semibold">매출 · 순익 추이</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={withPeriodMargins(chartRows, "date", range)}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => v.slice(5)}
                      minTickGap={35}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickFormatter={(v) => `${v / 10000}만`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(v) => n(Number(v), "원")}
                      contentStyle={tooltipStyle}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      dataKey="revenue"
                      name="매출"
                      stroke="var(--chart-1)"
                      dot={false}
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                    <Line
                      dataKey="netProfit"
                      name="순익"
                      stroke="var(--chart-3)"
                      dot={false}
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="min-w-0 rounded-xl border bg-card p-4">
              <h2 className="font-semibold">해지 건수 · 일별 해지율</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={withPeriodMargins(chartRows, "date", range)}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => v.slice(5)}
                      minTickGap={35}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis yAxisId="count" tick={{ fontSize: 11 }} />
                    <YAxis
                      yAxisId="rate"
                      orientation="right"
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      yAxisId="count"
                      dataKey="cancellations"
                      name="해지 건수"
                      stroke="var(--chart-2)"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="rate"
                      dataKey="churn"
                      name="일별 해지율(%, 가정)"
                      stroke="var(--chart-4)"
                      dot={false}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="rounded-xl border bg-card p-4">
              <h2 className="font-semibold">고객 생애 가치 · LTV</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                기여이익 기준 단순 정상상태 추정. 할인율·CAC·코호트 유지율은
                반영하지 않습니다.
              </p>
              <dl className="mt-5 space-y-4 text-sm">
                {[
                  ["월 환산 ARPU", n(data.arpu, "원")],
                  ["기여이익률 가정", `${contribution}%`],
                  ["월 해지율 가정", pct(data.monthlyChurn)],
                  [
                    "추정 유지 기간",
                    data.monthlyChurn
                      ? `${(100 / data.monthlyChurn).toFixed(1)}개월`
                      : "산출 대기",
                  ],
                  ["기여이익 LTV", n(data.ltv, "원")],
                  ["기말 활성 회선 가정", n(data.closingBase, "회선")],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b pb-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>
      </RefreshingAnalysis>
    </div>
  );
}
