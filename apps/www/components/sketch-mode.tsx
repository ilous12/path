"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { PencilRuler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
const KEY = "mars-sketch-mode";
const SketchContext = createContext<{enabled:boolean;ready:boolean;toggle:()=>void}|null>(null);
export function SketchModeProvider({children}:{children:ReactNode}) {
  const [enabled,setEnabled]=useState(false);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    try {setEnabled(localStorage.getItem(KEY)==="on");} catch {}
    setReady(true);
    const sync=(event:StorageEvent)=>{if(event.key===KEY)setEnabled(event.newValue==="on");};
    window.addEventListener("storage",sync);
    return ()=>window.removeEventListener("storage",sync);
  },[]);
  useEffect(()=>{
    if(!ready)return;
    if(enabled)document.documentElement.dataset.sketch="on";
    else delete document.documentElement.dataset.sketch;
  },[enabled,ready]);
  const toggle=()=>{const next=!enabled;setEnabled(next);try{localStorage.setItem(KEY,next?"on":"off");}catch{}};
  return <SketchContext.Provider value={{enabled,ready,toggle}}>{children}</SketchContext.Provider>;
}
export function SketchMode() {
  const state=useContext(SketchContext);
  if(!state)return null;
  return <Tooltip><TooltipTrigger render={<Button type="button" variant="ghost" size="icon-sm" className={`size-8 ${state.enabled?"bg-accent text-accent-foreground":"text-muted-foreground"}`} aria-label="스케치 모드" aria-pressed={state.enabled} disabled={!state.ready} onClick={state.toggle}/>}><PencilRuler className="size-4" aria-hidden="true" /></TooltipTrigger><TooltipContent side="bottom">스케치 모드 {state.enabled?"끄기":"켜기"}</TooltipContent></Tooltip>;
}
