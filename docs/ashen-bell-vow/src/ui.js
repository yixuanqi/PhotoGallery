// HUD synchronization, parchment map rendering, modals, altar/relics & Vow Echoes flow
import {
  COLORS, RELICS, RELIC_SYNERGIES, VOW_CONSTRAINTS, DUMMY_MODES, SMITH_UPGRADES, ACTION_META, ROOMS, SOLIDS, ALTARS, NPCS, LORE_TABLETS, PICKUPS_DEF,
  SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_ENTRY_GATE_DEF, FOUNDRY_EXIT_GATE_DEF, FIRST_BELL_CORE_POS, VOID_BARRIERS,
  ABYSSAL_RIVERS, WORLD_W, WORLD_H, FLOOR_Y, WELL_BOTTOM_Y,
  MAP_COLS, MAP_ROWS, MAP_CELL_W, MAP_CELL_H, ECHO_GRADE_ORDER
} from './config.js';
import { getRoomAt, getZoneLabelAt, getPreviewSpawnRoomId, getRoomSpawnPoint } from './levelLoader.js';
import {
  G, createFreshWorldState, getActiveAltar, getActiveSynergies, getRelicStats, getActiveVowStats, getCombatScaling, getEquippedRelicLabel,
  ensureNpcQuests, hasKeeperBlessing,
  getPlayerMaxHp, getPlayerMaxSoul, getPlayerMaxFlasks, getPlayerMaxSeals,
  markMapExplored, getExplorationPercent, createLanterns,
  createResonancePuzzles, createCrumblePlatforms, getAwakeBoss, clearOutcomeTimer, triggerBossBanner, setTextFast
} from './state.js';
import { audio } from './audio.js';
import {
  isActionHeld, syncHelpModalText, getActionKeyLabel, startKeyCapture, cancelKeyCapture, triggerHaptic
} from './input.js';
import { isPickupUnlocked } from './combat.js';
import { spawnParticles, spawnShockwave, spawnFloatText } from './vfx.js';
import { createPlayer, createSentinels, createBoss, createBoss2, createBoss3 } from './entities.js';
import { readSaveData, listSaveSlots, deleteSaveSlot, saveProgress, applySaveData, saveUserSettings } from './save.js';
import {
  t, getLocale, isEn, getLocaleVersion, getCanvasFont,
  locZoneName, locRoomName, locAltar, locTablet, locPickup, locNpcName,
  locRelic, locSynergy, locSmithUpgrade, locVow, locBestiary, locAchievement,
  locPin, locBoss, locActionLabel, getEndingScript
} from './i18n.js';
import { SLOT_EMBLEMS, getRelicEmblemSvg, getBestiaryEmblemSvg } from './emblems.js';
import { prof } from './profiler.js';
import {
  BESTIARY_ENTRIES, ACHIEVEMENTS_DEF, MAP_PIN_TYPES, ensureCodexState,
  recordTabletRead, recordSynergyDiscovered, checkAchievements, getRoomCollectibleStats
} from './codex.js';

export const HUD_DOM = {
  hpReal: document.getElementById('hp-real'),
  hpGray: document.getElementById('hp-gray'),
  hpText: document.getElementById('hp-text'),
  relicTag: document.getElementById('relic-tag'),
  abilityTag: document.getElementById('ability-tag'),
  abilityShadeTag: document.getElementById('ability-shade-tag'),
  keyDawnTag: document.getElementById('key-dawn-tag'),
  blessingTag: document.getElementById('blessing-tag'),
  vowCycleTag: document.getElementById('vow-cycle-tag'),
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
let activeLoreTabletRef = null;

function getLocalizedRelicLabel() {
  const active = (G.equippedRelics || [G.currentRelic]).filter(Boolean);
  if (active.length === 0) return locRelic(RELICS[0], 'name');
  return active.map(r => locRelic(r, 'name')).join(' · ');
}

function getLocalizedVowShorts() {
  const vs = G.worldState && G.worldState.activeVows ? G.worldState.activeVows : null;
  if (!vs || vs.size === 0) return '';
  return VOW_CONSTRAINTS.filter(vc => vs.has(vc.id)).map(vc => locVow(vc, 'short')).join('·');
}

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
        const bossCnt = (item.data.bossDefeated ? 1 : 0) + (item.data.boss2Defeated ? 1 : 0) + (item.data.boss3Defeated ? 1 : 0);
        const endCnt = Array.isArray(item.data.endingsUnlocked) ? item.data.endingsUnlocked.length : 0;
        const cyc = Math.max(1, Math.floor(Number(item.data.ngPlusCycle) || 1));
        const vCnt = Array.isArray(item.data.activeVows) ? item.data.activeVows.length : 0;
        const cycTag = cyc >= 2 ? t('slot.cycleTag', cyc) : '';
        const vowTag = vCnt > 0 ? t('slot.vowTag', vCnt) : '';
        meta.textContent = t('slot.summary', locAltar(altar, 'shortName'), pct, bossCnt) + (endCnt > 0 ? t('slot.endTag', endCnt) : '') + cycTag + vowTag;
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
    const bCnt = (data.bossDefeated ? 1 : 0) + (data.boss2Defeated ? 1 : 0) + (data.boss3Defeated ? 1 : 0);
    const eCnt = Array.isArray(data.endingsUnlocked) ? data.endingsUnlocked.length : 0;
    const cyc = Math.max(1, Math.floor(Number(data.ngPlusCycle) || 1));
    const vCnt = Array.isArray(data.activeVows) ? data.activeVows.length : 0;
    const bossTag = (cyc >= 2 ? t('slot.cycleTag', cyc) : '') + (vCnt > 0 ? t('slot.vowTag', vCnt) : '') + (bCnt > 0 ? t('slot.bossTag', bCnt) : '');
    const wingTag = (data.abilities && data.abilities.doubleJump ? ` · ${t('hud.abilityWings')}` : '') + (data.abilities && data.abilities.shadeDash ? ` · ${t('hud.abilityShade')}` : '') + (eCnt > 0 ? t('slot.endTag', eCnt) : '');
    HUD_DOM.titleSaveInfo.textContent = t('slot.selectedInfo', G.activeSaveSlot + 1, locAltar(altar, 'shortName'), pct, relicCount, RELICS.length, bossTag, wingTag);
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
  spawnFloatText(altar.x, altar.y - 84, t('altar.continueToast', locAltar(altar, 'shortName')), COLORS.cyanBright, 18, 1.3);
}

