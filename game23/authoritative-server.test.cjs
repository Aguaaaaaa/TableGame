"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),test=require("node:test");
const startServer=require("../shared/server/start-authoritative-game-server");
async function post(base,pathname,body){const response=await fetch(`${base}${pathname}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});return{response,payload:await response.json()};}
const action=(session,id,body)=>({roomCode:session.roomCode,playerId:session.clientId,resumeToken:session.resumeToken,actionId:id,action:body});

test("权威服务创建梦境画廊、满房自动旁观并隐藏所有私人手牌",async(t)=>{
  const engine=await import("./server/game-engine.mjs");
  const server=startServer({gameRoot:__dirname,sharedRoot:path.resolve(__dirname,"../shared"),engine,protocolVersion:3,defaultPort:0,spectatorsEnabled:true});
  await new Promise((resolve)=>server.once("listening",resolve));
  t.after(()=>new Promise((resolve)=>{server.close(resolve);server.closeAllConnections?.();}));
  const base=`http://127.0.0.1:${server.address().port}`;
  assert.match(await fetch(base).then((response)=>response.text()),/只言片语/);
  const host=(await post(base,"/api/rooms",{hostId:"p1",name:"甲",capacity:3})).payload;
  const p2=(await post(base,"/api/join",{roomCode:host.roomCode,clientId:"p2",name:"乙",intent:"play"})).payload;
  const p3=(await post(base,"/api/join",{roomCode:host.roomCode,clientId:"p3",name:"丙",intent:"play"})).payload;
  const watcher=(await post(base,"/api/join",{roomCode:host.roomCode,clientId:"watch",name:"旁观",intent:"play"})).payload;
  assert.equal(watcher.memberRole,"spectator");
  assert.equal((await post(base,"/api/actions",action(host,"start",{type:"start"}))).response.status,200);
  const sessions=[host,p2,p3];
  const views=[];
  for(const session of sessions)views.push((await post(base,"/api/join",{roomCode:host.roomCode,clientId:session.clientId,resumeToken:session.resumeToken})).payload.view);
  assert.ok(views.every((view)=>view.hand.length===7));
  const handSets=views.map((view)=>new Set(view.hand.map((card)=>card.id)));
  assert.equal([...handSets[0]].some((id)=>handSets[1].has(id)||handSets[2].has(id)),false);
  const watched=(await post(base,"/api/join",{roomCode:host.roomCode,clientId:watcher.clientId,resumeToken:watcher.resumeToken})).payload.view;
  assert.deepEqual(watched.hand,[]);assert.deepEqual(watched.displayCards,[]);
  assert.equal((await post(base,"/api/actions",action(watcher,"forge",{type:"submitVote",displayId:"display_1"}))).response.status,403);
});
