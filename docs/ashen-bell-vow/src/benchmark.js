// Automated 10-Second 4-Group A/B Combat Stress Benchmark & Diagnostic Report UI
// Tests 2x2 matrix: (Standard vs Light Lighting/DPR) x (Audio On vs Audio Off) under deterministic combat load.
import { COLORS, FLOOR_Y, WORLD_W } from './config.js';
import { G, hooks, addShake, punchZoom } from './state.js';
import { audio } from './audio.js';
import { prof } from './profiler.js';
import { createPlayer, makeDuelist, makeFalcon, makeFungus, makeFrostguard, createBoss } from './entities.js';
import { spawnParticles, spawnShockwave, spawnImpactBurst, spawnHitMark, spawnFloatText } from './vfx.js';
import { getGlyphAtlasStats } from './render/glyphAtlas.js';
import { getBackdropCacheStats } from './render/backdropCache.js';

const GROUPS = [
  { id: 'A', name: 'A · 标准光影 + 音效开', lighting: true, muted: false },
  { id: 'B', name: 'B · 标准光影 + 音效关', lighting: true, muted: true },
  { id: 'C', name: 'C · 轻量光影 + 音效开', lighting: false, muted: false },
  { id: 'D', name: 'D · 轻量光影 + 音效关', lighting: false, muted: true }
];

const WARMUP_SEC = 0.40;
const SAMPLE_SEC = 2.50; // 4 x 2.5s = 10.0s pure sampling

const benchState = {
  active: false,
  groupIdx: 0,
  phase: 'idle', // 'warmup' | 'sample'
  phaseTime: 0,
  pulseAccum: 0,
  pulseStep: 0,
  results: [],
  lastReport: null,
  snapshot: null
};

export function isBenchmarkActive() {
  return benchState.active;
}

export function getLastBenchmarkReport() {
  return benchState.lastReport;
}

function captureSnapshot() {
  return {
    gameState: G.gameState,
    activeModal: G.activeModal,
    dynamicLighting: G.settings.dynamicLighting !== false,
    fpsDivisor: G.settings.fpsDivisor || 1,
    showPerf: !!G.settings.showPerf,
    muted: audio.muted,
    musicEnabled: audio.musicEnabled,
    echoSession: G.echoSession,
    player: G.player,
    enemies: G.enemies,
    boss: G.boss,
    boss2: G.boss2,
    boss3: G.boss3,
    boss4: G.boss4,
    cam: { ...G.cam },
    stats: { ...G.stats },
    chapelTide: G.chapelTide,
    bossBanner: G.bossBanner
  };
}

function restoreSnapshot(snap) {
  if (!snap) return;
  G.settings.dynamicLighting = snap.dynamicLighting;
  G.settings.fpsDivisor = snap.fpsDivisor;
  G.settings.showPerf = snap.showPerf;
  audio.setMuted(snap.muted);
  audio.setMusicEnabled(snap.musicEnabled);
  const muteBtn = document.getElementById('btn-mute');
  if (muteBtn) muteBtn.textContent = audio.muted ? '音效: 关' : '音效: 开';

  G.echoSession = snap.echoSession;
  G.player = snap.player;
  G.enemies = snap.enemies || [];
  G.boss = snap.boss;
  G.boss2 = snap.boss2;
  G.boss3 = snap.boss3;
  G.boss4 = snap.boss4;
  G.cam = { ...snap.cam };
  G.stats = { ...snap.stats };
  G.chapelTide = snap.chapelTide;
  G.bossBanner = snap.bossBanner;
  G.particles = [];
  G.slashes = [];
  G.shockwaves = [];
  G.impactBursts = [];
  G.hitMarks = [];
  G.floatTexts = [];
  G.afterimages = [];
  G.projectiles = [];
  G.groundWaves = [];
  G.sporeClouds = [];
  G.weaponUltimates = [];
  G.delayedStrikes = [];
  G.hitstopTimer = 0;
  G.invertTimer = 0;
  G.screenFlash = { alpha: 0, color: '#fff' };

  hooks.resizeCanvas();
  G.gameState = snap.gameState === 'title' ? 'title' : 'playing';
  if (G.gameState === 'title') {
    const titleEl = document.getElementById('title-screen');
    if (titleEl) titleEl.classList.remove('hidden');
  }
  hooks.syncHUD(true);
}

