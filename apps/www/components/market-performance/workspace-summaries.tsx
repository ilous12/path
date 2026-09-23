"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { WorkspaceHeader } from "./workspace-header";
import { PageEntry } from "./page-entry";
import { useAnalysisPreferences } from "./use-analysis-preferences";
import catalog from "./fixtures/plan-catalog.json";
import { isAir, planDay } from "./plan-market-model";
const won = (v: number) => `${v.toLocaleString("ko-KR")}원`;
export function PlanWorkspaceSummary() {
  const workspace = useSearchParams().get("workspace") ?? "air";
  // MVNO represents a market segment; it is not a single operator.
  const offers = catalog.offers.filter(p => workspace === "air" ? isAir(p) : workspace === "mvno" ? !isAir(p) : p.operator?.toLowerCase() === workspace);
  const prices = offers.flatMap(p => p.displayedEffectiveKrw === null ? [] : [p.displayedEffectiveKrw]);
  const sources = [...new Map(offers.map(p => [p.sourceId, p])).values()];
  const days = new Set(offers.map(p => planDay(p.observedAt)));
  return <div className="space-y-6 pb-12"><WorkspaceHeader><div><h1>요금제 · AI 요약</h1><p className="mt-2 text-sm text-muted-foreground">{workspace.toUpperCase()} {workspace === "mvno" ? "사업군" : "사업자"} 기준 · 수집된 판매 조건과 채널 차이</p></div></WorkspaceHeader><PageEntry>
    <section className="grid gap-4 sm:grid-cols-3">{[["판매 조건",`${offers.length}건`],["관측일",`${days.size}일`],["체감가 범위",prices.length ? `${won(Math.min(...prices))} ~ ${won(Math.max(...prices))}` : "수집 필요"]].map(([label,value]) => <div key={label} className="rounded-xl border bg-card p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-3 text-lg font-semibold">{value}</p></div>)}</section>
    <section className="space-y-4 rounded-xl border bg-card p-5"><h2 className="font-semibold">{workspace.toUpperCase()} 요금제 요약</h2><p className="text-xs text-muted-foreground">PATH AI 요약</p>{offers.length ? <ul className="space-y-3 text-sm leading-relaxed"><li>{new Set(offers.map(p => p.channel)).size}개 채널의 판매 조건을 확인했습니다. 체감가는 혜택을 반영한 표시 가격이며 월 청구 요금과 구분해야 합니다.</li><li>{workspace === "mvno" ? "MVNO는 여러 사업자의 요금제를 포함합니다. 가격 범위는 동일 스펙의 경쟁력 순위를 뜻하지 않습니다." : "동일 상품이라도 채널별 포인트·혜택 기간에 따라 체감가가 달라집니다. 요금제 검색의 상세 분석에서 채널별 조건을 확인하세요."}</li><li>{days.size < 2 ? "관측일이 하루뿐이므로 가격 상승·하락과 혜택 변경 추세는 판단할 수 없습니다." : "추세는 동일 상품·채널의 관측 이력을 기준으로 상세 분석에서 확인하세요."}</li></ul> : <p className="text-sm">{workspace.toUpperCase()}에 연결된 요금제 수집본이 없습니다. 설정에서 해당 사업자의 수집 소스를 연결한 뒤 분석할 수 있습니다.</p>}<Link href={`/?workspace=${workspace}&view=plans-search`} className="inline-block text-sm text-primary hover:underline">요금제 검색 →</Link></section>
    <section className="space-y-3 rounded-xl border bg-card p-5"><h2 className="font-semibold">분석 출처</h2>{sources.length ? sources.map(p => <div key={p.sourceUrl} className="space-y-1 border-b pb-3 last:border-0"><a href={p.sourceUrl} target="_blank" rel="noreferrer" className="break-all text-sm text-primary underline">{p.sourceUrl}</a><p className="text-xs text-muted-foreground">관측 {planDay(p.observedAt)} · {p.channel}</p></div>) : <p className="text-sm text-muted-foreground">연결된 출처가 없습니다.</p>}</section>
  </PageEntry></div>;
}
export function CurrentSettings() {
  const { preferences: p, workspace } = useAnalysisPreferences();
  const focus = {growth:"회선 성장",retention:"이탈 방어",profit:"수익성"}[p.focus];
  return <div className="space-y-6 pb-12"><WorkspaceHeader><div><h1>현재 설정</h1><p className="mt-2 text-sm text-muted-foreground">{workspace.toUpperCase()}에 저장된 분석 기준과 참조 정보</p></div><Link href={`/?workspace=${workspace}&view=admin`} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">설정 변경</Link></WorkspaceHeader><PageEntry>
    <section className="grid gap-4 sm:grid-cols-3">{[["중점 지표",focus],["참조 소스",`${p.sourceDefinitions.filter(s => p.sources[s.id]).length} / ${p.sourceDefinitions.length}`],["참조 유형",`${p.typeDefinitions.filter(t => p.types[t.id]).length} / ${p.typeDefinitions.length}`]].map(([label,value]) => <div key={label} className="rounded-xl border bg-card p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-3 text-xl font-semibold">{value}</p></div>)}</section>
    <section className="space-y-3 rounded-xl border bg-card p-5"><h2 className="font-semibold">소스별 참조 상태</h2><div className="grid gap-3 sm:grid-cols-2">{p.sourceDefinitions.map(s => <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span>{s.name}</span><span className="shrink-0 text-xs text-muted-foreground">{p.sources[s.id] ? "참조 중" : "참조 제외"}</span></div>)}</div></section>
    <section className="space-y-3 rounded-xl border bg-card p-5"><h2 className="font-semibold">이벤트 유형</h2><p className="text-sm">AI 신규 유형 자동 등록: {p.autoRegisterTypes ? "사용" : "사용 안 함"}</p><div className="flex flex-wrap gap-2">{p.typeDefinitions.map(t => <span key={t.id} className="rounded-lg border px-3 py-2 text-xs">{t.label} · {p.types[t.id] ? "참조" : "제외"}</span>)}</div></section>
    <section className="space-y-3 rounded-xl border bg-card p-5"><h2 className="font-semibold">변곡점 판단 기준</h2><p className="whitespace-pre-wrap text-sm leading-relaxed">{p.turningPointPrompt}</p></section><p className="text-xs text-muted-foreground">현재 브라우저에 워크스페이스별로 저장된 설정입니다.</p>
  </PageEntry></div>;
}
