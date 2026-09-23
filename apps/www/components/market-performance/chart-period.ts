import { MIN_DATE, MAX_DATE, daysBetween, type Range } from "./data";
const shift=(date:string,days:number)=>new Date(Date.parse(`${date}T00:00:00Z`)+days*86400000).toISOString().slice(0,10);
const monthShift=(date:string,n:number)=>{
 const d=new Date(`${date}T00:00:00Z`),day=d.getUTCDate();
 d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);
 const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
 d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);
};
/** Period scale is independent of daily/monthly aggregation. */
export function chartDisplayRange(range:Range):Range {
 const days=daysBetween(range.start,range.end);
 return days<=7?{start:shift(range.start,-3),end:shift(range.end,3)}:days<=62?{start:shift(range.start,-7),end:shift(range.end,7)}:{start:monthShift(range.start,-1),end:monthShift(range.end,1)};
}
export function chartPaddingLabel(range:Range) { const days=daysBetween(range.start,range.end);return days<=7?"앞뒤 3일":days<=62?"앞뒤 7일":"앞뒤 1개월"; }
/** Bound source reads, not the axis: future observation dates remain null. */
export function chartObservationRange(range:Range):Range {const display=chartDisplayRange(range);return {start:display.start<MIN_DATE?MIN_DATE:display.start,end:display.end>MAX_DATE?MAX_DATE:display.end};}
/** Display-only rows; never feed padded observations back into totals or training. */
export function withPeriodMargins(rows: object[], key: string, range?: Range, resolve?: (date:string)=>object|undefined): object[] {
 const dates=rows.map(row=>String((row as Record<string,unknown>)[key]??"")).filter(date=>/^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
 const start=range?.start??dates[0],end=range?.end??dates.at(-1);
 if(!start||!end||!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end)))return rows;
 const display=chartDisplayRange({start,end});
 const fields=[...new Set(rows.flatMap(row=>Object.keys(row)))];
 const blank=(date:string)=>({...Object.fromEntries(fields.map(field=>[field,null])),[key]:date});
 const byDay=new Map(rows.map(row=>[String((row as Record<string,unknown>)[key]),row]));
 const padded=[];
 for(let date=display.start;date<=display.end;date=shift(date,1))padded.push(byDay.get(date)??{...blank(date),...resolve?.(date),[key]:date});
 return padded;
}
