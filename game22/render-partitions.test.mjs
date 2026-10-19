import assert from "node:assert/strict";
import test from "node:test";
import {createGame22PartitionRenderer,createGame22RenderModel} from "./render-partitions.mjs";

const clone=(value)=>structuredClone(value);
const player=(id,overrides={})=>({id,name:id,isHost:id==="p1",connected:true,role:null,secretAcknowledged:true,...overrides});
function baseView(){return{
  selfId:"p1",phase:"teamVote",capacity:5,preset:"classic",ladyEnabled:false,paceMode:"standard",timers:{},deadline:5000,deadlineDurationSeconds:45,matchNumber:1,
  questIndex:0,leaderId:"p2",proposalNumber:1,proposedTeam:["p1","p2"],teamVoteProgress:[],lastTeamVoteResult:null,questProgress:[],questResults:[],goodQuests:0,evilQuests:0,
  requiredTeamSize:2,requiredFails:1,ladyHolderId:null,ladyHistory:[],assassinId:null,knownEvilIds:[],percivalCandidates:[],selfRole:"loyal",myTeamVote:null,myQuestCard:null,myLadyFinding:null,
  proposalExtension:{requested:false,used:false,granted:false,voteProgress:[],yes:0,no:0,required:3},result:null,stats:{},logs:[],presentationEvents:[],
  players:[player("p1"),player("p2"),player("p3"),player("p4"),player("p5")],
  permissions:{canManage:true,canConfigure:false,canStart:false,canAcknowledge:false,canPropose:false,canRequestExtension:false,canVoteExtension:false,canTeamVote:true,canQuest:false,canFailQuest:false,canUseLady:false,ladyTargetIds:[],canAssassinate:false,canNextMatch:false,canEnd:true}
};}
function harness(){const calls=[],nodes={players:null,decision:null,quests:null,secret:null};let sequence=0;const renderer=createGame22PartitionRenderer(Object.fromEntries(
  ["room","status","quests","players","focus","secret","decision","log","countdown"].map((name)=>[name,()=>{calls.push(name);if(name in nodes)nodes[name]={id:++sequence};}])));
  return{calls,nodes,draw(view,teamDraft=[]){return renderer.render(createGame22RenderModel(view,{memberRole:"player",roomCode:"AVAL",teamDraft}));},clear(){calls.length=0;}};}

test("旁观者与演出广播不替换投票决策或地图锚点",()=>{const h=harness(),view=baseView();h.draw(view);const saved={...h.nodes};h.clear();const next=clone(view);next.spectators=[{id:"s1"}];next.presentationEvents=[{id:"e1"}];assert.deepEqual(h.draw(next),[]);assert.deepEqual(h.nodes,saved);});
test("玩家掉线只更新稳定玩家席",()=>{const h=harness(),view=baseView();h.draw(view);const decision=h.nodes.decision,quests=h.nodes.quests;h.clear();const next=clone(view);next.players[2].connected=false;assert.deepEqual(h.draw(next),["players"]);assert.strictEqual(h.nodes.decision,decision);assert.strictEqual(h.nodes.quests,quests);});
test("其他玩家投票只更新玩家标记与桌面进度",()=>{const h=harness(),view=baseView();h.draw(view);const decision=h.nodes.decision;h.clear();const next=clone(view);next.teamVoteProgress.push("p3");assert.deepEqual(h.draw(next),["players","focus"]);assert.strictEqual(h.nodes.decision,decision);});
test("本地组队草稿只更新玩家选择与个人决策",()=>{const h=harness(),view=baseView();view.phase="teamProposal";view.leaderId="p1";view.permissions.canTeamVote=false;view.permissions.canPropose=true;h.draw(view);const quests=h.nodes.quests;h.clear();assert.deepEqual(h.draw(view,["p1"]),["players","decision"]);assert.strictEqual(h.nodes.quests,quests);});
test("日志与倒计时独立于当前操作按钮和本地组队草稿",()=>{const h=harness(),view=baseView();view.phase="teamProposal";view.leaderId="p1";view.permissions.canTeamVote=false;view.permissions.canPropose=true;h.draw(view,["p1"]);const decision=h.nodes.decision;h.clear();const next=clone(view);next.logs.push({text:"圆桌仍在讨论"});assert.deepEqual(h.draw(next,["p1"]),["log"]);h.clear();next.deadline=9000;assert.deepEqual(h.draw(next,["p1"]),["countdown"]);assert.strictEqual(h.nodes.decision,decision);});
test("其他任务牌与延时表决只推进公共状态",()=>{const h=harness(),quest=baseView();quest.phase="questAction";quest.permissions.canTeamVote=false;quest.permissions.canQuest=true;h.draw(quest);const questDecision=h.nodes.decision;h.clear();const nextQuest=clone(quest);nextQuest.questProgress.push("p2");assert.deepEqual(h.draw(nextQuest),["players","focus"]);assert.strictEqual(h.nodes.decision,questDecision);const extension=baseView();extension.phase="teamProposal";extension.permissions.canTeamVote=false;extension.permissions.canVoteExtension=true;extension.proposalExtension.requested=true;h.draw(extension);const extensionDecision=h.nodes.decision;h.clear();extension.proposalExtension.voteProgress.push("p3");extension.proposalExtension.yes=1;assert.deepEqual(h.draw(extension),["focus"]);assert.strictEqual(h.nodes.decision,extensionDecision);});
test("任务轨迹改变不会重建仍在使用的投票区",()=>{const h=harness(),view=baseView();h.draw(view);const decision=h.nodes.decision;h.clear();const next=clone(view);next.questResults.push({success:true});assert.deepEqual(h.draw(next),["quests"]);assert.strictEqual(h.nodes.decision,decision);});
test("湖中仙女私密结果只更新私密情报",()=>{const h=harness(),view=baseView();h.draw(view);h.clear();const next=clone(view);next.myLadyFinding={targetId:"p3",displayedAlignment:"evil"};assert.deepEqual(h.draw(next),["secret"]);});
test("进入新的权威阶段才替换旧决策区",()=>{const h=harness(),view=baseView();h.draw(view);h.clear();const next=clone(view);next.phase="questAction";next.permissions.canTeamVote=false;next.permissions.canQuest=true;assert.ok(h.draw(next).includes("decision"));assert.notStrictEqual(h.nodes.decision,null);});

