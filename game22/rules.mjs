export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;
export const PACE = Object.freeze({ QUICK: "quick", STANDARD: "standard", DISCUSSION: "discussion", CUSTOM: "custom" });
export const TIMER_KEYS = Object.freeze(["secretReveal", "teamProposal", "teamVote", "questAction", "ladyInspect", "assassination"]);
export const PACE_PRESETS = Object.freeze({
  [PACE.QUICK]: Object.freeze({ secretReveal: 30, teamProposal: 120, teamVote: 30, questAction: 30, ladyInspect: 45, assassination: 90 }),
  [PACE.STANDARD]: Object.freeze({ secretReveal: 45, teamProposal: 180, teamVote: 45, questAction: 45, ladyInspect: 60, assassination: 150 }),
  [PACE.DISCUSSION]: Object.freeze({ secretReveal: 60, teamProposal: 300, teamVote: 60, questAction: 60, ladyInspect: 90, assassination: 240 })
});
export const TIMER_LIMITS = Object.freeze({
  secretReveal: Object.freeze([15, 180]), teamProposal: Object.freeze([60, 600]),
  teamVote: Object.freeze([15, 180]), questAction: Object.freeze([15, 180]),
  ladyInspect: Object.freeze([20, 240]), assassination: Object.freeze([30, 600])
});
export const PROPOSAL_EXTENSION_SECONDS = 60;
export const PROPOSAL_EXTENSION_WINDOW_SECONDS = 30;
export const EXTENSION_VOTE_SECONDS = 20;

// 保留旧导出，供已有测试和服务配置兼容；实际对局时长以房间的 timers 为准。
export const SECRET_SECONDS = PACE_PRESETS[PACE.STANDARD].secretReveal;
export const PROPOSAL_SECONDS = PACE_PRESETS[PACE.STANDARD].teamProposal;
export const TEAM_VOTE_SECONDS = PACE_PRESETS[PACE.STANDARD].teamVote;
export const QUEST_SECONDS = PACE_PRESETS[PACE.STANDARD].questAction;
export const LADY_SECONDS = PACE_PRESETS[PACE.STANDARD].ladyInspect;
export const ASSASSINATION_SECONDS = PACE_PRESETS[PACE.STANDARD].assassination;

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

export function assertPace(value) {
  if (!Object.values(PACE).includes(value)) throw new RangeError("invalid pace");
  return value;
}

export function normalizeTimers(pace = PACE.STANDARD, values = null) {
  pace = assertPace(pace);
  if (pace !== PACE.CUSTOM) return { ...PACE_PRESETS[pace] };
  if (!values || typeof values !== "object") throw new RangeError("custom timers required");
  return Object.fromEntries(TIMER_KEYS.map((key) => {
    const seconds = Number(values[key]);
    const [minimum, maximum] = TIMER_LIMITS[key];
    if (!Number.isInteger(seconds) || seconds < minimum || seconds > maximum) throw new RangeError(`invalid timer: ${key}`);
    return [key, seconds];
  }));
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
