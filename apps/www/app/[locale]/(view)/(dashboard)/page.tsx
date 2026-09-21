import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ModeSwitcher } from "@/components/mode-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  MainContent,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/registry/blocks/sidebar-03/components/app-sidebar";
import {
  DashboardView,
  DashboardViewTitle,
} from "@/registry/blocks/sidebar-03/components/dashboard-view";
import { Notifications } from "@/registry/blocks/sidebar-03/components/vercel-notification";
import { WorkspaceName } from "@/registry/blocks/sidebar-03/components/workspace-switcher";

import { WorkspaceTransition } from "@/registry/blocks/sidebar-03/components/workspace-transition";

const GROUP_ID = "main-layout-persistence";

export default function Page() {
  return (
    <NuqsAdapter>
      <WorkspaceTransition>
        <SidebarProvider
          collapsibleType="icon"
          defaultLayout={undefined}
          restoreLayoutCookie
          groupId={GROUP_ID}
        >
          <AppSidebar />
          <MainContent className="bg-background">
            <header className="flex h-12 bg-background z-10 sticky top-0 items-center gap-2 p-2 sm:p-4">
              <SidebarTrigger />
              <Separator className="mr-2 h-4" orientation="vertical" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      <WorkspaceName /> · <DashboardViewTitle />
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div className="ml-auto flex gap-2">
                <Notifications />
                <ThemeSwitcher />
                <ModeSwitcher />
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4 sm:pt-2">
              <DashboardView />
            </div>
          </MainContent>
        </SidebarProvider>
      </WorkspaceTransition>
    </NuqsAdapter>
  );
}
