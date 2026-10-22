"use strict";

import assert from "node:assert/strict";
import test from "node:test";
import { createQuickReactionLayer, normalizeQuickReaction, QUICK_REACTIONS } from "../client/quick-reactions.js";

test("quick reactions accept only the shared allowlist and ignore spoofed artwork or copy",()=>{
  assert.equal(QUICK_REACTIONS.length,6);
  assert.equal(normalizeQuickReaction({id:"unknown"}),null);
  const normalized=normalizeQuickReaction({
    id:"agree",emoji:"bad",label:"bad",senderId:"p1",senderName:"Alice",senderRole:"spectator",sequence:4
  });
  assert.equal(normalized.emoji,"👍");
  assert.equal(normalized.label,"赞同");
  assert.equal(normalized.senderRole,"spectator");
  assert.equal(normalized.sequence,4);
});

class FakeClassList{add(){}remove(){}}
class FakeNode{
  constructor(){this.children=[];this.dataset={};this.style={};this.className="";this.classList=new FakeClassList();this.hidden=false;this.offsetWidth=280;this.offsetHeight=130;}
  append(...nodes){for(const node of nodes){node.parentNode=this;this.children.push(node);}}
  insertAdjacentElement(_where,node){this.inserted=node;}
  setAttribute(){}
  addEventListener(){}
  contains(node){return node===this||this.children.includes(node);}
  getBoundingClientRect(){return{left:10,right:40,top:10,bottom:40,width:30,height:30};}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter((child)=>child!==this);this.removed=true;}
}
class FakeDocument{
  constructor(){this.body=new FakeNode();this.head=new FakeNode();this.status=new FakeNode();}
  createElement(){return new FakeNode();}
  getElementById(id){return id==="connectionStatus"?this.status:null;}
  querySelector(){return null;}
  addEventListener(){}
  removeEventListener(){}
}

test("the reaction layer replaces a sender's prior bubble and caps concurrent presentation",()=>{
  const documentRef=new FakeDocument();
  const room={sendReaction:async()=>{},subscribeReactions(listener){this.listener=listener;return()=>{};}};
  const timers=new Map();let nextTimer=0;
  const layer=createQuickReactionLayer({
    room,documentRef,
    windowRef:{innerWidth:800,innerHeight:600,addEventListener(){},removeEventListener(){}},
    setTimeoutImpl(callback){const id=++nextTimer;timers.set(id,callback);return id;},
    clearTimeoutImpl(id){timers.delete(id);}
  });
  for(let index=1;index<=6;index+=1)layer.receive({id:"wow",senderId:`p${index}`,senderName:`P${index}`});
  assert.equal(layer.activeCount(),5);
  const timerCount=timers.size;
  layer.receive({id:"agree",senderId:"p6",senderName:"P6"});
  assert.equal(layer.activeCount(),5);
  assert.equal(timers.size,timerCount);
  const stage=documentRef.body.children.find((node)=>node.className==="shared-quick-reaction-stage");
  assert.ok(stage.children.every((pop)=>pop.children.length===1&&pop.children[0].className==="emoji"),"a reaction bubble only renders the emoji");
  layer.destroy();
  assert.equal(layer.activeCount(),0);
});
