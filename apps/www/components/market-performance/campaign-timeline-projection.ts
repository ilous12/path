import { MAX_DATE } from "./data";
import { dayShift, type PolicyAlternative } from "./alternative-model";
import { buildHomePerformance, type HomeBusiness } from "./home-performance";
import { experimentChartData, type ExperimentChartMetric } from "./experiment-chart-data";

/** Lift channel forecasts onto the workspace series, holding unaffected channels
 * at the anchor level. Keep channel-level detail forecasts unchanged. */
export function campaignTimelineProjection(a:PolicyAlternative, metric:ExperimentChartMetric="customers") {
  const chart=experimentChartData(a,metric);
  const workspace:HomeBusiness=a.workspace==="tdds"?"tdds":a.workspace==="mvvno"?"mvvno":"aiir";
  const anchorDate=dayShift(a.start,-1)<MAX_DATE?dayShift(a.start,-1):MAX_DATE;
  const anchor=buildHomePerformance({start:anchorDate,end:anchorDate},workspace)[0];
  if(!anchor)return chart;
  const channelAnchor=chart.rows.find(r=>r.date===anchorDate)?.observed
    ?? chart.rows.find(r=>r.date>=a.start&&r.reference!==null)?.reference;
  if(channelAnchor==null)return chart;
  const baseline=anchor[metric];
  const offset=baseline-channelAnchor;
  const byDate=new Map(chart.rows.map(r=>[r.date,r]));
  const rows=[];
  for(let date=anchorDate;date<=chart.end;date=dayShift(date,1)) {
    const original=byDate.get(date);
    const future=date>=a.start;
    const forecast=date===anchorDate||!future?baseline:original?.forecast==null?null:Math.max(0,original.forecast+offset);
    rows.push({date,observed:date===anchorDate?baseline:null,forecast,reference:date===anchorDate||!future?baseline:original?.reference==null?null:Math.max(0,original.reference+offset)});
  }
  const last=rows.at(-1)?.forecast??baseline;
  return {...chart,rows,start:anchorDate,baseline,last,growthPct:baseline?(last/baseline-1)*100:null};
}
