// Live HUD Synchronization, Weapon Quick-Bar & Title Save-Slot UI (split from src/ui.js in v32.0)
import {
  COLORS, RELICS, RELIC_SYNERGIES, VOW_CONSTRAINTS, DUMMY_MODES, SMITH_UPGRADES, ACTION_META, ROOMS, SOLIDS, ALTARS, NPCS, LORE_TABLETS, PICKUPS_DEF, ENEMIES_DEF, BOSSES_DEF,
  SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_ENTRY_GATE_DEF, FOUNDRY_EXIT_GATE_DEF, FIRST_BELL_CORE_POS, VOID_BARRIERS, WORLD_SWITCHES_DEF,
  ABYSSAL_RIVERS, WIND_ZONES, BOUNCE_PADS, WORLD_MIN_X, WORLD_MIN_Y, WORLD_W, WORLD_H, WORLD_SPAN_W, WORLD_SPAN_H, FLOOR_Y, WELL_BOTTOM_Y,
  MAP_COLS, MAP_ROWS, MAP_CELL_W, MAP_CELL_H, ECHO_GRADE_ORDER, SEVEN_BELLS_ORDER
} from '../config.js';
import { getRoomAt, getZoneLabelAt, getPreviewSpawnRoomId, getPreviewSpawnCoords, getRoomSpawnPoint } from '../levelLoader.js';
import {
  G, createFreshWorldState, getActiveAltar, getActiveSynergies, getRelicStats, getActiveVowStats, getCombatScaling, getEquippedRelicLabel, getActiveWeaponId, getActiveWeapon, isWeaponUnlocked, getUnlockedWeaponIds, unlockWeapon,
  isWeaponTraitUnlocked, getActiveWeaponTraitId, unlockWeaponTrait, setActiveWeaponTrait,
  ensureNpcQuests, hasKeeperBlessing, getEffectiveNpcPos, isWorldSwitchOn, isSwitchUnlocked, getRealmSealCount, hasThirdRelicSlot, isRelicRefined,
  getPlayerMaxHp, getPlayerMaxSoul, getPlayerMaxFlasks, getPlayerMaxSeals,
  markMapExplored, getExplorationPercent, createLanterns,
  createResonancePuzzles, createCrumblePlatforms, getAwakeBoss, getHudBoss, isBoss4Unlocked, clearOutcomeTimer, triggerBossBanner, setTextFast
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
import {
  HUD_DOM, uiHooks, getLocalizedRelicLabel, formatPlayTime
} from './uiShared.js';
import { renderHudMinimapFast, renderParchmentMap } from './mapUi.js';

const hudCache = {};

function ensureWeaponHudBar() {
  const bar = HUD_DOM.weaponHudBar;
  if (!bar) return;
  const unlocked = getUnlockedWeaponIds();
  if (unlocked.length <= 1) {
    bar.style.display = 'none';
    bar.dataset.builtKey = '';
    return;
  }
  bar.style.display = 'flex';
  const en = isEn();
  const buildKey = `${en ? 'en' : 'zh'}|${unlocked.join(',')}`;
  if (bar.dataset.builtKey !== buildKey) {
    bar.dataset.builtKey = buildKey;
    bar.innerHTML = '';
    for (let i = 0; i < unlocked.length; i++) {
      const id = unlocked[i];
      const w = WEAPONS[id];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'weapon-hud-slot';
      btn.dataset.weapon = id;
      btn.title = `${en ? w.nameEn : w.name} [${w.hotkey}] · ${en ? w.tagEn : w.tag}`;
      btn.innerHTML = `<span class="weapon-hud-key">${w.hotkey}</span><span class="weapon-hud-ico">${getWeaponEmblemSvg(id)}</span><span class="weapon-hud-name">${en ? w.shortNameEn : w.shortName}</span>`;
      const onSelect = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (G.gameState === 'playing') {
          audio.init();
          equipWeapon(id, false);
        }
      };
      btn.addEventListener('click', onSelect);
      btn.addEventListener('touchstart', onSelect, { passive: false });
      bar.appendChild(btn);
    }
  }
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
    HUD_DOM.btnContinue.style.display = 'block';
    HUD_DOM.btnContinue.classList.add('primary-entry');
    HUD_DOM.btnStart.classList.remove('primary-entry');
    HUD_DOM.btnStart.textContent = t('btn.startOverwrite', G.activeSaveSlot + 1);
  } else {
    HUD_DOM.titleSaveInfo.style.display = 'none';
    HUD_DOM.btnContinue.style.display = 'none';
    HUD_DOM.btnStart.classList.add('primary-entry');
    HUD_DOM.btnStart.textContent = t('btn.startSlot', G.activeSaveSlot + 1);
  }
}

