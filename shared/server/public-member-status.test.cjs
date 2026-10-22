"use strict";

const assert=require("node:assert/strict");
const path=require("node:path");
const test=require("node:test");
const startServer=require("./start-authoritative-game-server");
const {createMemoryRoomStore}=require("./memory-room-store");

async function post(base,pathname,body){const response=await fetch(`${base}${pathname}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});return{response,payload:await response.json()};}
function engine(){return{ACTION_SECONDS:30,createLobby({capacity,host}){return{phase:"lobby",capacity:Number(capacity),players:[{...host,isHost:true}],gameActions:0};},addPlayer(state,player){state.players.push({...player,isHost:false});},removePlayer(){},setPresence(state,id,connected){const player=state.players.find((item)=>item.id===id);if(!player||player.connected===connected)return false;player.connected=connected;return true;},applyAction(state){state.gameActions+=1;},buildView(state,viewerId){return{selfId:viewerId,phase:state.phase,players:state.players,gameActions:state.gameActions};},getDeadline(){return 0;},handleTimeout(){return false;}};}
async function readKind(response,kind){const reader=response.body.getReader(),decoder=new TextDecoder();let buffer="";while(true){const {done,value}=await reader.read();if(done)throw new Error("event stream closed");buffer+=decoder.decode(value,{stream:true});const frames=buffer.split("\n\n");buffer=frames.pop();for(const frame of frames){const data=frame.split("\n").find((line)=>line.startsWith("data: "))?.slice(6);if(!data)continue;const message=JSON.parse(data);if(message.payload?.kind===kind)return message.payload;}}}

test("public member status is validated, persisted and broadcast without changing the game version",async(context)=>{
  const store=createMemoryRoomStore();const server=startServer({gameRoot:path.resolve(__dirname,"../../game9"),sharedRoot:path.resolve(__dirname,".."),engine:engine(),defaultPort:0,roomStore:store});await new Promise((resolve)=>server.once("listening",resolve));context.after(async()=>{if(server.listening)await new Promise((resolve)=>{server.close(resolve);server.closeAllConnections?.();});});
  const base=`http://127.0.0.1:${server.address().port}`;const created=await post(base,"/api/rooms",{hostId:"host",name:"Host",capacity:3});const session=created.payload;
  assert.deepEqual(session.view.memberStatuses,[{id:"host",status:"present",updatedAt:0}]);
  const controller=new AbortController();const events=await fetch(`${base}/api/events?clientId=host&roomCode=${session.roomCode}&resumeToken=${encodeURIComponent(session.resumeToken)}`,{signal:controller.signal});const pending=readKind(events,"member_status");
  const before=store.loadRooms().find((entry)=>entry.roomCode===session.roomCode).snapshot;
  const changed=await post(base,"/api/member-status",{roomCode:session.roomCode,playerId:"host",resumeToken:session.resumeToken,status:"thinking"});
  assert.equal(changed.response.status,200);assert.equal(changed.payload.version,before.version);assert.equal(changed.payload.memberStatus.status,"thinking");
  const delivered=await pending;assert.equal(delivered.memberStatus.id,"host");assert.equal(delivered.memberStatus.status,"thinking");
  const after=store.loadRooms().find((entry)=>entry.roomCode===session.roomCode).snapshot;assert.equal(after.version,before.version);assert.equal(after.state.gameActions,0);assert.equal(after.members.find((member)=>member.id==="host").publicStatus,"thinking");
  const guest=await post(base,"/api/join",{roomCode:session.roomCode,clientId:"guest",name:"Guest"});assert.equal(guest.payload.view.memberStatuses.find((item)=>item.id==="host").status,"thinking");
  const invalid=await post(base,"/api/member-status",{roomCode:session.roomCode,playerId:"host",resumeToken:session.resumeToken,status:"secret-choice"});assert.equal(invalid.response.status,400);assert.equal(invalid.payload.code,"invalid_member_status");controller.abort();
});
