"use strict";
const PARTITIONS=Object.freeze(["room","status","players","table","decision","decisionFacts","hand","log","countdown"]);
const key=(value)=>JSON.stringify(value);
export function createGame5RenderModel(view,{memberRole=view?.roomRole,roomCode=""}={}){
  if(!view)return null;const players=view.players||[],me=players.find((item)=>item.id===view.selfId)||null,current=players[view.currentIndex]||null,permissions=view.permissions||{};
  const myTurn=memberRole==="player"&&view.phase==="playing"&&current?.id===view.selfId;
  return {view,memberRole,roomCode,me,current,myTurn,keys:{
    room:key([roomCode,view.phase,view.capacity,players.length,view.phase==="lobby"?players.map((item)=>[item.id,item.connected]):null,permissions.canManage,permissions.canSetCapacity,permissions.canStart,permissions.canEnd]),
    status:key([memberRole,view.phase,view.currentIndex,view.winnerId,players.length,view.capacity,current?.id,current?.name]),
    players:key([view.phase,view.currentIndex,view.selfId,view.unoVulnerableId,permissions.canKick,players.map((item)=>[item.id,item.name,item.isHost,item.connected,item.unoCalled,item.hand?.length])]),
    table:key([view.direction,view.deckCount,view.discard,view.currentColor,view.pendingDraw,permissions.canDraw]),
    decision:key([memberRole,view.phase,current?.id,permissions.canCatchUno,permissions.canChallenge,permissions.canAcceptPenalty,permissions.canPass,permissions.canDraw]),
    decisionFacts:key([memberRole,view.phase,current?.id,current?.name,view.pendingDraw]),
    hand:key([memberRole,view.selfId,me?.hand||[],view.playableCardIds||[],permissions.canCallUno,me?.unoCalled]),
    log:key((view.logs||[]).map((entry)=>[entry.id,entry.text,entry.at])),
    countdown:key([view.phase,view.deadline||0])
  }};
}
export function createGame5PartitionRenderer(renderers={}){let previousKeys=null;function render(model,{force=false}={}){if(!model)return[];const changed=[];for(const partition of PARTITIONS){if(force||!previousKeys||previousKeys[partition]!==model.keys[partition]){renderers[partition]?.(model);changed.push(partition);}}previousKeys={...model.keys};return changed;}return Object.freeze({render,reset(){previousKeys=null;},get keys(){return previousKeys&&{...previousKeys};}});}
export const GAME5_RENDER_PARTITIONS=PARTITIONS;
