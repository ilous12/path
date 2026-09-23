/** Deterministic mock extraction. Unspecified effects are never inferred. */
export type PolicyRequirements = {
  pricePct: number | null;
  benefits: string;
  points: string;
  freeOffers: string;
  other: string;
};
export const EXPERIMENT_SUGGESTIONS = [
  {
    title: "가격 경쟁력",
    prompt:
      "20GB 요금제의 월 요금을 5% 인하하고 번호이동 고객의 가입 전환을 비교해줘.",
  },
  {
    title: "데이터 혜택",
    prompt:
      "기존 요금은 유지하고 월 데이터 10GB 추가 혜택을 제공해 유지율 변화를 검토해줘.",
  },
  {
    title: "유지 포인트",
    prompt:
      "번호이동 고객에게 30일 유지 시 포인트 5,000원을 지급하고 조기 해지와 비용을 비교해줘.",
  },
  {
    title: "개통 비용 지원",
    prompt:
      "온라인 신규 가입자에게 eSIM 발급비 무료 혜택을 제공하고 개통 완료율을 비교해줘.",
  },
  {
    title: "결합 프로모션",
    prompt:
      "월 요금을 3% 인하하고 데이터 5GB 추가 혜택, 포인트 3,000원 지급, 유심 배송 무료를 제공해 순익을 비교해줘.",
  },
];
export const EVENT_SUGGESTIONS = [
  {
    title: "경쟁 요금제 가격 인하",
    prompt:
      "경쟁사가 20GB 요금제의 월 요금을 5% 인하했다. 동일 망·데이터·할인 기간을 기준으로 우리 상품과 가격 차이를 정리하고 확인할 영향을 요약해줘.",
  },
  {
    title: "데이터 혜택 확대",
    prompt:
      "기존 요금을 유지하면서 월 데이터 10GB 추가 혜택을 발표했다. 적용 대상과 제공 기간을 확인할 항목으로 정리하고 경쟁 상품과의 차이를 요약해줘.",
  },
  {
    title: "번호이동 프로모션",
    prompt:
      "번호이동 고객에게 30일 유지 시 포인트 5,000원을 지급하는 프로모션을 시작했다. 지급 조건·제외 대상·종료일을 확인할 항목으로 정리하고 가입·해지·비용의 관찰 지표를 제안해줘.",
  },
  {
    title: "보안 사고 대응",
    prompt:
      "통신사가 보안 사고 이후 고객 안내와 유심 무상 교체를 발표했다. 발표 내용·지원 대상·시행 일정을 구분하고 고객 문의·해지·번호이동 추이를 확인할 항목으로 정리해줘. 미확인 피해 범위와 인과관계는 단정하지 마.",
  },
  {
    title: "온라인 개통 개선",
    prompt:
      "온라인 채널에서 eSIM 발급비 무료 정책과 개통 절차 간소화를 시작했다. 변경 전후 절차·적용 대상을 정리하고 개통 완료율·소요시간·지원 비용을 관찰할 지표로 요약해줘.",
  },
];
export function extractPolicyRequirements(prompt: string): PolicyRequirements {
  const clauses = prompt
    .split(/[\n，。]|(?<!\d),|,(?!\d)|(?<=다)\./)
    .map((s) => s.trim())
    .filter(Boolean);
  const prices = [
    ...prompt.matchAll(
      /(?:요금|가격)[^%\n,]{0,28}?(\d+(?:\.\d+)?)\s*%\s*(인하|할인|인상)/g,
    ),
  ];
  const pricePct =
    prices.length === 1
      ? Number(prices[0][1]) * (prices[0][2] === "인상" ? 1 : -1)
      : null;
  const pick = (pattern: RegExp) =>
    clauses.filter((s) => pattern.test(s)).join(" · ");
  return {
    pricePct,
    benefits:
      [
        ...prompt.matchAll(
          /(?:데이터\s*[\d,.]+\s*GB(?:\s*추가)?(?:\s*혜택)?|[\d,.]+\s*GB\s*추가(?:\s*혜택)?|통화\s*[\d,]+\s*분)/gi,
        ),
      ]
        .map((m) => m[0])
        .join(" · ") || pick(/혜택|로밍/),
    points:
      [
        ...prompt.matchAll(
          /(?:(?:\d+일\s*유지\s*시)\s*)?(?:포인트|캐시백|적립)\s*[\d,]+\s*(?:원|점|P)/gi,
        ),
      ]
        .map((m) => m[0])
        .join(" · ") || pick(/포인트|캐시백|적립/),
    freeOffers:
      [
        ...prompt.matchAll(
          /(?:eSIM\s*발급비|유심\s*배송|배송비|유심비|통화|로밍|데이터)\s*(?:무료|면제|무상)/gi,
        ),
      ]
        .map((m) => m[0])
        .join(" · ") || pick(/무료|면제|무상/),
    other: clauses
      .filter(
        (s) =>
          !/(요금|가격).*%|데이터|GB|통화|혜택|로밍|포인트|캐시백|적립|무료|면제|무상/i.test(
            s,
          ),
      )
      .join(" · "),
  };
}

export type PolicyReviewSnapshot = {
  choice: number;
  label: string;
  summary: string;
  start: string;
  applyDays: number;
  days: number;
  pricePct: number;
  demandPct: number;
  cancellationPct: number;
  variableCostPct: number;
  dailyCost: number;
  oneTimeCost: number;
  targetChannels: string[];
};
