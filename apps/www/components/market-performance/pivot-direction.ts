import { MIN_DATE, MAX_DATE, buildPerformance } from "./data";
import { channelPerformance } from "./channel-scope";
export function pivotCustomerChange(date:string,channel?:string):number|undefined {
 const previous=new Date(Date.parse(date)-86400000).toISOString().slice(0,10);
 if(previous<MIN_DATE||date>MAX_DATE)return undefined;
 const range={start:previous,end:date};
 const rows=channel?channelPerformance(range,channel,"day"):buildPerformance(range,"day");
 if(rows.length!==2)return undefined;
 return rows[1].customers-rows[0].customers;
}
