"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = __dirname;
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("CABO入场页采用月下精怪外壳并保留房间契约", () => {
  const html = read("index.html");
  const css = read("styles.css");
  const setupStart = html.indexOf('id="setupPanel"');
  const setupEnd = html.indexOf('id="roomPanel"', setupStart);
  const setup = html.slice(setupStart, setupEnd);

  assert.match(setup, /class="setup-wrap cabo-arrival"/);
  assert.match(setup, /class="cabo-briefing"/);
  assert.match(setup, /class="memory-route"/);
  assert.match(setup, /class="fae-lodge-access"/);
  assert.match(setup, /id="hostModeButton" class="active"/);
  assert.match(setup, /id="guestModeButton"/);
  assert.match(setup, /id="hostSetup" class="panel setup-card fae-form"/);
  assert.match(setup, /id="guestSetup" class="panel setup-card fae-form hidden"/);
  assert.match(setup, /id="hostNameInput" maxlength="12"/);
  assert.match(setup, /id="roomCodeInput" maxlength="4"/);
  assert.match(setup, /name="joinIntent" value="play" checked/);
  assert.match(setup, /name="joinIntent" value="spectate"/);
  assert.match(css, /url\("assets\/moonlit-cabo-arrival-v1\.png"\)/);
  assert.match(css, /\.cabo-briefing\{[\s\S]*?align-self:center;[\s\S]*?margin-top:clamp\(-24px,-2vh,-10px\)/);
  assert.match(css, /\.cabo-arrival \.mode-tabs\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:720px\)\{[\s\S]*?\.cabo-arrival\{[\s\S]*?grid-template-columns:1fr/);
  assert.ok(fs.existsSync(path.join(root, "assets", "moonlit-cabo-arrival-v1.png")));
});

test("CABO semantic power cards use illustrated faces without exposing hidden cards", () => {
  const script = read("app.js");
  const css = read("styles.css");

  assert.match(script, /const POWER_CARD_COPY=\{PEEK:/);
  assert.match(script, /const accessibility=shown\?cardAccessibility\(slot\.value\):"背面牌"/);
  assert.match(script, /aria-label="\$\{escapeHtml\(accessibility\)\}"/);
  assert.match(script, /const discardAccessibility=view\.discardTop\?cardAccessibility/);
  assert.match(css, /\.card\.faceup\.power\[data-power="PEEK"\][^}]*cabo-peek-v1\.jpg/);
  assert.match(css, /\.card\.faceup\.power\[data-power="SPY"\][^}]*cabo-spy-v1\.jpg/);
  assert.match(css, /\.card\.faceup\.power\[data-power="SWAP"\][^}]*cabo-swap-v1\.jpg/);
  assert.match(css, /data-power="PEEK"\]::after\{content:"◉ PEEK"\}/);
  assert.match(css, /data-power="SPY"\]::after\{content:"✧ SPY"\}/);
  assert.match(css, /data-power="SWAP"\]::after\{content:"⇄ SWAP"\}/);
  assert.ok(fs.existsSync(path.join(root, "assets", "cards", "cabo-peek-v1.jpg")));
  assert.ok(fs.existsSync(path.join(root, "assets", "cards", "cabo-spy-v1.jpg")));
  assert.ok(fs.existsSync(path.join(root, "assets", "cards", "cabo-swap-v1.jpg")));
});

test("CABO ordinary cards share illustrated environments by score band", () => {
  const script = read("app.js");
  const css = read("styles.css");

  assert.match(script, /function ordinaryCardFamily\(value\)/);
  assert.match(script, /if\(value===0\)return "zero"/);
  assert.match(script, /if\(value>=1&&value<=3\)return "low"/);
  assert.match(script, /if\(value>=4&&value<=6\)return "mid"/);
  assert.match(script, /if\(value===13\)return "thirteen"/);
  assert.match(script, /data-card-family="\$\{family\}"/);
  assert.match(css, /\.card\.faceup\.ordinary\[data-card-family="zero"\][^}]*cabo-number-zero-v1\.jpg/);
  assert.match(css, /\.card\.faceup\.ordinary\[data-card-family="low"\][^}]*cabo-number-low-v1\.jpg/);
  assert.match(css, /\.card\.faceup\.ordinary\[data-card-family="mid"\][^}]*cabo-number-mid-v1\.jpg/);
  assert.match(css, /\.card\.faceup\.ordinary\[data-card-family="thirteen"\][^}]*cabo-number-thirteen-v1\.jpg/);
  for (const filename of ["cabo-number-zero-v1.jpg", "cabo-number-low-v1.jpg", "cabo-number-mid-v1.jpg", "cabo-number-thirteen-v1.jpg"]) {
    assert.ok(fs.existsSync(path.join(root, "assets", "cards", filename)));
  }
});

