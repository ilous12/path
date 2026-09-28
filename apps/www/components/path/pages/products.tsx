"use client";
import { useMemo, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { forecast, useCampaigns } from "../campaigns";
import { BarList, Donut, Spectrum } from "../charts";
import { channelInsights, productInsights } from "../insights";
import {
  type ChannelStat,
  channelStats,
  competitiveness,
  dataTier,
  type Offer,
  offersFor,
  priceOf,
  TIERS,
} from "../market";
import { BIZ, type Biz, fmt } from "../model";
import { usePeriod } from "../state";
import {
  type Column,
  DataTable,
  Delta,
  InsightPanel,
  PageHeader,
  PeriodPicker,
  Section,
  Tag,
  useTable,
} from "../ui";

const sample = <T,>(xs: T[], n: number) =>
  xs.length <= n ? xs : xs.filter((_, i) => i % Math.ceil(xs.length / n) === 0);

function ProductSection({ biz }: { biz: Exclude<Biz, "mvvno"> }) {
  const all = useMemo(() => offersFor(biz), [biz]);
  const [scope, setScope] = useState<"all" | "own" | "market">("all");
  const scoped = all.filter(
    (o) =>
      scope === "all" ||
      (scope === "own" ? o.owner === biz : o.owner === "market"),
  );
  const networks = [...new Set(all.map((o) => o.network))];
  const channels = [
    ...new Set(all.filter((o) => o.owner === biz).map((o) => o.channel)),
  ];
  const columns: Column<Offer>[] = [
    {
      key: "name",
      label: "요금제",
      render: (o) => (
        <span className="flex items-center gap-1.5">
          <span
            className="size-1.5 rounded-full"
            style={{
              background:
                o.owner === biz ? BIZ[biz].color : "var(--muted-foreground)",
            }}
          />
          <span className="font-medium">{o.name}</span>
        </span>
      ),
      sort: (o) => o.name,
    },
    {
      key: "op",
      label: "사업자·망",
      render: (o) => (
        <span className="text-muted-foreground">
          {o.operator} · {o.network}
        </span>
      ),
      sort: (o) => o.operator,
    },
    {
      key: "ch",
      label: "채널",
      render: (o) => <Tag>{o.channel}</Tag>,
      sort: (o) => o.channel,
    },
    {
      key: "data",
      label: "데이터",
      align: "right",
      render: (o) => (o.unlimited ? "무제한" : `${o.dataGb ?? "—"}GB`),
      sort: (o) => (o.unlimited ? 999 : (o.dataGb ?? 0)),
    },
    {
      key: "bill",
      label: "청구",
      align: "right",
      render: (o) => (o.bill ? fmt.n(o.bill) : "—"),
      sort: (o) => o.bill ?? 0,
    },
    {
      key: "eff",
      label: "체감가",
      align: "right",
      render: (o) => <span className="font-semibold">{fmt.n(priceOf(o))}</span>,
      sort: priceOf,
    },
    {
      key: "period",
      label: "기간",
      align: "right",
      render: (o) => (o.months ? `${o.months}개월` : "상시"),
      sort: (o) => o.months ?? 0,
    },
    {
      key: "benefit",
      label: "혜택·가입 조건",
      className: "max-w-[220px]",
      render: (o) => (
        <span className="line-clamp-1 text-muted-foreground">
          {o.benefits.join(" · ") || "—"}
        </span>
      ),
    },
    {
      key: "score",
      label: "경쟁력",
      align: "right",
      render: (o) => {
        const s = competitiveness(o, all);
        return s === null ? (
          "—"
        ) : (
          <span
            className={
              s >= 50
                ? "font-semibold text-emerald-600 dark:text-emerald-400"
                : "font-semibold text-amber-600 dark:text-amber-400"
            }
          >
            {s}
          </span>
        );
      },
      sort: (o) => competitiveness(o, all) ?? 0,
    },
  ];
  const table = useTable(
    scoped,
    {
      search: (o) =>
        `${o.name} ${o.operator} ${o.channel} ${o.benefits.join(" ")}`,
      filters: [
        {
          key: "net",
          label: "망",
          options: networks.map((n) => ({ value: n, label: n })),
          test: (o, v) => o.network === v,
        },
        {
          key: "tier",
          label: "데이터",
          options: TIERS.map((t) => ({ value: t, label: t })),
          test: (o, v) => dataTier(o) === v,
        },
        {
          key: "ch",
          label: "채널",
          options: channels.map((c) => ({ value: c, label: c })),
          test: (o, v) => o.channel === v,
        },
        {
          key: "period",
          label: "기간",
          options: [
            { value: "promo", label: "기간 할인" },
            { value: "always", label: "상시" },
          ],
          test: (o, v) => (v === "promo" ? (o.months ?? 0) > 0 : !o.months),
        },
      ],
      pageSize: 8,
      initialSort: { key: "eff", dir: 1 },
    },
    columns,
  );
  const points = sample(table.filtered, 700).map((o) => ({
    x: o.unlimited ? 150 : (o.dataGb ?? 0),
    y: priceOf(o),
    name: `${o.operator} ${o.name}`,
    group: o.owner === biz ? BIZ[biz].name : "시장",
    color: o.owner === biz ? BIZ[biz].color : "var(--muted-foreground)",
    size: o.owner === biz ? 110 : 30,
    detail: `${o.channel}${o.months ? ` · ${o.months}개월` : ""}`,
  }));
  return (
    <Section
      actions={
        <ToggleGroup
          aria-label="요금제 범위"
          onValueChange={(v) => v[0] && setScope(v[0] as typeof scope)}
          size="sm"
          value={[scope]}
          variant="outline"
        >
          <ToggleGroupItem className="px-2.5 text-xs" value="all">
            전체
          </ToggleGroupItem>
          <ToggleGroupItem className="px-2.5 text-xs" value="own">
            {BIZ[biz].name}
          </ToggleGroupItem>
          <ToggleGroupItem className="px-2.5 text-xs" value="market">
            시장
          </ToggleGroupItem>
        </ToggleGroup>
      }
      id="products"
      meta={`${BIZ[biz].name}와 전체 시장 · 요금제별·채널별 스펙트럼과 판매 조건 경쟁력`}
      title="상품"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-xl border p-3">
            <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>데이터 제공량 × 체감가 스펙트럼 (무제한 = 150GB 위치)</span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: BIZ[biz].color }}
                  />
                  {BIZ[biz].name}
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-muted-foreground/50" />
                  시장
                </span>
              </span>
            </div>
            <Spectrum
              height={260}
              points={points}
              xLabel="데이터(GB)"
              yLabel="체감가"
            />
          </div>
          <DataTable
            dense
            rowKey={(o) => o.id}
            searchLabel="요금제·사업자·혜택 검색"
            table={table}
          />
        </div>
        <InsightPanel
          items={productInsights(table.filtered, biz)}
          scope={[
            BIZ[biz].name,
            scope === "all" ? "자사+시장" : scope === "own" ? "자사" : "시장",
            ...Object.values(table.values).filter((v) => v && v !== "all"),
            table.query ? `“${table.query}”` : "검색 없음",
          ]}
        />
      </div>
    </Section>
  );
}

