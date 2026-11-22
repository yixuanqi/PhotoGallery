// Minimalist Altar Armory, Relic Engraving Disk & Interactive SVG Synergy Star-Lines (v35.0)
import { COLORS, RELICS, RELIC_REFINE_COST, RELIC_SYNERGIES, VOW_CONSTRAINTS, ALTARS } from '../config.js';
import {
  G, getActiveSynergies, getRelicStats, getActiveVowStats, getCombatScaling,
  getActiveWeaponId, isWeaponUnlocked, getUnlockedWeaponIds,
  isWeaponTraitUnlocked, getActiveWeaponTraitId, setActiveWeaponTrait,
  getRealmSealCount, hasThirdRelicSlot, getRealmSealBonusMult, isRelicRefined, refineRelic,
  getPlayerMaxHp, getPlayerMaxSoul, getPlayerMaxFlasks, getPlayerMaxSeals, isBoss4Unlocked
} from '../state.js';
import { audio } from '../audio.js';
import { triggerHaptic } from '../input.js';
import { equipWeapon } from '../combat.js';
import { spawnFloatText } from '../vfx.js';
import { saveProgress } from '../save.js';
import { t, isEn, locAltar, locRelic, locSynergy, locVow, locBoss } from '../i18n.js';
import { SLOT_EMBLEMS, getRelicEmblemSvg, getWeaponEmblemSvg } from '../emblems.js';
import { WEAPON_ORDER, WEAPONS, getWeaponForgeTraits, getWeaponUltimateDef } from '../weapons.js';
import { recordSynergyDiscovered } from '../codex.js';
import { uiHooks } from './uiShared.js';

let hoveredRelicId = null;
let _synergyResizeBound = false;

function findSynergiesForRelic(relicId) {
  if (!relicId) return [];
  return RELIC_SYNERGIES.filter(s => s.relics[0] === relicId || s.relics[1] === relicId);
}

function isRelicUnlocked(relic) {
  return !!(relic && (!relic.hidden || (G.worldState && G.worldState.unlockedRelics && G.worldState.unlockedRelics.has(relic.id))));
}

