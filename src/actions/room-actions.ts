"use server";
// src/actions/room-actions.ts
// Handles Create Room and Join Room from the home page.
//
// Key security rule: ALWAYS INSERT a new user, never look up by name.
// This prevents someone from typing another player's name and hijacking their identity.
// If the chosen name is already taken in a room, we return a clear error.

import { redirect } from "next/navigation";
import { db } from "@/db";
import { gameRooms, players, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { setSession, getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

function generateRoomCode() { return nanoid(6).toUpperCase(); }

/** Insert a game room, retrying with a fresh code if the code is already taken. */
async function createUniqueRoom(hostUserId: string, maxPlayers: number, roundDuration: number, eliminationScore: number) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const roomCode = generateRoomCode();
    const inserted = await db.insert(gameRooms)
      .values({ roomCode, hostUserId, maxPlayers, roundDuration, eliminationScore })
      .onConflictDoNothing()
      .returning();
    if (inserted.length > 0) return inserted[0];
  }
  throw new Error("Could not generate a unique room code. Please try again.");
}

/** Insert a brand-new user row. If username is globally taken, append a short suffix. */
async function createFreshUser(desiredUsername: string) {
  const exact = await db.insert(users)
    .values({ username: desiredUsername, isAi: false })
    .onConflictDoNothing()
    .returning();
  if (exact.length > 0) return exact[0];

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
// Create Room
// ─────────────────────────────────────────────────────────────────────────────
export async function createRoomAction(formData: FormData) {
  const username = (formData.get("username") as string | null)?.trim();
  if (!username) throw new Error("Username is required.");

  // If they already have a session, reuse it — don't create a duplicate user
  const existing = await getSession();
  let userId: string;
  let finalName: string;

  if (existing) {
    userId = existing.userId;
    if (existing.username !== username) {
      // Check if username is globally taken
      const takenGlobal = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
      if (takenGlobal.length > 0 && takenGlobal[0].id !== userId) {
        throw new Error(`The name "${username}" is already taken globally. Please choose another name.`);
      }

      await db.update(users).set({ username }).where(eq(users.id, userId));
      finalName = username;
      await setSession({ userId, username: finalName });
    } else {
      finalName = existing.username;
    }
  } else {
    // Brand new user — always INSERT, never lookup
    const newUser = await createFreshUser(username);
    userId    = newUser.id;
    finalName = newUser.username;
    await setSession({ userId, username: finalName });
  }

  // Create the room — retries automatically if room code collides
  const room = await createUniqueRoom(userId, 999, 30, -10);

  await db.insert(players).values({ userId, roomId: room.id }).onConflictDoNothing();
  revalidatePath(`/room/${room.id}`);
  redirect(`/room/${room.id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Join Room by Code (home page form)
// ─────────────────────────────────────────────────────────────────────────────
export async function joinRoomAction(formData: FormData) {
  const username = (formData.get("username") as string | null)?.trim();
  const roomCode = (formData.get("roomCode") as string | null)?.trim().toUpperCase();
  if (!username) throw new Error("Username is required.");
  if (!roomCode) throw new Error("Room code is required.");

  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.roomCode, roomCode)).limit(1);
  if (!room) throw new Error(`Room "${roomCode}" not found.`);
  if (room.status === "finished") throw new Error("This game has already finished.");

  // If they have an existing session, check if name changed
  const existing = await getSession();
  let userId: string;

  if (existing) {
    userId = existing.userId;
    if (existing.username !== username) {
      const takenGlobal = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
      if (takenGlobal.length > 0 && takenGlobal[0].id !== userId) {
        throw new Error(`The name "${username}" is already taken globally. Please choose another name.`);
      }

      const taken = await db
        .select({ pUserId: players.userId })
        .from(players)
        .innerJoin(users, eq(players.userId, users.id))
        .where(and(eq(players.roomId, room.id), eq(users.username, username)))
        .limit(1);

      const takenByOther = taken.find(r => r.pUserId !== userId);
      if (takenByOther) throw new Error(`"${username}" is already taken in room ${roomCode}. Choose a different name.`);

      await db.update(users).set({ username }).where(eq(users.id, userId));
      await setSession({ userId, username });
    }
  } else {
    // No session — check if the username is taken in this room
    const takenInRoom = await db
      .select({ id: players.id })
      .from(players)
      .innerJoin(users, eq(players.userId, users.id))
      .where(and(eq(players.roomId, room.id), eq(users.username, username)))
      .limit(1);

    if (takenInRoom.length > 0) throw new Error(`"${username}" is already taken in room ${roomCode}. Choose a different name.`);

    const newUser = await createFreshUser(username);
    userId = newUser.id;
    await setSession({ userId, username: newUser.username });
  }

  await db.insert(players).values({ userId, roomId: room.id }).onConflictDoNothing();
  revalidatePath(`/room/${room.id}`);
  redirect(`/room/${room.id}`);
}
