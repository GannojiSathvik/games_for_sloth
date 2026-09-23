// src/lib/bot-ai.ts
// Smart AI strategies for bots. Each bot gets a random "personality" that
// determines how they guess. This creates varied, interesting gameplay
// instead of pure random 0-100.
//
// Strategies are based on real game theory for the Beauty Contest:
// - Nash equilibrium is 0 (everyone guessing 0 → target = 0)
// - But humans don't play Nash, so bots use depth-of-reasoning
// - Different "levels" of strategic thinking create natural variety

/**
 * The legal 1-v-1 picks, re-exported for the tests.
 *
 * The authoritative list is RPS_VALUES in game-engine.ts. This module stays
 * free of imports so it can be reasoned about (and tested) entirely on its own,
 * so the values are repeated here and the test asserts bots stay inside them.
 */
export const RPS_VALUES_FOR_TESTS = [0, 1, 100];

/** Bot personality types */
export type BotPersonality =
  | "naive"          // Thinks randomly 20–80 (like a first-time player)
  | "strategist"     // Knows the 80% rule, guesses around expected target
  | "nash"           // Plays near-Nash (very low numbers, 0-15)
  | "adaptive"       // Adjusts based on round number (gets smarter over time)
  | "undercutter"    // Always guesses slightly below the expected sweet spot
  | "contrarian"     // Picks extremes to exploit rules (0, 1, 100)
  | "mimic"          // Tries to mimic average human behavior (~30-50)
  | "chaotic";       // Wild card — sometimes genius, sometimes dumb

/**
 * Get a smart AI guess based on a personality type.
 *
 * @param roundNumber  Current round (1-indexed). Bots get smarter in later rounds.
 * @param totalPlayers Total active (non-eliminated) players this round.
 * @param personality  The bot's assigned personality (random if not given).
 */
export function getSmartAIGuess(
  roundNumber: number,
  totalPlayers: number,
  personality?: BotPersonality,
): number {
  // ── 2-player mode: ALWAYS pick from 0, 1, or 100 ──────────────────────────
  // When exactly 2 players remain, the UI forces picks from these 3 values
  // and the engine applies RPS scoring — bots must do the same.
  if (totalPlayers === 2) {
    const rpsChoices = [0, 1, 100];
    const r = Math.random();
    // Rotate the favoured pick each round so bots aren't trivially predictable
    const offset = roundNumber % 3;
    if (r < 0.50) return rpsChoices[offset];           // 50%
    if (r < 0.80) return rpsChoices[(offset + 1) % 3]; // 30%
    return rpsChoices[(offset + 2) % 3];               // 20%
  }

  // Assign a random personality if none given
  const p = personality ?? pickPersonality();

  switch (p) {
    case "naive":
      // First-time player: guesses 20-80 with some noise
      return clamp(randomBetween(20, 80));

    case "strategist": {
      // Level-2 thinker: assumes avg is ~50, so target ≈ 40.
      // Then assumes others think similarly, so avg ≈ 40, target ≈ 32.
      // Adds noise ±8 so it's not predictable.
      const level2 = 50 * Math.pow(0.8, 2); // = 32
      return clamp(level2 + randomBetween(-8, 8));
    }

    case "nash":
      // Near-Nash: very low numbers. Occasionally 0.
      return clamp(randomBetween(0, 15));

    case "adaptive": {
      // Gets smarter each round. Round 1 = naive, later = more strategic.
      // base starts at 50 and drops ~5 per round toward Nash
      const base = Math.max(5, 50 - roundNumber * 5);
      const target = base * 0.8;
      return clamp(target + randomBetween(-6, 6));
    }

    case "undercutter": {
      // Assumes target will be around 30-35, guesses 2-5 below that
      const expected = 50 * Math.pow(0.8, Math.min(roundNumber, 4));
      return clamp(expected - randomBetween(2, 8));
    }

    case "contrarian": {
      // Plays extremes — especially useful with Rule 3 (0/100 override)
      if (totalPlayers === 2) {
        // In 2-player mode, play RPS values strategically
        const rpsChoices = [0, 1, 100];
        return rpsChoices[Math.floor(Math.random() * rpsChoices.length)];
      }
      // Otherwise picks low or high extremes
      return Math.random() < 0.5
        ? clamp(randomBetween(0, 10))
        : clamp(randomBetween(85, 100));
    }

    case "mimic":
      // Tries to act human: most humans guess 25-55 in beauty contests
      return clamp(randomBetween(25, 55));

    case "chaotic": {
      // Wild card: 30% chance of genius low play, 70% random
      if (Math.random() < 0.3) {
        return clamp(randomBetween(0, 20));
      }
      return clamp(randomBetween(10, 90));
    }

    default:
      return clamp(randomBetween(0, 100));
  }
}

/**
 * The weighted personality table, as cumulative thresholds over [0, 1).
 * One table serves both the random and the seeded picker, so the distribution
 * can only ever be changed in one place.
 */
const PERSONALITY_WEIGHTS: Array<[BotPersonality, number]> = [
  ["naive", 0.10],       // 10%
  ["strategist", 0.30],  // 20%
  ["nash", 0.40],        // 10%
  ["adaptive", 0.55],    // 15%
  ["undercutter", 0.70], // 15%
  ["contrarian", 0.80],  // 10%
  ["mimic", 0.90],       // 10%
  ["chaotic", 1.00],     // 10%
];

function personalityAt(fraction: number): BotPersonality {
  for (const [name, threshold] of PERSONALITY_WEIGHTS) {
    if (fraction < threshold) return name;
  }
  return "chaotic";
}

/** Pick a random personality with weighted distribution */
function pickPersonality(): BotPersonality {
  return personalityAt(Math.random());
}

/**
 * The personality a given bot plays — stable for the whole game.
 *
 * Personality must be a property OF THE BOT, not of the guess. Calling
 * `getSmartAIGuess` without one re-rolls it on every round, so a bot that
 * played Nash in round 1 could play naive in round 2 and chaotic in round 3.
 * Averaged over rounds that is just one blended random distribution, and the
 * whole point of the feature — a table of opponents who each behave in a
 * recognisable way — never actually happened.
 *
 * Hashing the bot's player id (a UUID) fixes that without storing anything:
 * the same id always lands on the same personality, and different ids spread
 * across the weighted table. FNV-1a is used because it is short enough to read
 * and mixes the low bits well; nothing here is security-sensitive.
 */
export function personalityFor(playerId: string): BotPersonality {
  let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (let i = 0; i < playerId.length; i++) {
    hash ^= playerId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0; // multiply by the FNV prime, keep 32 bits
  }
  return personalityAt(hash / 0x100000000);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
