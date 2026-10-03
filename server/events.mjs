// ============================================================
// 事件引擎 · 状态机 + 预定义事件库 + 权重冷却
// ============================================================

export class EventEngine {
  constructor() {
    this.smallEvents = [
      { type: 'weather', name: '微风', effect: 'clear', icon: '🌬️' },
      { type: 'weather', name: '小雨', effect: 'rain', icon: '🌧️' },
      { type: 'weather', name: '晴朗', effect: 'clear', icon: '☀️' },
      { type: 'resource', name: '野果丰收', icon: '🍎' },
      { type: 'resource', name: '泉水涌出', icon: '💧' },
      { type: 'creature_add', name: '野兔迁入', species: 'rabbit', count: 3, icon: '🐰' },
      { type: 'creature_add', name: '蝴蝶飞来', species: 'butterfly', count: 5, icon: '🦋' },
      { type: 'mutation', name: '自然变异', icon: '🧬' },
    ];

    this.globalEvents = [
      { type: 'weather', name: '暴风雨', effect: 'rain', icon: '⛈️' },
      { type: 'weather', name: '干旱', effect: 'drought', icon: '🏜️' },
      { type: 'weather', name: '暴风雪', effect: 'snow', icon: '🌨️' },
      { type: 'weather', name: '热浪', effect: 'heatwave', icon: '🔥' },
      { type: 'disaster', name: '地震', damage: 0.15, icon: '🌋' },
      { type: 'disaster', name: '洪水', damage: 0.2, icon: '🌊' },
      { type: 'disaster', name: '瘟疫', damage: 0.1, icon: '☠️' },
      { type: 'disaster', name: '蝗灾', damage: 0.25, icon: '🦗' },
      { type: 'disaster', name: '山火', damage: 0.2, icon: '🔥' },
      { type: 'blessing', name: '神谕降临', icon: '✨' },
      { type: 'resource', name: '大地回春', icon: '🌱' },
    ];
  }

  randomSmallEvent() {
    return { ...this.smallEvents[Math.floor(Math.random() * this.smallEvents.length)] };
  }

  randomGlobalEvent() {
    return { ...this.globalEvents[Math.floor(Math.random() * this.globalEvents.length)] };
  }
}

// ============================================================
// 弹幕路由器 · 自然语言 → 事件映射（带权重冷却）
// ============================================================

// ── 普通事件（任何用户可触发） ──
const COMMON_KEYWORDS = [
  // 天气
  { keywords: ['下雨', '雨', '下雨了', '降雨'], event: { type: 'weather', name: '降雨', effect: 'rain', icon: '🌧️' }, category: 'weather' },
  { keywords: ['晴天', '晴', '太阳', '天晴'], event: { type: 'weather', name: '晴天', effect: 'clear', icon: '☀️' }, category: 'weather' },
  { keywords: ['雪', '下雪', '下雪了'], event: { type: 'weather', name: '降雪', effect: 'snow', icon: '🌨️' }, category: 'weather' },
  { keywords: ['干旱', '旱', '大旱'], event: { type: 'weather', name: '干旱', effect: 'drought', icon: '🏜️' }, category: 'weather' },
  { keywords: ['暴风', '风暴', '台风', '飓风'], event: { type: 'weather', name: '暴风', effect: 'rain', icon: '🌪️' }, category: 'weather' },
  { keywords: ['热浪', '酷热', '高温'], event: { type: 'weather', name: '热浪', effect: 'heatwave', icon: '🌡️' }, category: 'weather' },

  // 基础生物投放
  { keywords: ['兔子', '兔', '野兔'], event: { type: 'creature_add', name: '野兔', species: 'rabbit', count: 5, icon: '🐰' }, category: 'creature' },
  { keywords: ['狼'], event: { type: 'creature_add', name: '狼', species: 'wolf', count: 2, icon: '🐺' }, category: 'creature' },
  { keywords: ['鹰', '老鹰'], event: { type: 'creature_add', name: '鹰', species: 'eagle', count: 2, icon: '🦅' }, category: 'creature' },
  { keywords: ['鹿'], event: { type: 'creature_add', name: '鹿', species: 'deer', count: 3, icon: '🦌' }, category: 'creature' },
  { keywords: ['鱼', '小鱼'], event: { type: 'creature_add', name: '鱼', species: 'fish', count: 10, icon: '🐟' }, category: 'creature' },
  { keywords: ['蛇'], event: { type: 'creature_add', name: '蛇', species: 'snake', count: 3, icon: '🐍' }, category: 'creature' },
  { keywords: ['蝴蝶'], event: { type: 'creature_add', name: '蝴蝶', species: 'butterfly', count: 8, icon: '🦋' }, category: 'creature' },
  { keywords: ['猴子', '猴'], event: { type: 'creature_add', name: '猴子', species: 'monkey', count: 4, icon: '🐒' }, category: 'creature' },
  { keywords: ['熊', '大熊'], event: { type: 'creature_add', name: '熊', species: 'bear', count: 1, icon: '🐻' }, category: 'creature' },
  { keywords: ['狐狸'], event: { type: 'creature_add', name: '狐狸', species: 'fox', count: 3, icon: '🦊' }, category: 'creature' },
  { keywords: ['企鹅'], event: { type: 'creature_add', name: '企鹅', species: 'penguin', count: 5, icon: '🐧' }, category: 'creature' },

  // 增益
  { keywords: ['祝福', '神圣', '神谕'], event: { type: 'blessing', name: '神圣祝福', icon: '✨' }, category: 'blessing' },
  { keywords: ['丰收', '资源', '生长'], event: { type: 'resource', name: '资源涌现', icon: '🌿' }, category: 'resource' },
  { keywords: ['春天', '春'], event: { type: 'weather', name: '春风', effect: 'clear', icon: '🌸' }, category: 'weather' },
  { keywords: ['夏天', '夏'], event: { type: 'weather', name: '酷暑', effect: 'heatwave', icon: '☀️' }, category: 'weather' },
  { keywords: ['秋天', '秋'], event: { type: 'weather', name: '秋风', effect: 'clear', icon: '🍂' }, category: 'weather' },
  { keywords: ['冬天', '冬'], event: { type: 'weather', name: '寒冬', effect: 'snow', icon: '❄️' }, category: 'weather' },
];

