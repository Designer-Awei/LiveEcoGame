// ============================================================
// 弹幕生态系统 · 服务端主入口
// ============================================================
import { createServer } from 'http';
import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { Ecosystem } from './ecosystem.mjs';
import { EventEngine, DanmakuRouter } from './events.mjs';
import { UserSystem } from './user.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = Number(process.env.PORT) || 4400;

// ── 全局游戏状态 ──
const BIOME_POOL = [
  { id: 'mountain',  name: '山脉', emoji: '🏔️', color: '#8B7355' },
  { id: 'lake',      name: '湖泊', emoji: '🌊', color: '#4A90D9' },
  { id: 'rainforest',name: '雨林', emoji: '🌴', color: '#2D5A27' },
  { id: 'desert',    name: '沙漠', emoji: '🏜️', color: '#D4A843' },
  { id: 'volcano',   name: '火山', emoji: '🌋', color: '#8B2500' },
  { id: 'icefield',  name: '冰原', emoji: '🧊', color: '#B0E0E6' },
  { id: 'grassland', name: '草原', emoji: '🌾', color: '#7CCD7C' },
  { id: 'island',    name: '海岛', emoji: '🏝️', color: '#20B2AA' },
];

const state = {
  phase: 'waiting',       // waiting | playing | ended
  round: 0,
  elapsed: 0,
  duration: 1800,         // 30分钟一局
  factions: [],           // [{biome, eco, score, viewers}]
  globalEvents: [],       // 最近事件队列
  scores: [],             // 历史排行榜
  viewerCount: 0,
  aiActive: true,
  tickRate: 1000,         // 1秒一tick
  autoEventInterval: 60,  // 全局随机事件间隔(秒)
};

