"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  MIN_DATE,
  MAX_DATE,
  presetRange,
  validateRange,
  type Range,
} from "./data";

export type RangeMode = "1W" | "1M" | "1Y" | "2Y" | "custom";

export function AnalysisRangeControl({
  range,
  onChange,
  mode,
  maxDate = MAX_DATE,
  maxSelectableDate,
}: {
  range: Range;
  mode?: RangeMode;
  maxDate?: string;
  maxSelectableDate?: string;
  onChange: (range: Range, mode: RangeMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const getPreset = (key: string) => {
    const base = presetRange(key);
    const shift = Date.parse(maxDate) - Date.parse(MAX_DATE);
    const start = new Date(Date.parse(base.start) + shift).toISOString().slice(0,10);
    return {start: start < MIN_DATE ? MIN_DATE : start, end: maxDate};
  };
  const preset =
    mode ??
    ["1W", "1M", "1Y", "2Y"].find((key) => {
      const next = getPreset(key);
      return next.start === range.start && next.end === range.end;
    }) ??
    (range.start === `${maxDate.slice(0,7)}-01` && range.end === maxDate ? "1M" : "custom");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup
        aria-label="조회 기간"
        size="sm"
        variant="outline"
        value={[preset]}
        onValueChange={(value) => {
          if (value[0]) onChange(getPreset(value[0]), value[0] as RangeMode);
        }}
      >
        {[
          ["1W", "1주"],
          ["1M", "1개월"],
          ["1Y", "1년"],
          ["2Y", "2년"],
        ].map(([key, label]) => (
          <ToggleGroupItem key={key} value={key} className="cursor-pointer">
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <span aria-hidden="true" className="h-5 border-l border-border mx-1" />
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setError("");
        }}
      >
        <PopoverTrigger
          aria-label="기간 지정 시작일 종료일"
          aria-pressed={preset === "custom"}
          render={
            <Button
              size="sm"
              variant={preset === "custom" ? "secondary" : "outline"}
            />
          }
        >
          기간 지정
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-80 max-w-[calc(100vw-2rem)] p-4"
        >
          <PopoverTitle className="text-sm">기간 지정</PopoverTitle>
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const next = {
                start: String(data.get("start")),
                end: String(data.get("end")),
              };
              const issue = validateRange(next, maxSelectableDate ?? maxDate);
              if (issue) {
                setError(issue);
                return;
              }
              setOpen(false);
              onChange(next, "custom");
            }}
          >
            <label className="block space-y-1 text-xs">
              시작일
              <Input
                aria-label="시작일"
                className="h-10 text-base font-medium tabular-nums"
                defaultValue={range.start}
                min={MIN_DATE}
                max={maxSelectableDate ?? maxDate}
                name="start"
                required
                type="date"
              />
            </label>
            <label className="block space-y-1 text-xs">
              종료일
              <Input
                aria-label="종료일"
                className="h-10 text-base font-medium tabular-nums"
                defaultValue={range.end}
                min={MIN_DATE}
                max={maxSelectableDate ?? maxDate}
                name="end"
                required
                type="date"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              조회 가능 기간: {MIN_DATE}~{maxSelectableDate ?? maxDate}
              <br />
              62일 이하 일간 · 730일 이하 월간 · 이후 연간
            </p>
            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button size="sm" type="submit">
              적용
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
