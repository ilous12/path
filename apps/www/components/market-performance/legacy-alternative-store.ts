"use client";
import { normalizePresentation } from "./presentation-copy";
import { useSyncExternalStore } from "react";
import {
  ALTERNATIVE_TYPES,
  validateAlternative,
  type PolicyAlternative,
} from "./alternative-model";
import experimentSeeds from "./fixtures/telecom-experiments.json";
import previousDemoSeeds from "./fixtures/telecom-experiment-previous-demos.json";
const seeds = normalizePresentation(experimentSeeds) as PolicyAlternative[];
type State = { version: 1; alternatives: PolicyAlternative[]; types: string[] };
const empty: State = { version: 1, alternatives: seeds, types: [...new Set([...ALTERNATIVE_TYPES,...seeds.map(a=>a.type)])] };
const key = "mars-policy-alternatives-v1";
let snapshot = empty;
let initialized = false;
let error = "";
const listeners = new Set<() => void>();
function read() {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      snapshot = empty;
      error = "";
      return;
    }
    const value = JSON.parse(raw);
    if (
      value.version !== 1 ||
      !Array.isArray(value.alternatives) ||
      !Array.isArray(value.types) ||
      value.types.some((v: unknown) => typeof v !== "string") ||
      value.alternatives.some(
        (a: PolicyAlternative) =>
          !a ||
          !a.id ||
          !["draft", "applied", "paused"].includes(a.status) ||
          !Array.isArray(a.history) ||
          a.history.some(h=>!h || typeof h.at!=="string" || typeof h.action!=="string") ||
          validateAlternative(a),
      )
    )
      throw new Error(
        "저장된 대안 형식을 확인할 수 없습니다. 기존 저장값은 유지합니다.",
      );
    // Merge the versioned fixture without overwriting user edits or existing experiments.
    // Update only exact, untouched legacy demos; preserve every user edit.
    const sameFields = (a: PolicyAlternative, b: PolicyAlternative) =>
      Object.keys(a).length === Object.keys(b).length && Object.keys(b).every(k => JSON.stringify(a[k as keyof PolicyAlternative]) === JSON.stringify(b[k as keyof PolicyAlternative]));
    value.alternatives = value.alternatives.map((a: PolicyAlternative) => {
      const previous = (previousDemoSeeds as PolicyAlternative[]).find(item => item.id === a.id && sameFields(a, item));
      return previous && sameFields(a, previous) ? seeds.find(item => item.id === a.id) ?? a : a;
    });
    // Refresh this requested demo curve even if its status/group was changed;
    // preserve policy assumptions and any explicitly customized forecast curve.
    value.alternatives = value.alternatives.map((a: PolicyAlternative) => {
      if (a.id !== "seed-telecom-experiment-01" || a.demoCustomerForecast) return a;
      const seed = seeds.find(item => item.id === a.id)!;
      return {...a, demoCustomerForecast: seed.demoCustomerForecast, demoEvaluationDate: seed.demoEvaluationDate,
        description: a.description};
    });
    const savedIds = new Set(value.alternatives.map((a: PolicyAlternative) => a.id));
    snapshot = {...value, alternatives:[...value.alternatives,...seeds.filter(a=>!savedIds.has(a.id))],types:[...new Set([...value.types,...seeds.map(a=>a.type)])]};
    snapshot = normalizePresentation(snapshot);
    error = "";
  } catch (e) {
    error = e instanceof Error ? e.message : "저장값을 읽을 수 없습니다.";
  }
}
function subscribe(fn: () => void) {
  if (!initialized) {
    initialized = true;
    read();
    window.addEventListener("storage", (e) => {
      if (e.key === key) {
        read();
        listeners.forEach((f) => f());
      }
    });
  }
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function write(value: State) {
  if (error) throw new Error(error);
  localStorage.setItem(key, JSON.stringify(value));
  snapshot = value;
  listeners.forEach((fn) => fn());
}
export function useAlternatives() {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => empty,
  );
  return {
    ...state,
    error,
    save: (a: PolicyAlternative) => {
      const invalid = validateAlternative(a);
      if (invalid) throw new Error(invalid);
      if (snapshot.alternatives.some((x) => x.id === a.id))
        throw new Error("기존 대안은 복제하여 수정하세요.");
      write({
        ...snapshot,
        alternatives: [...snapshot.alternatives, {...a, isNew: true}],
        types: [...new Set([...snapshot.types, a.type.trim()])],
      });
    },
    markSeen: (ids: string[]) => {
      if (!snapshot.alternatives.some(a => a.isNew && ids.includes(a.id))) return;
      write({...snapshot, alternatives: snapshot.alternatives.map(a => ids.includes(a.id) ? {...a, isNew: false} : a)});
    },
    setGroup: (id: string, name: string) => {
      const groupName = name.trim();
      if (groupName.length > 80) throw new Error("그룹명은 80자 이내로 입력하세요.");
      if (!snapshot.alternatives.some(a=>a.id===id)) throw new Error("정책을 찾을 수 없습니다.");
      write({...snapshot, alternatives:snapshot.alternatives.map(a=>a.id===id?{...a,groupName:groupName||undefined,history:[...a.history,{at:new Date().toISOString(),action:groupName?`정책 그룹: ${groupName}`:"정책 그룹 해제"}]}:a)});
    },
    setStatus: (id: string, status: PolicyAlternative["status"]) => {
      if (!snapshot.alternatives.some((a) => a.id === id))
        throw new Error("대안을 찾을 수 없습니다.");
      write({
        ...snapshot,
        alternatives: snapshot.alternatives.map((a) =>
          a.id === id
            ? {
                ...a,
                status,
                history: [
                  ...a.history,
                  {
                    at: new Date().toISOString(),
                    action:
                      status === "applied"
                        ? "시뮬레이션 적용"
                        : status === "paused"
                          ? "적용 해제"
                          : "초안",
                  },
                ],
              }
            : a,
        ),
      });
    },
  };
}
