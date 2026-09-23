"use client";
import { withPeriodMargins, chartDisplayRange } from "./chart-period";
import { useMemo,useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LineChart,Line,XAxis,YAxis,Tooltip,ReferenceLine,CartesianGrid,ResponsiveContainer } from "recharts";
import catalog from "./fixtures/plan-catalog.json";
import { isAir,planDay,type PlanOffer } from "./plan-market-model";
import { competitiveness,similarPlan,planPrice,type PriceBasis } from "./plan-competitiveness-model";
import { WorkspaceHeader } from "./workspace-header";
import { PageEntry } from "./page-entry";
import { AnalysisRangeControl } from "./analysis-range-control";
import { presetRange } from "./data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecordMenu } from "./record-menu";
const money=(n:number|null)=>n===null?"미확인":`${n.toLocaleString("ko-KR")}원`;
const spec=(p:PlanOffer)=>`${p.network} · ${p.unlimitedData?"무제한":`${p.monthlyDataGb??"미확인"}GB`}${p.dailyDataGb?` + 매일 ${p.dailyDataGb}GB`:""} · 소진 후 ${p.qosKbps===null?"미확인":p.qosKbps>=1000?`${p.qosKbps/1000}Mbps`:`${p.qosKbps}Kbps`}`;
const airPlans=catalog.offers.filter(isAir).sort((a,b)=>Number(b.sourceId==="air-official")-Number(a.sourceId==="air-official")||(a.monthlyDataGb??Infinity)-(b.monthlyDataGb??Infinity));
export function PlanCompetitiveness() {
 const workspace=useSearchParams().get("workspace")??"air";
 const [airId,setAirId]=useState(airPlans.find(p=>p.sourceId==="air-official")!.offerId);
 const air=airPlans.find(p=>p.offerId===airId)!;
 const basis: PriceBasis = "bill";
 const [scope,setScope]=useState("similar");
 const [query,setQuery]=useState("");
 const [mode,setMode]=useState("all");
 const [selected,setSelected]=useState<string[]>([]);
 const [page,setPage]=useState(0);
 const [range,setRange]=useState(presetRange("1M"));
 const [activeDay,setActiveDay]=useState(planDay(air.observedAt));
 const peers=useMemo(()=>catalog.offers.filter(p=>!isAir(p)&&(scope!=="similar"||similarPlan(air,p))&&`${p.name} ${p.operator} ${p.channel}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>(planPrice(a,basis)??Infinity)-(planPrice(b,basis)??Infinity)||a.offerId.localeCompare(b.offerId)),[air,scope,query,basis]);
 const targets=mode==="all"?peers:peers.filter(p=>selected.includes(p.offerId));
 // Only date-matched complete snapshots are scored. Price-only history cannot reconstruct historical benefits/specs.
 const report=(day:string)=>{
   const evaluated=planDay(air.observedAt)!==day?[]:targets.filter(p=>planDay(p.observedAt)===day).map(p=>({offer:p,...competitiveness(air,p,basis)})).filter(r=>r.score!==null);
   const score=evaluated.length?evaluated.reduce((s,r)=>s+r.score!,0)/evaluated.length:null;
   return {score,evaluated,coverage:evaluated.length?evaluated.reduce((s,r)=>s+r.coverage,0)/evaluated.length:0};
 };
 const displayRange=chartDisplayRange(range);
 const dates=[];for(let t=Date.parse(displayRange.start);t<=Date.parse(displayRange.end);t+=86400000)dates.push(new Date(t).toISOString().slice(0,10));
 const day=activeDay>=range.start&&activeDay<=range.end?activeDay:range.end;
 const result=report(day);
 const componentScores=[{key:"price",label:"가격"},{key:"data",label:"월 기본 데이터"},{key:"qos",label:"소진 후 속도"},{key:"voice",label:"통화"}].map(item=>{
   const values=result.evaluated.flatMap(r=>r.components.filter(c=>c.key===item.key&&c.score!==null));
   return {...item,score:values.length?values.reduce((sum,c)=>sum+c.score!,0)/values.length:null};
 });
 const strengths=componentScores.filter(c=>c.score!==null&&c.score>55).sort((a,b)=>b.score!-a.score!);
 const weaknesses=componentScores.filter(c=>c.score!==null&&c.score<45).sort((a,b)=>a.score!-b.score!);
 const peerPrices=result.evaluated.map(r=>planPrice(r.offer,basis)).filter((v):v is number=>v!==null);
 const averagePrice=peerPrices.length?peerPrices.reduce((sum,v)=>sum+v,0)/peerPrices.length:null;
 const airPrice=planPrice(air,basis);
 const difference=averagePrice!==null&&airPrice!==null?airPrice-averagePrice:null;
 const summaryItems=[
   {title:"가격 포지션",body:difference===null?"가격 비교에 필요한 수집 정보가 부족합니다.":`AIR 월 ${money(airPrice)}, 비교군 평균 ${money(Math.round(averagePrice!))}입니다. ${difference===0?"동일한 가격 수준입니다.":`AIR가 ${money(Math.round(Math.abs(difference)))} ${difference<0?"낮습니다":"높습니다"}.`} 혜택 지급 조건과 할인 종료 후 요금은 별도 확인이 필요합니다.`},
   {title:"경쟁 강점",body:strengths.length?`${strengths.map(c=>`${c.label} ${c.score!.toFixed(1)}점`).join(" · ")}으로 상대 우위입니다. 해당 조건을 상품·채널 메시지의 차별점으로 검토하세요.`:"확인된 항목에서 뚜렷한 우위는 없습니다. 가입 조건과 혜택의 차별점을 추가로 확인하세요."},
   {title:"보완할 조건",body:weaknesses.length?`${weaknesses.map(c=>`${c.label} ${c.score!.toFixed(1)}점`).join(" · ")}이 비교군보다 낮습니다. 조건 개선 비용과 수익성을 함께 검토하세요.`:"확인된 항목에서 뚜렷한 열위는 없습니다. 프로모션 종료·가입 자격·혜택 기간에 따라 경쟁력이 유지되는지 점검하세요."},
 ];
 const trend=dates.map(date=>{const r=report(date);return {date,score:r.score,count:r.evaluated.length};});
 const pages=Math.max(1,Math.ceil(peers.length/8)),current=Math.min(page,pages-1);
 const detail=(id:string)=>`/analysis?${new URLSearchParams({workspace,plan:id,start:range.start,end:range.end})}`;
 const reset=()=>{setSelected([]);setPage(0);};
 return <div className="space-y-6 pb-12"><WorkspaceHeader><div><h1>요금제 · 경쟁력</h1><p className="mt-2 text-sm text-muted-foreground">AIR 상품을 선택하고 경쟁 요금제와 가격·스펙을 비교하세요. {range.start} — {range.end}</p></div><AnalysisRangeControl range={range} onChange={r=>{setRange(r);setActiveDay(r.end);}}/></WorkspaceHeader><PageEntry>
  <div className="grid items-start gap-4 lg:grid-cols-[150px_minmax(240px,0.8fr)_minmax(0,1.35fr)] 2xl:grid-cols-[180px_minmax(280px,0.8fr)_minmax(0,1.5fr)]">
   <section className="rounded-xl border bg-card p-4"><h2 className="text-sm font-semibold">1 · AIR 요금제</h2><div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar md:max-h-[500px] md:flex-col md:overflow-y-auto">{airPlans.map(p=><button key={p.offerId} type="button" aria-pressed={airId===p.offerId} onClick={()=>{setAirId(p.offerId);reset();}} className={`min-w-44 space-y-1 rounded-lg border p-3 text-left transition-colors md:min-w-0 ${airId===p.offerId?"border-primary bg-primary/10":"hover:bg-muted"}`}><p className="text-xs font-semibold">{p.name}</p><p className="text-[11px] text-muted-foreground">{p.channel==="OFFICIAL"?"공식":p.channel}</p><p className="text-sm font-semibold">{money(planPrice(p,basis))}</p></button>)}</div></section>
   <section className="space-y-3 rounded-xl border bg-card p-4"><h2 className="text-sm font-semibold">2 · 대응 요금제 선택</h2><p className="text-[11px] text-muted-foreground">유사 조건: 동일 망·무제한 여부·일 추가 데이터, 월 기본량 ±25%(최소 ±2GB)</p><div className="flex flex-wrap gap-2"><select aria-label="경쟁 요금제 비교군" value={scope} onChange={e=>{setScope(e.target.value);reset();}} className="rounded-md border bg-background px-2 py-1.5 text-xs"><option value="similar">유사 조건</option><option value="all">전체 조건</option></select><Input aria-label="경쟁 요금제 검색" className="min-w-32 flex-1" value={query} placeholder="사업자·상품·채널 검색" onChange={e=>{setQuery(e.target.value);reset();}}/></div><div className="flex items-center justify-between gap-2"><div className="flex gap-1">{[["all","전체 비교"],["individual","개별 선택"]].map(([id,label])=><Button key={id} size="sm" variant={mode===id?"secondary":"ghost"} aria-pressed={mode===id} onClick={()=>setMode(id)}>{label}</Button>)}</div><span className="text-[11px] text-muted-foreground">{targets.length} / {peers.length}건</span></div><p className="text-[10px] text-muted-foreground">전체 비교는 현재 필터의 모든 요금제(모든 페이지)를 포함합니다.</p><div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">{peers.slice(current*8,current*8+8).map(p=><div key={p.offerId} className={`flex items-start gap-2 rounded-lg border p-3 ${mode==="all"||selected.includes(p.offerId)?"bg-muted/30":""}`}><input aria-label={`${p.operator} ${p.name} 비교 선택`} type="checkbox" className="mt-1 shrink-0" checked={mode==="all"||selected.includes(p.offerId)} onChange={()=>{if(mode==="all"){setMode("individual");setSelected([p.offerId]);}else setSelected(v=>v.includes(p.offerId)?v.filter(id=>id!==p.offerId):[...v,p.offerId]);}}/><div className="min-w-0 flex-1"><p className="line-clamp-1 text-xs font-medium">{p.operator} · {p.name}</p><p className="mt-1 text-[10px] text-muted-foreground">{spec(p)}</p><p className="mt-1 text-xs font-semibold">{money(planPrice(p,basis))}<span className="ml-2 text-[10px] font-normal text-muted-foreground">{p.channel} · {p.effectivePeriodMonths??"미확인"}개월</span></p></div><RecordMenu label={p.name} actions={[{label:"상세 분석",href:detail(p.offerId)},{label:"출처",href:p.detailUrl,external:true}]}/></div>)}</div>{!peers.length&&<p className="py-8 text-center text-xs text-muted-foreground">비교 가능한 요금제가 없습니다. 비교군이나 검색 조건을 변경하세요.</p>}<div className="flex items-center justify-between text-xs"><span>{current+1} / {pages}</span><div className="flex gap-1"><Button size="sm" variant="ghost" disabled={!current} onClick={()=>setPage(current-1)}>이전</Button><Button size="sm" variant="ghost" disabled={current===pages-1} onClick={()=>setPage(current+1)}>다음</Button></div></div></section>
   <aside aria-label="AI 경쟁력 요약" className="order-first space-y-5 rounded-xl border border-primary/20 bg-card p-5 lg:order-none lg:sticky lg:top-16 xl:p-6">
    <div><p className="text-[11px] font-medium text-muted-foreground">3 · AIR 경쟁력</p><h2 className="mt-1 text-lg font-semibold">AI 경쟁력 요약</h2><p className="mt-2 text-xs text-muted-foreground">{air.name} · {air.channel} · {day}</p></div>
    <div className="rounded-lg bg-primary/5 p-4"><div className="flex items-center justify-between gap-4"><h3 className="text-base font-semibold">{result.score===null?"평가 데이터 부족":result.score>55?"선택 비교군 대비 우위":result.score<45?"선택 비교군 대비 보완 필요":"선택 비교군과 유사"}</h3><div className="shrink-0"><strong className="text-3xl tabular-nums">{result.score===null?"—":result.score.toFixed(1)}</strong><span className="ml-1 text-[11px] text-muted-foreground">/ 100</span></div></div><p className="mt-3 text-sm leading-relaxed">{result.score===null?"선택 날짜에 함께 관측된 AIR·경쟁 요금제가 없습니다. 관측일 또는 비교 대상을 변경하면 경쟁력 요약을 확인할 수 있습니다.":`${result.evaluated.length}개 판매 조건 중 ${result.evaluated.filter(r=>r.score!>55).length}개 대비 우위, ${result.evaluated.filter(r=>r.score!<45).length}개 대비 열위입니다. ${scope==="all"?"서로 다른 상품 조건이 포함되어 유사 조건 비교도 함께 확인해야 합니다.":"유사 상품군의 가격과 제공량을 종합한 결과입니다."}`}</p></div>
    {result.score!==null&&<div className="space-y-4">{summaryItems.map(item=><div key={item.title}><h3 className="text-xs font-semibold">{item.title}</h3><p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p></div>)}</div>}
    <div className="grid grid-cols-2 gap-2 border-t pt-4">{componentScores.map(c=><div key={c.key} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-xs"><span className="text-muted-foreground">{c.label}</span><strong>{c.score===null?"미확인":`${c.score.toFixed(1)}점`}</strong></div>)}</div>
    <div className="space-y-2 text-[11px] leading-relaxed text-muted-foreground"><p>50점은 동등 · 유효 비교 {result.evaluated.length}/{targets.length}건 · 항목 충족률 {result.coverage.toFixed(0)}%</p><p>월 청구 요금·스펙 기준 상대 평가입니다. 가격 50% · 데이터 25% · 소진 후 속도 15% · 통화 10%</p><Link className="inline-block text-primary hover:underline" href={air.detailUrl} target="_blank" rel="noreferrer">AIR 원문 조건 확인 ↗</Link></div>
   </aside>
  </div>
  <section className="space-y-4 rounded-xl border bg-card p-5"><h2 className="font-semibold">기간별 경쟁력 변화</h2><p className="text-xs text-muted-foreground">현재 선택한 비교군을 고정해 날짜별로 비교합니다. 완전한 수집본이 같은 날 존재할 때만 점수를 산출하며 미관측 구간은 연결하지 않습니다.</p><div className="overflow-x-auto pb-2"><div style={{minWidth:Math.max(600,dates.length*24)}} className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={withPeriodMargins(trend, "date", range)} margin={{left:0,right:20,top:10}}><CartesianGrid vertical={false} strokeDasharray="3 3"/><XAxis dataKey="date" tickFormatter={v=>String(v).slice(5)} minTickGap={24} tick={{fontSize:10}}/><YAxis domain={[0,100]} width={35}/><ReferenceLine y={50} stroke="var(--muted-foreground)" strokeDasharray="3 3"/><Tooltip contentStyle={{background:"var(--background)",borderColor:"var(--border)"}} formatter={v=>`${Number(v).toFixed(1)}점`}/><Line name="AIR 경쟁력" dataKey="score" stroke="var(--chart-1)" strokeWidth={2.5} connectNulls={false} dot={{r:4}} isAnimationActive={false}/></LineChart></ResponsiveContainer></div></div><div className="flex gap-2 overflow-x-auto pb-2" aria-label="경쟁력 관측일 선택">{trend.filter(r=>r.score!==null).map(r=><Button key={r.date} size="sm" variant={day===r.date?"secondary":"outline"} onClick={()=>setActiveDay(r.date)}>{r.date} · {r.score!.toFixed(1)}점</Button>)}{!trend.some(r=>r.score!==null)&&<p className="text-xs text-muted-foreground">선택 기간에 산출 가능한 관측일이 없습니다.</p>}</div><p className="text-[11px] text-muted-foreground">현재 수집일은 2026-09-21 하루입니다. 가격만 있는 과거 이력에 최신 스펙을 대입해 과거 경쟁력을 만들지 않습니다.</p></section>
  <details className="rounded-xl border bg-card p-4 text-xs"><summary className="cursor-pointer font-semibold">점수 산식과 비교 한계</summary><p className="mt-3 leading-relaxed text-muted-foreground">가격 50%, 월 기본 데이터 25%, 소진 후 속도 15%, 통화 10%. 항목 점수는 50 + 50 × (AIR−경쟁사) / 두 값의 최댓값이며 가격은 부호를 반대로 적용합니다. 양쪽 0은 50점, 양쪽 무제한은 50점, 한쪽 무제한은 100/0점입니다. 누락 항목은 제외 후 가중치를 재정규화하고 가격 미확인 비교는 제외합니다. 전체 점수는 유효 판매 조건별 점수의 단순 평균으로 시장점유율 가중치가 아닙니다. 프로모션 종료 후 가격, 자격 조건, 일 추가 데이터의 월 환산 가치는 점수에 포함하지 않습니다. 망·약정·혜택 기간 차이는 상세에서 확인해야 합니다.</p></details>
 </PageEntry></div>;
}
