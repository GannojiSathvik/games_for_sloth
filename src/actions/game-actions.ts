"use server";

import { db } from "@/db";
import { gameRooms, players, rounds, guesses, users } from "@/db/schema";
import { calculateRound, computeActiveRules, RPS_VALUES, RULE_INTRO_EXTRA_MS } from "@/lib/game-engine";
import { pickBotNames } from "@/lib/bot-names";
import { getSmartAIGuess, personalityFor } from "@/lib/bot-ai";
import { getSession } from "@/lib/session";
import { eq, and, lte, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

// A "use server" module may only export async functions, so shared constants
// live in the pure game-engine module and are imported here.

/** Most bots a single "add bots" request may create. */
const MAX_BOTS_PER_REQUEST = 20;

/** How long this round's submission window should be, in ms. */
function roundDurationMs(roundSeconds: number, isRuleIntro: boolean) {
  return roundSeconds * 1000 + (isRuleIntro ? RULE_INTRO_EXTRA_MS : 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Identity helpers
//
// Every mutating action derives WHO is acting from the httpOnly session cookie.
// Nothing trusts an id that arrived in a form field: hidden inputs are attacker
// controlled, and server actions are callable directly once their id is known.
// ─────────────────────────────────────────────────────────────────────────────

/** The caller's player row in this room, or null if they aren't in it. */
async function getCallerPlayer(roomId: string) {
  const session = await getSession();
  if (!session) return null;

  const [row] = await db
    .select({
      id: players.id,
      userId: players.userId,
      isEliminated: players.isEliminated,
      joinedAt: players.joinedAt,
    })
    .from(players)
    .where(and(eq(players.roomId, roomId), eq(players.userId, session.userId)))
    .limit(1);

  return row ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI — smart bots with personalities and curated names
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a brand-new AI user row.
 *
 * Bots must never reuse an existing `users` row: the curated name list can
 * collide with a real person's username, and reusing that row would drag a
 * human's identity into a room they never joined.
 */
async function createBotUser(displayName: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const username = attempt === 0 ? displayName : `${displayName}_${nanoid(3)}`;
    const [created] = await db
      .insert(users)
      .values({ username, isAi: true })
      .onConflictDoNothing()
      .returning();
    if (created) return created;
  }
  return null;
}

/**
 * Add bots to a room. INTERNAL — assumes the caller has already checked who is
 * asking and whether the room has space. `addBotsAction` is the door from the
 * browser; `startGame` calls this directly to top a short room up.
 */
async function seedBots(roomId: string, count: number) {
  if (count <= 0) return 0;

  const existingPlayers = await db
    .select({ username: users.username })
    .from(players)
    .innerJoin(users, eq(players.userId, users.id))
    .where(eq(players.roomId, roomId));
  const existingNames = existingPlayers.map((p) => p.username);

  let added = 0;
  for (const name of pickBotNames(count, existingNames)) {
    const aiUser = await createBotUser(name);
    if (!aiUser) continue;
    const inserted = await db
      .insert(players)
      .values({ userId: aiUser.id, roomId })
      .onConflictDoNothing()
      .returning({ id: players.id });
    if (inserted.length > 0) added++;
  }
  return added;
}

/**
 * Host-only "add bots" button.
 *
 * This used to be an exported server action with no checks at all. A server
 * action is a public POST endpoint once its id is known, so *anyone* who had a
 * room id could flood *any* room with bots — including a game already in
 * progress, which would have silently changed the maths of a live round. The
 * `count` was clamped in the browser only, so a hand-crafted request could ask
 * for ten thousand bots and hold the connection open through that many inserts.
 *
 * Every one of those is now checked on the server: the caller must be the host,
 * the room must still be in the lobby, and the room's capacity is the ceiling.
 */
export async function addBotsAction(
  roomId: string,
  count: number,
): Promise<{ added: number; error?: string }> {
  const session = await getSession();
  if (!session) return { added: 0, error: "You are not signed in." };

  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room) return { added: 0, error: "Room not found." };
  if (room.hostUserId !== session.userId) return { added: 0, error: "Only the host can add bots." };
  if (room.status !== "waiting") return { added: 0, error: "The game has already started." };

  const requested = Math.floor(Number(count));
  if (!Number.isFinite(requested) || requested < 1) return { added: 0, error: "Pick at least 1 bot." };

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(players)
    .where(eq(players.roomId, roomId));

  const space = room.maxPlayers - total;
  if (space <= 0) return { added: 0, error: `This room is full (${room.maxPlayers} players).` };

  const added = await seedBots(roomId, Math.min(requested, MAX_BOTS_PER_REQUEST, space));
  revalidatePath(`/room/${roomId}`);

  if (added === 0) return { added: 0, error: "Could not add any bots — try again." };
  return { added };
}

/** Bots submit the moment a round opens, so humans never wait on them. */
async function submitAIGuessesForRound(roundId: string, roomId: string, roundNumber: number) {
  const aiPlayers = await db
    .select({ id: players.id })
    .from(players)
    .innerJoin(users, eq(players.userId, users.id))
    .where(and(eq(players.roomId, roomId), eq(players.isEliminated, false), eq(users.isAi, true)));

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(players)
    .where(and(eq(players.roomId, roomId), eq(players.isEliminated, false)));

  // A bot's personality is derived from its player id, so it is the same bot
  // every round. Leaving it unset re-rolled the personality on every single
  // guess, which quietly collapsed eight distinct strategies into one blended
  // random distribution — the feature existed but never actually ran.
  for (const ai of aiPlayers) {
    const guessValue = getSmartAIGuess(roundNumber, total, personalityFor(ai.id));
    await db.insert(guesses).values({ roundId, playerId: ai.id, value: guessValue }).onConflictDoNothing();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Kick player (host only, lobby only)
// ─────────────────────────────────────────────────────────────────────────────

export async function kickPlayer(formData: FormData) {
  const targetPlayerId = formData.get("targetPlayerId") as string;
  const roomId = formData.get("roomId") as string;
  if (!targetPlayerId || !roomId) return;

  const session = await getSession();
  if (!session) return;

  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room || room.hostUserId !== session.userId) return;
  // Kicking mid-game would delete that player's guesses and silently change the
  // maths of a round that is already in flight.
  if (room.status !== "waiting") return;

  // Scope the delete to this room so a stray id can't remove a player elsewhere,
  // and never let the host kick themselves out of their own room.
  const [target] = await db
    .select({ userId: players.userId })
    .from(players)
    .where(and(eq(players.id, targetPlayerId), eq(players.roomId, roomId)))
    .limit(1);
  if (!target || target.userId === room.hostUserId) return;

  await db.delete(players).where(and(eq(players.id, targetPlayerId), eq(players.roomId, roomId)));
  revalidatePath(`/room/${roomId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Start game — host only, ≥ MIN_PLAYERS enforced, auto-fills bots
// ─────────────────────────────────────────────────────────────────────────────

const MIN_PLAYERS = 2;

export async function startGame(roomId: string) {
  const session = await getSession();
  if (!session) throw new Error("You are not signed in.");

  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room) throw new Error("Room not found.");
  if (room.hostUserId !== session.userId) throw new Error("Only the host can start.");

  // Claim the transition: the row only flips waiting → active once, so a
  // double-click or two racing clients can't both create round 1.
  const claimed = await db
    .update(gameRooms)
    .set({ status: "active", currentRound: 1, updatedAt: new Date() })
    .where(and(eq(gameRooms.id, roomId), eq(gameRooms.status, "waiting")))
    .returning({ id: gameRooms.id });
  if (claimed.length === 0) {
    revalidatePath(`/room/${roomId}`);
    return null;
  }

  // The Neon HTTP driver has no transactions, so the room is already "active"
  // while we set up round 1. If any of that fails the room would be live with
  // no round to play, and nothing would ever create one — so undo the claim
  // explicitly and let the host press Start again.
  try {
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(players)
      .where(eq(players.roomId, roomId));
    if (total < MIN_PLAYERS) await seedBots(roomId, MIN_PLAYERS - total);

    const [{ finalTotal }] = await db
      .select({ finalTotal: sql<number>`count(*)::int` })
      .from(players)
      .where(eq(players.roomId, roomId));

    // Rule 3 applies immediately if the game starts as a 1-v-1.
    const startingRules: string[] = finalTotal === 2 ? ["zero_hundred"] : [];
    const isRuleIntro = startingRules.length > 0;

    await db
      .update(gameRooms)
      .set({ activeRules: startingRules, updatedAt: new Date() })
      .where(eq(gameRooms.id, roomId));

    const deadline = new Date(Date.now() + roundDurationMs(room.roundDuration, isRuleIntro));
    const [round] = await db
      .insert(rounds)
      .values({ roomId, roundNumber: 1, status: "submitting", submissionDeadline: deadline })
      .onConflictDoNothing()
      .returning();

    if (round) await submitAIGuessesForRound(round.id, roomId, 1);
    revalidatePath(`/room/${roomId}`);
    return round ?? null;
  } catch (err) {
    await db
      .update(gameRooms)
      .set({ status: "waiting", currentRound: 0, activeRules: [], updatedAt: new Date() })
      .where(eq(gameRooms.id, roomId));
    revalidatePath(`/room/${roomId}`);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit guess
// ─────────────────────────────────────────────────────────────────────────────

/** Small grace period so a submission in flight when the clock hits 0 still lands. */
const SUBMIT_GRACE_MS = 2_000;

export async function submitGuessAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const roundId = formData.get("roundId") as string;
  const roomId = formData.get("roomId") as string;
  const raw = formData.get("guess");

  if (!roundId || !roomId) return { success: false, error: "Missing form data — please refresh." };

  // WHO is submitting comes from the session, never from the form. Otherwise any
  // player could post a guess on a rival's behalf.
  const me = await getCallerPlayer(roomId);
  if (!me) return { success: false, error: "You are not a player in this room." };
  if (me.isEliminated) return { success: false, error: "You have been eliminated." };

  const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1);
  if (!round || round.roomId !== roomId) return { success: false, error: "Round not found." };
  if (round.status !== "submitting") {
    revalidatePath(`/room/${roomId}`);
    return { success: false, error: "This round has already closed." };
  }
  if (round.submissionDeadline && Date.now() > round.submissionDeadline.getTime() + SUBMIT_GRACE_MS) {
    revalidatePath(`/room/${roomId}`);
    return { success: false, error: "Time's up for this round." };
  }

  const rawNum = raw !== null && raw !== "" ? Number(raw) : NaN;
  if (!Number.isFinite(rawNum)) return { success: false, error: "Pick a number between 0 and 100." };
  const value = Math.max(0, Math.min(100, Math.round(rawNum)));

  // In a 1-v-1 the round is scored as rock-paper-scissors, so only 0/1/100 are
  // legal. Validating here stops a hand-crafted request from poisoning the round.
  const [{ activeCount }] = await db
    .select({ activeCount: sql<number>`count(*)::int` })
    .from(players)
    .where(and(eq(players.roomId, roomId), eq(players.isEliminated, false)));
  if (activeCount === 2 && !RPS_VALUES.includes(value)) {
    return { success: false, error: "With 2 players left you must pick 0, 1 or 100." };
  }

  const inserted = await db
    .insert(guesses)
    .values({ roundId, playerId: me.id, value })
    .onConflictDoNothing()
    .returning({ id: guesses.id });

  if (inserted.length === 0) {
    revalidatePath(`/room/${roomId}`);
    return { success: false, error: "You already submitted." };
  }

  // Auto-resolve as soon as every human who is eligible this round has answered.
  const humanPlayers = await db
    .select({ id: players.id })
    .from(players)
    .innerJoin(users, eq(players.userId, users.id))
    .where(
      and(
        eq(players.roomId, roomId),
        eq(players.isEliminated, false),
        eq(users.isAi, false),
        lte(players.joinedAt, round.createdAt),
      ),
    );

  const submitted = await db
    .select({ playerId: guesses.playerId })
    .from(guesses)
    .where(eq(guesses.roundId, roundId));
  const submittedSet = new Set(submitted.map((g) => g.playerId));

  if (humanPlayers.every((p) => submittedSet.has(p.id))) await resolveRound(roundId);

  revalidatePath(`/room/${roomId}`);
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve a round — calculates scores, marks "completed".
// Does NOT advance to the next round (the client shows results first).
// ─────────────────────────────────────────────────────────────────────────────

export async function resolveRound(roundId: string) {
  // ── Claim the round before touching any scores ────────────────────────────
  // This UPDATE is the concurrency control. Postgres locks the row, so exactly
  // one caller sees a non-empty result even if the deadline timer and the last
  // submission fire at the same instant. Read-then-write would let both callers
  // through and apply every score delta twice.
  const claimed = await db
    .update(rounds)
    .set({ status: "calculating" })
    .where(and(eq(rounds.id, roundId), eq(rounds.status, "submitting")))
    .returning();
  if (claimed.length === 0) return;
  const round = claimed[0];

  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, round.roomId)).limit(1);
  if (!room) return;

  // Players eligible this round: active, and already in the room when it opened.
  // Someone who joins mid-round shouldn't be auto-scored for a round they never
  // had a chance to see.
  const eligiblePlayers = await db
    .select({ id: players.id })
    .from(players)
    .where(
      and(
        eq(players.roomId, round.roomId),
        eq(players.isEliminated, false),
        lte(players.joinedAt, round.createdAt),
      ),
    );

  const submittedRows = await db
    .select({ playerId: guesses.playerId })
    .from(guesses)
    .where(eq(guesses.roundId, roundId));
  const alreadySubmitted = new Set(submittedRows.map((g) => g.playerId));

  // No answer counts as 0 — the Nash-equilibrium guess, and never a free pass.
  for (const p of eligiblePlayers) {
    if (!alreadySubmitted.has(p.id))
      await db.insert(guesses).values({ roundId, playerId: p.id, value: 0 }).onConflictDoNothing();
  }

  const allGuesses = await db
    .select({ id: guesses.id, playerId: guesses.playerId, value: guesses.value })
    .from(guesses)
    .where(eq(guesses.roundId, roundId));

  if (allGuesses.length === 0) {
    await db
      .update(rounds)
      .set({ status: "completed", resolvedAt: new Date(), targetNumber: 0, averageGuess: 0 })
      .where(eq(rounds.id, roundId));
    revalidatePath(`/room/${round.roomId}`);
    return;
  }

  const [{ activeCount }] = await db
    .select({ activeCount: sql<number>`count(*)::int` })
    .from(players)
    .where(and(eq(players.roomId, round.roomId), eq(players.isEliminated, false)));

  const result = calculateRound(
    allGuesses.map((g) => ({ playerId: g.playerId, value: g.value })),
    (room.activeRules ?? []) as string[],
    activeCount,
  );

  await db
    .update(rounds)
    .set({
      targetNumber: result.targetNumber,
      averageGuess: result.averageGuess,
      triggeredRules: result.triggeredRules,
      status: "completed",
      resolvedAt: new Date(),
    })
    .where(eq(rounds.id, roundId));

  const guessIdByPlayer = new Map(allGuesses.map((g) => [g.playerId, g.id]));
  for (const bd of result.breakdown) {
    const guessId = guessIdByPlayer.get(bd.playerId);
    if (!guessId) continue;
    await db
      .update(guesses)
      .set({
        deviation: bd.deviation,
        scoreDelta: bd.scoreDelta,
        isRoundWinner: bd.isWinner,
        isExactMatch: bd.isExactMatch,
        isDuplicatePenalty: bd.isDuplicatePenalty,
      })
      .where(eq(guesses.id, guessId));
  }

  // Score deltas only ever take a handful of distinct values (0, −1, −2), so
  // group by delta: 2–3 statements instead of one HTTP round trip per player.
  const idsByDelta = new Map<number, string[]>();
  for (const bd of result.breakdown) {
    if (bd.scoreDelta === 0) continue;
    const bucket = idsByDelta.get(bd.scoreDelta) ?? [];
    bucket.push(bd.playerId);
    idsByDelta.set(bd.scoreDelta, bucket);
  }
  for (const [delta, ids] of idsByDelta) {
    await db
      .update(players)
      .set({ score: sql`${players.score} + ${delta}` })
      .where(inArray(players.id, ids));
  }

  revalidatePath(`/room/${round.roomId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Advance round — called by the client once results have been shown.
// Handles eliminations, rule unlocks, then opens the next round.
// ─────────────────────────────────────────────────────────────────────────────

export async function advanceRound(roomId: string) {
  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room || room.status !== "active") return;

  const [currentRound] = await db
    .select()
    .from(rounds)
    .where(and(eq(rounds.roomId, roomId), eq(rounds.roundNumber, room.currentRound)))
    .limit(1);
  if (!currentRound || currentRound.status !== "completed") return;

  const nextRoundNumber = room.currentRound + 1;

  // Another client may already have advanced. Only nudge the pointer forward —
  // re-running the elimination pass here is what used to corrupt the counters.
  const [nextExists] = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(and(eq(rounds.roomId, roomId), eq(rounds.roundNumber, nextRoundNumber)))
    .limit(1);
  if (nextExists) {
    await db
      .update(gameRooms)
      .set({ currentRound: nextRoundNumber, updatedAt: new Date() })
      .where(and(eq(gameRooms.id, roomId), sql`${gameRooms.currentRound} < ${nextRoundNumber}`));
    revalidatePath(`/room/${roomId}`);
    return;
  }

  // ── Score-based elimination ───────────────────────────────────────────────
  const stillActive = await db
    .select()
    .from(players)
    .where(and(eq(players.roomId, roomId), eq(players.isEliminated, false)));

  const toEliminate = stillActive.filter((p) => p.score <= room.eliminationScore);
  if (toEliminate.length > 0) {
    await db
      .update(players)
      .set({ isEliminated: true })
      .where(inArray(players.id, toEliminate.map((p) => p.id)));
  }

  // Count eliminations from the table rather than incrementing a stored counter.
  // The old `stored + newlyFound` accumulator could be reset to 0 by a second,
  // slower caller that found nothing left to eliminate.
  const [{ totalEliminations }] = await db
    .select({ totalEliminations: sql<number>`count(*)::int` })
    .from(players)
    .where(and(eq(players.roomId, roomId), eq(players.isEliminated, true)));

  const eliminatedIds = new Set(toEliminate.map((p) => p.id));
  const remaining = stillActive.filter((p) => !eliminatedIds.has(p.id));

  const newActiveRules = computeActiveRules(totalEliminations);
  // Rule 3 is player-count based, not elimination-count based.
  if (remaining.length === 2 && !newActiveRules.includes("zero_hundred")) {
    newActiveRules.push("zero_hundred");
  }

  // ── Game over? ────────────────────────────────────────────────────────────
  if (remaining.length <= 1) {
    if (remaining.length === 1)
      await db.update(players).set({ isWinner: true }).where(eq(players.id, remaining[0].id));
    await db
      .update(gameRooms)
      .set({
        status: "finished",
        eliminationCount: totalEliminations,
        activeRules: newActiveRules,
        updatedAt: new Date(),
      })
      .where(eq(gameRooms.id, roomId));
    revalidatePath(`/room/${roomId}`);
    return;
  }

  // ── Open the next round ───────────────────────────────────────────────────
  const oldRules = (room.activeRules ?? []) as string[];
  const isRuleIntro = newActiveRules.some((r) => !oldRules.includes(r));
  const deadline = new Date(Date.now() + roundDurationMs(room.roundDuration, isRuleIntro));

  const inserted = await db
    .insert(rounds)
    .values({ roomId, roundNumber: nextRoundNumber, status: "submitting", submissionDeadline: deadline })
    .onConflictDoNothing()
    .returning();

  await db
    .update(gameRooms)
    .set({
      currentRound: nextRoundNumber,
      eliminationCount: totalEliminations,
      activeRules: newActiveRules,
      updatedAt: new Date(),
    })
    .where(eq(gameRooms.id, roomId));

  // Only the caller that actually created the round row seeds the bot guesses.
  if (inserted.length > 0) await submitAIGuessesForRound(inserted[0].id, roomId, nextRoundNumber);

  revalidatePath(`/room/${roomId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Force-resolve by roomId (countdown expiry, and the host's manual button)
// ─────────────────────────────────────────────────────────────────────────────

export async function resolveCurrentRound(roomId: string) {
  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room || room.status !== "active") return;

  const [round] = await db
    .select()
    .from(rounds)
    .where(and(eq(rounds.roomId, roomId), eq(rounds.roundNumber, room.currentRound)))
    .limit(1);
  if (!round || round.status !== "submitting") return;

  await resolveRound(round.id);
}

/** Host-only "force resolve" button — skips the rest of the submission window. */
export async function forceResolveAction(roomId: string) {
  const session = await getSession();
  if (!session) return;
  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room || room.hostUserId !== session.userId) return;
  await resolveCurrentRound(roomId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Host-only game settings (lobby)
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_ELIMINATION_SCORES = [-3, -5, -10, -15, -20];
const ALLOWED_ROUND_DURATIONS = [15, 30, 45, 60];

/**
 * Persist the host's lobby settings the moment they change them.
 *
 * These used to be written only when Start was pressed, which meant everyone
 * else in the lobby was reading the room's creation defaults. The rules panel
 * would promise elimination at −10 and a 30-second timer right up until the
 * game began with a −3 threshold and a 15-second clock. Writing on change is
 * what makes the lobby an honest preview of the game about to be played.
 */
export async function updateGameSettingsAction(
  roomId: string,
  settings: { eliminationScore?: number; roundDuration?: number },
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "You are not signed in." };

  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room) return { ok: false, error: "Room not found." };
  if (room.hostUserId !== session.userId) return { ok: false, error: "Only the host can change settings." };
  if (room.status !== "waiting") return { ok: false, error: "The game has already started." };

  // Same allow-lists as the start path: a value the lobby never offered (a 0
  // threshold, which ends the game instantly, or a 24-hour timer) is rejected
  // rather than clamped, because it can only have come from a crafted request.
  const patch: { eliminationScore?: number; roundDuration?: number } = {};
  if (settings.eliminationScore !== undefined) {
    if (!ALLOWED_ELIMINATION_SCORES.includes(settings.eliminationScore))
      return { ok: false, error: "Not a valid elimination score." };
    patch.eliminationScore = settings.eliminationScore;
  }
  if (settings.roundDuration !== undefined) {
    if (!ALLOWED_ROUND_DURATIONS.includes(settings.roundDuration))
      return { ok: false, error: "Not a valid round timer." };
    patch.roundDuration = settings.roundDuration;
  }
  if (Object.keys(patch).length === 0) return { ok: true };

  await db
    .update(gameRooms)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(gameRooms.id, roomId), eq(gameRooms.status, "waiting")));

  revalidatePath(`/room/${roomId}`);
  return { ok: true };
}

export async function startGameWithSettings(formData: FormData) {
  const roomId = formData.get("roomId") as string;
  if (!roomId) return;

  const session = await getSession();
  if (!session) return;
  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room || room.hostUserId !== session.userId) return;

  // Only accept values the lobby actually offers — a hand-edited <select> could
  // otherwise set an elimination score of 0 (instant game over) or a 24h timer.
  // An unrecognised value falls back to whatever the room already holds — the
  // host may have saved a setting via updateGameSettingsAction, and a hardcoded
  // default here would silently throw that away.
  const elimRaw = parseInt(formData.get("elimScore") as string, 10);
  const durRaw = parseInt(formData.get("roundDuration") as string, 10);
  const eliminationScore = ALLOWED_ELIMINATION_SCORES.includes(elimRaw) ? elimRaw : room.eliminationScore;
  const roundDuration = ALLOWED_ROUND_DURATIONS.includes(durRaw) ? durRaw : room.roundDuration;

  await db
    .update(gameRooms)
    .set({ eliminationScore, roundDuration })
    .where(and(eq(gameRooms.id, roomId), eq(gameRooms.status, "waiting")));

  await startGame(roomId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Get room state
// ─────────────────────────────────────────────────────────────────────────────

export async function getRoomState(roomId: string) {
  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room) throw new Error("Room not found.");

  const roomPlayers = await db
    .select({
      id: players.id,
      userId: players.userId,
      score: players.score,
      isEliminated: players.isEliminated,
      isWinner: players.isWinner,
      username: users.username,
      avatarUrl: users.avatarUrl,
      isAi: users.isAi,
    })
    .from(players)
    .innerJoin(users, eq(players.userId, users.id))
    .where(eq(players.roomId, roomId));

  const [currentRound] = await db
    .select()
    .from(rounds)
    .where(and(eq(rounds.roomId, roomId), eq(rounds.roundNumber, room.currentRound)))
    .limit(1);

  let submittedPlayerIds: string[] = [];
  const submittedValues: Record<string, number> = {};

  if (currentRound) {
    const subs = await db
      .select({ playerId: guesses.playerId, value: guesses.value })
      .from(guesses)
      .where(eq(guesses.roundId, currentRound.id));
    submittedPlayerIds = subs.map((g) => g.playerId);
    // Values stay hidden until the round is resolved.
    if (currentRound.status === "completed") {
      for (const g of subs) submittedValues[g.playerId] = g.value;
    }
  }

  const showingResults = currentRound?.status === "completed" && room.status === "active";

  // A rule-intro round is exactly RULE_INTRO_EXTRA_MS longer than a normal one.
  // The old check compared against `roundDuration + 5s`, which silently failed
  // whenever the host picked a 60s timer.
  const normalRoundMs = room.roundDuration * 1000;
  const isRuleIntroRound =
    !!currentRound?.submissionDeadline &&
    currentRound.submissionDeadline.getTime() - currentRound.createdAt.getTime() >
      normalRoundMs + RULE_INTRO_EXTRA_MS / 2;

  // Players eliminated by the round that just finished — i.e. the eliminated
  // players who still had a guess in the previous round. Anyone knocked out
  // earlier couldn't have submitted one, so they're excluded from the overlay.
  let newlyEliminated: Array<{ username: string; score: number }> = [];
  const eliminated = roomPlayers.filter((p) => p.isEliminated);
  if (eliminated.length > 0) {
    const [prevRound] = await db
      .select({ id: rounds.id })
      .from(rounds)
      .where(and(eq(rounds.roomId, roomId), eq(rounds.roundNumber, room.currentRound - 1)))
      .limit(1);
    if (prevRound) {
      const played = await db
        .select({ playerId: guesses.playerId })
        .from(guesses)
        .where(
          and(
            eq(guesses.roundId, prevRound.id),
            inArray(guesses.playerId, eliminated.map((p) => p.id)),
          ),
        );
      const playedSet = new Set(played.map((g) => g.playerId));
      newlyEliminated = eliminated
        .filter((p) => playedSet.has(p.id))
        .map((p) => ({ username: p.username, score: p.score }));
    }
  }

  let currentResult: {
    targetNumber: number | null;
    averageGuess: number | null;
    roundNumber: number;
    resolvedAt: Date | null;
    triggeredRules: string[];
    breakdown: Array<{
      playerId: string;
      username: string;
      value: number;
      deviation: number | null;
      scoreDelta: number | null;
      isWinner: boolean;
      isExactMatch: boolean;
      isDuplicatePenalty: boolean;
    }>;
  } | null = null;

  if (showingResults && currentRound) {
    const gRows = await db
      .select({
        playerId: guesses.playerId,
        value: guesses.value,
        deviation: guesses.deviation,
        scoreDelta: guesses.scoreDelta,
        isWinner: guesses.isRoundWinner,
        isExact: guesses.isExactMatch,
        isDuplicatePenalty: guesses.isDuplicatePenalty,
        username: users.username,
      })
      .from(guesses)
      .innerJoin(players, eq(guesses.playerId, players.id))
      .innerJoin(users, eq(players.userId, users.id))
      .where(eq(guesses.roundId, currentRound.id));

    currentResult = {
      targetNumber: currentRound.targetNumber,
      averageGuess: currentRound.averageGuess,
      roundNumber: currentRound.roundNumber,
      resolvedAt: currentRound.resolvedAt,
      triggeredRules: (currentRound.triggeredRules ?? []) as string[],
      breakdown: gRows.map((g) => ({
        playerId: g.playerId,
        username: g.username,
        value: g.value,
        deviation: g.deviation,
        scoreDelta: g.scoreDelta,
        isWinner: g.isWinner,
        isExactMatch: g.isExact,
        isDuplicatePenalty: g.isDuplicatePenalty,
      })),
    };
  }

  return {
    room,
    players: roomPlayers,
    currentRound: currentRound ?? null,
    submittedPlayerIds,
    submittedValues,
    showingResults,
    isRuleIntroRound,
    newlyEliminated,
    currentResult,
  };
}
