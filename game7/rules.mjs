export const MIN_PLAYERS=4;
export const MAX_PLAYERS=5;
export const ACTION_SECONDS=60;
export const DICE_SLOWING_MS=2200;
export const DICE_SETTLED_MS=1100;
export const MARKET_VALUES=Object.freeze([0,5,10,20,30]);

export const GOODS=Object.freeze({
  ginseng:Object.freeze({name:"人参",icon:"🌿",color:"#d0a33b",payout:18,seats:Object.freeze([1,2,3]),die:Object.freeze([1,1,2,2,3,3])}),
  nutmeg:Object.freeze({name:"肉豆蔻",icon:"🌰",color:"#a5653d",payout:24,seats:Object.freeze([2,3,4]),die:Object.freeze([1,2,2,3,3,4])}),
  silk:Object.freeze({name:"丝绸",icon:"🧵",color:"#527ed1",payout:30,seats:Object.freeze([3,4,5]),die:Object.freeze([1,3,3,4,4,5])}),
  jade:Object.freeze({name:"玉石",icon:"💎",color:"#2d9c72",payout:36,seats:Object.freeze([3,4,5,6]),die:Object.freeze([3,3,4,4,5,5])})
});

export const GOOD_IDS=Object.freeze(Object.keys(GOODS));
export const BETS=Object.freeze([
  Object.freeze({id:"A",cost:4,payout:6}),
  Object.freeze({id:"B",cost:3,payout:8}),
  Object.freeze({id:"C",cost:2,payout:15})
]);
export const PLAYER_COLORS=Object.freeze(["#e4564f","#356fc2","#e9a72d","#369b69","#8a59bd"]);

export function assertCapacity(value){
  const capacity=Number(value);
  if(!Number.isInteger(capacity)||capacity<MIN_PLAYERS||capacity>MAX_PLAYERS)throw new RangeError(`马尼拉支持${MIN_PLAYERS}～${MAX_PLAYERS}人。`);
  return capacity;
}

export function shuffle(values,random=Math.random){
  const copy=[...values];
  for(let index=copy.length-1;index>0;index-=1){const target=Math.floor(random()*(index+1));[copy[index],copy[target]]=[copy[target],copy[index]];}
  return copy;
}

export function randomStarts(random=Math.random){
  let values;
  do{const a=Math.floor(random()*6),b=Math.floor(random()*6);values=[a,b,9-a-b];}while(values[2]<0||values[2]>5);
  return values;
}

export function rollForGood(goodId,random=Math.random){
  const faces=GOODS[goodId]?.die;
  if(!faces)throw new RangeError(`未知货物：${goodId}`);
  return faces[Math.min(faces.length-1,Math.floor(random()*faces.length))];
}
