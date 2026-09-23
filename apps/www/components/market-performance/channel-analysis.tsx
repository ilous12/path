"use client";
import { AIChatTrigger } from "@/registry/blocks/sidebar-03/components/ai-chat";
import { WorkspaceHeader } from "./workspace-header";
import { ChartMixedAxes } from "@/registry/blocks/sidebar-03/components/chart-mixed-axes";
import { RefreshingAnalysis } from "./refreshing-analysis";
import { ForecastLab } from "./forecast-lab";
import { buildChannels } from "./channel-data";
import { useState } from "react";
import Link from "next/link";
import { AnalysisBackLink } from "./analysis-navigation";
import { useSearchParams } from "next/navigation";
import { AnalysisRangeControl, type RangeMode } from "./analysis-range-control";
import { presetRange, validateRange, type Range } from "./data";
import { scopeAnalysis } from "./channel-analysis-model";
export function ChannelAnalysis() {
  const q = useSearchParams();
  const workspace = ["air", "tds", "mvno"].includes(q.get("workspace") ?? "")
    ? q.get("workspace")!
    : "air";
  const channel = q.get("channel") || "APP";
  const requested = { start: q.get("start") ?? "", end: q.get("end") ?? "" };
  const [range, setRange] = useState<Range>(
    validateRange(requested) ? presetRange("1M") : requested,
  );
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [mode, setMode] = useState<RangeMode | undefined>(undefined);
  const report = scopeAnalysis(range, [channel]);
  const channelTotals = buildChannels(range);
  const contribution = channelTotals.find((c) => c.name === channel);
  const totalLines = channelTotals.reduce((s, c) => s + c.total, 0);
  const periodControl = (
<AnalysisRangeControl
            range={range}
            mode={mode}
            onChange={(r, m) => {
              setRange(r);
              setMode(m);
              setRefreshRevision(value=>value+1);
            }}
          />
  );
  return (
    <main className="mars-detail-page space-y-5">
        <div className="flex items-center justify-between gap-3"><AnalysisBackLink
          href={`/?workspace=${workspace}&view=channels`}
          className="text-sm text-muted-foreground"
        >
          ← 이전 화면
        </AnalysisBackLink><AIChatTrigger /></div>
        <WorkspaceHeader>
          <div>
            
            <h1 className="mt-2 text-2xl font-semibold">
              {workspace.toUpperCase()} · {channel} 채널 분석
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {range.start} ~ {range.end}
            </p>
          </div>
          
        </WorkspaceHeader>
        <RefreshingAnalysis refreshKey={`${workspace}:${channel}:${refreshRevision}`}>
        <section
          aria-label="채널 구조와 효율"
          className="grid gap-3 sm:grid-cols-3"
        >
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">전체 가입 기여</h2>
            <p className="mt-2 text-xl font-semibold">
              {contribution && totalLines
                ? `${((contribution.total / totalLines) * 100).toFixed(1)}%`
                : "데이터 없음"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              동일 기간 전체 채널 가입 회선 대비
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">신규 / 번호이동 구성</h2>
            <p className="mt-2 text-xl font-semibold">
              {contribution
                ? `${contribution.newLines.toLocaleString("ko-KR")} / ${contribution.transfers.toLocaleString("ko-KR")}회선`
                : "데이터 없음"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              신규 가입·번호이동 비중
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">채널 운영 판단</h2>
            <p className="mt-2 text-sm leading-6">
              순익률 {report.margin?.toFixed(1) ?? "—"}% · 유입 대비 개통
              전환율·고객 획득비·30일 유지율은 원천 데이터 연결 후 평가합니다.
            </p>
          </div>
        </section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              { key: "customers", label: "가입 회선", unit: "회선" },
              { key: "cancellations", label: "해지", unit: "건" },
              { key: "revenue", label: "매출", unit: "원" },
              { key: "netProfit", label: "순익", unit: "원" },
            ] as const
          ).map((m) => (
            <div key={m.key} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="mt-2 text-xl font-semibold">
                {report.rows.length
                  ? `${report.totals[m.key].toLocaleString("ko-KR")}${m.unit}`
                  : "데이터 없음"}
              </p>
            </div>
          ))}
        </div>
        <section aria-label={`${channel} 채널 타임라인`} className="space-y-3">
          <h2 className="text-lg font-semibold">
            {channel} · 시장·실적 타임라인
          </h2>
          <p className="text-xs text-muted-foreground">
            경쟁사·기타 시장 변화와 채널 적용 이벤트를 표시합니다. 정책은 이
            채널 또는 전체 채널 대상만 표시합니다.
          </p>
          {report.rows.length ? (
            <ChartMixedAxes
              onRangeChange={(next) => {setRange(next);setMode("custom");}}
              channel={channel}
              periodControl={periodControl}
              range={range}
            />
          ) : (
            <div className="space-y-3 rounded-xl border p-4">{periodControl}<p className="p-4 text-center text-muted-foreground">연결된 채널 데이터가 없습니다.</p></div>
          )}
        </section>
        <ForecastLab
          range={range}
          channels={[channel]}
          title={`${channel} 채널 · 예측 비교`}
        />
        </RefreshingAnalysis>
    </main>
  );
}
