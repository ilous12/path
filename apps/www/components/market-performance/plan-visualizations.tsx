"use client";
import { presetRange } from "./data";
import { withPeriodMargins, chartDisplayRange } from "./chart-period";
import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import catalog from "./fixtures/plan-catalog.json";
type Offer = (typeof catalog.offers)[number];
const sources = [
  { id: "air-official", name: "AIR 공식", color: "var(--chart-1)" },
  { id: "air-kakaopay", name: "AIR · 카카오페이", color: "var(--chart-3)" },
  { id: "moyo", name: "모요", color: "var(--chart-2)" },
];
const buckets = [
  "≤7GB",
  "7~20GB",
  "20~50GB",
  "50~100GB",
  "100GB 초과",
  "매일 추가",
  "무제한",
];
function bucket(p: Offer) {
  return p.unlimitedData
    ? 6
    : p.dailyDataGb
      ? 5
      : (p.monthlyDataGb ?? 0) <= 7
        ? 0
        : p.monthlyDataGb! <= 20
          ? 1
          : p.monthlyDataGb! <= 50
            ? 2
            : p.monthlyDataGb! <= 100
              ? 3
              : 4;
}
const price = (v: number) => `${v.toLocaleString("ko-KR")}원`;
export function PlanTrend({ offer, range = presetRange("1M") }: { offer: Offer; range?: { start: string; end: string } }) {
  const displayRange=chartDisplayRange(range);
  const sourceGroup = offer.sourceId.startsWith("air-") ? "air-" : "moyo";
  const history = catalog.history.filter(
    (h) =>
      h.productId === offer.productId && h.sourceId.startsWith(sourceGroup) && (!range || (new Date(Date.parse(h.observedAt) + 9 * 3600000).toISOString().slice(0, 10) >= displayRange.start && new Date(Date.parse(h.observedAt) + 9 * 3600000).toISOString().slice(0, 10) <= displayRange.end)),
  );
  const byDay = new Map<string, Record<string, string | number | null>>();
  for (const h of [...history].sort((a, b) =>
    a.observedAt.localeCompare(b.observedAt),
  )) {
    const date = new Date(new Date(h.observedAt).getTime() + 9 * 3600000)
      .toISOString()
      .slice(0, 10);
    const row = byDay.get(date) ?? { date };
    row[h.sourceId] = h.effectiveKrw;
    byDay.set(date, row);
  }
  const data = [...byDay.values()].sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
  const active = sources.filter((s) =>
    history.some((h) => h.sourceId === s.id),
  );
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-semibold">
        {offer.name} · 채널별 체감가 관측
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {data.length === 0 ? "선택 기간에 관측 데이터가 없습니다." : data.length < 2
          ? "관측 1회 · 변경 추세를 판단할 이력이 없습니다."
          : "수집일별 마지막 관측값 · 관측점 사이의 선은 비교용입니다."}{" "}
        혜택·적용 기간은 채널별로 다를 수 있습니다.
      </p>
      <div
        className="mt-3 h-56"
        role="img"
        aria-label={`${offer.name} 체감가 관측 ${data.length}일, ${active.length}개 채널`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={withPeriodMargins(data, "date", range ?? presetRange("1M"))}
            margin={{ top: 10, right: 30, bottom: 5, left: 15 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis
              tickFormatter={(v) => `${Number(v) / 10000}만`}
              domain={[0, "auto"]}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(v) => price(Number(v))}
              contentStyle={{
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                borderColor: "var(--border)",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {active.map((s) => (
              <Line
                key={s.id}
                dataKey={s.id}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                type="linear"
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {active.map((s) => (
          <span key={s.id}>
            {s.name}: {price(Number([...history].filter(h => h.sourceId === s.id).sort((a,b) => b.observedAt.localeCompare(a.observedAt))[0]?.effectiveKrw))}
          </span>
        ))}
      </div>
    </div>
  );
}
export function PlanVisualizations({ offers }: { offers: Offer[] }) {
  const [selected, setSelected] = useState("air-official:NA00009066");
  const [metric, setMetric] = useState<"effective" | "billed">("effective");
  const offer = offers.find((p) => p.offerId === selected) ?? offers[0];
  const eligible = offers.filter(
    (p) =>
      (metric === "effective" ? p.displayedEffectiveKrw : p.monthlyBilledKrw) !=
        null &&
      (p.unlimitedData || p.monthlyDataGb != null),
  );
  return (
    <section
      className="space-y-5 rounded-xl border bg-card p-4"
      aria-label="요금제 시각화"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">요금제 스펙트럼</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            목록 필터와 연동 · {eligible.length.toLocaleString("ko-KR")}개 판매
            조건 · 점이 겹칠 수 있습니다.
          </p>
        </div>
        <select
          aria-label="스펙트럼 가격 기준"
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={metric}
          onChange={(e) => setMetric(e.target.value as typeof metric)}
        >
          <option value="effective">혜택 반영 체감가</option>
          <option value="billed">월 청구 요금</option>
        </select>
      </div>
      <p className="text-xs text-muted-foreground">
        가로축: 월 가격 · 세로축: 데이터 제공 구간. 매일 추가·무제한은 별도
        구간이며, QoS·통화·혜택 기간이 다른 상품의 단순 우열을 뜻하지 않습니다.
      </p>
      <div
        className="h-72"
        role="img"
        aria-label="가격과 데이터 구간별 요금제 분포"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 25, bottom: 10, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="price"
              name="월 가격"
              tickFormatter={(v) => `${v / 10000}만`}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="bucket"
              name="데이터 구간"
              domain={[-0.4, 6.4]}
              ticks={[0, 1, 2, 3, 4, 5, 6]}
              tickFormatter={(v) => buckets[v] ?? ""}
              tick={{ fontSize: 11 }}
              width={72}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as
                  | (Offer & { price: number })
                  | undefined;
                return active && p ? (
                  <div className="max-w-64 rounded-md border bg-popover p-3 text-xs text-popover-foreground shadow-md">
                    <p className="font-semibold">{p.name}</p>
                    <p>
                      {sources.find((s) => s.id === p.sourceId)?.name} ·{" "}
                      {p.network}
                    </p>
                    <p className="mt-1">
                      {price(p.price)} · {buckets[bucket(p)]}
                    </p>
                  </div>
                ) : null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {sources.map((s) => (
              <Scatter
                key={s.id}
                name={s.name}
                fill={s.color}
                fillOpacity={s.id === "moyo" ? 0.35 : 1}
                data={eligible
                  .filter((p) => p.sourceId === s.id)
                  .map((p) => ({
                    ...p,
                    price:
                      metric === "effective"
                        ? p.displayedEffectiveKrw
                        : p.monthlyBilledKrw,
                    bucket: bucket(p),
                  }))}
                isAnimationActive={false}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="border-t pt-4">
        <label className="flex flex-wrap items-center gap-2 text-xs">
          추이를 확인할 요금제
          <select
            aria-label="추이 요금제 선택"
            className="h-9 max-w-full rounded-md border bg-background px-2 text-sm"
            value={offer?.offerId ?? ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            {offers.map((p) => (
              <option key={p.offerId} value={p.offerId}>
                {sources.find((s) => s.id === p.sourceId)?.name} · {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4">
          {offer ? (
            <PlanTrend offer={offer} />
          ) : (
            <p className="text-sm text-muted-foreground">
              필터에 맞는 요금제가 없습니다.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
