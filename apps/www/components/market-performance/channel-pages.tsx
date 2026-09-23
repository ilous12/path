"use client";
import { useHistoryViewState } from "./history-view-state";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Pie, PieChart, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { ChannelPerformance } from "@/registry/blocks/sidebar-03/components/channel-performance";
import { buildChannels, CHANNELS } from "./channel-data";
import { WorkspaceHeader } from "./workspace-header";
import { AnalysisRangeControl } from "./analysis-range-control";
import { RefreshingAnalysis } from "./refreshing-analysis";
import { useTimelineRange } from "./timeline-range";
import { RecordMenu } from "./record-menu";
const number = (n: number) => n.toLocaleString("ko-KR");
const selectClass = "h-9 rounded-md border border-input bg-background px-3 text-sm";
export function ChannelPages({ search = false }: { search?: boolean }) {
  const workspace = useSearchParams().get("workspace") ?? "air";
  const [range, , mode, selectRange] = useTimelineRange(workspace);
  const [query, setQuery] = useHistoryViewState("channel-pages:query", "");
  const [channel, setChannel] = useHistoryViewState("channel-pages:channel", "");
  const [sort, setSort] = useHistoryViewState("channel-pages:sort", "total");
  const [page, setPage] = useHistoryViewState("channel-pages:page", 0);
  const channels = useMemo(() => buildChannels(range), [range]);
  const total = channels.reduce((sum, row) => sum + row.total, 0);
  const filtered = channels.filter(row => (!channel || channel === row.name) && row.name.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "ko") : sort === "revenue" ? b.revenue - a.revenue : b.total - a.total);
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, pages - 1);
  const rows = filtered.slice(currentPage * 5, currentPage * 5 + 5);
  const detail = (name: string) => `/analysis?${new URLSearchParams({workspace, channel: name, start: range.start, end: range.end})}`;
  const top = channels[0];
  const share = (value:number) => total ? value / total * 100 : 0;
  const topThreeShare = share(channels.slice(0,3).reduce((sum,c)=>sum+c.total,0));
  const transfers = channels.reduce((sum,c)=>sum+c.transfers,0);
  const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4", "#94a3b8"];
  const colorFor = (name:string) => colors[CHANNELS.findIndex(c=>c.id===name)] ?? colors[6];
  const pieData = channels.map(c=>({...c,fill:colorFor(c.name)}));
  return <div className="mx-auto w-full min-w-0 max-w-none space-y-6">
    <WorkspaceHeader><div><h1>{workspace.toUpperCase()} · 채널 {search ? "검색" : "스펙트럼"}</h1><p className="mt-2 text-sm text-muted-foreground">{search ? "채널별 가입과 매출을 조회하고 상세 분석으로 연결합니다." : "채널별 가입 구성과 기여도를 비교하고 운영 현황을 점검합니다."}</p></div><AnalysisRangeControl range={range} mode={mode} onChange={(next, nextMode) => {selectRange(next, nextMode); setPage(0);}} /></WorkspaceHeader>
    <RefreshingAnalysis mode="page" refreshKey={`${workspace}:${search}:${range.start}:${range.end}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{range.start} — {range.end} · {channels.length}개 채널</span></div>
      {search ? <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5" aria-label="채널 검색">
        <div className="flex flex-wrap items-center gap-3"><Input className="w-full sm:w-60" placeholder="채널명 검색" aria-label="채널명 검색" value={query} onChange={e => {setQuery(e.target.value); setPage(0);}} /><select className={selectClass} aria-label="채널 필터" value={channel} onChange={e => {setChannel(e.target.value); setPage(0);}}><option value="">전체 채널</option>{CHANNELS.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}</select><select className={selectClass} aria-label="채널 정렬" value={sort} onChange={e => {setSort(e.target.value); setPage(0);}}><option value="total">회선 많은 순</option><option value="revenue">매출 높은 순</option><option value="name">채널명 순</option></select><Button variant="ghost" size="sm" onClick={() => {setQuery(""); setChannel(""); setSort("total"); setPage(0);}}>초기화</Button></div>
        <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-sm"><thead className="border-b text-xs text-muted-foreground"><tr>{["채널", "회선", "010 신규", "번호이동", "매출", "회선 비중"].map((label, i) => <th key={label} className={`px-3 py-3 font-medium ${i ? "text-right" : "text-left"}`}>{label}</th>)}<th className="w-10"><span className="sr-only">메뉴</span></th></tr></thead><tbody>{rows.map(row => <tr key={row.name} className="border-b last:border-0 hover:bg-muted/40"><td className="px-3 py-4 font-semibold">{row.name}</td>{[number(row.total), number(row.newLines), number(row.transfers), `₩${number(row.revenue)}`, `${(total ? row.total / total * 100 : 0).toFixed(1)}%`].map((value, i) => <td key={i} className="px-3 py-4 text-right tabular-nums">{value}</td>)}<td><RecordMenu label={row.name} actions={[{label: "상세보기", href: detail(row.name)}]} /></td></tr>)}{!rows.length && <tr><td colSpan={7} className="py-16 text-center text-muted-foreground">조건에 맞는 채널이 없습니다.</td></tr>}</tbody></table></div>
        <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground"><span>{filtered.length}개 · {currentPage + 1} / {pages} 페이지</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>이전</Button><Button variant="outline" size="sm" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>다음</Button></div></div>
      </section> : <>
        <section className="grid gap-6 rounded-xl border bg-card p-5 xl:grid-cols-[minmax(0,1fr)_320px]" aria-label="채널 가입 스펙트럼">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">가입 구성 스펙트럼</h2><span className="text-xs text-muted-foreground">채널별 가입 비중 · 전체 {number(total)}회선</span></div>
            <div className="grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_190px]">
              {total ? <ChartContainer className="h-[300px] w-full aspect-auto sm:h-[340px]" config={Object.fromEntries(CHANNELS.map(c=>[c.id,{label:c.id,color:colorFor(c.id)}]))}>
                <PieChart accessibilityLayer>
                  <ChartTooltip content={({active,payload})=>{const row=payload?.[0]?.payload as (typeof channels)[number]|undefined;return active&&row?<div className="space-y-2 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-lg"><p className="font-semibold">{row.name} · {share(row.total).toFixed(1)}%</p><p>전체 가입 {number(row.total)}회선</p><p>010 신규 {number(row.newLines)} · 번호이동 {number(row.transfers)}</p></div>:null;}} />
                  <Pie data={pieData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius="85%" paddingAngle={1.5} stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
                    {pieData.map(row=><Cell key={row.name} fill={row.fill} />)}
                  </Pie>
                </PieChart>
              </ChartContainer> : <p className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">선택 기간에 가입 데이터가 없습니다.</p>}
              <ul aria-label="채널별 가입 비중" className="space-y-3">{channels.map(row=><li key={row.name} className="flex items-center gap-2.5 text-sm"><span className="size-2.5 shrink-0 rounded-full" style={{background:colorFor(row.name)}} /><span className="flex-1">{row.name}</span><span className="font-semibold tabular-nums">{share(row.total).toFixed(1)}%</span></li>)}</ul>
            </div>
          </div>
          <aside className="space-y-4 border-t pt-5 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6">
            <div><h3 className="font-semibold">AI 요약</h3><p className="mt-1 text-[11px] text-muted-foreground">선택 기간 지표 기반 자동 요약</p></div>
            {total ? <>
              <p className="text-sm leading-7"><strong>{top.name}</strong>이 {number(top.total)}회선으로 전체 가입의 <strong>{share(top.total).toFixed(1)}%</strong>를 담당합니다. 상위 3개 채널이 <strong>{topThreeShare.toFixed(1)}%</strong>를 차지합니다.</p>
              <div className="rounded-lg bg-muted/40 p-3 text-sm leading-6">번호이동 {share(transfers).toFixed(1)}% · 010 신규 {share(total-transfers).toFixed(1)}%<p className="mt-2 text-muted-foreground">{share(transfers)>=60 ? "번호이동 중심의 가입 구조입니다. 채널별 전환 혜택과 개통 완료 흐름을 우선 점검하세요." : "신규 가입 기여가 상대적으로 큽니다. 채널별 신규 고객 유입과 개통 완료 흐름을 비교하세요."}</p></div>
              <p className="border-t pt-3 text-sm leading-6 text-muted-foreground">{topThreeShare>=70 ? "상위 채널 집중도가 높습니다. 주요 채널의 유입 변동을 살피고 보조 채널의 기여 확대를 검토하세요." : "가입이 여러 채널에 분산되어 있습니다. 채널별 유입 비용과 고객 유지 성과를 함께 비교해 운영 우선순위를 정하세요."}</p>
            </> : <p className="text-sm text-muted-foreground">가입 실적이 확보되면 채널 기여도와 점검 항목을 요약합니다.</p>}
          </aside>
        </section>
        <ChannelPerformance range={range} workspace={workspace} />
      </>}
    </RefreshingAnalysis>
  </div>;
}
