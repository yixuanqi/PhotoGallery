// Art-First Visual Gallery Renderer for Weapon Codex & Bestiary (v40.1, 0 external images)
// Snapshots actual in-game procedural dark-ink enemy & boss renderers onto cached high-res portrait canvases!
import { COLORS } from '../config.js';
import { G } from '../state.js';
import { updateCloak } from '../vfx.js';
import {
  makeSentinel, makeWraith, makeGolem, makePriest, makeDuelist, makeLeech, makeDummy,
  makeFalcon, makeFungus, makeFrostguard, makeDrowned, makeAnchorite, makeWardenWind, makeWardenForest, makeWardenMountain,
  createBoss, createBoss2, createBoss3, createBoss4
} from '../entities.js';
import { drawEnemy } from '../render/enemyRenderer.js';
import { drawBoss, drawBoss2, drawBoss3, drawBoss4 } from '../render/bossRenderer.js';

// ==================== A. LARGE BESPOKE HERO SVG ARTWORK FOR ALL 3 WEAPONS ====================
const WEAPON_HERO_SVGS = {
  blade: `<svg class="wcodex-hero-svg" viewBox="0 0 240 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="whBladeBg" cx="52%" cy="48%" r="64%">
        <stop offset="0%" stop-color="#3c2810" stop-opacity="0.72"/>
        <stop offset="55%" stop-color="#141a28" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#070a10"/>
      </radialGradient>
      <linearGradient id="whSteel" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#94a3b8"/>
        <stop offset="55%" stop-color="#f1f5f9"/>
        <stop offset="100%" stop-color="#fef08a"/>
      </linearGradient>
    </defs>
    <rect width="240" height="150" fill="url(#whBladeBg)"/>
    <!-- Pale moon halo & calligraphic slash arc -->
    <circle cx="122" cy="70" r="46" fill="none" stroke="rgba(253, 224, 71, 0.22)" stroke-width="1.4" stroke-dasharray="5 5"/>
    <path d="M 28 118 Q 108 18 214 38" fill="none" stroke="rgba(253, 224, 71, 0.34)" stroke-width="10" stroke-linecap="round"/>
    <path d="M 28 118 Q 108 18 214 38" fill="none" stroke="#fef9c3" stroke-width="2.2" stroke-linecap="round"/>
    <!-- Broken Ashen Blade diagonal silhouette with signature notched edge -->
    <path d="M 64 106 L 178 24 L 194 26 L 175 46 L 166 44 L 158 55 L 78 116 Z" fill="url(#whSteel)" stroke="#090c12" stroke-width="2.2"/>
    <path d="M 74 107 L 176 31" stroke="#fde047" stroke-width="1.6" opacity="0.85"/>
    <!-- Crossguard & bronze bell pommel -->
    <path d="M 55 96 L 86 124 L 80 130 L 49 102 Z" fill="#2d2010" stroke="#fde047" stroke-width="1.6"/>
    <path d="M 62 114 L 40 132" stroke="#644a2a" stroke-width="7" stroke-linecap="round"/>
    <circle cx="37" cy="134" r="5.5" fill="#1e170e" stroke="#fde047" stroke-width="1.6"/>
    <!-- Golden ink sparks -->
    <circle cx="188" cy="46" r="2.4" fill="#fef08a"/>
    <circle cx="152" cy="92" r="1.9" fill="#f59e0b"/>
    <circle cx="96" cy="42" r="1.6" fill="#38bdf8"/>
  </svg>`,

  hammer: `<svg class="wcodex-hero-svg" viewBox="0 0 240 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="whHamBg" cx="50%" cy="54%" r="65%">
        <stop offset="0%" stop-color="#6b2b0e" stop-opacity="0.78"/>
        <stop offset="58%" stop-color="#191314" stop-opacity="0.96"/>
        <stop offset="100%" stop-color="#07090d"/>
      </radialGradient>
      <linearGradient id="whBronze" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#78350f"/>
        <stop offset="50%" stop-color="#d97706"/>
        <stop offset="100%" stop-color="#451a03"/>
      </linearGradient>
    </defs>
    <rect width="240" height="150" fill="url(#whHamBg)"/>
    <!-- Shockwave ground fissures -->
    <ellipse cx="120" cy="126" rx="88" ry="13" fill="none" stroke="rgba(245, 158, 11, 0.45)" stroke-width="2"/>
    <ellipse cx="120" cy="126" rx="56" ry="7" fill="none" stroke="#fef08a" stroke-width="1.5" opacity="0.7"/>
    <!-- Long iron-bound haft -->
    <path d="M 44 128 L 154 52" stroke="#7c5e3a" stroke-width="9" stroke-linecap="round"/>
    <path d="M 44 128 L 154 52" stroke="#18120c" stroke-width="2" stroke-dasharray="8 8"/>
    <!-- Massive Cracked Bronze Bell-Maul Head -->
    <g transform="translate(150 56) rotate(-35)">
      <path d="M -28 -34 L 28 -34 L 38 22 Q 0 34 -38 22 Z" fill="url(#whBronze)" stroke="#fde047" stroke-width="2.2"/>
      <path d="M -20 -16 L 20 -16 M -26 4 L 26 4" stroke="#451a03" stroke-width="2.4" opacity="0.7"/>
      <!-- Glowing molten fracture vein -->
      <path d="M -6 -28 L 4 -6 L -8 10 L 6 24" fill="none" stroke="#fef9c3" stroke-width="2.4"/>
      <circle cx="0" cy="24" r="6" fill="#fef08a" stroke="#b45309" stroke-width="1.8"/>
    </g>
    <!-- Flying forge embers -->
    <circle cx="72" cy="48" r="2.3" fill="#fde047"/>
    <circle cx="196" cy="96" r="2.1" fill="#f59e0b"/>
    <circle cx="114" cy="30" r="1.7" fill="#fb923c"/>
  </svg>`,

  bell: `<svg class="wcodex-hero-svg" viewBox="0 0 240 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="whBellBg" cx="55%" cy="48%" r="64%">
        <stop offset="0%" stop-color="#0e4f6e" stop-opacity="0.78"/>
        <stop offset="56%" stop-color="#0f1726" stop-opacity="0.96"/>
        <stop offset="100%" stop-color="#06090f"/>
      </radialGradient>
    </defs>
    <rect width="240" height="150" fill="url(#whBellBg)"/>
    <!-- Concentric cyan soul-resonance ripples -->
    <circle cx="152" cy="64" r="52" fill="none" stroke="rgba(56, 189, 248, 0.25)" stroke-width="2"/>
    <circle cx="152" cy="64" r="35" fill="none" stroke="rgba(186, 230, 253, 0.45)" stroke-width="1.8"/>
    <circle cx="152" cy="64" r="20" fill="rgba(56, 189, 248, 0.22)"/>
    <!-- Crooked wooden Spirit-Calling Bell Staff -->
    <path d="M 46 132 L 138 38 Q 162 16 176 38" fill="none" stroke="#8c6844" stroke-width="6.5" stroke-linecap="round"/>
    <path d="M 138 38 Q 162 16 176 38" fill="none" stroke="#fde047" stroke-width="1.8"/>
    <!-- Suspended Soul-Calling Bronze Bell -->
    <line x1="162" y1="32" x2="162" y2="48" stroke="#fde047" stroke-width="2"/>
    <path d="M 149 48 L 175 48 L 184 78 Q 162 86 140 78 Z" fill="#182738" stroke="#38bdf8" stroke-width="2.2"/>
    <path d="M 154 58 L 170 58" stroke="#fde047" stroke-width="1.6"/>
    <circle cx="162" cy="83" r="6" fill="#bae6fd" stroke="#38bdf8" stroke-width="1.8"/>
    <!-- Homing spirit darts orbiting -->
    <circle cx="92" cy="48" r="3.2" fill="#38bdf8"/>
    <circle cx="204" cy="44" r="2.8" fill="#bae6fd"/>
    <circle cx="198" cy="104" r="2.6" fill="#fde047"/>
  </svg>`,

  locked: `<svg class="wcodex-hero-svg" viewBox="0 0 240 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="240" height="150" fill="#090d16"/>
    <circle cx="120" cy="75" r="42" fill="none" stroke="rgba(148, 163, 184, 0.28)" stroke-width="1.8" stroke-dasharray="6 5"/>
    <text x="120" y="88" text-anchor="middle" fill="rgba(148, 163, 184, 0.45)" font-size="40" font-weight="700" font-family="Georgia, serif">?</text>
  </svg>`
};

