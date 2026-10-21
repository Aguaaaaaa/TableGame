"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = __dirname;
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("entry shell keeps room contracts while presenting the radio interception theme", () => {
  const html = read("index.html");
  const css = read("styles.css");
  const setupStart = html.indexOf('id="setupPanel"');
  const setupEnd = html.indexOf('id="roomPanel"', setupStart);
  const setup = html.slice(setupStart, setupEnd);

  assert.match(setup, /class="panel setup-panel signal-arrival"/);
  assert.match(setup, /class="signal-briefing"/);
  assert.match(setup, /class="signal-route"/);
  assert.match(setup, /class="radio-access"/);
  assert.match(setup, /id="hostModeButton" class="active"/);
  assert.match(setup, /id="guestModeButton"/);
  assert.match(setup, /id="hostSetup" class="setup-form station-form"/);
  assert.match(setup, /id="guestSetup" class="setup-form station-form hidden"/);
  assert.match(setup, /id="hostNameInput" maxlength="12"/);
  assert.match(setup, /id="roomCodeInput" maxlength="4"/);
  assert.match(setup, /name="joinIntent" value="play" checked/);
  assert.match(setup, /name="joinIntent" value="spectate"/);
  assert.match(css, /url\("\.\/assets\/intercept-radio-arrival-v1\.png"\)/);
  assert.match(css, /\.signal-arrival \.mode-tabs\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:700px\)\{[\s\S]*?\.signal-arrival\{[\s\S]*?grid-template-columns:1fr/);
  assert.ok(fs.existsSync(path.join(root, "assets", "intercept-radio-arrival-v1.png")));
});

test("房间身份与房主控制并入标题，指挥条仅保留阶段和倒计时", () => {
  const html = read("index.html");
  const headerStart = html.indexOf('<header id="masthead"');
  const headerEnd = html.indexOf("</header>", headerStart);
  const roomTools = html.indexOf('id="roomHeaderTools"');
  const commandStart = html.indexOf('class="command-bar panel"');
  const commandEnd = html.indexOf("</div>", html.indexOf('id="timerWrap"', commandStart)) + 6;

  assert.ok(headerStart >= 0 && roomTools > headerStart && roomTools < headerEnd);
  assert.doesNotMatch(html, /roomRoleBanner|roomRoleTitle|roomRoleHint/);
  assert.ok(html.indexOf('id="hostTools"') > headerStart && html.indexOf('id="hostTools"') < headerEnd);
  assert.ok(html.indexOf('id="phaseBadge"') > commandStart && html.indexOf('id="phaseBadge"') < commandEnd);
  assert.ok(html.indexOf('id="timerWrap"') > commandStart && html.indexOf('id="timerWrap"') < commandEnd);
  assert.ok(html.indexOf('id="hostTools"') < commandStart);
});

test("公开推理记录优先于折叠规则和旁观席", () => {
  const html = read("index.html");
  const history = html.indexOf('id="historyList"');
  const rules = html.indexOf('class="panel rules-card"');
  const spectators = html.indexOf('id="spectatorPanel"');

  assert.ok(history < rules && rules < spectators);
  assert.match(html, /<details class="panel rules-card">/);
  assert.doesNotMatch(html, /<details class="panel rules-card"[^>]*\sopen(?:\s|>)/);
  assert.match(html, /达到2次截获、2次误传或完成第8轮/);
  assert.match(html, /双方答案在揭晓前互相隐藏/);
  assert.match(html, /旁观者只能看到已经公开的信息/);
});

test("进入房间启用标题工具且旁观组件不再依赖身份横幅", () => {
  const script = read("app.js");

  assert.match(script, /"masthead","connectionStatus","roomHeaderTools"/);
  assert.match(script, /setHidden\(E\.roomHeaderTools, false\)/);
  assert.match(script, /E\.masthead\.classList\.add\("in-room"\)/);
  assert.doesNotMatch(script, /E\.roomRole(?:Banner|Title|Hint)/);
  assert.match(script, /seatActionButton:E\.seatActionButton/);
});

test("小屏幕压缩标题和指挥条，规则内容内部滚动", () => {
  const css = read("styles.css");

  assert.match(css, /\.masthead\.in-room\{[^}]*margin-bottom:9px/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*?\.command-bar\{align-items:center;flex-direction:row;flex-wrap:wrap/);
  assert.match(css, /@media\(max-width:500px\)[\s\S]*?\.masthead\.in-room \.masthead-title\{display:none\}/);
  assert.match(css, /\.rule-details\{[^}]*max-height:58vh;overflow:auto/);
});

test("提示和猜码编辑器按权威上下文保留并合法清理", () => {
  const script = read("app.js");
  assert.match(script, /let localGuessDraft = null/);
  assert.match(script, /localGuessDraft = \{ key:editorKey, values:code\.map\(String\) \}/);
  assert.match(script, /localGuessDraft\?\.key===editorKey/);
  assert.match(script, /\[E\.guess1\.value,E\.guess2\.value,E\.guess3\.value\]=localGuessDraft\.values/);
  assert.match(script, /const nextClueKey=\[model\.roomCode,current\.round,current\.turnTeam,current\.encryptorId/);
  assert.match(script, /if\(clueEditorKey!==nextClueKey\)/);
  assert.match(script, /if\(tiebreakEditorKey!==nextTiebreakKey\)/);
  assert.match(script, /function resetLocalEditors\(\)/);
});

test("权威视图按私人情报、传讯、编辑器、比分和档案分区更新", () => {
  const script=read("app.js"),partitions=read("render-partitions.mjs");
  assert.match(script,/createGame11PartitionRenderer/);assert.match(script,/createGame11RenderModel/);
  assert.match(script,/decision:renderDecision,decisionFacts:renderDecisionFacts/);
  assert.match(partitions,/"privateIntel", "transmission"/);
  assert.match(partitions,/"decision", "decisionFacts", "scores", "history", "result", "countdown"/);
  assert.match(script,/当前组合包含重复数字，尚未保存/);
});

test("准备大厅房主可从队伍席和未入座区打开玩家管理菜单",()=>{const script=read("app.js");assert.match(script,/data-kick=/);assert.match(script,/current\.permissions\?\.canKick&&!player\.isHost/);assert.ok((script.match(/data-kick=/g)||[]).length>=2);});