function updateSynergyOverlay() {
  const stage = document.getElementById('relic-board-stage');
  const svg = document.getElementById('relic-synergy-svg');
  const list = document.getElementById('relic-list');
  if (!stage || !svg || !list) return;

  const stageRect = stage.getBoundingClientRect();
  if (stageRect.width < 10 || stageRect.height < 10) return;

  const w = Math.round(stageRect.width);
  const h = Math.round(stageRect.height);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.innerHTML = '';

  const centerById = new Map();
  const cards = list.querySelectorAll('.relic-card[data-relic-id]');
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const id = card.dataset.relicId;
    const emb = card.querySelector('.relic-emblem-wrap') || card;
    const r = emb.getBoundingClientRect();
    centerById.set(id, {
      x: (r.left - stageRect.left) + r.width * 0.5,
      y: (r.top - stageRect.top) + r.height * 0.5,
      card
    });
    card.classList.remove('syn-partner', 'syn-active-node');
  }

  const activeSyns = getActiveSynergies();
  const activeIds = new Set(activeSyns.map(s => s.id));
  const svgNS = 'http://www.w3.org/2000/svg';

  const drawArc = (idA, idB, label, isActive) => {
    const pA = centerById.get(idA);
    const pB = centerById.get(idB);
    if (!pA || !pB) return;
    const mx = (pA.x + pB.x) * 0.5;
    const my = (pA.y + pB.y) * 0.5;
    const dx = pB.x - pA.x;
    const dy = pB.y - pA.y;
    const dist = Math.hypot(dx, dy) || 1;
    const curve = Math.min(34, Math.max(14, dist * 0.14));
    const nx = -dy / dist;
    const ny = dx / dist;
    const cx = mx + nx * curve;
    const cy = my + ny * curve;

    // Soft glow backing for active synergies
    if (isActive) {
      const glow = document.createElementNS(svgNS, 'path');
      glow.setAttribute('d', `M ${pA.x.toFixed(1)} ${pA.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${pB.x.toFixed(1)} ${pB.y.toFixed(1)}`);
      glow.setAttribute('fill', 'none');
      glow.setAttribute('stroke', 'rgba(253, 224, 71, 0.34)');
      glow.setAttribute('stroke-width', '7');
      glow.setAttribute('stroke-linecap', 'round');
      svg.appendChild(glow);
    }

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', `M ${pA.x.toFixed(1)} ${pA.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${pB.x.toFixed(1)} ${pB.y.toFixed(1)}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', isActive ? '#fde047' : '#38bdf8');
    path.setAttribute('stroke-width', isActive ? '2.4' : '1.9');
    path.setAttribute('stroke-linecap', 'round');
    if (!isActive) {
      path.setAttribute('stroke-dasharray', '6 5');
      path.setAttribute('class', 'syn-preview-arc');
    }
    svg.appendChild(path);

    // Endpoint anchor dots
    for (const pt of [pA, pB]) {
      const dot = document.createElementNS(svgNS, 'circle');
      dot.setAttribute('cx', pt.x.toFixed(1));
      dot.setAttribute('cy', pt.y.toFixed(1));
      dot.setAttribute('r', isActive ? '4.2' : '3.4');
      dot.setAttribute('fill', isActive ? '#fef08a' : '#7dd3fc');
      svg.appendChild(dot);
    }

    // Midpoint compact synergy badge
    const lx = 0.25 * pA.x + 0.5 * cx + 0.25 * pB.x;
    const ly = 0.25 * pA.y + 0.5 * cy + 0.25 * pB.y;
    const pillW = Math.max(58, label.length * (isEn() ? 6.8 : 11.5) + 14);
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', (lx - pillW * 0.5).toFixed(1));
    rect.setAttribute('y', (ly - 9.5).toFixed(1));
    rect.setAttribute('width', pillW.toFixed(1));
    rect.setAttribute('height', '19');
    rect.setAttribute('rx', '9.5');
    rect.setAttribute('fill', isActive ? 'rgba(42, 24, 8, 0.94)' : 'rgba(10, 24, 38, 0.92)');
    rect.setAttribute('stroke', isActive ? '#fde047' : '#38bdf8');
    rect.setAttribute('stroke-width', '1.2');
    svg.appendChild(rect);

    const txt = document.createElementNS(svgNS, 'text');
    txt.setAttribute('x', lx.toFixed(1));
    txt.setAttribute('y', (ly + 3.5).toFixed(1));
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('fill', isActive ? '#fef08a' : '#bae6fd');
    txt.setAttribute('font-size', isEn() ? '9.5' : '10.5');
    txt.setAttribute('font-weight', '700');
    txt.textContent = label;
    svg.appendChild(txt);
  };

  // 1. Draw solid golden constellation arcs for all active equipped synergies
  for (let i = 0; i < activeSyns.length; i++) {
    const syn = activeSyns[i];
    const [a, b] = syn.relics;
    drawArc(a, b, `✦ ${locSynergy(syn, 'name')}`, true);
    if (centerById.has(a)) centerById.get(a).card.classList.add('syn-active-node');
    if (centerById.has(b)) centerById.get(b).card.classList.add('syn-active-node');
  }

  // 2. Draw pulsing dashed cyan-gold preview arcs for hovered relic's synergy partners!
  if (hoveredRelicId) {
    const relSyns = findSynergiesForRelic(hoveredRelicId);
    for (let i = 0; i < relSyns.length; i++) {
      const syn = relSyns[i];
      if (activeIds.has(syn.id)) continue;
      const partnerId = syn.relics[0] === hoveredRelicId ? syn.relics[1] : syn.relics[0];
      const partnerObj = RELICS.find(r => r.id === partnerId);
      if (!partnerObj || !isRelicUnlocked(partnerObj)) continue;
      drawArc(hoveredRelicId, partnerId, `✦ ${locSynergy(syn, 'name')}`, false);
      if (centerById.has(partnerId)) centerById.get(partnerId).card.classList.add('syn-partner');
    }
  }
}

