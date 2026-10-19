"use strict";
const PARTITIONS=Object.freeze(["room","status","players","reveal","rows","decision","hand","log","countdown","animation"]);
const key=(value)=>JSON.stringify(value);
export function createGame6RenderModel(view,{memberRole=view?.roomRole,roomCode=""}={}){
  if(!view)return null;const players=view.players||[],me=players.find((item)=>item.id===view.selfId)||null,permissions=view.permissions||{};
  return {view,memberRole,roomCode,me,keys:{
    room:key([roomCode,view.phase,view.capacity,players.length,view.phase==="lobby"?players.map((item)=>[item.id,item.connected]):null,permissions.canManage,permissions.canSetCapacity,permissions.canStart,permissions.canEnd]),
    status:key([memberRole,view.phase,view.round,view.turn,view.pendingPlayerId,view.pendingCard,view.winners,players.map((item)=>[item.id,item.name])]),
    players:key([view.phase,view.pendingPlayerId,view.winners,view.animation?.type,view.animation?.playerId,permissions.canKick,players.map((item)=>[item.id,item.name,item.isHost,item.connected,item.score,item.captured,item.hand?.length,item.hasSelected])]),
    reveal:key([view.phase,view.revealedPlays||[]]),
    rows:key([view.rows||[],permissions.canChooseRow,view.animation?.type,view.animation?.rowIndex,view.animation?.playerId,view.animation?.points]),
    decision:key([memberRole,view.phase,view.pendingPlayerId,view.pendingCard,view.animation,permissions.canChooseRow,permissions.canStart,me?.hasSelected,me?.selectedCard]),
    hand:key([memberRole,view.phase,view.selfId,me?.hand||[],me?.hasSelected,me?.selectedCard,permissions.canSelect]),
    log:key((view.logs||[]).map((entry)=>[entry.id,entry.text,entry.at])),
    countdown:key([view.phase,view.deadline||0,view.animation?.startedAt,view.animation?.endsAt]),
    animation:key([view.phase,view.animation?.id,view.animation?.sequence,view.animation?.type,view.animation?.playerId,view.animation?.card,view.animation?.rowIndex,view.animation?.startedAt,view.animation?.endsAt])
  }};
}
export function createGame6PartitionRenderer(renderers={}){let previousKeys=null;function render(model,{force=false}={}){if(!model)return[];const changed=[];for(const partition of PARTITIONS){if(force||!previousKeys||previousKeys[partition]!==model.keys[partition]){renderers[partition]?.(model);changed.push(partition);}}previousKeys={...model.keys};return changed;}return Object.freeze({render,reset(){previousKeys=null;},get keys(){return previousKeys&&{...previousKeys};}});}
export const GAME6_RENDER_PARTITIONS=PARTITIONS;
