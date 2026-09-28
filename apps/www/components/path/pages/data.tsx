"use client";
import Link from "next/link";
import { useMemo } from "react";
import { dayShift } from "@/components/market-performance/alternative-model";
import { EVENT_TYPES } from "@/components/market-performance/data";
import { useEventCatalog } from "@/components/market-performance/event-catalog";
import {
  monthTarget,
  useAnnualTargets,
} from "@/components/market-performance/home-annual-targets";
import { eventBusiness } from "@/components/market-performance/path-intelligence";
import { forecast, STATUS_LABEL, useCampaigns } from "../campaigns";
import { DATA_TABLES, type DataTableId } from "../ia";
import { dataInsights, type Insight } from "../insights";
import {
  CHANNEL_SETS,
  isOwn,
  kindLabel,
  NETWORKS,
  offersFor,
  priceOf,
  SKKT_OPERATORS,
} from "../market";
import {
  AS_OF,
  BIZ,
  type Biz,
  churnRatio,
  days,
  fmt,
  perf,
  totals,
} from "../model";
import { usePeriod, useQueryState } from "../state";
import {
  type Column,
  DataTable,
  type Filter,
  InsightPanel,
  PageHeader,
  PeriodPicker,
  Section,
  Tag,
  useTable,
} from "../ui";
import { StatusBadge } from "./campaigns";

const ALL: Biz[] = ["aiir", "tdds", "mvvno"];
const bizFilter = <T,>(get: (r: T) => string): Filter<T> => ({
  key: "biz",
  label: "사업부",
  options: ALL.map((b) => ({ value: b, label: BIZ[b].name })),
  test: (r, v) => get(r) === v,
});

function TableShell<T>({
  label,
  rows,
  columns,
  filters,
  search,
  rowKey,
  extra = [],
  scope,
  pageSize = 12,
  initialSort,
}: {
  label: string;
  rows: T[];
  columns: Column<T>[];
  filters?: Filter<T>[];
  search?: (r: T) => string;
  rowKey: (r: T) => string;
  extra?: ((shown: T[]) => Insight[]) | Insight[];
  scope: string[];
  pageSize?: number;
  initialSort?: { key: string; dir: 1 | -1 };
}) {
  const table = useTable(
    rows,
    { search, filters, pageSize, initialSort },
    columns,
  );
  const more = typeof extra === "function" ? extra(table.filtered) : extra;
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
      <Section meta={`${fmt.n(rows.length)}행 · 기준 ${AS_OF}`} title={label}>
        <DataTable dense rowKey={rowKey} table={table} />
      </Section>
      <InsightPanel
        items={[
          ...dataInsights(label, rows.length, table.filtered.length, AS_OF),
          ...more,
        ]}
        scope={[
          ...scope,
          ...Object.values(table.values).filter((v) => v && v !== "all"),
          table.query ? `“${table.query}”` : "전체",
        ]}
      />
    </div>
  );
}

type PerfRow = {
  key: string;
  biz: Biz;
  lines: number;
  churn: number;
  net: number;
  revenue: number;
  profit: number;
};
function Performance() {
  const { range } = usePeriod();
  const rows = useMemo<PerfRow[]>(
    () =>
      ALL.flatMap((b) => perf(b, range).map((r) => ({ ...r, biz: b }))).sort(
        (a, b) => b.key.localeCompare(a.key),
      ),
    [range],
  );
  const columns: Column<PerfRow>[] = [
    { key: "date", label: "일자", render: (r) => r.key, sort: (r) => r.key },
    {
      key: "biz",
      label: "사업부",
      render: (r) => <Tag color={BIZ[r.biz].color}>{BIZ[r.biz].name}</Tag>,
      sort: (r) => r.biz,
    },
    {
      key: "lines",
      label: "가입",
      align: "right",
      render: (r) => fmt.n(r.lines),
      sort: (r) => r.lines,
    },
    {
      key: "churn",
      label: "해지",
      align: "right",
      render: (r) => fmt.n(r.churn),
      sort: (r) => r.churn,
    },
    {
      key: "net",
      label: "순증",
      align: "right",
      render: (r) => fmt.n(r.net),
      sort: (r) => r.net,
    },
    {
      key: "rev",
      label: "매출",
      align: "right",
      render: (r) => fmt.n(r.revenue),
      sort: (r) => r.revenue,
    },
    {
      key: "profit",
      label: "순익",
      align: "right",
      render: (r) => fmt.n(r.profit),
      sort: (r) => r.profit,
    },
  ];
  return (
    <TableShell
      columns={columns}
      extra={(shown) => {
        const t = totals(shown);
        return [
          {
            tone: "idea",
            title: `선택 합계 가입 ${fmt.n(t.lines)} · 순증 ${fmt.n(t.net)}`,
            body: `매출 ${fmt.won(t.revenue)}원, 순익 ${fmt.won(t.profit)}원. 결측 일자 없음.`,
          },
        ];
      }}
      filters={[bizFilter<PerfRow>((r) => r.biz)]}
      initialSort={{ key: "date", dir: -1 }}
      label="실적·관측"
      rowKey={(r) => `${r.biz}${r.key}`}
      rows={rows}
      scope={["사업부·일자", `${fmt.md(range.start)}–${fmt.md(range.end)}`]}
    />
  );
}

