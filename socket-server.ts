import { createServer } from "http";
import { Server } from "socket.io";
import { prisma } from "./src/lib/prisma";
import { verifyToken } from "./src/lib/jwt";

const port = parseInt(process.env.PORT || process.env.SOCKET_PORT || "3001", 10);

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow all origins in development; in production allow env-configured origin
      if (!origin) return callback(null, true);
      const allowed = process.env.NEXT_PUBLIC_APP_URL;
      if (!allowed || origin === allowed || process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      // Also allow any Railway/Vercel deployment URLs
      if (
        origin.endsWith(".railway.app") ||
        origin.endsWith(".vercel.app") ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin)
      ) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  },
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) return next(new Error("Unauthorized"));
  try {
    const payload = await verifyToken(token);
    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

const userSockets = new Map<string, Set<string>>();

io.on("connection", (socket) => {
  const userId = socket.data.userId as string;

  // Track the socket connection for this user
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
    // Only broadcast online if this is their first connection
    io.emit("user:online", { userId });
  }
  userSockets.get(userId)!.add(socket.id);

  // Send the current list of online users to the newly connected user
  socket.emit("users:online", Array.from(userSockets.keys()));

  socket.on("join:conversation", async (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);

    // Mark all unread messages from other members as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        read: false,
      },
      data: { read: true },
    });

    // Broadcast messages:read event to notify the sender
    io.to(`conversation:${conversationId}`).emit("messages:read", {
      conversationId,
      readBy: userId,
    });
  });

  socket.on("leave:conversation", (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on(
    "message:send",
    async ({
      conversationId,
      content,
      tempId,
    }: {
      conversationId: string;
      content: string;
      tempId?: string;
    }) => {
      if (!content?.trim()) return;

      const membership = await prisma.conversationMember.findFirst({
        where: { conversationId, userId },
      });
      if (!membership) return;

      // Check if the other user is currently active in the room
      const clientsInRoom = io.sockets.adapter.rooms.get(`conversation:${conversationId}`);
      const isOtherUserInRoom = clientsInRoom && clientsInRoom.size > 1;

      const message = await prisma.message.create({
        data: {
          content: content.trim(),
          conversationId,
          senderId: userId,
          read: !!isOtherUserInRoom,
        },
        include: {
          sender: {
            select: { id: true, username: true, name: true, color: true },
          },
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      io.to(`conversation:${conversationId}`).emit("message:new", {
        ...message,
        createdAt: message.createdAt.toISOString(),
        tempId,
      });
    }
  );

  socket.on(
    "typing:start",
    ({ conversationId }: { conversationId: string }) => {
      socket
        .to(`conversation:${conversationId}`)
        .emit("typing:start", { userId, conversationId });
    }
  );

  socket.on(
    "typing:stop",
    ({ conversationId }: { conversationId: string }) => {
      socket
        .to(`conversation:${conversationId}`)
        .emit("typing:stop", { userId, conversationId });
    }
  );

  socket.on("disconnect", async () => {
    const sockets = userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        userSockets.delete(userId);
        
        // Update lastSeen in the database when the user goes fully offline
        const lastSeen = new Date();
        try {
          await prisma.user.update({
            where: { id: userId },
            data: { lastSeen },
          });
        } catch (err) {
          console.error("Error updating lastSeen:", err);
        }

        // Broadcast offline to everyone since all connections are closed
        io.emit("user:offline", { userId, lastSeen: lastSeen.toISOString() });
      }
    }
  });
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`> Socket server ready on port ${port}`);
});