function updateSynergyReadoutBar() {
  const synBox = document.getElementById('relic-synergy-box');
  if (!synBox) return;
  synBox.innerHTML = '';

  const activeSyns = getActiveSynergies();
  const hoverSyns = hoveredRelicId
    ? findSynergiesForRelic(hoveredRelicId).filter(s => {
        const pid = s.relics[0] === hoveredRelicId ? s.relics[1] : s.relics[0];
        const pObj = RELICS.find(r => r.id === pid);
        return pObj && isRelicUnlocked(pObj);
      })
    : [];

  const row = document.createElement('div');
  row.className = 'syn-chip-strip';

  if (hoverSyns.length > 0) {
    for (const syn of hoverSyns) {
      const isAct = activeSyns.some(a => a.id === syn.id);
      const chip = document.createElement('div');
      chip.className = `syn-pill-card${isAct ? ' active' : ' preview'}`;
      chip.innerHTML = `<strong>${isAct ? '✦' : '◇'} ${locSynergy(syn, 'name')}</strong><span>${locSynergy(syn, 'shortDesc') || locSynergy(syn, 'desc')}</span>`;
      row.appendChild(chip);
    }
  } else if (activeSyns.length > 0) {
    for (const syn of activeSyns) {
      const chip = document.createElement('div');
      chip.className = 'syn-pill-card active';
      chip.innerHTML = `<strong>✦ ${locSynergy(syn, 'name')}</strong><span>${locSynergy(syn, 'shortDesc') || locSynergy(syn, 'desc')}</span>`;
      row.appendChild(chip);
    }
  } else {
    const empty = document.createElement('div');
    empty.className = 'syn-pill-card empty';
    empty.textContent = t('altar.synergyHoverHint');
    row.appendChild(empty);
  }
  synBox.appendChild(row);
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
    btn.className = `weapon-card compact-weapon-card${isEq ? ' equipped' : ''}${unlocked ? '' : ' locked'}`;
    btn.dataset.weapon = id;
    btn.disabled = !unlocked;
    if (unlocked) {
      const traits = en ? w.traitsEn : w.traits;
      const ultDef = getWeaponUltimateDef(id);
      const forgeList = getWeaponForgeTraits(id);
      const activeTid = getActiveWeaponTraitId(id);
      const unlockedForge = forgeList.filter(ft => isWeaponTraitUnlocked(ft.id));
      btn.innerHTML = `
        <div class="weapon-card-top">
          <span class="weapon-card-ico">${getWeaponEmblemSvg(id)}</span>
          <span class="weapon-card-title-wrap">
            <span class="weapon-card-name"><span>[${w.hotkey}] ${en ? w.nameEn : w.name}</span><span class="weapon-card-pill">${isEq ? t('altar.weaponEquipped') : t('altar.weaponEquipBtn')}</span></span>
            <span class="weapon-card-tag">${traits[0]}</span>
          </span>
        </div>
        <div class="weapon-card-ult">${t('altar.weaponUltPill', en ? ultDef.nameEn : ultDef.name)}</div>
      `;
      if (unlockedForge.length > 0) {
        const chipRow = document.createElement('div');
        chipRow.className = 'weapon-trait-chips';
        for (const ft of unlockedForge) {
          const isAct = activeTid === ft.id;
          const chip = document.createElement('span');
          chip.className = `weapon-trait-chip${isAct ? ' active' : ''}`;
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
      `;
    }
    grid.appendChild(btn);
  }
  sec.appendChild(grid);
}

export function renderRelicChoices() {
  renderAltarArmory();
  if (!Array.isArray(G.equippedRelics) || G.equippedRelics.length < 3) {
    G.equippedRelics = [
      (G.equippedRelics && G.equippedRelics[0]) || G.currentRelic || RELICS[0],
      (G.equippedRelics && G.equippedRelics[1]) || null,
      (G.equippedRelics && G.equippedRelics[2]) || null
    ];
  }
  const thirdOpen = hasThirdRelicSlot();
  if (!thirdOpen && G.activeRelicSlot >= 2) G.activeRelicSlot = 1;

  const slotBar = document.getElementById('relic-slots-bar');
  if (slotBar) {
    let strip = document.getElementById('realm-seals-strip');
    if (!strip) {
      strip = document.createElement('div');
      strip.id = 'realm-seals-strip';
      strip.className = 'realm-seals-strip';
      slotBar.parentNode.insertBefore(strip, slotBar);
    }
    const rs = (G.worldState && G.worldState.realmSeals) || { wind: false, forest: false, mountain: false };
    const sCnt = getRealmSealCount();
    const bonusPct = Math.round((getRealmSealBonusMult() - 1) * 100);
    const altarEchoes = G.worldState ? (G.worldState.echoes || 0) : 0;
    strip.innerHTML = `
      <div class="realm-seals-pills">
        <span class="realm-seal-pill${rs.wind ? ' lit-wind' : ''}">${rs.wind ? '✦ ' : ''}${t('altar.sealWind')}</span>
        <span class="realm-seal-pill${rs.forest ? ' lit-forest' : ''}">${rs.forest ? '✦ ' : ''}${t('altar.sealForest')}</span>
        <span class="realm-seal-pill${rs.mountain ? ' lit-mountain' : ''}">${rs.mountain ? '✦ ' : ''}${t('altar.sealMountain')}</span>
        <span class="altar-echo-pill">✦ ${altarEchoes}</span>
      </div>
      <div style="color:${sCnt >= 3 ? '#fef08a' : 'var(--parchment-dim)'};">${sCnt >= 3 ? t('altar.sealsFullDesc', bonusPct) : t('altar.sealsProgDesc', sCnt, bonusPct)}</div>
    `;

    slotBar.classList.toggle('three-slots', true);
    slotBar.innerHTML = '';
    const slotDefs = [
      { idx: 0, cls: 'primary', crest: SLOT_EMBLEMS.primary, kicker: t('altar.slotPrimary'), unlocked: true },
      { idx: 1, cls: 'secondary', crest: SLOT_EMBLEMS.secondary, kicker: t('altar.slotSecondary'), unlocked: true },
      { idx: 2, cls: 'tertiary', crest: SLOT_EMBLEMS.tertiary, kicker: t('altar.slotTertiary'), unlocked: thirdOpen }
    ];
    slotDefs.forEach(sd => {
      const r = sd.unlocked ? G.equippedRelics[sd.idx] : null;
      const rRef = !!(r && isRelicRefined(r.id));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.disabled = !sd.unlocked;
      btn.className = `relic-slot-medallion ${sd.cls}${sd.unlocked && G.activeRelicSlot === sd.idx ? ' active' : ''}${r ? ' filled' : ' vacant'}${rRef ? ' relic-refined' : ''}${sd.unlocked ? '' : ' locked-slot'}`;
      btn.innerHTML = `
        <span class="slot-crest">${sd.crest}</span>
        <span class="slot-emblem-box">${r ? getRelicEmblemSvg(r.id) : (sd.unlocked ? SLOT_EMBLEMS.empty : getRelicEmblemSvg('locked'))}</span>
        <span class="slot-info">
          <span class="slot-kicker">${sd.kicker}</span>
          <span class="slot-val">${sd.unlocked ? (r ? `${locRelic(r, 'name')}${rRef ? ' ★+1' : ''}` : t('altar.slotEmpty')) : t('altar.slotTertiaryLocked', sCnt)}</span>
        </span>
      `;
      if (sd.unlocked) {
        btn.addEventListener('click', () => {
          G.activeRelicSlot = sd.idx;
          renderRelicChoices();
        });
      }
      slotBar.appendChild(btn);
    });
  }

  // Ensure Relic Board Stage wrapper + SVG Synergy Constellation Layer exist around #relic-list
  const list = document.getElementById('relic-list');
  if (list && (!list.parentElement || list.parentElement.id !== 'relic-board-stage')) {
    const stage = document.createElement('div');
    stage.id = 'relic-board-stage';
    stage.className = 'relic-board-stage';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'relic-synergy-svg';
    svg.setAttribute('class', 'relic-synergy-svg');
    svg.setAttribute('aria-hidden', 'true');
    list.parentNode.insertBefore(stage, list);
    stage.appendChild(list);
    stage.appendChild(svg);
  }

  updateSynergyReadoutBar();

  list.innerHTML = '';
  const curEchoesAltar = G.worldState ? (G.worldState.echoes || 0) : 0;
  for (const relic of RELICS) {
    const unlocked = isRelicUnlocked(relic);
    const isRef = unlocked && isRelicRefined(relic.id);
    const eqSlot = unlocked ? G.equippedRelics.findIndex(r => r && r.id === relic.id) : -1;
    const hasSynPartner = unlocked && findSynergiesForRelic(relic.id).some(s => {
      const pid = s.relics[0] === relic.id ? s.relics[1] : s.relics[0];
      return isRelicUnlocked(RELICS.find(r => r.id === pid));
    });

    const card = document.createElement('div');
    card.dataset.relicId = relic.id;
    card.className = `relic-card compact-relic-card${eqSlot >= 0 ? ' equipped' : ''}${eqSlot === 1 ? ' equipped-sub' : eqSlot === 2 ? ' equipped-tri' : ''}${isRef ? ' relic-refined' : ''}${unlocked ? '' : ' locked'}`;

    const head = document.createElement('div');
    head.className = 'relic-card-head';
    const emblemWrap = document.createElement('div');
    emblemWrap.className = 'relic-emblem-wrap';
    emblemWrap.innerHTML = unlocked ? getRelicEmblemSvg(relic.id) : getRelicEmblemSvg('locked');

    const titleCol = document.createElement('div');
    titleCol.className = 'relic-title-col';
    if (unlocked) {
      const slotIcon = eqSlot === 0
        ? `<span class="relic-slot-badge primary">${SLOT_EMBLEMS.primary}${t('altar.badgePrimary')}</span>`
        : eqSlot === 1
          ? `<span class="relic-slot-badge secondary">${SLOT_EMBLEMS.secondary}${t('altar.badgeSecondary')}</span>`
          : eqSlot === 2
            ? `<span class="relic-slot-badge tertiary">${SLOT_EMBLEMS.tertiary}${t('altar.badgeTertiary')}</span>`
            : `<span class="relic-style-tag">${locRelic(relic, 'tag')}</span>`;
      const starPill = isRef ? `<span class="relic-star-badge">★+1</span>` : (hasSynPartner ? `<span class="relic-syn-dot" title="${t('altar.synergyHoverHint')}">✦</span>` : '');
      titleCol.innerHTML = `<div class="relic-name"><span>${locRelic(relic, 'name')}</span></div><div class="relic-badge-row">${slotIcon}${starPill}</div>`;
    } else {
      titleCol.innerHTML = `<div class="relic-name"><span>${t('altar.relicUnknown')}</span></div><div class="relic-badge-row"><span class="relic-style-tag locked">${t('altar.relicLocked')}</span></div>`;
    }
    head.append(emblemWrap, titleCol);

    const body = document.createElement('div');
    body.className = 'relic-body';
    if (unlocked) {
      const shortTxt = isRef
        ? (locRelic(relic, 'shortRefined') || locRelic(relic, 'refinedEffect'))
        : (locRelic(relic, 'shortEffect') || locRelic(relic, 'effect'));
      body.innerHTML = `<div class="relic-effect">${shortTxt}</div>`;
      if (!isRef) {
        const canRefAltar = curEchoesAltar >= RELIC_REFINE_COST;
        const refBtn = document.createElement('button');
        refBtn.type = 'button';
        refBtn.className = 'altar-refine-btn';
        refBtn.disabled = !canRefAltar;
        refBtn.title = `★ +1: ${locRelic(relic, 'shortRefined') || locRelic(relic, 'refinedEffect')}`;
        refBtn.textContent = t('altar.refineBtn', RELIC_REFINE_COST);
        refBtn.addEventListener('click', ev => {
          ev.stopPropagation();
          if (!G.worldState || (G.worldState.echoes || 0) < RELIC_REFINE_COST || isRelicRefined(relic.id)) return;
          G.worldState.echoes -= RELIC_REFINE_COST;
          refineRelic(relic.id);
          if (G.player) {
            G.player.maxFlasks = getPlayerMaxFlasks();
            G.player.maxSeals = getPlayerMaxSeals();
          }
          audio.playRelicRefine();
          triggerHaptic('execution', 0.9);
          saveProgress(true);
          renderRelicChoices();
          uiHooks.syncHUD(true);
        });
        body.appendChild(refBtn);
      }
    } else {
      body.innerHTML = `<div class="relic-hint">${locRelic(relic, 'hint') || t('altar.relicDefaultHint')}</div>`;
    }
    card.append(head, body);

    if (unlocked) {
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-pressed', eqSlot >= 0 ? 'true' : 'false');
      const onHoverIn = () => {
        hoveredRelicId = relic.id;
        updateSynergyReadoutBar();
        updateSynergyOverlay();
      };
      const onHoverOut = () => {
        if (hoveredRelicId === relic.id) {
          hoveredRelicId = null;
          updateSynergyReadoutBar();
          updateSynergyOverlay();
        }
      };
      card.addEventListener('mouseenter', onHoverIn);
      card.addEventListener('mouseleave', onHoverOut);
      card.addEventListener('focus', onHoverIn);
      card.addEventListener('blur', onHoverOut);

      const equip = () => {
        const maxSlots = hasThirdRelicSlot() ? 3 : 2;
        const curIdx = G.equippedRelics.findIndex((r, idx) => idx < maxSlots && r && r.id === relic.id);
        if (curIdx >= 1) {
          G.equippedRelics[curIdx] = null;
          G.activeRelicSlot = curIdx;
        } else if (curIdx === 0) {
          G.activeRelicSlot = 0;
        } else {
          let targetSlot = Math.min(maxSlots - 1, Math.max(0, G.activeRelicSlot));
          if (G.equippedRelics[targetSlot] !== null) {
            const emptyIdx = G.equippedRelics.findIndex((r, idx) => idx < maxSlots && r === null);
            if (emptyIdx >= 0) targetSlot = emptyIdx;
          }
          G.equippedRelics[targetSlot] = relic;
          G.activeRelicSlot = (targetSlot + 1) % maxSlots;
        }
        G.currentRelic = G.equippedRelics[0] || G.equippedRelics[1] || G.equippedRelics[2] || RELICS[0];
        if (!G.equippedRelics[0]) {
          G.equippedRelics[0] = G.currentRelic;
          for (let si = 1; si < 3; si++) {
            if (G.equippedRelics[si] && G.equippedRelics[si].id === G.currentRelic.id) G.equippedRelics[si] = null;
          }
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

  // Draw SVG synergy lines after DOM layout settles
  window.requestAnimationFrame(() => updateSynergyOverlay());
  if (!_synergyResizeBound) {
    _synergyResizeBound = true;
    window.addEventListener('resize', () => {
      if (G.activeModal === 'altar') updateSynergyOverlay();
    });
  }

  // Fast-Travel Warp Row
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

  // Bell-Vow Constraints (钟誓制约)
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

  // Vow Echoes (Boss Rematch & Boss Rush)
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
      { mode: 'hui', title: locBoss(G.boss || { id: 'boss_hui', name: '断钟骑士 · 晦' }, 'name'), unlocked: !!(G.worldState && G.worldState.bossDefeated), lockHint: t('altar.echoHuiLock'), sub: t('altar.echoHuiSub') },
      { mode: 'ji', title: locBoss(G.boss2 || { id: 'boss_ji', name: '沉渊铸钟师 · 寂' }, 'name'), unlocked: !!(G.worldState && G.worldState.boss2Defeated), lockHint: t('altar.echoJiLock'), sub: t('altar.echoJiSub') },
      { mode: 'yuan', title: locBoss(G.boss3 || { id: 'boss_yuan', name: '初钟圣骸 · 渊' }, 'name'), unlocked: !!(G.worldState && G.worldState.boss3Defeated), lockHint: t('altar.echoYuanLock'), sub: t('altar.echoYuanSub') },
      { mode: 'rush', title: t('altar.echoRushTitle'), unlocked: !!(G.worldState && G.worldState.bossDefeated && G.worldState.boss2Defeated && G.worldState.boss3Defeated), lockHint: t('altar.echoRushLock'), sub: t('altar.echoRushSub') },
      { mode: 'warden_wind', title: locBoss({ id: 'warden_wind_boss', name: '截风巡塔使 · 朔' }, 'name'), unlocked: !!(G.worldState && G.worldState.defeatedMiniBosses && G.worldState.defeatedMiniBosses.has('warden_wind_boss')), lockHint: t('altar.echoWardenWindLock'), sub: t('altar.echoWardenWindSub') },
      { mode: 'warden_forest', title: locBoss({ id: 'warden_forest_boss', name: '盘根古钟精 · 枯' }, 'name'), unlocked: !!(G.worldState && G.worldState.defeatedMiniBosses && G.worldState.defeatedMiniBosses.has('warden_forest_boss')), lockHint: t('altar.echoWardenForestLock'), sub: t('altar.echoWardenForestSub') },
      { mode: 'warden_mountain', title: locBoss({ id: 'warden_mountain_boss', name: '断剑霜侯 · 凛' }, 'name'), unlocked: !!(G.worldState && G.worldState.defeatedMiniBosses && G.worldState.defeatedMiniBosses.has('warden_mountain_boss')), lockHint: t('altar.echoWardenMountainLock'), sub: t('altar.echoWardenMountainSub') },
      { mode: 'warden_rush', title: t('altar.echoWardenRushTitle'), unlocked: !!(G.worldState && G.worldState.defeatedMiniBosses && G.worldState.defeatedMiniBosses.has('warden_wind_boss') && G.worldState.defeatedMiniBosses.has('warden_forest_boss') && G.worldState.defeatedMiniBosses.has('warden_mountain_boss')), lockHint: t('altar.echoWardenRushLock'), sub: t('altar.echoWardenRushSub') },
      { mode: 'zhu', title: locBoss(G.boss4 || { id: 'boss_zhu', name: '初铸残影 · 铸' }, 'name'), unlocked: isBoss4Unlocked(), lockHint: t('altar.echoZhuLock'), sub: t('altar.echoZhuSub') },
      { mode: 'seven_bells', title: t('altar.echoSevenTitle'), unlocked: !!(G.worldState && G.worldState.bossDefeated && G.worldState.boss2Defeated && isBoss4Unlocked()), lockHint: t('altar.echoSevenLock'), sub: t('altar.echoSevenSub') }
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
