# game22 阿瓦隆

5～10人服务器权威隐藏身份桌游，原生支持逐成员秘密视图、旁观、SQLite恢复、倒计时兜底和权威演出事件。

```bash
node game22/signal-server.js
node --test game22/*.test.mjs game22/*.test.cjs
```

默认端口`8808`。正式服务器环境：

```ini
PORT=8808
GAME22_DB_PATH=/var/lib/tablegame/game22/game22.sqlite
SPECTATORS_ENABLED=1
SPECTATOR_LIMIT=10
```

建议公开入口为`https://avalon.zillionx.xyz/`，Nginx反向代理到`127.0.0.1:8808`。客户端全部使用同源路径。

