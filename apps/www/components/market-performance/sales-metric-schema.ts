export type SalesMetric = { key:string; label:string; type:"number"|"select"; unit:string; options:(string|number)[]; effect:"builtin"|"benefit-cost"|"description" };
export type SalesMetricSchema = { version:string; workspace:string; prompt:string; metrics:SalesMetric[]; analyzedBy:"rules"|"ai"; publishedAt:string };
export const METRICS:SalesMetric[] = [
 {key:"pointProvider",label:"포인트 지급처",type:"select",unit:"",options:["자사 포인트","네이버페이 포인트","카카오페이 포인트","토스 포인트"],effect:"description"},
 {key:"channel",label:"적용 채널",type:"select",unit:"",options:["APP","WEB","KAKAOPAY","TOSS","MOYO","제휴몰","기타"],effect:"builtin"},
 {key:"monthlyPrice",label:"월 판매가격 · 원가 대비 조정",type:"number",unit:"원",options:[-5000,-3000,-1000,0,1000,3000,5000,10000],effect:"builtin"},
 {key:"points",label:"매월 지급 포인트",type:"number",unit:"P",options:[0,1000,2000,3000,5000,10000,20000],effect:"builtin"},
 {key:"pointMonths",label:"포인트 지급기간",type:"number",unit:"개월",options:[1,2,3,6,12,24],effect:"builtin"},
 {key:"pointCondition",label:"장기 포인트 지급조건",type:"select",unit:"",options:["매월 회선 유지","매월 요금 납부 완료","번호이동 후 매월 유지","채널 결제수단 연결·매월 유지"],effect:"builtin"},
 {key:"specialPoints",label:"특별포인트 · 1회",type:"number",unit:"P",options:[0,3000,5000,10000,20000,30000,50000],effect:"builtin"},
 {key:"specialCondition",label:"특별포인트 · 1회 지급 조건",type:"select",unit:"",options:["개통 완료 시 1회","30일 유지 시 1회","90일 유지 시 1회","번호이동·30일 유지 시 1회"],effect:"builtin"},
 {key:"benefit",label:"부가서비스 무료 제공",type:"select",unit:"",options:["없음","YTPL 무료 제공"],effect:"benefit-cost"},
];
export const DEFAULT_SALES_PROMPT = "특정 요금제에 사용할 판매조건은 다음과 같습니다.\n"+METRICS.map(m=>`${m.label} | ${m.key} | ${m.type} | ${m.unit||"-"} | ${m.options.join(",")} | ${m.effect}`).join("\n");
export const defaultSalesSchema=(workspace:string):SalesMetricSchema=>({version:"sales-v1",workspace,prompt:DEFAULT_SALES_PROMPT,metrics:METRICS,analyzedBy:"rules",publishedAt:""});
export function validateMetrics(value:unknown):SalesMetric[] {
 if(!Array.isArray(value)||!value.length||value.length>30)throw Error("판매조건은 1~30개로 구성하세요.");
 const keys=new Set<string>();
 for(const m of value){
  if(!m||!/^([a-zA-Z][a-zA-Z0-9_]{0,39})$/.test(m.key)||["__proto__","constructor","prototype"].includes(m.key)||keys.has(m.key)||typeof m.label!=="string"||!m.label.trim()||m.label.length>100||!["number","select"].includes(m.type)||typeof m.unit!=="string"||m.unit.length>20||!["builtin","benefit-cost","description"].includes(m.effect)||!Array.isArray(m.options)||!m.options.length||m.options.length>50||m.options.some((v:unknown)=>m.type==="number"?typeof v!=="number"||!Number.isFinite(v):typeof v!=="string"||!v.trim()||v.length>150))throw Error("메트릭 이름·유형·선택값 형식을 확인하세요.");
  const known=METRICS.find(k=>k.key===m.key);
  if(known&&(m.type!==known.type||m.effect!==known.effect))throw Error(`${m.label}: 기본 메트릭의 유형·계산 연결은 변경할 수 없습니다.`);
  if(!known&&(!m.key.startsWith("custom_")||m.effect==="builtin"))throw Error("새 항목의 키는 custom_로 시작하고 혜택 원가 또는 설명으로 연결하세요.");
  if(m.type==="number"&&m.key!=="monthlyPrice"&&m.options.some((n:number)=>n<0))throw Error("포인트·기간은 음수일 수 없습니다.");
  if(m.key==="pointMonths"&&m.options.some((n:number)=>!Number.isInteger(n)||n<1||n>24))throw Error("포인트 지급기간은 1~24개월입니다.");
  keys.add(m.key);
 }
 if(keys.has("points")&&(!keys.has("pointMonths")||!keys.has("pointCondition")))throw Error("매월 포인트에는 지급기간·지급조건을 함께 지정하세요.");
 if(keys.has("specialPoints")&&!keys.has("specialCondition"))throw Error("특별포인트에는 지급조건을 함께 지정하세요.");
 return value;
}
export function analyzeSalesPrompt(prompt:string) {
 const metrics:SalesMetric[]=[];const unresolved:string[]=[];
 for(const line of prompt.split(/\n/).map(l=>l.trim()).filter(Boolean)){
  if(line.includes("|")){
   const [label,key,type,unit,options,effect]=line.split("|").map(v=>v.trim());
   metrics.push({label,key,type:type as SalesMetric["type"],unit:unit==="-"?"":unit,options:options?.split(",").map(v=>type==="number"?Number(v.trim()):v.trim())??[],effect:effect as SalesMetric["effect"]});
  }else if(!line.startsWith("특정 요금제에"))unresolved.push(line);
 }
 if(unresolved.length)throw Error("AI 분석 서버가 연결되지 않았습니다. 자유 문장 분석은 연결 후 사용할 수 있습니다. 현재는 ‘이름 | key | number/select | 단위 | 선택값 | 계산 연결’ 형식으로 입력하세요.");
 return validateMetrics(metrics);
}
