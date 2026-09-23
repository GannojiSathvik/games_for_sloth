// src/lib/room-capacity.ts
// One capacity check, shared by every path that puts a player in a room.
//
// `game_rooms.maxPlayers` existed from the beginning but nothing read it, so a
// room had no practical limit. Rooms are joined from three places (the home
// page code form, the invite link, and the quick re-join), and a bot top-up is
// a fourth, so the check belongs in one function rather than four.

import { db } from "@/db";
import { players } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Throw if this room has no room left for `userId`.
 *
 * A player who is already in the room always passes: re-joining (a refresh, a
 * second tab, a name change) must never be blocked by a room being full,
 * because it does not add anyone.
 */
export async function assertRoomHasSpace(roomId: string, userId: string, maxPlayers: number) {
  const [alreadyIn] = await db
    .select({ id: players.id })
    .from(players)
    .where(and(eq(players.roomId, roomId), eq(players.userId, userId)))
    .limit(1);
  if (alreadyIn) return;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(players)
    .where(eq(players.roomId, roomId));

  if (total >= maxPlayers) {
    throw new Error(`This room is full (${maxPlayers} players).`);
  }
}
