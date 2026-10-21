"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),test=require("node:test");
const read=(name)=>fs.readFileSync(path.join(__dirname,name),"utf8");
test("阿瓦隆具有横向骑士席、可缩放远征地图与完整信息入口",()=>{const html=read("index.html"),css=read("styles.css"),script=read("app.js");assert.match(html,/data-theme="camelot-oath-table"/);assert.match(html,/class="knights-roster"/);assert.match(html,/id="questTrack"/);assert.match(html,/id="roundTable"[\s\S]*?class="round-table quest-map-viewport"/);assert.match(html,/id="questMapWorld"/);assert.match(html,/id="mapZoomOutButton"/);assert.match(html,/id="mapResetButton"/);assert.match(html,/id="mapZoomInButton"/);assert.ok(html.indexOf('id="players"')<html.indexOf('id="roundTable"'));assert.match(html,/data-ui-role="rules-entry"/);assert.match(html,/class="preset-guide"[\s\S]*?>基础<[\s\S]*?>经典 · 默认<[\s\S]*?>进阶</);assert.match(html,/5～6人邪恶名额只有两席/);assert.match(html,/10人局还会加入奥伯伦/);assert.match(html,/data-ui-role="game-log"/);assert.match(html,/data-ui-role="spectators"/);assert.ok(html.indexOf('data-ui-role="game-log"')<html.indexOf('id="spectatorPanel"'));assert.match(html,/id="endGameButton"[^>]*>结束并返回大厅</);assert.match(html,/id="paceModeSelect"[\s\S]*?value="quick"[\s\S]*?value="standard"[\s\S]*?value="discussion"[\s\S]*?value="custom"/);assert.match(html,/id="customPaceDialog"/);assert.match(html,/id="paceProposalInput"[^>]*min="60"[^>]*max="600"/);assert.match(html,/id="criticalCeremony"/);assert.match(html,/id="ceremonyCards"/);assert.match(css,/camelot-quest-map\.png/);assert.ok(fs.existsSync(path.join(__dirname,"assets","camelot-quest-map.png")));assert.match(css,/\.players\{display:grid;grid-auto-flow:column/);assert.match(css,/\.quest-map-world\{[\s\S]*?width:1440px;height:549px/);assert.doesNotMatch(css,/@media\(max-width:900px\)[\s\S]*?grid-template-columns:repeat\(3,1fr\)/);assert.match(css,/@media\(max-width:520px\)[\s\S]*?\.players\{grid-auto-columns:132px/);assert.match(css,/\.critical-ceremony/);assert.match(css,/@keyframes ceremonyEnter/);assert.match(script,/node\.className=`quest-node \$\{cls\}`/);assert.match(script,/class="player-avatar"/);assert.match(script,/createGame22PartitionRenderer/);assert.match(script,/dataset\.renderKey/);assert.match(script,/function bindMapNavigation\(\)/);assert.match(script,/mapView\.pointers/);assert.match(script,/new ResizeObserver/);assert.match(script,/createPresentationTimeline/);assert.match(script,/createSpectatorUi/);assert.match(script,/draftContext/);assert.match(script,/reconcileDraft\(next\);view=next/);assert.match(script,/permissions\.canEnd/);assert.match(script,/type:"end"/);assert.match(script,/requestDiscussionExtension/);assert.match(script,/voteDiscussionExtension/);assert.match(script,/deadlineDurationSeconds/);assert.match(script,/function renderCeremony/);assert.match(script,/!event\.ceremony/);assert.doesNotMatch(script,/https?:\/\//);});

test("玩家状态使用有序图形徽记且已完成任务可查看参与者档案",()=>{const html=read("index.html"),css=read("styles.css"),script=read("app.js"),badges=read("player-badges.mjs");assert.match(html,/id="questArchive"/);assert.match(html,/id="questArchivePlayers"/);assert.match(css,/\.player-badges/);assert.match(css,/\.badge-leader/);assert.match(css,/\.badge-vote-sealed/);assert.match(css,/\.badge-quest-sealed/);assert.match(css,/\.quest-participants/);assert.match(css,/\.quest-archive/);assert.match(script,/createAvalonPlayerBadges/);assert.match(script,/class="player-badges"/);assert.match(script,/class="quest-participant"/);assert.match(script,/function openQuestArchive/);assert.doesNotMatch(script,/flags\.slice\(0,3\)/);assert.match(badges,/if\(player\.id===leaderId\)add\("leader"/);assert.match(badges,/if\(Object\.hasOwn\(votes,player\.id\)\)add/);});

test("准备大厅为房主提供就近玩家管理菜单",()=>{const html=read("index.html"),css=read("styles.css"),script=read("app.js"),policy=read("player-admin-menu.mjs");assert.match(html,/id="playerAdminMenu"[^>]*role="menu"/);assert.match(html,/id="removePlayerButton"[^>]*role="menuitem"[^>]*>移除该玩家/);assert.match(css,/\.player-admin-menu\{position:fixed/);assert.match(css,/\.player-seat\.manageable/);assert.match(script,/function positionPlayerAdminMenu/);assert.match(script,/await room\.kick\(targetId\)/);assert.match(script,/event\.key==="Escape"/);assert.match(policy,/phase==="lobby"/);assert.match(policy,/targetId!==selfId/);});

test("阿瓦隆入场页采用出征前夜外壳并保留联机契约",()=>{
  const html=read("index.html"),css=read("styles.css");
  const start=html.indexOf('id="setupPanel"'),end=html.indexOf('id="roomPanel"',start),setup=html.slice(start,end);
  assert.match(setup,/class="setup-wrap oath-arrival"/);
  assert.match(setup,/class="oath-briefing"/);
  assert.match(setup,/class="oath-route"/);
  assert.match(setup,/class="council-access"/);
  assert.match(setup,/id="hostModeButton" class="active"/);
  assert.match(setup,/id="guestModeButton"/);
  assert.match(setup,/id="hostSetup" class="panel setup-card oath-form"/);
  assert.match(setup,/id="guestSetup" class="panel setup-card oath-form hidden"/);
  assert.match(setup,/id="hostNameInput" maxlength="12"/);
  assert.match(setup,/id="roomCodeInput" maxlength="4"/);
  assert.match(setup,/name="joinIntent" value="play" checked/);
  assert.match(setup,/name="joinIntent" value="spectate"/);
  assert.match(css,/url\("assets\/camelot-oath-arrival-v1\.png"\)/);
  assert.match(css,/\.oath-arrival \.mode-tabs\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:720px\)\{[\s\S]*?\.oath-arrival\{[\s\S]*?grid-template-columns:1fr/);
  assert.ok(fs.existsSync(path.join(__dirname,"assets","camelot-oath-arrival-v1.png")));
});
