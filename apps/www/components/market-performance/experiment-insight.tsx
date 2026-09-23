"use client";
import { AIChatTrigger } from "@/registry/blocks/sidebar-03/components/ai-chat";
import { WorkspaceHeader } from "./workspace-header";
import { RefreshingAnalysis } from "./refreshing-analysis";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExperimentForecastChart } from "./experiment-forecast-chart";
import { RequirementsSummary, ReviewSummary } from "./requirements-summary";
import { hasChannelData } from "./channel-data";
import Link from "next/link";
import { airTermsSummary } from "./air-sales-terms";
import { AnalysisBackLink } from "./analysis-navigation";
import { useAlternatives } from "./alternative-store";
import { dayShift, projectAlternative, evaluateDemoExperiment } from "./alternative-model";

const number = (value: number) => value.toLocaleString("ko-KR");
export function ExperimentInsight({id}: {id: string}) {
  const [pagination, setPagination] = useState({ key: "", page: 1 });
  const {alternatives} = useAlternatives();
  const experiment = alternatives.find(item => item.id === id);
  if (!experiment) return <main className="mx-auto max-w-5xl space-y-4 p-6"><h1 className="text-2xl font-semibold">정책 상세</h1><p>정책을 찾을 수 없습니다. 등록된 정책을 확인하세요.</p><Link href="/?view=events" className="text-primary underline">이벤트·정책 관리</Link></main>;
  const a = experiment;
  const rows = hasChannelData(a.targetChannels) ? projectAlternative(a) : [];
  const paginationKey = `${id}:${a.start}:${a.days}:${a.targetChannels?.join(",") ?? ""}`;
  const pageCount = Math.max(1, Math.ceil(rows.length / 10));
  const page = pagination.key === paginationKey ? Math.min(pagination.page, pageCount) : 1;
  const visibleRows = rows.slice((page - 1) * 10, page * 10);
  const changePage = (next: number) => setPagination({ key: paginationKey, page: Math.max(1, Math.min(next, pageCount)) });
  const evaluation = evaluateDemoExperiment(a);
  const metrics = [
    {key:"customers", delta:"customersDelta",label:"회선",unit:"회선"},
    {key:"cancellations",delta:"cancellationsDelta",label:"해지",unit:"건"},
    {key:"revenue",delta:"revenueDelta",label:"매출",unit:"원"},
    {key:"netProfit",delta:"netProfitDelta",label:"순익",unit:"원"},
  ] as const;
  return <main className="mars-detail-page space-y-5">
    <div className="flex items-center justify-between gap-3"><AnalysisBackLink href={`/?workspace=${encodeURIComponent(a.workspace ?? "air")}`} className="text-sm text-muted-foreground hover:text-foreground">← 이전 화면</AnalysisBackLink><AIChatTrigger /></div>
<WorkspaceHeader><div className="space-y-2"><p className="text-sm font-medium text-primary">정책 상세</p><h1 className="text-2xl font-semibold">{a.title}</h1><p className="text-sm text-muted-foreground">{(a.workspace ?? "air").toUpperCase()} · {a.type} · {a.groupName || "미분류"}</p></div></WorkspaceHeader><RefreshingAnalysis mode="detail" refreshKey={id}>
    {a.salesTerms && <section className="rounded-xl border bg-card p-4"><h2 className="font-semibold">요금제 · 채널 판매조건</h2><p className="mt-2 text-sm leading-6">{airTermsSummary(a.salesTerms)}</p></section>}
    <section className="space-y-4 rounded-xl border bg-card p-5"><h2 className="text-lg font-semibold">정책 목적과 기간</h2><p className="whitespace-pre-wrap leading-7">{a.description}</p><div className="flex flex-wrap gap-x-8 gap-y-2 text-sm"><p>적용 {a.start} ~ {dayShift(a.start,(a.applyDays??a.days)-1)}</p><p>예측 {a.start} ~ {dayShift(a.start,a.days-1)}</p></div>{a.prompt && <p className="border-t pt-4 text-sm text-muted-foreground">입력 프롬프트: {a.prompt}</p>}</section>
    <section className="rounded-xl border bg-card p-4 text-sm"><p>적용 채널 · {a.targetChannels?.length?a.targetChannels.join(", "):"전체 채널"}</p>{a.analysisContext&&<p className="mt-2 text-xs leading-5 text-muted-foreground">분석 근거 · {a.analysisContext.start} ~ {a.analysisContext.end} · {a.analysisContext.channels.join(", ")||"전체 채널"}<br/>{a.analysisContext.reason}</p>}</section>
    <ExperimentForecastChart key={a.id} experiment={a}/>
    {evaluation && <section className="space-y-3 rounded-xl border bg-card p-5"><h2 className="text-lg font-semibold">예측·관측 비교 · 사후 구성 시나리오</h2><p>평가일 {evaluation.date} · 시작 전일 기준 {evaluation.baseline}회선</p><p>예측 {evaluation.forecast}회선 ({evaluation.forecastGrowthPct.toFixed(1)}%) / 관측 {evaluation.actual}회선 ({evaluation.actualGrowthPct.toFixed(1)}%)</p><p className="font-semibold">예측 증가분 대비 관측 달성률: {evaluation.attainment?.toFixed(1) ?? "산출 불가"}%</p><p>{evaluation.matchedOnset ? `증가 전환일 ${evaluation.actualOnset} 일치` : (evaluation.attainment !== null && evaluation.attainment >= 100 ? "관측 증가분이 예측 증가분 이상입니다. 전환일 일치는 별도 기준으로 평가합니다." : "관측 증가분이 예측에 미달했습니다.")}</p><p className="text-sm text-muted-foreground">달성률 = (평가일 관측 − 시작 전일 관측) ÷ (평가일 예측 − 시작 전일 관측) × 100. 전환일은 전일 대비 20% 초과 상승이 처음 나타난 날입니다. 음수 달성률은 실제 감소를 뜻합니다. 합성 데이터에 맞춰 사후 구성한 예시이며 실제 예측 정확도나 정책 인과효과가 아닙니다.</p></section>}
    {a.reviewScenario && <ReviewSummary review={a.reviewScenario}/>}
    {a.requirements && <RequirementsSummary requirements={a.requirements}/>}
    <section className="space-y-3"><h2 className="text-lg font-semibold">예측 결과 · 기간 합계</h2><p className="text-sm text-muted-foreground">직전 최대 7일의 합성 실적 평균을 유지한 기준 시나리오와 비교합니다. 실제 성과나 검증된 인과효과가 아닙니다.</p><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(metric=>{const total=rows.reduce((sum,row)=>sum+row[metric.key],0);const delta=rows.reduce((sum,row)=>sum+row[metric.delta],0);return <div key={metric.key} className="space-y-2 rounded-xl border bg-card p-5"><h3 className="text-sm text-muted-foreground">{metric.label}</h3><p className="text-xl font-semibold tabular-nums">{rows.length?`${number(total)}${metric.unit}`:"데이터 연결 대기"}</p><p className="text-xs text-muted-foreground">기준 대비 {delta>0?"+":""}{number(delta)}{metric.unit}</p></div>;})}</div></section>
    <section className="space-y-4 rounded-xl border bg-card p-5"><h2 className="text-lg font-semibold">정책 가정과 비용</h2><div className="grid gap-3 text-sm sm:grid-cols-2"><p>가격 변화 {a.pricePct}%{a.demoCustomerForecast && " · 회선은 별도 시나리오 일별 예측값 사용"}</p><p>수요 변화 {a.demandPct}%</p><p>해지 변화 {a.cancellationPct??0}%</p><p>변동비 변화 {a.variableCostPct}%</p><p>일 추가 비용 {number(a.dailyCost)}원</p><p>일회성 비용 {number(a.oneTimeCost)}원</p></div><p className="text-sm text-muted-foreground">적용 기간 이후에는 가격·수요·비용 가정을 기준 수준으로 되돌려 계산합니다. 가정의 타당성, 증분 순익, 해지 변화 및 실제 비용을 확인한 뒤 정책을 판단하세요.</p></section>
    <section className="overflow-x-auto rounded-xl border bg-card p-5"><h2 className="mb-4 text-lg font-semibold">일자별 예측</h2><table className="w-full text-right text-sm tabular-nums"><thead><tr className="border-b"><th className="py-3 text-left">일자</th>{metrics.map(m=><th key={m.key}>{m.label}</th>)}</tr></thead><tbody>{visibleRows.map(row=><tr key={row.key} className="border-b last:border-0"><td className="py-3 text-left">{row.key}</td>{metrics.map(m=><td key={m.key}>{number(row[m.key])}{m.unit}</td>)}</tr>)}</tbody></table>
      {!rows.length && <p className="py-6 text-center text-sm text-muted-foreground">표시할 예측 데이터가 없습니다.</p>}
      <nav aria-label="일자별 예측 페이지 이동" className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
        <span aria-live="polite">총 {rows.length}일 · {rows.length ? `${(page - 1) * 10 + 1}–${Math.min(page * 10, rows.length)}` : "0"}개 표시</span>
        <div className="flex items-center gap-3">
          <span>{page} / {pageCount} 페이지</span>
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => changePage(page - 1)}>이전</Button>
          <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => changePage(page + 1)}>다음</Button>
        </div>
      </nav>
    </section>
  </RefreshingAnalysis></main>;
}

