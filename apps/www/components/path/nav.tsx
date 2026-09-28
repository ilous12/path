"use client";
import { Building2, ChevronRight, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { toast } from "@/components/ui/toast";
import { NavUser } from "@/registry/blocks/sidebar-03/components/nav-user";
import { WorkspaceSwitcher } from "@/registry/blocks/sidebar-03/components/workspace-switcher";
import {
  COMMON_NAV,
  DEFAULT_VIEW,
  isWorkspace,
  NAV,
  type NavItem,
  type NavLeaf,
  type Workspace,
} from "./ia";
import { SESSION } from "./state";

function useHref() {
  const params = useSearchParams();
  const ws: Workspace = isWorkspace(params.get("workspace"))
    ? (params.get("workspace") as Workspace)
    : "aiir";
  const period = params.get("period");
  const href = (query: Record<string, string>) => {
    const q = new URLSearchParams({ workspace: ws, ...query });
    if (period) q.set("period", period);
    return `/?${q}`;
  };
  const view = params.get("view") ?? DEFAULT_VIEW[ws];
  const active = (query: Record<string, string>) =>
    Object.entries(query).every(([k, v]) =>
      k === "view" ? view === v : (params.get(k) ?? defaults[k]) === v,
    );
  return { ws, href, active, view };
}
const defaults: Record<string, string> = {
  step: "register",
  table: "performance",
  tab: "sources",
};

function TenantCard() {
  const { isCollapsed } = useSidebar();
  const t = SESSION.tenant;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            aria-label="테넌트 전환"
            className="gap-3 data-popup-open:bg-sidebar-accent"
            size="lg"
            tooltip={`${t.name} · ${t.unit}`}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-primary to-primary/60 text-primary-foreground shadow-sm">
              <Building2 className="size-4" />
            </span>
            {!isCollapsed && (
              <>
                <span className="min-w-0 flex-1 text-left leading-tight">
                  <span className="block truncate text-[13px] font-semibold">
                    {t.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {t.unit} · {t.plan}
                  </span>
                </span>
                <ChevronsUpDown className="size-4 text-muted-foreground" />
              </>
            )}
          </SidebarMenuButton>
        }
      />
      <DropdownMenuContent
        align="start"
        className="min-w-56"
        side={isCollapsed ? "right" : "bottom"}
      >
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>테넌트</DropdownMenuGroupLabel>
          {SESSION.tenants.map((x) => (
            <DropdownMenuItem
              className="flex-col items-start gap-0"
              key={x.id}
              onClick={() =>
                x.id !== t.id &&
                toast.info({
                  title: "테넌트 전환 권한이 없습니다",
                  description: `${x.unit} 접근은 관리자 승인이 필요합니다.`,
                })
              }
            >
              <span className="text-[13px] font-medium">{x.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {x.unit}
                {x.id === t.id ? " · 현재" : ""}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Leaf({ leaf }: { leaf: NavLeaf }) {
  const { href, active } = useHref();
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        render={
          <Link
            aria-current={active(leaf.query) ? "page" : undefined}
            href={href(leaf.query)}
          />
        }
      >
        <span>{leaf.label}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function Items({ items }: { items: NavItem[] }) {
  const { href, view } = useHref();
  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => (
        <SidebarMenuItem key={item.view}>
          {item.children ? (
            <Collapsible defaultOpen={view === item.view}>
              <CollapsibleTrigger
                className="group/collapsible"
                render={
                  <SidebarMenuButton
                    data-active={view === item.view || undefined}
                    tooltip={{ children: item.label, side: "right" }}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    <ChevronRight className="ml-auto text-muted-foreground transition-transform duration-200 group-data-panel-open/collapsible:rotate-90" />
                  </SidebarMenuButton>
                }
              />
              <CollapsiblePanel>
                <SidebarMenuSub className="my-1 gap-0.5">
                  {item.children.map((leaf) => (
                    <Leaf key={leaf.label} leaf={leaf} />
                  ))}
                </SidebarMenuSub>
              </CollapsiblePanel>
            </Collapsible>
          ) : (
            <SidebarMenuButton
              data-active={view === item.view || undefined}
              render={
                <Link
                  aria-current={view === item.view ? "page" : undefined}
                  href={href({ view: item.view })}
                />
              }
              tooltip={item.label}
            >
              <item.icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function PathSidebar() {
  const { ws } = useHref();
  return (
    <Sidebar>
      <SidebarHeader className="gap-1">
        <TenantCard />
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent className="no-scrollbar">
        <SidebarGroup>
          <SidebarGroupLabel>
            {ws === "home" ? "통합" : "워크스페이스"}
          </SidebarGroupLabel>
          <Items items={NAV[ws]} />
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>공통</SidebarGroupLabel>
          <Items items={COMMON_NAV} />
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator className="mx-0" />
      <SidebarFooter>
        <NavUser
          user={{
            name: SESSION.user.name,
            email: `${SESSION.user.role} · ${SESSION.tenant.unit}`,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
