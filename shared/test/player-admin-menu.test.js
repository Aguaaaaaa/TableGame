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

test("共享菜单只定义中性结构并通过设计令牌接收项目主题",()=>{
  const source=read("shared/client/player-admin-menu.js");
  const tokens=[
    "--player-admin-bg",
    "--player-admin-text",
    "--player-admin-muted",
    "--player-admin-border",
    "--player-admin-accent",
    "--player-admin-shadow",
    "--player-admin-danger-bg",
    "--player-admin-danger-text",
    "--player-admin-radius",
    "--player-admin-font"
  ];
  for(const token of tokens)assert.match(source,new RegExp(token),`缺少玩家管理主题令牌 ${token}`);
  assert.match(source,/kicker\.textContent="玩家管理"/);
  assert.doesNotMatch(source,/PLAYER MANAGEMENT|Georgia|#d9b766|rgba\(217,183,102/);
});

test("鲜明体验外壳使用项目级玩家管理主题，中性项目和阿瓦隆保持各自策略",()=>{
  const themedGames=["game3","game5","game6","game7","game8","game9","game10","game11","game13","game14","game15","game16","game17","game18","game19","game20","game21","game23"];
  for(const game of themedGames){
    const css=read(`${game}/styles.css`);
    assert.match(css,/--player-admin-bg\s*:/,`${game} 缺少玩家管理背景主题`);
    assert.match(css,/--player-admin-accent\s*:/,`${game} 缺少玩家管理强调色`);
    assert.match(css,/--player-admin-danger-bg\s*:/,`${game} 缺少移除操作主题`);
  }
  for(const game of ["game","game2"]){
    assert.doesNotMatch(read(`${game}/styles.css`),/--player-admin-bg\s*:/,`${game} 应继续使用中性公共样式`);
  }
  const avalon=`${read("game22/app.js")}\n${read("game22/styles.css")}`;
  assert.match(avalon,/playerAdminMenu/);
  assert.doesNotMatch(read("game22/styles.css"),/--player-admin-bg\s*:/);
});

test("game23与game11补齐了此前缺失的房主管理触发点",()=>{
  const game23=read("game23/app.js"),game11=read("game11/app.js");
  assert.match(game23,/current\.phase!=="lobby"\|\|!current\.permissions\.canManage\|\|item\.isHost/);
  assert.match(game11,/current\.permissions\?\.canKick&&!player\.isHost/);
});
