// HUD synchronization, parchment map rendering, modals, altar/relics & Vow Echoes flow
import {
  COLORS, RELICS, RELIC_SYNERGIES, SMITH_UPGRADES, ACTION_META, ROOMS, SOLIDS, ALTARS, NPCS, LORE_TABLETS, PICKUPS_DEF,
  SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_ENTRY_GATE_DEF,
  ABYSSAL_RIVERS, WORLD_W, WORLD_H, FLOOR_Y, WELL_BOTTOM_Y,
  MAP_COLS, MAP_ROWS, MAP_CELL_W, MAP_CELL_H, ECHO_GRADE_ORDER
} from './config.js';
import { getRoomAt, getZoneLabelAt, getPreviewSpawnRoomId, getRoomSpawnPoint } from './levelLoader.js';
import {
  G, createFreshWorldState, getActiveAltar, getActiveSynergies, getRelicStats, getEquippedRelicLabel,
  getPlayerMaxHp, getPlayerMaxSoul, getPlayerMaxFlasks, getPlayerMaxSeals,
  markMapExplored, getExplorationPercent, createLanterns,
  createResonancePuzzles, createCrumblePlatforms, getAwakeBoss, clearOutcomeTimer
} from './state.js';
import { audio } from './audio.js';
import {
  isActionHeld, syncHelpModalText, getActionKeyLabel, startKeyCapture, cancelKeyCapture, triggerHaptic
} from './input.js';
import { isPickupUnlocked } from './combat.js';
import { spawnParticles, spawnShockwave, spawnFloatText } from './vfx.js';
import { createPlayer, createSentinels, createBoss, createBoss2 } from './entities.js';
import { readSaveData, listSaveSlots, deleteSaveSlot, saveProgress, applySaveData, saveUserSettings } from './save.js';
import { t, getLocale } from './i18n.js';

export const HUD_DOM = {
  hpReal: document.getElementById('hp-real'),
  hpGray: document.getElementById('hp-gray'),
  hpText: document.getElementById('hp-text'),
  relicTag: document.getElementById('relic-tag'),
  abilityTag: document.getElementById('ability-tag'),
  soulFill: document.getElementById('soul-fill'),
  soulText: document.getElementById('soul-text'),
  flaskWrap: document.getElementById('flask-pips'),
  sealWrap: document.getElementById('seal-pips'),
  echoesText: document.getElementById('echoes-text'),
  zoneEl: document.getElementById('zone-banner'),
  explorePct: document.getElementById('explore-pct'),
  minimapCanvas: document.getElementById('minimapCanvas'),
  fullMapCanvas: document.getElementById('fullMapCanvas'),
  bossHud: document.getElementById('boss-hud'),
  bossNameLabel: document.getElementById('boss-name-label'),
  bossHpFill: document.getElementById('boss-hp-fill'),
  bossPostureFill: document.getElementById('boss-posture-fill'),
  bossPhaseTag: document.getElementById('boss-phase-tag'),
  titleSaveInfo: document.getElementById('title-save-info'),
  btnContinue: document.getElementById('btn-continue'),
  btnStart: document.getElementById('btn-start'),
  fanSpell: document.getElementById('fan-spell'),
  fanSpellSub: document.getElementById('fan-spell-sub'),
  fanGrapple: document.getElementById('fan-grapple'),
  mobileInteract: document.getElementById('mobile-interact-btn')
};
const hudCache = {};

function formatPlayTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(r).padStart(2, '0')}s`;
}

export function refreshTitleSaveUI() {
  const slotsGrid = document.getElementById('save-slots-grid');
  if (slotsGrid) {
    slotsGrid.innerHTML = '';
    const slots = listSaveSlots();
    for (const item of slots) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `save-slot-card${G.activeSaveSlot === item.slot ? ' active' : ''}`;
      const head = document.createElement('div');
      head.className = 'save-slot-head';
      head.innerHTML = `<span>${t('slot.label', item.slot + 1)}</span><span>${item.data ? formatPlayTime(item.data.playTimeSec) : t('slot.empty')}</span>`;
      const meta = document.createElement('div');
      meta.className = 'save-slot-meta';
      if (item.data) {
        const altar = ALTARS.find(a => a.id === item.data.activeAltarId) || ALTARS[0];
        const pct = typeof item.data.explorePct === 'number' ? item.data.explorePct : 0;
        const bossCnt = (item.data.bossDefeated ? 1 : 0) + (item.data.boss2Defeated ? 1 : 0);
        meta.textContent = t('slot.summary', altar ? altar.shortName : 'Sanctuary', pct, bossCnt);
      } else {
        meta.textContent = t('slot.emptyDesc');
      }
      card.append(head, meta);
      card.addEventListener('click', () => {
        G.activeSaveSlot = item.slot;
        refreshTitleSaveUI();
      });
      if (item.data) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'save-slot-del';
        delBtn.textContent = t('slot.erase');
        delBtn.addEventListener('click', e => {
          e.stopPropagation();
          if (window.confirm(t('slot.confirmErase', item.slot + 1))) {
            deleteSaveSlot(item.slot);
          }
        });
        card.appendChild(delBtn);
      }
      slotsGrid.appendChild(card);
    }
  }

  const titleH1 = document.querySelector('#title-screen .game-title');
  const titleSub = document.querySelector('#title-screen .modal-sub');
  if (titleH1) titleH1.textContent = t('game.title');
  if (titleSub) titleSub.textContent = t('game.subtitle');
  const data = readSaveData();
  if (!HUD_DOM.btnContinue || !HUD_DOM.titleSaveInfo || !HUD_DOM.btnStart) return;
  HUD_DOM.btnContinue.textContent = t('btn.continue');
  if (data) {
    const altar = ALTARS.find(a => a.id === data.activeAltarId) || ALTARS[0];
    const pct = typeof data.explorePct === 'number' ? data.explorePct : 0;
    const relicCount = Array.isArray(data.unlockedRelics) ? data.unlockedRelics.length : 3;
    const bossTag = data.boss2Defeated ? ' · 2/2 Bosses' : data.bossDefeated ? ' · 1/2 Bosses' : '';
    const wingTag = data.abilities && data.abilities.doubleJump ? ' · InkWing' : '';
    HUD_DOM.titleSaveInfo.textContent = t('slot.selectedInfo', G.activeSaveSlot + 1, altar.shortName, pct, relicCount, RELICS.length, bossTag, wingTag);
    HUD_DOM.titleSaveInfo.style.display = 'block';
    HUD_DOM.btnContinue.style.display = 'inline-block';
    HUD_DOM.btnStart.textContent = t('btn.startOverwrite', G.activeSaveSlot + 1);
  } else {
    HUD_DOM.titleSaveInfo.style.display = 'none';
    HUD_DOM.btnContinue.style.display = 'none';
    HUD_DOM.btnStart.textContent = t('btn.startSlot', G.activeSaveSlot + 1);
  }
}

export function continueSavedGame() {
  if (!G.levelBundle) return;
  const data = readSaveData();
  if (!data) {
    startGame();
    return;
  }
  clearOutcomeTimer();
  applySaveData(data);
  G.stats = { parries: 0, executions: 0, damageTaken: 0, startTime: performance.now() };
  audio.init();
  const altar = getActiveAltar();
  G.player = createPlayer(altar.x - 14, altar.y - 54);
  respawnAtActiveAltar();
  spawnFloatText(altar.x, altar.y - 84, `续燃残誓 · ${altar.shortName}`, COLORS.cyanBright, 18, 1.3);
}

export function syncHUD(force = false) {
  if (!G.player) return;

  const realPctStr = Math.max(0, Math.min(100, (G.player.hp / G.player.maxHp) * 100)).toFixed(1) + '%';
  const totalPctStr = Math.max(0, Math.min(100, ((G.player.hp + G.player.grayHp) / G.player.maxHp) * 100)).toFixed(1) + '%';
  const hpTextStr = `${Math.ceil(G.player.hp)} / ${G.player.maxHp}` + (G.player.grayHp >= 1 ? ` (+${Math.ceil(G.player.grayHp)} 内伤)` : '');
  const hasDoubleJump = !!(G.worldState && G.worldState.abilities.doubleJump);

  if (force || hudCache.realPctStr !== realPctStr) {
    hudCache.realPctStr = realPctStr;
    HUD_DOM.hpReal.style.width = realPctStr;
  }
  if (force || hudCache.totalPctStr !== totalPctStr) {
    hudCache.totalPctStr = totalPctStr;
    HUD_DOM.hpGray.style.width = totalPctStr;
  }
  if (force || hudCache.hpTextStr !== hpTextStr) {
    hudCache.hpTextStr = hpTextStr;
    HUD_DOM.hpText.textContent = hpTextStr;
  }
  const activeSyns = getActiveSynergies();
  const relicLabel = activeSyns.length > 0
    ? `${getEquippedRelicLabel()} ✦${activeSyns[0].name}`
    : getEquippedRelicLabel();
  if (force || hudCache.relicName !== relicLabel) {
    hudCache.relicName = relicLabel;
    HUD_DOM.relicTag.textContent = relicLabel;
  }
  if (force || hudCache.hasDoubleJump !== hasDoubleJump) {
    hudCache.hasDoubleJump = hasDoubleJump;
    HUD_DOM.abilityTag.classList.toggle('unlocked', hasDoubleJump);
  }

  const soulPctStr = Math.max(0, Math.min(100, (G.player.soul / G.player.maxSoul) * 100)).toFixed(1) + '%';
  const soulTextStr = `魂火 ${Math.floor(G.player.soul)}`;
  if (force || hudCache.soulPctStr !== soulPctStr) {
    hudCache.soulPctStr = soulPctStr;
    HUD_DOM.soulFill.style.width = soulPctStr;
  }
  if (force || hudCache.soulTextStr !== soulTextStr) {
    hudCache.soulTextStr = soulTextStr;
    HUD_DOM.soulText.textContent = soulTextStr;
  }

  const flaskWrap = HUD_DOM.flaskWrap;
  if (force || hudCache.maxFlasks !== G.player.maxFlasks || hudCache.flasks !== G.player.flasks) {
    hudCache.maxFlasks = G.player.maxFlasks;
    hudCache.flasks = G.player.flasks;
    if (flaskWrap.children.length !== G.player.maxFlasks) {
      flaskWrap.innerHTML = '';
      for (let i = 0; i < G.player.maxFlasks; i++) {
        const pip = document.createElement('div');
        pip.className = 'flask-pip';
        flaskWrap.appendChild(pip);
      }
    }
    for (let i = 0; i < G.player.maxFlasks; i++) {
      flaskWrap.children[i].classList.toggle('empty', i >= G.player.flasks);
    }
  }

  const echoesVal = G.worldState ? (G.worldState.echoes || 0) : 0;
  if (HUD_DOM.echoesText && (force || hudCache.echoesVal !== echoesVal)) {
    hudCache.echoesVal = echoesVal;
    HUD_DOM.echoesText.textContent = String(echoesVal);
  }

  const sealWrap = HUD_DOM.sealWrap;
  if (force || hudCache.maxSeals !== G.player.maxSeals || hudCache.seals !== G.player.seals) {
    hudCache.maxSeals = G.player.maxSeals;
    hudCache.seals = G.player.seals;
    if (sealWrap.children.length !== G.player.maxSeals) {
      sealWrap.innerHTML = '';
      for (let i = 0; i < G.player.maxSeals; i++) {
        const pip = document.createElement('div');
        pip.className = 'seal-pip';
        sealWrap.appendChild(pip);
      }
    }
    for (let i = 0; i < G.player.maxSeals; i++) {
      sealWrap.children[i].classList.toggle('active', i < G.player.seals);
    }
  }

  let zoneText;
  const curRoom = getRoomAt(G.player.x + G.player.w / 2, G.player.y + G.player.h / 2);
  if (curRoom) G.currentRoomId = curRoom.id;
  if (G.echoSession) {
    const echoName = G.echoSession.mode === 'rush'
      ? (G.echoSession.stage === 0 ? '双钟连战 (1/2 · 晦)' : '双钟连战 (2/2 · 寂)')
      : G.echoSession.mode === 'ji' ? '残誓回响 · 沉渊铸钟师' : '残誓回响 · 断钟骑士';
    zoneText = echoName;
  } else {
    zoneText = getZoneLabelAt(G.player.x + G.player.w / 2, G.player.y + G.player.h / 2);
  }

  if (force || hudCache.zoneText !== zoneText) {
    hudCache.zoneText = zoneText;
    HUD_DOM.zoneEl.textContent = zoneText;
  }

  const exploreText = `探索 ${getExplorationPercent()}%`;
  if (force || hudCache.exploreText !== exploreText) {
    hudCache.exploreText = exploreText;
    HUD_DOM.explorePct.textContent = exploreText;
  }

  if (force || G.minimapDirty || (G.globalTime - G.lastMinimapRenderTime >= 0.083)) {
    renderParchmentMap(HUD_DOM.minimapCanvas, false);
    G.minimapDirty = false;
    G.lastMinimapRenderTime = G.globalTime;
  }
  if (G.activeModal === 'map') {
    renderParchmentMap(HUD_DOM.fullMapCanvas, true);
  }

  const activeBoss = getAwakeBoss();
  const bossVisible = !!activeBoss;
  if (force || hudCache.bossVisible !== bossVisible) {
    hudCache.bossVisible = bossVisible;
    HUD_DOM.bossHud.classList.toggle('visible', bossVisible);
  }
  if (bossVisible) {
    const bossNameStr = G.echoSession ? `${activeBoss.name} · 回响` : activeBoss.name;
    const bossHpStr = `${Math.max(0, activeBoss.hp / activeBoss.maxHp * 100).toFixed(1)}%`;
    const bossPosStr = `${Math.max(0, activeBoss.posture / activeBoss.maxPosture * 100).toFixed(1)}%`;
    const bossPhaseStr = activeBoss.phase === 2 ? activeBoss.phase2Title : activeBoss.phase1Title;
    if (force || hudCache.bossNameStr !== bossNameStr) {
      hudCache.bossNameStr = bossNameStr;
      HUD_DOM.bossNameLabel.textContent = bossNameStr;
    }
    if (force || hudCache.bossHpStr !== bossHpStr) {
      hudCache.bossHpStr = bossHpStr;
      HUD_DOM.bossHpFill.style.width = bossHpStr;
    }
    if (force || hudCache.bossPosStr !== bossPosStr) {
      hudCache.bossPosStr = bossPosStr;
      HUD_DOM.bossPostureFill.style.width = bossPosStr;
    }
    if (force || hudCache.bossPhaseStr !== bossPhaseStr) {
      hudCache.bossPhaseStr = bossPhaseStr;
      HUD_DOM.bossPhaseTag.textContent = bossPhaseStr;
    }
  }

  // Reactive Mobile Fan Glow & Contextual Interact Button
  if (document.body.classList.contains('is-mobile')) {
    const rsMob = getRelicStats();
    const holdingUp = isActionHeld('up');
    const spellCostNow = holdingUp ? rsMob.quakeCost : rsMob.spellCost;
    const spellReady = G.player.soul >= spellCostNow;
    const spellSubTxt = holdingUp ? '钟鸣' : '灵刃';
    if (HUD_DOM.fanSpell && (force || hudCache.mobSpellReady !== spellReady)) {
      hudCache.mobSpellReady = spellReady;
      HUD_DOM.fanSpell.classList.toggle('ready-glow', spellReady);
      HUD_DOM.fanSpell.classList.toggle('dimmed', !spellReady);
    }
    if (HUD_DOM.fanSpellSub && (force || hudCache.mobSpellSub !== spellSubTxt)) {
      hudCache.mobSpellSub = spellSubTxt;
      HUD_DOM.fanSpellSub.textContent = spellSubTxt;
    }
    const grappleReady = !!(G.grapplePreviewTarget && G.player.grappleCd <= 0);
    if (HUD_DOM.fanGrapple && (force || hudCache.mobGrappleReady !== grappleReady)) {
      hudCache.mobGrappleReady = grappleReady;
      HUD_DOM.fanGrapple.classList.toggle('ready-glow', grappleReady);
    }
    if (HUD_DOM.mobileInteract) {
      let interactLabel = '';
      if (G.gameState === 'playing' && G.player.hp > 0) {
        const px = G.player.x + G.player.w / 2;
        const py = G.player.y + G.player.h;
        for (const altar of ALTARS) {
          if (Math.hypot(px - altar.x, py - altar.y) < 86) {
            const lit = !G.worldState || G.worldState.litAltars.has(altar.id);
            interactLabel = lit ? '歇息 · 祭坛' : '点燃祭坛';
            break;
          }
        }
        if (!interactLabel) {
          for (const npc of NPCS) {
            if (Math.hypot(px - npc.x, py - npc.y) < 88) {
              interactLabel = `锻造 · ${npc.name || '老铸钟匠'}`;
              break;
            }
          }
        }
        if (!interactLabel && G.worldState && !G.worldState.shortcutOpen && Math.hypot(px - SHORTCUT_GATE_DEF.leverX, py - SHORTCUT_GATE_DEF.leverY) < 76) {
          interactLabel = '拉动锁链';
        }
        if (!interactLabel) {
          for (const lt of LORE_TABLETS) {
            if (Math.hypot(px - lt.x, py - lt.y) < 78) {
              interactLabel = `研读 · ${lt.title}`;
              break;
            }
          }
        }
        if (!interactLabel && G.worldState) {
          for (const p of G.worldState.pickups) {
            if (!p.collected && isPickupUnlocked(p) && Math.hypot(px - p.x, py - p.y) < 72) {
              interactLabel = `拾取 · ${p.name}`;
              break;
            }
          }
        }
      }
      if (force || hudCache.mobInteractLabel !== interactLabel) {
        hudCache.mobInteractLabel = interactLabel;
        HUD_DOM.mobileInteract.classList.toggle('hidden', !interactLabel);
        if (interactLabel) HUD_DOM.mobileInteract.textContent = interactLabel;
      }
    }
  }
}

export function hideAllOverlays() {
  document.querySelectorAll('.overlay-screen').forEach(el => el.classList.add('hidden'));
  G.activeModal = null;
}

export function openModal(name) {
  if (G.gameState === 'dead' || G.gameState === 'victory') return;
  const modal = document.getElementById(`${name}-modal`);
  if (!modal) return;

  if (G.gameState !== 'modal') G.modalReturnState = G.gameState;
  hideAllOverlays();
  G.gameState = 'modal';
  G.activeModal = name;
  if (name === 'help') syncHelpModalText();
  if (name === 'settings') renderSettingsModal();
  const card = modal.querySelector('.modal-card');
  if (card) card.scrollTop = 0;
  modal.classList.remove('hidden');
}

export function closeModal(name = G.activeModal) {
  cancelKeyCapture();
  if (!name) return;
  const modal = document.getElementById(`${name}-modal`);
  if (modal) modal.classList.add('hidden');
  if (G.activeModal === name) G.activeModal = null;
  if (G.gameState === 'modal') {
    G.gameState = G.modalReturnState === 'title' ? 'title' : 'playing';
  }
}

export function renderParchmentMap(targetCanvas, detailed = false) {
  if (!targetCanvas || !G.worldState) return;
  const mctx = targetCanvas.getContext('2d');
  const w = targetCanvas.width;
  const h = targetCanvas.height;
  const padX = detailed ? 16 : 5;
  const padTop = detailed ? 22 : 4;
  const padBot = detailed ? 16 : 4;
  const mapW = w - padX * 2;
  const mapH = h - padTop - padBot;
  const sx = mapW / WORLD_W;
  const sy = mapH / WORLD_H;

  mctx.clearRect(0, 0, w, h);

  // Parchment / Ink backdrop
  const bg = mctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, detailed ? '#231d15' : '#111520');
  bg.addColorStop(1, detailed ? '#120f0b' : '#080b12');
  mctx.fillStyle = bg;
  mctx.fillRect(0, 0, w, h);

  if (detailed && ROOMS.length > 0) {
    mctx.strokeStyle = 'rgba(216, 207, 184, 0.16)';
    mctx.setLineDash([4, 4]);
    mctx.font = '11px "Noto Serif SC", serif';
    mctx.fillStyle = 'rgba(216, 207, 184, 0.74)';
    mctx.textAlign = 'center';
    for (const rm of ROOMS) {
      const b = rm.bounds;
      mctx.strokeRect(padX + b.x * sx, padTop + b.y * sy, b.w * sx, b.h * sy);
      mctx.fillText(rm.name, padX + (b.x + b.w * 0.5) * sx, 15);
    }
    mctx.setLineDash([]);
  }

  // 2D Explored Grid Backdrop
  const cw = MAP_CELL_W * sx + 0.6;
  const ch = MAP_CELL_H * sy + 0.6;
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (!G.worldState.explored[r][c]) continue;
      mctx.fillStyle = detailed ? 'rgba(216, 207, 184, 0.08)' : 'rgba(216, 207, 184, 0.11)';
      mctx.fillRect(padX + c * MAP_CELL_W * sx, padTop + r * MAP_CELL_H * sy, cw, ch);
    }
  }

  // Draw Solids (Clipped by explored 2D grid via fog pass below)
  for (const s of SOLIDS) {
    if (s.x < 0 || s.x >= WORLD_W - 25) continue;
    mctx.fillStyle = s.type === 'ground'
      ? (detailed ? '#5c5242' : '#334155')
      : s.type === 'pillar'
        ? (detailed ? '#756854' : '#475569')
        : (detailed ? '#c8ba9b' : '#94a3b8');
    mctx.fillRect(padX + s.x * sx, padTop + s.y * sy, Math.max(2, s.w * sx), Math.max(2, s.h * sy));
  }

  // Abyssal Rivers Accent
  mctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
  for (const rv of ABYSSAL_RIVERS) {
    if (rv.w <= 0) continue;
    mctx.fillRect(padX + rv.x * sx, padTop + rv.y * sy, rv.w * sx, Math.max(2, 16 * sy));
  }

  // Gates
  const gx1 = padX + SHORTCUT_GATE_DEF.x * sx;
  const gy1 = padTop + SHORTCUT_GATE_DEF.y * sy;
  mctx.fillStyle = G.worldState.shortcutOpen ? 'rgba(245, 158, 11, 0.35)' : '#f59e0b';
  mctx.fillRect(gx1, gy1, Math.max(2.5, SHORTCUT_GATE_DEF.w * sx), Math.max(4, SHORTCUT_GATE_DEF.h * sy * (G.worldState.shortcutOpen ? 0.25 : 1)));

  const gx2 = padX + CHAPEL_EXIT_GATE_DEF.x * sx;
  const gy2 = padTop + CHAPEL_EXIT_GATE_DEF.y * sy;
  mctx.fillStyle = G.worldState.bossDefeated ? 'rgba(56, 189, 248, 0.35)' : COLORS.crimsonBright;
  mctx.fillRect(gx2, gy2, Math.max(2.5, CHAPEL_EXIT_GATE_DEF.w * sx), Math.max(4, CHAPEL_EXIT_GATE_DEF.h * sy * (G.worldState.bossDefeated ? 0.25 : 1)));

  // Breakable Ink Walls
  for (const sw of G.worldState.secretWalls) {
    if (sw.broken) continue;
    mctx.fillStyle = '#38bdf8';
    mctx.fillRect(padX + sw.x * sx, padTop + sw.y * sy, Math.max(2.5, sw.w * sx), Math.max(4, sw.h * sy));
  }

  // Crumbling Stone Platforms
  if (G.crumblePlatforms) {
    mctx.fillStyle = detailed ? 'rgba(245, 158, 11, 0.72)' : 'rgba(245, 158, 11, 0.6)';
    for (const cp of G.crumblePlatforms) {
      mctx.fillRect(padX + cp.x * sx, padTop + cp.y * sy, Math.max(2, cp.w * sx), Math.max(2, cp.h * sy));
    }
  }

  // Resonance Puzzle Bells
  if (G.resonancePuzzles) {
    for (const pz of G.resonancePuzzles) {
      mctx.fillStyle = pz.solved ? 'rgba(253, 224, 71, 0.45)' : '#f59e0b';
      for (const b of pz.bells) {
        mctx.beginPath();
        mctx.arc(padX + b.x * sx, padTop + b.y * sy, detailed ? 2.8 : 1.5, 0, Math.PI * 2);
        mctx.fill();
      }
    }
  }

  // Pickups
  for (const p of G.worldState.pickups) {
    if (p.collected) continue;
    const px = padX + p.x * sx;
    const py = padTop + (p.y - 24) * sy;
    mctx.fillStyle = p.kind === 'relic' ? COLORS.goldBright : COLORS.cyanBright;
    mctx.beginPath();
    mctx.arc(px, py, detailed ? 3.8 : 2.1, 0, Math.PI * 2);
    mctx.fill();
  }

  // Altars
  for (const altar of ALTARS) {
    const lit = G.worldState.litAltars.has(altar.id);
    const ax = padX + altar.x * sx;
    const ay = padTop + (altar.y - 34) * sy;
    mctx.fillStyle = lit ? COLORS.cyan : '#64748b';
    mctx.beginPath();
    mctx.arc(ax, ay, detailed ? 4.6 : 2.5, 0, Math.PI * 2);
    mctx.fill();
    if (detailed) {
      mctx.strokeStyle = lit ? COLORS.cyanBright : '#94a3b8';
      mctx.lineWidth = 1.2;
      mctx.stroke();
    }
  }

  // Foundry Entry Gate
  const gx3 = padX + FOUNDRY_ENTRY_GATE_DEF.x * sx;
  const gy3 = padTop + FOUNDRY_ENTRY_GATE_DEF.y * sy;
  mctx.fillStyle = G.worldState.abilities.doubleJump ? 'rgba(245, 158, 11, 0.35)' : COLORS.cyanBright;
  mctx.fillRect(gx3, gy3, Math.max(2.5, FOUNDRY_ENTRY_GATE_DEF.w * sx), Math.max(4, FOUNDRY_ENTRY_GATE_DEF.h * sy * (G.worldState.abilities.doubleJump ? 0.25 : 1)));

  // Boss 1 Chapel Marker
  const bx = padX + 3320 * sx;
  const by = padTop + (FLOOR_Y - 56) * sy;
  mctx.fillStyle = G.worldState.bossDefeated ? 'rgba(245, 158, 11, 0.55)' : COLORS.crimsonBright;
  mctx.beginPath();
  mctx.arc(bx, by, detailed ? 5 : 2.8, 0, Math.PI * 2);
  mctx.fill();

  // Boss 2 Abyssal Foundry Marker
  const bx2 = padX + 6140 * sx;
  const by2 = padTop + (WELL_BOTTOM_Y - 110) * sy;
  mctx.fillStyle = G.worldState.boss2Defeated ? 'rgba(245, 158, 11, 0.55)' : COLORS.crimsonBright;
  mctx.beginPath();
  mctx.arc(bx2, by2, detailed ? 5 : 2.8, 0, Math.PI * 2);
  mctx.fill();

  // 2D Fog of War mask over unexplored grid cells
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (G.worldState.explored[r][c]) continue;
      mctx.fillStyle = detailed ? 'rgba(9, 8, 7, 0.9)' : 'rgba(6, 8, 13, 0.92)';
      mctx.fillRect(padX + c * MAP_CELL_W * sx, padTop + r * MAP_CELL_H * sy, cw, ch);
    }
  }

  // Live Player Marker (drawn on top of fog)
  if (G.player) {
    const px = padX + (G.player.x + G.player.w / 2) * sx;
    const py = padTop + (G.player.y + G.player.h / 2) * sy;
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

  if (detailed) {
    mctx.strokeStyle = 'rgba(216, 207, 184, 0.35)';
    mctx.lineWidth = 1.2;
    mctx.strokeRect(padX, padTop, mapW, mapH);
    const litCount = G.worldState.litAltars.size;
    const secretCount = G.worldState.pickups.filter(p => p.collected).length;
    document.getElementById('map-modal-sub').textContent =
      `晦渊全境 · 已探索 ${getExplorationPercent()}% · 祭坛 ${litCount}/${ALTARS.length} · 秘宝 ${secretCount}/${PICKUPS_DEF.length}` +
      (G.worldState.abilities.doubleJump ? ' · 已习得墨翼步' : '') +
      (G.worldState.bossDefeated ? ' · 钟井已通' : '');
  }
}

export function openSmithModal(npc) {
  const titleEl = document.getElementById('smith-modal-title');
  if (titleEl && npc && npc.name) titleEl.textContent = npc.name;
  renderSmithModal();
  audio.playResonanceBell(440, false);
  openModal('smith');
}

export function renderSmithModal() {
  if (!G.worldState) return;
  if (!G.worldState.smithUpgrades) G.worldState.smithUpgrades = { blade: 0, posture: 0, forge: 0 };
  const echoes = G.worldState.echoes || 0;
  const dlg = document.getElementById('smith-dialogue');
  if (dlg) {
    const u = G.worldState.smithUpgrades;
    if (G.worldState.boss2Defeated) {
      dlg.innerHTML = '“连沉渊炉底的寂鸣都归于静默了……你手中这柄断刃，已比昔日任何一口青铜圣钟都更清越。若想精进技艺，不妨在祭坛重召双钟回响。”';
    } else if (G.worldState.abilities.doubleJump) {
      dlg.innerHTML = '“我听见你衣袂间多了一缕墨翼风声。沉渊钟井西侧的<strong>井中悬坛背后</strong>，曾有一道我亲手封死的<strong>残钟地窖</strong>——那里藏着大批古钟残响，亦能直通礼拜堂前。”';
    } else if (G.worldState.bossDefeated) {
      dlg.innerHTML = '“晦的钟声停了……礼拜堂东侧已通往沉渊钟井。井中既有执盾铁卫，也有高台咏钟的<strong>敲钟祭司</strong>与<strong>连刃武者</strong>，把收集的残响交给我，我替你淬锋。”';
    } else if (u.blade + u.posture + u.forge > 0) {
      dlg.innerHTML = '“好锋口！听这铁砧回音，你的断刃已吃透残响。斩杀枯骨与怨灵皆会凝出残响，随时带回给我淬炼。”';
    } else {
      dlg.innerHTML = '“别靠火炉太近，人偶……我双眼虽盲，却听得出你腰间断刃尚存余温。去斩落回廊中的墨蚀亡魂，将逸散的<strong>「残响」</strong>带回此处，我为你重淬刀锋。”';
    }
  }

  const bar = document.getElementById('smith-echo-bar');
  if (bar) bar.textContent = `✦ 当前持有残响：${echoes}`;

  const list = document.getElementById('smith-upgrade-list');
  if (!list) return;
  list.innerHTML = '';
  for (const upg of SMITH_UPGRADES) {
    const lv = G.worldState.smithUpgrades[upg.id] || 0;
    const maxLv = upg.costs.length;
    const isMax = lv >= maxLv;
    const cost = isMax ? 0 : upg.costs[lv];
    const canBuy = !isMax && echoes >= cost;

    const card = document.createElement('div');
    card.className = 'smith-card';
    const info = document.createElement('div');
    info.className = 'smith-card-info';
    info.innerHTML = `
      <div class="smith-card-title">
        <span>${upg.name}</span>
        <span class="smith-lv-pill">Lv.${lv} / ${maxLv} · ${upg.bonusLabel(lv)}</span>
      </div>
      <div class="smith-card-desc">${upg.desc}</div>
    `;
    const btn = document.createElement('button');
    btn.className = 'smith-buy-btn';
    btn.disabled = !canBuy;
    btn.textContent = isMax ? '已臻化境' : `淬炼 · ${cost} 残响`;
    if (canBuy) {
      btn.addEventListener('click', () => {
        G.worldState.echoes -= cost;
        G.worldState.smithUpgrades[upg.id] = lv + 1;
        if (G.player) {
          G.player.maxHp = getPlayerMaxHp();
          G.player.hp = G.player.maxHp;
          G.player.maxSoul = getPlayerMaxSoul();
          G.player.soul = G.player.maxSoul;
        }
        audio.playParry(true, Math.min(4, lv + 2));
        triggerHaptic('shieldBreak', 0.9);
        saveProgress(true);
        renderSmithModal();
        syncHUD(true);
      });
    }
    card.append(info, btn);
    list.appendChild(card);
  }
}

export function openLoreModal(tablet) {
  document.getElementById('lore-modal-title').textContent = tablet.title;
  document.getElementById('lore-modal-sub').textContent = tablet.sub;
  document.getElementById('lore-modal-body').innerHTML = tablet.html;
  openModal('lore');
}

export function openPauseModal() {
  if (G.gameState !== 'playing') return;
  const pt = document.querySelector('#pause-modal .modal-title');
  if (pt) pt.textContent = t('pause.title');
  const sub = document.getElementById('pause-slot-sub');
  if (sub) {
    sub.textContent = t('pause.sub', G.activeSaveSlot + 1, getExplorationPercent(), formatPlayTime(G.playTimeSec));
  }
  openModal('pause');
}

export function returnToTitle() {
  clearOutcomeTimer();
  if (G.worldState) saveProgress(false);
  G.echoSession = null;
  hideAllOverlays();
  G.gameState = 'title';
  refreshTitleSaveUI();
  const titleEl = document.getElementById('title-screen');
  if (titleEl) titleEl.classList.remove('hidden');
}

export function openMapModal() {
  if (G.gameState === 'dead' || G.gameState === 'victory' || G.gameState === 'title') return;
  if (G.activeModal === 'map') {
    closeModal('map');
    return;
  }
  openModal('map');
  renderParchmentMap(document.getElementById('fullMapCanvas'), true);
}

export function renderSettingsModal() {
  const curLoc = getLocale();
  const bZh = document.getElementById('btn-lang-zh');
  const bEn = document.getElementById('btn-lang-en');
  if (bZh) bZh.classList.toggle('active', curLoc === 'zh-CN');
  if (bEn) bEn.classList.toggle('active', curLoc === 'en-US');
  const parryGroup = document.getElementById('assist-parry-group');
  if (parryGroup) {
    parryGroup.innerHTML = '';
    [
      { val: 1.0, label: '1.0x 标准' },
      { val: 1.35, label: '1.35x 宽裕' },
      { val: 1.7, label: '1.7x 护道' }
    ].forEach(opt => {
      const btn = document.createElement('button');
      btn.className = `seg-btn${G.settings.parryWindowMult === opt.val ? ' active' : ''}`;
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        G.settings.parryWindowMult = opt.val;
        saveUserSettings();
        renderSettingsModal();
      });
      parryGroup.appendChild(btn);
    });
  }

  const dmgGroup = document.getElementById('assist-dmg-group');
  if (dmgGroup) {
    dmgGroup.innerHTML = '';
    [
      { val: 1.0, label: '100% 标准' },
      { val: 0.7, label: '70% 减伤' },
      { val: 0.5, label: '50% 剧情' }
    ].forEach(opt => {
      const btn = document.createElement('button');
      btn.className = `seg-btn${G.settings.damageTakenMult === opt.val ? ' active' : ''}`;
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        G.settings.damageTakenMult = opt.val;
        saveUserSettings();
        renderSettingsModal();
      });
      dmgGroup.appendChild(btn);
    });
  }

  const syncSlider = (id, val) => {
    const pct = Math.round(Math.max(0, Math.min(1, val)) * 100);
    const inp = document.getElementById(id);
    const lbl = document.getElementById(`${id}-val`);
    if (inp) inp.value = String(pct);
    if (lbl) lbl.textContent = `${pct}%`;
  };
  syncSlider('vol-master', G.settings.masterVol);
  syncSlider('vol-music', G.settings.musicVol);
  syncSlider('vol-sfx', G.settings.sfxVol);

  const musBtn = document.getElementById('btn-music-toggle');
  if (musBtn) {
    const on = G.settings.musicEnabled !== false;
    musBtn.textContent = on ? '开' : '关';
    musBtn.classList.toggle('active', on);
  }

  const hapBtn = document.getElementById('btn-haptics-toggle');
  if (hapBtn) {
    hapBtn.textContent = G.settings.haptics ? '震动: 开' : '震动: 关';
    hapBtn.classList.toggle('active', !!G.settings.haptics);
  }

  const kbGrid = document.getElementById('keybind-grid');
  if (kbGrid) {
    kbGrid.innerHTML = '';
    for (const act of ACTION_META) {
      const row = document.createElement('div');
      row.className = 'keybind-item';
      const lbl = document.createElement('span');
      lbl.textContent = act.label;
      const btn = document.createElement('button');
      btn.className = 'keybind-btn';
      btn.textContent = getActionKeyLabel(act.id);
      btn.addEventListener('click', () => {
        kbGrid.querySelectorAll('.keybind-btn').forEach(b => b.classList.remove('listening'));
        btn.classList.add('listening');
        btn.textContent = '请按键...';
        startKeyCapture(act.id, (changed) => {
          if (changed) saveUserSettings();
          renderSettingsModal();
        });
      });
      row.append(lbl, btn);
      kbGrid.appendChild(row);
    }
  }
}

export function renderRelicChoices() {
  if (!Array.isArray(G.equippedRelics) || G.equippedRelics.length < 2) {
    G.equippedRelics = [G.currentRelic || RELICS[0], null];
  }
  const slotBar = document.getElementById('relic-slots-bar');
  if (slotBar) {
    slotBar.innerHTML = '';
    [0, 1].forEach(idx => {
      const r = G.equippedRelics[idx];
      const btn = document.createElement('button');
      btn.className = `relic-slot-pill${G.activeRelicSlot === idx ? ' active' : ''}`;
      btn.innerHTML = `<span class="slot-tag">${idx === 0 ? '主印' : '副印'}</span><span>${r ? r.name : '空置 · 点击下方铭刻'}</span>`;
      btn.addEventListener('click', () => {
        G.activeRelicSlot = idx;
        renderRelicChoices();
      });
      slotBar.appendChild(btn);
    });
  }

  // Render Dual-Relic Hidden Synergy Banner
  const synBox = document.getElementById('relic-synergy-box');
  if (synBox) {
    synBox.innerHTML = '';
    const activeSyns = getActiveSynergies();
    if (activeSyns.length > 0) {
      for (const syn of activeSyns) {
        const card = document.createElement('div');
        card.className = 'synergy-card';
        card.innerHTML = `<div class="synergy-title"><span>✦ 双印隐藏羁绊激活 · ${syn.name}</span></div><div class="synergy-desc">${syn.desc}</div>`;
        synBox.appendChild(card);
      }
    } else {
      const unlocked = G.worldState ? G.worldState.unlockedRelics : new Set(['thorn', 'mirror', 'ember']);
      const readyHints = RELIC_SYNERGIES
        .filter(s => s.relics.every(id => unlocked.has(id)))
        .map(s => {
          const names = s.relics.map(id => (RELICS.find(r => r.id === id) || {}).name || id);
          return `「${names[0]} + ${names[1]}」`;
        });
      const card = document.createElement('div');
      card.className = 'synergy-card empty';
      card.textContent = readyHints.length > 0
        ? `提示：同时铭刻特定双圣物可触发机制质变羁绊！当前已解锁组合：${readyHints.join('、')}`
        : '提示：同时铭刻特定双圣物可触发机制质变羁绊（共 4 组隐藏共鸣等待发掘）。';
      synBox.appendChild(card);
    }
  }

  const list = document.getElementById('relic-list');
  list.innerHTML = '';

  const lockedHints = {
    bellthread: '尚未发现。传闻藏于起点左侧高空的墨蚀壁龛之内，需以钩索攀跃并击碎裂纹暗墙。',
    bellcore: '尚未发现。传闻悬于第一区悬灯之上的苍穹残钟阁，唯有习得「墨翼步」方可踏足。',
    clapper: '尚未发现。需在枯骨长廊限时齐鸣三口青铜共鸣钟，震开封印钟笼。',
    ironheart: '尚未发现。需在沉渊钟井上层钟阁限时齐鸣三口青铜共鸣钟，解开钟笼封印。'
  };

  for (const relic of RELICS) {
    const unlocked = !relic.hidden || (G.worldState && G.worldState.unlockedRelics.has(relic.id));
    const eqSlot = unlocked ? G.equippedRelics.findIndex(r => r && r.id === relic.id) : -1;
    const card = document.createElement('div');
    card.className = `relic-card${eqSlot >= 0 ? ' equipped' : ''}${eqSlot === 1 ? ' equipped-sub' : ''}${unlocked ? '' : ' locked'}`;

    const name = document.createElement('div');
    name.className = 'relic-name';
    if (unlocked) {
      const tagHtml = eqSlot === 0 ? '<span class="relic-slot-badge primary">主印</span>' : eqSlot === 1 ? '<span class="relic-slot-badge secondary">副印</span>' : '';
      name.innerHTML = `<span>${relic.name}</span>${tagHtml}`;
    } else {
      name.textContent = '？？？ · 隐秘圣物';
    }
    const desc = document.createElement('div');
    desc.className = 'relic-desc';
    desc.textContent = unlocked ? relic.desc : (lockedHints[relic.id] || '尚未发现的隐秘圣物。');
    card.append(name, desc);

    if (unlocked) {
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-pressed', eqSlot >= 0 ? 'true' : 'false');
      const equip = () => {
        const curIdx = G.equippedRelics.findIndex(r => r && r.id === relic.id);
        if (curIdx === 1) {
          G.equippedRelics[1] = null;
          G.activeRelicSlot = 1;
        } else if (curIdx === 0) {
          G.activeRelicSlot = 0;
        } else {
          const targetSlot = G.equippedRelics[1] === null && G.activeRelicSlot === 0 && G.equippedRelics[0] !== null ? 1 : G.activeRelicSlot;
          G.equippedRelics[targetSlot] = relic;
          G.activeRelicSlot = targetSlot === 0 ? 1 : 0;
        }
        G.currentRelic = G.equippedRelics[0] || G.equippedRelics[1] || RELICS[0];
        if (!G.equippedRelics[0]) {
          G.equippedRelics[0] = G.currentRelic;
          if (G.equippedRelics[1] && G.equippedRelics[1].id === G.currentRelic.id) G.equippedRelics[1] = null;
        }
        if (G.player) {
          G.player.maxHp = getPlayerMaxHp();
          G.player.hp = G.player.maxHp;
          G.player.grayHp = 0;
          G.player.maxSoul = getPlayerMaxSoul();
          G.player.soul = G.player.maxSoul;
          G.player.maxFlasks = getPlayerMaxFlasks();
          G.player.flasks = G.player.maxFlasks;
          G.player.maxSeals = getPlayerMaxSeals();
          G.player.seals = Math.min(G.player.seals, G.player.maxSeals);
        }
        renderRelicChoices();
        saveProgress(false);
        syncHUD(true);
      };
      card.addEventListener('click', equip);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          equip();
        }
      });
    }
    list.appendChild(card);
  }

  // Render Fast-Travel Warp Buttons if multiple altars are lit
  const warpRow = document.getElementById('altar-warp-row');
  warpRow.innerHTML = '';
  if (G.worldState && G.worldState.litAltars.size > 1) {
    for (const altar of ALTARS) {
      if (!G.worldState.litAltars.has(altar.id) || altar.id === G.worldState.activeAltarId) continue;
      const btn = document.createElement('button');
      btn.className = 'warp-btn';
      btn.textContent = `提灯跃迁 → ${altar.shortName}`;
      btn.addEventListener('click', () => {
        G.worldState.activeAltarId = altar.id;
        saveProgress(false);
        respawnAtActiveAltar();
        audio.playBellToll();
        spawnFloatText(altar.x, altar.y - 84, `已跃迁至 ${altar.shortName}`, COLORS.cyanBright, 18, 1.2);
      });
      warpRow.appendChild(btn);
    }
  }

  // Render Vow Echoes (Boss Rematch & Boss Rush) Section
  const echoBox = document.getElementById('altar-echo-section');
  if (echoBox) {
    echoBox.innerHTML = '';
    const heading = document.createElement('div');
    heading.className = 'echo-heading';
    heading.innerHTML = '<span>残誓回响 · 往昔强敌重战</span><span style="font-size:10.5px;color:var(--parchment-dim);letter-spacing:1px;">零跑图 · 无伤评级</span>';
    echoBox.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'echo-grid';

    const echoDefs = [
      {
        mode: 'hui',
        title: '断钟骑士 · 晦',
        unlocked: !!(G.worldState && G.worldState.bossDefeated),
        lockHint: '击败断钟礼拜堂首领后解锁',
        sub: '断钟礼拜堂 · 单挑回响'
      },
      {
        mode: 'ji',
        title: '沉渊铸钟师 · 寂',
        unlocked: !!(G.worldState && G.worldState.boss2Defeated),
        lockHint: '击败沉渊铸钟殿首领后解锁',
        sub: '沉渊铸钟殿 · 立体机动战'
      },
      {
        mode: 'rush',
        title: '双钟连战 · 终试',
        unlocked: !!(G.worldState && G.worldState.bossDefeated && G.worldState.boss2Defeated),
        lockHint: '斩落双钟首领后开启终极连战',
        sub: '晦 → 寂 连续讨伐'
      }
    ];

    for (const def of echoDefs) {
      const btn = document.createElement('button');
      btn.className = 'echo-btn';
      btn.disabled = !def.unlocked;
      const rec = G.worldState && G.worldState.echoRecords ? G.worldState.echoRecords[def.mode] : null;
      const titleRow = document.createElement('div');
      titleRow.className = 'echo-btn-title';
      const titleSpan = document.createElement('span');
      titleSpan.textContent = def.unlocked ? def.title : `？？？ · ${def.title}`;
      titleRow.appendChild(titleSpan);
      if (def.unlocked && rec && rec.bestGrade) {
        const pill = document.createElement('span');
        pill.className = 'echo-grade-pill' + (rec.bestGrade === 'S+' ? ' splus' : '');
        pill.textContent = rec.bestGrade;
        titleRow.appendChild(pill);
      }
      const meta = document.createElement('div');
      meta.className = 'echo-btn-meta';
      if (!def.unlocked) {
        meta.textContent = def.lockHint;
      } else if (rec && typeof rec.bestTimeSec === 'number') {
        const m = Math.floor(rec.bestTimeSec / 60);
        const s = Math.floor(rec.bestTimeSec % 60).toString().padStart(2, '0');
        meta.textContent = `${def.sub} · 最快 ${m}:${s} (通关 ${rec.clears || 1} 次)`;
      } else {
        meta.textContent = `${def.sub} · 尚未留名`;
      }
      btn.append(titleRow, meta);
      if (def.unlocked) {
        btn.addEventListener('click', () => startEchoChallenge(def.mode));
      }
      grid.appendChild(btn);
    }
    echoBox.appendChild(grid);
  }

}

export function evaluateEchoGrade(mode, elapsedSec, dmgTaken) {
  if (dmgTaken === 0) return { code: 'S+', label: 'S+ · 无伤断誓' };
  const targetSec = mode === 'rush' ? 155 : 78;
  if (dmgTaken <= 30 && elapsedSec <= targetSec) return { code: 'S', label: 'S · 铁鸣宗师' };
  if (dmgTaken <= 80) return { code: 'A', label: 'A · 誓约克敌' };
  return { code: 'B', label: 'B · 浴墨胜出' };
}

export function setupEchoArena(stageBoss) {
  G.enemies = [];
  G.boss = createBoss();
  G.boss2 = createBoss2();
  G.lanterns = createLanterns();
  G.resonancePuzzles = createResonancePuzzles();
  G.crumblePlatforms = createCrumblePlatforms();
  G.bellQuakes = [];
  G.particles = [];
  G.slashes = [];
  G.shockwaves = [];
  G.impactBursts = [];
  G.hitMarks = [];
  G.floatTexts = [];
  G.afterimages = [];
  G.talismans = [];
  G.groundWaves = [];
  G.chapelTide = null;
  G.projectiles = [];
  G.hitstopTimer = 0;
  G.invertTimer = 0;
  G.screenFlash = { alpha: 0.18, color: COLORS.goldBright };

  if (stageBoss === 'hui') {
    G.boss.awake = true;
    G.boss2.alive = false;
    G.player = createPlayer(2780, FLOOR_Y - 54);
    G.cam = { x: Math.max(2620, Math.min(3780 - G.canvasW, 3100 - G.canvasW * 0.5)), y: 0, shake: 8, kickX: 0, kickY: 0, zoom: 1 };
    spawnFloatText(G.boss.x + G.boss.w / 2, G.boss.y - 40, '「残誓回响 · 断钟骑士·晦」', COLORS.goldBright, 24, 1.8);
  } else {
    G.boss.alive = false;
    G.boss2.awake = true;
    const keepFlasks = (G.echoSession && G.echoSession.mode === 'rush' && G.player) ? Math.min(getPlayerMaxFlasks(), G.player.flasks + 1) : getPlayerMaxFlasks();
    const keepHp = (G.echoSession && G.echoSession.mode === 'rush' && G.player) ? Math.min(G.player.maxHp, Math.max(50, G.player.hp + 45)) : 100;
    G.player = createPlayer(5710, WELL_BOTTOM_Y - 54);
    G.player.flasks = keepFlasks;
    G.player.hp = keepHp;
    G.cam = { x: Math.max(5556, Math.min(WORLD_W - G.canvasW, 6080 - G.canvasW * 0.5)), y: Math.max(780, WORLD_H - G.canvasH), shake: 8, kickX: 0, kickY: 0, zoom: 1 };
    spawnFloatText(G.boss2.x + G.boss2.w / 2, G.boss2.y - 44, '「残誓回响 · 沉渊铸钟师·寂」', COLORS.goldBright, 24, 1.8);
  }
  hideAllOverlays();
  G.minimapDirty = true;
  G.gameState = 'playing';
  audio.playBellToll();
  syncHUD(true);
}

export function startEchoChallenge(mode) {
  clearOutcomeTimer();
  G.echoSession = {
    mode,
    stage: 0,
    startTime: performance.now(),
    parries: 0,
    executions: 0,
    damageTaken: 0,
    returnAltarId: G.worldState ? G.worldState.activeAltarId : 'altar_start'
  };
  setupEchoArena(mode === 'ji' ? 'ji' : 'hui');
}

export function advanceEchoRushStage2() {
  if (!G.echoSession || G.echoSession.mode !== 'rush') return;
  setupEchoArena('ji');
}

export function interactWithAltar(altar) {
  if (!G.worldState) return;
  const firstLight = !G.worldState.litAltars.has(altar.id);
  G.worldState.litAltars.add(altar.id);
  G.worldState.activeAltarId = altar.id;
  document.getElementById('altar-modal-title').textContent = altar.shortName;
  if (firstLight) {
    spawnShockwave(altar.x, altar.y - 46, 130, COLORS.cyanBright, 4.5, 0.42);
    spawnParticles(altar.x, altar.y - 46, 30, { color: COLORS.cyanBright, speed: 220, spark: true, life: 0.6 });
    spawnFloatText(altar.x, altar.y - 96, `${altar.shortName}已点燃 · 重生点更新`, COLORS.cyanBright, 20, 1.5);
  }
  restAtAltar();
}

export function restAtAltar() {
  if (!G.player) return;
  clearOutcomeTimer();
  G.player.hp = G.player.maxHp;
  G.player.grayHp = 0;
  G.player.grayTimer = 0;
  G.player.soul = G.player.maxSoul;
  G.player.maxFlasks = getPlayerMaxFlasks();
  G.player.flasks = G.player.maxFlasks;
  G.player.maxSeals = getPlayerMaxSeals();
  G.player.seals = 0;
  G.player.vx = 0;
  G.player.vy = 0;
  G.player.hurtTimer = 0;
  G.player.iframeTimer = 0;
  G.player.parryActive = false;
  G.player.isCharging = false;
  G.player.attackTimer = 0;
  G.player.attackCd = 0;
  G.player.activeAttack = null;
  G.player.sealLunge = null;
  G.player.jumpBufTimer = 0;
  G.player.attackBufTimer = 0;
  G.player.parryBufTimer = 0;
  G.player.dashBufTimer = 0;
  G.player.castBufTimer = 0;
  G.player.grappleBufTimer = 0;
  G.player.sealBufTimer = 0;

  // Resting at the altar restores route enemies & lanterns while preserving world unlocks and slain Bosses.
  G.echoSession = null;
  G.enemies = createSentinels();
  G.boss = createBoss();
  G.boss2 = createBoss2();
  if (G.worldState && G.worldState.bossDefeated) G.boss.alive = false;
  if (G.worldState && G.worldState.boss2Defeated) G.boss2.alive = false;
  G.lanterns = createLanterns();
  G.resonancePuzzles = createResonancePuzzles();
  G.crumblePlatforms = createCrumblePlatforms();
  G.bellQuakes = [];
  G.projectiles = [];
  G.talismans = [];
  G.groundWaves = [];
  G.chapelTide = null;
  G.minimapDirty = true;
  saveProgress(true);
  renderRelicChoices();
  syncHUD(true);
  audio.playBellToll();
  openModal('altar');
}

export function respawnAtActiveAltar() {
  clearOutcomeTimer();
  if (!G.player || !G.worldState) {
    startGame();
    return;
  }
  G.echoSession = null;
  const altar = getActiveAltar();
  G.player = createPlayer(altar.x - 14, altar.y - 54);
  G.enemies = createSentinels();
  G.boss = createBoss();
  G.boss2 = createBoss2();
  if (G.worldState && G.worldState.bossDefeated) G.boss.alive = false;
  if (G.worldState && G.worldState.boss2Defeated) G.boss2.alive = false;
  G.lanterns = createLanterns();
  G.resonancePuzzles = createResonancePuzzles();
  G.crumblePlatforms = createCrumblePlatforms();
  G.bellQuakes = [];
  G.particles = [];
  G.slashes = [];
  G.shockwaves = [];
  G.impactBursts = [];
  G.hitMarks = [];
  G.floatTexts = [];
  G.afterimages = [];
  G.talismans = [];
  G.groundWaves = [];
  G.chapelTide = null;
  G.projectiles = [];
  G.cam = {
    x: Math.max(0, Math.min(Math.max(0, WORLD_W - G.canvasW), altar.x - G.canvasW * 0.5)),
    y: Math.min(Math.max(0, WORLD_H - G.canvasH), Math.max(-40, altar.y - G.canvasH * 0.62)),
    shake: 0,
    kickX: 0,
    kickY: 0,
    zoom: 1
  };
  G.hitstopTimer = 0;
  G.invertTimer = 0;
  G.screenFlash = { alpha: 0, color: '#fff' };
  markMapExplored(altar.x, altar.y - 40);
  hideAllOverlays();
  G.minimapDirty = true;
  G.gameState = 'playing';
  syncHUD(true);
}

export function resetToAltar() {
  respawnAtActiveAltar();
}

export function showDeath() {
  clearOutcomeTimer();
  if (!G.player || G.player.hp > 0 || G.gameState === 'dead' || G.gameState === 'victory') return;
  hideAllOverlays();
  G.gameState = 'dead';
  const retryEchoBtn = document.getElementById('btn-retry-echo');
  const retryAltarBtn = document.getElementById('btn-retry');
  const deathSub = document.getElementById('death-sub');
  if (G.echoSession) {
    retryEchoBtn.style.display = 'inline-block';
    retryAltarBtn.textContent = '返回祭坛';
    deathSub.textContent = '残誓回响中断 · 可立即再战或返回祭坛重整圣物';
  } else {
    retryEchoBtn.style.display = 'none';
    retryAltarBtn.textContent = '于祭坛重燃';
    deathSub.textContent = '残破人偶坠入墨蚀深渊';
  }
  document.getElementById('death-modal').classList.remove('hidden');
}

export function showVictory(bossId = 'boss_hui') {
  clearOutcomeTimer();
  if (G.gameState === 'victory' || G.gameState === 'dead') return;
  const titleEl = document.getElementById('victory-title');
  const subEl = document.getElementById('victory-sub');
  const statsEl = document.getElementById('victory-stats');
  const btnEchoAgain = document.getElementById('btn-echo-again');
  const btnEnterWell = document.getElementById('btn-enter-well');
  const btnPlayAgain = document.getElementById('btn-play-again');

  if (G.echoSession) {
    const mode = G.echoSession.mode;
    const elapsed = Math.max(0, (performance.now() - G.echoSession.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60).toString().padStart(2, '0');
    const grade = evaluateEchoGrade(mode, elapsed, G.echoSession.damageTaken);
    let recordNote = '';
    if (G.worldState) {
      if (!G.worldState.echoRecords) G.worldState.echoRecords = { hui: null, ji: null, rush: null };
      const prev = G.worldState.echoRecords[mode];
      const isNewBestGrade = !prev || (ECHO_GRADE_ORDER[grade.code] > (ECHO_GRADE_ORDER[prev.bestGrade] || 0));
      const isNewBestTime = !prev || elapsed < prev.bestTimeSec;
      G.worldState.echoRecords[mode] = {
        bestGrade: isNewBestGrade ? grade.code : prev.bestGrade,
        bestTimeSec: isNewBestTime ? Math.round(elapsed * 10) / 10 : prev.bestTimeSec,
        clears: (prev ? (prev.clears || 0) : 0) + 1,
        noHit: (prev && prev.noHit) || G.echoSession.damageTaken === 0
      };
      if (isNewBestGrade || isNewBestTime) recordNote = '\n★ 刷新祭坛回响最佳纪录！';
      saveProgress(false);
    }
    titleEl.textContent = '回 响 已 破';
    const modeTitle = mode === 'rush' ? '双钟连战 · 残誓终试' : mode === 'ji' ? '沉渊铸钟师 · 寂' : '断钟骑士 · 晦';
    subEl.textContent = `${modeTitle} · 评级【${grade.label}】`;
    statsEl.textContent =
      `回响评级：${grade.label}\n讨伐用时：${minutes}:${seconds}\n精准弹反：${G.echoSession.parries} 次\n成功处决：${G.echoSession.executions} 次\n承受伤害：${G.echoSession.damageTaken}${recordNote}`;
    btnEchoAgain.style.display = 'inline-block';
    btnEnterWell.style.display = 'inline-block';
    btnEnterWell.textContent = '返回祭坛';
    btnPlayAgain.style.display = 'none';
  } else if (bossId === 'boss_ji') {
    const elapsed = Math.max(0, (performance.now() - G.stats.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60).toString().padStart(2, '0');
    titleEl.textContent = '沉 渊 寂 鸣';
    subEl.textContent = '沉渊铸钟师 · 寂 已被斩落 · 祭坛已解锁「双钟连战」与全部残誓回响';
    statsEl.textContent =
      `全境探索：${getExplorationPercent()}%\n本轮用时：${minutes}:${seconds}\n精准弹反：${G.stats.parries} 次\n成功处决：${G.stats.executions} 次\n承受伤害：${G.stats.damageTaken}`;
    btnEchoAgain.style.display = 'none';
    btnEnterWell.style.display = 'inline-block';
    btnEnterWell.textContent = '返回祭坛 · 挑战回响';
    btnPlayAgain.style.display = 'inline-block';
  } else {
    const elapsed = Math.max(0, (performance.now() - G.stats.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60).toString().padStart(2, '0');
    titleEl.textContent = '残 誓 已 断';
    subEl.textContent = '断钟骑士 · 晦 已被斩落 · 礼拜堂东侧青铜封门已开启（祭坛已解锁回响）';
    statsEl.textContent =
      `战斗用时：${minutes}:${seconds}\n精准弹反：${G.stats.parries} 次\n成功处决：${G.stats.executions} 次\n承受伤害：${G.stats.damageTaken}`;
    btnEchoAgain.style.display = 'none';
    btnEnterWell.style.display = 'inline-block';
    btnEnterWell.textContent = '踏入沉渊钟井 →';
    btnPlayAgain.style.display = 'inline-block';
  }
  hideAllOverlays();
  G.gameState = 'victory';
  const vm = document.getElementById('victory-modal');
  const vcard = vm && vm.querySelector('.modal-card');
  if (vcard) vcard.scrollTop = 0;
  if (vm) vm.classList.remove('hidden');
}

export function startGame() {
  if (!G.levelBundle) return;
  clearOutcomeTimer();
  hideAllOverlays();
  G.worldState = createFreshWorldState();
  G.equippedRelics = [RELICS[0], null];
  G.currentRelic = RELICS[0];
  G.activeRelicSlot = 1;
  const previewRoomId = G.isEditorPreview ? getPreviewSpawnRoomId() : null;
  const spawnPt = previewRoomId
    ? getRoomSpawnPoint(previewRoomId)
    : (ALTARS[0] ? { x: ALTARS[0].x - 14, y: ALTARS[0].y - 54 } : { x: 316, y: FLOOR_Y - 54 });
  G.player = createPlayer(spawnPt.x, spawnPt.y);
  markMapExplored(spawnPt.x + 14, spawnPt.y + 14);
  G.echoSession = null;
  G.enemies = createSentinels();
  G.boss = createBoss();
  G.boss2 = createBoss2();
  G.lanterns = createLanterns();
  G.resonancePuzzles = createResonancePuzzles();
  G.crumblePlatforms = createCrumblePlatforms();
  G.bellQuakes = [];
  G.particles = [];
  G.slashes = [];
  G.shockwaves = [];
  G.impactBursts = [];
  G.hitMarks = [];
  G.floatTexts = [];
  G.afterimages = [];
  G.talismans = [];
  G.groundWaves = [];
  G.chapelTide = null;
  G.projectiles = [];
  G.grapplePreviewTarget = null;
  G.hitstopTimer = 0;
  G.invertTimer = 0;
  G.screenFlash = { alpha: 0, color: '#fff' };
  G.cam = {
    x: Math.max(0, Math.min(Math.max(0, WORLD_W - G.canvasW), spawnPt.x - G.canvasW * 0.5)),
    y: Math.min(Math.max(0, WORLD_H - G.canvasH), Math.max(-40, spawnPt.y - G.canvasH * 0.55)),
    shake: 0, kickX: 0, kickY: 0, zoom: 1
  };
  G.playTimeSec = 0;
  G.stats = { parries: 0, executions: 0, damageTaken: 0, startTime: performance.now() };
  G.globalTime = 0;
  G.boilFrame = 0;
  G.minimapDirty = true;
  G.gameState = 'playing';
  audio.init();
  saveProgress(false);
  syncHUD(true);
}

export function continueIntoBellWell() {
  if (G.echoSession || (G.worldState && G.worldState.boss2Defeated && G.player && G.player.x > 5500)) {
    respawnAtActiveAltar();
    return;
  }
  if (G.player && G.player.hp <= 0) {
    G.player.hp = G.player.maxHp;
    G.player.grayHp = 0;
    G.player.deathTimer = 0;
    G.player.iframeTimer = 0.6;
  }
  hideAllOverlays();
  G.gameState = 'playing';
  audio.playBellToll();
  syncHUD(true);
  spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 34, '向右踏入沉渊钟井 →', COLORS.cyanBright, 20, 1.5);
}
