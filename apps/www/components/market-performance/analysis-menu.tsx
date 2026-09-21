"use client";

import { EllipsisVertical } from "lucide-react";
import Link from "next/link";
import { useState, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AnalysisMenu({
  href,
  label,
  onOpenChange,
  onHide,
}: {
  href: string;
  label: string;
  onOpenChange?: (open: boolean) => void;
  onHide?: () => void;
}) {
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => () => setOpen(false), []);
  return (
    <DropdownMenu
      open={open}
      modal={false}
      orientation="vertical"
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
    >
      <DropdownMenuTrigger
        render={<Button size="icon-sm" variant="ghost" aria-label={label} />}
      >
        <EllipsisVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        matchAnchorWidth={false}
        className="w-44 whitespace-nowrap"
      >
        <DropdownMenuItem
          className="w-full cursor-pointer py-2.5"
          render={<Link href={href} />}
        >
          상세보기
        </DropdownMenuItem>
        {onHide && (
          <DropdownMenuItem
            className="w-full cursor-pointer py-2.5"
            onClick={onHide}
          >
            숨기기
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
