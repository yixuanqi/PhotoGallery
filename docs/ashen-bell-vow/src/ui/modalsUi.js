// Codex, NPCs (Mochen / Xi / Bell-Smith Li), Training Console, Lore, Pause, Settings & Altar Modals (v32.0)
import {
  COLORS, RELICS, RELIC_SYNERGIES, VOW_CONSTRAINTS, DUMMY_MODES, SMITH_UPGRADES, ACTION_META, ROOMS, SOLIDS, ALTARS, NPCS, LORE_TABLETS, PICKUPS_DEF, ENEMIES_DEF, BOSSES_DEF,
  SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_ENTRY_GATE_DEF, FOUNDRY_EXIT_GATE_DEF, FIRST_BELL_CORE_POS, VOID_BARRIERS,
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
  HUD_DOM, uiState, uiHooks, formatPlayTime, openModal, closeModal
} from './uiShared.js';

let codexActiveTab = 'lore'; // 'lore' | 'bestiary' | 'achievements'
let activeLoreTabletRef = null;

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
        repBtn.addEventListener('click', () => uiHooks.startEndingCinematic(ed.key));
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
  uiState.activeNpcModalRef = npc;
  renderChroniclerModal();
  audio.playResonanceBell(493.88, false);
  openModal('npc');
}

export function renderChroniclerModal() {
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

  if (titleEl) titleEl.textContent = locNpcName(uiState.activeNpcModalRef, 'chronicler');
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
        uiHooks.syncHUD(true);
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
      uiHooks.syncHUD(true);
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
  uiState.activeNpcModalRef = npc;
  renderKeeperModal();
  audio.playResonanceBell(554.37, false);
  openModal('npc');
}

export function renderKeeperModal() {
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

  if (titleEl) titleEl.textContent = locNpcName(uiState.activeNpcModalRef, 'keeper');
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
      uiHooks.syncHUD(true);
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
      uiHooks.syncHUD(true);
    });
  }
  bCard.append(bInfo, bBtn);
  listEl.appendChild(bCard);
}

export function openSmithModal(npc) {
  uiState.activeNpcModalRef = npc || { id: 'npc_smith', kind: 'smith' };
  renderSmithModal();
  audio.playResonanceBell(440, false);
  openModal('smith');
}

