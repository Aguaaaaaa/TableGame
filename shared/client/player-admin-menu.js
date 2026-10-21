"use strict";

const TRIGGER_SELECTOR="[data-kick],[data-kick-player]";
const ANCHOR_SELECTOR="[data-player-id],[data-player-panel],[data-player-anchor],[data-id],[data-player],.traveler,.player-seat,.player,.seat,.farm,.player-card,.player-chip";
const INTERACTIVE_SELECTOR="button,a,input,select,textarea,label,[role='button']";

function targetId(control){return String(control?.dataset?.kick||control?.dataset?.kickPlayer||"");}
function available(control){return Boolean(control?.isConnected&&!control.disabled&&!control.classList?.contains("hidden")&&control.getAttribute?.("aria-hidden")!=="true");}

export function createSharedPlayerAdminMenu({room,getView=()=>null,notify=(message)=>globalThis.alert?.(message),confirmAction=(message)=>globalThis.confirm?.(message)??true,documentRef=globalThis.document,windowRef=globalThis.window}={}){
  if(!documentRef?.body||!room?.kick)return Object.freeze({close(){},refresh(){},destroy(){}});
  const style=documentRef.createElement("style");style.dataset.sharedPlayerAdminStyle="";style.textContent=`
    .shared-player-admin-trigger{min-width:26px!important;width:26px!important;height:24px!important;padding:0!important;font-size:.72rem!important;line-height:1!important;letter-spacing:.08em}
    .shared-player-admin-anchor{cursor:context-menu}
    .shared-player-admin-anchor.shared-player-admin-open{outline:2px solid var(--player-admin-accent,var(--accent,var(--primary,#66717d)));outline-offset:2px}
    .shared-player-admin-menu{position:fixed;z-index:1000;display:grid;gap:var(--player-admin-gap,7px);width:var(--player-admin-width,176px);padding:var(--player-admin-padding,10px);border:1px solid var(--player-admin-border,var(--line,var(--border,#b8bdc2)));border-radius:var(--player-admin-radius,8px);color:var(--player-admin-text,var(--ink,var(--text,#202428)));background:var(--player-admin-bg,var(--panel,var(--surface,#f7f7f5)));box-shadow:var(--player-admin-shadow,0 12px 28px rgba(20,24,28,.22));font-family:var(--player-admin-font,inherit);backdrop-filter:var(--player-admin-backdrop-filter,none)}
    .shared-player-admin-menu[hidden]{display:none!important}
    .shared-player-admin-menu small{color:var(--player-admin-muted,var(--muted,var(--text-muted,#606870)));font:700 .58rem var(--player-admin-font,inherit);letter-spacing:.08em}
    .shared-player-admin-menu>b{overflow:hidden;font-size:.78rem;text-overflow:ellipsis;white-space:nowrap}
    .shared-player-admin-menu button{width:100%;padding:7px 9px;color:var(--player-admin-danger-text,#fff);border:1px solid var(--player-admin-danger-border,var(--danger,#98434a));border-radius:var(--player-admin-button-radius,6px);background:var(--player-admin-danger-bg,var(--danger,#98434a));font:700 .7rem var(--player-admin-font,inherit);cursor:pointer}
    .shared-player-admin-menu button:hover{filter:brightness(var(--player-admin-hover-brightness,.94))}
    .shared-player-admin-menu button:focus-visible{outline:2px solid var(--player-admin-accent,var(--accent,var(--primary,#66717d)));outline-offset:2px}
    .shared-player-admin-menu button:disabled{cursor:wait;opacity:.62}`;
  documentRef.head?.append(style);
  const menu=documentRef.createElement("div");menu.className="shared-player-admin-menu";menu.hidden=true;menu.setAttribute("role","menu");menu.setAttribute("aria-label","玩家管理菜单");
  const kicker=documentRef.createElement("small");kicker.textContent="玩家管理";const title=documentRef.createElement("b");const remove=documentRef.createElement("button");remove.type="button";remove.setAttribute("role","menuitem");remove.textContent="移除该玩家";menu.append(kicker,title,remove);documentRef.body.append(menu);
  let anchor=null,selectedId="";

  function close(){menu.hidden=true;selectedId="";anchor?.classList?.remove("shared-player-admin-open");anchor=null;}
  function playerFor(id){return (getView()?.players||[]).find((player)=>String(player.id)===id)||null;}
  function position(nextAnchor){const rect=nextAnchor.getBoundingClientRect(),gap=7,margin=8;widthGuard();const width=menu.offsetWidth,height=menu.offsetHeight,viewportWidth=windowRef?.innerWidth||rect.right+width,viewportHeight=windowRef?.innerHeight||rect.bottom+height,left=Math.max(margin,Math.min(viewportWidth-width-margin,rect.left+rect.width/2-width/2)),below=rect.bottom+gap,top=below+height<=viewportHeight-margin?below:Math.max(margin,rect.top-height-gap);menu.style.left=`${left}px`;menu.style.top=`${top}px`;}
  function widthGuard(){menu.style.visibility="hidden";menu.hidden=false;}
  function open(control,nextAnchor){const id=targetId(control),player=playerFor(id);if(!id||!player||player.isHost)return false;close();selectedId=id;anchor=nextAnchor;title.textContent=player.name;anchor?.classList?.add("shared-player-admin-open");position(anchor||control);menu.style.visibility="";remove.focus?.({preventScroll:true});return true;}
  function refresh(){documentRef.querySelectorAll(TRIGGER_SELECTOR).forEach((control)=>{control.classList.add("shared-player-admin-trigger");if(control.textContent!=="•••")control.textContent="•••";control.title="管理玩家";control.setAttribute("aria-label","管理玩家");const nextAnchor=control.closest(ANCHOR_SELECTOR)||control.parentElement;if(nextAnchor)nextAnchor.classList.add("shared-player-admin-anchor");});}
  async function removeSelected(){const player=playerFor(selectedId);if(!player||player.isHost){close();return;}if(!confirmAction(`确定将 ${player.name} 移出房间吗？\n该玩家当前的重连身份将失效，空出的席位可以由其他玩家加入。`))return;const id=selectedId;remove.disabled=true;close();try{await room.kick(id);}catch(error){notify(`移出失败：${error?.message||"请稍后重试"}`);}finally{remove.disabled=false;}}
  function onClick(event){if(menu.contains(event.target))return;const direct=event.target.closest?.(TRIGGER_SELECTOR);if(direct&&available(direct)){event.preventDefault();event.stopImmediatePropagation();open(direct,direct.closest(ANCHOR_SELECTOR)||direct);return;}const nextAnchor=event.target.closest?.(ANCHOR_SELECTOR);if(!nextAnchor)return close();if(getView()?.phase!=="lobby"||event.target.closest?.(INTERACTIVE_SELECTOR))return;const control=[...nextAnchor.querySelectorAll(TRIGGER_SELECTOR)].find(available);if(!control)return;event.preventDefault();event.stopImmediatePropagation();open(control,nextAnchor);}
  function onPointerDown(event){if(!menu.hidden&&!menu.contains(event.target)&&!event.target.closest?.(ANCHOR_SELECTOR))close();}
  function onKeyDown(event){if(event.key==="Escape")close();}
  remove.onclick=removeSelected;documentRef.addEventListener("click",onClick,true);documentRef.addEventListener("pointerdown",onPointerDown,true);documentRef.addEventListener("keydown",onKeyDown);windowRef?.addEventListener?.("resize",close);windowRef?.addEventListener?.("scroll",close,true);
  const Observer=windowRef?.MutationObserver||globalThis.MutationObserver;let refreshQueued=false;const observer=Observer?new Observer(()=>{if(refreshQueued)return;refreshQueued=true;queueMicrotask(()=>{refreshQueued=false;refresh();});}):null;observer?.observe(documentRef.body,{childList:true,subtree:true});refresh();
  return Object.freeze({close,refresh,destroy(){observer?.disconnect();close();menu.remove();style.remove();documentRef.removeEventListener("click",onClick,true);documentRef.removeEventListener("pointerdown",onPointerDown,true);documentRef.removeEventListener("keydown",onKeyDown);windowRef?.removeEventListener?.("resize",close);windowRef?.removeEventListener?.("scroll",close,true);}});
}

