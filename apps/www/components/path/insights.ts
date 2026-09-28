import type { MarketEvent, Range } from "@/components/market-performance/data";
import type { AnnualTargets } from "@/components/market-performance/home-annual-targets";
import { type Campaign, type ForecastSummary, forecast } from "./campaigns";
import {
  type ChannelStat,
  dataTier,
  eventImpact,
  isOwn,
  kindLabel,
  type MarketMonth,
  mvvnoMargin,
  type Offer,
  type OperatorStat,
  type Pivot,
  priceOf,
  TIERS,
} from "./market";
import {
  AS_OF,
  BIZ,
  type Biz,
  compare,
  days,
  fmt,
  monthOutlook,
  targetFor,
} from "./model";

export type Insight = {
  tone: "up" | "down" | "warn" | "idea";
  title: string;
  body: string;
  evidence?: { label: string; href?: string }[];
};
const name = (b: Biz | Biz[]) =>
  Array.isArray(b) ? b.map((x) => BIZ[x].name).join("+") : BIZ[b].name;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

export function overviewInsights(
  biz: Biz | Biz[],
  range: Range,
  targets: AnnualTargets,
  events: MarketEvent[],
  campaigns: Campaign[],
): Insight[] {
  const list = Array.isArray(biz) ? biz : [biz];
  const c = compare(list, range);
  const out: Insight[] = [];
  const up = (c.delta.lines ?? 0) >= 0;
  out.push({
    tone: up ? "up" : "down",
    title: `${name(biz)} 가입 ${fmt.pct(c.delta.lines)} · 순증 ${fmt.pct(c.delta.net)}`,
    body: `직전 ${days(range)}일 대비 가입 ${fmt.signed(c.cur.lines - c.prev.lines)}회선, 순익 ${fmt.pct(c.delta.profit)}. ${up ? "상승 흐름이 유지되고 있습니다." : "하락 전환 — 원인 이벤트를 확인하세요."}`,
  });
  const t = list.reduce(
    (s, b) => {
      const x = targetFor(b, range, targets);
      return { lines: s.lines + x.lines, net: s.net + x.net };
    },
    { lines: 0, net: 0 },
  );
  if (t.net) {
    const rate = (c.cur.net / t.net) * 100;
    const m = monthOutlook(list, targets);
    const gap = m.target - m.forecastEnd;
    out.push({
      tone: rate >= 100 ? "up" : rate >= 90 ? "idea" : "warn",
      title: `순증 목표 달성률 ${fmt.rate(rate)} · 월말 전망 ${fmt.n(m.forecastEnd)}회선`,
      body:
        gap > 0
          ? `현재 추세로는 월 목표 ${fmt.n(m.target)} 대비 ${fmt.n(gap)}회선 부족합니다. 남은 기간 일 ${fmt.n(gap / Math.max(1, 30 - Number(AS_OF.slice(8, 10))))}회선 추가 확보가 필요합니다.`
          : `월 목표 ${fmt.n(m.target)}를 ${fmt.n(-gap)}회선 초과 달성할 전망입니다. 과잉 비용 캠페인은 조기 종료를 검토하세요.`,
    });
  }
  const rival = events.find((e) => !isOwn(e));
  if (rival) {
    const k = kindLabel(rival);
    const hit = eventImpact(list[0], rival.startAt.slice(0, 10));
    out.push({
      tone: (hit.impact ?? 0) < -5 ? "warn" : "idea",
      title: `${k.label} 동향: ${rival.title.slice(0, 34)}${rival.title.length > 34 ? "…" : ""}`,
      body: `${fmt.md(rival.startAt)} 이후 7일 ${name(list[0])} 가입 ${fmt.pct(hit.impact)}. ${(hit.impact ?? 0) < -5 ? "대응 판매조건 검토가 필요합니다." : "현재까지 영향은 제한적입니다."}`,
      evidence: [
        {
          label: "소식 보기",
          href: `/events/${encodeURIComponent(rival.id)}?workspace=home`,
        },
      ],
    });
  }
  const live = campaigns.filter(
    (x) =>
      list.includes(x.workspace) &&
      (x.status === "running" || x.status === "scheduled"),
  );
  if (live.length) {
    const s = live.map((x) => forecast(x.workspace, x.params).summary);
    const lines = s.reduce((a, v) => a + v.lines, 0);
    const profit = s.reduce((a, v) => a + v.profit, 0);
    out.push({
      tone: profit >= 0 ? "up" : "warn",
      title: `진행·예약 캠페인 ${live.length}건 · 예상 +${fmt.n(lines)}회선`,
      body: `예상 순익 ${fmt.won(profit)}원. 가장 큰 기여는 ‘${live[s.indexOf(s.reduce((a, v) => (v.lines > a.lines ? v : a)))].name}’입니다.`,
    });
  }
  return out;
}

