import { uiIcon } from '../emblems.js';
// Codex, NPCs (Mochen / Xi / Bell-Smith Li), Training Console, Lore, Pause, Settings & Altar Modals (v32.0)
import { getNpcPortraitSvg } from '../npcPortraits.js';
import { COLORS, RELICS, RELIC_SYNERGIES, DUMMY_MODES, ACTION_META, ROOMS, LORE_TABLETS } from '../config.js';
import { G, hooks, getActiveWeaponId, isWeaponUnlocked, isWeaponTraitUnlocked, getActiveWeaponTraitId, setActiveWeaponTrait, ensureNpcQuests, getPlayerMaxHp, getPlayerMaxSoul, getExplorationPercent } from '../state.js';
import { audio } from '../audio.js';
import { getActionKeyLabel, startKeyCapture, triggerHaptic, applyMobileTouchPrefs } from '../input.js';
import { equipWeapon } from '../combat.js';
import { spawnShockwave, spawnFloatText } from '../vfx.js';
import { saveProgress, saveUserSettings } from '../save.js';
import { t, getLocale, isEn, locZoneName, locRoomName, locTablet, locPickup, locNpcName, locRelic, locSynergy, locBestiary, locAchievement, locDummyMode, locActionLabel } from '../i18n.js';
import { getWeaponHeroSvg, getBestiaryPortraitDataUrl } from './codexGallery.js';
import { WEAPON_ORDER, WEAPONS, getWeaponForgeTraits, getWeaponUltimateDef } from '../weapons.js';
import { prof } from '../profiler.js';
import { BESTIARY_ENTRIES, ACHIEVEMENTS_DEF, ensureCodexState, recordTabletRead, checkAchievements } from '../codex.js';
import { uiState, uiHooks, formatPlayTime, openModal, closeModal } from './uiShared.js';
let settingsActiveTab = 'settings'; // 'settings' | 'weapons' | 'bestiary' | 'archive'
let codexActiveTab = 'bestiary';
let selectedWeaponCodexId = 'blade';
let selectedBestiaryKind = 'sentinel';
let activeLoreTabletRef = null;

export function openSettingsJournal(tab = 'settings') {
  if (G.gameState === 'dead' || G.gameState === 'victory') return;
  const target = ['settings', 'weapons', 'bestiary', 'archive'].includes(tab) ? tab : 'settings';
  if (G.activeModal === 'settings' && settingsActiveTab === target) {
    saveUserSettings();
    closeModal('settings');
    return;
  }
  settingsActiveTab = target;
  if (G.worldState) checkAchievements();
  openModal('settings');
  renderSettingsModal();
}

export function openCodexModal(tab = null) {
  if (G.gameState === 'dead' || G.gameState === 'victory' || G.gameState === 'title') return;
  const mapped = (tab === 'lore' || tab === 'achievements') ? 'archive'
    : tab === 'weapons' ? 'weapons'
    : 'bestiary';
  openSettingsJournal(mapped);
}

