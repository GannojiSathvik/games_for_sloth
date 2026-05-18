"use server";

import { db } from "@/db";
import { gameRooms, players, rounds, guesses, users } from "@/db/schema";
import { calculateRound, computeActiveRules } from "@/lib/game-engine";
import { eq, and, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function generateRoomCode() { return nanoid(6).toUpperCase(); }

export async function getOrCreateUser(username: string, isAi = false) {
  let [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user) [user] = await db.insert(users).values({ username, isAi }).returning();
  return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create / Join
// ─────────────────────────────────────────────────────────────────────────────

export async function createRoom(username: string, opts?: { roundDuration?: number; eliminationScore?: number }) {
  const user = await getOrCreateUser(username);
  const roomCode = generateRoomCode();
  const [room] = await db.insert(gameRooms).values({
    roomCode, hostUserId: user.id, maxPlayers: 999,
    roundDuration: opts?.roundDuration ?? 30,
    eliminationScore: opts?.eliminationScore ?? -10,
  }).returning();
  await db.insert(players).values({ userId: user.id, roomId: room.id });
  return room;
}

export async function joinRoom(username: string, roomCode: string) {
  const user = await getOrCreateUser(username);
  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.roomCode, roomCode.toUpperCase())).limit(1);
  if (!room) throw new Error(`Room '${roomCode}' not found.`);
  if (room.status === "finished") throw new Error("This game has already finished.");
  await db.insert(players).values({ userId: user.id, roomId: room.id }).onConflictDoNothing();
  revalidatePath(`/room/${room.id}`);
  return { room };
}

export async function joinRoomById(username: string, roomId: string) {
  const user = await getOrCreateUser(username);
  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room) throw new Error("Room not found.");
  if (room.status === "finished") throw new Error("This game has already finished.");
  await db.insert(players).values({ userId: user.id, roomId: room.id }).onConflictDoNothing();
  revalidatePath(`/room/${roomId}`);
  return { room, user };
}

// ─────────────────────────────────────────────────────────────────────────────
// Kick player (host, lobby only)
// ─────────────────────────────────────────────────────────────────────────────

