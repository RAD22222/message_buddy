"use client";

import { Avatar } from "./Avatar";
import { cn, formatMessageTime } from "@/lib/utils";
import type { ConversationPreview } from "@/lib/types";

interface ConversationListProps {
  conversations: ConversationPreview[];
  activeId: string | null;
  onlineUsers: Set<string>;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onSettingsOpen: () => void;
  currentUserName: string;
  onLogout: () => void;
}

export function ConversationList({
  conversations,
  activeId,
  onlineUsers,
  onSelect,
  onNewChat,
  onSettingsOpen,
  currentUserName,
  onLogout,
}: ConversationListProps) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-4 safe-top">
        <div>
          <h1 className="text-xl font-bold text-white">Messages</h1>
          <p className="text-xs text-zinc-500">Hi, {currentUserName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewChat}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 transition-colors hover:bg-indigo-500/30"
            aria-label="New chat"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={onSettingsOpen}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
            aria-label="Settings"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={onLogout}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
            aria-label="Log out"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10">
              <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-300">No conversations yet</p>
            <p className="mt-1 text-xs text-zinc-500">Tap + to start a new chat</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-white/5",
                    activeId === conv.id ? "bg-indigo-500/10" : "hover:bg-white/[0.03]"
                  )}
                >
                  <Avatar
                    name={conv.otherUser.name}
                    color={conv.otherUser.color}
                    online={onlineUsers.has(conv.otherUser.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold text-white">
                        {conv.otherUser.name}
                      </span>
                      {conv.lastMessage && (
                        <span className="shrink-0 text-[11px] text-zinc-500">
                          {formatMessageTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm text-zinc-500">
                        {conv.lastMessage?.content || "Say hello 👋"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-bold text-white">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
