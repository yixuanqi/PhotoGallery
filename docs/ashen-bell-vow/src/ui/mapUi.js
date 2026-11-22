// Minimap Fast Blit, Zoomable/Draggable Parchment Map, Ink Pins & Click-to-Warp (split from src/ui.js in v32.0)
import {
  COLORS, RELICS, RELIC_SYNERGIES, VOW_CONSTRAINTS, DUMMY_MODES, SMITH_UPGRADES, ACTION_META, ROOMS, SOLIDS, ALTARS, NPCS, LORE_TABLETS, PICKUPS_DEF, ENEMIES_DEF, BOSSES_DEF,
  SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_ENTRY_GATE_DEF, FOUNDRY_EXIT_GATE_DEF, SKY_BRIDGE_GATE_DEF, FIRST_BELL_CORE_POS, VOID_BARRIERS,
  ABYSSAL_RIVERS, WIND_ZONES, BOUNCE_PADS, WORLD_MIN_X, WORLD_MIN_Y, WORLD_W, WORLD_H, WORLD_SPAN_W, WORLD_SPAN_H, FLOOR_Y, WELL_BOTTOM_Y,
  MAP_COLS, MAP_ROWS, MAP_CELL_W, MAP_CELL_H, ECHO_GRADE_ORDER, SEVEN_BELLS_ORDER
} from '../config.js';
import { getRoomAt, getZoneLabelAt, getPreviewSpawnRoomId, getPreviewSpawnCoords, getRoomSpawnPoint } from '../levelLoader.js';
import {
  G, createFreshWorldState, getActiveAltar, getActiveSynergies, getRelicStats, getActiveVowStats, getCombatScaling, getEquippedRelicLabel, getActiveWeaponId, getActiveWeapon, isWeaponUnlocked, getUnlockedWeaponIds, unlockWeapon,
  isWeaponTraitUnlocked, getActiveWeaponTraitId, unlockWeaponTrait, setActiveWeaponTrait,
  ensureNpcQuests, hasKeeperBlessing,
  getPlayerMaxHp, getPlayerMaxSoul, getPlayerMaxFlasks, getPlayerMaxSeals,
  markMapExplored, getExplorationPercent, createLanterns,
  createResonancePuzzles, createCrumblePlatforms, getAwakeBoss, getHudBoss, isBoss4Unlocked, isSkyBridgeOpen, clearOutcomeTimer, triggerBossBanner, setTextFast
} from '../state.js';
import { audio } from '../audio.js';
import {
  isActionHeld, syncHelpModalText, getActionKeyLabel, startKeyCapture, cancelKeyCapture, triggerHaptic
} from '../input.js';
import { isPickupUnlocked, equipWeapon } from '../combat.js';
import { spawnParticles, spawnShockwave, spawnFloatText } from '../vfx.js';
import { snapCameraToPlayer } from '../world.js';
import { createPlayer, createSentinels, createBoss, createBoss2, createBoss3, createBoss4, makeWardenWind, makeWardenForest, makeWardenMountain } from '../entities.js';
import { readSaveData, listSaveSlots, deleteSaveSlot, saveProgress, applySaveData, saveUserSettings } from '../save.js';
import {
  t, getLocale, isEn, getLocaleVersion, getCanvasFont,
  locZoneName, locRoomName, locAltar, locTablet, locPickup, locNpcName,
  locRelic, locSynergy, locSmithUpgrade, locVow, locBestiary, locAchievement,
  locPin, locBoss, locDummyMode, locActionLabel, getEndingScript
} from '../i18n.js';
import { SLOT_EMBLEMS, getRelicEmblemSvg, getBestiaryEmblemSvg, getWeaponEmblemSvg } from '../emblems.js';
import { WEAPON_ORDER, WEAPONS, WEAPON_FORGE_TRAIT_COST, getWeaponForgeTraits, getWeaponUltimateDef } from '../weapons.js';
import { prof } from '../profiler.js';
import {
  BESTIARY_ENTRIES, ACHIEVEMENTS_DEF, MAP_PIN_TYPES, ensureCodexState,
  recordTabletRead, recordSynergyDiscovered, checkAchievements, getRoomCollectibleStats
} from '../codex.js';
import { HUD_DOM, uiHooks, openModal, closeModal } from './uiShared.js';

let _miniStaticCanvas = null;

export function renderHudMinimapFast(rebuildStatic = false) {
  const dst = HUD_DOM.minimapCanvas;
  if (!dst || !G.worldState) return;
  if (!_miniStaticCanvas || _miniStaticCanvas.width !== dst.width || _miniStaticCanvas.height !== dst.height) {
    _miniStaticCanvas = document.createElement('canvas');
    _miniStaticCanvas.width = dst.width;
    _miniStaticCanvas.height = dst.height;
    rebuildStatic = true;
  }
  if (rebuildStatic) {
    renderParchmentMap(_miniStaticCanvas, false, true);
  }
  const mctx = dst.getContext('2d');
  mctx.clearRect(0, 0, dst.width, dst.height);
  mctx.drawImage(_miniStaticCanvas, 0, 0);
  if (G.player) {
    const padX = 5, padTop = 4, padBot = 4;
    const sx = (dst.width - padX * 2) / WORLD_SPAN_W;
    const sy = (dst.height - padTop - padBot) / WORLD_SPAN_H;
    const px = padX + ((G.player.x + G.player.w * 0.5) - WORLD_MIN_X) * sx;
    const py = padTop + ((G.player.y + G.player.h * 0.5) - WORLD_MIN_Y) * sy;
    mctx.fillStyle = '#ffffff';
    mctx.beginPath();
    mctx.arc(px, py, 2.6, 0, Math.PI * 2);
    mctx.fill();
  }
}

const mapView = { zoom: 1.0, panX: 0, panY: 0, minZoom: 1.0, maxZoom: 3.2 };
let hoveredAltarId = null;

