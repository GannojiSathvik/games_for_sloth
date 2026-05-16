// src/lib/game-engine.ts
// ─── Pure calculation logic (no DB side-effects) ─────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Rule identifiers
// ─────────────────────────────────────────────────────────────────────────────

export const GAME_RULES = {
  /** Rule 1 — after 1st elimination.
   *  Numbers chosen by 2+ players are INVALID.
   *  Those players each lose -1 and are excluded from winner calculation. */
  DUPLICATE_GUARD: "duplicate_guard",
  /** Rule 2 — after 2nd elimination.
   *  When someone hits exact target, all OTHER players lose -2 (not -1). */
  EXACT_PENALTY: "exact_penalty",
  /** Rule 3 — after 3rd elimination, only when exactly 2 players remain.
   *  Rock-paper-scissors override: 100 beats 0, 0 beats 1, 1 beats 100. */
  ZERO_HUNDRED: "zero_hundred",
} as const;

export type GameRule = (typeof GAME_RULES)[keyof typeof GAME_RULES];

/** Total eliminations needed to unlock each rule. */
export const RULE_UNLOCK_AT: Record<GameRule, number> = {
  duplicate_guard: 1,
  exact_penalty:   2,
  zero_hundred:    3,
};

/** Given total elimination count, return the sorted list of active rule ids. */
export function computeActiveRules(eliminationCount: number): string[] {
  return (Object.values(GAME_RULES) as GameRule[]).filter(
    (r) => eliminationCount >= RULE_UNLOCK_AT[r],
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
  deviation: number;
  isWinner: boolean;
  isExactMatch: boolean;
  scoreDelta: number;
  isDuplicatePenalty: boolean; // Rule 1: this player's number was a duplicate
}

export interface RoundResult {
  targetNumber: number;
  averageGuess: number;
  winnerPlayerIds: string[];
  isExactMatch: boolean;
  scoreDelta: { winners: number; losers: number };
  breakdown: PlayerBreakdown[];
  triggeredRules: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Core calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * calculateRound — Beauty Contest scoring (corrected per spec)
 *
 * BASE SCORING (no rules):
 *   winner: +0  (avoids the -1 loss)
 *   losers: -1
 *
 * RULE 1 (duplicate_guard):
 *   Numbers chosen by 2+ players are INVALID.
 *   Those players get -1 and are EXCLUDED from the winner pool.
 *   Remaining players score normally.
 *   If ALL guesses are duplicates → everyone gets -1, no winner.
 *
 * RULE 2 (exact_penalty):
 *   If someone hits exact target (deviation ≈ 0): winner +0, others -2 (not -1).
 *   If the exact number was also a duplicate (Rule 1 active) → Rule 1 takes precedence.
 *
 * RULE 3 (zero_hundred) — only when totalActivePlayers === 2:
 *   Rock-paper-scissors override:
 *     100 beats 0 | 0 beats 1 | 1 beats 100
 *   Only triggers for those specific pairings; otherwise normal calc.
 *
 * Average is always computed from ALL guesses (including invalid ones) for display.
 *
 * @param guesses             Valid (non-skip) submissions this round
 * @param activeRules         Rules currently unlocked for this room
 * @param totalActivePlayers  Total non-eliminated players (for Rule 3 gate)
 */
export function calculateRound(
  guesses: PlayerGuess[],
  activeRules: string[] = [],
  totalActivePlayers = 0,
): RoundResult {
  if (guesses.length === 0) {
    throw new Error("Cannot resolve a round with no guesses.");
  }

  const hasRule = (r: string) => activeRules.includes(r);
  const triggeredRules: string[] = [];

  // Average / target always computed from ALL guesses for transparency
  const sumAll = guesses.reduce((a, g) => a + g.value, 0);
  const averageGuess = sumAll / guesses.length;
  const targetNumber = averageGuess * 0.8;

  // ── Rule 3: 2-player RPS override ─────────────────────────────────────────
  if (hasRule(GAME_RULES.ZERO_HUNDRED) && totalActivePlayers === 2 && guesses.length === 2) {
    const vals = guesses.map((g) => g.value);
    const [a, b] = vals;

    // RPS lookup: [chooserA, chooserB] → winner value (null = no RPS match)
    const rpsWinner = (() => {
      if ((a === 100 && b === 0) || (a === 0 && b === 100)) return 100; // 100 beats 0
      if ((a === 0 && b === 1) || (a === 1 && b === 0)) return 0;       // 0 beats 1
      if ((a === 1 && b === 100) || (a === 100 && b === 1)) return 1;   // 1 beats 100
      return null;
    })();

    if (rpsWinner !== null) {
      triggeredRules.push(GAME_RULES.ZERO_HUNDRED);
      const winnerSet = new Set(guesses.filter((g) => g.value === rpsWinner).map((g) => g.playerId));
      return {
        targetNumber,
        averageGuess,
        winnerPlayerIds: [...winnerSet],
        isExactMatch: false,
        scoreDelta: { winners: 0, losers: -1 },
        triggeredRules,
        breakdown: guesses.map((g) => ({
          playerId: g.playerId,
          value: g.value,
          deviation: Math.abs(g.value - targetNumber),
          isWinner: winnerSet.has(g.playerId),
          isExactMatch: false,
          scoreDelta: winnerSet.has(g.playerId) ? 0 : -1,
          isDuplicatePenalty: false,
        })),
      };
    }
  }

  // ── Rule 1: Duplicate Guard ────────────────────────────────────────────────
  // Find values chosen by 2+ players → mark those players as "duplicate penalty"
  const duplicatePenaltyIds = new Set<string>();
  if (hasRule(GAME_RULES.DUPLICATE_GUARD)) {
    const valueCounts = new Map<number, string[]>();
    for (const g of guesses) {
      const bucket = valueCounts.get(g.value) ?? [];
      bucket.push(g.playerId);
      valueCounts.set(g.value, bucket);
    }
    for (const [, ids] of valueCounts) {
      if (ids.length >= 2) ids.forEach((id) => duplicatePenaltyIds.add(id));
    }
    if (duplicatePenaltyIds.size > 0) {
      triggeredRules.push(GAME_RULES.DUPLICATE_GUARD);
    }
  }

  // Pool for winner determination: exclude duplicate-penalty players
  const validForCalc = guesses.filter((g) => !duplicatePenaltyIds.has(g.playerId));

  // ── All-duplicate edge case: everyone gets -1, no winner ──────────────────
  if (validForCalc.length === 0) {
    return {
      targetNumber,
      averageGuess,
      winnerPlayerIds: [],
      isExactMatch: false,
      scoreDelta: { winners: 0, losers: -1 },
      triggeredRules,
      breakdown: guesses.map((g) => ({
        playerId: g.playerId,
        value: g.value,
        deviation: Math.abs(g.value - targetNumber),
        isWinner: false,
        isExactMatch: false,
        scoreDelta: -1,
        isDuplicatePenalty: true,
      })),
    };
  }

  // ── Winner determination from validForCalc ─────────────────────────────────
  const deviations = validForCalc.map((g) => ({
    ...g,
    deviation: Math.abs(g.value - targetNumber),
  }));
  const minDeviation = Math.min(...deviations.map((d) => d.deviation));
  const EPSILON = 1e-9;
  const isExactMatch = minDeviation < EPSILON;

  // Rule 2: exact match → losers take -2 (winner still +0)
  const winnerDelta = 0;
  const loserDelta = isExactMatch && hasRule(GAME_RULES.EXACT_PENALTY) ? -2 : -1;

  if (hasRule(GAME_RULES.EXACT_PENALTY) && isExactMatch) {
    triggeredRules.push(GAME_RULES.EXACT_PENALTY);
  }

  const winnerPlayerIds = deviations
    .filter((d) => d.deviation === minDeviation)
    .map((d) => d.playerId);
  const winnerSet = new Set(winnerPlayerIds);

  // ── Build per-player breakdown (all guesses, including duplicates) ──────────
  const devMap = new Map(deviations.map((d) => [d.playerId, d.deviation]));

  const breakdown: PlayerBreakdown[] = guesses.map((g) => {
    if (duplicatePenaltyIds.has(g.playerId)) {
      return {
        playerId: g.playerId,
        value: g.value,
        deviation: Math.abs(g.value - targetNumber),
        isWinner: false,
        isExactMatch: false,
        scoreDelta: -1,
        isDuplicatePenalty: true,
      };
    }
    const dev = devMap.get(g.playerId) ?? Math.abs(g.value - targetNumber);
    const isWinner = winnerSet.has(g.playerId);
    return {
      playerId: g.playerId,
      value: g.value,
      deviation: dev,
      isWinner,
      isExactMatch: isWinner && isExactMatch,
      scoreDelta: isWinner ? winnerDelta : loserDelta,
      isDuplicatePenalty: false,
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
