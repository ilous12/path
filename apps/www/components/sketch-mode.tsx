"use client";
import { useEffect, useState } from "react";
import { PencilRuler } from "lucide-react";
import { Switch } from "@/components/ui/switch";
const KEY = "mars-sketch-mode";
export function SketchMode() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(KEY) === "on");
    } catch {
      /* Keep the standard appearance. */
    }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === KEY) setEnabled(event.newValue === "on");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (enabled) document.documentElement.dataset.sketch = "on";
    else delete document.documentElement.dataset.sketch;
    return () => {
      delete document.documentElement.dataset.sketch;
    };
  }, [enabled, ready]);
  return (
    <div
      className="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full border bg-background/95 px-3 py-2 text-xs shadow-md backdrop-blur-sm"
      role="group"
      aria-label="디자인 보기 설정"
    >
      <PencilRuler
        className="size-3.5 text-muted-foreground"
        aria-hidden="true"
      />
      <label htmlFor="sketch-mode" className="cursor-pointer font-medium">
        스케치 모드
      </label>
      <Switch
        id="sketch-mode"
        checked={enabled}
        disabled={!ready}
        onCheckedChange={(next) => {
          setEnabled(next);
          try {
            localStorage.setItem(KEY, next ? "on" : "off");
          } catch {
            /* The mode still works for this session. */
          }
        }}
      />
    </div>
  );
}
