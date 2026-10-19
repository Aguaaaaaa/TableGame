import assert from "node:assert/strict";
import test from "node:test";
import {createGame13PartitionRenderer,createGame13RenderModel} from "./render-partitions.mjs";

const clone=(value)=>structuredClone(value);
const slot=(slotId,overrides={})=>({slotId,faceUp:false,value:null,temporary:false,...overrides});
const player=(id,overrides={})=>({id,name:id,isHost:id==="p1",connected:true,score:0,resetUsed:false,slots:[slot(`${id}-1`),slot(`${id}-2`),slot(`${id}-3`),slot(`${id}-4`)],...overrides});
function baseView(){return{selfId:"p1",roomRole:"player",phase:"drawn",capacity:2,round:1,currentPlayerId:"p1",winnerIds:[],
  deckCount:40,discardCount:1,discardTop:{value:5,power:null},pendingCard:{source:"deck",value:9,power:"spy"},deadline:5000,cabo:null,
  privateReveal:null,targetNotice:null,roundResult:[],logs:[],presentationEvents:[],players:[player("p1"),player("p2")],
  permissions:{canManage:true,canKick:true,canSetCapacity:false,canStart:false,canEnd:true,canInitialPeek:false,canDraw:false,canCallCabo:false,canExchange:true,canDiscard:true,canUsePower:true,canPlaceFailedExchange:false,canCloseReveal:false}};}
function harness(){const calls=[],nodes={players:null,decision:null};let sequence=0;const renderer=createGame13PartitionRenderer(Object.fromEntries(
  ["room","status","table","players","targetNotice","score","decision","result","log","countdown"].map((name)=>[name,()=>{calls.push(name);if(name in nodes)nodes[name]={id:++sequence};}])));
  return{calls,nodes,draw(view,selected=[]){return renderer.render(createGame13RenderModel(view,{memberRole:view.roomRole,roomCode:"CABO",selected}));},clear(){calls.length=0;}};}

test("旁观者加入和演出广播不替换牌位或当前决策",()=>{const h=harness(),view=baseView();h.draw(view);const saved={...h.nodes};h.clear();const next=clone(view);next.spectators=[{id:"s1"}];next.presentationEvents=[{id:1}];assert.deepEqual(h.draw(next),[]);assert.deepEqual(h.nodes,saved);});
test("玩家掉线只更新稳定玩家分区",()=>{const h=harness(),view=baseView();h.draw(view);const decision=h.nodes.decision;h.clear();const next=clone(view);next.players[1].connected=false;assert.deepEqual(h.draw(next),["players"]);assert.strictEqual(h.nodes.decision,decision);});
test("日志和倒计时不会重建抽牌决策",()=>{const h=harness(),view=baseView();h.draw(view);const decision=h.nodes.decision;h.clear();const next=clone(view);next.logs.push({text:"记录"});assert.deepEqual(h.draw(next),["log"]);h.clear();next.deadline=9000;assert.deepEqual(h.draw(next),["countdown"]);assert.strictEqual(h.nodes.decision,decision);});
test("本地牌位选择只联动玩家牌位和决策区",()=>{const h=harness(),view=baseView();h.draw(view);h.clear();assert.deepEqual(h.draw(view,["p2:p2-1"]),["players","decision"]);});
test("牌堆变化不替换玩家牌位",()=>{const h=harness(),view=baseView();h.draw(view);const players=h.nodes.players;h.clear();const next=clone(view);next.deckCount--;assert.deepEqual(h.draw(next),["table"]);assert.strictEqual(h.nodes.players,players);});
test("目标通知只更新目标牌位和通知条，不重建决策",()=>{const h=harness(),view=baseView();h.draw(view);const decision=h.nodes.decision;h.clear();const next=clone(view);next.targetNotice={id:"n1",type:"spy",actorId:"p2",targetSlotId:"p1-1",until:9000};assert.deepEqual(h.draw(next),["players","targetNotice"]);assert.strictEqual(h.nodes.decision,decision);});
