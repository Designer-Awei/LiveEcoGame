// ============================================================
// 事件引擎 · 状态机 + 预定义事件库
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
// 弹幕路由器 · 自然语言 → 事件映射
// ============================================================

const KEYWORD_MAP = [
  // 天气
  { keywords: ['下雨', '雨', '下雨了', '降雨'], event: { type: 'weather', name: '降雨', effect: 'rain', icon: '🌧️' } },
  { keywords: ['晴天', '晴', '太阳', '天晴'], event: { type: 'weather', name: '晴天', effect: 'clear', icon: '☀️' } },
  { keywords: ['雪', '下雪', '下雪了'], event: { type: 'weather', name: '降雪', effect: 'snow', icon: '🌨️' } },
  { keywords: ['干旱', '旱', '大旱'], event: { type: 'weather', name: '干旱', effect: 'drought', icon: '🏜️' } },
  { keywords: ['暴风', '风暴', '台风', '飓风'], event: { type: 'weather', name: '暴风', effect: 'rain', icon: '🌪️' } },
  { keywords: ['热浪', '酷热', '高温'], event: { type: 'weather', name: '热浪', effect: 'heatwave', icon: '🌡️' } },

  // 灾害
  { keywords: ['地震'], event: { type: 'disaster', name: '地震', damage: 0.15, icon: '🌋' } },
  { keywords: ['洪水', '海啸', '大水'], event: { type: 'disaster', name: '洪水', damage: 0.2, icon: '🌊' } },
  { keywords: ['瘟疫', '病毒', '疫病'], event: { type: 'disaster', name: '瘟疫', damage: 0.1, icon: '☠️' } },
  { keywords: ['蝗灾', '蝗虫'], event: { type: 'disaster', name: '蝗灾', damage: 0.25, icon: '🦗' } },
  { keywords: ['火山', '喷发', '火山喷发'], event: { type: 'disaster', name: '火山喷发', damage: 0.3, icon: '🌋' } },
  { keywords: ['山火', '火灾', '着火'], event: { type: 'disaster', name: '山火', damage: 0.2, icon: '🔥' } },

  // 投放生物（根据关键词自动匹配）
  { keywords: ['兔子', '兔', '野兔'], event: { type: 'creature_add', name: '野兔', species: 'rabbit', count: 5, icon: '🐰' } },
  { keywords: ['狼'], event: { type: 'creature_add', name: '狼', species: 'wolf', count: 2, icon: '🐺' } },
  { keywords: ['熊', '大熊'], event: { type: 'creature_add', name: '熊', species: 'bear', count: 1, icon: '🐻' } },
  { keywords: ['鹰', '老鹰'], event: { type: 'creature_add', name: '鹰', species: 'eagle', count: 2, icon: '🦅' } },
  { keywords: ['鹿'], event: { type: 'creature_add', name: '鹿', species: 'deer', count: 3, icon: '🦌' } },
  { keywords: ['鱼', '小鱼'], event: { type: 'creature_add', name: '鱼', species: 'fish', count: 10, icon: '🐟' } },
  { keywords: ['蛇'], event: { type: 'creature_add', name: '蛇', species: 'snake', count: 3, icon: '🐍' } },
  { keywords: ['蝴蝶'], event: { type: 'creature_add', name: '蝴蝶', species: 'butterfly', count: 8, icon: '🦋' } },
  { keywords: ['猴子', '猴'], event: { type: 'creature_add', name: '猴子', species: 'monkey', count: 4, icon: '🐒' } },
  { keywords: ['狮子'], event: { type: 'creature_add', name: '狮子', species: 'wolf', count: 2, icon: '🦁' } }, // 狮子用狼的属性
  { keywords: ['恐龙', '龙'], event: { type: 'creature_add', name: '远古巨兽', species: 'magmadragon', count: 1, icon: '🐉' } },
  { keywords: ['凤凰', '不死鸟'], event: { type: 'creature_add', name: '凤凰', species: 'phoenix', count: 1, icon: '🔥' } },
  { keywords: ['熊猫', '大熊猫'], event: { type: 'creature_add', name: '熊猫', species: 'bear', count: 2, icon: '🐼' } },
  { keywords: ['企鹅'], event: { type: 'creature_add', name: '企鹅', species: 'penguin', count: 5, icon: '🐧' } },
  { keywords: ['海豚', '海豚'], event: { type: 'creature_add', name: '海豚', species: 'dolphin', count: 3, icon: '🐬' } },
  { keywords: ['鲨鱼'], event: { type: 'creature_add', name: '鲨鱼', species: 'shark', count: 1, icon: '🦈' } },
  { keywords: ['北极熊'], event: { type: 'creature_add', name: '北极熊', species: 'polarbear', count: 1, icon: '🐻‍❄️' } },
  { keywords: ['狐狸'], event: { type: 'creature_add', name: '狐狸', species: 'fox', count: 3, icon: '🦊' } },

  // 增益/祝福
  { keywords: ['进化', '变异', '突变'], event: { type: 'mutation', name: '进化突变', icon: '🧬' } },
  { keywords: ['祝福', '神圣', '神谕'], event: { type: 'blessing', name: '神圣祝福', icon: '✨' } },
  { keywords: ['丰收', '资源', '生长'], event: { type: 'resource', name: '资源涌现', icon: '🌿' } },
  { keywords: ['春天', '春'], event: { type: 'weather', name: '春风', effect: 'clear', icon: '🌸' } },
  { keywords: ['夏天', '夏'], event: { type: 'weather', name: '酷暑', effect: 'heatwave', icon: '☀️' } },
  { keywords: ['秋天', '秋'], event: { type: 'weather', name: '秋风', effect: 'clear', icon: '🍂' } },
  { keywords: ['冬天', '冬'], event: { type: 'weather', name: '寒冬', effect: 'snow', icon: '❄️' } },
];

export class DanmakuRouter {
  constructor() {
    this.keywords = KEYWORD_MAP;
  }

  parse(text) {
    if (!text) return null;
    text = text.trim().toLowerCase();
    for (const mapping of this.keywords) {
      for (const kw of mapping.keywords) {
        if (text.includes(kw)) {
          return { ...mapping.event };
        }
      }
    }
    return null;
  }
}