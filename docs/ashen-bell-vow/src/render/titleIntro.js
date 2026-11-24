// 7.8-Second 4-Act Procedural Dark-Ink Startup Intro Cinematic ("破刃断钟 · 无人物纯器物版") & Scene Fade (v43.4)
import { COLORS } from '../config.js';
import { G } from '../state.js';
import { drawGlowSprite, boilCircle, drawTaperedCrescent } from '../vfx.js';
import { audio } from '../audio.js';
import { t, isEn, getCanvasFont } from '../i18n.js';

const INTRO_DUR = 7.80;
const ACT2_TIME = 1.75;      // Hand-drawn Broken Blade glides into diagonal cleave line
const CHARGE_TIME = 2.55;    // Golden parry-glint charge + inward ink filaments
const SLASH_TIME = 3.55;     // Broken Blade flashes diagonally across screen & cleaves the bronze bell
const SPLIT_START = 3.71;    // 0.16s dramatic hitstop ends -> bell physically splits into 2 halves in slow-mo!
const FADE_START = 5.65;     // Ink curtain dissolves to reveal the live Extinguished Altar title stage
const REVEAL_UI_TIME = 6.10; // Title crest & soulslike menu cascade in
const CUT_ANGLE = -0.46;     // Diagonal slash angle (lower-left -> upper-right)

const _intro = {
  active: false,
  t: 0,
  lastWallMs: 0,
  bellSfxDone: false,
  chargeSfxDone: false,
  slashed: false,
  splitSpawned: false,
  uiRevealed: false,
  sparks: [],
  shards: [],
  rings: [],
  ashMotes: []
};

const _fade = {
  active: false,
  t: 0,
  dur: 0.46,
  midFired: false,
  onMid: null,
  watchdogId: null
};

function fireFadeMidSafe() {
  if (_fade.midFired) return;
  _fade.midFired = true;
  const cb = _fade.onMid;
  _fade.onMid = null;
  if (typeof cb === 'function') {
    try {
      cb();
    } catch (err) {
      _fade.active = false;
      console.error('[AshenBellVow] Scene transition callback failed:', err);
      if (typeof window !== 'undefined' && typeof window.__ABV_SHOW_FATAL__ === 'function') {
        window.__ABV_SHOW_FATAL__('TransitionError: ' + (err && err.message ? err.message : String(err)));
      }
    }
  }
}

function canPlayAudioNow() {
  return !!(audio && audio.ctx && audio.ctx.state === 'running' && !audio.muted);
}

function initIntroAsh() {
  _intro.ashMotes.length = 0;
  for (let i = 0; i < 42; i++) {
    _intro.ashMotes.push({
      rx: Math.random(),
      ry: Math.random(),
      vx: -14 - Math.random() * 24,
      vy: 10 + Math.random() * 22,
      r: 0.9 + Math.random() * 1.9,
      phase: Math.random() * Math.PI * 2,
      cyan: i % 5 === 0
    });
  }
}

