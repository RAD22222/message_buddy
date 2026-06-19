"use client";

import { useEffect, useState } from "react";
import { Avatar } from "./Avatar";
import type { UserPublic } from "@/lib/types";

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
  onSelectUser: (user: UserPublic) => void;
}

export function NewChatModal({ open, onClose, onSelectUser }: NewChatModalProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setUsers([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (query.length < 1) {
      if (open) {
        const fetchFriends = async () => {
          setSearching(true);
          const token = localStorage.getItem("token");
          const res = await fetch("/api/friends", {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const data = await res.json();
            setUsers(data.friends);
          }
          setSearching(false);
        };
        fetchFriends();
      } else {
        setUsers([]);
      }
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md animate-slide-up rounded-t-3xl border border-border bg-surface p-6 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">New conversation</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-white/5"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search friends by name or username…"
          autoFocus
          className="input-field mb-4"
        />

        <div className="max-h-64 overflow-y-auto">
          {searching && (
            <p className="py-4 text-center text-sm text-zinc-500">Searching…</p>
          )}
          {!searching && users.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-sm text-zinc-500">No friends found</p>
              <p className="text-xs text-zinc-600 mt-1">Add friends in Settings using their code to start chatting!</p>
            </div>
          )}
          <ul className="space-y-1">
            {users.map((user) => (
              <li key={user.id}>
                <button
                  onClick={() => {
                    onSelectUser(user);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/5 active:bg-white/10"
                >
                  <Avatar name={user.name} color={user.color} size="sm" />
                  <div>
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-xs text-zinc-500">@{user.username}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
