"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { gameRooms, players, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession, setSession } from "@/lib/session";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Create a fresh user. If the exact username is globally taken, append a short suffix. */
async function createFreshUser(desiredUsername: string) {
  // Try the exact username first
  const exact = await db.insert(users)
    .values({ username: desiredUsername, isAi: false })
    .onConflictDoNothing()
    .returning();

  if (exact.length > 0) return exact[0];

  // Username is globally taken — append suffix until we get a unique one
  for (let i = 0; i < 5; i++) {
    const candidate = `${desiredUsername}_${nanoid(3)}`;
    const result = await db.insert(users)
      .values({ username: candidate, isAi: false })
      .onConflictDoNothing()
      .returning();
    if (result.length > 0) return result[0];
  }

  throw new Error(`Could not create user "${desiredUsername}" — please try a different name.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// joinByLinkAction — called by the username form on the invite-link join page
//
// Behaviour:
//  • Always show username form (user can change their name)
//  • If session exists AND username is unchanged → use existing userId
//  • If session exists AND username changed → create NEW user, update session
//  • If no session → create NEW user, set session
//  • Username uniqueness in the room is validated (error redirect on collision)
// ─────────────────────────────────────────────────────────────────────────────
export async function joinByLinkAction(formData: FormData) {
  const roomId  = formData.get("roomId") as string;
  const rawName = (formData.get("username") as string | null)?.trim();

  if (!roomId) throw new Error("Room ID missing.");
  if (!rawName) throw new Error("Please enter a username.");

  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room) throw new Error("Room not found.");

  const existingSession = await getSession();

  let userId: string;
  let finalUsername: string;

  if (existingSession && existingSession.username === rawName) {
    // ── Same name as session → reuse existing identity ──────────────────────
    userId        = existingSession.userId;
    finalUsername = existingSession.username;
  } else {
    // ── New name (or no session) → create brand-new user ────────────────────
    // Check: is this name taken by a DIFFERENT player already in this room?
    const takenInRoom = await db
      .select({ id: players.id })
      .from(players)
      .innerJoin(users, eq(players.userId, users.id))
      .where(and(
        eq(players.roomId, roomId),
        eq(users.username, rawName),
      ))
      .limit(1);

    if (takenInRoom.length > 0) {
      redirect(`/join/${roomId}?error=${encodeURIComponent(`"${rawName}" is already taken in this room. Choose a different name.`)}`);
    }

    const newUser = await createFreshUser(rawName);
    userId        = newUser.id;
    finalUsername = newUser.username;

    // Update session to the new identity
    await setSession({ userId, username: finalUsername });
  }

  // Add to room (idempotent)
  await db.insert(players)
    .values({ userId, roomId })
    .onConflictDoNothing();

  revalidatePath(`/room/${roomId}`);
  redirect(`/room/${roomId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// sessionJoinAction — used from the "Join as [name]?" quick-join screen.
// Joins with existing session identity, no username change.
// ─────────────────────────────────────────────────────────────────────────────
export async function sessionJoinAction(formData: FormData) {
  const roomId = formData.get("roomId") as string;

  const session = await getSession();
  if (!session) redirect(`/join/${roomId}`);

  await db.insert(players)
    .values({ userId: session.userId, roomId })
    .onConflictDoNothing();

  revalidatePath(`/room/${roomId}`);
  redirect(`/room/${roomId}`);
}
