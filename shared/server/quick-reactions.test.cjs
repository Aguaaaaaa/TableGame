"use strict";

const assert=require("node:assert/strict");
const path=require("node:path");
const test=require("node:test");
const startServer=require("./start-authoritative-game-server");
const {createMemoryRoomStore}=require("./memory-room-store");

async function post(base,pathname,body){
  const response=await fetch(`${base}${pathname}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  return{response,payload:await response.json()};
}

function engine(){
  return{
    ACTION_SECONDS:30,
    createLobby({capacity,host}){return{phase:"lobby",capacity:Number(capacity),players:[{...host,isHost:true}],gameActions:0};},
    addPlayer(state,player){state.players.push({...player,isHost:false});},
    removePlayer(){},setPresence(state,id,connected){const player=state.players.find((item)=>item.id===id);if(!player||player.connected===connected)return false;player.connected=connected;return true;},
    applyAction(state){state.gameActions+=1;},
    buildView(state,viewerId){return{selfId:viewerId,phase:state.phase,players:state.players,gameActions:state.gameActions};},
    getDeadline(){return 0;},handleTimeout(){return false;}
  };
}

async function readReaction(response){
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer="";
  while(true){
    const {done,value}=await reader.read();if(done)throw new Error("reaction stream closed");buffer+=decoder.decode(value,{stream:true});
    const frames=buffer.split("\n\n");buffer=frames.pop();
    for(const frame of frames){
      const data=frame.split("\n").find((line)=>line.startsWith("data: "))?.slice(6);if(!data)continue;
      const message=JSON.parse(data);if(message.payload?.kind==="reaction")return message.payload.reaction;
    }
  }
}

test("quick reactions are authenticated, allowlisted, rate-limited and never mutate game state",async(context)=>{
  const store=createMemoryRoomStore();
  const server=startServer({gameRoot:path.resolve(__dirname,"../../game9"),sharedRoot:path.resolve(__dirname,".."),engine:engine(),defaultPort:0,roomStore:store});
  await new Promise((resolve)=>server.once("listening",resolve));
  context.after(async()=>{if(server.listening)await new Promise((resolve)=>{server.close(resolve);server.closeAllConnections?.();});});
  const base=`http://127.0.0.1:${server.address().port}`;
  const created=await post(base,"/api/rooms",{hostId:"host",name:"Host",capacity:2});
  const session=created.payload;
  const controller=new AbortController();
  const events=await fetch(`${base}/api/events?clientId=host&roomCode=${session.roomCode}&resumeToken=${encodeURIComponent(session.resumeToken)}`,{signal:controller.signal});
  assert.equal(events.status,200);
  const pending=readReaction(events);
  const before=store.loadRooms().find((entry)=>entry.roomCode===session.roomCode).snapshot;
  const sent=await post(base,"/api/reactions",{roomCode:session.roomCode,playerId:"host",resumeToken:session.resumeToken,reactionId:"applaud"});
  assert.equal(sent.response.status,200);
  assert.equal(sent.payload.reaction.senderName,"Host");
  assert.equal(sent.payload.reaction.label,"漂亮");
  const delivered=await pending;
  assert.equal(delivered.id,"applaud");
  assert.equal(delivered.senderId,"host");
  const after=store.loadRooms().find((entry)=>entry.roomCode===session.roomCode).snapshot;
  assert.equal(after.version,before.version);
  assert.equal(after.state.gameActions,0);
  assert.equal("reactionTimestamps" in after.members.find((member)=>member.id==="host"),false);

  const limited=await post(base,"/api/reactions",{roomCode:session.roomCode,playerId:"host",resumeToken:session.resumeToken,reactionId:"agree"});
  assert.equal(limited.response.status,429);
  assert.equal(limited.payload.code,"reaction_rate_limited");
  const invalid=await post(base,"/api/reactions",{roomCode:session.roomCode,playerId:"host",resumeToken:session.resumeToken,reactionId:"<script>"});
  assert.equal(invalid.response.status,400);
  assert.equal(invalid.payload.code,"invalid_reaction");
  controller.abort();
});
