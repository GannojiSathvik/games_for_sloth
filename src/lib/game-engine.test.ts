// src/lib/game-engine.test.ts
// Run with: npm test   (Node's built-in test runner, executed through tsx)
//
// The scoring engine is deliberately pure — no database, no clock, no React —
// which is exactly what makes the rules testable. Every rule in the game is
// pinned here, so a change to the maths shows up as a failing test rather than
// as a player quietly losing a point they shouldn't have.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calculateRound, computeActiveRules, RPS_VALUES, type PlayerGuess } from "./game-engine";

const g = (playerId: string, value: number): PlayerGuess => ({ playerId, value });
const deltas = (r: ReturnType<typeof calculateRound>) =>
  Object.fromEntries(r.breakdown.map((b) => [b.playerId, b.scoreDelta]));

describe("base scoring", () => {
  test("target is 80% of the average", () => {
    const r = calculateRound([g("a", 50), g("b", 40), g("c", 10)]);
    assert.ok(Math.abs(r.averageGuess - 100 / 3) < 1e-9);
    assert.ok(Math.abs(r.targetNumber - (100 / 3) * 0.8) < 1e-9);
  });

  test("closest guess wins; winner 0, everyone else −1", () => {
    const r = calculateRound([g("a", 50), g("b", 40), g("c", 10)]);
    assert.deepEqual(r.winnerPlayerIds, ["b"]);
    assert.deepEqual(deltas(r), { a: -1, b: 0, c: -1 });
  });

  test("a tie on deviation gives every tied player the win", () => {
    // avg 50 → target 40. Both 30 and 50 sit 10 away.
    const r = calculateRound([g("a", 30), g("b", 50), g("c", 70)]);
    assert.deepEqual(r.winnerPlayerIds.sort(), ["a", "b"]);
  });
});

describe("rule 1 — duplicate guard", () => {
  test("players sharing a number are penalised and cannot win", () => {
    const r = calculateRound([g("a", 50), g("b", 50), g("c", 10)], ["duplicate_guard"]);
    assert.deepEqual(r.winnerPlayerIds, ["c"]);
    assert.deepEqual(deltas(r), { a: -1, b: -1, c: 0 });
    assert.ok(r.triggeredRules.includes("duplicate_guard"));
  });

  test("invalidated guesses still count towards the average", () => {
    const r = calculateRound([g("a", 50), g("b", 50), g("c", 10)], ["duplicate_guard"]);
    assert.ok(Math.abs(r.averageGuess - 110 / 3) < 1e-9);
  });

  test("if every guess is a duplicate, nobody wins and everybody loses a point", () => {
    const r = calculateRound([g("a", 50), g("b", 50)], ["duplicate_guard"]);
    assert.deepEqual(r.winnerPlayerIds, []);
    assert.deepEqual(deltas(r), { a: -1, b: -1 });
  });

  test("the rule does nothing until it is unlocked", () => {
    const r = calculateRound([g("a", 50), g("b", 50), g("c", 10)], []);
    assert.equal(r.triggeredRules.length, 0);
    assert.ok(r.winnerPlayerIds.length > 0);
  });
});

describe("rule 2 — exact match penalty", () => {
  test("hitting the target exactly costs everyone else −2", () => {
    // avg 25 → target 20, which "a" hits on the nose.
    const r = calculateRound([g("a", 20), g("b", 30)], ["duplicate_guard", "exact_penalty"]);
    assert.ok(r.isExactMatch);
    assert.deepEqual(deltas(r), { a: 0, b: -2 });
    assert.ok(r.triggeredRules.includes("exact_penalty"));
  });

  test("before the rule unlocks, an exact hit is an ordinary win", () => {
    const r = calculateRound([g("a", 20), g("b", 30)], []);
    assert.deepEqual(deltas(r), { a: 0, b: -1 });
  });
});

describe("rule 3 — the 1v1 rock-paper-scissors override", () => {
  const cases: Array<[number, number, string]> = [
    [100, 0, "a"], [0, 100, "b"],   // 100 beats 0
    [0, 1, "a"],   [1, 0, "b"],     // 0 beats 1
    [1, 100, "a"], [100, 1, "b"],   // 1 beats 100
  ];

  for (const [av, bv, winner] of cases) {
    test(`${av} vs ${bv} → ${winner} wins`, () => {
      const r = calculateRound([g("a", av), g("b", bv)], ["zero_hundred"], 2);
      assert.deepEqual(r.winnerPlayerIds, [winner]);
      assert.ok(r.triggeredRules.includes("zero_hundred"));
    });
  }

  test("the same pick is a draw and both players lose a point", () => {
    const r = calculateRound([g("a", 0), g("b", 0)], ["zero_hundred"], 2);
    assert.deepEqual(r.winnerPlayerIds, []);
    assert.deepEqual(deltas(r), { a: -1, b: -1 });
  });

  // Regression: an out-of-set value used to fall through to "tie", which
  // punished the player who had followed the rules.
  test("an illegal value simply loses to a legal one", () => {
    const r = calculateRound([g("a", 50), g("b", 100)], ["zero_hundred"], 2);
    assert.deepEqual(r.winnerPlayerIds, ["b"]);
    assert.deepEqual(deltas(r), { a: -1, b: 0 });
  });

  test("two illegal values leave nobody standing", () => {
    const r = calculateRound([g("a", 50), g("b", 77)], ["zero_hundred"], 2);
    assert.deepEqual(r.winnerPlayerIds, []);
  });

  test("the override only applies at exactly two active players", () => {
    const r = calculateRound([g("a", 0), g("b", 1), g("c", 100)], ["zero_hundred"], 3);
    assert.ok(!r.triggeredRules.includes("zero_hundred"));
  });
});

describe("progressive rule unlocks", () => {
  test("rules unlock one elimination at a time", () => {
    assert.deepEqual(computeActiveRules(0), []);
    assert.deepEqual(computeActiveRules(1), ["duplicate_guard"]);
    assert.deepEqual(computeActiveRules(2), ["duplicate_guard", "exact_penalty"]);
    assert.deepEqual(computeActiveRules(3), ["duplicate_guard", "exact_penalty", "zero_hundred"]);
    assert.deepEqual(computeActiveRules(9), computeActiveRules(3));
  });
});

describe("edge cases", () => {
  test("a round with no guesses is a programming error, not a silent 0", () => {
    assert.throws(() => calculateRound([]));
  });

  test("everyone guessing 0 makes everyone an exact winner", () => {
    const r = calculateRound([g("a", 0), g("b", 0), g("c", 0)]);
    assert.equal(r.targetNumber, 0);
    assert.ok(r.isExactMatch);
    assert.deepEqual(r.winnerPlayerIds.sort(), ["a", "b", "c"]);
  });

  test("RPS_VALUES is the single source of truth for legal 1v1 picks", () => {
    assert.deepEqual(RPS_VALUES, [0, 1, 100]);
  });
});