type ChangeRow = {
  id: string;
  date: string;
  type: string;
  owner: string;
  title: string;
  source: string;
  href?: string;
};
function Changes() {
  const { events } = useEventCatalog();
  const { items } = useCampaigns();
  const rows = useMemo<ChangeRow[]>(
    () =>
      [
        ...events.map((e) => ({
          id: e.id,
          date: e.startAt.slice(0, 10),
          type: isOwn(e) ? "판매 정책 변경" : "시장 변화",
          owner: eventBusiness(e)
            ? BIZ[eventBusiness(e)!].name
            : kindLabel(e).label,
          title: e.title,
          source: e.sourceName ?? "—",
          href: `/events/${encodeURIComponent(e.id)}?workspace=home`,
        })),
        ...items.flatMap((c) =>
          c.history.map((h, i) => ({
            id: `${c.id}-${i}`,
            date: h.at.slice(0, 10),
            type: "캠페인 실행",
            owner: BIZ[c.workspace].name,
            title: `${c.name} · ${h.action}`,
            source: "PATH 캠페인",
          })),
        ),
      ].sort((a, b) => b.date.localeCompare(a.date)),
    [events, items],
  );
  const columns: Column<ChangeRow>[] = [
    { key: "date", label: "일자", render: (r) => r.date, sort: (r) => r.date },
    {
      key: "type",
      label: "유형",
      render: (r) => <Tag>{r.type}</Tag>,
      sort: (r) => r.type,
    },
    {
      key: "owner",
      label: "주체",
      render: (r) => r.owner,
      sort: (r) => r.owner,
    },
    {
      key: "title",
      label: "내용",
      className: "max-w-[380px]",
      render: (r) =>
        r.href ? (
          <Link className="line-clamp-1 hover:underline" href={r.href}>
            {r.title}
          </Link>
        ) : (
          <span className="line-clamp-1">{r.title}</span>
        ),
    },
    {
      key: "src",
      label: "출처",
      render: (r) => <span className="text-muted-foreground">{r.source}</span>,
    },
  ];
  const types = ["시장 변화", "판매 정책 변경", "캠페인 실행"];
  return (
    <TableShell
      columns={columns}
      filters={[
        {
          key: "type",
          label: "유형",
          options: types.map((t) => ({ value: t, label: t })),
          test: (r, v) => r.type === v,
        },
      ]}
      label="변화·이벤트"
      rowKey={(r) => r.id}
      rows={rows}
      scope={["시장·정책·캠페인"]}
      search={(r) => `${r.title} ${r.owner}`}
    />
  );
}

