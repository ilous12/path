import type {AirSalesTerms} from "./air-sales-terms";
import {validateMetrics,type SalesMetricSchema} from "./sales-metric-schema";
export function applyMetricDefaults(terms:AirSalesTerms,schema:SalesMetricSchema):AirSalesTerms {
 const result={...terms,metricSchema:JSON.parse(JSON.stringify(schema)),metricValues:{},benefitCosts:{},costPrice:null,priceAdjustment:0} as AirSalesTerms;
 for(const m of schema.metrics){
  if(m.effect==="builtin"&&m.key!=="monthlyPrice") (result as unknown as Record<string,unknown>)[m.key]=m.options.includes(terms[m.key as keyof AirSalesTerms] as never)?terms[m.key as keyof AirSalesTerms]:m.options[0];
  else if(m.key==="monthlyPrice")result.priceAdjustment=m.options.includes(0)?0:Number(m.options[0]);
  else result.metricValues![m.key]=m.options[0];
 }
 return normalizeSalesTerms(result);
}
export function normalizeSalesTerms(v:AirSalesTerms):AirSalesTerms {
 if(!v.metricSchema)return v;
 const keys=new Set(v.metricSchema.metrics.map(m=>m.key));
 return {...v,monthlyPrice:keys.has("monthlyPrice")&&v.costPrice!=null?Math.max(0,v.costPrice+(v.priceAdjustment??0)):v.baselinePrice,
 points:keys.has("points")?v.points:0,pointMonths:keys.has("pointMonths")?v.pointMonths:1,pointCondition:keys.has("pointCondition")?v.pointCondition:"미적용",
 specialPoints:keys.has("specialPoints")?v.specialPoints:0,specialCondition:keys.has("specialCondition")?v.specialCondition:"미적용",
 metricValues:Object.fromEntries(Object.entries(v.metricValues??{}).filter(([k])=>keys.has(k))),benefitCosts:Object.fromEntries(Object.entries(v.benefitCosts??{}).filter(([k])=>keys.has(k)))};
}
export function validateSalesMetrics(v:AirSalesTerms):string|null {
 if(!v.metricSchema)return null;
 try{validateMetrics(v.metricSchema.metrics);}catch(e){return String(e);}
 for(const m of v.metricSchema.metrics){
  const val=m.key==="monthlyPrice"?v.priceAdjustment:m.effect==="builtin"?v[m.key as keyof AirSalesTerms]:v.metricValues?.[m.key];
  if(!m.options.includes(val as never))return `${m.label}: 적용된 판매조건의 선택값을 사용하세요.`;
  if(m.key==="monthlyPrice"&&(v.costPrice==null||!Number.isFinite(v.costPrice)||v.costPrice<0||v.costPrice+Number(val)<0))return "월 판매가격 계산에 사용할 원가와 조정 금액을 확인하세요.";
  if(m.effect==="benefit-cost"&&val!=="없음"&&val!==0){const cost=v.benefitCosts?.[m.key];if(!cost||cost.monthlyCost===null||!Number.isFinite(cost.monthlyCost)||cost.monthlyCost<0||!Number.isInteger(cost.months)||cost.months<1||cost.months>24)return `${m.label}: 제공기간과 월 원가를 확인하세요.`;}
 }
 const clean=normalizeSalesTerms(v);
 for(const key of ["monthlyPrice","points","pointMonths","pointCondition","specialPoints","specialCondition"] as const)if(clean[key]!==v[key])return "판매조건 프롬프트에 없는 항목 또는 가격 계산을 확인하세요.";
 if(Object.keys(v.metricValues??{}).some(key=>!v.metricSchema!.metrics.some(m=>m.key===key)))return "현재 판매조건에 없는 메트릭이 포함되어 있습니다.";
 return null;
}
export function metricBenefits(v:AirSalesTerms){return v.metricSchema?.metrics.filter(m=>m.effect==="benefit-cost"&&v.metricValues?.[m.key]!=="없음"&&v.metricValues?.[m.key]!==0).map(m=>({kind:"benefit" as const,description:`${m.label}: ${v.metricValues?.[m.key]}`,monthlyCost:v.benefitCosts?.[m.key]?.monthlyCost??null,months:v.benefitCosts?.[m.key]?.months??1}))??[];}
