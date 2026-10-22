"use strict";

import { createId, cleanPlayerName, isValidRoomCode, normalizeRoomCode } from "./utils.js";
import { assertProtocolVersion, MESSAGE_KINDS, readServerConfig, requestJson } from "./protocol.js";
import { sharedServerClock } from "./server-clock.js";
import { createSseChannel } from "./sse-channel.js";

export function createAuthoritativeRoomClient({
  protocolVersion,
  sessionStore,
  fetchImpl = globalThis.fetch,
  EventSourceImpl = globalThis.EventSource,
  serverClock = sharedServerClock,
  initialClockSamples = 5,
  reconnectClockSamples = 3,
  clockRefreshMs = 90000,
  wallNow = () => Date.now(),
  monotonicNow = () => globalThis.performance?.now?.() ?? Date.now(),
  setIntervalImpl = globalThis.setInterval,
  clearIntervalImpl = globalThis.clearInterval,
  onStatus = () => {},
  handlers = {}
} = {}) {
  let role = null;
  let memberRole = null;
  let roomCode = "";
  let playerId = "";
  let hostId = "";
  let resumeToken = "";
  let playerName = "";
  let version = 0;
  let assignmentReason = null;
  let autoSpectated = false;
  let clockSyncPromise = null;
  let clockRefreshTimer = null;
  const reactionListeners = new Set();
  const memberStatusListeners = new Set();
  const lobbyReadinessListeners = new Set();

  async function timedRequest(request) {
    const wallStart = wallNow();
    const monotonicStart = monotonicNow();
    const result = await request();
    const rttMs = Math.max(0, monotonicNow() - monotonicStart);
    const sample = Number.isFinite(result?.serverNow) ? {
      serverNow: Number(result.serverNow), wallStart, wallEnd: wallStart + rttMs, rttMs
    } : null;
    return { result, sample };
  }

  async function synchronizeClock(sampleCount = initialClockSamples, force = false) {
    const ageMs = serverClock.snapshot?.().ageMs;
    if (!force && Number.isFinite(ageMs) && ageMs < Math.min(clockRefreshMs / 2, 30000)) return null;
    if (clockSyncPromise) return clockSyncPromise;
    clockSyncPromise = (async () => {
      const samples = [];
      let latestConfig = null;
      let lastError = null;
      for (let index = 0; index < Math.max(1, Number(sampleCount) || 1); index += 1) {
        try {
          const measured = await timedRequest(() => readServerConfig({ fetchImpl }));
          latestConfig = assertProtocolVersion(measured.result, protocolVersion);
          if (measured.sample) samples.push(measured.sample);
        } catch (error) { lastError = error; }
      }
      if (!latestConfig && lastError) throw lastError;
      if (samples.length) serverClock.applySamples(samples);
      handlers.onClockSync?.(serverClock.snapshot?.());
      return latestConfig;
    })().finally(() => { clockSyncPromise = null; });
    return clockSyncPromise;
  }

  function stopClockRefresh() {
    if (clockRefreshTimer != null) clearIntervalImpl(clockRefreshTimer);
    clockRefreshTimer = null;
  }

  function startClockRefresh() {
    stopClockRefresh();
    if (!(clockRefreshMs > 0)) return;
    clockRefreshTimer = setIntervalImpl(() => {
      synchronizeClock(reconnectClockSamples, true).catch((error) => handlers.onClockSyncError?.(error));
    }, clockRefreshMs);
    clockRefreshTimer?.unref?.();
  }

  function acceptView(view, nextVersion = 0) {
    const numericVersion = Number(nextVersion) || 0;
    if (numericVersion && numericVersion < version) return;
    version = Math.max(version, numericVersion);
    if (view?.roomRole === "player" || view?.roomRole === "spectator") {
      memberRole = view.roomRole;
      if (roomCode && playerId && resumeToken) {
        sessionStore?.save(roomCode, { playerId, resumeToken, name: playerName, memberRole });
      }
    }
    handlers.onView?.(view, version);
  }

  const channel = createSseChannel({
    EventSourceImpl,
    onStatus,
    onOpen() {
      synchronizeClock(reconnectClockSamples, true).catch((error) => handlers.onClockSyncError?.(error));
    },
    onMessage(message) {
      const payload = message?.payload;
      if (payload?.kind === MESSAGE_KINDS.VIEW) {
        acceptView(payload.view, payload.version);
      } else if (payload?.kind === MESSAGE_KINDS.REACTION) {
        handlers.onReaction?.(payload.reaction, message);
        for (const listener of reactionListeners) listener(payload.reaction, message);
      } else if (payload?.kind === MESSAGE_KINDS.MEMBER_STATUS) {
        handlers.onMemberStatus?.(payload.memberStatus, message);
        for (const listener of memberStatusListeners) listener(payload.memberStatus, message);
      } else if (payload?.kind === MESSAGE_KINDS.LOBBY_READINESS) {
        handlers.onLobbyReadiness?.(payload.lobbyReadiness, message);
        for (const listener of lobbyReadinessListeners) listener(payload.lobbyReadiness, message);
      } else if (payload?.kind === MESSAGE_KINDS.KICKED) {
        sessionStore?.clear(roomCode);
        channel.close();
        handlers.onKicked?.();
      } else if (payload?.kind === MESSAGE_KINDS.ROOM_EXPIRED) {
        sessionStore?.clear(roomCode);
        channel.close();
        handlers.onRoomExpired?.();
      } else {
        handlers.onUnknownMessage?.(payload, message);
      }
    }
  });

  async function post(path, data) {
    const measured = await timedRequest(() => requestJson(path, data, { fetchImpl }));
    const result = assertProtocolVersion(measured.result, protocolVersion);
    if (measured.sample) serverClock.applySamples([measured.sample]);
    return result;
  }

  function eventsUrl() {
    const params = new URLSearchParams({ clientId: playerId, roomCode, resumeToken });
    return `/api/events?${params}`;
  }

  async function checkServer() {
    onStatus("checking");
    try {
      const result = await synchronizeClock(initialClockSamples, true);
      if (result.authorityMode !== "server") throw new Error("当前服务端不是权威游戏模式");
      onStatus("idle");
      return result;
    } catch (error) {
      onStatus("error", error);
      throw error;
    }
  }

  async function createRoom({ name, capacity, id = createId("host") } = {}) {
    await synchronizeClock(initialClockSamples);
    role = "host";
    playerId = id;
    hostId = id;
    playerName = cleanPlayerName(name, "房主");
    const result = await post("/api/rooms", {
      hostId: playerId,
      name: playerName,
      capacity
    });
    roomCode = result.roomCode;
    resumeToken = result.resumeToken;
    memberRole = result.memberRole || "player";
    assignmentReason = null;
    autoSpectated = false;
    version = Number(result.version) || 0;
    sessionStore?.save(roomCode, { playerId, resumeToken, name: playerName, memberRole });
    acceptView(result.view, result.version);
    await channel.open(eventsUrl());
    startClockRefresh();
    return snapshot();
  }

  async function joinRoom({ code, name, id, intent = "play" } = {}) {
    await synchronizeClock(initialClockSamples);
    const normalizedCode = normalizeRoomCode(code);
    if (!isValidRoomCode(normalizedCode)) throw new TypeError("请输入四位房间号");
    roomCode = normalizedCode;
    const saved = sessionStore?.load(roomCode);
    playerId = saved?.playerId || id || createId("guest");
    playerName = saved?.name || cleanPlayerName(name, "玩家");
    const result = await post("/api/join", {
      roomCode,
      clientId: playerId,
      resumeToken: saved?.resumeToken,
      name: saved ? "" : playerName,
      intent
    });
    playerId = result.clientId;
    hostId = result.hostId;
    resumeToken = result.resumeToken;
    role = result.role;
    memberRole = result.memberRole || "player";
    assignmentReason = result.assignmentReason || null;
    autoSpectated = Boolean(result.autoSpectated);
    version = Number(result.version) || 0;
    sessionStore?.save(roomCode, { playerId, resumeToken, name: playerName, memberRole });
    acceptView(result.view, result.version);
    await channel.open(eventsUrl());
    startClockRefresh();
    return { ...snapshot(), resumed: Boolean(result.resumed) };
  }

  function createActionId() {
    return globalThis.crypto?.randomUUID?.() || createId("action");
  }

  function submitAction(action, { expectedVersion = version } = {}) {
    if (!roomCode || !playerId || !resumeToken) throw new Error("尚未建立房间会话");
    return post("/api/actions", {
      roomCode,
      playerId,
      resumeToken,
      actionId: createActionId(),
      expectedVersion,
      action
    });
  }

  function sendReaction(reactionId) {
    if (!roomCode || !playerId || !resumeToken) throw new Error("尚未建立房间会话");
    return post("/api/reactions", {
      roomCode,
      playerId,
      resumeToken,
      reactionId
    });
  }

  function subscribeReactions(listener) {
    if (typeof listener !== "function") throw new TypeError("reaction listener must be a function");
    reactionListeners.add(listener);
    return () => reactionListeners.delete(listener);
  }

  function setMemberStatus(status) {
    if (!roomCode || !playerId || !resumeToken) throw new Error("尚未建立房间会话");
    return post("/api/member-status", { roomCode, playerId, resumeToken, status });
  }

  function subscribeMemberStatuses(listener) {
    if (typeof listener !== "function") throw new TypeError("member status listener must be a function");
    memberStatusListeners.add(listener);
    return () => memberStatusListeners.delete(listener);
  }

  function setLobbyReady(ready) {
    if (!roomCode || !playerId || !resumeToken) throw new Error("尚未建立房间会话");
    return post("/api/lobby-ready", { roomCode, playerId, resumeToken, ready: Boolean(ready) });
  }

  function subscribeLobbyReadiness(listener) {
    if (typeof listener !== "function") throw new TypeError("lobby readiness listener must be a function");
    lobbyReadinessListeners.add(listener);
    return () => lobbyReadinessListeners.delete(listener);
  }

  function kick(targetPlayerId) {
    if (role !== "host") throw new Error("只有房主可以移出玩家");
    return post("/api/kick", {
      roomCode,
      hostId: playerId,
      resumeToken,
      playerId: targetPlayerId
    });
  }

  async function changeSeat(intent) {
    if (!roomCode || !playerId || !resumeToken) throw new Error("尚未建立房间会话");
    const result = await post("/api/seat", {
      roomCode,
      playerId,
      resumeToken,
      intent
    });
    memberRole = result.memberRole || memberRole;
    assignmentReason = null;
    autoSpectated = false;
    version = Math.max(version, Number(result.version) || 0);
    sessionStore?.save(roomCode, { playerId, resumeToken, name: playerName, memberRole });
    if (result.view) acceptView(result.view, result.version);
    return snapshot();
  }

  function setRoomSettings({ allowSpectators } = {}) {
    if (role !== "host") throw new Error("只有房主可以修改房间设置");
    return post("/api/room-settings", {
      roomCode,
      hostId: playerId,
      resumeToken,
      allowSpectators
    });
  }

  function snapshot() {
    const clock = serverClock.snapshot?.() || {};
    return Object.freeze({
      role, memberRole, roomCode, playerId, hostId, resumeToken, name: playerName, version,
      assignmentReason, autoSpectated, clockOffsetMs: clock.clockOffsetMs || 0,
      clockRttMs: clock.lastRttMs ?? null, clockSynced: Boolean(clock.synced)
    });
  }

  function close() { stopClockRefresh(); channel.close(); }

  return Object.freeze({
    checkServer, createRoom, joinRoom, submitAction, sendReaction, subscribeReactions,
    setMemberStatus, subscribeMemberStatuses,
    setLobbyReady, subscribeLobbyReadiness,
    kick, changeSeat, setRoomSettings,
    resyncClock: () => synchronizeClock(initialClockSamples, true), close, snapshot
  });
}
