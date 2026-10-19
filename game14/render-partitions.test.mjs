import assert from "node:assert/strict";
import test from "node:test";
import {createGame14PartitionRenderer,createGame14RenderModel} from "./render-partitions.mjs";

const clone=(value)=>structuredClone(value);
const pig=(id,overrides={})=>({id,dirty:false,hasBarn:false,hasDoor:false,hasRod:false,completelySafe:false,...overrides});
const player=(id,overrides={})=>({id,name:id,isHost:id==="p1",connected:true,handCount:3,pigs:[pig(`${id}-1`),pig(`${id}-2`)],...overrides});
function baseView(){return{selfId:"p1",roomRole:"player",phase:"playing",capacity:2,currentPlayerId:"p1",winnerId:null,
  deckCount:30,discardCount:2,discardTop:{type:"mud"},deadline:5000,revealedExchange:null,logs:[],presentationEvents:[],
  players:[player("p1"),player("p2")],hand:[{id:"c1",type:"mud",label:"泥巴",playable:true,legalTargets:[{key:"p1:p1-1"}]}],
  permissions:{canManage:true,canKick:true,canSetCapacity:false,canStart:false,canEnd:true,canRestart:false,canAct:true,canExchange:false}};}
function harness(){const calls=[],nodes={players:null,decision:null,hand:null};let sequence=0;const renderer=createGame14PartitionRenderer(Object.fromEntries(
  ["room","status","supply","players","decision","hand","reveal","log","countdown"].map((name)=>[name,()=>{calls.push(name);if(name in nodes)nodes[name]={id:++sequence};}])));
  return{calls,nodes,draw(view,selectedCardId=null){return renderer.render(createGame14RenderModel(view,{memberRole:view.roomRole,roomCode:"PIGS",selectedCardId}));},clear(){calls.length=0;}};}

test("旁观者和演出事件变化不替换手牌、行动区或农场",()=>{const h=harness(),view=baseView();h.draw(view);const saved={...h.nodes};h.clear();const next=clone(view);next.spectators=[{id:"s1"}];next.presentationEvents=[{id:1}];assert.deepEqual(h.draw(next),[]);assert.deepEqual(h.nodes,saved);});
test("其他玩家掉线只更新农场玩家分区",()=>{const h=harness(),view=baseView();h.draw(view);const decision=h.nodes.decision,hand=h.nodes.hand;h.clear();const next=clone(view);next.players[1].connected=false;assert.deepEqual(h.draw(next),["players"]);assert.strictEqual(h.nodes.decision,decision);assert.strictEqual(h.nodes.hand,hand);});
test("牌堆、日志和倒计时分别独立更新",()=>{const h=harness(),view=baseView();h.draw(view);h.clear();const supplied=clone(view);supplied.deckCount--;assert.deepEqual(h.draw(supplied),["supply"]);h.clear();supplied.logs.push({text:"记录"});assert.deepEqual(h.draw(supplied),["log"]);h.clear();supplied.deadline=8000;assert.deepEqual(h.draw(supplied),["countdown"]);});
test("选择卡牌只联动合法目标、行动区和私密手牌",()=>{const h=harness(),view=baseView();h.draw(view);h.clear();assert.deepEqual(h.draw(view,"c1"),["players","decision","hand"]);});
test("公共小猪状态变化不重建手牌和决策区",()=>{const h=harness(),view=baseView();h.draw(view);const decision=h.nodes.decision,hand=h.nodes.hand;h.clear();const next=clone(view);next.players[1].pigs[0].dirty=true;assert.deepEqual(h.draw(next),["players"]);assert.strictEqual(h.nodes.decision,decision);assert.strictEqual(h.nodes.hand,hand);});
test("服务器移除已选卡后才清理选择上下文",()=>{const h=harness(),view=baseView();h.draw(view,"c1");h.clear();const next=clone(view);next.hand=[];assert.deepEqual(h.draw(next,"c1"),["players","decision","hand"]);});
