"use client";
import { useSearchParams } from "next/navigation";

import { Settings2, SquareTerminal, CalendarDays, FlaskConical, Network, Database, Tags, FileSignature, LayoutDashboard, ChartLine } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { NavMain } from "@/registry/blocks/sidebar-03/components/nav-main";
import { NavUser } from "@/registry/blocks/sidebar-03/components/nav-user";
import { WorkspaceSwitcher } from "@/registry/blocks/sidebar-03/components/workspace-switcher";

const dataMenu = { title: "데이터", url: "data", icon: Database };
const policyMenu = { title: "판매정책", url: "policies", icon: FileSignature };

const data = {
  navMain: [
    { title: "비즈니스", url: "summary", icon: SquareTerminal, isActive: true,
      items: [{title: "현황", url: "summary"}, {title: "실적", url: "kpi"}] },
    { title: "채널", url: "channels", icon: Network, isActive: true,
      items: [{title: "스펙트럼", url: "channels"}, {title: "검색", url: "channels-search"}] },
    { title: "요금제", url: "plans", icon: Tags, isActive: true,
      items: [{title:"스펙트럼",url:"plans"},{title:"경쟁력",url:"plans-competitiveness"},{title:"검색",url:"plans-search"}] },
    { title: "업계 동향", url: "events-search", icon: CalendarDays, isActive: true,
      items: [{title:"검색",url:"events-search"}] },
    policyMenu,
    { title: "캠페인", url: "experiments-search", icon: FlaskConical, isActive: true,
      items: [{title:"검색",url:"experiments-search"}] },
    dataMenu,
    { title: "관리", url: "admin", icon: Settings2, isActive: true,
      items: [{title: "설정", url: "admin"}, {title: "현재 설정", url: "settings-current"}] },
  ],

  user: {
    avatarUrl: "#",
    email: "test@",
    name: "테스터",
    role: "관리자",
  },
};

export function AppSidebar() {
  const isHome = useSearchParams().get("workspace") === "home";
  return (
    <Sidebar>
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent className="no-scrollbar">
        <NavMain items={isHome ? [{title:"사업 현황",url:"summary",icon:LayoutDashboard},policyMenu,{title:"실적",url:"kpi",icon:ChartLine},dataMenu] : data.navMain} />
      </SidebarContent>
      <SidebarSeparator className="mx-0" />
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