function clampMapPan(canvas) {
  if (!canvas) return;
  const w = canvas.width;
  const h = canvas.height;
  const padX = 16, padTop = 22, padBot = 20;
  const baseW = w - padX * 2;
  const baseH = h - padTop - padBot;
  const scaledW = baseW * mapView.zoom;
  const scaledH = baseH * mapView.zoom;
  const maxPanX = Math.max(0, scaledW - baseW);
  const maxPanY = Math.max(0, scaledH - baseH);
  mapView.panX = Math.max(-maxPanX, Math.min(0, mapView.panX));
  mapView.panY = Math.max(-maxPanY, Math.min(0, mapView.panY));
}

function getMapProjection(canvas, detailed) {
  const w = canvas.width;
  const h = canvas.height;
  const padX = detailed ? 16 : 5;
  const padTop = detailed ? 22 : 4;
  const padBot = detailed ? 20 : 4;
  const baseW = w - padX * 2;
  const baseH = h - padTop - padBot;
  const zoom = detailed ? mapView.zoom : 1.0;
  if (detailed) clampMapPan(canvas);
  const sx = (baseW * zoom) / WORLD_SPAN_W;
  const sy = (baseH * zoom) / WORLD_SPAN_H;
  const ox = padX + (detailed ? mapView.panX : 0);
  const oy = padTop + (detailed ? mapView.panY : 0);
  return { w, h, padX, padTop, padBot, baseW, baseH, zoom, sx, sy, ox, oy };
}

function centerMapOnWorld(canvas, wx, wy, targetZoom = null) {
  if (!canvas) return;
  if (targetZoom !== null) mapView.zoom = Math.max(mapView.minZoom, Math.min(mapView.maxZoom, targetZoom));
  const w = canvas.width;
  const h = canvas.height;
  const padX = 16, padTop = 22, padBot = 20;
  const baseW = w - padX * 2;
  const baseH = h - padTop - padBot;
  const sx = (baseW * mapView.zoom) / WORLD_SPAN_W;
  const sy = (baseH * mapView.zoom) / WORLD_SPAN_H;
  mapView.panX = baseW * 0.5 - (wx - WORLD_MIN_X) * sx;
  mapView.panY = baseH * 0.5 - (wy - WORLD_MIN_Y) * sy;
  clampMapPan(canvas);
}

