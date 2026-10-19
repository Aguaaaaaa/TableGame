"use strict";

const PARTITIONS=Object.freeze(["room","status","players","discard","decision","hand","log","countdown"]);
const key=(value)=>JSON.stringify(value);

export function createGame18RenderModel(view,{memberRole=view?.roomRole,roomCode="",selectedCardId=null}={}){
  if(!view)return null;
  const players=Array.isArray(view.players)?view.players:[];
  const permissions=view.permissions||{};
  const self=players.find((player)=>player.id===view.selfId)||null;
  const current=players.find((player)=>player.id===view.currentPlayerId)||null;
  const selectedCard=self?.hand?.find((card)=>card.id===selectedCardId)||null;
  const decisionPermissions={
    canSubmitCase:permissions.canSubmitCase,canPlayCard:permissions.canPlayCard,
    canChooseTarget:permissions.canChooseTarget,canSubmitTrade:permissions.canSubmitTrade,
    canSubmitPass:permissions.canSubmitPass,canChooseDogSlot:permissions.canChooseDogSlot,
    canAcknowledge:permissions.canAcknowledge
  };
  return{view,memberRole,roomCode,self,current,selectedCardId:selectedCard?.id||null,keys:{
    room:key([roomCode,view.phase,view.capacity,view.targetScore,players.length,
      permissions.canStart||permissions.canRestart?players.map((player)=>[player.id,player.connected]):null,
      permissions.canManage,permissions.canStart,permissions.canRestart,permissions.canEnd,
      permissions.canSetCapacity,permissions.canSetTargetScore]),
    status:key([memberRole,view.phase,view.round,view.targetScore,view.caseText,view.currentPlayerId,current?.name||"",players.length,view.capacity]),
    players:key([memberRole,view.selfId,view.phase,view.currentPlayerId,view.targetScore,permissions.canKick,
      permissions.canChooseTarget,view.pending?.type==="chooseTarget"?view.pending:null,
      players.map((player)=>[player.id,player.name,player.isHost,player.connected,player.score,player.accomplice,player.hand])]),
    discard:key([view.discard,players.map((player)=>[player.id,player.name])]),
    decision:key([memberRole,view.phase,view.round,view.currentPlayerId,view.pending,view.privateInsight,view.roundResult,view.winnerIds,
      decisionPermissions,selectedCard?.id||null,players.map((player)=>[player.id,player.name,player.score,player.handCount])]),
    hand:key([memberRole,view.selfId,self?.hand||[],decisionPermissions.canPlayCard,decisionPermissions.canSubmitTrade,
      decisionPermissions.canSubmitPass,selectedCard?.id||null]),
    log:key(view.logs||[]),
    countdown:key([view.phase,view.deadline||0])
  }};
}

export function createGame18PartitionRenderer(renderers={}){
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

export const GAME18_RENDER_PARTITIONS=PARTITIONS;
