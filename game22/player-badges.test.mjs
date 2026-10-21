import test from "node:test";
import assert from "node:assert/strict";
import { createAvalonPlayerBadges } from "./player-badges.mjs";

const base={player:{id:"p1",role:null},phase:"teamVote",leaderId:"p1",proposedTeam:["p1"],teamVoteProgress:["p1"],questProgress:[],knownEvilIds:["p1"],percivalCandidates:[],lastTeamVoteResult:{votes:{p1:false}}};

test("队长第一、上次票型最后且徽记不截断",()=>{
  const badges=createAvalonPlayerBadges(base);
  assert.equal(badges[0].type,"leader");
  assert.equal(badges.at(-1).type,"vote-no");
  assert.deepEqual(badges.map((item)=>item.type),["leader","known-evil","vote-sealed","vote-no"]);
});

test("阶段徽记只在对应阶段出现",()=>{
  const vote=createAvalonPlayerBadges(base).map((item)=>item.type);
  assert.ok(vote.includes("vote-sealed"));
  assert.ok(!vote.includes("expedition"));
  assert.ok(!vote.includes("quest-sealed"));
  const quest=createAvalonPlayerBadges({...base,phase:"questAction",teamVoteProgress:[],questProgress:["p1"]}).map((item)=>item.type);
  assert.ok(!quest.includes("vote-sealed"));
  assert.ok(quest.includes("expedition"));
  assert.ok(quest.includes("quest-sealed"));
  const later=createAvalonPlayerBadges({...base,phase:"ladyInspect",teamVoteProgress:[],questProgress:["p1"]}).map((item)=>item.type);
  assert.ok(!later.includes("expedition"));
  assert.ok(!later.includes("quest-sealed"));
});

test("公开角色取代推断身份徽记",()=>{
  const badges=createAvalonPlayerBadges({...base,player:{id:"p1",role:"morgana"},percivalCandidates:["p1"]});
  assert.ok(badges.some((item)=>item.type==="role-evil-morgana"));
  assert.ok(!badges.some((item)=>item.type==="known-evil"||item.type==="merlin-candidate"));
});
