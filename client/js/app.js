// ============================================================
// 弹幕生态系统 · 客户端（全屏浮层HUD + 2.5D）
// ============================================================
import { IsometricRenderer } from './renderer.js';

let gameState = null, myFaction = null, eventSource = null;
let rendererTop = null, rendererBottom = null;

function connectSSE() {
  if (eventSource) eventSource.close();
  eventSource = new EventSource('/api/stream');
  eventSource.onmessage = e => { try { const d = JSON.parse(e.data); if (d.type === 'state') { gameState = d; updateUI(); } } catch {} };
  eventSource.onerror = () => { eventSource.close(); setTimeout(connectSSE, 3000); };
}

function initRenderers() {
  rendererTop = new IsometricRenderer(document.getElementById('canvasTop'));
  rendererBottom = new IsometricRenderer(document.getElementById('canvasBottom'));
  resize();
}

function resize() {
  document.querySelectorAll('.biome-panel').forEach((p, i) => {
    const c = p.querySelector('canvas');
    if (!c) return;
    if (i === 0 && rendererTop) rendererTop.resize(p.clientWidth, p.clientHeight);
    if (i === 1 && rendererBottom) rendererBottom.resize(p.clientWidth, p.clientHeight);
  });
}

function updateUI() {
  if (!gameState) return;
  const { factions, globalEvents, elapsed, duration, round, viewerCount, leaderboard } = gameState;

  document.getElementById('roundNum').textContent = `第${round}局`;
  document.getElementById('timer').textContent = ft(elapsed) + '/' + ft(duration);
  document.getElementById('viewerCount').textContent = viewerCount;

  const ge = document.getElementById('globalEvents');
  if (globalEvents?.length) ge.innerHTML = `<span class="ev-scroll">${globalEvents.slice(0,6).map(e=>e.text).join(' · ')}</span>`;

  if (!factions?.length) return;

  updatePanel(0, 'Top');
  updatePanel(1, 'Bottom');

  if (rendererTop?.biomeId !== factions[0].biome.id) rendererTop.setBiome(factions[0].biome.id);
  if (rendererBottom?.biomeId !== factions[1].biome.id) rendererBottom.setBiome(factions[1].biome.id);

  rendererTop?.render(factions[0].creatures, factions[0].stats, factions[0].stats?.weather);
  rendererBottom?.render(factions[1].creatures, factions[1].stats, factions[1].stats?.weather);

  updateWinrate(factions[0], factions[1], elapsed, duration);

  document.getElementById('btnTop').textContent = `${factions[0].biome.emoji} ${factions[0].biome.name}`;
  document.getElementById('btnBottom').textContent = `${factions[1].biome.emoji} ${factions[1].biome.name}`;

  if (leaderboard?.length) renderLB(leaderboard);
}

function updatePanel(i, side) {
  const f = gameState.factions[i];
  document.getElementById('emoji' + side).textContent = f.biome.emoji;
  document.getElementById('name' + side).textContent = f.biome.name;
  document.getElementById('score' + side).textContent = f.score;

  const tk = document.getElementById('ticker' + side);
  if (f.recentEvents?.length) {
    tk.innerHTML = f.recentEvents.slice(0,3).map(e => `<span class="ev">${e.source}:${e.text}</span>`).join('');
    // 检测灾害事件，触发动效
    const latest = f.recentEvents[0];
    if (latest && latest.type === 'disaster' && latest.time === gameState.elapsed) {
      const r = i === 0 ? rendererTop : rendererBottom;
      const disasterName = latest.text.replace(/^[^\u4e00-\u9fff]*/, '').trim();
      r?.triggerDisaster(disasterName);
    }
  }

  const st = document.getElementById('stats' + side);
  if (f.stats) {
    const s = f.stats;
    const sm = {spring:'春',summer:'夏',autumn:'秋',winter:'冬'}[s.season]||'';
    const se = {spring:'🌸',summer:'☀️',autumn:'🍂',winter:'❄️'}[s.season]||'';
    const we = {clear:'☀️',rain:'🌧️',snow:'🌨️',drought:'🏜️',heatwave:'🌡️'}[s.weather]||'';
    st.innerHTML = `<span class="si">${se}<span class="sv">${sm}</span></span><span class="si">${we}<span class="sv">${s.temperature}°</span></span><span class="si">💧<span class="sv">${s.rainfall}%</span></span><span class="si">🧬<span class="sv">${s.biodiversity}</span></span><span class="si">👥<span class="sv">${s.totalPop}</span></span><span class="si">⚖<span class="sv">${(s.balance*100).toFixed(0)}%</span></span>`;
  }

  const cr = document.getElementById('creatures' + side);
  if (f.creatures?.length) cr.innerHTML = f.creatures.slice(0,8).map(c => `<span class="creature-pill"><span class="cp-emoji">${c.emoji}</span><span class="cp-count">${c.count}</span></span>`).join('');
}

