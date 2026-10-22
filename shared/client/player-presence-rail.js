"use strict";

const mountedStyles=new WeakMap();

function childrenOf(node){return Array.from(node?.children||[]);}

function ensureStyles(documentRef){
  if(!documentRef?.head||mountedStyles.has(documentRef))return mountedStyles.get(documentRef)||null;
  const style=documentRef.createElement("style");style.dataset.playerPresenceRailStyle="";style.textContent=`
    .shared-player-presence-anchor{position:relative!important;padding-bottom:var(--shared-player-presence-reserve,38px)!important}
    .shared-player-presence-rail{position:absolute!important;z-index:8;left:6px;right:6px;bottom:6px;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:5px!important;min-width:0!important;height:25px!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;pointer-events:none}
    .shared-player-presence-rail>[data-shared-player-presence-slot]{position:static!important;inset:auto!important;flex:0 1 auto!important;min-width:0;max-width:calc(50% - 3px)!important;margin:0!important;transform:none!important;overflow:hidden;text-overflow:ellipsis}.shared-player-presence-rail>[data-shared-player-presence-slot="readiness"]{order:10}.shared-player-presence-rail>[data-shared-player-presence-slot="status"]{order:20}
    .shared-player-presence-rail[data-compact="true"]{gap:3px!important}.shared-player-presence-rail[data-compact="true"]>[data-shared-player-presence-slot]{flex:0 0 auto!important;max-width:28px!important;padding-inline:6px!important}.shared-player-presence-rail[data-compact="true"] .ready-label,.shared-player-presence-rail[data-compact="true"] .status-label{display:none!important}
    @media(max-width:520px){.shared-player-presence-anchor{--shared-player-presence-reserve:34px}.shared-player-presence-rail{left:4px;right:4px;bottom:4px;height:24px!important}}
  `;documentRef.head.append(style);mountedStyles.set(documentRef,style);return style;
}

function findRail(anchor){return childrenOf(anchor).find((child)=>child?.dataset?.sharedPlayerPresenceRail==="true")||null;}

function updateDensity(anchor,rail){
  const width=Number(anchor?.getBoundingClientRect?.()?.width)||0;
  rail.dataset.compact=String(width>0&&width<210);
}

export function ensurePlayerPresenceRail(anchor,{documentRef=globalThis.document}={}){
  if(!anchor||!documentRef?.createElement)return null;
  ensureStyles(documentRef);
  let rail=findRail(anchor);
  if(!rail){rail=documentRef.createElement("div");rail.className="shared-player-presence-rail";rail.dataset.sharedPlayerPresenceRail="true";rail.setAttribute?.("aria-label","玩家公开状态");anchor.append(rail);}
  anchor.classList?.add?.("shared-player-presence-anchor");updateDensity(anchor,rail);return rail;
}

export function mountPlayerPresenceBadge(anchor,badge,slot,{documentRef=globalThis.document}={}){
  if(!anchor||!badge||!slot)return null;
  const rail=ensurePlayerPresenceRail(anchor,{documentRef});if(!rail)return null;
  for(const child of childrenOf(rail)){if(child!==badge&&child?.dataset?.sharedPlayerPresenceSlot===slot)child.remove?.();}
  badge.dataset.sharedPlayerPresenceSlot=slot;rail.append(badge);updateDensity(anchor,rail);return rail;
}

export function unmountPlayerPresenceBadge(badge){
  const rail=badge?.parentNode,anchor=rail?.parentNode;badge?.remove?.();
  if(rail?.dataset?.sharedPlayerPresenceRail==="true"&&!childrenOf(rail).length){rail.remove?.();anchor?.classList?.remove?.("shared-player-presence-anchor");}
}
