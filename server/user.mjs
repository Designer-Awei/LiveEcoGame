// ============================================================
// 用户系统 · 权重 + 等级 + 持久化
// ============================================================
import Database from 'better-sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'ecosystem.db');

// ── 等级配置 ──
export const LEVELS = [
  { level: 1,  weight: 0,     title: '新芽观察者',   multiplier: 1,   abilities: ['weather', 'basic_creature'] },
  { level: 5,  weight: 100,   title: '生态学徒',     multiplier: 1.5, abilities: ['weather', 'basic_creature', 'rare_creature'] },
  { level: 10, weight: 500,   title: '自然守护者',   multiplier: 2,   abilities: ['weather', 'basic_creature', 'rare_creature', 'small_disaster'] },
  { level: 20, weight: 2000,  title: '生态大师',     multiplier: 3,   abilities: ['weather', 'basic_creature', 'rare_creature', 'small_disaster', 'global_event'] },
  { level: 30, weight: 5000,  title: '钻石守护者',   multiplier: 5,   abilities: ['weather', 'basic_creature', 'rare_creature', 'small_disaster', 'global_event', 'ultimate_event'] },
  { level: 50, weight: 15000, title: '创世神',       multiplier: 10,  abilities: ['weather', 'basic_creature', 'rare_creature', 'small_disaster', 'global_event', 'ultimate_event', 'custom_event'] },
];

