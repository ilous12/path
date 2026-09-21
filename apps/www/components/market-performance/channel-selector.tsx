"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CHANNELS } from "./channel-data";
export function ChannelSelector({
  value,
  onChange,
  extra = [],
}: {
  value: string[];
  onChange: (value: string[]) => void;
  extra?: string[];
}) {
  const [custom, setCustom] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const options = [
    ...new Set([...CHANNELS.map((c) => c.id), ...extra, ...added, ...value]),
  ].filter(Boolean);
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-medium">적용 채널 · 선택</legend>
      <p className="text-xs text-muted-foreground">
        미선택 시 전체 채널에 적용합니다. 여러 채널을 선택할 수 있습니다.
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((channel) => (
          <label
            key={channel}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${value.includes(channel) ? "border-primary bg-primary/5" : "bg-card"}`}
          >
            <input
              type="checkbox"
              checked={value.includes(channel)}
              onChange={() =>
                onChange(
                  value.includes(channel)
                    ? value.filter((v) => v !== channel)
                    : [...value, channel],
                )
              }
            />
            {channel}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          aria-label="새 적용 채널"
          value={custom}
          maxLength={40}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="새 채널 이름"
        />
        <Button
          type="button"
          variant="outline"
          disabled={!custom.trim()}
          onClick={() => {
            const name = custom.trim().toUpperCase();
            setAdded([...added, name]);
            onChange([...new Set([...value, name])]);
            setCustom("");
          }}
        >
          채널 추가
        </Button>
      </div>
    </fieldset>
  );
}
