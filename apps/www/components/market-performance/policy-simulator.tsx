"use client";
import { useLayoutEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { EllipsisVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { scopedPerformance } from "./channel-data";
import { buildPerformance, type Range, type MarketEvent } from "./data";
import {
  FORECAST_METHODS,
  forecastPolicy,
  type ForecastMethod,
} from "./forecast";

import { FORECAST_CANDIDATES, recommendForecasts } from "./forecast-candidates";

type Alternative = {
  title: string;
  tag: string;
  benefit: string;
  cost: string;
  risk: string;
  condition: string;
};
const metrics = {
  customers: "회선",
  cancellations: "해지",
  revenue: "매출",
  netProfit: "순익",
};
type Metric = keyof typeof metrics;
// Illustrative scenario assumptions, not a fitted forecast or causal estimate.
const effects = [
  { customers: 0, cancellations: 0, revenue: 0, netProfit: 0 },
  { customers: 0.18, cancellations: -0.12, revenue: 0.12, netProfit: -0.08 },
  { customers: 0.28, cancellations: -0.18, revenue: 0.08, netProfit: -0.2 },
];
export function PolicySimulator({
  range,
  alternatives,
  events,
  onSelectionChange,
  selectedIndex,
  onDetail,
  channels,
}: {
  range: Range;
  alternatives: Alternative[];
  events: MarketEvent[];
  onSelectionChange?: (index: number) => void;
  channels?: string[];
  selectedIndex?: number;
  onDetail?: (index: number) => void;
}) {
  const [localSelected, setSelected] = useState(0);
  const selected = selectedIndex ?? localSelected;
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const scenarioRef = useRef<HTMLDivElement>(null);
  const [connection, setConnection] = useState<{
    path: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  useLayoutEffect(() => {
    const container = containerRef.current,
      active = activeRef.current,
      scenario = scenarioRef.current;
    if (!container || !active || !scenario) return;
    const update = () => {
      const root = container.getBoundingClientRect(),
        from = active.getBoundingClientRect(),
        to = scenario.getBoundingClientRect();
      if (to.left <= from.right) {
        setConnection(null);
        return;
      }
      const x1 = from.right - root.left,
        y1 = from.top - root.top + from.height / 2;
      const x2 = to.left - root.left,
        y2 = y1;
      setConnection({
        path: `M ${x1} ${y1} H ${x2}`,
        x1,
        y1,
        x2,
        y2,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    [container, active, scenario].forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [selected]);
  const [metric, setMetric] = useState<Metric>("customers");
  const [methods, setMethods] = useState<ForecastMethod[]>([
    "smoothing",
    "damped",
    "trend",
  ]);
  const setMethod = (next: ForecastMethod) =>
    setMethods((current) =>
      current.map((value, index) => (index === selected ? next : value)),
    );
  const training = scopedPerformance(range, channels).slice(-28);
  const history = training.slice(-7);
  const recommendation = recommendForecasts(
    events,
    training.map((row) => row[metric]),
    selected,
  );
  const allowedMethods = recommendation.candidates.map((key) =>
    key === "damped" && selected === 0 ? "smoothing" : key,
  );
  const method = allowedMethods.includes(
    methods[selected] as (typeof allowedMethods)[number],
  )
    ? methods[selected]
    : (["smoothing", "damped", "trend"] as ForecastMethod[])[selected];
  const forecast = forecastPolicy(training, method, effects[selected]);
  const baseline =
    history.reduce((sum, row) => sum + row[metric], 0) /
    Math.max(1, history.length);
  const last = history.at(-1)?.[metric] ?? 0;
  const effect = effects[selected][metric];
  const shift = (days: number) =>
    new Date(Date.parse(`${range.end}T00:00:00Z`) + days * 86400000)
      .toISOString()
      .slice(0, 10);
  const data = [
    ...history.map((row, i) => ({
      date: row.key,
      actual: row[metric],
      current: i === history.length - 1 ? last : null,
      predicted: i === history.length - 1 ? last : null,
    })),
    ...Array.from({ length: 30 }, (_, i) => ({
      date: shift(i + 1),
      actual: null,
      current: forecast[i].current[metric],
      predicted: forecast[i].predicted[metric],
    })),
  ];
  const money = metric === "revenue" || metric === "netProfit";
  const format = (v: number) =>
    `${money ? "₩" : ""}${Math.round(v).toLocaleString("ko-KR")}${money ? "" : metric === "customers" ? "회선" : "건"}`;
  const option = alternatives[selected];
  return (
    <div
      ref={containerRef}
      className="relative grid items-stretch gap-4 lg:gap-12 lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)]"
    >
      {connection && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full overflow-visible text-primary lg:block"
        >
          <path
            d={connection.path}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          />
          <circle
            cx={connection.x1}
            cy={connection.y1}
            r={4}
            fill="currentColor"
          />
          <circle
            cx={connection.x2}
            cy={connection.y2}
            r={4}
            fill="currentColor"
          />
        </svg>
      )}
      <div
        className="flex h-full flex-col gap-3"
        role="group"
        aria-label="정책 실험 선택"
      >
        {alternatives.slice(0, 3).map((item, index) => (
          <div key={item.title} className="relative flex flex-1">
            <button
              ref={selected === index ? activeRef : undefined}
              type="button"
              aria-pressed={selected === index}
              onClick={() => {
                setSelected(index);
                onSelectionChange?.(index);
              }}
              className={`w-full flex-1 rounded-xl border p-4 pr-12 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary ${selected === index ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:bg-muted/50"}`}
            >
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>실험 0{index + 1}</span>
                <span>{selected === index ? "선택됨" : item.tag}</span>
              </div>
              <h3 className="mt-2 font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.benefit}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                비용 · {item.cost}
              </p>
              {selected === index && (
                <div className="mt-4 space-y-3 border-t border-primary/20 pt-4">
                  <div>
                    <p className="text-xs font-semibold text-primary">
                      선택 근거
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.condition}. 선택 기간의 최근 {history.length}일
                      일평균 {metrics[metric]}은 {format(baseline)}입니다. 이
                      수치를 비교 기준으로 검토합니다.
                    </p>
                  </div>
                </div>
              )}
            </button>
            {onDetail && (
              <div className="absolute right-2 top-2">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`실험 ${index + 1} 상세 메뉴`}
                      />
                    }
                  >
                    <EllipsisVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    matchAnchorWidth={false}
                    className="w-40"
                  >
                    <DropdownMenuItem onClick={() => onDetail(index)}>
                      상세보기
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        ))}
      </div>
      <div ref={scenarioRef} className="min-w-0">
        <Card className="h-full min-w-0 border-2 border-primary/60">
          <CardHeader>
            <CardTitle>
              현재와 정책 적용 전망{" "}
              <span className="ml-2 rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                Phase 1
              </span>
            </CardTitle>
            <CardDescription>
              기준일 {range.end} · 이후 30일 · {option.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <fieldset className="rounded-xl border bg-muted/20 p-3">
              <legend className="px-1 text-xs font-semibold">
                예측 알고리즘
              </legend>
              <div className="flex flex-wrap gap-2">
                {recommendation.candidates.map((key) => {
                  const option = FORECAST_CANDIDATES[key];
                  const resolved =
                    key === "damped" && selected === 0 ? "smoothing" : key;
                  return (
                    <Button
                      key={key}
                      size="sm"
                      variant={method === resolved ? "secondary" : "ghost"}
                      aria-pressed={method === resolved}
                      disabled={training.length < 2}
                      title={option.description}
                      onClick={() => setMethod(resolved)}
                    >
                      {resolved === "smoothing"
                        ? "수준 지수평활"
                        : resolved === "damped"
                          ? "감쇠 추세 지수평활"
                          : option.label}
                    </Button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {recommendation.reason}
                <span className="mt-2 block">
                  알고리즘 선택은 실험별로 유지됩니다. 실험 간 전망 차이에는
                  모델 차이와 정책 효과 가정이 함께 포함됩니다.
                </span>
              </p>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {FORECAST_METHODS[method].description}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                관측 구간{" "}
                {method === "average" ? history[0]?.key : training[0]?.key} ~{" "}
                {range.end} ·{" "}
                {method === "average" ? history.length : training.length}일 관측
                {training.length < 2
                  ? " · 추세 계산에 필요한 관측이 부족해 마지막 값을 유지합니다."
                  : ""}
              </p>
            </fieldset>
            <div className="flex flex-wrap gap-1">
              {Object.entries(metrics).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={metric === key ? "secondary" : "ghost"}
                  aria-pressed={metric === key}
                  onClick={() => setMetric(key as Metric)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-xs">
              <span>실선: 관측 실적</span>
              <span className="text-muted-foreground">
                회색 점선: 현행 유지
              </span>
              <span className="text-primary">강조 점선: 선택 실험</span>
            </div>
            <ChartContainer
              className="h-72 w-full"
              config={{
                actual: { label: "관측 실적", color: "var(--chart-2)" },
                current: {
                  label: "현행 유지",
                  color: "var(--muted-foreground)",
                },
                predicted: { label: "선택 실험", color: "var(--primary)" },
              }}
            >
              <LineChart
                data={data}
                margin={{ left: 12, right: 16, top: 20, bottom: 4 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 4" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => v.slice(5)}
                  minTickGap={30}
                />
                <YAxis
                  width={78}
                  tickFormatter={(v) =>
                    money ? `₩${Math.round(v / 10000)}만` : `${v}`
                  }
                  domain={
                    metric === "netProfit" ? ["auto", "auto"] : [0, "auto"]
                  }
                />
                <ReferenceLine
                  x={range.end}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="3 3"
                  label={{
                    value: "예측 시작",
                    position: "insideTopLeft",
                    fontSize: 10,
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <span>
                          {name === "actual"
                            ? "관측 실적"
                            : name === "current"
                              ? "현행 유지"
                              : "선택 실험"}
                          : {format(Number(value))}
                        </span>
                      )}
                    />
                  }
                />
                <Line
                  dataKey="actual"
                  stroke="var(--color-actual)"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  dataKey="current"
                  stroke="var(--color-current)"
                  dot={false}
                  strokeDasharray="3 4"
                  strokeWidth={2}
                />
                <Line
                  dataKey="predicted"
                  stroke="var(--color-predicted)"
                  dot={false}
                  strokeDasharray="7 4"
                  strokeWidth={3}
                />
              </LineChart>
            </ChartContainer>
            <div
              aria-live="polite"
              className="grid gap-3 rounded-lg bg-muted/40 p-4 sm:grid-cols-2"
            >
              <div>
                <p className="text-xs text-muted-foreground">
                  30일 후 일간 {metrics[metric]}
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {format(forecast.at(-1)!.predicted[metric])}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  현행 유지 대비 가정
                </p>
                <p className="mt-1 text-lg font-semibold text-primary">
                  {effect > 0 ? "+" : ""}
                  {Math.round(effect * 100)}%
                </p>
              </div>
            </div>
            <p className="text-xs leading-6 text-muted-foreground">
              {FORECAST_METHODS[method].label} 방식으로 계산한 기준 예측과 정책
              적용 전망을 비교합니다. 정책 효과는 선택 실험의 가정이며 인과
              효과를 추정한 값은 아닙니다. 현행 유지 선택 시 두 선은 겹칩니다.
              음수 회선·해지는 0으로, 해지는 회선 이하로 제한합니다.
            </p>
            <div className="grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
              <div>
                <p className="font-medium">위험</p>
                <p className="mt-1 text-muted-foreground">{option.risk}</p>
              </div>
              <div>
                <p className="font-medium">검토 조건</p>
                <p className="mt-1 text-muted-foreground">{option.condition}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