export function syncHUD(force = false) {
  if (!G.player) return;
  const locVer = getLocaleVersion();
  if (hudCache.locVer !== locVer) {
    hudCache.locVer = locVer;
    force = true;
  }

  const hpCeil = Math.ceil(G.player.hp);
  const maxHp = G.player.maxHp;
  const grayCeil = G.player.grayHp >= 1 ? Math.ceil(G.player.grayHp) : 0;
  const realRatioNum = Math.round(Math.max(0, Math.min(1, G.player.hp / maxHp)) * 1000);
  const totalRatioNum = Math.round(Math.max(0, Math.min(1, (G.player.hp + G.player.grayHp) / maxHp)) * 1000);
  const hasDoubleJump = !!(G.worldState && G.worldState.abilities.doubleJump);
  const hasShadeDash = !!(G.worldState && G.worldState.abilities.shadeDash);
  const hasDawnSigil = !!(G.worldState && G.worldState.keyItems && G.worldState.keyItems.dawnSigil);

  if (force || hudCache.realRatioNum !== realRatioNum) {
    hudCache.realRatioNum = realRatioNum;
    HUD_DOM.hpReal.style.transform = `scaleX(${(realRatioNum * 0.001).toFixed(3)})`;
  }
  if (force || hudCache.totalRatioNum !== totalRatioNum) {
    hudCache.totalRatioNum = totalRatioNum;
    HUD_DOM.hpGray.style.transform = `scaleX(${(totalRatioNum * 0.001).toFixed(3)})`;
  }
  if (force || hudCache.hpCeil !== hpCeil || hudCache.maxHp !== maxHp || hudCache.grayCeil !== grayCeil) {
    hudCache.hpCeil = hpCeil;
    hudCache.maxHp = maxHp;
    hudCache.grayCeil = grayCeil;
    setTextFast(HUD_DOM.hpText, grayCeil > 0 ? t('hud.hpGray', hpCeil, maxHp, grayCeil) : `${hpCeil} / ${maxHp}`);
  }
  const activeSyns = getActiveSynergies();
  const r0 = (G.equippedRelics && G.equippedRelics[0]) || G.currentRelic || RELICS[0];
  const r1 = (G.equippedRelics && G.equippedRelics[1]) || null;
  const r0Id = r0 ? r0.id : '';
  const r1Id = r1 ? r1.id : '';
  const syn0Id = activeSyns.length ? activeSyns[0].id : '';
  if (force || hudCache.r0Id !== r0Id || hudCache.r1Id !== r1Id || hudCache.syn0Id !== syn0Id) {
    hudCache.r0Id = r0Id;
    hudCache.r1Id = r1Id;
    hudCache.syn0Id = syn0Id;
    const icon0 = r0 ? `<span class="hud-relic-ico" title="${t('hud.primaryRelicTip', locRelic(r0, 'name'))}">${getRelicEmblemSvg(r0.id)}</span>` : '';
    const icon1 = r1 ? `<span class="hud-relic-ico sub" title="${t('hud.secondaryRelicTip', locRelic(r1, 'name'))}">${getRelicEmblemSvg(r1.id)}</span>` : '';
    const synHtml = activeSyns.length > 0 ? `<span class="hud-syn-pill">✦${locSynergy(activeSyns[0], 'name')}</span>` : '';
    HUD_DOM.relicTag.innerHTML = `${icon0}${icon1}<span class="hud-relic-names">${getLocalizedRelicLabel()}</span>${synHtml}`;
  }
  if (force || hudCache.hasDoubleJump !== hasDoubleJump) {
    hudCache.hasDoubleJump = hasDoubleJump;
    HUD_DOM.abilityTag.classList.toggle('unlocked', hasDoubleJump);
  }
  if (HUD_DOM.abilityShadeTag && (force || hudCache.hasShadeDash !== hasShadeDash)) {
    hudCache.hasShadeDash = hasShadeDash;
    HUD_DOM.abilityShadeTag.classList.toggle('unlocked', hasShadeDash);
  }
  if (HUD_DOM.keyDawnTag && (force || hudCache.hasDawnSigil !== hasDawnSigil)) {
    hudCache.hasDawnSigil = hasDawnSigil;
    HUD_DOM.keyDawnTag.classList.toggle('unlocked', hasDawnSigil);
  }
  const hasBless = hasKeeperBlessing();
  if (HUD_DOM.blessingTag && (force || hudCache.hasBless !== hasBless)) {
    hudCache.hasBless = hasBless;
    HUD_DOM.blessingTag.classList.toggle('unlocked', hasBless);
  }
  if (HUD_DOM.vowCycleTag) {
    const cycNum = (G.worldState && G.worldState.ngPlusCycle) ? G.worldState.ngPlusCycle : 1;
    const vsHud = getActiveVowStats();
    const parts = [];
    if (cycNum >= 2) parts.push(t('hud.cycleShort', cycNum));
    if (vsHud.count > 0) parts.push(t('hud.vowShort', vsHud.count));
    const vcText = parts.join('·');
    if (force || hudCache.vcText !== vcText) {
      hudCache.vcText = vcText;
      HUD_DOM.vowCycleTag.classList.toggle('unlocked', vcText.length > 0);
      if (vcText) setTextFast(HUD_DOM.vowCycleTag, vcText);
    }
  }

  const soulFloor = Math.floor(G.player.soul);
  const soulRatioNum = Math.round(Math.max(0, Math.min(1, G.player.soul / G.player.maxSoul)) * 1000);
  if (force || hudCache.soulRatioNum !== soulRatioNum) {
    hudCache.soulRatioNum = soulRatioNum;
    HUD_DOM.soulFill.style.transform = `scaleX(${(soulRatioNum * 0.001).toFixed(3)})`;
  }
  if (force || hudCache.soulFloor !== soulFloor) {
    hudCache.soulFloor = soulFloor;
    setTextFast(HUD_DOM.soulText, t('hud.soul', soulFloor));
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
  const lostAmt = (G.worldState && G.worldState.lostEchoes) ? G.worldState.lostEchoes.amount : 0;
  if (HUD_DOM.echoesText && (force || hudCache.echoesVal !== echoesVal || hudCache.lostAmt !== lostAmt)) {
    hudCache.echoesVal = echoesVal;
    hudCache.lostAmt = lostAmt;
    setTextFast(HUD_DOM.echoesText, lostAmt > 0 ? t('hud.echoesLost', echoesVal, lostAmt) : String(echoesVal));
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
      ? (G.echoSession.stage === 0 ? t('hud.echoZoneRush1') : G.echoSession.stage === 1 ? t('hud.echoZoneRush2') : t('hud.echoZoneRush3'))
      : G.echoSession.mode === 'yuan' ? t('hud.echoZoneYuan') : G.echoSession.mode === 'ji' ? t('hud.echoZoneJi') : t('hud.echoZoneHui');
    zoneText = echoName;
  } else {
    zoneText = getZoneLabelAt(G.player.x + G.player.w / 2, G.player.y + G.player.h / 2);
  }

  if (force || hudCache.zoneText !== zoneText) {
    hudCache.zoneText = zoneText;
    setTextFast(HUD_DOM.zoneEl, zoneText);
  }

  const explorePctNum = getExplorationPercent();
  if (force || hudCache.explorePctNum !== explorePctNum) {
    hudCache.explorePctNum = explorePctNum;
    setTextFast(HUD_DOM.explorePct, t('hud.explore', explorePctNum));
  }

  const miniElapsed = G.globalTime - G.lastMinimapRenderTime;
  const busyAct = G.player.grappleState !== 'none' || G.player.dashTimer > 0 || G.player.iaiLungeTimer > 0 || G.player.attackTimer > 0;
  const pMoveMini = Math.abs(G.player.x - (hudCache.miniPx || -999)) + Math.abs(G.player.y - (hudCache.miniPy || -999));
  if (force || (!busyAct && ((G.minimapDirty && miniElapsed >= 0.28) || (pMoveMini >= 28 && miniElapsed >= 0.22)))) {
    renderHudMinimapFast(force || G.minimapDirty);
    hudCache.miniPx = G.player.x;
    hudCache.miniPy = G.player.y;
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
    const isEchoBoss = !!G.echoSession;
    const bossHpRatioNum = Math.round(Math.max(0, Math.min(1, activeBoss.hp / activeBoss.maxHp)) * 1000);
    const bossPosRatioNum = Math.round(Math.max(0, Math.min(1, activeBoss.posture / activeBoss.maxPosture)) * 1000);
    const phaseField = activeBoss.phase === 3 ? 'phase3Title' : activeBoss.phase === 2 ? 'phase2Title' : 'phase1Title';
    const bossPhaseStr = locBoss(activeBoss, phaseField) || locBoss(activeBoss, 'phase2Title');
    const bossDispName = locBoss(activeBoss, 'name');
    if (force || hudCache.bossId !== activeBoss.id || hudCache.isEchoBoss !== isEchoBoss) {
      hudCache.bossId = activeBoss.id;
      hudCache.isEchoBoss = isEchoBoss;
      setTextFast(HUD_DOM.bossNameLabel, isEchoBoss ? t('hud.bossEchoSuffix', bossDispName) : bossDispName);
    }
    if (force || hudCache.bossHpRatioNum !== bossHpRatioNum) {
      hudCache.bossHpRatioNum = bossHpRatioNum;
      HUD_DOM.bossHpFill.style.transform = `scaleX(${(bossHpRatioNum * 0.001).toFixed(3)})`;
    }
    if (force || hudCache.bossPosRatioNum !== bossPosRatioNum) {
      hudCache.bossPosRatioNum = bossPosRatioNum;
      HUD_DOM.bossPostureFill.style.transform = `scaleX(${(bossPosRatioNum * 0.001).toFixed(3)})`;
    }
    if (force || hudCache.bossPhaseStr !== bossPhaseStr) {
      hudCache.bossPhaseStr = bossPhaseStr;
      setTextFast(HUD_DOM.bossPhaseTag, bossPhaseStr);
    }
  }

  // Reactive Mobile Fan Glow & Contextual Interact Button
  if (document.body.classList.contains('is-mobile')) {
    const rsMob = getRelicStats();
    const holdingUp = isActionHeld('up');
    const spellCostNow = holdingUp ? rsMob.quakeCost : rsMob.spellCost;
    const spellReady = G.player.soul >= spellCostNow;
    const spellSubTxt = holdingUp ? t('mob.spellQuake') : t('mob.spellBlade');
    if (HUD_DOM.fanSpell && (force || hudCache.mobSpellReady !== spellReady)) {
      hudCache.mobSpellReady = spellReady;
      HUD_DOM.fanSpell.classList.toggle('ready-glow', spellReady);
      HUD_DOM.fanSpell.classList.toggle('dimmed', !spellReady);
    }
    if (HUD_DOM.fanSpellSub && (force || hudCache.mobSpellSub !== spellSubTxt)) {
      hudCache.mobSpellSub = spellSubTxt;
      setTextFast(HUD_DOM.fanSpellSub, spellSubTxt);
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
        if (G.worldState && G.worldState.boss3Defeated && !G.echoSession &&
            Math.hypot(px - FIRST_BELL_CORE_POS.x, py - FIRST_BELL_CORE_POS.y) < 105) {
          interactLabel = t('prompt.coreMob');
        }
        if (!interactLabel) for (const altar of ALTARS) {
          if (Math.hypot(px - altar.x, py - altar.y) < 86) {
            const lit = !G.worldState || G.worldState.litAltars.has(altar.id);
            interactLabel = lit ? t('prompt.altarRestMob') : t('prompt.altarLightMob');
            break;
          }
        }
        if (!interactLabel) {
          for (const npc of NPCS) {
            if (Math.hypot(px - npc.x, py - npc.y) < 88) {
              const verb = npc.kind === 'chronicler' ? t('prompt.npcChronMob') : npc.kind === 'keeper' ? t('prompt.npcKeeperMob') : t('prompt.npcSmithMob');
              interactLabel = `${verb} · ${locNpcName(npc)}`;
              break;
            }
          }
        }
        if (!interactLabel) {
          for (const e of G.enemies) {
            if (e && e.alive && e.isDummy && Math.hypot(px - (e.x + e.w * 0.5), py - (e.y + e.h)) < 94) {
              interactLabel = t('prompt.dummyModeMob');
              break;
            }
          }
        }
        if (!interactLabel && G.worldState && !G.worldState.shortcutOpen && Math.hypot(px - SHORTCUT_GATE_DEF.leverX, py - SHORTCUT_GATE_DEF.leverY) < 76) {
          interactLabel = t('prompt.leverMob');
        }
        if (!interactLabel) {
          for (const lt of LORE_TABLETS) {
            if (Math.hypot(px - lt.x, py - lt.y) < 78) {
              interactLabel = t('prompt.loreMob', locTablet(lt, 'title'));
              break;
            }
          }
        }
        if (!interactLabel && G.worldState) {
          for (const p of G.worldState.pickups) {
            if (!p.collected && isPickupUnlocked(p) && Math.hypot(px - p.x, py - p.y) < 72) {
              interactLabel = t('prompt.pickupMob', locPickup(p, 'name'));
              break;
            }
          }
        }
      }
      if (force || hudCache.mobInteractLabel !== interactLabel) {
        hudCache.mobInteractLabel = interactLabel;
        HUD_DOM.mobileInteract.classList.toggle('hidden', !interactLabel);
        if (interactLabel) setTextFast(HUD_DOM.mobileInteract, interactLabel);
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

let _miniStaticCanvas = null;

function renderHudMinimapFast(rebuildStatic = false) {
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
    const sx = (dst.width - padX * 2) / WORLD_W;
    const sy = (dst.height - padTop - padBot) / WORLD_H;
    const px = padX + (G.player.x + G.player.w * 0.5) * sx;
    const py = padTop + (G.player.y + G.player.h * 0.5) * sy;
    mctx.fillStyle = '#ffffff';
    mctx.beginPath();
    mctx.arc(px, py, 2.6, 0, Math.PI * 2);
    mctx.fill();
  }
}

export function renderParchmentMap(targetCanvas, detailed = false, omitPlayer = false) {
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

  const focusRoomId = detailed ? (mapFocusedRoomId || G.currentRoomId || (ROOMS[0] && ROOMS[0].id)) : null;
  if (detailed && ROOMS.length > 0) {
    mctx.font = getCanvasFont(isEn() ? 9.5 : 10.5, false);
    mctx.textAlign = 'center';
    for (const rm of ROOMS) {
      const b = rm.bounds;
      const rx = padX + b.x * sx;
      const ry = padTop + b.y * sy;
      const rw = b.w * sx;
      const rh = b.h * sy;
      const isFocus = rm.id === focusRoomId;
      if (isFocus) {
        mctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
        mctx.fillRect(rx, ry, rw, rh);
      }
      mctx.strokeStyle = isFocus ? 'rgba(253, 224, 71, 0.68)' : 'rgba(216, 207, 184, 0.16)';
      mctx.lineWidth = isFocus ? 1.5 : 1;
      mctx.setLineDash(isFocus ? [] : [4, 4]);
      mctx.strokeRect(rx, ry, rw, rh);
      mctx.fillStyle = isFocus ? COLORS.goldBright : 'rgba(216, 207, 184, 0.74)';
      const rName = locRoomName(rm);
      const shortLbl = isEn() && rName.length > 14 ? rName.slice(0, 13) + '…' : rName;
      mctx.fillText(shortLbl, rx + rw * 0.5, 14);
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
    const ry = padTop + r * MAP_CELL_H * sy;
    let c = 0;
    while (c < MAP_COLS) {
      if (!row[c]) { c++; continue; }
      const start = c;
      while (c < MAP_COLS && row[c]) c++;
      mctx.fillRect(padX + start * cellPxW, ry, (c - start) * cellPxW + 0.6, ch);
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

  // Void Barriers (violet vertical markers)
  for (const vb of VOID_BARRIERS) {
    mctx.fillStyle = G.worldState.abilities.shadeDash ? 'rgba(216, 180, 254, 0.58)' : '#a855f7';
    mctx.fillRect(padX + vb.x * sx, padTop + vb.y * sy, Math.max(2.6, vb.w * sx), Math.max(5, vb.h * sy));
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

  // NPCs (Warm amber diamond-scroll markers on explored parchment map)
  if (detailed) {
    for (const npc of NPCS) {
      const nx = padX + npc.x * sx;
      const ny = padTop + (npc.y - 26) * sy;
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

  // Foundry Exit Gate
  if (FOUNDRY_EXIT_GATE_DEF.w > 0) {
    const gx4 = padX + FOUNDRY_EXIT_GATE_DEF.x * sx;
    const gy4 = padTop + FOUNDRY_EXIT_GATE_DEF.y * sy;
    mctx.fillStyle = G.worldState.boss2Defeated ? 'rgba(245, 158, 11, 0.35)' : COLORS.crimsonBright;
    mctx.fillRect(gx4, gy4, Math.max(2.5, FOUNDRY_EXIT_GATE_DEF.w * sx), Math.max(4, FOUNDRY_EXIT_GATE_DEF.h * sy * (G.worldState.boss2Defeated ? 0.25 : 1)));
  }

  // Boss 2 Abyssal Foundry Marker
  const bx2 = padX + 6140 * sx;
  const by2 = padTop + (WELL_BOTTOM_Y - 110) * sy;
  mctx.fillStyle = G.worldState.boss2Defeated ? 'rgba(245, 158, 11, 0.55)' : COLORS.crimsonBright;
  mctx.beginPath();
  mctx.arc(bx2, by2, detailed ? 5 : 2.8, 0, Math.PI * 2);
  mctx.fill();

  // Boss 3 Heart of the First Bell Marker
  const bx3 = padX + 9000 * sx;
  const by3 = padTop + (FLOOR_Y - 58) * sy;
  mctx.fillStyle = G.worldState.boss3Defeated ? COLORS.goldBright : COLORS.crimsonBright;
  mctx.beginPath();
  mctx.arc(bx3, by3, detailed ? 5.5 : 3.0, 0, Math.PI * 2);
  mctx.fill();

  // 2D Fog of War mask over unexplored grid cells (horizontal span-merged)
  mctx.fillStyle = detailed ? 'rgba(9, 8, 7, 0.9)' : 'rgba(6, 8, 13, 0.92)';
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = G.worldState.explored[r];
    const ry = padTop + r * MAP_CELL_H * sy;
    let c = 0;
    while (c < MAP_COLS) {
      if (row[c]) { c++; continue; }
      const start = c;
      while (c < MAP_COLS && !row[c]) c++;
      mctx.fillRect(padX + start * cellPxW, ry, (c - start) * cellPxW + 0.6, ch);
    }
  }

  // Lost Echo Lantern Shade Marker (always visible above fog so corpse-run route is clear)
  if (G.worldState.lostEchoes && G.worldState.lostEchoes.amount > 0) {
    const lx = padX + G.worldState.lostEchoes.x * sx;
    const ly = padTop + G.worldState.lostEchoes.y * sy;
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
      const bx = padX + (b.x + b.w) * sx - 4;
      const by = padTop + b.y * sy + 12;
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
      const px = padX + pin.x * sx;
      const py = padTop + pin.y * sy;
      drawMapInkPin(mctx, px, py, pin.type, detailed);
    }
  }

  // Live Player Marker (drawn on top of fog)
  if (!omitPlayer && G.player) {
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
let codexActiveTab = 'lore'; // 'lore' | 'bestiary' | 'achievements'

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

function renderMapPinToolbar() {
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
}

function mapEventToWorld(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * (canvas.width / Math.max(1, rect.width));
  const cy = (e.clientY - rect.top) * (canvas.height / Math.max(1, rect.height));
  const padX = 16, padTop = 22, padBot = 16;
  const mapW = canvas.width - padX * 2;
  const mapH = canvas.height - padTop - padBot;
  const wx = ((cx - padX) / mapW) * WORLD_W;
  const wy = ((cy - padTop) / mapH) * WORLD_H;
  return { cx, cy, wx, wy, padX, padTop, sx: mapW / WORLD_W, sy: mapH / WORLD_H };
}

function findNearestMapPinIndex(cx, cy, padX, padTop, sx, sy, maxPx = 15) {
  if (!G.worldState || !Array.isArray(G.worldState.mapPins)) return -1;
  let bestIdx = -1;
  let bestD = maxPx;
  for (let i = 0; i < G.worldState.mapPins.length; i++) {
    const p = G.worldState.mapPins[i];
    const px = padX + p.x * sx;
    const py = padTop + p.y * sy;
    const d = Math.hypot(cx - px, cy - py);
    if (d < bestD) { bestD = d; bestIdx = i; }
  }
  return bestIdx;
}

export function initMapInteractions() {
  if (mapInteractionsBound) return;
  const cvs = HUD_DOM.fullMapCanvas;
  if (!cvs) return;
  mapInteractionsBound = true;

  cvs.addEventListener('mousemove', e => {
    if (G.activeModal !== 'map' || !G.worldState) return;
    const pt = mapEventToWorld(cvs, e);
    const rm = getRoomAt(pt.wx, pt.wy);
    if (rm && rm.id !== mapFocusedRoomId) {
      mapFocusedRoomId = rm.id;
      renderParchmentMap(cvs, true);
    }
  });

  cvs.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (G.activeModal !== 'map' || !G.worldState) return;
    ensureCodexState();
    const pt = mapEventToWorld(cvs, e);
    const idx = findNearestMapPinIndex(pt.cx, pt.cy, pt.padX, pt.padTop, pt.sx, pt.sy, 18);
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
    if (G.activeModal !== 'map' || !G.worldState) return;
    ensureCodexState();
    const pt = mapEventToWorld(cvs, e);
    const rm = getRoomAt(pt.wx, pt.wy);
    if (rm) mapFocusedRoomId = rm.id;

    if (mapPinTool === 'inspect') {
      renderParchmentMap(cvs, true);
      return;
    }

    const hitIdx = findNearestMapPinIndex(pt.cx, pt.cy, pt.padX, pt.padTop, pt.sx, pt.sy, 16);
    if (hitIdx >= 0) {
      G.worldState.mapPins.splice(hitIdx, 1);
      audio.playResonanceBell(330, false);
    } else if (pt.wx >= 0 && pt.wx <= WORLD_W && pt.wy >= 0 && pt.wy <= WORLD_H) {
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

export function openCodexModal(tab = null) {
  if (G.gameState === 'dead' || G.gameState === 'victory' || G.gameState === 'title') return;
  if (G.activeModal === 'codex' && (!tab || tab === codexActiveTab)) {
    closeModal('codex');
    return;
  }
  if (tab && ['lore', 'bestiary', 'achievements'].includes(tab)) {
    codexActiveTab = tab;
  }
  checkAchievements();
  openModal('codex');
  renderCodexModal();
}

export function renderCodexModal() {
  if (!G.worldState) return;
  const c = ensureCodexState();
  const subEl = document.getElementById('codex-modal-sub');
  const tabsEl = document.getElementById('codex-tabs');
  const bodyEl = document.getElementById('codex-body');
  if (!tabsEl || !bodyEl) return;

  let seenFoes = 0;
  for (const e of BESTIARY_ENTRIES) {
    if (c.bestiary[e.kind] && c.bestiary[e.kind].seen) seenFoes++;
  }
  if (subEl) {
    subEl.textContent = t('codex.sub', c.readTablets.length, LORE_TABLETS.length, seenFoes, BESTIARY_ENTRIES.length, c.achievements.length, ACHIEVEMENTS_DEF.length, c.discoveredSynergies.length, RELIC_SYNERGIES.length);
  }

  tabsEl.innerHTML = '';
  [
    { id: 'lore', label: t('codex.tabLore', c.readTablets.length, LORE_TABLETS.length) },
    { id: 'bestiary', label: t('codex.tabBestiary', seenFoes, BESTIARY_ENTRIES.length) },
    { id: 'achievements', label: t('codex.tabAchievements', c.achievements.length, ACHIEVEMENTS_DEF.length) }
  ].forEach(tb => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `codex-tab-btn${codexActiveTab === tb.id ? ' active' : ''}`;
    btn.textContent = tb.label;
    btn.addEventListener('click', () => {
      codexActiveTab = tb.id;
      renderCodexModal();
    });
    tabsEl.appendChild(btn);
  });

  bodyEl.innerHTML = '';
  if (codexActiveTab === 'lore') {
    const sec1 = document.createElement('div');
    sec1.className = 'codex-sec-head';
    sec1.textContent = t('codex.secTablets');
    bodyEl.appendChild(sec1);

    const list = document.createElement('div');
    list.className = 'codex-lore-list';
    for (const lt of LORE_TABLETS) {
      const read = c.readTablets.includes(lt.id);
      const card = document.createElement('div');
      card.className = `codex-lore-card${read ? ' unlocked' : ' locked'}`;
      if (read) {
        card.innerHTML = `<div class="codex-lore-title"><span>✦ ${locTablet(lt, 'title')}</span><span class="codex-lore-loc">${locTablet(lt, 'sub')}</span></div><div class="codex-lore-body">${locTablet(lt, 'html')}</div>`;
      } else {
        card.innerHTML = `<div class="codex-lore-title"><span>${t('codex.tabletUnknown')}</span><span class="codex-lore-loc">${locTablet(lt, 'sub')}</span></div><div class="codex-lore-hint">${t('codex.tabletLockedHint')}</div>`;
      }
      list.appendChild(card);
    }
    bodyEl.appendChild(list);

    const sec2 = document.createElement('div');
    sec2.className = 'codex-sec-head';
    sec2.style.marginTop = '14px';
    const ends = Array.isArray(G.worldState.endingsUnlocked) ? G.worldState.endingsUnlocked : [];
    sec2.textContent = t('codex.secEndings', ends.length);
    bodyEl.appendChild(sec2);

    const endGrid = document.createElement('div');
    endGrid.className = 'codex-end-grid';
    [
      { key: 'vow', title: t('codex.endATitle'), desc: t('codex.endADesc'), hint: t('codex.endAHint') },
      { key: 'dawn', title: t('codex.endBTitle'), desc: t('codex.endBDesc'), hint: t('codex.endBHint') }
    ].forEach(ed => {
      const has = ends.includes(ed.key);
      const card = document.createElement('div');
      card.className = `codex-end-card${has ? ' unlocked' : ' locked'}`;
      card.innerHTML = `<div class="codex-end-title">${has ? '✦ ' : ''}${ed.title}</div><div class="codex-end-desc">${has ? ed.desc : ed.hint}</div>`;
      if (has) {
        const repBtn = document.createElement('button');
        repBtn.type = 'button';
        repBtn.className = 'seg-btn active';
        repBtn.style.marginTop = '7px';
        repBtn.textContent = t('codex.replayEnding');
        repBtn.addEventListener('click', () => startEndingCinematic(ed.key));
        card.appendChild(repBtn);
      }
      endGrid.appendChild(card);
    });
    bodyEl.appendChild(endGrid);
  } else if (codexActiveTab === 'bestiary') {
    const grid = document.createElement('div');
    grid.className = 'codex-bestiary-grid';
    for (const entry of BESTIARY_ENTRIES) {
      const rec = c.bestiary[entry.kind];
      const seen = !!(rec && rec.seen);
      const card = document.createElement('div');
      card.className = `codex-foe-card${seen ? '' : ' locked'}${entry.isBoss ? ' boss' : ''}`;
      const kills = rec ? (rec.kills || 0) : 0;
      const parries = rec ? (rec.parries || 0) : 0;
      const execs = rec ? (rec.executions || 0) : 0;
      const statsHtml = entry.kind === 'dummy'
        ? `<span>${t('codex.statDummyParries')} <strong>${parries}</strong></span><span>${t('codex.statDummyExecs')} <strong>${execs}</strong></span>`
        : `<span>${t('codex.statKills')} <strong>${kills}</strong></span><span>${t('codex.statParries')} <strong>${parries}</strong></span><span>${t('codex.statExecs')} <strong>${execs}</strong></span>`;
      const habitat = locBestiary(entry, 'habitat');
      card.innerHTML = `
        <div class="codex-foe-head">
          <div class="codex-foe-icon">${getBestiaryEmblemSvg(seen ? entry.kind : 'unknown')}</div>
          <div class="codex-foe-titles">
            <div class="codex-foe-name">${seen ? locBestiary(entry, 'name') : t('altar.relicUnknown')}${entry.isBoss ? `<span class="codex-boss-pill">${t('codex.bossPill')}</span>` : ''}</div>
            <div class="codex-foe-sub">${seen ? `${locBestiary(entry, 'title')} · ${habitat}` : t('codex.habitatUnknown', habitat)}</div>
          </div>
        </div>
        ${seen
          ? `<div class="codex-foe-lore">${locBestiary(entry, 'lore')}</div><div class="codex-foe-tactic"><span>${t('codex.tacticLabel')}</span>${locBestiary(entry, 'tactic')}</div><div class="codex-foe-stats">${statsHtml}</div>`
          : `<div class="codex-foe-lore">${t('codex.foeLocked')}</div>`
        }
      `;
      grid.appendChild(card);
    }
    bodyEl.appendChild(grid);
  } else {
    const pct = Math.round((c.achievements.length / Math.max(1, ACHIEVEMENTS_DEF.length)) * 100);
    const prog = document.createElement('div');
    prog.className = 'codex-ach-prog';
    prog.innerHTML = `<div class="codex-ach-prog-top"><span>${t('codex.achProgress')}</span><span>${c.achievements.length} / ${ACHIEVEMENTS_DEF.length} (${pct}%)</span></div><div class="codex-ach-track"><div class="codex-ach-fill" style="width:${pct}%"></div></div>`;
    bodyEl.appendChild(prog);

    const aGrid = document.createElement('div');
    aGrid.className = 'codex-ach-grid';
    for (const ach of ACHIEVEMENTS_DEF) {
      const done = c.achievements.includes(ach.id);
      const card = document.createElement('div');
      card.className = `codex-ach-card${done ? ' done' : ''}`;
      card.innerHTML = `
        <div class="codex-ach-seal">${done ? t('codex.achSeal') : '·'}</div>
        <div class="codex-ach-info">
          <div class="codex-ach-name">${locAchievement(ach, 'name')}</div>
          <div class="codex-ach-desc">${locAchievement(ach, 'desc')}</div>
        </div>
      `;
      aGrid.appendChild(card);
    }
    bodyEl.appendChild(aGrid);

    const synHead = document.createElement('div');
    synHead.className = 'codex-sec-head';
    synHead.style.marginTop = '14px';
    synHead.textContent = t('codex.secSynergies', c.discoveredSynergies.length, RELIC_SYNERGIES.length);
    bodyEl.appendChild(synHead);

    const sGrid = document.createElement('div');
    sGrid.className = 'codex-syn-grid';
    for (const syn of RELIC_SYNERGIES) {
      const got = c.discoveredSynergies.includes(syn.id);
      const names = syn.relics.map(id => locRelic(RELICS.find(r => r.id === id) || id, 'name') || id);
      const card = document.createElement('div');
      card.className = `codex-syn-card${got ? ' done' : ''}`;
      card.innerHTML = got
        ? `<div class="codex-syn-title">✦ ${locSynergy(syn, 'name')} <span>(${names[0]} + ${names[1]})</span></div><div class="codex-syn-desc">${locSynergy(syn, 'desc')}</div>`
        : `<div class="codex-syn-title">${t('codex.synUnknown')}</div><div class="codex-syn-desc">${t('codex.synLockedHint')}</div>`;
      sGrid.appendChild(card);
    }
    bodyEl.appendChild(sGrid);
  }
}

let activeNpcModalRef = null;

export function openNpcModal(npc) {
  if (!npc) return;
  if (npc.kind === 'chronicler') {
    openChroniclerModal(npc);
  } else if (npc.kind === 'keeper') {
    openKeeperModal(npc);
  } else {
    openSmithModal(npc);
  }
}

export function openChroniclerModal(npc) {
  const nq = ensureNpcQuests();
  if (nq && !nq.metChronicler) {
    nq.metChronicler = true;
    saveProgress(false);
  }
  activeNpcModalRef = npc;
  renderChroniclerModal();
  audio.playResonanceBell(493.88, false);
  openModal('npc');
}

function renderChroniclerModal() {
  if (!G.worldState) return;
  const nq = ensureNpcQuests();
  const c = ensureCodexState();
  const titleEl = document.getElementById('npc-modal-title');
  const subEl = document.getElementById('npc-modal-sub');
  const dlgEl = document.getElementById('npc-dialogue');
  const echoEl = document.getElementById('npc-echo-bar');
  const listEl = document.getElementById('npc-quest-list');
  if (!listEl) return;

  const readCnt = c.readTablets.length;
  const seenCnt = Object.keys(c.bestiary).filter(k => c.bestiary[k] && c.bestiary[k].seen).length;
  const expPct = getExplorationPercent();
  const claims = nq.chroniclerClaims;
  const echoes = G.worldState.echoes || 0;

  if (titleEl) titleEl.textContent = locNpcName(activeNpcModalRef, 'chronicler');
  if (subEl) subEl.textContent = t('mochen.sub', readCnt, LORE_TABLETS.length, seenCnt, BESTIARY_ENTRIES.length, expPct);

  if (dlgEl) {
    if (claims.includes('vol3')) dlgEl.innerHTML = t('mochen.dlg.vol3');
    else if (G.worldState.boss2Defeated) dlgEl.innerHTML = t('mochen.dlg.boss2');
    else if (claims.length > 0) dlgEl.innerHTML = t('mochen.dlg.progress');
    else dlgEl.innerHTML = t('mochen.dlg.intro');
  }
  if (echoEl) echoEl.textContent = t('smith.echoHold', echoes) + (claims.includes('vol3') ? t('mochen.echoMark') : '');

  listEl.innerHTML = '';
  const milestones = [
    {
      id: 'vol1',
      title: t('mochen.vol1.title'),
      condText: t('mochen.vol1.cond', readCnt, expPct),
      rewardText: t('mochen.vol1.reward'),
      met: readCnt >= 2 || expPct >= 35,
      claim: () => {
        G.worldState.echoes = (G.worldState.echoes || 0) + 160;
      }
    },
    {
      id: 'vol2',
      title: t('mochen.vol2.title'),
      condText: t('mochen.vol2.cond', seenCnt),
      rewardText: t('mochen.vol2.reward'),
      met: seenCnt >= 7 || !!G.worldState.boss2Defeated,
      claim: () => {
        G.worldState.bonusMaxSoul = (G.worldState.bonusMaxSoul || 0) + 20;
        G.worldState.echoes = (G.worldState.echoes || 0) + 260;
        if (G.player) {
          G.player.maxSoul = getPlayerMaxSoul();
          G.player.soul = G.player.maxSoul;
          G.player.flasks = G.player.maxFlasks;
        }
      }
    },
    {
      id: 'vol3',
      title: t('mochen.vol3.title'),
      condText: t('mochen.vol3.cond', LORE_TABLETS.length, readCnt, expPct),
      rewardText: t('mochen.vol3.reward'),
      met: readCnt >= LORE_TABLETS.length && expPct >= 80,
      claim: () => {
        G.worldState.bonusMaxHp = (G.worldState.bonusMaxHp || 0) + 15;
        G.worldState.echoes = (G.worldState.echoes || 0) + 400;
        if (G.player) {
          G.player.maxHp = getPlayerMaxHp();
          G.player.hp = G.player.maxHp;
        }
      }
    }
  ];

  for (const ms of milestones) {
    const claimed = claims.includes(ms.id);
    const card = document.createElement('div');
    card.className = `smith-card npc-quest-card${claimed ? ' done' : ms.met ? ' ready' : ''}`;
    const info = document.createElement('div');
    info.className = 'smith-card-info';
    info.innerHTML = `
      <div class="smith-card-title">
        <span>${claimed ? '✦ ' : ''}${ms.title}</span>
        <span class="smith-lv-pill">${claimed ? t('mochen.statusDone') : ms.met ? t('mochen.statusReady') : t('mochen.statusProg')}</span>
      </div>
      <div class="smith-card-desc">${t('npc.condLabel')}${ms.condText}<br>${t('npc.rewardLabel')}${ms.rewardText}</div>
    `;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'smith-buy-btn';
    btn.disabled = claimed || !ms.met;
    btn.textContent = claimed ? t('mochen.btnDone') : ms.met ? t('mochen.btnReady') : t('mochen.btnLocked');
    if (!claimed && ms.met) {
      btn.addEventListener('click', () => {
        claims.push(ms.id);
        ms.claim();
        audio.playResonanceBell(587.33, true);
        triggerHaptic('shieldBreak', 0.85);
        checkAchievements();
        saveProgress(true);
        renderChroniclerModal();
        syncHUD(true);
      });
    }
    card.append(info, btn);
    listEl.appendChild(card);
  }

  // Chronicler's Map-Pinning Cartography Service (120 Echoes -> pin 1 undiscovered treasure or unbroken secret wall!)
  const remainingTargets = [];
  for (const pk of G.worldState.pickups) {
    if (!pk.collected) remainingTargets.push({ x: pk.x, y: pk.y - 24, roomId: pk.roomId, label: locPickup(pk, 'name'), pinType: 'foe' });
  }
  for (const sw of G.worldState.secretWalls) {
    if (!sw.broken) remainingTargets.push({ x: sw.x + sw.w * 0.5, y: sw.y + sw.h * 0.5, roomId: sw.roomId, label: t('mochen.secretWallLabel'), pinType: 'wall' });
  }
  const existingPins = Array.isArray(G.worldState.mapPins) ? G.worldState.mapPins : [];
  const unpinned = remainingTargets.filter(tgt => !existingPins.some(p => Math.hypot(p.x - tgt.x, p.y - tgt.y) < 70));

  const svcCard = document.createElement('div');
  svcCard.className = 'smith-card npc-service-card';
  const svcInfo = document.createElement('div');
  svcInfo.className = 'smith-card-info';
  svcInfo.innerHTML = `
    <div class="smith-card-title">
      <span>${t('mochen.svcTitle')}</span>
      <span class="smith-lv-pill">${t('mochen.svcPill', unpinned.length)}</span>
    </div>
    <div class="smith-card-desc">${t('mochen.svcDesc')}</div>
  `;
  const svcBtn = document.createElement('button');
  svcBtn.type = 'button';
  svcBtn.className = 'smith-buy-btn';
  const canMap = unpinned.length > 0 && echoes >= 120;
  svcBtn.disabled = !canMap;
  svcBtn.textContent = unpinned.length === 0 ? t('mochen.svcDone') : t('mochen.svcBtn');
  if (canMap) {
    svcBtn.addEventListener('click', () => {
      const target = unpinned[0];
      G.worldState.echoes -= 120;
      ensureCodexState();
      if (G.worldState.mapPins.length >= 36) G.worldState.mapPins.shift();
      G.worldState.mapPins.push({
        id: `pin_chr_${Date.now().toString(36)}`,
        x: Math.round(target.x),
        y: Math.round(target.y),
        type: target.pinType
      });
      const rm = ROOMS.find(r => r.id === target.roomId);
      G.minimapDirty = true;
      audio.playResonanceBell(523.25, false);
      saveProgress(false);
      renderChroniclerModal();
      syncHUD(true);
      if (dlgEl) {
        dlgEl.innerHTML = t('mochen.pinnedDlg', rm ? locRoomName(rm) : locZoneName('晦渊'), target.label);
      }
    });
  }
  svcCard.append(svcInfo, svcBtn);
  listEl.appendChild(svcCard);
}

export function openKeeperModal(npc) {
  const nq = ensureNpcQuests();
  if (nq && !nq.metKeeper) {
    nq.metKeeper = true;
    saveProgress(false);
  }
  activeNpcModalRef = npc;
  renderKeeperModal();
  audio.playResonanceBell(554.37, false);
  openModal('npc');
}

function renderKeeperModal() {
  if (!G.worldState) return;
  const nq = ensureNpcQuests();
  const titleEl = document.getElementById('npc-modal-title');
  const subEl = document.getElementById('npc-modal-sub');
  const dlgEl = document.getElementById('npc-dialogue');
  const echoEl = document.getElementById('npc-echo-bar');
  const listEl = document.getElementById('npc-quest-list');
  if (!listEl) return;

  const hasDawn = !!(G.worldState.keyItems && G.worldState.keyItems.dawnSigil);
  const gifted = !!nq.keeperWickGifted;
  const blessed = !!nq.keeperBlessingActive;
  const echoes = G.worldState.echoes || 0;

  if (titleEl) titleEl.textContent = locNpcName(activeNpcModalRef, 'keeper');
  if (subEl) subEl.textContent = t('xi.sub');

  if (dlgEl) {
    if (G.worldState.boss3Defeated) dlgEl.innerHTML = t('xi.dlg.boss3');
    else if (gifted) dlgEl.innerHTML = t('xi.dlg.gifted');
    else if (hasDawn) dlgEl.innerHTML = t('xi.dlg.hasDawn');
    else dlgEl.innerHTML = t('xi.dlg.intro');
  }
  if (echoEl) echoEl.textContent = t('smith.echoHold', echoes) + (blessed ? t('xi.blessedTag') : '');

  listEl.innerHTML = '';

  // Quest 1: Last Wick to Dawn
  const qCard = document.createElement('div');
  qCard.className = `smith-card npc-quest-card${gifted ? ' done' : hasDawn ? ' ready' : ''}`;
  const qInfo = document.createElement('div');
  qInfo.className = 'smith-card-info';
  qInfo.innerHTML = `
    <div class="smith-card-title">
      <span>${gifted ? '✦ ' : ''}${t('xi.quest.title')}</span>
      <span class="smith-lv-pill">${gifted ? t('xi.quest.pillDone') : hasDawn ? t('xi.quest.pillReady') : t('xi.quest.pillWait')}</span>
    </div>
    <div class="smith-card-desc">${t('npc.condLabel')}${t('xi.quest.cond')}<br>${t('npc.rewardLabel')}${t('xi.quest.reward')}</div>
  `;
  const qBtn = document.createElement('button');
  qBtn.type = 'button';
  qBtn.className = 'smith-buy-btn';
  qBtn.disabled = gifted || !hasDawn;
  qBtn.textContent = gifted ? t('xi.quest.btnDone') : hasDawn ? t('xi.quest.btnReady') : t('xi.quest.btnLocked');
  if (!gifted && hasDawn) {
    qBtn.addEventListener('click', () => {
      nq.keeperWickGifted = true;
      G.worldState.echoes = (G.worldState.echoes || 0) + 300;
      if (G.player) {
        G.player.hp = G.player.maxHp;
        G.player.flasks = G.player.maxFlasks;
      }
      audio.playEndingChord(true, 0);
      triggerHaptic('shieldBreak', 1.0);
      checkAchievements();
      saveProgress(true);
      renderKeeperModal();
      syncHUD(true);
    });
  }
  qCard.append(qInfo, qBtn);
  listEl.appendChild(qCard);

  // Service 2: 「守灯祝福」 (80 Echoes -> Lethal hit survival miracle + 2x passive soul regen)
  const bCard = document.createElement('div');
  bCard.className = `smith-card npc-service-card${blessed ? ' done' : ''}`;
  const bInfo = document.createElement('div');
  bInfo.className = 'smith-card-info';
  bInfo.innerHTML = `
    <div class="smith-card-title">
      <span>${blessed ? '✦ ' : ''}${t('xi.bless.title')}</span>
      <span class="smith-lv-pill">${blessed ? t('xi.bless.pillOn') : t('xi.bless.pillOff')}</span>
    </div>
    <div class="smith-card-desc">${t('xi.bless.desc')}</div>
  `;
  const bBtn = document.createElement('button');
  bBtn.type = 'button';
  bBtn.className = 'smith-buy-btn';
  const canBless = !blessed && echoes >= 80;
  bBtn.disabled = !canBless;
  bBtn.textContent = blessed ? t('xi.bless.btnOn') : t('xi.bless.btnBuy');
  if (canBless) {
    bBtn.addEventListener('click', () => {
      G.worldState.echoes -= 80;
      nq.keeperBlessingActive = true;
      audio.playHeal();
      audio.playResonanceBell(659.25, false);
      triggerHaptic('parry', 0.8);
      saveProgress(false);
      renderKeeperModal();
      syncHUD(true);
    });
  }
  bCard.append(bInfo, bBtn);
  listEl.appendChild(bCard);
}

export function openSmithModal(npc) {
  activeNpcModalRef = npc || { id: 'npc_smith', kind: 'smith' };
  renderSmithModal();
  audio.playResonanceBell(440, false);
  openModal('smith');
}

export function renderSmithModal() {
  if (!G.worldState) return;
  const titleEl = document.getElementById('smith-modal-title');
  if (titleEl) titleEl.textContent = locNpcName(activeNpcModalRef, 'smith');
  if (!G.worldState.smithUpgrades) G.worldState.smithUpgrades = { blade: 0, posture: 0, forge: 0 };
  const echoes = G.worldState.echoes || 0;
  const dlg = document.getElementById('smith-dialogue');
  if (dlg) {
    const u = G.worldState.smithUpgrades;
    if (G.worldState.boss3Defeated) {
      const endCnt = (G.worldState.endingsUnlocked || []).length;
      dlg.innerHTML = endCnt >= 2 ? t('smith.dlg.bothEnds') : t('smith.dlg.boss3');
    } else if (G.worldState.boss2Defeated) {
      dlg.innerHTML = t('smith.dlg.boss2');
    } else if (G.worldState.npcQuests && G.worldState.npcQuests.keeperWickGifted) {
      dlg.innerHTML = t('smith.dlg.keeper');
    } else if (G.worldState.npcQuests && G.worldState.npcQuests.metChronicler && !(G.worldState.npcQuests.chroniclerClaims || []).includes('vol3')) {
      dlg.innerHTML = t('smith.dlg.chronicler');
    } else if (G.worldState.abilities.doubleJump) {
      dlg.innerHTML = t('smith.dlg.wings');
    } else if (G.worldState.bossDefeated) {
      dlg.innerHTML = t('smith.dlg.boss1');
    } else if (u.blade + u.posture + u.forge > 0) {
      dlg.innerHTML = t('smith.dlg.upgraded');
    } else {
      dlg.innerHTML = t('smith.dlg.intro');
    }
  }

  const bar = document.getElementById('smith-echo-bar');
  if (bar) bar.textContent = t('smith.echoHold', echoes);

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
        <span>${locSmithUpgrade(upg, 'name', lv)}</span>
        <span class="smith-lv-pill">Lv.${lv} / ${maxLv} · ${locSmithUpgrade(upg, 'bonus', lv)}</span>
      </div>
      <div class="smith-card-desc">${locSmithUpgrade(upg, 'desc', lv)}</div>
    `;
    const btn = document.createElement('button');
    btn.className = 'smith-buy-btn';
    btn.disabled = !canBuy;
    btn.textContent = isMax ? t('smith.maxed') : t('smith.temperBtn', cost);
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
  activeLoreTabletRef = tablet;
  if (tablet && tablet.id) recordTabletRead(tablet.id);
  renderLoreModal();
  openModal('lore');
}

function renderLoreModal() {
  if (!activeLoreTabletRef) return;
  document.getElementById('lore-modal-title').textContent = locTablet(activeLoreTabletRef, 'title');
  document.getElementById('lore-modal-sub').textContent = locTablet(activeLoreTabletRef, 'sub');
  document.getElementById('lore-modal-body').innerHTML = locTablet(activeLoreTabletRef, 'html');
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
  initMapInteractions();
  mapFocusedRoomId = G.currentRoomId || (ROOMS[0] && ROOMS[0].id) || null;
  openModal('map');
  renderMapPinToolbar();
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
      { val: 1.0, label: t('settings.parryStd') },
      { val: 1.35, label: t('settings.parryWide') },
      { val: 1.7, label: t('settings.parryAssist') }
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
      { val: 1.0, label: t('settings.dmg100') },
      { val: 0.7, label: t('settings.dmg70') },
      { val: 0.5, label: t('settings.dmg50') }
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
    musBtn.textContent = on ? t('settings.on') : t('settings.off');
    musBtn.classList.toggle('active', on);
  }
  const bioLbl = document.getElementById('settings-biome-ambience');
  if (bioLbl) {
    bioLbl.textContent = audio.getActiveBiomeAmbienceLabel();
  }

  const lightBtn = document.getElementById('btn-lighting-toggle');
  if (lightBtn) {
    const highLight = G.settings.dynamicLighting !== false;
    lightBtn.textContent = highLight ? t('settings.lightStd') : t('settings.lightLow');
    lightBtn.classList.toggle('active', highLight);
  }

  const perfBtn = document.getElementById('btn-perf-toggle');
  if (perfBtn) {
    const on = !!G.settings.showPerf;
    perfBtn.textContent = on ? t('settings.perfOn') : t('settings.perfOff');
    perfBtn.classList.toggle('active', on);
  }

  const hz = prof.getRefreshHz();
  const hzLabel = document.getElementById('fps-hz-label');
  if (hzLabel) {
    hzLabel.textContent = t('settings.fpsHzLabel', hz);
  }
  const fpsGroup = document.getElementById('fps-cap-group');
  if (fpsGroup) {
    fpsGroup.innerHTML = '';
    const curDiv = Math.max(1, Number(G.settings.fpsDivisor) || 1);
    const opts = prof.getDivisorOptions();
    opts.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = `seg-btn${curDiv === opt.div ? ' active' : ''}`;
      const divLbl = opt.div === 1
        ? t('settings.fpsNative', hz)
        : opt.div === 2
          ? t('settings.fpsHalf', Math.round(hz / 2))
          : opt.div === 3
            ? t('settings.fpsThird', Math.round(hz / 3))
            : t('settings.fpsQuarter', Math.round(hz / 4));
      btn.textContent = divLbl;
      btn.addEventListener('click', () => {
        G.settings.fpsDivisor = opt.div;
        prof.resetRolling();
        saveUserSettings();
        renderSettingsModal();
      });
      fpsGroup.appendChild(btn);
    });
  }

  const hsGroup = document.getElementById('hitstop-mode-group');
  if (hsGroup) {
    hsGroup.innerHTML = '';
    const curHs = G.settings.hitstopMode || 'standard';
    [
      { val: 'standard', label: t('settings.hitstopStd') },
      { val: 'light', label: t('settings.hitstopLight') },
      { val: 'off', label: t('settings.hitstopOff') }
    ].forEach(opt => {
      const btn = document.createElement('button');
      btn.className = `seg-btn${curHs === opt.val ? ' active' : ''}`;
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        G.settings.hitstopMode = opt.val;
        if (opt.val === 'off') G.hitstopTimer = 0;
        saveUserSettings();
        renderSettingsModal();
      });
      hsGroup.appendChild(btn);
    });
  }

  const hapBtn = document.getElementById('btn-haptics-toggle');
  if (hapBtn) {
    hapBtn.textContent = G.settings.haptics ? t('settings.hapticsOn') : t('settings.hapticsOff');
    hapBtn.classList.toggle('active', !!G.settings.haptics);
  }

  const kbGrid = document.getElementById('keybind-grid');
  if (kbGrid) {
    kbGrid.innerHTML = '';
    for (const act of ACTION_META) {
      const row = document.createElement('div');
      row.className = 'keybind-item';
      const lbl = document.createElement('span');
      lbl.textContent = locActionLabel(act.id, act.label);
      const btn = document.createElement('button');
      btn.className = 'keybind-btn';
      btn.textContent = getActionKeyLabel(act.id);
      btn.addEventListener('click', () => {
        kbGrid.querySelectorAll('.keybind-btn').forEach(b => b.classList.remove('listening'));
        btn.classList.add('listening');
        btn.textContent = t('settings.pressKey');
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
      const isPrimary = idx === 0;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `relic-slot-medallion ${isPrimary ? 'primary' : 'secondary'}${G.activeRelicSlot === idx ? ' active' : ''}${r ? ' filled' : ' vacant'}`;
      btn.innerHTML = `
        <span class="slot-crest">${isPrimary ? SLOT_EMBLEMS.primary : SLOT_EMBLEMS.secondary}</span>
        <span class="slot-emblem-box">${r ? getRelicEmblemSvg(r.id) : SLOT_EMBLEMS.empty}</span>
        <span class="slot-info">
          <span class="slot-kicker">${isPrimary ? t('altar.slotPrimary') : t('altar.slotSecondary')}</span>
          <span class="slot-val">${r ? locRelic(r, 'name') : t('altar.slotEmpty')}</span>
        </span>
      `;
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
        card.innerHTML = `<div class="synergy-title"><span>${t('altar.synergyActive', locSynergy(syn, 'name'))}</span></div><div class="synergy-desc">${locSynergy(syn, 'desc')}</div>`;
        synBox.appendChild(card);
      }
    } else {
      const unlocked = G.worldState ? G.worldState.unlockedRelics : new Set(['thorn', 'mirror', 'ember']);
      const readyHints = RELIC_SYNERGIES
        .filter(s => s.relics.every(id => unlocked.has(id)))
        .map(s => {
          const names = s.relics.map(id => locRelic(RELICS.find(r => r.id === id) || id, 'name') || id);
          return isEn() ? `[${names[0]} + ${names[1]}]` : `「${names[0]} + ${names[1]}」`;
        });
      const card = document.createElement('div');
      card.className = 'synergy-card empty';
      card.textContent = readyHints.length > 0
        ? t('altar.synergyHintReady', readyHints.join(isEn() ? ', ' : '、'))
        : t('altar.synergyHintEmpty');
      synBox.appendChild(card);
    }
  }

  const list = document.getElementById('relic-list');
  list.innerHTML = '';

  for (const relic of RELICS) {
    const unlocked = !relic.hidden || (G.worldState && G.worldState.unlockedRelics.has(relic.id));
    const eqSlot = unlocked ? G.equippedRelics.findIndex(r => r && r.id === relic.id) : -1;
    const card = document.createElement('div');
    card.className = `relic-card${eqSlot >= 0 ? ' equipped' : ''}${eqSlot === 1 ? ' equipped-sub' : ''}${unlocked ? '' : ' locked'}`;

    const head = document.createElement('div');
    head.className = 'relic-card-head';
    const emblemWrap = document.createElement('div');
    emblemWrap.className = 'relic-emblem-wrap';
    emblemWrap.innerHTML = unlocked ? getRelicEmblemSvg(relic.id) : getRelicEmblemSvg('locked');

    const titleCol = document.createElement('div');
    titleCol.className = 'relic-title-col';
    if (unlocked) {
      const slotIcon = eqSlot === 0
        ? `<span class="relic-slot-badge primary" title="${t('altar.badgePrimaryTip')}">${SLOT_EMBLEMS.primary}${t('altar.badgePrimary')}</span>`
        : eqSlot === 1
          ? `<span class="relic-slot-badge secondary" title="${t('altar.badgeSecondaryTip')}">${SLOT_EMBLEMS.secondary}${t('altar.badgeSecondary')}</span>`
          : (relic.tag ? `<span class="relic-style-tag">${locRelic(relic, 'tag')}</span>` : '');
      titleCol.innerHTML = `<div class="relic-name"><span>${locRelic(relic, 'name')}</span></div><div class="relic-badge-row">${slotIcon}</div>`;
    } else {
      titleCol.innerHTML = `<div class="relic-name"><span>${t('altar.relicUnknown')}</span></div><div class="relic-badge-row"><span class="relic-style-tag locked">${t('altar.relicLocked')}</span></div>`;
    }
    head.append(emblemWrap, titleCol);

    const body = document.createElement('div');
    body.className = 'relic-body';
    if (unlocked) {
      const usageTxt = locRelic(relic, 'usage');
      body.innerHTML =
        `<div class="relic-effect">${locRelic(relic, 'effect') || locRelic(relic, 'desc')}</div>` +
        (usageTxt ? `<div class="relic-usage"><span>${t('altar.relicUsageTag')}</span>${usageTxt}</div>` : '');
    } else {
      body.innerHTML = `<div class="relic-hint">${locRelic(relic, 'hint') || t('altar.relicDefaultHint')}</div>`;
    }
    card.append(head, body);

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
        for (const syn of getActiveSynergies()) recordSynergyDiscovered(syn.id);
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
      btn.textContent = t('altar.warpBtn', locAltar(altar, 'shortName'));
      btn.addEventListener('click', () => {
        G.worldState.activeAltarId = altar.id;
        saveProgress(false);
        respawnAtActiveAltar();
        audio.playBellToll();
        spawnFloatText(altar.x, altar.y - 84, t('altar.warpedToast', locAltar(altar, 'shortName')), COLORS.cyanBright, 18, 1.2);
      });
      warpRow.appendChild(btn);
    }
  }

  // Render Bell-Vow Constraints (钟誓制约) Toggle Section
  const vowBox = document.getElementById('altar-vow-section');
  if (vowBox && G.worldState) {
    if (!G.worldState.activeVows) G.worldState.activeVows = new Set();
    const vs = getActiveVowStats();
    const sc = getCombatScaling(false);
    vowBox.innerHTML = '';
    const vHead = document.createElement('div');
    vHead.className = 'echo-heading';
    vHead.innerHTML = `<span>${t('altar.vowHeading')}</span><span style="font-size:10.5px;color:${vs.count > 0 ? 'var(--crimson-bright)' : 'var(--parchment-dim)'};letter-spacing:1px;">${t('altar.vowCount', vs.count, sc.echoMult.toFixed(2))}</span>`;
    vowBox.appendChild(vHead);

    const vGrid = document.createElement('div');
    vGrid.className = 'vow-grid';
    for (const vc of VOW_CONSTRAINTS) {
      const active = G.worldState.activeVows.has(vc.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `vow-chip${active ? ' active' : ''}`;
      btn.innerHTML = `<div class="vow-chip-head"><span>${active ? '✦ ' : ''}${locVow(vc, 'name')}</span><span class="vow-bonus">+${vc.bonusPct}%</span></div><div class="vow-chip-desc">${locVow(vc, 'desc')}</div>`;
      btn.addEventListener('click', () => {
        if (G.worldState.activeVows.has(vc.id)) G.worldState.activeVows.delete(vc.id);
        else G.worldState.activeVows.add(vc.id);
        if (G.player) {
          G.player.maxFlasks = getPlayerMaxFlasks();
          G.player.flasks = G.player.maxFlasks;
        }
        audio.playResonanceBell(active ? 349.23 : 523.25, false);
        saveProgress(false);
        renderRelicChoices();
        syncHUD(true);
      });
      vGrid.appendChild(btn);
    }
    vowBox.appendChild(vGrid);
  }

  // Render Vow Echoes (Boss Rematch & Boss Rush) Section
  const echoBox = document.getElementById('altar-echo-section');
  if (echoBox) {
    echoBox.innerHTML = '';
    const heading = document.createElement('div');
    heading.className = 'echo-heading';
    heading.innerHTML = `<span>${t('altar.echoHeading')}</span><span style="font-size:10.5px;color:var(--parchment-dim);letter-spacing:1px;">${t('altar.echoSub')}</span>`;
    echoBox.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'echo-grid';

    const echoDefs = [
      {
        mode: 'hui',
        title: locBoss(G.boss || { id: 'boss_hui', name: '断钟骑士 · 晦' }, 'name'),
        unlocked: !!(G.worldState && G.worldState.bossDefeated),
        lockHint: t('altar.echoHuiLock'),
        sub: t('altar.echoHuiSub')
      },
      {
        mode: 'ji',
        title: locBoss(G.boss2 || { id: 'boss_ji', name: '沉渊铸钟师 · 寂' }, 'name'),
        unlocked: !!(G.worldState && G.worldState.boss2Defeated),
        lockHint: t('altar.echoJiLock'),
        sub: t('altar.echoJiSub')
      },
      {
        mode: 'yuan',
        title: locBoss(G.boss3 || { id: 'boss_yuan', name: '初钟圣骸 · 渊' }, 'name'),
        unlocked: !!(G.worldState && G.worldState.boss3Defeated),
        lockHint: t('altar.echoYuanLock'),
        sub: t('altar.echoYuanSub')
      },
      {
        mode: 'rush',
        title: t('altar.echoRushTitle'),
        unlocked: !!(G.worldState && G.worldState.bossDefeated && G.worldState.boss2Defeated && G.worldState.boss3Defeated),
        lockHint: t('altar.echoRushLock'),
        sub: t('altar.echoRushSub')
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
      titleSpan.textContent = def.unlocked ? def.title : `${t('altar.relicUnknown')} · ${def.title}`;
      titleRow.appendChild(titleSpan);
      if (def.unlocked && rec && rec.bestGrade) {
        const pill = document.createElement('span');
        pill.className = 'echo-grade-pill' + (rec.bestGrade === 'S+' ? ' splus' : '');
        pill.textContent = rec.bestVows > 0 ? t('altar.echoGradeVows', rec.bestGrade, rec.bestVows) : rec.bestGrade;
        titleRow.appendChild(pill);
      }
      const meta = document.createElement('div');
      meta.className = 'echo-btn-meta';
      if (!def.unlocked) {
        meta.textContent = def.lockHint;
      } else if (rec && typeof rec.bestTimeSec === 'number') {
        const m = Math.floor(rec.bestTimeSec / 60);
        const s = Math.floor(rec.bestTimeSec % 60).toString().padStart(2, '0');
        meta.textContent = t('altar.echoBestMeta', def.sub, m, s, rec.clears || 1);
      } else {
        meta.textContent = t('altar.echoNoClear', def.sub);
      }
      btn.append(titleRow, meta);
      if (def.unlocked) {
        btn.addEventListener('click', () => startEchoChallenge(def.mode));
      }
      grid.appendChild(btn);
    }
    echoBox.appendChild(grid);

    // True NG+ (残誓轮回) Entry Bar inside Altar once game cleared or already in NG+
    const canNgPlus = !!(G.worldState && (G.worldState.boss3Defeated || (G.worldState.endingsUnlocked && G.worldState.endingsUnlocked.length > 0) || (G.worldState.ngPlusCycle || 1) >= 2));
    if (canNgPlus) {
      const curCyc = Math.max(1, G.worldState.ngPlusCycle || 1);
      const nextCyc = curCyc + 1;
      const ngWrap = document.createElement('div');
      ngWrap.className = 'ngplus-bar';
      const ngInfo = document.createElement('div');
      ngInfo.className = 'ngplus-info';
      ngInfo.innerHTML = t('altar.ngInfo', curCyc);
      const ngBtn = document.createElement('button');
      ngBtn.type = 'button';
      ngBtn.className = 'ngplus-btn';
      ngBtn.textContent = t('altar.ngBtn', nextCyc);
      ngBtn.addEventListener('click', () => {
        if (window.confirm(t('altar.ngConfirm', nextCyc))) {
          startNewGamePlus();
        }
      });
      ngWrap.append(ngInfo, ngBtn);
      echoBox.appendChild(ngWrap);
    }
  }

}

export function evaluateEchoGrade(mode, elapsedSec, dmgTaken) {
  if (dmgTaken === 0) return { code: 'S+', label: t('grade.S+') };
  const targetSec = mode === 'rush' ? 235 : mode === 'yuan' ? 105 : 78;
  if (dmgTaken <= 30 && elapsedSec <= targetSec) return { code: 'S', label: t('grade.S') };
  if (dmgTaken <= 80) return { code: 'A', label: t('grade.A') };
  return { code: 'B', label: t('grade.B') };
}

export function setupEchoArena(stageBoss) {
  G.enemies = [];
  G.boss = createBoss();
  G.boss2 = createBoss2();
  G.boss3 = createBoss3();
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
    G.boss3.alive = false;
    G.player = createPlayer(2780, FLOOR_Y - 54);
    G.cam = { x: Math.max(2620, Math.min(3780 - G.canvasW, 3100 - G.canvasW * 0.5)), y: 0, shake: 8, kickX: 0, kickY: 0, zoom: 1 };
    triggerBossBanner(t('boss.echoHuiTitle'), t('boss.echoHuiQuote'), COLORS.parchment, 2.3);
  } else if (stageBoss === 'ji') {
    G.boss.alive = false;
    G.boss2.awake = true;
    G.boss3.alive = false;
    const keepFlasks = (G.echoSession && G.echoSession.mode === 'rush' && G.player) ? Math.min(getPlayerMaxFlasks(), G.player.flasks + 1) : getPlayerMaxFlasks();
    const keepHp = (G.echoSession && G.echoSession.mode === 'rush' && G.player) ? Math.min(G.player.maxHp, Math.max(55, G.player.hp + 45)) : getPlayerMaxHp();
    G.player = createPlayer(5710, WELL_BOTTOM_Y - 54);
    G.player.flasks = keepFlasks;
    G.player.hp = keepHp;
    G.cam = { x: Math.max(5556, Math.min(WORLD_W - G.canvasW, 6080 - G.canvasW * 0.5)), y: Math.max(780, WORLD_H - G.canvasH), shake: 8, kickX: 0, kickY: 0, zoom: 1 };
    triggerBossBanner(t('boss.echoJiTitle'), t('boss.echoJiQuote'), COLORS.goldBright, 2.3);
  } else {
    G.boss.alive = false;
    G.boss2.alive = false;
    G.boss3.awake = true;
    const keepFlasks = (G.echoSession && G.echoSession.mode === 'rush' && G.player) ? Math.min(getPlayerMaxFlasks(), G.player.flasks + 1) : getPlayerMaxFlasks();
    const keepHp = (G.echoSession && G.echoSession.mode === 'rush' && G.player) ? Math.min(G.player.maxHp, Math.max(65, G.player.hp + 55)) : getPlayerMaxHp();
    G.player = createPlayer(8480, FLOOR_Y - 54);
    G.player.flasks = keepFlasks;
    G.player.hp = keepHp;
    G.cam = { x: Math.max(8350, Math.min(WORLD_W - G.canvasW, 8950 - G.canvasW * 0.5)), y: 0, shake: 10, kickX: 0, kickY: 0, zoom: 1 };
    triggerBossBanner(t('boss.echoYuanTitle'), t('boss.echoYuanQuote'), COLORS.goldBright, 2.5);
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
  setupEchoArena(mode === 'yuan' ? 'yuan' : mode === 'ji' ? 'ji' : 'hui');
}

export function advanceEchoRushStage2() {
  if (!G.echoSession || G.echoSession.mode !== 'rush') return;
  setupEchoArena('ji');
}

export function advanceEchoRushStage3() {
  if (!G.echoSession || G.echoSession.mode !== 'rush') return;
  setupEchoArena('yuan');
}

export function interactWithAltar(altar) {
  if (!G.worldState) return;
  const firstLight = !G.worldState.litAltars.has(altar.id);
  G.worldState.litAltars.add(altar.id);
  G.worldState.activeAltarId = altar.id;
  document.getElementById('altar-modal-title').textContent = locAltar(altar, 'shortName');
  if (firstLight) {
    spawnShockwave(altar.x, altar.y - 46, 130, COLORS.cyanBright, 4.5, 0.42);
    spawnParticles(altar.x, altar.y - 46, 30, { color: COLORS.cyanBright, speed: 220, spark: true, life: 0.6 });
    spawnFloatText(altar.x, altar.y - 96, t('altar.litToast', locAltar(altar, 'shortName')), COLORS.cyanBright, 20, 1.5);
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
  G.boss3 = createBoss3();
  if (G.worldState && G.worldState.bossDefeated) G.boss.alive = false;
  if (G.worldState && G.worldState.boss2Defeated) G.boss2.alive = false;
  if (G.worldState && G.worldState.boss3Defeated) G.boss3.alive = false;
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
  G.boss3 = createBoss3();
  if (G.worldState && G.worldState.bossDefeated) G.boss.alive = false;
  if (G.worldState && G.worldState.boss2Defeated) G.boss2.alive = false;
  if (G.worldState && G.worldState.boss3Defeated) G.boss3.alive = false;
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
    retryAltarBtn.textContent = t('death.retryAltar');
    deathSub.textContent = t('death.subEcho');
  } else {
    retryEchoBtn.style.display = 'none';
    retryAltarBtn.textContent = t('death.retry');
    deathSub.textContent = (G.worldState && G.worldState.lastDeathEchoMsg)
      ? G.worldState.lastDeathEchoMsg
      : t('death.sub');
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
    const activeVowInfo = getActiveVowStats();
    const vowCnt = activeVowInfo.count;
    let recordNote = '';
    if (G.worldState) {
      if (!G.worldState.echoRecords) G.worldState.echoRecords = { hui: null, ji: null, yuan: null, rush: null };
      const prev = G.worldState.echoRecords[mode];
      const isNewBestGrade = !prev || (ECHO_GRADE_ORDER[grade.code] > (ECHO_GRADE_ORDER[prev.bestGrade] || 0));
      const isNewBestTime = !prev || elapsed < prev.bestTimeSec;
      const isNewBestVows = !prev || vowCnt > (prev.bestVows || 0);
      G.worldState.echoRecords[mode] = {
        bestGrade: isNewBestGrade ? grade.code : prev.bestGrade,
        bestTimeSec: isNewBestTime ? Math.round(elapsed * 10) / 10 : prev.bestTimeSec,
        bestVows: isNewBestVows ? vowCnt : (prev.bestVows || 0),
        clears: (prev ? (prev.clears || 0) : 0) + 1,
        noHit: (prev && prev.noHit) || G.echoSession.damageTaken === 0
      };
      if (isNewBestGrade || isNewBestTime || (vowCnt > 0 && isNewBestVows)) recordNote = t('victory.echoNewBest');
      checkAchievements({ echoNoHit: G.echoSession.damageTaken === 0, echoMode: mode, echoVows: vowCnt });
      saveProgress(false);
    }
    titleEl.textContent = vowCnt >= 4 ? t('victory.echoTitleVow') : t('victory.echoTitle');
    const modeTitle = mode === 'rush'
      ? t('victory.echoRushTitle')
      : mode === 'yuan'
        ? locBoss({ id: 'boss_yuan', name: '初钟圣骸 · 渊' }, 'name')
        : mode === 'ji'
          ? locBoss({ id: 'boss_ji', name: '沉渊铸钟师 · 寂' }, 'name')
          : locBoss({ id: 'boss_hui', name: '断钟骑士 · 晦' }, 'name');
    const vowSuffix = vowCnt > 0 ? t('victory.echoVowSuffix', vowCnt, getLocalizedVowShorts()) : '';
    subEl.textContent = t('victory.echoSub', modeTitle, grade.label, vowSuffix);
    statsEl.textContent = t('victory.echoStats', grade.label, vowSuffix, minutes, seconds, G.echoSession.parries, G.echoSession.executions, G.echoSession.damageTaken, recordNote);
    btnEchoAgain.style.display = 'inline-block';
    btnEnterWell.style.display = 'inline-block';
    btnEnterWell.textContent = t('death.retryAltar');
    btnPlayAgain.style.display = 'none';
  } else if (bossId === 'boss_ji') {
    const elapsed = Math.max(0, (performance.now() - G.stats.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60).toString().padStart(2, '0');
    titleEl.textContent = t('victory.jiTitle');
    subEl.textContent = t('victory.jiSub');
    statsEl.textContent = t('victory.jiStats', getExplorationPercent(), minutes, seconds, G.stats.parries, G.stats.executions, G.stats.damageTaken);
    btnEchoAgain.style.display = 'none';
    btnEnterWell.style.display = 'inline-block';
    btnEnterWell.textContent = t('victory.jiNext');
    btnPlayAgain.style.display = 'inline-block';
  } else {
    const elapsed = Math.max(0, (performance.now() - G.stats.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60).toString().padStart(2, '0');
    titleEl.textContent = t('victory.huiTitle');
    subEl.textContent = t('victory.huiSub');
    statsEl.textContent = t('victory.huiStats', minutes, seconds, G.stats.parries, G.stats.executions, G.stats.damageTaken);
    btnEchoAgain.style.display = 'none';
    btnEnterWell.style.display = 'inline-block';
    btnEnterWell.textContent = t('victory.huiNext');
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
  G.boss3 = createBoss3();
  G.bossBanner = null;
  G.endingState = null;
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

export function startNewGamePlus() {
  if (!G.levelBundle) return;
  if (!G.worldState) {
    startGame();
    return;
  }
  clearOutcomeTimer();
  hideAllOverlays();

  const prev = G.worldState;
  const nextCycle = Math.max(1, Math.floor(Number(prev.ngPlusCycle) || 1)) + 1;
  const keepEquipped = Array.isArray(G.equippedRelics) && G.equippedRelics.length >= 2
    ? [G.equippedRelics[0] || RELICS[0], G.equippedRelics[1] || null]
    : [G.currentRelic || RELICS[0], null];

  const fresh = createFreshWorldState();
  fresh.ngPlusCycle = nextCycle;
  fresh.activeVows = new Set(prev.activeVows ? [...prev.activeVows] : []);
  fresh.unlockedRelics = new Set(prev.unlockedRelics ? [...prev.unlockedRelics] : ['thorn', 'mirror', 'ember']);
  fresh.smithUpgrades = { ...(prev.smithUpgrades || { blade: 0, posture: 0, forge: 0 }) };
  fresh.bonusFlasks = Math.min(3, Number(prev.bonusFlasks) || 0);
  fresh.bonusMaxHp = Number(prev.bonusMaxHp) || 0;
  fresh.bonusMaxSoul = Number(prev.bonusMaxSoul) || 0;
  fresh.echoes = Math.max(0, Number(prev.echoes) || 0);
  fresh.endingsUnlocked = Array.isArray(prev.endingsUnlocked) ? [...prev.endingsUnlocked] : [];
  fresh.echoRecords = prev.echoRecords ? JSON.parse(JSON.stringify(prev.echoRecords)) : { hui: null, ji: null, yuan: null, rush: null };
  fresh.codex = prev.codex ? JSON.parse(JSON.stringify(prev.codex)) : fresh.codex;
  if (prev.npcQuests) {
    fresh.npcQuests = {
      metChronicler: !!prev.npcQuests.metChronicler,
      chroniclerClaims: Array.isArray(prev.npcQuests.chroniclerClaims) ? [...prev.npcQuests.chroniclerClaims] : [],
      metKeeper: !!prev.npcQuests.metKeeper,
      keeperWickGifted: !!prev.npcQuests.keeperWickGifted,
      keeperBlessingActive: false
    };
  }
  fresh.mapPins = [];
  // Fresh world progression (bosses, fog, gates, abilities, keyItems reset for full NG+ replay)
  G.worldState = fresh;
  G.equippedRelics = keepEquipped;
  G.currentRelic = keepEquipped[0] || RELICS[0];
  G.activeRelicSlot = keepEquipped[1] ? 0 : 1;

  const spawnPt = ALTARS[0] ? { x: ALTARS[0].x - 14, y: ALTARS[0].y - 54 } : { x: 316, y: FLOOR_Y - 54 };
  G.player = createPlayer(spawnPt.x, spawnPt.y);
  markMapExplored(spawnPt.x + 14, spawnPt.y + 14);
  G.echoSession = null;
  G.enemies = createSentinels();
  G.boss = createBoss();
  G.boss2 = createBoss2();
  G.boss3 = createBoss3();
  G.endingState = null;
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
  G.screenFlash = { alpha: 0.24, color: COLORS.goldBright };
  G.cam = {
    x: Math.max(0, Math.min(Math.max(0, WORLD_W - G.canvasW), spawnPt.x - G.canvasW * 0.5)),
    y: Math.min(Math.max(0, WORLD_H - G.canvasH), Math.max(-40, spawnPt.y - G.canvasH * 0.55)),
    shake: 10, kickX: 0, kickY: 0, zoom: 1
  };
  G.stats = { parries: 0, executions: 0, damageTaken: 0, startTime: performance.now() };
  G.minimapDirty = true;
  G.gameState = 'playing';
  audio.init();
  audio.playBellToll();
  const sc = getCombatScaling(false);
  triggerBossBanner(
    t('ng.bannerTitle', nextCycle),
    t('ng.bannerQuote', sc.hpMult.toFixed(2), sc.echoMult.toFixed(2)),
    COLORS.goldBright,
    3.2
  );
  checkAchievements({ ngPlus: true });
  saveProgress(true);
  syncHUD(true);
}

export function continueIntoBellWell() {
  if (G.echoSession) {
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
  const intoAscent = !!(G.player && G.player.x > 5500);
  spawnFloatText(
    G.player.x + G.player.w / 2,
    G.player.y - 34,
    intoAscent ? t('victory.toastAscent') : t('victory.toastWell'),
    intoAscent ? COLORS.goldBright : COLORS.cyanBright,
    20,
    1.6
  );
}

/* ==================== FINALE: DUAL ENDING CHOICE & 4-ACT HAND-DRAWN INK CINEMATIC ==================== */
function renderEndingChoiceModal() {
  const hasDawn = !!(G.worldState && G.worldState.keyItems && G.worldState.keyItems.dawnSigil);
  const btnDawn = document.getElementById('btn-ending-dawn');
  const tagDawn = document.getElementById('ending-dawn-tag');
  const descDawn = document.getElementById('ending-dawn-desc');
  if (btnDawn) btnDawn.disabled = !hasDawn;
  if (tagDawn) tagDawn.textContent = hasDawn ? t('endChoice.tagBReady') : t('endChoice.tagBLocked');
  if (descDawn) descDawn.textContent = hasDawn ? t('endChoice.descBReady') : t('endChoice.descBLocked');
}

export function openEndingChoice() {
  clearOutcomeTimer();
  renderEndingChoiceModal();
  openModal('ending-choice');
}

export function startEndingCinematic(type = 'vow') {
  const key = type === 'dawn' ? 'dawn' : 'vow';
  if (G.worldState) {
    if (!Array.isArray(G.worldState.endingsUnlocked)) G.worldState.endingsUnlocked = [];
    if (!G.worldState.endingsUnlocked.includes(key)) G.worldState.endingsUnlocked.push(key);
    saveProgress(false);
  }
  G.endingState = { type: key, act: 0, t: 0, finished: false };
  const script = getEndingScript(key);
  document.getElementById('ending-cinema-header').textContent = script.title;
  document.getElementById('ending-cinema-header').style.color = key === 'dawn' ? '#fef08a' : '#bae6fd';
  document.getElementById('ending-act-text').style.display = 'block';
  document.getElementById('ending-epilogue-stats').style.display = 'none';
  document.getElementById('ending-act-controls').style.display = 'flex';
  document.getElementById('ending-epilogue-controls').style.display = 'none';
  syncEndingActUI();
  openModal('ending-cinematic');
  audio.playEndingChord(key === 'dawn', 0);
}

function syncEndingActUI() {
  if (!G.endingState) return;
  const script = getEndingScript(G.endingState.type);
  document.getElementById('ending-cinema-header').textContent = script.title;
  const actObj = script.acts[G.endingState.act];
  document.getElementById('ending-cinema-sub').textContent = `${actObj.sub} (${G.endingState.act + 1} / ${script.acts.length})`;
  document.getElementById('ending-act-text').textContent = actObj.text;
  document.getElementById('btn-ending-next').textContent = G.endingState.act >= script.acts.length - 1 ? t('ending.finalStats') : t('ending.nextAct');
}

function renderEndingEpilogueUI() {
  if (!G.endingState) return;
  const script = getEndingScript(G.endingState.type);
  const isDawn = G.endingState.type === 'dawn';
  const unlockedCount = G.worldState && Array.isArray(G.worldState.endingsUnlocked) ? G.worldState.endingsUnlocked.length : 1;
  const relicCnt = G.worldState ? G.worldState.unlockedRelics.size : 3;
  document.getElementById('ending-cinema-header').textContent = script.title;
  document.getElementById('ending-cinema-sub').textContent = isDawn
    ? t('ending.epilogueDawn', unlockedCount)
    : t('ending.epilogueVow', unlockedCount);
  const stEl = document.getElementById('ending-epilogue-stats');
  stEl.textContent = t('ending.epilogueStats', script.title, unlockedCount, getExplorationPercent(), relicCnt, RELICS.length, formatPlayTime(G.playTimeSec), G.stats.parries, G.stats.executions);
  const ngBtn = document.getElementById('btn-ending-ngplus');
  if (ngBtn) {
    const nextCyc = ((G.worldState && G.worldState.ngPlusCycle) ? G.worldState.ngPlusCycle : 1) + 1;
    ngBtn.textContent = t('ending.ngBtn', nextCyc);
  }
}

export function advanceEndingCinematic(skipAll = false) {
  if (!G.endingState) return;
  const script = getEndingScript(G.endingState.type);
  if (!skipAll && G.endingState.act < script.acts.length - 1) {
    G.endingState.act++;
    G.endingState.t = 0;
    syncEndingActUI();
    audio.playEndingChord(G.endingState.type === 'dawn', G.endingState.act);
    return;
  }
  G.endingState.finished = true;
  const isDawn = G.endingState.type === 'dawn';
  document.getElementById('ending-act-text').style.display = 'none';
  document.getElementById('ending-epilogue-stats').style.display = 'block';
  renderEndingEpilogueUI();
  document.getElementById('ending-act-controls').style.display = 'none';
  document.getElementById('ending-epilogue-controls').style.display = 'flex';
  audio.playEndingChord(isDawn, 3);
}

export function refreshActiveModalI18n() {
  if (G.activeModal === 'settings') renderSettingsModal();
  else if (G.activeModal === 'altar') {
    const altar = getActiveAltar();
    const titleEl = document.getElementById('altar-modal-title');
    if (titleEl && altar) titleEl.textContent = locAltar(altar, 'shortName');
    renderRelicChoices();
  } else if (G.activeModal === 'map') {
    renderMapPinToolbar();
    renderParchmentMap(HUD_DOM.fullMapCanvas, true);
  } else if (G.activeModal === 'codex') renderCodexModal();
  else if (G.activeModal === 'lore') renderLoreModal();
  else if (G.activeModal === 'smith') renderSmithModal();
  else if (G.activeModal === 'npc' && activeNpcModalRef) {
    if (activeNpcModalRef.kind === 'chronicler') renderChroniclerModal();
    else if (activeNpcModalRef.kind === 'keeper') renderKeeperModal();
  } else if (G.activeModal === 'pause') {
    const pt = document.querySelector('#pause-modal .modal-title');
    if (pt) pt.textContent = t('pause.title');
    const sub = document.getElementById('pause-slot-sub');
    if (sub) sub.textContent = t('pause.sub', G.activeSaveSlot + 1, getExplorationPercent(), formatPlayTime(G.playTimeSec));
  } else if (G.activeModal === 'ending-choice') renderEndingChoiceModal();
  else if (G.activeModal === 'ending-cinematic' && G.endingState) {
    if (G.endingState.finished) renderEndingEpilogueUI();
    else syncEndingActUI();
  }
}

export function updateAndRenderEndingCinematic(dt) {
  if (G.activeModal !== 'ending-cinematic' || !G.endingState) return;
  const cvs = document.getElementById('endingCanvas');
  if (!cvs) return;
  const c = cvs.getContext('2d');
  const w = cvs.width;
  const h = cvs.height;
  G.endingState.t += dt;
  const t = G.endingState.t;
  const act = G.endingState.act;
  const isDawn = G.endingState.type === 'dawn';
  c.clearRect(0, 0, w, h);

  const bg = c.createLinearGradient(0, 0, 0, h);
  if (isDawn && act >= 2) {
    bg.addColorStop(0, act === 3 ? '#3b2638' : '#26182c');
    bg.addColorStop(0.55, act === 3 ? '#c26d3a' : '#854d1e');
    bg.addColorStop(1, act === 3 ? '#fef08a' : '#291a16');
  } else if (isDawn) {
    bg.addColorStop(0, '#160d18'); bg.addColorStop(0.6, '#361a1d'); bg.addColorStop(1, '#0b080d');
  } else {
    bg.addColorStop(0, '#070c18'); bg.addColorStop(0.6, '#142238'); bg.addColorStop(1, '#05080f');
  }
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);

  c.fillStyle = isDawn && act >= 3 ? '#2c201b' : '#0b0f18';
  c.fillRect(0, h - 46, w, 46);
  c.strokeStyle = isDawn && act >= 2 ? 'rgba(254, 240, 138, 0.55)' : 'rgba(216, 207, 184, 0.35)';
  c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(0, h - 46); c.lineTo(w, h - 46); c.stroke();

  const cx = w * 0.5;
  if (!isDawn || act <= 1) {
    const split = (isDawn && act === 1) ? Math.min(46, Math.max(0, (t - 0.55) * 65)) : 0;
    [-1, 1].forEach(side => {
      c.save();
      c.translate(cx + side * split, 16 + split * 0.45);
      c.rotate(side * split * 0.008);
      c.fillStyle = '#15121a';
      c.strokeStyle = isDawn ? '#fde047' : (act >= 1 ? '#38bdf8' : '#d8cfb8');
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(0, 0); c.lineTo(side * 34, 0);
      c.quadraticCurveTo(side * 76, 86, side * 98, 152);
      c.lineTo(0, 152); c.closePath(); c.fill(); c.stroke();
      c.restore();
    });
    if (isDawn && act === 1) {
      const flashA = Math.max(0, 1 - Math.abs(t - 0.55) * 3.2);
      c.strokeStyle = `rgba(254, 249, 195, ${Math.max(0.25, flashA).toFixed(2)})`;
      c.lineWidth = 4 + flashA * 10;
      c.beginPath(); c.moveTo(40, 118); c.lineTo(w - 40, 88); c.stroke();
    } else if (!isDawn && act >= 2) {
      for (let i = 0; i < 3; i++) {
        const rr = ((t * 75 + i * 75) % 230) + 28;
        c.strokeStyle = `rgba(56, 189, 248, ${(1 - rr / 260).toFixed(2)})`;
        c.lineWidth = 2.2;
        c.beginPath(); c.arc(cx, 115, rr, 0, Math.PI * 2); c.stroke();
      }
    }
  } else {
    const sunY = act === 3 ? 132 - Math.min(26, t * 8) : 168 - Math.min(34, t * 12);
    const sg = c.createRadialGradient(cx, sunY, 10, cx, sunY, 195);
    sg.addColorStop(0, 'rgba(254, 249, 195, 0.95)');
    sg.addColorStop(0.42, 'rgba(245, 158, 11, 0.48)');
    sg.addColorStop(1, 'transparent');
    c.fillStyle = sg;
    c.beginPath(); c.arc(cx, sunY, 195, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fef9c3';
    c.beginPath(); c.arc(cx, sunY, 28, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(30, 20, 18, 0.85)';
    c.lineWidth = 18;
    c.beginPath(); c.arc(cx, h - 44, 158, Math.PI, 0); c.stroke();
  }

  const px = isDawn && act === 3 ? cx + Math.min(95, t * 24) : cx;
  const py = h - 46;
  c.save();
  c.translate(px, py);
  c.fillStyle = '#0c101a';
  c.strokeStyle = isDawn && act >= 2 ? '#fef08a' : '#d8cfb8';
  c.lineWidth = 1.6;
  const sway = Math.sin(t * 2.8) * 5;
  c.beginPath();
  c.moveTo(-14, 0); c.lineTo(-9, -38); c.lineTo(9, -38); c.lineTo(15 + sway * 0.4, 0); c.closePath();
  c.fill(); c.stroke();
  c.beginPath(); c.arc(0, -45, 8.5, 0, Math.PI * 2); c.fill(); c.stroke();
  c.fillStyle = isDawn ? '#fde047' : '#38bdf8';
  c.beginPath(); c.arc(isDawn ? 14 : 11, -24 - (act === 1 && !isDawn ? Math.min(48, t * 28) : 0), 4.5, 0, Math.PI * 2); c.fill();
  c.restore();

  for (let i = 0; i < 24; i++) {
    const mx = ((i * 73 + t * (isDawn ? 26 : -18)) % (w + 40) + w + 40) % (w + 40) - 20;
    const my = ((i * 41 - t * (isDawn ? 22 : 12)) % h + h) % h;
    c.fillStyle = isDawn ? 'rgba(254, 240, 138, 0.58)' : 'rgba(186, 230, 253, 0.36)';
    c.beginPath(); c.arc(mx, my, 1.5 + (i % 3) * 0.6, 0, Math.PI * 2); c.fill();
  }
}
