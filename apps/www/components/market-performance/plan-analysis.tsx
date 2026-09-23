"use client";
import { AIChatTrigger } from "@/registry/blocks/sidebar-03/components/ai-chat";
import { useState } from "react";
import Link from "next/link";
import { AnalysisBackLink } from "./analysis-navigation";
import { useSearchParams } from "next/navigation";
import catalog from "./fixtures/plan-catalog.json";
import { planDay } from "./plan-market-model";
import { PlanTrend } from "./plan-visualizations";
import { WorkspaceHeader } from "./workspace-header";
import { RefreshingAnalysis } from "./refreshing-analysis";
import { AnalysisRangeControl } from "./analysis-range-control";
import { presetRange, validateRange, type Range } from "./data";
const money = (v: number | null) => v === null ? "미확인" : `${v.toLocaleString("ko-KR")}원`;
const sourceNames: Record<string, string> = { "air-official": "AIR 공식", "air-kakaopay": "AIR · 카카오페이", moyo: "모요" };
export function PlanAnalysis({ id }: { id: string }) {
  const q = useSearchParams();
  const requested = { start: q.get("start") ?? "", end: q.get("end") ?? "" };
  const [range, setRange] = useState<Range>(() => validateRange(requested) ? presetRange("1M") : requested);
  const offer = catalog.offers.find(p => p.offerId === id);
  const back = `/?workspace=${encodeURIComponent(q.get("workspace") ?? "air")}&view=plans-search`;
  if (!offer) return <main className="mx-auto max-w-6xl space-y-6 p-6"><WorkspaceHeader><h1>요금제 상세 분석</h1></WorkspaceHeader><p>해당 요금제를 찾을 수 없습니다.</p><div className="flex items-center justify-between gap-3"><AnalysisBackLink href={back}>요금제 검색으로 돌아가기</AnalysisBackLink><AIChatTrigger /></div></main>;
  const history = catalog.history.filter(h => h.offerId === id && planDay(h.observedAt) >= range.start && planDay(h.observedAt) <= range.end).sort((a,b) => a.observedAt.localeCompare(b.observedAt));
  const priced = history.filter(h => h.effectiveKrw !== null);
  const first = priced[0]?.effectiveKrw ?? null;
  const last = priced.at(-1)?.effectiveKrw ?? null;
  const delta = priced.length >= 2 && first !== null && last !== null ? last-first : null;
  const peers = catalog.offers.filter(p => p.productId === offer.productId && (offer.sourceId.startsWith("air-") ? p.sourceId.startsWith("air-") : p.sourceId === offer.sourceId) && planDay(p.observedAt) >= range.start && planDay(p.observedAt) <= range.end);
  const chooseRange = (next: Range) => { setRange(next); const url = new URL(window.location.href); url.searchParams.set("start", next.start); url.searchParams.set("end", next.end); window.history.replaceState(window.history.state, "", url); };
  return <main className="mars-detail-page space-y-5">
    <div className="flex items-center justify-between gap-3"><AnalysisBackLink href={back} className="text-sm text-muted-foreground hover:text-foreground">← 이전 화면</AnalysisBackLink><AIChatTrigger /></div>
    <WorkspaceHeader><div><p className="mb-2 text-xs text-muted-foreground">요금제 상세 분석 · {sourceNames[offer.sourceId]}</p><h1>{offer.name}</h1><p className="mt-2 text-sm text-muted-foreground">{offer.operator} · {offer.network}망 · {offer.channel} · 조회 {range.start} — {range.end}</p></div><AnalysisRangeControl range={range} onChange={chooseRange} /></WorkspaceHeader>
    <RefreshingAnalysis refreshKey={`${id}:${range.start}:${range.end}`}>
      <section className="grid gap-4 sm:grid-cols-3">
        {[["기간 내 마지막 체감가", money(last)], ["첫 관측 대비 변화", delta === null ? "비교 이력 부족" : `${delta > 0 ? "+" : ""}${money(delta)}`], ["기간 내 관측", `${history.length}회 · ${new Set(history.map(h => planDay(h.observedAt))).size}일`]].map(([label,value]) => <div key={label} className="rounded-xl border bg-card p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-3 text-xl font-semibold">{value}</p></div>)}
      </section>
      <section className="space-y-4 rounded-xl border bg-card p-5"><h2 className="font-semibold">기간별 트렌드 리포트</h2><PlanTrend offer={offer} range={range}/><p className="text-xs text-muted-foreground">기간 내 실제 관측값만 표시합니다. 수집되지 않은 일자의 가격을 보간하거나 유지 가격으로 간주하지 않습니다.</p></section>
      <section className="space-y-4 rounded-xl border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">AI 요약</h2><span className="text-xs text-muted-foreground">관측 데이터 기반</span></div><ul className="space-y-3 text-sm leading-relaxed"><li>{!history.length ? "선택 기간에 수집된 가격 이력이 없습니다. 기간을 변경해 확인하세요." : delta === null ? `선택 기간에서 체감가 ${money(last)}를 확인했습니다. 두 시점 이상의 이력이 없어 상승·하락 추세는 판단할 수 없습니다.` : `기간 첫 관측 대비 체감가는 ${money(Math.abs(delta))} ${delta > 0 ? "상승" : delta < 0 ? "하락" : "변동 없음"}입니다. 관측 사이의 변경 시점은 확인되지 않았습니다.`}</li><li>{peers.length > 1 ? `동일 상품의 ${peers.length}개 채널 판매 조건이 관측됐습니다. 아래 채널 비교에서 청구 요금과 혜택 조건을 함께 확인하세요.` : "선택 기간에 비교 가능한 다른 채널의 동일 상품이 없습니다."}</li><li>체감가는 포인트·할인 등의 조건을 반영한 표시 가격이며 실제 청구 금액과 다를 수 있습니다. 혜택 변경 이력이 없어 기간별 혜택 증감은 판단하지 않습니다.</li></ul></section>
      <section className="space-y-4 rounded-xl border bg-card p-5"><h2 className="font-semibold">채널별 판매 조건 · 기간 내 수집본</h2>{!peers.length && <p className="text-sm text-muted-foreground">선택 기간에 수집된 판매 조건이 없습니다.</p>}<div className="grid gap-4 sm:grid-cols-2">{peers.map(p => <article key={p.offerId} className="space-y-3 rounded-lg border p-4"><h3 className="text-sm font-semibold">{sourceNames[p.sourceId]} · {p.channel}</h3><dl className="grid grid-cols-2 gap-2 text-sm"><dt>월 청구 요금</dt><dd>{money(p.monthlyBilledKrw)}</dd><dt>표시 체감가</dt><dd>{money(p.displayedEffectiveKrw)}</dd><dt>혜택 적용 기간</dt><dd>{p.effectivePeriodMonths ? `${p.effectivePeriodMonths}개월` : "미확인"}</dd><dt>종료 후 가격</dt><dd>{money(p.postEffectiveKrw)}</dd><dt>데이터</dt><dd>{p.unlimitedData ? "무제한" : `${p.monthlyDataGb ?? "미확인"}GB`}{p.dailyDataGb ? ` + 매일 ${p.dailyDataGb}GB` : ""}</dd></dl><p className="text-xs leading-relaxed text-muted-foreground">{p.benefits.join(" · ") || "수집된 혜택 설명 없음"}</p><a href={p.detailUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">판매 조건 원문 ↗</a></article>)}</div></section>
      <section className="space-y-4 rounded-xl border bg-card p-5"><h2 className="font-semibold">출처와 데이터 기준</h2><dl className="grid gap-x-5 gap-y-3 text-sm sm:grid-cols-[140px_1fr]"><dt className="text-muted-foreground">수집 출처</dt><dd><a className="break-all text-primary underline" href={offer.sourceUrl} target="_blank" rel="noreferrer">{offer.sourceUrl}</a></dd><dt className="text-muted-foreground">상품 원문</dt><dd><a className="break-all text-primary underline" href={offer.detailUrl} target="_blank" rel="noreferrer">{offer.detailUrl}</a></dd><dt className="text-muted-foreground">판매 조건 관측 시점</dt><dd>{new Date(offer.observedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST · 기간 필터와 별개인 최신 수집본</dd><dt className="text-muted-foreground">상품 / 판매 조건 ID</dt><dd className="break-all">{offer.productId} / {offer.offerId}</dd><dt className="text-muted-foreground">해석 기준</dt><dd>동일 상품·동일 채널의 체감가 이력을 비교합니다. 최초 수집일은 출시일이나 가격 변경일이 아닙니다.</dd></dl>{offer.qualityFlags.includes("VISIBLE_VS_JSONLD_PRICE_MISMATCH") && <p className="rounded-lg bg-muted p-3 text-sm">원문 화면과 구조화 데이터의 가격이 다릅니다. 수집된 표시 가격을 사용했으며 원문 재확인이 필요합니다.</p>}</section>
    </RefreshingAnalysis>
  </main>;
}
