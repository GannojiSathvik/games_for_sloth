// src/lib/game-engine.ts
// ─── Pure calculation logic (no DB side-effects) ─────────────────────────────
// Kept separate so it can be unit-tested without a DB connection.

// ─────────────────────────────────────────────────────────────────────────────
// Progressive Difficulty Rule identifiers
// ─────────────────────────────────────────────────────────────────────────────

export const GAME_RULES = {
  /** Rule 1 — unlocks after 1st elimination.
   *  Any number chosen by 2+ players: all of them lose 1 extra point. */
  DUPLICATE_GUARD: "duplicate_guard",
  /** Rule 2 — unlocks after 2nd elimination.
   *  When an exact match occurs, losers take −3 instead of −2. */
  EXACT_PENALTY: "exact_penalty",
  /** Rule 3 — unlocks after 3rd elimination.
   *  If anyone chooses 0 AND anyone chooses 100, the 100-chooser(s) win. */
  ZERO_HUNDRED: "zero_hundred",
} as const;

export type GameRule = (typeof GAME_RULES)[keyof typeof GAME_RULES];

/** Thresholds: rule unlocks once this many total players have been eliminated. */
export const RULE_UNLOCK_AT: Record<GameRule, number> = {
  duplicate_guard: 1,
  exact_penalty:   2,
  zero_hundred:    3,
};

/** Given the total elimination count, return the list of active rule ids. */
export function computeActiveRules(eliminationCount: number): string[] {
  return (Object.values(GAME_RULES) as GameRule[]).filter(
    (r) => eliminationCount >= RULE_UNLOCK_AT[r]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerGuess {
  playerId: string;
  value: number; // 0–100 inclusive
}

export interface PlayerBreakdown {
  playerId: string;
  value: number;
  deviation: number;        // Math.abs(value - targetNumber)
  isWinner: boolean;
  isExactMatch: boolean;
  scoreDelta: number;
  isDuplicatePenalty: boolean; // Rule 1 fired for this player
}

export interface RoundResult {
  targetNumber: number;
  averageGuess: number;
  winnerPlayerIds: string[];   // ≥1 in ties
  isExactMatch: boolean;
  scoreDelta: { winners: number; losers: number };
  breakdown: PlayerBreakdown[];
  triggeredRules: string[];    // which rules fired this round
}

// ─────────────────────────────────────────────────────────────────────────────
// Core calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * calculateRound
 *
 * Implements Beauty Contest scoring with optional progressive rules.
 *
 *  target = avg(guesses) × 0.8
 *  Closest (not exact): winner +1, losers −1
 *  Exact match (dev ≈ 0): winner +2, losers −2 (−3 with Rule 2)
 *  Ties: ALL tied players receive the winner delta
 *
 * Rule 1 (duplicate_guard): extra −1 for every player sharing a number with someone else.
 * Rule 2 (exact_penalty):   loser delta becomes −3 on exact-match rounds.
 * Rule 3 (zero_hundred):    if 0 and 100 both appear, the 100-chooser(s) win outright.
 *
 * @throws if guesses array is empty
 */
export function calculateRound(
  guesses: PlayerGuess[],
  activeRules: string[] = [],
): RoundResult {
  if (guesses.length === 0) {
    throw new Error("Cannot resolve a round with no guesses.");
  }

  const hasRule = (r: string) => activeRules.includes(r);
  const triggeredRules: string[] = [];

  // ── Rule 3: Zero vs Hundred override ──────────────────────────────────────
  if (hasRule(GAME_RULES.ZERO_HUNDRED)) {
    const zeroPlayers   = guesses.filter((g) => g.value === 0);
    const hundredPlayers = guesses.filter((g) => g.value === 100);
    if (zeroPlayers.length > 0 && hundredPlayers.length > 0) {
      triggeredRules.push(GAME_RULES.ZERO_HUNDRED);
      const winnerSet = new Set(hundredPlayers.map((g) => g.playerId));
      const sum = guesses.reduce((a, g) => a + g.value, 0);
      const averageGuess = sum / guesses.length;
      const targetNumber = averageGuess * 0.8;
      return {
        targetNumber,
        averageGuess,
        winnerPlayerIds: [...winnerSet],
        isExactMatch: false,
        scoreDelta: { winners: 1, losers: -1 },
        triggeredRules,
        breakdown: guesses.map((g) => ({
          playerId: g.playerId,
          value: g.value,
          deviation: Math.abs(g.value - targetNumber),
          isWinner: winnerSet.has(g.playerId),
          isExactMatch: false,
          scoreDelta: winnerSet.has(g.playerId) ? 1 : -1,
          isDuplicatePenalty: false,
        })),
      };
    }
  }

  // ── Normal calculation ─────────────────────────────────────────────────────
  const sum = guesses.reduce((acc, g) => acc + g.value, 0);
  const averageGuess = sum / guesses.length;
  const targetNumber = averageGuess * 0.8;

  const deviations = guesses.map((g) => ({
    ...g,
    deviation: Math.abs(g.value - targetNumber),
  }));

  const minDeviation = Math.min(...deviations.map((d) => d.deviation));
  const EPSILON = 1e-9;
  const isExactMatch = minDeviation < EPSILON;

  const winnerDelta = isExactMatch ? +2 : +1;
  // Rule 2: on exact-match rounds, losers take −3 instead of −2
  const loserDelta =
    isExactMatch && hasRule(GAME_RULES.EXACT_PENALTY) ? -3 :
    isExactMatch ? -2 : -1;

  if (hasRule(GAME_RULES.EXACT_PENALTY) && isExactMatch) {
    triggeredRules.push(GAME_RULES.EXACT_PENALTY);
  }

  const winnerPlayerIds = deviations
    .filter((d) => d.deviation === minDeviation)
    .map((d) => d.playerId);
  const winnerSet = new Set(winnerPlayerIds);

  // ── Rule 1: Duplicate Guard ────────────────────────────────────────────────
  const duplicatePenaltyIds = new Set<string>();
  if (hasRule(GAME_RULES.DUPLICATE_GUARD)) {
    const valueCounts = new Map<number, string[]>();
    for (const d of deviations) {
      const bucket = valueCounts.get(d.value) ?? [];
      bucket.push(d.playerId);
      valueCounts.set(d.value, bucket);
    }
    for (const [, ids] of valueCounts) {
      if (ids.length >= 2) ids.forEach((id) => duplicatePenaltyIds.add(id));
    }
    if (duplicatePenaltyIds.size > 0) {
      triggeredRules.push(GAME_RULES.DUPLICATE_GUARD);
    }
  }

  // ── Build per-player breakdown ─────────────────────────────────────────────
  const breakdown: PlayerBreakdown[] = deviations.map((d) => {
    const isWinner = winnerSet.has(d.playerId);
    const isDuplicatePenalty = duplicatePenaltyIds.has(d.playerId);
    let scoreDelta = isWinner ? winnerDelta : loserDelta;
    if (isDuplicatePenalty) scoreDelta -= 1; // extra −1 for Rule 1
    return {
      playerId: d.playerId,
      value: d.value,
      deviation: d.deviation,
      isWinner,
      isExactMatch: isWinner && isExactMatch,
      scoreDelta,
      isDuplicatePenalty,
    };
  });

  return {
    targetNumber,
    averageGuess,
    winnerPlayerIds,
    isExactMatch,
    scoreDelta: { winners: winnerDelta, losers: loserDelta },
    breakdown,
    triggeredRules,
  };
}