// ── 选两个阵营 ──
function pickBiomes() {
  const shuffled = [...BIOME_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
}

function newGame() {
  const [b1, b2] = pickBiomes();
  state.phase = 'playing';
  state.round++;
  state.elapsed = 0;
  state.factions = [
    { biome: b1, eco: new Ecosystem(b1.id), score: 0, viewers: [], recentEvents: [] },
    { biome: b2, eco: new Ecosystem(b2.id), score: 0, viewers: [], recentEvents: [] },
  ];
  state.globalEvents = [];
  state.aiActive = true;
  console.log(`[Game] 新一局 #${state.round}: ${b1.emoji}${b1.name} vs ${b2.emoji}${b2.name}`);
}

// ── 游戏循环 ──
const eventEngine = new EventEngine();

function gameTick() {
  if (state.phase !== 'playing') return;

  state.elapsed++;

  // 生态演化
  for (const f of state.factions) {
    f.eco.tick();
    f.score = f.eco.calculateScore();
  }

  // 冷启动：无人时AI自动触发事件
  const totalViewers = state.factions.reduce((s, f) => s + f.viewers.length, 0);
  state.viewerCount = totalViewers;

  if (totalViewers === 0) {
    state.aiActive = true;
    // 每30秒AI自动触发小事件
    if (state.elapsed % 30 === 0) {
      const idx = Math.random() < 0.5 ? 0 : 1;
      const ev = eventEngine.randomSmallEvent();
      applyEvent(idx, ev, '🤖自然');
    }
  } else {
    // 有人时降低AI频率
    state.aiActive = totalViewers < 3;
  }

  // 全局随机事件（每60秒，有人时降低频率）
  const interval = totalViewers > 0 ? state.autoEventInterval * 2 : state.autoEventInterval;
  if (state.elapsed % interval === 0) {
    const ev = eventEngine.randomGlobalEvent();
    applyGlobalEvent(ev);
  }

  // 季节变化（每450秒 = 7.5分钟一个季节）
  if (state.elapsed % 450 === 0) {
    const season = ['spring', 'summer', 'autumn', 'winter'][Math.floor(state.elapsed / 450) % 4];
    for (const f of state.factions) {
      f.eco.setSeason(season);
    }
    pushGlobalEvent({ type: 'season', text: `季节更替：${seasonName(season)}`, icon: seasonIcon(season) });
  }

  // 终局
  if (state.elapsed >= state.duration) {
    endGame();
  }

  // 推送状态给客户端
  broadcastState();
}

function seasonName(s) {
  return { spring: '🌸 春天', summer: '☀️ 夏天', autumn: '🍂 秋天', winter: '❄️ 冬天' }[s] || s;
}
function seasonIcon(s) {
  return { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' }[s] || '🌍';
}

function applyEvent(factionIdx, ev, source) {
  const f = state.factions[factionIdx];
  if (!f) return;
  const result = f.eco.applyEvent(ev);
  const eventRecord = {
    time: state.elapsed,
    source,
    text: `${ev.icon || '⚡'} ${ev.name}`,
    detail: result,
    type: ev.type,
  };
  f.recentEvents.unshift(eventRecord);
  if (f.recentEvents.length > 20) f.recentEvents.pop();
  state.globalEvents.push({ ...eventRecord, faction: factionIdx });
  if (state.globalEvents.length > 50) state.globalEvents.shift();
}

function applyGlobalEvent(ev) {
  for (let i = 0; i < state.factions.length; i++) {
    applyEvent(i, ev, '🌍全局');
  }
  pushGlobalEvent(ev);
}

function pushGlobalEvent(ev) {
  state.globalEvents.push({
    time: state.elapsed,
    source: '🌍全局',
    text: `${ev.icon || '⚡'} ${ev.name}`,
    type: ev.type,
  });
}

function endGame() {
  state.phase = 'ended';
  const scores = state.factions.map((f, i) => ({
    biome: f.biome,
    score: f.score,
    viewers: f.viewers.length,
  }));
  scores.sort((a, b) => b.score - a.score);
  state.scores.push({
    round: state.round,
    time: new Date().toISOString(),
    factions: scores,
    winner: scores[0].biome.name,
  });
  if (state.scores.length > 100) state.scores.shift();
  console.log(`[Game] #${state.round} 结束: ${scores[0].biome.emoji}${scores[0].biome.name} 胜! 分数:${scores[0].score}`);
  // 10秒后自动开始下一局
  setTimeout(() => newGame(), 10000);
}

// ── 弹幕路由 ──
const danmaku = new DanmakuRouter();
const userSystem = new UserSystem();

// ── 权限映射 ──
function getRequiredAbility(eventType) {
  const map = {
    'weather': 'weather',
    'creature_add': 'basic_creature',
    'disaster': 'small_disaster',
    'mutation': 'rare_creature',
    'blessing': 'global_event',
    'resource': 'basic_creature',
  };
  return map[eventType] || null;
}

function getAbilityName(ability) {
  const names = {
    'weather': '天气操控',
    'basic_creature': '基础生物投放',
    'rare_creature': '稀有生物投放',
    'small_disaster': '灾害触发',
    'global_event': '全局事件',
    'ultimate_event': '终极事件',
    'custom_event': '自定义事件',
  };
  return names[ability] || ability;
}

// ── 加载Mock数据 ──
userSystem.seedMockData();

// ── SSE 客户端 ──
const sseClients = new Set();

function broadcastState() {
  const leaderboard = userSystem.getLeaderboard(8);
  const payload = JSON.stringify({
    type: 'state',
    phase: state.phase,
    elapsed: state.elapsed,
    duration: state.duration,
    round: state.round,
    viewerCount: state.viewerCount,
    factions: state.factions.map(f => ({
      biome: f.biome,
      score: f.score,
      creatures: f.eco.getCreatureSummary(),
      stats: f.eco.getStats(),
      recentEvents: f.recentEvents.slice(0, 8),
      viewerCount: f.viewers.length,
    })),
    globalEvents: state.globalEvents.slice(0, 12),
    scores: state.scores.slice(-10),
    leaderboard: leaderboard.map(u => ({
      nickname: u.nickname,
      level: u.level,
      title: u.title,
      weight: Math.floor(u.total_weight),
      giftValue: u.gift_value,
      streak: u.streak,
    })),
  });
  const msg = `data: ${payload}\n\n`;
  for (const client of sseClients) {
    try { client.write(msg); } catch {}
  }
}

// ── HTTP + WS ──
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  // API 路由
  if (req.url === '/api/state') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(state));
    return;
  }

  if (req.url?.startsWith('/api/join') && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const { faction, name } = JSON.parse(body);
      const idx = state.factions.findIndex(f => f.biome.id === faction || f.biome.name === faction);
      if (idx >= 0) {
        state.factions[idx].viewers.push({ name: name || '匿名', joinedAt: Date.now() });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, faction: state.factions[idx].biome }));
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '阵营不存在' }));
      }
    } catch {
      res.writeHead(400);
      res.end('bad request');
    }
    return;
  }

  if (req.url?.startsWith('/api/event') && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const { faction, text, name, platform, platformUid } = JSON.parse(body);
      const idx = state.factions.findIndex(f => f.biome.id === faction || f.biome.name === faction);
      if (idx >= 0) {
        const ev = danmaku.parse(text);
        if (ev) {
          // 记录用户操作
          let user = null;
          if (platform && platformUid) {
            user = userSystem.recordMessage(platform, platformUid, name);
            // 检查用户权限
            const levelInfo = userSystem.getLevelInfo(user.total_weight);
            const eventAbility = getRequiredAbility(ev.type);
            if (eventAbility && !JSON.parse(user.abilities).includes(eventAbility)) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, reason: `需要 ${getAbilityName(eventAbility)} 权限`, userLevel: user.level, userTitle: user.title }));
              return;
            }
          }
          applyEvent(idx, ev, `👤${name || '匿名'}`, user);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, event: ev, user: user ? { level: user.level, title: user.title, weight: user.total_weight } : null }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, reason: '未识别的指令' }));
        }
      } else {
        res.writeHead(400);
        res.end('faction not found');
      }
    } catch {
      res.writeHead(400);
      res.end('bad request');
    }
    return;
  }

  // 用户API
  if (req.url?.startsWith('/api/user/') && req.method === 'GET') {
    const parts = req.url.split('/');
    const platform = parts[3];
    const uid = parts[4];
    if (platform && uid) {
      const user = userSystem.getUser(platform, uid);
      if (user) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(user));
      } else {
        res.writeHead(404);
        res.end('User not found');
      }
    }
    return;
  }

  // 排行榜API
  if (req.url?.startsWith('/api/leaderboard')) {
    const url = new URL(req.url, 'http://localhost');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const leaderboard = userSystem.getLeaderboard(limit);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(leaderboard));
    return;
  }

  // 游戏历史API
  if (req.url?.startsWith('/api/history')) {
    const url = new URL(req.url, 'http://localhost');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const history = userSystem.getGameHistory(limit);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(history));
    return;
  }

  // 礼物记录API
  if (req.url?.startsWith('/api/gift') && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const { platform, platformUid, nickname, giftName, giftValue } = JSON.parse(body);
      const user = userSystem.recordGift(platform, platformUid, nickname, giftName, giftValue);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, user: { level: user.level, title: user.title, weight: user.total_weight } }));
    } catch {
      res.writeHead(400);
      res.end('bad request');
    }
    return;
  }

  // SSE 实时推送
  if (req.url === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('data: {"type":"connected"}\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // 静态文件
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = join(ROOT, 'client', filePath);
  try {
    const data = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// ── 启动 ──
newGame();
setInterval(gameTick, state.tickRate);

server.listen(PORT, () => {
  console.log(`\n🌿 弹幕生态系统 已启动`);
  console.log(`   管理页面: http://127.0.0.1:${PORT}/`);
  console.log(`   游戏状态: http://127.0.0.1:${PORT}/api/state\n`);
});