export function renderSmithModal() {
  if (!G.worldState) return;
  const titleEl = document.getElementById('smith-modal-title');
  if (titleEl) titleEl.textContent = locNpcName(uiState.activeNpcModalRef, 'smith');
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

  // Special Reforge Quest Card: Abyssal Bell-Maul (镇渊钟锤) after felling Boss 1 Hui!
  const hasHammer = isWeaponUnlocked('hammer');
  const canReforgeHammer = !!G.worldState.bossDefeated && !hasHammer;
  const hCard = document.createElement('div');
  hCard.className = `smith-card weapon-forge-card${hasHammer ? ' done' : canReforgeHammer ? ' ready' : ' locked'}`;
  const hInfo = document.createElement('div');
  hInfo.className = 'smith-card-info';
  hInfo.innerHTML = `
    <div class="smith-card-title">
      <span>${hasHammer ? '✦ ' : ''}${t('smith.hammerTitle')}</span>
      <span class="smith-lv-pill">${hasHammer ? t('smith.hammerDonePill') : canReforgeHammer ? t('smith.hammerReadyPill') : t('smith.hammerLockPill')}</span>
    </div>
    <div class="smith-card-desc">${t('smith.hammerDesc')}</div>
  `;
  const hBtn = document.createElement('button');
  hBtn.type = 'button';
  hBtn.className = 'smith-buy-btn';
  hBtn.disabled = !canReforgeHammer;
  hBtn.textContent = hasHammer ? t('smith.hammerBtnDone') : canReforgeHammer ? t('smith.hammerBtnForge') : t('smith.hammerBtnLock');
  if (canReforgeHammer) {
    hBtn.addEventListener('click', () => {
      unlockWeapon('hammer');
      G.worldState.equippedWeapon = 'hammer';
      audio.playWeaponSwap('hammer');
      audio.playBellToll();
      triggerHaptic('execution', 0.95);
      checkAchievements();
      saveProgress(true);
      renderSmithModal();
      uiHooks.syncHUD(true);
      const wDef = WEAPONS.hammer;
      triggerBossBanner(t('combat.weaponUnlockBanner', isEn() ? wDef.nameEn : wDef.name), isEn() ? wDef.tagEn : wDef.tag, wDef.color, 3.0);
    });
  }
  hCard.append(hInfo, hBtn);
  list.appendChild(hCard);
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
        uiHooks.syncHUD(true);
      });
    }
    card.append(info, btn);
    list.appendChild(card);
  }

  // v25.0 Three-Weapon Forge Specialization Traits Section (2-choose-1 per weapon)
  const en = isEn();
  const traitHead = document.createElement('div');
  traitHead.className = 'smith-sec-divider';
  traitHead.innerHTML = `<span>${t('smith.traitsHeading')}</span><span class="smith-sec-sub">${t('smith.traitsSub', WEAPON_FORGE_TRAIT_COST)}</span>`;
  list.appendChild(traitHead);

  for (let wi = 0; wi < WEAPON_ORDER.length; wi++) {
    const wid = WEAPON_ORDER[wi];
    if (!isWeaponUnlocked(wid)) continue;
    const wDef = WEAPONS[wid];
    const traits = getWeaponForgeTraits(wid);
    const activeTid = getActiveWeaponTraitId(wid);
    const wGroup = document.createElement('div');
    wGroup.className = 'smith-trait-group';
    const wTitle = document.createElement('div');
    wTitle.className = 'smith-trait-whead';
    wTitle.innerHTML = `<span class="smith-trait-wico">${getWeaponEmblemSvg(wid)}</span><span>${en ? wDef.nameEn : wDef.name}</span><span class="smith-trait-ult">${t('smith.ultLabel', en ? getWeaponUltimateDef(wid).nameEn : getWeaponUltimateDef(wid).name)}</span>`;
    wGroup.appendChild(wTitle);

    const tGrid = document.createElement('div');
    tGrid.className = 'smith-trait-grid';
    for (const tr of traits) {
      const unlocked = isWeaponTraitUnlocked(tr.id);
      const equipped = unlocked && activeTid === tr.id;
      const canForge = !unlocked && echoes >= WEAPON_FORGE_TRAIT_COST;
      const tCard = document.createElement('div');
      tCard.className = `smith-trait-card${equipped ? ' equipped' : unlocked ? ' unlocked' : ''}`;
      tCard.innerHTML = `
        <div class="smith-trait-top">
          <span class="smith-trait-name">${equipped ? '✦ ' : ''}${en ? tr.nameEn : tr.name}</span>
          <span class="smith-trait-tag">${en ? tr.tagEn : tr.tag}</span>
        </div>
        <div class="smith-trait-desc">${en ? tr.descEn : tr.desc}</div>
      `;
      const tBtn = document.createElement('button');
      tBtn.type = 'button';
      tBtn.className = 'smith-buy-btn smith-trait-btn';
      if (equipped) {
        tBtn.disabled = true;
        tBtn.textContent = t('smith.traitActive');
      } else if (unlocked) {
        tBtn.textContent = t('smith.traitSwitch');
        tBtn.addEventListener('click', () => {
          setActiveWeaponTrait(wid, tr.id);
          audio.playWeaponSwap(wid);
          saveProgress(false);
          renderSmithModal();
          uiHooks.syncHUD(true);
        });
      } else {
        tBtn.disabled = !canForge;
        tBtn.textContent = t('smith.traitForgeBtn', WEAPON_FORGE_TRAIT_COST);
        if (canForge) {
          tBtn.addEventListener('click', () => {
            G.worldState.echoes -= WEAPON_FORGE_TRAIT_COST;
            unlockWeaponTrait(tr.id);
            audio.playForgeTrait();
            triggerHaptic('shieldBreak', 0.95);
            checkAchievements({ traitForged: true });
            saveProgress(true);
            renderSmithModal();
            uiHooks.syncHUD(true);
          });
        }
      }
      tCard.appendChild(tBtn);
      tGrid.appendChild(tCard);
    }
    wGroup.appendChild(tGrid);
    list.appendChild(wGroup);
  }
}

