import { policyObservations } from "./policy-group-projection";
import { scopedPerformance } from "./channel-data";
import { chartObservationRange, withPeriodMargins } from "./chart-period";
import type { Range } from "./data";
/** Observation context only: forecast horizon and model training remain unchanged. */
export function forecastChartMargins(rows: object[], key: string, metric: "customers"|"cancellations"|"revenue"|"netProfit", field = "observed", channels?: string[], range?:Range, workspace?:string) {
 const dates=rows.map(r=>String((r as Record<string,unknown>)[key])).sort();
 const period=range??{start:dates[0],end:dates.at(-1)!};
 if(!period.start||!period.end)return rows;
 const observed=new Map((workspace ? policyObservations(chartObservationRange(period),workspace,channels) : scopedPerformance(chartObservationRange(period),channels)).map(r=>[r.key,r[metric]]));
 const padded=withPeriodMargins(rows,key,period);
 return padded.map(r=>({...r,[field]:observed.get(String((r as Record<string,unknown>)[key]))??null}));
}
