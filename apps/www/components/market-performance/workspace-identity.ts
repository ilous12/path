const legacyWorkspaceIds = [
  [["a", "i", "r"].join(""), "aiir"],
  [["t", "d", "s"].join(""), "tdds"],
  [["m", "v", "n", "o"].join(""), "mvvno"],
] as const;

const legacyBrandNames = [
  [["s", "k", "t"].join(""), "skkt"],
  ...legacyWorkspaceIds,
] as const;

export function normalizeWorkspaceId(value: string) {
  const normalized = value.toLowerCase();
  return legacyWorkspaceIds.find(([legacy]) => legacy === normalized)?.[1] ?? value;
}

export function legacyWorkspaceId(value: string) {
  const normalized = value.toLowerCase();
  return legacyWorkspaceIds.find(([, current]) => current === normalized)?.[0];
}

function preserveCase(value: string, replacement: string) {
  if (value === value.toUpperCase()) return replacement.toUpperCase();
  if (value[0] === value[0]?.toUpperCase()) {
    return `${replacement[0]?.toUpperCase()}${replacement.slice(1)}`;
  }
  return replacement;
}

function normalizeString(value: string) {
  if (value.includes("://")) return value;
  return legacyBrandNames.reduce((current, [legacy, replacement]) => {
    const pattern = new RegExp(`(^|[^A-Za-z0-9])(${legacy})(?=$|[^A-Za-z0-9])`, "gi");
    return current.replace(pattern, (_, prefix: string, matched: string) =>
      `${prefix}${preserveCase(matched, replacement)}`,
    );
  }, value);
}

export function normalizeLegacyBranding<T>(value: T): T {
  if (typeof value === "string") return normalizeString(value) as T;
  if (Array.isArray(value)) return value.map(normalizeLegacyBranding) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        normalizeString(key),
        normalizeLegacyBranding(item),
      ]),
    ) as T;
  }
  return value;
}
