export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;
export const TARGET_SCORE = 30;
export const STORYTELLER_SECONDS = 120;
export const DECOY_SECONDS = 75;
export const VOTE_SECONDS = 60;
export const RESOLUTION_SECONDS = 10;
export const CLUE_MODE = Object.freeze({ TEXT: "text", VOICE: "voice" });

export function assertCapacity(value) {
  const capacity = Number(value);
  if (!Number.isInteger(capacity) || capacity < MIN_PLAYERS || capacity > MAX_PLAYERS) throw new RangeError("invalid capacity");
  return capacity;
}

export function handSize(capacity) { return assertCapacity(capacity) === 3 ? 7 : 6; }
export function decoyCount(capacity) { return assertCapacity(capacity) === 3 ? 2 : 1; }

export function shuffle(values, random = Math.random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const sample = Math.max(0, Math.min(.999999999999, Number(random()) || 0));
    const target = Math.floor(sample * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createDeck(random = Math.random) {
  return shuffle(Array.from({ length: 84 }, (_, index) => ({
    id: `dream_${String(index + 1).padStart(3, "0")}`,
    artSeed: index + 1
  })), random);
}

export function normalizeClue(mode, text) {
  const clueMode = mode === CLUE_MODE.VOICE ? CLUE_MODE.VOICE : CLUE_MODE.TEXT;
  const clueText = String(text || "").trim().slice(0, 80);
  if (clueMode === CLUE_MODE.TEXT && !clueText) throw new RangeError("text clue required");
  return { mode: clueMode, text: clueMode === CLUE_MODE.VOICE ? clueText : clueText };
}

export function scoreRound({ playerIds, storytellerId, storytellerDisplayId, displayCards, votes }) {
  const nonStorytellers = playerIds.filter((id) => id !== storytellerId);
  const correctVoters = nonStorytellers.filter((id) => votes[id] === storytellerDisplayId);
  const allOrNone = correctVoters.length === 0 || correctVoters.length === nonStorytellers.length;
  const gains = Object.fromEntries(playerIds.map((id) => [id, 0]));
  if (allOrNone) nonStorytellers.forEach((id) => { gains[id] += 2; });
  else {
    gains[storytellerId] += 3;
    correctVoters.forEach((id) => { gains[id] += 3; });
  }
  for (const voterId of nonStorytellers) {
    const target = displayCards.find((card) => card.displayId === votes[voterId]);
    if (target && target.ownerId !== storytellerId) gains[target.ownerId] += 1;
  }
  return { gains, correctVoters, allOrNone };
}
