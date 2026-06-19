import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function generateFriendCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { friendCode: true, friendCodeExpiresAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const now = new Date();
  let code = user.friendCode;
  let expiresAt = user.friendCodeExpiresAt;

  if (!code || !expiresAt || expiresAt <= now) {
    let uniqueCode = "";
    let attempts = 0;
    while (attempts < 10) {
      uniqueCode = generateFriendCode();
      const existing = await prisma.user.findUnique({
        where: { friendCode: uniqueCode },
      });
      if (!existing) break;
      attempts++;
    }

    expiresAt = new Date(Date.now() + 60 * 1000);
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        friendCode: uniqueCode,
        friendCodeExpiresAt: expiresAt,
      },
    });
    code = uniqueCode;
  }

  const secondsLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000));

  return NextResponse.json({
    code,
    expiresAt: expiresAt.toISOString(),
    secondsLeft,
  });
}
