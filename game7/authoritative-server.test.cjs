"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),test=require("node:test");
const startServer=require("../shared/server/start-authoritative-game-server");
async function post(base,pathname,body){const response=await fetch(`${base}${pathname}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});return{response,payload:await response.json()};}
const action=(session,id,body)=>({roomCode:session.roomCode,playerId:session.clientId,resumeToken:session.resumeToken,actionId:id,action:body});

test("马尼拉权威服务使用协议3、自动旁观并拒绝伪造行动",async(t)=>{
  const engine=await import("./server/game-engine.mjs");
  const server=startServer({gameRoot:__dirname,sharedRoot:path.resolve(__dirname,"../shared"),engine,protocolVersion:3,defaultPort:0,spectatorsEnabled:true});
  await new Promise((resolve)=>server.once("listening",resolve));
  t.after(()=>new Promise((resolve)=>{server.close(resolve);server.closeAllConnections?.();}));
  const base=`http://127.0.0.1:${server.address().port}`;
  const config=await fetch(`${base}/api/config`).then((response)=>response.json());
  assert.equal(config.protocolVersion,3);assert.equal(config.spectatorsEnabled,true);
  assert.match(await fetch(base).then((response)=>response.text()),/马尼拉/);
  const host=(await post(base,"/api/rooms",{hostId:"p1",name:"甲",capacity:4})).payload,players=[host];
  for(let index=2;index<=4;index+=1)players.push((await post(base,"/api/join",{roomCode:host.roomCode,clientId:`p${index}`,name:`玩家${index}`,intent:"play"})).payload);
  const watcher=(await post(base,"/api/join",{roomCode:host.roomCode,clientId:"watch",name:"旁观",intent:"play"})).payload;
  assert.equal(watcher.memberRole,"spectator");assert.equal(watcher.autoSpectated,true);
  assert.equal((await post(base,"/api/actions",action(host,"start",{type:"start"}))).response.status,200);
  const hostView=(await post(base,"/api/join",{roomCode:host.roomCode,clientId:host.clientId,resumeToken:host.resumeToken})).payload.view;
  const guestView=(await post(base,"/api/join",{roomCode:host.roomCode,clientId:players[1].clientId,resumeToken:players[1].resumeToken})).payload.view;
  const watched=(await post(base,"/api/join",{roomCode:host.roomCode,clientId:watcher.clientId,resumeToken:watcher.resumeToken})).payload.view;
  assert.equal(hostView.players[0].shares.every((share)=>share.good),true);
  assert.equal(guestView.players[0].shares.every((share)=>share.hidden===true),true);
  assert.equal(watched.players.every((player)=>player.cash===null),true);
  const forged=await post(base,"/api/actions",action(watcher,"forge",{type:"auction",action:"bid",bid:99}));
  assert.equal(forged.response.status,403);assert.equal(forged.payload.code,"spectator_cannot_act");
});

