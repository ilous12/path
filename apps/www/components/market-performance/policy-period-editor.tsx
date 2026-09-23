"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MIN_DATE, MAX_DATE, daysBetween } from "./data";
import { dayShift } from "./alternative-model";
import { scopedPerformance } from "./channel-data";
export type PolicyPeriod = {start:string;applyEnd:string;forecastEnd:string};
const valid=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s));
const minStart=dayShift(MIN_DATE,1),maxStart=dayShift(MAX_DATE,90);
const clamp=(s:string,min:string,max:string)=>s<min?min:s>max?max:s;
export function PolicyPeriodEditor({value,onChange,channels}:{value:PolicyPeriod;onChange:(value:PolicyPeriod)=>void;channels?:string[]}) {
 const [window,setWindow]=useState(()=>({start:dayShift(valid(value.start)?value.start:MAX_DATE,-7),end:dayShift(valid(value.forecastEnd)?value.forecastEnd:MAX_DATE,7)}));
 const svg=useRef<SVGSVGElement>(null);
 const drag=useRef<{kind:keyof PolicyPeriod|"move";x:number;value:PolicyPeriod;window:typeof window}|null>(null);
 const [moving,setMoving]=useState(false);
 const current=useRef(value);current.current=value;
 useEffect(()=>{if(!drag.current&&valid(value.start)&&valid(value.applyEnd)&&valid(value.forecastEnd))setWindow({start:dayShift(value.start,-7),end:dayShift(value.applyEnd>value.forecastEnd?value.applyEnd:value.forecastEnd,7)});},[value.start,value.applyEnd,value.forecastEnd,moving]);
 const span=Math.max(1,daysBetween(window.start,window.end)-1);
 const x=(date:string)=>34+(Date.parse(date)-Date.parse(window.start))/86400000/span*832;
 const rows=useMemo(()=>scopedPerformance({start:window.start<MIN_DATE?MIN_DATE:window.start,end:window.end>MAX_DATE?MAX_DATE:window.end},channels),[window,channels]);
 const maximum=Math.max(1,...rows.map(r=>r.customers));
 const path=rows.map((r,i)=>`${i?'L':'M'}${x(r.key)},${168-r.customers/maximum*64}`).join(' ');
 function shifted(original:PolicyPeriod,offset:number){const start=clamp(dayShift(original.start,offset),minStart,maxStart);const delta=daysBetween(original.start,start)-1;return {start,applyEnd:valid(original.applyEnd)?dayShift(original.applyEnd,delta):start,forecastEnd:valid(original.forecastEnd)?dayShift(original.forecastEnd,delta):start};}
 function update(kind:keyof PolicyPeriod,date:string){if(!valid(date)){onChange({...value,[kind]:date});return;}if(kind==='start'&&valid(value.start))onChange(shifted(value,daysBetween(value.start,date)-1));else onChange({...value,[kind]:date});}
 function move(event:React.PointerEvent<SVGSVGElement>){const d=drag.current;if(!d||!svg.current)return;const width=svg.current.getBoundingClientRect().width*832/900;const delta=Math.round((event.clientX-d.x)/width*(daysBetween(d.window.start,d.window.end)-1));if(d.kind==='move'||d.kind==='start')onChange(shifted(d.value,delta));else onChange({...d.value,[d.kind]:clamp(dayShift(d.value[d.kind],delta),d.value.start,dayShift(d.value.start,89))});}
 const finish=()=>{drag.current=null;setMoving(false);};
 const labels={start:'정책 시작일',applyEnd:'정책 종료일',forecastEnd:'예측 종료일'};
 return <section aria-label="정책 기간 설정" className="space-y-4 rounded-xl border bg-card p-4">
  <div className="grid gap-3 sm:grid-cols-3">{(Object.keys(labels) as (keyof PolicyPeriod)[]).map(key=><label key={key} className="grid gap-2 text-xs font-medium">{labels[key]}<Input type="date" aria-label={labels[key]} value={value[key]} min={key==='start'?minStart:value.start} max={key==='start'?maxStart:valid(value.start)?dayShift(value.start,89):undefined} onChange={e=>update(key,e.target.value)}/></label>)}</div>
  <p className="text-xs text-muted-foreground">아래 핸들을 드래그해 날짜를 조정하세요. 적용 영역을 끌면 전체 기간이 함께 이동합니다. 적용·예측 기간은 각각 최대 90일입니다.</p>
  {valid(value.start)&&valid(value.applyEnd)&&valid(value.forecastEnd)&&<svg ref={svg} viewBox="0 0 900 202" className="w-full touch-none select-none overflow-visible rounded-lg bg-muted/20" aria-label="정책 적용·예측 기간 드래그 차트" onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}>
   {[0,1,2,3,4].map(i=>{const date=dayShift(window.start,Math.round(span*i/4));return <g key={i}><line x1={x(date)} x2={x(date)} y1={25} y2={178} stroke="var(--border)"/><text x={x(date)} y={194} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">{date}</text></g>;})}
   <path d={path} fill="none" stroke="var(--color-blue-500)" strokeWidth={2}/>
   <text x={42} y={159} fontSize={11} fill="var(--muted-foreground)">회선 관측</text>
   <rect x={x(value.start)} y={32} width={Math.max(4,x(value.forecastEnd)-x(value.start))} height={142} fill="var(--color-violet-500)" fillOpacity={0.06}/>
   <rect aria-label="적용 기간 이동" x={x(value.start)} y={56} width={Math.max(10,x(value.applyEnd)-x(value.start))} height={32} rx={5} fill="var(--color-amber-400)" fillOpacity={0.4} className="cursor-grab" onPointerDown={e=>{e.preventDefault();drag.current={kind:'move',x:e.clientX,value:{...value},window};setMoving(true);svg.current?.setPointerCapture(e.pointerId);}}/>
   {(Object.keys(labels) as (keyof PolicyPeriod)[]).map((key,i)=><g key={key} role="slider" tabIndex={0} aria-label={`${labels[key]} 조정`} aria-valuemin={0} aria-valuemax={span} aria-valuenow={daysBetween(window.start,value[key])-1} aria-valuetext={value[key]} className="cursor-ew-resize outline-none focus:opacity-60" onPointerDown={e=>{e.preventDefault();drag.current={kind:key,x:e.clientX,value:{...value},window};setMoving(true);svg.current?.setPointerCapture(e.pointerId);}} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const n=e.key==='ArrowLeft'?-1:1;key==='start'?onChange(shifted(value,n)):update(key,clamp(dayShift(value[key],n),value.start,dayShift(value.start,89)));}}}>
    <line x1={x(value[key])} x2={x(value[key])} y1={30} y2={177} stroke={i===2?'var(--color-violet-500)':'var(--color-amber-500)'} strokeDasharray={i===2?'5 4':undefined}/><rect x={x(value[key])-7} y={i===2?30:59} width={14} height={26} rx={5} fill={i===2?'var(--color-violet-500)':'var(--color-amber-500)'}/><text x={x(value[key])} y={i===0?16:i===1?106:24} textAnchor="middle" fontSize={11} fill="var(--foreground)">{labels[key]} {value[key].slice(5)}</text>
   </g>)}
  </svg>}
 </section>;
}
