"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("页面包含旁观、行情、私人区和移动端吸附操作结构", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const script = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "styles.css"), "utf8");
  const heroEnd = html.indexOf("</header>");
  const roomToolsAt = html.indexOf('id="roomHeaderTools"');
  const logAt = html.indexOf('class="panel log-card"');
  const spectatorAt = html.indexOf('id="spectatorPanel"');
  assert.match(html, /name="joinIntent" value="spectate"/); assert.doesNotMatch(html, /id="roomRoleBanner"/); assert.match(html, /id="spectatorList"/);
  assert.ok(roomToolsAt >= 0 && roomToolsAt < heroEnd, "房间管理必须位于标题栏内");
  assert.match(html, /<details class="panel rules-card">/); assert.doesNotMatch(html, /<details class="panel rules-card" open>/);
  assert.ok(logAt >= 0 && spectatorAt > logAt, "旁观席必须位于交易记录之后");
  assert.match(html, /id="stockTicker"/); assert.match(html, /id="stockpiles"/); assert.match(html, /id="privateZone"/); assert.match(html, /id="controlDock"/);
  assert.match(html, /id="presentationEffects"/); assert.match(html, /id="presentationTrail"/); assert.match(html, /id="presentationAnnouncement"/);
  assert.match(script, /createSpectatorUi/); assert.match(script, /setHidden\(E\.privateZone, memberRole === "spectator"\)/);
  assert.match(script, /setHidden\(E\.roomHeaderTools, false\)/);
  assert.match(script, /createPresentationTimeline/); assert.match(script, /presentation\?\.sync\(nextView\.presentationEvents\)/);
  assert.match(script, /data-company-id=/); assert.match(script, /data-pile-id=/); assert.match(script, /data-player-id=/);
  assert.match(script, /sceneKey: \(event\) => event\.sceneId \|\| event\.id/); assert.match(script, /catchUpThreshold: 2/); assert.match(script, /severeBacklogThreshold: 5/);
  assert.match(styles, /\.control-dock \{ position: sticky/); assert.match(styles, /control-dock\[data-role="spectator"\]/); assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /@media \(max-width: 760px\)/); assert.match(styles, /@media \(max-width: 520px\)/); assert.match(styles, /stockpiles \{ grid-template-columns: minmax\(0,1fr\)/);
  assert.doesNotMatch(styles, /sidebar \.rules-card[^}]*display:\s*none/); assert.doesNotMatch(styles, /sidebar \.log-card[^}]*display:\s*none/);
  assert.match(styles, /\.presentation-effects/); assert.match(styles, /\.presentation-trail\.active/); assert.match(styles, /\.presentation-token/);
});

test("创建与加入页使用证券交易大厅外壳并保留共享入场契约", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "styles.css"), "utf8");
  assert.match(html, /id="setupPanel" class="setup-wrap" data-room-entry data-entry-layout="split"/);
  assert.match(html, /class="entry-story" data-entry-story/);
  assert.match(html, /class="entry-access panel" data-entry-access/);
  assert.match(html, /data-entry-modes/);
  assert.match(html, /data-entry-form="host"/);
  assert.match(html, /data-entry-form="guest"/);
  assert.match(html, /PRE-MARKET SESSION/);
  assert.match(html, /掌握内幕/);
  assert.match(html, /构造市场/);
  assert.match(html, /公开竞价/);
  assert.match(html, /class="entry-market-screen"/);
  assert.match(html, /class="trend trend-a"/);
  assert.match(styles, /url\("assets\/exchange-hall-entry-v1\.png"\)/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*?\.setup-wrap \{ min-height: auto/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.equal(fs.existsSync(path.join(__dirname, "assets", "exchange-hall-entry-v1.png")), true);
});

test("权威视图刷新时保留当前合法的市场操作草稿", () => {
  const script = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  assert.match(script, /onView\(nextView\) \{ captureActionDraft\(\); view = nextView; reconcileActionDraft\(\);/);
  assert.match(script, /function actionDraftContext\(current = view\)/);
  for (const key of ["supply:up-card","supply:down-card","dividend:normal","dividend:split"]) assert.match(script, new RegExp(key));
  assert.match(script, /data-action-draft="sell:\$\{item\.id\}:normal"/);
  assert.match(script, /select\.dataset\.actionDraft = `bid:\$\{pile\.id\}`/);
  assert.match(script, /field\.tagName === "SELECT"/);
  assert.match(script, /function renderDecision\(model\) \{ renderActions\(model\.memberRole\); restoreActionDraft\(\); \}/);
});

test("权威视图按行情职责分区且市场草稿只在决策上下文变化时恢复", () => {
  const script = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  const partitions = fs.readFileSync(path.join(__dirname, "render-partitions.mjs"), "utf8");
  assert.match(script, /createGame17PartitionRenderer, createGame17RenderModel/);
  assert.match(script, /partitionRenderer = createGame17PartitionRenderer\(\{/);
  assert.match(script, /ticker: renderTicker/);
  assert.match(script, /information: renderInformation/);
  assert.match(script, /stockpiles: renderStockpiles/);
  assert.match(script, /players: renderPlayers/);
  assert.match(script, /decision: renderDecision/);
  assert.match(script, /private: \(model\) => renderPrivate\(model\.memberRole\)/);
  assert.match(script, /querySelectorAll\(":scope > \[data-company-id\]"\)/);
  assert.match(script, /querySelectorAll\(":scope > \[data-pile-id\]"\)/);
  assert.match(script, /querySelectorAll\(":scope > \[data-player-id\]"\)/);
  assert.match(partitions, /"room","status","ticker","information","stockpiles","players","decision","private","log","countdown"/);
});
