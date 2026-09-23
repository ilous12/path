"use client";
import Link from "next/link";
import { EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
type Action = {
  label: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
};
export function RecordMenu({
  label,
  actions,
}: {
  label: string;
  actions: Action[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`${label} 메뉴`}
          />
        }
      >
        <EllipsisVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        matchAnchorWidth={false}
        className="w-40"
      >
        {actions.map((a) => (
          <DropdownMenuItem
            key={a.label}
            onClick={a.onClick}
            render={
              a.href ? (
                a.external ? (
                  <a href={a.href} target="_blank" rel="noreferrer" />
                ) : (
                  <Link href={a.href} />
                )
              ) : undefined
            }
          >
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
