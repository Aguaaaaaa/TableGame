const ROLE_LABELS={
  merlin:"梅林",percival:"派西维尔",loyal:"亚瑟忠臣",assassin:"刺客",
  morgana:"莫甘娜",mordred:"莫德雷德",oberon:"奥伯伦",minion:"莫德雷德爪牙"
};

const ROLE_FACTION={merlin:"good",percival:"good",loyal:"good",assassin:"evil",morgana:"evil",mordred:"evil",oberon:"evil",minion:"evil"};

/**
 * 将服务器已经裁剪过的玩家视图转换为有顺序的公开/私有徽记。
 * 本函数不推断身份，只使用当前接收者本来就能看到的信息。
 */
export function createAvalonPlayerBadges({
  player,
  phase,
  leaderId,
  proposedTeam=[],
  teamVoteProgress=[],
  questProgress=[],
  knownEvilIds=[],
  percivalCandidates=[],
  lastTeamVoteResult=null
}){
  const badges=[];
  const add=(type,label)=>badges.push({type,label});

  // 队长始终位于第一枚，方便所有视角快速定位行动发起者。
  if(player.id===leaderId)add("leader","本轮队长");

  // 公开角色比视角推断更精确，因此公开后不再重复显示“已知邪恶/梅林候选”。
  if(player.role){
    const faction=ROLE_FACTION[player.role]||"neutral";
    add(`role-${faction}-${player.role}`,`公开身份：${ROLE_LABELS[player.role]||player.role}`);
  }else if(knownEvilIds.includes(player.id)){
    add("known-evil","你的视角确认其属于邪恶阵营");
  }else if(percivalCandidates.includes(player.id)){
    add("merlin-candidate","梅林候选（梅林或莫甘娜）");
  }

  // 远征盾只属于已经获批、正在执行或揭晓的当前远征队。
  if(["questAction","questReveal"].includes(phase)&&proposedTeam.includes(player.id))add("expedition","本次远征队员");
  if(phase==="teamVote"&&teamVoteProgress.includes(player.id))add("vote-sealed","本轮组队票已密封");
  if(phase==="questAction"&&questProgress.includes(player.id))add("quest-sealed","本轮任务牌已投入圣杯");

  // 上一次组队投票结果固定放在最后，形成统一的阅读顺序。
  const votes=lastTeamVoteResult?.votes||{};
  if(Object.hasOwn(votes,player.id))add(votes[player.id]?"vote-yes":"vote-no",votes[player.id]?"上次组队投票：同意":"上次组队投票：反对");
  return badges;
}

