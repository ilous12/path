"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, type LucideIcon } from "lucide-react";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
      items?: { title: string; url: string }[];
    }[];
  }[];
}) {
  const params = useSearchParams();
  const current = params.get("view") ?? "summary";
  const href = (view: string) => {
    const next = new URLSearchParams();
    next.set("workspace", params.get("workspace") ?? "aiir");
    if (view === "summary") next.delete("view");
    else next.set("view", view);
    return `/?${next.toString()}`;
  };
  return (
    <SidebarGroup>
      <SidebarMenu className="gap-2">
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            {!item.items?.length ? (
              <SidebarMenuButton
                tooltip={item.title}
                render={
                  <Link
                    href={href(item.url)}
                    aria-current={current === item.url ? "page" : undefined}
                  />
                }
              >
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </SidebarMenuButton>
            ) : (
              <Collapsible defaultOpen={item.isActive}>
                <CollapsibleTrigger
                  className="group/collapsible"
                  render={
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        side: "right",
                      }}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto text-muted-foreground transition-[transform,colors] duration-200 group-data-panel-open/collapsible:rotate-90 group-data-panel-open/collapsible:text-foreground group-hover/collapsible:text-sidebar-foreground" />
                    </SidebarMenuButton>
                  }
                />
                <CollapsiblePanel>
                  <SidebarMenuSub className="my-2 gap-2">
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        {subItem.items?.length ? (
                          <Collapsible defaultOpen>
                            <CollapsibleTrigger
                              render={<SidebarMenuSubButton render={<button type="button" />} />}
                              className="group/plans"
                            >
                              <span>{subItem.title}</span>
                              <ChevronRight className="ml-auto size-3 transition-transform group-data-panel-open/plans:rotate-90" />
                            </CollapsibleTrigger>
                            <CollapsiblePanel>
                              <SidebarMenuSub className="my-2 gap-2">
                                {subItem.items.map((child) => (
                                  <SidebarMenuSubItem key={child.url}>
                                    <SidebarMenuSubButton
                                      render={
                                        <Link
                                          href={href(child.url)}
                                          aria-current={
                                            current === child.url
                                              ? "page"
                                              : undefined
                                          }
                                        >
                                          <span>{child.title}</span>
                                        </Link>
                                      }
                                    />
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsiblePanel>
                          </Collapsible>
                        ) : (
                          <>
                            <SidebarMenuSubButton
                              render={
                                <Link
                                  href={href(subItem.url)}
                                  aria-current={
                                    current === subItem.url ? "page" : undefined
                                  }
                                >
                                  <span>{subItem.title}</span>
                                </Link>
                              }
                            />
                          </>
                        )}
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsiblePanel>
              </Collapsible>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
