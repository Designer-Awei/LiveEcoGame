// ============================================================
// 生态系统模拟引擎
// ============================================================

// ── 生物定义 ──
const BIOME_CREATURES = {
  mountain: {
    producers:  ['grass', 'moss', 'bush'],
    herbivores: ['goat', 'rabbit', 'marmot'],
    predators:  ['eagle', 'wolf', 'bear'],
    specials:   ['snow_leopard'],
  },
  lake: {
    producers:  ['algae', 'reed', 'waterlily'],
    herbivores: ['fish', 'frog', 'duck'],
    predators:  ['heron', 'otter', 'pike'],
    specials:   ['dragonfly'],
  },
  rainforest: {
    producers:  ['fern', 'vine', 'mushroom'],
    herbivores: ['monkey', 'parrot', 'frog'],
    predators:  ['snake', 'jaguar', 'eagle'],
    specials:   ['toucan'],
  },
  desert: {
    producers:  ['cactus', 'tumbleweed', 'succulent'],
    herbivores: ['lizard', 'rabbit', 'camel'],
    predators:  ['scorpion', 'hawk', 'fennec'],
    specials:   ['sandworm'],
  },
  volcano: {
    producers:  ['lavamoss', 'ashfern', 'fireflower'],
    herbivores: ['firesalamander', 'lavabeetle', 'ashrabbit'],
    predators:  ['magmadragon', 'infernohawk', 'emberwolf'],
    specials:   ['phoenix'],
  },
  icefield: {
    producers:  ['snowmoss', 'icelichen', 'frostberry'],
    herbivores: ['penguin', 'seal', 'lemming'],
    predators:  ['polarbear', 'arcticfox', 'snowowl'],
    specials:   ['narwhal'],
  },
  grassland: {
    producers:  ['grass', 'flower', 'clover'],
    herbivores: ['bison', 'rabbit', 'deer'],
    predators:  ['wolf', 'hawk', 'fox'],
    specials:   ['butterfly'],
  },
  island: {
    producers:  ['coconut', 'seaweed', 'sandgrass'],
    herbivores: ['turtle', 'crab', 'seabird'],
    predators:  ['shark', 'octopus', 'osprey'],
    specials:   ['dolphin'],
  },
};

