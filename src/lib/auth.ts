import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { verifyToken } from "./jwt";

export {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  pickAvatarColor,
  AVATAR_COLORS,
} from "./jwt";
export type { TokenPayload } from "./jwt";

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function getRequestUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  const cookieToken = request.cookies.get("token")?.value;
  const token = bearer || cookieToken;
  if (!token) return null;

  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}