export function renderParchmentMap(targetCanvas, detailed = false, omitPlayer = false) {
  if (!targetCanvas || !G.worldState) return;
  const mctx = targetCanvas.getContext('2d');
  const proj = getMapProjection(targetCanvas, detailed);
  const { w, h, padX, padTop, baseW: mapW, baseH: mapH, sx, sy, ox, oy } = proj;
  const mx = wx => ox + (wx - WORLD_MIN_X) * sx;
  const my = wy => oy + (wy - WORLD_MIN_Y) * sy;

  mctx.clearRect(0, 0, w, h);

  // Parchment / Ink backdrop
  const bg = mctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, detailed ? '#231d15' : '#111520');
  bg.addColorStop(1, detailed ? '#120f0b' : '#080b12');
  mctx.fillStyle = bg;
  mctx.fillRect(0, 0, w, h);

  mctx.save();
  if (detailed) {
    mctx.beginPath();
    mctx.rect(padX, padTop, mapW, mapH);
    mctx.clip();
  }

  const focusRoomId = detailed ? (mapFocusedRoomId || G.currentRoomId || (ROOMS[0] && ROOMS[0].id)) : null;
  if (detailed && ROOMS.length > 0) {
    const BIOME_TINT = {
      wind:     'rgba(186, 230, 253, 0.08)',
      forest:   'rgba(110, 231, 183, 0.08)',
      mountain: 'rgba(191, 219, 254, 0.09)',
      foundry:  'rgba(245, 158, 11, 0.07)',
      chapel:   'rgba(248, 113, 113, 0.06)',
      crypt:    'rgba(167, 139, 250, 0.06)',
      heart:    'rgba(253, 224, 71, 0.07)'
    };
    mctx.font = getCanvasFont(isEn() ? 8.8 : 9.8, false);
    mctx.textAlign = 'center';
    for (const rm of ROOMS) {
      const b = rm.bounds;
      const rx = mx(b.x);
      const ry = my(b.y);
      const rw = b.w * sx;
      const rh = b.h * sy;
      const isFocus = rm.id === focusRoomId;
      const tint = BIOME_TINT[rm.theme];
      if (tint) {
        mctx.fillStyle = tint;
        mctx.fillRect(rx, ry, rw, rh);
      }
      if (isFocus) {
        mctx.fillStyle = 'rgba(245, 158, 11, 0.11)';
        mctx.fillRect(rx, ry, rw, rh);
      }
      mctx.strokeStyle = isFocus ? 'rgba(253, 224, 71, 0.72)' : 'rgba(216, 207, 184, 0.18)';
      mctx.lineWidth = isFocus ? 1.5 : 1;
      mctx.setLineDash(isFocus ? [] : [4, 4]);
      mctx.strokeRect(rx, ry, rw, rh);
      mctx.fillStyle = isFocus ? COLORS.goldBright : 'rgba(216, 207, 184, 0.76)';
      const rName = locRoomName(rm);
      const maxChars = rw < 78 ? (isEn() ? 10 : 5) : (isEn() ? 14 : 8);
      const shortLbl = rName.length > maxChars ? rName.slice(0, maxChars - 1) + '…' : rName;
      const lblY = ry + Math.min(13, Math.max(9, rh * 0.24));
      mctx.fillText(shortLbl, rx + rw * 0.5, lblY);
    }
    mctx.setLineDash([]);
    mctx.lineWidth = 1;
  }

  // 2D Explored Grid Backdrop (horizontal span-merged)
  const cellPxW = MAP_CELL_W * sx;
  const ch = MAP_CELL_H * sy + 0.6;
  mctx.fillStyle = detailed ? 'rgba(216, 207, 184, 0.08)' : 'rgba(216, 207, 184, 0.11)';
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = G.worldState.explored[r];
    const ry = oy + r * MAP_CELL_H * sy;
    let c = 0;
    while (c < MAP_COLS) {
      if (!row[c]) { c++; continue; }
      const start = c;
      while (c < MAP_COLS && row[c]) c++;
      mctx.fillRect(ox + start * cellPxW, ry, (c - start) * cellPxW + 0.6, ch);
    }
  }

  // Draw Solids (Clipped by explored 2D grid via fog pass below)
  for (const s of SOLIDS) {
    if (s.x < WORLD_MIN_X || s.x >= WORLD_W - 25) continue;
    mctx.fillStyle = s.type === 'ground'
      ? (detailed ? '#5c5242' : '#334155')
      : s.type === 'pillar'
        ? (detailed ? '#756854' : '#475569')
        : (detailed ? '#c8ba9b' : '#94a3b8');
    mctx.fillRect(mx(s.x), my(s.y), Math.max(2, s.w * sx), Math.max(2, s.h * sy));
  }

  // Abyssal Rivers, Wind Updrafts & Forest Spore Bounce Caps Accent
  mctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
  for (const rv of ABYSSAL_RIVERS) {
    if (rv.w <= 0) continue;
    mctx.fillRect(mx(rv.x), my(rv.y), rv.w * sx, Math.max(2, 16 * sy));
  }
  if (detailed && WIND_ZONES.length > 0) {
    mctx.fillStyle = 'rgba(186, 230, 253, 0.16)';
    for (const wz of WIND_ZONES) {
      mctx.fillRect(mx(wz.x), my(wz.y), Math.max(2, wz.w * sx), Math.max(3, wz.h * sy));
    }
  }
  if (detailed && BOUNCE_PADS.length > 0) {
    mctx.fillStyle = '#6ee7b7';
    for (const bp of BOUNCE_PADS) {
      mctx.beginPath();
      mctx.arc(mx(bp.x), my(bp.y - 10), 2.5, 0, Math.PI * 2);
      mctx.fill();
    }
  }

  // Gates
  const gx1 = mx(SHORTCUT_GATE_DEF.x);
  const gy1 = my(SHORTCUT_GATE_DEF.y);
  mctx.fillStyle = G.worldState.shortcutOpen ? 'rgba(245, 158, 11, 0.35)' : '#f59e0b';
  mctx.fillRect(gx1, gy1, Math.max(2.5, SHORTCUT_GATE_DEF.w * sx), Math.max(4, SHORTCUT_GATE_DEF.h * sy * (G.worldState.shortcutOpen ? 0.25 : 1)));

  const gx2 = mx(CHAPEL_EXIT_GATE_DEF.x);
  const gy2 = my(CHAPEL_EXIT_GATE_DEF.y);
  mctx.fillStyle = G.worldState.bossDefeated ? 'rgba(56, 189, 248, 0.35)' : COLORS.crimsonBright;
  mctx.fillRect(gx2, gy2, Math.max(2.5, CHAPEL_EXIT_GATE_DEF.w * sx), Math.max(4, CHAPEL_EXIT_GATE_DEF.h * sy * (G.worldState.bossDefeated ? 0.25 : 1)));

  // Breakable Ink Walls
  for (const sw of G.worldState.secretWalls) {
    if (sw.broken) continue;
    mctx.fillStyle = '#38bdf8';
    mctx.fillRect(mx(sw.x), my(sw.y), Math.max(2.5, sw.w * sx), Math.max(4, sw.h * sy));
  }

  // Void Barriers (violet vertical markers)
  for (const vb of VOID_BARRIERS) {
    mctx.fillStyle = G.worldState.abilities.shadeDash ? 'rgba(216, 180, 254, 0.58)' : '#a855f7';
    mctx.fillRect(mx(vb.x), my(vb.y), Math.max(2.6, vb.w * sx), Math.max(5, vb.h * sy));
  }

  // Crumbling Stone Platforms
  if (G.crumblePlatforms) {
    mctx.fillStyle = detailed ? 'rgba(245, 158, 11, 0.72)' : 'rgba(245, 158, 11, 0.6)';
    for (const cp of G.crumblePlatforms) {
      mctx.fillRect(mx(cp.x), my(cp.y), Math.max(2, cp.w * sx), Math.max(2, cp.h * sy));
    }
  }

  // Resonance Puzzle Bells
  if (G.resonancePuzzles) {
    for (const pz of G.resonancePuzzles) {
      mctx.fillStyle = pz.solved ? 'rgba(253, 224, 71, 0.45)' : '#f59e0b';
      for (const b of pz.bells) {
        mctx.beginPath();
        mctx.arc(mx(b.x), my(b.y), detailed ? 2.8 : 1.5, 0, Math.PI * 2);
        mctx.fill();
      }
    }
  }

  // Pickups
  for (const p of G.worldState.pickups) {
    if (p.collected) continue;
    const px = mx(p.x);
    const py = my(p.y - 24);
    mctx.fillStyle = p.kind === 'relic' ? COLORS.goldBright : COLORS.cyanBright;
    mctx.beginPath();
    mctx.arc(px, py, detailed ? 3.8 : 2.1, 0, Math.PI * 2);
    mctx.fill();
  }

  // NPCs (Warm amber diamond-scroll markers on explored parchment map)
  if (detailed) {
    for (const npc of NPCS) {
      const nx = mx(npc.x);
      const ny = my(npc.y - 26);
      mctx.fillStyle = npc.kind === 'keeper' ? '#e0f2fe' : '#fde047';
      mctx.strokeStyle = '#090c12';
      mctx.lineWidth = 1.1;
      mctx.beginPath();
      mctx.moveTo(nx, ny - 4.4); mctx.lineTo(nx + 4.0, ny); mctx.lineTo(nx, ny + 4.4); mctx.lineTo(nx - 4.0, ny);
      mctx.closePath();
      mctx.fill();
      mctx.stroke();
    }
  }

  // Altars (lit altars highlight on hover for direct Click-to-Warp!)
  for (const altar of ALTARS) {
    const lit = G.worldState.litAltars.has(altar.id);
    const isHover = detailed && lit && hoveredAltarId === altar.id;
    const ax = mx(altar.x);
    const ay = my(altar.y - 34);
    if (isHover) {
      mctx.strokeStyle = COLORS.goldBright;
      mctx.lineWidth = 2.0;
      mctx.beginPath();
      mctx.arc(ax, ay, 8.8, 0, Math.PI * 2);
      mctx.stroke();
    }
    mctx.fillStyle = isHover ? COLORS.goldBright : (lit ? COLORS.cyan : '#64748b');
    mctx.beginPath();
    mctx.arc(ax, ay, detailed ? (isHover ? 5.8 : 4.6) : 2.5, 0, Math.PI * 2);
    mctx.fill();
    if (detailed) {
      mctx.strokeStyle = lit ? COLORS.cyanBright : '#94a3b8';
      mctx.lineWidth = 1.2;
      mctx.stroke();
    }
  }

  // Foundry Entry Gate
  const gx3 = mx(FOUNDRY_ENTRY_GATE_DEF.x);
  const gy3 = my(FOUNDRY_ENTRY_GATE_DEF.y);
  mctx.fillStyle = G.worldState.abilities.doubleJump ? 'rgba(245, 158, 11, 0.35)' : COLORS.cyanBright;
  mctx.fillRect(gx3, gy3, Math.max(2.5, FOUNDRY_ENTRY_GATE_DEF.w * sx), Math.max(4, FOUNDRY_ENTRY_GATE_DEF.h * sy * (G.worldState.abilities.doubleJump ? 0.25 : 1)));

  // Foundry Exit Gate
  if (FOUNDRY_EXIT_GATE_DEF.w > 0) {
    const gx4 = mx(FOUNDRY_EXIT_GATE_DEF.x);
    const gy4 = my(FOUNDRY_EXIT_GATE_DEF.y);
    mctx.fillStyle = G.worldState.boss2Defeated ? 'rgba(245, 158, 11, 0.35)' : COLORS.crimsonBright;
    mctx.fillRect(gx4, gy4, Math.max(2.5, FOUNDRY_EXIT_GATE_DEF.w * sx), Math.max(4, FOUNDRY_EXIT_GATE_DEF.h * sy * (G.worldState.boss2Defeated ? 0.25 : 1)));
  }

  // High-Altitude Sky Bridge Gate (r13 <-> r17)
  if (SKY_BRIDGE_GATE_DEF.w > 0) {
    const gx5 = mx(SKY_BRIDGE_GATE_DEF.x);
    const gy5 = my(SKY_BRIDGE_GATE_DEF.y);
    const skyOpen = isSkyBridgeOpen();
    mctx.fillStyle = skyOpen ? 'rgba(186, 230, 253, 0.38)' : '#38bdf8';
    mctx.fillRect(gx5, gy5, Math.max(2.5, SKY_BRIDGE_GATE_DEF.w * sx), Math.max(4, SKY_BRIDGE_GATE_DEF.h * sy * (skyOpen ? 0.25 : 1)));
  }

  // Data-Driven Main Boss Markers (from BOSSES_DEF)
  const bossDefsList = Object.values(BOSSES_DEF);
  for (let i = 0; i < bossDefsList.length; i++) {
    const bd = bossDefsList[i];
    const defeated = bd.id === 'boss_hui' ? !!G.worldState.bossDefeated
      : bd.id === 'boss_ji' ? !!G.worldState.boss2Defeated
      : bd.id === 'boss_yuan' ? !!G.worldState.boss3Defeated : false;
    const bx = mx(bd.x + 28);
    const by = my(bd.y + 44);
    mctx.fillStyle = defeated ? (bd.id === 'boss_yuan' ? COLORS.goldBright : 'rgba(245, 158, 11, 0.58)') : COLORS.crimsonBright;
    mctx.beginPath();
    mctx.arc(bx, by, detailed ? (bd.id === 'boss_yuan' ? 5.6 : 5.0) : 2.9, 0, Math.PI * 2);
    mctx.fill();
  }

  // Biome Warden Mini-Boss Markers (朔 / 枯 / 凛, data-driven from ENEMIES_DEF)
  const slainMinis = G.worldState.defeatedMiniBosses;
  for (let i = 0; i < ENEMIES_DEF.length; i++) {
    const ed = ENEMIES_DEF[i];
    if (!ed.kind || !ed.kind.startsWith('warden_')) continue;
    const wx = mx(ed.x + 22);
    const wy = my(ed.y + 36);
    const slain = !!(slainMinis && slainMinis.has(ed.id));
    mctx.fillStyle = slain ? 'rgba(245, 158, 11, 0.65)' : COLORS.crimsonBright;
    mctx.beginPath();
    mctx.arc(wx, wy, detailed ? 4.4 : 2.3, 0, Math.PI * 2);
    mctx.fill();
    if (detailed) {
      mctx.strokeStyle = slain ? COLORS.goldBright : '#fecaca';
      mctx.lineWidth = 1.1;
      mctx.stroke();
    }
  }

  // 2D Fog of War mask over unexplored grid cells (horizontal span-merged)
  mctx.fillStyle = detailed ? 'rgba(9, 8, 7, 0.9)' : 'rgba(6, 8, 13, 0.92)';
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = G.worldState.explored[r];
    const ry = oy + r * MAP_CELL_H * sy;
    let c = 0;
    while (c < MAP_COLS) {
      if (row[c]) { c++; continue; }
      const start = c;
      while (c < MAP_COLS && !row[c]) c++;
      mctx.fillRect(ox + start * cellPxW, ry, (c - start) * cellPxW + 0.6, ch);
    }
  }

  // Lost Echo Lantern Shade Marker (always visible above fog so corpse-run route is clear)
  if (G.worldState.lostEchoes && G.worldState.lostEchoes.amount > 0) {
    const lx = mx(G.worldState.lostEchoes.x);
    const ly = my(G.worldState.lostEchoes.y);
    const pulseL = 1 + Math.sin(G.globalTime * 7) * 0.25;
    const rL = (detailed ? 5.2 : 2.9) * pulseL;
    mctx.save();
    mctx.translate(lx, ly);
    mctx.rotate(Math.PI * 0.25);
    mctx.fillStyle = COLORS.cyanBright;
    mctx.strokeStyle = COLORS.goldBright;
    mctx.lineWidth = detailed ? 1.5 : 1;
    mctx.fillRect(-rL, -rL, rL * 2, rL * 2);
    mctx.strokeRect(-rL, -rL, rL * 2, rL * 2);
    mctx.restore();
  }

  // Per-Room Collectible Count Badges (only for explored rooms on detailed map)
  if (detailed && ROOMS.length > 0) {
    mctx.font = 'bold 9.5px ui-monospace, "Noto Serif SC", sans-serif';
    mctx.textAlign = 'right';
    for (let i = 0; i < ROOMS.length; i++) {
      const rm = ROOMS[i];
      const st = getRoomCollectibleStats(rm);
      if (!st || st.explorePct <= 0 || st.pickupsTotal <= 0) continue;
      const b = rm.bounds;
      const done = st.pickupsCollected >= st.pickupsTotal;
      const bx = mx(b.x + b.w) - 4;
      const by = my(b.y) + 12;
      const txt = done ? `★${st.pickupsTotal}/${st.pickupsTotal}` : `${st.pickupsCollected}/${st.pickupsTotal}`;
      mctx.fillStyle = 'rgba(8, 10, 16, 0.78)';
      mctx.fillRect(bx - 30, by - 9, 32, 12);
      mctx.fillStyle = done ? COLORS.goldBright : COLORS.cyanBright;
      mctx.fillText(txt, bx, by);
    }
  }

  // Player Custom Hand-Drawn Ink Pins (always visible above fog on both full map & minimap!)
  if (Array.isArray(G.worldState.mapPins) && G.worldState.mapPins.length > 0) {
    for (let i = 0; i < G.worldState.mapPins.length; i++) {
      const pin = G.worldState.mapPins[i];
      const px = mx(pin.x);
      const py = my(pin.y);
      drawMapInkPin(mctx, px, py, pin.type, detailed);
    }
  }

  // Live Player Marker (drawn on top of fog)
  if (!omitPlayer && G.player) {
    const px = mx(G.player.x + G.player.w / 2);
    const py = my(G.player.y + G.player.h / 2);
    const pulse = 1 + Math.sin(G.globalTime * 8) * 0.25;
    mctx.fillStyle = '#ffffff';
    mctx.beginPath();
    mctx.arc(px, py, (detailed ? 4.2 : 2.4) * pulse, 0, Math.PI * 2);
    mctx.fill();
    if (detailed) {
      mctx.strokeStyle = COLORS.goldBright;
      mctx.lineWidth = 1.4;
      mctx.stroke();
    }
  }

  mctx.restore(); // End map clip

  if (detailed) {
    if (hoveredAltarId && mapPinTool === 'inspect') {
      const ha = ALTARS.find(a => a.id === hoveredAltarId);
      if (ha && G.worldState.litAltars.has(ha.id)) {
        const ax = Math.max(padX + 70, Math.min(w - padX - 70, mx(ha.x)));
        const ay = Math.max(padTop + 18, my(ha.y - 34) - 14);
        const canWarpNow = !G.echoSession && !getAwakeBoss();
        const tip = canWarpNow ? t('map.warpTip', locAltar(ha, 'shortName')) : t('map.warpBlocked');
        mctx.save();
        mctx.font = getCanvasFont(10.5, true);
        const tw = Math.ceil(mctx.measureText(tip).width) + 16;
        mctx.fillStyle = 'rgba(8, 12, 20, 0.92)';
        mctx.strokeStyle = canWarpNow ? COLORS.goldBright : COLORS.crimsonBright;
        mctx.lineWidth = 1.2;
        mctx.fillRect(ax - tw * 0.5, ay - 13, tw, 19);
        mctx.strokeRect(ax - tw * 0.5, ay - 13, tw, 19);
        mctx.fillStyle = canWarpNow ? COLORS.goldBright : COLORS.crimsonBright;
        mctx.textAlign = 'center';
        mctx.fillText(tip, ax, ay);
        mctx.restore();
      }
    }
    mctx.strokeStyle = 'rgba(216, 207, 184, 0.35)';
    mctx.lineWidth = 1.2;
    mctx.strokeRect(padX, padTop, mapW, mapH);
    const litCount = G.worldState.litAltars.size;
    const secretCount = G.worldState.pickups.filter(p => p.collected).length;
    document.getElementById('map-modal-sub').textContent = t(
      'map.sub',
      getExplorationPercent(),
      litCount,
      ALTARS.length,
      secretCount,
      PICKUPS_DEF.length,
      G.worldState.abilities.doubleJump ? ` · ${t('hud.abilityWings')}` : '',
      G.worldState.abilities.shadeDash ? ` · ${t('hud.abilityShade')}` : '',
      G.worldState.bossDefeated ? t('map.subWellOpen') : ''
    );
    renderMapRoomDetail(focusRoomId);
  }
}