let activeDummyModalRef = null;

export function openDummyModal(dummyRef) {
  activeDummyModalRef = dummyRef || (G.enemies ? G.enemies.find(e => e && e.isDummy) : null);
  renderDummyModal();
  openModal('dummy');
}

export function renderDummyModal() {
  const e = activeDummyModalRef || (G.enemies ? G.enemies.find(x => x && x.isDummy) : null);
  if (!e) return;
  const en = isEn();
  const statsBar = document.getElementById('dummy-stats-bar');
  const quickBar = document.getElementById('dummy-quick-bar');
  const modeGrid = document.getElementById('dummy-mode-grid');
  const armoryBar = document.getElementById('dummy-armory-bar');
  if (!statsBar || !quickBar || !modeGrid || !armoryBar) return;

  const m = e.meter || { dps: 0, pps: 0, totalDmg: 0, maxHit: 0 };
  statsBar.innerHTML = `
    <div class="dummy-stat-box"><div class="dummy-stat-lbl">${t('dummy.statDps')}</div><div class="dummy-stat-val">${Math.round(m.dps)}</div></div>
    <div class="dummy-stat-box"><div class="dummy-stat-lbl">${t('dummy.statPps')}</div><div class="dummy-stat-val">${Math.round(m.pps)}</div></div>
    <div class="dummy-stat-box"><div class="dummy-stat-lbl">${t('dummy.statMax')}</div><div class="dummy-stat-val">${Math.round(m.maxHit)}</div></div>
    <div class="dummy-stat-box"><div class="dummy-stat-lbl">${t('dummy.statTotal')}</div><div class="dummy-stat-val">${Math.round(m.totalDmg)}</div></div>
  `;

  quickBar.innerHTML = '';
  const refillBtn = document.createElement('button');
  refillBtn.type = 'button';
  refillBtn.className = 'dummy-qbtn';
  refillBtn.textContent = t('dummy.btnRefill');
  refillBtn.addEventListener('click', () => {
    if (G.player) {
      G.player.hp = G.player.maxHp;
      G.player.grayHp = 0;
      G.player.soul = G.player.maxSoul;
      G.player.seals = G.player.maxSeals;
      G.player.flasks = G.player.maxFlasks;
      G.player.frostBuild = 0;
      G.player.frostChillTimer = 0;
    }
    audio.playForgeTrait();
    uiHooks.syncHUD(true);
    closeModal('dummy');
    if (G.player) {
      spawnShockwave(G.player.x + G.player.w * 0.5, G.player.y + 26, 95, COLORS.goldBright, 3.6, 0.30);
      spawnFloatText(G.player.x + G.player.w * 0.5, G.player.y - 34, t('dummy.toastRefill'), COLORS.goldBright, 18, 1.15);
    }
  });

  const autoBtn = document.createElement('button');
  autoBtn.type = 'button';
  autoBtn.className = `dummy-qbtn${G.dummyAutoFullSeals ? ' active' : ''}`;
  autoBtn.textContent = G.dummyAutoFullSeals ? t('dummy.btnAutoOn') : t('dummy.btnAutoOff');
  autoBtn.addEventListener('click', () => {
    G.dummyAutoFullSeals = !G.dummyAutoFullSeals;
    G.dummyRefillTimer = 0;
    audio.playResonanceBell(G.dummyAutoFullSeals ? 587.33 : 392.0, false);
    renderDummyModal();
  });

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'dummy-qbtn';
  resetBtn.textContent = t('dummy.btnResetMeter');
  resetBtn.addEventListener('click', () => {
    e.meter = { hits: [], totalDmg: 0, totalPosture: 0, maxHit: 0, dps: 0, pps: 0, lastHitTime: -99 };
    e.hp = e.maxHp;
    e.posture = 0;
    audio.playResonanceBell(440, false);
    renderDummyModal();
  });
  quickBar.append(refillBtn, autoBtn, resetBtn);

  modeGrid.innerHTML = '';
  DUMMY_MODES.forEach((dm, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `dummy-mode-btn${e.modeIdx === idx ? ' active' : ''}`;
    btn.innerHTML = `
      <div class="dummy-mode-name">${e.modeIdx === idx ? '✦ ' : ''}${locDummyMode(dm, 'label')}</div>
      <div class="dummy-mode-tip">${locDummyMode(dm, 'tip')}</div>
    `;
    btn.addEventListener('click', () => {
      e.modeIdx = idx;
      e.active = dm.id !== 'dormant';
      e.state = e.active ? 'stalk' : 'idle';
      e.stateTimer = 0.60;
      e.drillStep = 0;
      e.shieldUp = false;
      e.inflictsFrost = 0;
      e.hp = e.maxHp;
      e.posture = 0;
      e.bellShake = 0.35;
      audio.playResonanceBell(440 + idx * 52, false);
      closeModal('dummy');
      spawnShockwave(e.x + e.w * 0.5, e.y + 28, 68, COLORS.goldBright, 2.8, 0.25);
      spawnFloatText(e.x + e.w * 0.5, e.y - 36, t('combat.dummyModeSwitch', locDummyMode(dm, 'label')), COLORS.goldBright, 18, 1.35);
    });
    modeGrid.appendChild(btn);
  });

  // Hot-swap unlocked weapons & forged traits inside training ground!
  armoryBar.innerHTML = '';
  const aTitle = document.createElement('div');
  aTitle.className = 'dummy-armory-title';
  aTitle.textContent = t('dummy.hotSwapTitle');
  const wRow = document.createElement('div');
  wRow.className = 'dummy-armory-row';
  const curW = getActiveWeaponId();
  for (const wid of WEAPON_ORDER) {
    if (!isWeaponUnlocked(wid)) continue;
    const wDef = WEAPONS[wid];
    const wb = document.createElement('button');
    wb.type = 'button';
    wb.className = `weapon-trait-chip${curW === wid ? ' active' : ''}`;
    wb.textContent = `[${wDef.hotkey}] ${en ? wDef.nameEn : wDef.name}`;
    wb.addEventListener('click', () => {
      if (equipWeapon(wid, true)) {
        audio.playWeaponSwap(wid);
        saveProgress(false);
        renderDummyModal();
        uiHooks.syncHUD(true);
      }
    });
    wRow.appendChild(wb);
  }
  const tRow = document.createElement('div');
  tRow.className = 'dummy-armory-row';
  const traits = getWeaponForgeTraits(curW).filter(ft => isWeaponTraitUnlocked(ft.id));
  const curTid = getActiveWeaponTraitId(curW);
  if (traits.length > 0) {
    for (const ft of traits) {
      const tb = document.createElement('button');
      tb.type = 'button';
      tb.className = `weapon-trait-chip${curTid === ft.id ? ' active' : ''}`;
      tb.title = en ? ft.descEn : ft.desc;
      tb.textContent = `${curTid === ft.id ? '✦ ' : ''}${en ? ft.nameEn : ft.name}`;
      tb.addEventListener('click', () => {
        setActiveWeaponTrait(curW, ft.id);
        audio.playWeaponSwap(curW);
        saveProgress(false);
        renderDummyModal();
        uiHooks.syncHUD(true);
      });
      tRow.appendChild(tb);
    }
  } else {
    const emptyT = document.createElement('span');
    emptyT.className = 'weapon-trait-empty';
    emptyT.textContent = t('altar.weaponTraitHint');
    tRow.appendChild(emptyT);
  }
  armoryBar.append(aTitle, wRow, tRow);
}

