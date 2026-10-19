"use strict";

const PARTITIONS = Object.freeze([
  "room", "status", "players", "scores", "seats", "idiom", "decision", "log"
]);

const key = (value) => JSON.stringify(value);

export function game2ActionContext(view, memberRole = view?.roomRole, roomCode = "") {
  if (!view) return { mode: "none", key: "none" };
  let mode = view.phase;
  if (memberRole === "spectator") mode = `spectator:${view.phase}`;
  else if (view.phase === "playing" && !view.currentActorId) mode = "playing:no-actor";
  else if (view.phase === "playing" && view.permissions?.canDescribe) mode = "describe";
  else if (view.phase === "playing" && view.permissions?.canGuess) mode = "guess";
  else if (view.phase === "playing") mode = "playing:waiting";
  return {
    mode,
    key: key([
      roomCode, mode, view.selfId, view.round, view.wordNumber, view.currentActorId,
      Boolean(view.currentDescription), view.phase === "ended" ? view.scores : null,
      view.phase === "ended" ? view.idiom : null
    ])
  };
}

export function createGame2RenderModel(view, {
  memberRole = view?.roomRole,
  roomCode = ""
} = {}) {
  if (!view) return null;
  const players = Array.isArray(view.players) ? view.players : [];
  const permissions = view.permissions || {};
  const actionContext = game2ActionContext(view, memberRole, roomCode);
  return {
    view, memberRole, roomCode, actionContext,
    keys: {
      room: key([
        roomCode, view.phase, view.capacity, players.length,
        view.phase === "lobby" ? players.map((player) => [player.id, player.connected]) : null,
        permissions.canManage, permissions.canSetCapacity, permissions.canStart,
        permissions.canEnd, permissions.canRestart,
        view.phase === "lobby" ? view.seats?.map((seat) => seat.playerId) : null
      ]),
      status: key([
        memberRole, view.phase, view.notice, view.round, view.wordNumber,
        view.turnLabel, view.turnTeamIndex, players.length, view.capacity
      ]),
      players: key([
        view.selfId, permissions.canKick,
        players.map((player) => [player.id, player.name, player.isHost, player.connected])
      ]),
      scores: key([view.phase, view.scores || []]),
      seats: key([
        memberRole, view.phase, view.selfId, view.currentActorId,
        view.seats?.map((seat) => [seat.index, seat.playerId]),
        players.map((player) => [player.id, player.name])
      ]),
      idiom: key([memberRole, view.phase, view.idiomHidden, view.idiom]),
      decision: actionContext.key,
      log: key((view.log || []).map((item) => [item.id, item.text, item.detail]))
    }
  };
}

export function createGame2PartitionRenderer(renderers = {}) {
  let previousKeys = null;
  function render(model, { force = false } = {}) {
    if (!model) return [];
    const changed = [];
    for (const partition of PARTITIONS) {
      if (force || !previousKeys || previousKeys[partition] !== model.keys[partition]) {
        renderers[partition]?.(model);
        changed.push(partition);
      }
    }
    previousKeys = { ...model.keys };
    return changed;
  }
  return Object.freeze({
    render,
    reset() { previousKeys = null; },
    get keys() { return previousKeys && { ...previousKeys }; }
  });
}

export const GAME2_RENDER_PARTITIONS = PARTITIONS;
