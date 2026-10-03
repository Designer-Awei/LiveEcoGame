// ============================================================
// 2.5D 等距视角渲染引擎
// ============================================================

// ── 等距常量 ──
const TILE_W = 32;
const TILE_H = 16;
const GRID_COLS = 14;
const GRID_ROWS = 10;

// ── 生物群落配色 ──
const BIOME_THEMES = {
  mountain: {
    ground: ['#4a5568', '#5a6a7a', '#6b7d8e'],
    water: '#3b82f6',
    tree: '#2d3436',
    treeTop: '#dfe6e9',
    sky1: '#1a1a2e',
    sky2: '#2d3561',
    accent: '#b2bec3',
  },
  lake: {
    ground: ['#2563eb', '#3b82f6', '#60a5fa'],
    water: '#1d4ed8',
    tree: '#166534',
    treeTop: '#4ade80',
    sky1: '#0c1445',
    sky2: '#1e3a5f',
    accent: '#93c5fd',
  },
  rainforest: {
    ground: ['#166534', '#15803d', '#22c55e'],
    water: '#0d9488',
    tree: '#14532d',
    treeTop: '#86efac',
    sky1: '#052e16',
    sky2: '#14532d',
    accent: '#fde047',
  },
  desert: {
    ground: ['#ca8a04', '#d97706', '#f59e0b'],
    water: '#fbbf24',
    tree: '#92400e',
    treeTop: '#fde68a',
    sky1: '#451a03',
    sky2: '#78350f',
    accent: '#fcd34d',
  },
  volcano: {
    ground: ['#7f1d1d', '#991b1b', '#dc2626'],
    water: '#ef4444',
    tree: '#1c1917',
    treeTop: '#f87171',
    sky1: '#1c0a00',
    sky2: '#450a0a',
    accent: '#fca5a5',
  },
  icefield: {
    ground: ['#e2e8f0', '#cbd5e1', '#94a3b8'],
    water: '#7dd3fc',
    tree: '#94a3b8',
    treeTop: '#f0f9ff',
    sky1: '#f0f9ff',
    sky2: '#e0f2fe',
    accent: '#bae6fd',
  },
  grassland: {
    ground: ['#15803d', '#16a34a', '#22c55e'],
    water: '#0ea5e9',
    tree: '#166534',
    treeTop: '#bbf7d0',
    sky1: '#052e16',
    sky2: '#14532d',
    accent: '#fde047',
  },
  island: {
    ground: ['#ca8a04', '#d97706', '#fbbf24'],
    water: '#0284c7',
    tree: '#166534',
    treeTop: '#4ade80',
    sky1: '#0c4a6e',
    sky2: '#075985',
    accent: '#7dd3fc',
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
    this._initTiles();
  }

  setBiome(biomeId) {
    this.biomeId = biomeId;
    this.theme = BIOME_THEMES[biomeId] || BIOME_THEMES.grassland;
    this._initTiles();
  }

  _initTiles() {
    this.tiles = [];
    const rng = this._seededRandom(this.biomeId.length * 137);
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const heightVar = Math.floor(rng() * 3);
        const colorIdx = Math.floor(rng() * this.theme.ground.length);
        this.tiles.push({
          r, c,
          height: heightVar,
          color: this.theme.ground[colorIdx],
          hasTree: rng() < 0.12,
          hasRock: rng() < 0.06,
          hasWater: rng() < 0.05 && this.biomeId !== 'desert' && this.biomeId !== 'volcano',
        });
      }
    }
  }

  resize(w, h) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
  }

  render(creatures, stats, weather) {
    const { ctx, w, h } = this;
    if (!w || !h) return;
    this.frame++;

    ctx.clearRect(0, 0, w, h);

    // 天空
    this._drawSky(w, h, stats);

    // 等距网格偏移（居中）
    const totalGridW = (GRID_COLS + GRID_ROWS) * TILE_W / 2;
    const totalGridH = (GRID_COLS + GRID_ROWS) * TILE_H / 2;
    const offsetX = (w - totalGridW) / 2;
    const offsetY = h * 0.08;

    // 绘制地面瓦片
    for (const tile of this.tiles) {
      this._drawTile(tile, offsetX, offsetY);
    }

    // 绘制装饰物
    for (const tile of this.tiles) {
      if (tile.hasTree) this._drawTree(tile, offsetX, offsetY);
      if (tile.hasRock) this._drawRock(tile, offsetX, offsetY);
      if (tile.hasWater) this._drawWater(tile, offsetX, offsetY);
    }

    // 绘制生物
    if (creatures) this._drawCreatures(creatures, offsetX, offsetY, w, h);

    // 天气效果
    if (weather) this._drawWeather(w, h, weather);

    // 季节色调
    if (stats) this._drawSeasonOverlay(w, h, stats.season);

    // 粒子更新
    this._updateParticles(ctx);
  }

  // ── 等距坐标转换 ──
  _isoX(r, c, ox) { return ox + (c - r) * TILE_W / 2; }
  _isoY(r, c, oy) { return oy + (c + r) * TILE_H / 2; }

  // ── 天空 ──
  _drawSky(w, h, stats) {
    const { ctx, theme } = this;
    const grad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    grad.addColorStop(0, theme.sky1);
    grad.addColorStop(1, theme.sky2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 星星（夜晚效果）
    if (this.biomeId === 'icefield' || this.biomeId === 'mountain') {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      const rng = this._seededRandom(42);
      for (let i = 0; i < 15; i++) {
        const sx = rng() * w;
        const sy = rng() * h * 0.3;
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
    const x = this._isoX(tile.r, tile.c, ox);
    const y = this._isoY(tile.r, tile.c, oy) - tile.height * 3;

    // 顶面
    ctx.fillStyle = tile.color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + TILE_W / 2, y + TILE_H / 2);
    ctx.lineTo(x, y + TILE_H);
    ctx.lineTo(x - TILE_W / 2, y + TILE_H / 2);
    ctx.closePath();
    ctx.fill();

    // 左面（暗）
    ctx.fillStyle = this._darken(tile.color, 0.7);
    ctx.beginPath();
    ctx.moveTo(x - TILE_W / 2, y + TILE_H / 2);
    ctx.lineTo(x, y + TILE_H);
    ctx.lineTo(x, y + TILE_H + 4);
    ctx.lineTo(x - TILE_W / 2, y + TILE_H / 2 + 4);
    ctx.closePath();
    ctx.fill();

    // 右面（更暗）
    ctx.fillStyle = this._darken(tile.color, 0.5);
    ctx.beginPath();
    ctx.moveTo(x + TILE_W / 2, y + TILE_H / 2);
    ctx.lineTo(x, y + TILE_H);
    ctx.lineTo(x, y + TILE_H + 4);
    ctx.lineTo(x + TILE_W / 2, y + TILE_H / 2 + 4);
    ctx.closePath();
    ctx.fill();
  }

  // ── 树木 ──
  _drawTree(tile, ox, oy) {
    const { ctx } = this;
    const x = this._isoX(tile.r, tile.c, ox);
    const y = this._isoY(tile.r, tile.c, oy) - tile.height * 3;
    const sway = Math.sin(this.frame * 0.02 + tile.r + tile.c) * 1.5;

    // 树干
    ctx.fillStyle = this.theme.tree;
    ctx.fillRect(x - 1.5, y - 10, 3, 10);

    // 树冠
    ctx.fillStyle = this.theme.treeTop;
    ctx.beginPath();
    ctx.arc(x + sway, y - 14, 6, 0, Math.PI * 2);
    ctx.fill();

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 岩石 ──
  _drawRock(tile, ox, oy) {
    const { ctx } = this;
    const x = this._isoX(tile.r, tile.c, ox);
    const y = this._isoY(tile.r, tile.c, oy) - tile.height * 3;

    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x - 2, y - 5);
    ctx.lineTo(x + 3, y - 4);
    ctx.lineTo(x + 4, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 5);
    ctx.lineTo(x + 1, y - 6);
    ctx.lineTo(x + 3, y - 4);
    ctx.closePath();
    ctx.fill();
  }

  // ── 水面 ──
  _drawWater(tile, ox, oy) {
    const { ctx } = this;
    const x = this._isoX(tile.r, tile.c, ox);
    const y = this._isoY(tile.r, tile.c, oy) - tile.height * 3;
    const wave = Math.sin(this.frame * 0.04 + tile.r * 2) * 1;

    ctx.fillStyle = this.theme.water;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y + wave);
    ctx.lineTo(x + TILE_W / 2, y + TILE_H / 2 + wave);
    ctx.lineTo(x, y + TILE_H + wave);
    ctx.lineTo(x - TILE_W / 2, y + TILE_H / 2 + wave);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── 生物绘制 ──
  _drawCreatures(creatures, ox, oy, w, h) {
    const { ctx } = this;
    // 过滤出top5物种，每种最多画15个
    const top = creatures.filter(c => c.count > 0).slice(0, 6);

    for (const creature of top) {
      const drawCount = Math.min(creature.count, 15);
      for (let i = 0; i < drawCount; i++) {
        const hash = this._hash(creature.name + i + this.biomeId);
        const r = hash % GRID_ROWS;
        const c = (hash * 7) % GRID_COLS;
        const x = this._isoX(r, c, ox);
        const y = this._isoY(r, c, oy) - (this.tiles[r * GRID_COLS + c]?.height || 0) * 3;
        const bob = Math.sin(this.frame * 0.03 + hash) * 2;

        // 阴影
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(x, y + 2, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // emoji生物
        ctx.font = '12px serif';
        ctx.textAlign = 'center';
        ctx.fillText(creature.emoji, x, y - 2 + bob);

        // 数量标签（只对第一个显示）
        if (i === 0 && creature.count > 1) {
          ctx.font = 'bold 8px sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.fillText(`×${creature.count}`, x, y - 12 + bob);
        }
      }
    }
  }

  // ── 天气效果 ──
  _drawWeather(w, h, weather) {
    const { ctx } = this;
    if (weather === 'rain') {
      ctx.strokeStyle = 'rgba(116,185,255,0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        const rx = (this.frame * 4 + i * 28) % w;
        const ry = (this.frame * 6 + i * 22) % h;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 1.5, ry + 7);
        ctx.stroke();
      }
    } else if (weather === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 25; i++) {
        const sx = (this.frame * 0.8 + i * 23) % w;
        const sy = (this.frame * 1.2 + i * 19) % h;
        const drift = Math.sin(this.frame * 0.02 + i) * 3;
        ctx.beginPath();
        ctx.arc(sx + drift, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (weather === 'drought') {
      ctx.fillStyle = 'rgba(253,203,110,0.08)';
      ctx.fillRect(0, 0, w, h);
      // 热浪扭曲
      for (let i = 0; i < 5; i++) {
        const hy = h * 0.8 + i * 5;
        ctx.strokeStyle = 'rgba(253,203,110,0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < w; x += 5) {
          const distort = Math.sin(x * 0.02 + this.frame * 0.05 + i) * 2;
          if (x === 0) ctx.moveTo(x, hy + distort);
          else ctx.lineTo(x, hy + distort);
        }
        ctx.stroke();
      }
    } else if (weather === 'heatwave') {
      ctx.fillStyle = 'rgba(239,68,68,0.04)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ── 季节色调 ──
  _drawSeasonOverlay(w, h, season) {
    const { ctx } = this;
    if (season === 'autumn') {
      ctx.fillStyle = 'rgba(253,203,110,0.06)';
      ctx.fillRect(0, 0, w, h);
    } else if (season === 'winter') {
      ctx.fillStyle = 'rgba(200,220,240,0.08)';
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