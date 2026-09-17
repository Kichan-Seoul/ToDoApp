import "server-only";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import {
  encrypt,
  decrypt,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
} from "@/lib/session-core";

export type Session = { userId: string };

export async function createSession(userId: string, tokenVersion: number): Promise<void> {
  const token = await encrypt({ userId, tokenVersion });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + SESSION_TTL_MS),
  });
}

/**
 * Secure check: verifies the JWT signature AND that its tokenVersion still
 * matches the user's current tokenVersion in the DB, so a logged-out session
 * (whose token a client may still be holding) is rejected everywhere data is
 * actually read or written. (proxy.ts does a cheaper optimistic check with no
 * DB access, per Next.js's own guidance to keep Proxy checks DB-free.)
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const payload = await decrypt(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!payload) return null;

  await connectDB();
  const user = await User.findById(payload.userId).select("tokenVersion");
  if (!user || user.tokenVersion !== payload.tokenVersion) return null;

  return { userId: payload.userId };
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const payload = await decrypt(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  cookieStore.delete(SESSION_COOKIE_NAME);

  if (payload) {
    await connectDB();
    await User.findByIdAndUpdate(payload.userId, { $inc: { tokenVersion: 1 } });
  }
}
