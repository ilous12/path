"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Position = { x: number; y: number };
const storageKey = "mars-ai-launcher-position";
const inset = 12;
const size = 56;
function clamp(position: Position): Position {
  return {
    x: Math.max(inset, Math.min(position.x, window.innerWidth - size - inset)),
    y: Math.max(inset, Math.min(position.y, window.innerHeight - size - inset)),
  };
}
function persist(position: Position) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(position));
  } catch {
    /* Position still persists across client navigation. */
  }
}

export function DraggableAILauncher({ children }: { children: ReactNode }) {
  const [position, setPosition] = useState<Position>();
  const [dragging, setDragging] = useState(false);
  const positionRef = useRef<Position | undefined>(undefined);
  const drag = useRef<{
    id: number;
    startX: number;
    startY: number;
    origin: Position;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const move = (next: Position) => {
    const bounded = clamp(next);
    positionRef.current = bounded;
    setPosition(bounded);
    return bounded;
  };
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y))
        move(saved);
    } catch {
      /* Keep the default bottom-right position. */
    }
    const onResize = () => {
      if (positionRef.current) persist(move(positionRef.current));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div
      className={`fixed z-50 touch-none select-none ${position ? "" : "bottom-4 right-4 md:bottom-10 md:right-10"} ${dragging ? "cursor-grabbing [&_button]:cursor-grabbing" : "cursor-grab [&_button]:cursor-grab"}`}
      style={position ? { left: position.x, top: position.y } : undefined}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        suppressClick.current = false;
        const rect = event.currentTarget.getBoundingClientRect();
        drag.current = {
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          origin: { x: rect.left, y: rect.top },
          moved: false,
        };
      }}
      onPointerMove={(event) => {
        const active = drag.current;
        if (!active || active.id !== event.pointerId) return;
        const dx = event.clientX - active.startX,
          dy = event.clientY - active.startY;
        if (!active.moved && Math.hypot(dx, dy) < 6) return;
        if (!active.moved) {
          active.moved = true;
          setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        suppressClick.current = true;
        event.preventDefault();
        move({ x: active.origin.x + dx, y: active.origin.y + dy });
      }}
      onPointerUp={(event) => {
        if (drag.current?.id !== event.pointerId) return;
        if (drag.current.moved && positionRef.current)
          persist(positionRef.current);
        drag.current = null;
        setDragging(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        if (positionRef.current) persist(positionRef.current);
        drag.current = null;
        setDragging(false);
      }}
      onClickCapture={(event) => {
        if (suppressClick.current && event.detail !== 0) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }
      }}
      onKeyDown={(event) => {
        if (
          !event.altKey ||
          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
            event.key,
          )
        )
          return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        persist(
          move({
            x:
              rect.left +
              (event.key === "ArrowLeft"
                ? -20
                : event.key === "ArrowRight"
                  ? 20
                  : 0),
            y:
              rect.top +
              (event.key === "ArrowUp"
                ? -20
                : event.key === "ArrowDown"
                  ? 20
                  : 0),
          }),
        );
      }}
    >
      {children}
    </div>
  );
}
