"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { createRoomEntryController } from "../client/room-entry-controller.js";

class FakeClassList {
  constructor(){this.values=new Set();}
  toggle(name,force){const active=force===undefined?!this.values.has(name):Boolean(force);active?this.values.add(name):this.values.delete(name);return active;}
  contains(name){return this.values.has(name);}
}

class FakeElement {
  constructor(value=""){
    this.value=value;this.disabled=false;this.hidden=false;this.dataset={};this.classList=new FakeClassList();this.listeners=new Map();this.attributes=new Map();this.tabIndex=0;this.textContent="";this.focused=false;
  }
  addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list);}
  removeEventListener(type,listener){this.listeners.set(type,(this.listeners.get(type)||[]).filter((item)=>item!==listener));}
  emit(type,extra={}){const event={type,target:this,key:"",defaultPrevented:false,isComposing:false,preventDefault(){this.defaultPrevented=true;},...extra};for(const listener of this.listeners.get(type)||[])listener(event);return event;}
  setAttribute(name,value){this.attributes.set(name,String(value));}
  removeAttribute(name){this.attributes.delete(name);}
  focus(){this.focused=true;}
  matches(selector){return selector.split(",").some((part)=>part.trim()==="button"&&this.tagName==="BUTTON");}
}

function elements(){
  return {
    root:new FakeElement(),hostModeButton:new FakeElement(),guestModeButton:new FakeElement(),
    hostSetup:new FakeElement(),guestSetup:new FakeElement(),hostTools:new FakeElement(),
    hostNameInput:new FakeElement("  港务长  "),guestNameInput:new FakeElement("  旅人  "),
    roomCodeInput:new FakeElement(" a-b12 "),createRoomButton:new FakeElement(),joinRoomButton:new FakeElement(),
    connectionStatus:new FakeElement(),feedback:new FakeElement()
  };
}

test("room entry controller owns mode semantics without prescribing visual classes",()=>{
  const E=elements(),room={createRoom(){},joinRoom(){}};
  const entry=createRoomEntryController({room,elements:E}).bind();
  assert.equal(entry.getMode(),"host");
  assert.equal(E.hostModeButton.classList.contains("active"),true);
  assert.equal(E.guestSetup.classList.contains("hidden"),true);
  E.guestModeButton.emit("click");
  assert.equal(entry.getMode(),"guest");
  assert.equal(E.hostSetup.classList.contains("hidden"),true);
  assert.equal(E.guestModeButton.attributes.get("aria-selected"),"true");
  assert.equal(E.guestNameInput.focused,true);
});

test("room entry controller normalizes shared fields and preserves game-specific create configuration",async()=>{
  const E=elements(),calls=[];
  let release;const gate=new Promise((resolve)=>{release=resolve;});
  const room={async createRoom(payload){calls.push(payload);await gate;return{roomCode:"MNL1"};},async joinRoom(){}};
  const entry=createRoomEntryController({room,elements:E,hostFallbackName:"港务商人",buildCreatePayload:()=>({capacity:5,variant:"classic"})}).bind();
  const first=entry.submitCreate(),second=entry.submitCreate();
  assert.equal(entry.isPending(),true);assert.equal(E.createRoomButton.disabled,true);
  release();await Promise.all([first,second]);
  assert.equal(calls.length,1);
  assert.deepEqual(calls[0],{name:"港务长",capacity:5,variant:"classic"});
  assert.equal(E.createRoomButton.disabled,false);
});

test("room entry controller sends normalized join intent and applies the shared join result",async()=>{
  const E=elements(),calls=[];
  const room={async createRoom(){},async joinRoom(payload){calls.push(payload);return{memberRole:"spectator"};}};
  const spectatorUi={getJoinIntent:()=>"spectate",handleJoinResult:()=>({statusText:"已作为旁观者加入"})};
  const entry=createRoomEntryController({room,spectatorUi,elements:E}).bind();
  E.roomCodeInput.emit("input");
  await entry.submitJoin();
  assert.deepEqual(calls[0],{code:"AB12",name:"旅人",intent:"spectate"});
  assert.equal(E.connectionStatus.textContent,"已作为旁观者加入");
});

test("room entry controller restores controls and exposes an inline error hook",async()=>{
  const E=elements(),errors=[];
  const room={async createRoom(){throw new Error("服务不可用");},async joinRoom(){}};
  const entry=createRoomEntryController({room,elements:E,notify:()=>{},onError:(error,context)=>errors.push([error.message,context.kind])}).bind();
  const result=await entry.submitCreate();
  assert.equal(result,null);assert.equal(E.createRoomButton.disabled,false);
  assert.equal(E.feedback.dataset.type,"error");assert.match(E.feedback.textContent,/服务不可用/);
  assert.deepEqual(errors,[["服务不可用","create"]]);
});
