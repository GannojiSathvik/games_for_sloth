"use server";
// src/lib/session.ts
// Lightweight cookie-based session — stores userId + username
// No auth library needed; just a signed httpOnly cookie

import { cookies } from "next/headers";

const SESSION_COOKIE = "kod_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface Session {
  userId: string;
  username: string;
}

export async function setSession(session: Session) {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE)?.value;
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
