# 马尼拉（game7）

game7 已采用协议 v3 的服务器权威架构。浏览器只负责展示、保存未提交的本地操作草稿并提交行动意图；Node 服务端负责全部规则、随机数、倒计时、逐玩家视图、旁观权限和 SQLite 持久化。

## 服务配置

- 默认端口：`8793`
- 数据库环境变量：`GAME7_DB_PATH`
- 推荐数据库路径：`/var/lib/tablegame/game7/game7.sqlite`
- 旁观开关：`SPECTATORS_ENABLED=1`
- 旁观上限（可选）：`SPECTATOR_LIMIT=10`

示例实例环境：

```ini
PORT=8793
GAME7_DB_PATH=/var/lib/tablegame/game7/game7.sqlite
SPECTATORS_ENABLED=1
SPECTATOR_LIMIT=10
```

数据库目录必须由运行服务的 `tablegame` 用户拥有写权限，因为 SQLite 还会在同一目录创建 `game7.sqlite-wal` 和 `game7.sqlite-shm`。

## 本地验收

```bash
node --test game7/*.test.mjs game7/*.test.js game7/*.test.cjs
```

测试覆盖版图坐标、规则约束、完整航次推进、服务端秘密裁剪、旁观禁权、HTTP 协议以及 SQLite 重启恢复。
