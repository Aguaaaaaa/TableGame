"use strict";

import { mountTablePresenceTool } from "./table-presence-toolbar.js";

const STORAGE_KEY="tablegame.turn-attention.v1";
const PASSIVE_PERMISSIONS=new Set([
  "canConfigure","canEnd","canKick","canManage","canNextGame","canNextMatch","canNextRound",
  "canRequestExtension","canRestart","canRestartMatch","canSetCapacity","canSetTargetScore","canSit","canStart"
]);
const PRIORITY_LABELS=[
  [/Vote|vote/,"请完成投票"],
  [/Respond|Challenge|Prove|LoseInfluence|ResolveOwnDying|AcceptPenalty|CloseReveal/,"请处理当前响应"],
  [/Acknowledge/,"请确认你看到的信息"],
  [/Describe|Tell|SubmitClues|SubmitDecoys|CompleteAnswer|ShowMasterAnswer/,"请提交当前内容"],
  [/Guess|Accuse|SpyGuess|MarkCorrectGuesser|ChooseJudgment/,"请作出判断"],
  [/Propose|ChooseTarget|SelectQuestionTarget|Nominate|Assassinate|UseLady/,"请选择目标"],
  [/Bid|Auction|ChooseDividend|Mortgage|Redeem|Sell|PlayMarketAction/,"请处理当前交易"],
  [/StartDice|StopDice|Pilot|Pirate|Plunder/,"轮到你推进当前流程"],
  [/Play|Draw|Discard|Exchange|Place|Move|Order|Select|Choose|Submit|Act|Pass|Quest|UsePower|Call/,"轮到你操作"]
];
const CONTEXT_FIELDS=/^(phase|stage|round|roundNumber|match|matchNumber|turn|turnNumber|currentIndex|currentPlayerId|activePlayerId|leaderId|proposalNumber|questionIndex|actionId|pendingId|windowId|decisionId|rollId|auctionId)$/;

function safeReadSettings(storage,key=STORAGE_KEY){
  const defaults={sound:false,vibration:false,notification:false};
  try{return {...defaults,...JSON.parse(storage?.getItem?.(key)||"{}")};}catch{return defaults;}
}

function safeWriteSettings(storage,key,settings){
  try{storage?.setItem?.(key,JSON.stringify(settings));}catch{/* 浏览器禁用存储时仍保留当前会话设置。 */}
}

function actionPermissionKeys(view){
  if(view?.roomRole==="spectator")return [];
  return Object.entries(view?.permissions||{})
    .filter(([key,value])=>key.startsWith("can")&&value===true&&!PASSIVE_PERMISSIONS.has(key))
    .map(([key])=>key)
    .sort();
}

function attentionLabel(keys){
  const joined=keys.join(" ");
  return PRIORITY_LABELS.find(([pattern])=>pattern.test(joined))?.[1]||"轮到你操作";
}

function contextHints(view){
  const hints={};
  for(const [key,value] of Object.entries(view||{})){
    if(CONTEXT_FIELDS.test(key)&&(typeof value==="string"||typeof value==="number"||typeof value==="boolean"))hints[key]=value;
  }
  return hints;
}

export function deriveTurnAttention(view,{roomCode="",playerId=""}={}){
  const keys=actionPermissionKeys(view);
  if(!keys.length)return Object.freeze({required:false,id:"",title:"",permissionKeys:[]});
  const explicit=view?.attention;
  const id=String(explicit?.id||JSON.stringify({roomCode,playerId:playerId||view?.selfId||"",...contextHints(view),keys}));
  return Object.freeze({
    required:true,
    id,
    title:String(explicit?.title||attentionLabel(keys)),
    body:String(explicit?.body||"牌局正在等待你的操作"),
    permissionKeys:keys
  });
}

