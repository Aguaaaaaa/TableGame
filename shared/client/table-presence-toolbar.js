"use strict";

const TOOL_ORDER=Object.freeze({readiness:10,status:20,reaction:30,attention:40});
const mounted=new WeakMap();

function hasClass(node,name){
  return Boolean(node?.classList?.contains?.(name)||String(node?.className||"").split(/\s+/).includes(name));
}

function appendMoving(parent,node){
  if(!parent||!node)return;
  parent.append(node);
}

export function ensureTablePresenceToolbar(documentRef=globalThis.document){
  if(!documentRef?.body)return null;
  const existing=mounted.get(documentRef);
  if(existing&&existing.isConnected!==false)return existing;

  const style=documentRef.createElement("style");
  style.dataset.tablePresenceToolbarStyle="";
  style.textContent=`
    .shared-table-presence-toolbar{display:inline-flex!important;flex:0 0 auto!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;width:auto!important;max-width:100%;min-width:0;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;vertical-align:middle;white-space:nowrap}
    .shared-table-presence-toolbar>.shared-table-presence-status{order:0;flex:0 1 auto!important;min-width:0;max-width:min(240px,42vw);margin:0!important}.shared-table-presence-toolbar>.shared-table-presence-status #connectionStatus,.shared-table-presence-toolbar>#connectionStatus{display:block;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .shared-table-presence-toolbar>[data-shared-presence-tool]{flex:0 0 auto!important;margin:0!important}.shared-table-presence-toolbar>[data-shared-presence-tool="readiness"]{order:10}.shared-table-presence-toolbar>[data-shared-presence-tool="status"]{order:20}.shared-table-presence-toolbar>[data-shared-presence-tool="reaction"]{order:30}.shared-table-presence-toolbar>[data-shared-presence-tool="attention"]{order:40}
    @media(max-width:520px){.shared-table-presence-toolbar{gap:5px!important}.shared-table-presence-toolbar>.shared-table-presence-status{max-width:min(150px,40vw)}}
  `;
  documentRef.head?.append(style);

  const toolbar=documentRef.createElement("div");
  toolbar.className="shared-table-presence-toolbar";
  toolbar.setAttribute("role","group");
  toolbar.setAttribute("aria-label","连接状态与桌边工具");
  const status=documentRef.getElementById?.("connectionStatus");
  const parent=status?.parentElement||status?.parentNode;
  const statusHost=parent&&hasClass(parent,"status-box")&&Number(parent.children?.length)===1?parent:status;
  const sourceParent=statusHost?.parentElement||statusHost?.parentNode;
  if(sourceParent?.insertBefore){
    sourceParent.insertBefore(toolbar,statusHost);
    appendMoving(toolbar,statusHost);
  }else if(statusHost?.insertAdjacentElement){
    statusHost.insertAdjacentElement("afterend",toolbar);
  }else{
    documentRef.body.append(toolbar);
  }
  statusHost?.classList?.add?.("shared-table-presence-status");
  mounted.set(documentRef,toolbar);
  return toolbar;
}

export function mountTablePresenceTool(node,key,{documentRef=globalThis.document}={}){
  if(!node)return null;
  const toolbar=ensureTablePresenceToolbar(documentRef);
  if(!toolbar)return null;
  const normalized=Object.hasOwn(TOOL_ORDER,key)?key:"other";
  node.dataset.sharedPresenceTool=normalized;
  node.style?.setProperty?.("order",String(TOOL_ORDER[normalized]??90));
  toolbar.append(node);
  return toolbar;
}