function renderWeaponCodexInto(bodyEl) {
  const en = isEn();
  const activeW = getActiveWeaponId();
  if (!WEAPON_ORDER.includes(selectedWeaponCodexId)) selectedWeaponCodexId = activeW || 'blade';

  const grid = document.createElement('div');
  grid.className = 'weapon-gallery-grid';
  for (let i = 0; i < WEAPON_ORDER.length; i++) {
    const id = WEAPON_ORDER[i];
    const w = WEAPONS[id];
    const unlocked = !G.worldState || isWeaponUnlocked(id);
    const isEq = unlocked && activeW === id;
    const isSel = selectedWeaponCodexId === id;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `weapon-art-card${isSel ? ' selected' : ''}${unlocked ? '' : ' locked'}`;
    card.innerHTML = `
      <div class="weapon-art-frame">
        ${getWeaponHeroSvg(id, unlocked)}
        <span class="weapon-art-badge">${isEq ? t('altar.weaponEquipped') : unlocked ? (en ? w.tagEn : w.tag) : t('altar.relicLocked')}</span>
      </div>
      <div class="weapon-art-caption">
        <span class="weapon-art-name">${unlocked ? (en ? w.nameEn : w.name) : t('altar.relicUnknown')}</span>
        <span class="weapon-art-key">[${w.hotkey}]</span>
      </div>
    `;
    card.addEventListener('click', () => {
      selectedWeaponCodexId = id;
      bodyEl.innerHTML = '';
      renderWeaponCodexInto(bodyEl);
    });
    grid.appendChild(card);
  }
  const wSplit = document.createElement('div');
  wSplit.className = 'weapon-split-wrap';
  wSplit.appendChild(grid);

  // Compact Detail Strip for Selected Weapon (concise chips, art remains hero)
  const w = WEAPONS[selectedWeaponCodexId] || WEAPONS.blade;
  const unlocked = !G.worldState || isWeaponUnlocked(w.id);
  const detail = document.createElement('div');
  detail.className = 'weapon-detail-strip';
  if (unlocked) {
    const ult = getWeaponUltimateDef(w.id);
    const traits = getWeaponForgeTraits(w.id);
    const activeTid = getActiveWeaponTraitId(w.id);
    const wTraits = en ? w.traitsEn : w.traits;
    detail.innerHTML = `
      <div class="weapon-detail-head">
        <span class="weapon-detail-title">[${w.hotkey}] ${en ? w.nameEn : w.name}</span>
        <span class="wcodex-tag">${wTraits[0]}</span>
      </div>
      <div class="wcodex-moves">
        <div class="wcodex-move-pill"><strong>${t('wcodex.lblHold')}</strong>${wTraits[1] || ''}</div>
        <div class="wcodex-move-pill"><strong>${t('wcodex.lblSwitch')}</strong>${wTraits[2] || ''}</div>
        <div class="wcodex-move-pill"><strong>${t('wcodex.lblAir')}</strong>${t(`wcodex.air.${w.id}`)}</div>
        <div class="wcodex-move-pill"><strong>${t('wcodex.lblUlt')}</strong>${en ? ult.nameEn : ult.name}</div>
      </div>
      <div class="wcodex-traits-row">${traits.map(ft => {
        const has = isWeaponTraitUnlocked(ft.id);
        const act = has && activeTid === ft.id;
        return `<span class="wcodex-trait-pill${has ? ' lit' : ''}">${act ? '✦ ' : has ? '◇ ' : `${uiIcon('lock')} `}${en ? ft.nameEn : ft.name}</span>`;
      }).join('')}</div>
    `;
  } else {
    detail.innerHTML = `
      <div class="weapon-detail-head">
        <span class="weapon-detail-title">${t('altar.relicUnknown')}</span>
        <span class="smith-lv-pill">${t('altar.relicLocked')}</span>
      </div>
      <div class="wcodex-tag">${t(`wcodex.hint.${w.id}`)}</div>
    `;
  }
  wSplit.appendChild(detail);
  bodyEl.appendChild(wSplit);
}