export function continueSavedGame() {
  if (!G.levelBundle) return;
  const data = readSaveData();
  if (!data) {
    uiHooks.startGame();
    return;
  }
  clearOutcomeTimer();
  applySaveData(data);
  G.stats = { parries: 0, executions: 0, damageTaken: 0, startTime: performance.now() };
  audio.init();
  const altar = getActiveAltar();
  G.player = createPlayer(altar.x - 14, altar.y - 54);
  uiHooks.respawnAtActiveAltar();
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
  const hasGrappleHook = !!(G.worldState && G.worldState.abilities.grappleHook);
  const hasDoubleJump = !!(G.worldState && G.worldState.abilities.doubleJump);
  const hasShadeDash = !!(G.worldState && G.worldState.abilities.shadeDash);
  const hasBellDive = !!(G.worldState && G.worldState.abilities.bellDive);
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
  const r2 = (hasThirdRelicSlot() && G.equippedRelics && G.equippedRelics[2]) || null;
  const r0Id = r0 ? `${r0.id}:${isRelicRefined(r0.id) ? 1 : 0}` : '';
  const r1Id = r1 ? `${r1.id}:${isRelicRefined(r1.id) ? 1 : 0}` : '';
  const r2Id = r2 ? `${r2.id}:${isRelicRefined(r2.id) ? 1 : 0}` : '';
  const synKey = activeSyns.map(s => s.id).join(',');
  if (force || hudCache.r0Id !== r0Id || hudCache.r1Id !== r1Id || hudCache.r2Id !== r2Id || hudCache.synKey !== synKey) {
    hudCache.r0Id = r0Id;
    hudCache.r1Id = r1Id;
    hudCache.r2Id = r2Id;
    hudCache.synKey = synKey;
    const icon0 = r0 ? `<span class="hud-relic-ico${isRelicRefined(r0.id) ? ' refined' : ''}" title="${t('hud.primaryRelicTip', locRelic(r0, 'name'))}${isRelicRefined(r0.id) ? ' ★+1' : ''}">${getRelicEmblemSvg(r0.id)}</span>` : '';
    const icon1 = r1 ? `<span class="hud-relic-ico sub${isRelicRefined(r1.id) ? ' refined' : ''}" title="${t('hud.secondaryRelicTip', locRelic(r1, 'name'))}${isRelicRefined(r1.id) ? ' ★+1' : ''}">${getRelicEmblemSvg(r1.id)}</span>` : '';
    const icon2 = r2 ? `<span class="hud-relic-ico tri${isRelicRefined(r2.id) ? ' refined' : ''}" title="${t('hud.tertiaryRelicTip', locRelic(r2, 'name'))}${isRelicRefined(r2.id) ? ' ★+1' : ''}">${getRelicEmblemSvg(r2.id)}</span>` : '';
    const synHtml = activeSyns.length > 0 ? `<span class="hud-syn-pill">✦${locSynergy(activeSyns[0], 'name')}${activeSyns.length > 1 ? ` +${activeSyns.length - 1}` : ''}</span>` : '';
    HUD_DOM.relicTag.innerHTML = `${icon0}${icon1}${icon2}<span class="hud-relic-names">${getLocalizedRelicLabel()}</span>${synHtml}`;
  }
  if (HUD_DOM.realmSealsTag) {
    const sCnt = getRealmSealCount();
    if (force || hudCache.realmSealCnt !== sCnt) {
      hudCache.realmSealCnt = sCnt;
      HUD_DOM.realmSealsTag.classList.toggle('unlocked', sCnt > 0);
      HUD_DOM.realmSealsTag.classList.toggle('full', sCnt >= 3);
      if (sCnt > 0) setTextFast(HUD_DOM.realmSealsTag, t('hud.realmSealsShort', sCnt));
    }
  }
  if (HUD_DOM.abilityGrappleTag && (force || hudCache.hasGrappleHook !== hasGrappleHook)) {
    hudCache.hasGrappleHook = hasGrappleHook;
    HUD_DOM.abilityGrappleTag.classList.toggle('unlocked', hasGrappleHook);
  }
  if (force || hudCache.hasDoubleJump !== hasDoubleJump) {
    hudCache.hasDoubleJump = hasDoubleJump;
    HUD_DOM.abilityTag.classList.toggle('unlocked', hasDoubleJump);
  }
  if (HUD_DOM.abilityShadeTag && (force || hudCache.hasShadeDash !== hasShadeDash)) {
    hudCache.hasShadeDash = hasShadeDash;
    HUD_DOM.abilityShadeTag.classList.toggle('unlocked', hasShadeDash);
  }
  if (HUD_DOM.abilityDiveTag && (force || hudCache.hasBellDive !== hasBellDive)) {
    hudCache.hasBellDive = hasBellDive;
    HUD_DOM.abilityDiveTag.classList.toggle('unlocked', hasBellDive);
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

  // Sync Three-Weapon Quick-Swap HUD Bar & Mobile Charge Label
  const curWeaponId = getActiveWeaponId();
  const unlWeaponCnt = G.worldState && G.worldState.unlockedWeapons ? G.worldState.unlockedWeapons.size : 1;
  if (force || hudCache.weaponId !== curWeaponId || hudCache.unlWeaponCnt !== unlWeaponCnt) {
    hudCache.weaponId = curWeaponId;
    hudCache.unlWeaponCnt = unlWeaponCnt;
    ensureWeaponHudBar();
    if (HUD_DOM.weaponHudBar) {
      const btns = HUD_DOM.weaponHudBar.children;
      for (let i = 0; i < btns.length; i++) {
        btns[i].classList.toggle('active', btns[i].dataset.weapon === curWeaponId);
      }
    }
    if (HUD_DOM.fanAttackSub) {
      const holdKey = curWeaponId === 'hammer' ? 'mob.attackHoldHammer' : curWeaponId === 'bell' ? 'mob.attackHoldBell' : 'mob.attackHold';
      setTextFast(HUD_DOM.fanAttackSub, t(holdKey));
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
    if (HUD_DOM.sealsBtn) {
      const ultReady = G.player.maxSeals > 0 && G.player.seals >= G.player.maxSeals;
      HUD_DOM.sealsBtn.classList.toggle('ult-ready', ultReady);
      if (ultReady) {
        const uDef = getWeaponUltimateDef(curWeaponId);
        HUD_DOM.sealsBtn.title = t('hud.sealsUltReady', isEn() ? uDef.nameEn : uDef.name);
      } else {
        HUD_DOM.sealsBtn.title = t('hud.sealsTip');
      }
    }
  }

  let zoneText;
  const curRoom = getRoomAt(G.player.x + G.player.w / 2, G.player.y + G.player.h / 2);
  if (curRoom) G.currentRoomId = curRoom.id;
  if (G.echoSession) {
    const m = G.echoSession.mode;
    const echoName = m === 'seven_bells'
      ? t('hud.echoZoneSevenBells', (G.echoSession.stage || 0) + 1, SEVEN_BELLS_ORDER.length)
      : m === 'zhu'
        ? t('hud.echoZoneZhu')
      : m === 'rush'
      ? (G.echoSession.stage === 0 ? t('hud.echoZoneRush1') : G.echoSession.stage === 1 ? t('hud.echoZoneRush2') : t('hud.echoZoneRush3'))
      : m === 'warden_rush'
        ? (G.echoSession.stage === 0 ? t('hud.echoZoneWardenRush1') : G.echoSession.stage === 1 ? t('hud.echoZoneWardenRush2') : t('hud.echoZoneWardenRush3'))
        : m === 'warden_wind' ? t('hud.echoZoneWardenWind')
        : m === 'warden_forest' ? t('hud.echoZoneWardenForest')
        : m === 'warden_mountain' ? t('hud.echoZoneWardenMountain')
        : m === 'yuan' ? t('hud.echoZoneYuan')
        : m === 'ji' ? t('hud.echoZoneJi') : t('hud.echoZoneHui');
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

  const activeBoss = getHudBoss();
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

  // Reactive Mobile 6+3 Thumb Stage & Full 25-Room Contextual Interact Button (v43.5)
  if (document.body.classList.contains('is-mobile')) {
    const rsMob = getRelicStats();
    const holdingUp = isActionHeld('up');
    const holdingDownAir = !G.player.grounded && isActionHeld('down') && !!(G.worldState && G.worldState.abilities.bellDive);
    const spellCostNow = holdingUp ? rsMob.quakeCost : rsMob.spellCost;
    const spellReady = G.player.soul >= spellCostNow;
    const spellSubTxt = holdingDownAir ? t('mob.spellDive') : (holdingUp ? t('mob.spellQuake') : t('mob.spellBlade'));
    if (HUD_DOM.fanSpell && (force || hudCache.mobSpellReady !== spellReady)) {
      hudCache.mobSpellReady = spellReady;
      HUD_DOM.fanSpell.classList.toggle('ready-glow', spellReady);
      HUD_DOM.fanSpell.classList.toggle('dimmed', !spellReady);
    }
    if (HUD_DOM.fanSpellSub && (force || hudCache.mobSpellSub !== spellSubTxt)) {
      hudCache.mobSpellSub = spellSubTxt;
      setTextFast(HUD_DOM.fanSpellSub, spellSubTxt);
    }

    // Permanent Dash evolves visually when Shadow Dash is unlocked
    if (HUD_DOM.fanDash) {
      const shadeOn = !!(G.worldState && G.worldState.abilities.shadeDash);
      const shadeCd = shadeOn && (G.player.shadeDashCd || 0) > 0;
      if (force || hudCache.mobShadeOn !== shadeOn || hudCache.mobShadeCd !== shadeCd) {
        hudCache.mobShadeOn = shadeOn;
        hudCache.mobShadeCd = shadeCd;
        HUD_DOM.fanDash.classList.toggle('shade-unlocked', shadeOn);
        HUD_DOM.fanDash.classList.toggle('shade-cooling', shadeCd);
      }
    }

    // Permanent Heal Flask button with live count & low-HP pulse
    if (HUD_DOM.fanHeal) {
      const flk = G.player.flasks || 0;
      const lowHp = flk > 0 && G.player.hp <= G.player.maxHp * 0.45;
      if (force || hudCache.mobFlk !== flk || hudCache.mobLowHp !== lowHp) {
        hudCache.mobFlk = flk;
        hudCache.mobLowHp = lowHp;
        HUD_DOM.fanHeal.classList.toggle('empty', flk <= 0);
        HUD_DOM.fanHeal.classList.toggle('low-hp-pulse', lowHp);
        if (HUD_DOM.fanHealCnt) setTextFast(HUD_DOM.fanHealCnt, `×${flk}`);
      }
    }

    // Dynamic 1: Grapple Hook (hidden until unlocked after Boss 1 Hui!)
    if (HUD_DOM.fanGrapple) {
      const hasGrap = !!(G.worldState && G.worldState.abilities.grappleHook);
      const grappleReady = hasGrap && !!(G.grapplePreviewTarget && G.player.grappleCd <= 0);
      if (force || hudCache.mobHasGrap !== hasGrap || hudCache.mobGrappleReady !== grappleReady) {
        hudCache.mobHasGrap = hasGrap;
        hudCache.mobGrappleReady = grappleReady;
        HUD_DOM.fanGrapple.classList.toggle('hidden', !hasGrap);
        HUD_DOM.fanGrapple.classList.toggle('ready-glow', grappleReady);
      }
    }

    // Dynamic 2: Weapon Swap (hidden until >=2 weapons unlocked!)
    if (HUD_DOM.fanSwap) {
      const unlList = getUnlockedWeaponIds();
      const showSwap = unlList.length >= 2;
      const curWid = getActiveWeaponId();
      if (force || hudCache.mobShowSwap !== showSwap || hudCache.mobSwapWid !== curWid) {
        hudCache.mobShowSwap = showSwap;
        hudCache.mobSwapWid = curWid;
        HUD_DOM.fanSwap.classList.toggle('hidden', !showSwap);
        if (showSwap && HUD_DOM.fanSwapSub) {
          const wObj = WEAPONS[curWid] || WEAPONS.blade;
          setTextFast(HUD_DOM.fanSwapSub, isEn() ? wObj.shortEn : wObj.short);
        }
      }
    }

    // Dynamic 3: Ink Seal / Full-Seal Ultimate (appears whenever player has >=1 seal or stuck talismans!)
    if (HUD_DOM.fanSeal) {
      const sNow = G.player.seals || 0;
      const sMax = G.player.maxSeals || 3;
      const hasTal = !!(G.talismans && G.talismans.length > 0);
      const showSeal = sNow > 0 || hasTal;
      const isUlt = sMax > 0 && sNow >= sMax;
      if (force || hudCache.mobShowSeal !== showSeal || hudCache.mobSealNow !== sNow || hudCache.mobSealUlt !== isUlt) {
        hudCache.mobShowSeal = showSeal;
        hudCache.mobSealNow = sNow;
        hudCache.mobSealUlt = isUlt;
        HUD_DOM.fanSeal.classList.toggle('hidden', !showSeal);
        HUD_DOM.fanSeal.classList.toggle('ult-ready', isUlt);
        if (HUD_DOM.fanSealLabel) setTextFast(HUD_DOM.fanSealLabel, isUlt ? t('mob.sealUlt') : t('mob.seal'));
        if (HUD_DOM.fanSealSub) setTextFast(HUD_DOM.fanSealSub, `${sNow}/${sMax}`);
      }
    }

    // Contextual Interact Pill (covers all Altars, migrated NPCs incl. Scavenger, World Switches, Tablets, Pickups)
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
            const pos = getEffectiveNpcPos(npc);
            if (Math.hypot(px - pos.x, py - pos.y) < 88) {
              const verb = npc.kind === 'chronicler' ? t('prompt.npcChronMob')
                : npc.kind === 'keeper' ? t('prompt.npcKeeperMob')
                : npc.kind === 'scavenger' ? t('prompt.npcScav')
                : t('prompt.npcSmithMob');
              interactLabel = `${verb} · ${locNpcName(npc)}`;
              break;
            }
          }
        }
        if (!interactLabel) {
          for (const sw of WORLD_SWITCHES_DEF) {
            if (!isWorldSwitchOn(sw.switchKey) && isSwitchUnlocked(sw) && Math.hypot(px - sw.x, py - sw.y) < 84) {
              interactLabel = t('mob.pullSwitch');
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