// ── 稀有事件（高权重 / 低概率） ──
const RARE_KEYWORDS = [
  // 灾害（需要 Lv.10+ 或小概率触发）
  { keywords: ['地震'], event: { type: 'disaster', name: '地震', damage: 0.15, icon: '🌋' }, category: 'disaster', minLevel: 10 },
  { keywords: ['洪水', '海啸', '大水'], event: { type: 'disaster', name: '洪水', damage: 0.2, icon: '🌊' }, category: 'disaster', minLevel: 10 },
  { keywords: ['瘟疫', '病毒', '疫病'], event: { type: 'disaster', name: '瘟疫', damage: 0.1, icon: '☠️' }, category: 'disaster', minLevel: 10 },
  { keywords: ['蝗灾', '蝗虫'], event: { type: 'disaster', name: '蝗灾', damage: 0.25, icon: '🦗' }, category: 'disaster', minLevel: 10 },
  { keywords: ['火山', '喷发', '火山喷发'], event: { type: 'disaster', name: '火山喷发', damage: 0.3, icon: '🌋' }, category: 'disaster', minLevel: 15 },
  { keywords: ['山火', '火灾', '着火'], event: { type: 'disaster', name: '山火', damage: 0.2, icon: '🔥' }, category: 'disaster', minLevel: 10 },

  // 进化（需要 Lv.5+）
  { keywords: ['进化', '变异', '突变'], event: { type: 'mutation', name: '进化突变', icon: '🧬' }, category: 'mutation', minLevel: 5 },

  // 传说生物（极低概率或 Lv.20+）
  { keywords: ['狮子'], event: { type: 'creature_add', name: '狮子', species: 'wolf', count: 2, icon: '🦁' }, category: 'legendary', minLevel: 5, rareChance: 0.3 },
  { keywords: ['熊猫', '大熊猫'], event: { type: 'creature_add', name: '熊猫', species: 'bear', count: 2, icon: '🐼' }, category: 'legendary', minLevel: 5, rareChance: 0.3 },
  { keywords: ['海豚'], event: { type: 'creature_add', name: '海豚', species: 'dolphin', count: 3, icon: '🐬' }, category: 'legendary', minLevel: 5, rareChance: 0.3 },
  { keywords: ['鲨鱼'], event: { type: 'creature_add', name: '鲨鱼', species: 'shark', count: 1, icon: '🦈' }, category: 'legendary', minLevel: 10, rareChance: 0.2 },
  { keywords: ['北极熊'], event: { type: 'creature_add', name: '北极熊', species: 'polarbear', count: 1, icon: '🐻‍❄️' }, category: 'legendary', minLevel: 10, rareChance: 0.2 },

  // 神话生物（只有 Lv.20+ 或极小概率）
  { keywords: ['恐龙', '龙'], event: { type: 'creature_add', name: '远古巨兽', species: 'magmadragon', count: 1, icon: '🐉' }, category: 'mythic', minLevel: 20, rareChance: 0.05 },
  { keywords: ['凤凰', '不死鸟'], event: { type: 'creature_add', name: '凤凰', species: 'phoenix', count: 1, icon: '🔥' }, category: 'mythic', minLevel: 20, rareChance: 0.05 },
];

// ── 点赞事件（用户点赞/扣666触发的增益） ──
const LIKE_EVENTS = [
  { type: 'resource', name: '点赞增益', icon: '👍', effect: 'like_boost' },
];

