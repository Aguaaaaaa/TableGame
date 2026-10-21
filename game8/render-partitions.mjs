"use strict";

const PARTITIONS=Object.freeze(["room","players","supply","markets","trainer","decision","inspector","log"]);
const key=(value)=>JSON.stringify(value);

function playerPublicFacts(gamePlayer){
  if(!gamePlayer)return null;
  return [gamePlayer.tokens,gamePlayer.board,gamePlayer.buried,gamePlayer.reserve,gamePlayer.assoc,gamePlayer.megaToken];
}

export function createGame8RenderModel(view,{memberRole=view?.roomRole,roomCode="",selection=[],selectedCardId=null,inspectedPlayerId=null}={}){
  if(!view)return null;
  const players=Array.isArray(view.players)?view.players:[];
  const permissions=view.permissions||{};
  const game=view.game||null;
  const seat=players.findIndex((player)=>player.id===(view.selfId??view.viewerId));
  const isSpectator=memberRole==="spectator";
  const me=game&&seat>=0?game.players?.[seat]||null:null;
  const myTurn=Boolean(game&&!isSpectator&&view.phase==="playing"&&game.turn===seat);
  const marketSelected=Boolean(selectedCardId&&game&&Object.values(game.field||{}).some((row)=>Array.isArray(row)&&row.includes(selectedCardId)))?selectedCardId:null;
  const trainerSelected=Boolean(selectedCardId&&me?.reserve?.includes(selectedCardId))?selectedCardId:null;
  const decisionFacts=!game?null:myTurn?
    [game.acted,game.evolvedThisTurn,game.supply,game.field,game.lastRound,game.round,game.winner,playerPublicFacts(me),selection]
    :[game.turn,game.round,game.lastRound,game.winner,game.players?.[game.turn]?.name||""];
  const inspectorIndex=players.findIndex((player)=>player.id===inspectedPlayerId);
  return {view,memberRole,roomCode,selection:[...selection],selectedCardId,inspectedPlayerId,seat,isSpectator,me,myTurn,keys:{
    room:key([roomCode,view.phase,view.capacity,players.length,permissions.canManage,permissions.canKick,
      permissions.canStart,permissions.canEnd,permissions.canRestart,
      permissions.canStart?players.map((player)=>[player.id,player.connected]):null]),
    players:key([memberRole,view.phase,view.selfId,view.viewerId,permissions.canKick,game?.turn,
      players.map((player,index)=>[player.id,player.name,player.isHost,player.connected,playerPublicFacts(game?.players?.[index])])]),
    supply:key([memberRole,view.phase,myTurn,game?.acted,game?.supply,selection]),
    markets:key([memberRole,view.phase,game?.decks,game?.field,marketSelected]),
    trainer:key([memberRole,view.phase,seat,playerPublicFacts(me),trainerSelected]),
    decision:key([memberRole,view.phase,view.capacity,players.length,permissions.canStart,decisionFacts,
      players.map((player)=>[player.id,player.name])]),
    inspector:key(inspectedPlayerId?[inspectedPlayerId,view.phase,game?.turn,inspectorIndex,
      inspectorIndex>=0?[players[inspectorIndex]?.name,players[inspectorIndex]?.connected,playerPublicFacts(game?.players?.[inspectorIndex])]:null]:[null]),
    log:key(game?.log||null)
  }};
}

export function createGame8PartitionRenderer(renderers={}){
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

export const GAME8_RENDER_PARTITIONS=PARTITIONS;
