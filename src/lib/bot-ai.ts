// src/lib/bot-ai.ts
// Smart AI strategies for bots. Each bot gets a random "personality" that
// determines how they guess. This creates varied, interesting gameplay
// instead of pure random 0-100.
//
// Strategies are based on real game theory for the Beauty Contest:
// - Nash equilibrium is 0 (everyone guessing 0 → target = 0)
// - But humans don't play Nash, so bots use depth-of-reasoning
// - Different "levels" of strategic thinking create natural variety

/** Bot personality types */
type BotPersonality =
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
 * @param activeRules  Currently unlocked rules (used to detect RPS mode).
 */
export function getSmartAIGuess(
  roundNumber: number,
  totalPlayers: number,
  personality?: BotPersonality,
  activeRules: string[] = [],
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

/** Pick a random personality with weighted distribution */
function pickPersonality(): BotPersonality {
  const r = Math.random();
  if (r < 0.10) return "naive";       // 10%
  if (r < 0.30) return "strategist";  // 20%
  if (r < 0.40) return "nash";        // 10%
  if (r < 0.55) return "adaptive";    // 15%
  if (r < 0.70) return "undercutter"; // 15%
  if (r < 0.80) return "contrarian";  // 10%
  if (r < 0.90) return "mimic";       // 10%
  return "chaotic";                    // 10%
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
