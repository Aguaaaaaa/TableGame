"use strict";

const PARTITIONS = Object.freeze([
  "room",
  "players",
  "status",
  "dice",
  "turnAction",
  "turnActionFacts",
  "scoreSelector",
  "scorecard"
]);

function key(value) {
  return JSON.stringify(value);
}

export function createGame3RenderModel(view, {
  memberRole = view?.roomRole,
  roomCode = "",
  selectedScorePlayerId = ""
} = {}) {
  if (!view) return null;
  const players = Array.isArray(view.players) ? view.players : [];
  const permissions = view.permissions || {};
  const me = players.find((player) => player.id === view.selfId) || null;
  const active = players.find((player) => player.id === view.currentPlayerId) || null;
  const scorePlayer = players.find((player) => player.id === selectedScorePlayerId)
    || me
    || players[0]
    || null;
  const normalizedScorePlayerId = scorePlayer?.id || "";
  const myTurn = memberRole === "player"
    && view.phase === "playing"
    && view.currentPlayerId === view.selfId;
  const canScore = myTurn && scorePlayer?.id === view.selfId;
  const lobbyConnections = view.phase === "lobby"
    ? players.map((player) => [player.id, Boolean(player.connected)])
    : null;

  return {
    view,
    memberRole,
    roomCode,
    me,
    active,
    myTurn,
    canScore,
    scorePlayer,
    selectedScorePlayerId: normalizedScorePlayerId,
    keys: {
      room: key([
        roomCode, view.phase, view.playerCount, players.length, lobbyConnections,
        permissions.canManage, permissions.canSetCapacity, permissions.canStart,
        permissions.canEnd, permissions.canRestart
      ]),
      players: key([
        view.phase, view.currentPlayerId, permissions.canKick,
        players.map((player) => [
          player.id, player.name, player.isHost, player.connected, player.totals?.total
        ])
      ]),
      status: key([
        memberRole, view.phase, view.round, view.rolls, view.currentPlayerId,
        view.playerCount, players.length,
        view.phase === "ended"
          ? players.map((player) => [player.id, player.name, player.totals?.total])
          : null
      ]),
      dice: key([
        view.phase, view.rolls, view.dice || [], view.held || [], myTurn
      ]),
      // Only a real change of acting context may replace the action structure.
      turnAction: key([memberRole, view.phase, view.selfId, view.currentPlayerId]),
      // Values inside the same context are patched onto the stable structure.
      turnActionFacts: key([
        memberRole, view.phase, view.selfId, view.currentPlayerId, view.rolls,
        view.phase === "ended"
          ? players.map((player) => [player.id, player.name, player.totals?.total])
          : null
      ]),
      scoreSelector: key([
        normalizedScorePlayerId, view.selfId,
        players.map((player) => [player.id, player.name])
      ]),
      scorecard: key([
        normalizedScorePlayerId, canScore, view.rolls,
        canScore ? (view.dice || []) : null,
        scorePlayer?.scorecard || null,
        scorePlayer?.totals || null
      ])
    }
  };
}

export function createGame3PartitionRenderer(renderers = {}) {
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

  function reset() {
    previousKeys = null;
  }

  return Object.freeze({
    render,
    reset,
    get keys() { return previousKeys && { ...previousKeys }; }
  });
}

export const GAME3_RENDER_PARTITIONS = PARTITIONS;
