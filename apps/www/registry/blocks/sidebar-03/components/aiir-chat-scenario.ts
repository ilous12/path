export type ChatScenarioPoint = { cut: number; customers: number; revenue: number; profit: number };
export type ChatReply = { content: string; chart?: { kind: "aiir-price"; points: ChatScenarioPoint[] } };
/** Illustrative assumptions, not observed AIIR performance or a trained forecast. */
export const AIIR_PRICE_QUESTION = "AIIR 체감요금을 5%씩 줄인다면 어떻게 될지 시뮬레이션해줘";
const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;
export function aiirPriceScenario(): ChatReply[] {
  const basePrice = 20000, cost = 15000, lines = 1000;
  const baselineProfit = (basePrice - cost) * lines;
  const scenarios = [{ cut: 5, growth: 8 }, { cut: 10, growth: 13 }, { cut: 15, growth: 16 }].map(({ cut, growth }) => {
    const price = basePrice * (1 - cut / 100);
    const customers = Math.round(lines * (1 + growth / 100));
    const revenue = price * customers, profit = (price - cost) * customers;
    return { cut, growth, price, customers, revenue, profit, profitChange: (profit / baselineProfit - 1) * 100 };
  });
  const replies = [
    "먼저 결론부터 말씀드리면, 가입 회선은 늘어도 수익은 줄 수 있습니다. 5% 인하부터 작은 범위에서 검증하는 안을 우선 검토하겠습니다.\n\n‘5%씩’은 현재 체감요금 대비 5%·10%·15% 인하하는 세 대안으로 해석했습니다. 매월 반복 인하하는 조건은 아닙니다.",
    "이번 계산의 가정입니다.\n\nAIR 신규·번호이동 대상 대표 상품군을 가정하고, 기존 고객 요금은 유지합니다. 30일간 모집한 고객이 모두 한 달을 사용한 시점의 월 환산값을 비교합니다.\n\n• 기준 가입 1,000회선\n• 월 청구·체감요금 모두 20,000원\n• 회선당 월 변동원가 15,000원\n• 추가 포인트 없이 청구요금 직접 인하\n• 해지·채널 이동·경쟁사 대응은 고정\n\n실제 AIIR 요금·실적을 조회한 값이 아닌 예시 가정입니다. 아래 이익은 고정비·세금·추가 모집비 전 기여이익입니다.",
    `가격을 낮출수록 가입 반응은 늘지만 추가 효과는 둔화한다고 가정했습니다. 가입 증가율은 학습 모델의 예측이 아닌 시나리오 입력값입니다.\n\n현행 유지 · 월 ${won(basePrice)}\n가입 1,000회선 / 매출 ${won(basePrice * lines)} / 기여이익 ${won(baselineProfit)}\n\n${scenarios.map(s => `${s.cut}% 인하 · 월 ${won(s.price)}\n가입 ${s.customers.toLocaleString("ko-KR")}회선 (+${s.growth}%)\n매출 ${won(s.revenue)} / 기여이익 ${won(s.profit)} (${s.profitChange.toFixed(1)}%)`).join("\n\n")}`,
    "5% 인하안은 가입이 8% 늘어도 기여이익이 500만원에서 432만원으로 13.6% 감소합니다. 회선당 기여이익이 5,000원에서 4,000원으로 줄기 때문입니다.\n\n기존 기여이익을 유지하려면 가입 증가율이 최소 25%여야 합니다. 10% 인하는 약 66.7%, 15% 인하는 150%가 필요합니다. 가격 인하만으로 이를 달성한다고 보기에는 근거가 부족합니다.\n\n또한 체감가를 포인트로 낮추면 청구 매출과 포인트 지급 비용을 분리해야 하므로 이 계산을 그대로 적용할 수 없습니다.",
    "추천은 APP 번호이동 고객 일부를 대상으로 한 5% 인하 단기 검증입니다.\n\n동일 요금제·유입 조건의 현행 유지군과 비교하고, 노출 인원 차이를 보정한 가입 전환율·30일 유지율·고객당 기여이익을 함께 보세요. 모집 종료 시점에 할인 비용을 포함한 총 기여이익을 비교하고, 30일 유지율 확인 후 확대 여부를 결정하는 흐름이 적합합니다.\n\n다음 계산에는 대상 요금제, 적용 채널, 청구 할인 또는 포인트 방식, 지급 기간, 원가가 필요합니다. 이번 응답은 가정 기반 시뮬레이션이며 정책은 등록·적용하지 않았습니다.",
  ];
  return replies.map((content, index) => index === 2 ? {
    content,
    chart: { kind: "aiir-price", points: [{cut: 0, customers: lines, revenue: basePrice * lines, profit: baselineProfit}, ...scenarios.map(({cut, customers, revenue, profit}) => ({cut, customers, revenue, profit}))] },
  } : { content });
}