function Offers() {
  const rows = useMemo(() => [...offersFor("aiir"), ...offersFor("tdds")], []);
  type O = (typeof rows)[number];
  const columns: Column<O>[] = [
    {
      key: "name",
      label: "요금제",
      render: (o) => <span className="font-medium">{o.name}</span>,
      sort: (o) => o.name,
    },
    {
      key: "op",
      label: "사업자",
      render: (o) => o.operator,
      sort: (o) => o.operator,
    },
    { key: "net", label: "망", render: (o) => o.network },
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
      sort: (o) => o.dataGb ?? 999,
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
      render: (o) => fmt.n(priceOf(o)),
      sort: priceOf,
    },
    {
      key: "period",
      label: "기간",
      align: "right",
      render: (o) => (o.months ? `${o.months}개월` : "상시"),
    },
    {
      key: "benefit",
      label: "가입 조건·혜택",
      className: "max-w-[240px]",
      render: (o) => (
        <span className="line-clamp-1 text-muted-foreground">
          {o.benefits.join(" · ") || "—"}
        </span>
      ),
    },
  ];
  return (
    <TableShell
      columns={columns}
      filters={[
        {
          key: "owner",
          label: "구분",
          options: [
            { value: "aiir", label: "aiir" },
            { value: "tdds", label: "TDDS" },
            { value: "market", label: "시장" },
          ],
          test: (o, v) => o.owner === v,
        },
        {
          key: "net",
          label: "망",
          options: NETWORKS.map((n) => ({ value: n.id, label: n.id })),
          test: (o, v) => o.network === v,
        },
      ]}
      label="상품·판매 조건"
      rowKey={(o) => o.id}
      rows={rows}
      scope={["전체 요금제"]}
      search={(o) => `${o.name} ${o.operator} ${o.channel}`}
    />
  );
}

