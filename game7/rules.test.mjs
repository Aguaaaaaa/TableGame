import assert from "node:assert/strict";
import test from "node:test";
import {assertCapacity,GOOD_IDS,GOODS,randomStarts,rollForGood} from "./rules.mjs";

test("马尼拉人数和三艘船起点约束稳定",()=>{
  assert.equal(assertCapacity(4),4);assert.equal(assertCapacity(5),5);
  assert.throws(()=>assertCapacity(3));assert.throws(()=>assertCapacity(6));
  let seed=17;const random=()=>{seed=(seed*48271)%2147483647;return seed/2147483647;};
  for(let index=0;index<100;index+=1){const starts=randomStarts(random);assert.equal(starts.length,3);assert.equal(starts.reduce((sum,value)=>sum+value,0),9);assert.ok(starts.every((value)=>Number.isInteger(value)&&value>=0&&value<=5));}
});

test("每种货物骰只会产生自己的合法骰面",()=>{
  for(const good of GOOD_IDS){for(const value of [0,.17,.49,.83,.999])assert.ok(GOODS[good].die.includes(rollForGood(good,()=>value)));}
  assert.throws(()=>rollForGood("unknown"));
});