export async function kickPlayer(formData: FormData) {
  const targetPlayerId = formData.get("targetPlayerId") as string;
  const hostUserId     = formData.get("hostUserId") as string;
  const roomId         = formData.get("roomId") as string;
  if (!targetPlayerId || !hostUserId || !roomId) return;
  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room || room.hostUserId !== hostUserId) return;
  await db.delete(players).where(eq(players.id, targetPlayerId));
  revalidatePath(`/room/${roomId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// AI — truly random, different spread per bot "personality"
// ─────────────────────────────────────────────────────────────────────────────

function getInstantAIGuess(): number {
  // Uniformly random 0-100 to avoid clustering;
  // each call is independently seeded by Math.random()
  return Math.floor(Math.random() * 101);
}

export async function addAIPlayers(roomId: string, count: number) {
  const labels = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta"];
  for (let i = 0; i < count; i++) {
    const label = labels[i % labels.length];
    const aiName = `Bot_${label}_${nanoid(4)}`;
    const aiUser = await getOrCreateUser(aiName, true);
    await db.insert(players).values({ userId: aiUser.id, roomId }).onConflictDoNothing();
  }
  revalidatePath(`/room/${roomId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit AI guesses instantly at round start
// ─────────────────────────────────────────────────────────────────────────────

export async function submitAIGuessesForRound(roundId: string, roomId: string) {
  const aiPlayers = await db
    .select({ id: players.id, username: users.username })
    .from(players)
    .innerJoin(users, eq(players.userId, users.id))
    .where(and(eq(players.roomId, roomId), eq(players.isEliminated, false), eq(users.isAi, true)));

  for (const ai of aiPlayers) {
    const guessValue = getInstantAIGuess();
    await db.insert(guesses).values({ roundId, playerId: ai.id, value: guessValue }).onConflictDoNothing();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Start game (≥3 players enforced, auto-fills bots)
// ─────────────────────────────────────────────────────────────────────────────

const MIN_PLAYERS = 3;

export async function startGame(roomId: string, hostUserId: string) {
  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room) throw new Error("Room not found.");
  if (room.hostUserId !== hostUserId) throw new Error("Only the host can start.");
  if (room.status !== "waiting") { revalidatePath(`/room/${roomId}`); return null; }

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(players).where(eq(players.roomId, roomId));
  if (total < MIN_PLAYERS) await addAIPlayers(roomId, MIN_PLAYERS - total);

  await db.update(gameRooms).set({ status: "active", currentRound: 1, updatedAt: new Date() }).where(eq(gameRooms.id, roomId));

  const deadline = new Date(Date.now() + room.roundDuration * 1000);
  const [round] = await db.insert(rounds).values({
    roomId, roundNumber: 1, status: "submitting", submissionDeadline: deadline,
  }).returning();

  await submitAIGuessesForRound(round.id, roomId);
  revalidatePath(`/room/${roomId}`);
  return round;
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit guess — returns success/error, auto-resolves when all humans submit
// ─────────────────────────────────────────────────────────────────────────────

export async function submitGuessAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const playerId = formData.get("playerId") as string;
  const roundId  = formData.get("roundId")  as string;
  const roomId   = formData.get("roomId")   as string;
  const raw      = formData.get("guess");

  if (!playerId || !roundId || !roomId)
    return { success: false, error: "Missing form data — please refresh." };

  const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1);
  if (!round) return { success: false, error: "Round not found." };
  if (round.status !== "submitting") {
    revalidatePath(`/room/${roomId}`);
    return { success: false, error: "This round has already closed." };
  }

  const [existing] = await db.select().from(guesses)
    .where(and(eq(guesses.roundId, roundId), eq(guesses.playerId, playerId))).limit(1);
  if (existing) {
    revalidatePath(`/room/${roomId}`);
    return { success: false, error: "You already submitted." };
  }

  const rawNum = raw !== null && raw !== "" ? Number(raw) : null;
  const value  = rawNum !== null && !isNaN(rawNum) ? Math.max(0, Math.min(100, Math.round(rawNum))) : null;
  const insertValue = value === null ? -1 : value; // -1 = skipped
  await db.insert(guesses).values({ roundId, playerId, value: insertValue }).onConflictDoNothing();

  // Auto-resolve if ALL non-eliminated humans have now submitted
  const humanPlayers = await db
    .select({ id: players.id })
    .from(players)
    .innerJoin(users, eq(players.userId, users.id))
    .where(and(eq(players.roomId, round.roomId), eq(players.isEliminated, false), eq(users.isAi, false)));

  const submitted = await db.select({ playerId: guesses.playerId }).from(guesses).where(eq(guesses.roundId, roundId));
  const submittedSet = new Set(submitted.map(g => g.playerId));
  const allHumansIn  = humanPlayers.every(p => submittedSet.has(p.id));

  if (allHumansIn) await resolveRound(roundId);

  revalidatePath(`/room/${roomId}`);
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve a round — calculates scores, marks "completed"
// Does NOT advance to next round (client calls advanceRound after showing results)
// ─────────────────────────────────────────────────────────────────────────────

export async function resolveRound(roundId: string) {
  const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1);
  if (!round || round.status === "completed" || round.status === "calculating") return;

  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, round.roomId)).limit(1);
  if (!room) return;

  await db.update(rounds).set({ status: "calculating" }).where(eq(rounds.id, roundId));

  // Fill in -1 for anyone who never submitted
  const activePlayers = await db.select({ id: players.id }).from(players)
    .where(and(eq(players.roomId, round.roomId), eq(players.isEliminated, false)));

  const allGuessesRaw = await db.select({ playerId: guesses.playerId }).from(guesses)
    .where(eq(guesses.roundId, roundId));

  const alreadySubmitted = new Set(allGuessesRaw.map(g => g.playerId));
  for (const p of activePlayers) {
    if (!alreadySubmitted.has(p.id))
      await db.insert(guesses).values({ roundId, playerId: p.id, value: -1 }).onConflictDoNothing();
  }

  const allGuesses = await db.select({ id: guesses.id, playerId: guesses.playerId, value: guesses.value })
    .from(guesses).where(eq(guesses.roundId, roundId));

  const validGuesses   = allGuesses.filter(g => g.value >= 0);
  const skippedGuesses = allGuesses.filter(g => g.value < 0);

  // -1 penalty + tag for skipped
  for (const sg of skippedGuesses) {
    await db.update(players).set({ score: sql`${players.score} - 1` }).where(eq(players.id, sg.playerId));
    await db.update(guesses).set({ scoreDelta: -1, deviation: 999, isRoundWinner: false, isExactMatch: false })
      .where(eq(guesses.id, sg.id));
  }

  if (validGuesses.length > 0) {
    const activeRules = (room.activeRules ?? []) as string[];
    const result = calculateRound(
      validGuesses.map(g => ({ playerId: g.playerId, value: g.value })),
      activeRules,
      activePlayers.length, // needed for Rule 3 two-player gate
    );

    await db.update(rounds).set({
      targetNumber: result.targetNumber,
      averageGuess: result.averageGuess,
      triggeredRules: result.triggeredRules,
      status: "completed",
      resolvedAt: new Date(),
    }).where(eq(rounds.id, roundId));

    const bMap = new Map(result.breakdown.map(b => [b.playerId, b]));
    for (const g of validGuesses) {
      const bd = bMap.get(g.playerId);
      if (bd) await db.update(guesses).set({
        deviation:          bd.deviation,
        scoreDelta:         bd.scoreDelta,
        isRoundWinner:      bd.isWinner,
        isExactMatch:       bd.isExactMatch,
        isDuplicatePenalty: bd.isDuplicatePenalty,
      }).where(eq(guesses.id, g.id));
    }
    for (const bd of result.breakdown)
      await db.update(players).set({ score: sql`${players.score} + ${bd.scoreDelta}` }).where(eq(players.id, bd.playerId));
  } else {
    await db.update(rounds).set({ status: "completed", resolvedAt: new Date(), targetNumber: 0, averageGuess: 0 })
      .where(eq(rounds.id, roundId));
  }

  revalidatePath(`/room/${round.roomId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Advance round — called by client ResultTimer after 5s of showing results
// Handles eliminations, consecutive-skip kicks, then creates next round
// ─────────────────────────────────────────────────────────────────────────────

export async function advanceRound(roomId: string) {
  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room || room.status !== "active") return;

  // Verify current round is completed (race-condition guard)
  const [currentRound] = await db.select().from(rounds)
    .where(and(eq(rounds.roomId, roomId), eq(rounds.roundNumber, room.currentRound))).limit(1);
  if (!currentRound || currentRound.status !== "completed") return;

  // Guard: if the next round already exists, don't double-advance
  const nextRoundNumber = room.currentRound + 1;
  const [nextExists] = await db.select({ id: rounds.id }).from(rounds)
    .where(and(eq(rounds.roomId, roomId), eq(rounds.roundNumber, nextRoundNumber))).limit(1);
  if (nextExists) {
    await db.update(gameRooms).set({ currentRound: nextRoundNumber, updatedAt: new Date() }).where(eq(gameRooms.id, roomId));
    revalidatePath(`/room/${roomId}`);
    return;
  }

  const allPlayers = await db.select().from(players)
    .where(and(eq(players.roomId, roomId), eq(players.isEliminated, false)));

  // ── Consecutive-skip elimination (3 skips in a row → eliminated) ──────────
  const SKIP_LIMIT = 3;
  const recentRounds = await db.select({ id: rounds.id, roundNumber: rounds.roundNumber })
    .from(rounds)
    .where(and(eq(rounds.roomId, roomId), eq(rounds.status, "completed")))
    .orderBy(desc(rounds.roundNumber))
    .limit(SKIP_LIMIT);

  let newEliminationsCount = 0;

  for (const p of allPlayers) {
    let consecutiveSkips = 0;
    for (const r of recentRounds) {
      const [g] = await db.select({ value: guesses.value }).from(guesses)
        .where(and(eq(guesses.roundId, r.id), eq(guesses.playerId, p.id))).limit(1);
      if (!g || g.value < 0) consecutiveSkips++;
      else break;
    }
    if (consecutiveSkips >= SKIP_LIMIT) {
      await db.update(players).set({ isEliminated: true }).where(eq(players.id, p.id));
      newEliminationsCount++;
    }
  }

  // ── Score-based elimination ───────────────────────────────────────────────
  const stillActive = await db.select().from(players)
    .where(and(eq(players.roomId, roomId), eq(players.isEliminated, false)));

  const toEliminate = stillActive.filter(p => p.score <= room.eliminationScore);
  for (const p of toEliminate)
    await db.update(players).set({ isEliminated: true }).where(eq(players.id, p.id));

  newEliminationsCount += toEliminate.length;

  // ── Update elimination count + unlock progressive rules ───────────────────
  const totalEliminations = (room.eliminationCount ?? 0) + newEliminationsCount;
  const newActiveRules = computeActiveRules(totalEliminations);

  const remaining = stillActive.filter(p => !toEliminate.find(e => e.id === p.id));

  // ── Game over? ────────────────────────────────────────────────────────────
  if (remaining.length <= 1) {
    if (remaining.length === 1)
      await db.update(players).set({ isWinner: true }).where(eq(players.id, remaining[0].id));
    await db.update(gameRooms).set({
      status: "finished",
      eliminationCount: totalEliminations,
      activeRules: newActiveRules,
      updatedAt: new Date(),
    }).where(eq(gameRooms.id, roomId));
    revalidatePath(`/room/${roomId}`);
    return;
  }

  // ── Start next round ──────────────────────────────────────────────────────
  const nextRound = room.currentRound + 1;

  // New rules just unlocked this advance → give players 5 minutes to read them
  const oldRuleCount = ((room.activeRules ?? []) as string[]).length;
  const isRuleIntroRound = newActiveRules.length > oldRuleCount;
  const durationMs = isRuleIntroRound ? 5 * 60 * 1000 : room.roundDuration * 1000;
  const deadline = new Date(Date.now() + durationMs);

  const inserted = await db.insert(rounds).values({
    roomId, roundNumber: nextRound, status: "submitting", submissionDeadline: deadline,
  }).onConflictDoNothing().returning();

  // If another client already created this round, just sync state and return.
  if (inserted.length === 0) {
    if (room.currentRound < nextRound) {
      await db.update(gameRooms)
        .set({ currentRound: nextRound, eliminationCount: totalEliminations, activeRules: newActiveRules, updatedAt: new Date() })
        .where(eq(gameRooms.id, roomId));
    }
    revalidatePath(`/room/${roomId}`);
    return;
  }

  const newRound = inserted[0];

  // Update currentRound AND the progressive rule state
  await db.update(gameRooms)
    .set({ currentRound: nextRound, eliminationCount: totalEliminations, activeRules: newActiveRules, updatedAt: new Date() })
    .where(eq(gameRooms.id, roomId));

  await submitAIGuessesForRound(newRound.id, roomId);
  revalidatePath(`/room/${roomId}`);
}


// ─────────────────────────────────────────────────────────────────────────────
// Force-resolve by roomId (called by countdown timer on expiry)
// ─────────────────────────────────────────────────────────────────────────────

export async function resolveCurrentRound(roomId: string) {
  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room || room.status !== "active") return;
  const [round] = await db.select().from(rounds)
    .where(and(eq(rounds.roomId, roomId), eq(rounds.roundNumber, room.currentRound))).limit(1);
  if (!round || round.status !== "submitting") return;
  await resolveRound(round.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Get room state
// ─────────────────────────────────────────────────────────────────────────────

export async function getRoomState(roomId: string) {
  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room) throw new Error("Room not found.");

  const roomPlayers = await db.select({
    id: players.id, userId: players.userId, score: players.score,
    isEliminated: players.isEliminated, isWinner: players.isWinner,
    username: users.username, avatarUrl: users.avatarUrl, isAi: users.isAi,
  }).from(players).innerJoin(users, eq(players.userId, users.id)).where(eq(players.roomId, roomId));

  const [currentRound] = await db.select().from(rounds)
    .where(and(eq(rounds.roomId, roomId), eq(rounds.roundNumber, room.currentRound))).limit(1);

  // Who submitted
  let submittedPlayerIds: string[] = [];
  let submittedValues: Record<string, number> = {};

  if (currentRound) {
    const subs = await db.select({ playerId: guesses.playerId, value: guesses.value })
      .from(guesses).where(eq(guesses.roundId, currentRound.id));
    submittedPlayerIds = subs.map(g => g.playerId);
    // Reveal values only after round is completed
    if (currentRound.status === "completed") {
      for (const g of subs) submittedValues[g.playerId] = g.value;
    }
  }

  // Current-round results (when status = "completed", show these as the result panel)
  const showingResults = currentRound?.status === "completed" && room.status === "active";

  let currentResult: {
    targetNumber: number | null; averageGuess: number | null; roundNumber: number;
    resolvedAt: Date | null;
    triggeredRules: string[];
    breakdown: Array<{
      playerId: string; username: string; value: number;
      deviation: number | null; scoreDelta: number | null;
      isWinner: boolean; isExactMatch: boolean; isDuplicatePenalty: boolean;
    }>;
  } | null = null;

  if (showingResults && currentRound) {
    const gRows = await db.select({
      playerId: guesses.playerId, value: guesses.value,
      deviation: guesses.deviation, scoreDelta: guesses.scoreDelta,
      isWinner: guesses.isRoundWinner, isExact: guesses.isExactMatch,
      isDuplicatePenalty: guesses.isDuplicatePenalty,
      username: users.username,
    }).from(guesses)
      .innerJoin(players, eq(guesses.playerId, players.id))
      .innerJoin(users, eq(players.userId, users.id))
      .where(eq(guesses.roundId, currentRound.id));

    currentResult = {
      targetNumber: currentRound.targetNumber,
      averageGuess: currentRound.averageGuess,
      roundNumber: currentRound.roundNumber,
      resolvedAt: currentRound.resolvedAt,
      triggeredRules: (currentRound.triggeredRules ?? []) as string[],
      breakdown: gRows.map(g => ({
        playerId: g.playerId, username: g.username, value: g.value,
        deviation: g.deviation, scoreDelta: g.scoreDelta,
        isWinner: g.isWinner, isExactMatch: g.isExact,
        isDuplicatePenalty: g.isDuplicatePenalty,
      })),
    };
  }

  return {
    room, players: roomPlayers,
    currentRound: currentRound ?? null,
    submittedPlayerIds, submittedValues,
    showingResults,
    currentResult,
  };
}
