import type { ReactNode } from "react";
export function WorkspaceHeader({ children }: { children: ReactNode }) {
  return <header className="flex min-w-0 min-h-14 flex-wrap items-center justify-between gap-x-5 gap-y-3 pb-1 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight 2xl:[&_h1]:text-2xl [&_p]:max-w-3xl">{children}</header>;
}
