"use strict";

const PARTITIONS=Object.freeze(["room","status","wallet","players","market","board","dice","decision","log","countdown"]);
const key=(value)=>JSON.stringify(value);

function actionFacts(view,memberRole){
  const permissions=view.permissions||{};
  const common=[memberRole,view.phase,view.activePlayerId,view.selfId,view.highBid,view.placementRound,view.rollStage,
    permissions.canAuction,permissions.canConfigure,permissions.canPlace,permissions.canStartDice,permissions.canStopDice,
    permissions.canOrder,permissions.canPilot,permissions.canPirate,permissions.canPlunder];
  if(memberRole==="spectator")return common;
  if(view.phase==="lobby")return[...common,view.capacity,view.players?.length||0];
  if(view.phase==="configure")return[...common,view.stock,view.market];
  if(["arrivalOrder","yardOrder"].includes(view.phase))return[...common,view.pending,(view.ships||[]).map((ship)=>[ship.good,ship.arrived])];
  if(view.phase==="pilot")return[...common,view.pending,(view.placements||[]).filter((item)=>item.type==="pilot"),(view.ships||[]).map((ship)=>[ship.good,ship.arrived])];
  if(["pirateBoard","plunder"].includes(view.phase))return[...common,view.pending,(view.ships||[]).map((ship)=>ship.good)];
  if(view.phase==="ended")return[...common,view.winnerIds,(view.players||[]).map((player)=>[player.id,player.name])];
  return common;
}

export function createGame7RenderModel(view,{memberRole=view?.roomRole,roomCode="",draftKey=""}={}){
  if(!view)return null;
  const players=Array.isArray(view.players)?view.players:[];
  const permissions=view.permissions||{};
  const self=players.find((player)=>player.id===view.selfId)||null;
  const diceShips=(view.rollingShipIds||[]).map((index)=>{const ship=view.ships?.[index];return[index,ship?.good||null,ship?.die||0];});
  return{view,memberRole,roomCode,draftKey,self,keys:{
    room:key([roomCode,view.capacity,players.length,permissions.canManage,permissions.canSetCapacity,permissions.canStart,permissions.canEnd]),
    status:key([view.voyage,view.phase]),
    wallet:key([memberRole,view.selfId,self?.cash,self?.shares,permissions.canMortgage,permissions.canRedeem]),
    players:key([view.activePlayerId,permissions.canManage,players.map((player)=>[player.id,player.name,player.isHost,player.connected,player.color,player.cash,player.assistants,player.shares])]),
    market:key([view.market,view.stock]),
    board:key([view.voyage,view.phase,view.rollStage,view.ships,view.placements,view.port,view.yard,permissions.canPlace,permissions.placementOptions,
      players.map((player)=>[player.id,player.name,player.color])]),
    dice:key([view.phase,view.rollStage,view.rollId,view.rollStartedAt,view.stopRequestedAt,view.settleAt,view.diceAnimationSeed,
      view.rollingShipIds,diceShips,view.pending?.round,permissions.canStartDice,permissions.canStopDice]),
    decision:key([draftKey,actionFacts(view,memberRole)]),
    log:key(view.logs||[]),
    countdown:key([view.phase,view.deadline||0])
  }};
}

export function createGame7PartitionRenderer(renderers={}){
  let previousKeys=null;
  function render(model,{force=false}={}){
    if(!model)return[];
    const changed=[];
    for(const partition of PARTITIONS){
      if(force||!previousKeys||previousKeys[partition]!==model.keys[partition]){
        renderers[partition]?.(model);
        changed.push(partition);
      }
    }
    previousKeys={...model.keys};
    return changed;
  }
  return Object.freeze({render,reset(){previousKeys=null;},get keys(){return previousKeys&&{...previousKeys};}});
}

export const GAME7_RENDER_PARTITIONS=PARTITIONS;
