import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ConversationPreview } from "@/lib/types";

async function buildConversationPreview(
  conversationId: string,
  currentUserId: string
): Promise<ConversationPreview | null> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, username: true, name: true, color: true, lastSeen: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!conversation) return null;

  const otherMember = conversation.members.find(
    (m) => m.userId !== currentUserId
  );
  if (!otherMember) return null;

  const unreadCount = await prisma.message.count({
    where: {
      conversationId,
      senderId: { not: currentUserId },
      read: false,
    },
  });

  const last = conversation.messages[0];

  return {
    id: conversation.id,
    updatedAt: conversation.updatedAt.toISOString(),
    otherUser: otherMember.user,
    lastMessage: last
      ? {
          content: last.content,
          createdAt: last.createdAt.toISOString(),
          senderId: last.senderId,
        }
      : null,
    unreadCount,
  };
}

export async function GET(request: NextRequest) {
  const session = await getRequestUser(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      members: {
        some: { userId: session.userId },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, username: true, name: true, color: true, lastSeen: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (conversations.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  const conversationIds = conversations.map((c) => c.id);
  const unreadCounts = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversationIds },
      senderId: { not: session.userId },
      read: false,
    },
    _count: {
      id: true,
    },
  });

  const unreadCountMap: Record<string, number> = {};
  unreadCounts.forEach((group) => {
    unreadCountMap[group.conversationId] = group._count.id;
  });

  const previews: ConversationPreview[] = conversations
    .map((c): ConversationPreview | null => {
      const otherMember = c.members.find((m) => m.userId !== session.userId);
      if (!otherMember) return null;

      const last = c.messages[0];

      return {
        id: c.id,
        updatedAt: c.updatedAt.toISOString(),
        otherUser: otherMember.user,
        lastMessage: last
          ? {
              content: last.content,
              createdAt: last.createdAt.toISOString(),
              senderId: last.senderId,
            }
          : null,
        unreadCount: unreadCountMap[c.id] || 0,
      };
    })
    .filter((c): c is ConversationPreview => c !== null)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

  return NextResponse.json({ conversations: previews });
}

export async function POST(request: NextRequest) {
  const session = await getRequestUser(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await request.json();
  if (!userId || userId === session.userId) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existingConversation = await prisma.conversation.findFirst({
    where: {
      AND: [
        { members: { some: { userId: session.userId } } },
        { members: { some: { userId } } },
      ],
    },
  });

  if (existingConversation) {
    const preview = await buildConversationPreview(
      existingConversation.id,
      session.userId
    );
    return NextResponse.json({ conversation: preview });
  }

  const conversation = await prisma.conversation.create({
    data: {
      members: {
        create: [{ userId: session.userId }, { userId }],
      },
    },
  });

  const preview = await buildConversationPreview(
    conversation.id,
    session.userId
  );

  return NextResponse.json({ conversation: preview }, { status: 201 });
}
