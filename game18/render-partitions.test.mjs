import assert from "node:assert/strict";
import test from "node:test";
import {createGame18PartitionRenderer,createGame18RenderModel} from "./render-partitions.mjs";

const clone=(value)=>structuredClone(value);
const player=(id,overrides={})=>({id,name:id,isHost:id==="p1",connected:true,score:0,accomplice:false,handCount:2,hand:id==="p1"?[{id:"c1",type:"trade"},{id:"c2",type:"civilian"}]:[{id:`${id}-hidden-1`,type:null},{id:`${id}-hidden-2`,type:null}],...overrides});
function baseView(){return{selfId:"p1",roomRole:"player",phase:"trade",capacity:3,targetScore:5,round:1,currentPlayerId:"p2",caseText:"失踪的蛋糕",
  deadline:5000,discard:[],pending:{type:"trade",actorId:"p2",targetId:"p1",participantIds:["p2","p1"],submittedIds:[],ownSelectionId:null},privateInsight:null,roundResult:null,winnerIds:[],logs:[],presentationEvents:[],players:[player("p1"),player("p2"),player("p3")],
  permissions:{canManage:true,canKick:true,canSetCapacity:false,canSetTargetScore:false,canStart:false,canRestart:false,canEnd:true,canSubmitCase:false,canPlayCard:false,canChooseTarget:false,canSubmitTrade:true,canSubmitPass:false,canChooseDogSlot:false,canAcknowledge:false}};}
function harness(){const calls=[],nodes={players:null,decision:null,hand:null};let sequence=0;const renderer=createGame18PartitionRenderer(Object.fromEntries(
  ["room","status","players","discard","decision","hand","log","countdown"].map((name)=>[name,()=>{calls.push(name);if(name in nodes)nodes[name]={id:++sequence};}])));
  return{calls,nodes,draw(view,selectedCardId=null){return renderer.render(createGame18RenderModel(view,{memberRole:view.roomRole,roomCode:"CASE",selectedCardId}));},clear(){calls.length=0;}};}

test("旁观者和演出广播不替换秘密选牌或玩家锚点",()=>{const h=harness(),view=baseView();h.draw(view,"c1");const saved={...h.nodes};h.clear();const next=clone(view);next.spectators=[{id:"s1"}];next.presentationEvents=[{id:1}];assert.deepEqual(h.draw(next,"c1"),[]);assert.deepEqual(h.nodes,saved);});
test("其他玩家掉线只更新对应玩家分区",()=>{const h=harness(),view=baseView();h.draw(view,"c1");const decision=h.nodes.decision,hand=h.nodes.hand;h.clear();const next=clone(view);next.players[2].connected=false;assert.deepEqual(h.draw(next,"c1"),["players"]);assert.strictEqual(h.nodes.decision,decision);assert.strictEqual(h.nodes.hand,hand);});
test("其他参与者确认秘密牌不会替换我的已选手牌",()=>{const h=harness(),view=baseView();h.draw(view,"c1");const hand=h.nodes.hand;h.clear();const next=clone(view);next.pending.submittedIds.push("p2");assert.deepEqual(h.draw(next,"c1"),["decision"]);assert.strictEqual(h.nodes.hand,hand);});
test("日志和倒计时独立于案件与秘密决策",()=>{const h=harness(),view=baseView();h.draw(view,"c1");const decision=h.nodes.decision;h.clear();const next=clone(view);next.logs.push({text:"记录"});assert.deepEqual(h.draw(next,"c1"),["log"]);h.clear();next.deadline=9000;assert.deepEqual(h.draw(next,"c1"),["countdown"]);assert.strictEqual(h.nodes.decision,decision);});
test("本地选择只联动决策和私人手牌",()=>{const h=harness(),view=baseView();h.draw(view);h.clear();assert.deepEqual(h.draw(view,"c1"),["decision","hand"]);});
test("公开弃牌只更新公开牌迹",()=>{const h=harness(),view=baseView();h.draw(view,"c1");const hand=h.nodes.hand,decision=h.nodes.decision;h.clear();const next=clone(view);next.discard.push({type:"civilian",playedBy:"p2",order:1});assert.deepEqual(h.draw(next,"c1"),["discard"]);assert.strictEqual(h.nodes.hand,hand);assert.strictEqual(h.nodes.decision,decision);});
test("案件描述输入期间的日志和他人在线状态变化不替换编辑器",()=>{const h=harness(),view=baseView();view.phase="caseStory";view.currentPlayerId="p1";view.pending={type:"caseStory",actorId:"p1"};view.permissions.canSubmitTrade=false;view.permissions.canSubmitCase=true;h.draw(view);const decision=h.nodes.decision;h.clear();const next=clone(view);next.players[2].connected=false;next.logs.push({text:"玩家暂时离线"});assert.deepEqual(h.draw(next),["players","log"]);assert.strictEqual(h.nodes.decision,decision);});
