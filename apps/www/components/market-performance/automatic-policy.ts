import type { Focus } from "./analysis-preferences";
import { scopedPerformance } from "./channel-data";
import type { MarketEvent, Range } from "./data";
export const PRIORITY_LABELS: Record<Focus,string> = {growth:"회선 성장", retention:"이탈 방어", profit:"수익성"};
export function proposePolicy(range: Range, channels: string[], priorities: Focus[], events: MarketEvent[], pivots: string[]) {
  const rows=scopedPerformance(range,channels);
  const sum=(key: "customers"|"cancellations"|"revenue"|"netProfit")=>rows.reduce((n,r)=>n+r[key],0);
  const churn=sum("customers") ? sum("cancellations")/sum("customers") : 0;
  const margin=sum("revenue") ? sum("netProfit")/sum("revenue") : 0;
  const security=events.some(e=>/보안|해킹|유출/.test(`${e.title} ${e.summary}`));
  const competition=events.some(e=>e.types.includes("price"));
  const weight=(focus: Focus)=>[1,.6,.3][priorities.indexOf(focus)] ?? .3;
  const cautious=margin<.15 || priorities[1]==="profit";
  const first=priorities[0];
  const pricePct=first==="growth" && !security ? (cautious ? -3 : competition ? -7 : -5) : 0;
  const title=security ? "고객 보호·유지 혜택" : first==="growth" ? "가입 전환 가격 개선" : first==="retention" ? "30일 유지 보상" : "고비용 혜택 효율화";
  const prompt=security ? "요금은 유지하고 고객 보호 안내와 30일 유지 시 포인트 3,000원을 제공해 해지 방어를 검증합니다." : first==="growth" ? `월 요금을 ${Math.abs(pricePct)}% 인하하고 동일 상품·채널의 가입 전환과 순익을 비교합니다.` : first==="retention" ? "요금은 유지하고 30일 유지 시 포인트 3,000원을 제공해 조기 해지를 줄입니다." : "요금은 유지하고 중복 프로모션 지급을 정리해 변동비를 3% 절감하는 운영안을 검증합니다.";
  const demandPct=Math.round((first==="growth"?8:2)*weight("growth")+(pivots.length?1:0));
  const cancellationPct=-Math.round((churn>.15?8:5)*weight("retention")+(security?2:0));
  const reason=`${range.start} ~ ${range.end} · ${channels.join(", ")||"전체 채널"} · 이벤트 ${events.length}건 · 변곡점 ${pivots.length}건. 가입 대비 해지 ${(churn*100).toFixed(1)}%, 순익률 ${(margin*100).toFixed(1)}%. 우선순위: ${priorities.map(p=>PRIORITY_LABELS[p]).join(" → ")}. ${security?"보안 관련 이벤트에 따라 유지 혜택을 우선 검토합니다.":competition?"가격 변경 이벤트를 반영합니다.":"기간 실적과 우선순위에 따라 정책을 구성합니다."} 반응률과 비용은 검증 전 시뮬레이션 가정입니다.`;
  return {title,prompt,reason,pricePct,demandPct,cancellationPct,variableCostPct:first==="profit"?-3:0,dailyCost:first==="retention"||security?Math.round(sum("customers")/Math.max(1,rows.length)*3000*.1):0};
}
