import { LoaderCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
export function DetailLoading({
  mode = "analysis",
}: {
  mode?: "analysis" | "detail" | "page";
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[560px] space-y-5 rounded-xl bg-background p-5 sm:p-8"
    >
      <div className="flex items-center gap-3">
        <LoaderCircle
          aria-hidden
          className="size-5 animate-spin text-primary motion-reduce:animate-none"
        />
        <div>
          <p className="font-medium">
            {mode === "analysis"
              ? "선택한 조건으로 분석 중…"
              : mode === "page" ? "화면을 불러오는 중…" : "상세 내용을 불러오는 중…"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "analysis"
              ? "실적과 이벤트를 분석하고 있습니다."
              : mode === "page" ? "선택한 메뉴의 정보를 준비하고 있습니다." : "등록된 요건·기간·가정과 예측 결과를 준비하고 있습니다."}
          </p>
        </div>
      </div>
      <div aria-hidden="true" className="space-y-5">
        <Skeleton className="h-8 w-2/3 rounded-lg" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div
          className={`grid gap-3 ${mode === "analysis" ? "grid-cols-2 sm:grid-cols-4" : "sm:grid-cols-2"}`}
        >
          {Array.from({ length: mode === "analysis" ? 4 : 2 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}
