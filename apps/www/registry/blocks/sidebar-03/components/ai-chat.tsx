"use client";

import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import type React from "react";
import { createContext, useCallback, useContext, useState, useEffect, useRef } from "react";
import { AIChatDialog } from "@/registry/blocks/sidebar-03/components/ai-chat-dialog";

import type { ChatReply } from "./aiir-chat-scenario";
export type ChatMessage = ChatReply & { role: "user" | "ai" };
type Conversations = Record<string, ChatMessage[]>;

type TabType = "chat" | "doc";

interface AIChatContextType {
  conversations: Conversations;
  setConversations: React.Dispatch<React.SetStateAction<Conversations>>;
  pending: Record<string, boolean>;
  sendReplies: (workspace: string, question: string, replies: (string | ChatReply)[]) => void;
  activeTab: TabType;
  input: string;
  isDialogOpen: boolean;
  setActiveTab: (tab: TabType) => void;
  setInput: (value: string) => void;
  setIsDialogOpen: (open: boolean) => void;
  switchToChat: () => void;
  switchToDocs: () => void;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

const AIChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [conversations, setConversations] = useState<Conversations>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("doc");
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const busy = useRef(new Set<string>());
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  const sendReplies = (workspace: string, question: string, replies: (string | ChatReply)[]) => {
    if (busy.current.has(workspace) || !question.trim() || !replies.length) return;
    busy.current.add(workspace);
    setPending(previous => ({ ...previous, [workspace]: true }));
    setConversations(previous => ({ ...previous, [workspace]: [...(previous[workspace] ?? []), { role: "user", content: question }] }));
    replies.forEach((reply, index) => {
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        setConversations(previous => ({ ...previous, [workspace]: [...(previous[workspace] ?? []), { role: "ai", ...(typeof reply === "string" ? { content: reply } : reply) }] }));
        if (index === replies.length - 1) {
          busy.current.delete(workspace);
          setPending(previous => ({ ...previous, [workspace]: false }));
        }
      }, 1200 + index * 1900);
      timers.current.add(timer);
    });
  };

  const switchToChat = useCallback(() => {
    setActiveTab("chat");
  }, []);

  const switchToDocs = useCallback(() => {
    setActiveTab("doc");
  }, []);

  return (
    <AIChatContext.Provider
      value={{
        pending,
        sendReplies,
        conversations,
        setConversations,
        activeTab,
        input,
        isDialogOpen,
        setActiveTab,
        setInput,
        setIsDialogOpen,
        switchToChat,
        switchToDocs,
      }}
    >
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {children}
        <AIChatDialog />
      </Dialog>
    </AIChatContext.Provider>
  );
};

export const useAIChat = () => {
  const context = useContext(AIChatContext);
  if (!context) {
    throw new Error("useAIChat must be used within an AIChatProvider");
  }
  return context;
};

export const AIChat = ({ children }: { children?: React.ReactNode }) => (
  <AIChatProvider>{children}</AIChatProvider>
);

export const AIChatTrigger = () => (
  <DialogTrigger aria-label="AI와 대화" render={<Button size="icon-sm" variant="outline" title="AI와 대화" />}>
    <Bot />
  </DialogTrigger>
);
