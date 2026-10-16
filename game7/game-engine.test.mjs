import assert from "node:assert/strict";
import test from "node:test";
import {
  addPlayer,applyAction,buildSpectatorView,buildView,createLobby,handleTimeout,
  restoreState,serializeState,setPresence,validateState
} from "./server/game-engine.mjs";

const constantRandom=(value)=>(()=>value);

function lobby(){
  const state=createLobby({capacity:4,host:{id:"p1",name:"甲",connected:true}});
  for(let index=2;index<=4;index+=1)addPlayer(state,{id:`p${index}`,name:`玩家${index}`,connected:true});
  return state;
}

function configured(){
  const state=lobby();
  applyAction(state,"p1",{type:"start"},{now:100,random:constantRandom(.1)});
  applyAction(state,"p1",{type:"auction",action:"bid",bid:1},{now:110});
  for(const id of ["p2","p3","p4"])applyAction(state,id,{type:"auction",action:"pass"},{now:120});
  applyAction(state,"p1",{type:"configure",goods:["ginseng","nutmeg","silk"],starts:[3,3,3]},{now:130});
  return state;
}

test("服务器持有开局、竞拍与秘密股票，逐玩家裁剪视图",()=>{
  const state=lobby();
  applyAction(state,"p1",{type:"start"},{now:100,random:constantRandom(.1)});
  assert.equal(state.phase,"auction");
  assert.equal(state.players.every((player)=>player.shares.length===2),true);
  const own=buildView(state,"p1"),other=buildView(state,"p2"),spectator=buildSpectatorView(state);
  assert.equal(own.players[0].shares.every((share)=>share.good),true);
  assert.equal(other.players[0].shares.every((share)=>share.hidden===true),true);
  assert.equal(spectator.players[0].cash,null);
  assert.equal(spectator.players.flatMap((player)=>player.shares).every((share)=>share.hidden===true),true);
  assert.equal(Object.entries(spectator.permissions).filter(([,value])=>typeof value==="boolean").some(([,value])=>value),false);
  assert.deepEqual(spectator.permissions.placementOptions,[]);
  validateState(state);
});

test("非行动者不能伪造竞拍，港务长配置也由服务器校验",()=>{
  const state=lobby();
  applyAction(state,"p1",{type:"start"},{now:100,random:constantRandom(.1)});
  assert.throws(()=>applyAction(state,"p2",{type:"auction",action:"bid",bid:10}),/现在没有轮到你/);
  applyAction(state,"p1",{type:"auction",action:"bid",bid:1});
  for(const id of ["p2","p3","p4"])applyAction(state,id,{type:"auction",action:"pass"});
  assert.throws(()=>applyAction(state,"p2",{type:"configure",goods:["ginseng","nutmeg","silk"],starts:[3,3,3]}),/只有港务长/);
  assert.throws(()=>applyAction(state,"p1",{type:"configure",goods:["ginseng","nutmeg","silk"],starts:[5,5,5]}),/总和为9/);
});

test("三颗货物骰由港务长开始和喊停，最终点数在定格前保密",()=>{
  const state=configured();
  for(const id of ["p1","p2","p3","p4"])applyAction(state,id,{type:"skipPlacement"},{now:200});
  assert.equal(state.phase,"rolling");assert.equal(state.rollStage,"ready");
  assert.throws(()=>applyAction(state,"p2",{type:"startDice"}),/只有港务长/);
  applyAction(state,"p1",{type:"startDice"},{now:300,random:constantRandom(.2)});
  applyAction(state,"p1",{type:"stopDice"},{now:400,random:constantRandom(.1)});
  assert.equal(state.rollStage,"slowing");
  assert.equal(state.pending.rollValues.length,3);
  assert.deepEqual(buildView(state,"p1").pending.rollValues,[]);
  assert.deepEqual(buildSpectatorView(state).pending.rollValues,[]);
  assert.equal(handleTimeout(state,{now:state.deadline,random:constantRandom(.1)}),true);
  assert.equal(state.rollStage,"settled");
  assert.equal(buildView(state,"p2").ships.every((ship)=>Number.isInteger(ship.die)),true);
});

test("行动者掉线只缩短当前期限，状态可序列化并完整恢复",()=>{
  const state=configured(),before=state.deadline;
  assert.equal(setPresence(state,"p1",false,{now:1000}),true);
  assert.equal(state.deadline,Math.min(before,11000));
  const restored=restoreState(serializeState(state));
  assert.deepEqual(restored,state);
  validateState(restored);
});

test("服务器可托管推进完整航次且始终满足资产与股票不变量",()=>{
  const state=configured(),random=constantRandom(.99);let guard=0;
  while(state.voyage===1&&state.phase!=="ended"&&guard<120){
    guard+=1;
    if(state.phase==="placing")applyAction(state,state.players[state.placeTurn].id,{type:"skipPlacement"},{now:1000+guard,random});
    else if(state.phase==="rolling")handleTimeout(state,{now:state.deadline,random});
    else if(state.phase==="arrivalOrder")applyAction(state,state.harborMasterId,{type:"order",order:[...state.pending.arrivals]},{now:1000+guard,random});
    else if(state.phase==="yardOrder")applyAction(state,state.harborMasterId,{type:"order",order:[...state.pending.failures]},{now:1000+guard,random});
    else if(["pilot","pirateBoard","plunder"].includes(state.phase))handleTimeout(state,{now:state.deadline,random});
    else break;
    validateState(state);
  }
  assert.ok(guard<120,"完整航次不应陷入无限阶段循环");
  assert.ok(state.voyage>=2||state.phase==="ended");
});

