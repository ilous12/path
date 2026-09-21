"use client";
import { DataBasis } from "./data-basis";
import { useState } from "react";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { scopedPerformance } from "./channel-data";
import {
  FORECAST_METHODS,
  forecastPolicy,
  type ForecastMethod,
  type ForecastMetric,
} from "./forecast";
import { dayShift } from "./alternative-model";
import type { Range } from "./data";

const methods = ["average", "smoothing", "damped", "trend", "prophet", "sarimax", "xgboost"] as const;
const metrics = {
  customers: "회선",
  cancellations: "해지",
  revenue: "매출",
  netProfit: "순익",
};
const colors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--color-sky-500)",
  "var(--color-rose-500)",
];
export function ForecastLab(props: {
  range: Range;
  channels?: string[];
  title?: string;
}) {
  return (
    <Lab
      key={`${props.range.start}:${props.range.end}:${props.channels?.join(",")}`}
      {...props}
    />
  );
}
function Lab({
  range,
  channels,
  title = "예측 알고리즘 시뮬레이션",
}: {
  range: Range;
  channels?: string[];
  title?: string;
}) {
  const [selected, setSelected] = useState<ForecastMethod[]>([
    "average",
    "damped",
  ]);
  const [metric, setMetric] = useState<ForecastMetric>("customers");
  const [horizon, setHorizon] = useState(30);
  const history = scopedPerformance(range, channels).slice(-28);
  const last = history.at(-1);
  const config = {
    observed: { label: "관측", color: "var(--foreground)" },
    ...Object.fromEntries(
      methods.map((m, i) => [
        m,
        { label: FORECAST_METHODS[m].label, color: colors[i] },
      ]),
    ),
  };
  const projections = selected.map((method) => ({
    method,
    rows: forecastPolicy(
      history,
      method,
      {
        customers: 0,
        cancellations: 0,
        revenue: 0,
        netProfit: 0,
      },
      horizon,
    ),
  }));
  const rows: Record<string, string | number | null>[] = history.map(
    (r, i) => ({
      date: r.key,
      observed: r[metric],
      ...Object.fromEntries(
        selected.map((m) => [m, i === history.length - 1 ? r[metric] : null]),
      ),
    }),
  );
  if (last)
    for (let day = 0; day < horizon; day++)
      rows.push({
        date: dayShift(last.key, day + 1),
        observed: null,
        ...Object.fromEntries(
          projections.map((p) => [p.method, p.rows[day].predicted[metric]]),
        ),
      });
  return (
    <section
      aria-label={title}
      className="space-y-4 rounded-xl border bg-card p-5"
    >
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {channels?.length ? channels.join(", ") : "전체 채널"} · 조회 구간의
          마지막 최대 28일로 학습 · 기준일 {last?.key ?? "없음"}. 여러
          알고리즘을 함께 비교할 수 있습니다.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="비교할 예측 알고리즘"
        >
          {methods.map((m) => (
            <Button
              key={m}
              size="sm"
              variant={selected.includes(m) ? "secondary" : "outline"}
              aria-pressed={selected.includes(m)}
              onClick={() =>
                setSelected((current) =>
                  current.includes(m)
                    ? current.length > 1
                      ? current.filter((x) => x !== m)
                      : current
                    : [...current, m],
                )
              }
            >
              {FORECAST_METHODS[m].label}
            </Button>
          ))}
        </div>
        <div
          role="group"
          aria-label="예측 비교 지표"
          className="ml-auto flex flex-wrap gap-2"
        >
          {(Object.entries(metrics) as [ForecastMetric, string][]).map(
            ([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={metric === key ? "secondary" : "outline"}
                aria-pressed={metric === key}
                onClick={() => {
                  setMetric(key);
                }}
              >
                {label}
              </Button>
            ),
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="grid gap-1 text-xs">
          예측 기간
          <select
            className="h-9 rounded-md border bg-background px-2"
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
          >
            {[7, 14, 30, 90].map((d) => (
              <option key={d} value={d}>
                {d}일
              </option>
            ))}
          </select>
        </label>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setHorizon(30);
            setSelected(["average", "damped"]);
          }}
        >
          초기화
        </Button>
      </div>
      {history.length < 7 ? (
        <p className="rounded-lg bg-muted p-4 text-sm">
          최소 7일의 연결된 관측 데이터가 필요합니다. 조회 기간을 늘리거나 채널
          데이터를 연결하세요.
        </p>
      ) : (
        <>
          <ChartContainer config={config} className="h-72 w-full aspect-auto">
            <LineChart
              data={rows}
              margin={{ left: 12, right: 24, top: 20, bottom: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(s) => s.slice(5)}
                minTickGap={35}
              />
              <YAxis
                width={70}
                domain={["auto", "auto"]}
                tickFormatter={(v) =>
                  Math.abs(v) >= 10000
                    ? `${Math.round(v / 10000)}만`
                    : Number(v).toLocaleString("ko-KR")
                }
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine
                x={last!.key}
                label={{
                  value: "예측 시작",
                  position: "insideTopLeft",
                  fontSize: 10,
                }}
                stroke="var(--muted-foreground)"
              />
              <Line
                dataKey="observed"
                stroke="var(--foreground)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              {selected.map((m) => (
                <Line
                  key={m}
                  dataKey={m}
                  stroke={
                    colors[methods.indexOf(m as (typeof methods)[number])]
                  }
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
          <div className="grid gap-3 sm:grid-cols-2">
            {projections.map((p) => (
              <div key={p.method} className="rounded-lg bg-muted/30 p-3">
                <p
                  className="text-sm font-medium"
                  style={{
                    color:
                      colors[
                        methods.indexOf(p.method as (typeof methods)[number])
                      ],
                  }}
                >
                  {FORECAST_METHODS[p.method].label} ·{" "}
                  {p.rows.at(-1)!.predicted[metric].toLocaleString("ko-KR")}
                  {metric === "revenue" || metric === "netProfit"
                    ? "원"
                    : metric === "customers"
                      ? "회선"
                      : "건"}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {FORECAST_METHODS[p.method].description.replace(
                    "향후 30일",
                    `향후 ${horizon}일`,
                  )}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
      <DataBasis label="합성 데이터 · 산출 기준" details="합성 실적에 기반한 통계 시뮬레이션입니다. Prophet·SARIMAX·XGBoost는 근사 계산이며 학습된 모델 결과가 아닙니다. 정책 인과효과·신뢰구간을 의미하지 않으며 등록된 예측은 변경하지 않습니다." />
    </section>
  );
}