// ── 生物属性 ──
const CREATURE_STATS = {
  // producers
  grass:       { type: 'producer', energy: 1,  growth: 0.10, maxPop: 120, emoji: '🌱' },
  moss:        { type: 'producer', energy: 1,  growth: 0.10, maxPop: 120, emoji: '🌿' },
  bush:        { type: 'producer', energy: 2,  growth: 0.10, maxPop: 120,  emoji: '🌳' },
  algae:       { type: 'producer', energy: 1,  growth: 0.10, maxPop: 120, emoji: '🟢' },
  reed:        { type: 'producer', energy: 1,  growth: 0.10, maxPop: 120, emoji: '🌾' },
  waterlily:   { type: 'producer', energy: 2,  growth: 0.10, maxPop: 120,  emoji: '🪷' },
  fern:        { type: 'producer', energy: 1,  growth: 0.10, maxPop: 120, emoji: '🌿' },
  vine:        { type: 'producer', energy: 2,  growth: 0.10, maxPop: 120, emoji: '🌱' },
  mushroom:    { type: 'producer', energy: 2,  growth: 0.10, maxPop: 120,  emoji: '🍄' },
  cactus:      { type: 'producer', energy: 3,  growth: 0.10, maxPop: 120,  emoji: '🌵' },
  tumbleweed:  { type: 'producer', energy: 1,  growth: 0.10, maxPop: 120, emoji: '🌾' },
  succulent:   { type: 'producer', energy: 2,  growth: 0.10, maxPop: 120,  emoji: '🪴' },
  lavamoss:    { type: 'producer', energy: 2,  growth: 0.10, maxPop: 120,  emoji: '🔥' },
  ashfern:     { type: 'producer', energy: 1,  growth: 0.10, maxPop: 120,  emoji: '🌿' },
  fireflower:  { type: 'producer', energy: 3,  growth: 0.10, maxPop: 120,  emoji: '🌺' },
  snowmoss:    { type: 'producer', energy: 1,  growth: 0.10, maxPop: 120,  emoji: '❄️' },
  icelichen:   { type: 'producer', energy: 2,  growth: 0.10, maxPop: 120,  emoji: '🧊' },
  frostberry:  { type: 'producer', energy: 2,  growth: 0.10, maxPop: 120,  emoji: '🫐' },
  flower:      { type: 'producer', energy: 1,  growth: 0.10, maxPop: 120, emoji: '🌼' },
  clover:      { type: 'producer', energy: 1,  growth: 0.10, maxPop: 120, emoji: '☘️' },
  coconut:     { type: 'producer', energy: 3,  growth: 0.10, maxPop: 120,  emoji: '🥥' },
  seaweed:     { type: 'producer', energy: 1,  growth: 0.10, maxPop: 120, emoji: '🌊' },
  sandgrass:   { type: 'producer', energy: 1,  growth: 0.10, maxPop: 120,  emoji: '🌾' },

  // herbivores
  goat:     { type: 'herbivore', energy: 20, speed: 1.2, breed: 0.010, emoji: '🐐' },
  rabbit:   { type: 'herbivore', energy: 12, speed: 1.5, breed: 0.010, emoji: '🐰' },
  marmot:   { type: 'herbivore', energy: 15, speed: 0.8, breed: 0.010, emoji: '🐿️' },
  fish:     { type: 'herbivore', energy: 10, speed: 1.8, breed: 0.010, emoji: '🐟' },
  frog:     { type: 'herbivore', energy: 8,  speed: 1.0, breed: 0.010, emoji: '🐸' },
  duck:     { type: 'herbivore', energy: 14, speed: 1.3, breed: 0.010, emoji: '🦆' },
  monkey:   { type: 'herbivore', energy: 18, speed: 1.4, breed: 0.010, emoji: '🐒' },
  parrot:   { type: 'herbivore', energy: 10, speed: 2.0, breed: 0.010, emoji: '🦜' },
  lizard:   { type: 'herbivore', energy: 8,  speed: 1.6, breed: 0.010, emoji: '🦎' },
  camel:    { type: 'herbivore', energy: 25, speed: 0.6, breed: 0.010, emoji: '🐫' },
  firesalamander: { type: 'herbivore', energy: 15, speed: 1.0, breed: 0.010, emoji: '🦎' },
  lavabeetle:     { type: 'herbivore', energy: 8,  speed: 0.8, breed: 0.010, emoji: '🪲' },
  ashrabbit:      { type: 'herbivore', energy: 12, speed: 1.2, breed: 0.010, emoji: '🐰' },
  penguin:   { type: 'herbivore', energy: 16, speed: 0.8, breed: 0.010, emoji: '🐧' },
  seal:      { type: 'herbivore', energy: 22, speed: 1.0, breed: 0.010, emoji: '🦭' },
  lemming:   { type: 'herbivore', energy: 8,  speed: 1.5, breed: 0.010, emoji: '🐭' },
  bison:     { type: 'herbivore', energy: 30, speed: 0.7, breed: 0.010, emoji: '🦬' },
  deer:      { type: 'herbivore', energy: 20, speed: 1.4, breed: 0.010, emoji: '🦌' },
  turtle:    { type: 'herbivore', energy: 18, speed: 0.4, breed: 0.010, emoji: '🐢' },
  crab:      { type: 'herbivore', energy: 10, speed: 0.6, breed: 0.010, emoji: '🦀' },
  seabird:   { type: 'herbivore', energy: 12, speed: 1.8, breed: 0.010, emoji: '🐦' },

  // predators
  eagle:    { type: 'predator', energy: 35, speed: 2.0, hunt: 0.6, breed: 0.003, emoji: '🦅' },
  wolf:     { type: 'predator', energy: 40, speed: 1.5, hunt: 0.6, breed: 0.003, emoji: '🐺' },
  bear:     { type: 'predator', energy: 60, speed: 1.0, hunt: 0.6, breed: 0.003, emoji: '🐻' },
  heron:    { type: 'predator', energy: 30, speed: 1.2, hunt: 0.6, breed: 0.003, emoji: '🦢' },
  otter:    { type: 'predator', energy: 25, speed: 1.5, hunt: 0.6, breed: 0.003, emoji: '🦦' },
  pike:     { type: 'predator', energy: 30, speed: 1.8, hunt: 0.6, breed: 0.003, emoji: '🐟' },
  snake:    { type: 'predator', energy: 25, speed: 1.2, hunt: 0.6, breed: 0.003, emoji: '🐍' },
  jaguar:   { type: 'predator', energy: 50, speed: 1.8, hunt: 0.6, breed: 0.003, emoji: '🐆' },
  scorpion: { type: 'predator', energy: 15, speed: 0.8, hunt: 0.6, breed: 0.003, emoji: '🦂' },
  hawk:     { type: 'predator', energy: 30, speed: 2.2, hunt: 0.6, breed: 0.003, emoji: '🦅' },
  fennec:   { type: 'predator', energy: 20, speed: 1.6, hunt: 0.6, breed: 0.003, emoji: '🦊' },
  magmadragon:  { type: 'predator', energy: 80, speed: 1.0, hunt: 0.6, breed: 0.003, emoji: '🐉' },
  infernohawk:  { type: 'predator', energy: 40, speed: 2.0, hunt: 0.6, breed: 0.003, emoji: '🦅' },
  emberwolf:    { type: 'predator', energy: 45, speed: 1.5, hunt: 0.6, breed: 0.003, emoji: '🐺' },
  polarbear:    { type: 'predator', energy: 60, speed: 1.0, hunt: 0.6, breed: 0.003, emoji: '🐻‍❄️' },
  arcticfox:    { type: 'predator', energy: 20, speed: 1.8, hunt: 0.6, breed: 0.003, emoji: '🦊' },
  snowowl:      { type: 'predator', energy: 25, speed: 1.5, hunt: 0.6, breed: 0.003, emoji: '🦉' },
  fox:      { type: 'predator', energy: 20, speed: 1.6, hunt: 0.6, breed: 0.003, emoji: '🦊' },
  shark:    { type: 'predator', energy: 50, speed: 2.0, hunt: 0.6, breed: 0.003, emoji: '🦈' },
  octopus:  { type: 'predator', energy: 30, speed: 1.0, hunt: 0.6, breed: 0.003, emoji: '🐙' },
  osprey:   { type: 'predator', energy: 30, speed: 2.0, hunt: 0.6, breed: 0.003, emoji: '🦅' },

  // specials
  snow_leopard: { type: 'special', energy: 55, speed: 1.8, hunt: 0.7, breed: 0.001, emoji: '🐆' },
  dragonfly:    { type: 'special', energy: 5,  speed: 3.0, breed: 0.025, emoji: '🪰' },
  toucan:       { type: 'special', energy: 12, speed: 1.5, breed: 0.010, emoji: '🦜' },
  sandworm:     { type: 'special', energy: 40, speed: 0.5, hunt: 0.3, breed: 0.002, emoji: '🪱' },
  phoenix:      { type: 'special', energy: 100,speed: 1.5, hunt: 0.9, breed: 0.0001, emoji: '🔥' },
  narwhal:      { type: 'special', energy: 45, speed: 1.5, hunt: 0.5, breed: 0.002, emoji: '🦄' },
  butterfly:    { type: 'special', energy: 3,  speed: 2.0, breed: 0.030, emoji: '🦋' },
  dolphin:      { type: 'special', energy: 35, speed: 2.5, hunt: 0.5, breed: 0.003, emoji: '🐬' },
};

