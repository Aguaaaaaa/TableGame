import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root=path.dirname(fileURLToPath(import.meta.url));
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const script=fs.readFileSync(path.join(root,"app.js"),"utf8");
const styles=fs.readFileSync(path.join(root,"styles.css"),"utf8");

test("Manila page uses a fixed scalable harbor world",()=>{
 for(const id of ["harborViewport","harborWorld","portSlots","yardSlots","routes","pirateSlots","pilotSlots","insuranceSlot","marketGrid","mapControls","mapZoomOutButton","mapResetButton","mapZoomInButton","mapZoomText","diceStage","diceRow","diceStageButton"]){
  assert.match(html,new RegExp(`id="${id}"`));
 }
 assert.match(html,/harbor-world[\s\S]*market-grid/);
 assert.doesNotMatch(html,/class="board-map"/);
 assert.doesNotMatch(html,/class="market panel"/);
 assert.match(styles,/width:1586px;height:992px/);
 assert.match(styles,/manila-harbor-board-v1\.png/);
 assert.match(styles,/touch-action:none/);
});

test("cargo dice use the harbor-master start and stop flow instead of WebGL physics",()=>{
 assert.doesNotMatch(html,/id="diceCanvas"/);
 assert.doesNotMatch(script,/createDicePhysics|simulateDiceRoll|renderPhysicsDice/);
 assert.match(script,/rollStage:"ready"/);
 assert.match(script,/function startDiceRoll\(/);
 assert.match(script,/function stopDiceRoll\(/);
 assert.match(script,/rollStage="slowing"/);
 assert.match(script,/settleAt=state\.stopRequestedAt\+2200/);
 assert.match(script,/type:"startDice"/);
 assert.match(script,/type:"stopDice"/);
 assert.match(styles,/\.dice-stage\{/);
 assert.match(styles,/data-stage="spinning"/);
});

test("Manila client maps ships onto route and destination coordinates",()=>{
 assert.match(script,/from "\.\/board-layout\.mjs"/);
 assert.match(script,/function resetMapView\(/);
 assert.match(script,/function bindMapNavigation\(/);
 assert.match(script,/function destinationPoint\(/);
 assert.match(script,/routePoint\(shipIndex,ship\.position\)/);
 assert.match(script,/data-ship-key/);
 assert.match(script,/shipVisualPositions/);
 assert.doesNotMatch(script,/class="waves"/);
});

