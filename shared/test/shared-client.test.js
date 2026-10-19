"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { createAuthoritativeRoomClient } from "../client/authoritative-room-client.js";
import { createSessionStore } from "../client/session-store.js";
import { createServerClock } from "../client/server-clock.js";
import { assertProtocolVersion, ProtocolVersionError } from "../client/protocol.js";
import { cleanPlayerName, escapeHtml, normalizeRoomCode } from "../client/utils.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
}

test("room code and player input are normalized", () => {
  assert.equal(normalizeRoomCode(" a-b_c12 "), "ABC1");
  assert.equal(cleanPlayerName("  Alice  ", "玩家"), "Alice");
  assert.equal(escapeHtml('<b class="x">&</b>'), "&lt;b class=&quot;x&quot;&gt;&amp;&lt;/b&gt;");
});

test("sessions are isolated by game and room", () => {
  const storage = memoryStorage();
  const game9 = createSessionStore({ gameId: "game9", storage });
  const another = createSessionStore({ gameId: "another", storage });
  const session = { playerId: "guest_1", resumeToken: "secret", name: "Alice" };

  game9.save("ab12", session);
  assert.deepEqual(game9.load("AB12"), session);
  assert.equal(another.load("AB12"), null);
  game9.save("SP10", { ...session, memberRole: "spectator" });
  assert.equal(game9.load("SP10").memberRole, "spectator");
  game9.clear("AB12");
  assert.equal(game9.load("AB12"), null);
});

test("protocol mismatch is rejected", () => {
  assert.equal(assertProtocolVersion({ protocolVersion: 2 }, 2).protocolVersion, 2);
  assert.throws(
    () => assertProtocolVersion({ protocolVersion: 1 }, 2),
    ProtocolVersionError
  );
});

test("server clock selects low-latency samples and advances with a monotonic clock", () => {
  let wall = 1_000_000;
  let monotonic = 5000;
  const clock = createServerClock({ wallNow: () => wall, monotonicNow: () => monotonic });
  clock.applySamples([
    { serverNow: 1_020_040, wallStart: 1_000_000, wallEnd: 1_000_080, rttMs: 80 },
    { serverNow: 1_020_025, wallStart: 1_000_000, wallEnd: 1_000_050, rttMs: 50 },
    { serverNow: 1_020_500, wallStart: 1_000_000, wallEnd: 1_001_000, rttMs: 1000 },
    { serverNow: 1_020_030, wallStart: 1_000_000, wallEnd: 1_000_060, rttMs: 60 }
  ]);
  assert.equal(Math.round(clock.snapshot().clockOffsetMs), 20000);
  monotonic += 3000;
  wall += 60000; // 模拟用户手动修改系统时间；服务器时钟仍只前进3秒。
  assert.equal(Math.round(clock.now()), 1_023_000);
  assert.equal(clock.snapshot().lastRttMs, 50);
});