export function getWeaponHeroSvg(id, unlocked = true) {
  if (!unlocked) return WEAPON_HERO_SVGS.locked;
  return WEAPON_HERO_SVGS[id] || WEAPON_HERO_SVGS.blade;
}

// ==================== B. CACHED IN-GAME CANVAS PORTRAIT STUDIO FOR ALL 17 MONSTERS & BOSSES ====================
const _portraitCache = new Map();

const PORTRAIT_THEMES = {
  sentinel:        { bg0: '#192233', bg1: '#090d15', accent: '#cbd5e1', scale: 1.80, offY: 6 },
  wraith:          { bg0: '#102c3d', bg1: '#070c14', accent: '#38bdf8', scale: 1.85, offY: -6, flying: true },
  golem:           { bg0: '#2d2214', bg1: '#0b0c12', accent: '#f59e0b', scale: 1.55, offY: 6 },
  priest:          { bg0: '#231936', bg1: '#090a14', accent: '#c084fc', scale: 1.75, offY: 6 },
  duelist:         { bg0: '#2f1420', bg1: '#0a0b12', accent: '#f87171', scale: 1.72, offY: 6 },
  leech:           { bg0: '#221433', bg1: '#080912', accent: '#a855f7', scale: 1.95, offY: -10, flying: true },
  dummy:           { bg0: '#2e2212', bg1: '#0a0c12', accent: '#fde047', scale: 1.65, offY: 8 },
  falcon:          { bg0: '#122c3f', bg1: '#070c15', accent: '#7dd3fc', scale: 1.85, offY: -8, flying: true },
  fungus:          { bg0: '#0f2f2b', bg1: '#060e10', accent: '#6ee7b7', scale: 1.68, offY: 6 },
  frostguard:      { bg0: '#162844', bg1: '#080d18', accent: '#bae6fd', scale: 1.60, offY: 6 },
  drowned:         { bg0: '#0b2d42', bg1: '#060c14', accent: '#38bdf8', scale: 1.72, offY: 6 },
  anchorite:       { bg0: '#1b2638', bg1: '#070b12', accent: '#94a3b8', scale: 1.48, offY: 8 },
  warden_wind:     { bg0: '#133147', bg1: '#070e18', accent: '#7dd3fc', scale: 1.38, offY: 6 },
  warden_forest:   { bg0: '#10322c', bg1: '#060f11', accent: '#6ee7b7', scale: 1.24, offY: 8 },
  warden_mountain: { bg0: '#192a48', bg1: '#080c17', accent: '#bae6fd', scale: 1.34, offY: 6 },
  boss:            { bg0: '#3a1420', bg1: '#0b0810', accent: '#f87171', scale: 1.18, offY: 8 },
  boss2:           { bg0: '#45200e', bg1: '#0c080a', accent: '#f59e0b', scale: 1.16, offY: -2 },
  boss3:           { bg0: '#3e1828', bg1: '#0a0710', accent: '#fde047', scale: 1.08, offY: 8 },
  boss4:           { bg0: '#1c243a', bg1: '#070910', accent: '#fde047', scale: 1.16, offY: 8 }
};