test("房间设置并入标题栏，侧栏按积分、规则、记录和旁观排序", () => {
  const html = read("index.html");
  const headerStart = html.indexOf('<header id="hero"');
  const headerEnd = html.indexOf("</header>", headerStart);
  const roomTools = html.indexOf('id="roomHeaderTools"');
  const score = html.indexOf('class="panel score-card"');
  const rules = html.indexOf('class="panel rules-card"');
  const log = html.indexOf('class="panel log-panel sidebar-log"');
  const spectators = html.indexOf('id="spectatorPanel"');

  assert.ok(headerStart >= 0 && roomTools > headerStart && roomTools < headerEnd);
  assert.doesNotMatch(html, /roomRoleBanner|roomRoleTitle|roomRoleHint/);
  assert.match(html, /<details class="panel rules-card">/);
  assert.doesNotMatch(html, /<details class="panel rules-card"[^>]*\sopen(?:\s|>)/);
  assert.ok(score < rules && rules < log && log < spectators);
  assert.match(html, /SPY或SWAP的目标玩家会知道被操作的具体牌位/);
  assert.match(html, /选择至少3张失败时还会获得一张不可查看的惩罚牌/);
  assert.match(html, /普通回合限时45秒/);
});

test("进入房间时启用紧凑标题工具且旁观接口不依赖身份横幅", () => {
  const script = read("app.js");

  assert.match(script, /const ids=\["hero","connectionStatus","roomHeaderTools"/);
  assert.match(script, /setHidden\(E\.roomHeaderTools,false\)/);
  assert.match(script, /E\.hero\.classList\.add\("in-room"\)/);
  assert.doesNotMatch(script, /E\.roomRole(?:Banner|Title|Hint)/);
  assert.match(script, /createSpectatorUi\(\{/);
  assert.match(script, /seatActionButton:E\.seatActionButton/);
  assert.match(script, /createPresentationTimeline/);
  assert.match(script, /presentation\?\.sync\(next\.presentationEvents\)/);
  assert.match(script, /data-player-id=/);
  assert.match(script, /data-slot-anchor=/);
  assert.match(script, /sceneKey:\(event\)=>event\.sceneId\|\|event\.id/);
  assert.match(script, /catchUpThreshold:2/);
  assert.match(script, /severeBacklogThreshold:5/);
});

test("手机端牌桌优先且四张固定牌位继续完整展示", () => {
  const css = read("styles.css");

  assert.match(css, /@media\(max-width:850px\)[^{]*\{[^}]*\.hero\.in-room/s);
  assert.match(css, /@media\(max-width:850px\)[\s\S]*?\.room-layout\{display:flex;flex-direction:column\}/);
  assert.match(css, /@media\(max-width:850px\)[\s\S]*?\.game-area\{order:1\}/);
  assert.match(css, /@media\(max-width:850px\)[\s\S]*?\.room-layout aside\{order:2;/);
  assert.match(css, /@media\(max-width:1050px\)\{\.slots[^}]*grid-template-columns:repeat\(4,minmax\(0,54px\)\)/);
  assert.match(css, /\.rule-details\{max-height:58vh;overflow:auto/);
  assert.match(css, /\.presentation-effects/);
  assert.match(css, /\.presentation-trail\.active/);
  assert.match(css, /\.presentation-token/);
});

test("CABO权威视图按牌桌、玩家牌位、私人决策和通知分区更新", () => {
  const script=read("app.js");
  const partitions=read("render-partitions.mjs");
  assert.match(script,/createGame13PartitionRenderer/);
  assert.match(script,/createGame13RenderModel/);
  assert.match(script,/room:renderRoom,status:renderStatus,table:renderTable/);
  assert.match(script,/players:\(model\)=>renderPlayers\(model\.memberRole\),targetNotice:renderTargetNotice/);
  assert.match(script,/existing=new Map\(\[\.\.\.E\.players\.querySelectorAll/);
  assert.match(script,/const canSelect=next\.permissions\.canInitialPeek\|\|next\.permissions\.canExchange/);
  assert.match(script,/spectatorUi\.render\(view\)/);
  assert.match(partitions,/"room","status","table","players","targetNotice","score","decision","result","log","countdown"/);
});