export function openLoreModal(tablet) {
  activeLoreTabletRef = tablet;
  if (tablet && tablet.id) recordTabletRead(tablet.id);
  renderLoreModal();
  openModal('lore');
}

export function renderLoreModal() {
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

export function renderAltarArmory() {
  const sec = document.getElementById('altar-armory-section');
  if (!sec) return;
  const activeId = getActiveWeaponId();
  const unlCount = getUnlockedWeaponIds().length;
  const en = isEn();
  sec.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'armory-head';
  head.innerHTML = `<span>${t('altar.armoryHeading', unlCount, WEAPON_ORDER.length)}</span><span class="armory-sub">${unlCount >= 2 ? t('altar.armorySubSwitch') : t('altar.armorySubLocked')}</span>`;
  sec.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'armory-grid';
  for (let i = 0; i < WEAPON_ORDER.length; i++) {
    const id = WEAPON_ORDER[i];
    const w = WEAPONS[id];
    const unlocked = isWeaponUnlocked(id);
    const isEq = unlocked && id === activeId;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `weapon-card${isEq ? ' equipped' : ''}${unlocked ? '' : ' locked'}`;
    btn.dataset.weapon = id;
    btn.disabled = !unlocked;
    if (unlocked) {
      const traits = en ? w.traitsEn : w.traits;
      const traitItems = traits.map(tr => `<li>${tr}</li>`).join('');
      const ultDef = getWeaponUltimateDef(id);
      const forgeList = getWeaponForgeTraits(id);
      const activeTid = getActiveWeaponTraitId(id);
      const unlockedForge = forgeList.filter(ft => isWeaponTraitUnlocked(ft.id));
      btn.innerHTML = `
        <div class="weapon-card-top">
          <span class="weapon-card-ico">${getWeaponEmblemSvg(id)}</span>
          <span class="weapon-card-title-wrap">
            <span class="weapon-card-name"><span>[${w.hotkey}] ${en ? w.nameEn : w.name}</span><span class="weapon-card-pill">${isEq ? t('altar.weaponEquipped') : t('altar.weaponEquipBtn')}</span></span>
            <span class="weapon-card-tag">${en ? w.tagEn : w.tag}</span>
          </span>
        </div>
        <ul class="weapon-card-traits">${traitItems}</ul>
        <div class="weapon-card-ult">${t('altar.weaponUltPill', en ? ultDef.nameEn : ultDef.name)}</div>
      `;
      if (unlockedForge.length > 0) {
        const chipRow = document.createElement('div');
        chipRow.className = 'weapon-trait-chips';
        for (const ft of unlockedForge) {
          const isAct = activeTid === ft.id;
          const chip = document.createElement('span');
          chip.className = `weapon-trait-chip${isAct ? ' active' : ''}`;
          chip.title = en ? ft.descEn : ft.desc;
          chip.textContent = `${isAct ? '✦ ' : ''}${en ? ft.nameEn : ft.name}`;
          chip.addEventListener('click', ev => {
            ev.stopPropagation();
            if (!isAct) {
              setActiveWeaponTrait(id, ft.id);
              audio.playWeaponSwap(id);
              saveProgress(false);
              renderAltarArmory();
              uiHooks.syncHUD(true);
            }
          });
          chipRow.appendChild(chip);
        }
        btn.appendChild(chipRow);
      } else {
        const hintEl = document.createElement('div');
        hintEl.className = 'weapon-trait-empty';
        hintEl.textContent = t('altar.weaponTraitHint');
        btn.appendChild(hintEl);
      }
      btn.addEventListener('click', () => {
        if (equipWeapon(id, true)) {
          audio.playWeaponSwap(id);
          saveProgress(false);
          renderAltarArmory();
        }
      });
    } else {
      btn.innerHTML = `
        <div class="weapon-card-top">
          <span class="weapon-card-ico">${getWeaponEmblemSvg('locked')}</span>
          <span class="weapon-card-title-wrap">
            <span class="weapon-card-name"><span>${t('altar.relicUnknown')}</span><span class="weapon-card-pill">${t('altar.relicLocked')}</span></span>
            <span class="weapon-card-tag">${en ? w.tagEn : w.tag}</span>
          </span>
        </div>
        <div class="weapon-card-hint">${en ? w.unlockHintEn : w.unlockHint}</div>
      `;
    }
    grid.appendChild(btn);
  }
  sec.appendChild(grid);
  const rsUlt = getRelicStats();
  const ultAugNotes = [];
  if (rsUlt.hasGalefather) ultAugNotes.push(t('altar.ultAugGale'));
  if (rsUlt.hasSporeseal) ultAugNotes.push(t('altar.ultAugSpore'));
  if (rsUlt.hasFrostcore) ultAugNotes.push(t('altar.ultAugFrost'));
  if (ultAugNotes.length > 0) {
    const augEl = document.createElement('div');
    augEl.className = 'ult-biome-banner';
    augEl.innerHTML = ultAugNotes.join('<br>');
    sec.appendChild(augEl);
  }
}

export function renderRelicChoices() {
  renderAltarArmory();
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
        uiHooks.syncHUD(true);
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
        uiHooks.respawnAtActiveAltar();
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
        uiHooks.syncHUD(true);
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
      },
      {
        mode: 'warden_wind',
        title: locBoss({ id: 'warden_wind_boss', name: '截风巡塔使 · 朔' }, 'name'),
        unlocked: !!(G.worldState && G.worldState.defeatedMiniBosses && G.worldState.defeatedMiniBosses.has('warden_wind_boss')),
        lockHint: t('altar.echoWardenWindLock'),
        sub: t('altar.echoWardenWindSub')
      },
      {
        mode: 'warden_forest',
        title: locBoss({ id: 'warden_forest_boss', name: '盘根古钟精 · 枯' }, 'name'),
        unlocked: !!(G.worldState && G.worldState.defeatedMiniBosses && G.worldState.defeatedMiniBosses.has('warden_forest_boss')),
        lockHint: t('altar.echoWardenForestLock'),
        sub: t('altar.echoWardenForestSub')
      },
      {
        mode: 'warden_mountain',
        title: locBoss({ id: 'warden_mountain_boss', name: '断剑霜侯 · 凛' }, 'name'),
        unlocked: !!(G.worldState && G.worldState.defeatedMiniBosses && G.worldState.defeatedMiniBosses.has('warden_mountain_boss')),
        lockHint: t('altar.echoWardenMountainLock'),
        sub: t('altar.echoWardenMountainSub')
      },
      {
        mode: 'warden_rush',
        title: t('altar.echoWardenRushTitle'),
        unlocked: !!(G.worldState && G.worldState.defeatedMiniBosses &&
          G.worldState.defeatedMiniBosses.has('warden_wind_boss') &&
          G.worldState.defeatedMiniBosses.has('warden_forest_boss') &&
          G.worldState.defeatedMiniBosses.has('warden_mountain_boss')),
        lockHint: t('altar.echoWardenRushLock'),
        sub: t('altar.echoWardenRushSub')
      },
      {
        mode: 'zhu',
        title: locBoss(G.boss4 || { id: 'boss_zhu', name: '初铸残影 · 铸' }, 'name'),
        unlocked: isBoss4Unlocked(),
        lockHint: t('altar.echoZhuLock'),
        sub: t('altar.echoZhuSub')
      },
      {
        mode: 'seven_bells',
        title: t('altar.echoSevenTitle'),
        unlocked: !!(G.worldState && G.worldState.bossDefeated && G.worldState.boss2Defeated && isBoss4Unlocked()),
        lockHint: t('altar.echoSevenLock'),
        sub: t('altar.echoSevenSub')
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
        btn.addEventListener('click', () => uiHooks.startEchoChallenge(def.mode));
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
          uiHooks.startNewGamePlus();
        }
      });
      ngWrap.append(ngInfo, ngBtn);
      echoBox.appendChild(ngWrap);
    }
  }

}
