import test from "node:test";
import assert from "node:assert/strict";
import { canOpenPlayerAdminMenu } from "./player-admin-menu.mjs";

test("准备阶段房主能管理普通玩家",()=>{
  assert.equal(canOpenPlayerAdminMenu({phase:"lobby",canManage:true,selfId:"host",targetId:"guest"}),true);
});

test("房主不能通过玩家菜单移除自己",()=>{
  assert.equal(canOpenPlayerAdminMenu({phase:"lobby",canManage:true,selfId:"host",targetId:"host"}),false);
});

test("开局后不再开放玩家移除菜单",()=>{
  for(const phase of ["secretReveal","teamProposal","teamVote","questAction","ended"]){
    assert.equal(canOpenPlayerAdminMenu({phase,canManage:true,selfId:"host",targetId:"guest"}),false);
  }
});

test("普通玩家在准备阶段也不能管理他人",()=>{
  assert.equal(canOpenPlayerAdminMenu({phase:"lobby",canManage:false,selfId:"guest",targetId:"other"}),false);
});