let mapPinTool = 'inspect'; // 'inspect' | 'wall' | 'barrier' | 'foe'
let mapFocusedRoomId = null;
let mapInteractionsBound = false;

function drawMapInkPin(mctx, x, y, type, detailed) {
  const col = type === 'wall' ? '#38bdf8' : type === 'barrier' ? '#c084fc' : '#f87171';
  mctx.save();
  mctx.translate(x, y);
  if (!detailed) {
    mctx.fillStyle = col;
    mctx.beginPath();
    mctx.arc(0, 0, 2.3, 0, Math.PI * 2);
    mctx.fill();
    mctx.restore();
    return;
  }
  // Crisp dark backing halo so pin pops over parchment & fog
  mctx.fillStyle = 'rgba(6, 9, 15, 0.88)';
  mctx.beginPath();
  mctx.arc(0, 0, 7.6, 0, Math.PI * 2);
  mctx.fill();
  mctx.strokeStyle = col;
  mctx.lineWidth = 1.6;
  if (type === 'wall') {
    // Cracked stone square pin
    mctx.strokeRect(-4.6, -4.6, 9.2, 9.2);
    mctx.beginPath();
    mctx.moveTo(-2, -4); mctx.lineTo(1, 0); mctx.lineTo(-1.5, 4);
    mctx.stroke();
  } else if (type === 'barrier') {
    // Violet void diamond seal pin
    mctx.beginPath();
    mctx.moveTo(0, -5.8); mctx.lineTo(5.2, 0); mctx.lineTo(0, 5.8); mctx.lineTo(-5.2, 0);
    mctx.closePath();
    mctx.fillStyle = 'rgba(168, 85, 247, 0.35)';
    mctx.fill();
    mctx.stroke();
  } else {
    // Crimson crossed danger pin
    mctx.beginPath();
    mctx.moveTo(-4.2, -4.2); mctx.lineTo(4.2, 4.2);
    mctx.moveTo(4.2, -4.2); mctx.lineTo(-4.2, 4.2);
    mctx.stroke();
    mctx.beginPath();
    mctx.arc(0, 0, 6.2, 0, Math.PI * 2);
    mctx.stroke();
  }
  mctx.restore();
}

