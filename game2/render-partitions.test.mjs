import assert from "node:assert/strict";
import test from "node:test";
import { createGame2PartitionRenderer, createGame2RenderModel } from "./render-partitions.mjs";

function baseView() {
  return {
    selfId:"p1",roomRole:"player",phase:"playing",capacity:4,round:1,wordNumber:2,
    currentActorId:"p1",turnTeamIndex:0,turnLabel:"房主的回合",notice:"请描述",
    currentDescription:"",idiomHidden:false,idiom:"画龙点睛",scores:[0,0],log:[],spectators:[],
    players:[
      {id:"p1",name:"房主",isHost:true,connected:true},
      {id:"p2",name:"玩家二",isHost:false,connected:true},
      {id:"p3",name:"玩家三",isHost:false,connected:true},
      {id:"p4",name:"玩家四",isHost:false,connected:true}
    ],
    seats:[0,1,2,3].map((index) => ({index,playerId:`p${index+1}`})),
    permissions:{canManage:true,canSetCapacity:false,canStart:false,canEnd:true,canRestart:false,canKick:false,canDescribe:true,canGuess:false}
  };
}

const clone = (value) => structuredClone(value);

function harness() {
  const calls=[];let actionNode=null;let sequence=0;
  const renderer=createGame2PartitionRenderer(Object.fromEntries([
    "room","status","players","scores","seats","idiom","log"
  ].map((name) => [name,() => calls.push(name)]).concat([["decision",() => {calls.push("decision");actionNode={id:++sequence};}]])));
  const draw=(view) => renderer.render(createGame2RenderModel(view,{memberRole:view.roomRole,roomCode:"ABCD"}));
  return {calls,draw,clear(){calls.length=0;},get actionNode(){return actionNode;}};
}

test("旁观者加入和日志增加不替换正在输入的描述框",() => {
  const h=harness(),view=baseView();h.draw(view);const node=h.actionNode;h.clear();
  const spectator=clone(view);spectator.spectators.push({id:"s1",name:"旁观者"});
  assert.deepEqual(h.draw(spectator),[]);assert.strictEqual(h.actionNode,node);
  const logged=clone(spectator);logged.log.push({id:"l1",text:"一条记录",detail:""});
  assert.deepEqual(h.draw(logged),["log"]);assert.strictEqual(h.actionNode,node);
});

test("其他玩家掉线只更新房间许可与玩家状态，不替换文本决策DOM",() => {
  const h=harness(),view=baseView();h.draw(view);const node=h.actionNode;h.clear();
  const next=clone(view);next.players[1].connected=false;
  assert.deepEqual(h.draw(next),["players"]);assert.strictEqual(h.actionNode,node);
});

test("比分变化不影响输入，描述转猜词才替换决策结构",() => {
  const h=harness(),view=baseView();h.draw(view);const node=h.actionNode;h.clear();
  const scored=clone(view);scored.scores[0]=1;
  assert.deepEqual(h.draw(scored),["scores"]);assert.strictEqual(h.actionNode,node);
  const guess=clone(scored);guess.permissions.canDescribe=false;guess.permissions.canGuess=true;guess.currentActorId="p2";guess.currentDescription="长着鳞片";
  const changed=h.draw(guess);assert.ok(changed.includes("decision"));assert.notStrictEqual(h.actionNode,node);
});

test("座位变化只更新房间与座位分区",() => {
  const h=harness(),view=baseView();view.phase="lobby";view.permissions.canDescribe=false;view.currentActorId=null;h.draw(view);const node=h.actionNode;h.clear();
  const next=clone(view);next.seats[3].playerId=null;
  assert.deepEqual(h.draw(next),["room","seats"]);assert.strictEqual(h.actionNode,node);
});
