import assert from "node:assert/strict";
import test from "node:test";
import {createGame8PartitionRenderer,createGame8RenderModel} from "./render-partitions.mjs";

const clone=(value)=>structuredClone(value);
const tokens=(red=0)=>({red,blue:0,black:0,pink:0,yellow:0,purple:0});
const gamePlayer=(id,overrides={})=>({id,name:id,tokens:tokens(),megaToken:0,board:[],buried:[],reserve:[],reserveVisibility:{},assoc:{},...overrides});
const roomPlayer=(id,overrides={})=>({id,name:id,isHost:id==="p1",connected:true,...overrides});
function baseView(){return{
  selfId:"p1",viewerId:"p1",roomRole:"player",phase:"playing",capacity:3,presentationEvents:[],
  players:[roomPlayer("p1"),roomPlayer("p2"),roomPlayer("p3")],
  permissions:{canManage:true,canKick:false,canStart:false,canEnd:true,canRestart:false},
  game:{turn:0,round:2,phase:"play",lastRound:false,winner:null,acted:false,evolvedThisTurn:false,supply:tokens(4),
    decks:{stage1:[null,null],stage2:[null],stage3:[null],rare:[null],legend:[null]},
    field:{stage1:["s1","s2"],stage2:["s3"],stage3:["s4"],rare:["r1"],legend:["l1"]},
    players:[gamePlayer("p1",{reserve:["own1"]}),gamePlayer("p2"),gamePlayer("p3")],log:[]}
};}
function harness(){const calls=[],nodes={players:null,markets:null,trainer:null,decision:null,inspector:null};let sequence=0;const renderer=createGame8PartitionRenderer(Object.fromEntries(
  ["room","players","supply","markets","trainer","decision","inspector","log"].map((name)=>[name,()=>{calls.push(name);if(name in nodes)nodes[name]={id:++sequence};}])));
  return{calls,nodes,draw(view,local={}){return renderer.render(createGame8RenderModel(view,{memberRole:view.roomRole,roomCode:"POKE",selection:local.selection||[],selectedCardId:local.selectedCardId||null,inspectedPlayerId:local.inspectedPlayerId||null}));},clear(){calls.length=0;}};}

test("旁观者加入和演出广播不替换市场、训练家板块或决策",()=>{const h=harness(),view=baseView();h.draw(view);const saved={...h.nodes};h.clear();const next=clone(view);next.spectators=[{id:"s1"}];next.presentationEvents=[{id:"e1"}];assert.deepEqual(h.draw(next),[]);assert.deepEqual(h.nodes,saved);});
test("玩家掉线只更新稳定玩家节点并保留精灵球草稿",()=>{const h=harness(),view=baseView(),local={selection:["red"]};h.draw(view,local);const decision=h.nodes.decision,markets=h.nodes.markets;h.clear();const next=clone(view);next.players[2].connected=false;assert.deepEqual(h.draw(next,local),["players"]);assert.strictEqual(h.nodes.decision,decision);assert.strictEqual(h.nodes.markets,markets);});
test("其他玩家资源变化不会重建我的训练家板块和操作区",()=>{const h=harness(),view=baseView();view.game.turn=1;h.draw(view);const trainer=h.nodes.trainer,decision=h.nodes.decision;h.clear();const next=clone(view);next.game.players[1].tokens.red=1;next.game.supply.red=3;assert.deepEqual(h.draw(next),["players","supply"]);assert.strictEqual(h.nodes.trainer,trainer);assert.strictEqual(h.nodes.decision,decision);});
test("本地精灵球选择只更新供应与个人决策",()=>{const h=harness(),view=baseView();h.draw(view);const markets=h.nodes.markets,trainer=h.nodes.trainer;h.clear();assert.deepEqual(h.draw(view,{selection:["red"]}),["supply","decision"]);assert.strictEqual(h.nodes.markets,markets);assert.strictEqual(h.nodes.trainer,trainer);});
test("选择市场牌与保留牌只更新各自所在区域",()=>{const h=harness(),view=baseView();h.draw(view);h.clear();assert.deepEqual(h.draw(view,{selectedCardId:"s1"}),["markets"]);h.clear();assert.deepEqual(h.draw(view,{selectedCardId:"own1"}),["markets","trainer"]);h.clear();assert.deepEqual(h.draw(view,{selectedCardId:"own1"}),[]);});
test("查看其他训练家只打开浮窗而不重建桌面",()=>{const h=harness(),view=baseView();h.draw(view);const markets=h.nodes.markets,decision=h.nodes.decision;h.clear();assert.deepEqual(h.draw(view,{inspectedPlayerId:"p2"}),["inspector"]);assert.strictEqual(h.nodes.markets,markets);assert.strictEqual(h.nodes.decision,decision);});
test("被查看玩家变化只更新玩家席和浮窗",()=>{const h=harness(),view=baseView();h.draw(view,{inspectedPlayerId:"p2"});const decision=h.nodes.decision;h.clear();const next=clone(view);next.game.players[1].board.push("s5");assert.deepEqual(h.draw(next,{inspectedPlayerId:"p2"}),["players","inspector"]);assert.strictEqual(h.nodes.decision,decision);});
test("日志独立更新且新回合才替换决策",()=>{const h=harness(),view=baseView(),local={selection:["red"]};h.draw(view,local);const decision=h.nodes.decision;h.clear();const logged=clone(view);logged.game.log.push({msg:"获得精灵球"});assert.deepEqual(h.draw(logged,local),["log"]);assert.strictEqual(h.nodes.decision,decision);h.clear();logged.game.turn=1;assert.ok(h.draw(logged).includes("decision"));});
test("自己的资源与捕捉结果只更新相关公共和私人分区",()=>{const h=harness(),view=baseView();h.draw(view);h.clear();const next=clone(view);next.game.players[0].tokens.red=1;next.game.players[0].board.push("s5");next.game.supply.red=3;assert.deepEqual(h.draw(next),["players","supply","trainer","decision"]);});
test("游戏结束会建立结算决策而不会依赖旧选择",()=>{const h=harness(),view=baseView();h.draw(view,{selection:["red"],selectedCardId:"s1"});h.clear();const next=clone(view);next.phase="ended";next.game.phase="gameover";next.game.winner=0;next.permissions.canEnd=false;next.permissions.canRestart=true;const changed=h.draw(next);assert.ok(changed.includes("room"));assert.ok(changed.includes("decision"));});

