"use client";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { planVolume, volumeTiers } from "./plan-volume-model";
import { operatorGroups, type PlanOffer } from "./plan-market-model";
type Cell = ReturnType<typeof planVolume>[number];
export function PlanVolumeSpectrum({
  offers,
  hoveredGroup = null,
  onHoverGroup,
}: {
  offers: PlanOffer[];
  hoveredGroup?: string | null;
  onHoverGroup?: (group: string | null) => void;
}) {
  const [width, setWidth] = useState(2500);
  const viewAngle = 0.6; // Fixed projection angle in radians.
  const [hover, setHover] = useState<{
    cell: Cell;
    x: number;
    y: number;
    below: boolean;
  } | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const cells = useMemo(() => planVolume(offers, width), [offers, width]);
  const max = Math.max(width, ...cells.map((c) => c.price + width));
  const maxCount = Math.max(1, ...cells.map((cell) => cell.count));
  const project = (x: number, y: number, z: number) => ({
    x: 80 + x * 620 + z * (viewAngle * 180 / Math.PI) * 4,
    y: 375 - y * 245 - z * 115,
  });
  const pt = (x: number, y: number, z: number) => {
    const p = project(x, y, z);
    return `${p.x},${p.y}`;
  };
  const show = (event: MouseEvent<SVGGElement>, cell: Cell) => {
    const box = container.current?.getBoundingClientRect();
    if (!box) return;
    const y = event.clientY - box.top;
    setHover({
      cell,
      x: Math.max(8, Math.min(event.clientX - box.left + 12, box.width - 288)),
      y: y < 180 ? y + 16 : y - 12,
      below: y < 180,
    });
  };
  useEffect(() => {
    const clear = () => setHover(null);
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") clear();
    };
    window.addEventListener("scroll", clear, true);
    window.addEventListener("resize", clear);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("scroll", clear, true);
      window.removeEventListener("resize", clear);
      window.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(() => setHover(null), [offers, width]);
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            가격 구간
            <select
              aria-label="매물대 가격 구간"
              className="h-8 rounded-md border bg-background px-2"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            >
              {[1000, 2500, 5000, 10000].map((v) => (
                <option key={v} value={v}>
                  {v.toLocaleString("ko-KR")}원
                </option>
              ))}
            </select>
          </label>
          {hoveredGroup && (
            <span className="flex items-center gap-1.5 rounded-full border bg-accent/60 px-2.5 py-0.5 text-[11px] font-medium transition-all">
              <span
                className="size-2 rounded-full shadow-xs"
                style={{
                  background:
                    operatorGroups.find((g) => g.name === hoveredGroup)?.color ??
                    "var(--primary)",
                }}
              />
              <span className="font-semibold">{hoveredGroup}</span> 요금제 하이라이트
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setWidth(2500);
          }}
        >
          초기화
        </Button>
      </div>
      <div
        ref={container}
        className="relative"
        onMouseLeave={() => setHover(null)}
      >
        <svg
          viewBox="0 0 960 470"
          className="min-h-72 w-full"
          role="img"
          aria-label="가격 구간과 데이터 구간별 요금제 수를 사업자별 누적 막대로 표시한 3D 스펙트럼"
        >
          <polygon
            points={[pt(0, 0, 0), pt(1, 0, 0), pt(1, 0, 1), pt(0, 0, 1)].join(
              " ",
            )}
            fill="var(--muted)"
            opacity=".6"
          />
          {[0, 0.25, 0.5, 0.75, 1].map((y) => (
            <g key={y}>
              <polyline
                points={[pt(0, y, 0), pt(0, y, 1), pt(1, y, 1)].join(" ")}
                fill="none"
                stroke="var(--border)"
                strokeWidth=".6"
              />
              <text
                x={project(0, y, 0).x - 8}
                y={project(0, y, 0).y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--muted-foreground)"
              >
                {Math.round(maxCount * y)}건
              </text>
            </g>
          ))}
          {volumeTiers.map((t, i) => (
            <g key={t}>
              <line
                x1={project(0, 0, i / 7).x}
                y1={project(0, 0, i / 7).y}
                x2={project(1, 0, i / 7).x}
                y2={project(1, 0, i / 7).y}
                stroke="var(--border)"
              />
              <text
                x={project(1, 0, (i + 0.45) / 7).x + 12}
                y={project(1, 0, (i + 0.45) / 7).y + 4}
                fontSize="10"
                fill="var(--muted-foreground)"
              >
                {t}
              </text>
            </g>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((x) => (
            <text
              key={x}
              x={project(x, 0, 0).x}
              y="400"
              fontSize="11"
              fill="var(--muted-foreground)"
            >
              {((max * x) / 10000).toFixed(1)}만
            </text>
          ))}
          {[...cells]
            .sort((a, b) => b.tier - a.tier || a.price - b.price)
            .map((cell) => {
              const x0 = (cell.price + width * 0.12) / max;
              const x1 = (cell.price + width * 0.88) / max;
              const z0 = (cell.tier + 0.12) / volumeTiers.length;
              const z1 = (cell.tier + 0.82) / volumeTiers.length;
              let accumulated = 0;
              return (
                <g
                  key={`${cell.tier}:${cell.price}`}
                  data-spectrum-bar="true"
                  className="cursor-crosshair outline-none"
                  tabIndex={0}
                  aria-label={`${volumeTiers[cell.tier]} · ${cell.price.toLocaleString("ko-KR")}원 구간 · ${cell.count}건`}
                  onMouseEnter={(e) => show(e, cell)}
                  onMouseMove={(e) => show(e, cell)}
                  onMouseLeave={() => setHover(null)}
                  onClick={(e) => show(e, cell)}
                  onFocus={() => setHover({ cell, x: 8, y: 16, below: true })}
                  onBlur={() => setHover(null)}
                >
                  {cell.segments.map((segment) => {
                    const bottom = accumulated / maxCount;
                    accumulated += segment.count;
                    const top = accumulated / maxCount;
                    const front = [pt(x0, bottom, z0), pt(x1, bottom, z0), pt(x1, top, z0), pt(x0, top, z0)].join(" ");
                    const side = [pt(x1, bottom, z0), pt(x1, bottom, z1), pt(x1, top, z1), pt(x1, top, z0)].join(" ");
                    const cap = [pt(x0, top, z0), pt(x1, top, z0), pt(x1, top, z1), pt(x0, top, z1)].join(" ");
                    const isMatch = Boolean(hoveredGroup && segment.name === hoveredGroup);
                    const isDimmed = Boolean(hoveredGroup && segment.name !== hoveredGroup);

                    return (
                      <g
                        key={segment.name}
                        fill={segment.color}
                        stroke={isMatch ? "var(--foreground)" : segment.color}
                        strokeWidth={isMatch ? 1.5 : 0.5}
                        opacity={isDimmed ? 0.22 : 1}
                        style={{ transition: "opacity 0.15s ease, stroke-width 0.15s ease" }}
                      >
                        <polygon points={side} />
                        <polygon points={side} fill="black" fillOpacity={isMatch ? 0.15 : 0.22} stroke="none" />
                        <polygon points={front} />
                        <polygon points={cap} />
                        <polygon points={cap} fill="white" fillOpacity={isMatch ? 0.38 : 0.24} stroke="none" />
                        {isMatch && (
                          <polygon
                            points={front}
                            fill="none"
                            stroke="white"
                            strokeWidth={1.2}
                            strokeOpacity={0.9}
                          />
                        )}
                      </g>
                    );
                  })}
                  {hover?.cell === cell && (
                    <polygon
                      points={[pt(x0, cell.count / maxCount, z0), pt(x1, cell.count / maxCount, z0), pt(x1, cell.count / maxCount, z1), pt(x0, cell.count / maxCount, z1)].join(" ")}
                      fill="none"
                      stroke="var(--foreground)"
                      strokeWidth={1.5}
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            })}
          <text x="310" y="435" fontSize="12" fill="var(--foreground)">
            체감가 구간 (원/월)
          </text>
          <text x="85" y="20" fontSize="12" fill="var(--foreground)">
            높이: 요금제 판매 조건 수
          </text>
        </svg>
        {hover && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-30 w-[280px] max-w-[calc(100%-16px)] rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-lg"
            style={{
              left: hover.x,
              top: hover.y,
              transform: hover.below ? undefined : "translateY(-100%)",
            }}
          >
            <strong>
              {hover.cell.price.toLocaleString("ko-KR")}~
              {(hover.cell.price + width).toLocaleString("ko-KR")}원 미만
            </strong>
            <p className="mt-1 text-muted-foreground">
              {volumeTiers[hover.cell.tier]} · {hover.cell.count}개 판매 조건
            </p>
            <div className="mt-2 space-y-1">
              {hover.cell.segments.map((s) => {
                const isSegMatch = hoveredGroup === s.name;
                return (
                  <div
                    key={s.name}
                    className={`flex items-center gap-2 rounded px-1.5 py-0.5 transition-colors ${
                      isSegMatch ? "bg-accent/80 font-semibold" : ""
                    }`}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ background: s.color }}
                    />
                    {s.name}
                    <span className="ml-auto">
                      {s.count}건 ·{" "}
                      {((s.count / hover.cell.count) * 100).toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 truncate text-muted-foreground">
              예: {hover.cell.offers[0].name}
            </p>
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        높이는 가입·거래량이 아닌 수집된 판매 조건 수입니다. 깊이는 데이터 제공
        구간이며, 색은 사업자 구성입니다. 막대에 호버하면 가격대별 구성과 건수를
        확인할 수 있습니다.
      </p>
    </div>
  );
}