// ── 权重冷却配置 ──
const COOLDOWN_CONFIG = {
  // 类别 → 基础冷却秒数（权重越高冷却越短）
  weather:    { base: 10, minCooldown: 3 },
  creature:   { base: 15, minCooldown: 5 },
  blessing:   { base: 30, minCooldown: 10 },
  resource:   { base: 20, minCooldown: 8 },
  disaster:   { base: 60, minCooldown: 20 },
  mutation:   { base: 45, minCooldown: 15 },
  legendary:  { base: 30, minCooldown: 10 },
  mythic:     { base: 120, minCooldown: 60 },
  like:       { base: 5, minCooldown: 2 },
};

export class DanmakuRouter {
  constructor() {
    this.commonKeywords = COMMON_KEYWORDS;
    this.rareKeywords = RARE_KEYWORDS;
    // 冷却记录: Map<`${platform}:${uid}:${category}`, timestamp>
    this.cooldowns = new Map();
  }

  // ── 核心解析：返回 {event, blocked, reason} ──
  parse(text, userInfo) {
    if (!text) return { event: null };
    text = text.trim().toLowerCase();

    // 点赞/666 → 点赞增益
    if (text === '666' || text.includes('点赞') || text.includes('赞')) {
      return this._checkCooldownAndReturn(userInfo, 'like', LIKE_EVENTS[0]);
    }

    // 先查普通事件
    for (const mapping of this.commonKeywords) {
      for (const kw of mapping.keywords) {
        if (text.includes(kw)) {
          return this._checkCooldownAndReturn(userInfo, mapping.category, mapping.event);
        }
      }
    }

    // 再查稀有事件
    for (const mapping of this.rareKeywords) {
      for (const kw of mapping.keywords) {
        if (text.includes(kw)) {
          return this._handleRareEvent(userInfo, mapping);
        }
      }
    }

    return { event: null };
  }

  _handleRareEvent(userInfo, mapping) {
    const userLevel = userInfo?.level || 1;

    // 等级不够
    if (mapping.minLevel && userLevel < mapping.minLevel) {
      // 低概率通过（给低等级玩家小惊喜）
      if (mapping.rareChance && Math.random() < mapping.rareChance) {
        return this._checkCooldownAndReturn(userInfo, mapping.category, mapping.event, true);
      }
      return {
        event: null,
        blocked: true,
        reason: `需要 Lv.${mapping.minLevel} 才能触发「${mapping.event.name}」`,
      };
    }

    // 高等级用户：神话生物也有概率限制（防止滥用）
    if (mapping.category === 'mythic' && mapping.rareChance) {
      if (Math.random() > mapping.rareChance) {
        return {
          event: null,
          blocked: true,
          reason: `${mapping.event.icon} ${mapping.event.name} 未能降临……再试试？`,
        };
      }
    }

    return this._checkCooldownAndReturn(userInfo, mapping.category, mapping.event);
  }

  _checkCooldownAndReturn(userInfo, category, event, forcePass = false) {
    const platform = userInfo?.platform || 'anonymous';
    const uid = userInfo?.platform_uid || 'unknown';
    const key = `${platform}:${uid}:${category}`;
    const now = Date.now();

    // 获取冷却配置
    const cd = COOLDOWN_CONFIG[category] || { base: 15, minCooldown: 5 };

    // 权重影响冷却时间：权重越高冷却越短
    const weight = userInfo?.total_weight || 0;
    const weightFactor = Math.max(0.2, 1 - weight / 2000); // 权重2000时冷却降到最短
    const cooldownMs = Math.max(cd.minCooldown * 1000, cd.base * 1000 * weightFactor);

    const lastUsed = this.cooldowns.get(key) || 0;
    const elapsed = now - lastUsed;

    if (!forcePass && elapsed < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
      return {
        event: null,
        blocked: true,
        reason: `⏳ ${cd.base}秒冷却中（还剩${remaining}秒）`,
        cooldownRemaining: remaining,
      };
    }

    // 记录冷却
    this.cooldowns.set(key, now);

    // 定期清理过期冷却（每100次清理一次）
    if (this.cooldowns.size > 500) {
      for (const [k, ts] of this.cooldowns) {
        if (now - ts > 120000) this.cooldowns.delete(k); // 清理2分钟前的
      }
    }

    return { event: { ...event } };
  }

  // ── 调试用：获取某用户冷却状态 ──
  getCooldownStatus(userInfo) {
    const platform = userInfo?.platform || 'anonymous';
    const uid = userInfo?.platform_uid || 'unknown';
    const now = Date.now();
    const result = [];

    for (const [category, config] of Object.entries(COOLDOWN_CONFIG)) {
      const key = `${platform}:${uid}:${category}`;
      const lastUsed = this.cooldowns.get(key) || 0;
      const weight = userInfo?.total_weight || 0;
      const weightFactor = Math.max(0.2, 1 - weight / 2000);
      const cooldownMs = Math.max(config.minCooldown * 1000, config.base * 1000 * weightFactor);
      const remaining = Math.max(0, cooldownMs - (now - lastUsed));

      result.push({
        category,
        baseCooldown: config.base,
        effectiveCooldown: Math.round(cooldownMs / 1000),
        remaining: Math.round(remaining / 1000),
        ready: remaining === 0,
      });
    }
    return result;
  }
}