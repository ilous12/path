"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  Fragment,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const WorkspaceTransitionContext = createContext<
  ((href: string, id: string, name: string) => void) | null
>(null);
export const useWorkspaceTransition = () =>
  useContext(WorkspaceTransitionContext);

export function WorkspaceTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const workspace = params.get("workspace") ?? "air";
  const [pending, setPending] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const loadingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pending) return;
    loadingRef.current?.focus();
    const timer = window.setTimeout(() => setMinimumElapsed(true), 2000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  useEffect(() => {
    if (pending && minimumElapsed && workspace === pending.id) setPending(null);
  }, [pending, minimumElapsed, workspace]);

  useEffect(() => {
    const cancelPending = () => { setPending(null); setMinimumElapsed(false); };
    window.addEventListener("popstate", cancelPending);
    return () => window.removeEventListener("popstate", cancelPending);
  }, []);

  const navigate = (href: string, id: string, name: string) => {
    if (pending || workspace === id) return;
    setMinimumElapsed(false);
    setPending({ id, name });
    router.push(href, { scroll: false });
  };

  return (
    <WorkspaceTransitionContext.Provider value={navigate}>
      <div
        aria-busy={pending !== null}
        className="contents"
        inert={pending !== null}
      >
        {pending ? null : <Fragment key={workspace}>{children}</Fragment>}
      </div>
      {pending && (
        <div
          aria-live="polite"
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-background text-foreground outline-none"
          ref={loadingRef}
          role="status"
          tabIndex={-1}
        >
          <LoaderCircle
            aria-hidden="true"
            className="size-10 animate-spin text-primary motion-reduce:animate-none"
          />
          <div className="space-y-2 text-center">
            <p className="text-xl font-semibold">{pending.name} 워크스페이스</p>
            <p className="text-sm text-muted-foreground">
              대시보드를 구성하고 있습니다…
            </p>
          </div>
        </div>
      )}
    </WorkspaceTransitionContext.Provider>
  );
}
