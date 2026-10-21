import assert from "node:assert/strict";
import test from "node:test";
import { ALIGNMENT, ROLE, questSize } from "./rules.mjs";
import * as engine from "./server/game-engine.mjs";

function lobby(count=5){const state=engine.createLobby({capacity:count,host:{id:"p1",name:"玩家1"}});for(let i=2;i<=count;i+=1)engine.addPlayer(state,{id:`p${i}`,name:`玩家${i}`});return state;}
function act(state,id,action,now=1000){engine.applyAction(state,id,action,{now,random:()=>0});}
function start(state){act(state,"p1",{type:"start"});for(const player of state.players)act(state,player.id,{type:"acknowledgeSecret"},1100);}
function drainPhase(state,phase){while(state.phase===phase)assert.equal(engine.handleTimeout(state,{now:state.deadline,random:()=>0}),true);}
function approveQuest(state,cards=null,now=2000){const size=questSize(state.capacity,state.questIndex);const team=state.players.slice(0,size).map((p)=>p.id);act(state,state.leaderId,{type:"proposeTeam",memberIds:team},now);for(const p of state.players)act(state,p.id,{type:"submitTeamVote",approve:true},now+1);team.forEach((id,index)=>act(state,id,{type:"submitQuestCard",card:cards?.[index]||"success"},now+2));drainPhase(state,"questReveal");}

test("三次成功后进入刺杀并由刺杀结果决定胜负",()=>{const state=lobby();start(state);approveQuest(state,null,2000);approveQuest(state,null,3000);approveQuest(state,null,4000);assert.equal(state.phase,"assassination");const miss=state.players.find((p)=>p.id!==state.assassinId&&p.id!==state.merlinId);act(state,state.assassinId,{type:"assassinate",targetId:miss.id},5000);assert.equal(state.phase,"assassinationReveal");assert.equal(state.result,null);drainPhase(state,"assassinationReveal");assert.equal(state.result.winner,ALIGNMENT.GOOD);assert.ok(engine.buildView(state,"p1").players.every((p)=>p.role));});

test("任务牌由服务器逐张匿名揭晓且裁决前不会提前泄露结果",()=>{
  const state=lobby();start(state);const size=questSize(state.capacity,state.questIndex),evil=state.players.find((p)=>p.role===ROLE.ASSASSIN),other=state.players.find((p)=>p.id!==evil.id),team=[evil.id,other.id].slice(0,size);
  act(state,state.leaderId,{type:"proposeTeam",memberIds:team},2000);for(const p of state.players)act(state,p.id,{type:"submitTeamVote",approve:true},2001);
  for(const id of team)act(state,id,{type:"submitQuestCard",card:id===evil.id?"fail":"success"},2002);
  assert.equal(state.phase,"questReveal");let publicView=engine.buildSpectatorView(state);assert.equal(publicView.ceremony.stage,"sealed");assert.deepEqual(publicView.ceremony.revealedCards,[]);assert.equal(publicView.ceremony.success,null);assert.equal(publicView.questResults.length,0);assert.ok(!JSON.stringify(publicView).includes('"cards"'));
  engine.handleTimeout(state,{now:state.deadline,random:()=>0});publicView=engine.buildView(state,"p1");assert.equal(publicView.ceremony.revealedCards.length,1);assert.equal(publicView.ceremony.success,null);
  while(state.pendingCeremony.stage!=="verdict")engine.handleTimeout(state,{now:state.deadline,random:()=>0});publicView=engine.buildSpectatorView(state);assert.equal(publicView.ceremony.revealedCards.length,size);assert.equal(publicView.ceremony.failCount,1);assert.equal(publicView.ceremony.success,false);assert.equal(publicView.questResults.length,0);
  const restored=engine.restoreState(engine.serializeState(state));assert.deepEqual(engine.buildSpectatorView(restored).ceremony,publicView.ceremony);
  engine.handleTimeout(state,{now:state.deadline,random:()=>0});assert.equal(state.questResults[0].failCount,1);
});

