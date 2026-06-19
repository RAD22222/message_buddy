"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import type { MessageWithSender } from "@/lib/types";

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  onlineUsers: Set<string>;
  lastSeenMap: Map<string, string>;
  sendMessage: (conversationId: string, content: string, tempId?: string) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  onNewMessage: (handler: (message: MessageWithSender) => void) => () => void;
  onMessagesRead: (
    handler: (data: { conversationId: string; readBy: string }) => void
  ) => () => void;
  onTypingStart: (
    handler: (data: { userId: string; conversationId: string }) => void
  ) => () => void;
  onTypingStop: (
    handler: (data: { userId: string; conversationId: string }) => void
  ) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({
  token,
  children,
}: {
  token: string | null;
  children: React.ReactNode;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, string>>(new Map());
  const messageHandlers = useRef<Set<(m: MessageWithSender) => void>>(
    new Set()
  );
  const messagesReadHandlers = useRef<
    Set<(d: { conversationId: string; readBy: string }) => void>
  >(new Set());
  const typingStartHandlers = useRef<
    Set<(d: { userId: string; conversationId: string }) => void>
  >(new Set());
  const typingStopHandlers = useRef<
    Set<(d: { userId: string; conversationId: string }) => void>
  >(new Set());

  useEffect(() => {
    if (!token) return;

    let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      socketUrl = `http://${hostname}:3001`;
    }

    const s = io(socketUrl, {
      auth: { token },
      autoConnect: true,
    });

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    s.on("users:online", (userIds: string[]) => {
      setOnlineUsers(new Set(userIds));
      setLastSeenMap((prev) => {
        const next = new Map(prev);
        userIds.forEach((id) => next.delete(id));
        return next;
      });
    });

    s.on("user:online", ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
      setLastSeenMap((prev) => {
        if (!prev.has(userId)) return prev;
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    });

    s.on("user:offline", ({ userId, lastSeen }: { userId: string; lastSeen?: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      if (lastSeen) {
        setLastSeenMap((prev) => {
          const next = new Map(prev);
          next.set(userId, lastSeen);
          return next;
        });
      }
    });

    s.on("message:new", (message: MessageWithSender) => {
      messageHandlers.current.forEach((h) => h(message));
    });

    s.on(
      "messages:read",
      (data: { conversationId: string; readBy: string }) => {
        messagesReadHandlers.current.forEach((h) => h(data));
      }
    );

    s.on(
      "typing:start",
      (data: { userId: string; conversationId: string }) => {
        typingStartHandlers.current.forEach((h) => h(data));
      }
    );

    s.on(
      "typing:stop",
      (data: { userId: string; conversationId: string }) => {
        typingStopHandlers.current.forEach((h) => h(data));
      }
    );

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [token]);

  const sendMessage = useCallback(
    (conversationId: string, content: string, tempId?: string) => {
      socket?.emit("message:send", { conversationId, content, tempId });
    },
    [socket]
  );

  const joinConversation = useCallback(
    (conversationId: string) => {
      socket?.emit("join:conversation", conversationId);
    },
    [socket]
  );

  const leaveConversation = useCallback(
    (conversationId: string) => {
      socket?.emit("leave:conversation", conversationId);
    },
    [socket]
  );

  const startTyping = useCallback(
    (conversationId: string) => {
      socket?.emit("typing:start", { conversationId });
    },
    [socket]
  );

  const stopTyping = useCallback(
    (conversationId: string) => {
      socket?.emit("typing:stop", { conversationId });
    },
    [socket]
  );

  const onNewMessage = useCallback(
    (handler: (message: MessageWithSender) => void) => {
      messageHandlers.current.add(handler);
      return () => {
        messageHandlers.current.delete(handler);
      };
    },
    []
  );

  const onMessagesRead = useCallback(
    (
      handler: (data: { conversationId: string; readBy: string }) => void
    ) => {
      messagesReadHandlers.current.add(handler);
      return () => {
        messagesReadHandlers.current.delete(handler);
      };
    },
    []
  );

  const onTypingStart = useCallback(
    (
      handler: (data: { userId: string; conversationId: string }) => void
    ) => {
      typingStartHandlers.current.add(handler);
      return () => {
        typingStartHandlers.current.delete(handler);
      };
    },
    []
  );

  const onTypingStop = useCallback(
    (
      handler: (data: { userId: string; conversationId: string }) => void
    ) => {
      typingStopHandlers.current.add(handler);
      return () => {
        typingStopHandlers.current.delete(handler);
      };
    },
    []
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        onlineUsers,
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
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
}
