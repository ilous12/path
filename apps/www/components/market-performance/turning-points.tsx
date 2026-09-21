"use client";

export function TurningPointMarker({
  cx,
  cy,
  label,
  color,
}: {
  cx?: number;
  cy?: number;
  label: string;
  color: string;
}) {
  if (cx === undefined || cy === undefined) return null;
  return (
    <g role="img" aria-label={label}>
      <title>{label}</title>
      <circle cx={cx} cy={cy} r={10} fill={color} opacity={0.18} />
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill="none"
        stroke={color}
        strokeWidth={2}
        className="animate-ping motion-reduce:animate-none"
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          animationDuration: "1.4s",
          animationIterationCount: 2,
        }}
      />
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={color}
        stroke="var(--card)"
        strokeWidth={2}
      />
    </g>
  );
}
