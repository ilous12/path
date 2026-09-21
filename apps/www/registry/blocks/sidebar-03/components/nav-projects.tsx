"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavProjects({
  projects,
}: {
  projects: { name: string; url: string; icon: LucideIcon }[];
}) {
  const params = useSearchParams();
  const href = (view: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("view", view);
    return `/?${next.toString()}`;
  };
  return (
    <SidebarGroup className="group-data-[state=collapsed]:hidden">
      <SidebarGroupLabel>프로젝트</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton
              isActive={params.get("view") === item.url}
              render={<Link href={href(item.url)} />}
            >
              <item.icon />
              <span>{item.name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
