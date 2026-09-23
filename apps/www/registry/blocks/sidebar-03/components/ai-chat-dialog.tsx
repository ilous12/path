"use client";

import { DialogContent } from "@/components/ui/dialog";
import { ChatDialogHeader } from "./chat-header";
import { ChatStreaming } from "./streaming";

export const AIChatDialog = () => (
  <DialogContent
    className="p-0! gap-0 mt-4 rounded-md max-w-[60ch] h-[80dvh] max-h-[90dvh] flex flex-col overflow-hidden"
    showCloseButton
    layout="top"
  >
    <ChatDialogHeader />
    <ChatStreaming />
  </DialogContent>
);
