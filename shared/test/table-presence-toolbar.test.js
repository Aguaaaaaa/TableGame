"use strict";

import assert from "node:assert/strict";
import test from "node:test";
import { ensureTablePresenceToolbar, mountTablePresenceTool } from "../client/table-presence-toolbar.js";

class FakeClassList{
  constructor(node){this.node=node;}
  add(name){const values=new Set(String(this.node.className||"").split(/\s+/).filter(Boolean));values.add(name);this.node.className=[...values].join(" ");}
  contains(name){return String(this.node.className||"").split(/\s+/).includes(name);}
}
class FakeNode{
  constructor(className=""){this.className=className;this.classList=new FakeClassList(this);this.children=[];this.dataset={};this.style={setProperty:(key,value)=>{this.style[key]=value;}};this.attributes=new Map();this.isConnected=true;}
  append(...nodes){for(const node of nodes){node.parentNode?.removeChild?.(node);node.parentNode=this;this.children.push(node);}}
  insertBefore(node,before){node.parentNode?.removeChild?.(node);const index=this.children.indexOf(before);node.parentNode=this;if(index<0)this.children.push(node);else this.children.splice(index,0,node);}
  removeChild(node){this.children=this.children.filter((child)=>child!==node);if(node.parentNode===this)node.parentNode=null;}
  setAttribute(name,value){this.attributes.set(name,String(value));}
}
class FakeDocument{
  constructor({wrapped=false}={}){this.body=new FakeNode();this.head=new FakeNode();this.meta=new FakeNode("header-meta");this.status=new FakeNode();this.status.id="connectionStatus";this.body.append(this.meta);if(wrapped){this.statusBox=new FakeNode("status-box");this.statusBox.append(this.status);this.meta.append(this.statusBox);}else this.meta.append(this.status);}
  createElement(){return new FakeNode();}
  getElementById(id){return id==="connectionStatus"?this.status:null;}
}

test("direct title-bar statuses and tools become one atomic toolbar",()=>{
  const documentRef=new FakeDocument();
  const reaction=new FakeNode(),attention=new FakeNode();
  const toolbar=mountTablePresenceTool(reaction,"reaction",{documentRef});
  mountTablePresenceTool(attention,"attention",{documentRef});
  assert.equal(documentRef.meta.children.length,1,"space-between headers see one tool group instead of several siblings");
  assert.equal(documentRef.meta.children[0],toolbar);
  assert.deepEqual(toolbar.children,[documentRef.status,reaction,attention]);
  assert.equal(reaction.dataset.sharedPresenceTool,"reaction");
  assert.equal(attention.style.order,"40");
});

test("a themed status wrapper stays intact but no longer traps buttons vertically",()=>{
  const documentRef=new FakeDocument({wrapped:true});
  const toolbar=ensureTablePresenceToolbar(documentRef);
  const statusButton=new FakeNode();mountTablePresenceTool(statusButton,"status",{documentRef});
  assert.equal(documentRef.meta.children.length,1);
  assert.equal(toolbar.children[0],documentRef.statusBox);
  assert.equal(documentRef.statusBox.children[0],documentRef.status);
  assert.equal(toolbar.children[1],statusButton);
  assert.match(documentRef.head.children[0].textContent,/display:inline-flex!important/);
});

