"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { gameRooms, players, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession, setSession } from "@/lib/session";
import { createFreshUser, normaliseUsername } from "@/lib/username";
import { assertRoomHasSpace } from "@/lib/room-capacity";
import { revalidatePath } from "next/cache";

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
  const rawName = normaliseUsername(formData.get("username"));

  if (!roomId) throw new Error("Room ID missing.");

  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room) throw new Error("Room not found.");
  if (room.status === "finished") throw new Error("This game has already finished.");

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
  await assertRoomHasSpace(roomId, userId, room.maxPlayers);
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

  // Check the room first — otherwise a stale link fails as a raw foreign-key
  // error instead of a message the player can act on.
  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room) throw new Error("Room not found.");
  if (room.status === "finished") throw new Error("This game has already finished.");

  await assertRoomHasSpace(roomId, session.userId, room.maxPlayers);
  await db.insert(players)
    .values({ userId: session.userId, roomId })
    .onConflictDoNothing();

  revalidatePath(`/room/${roomId}`);
  redirect(`/room/${roomId}`);
}
