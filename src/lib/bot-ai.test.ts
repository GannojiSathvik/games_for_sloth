// src/lib/bot-ai.test.ts
// Run with: npm test
//
// These pin the one property the personality system needs in order to mean
// anything: a bot is the SAME opponent every round. The module shipped with a
// `personality` parameter that no caller ever passed, so every guess re-rolled
// it and the eight strategies averaged out into a single blended distribution.
// The bug was invisible — the code read correctly and the game still worked,
// it just wasn't doing what it said.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getSmartAIGuess, personalityFor, RPS_VALUES_FOR_TESTS } from "./bot-ai";

describe("bot personality", () => {
  test("the same player id always gets the same personality", () => {
    const id = "6f2a1c84-0f4e-4a1b-9c3d-2e5b7a8f1d40";
    const first = personalityFor(id);
    for (let i = 0; i < 50; i++) {
      assert.equal(personalityFor(id), first);
    }
  });

  test("different player ids spread across more than one personality", () => {
    // A hash that collapsed every id onto one bucket would pass the test above
    // and still be useless, so check the spread too.
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      seen.add(personalityFor(`00000000-0000-4000-8000-${String(i).padStart(12, "0")}`));
    }
    assert.ok(seen.size >= 5, `expected a spread of personalities, saw ${seen.size}: ${[...seen]}`);
  });

  test("every personality produces a legal guess in 0–100", () => {
    for (let i = 0; i < 500; i++) {
      const id = `player-${i}`;
      for (const round of [1, 2, 5, 12]) {
        const v = getSmartAIGuess(round, 6, personalityFor(id));
        assert.ok(Number.isInteger(v), `${v} is not an integer`);
        assert.ok(v >= 0 && v <= 100, `${v} is outside 0–100`);
      }
    }
  });
});

describe("bots under the 1v1 override", () => {
  test("with two players left a bot only ever picks 0, 1 or 100", () => {
    // The engine scores a 2-player round as rock-paper-scissors and the UI
    // only offers those three values, so a bot that picked 47 would be an
    // illegal move that simply loses — an unfair way to win a duel.
    for (let i = 0; i < 300; i++) {
      const v = getSmartAIGuess((i % 7) + 1, 2, personalityFor(`bot-${i}`));
      assert.ok(RPS_VALUES_FOR_TESTS.includes(v), `${v} is not a legal 1v1 pick`);
    }
  });

  test("the override applies even to the contrarian, which has its own branch", () => {
    for (let i = 0; i < 100; i++) {
      const v = getSmartAIGuess(1, 2, "contrarian");
      assert.ok(RPS_VALUES_FOR_TESTS.includes(v));
    }
  });
});
