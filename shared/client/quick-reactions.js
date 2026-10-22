"use strict";

export const QUICK_REACTIONS=Object.freeze([
  Object.freeze({id:"agree",emoji:"👍",label:"赞同"}),
  Object.freeze({id:"applaud",emoji:"👏",label:"漂亮"}),
  Object.freeze({id:"laugh",emoji:"😄",label:"哈哈"}),
  Object.freeze({id:"wow",emoji:"😮",label:"震惊"}),
  Object.freeze({id:"thinking",emoji:"🤔",label:"让我想想"}),
  Object.freeze({id:"question",emoji:"❓",label:"等等"})
]);

const DEFINITIONS=new Map(QUICK_REACTIONS.map((reaction)=>[reaction.id,reaction]));

export function normalizeQuickReaction(reaction){
  const definition=DEFINITIONS.get(String(reaction?.id||""));
  if(!definition)return null;
  return Object.freeze({
    ...definition,
    sequence:Number(reaction.sequence)||0,
    senderId:String(reaction.senderId||""),
    senderName:String(reaction.senderName||"玩家").slice(0,20),
    senderRole:reaction.senderRole==="spectator"?"spectator":"player",
    createdAt:Number(reaction.createdAt)||0
  });
}

export function createQuickReactionLayer({
  room,
  documentRef=globalThis.document,
  windowRef=globalThis.window,
  notify=(message)=>globalThis.alert?.(message),
  setTimeoutImpl=globalThis.setTimeout,
  clearTimeoutImpl=globalThis.clearTimeout
}={}){
  if(!documentRef?.body||!room?.sendReaction||!room?.subscribeReactions){
    return Object.freeze({receive(){},open(){},close(){},destroy(){},activeCount:()=>0});
  }
  const style=documentRef.createElement("style");
  style.dataset.quickReactionsStyle="";
  style.textContent=`
    .shared-quick-reaction-button{position:relative;display:inline-grid;place-items:center;min-width:30px!important;width:30px;height:30px!important;margin-left:6px;padding:0!important;border:1px solid var(--quick-reaction-border,var(--line,rgba(120,120,120,.35)))!important;border-radius:50%!important;color:var(--quick-reaction-text,var(--ink,inherit))!important;background:var(--quick-reaction-bg,var(--panel,rgba(255,255,255,.88)))!important;font:700 16px/1 sans-serif!important;cursor:pointer}
    .shared-quick-reaction-panel{position:fixed;z-index:1210;display:grid;grid-template-columns:repeat(3,minmax(64px,1fr));gap:7px;width:min(286px,calc(100vw - 20px));padding:10px;border:1px solid var(--quick-reaction-border,var(--line,#bbb));border-radius:var(--quick-reaction-radius,12px);color:var(--quick-reaction-text,var(--ink,#222));background:var(--quick-reaction-bg,var(--panel,#fff));box-shadow:0 16px 38px rgba(0,0,0,.25);font:13px/1.25 var(--quick-reaction-font,inherit)}
    .shared-quick-reaction-panel[hidden]{display:none!important}.shared-quick-reaction-choice{display:grid!important;grid-template-columns:auto 1fr;align-items:center;gap:5px;min-height:42px!important;padding:6px 8px!important;border:1px solid var(--quick-reaction-border,var(--line,#bbb))!important;border-radius:9px!important;color:inherit!important;background:var(--quick-reaction-choice-bg,rgba(128,128,128,.1))!important;background:color-mix(in srgb,var(--quick-reaction-bg,var(--panel,#fff)) 82%,var(--quick-reaction-accent,var(--accent,#d28a32)))!important;font:inherit!important;cursor:pointer}.shared-quick-reaction-choice:hover,.shared-quick-reaction-choice:focus-visible{border-color:var(--quick-reaction-accent,var(--accent,#d28a32))!important;transform:translateY(-1px)}.shared-quick-reaction-choice span:first-child{font-size:20px}
    .shared-quick-reaction-stage{position:fixed;inset:0;z-index:1190;overflow:hidden;pointer-events:none}.shared-quick-reaction-pop{position:fixed;display:flex;align-items:center;gap:7px;max-width:min(240px,70vw);padding:8px 11px;border:1px solid var(--quick-reaction-border,var(--line,rgba(255,255,255,.5)));border-radius:999px;color:var(--quick-reaction-pop-text,#fff);background:var(--quick-reaction-pop-bg,rgba(24,24,29,.88));box-shadow:0 9px 24px rgba(0,0,0,.28);font:700 13px/1.2 var(--quick-reaction-font,inherit);transform:translate(-50%,-50%);animation:shared-quick-reaction-pop 2.35s ease-out both;backdrop-filter:blur(7px)}.shared-quick-reaction-pop b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.shared-quick-reaction-pop .emoji{font-size:24px}.shared-quick-reaction-pop[data-spectator="true"]{border-style:dashed}
    @keyframes shared-quick-reaction-pop{0%{opacity:0;transform:translate(-50%,-25%) scale(.76)}12%{opacity:1;transform:translate(-50%,-55%) scale(1.08)}22%,72%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-105%) scale(.94)}}
    @media(max-width:520px){.shared-quick-reaction-panel{grid-template-columns:repeat(2,minmax(90px,1fr))}.shared-quick-reaction-pop{font-size:12px}.shared-quick-reaction-pop .emoji{font-size:21px}}
    @media(prefers-reduced-motion:reduce){.shared-quick-reaction-choice:hover{transform:none}.shared-quick-reaction-pop{animation:shared-quick-reaction-fade 1.8s linear both}@keyframes shared-quick-reaction-fade{0%,100%{opacity:0}10%,82%{opacity:1}}}
  `;
  documentRef.head?.append(style);

  const button=documentRef.createElement("button");
  button.type="button";button.className="shared-quick-reaction-button";button.textContent="☺";
  button.title="发送快捷反应";button.setAttribute("aria-label","发送快捷反应");button.setAttribute("aria-expanded","false");
  const statusNode=documentRef.getElementById?.("connectionStatus");
  if(statusNode?.insertAdjacentElement)statusNode.insertAdjacentElement("afterend",button);else documentRef.body.append(button);

  const panel=documentRef.createElement("section");
  panel.className="shared-quick-reaction-panel";panel.hidden=true;panel.setAttribute("aria-label","快捷反应");
  for(const reaction of QUICK_REACTIONS){
    const choice=documentRef.createElement("button");choice.type="button";choice.className="shared-quick-reaction-choice";choice.dataset.reactionId=reaction.id;
    const emoji=documentRef.createElement("span"),label=documentRef.createElement("span");emoji.textContent=reaction.emoji;label.textContent=reaction.label;choice.append(emoji,label);panel.append(choice);
  }
  documentRef.body.append(panel);
  const stage=documentRef.createElement("div");stage.className="shared-quick-reaction-stage";stage.setAttribute("aria-live","polite");documentRef.body.append(stage);

  const active=new Map();
  let sendLocked=false,sendTimer=null;
  function positionPanel(){const rect=button.getBoundingClientRect(),margin=8;panel.hidden=false;panel.style.visibility="hidden";const width=panel.offsetWidth,height=panel.offsetHeight,viewportWidth=windowRef?.innerWidth||rect.right+width,viewportHeight=windowRef?.innerHeight||rect.bottom+height;panel.style.left=`${Math.max(margin,Math.min(viewportWidth-width-margin,rect.right-width))}px`;panel.style.top=`${rect.bottom+8+height<=viewportHeight-margin?rect.bottom+8:Math.max(margin,rect.top-height-8)}px`;panel.style.visibility="";}
  function close(){panel.hidden=true;button.setAttribute("aria-expanded","false");}
  function open(){positionPanel();button.setAttribute("aria-expanded","true");}
  function toggle(){if(panel.hidden)open();else close();}
  function findPlayerAnchor(id){
    if(!id)return null;
    const escaped=globalThis.CSS?.escape?globalThis.CSS.escape(id):id.replace(/["\\]/g,"\\$&");
    return documentRef.querySelector?.(`[data-player-anchor="${escaped}"]`)
      ||documentRef.querySelector?.(`[data-player-id="${escaped}"]`)
      ||documentRef.querySelector?.(`[data-id="${escaped}"]`)
      ||null;
  }
  function removeActive(key){const entry=active.get(key);if(!entry)return;clearTimeoutImpl?.(entry.timer);entry.node.remove();active.delete(key);}
  function receive(payload){
    const reaction=normalizeQuickReaction(payload);if(!reaction)return;
    const key=reaction.senderId||`anonymous-${reaction.sequence}`;removeActive(key);
    while(active.size>=5)removeActive(active.keys().next().value);
    const pop=documentRef.createElement("div");pop.className="shared-quick-reaction-pop";pop.dataset.spectator=String(reaction.senderRole==="spectator");
    const emoji=documentRef.createElement("span"),name=documentRef.createElement("b"),label=documentRef.createElement("span");emoji.className="emoji";emoji.textContent=reaction.emoji;name.textContent=reaction.senderName;label.textContent=reaction.label;pop.append(emoji,name,label);stage.append(pop);
    const anchor=findPlayerAnchor(reaction.senderId),rect=anchor?.getBoundingClientRect?.();
    const viewportWidth=windowRef?.innerWidth||800,viewportHeight=windowRef?.innerHeight||600;
    pop.style.left=`${rect?Math.max(70,Math.min(viewportWidth-70,rect.left+rect.width/2)):viewportWidth/2}px`;
    pop.style.top=`${rect?Math.max(55,Math.min(viewportHeight-55,rect.top+Math.min(28,rect.height/2))):viewportHeight*.78}px`;
    const timer=setTimeoutImpl?.(()=>removeActive(key),2500);active.set(key,{node:pop,timer});
  }
  async function send(reactionId){
    if(sendLocked||!DEFINITIONS.has(reactionId))return;
    sendLocked=true;close();
    for(const choice of panel.children)choice.disabled=true;
    try{await room.sendReaction(reactionId);}catch(error){notify(`发送快捷反应失败：${error?.message||"请稍后重试"}`);}
    finally{sendTimer=setTimeoutImpl?.(()=>{sendLocked=false;for(const choice of panel.children)choice.disabled=false;},800);}
  }
  function onPanelClick(event){const reactionId=event.target?.closest?.("[data-reaction-id]")?.dataset?.reactionId||event.target?.dataset?.reactionId;if(reactionId)send(reactionId);}
  function onDocumentClick(event){if(panel.hidden||panel.contains(event.target)||event.target===button)return;close();}
  function onKeyDown(event){if(event.key==="Escape")close();}
  const unsubscribe=room.subscribeReactions(receive);
  button.addEventListener("click",toggle);panel.addEventListener("click",onPanelClick);documentRef.addEventListener("click",onDocumentClick);documentRef.addEventListener("keydown",onKeyDown);windowRef?.addEventListener?.("resize",close);windowRef?.addEventListener?.("scroll",close,true);

  return Object.freeze({
    receive,open,close,activeCount:()=>active.size,
    destroy(){unsubscribe?.();clearTimeoutImpl?.(sendTimer);for(const key of [...active.keys()])removeActive(key);button.remove();panel.remove();stage.remove();style.remove();documentRef.removeEventListener("click",onDocumentClick);documentRef.removeEventListener("keydown",onKeyDown);windowRef?.removeEventListener?.("resize",close);windowRef?.removeEventListener?.("scroll",close,true);}
  });
}