function renderMapRoomDetail(roomId) {
  const el = document.getElementById('map-room-detail');
  if (!el) return;
  const rm = ROOMS.find(r => r.id === roomId) || ROOMS[0];
  if (!rm) { el.textContent = ''; return; }
  const st = getRoomCollectibleStats(rm);
  const rmName = locRoomName(rm);
  const zName = locZoneName(rm);
  const parts = [];
  if (!st || st.explorePct <= 0) {
    parts.push(`<strong class="mrd-name">${rmName}</strong>`, `<span>${t('map.roomUnvisited')}</span>`);
  } else {
    parts.push(`<strong class="mrd-name">${zName} · ${rmName}</strong>`);
    parts.push(`<span>${t('map.roomExplore', st.explorePct)}</span>`);
    if (st.pickupsTotal > 0) {
      const done = st.pickupsCollected >= st.pickupsTotal;
      parts.push(`<span class="${done ? 'mrd-done' : 'mrd-todo'}">${t('map.roomPickups', st.pickupsCollected, st.pickupsTotal, done ? ' ✓' : '')}</span>`);
    }
    if (st.altarsTotal > 0) parts.push(`<span>${t('map.roomAltars', st.altarsLit, st.altarsTotal)}</span>`);
    if (st.tabletsTotal > 0) parts.push(`<span>${t('map.roomTablets', st.tabletsRead, st.tabletsTotal)}</span>`);
    if (st.secretWallsLeft > 0) parts.push(`<span class="mrd-wall">${t('map.roomWalls', st.secretWallsLeft)}</span>`);
    if (st.barriersCount > 0 && G.worldState && !G.worldState.abilities.shadeDash) {
      parts.push(`<span class="mrd-barrier">${t('map.roomBarriers', st.barriersCount)}</span>`);
    }
  }
  const pinHint = mapPinTool === 'inspect' ? t('map.hintInspect') : t('map.hintPin');
  el.innerHTML = `<div class="mrd-stats">${parts.join('<span class="mrd-sep">·</span>')}</div><div class="mrd-hint">${pinHint}</div>`;
}