// ── 生态系统类 ──
export class Ecosystem {
  constructor(biomeId) {
    this.biomeId = biomeId;
    this.creatureDefs = BIOME_CREATURES[biomeId] || BIOME_CREATURES.grassland;
    this.population = {};   // { species: count }
    this.season = 'spring';
    this.weather = 'clear';
    this.temperature = 20 + (Math.random() - 0.5) * 10;
    this.rainfall = 50 + (Math.random() - 0.5) * 20;
    this.vitality = 0.85 + Math.random() * 0.30;
    this.biodiversity = 0;
    this.totalPop = 0;
    this.age = 0;
    this.mutations = new Set();
    this.disasters = [];

    // 初始化种群
    this._initPopulation();
  }

  _initPopulation() {
    const allSpecies = [
      ...this.creatureDefs.producers,
      ...this.creatureDefs.herbivores,
      ...this.creatureDefs.predators,
    ];
    for (const sp of allSpecies) {
      const stats = CREATURE_STATS[sp];
      if (!stats) continue;
      if (stats.type === 'producer') {
        this.population[sp] = Math.floor(30 + Math.random() * 12);
      } else if (stats.type === 'herbivore') {
        this.population[sp] = Math.floor(5 + Math.random() * 6);
      } else {
        this.population[sp] = Math.floor(1 + Math.random() * 3);
      }
    }
  }

