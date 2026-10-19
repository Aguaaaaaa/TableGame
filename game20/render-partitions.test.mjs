import assert from "node:assert/strict";
import test from "node:test";
import {createGame20PartitionRenderer,createGame20RenderModel} from "./render-partitions.mjs";

const clone=(value)=>structuredClone(value);
const player=(id,overrides={})=>({id,name:id,isHost:id==="p1",connected:true,isMaster:id==="p1",isGuesser:false,role:null,...overrides});
function baseView(){return{selfId:"p2",roomRole:"player",phase:"firstVote",capacity:5,round:1,deadline:5000,masterId:"p1",guessedById:"p3",guessElapsedMs:80000,
  privateRole:"common",secretWord:null,secretConfirmedCount:2,answerHistory:[{answer:"yes"}],readyIds:[],submittedFirstVoteIds:["p4"],submittedSecondVoteIds:[],myFirstVote:null,mySecondVote:null,
  firstVoteResult:null,secondVoteResult:null,tieCandidates:[],result:null,stats:{commonWins:0,insiderWins:0,failedRounds:0},logs:[],presentationEvents:[],players:[player("p1"),player("p2"),player("p3"),player("p4")],
  permissions:{canManage:false,canStart:false,canNextRound:false,canEnd:false,canSetCapacity:false,canAcknowledgeSecret:false,canShowMasterAnswer:false,canMarkCorrectGuesser:false,canReadyToVote:false,canFirstVote:true,canSecondVote:false,canResolveTie:false}};}
function harness(){const calls=[],nodes={players:null,focus:null,secret:null,decision:null};let sequence=0;const renderer=createGame20PartitionRenderer(Object.fromEntries(
  ["room","status","players","focus","secret","decision","log","countdown"].map((name)=>[name,()=>{calls.push(name);if(name in nodes)nodes[name]={id:++sequence};}])));
  return{calls,nodes,draw(view,options={}){return renderer.render(createGame20RenderModel(view,{memberRole:view.roomRole,roomCode:"WORD",...options}));},clear(){calls.length=0;}};}

test("旁观者和演出广播不替换秘密投票按钮",()=>{const h=harness(),view=baseView();h.draw(view);const saved={...h.nodes};h.clear();const next=clone(view);next.spectators=[{id:"s1"}];next.presentationEvents=[{id:1}];assert.deepEqual(h.draw(next),[]);assert.deepEqual(h.nodes,saved);});
test("其他玩家掉线只更新对应玩家席",()=>{const h=harness(),view=baseView();h.draw(view);const decision=h.nodes.decision;h.clear();const next=clone(view);next.players[3].connected=false;assert.deepEqual(h.draw(next),["players"]);assert.strictEqual(h.nodes.decision,decision);});
test("其他玩家提交第一轮投票只更新徽章和公开进度",()=>{const h=harness(),view=baseView();h.draw(view);const decision=h.nodes.decision;h.clear();const next=clone(view);next.submittedFirstVoteIds.push("p1");assert.deepEqual(h.draw(next),["players","focus"]);assert.strictEqual(h.nodes.decision,decision);});
test("主持人的新回答只更新中央问答焦点",()=>{const h=harness(),view=baseView();view.phase="questioning";view.selfId="p1";view.permissions.canFirstVote=false;view.permissions.canShowMasterAnswer=true;view.permissions.canMarkCorrectGuesser=true;h.draw(view);const decision=h.nodes.decision;h.clear();const next=clone(view);next.answerHistory.unshift({answer:"no"});assert.deepEqual(h.draw(next),["focus"]);assert.strictEqual(h.nodes.decision,decision);});
test("主持人本地选择猜中者只联动玩家席和决策区",()=>{const h=harness(),view=baseView();view.phase="questioning";view.selfId="p1";view.permissions.canFirstVote=false;view.permissions.canShowMasterAnswer=true;view.permissions.canMarkCorrectGuesser=true;h.draw(view);h.clear();assert.deepEqual(h.draw(view,{selectingGuesser:true}),["players","decision"]);});
test("日志与倒计时不会替换当前投票选择",()=>{const h=harness(),view=baseView();h.draw(view);const decision=h.nodes.decision;h.clear();const next=clone(view);next.logs.push({text:"已封存一票"});assert.deepEqual(h.draw(next),["log"]);h.clear();next.deadline=9000;assert.deepEqual(h.draw(next),["countdown"]);assert.strictEqual(h.nodes.decision,decision);});
test("本人提交后权限和私人投票事实共同替换决策区",()=>{const h=harness(),view=baseView();h.draw(view);h.clear();const next=clone(view);next.permissions.canFirstVote=false;next.myFirstVote=true;next.submittedFirstVoteIds.push("p2");assert.deepEqual(h.draw(next),["players","focus","decision"]);});
