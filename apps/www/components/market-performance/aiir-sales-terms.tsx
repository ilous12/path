"use client";
import type { SalesMetricSchema } from "./sales-metric-schema";
import { DynamicSalesTermsEditor } from "./dynamic-sales-terms-editor";
import catalog from "./fixtures/plan-catalog.json";
export type AiirSalesTerms = {
  metricSchema?: SalesMetricSchema;
  costPrice?: number | null; priceAdjustment?: number;
  metricValues?: Record<string,string|number>;
  benefitCosts?: Record<string,{monthlyCost:number|null;months:number}>;
  productId?: string; observedAt?: string;
  offerId: string; planName: string; sourceUrl: string; sourceChannel: string;
  channel: string; baselinePrice: number; monthlyPrice: number;
  points: number; pointMonths: number; pointCondition: string;
  specialPoints: number; specialCondition: string;
  eligibilityPct: number;
};
export const offers = catalog.offers.filter(o => o.sourceId.startsWith("aiir-") && o.monthlyBilledKrw !== null);
export function initialAiirTerms(): AiirSalesTerms {
 const o=offers[0]; return {productId:o.productId,observedAt:o.observedAt,offerId:o.offerId,planName:o.name,sourceUrl:o.sourceUrl,sourceChannel:o.channel,channel:o.channel==="OFFICIAL"?"WEB":o.channel,baselinePrice:o.monthlyBilledKrw!,monthlyPrice:o.monthlyBilledKrw!,points:0,pointMonths:1,pointCondition:"매월 회선 유지",specialPoints:0,specialCondition:"개통 완료 시 1회",eligibilityPct:10};
}
export const aiirTermsSummary=(v:AiirSalesTerms)=>v.metricSchema?`${v.planName} · ${v.metricSchema.metrics.map(m=>`${m.label}: ${m.key==="monthlyPrice"?`${v.monthlyPrice}원 (원가 ${v.costPrice??"미지정"}원 + ${v.priceAdjustment??0}원)`:m.effect==="builtin"?v[m.key as keyof AiirSalesTerms]:v.metricValues?.[m.key]??"미지정"}`).join(" · ")}`:`${v.planName} · ${v.channel} · 월 ${v.monthlyPrice.toLocaleString("ko-KR")}원 · 월 ${v.points.toLocaleString("ko-KR")}P × ${v.pointMonths}개월 (${v.pointCondition}) · 특별 ${v.specialPoints.toLocaleString("ko-KR")}P (${v.specialCondition})`;
export function AiirSalesTermsEditor({value:v,onChange,channels=[]}:{value:AiirSalesTerms;onChange:(v:AiirSalesTerms)=>void;channels?:string[]}) {
 if(v.metricSchema)return <DynamicSalesTermsEditor value={v} onChange={onChange}/>;
 const select="h-10 w-full min-w-0 rounded-lg border bg-background px-3 text-sm";
 const numeric=(key:"monthlyPrice"|"points"|"pointMonths"|"specialPoints"|"eligibilityPct",label:string,options:number[],suffix:string)=><label className="grid gap-2 text-sm">{label}<select aria-label={label} className={select} value={v[key]} onChange={e=>onChange({...v,[key]:Number(e.target.value)})}>{[...new Set([...options,v[key]])].sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n.toLocaleString("ko-KR")}{suffix}</option>)}</select></label>;
 const pointTotal=v.points*v.pointMonths+v.specialPoints;
 return <section className="space-y-4 rounded-xl border bg-card p-4"><div><h3 className="font-semibold">AIIR · 요금제 판매조건</h3><p className="mt-1 text-xs text-muted-foreground">개별 요금제와 적용 채널의 가격·포인트를 설정하세요. 수집 가격은 비교 기준이며 기존 포인트 조건은 원문에서 확인하세요.</p></div><div className="grid gap-4 sm:grid-cols-2">
 <label className="grid gap-2 text-sm">요금제 · 기준 판매조건<select aria-label="요금제 · 기준 판매조건" className={select} value={v.offerId} onChange={e=>{const o=offers.find(p=>p.offerId===e.target.value)!;onChange({...v,productId:o.productId,observedAt:o.observedAt,offerId:o.offerId,planName:o.name,sourceUrl:o.sourceUrl,sourceChannel:o.channel,baselinePrice:o.monthlyBilledKrw!,monthlyPrice:o.monthlyBilledKrw!,channel:o.channel==="OFFICIAL"?v.channel:o.channel});}}>{offers.map(o=><option key={o.offerId} value={o.offerId}>{o.name} · {o.channel} · {o.monthlyBilledKrw?.toLocaleString("ko-KR")}원</option>)}</select></label>
 <label className="grid gap-2 text-sm">적용 채널<select aria-label="적용 채널" className={select} value={v.channel} onChange={e=>onChange({...v,channel:e.target.value})}>{[...new Set(["APP","WEB","KAKAOPAY","TOSS","MOYO","제휴몰","기타",...channels,v.channel])].map(c=><option key={c}>{c}</option>)}</select></label>
 {numeric("monthlyPrice","월 판매가격",[...[-20,-15,-10,-5,0,5,10].map(p=>Math.round(v.baselinePrice*(1+p/100)/100)*100),9900,14900,19900,24900,29900],"원")}
 {numeric("points","매월 지급 포인트",[0,1000,2000,3000,5000,10000,15000,20000],"P")}
 {numeric("pointMonths","포인트 지급기간",[1,2,3,6,12,24],"개월")}
 <label className="grid gap-2 text-sm">정기 포인트 지급조건<select aria-label="정기 포인트 지급조건" className={select} value={v.pointCondition} onChange={e=>onChange({...v,pointCondition:e.target.value})}>{["매월 회선 유지","매월 요금 납부 완료","번호이동 후 매월 유지","채널 결제수단 연결·매월 유지"].map(c=><option key={c}>{c}</option>)}</select></label>
 {numeric("specialPoints","특별포인트 · 1회",[0,3000,5000,10000,20000,30000,50000],"P")}
 <label className="grid gap-2 text-sm">특별포인트 지급조건<select aria-label="특별포인트 지급조건" className={select} value={v.specialCondition} onChange={e=>onChange({...v,specialCondition:e.target.value})}>{["개통 완료 시 1회","30일 유지 시 1회","90일 유지 시 1회","번호이동·30일 유지 시 1회"].map(c=><option key={c}>{c}</option>)}</select></label>
 {numeric("eligibilityPct","채널 내 적용 대상 비중 · 예측 가정",[1,5,10,20,30,50,75,100],"%")}
 </div><div className="rounded-lg bg-muted/40 p-3 text-sm leading-6"><p>기준 월 {v.baselinePrice.toLocaleString("ko-KR")}원 → 월 {v.monthlyPrice.toLocaleString("ko-KR")}원 ({((v.monthlyPrice/v.baselinePrice-1)*100).toFixed(1)}%)</p><p>1인당 최대 포인트 {pointTotal.toLocaleString("ko-KR")}P · {v.pointMonths}개월 평균 혜택 차감가 {Math.round(v.monthlyPrice-pointTotal/v.pointMonths).toLocaleString("ko-KR")}원/월</p><p className="mt-2 text-xs text-muted-foreground">전원 조건 충족·1P=1원 가정입니다. 최대 혜택 기준이며 실제 청구액이나 실현 마진이 아닙니다. 순익 예측은 대상 신규 회선의 최대 포인트 총액을 가입 시점 비용으로 충당합니다. 실제 지급일 현금흐름이 아닙니다. 채널 예측은 대상 비중을 적용한 가정이며 요금제별 관측 실적과는 구분됩니다.</p><a className="text-xs text-primary underline" href={v.sourceUrl} target="_blank" rel="noreferrer">기준 요금제 출처</a></div></section>;
}
