"use strict";

export function normalizeLobbyReadiness(value={}){
  const members=Array.isArray(value.members)?value.members.map((member)=>Object.freeze({
    id:String(member?.id||""),
    isHost:Boolean(member?.isHost),
    connected:Boolean(member?.connected),
    ready:Boolean(member?.ready)
  })).filter((member)=>member.id):[];
  const readyCount=members.filter((member)=>member.ready).length;
  return Object.freeze({
    active:value.active===true,
    members:Object.freeze(members),
    readyCount,
    total:members.length,
    allReady:value.active===true&&members.length>0&&readyCount===members.length
  });
}

export function createLobbyReadinessLayer({
  room,
  documentRef=globalThis.document,
  notify=(message)=>globalThis.alert?.(message)
}={}){
  if(!documentRef?.body||!room?.setLobbyReady||!room?.subscribeLobbyReadiness){
    return Object.freeze({sync(){},receive(){},refresh(){},destroy(){},snapshot:()=>normalizeLobbyReadiness()});
  }
  const style=documentRef.createElement("style");style.dataset.lobbyReadinessStyle="";style.textContent=`
    .shared-lobby-ready-control{display:inline-flex!important;align-items:center;justify-content:center;min-height:30px!important;margin-left:6px;padding:5px 10px!important;border:1px solid var(--lobby-ready-border,var(--line,rgba(120,120,120,.35)))!important;border-radius:999px!important;color:var(--lobby-ready-text,var(--ink,inherit))!important;background:var(--lobby-ready-bg,var(--panel,rgba(255,255,255,.88)))!important;font:700 12px/1.1 var(--lobby-ready-font,inherit)!important;white-space:nowrap;cursor:pointer}.shared-lobby-ready-control[hidden]{display:none!important}.shared-lobby-ready-control[data-host="true"]{cursor:default}.shared-lobby-ready-control[data-ready="true"]{border-color:var(--lobby-ready-accent,var(--accent,#4d9b67))!important;box-shadow:0 0 0 2px color-mix(in srgb,var(--lobby-ready-accent,var(--accent,#4d9b67)) 20%,transparent)}
    .shared-lobby-ready-host{position:relative!important}.shared-lobby-ready-badge{position:absolute;z-index:7;left:6px;bottom:6px;display:inline-flex;align-items:center;gap:4px;max-width:calc(100% - 12px);padding:3px 7px;border:1px solid var(--lobby-ready-badge-border,rgba(255,255,255,.42));border-radius:999px;color:var(--lobby-ready-badge-text,#fff);background:var(--lobby-ready-waiting-bg,rgba(138,71,34,.94));box-shadow:0 4px 12px rgba(0,0,0,.18);font:700 11px/1.15 var(--lobby-ready-font,inherit);white-space:nowrap;pointer-events:none;backdrop-filter:blur(5px)}.shared-lobby-ready-badge[data-ready="true"]{background:var(--lobby-ready-badge-bg,rgba(48,117,72,.92))}.shared-lobby-player-ready{outline:2px solid var(--lobby-ready-accent,var(--accent,#4d9b67))!important;outline-offset:2px}.shared-lobby-player-waiting{outline:2px dashed var(--lobby-waiting-accent,#e27b3f)!important;outline-offset:3px;animation:shared-lobby-waiting-pulse 1.35s ease-in-out infinite}.shared-lobby-all-ready{box-shadow:0 0 0 3px color-mix(in srgb,var(--lobby-ready-accent,var(--accent,#4d9b67)) 25%,transparent)!important}.shared-lobby-readiness-blocked{filter:saturate(.65);cursor:not-allowed!important}@keyframes shared-lobby-waiting-pulse{0%,100%{outline-color:rgba(226,123,63,.48)}50%{outline-color:rgba(255,176,77,1)}}
    @media(max-width:520px){.shared-lobby-ready-control{min-width:30px!important;padding:5px 8px!important}.shared-lobby-ready-badge{left:4px;bottom:4px;padding:3px 5px;font-size:10px}.shared-lobby-ready-badge .ready-label{display:none}}@media(prefers-reduced-motion:reduce){.shared-lobby-player-waiting{animation:none}}
  `;documentRef.head?.append(style);
  const control=documentRef.createElement("button");control.type="button";control.className="shared-lobby-ready-control";control.hidden=true;control.setAttribute("aria-label","准备状态");
  const statusNode=documentRef.getElementById?.("connectionStatus");if(statusNode?.insertAdjacentElement)statusNode.insertAdjacentElement("afterend",control);else documentRef.body.append(control);
  let model=normalizeLobbyReadiness(),selfId="",role="",sending=false;const registrations=new Set();
  function findAnchor(memberId){if(!memberId)return null;const escaped=globalThis.CSS?.escape?globalThis.CSS.escape(memberId):memberId.replace(/["\\]/g,"\\$&");return documentRef.querySelector?.(`[data-player-anchor="${escaped}"]`)||documentRef.querySelector?.(`[data-player-id="${escaped}"]`)||null;}
  function clearBadges(){for(const badge of documentRef.querySelectorAll?.(".shared-lobby-ready-badge")||[]){const host=badge.parentNode;host?.classList?.remove("shared-lobby-ready-host");host?.classList?.remove("shared-lobby-player-ready");host?.classList?.remove("shared-lobby-player-waiting");badge.remove();}}
  function syncStartButton(){const start=documentRef.getElementById?.("startGameButton");if(!start)return;const blocked=model.active&&!model.allReady;start.classList?.toggle?.("shared-lobby-all-ready",model.active&&model.allReady);start.classList?.toggle?.("shared-lobby-readiness-blocked",blocked);start.setAttribute?.("aria-disabled",String(blocked));if(model.active){start.dataset.lobbyReadiness=`${model.readyCount}/${model.total}`;start.title=model.allReady?"所有正式玩家都已准备":`仍有玩家未准备（${model.readyCount}/${model.total}）`;}else{delete start.dataset.lobbyReadiness;start.classList?.remove?.("shared-lobby-readiness-blocked");start.setAttribute?.("aria-disabled","false");if(start.title?.startsWith("仍有玩家未准备")||start.title==="所有正式玩家都已准备")start.title="";}}
  function refresh(){
    clearBadges();
    const self=model.members.find((member)=>member.id===selfId);
    control.hidden=!model.active||role==="spectator";
    control.dataset.host=String(Boolean(self?.isHost));control.dataset.ready=String(Boolean(self?.ready));
    if(self?.isHost){control.textContent=`准备 ${model.readyCount}/${model.total}`;control.disabled=true;}
    else{control.textContent=self?.ready?"✓ 已准备":"○ 点击准备";control.disabled=sending||!self?.connected;}
    if(model.active){for(const member of model.members){const anchor=findAnchor(member.id);if(!anchor)continue;const badge=documentRef.createElement("span");badge.className="shared-lobby-ready-badge";badge.dataset.ready=String(member.ready);const icon=documentRef.createElement("span"),label=documentRef.createElement("span");icon.textContent=member.ready?"✓":"!";label.className="ready-label";label.textContent=member.isHost?(member.ready?"房主就绪":"房主离线"):(member.ready?"已准备":member.connected?"未准备":"离线");badge.append(icon,label);anchor.classList?.add("shared-lobby-ready-host");anchor.classList?.add(member.ready?"shared-lobby-player-ready":"shared-lobby-player-waiting");anchor.append(badge);}}
    syncStartButton();
  }
  function sync(view,snapshot={}){selfId=String(view?.selfId||snapshot.playerId||"");role=String(view?.roomRole||snapshot.memberRole||"");model=normalizeLobbyReadiness(view?.lobbyReadiness);const self=model.members.find((member)=>member.id===selfId),registrationKey=`${snapshot.roomCode||"room"}:${selfId}`;if(model.active&&role==="player"&&self&&!self.isHost&&self.connected&&!registrations.has(registrationKey)){registrations.add(registrationKey);sending=true;room.setLobbyReady(self.ready).catch(()=>registrations.delete(registrationKey)).finally(()=>{sending=false;refresh();});}queueMicrotask(refresh);}
  function receive(value){model=normalizeLobbyReadiness(value);refresh();}
  async function toggleReady(){const self=model.members.find((member)=>member.id===selfId);if(sending||!model.active||role==="spectator"||self?.isHost||!self?.connected)return;sending=true;refresh();try{await room.setLobbyReady(!self.ready);}catch(error){notify(`修改准备状态失败：${error?.message||"请稍后重试"}`);}finally{sending=false;refresh();}}
  function guardStart(event){if(!model.active||model.allReady)return;event.preventDefault?.();event.stopImmediatePropagation?.();notify(`仍有玩家未准备（${model.readyCount}/${model.total}），暂时不能开始游戏。`);}
  const unsubscribe=room.subscribeLobbyReadiness(receive);control.addEventListener("click",toggleReady);documentRef.getElementById?.("startGameButton")?.addEventListener?.("click",guardStart,true);
  return Object.freeze({sync,receive,refresh,snapshot:()=>model,destroy(){unsubscribe?.();clearBadges();const start=documentRef.getElementById?.("startGameButton");start?.classList?.remove?.("shared-lobby-all-ready");start?.classList?.remove?.("shared-lobby-readiness-blocked");start?.removeEventListener?.("click",guardStart,true);control.remove();style.remove();}});
}
