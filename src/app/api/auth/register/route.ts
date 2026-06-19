import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createToken,
  hashPassword,
  pickAvatarColor,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, name, password } = await request.json();

    if (!username || !name || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const email = username.toLowerCase().trim();
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!anonKey || anonKey === "your-supabase-anon-key-here") {
      return NextResponse.json(
        { error: "Supabase Anon Key is not configured in the environment." },
        { status: 500 }
      );
    }

    // Call Supabase Auth Signup API
    const supabaseRes = await fetch(
      "https://ksiilcxsmbdfqezzpzpl.supabase.co/auth/v1/signup",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
        },
        body: JSON.stringify({
          email: email,
          password: password,
          options: {
            data: {
              name: name.trim(),
            },
          },
        }),
      }
    );

    const supabaseData = await supabaseRes.json();

    if (!supabaseRes.ok) {
      const errorMsg =
        supabaseData.error_description ||
        supabaseData.msg ||
        supabaseData.error?.message ||
        "Registration failed";
      return NextResponse.json({ error: errorMsg }, { status: supabaseRes.status });
    }

    // Check if user already exists in public table
    let user = await prisma.user.findUnique({
      where: { username: email },
    });

    if (!user) {
      // Sync user profile into our public database User table
      user = await prisma.user.create({
        data: {
          username: email,
          name: name.trim(),
          password: await hashPassword(password),
          color: pickAvatarColor(email),
        },
      });
    }

    // Sign custom JWT token for app session
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

    // Set cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