test("刺杀目标先进入中央且命中结果只在权威裁决阶段公开",()=>{
  const state=lobby();start(state);approveQuest(state,null,2000);approveQuest(state,null,3000);approveQuest(state,null,4000);const miss=state.players.find((p)=>p.id!==state.assassinId&&p.id!==state.merlinId);
  act(state,state.assassinId,{type:"assassinate",targetId:miss.id},5000);let publicView=engine.buildSpectatorView(state);assert.equal(publicView.ceremony.stage,"approach");assert.equal(publicView.ceremony.targetId,miss.id);assert.equal(publicView.ceremony.hit,null);assert.ok(publicView.players.filter((p)=>p.role).every((p)=>p.role===ROLE.ASSASSIN));
  engine.handleTimeout(state,{now:state.deadline});publicView=engine.buildSpectatorView(state);assert.equal(publicView.ceremony.stage,"strike");assert.equal(publicView.ceremony.hit,null);
  engine.handleTimeout(state,{now:state.deadline});publicView=engine.buildSpectatorView(state);assert.equal(publicView.ceremony.stage,"verdict");assert.equal(publicView.ceremony.hit,false);assert.equal(publicView.result,null);
  engine.handleTimeout(state,{now:state.deadline});assert.equal(state.phase,"ended");assert.equal(state.result.winner,ALIGNMENT.GOOD);
});

test("组队票结算前保密、结算后持续公开且五次否决判邪恶胜利",()=>{const state=lobby();start(state);for(let round=1;round<=5;round+=1){const team=state.players.slice(0,2).map((p)=>p.id);act(state,state.leaderId,{type:"proposeTeam",memberIds:team},2000+round);act(state,"p1",{type:"submitTeamVote",approve:false},2100+round);assert.equal(engine.buildView(state,"p2").myTeamVote,null);for(const p of state.players.slice(1))act(state,p.id,{type:"submitTeamVote",approve:false},2200+round);assert.equal(engine.buildView(state,"p2").lastTeamVoteResult.votes.p1,false);if(round<5)assert.equal(state.phase,"teamProposal");}assert.equal(state.phase,"ended");assert.equal(state.result.winner,ALIGNMENT.EVIL);});

test("逐成员视图严格区分梅林、派西维尔、邪恶与旁观者知识",()=>{const state=lobby(7);act(state,"p1",{type:"setPreset",preset:"advanced"});start(state);const merlin=state.players.find((p)=>p.role===ROLE.MERLIN),percival=state.players.find((p)=>p.role===ROLE.PERCIVAL),oberon=state.players.find((p)=>p.role===ROLE.OBERON),mordred=state.players.find((p)=>p.role===ROLE.MORDRED);const mv=engine.buildView(state,merlin.id),pv=engine.buildView(state,percival.id),watch=engine.buildSpectatorView(state);assert.ok(!mv.knownEvilIds.includes(mordred.id));if(oberon)assert.ok(!mv.knownEvilIds.includes(oberon.id));assert.ok(pv.percivalCandidates.includes(merlin.id));assert.equal(watch.selfRole,null);assert.deepEqual(watch.knownEvilIds,[]);assert.ok(watch.players.every((p)=>p.role===null));});

test("湖中仙女结果只进入查验者视图且奥伯伦显示正义",()=>{const state=lobby(10);act(state,"p1",{type:"setPreset",preset:"advanced"});act(state,"p1",{type:"setLadyEnabled",enabled:true});start(state);approveQuest(state,null,2000);approveQuest(state,null,3000);assert.equal(state.phase,"ladyInspect");const holder=state.ladyHolderId,oberon=state.players.find((p)=>p.role===ROLE.OBERON);act(state,holder,{type:"ladyInspect",targetId:oberon.id},4000);assert.equal(engine.buildView(state,holder).myLadyFinding.displayedAlignment,ALIGNMENT.GOOD);assert.equal(engine.buildView(state,state.players.find((p)=>p.id!==holder).id).myLadyFinding,null);assert.equal(engine.buildSpectatorView(state).myLadyFinding,null);});

test("序列化恢复保留秘密、绝对截止时间和演出序号",()=>{const state=lobby();start(state);const restored=engine.restoreState(engine.serializeState(state));assert.equal(restored.deadline,state.deadline);assert.deepEqual(restored.players.map((p)=>p.role),state.players.map((p)=>p.role));assert.equal(restored.presentationSequence,state.presentationSequence);});

test("人数降到七人以下时自动关闭湖中仙女",()=>{const state=engine.createLobby({capacity:7,host:{id:"p1",name:"房主"}});act(state,"p1",{type:"setLadyEnabled",enabled:true});act(state,"p1",{type:"setCapacity",capacity:6});assert.equal(state.ladyEnabled,false);});

