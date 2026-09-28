import { dayShift, projectAlternative, type PolicyAlternative } from "./alternative-model";
import { MAX_DATE, MIN_DATE, type Range } from "./data";
import { CHANNELS, scopedPerformance } from "./channel-data";
import { buildHomePerformance } from "./home-performance";
import { projectSeries } from "./forecast";
import type { GroupProjectionRow, SubPolicy } from "./policy-group-model";

export function policyObservations(range: Range, workspace: string, channels?: string[]) {
  if (workspace === "aiir") return scopedPerformance(range, channels);
  const weight = channels?.length ? CHANNELS.filter(c=>channels.includes(c.id)).reduce((sum,c)=>sum+c.weight,0)/100 : 1;
  return buildHomePerformance(range,workspace === "tdds" ? "tdds" : "mvvno").map(row=>({...row,customers:Math.round(row.customers*weight),cancellations:Math.round(row.cancellations*weight),revenue:Math.round(row.revenue*weight),expenses:Math.round(row.expenses*weight),netProfit:Math.round(row.netProfit*weight)}));
}

/** Baseline is counted once per channel/customer segment. Same-target changes compose
 * before response; the largest absolute response assumption wins (not a sum).
 * Product/channel allocation is an explicit scenario assumption, not measured mix. */
export function projectPolicyGroup(a: PolicyAlternative): GroupProjectionRow[] {
  const {revision:r,workspace,baselineOnly}=a.composition!;
  const legacy = r.items.length === 1 ? r.items[0] : undefined;
  if (legacy?.origin === "legacy" && legacy.revision === 1 && legacy.source.demoCustomerForecast && JSON.stringify(a.targetChannels??[]) === JSON.stringify(legacy.source.targetChannels??[]) && r.start === legacy.source.start && a.days === legacy.source.days && !baselineOnly && (a.forecastMethod ?? "average") === (legacy.source.forecastMethod ?? "average")) {
    return projectAlternative({...legacy.source, targetChannels:a.targetChannels, composition:undefined});
  }
  const end=r.start>MAX_DATE?MAX_DATE:dayShift(r.start,-1);
  const start=dayShift(end,-27)<MIN_DATE?MIN_DATE:dayShift(end,-27);
  const horizon=a.days;
  const gap=Math.max(0,Math.round((Date.parse(r.start)-Date.parse(end))/86400000)-1);
  const channels=a.targetChannels?.length?CHANNELS.filter(c=>a.targetChannels!.includes(c.id)):CHANNELS;
  const totals: GroupProjectionRow[]=Array.from({length:horizon},(_,i)=>({key:dayShift(r.start,i),customers:0,cancellations:0,revenue:0,netProfit:0,customersDelta:0,cancellationsDelta:0,revenueDelta:0,netProfitDelta:0,baseRevenue:0,baseProfit:0,rewardProvision:0,remainingRewards:0}));
  const obligations:{date:string;amount:number}[]=[];
  for(const channel of channels){
    const history=workspace==="aiir"?scopedPerformance({start,end},[channel.id]):buildHomePerformance({start,end},workspace==="tdds"?"tdds":"mvvno").map(row=>({...row,customers:row.customers*channel.weight/100,cancellations:row.cancellations*channel.weight/100,revenue:row.revenue*channel.weight/100,expenses:row.expenses*channel.weight/100}));
    if(!history.length)continue;
    const forecast=(key:"customers"|"cancellations"|"revenue"|"expenses")=>projectSeries(history.map(row=>row[key]),a.forecastMethod??r.method,horizon+gap).slice(gap).map(n=>Math.max(0,n));
    const customerBase=forecast("customers"),cancelBase=forecast("cancellations"),revenueBase=forecast("revenue"),costBase=forecast("expenses");
    totals.forEach((row,i)=>{
      const baseCustomers=customerBase[i],baseCancels=cancelBase[i],baseRevenue=revenueBase[i],baseCost=costBase[i];
      let customers=baseCustomers,cancellations=baseCancels,revenue=baseRevenue,expenses=baseCost,rewards=0;
      const active=baselineOnly?[]:r.items.filter(item=>item.enabled&&item.state==="ready"&&(!item.target.channels.length||item.target.channels.includes(channel.id))&&row.key>=(item.period?.start??r.start)&&row.key<=(item.period?.end??r.end));
      for(const customer of ["new","mnp"] as const){
        const customerShare=customer==="new"?channel.newShare:1-channel.newShare;
        const groups=new Map<string,SubPolicy[]>();
        for(const item of active.filter(item=>item.target.customer==="all"||item.target.customer===customer))groups.set(item.target.offerId,[...(groups.get(item.target.offerId)??[]),item]);
        for(const items of groups.values()){
          const share=items[0].target.sharePct/100*customerShare;
          const largest=(key:"demandPct"|"cancellationPct"|"variableCostPct")=>items.map(item=>item.source[key]??0).sort((x,y)=>Math.abs(y)-Math.abs(x))[0]??0;
          const response=1+largest("demandPct")/100;
          const changes=items.flatMap(item=>item.changes);
          const priceChange=changes.find(change=>change.kind==="price");
          const pricePct=priceChange?.kind==="price"?(priceChange.after/priceChange.before-1)*100:items.find(item=>!item.source.salesTerms)?.source.pricePct??0;
          const targetCustomers=baseCustomers*share*response;
          customers+=targetCustomers-baseCustomers*share;
          cancellations+=baseCancels*share*largest("cancellationPct")/100;
          revenue+=baseRevenue*share*(response*(1+pricePct/100)-1);
          expenses+=baseCost*share*(response*(1+largest("variableCostPct")/100)-1);
          for(const item of items){
            // Fixed policy costs split by channel and cohort, not charged repeatedly.
            const allocation=channel.weight/(item.target.channels.length?CHANNELS.filter(c=>item.target.channels.includes(c.id)).reduce((s,c)=>s+c.weight,0):100)*customerShare;
            expenses+=(item.source.dailyCost+(row.key===(item.period?.start??r.start)?item.source.oneTimeCost:0))*allocation;
            for(const change of item.changes){
              if(change.kind==="points")for(let month=1;month<=change.months;month++)obligations.push({date:dayShift(row.key,month*30),amount:targetCustomers*change.amount});
              if(change.kind==="special-points")obligations.push({date:dayShift(row.key,/90/.test(change.condition)?90:/30/.test(change.condition)?30:0),amount:targetCustomers*change.amount});
              if(change.kind==="benefit")expenses+=targetCustomers*(change.monthlyCost??0)*(change.months??1);
              if(change.kind==="points")rewards+=targetCustomers*change.amount*change.months;
              if(change.kind==="special-points")rewards+=targetCustomers*change.amount;
            }
          }
        }
      }
      expenses+=rewards;
      row.customers+=customers;row.cancellations+=Math.max(0,Math.min(customers,cancellations));row.revenue+=revenue;row.netProfit+=revenue-expenses;
      row.customersDelta+=customers-baseCustomers;row.cancellationsDelta+=Math.max(0,Math.min(customers,cancellations))-baseCancels;row.revenueDelta+=revenue-baseRevenue;row.netProfitDelta+=revenue-expenses-(baseRevenue-baseCost);row.baseRevenue+=baseRevenue;row.baseProfit+=baseRevenue-baseCost;row.rewardProvision!+=rewards;
    });
  }
  const remaining=obligations.filter(o=>o.date>r.forecastEnd).reduce((sum,o)=>sum+o.amount,0);
  return totals.map((row,i)=>Object.fromEntries(Object.entries({...row,remainingRewards:i===totals.length-1?remaining:0}).map(([key,value])=>[key,typeof value==="number"?Math.round(value):value])) as GroupProjectionRow);
}