function buildPortraitEntity(kind) {
  let ent = null;
  if (kind === 'sentinel') ent = makeSentinel('p_s', 0, 0, -40, 40);
  else if (kind === 'wraith') ent = makeWraith('p_w', 0, 0);
  else if (kind === 'golem') ent = makeGolem('p_g', 0, 0, -40, 40);
  else if (kind === 'priest') ent = makePriest('p_p', 0, 0);
  else if (kind === 'duelist') ent = makeDuelist('p_d', 0, 0, -40, 40);
  else if (kind === 'leech') { ent = makeLeech('p_l', 0, 0); ent.state = 'hover'; }
  else if (kind === 'dummy') { ent = makeDummy('p_dm', 0, 0, -30, 30); ent.active = true; }
  else if (kind === 'falcon') ent = makeFalcon('p_f', 0, 0);
  else if (kind === 'fungus') ent = makeFungus('p_fg', 0, 0, -40, 40);
  else if (kind === 'frostguard') ent = makeFrostguard('p_fr', 0, 0, -40, 40);
  else if (kind === 'drowned') ent = makeDrowned('p_dr', 0, 0, -40, 40);
  else if (kind === 'anchorite') ent = makeAnchorite('p_an', 0, 0, -40, 40);
  else if (kind === 'warden_wind') ent = makeWardenWind('p_ww', 0, 0);
  else if (kind === 'warden_forest') ent = makeWardenForest('p_wf', 0, 0);
  else if (kind === 'warden_mountain') ent = makeWardenMountain('p_wm', 0, 0);
  else if (kind === 'boss') ent = createBoss();
  else if (kind === 'boss2') ent = createBoss2();
  else if (kind === 'boss3') ent = createBoss3();
  else if (kind === 'boss4') { ent = createBoss4(false); ent.stance = 'blade'; }
  if (!ent) return null;

  ent.alive = true;
  ent.awake = false;
  ent.facing = 1;
  ent.x = -ent.w * 0.5;
  ent.y = -ent.h;
  ent.homeX = ent.x;
  ent.minX = ent.x - 16;
  ent.maxX = ent.x + 16;
  ent.grounded = true;
  ent.vx = 0;
  ent.vy = 0;
  ent.hp = ent.maxHp;
  ent.posture = 0;
  ent.hurtFlash = 0;
  ent.squashX = 1;
  ent.squashY = 1;
  ent.recoilLean = 0;
  ent.hitFreezeTimer = 0;
  if (ent.kind === 'boss2') ent.shieldUp = false;
  if (ent.cloak) {
    const cx = ent.x + ent.w * 0.5 - ent.facing * 8;
    const cy = ent.y + Math.min(28, ent.h * 0.35);
    for (let k = 0; k < 8; k++) updateCloak(ent.cloak, cx, cy, ent.facing, -55, 0.032);
  }
  return ent;
}

