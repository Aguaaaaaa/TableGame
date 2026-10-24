import assert from "node:assert/strict";
import test from "node:test";
import { createGame23PartitionRenderer, createGame23RenderModel } from "./render-partitions.mjs";

const clone = (value) => structuredClone(value);
const player = (id, overrides = {}) => ({
  id, name: id, isHost: id === "p1", connected: true, score: 0, handCount: 6, ...overrides
});
const card = (id, artSeed) => ({ id, artSeed });

function baseView() {
  return {
    selfId: "p1", roomRole: "player", phase: "storytellerChoosing", round: 1, matchNumber: 1,
    capacity: 3, storytellerId: "p1", clue: null, deadline: 5000,
    submissionCount: 0, requiredSubmissions: 0, voteCount: 0, displayCards: [], roundResult: null,
    hand: [card("c1", 1), card("c2", 2)], ownDisplayIds: [], mySubmittedCardIds: [],
    handSize: 6, decoyCount: 2, result: null, logs: [], presentationEvents: [], spectators: [],
    players: [player("p1"), player("p2"), player("p3")],
    permissions: {
      canManage: true, canConfigure: false, canStart: false, canTell: true,
      canSubmitDecoys: false, canVote: false, canContinue: false, canNextMatch: false, canEnd: true
    }
  };
}

function harness() {
  const calls = [];
  let decisionNode = null;
  let sequence = 0;
  let playerNodes = new Map();
  let handNodes = new Map();
  const renderer = createGame23PartitionRenderer({
    room: () => calls.push("room"), status: () => calls.push("status"),
    players(model) {
      calls.push("players");
      playerNodes = new Map(model.view.players.map((item) => [item.id, playerNodes.get(item.id) || { id: item.id }]));
    },
    stage: () => calls.push("stage"), gallery: () => calls.push("gallery"),
    hand(model) {
      calls.push("hand");
      handNodes = new Map(model.view.hand.map((item) => [item.id, handNodes.get(item.id) || { id: item.id }]));
    },
    decision() { calls.push("decision"); decisionNode = { id: ++sequence }; },
    decisionFacts: () => calls.push("decisionFacts"), log: () => calls.push("log"),
    countdown: () => calls.push("countdown")
  });
  const draw = (view, draft = { selected: [], voteId: "", clueText: "", clueMode: "text" }) =>
    renderer.render(createGame23RenderModel(view, { memberRole: view.roomRole, roomCode: "DREAM", draft }));
  return {
    calls, draw, clear() { calls.length = 0; },
    get decisionNode() { return decisionNode; }, get playerNodes() { return playerNodes; }, get handNodes() { return handNodes; }
  };
}

test("旁观加入、演出和日志广播不替换叙述者线索输入DOM", () => {
  const h = harness(), view = baseView(); h.draw(view); const node = h.decisionNode; h.clear();
  const spectator = clone(view); spectator.spectators.push({ id: "s1", name: "旁观者" });
  spectator.presentationEvents.push({ id: "e1", kind: "clue-given" });
  assert.deepEqual(h.draw(spectator), []); assert.strictEqual(h.decisionNode, node);
  const logged = clone(spectator); logged.logs.push({ id: "l1", text: "旅途回声" });
  assert.deepEqual(h.draw(logged), ["log"]); assert.strictEqual(h.decisionNode, node);
});

test("其他玩家掉线只更新玩家节点且保留自己的输入与手牌节点", () => {
  const h = harness(), view = baseView(); h.draw(view);
  const decision = h.decisionNode, playerNode = h.playerNodes.get("p2"), handNode = h.handNodes.get("c1"); h.clear();
  const next = clone(view); next.players[1].connected = false;
  assert.deepEqual(h.draw(next), ["players"]);
  assert.strictEqual(h.decisionNode, decision); assert.strictEqual(h.playerNodes.get("p2"), playerNode);
  assert.strictEqual(h.handNodes.get("c1"), handNode);
});

test("输入线索和选择手牌只打补丁而不重建决策上下文", () => {
  const h = harness(), view = baseView(); h.draw(view); const node = h.decisionNode; h.clear();
  assert.deepEqual(h.draw(view, { selected: [], voteId: "", clueText: "月光", clueMode: "text" }), ["decisionFacts"]);
  assert.strictEqual(h.decisionNode, node); h.clear();
  assert.deepEqual(h.draw(view, { selected: ["c1"], voteId: "", clueText: "月光", clueMode: "text" }), ["hand", "decisionFacts"]);
  assert.strictEqual(h.decisionNode, node);
});

test("公开进度、投票选择和倒计时分别只更新所属分区", () => {
  const h = harness(), view = baseView(); view.phase = "playersChoosing"; view.storytellerId = "p2";
  view.permissions.canTell = false; view.permissions.canSubmitDecoys = true; view.requiredSubmissions = 2;
  h.draw(view); const node = h.decisionNode; h.clear();
  const progressed = clone(view); progressed.submissionCount = 1;
  assert.deepEqual(h.draw(progressed), ["stage", "decisionFacts"]); assert.strictEqual(h.decisionNode, node); h.clear();
  const deadline = clone(progressed); deadline.deadline = 9000;
  assert.deepEqual(h.draw(deadline), ["countdown"]); assert.strictEqual(h.decisionNode, node);
});

test("服务器接受动作并进入新阶段时才替换旧决策区", () => {
  const h = harness(), view = baseView(); h.draw(view); const node = h.decisionNode; h.clear();
  const next = clone(view); next.phase = "playersChoosing"; next.clue = { mode: "text", text: "月光" };
  next.storytellerId = "p1"; next.permissions.canTell = false; next.deadline = 8000;
  assert.ok(h.draw(next).includes("decision")); assert.notStrictEqual(h.decisionNode, node);
});

test("揭晓转入讨论时替换阶段操作但继续保留公开结果", () => {
  const h = harness(), view = baseView();
  view.phase = "resolution"; view.permissions.canTell = false; view.permissions.canContinue = true;
  view.roundResult = { storytellerDisplayId: "d1", gains: { p1: 3 }, correctVoters: ["p2"], allOrNone: false, votes: { p2: "d1" }, owners: { d1: "p1" } };
  view.displayCards = [{ displayId: "d1", card: card("c1", 1), ownerId: "p1" }];
  h.draw(view); const node = h.decisionNode; h.clear();

  const discussion = clone(view); discussion.phase = "discussion"; discussion.deadline = 95000;
  const changed = h.draw(discussion);
  assert.ok(changed.includes("decision"));
  assert.ok(changed.includes("countdown"));
  assert.notStrictEqual(h.decisionNode, node);
  assert.deepEqual(discussion.roundResult, view.roundResult);
  assert.deepEqual(discussion.displayCards, view.displayCards);
});