export function renderMapPinToolbar() {
  const bar = document.getElementById('map-pin-toolbar');
  if (!bar || !G.worldState) return;
  ensureCodexState();
  bar.innerHTML = '';

  const inspectBtn = document.createElement('button');
  inspectBtn.type = 'button';
  inspectBtn.className = `pin-tool-btn${mapPinTool === 'inspect' ? ' active' : ''}`;
  inspectBtn.textContent = t('map.btnInspect');
  inspectBtn.addEventListener('click', () => {
    mapPinTool = 'inspect';
    renderMapPinToolbar();
    renderParchmentMap(HUD_DOM.fullMapCanvas, true);
  });
  bar.appendChild(inspectBtn);

  for (const pt of MAP_PIN_TYPES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `pin-tool-btn pin-${pt.id}${mapPinTool === pt.id ? ' active' : ''}`;
    btn.title = locPin(pt, 'hint');
    btn.innerHTML = `<span class="pin-swatch" style="background:${pt.color};"></span><span>${t('map.btnPinSuffix', locPin(pt, 'label'))}</span>`;
    btn.addEventListener('click', () => {
      mapPinTool = mapPinTool === pt.id ? 'inspect' : pt.id;
      renderMapPinToolbar();
      renderParchmentMap(HUD_DOM.fullMapCanvas, true);
    });
    bar.appendChild(btn);
  }

  const pinCnt = G.worldState.mapPins.length;
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'pin-tool-btn pin-clear';
  clearBtn.disabled = pinCnt === 0;
  clearBtn.textContent = t('map.btnClearPins', pinCnt);
  clearBtn.addEventListener('click', () => {
    if (!G.worldState || G.worldState.mapPins.length === 0) return;
    G.worldState.mapPins = [];
    G.minimapDirty = true;
    saveProgress(false);
    renderMapPinToolbar();
    renderParchmentMap(HUD_DOM.fullMapCanvas, true);
    renderHudMinimapFast(true);
  });
  bar.appendChild(clearBtn);

  // Zoom & Pan Navigation Controls
  const sep = document.createElement('span');
  sep.className = 'pin-tool-sep';
  bar.appendChild(sep);

  const zoomOutBtn = document.createElement('button');
  zoomOutBtn.type = 'button';
  zoomOutBtn.className = 'pin-tool-btn';
  zoomOutBtn.textContent = '−';
  zoomOutBtn.title = t('map.zoomOutTip');
  zoomOutBtn.addEventListener('click', () => zoomMapAroundCenter(HUD_DOM.fullMapCanvas, mapView.zoom / 1.35));

  const zoomPill = document.createElement('span');
  zoomPill.className = 'map-zoom-pill';
  zoomPill.textContent = `${Math.round(mapView.zoom * 100)}%`;

  const zoomInBtn = document.createElement('button');
  zoomInBtn.type = 'button';
  zoomInBtn.className = 'pin-tool-btn';
  zoomInBtn.textContent = '+';
  zoomInBtn.title = t('map.zoomInTip');
  zoomInBtn.addEventListener('click', () => zoomMapAroundCenter(HUD_DOM.fullMapCanvas, mapView.zoom * 1.35));

  const focusBtn = document.createElement('button');
  focusBtn.type = 'button';
  focusBtn.className = 'pin-tool-btn';
  focusBtn.textContent = t('map.btnFocusPlayer');
  focusBtn.addEventListener('click', () => {
    if (G.player) centerMapOnWorld(HUD_DOM.fullMapCanvas, G.player.x + G.player.w * 0.5, G.player.y + G.player.h * 0.5, Math.max(1.8, mapView.zoom));
    mapFocusedRoomId = G.currentRoomId || mapFocusedRoomId;
    renderMapPinToolbar();
    renderParchmentMap(HUD_DOM.fullMapCanvas, true);
  });

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'pin-tool-btn';
  resetBtn.textContent = t('map.btnResetView');
  resetBtn.addEventListener('click', () => {
    mapView.zoom = 1.0;
    mapView.panX = 0;
    mapView.panY = 0;
    renderMapPinToolbar();
    renderParchmentMap(HUD_DOM.fullMapCanvas, true);
  });

  bar.append(zoomOutBtn, zoomPill, zoomInBtn, focusBtn, resetBtn);
  if (HUD_DOM.fullMapCanvas) {
    HUD_DOM.fullMapCanvas.classList.toggle('pin-mode', mapPinTool !== 'inspect');
  }
}

