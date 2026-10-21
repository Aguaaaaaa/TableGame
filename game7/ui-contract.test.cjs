"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),test=require("node:test");
const read=(name)=>fs.readFileSync(path.join(__dirname,name),"utf8");
test("马尼拉前端仅提交意图并具备权威协议、旁观和固定地图契约",()=>{
  const html=read("index.html"),script=read("app.js"),styles=read("styles.css"),server=read("signal-server.js");
  for(const id of ["joinIntentField","spectatorSettingButton","seatActionButton","spectatorPanel","spectatorCountBadge","spectatorList","walletPanel","presentationEffects","presentationTrail","presentationAnnouncement"])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/shared\/styles\/spectator\.css/);assert.match(html,/name="joinIntent" value="spectate"/);
  assert.match(script,/createAuthoritativeRoomClient/);assert.match(script,/protocolVersion:PROTOCOL_VERSION/);assert.match(script,/PROTOCOL_VERSION=3/);assert.match(script,/createSpectatorUi/);assert.match(script,/createPresentationTimeline/);assert.match(script,/catchUpThreshold:2/);assert.match(script,/!event\.kind\.startsWith\("dice-"\)/);
  assert.doesNotMatch(script,/new WebSocket|BroadcastChannel|localStorage\.setItem\([^)]*state|Math\.random\(\).*die/);
  assert.match(server,/protocolVersion:3/);assert.match(server,/createSqliteRoomStore/);assert.match(server,/GAME7_DB_PATH/);
  assert.match(html,/class="setup harbor-gate"/);assert.match(html,/class="harbor-office"/);assert.match(html,/驶入财富交汇的海湾/);
  assert.match(styles,/manila-bay-arrival-v1\.png/);assert.match(styles,/@media\(max-width:720px\)/);assert.ok(fs.existsSync(path.join(__dirname,"assets","manila-bay-arrival-v1.png")));
  assert.match(script,/createGame7PartitionRenderer/);assert.match(script,/createGame7RenderModel/);assert.match(script,/const partitionRenderer=createGame7PartitionRenderer/);assert.match(script,/dataset\.renderKey/);
  assert.ok(fs.existsSync(path.join(__dirname,"render-partitions.mjs")));
});

