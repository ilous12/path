import { type PlanOffer, isAir } from "./plan-market-model";
export type PriceBasis = "bill" | "effective";
export const planPrice=(p:PlanOffer,basis:PriceBasis)=>basis==="bill"?p.monthlyBilledKrw:p.displayedEffectiveKrw;
const higher=(a:number,b:number)=>a===0&&b===0?50:50+50*(a-b)/Math.max(Math.abs(a),Math.abs(b));
export function similarPlan(a:PlanOffer,b:PlanOffer) {
  if(isAir(b)||a.network!==b.network||a.unlimitedData!==b.unlimitedData)return false;
  if((a.dailyDataGb??0)!==(b.dailyDataGb??0))return false;
  if(a.unlimitedData)return true;
  return a.monthlyDataGb!==null&&b.monthlyDataGb!==null&&Math.abs(a.monthlyDataGb-b.monthlyDataGb)<=Math.max(2,a.monthlyDataGb*.25);
}
/** Transparent relative utility, NOT a trained AI model or conversion probability. */
export function competitiveness(a:PlanOffer,b:PlanOffer,basis:PriceBasis) {
 const ap=planPrice(a,basis),bp=planPrice(b,basis);
 const dataScore=a.unlimitedData&&b.unlimitedData?50:a.unlimitedData?100:b.unlimitedData?0:a.monthlyDataGb!==null&&b.monthlyDataGb!==null?higher(a.monthlyDataGb,b.monthlyDataGb):null;
 const voiceScore=a.voiceUnlimited&&b.voiceUnlimited?50:a.voiceUnlimited?100:b.voiceUnlimited?0:a.voiceMinutes!==null&&b.voiceMinutes!==null?higher(a.voiceMinutes,b.voiceMinutes):null;
 const components=[{key:"price",label:"가격",weight:50,score:ap!==null&&bp!==null?higher(bp,ap):null},{key:"data",label:"월 기본 데이터",weight:25,score:dataScore},{key:"qos",label:"소진 후 속도",weight:15,score:a.qosKbps!==null&&b.qosKbps!==null?higher(a.qosKbps,b.qosKbps):null},{key:"voice",label:"통화",weight:10,score:voiceScore}];
 const known=components.filter(c=>c.score!==null);const coverage=known.reduce((s,c)=>s+c.weight,0);
 // Price is required; missing prices must never make a plan look free or competitive.
 return {score:ap===null||bp===null?null:Math.round(known.reduce((s,c)=>s+c.score!*c.weight,0)/coverage*10)/10,coverage,components};
}