export function getBestiaryPortraitDataUrl(kind, seen = true) {
  const key = `${kind}:${seen ? 1 : 0}`;
  if (_portraitCache.has(key)) return _portraitCache.get(key);

  const w = 240;
  const h = 168;
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext('2d');
  const th = PORTRAIT_THEMES[kind] || PORTRAIT_THEMES.sentinel;

  // 1. Atmospheric Dark-Ink Portrait Backdrop
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.44, 8, w * 0.5, h * 0.5, w * 0.65);
  bg.addColorStop(0, seen ? th.bg0 : '#141926');
  bg.addColorStop(1, seen ? th.bg1 : '#06080e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Faint halo ring & ink horizon plinth
  ctx.save();
  ctx.strokeStyle = seen ? th.accent : 'rgba(148, 163, 184, 0.22)';
  ctx.globalAlpha = seen ? 0.22 : 0.16;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(w * 0.5, h * 0.45, 56, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  const floorY = h - 22;
  ctx.fillStyle = 'rgba(5, 7, 12, 0.72)';
  ctx.fillRect(0, floorY, w, h - floorY);
  ctx.strokeStyle = seen ? th.accent : 'rgba(148, 163, 184, 0.25)';
  ctx.globalAlpha = 0.42;
  ctx.beginPath(); ctx.moveTo(16, floorY); ctx.lineTo(w - 16, floorY); ctx.stroke();
  ctx.restore();

  // 2. Render Actual Procedural Entity on Isolated Layer (allows clean pitch-ink silhouette when locked!)
  const ent = buildPortraitEntity(kind);
  if (ent) {
    const spr = document.createElement('canvas');
    spr.width = w;
    spr.height = h;
    const sctx = spr.getContext('2d');
    const prevCtx = G.ctx;
    const prevTime = G.globalTime;
    try {
      G.ctx = sctx;
      G.globalTime = 1.65;
      sctx.save();
      const baseY = th.flying ? (h * 0.62 + (th.offY || 0)) : (floorY + (th.offY || 0));
      sctx.translate(w * 0.5, baseY);
      sctx.scale(th.scale || 1.5, th.scale || 1.5);
      if (kind === 'boss') drawBoss(ent);
      else if (kind === 'boss2') drawBoss2(ent);
      else if (kind === 'boss3') drawBoss3(ent);
      else if (kind === 'boss4') drawBoss4(ent);
      else drawEnemy(ent);
      sctx.restore();
    } finally {
      G.ctx = prevCtx;
      G.globalTime = prevTime;
    }

    if (!seen) {
      // Mask entity sprite into mysterious dark ink silhouette!
      sctx.save();
      sctx.globalCompositeOperation = 'source-atop';
      sctx.fillStyle = '#070a12';
      sctx.fillRect(0, 0, w, h);
      sctx.restore();
      ctx.save();
      ctx.shadowColor = 'rgba(148, 163, 184, 0.55)';
      ctx.shadowBlur = 10;
      ctx.drawImage(spr, 0, 0);
      ctx.restore();
      ctx.fillStyle = 'rgba(216, 207, 184, 0.52)';
      ctx.font = 'bold 34px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', w * 0.5, h * 0.46);
    } else {
      ctx.drawImage(spr, 0, 0);
    }
  }

  // Soft vignette frame edge
  ctx.strokeStyle = seen ? 'rgba(216, 207, 184, 0.20)' : 'rgba(148, 163, 184, 0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  const url = cvs.toDataURL('image/png');
  _portraitCache.set(key, url);
  return url;
}
