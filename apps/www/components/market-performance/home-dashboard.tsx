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
import { RefreshingAnalysis } from "./refreshing-analysis";
import { AnalysisRangeControl } from "./analysis-range-control";
import { MIN_DATE, MAX_DATE, validateRange, getEventType, daysBetween, type Range } from "./data";
import { useEventCatalog } from "./event-catalog";
import { useEventVisibility } from "./event-visibility";
import { useAlternatives } from "./alternative-store";
import { RecordMenu } from "./record-menu";
import { buildHomePerformance, homePivotCandidates, type HomeBusiness } from "./home-performance";
import { AnnualTargetEditor, useAnnualTargets, cumulativeHomeLines, cumulativeTarget, dailyTarget } from "./home-annual-targets";
import { chartDisplayRange } from "./chart-period";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useHomeTimelineNavigation } from "./home-timeline-navigation";
import { Button } from "@/components/ui/button";
import { HomeIntelligence, SectionLabel } from "./intelligence-ui";
import { TodayLine } from "./today-line";
import { eventBusiness, TIMELINE_LANES, timelineLane, type TimelineLane } from "./path-intelligence";
const businesses: {id:HomeBusiness;name:string;color:string}[] = [{ id:"air", name:"AIR", color:"var(--color-blue-500)" },{ id:"tds", name:"TDS", color:"var(--color-emerald-500)" },{ id:"mvno", name:"MVNO", color:"var(--color-violet-500)" }];
const dayShift=(d:string,n:number)=>new Date(Date.parse(d)+n*86400000).toISOString().slice(0,10);
const num=(n:number)=>n.toLocaleString("ko-KR");
type Marker={id:string;date:string;end:string;title:string;summary:string;category?:string;change?:number;href:string;kind:"event"|"experiment"|"pivot";business:string;lane:TimelineLane};
export function HomeDashboard({timelineOnly=false}:{timelineOnly?:boolean}) {
  const query=useSearchParams();
  const [annual,setAnnual]=useState(false);
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
  const chartRows=useMemo(()=>{
    const {start,end}=chartDisplayRange(range);
    const series=businesses.map(b=>({id:b.id, cumulative:cumulativeHomeLines(start,end,b.id), values:new Map(buildHomePerformance({start,end},b.id).map(row=>[row.key,row]))}));
    const result=[];
    for(let date=start;date<=end;date=dayShift(date,1)) result.push({key:date,...Object.fromEntries(series.flatMap(s=>{const row=s.values.get(date);return [[s.id,annual ? s.cumulative.get(date)??null : row?.customers??null],[`${s.id}Target`,annual ? cumulativeTarget(targets,date,s.id) : dailyTarget(targets,date,s.id)],[`${s.id}Revenue`,row?.revenue??null],[`${s.id}Profit`,row?.netProfit??null]];}))});
    return result;
  },[range,annual,targets]);
  const timelineEvents = events.filter(e=>!hiddenIds.includes(e.id) && e.startAt.slice(0,10)<=displayRange.end && (e.endAt??e.startAt).slice(0,10)>=displayRange.start);
  const timelineExperiments = alternatives.filter(a=>a.status==="applied" && a.start<=displayRange.end && dayShift(a.start,(a.applyDays??a.days)-1)>=displayRange.start);
  const markers:Marker[]=[...timelineEvents.map(e=>({id:e.id,date:e.startAt.slice(0,10),end:(e.endAt??e.startAt).slice(0,10),title:e.title,summary:e.summary,category:e.types.map(t=>getEventType(t).label).join(" · "),kind:"event" as const,lane:timelineLane(e),business:eventBusiness(e)??"market",href:`/analysis?${new URLSearchParams({workspace:eventBusiness(e)??"air",events:e.id,start:range.start,end:range.end})}`})),...timelineExperiments.map(a=>({id:a.id,date:a.start,end:dayShift(a.start,(a.applyDays??a.days)-1),title:a.title,summary:`${({draft:"검토 중",applied:"적용",paused:"중지"} as const)[a.status]} · ${a.description}`,kind:"experiment" as const,lane:"campaign" as const,business:a.workspace??"air",href:`/analysis?workspace=${a.workspace??"air"}&experiment=${encodeURIComponent(a.id)}`}))];
  for (const b of businesses) {
    const candidates=homePivotCandidates(b.id);
    candidates.forEach((p,i)=>{const end=candidates[i+1]?.date??MAX_DATE;if(p.date>displayRange.end||end<displayRange.start)return;markers.push({id:`pivot-${b.id}-${p.date}`,date:p.date,end,kind:"pivot",lane:"pivot",change:p.actual-p.baseline,business:b.id,title:p.title,summary:`직전 7일 평균 ${Math.round(p.baseline)}회선 대비 ${p.actual}회선 (${p.pct.toFixed(1)}%). 원인 가설은 변곡점 판단에서 확인하세요.`,href:`/analysis?${new URLSearchParams({workspace:"home",section:"kpi",business:b.id,pivot:p.date,start:range.start,end:range.end})}`});});
  }
  const lanes=TIMELINE_LANES;
  const LANE=26, LANE_TOP=18;
  const clusterColor=(lane:{id:string;color:string},items:Marker[])=>{if(lane.id!=="online")return lane.color;const owners=new Set(items.map(m=>m.business));return owners.size===1?businesses.find(b=>owners.has(b.id))?.color??lane.color:lane.color;};
  const laneGroups=lanes.map((lane,index)=>{
    const relevant=markers.filter(m=>m.lane===lane.id&&(m.business==="market"||selectedBusinesses.includes(m.business))).sort((a,b)=>a.date.localeCompare(b.date));
    const clusters:{date:string;items:Marker[]}[]=[];
    for(const m of relevant){const date=m.date<displayRange.start?displayRange.start:m.date;const last=clusters.at(-1);if(last&&(Date.parse(date)-Date.parse(last.date))/Math.max(86400000,Date.parse(displayRange.end)-Date.parse(displayRange.start))*plotWidth<28)last.items.push(m);else clusters.push({date,items:[m]});}
    return {...lane,index,clusters};
  });
  const activePeriod=activeItems?.length?{start:activeItems.reduce((date,m)=>m.date<date?m.date:date,activeItems[0].date),end:activeItems.reduce((date,m)=>m.end>date?m.end:date,activeItems[0].end)}:undefined;
  return <div className="mx-auto w-full max-w-none space-y-3 pb-2">{timelineOnly && <AnalysisBackLink href="/?workspace=home" className="text-sm text-muted-foreground">← 이전 화면</AnalysisBackLink>}<div className="flex min-h-9 flex-wrap items-baseline gap-x-3 gap-y-1"><h1 className="text-xl font-semibold tracking-tight">{timelineOnly?"통합 타임라인":"사업 현황"}</h1><p className="text-xs text-muted-foreground">기준 {MAX_DATE} · 시장·타사·자사 판매정책 · AIR · TDS · MVNO</p></div>
    <RefreshingAnalysis mode="page" refreshKey={refreshKey}>
      {!timelineOnly && <HomeIntelligence asOf={today} targets={targets} />}
      <SectionLabel meta="시장 소식 · 온라인정책 · 변곡점 · 캠페인" title="타임라인" />
      <section aria-label="타임라인" className="space-y-1.5 overflow-hidden rounded-xl bg-card p-3 ring-1 ring-primary/10 xl:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[12px] tabular-nums"><span className="text-muted-foreground">설정 기간</span> <span className="font-medium">{range.start} ~ {range.end}</span> <span className="text-muted-foreground">· {daysBetween(range.start,range.end)}일 · Ctrl+휠 확대 · 드래그 이동</span></p>
        <div className="ml-auto"><AnalysisRangeControl maxDate={today} range={range} onChange={selectRange}/></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup aria-label="차트 표시 사업" multiple size="sm" variant="outline" value={selectedBusinesses} onValueChange={setBusinesses}>{businesses.map(b=><ToggleGroupItem key={b.id} value={b.id} aria-label={`${b.name} 표시`} className="gap-1.5 text-xs"><svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke={b.color} strokeWidth="2.5"/></svg>{b.name}</ToggleGroupItem>)}</ToggleGroup>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke="currentColor" strokeWidth="2.5"/></svg>{annual?"누적":"일별"} 실적<svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4"/></svg>{annual?"누적":"일"} 목표</span>
        <EventTypeLegend split pivot workspace="온라인정책"/>
        <div className="ml-auto flex items-center gap-1.5"><Button size="sm" variant={annual?"ghost":"secondary"} aria-pressed={!annual} onClick={()=>setAnnual(false)}>일별 가입</Button><Button size="sm" variant={annual?"secondary":"ghost"} aria-pressed={annual} onClick={()=>setAnnual(true)}>연간 누적</Button><AnnualTargetEditor year={range.end.slice(0,4)} targets={targets} onSave={v=>{setTargets(v);setAnnual(true);}} /></div>
      </div>
      {!selectedBusinesses.length&&<p className="p-6 text-center text-sm text-muted-foreground">표시할 사업을 선택해 주세요.</p>}
      {!!selectedBusinesses.length && <div>
        {<div ref={chartRef} className={`select-none ${dragging?"cursor-grabbing":"cursor-grab"}`} style={{touchAction:"pan-y"}} role="img" aria-label="AIR TDS MVNO 사업별 회선 비교 차트"><ChartContainer className="mars-home-timeline w-full flex-none aspect-auto" config={Object.fromEntries(businesses.map(b=>[b.id,{label:b.name,color:b.color}]))}><LineChart data={chartRows} margin={{left:2,right:24,top:LANE_TOP+lanes.length*LANE+12,bottom:0}}>
        <g className="fill-muted-foreground text-[11px] font-medium" pointerEvents="none" aria-hidden="true">{lanes.map((lane,index)=><g key={lane.id}><text x={4} y={LANE_TOP+index*LANE+17}>{lane.label}</text><line x1={2} x2="100%" y1={LANE_TOP+(index+1)*LANE} y2={LANE_TOP+(index+1)*LANE} stroke="var(--muted-foreground)" strokeOpacity={0.35}/></g>)}</g>
        {laneGroups.flatMap(lane=>lane.clusters.map(({date,items})=><ReferenceLine key={`${lane.id}:${date}:${range.start}:${range.end}`} x={date} stroke={lane.id==="campaign"?"none":lane.color} strokeDasharray="3 4" strokeOpacity={0.65} label={<TimelineMarker date={date} items={items} lane={lane.label} laneIndex={lane.index} color={clusterColor(lane,items)} onActive={items=>{setActiveItems(items);if(lane.id==="pivot")setActivePivot(items);}} highlight={lane.id!=="pivot" && lane.id!=="campaign" && !!activePivot?.some(p=>items.some(m=>(m.business===p.business||m.business==="market")&&m.date<=p.date&&m.end>=dayShift(p.date,-7)))}/>}/>))}
        {today>=displayRange.start&&today<=displayRange.end&&<ReferenceLine x={today} ifOverflow="extendDomain" zIndex={3000} shape={(p:{x1?:number;x2?:number;y2?:number})=><TodayLine x={p.x1??0} bottom={p.y2??0} label={`오늘 ${today.slice(5)}`}/>}/>}
        {activePeriod&&<ReferenceArea x1={activePeriod.start<displayRange.start?displayRange.start:activePeriod.start} x2={activePeriod.end>displayRange.end?displayRange.end:activePeriod.end} fill="var(--primary)" fillOpacity={0.1}/>}
<CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" strokeOpacity={0.5}/><XAxis axisLine={false} tickLine={false} tickMargin={10} dataKey="key" tickFormatter={v=>String(v).slice(5)} tick={{fontSize:11}} minTickGap={35}/><YAxis axisLine={false} tickLine={false} width={96} tickFormatter={v=>`${Number(v)>=10000?`${Math.round(Number(v)/10000)}만`:num(Number(v))}회선`} domain={[0,"auto"]} tick={{fontSize:11}}/><ReferenceArea x1={range.start} x2={range.end} fill="var(--primary)" fillOpacity={0.035}/><Tooltip active={dragging||activeItems?false:undefined} content={({active,payload,label})=>active&&payload?.length?<div className="min-w-52 space-y-2 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-lg"><p className="font-semibold">{label}</p>{businesses.filter(b=>selectedBusinesses.includes(b.id)).map(b=>{const row=payload[0]?.payload;return row?.[b.id]!=null?<div key={b.id} className="border-t pt-2"><p className="font-medium" style={{color:b.color}}>{b.name} · {annual?"연간 누적 ":""}{num(row[b.id])}회선</p>{row[`${b.id}Target`] && <p>{annual?"누적 목표":"일 목표"} {num(row[`${b.id}Target`])}회선 · 달성 {(row[b.id]/row[`${b.id}Target`]*100).toFixed(1)}%</p>}<p className="mt-1 text-muted-foreground">당일 매출 {num(row[`${b.id}Revenue`])}원 · 순익 {num(row[`${b.id}Profit`])}원</p></div>:null;})}</div>:null}/>{businesses.filter(b=>selectedBusinesses.includes(b.id)).map(b=><Line key={b.id} dataKey={b.id} name={b.name} stroke={b.color} strokeWidth={2.5} dot={false} activeDot={{r:4,fill:b.color,stroke:"var(--background)",strokeWidth:2}} connectNulls={false} isAnimationActive={false}/>)}{businesses.filter(b=>selectedBusinesses.includes(b.id)).map(b=><Line key={`${b.id}-target`} dataKey={`${b.id}Target`} name={`${b.name} 연간 목표`} stroke={b.color} strokeWidth={2} strokeOpacity={0.65} strokeDasharray="7 5" dot={false} activeDot={false} connectNulls={false} isAnimationActive={false} />)}</LineChart></ChartContainer></div>}
      </div>}
      <fieldset aria-label="전체 기간 탐색" className="border-t pt-2">
        <div className="h-9 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={overview} margin={{top:0,right:8,bottom:0,left:8}}>
          <Brush dataKey="key" height={32} y={2} startIndex={Math.max(0,overview.findIndex(r=>r.key===range.start))} endIndex={Math.max(0,overview.findIndex(r=>r.key===range.end))} travellerWidth={8} fill="var(--muted)" stroke="var(--muted-foreground)" ariaLabel="조회 기간 선택" onChange={({startIndex,endIndex})=>{if(startIndex===undefined||endIndex===undefined)return;const next={start:overview[startIndex].key,end:overview[endIndex].key};if(next.start!==range.start||next.end!==range.end)setRange(next);}}>
            <LineChart>{businesses.filter(b=>selectedBusinesses.includes(b.id)).map(b=><Line key={b.id} dataKey={b.id} stroke={b.color} strokeWidth={1} dot={false} isAnimationActive={false}/>)}</LineChart>
          </Brush>
        </LineChart></ResponsiveContainer></div>
      </fieldset>
      </section>
    </RefreshingAnalysis>
  </div>;
}

function TimelineMarker({date,items,lane,laneIndex,color,viewBox,highlight=false,onActive}:{date:string;items:Marker[];lane:string;laneIndex:number;color:string;viewBox?:{x?:number;y?:number};highlight?:boolean;onActive:(items:Marker[]|null)=>void}) {
 const [open,setOpen]=useState(false);
 const router=useRouter();
 const kind=items[0].kind;
 const latestPivot=[...items].sort((a,b)=>b.date.localeCompare(a.date))[0];
 const change=latestPivot.change;
 const direction=kind==="pivot"?(change===undefined?"증감 미확인":change>0?"회선 증가":change<0?"회선 감소":"회선 변화 없음"):"";
 if(viewBox?.x===undefined)return null;
 return <foreignObject x={viewBox.x-10.5} y={20.5+laneIndex*26} width={38} height={26} style={{overflow:"visible"}}>
  <div onPointerMove={e=>e.stopPropagation()}>
  <Popover open={open} onOpenChange={value=>{setOpen(value);onActive(value?items:null);}}>
   <PopoverTrigger openOnHover delay={100} closeDelay={180} onClick={()=>{if(items.length===1)router.push(items[0].href);}} aria-label={`${date} ${lane} ${items.length}건 ${direction}`.trim()} title={highlight?"변곡 직전 7일 안의 원인 후보":undefined} className={`relative flex size-[21px] items-center justify-center rounded-md border-0 text-[10px] font-bold hover:brightness-110 focus-visible:outline-2 focus-visible:outline-ring ${highlight?"ring-2 ring-amber-400 ring-offset-2 ring-offset-background":""}`} style={{background:color,color:kind==="experiment"?"black":"white"}}>
    <TimelineMarkerIcon kind={kind} change={change}/>
    {items.length>1&&<span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-foreground bg-white px-0.5 text-[10px] font-bold text-black">{items.length}</span>}
   </PopoverTrigger>
   <PopoverPortal><PopoverPositioner side="top" align="start" sideOffset={10} collisionAvoidance={{side:"none",align:"shift",fallbackAxisSide:"none"}} className="z-50"><PopoverPopup className="w-[340px] max-w-[calc(100vw-2rem)] rounded-lg border bg-popover p-0 text-left text-popover-foreground shadow-lg" onPointerMove={e=>e.stopPropagation()}><PopoverArrow className="data-[side=top]:-bottom-2 data-[side=top]:rotate-180"/>
    <div className="border-b bg-muted/30 px-3.5 py-2.5"><PopoverTitle className="text-[11px]">{lane} · {date} · {items.length}건{direction?` · ${direction}`:""}</PopoverTitle></div>
    <div className="max-h-56 space-y-3 overflow-y-auto overscroll-contain p-3.5">{kind==="pivot"&&<p className="text-[10px] text-muted-foreground">강조된 항목은 변곡 직전 7일 안에 들어온 원인 후보입니다.</p>}{items.slice(0,3).map(m=><article key={m.id} className="space-y-1 border-b pb-2 text-[11px] last:border-0 last:pb-0"><div className="flex items-start justify-between gap-2"><h3 className="line-clamp-2 font-medium">{m.title}</h3>{m.category&&<span className="shrink-0 text-[10px] text-muted-foreground">{m.category.split(" · ")[0]}</span>}</div><p className="text-muted-foreground">{m.business==="market"?"시장":m.business.toUpperCase()} · {m.date} ~ {m.end}</p><p className="line-clamp-2 text-muted-foreground">{m.summary}</p><div className="flex justify-end"><RecordMenu label={m.title} actions={[{label:"상세보기",href:m.href}]}/></div></article>)}{items.length>3&&<details className="text-[11px]"><summary className="cursor-pointer text-muted-foreground">외 {items.length-3}건 보기</summary>{items.slice(3).map(m=><Link key={m.id} href={m.href} className="mt-2 block hover:underline">{m.title} →</Link>)}</details>}</div>
   </PopoverPopup></PopoverPositioner></PopoverPortal>
  </Popover>
  </div>
 </foreignObject>;
}
