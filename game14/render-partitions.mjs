"use strict";

const PARTITIONS=Object.freeze(["room","status","supply","players","decision","hand","reveal","log","countdown"]);
const key=(value)=>JSON.stringify(value);

export function createGame14RenderModel(view,{memberRole=view?.roomRole,roomCode="",selectedCardId=null}={}){
  if(!view)return null;
  const players=Array.isArray(view.players)?view.players:[];
  const hand=Array.isArray(view.hand)?view.hand:[];
  const permissions=view.permissions||{};
  const current=players.find((player)=>player.id===view.currentPlayerId)||null;
  const winner=players.find((player)=>player.id===view.winnerId)||null;
  const selectedCard=hand.find((card)=>card.id===selectedCardId)||null;
  return{view,memberRole,roomCode,current,winner,selectedCard,selectedCardId:selectedCard?.id||null,keys:{
    room:key([roomCode,view.phase,view.capacity,players.length,
      view.phase==="lobby"?players.map((player)=>[player.id,player.connected]):null,
      permissions.canManage,permissions.canStart,permissions.canRestart,permissions.canEnd,permissions.canSetCapacity]),
    status:key([memberRole,view.phase,view.currentPlayerId,current?.name||"",view.winnerId,winner?.name||"",players.length,view.capacity]),
    supply:key([view.deckCount,view.discardCount,view.discardTop]),
    players:key([view.selfId,view.phase,view.currentPlayerId,permissions.canKick,
      selectedCard?.legalTargets||[],players.map((player)=>[player.id,player.name,player.isHost,player.connected,player.handCount,player.pigs])]),
    decision:key([memberRole,view.phase,view.currentPlayerId,current?.name||"",view.winnerId,winner?.name||"",
      permissions.canAct,permissions.canExchange,selectedCard]),
    hand:key([view.phase,permissions.canAct,selectedCard?.id||null,hand]),
    reveal:key(view.revealedExchange),
    log:key(view.logs||[]),
    countdown:key([view.deadline||0])
  }};
}

export function createGame14PartitionRenderer(renderers={}){
  let previousKeys=null;
  function render(model,{force=false}={}){
    if(!model)return[];
    const changed=[];
    for(const partition of PARTITIONS){
      if(force||!previousKeys||previousKeys[partition]!==model.keys[partition]){
        renderers[partition]?.(model);changed.push(partition);
      }
    }
    previousKeys={...model.keys};
    return changed;
  }
  return Object.freeze({render,reset(){previousKeys=null;},get keys(){return previousKeys&&{...previousKeys};}});
}

export const GAME14_RENDER_PARTITIONS=PARTITIONS;