export function timelineInsights(
  biz: Biz,
  pivots: Pivot[],
  events: MarketEvent[],
  campaigns: Campaign[],
): Insight[] {
  const out: Insight[] = [];
  const p = pivots[0];
  if (p) {
    const near = events
      .filter(
        (e) =>
          Math.abs(
            (Date.parse(e.startAt.slice(0, 10)) - Date.parse(p.date)) /
              86400000,
          ) <= 7,
      )
      .slice(0, 2);
    out.push({
      tone: p.pct < 0 ? "warn" : "up",
      title: `${fmt.md(p.date)} 변곡점 · 가입 ${fmt.pct(p.pct, 0)}`,
      body: near.length
        ? `같은 주에 ${near.map((e) => `‘${e.title.slice(0, 22)}’`).join(", ")}이(가) 있었습니다. 시점이 가장 가까운 이벤트를 1순위 원인 후보로 봅니다.`
        : "7일 이내 연결되는 이벤트가 없습니다. 내부 요인(재고·시스템) 점검을 권장합니다.",
      evidence: near.map((e) => ({
        label: e.title.slice(0, 18),
        href: `/events/${encodeURIComponent(e.id)}?workspace=${biz}`,
      })),
    });
  }
  const own = events.filter(isOwn)[0];
  if (own) {
    const hit = eventImpact(biz, own.startAt.slice(0, 10));
    out.push({
      tone: (hit.impact ?? 0) >= 0 ? "up" : "down",
      title: `최근 대응 ‘${own.title.slice(0, 26)}’`,
      body: `시행 후 7일 가입 ${fmt.pct(hit.impact)}, 현재 수준은 시행 전 대비 ${fmt.pct(hit.progress)}입니다.`,
    });
  }
  const next = campaigns
    .filter((c) => c.workspace === biz && c.params.start > AS_OF)
    .sort((a, b) => a.params.start.localeCompare(b.params.start))[0];
  if (next) {
    const s = forecast(biz, next.params).summary;
    out.push({
      tone: "idea",
      title: `다음 캠페인 ${fmt.md(next.params.start)} ‘${next.name}’`,
      body: `예상 +${fmt.n(s.lines)}회선 · ROI ${fmt.rate(s.roi)}. 시작 전 경쟁사 동향을 한 번 더 확인하세요.`,
    });
  }
  return out;
}

export function productInsights(offers: Offer[], biz: Biz): Insight[] {
  const own = offers.filter((o) => o.owner === biz);
  const market = offers.filter((o) => o.owner === "market");
  const out: Insight[] = [];
  const rows = TIERS.map((t) => {
    const a = own.filter((o) => dataTier(o) === t).map(priceOf);
    const m = market.filter((o) => dataTier(o) === t).map(priceOf);
    return { t, own: median(a), market: median(m), n: a.length, m: m.length };
  }).filter((r) => r.n && r.m);
  const worst = [...rows].sort(
    (a, b) => b.own / b.market - a.own / a.market,
  )[0];
  const best = [...rows].sort((a, b) => a.own / a.market - b.own / b.market)[0];
  if (worst)
    out.push({
      tone: worst.own > worst.market ? "warn" : "up",
      title: `${worst.t} 구간 체감가 시장 대비 ${fmt.pct(((worst.own - worst.market) / worst.market) * 100)}`,
      body: `${BIZ[biz].name} 중위 ${fmt.won(worst.own)}원 vs 시장 중위 ${fmt.won(worst.market)}원 (${worst.m}개 요금제). ${worst.own > worst.market ? "혜택·포인트로 체감가를 낮추는 판매조건을 검토하세요." : "가격 경쟁력이 유지됩니다."}`,
    });
  if (best && best !== worst)
    out.push({
      tone: "up",
      title: `가장 강한 구간: ${best.t}`,
      body: `시장 중위 대비 ${fmt.pct(((best.own - best.market) / best.market) * 100)} — 이 구간을 캠페인 주력 상품으로 활용하세요.`,
    });
  const cheap = [...market].sort((a, b) => priceOf(a) - priceOf(b))[0];
  if (cheap)
    out.push({
      tone: "idea",
      title: `최저가 경쟁 요금제: ${cheap.operator} ${cheap.name}`,
      body: `${cheap.channel} · 체감 ${fmt.won(priceOf(cheap))}원 · ${cheap.months ? `${cheap.months}개월 할인` : "상시"}.`,
    });
  if (!out.length)
    out.push({
      tone: "idea",
      title: "비교 가능한 요금제가 없습니다",
      body: "필터를 넓혀 동일 데이터 구간의 시장 요금제를 포함하세요.",
    });
  return out;
}