  tick() {
    this.age++;
    this._evolveProducers();
    this._evolveHerbivores();
    this._evolvePredators();
    this._applyWeatherEffects();
    this._checkExtinctions();
    this._calculateBiodiversity();
    this._randomFluctuation();
  }

  _evolveProducers() {
    for (const sp of this.creatureDefs.producers) {
      const stats = CREATURE_STATS[sp];
      if (!stats || !this.population[sp]) continue;
      let growth = stats.growth * this.vitality;
      // 季节影响
      growth *= this._seasonMultiplier('producer');
      // 天气影响
      if (this.weather === 'rain') growth *= 1.5;
      if (this.weather === 'drought') growth *= 0.3;
      // 温度影响
      if (this.temperature < 0) growth *= 0.6;
      if (this.temperature > 40) growth *= 0.7;
      // 增长
      const newPop = Math.min(
        Math.floor(this.population[sp] * (1 + growth)),
        stats.maxPop
      );
      this.population[sp] = newPop;
    }
  }

  _evolveHerbivores() {
    for (const sp of this.creatureDefs.herbivores) {
      const stats = CREATURE_STATS[sp];
      if (!stats || !this.population[sp]) continue;
      let pop = this.population[sp];
      // 食物来源
      const foodAvailable = this._getFoodAvailable(sp);
      const foodNeeded = pop * 0.1;
      if (foodAvailable >= foodNeeded) {
        // 繁殖
        let breedChance = stats.breed * this.vitality * this._seasonMultiplier('herbivore');
        if (this.weather === 'rain') breedChance *= 1.2;
        const newborns = Math.floor(pop * breedChance);
        pop += newborns;
        // 消耗食物
        this._consumeFood(sp, foodNeeded);
      } else {
        // 饥饿死亡
        const deaths = Math.ceil(pop * 0.05);
        pop -= deaths;
      }
      // 捕食者捕食
      pop -= this._getHuntedCount(sp);
      this.population[sp] = Math.max(0, pop);
    }
  }

  _evolvePredators() {
    for (const sp of this.creatureDefs.predators) {
      const stats = CREATURE_STATS[sp];
      if (!stats || !this.population[sp]) continue;
      let pop = this.population[sp];
      // 猎食
      const preyAvailable = this._getPreyAvailable(sp);
      if (preyAvailable > 0) {
        let breedChance = stats.breed * this.vitality * this._seasonMultiplier('predator');
        const newborns = Math.floor(pop * breedChance);
        pop += newborns;
      } else {
        // 没有猎物，饿死
        const deaths = Math.ceil(pop * 0.08);
        pop -= deaths;
      }
      // 老死
      const ageDeaths = Math.max(1, Math.floor(pop * 0.01));
      pop -= ageDeaths;
      this.population[sp] = Math.max(0, pop);
    }
  }