export class UserSystem {
  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this._initTables();
    this._prepareStatements();
  }

  _initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        platform_uid TEXT NOT NULL,
        nickname TEXT,
        avatar TEXT,
        level INTEGER DEFAULT 1,
        title TEXT DEFAULT '新芽观察者',
        total_weight REAL DEFAULT 0,
        current_weight REAL DEFAULT 0,
        gift_value REAL DEFAULT 0,
        message_count INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        best_score INTEGER DEFAULT 0,
        best_rank INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        max_streak INTEGER DEFAULT 0,
        abilities TEXT DEFAULT '["weather","basic_creature"]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(platform, platform_uid)
      );

      CREATE TABLE IF NOT EXISTS game_contributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        game_id INTEGER,
        faction TEXT,
        contribution_score INTEGER DEFAULT 0,
        events_triggered INTEGER DEFAULT 0,
        creatures_added INTEGER DEFAULT 0,
        rank INTEGER,
        reward_points INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS gifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        streamer_id TEXT NOT NULL DEFAULT 'local',
        gift_name TEXT NOT NULL,
        gift_value REAL NOT NULL,
        weight_added REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS game_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        round_num INTEGER,
        faction_left TEXT,
        faction_right TEXT,
        winner TEXT,
        left_score INTEGER,
        right_score INTEGER,
        total_viewers INTEGER,
        started_at DATETIME,
        ended_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS streamers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        platform_uid TEXT NOT NULL,
        nickname TEXT,
        room_id TEXT,
        api_key TEXT UNIQUE,
        total_games INTEGER DEFAULT 0,
        total_viewers INTEGER DEFAULT 0,
        prize_pool REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(platform, platform_uid)
      );
    `);
  }

  _prepareStatements() {
    this._getUser = this.db.prepare(`
      SELECT * FROM users WHERE platform = ? AND platform_uid = ?
    `);

    this._createUser = this.db.prepare(`
      INSERT INTO users (platform, platform_uid, nickname, avatar)
      VALUES (?, ?, ?, ?)
    `);

    this._updateUser = this.db.prepare(`
      UPDATE users SET
        level = ?, title = ?, total_weight = ?, current_weight = ?,
        gift_value = ?, message_count = ?, games_played = ?,
        best_score = ?, best_rank = ?, streak = ?, max_streak = ?,
        abilities = ?, last_seen = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    this._addContribution = this.db.prepare(`
      INSERT INTO game_contributions (user_id, game_id, faction, contribution_score, events_triggered, creatures_added, rank, reward_points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this._addGift = this.db.prepare(`
      INSERT INTO gifts (user_id, streamer_id, gift_name, gift_value, weight_added)
      VALUES (?, ?, ?, ?, ?)
    `);

    this._getLeaderboard = this.db.prepare(`
      SELECT id, platform, platform_uid, nickname, avatar, level, title,
             total_weight, gift_value, message_count, games_played,
             best_score, streak, max_streak
      FROM users ORDER BY total_weight DESC LIMIT ?
    `);

    this._getTopContributors = this.db.prepare(`
      SELECT u.id, u.nickname, u.avatar, u.level, u.title, u.total_weight,
             gc.contribution_score, gc.faction
      FROM game_contributions gc
      JOIN users u ON u.id = gc.user_id
      WHERE gc.game_id = ?
      ORDER BY gc.contribution_score DESC LIMIT ?
    `);

    this._getGameHistory = this.db.prepare(`
      SELECT * FROM game_history ORDER BY id DESC LIMIT ?
    `);
  }

  // ── 获取或创建用户 ──
  getOrCreateUser(platform, platformUid, nickname, avatar) {
    let user = this._getUser.get(platform, platformUid);
    if (!user) {
      this._createUser.run(platform, platformUid, nickname || `用户${platformUid.slice(-4)}`, avatar || '');
      user = this._getUser.get(platform, platformUid);
    }
    return user;
  }

  // ── 计算权重 ──
  calculateWeight(user) {
    const baseWeight = user.level * 10;
    const giftWeight = user.gift_value * 10;
    const activeWeight = Math.min(user.message_count * 0.1 + user.games_played * 2, 500);
    const gloryWeight = Math.min(user.streak * 5 + (user.best_rank <= 3 && user.best_rank > 0 ? 100 : 0), 300);
    return baseWeight + giftWeight + activeWeight + gloryWeight;
  }

  // ── 获取等级信息 ──
  getLevelInfo(weight) {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (weight >= LEVELS[i].weight) {
        return LEVELS[i];
      }
    }
    return LEVELS[0];
  }

  // ── 记录弹幕操作 ──
  recordMessage(platform, platformUid, nickname) {
    const user = this.getOrCreateUser(platform, platformUid, nickname);
    const newWeight = this.calculateWeight(user);
    const levelInfo = this.getLevelInfo(newWeight);

    this._updateUser.run(
      levelInfo.level, levelInfo.title, newWeight, user.current_weight + 1,
      user.gift_value, user.message_count + 1, user.games_played,
      user.best_score, user.best_rank, user.streak, user.max_streak,
      JSON.stringify(levelInfo.abilities), user.id
    );

    return this._getUser.get(platform, platformUid);
  }

  // ── 记录礼物 ──
  recordGift(platform, platformUid, nickname, giftName, giftValue) {
    const user = this.getOrCreateUser(platform, platformUid, nickname);
    const weightAdded = giftValue * 10;
    const newGiftValue = user.gift_value + giftValue;
    const newWeight = this.calculateWeight({ ...user, gift_value: newGiftValue });
    const levelInfo = this.getLevelInfo(newWeight);

    this._addGift.run(user.id, 'local', giftName, giftValue, weightAdded);
    this._updateUser.run(
      levelInfo.level, levelInfo.title, newWeight, user.current_weight + weightAdded,
      newGiftValue, user.message_count, user.games_played,
      user.best_score, user.best_rank, user.streak, user.max_streak,
      JSON.stringify(levelInfo.abilities), user.id
    );

    return this._getUser.get(platform, platformUid);
  }

  // ── 记录本局贡献 ──
  recordGameContribution(platform, platformUid, gameId, faction, score, eventsCount, creaturesCount) {
    const user = this.getOrCreateUser(platform, platformUid);
    this._addContribution.run(user.id, gameId, faction, score, eventsCount, creaturesCount, 0, 0);
  }

  // ── 结算本局 ──
  settleGame(gameId, winner, leftScore, rightScore, totalViewers) {
    // 更新参与者的游戏局数和连胜
    const contributors = this.db.prepare(`
      SELECT DISTINCT user_id FROM game_contributions WHERE game_id = ?
    `).all(gameId);

    for (const c of contributors) {
      const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(c.user_id);
      if (!user) continue;

      const isWinner = winner === this.db.prepare(`
        SELECT faction FROM game_contributions WHERE game_id = ? AND user_id = ?
      `).get(gameId, user.id)?.faction;

      const newStreak = isWinner ? user.streak + 1 : 0;
      const newMaxStreak = Math.max(user.max_streak, newStreak);

      this._updateUser.run(
        user.level, user.title, user.total_weight, user.current_weight,
        user.gift_value, user.message_count, user.games_played + 1,
        user.best_score, user.best_rank, newStreak, newMaxStreak,
        user.abilities, user.id
      );
    }
  }

  // ── 获取排行榜 ──
  getLeaderboard(limit = 10) {
    return this._getLeaderboard.all(limit);
  }

  // ── 获取本局贡献排行 ──
  getGameContributors(gameId, limit = 10) {
    return this._getTopContributors.all(gameId, limit);
  }

  // ── 获取历史记录 ──
  getGameHistory(limit = 10) {
    return this._getGameHistory.all(limit);
  }

  // ── 保存游戏记录 ──
  saveGameHistory(roundNum, factionLeft, factionRight, winner, leftScore, rightScore, totalViewers) {
    this.db.prepare(`
      INSERT INTO game_history (round_num, faction_left, faction_right, winner, left_score, right_score, total_viewers, started_at, ended_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(roundNum, factionLeft, factionRight, winner, leftScore, rightScore, totalViewers);
  }

  // ── 获取用户详情 ──
  getUser(platform, platformUid) {
    return this._getUser.get(platform, platformUid);
  }

  // ── Mock数据 ──
  seedMockData() {
    const mockUsers = [
      { platform: 'bilibili', uid: '10001', nickname: '刘爱闹', avatar: '', giftValue: 120, messages: 350, games: 45, streak: 8 },
      { platform: 'bilibili', uid: '10002', nickname: '每日省钱团购', avatar: '', giftValue: 85, messages: 280, games: 32, streak: 5 },
      { platform: 'bilibili', uid: '10003', nickname: '吃货团团', avatar: '', giftValue: 45, messages: 180, games: 20, streak: 3 },
      { platform: 'bilibili', uid: '10004', nickname: '自由', avatar: '', giftValue: 30, messages: 120, games: 15, streak: 2 },
      { platform: 'bilibili', uid: '10005', nickname: '海', avatar: '', giftValue: 20, messages: 90, games: 10, streak: 1 },
      { platform: 'bilibili', uid: '10006', nickname: '难喻', avatar: '', giftValue: 15, messages: 60, games: 8, streak: 0 },
      { platform: 'bilibili', uid: '10007', nickname: '瑾', avatar: '', giftValue: 10, messages: 45, games: 5, streak: 0 },
      { platform: 'bilibili', uid: '10008', nickname: 'iooki', avatar: '', giftValue: 5, messages: 20, games: 3, streak: 0 },
      { platform: 'bilibili', uid: '10009', nickname: '丢你老谋', avatar: '', giftValue: 60, messages: 200, games: 25, streak: 4 },
      { platform: 'bilibili', uid: '10010', nickname: '辞屿', avatar: '', giftValue: 35, messages: 150, games: 18, streak: 2 },
      { platform: 'douyin', uid: '20001', nickname: '快乐小鱼', avatar: '', giftValue: 200, messages: 500, games: 60, streak: 12 },
      { platform: 'douyin', uid: '20002', nickname: '夜猫子', avatar: '', giftValue: 90, messages: 300, games: 40, streak: 6 },
    ];

    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO users (platform, platform_uid, nickname, avatar, level, title, total_weight, current_weight, gift_value, message_count, games_played, best_score, best_rank, streak, max_streak, abilities)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const u of mockUsers) {
        const mockUser = {
          level: 1, title: '新芽观察者', total_weight: 0, current_weight: 0,
          gift_value: u.giftValue, message_count: u.messages, games_played: u.games,
          best_score: Math.floor(Math.random() * 1000) + 500,
          best_rank: Math.floor(Math.random() * 10) + 1,
          streak: u.streak, max_streak: u.streak + Math.floor(Math.random() * 5),
        };
        const weight = this.calculateWeight(mockUser);
        const levelInfo = this.getLevelInfo(weight);

        insert.run(
          u.platform, u.uid, u.nickname, u.avatar,
          levelInfo.level, levelInfo.title, weight, weight * 0.1,
          u.giftValue, u.messages, u.games,
          mockUser.best_score, mockUser.best_rank,
          u.streak, mockUser.max_streak,
          JSON.stringify(levelInfo.abilities)
        );
      }
    });

    transaction();
    console.log(`[UserSystem] Mock数据已加载: ${mockUsers.length} 个用户`);
  }

  close() {
    this.db.close();
  }
}