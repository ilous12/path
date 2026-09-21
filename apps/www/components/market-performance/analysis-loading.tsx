"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DetailLoading } from "./detail-loading";
import { EVENTS } from "./data";

function Shell({title = "상세 분석", workspace = "air", period, mode = "analysis"}: {title?: string; workspace?: string; period?: string; mode?: "analysis" | "detail"}) {
  return <main className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
    <Link href={`/?workspace=${encodeURIComponent(workspace)}`} className="text-sm text-primary">← 타임라인</Link>
    <header className="space-y-2">

      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{period ?? "선택한 분석 조건을 확인하고 있습니다."}</p>
    </header>
    <DetailLoading mode={mode} />
  </main>;
}
function Pending() {
  const q = useSearchParams();
  const workspace = q.get("workspace") || "air";
  const ids = (q.get("events") || "").split(",").filter(Boolean);
  const selected = EVENTS.filter(e => ids.includes(e.id));
  const own = ids.length > 0 && selected.length === ids.length && selected.every(e => e.operator.toLowerCase() === workspace);
  const detail = q.has("experiment") || q.has("experiments");
  const title = detail ? "실험 상세" : q.has("channel") ? `${workspace.toUpperCase()} · ${q.get("channel")} 채널 분석` : q.has("pivots") ? "변곡점 상세 분석" : q.has("events") ? own ? `${workspace.toUpperCase()} 정책·이벤트 상세 분석` : "경쟁사·기타 이벤트 상세 분석" : "기간 별 상세 분석";
  return <Shell title={title} workspace={workspace} mode={detail ? "detail" : "analysis"} period={q.get("start") && q.get("end") ? `조회 ${q.get("start")} ~ ${q.get("end")}` : undefined} />;
}
export function AnalysisLoading() {
  return <Suspense fallback={<Shell />}><Pending /></Suspense>;
}
