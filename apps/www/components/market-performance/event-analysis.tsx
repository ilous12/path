"use client";
import { AIChatTrigger } from "@/registry/blocks/sidebar-03/components/ai-chat";
import { WorkspaceHeader } from "./workspace-header";
import { RefreshingAnalysis } from "./refreshing-analysis";
import { ForecastLab } from "./forecast-lab";

import Link from "next/link";
import { AnalysisBackLink } from "./analysis-navigation";
import { useSearchParams } from "next/navigation";
import { useEventCatalog } from "./event-catalog";
import { useAnalysisExclusions } from "./use-analysis-exclusions";
import { AnalysisChart } from "./analysis-charts";
import { AnalysisExperimentPipeline } from "./analysis-experiment-pipeline";
import { EventProvenance } from "./event-provenance";
import {
  buildPerformance,
  RECOVERY_MILESTONES,
  MIN_DATE,
  MAX_DATE,
  presetRange,
  validateRange,
} from "./data";
import { dayShift } from "./alternative-model";

const n = (value: number) =>
  value.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
export function EventAnalysis() {
  const q = useSearchParams();
  const workspace = ["air", "tds", "mvno"].includes(q.get("workspace") ?? "")
    ? q.get("workspace")!
    : "air";
  const { events } = useEventCatalog();
  const hidden = useAnalysisExclusions();
  const ids = (q.get("events") ?? "").split(",");
  const dates = (q.get("pivots") ?? "").split(",");
  const pivot = q.has("pivots");
  const selected = events.filter(
    (e) => ids.includes(e.id) && !hidden.includes(e.id),
  );
  const points = RECOVERY_MILESTONES.filter((p) => dates.includes(p.date));
  const own =
    !pivot &&
    selected.length > 0 &&
    selected.every((e) => e.operator.toLowerCase() === workspace);
  const requested = { start: q.get("start") ?? "", end: q.get("end") ?? "" };
  const range = validateRange(requested) ? presetRange("1M") : requested;
  const anchor = [
    ...selected.map((e) => e.startAt.slice(0, 10)),
    ...points.map((p) => p.date),
  ].sort()[0];
  const title = pivot
    ? "변곡점 상세 분석"
    : own
      ? `${workspace.toUpperCase()} 정책·이벤트 상세 분석`
      : "경쟁사·기타 이벤트 상세 분석";
  const back = `/?workspace=${workspace}&start=${range.start}&end=${range.end}`;
  if (!anchor)
    return (
      <main className="mx-auto max-w-5xl space-y-4 p-8">
        <div className="flex items-center justify-between gap-3"><AnalysisBackLink href={back}>← 이전 화면</AnalysisBackLink><AIChatTrigger /></div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p>
          선택한 항목을 찾을 수 없거나 숨김 처리되었습니다. 타임라인에서 다시
          선택하세요.
        </p>
      </main>
    );
  const beforeStart =
    dayShift(anchor, -7) < MIN_DATE ? MIN_DATE : dayShift(anchor, -7);
  const afterEnd =
    dayShift(anchor, 6) > MAX_DATE ? MAX_DATE : dayShift(anchor, 6);
  const before =
    anchor > MIN_DATE
      ? buildPerformance(
          { start: beforeStart, end: dayShift(anchor, -1) },
          "day",
        )
      : [];
  const after = buildPerformance({ start: anchor, end: afterEnd }, "day");
  const mean = (
    rows: typeof before,
    key: "customers" | "cancellations" | "revenue" | "netProfit",
  ) =>
    rows.length ? rows.reduce((s, r) => s + r[key], 0) / rows.length : null;
  const channels = selected.some((e) => !e.targetChannels?.length)
    ? []
    : [...new Set(selected.flatMap((e) => e.targetChannels ?? []))];
  const questions = pivot
    ? [
        [
          "평가 근거",
          "전환일 전후의 일평균과 흐름 지속 여부를 확인합니다. 아래 전후 비교는 원인 추정이 아닌 기술 통계입니다.",
        ],
        [
          "원인 가설",
          "가격·혜택 변경, 채널 유입 구성, 요일 효과, 집계 오류를 각각 후보로 검토합니다.",
        ],
        [
          "추가 검증",
          "비교군·동일 요일·충분한 관측 기간으로 재검증합니다.",
        ],
      ]
    : own
      ? [
          [
            "실행 내용",
            "변경 전후 조건, 적용 채널·기간, 실제 실행 여부를 출처와 대조합니다.",
          ],
          [
            "성과 확인",
            "회선·해지와 함께 순익·혜택 지급 비용을 확인합니다. 동시기 외부 변화를 분리해야 합니다.",
          ],
          [
            "다음 판단",
            "유지·확대·수정·중단 후보를 예산·마진 제약과 비교한 뒤 사용자가 정책을 선택합니다.",
          ],
        ]
      : [
          [
            "동일 조건 비교",
            "망·데이터·QoS·통화·할인 기간·정상 요금을 맞춰 비교합니다. 미확인 조건은 가격 우위로 판단하지 않습니다.",
          ],
          [
            "우리 사업 영향",
            "외부 사업자의 실적은 제공되지 않습니다. 아래 차트는 우리 사업의 실적입니다.",
          ],
          [
            "대응 검토",
            "상품 조건·노출 채널·마진 근거가 충분하면 대응 검토, 부족하면 판단 보류합니다. 관망 시 종료일·추가 가격 변경을 재확인합니다.",
          ],
        ];
  return (
    <main className="mars-detail-page space-y-5">
      <div className="flex items-center justify-between gap-3"><AnalysisBackLink href={back} className="text-sm text-primary">
        ← 이전 화면
      </AnalysisBackLink><AIChatTrigger /></div>
      <WorkspaceHeader><div className="space-y-2">

        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          조회 {range.start} ~ {range.end} · 선택{" "}
          {selected.length + points.length}건 · 관측 사실과 검증할 가설을
          구분합니다.
        </p>
      </div></WorkspaceHeader>
      <RefreshingAnalysis refreshKey={q.toString()}>
      {points.map((p) => (
        <section
          key={p.date}
          className="space-y-2 rounded-xl border bg-primary/5 p-5"
        >
          <p className="text-xs text-primary">
            변곡점 · {p.stage}
          </p>
          <h2 className="text-lg font-semibold">{p.title}</h2>
          <p className="text-sm">시작 {p.date} · 종료 미지정(단일 시점)</p>
          <p className="text-sm text-muted-foreground">
            {p.description} · 원인 가설은 연결된 이벤트로 확인합니다.
          </p>
        </section>
      ))}
      {selected.map((e) => (
        <article key={e.id} className="space-y-4 rounded-xl border bg-card p-5">
          <div>
            <p className="text-xs text-primary">
              {e.operator} · {e.targetChannels?.join(", ") || e.channel}
            </p>
            <h2 className="mt-2 text-lg font-semibold">{e.title}</h2>
            <p className="mt-2 text-sm">
              {e.startAt.replace("T", " ")} ~{" "}
              {e.endAt?.replace("T", " ") || "종료 미지정 · 단일 시점"}
            </p>
          </div>
          <p className="text-sm leading-6">{e.summary}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/30 p-3 text-sm">
              <p className="mb-1 text-xs text-muted-foreground">변경 전</p>
              {e.before}
            </div>
            <div className="rounded-lg bg-primary/5 p-3 text-sm">
              <p className="mb-1 text-xs text-muted-foreground">변경 후</p>
              {e.after}
            </div>
          </div>
          <EventProvenance event={e} />
          <p className="text-sm">다음 확인 · {e.next}</p>
        </article>
      ))}
      <section
        className="grid gap-3 md:grid-cols-3"
        aria-label="분석 대상별 판단 기준"
      >
        {questions.map(([h, t]) => (
          <div key={h} className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold">{h}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t}</p>
          </div>
        ))}
      </section>
      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">
          {pivot
            ? "전환 전후 흐름 검증"
            : own
              ? "정책 실행 전후 성과 관찰"
              : "우리 사업의 동시기 실적 관찰"}
        </h2>
        <p className="text-xs leading-5 text-muted-foreground">
          {workspace.toUpperCase()} 실적 · 최초 선택 시점 {anchor} 전{" "}
          {before.length}일 / 이후 {after.length}일의 일평균 비교. 조회 기간과
          별개인 전후 관찰 구간이며, 순수 정책 효과를 뜻하지 않습니다.
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          {(
            [
              ["customers", "회선"],
              ["cancellations", "해지"],
              ["revenue", "매출"],
              ["netProfit", "순익"],
            ] as const
          ).map(([key, label]) => {
            const b = mean(before, key),
              a = mean(after, key);
            return (
              <div key={key} className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  일평균 {label}
                  {key === "revenue" || key === "netProfit" ? " (원)" : ""}
                </p>
                <p className="mt-2 font-semibold">
                  {b === null ? "—" : n(b)} → {a === null ? "—" : n(a)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {b === null || a === null || b === 0
                    ? "증감률 산출 불가"
                    : `${(((a - b) / Math.abs(b)) * 100).toFixed(1)}%`}
                </p>
              </div>
            );
          })}
        </div>
        <AnalysisChart range={{ start: beforeStart, end: afterEnd }} />
      </section>
      <ForecastLab range={range} title="선택 이벤트 관찰 기간 · 예측 비교"/>
      {own && (
        <AnalysisExperimentPipeline
          range={range}
          workspace={workspace}
          channels={channels}
        />
      )}
      {!own && (
        <Link
          href={`/analysis?workspace=${workspace}&start=${range.start}&end=${range.end}#policy`}
          className="inline-block text-sm font-medium text-primary"
        >
          기간 전체의 정책 후보 검토 →
        </Link>
      )}
      </RefreshingAnalysis>
    </main>
  );
}
