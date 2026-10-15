import assert from "node:assert/strict";
import test from "node:test";
import { ALIGNMENT, ROLE, questSize } from "./rules.mjs";
import * as engine from "./server/game-engine.mjs";

function lobby(count=5){const state=engine.createLobby({capacity:count,host:{id:"p1",name:"玩家1"}});for(let i=2;i<=count;i+=1)engine.addPlayer(state,{id:`p${i}`,name:`玩家${i}`});return state;}
function act(state,id,action,now=1000){engine.applyAction(state,id,action,{now,random:()=>0});}
function start(state){act(state,"p1",{type:"start"});for(const player of state.players)act(state,player.id,{type:"acknowledgeSecret"},1100);}
function approveQuest(state,cards=null,now=2000){const size=questSize(state.capacity,state.questIndex);const team=state.players.slice(0,size).map((p)=>p.id);act(state,state.leaderId,{type:"proposeTeam",memberIds:team},now);for(const p of state.players)act(state,p.id,{type:"submitTeamVote",approve:true},now+1);team.forEach((id,index)=>act(state,id,{type:"submitQuestCard",card:cards?.[index]||"success"},now+2));}

test("三次成功后进入刺杀并由刺杀结果决定胜负",()=>{const state=lobby();start(state);approveQuest(state,null,2000);approveQuest(state,null,3000);approveQuest(state,null,4000);assert.equal(state.phase,"assassination");const miss=state.players.find((p)=>p.id!==state.assassinId&&p.id!==state.merlinId);act(state,state.assassinId,{type:"assassinate",targetId:miss.id},5000);assert.equal(state.result.winner,ALIGNMENT.GOOD);assert.ok(engine.buildView(state,"p1").players.every((p)=>p.role));});

test("组队票结算前保密、结算后持续公开且五次否决判邪恶胜利",()=>{const state=lobby();start(state);for(let round=1;round<=5;round+=1){const team=state.players.slice(0,2).map((p)=>p.id);act(state,state.leaderId,{type:"proposeTeam",memberIds:team},2000+round);act(state,"p1",{type:"submitTeamVote",approve:false},2100+round);assert.equal(engine.buildView(state,"p2").myTeamVote,null);for(const p of state.players.slice(1))act(state,p.id,{type:"submitTeamVote",approve:false},2200+round);assert.equal(engine.buildView(state,"p2").lastTeamVoteResult.votes.p1,false);if(round<5)assert.equal(state.phase,"teamProposal");}assert.equal(state.phase,"ended");assert.equal(state.result.winner,ALIGNMENT.EVIL);});

test("逐成员视图严格区分梅林、派西维尔、邪恶与旁观者知识",()=>{const state=lobby(7);act(state,"p1",{type:"setPreset",preset:"advanced"});start(state);const merlin=state.players.find((p)=>p.role===ROLE.MERLIN),percival=state.players.find((p)=>p.role===ROLE.PERCIVAL),oberon=state.players.find((p)=>p.role===ROLE.OBERON),mordred=state.players.find((p)=>p.role===ROLE.MORDRED);const mv=engine.buildView(state,merlin.id),pv=engine.buildView(state,percival.id),watch=engine.buildSpectatorView(state);assert.ok(!mv.knownEvilIds.includes(mordred.id));if(oberon)assert.ok(!mv.knownEvilIds.includes(oberon.id));assert.ok(pv.percivalCandidates.includes(merlin.id));assert.equal(watch.selfRole,null);assert.deepEqual(watch.knownEvilIds,[]);assert.ok(watch.players.every((p)=>p.role===null));});

test("湖中仙女结果只进入查验者视图且奥伯伦显示正义",()=>{const state=lobby(10);act(state,"p1",{type:"setPreset",preset:"advanced"});act(state,"p1",{type:"setLadyEnabled",enabled:true});start(state);approveQuest(state,null,2000);approveQuest(state,null,3000);assert.equal(state.phase,"ladyInspect");const holder=state.ladyHolderId,oberon=state.players.find((p)=>p.role===ROLE.OBERON);act(state,holder,{type:"ladyInspect",targetId:oberon.id},4000);assert.equal(engine.buildView(state,holder).myLadyFinding.displayedAlignment,ALIGNMENT.GOOD);assert.equal(engine.buildView(state,state.players.find((p)=>p.id!==holder).id).myLadyFinding,null);assert.equal(engine.buildSpectatorView(state).myLadyFinding,null);});

test("序列化恢复保留秘密、绝对截止时间和演出序号",()=>{const state=lobby();start(state);const restored=engine.restoreState(engine.serializeState(state));assert.equal(restored.deadline,state.deadline);assert.deepEqual(restored.players.map((p)=>p.role),state.players.map((p)=>p.role));assert.equal(restored.presentationSequence,state.presentationSequence);});

test("人数降到七人以下时自动关闭湖中仙女",()=>{const state=engine.createLobby({capacity:7,host:{id:"p1",name:"房主"}});act(state,"p1",{type:"setLadyEnabled",enabled:true});act(state,"p1",{type:"setCapacity",capacity:6});assert.equal(state.ladyEnabled,false);});

