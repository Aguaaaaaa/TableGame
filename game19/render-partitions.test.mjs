import assert from "node:assert/strict";
import test from "node:test";
import {createGame19PartitionRenderer,createGame19RenderModel} from "./render-partitions.mjs";

const clone=(value)=>structuredClone(value);
const card=(id,type="bang")=>({id,type,rank:"A",suit:"spades"});
const player=(id,overrides={})=>({id,name:id,isHost:id==="p1",connected:true,alive:true,life:4,maxLife:4,role:id==="p1"?"sheriff":null,
  characterId:id==="p1"?"kit_carlson":"bart_cassidy",characterName:id==="p1"?"基特·卡尔森":"巴特·卡西迪",handCount:2,
  hand:id==="p1"?[card("c1"),card("c2","beer")]:[{id:null,type:null},{id:null,type:null}],equipment:[],distance:id==="p1"?null:1,...overrides});
function baseView(){return{selfId:"p1",roomRole:"player",phase:"kitChoice",capacity:4,turn:2,currentPlayerId:"p1",deckCount:45,discardTop:card("d1","missed"),deadline:5000,winner:null,
  pending:{id:"e1",type:"kitChoice",actorId:"p1",cards:[card("k1"),card("k2","beer"),card("k3","missed")]},logs:[],presentationEvents:[],players:[player("p1"),player("p2"),player("p3")],
  permissions:{canManage:true,canStart:false,canRestart:false,canEnd:true,canSetCapacity:false,canDraw:false,canChooseDraw:false,canChooseKit:true,canChooseJudgment:false,canPlay:false,canRespond:false,canSaveDying:false,canResolveOwnDying:false,canOrderEliminationDiscard:false,canDiscard:false,canChooseStore:false}};}
function harness(){const calls=[],nodes={players:null,private:null,decision:null};let sequence=0;const renderer=createGame19PartitionRenderer(Object.fromEntries(
  ["room","status","table","players","private","decision","log","countdown"].map((name)=>[name,()=>{calls.push(name);if(name in nodes)nodes[name]={id:++sequence};}])));
  return{calls,nodes,draw(view,options={}){return renderer.render(createGame19RenderModel(view,{memberRole:view.roomRole,roomCode:"BANG",...options}));},clear(){calls.length=0;}};}

test("旁观者和演出广播不替换基特三选二决策",()=>{const h=harness(),view=baseView();h.draw(view);const saved={...h.nodes};h.clear();const next=clone(view);next.spectators=[{id:"s1"}];next.presentationEvents=[{id:1}];assert.deepEqual(h.draw(next),[]);assert.deepEqual(h.nodes,saved);});
test("其他玩家掉线只更新对应玩家席",()=>{const h=harness(),view=baseView();h.draw(view);const decision=h.nodes.decision,privateNode=h.nodes.private;h.clear();const next=clone(view);next.players[2].connected=false;assert.deepEqual(h.draw(next),["players"]);assert.strictEqual(h.nodes.decision,decision);assert.strictEqual(h.nodes.private,privateNode);});
test("日志和倒计时独立于多选草稿",()=>{const h=harness(),view=baseView();h.draw(view);const decision=h.nodes.decision;h.clear();const next=clone(view);next.logs.push({text:"枪声"});assert.deepEqual(h.draw(next),["table","log"]);h.clear();next.deadline=9000;assert.deepEqual(h.draw(next),["countdown"]);assert.strictEqual(h.nodes.decision,decision);});
test("同一窗口只有候选牌真正变化才替换基特选择区",()=>{const h=harness(),view=baseView();h.draw(view);const decision=h.nodes.decision;h.clear();const same=clone(view);same.pending.note="irrelevant";assert.deepEqual(h.draw(same),[]);assert.strictEqual(h.nodes.decision,decision);h.clear();same.pending.cards.pop();assert.deepEqual(h.draw(same),["decision"]);});
test("本地选牌只更新私人手牌和决策区",()=>{const h=harness(),view=baseView();view.phase="play";view.pending=null;view.permissions.canChooseKit=false;view.permissions.canPlay=true;h.draw(view);h.clear();assert.deepEqual(h.draw(view,{selectedCardId:"c1"}),["private","decision"]);});
test("本地选择目标只更新决策区",()=>{const h=harness(),view=baseView();view.phase="play";view.pending=null;view.permissions.canChooseKit=false;view.permissions.canPlay=true;h.draw(view,{selectedCardId:"c1"});h.clear();assert.deepEqual(h.draw(view,{selectedCardId:"c1",selectedTargetId:"p2"}),["decision"]);});
test("超额弃牌期间无关玩家在线变化不替换多选区",()=>{const h=harness(),view=baseView();view.phase="discardExcess";view.pending={id:"e2",type:"discardExcess",actorId:"p1",count:1};view.permissions.canChooseKit=false;view.permissions.canDiscard=true;h.draw(view);const decision=h.nodes.decision;h.clear();const next=clone(view);next.players[1].connected=false;assert.deepEqual(h.draw(next),["players"]);assert.strictEqual(h.nodes.decision,decision);});
