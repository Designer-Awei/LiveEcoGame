# AGENTS.md — AI Agent 开发规范

## 项目概述
弹幕生态系统（Danmaku Ecosystem）：直播互动弹幕游戏，观众发弹幕驱动两个生物群落对抗。

## 技术栈
- **后端**: Node.js >=22, ESM modules (.mjs), 原生 `http` 模块（无 Express）
- **前端**: 纯 HTML + CSS + JS（ES modules），Canvas 2.5D 渲染，无框架
- **数据库**: SQLite (better-sqlite3)
- **通信**: SSE (Server-Sent Events)，不用 WebSocket

## 目录结构
```
danmaku-ecosystem/
├── server/
│   ├── index.mjs        # 主入口，HTTP 服务 + 路由 + 游戏循环
│   ├── ecosystem.mjs    # 生态系统模拟引擎（食物链、种群、天气）
│   ├── events.mjs       # 事件引擎 + 弹幕关键词路由
│   └── user.mjs         # 用户系统（权重、等级、SQLite 持久化）
├── client/
│   ├── index.html        # 主页面（竖屏布局）
│   ├── js/
│   │   ├── app.js        # 客户端逻辑（SSE、UI 更新、交互）
│   │   └── renderer.js   # 2.5D 等距渲染引擎（Canvas）
│   └── css/
│       └── style.css     # 样式（全屏沉浸、浮层 HUD）
├── data/                 # SQLite 数据库文件（gitignore）
├── assets/               # 像素贴图素材（备用）
├── docs/
│   └── PRD.md            # 产品需求文档
├── package.json
├── README.md
└── AGENTS.md             # ← 你在这里
```

## 代码规范
- **语言**: 纯 JavaScript ESM，不要 TypeScript
- **模块**: 用 `.mjs` 后缀，`import/export`
- **服务端**: 不要用 Express/Koa，保持原生 http
- **前端**: 不要用 React/Vue，保持原生 DOM 操作
- **CSS**: 不要用 Tailwind/预处理器，保持原生 CSS
- **数据库**: better-sqlite3，同步 API
- **命名**: camelCase 变量/函数，UPPER_SNAKE_CASE 常量
- **注释**: 中文注释，模块头部用分隔线注释块

## 关键约束
1. **竖屏布局**: 手机直播竖屏，上方阵营 vs 下方阵营
2. **全屏沉浸**: Canvas 铺满，所有 UI 为浮层（position: absolute）
3. **无弹幕面板**: 弹幕是直播平台的覆盖层，游戏 UI 不包含弹幕列表
4. **底部操作栏**: 阵营选择 + 快捷指令 + 规则/排行榜按钮
5. **SSE 实时推送**: 服务端每秒推送状态，客户端用 `requestAnimationFrame` 渲染

## 开发命令
```bash
npm install           # 安装依赖
npm start             # 启动服务 (port 4400)
npm run dev           # --watch 模式启动
# 浏览器访问 http://127.0.0.1:4400
```

## 游戏机制速查
- **8 种群落**: 山脉/湖泊/雨林/沙漠/火山/冰原/草原/海岛
- **每局随机 2 种**对抗，30 分钟一局
- **弹幕→事件**: 观众发"下雨/投放狼/地震"等关键词触发事件
- **评分**: 物种多样性 × 生态平衡 × 存活时长 × 变异数
- **冷启动**: 0 观众时 AI 每 30 秒自动触发事件
- **用户等级**: Lv.1~50，权重 = 基础 + 消费 + 活跃 + 荣耀

## API 端点
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/stream` | GET | SSE 实时推送 |
| `/api/state` | GET | 当前游戏状态 JSON |
| `/api/join` | POST | 加入阵营 `{faction}` |
| `/api/event` | POST | 触发事件 `{faction, text, name}` |
| `/api/leaderboard` | GET | 排行榜 `?limit=10` |
| `/api/user/:platform/:uid` | GET | 用户详情 |
| `/api/gift` | POST | 记录礼物 `{platform, platformUid, giftName, giftValue}` |
| `/api/history` | GET | 游戏历史 |

## 下一步开发方向（优先级排序）
1. **视觉升级**: 像素贴图替换程序化绘制，角色动画
2. **音效系统**: 背景音乐 + 事件音效
3. **礼物对接**: 接入 B站/抖音 礼物事件流
4. **终局结算**: 完善结算流程 + 历史记录
5. **多直播间**: 中心 API + 跨直播间数据同步