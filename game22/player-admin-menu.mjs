/** 房主玩家管理入口只在准备阶段对其他正式玩家开放。 */
export function canOpenPlayerAdminMenu({phase,canManage,selfId,targetId}){
  return phase==="lobby"&&Boolean(canManage)&&Boolean(targetId)&&targetId!==selfId;
}

