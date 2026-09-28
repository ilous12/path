export const SCENARIO_END = "2026-12-31";
// Fictional daily acquisition levels. These are scenario inputs, not forecasts.
export const YEAR_END_PIVOTS = [
  {workspace:"aiir",date:"2026-09-22",lines:410,churn:28,title:"가을 가입 혜택 확대"},
  {workspace:"aiir",date:"2026-10-05",lines:520,churn:30,title:"MOYO 실속 요금제 유입 증가"},
  {workspace:"aiir",date:"2026-10-19",lines:360,churn:58,title:"할인 종료 후 가입 둔화"},
  {workspace:"aiir",date:"2026-11-01",lines:480,churn:38,title:"추가 데이터 캠페인 반등"},
  {workspace:"aiir",date:"2026-11-16",lines:610,churn:35,title:"번호이동 기획전 성장"},
  {workspace:"aiir",date:"2026-12-01",lines:440,churn:22,title:"유입 정상화·유지 혜택으로 해지 감소"},
  {workspace:"aiir",date:"2026-12-15",lines:590,churn:27,title:"연말 순증 캠페인 회복"},
  {workspace:"tdds",date:"2026-09-22",lines:390,churn:55,title:"공식몰 가입 전환 개선"},
  {workspace:"tdds",date:"2026-10-05",lines:510,churn:52,title:"TOSS 번호이동 유입 확대"},
  {workspace:"tdds",date:"2026-10-19",lines:370,churn:67,title:"플랫폼 혜택 종료 후 유입 감소"},
  {workspace:"tdds",date:"2026-11-01",lines:500,churn:48,title:"공식몰 가격 대응 반등"},
  {workspace:"tdds",date:"2026-11-16",lines:630,churn:46,title:"고용량 기획전 가입 증가"},
  {workspace:"tdds",date:"2026-12-01",lines:450,churn:30,title:"연말 유지 프로그램·판매 정상화"},
  {workspace:"tdds",date:"2026-12-15",lines:610,churn:37,title:"온라인 연말 프로모션 성장"},
] as const;

export function yearEndDaily(date:string,workspace:string) {
  if(date>SCENARIO_END)return null;
  const point=YEAR_END_PIVOTS.findLast(p=>p.workspace===workspace&&p.date<=date);
  if(!point)return null;
  const day=Math.round((Date.parse(date)-Date.parse(point.date))/86400000);
  const customers=point.lines+Math.round(Math.sin(day*.65)*12+day*.8);
  const cancellations=Math.min(customers-1,point.churn+Math.round(Math.sin(day*.47)*3));
  const revenue=customers*(workspace==="aiir"?7250:9500);
  const expenses=Math.round(revenue*(workspace==="aiir"?.74:.77));
  return {customers,cancellations,revenue,expenses,netProfit:revenue-expenses,profitMargin:(revenue-expenses)/revenue*100};
}