export function renderCodexModal(targetBodyEl = null, forcedTab = null) {
  if (!G.worldState) return;
  const c = ensureCodexState();
  const subEl = document.getElementById('codex-modal-sub');
  const tabsEl = document.getElementById('codex-tabs');
  const bodyEl = targetBodyEl || document.getElementById('codex-body');
  const activeTab = forcedTab || codexActiveTab;
  if (!bodyEl) return;

  let seenFoes = 0;
  for (const e of BESTIARY_ENTRIES) {
    if (c.bestiary[e.kind] && c.bestiary[e.kind].seen) seenFoes++;
  }
  if (subEl) {
    subEl.textContent = t('codex.sub', c.readTablets.length, LORE_TABLETS.length, seenFoes, BESTIARY_ENTRIES.length, c.achievements.length, ACHIEVEMENTS_DEF.length, c.discoveredSynergies.length, RELIC_SYNERGIES.length);
  }

  if (!targetBodyEl && tabsEl) {
    tabsEl.innerHTML = '';
    [
      { id: 'lore', label: t('codex.tabLore', c.readTablets.length, LORE_TABLETS.length) },
      { id: 'bestiary', label: t('codex.tabBestiary', seenFoes, BESTIARY_ENTRIES.length) },
      { id: 'achievements', label: t('codex.tabAchievements', c.achievements.length, ACHIEVEMENTS_DEF.length) }
    ].forEach(tb => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `codex-tab-btn${activeTab === tb.id ? ' active' : ''}`;
      btn.textContent = tb.label;
      btn.addEventListener('click', () => { codexActiveTab = tb.id; renderCodexModal(); });
      tabsEl.appendChild(btn);
    });
  }

  bodyEl.innerHTML = '';
  if (activeTab === 'weapons') {
    renderWeaponCodexInto(bodyEl);
  } else if (activeTab === 'lore' || activeTab === 'archive') {
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
    if (activeTab === 'archive') {
      const pct = Math.round((c.achievements.length / Math.max(1, ACHIEVEMENTS_DEF.length)) * 100);
      const sec3 = document.createElement('div');
      sec3.className = 'codex-sec-head';
      sec3.style.marginTop = '14px';
      sec3.textContent = t('codex.tabAchievements', c.achievements.length, ACHIEVEMENTS_DEF.length);
      bodyEl.appendChild(sec3);
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
        card.innerHTML = `<div class="codex-ach-seal">${done ? t('codex.achSeal') : '·'}</div><div class="codex-ach-info"><div class="codex-ach-name">${locAchievement(ach, 'name')}</div><div class="codex-ach-desc">${locAchievement(ach, 'desc')}</div></div>`;
        aGrid.appendChild(card);
      }
      bodyEl.appendChild(aGrid);
    }
  } else if (activeTab === 'bestiary') {
    const validSelected = BESTIARY_ENTRIES.find(e => e.kind === selectedBestiaryKind);
    if (!validSelected) {
      const firstSeen = BESTIARY_ENTRIES.find(e => c.bestiary[e.kind] && c.bestiary[e.kind].seen);
      selectedBestiaryKind = firstSeen ? firstSeen.kind : BESTIARY_ENTRIES[0].kind;
    }
    const selEntry = BESTIARY_ENTRIES.find(e => e.kind === selectedBestiaryKind) || BESTIARY_ENTRIES[0];
    const selRec = c.bestiary[selEntry.kind];
    const selSeen = !!(selRec && selRec.seen);
    const selHabitat = locBestiary(selEntry, 'habitat');
    const sKills = selRec ? (selRec.kills || 0) : 0;
    const sParries = selRec ? (selRec.parries || 0) : 0;
    const sExecs = selRec ? (selRec.executions || 0) : 0;

    // 1. Top Big Portrait Hero Showcase
    const hero = document.createElement('div');
    hero.className = `bestiary-hero${selEntry.isBoss ? ' boss' : ''}`;
    const heroStats = selEntry.kind === 'dummy'
      ? `<span class="bestiary-stat-chip">${t('codex.statDummyParries')}<strong>${sParries}</strong></span><span class="bestiary-stat-chip">${t('codex.statDummyExecs')}<strong>${sExecs}</strong></span>`
      : `<span class="bestiary-stat-chip">${t('codex.statKills')}<strong>${sKills}</strong></span><span class="bestiary-stat-chip">${t('codex.statParries')}<strong>${sParries}</strong></span><span class="bestiary-stat-chip">${t('codex.statExecs')}<strong>${sExecs}</strong></span>`;
    hero.innerHTML = `
      <div class="bestiary-hero-art">
        <img src="${getBestiaryPortraitDataUrl(selEntry.kind, selSeen)}" alt="${selSeen ? locBestiary(selEntry, 'name') : '?'}" />
      </div>
      <div class="bestiary-hero-info">
        <div class="bestiary-hero-name">
          <span>${selSeen ? locBestiary(selEntry, 'name') : t('altar.relicUnknown')}</span>
          ${selEntry.isBoss ? `<span class="codex-boss-pill">${t('codex.bossPill')}</span>` : ''}
        </div>
        <div class="bestiary-hero-sub">${selSeen ? `${locBestiary(selEntry, 'title')} · ${selHabitat}` : t('codex.habitatUnknown', selHabitat)}</div>
        ${selSeen
          ? `<div class="bestiary-hero-tactic"><strong>${t('codex.tacticLabel')}</strong>${locBestiary(selEntry, 'tactic')}</div>
             <div class="bestiary-hero-lore">${locBestiary(selEntry, 'lore')}</div>
             <div class="bestiary-hero-stats">${heroStats}</div>`
          : `<div class="bestiary-hero-lore">${t('codex.foeLocked')}</div>`
        }
      </div>
    `;
    const bSplit = document.createElement('div');
    bSplit.className = 'bestiary-split-wrap';
    bSplit.appendChild(hero);

    // 2. Bottom 4-Column Art-First Portrait Tile Grid (Big Image + Minimal Name/Count Footer)
    const grid = document.createElement('div');
    grid.className = 'bestiary-gallery-grid';
    for (const entry of BESTIARY_ENTRIES) {
      const rec = c.bestiary[entry.kind];
      const seen = !!(rec && rec.seen);
      const kills = rec ? (rec.kills || 0) : 0;
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = `bestiary-tile${seen ? '' : ' locked'}${entry.isBoss ? ' boss' : ''}${entry.kind === selectedBestiaryKind ? ' selected' : ''}`;
      tile.innerHTML = `
        <div class="bestiary-tile-art">
          <img src="${getBestiaryPortraitDataUrl(entry.kind, seen)}" alt="${seen ? locBestiary(entry, 'name') : '?'}" />
          ${entry.isBoss ? `<span class="bestiary-tile-boss">${t('codex.bossPill')}</span>` : ''}
          ${seen && kills > 0 ? `<span class="bestiary-tile-kills">×${kills}</span>` : ''}
        </div>
        <div class="bestiary-tile-foot">${seen ? locBestiary(entry, 'name') : '？？？'}</div>
      `;
      tile.addEventListener('click', () => {
        selectedBestiaryKind = entry.kind;
        renderCodexModal(targetBodyEl, activeTab);
      });
      grid.appendChild(tile);
    }
    bSplit.appendChild(grid);
    bodyEl.appendChild(bSplit);
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
  if (npc.kind === 'chronicler') openChroniclerModal(npc);
  else if (npc.kind === 'keeper') openKeeperModal(npc);
  else if (npc.kind === 'scavenger') openScavengerModal(npc);
  else openSmithModal(npc);
}

