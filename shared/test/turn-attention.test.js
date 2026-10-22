"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createTurnAttentionLayer, deriveTurnAttention } from "../client/turn-attention.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const authoritativeGames=["game","game2","game3","game5","game6","game7","game8","game9","game10","game11","game13","game14","game15","game16","game17","game18","game19","game20","game21","game22","game23"];

test("action permissions derive a stable turn-attention identity",()=>{
  const snapshot={roomCode:"ABCD",playerId:"p1"};
  const first=deriveTurnAttention({phase:"play",round:2,currentPlayerId:"p1",permissions:{canPlay:true},log:["a"],serverNow:1000},snapshot);
  const updated=deriveTurnAttention({phase:"play",round:2,currentPlayerId:"p1",permissions:{canPlay:true},log:["a","b"],serverNow:9000,connected:true},snapshot);
  assert.equal(first.required,true);
  assert.equal(first.id,updated.id,"irrelevant broadcasts must not create a second reminder");
  assert.deepEqual(first.permissionKeys,["canPlay"]);
});

test("management permissions and spectators never receive turn reminders",()=>{
  assert.equal(deriveTurnAttention({phase:"lobby",permissions:{canManage:true,canStart:true}},{playerId:"host"}).required,false);
  assert.equal(deriveTurnAttention({roomRole:"spectator",phase:"vote",permissions:{canVote:true}},{playerId:"watch"}).required,false);
});

test("a new action context creates a new reminder identity",()=>{
  const snapshot={roomCode:"ABCD",playerId:"p1"};
  const first=deriveTurnAttention({phase:"play",round:1,turn:1,permissions:{canPlay:true}},snapshot);
  const next=deriveTurnAttention({phase:"play",round:1,turn:2,permissions:{canPlay:true}},snapshot);
  assert.notEqual(first.id,next.id);
});

test("a game can provide explicit reminder copy and identity",()=>{
  const attention=deriveTurnAttention({
    phase:"respond",
    permissions:{canRespond:true},
    attention:{id:"challenge-window-7",title:"Respond now",body:"A response window is waiting"}
  },{playerId:"p1"});
  assert.equal(attention.id,"challenge-window-7");
  assert.equal(attention.title,"Respond now");
  assert.equal(attention.body,"A response window is waiting");
});

class FakeClassList{
  constructor(){this.values=new Set();}
  add(value){this.values.add(value);}
  remove(value){this.values.delete(value);}
  contains(value){return this.values.has(value);}
}

class FakeNode{
  constructor(tagName="div"){
    this.tagName=tagName;
    this.children=[];
    this.dataset={};
    this.style={};
    this.classList=new FakeClassList();
    this.attributes=new Map();
    this.hidden=false;
    this.offsetWidth=240;
    this.offsetHeight=160;
    this.listeners=new Map();
  }
  append(...nodes){for(const node of nodes){node.parentNode=this;this.children.push(node);}}
  insertAdjacentElement(_position,node){this.inserted=node;}
  setAttribute(name,value){this.attributes.set(name,String(value));}
  addEventListener(name,handler){this.listeners.set(name,handler);}
  contains(node){return node===this||this.children.some(child=>child.contains?.(node));}
  getBoundingClientRect(){return{left:20,right:50,top:20,bottom:50};}
  remove(){this.removed=true;}
}

class FakeDocument{
  constructor(){
    this.title="TableGame";
    this.hidden=true;
    this.body=new FakeNode("body");
    this.head=new FakeNode("head");
    this.connectionStatus=new FakeNode("span");
    this.selfAnchor=new FakeNode("article");
    this.listeners=new Map();
  }
  createElement(tagName){return new FakeNode(tagName);}
  getElementById(id){return id==="connectionStatus"?this.connectionStatus:null;}
  querySelector(selector){return selector.includes('"p1"')?this.selfAnchor:null;}
  addEventListener(name,handler){this.listeners.set(name,handler);}
  removeEventListener(name){this.listeners.delete(name);}
}

test("the browser layer notifies once per action and preserves a stable player anchor",async()=>{
  const documentRef=new FakeDocument();
  const persisted=[];
  const storage={
    getItem:()=>JSON.stringify({sound:false,vibration:true,notification:true}),
    setItem:(key,value)=>persisted.push([key,value])
  };
  let vibrationCount=0,notificationCount=0;
  class FakeNotification{
    static permission="granted";
    constructor(){notificationCount+=1;}
    close(){}
  }
  const windowRef={
    innerWidth:1000,innerHeight:800,
    addEventListener(){},removeEventListener(){},setTimeout(callback){callback();}
  };
  const layer=createTurnAttentionLayer({
    documentRef,
    windowRef,
    navigatorRef:{vibrate(){vibrationCount+=1;}},
    storage,
    notificationApi:FakeNotification
  });
  const snapshot={roomCode:"ABCD",playerId:"p1"};
  const view={phase:"play",round:1,turn:1,selfId:"p1",permissions:{canPlay:true}};
  layer.sync(view,snapshot);
  await Promise.resolve();
  layer.sync({...view,log:["new log"],serverNow:5000},snapshot);
  await Promise.resolve();
  layer.sync({...view,permissions:{}},snapshot);
  layer.sync(view,snapshot);
  await Promise.resolve();
  assert.equal(notificationCount,1);
  assert.equal(vibrationCount,1);
  assert.equal(documentRef.selfAnchor.classList.contains("shared-turn-attention-required"),true);
  assert.notEqual(documentRef.title,"TableGame");

  layer.sync({...view,turn:2},snapshot);
  await Promise.resolve();
  assert.equal(notificationCount,2);
  layer.sync({phase:"lobby",permissions:{canManage:true}},snapshot);
  assert.equal(documentRef.title,"TableGame");
  assert.equal(documentRef.selfAnchor.classList.contains("shared-turn-attention-required"),false);
  layer.destroy();
});

test("all authoritative games receive phase-one attention through the shared spectator controller",()=>{
  for(const game of authoritativeGames){
    const source=fs.readFileSync(path.join(root,game,"app.js"),"utf8");
    assert.match(source,/createSpectatorUi/,`${game} must use the shared room UI`);
    assert.match(source,/spectatorUi\.render\(/,`${game} must forward authoritative views to shared attention`);
  }
});
