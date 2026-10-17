"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),test=require("node:test");
const startServer=require("../shared/server/start-authoritative-game-server"),{createSqliteRoomStore}=require("../shared/server/sqlite-room-store");
async function post(base,pathname,body){const response=await fetch(`${base}${pathname}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});return{response,payload:await response.json()};}
async function launch(engine,file){const server=startServer({gameRoot:__dirname,sharedRoot:path.resolve(__dirname,"../shared"),engine,protocolVersion:3,defaultPort:0,spectatorsEnabled:true,roomStore:createSqliteRoomStore({filename:file})});await new Promise((resolve)=>server.once("listening",resolve));return{server,base:`http://127.0.0.1:${server.address().port}`};}
async function close(run){await new Promise((resolve)=>{run.server.close(resolve);run.server.closeAllConnections?.();});}

test("SQLite重启恢复梦境手牌、叙述者、截止时间与旁观边界",async(t)=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"tablegame-game23-")),file=path.join(dir,"game23.sqlite"),engine=await import("./server/game-engine.mjs");let run;
  t.after(async()=>{if(run?.server.listening)await close(run);fs.rmSync(dir,{recursive:true,force:true});});
  run=await launch(engine,file);
  const host=(await post(run.base,"/api/rooms",{hostId:"p1",name:"甲",capacity:3})).payload;
  await post(run.base,"/api/join",{roomCode:host.roomCode,clientId:"p2",name:"乙"});await post(run.base,"/api/join",{roomCode:host.roomCode,clientId:"p3",name:"丙"});
  const watcher=(await post(run.base,"/api/join",{roomCode:host.roomCode,clientId:"watch",name:"旁观",intent:"spectate"})).payload;
  await post(run.base,"/api/actions",{roomCode:host.roomCode,playerId:host.clientId,resumeToken:host.resumeToken,actionId:"start",action:{type:"start"}});
  const before=(await post(run.base,"/api/join",{roomCode:host.roomCode,clientId:host.clientId,resumeToken:host.resumeToken})).payload.view;
  await close(run);run=await launch(engine,file);
  const after=(await post(run.base,"/api/join",{roomCode:host.roomCode,clientId:host.clientId,resumeToken:host.resumeToken})).payload.view;
  const watched=(await post(run.base,"/api/join",{roomCode:host.roomCode,clientId:watcher.clientId,resumeToken:watcher.resumeToken})).payload.view;
  assert.equal(after.phase,before.phase);assert.equal(after.deadline,before.deadline);assert.equal(after.storytellerId,before.storytellerId);assert.deepEqual(after.hand,before.hand);
  assert.equal(watched.roomRole,"spectator");assert.deepEqual(watched.hand,[]);
});
