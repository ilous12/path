"use client";
import { DialogTitle } from "@/components/ui/dialog";
import { WorkspaceName } from "./workspace-switcher";
export const ChatDialogHeader = () => (
  <div className="shrink-0 border-b px-4 py-4 pr-12">
    <DialogTitle className="text-base">
      <WorkspaceName /> · AI와 대화
    </DialogTitle>
  </div>
);
