/** Today's marker for timelines: spans the annotation lanes and the plot, with a label chip on top. */
export function TodayLine({ x, bottom, label }: { x: number; bottom: number; label: string }) {
  return (
    <g aria-label={label} pointerEvents="none">
      <line stroke="var(--primary)" strokeWidth={1.5} x1={x} x2={x} y1={14} y2={bottom} />
      <rect fill="var(--primary)" height={15} rx={4} width={60} x={x - 30} y={0} />
      <text fill="var(--primary-foreground)" fontSize={10.5} fontWeight={700} textAnchor="middle" x={x} y={11}>
        {label}
      </text>
    </g>
  );
}
