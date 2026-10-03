// ============================================================
// 2.5D 等距视角渲染引擎（自适应尺寸 + 生物走动）
// ============================================================

// ── 生物群落配色 ──
const BIOME_THEMES = {
  mountain: {
    ground: ['#4a5568', '#5a6a7a', '#6b7d8e'],
    water: '#3b82f6', tree: '#2d3436', treeTop: '#dfe6e9',
    sky1: '#1a1a2e', sky2: '#2d3561', accent: '#b2bec3',
  },
  lake: {
    ground: ['#2563eb', '#3b82f6', '#60a5fa'],
    water: '#1d4ed8', tree: '#166534', treeTop: '#4ade80',
    sky1: '#0c1445', sky2: '#1e3a5f', accent: '#93c5fd',
  },
  rainforest: {
    ground: ['#166534', '#15803d', '#22c55e'],
    water: '#0d9488', tree: '#14532d', treeTop: '#86efac',
    sky1: '#052e16', sky2: '#14532d', accent: '#fde047',
  },
  desert: {
    ground: ['#ca8a04', '#d97706', '#f59e0b'],
    water: '#fbbf24', tree: '#92400e', treeTop: '#fde68a',
    sky1: '#451a03', sky2: '#78350f', accent: '#fcd34d',
  },
  volcano: {
    ground: ['#7f1d1d', '#991b1b', '#dc2626'],
    water: '#ef4444', tree: '#1c1917', treeTop: '#f87171',
    sky1: '#1c0a00', sky2: '#450a0a', accent: '#fca5a5',
  },
  icefield: {
    ground: ['#e2e8f0', '#cbd5e1', '#94a3b8'],
    water: '#7dd3fc', tree: '#94a3b8', treeTop: '#f0f9ff',
    sky1: '#f0f9ff', sky2: '#e0f2fe', accent: '#bae6fd',
  },
  grassland: {
    ground: ['#15803d', '#16a34a', '#22c55e'],
    water: '#0ea5e9', tree: '#166534', treeTop: '#bbf7d0',
    sky1: '#052e16', sky2: '#14532d', accent: '#fde047',
  },
  island: {
    ground: ['#ca8a04', '#d97706', '#fbbf24'],
    water: '#0284c7', tree: '#166534', treeTop: '#4ade80',
    sky1: '#0c4a6e', sky2: '#075985', accent: '#7dd3fc',
  },
};

