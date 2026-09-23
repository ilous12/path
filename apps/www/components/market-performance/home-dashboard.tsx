"use client";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { TimelineMarkerIcon } from "./timeline-marker-icon";
import { AnalysisBackLink } from "./analysis-navigation";
import { ChartContainer } from "@/components/ui/chart";
import { EventTypeLegend } from "./annotation";
import { useRouter, useSearchParams } from "next/navigation";
import { Popover, PopoverTrigger, PopoverPortal, PopoverPositioner, PopoverPopup, PopoverArrow, PopoverTitle } from "@/components/ui/popover";
import { Brush, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ReferenceLine, ResponsiveContainer } from "recharts";
import { WorkspaceHeader } from "./workspace-header";
import { RefreshingAnalysis } from "./refreshing-analysis";
import { AnalysisRangeControl } from "./analysis-range-control";
import { MIN_DATE, MAX_DATE, validateRange, getEventType, daysBetween, type Range } from "./data";
import { useEventCatalog } from "./event-catalog";
import { useEventVisibility } from "./event-visibility";
import { useAlternatives } from "./alternative-store";
import { RecordMenu } from "./record-menu";
import { buildHomePerformance, homePivotCandidates, type HomeBusiness } from "./home-performance";
import { AnnualTargetEditor, useAnnualTargets, annualTarget, cumulativeHomeLines } from "./home-annual-targets";
import { chartDisplayRange, chartPaddingLabel } from "./chart-period";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useHomeTimelineNavigation } from "./home-timeline-navigation";
import { Button } from "@/components/ui/button";
const businesses: {id:HomeBusiness;name:string;color:string}[] = [{ id:"air", name:"AIR", color:"var(--color-blue-500)" },{ id:"tds", name:"TDS", color:"var(--color-emerald-500)" },{ id:"mvno", name:"MVNO", color:"var(--color-violet-500)" }];
const dayShift=(d:string,n:number)=>new Date(Date.parse(d)+n*86400000).toISOString().slice(0,10);
const num=(n:number)=>n.toLocaleString("ko-KR");
type Marker={id:string;date:string;end:string;title:string;summary:string;category?:string;change?:number;href:string;kind:"event"|"experiment"|"pivot";business:string};
export function HomeDashboard({timelineOnly=false}:{timelineOnly?:boolean}) {
  const query=useSearchParams();
  const [annual,setAnnual]=useState(true);
  const [activePivot,setActivePivot]=useState<Marker[] | null>(null);
  const [activeItems,setActiveItems]=useState<Marker[] | null>(null);
  const [plotWidth,setPlotWidth]=useState(1000);

  const [targets,setTargets]=useAnnualTargets();
  const [today] = useState(() => new Date(Date.now()+9*3600000).toISOString().slice(0,10));
  const [range,setRange] = useState(()=>{const requested={start:query.get("start")??"",end:query.get("end")??""};return validateRange(requested,today)?{start:`${today.slice(0,7)}-01`,end:today}:requested;});
  const [refreshKey,setRefreshKey]=useState("initial");
  const selectRange=(next:Range)=>{setRange(next);setRefreshKey(`${next.start}:${next.end}`);};
  const overview=useMemo(()=>{
    const maps=businesses.map(b=>({id:b.id,values:new Map(buildHomePerformance({start:MIN_DATE,end:today},b.id).map(r=>[r.key,r.customers]))}));
    return Array.from({length:daysBetween(MIN_DATE,today)},(_,i)=>{const key=dayShift(MIN_DATE,i);return {key,...Object.fromEntries(maps.map(b=>[b.id,b.values.get(key)??null]))};});
  },[today]);
  useEffect(()=>{setActivePivot(null);setActiveItems(null);},[range.start,range.end]);
  const displayRange = chartDisplayRange(range);
  const [selectedBusinesses,setBusinesses]=useState<string[]>(businesses.map(b=>b.id));
  const {chartRef,dragging}=useHomeTimelineNavigation(range,setRange,today,selectedBusinesses.length>0);
  useEffect(()=>{const element=chartRef.current;if(!element)return;const observer=new ResizeObserver(()=>setPlotWidth(Math.max(150,element.clientWidth-100)));observer.observe(element);return ()=>observer.disconnect();},[selectedBusinesses.length>0]);
  const {events} = useEventCatalog();
  const {hiddenIds} = useEventVisibility();
  const {alternatives} = useAlternatives();
  const current = events.filter(e => !hiddenIds.includes(e.id) && e.startAt.slice(0,10)<=range.end && (e.endAt??e.startAt).slice(0,10)>=range.start).sort((a,b)=>b.startAt.localeCompare(a.startAt));
  const rowsByBusiness=useMemo(()=>Object.fromEntries(businesses.map(b=>[b.id,buildHomePerformance(range,b.id)])) as Record<HomeBusiness,ReturnType<typeof buildHomePerformance>>,[range]);
  const chartRows=useMemo(()=>{
    const {start,end}=chartDisplayRange(range);
    const series=businesses.map(b=>({id:b.id, cumulative:cumulativeHomeLines(start,end,b.id), values:new Map(buildHomePerformance({start,end},b.id).map(row=>[row.key,row]))}));
    const result=[];
    for(let date=start;date<=end;date=dayShift(date,1)) result.push({key:date,...Object.fromEntries(series.flatMap(s=>{const row=s.values.get(date);return [[s.id,annual ? s.cumulative.get(date)??null : row?.customers??null],[`${s.id}Target`,annual ? annualTarget(targets,date.slice(0,4),s.id) : null],[`${s.id}Revenue`,row?.revenue??null],[`${s.id}Profit`,row?.netProfit??null]];}))});
    return result;
  },[range,annual,targets]);
  const days=Math.round((Date.parse(range.end)-Date.parse(range.start))/86400000)+1;
  const previousRange={start:dayShift(range.start,-days),end:dayShift(range.start,-1)};
  const totals=(data:ReturnType<typeof buildHomePerformance>)=>data.reduce((t,r)=>({lines:t.lines+r.customers,net:t.net+r.customers-r.cancellations,revenue:t.revenue+r.revenue}),{lines:0,net:0,revenue:0});
  const experiments=alternatives.filter(a=>a.status==="applied" && a.start<=range.end && dayShift(a.start,(a.applyDays??a.days)-1)>=range.start);
  const link=(workspace:string,view="summary")=>`/?${new URLSearchParams({workspace,view,start:range.start,end:range.end})}`;
  const timelineEvents = events.filter(e=>!hiddenIds.includes(e.id) && e.startAt.slice(0,10)<=displayRange.end && (e.endAt??e.startAt).slice(0,10)>=displayRange.start);
  const timelineExperiments = alternatives.filter(a=>a.status==="applied" && a.start<=displayRange.end && dayShift(a.start,(a.applyDays??a.days)-1)>=displayRange.start);
  const markers:Marker[]=[...timelineEvents.map(e=>({id:e.id,date:e.startAt.slice(0,10),end:(e.endAt??e.startAt).slice(0,10),title:e.title,summary:e.summary,category:e.types.map(t=>getEventType(t).label).join(" · "),kind:"event" as const,business:businesses.some(b=>b.id===e.operator.toLowerCase())?e.operator.toLowerCase():"market",href:`/analysis?${new URLSearchParams({workspace:businesses.find(b=>b.id===e.operator.toLowerCase())?.id??"air",events:e.id,start:range.start,end:range.end})}`})),...timelineExperiments.map(a=>({id:a.id,date:a.start,end:dayShift(a.start,(a.applyDays??a.days)-1),title:a.title,summary:`${({draft:"검토 중",applied:"적용",paused:"중지"} as const)[a.status]} · ${a.description}`,kind:"experiment" as const,business:a.workspace??"air",href:`/analysis?workspace=${a.workspace??"air"}&experiment=${encodeURIComponent(a.id)}`}))];
  for (const b of businesses) {
    const candidates=homePivotCandidates(b.id);
    candidates.forEach((p,i)=>{const end=candidates[i+1]?.date??MAX_DATE;if(p.date>displayRange.end||end<displayRange.start)return;markers.push({id:`pivot-${b.id}-${p.date}`,date:p.date,end,kind:"pivot",change:p.actual-p.baseline,business:b.id,title:p.title,summary:`직전 7일 평균 ${Math.round(p.baseline)}회선 대비 ${p.actual}회선 (${p.pct.toFixed(1)}%). 통계 후보이며 인과관계 확정이 아닙니다.`,href:`/analysis?${new URLSearchParams({workspace:"home",section:"kpi",business:b.id,pivot:p.date,start:range.start,end:range.end})}`});});
  }
  const lanes=[{id:"market",label:"업계 동향",color:"var(--color-gray-600)"},{id:"pivot",label:"변곡점",color:"var(--color-blue-600)"},{id:"own",label:"사업별 소식",color:"var(--color-red-600)"},{id:"experiment",label:"정책",color:"var(--color-yellow-300)"}];
  const laneGroups=lanes.map((lane,index)=>{
    const relevant=markers.filter(m=>(selectedBusinesses.includes(m.business)||m.business==="market")&&(lane.id==="market"?m.kind==="event"&&m.business==="market":lane.id==="own"?m.kind==="event"&&m.business!=="market":m.kind===lane.id)).sort((a,b)=>a.date.localeCompare(b.date));
    const clusters:{date:string;items:Marker[]}[]=[];
    for(const m of relevant){const date=m.date<displayRange.start?displayRange.start:m.date;const last=clusters.at(-1);if(last&&(Date.parse(date)-Date.parse(last.date))/Math.max(86400000,Date.parse(displayRange.end)-Date.parse(displayRange.start))*plotWidth<28)last.items.push(m);else clusters.push({date,items:[m]});}
    return {...lane,index,clusters};
  });
  const activePeriod=activeItems?.length?{start:activeItems.reduce((date,m)=>m.date<date?m.date:date,activeItems[0].date),end:activeItems.reduce((date,m)=>m.end>date?m.end:date,activeItems[0].end)}:undefined;
  const detailHref=(section:string,business?:string)=>`/analysis?${new URLSearchParams({workspace:"home",section,start:range.start,end:range.end,...(business?{business}:{})})}`;
  return <div className="mx-auto w-full max-w-none space-y-5 pb-6">{timelineOnly && <AnalysisBackLink href="/?workspace=home" className="text-sm text-muted-foreground">← 이전 화면</AnalysisBackLink>}<WorkspaceHeader><div><h1>{timelineOnly?"통합 타임라인 상세 분석":"Home · 사업 현황"}</h1><p className="mt-2 text-sm text-muted-foreground">{range.start} — {range.end} · 사업별 실적 흐름과 이벤트·정책을 비교하세요.</p></div></WorkspaceHeader>
    <RefreshingAnalysis mode="page" refreshKey={refreshKey}>
      {!timelineOnly && <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">사업별 요약</h2><RecordMenu label="사업별 요약" actions={[{label:"KPI",href:detailHref("kpi")}]}/></div><div className="grid gap-4 lg:grid-cols-3">{businesses.map(b=>{const total=totals(rowsByBusiness[b.id]);const before=totals(previousRange.start>=MIN_DATE?buildHomePerformance(previousRange,b.id):[]);const change=range.end<=MAX_DATE&&before.lines?(total.lines/before.lines-1)*100:null;const own=current.filter(e=>e.operator.toLowerCase()===b.id);const ex=experiments.filter(a=>(a.workspace??"air")===b.id);return <article key={b.id} className="flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-4"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><span className="size-2.5 rounded-full" style={{background:b.color}}/>{b.name}</h2><RecordMenu label={b.name} actions={[{label:"워크스페이스",href:link(b.id)},{label:"KPI",href:detailHref("kpi",b.id)}]} /></div><p className="text-xs leading-relaxed text-muted-foreground">{change===null?"전기 대비 산출 대기 · 관측 데이터 부족":`직전 동일 기간 대비 가입 회선 ${change>=0?"+":""}${change.toFixed(1)}%.`} 이벤트 {own.length}건 · 정책 {ex.length}건</p><dl className="mars-home-metrics text-sm">{[["순증",`${total.net>=0?"+":""}${num(total.net)}회선`],["가입 회선",`${num(total.lines)}회선`],["매출",`${num(Math.round(total.revenue/10000))}만원`]].map(([label,value])=><div key={label} className="flex flex-wrap justify-between gap-1"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>)}</dl><BusinessRecentChanges items={markers.filter(m=>m.kind!=="pivot" && m.business===b.id && m.date<=range.end && m.end>=range.start)} business={b.name} /></article>})}</div></section>}
      <section className="space-y-4 overflow-hidden rounded-xl border bg-card p-4 xl:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">통합 변화 타임라인</h2><div className="flex flex-wrap items-center gap-2"><Button size="sm" variant={annual?"ghost":"secondary"} aria-pressed={!annual} onClick={()=>setAnnual(false)}>일별 가입</Button><Button size="sm" variant={annual?"secondary":"ghost"} aria-pressed={annual} onClick={()=>setAnnual(true)}>연간 누적</Button><AnnualTargetEditor year={range.end.slice(0,4)} targets={targets} onSave={v=>{setTargets(v);setAnnual(true);}} /><ToggleGroup aria-label="차트 표시 사업" multiple size="sm" variant="outline" value={selectedBusinesses} onValueChange={setBusinesses}>{businesses.map(b=><ToggleGroupItem key={b.id} value={b.id} aria-label={`${b.name} 표시`} className="gap-1.5"><span className="size-2 rounded-sm" style={{background:b.color}}/>{b.name}</ToggleGroupItem>)}</ToggleGroup><div className="ml-1"><AnalysisRangeControl maxDate={today} range={range} onChange={selectRange}/></div>{!timelineOnly && <RecordMenu label="통합 변화 타임라인" actions={[{label:"상세 분석",href:detailHref("timeline")}]}/>}</div></div><p className="text-sm text-muted-foreground">업계 동향은 요금제 변경·이벤트·프로모션 등 시장의 변화입니다. 사업별 실적은 실선, 연간 목표는 같은 색의 점선입니다. Ctrl + 휠: 확대·축소 · 차트 드래그: 기간 이동.</p><div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{range.start} ~ {range.end} · 일간 집계</span><span>표시 {displayRange.start} ~ {displayRange.end} · {chartPaddingLabel(range)}</span><EventTypeLegend split pivot workspace="사업별 소식"/></div>
      <div aria-label="사업별 차트 범례" className="flex flex-wrap gap-2 text-xs">
        {businesses.filter(b=>selectedBusinesses.includes(b.id)).map(b=><div key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2">
          <span className="flex items-center gap-1.5 font-semibold"><span className="size-2 rounded-full" style={{background:b.color}}/>{b.name}</span>
          <span className="flex items-center gap-1.5 text-muted-foreground"><svg width="24" height="8" aria-hidden="true"><line x1="0" y1="4" x2="24" y2="4" stroke={b.color} strokeWidth="2.5"/></svg>{annual?"누적 실적":"일별 실적"}</span>
          {annual && <span className="flex items-center gap-1.5 text-muted-foreground"><svg width="24" height="8" aria-hidden="true"><line x1="0" y1="4" x2="24" y2="4" stroke={b.color} strokeWidth="2" strokeDasharray="7 5" strokeOpacity="0.65"/></svg>{annualTarget(targets,range.end.slice(0,4),b.id)?`연간 목표 ${num(annualTarget(targets,range.end.slice(0,4),b.id)!)}회선`:"연간 목표 미설정"}</span>}
        </div>)}
      </div>
      {!selectedBusinesses.length&&<p className="p-6 text-center text-sm text-muted-foreground">표시할 사업을 선택해 주세요.</p>}
      {!!selectedBusinesses.length && <div>
        {<div ref={chartRef} className={`select-none ${dragging?"cursor-grabbing":"cursor-grab"}`} style={{touchAction:"pan-y"}} role="img" aria-label="AIR TDS MVNO 사업별 회선 비교 차트"><ChartContainer className="mars-timeline-chart w-full flex-none aspect-auto" config={Object.fromEntries(businesses.map(b=>[b.id,{label:b.name,color:b.color}]))}><LineChart data={chartRows} margin={{left:2,right:24,top:200,bottom:0}}>
        <g className="fill-foreground text-xs font-semibold" pointerEvents="none" aria-hidden="true">{lanes.map((lane,index)=><g key={lane.id}><text x={4} y={38+index*44}>{lane.label}</text><line x1={2} x2="100%" y1={56+index*44} y2={56+index*44} stroke="var(--muted-foreground)" strokeOpacity={0.35}/></g>)}</g>
        {laneGroups.flatMap(lane=>lane.clusters.map(({date,items})=><ReferenceLine key={`${lane.id}:${date}:${range.start}:${range.end}`} x={date} stroke={lane.id==="experiment"?"none":lane.color} strokeDasharray="3 4" strokeOpacity={0.65} label={<TimelineMarker date={date} items={items} lane={lane.label} laneIndex={lane.index} color={lane.color} onActive={items=>{setActiveItems(items);if(lane.id==="pivot")setActivePivot(items);}} highlight={lane.id!=="pivot" && !!activePivot?.some(p=>items.some(m=>(m.business===p.business||m.business==="market")&&m.date<=p.date&&m.end>=dayShift(p.date,-7)))}/>}/>))}
        {activePeriod&&<ReferenceArea x1={activePeriod.start<displayRange.start?displayRange.start:activePeriod.start} x2={activePeriod.end>displayRange.end?displayRange.end:activePeriod.end} fill="var(--primary)" fillOpacity={0.1}/>}
<CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" strokeOpacity={0.5}/><XAxis axisLine={false} tickLine={false} tickMargin={10} dataKey="key" tickFormatter={v=>String(v).slice(5)} tick={{fontSize:11}} minTickGap={35}/><YAxis axisLine={false} tickLine={false} width={76} tickFormatter={v=>`${Number(v)>=10000?`${Math.round(Number(v)/10000)}만`:num(Number(v))}회선`} domain={[0,"auto"]} tick={{fontSize:11}}/><ReferenceArea x1={range.start} x2={range.end} fill="var(--primary)" fillOpacity={0.035}/><Tooltip active={dragging||activeItems?false:undefined} content={({active,payload,label})=>active&&payload?.length?<div className="min-w-52 space-y-2 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-lg"><p className="font-semibold">{label}</p>{businesses.filter(b=>selectedBusinesses.includes(b.id)).map(b=>{const row=payload[0]?.payload;return row?.[b.id]!=null?<div key={b.id} className="border-t pt-2"><p className="font-medium" style={{color:b.color}}>{b.name} · {annual?"연간 누적 ":""}{num(row[b.id])}회선</p>{annual && row[`${b.id}Target`] && <p>연간 목표 {num(row[`${b.id}Target`])}회선 · 달성 {(row[b.id]/row[`${b.id}Target`]*100).toFixed(1)}%</p>}<p className="mt-1 text-muted-foreground">당일 매출 {num(row[`${b.id}Revenue`])}원 · 순익 {num(row[`${b.id}Profit`])}원</p></div>:null;})}<p className="text-[10px] text-muted-foreground">사업별 합성 시나리오</p></div>:null}/>{businesses.filter(b=>selectedBusinesses.includes(b.id)).map(b=><Line key={b.id} dataKey={b.id} name={b.name} stroke={b.color} strokeWidth={2.5} dot={false} activeDot={{r:4,fill:b.color,stroke:"var(--background)",strokeWidth:2}} connectNulls={false} isAnimationActive={false}/>)}{annual && businesses.filter(b=>selectedBusinesses.includes(b.id)).map(b=><Line key={`${b.id}-target`} dataKey={`${b.id}Target`} name={`${b.name} 연간 목표`} stroke={b.color} strokeWidth={2} strokeOpacity={0.65} strokeDasharray="7 5" dot={false} activeDot={false} connectNulls={false} isAnimationActive={false} />)}</LineChart></ChartContainer></div>}
      </div>}
      <fieldset aria-label="전체 기간 탐색" className="space-y-2 border-t pt-3">
        <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>기간 탐색</span><span>{range.start} ~ {range.end} · 양 끝: 기간 조정 / 가운데: 이동</span></div>
        <div className="h-16 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={overview} margin={{top:0,right:8,bottom:0,left:8}}>
          <Brush dataKey="key" height={48} y={4} startIndex={Math.max(0,overview.findIndex(r=>r.key===range.start))} endIndex={Math.max(0,overview.findIndex(r=>r.key===range.end))} travellerWidth={8} fill="var(--muted)" stroke="var(--muted-foreground)" ariaLabel="조회 기간 선택" onChange={({startIndex,endIndex})=>{if(startIndex===undefined||endIndex===undefined)return;const next={start:overview[startIndex].key,end:overview[endIndex].key};if(next.start!==range.start||next.end!==range.end)setRange(next);}}>
            <LineChart>{businesses.filter(b=>selectedBusinesses.includes(b.id)).map(b=><Line key={b.id} dataKey={b.id} stroke={b.color} strokeWidth={1} dot={false} isAnimationActive={false}/>)}</LineChart>
          </Brush>
        </LineChart></ResponsiveContainer></div>
      </fieldset>
      <p className="text-xs text-muted-foreground">관측 기준일 {MAX_DATE} · 미관측 날짜는 빈 구간으로 표시합니다. 순증 = 가입 회선 − 해지. 가입 회선과 매출은 선택 기간 합계이며 보유 회선 수가 아닙니다. Home의 사업별 수치는 비교 화면을 위한 독립 합성 시나리오이며 실제 사업 실적이 아닙니다. 외부 시장 이벤트도 중복 없이 표시합니다.</p>
      </section>
    </RefreshingAnalysis>
  </div>;
}

function BusinessRecentChanges({items,business}:{items:Marker[];business:string}) {
  const sorted=[...items].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  const chosen = sorted.slice(0, 1);
  return <section aria-label={`${business} 최근 주요 변화`} className="space-y-1 border-t pt-2">
    <h3 className="mb-1 text-[11px] font-semibold">최근 주요 변화</h3>
    {chosen.map(item=><div key={item.id} className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-[10px] text-muted-foreground">{item.kind==="event"?"이벤트":"정책"}</span>
      <Link href={item.href} title={`${item.date} · ${item.title} — ${item.summary}`} className="min-w-0 flex-1 truncate text-[11px] hover:underline">{item.title}</Link>
      <RecordMenu label={`${business} ${item.title}`} actions={[{label:"상세보기",href:item.href}]}/>
    </div>)}
    {!chosen.length&&<p className="text-[11px] text-muted-foreground">조회 기간 내 주요 변화가 없습니다.</p>}
  </section>;
}

function TimelineMarker({date,items,lane,laneIndex,color,viewBox,highlight=false,onActive}:{date:string;items:Marker[];lane:string;laneIndex:number;color:string;viewBox?:{x?:number;y?:number};highlight?:boolean;onActive:(items:Marker[]|null)=>void}) {
 const [open,setOpen]=useState(false);
 const router=useRouter();
 const kind=items[0].kind;
 const latestPivot=[...items].sort((a,b)=>b.date.localeCompare(a.date))[0];
 const change=latestPivot.change;
 const direction=kind==="pivot"?(change===undefined?"증감 미확인":change>0?"회선 증가":change<0?"회선 감소":"회선 변화 없음"):"";
 if(viewBox?.x===undefined)return null;
 return <foreignObject x={viewBox.x-10.5} y={23.5+laneIndex*44} width={38} height={40} style={{overflow:"visible"}}>
  <div onPointerMove={e=>e.stopPropagation()}>
  <Popover open={open} onOpenChange={value=>{setOpen(value);onActive(value?items:null);}}>
   <PopoverTrigger openOnHover delay={100} closeDelay={180} onClick={()=>{if(items.length===1)router.push(items[0].href);}} aria-label={`${date} ${lane} ${items.length}건 ${direction}`.trim()} title={highlight?"변곡점 직전 7일 영향 검토 후보 · 인과관계 미확정":undefined} className={`relative flex size-[21px] items-center justify-center rounded-md border-0 text-[10px] font-bold hover:brightness-110 focus-visible:outline-2 focus-visible:outline-ring ${highlight?"ring-2 ring-amber-400 ring-offset-2 ring-offset-background":""}`} style={{background:color,color:kind==="experiment"?"black":"white"}}>
    <TimelineMarkerIcon kind={kind} change={change}/>
    {items.length>1&&<span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-foreground bg-white px-0.5 text-[10px] font-bold text-black">{items.length}</span>}
   </PopoverTrigger>
   <PopoverPortal><PopoverPositioner side="top" align="start" sideOffset={10} collisionAvoidance={{side:"none",align:"shift",fallbackAxisSide:"none"}} className="z-50"><PopoverPopup className="w-[340px] max-w-[calc(100vw-2rem)] rounded-lg border bg-popover p-0 text-left text-popover-foreground shadow-lg" onPointerMove={e=>e.stopPropagation()}><PopoverArrow className="data-[side=top]:-bottom-2 data-[side=top]:rotate-180"/>
    <div className="border-b bg-muted/30 px-3.5 py-2.5"><PopoverTitle className="text-[11px]">{lane} · {date} · {items.length}건{direction?` · ${direction}`:""}</PopoverTitle></div>
    <div className="max-h-56 space-y-3 overflow-y-auto overscroll-contain p-3.5">{kind==="pivot"&&<p className="text-[10px] text-muted-foreground">강조 항목은 직전 7일의 영향 검토 후보이며 인과관계는 미확정입니다.</p>}{items.slice(0,3).map(m=><article key={m.id} className="space-y-1 border-b pb-2 text-[11px] last:border-0 last:pb-0"><div className="flex items-start justify-between gap-2"><h3 className="line-clamp-2 font-medium">{m.title}</h3>{m.category&&<span className="shrink-0 text-[10px] text-muted-foreground">{m.category.split(" · ")[0]}</span>}</div><p className="text-muted-foreground">{m.business==="market"?"시장":m.business.toUpperCase()} · {m.date} ~ {m.end}</p><p className="line-clamp-2 text-muted-foreground">{m.summary}</p><div className="flex justify-end"><RecordMenu label={m.title} actions={[{label:"상세보기",href:m.href}]}/></div></article>)}{items.length>3&&<details className="text-[11px]"><summary className="cursor-pointer text-muted-foreground">외 {items.length-3}건 보기</summary>{items.slice(3).map(m=><Link key={m.id} href={m.href} className="mt-2 block hover:underline">{m.title} →</Link>)}</details>}</div>
   </PopoverPopup></PopoverPositioner></PopoverPortal>
  </Popover>
  </div>
 </foreignObject>;
}
