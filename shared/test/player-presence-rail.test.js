"use strict";

import assert from "node:assert/strict";
import test from "node:test";
import { mountPlayerPresenceBadge, unmountPlayerPresenceBadge } from "../client/player-presence-rail.js";

class FakeClassList{constructor(){this.values=new Set();}add(value){this.values.add(value);}remove(value){this.values.delete(value);}contains(value){return this.values.has(value);}}
class FakeNode{
  constructor(width=260){this.children=[];this.dataset={};this.classList=new FakeClassList();this.style={};this.width=width;}
  append(...nodes){for(const node of nodes){node.parentNode=this;this.children.push(node);}}
  setAttribute(){}
  getBoundingClientRect(){return{width:this.width};}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter((child)=>child!==this);}
}
class FakeDocument{constructor(){this.head=new FakeNode();}createElement(){return new FakeNode();}}

test("readiness and public status share one reserved player rail in stable order",()=>{
  const documentRef=new FakeDocument(),anchor=new FakeNode(260),ready=new FakeNode(),status=new FakeNode();
  mountPlayerPresenceBadge(anchor,ready,"readiness",{documentRef});
  mountPlayerPresenceBadge(anchor,status,"status",{documentRef});
  assert.equal(anchor.children.length,1);
  const rail=anchor.children[0];
  assert.equal(rail.dataset.sharedPlayerPresenceRail,"true");
  assert.deepEqual(rail.children,[ready,status]);
  assert.equal(anchor.classList.contains("shared-player-presence-anchor"),true);
  unmountPlayerPresenceBadge(ready);assert.deepEqual(rail.children,[status]);
  unmountPlayerPresenceBadge(status);assert.equal(anchor.children.length,0);assert.equal(anchor.classList.contains("shared-player-presence-anchor"),false);
});

test("a narrow player card switches the shared rail to compact badges",()=>{
  const documentRef=new FakeDocument(),anchor=new FakeNode(150),badge=new FakeNode();
  const rail=mountPlayerPresenceBadge(anchor,badge,"status",{documentRef});
  assert.equal(rail.dataset.compact,"true");
});

test("shared rail stylesheet fixes readiness before status regardless of mount timing",()=>{
  const documentRef=new FakeDocument(),anchor=new FakeNode(260),status=new FakeNode(),ready=new FakeNode();
  mountPlayerPresenceBadge(anchor,status,"status",{documentRef});mountPlayerPresenceBadge(anchor,ready,"readiness",{documentRef});
  assert.match(documentRef.head.children[0].textContent,/slot="readiness"\]\{order:10\}/);
  assert.match(documentRef.head.children[0].textContent,/slot="status"\]\{order:20\}/);
});