export function ExperimentInsightGroup({ids}: {ids:string[]}) {
  const {alternatives}=useAlternatives();
  const items=alternatives.filter(a=>ids.includes(a.id));
  return <main className="mx-auto max-w-5xl space-y-5 p-6"><div className="flex items-center justify-between gap-3"><AnalysisBackLink href={`/?workspace=${encodeURIComponent(items[0]?.workspace ?? "air")}`} className="text-sm text-muted-foreground">← 이전 화면</AnalysisBackLink><AIChatTrigger /></div><WorkspaceHeader><div><h1 className="text-2xl font-semibold">정책 상세 {items.length}건</h1><p className="mt-2 text-sm text-muted-foreground">같은 시점의 정책입니다. 상세 분석할 정책을 선택하세요.</p></div></WorkspaceHeader><RefreshingAnalysis mode="detail" refreshKey={ids.join(",")}><div className="space-y-3">{items.map(a=><Link key={a.id} href={`/analysis?experiment=${encodeURIComponent(a.id)}`} className="block space-y-2 rounded-xl border bg-card p-5 hover:bg-accent"><h2 className="font-semibold">{a.title} →</h2><p className="text-sm text-muted-foreground">{a.start} · {a.type}</p><p className="line-clamp-2 text-sm">{a.description}</p></Link>)}</div></RefreshingAnalysis></main>;
}
