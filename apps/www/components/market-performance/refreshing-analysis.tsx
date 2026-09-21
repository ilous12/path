"use client";
import { DetailLoading } from "./detail-loading";
import {
  useEffect,
  useState,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { analysisEntryStore } from "./analysis-entry";
export function RefreshingAnalysis({
  refreshKey,
  children,
  mode = "analysis",
}: {
  mode?: "analysis" | "detail";
  refreshKey: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const route = useRef(pathname);
  const entry = useSyncExternalStore(
    analysisEntryStore.subscribe,
    () => analysisEntryStore.get(route.current),
    () => 0,
  );
  const analysisKey = `${refreshKey}:entry:${entry}`;
  const [ready, setReady] = useState<string | null>(null);
  const loading = ready !== analysisKey;
  useEffect(() => {
    if (ready === analysisKey) return;
    const timer = setTimeout(
      () => setReady(analysisKey),
      mode === "detail" ? 450 : 1200,
    );
    return () => clearTimeout(timer);
  }, [analysisKey, ready, mode]);
  return (
    <div aria-busy={loading} className="relative space-y-6">
      <div
        className={`space-y-6 transition-opacity duration-200 ${loading ? "invisible" : "visible"}`}
        inert={loading}
      >
        {children}
      </div>
      {loading && (
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-background">
          <DetailLoading mode={mode} />
        </div>
      )}
    </div>
  );
}
