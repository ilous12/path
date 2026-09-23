"use client";
import { useMemo } from "react";
import { ALTERNATIVE_TYPES, type PolicyAlternative } from "./alternative-model";
import { usePolicyGroups } from "./policy-group-store";
import { groupAlternative } from "./policy-group-model";
/** Compatibility projection: one timeline record per parent, never per child. */
export function useAlternatives() {
 const store=usePolicyGroups();
 const alternatives=useMemo(()=>store.policies.map(p=>groupAlternative(p)),[store.policies]);
 return {version:2,alternatives,types:[...ALTERNATIVE_TYPES,"복합 정책"],error:store.error,
  save:(a:PolicyAlternative)=>store.attach(a),markSeen:store.markSeen,
  setGroup:()=>{throw Error("그룹 이름 대신 본정책 구성 화면에서 서브정책을 관리하세요.");},
  setStatus:(id:string,status:PolicyAlternative["status"])=>{if(status==="applied")store.execute(id);else if(status==="paused")store.stop(id);else store.newDraft(id);},
 };
}
