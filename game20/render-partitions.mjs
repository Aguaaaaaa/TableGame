"use strict";

const PARTITIONS=Object.freeze(["room","status","players","focus","secret","decision","log","countdown"]);
const key=(value)=>JSON.stringify(value);

export function createGame20RenderModel(view,{memberRole=view?.roomRole,roomCode="",selectingGuesser=false}={}){
  if(!view)return null;
  const players=Array.isArray(view.players)?view.players:[];
  const permissions=view.permissions||{};
  const decisionPermissions={
    canAcknowledgeSecret:permissions.canAcknowledgeSecret,canShowMasterAnswer:permissions.canShowMasterAnswer,
    canMarkCorrectGuesser:permissions.canMarkCorrectGuesser,canReadyToVote:permissions.canReadyToVote,
    canFirstVote:permissions.canFirstVote,canSecondVote:permissions.canSecondVote,canResolveTie:permissions.canResolveTie
  };
  const targetMode=selectingGuesser&&permissions.canMarkCorrectGuesser?"guesser":permissions.canSecondVote?"secondVote":permissions.canResolveTie?"tieBreak":null;
  return{view,memberRole,roomCode,selectingGuesser:Boolean(selectingGuesser),targetMode,keys:{
    room:key([roomCode,view.phase,view.capacity,players.length,
      permissions.canStart||permissions.canNextRound?players.map((player)=>[player.id,player.connected]):null,
      permissions.canManage,permissions.canStart,permissions.canNextRound,permissions.canEnd,permissions.canSetCapacity]),
    status:key([memberRole,view.phase,view.round,view.stats,view.masterId,players.length,view.capacity,
      players.map((player)=>[player.id,player.name])]),
    players:key([view.selfId,view.phase,view.masterId,view.guessedById,targetMode,permissions.canManage,
      view.readyIds||[],view.submittedFirstVoteIds||[],view.submittedSecondVoteIds||[],view.tieCandidates||[],
      players.map((player)=>[player.id,player.name,player.isHost,player.connected,player.isMaster,player.isGuesser,player.role])]),
    focus:key([view.phase,view.answerHistory||[],view.secretConfirmedCount,view.guessedById,
      view.submittedFirstVoteIds||[],view.submittedSecondVoteIds||[],view.firstVoteResult,view.secondVoteResult,
      view.tieCandidates||[],view.result,players.map((player)=>[player.id,player.name])]),
    secret:key([memberRole,view.phase,view.privateRole,view.secretWord]),
    decision:key([memberRole,view.phase,view.privateRole,view.masterId,view.guessedById,view.myFirstVote,view.mySecondVote,
      view.tieCandidates||[],view.result,decisionPermissions,Boolean(selectingGuesser),players.map((player)=>[player.id,player.name])]),
    log:key(view.logs||[]),
    countdown:key([view.phase,view.deadline||0,view.phase==="discussion"?view.guessElapsedMs||0:0])
  }};
}

export function createGame20PartitionRenderer(renderers={}){
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

export const GAME20_RENDER_PARTITIONS=PARTITIONS;
