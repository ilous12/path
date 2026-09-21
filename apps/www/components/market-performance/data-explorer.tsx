"use client";

import { buildChannelDaily } from "./channel-data";
import { useMemo, useState } from "react";
import { Database, Table2, KeyRound, Link2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { buildPerformance, MIN_DATE, MAX_DATE, getEventType } from "./data";
import { useEventCatalog } from "./event-catalog";
import { useEventVisibility } from "./event-visibility";
import { useAnalysisPreferences } from "./use-analysis-preferences";

type Row = Record<string, string | number | boolean | null>;
type Column = {
  name: string;
  label: string;
  type: string;
  key?: "PK" | "FK";
  nullable?: boolean;
};
const col = (
  name: string,
  label: string,
  type: string,
  key?: "PK" | "FK",
  nullable = false,
): Column => ({ name, label, type, key, nullable });
const schemas = {
  channel_daily_performance: {
    label: "채널별 일별 실적",
    description:
      "일별 실적을 채널별로 배분한 데이터입니다. 채널 전체 합계는 일별 실적과 일치합니다.",
    columns: [
      col("workspace_id", "워크스페이스", "VARCHAR", "PK"),
      col("date", "기준 일자", "DATE", "PK"),
      col("channel", "채널", "VARCHAR", "PK"),
      col("lines", "회선 수", "INTEGER"),
      col("new_lines", "010 신규", "INTEGER"),
      col("transfers", "번호이동", "INTEGER"),
      col("revenue", "매출", "BIGINT"),
    ],
  },
  daily_performance: {
    label: "일별 실적",
    description:
      "워크스페이스와 일자별 실적. 타임라인 차트와 같은 원천 데이터입니다.",
    columns: [
      col("workspace_id", "워크스페이스", "VARCHAR", "PK"),
      col("date", "기준 일자", "DATE", "PK"),
      col("lines", "회선 수", "INTEGER"),
      col("cancellations", "해지량", "INTEGER"),
      col("revenue", "매출", "BIGINT"),
      col("expenses", "비용", "BIGINT"),
      col("net_profit", "순익", "BIGINT"),
    ],
  },
  events: {
    label: "이벤트",
    description:
      "시장 변화와 대응 이력. 숨긴 이벤트도 원본 기록으로 유지됩니다.",
    columns: [
      col("id", "이벤트 ID", "VARCHAR", "PK"),
      col("title", "제목", "TEXT"),
      col("operator", "수행 주체", "VARCHAR"),
      col("channel", "채널", "VARCHAR"),
      col("start_at", "발생 일시", "TIMESTAMP"),
      col("end_at", "종료 일시", "TIMESTAMP", undefined, true),
      col("source_name", "출처", "TEXT", undefined, true),
      col("source_url", "출처 URL", "TEXT", undefined, true),
      col("recorded_by", "등록자", "VARCHAR", undefined, true),
      col("recorded_at", "등록 일시", "TIMESTAMP", undefined, true),
      col("summary", "요약", "TEXT"),
      col("before", "변경 전", "TEXT"),
      col("after", "변경 후", "TEXT"),
      col("next", "후속 대응", "TEXT"),
      col("hidden", "현재 워크스페이스에서 숨김", "BOOLEAN"),
    ],
  },
  event_types: {
    label: "이벤트 유형",
    description: "기본 유형과 자동 등록된 유형을 관리하는 기준 테이블입니다.",
    columns: [
      col("id", "유형 ID", "VARCHAR", "PK"),
      col("label", "유형명", "VARCHAR"),
      col("description", "설명", "TEXT"),
      col("origin", "등록 방식", "VARCHAR"),
    ],
  },
  event_type_links: {
    label: "이벤트–유형 관계",
    description:
      "하나의 이벤트에 여러 유형을 연결하는 다대다 관계 테이블입니다.",
    columns: [
      col("event_id", "이벤트 ID · 복합 PK", "VARCHAR", "FK"),
      col("type_id", "유형 ID · 복합 PK", "VARCHAR", "FK"),
    ],
  },
};
type TableName = keyof typeof schemas;
const names = Object.keys(schemas) as TableName[];
const money = new Set(["revenue", "expenses", "net_profit"]);
function display(value: Row[string], field: string) {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number")
    return `${money.has(field) ? "₩" : ""}${value.toLocaleString("ko-KR")}`;
  return value;
}
export function DataExplorer() {
  const { events } = useEventCatalog();
  const { hiddenIds } = useEventVisibility();
  const { preferences, workspace } = useAnalysisPreferences();
  const [table, setTable] = useState<TableName>("daily_performance");
  const [mode, setMode] = useState<"rows" | "schema">("rows");
  const [query, setQuery] = useState("");
  const [relationColumn, setRelationColumn] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Row | null>(null);
  const [start, setStart] = useState("2026-08-19");
  const [end, setEnd] = useState(MAX_DATE);
  const tables = useMemo<Record<TableName, Row[]>>(() => {
    const definitions = new Map(
      preferences.typeDefinitions.map((t) => [t.id, t]),
    );
    for (const event of events)
      for (const id of event.types)
        if (!definitions.has(id))
          definitions.set(id, { id, ...getEventType(id), origin: "AI" });
    return {
      channel_daily_performance: buildChannelDaily({
        start: MIN_DATE,
        end: MAX_DATE,
      })
        .reverse()
        .map((r) => ({
          workspace_id: workspace,
          date: r.date,
          channel: r.channel,
          lines: r.lines,
          new_lines: r.newLines,
          transfers: r.transfers,
          revenue: r.revenue,
        })),
      daily_performance: buildPerformance(
        { start: MIN_DATE, end: MAX_DATE },
        "day",
      )
        .reverse()
        .map((r) => ({
          workspace_id: workspace,
          date: r.key,
          lines: r.customers,
          cancellations: r.cancellations,
          revenue: r.revenue,
          expenses: r.expenses,
          net_profit: r.netProfit,
        })),
      events: [...events]
        .sort((a, b) => b.startAt.localeCompare(a.startAt))
        .map((e) => ({
          id: e.id,
          title: e.title,
          operator: e.operator,
          channel: e.channel,
          start_at: e.startAt,
          end_at: e.endAt ?? null,
          source_name: e.sourceName ?? null,
          source_url: e.sourceUrl ?? null,
          recorded_by: e.recordedBy ?? null,
          recorded_at: e.recordedAt ?? null,
          summary: e.summary,
          before: e.before,
          after: e.after,
          next: e.next,
          hidden: hiddenIds.includes(e.id),
        })),
      event_types: [...definitions.values()].map((t) => ({
        id: t.id,
        label: t.label,
        description: t.description,
        origin: t.origin,
      })),
      event_type_links: events.flatMap((e) =>
        [...new Set(e.types)].map((type) => ({
          event_id: e.id,
          type_id: type,
        })),
      ),
    };
  }, [events, hiddenIds, preferences.typeDefinitions, workspace]);
  const schema = schemas[table];
  const dated =
    table === "daily_performance" ||
    table === "channel_daily_performance" ||
    table === "events";
  const invalid = dated && !!start && !!end && start > end;
  const rows = tables[table].filter((row) => {
    const date = String(row.date ?? row.start_at ?? "").slice(0, 10);
    return (
      !invalid &&
      (!relationColumn || String(row[relationColumn]) === query) &&
      (!dated || ((!start || date >= start) && (!end || date <= end))) &&
      Object.values(row).some((v) =>
        String(v ?? "NULL")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    );
  });
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const current = Math.min(page, pages - 1);
  const navigate = (
    next: TableName,
    search = "",
    column: string | null = null,
  ) => {
    setRelationColumn(column);
    setTable(next);
    setQuery(search);
    setPage(0);
    setSelected(null);
    setMode("rows");
    if (search) {
      setStart("");
      setEnd("");
    }
  };
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">데이터</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            실적과 이벤트의 원본 레코드·컬럼·관계를 탐색합니다.
          </p>
        </div>

      </header>
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">테이블 탐색기</CardTitle>
            <CardDescription className="font-mono text-xs">
              mars / {workspace}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {names.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => navigate(name)}
                aria-pressed={table === name}
                className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted ${table === name ? "border-primary bg-primary/5" : "border-transparent"}`}
              >
                <span className="flex items-center justify-between text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <Table2 className="size-4" />
                    {schemas[name].label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tables[name].length}
                  </span>
                </span>
                <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                  {name}
                </span>
              </button>
            ))}
            <div className="border-t pt-4 text-xs leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">관계 구조</p>
              <p>events.id → event_type_links.event_id</p>
              <p>event_types.id → event_type_links.type_id</p>
              <p className="mt-2">
                실적과 이벤트는 일자로 비교하며, 직접적인 외래 키 관계는
                없습니다.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="font-mono text-base">{table}</CardTitle>
                <CardDescription className="mt-1">
                  {schema.description}
                </CardDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={mode === "rows" ? "secondary" : "ghost"}
                  onClick={() => setMode("rows")}
                >
                  데이터
                </Button>
                <Button
                  size="sm"
                  variant={mode === "schema" ? "secondary" : "ghost"}
                  onClick={() => setMode("schema")}
                >
                  컬럼 정의
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === "rows" ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-48 flex-1">
                    <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      aria-label="레코드 검색"
                      placeholder="모든 컬럼에서 검색"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setRelationColumn(null);
                        setPage(0);
                        setSelected(null);
                      }}
                    />
                  </div>
                  {dated && (
                    <>
                      <Input
                        className="w-auto"
                        type="date"
                        aria-label="조회 시작일"
                        value={start}
                        onChange={(e) => {
                          setStart(e.target.value);
                          setPage(0);
                          setSelected(null);
                        }}
                      />
                      <span className="text-muted-foreground">~</span>
                      <Input
                        className="w-auto"
                        type="date"
                        aria-label="조회 종료일"
                        value={end}
                        onChange={(e) => {
                          setEnd(e.target.value);
                          setPage(0);
                          setSelected(null);
                        }}
                      />
                    </>
                  )}
                </div>
                {invalid && (
                  <p role="alert" className="text-sm text-destructive">
                    종료일은 시작일 이후로 선택해 주세요.
                  </p>
                )}
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {schema.columns.map((c) => (
                          <th
                            key={c.name}
                            className="whitespace-nowrap px-4 py-3 font-medium"
                          >
                            <span className="flex items-center gap-1">
                              {c.key && (
                                <span className="text-xs text-primary">
                                  {c.key}
                                </span>
                              )}
                              {c.label}
                            </span>
                            <span className="font-mono text-[10px] font-normal text-muted-foreground">
                              {c.name}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows
                        .slice(current * 10, current * 10 + 10)
                        .map((row, i) => (
                          <tr
                            key={i}
                            tabIndex={0}
                            aria-label={`레코드 ${current * 10 + i + 1} 상세`}
                            onClick={() => setSelected(row)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelected(row);
                              }
                            }}
                            className={`cursor-pointer border-t hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary ${selected === row ? "bg-primary/5" : ""}`}
                          >
                            {schema.columns.map((c) => (
                              <td
                                key={c.name}
                                className="max-w-64 truncate whitespace-nowrap px-4 py-3 tabular-nums"
                                title={String(display(row[c.name], c.name))}
                              >
                                {display(row[c.name], c.name)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      {!rows.length && (
                        <tr>
                          <td
                            colSpan={schema.columns.length}
                            className="h-40 text-center text-muted-foreground"
                          >
                            조회된 레코드가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {rows.length.toLocaleString("ko-KR")}건 · {current + 1} /{" "}
                    {pages} 페이지
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!current}
                      onClick={() => setPage(current - 1)}
                    >
                      이전
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={current + 1 >= pages}
                      onClick={() => setPage(current + 1)}
                    >
                      다음
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {["컬럼", "설명", "자료형", "키", "NULL 허용"].map(
                        (t) => (
                          <th key={t} className="p-3">
                            {t}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {schema.columns.map((c) => (
                      <tr key={c.name} className="border-t">
                        <td className="p-3 font-mono text-xs">{c.name}</td>
                        <td className="p-3">{c.label}</td>
                        <td className="p-3 font-mono text-xs">{c.type}</td>
                        <td className="p-3">{c.key ?? "—"}</td>
                        <td className="p-3">{c.nullable ? "허용" : "필수"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {selected && mode === "rows" && (
              <section className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <KeyRound className="size-4" />
                    레코드 상세
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="상세 닫기"
                    onClick={() => setSelected(null)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {schema.columns.map((c) => (
                    <div key={c.name} className="min-w-0">
                      <dt className="font-mono text-xs text-muted-foreground">
                        {c.name} · {c.label}
                      </dt>
                      <dd className="mt-1 break-words text-sm">
                        {display(selected[c.name], c.name)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  {table === "events" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(
                          "event_type_links",
                          String(selected.id),
                          "event_id",
                        )
                      }
                    >
                      <Link2 className="size-3" />
                      연결된 유형 조회
                    </Button>
                  )}
                  {table === "event_types" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(
                          "event_type_links",
                          String(selected.id),
                          "type_id",
                        )
                      }
                    >
                      연결된 이벤트 조회
                    </Button>
                  )}
                  {table === "event_type_links" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate("events", String(selected.event_id), "id")
                        }
                      >
                        이벤트 조회
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(
                            "event_types",
                            String(selected.type_id),
                            "id",
                          )
                        }
                      >
                        유형 조회
                      </Button>
                    </>
                  )}
                </div>
              </section>
            )}
          </CardContent>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground">
        금액 단위는 ₩이며, NULL은 미기록 값입니다.
      </p>
    </div>
  );
}
