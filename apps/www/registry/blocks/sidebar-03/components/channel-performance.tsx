"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Radio, ArrowRightLeft, EllipsisVertical } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { buildChannels } from "@/components/market-performance/channel-data";
import {
  grainFor,
  bucketKey,
  type Range,
} from "@/components/market-performance/data";
const format = (value: number) => value.toLocaleString("ko-KR");
export function ChannelPerformance({
  range,
  workspace,
}: {
  range: Range;
  workspace: string;
}) {
  const channels = useMemo(() => buildChannels(range), [range]);
  const [page, setPage] = useState(0);
  const [selectedName, setSelectedName] = useState("APP");
  const selected = channels.find((c) => c.name === selectedName) ?? channels[0];
  const total = channels.reduce((s, c) => s + c.total, 0);
  const totalRevenue = channels.reduce((s, c) => s + c.revenue, 0);
  const pages = Math.ceil(channels.length / 5);
  const rows = channels.slice(page * 5, page * 5 + 5);
  const share = (n: number, d: number) => (d ? (n / d) * 100 : 0);
  const trend = useMemo(() => {
    const grouped = new Map<
      string,
      { date: string; newLines: number; transfers: number }
    >();
    for (const row of selected.daily) {
      const key = bucketKey(row.date, grainFor(range));
      const item = grouped.get(key) ?? { date: key, newLines: 0, transfers: 0 };
      item.newLines += row.newLines;
      item.transfers += row.transfers;
      grouped.set(key, item);
    }
    return [...grouped.values()];
  }, [selected, range]);
  return (
    <section className="space-y-3" aria-label="채널 실적 및 상세">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wider text-primary">03 · 채널 점검</p><h2 className="text-lg font-semibold">가입 흐름과 채널 기여</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            채널별 가입·매출 기여를 비교하세요.
          </p>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {range.start} ~ {range.end}
        </span>
      </div>
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="h-full min-w-0">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>
                {workspace === "air" ? "air" : workspace.toUpperCase()} · 전체
                채널
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {channels.length}개 채널
              </span>
            </div>
            <CardDescription>
              행을 선택하면 오른쪽에서 채널 상세를 확인할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="flex flex-wrap gap-x-8 gap-y-2 rounded-lg bg-muted/30 px-4 py-3">
              <div>
                <p className="text-xs text-muted-foreground">전체 회선</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {format(total)}
                  <span className="ml-1 text-xs font-normal">회선</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">전체 매출</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  ₩{format(totalRevenue)}
                </p>
              </div>
            </div>
            <div className="min-h-[320px] overflow-x-auto">
              <table className="w-full whitespace-nowrap text-xs xl:text-sm">
                <thead className="border-b text-xs text-muted-foreground">
                  <tr>
                    <th className="h-10 pl-3 text-left font-medium">채널</th>
                    <th className="px-2 text-right font-medium">회선</th>
                    <th className="px-2 text-right font-medium">매출</th>
                    <th className="px-2 text-right font-medium">회선 비중</th>
                    <th className="w-10"><span className="sr-only">상세 메뉴</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((channel) => (
                    <tr
                      key={channel.name}
                      tabIndex={0}
                      aria-label={`${channel.name} 채널 상세`}
                      aria-selected={selected.name === channel.name}
                      onClick={() => setSelectedName(channel.name)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedName(channel.name);
                        }
                      }}
                      className={`h-14 cursor-pointer border-b outline-offset-[-2px] transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary ${selected.name === channel.name ? "bg-primary/5" : ""}`}
                    >
                      <td
                        className={`border-l-2 pl-3 font-semibold ${selected.name === channel.name ? "border-l-primary text-primary" : "border-l-transparent"}`}
                      >
                        <span className="flex items-center gap-2">
                          <Link onClick={e=>e.stopPropagation()} className="hover:underline" aria-label={`${channel.name} 채널 분석 상세보기`} href={`/analysis?workspace=${workspace}&channel=${encodeURIComponent(channel.name)}&start=${range.start}&end=${range.end}`}>{channel.name}</Link>
                          {selected.name === channel.name && (
                            <ArrowUpRight className="size-3" />
                          )}
                        </span>
                      </td>
                      <td className="px-2 text-right tabular-nums">
                        {format(channel.total)}
                      </td>
                      <td className="px-2 text-right tabular-nums">
                        ₩{format(channel.revenue)}
                      </td>
                      <td className="px-2">
                        <div className="ml-auto w-12 space-y-1.5 xl:w-20">
                          <p className="text-right text-xs tabular-nums">
                            {share(channel.total, total).toFixed(1)}%
                          </p>
                          <Progress
                            value={share(channel.total, total)}
                            aria-label={`${channel.name} 회선 비중`}
                          />
                        </div>
                      </td>
                      <td className="w-10 px-1" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`${channel.name} 채널 메뉴`} />}>
                            <EllipsisVertical className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" matchAnchorWidth={false} className="w-40">
                            <DropdownMenuItem render={<Link href={`/analysis?workspace=${encodeURIComponent(workspace)}&channel=${encodeURIComponent(channel.name)}&start=${range.start}&end=${range.end}`} />}>
                              <ArrowUpRight className="size-4" />
                              상세보기
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav
              aria-label="채널 페이지 이동"
              className="mt-auto flex items-center justify-between border-t pt-3 text-sm"
            >
              <span className="text-muted-foreground">
                {page + 1} / {pages} 페이지
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!page}
                  onClick={() => {
                    setPage(page - 1);
                    setSelectedName(channels[(page - 1) * 5].name);
                  }}
                >
                  이전
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page + 1 === pages}
                  onClick={() => {
                    setPage(page + 1);
                    setSelectedName(channels[(page + 1) * 5].name);
                  }}
                >
                  다음
                </Button>
              </div>
            </nav>
          </CardContent>
        </Card>
        <Card
          className="h-full min-w-0 border-primary/25"
          aria-label="선택 채널 상세"
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selected.name} · 채널 상세</CardTitle>
              <div className="flex shrink-0 items-center gap-1">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  전체 회선의 {share(selected.total, total).toFixed(1)}%
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`${selected.name} 채널 상세보기 메뉴`} />}>
                    <EllipsisVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" matchAnchorWidth={false} className="w-40">
                    <DropdownMenuItem render={<Link href={`/analysis?workspace=${encodeURIComponent(workspace)}&channel=${encodeURIComponent(selected.name)}&start=${range.start}&end=${range.end}`} />}>
                      <ArrowUpRight className="size-4" />
                      상세보기
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <CardDescription>
              선택 기간의 가입 구성과 매출 기여를 확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent
            className="flex flex-1 flex-col gap-5"
            aria-live="polite"
          >
            <div className="grid grid-cols-2 gap-4 border-b pb-4">
              <div>
                <p className="text-xs text-muted-foreground">총 회선</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {format(selected.total)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    회선
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">매출</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">
                  ₩{format(selected.revenue)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  전체 매출의 {share(selected.revenue, totalRevenue).toFixed(1)}
                  %
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "010 신규", value: selected.newLines, Icon: Radio },
                {
                  label: "번호이동",
                  value: selected.transfers,
                  Icon: ArrowRightLeft,
                },
              ].map(({ label, value, Icon }) => (
                <div key={label} className="rounded-lg bg-muted/30 p-3">
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon className="size-3.5" />
                    {label}
                  </p>
                  <p className="mt-2 text-lg font-semibold tabular-nums">
                    {format(value)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      회선
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-primary">
                    {share(value, selected.total).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-auto">
              <div className="mb-3 flex justify-between text-xs">
                <span className="font-medium">가입 구성 추이</span>
                <span className="text-muted-foreground">
                  010 신규 · 번호이동
                </span>
              </div>
              <ChartContainer
                className="h-32 w-full"
                config={{
                  newLines: { label: "010 신규", color: "var(--chart-2)" },
                  transfers: { label: "번호이동", color: "var(--chart-4)" },
                }}
              >
                <AreaChart
                  data={trend}
                  margin={{ top: 4, left: 0, right: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 4" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => String(v).slice(5) || String(v)}
                    minTickGap={40}
                    axisLine={false}
                    tickLine={false}
                    fontSize={9}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    dataKey="newLines"
                    stackId="lines"
                    fill="var(--color-newLines)"
                    stroke="var(--color-newLines)"
                    fillOpacity={0.25}
                  />
                  <Area
                    dataKey="transfers"
                    stackId="lines"
                    fill="var(--color-transfers)"
                    stroke="var(--color-transfers)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
            <p className="border-t pt-3 text-xs text-muted-foreground">
              총 회선 = 010 신규 + 번호이동 · 상단 선택 기간 기준
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