  _getFoodAvailable(herbivoreSp) {
    let food = 0;
    for (const prodSp of this.creatureDefs.producers) {
      food += (this.population[prodSp] || 0) * 0.5;
    }
    return food;
  }

  _consumeFood(herbivoreSp, amount) {
    const producers = this.creatureDefs.producers.filter(sp => (this.population[sp] || 0) > 0);
    if (producers.length === 0) return;
    const perProducer = amount / producers.length;
    for (const sp of producers) {
      this.population[sp] = Math.max(0, Math.floor((this.population[sp] || 0) - perProducer));
    }
  }

  _getPreyAvailable(predatorSp) {
    let prey = 0;
    for (const herbSp of this.creatureDefs.herbivores) {
      prey += (this.population[herbSp] || 0);
    }
    return prey;
  }

  _getHuntedCount(herbivoreSp) {
    let hunted = 0;
    for (const predSp of this.creatureDefs.predators) {
      const stats = CREATURE_STATS[predSp];
      if (!stats) continue;
      const predPop = this.population[predSp] || 0;
      hunted += Math.floor(predPop * (stats.hunt || 0.5) * 0.3);
    }
    return Math.min(hunted, Math.floor((this.population[herbivoreSp] || 0) * 0.3));
  }

  _seasonMultiplier(type) {
    const m = {
      spring: { producer: 1.2, herbivore: 1.1, predator: 1.0 },
      summer: { producer: 1.5, herbivore: 1.3, predator: 1.1 },
      autumn: { producer: 0.8, herbivore: 0.9, predator: 1.2 },
      winter: { producer: 0.5, herbivore: 0.7, predator: 0.9 },
    };
    return (m[this.season] || m.spring)[type] || 1;
  }

  _applyWeatherEffects() {
    if (this.weather === 'rain') {
      this.rainfall = Math.min(100, this.rainfall + 2);
      this.temperature -= 0.5;
    } else if (this.weather === 'drought') {
      this.rainfall = Math.max(0, this.rainfall - 3);
      this.temperature += 1;
    } else if (this.weather === 'snow') {
      this.temperature -= 2;
    } else if (this.weather === 'heatwave') {
      this.temperature += 2;
    } else {
      // 自然回归
      this.temperature += (20 - this.temperature) * 0.01;
      this.rainfall += (50 - this.rainfall) * 0.01;
    }
    this.temperature = Math.max(-30, Math.min(60, this.temperature));
    this.rainfall = Math.max(0, Math.min(100, this.rainfall));
  }

  _checkExtinctions() {
    for (const sp of Object.keys(this.population)) {
      if (this.population[sp] <= 0) {
        delete this.population[sp];
      }
    }
  }

  _calculateBiodiversity() {
    const alive = Object.keys(this.population).filter(sp => this.population[sp] > 0);
    this.biodiversity = alive.length;
    this.totalPop = Object.values(this.population).reduce((s, v) => s + v, 0);
  }

  _randomFluctuation() {
    for (const sp of Object.keys(this.population)) {
      const noise = 1 + (Math.random() - 0.5) * 0.16;
      this.population[sp] = Math.max(0, Math.floor(this.population[sp] * noise));
    }
  }

  setSeason(season) {
    this.season = season;
  }

  setWeather(weather) {
    this.weather = weather;
  }

