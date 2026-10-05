// ============================================================
// 2.5D 等距视角渲染引擎 v2（精细纹理 + 灾害动效 + 特种光效）
// ============================================================

// ── 生物群落配色（增强版） ──
const BIOME_THEMES = {
  mountain: {
    ground: ['#5a6a7a', '#6b7d8e', '#7c8fa2', '#8da0b4'],
    groundEdge: '#3d4f5e', water: '#5b9bd5', tree: '#2d3436', treeTop: '#dfe6e9',
    sky1: '#0f1628', sky2: '#2d3561', accent: '#b2bec3',
    ambient: 'snow', decos: ['pine', 'rock', 'crystal', 'snowman'],
  },
  lake: {
    ground: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
    groundEdge: '#1e40af', water: '#1d4ed8', tree: '#166534', treeTop: '#4ade80',
    sky1: '#0c1445', sky2: '#1e3a5f', accent: '#93c5fd',
    ambient: 'bubble', decos: ['lily', 'reed', 'lotus', 'cattail'],
  },
  rainforest: {
    ground: ['#166534', '#15803d', '#22c55e', '#4ade80'],
    groundEdge: '#14532d', water: '#0d9488', tree: '#14532d', treeTop: '#86efac',
    sky1: '#052e16', sky2: '#14532d', accent: '#fde047',
    ambient: 'firefly', decos: ['canopy', 'vine', 'mushroom', 'fern', 'flower2'],
  },
  desert: {
    ground: ['#ca8a04', '#d97706', '#f59e0b', '#fbbf24'],
    groundEdge: '#92400e', water: '#fbbf24', tree: '#92400e', treeTop: '#fde68a',
    sky1: '#451a03', sky2: '#78350f', accent: '#fcd34d',
    ambient: 'sand', decos: ['cactus', 'tumbleweed', 'bones', 'dune'],
  },
  volcano: {
    ground: ['#7f1d1d', '#991b1b', '#dc2626', '#ef4444'],
    groundEdge: '#450a0a', water: '#ef4444', tree: '#1c1917', treeTop: '#f87171',
    sky1: '#1c0a00', sky2: '#450a0a', accent: '#fca5a5',
    ambient: 'ember', decos: ['obsidian', 'lavapool', 'firevent', 'charred'],
  },
  icefield: {
    ground: ['#e2e8f0', '#cbd5e1', '#94a3b8', '#f0f9ff'],
    groundEdge: '#64748b', water: '#7dd3fc', tree: '#94a3b8', treeTop: '#f0f9ff',
    sky1: '#0f172a', sky2: '#1e3a5f', accent: '#bae6fd',
    ambient: 'snow', decos: ['icecrystal', 'frozentree', 'igloo', 'aurora'],
  },
  grassland: {
    ground: ['#15803d', '#16a34a', '#22c55e', '#4ade80'],
    groundEdge: '#14532d', water: '#0ea5e9', tree: '#166534', treeTop: '#bbf7d0',
    sky1: '#052e16', sky2: '#14532d', accent: '#fde047',
    ambient: 'butterfly', decos: ['oak', 'bush', 'wildflower', 'haystack'],
  },
  island: {
    ground: ['#ca8a04', '#d97706', '#fbbf24', '#fde68a'],
    groundEdge: '#92400e', water: '#0284c7', tree: '#166534', treeTop: '#4ade80',
    sky1: '#0c4a6e', sky2: '#075985', accent: '#7dd3fc',
    ambient: 'bubble', decos: ['palm', 'coconut', 'shell', 'driftwood'],
  },
};