function spawnCleaveBurst(cx, cy) {
  _intro.sparks.length = 0;
  _intro.shards.length = 0;
  const cutCos = Math.cos(CUT_ANGLE);
  const cutSin = Math.sin(CUT_ANGLE);

  // 58 directional molten-gold & cyan soulfire sparks spraying along the blade cut & radially
  for (let i = 0; i < 58; i++) {
    const alongCut = i < 28;
    const baseAng = alongCut
      ? (CUT_ANGLE + (i % 2 === 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.55)
      : (Math.random() * Math.PI * 2);
    const spd = alongCut ? (180 + Math.random() * 440) : (65 + Math.random() * 240);
    _intro.sparks.push({
      x: cx + (Math.random() - 0.5) * 52 * cutCos,
      y: cy + (Math.random() - 0.5) * 52 * cutSin,
      vx: Math.cos(baseAng) * spd,
      vy: Math.sin(baseAng) * spd - 24,
      size: 1.4 + Math.random() * 2.8,
      col: i % 3 === 0 ? 'cyan' : (i % 4 === 0 ? 'white' : 'gold'),
      life: 0.75 + Math.random() * 1.35,
      maxLife: 2.1
    });
  }

  // 14 fractured dark-bronze bell fragments tumbling out of the seam
  for (let i = 0; i < 14; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 70 + Math.random() * 210;
    _intro.shards.push({
      x: cx + (Math.random() - 0.5) * 34,
      y: cy + (Math.random() - 0.5) * 34,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 65,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 7.5,
      sz: 4 + Math.random() * 7,
      life: 1.4 + Math.random() * 0.9,
      maxLife: 2.3
    });
  }

  _intro.rings.push({ r: 16, maxR: 340, life: 1.15, maxLife: 1.15, col: COLORS.goldBright, lw: 3.8 });
  _intro.rings.push({ r: 12, maxR: 250, life: 0.92, maxLife: 0.92, col: COLORS.cyanBright, lw: 2.6 });
  _intro.rings.push({ r: 8,  maxR: 165, life: 0.70, maxLife: 0.70, col: '#fef9c3',          lw: 2.0 });
}

function revealTitleDom() {
  if (_intro.uiRevealed) return;
  _intro.uiRevealed = true;
  const ts = document.getElementById('title-screen');
  if (ts) {
    ts.classList.remove('title-intro-lock');
    ts.classList.add('title-revealed');
  }
}

export function isTitleIntroActive() {
  return _intro.active && _intro.t < REVEAL_UI_TIME;
}

export function isTitleIntroPlaying() {
  return _intro.active;
}

export function startTitleIntro(skipImmediate = false) {
  const ts = document.getElementById('title-screen');
  const sd = document.getElementById('title-slots-drawer');
  if (sd) sd.classList.add('hidden');
  if (skipImmediate) {
    _intro.active = false;
    _intro.t = INTRO_DUR;
    _intro.slashed = true;
    _intro.splitSpawned = true;
    _intro.uiRevealed = false;
    revealTitleDom();
    return;
  }
  if (audio && typeof audio.stopIntroCinematic === 'function') audio.stopIntroCinematic();
  _intro.active = true;
  _intro.t = 0;
  _intro.lastWallMs = performance.now();
  _intro.bellSfxDone = false;
  _intro.chargeSfxDone = false;
  _intro.slashed = false;
  _intro.splitSpawned = false;
  _intro.uiRevealed = false;
  _intro.sparks.length = 0;
  _intro.shards.length = 0;
  _intro.rings.length = 0;
  initIntroAsh();
  if (ts) {
    ts.classList.remove('title-revealed');
    ts.classList.add('title-intro-lock');
  }
}

export function skipTitleIntro() {
  if (!_intro.active) return false;
  const wasLocked = _intro.t < REVEAL_UI_TIME;
  if (_intro.t < FADE_START + 0.45) {
    _intro.t = FADE_START + 0.55;
    _intro.slashed = true;
    _intro.splitSpawned = true;
    spawnCleaveBurst(G.canvasW * 0.5, G.canvasH * 0.45);
  }
  revealTitleDom();
  try {
    audio.init();
    audio.stopIntroCinematic();
  } catch {
    // Ignore audio unlock error before user gesture
  }
  return wasLocked;
}

export function beginSceneFade(onMidCallback, dur = 0.46) {
  if (_fade.active) return;
  _fade.active = true;
  _fade.t = 0;
  _fade.dur = dur;
  _fade.midFired = false;
  _fade.onMid = onMidCallback || null;
  if (_fade.watchdogId !== null) clearTimeout(_fade.watchdogId);
  // Watchdog guarantees transition executes & black curtain clears even if a WebView briefly stalls rAF!
  _fade.watchdogId = setTimeout(() => {
    _fade.watchdogId = null;
    if (_fade.active) {
      fireFadeMidSafe();
      _fade.active = false;
    }
  }, Math.max(450, Math.round(dur * 1000) + 180));
}

export function updateTitleIntro(dt) {
  if (_fade.active) {
    _fade.t += Math.max(0.008, dt);
    const half = _fade.dur * 0.45;
    if (!_fade.midFired && _fade.t >= half) {
      fireFadeMidSafe();
    }
    if (_fade.t >= _fade.dur) {
      _fade.active = false;
      _fade.onMid = null;
      if (_fade.watchdogId !== null) {
        clearTimeout(_fade.watchdogId);
        _fade.watchdogId = null;
      }
    }
  }

  if (!_intro.active) return;
  // Advance intro by real monotonic wall-clock delta (capped at 120ms for background resume) so audio & visuals stay locked even on frame dips!
  const nowWall = performance.now();
  const wallDt = _intro.lastWallMs > 0 ? Math.min(0.12, Math.max(0, (nowWall - _intro.lastWallMs) * 0.001)) : dt;
  _intro.lastWallMs = nowWall;
  _intro.t += wallDt;

  // Dedicated v44.4 theatrical intro audio suite (0 shared in-game combat SFX; instant live synthesis!)
  if (!_intro.bellSfxDone && _intro.t >= 0.32) {
    _intro.bellSfxDone = true;
    if (canPlayAudioNow()) audio.playIntroOmen();
  }
  if (!_intro.chargeSfxDone && _intro.t >= CHARGE_TIME) {
    _intro.chargeSfxDone = true;
    if (canPlayAudioNow()) audio.playIntroBladeDraw();
  }
  if (!_intro.slashed && _intro.t >= SLASH_TIME) {
    _intro.slashed = true;
    if (canPlayAudioNow()) audio.playIntroCleaveSlash();
  }
  if (!_intro.splitSpawned && _intro.t >= SPLIT_START) {
    _intro.splitSpawned = true;
    spawnCleaveBurst(G.canvasW * 0.5, G.canvasH * 0.45);
    if (canPlayAudioNow()) audio.playIntroBellCleave();
  }
  if (!_intro.uiRevealed && _intro.t >= REVEAL_UI_TIME) {
    revealTitleDom();
  }

  // Update drifting ash motes
  const w = Math.max(640, G.canvasW);
  const h = Math.max(360, G.canvasH);
  for (let i = 0; i < _intro.ashMotes.length; i++) {
    const m = _intro.ashMotes[i];
    m.rx += (m.vx * dt) / w;
    m.ry += (m.vy * dt) / h;
    if (m.rx < -0.02) m.rx = 1.02;
    if (m.ry > 1.03) { m.ry = -0.03; m.rx = Math.random(); }
  }

  // Update cleave sparks & bronze shards
  for (let i = _intro.sparks.length - 1; i >= 0; i--) {
    const p = _intro.sparks[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.32, dt);
    p.vy += 145 * dt;
    p.life -= dt;
    if (p.life <= 0) _intro.sparks.splice(i, 1);
  }
  for (let i = _intro.shards.length - 1; i >= 0; i--) {
    const s = _intro.shards[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += 260 * dt;
    s.rot += s.vrot * dt;
    s.life -= dt;
    if (s.life <= 0) _intro.shards.splice(i, 1);
  }
  for (let i = _intro.rings.length - 1; i >= 0; i--) {
    _intro.rings[i].life -= dt;
    if (_intro.rings[i].life <= 0) _intro.rings.splice(i, 1);
  }

  if (_intro.t >= INTRO_DUR) {
    _intro.active = false;
    revealTitleDom();
  }
}

// Detailed Hand-Drawn Ancient Bronze Bell (centered at 0,0) — drawn intact OR clipped into 2 severed halves!
function drawHeroBronzeBell(ctx, curT, isCleaved, glowLevel) {
  // Crown loop
  ctx.strokeStyle = isCleaved ? COLORS.goldBright : '#d8cfb8';
  ctx.lineWidth = 3.0;
  ctx.beginPath(); ctx.arc(0, -82, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#1b1610';
  ctx.beginPath(); ctx.arc(0, -82, 6, 0, Math.PI * 2); ctx.fill();

  // Main weathered bronze bell silhouette
  const bg = ctx.createLinearGradient(-72, -72, 78, 72);
  bg.addColorStop(0, '#3a2d1d');
  bg.addColorStop(0.45, '#1d222e');
  bg.addColorStop(0.82, '#10141e');
  bg.addColorStop(1, '#080b12');
  ctx.fillStyle = bg;
  ctx.strokeStyle = isCleaved ? COLORS.goldBright : 'rgba(226, 216, 192, 0.85)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-36, -70);
  ctx.quadraticCurveTo(-48, -14, -76, 56);
  ctx.quadraticCurveTo(-82, 66, -74, 72);
  ctx.quadraticCurveTo(0, 88, 74, 72);
  ctx.quadraticCurveTo(82, 66, 76, 56);
  ctx.quadraticCurveTo(48, -14, 36, -70);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner dark cavity shadow at bell mouth
  ctx.fillStyle = 'rgba(5, 8, 14, 0.85)';
  ctx.beginPath();
  ctx.ellipse(0, 68, 62, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Embossed ancient bronze ribs & etched sigil bands
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.52)';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(-45, -24); ctx.quadraticCurveTo(0, -18, 45, -24);
  ctx.moveTo(-58, 16);  ctx.quadraticCurveTo(0, 23, 58, 16);
  ctx.moveTo(-71, 52);  ctx.quadraticCurveTo(0, 62, 71, 52);
  ctx.stroke();

  // Vertical decorative boss studs along upper waist
  ctx.fillStyle = 'rgba(253, 224, 71, 0.52)';
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.arc(k * 16, -42 + Math.abs(k) * 1.6, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ancient vertical hairline fracture glowing subtly as charge peaks
  const hairlineA = 0.28 + glowLevel * 0.65;
  ctx.strokeStyle = isCleaved ? '#fef08a' : `rgba(56, 189, 248, ${hairlineA.toFixed(2)})`;
  ctx.lineWidth = isCleaved ? 2.4 : 1.4;
  ctx.beginPath();
  ctx.moveTo(-12, -56); ctx.lineTo(-4, -22); ctx.lineTo(-16, 4); ctx.lineTo(-6, 44);
  ctx.stroke();

  // Hanging soulfire clapper inside bell mouth (if intact or attached to lower half)
  const clpSwing = Math.sin(curT * 2.2) * 5;
  ctx.fillStyle = isCleaved ? '#fef08a' : '#7dd3fc';
  ctx.strokeStyle = COLORS.goldBright;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(clpSwing, 74, 9.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// Pure Hand-Drawn Notched Broken Blade (灰钟断刃) — No Character Silhouette!
function drawIntroBrokenBlade(ctx, x, y, ang, scale, chargeProg, isAfter, alpha) {
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(scale, scale);

  // Wrapped hilt & ancient bronze bell pommel
  ctx.fillStyle = '#241b12';
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(-62, 0, 6.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fef08a';
  ctx.beginPath(); ctx.arc(-62, 0, 2.2, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = '#5c4630';
  ctx.lineWidth = 7.2;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-54, 0); ctx.lineTo(-22, 0); ctx.stroke();
  ctx.strokeStyle = '#0e1118';
  ctx.lineWidth = 1.5;
  for (let gx = -50; gx <= -26; gx += 6) {
    ctx.beginPath(); ctx.moveTo(gx, -3.5); ctx.lineTo(gx + 3, 3.5); ctx.stroke();
  }

  // Asymmetric bronze crossguard
  ctx.fillStyle = '#2d2113';
  ctx.strokeStyle = COLORS.goldBright;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(-22, -14); ctx.lineTo(-15, -11); ctx.lineTo(-15, 11); ctx.lineTo(-22, 14);
  ctx.lineTo(-25, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Signature Notched Broken Steel Blade Body
  const steelGrad = ctx.createLinearGradient(-16, -8, 128, 8);
  if (isAfter || chargeProg > 0.35) {
    steelGrad.addColorStop(0, '#94a3b8');
    steelGrad.addColorStop(0.5, '#f8fafc');
    steelGrad.addColorStop(1, '#fef08a');
  } else {
    steelGrad.addColorStop(0, '#475569');
    steelGrad.addColorStop(0.55, '#cbd5e1');
    steelGrad.addColorStop(1, '#f1f5f9');
  }
  ctx.fillStyle = steelGrad;
  ctx.strokeStyle = isAfter ? '#fef9c3' : '#0b0e16';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-15, -6.2);
  ctx.lineTo(106, -7.8);
  ctx.lineTo(126, -2.0);
  ctx.lineTo(108, 6.2);
  // Signature chipped battle-notch along the cutting edge
  ctx.lineTo(84, 5.8);
  ctx.lineTo(78, 0.5);
  ctx.lineTo(71, 6.0);
  ctx.lineTo(36, 5.8);
  ctx.lineTo(32, 2.2);
  ctx.lineTo(27, 6.0);
  ctx.lineTo(-15, 6.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Fuller blood-groove & gleaming razor edge highlight
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-8, -1.6); ctx.lineTo(94, -2.4); ctx.stroke();

  const edgeA = isAfter ? 0.95 : (0.45 + chargeProg * 0.55);
  ctx.strokeStyle = `rgba(254, 249, 195, ${edgeA.toFixed(2)})`;
  ctx.lineWidth = 1.6 + chargeProg * 1.1;
  ctx.beginPath(); ctx.moveTo(-12, -5.8); ctx.lineTo(122, -2.0); ctx.stroke();

  ctx.restore();
}

export function drawTitleIntroOverlay() {
  const ctx = G.ctx;
  const w = G.canvasW;
  const h = G.canvasH;

  if (_intro.active) {
    const curT = _intro.t;
    const fadeOut = curT < FADE_START ? 1 : Math.max(0, 1 - (curT - FADE_START) / (INTRO_DUR - FADE_START));
    const smoothFade = fadeOut * fadeOut * (3 - 2 * fadeOut);
    const cx = w * 0.5;
    const cy = h * 0.45;

    ctx.save();
    // 1. Deep ink backdrop curtain with soft moonlit dissolve during Act IV
    ctx.fillStyle = `rgba(5, 7, 12, ${(smoothFade * 0.99).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);

    // Subtle drifting silver/cyan ash motes
    for (let i = 0; i < _intro.ashMotes.length; i++) {
      const m = _intro.ashMotes[i];
      const a = (0.20 + Math.sin(curT * 2.4 + m.phase) * 0.14) * smoothFade;
      ctx.fillStyle = m.cyan ? `rgba(125, 211, 252, ${a.toFixed(2)})` : `rgba(216, 207, 184, ${a.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(m.rx * w, m.ry * h, m.r, 0, Math.PI * 2); ctx.fill();
    }

    // Dramatic slow camera push-in (1.0 -> 1.09 up to slash, then ease back to 1.02 during split) + slash tremor
    let camZoom = 1.0;
    if (curT < SLASH_TIME) {
      camZoom = 1.0 + Math.min(1, curT / SLASH_TIME) * 0.095;
    } else {
      const postP = Math.min(1, (curT - SLASH_TIME) / 1.8);
      camZoom = 1.095 - postP * 0.075;
    }
    const shakeMag = (curT >= SLASH_TIME && curT < SPLIT_START + 0.35)
      ? Math.max(0, (1 - (curT - SLASH_TIME) / 0.52)) * 9.5
      : (curT >= CHARGE_TIME && curT < SLASH_TIME)
        ? ((curT - CHARGE_TIME) / (SLASH_TIME - CHARGE_TIME)) * 1.8
        : 0;
    const shX = shakeMag > 0 ? (Math.random() - 0.5) * shakeMag * 2 : 0;
    const shY = shakeMag > 0 ? (Math.random() - 0.5) * shakeMag * 2 : 0;

    // Dynamic vertical fit so non-fullscreen mobile browser bars NEVER crop the bronze bell or blade!
    const fitScale = Math.min(1.0, Math.max(0.46, (h * 0.68) / 286));
    const totalZoom = camZoom * fitScale;
    ctx.save();
    ctx.translate(cx + shX, cy + shY);
    ctx.scale(totalZoom, totalZoom);
    ctx.translate(-cx, -cy);

    // 2. Pale Moon Halo & Ornate Outer Seal behind the Giant Bell
    const bellIn = Math.min(1, curT / 1.05);
    const splitElapsed = Math.max(0, curT - SPLIT_START);
    const bellFade = curT < 5.2 ? 1 : Math.max(0, 1 - (curT - 5.2) / 1.15);
    const stageAlpha = bellIn * bellFade * smoothFade;
    const chargeProg = curT < CHARGE_TIME ? 0 : Math.min(1, (curT - CHARGE_TIME) / (SLASH_TIME - CHARGE_TIME));

    if (stageAlpha > 0.01) {
      // Soft atmospheric moon halo
      drawGlowSprite(_intro.slashed ? 'gold' : 'cyan', cx, cy, 240 + chargeProg * 45, stageAlpha * (0.28 + chargeProg * 0.22));
      ctx.save();
      ctx.globalAlpha = stageAlpha * 0.32;
      ctx.strokeStyle = _intro.slashed ? COLORS.goldBright : 'rgba(216, 207, 184, 0.55)';
      ctx.lineWidth = 1.4;
      boilCircle(ctx, cx, cy, 128, 620, 1.1, 34);
      ctx.stroke();
      ctx.restore();

      // Bell suspension cord from top of viewport (snaps & recoils upward upon cleave!)
      ctx.save();
      ctx.globalAlpha = stageAlpha * (splitElapsed > 0 ? Math.max(0, 1 - splitElapsed * 1.4) : 1);
      ctx.strokeStyle = 'rgba(216, 207, 184, 0.65)';
      ctx.lineWidth = 3.2;
      const cordEndY = splitElapsed > 0 ? (cy - 92 - splitElapsed * 210) : (cy - 92);
      const cordWhip = splitElapsed > 0 ? Math.sin(splitElapsed * 24) * 18 : Math.sin(curT * 1.3) * 4;
      ctx.beginPath();
      ctx.moveTo(cx, -40);
      ctx.quadraticCurveTo(cx + cordWhip, (cordEndY - 40) * 0.5, cx + cordWhip * 0.4, cordEndY);
      ctx.stroke();
      ctx.restore();

      // 3. THE GIANT BRONZE BELL — INTACT (0..3.71s) vs PHYSICALLY CLEAVED INTO 2 HALVES (3.71s+)!
      const dropY = curT < 1.1 ? -(1 - Math.pow(1 - curT / 1.1, 3)) * 0 - (1 - (1 - Math.pow(1 - curT / 1.1, 3))) * 54 : 0;
      const bellY = cy + dropY;

      if (curT < SPLIT_START) {
        // Intact bell gently swaying, trembling during hitstop (3.55..3.71s)
        const sway = curT < SLASH_TIME
          ? Math.sin(curT * 1.45) * 0.032
          : (Math.sin(curT * 80) * 0.018);
        ctx.save();
        ctx.globalAlpha = stageAlpha;
        ctx.translate(cx, bellY);
        ctx.rotate(sway);
        drawHeroBronzeBell(ctx, curT, _intro.slashed, chargeProg);
        ctx.restore();
      } else {
        // SLOW-MOTION CLEAVE: Bell cleanly sliced into Upper-Left & Lower-Right halves!
        const sp = Math.min(1, splitElapsed / 2.2);
        const easeSep = 1 - Math.pow(1 - sp, 2.4);
        const sep = easeSep * 64;          // perpendicular separation across cut normal
        const slide = easeSep * 42;        // shear slide along diagonal cut plane
        const gravDrop = sp * sp * 52;     // lower half gradually yields to gravity
        const cosC = Math.cos(CUT_ANGLE);
        const sinC = Math.sin(CUT_ANGLE);
        const nx = -sinC;                  // unit normal pointing down-right
        const ny = cosC;

        // Inner Soulfire Core bursting out from the hollow bell interior!
        const coreGlowA = stageAlpha * Math.sin(Math.min(1, splitElapsed / 1.35) * Math.PI);
        if (coreGlowA > 0.02) {
          drawGlowSprite('gold', cx, bellY, 130 + easeSep * 85, coreGlowA * 0.82);
          drawGlowSprite('cyan', cx, bellY, 96 + easeSep * 55, coreGlowA * 0.65);
        }

        // Helper to draw one clipped half + glowing seared molten cross-section edge!
        const drawBellHalf = (isTopHalf) => {
          const sign = isTopHalf ? -1 : 1;
          const dx = sign * nx * sep - sign * cosC * slide * 0.55;
          const dy = sign * ny * sep - sign * sinC * slide * 0.55 + (isTopHalf ? -easeSep * 10 : gravDrop);
          const tilt = sign * easeSep * 0.24;
          ctx.save();
          ctx.globalAlpha = stageAlpha;
          ctx.translate(cx + dx, bellY + dy);
          ctx.rotate(tilt);

          // Clip strictly to one side of the oblique blade cut plane
          ctx.save();
          ctx.rotate(CUT_ANGLE);
          ctx.beginPath();
          ctx.rect(-220, isTopHalf ? -220 : 0, 440, 220);
          ctx.clip();
          ctx.rotate(-CUT_ANGLE);
          drawHeroBronzeBell(ctx, curT, true, 1.0);
          ctx.restore();

          // Glowing red-hot / white-gold freshly sliced bronze edge right along the cut seam
          const seamA = Math.max(0, 1 - sp * 0.85) * stageAlpha;
          if (seamA > 0.03) {
            ctx.save();
            ctx.rotate(CUT_ANGLE);
            ctx.strokeStyle = `rgba(254, 249, 195, ${seamA.toFixed(2)})`;
            ctx.lineWidth = 3.2;
            ctx.beginPath(); ctx.moveTo(-64, 0); ctx.lineTo(64, 0); ctx.stroke();
            ctx.strokeStyle = `rgba(245, 158, 11, ${(seamA * 0.85).toFixed(2)})`;
            ctx.lineWidth = 6.5;
            ctx.beginPath(); ctx.moveTo(-58, 0); ctx.lineTo(58, 0); ctx.stroke();
            ctx.restore();
          }
          ctx.restore();
        };

        drawBellHalf(true);
        drawBellHalf(false);
      }

      // 4. ACT II: Floating Broken Blade glides into diagonal strike alignment (1.75s..3.55s) & charges Golden Glint (2.55s..3.55s)
      if (curT >= ACT2_TIME && curT < SLASH_TIME) {
        const enterP = Math.min(1, (curT - ACT2_TIME) / 0.72);
        const easeIn = 1 - Math.pow(1 - enterP, 3);
        const cosC = Math.cos(CUT_ANGLE);
        const sinC = Math.sin(CUT_ANGLE);
        // Pull back slightly during peak charge for crisp anticipation right before the flash cleave
        const recoil = chargeProg * chargeProg * 28;
        const distBack = 250 - easeIn * 72 + recoil;
        const bx = cx - cosC * distBack;
        const by = bellY - sinC * distBack;

        // Subtle cyan/gold wake aura behind the levitating Broken Blade
        drawGlowSprite(chargeProg > 0.25 ? 'gold' : 'cyan', bx + cosC * 28, by + sinC * 28, 56 + chargeProg * 42, easeIn * stageAlpha * (0.28 + chargeProg * 0.35));
        drawIntroBrokenBlade(ctx, bx, by, CUT_ANGLE, 1.18, chargeProg, false, easeIn * stageAlpha);

        // Golden Parry-Star Glint & converging filaments at the blade's chipped edge + razor sightline across bell!
        if (curT >= CHARGE_TIME) {
          const gx = bx + cosC * 78;
          const gy = by + sinC * 78;
          const pulse = 0.78 + Math.sin(curT * 30) * 0.22;
          drawGlowSprite('gold', gx, gy, 44 + chargeProg * 62, stageAlpha * (0.48 + chargeProg * 0.50));

          // Faint hair-thin golden intention line previewing the cut plane across the bronze bell
          ctx.save();
          ctx.globalAlpha = stageAlpha * chargeProg * 0.58;
          ctx.translate(cx, bellY);
          ctx.rotate(CUT_ANGLE);
          const sightHalf = 55 + chargeProg * 165;
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.0 + chargeProg * 1.1;
          ctx.setLineDash([12, 8]);
          ctx.beginPath(); ctx.moveTo(-sightHalf, 0); ctx.lineTo(sightHalf, 0); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // 4-point sharp star glint + 6 inward-converging golden ink filaments
          ctx.save();
          ctx.globalAlpha = stageAlpha * Math.min(1, chargeProg * 1.4);
          ctx.translate(gx, gy);
          ctx.strokeStyle = '#fef9c3';
          ctx.lineWidth = 2.0;
          const armL = (18 + chargeProg * 38) * pulse;
          const armS = (10 + chargeProg * 20) * pulse;
          ctx.beginPath();
          ctx.moveTo(-armL, 0); ctx.lineTo(armL, 0);
          ctx.moveTo(0, -armS); ctx.lineTo(0, armS);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(253, 224, 71, 0.75)';
          ctx.lineWidth = 1.4;
          for (let k = 0; k < 6; k++) {
            const ang = k * (Math.PI / 3) + curT * 1.9;
            const dOuter = (1 - chargeProg) * 82 + 14;
            const dInner = Math.max(4, dOuter - 22);
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang) * dOuter, Math.sin(ang) * dOuter);
            ctx.lineTo(Math.cos(ang) * dInner, Math.sin(ang) * dInner);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // 5. ACT III: Diagonal Blade Flash, Crescent Sweep & Broken Blade Follow-Through (3.55s..5.35s)
      if (curT >= SLASH_TIME) {
        const sElap = curT - SLASH_TIME;
        const cosC = Math.cos(CUT_ANGLE);
        const sinC = Math.sin(CUT_ANGLE);

        // Razor-sharp diagonal slash line piercing edge-to-edge across the bell!
        if (sElap < 0.80) {
          const lineA = sElap < 0.16 ? 1.0 : Math.max(0, 1 - (sElap - 0.16) / 0.64);
          const halfLen = Math.min(w * 0.68, 150 + sElap * 2700);
          ctx.save();
          ctx.translate(cx, bellY);
          ctx.rotate(CUT_ANGLE);
          ctx.strokeStyle = `rgba(245, 158, 11, ${(lineA * 0.74).toFixed(2)})`;
          ctx.lineWidth = sElap < 0.16 ? 14 : (10 * lineA);
          ctx.beginPath(); ctx.moveTo(-halfLen, 0); ctx.lineTo(halfLen, 0); ctx.stroke();
          ctx.strokeStyle = `rgba(255, 252, 235, ${lineA.toFixed(2)})`;
          ctx.lineWidth = sElap < 0.16 ? 4.4 : (3.0 * lineA);
          ctx.beginPath(); ctx.moveTo(-halfLen, 0); ctx.lineTo(halfLen, 0); ctx.stroke();
          ctx.restore();
        }

        // Sweeping tapered calligraphic crescent arc across bell
        if (sElap < 0.68) {
          const cp = sElap / 0.68;
          const ca = Math.max(0, 1 - cp);
          ctx.save();
          ctx.translate(cx, bellY);
          ctx.rotate(CUT_ANGLE);
          drawTaperedCrescent(ctx, 0, 0, 132 + cp * 62, -1.05, 1.05, 15 * ca, '#fef9c3', `rgba(245, 158, 11, ${(ca * 0.88).toFixed(2)})`);
          ctx.restore();
        }

        // Broken Blade exits smoothly to upper-right along the cut vector, leaving luminous steel afterimages
        if (sElap < 1.65) {
          const travelP = Math.min(1, sElap / 0.22);
          const easeOut = 1 - Math.pow(1 - travelP, 3);
          const fadeP = sElap < 0.95 ? 1 : Math.max(0, 1 - (sElap - 0.95) / 0.70);
          const fwdDist = 145 + easeOut * 115 + sElap * 24;
          const bx2 = cx + cosC * fwdDist;
          const by2 = bellY + sinC * fwdDist;
          if (sElap < 0.45) {
            const trA = (1 - sElap / 0.45) * 0.36 * stageAlpha;
            drawIntroBrokenBlade(ctx, cx - cosC * 40, bellY - sinC * 40, CUT_ANGLE, 1.18, 1.0, true, trA * 0.65);
            drawIntroBrokenBlade(ctx, cx + cosC * 65, bellY + sinC * 65, CUT_ANGLE, 1.18, 1.0, true, trA);
          }
          drawIntroBrokenBlade(ctx, bx2, by2, CUT_ANGLE, 1.18, 1.0, true, fadeP * stageAlpha);
        }
      }
    }

    // 6. Sonic Resonance Rings, Fractured Bronze Shards & Molten Sparks
    for (let i = 0; i < _intro.rings.length; i++) {
      const rg = _intro.rings[i];
      const prog = 1 - rg.life / rg.maxLife;
      const rad = rg.r + (rg.maxR - rg.r) * (1 - Math.pow(1 - prog, 3));
      ctx.save();
      ctx.strokeStyle = rg.col;
      ctx.globalAlpha = Math.max(0, (1 - prog) * 0.78 * smoothFade);
      ctx.lineWidth = rg.lw * (1 - prog) + 0.8;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    for (let i = 0; i < _intro.shards.length; i++) {
      const s = _intro.shards[i];
      const a = Math.max(0, Math.min(1, s.life / 0.6)) * smoothFade;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = '#241c14';
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-s.sz, -s.sz * 0.5); ctx.lineTo(s.sz * 0.9, -s.sz * 0.2);
      ctx.lineTo(s.sz * 0.3, s.sz * 0.8); ctx.lineTo(-s.sz * 0.6, s.sz * 0.5);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    for (let i = 0; i < _intro.sparks.length; i++) {
      const p = _intro.sparks[i];
      const a = Math.max(0, Math.min(1, p.life / 0.65)) * smoothFade;
      ctx.fillStyle = p.col === 'white'
        ? `rgba(255, 252, 235, ${a.toFixed(2)})`
        : p.col === 'cyan'
          ? `rgba(125, 211, 252, ${a.toFixed(2)})`
          : `rgba(253, 224, 71, ${a.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore(); // End Camera Push-in & Shake Space

    // 7. Crisp Impact Flash right at Blade Cleave (3.55s .. 3.74s)
    if (curT >= SLASH_TIME && curT < SLASH_TIME + 0.20) {
      const fp = (curT - SLASH_TIME) / 0.20;
      const fa = (1 - fp) * 0.42;
      ctx.fillStyle = fp < 0.35 ? `rgba(255, 252, 235, ${fa.toFixed(3)})` : `rgba(245, 158, 11, ${(fa * 0.7).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }

    // 8. Theatrical Cinema Letterbox Bars (smoothly enter 0..0.6s, retract 5.4..6.6s)
    const barIn = Math.min(1, curT / 0.65);
    const barOut = curT < 5.4 ? 1 : Math.max(0, 1 - (curT - 5.4) / 1.15);
    const barH = Math.round(Math.min(72, h * 0.095) * barIn * barOut);
    if (barH > 1) {
      ctx.fillStyle = '#030407';
      ctx.fillRect(0, 0, w, barH);
      ctx.fillRect(0, h - barH, w, barH);
      ctx.strokeStyle = `rgba(245, 158, 11, ${(0.28 * barOut).toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, barH + 0.5); ctx.lineTo(w, barH + 0.5);
      ctx.moveTo(0, h - barH - 0.5); ctx.lineTo(w, h - barH - 0.5);
      ctx.stroke();
    }

    // 9. Two-Act Poetic Calligraphy Subtitles
    ctx.save();
    ctx.textAlign = 'center';
    // Act I line (0.45s .. 3.25s)
    if (curT >= 0.45 && curT < 3.35) {
      const a1 = Math.min(1, (curT - 0.45) / 0.65) * (curT > 2.65 ? Math.max(0, 1 - (curT - 2.65) / 0.65) : 1) * smoothFade;
      if (a1 > 0.02) {
        ctx.globalAlpha = a1;
        ctx.fillStyle = COLORS.parchment;
        ctx.font = getCanvasFont(Math.max(13, Math.round((isEn() ? 18 : 22) * Math.min(1, fitScale + 0.12))), false);
        ctx.fillText(t('intro.line1'), cx, Math.min(h - barH - 14, cy + Math.round(166 * fitScale)));
      }
    }
    // Act III line after bell splits (3.90s .. 6.15s)
    if (curT >= 3.90 && curT < 6.45) {
      const a2 = Math.min(1, (curT - 3.90) / 0.55) * (curT > 5.45 ? Math.max(0, 1 - (curT - 5.45) / 0.95) : 1) * smoothFade;
      if (a2 > 0.02) {
        ctx.globalAlpha = a2;
        ctx.fillStyle = '#fef08a';
        const subY1 = Math.min(h - barH - 32, cy + Math.round(156 * fitScale));
        ctx.font = getCanvasFont(Math.max(14, Math.round((isEn() ? 20 : 24) * Math.min(1, fitScale + 0.10))), true);
        ctx.fillText(t('intro.act2Line'), cx, subY1);
        const a2Sub = Math.min(1, Math.max(0, (curT - 4.35) / 0.55)) * a2 * 0.88;
        if (a2Sub > 0.02) {
          ctx.globalAlpha = a2Sub;
          ctx.fillStyle = '#bae6fd';
          ctx.font = getCanvasFont(Math.max(11, Math.round((isEn() ? 12.5 : 13.5) * Math.min(1, fitScale + 0.12))), false);
          ctx.fillText(t('intro.line2'), cx, Math.min(h - barH - 12, subY1 + Math.max(18, Math.round(28 * fitScale))));
        }
      }
    }
    ctx.restore();

    // 10. Subtle Skip Hint & Progress Hairline
    if (curT > 0.45 && curT < REVEAL_UI_TIME) {
      const ha = Math.min(0.68, (curT - 0.45) * 0.9) * smoothFade;
      ctx.save();
      ctx.globalAlpha = ha;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#9ca3af';
      ctx.font = getCanvasFont(11.5, false);
      ctx.fillText(t('intro.skipHint'), w - 28, h - Math.max(20, barH * 0.36));
      ctx.restore();
    }

    ctx.restore();
  }

  // Smooth Ink-Curtain Scene Fade when entering world from title screen
  if (_fade.active) {
    const half = _fade.dur * 0.45;
    const alpha = _fade.t < half
      ? Math.min(1, _fade.t / half)
      : Math.max(0, 1 - (_fade.t - half) / (_fade.dur - half));
    ctx.save();
    ctx.fillStyle = `rgba(4, 6, 10, ${alpha.toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
