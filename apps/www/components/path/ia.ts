import {
  CalendarRange,
  Database,
  FlaskConical,
  Gauge,
  Globe2,
  Layers,
  type LucideIcon,
  PieChart,
  Settings2,
  Store,
} from "lucide-react";

export type Workspace = "home" | "aiir" | "tdds" | "mvvno";
export type NavLeaf = { label: string; query: Record<string, string> };
export type NavItem = {
  label: string;
  icon: LucideIcon;
  view: string;
  children?: NavLeaf[];
};

export const CAMPAIGN_STEPS = [
  { id: "register", label: "등록" },
  { id: "forecast", label: "결과 예측" },
  { id: "adjust", label: "계획 조정" },
  { id: "execute", label: "실행·관리" },
  { id: "analyze", label: "성과 분석" },
] as const;
export type CampaignStep = (typeof CAMPAIGN_STEPS)[number]["id"];

export const DATA_TABLES = [
  { id: "performance", label: "실적·관측" },
  { id: "events", label: "변화·이벤트" },
  { id: "offers", label: "상품·판매 조건" },
  { id: "campaigns", label: "판매 정책·캠페인" },
  { id: "reference", label: "채널·기준정보" },
  { id: "targets", label: "목표·손익·전망" },
] as const;
export type DataTableId = (typeof DATA_TABLES)[number]["id"];

export const SETTINGS_TABS = [
  { id: "sources", label: "참조 소스 관리" },
  { id: "types", label: "참조 이벤트 유형 관리" },
  { id: "pivot", label: "변곡점 판단 기준" },
] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

const campaignLeaves = (): NavLeaf[] =>
  CAMPAIGN_STEPS.map((s) => ({
    label: s.label,
    query: { view: "campaigns", step: s.id },
  }));

export const NAV: Record<Workspace, NavItem[]> = {
  home: [
    { label: "Online 통합 현황", icon: Gauge, view: "online" },
    { label: "MVVNO 현황", icon: Globe2, view: "mvvno-summary" },
  ],
  aiir: [
    { label: "현황", icon: Gauge, view: "overview" },
    { label: "이벤트 타임라인", icon: CalendarRange, view: "timeline" },
    { label: "상품·채널", icon: Store, view: "products" },
    {
      label: "판매 정책·캠페인",
      icon: FlaskConical,
      view: "campaigns",
      children: campaignLeaves(),
    },
  ],
  tdds: [
    { label: "현황", icon: Gauge, view: "overview" },
    { label: "이벤트 타임라인", icon: CalendarRange, view: "timeline" },
    { label: "상품·채널", icon: Store, view: "products" },
    {
      label: "판매 정책·캠페인",
      icon: FlaskConical,
      view: "campaigns",
      children: campaignLeaves(),
    },
  ],
  mvvno: [
    { label: "시장 현황", icon: PieChart, view: "market" },
    { label: "이벤트 타임라인", icon: CalendarRange, view: "timeline" },
    { label: "상품·포트폴리오", icon: Layers, view: "portfolio" },
    {
      label: "판매 정책·캠페인",
      icon: FlaskConical,
      view: "campaigns",
      children: campaignLeaves(),
    },
  ],
};
export const COMMON_NAV: NavItem[] = [
  {
    label: "데이터",
    icon: Database,
    view: "data",
    children: DATA_TABLES.map((t) => ({
      label: t.label,
      query: { view: "data", table: t.id },
    })),
  },
  {
    label: "설정",
    icon: Settings2,
    view: "settings",
    children: SETTINGS_TABS.map((t) => ({
      label: t.label,
      query: { view: "settings", tab: t.id },
    })),
  },
];

export const DEFAULT_VIEW: Record<Workspace, string> = {
  home: "online",
  aiir: "overview",
  tdds: "overview",
  mvvno: "market",
};
export const isWorkspace = (v: string | null): v is Workspace =>
  v === "home" || v === "aiir" || v === "tdds" || v === "mvvno";

export function viewTitle(
  ws: Workspace,
  view: string,
  params: URLSearchParams,
) {
  if (view === "data")
    return `데이터 · ${DATA_TABLES.find((t) => t.id === params.get("table"))?.label ?? DATA_TABLES[0].label}`;
  if (view === "settings")
    return `설정 · ${SETTINGS_TABS.find((t) => t.id === params.get("tab"))?.label ?? SETTINGS_TABS[0].label}`;
  const item = NAV[ws].find((n) => n.view === view) ?? NAV[ws][0];
  if (view === "campaigns")
    return `${item.label} · ${CAMPAIGN_STEPS.find((s) => s.id === params.get("step"))?.label ?? "등록"}`;
  return item.label;
}

/** Feature flag for rollback: NEXT_PUBLIC_PATH_UI=v1 restores the previous UI. */
export const PATH_V2 = process.env.NEXT_PUBLIC_PATH_UI !== "v1";
