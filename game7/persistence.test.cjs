"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),test=require("node:test");
const startServer=require("../shared/server/start-authoritative-game-server"),{createSqliteRoomStore}=require("../shared/server/sqlite-room-store");
async function post(base,pathname,body){const response=await fetch(`${base}${pathname}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});return{response,payload:await response.json()};}
async function launch(engine,filename){const server=startServer({gameRoot:__dirname,sharedRoot:path.resolve(__dirname,"../shared"),engine,protocolVersion:3,defaultPort:0,spectatorsEnabled:true,roomStore:createSqliteRoomStore({filename})});await new Promise((resolve)=>server.once("listening",resolve));return{server,base:`http://127.0.0.1:${server.address().port}`};}
async function close(running){await new Promise((resolve)=>{running.server.close(resolve);running.server.closeAllConnections?.();});}

test("SQLite重启恢复马尼拉房间、秘密股票、截止时间和旁观身份",async(t)=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),"tablegame-game7-")),filename=path.join(directory,"game7.sqlite"),engine=await import("./server/game-engine.mjs");let running;
  t.after(async()=>{if(running?.server.listening)await close(running);fs.rmSync(directory,{recursive:true,force:true});});
  running=await launch(engine,filename);
  const host=(await post(running.base,"/api/rooms",{hostId:"p1",name:"甲",capacity:4})).payload,players=[host];
  for(let index=2;index<=4;index+=1)players.push((await post(running.base,"/api/join",{roomCode:host.roomCode,clientId:`p${index}`,name:`玩家${index}`})).payload);
  const watcher=(await post(running.base,"/api/join",{roomCode:host.roomCode,clientId:"watch",name:"旁观",intent:"spectate"})).payload;
  await post(running.base,"/api/actions",{roomCode:host.roomCode,playerId:host.clientId,resumeToken:host.resumeToken,actionId:"start",action:{type:"start"}});
  const before=(await post(running.base,"/api/join",{roomCode:host.roomCode,clientId:host.clientId,resumeToken:host.resumeToken})).payload.view;
  await close(running);running=await launch(engine,filename);
  const after=(await post(running.base,"/api/join",{roomCode:host.roomCode,clientId:host.clientId,resumeToken:host.resumeToken})).payload.view;
  const observed=(await post(running.base,"/api/join",{roomCode:host.roomCode,clientId:watcher.clientId,resumeToken:watcher.resumeToken})).payload.view;
  assert.equal(after.phase,before.phase);assert.equal(after.deadline,before.deadline);assert.deepEqual(after.players[0].shares,before.players[0].shares);
  assert.equal(observed.roomRole,"spectator");assert.equal(observed.selfId,null);assert.equal(observed.players.every((player)=>player.cash===null),true);
});