function setupDeterministicArena() {
  // Controlled high-load combat inside Chapel of the Broken Bell (identical for all 4 groups!)
  G.player = createPlayer(3120, FLOOR_Y - 54);
  G.player.facing = 1;
  G.player.hp = G.player.maxHp;
  G.player.soul = G.player.maxSoul;

  const boss = createBoss();
  boss.x = 3270;
  boss.y = FLOOR_Y - boss.h;
  boss.awake = true;
  boss.alive = true;
  boss.phase = 2;
  boss.hp = Math.round(boss.maxHp * 0.45);
  boss.state = 'windup';
  boss.moveKind = 'redLeap';
  boss.stateTimer = 0.55;
  boss.windupDuration = 0.65;

  const e1 = makeFrostguard('bench_fg1', 2960, FLOOR_Y - 68, 2740, 3550);
  const e2 = makeDuelist('bench_d1', 3390, FLOOR_Y - 60, 2780, 3620);
  const e3 = makeFalcon('bench_fal1', 3240, FLOOR_Y - 220);
  const e4 = makeFungus('bench_fun1', 3480, FLOOR_Y - 58, 2820, 3640);
  e1.state = 'windup'; e1.attackKind = 'frostLunge'; e1.stateTimer = 0.5;
  e2.state = 'windup'; e2.attackKind = 'redDash'; e2.stateTimer = 0.5;
  e3.state = 'windup'; e3.stateTimer = 0.45;
  e4.state = 'windup'; e4.attackKind = 'sporeBurst'; e4.stateTimer = 0.5;

  G.enemies = [e1, e2, e3, e4];
  G.boss = boss;
  if (G.boss2) G.boss2.alive = false;
  if (G.boss3) G.boss3.alive = false;
  if (G.boss4) G.boss4.alive = false;
  G.echoSession = null;
  G.particles = [];
  G.slashes = [];
  G.shockwaves = [];
  G.impactBursts = [];
  G.hitMarks = [];
  G.floatTexts = [];
  G.afterimages = [];
  G.projectiles = [];
  G.groundWaves = [];
  G.sporeClouds = [];
  G.weaponUltimates = [];
  G.delayedStrikes = [];
  G.chapelTide = null;
  G.bossBanner = null;
  G.hitstopTimer = 0;
  G.invertTimer = 0;
  G.screenFlash = { alpha: 0, color: '#fff' };
  G.cam = {
    x: Math.max(2648, Math.min(Math.max(0, WORLD_W - G.canvasW), 3160 - G.canvasW * 0.5)),
    y: 0,
    shake: 0,
    kickX: 0,
    kickY: 0,
    zoom: 1
  };
  hooks.syncHUD(true);
}

function applyGroupConfig(grp) {
  G.settings.dynamicLighting = grp.lighting;
  G.settings.fpsDivisor = 1; // Always native uncapped refresh rate during benchmark
  audio.init();
  audio.setMuted(grp.muted);
  audio.setMusicEnabled(!grp.muted);
  hooks.resizeCanvas();
  setupDeterministicArena();
  benchState.phase = 'warmup';
  benchState.phaseTime = 0;
  benchState.pulseAccum = 0;
  benchState.pulseStep = 0;
  updateBannerUI();
}