function ChannelSection({ biz }: { biz: Exclude<Biz, "mvvno"> }) {
  const { range } = usePeriod();
  const { items } = useCampaigns();
  const stats = useMemo(() => channelStats(biz, range), [biz, range]);
  const offers = useMemo(
    () => offersFor(biz).filter((o) => o.owner === biz),
    [biz],
  );
  const camp = (id: string) =>
    items.filter(
      (c) =>
        c.workspace === biz &&
        (c.params.channels.length === 0 || c.params.channels.includes(id)) &&
        c.status !== "draft",
    );
  const columns: Column<ChannelStat>[] = [
    {
      key: "id",
      label: "채널",
      render: (s) => <span className="font-medium">{s.id}</span>,
      sort: (s) => s.id,
    },
    {
      key: "lines",
      label: "가입",
      align: "right",
      render: (s) => fmt.n(s.lines),
      sort: (s) => s.lines,
    },
    {
      key: "churn",
      label: "해지",
      align: "right",
      render: (s) => fmt.n(s.churn),
      sort: (s) => s.churn,
    },
    {
      key: "net",
      label: "순증",
      align: "right",
      render: (s) => <span className="font-semibold">{fmt.n(s.net)}</span>,
      sort: (s) => s.net,
    },
    {
      key: "revenue",
      label: "매출",
      align: "right",
      render: (s) => fmt.won(s.revenue),
      sort: (s) => s.revenue,
    },
    {
      key: "share",
      label: "비중",
      align: "right",
      render: (s) => (
        <span className="inline-flex items-center gap-2">
          <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-muted">
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${s.share}%`, background: BIZ[biz].color }}
            />
          </span>
          {fmt.rate(s.share, 1)}
        </span>
      ),
      sort: (s) => s.share,
    },
    {
      key: "delta",
      label: "증감",
      align: "right",
      render: (s) => <Delta value={s.delta} />,
      sort: (s) => s.delta ?? 0,
    },
    {
      key: "plans",
      label: "취급 요금제",
      align: "right",
      render: (s) => offers.filter((o) => o.channel === s.id).length || "—",
    },
    {
      key: "camp",
      label: "캠페인 성과(예측)",
      render: (s) => {
        const list = camp(s.id);
        const net = list.reduce(
          (a, c) =>
            a +
            forecast(c.workspace, c.params).summary.net /
              Math.max(1, c.params.channels.length || stats.length),
          0,
        );
        return list.length ? (
          <span className="text-[12px]">
            {list.length}건 ·{" "}
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              +{fmt.n(net)}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
  ];
  const table = useTable(
    stats,
    {
      search: (s) => s.id,
      filters: [
        {
          key: "trend",
          label: "추세",
          options: [
            { value: "up", label: "성장" },
            { value: "down", label: "감소" },
          ],
          test: (s, v) =>
            v === "up" ? (s.delta ?? 0) > 0 : (s.delta ?? 0) < 0,
        },
        {
          key: "camp",
          label: "캠페인",
          options: [
            { value: "yes", label: "캠페인 적용" },
            { value: "no", label: "미적용" },
          ],
          test: (s, v) => (v === "yes") === camp(s.id).length > 0,
        },
      ],
      pageSize: 8,
      initialSort: { key: "lines", dir: -1 },
    },
    columns,
  );
  return (
    <Section
      id="channels"
      meta="채널별 가입·해지·순증·매출·비중과 취급 요금제·캠페인 성과"
      title="채널"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="grid gap-4 rounded-xl border p-3 md:grid-cols-[auto_1fr]">
            <Donut
              center={fmt.n(table.filtered.reduce((s, c) => s + c.lines, 0))}
              data={table.filtered.map((s, i) => ({
                name: s.id,
                value: s.lines,
                color: `color-mix(in oklab, ${BIZ[biz].color} ${100 - i * 11}%, var(--muted))`,
              }))}
              size={140}
              sub="가입 합계"
            />
            <BarList
              items={table.filtered.map((s) => ({
                label: s.id,
                value: s.net,
                color: BIZ[biz].color,
                note: <Delta value={s.delta} />,
              }))}
            />
          </div>
          <DataTable
            dense
            rowKey={(s) => s.id}
            searchLabel="채널 검색"
            table={table}
          />
        </div>
        <InsightPanel
          items={channelInsights(table.filtered)}
          scope={[
            BIZ[biz].name,
            `${fmt.md(range.start)}–${fmt.md(range.end)}`,
            `${table.filtered.length}개 채널`,
          ]}
        />
      </div>
    </Section>
  );
}

export function ProductsChannels({ biz }: { biz: Biz }) {
  if (biz === "mvvno") return null;
  return (
    <div className="space-y-4">
      <PageHeader
        actions={<PeriodPicker />}
        description="상품 섹션과 채널 섹션은 각각 독립적으로 검색·필터·페이지 이동합니다"
        eyebrow={
          <>
            {BIZ[biz].name} · {BIZ[biz].full}
          </>
        }
        title="상품·채널"
      />
      <ProductSection biz={biz} />
      <ChannelSection biz={biz} />
    </div>
  );
}