  // ── 事件处理 ──
  applyEvent(ev) {
    let result = '';
    switch (ev.type) {
      case 'weather':
        this.setWeather(ev.effect);
        result = `天气变为 ${ev.name}`;
        break;

      case 'creature_add': {
        const sp = ev.species;
        const stats = CREATURE_STATS[sp];
        if (stats) {
          const count = ev.count || (stats.type === 'producer' ? 30 : stats.type === 'herbivore' ? 5 : 2);
          this.population[sp] = (this.population[sp] || 0) + count;
          result = `${stats.emoji} ${ev.name} x${count} 出现了！`;
        } else {
          result = `${ev.name} 无法识别`;
        }
        break;
      }

      case 'disaster': {
        const damage = ev.damage || 0.3;
        for (const sp of Object.keys(this.population)) {
          const loss = Math.floor(this.population[sp] * damage);
          this.population[sp] -= loss;
        }
        this.disasters.push({ time: this.age, name: ev.name });
        result = `💥 ${ev.name}！损失 ${(damage * 100).toFixed(0)}% 人口`;
        break;
      }

      case 'mutation': {
        const species = Object.keys(this.population).filter(sp => this.population[sp] > 0);
        if (species.length > 0) {
          const target = species[Math.floor(Math.random() * species.length)];
          this.population[target] = Math.floor(this.population[target] * 1.5);
          this.mutations.add(target);
          result = `🧬 ${target} 发生变异！数量增长50%`;
        }
        break;
      }

      case 'blessing': {
        for (const sp of Object.keys(this.population)) {
          const stats = CREATURE_STATS[sp];
          if (stats && stats.type !== 'producer') {
            this.population[sp] = Math.floor(this.population[sp] * 1.2);
          }
        }
        result = `✨ 神圣祝福！所有动物数量+20%`;
        break;
      }

      case 'resource': {
        for (const sp of this.creatureDefs.producers) {
          this.population[sp] = Math.min(
            (CREATURE_STATS[sp]?.maxPop || 100),
            (this.population[sp] || 0) + 20
          );
        }
        result = `🌿 资源涌现！植物大量生长`;
        break;
      }

      default:
        result = `未知事件: ${ev.name}`;
    }
    return result;
  }

  // ── 评分 ──
  calculateScore() {
    const biodiversityScore = this.biodiversity * 10;
    const populationScore = Math.min(this.totalPop, 500);
    const balanceScore = this._calculateBalance() * 50;
    const mutationBonus = this.mutations.size * 20;
    const survivalScore = Math.floor(this.age / 60) * 5;
    return Math.floor(biodiversityScore + populationScore + balanceScore + mutationBonus + survivalScore);
  }

  _calculateBalance() {
    const producers = this.creatureDefs.producers.reduce((s, sp) => s + (this.population[sp] || 0), 0);
    const herbivores = this.creatureDefs.herbivores.reduce((s, sp) => s + (this.population[sp] || 0), 0);
    const predators = this.creatureDefs.predators.reduce((s, sp) => s + (this.population[sp] || 0), 0);
    if (producers === 0 && herbivores === 0 && predators === 0) return 0;
    const total = producers + herbivores + predators;
    const idealP = 0.6, idealH = 0.3, idealR = 0.1;
    const actualP = producers / total, actualH = herbivores / total, actualR = predators / total;
    const deviation = Math.abs(actualP - idealP) + Math.abs(actualH - idealH) + Math.abs(actualR - idealR);
    return Math.max(0, 1 - deviation);
  }

  // ── 数据输出 ──
  getCreatureSummary() {
    const summary = [];
    for (const sp of Object.keys(this.population)) {
      if (this.population[sp] > 0) {
        const stats = CREATURE_STATS[sp] || {};
        summary.push({
          name: sp,
          emoji: stats.emoji || '❓',
          type: stats.type || 'unknown',
          count: this.population[sp],
        });
      }
    }
    return summary.sort((a, b) => b.count - a.count);
  }

  getStats() {
    return {
      season: this.season,
      weather: this.weather,
      temperature: Math.round(this.temperature),
      rainfall: Math.round(this.rainfall),
      biodiversity: this.biodiversity,
      totalPop: this.totalPop,
      age: this.age,
      mutations: [...this.mutations],
      disasters: this.disasters.slice(-5),
      balance: this._calculateBalance(),
    };
  }
}