function renderLB(lb) {
  document.getElementById('lbFullList').innerHTML = lb.map((u,i) => {
    const rc = i===0?'r1':i===1?'r2':i===2?'r3':'';
    const re = i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`;
    return `<div class="lb-fi"><span class="lb-fi-rk ${rc}">${re}</span><div class="lb-fi-info"><div class="lb-fi-name">${u.nickname}</div><div class="lb-fi-title">Lv.${u.level} ${u.title}</div></div><div class="lb-fi-st"><div class="lb-fi-wt">${u.weight.toLocaleString()}</div>${u.streak?`<div class="lb-fi-streak">🔥${u.streak}</div>`:''}</div></div>`;
  }).join('');
}

function updateWinrate(f0, f1, elapsed, duration) {
  const s0 = f0.score, s1 = f1.score;
  const diff = s0 - s1;
  const timeFrac = duration > 0 ? elapsed / duration : 0;
  // 早期不确定性大（宽分母），后期趋于确定（窄分母）
  const uncertainty = 200 + 400 * (1 - timeFrac);
  const z = diff / uncertainty;
  // Sigmoid: 50% when tied, →100% or 0% as gap widens / time runs out
  const winRateTop = 1 / (1 + Math.exp(-z * 3));
  const pctTop = Math.round(winRateTop * 100);
  const pctBottom = 100 - pctTop;

  document.getElementById('winrateTop').style.width = pctTop + '%';
  document.getElementById('winrateBottom').style.width = pctBottom + '%';
  document.getElementById('winrateTopPct').textContent = pctTop + '%';
  document.getElementById('winrateBottomPct').textContent = pctBottom + '%';

  // 标签：显示领先方和分差
  const name0 = f0.biome.name, name1 = f1.biome.name;
  const absDiff = Math.abs(diff);
  let label = '';
  if (absDiff < 10) {
    label = '⚖️ 胶着中 · 两个生态各显神通';
  } else if (pctTop >= 85) {
    label = `🔵 ${name0} 大幅领先 +${absDiff}`;
  } else if (pctTop >= 60) {
    label = `🔵 ${name0} 领先 +${absDiff}`;
  } else if (pctBottom >= 85) {
    label = `🟠 ${name1} 大幅领先 +${absDiff}`;
  } else if (pctBottom >= 60) {
    label = `🟠 ${name1} 领先 +${absDiff}`;
  } else {
    label = `⚡ ${diff > 0 ? name0 : name1} 微弱领先 +${absDiff}`;
  }
  // 时间提示
  const remain = duration - elapsed;
  if (remain < 60 && remain > 0) label += ` · 最后${remain}秒`;
  else if (remain <= 0) label = '🏁 结算中...';
  else if (timeFrac < 0.15) label = '🌱 发育阶段 · ' + label;

  document.getElementById('winrateLabel').textContent = label;
}

function ft(s) { return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }

function setup() {
  document.getElementById('btnTop').onclick = () => join(0);
  document.getElementById('btnBottom').onclick = () => join(1);
  document.getElementById('rulesBtn').onclick = () => document.getElementById('rulesModal').style.display = 'flex';
  document.getElementById('lbBtn').onclick = () => document.getElementById('lbModal').style.display = 'flex';

  const input = document.getElementById('chatInput');
  const send = () => { const t = input.value.trim(); if (!t||!myFaction) return; sendEvent(t); input.value = ''; };
  document.getElementById('sendBtn').onclick = send;
  input.onkeydown = e => { if (e.key==='Enter') send(); };

  document.querySelectorAll('.quick-cmds button').forEach(b => {
    b.onclick = () => { if (!myFaction) { notify('请先选阵营'); return; } sendEvent(b.dataset.cmd); };
  });
}

function join(i) {
  if (!gameState?.factions?.[i]) return;
  const bm = gameState.factions[i].biome;
  myFaction = bm.id;
  document.getElementById('factionSelect').style.display = 'none';
  document.getElementById('inputRow').style.display = 'flex';
  document.getElementById('myFaction').textContent = `${bm.emoji}${bm.name}`;
  fetch('/api/join', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({faction:bm.id})}).catch(()=>{});
  notify(`已加入 ${bm.emoji} ${bm.name}`);
}

function sendEvent(text) {
  if (!myFaction) return;
  fetch('/api/event', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({faction:myFaction,text,name:'观众',platform:'bilibili',platformUid:'local_001'})})
  .then(r=>r.json()).then(d => { if (d.ok) notify(`✅ ${d.event.icon} ${d.event.name}`); else notify(`❓ ${d.reason||'未识别'}`); }).catch(()=>{});
}

function notify(text) {
  const el = document.createElement('div'); el.className = 'notify'; el.textContent = text;
  document.getElementById('notifyContainer').appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function loop() {
  if (gameState?.factions) {
    rendererTop?.render(gameState.factions[0]?.creatures, gameState.factions[0]?.stats, gameState.factions[0]?.stats?.weather);
    rendererBottom?.render(gameState.factions[1]?.creatures, gameState.factions[1]?.stats, gameState.factions[1]?.stats?.weather);
  }
  requestAnimationFrame(loop);
}

window.addEventListener('load', () => { initRenderers(); connectSSE(); setup(); loop(); });
window.addEventListener('resize', resize);