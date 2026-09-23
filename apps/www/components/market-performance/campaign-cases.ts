import {initialAirTerms} from "./air-sales-terms";
import {applyMetricDefaults,normalizeSalesTerms,validateSalesMetrics} from "./sales-metric-values";
import type {SalesMetricSchema} from "./sales-metric-schema";
import type {PolicyRevision} from "./policy-group-model";
import type {PolicyAlternative} from "./alternative-model";
export const SALES_CASES=[{id:"kakaopay",title:"카카오페이 · 월 20,000원",channel:"KAKAOPAY",price:20000,points:0},{id:"toss",title:"토스 · 월 18,000원",channel:"TOSS",price:18000,points:0},{id:"naver",title:"네이버페이 포인트 10,000P",channel:"WEB",price:20000,points:10000}] as const;
export function createSalesCase(index:number,r:PolicyRevision,schema:SalesMetricSchema,workspace:string):PolicyAlternative {
 if(workspace!=="air")throw Error("요금제 사례는 AIR 기준입니다.");
 const example=SALES_CASES[index];let terms=applyMetricDefaults(initialAirTerms(),schema);
 const has=(key:string)=>schema.metrics.some(m=>m.key===key);
 if(!has("channel")||!has("monthlyPrice")||(example.points&&(!has("specialPoints")||!has("specialCondition")||!has("pointProvider"))))throw Error("이 사례에 필요한 메트릭이 최신 판매조건에서 허용되지 않습니다. 설정에서 기준을 확인하세요.");
 terms=normalizeSalesTerms({...terms,channel:example.channel,costPrice:15000,priceAdjustment:example.price-15000,specialPoints:example.points,metricValues:{...terms.metricValues,...(example.points?{pointProvider:"네이버페이 포인트"}:{})}});
 const error=validateSalesMetrics(terms);if(error)throw Error(error);
 return {id:`case-${crypto.randomUUID()}`,title:`${terms.planName} · ${example.title}`,type:"채널별 판매조건",description:`${example.title}. 원가 15,000원과 가격·보상은 작성 예시이며 실제 제휴 조건이 아닙니다.`,workspace,operator:workspace.toUpperCase(),channel:terms.channel,targetChannels:[terms.channel],salesTerms:terms,start:r.start,applyDays:Math.round((Date.parse(r.end)-Date.parse(r.start))/86400000)+1,days:Math.round((Date.parse(r.forecastEnd)-Date.parse(r.start))/86400000)+1,pricePct:(terms.monthlyPrice/terms.baselinePrice-1)*100,demandPct:0,cancellationPct:0,variableCostPct:0,dailyCost:0,oneTimeCost:0,status:"draft",createdAt:new Date().toISOString(),history:[],forecastMethod:r.method};
}
