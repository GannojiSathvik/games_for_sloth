// src/lib/game-engine.ts
// ─── Pure calculation logic (no DB side-effects) ─────────────────────────────
// Kept separate so it can be unit-tested without a DB connection.

export interface PlayerGuess {
  playerId: string;
  value: number; // 0–100 inclusive
}

export interface RoundResult {
  targetNumber: number;
  averageGuess: number;
  winnerPlayerIds: string[];    // may contain >1 in case of a tie
  isExactMatch: boolean;        // true when min deviation === 0
  scoreDelta: {
    winners: number;  // +2 (exact) | +1 (closest)
    losers: number;   // -2 (exact) | -1 (closest)
  };
  breakdown: PlayerBreakdown[];
}

export interface PlayerBreakdown {
  playerId: string;
  value: number;
  deviation: number;  // Math.abs(value - targetNumber)
  isWinner: boolean;
  isExactMatch: boolean;
  scoreDelta: number;
}

/**
 * calculateRound
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements the "Beauty Contest" scoring rules:
 *
 *  target = (sum of all guesses / count) × 0.8
 *
 *  Closest (not exact): winner +1, all others −1
 *  Exact match (deviation === 0): winner +2, all others −2
 *  Ties: ALL tied players receive the winner delta
 *
 * @throws if guesses array is empty
 */
export function calculateRound(guesses: PlayerGuess[]): RoundResult {
  if (guesses.length === 0) {
    throw new Error("Cannot resolve a round with no guesses.");
  }

  // 1. Compute target ─────────────────────────────────────────────────────────
  const sum = guesses.reduce((acc, g) => acc + g.value, 0);
  const averageGuess = sum / guesses.length;
  const targetNumber = averageGuess * 0.8;

  // 2. Calculate deviations ───────────────────────────────────────────────────
  const deviations = guesses.map((g) => ({
    ...g,
    deviation: Math.abs(g.value - targetNumber),
  }));

  // 3. Find the minimum deviation ─────────────────────────────────────────────
  const minDeviation = Math.min(...deviations.map((d) => d.deviation));

  // 4. Determine if this is an exact match (deviation rounds to 0) ────────────
  //    We use a tiny epsilon to guard against floating-point noise.
  const EPSILON = 1e-9;
  const isExactMatch = minDeviation < EPSILON;

  // 5. Determine score deltas based on match type ─────────────────────────────
  const winnerDelta = isExactMatch ? +2 : +1;
  const loserDelta = isExactMatch ? -2 : -1;

  // 6. Identify all winners (handles ties) ────────────────────────────────────
  const winnerPlayerIds = deviations
    .filter((d) => d.deviation === minDeviation)
    .map((d) => d.playerId);

  const winnerSet = new Set(winnerPlayerIds);

  // 7. Build per-player breakdown ─────────────────────────────────────────────
  const breakdown: PlayerBreakdown[] = deviations.map((d) => {
    const isWinner = winnerSet.has(d.playerId);
    return {
      playerId: d.playerId,
      value: d.value,
      deviation: d.deviation,
      isWinner,
      isExactMatch: isWinner && isExactMatch,
      scoreDelta: isWinner ? winnerDelta : loserDelta,
    };
  });

  return {
    targetNumber,
    averageGuess,
    winnerPlayerIds,
    isExactMatch,
    scoreDelta: { winners: winnerDelta, losers: loserDelta },
    breakdown,
  };
}