// ── 灾害类型定义 ──
const DISASTER_FX = {
  '地震': { shake: 8, particles: '#8b5cf6', icon: '🌋', duration: 120 },
  '洪水': { shake: 3, particles: '#3b82f6', icon: '🌊', duration: 180 },
  '瘟疫': { shake: 0, particles: '#6b7280', icon: '☠️', duration: 180 },
  '蝗灾': { shake: 2, particles: '#84cc16', icon: '🦗', duration: 150 },
  '火山喷发': { shake: 10, particles: '#ef4444', icon: '🌋', duration: 200 },
  '山火': { shake: 2, particles: '#f97316', icon: '🔥', duration: 150 },
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
    this.creatures = [];
    this.ambientParts = [];
    this.disasterFX = null;
    this.shakeX = 0; this.shakeY = 0;
    this._initTiles();
    this._initAmbient();
  }

  setBiome(biomeId) {
    this.biomeId = biomeId;
    this.theme = BIOME_THEMES[biomeId] || BIOME_THEMES.grassland;
    this._initTiles();
    this._initAmbient();
    this.creatures = [];
    this.disasterFX = null;
  }

  triggerDisaster(name) {
    const fx = DISASTER_FX[name];
    if (fx) this.disasterFX = { ...fx, name, timer: fx.duration };
  }

  // ── 初始化 ──
  _initTiles() {
    this.tiles = [];
    const rng = this._seededRandom(this.biomeId.length * 137);
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const heightVar = Math.floor(rng() * 4);
        const colorIdx = Math.floor(rng() * this.theme.ground.length);
        // 每种装饰有独立概率
        const decoRoll = rng();
        let deco = null;
        const decos = this.theme.decos;
        if (decoRoll < 0.12) deco = decos[Math.floor(rng() * decos.length)];
        else if (decoRoll < 0.16) deco = 'generic';
        this.tiles.push({
          r, c,
          height: heightVar,
          color: this.theme.ground[colorIdx],
          colorAlt: this.theme.ground[(colorIdx + 1) % this.theme.ground.length],
          deco,
          hasWater: rng() < 0.07 && this.biomeId !== 'desert' && this.biomeId !== 'volcano',
          hasSparkle: rng() < 0.05,
          noise: rng(),
        });
      }
    }
  }

  _initAmbient() {
    this.ambientParts = [];
    const type = this.theme.ambient;
    for (let i = 0; i < 25; i++) {
      this.ambientParts.push({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.3,
        vy: type === 'snow' ? 0.2 + Math.random() * 0.3 : type === 'sand' ? 0.5 + Math.random() * 0.5 : -0.1 - Math.random() * 0.2,
        size: 1 + Math.random() * 2.5,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.3 + Math.random() * 0.5,
      });
    }
  }

  resize(w, h) {
    this.w = w; this.h = h;
    this._calcGrid(w, h);
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _calcGrid(w, h) {
    const cols = 12, rows = 12;
    this.gridCols = cols; this.gridRows = rows;
    const thByHeight = h / ((cols + rows) / 2);
    const thByWidth = w / (cols + rows);
    const th = Math.min(thByHeight, thByWidth);
    this.tileH = th; this.tileW = th * 2;
    const diamondW = (cols + rows) * this.tileW / 2;
    const diamondH = (cols + rows) * this.tileH / 2;
    this.offsetX = w / 2;
    this.offsetY = (h - diamondH) / 2;
    if (this.tiles.length !== cols * rows) this._initTiles();
  }

  // ── 主渲染 ──
  render(creatures, stats, weather) {
    const { ctx, w, h } = this;
    if (!w || !h) return;
    this.frame++;

    // 灾害震动
    if (this.disasterFX) {
      this.disasterFX.timer--;
      if (this.disasterFX.shake > 0) {
        this.shakeX = (Math.random() - 0.5) * this.disasterFX.shake;
        this.shakeY = (Math.random() - 0.5) * this.disasterFX.shake;
      }
      if (this.disasterFX.timer <= 0) { this.disasterFX = null; this.shakeX = 0; this.shakeY = 0; }
    }

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    this._drawSky(w, h, stats);
    const ox = this.offsetX, oy = this.offsetY;

    for (const tile of this.tiles) this._drawTile(tile, ox, oy);

    // 装饰物（按行排序，远处先画）
    const sorted = [...this.tiles].filter(t => t.deco).sort((a, b) => (a.r + a.c) - (b.r + b.c));
    for (const tile of sorted) this._drawDecoration(tile, ox, oy);

    this._syncCreatures(creatures);
    this._updateCreatureMovement();
    this._drawAllCreatures(ox, oy);

    this._drawAmbient(w, h);
    this._drawWeather(w, h, weather);
    if (stats?.season) this._drawSeasonOverlay(w, h, stats.season);
    if (this.disasterFX) this._drawDisasterFX(w, h);
    this._updateParticles(ctx);

    ctx.restore();
  }

  _isoX(r, c, ox) { return ox + (c - r) * this.tileW / 2; }
  _isoY(r, c, oy) { return oy + (c + r) * this.tileH / 2; }

  // ── 天空 ──
  _drawSky(w, h, stats) {
    const { ctx, theme } = this;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, theme.sky1);
    grad.addColorStop(0.6, theme.sky2);
    grad.addColorStop(1, this._darken(theme.sky2, 0.7));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 星星（夜空）
    for (let i = 0; i < 30; i++) {
      const sx = (i * 137.5 + this.frame * 0.01) % w;
      const sy = (i * 73.1) % (h * 0.4);
      const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(this.frame * 0.02 + i));
      ctx.globalAlpha = twinkle * 0.5;
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;

    // 月亮
    const moonX = w * 0.8, moonY = h * 0.12;
    const moonR = Math.min(w, h) * 0.04;
    ctx.fillStyle = 'rgba(255,255,220,0.15)';
    ctx.beginPath(); ctx.arc(moonX, moonY, moonR * 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef9c3';
    ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = theme.sky1;
    ctx.beginPath(); ctx.arc(moonX + moonR * 0.3, moonY - moonR * 0.2, moonR * 0.85, 0, Math.PI * 2); ctx.fill();
  }

  // ── 地面瓦片（增强纹理） ──
  _drawTile(tile, ox, oy) {
    const { ctx, theme } = this;
    const tw = this.tileW, th = this.tileH;
    const x = this._isoX(tile.r, tile.c, ox);
    const y = this._isoY(tile.r, tile.c, oy) - tile.height * 3;
    const s = th / 16;

    // 顶面渐变
    const tileGrad = ctx.createLinearGradient(x - tw/2, y, x + tw/2, y + th);
    tileGrad.addColorStop(0, tile.color);
    tileGrad.addColorStop(1, tile.colorAlt);
    ctx.fillStyle = tileGrad;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + tw/2, y + th/2); ctx.lineTo(x, y + th); ctx.lineTo(x - tw/2, y + th/2);
    ctx.closePath(); ctx.fill();

    // 纹理噪点
    if (tile.noise > 0.5) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(x - tw*0.15, y + th*0.3); ctx.lineTo(x + tw*0.1, y + th*0.45);
      ctx.lineTo(x - tw*0.05, y + th*0.55); ctx.closePath(); ctx.fill();
    }

    // 左侧面
    ctx.fillStyle = this._darken(tile.color, 0.65);
    ctx.beginPath();
    ctx.moveTo(x - tw/2, y + th/2); ctx.lineTo(x, y + th); ctx.lineTo(x, y + th + 4*s); ctx.lineTo(x - tw/2, y + th/2 + 4*s);
    ctx.closePath(); ctx.fill();

    // 右侧面
    ctx.fillStyle = this._darken(tile.color, 0.45);
    ctx.beginPath();
    ctx.moveTo(x + tw/2, y + th/2); ctx.lineTo(x, y + th); ctx.lineTo(x, y + th + 4*s); ctx.lineTo(x + tw/2, y + th/2 + 4*s);
    ctx.closePath(); ctx.fill();

    // 高度边缘高光
    if (tile.height > 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x - tw/2, y + th/2); ctx.lineTo(x, y + th); ctx.lineTo(x + tw/2, y + th/2);
      ctx.stroke();
    }

    // 水面
    if (tile.hasWater) this._drawWater(tile, ox, oy);

    // 闪光点（雪地/冰面）
    if (tile.hasSparkle && this.frame % 60 < 30) {
      const sparkle = Math.sin(this.frame * 0.1 + tile.r * 3 + tile.c * 7);
      if (sparkle > 0.7) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        const sx = x + (tile.noise - 0.5) * tw * 0.4;
        const sy = y + th * 0.4;
        ctx.beginPath(); ctx.arc(sx, sy, 1.2 * s, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // ── 水面 ──
  _drawWater(tile, ox, oy) {
    const { ctx, theme } = this;
    const tw = this.tileW, th = this.tileH;
    const x = this._isoX(tile.r, tile.c, ox);
    const y = this._isoY(tile.r, tile.c, oy) - tile.height * 3;
    const wave = Math.sin(this.frame * 0.04 + tile.r * 2) * 1.5;
    const wave2 = Math.cos(this.frame * 0.03 + tile.c * 3) * 1;

    // 水面底色
    ctx.fillStyle = theme.water;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(x, y + wave); ctx.lineTo(x + tw/2, y + th/2 + wave); ctx.lineTo(x, y + th + wave); ctx.lineTo(x - tw/2, y + th/2 + wave);
    ctx.closePath(); ctx.fill();

    // 波纹高光
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - tw*0.2, y + th*0.35 + wave2);
    ctx.lineTo(x + tw*0.15, y + th*0.5 + wave2);
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  // ── 装饰系统 ──
  _drawDecoration(tile, ox, oy) {
    const x = this._isoX(tile.r, tile.c, ox);
    const y = this._isoY(tile.r, tile.c, oy) - tile.height * 3;
    const s = this.tileH / 16;
    const sway = Math.sin(this.frame * 0.02 + tile.r * 1.5 + tile.c * 2.5) * 1.5;

    switch (tile.deco) {
      case 'pine': this._drawPine(x, y, s, sway); break;
      case 'rock': case 'obsidian': this._drawRock(x, y, s, tile.deco); break;
      case 'crystal': case 'icecrystal': this._drawCrystal(x, y, s); break;
      case 'snowman': this._drawSnowman(x, y, s); break;
      case 'lily': case 'lotus': this._drawLily(x, y, s, tile.deco); break;
      case 'reed': case 'cattail': this._drawReed(x, y, s, sway); break;
      case 'canopy': this._drawCanopy(x, y, s, sway); break;
      case 'vine': this._drawVine(x, y, s, sway); break;
      case 'mushroom': this._drawMushroom(x, y, s); break;
      case 'fern': this._drawFern(x, y, s, sway); break;
      case 'flower2': this._drawTropicalFlower(x, y, s); break;
      case 'cactus': this._drawCactus(x, y, s); break;
      case 'tumbleweed': this._drawTumbleweed(x, y, s); break;
      case 'bones': this._drawBones(x, y, s); break;
      case 'dune': this._drawDune(x, y, s); break;
      case 'lavapool': this._drawLavaPool(x, y, s); break;
      case 'firevent': this._drawFireVent(x, y, s); break;
      case 'charred': this._drawCharred(x, y, s); break;
      case 'frozentree': this._drawFrozenTree(x, y, s, sway); break;
      case 'igloo': this._drawIgloo(x, y, s); break;
      case 'aurora': break; // aurora drawn in sky
      case 'oak': this._drawOak(x, y, s, sway); break;
      case 'bush': this._drawBush(x, y, s); break;
      case 'wildflower': this._drawWildflower(x, y, s, sway); break;
      case 'haystack': this._drawHaystack(x, y, s); break;
      case 'palm': this._drawPalm(x, y, s, sway); break;
      case 'coconut': this._drawCoconut(x, y, s); break;
      case 'shell': this._drawShell(x, y, s); break;
      case 'driftwood': this._drawDriftwood(x, y, s); break;
      case 'generic': default: this._drawGenericDeco(x, y, s, tile); break;
    }
  }

  // ── 松树 ──
  _drawPine(x, y, s, sway) {
    const { ctx } = this;
    ctx.fillStyle = '#5c3d2e';
    ctx.fillRect(x - 1.2*s, y - 10*s, 2.4*s, 10*s);
    // 三层三角
    for (let i = 0; i < 3; i++) {
      const w = (7 - i*1.5) * s, h2 = 6*s, yy = y - (8 + i*5)*s;
      ctx.fillStyle = i === 0 ? '#1a4731' : i === 1 ? '#22543a' : '#2d6a4f';
      ctx.beginPath();
      ctx.moveTo(x + sway*0.5, yy - h2); ctx.lineTo(x - w/2, yy); ctx.lineTo(x + w/2, yy);
      ctx.closePath(); ctx.fill();
    }
    // 雪顶
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(x + sway*0.5, y - 22*s, 2.5*s, 0, Math.PI*2); ctx.fill();
    this._drawShadow(x, y, 6*s, 3*s);
  }

  // ── 岩石 ──
  _drawRock(x, y, s, type) {
    const { ctx } = this;
    const isObsidian = type === 'obsidian';
    ctx.fillStyle = isObsidian ? '#1e1e2e' : '#6b7280';
    ctx.beginPath();
    ctx.moveTo(x - 5*s, y); ctx.lineTo(x - 2*s, y - 7*s); ctx.lineTo(x + 3*s, y - 8*s);
    ctx.lineTo(x + 5*s, y - 2*s); ctx.lineTo(x + 4*s, y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = isObsidian ? '#3d3d5c' : '#9ca3af';
    ctx.beginPath();
    ctx.moveTo(x - 2*s, y - 7*s); ctx.lineTo(x + 1*s, y - 9*s); ctx.lineTo(x + 3*s, y - 8*s);
    ctx.closePath(); ctx.fill();
    if (isObsidian) {
      // 黑曜石反射
      ctx.fillStyle = 'rgba(139,92,246,0.3)';
      ctx.beginPath(); ctx.arc(x, y - 5*s, 1.5*s, 0, Math.PI*2); ctx.fill();
    }
    this._drawShadow(x, y, 5*s, 2.5*s);
  }

  // ── 水晶 ──
  _drawCrystal(x, y, s) {
    const { ctx } = this;
    const glow = 0.5 + 0.5 * Math.sin(this.frame * 0.03 + x);
    // 光晕
    ctx.fillStyle = `rgba(139,92,246,${0.12 * glow})`;
    ctx.beginPath(); ctx.arc(x, y - 8*s, 10*s, 0, Math.PI*2); ctx.fill();
    // 三根水晶
    const colors = ['#a78bfa', '#818cf8', '#c4b5fd'];
    for (let i = 0; i < 3; i++) {
      const angle = (i - 1) * 0.3;
      const cx = x + (i - 1) * 3 * s;
      const ch = (8 + i * 2) * s;
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.moveTo(cx, y - ch); ctx.lineTo(cx - 2*s, y - ch*0.3); ctx.lineTo(cx, y); ctx.lineTo(cx + 2*s, y - ch*0.3);
      ctx.closePath(); ctx.fill();
      // 高光
      ctx.fillStyle = `rgba(255,255,255,${0.3 * glow})`;
      ctx.beginPath();
      ctx.moveTo(cx, y - ch); ctx.lineTo(cx - 1*s, y - ch*0.5); ctx.lineTo(cx, y - ch*0.2);
      ctx.closePath(); ctx.fill();
    }
    this._drawShadow(x, y, 5*s, 2*s);
  }

  // ── 雪人 ──
  _drawSnowman(x, y, s) {
    const { ctx } = this;
    ctx.fillStyle = '#f0f9ff';
    ctx.beginPath(); ctx.arc(x, y - 3*s, 4*s, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - 9*s, 3*s, 0, Math.PI*2); ctx.fill();
    // 眼睛
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(x - 1*s, y - 10*s, 0.8*s, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 1*s, y - 10*s, 0.8*s, 0, Math.PI*2); ctx.fill();
    // 鼻子
    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.moveTo(x, y - 9*s); ctx.lineTo(x + 3*s, y - 9*s); ctx.lineTo(x, y - 8.5*s); ctx.closePath(); ctx.fill();
  }

  // ── 睡莲 ──
  _drawLily(x, y, s, type) {
    const { ctx } = this;
    const isLotus = type === 'lotus';
    // 荷叶
    ctx.fillStyle = '#22c55e';
    ctx.beginPath(); ctx.ellipse(x, y - 1*s, 5*s, 2.5*s, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath(); ctx.ellipse(x + 1*s, y - 1*s, 3.5*s, 1.5*s, 0.3, 0, Math.PI*2); ctx.fill();
    if (isLotus) {
      // 荷花
      const petals = ['#fda4af', '#fecdd3', '#fb7185'];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.fillStyle = petals[i % 3];
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a)*2.5*s, y - 3*s + Math.sin(a)*1.5*s, 2*s, 1*s, a, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(x, y - 3*s, 1.2*s, 0, Math.PI*2); ctx.fill();
    }
  }

  // ── 芦苇 ──
  _drawReed(x, y, s, sway) {
    const { ctx } = this;
    for (let i = 0; i < 4; i++) {
      const rx = x + (i - 1.5) * 2 * s;
      const rh = (8 + i * 2) * s;
      ctx.strokeStyle = '#4a7c59';
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(rx, y);
      ctx.quadraticCurveTo(rx + sway*0.8, y - rh*0.6, rx + sway*1.5, y - rh);
      ctx.stroke();
      // 顶部穗
      ctx.fillStyle = '#8b6914';
      ctx.beginPath(); ctx.ellipse(rx + sway*1.5, y - rh, 1.5*s, 3*s, 0, 0, Math.PI*2); ctx.fill();
    }
  }

  // ── 巨树（雨林） ──
  _drawCanopy(x, y, s, sway) {
    const { ctx } = this;
    // 粗壮树干
    ctx.fillStyle = '#5c3d2e';
    ctx.fillRect(x - 2.5*s, y - 16*s, 5*s, 16*s);
    // 树根
    ctx.fillStyle = '#4a2e1e';
    ctx.beginPath(); ctx.moveTo(x - 4*s, y); ctx.lineTo(x - 2.5*s, y - 4*s); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 4*s, y); ctx.lineTo(x + 2.5*s, y - 4*s); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    // 多层树冠
    const canopyColors = ['#15803d', '#16a34a', '#22c55e', '#4ade80'];
    for (let i = 0; i < 4; i++) {
      const cw = (14 - i*2) * s, ch = (6 + i*1.5) * s;
      const cy = y - (14 + i*4)*s;
      ctx.fillStyle = canopyColors[i];
      ctx.beginPath();
      ctx.ellipse(x + sway*0.3*(i+1)/4, cy, cw/2, ch/2, 0, 0, Math.PI*2);
      ctx.fill();
    }
    this._drawShadow(x, y, 8*s, 4*s);
  }

  // ── 藤蔓 ──
  _drawVine(x, y, s, sway) {
    const { ctx } = this;
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5 * s;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + (i-1)*3*s, y);
      ctx.quadraticCurveTo(x + (i-1)*3*s + sway*2, y - 8*s, x + (i-1)*3*s + sway*3, y - 14*s);
      ctx.stroke();
      // 叶子
      for (let j = 1; j < 4; j++) {
        const ly = y - j * 4 * s;
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.ellipse(x + (i-1)*3*s + sway*j*0.8, ly, 2.5*s, 1.2*s, sway*0.3, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }

  // ── 蘑菇 ──
  _drawMushroom(x, y, s) {
    const { ctx } = this;
    // 菌柄
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(x - 1.2*s, y - 6*s, 2.4*s, 6*s);
    // 菌盖
    const capColor = ['#ef4444', '#f97316', '#a78bfa'][Math.floor((x+y) % 3)];
    ctx.fillStyle = capColor;
    ctx.beginPath(); ctx.ellipse(x, y - 7*s, 4.5*s, 3*s, 0, Math.PI, Math.PI*2); ctx.fill();
    // 白点
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(x + (i-1)*2*s, y - (7.5 + i*0.3)*s, 0.8*s, 0, Math.PI*2); ctx.fill();
    }
  }

  // ── 蕨类 ──
  _drawFern(x, y, s, sway) {
    const { ctx } = this;
    for (let i = 0; i < 5; i++) {
      const angle = (i - 2) * 0.4;
      const len = (6 + Math.abs(i-2)) * s;
      ctx.fillStyle = i % 2 ? '#22c55e' : '#16a34a';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.sin(angle)*len*0.5 + sway, y - len*0.5, x + Math.sin(angle)*len, y - len*0.8);
      ctx.lineTo(x + Math.sin(angle)*len*0.8, y - len*0.7);
      ctx.quadraticCurveTo(x + Math.sin(angle)*len*0.3 + sway*0.5, y - len*0.3, x, y);
      ctx.closePath(); ctx.fill();
    }
  }

  // ── 热带花 ──
  _drawTropicalFlower(x, y, s) {
    const { ctx } = this;
    // 茎
    ctx.strokeStyle = '#166534'; ctx.lineWidth = 1.5*s;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 8*s); ctx.stroke();
    // 花瓣
    const colors = ['#f43f5e', '#fb923c', '#e879f9'];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + this.frame * 0.005;
      ctx.fillStyle = colors[i % 3];
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a)*3*s, y - 9*s + Math.sin(a)*3*s, 2.5*s, 1.2*s, a, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(x, y - 9*s, 2*s, 0, Math.PI*2); ctx.fill();
  }

  // ── 仙人掌 ──
  _drawCactus(x, y, s) {
    const { ctx } = this;
    ctx.fillStyle = '#166534';
    // 主干
    ctx.fillRect(x - 2.5*s, y - 14*s, 5*s, 14*s);
    // 手臂
    ctx.fillRect(x - 7*s, y - 10*s, 4.5*s, 3*s);
    ctx.fillRect(x - 7*s, y - 10*s, 3*s, 5*s);
    ctx.fillRect(x + 2.5*s, y - 7*s, 4.5*s, 3*s);
    ctx.fillRect(x + 5*s, y - 11*s, 3*s, 5*s);
    // 花
    ctx.fillStyle = '#f472b6';
    ctx.beginPath(); ctx.arc(x, y - 15*s, 2.5*s, 0, Math.PI*2); ctx.fill();
    // 刺纹
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 1*s, y - (3 + i*3)*s, 2*s, 0.5*s);
  }

  // ── 风滚草 ──
  _drawTumbleweed(x, y, s) {
    const { ctx } = this;
    const roll = this.frame * 0.02;
    ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1*s;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + roll;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a)*4*s, y - 4*s + Math.sin(a)*4*s);
      ctx.lineTo(x - Math.cos(a)*4*s, y - 4*s - Math.sin(a)*4*s);
      ctx.stroke();
    }
  }

  // ── 骨骼 ──
  _drawBones(x, y, s) {
    const { ctx } = this;
    ctx.fillStyle = '#fef9c3';
    // 骨头
    ctx.fillRect(x - 4*s, y - 1.5*s, 8*s, 2*s);
    ctx.beginPath(); ctx.arc(x - 4*s, y - 1.5*s, 2*s, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4*s, y - 1.5*s, 2*s, 0, Math.PI*2); ctx.fill();
    // 肋骨
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x - 1*s + i*2*s, y - 3*s, 2.5*s, Math.PI*0.8, Math.PI*1.8);
      ctx.lineWidth = 1.2*s; ctx.strokeStyle = '#fef9c3'; ctx.stroke();
    }
  }

  // ── 沙丘 ──
  _drawDune(x, y, s) {
    const { ctx } = this;
    const grad = ctx.createLinearGradient(x, y - 5*s, x, y);
    grad.addColorStop(0, '#fbbf24'); grad.addColorStop(1, '#d97706');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x - 10*s, y); ctx.quadraticCurveTo(x, y - 8*s, x + 10*s, y);
    ctx.closePath(); ctx.fill();
    // 沙纹
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 0.8;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 6*s + i*2*s, y - 1.5*s*i);
      ctx.quadraticCurveTo(x, y - 4*s - i*s, x + 6*s - i*2*s, y - 1.5*s*i);
      ctx.stroke();
    }
  }

  // ── 岩浆池 ──
  _drawLavaPool(x, y, s) {
    const { ctx } = this;
    const glow = 0.7 + 0.3 * Math.sin(this.frame * 0.05);
    // 发光
    ctx.fillStyle = `rgba(239,68,68,${0.15 * glow})`;
    ctx.beginPath(); ctx.arc(x, y - 2*s, 12*s, 0, Math.PI*2); ctx.fill();
    // 岩浆
    const grad = ctx.createRadialGradient(x, y - 2*s, 0, x, y - 2*s, 6*s);
    grad.addColorStop(0, `rgba(255,220,0,${glow})`);
    grad.addColorStop(0.5, `rgba(239,68,68,${glow})`);
    grad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(x, y - 2*s, 6*s, 3*s, 0, 0, Math.PI*2); ctx.fill();
    // 气泡
    if (this.frame % 30 < 5) {
      ctx.fillStyle = `rgba(255,255,100,${glow})`;
      ctx.beginPath(); ctx.arc(x + (Math.random()-0.5)*4*s, y - 3*s, 1.2*s, 0, Math.PI*2); ctx.fill();
    }
  }

  // ── 火山口 ──
  _drawFireVent(x, y, s) {
    const { ctx } = this;
    // 岩石口
    ctx.fillStyle = '#450a0a';
    ctx.beginPath(); ctx.ellipse(x, y - 2*s, 5*s, 3*s, 0, 0, Math.PI*2); ctx.fill();
    // 火焰
    for (let i = 0; i < 3; i++) {
      const fh = (6 + Math.sin(this.frame * 0.1 + i * 2) * 3) * s;
      const fx = x + (i - 1) * 2 * s;
      ctx.fillStyle = ['#f97316', '#fbbf24', '#ef4444'][i];
      ctx.beginPath();
      ctx.moveTo(fx - 1.5*s, y - 2*s);
      ctx.quadraticCurveTo(fx + Math.sin(this.frame*0.15+i)*2*s, y - 2*s - fh*0.6, fx, y - 2*s - fh);
      ctx.quadraticCurveTo(fx + Math.sin(this.frame*0.15+i)*2*s, y - 2*s - fh*0.6, fx + 1.5*s, y - 2*s);
      ctx.closePath(); ctx.fill();
    }
    // 岩浆粒子
    if (this.frame % 6 === 0) {
      this.particles.push({
        x, y: y - 5*s, vx: (Math.random()-0.5)*0.8, vy: -1-Math.random()*1.5,
        life: 25, maxLife: 25, size: 1.2*s, color: '#fbbf24',
      });
    }
  }

  // ── 枯木 ──
  _drawCharred(x, y, s) {
    const { ctx } = this;
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(x - 1.5*s, y - 10*s, 3*s, 10*s);
    // 枝干
    ctx.lineWidth = 1.5*s;
    ctx.strokeStyle = '#1c1917';
    ctx.beginPath(); ctx.moveTo(x, y - 8*s); ctx.lineTo(x - 5*s, y - 12*s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 6*s); ctx.lineTo(x + 4*s, y - 11*s); ctx.stroke();
    // 余烬
    if (this.frame % 40 < 10) {
      ctx.fillStyle = `rgba(239,68,68,${0.5 + 0.3*Math.sin(this.frame*0.1)})`;
      ctx.beginPath(); ctx.arc(x + 2*s, y - 3*s, 0.8*s, 0, Math.PI*2); ctx.fill();
    }
  }

  // ── 冻结的树 ──
  _drawFrozenTree(x, y, s, sway) {
    const { ctx } = this;
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x - 1.5*s, y - 12*s, 3*s, 12*s);
    // 冰封枝条
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5*s;
    for (let i = 0; i < 3; i++) {
      const by = y - (5 + i*3)*s;
      const bx = x + (i%2 ? 1 : -1) * 5 * s;
      ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(bx + sway*0.5, by - 2*s); ctx.stroke();
      // 冰挂
      ctx.fillStyle = 'rgba(186,230,253,0.5)';
      ctx.beginPath(); ctx.arc(bx + sway*0.5, by - 1*s, 1.2*s, 0, Math.PI*2); ctx.fill();
    }
    // 雪冠
    ctx.fillStyle = '#f0f9ff';
    ctx.beginPath(); ctx.arc(x + sway*0.3, y - 13*s, 4*s, 0, Math.PI*2); ctx.fill();
  }

  // ── 冰屋 ──
  _drawIgloo(x, y, s) {
    const { ctx } = this;
    const grad = ctx.createLinearGradient(x, y - 10*s, x, y);
    grad.addColorStop(0, '#f0f9ff'); grad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, 8*s, Math.PI, Math.PI*2); ctx.fill();
    // 砖缝
    ctx.strokeStyle = 'rgba(148,163,184,0.4)'; ctx.lineWidth = 0.8;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.arc(x, y, 8*s*i/3, Math.PI, Math.PI*2); ctx.stroke();
    }
    // 门
    ctx.fillStyle = '#64748b';
    ctx.beginPath(); ctx.arc(x, y, 3*s, Math.PI, Math.PI*2); ctx.fill();
  }

  // ── 橡树 ──
  _drawOak(x, y, s, sway) {
    const { ctx } = this;
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(x - 2*s, y - 12*s, 4*s, 12*s);
    // 多层圆冠
    const greens = ['#15803d', '#16a34a', '#22c55e'];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = greens[i];
      ctx.beginPath();
      ctx.arc(x + sway*0.3 + (i-1)*3*s, y - (12 + i*2)*s, (6-i)*s, 0, Math.PI*2);
      ctx.fill();
    }
    // 树皮纹理
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(x - 1*s + i*s, y); ctx.lineTo(x - 1*s + i*s, y - 10*s); ctx.stroke();
    }
    this._drawShadow(x, y, 7*s, 3.5*s);
  }

  // ── 灌木 ──
  _drawBush(x, y, s) {
    const { ctx } = this;
    const greens = ['#15803d', '#16a34a', '#22c55e'];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = greens[i];
      ctx.beginPath();
      ctx.arc(x + (i-1)*3*s, y - (3 + i)*s, 3.5*s, 0, Math.PI*2);
      ctx.fill();
    }
    // 浆果
    if ((x+y) % 7 < 3) {
      ctx.fillStyle = '#ef4444';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(x + (i-1)*2*s, y - 4*s, 0.8*s, 0, Math.PI*2); ctx.fill();
      }
    }
  }

  // ── 野花 ──
  _drawWildflower(x, y, s, sway) {
    const { ctx } = this;
    const colors = ['#f472b6', '#fbbf24', '#a78bfa', '#f87171', '#34d399'];
    for (let i = 0; i < 5; i++) {
      const fx = x + (i-2)*3*s;
      const fh = (4 + Math.abs(i-2)*1.5)*s;
      const ci = Math.floor((fx + y + i*13) % colors.length);
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1*s;
      ctx.beginPath(); ctx.moveTo(fx, y); ctx.lineTo(fx + sway*0.5, y - fh); ctx.stroke();
      ctx.fillStyle = colors[Math.abs(ci)];
      ctx.beginPath(); ctx.arc(fx + sway*0.5, y - fh, 1.8*s, 0, Math.PI*2); ctx.fill();
    }
  }

  // ── 草垛 ──
  _drawHaystack(x, y, s) {
    const { ctx } = this;
    const grad = ctx.createLinearGradient(x, y - 8*s, x, y);
    grad.addColorStop(0, '#fde68a'); grad.addColorStop(1, '#d97706');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x - 7*s, y); ctx.quadraticCurveTo(x, y - 12*s, x + 7*s, y);
    ctx.closePath(); ctx.fill();
    // 纹理
    ctx.strokeStyle = 'rgba(146,64,14,0.3)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 4*s + i*2.5*s, y);
      ctx.lineTo(x - 2*s + i*1.5*s, y - 6*s - i*s);
      ctx.stroke();
    }
  }

  // ── 棕榈树 ──
  _drawPalm(x, y, s, sway) {
    const { ctx } = this;
    // 弯曲树干
    ctx.strokeStyle = '#92400e'; ctx.lineWidth = 3.5*s; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 4*s, y - 10*s, x + 2*s + sway, y - 18*s);
    ctx.stroke();
    // 树叶
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + this.frame * 0.003;
      const lx = x + 2*s + sway;
      const ly = y - 18*s;
      ctx.fillStyle = i % 2 ? '#22c55e' : '#16a34a';
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.quadraticCurveTo(lx + Math.cos(a)*8*s + sway*2, ly + Math.sin(a)*3*s - 4*s, lx + Math.cos(a)*13*s, ly + Math.sin(a)*5*s + 2*s);
      ctx.quadraticCurveTo(lx + Math.cos(a)*8*s + sway*2, ly + Math.sin(a)*3*s - 1*s, lx, ly);
      ctx.closePath(); ctx.fill();
    }
    // 椰子
    ctx.fillStyle = '#92400e';
    ctx.beginPath(); ctx.arc(x + 3*s, y - 16*s, 1.5*s, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 5*s, y - 15*s, 1.5*s, 0, Math.PI*2); ctx.fill();
    this._drawShadow(x, y, 6*s, 3*s);
  }

  // ── 椰子 ──
  _drawCoconut(x, y, s) {
    const { ctx } = this;
    ctx.fillStyle = '#92400e';
    ctx.beginPath(); ctx.arc(x - 2*s, y - 2*s, 2.5*s, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2.5*s, y - 1.5*s, 2.5*s, 0, Math.PI*2); ctx.fill();
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.arc(x - 2.5*s, y - 2.5*s, 1*s, 0, Math.PI*2); ctx.fill();
  }

  // ── 贝壳 ──
  _drawShell(x, y, s) {
    const { ctx } = this;
    const grad = ctx.createLinearGradient(x - 3*s, y, x + 3*s, y);
    grad.addColorStop(0, '#fda4af'); grad.addColorStop(0.5, '#fecdd3'); grad.addColorStop(1, '#fb7185');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y - 1.5*s, 3*s, Math.PI, Math.PI*2); ctx.fill();
    // 螺纹
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.6;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.arc(x, y - 1.5*s, 3*s*i/3, Math.PI, Math.PI*2); ctx.stroke();
    }
  }

  // ── 浮木 ──
  _drawDriftwood(x, y, s) {
    const { ctx } = this;
    ctx.fillStyle = '#a8a29e';
    ctx.save();
    ctx.translate(x, y - 1.5*s);
    ctx.rotate(0.3);
    ctx.fillRect(-6*s, -1.5*s, 12*s, 3*s);
    // 木纹
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-5*s, 0); ctx.lineTo(5*s, 0.5*s); ctx.stroke();
    ctx.restore();
  }

  // ── 通用装饰（按群落自动选择） ──
  _drawGenericDeco(x, y, s, tile) {
    const { ctx, theme } = this;
    // 小草丛
    for (let i = 0; i < 3; i++) {
      const gx = x + (i-1)*2.5*s;
      const gh = (3 + Math.abs(i-1))*s;
      const sway = Math.sin(this.frame*0.03 + i + tile.r) * 1.2;
      ctx.strokeStyle = theme.treeTop;
      ctx.lineWidth = 1.2*s;
      ctx.beginPath(); ctx.moveTo(gx, y); ctx.quadraticCurveTo(gx+sway, y-gh*0.5, gx+sway*2, y-gh); ctx.stroke();
    }
  }

  // ── 阴影 ──
  _drawShadow(x, y, rx, ry) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.ellipse(x, y + 1, rx, ry, 0, 0, Math.PI*2); ctx.fill();
  }

  // ── 环境粒子（萤火虫/雪/沙/气泡） ──
  _drawAmbient(w, h) {
    const { ctx, theme } = this;
    const type = theme.ambient;
    for (const p of this.ambientParts) {
      p.x += p.vx * 0.002;
      p.y += p.vy * 0.002;
      p.phase += 0.02;
      if (p.y > 1.1) { p.y = -0.1; p.x = Math.random(); }
      if (p.y < -0.1) { p.y = 1.1; p.x = Math.random(); }
      if (p.x > 1.1) p.x = -0.1;
      if (p.x < -0.1) p.x = 1.1;

      const ax = p.x * w + Math.sin(p.phase) * 15;
      const ay = p.y * h;

      if (type === 'firefly') {
        const glow = 0.3 + 0.7 * Math.abs(Math.sin(p.phase * 2));
        ctx.fillStyle = `rgba(250,204,21,${glow * p.alpha})`;
        ctx.beginPath(); ctx.arc(ax, ay, p.size * 1.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = `rgba(250,204,21,${glow * p.alpha * 0.3})`;
        ctx.beginPath(); ctx.arc(ax, ay, p.size * 4, 0, Math.PI*2); ctx.fill();
      } else if (type === 'snow') {
        ctx.fillStyle = `rgba(255,255,255,${p.alpha * 0.7})`;
        ctx.beginPath(); ctx.arc(ax, ay, p.size, 0, Math.PI*2); ctx.fill();
      } else if (type === 'sand') {
        ctx.fillStyle = `rgba(252,211,77,${p.alpha * 0.4})`;
        ctx.beginPath(); ctx.arc(ax, ay, p.size * 0.8, 0, Math.PI*2); ctx.fill();
      } else if (type === 'bubble') {
        ctx.strokeStyle = `rgba(147,197,253,${p.alpha * 0.5})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(ax, ay, p.size * 1.5, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = `rgba(147,197,253,${p.alpha * 0.1})`;
        ctx.fill();
      } else if (type === 'ember') {
        const glow = 0.4 + 0.6 * Math.abs(Math.sin(p.phase));
        ctx.fillStyle = `rgba(239,68,68,${glow * p.alpha * 0.6})`;
        ctx.beginPath(); ctx.arc(ax, ay, p.size, 0, Math.PI*2); ctx.fill();
      } else if (type === 'butterfly') {
        const bx = ax + Math.sin(p.phase * 3) * 8;
        const by = ay + Math.cos(p.phase * 2) * 5;
        const wingOpen = Math.abs(Math.sin(p.phase * 4)) * 3;
        ctx.fillStyle = `rgba(244,114,182,${p.alpha * 0.7})`;
        ctx.beginPath(); ctx.ellipse(bx - wingOpen, by, wingOpen + 1, 2, -0.3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(bx + wingOpen, by, wingOpen + 1, 2, 0.3, 0, Math.PI*2); ctx.fill();
      }
    }
  }

  // ── 灾害特效 ──
  _drawDisasterFX(w, h) {
    const { ctx, disasterFX } = this;
    if (!disasterFX) return;
    const intensity = disasterFX.timer / disasterFX.duration;
    const name = disasterFX.name;

    // 全屏光效
    if (name === '火山喷发' || name === '山火') {
      ctx.fillStyle = `rgba(239,68,68,${0.12 * intensity})`;
      ctx.fillRect(0, 0, w, h);
    } else if (name === '瘟疫') {
      ctx.fillStyle = `rgba(75,85,99,${0.15 * intensity})`;
      ctx.fillRect(0, 0, w, h);
    } else if (name === '洪水') {
      ctx.fillStyle = `rgba(59,130,246,${0.1 * intensity})`;
      ctx.fillRect(0, 0, w, h);
    }

    // 裂缝（地震）
    if (name === '地震' && this.frame % 10 < 3) {
      ctx.strokeStyle = `rgba(139,92,246,${0.5 * intensity})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const cx = w * (0.2 + i * 0.3);
        const cy = h * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy - 10);
        ctx.lineTo(cx + 10, cy + 5);
        ctx.lineTo(cx - 5, cy + 20);
        ctx.lineTo(cx + 15, cy + 35);
        ctx.stroke();
      }
    }

    // 持续粒子
    if (this.frame % 4 === 0) {
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          x: Math.random() * w,
          y: name === '洪水' ? h : name === '蝗灾' ? Math.random() * h : -10,
          vx: (Math.random() - 0.5) * 2,
          vy: name === '洪水' ? -2 - Math.random() * 2 : name === '蝗灾' ? (Math.random() - 0.5) * 3 : 2 + Math.random() * 3,
          life: 40, maxLife: 40,
          size: 2 + Math.random() * 3,
          color: disasterFX.particles,
        });
      }
    }
  }

  // ── 天气 ──
  _drawWeather(w, h, weather) {
    const { ctx } = this;
    if (weather === 'rain') {
      ctx.strokeStyle = 'rgba(120,160,220,0.3)'; ctx.lineWidth = 1;
      for (let i = 0; i < 40; i++) {
        const rx = (i * 37 + this.frame * 3) % w;
        const ry = (i * 53 + this.frame * 8) % h;
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 1, ry + 8); ctx.stroke();
      }
    } else if (weather === 'snow') {
      for (let i = 0; i < 30; i++) {
        const sx = (i * 43 + this.frame * 0.5 + Math.sin(this.frame * 0.02 + i) * 15) % w;
        const sy = (i * 31 + this.frame * 1.5) % h;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.arc(sx, sy, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill();
      }
    } else if (weather === 'drought') {
      ctx.fillStyle = 'rgba(252,211,77,0.05)'; ctx.fillRect(0, 0, w, h);
    } else if (weather === 'heatwave') {
      const heat = Math.sin(this.frame * 0.05) * 0.03 + 0.03;
      ctx.fillStyle = `rgba(239,68,68,${heat})`; ctx.fillRect(0, 0, w, h);
    }
  }

  // ── 季节 ──
  _drawSeasonOverlay(w, h, season) {
    const { ctx } = this;
    if (season === 'winter') { ctx.fillStyle = 'rgba(186,230,253,0.06)'; ctx.fillRect(0, 0, w, h); }
    else if (season === 'autumn') { ctx.fillStyle = 'rgba(251,146,60,0.04)'; ctx.fillRect(0, 0, w, h); }
    else if (season === 'summer') { ctx.fillStyle = 'rgba(253,224,71,0.03)'; ctx.fillRect(0, 0, w, h); }
  }

  // ── 粒子系统 ──
  _updateParticles(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy;
      p.life--;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── 生物系统 ──
  _syncCreatures(creaturesData) {
    if (!creaturesData) return;
    const desired = new Map();
    for (const c of creaturesData) { if (c.count > 0) desired.set(c.name, c); }
    this.creatures = this.creatures.filter(c => desired.has(c.species));
    for (const [species, data] of desired) {
      const targetCount = Math.min(data.count, 10);
      while (this.creatures.filter(c => c.species === species).length < targetCount) {
        this.creatures.push(this._createCreatureEntity(species, data));
      }
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
      species, emoji: data.emoji, type: data.type, count: data.count,
      r, c, targetR: r, targetC: c, moveProgress: 1,
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
          cr.r = cr.targetR; cr.c = cr.targetC;
          cr.idleTimer = 60 + Math.floor(Math.random() * 180);
        }
      } else {
        cr.idleTimer--;
        if (cr.idleTimer <= 0) {
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
    const sorted = [...this.creatures].sort((a, b) => (a.r + a.c) - (b.r + b.c));
    for (const cr of sorted) {
      const drawR = cr.r + (cr.targetR - cr.r) * cr.moveProgress;
      const drawC = cr.c + (cr.targetC - cr.c) * cr.moveProgress;
      const x = ox + (drawC - drawR) * this.tileW / 2;
      const y = oy + (drawC + drawR) * this.tileH / 2;
      const bob = Math.sin(this.frame * 0.04 + cr.bobPhase) * 2;
      const scale = this.tileH / 16;
      const emojiSize = Math.max(10, 15 * scale);

      // 特殊物种光效
      const isRare = cr.type === 'special' || ['magmadragon', 'phoenix', 'dolphin', 'snow_leopard', 'butterfly', 'toucan', 'sandworm', 'narwhal'].includes(cr.species);
      if (isRare) {
        const glow = 0.3 + 0.3 * Math.sin(this.frame * 0.05 + cr.bobPhase);
        ctx.fillStyle = `rgba(250,204,21,${glow * 0.25})`;
        ctx.beginPath(); ctx.arc(x, y - 6*scale, 14*scale, 0, Math.PI*2); ctx.fill();
      }

      // 阴影
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(x, y + 2, 5*scale, 2.5*scale, 0, 0, Math.PI*2); ctx.fill();

      // emoji
      ctx.save();
      ctx.translate(x, y - 3 + bob);
      ctx.scale(cr.facing, 1);
      ctx.font = `${emojiSize}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText(cr.emoji, 0, 0);
      ctx.restore();

      // 走动尘土
      if (cr.moveProgress < 1 && this.frame % 8 === 0) {
        this.particles.push({
          x: x + (Math.random()-0.5)*4, y: y + 2,
          vx: (Math.random()-0.5)*0.3, vy: -Math.random()*0.5,
          life: 20, maxLife: 20, size: 1.5*scale, color: 'rgba(200,200,200,0.4)',
        });
      }
    }

    // 物种数量标签
    if (this.creatures.length > 0) {
      const speciesCounts = new Map();
      for (const cr of this.creatures) { if (!speciesCounts.has(cr.species)) speciesCounts.set(cr.species, cr); }
      let shown = 0;
      for (const [, cr] of speciesCounts) {
        if (shown >= 3) break;
        const drawR = cr.r + (cr.targetR - cr.r) * cr.moveProgress;
        const drawC = cr.c + (cr.targetC - cr.c) * cr.moveProgress;
        const x = ox + (drawC - drawR) * this.tileW / 2;
        const y = oy + (drawC + drawR) * this.tileH / 2;
        const bob = Math.sin(this.frame * 0.04 + cr.bobPhase) * 2;
        // 标签背景
        const label = `${cr.emoji}×${cr.count}`;
        ctx.font = `bold ${Math.max(8, 9 * (this.tileH/16))}px sans-serif`;
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.roundRect(x - tw/2 - 3, y - 18*(this.tileH/16) + bob - 8, tw + 6, 14, 4);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y - 14*(this.tileH/16) + bob);
        shown++;
      }
    }
  }

  _darken(hex, factor) {
    if (hex.startsWith('rgb')) return hex;
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.floor(((num >> 16) & 255) * factor);
    const g = Math.floor(((num >> 8) & 255) * factor);
    const b = Math.floor((num & 255) * factor);
    return `rgb(${r},${g},${b})`;
  }

  _seededRandom(seed) {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  }

  _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
    return Math.abs(h);
  }
}
