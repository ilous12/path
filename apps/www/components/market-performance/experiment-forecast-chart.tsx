"use client";
import { forecastChartMargins } from "./forecast-chart-period";
import { FORECAST_METHODS } from "./forecast";
import { hasChannelData } from "./channel-data";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { MAX_DATE } from "./data";
import type { PolicyAlternative } from "./alternative-model";
import {
  experimentChartData,
  EXPERIMENT_CHART_METRICS,
  type ExperimentChartMetric,
} from "./experiment-chart-data";
const config = {
  observed: { label: "관측", color: "var(--color-cyan-500)" },
  reference: { label: "기준 전망", color: "var(--muted-foreground)" },
  forecast: { label: "정책 예측", color: "var(--color-amber-500)" },
};
export function ExperimentForecastChart({
  experiment: source,
  onMethodChange,
}: {
  experiment: PolicyAlternative;
  onMethodChange?: (method: NonNullable<PolicyAlternative["forecastMethod"]>) => void;
}) {
  const [comparisonMethod, setComparisonMethod] = useState<PolicyAlternative["forecastMethod"]>();
  const a = useMemo(() => comparisonMethod && !onMethodChange ? {...source, forecastMethod: comparisonMethod, demoCustomerForecast: undefined, demoEvaluationDate: undefined} : source, [source, comparisonMethod, onMethodChange]);
  const [metric, setMetric] = useState<ExperimentChartMetric>("customers");
  const chart = useMemo(() => experimentChartData(a, metric), [a, metric]);
  const selected = EXPERIMENT_CHART_METRICS.find(
    (item) => item.key === metric,
  )!;
  const rate =
    chart.growthPct === null
      ? "산출 불가"
      : `${chart.growthPct > 0 ? "+" : ""}${chart.growthPct.toFixed(1)}%`;
  if (!hasChannelData(a.targetChannels)) return <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">정책 예상 차트 · 데이터 연결 대기</h2><p className="mt-2 text-sm text-muted-foreground">{a.targetChannels?.join(", ")} 채널의 기준 실적을 연결하면 예측을 계산할 수 있습니다.</p></section>;
  return (
    <section
      aria-label="정책 예상 차트"
      className="space-y-4 rounded-xl border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">정책 예상 차트</h2>
          {a.forecastMethod && <p className="mt-1 text-xs font-medium text-primary">{FORECAST_METHODS[a.forecastMethod].label} · 시작 전 최대 28일 학습</p>}
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {a.targetChannels?.length?`${a.targetChannels.join(", ")} 채널 기준 · `:"전체 채널 기준 · "}시작 전 7일과 전체 예측 기간을 비교합니다. 관측은 실선, 예측은
            점선입니다.
          </p>
        </div>
        <div
          className="flex gap-1 rounded-lg bg-muted/50 p-1"
          role="group"
          aria-label="예측 차트 지표"
        >
          {EXPERIMENT_CHART_METRICS.map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={metric === item.key ? "secondary" : "ghost"}
              aria-pressed={metric === item.key}
              onClick={() => setMetric(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
      <div role="group" aria-label="정책 예측 알고리즘" className="flex flex-wrap gap-2">
        {(["average", "smoothing", "damped", "trend", "prophet", "sarimax", "xgboost"] as const).map(method => <Button type="button" size="sm" key={method} variant={(a.forecastMethod ?? (a.demoCustomerForecast ? undefined : "average")) === method ? "secondary" : "outline"} aria-pressed={(a.forecastMethod ?? (a.demoCustomerForecast ? undefined : "average")) === method} onClick={() => onMethodChange ? onMethodChange(method) : setComparisonMethod(method)}>{FORECAST_METHODS[method].label}</Button>)}
        {comparisonMethod && !onMethodChange && <Button type="button" size="sm" variant="ghost" onClick={() => setComparisonMethod(undefined)}>등록된 예측 보기</Button>}
        <p className="w-full text-xs text-muted-foreground">{onMethodChange ? "선택한 알고리즘을 정책과 함께 저장합니다." : comparisonMethod ? "알고리즘 비교 중 · 등록된 예측과 아래 집계값은 유지됩니다." : "등록된 예측 · 알고리즘을 선택해 같은 기간과 정책 가정으로 비교하세요."} 기준 전망은 정책을 변경하지 않은 경우입니다.</p>

      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="flex items-center gap-2"><span className="w-5 border-t border-dashed border-muted-foreground" />기준 전망 · 정책 유지</span>
        <span className="flex items-center gap-2">
          <span className="w-5 border-t-2 border-cyan-500" />
          관측 · 합성 실적
        </span>
        <span className="flex items-center gap-2">
          <span className="w-5 border-t-2 border-dashed border-amber-500" />
          정책 예측
        </span>
        <span className="text-muted-foreground">
          음영: 적용 {a.start} ~ {chart.applyEnd}
        </span>
      </div>
      <ChartContainer
        config={config}
        className="h-[320px] w-full aspect-auto sm:h-[360px]"
      >
        <LineChart
          accessibilityLayer
          data={forecastChartMargins(chart.rows, "date", metric, "observed", a.targetChannels, undefined, a.composition?.workspace)}
          margin={{ top: 30, right: 80, left: 4, bottom: 6 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 4" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => String(date).slice(5).replace("-", "/")}
            minTickGap={28}
            fontSize={10}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            width={62}
            fontSize={10}
            axisLine={false}
            tickLine={false}
            domain={([low, high]: readonly [number, number]) => [Math.min(0, low), high + Math.max(1, (high - Math.min(0, low)) * 0.12)]}
            tickFormatter={(value) =>
              metric === "revenue" || metric === "netProfit"
                ? `${Math.round(Number(value) / 10000)}만`
                : Math.round(Number(value)).toLocaleString("ko-KR")
            }
          />
          <ReferenceArea
            x1={a.start}
            x2={chart.applyEnd}
            fill="var(--color-amber-500)"
            fillOpacity={0.07}
          />
          <ReferenceLine
            x={a.start}
            stroke="var(--muted-foreground)"
            strokeDasharray="3 3"
            label={{
              value: "정책 시작",
              position: "insideTopLeft",
              fontSize: 10,
              fill: "var(--muted-foreground)",
            }}
          />
          {chart.end > MAX_DATE && chart.start <= MAX_DATE && (
            <ReferenceLine
              x={MAX_DATE}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
              label={{
                value: "관측 마지막 날",
                position: "insideTopRight",
                fontSize: 10,
                fill: "var(--muted-foreground)",
              }}
            />
          )}
          <ChartTooltip
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as
                | (typeof chart.rows)[number]
                | undefined;
              if (!active || !row) return null;
              return (
                <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-md">
                  <p className="mb-2 text-xs font-semibold">{row.date}</p>
                  <p className="mb-2 text-xs text-muted-foreground">{selected.label} 기준 전망: {row.reference === null ? "—" : `${Math.round(row.reference).toLocaleString("ko-KR")}${selected.unit}`}</p>
                  <dl className="space-y-2 text-xs">
                    {EXPERIMENT_CHART_METRICS.map((item) => (
                      <div
                        key={item.key}
                        className="grid grid-cols-[40px_1fr_1fr] gap-4"
                      >
                        <dt>{item.label}</dt>
                        <dd>
                          관측{" "}
                          {row.observation
                            ? `${row.observation[item.key].toLocaleString("ko-KR")}${item.unit}`
                            : "없음"}
                        </dd>
                        <dd>
                          예측{" "}
                          {row.prediction
                            ? `${row.prediction[item.key].toLocaleString("ko-KR")}${item.unit}`
                            : "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            }}
          />
          <Line
            dataKey="observed"
            name="관측"
            type="linear"
            stroke="var(--color-observed)"
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line dataKey="reference" name="기준 전망" type="linear" stroke="var(--color-reference)" strokeWidth={1.5} strokeDasharray="3 4" dot={false} connectNulls={false} isAnimationActive={false} />
          <Line
            dataKey="forecast"
            name="정책 예측"
            type="linear"
            stroke="var(--color-forecast)"
            strokeWidth={3}
            strokeDasharray="6 4"
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={chart.forecastEnd}
            y={chart.last}
            r={4}
            fill="var(--color-forecast)"
            stroke="var(--background)"
            label={{
              value: rate,
              position: "right",
              offset: 10,
              fontSize: 11,
              fontWeight: 700,
              fill: "var(--color-forecast)",
            }}
          />
        </LineChart>
      </ChartContainer>
      <div className="flex flex-wrap justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs leading-5">
        <span>
          예측 종료 {chart.forecastEnd} · {selected.label}{" "}
          {chart.last.toLocaleString("ko-KR")}
          {selected.unit}
        </span>
        <span>
          시작 직전 대비 <strong>{rate}</strong>
        </span>
      </div>
      
    </section>
  );
}
