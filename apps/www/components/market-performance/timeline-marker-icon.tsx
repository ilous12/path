import { Radio, TrendingUp, TrendingDown, MoveRight, FlaskConical } from "lucide-react";

/** Shared symbols for Home, business and channel timeline annotations. */
export function TimelineMarkerIcon({kind,change}:{kind:"event"|"pivot"|"experiment";change?:number}) {
 const Icon=kind==="experiment"?FlaskConical:kind==="pivot"?(change===undefined||change===0?MoveRight:change<0?TrendingDown:TrendingUp):Radio;
 return <Icon aria-hidden="true" className="size-3"/>;
}
