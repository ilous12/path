"use client";
import { withPeriodMargins, chartObservationRange } from "./chart-period";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnalysisBackLink } from "./analysis-navigation";
import { ResponsiveContainer,LineChart,Line,XAxis,YAxis,Tooltip,CartesianGrid,ReferenceLine } from "recharts";
import { buildHomePerformance,homePivotCandidates,type HomeBusiness } from "./home-performance";
import { WorkspaceHeader } from "./workspace-header";
import { RefreshingAnalysis } from "./refreshing-analysis";
import { AnalysisRangeControl } from "./analysis-range-control";
import { validateRange, type Range } from "./data";
import { RecordMenu } from "./record-menu";
const specs=[{id:"air",name:"AIR",color:"var(--color-blue-500)"},{id:"tds",name:"TDS",color:"var(--color-emerald-500)"},{id:"mvno",name:"MVNO",color:"var(--color-violet-500)"}] as const;
const number=(n:number)=>n.toLocaleString("ko-KR");
export function HomeKpi({detail=false}:{detail?:boolean}) {
 const q=useSearchParams();
 const [today]=useState(()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10));
 const [range,setRange]=useState<Range>(()=>{const r={start:q.get("start")??"",end:q.get("end")??""};return validateRange(r,today)?{start:`${today.slice(0,7)}-01`,end:today}:r;});
 const business=q.get("business");
 const selected=specs.filter(s=>!business||s.id===business);
 const pivot=q.get("pivot");
 const [metric,setMetric]=useState("customers");
 const metrics=[{id:"customers",name:"가입 회선",unit:"회선"},{id:"cancellations",name:"해지",unit:"건"},{id:"revenue",name:"매출",unit:"원"},{id:"netProfit",name:"순익",unit:"원"}] as const;
 const chosenMetric=metrics.find(m=>m.id===metric)!;
 const series=selected.map(s=>({...s,rows:buildHomePerformance(range,s.id)}));
 const chartSeries=selected.map(s=>({...s,rows:buildHomePerformance(chartObservationRange(range),s.id)}));
 const dates=[...new Set(chartSeries.flatMap(s=>s.rows.map(r=>r.key)))].sort();
 const maps=chartSeries.map(s=>({...s,values:new Map(s.rows.map(r=>[r.key,r]))}));
 const chart=dates.map(date=>({date,...Object.fromEntries(maps.map(s=>[s.id,s.values.get(date)?.[chosenMetric.id]??null]))}));
 const href=(id?:string)=>`/analysis?${new URLSearchParams({workspace:"home",section:"kpi",start:range.start,end:range.end,...(id?{business:id}:{})})}`;
 const point=specs.some(s=>s.id===business)&&business&&pivot?homePivotCandidates(business as HomeBusiness).find(p=>p.date===pivot):undefined;
 return <div className="mx-auto w-full max-w-none space-y-6 pb-12">
  {detail&&<AnalysisBackLink href="/?workspace=home&view=kpi" className="text-sm text-muted-foreground">← 이전 화면</AnalysisBackLink>}
  <WorkspaceHeader><div><h1>{point?"사업 변곡점 상세 분석":`${selected.length===1?selected[0].name+" · ":""}KPI 실적 ${detail?"상세 분석":"트렌드"}`}</h1><p className="mt-2 text-sm text-muted-foreground">{range.start} — {range.end}</p></div><AnalysisRangeControl maxDate={today} range={range} onChange={setRange}/></WorkspaceHeader>
  <RefreshingAnalysis refreshKey={`${range.start}:${range.end}:${business}:${pivot}`}>
   {point&&<section className="space-y-2 rounded-xl border bg-card p-5"><h2 className="font-semibold">{point.date} · {point.title}</h2><p className="text-sm">직전 7일 평균 {number(Math.round(point.baseline))}회선 대비 {number(point.actual)}회선, {point.pct>0?"+":""}{point.pct.toFixed(1)}% 변화입니다.</p><p className="text-xs text-muted-foreground">20% 및 30회선 이상 변화를 감지한 통계 후보입니다. AI 확정 판단이나 정책 인과효과가 아닙니다.</p></section>}
   <section className="space-y-4 rounded-xl border bg-card p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">사업별 KPI 비교</h2><RecordMenu label="KPI 비교" actions={[{label:"전체 상세 분석",href:href()}]}/></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-right text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="py-3 text-left">사업</th><th>순증</th><th>가입 회선</th><th>해지</th><th>매출</th><th>순익</th><th><span className="sr-only">메뉴</span></th></tr></thead><tbody>{series.map(s=>{const total=s.rows.reduce((a,r)=>({lines:a.lines+r.customers,cancel:a.cancel+r.cancellations,revenue:a.revenue+r.revenue,profit:a.profit+r.netProfit}),{lines:0,cancel:0,revenue:0,profit:0});return <tr key={s.id} className="border-b last:border-0"><th className="py-4 text-left" style={{color:s.color}}>{s.name}</th><td>{number(total.lines-total.cancel)}</td><td>{number(total.lines)}</td><td>{number(total.cancel)}</td><td>{number(total.revenue)}원</td><td>{number(total.profit)}원</td><td><RecordMenu label={`${s.name} KPI`} actions={[{label:"사업 상세 분석",href:href(s.id)}]}/></td></tr>})}</tbody></table></div></section>
   <section className="space-y-4 rounded-xl border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{chosenMetric.name} 추이</h2><select aria-label="KPI 차트 지표" value={metric} onChange={e=>setMetric(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">{metrics.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div><div className="flex gap-4 text-xs">{selected.map(s=><span key={s.id} style={{color:s.color}}>{s.name}</span>)}</div>{chart.length?<div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={withPeriodMargins(chart, "date", range)} margin={{left:20,right:20}}><CartesianGrid vertical={false} strokeDasharray="3 3"/><XAxis dataKey="date" tickFormatter={v=>String(v).slice(5)} minTickGap={35}/><YAxis tickFormatter={v=>metric==="revenue"||metric==="netProfit"?`${v/10000}만`:number(v)} width={70}/><Tooltip contentStyle={{background:"var(--background)",borderColor:"var(--border)"}} formatter={v=>`${number(Number(v))}${chosenMetric.unit}`}/>{point&&<ReferenceLine x={point.date} stroke="var(--primary)" strokeDasharray="4 4"/>}{selected.map(s=><Line key={s.id} name={s.name} dataKey={s.id} stroke={s.color} dot={false} strokeWidth={2.5} isAnimationActive={false}/>)}</LineChart></ResponsiveContainer></div>:<p className="p-8 text-center text-sm text-muted-foreground">선택 기간에 실적 데이터가 없습니다.</p>}</section>
   <section className="grid gap-4 md:grid-cols-3">{series.map(s=>{const first=s.rows[0],last=s.rows.at(-1);return <article key={s.id} className="space-y-3 rounded-xl border bg-card p-5"><h2 className="font-semibold">{s.name} 분석 요약</h2><p className="text-sm leading-relaxed">{first&&last?`기간 첫 관측 ${number(first.customers)}회선에서 마지막 ${number(last.customers)}회선으로 ${((last.customers/first.customers-1)*100).toFixed(1)}% 변화했습니다.`:"관측 데이터가 없습니다."}</p><p className="text-xs text-muted-foreground">순증은 가입−해지이며 보유 회선 수가 아닙니다.</p></article>})}</section>
  </RefreshingAnalysis>
 </div>;
}
