import assert from "node:assert/strict";
import test from "node:test";
import { ALIGNMENT, PRESET, QUEST_SIZES, ROLE, alignmentOf, failsRequired, rolesFor } from "./rules.mjs";

test("5至10人阵营数量与任务表符合规则",()=>{
  const evil={5:2,6:2,7:3,8:3,9:3,10:4};
  for(let count=5;count<=10;count+=1){const roles=rolesFor(count,PRESET.CLASSIC);assert.equal(roles.length,count);assert.equal(roles.filter((role)=>alignmentOf(role)===ALIGNMENT.EVIL).length,evil[count]);assert.equal(QUEST_SIZES[count].length,5);assert.ok(roles.includes(ROLE.MERLIN)&&roles.includes(ROLE.ASSASSIN));}
});
test("只有7人以上第4任务需要两张失败牌",()=>{for(let count=5;count<=10;count+=1)for(let quest=0;quest<5;quest+=1)assert.equal(failsRequired(count,quest),count>=7&&quest===3?2:1);});
test("三套预设逐步加入经典特殊角色",()=>{assert.deepEqual(rolesFor(5,PRESET.BASIC).filter((r)=>![ROLE.LOYAL,ROLE.MINION].includes(r)).sort(),[ROLE.ASSASSIN,ROLE.MERLIN].sort());assert.ok(rolesFor(5,PRESET.CLASSIC).includes(ROLE.PERCIVAL));assert.ok(rolesFor(7,PRESET.ADVANCED).includes(ROLE.MORDRED));assert.ok(rolesFor(10,PRESET.ADVANCED).includes(ROLE.OBERON));});

