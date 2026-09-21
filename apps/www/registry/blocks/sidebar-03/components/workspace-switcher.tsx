"use client";

import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";

import { useWorkspaceTransition } from "./workspace-transition";

const workspaces = [
  { id: "air", name: "air" },
  { id: "tds", name: "TDS" },
  { id: "mvno", name: "MVNO" },
] as const;

function WorkspaceIcon({ id }: { id: (typeof workspaces)[number]["id"] }) {
  const size = id === "mvno" ? "size-8" : id === "air" ? "h-5 w-6" : "size-5";
  return (
    <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center">
      {/* CSS switches assets before hydration, including system theme changes. */}
      <img src={`/images/workspaces/${id}-light.svg`} alt="" width={32} height={32} className={`${size} object-contain dark:hidden`} />
      <img src={`/images/workspaces/${id}-dark.svg`} alt="" width={32} height={32} className={`${size} hidden object-contain dark:block`} />
    </span>
  );
}

function useWorkspace() {
  const params = useSearchParams();
  return (
    workspaces.find((item) => item.id === params.get("workspace")) ??
    workspaces[0]
  );
}

export function WorkspaceName() {
  return <>{useWorkspace().name}</>;
}

export function WorkspaceSwitcher() {
  const active = useWorkspace();
  const navigate = useWorkspaceTransition();
  const params = useSearchParams();
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            aria-label={`${active.name} 워크스페이스 전환`}
            className="gap-3 data-popup-open:bg-sidebar-accent"
            size="lg"
            tooltip={`${active.name} 워크스페이스`}
          >
            <WorkspaceIcon id={active.id} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left font-semibold">
                  {active.name}
                </span>
                <ChevronsUpDown
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
              </>
            )}
          </SidebarMenuButton>
        }
      />
      <DropdownMenuContent
        align="start"
        aria-label="워크스페이스 선택"
        className="min-w-44"
        matchAnchorWidth={!isCollapsed}
        side={isCollapsed ? "right" : "bottom"}
      >
        {workspaces.map((workspace) => {
          const query = new URLSearchParams(params.toString());
          query.set("workspace", workspace.id);
          return (
            <DropdownMenuLinkItem
              aria-current={active.id === workspace.id ? "page" : undefined}
              className="gap-3 py-3 aria-[current=page]:bg-accent aria-[current=page]:font-semibold"
              key={workspace.id}
              render={
                <Link
                  href={`${pathname}?${query}`}
                  onNavigate={(event) => {
                    if (!navigate) return;
                    event.preventDefault();
                    navigate(
                      `${pathname}?${query}`,
                      workspace.id,
                      workspace.name,
                    );
                  }}
                  scroll={false}
                />
              }
            >
              <WorkspaceIcon id={workspace.id} />
              <span>{workspace.name}</span>
            </DropdownMenuLinkItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
