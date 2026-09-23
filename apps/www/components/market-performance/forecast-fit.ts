export function forecastFit(
  rows: { observed: number | null; forecast: number | null }[],
) {
  const pairs = rows.filter(
    (r): r is { observed: number; forecast: number } =>
      r.observed !== null &&
      r.forecast !== null &&
      Number.isFinite(r.observed) &&
      Number.isFinite(r.forecast),
  );
  if (!pairs.length)
    return { count: 0, mae: null, wape: null, similarity: null };
  const absolute = pairs.reduce(
    (s, r) => s + Math.abs(r.observed - r.forecast),
    0,
  );
  const denominator = pairs.reduce((s, r) => s + Math.abs(r.observed), 0);
  const wape = denominator > 0 ? (absolute / denominator) * 100 : null;
  return {
    count: pairs.length,
    mae: absolute / pairs.length,
    wape,
    similarity: wape === null ? null : Math.max(0, 100 - wape),
  };
}
