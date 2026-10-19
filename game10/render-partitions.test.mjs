import assert from "node:assert/strict";
import test from "node:test";
import {createGame10PartitionRenderer,createGame10RenderModel} from "./render-partitions.mjs";

const clone=(value)=>structuredClone(value);
const player=(id,overrides={})=>({id,name:id,isHost:id==="p1",connected:true,color:id==="p1"?"#c44":"#48c",claimed:[],progress:{},...overrides});
function baseView(){return{selfId:"p1",roomRole:"player",phase:"playing",capacity:2,currentIndex:0,turnStage:"choose",
  turnProgress:{6:2},dice:[1,2,3,4],options:[{key:"a",pair:[3,7],moves:[3,7]}],closed:{},deadline:5000,revealAt:0,
  rollId:1,physicsSeed:0,winnerId:null,logs:[],presentationEvents:[],players:[player("p1"),player("p2")],
  permissions:{canManage:true,canKick:false,canStart:false,canEnd:true,canRestart:false}};}
function harness(){const calls=[],nodes={decision:null,board:null,players:null,physics:null};let sequence=0;
  const renderer=createGame10PartitionRenderer(Object.fromEntries([
    "room","status","players","board","physics","dice","decision","log","countdown","result"
  ].map((name)=>[name,()=>{calls.push(name);if(name in nodes)nodes[name]={id:++sequence};}])));
  return{calls,nodes,draw(view){return renderer.render(createGame10RenderModel(view,{memberRole:view.roomRole,roomCode:"ABCD"}));},clear(){calls.length=0;}};}

test("旁观者与演出队列变化不会替换当前决策、玩家或山道节点",()=>{const h=harness(),view=baseView();h.draw(view);const saved={...h.nodes};h.clear();const next=clone(view);next.spectators=[{id:"s1"}];next.presentationEvents=[{id:1}];assert.deepEqual(h.draw(next),[]);assert.deepEqual(h.nodes,saved);});
test("玩家掉线只更新玩家状态且不重建操作区",()=>{const h=harness(),view=baseView();h.draw(view);const node=h.nodes.decision;h.clear();const next=clone(view);next.players[1].connected=false;assert.deepEqual(h.draw(next),["players"]);assert.strictEqual(h.nodes.decision,node);});
test("公共路线进度只更新牌桌而不替换决策",()=>{const h=harness(),view=baseView();h.draw(view);const node=h.nodes.decision;h.clear();const next=clone(view);next.turnProgress[6]=3;assert.deepEqual(h.draw(next),["board"]);assert.strictEqual(h.nodes.decision,node);});
test("日志和倒计时分别独立更新",()=>{const h=harness(),view=baseView();h.draw(view);h.clear();const logged=clone(view);logged.logs.push({text:"记录"});assert.deepEqual(h.draw(logged),["log"]);h.clear();logged.deadline=8000;assert.deepEqual(h.draw(logged),["countdown"]);});
test("同一投骰的无关广播不会重启物理演出，新rollId才更新物理分区",()=>{const h=harness(),view=baseView();view.turnStage="rolling";view.physicsSeed=123;view.revealAt=7000;view.options=[];h.draw(view);const node=h.nodes.physics;h.clear();const logged=clone(view);logged.logs.push({text:"投骰"});assert.deepEqual(h.draw(logged),["log"]);assert.strictEqual(h.nodes.physics,node);h.clear();logged.rollId=2;logged.physicsSeed=456;assert.deepEqual(h.draw(logged),["physics"]);});
test("新的选择集合或回合上下文才替换决策区",()=>{const h=harness(),view=baseView();h.draw(view);const node=h.nodes.decision;h.clear();const next=clone(view);next.options.push({key:"b",pair:[4,6],moves:[4,6]});assert.deepEqual(h.draw(next),["decision"]);assert.notStrictEqual(h.nodes.decision,node);});
