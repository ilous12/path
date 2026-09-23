import { AnalysisNavigationTracker } from "@/components/market-performance/analysis-navigation";
import { TimelineRangeProvider } from "@/components/market-performance/timeline-range";
import { Suspense } from "react";
import { AIChat } from "@/registry/blocks/sidebar-03/components/ai-chat";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TimelineRangeProvider>
      <Suspense fallback={null}>
        <AnalysisNavigationTracker />
      </Suspense>
      <Suspense
        fallback={
          <div
            className="min-h-screen bg-background"
            aria-label="화면을 불러오는 중"
          />
        }
      >
        <AIChat>
          {/* Same overlay scrollbar as in-page lists (Lumi ScrollArea). */}
          <ScrollArea className="h-dvh">{children}</ScrollArea>
        </AIChat>
      </Suspense>
    </TimelineRangeProvider>
  );
}
