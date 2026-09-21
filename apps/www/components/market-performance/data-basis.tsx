"use client";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
export function DataBasis({details, label = "산출 기준"}: {details: string; label?: string}) {
  return <Tooltip><TooltipTrigger className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><Info aria-hidden="true" className="size-3" />{label}</TooltipTrigger><TooltipContent className="max-w-72 text-xs leading-5">{details}</TooltipContent></Tooltip>;
}
