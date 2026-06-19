import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getRequestUser(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";

  if (q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const friendships = await prisma.friendship.findMany({
    where: {
      userId: session.userId,
      friend: {
        OR: [
          { username: { contains: q } },
          { name: { contains: q } },
        ],
      },
    },
    include: {
      friend: {
        select: { id: true, username: true, name: true, color: true, lastSeen: true },
      },
    },
    take: 10,
  });

  const users = friendships.map((f) => f.friend);

  return NextResponse.json({ users });
}