export function channelInsights(stats: ChannelStat[]): Insight[] {
  if (!stats.length) return [];
  const byDelta = [...stats]
    .filter((s) => s.delta !== null)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));
  const top = byDelta[0];
  const low = byDelta.at(-1);
  const churn = [...stats].sort(
    (a, b) => b.churn / Math.max(b.lines, 1) - a.churn / Math.max(a.lines, 1),
  )[0];
  const top3 = stats.slice(0, 3).reduce((s, c) => s + c.share, 0);
  return [
    top && {
      tone: "up" as const,
      title: `성장 채널: ${top.id} ${fmt.pct(top.delta)}`,
      body: `비중 ${fmt.rate(top.share, 1)} · 순증 ${fmt.n(top.net)}. 캠페인 예산을 우선 배정할 후보입니다.`,
    },
    low &&
      low !== top && {
        tone: "down" as const,
        title: `둔화 채널: ${low.id} ${fmt.pct(low.delta)}`,
        body: `판매조건·노출 위치를 점검하세요. 해지 ${fmt.n(low.churn)}회선.`,
      },
    {
      tone: top3 > 70 ? ("warn" as const) : ("idea" as const),
      title: `상위 3개 채널 집중도 ${fmt.rate(top3, 0)}`,
      body:
        top3 > 70
          ? "특정 채널 의존도가 높습니다. 제휴 채널 확대로 리스크를 분산하세요."
          : "채널 포트폴리오가 분산되어 있습니다.",
    },
    churn && {
      tone: "warn" as const,
      title: `해지 비율 최고: ${churn.id} ${fmt.rate((churn.churn / Math.max(churn.lines, 1)) * 100, 1)}`,
      body: "유입 품질을 확인하고 유지 조건형 혜택을 검토하세요.",
    },
  ].filter(Boolean) as Insight[];
}

export function campaignInsights(
  summaries: { label: string; summary: ForecastSummary }[],
): Insight[] {
  const real = summaries.filter((s) => s.label !== "미시행");
  if (!real.length) return [];
  const bestRoi = [...real].sort(
    (a, b) => (b.summary.roi ?? -999) - (a.summary.roi ?? -999),
  )[0];
  const bestNet = [...real].sort((a, b) => b.summary.net - a.summary.net)[0];
  const plan = real[0];
  const out: Insight[] = [
    {
      tone: "idea",
      title: `추천: ${bestRoi.label}`,
      body: `ROI ${fmt.rate(bestRoi.summary.roi)} · 순증 +${fmt.n(bestRoi.summary.net)} · 비용 ${fmt.won(bestRoi.summary.cost)}원. 효율 기준 최적안입니다.`,
    },
  ];
  if (bestNet !== bestRoi)
    out.push({
      tone: "up",
      title: `물량 최대: ${bestNet.label}`,
      body: `순증 +${fmt.n(bestNet.summary.net)} (추천안 대비 ${fmt.signed(bestNet.summary.net - bestRoi.summary.net)}). 목표 부족분이 크면 이 안을 선택하세요.`,
    });
  if (plan.summary.riskNotes.length)
    out.push({
      tone: "warn",
      title: `입력안 위험 ${plan.summary.risk}`,
      body: plan.summary.riskNotes.join(" · "),
    });
  return out;
}

