"use client";
import { forecastChartMargins } from "./forecast-chart-period";
import { WorkspaceHeader } from "./workspace-header";
import { PageEntry } from "./page-entry";
import { useMemo, useState } from "react";
import { AnalysisMenu } from "./analysis-menu";
import { useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventManagement } from "@/registry/blocks/sidebar-03/components/event-management";
import { useAlternatives } from "./alternative-store";
import { dayShift, type PolicyAlternative } from "./alternative-model";
import {
  experimentChartData,
  EXPERIMENT_CHART_METRICS,
} from "./experiment-chart-data";
import { forecastFit } from "./forecast-fit";
function ExperimentCard({
  item,
  workspace,
}: {
  item: PolicyAlternative;
  workspace: string;
}) {
  const comparison = useMemo(
    () =>
      EXPERIMENT_CHART_METRICS.map((metric) => {
        const data = experimentChartData(item, metric.key);
        return {
          ...metric,
          data,
          fit: forecastFit(data.rows.filter((r) => r.date >= item.start)),
        };
      }),
    [item],
  );
  const rows = comparison[0].data.rows;
  return (
    <article className="min-w-0 rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {item.type} · {item.targetChannels?.join(" · ") || "전체 채널"}
        </span>
        <span>
          {{ draft: "초안", applied: "적용", paused: "해제" }[item.status]}
        </span>
      </div>
      <h2 className="font-semibold leading-snug">{item.title}</h2>
      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {item.description}
      </p>
      <p className="text-xs text-muted-foreground">
        적용 {item.start} ~{" "}
        {dayShift(item.start, (item.applyDays ?? item.days) - 1)}
        <br />
        예측 종료 {dayShift(item.start, item.days - 1)}
      </p>
      <div
        className="h-40"
        role="img"
        aria-label={`${item.title} 회선 예측과 관측 비교`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={forecastChartMargins(rows, "date", "customers", "observed", item.targetChannels)}
            margin={{ left: -20, right: 8, top: 8, bottom: 0 }}
          >
            <XAxis
              dataKey="date"
              tickFormatter={(d) => d.slice(5)}
              minTickGap={35}
              tick={{ fontSize: 10 }}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                borderColor: "var(--border)",
                fontSize: 11,
              }}
            />
            <Line
              dataKey="observed"
              name="관측 회선"
              stroke="var(--chart-1)"
              dot={false}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="forecast"
              name="예측 회선"
              stroke="var(--chart-3)"
              dot={false}
              strokeDasharray="5 4"
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground">
        실선: 관측 · 점선: 예측 · 현재 관측 계열은 합성 실적
      </p>
      <table className="w-full text-xs">
        <caption className="pb-2 text-left font-medium">
          예측·관측 수치 비교
        </caption>
        <thead className="text-muted-foreground">
          <tr>
            <th className="text-left">지표 / 일수</th>
            <th className="text-right">MAE</th>
            <th className="text-right">WAPE</th>
            <th className="text-right">유사도</th>
          </tr>
        </thead>
        <tbody>
          {comparison.map((m) => (
            <tr key={m.key} className="border-t">
              <td className="py-2">
                {m.label} · {m.fit.count}일
              </td>
              <td className="text-right">
                {m.fit.mae === null
                  ? "—"
                  : `${Math.round(m.fit.mae).toLocaleString("ko-KR")}${m.unit}`}
              </td>
              <td className="text-right">
                {m.fit.wape === null ? "—" : `${m.fit.wape.toFixed(1)}%`}
              </td>
              <td className="text-right">
                {m.fit.similarity === null
                  ? "—"
                  : `${m.fit.similarity.toFixed(1)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        정책 시작 후 겹치는 관측일만 비교. MAE=평균 절대오차, WAPE=절대오차
        합/관측 절댓값 합, 유사도=max(0, 100−WAPE). 관측 합이 0이면 비율 미산출.
        정책 효과나 검증된 예측 정확도를 뜻하지 않습니다.
      </p>
      <div className="flex justify-end">
        <AnalysisMenu
          label={`${item.title} 상세 메뉴`}
          href={`/analysis?${new URLSearchParams({ workspace, experiment: item.id })}`}
        />
      </div>
    </article>
  );
}
export function ExperimentCards() {
  const { alternatives } = useAlternatives();
  const workspace = useSearchParams().get("workspace") ?? "air";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const rows = alternatives
    .filter(
      (a) =>
        (a.workspace ?? a.operator ?? "air").toLowerCase() ===
          workspace.toLowerCase() &&
        (status === "all" || a.status === status) &&
        `${a.title} ${a.description}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pages = Math.max(1, Math.ceil(rows.length / 6));
  const current = Math.min(page, pages - 1);
  return (
    <div className="space-y-6 pb-12">
      <WorkspaceHeader>
        <div>
          <h1 className="text-2xl font-semibold">정책 오버뷰</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            정책 가정과 관측 결과를 비교하고 다음 검증을 결정하세요.
          </p>
        </div>
        <EventManagement compact registrationKind="experiment" />
      </WorkspaceHeader>
      <PageEntry>
      <div className="flex gap-2">
        <Input
          aria-label="캠페인 검색"
          placeholder="캠페인 검색"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
        <select
          className="rounded-md border bg-background px-3 text-sm"
          aria-label="캠페인 상태"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          <option value="all">모든 상태</option>
          <option value="draft">초안</option>
          <option value="applied">적용</option>
          <option value="paused">해제</option>
        </select>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.slice(current * 6, current * 6 + 6).map((a) => (
          <ExperimentCard key={a.id} item={a} workspace={workspace} />
        ))}
      </div>
      {!rows.length && (
        <p className="p-12 text-center text-sm text-muted-foreground">
          조건에 맞는 정책이 없습니다.
        </p>
      )}
      <footer className="flex items-center justify-between text-xs">
        <span>
          {rows.length}건 · {current + 1}/{pages} 페이지
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={!current}
            onClick={() => setPage(current - 1)}
          >
            이전
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={current + 1 >= pages}
            onClick={() => setPage(current + 1)}
          >
            다음
          </Button>
        </div>
      </footer>
      </PageEntry>
    </div>
  );
}