type VersionRow = {
  id: string;
  name: string;
  biz: Biz;
  n: number;
  at: string;
  note: string;
  net: number;
  cost: number;
  status: ReturnType<typeof useCampaigns>["items"][number]["status"];
  latest: boolean;
};
function Campaigns() {
  const { items } = useCampaigns();
  const rows = useMemo<VersionRow[]>(
    () =>
      items.flatMap((c) =>
        c.versions.map((v) => {
          const s = forecast(c.workspace, v.params).summary;
          return {
            id: `${c.id}-${v.n}`,
            name: c.name,
            biz: c.workspace,
            n: v.n,
            at: v.at.slice(0, 10),
            note: v.note,
            net: s.net,
            cost: s.cost,
            status: c.status,
            latest: v.n === c.versions.length,
          };
        }),
      ),
    [items],
  );
  const columns: Column<VersionRow>[] = [
    {
      key: "name",
      label: "캠페인",
      render: (r) => (
        <Link
          className="font-medium hover:underline"
          href={`/?workspace=${r.biz}&view=campaigns&step=analyze&id=${r.id.replace(/-\d+$/, "")}`}
        >
          {r.name}
        </Link>
      ),
      sort: (r) => r.name,
    },
    {
      key: "biz",
      label: "사업부",
      render: (r) => <Tag color={BIZ[r.biz].color}>{BIZ[r.biz].name}</Tag>,
    },
    {
      key: "ver",
      label: "계획 버전",
      render: (r) => (
        <span>
          v{r.n}
          {r.latest && (
            <span className="ml-1 text-[10px] text-primary">최신</span>
          )}
        </span>
      ),
      sort: (r) => r.n,
    },
    { key: "at", label: "일자", render: (r) => r.at, sort: (r) => r.at },
    {
      key: "note",
      label: "등록 조건·메모",
      className: "max-w-[220px]",
      render: (r) => (
        <span className="line-clamp-1 text-muted-foreground">{r.note}</span>
      ),
    },
    {
      key: "net",
      label: "예측 순증",
      align: "right",
      render: (r) => `+${fmt.n(r.net)}`,
      sort: (r) => r.net,
    },
    {
      key: "cost",
      label: "예측 비용",
      align: "right",
      render: (r) => fmt.won(r.cost),
      sort: (r) => r.cost,
    },
    {
      key: "status",
      label: "실행 상태",
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];
  return (
    <TableShell
      columns={columns}
      filters={[
        bizFilter<VersionRow>((r) => r.biz),
        {
          key: "status",
          label: "상태",
          options: Object.entries(STATUS_LABEL).map(([value, label]) => ({
            value,
            label,
          })),
          test: (r, v) => r.status === v,
        },
      ]}
      label="판매 정책·캠페인"
      rowKey={(r) => r.id}
      rows={rows}
      scope={["등록·버전·예측·실행"]}
      search={(r) => r.name}
    />
  );
}

type RefRow = {
  id: string;
  group: string;
  code: string;
  name: string;
  parent: string;
  note: string;
};
function Reference() {
  const rows = useMemo<RefRow[]>(
    () => [
      ...ALL.map((b) => ({
        id: `b-${b}`,
        group: "사업부",
        code: b,
        name: BIZ[b].name,
        parent: "SK텔레콤",
        note: BIZ[b].full,
      })),
      ...(["aiir", "tdds"] as const).flatMap((b) =>
        CHANNEL_SETS[b].map((c) => ({
          id: `c-${b}-${c.id}`,
          group: "채널",
          code: c.id,
          name: c.id,
          parent: BIZ[b].name,
          note: `기본 비중 ${c.weight}`,
        })),
      ),
      ...NETWORKS.map((n) => ({
        id: `n-${n.id}`,
        group: "망",
        code: n.id,
        name: n.label,
        parent: "MVVNO",
        note: "",
      })),
      ...SKKT_OPERATORS.map((o) => ({
        id: `o-${o.name}`,
        group: "사업자",
        code: o.name,
        name: o.name,
        parent: "SKKT망",
        note: `요금제 ${o.weight}개`,
      })),
      ...Object.entries(EVENT_TYPES).map(([k, t]) => ({
        id: `t-${k}`,
        group: "이벤트 유형",
        code: k,
        name: t.label,
        parent: "공통 분류",
        note: t.description,
      })),
    ],
    [],
  );
  const groups = [...new Set(rows.map((r) => r.group))];
  const columns: Column<RefRow>[] = [
    {
      key: "group",
      label: "분류",
      render: (r) => <Tag>{r.group}</Tag>,
      sort: (r) => r.group,
    },
    {
      key: "code",
      label: "코드",
      render: (r) => <code className="text-[11px]">{r.code}</code>,
      sort: (r) => r.code,
    },
    {
      key: "name",
      label: "이름",
      render: (r) => <span className="font-medium">{r.name}</span>,
      sort: (r) => r.name,
    },
    { key: "parent", label: "상위", render: (r) => r.parent },
    {
      key: "note",
      label: "설명",
      className: "max-w-[320px]",
      render: (r) => (
        <span className="line-clamp-1 text-muted-foreground">{r.note}</span>
      ),
    },
  ];
  return (
    <TableShell
      columns={columns}
      filters={[
        {
          key: "g",
          label: "분류",
          options: groups.map((g) => ({ value: g, label: g })),
          test: (r, v) => r.group === v,
        },
      ]}
      label="채널·기준정보"
      rowKey={(r) => r.id}
      rows={rows}
      scope={["기준정보"]}
      search={(r) => `${r.name} ${r.code} ${r.note}`}
    />
  );
}

type TargetRow = {
  id: string;
  biz: Biz;
  month: string;
  target: number;
  netTarget: number;
  actual: number | null;
  rate: number | null;
  base: number | null;
  withCampaign: number | null;
  margin: number;
};
function Targets() {
  const [targets] = useAnnualTargets();
  const { items } = useCampaigns();
  const rows = useMemo<TargetRow[]>(() => {
    const year = AS_OF.slice(0, 4);
    return ALL.flatMap((b) =>
      Array.from({ length: 12 }, (_, i) => {
        const month = `${year}-${String(i + 1).padStart(2, "0")}`;
        const first = `${month}-01`;
        const last = dayShift(
          new Date(Date.UTC(Number(year), i + 1, 1)).toISOString().slice(0, 10),
          -1,
        );
        const target = monthTarget(targets, first, b) ?? 0;
        const observed =
          first <= AS_OF
            ? totals(
                perf(b, { start: first, end: last < AS_OF ? last : AS_OF }),
              )
            : null;
        const recent = totals(
          perf(b, { start: dayShift(AS_OF, -27), end: AS_OF }),
        );
        const base =
          last >= AS_OF
            ? Math.round(
                (observed?.lines ?? 0) +
                  (recent.lines / 28) *
                    (days({ start: first > AS_OF ? first : AS_OF, end: last }) -
                      (first > AS_OF ? 0 : 1)),
              )
            : null;
        const lift = items
          .filter(
            (c) =>
              c.workspace === b &&
              c.status !== "draft" &&
              c.params.start <= last &&
              c.params.end >= first,
          )
          .reduce(
            (s, c) =>
              s +
              forecast(b, c.params)
                .rows.filter(
                  (r) => r.key >= first && r.key <= last && r.key > AS_OF,
                )
                .reduce((a, r) => a + r.plan - r.base, 0),
            0,
          );
        return {
          id: `${b}-${month}`,
          biz: b,
          month,
          target,
          netTarget: Math.round(target * (1 - churnRatio(b))),
          actual: observed?.lines ?? null,
          rate: observed && target ? (observed.lines / target) * 100 : null,
          base,
          withCampaign: base === null ? null : base + Math.round(lift),
          margin:
            observed && observed.revenue
              ? (observed.profit / observed.revenue) * 100
              : 0,
        };
      }),
    );
  }, [targets, items]);
  const columns: Column<TargetRow>[] = [
    {
      key: "biz",
      label: "사업부",
      render: (r) => <Tag color={BIZ[r.biz].color}>{BIZ[r.biz].name}</Tag>,
      sort: (r) => r.biz,
    },
    { key: "month", label: "월", render: (r) => r.month, sort: (r) => r.month },
    {
      key: "target",
      label: "가입 목표",
      align: "right",
      render: (r) => fmt.n(r.target),
      sort: (r) => r.target,
    },
    {
      key: "net",
      label: "순증 목표",
      align: "right",
      render: (r) => fmt.n(r.netTarget),
    },
    {
      key: "actual",
      label: "실적",
      align: "right",
      render: (r) => (r.actual === null ? "—" : fmt.n(r.actual)),
      sort: (r) => r.actual ?? -1,
    },
    {
      key: "rate",
      label: "달성률",
      align: "right",
      render: (r) => fmt.rate(r.rate),
      sort: (r) => r.rate ?? -1,
    },
    {
      key: "margin",
      label: "마진율",
      align: "right",
      render: (r) => (r.actual === null ? "—" : fmt.rate(r.margin, 1)),
    },
    {
      key: "base",
      label: "미시행 전망",
      align: "right",
      render: (r) => (r.base === null ? "—" : fmt.n(r.base)),
    },
    {
      key: "camp",
      label: "캠페인 적용 전망",
      align: "right",
      render: (r) =>
        r.withCampaign === null ? (
          "—"
        ) : (
          <span className="font-semibold">{fmt.n(r.withCampaign)}</span>
        ),
    },
  ];
  return (
    <TableShell
      columns={columns}
      extra={[
        {
          tone: "idea" as const,
          title: "예측 가정",
          body: "미시행 전망 = 최근 28일 일평균 × 남은 일수. 캠페인 적용 전망 = 확정·예약·진행 캠페인의 미래 증분 합. 순증 목표 = 가입 목표 × (1 − 최근 90일 해지 비율).",
        },
      ]}
      filters={[bizFilter<TargetRow>((r) => r.biz)]}
      initialSort={{ key: "month", dir: 1 }}
      label="목표·손익·전망"
      rowKey={(r) => r.id}
      rows={rows}
      scope={[`${AS_OF.slice(0, 4)}년`, "월별"]}
    />
  );
}

export function DataPage() {
  const { params } = useQueryState();
  const id = (DATA_TABLES.find((t) => t.id === params.get("table"))?.id ??
    "performance") as DataTableId;
  const ws = params.get("workspace") ?? "home";
  const label = DATA_TABLES.find((t) => t.id === id)?.label ?? "";
  return (
    <div className="space-y-4">
      <PageHeader
        actions={id === "performance" ? <PeriodPicker /> : undefined}
        description="모든 화면과 AI Insight가 사용하는 공통 데이터입니다"
        eyebrow="공통 · 데이터"
        title={label}
      />
      <nav aria-label="데이터 영역" className="flex flex-wrap gap-1.5">
        {DATA_TABLES.map((t, i) => (
          <Link
            className={
              t.id === id
                ? "rounded-md border border-primary/40 bg-primary/8 px-2.5 py-1 text-[12px] font-semibold"
                : "rounded-md border px-2.5 py-1 text-[12px] text-muted-foreground hover:bg-accent/50"
            }
            href={`/?workspace=${ws}&view=data&table=${t.id}`}
            key={t.id}
          >
            5.{i + 1} {t.label}
          </Link>
        ))}
      </nav>
      {id === "performance" && <Performance />}
      {id === "events" && <Changes />}
      {id === "offers" && <Offers />}
      {id === "campaigns" && <Campaigns />}
      {id === "reference" && <Reference />}
      {id === "targets" && <Targets />}
    </div>
  );
}
