"use strict";

const PARTITIONS=Object.freeze(["room","status","network","players","focus","secret","decision","locations","scoreboard","log","countdown"]);
const key=(value)=>JSON.stringify(value);

export function createGame21RenderModel(view,{memberRole=view?.roomRole,roomCode="",selectionMode=null,spyLocationDraft=""}={}){
  if(!view)return null;
  const players=Array.isArray(view.players)?view.players:[];
  const permissions=view.permissions||{};
  const legalSelection=selectionMode==="question"?permissions.canSelectQuestionTarget
    :selectionMode==="accuse"?permissions.canAccuse
      :selectionMode==="nominate"?permissions.canNominate:false;
  const activeSelection=legalSelection?selectionMode:null;
  const decisionPermissions={
    canAcknowledgeSecret:permissions.canAcknowledgeSecret,canSelectQuestionTarget:permissions.canSelectQuestionTarget,
    canCompleteAnswer:permissions.canCompleteAnswer,canAccuse:permissions.canAccuse,canVoteAccusation:permissions.canVoteAccusation,
    canSpyGuess:permissions.canSpyGuess,canNominate:permissions.canNominate,canVoteTimeout:permissions.canVoteTimeout
  };
  const accusationProgress=!permissions.canVoteAccusation&&view.myAccusationVote!=null?(view.submittedAccusationVoteIds||[]).length:null;
  const timeoutProgress=!permissions.canVoteTimeout&&view.myTimeoutVote!=null?(view.submittedTimeoutVoteIds||[]).length:null;
  return{view,memberRole,roomCode,selectionMode,activeSelection,spyLocationDraft,keys:{
    room:key([roomCode,view.phase,view.capacity,players.length,
      permissions.canStart||permissions.canNextRound?players.map((player)=>[player.id,player.connected]):null,
      permissions.canManage,permissions.canStart,permissions.canNextRound,permissions.canEnd,permissions.canSetCapacity]),
    status:key([memberRole,view.phase,view.round,view.matchRounds,view.dealerId,players.length,view.capacity,
      players.map((player)=>[player.id,player.name])]),
    network:key([players.map((player)=>player.id),view.questionerId,view.questionTargetId,view.currentNominatorId]),
    players:key([view.selfId,view.phase,view.questionerId,view.questionTargetId,view.currentNominatorId,activeSelection,
      view.accusation,view.nomination,view.submittedAccusationVoteIds||[],view.submittedTimeoutVoteIds||[],permissions.canManage,
      players.map((player)=>[player.id,player.name,player.isHost,player.connected,player.score,player.accusationUsed,player.role,player.locationRole])]),
    focus:key([view.phase,view.secretConfirmedCount,view.questionerId,view.questionTargetId,view.accusation,
      view.submittedAccusationVoteIds||[],view.currentNominatorId,view.nominationIndex,view.nominationCount,view.nomination,
      view.submittedTimeoutVoteIds||[],view.result,players.map((player)=>[player.id,player.name])]),
    secret:key([memberRole,view.phase,view.privateRole,view.privateLocation,view.privateLocationRole,view.result]),
    decision:key([memberRole,view.phase,view.privateRole,view.questionerId,view.questionTargetId,view.blockedTargetId,
      view.accusation,view.myAccusationVote,accusationProgress,view.currentNominatorId,view.nominationIndex,view.nominationCount,
      view.nomination,view.myTimeoutVote,timeoutProgress,view.secretConfirmedCount,view.result,view.matchComplete,
      decisionPermissions,selectionMode,players.map((player)=>[player.id,player.name])]),
    locations:key(view.locations||[]),
    scoreboard:key(players.map((player)=>[player.id,player.name,player.score])),
    log:key(view.logs||[]),
    countdown:key([view.phase,view.deadline||0])
  }};
}

export function createGame21PartitionRenderer(renderers={}){
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

export const GAME21_RENDER_PARTITIONS=PARTITIONS;
