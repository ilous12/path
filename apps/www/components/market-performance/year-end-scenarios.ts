import type { MarketEvent } from "./data";
import type { PolicyAlternative } from "./alternative-model";

// Deterministic planning fixtures, not published offers or executed campaigns.
const schedule = [
  ["aiir", "09-21", "10-04", "APP", "가을 번호이동 웰컴 혜택", "번호이동 개통 후 30일 유지 시 10,000P 지급, 회선당 1회", 12, -3, 0, 18000],
  ["tdds", "09-21", "10-04", "WEB", "공식몰 온라인 가입 집중", "온라인 신청 후 7일 이내 개통 시 유심·배송비 지원, 최대 7,700원", 9, -2, 0, 22000],
  ["aiir", "10-05", "10-18", "MOYO", "데이터 실속 요금제 기획전", "20GB급 대상 첫 3개월 월 2,000원 할인, 기존 할인 중복 제외", 16, -2, -6, 25000],
  ["tdds", "10-05", "10-18", "TOSS", "플랫폼 번호이동 유입 확대", "번호이동 후 60일 유지 시 15,000P 지급, 선착순 1,000회선", 14, -2, 0, 30000],
  ["aiir", "10-19", "10-31", "WEB", "온라인 신규 회선 혜택", "010 신규 고객 유심·배송비 면제, 최대 7,700원 지원", 8, 0, 0, 12000],
  ["tdds", "10-19", "10-31", "KAKAOPAY", "간편 가입 전환 개선", "가입 완료 후 개통 고객 10,000P 지급, 중복 지급 제외", 11, -1, 0, 24000],
  ["aiir", "11-01", "11-15", "TOSS", "11월 데이터 혜택 위크", "개통 고객 추가 데이터 10GB를 3개월 제공, 대상 요금제 한정", 13, -4, 0, 20000],
  ["tdds", "11-01", "11-15", "WEB", "공식몰 가격 경쟁력 강화", "선정 요금제 첫 3개월 월 3,000원 할인, 예산 소진 시 종료", 17, -3, -8, 35000],
  ["aiir", "11-16", "11-30", "KAKAOPAY", "연말 선행 번호이동 기획전", "번호이동 개통 후 60일 유지 시 20,000P 지급, 800회선 한정", 20, -4, 0, 28000],
  ["tdds", "11-16", "11-30", "MOYO", "고용량 요금제 비교 기획전", "100GB급 가입 고객 20,000원 혜택, 60일 유지 조건", 15, -2, 0, 32000],
  ["aiir", "12-01", "12-14", "APP", "장기 이용 고객 유지 혜택", "6개월 이상 고객 추가 데이터 5GB 제공, 유지 대상 고객 한정", 4, -12, 0, 14000],
  ["tdds", "12-01", "12-14", "WEB", "연말 이탈 방어 프로그램", "상담 후 유지 고객 3개월 데이터 혜택, 고객당 1회 적용", 3, -10, 0, 18000],
  ["aiir", "12-15", "12-31", "MOYO", "연말 순증 마감 캠페인", "번호이동 고객 15,000P 지급, 개통 후 60일 유지 조건", 18, -5, 0, 26000],
  ["tdds", "12-15", "12-31", "TOSS", "온라인 성장 연말 프로모션", "신규·번호이동 고객 최대 20,000P, 타 제휴 혜택 중복 제외", 19, -4, 0, 38000],
] as const;

export const YEAR_END_CAMPAIGNS: PolicyAlternative[] = schedule.map(([workspace, start, end, channel, title, terms, demandPct, cancellationPct, pricePct, dailyCost], index) => {
  const startDate = `2026-${start}`, endDate = `2026-${end}`;
  const applyDays = Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86400000) + 1;
  return {
    id: `year-end-2026-${workspace}-${index + 1}`, workspace, operator: workspace === "aiir" ? "aiir" : "TDDS",
    title, description: `${terms}. 목표: ${cancellationPct <= -10 ? "해지 감소와 순증 방어" : "온라인 가입 전환과 순증 확대"}. 일 예산 ₩${dailyCost.toLocaleString("ko-KR")}.`,
    type: pricePct ? "가격 조정" : "혜택 변경", channel, targetChannels: [channel],
    start: startDate, applyDays, days: Math.min(applyDays + 14, Math.round((Date.parse("2026-12-31") - Date.parse(startDate)) / 86400000) + 1),
    demandPct, cancellationPct, pricePct, variableCostPct: 2, dailyCost, oneTimeCost: 50000,
    status: "draft", forecastMethod: index % 3 === 0 ? "damped" : index % 3 === 1 ? "sarimax" : "prophet",
    createdAt: "2026-09-21T00:00:00Z", history: [{at:"2026-09-21T00:00:00Z", action:"연말 판매 계획 등록"}],
  };
});

export const YEAR_END_EVENTS: MarketEvent[] = YEAR_END_CAMPAIGNS.map(a => ({
  id: `event-${a.id}`, title: `${a.operator} · ${a.title}`, operator: a.operator!, channel:a.channel!, targetChannels:a.targetChannels,
  types: ["policy", a.pricePct ? "price" : "benefit"],
  startAt: `${a.start}T09:00:00`, endAt: `${new Date(Date.parse(a.start) + ((a.applyDays ?? a.days) - 1) * 86400000).toISOString().slice(0,10)}T23:59:00`,
  summary:a.description, before:"기존 채널 판매 조건", after:a.description,
  next:`가입 ${a.demandPct}% 증가·해지 ${Math.abs(a.cancellationPct ?? 0)}% 감소 가정의 적용 전망 검토`,
  sourceType:"manual", sourceName:"내부 판매 계획", recordedBy:`${a.operator} 판매정책 담당`, recordedAt:a.createdAt,
  evidenceKind:"demo", dateBasis:"synthetic", processingMode:"demo",
}));
