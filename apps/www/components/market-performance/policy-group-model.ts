import { metricBenefits } from "./sales-metric-values";
import { dayShift, validateAlternative, type PolicyAlternative } from "./alternative-model";
import { MAX_DATE, MIN_DATE } from "./data";
import { CHANNELS } from "./channel-data";
import type { ForecastMethod } from "./forecast";

export type PolicyChange =
  | { kind: "price"; before: number; after: number; unit: "KRW" }
  | { kind: "points"; amount: number; months: number; condition: string; provider?: string; unit: "P" }
  | { kind: "special-points"; amount: number; condition: string; provider?: string; unit: "P" }
  | { kind: "benefit"; description: string; monthlyCost: number | null; months?: number };
export type SubPolicy = {
  id: string; revision: number; title: string; state: "draft" | "ready";
  origin: "direct" | "prompt" | "ai" | "legacy"; enabled: boolean;
  target: { productId?: string; offerId: string; channels: string[]; customer: "all" | "new" | "mnp"; sharePct: number };
  changes: PolicyChange[];
  stacking: "exclusive" | "combine";
  period?: { start: string; end: string };
  source: PolicyAlternative;
  inputSnapshot?: PolicyAlternative; // Original completed input; editing source never overwrites this snapshot.
};
export type PolicyRevision = {
  id: string; number: number; status: "draft" | "registered";
  name: string; objective: string; priorities: string[];
  start: string; end: string; forecastEnd: string;
  startAt: string; endAt: string; forecastEndAt: string; timezone: "Asia/Seoul";
  brief?: { owner: string; hypothesis: string; metric: "customers" | "cancellations" | "netProfit"; targetPct: number | null };
  items: SubPolicy[]; method: ForecastMethod; createdAt: string;
};
export type GroupProjectionRow = { key: string; customers: number; cancellations: number; revenue: number; netProfit: number; customersDelta: number; cancellationsDelta: number; revenueDelta: number; netProfitDelta: number; baseRevenue: number; baseProfit: number; rewardProvision?: number; remainingRewards?: number };
export type PolicySimulation = { id: string; revisionId: string; inputHash: string; createdAt: string; asOf: string; dataVersion: string; method: ForecastMethod; rows: GroupProjectionRow[] };
export type PolicyExecution = { id: string; revisionId: string; simulationId: string; at: string; stoppedAt?: string; reason?: string; externalStatus: "not_connected" };
export type PolicyGroup = { id: string; workspace: string; createdAt: string; version: number; isNew?: boolean; legacyId?: string; revisions: PolicyRevision[]; simulations: PolicySimulation[]; executions: PolicyExecution[]; history: { at: string; action: string }[] };
export type PolicyComposition = { workspace: string; revision: PolicyRevision; baselineOnly?: boolean };
export const DATA_VERSION = "mars-synthetic-performance-v2";
export const isoNow = () => new Date().toISOString();
export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
export const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
export const latestRevision = (p: PolicyGroup) => p.revisions[p.revisions.length - 1];
export function executionStatus(p: PolicyGroup, today = new Date().toLocaleDateString("sv-SE", {timeZone: "Asia/Seoul"})) {
  const execution = p.executions.at(-1);
  if (!execution) return latestRevision(p).status;
  if (execution.stoppedAt) return "stopped";
  const revision = p.revisions.find(r => r.id === execution.revisionId)!;
  return today < revision.start ? "scheduled" : today > revision.end ? "completed" : "active";
}
export function syncPeriod(r: PolicyRevision): PolicyRevision {
  return {...r, startAt: `${r.start}T00:00:00+09:00`, endAt: `${dayShift(r.end, 1)}T00:00:00+09:00`, forecastEndAt: `${dayShift(r.forecastEnd, 1)}T00:00:00+09:00`};
}
export function emptyRevision(name: string, start = MAX_DATE): PolicyRevision {
  return syncPeriod({ id: uid("revision"), number: 1, status: "draft", name, objective: "회선 성장과 수익성 개선", priorities: ["growth", "profit", "retention"], start, end: dayShift(start, 6), forecastEnd: dayShift(start, 29), startAt: "", endAt: "", forecastEndAt: "", timezone: "Asia/Seoul", items: [], method: "damped", createdAt: isoNow() });
}
export function subPolicyFromAlternative(source: PolicyAlternative, origin: SubPolicy["origin"] = "legacy"): SubPolicy {
  const t = source.salesTerms;
  const changes: PolicyChange[] = [];
  if (t) {
    if (t.monthlyPrice !== t.baselinePrice) changes.push({kind:"price",before:t.baselinePrice,after:t.monthlyPrice,unit:"KRW"});
    if (t.points) changes.push({kind:"points",amount:t.points,months:t.pointMonths,condition:t.pointCondition,provider:String(t.metricValues?.pointProvider??"자사 포인트"),unit:"P"});
    if (t.specialPoints) changes.push({kind:"special-points",amount:t.specialPoints,condition:t.specialCondition,provider:String(t.metricValues?.pointProvider??"자사 포인트"),unit:"P"});
  }
  if(t?.metricSchema) changes.push(...metricBenefits(t));
  if (!t?.metricSchema && (source.requirements?.benefits || source.requirements?.freeOffers)) changes.push({kind:"benefit",description:[source.requirements.benefits,source.requirements.freeOffers].filter(Boolean).join(" · "),monthlyCost:null});
  return {id: uid("sub"), revision:1, title:source.title,state:origin!=="legacy"&&changes.some(c=>c.kind==="benefit"&&c.monthlyCost===null)?"draft":"ready",origin,enabled:true,target:{productId:t?.productId,offerId:t?.offerId ?? "ALL",channels:t?[t.channel]:source.targetChannels ?? [],customer:"all",sharePct:t?.eligibilityPct ?? 100},changes,stacking:"exclusive",source:clone(source),inputSnapshot:clone(source)};
}
export function migrateAlternative(a: PolicyAlternative): PolicyGroup {
  const r = syncPeriod({...emptyRevision(a.title,a.start), id:`revision-${a.id}-1`, status:a.status === "draft"?"draft":"registered",end:dayShift(a.start,(a.applyDays ?? a.days)-1),forecastEnd:dayShift(a.start,Math.max(a.days,a.applyDays??a.days)-1),method:a.forecastMethod??"average",items:[subPolicyFromAlternative(a)],objective:a.description});
  return {id:a.id,legacyId:a.id,workspace:a.workspace??"air",createdAt:a.createdAt,version:1,isNew:a.isNew,revisions:[r],simulations:[],executions:a.status === "draft"?[]:[{id:`execution-${a.id}`,revisionId:r.id,simulationId:"legacy",at:a.createdAt,...(a.status === "paused"?{stoppedAt:a.createdAt}:{}),externalStatus:"not_connected"}],history:[...a.history,{at:isoNow(),action:"v1 정책을 캠페인 1개·판매정책 1개로 이전"}]};
}
export function policyHash(r: PolicyRevision) {
  // Exact canonical input, rather than a lossy/non-cryptographic hash. No secrets in local policy inputs.
  return JSON.stringify({data:DATA_VERSION,revision:r});
}
export function overlap(a: SubPolicy,b: SubPolicy,r: PolicyRevision,s: PolicyRevision=r) {
  const channels = !a.target.channels.length || !b.target.channels.length || a.target.channels.some(c=>b.target.channels.includes(c));
  const product = a.target.offerId === "ALL" || b.target.offerId === "ALL" || (a.target.productId??a.target.offerId) === (b.target.productId??b.target.offerId);
  const customer = a.target.customer === "all" || b.target.customer === "all" || a.target.customer === b.target.customer;
  return channels && product && customer && (a.period?.start??r.start) <= (b.period?.end??s.end) && (b.period?.start??s.start) <= (a.period?.end??r.end);
}
export function validateGroup(r: PolicyRevision): string[] {
  const errors: string[]=[];
  const date=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
  if (!r.name.trim() || !r.objective.trim()) errors.push("정책 이름과 목적을 입력하세요.");
  if (![r.start,r.end,r.forecastEnd].every(date) || r.start<=MIN_DATE || r.start>dayShift(MAX_DATE,90) || r.end<r.start || r.forecastEnd<r.end || r.forecastEnd>dayShift(r.start,89)) errors.push("시작·종료·예측 종료 순서를 확인하세요. 예측은 최대 90일입니다.");
  if(r.brief && ((r.brief.targetPct !== null && (!Number.isFinite(r.brief.targetPct) || r.brief.targetPct < 0 || r.brief.targetPct > 100)) || !["customers","cancellations","netProfit"].includes(r.brief.metric))) errors.push("성과 목표의 지표와 변화율(0~100%)을 확인하세요.");
  if(new Set(r.items.map(i=>i.id)).size!==r.items.length)errors.push("판매정책 식별자가 중복되었습니다.");
  const items=r.items.filter(i=>i.enabled);
  if (!items.length) errors.push("완료한 판매정책을 하나 이상 포함하세요.");
  for(const item of items){
    if(item.changes.some(c=>c.kind==="price"?(!Number.isFinite(c.before)||c.before<0||!Number.isFinite(c.after)||c.after<0):c.kind==="points"?(!Number.isFinite(c.amount)||c.amount<0||!Number.isInteger(c.months)||c.months<1):c.kind==="special-points"?(!Number.isFinite(c.amount)||c.amount<0):(c.monthlyCost!==null&&(!Number.isFinite(c.monthlyCost)||c.monthlyCost<0))))errors.push(`${item.title}: 가격·포인트·혜택 원가의 수치를 확인하세요.`);
    if(!item.title.trim())errors.push("판매정책 이름을 입력하세요.");
    if(item.state!=="ready")errors.push(`${item.title}: 판매정책을 완료하세요.`);
    if(validateAlternative(item.source))errors.push(`${item.title}: 판매조건과 예측 가정을 확인하세요.`);
    if(!Number.isFinite(item.target.sharePct)||item.target.sharePct<=0||item.target.sharePct>100)errors.push(`${item.title}: 대상 비중은 0 초과 100% 이하입니다.`);
    if(item.target.channels.some(c=>!CHANNELS.some(known=>known.id===c)))errors.push(`${item.title}: 채널 실적 연결이 필요합니다.`);
    if(item.period&&(!date(item.period.start)||!date(item.period.end)||item.period.start<r.start||item.period.end>r.end||item.period.end<item.period.start))errors.push(`${item.title}: 개별 적용 기간은 캠페인 안에 있어야 합니다.`);
    if(item.origin!=="legacy"&&item.changes.some(c=>c.kind==="benefit"&&c.monthlyCost===null))errors.push(`${item.title}: 추가 혜택의 월 원가를 확인하세요.`);
  }
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
    const a=items[i],b=items[j];if(!overlap(a,b,r))continue;
    const prices=[...a.changes,...b.changes].filter(c=>c.kind==="price");
    if(a.source.salesTerms&&b.source.salesTerms&&a.source.salesTerms.baselinePrice!==b.source.salesTerms.baselinePrice)errors.push(`${a.title} / ${b.title}: 기준 판매가격 스냅샷이 다릅니다. 같은 기준 오퍼를 선택하세요.`);
    if(prices.length>1&&new Set(prices.map(c=>c.after)).size>1)errors.push(`${a.title} / ${b.title}: 동일 대상의 판매가격이 충돌합니다.`);
    if(a.stacking!=="combine"||b.stacking!=="combine")errors.push(`${a.title} / ${b.title}: 대상 중복입니다. 동시 적용을 명시하거나 하나를 제외하세요.`);
    if(a.target.offerId!==b.target.offerId||a.target.customer!==b.target.customer||JSON.stringify([...a.target.channels].sort())!==JSON.stringify([...b.target.channels].sort())||a.target.sharePct!==b.target.sharePct)errors.push(`${a.title} / ${b.title}: 중첩 대상의 상품·고객·채널·비중을 같게 맞추거나 대상을 분리하세요.`);
  }
  for(const channel of CHANNELS){
    for(const customer of ["new","mnp"]){
      const shares=new Map<string,number>();
      for(const item of items.filter(i=>(!i.target.channels.length||i.target.channels.includes(channel.id))&&(i.target.customer==="all"||i.target.customer===customer)))shares.set(item.target.offerId,Math.max(shares.get(item.target.offerId)??0,item.target.sharePct));
      if([...shares.values()].reduce((a,b)=>a+b,0)>100)errors.push(`${channel.id}: 상품별 대상 비중 합계가 100%를 초과합니다.`);
    }
  }
  return [...new Set(errors)];
}
export function groupAlternative(p: PolicyGroup, revision?: PolicyRevision): PolicyAlternative {
  const active=p.executions.at(-1);
  const r=revision??(active&&!active.stoppedAt?p.revisions.find(r=>r.id===active.revisionId)!:latestRevision(p));
  const enabled=r.items.filter(i=>i.enabled);
  const channels=enabled.some(i=>!i.target.channels.length)?[]:[...new Set(enabled.flatMap(i=>i.target.channels))];
  const first=enabled[0]?.source;
  const saved=p.simulations.findLast(run=>run.revisionId===r.id&&run.inputHash===policyHash(r));
  return {id:p.id,title:r.name,type:"복합 정책",description:`${r.objective}\n판매정책 ${enabled.length}개 · ${enabled.map(i=>i.title).join(" / ")}`,workspace:p.workspace,operator:p.workspace.toUpperCase(),channel:channels.join(", ")||"전체",targetChannels:channels,start:r.start,days:Math.round((Date.parse(r.forecastEnd)-Date.parse(r.start))/86400000)+1,applyDays:Math.round((Date.parse(r.end)-Date.parse(r.start))/86400000)+1,pricePct:0,demandPct:0,variableCostPct:0,dailyCost:0,oneTimeCost:0,status:active&&!active.stoppedAt?"applied":active?.stoppedAt?"paused":"draft",createdAt:p.createdAt,history:p.history,isNew:p.isNew,forecastMethod:r.method,analysisContext:first?.analysisContext,composition:{workspace:p.workspace,revision:r},policyProjection:saved?{method:saved.method,channels,rows:saved.rows}:undefined,policyRevisionId:r.id,subPolicyCount:enabled.length};
}
