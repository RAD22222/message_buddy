"use client";

import { useEffect, useState, useRef } from "react";
import { Avatar } from "./Avatar";
import type { UserPublic } from "@/lib/types";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    name: string;
    username: string;
    color: string;
  };
  onlineUsers: Set<string>;
  onStartChat: (userId: string) => void;
}

export function SettingsModal({
  open,
  onClose,
  currentUser,
  onlineUsers,
  onStartChat,
}: SettingsModalProps) {
  const [code, setCode] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const [friends, setFriends] = useState<UserPublic[]>([]);
  const [friendCodeInput, setFriendCodeInput] = useState<string>("");
  const [addingStatus, setAddingStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const [copied, setCopied] = useState(false);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch the friend code
  const fetchFriendCode = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/friends/code", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setCode(data.code);
        setSecondsLeft(data.secondsLeft);
      }
    } catch (err) {
      console.error("Failed to fetch friend code:", err);
    }
  };

  // Fetch friends list
  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/friends", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends);
      }
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    }
  };

  useEffect(() => {
    if (!open) {
      setFriendCodeInput("");
      setAddingStatus({ type: "idle", message: "" });
      setCopied(false);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      return;
    }

    fetchFriendCode();
    fetchFriends();
  }, [open]);

  // Handle countdown ticking
  useEffect(() => {
    if (!open) return;

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Trigger fetch of new code
          fetchFriendCode();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [open, code]); // Re-run when code changes to sync with backend countdown

  const handleCopyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = friendCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    setAddingStatus({ type: "loading", message: "Adding friend..." });

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code: cleanCode }),
      });

      const data = await res.json();

      if (res.ok) {
        setAddingStatus({
          type: "success",
          message: `Successfully added ${data.friend.name}!`,
        });
        setFriendCodeInput("");
        fetchFriends(); // Refresh friends list
        // Clear success message after a few seconds
        setTimeout(() => {
          setAddingStatus((prev) => (prev.type === "success" ? { type: "idle", message: "" } : prev));
        }, 4000);
      } else {
        setAddingStatus({
          type: "error",
          message: data.error || "Failed to add friend.",
        });
      }
    } catch (err) {
      console.error(err);
      setAddingStatus({
        type: "error",
        message: "An unexpected error occurred.",
      });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-md animate-slide-up rounded-t-3xl border border-border bg-surface p-6 sm:rounded-3xl max-h-[85dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-white/5 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* User Profile Card */}
          <div className="flex flex-col items-center justify-center bg-surface-elevated/40 rounded-2xl p-5 border border-border/50">
            <Avatar name={currentUser.name} color={currentUser.color} size="lg" />
            <h3 className="mt-3 text-base font-bold text-white">{currentUser.name}</h3>
            <p className="text-xs text-zinc-500">@{currentUser.username}</p>
          </div>

          {/* Your Friend Code section */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Your Friend Code
            </h4>
            <div className="flex items-center gap-3 bg-surface-elevated rounded-xl p-3 border border-border">
              <div className="flex-1 flex flex-col justify-center">
                <span className="font-mono text-2xl font-bold tracking-widest text-indigo-400 select-all leading-none">
                  {code || "••••••"}
                </span>
                <span className="mt-1 text-[11px] text-zinc-500">
                  {code ? `Changes in ${secondsLeft}s` : "Generating..."}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                disabled={!code}
                className="flex h-10 px-4 items-center justify-center gap-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/20 active:bg-indigo-500/30 transition-all disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            {/* Visual tiny progress bar */}
            {code && (
              <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${(secondsLeft / 60) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Add Friend section */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Add Friend
            </h4>
            <form onSubmit={handleAddFriend} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value)}
                placeholder="Enter 6-character code"
                className="input-field py-2.5 flex-1 font-mono uppercase tracking-widest text-center"
              />
              <button
                type="submit"
                disabled={addingStatus.type === "loading" || friendCodeInput.trim().length !== 6}
                className="flex items-center justify-center rounded-xl bg-indigo-500 px-5 text-sm font-semibold text-white hover:bg-indigo-400 active:bg-indigo-600 transition-colors disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                {addingStatus.type === "loading" ? "Adding..." : "Add"}
              </button>
            </form>
            {addingStatus.message && (
              <p
                className={`text-xs ${
                  addingStatus.type === "success"
                    ? "text-emerald-400 font-medium"
                    : addingStatus.type === "error"
                    ? "text-rose-400 font-medium"
                    : "text-zinc-400"
                }`}
              >
                {addingStatus.message}
              </p>
            )}
          </div>

          {/* Friends List section */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Friends ({friends.length})
            </h4>
            {friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center rounded-2xl bg-surface-elevated/20 border border-dashed border-border p-4">
                <p className="text-xs text-zinc-500">No friends added yet.</p>
                <p className="text-[10px] text-zinc-600 mt-1 max-w-[200px]">
                  Share your temporary code above or input your friend's code to get started.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/30 max-h-60 overflow-y-auto pr-1">
                {friends.map((friend) => (
                  <li key={friend.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={friend.name}
                        color={friend.color}
                        size="sm"
                        online={onlineUsers.has(friend.id)}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-white truncate leading-tight">
                          {friend.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-zinc-500 truncate">@{friend.username}</p>
                          {onlineUsers.has(friend.id) && (
                            <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-medium select-none">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onStartChat(friend.id);
                        onClose();
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/60 text-zinc-300 hover:bg-indigo-500/20 hover:text-indigo-400 transition-all"
                      aria-label={`Chat with ${friend.name}`}
                    >
                      <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