export function performanceInsights(c: Campaign): Insight[] {
  const { rows, summary } = forecast(c.workspace, c.params);
  const seen = rows.filter((r) => r.actual !== null && r.inWindow);
  if (!seen.length)
    return [
      {
        tone: "idea",
        title: "아직 관측된 실적이 없습니다",
        body: `${fmt.md(c.params.start)} 시작 이후 예측 대비 실적이 자동 비교됩니다.`,
      },
    ];
  const actual = seen.reduce((s, r) => s + (r.actual ?? 0) - r.base, 0);
  const plan = seen.reduce((s, r) => s + r.plan - r.base, 0);
  const rate = plan ? (actual / plan) * 100 : null;
  return [
    {
      tone: (rate ?? 0) >= 100 ? "up" : (rate ?? 0) >= 70 ? "idea" : "down",
      title: `예측 대비 달성률 ${fmt.rate(rate)}`,
      body: `관측 ${seen.length}일 · 기준선 대비 실제 ${fmt.signed(actual)}회선 vs 예측 ${fmt.signed(plan)}회선.`,
    },
    {
      tone: "idea",
      title: `목표 대비 ${fmt.rate((summary.lines / Math.max(c.goal.lines, 1)) * 100)} 전망`,
      body:
        (rate ?? 0) < 90
          ? "성과가 예측을 밑돕니다. 채널 노출 강화 또는 혜택 상향 재예측을 권장합니다."
          : "예측 경로를 따르고 있습니다. 동일 조건 유지를 권장합니다.",
    },
  ];
}

export function mvvnoInsights(
  months: MarketMonth[],
  ops: OperatorStat[],
): Insight[] {
  const last = months.at(-1);
  const year = months.at(-13);
  if (!last || !year) return [];
  const share = (m: MarketMonth) => (m.byNetwork.SKKT / m.total) * 100;
  const top = ops[0];
  const fast = [...ops].sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0];
  return [
    {
      tone: share(last) < share(year) ? "warn" : "up",
      title: `SKKT망 점유율 ${fmt.rate(share(last), 1)} (전년 ${fmt.pct(share(last) - share(year), 1)}p)`,
      body: `MVVNO 시장 ${fmt.n(last.total)}천 회선, KT망이 ${fmt.rate((last.byNetwork.KT / last.total) * 100, 1)}로 1위입니다.`,
    },
    top && {
      tone: "idea",
      title: `SKKT망 1위 사업자: ${top.name}`,
      body: `기간 가입 ${fmt.n(top.lines)} · 비중 ${fmt.rate(top.share, 1)} · 번호이동 ${fmt.n(top.mnp)}.`,
    },
    fast &&
      fast !== top && {
        tone: "up",
        title: `성장 사업자: ${fast.name} ${fmt.pct(fast.delta)}`,
        body: "재원 배분 시 성장 탄력이 큰 사업자에 가중치를 주는 안을 비교하세요.",
      },
  ].filter(Boolean) as Insight[];
}

export function portfolioInsights(offers: Offer[]): Insight[] {
  const skkt = offers.filter((o) => o.network === "SKKT");
  const neg = skkt.filter((o) => mvvnoMargin(o) < 0);
  const byOp = new Map<string, number[]>();
  for (const o of skkt)
    byOp.set(o.operator, [...(byOp.get(o.operator) ?? []), mvvnoMargin(o)]);
  const worst = [...byOp.entries()]
    .map(([k, v]) => [k, median(v)] as const)
    .sort((a, b) => a[1] - b[1])[0];
  return [
    {
      tone: neg.length / Math.max(skkt.length, 1) > 0.25 ? "warn" : "idea",
      title: `추정 역마진 요금제 ${neg.length}개 / ${skkt.length}개`,
      body: "도매대가 대비 체감가가 낮은 무제한·대용량 구간에 집중됩니다.",
    },
    worst && {
      tone: "down",
      title: `수익성 최저 사업자: ${worst[0]}`,
      body: `중위 추정 마진 ${fmt.won(worst[1])}원/월. 지원 조건 재조정 대상입니다.`,
    },
  ].filter(Boolean) as Insight[];
}

export function dataInsights(
  label: string,
  total: number,
  shown: number,
  fresh: string,
): Insight[] {
  return [
    {
      tone: "idea",
      title: `${label} ${fmt.n(total)}행 · 필터 결과 ${fmt.n(shown)}행`,
      body: `최신 관측 ${fresh}. 필터를 저장하면 동일 조건이 모든 화면의 AI Insight에 반영됩니다.`,
    },
  ];
}
