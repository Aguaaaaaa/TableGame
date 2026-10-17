import test from "node:test";
import assert from "node:assert/strict";
import { createDeck, decoyCount, handSize, scoreRound } from "./rules.mjs";

test("dream deck contains 84 unique authored identities", () => {
  const deck = createDeck(() => .5);
  assert.equal(deck.length, 84);
  assert.equal(new Set(deck.map((card) => card.id)).size, 84);
  assert.deepEqual(deck.map((card) => card.artSeed).sort((a, b) => a - b), Array.from({ length: 84 }, (_, index) => index + 1));
});

test("three players use seven cards and two decoys", () => {
  assert.equal(handSize(3), 7); assert.equal(decoyCount(3), 2);
  assert.equal(handSize(4), 6); assert.equal(decoyCount(8), 1);
});

test("partial discovery awards storyteller and correct voters plus decoy votes", () => {
  const result = scoreRound({
    playerIds: ["s", "a", "b", "c"], storytellerId: "s", storytellerDisplayId: "d1",
    displayCards: [
      { displayId: "d1", ownerId: "s" }, { displayId: "d2", ownerId: "a" },
      { displayId: "d3", ownerId: "b" }, { displayId: "d4", ownerId: "c" }
    ], votes: { a: "d1", b: "d1", c: "d2" }
  });
  assert.deepEqual(result.gains, { s: 3, a: 4, b: 3, c: 0 });
  assert.equal(result.allOrNone, false);
});

test("all or none gives every non-storyteller two points and keeps lure bonuses", () => {
  const result = scoreRound({
    playerIds: ["s", "a", "b"], storytellerId: "s", storytellerDisplayId: "d1",
    displayCards: [{ displayId: "d1", ownerId: "s" }, { displayId: "d2", ownerId: "a" }, { displayId: "d3", ownerId: "b" }],
    votes: { a: "d1", b: "d1" }
  });
  assert.deepEqual(result.gains, { s: 0, a: 2, b: 2 });
});
