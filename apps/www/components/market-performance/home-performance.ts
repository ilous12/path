import { buildPerformance, MIN_DATE, MAX_DATE, type Range } from "./data";
export type HomeBusiness = "air" | "tds" | "mvno";
/** Home comparison fixtures, not measured business performance or market-share estimates.
 * AIR retains the existing scenario. TDS/MVNO use independent deterministic
 * assumptions; these fixtures must be replaced by business-scoped source data.
 */
export function buildHomePerformance(range: Range, business: HomeBusiness) {
  const start = range.start < MIN_DATE ? MIN_DATE : range.start;
  const end = range.end > MAX_DATE ? MAX_DATE : range.end;
  if (start > end) return [];
  return buildPerformance({start,end}, "day").map(row => {
    if (business === "air") return row;
    const t = Math.round((Date.parse(row.key)-Date.parse("2026-09-01"))/86400000);
    const phase = business === "tds" ? 0 : 1.4;
    const baseline = business === "tds" ? 340 : 185;
    const shock = t >= 2 && t < 11 ? (business === "tds" ? 0.92 : 1.08) : 1;
    const recovery = Math.max(0,Math.min(9,t-10)) * (business === "tds" ? 4 : 2);
    const customers = Math.max(1,Math.round((baseline + Math.sin(t*.55+phase)*18)*shock+recovery));
    const cancellations = Math.round(customers*(business === "tds" ? .16 : .23));
    const revenue = customers*(business === "tds" ? 9500 : 6200);
    const expenses = Math.round(revenue*(business === "tds" ? .76 : .82));
    return {...row,customers,cancellations,revenue,expenses,netProfit:revenue-expenses,profitMargin:(revenue-expenses)/revenue*100};
  });
}

/** Retrospective statistical candidates; not AI-confirmed causal changes. */
export function homePivotCandidates(business: HomeBusiness) {
  const rows=buildHomePerformance({start:MIN_DATE,end:MAX_DATE},business);
  return rows.flatMap((row,index)=>{
    if(index<7)return [];
    const baseline=rows.slice(index-7,index).reduce((sum,r)=>sum+r.customers,0)/7;
    const delta=row.customers-baseline;
    const pct=baseline?delta/baseline*100:0;
    if(Math.abs(pct)<20 || Math.abs(delta)<30)return [];
    const previous=rows[index-1];
    const previousBase=index>7?rows.slice(index-8,index-1).reduce((sum,r)=>sum+r.customers,0)/7:baseline;
    if(Math.sign(previous.customers-previousBase)===Math.sign(delta)&&Math.abs((previous.customers-previousBase)/previousBase*100)>=20&&Math.abs(previous.customers-previousBase)>=30)return [];
    return [{date:row.key,baseline,actual:row.customers,pct,title:`${business.toUpperCase()} 회선 ${pct>0?"증가":"감소"} 변곡 후보`}];
  });
}