function updateBannerUI() {
  const el = document.getElementById('bench-banner');
  if (!el) return;
  if (!benchState.active) {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  const grp = GROUPS[benchState.groupIdx];
  const totalPerGroup = WARMUP_SEC + SAMPLE_SEC;
  const elapsedTotal = benchState.groupIdx * totalPerGroup + benchState.phaseTime;
  const fullTotal = GROUPS.length * totalPerGroup;
  const remain = Math.max(0, fullTotal - elapsedTotal);
  const pct = Math.min(100, (elapsedTotal / fullTotal) * 100);
  const tag = benchState.phase === 'warmup' ? '预热中' : '采样中';
  const txt = document.getElementById('bench-banner-text');
  const bar = document.getElementById('bench-banner-fill');
  if (txt) {
    txt.textContent = `A/B 战斗压测 [${benchState.groupIdx + 1}/4] ${grp.name} · ${tag} · 剩余 ${remain.toFixed(1)}s (Esc 取消)`;
  }
  if (bar) bar.style.transform = `scaleX(${(pct / 100).toFixed(3)})`;
}

export function startCombatBenchmark() {
  if (benchState.active || !G.levelBundle) return;
  benchState.snapshot = captureSnapshot();
  benchState.active = true;
  G.benchActive = true;
  benchState.groupIdx = 0;
  benchState.results = [];

  // Hide all overlays & live profiler drawer so benchmark measures pure gameplay
  document.querySelectorAll('.overlay-screen').forEach(el => el.classList.add('hidden'));
  const drawer = document.getElementById('profiler-drawer');
  if (drawer) drawer.classList.add('hidden');
  G.activeModal = null;
  G.gameState = 'playing';

  applyGroupConfig(GROUPS[0]);
}

export function cancelCombatBenchmark() {
  if (!benchState.active) return;
  prof.stopRecording(1000 / prof.getRefreshHz());
  benchState.active = false;
  G.benchActive = false;
  updateBannerUI();
  restoreSnapshot(benchState.snapshot);
  benchState.snapshot = null;
}

function driveDeterministicCombatPulse(step) {
  const p = G.player;
  const b = G.boss;
  if (!p || !b) return;
  const px = p.x + p.w * 0.5;
  const py = p.y + 26;
  const bx = b.x + b.w * 0.5;
  const by = b.y + 46;

  // Keep actors alive & positioned cleanly inside Chapel
  p.hp = Math.max(Math.round(p.maxHp * 0.65), p.maxHp - (step % 4) * 9);
  p.grayHp = (step % 2) * 16;
  p.soul = 40 + ((step * 17) % 60);
  p.seals = step % 4;
  p.parryStreak = (step % 4) + 1;
  b.hp = Math.max(120, Math.round(b.maxHp * 0.45) - (step % 5) * 14);
  b.posture = ((step * 23) % Math.max(1, b.maxPosture - 15));
  for (let i = 0; i < G.enemies.length; i++) {
    const e = G.enemies[i];
    if (!e) continue;
    e.alive = true;
    e.hp = Math.max(35, e.maxHp - (step % 3) * 15);
    e.posture = (step * 13 + i * 19) % Math.max(1, e.maxPosture - 10);
  }

  const mode = step % 5;
  if (mode === 0) {
    // Crimson peril + Wind Falcon cry & wind-blade projectile
    b.state = 'windup';
    b.moveKind = 'redLeap';
    b.stateTimer = 0.50;
    b.windupDuration = 0.60;
    if (G.enemies[0]) { G.enemies[0].state = 'windup'; G.enemies[0].attackKind = 'frostLunge'; G.enemies[0].stateTimer = 0.45; }
    if (G.enemies[1]) { G.enemies[1].state = 'windup'; G.enemies[1].attackKind = 'redDash'; G.enemies[1].stateTimer = 0.45; }
    audio.playDangerAlert();
    audio.playFalconCry();
    audio.playWindBlade();
    G.slashes.push({ x: bx - 44, y: by, facing: -1, type: 'bossRedSlam', life: 0.28, maxLife: 0.28 });
    G.projectiles.push({
      owner: 'enemy', source: G.enemies[2] || b, kind: 'windBlade',
      x: bx - 10, y: FLOOR_Y - 180, vx: -320, vy: 85, r: 13, dmg: 16, posture: 22,
      life: 1.1, maxLife: 1.1, reflected: false, hitIds: new Set()
    });
    spawnParticles(bx - 24, by, 18, { color: COLORS.crimsonBright, speed: 260, spark: true, life: 0.38 });
    spawnFloatText(bx, b.y - 34, '危 · 朔风猩红斩', COLORS.crimsonBright, 20, 0.72);
  } else if (mode === 1) {
    // Perfect Parry Clash (pre-baked clang + starburst + bouncing sparks + punchZoom)
    p.parryActive = true;
    p.parryElapsedMs = 45;
    audio.playParry(true, (step % 4) + 1);
    audio.playFinisherDeflect();
    addShake(10);
    punchZoom(1.042);
    G.screenFlash = { alpha: 0.22, color: COLORS.goldBright };
    const cx = px + 26;
    spawnImpactBurst(cx, py, 'parry', 1.15);
    spawnShockwave(cx, py, 96, COLORS.goldBright, 4.2, 0.28);
    spawnParticles(cx, py, 24, { color: COLORS.goldBright, speed: 340, spark: true, bounce: true, grav: 580, life: 0.42 });
    spawnParticles(cx, py, 10, { color: COLORS.ink, speed: 210, grav: 320, life: 0.38 });
    spawnFloatText(px, p.y - 28, `铁鸣连弹 ×${(step % 4) + 1}！`, COLORS.goldBright, 22, 0.75);
  } else if (mode === 2) {
    // Three-Weapon Switch Strike & Heavy Hammer / Bell VFX
    p.parryActive = false;
    const useBell = (step % 2) === 0;
    audio.playWeaponSwap(useBell ? 'bell' : 'hammer');
    if (useBell) {
      audio.playUltimateBell();
      if (G.weaponUltimates.length < 1) {
        G.weaponUltimates.push({ kind: 'bell_sanctum', x: px, y: py, radius: 195, life: 1.2, maxLife: 1.2, pulseTimer: 9, pulseInterval: 1, pulsesLeft: 0, pulseDmg: 0, pulsePosture: 0, dartDmg: 0 });
      }
    } else {
      audio.playUltimateBlade();
      audio.playShieldBash(true);
    }
    audio.playHit(true, 3);
    addShake(8.5);
    punchZoom(1.034);
    G.slashes.push({ x: px + 42, y: py, facing: 1, type: useBell ? 'bellCounter' : 'hammerQuake', life: 0.30, maxLife: 0.30 });
    spawnHitMark(bx, by, -0.6, COLORS.goldBright, 96, 8);
    spawnHitMark(bx, by, 0.6, useBell ? COLORS.cyanBright : COLORS.crimsonBright, 86, 7);
    spawnParticles(bx, by, 18, { color: useBell ? COLORS.cyanBright : COLORS.goldBright, speed: 290, spark: true, life: 0.36 });
    spawnFloatText(px, p.y - 26, useBell ? '切刃 · 退步双鸣!' : '切刃 · 落钟破岳!', useBell ? COLORS.cyanBright : COLORS.goldBright, 20, 0.72);
  } else if (mode === 3) {
    // Forest Toxic Spore Cloud + Requiem Bell-Quake Purification
    audio.playSporeBurst();
    audio.playSporePurify();
    if (G.sporeClouds.length < 2) {
      G.sporeClouds.push({ x: bx - 36, y: FLOOR_Y - 26, r: 68, life: 1.4, maxLife: 1.4, dmg: 8 });
    }
    G.bellQuakes.push({ x: px + 24, y: py, radius: 135, life: 0.34, maxLife: 0.34 });
    spawnShockwave(bx - 36, FLOOR_Y - 26, 118, '#6ee7b7', 4.0, 0.30);
    spawnParticles(bx - 36, FLOOR_Y - 26, 20, { color: '#6ee7b7', speed: 220, spark: true, life: 0.38 });
    spawnFloatText(px, p.y - 26, '镇魂净孢！', '#6ee7b7', 19, 0.72);
  } else {
    // Boss Ground Wave + Frost Shatter + Glacial Shard Projectile
    b.state = 'strike';
    b.moveKind = 'delaySlam';
    b.stateTimer = 0.26;
    audio.playBellToll();
    audio.playFrostShatter();
    audio.playHit(false, 2);
    addShake(8);
    G.slashes.push({ x: px + 26, y: py, facing: 1, type: 'slash3', life: 0.23, maxLife: 0.23 });
    G.groundWaves.push({ x: bx - 30, y: FLOOR_Y, minX: 2648, maxX: 3738, vx: -390, w: 36, h: 46, life: 1.1, hit: true, theme: 'frost' });
    G.projectiles.push({
      owner: 'enemy', source: G.enemies[0] || b, kind: 'frostShard',
      x: bx - 16, y: FLOOR_Y - 72, vx: -340, vy: 0, r: 12, dmg: 18, posture: 24,
      life: 1.1, maxLife: 1.1, reflected: false, hitIds: new Set()
    });
    spawnShockwave(bx - 24, FLOOR_Y - 8, 125, '#7dd3fc', 3.8, 0.30);
    spawnParticles(bx - 20, FLOOR_Y - 16, 20, { color: '#bae6fd', speed: 250, spark: true, life: 0.38 });
    spawnFloatText(px, p.y - 24, '碎冰震荡', '#bae6fd', 17, 0.68);
  }
}

export function tickCombatBenchmark(dt) {
  if (!benchState.active) return;

  // Keep player smoothly oscillating to force camera + lantern shadow + volumetric light updates every frame
  if (G.player) {
    const t = G.globalTime;
    const targetX = 3100 + Math.sin(t * 2.4) * 95;
    G.player.vx = (targetX - G.player.x) * 4.5;
    G.player.facing = 1;
    G.player.iframeTimer = 0.5;
    G.hitstopTimer = 0; // Keep benchmark frames flowing smoothly without hitstop pauses
  }
  if (G.boss) {
    G.boss.x = 3275 + Math.cos(G.globalTime * 1.9) * 35;
    G.boss.facing = -1;
  }

  benchState.phaseTime += dt;
  benchState.pulseAccum += dt;
  if (benchState.pulseAccum >= 0.25) {
    benchState.pulseAccum -= 0.25;
    driveDeterministicCombatPulse(benchState.pulseStep++);
  }

  if (benchState.phase === 'warmup' && benchState.phaseTime >= WARMUP_SEC) {
    benchState.phase = 'sample';
    benchState.phaseTime = 0;
    prof.startRecording(2400);
  } else if (benchState.phase === 'sample' && benchState.phaseTime >= SAMPLE_SEC) {
    const grp = GROUPS[benchState.groupIdx];
    const hz = prof.getRefreshHz();
    const stats = prof.stopRecording(1000 / hz);
    const dpr = G.canvas && G.canvasW ? +(G.canvas.width / Math.max(1, G.canvasW)).toFixed(2) : 1;
    benchState.results.push({
      ...grp,
      dpr,
      pxW: G.canvas ? G.canvas.width : 0,
      pxH: G.canvas ? G.canvas.height : 0,
      stats
    });
    benchState.groupIdx++;
    if (benchState.groupIdx < GROUPS.length) {
      applyGroupConfig(GROUPS[benchState.groupIdx]);
    } else {
      finishBenchmark();
      return;
    }
  }
  updateBannerUI();
}

function buildDiagnosis(report) {
  const map = {};
  for (const r of report.groups) map[r.id] = r;
  const A = map.A && map.A.stats;
  const B = map.B && map.B.stats;
  const C = map.C && map.C.stats;
  const D = map.D && map.D.stats;
  if (!A || !B || !C || !D) return { lines: ['采样帧数不足，请重新运行压测。'], topFix: '重跑压测' };

  const budget = report.budgetMs;
  const audioFrameDelta = ((A.p99 - B.p99) + (C.p99 - D.p99)) * 0.5;
  const audioDropDelta = ((A.dropPct - B.dropPct) + (C.dropPct - D.dropPct)) * 0.5;
  const audioJsDelta = ((A.modules.audio.p99 - B.modules.audio.p99) + (C.modules.audio.p99 - D.modules.audio.p99)) * 0.5;

  const lightFrameDelta = ((A.p99 - C.p99) + (B.p99 - D.p99)) * 0.5;
  const lightDropDelta = ((A.dropPct - C.dropPct) + (B.dropPct - D.dropPct)) * 0.5;
  const lightJsDelta = ((A.modules.lighting.p99 - C.modules.lighting.p99) + (B.modules.lighting.p99 - D.modules.lighting.p99)) * 0.5;

  const gpuGapA = Math.max(0, A.p99 - A.jsP99);
  const gpuGapD = Math.max(0, D.p99 - D.jsP99);

  // Find hottest JS module in Group A
  const modNames = {
    update: '逻辑/AI', audio: 'WebAudio音频', lighting: '动态光影',
    world: '地形/背景绘制', entities: '角色/怪物绘制', vfx: '特效/字形/粒子', hud: 'HUD DOM'
  };
  let topModKey = 'world';
  let topModVal = -1;
  for (const k of Object.keys(A.modules)) {
    if (A.modules[k].p99 > topModVal) { topModVal = A.modules[k].p99; topModKey = k; }
  }

  const lines = [];
  if (lightFrameDelta > 1.2 || lightDropDelta > 2.0) {
    lines.push(`1. 【光影 + 高DPR 影响显著】关闭标准光影(A→C / B→D)后，P99 帧时间平均下降 ${lightFrameDelta.toFixed(1)}ms，掉帧率下降 ${lightDropDelta.toFixed(1)}%（光影 JS 变化 ${lightJsDelta.toFixed(2)}ms）。优先做：静态地形离屏缓存 + 轻量单Pass光照 + 独立 DPR 档位。`);
  } else {
    lines.push(`1. 【光影 + DPR 影响较小】A→C / B→D 的 P99 变化仅 ${lightFrameDelta.toFixed(1)}ms（掉帧率差 ${lightDropDelta.toFixed(1)}%），说明动态光影并非主瓶颈。`);
  }

  if (audioFrameDelta > 0.8 || audioDropDelta > 1.5 || audioJsDelta > 0.45) {
    lines.push(`2. 【Web Audio 实时合成有明显抖动】关音效(A→B / C→D)后，P99 帧时间平均改善 ${audioFrameDelta.toFixed(1)}ms，掉帧率下降 ${audioDropDelta.toFixed(1)}%，音频线程 JS P99 降低 ${audioJsDelta.toFixed(2)}ms。优先做：OfflineAudioContext 启动时离线预烘焙所有音效为静态 Buffer。`);
  } else {
    lines.push(`2. 【Web Audio 影响有限】开关音效对 P99 的平均影响为 ${audioFrameDelta.toFixed(1)}ms（音频 JS P99 差 ${audioJsDelta.toFixed(2)}ms），音频不是主要掉帧元凶。`);
  }

  if (D.p99 > budget * 1.45 && D.jsP99 < budget * 0.55) {
    lines.push(`3. 【GPU光栅化 / 字形缓存 / 浏览器合成器瓶颈】即使在最轻的 D 组，JS P99 仅 ${D.jsP99.toFixed(2)}ms，但帧间隔 P99 仍达 ${D.p99.toFixed(1)}ms（非JS占比 ~${gpuGapD.toFixed(1)}ms）。重点重构：中文飘字/危字位图图集缓存（避免微距缩放击穿字形缓存）+ 静态地形预烘焙减少 Canvas 路径光栅化。`);
  } else if (A.jsP99 >= budget * 0.55) {
    lines.push(`3. 【CPU / JS 耗时偏高】A 组 JS P99 达 ${A.jsP99.toFixed(2)}ms，头号 CPU 热点为「${modNames[topModKey]}」(P99 ${topModVal.toFixed(2)}ms)，建议针对该模块 + 粒子对象池做零分配重构。`);
  } else if (A.dropPct < 1.5) {
    lines.push(`3. 【整体稳帧良好】A 组掉帧率仅 ${A.dropPct.toFixed(1)}%（1% Low ${Math.round(A.onePctLowFps)} FPS），主循环与 GPU 均留有充裕余量（头号 JS 项为「${modNames[topModKey]}」${topModVal.toFixed(2)}ms）。`);
  } else {
    lines.push(`3. 【偶发掉帧诊断】A 组 JS P99 为 ${A.jsP99.toFixed(2)}ms（热点「${modNames[topModKey]}」${topModVal.toFixed(2)}ms），GPU/合成器差值约 ${gpuGapA.toFixed(1)}ms，GC 检测 ${A.gcDrops} 次。`);
  }

  return { lines, audioFrameDelta, lightFrameDelta, topModKey, topModVal };
}

function formatPlainReport(report) {
  const lines = [
    `=== 灰钟残誓 v45.3 10秒 A/B 战斗压测报告 (字形图集 + 静态背景缓存版) ===`,
    `屏幕实测刷频: ${report.refreshHz}Hz (1×预算 ${report.budgetMs.toFixed(2)}ms) | UA: ${report.uaShort}`,
    `离屏缓存状态: 字形图集命中率 ${report.cacheSnap.glyphHitRate.toFixed(1)}% (${report.cacheSnap.glyphEntries}项) | 静态背景缓存 ${report.cacheSnap.backdropPanels}块`,
    ``
  ];
  for (const g of report.groups) {
    const s = g.stats;
    if (!s) continue;
    lines.push(
      `[${g.name}] (${g.pxW}x${g.pxH} DPR:${g.dpr}) ` +
      `均FPS:${s.avgFps.toFixed(1)} | 1%Low:${s.onePctLowFps.toFixed(1)} | ` +
      `P50:${s.p50.toFixed(1)}ms P95:${s.p95.toFixed(1)}ms P99:${s.p99.toFixed(1)}ms Max:${s.maxFrame.toFixed(1)}ms | ` +
      `掉帧率:${s.dropPct.toFixed(1)}% | JS均:${s.jsAvg.toFixed(2)}ms P99:${s.jsP99.toFixed(2)}ms | GC:${s.gcDrops}`
    );
    const m = s.modules;
    lines.push(
      `   分模块(均/P99 ms): upd ${m.update.avg.toFixed(2)}/${m.update.p99.toFixed(2)}, ` +
      `aud ${m.audio.avg.toFixed(2)}/${m.audio.p99.toFixed(2)} (${s.sfxPerFrame.toFixed(1)}次/帧), ` +
      `lit ${m.lighting.avg.toFixed(2)}/${m.lighting.p99.toFixed(2)}, ` +
      `wld ${m.world.avg.toFixed(2)}/${m.world.p99.toFixed(2)}, ` +
      `ent ${m.entities.avg.toFixed(2)}/${m.entities.p99.toFixed(2)}, ` +
      `vfx ${m.vfx.avg.toFixed(2)}/${m.vfx.p99.toFixed(2)}, ` +
      `hud ${m.hud.avg.toFixed(2)}/${m.hud.p99.toFixed(2)}`
    );
  }
  lines.push('', '--- 自动诊断 ---', ...report.diagnosis.lines);
  return lines.join('\n');
}

function finishBenchmark() {
  benchState.active = false;
  G.benchActive = false;
  updateBannerUI();

  const hz = prof.getRefreshHz();
  const report = {
    timestamp: new Date().toLocaleTimeString(),
    refreshHz: hz,
    budgetMs: 1000 / hz,
    uaShort: (navigator.userAgent || '').replace(/^Mozilla\/5\.0\s*/, '').slice(0, 72),
    cacheSnap: (() => {
      const g = getGlyphAtlasStats();
      const b = getBackdropCacheStats();
      return { glyphHitRate: g.hitRate, glyphEntries: g.entries, backdropPanels: b.panels };
    })(),
    groups: benchState.results
  };
  report.diagnosis = buildDiagnosis(report);
  report.plainText = formatPlainReport(report);
  benchState.lastReport = report;

  const snap = benchState.snapshot;
  benchState.snapshot = null;
  restoreSnapshot(snap);
  openBenchmarkReportModal();
}

export function openBenchmarkReportModal() {
  const report = benchState.lastReport;
  const body = document.getElementById('bench-report-body');
  const sub = document.getElementById('bench-modal-sub');
  if (!body) return;

  if (!report) {
    if (sub) sub.textContent = '尚未运行压测 · 点击下方按钮立即开始 10 秒 4 组 A/B 战斗压测';
    body.innerHTML = '<div class="bench-empty">点击「运行 10 秒 A/B 压测」将在断钟礼拜堂生成确定性高压战斗场景，自动对比「标准/轻量光影 × 音效开/关」四组帧时间分位数与分模块耗时。</div>';
    hooks.openModal('bench');
    return;
  }

  if (sub) {
    sub.textContent = `实测 ${report.refreshHz}Hz（预算 ${report.budgetMs.toFixed(2)}ms）· 字形图集命中 ${report.cacheSnap.glyphHitRate.toFixed(1)}%(${report.cacheSnap.glyphEntries}项) · 背景块 ${report.cacheSnap.backdropPanels} · ${report.timestamp}`;
  }

  let bestP99 = Infinity;
  let worstP99 = -1;
  for (const g of report.groups) {
    if (g.stats && g.stats.p99 < bestP99) bestP99 = g.stats.p99;
    if (g.stats && g.stats.p99 > worstP99) worstP99 = g.stats.p99;
  }

  let rowsMain = '';
  let rowsMod = '';
  for (const g of report.groups) {
    const s = g.stats;
    if (!s) continue;
    const isBest = Math.abs(s.p99 - bestP99) < 0.05;
    const isWorst = Math.abs(s.p99 - worstP99) < 0.05 && worstP99 > bestP99 + 0.5;
    const rowCls = isBest ? ' class="bench-best"' : isWorst ? ' class="bench-worst"' : '';
    rowsMain += `<tr${rowCls}>
      <td><strong>${g.name}</strong><div class="bench-res">${g.pxW}×${g.pxH} (${g.dpr}x)</div></td>
      <td>${s.avgFps.toFixed(1)}</td>
      <td><strong>${s.onePctLowFps.toFixed(1)}</strong></td>
      <td>${s.p50.toFixed(1)}</td>
      <td>${s.p95.toFixed(1)}</td>
      <td><strong>${s.p99.toFixed(1)}</strong></td>
      <td>${s.dropPct.toFixed(1)}%</td>
      <td>${s.jsAvg.toFixed(2)} / ${s.jsP99.toFixed(2)}</td>
      <td>${s.gcDrops}</td>
    </tr>`;
    const m = s.modules;
    rowsMod += `<tr>
      <td><strong>${g.id} 组</strong></td>
      <td>${m.update.avg.toFixed(2)} / ${m.update.p99.toFixed(2)}</td>
      <td>${m.audio.avg.toFixed(2)} / ${m.audio.p99.toFixed(2)}</td>
      <td>${m.lighting.avg.toFixed(2)} / ${m.lighting.p99.toFixed(2)}</td>
      <td>${m.world.avg.toFixed(2)} / ${m.world.p99.toFixed(2)}</td>
      <td>${m.entities.avg.toFixed(2)} / ${m.entities.p99.toFixed(2)}</td>
      <td>${m.vfx.avg.toFixed(2)} / ${m.vfx.p99.toFixed(2)}</td>
      <td>${m.hud.avg.toFixed(2)} / ${m.hud.p99.toFixed(2)}</td>
    </tr>`;
  }

  const diagHtml = report.diagnosis.lines.map(l => `<div class="bench-diag-line">${l}</div>`).join('');

  body.innerHTML = `
    <div class="bench-sec-label">一、4 组帧时间分位数对比（单位 ms，越低越稳）</div>
    <div class="bench-table-wrap">
      <table class="bench-table">
        <thead>
          <tr>
            <th>测试组别 (分辨率/DPR)</th><th>均FPS</th><th>1% Low</th>
            <th>P50</th><th>P95</th><th>P99</th><th>掉帧率</th><th>JS 均/P99</th><th>GC</th>
          </tr>
        </thead>
        <tbody>${rowsMain}</tbody>
      </table>
    </div>
    <div class="bench-sec-label">二、分模块 CPU/JS 耗时拆解（均值 / P99，单位 ms）</div>
    <div class="bench-table-wrap">
      <table class="bench-table compact">
        <thead>
          <tr>
            <th>组别</th><th>逻辑/AI</th><th>音频</th><th>光影</th><th>地形/背景</th><th>角色/怪</th><th>特效/字形</th><th>HUD</th>
          </tr>
        </thead>
        <tbody>${rowsMod}</tbody>
      </table>
    </div>
    <div class="bench-sec-label">三、自动瓶颈诊断</div>
    <div class="bench-diag-box">${diagHtml}</div>
  `;

  hooks.openModal('bench');
}

export async function copyBenchmarkReport() {
  const report = benchState.lastReport;
  if (!report) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(report.plainText);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = report.plainText;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}
