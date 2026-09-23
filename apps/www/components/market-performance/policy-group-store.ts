"use client";
import { currentSalesSchema } from "./sales-metric-store";
import { useSyncExternalStore } from "react";
import seeds from "./fixtures/telecom-experiments.json";
import { normalizePresentation } from "./presentation-copy";
import { projectAlternative, validateAlternative, type PolicyAlternative } from "./alternative-model";
import { DATA_VERSION, clone, emptyRevision, groupAlternative, isoNow, latestRevision, migrateAlternative, overlap, policyHash, subPolicyFromAlternative, syncPeriod, uid, validateGroup, type PolicyGroup, type PolicyRevision, type SubPolicy } from "./policy-group-model";
import { MAX_DATE } from "./data";
type Store = { version:2; generation:number; policies:PolicyGroup[]; inbox:SubPolicy[] };
const key="mars-policy-groups-v2",legacyKey="mars-policy-alternatives-v1";
const empty:Store={version:2,generation:0,policies:[],inbox:[]};
let state=empty,initialized=false,error="";
const listeners=new Set<()=>void>();
const notify=()=>listeners.forEach(fn=>fn());
function validateStore(value: Store) {
 const invalidSub = (i: SubPolicy) => !i || !i.id || !["draft","ready"].includes(i.state) || !i.target || !Array.isArray(i.target.channels) || i.target.channels.some(c=>typeof c!=="string") || !["all","new","mnp"].includes(i.target.customer) || !Number.isFinite(i.target.sharePct) || !Array.isArray(i.changes) || i.changes.some(c=>!["price","points","special-points","benefit"].includes(c.kind)) || !i.source || Boolean(validateAlternative({...i.source,salesTerms:i.source.salesTerms?{...i.source.salesTerms,metricSchema:undefined}:undefined}));
 if(!value || value.version!==2 || !Array.isArray(value.policies) || !Array.isArray(value.inbox) || !Number.isInteger(value.generation) || value.inbox.some(invalidSub) || new Set(value.policies.map(p=>p.id)).size!==value.policies.length || value.policies.some(p=>!p.id || !Number.isInteger(p.version) || !Array.isArray(p.history) || !Array.isArray(p.revisions) || !p.revisions.length || !Array.isArray(p.executions) || !Array.isArray(p.simulations) || p.revisions.some(r=>!r.id || !["draft","registered"].includes(r.status) || !Array.isArray(r.items) || !r.start || !r.end || !r.forecastEnd || r.items.some(invalidSub)) || p.executions.some(e=>!p.revisions.some(r=>r.id===e.revisionId)))) throw Error("정책 저장 형식을 확인할 수 없습니다. 원본은 보존됩니다.");
}
function read(){
 try{
  const raw=localStorage.getItem(key);
  if(raw){const parsed=JSON.parse(raw);validateStore(parsed);state=parsed;error="";return;}
  const old=localStorage.getItem(legacyKey);
  let alternatives=normalizePresentation(seeds) as PolicyAlternative[];
  if(old){
   const parsed=JSON.parse(old);
   if(parsed.version!==1||!Array.isArray(parsed.alternatives)||parsed.alternatives.some((a:PolicyAlternative)=>!a?.id||!["draft","applied","paused"].includes(a.status)||!Array.isArray(a.history)||validateAlternative(a)))throw Error("기존 정책 데이터가 올바르지 않아 이전을 중단했습니다.");
   alternatives=[...parsed.alternatives,...alternatives.filter(a=>!parsed.alternatives.some((b:PolicyAlternative)=>a.id===b.id))];
   if(!localStorage.getItem(`${legacyKey}-backup`))localStorage.setItem(`${legacyKey}-backup`,old);
  }
  const next:Store={version:2,generation:1,policies:alternatives.map(migrateAlternative),inbox:[]};
  localStorage.setItem(key,JSON.stringify(next));state=next;error="";
 }catch(e){error=e instanceof Error?e.message:"정책 저장소 오류";state={...state};}
}
function subscribe(fn:()=>void){if(!initialized){initialized=true;read();window.addEventListener("storage",e=>{if(e.key===key){read();notify();}});}listeners.add(fn);return()=>{listeners.delete(fn);};}
function write(next:Store){
 if(error)throw Error(error);
 const current=localStorage.getItem(key);
 if(current&&JSON.parse(current).generation!==state.generation){read();notify();throw Error("다른 창에서 정책이 변경되었습니다. 최신 내용을 확인한 후 다시 저장하세요.");}
 const value={...next,generation:state.generation+1};localStorage.setItem(key,JSON.stringify(value));state=value;notify();
}
function update(id:string,fn:(p:PolicyGroup)=>PolicyGroup){const found=state.policies.find(p=>p.id===id);if(!found)throw Error("캠페인을 찾을 수 없습니다.");const changed=fn(clone(found));write({...state,policies:state.policies.map(p=>p.id===id?{...changed,version:found.version+1}:p)});return changed;}
function event(p:PolicyGroup,action:string){p.history.push({at:isoNow(),action});return p;}
function editable(p:PolicyGroup){let r=latestRevision(p);if(r.status!=="draft"){r={...clone(r),id:uid("revision"),number:r.number+1,status:"draft",createdAt:isoNow()};p.revisions.push(r);}return r;}
export function usePolicyGroups(){
 const snapshot=useSyncExternalStore(subscribe,()=>state,()=>empty);
 return {...snapshot,error,ready:initialized,
  create:(workspace:string,name:string,start=MAX_DATE)=>{
   if(!["air","tds","mvno"].includes(workspace))throw Error("AIR·TDS·MVNO 사업을 선택한 뒤 캠페인을 만드세요.");
   const id=uid("policy");const policy:PolicyGroup={id,workspace,version:1,createdAt:isoNow(),revisions:[emptyRevision(name,start)],executions:[],simulations:[],history:[{at:isoNow(),action:"캠페인 초안 생성"}]};write({...state,policies:[...state.policies,policy]});return id;
  },
  saveDraft:(id:string,r:PolicyRevision,expectedVersion:number)=>update(id,p=>{if(p.version!==expectedVersion)throw Error("정책이 변경되었습니다. 다시 열어주세요.");const draft=editable(p);Object.assign(draft,syncPeriod({...clone(r),id:draft.id,number:draft.number,status:"draft"}));return event(p,"캠페인 초안 저장");}),
  attach:(source:PolicyAlternative,parentId?:string,origin:SubPolicy["origin"]="direct")=>{
   if(!["air","tds","mvno"].includes(source.workspace??"air"))throw Error("AIR·TDS·MVNO 사업을 선택한 뒤 판매정책을 작성하세요.");
   if(source.composition)throw Error("캠페인은 구성 화면에서 새 버전으로 수정하세요.");
   if(origin!=="legacy"&&source.workspace==="air"&&(!source.salesTerms?.metricSchema||JSON.stringify(source.salesTerms.metricSchema)!==JSON.stringify(currentSalesSchema(source.workspace))))throw Error("판매조건 기준이 변경되었습니다. 등록 화면을 다시 열어 최신 메트릭으로 작성하세요.");
   const invalid=validateAlternative(source);if(invalid)throw Error(invalid);
   const sub=subPolicyFromAlternative(source,origin);
   if(parentId==="inbox"){write({...state,inbox:[...state.inbox,sub]});return "inbox";}
   if(parentId){update(parentId,p=>{if(p.workspace!==(source.workspace??"air"))throw Error("다른 사업의 캠페인에 반영할 수 없습니다.");editable(p).items.push(sub);return event(p,`판매정책 완료·반영: ${sub.title}`);});return parentId;}
   const p=migrateAlternative({...source,status:"draft"});p.legacyId=undefined;p.revisions[0].items=[sub];p.history=[{at:isoNow(),action:"판매정책에서 캠페인 초안 생성"}];write({...state,policies:[...state.policies,p]});return p.id;
  },
  attachInbox:(id:string,subId:string)=>{
   const sub=state.inbox.find(i=>i.id===subId);const policy=state.policies.find(p=>p.id===id);if(!sub||!policy)throw Error("판매정책을 찾을 수 없습니다.");if((sub.source.workspace??"air")!==policy.workspace)throw Error("사업을 확인하세요.");
   if(policy.workspace==="air"&&JSON.stringify(sub.source.salesTerms?.metricSchema)!==JSON.stringify(currentSalesSchema(policy.workspace)))throw Error("작업함 판매조건이 최신 기준과 다릅니다. 최신 메트릭으로 판매정책을 다시 작성하세요.");
   const p=clone(policy);editable(p).items.push({...clone(sub),id:uid("sub")});p.version++;event(p,`작업함 판매정책 반영: ${sub.title}`);write({...state,policies:state.policies.map(v=>v.id===id?p:v),inbox:state.inbox.filter(i=>i.id!==subId)});
  },
  newDraft:(id:string)=>update(id,p=>{editable(p);return event(p,"새 초안 버전 생성");}),
  simulate:(id:string)=>update(id,p=>{const r=latestRevision(p);const errors=validateGroup(r);if(errors.length)throw Error(errors.join("\n"));const a=groupAlternative(p,r);p.simulations.push({id:uid("simulation"),revisionId:r.id,inputHash:policyHash(r),createdAt:isoNow(),asOf:r.start<=MAX_DATE?new Date(Date.parse(r.start)-86400000).toISOString().slice(0,10):MAX_DATE,dataVersion:DATA_VERSION,method:r.method,rows:projectAlternative({...a,policyProjection:undefined})});return event(p,"그룹 시뮬레이션 저장");}),
  register:(id:string)=>update(id,p=>{const r=latestRevision(p);if(r.status==="registered")return p;const errors=validateGroup(r);if(errors.length)throw Error(errors.join("\n"));const run=p.simulations.findLast(s=>s.revisionId===r.id&&s.inputHash===policyHash(r));if(!run)throw Error("현재 구성으로 시뮬레이션을 먼저 저장하세요.");r.status="registered";run.inputHash=policyHash(r);return event(p,`v${r.number} 등록 · 구성 고정`);}),
  execute:(id:string)=>update(id,p=>{
   const r=latestRevision(p);if(p.executions.some(e=>e.revisionId===r.id&&!e.stoppedAt))return p;
   if(r.status!=="registered")throw Error("캠페인 등록 후 실행할 수 있습니다.");const errors=validateGroup(r);if(errors.length)throw Error(errors.join("\n"));
   const run=p.simulations.findLast(s=>s.revisionId===r.id&&s.inputHash===policyHash(r));if(!run)throw Error("시뮬레이션 결과가 현재 버전과 다릅니다.");
   for(const other of state.policies.filter(o=>o.id!==id&&o.workspace===p.workspace)){const execution=other.executions.at(-1);if(!execution||execution.stoppedAt)continue;const previous=other.revisions.find(v=>v.id===execution.revisionId)!;if(r.items.some(a=>a.enabled&&previous.items.some(b=>b.enabled&&overlap(a,b,r,previous))))throw Error(`실행 중인 ‘${previous.name}’과 적용 대상·기간이 중복됩니다. 기존 정책을 중지하거나 대상을 분리하세요.`);}
   const previous=p.executions.at(-1);if(previous&&!previous.stoppedAt){previous.stoppedAt=isoNow();previous.reason="새 버전 실행";}
   p.executions.push({id:uid("execution"),revisionId:r.id,simulationId:run.id,at:isoNow(),externalStatus:"not_connected"});p.isNew=true;return event(p,`v${r.number} MARS 실행 · 외부 판매 시스템 미연결`);
  }),
  stop:(id:string)=>update(id,p=>{const current=p.executions.at(-1);if(current&&!current.stoppedAt){current.stoppedAt=isoNow();current.reason="담당자 중지";}return event(p,"실행 중지 · 발생한 지급 의무는 유지");}),
  markSeen:(ids:string[])=>{if(!state.policies.some(p=>p.isNew&&ids.includes(p.id)))return;write({...state,policies:state.policies.map(p=>ids.includes(p.id)?{...p,isNew:false}:p)});},
 };
}
