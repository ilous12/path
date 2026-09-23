"use client";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PolicyRevision, SubPolicy, GroupProjectionRow } from "./policy-group-model";
const field = "h-9 w-full rounded-md border bg-background px-2 text-sm";
export const policyStages = [
  {id:"policy-purpose",title:"목적·기간",description:"누구에게, 언제, 왜"},
  {id:"policy-conditions",title:"판매정책 구성",description:"상품·채널별 변경 조건"},
  {id:"policy-simulation",title:"통합 시뮬레이션",description:"조합 효과·비용 비교"},
  {id:"policy-review",title:"최종 검토",description:"버전 등록 후 실행"},
];
export function PolicyProgress({revision,issues,saved,dirty}:{revision:PolicyRevision;issues:string[];saved:boolean;dirty:boolean}) {
 const included=revision.items.filter(i=>i.enabled);
 const done=[Boolean(revision.name.trim()&&revision.objective.trim()&&revision.start<=revision.end&&revision.end<=revision.forecastEnd),included.length>0&&included.every(i=>i.state==="ready"),!issues.length&&saved&&!dirty,revision.status==="registered"];
 const current=done.findIndex(v=>!v);
 return <nav aria-label="캠페인 진행 단계" className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-4">{policyStages.map((stage,i)=><a key={stage.id} href={`#${stage.id}`} aria-current={current===i?"step":undefined} className={`flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted ${current===i?"bg-primary/10":""}`}><span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs ${done[i]?"bg-primary text-primary-foreground":"border text-muted-foreground"}`}>{done[i]?<Check className="size-4"/>:i+1}</span><span><span className="block text-xs font-semibold">{stage.title}</span><span className="mt-1 block text-[11px] text-muted-foreground">{stage.description}</span></span></a>)}</nav>;
}
export function PolicyBrief({revision,disabled,onChange}:{revision:PolicyRevision;disabled:boolean;onChange:(brief:NonNullable<PolicyRevision["brief"]>)=>void}) {
 const brief=revision.brief??{owner:"",hypothesis:"",metric:"customers" as const,targetPct:null};
 return <fieldset disabled={disabled} className="grid gap-4 rounded-lg bg-muted/30 p-4 sm:grid-cols-2">
 <label className="space-y-2 text-xs">담당자 · 선택<Input aria-label="정책 담당자" placeholder="담당자 또는 운영팀" value={brief.owner} onChange={e=>onChange({...brief,owner:e.target.value})}/></label>
 <label className="space-y-2 text-xs">검증 가설 · 선택<Input aria-label="정책 검증 가설" placeholder="예: APP 가격 인하로 번호이동 가입이 증가한다" value={brief.hypothesis} onChange={e=>onChange({...brief,hypothesis:e.target.value})}/></label>
 <label className="space-y-2 text-xs">성과 목표 지표<select aria-label="정책 성과 지표" className={field} value={brief.metric} onChange={e=>onChange({...brief,metric:e.target.value as typeof brief.metric})}><option value="customers">가입 회선 증가</option><option value="cancellations">해지 감소</option><option value="netProfit">순익 개선</option></select></label>
 <label className="space-y-2 text-xs">현행 유지 대비 목표<select aria-label="정책 목표 변화율" className={field} value={brief.targetPct??""} onChange={e=>onChange({...brief,targetPct:e.target.value===""?null:Number(e.target.value)})}><option value="">목표 선택 · 선택 사항</option>{[...new Set([1,3,5,10,15,20,30,50,...(brief.targetPct===null?[]:[brief.targetPct])])].sort((a,b)=>a-b).map(v=><option key={v} value={v}>{v}% {brief.metric==="cancellations"?"감소":"개선"}</option>)}</select></label>
 </fieldset>;
}
export function subPolicySummary(item:SubPolicy) {
 const n=(v:number)=>v.toLocaleString("ko-KR");
 return item.changes.map(c=>c.kind==="price"?`${n(c.before)}원 → ${n(c.after)}원`:c.kind==="points"?`${c.provider??"포인트"} · 매월 ${n(c.amount)}P × ${c.months}개월 · ${c.condition}`:c.kind==="special-points"?`${c.provider??"포인트"} · 특별 ${n(c.amount)}P · ${c.condition}`:`${c.description} · ${c.months??1}개월 · 월 원가 ${c.monthlyCost===null?"미확인":`${n(c.monthlyCost)}원`}`).join(" / ")||"현행 판매조건 유지 · 반응 가정 검증";
}
export function PolicyCompositionReview({revision,onSelect}:{revision:PolicyRevision;onSelect:(id:string)=>void}) {
 return <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-xs"><caption className="sr-only">캠페인에 포함된 판매정책 변경 조건</caption><thead className="bg-muted/40"><tr>{["판매정책 / 대상","변경 전 → 후 · 혜택","기간 / 조합","상태"].map(v=><th key={v} className="p-3 font-medium">{v}</th>)}</tr></thead><tbody>{revision.items.map(i=><tr key={i.id} className={`border-t ${i.enabled?"":"text-muted-foreground"}`}><td className="max-w-60 p-3"><button className="text-left font-medium underline-offset-4 hover:underline" onClick={()=>onSelect(i.id)}>{i.title}</button><p className="mt-1 text-muted-foreground">{i.source.salesTerms?.planName??"전체 상품"} · {i.target.channels.join(", ")||"전체 채널"}</p><p className="mt-1 text-muted-foreground">{i.target.customer==="new"?"010 신규":i.target.customer==="mnp"?"번호이동":"010 신규·번호이동"} · 대상 {i.target.sharePct}%</p></td><td className="max-w-sm p-3 leading-5">{subPolicySummary(i)}</td><td className="whitespace-nowrap p-3">{i.period?.start??revision.start} ~ {i.period?.end??revision.end}<p className="mt-1 text-muted-foreground">{i.period?"개별 기간":"캠페인 기간"} · {i.stacking==="combine"?"혜택 동시 적용":"배타 적용"}</p></td><td className="p-3">{!i.enabled?"제외":i.state==="ready"?"완료":"작성 중"}</td></tr>)}</tbody></table></div>;
}
export function policyGoalResult(r:PolicyRevision,rows:GroupProjectionRow[]) {
 if(!r.brief||r.brief.targetPct===null||!rows.length)return null;
 const key=r.brief.metric;
 const delta=key==="customers"?"customersDelta":key==="cancellations"?"cancellationsDelta":"netProfitDelta";
 const actual=rows.reduce((s,row)=>s+row[key],0),change=rows.reduce((s,row)=>s+row[delta],0),base=actual-change;
 if(base<=0)return {pct:null,met:false};
 const pct=change/base*100*(key==="cancellations"?-1:1);
 return {pct,met:pct>=r.brief.targetPct};
}
export function PolicyReviewStatus({revision,rows,issues,saved,dirty,onSimulate}:{revision:PolicyRevision;rows:GroupProjectionRow[];issues:string[];saved:boolean;dirty:boolean;onSimulate:()=>void}) {
 const goal=policyGoalResult(revision,rows);
 return <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-3">{[["구성 점검",issues.length?`${issues.length}개 확인 필요`:"대상·기간·중복 검사 통과"],["시뮬레이션",saved&&!dirty?"현재 구성으로 저장됨":"갱신 필요"],["성과 목표",goal?.pct!=null?`${goal.met?"목표 충족 예상":"목표 미달 예상"} · ${goal.pct.toFixed(1)}%`:goal?"기준값 0 이하 · 변화율 평가 제외":"미설정"]].map(([name,value])=><div key={name} className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{name}</p><p className="mt-2 text-sm font-medium">{value}</p></div>)}</div>
 {issues.length>0?<div role="status" className="rounded-lg border p-3 text-xs"><p className="font-medium">등록 전 확인할 항목</p><ul className="mt-2 list-disc space-y-1 pl-4">{issues.map(issue=><li key={issue}>{issue}</li>)}</ul></div>:(!saved||dirty)&&<Button variant="outline" onClick={onSimulate}>현재 구성으로 시뮬레이션 저장<ArrowRight className="size-4"/></Button>}
 {goal&&<p className="text-xs text-muted-foreground">목표는 예측 기간 전체의 현행 유지 대비 변화로 비교합니다. 예상 충족 여부는 실제 성과와 구분되며 등록을 차단하지 않습니다.</p>}
 </div>;
}
