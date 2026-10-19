import assert from "node:assert/strict";
import test from "node:test";
import { createGame1PartitionRenderer, createGame1RenderModel } from "./render-partitions.mjs";

function player(id,overrides={}) {
  return {id,name:id,isHost:id==="p1",connected:true,status:"playing",isCurrent:id==="p1",...overrides};
}

function baseView() {
  return {
    selfId:"p1",roomRole:"player",phase:"playing",round:2,notice:"轮到你行动",
    wordExtraMode:"none",playerWordMode:"normal",turnQuestionAsked:false,currentQuestion:null,
    submittedPlayerIds:[],winners:[],spectators:[],log:[],presentationEvents:[],
    players:[player("p1"),player("p2",{isCurrent:false}),player("p3",{isCurrent:false})],
    words:[
      {id:"p1",name:"p1",status:"ready",word:null,extra:"",trapWord:""},
      {id:"p2",name:"p2",status:"ready",word:"苹果",extra:"",trapWord:""},
      {id:"p3",name:"p3",status:"ready",word:"月亮",extra:"",trapWord:""}
    ],
    permissions:{canManage:true,canStart:false,canEnd:true,canKick:false}
  };
}

const clone=(value) => structuredClone(value);

function harness() {
  const calls=[];let decisionNode=null;let sequence=0;let playerNodes=new Map();let wordNodes=new Map();
  const renderer=createGame1PartitionRenderer({
    room:() => calls.push("room"),status:() => calls.push("status"),
    players(model){calls.push("players");playerNodes=new Map(model.view.players.map((item) => [item.id,playerNodes.get(item.id)||{id:item.id}]));},
    words(model){calls.push("words");wordNodes=new Map(model.view.words.map((item) => [item.id,wordNodes.get(item.id)||{id:item.id}]));},
    decision(){calls.push("decision");decisionNode={id:++sequence};},
    logFilter:() => calls.push("logFilter"),log:() => calls.push("log")
  });
  const draw=(view,filter="all") => renderer.render(createGame1RenderModel(view,{memberRole:view.roomRole,roomCode:"ABCD",logPlayerFilter:filter}));
  return {calls,draw,clear(){calls.length=0;},get decisionNode(){return decisionNode;},get playerNodes(){return playerNodes;},get wordNodes(){return wordNodes;}};
}

test("旁观者和日志广播不替换当前问题输入DOM",() => {
  const h=harness(),view=baseView();h.draw(view);const node=h.decisionNode;h.clear();
  const spectator=clone(view);spectator.spectators.push({id:"s1",name:"旁观者"});
  assert.deepEqual(h.draw(spectator),[]);assert.strictEqual(h.decisionNode,node);
  const logged=clone(spectator);logged.log.push({id:"l1",type:"skip",text:"一条记录"});
  assert.deepEqual(h.draw(logged),["log"]);assert.strictEqual(h.decisionNode,node);
});

test("其他玩家掉线只更新稳定玩家和代号卡锚点",() => {
  const h=harness(),view=baseView();h.draw(view);const decision=h.decisionNode,player=h.playerNodes.get("p2"),word=h.wordNodes.get("p2");h.clear();
  const next=clone(view);next.players[1].connected=false;
  assert.deepEqual(h.draw(next),["players","words"]);
  assert.strictEqual(h.decisionNode,decision);assert.strictEqual(h.playerNodes.get("p2"),player);assert.strictEqual(h.wordNodes.get("p2"),word);
});

test("征集阶段其他玩家提交不会重建自己的词语编辑器",() => {
  const h=harness(),view=baseView();view.phase="collectingWords";view.players.forEach((item) => {item.isCurrent=false;});view.words=[];h.draw(view);const node=h.decisionNode;h.clear();
  const next=clone(view);next.submittedPlayerIds.push("p2");
  assert.deepEqual(h.draw(next),["players"]);assert.strictEqual(h.decisionNode,node);
  const accepted=clone(next);accepted.submittedPlayerIds.push("p1");
  assert.deepEqual(h.draw(accepted),["players","decision"]);assert.notStrictEqual(h.decisionNode,node);
});

test("记录筛选只更新筛选器和记录，服务器接受问题后才替换编辑器",() => {
  const h=harness(),view=baseView();h.draw(view);const node=h.decisionNode;h.clear();
  assert.deepEqual(h.draw(view,"p2"),["logFilter","log"]);assert.strictEqual(h.decisionNode,node);
  const question=clone(view);question.currentQuestion={id:"q1",askerId:"p1",askerName:"p1",text:"我是动物吗",answers:{}};
  assert.deepEqual(h.draw(question,"p2"),["decision"]);assert.notStrictEqual(h.decisionNode,node);
});