test("authoritative client sends every role action to the server with a state version", async () => {
  class FakeEventSource {
    constructor(url) {
      this.url = url;
      this.listeners = new Map();
      queueMicrotask(() => this.listeners.get("open")?.({ type: "open" }));
    }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    close() {}
  }

  const requests = [];
  const initialView = {
    selfId: "host_1",
    phase: "lobby",
    capacity: 3,
    players: []
  };
  async function fetchImpl(path, options = {}) {
    if (path === "/api/config") {
      return new Response(JSON.stringify({ authorityMode: "server", protocolVersion: 3 }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    }
    const data = JSON.parse(options.body);
    requests.push({ path, data });
    if (path === "/api/rooms") {
      return new Response(JSON.stringify({
        roomCode: "ABCD",
        hostId: "host_1",
        clientId: "host_1",
        resumeToken: "secure-token",
        role: "host",
        memberRole: "player",
        version: 4,
        view: initialView,
        protocolVersion: 3
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: true, version: 5, protocolVersion: 3 }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  }

  const views = [];
  const client = createAuthoritativeRoomClient({
    protocolVersion: 3,
    sessionStore: createSessionStore({ gameId: "test-authority", storage: memoryStorage() }),
    fetchImpl,
    EventSourceImpl: FakeEventSource,
    handlers: { onView: (view, version) => views.push({ view, version }) }
  });
  const created = await client.createRoom({ name: "房主", capacity: 3, id: "host_1" });
  await client.submitAction({ type: "start" });
  await client.submitAction({ type: "challenge", reactionId: "reaction_1" }, { expectedVersion: 3 });

  assert.equal(created.role, "host");
  assert.equal(created.memberRole, "player");
  assert.deepEqual(views, [{ view: initialView, version: 4 }]);
  assert.equal(requests[1].path, "/api/actions");
  assert.equal(requests[1].data.playerId, "host_1");
  assert.equal(requests[1].data.expectedVersion, 4);
  assert.deepEqual(requests[1].data.action, { type: "start" });
  assert.equal(requests[2].data.expectedVersion, 3);
  assert.deepEqual(requests[2].data.action, { type: "challenge", reactionId: "reaction_1" });
});

test("authoritative client sends join intent and persists role changes returned by the seat API", async () => {
  class FakeEventSource {
    constructor() {
      this.listeners = new Map();
      queueMicrotask(() => this.listeners.get("open")?.({ type: "open" }));
    }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    close() {}
  }
  const requests = [];
  async function fetchImpl(path, options = {}) {
    if (path === "/api/config") {
      return new Response(JSON.stringify({ authorityMode: "server", protocolVersion: 3, serverNow: Date.now() }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    }
    const data = JSON.parse(options.body);
    requests.push({ path, data });
    const payload = path === "/api/join"
      ? {
        roomCode: "ABCD", hostId: "host", clientId: "watch", resumeToken: "watch-token",
        role: "guest", memberRole: "spectator", assignmentReason: "requested_spectator",
        autoSpectated: false, version: 2, view: { roomRole: "spectator" }, protocolVersion: 3
      }
      : {
        ok: true, memberRole: "player", version: 3,
        view: { roomRole: "player" }, protocolVersion: 3
      };
    return new Response(JSON.stringify(payload), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  }
  const storage = memoryStorage();
  const sessions = createSessionStore({ gameId: "spectator-client", storage });
  const client = createAuthoritativeRoomClient({
    protocolVersion: 3,
    sessionStore: sessions,
    fetchImpl,
    EventSourceImpl: FakeEventSource
  });
  const joined = await client.joinRoom({
    code: "ABCD", name: "旁观者", id: "watch", intent: "spectate"
  });
  assert.equal(joined.memberRole, "spectator");
  assert.equal(joined.assignmentReason, "requested_spectator");
  assert.equal(requests[0].data.intent, "spectate");
  assert.equal(sessions.load("ABCD").memberRole, "spectator");

  const seated = await client.changeSeat("play");
  assert.equal(seated.memberRole, "player");
  assert.equal(seated.assignmentReason, null);
  assert.equal(requests[1].path, "/api/seat");
  assert.equal(requests[1].data.intent, "play");
  assert.equal(sessions.load("ABCD").memberRole, "player");
});

test("authoritative client pre-samples server time and re-synchronizes after SSE reconnect", async () => {
  let activeSource = null;
  let configRequests = 0;
  class FakeEventSource {
    constructor() {
      this.listeners = new Map();
      activeSource = this;
      queueMicrotask(() => this.listeners.get("open")?.({ type: "open" }));
    }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    close() {}
  }
  async function fetchImpl(path) {
    if (path === "/api/config") {
      configRequests += 1;
      return new Response(JSON.stringify({ authorityMode: "server", protocolVersion: 3, serverNow: Date.now() + 12000 }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      roomCode: "TIME", hostId: "host", clientId: "host", resumeToken: "token",
      role: "host", memberRole: "player", version: 1, view: { phase: "lobby" },
      protocolVersion: 3, serverNow: Date.now() + 12000
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  const clock = createServerClock();
  const client = createAuthoritativeRoomClient({
    protocolVersion: 3,
    sessionStore: createSessionStore({ gameId: "clock-sync", storage: memoryStorage() }),
    fetchImpl, EventSourceImpl: FakeEventSource, serverClock: clock,
    initialClockSamples: 3, reconnectClockSamples: 2, clockRefreshMs: 0
  });
  await client.createRoom({ name: "房主", capacity: 5, id: "host" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  const afterInitialOpen = configRequests;
  assert.ok(afterInitialOpen >= 3);
  assert.equal(client.snapshot().clockSynced, true);
  assert.ok(client.snapshot().clockOffsetMs > 11000);

  activeSource.listeners.get("open")?.({ type: "open" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(configRequests >= afterInitialOpen + 2);
  client.close();
});
