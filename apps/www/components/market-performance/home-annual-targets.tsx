"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger, PopoverTitle } from "@/components/ui/popover";
import { buildHomePerformance, type HomeBusiness } from "./home-performance";
import salesTargets from "./fixtures/sales-targets.json";
export type AnnualTargets = Record<string, Partial<Record<HomeBusiness, number>>>;
const key = "mars-home-annual-targets-v1";
type TargetYear = Record<string, { annual: number; monthly: number[] }>;
const PRESET = salesTargets.targets as Record<string, TargetYear>;
/** Seasonal share of the annual target per month (sums to 1). */
export const MONTH_WEIGHTS: number[] = salesTargets.weights;
// Preset annual targets per business; saved annual settings take precedence.
const DEFAULT_TARGETS: AnnualTargets = Object.fromEntries(Object.entries(PRESET).map(([year, v]) => [year, Object.fromEntries(Object.entries(v).map(([id, t]) => [id, t.annual]))]));
export function useAnnualTargets() {
 const [targets,setTargets]=useState<AnnualTargets>(DEFAULT_TARGETS);
 useEffect(()=>{try{const v=JSON.parse(localStorage.getItem(key)||"{}");if(v&&typeof v==="object"&&!Array.isArray(v))setTargets({...DEFAULT_TARGETS,...v});}catch{}},[]);
 return [targets,(v:AnnualTargets)=>{setTargets(v);try{localStorage.setItem(key,JSON.stringify(v));}catch{}}] as const;
}
export function annualTarget(targets:AnnualTargets,year:string,id:HomeBusiness) {const n=targets[year]?.[id];return typeof n==="number"&&Number.isSafeInteger(n)&&n>0?n:null;}
/** Spread an annual target over 12 months by weight; the months sum exactly to the annual value. */
export function spreadAnnual(total: number) {
 const raw = MONTH_WEIGHTS.map(w => total * w);
 const base = raw.map(Math.floor);
 const rest = total - base.reduce((a, b) => a + b, 0);
 raw.map((v, i) => [v - base[i], i] as const).sort((a, b) => b[0] - a[0]).slice(0, rest).forEach(([, i]) => base[i]++);
 return base;
}
/** Monthly targets: the preset data when the annual value is unchanged, otherwise a fresh spread. */
export function monthlyTargets(targets: AnnualTargets, year: string, id: HomeBusiness) {
 const annual = annualTarget(targets, year, id);
 if (annual === null) return null;
 const preset = PRESET[year]?.[id];
 return preset && preset.annual === annual ? preset.monthly : spreadAnnual(annual);
}
const daysIn = (date: string) => new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).getUTCDate();
export function monthTarget(targets: AnnualTargets, date: string, id: HomeBusiness) {
 return monthlyTargets(targets, date.slice(0, 4), id)?.[Number(date.slice(5, 7)) - 1] ?? null;
}
export function dailyTarget(targets: AnnualTargets, date: string, id: HomeBusiness) {
 const month = monthTarget(targets, date, id);
 return month === null ? null : Math.round(month / daysIn(date));
}
/** Year-to-date target on a given day: past months in full plus the elapsed share of this month. */
export function cumulativeTarget(targets: AnnualTargets, date: string, id: HomeBusiness) {
 const months = monthlyTargets(targets, date.slice(0, 4), id);
 if (!months) return null;
 const m = Number(date.slice(5, 7)) - 1;
 return Math.round(months.slice(0, m).reduce((a, b) => a + b, 0) + months[m] * Number(date.slice(8, 10)) / daysIn(date));
}
export function cumulativeHomeLines(start:string,end:string,id:HomeBusiness) {
 const rows=buildHomePerformance({start:`${start.slice(0,4)}-01-01`,end},id);
 let year="",total=0;return new Map(rows.map(row=>{const y=row.key.slice(0,4);if(y!==year){year=y;total=0;}total+=row.customers;return [row.key,total];}));
}
export function AnnualTargetEditor({year,targets,onSave}:{year:string;targets:AnnualTargets;onSave:(v:AnnualTargets)=>void}) {
 const [open,setOpen]=useState(false),[draft,setDraft]=useState<Record<string,string>>({}),[error,setError]=useState("");
 return <Popover open={open} onOpenChange={value=>{setOpen(value);if(value){setError("");setDraft(Object.fromEntries(["air","tds","mvno"].map(id=>[id,String(annualTarget(targets,year,id as HomeBusiness)??"")])));}}}><PopoverTrigger render={<Button size="sm" variant="outline"/>}>연간 목표</PopoverTrigger><PopoverContent align="end" className="w-80 space-y-4 p-4"><PopoverTitle>{year}년 가입 회선 목표</PopoverTitle><p className="text-xs text-muted-foreground">연간 신규 가입 기준입니다. 월별 목표는 계절 가중치로 자동 배분합니다.</p>{["air","tds","mvno"].map(id=><label key={id} className="grid grid-cols-[60px_1fr] items-center gap-3 text-sm">{id.toUpperCase()}<Input aria-label={`${id.toUpperCase()} 연간 목표 회선`} type="number" min={1} step={1} placeholder="목표 회선수" value={draft[id]??""} onChange={e=>setDraft({...draft,[id]:e.target.value})}/></label>)}{error&&<p role="alert" className="text-xs text-destructive">{error}</p>}<Button size="sm" className="w-full" onClick={()=>{const entries=Object.entries(draft).filter(([,n])=>n.trim());if(entries.some(([,n])=>!Number.isSafeInteger(Number(n))||Number(n)<=0)){setError("목표는 1 이상 정수로 입력하세요.");return;}onSave({...targets,[year]:Object.fromEntries(entries.map(([id,n])=>[id,Number(n)]))});setOpen(false);}}>저장 · 목표 비교</Button></PopoverContent></Popover>;
}
