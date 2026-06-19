import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken, hashPassword, pickAvatarColor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      );
    }

    // Verify token by calling Supabase's user metadata endpoint
    const supabaseUserRes = await fetch(
      "https://ksiilcxsmbdfqezzpzpl.supabase.co/auth/v1/user",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!supabaseUserRes.ok) {
      return NextResponse.json(
        { error: "Invalid Google session token" },
        { status: 401 }
      );
    }

    const supabaseUser = await supabaseUserRes.json();
    const email = (supabaseUser.email || "").toLowerCase().trim();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required from Google account" },
        { status: 400 }
      );
    }

    let user = await prisma.user.findUnique({
      where: { username: email },
    });

    if (!user) {
      // User doesn't exist, create a new profile
      const fullName =
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.user_metadata?.name ||
        email.split("@")[0];

      const tempPassword = Math.random().toString(36).slice(-12) + "A1!";
      const hashedPassword = await hashPassword(tempPassword);

      user = await prisma.user.create({
        data: {
          username: email,
          name: fullName.trim(),
          password: hashedPassword,
          color: pickAvatarColor(email),
        },
      });
    }

    // Sign custom application JWT token
    const token = await createToken({
      userId: user.id,
      username: user.username,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        color: user.color,
      },
      token,
    });

    // Set token cookie (matches standard auth login)
    response.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Google login API error:", err);
    return NextResponse.json(
      { error: "Google authentication failed" },
      { status: 500 }
    );
  }
}
