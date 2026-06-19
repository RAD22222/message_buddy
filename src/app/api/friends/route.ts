import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const friendships = await prisma.friendship.findMany({
    where: { userId: session.userId },
    include: {
      friend: {
        select: { id: true, username: true, name: true, color: true, lastSeen: true },
      },
    },
  });

  const friends = friendships.map((f) => f.friend);

  return NextResponse.json({ friends });
}

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const code = (body.code || "").trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ error: "Friend code is required" }, { status: 400 });
  }

  // Find the target user with this active code
  const targetUser = await prisma.user.findFirst({
    where: {
      friendCode: code,
      friendCodeExpiresAt: { gt: new Date() },
    },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "Invalid or expired friend code" }, { status: 400 });
  }

  if (targetUser.id === session.userId) {
    return NextResponse.json({ error: "You cannot add yourself as a friend" }, { status: 400 });
  }

  // Check if they are already friends
  const existingFriendship = await prisma.friendship.findUnique({
    where: {
      userId_friendId: {
        userId: session.userId,
        friendId: targetUser.id,
      },
    },
  });

  if (existingFriendship) {
    return NextResponse.json({ error: "You are already friends with this user" }, { status: 400 });
  }

  // Establish mutual friendship
  await prisma.$transaction([
    prisma.friendship.create({
      data: {
        userId: session.userId,
        friendId: targetUser.id,
      },
    }),
    prisma.friendship.create({
      data: {
        userId: targetUser.id,
        friendId: session.userId,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    friend: {
      id: targetUser.id,
      username: targetUser.username,
      name: targetUser.name,
      color: targetUser.color,
      lastSeen: targetUser.lastSeen,
    },
  });
}
