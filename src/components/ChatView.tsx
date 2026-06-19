"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { formatFullTime, formatLastSeen } from "@/lib/utils";
import type { ConversationPreview, MessageWithSender } from "@/lib/types";
import { useSocket } from "@/hooks/useSocket";
import { encryptMessage, decryptMessage } from "@/lib/crypto";
import { cn } from "@/lib/utils";

interface ChatViewProps {
  conversation: ConversationPreview;
  currentUserId: string;
  onlineUsers: Set<string>;
  initialMessages: MessageWithSender[];
  onMessagesCacheUpdate: (conversationId: string, messages: MessageWithSender[]) => void;
  onBack: () => void;
  onMessageSent: (conversationId: string, message: MessageWithSender) => void;
}

interface ProcessedMessage extends MessageWithSender {
  isDecrypted?: boolean;
  isEncryptedFailed?: boolean;
}

export function ChatView({
  conversation,
  currentUserId,
  onlineUsers,
  initialMessages,
  onMessagesCacheUpdate,
  onBack,
  onMessageSent,
}: ChatViewProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>(initialMessages);
  const [loading, setLoading] = useState(!initialMessages.length);

  const updateMessages = (
    newMsgs: MessageWithSender[] | ((prev: MessageWithSender[]) => MessageWithSender[])
  ) => {
    setMessages(newMsgs);
  };

  useEffect(() => {
    onMessagesCacheUpdate(conversation.id, messages);
  }, [conversation.id, messages, onMessagesCacheUpdate]);
  const [typing, setTyping] = useState(false);
  const [chatSecret, setChatSecret] = useState<string>("");
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [secretInputVal, setSecretInputVal] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`e2ee_key_${conversation.id}`) || "";
      setChatSecret(saved);
      setSecretInputVal(saved);
    }
    setSearchQuery("");
    setIsSearching(false);
  }, [conversation.id]);

  const handleSaveSecret = (e: React.FormEvent) => {
    e.preventDefault();
    const val = secretInputVal.trim();
    setChatSecret(val);
    if (val) {
      localStorage.setItem(`e2ee_key_${conversation.id}`, val);
    } else {
      localStorage.removeItem(`e2ee_key_${conversation.id}`);
    }
    setShowSecretInput(false);
  };
  const {
    connected,
    lastSeenMap,
    sendMessage,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    onNewMessage,
    onMessagesRead,
    onTypingStart,
    onTypingStop,
  } = useSocket();

  const isOnline = onlineUsers.has(conversation.otherUser.id);
  const dynamicLastSeen = lastSeenMap.get(conversation.otherUser.id) || conversation.otherUser.lastSeen;

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      if (!initialMessages.length) {
        setLoading(true);
      }
      const token = localStorage.getItem("token");
      const res = await fetch(
        `/api/conversations/${conversation.id}/messages`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.ok && !cancelled) {
        const data = await res.json();
        updateMessages(data.messages);
      }
      if (!cancelled) setLoading(false);
    }

    loadMessages();
    joinConversation(conversation.id);

    return () => {
      cancelled = true;
      leaveConversation(conversation.id);
    };
  }, [conversation.id, joinConversation, leaveConversation, connected]);

  useEffect(() => {
    return onNewMessage((message) => {
      if (message.conversationId !== conversation.id) return;
      updateMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;

        if (message.senderId === currentUserId) {
          const withoutOptimistic = prev.filter(
            (m) =>
              !(
                m.id === message.tempId ||
                (m.id.startsWith("temp-") && m.content === message.content)
              )
          );
          return [...withoutOptimistic, message];
        }

        return [...prev, message];
      });
      if (message.senderId !== currentUserId) {
        onMessageSent(conversation.id, message);
      }
    });
  }, [conversation.id, currentUserId, onMessageSent, onNewMessage]);

  useEffect(() => {
    return onMessagesRead(({ conversationId, readBy }) => {
      if (conversationId === conversation.id && readBy !== currentUserId) {
        updateMessages((prev) =>
          prev.map((msg) =>
            msg.senderId === currentUserId ? { ...msg, read: true } : msg
          )
        );
      }
    });
  }, [conversation.id, currentUserId, onMessagesRead]);

  useEffect(() => {
    return onTypingStart(({ userId, conversationId }) => {
      if (conversationId === conversation.id && userId !== currentUserId) {
        setTyping(true);
      }
    });
  }, [conversation.id, currentUserId, onTypingStart]);

  useEffect(() => {
    return onTypingStop(({ userId, conversationId }) => {
      if (conversationId === conversation.id && userId !== currentUserId) {
        setTyping(false);
      }
    });
  }, [conversation.id, currentUserId, onTypingStop]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function handleSend(content: string) {
    const encryptedContent = chatSecret ? encryptMessage(content, chatSecret) : content;
    const optimistic: MessageWithSender = {
      id: `temp-${Date.now()}`,
      content,
      conversationId: conversation.id,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      read: false,
      sender: {
        id: currentUserId,
        username: "",
        name: "You",
        color: "#6366f1",
      },
    };

    updateMessages((prev) => [...prev, optimistic]);
    sendMessage(conversation.id, encryptedContent, optimistic.id);
    stopTyping(conversation.id);
    onMessageSent(conversation.id, optimistic);
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="flex items-center gap-3 border-b border-border px-3 py-3 safe-top">
        <button
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 md:hidden"
          aria-label="Back"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <Avatar
          name={conversation.otherUser.name}
          color={conversation.otherUser.color}
          size="sm"
          online={isOnline}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-white">
            {conversation.otherUser.name}
          </h2>
          <p className="text-xs text-zinc-500">
            {typing ? (
              <span className="text-indigo-400">typing…</span>
            ) : isOnline ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active now
              </span>
            ) : (
              <span>{formatLastSeen(dynamicLastSeen)}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0 select-none">
          {/* E2EE Lock Button */}
          <div className="relative">
            <button
              onClick={() => setShowSecretInput(!showSecretInput)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
                chatSecret
                  ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
              )}
              title={chatSecret ? "E2EE Enabled (Click to change)" : "Enable E2EE (Click to set password)"}
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </button>

            {showSecretInput && (
              <div className="absolute right-0 top-11 z-30 w-64 rounded-xl border border-border bg-surface-elevated p-3 shadow-xl animate-slide-up">
                <form onSubmit={handleSaveSecret} className="space-y-2">
                  <h4 className="text-xs font-semibold text-white">Conversation Password (E2EE)</h4>
                  <p className="text-[10px] text-zinc-500 leading-tight">Messages will be encrypted client-side. Share this password with your friend to decrypt.</p>
                  <input
                    type="password"
                    value={secretInputVal}
                    onChange={(e) => setSecretInputVal(e.target.value)}
                    placeholder="Enter password..."
                    className="input-field py-1.5 text-xs font-sans"
                    autoFocus
                  />
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowSecretInput(false)}
                      className="rounded px-2.5 py-1 text-[11px] text-zinc-400 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded bg-indigo-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-400"
                    >
                      Save Key
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Search Button */}
          <button
            onClick={() => {
              setIsSearching(!isSearching);
              setSearchQuery("");
            }}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
              isSearching
                ? "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
            )}
            title="Search messages"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </header>

      {isSearching && (
        <div className="flex items-center gap-2 border-b border-border bg-surface-elevated/40 px-4 py-2 animate-fade-in shrink-0 select-none">
          <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within this chat..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="chat-pattern flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {loading ? (
          <ChatMessagesSkeleton />
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Avatar
              name={conversation.otherUser.name}
              color={conversation.otherUser.color}
              size="lg"
            />
            <p className="mt-4 font-medium text-zinc-300">
              {conversation.otherUser.name}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Start the conversation — say hello!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {(() => {
              // Pre-process messages to handle client-side E2EE decryption
              const processed = messages.map((msg): ProcessedMessage => {
                const isE2EE = msg.content.startsWith("__e2ee__:");
                if (isE2EE) {
                  const decrypted = decryptMessage(msg.content, chatSecret);
                  if (decrypted !== null && decrypted !== msg.content) {
                    return { ...msg, content: decrypted, isDecrypted: true };
                  }
                  return { ...msg, isEncryptedFailed: true };
                }
                return msg;
              });

              // Filter messages based on local search query
              const filtered = processed.filter((msg) => {
                if (!searchQuery.trim()) return true;
                if (msg.isEncryptedFailed) return false;
                return msg.content.toLowerCase().includes(searchQuery.toLowerCase());
              });

              return filtered.map((msg, i) => {
                const isOwn = msg.senderId === currentUserId;
                const prev = filtered[i - 1];
                const showTime =
                  !prev ||
                  new Date(msg.createdAt).getTime() -
                    new Date(prev.createdAt).getTime() >
                    300000;

                return (
                  <div key={msg.id}>
                    {showTime && (
                      <p className="my-3 text-center text-[11px] text-zinc-600">
                        {formatFullTime(msg.createdAt)}
                      </p>
                    )}
                    <MessageBubble
                      message={msg}
                      isOwn={isOwn}
                      isDecrypted={msg.isDecrypted}
                      isEncryptedFailed={msg.isEncryptedFailed}
                    />
                  </div>
                );
              });
            })()}
            {typing && (
              <div className="flex items-end gap-2 pt-1 animate-fade-in">
                <div className="flex gap-1 rounded-2xl rounded-bl-md bg-chat-received px-4 py-3">
                  <span className="typing-dot" />
                  <span className="typing-dot animation-delay-150" />
                  <span className="typing-dot animation-delay-300" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <MessageInput
        onSend={handleSend}
        onTyping={() => startTyping(conversation.id)}
        onStopTyping={() => stopTyping(conversation.id)}
      />
    </div>
  );
}

function ChatMessagesSkeleton() {
  return (
    <div className="space-y-4 animate-pulse px-2 py-4">
      {[...Array(6)].map((_, i) => {
        const isRight = i % 2 === 1;
        return (
          <div
            key={i}
            className={cn(
              "flex items-end gap-2",
              isRight ? "justify-end" : "justify-start"
            )}
          >
            {!isRight && <div className="h-8 w-8 rounded-full bg-white/5 shrink-0" />}
            <div
              className={cn(
                "rounded-2xl px-4 py-3 h-10 bg-white/5 border border-white/5",
                isRight ? "w-[40%] rounded-tr-sm bg-indigo-500/10 border-indigo-500/10" : "w-[60%] rounded-tl-sm"
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
