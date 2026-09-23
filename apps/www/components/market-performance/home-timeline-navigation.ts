"use client";

import { useEffect, useRef, useState } from "react";
import { daysBetween, panRange, zoomRange, type Range } from "./data";

/** Keeps continuous chart navigation local, without triggering the page skeleton. */
export function useHomeTimelineNavigation(range: Range, onChange: (range: Range) => void, maxDate: string, enabled: boolean) {
  const chartRef = useRef<HTMLDivElement>(null);
  const current = useRef({ range, onChange, maxDate });
  current.current = { range, onChange, maxDate };
  const [dragging, setDragging] = useState(false);
  // The chart can be removed when all businesses are deselected.
  useEffect(() => {
    const element = chartRef.current;
    if (!element || !enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delta = 0;
    let drag: { id: number; x: number; range: Range } | null = null;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey || !event.deltaY) return;
      event.preventDefault();
      event.stopPropagation();
      delta += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
      clearTimeout(timer);
      timer = setTimeout(() => {
        const state = current.current;
        state.onChange(zoomRange(state.range, delta, state.maxDate));
        delta = 0;
      }, 160);
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || event.pointerType === "touch" || (event.target as Element).closest("button,a,input,foreignObject")) return;
      event.preventDefault();
      drag = { id: event.pointerId, x: event.clientX, range: current.current.range };
      element.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id || Math.abs(event.clientX - drag.x) < 4) return;
      event.preventDefault();
      setDragging(true);
      const offset = -(event.clientX - drag.x) / Math.max(100, element.clientWidth - 100) * daysBetween(drag.range.start, drag.range.end);
      const next = panRange(drag.range, offset, current.current.maxDate);
      if (next.start !== current.current.range.start || next.end !== current.current.range.end) current.current.onChange(next);
    };
    const up = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      setDragging(false);
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    const context = (event: MouseEvent) => { if (event.ctrlKey) event.preventDefault(); };
    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
    element.addEventListener("lostpointercapture", up);
    element.addEventListener("contextmenu", context);
    return () => {
      clearTimeout(timer);
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
      element.removeEventListener("lostpointercapture", up);
      element.removeEventListener("contextmenu", context);
    };
  }, [enabled]);
  return { chartRef, dragging };
}