test("只有房主能中止密议并清除全部秘密状态返回大厅",()=>{
  const state=lobby();start(state);
  const team=state.players.slice(0,questSize(state.capacity,state.questIndex)).map((player)=>player.id);
  act(state,state.leaderId,{type:"proposeTeam",memberIds:team},2000);
  act(state,"p1",{type:"submitTeamVote",approve:true},2100);
  assert.equal(engine.buildView(state,"p1").permissions.canEnd,true);
  assert.equal(engine.buildView(state,"p2").permissions.canEnd,false);
  assert.throws(()=>act(state,"p2",{type:"end"},2200),/只有房主/);

  act(state,"p1",{type:"end"},2300);
  assert.equal(state.phase,"lobby");
  assert.equal(state.deadline,0);
  assert.equal(state.questIndex,0);
  assert.equal(state.leaderId,null);
  assert.deepEqual(state.proposedTeam,[]);
  assert.deepEqual(state.teamVotes,{});
  assert.deepEqual(state.questCards,{});
  assert.deepEqual(state.questResults,[]);
  assert.deepEqual(state.ladyFindings,[]);
  assert.equal(state.assassinId,null);
  assert.equal(state.merlinId,null);
  assert.equal(state.result,null);
  assert.equal(state.presentationEvents.length,0);
  assert.ok(state.players.every((player)=>player.role===null&&!player.secretAcknowledged));
  const hostView=engine.buildView(state,"p1"),spectatorView=engine.buildSpectatorView(state);
  assert.equal(hostView.permissions.canEnd,false);
  assert.equal(hostView.permissions.canStart,true);
  assert.equal(hostView.selfRole,null);
  assert.equal(spectatorView.selfRole,null);
});

test("房主可在开局前选择预设或自定义节奏且开局后锁定",()=>{
  const state=lobby();
  act(state,"p1",{type:"setPace",paceMode:"quick"});
  assert.equal(state.timers.teamProposal,120);
  const custom={secretReveal:50,teamProposal:420,teamVote:55,questAction:50,ladyInspect:75,assassination:240};
  act(state,"p1",{type:"setPace",paceMode:"custom",timers:custom});
  assert.deepEqual(state.timers,custom);
  act(state,"p1",{type:"start"},5000);
  assert.equal(state.deadline,55000);
  assert.equal(state.deadlineDurationSeconds,50);
  assert.throws(()=>act(state,"p1",{type:"setPace",paceMode:"standard"},5100),/只能在准备阶段/);
  assert.throws(()=>act(lobby(),"p2",{type:"setPace",paceMode:"quick"}),/只有房主/);
});

test("组队最后30秒可发起一次延长表决，严格多数通过后增加60秒",()=>{
  const state=lobby();start(state);
  const requestAt=state.deadline-25000;
  act(state,"p2",{type:"requestDiscussionExtension"},requestAt);
  assert.equal(state.proposalExtension.requested,true);
  assert.equal(state.proposalExtension.votes.p2,true);
  assert.equal(state.deadline,requestAt+20000);
  act(state,"p3",{type:"voteDiscussionExtension",approve:true},requestAt+1000);
  act(state,"p4",{type:"voteDiscussionExtension",approve:true},requestAt+2000);
  assert.equal(state.proposalExtension.requested,false);
  assert.equal(state.proposalExtension.granted,true);
  assert.equal(state.deadline,requestAt+62000);
  assert.equal(engine.buildView(state,"p1").permissions.canRequestExtension,false);
  assert.throws(()=>act(state,"p1",{type:"requestDiscussionExtension"},state.deadline-1000),/已经使用过/);
});

test("延时申请过早会拒绝，表决超时则回到原组队倒计时并保留至少5秒",()=>{
  const state=lobby();start(state);
  assert.throws(()=>act(state,"p2",{type:"requestDiscussionExtension"},state.deadline-31000),/最后30秒/);
  const requestAt=state.deadline-20000;
  act(state,"p2",{type:"requestDiscussionExtension"},requestAt);
  const voteDeadline=state.deadline;
  assert.equal(engine.handleTimeout(state,{now:voteDeadline,random:()=>0}),true);
  assert.equal(state.phase,"teamProposal");
  assert.equal(state.proposalExtension.granted,false);
  assert.ok(state.deadline>=voteDeadline+5000);
});

test("旧存档缺少节奏字段时恢复为标准节奏",()=>{
  const state=lobby();start(state);
  const serialized=engine.serializeState(state);
  delete serialized.paceMode;delete serialized.timers;delete serialized.deadlineDurationSeconds;delete serialized.proposalExtension;
  const restored=engine.restoreState(serialized);
  assert.equal(restored.paceMode,"standard");
  assert.equal(restored.timers.teamProposal,180);
  assert.equal(restored.deadlineDurationSeconds,180);
});

