"use client";
import { ChevronDown, Plus } from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { MAX_DATE } from "./data";
import { BUSINESSES, businessName } from "./path-intelligence";
import { RegistrationWizard } from "./registration-wizard";

type Business = (typeof BUSINESSES)[number]["id"];

/**
 * Direct entry point for a marketer's own sales policy. On HOME the business is
 * chosen first; inside a workspace it opens straight into that workspace.
 */
export function PolicyEntryButton({
  workspace,
  defaultStart = MAX_DATE,
  label = "판매정책",
  size = "sm",
  variant = "default",
  className,
  children,
}: {
  workspace?: string;
  defaultStart?: string;
  label?: string;
  size?: "sm" | "default" | "icon-sm";
  variant?: "default" | "outline" | "glow" | "ghost";
  className?: string;
  /** Custom trigger content, e.g. a large "+" tile. */
  children?: React.ReactNode;
}) {
  const [target, setTarget] = useState<Business | null>(null);
  const fixed = BUSINESSES.find((b) => b.id === workspace)?.id;
  const open = (id: Business) => setTarget(id);
  return (
    <>
      {fixed ? (
        <Button
          aria-label={`${businessName(fixed)} ${label} 등록`}
          className={className}
          onClick={() => open(fixed)}
          size={size}
          type="button"
          variant={variant}
        >
          {children ?? (
            <>
              <Plus aria-hidden />
              {size !== "icon-sm" && label}
            </>
          )}
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={`${label} 등록`}
                className={className}
                size={size}
                type="button"
                variant={variant}
              />
            }
          >
            {children ?? (
              <>
                <Plus aria-hidden />
                {label}
                <ChevronDown aria-hidden className="opacity-70" />
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52"
            matchAnchorWidth={false}
          >
            <DropdownMenuGroup>
              <DropdownMenuGroupLabel>
                어느 사업의 판매정책인가요?
              </DropdownMenuGroupLabel>
              {BUSINESSES.map((b) => (
                <DropdownMenuItem
                  className="gap-2"
                  key={b.id}
                  onClick={() => open(b.id)}
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: b.color }}
                  />
                  {b.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Dialog
        onOpenChange={(value) => !value && setTarget(null)}
        open={target !== null}
      >
        <DialogContent
          className="flex h-[90dvh] max-w-4xl flex-col gap-0 overflow-hidden p-0!"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">
            {target ? `${businessName(target)} 판매정책 등록` : "판매정책 등록"}
          </DialogTitle>
          {target && (
            <RegistrationWizard
              defaultStart={defaultStart}
              initialKind="experiment"
              onClose={() => setTarget(null)}
              onSaved={() => {
                toast.success({
                  title: `${businessName(target)} 판매정책을 등록했습니다`,
                  description: "타임라인과 판매정책 목록에 반영했습니다.",
                });
                setTarget(null);
              }}
              seed={{
                title: "",
                prompt: "",
                channels: [],
                analysisContext: {
                  start: defaultStart,
                  end: defaultStart,
                  workspace: target,
                  channels: [],
                  reason: "마케터 직접 입력",
                },
              }}
              workspace={target}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