export class IsometricRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.frame = 0;
    this.biomeId = 'grassland';
    this.theme = BIOME_THEMES.grassland;
    this.tiles = [];
    this.particles = [];
    this.creatures = [];   // 活的生物实例（有位置和移动状态）
    this._initTiles();
  }

  setBiome(biomeId) {
    this.biomeId = biomeId;
    this.theme = BIOME_THEMES[biomeId] || BIOME_THEMES.grassland;
    this._initTiles();
    this.creatures = []; // 切换群落时清空生物
  }

  _initTiles() {
    this.tiles = [];
    const rng = this._seededRandom(this.biomeId.length * 137);
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const heightVar = Math.floor(rng() * 3);
        const colorIdx = Math.floor(rng() * this.theme.ground.length);
        this.tiles.push({
          r, c,
          height: heightVar,
          color: this.theme.ground[colorIdx],
          hasTree: rng() < 0.15,
          hasRock: rng() < 0.07,
          hasWater: rng() < 0.06 && this.biomeId !== 'desert' && this.biomeId !== 'volcano',
          hasFlower: rng() < 0.1,
        });
      }
    }
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this._calcGrid(w, h);

    // Canvas 始终用面板实际尺寸 × DPR
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _calcGrid(w, h) {
    const cols = 12, rows = 12;
    this.gridCols = cols;
    this.gridRows = rows;

    // 等距菱形：宽 = (cols+rows)*tw/2, 高 = (cols+rows)*th/2
    // tw = 2*th → 宽 = (cols+rows)*th, 高 = (cols+rows)*th/2
    // 即 宽 = 2*高（固定比例）
    // 面板 h ≈ w（竖屏），所以菱形高度撑满面板时，宽度 = 2*h，超出面板
    // 解法：让 th 使得菱形高 = 面板高，宽度溢出裁切
    const th = h / ((cols + rows) / 2);  // 菱形高度 = h
    this.tileH = th;
    this.tileW = th * 2;

    // 居中偏移
    const diamondW = (cols + rows) * this.tileW / 2;
    const diamondH = (cols + rows) * this.tileH / 2;
    this.offsetX = (w - diamondW) / 2;
    this.offsetY = (h - diamondH) / 2;  // ≈ 0

    if (this.tiles.length !== cols * rows) {
      this._initTiles();
    }
  }

  render(creatures, stats, weather) {
    const { ctx, w, h } = this;
    if (!w || !h) return;
    this.frame++;

    ctx.clearRect(0, 0, w, h);

    // 天空
    this._drawSky(w, h, stats);

    const ox = this.offsetX;
    const oy = this.offsetY;

    // 绘制地面瓦片
    for (const tile of this.tiles) {
      this._drawTile(tile, ox, oy);
    }

    // 绘制装饰物
    for (const tile of this.tiles) {
      if (tile.hasTree) this._drawTree(tile, ox, oy);
      if (tile.hasRock) this._drawRock(tile, ox, oy);
      if (tile.hasWater) this._drawWater(tile, ox, oy);
      if (tile.hasFlower) this._drawFlower(tile, ox, oy);
    }

    // 更新和绘制生物（带走动动画）
    this._syncCreatures(creatures);
    this._updateCreatureMovement();
    this._drawAllCreatures(ox, oy);

    // 天气效果
    if (weather) this._drawWeather(w, h, weather);

    // 季节色调
    if (stats) this._drawSeasonOverlay(w, h, stats.season);

    // 粒子更新
    this._updateParticles(ctx);
  }

  // ── 等距坐标转换 ──
  _isoX(r, c, ox) { return ox + (c - r) * this.tileW / 2; }
  _isoY(r, c, oy) { return oy + (c + r) * this.tileH / 2; }

  // ── 天空 ──
  _drawSky(w, h, stats) {
    const { ctx, theme } = this;
    const grad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    grad.addColorStop(0, theme.sky1);
    grad.addColorStop(1, theme.sky2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 星星（夜晚群落）
    if (this.biomeId === 'icefield' || this.biomeId === 'mountain' || this.biomeId === 'volcano') {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      const rng = this._seededRandom(42);
      for (let i = 0; i < 20; i++) {
        const sx = rng() * w;
        const sy = rng() * h * 0.35;
        const twinkle = Math.sin(this.frame * 0.05 + i) * 0.3 + 0.7;
        ctx.globalAlpha = twinkle;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ── 等距瓦片 ──
  _drawTile(tile, ox, oy) {
    const { ctx } = this;
    const tw = this.tileW, th = this.tileH;
    const x = this._isoX(tile.r, tile.c, ox);
    const y = this._isoY(tile.r, tile.c, oy) - tile.height * 3;

    // 顶面
    ctx.fillStyle = tile.color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + tw / 2, y + th / 2);
    ctx.lineTo(x, y + th);
    ctx.lineTo(x - tw / 2, y + th / 2);
    ctx.closePath();
    ctx.fill();

    // 左面（暗）
    ctx.fillStyle = this._darken(tile.color, 0.7);
    ctx.beginPath();
    ctx.moveTo(x - tw / 2, y + th / 2);
    ctx.lineTo(x, y + th);
    ctx.lineTo(x, y + th + 4);
    ctx.lineTo(x - tw / 2, y + th / 2 + 4);
    ctx.closePath();
    ctx.fill();

    // 右面（更暗）
    ctx.fillStyle = this._darken(tile.color, 0.5);
    ctx.beginPath();
    ctx.moveTo(x + tw / 2, y + th / 2);
    ctx.lineTo(x, y + th);
    ctx.lineTo(x, y + th + 4);
    ctx.lineTo(x + tw / 2, y + th / 2 + 4);
    ctx.closePath();
    ctx.fill();
  }

  // ── 树木 ──
  _drawTree(tile, ox, oy) {
    const { ctx } = this;
    const x = this._isoX(tile.r, tile.c, ox);
    const y = this._isoY(tile.r, tile.c, oy) - tile.height * 3;
    const sway = Math.sin(this.frame * 0.02 + tile.r + tile.c) * 2;
    const scale = this.tileH / 16; // 缩放适配瓦片大小

    // 树干
    ctx.fillStyle = this.theme.tree;
    ctx.fillRect(x - 1.5 * scale, y - 12 * scale, 3 * scale, 12 * scale);

    // 树冠
    ctx.fillStyle = this.theme.treeTop;
    ctx.beginPath();
    ctx.arc(x + sway, y - 16 * scale, 7 * scale, 0, Math.PI * 2);
    ctx.fill();

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 6 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 岩石 ──
  _drawRock(tile, ox, oy) {
    const { ctx } = this;
    const x = this._isoX(tile.r, tile.c, ox);
    const y = this._isoY(tile.r, tile.c, oy) - tile.height * 3;
    const s = this.tileH / 16;

    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.moveTo(x - 5 * s, y);
    ctx.lineTo(x - 2 * s, y - 6 * s);
    ctx.lineTo(x + 4 * s, y - 5 * s);
    ctx.lineTo(x + 5 * s, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.moveTo(x - 2 * s, y - 6 * s);
    ctx.lineTo(x + 1 * s, y - 7 * s);
    ctx.lineTo(x + 4 * s, y - 5 * s);
    ctx.closePath();
    ctx.fill();
  }

  // ── 水面 ──
  _drawWater(tile, ox, oy) {
    const { ctx } = this;
    const tw = this.tileW, th = this.tileH;
    const x = this._isoX(tile.r, tile.c, ox);
    const y = this._isoY(tile.r, tile.c, oy) - tile.height * 3;
    const wave = Math.sin(this.frame * 0.04 + tile.r * 2) * 1.5;

    ctx.fillStyle = this.theme.water;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y + wave);
    ctx.lineTo(x + tw / 2, y + th / 2 + wave);
    ctx.lineTo(x, y + th + wave);
    ctx.lineTo(x - tw / 2, y + th / 2 + wave);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── 小花 ──
  _drawFlower(tile, ox, oy) {
    const { ctx } = this;
    const x = this._isoX(tile.r, tile.c, ox);
    const y = this._isoY(tile.r, tile.c, oy) - tile.height * 3;
    const colors = ['#f472b6', '#fb923c', '#facc15', '#a78bfa', '#34d399'];
    const ci = (tile.r * 7 + tile.c * 3) % colors.length;
    const s = this.tileH / 16;

    ctx.fillStyle = colors[ci];
    ctx.beginPath();
    ctx.arc(x + 3 * s, y - 1 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 生物走动系统 ──
  _syncCreatures(creaturesData) {
    if (!creaturesData) return;

    // 获取当前应该存在的物种和数量
    const desired = new Map();
    for (const c of creaturesData) {
      if (c.count > 0) desired.set(c.name, c);
    }

    // 移除已灭绝的物种
    this.creatures = this.creatures.filter(c => desired.has(c.species));

    // 为每个物种确保有足够的实体
    for (const [species, data] of desired) {
      const existing = this.creatures.filter(c => c.species === species);
      const targetCount = Math.min(data.count, 12); // 每种最多12个实体

      // 添加新实体
      while (this.creatures.filter(c => c.species === species).length < targetCount) {
        this.creatures.push(this._createCreatureEntity(species, data));
      }

      // 移除多余实体
      const spCreatures = this.creatures.filter(c => c.species === species);
      while (spCreatures.length > targetCount) {
        const idx = this.creatures.findIndex(c => c.species === species);
        if (idx >= 0) { this.creatures.splice(idx, 1); spCreatures.pop(); }
      }
    }
  }

  _createCreatureEntity(species, data) {
    const rng = Math.random;
    const r = Math.floor(rng() * this.gridRows);
    const c = Math.floor(rng() * this.gridCols);
    return {
      species,
      emoji: data.emoji,
      type: data.type,
      count: data.count,
      r, c,
      targetR: r, targetC: c,
      moveProgress: 1, // 1 = arrived
      moveSpeed: 0.005 + rng() * 0.01,
      bobPhase: rng() * Math.PI * 2,
      facing: rng() > 0.5 ? 1 : -1,
      idleTimer: Math.floor(rng() * 120),
    };
  }

  _updateCreatureMovement() {
    for (const cr of this.creatures) {
      if (cr.moveProgress < 1) {
        cr.moveProgress = Math.min(1, cr.moveProgress + cr.moveSpeed);
        if (cr.moveProgress >= 1) {
          cr.r = cr.targetR;
          cr.c = cr.targetC;
          cr.idleTimer = 60 + Math.floor(Math.random() * 180); // 停留1~4秒
        }
      } else {
        cr.idleTimer--;
        if (cr.idleTimer <= 0) {
          // 选择新目标
          const dr = Math.floor(Math.random() * 3) - 1;
          const dc = Math.floor(Math.random() * 3) - 1;
          cr.targetR = Math.max(0, Math.min(this.gridRows - 1, cr.r + dr));
          cr.targetC = Math.max(0, Math.min(this.gridCols - 1, cr.c + dc));
          if (cr.targetR !== cr.r || cr.targetC !== cr.c) {
            cr.moveProgress = 0;
            cr.facing = cr.targetC > cr.c ? 1 : cr.targetC < cr.c ? -1 : cr.facing;
            cr.moveSpeed = cr.type === 'predator' ? 0.008 : cr.type === 'producer' ? 0.002 : 0.006;
          }
        }
      }
    }
  }

  _drawAllCreatures(ox, oy) {
    const { ctx } = this;

    // 按 Y 坐标排序（远处先画）
    const sorted = [...this.creatures].sort((a, b) => {
      const ya = a.r + a.c;
      const yb = b.r + b.c;
      return ya - yb;
    });

    for (const cr of sorted) {
      // 插值位置
      const drawR = cr.r + (cr.targetR - cr.r) * cr.moveProgress;
      const drawC = cr.c + (cr.targetC - cr.c) * cr.moveProgress;

      const x = ox + (drawC - drawR) * this.tileW / 2;
      const y = oy + (drawC + drawR) * this.tileH / 2;

      const bob = Math.sin(this.frame * 0.04 + cr.bobPhase) * 2;
      const scale = this.tileH / 16;
      const emojiSize = Math.max(10, 14 * scale);

      // 阴影
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(x, y + 2, 5 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // 生物 emoji
      ctx.save();
      ctx.translate(x, y - 3 + bob);
      ctx.scale(cr.facing, 1);
      ctx.font = `${emojiSize}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText(cr.emoji, 0, 0);
      ctx.restore();

      // 走动时的小尘土粒子
      if (cr.moveProgress < 1 && this.frame % 8 === 0) {
        this.particles.push({
          x: x + (Math.random() - 0.5) * 4,
          y: y + 2,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -Math.random() * 0.5,
          life: 20, maxLife: 20,
          size: 1.5 * scale,
          color: 'rgba(200,200,200,0.4)',
        });
      }
    }

    // 第一个生物显示数量标签（只显示数量最多的物种的代表）
    if (this.creatures.length > 0) {
      const speciesCounts = new Map();
      for (const cr of this.creatures) {
        if (!speciesCounts.has(cr.species)) speciesCounts.set(cr.species, cr);
      }
      let shown = 0;
      for (const [, cr] of speciesCounts) {
        if (shown >= 3) break; // 最多显示3个物种标签
        const drawR = cr.r + (cr.targetR - cr.r) * cr.moveProgress;
        const drawC = cr.c + (cr.targetC - cr.c) * cr.moveProgress;
        const x = ox + (drawC - drawR) * this.tileW / 2;
        const y = oy + (drawC + drawR) * this.tileH / 2;
        const bob = Math.sin(this.frame * 0.04 + cr.bobPhase) * 2;

        ctx.font = `bold ${Math.max(8, 9 * (this.tileH / 16))}px sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.textAlign = 'center';
        ctx.fillText(`${cr.emoji}×${cr.count}`, x, y - 14 * (this.tileH / 16) + bob);
        shown++;
      }
    }
  }

  // ── 天气效果 ──
  _drawWeather(w, h, weather) {
    const { ctx } = this;
    if (weather === 'rain') {
      ctx.strokeStyle = 'rgba(116,185,255,0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 25; i++) {
        const rx = (this.frame * 4 + i * 28) % w;
        const ry = (this.frame * 6 + i * 22) % h;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 1.5, ry + 8);
        ctx.stroke();
      }
    } else if (weather === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 30; i++) {
        const sx = (this.frame * 0.8 + i * 23) % w;
        const sy = (this.frame * 1.2 + i * 19) % h;
        const drift = Math.sin(this.frame * 0.02 + i) * 3;
        ctx.beginPath();
        ctx.arc(sx + drift, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (weather === 'drought') {
      ctx.fillStyle = 'rgba(253,203,110,0.06)';
      ctx.fillRect(0, 0, w, h);
    } else if (weather === 'heatwave') {
      ctx.fillStyle = 'rgba(239,68,68,0.04)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ── 季节色调 ──
  _drawSeasonOverlay(w, h, season) {
    const { ctx } = this;
    if (season === 'autumn') {
      ctx.fillStyle = 'rgba(253,203,110,0.05)';
      ctx.fillRect(0, 0, w, h);
    } else if (season === 'winter') {
      ctx.fillStyle = 'rgba(200,220,240,0.06)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ── 粒子系统 ──
  _updateParticles(ctx) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) return false;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return true;
    });
    // 限制粒子数量
    if (this.particles.length > 100) this.particles.splice(0, this.particles.length - 100);
  }

  // ── 工具函数 ──
  _darken(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
  }

  _seededRandom(seed) {
    let s = seed;
    return function() {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }
}