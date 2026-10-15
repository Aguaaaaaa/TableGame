export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;
export const SECRET_SECONDS = 30;
export const PROPOSAL_SECONDS = 120;
export const TEAM_VOTE_SECONDS = 30;
export const QUEST_SECONDS = 30;
export const LADY_SECONDS = 45;
export const ASSASSINATION_SECONDS = 90;

export const ROLE = Object.freeze({
  MERLIN: "merlin", PERCIVAL: "percival", LOYAL: "loyal",
  ASSASSIN: "assassin", MORGANA: "morgana", MORDRED: "mordred",
  OBERON: "oberon", MINION: "minion"
});
export const ALIGNMENT = Object.freeze({ GOOD: "good", EVIL: "evil" });
export const PRESET = Object.freeze({ BASIC: "basic", CLASSIC: "classic", ADVANCED: "advanced" });

export const QUEST_SIZES = Object.freeze({
  5: [2, 3, 2, 3, 3], 6: [2, 3, 4, 3, 4], 7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5], 9: [3, 4, 4, 5, 5], 10: [3, 4, 4, 5, 5]
});
export const EVIL_COUNTS = Object.freeze({ 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4 });

export function assertCapacity(value) {
  const capacity = Number(value);
  if (!Number.isInteger(capacity) || capacity < MIN_PLAYERS || capacity > MAX_PLAYERS) throw new RangeError("invalid capacity");
  return capacity;
}

export function assertPreset(value) {
  if (!Object.values(PRESET).includes(value)) throw new RangeError("invalid preset");
  return value;
}

export function alignmentOf(role) {
  return [ROLE.ASSASSIN, ROLE.MORGANA, ROLE.MORDRED, ROLE.OBERON, ROLE.MINION].includes(role) ? ALIGNMENT.EVIL : ALIGNMENT.GOOD;
}

export function rolesFor(capacity, preset = PRESET.CLASSIC) {
  capacity = assertCapacity(capacity); preset = assertPreset(preset);
  const evilCount = EVIL_COUNTS[capacity];
  const good = [ROLE.MERLIN];
  const evil = [ROLE.ASSASSIN];
  if (preset !== PRESET.BASIC) { good.push(ROLE.PERCIVAL); evil.push(ROLE.MORGANA); }
  if (preset === PRESET.ADVANCED) {
    if (evil.length < evilCount) evil.push(ROLE.MORDRED);
    if (capacity >= 7 && evil.length < evilCount) evil.push(ROLE.OBERON);
  }
  while (evil.length < evilCount) evil.push(ROLE.MINION);
  while (good.length < capacity - evilCount) good.push(ROLE.LOYAL);
  return [...good, ...evil];
}

export function shuffle(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function dealRoles(playerIds, preset, random = Math.random) {
  const roles = shuffle(rolesFor(playerIds.length, preset), random);
  return Object.fromEntries(playerIds.map((id, index) => [id, roles[index]]));
}

export function questSize(capacity, questIndex) {
  const sizes = QUEST_SIZES[assertCapacity(capacity)];
  if (!Number.isInteger(questIndex) || questIndex < 0 || questIndex >= sizes.length) throw new RangeError("invalid quest index");
  return sizes[questIndex];
}

export function failsRequired(capacity, questIndex) {
  return capacity >= 7 && questIndex === 3 ? 2 : 1;
}
