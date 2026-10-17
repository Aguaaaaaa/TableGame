# 《只言片语》服务端状态机

```text
lobby
  -> storytellerChoosing
  -> playersChoosing
  -> voting
  -> resolution
  -> storytellerChoosing | ended
```

## 阶段职责

- `lobby`：房主设置 3～8 人；玩家与旁观席仅在此阶段互换。
- `storytellerChoosing`：只有叙述者可以提交一张自己手牌和线索。
- `playersChoosing`：其他玩家秘密提交干扰牌；服务器只广播完成数量。
- `voting`：服务器洗混并公开画面；普通玩家秘密投票且不能投自己的画面。
- `resolution`：统一公开答案、牌主、票数和得分；播放兔子足迹结算演出。
- `ended`：冻结最终排名；房主可以返回大厅开始新局。

每个动作由共享权威服务器串行处理，并使用动作幂等键。客户端草稿以房间、玩家、轮次和阶段为上下文保存，普通视图刷新不清空草稿。
