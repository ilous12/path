"use client";

import { Database, Settings2, SquareTerminal } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { NavMain } from "@/registry/blocks/sidebar-03/components/nav-main";
import { NavProjects } from "@/registry/blocks/sidebar-03/components/nav-projects";
import { NavUser } from "@/registry/blocks/sidebar-03/components/nav-user";
import { WorkspaceSwitcher } from "@/registry/blocks/sidebar-03/components/workspace-switcher";

const data = {
  navMain: [
    {
      icon: SquareTerminal,
      isActive: true,
      items: [
        { title: "타임라인", url: "summary" },
        { title: "이벤트", url: "events" },
      ],
      title: "대시보드",
      url: "summary",
    },
    {
      icon: Settings2,
      title: "관리",
      url: "admin",
      isActive: true,
      items: [{ title: "설정", url: "admin" }],
    },
  ],
  projects: [{ icon: Database, name: "데이터", url: "data" }],

  user: {
    avatarUrl: "#",
    email: "test@",
    name: "테스터",
    role: "관리자",
  },
};

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarSeparator className="mx-0" />
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
