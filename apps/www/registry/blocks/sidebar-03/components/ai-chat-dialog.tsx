"use client";

import { Bot } from "lucide-react";
import { DraggableAILauncher } from "./draggable-ai-launcher";

import { Button } from "@/components/ui/button";
import styles from "./ai-chat-launcher.module.css";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useAIChat } from "@/registry/blocks/sidebar-03/components/ai-chat";
import { ChatDialogHeader } from "@/registry/blocks/sidebar-03/components/chat-header";
import { ChatStreaming } from "@/registry/blocks/sidebar-03/components/streaming";

export const AIChatDialog = () => {
  const { setIsDialogOpen, isDialogOpen } = useAIChat();
  return (
    <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
      <DraggableAILauncher>
        <DialogTrigger
          aria-label="AI와 대화"
          aria-describedby="ai-launcher-help"
          render={
            <Button
              variant="unstyled"
              className={`relative isolate size-14 shrink-0 rounded-full border-0 p-0 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring ${styles.launcher}`}
              data-open={isDialogOpen || undefined}
            >
              <span aria-hidden="true" className={styles.orbit} />
              <span
                aria-hidden="true"
                className="relative z-10 flex size-full items-center justify-center rounded-full bg-yellow-400 text-3xl leading-none text-black"
              >
                <Bot className="size-7" strokeWidth={2} />
              </span>
            </Button>
          }
        />
      </DraggableAILauncher>
      <span id="ai-launcher-help" className="sr-only">
        드래그하거나 Alt와 방향키로 위치를 이동할 수 있습니다.
      </span>
      <DialogContent
        className="p-0! gap-0 mt-4 rounded-md max-w-[60ch] h-[80dvh] max-h-[90dvh] flex flex-col overflow-hidden"
        showCloseButton
        layout="top"
      >
        <ChatDialogHeader />
        <ChatStreaming />
      </DialogContent>
    </Dialog>
  );
};