export function createTurnAttentionLayer({
  documentRef=globalThis.document,
  windowRef=globalThis.window,
  navigatorRef=globalThis.navigator,
  storage=globalThis.localStorage,
  notificationApi=globalThis.Notification,
  storageKey=STORAGE_KEY,
  derive=deriveTurnAttention,
  audioContextFactory=()=>{const AudioContext=windowRef?.AudioContext||windowRef?.webkitAudioContext;return AudioContext?new AudioContext():null;}
}={}){
  if(!documentRef?.body)return Object.freeze({sync(){},reset(){},refreshHighlight(){},settings(){return{};},updateSettings(){},destroy(){}});
  const originalTitle=documentRef.title||"桌游";
  let current=null,lastNotifiedId="",highlighted=null;
  let settings=safeReadSettings(storage,storageKey);

  const style=documentRef.createElement("style");style.dataset.turnAttentionStyle="";style.textContent=`
    .shared-turn-attention-required{outline:3px solid var(--turn-attention-accent,var(--accent,var(--gold,#e29d35)))!important;outline-offset:3px;box-shadow:0 0 0 6px var(--turn-attention-glow,rgba(226,157,53,.22)),0 0 24px var(--turn-attention-glow,rgba(226,157,53,.22))!important}
    .shared-turn-attention-button{position:relative;display:inline-grid;place-items:center;min-width:30px!important;width:30px;height:30px!important;margin-left:6px;padding:0!important;border:1px solid var(--turn-attention-border,var(--line,rgba(120,120,120,.35)))!important;border-radius:50%!important;color:var(--turn-attention-text,var(--ink,inherit))!important;background:var(--turn-attention-bg,var(--panel,rgba(255,255,255,.88)))!important;font:700 15px/1 sans-serif!important;cursor:pointer}
    .shared-turn-attention-button[data-active="true"]::after{position:absolute;width:7px;height:7px;margin:-22px -22px 0 0;border-radius:50%;content:"";background:var(--turn-attention-accent,var(--accent,var(--gold,#e29d35)))}
    .shared-turn-attention-panel{position:fixed;z-index:1200;display:grid;gap:9px;width:min(260px,calc(100vw - 20px));padding:13px;border:1px solid var(--turn-attention-border,var(--line,#bbb));border-radius:var(--turn-attention-radius,10px);color:var(--turn-attention-text,var(--ink,#222));background:var(--turn-attention-bg,var(--panel,#fff));box-shadow:0 16px 38px rgba(0,0,0,.25);font:13px/1.35 var(--turn-attention-font,inherit)}
    .shared-turn-attention-panel[hidden]{display:none!important}.shared-turn-attention-panel strong{font-size:14px}.shared-turn-attention-panel label{display:flex;align-items:center;justify-content:space-between;gap:12px}.shared-turn-attention-panel small{color:var(--turn-attention-muted,var(--muted,#666))}.shared-turn-attention-panel input{width:18px;height:18px}
    @media(prefers-reduced-motion:reduce){.shared-turn-attention-required{box-shadow:0 0 0 4px var(--turn-attention-glow,rgba(226,157,53,.22))!important}}
  `;documentRef.head?.append(style);

  const button=documentRef.createElement("button");button.type="button";button.className="shared-turn-attention-button";button.textContent="🔔";button.title="行动提醒设置";button.setAttribute("aria-label","行动提醒设置");button.setAttribute("aria-expanded","false");button.dataset.active="false";
  mountTablePresenceTool(button,"attention",{documentRef});
  const panel=documentRef.createElement("section");panel.className="shared-turn-attention-panel";panel.hidden=true;panel.setAttribute("aria-label","行动提醒设置");
  const heading=documentRef.createElement("strong");heading.textContent="行动提醒";
  const note=documentRef.createElement("small");note.textContent="页面标题与行动高亮始终启用，以下设备提醒可以单独选择。";
  panel.append(heading,note);documentRef.body.append(panel);

  const controls={};
  for(const [key,label] of [["sound","提示音"],["vibration","手机轻微震动"],["notification","后台浏览器通知"]]){
    const row=documentRef.createElement("label"),text=documentRef.createElement("span"),input=documentRef.createElement("input");text.textContent=label;input.type="checkbox";input.checked=Boolean(settings[key]);input.dataset.setting=key;row.append(text,input);panel.append(row);controls[key]=input;
  }

  function positionPanel(){const rect=button.getBoundingClientRect(),margin=8;panel.hidden=false;panel.style.visibility="hidden";const width=panel.offsetWidth,height=panel.offsetHeight,viewportWidth=windowRef?.innerWidth||rect.right+width,viewportHeight=windowRef?.innerHeight||rect.bottom+height;panel.style.left=`${Math.max(margin,Math.min(viewportWidth-width-margin,rect.right-width))}px`;panel.style.top=`${rect.bottom+8+height<=viewportHeight-margin?rect.bottom+8:Math.max(margin,rect.top-height-8)}px`;panel.style.visibility="";}
  function closePanel(){panel.hidden=true;button.setAttribute("aria-expanded","false");}
  function togglePanel(){if(panel.hidden){positionPanel();button.setAttribute("aria-expanded","true");}else closePanel();}
  function refreshControls(){for(const [key,input] of Object.entries(controls))input.checked=Boolean(settings[key]);}
  async function setSetting(key,value){
    if(key==="notification"&&value){
      if(!notificationApi||notificationApi.permission==="denied")value=false;
      else if(notificationApi.permission!=="granted")value=(await notificationApi.requestPermission())==="granted";
    }
    settings={...settings,[key]:Boolean(value)};safeWriteSettings(storage,storageKey,settings);refreshControls();
    if(key==="sound"&&value)playSound();
    return settings;
  }

  function playSound(){if(!settings.sound)return;try{const context=audioContextFactory();if(!context)return;const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type="sine";oscillator.frequency.value=660;gain.gain.setValueAtTime(.0001,context.currentTime);gain.gain.exponentialRampToValueAtTime(.08,context.currentTime+.02);gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+.22);oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.24);oscillator.addEventListener?.("ended",()=>context.close?.());}catch{/* 音频策略拒绝时安静降级。 */}}
  function notifyDevice(state){
    playSound();
    if(settings.vibration)try{navigatorRef?.vibrate?.(60);}catch{/* 不支持震动时安静降级。 */}
    if(settings.notification&&documentRef.hidden&&notificationApi?.permission==="granted")try{const notification=new notificationApi(state.title,{body:state.body,tag:`tablegame-turn-${state.id}`});windowRef?.setTimeout?.(()=>notification.close?.(),5000);}catch{/* 通知不可用时安静降级。 */}
  }
  function findSelfAnchor(view,snapshot){
    const id=String(view?.selfId||snapshot?.playerId||"");if(!id)return null;
    const escaped=globalThis.CSS?.escape?globalThis.CSS.escape(id):id.replace(/["\\]/g,"\\$&");
    return documentRef.querySelector?.(`[data-player-anchor="${escaped}"],[data-player-id="${escaped}"],[data-id="${escaped}"]`)||null;
  }
  function refreshHighlight(view=current?.view,snapshot=current?.snapshot){
    highlighted?.classList?.remove("shared-turn-attention-required");highlighted=null;
    if(!current?.state?.required)return;
    highlighted=findSelfAnchor(view,snapshot);highlighted?.classList?.add("shared-turn-attention-required");
  }
  function sync(view,snapshot={}){
    const state=derive(view,snapshot)||{required:false,id:""};current={view,snapshot,state};button.dataset.active=String(Boolean(state.required));
    if(!state.required){documentRef.title=originalTitle;refreshHighlight();return state;}
    documentRef.title=`轮到你了｜${originalTitle}`;queueMicrotask(()=>refreshHighlight(view,snapshot));
    if(state.id&&state.id!==lastNotifiedId){lastNotifiedId=state.id;notifyDevice(state);}
    return state;
  }
  function reset(){current=null;lastNotifiedId="";documentRef.title=originalTitle;button.dataset.active="false";refreshHighlight();closePanel();}
  function onDocumentClick(event){if(panel.hidden||panel.contains(event.target)||event.target===button)return;closePanel();}
  function onKeyDown(event){if(event.key==="Escape")closePanel();}
  function onVisibilityChange(){if(current?.state?.required)documentRef.title=documentRef.hidden?`轮到你了｜${originalTitle}`:originalTitle;}
  button.addEventListener("click",togglePanel);panel.addEventListener("change",event=>{const key=event.target?.dataset?.setting;if(key)setSetting(key,event.target.checked);});documentRef.addEventListener("click",onDocumentClick);documentRef.addEventListener("keydown",onKeyDown);documentRef.addEventListener("visibilitychange",onVisibilityChange);windowRef?.addEventListener?.("resize",closePanel);windowRef?.addEventListener?.("scroll",closePanel,true);

  return Object.freeze({
    sync,reset,refreshHighlight,
    settings:()=>Object.freeze({...settings}),
    updateSettings:(patch={})=>{settings={...settings,...patch};safeWriteSettings(storage,storageKey,settings);refreshControls();return settings;},
    requestNotificationPermission:()=>setSetting("notification",true),
    destroy(){reset();button.remove();panel.remove();style.remove();documentRef.removeEventListener("click",onDocumentClick);documentRef.removeEventListener("keydown",onKeyDown);documentRef.removeEventListener("visibilitychange",onVisibilityChange);windowRef?.removeEventListener?.("resize",closePanel);windowRef?.removeEventListener?.("scroll",closePanel,true);}
  });
}
