"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function PaginatedAnalysisList({
  children,
  label,
  emptyMessage,
}: {
  children: ReactNode[];
  label: string;
  emptyMessage: string;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(children.length / 5));
  const current = Math.min(page, pages - 1);
  return (
    <div className="space-y-4">
      <div className="grid min-h-[360px] auto-rows-[60px] content-start gap-3">
        {children.length ? (
          children.slice(current * 5, current * 5 + 5)
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </div>
      <nav
        aria-label={`${label} 페이지 이동`}
        className="flex items-center justify-between gap-2 border-t pt-3 text-sm"
      >
        <span className="text-muted-foreground">
          총 {children.length}개 · {current + 1} / {pages} 페이지
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            이전
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={current + 1 === pages}
            onClick={() => setPage(current + 1)}
          >
            다음
          </Button>
        </div>
      </nav>
    </div>
  );
}
