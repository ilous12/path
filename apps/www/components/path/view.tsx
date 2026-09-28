"use client";
import { useSearchParams } from "next/navigation";
import { DEFAULT_VIEW, isWorkspace, viewTitle, type Workspace } from "./ia";
import { CampaignsPage } from "./pages/campaigns";
import { DataPage } from "./pages/data";
import { MvvnoHome, OnlineHome } from "./pages/home";
import { MvvnoMarket, MvvnoPortfolio } from "./pages/mvvno";
import { OverviewPage } from "./pages/overview";
import { ProductsChannels } from "./pages/products";
import { SettingsPage } from "./pages/settings";
import { TimelinePage } from "./pages/timeline";

function useRoute() {
  const params = useSearchParams();
  const ws: Workspace = isWorkspace(params.get("workspace"))
    ? (params.get("workspace") as Workspace)
    : "aiir";
  const view = params.get("view") ?? DEFAULT_VIEW[ws];
  return { ws, view, params };
}

export function PathTitle() {
  const { ws, view, params } = useRoute();
  return <>{viewTitle(ws, view, params)}</>;
}

export function PathView() {
  const { ws, view } = useRoute();
  if (view === "data") return <DataPage />;
  if (view === "settings") return <SettingsPage />;
  if (ws === "home")
    return view === "mvvno-summary" ? <MvvnoHome /> : <OnlineHome />;
  if (view === "timeline") return <TimelinePage biz={ws} key={ws} />;
  if (view === "campaigns") return <CampaignsPage biz={ws} key={ws} />;
  if (ws === "mvvno")
    return view === "portfolio" ? <MvvnoPortfolio /> : <MvvnoMarket />;
  if (view === "products") return <ProductsChannels biz={ws} key={ws} />;
  return <OverviewPage biz={ws} key={ws} />;
}
