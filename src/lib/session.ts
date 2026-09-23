"use server";
// src/lib/session.ts
// Lightweight signed-cookie session — stores userId + username.
//
// The cookie is httpOnly, but httpOnly only stops page JavaScript from READING
// it. It does not stop anyone from WRITING one: a player can set kod_session by
// hand in DevTools or with `curl -b`. Since every server action derives the
// acting player from this cookie, an unsigned cookie means anyone who learns a
// user id can act as that user — including the host.
//
// So the cookie carries an HMAC of its payload. The server can verify a cookie
// it issued without storing any session state, and a hand-written cookie is
// rejected because the attacker cannot produce a valid signature.

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "kod_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const DEV_FALLBACK_SECRET = "kod-dev-only-insecure-secret";

export interface Session {
  userId: string;
  username: string;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is not set (or is shorter than 16 characters). " +
        "Generate one with `openssl rand -base64 32` and add it to your environment.",
    );
  }
  return DEV_FALLBACK_SECRET;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Constant-time compare, so a wrong signature can't be found byte by byte. */
function signatureMatches(expected: string, received: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function setSession(session: Session) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const value = `${payload}.${sign(payload)}`;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, value, {
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

    const separator = raw.lastIndexOf(".");
    if (separator === -1) return null; // unsigned — an old cookie, or a forgery

    const payload = raw.slice(0, separator);
    const signature = raw.slice(separator + 1);
    if (!signatureMatches(sign(payload), signature)) return null;

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed?.userId !== "string" || typeof parsed?.username !== "string") return null;

    return { userId: parsed.userId, username: parsed.username };
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