function zoomMapAroundCenter(canvas, nextZoom) {
  if (!canvas) return;
  const proj = getMapProjection(canvas, true);
  const midCx = proj.padX + proj.baseW * 0.5;
  const midCy = proj.padTop + proj.baseH * 0.5;
  zoomMapAtCanvasPoint(canvas, midCx, midCy, nextZoom);
}

function zoomMapAtCanvasPoint(canvas, cx, cy, nextZoom) {
  if (!canvas) return;
  const clamped = Math.max(mapView.minZoom, Math.min(mapView.maxZoom, nextZoom));
  const before = getMapProjection(canvas, true);
  const wx = WORLD_MIN_X + (cx - before.ox) / before.sx;
  const wy = WORLD_MIN_Y + (cy - before.oy) / before.sy;
  mapView.zoom = clamped;
  const afterSx = (before.baseW * mapView.zoom) / WORLD_SPAN_W;
  const afterSy = (before.baseH * mapView.zoom) / WORLD_SPAN_H;
  mapView.panX = (cx - before.padX) - (wx - WORLD_MIN_X) * afterSx;
  mapView.panY = (cy - before.padTop) - (wy - WORLD_MIN_Y) * afterSy;
  clampMapPan(canvas);
  renderMapPinToolbar();
  renderParchmentMap(canvas, true);
}

function mapEventToWorld(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * (canvas.width / Math.max(1, rect.width));
  const cy = (e.clientY - rect.top) * (canvas.height / Math.max(1, rect.height));
  const proj = getMapProjection(canvas, true);
  const wx = WORLD_MIN_X + (cx - proj.ox) / proj.sx;
  const wy = WORLD_MIN_Y + (cy - proj.oy) / proj.sy;
  return { cx, cy, wx, wy, ox: proj.ox, oy: proj.oy, sx: proj.sx, sy: proj.sy };
}

function findNearestMapPinIndex(cx, cy, ox, oy, sx, sy, maxPx = 15) {
  if (!G.worldState || !Array.isArray(G.worldState.mapPins)) return -1;
  let bestIdx = -1;
  let bestD = maxPx;
  for (let i = 0; i < G.worldState.mapPins.length; i++) {
    const p = G.worldState.mapPins[i];
    const px = ox + (p.x - WORLD_MIN_X) * sx;
    const py = oy + (p.y - WORLD_MIN_Y) * sy;
    const d = Math.hypot(cx - px, cy - py);
    if (d < bestD) { bestD = d; bestIdx = i; }
  }
  return bestIdx;
}

function findNearestLitAltar(cx, cy, ox, oy, sx, sy, maxPx = 14) {
  if (!G.worldState || !G.worldState.litAltars) return null;
  let best = null;
  let bestD = maxPx;
  for (let i = 0; i < ALTARS.length; i++) {
    const a = ALTARS[i];
    if (!G.worldState.litAltars.has(a.id)) continue;
    const ax = ox + (a.x - WORLD_MIN_X) * sx;
    const ay = oy + ((a.y - 34) - WORLD_MIN_Y) * sy;
    const d = Math.hypot(cx - ax, cy - ay);
    if (d < bestD) { bestD = d; best = a; }
  }
  return best;
}

