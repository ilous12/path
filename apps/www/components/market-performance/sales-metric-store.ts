"use client";
import { useSyncExternalStore } from "react";
import { defaultSalesSchema, validateMetrics, type SalesMetricSchema } from "./sales-metric-schema";
import { normalizeLegacyBranding } from "./workspace-identity";
const key="mars-sales-metric-schemas-v1";
let cache:Record<string,SalesMetricSchema>={};const empty={};let ready=false;
const listeners=new Set<()=>void>();
function read(){try{const raw=localStorage.getItem(key);const parsed=normalizeLegacyBranding<Record<string,SalesMetricSchema>>(raw?JSON.parse(raw):{});for(const s of Object.values(parsed))validateMetrics(s.metrics);if(raw&&JSON.stringify(parsed)!==raw)localStorage.setItem(key,JSON.stringify(parsed));cache=parsed;}catch{throw Error("판매조건 설정을 읽을 수 없습니다. 저장 데이터를 확인하세요.");}}
function subscribe(fn:()=>void){listeners.add(fn);if(!ready){ready=true;try{read();}catch{}window.addEventListener("storage",e=>{if(e.key===key){try{read();}catch{}listeners.forEach(f=>f());}});}return()=>{listeners.delete(fn);};}
export function currentSalesSchema(workspace:string){read();return cache[workspace]??defaultSalesSchema(workspace);}
export function publishSalesSchema(schema:SalesMetricSchema,expectedVersion:string){const current=currentSalesSchema(schema.workspace);if(current.version!==expectedVersion)throw Error("다른 창에서 기준이 변경되었습니다. 새로 열고 다시 분석하세요.");validateMetrics(schema.metrics);const next={...cache,[schema.workspace]:schema};localStorage.setItem(key,JSON.stringify(next));cache=next;listeners.forEach(f=>f());}
export function useSalesSchema(workspace:string){const state=useSyncExternalStore(subscribe,()=>cache,()=>empty);return state[workspace as keyof typeof state] as SalesMetricSchema|undefined ?? defaultSalesSchema(workspace);}
