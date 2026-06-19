"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConversationList } from "@/components/ConversationList";
import { ChatView } from "@/components/ChatView";
import { NewChatModal } from "@/components/NewChatModal";
import { SettingsModal } from "@/components/SettingsModal";
import { SocketProvider, useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";
import type {
  ConversationPreview,
  MessageWithSender,
  UserPublic,
} from "@/lib/types";

function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

function ChatAppInner() {
  const router = useRouter();
  const { onlineUsers, onNewMessage, onMessagesRead } = useSocket();
  const [user, setUser] = useState<UserPublic | null>(null);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messagesCache, setMessagesCache] = useState<Record<string, MessageWithSender[]>>({});

  const handleMessagesCacheUpdate = useCallback((conversationId: string, messages: MessageWithSender[]) => {
    setMessagesCache((prev) => ({
      ...prev,
      [conversationId]: messages,
    }));
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  const loadConversations = useCallback(async () => {
    const res = await authFetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const token = localStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        return;
      }

      const meRes = await authFetch("/api/auth/me");
      if (!meRes.ok) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      const meData = await meRes.json();
      setUser(meData.user);
      await loadConversations();
      setLoading(false);
    }

    init();
  }, [router, loadConversations]);

  const handleMessageSent = useCallback(
    (conversationId: string, message: MessageWithSender) => {
      setConversations((prev) => {
        const updated = prev.map((c) => {
          if (c.id !== conversationId) return c;
          return {
            ...c,
            updatedAt: message.createdAt,
            lastMessage: {
              content: message.content,
              createdAt: message.createdAt,
              senderId: message.senderId,
            },
            unreadCount: 0,
          };
        });
        return updated.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
    },
    []
  );

  // Global socket listener to update message cache and sidebar previews for all conversations
  useEffect(() => {
    return onNewMessage((message) => {
      // 1. Update conversations list preview
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === message.conversationId);
        if (!exists) {
          loadConversations();
          return prev;
        }

        const updated = prev.map((c) => {
          if (c.id !== message.conversationId) return c;
          const isOwn = message.senderId === user?.id;
          const isCurrentActive = activeId === message.conversationId;
          return {
            ...c,
            updatedAt: message.createdAt,
            lastMessage: {
              content: message.content,
              createdAt: message.createdAt,
              senderId: message.senderId,
            },
            unreadCount: (isCurrentActive || isOwn) ? 0 : c.unreadCount + 1,
          };
        });

        return updated.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });

      // 2. Update message cache for background conversation
      if (message.conversationId !== activeId) {
        setMessagesCache((prev) => {
          const cached = prev[message.conversationId];
          if (!cached) return prev;
          if (cached.some((m) => m.id === message.id)) return prev;
          return {
            ...prev,
            [message.conversationId]: [...cached, message],
          };
        });
      }
    });
  }, [onNewMessage, user?.id, activeId, loadConversations]);

  // Global socket listener to sync read status in the cache
  useEffect(() => {
    return onMessagesRead(({ conversationId, readBy }) => {
      if (readBy !== user?.id) {
        setMessagesCache((prev) => {
          const cached = prev[conversationId];
          if (!cached) return prev;
          return {
            ...prev,
            [conversationId]: cached.map((msg) =>
              msg.senderId === user?.id ? { ...msg, read: true } : msg
            ),
          };
        });
      }
    });
  }, [onMessagesRead, user?.id]);

  async function handleNewChat(userId: string) {
    const res = await authFetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (res.ok) {
      const data = await res.json();
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === data.conversation.id);
        if (exists) return prev;
        return [data.conversation, ...prev];
      });
      setActiveId(data.conversation.id);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("token");
    router.replace("/login");
  }

  if (loading || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-zinc-500">Loading Pulse…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto flex h-dvh max-w-6xl overflow-hidden bg-background">
        <div
          className={cn(
            "w-full shrink-0 border-r border-border md:w-96 md:max-w-[40%]",
            activeId ? "hidden md:flex md:flex-col" : "flex flex-col"
          )}
        >
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            onlineUsers={onlineUsers}
            onSelect={(id) => {
              setActiveId(id);
              setConversations((prev) =>
                prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
              );
            }}
            onNewChat={() => setShowNewChat(true)}
            onSettingsOpen={() => setShowSettings(true)}
            currentUserName={user.name}
            onLogout={handleLogout}
          />
        </div>

        <div
          className={cn(
            "flex flex-1 flex-col",
            !activeId ? "hidden md:flex" : "flex"
          )}
        >
          {activeConversation && activeId ? (
            <ChatView
              key={activeId}
              conversation={activeConversation}
              currentUserId={user.id}
              onlineUsers={onlineUsers}
              initialMessages={messagesCache[activeId] ?? []}
              onMessagesCacheUpdate={handleMessagesCacheUpdate}
              onBack={() => setActiveId(null)}
              onMessageSent={handleMessageSent}
            />
          ) : (
            <div className="hidden flex-1 flex-col items-center justify-center bg-surface md:flex">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-500/10">
                <svg className="h-10 w-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="mt-6 text-lg font-medium text-zinc-300">
                Select a conversation
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Choose a chat or start a new one
              </p>
            </div>
          )}
        </div>
      </div>

      <NewChatModal
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        onSelectUser={(u) => handleNewChat(u.id)}
      />

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        currentUser={user}
        onlineUsers={onlineUsers}
        onStartChat={handleNewChat}
      />
    </>
  );
}

export function ChatApp() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);

  if (!token) return null;

  return (
    <SocketProvider token={token}>
      <ChatAppInner />
    </SocketProvider>
  );
}
