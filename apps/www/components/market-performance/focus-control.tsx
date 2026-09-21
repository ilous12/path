"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItemContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAnalysisPreferences } from "./use-analysis-preferences";
export const FOCUS_LABELS = {
  growth: "회선 성장",
  retention: "이탈 방어",
  profit: "수익성",
} as const;
export function FocusControl() {
  const { preferences, save } = useAnalysisPreferences();
  const [error, setError] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`중점 지표: ${FOCUS_LABELS[preferences.focus]}`}
            />
          }
        >
          {FOCUS_LABELS[preferences.focus]}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          matchAnchorWidth={false}
          className="w-40"
        >
          <DropdownMenuRadioGroup
            aria-label="분석 중점 지표"
            value={preferences.focus}
            onValueChange={(value) => {
              if (preferences.focus === value || !(value in FOCUS_LABELS))
                return;
              try {
                save({
                  ...preferences,
                  focus: value as keyof typeof FOCUS_LABELS,
                });
                setError("");
              } catch {
                setError("설정을 저장할 수 없습니다.");
              }
            }}
          >
            {Object.entries(FOCUS_LABELS).map(([value, label]) => (
              <DropdownMenuRadioItemContent
                closeOnClick
                key={value}
                value={value}
                className="cursor-pointer py-2.5"
              >
                {label}
              </DropdownMenuRadioItemContent>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
