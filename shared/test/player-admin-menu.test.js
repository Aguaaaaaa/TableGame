"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const authoritativeGames=["game","game2","game3","game5","game6","game7","game8","game9","game10","game11","game13","game14","game15","game16","game17","game18","game19","game20","game21","game22","game23"];
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");

test("全部服务器权威游戏都接入统一玩家管理菜单入口",()=>{
  for(const game of authoritativeGames){
    const app=read(`${game}/app.js`),html=read(`${game}/index.html`);
    assert.match(app,/createSpectatorUi/,`${game} 必须使用共享房间界面`);
    assert.match(`${app}\n${html}`,/data-kick|data-kick-player|playerAdminMenu/,`${game} 缺少正式玩家管理入口`);
  }
});

test("共享菜单将原移除按钮转换为附近弹窗并保留游戏内目标操作",()=>{
  const source=read("shared/client/player-admin-menu.js");
  assert.match(source,/role","menu"/);
  assert.match(source,/remove\.textContent="移除该玩家"/);
  assert.match(source,/await room\.kick\(id\)/);
  assert.match(source,/getView\(\)\?\.phase!=="lobby"/);
  assert.match(source,/stopImmediatePropagation/);
  assert.match(source,/当前的重连身份将失效/);
});

test("game23与game11补齐了此前缺失的房主管理触发点",()=>{
  const game23=read("game23/app.js"),game11=read("game11/app.js");
  assert.match(game23,/current\.phase!=="lobby"\|\|!current\.permissions\.canManage\|\|item\.isHost/);
  assert.match(game11,/current\.permissions\?\.canKick&&!player\.isHost/);
});
