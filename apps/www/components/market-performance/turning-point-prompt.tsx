"use client";

import { useState } from "react";
import { Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function TurningPointPrompt({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4" />
            변곡점 판단 기준
          </CardTitle>
          <CardDescription>
            회선·해지·매출·순익과 이벤트를 기준으로 비교 기간, 변화량·증감률,
            지속 조건을 정의합니다.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={() => {
            setText(value);
            setOpen(true);
          }}
        >
          <Pencil className="size-4" />
          수정
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm leading-7"
          aria-label="변곡점 판단 프롬프트"
        >
          {value}
        </div>
        <p className="text-xs text-muted-foreground">
          설정 저장 시 워크스페이스별 판단 프롬프트를 저장합니다.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>변곡점 판단 기준 수정</DialogTitle>
              <DialogDescription>
                기준 기간, 지표별 임계값, 충족 기한과 지속 일수, 이벤트 연결
                조건을 수정하세요.
              </DialogDescription>
            </DialogHeader>
            <label
              htmlFor="turning-point-prompt"
              className="text-sm font-medium"
            >
              판단 프롬프트
            </label>
            <Textarea
              id="turning-point-prompt"
              className="min-h-80 max-h-[50vh] resize-y leading-7"
              value={text}
              maxLength={10000}
              onChange={(e) => setText(e.target.value)}
              aria-describedby="prompt-help"
            />
            <div
              id="prompt-help"
              className="flex justify-between gap-3 text-xs text-muted-foreground"
            >
              <span>수정 완료 후 상단의 ‘설정 저장’을 눌러 적용하세요.</span>
              <span className="shrink-0 tabular-nums">
                {text.length.toLocaleString("ko-KR")} / 10,000
              </span>
            </div>
            {!text.trim() && (
              <p role="alert" className="text-sm text-destructive">
                판단 기준을 입력해 주세요.
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                취소
              </Button>
              <Button
                type="button"
                disabled={!text.trim()}
                onClick={() => {
                  onChange(text.trim());
                  setOpen(false);
                }}
              >
                수정 완료
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
