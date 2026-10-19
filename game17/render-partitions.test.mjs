import assert from "node:assert/strict";
import test from "node:test";
import {createGame17PartitionRenderer,createGame17RenderModel} from "./render-partitions.mjs";

const clone=(value)=>structuredClone(value);
const player=(id,overrides={})=>({id,name:id,isHost:id==="p1",connected:true,cash:20000,portfolioCount:1,splitPortfolioCount:0,debts:[],portfolio:id==="p1"?[{id:"s1",companyId:"nova"}]:[],splitPortfolio:[],privateInformation:id==="p1"?[{id:"i1",companyId:"nova",forecastId:"up2"}]:[],...overrides});
function baseView(){return{selfId:"p1",roomRole:"player",phase:"selling",capacity:4,round:2,totalRounds:5,currentPlayerId:"p1",firstPlayerId:"p2",deadline:5000,deckCount:30,
  stockPrices:{nova:5,evergreen:5,harbor:5,apex:5,cloud:5,aurora:5},publicInformation:{id:"pub",companyId:"nova",forecastId:"up2"},revealedInformation:[],hiddenInformationCount:5,
  stockpiles:[{id:"pile1",cards:[{id:"c1",kind:"stock",companyId:"nova"}]},{id:"pile2",cards:[]}],bidTokens:[],marketAction:null,pendingDividend:null,supplyBatch:1,supplyHand:[],finalScores:[],winnerIds:[],logs:[],presentationEvents:[],players:[player("p1"),player("p2"),player("p3")],
  permissions:{canManage:true,canKick:true,canSetCapacity:false,canStart:false,canRestart:false,canEnd:true,canPlaceSupply:false,canBid:false,canPlayMarketAction:false,canSell:true,canChooseDividend:false}};}
function harness(){const calls=[],nodes={stockpiles:null,players:null,decision:null,private:null};let sequence=0;const renderer=createGame17PartitionRenderer(Object.fromEntries(
  ["room","status","ticker","information","stockpiles","players","decision","private","log","countdown"].map((name)=>[name,()=>{calls.push(name);if(name in nodes)nodes[name]={id:++sequence};}])));
  return{calls,nodes,draw(view){return renderer.render(createGame17RenderModel(view,{memberRole:view.roomRole,roomCode:"STOCK"}));},clear(){calls.length=0;}};}

test("旁观者和演出广播不替换卖股表单或市场锚点",()=>{const h=harness(),view=baseView();h.draw(view);const saved={...h.nodes};h.clear();const next=clone(view);next.spectators=[{id:"s1"}];next.presentationEvents=[{id:1}];assert.deepEqual(h.draw(next),[]);assert.deepEqual(h.nodes,saved);});
test("其他玩家掉线只更新对应玩家分区",()=>{const h=harness(),view=baseView();h.draw(view);const decision=h.nodes.decision,privateNode=h.nodes.private;h.clear();const next=clone(view);next.players[2].connected=false;assert.deepEqual(h.draw(next),["players"]);assert.strictEqual(h.nodes.decision,decision);assert.strictEqual(h.nodes.private,privateNode);});
test("公开报价只更新股票堆而不替换我的市场表单",()=>{const h=harness(),view=baseView();h.draw(view);const decision=h.nodes.decision;h.clear();const next=clone(view);next.bidTokens.push({pileId:"pile1",ownerId:"p2",amount:3000});assert.deepEqual(h.draw(next),["stockpiles"]);assert.strictEqual(h.nodes.decision,decision);});
test("日志和倒计时独立于当前交易草稿",()=>{const h=harness(),view=baseView();h.draw(view);const decision=h.nodes.decision;h.clear();const next=clone(view);next.logs.push({text:"公开报价"});assert.deepEqual(h.draw(next),["log"]);h.clear();next.deadline=9000;assert.deepEqual(h.draw(next),["countdown"]);assert.strictEqual(h.nodes.decision,decision);});
test("股价变化只更新行情而不重建卖股表单以外区域",()=>{const h=harness(),view=baseView();h.draw(view);h.clear();const next=clone(view);next.stockPrices.nova=6;assert.deepEqual(h.draw(next),["ticker","decision"]);});
test("本人现金与持仓变化更新玩家和私人资产",()=>{const h=harness(),view=baseView();h.draw(view);h.clear();const next=clone(view);next.players[0].cash=25000;next.players[0].portfolio.push({id:"s2",companyId:"nova"});next.players[0].portfolioCount=2;assert.deepEqual(h.draw(next),["players","decision","private"]);});
test("进入新的权威行动者才替换交易决策区",()=>{const h=harness(),view=baseView();h.draw(view);h.clear();const next=clone(view);next.currentPlayerId="p2";next.permissions.canSell=false;assert.deepEqual(h.draw(next),["status","players","decision"]);});
