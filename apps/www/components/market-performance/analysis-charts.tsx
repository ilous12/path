"use client";
import { withPeriodMargins, chartObservationRange } from "./chart-period";
import {
  CartesianGrid,
  LineChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { buildPerformance, type Range } from "./data";

export function AnalysisChart({
  range,
  money = false,
}: {
  range: Range;
  money?: boolean;
}) {
  const data = buildPerformance(chartObservationRange(range), "day");
  const config: Record<string, { label: string; color: string }> = money
    ? {
        revenue: { label: "매출", color: "var(--chart-1)" },
        netProfit: { label: "순익", color: "var(--chart-3)" },
      }
    : {
        customers: { label: "회선", color: "var(--chart-4)" },
        cancellations: { label: "해지", color: "var(--chart-2)" },
      };
  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs">
        {Object.entries(config).map(([key, item]) => (
          <span className="flex items-center gap-1.5" key={key}>
            <span
              className="size-2 rounded-full"
              style={{ background: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
      <ChartContainer className="h-56 w-full" config={config}>
        <LineChart
          data={withPeriodMargins(data, "key", range)}
          margin={{ top: 8, left: 0, right: 8, bottom: 4 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 4" />
          <XAxis
            dataKey="key"
            axisLine={false}
            tickLine={false}
            minTickGap={32}
            tickFormatter={(value) =>
              String(value).length === 10
                ? String(value).slice(5)
                : String(value)
            }
          />
          <YAxis
            width={68}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) =>
              money
                ? Math.abs(value) >= 1e8
                  ? `₩${(value / 1e8).toFixed(1)}억`
                  : `₩${Math.round(value / 1e4)}만`
                : Number(value).toLocaleString("ko-KR")
            }
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <span>
                    {config[name as keyof typeof config]?.label}:{" "}
                    {money ? "₩" : ""}
                    {Number(value).toLocaleString("ko-KR")}
                    {money ? "" : "건"}
                  </span>
                )}
              />
            }
          />
          {Object.keys(config).map(metric=><Line key={metric} dataKey={metric} stroke={`var(--color-${metric})`} strokeWidth={2.5} dot={false} activeDot={{r:4}} type="linear" connectNulls={false} isAnimationActive={false}/>)}
        </LineChart>
      </ChartContainer>
    </div>
  );
}