export function openScavengerModal(npc) {
  const nq = ensureNpcQuests();
  if (nq && !nq.metScavenger) {
    nq.metScavenger = true;
    saveProgress(true);
    G.minimapDirty = true;
  }
  uiState.activeNpcModalRef = npc;
  renderScavengerModal();
  audio.playResonanceBell(659.25, false);
  openModal('npc');
}

export function renderScavengerModal() {
  if (!G.worldState) return;
  const nq = ensureNpcQuests();
  const echoes = G.worldState.echoes || 0;
  const titleEl = document.getElementById('npc-modal-title');
  const subEl = document.getElementById('npc-modal-sub');
  const dlgEl = document.getElementById('npc-dialogue');
  const echoBar = document.getElementById('npc-echo-bar');
  const listEl = document.getElementById('npc-quest-list');
  if (!listEl) return;
  const pBoxS = document.getElementById('npc-portrait-box');
  if (pBoxS) pBoxS.innerHTML = getNpcPortraitSvg('scavenger');
  if (titleEl) titleEl.textContent = locNpcName(uiState.activeNpcModalRef, 'scavenger');
  if (subEl) subEl.textContent = t('scav.sub');
  if (dlgEl) {
    dlgEl.style.borderLeftColor = 'var(--gold-bright)';
    dlgEl.textContent = (nq.boughtSecretMap && nq.boughtBellSatchel) ? t('scav.dlgDone') : t('scav.dlgIntro');
  }
  if (echoBar) echoBar.textContent = t('smith.echoHold', echoes);
  listEl.innerHTML = '';
  const goods = [
    { id: 'secret_map', cost: 160, owned: !!nq.boughtSecretMap, title: t('scav.mapTitle'), desc: t('scav.mapDesc'), buy: () => { nq.boughtSecretMap = true; G.minimapDirty = true; } },
    { id: 'bell_satchel', cost: 120, owned: !!nq.boughtBellSatchel, title: t('scav.satchelTitle'), desc: t('scav.satchelDesc'), buy: () => { nq.boughtBellSatchel = true; if (G.player) { G.player.maxHp = getPlayerMaxHp(); G.player.hp = G.player.maxHp; G.player.maxSoul = getPlayerMaxSoul(); G.player.soul = G.player.maxSoul; } } }
  ];
  for (const item of goods) {
    const canBuy = !item.owned && echoes >= item.cost;
    const card = document.createElement('div');
    card.className = `smith-card npc-quest-card${item.owned ? ' done' : canBuy ? ' ready' : ''}`;
    const info = document.createElement('div');
    info.className = 'smith-card-info';
    info.innerHTML = `<div class="smith-card-title"><span>${item.owned ? '✦ ' : ''}${item.title}</span><span class="smith-lv-pill">${item.owned ? t('scav.owned') : `✦ ${item.cost}`}</span></div><div class="smith-card-desc">${item.desc}</div>`;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'smith-buy-btn';
    btn.disabled = item.owned || !canBuy;
    btn.textContent = item.owned ? t('scav.btnOwned') : t('scav.btnBuy', item.cost);
    if (canBuy) {
      btn.addEventListener('click', () => {
        G.worldState.echoes -= item.cost; item.buy();
        audio.playRelicRefine(); triggerHaptic('shieldBreak', 0.85);
        saveProgress(true); renderScavengerModal(); uiHooks.syncHUD(true);
      });
    }
    card.append(info, btn); listEl.appendChild(card);
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

  const pBoxC = document.getElementById('npc-portrait-box');
  if (pBoxC) pBoxC.innerHTML = getNpcPortraitSvg('chronicler');
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
        G.worldState.echoes = (G.worldState.echoes || 0) + 90;
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
        G.worldState.echoes = (G.worldState.echoes || 0) + 140;
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
        G.worldState.echoes = (G.worldState.echoes || 0) + 200;
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

  const pBoxK = document.getElementById('npc-portrait-box');
  if (pBoxK) pBoxK.innerHTML = getNpcPortraitSvg('keeper');
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
      G.worldState.echoes = (G.worldState.echoes || 0) + 150;
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
  uiHooks.renderSmithModal();
  audio.playResonanceBell(440, false);
  openModal('smith');
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
  refillBtn.innerHTML = `${uiIcon('bolt')}<span>${t('dummy.btnRefill')}</span>`;
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
  autoBtn.innerHTML = `${uiIcon('refresh')}<span>${G.dummyAutoFullSeals ? t('dummy.btnAutoOn') : t('dummy.btnAutoOff')}</span>`;
  autoBtn.addEventListener('click', () => {
    G.dummyAutoFullSeals = !G.dummyAutoFullSeals;
    G.dummyRefillTimer = 0;
    audio.playResonanceBell(G.dummyAutoFullSeals ? 587.33 : 392.0, false);
    renderDummyModal();
  });

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'dummy-qbtn';
  resetBtn.innerHTML = `${uiIcon('meter')}<span>${t('dummy.btnResetMeter')}</span>`;
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
  const tabsEl = document.getElementById('settings-tabs');
  const sysPane = document.getElementById('settings-pane-system');
  const cdxPane = document.getElementById('settings-pane-codex');
  const mapLink = document.getElementById('btn-settings-to-map');
  const inWorld = !!G.worldState && G.gameState !== 'title';
  if (!inWorld && settingsActiveTab !== 'settings') settingsActiveTab = 'settings';
  if (mapLink) mapLink.style.display = inWorld ? 'inline-flex' : 'none';

  if (tabsEl) {
    const c = inWorld ? ensureCodexState() : null;
    let seenFoes = 0;
    if (c) { for (const e of BESTIARY_ENTRIES) { if (c.bestiary[e.kind] && c.bestiary[e.kind].seen) seenFoes++; } }
    const unlWeapons = inWorld ? WEAPON_ORDER.filter(id => isWeaponUnlocked(id)).length : 1;
    tabsEl.innerHTML = '';
    const tabList = inWorld
      ? [
          { id: 'settings', ico: 'gear',   label: t('settings.tabSystem') },
          { id: 'weapons',  ico: 'sword',  label: t('settings.tabWeapons', unlWeapons, WEAPON_ORDER.length) },
          { id: 'bestiary', ico: 'foe',    label: t('settings.tabBestiary', seenFoes, BESTIARY_ENTRIES.length) },
          { id: 'archive',  ico: 'scroll', label: t('settings.tabArchive', c ? c.achievements.length : 0, ACHIEVEMENTS_DEF.length) }
        ]
      : [{ id: 'settings', ico: 'gear', label: t('settings.tabSystem') }];
    tabList.forEach(tb => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `codex-tab-btn${settingsActiveTab === tb.id ? ' active' : ''}`;
      btn.innerHTML = `${uiIcon(tb.ico)}<span>${tb.label}</span>`;
      btn.addEventListener('click', () => {
        settingsActiveTab = tb.id;
        const sm = document.querySelector('#settings-modal .modal-card');
        if (sm) sm.scrollTop = 0;
        renderSettingsModal();
      });
      tabsEl.appendChild(btn);
    });
  }

  const showSystem = settingsActiveTab === 'settings';
  const closeBtn = document.getElementById('btn-close-settings');
  if (closeBtn) closeBtn.textContent = showSystem ? t('settings.saveClose') : t('codex.close');
  if (sysPane) {
    sysPane.classList.toggle('hidden', !showSystem);
    sysPane.style.display = showSystem ? '' : 'none';
  }
  if (cdxPane) {
    cdxPane.classList.toggle('hidden', showSystem);
    cdxPane.style.display = showSystem ? 'none' : '';
    if (!showSystem && inWorld) renderCodexModal(cdxPane, settingsActiveTab);
  }
  if (!showSystem) return;

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

  const flGroup = document.getElementById('flash-mode-group');
  if (flGroup) {
    flGroup.innerHTML = '';
    const curFl = G.settings.flashMode || 'soft';
    [
      { val: 'soft',    label: t('settings.flashSoft') },
      { val: 'off',     label: t('settings.flashOff') },
      { val: 'classic', label: t('settings.flashClassic') }
    ].forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `seg-btn${curFl === opt.val ? ' active' : ''}`;
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        G.settings.flashMode = opt.val;
        if (opt.val !== 'classic') G.invertTimer = 0;
        if (opt.val === 'off') { G.screenFlash.alpha = 0; G.execKillFocus = null; }
        saveUserSettings();
        renderSettingsModal();
      });
      flGroup.appendChild(btn);
    });
  }

  const hapBtn = document.getElementById('btn-haptics-toggle');
  if (hapBtn) {
    hapBtn.textContent = G.settings.haptics ? t('settings.hapticsOn') : t('settings.hapticsOff');
    hapBtn.classList.toggle('active', !!G.settings.haptics);
  }

  const floatBtn = document.getElementById('btn-mob-float-joy');
  if (floatBtn) {
    const on = G.settings.mobileFloatingJoy !== false;
    floatBtn.textContent = on ? t('settings.mobFloatOn') : t('settings.mobFloatOff');
    floatBtn.classList.toggle('active', on);
  }
  const mergedBtn = document.getElementById('btn-mob-merged-parry');
  if (mergedBtn) {
    const on = G.settings.mobileMergedParry !== false;
    mergedBtn.textContent = on ? t('settings.mobMergedOn') : t('settings.mobMergedOff');
    mergedBtn.classList.toggle('active', on);
  }
  const assistBtn = document.getElementById('btn-mob-combat-assist');
  if (assistBtn) {
    const on = G.settings.mobileCombatAssist !== false;
    assistBtn.textContent = on ? t('settings.mobAssistOn') : t('settings.mobAssistOff');
    assistBtn.classList.toggle('active', on);
  }
  const scaleInp = document.getElementById('mob-btn-scale');
  const scaleVal = document.getElementById('mob-btn-scale-val');
  const curScalePct = Math.round((Number(G.settings.mobileBtnScale) || 1.0) * 100);
  if (scaleInp) scaleInp.value = String(curScalePct);
  if (scaleVal) scaleVal.textContent = `${curScalePct}%`;

  const miniBtn = document.getElementById('btn-mob-minimap');
  if (miniBtn) {
    const on = !!G.settings.mobileShowMinimap;
    miniBtn.textContent = on ? t('settings.mobMinimapOn') : t('settings.mobMinimapOff');
    miniBtn.classList.toggle('active', on);
  }
  const opInp = document.getElementById('mob-btn-opacity');
  const opVal = document.getElementById('mob-btn-opacity-val');
  const curOpPct = Math.round((Number(G.settings.mobileBtnOpacity) || 0.65) * 100);
  if (opInp) opInp.value = String(curOpPct);
  if (opVal) opVal.textContent = `${curOpPct}%`;

  const qualGroup = document.getElementById('mob-quality-group');
  if (qualGroup) {
    qualGroup.innerHTML = '';
    const curQ = ['high', 'retina', 'eco'].includes(G.settings.mobileQuality)
      ? G.settings.mobileQuality
      : (G.settings.mobileEcoMode ? 'eco' : 'high');
    [
      { val: 'high',   label: t('settings.mobQualHigh') },
      { val: 'retina', label: t('settings.mobQualRetina') },
      { val: 'eco',    label: t('settings.mobQualEco') }
    ].forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `seg-btn${curQ === opt.val ? ' active' : ''}`;
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        G.settings.mobileQuality = opt.val;
        G.settings.mobileEcoMode = opt.val === 'eco';
        applyMobileTouchPrefs();
        prof.resetRolling();
        saveUserSettings();
        if (hooks.resizeCanvas) hooks.resizeCanvas();
        renderSettingsModal();
      });
      qualGroup.appendChild(btn);
    });
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

