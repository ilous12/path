"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { WorkspaceHeader } from "./workspace-header";
import { RefreshingAnalysis } from "./refreshing-analysis";
import { AnalysisRangeControl } from "./analysis-range-control";
import { useEventCatalog } from "./event-catalog";
import { useEventVisibility } from "./event-visibility";
import { getEventType, presetRange } from "./data";
import { EventManagement } from "@/registry/blocks/sidebar-03/components/event-management";
export function EventOverview({ promotionsOnly = false }: { promotionsOnly?: boolean }) {
  const workspace = useSearchParams().get("workspace") ?? "air";
  const [range, setRange] = useState(presetRange("1M"));
  const { events } = useEventCatalog();
  const { hiddenIds } = useEventVisibility();
  const visible = events.filter(e => (!promotionsOnly || e.types.includes("campaign")) && !hiddenIds.includes(e.id) && e.startAt.slice(0,10) <= range.end && (e.endAt ?? e.startAt).slice(0,10) >= range.start).sort((a,b) => b.startAt.localeCompare(a.startAt));
  const own = visible.filter(e => e.operator.toLowerCase() === workspace).length;
  const types = [...new Set(visible.flatMap(e => e.types))].map(type => ({ type, count: visible.filter(e => e.types.includes(type)).length })).sort((a,b) => b.count-a.count);
  const search = `/?${new URLSearchParams({workspace, view: promotionsOnly ? "promotions-search" : "events-search", start:range.start,end:range.end})}`;
  return <div className="mx-auto w-full max-w-none space-y-6 pb-12">
    <WorkspaceHeader><div><h1>{promotionsOnly ? "프로모션/행사 · AI 요약" : "업계 동향 · 오버뷰"}</h1><p className="mt-2 text-sm text-muted-foreground">시장 변화의 규모와 유형을 살펴보고, 필요한 이벤트를 분석하세요.</p></div><div className="flex items-center gap-3"><AnalysisRangeControl range={range} onChange={setRange}/><EventManagement compact defaultStart={range.start} analysisRange={range}/></div></WorkspaceHeader>
    <RefreshingAnalysis mode="page" refreshKey={`${workspace}:${range.start}:${range.end}`}>
      <p className="text-xs text-muted-foreground">{range.start} — {range.end} · 기간 내 발생·진행 이벤트 · 숨긴 이벤트 제외</p>
      {promotionsOnly && <section className="space-y-3 rounded-xl border bg-card p-5"><h2 className="font-semibold">{workspace.toUpperCase()} 관점의 프로모션/행사</h2><p className="text-sm leading-relaxed">선택 기간에 {visible.length}건이 관측됐으며, {workspace.toUpperCase()}의 이벤트는 {own}건, 타사·기타는 {visible.length-own}건입니다. {visible[0] ? `최근 변화는 ‘${visible[0].title}’입니다. 대상 채널과 혜택·종료 조건을 비교해 대응 여부를 검토하세요.` : "기간을 변경하거나 이벤트를 등록해 주세요."}</p><p className="text-xs text-muted-foreground">프로모션 유형 기준 · 데이터 기반 자동 요약 · LLM 미연결. 이벤트 수는 실적 효과를 의미하지 않습니다.</p></section>}
      <section className="grid gap-4 sm:grid-cols-3">{[["전체 시장 변화",visible.length],[`${workspace.toUpperCase()} 이벤트`,own],["경쟁사·기타",visible.length-own]].map(([label,count]) => <div key={label} className="rounded-xl border bg-card p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-semibold tabular-nums">{count}<span className="ml-2 text-xs font-normal text-muted-foreground">건</span></p></div>)}</section>
      <section className="space-y-4 rounded-xl border bg-card p-5"><h2 className="font-semibold">변화 유형별 현황</h2><p className="text-xs text-muted-foreground">복합 이벤트는 여러 유형에 포함됩니다. 유형을 누르면 해당 조건으로 검색합니다.</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{types.map(({type,count}) => <Link key={type} href={`${search}&type=${encodeURIComponent(type)}`} className="rounded-lg p-3 transition-colors hover:bg-muted"><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span>{getEventType(type).label}</span><strong>{count}건</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${count / Math.max(1,visible.length)*100}%`}}/></div></Link>)}</div>{!types.length && <p className="py-5 text-sm text-muted-foreground">선택 기간에 표시할 이벤트가 없습니다.</p>}</section>
    </RefreshingAnalysis>
  </div>;
}
