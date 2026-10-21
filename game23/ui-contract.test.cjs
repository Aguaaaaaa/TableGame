"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),test=require("node:test");
const read=(name)=>fs.readFileSync(path.join(__dirname,name),"utf8");

test("只言片语采用独立梦境画廊外壳并保留标准联机契约",()=>{
  const html=read("index.html"),css=read("styles.css"),script=read("app.js");
  assert.match(html,/data-theme="dream-gallery"/);assert.match(html,/class="arrival"/);assert.match(html,/class="arrival-copy"/);assert.match(html,/class="arrival-access"/);
  assert.match(html,/id="hostModeButton" class="active"/);assert.match(html,/id="guestModeButton"/);assert.match(html,/id="hostNameInput" maxlength="12"/);assert.match(html,/id="roomCodeInput" maxlength="4"/);
  assert.match(html,/id="endGameButton"[^>]*>结束并返回大厅</);assert.match(script,/type:"end"/);assert.match(script,/permissions\.canEnd/);
  assert.match(html,/name="joinIntent" value="play" checked/);assert.match(html,/name="joinIntent" value="spectate"/);
  assert.match(css,/dream-gallery-entry-v1\.jpg/);assert.match(css,/dream-gallery-stage-v1\.jpg/);
  assert.ok(fs.existsSync(path.join(__dirname,"assets","dream-gallery-entry-v1.jpg")));assert.ok(fs.existsSync(path.join(__dirname,"assets","dream-gallery-stage-v1.jpg")));
  assert.match(script,/createAuthoritativeRoomClient/);assert.match(script,/createSpectatorUi/);assert.doesNotMatch(script,/https?:\/\//);
});

test("核心桌面、吸附手牌、规则记录旁观顺序和移动画廊符合最新范式",()=>{
  const html=read("index.html"),css=read("styles.css"),script=read("app.js");
  assert.match(html,/id="dreamStage"[^>]*data-ui-role="core-table"/);assert.match(html,/id="actionDock" class="action-dock"/);assert.match(html,/id="handPanel" class="hand-panel"/);
  assert.match(html,/data-ui-role="rules-entry"/);assert.match(html,/data-ui-role="game-log"/);assert.match(html,/data-ui-role="spectators"/);
  assert.ok(html.indexOf('data-ui-role="game-log"')<html.indexOf('id="spectatorPanel"'));
  assert.match(css,/\.action-dock\{position:sticky/);assert.match(css,/@media\(max-width:720px\)[\s\S]*?\.gallery\{display:grid;grid-template-columns:repeat\(2/);
  assert.match(script,/function dreamSvg\(card\)/);assert.match(script,/Array\.from\(\{length:12\}/);assert.match(script,/createPresentationTimeline/);
});

test("线索、选牌和投票草稿按房间玩家轮次阶段保存且普通视图刷新不清空",()=>{
  const script=read("app.js");
  assert.match(script,/function contextOf\(next\)/);assert.match(script,/sessionStorage\.setItem\(storageKey\(draft\.context\)/);
  assert.match(script,/onView\(next\)\{captureDraft\(\);reconcileDraft\(next\);view=next/);
  assert.match(script,/clueText:draft\.clueText/);assert.match(script,/cardIds:\[\.\.\.draft\.selected\]/);assert.match(script,/displayId:draft\.voteId/);
});

test("权威视图按房间舞台画廊手牌和决策分区更新",()=>{
  const script=read("app.js"),partitions=read("render-partitions.mjs");
  assert.match(script,/createGame23PartitionRenderer/);assert.match(script,/createGame23RenderModel/);
  assert.match(script,/decision:renderDecision,decisionFacts:renderDecisionFacts/);
  assert.match(script,/existing=new Map\(\[\.\.\.E\.players\.querySelectorAll/);
  assert.match(script,/existing=new Map\(\[\.\.\.E\.hand\.querySelectorAll/);
  assert.match(partitions,/"room", "status", "players", "stage", "gallery", "hand"/);
  assert.match(partitions,/"decision", "decisionFacts", "log", "countdown"/);
});

test("准备大厅房主可通过统一菜单管理其他旅人",()=>{const script=read("app.js");assert.match(script,/data-kick/);assert.match(script,/current\.phase!=="lobby"/);assert.match(script,/!current\.permissions\.canManage/);assert.match(script,/item\.isHost/);});
