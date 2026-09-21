"use client";

import {
  ChevronsUpDown,
  LogOut,
  PenIcon,
  Settings,
  SmileIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { ProductChangelog } from "./product-changelog";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogElementOutsideContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { PreferencesDialogContent } from "./preference";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
  };
}) {
  const { isCollapsed } = useSidebar();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [preferenceOpen, setPreferenceOpen] = useState(false);
  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  className="data-popup-open:bg-accent data-popup-open:text-accent-foreground"
                  size="lg"
                >
                  {isCollapsed ? (
                    <UserIcon className="size-4 mx-auto" />
                  ) : (
                    <>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">
                          {user.name}
                        </span>
                        <span className="truncate text-xs">{user.email}</span>
                      </div>
                      <ChevronsUpDown className="ml-auto size-4" />
                    </>
                  )}
                </SidebarMenuButton>
              }
            />
            <DropdownMenuContent
              align="start"
              matchAnchorWidth={!isCollapsed}
              sideOffset={6}
            >
              <DropdownMenuItem
                className="justify-between py-2"
                onClick={() => setPreferenceOpen(true)}
              >
                <div className="flex flex-col text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <Settings />
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="justify-between py-2"
                  onClick={() => setFeedbackOpen(true)}
                >
                  의견 보내기
                  <SmileIcon />
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="justify-between py-2"
                  onClick={() => setChangelogOpen(true)}
                >
                  변경 이력
                  <PenIcon />
                </DropdownMenuItem>
                <DropdownMenuItem className="justify-between py-2">
                  로그아웃
                  <LogOut />
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <DialogCloseConfirmation
        onOpenChange={setFeedbackOpen}
        open={feedbackOpen}
      />
      <ChangelogDialog onOpenChange={setChangelogOpen} open={changelogOpen} />
      <PreferencesDialog
        onOpenChange={setPreferenceOpen}
        open={preferenceOpen}
      />
    </>
  );
}

function DialogCloseConfirmation({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [textareaValue, setTextareaValue] = useState("");

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && textareaValue) {
          setConfirmationOpen(true);
        } else {
          setTextareaValue("");
          onOpenChange(open);
        }
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-96" layout="stacked" showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SmileIcon className="size-5" /> 의견 보내기
          </DialogTitle>
        </DialogHeader>
        <form
          className="mt-4 flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            onOpenChange(false);
          }}
        >
          <Textarea
            className="min-h-48 resize-none"
            onChange={(event) => setTextareaValue(event.target.value)}
            placeholder="발생한 오류나 문제를 설명해 주세요…"
            required
            value={textareaValue}
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline">취소</Button>} />
            <Button disabled={!textareaValue} type="submit">
              의견 보내기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <AlertDialog onOpenChange={setConfirmationOpen} open={confirmationOpen}>
        <AlertDialogContent className="sm:max-w-md" layout="stacked">
          <AlertDialogHeader>
            <AlertDialogTitle>변경 사항을 취소할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              저장하지 않은 의견이 있습니다. 작성을 취소할까요?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>
              계속 편집
            </AlertDialogClose>
            <Button
              onClick={() => {
                setConfirmationOpen(false);
                onOpenChange(false);
              }}
              variant="destructive"
            >
              취소
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

export function ChangelogDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogElementOutsideContent className="overflow-hidden max-w-4xl p-4 sm:p-6">
        <DialogClose
          className="absolute right-2 top-2 size-6 sm:size-8 xl:right-4 xl:top-4 xl:size-10 pointer-events-auto"
          render={
            <Button variant="secondary">
              <XIcon />
              <span className="sr-only">닫기</span>
            </Button>
          }
        />
        <DialogHeader className="flex-none">
          <DialogTitle>변경 이력</DialogTitle>
          <DialogDescription>
            통합 모니터링 도구의 주요 업데이트를 확인합니다.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0" gradientScrollFade noScrollBar>
          <ProductChangelog />
        </ScrollArea>
        <DialogFooter>
          <DialogClose render={<Button>완료</Button>} />
        </DialogFooter>
      </DialogElementOutsideContent>
    </Dialog>
  );
}

const PreferencesDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-3xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>환경 설정</DialogTitle>
          <DialogDescription>사용 환경을 설정합니다.</DialogDescription>
        </DialogHeader>
        <PreferencesDialogContent />
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">취소</Button>} />
          <Button
            onClick={() => {
              toast.success({
                description: "환경 설정을 저장했습니다.",
                title: "환경 설정 저장 완료",
              });
              onOpenChange(false);
            }}
          >
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
