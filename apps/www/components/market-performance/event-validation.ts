import { EVENT_TYPES, type MarketEvent } from "./data";

function validDateTime(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
  )
    return false;
  const date = new Date(`${value}:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 16) === value
  );
}

export function isValidCustomEvent(value: unknown): value is MarketEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  if (typeof event.id !== "string" || !event.id.startsWith("custom-"))
    return false;
  if (
    !["title", "operator", "channel"].every(
      (key) => typeof event[key] === "string" && (event[key] as string).trim(),
    )
  )
    return false;
  if (
    !["summary", "before", "after", "next"].every(
      (key) => typeof event[key] === "string",
    )
  )
    return false;
  if (event.targetChannels !== undefined && (!Array.isArray(event.targetChannels) || event.targetChannels.some(c=>typeof c!=="string" || !c.trim() || c.length>40))) return false;
  if (!validDateTime(event.startAt)) return false;
  if (
    event.endAt !== undefined &&
    (!validDateTime(event.endAt) || event.endAt < event.startAt)
  )
    return false;
  if (
    !Array.isArray(event.types) ||
    !event.types.length ||
    !event.types.every(
      (type) =>
        typeof type === "string" &&
        (Object.hasOwn(EVENT_TYPES, type) ||
          (type.startsWith("ai:") && type.length > 3 && type.length <= 100)),
    )
  )
    return false;
  return ["sourceName", "sourceUrl", "sourceType", "prompt", "recordedBy", "recordedAt"].every(
    (key) => event[key] === undefined || typeof event[key] === "string",
  );
}

export function mergeCustomEvents(builtIn: MarketEvent[], saved: unknown) {
  const byId = new Map(builtIn.map((event) => [event.id, event]));
  if (Array.isArray(saved))
    for (const event of saved) {
      if (isValidCustomEvent(event))
        byId.set(event.id, { ...event, types: [...new Set(event.types)] });
    }
  return [...byId.values()];
}
