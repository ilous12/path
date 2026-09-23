"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WorkspaceHeader } from "./workspace-header";
import { PageEntry } from "./page-entry";
import { RecordMenu } from "./record-menu";
import { usePolicyGroups } from "./policy-group-store";
import { executionStatus, latestRevision } from "./policy-group-model";
const labels:Record<string,string>={draft:"초안",registered:"등록",scheduled:"예약",active:"실행",completed:"기간 종료",stopped:"중지"};
export function ExperimentSearch(){
 const workspace=useSearchParams().get("workspace")??"air";const router=useRouter();const store=usePolicyGroups();
 const [query,setQuery]=useState("");const [status,setStatus]=useState("all");const [channel,setChannel]=useState("all");const [page,setPage]=useState(0);const [error,setError]=useState("");
 const policies=store.policies.filter(p=>p.workspace===workspace);
 const rows=policies.filter(p=>{const r=latestRevision(p);return (status==="all"||executionStatus(p)===status)&&(channel==="all"||r.items.some(i=>!i.target.channels.length||i.target.channels.includes(channel)))&&`${r.name} ${r.objective} ${r.items.map(i=>i.title).join(" ")}`.toLowerCase().includes(query.toLowerCase());}).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 const pages=Math.max(1,Math.ceil(rows.length/10)),current=Math.min(page,pages-1);
 const href=(id:string)=>`/analysis?${new URLSearchParams({workspace,policy:id})}`;
 const create=()=>{try{const id=store.create(workspace,`${workspace.toUpperCase()} 새 캠페인`);router.push(href(id));}catch(e){setError(String(e));}};
 return <div className="space-y-6 pb-12"><WorkspaceHeader><div><h1>캠페인 검색</h1><p className="mt-2 text-sm text-muted-foreground">캠페인에 판매정책을 구성하고 시뮬레이션·등록·실행을 관리하세요.</p></div><Button size="icon-sm" variant="ghost" aria-label="캠페인 추가" title="캠페인 추가" onClick={create}><Plus className="size-4"/></Button></WorkspaceHeader><PageEntry>
 {(error||store.error)&&<p role="alert" className="text-sm text-destructive">{error||store.error}</p>}
 <section className="overflow-hidden rounded-xl border bg-card"><div className="flex flex-wrap gap-2 border-b p-4"><Input aria-label="캠페인 검색" className="min-w-48 flex-1" placeholder="캠페인·판매정책·목적 검색" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/><select aria-label="캠페인 상태" className="rounded-lg border bg-background px-3 text-sm" value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}><option value="all">모든 실행 상태</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><select aria-label="캠페인 채널" className="rounded-lg border bg-background px-3 text-sm" value={channel} onChange={e=>{setChannel(e.target.value);setPage(0);}}><option value="all">모든 채널</option>{[...new Set(policies.flatMap(p=>latestRevision(p).items.flatMap(i=>i.target.channels)))].map(c=><option key={c}>{c}</option>)}</select></div>
 <div className="overflow-x-auto"><table className="w-full min-w-[730px] text-left text-xs"><thead className="bg-muted/30"><tr>{["캠페인 · 판매정책","기간","작성 / 실행","채널",""] .map(v=><th key={v} className="p-4 font-medium">{v||<span className="sr-only">항목 메뉴</span>}</th>)}</tr></thead><tbody>{rows.slice(current*10,current*10+10).map(p=>{const r=latestRevision(p);return <tr key={p.id} className="border-t"><td className="max-w-md p-4"><p className="text-sm font-semibold">{r.name}</p><p className="mt-1 line-clamp-1 text-muted-foreground">{r.objective}</p><p className="mt-2 text-xs">판매정책 {r.items.length}개 · {r.items.filter(i=>i.state==="ready").length}개 완료 · v{r.number}</p></td><td className="whitespace-nowrap p-4">{r.start} ~ {r.end}<p className="mt-1 text-muted-foreground">예측 ~ {r.forecastEnd}</p></td><td className="p-4">{r.status==="draft"?"초안":"등록"}<p className="mt-1 text-muted-foreground">{labels[executionStatus(p)]}</p></td><td className="p-4">{r.items.some(i=>!i.target.channels.length)?"전체 채널":[...new Set(r.items.flatMap(i=>i.target.channels))].join(", ")||"미지정"}</td><td className="p-3"><RecordMenu label={r.name} actions={[{label:"캠페인 구성·분석",href:href(p.id)}]}/></td></tr>;})}</tbody></table></div>
 {!rows.length&&<p className="p-10 text-center text-sm text-muted-foreground">조건에 맞는 캠페인이 없습니다.</p>}
 <footer className="flex items-center justify-between border-t p-3 text-xs"><span>{rows.length}건 · 10개씩 표시</span><div className="flex items-center gap-2"><Button variant="ghost" size="sm" disabled={!current} onClick={()=>setPage(current-1)}>이전</Button>{current+1} / {pages}<Button variant="ghost" size="sm" disabled={current===pages-1} onClick={()=>setPage(current+1)}>다음</Button></div></footer></section>
 {store.inbox.some(i=>(i.source.workspace??"air")===workspace)&&<section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">미배정 판매정책 작업함</h2><p className="mt-2 text-sm text-muted-foreground">캠페인 구성 화면에서 아래 항목을 반영할 수 있습니다.</p>{store.inbox.filter(i=>(i.source.workspace??"air")===workspace).map(i=><p key={i.id} className="mt-3 border-t pt-3 text-sm">{i.title} · {i.state==="ready"?"완료":"작성 중"}</p>)}</section>}
 </PageEntry></div>;
}