export function initMapInteractions() {
  if (mapInteractionsBound) return;
  const cvs = HUD_DOM.fullMapCanvas;
  if (!cvs) return;
  mapInteractionsBound = true;

  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let panStartX = 0;
  let panStartY = 0;
  let dragMoved = 0;
  let suppressClick = false;

  cvs.addEventListener('wheel', e => {
    if (G.activeModal !== 'map' || !G.worldState) return;
    e.preventDefault();
    const pt = mapEventToWorld(cvs, e);
    const factor = e.deltaY < 0 ? 1.22 : 1 / 1.22;
    zoomMapAtCanvasPoint(cvs, pt.cx, pt.cy, mapView.zoom * factor);
  }, { passive: false });

  cvs.addEventListener('mousedown', e => {
    if (G.activeModal !== 'map' || !G.worldState || e.button !== 0) return;
    dragging = true;
    dragMoved = 0;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panStartX = mapView.panX;
    panStartY = mapView.panY;
    cvs.classList.add('dragging');
  });

  window.addEventListener('mousemove', e => {
    if (!dragging || G.activeModal !== 'map') return;
    const rect = cvs.getBoundingClientRect();
    const scaleX = cvs.width / Math.max(1, rect.width);
    const scaleY = cvs.height / Math.max(1, rect.height);
    const dx = (e.clientX - dragStartX) * scaleX;
    const dy = (e.clientY - dragStartY) * scaleY;
    dragMoved = Math.max(dragMoved, Math.hypot(dx, dy));
    if (mapView.zoom > 1.01) {
      mapView.panX = panStartX + dx;
      mapView.panY = panStartY + dy;
      clampMapPan(cvs);
      renderParchmentMap(cvs, true);
    }
  });

  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    cvs.classList.remove('dragging');
    if (dragMoved > 6 && mapView.zoom > 1.01) suppressClick = true;
  });

  cvs.addEventListener('mousemove', e => {
    if (dragging || G.activeModal !== 'map' || !G.worldState) return;
    const pt = mapEventToWorld(cvs, e);
    const rm = getRoomAt(pt.wx, pt.wy);
    let dirty = false;
    if (rm && rm.id !== mapFocusedRoomId) {
      mapFocusedRoomId = rm.id;
      dirty = true;
    }
    const nearAltar = mapPinTool === 'inspect' ? findNearestLitAltar(pt.cx, pt.cy, pt.ox, pt.oy, pt.sx, pt.sy, 14) : null;
    const nextHoverId = nearAltar ? nearAltar.id : null;
    if (nextHoverId !== hoveredAltarId) {
      hoveredAltarId = nextHoverId;
      cvs.classList.toggle('warp-hover', !!hoveredAltarId);
      dirty = true;
    }
    if (dirty) renderParchmentMap(cvs, true);
  });

  cvs.addEventListener('mouseleave', () => {
    if (hoveredAltarId) {
      hoveredAltarId = null;
      cvs.classList.remove('warp-hover');
      if (G.activeModal === 'map') renderParchmentMap(cvs, true);
    }
  });

  cvs.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (G.activeModal !== 'map' || !G.worldState) return;
    ensureCodexState();
    const pt = mapEventToWorld(cvs, e);
    const idx = findNearestMapPinIndex(pt.cx, pt.cy, pt.ox, pt.oy, pt.sx, pt.sy, 18);
    if (idx >= 0) {
      G.worldState.mapPins.splice(idx, 1);
      audio.playResonanceBell(330, false);
      G.minimapDirty = true;
      saveProgress(false);
      renderMapPinToolbar();
      renderParchmentMap(cvs, true);
      renderHudMinimapFast(true);
    }
  });

  cvs.addEventListener('click', e => {
    if (suppressClick) { suppressClick = false; return; }
    if (G.activeModal !== 'map' || !G.worldState) return;
    ensureCodexState();
    const pt = mapEventToWorld(cvs, e);
    const rm = getRoomAt(pt.wx, pt.wy);
    if (rm) mapFocusedRoomId = rm.id;

    if (mapPinTool === 'inspect') {
      const altarHit = findNearestLitAltar(pt.cx, pt.cy, pt.ox, pt.oy, pt.sx, pt.sy, 14);
      if (altarHit) {
        if (!G.echoSession && !getAwakeBoss()) {
          hoveredAltarId = null;
          cvs.classList.remove('warp-hover');
          G.worldState.activeAltarId = altarHit.id;
          saveProgress(false);
          uiHooks.respawnAtActiveAltar();
          audio.playBellToll();
          spawnFloatText(altarHit.x, altarHit.y - 84, t('altar.warpedToast', locAltar(altarHit, 'shortName')), COLORS.cyanBright, 18, 1.3);
          return;
        }
      }
      renderParchmentMap(cvs, true);
      return;
    }

    const hitIdx = findNearestMapPinIndex(pt.cx, pt.cy, pt.ox, pt.oy, pt.sx, pt.sy, 16);
    if (hitIdx >= 0) {
      G.worldState.mapPins.splice(hitIdx, 1);
      audio.playResonanceBell(330, false);
    } else if (pt.wx >= WORLD_MIN_X && pt.wx <= WORLD_W && pt.wy >= WORLD_MIN_Y && pt.wy <= WORLD_H) {
      if (G.worldState.mapPins.length >= 36) G.worldState.mapPins.shift();
      G.worldState.mapPins.push({
        id: `pin_${Date.now().toString(36)}`,
        x: Math.round(pt.wx),
        y: Math.round(pt.wy),
        type: mapPinTool
      });
      audio.playResonanceBell(523.25, false);
    }
    G.minimapDirty = true;
    saveProgress(false);
    renderMapPinToolbar();
    renderParchmentMap(cvs, true);
    renderHudMinimapFast(true);
  });
}


export function openMapModal() {
  if (G.gameState === 'dead' || G.gameState === 'victory' || G.gameState === 'title') return;
  if (G.activeModal === 'map') {
    closeModal('map');
    return;
  }
  initMapInteractions();
  hoveredAltarId = null;
  mapFocusedRoomId = G.currentRoomId || (ROOMS[0] && ROOMS[0].id) || null;
  const fullCvs = document.getElementById('fullMapCanvas');
  if (G.player && fullCvs) {
    centerMapOnWorld(fullCvs, G.player.x + G.player.w * 0.5, G.player.y + G.player.h * 0.5, 1.45);
  } else {
    mapView.zoom = 1.0; mapView.panX = 0; mapView.panY = 0;
  }
  openModal('map');
  renderMapPinToolbar();
  renderParchmentMap(fullCvs, true);
}

