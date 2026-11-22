// Visual Bell-Vein Skill Tree (三脉钟纹星图), Live Procedural Action Preview & Relic Refinement Tab (v35.0)
import { COLORS, RELICS, RELIC_REFINE_COST } from '../config.js';
import {
  G, isWeaponUnlocked, unlockWeapon,
  isWeaponTraitUnlocked, getActiveWeaponTraitId, unlockWeaponTrait, setActiveWeaponTrait,
  isSkillNodeUnlocked, unlockSkillNode, isRelicRefined, refineRelic,
  getPlayerMaxHp, getPlayerMaxSoul, getPlayerMaxFlasks, getPlayerMaxSeals,
  triggerBossBanner
} from '../state.js';
import { audio } from '../audio.js';
import { triggerHaptic } from '../input.js';
import { saveProgress } from '../save.js';
import { t, isEn, locNpcName, locRelic } from '../i18n.js';
import { getRelicEmblemSvg, getWeaponEmblemSvg } from '../emblems.js';
import { WEAPONS } from '../weapons.js';
import { checkAchievements } from '../codex.js';
import {
  SKILL_TREE_VIEWBOX, SKILL_BRANCHES, BELL_SKILL_NODES, BELL_SKILL_EDGES, getSkillNodeById
} from '../skillTree.js';
import { uiState, uiHooks } from './uiShared.js';

let smithActiveTab = 'tree'; // 'tree' | 'refine'
let selectedNodeId = 'blade_1';
let hoveredNodeId = null;
let previewTime = 0;

function getNodeStatus(node) {
  if (!node || !G.worldState) return { unlocked: false, available: false, equipped: false, weaponMissing: false };
  if (node.kind === 'root') {
    return { unlocked: true, available: false, equipped: false, weaponMissing: false };
  }
  const u = G.worldState.smithUpgrades || { blade: 0, posture: 0, forge: 0 };
  let unlocked = false;
  let equipped = false;
  let weaponMissing = false;

  if (node.kind === 'smith') {
    unlocked = (u[node.smithId] || 0) >= node.smithRank;
  } else if (node.kind === 'trait') {
    weaponMissing = !isWeaponUnlocked(node.weaponId);
    unlocked = isWeaponTraitUnlocked(node.traitId);
    equipped = unlocked && getActiveWeaponTraitId(node.weaponId) === node.traitId;
  } else if (node.kind === 'skill') {
    unlocked = isSkillNodeUnlocked(node.skillId);
  }

  let reqMet = true;
  for (let i = 0; i < (node.requires || []).length; i++) {
    const parent = getSkillNodeById(node.requires[i]);
    if (parent && !getNodeStatus(parent).unlocked) {
      reqMet = false;
      break;
    }
  }
  const available = !unlocked && reqMet && !weaponMissing;
  return { unlocked, available, equipped, weaponMissing, reqMet };
}

function purchaseOrActivateNode(node) {
  if (!node || !G.worldState) return false;
  const st = getNodeStatus(node);
  const echoes = G.worldState.echoes || 0;

  if (node.kind === 'trait' && st.unlocked) {
    if (!st.equipped) {
      setActiveWeaponTrait(node.weaponId, node.traitId);
      audio.playWeaponSwap(node.weaponId);
      saveProgress(false);
      renderSmithModal();
      uiHooks.syncHUD(true);
      return true;
    }
    return false;
  }

  if (!st.available || echoes < node.cost) return false;
  G.worldState.echoes -= node.cost;

  if (node.kind === 'smith') {
    if (!G.worldState.smithUpgrades) G.worldState.smithUpgrades = { blade: 0, posture: 0, forge: 0 };
    G.worldState.smithUpgrades[node.smithId] = Math.max(G.worldState.smithUpgrades[node.smithId] || 0, node.smithRank);
    if (G.player) {
      G.player.maxHp = getPlayerMaxHp();
      G.player.hp = G.player.maxHp;
      G.player.maxSoul = getPlayerMaxSoul();
      G.player.soul = G.player.maxSoul;
    }
    audio.playParry(true, Math.min(4, node.smithRank + 1));
    triggerHaptic('shieldBreak', 0.9);
  } else if (node.kind === 'trait') {
    unlockWeaponTrait(node.traitId);
    audio.playForgeTrait();
    triggerHaptic('shieldBreak', 0.95);
    checkAchievements({ traitForged: true });
  } else if (node.kind === 'skill') {
    unlockSkillNode(node.skillId);
    audio.playRelicRefine();
    triggerHaptic('execution', 0.95);
  }

  saveProgress(true);
  renderSmithModal();
  uiHooks.syncHUD(true);
  return true;
}

function pickInitialNode() {
  const cur = getSkillNodeById(selectedNodeId);
  if (cur) return cur;
  const firstAvail = BELL_SKILL_NODES.find(n => getNodeStatus(n).available);
  selectedNodeId = firstAvail ? firstAvail.id : 'blade_1';
  return getSkillNodeById(selectedNodeId) || BELL_SKILL_NODES[0];
}

function buildEdgePath(a, b) {
  const mx = (a.x + b.x) * 0.5;
  const my = (a.y + b.y) * 0.5;
  const bendX = a.x === b.x ? 0 : (b.x - a.x) * 0.12;
  return `M ${a.x} ${a.y} Q ${mx - bendX} ${my - 8} ${b.x} ${b.y}`;
}

export function renderSmithModal() {
  if (!G.worldState) return;
  const en = isEn();
  const titleEl = document.getElementById('smith-modal-title');
  if (titleEl) titleEl.textContent = locNpcName(uiState.activeNpcModalRef, 'smith');
  if (!G.worldState.smithUpgrades) G.worldState.smithUpgrades = { blade: 0, posture: 0, forge: 0 };
  const echoes = G.worldState.echoes || 0;

  // Compact single-line atmospheric quote (trimmed from verbose dialogue)
  const dlg = document.getElementById('smith-dialogue');
  if (dlg) {
    const u = G.worldState.smithUpgrades;
    if (G.worldState.boss3Defeated) dlg.textContent = t('smith.quote.end');
    else if (G.worldState.bossDefeated && !isWeaponUnlocked('hammer')) dlg.textContent = t('smith.quote.hammer');
    else if (u.blade + u.posture + u.forge > 0) dlg.textContent = t('smith.quote.forged');
    else dlg.textContent = t('smith.quote.intro');
  }

  const bar = document.getElementById('smith-echo-bar');
  if (bar) bar.textContent = t('smith.echoHold', echoes);

  const list = document.getElementById('smith-upgrade-list');
  if (!list) return;
  list.innerHTML = '';

  // Top Free Bell-Maul Reforge Banner (only when ready after defeating Hui!)
  const hasHammer = isWeaponUnlocked('hammer');
  const canReforgeHammer = !!G.worldState.bossDefeated && !hasHammer;
  if (canReforgeHammer) {
    const hBanner = document.createElement('div');
    hBanner.className = 'smith-hammer-banner';
    hBanner.innerHTML = `
      <span class="smith-hammer-ico">${getWeaponEmblemSvg('hammer')}</span>
      <div class="smith-hammer-txt">
        <strong>${t('smith.hammerTitle')}</strong>
        <span>${t('smith.hammerShort')}</span>
      </div>
    `;
    const hBtn = document.createElement('button');
    hBtn.type = 'button';
    hBtn.className = 'smith-buy-btn';
    hBtn.textContent = t('smith.hammerBtnForge');
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
      triggerBossBanner(t('combat.weaponUnlockBanner', en ? wDef.nameEn : wDef.name), en ? wDef.tagEn : wDef.tag, wDef.color, 3.0);
    });
    hBanner.appendChild(hBtn);
    list.appendChild(hBanner);
  }

  // Forge Mode Tabs: [钟脉星图] vs [圣物淬印 (+1)]
  const unlockedRelicsList = RELICS.filter(r => !r.hidden || (G.worldState.unlockedRelics && G.worldState.unlockedRelics.has(r.id)));
  const refinedCount = unlockedRelicsList.filter(r => isRelicRefined(r.id)).length;
  const litTreeCount = BELL_SKILL_NODES.filter(n => n.kind !== 'root' && getNodeStatus(n).unlocked).length;
  const totalTreeCount = BELL_SKILL_NODES.length - 1;

  const tabs = document.createElement('div');
  tabs.className = 'smith-tabs';
  [
    { id: 'tree', label: t('smith.tabTree', litTreeCount, totalTreeCount) },
    { id: 'refine', label: t('smith.tabRefine', refinedCount, unlockedRelicsList.length) }
  ].forEach(tb => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `codex-tab-btn${smithActiveTab === tb.id ? ' active' : ''}`;
    btn.textContent = tb.label;
    btn.addEventListener('click', () => {
      smithActiveTab = tb.id;
      renderSmithModal();
    });
    tabs.appendChild(btn);
  });
  list.appendChild(tabs);

  if (smithActiveTab === 'refine') {
    renderSmithRefineTab(list, unlockedRelicsList, echoes);
    return;
  }

  // ==================== BELL-VEIN VISUAL SKILL TREE WORKSPACE ====================
  pickInitialNode();
  const layout = document.createElement('div');
  layout.className = 'skill-tree-layout';

  // Left: Interactive SVG Bell Constellation
  const stage = document.createElement('div');
  stage.className = 'skill-tree-stage';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${SKILL_TREE_VIEWBOX.w} ${SKILL_TREE_VIEWBOX.h}`);
  svg.setAttribute('class', 'skill-tree-svg');
  svg.setAttribute('aria-hidden', 'true');

  // Hand-drawn giant cracked bronze bell silhouette behind constellation
  svg.innerHTML = `
    <defs>
      <radialGradient id="bellTreeAura" cx="50%" cy="38%" r="54%">
        <stop offset="0%" stop-color="rgba(245, 158, 11, 0.16)"/>
        <stop offset="65%" stop-color="rgba(56, 189, 248, 0.05)"/>
        <stop offset="100%" stop-color="rgba(0, 0, 0, 0)"/>
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="460" height="370" fill="url(#bellTreeAura)"/>
    <path d="M 192 26 Q 230 8 268 26 L 284 52 Q 354 118 396 294 L 424 344 Q 230 364 36 344 L 64 294 Q 106 118 176 52 Z"
      fill="rgba(16, 20, 32, 0.56)" stroke="rgba(216, 207, 184, 0.22)" stroke-width="1.6"/>
    <path d="M 52 326 Q 230 344 408 326" fill="none" stroke="rgba(245, 158, 11, 0.22)" stroke-width="1.2" stroke-dasharray="5 5"/>
    <path d="M 228 48 L 214 134 L 238 192 L 222 288" fill="none" stroke="rgba(253, 224, 71, 0.12)" stroke-width="1.6"/>
    <text x="86" y="42" fill="rgba(248, 113, 113, 0.72)" font-size="11" font-weight="700" text-anchor="middle">${en ? SKILL_BRANCHES.edge.nameEn : SKILL_BRANCHES.edge.name}</text>
    <text x="230" y="356" fill="rgba(253, 224, 71, 0.72)" font-size="11" font-weight="700" text-anchor="middle">${en ? SKILL_BRANCHES.bell.nameEn : SKILL_BRANCHES.bell.name}</text>
    <text x="376" y="42" fill="rgba(56, 189, 248, 0.78)" font-size="11" font-weight="700" text-anchor="middle">${en ? SKILL_BRANCHES.lantern.nameEn : SKILL_BRANCHES.lantern.name}</text>
  `;

  // Draw vein connections between parent -> child nodes
  for (let i = 0; i < BELL_SKILL_EDGES.length; i++) {
    const edge = BELL_SKILL_EDGES[i];
    const fromN = getSkillNodeById(edge.from);
    const toN = getSkillNodeById(edge.to);
    if (!fromN || !toN) continue;
    const toSt = getNodeStatus(toN);
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', buildEdgePath(fromN, toN));
    const bCol = (SKILL_BRANCHES[edge.branch] && SKILL_BRANCHES[edge.branch].color) || '#fde047';
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', toSt.unlocked ? bCol : toSt.available ? 'rgba(253, 224, 71, 0.56)' : 'rgba(148, 163, 184, 0.20)');
    path.setAttribute('stroke-width', toSt.unlocked ? '2.6' : toSt.available ? '1.8' : '1.2');
    if (!toSt.unlocked) path.setAttribute('stroke-dasharray', toSt.available ? '5 4' : '3 5');
    path.setAttribute('class', `skill-edge${toSt.unlocked ? ' lit' : toSt.available ? ' ready' : ''}`);
    svg.appendChild(path);
  }
  stage.appendChild(svg);

  // Interactive HTML Nodes overlaid cleanly on exact viewBox percentages
  const nodesLayer = document.createElement('div');
  nodesLayer.className = 'skill-nodes-layer';
  const inspector = document.createElement('div');
  inspector.className = 'skill-inspector';

  for (let i = 0; i < BELL_SKILL_NODES.length; i++) {
    const node = BELL_SKILL_NODES[i];
    const st = getNodeStatus(node);
    const canBuy = st.available && echoes >= node.cost;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = [
      'skill-node-btn',
      `shape-${node.shape}`,
      `branch-${node.branch}`,
      st.unlocked ? 'unlocked' : '',
      st.equipped ? 'equipped' : '',
      st.available ? 'available' : '',
      canBuy ? 'affordable' : '',
      st.weaponMissing ? 'weapon-locked' : '',
      selectedNodeId === node.id ? 'selected' : ''
    ].filter(Boolean).join(' ');
    btn.style.left = `${((node.x / SKILL_TREE_VIEWBOX.w) * 100).toFixed(2)}%`;
    btn.style.top = `${((node.y / SKILL_TREE_VIEWBOX.h) * 100).toFixed(2)}%`;
    btn.dataset.nodeId = node.id;
    btn.title = `${en ? node.nameEn : node.name}${node.cost > 0 ? ` (${node.cost})` : ''}`;

    const glyphTxt = st.weaponMissing ? '🔒' : (en ? node.glyphEn : node.glyph);
    const subTag = node.kind === 'trait' && !st.weaponMissing
      ? `<span class="skill-node-wdot" style="background:${WEAPONS[node.weaponId].color};"></span>`
      : '';
    btn.innerHTML = `<span class="skill-node-glyph">${glyphTxt}</span>${subTag}`;

    btn.addEventListener('mouseenter', () => {
      hoveredNodeId = node.id;
      previewTime = 0;
      renderSkillInspector(inspector, node, echoes);
    });
    btn.addEventListener('mouseleave', () => {
      hoveredNodeId = null;
      renderSkillInspector(inspector, getSkillNodeById(selectedNodeId), echoes);
    });
    btn.addEventListener('focus', () => {
      selectedNodeId = node.id;
      previewTime = 0;
      nodesLayer.querySelectorAll('.skill-node-btn').forEach(b => b.classList.toggle('selected', b.dataset.nodeId === node.id));
      renderSkillInspector(inspector, node, echoes);
    });
    btn.addEventListener('click', () => {
      if (selectedNodeId === node.id) {
        purchaseOrActivateNode(node);
      } else {
        selectedNodeId = node.id;
        previewTime = 0;
        nodesLayer.querySelectorAll('.skill-node-btn').forEach(b => b.classList.toggle('selected', b.dataset.nodeId === node.id));
        renderSkillInspector(inspector, node, echoes);
      }
    });
    nodesLayer.appendChild(btn);
  }
  stage.appendChild(nodesLayer);

  renderSkillInspector(inspector, getSkillNodeById(selectedNodeId), echoes);
  layout.append(stage, inspector);
  list.appendChild(layout);

  // Draw frame 0 of action preview immediately
  updateAndRenderSkillPreview(0);
}

function renderSkillInspector(container, node, echoes) {
  if (!container || !node) return;
  const en = isEn();
  const st = getNodeStatus(node);
  const br = SKILL_BRANCHES[node.branch] || SKILL_BRANCHES.core;
  const chips = en ? (node.chipsEn || node.chips) : node.chips;

  let statusPill = '';
  if (node.kind === 'root') statusPill = t('skill.statusRoot');
  else if (st.equipped) statusPill = t('skill.statusEquipped');
  else if (st.unlocked) statusPill = t('skill.statusUnlocked');
  else if (st.weaponMissing) statusPill = t('skill.statusNeedWeapon', en ? WEAPONS[node.weaponId].shortNameEn : WEAPONS[node.weaponId].shortName);
  else if (st.available) statusPill = `✦ ${node.cost}`;
  else statusPill = t('skill.statusLocked');

  const weaponBadge = node.kind === 'trait'
    ? `<span class="skill-insp-wpill" style="border-color:${WEAPONS[node.weaponId].color};color:${WEAPONS[node.weaponId].color};">${en ? WEAPONS[node.weaponId].shortNameEn : WEAPONS[node.weaponId].shortName}</span>`
    : `<span class="skill-insp-wpill" style="border-color:${br.color};color:${br.color};">${en ? br.nameEn : br.name}</span>`;

  container.innerHTML = `
    <div class="skill-insp-head">
      <div class="skill-insp-title">${en ? node.nameEn : node.name}</div>
      <div class="skill-insp-pills">${weaponBadge}<span class="smith-lv-pill">${statusPill}</span></div>
    </div>
    <div class="skill-preview-wrap">
      <canvas id="skill-preview-canvas" width="208" height="116"></canvas>
      <span class="skill-preview-kicker">${t('skill.previewTag')}</span>
    </div>
    <div class="skill-insp-chips">
      ${chips.map(ch => `<div class="skill-chip">✦ ${ch}</div>`).join('')}
    </div>
  `;

  if (node.kind !== 'root') {
    const actBtn = document.createElement('button');
    actBtn.type = 'button';
    actBtn.className = 'smith-buy-btn skill-act-btn';
    if (node.kind === 'trait' && st.equipped) {
      actBtn.disabled = true;
      actBtn.textContent = t('smith.traitActive');
    } else if (node.kind === 'trait' && st.unlocked) {
      actBtn.textContent = t('smith.traitSwitch');
      actBtn.addEventListener('click', () => purchaseOrActivateNode(node));
    } else if (st.unlocked) {
      actBtn.disabled = true;
      actBtn.textContent = t('skill.btnLit');
    } else if (st.weaponMissing) {
      actBtn.disabled = true;
      actBtn.textContent = t('skill.statusNeedWeapon', en ? WEAPONS[node.weaponId].nameEn : WEAPONS[node.weaponId].name);
    } else if (!st.available) {
      const reqN = getSkillNodeById(node.requires[0]);
      actBtn.disabled = true;
      actBtn.textContent = t('skill.btnNeedParent', reqN ? (en ? reqN.nameEn : reqN.name) : '?');
    } else {
      const canBuy = echoes >= node.cost;
      actBtn.disabled = !canBuy;
      actBtn.textContent = t('skill.btnUnlock', node.cost);
      if (canBuy) actBtn.addEventListener('click', () => purchaseOrActivateNode(node));
    }
    container.appendChild(actBtn);
  }
  updateAndRenderSkillPreview(0);
}

function renderSmithRefineTab(list, unlockedRelicsList, echoes) {
  const rGrid = document.createElement('div');
  rGrid.className = 'smith-refine-grid';
  for (const relic of unlockedRelicsList) {
    const isRef = isRelicRefined(relic.id);
    const canRef = !isRef && echoes >= RELIC_REFINE_COST;
    const rCard = document.createElement('div');
    rCard.className = `smith-refine-card${isRef ? ' relic-refined' : ''}`;
    rCard.innerHTML = `
      <div class="smith-refine-head">
        <span class="smith-refine-ico">${getRelicEmblemSvg(relic.id)}</span>
        <div class="smith-refine-titles">
          <div class="smith-refine-name">
            <span>${locRelic(relic, 'name')}</span>
            ${isRef ? `<span class="relic-star-badge">${t('relic.refinedBadge')}</span>` : `<span class="smith-trait-tag">${locRelic(relic, 'tag')}</span>`}
          </div>
          <div class="smith-refine-base">${locRelic(relic, 'shortEffect') || locRelic(relic, 'effect')}</div>
        </div>
      </div>
      <div class="smith-refine-next"><span>★ +1</span>${locRelic(relic, 'shortRefined') || locRelic(relic, 'refinedEffect')}</div>
    `;
    const rBtn = document.createElement('button');
    rBtn.type = 'button';
    rBtn.className = 'smith-buy-btn smith-trait-btn';
    if (isRef) {
      rBtn.disabled = true;
      rBtn.textContent = t('smith.refineDone');
    } else {
      rBtn.disabled = !canRef;
      rBtn.textContent = t('smith.refineBtn', RELIC_REFINE_COST);
      if (canRef) {
        rBtn.addEventListener('click', () => {
          G.worldState.echoes -= RELIC_REFINE_COST;
          refineRelic(relic.id);
          if (G.player) {
            G.player.maxFlasks = getPlayerMaxFlasks();
            G.player.maxSeals = getPlayerMaxSeals();
          }
          audio.playRelicRefine();
          triggerHaptic('execution', 0.9);
          saveProgress(true);
          renderSmithModal();
          uiHooks.syncHUD(true);
        });
      }
    }
    rCard.appendChild(rBtn);
    rGrid.appendChild(rCard);
  }
  list.appendChild(rGrid);
}

// ==================== LIVE 2-SECOND MINI PROCEDURAL ACTION PREVIEW CANVAS ====================
function drawMiniPuppet(c, x, y, facing, accent = '#38bdf8', alpha = 1) {
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.scale(facing, 1);
  // Cloak + torso
  c.fillStyle = '#0e1420';
  c.strokeStyle = '#d8cfb8';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(-8, 0); c.lineTo(-5, -24); c.lineTo(5, -24); c.lineTo(7, 0);
  c.closePath(); c.fill(); c.stroke();
  // Horned mask
  c.fillStyle = '#e6dec8';
  c.beginPath();
  c.arc(0, -29, 5.5, 0, Math.PI * 2);
  c.fill(); c.stroke();
  c.fillStyle = accent;
  c.fillRect(1, -30, 3.5, 2);
  c.restore();
}

function drawMiniDummy(c, x, y, hurt = false, staggered = false) {
  c.save();
  c.translate(x + (hurt ? 3 : 0), y + (staggered ? 5 : 0));
  c.fillStyle = hurt ? '#ffffff' : '#261e16';
  c.strokeStyle = staggered ? '#f87171' : '#f59e0b';
  c.lineWidth = 1.5;
  c.fillRect(-7, -28, 14, 28);
  c.strokeRect(-7, -28, 14, 28);
  c.beginPath(); c.arc(0, -33, 6, Math.PI, 0); c.fill(); c.stroke();
  c.restore();
}

export function updateAndRenderSkillPreview(dt) {
  const cvs = document.getElementById('skill-preview-canvas');
  if (!cvs) return;
  previewTime = (previewTime + Math.min(0.05, Math.max(0, dt || 0))) % 2.2;
  const p = previewTime / 2.2; // 0..1 loop
  const c = cvs.getContext('2d');
  const w = cvs.width;
  const h = cvs.height;
  const fy = h - 20;

  c.clearRect(0, 0, w, h);
  c.fillStyle = '#070b12';
  c.fillRect(0, 0, w, h);
  // Subtle stage floor
  c.fillStyle = '#141c2c';
  c.fillRect(0, fy, w, h - fy);
  c.strokeStyle = 'rgba(216, 207, 184, 0.35)';
  c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(0, fy); c.lineTo(w, fy); c.stroke();

  const node = getSkillNodeById(hoveredNodeId || selectedNodeId);
  const mode = node ? node.preview : 'core';

  if (mode === 'shadow_twin') {
    const lunge = p < 0.28 ? (p / 0.28) : 1;
    const px = 46 + lunge * 76;
    const hit1 = p > 0.26 && p < 0.44;
    const hit2 = p > 0.56 && p < 0.78;
    drawMiniDummy(c, 148, fy, hit1 || hit2, false);
    drawMiniPuppet(c, px, fy, 1, '#fde047');
    if (p > 0.22 && p < 0.45) {
      c.strokeStyle = '#fde047'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(42, fy - 18); c.lineTo(164, fy - 18); c.stroke();
    }
    if (p > 0.48 && p < 0.82) {
      drawMiniPuppet(c, 122, fy, 1, '#38bdf8', 0.45);
      if (hit2) {
        c.strokeStyle = '#38bdf8'; c.lineWidth = 3.2;
        c.beginPath(); c.moveTo(118, fy - 28); c.lineTo(176, fy - 6); c.stroke();
      }
    }
  } else if (mode === 'parry_seal') {
    const clash = p > 0.28 && p < 0.52;
    const riposte = p >= 0.52 && p < 0.78;
    drawMiniDummy(c, 134, fy, riposte, false);
    drawMiniPuppet(c, riposte ? 102 : 84, fy, 1, '#fde047');
    if (clash) {
      c.strokeStyle = '#fde047'; c.lineWidth = 2.4;
      c.beginPath(); c.arc(108, fy - 20, 12 + (p - 0.28) * 55, 0, Math.PI * 2); c.stroke();
    }
    if (riposte) {
      c.strokeStyle = '#fde047'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(96, fy - 34); c.lineTo(152, fy - 8); c.moveTo(152, fy - 34); c.lineTo(96, fy - 8); c.stroke();
    }
    // Floating golden seal icon popping up
    const seals = p > 0.55 ? 2 : p > 0.30 ? 1 : 0;
    for (let s = 0; s < seals; s++) {
      c.fillStyle = '#fde047';
      c.fillRect(62 - s * 10, fy - 42, 6, 6);
    }
  } else if (mode === 'quake_echo') {
    const slam = p > 0.34;
    const waveP = Math.max(0, (p - 0.34) / 0.56);
    drawMiniDummy(c, 168, fy, waveP > 0.35 && waveP < 0.65, false);
    drawMiniDummy(c, 40, fy, waveP > 0.35 && waveP < 0.65, false);
    drawMiniPuppet(c, 104, fy, 1, '#f59e0b');
    if (slam && waveP < 1) {
      const dist = waveP * 82;
      c.strokeStyle = '#fde047'; c.lineWidth = 2.6;
      c.beginPath();
      c.moveTo(104 + dist, fy); c.lineTo(104 + dist + 10, fy - 18); c.lineTo(104 + dist + 16, fy);
      c.moveTo(104 - dist, fy); c.lineTo(104 - dist - 10, fy - 18); c.lineTo(104 - dist - 16, fy);
      c.stroke();
    }
  } else if (mode === 'iron_bulwark') {
    const pulseP = Math.max(0, (p - 0.36) / 0.45);
    drawMiniDummy(c, 146, fy, pulseP > 0.1 && pulseP < 0.45, false);
    drawMiniPuppet(c, 92, fy, 1, '#fde047');
    // Hyper-armor gold shell
    c.strokeStyle = '#fde047'; c.lineWidth = 2.2;
    c.beginPath(); c.arc(92, fy - 18, 19, 0, Math.PI * 2); c.stroke();
    if (pulseP > 0 && pulseP < 1) {
      c.strokeStyle = `rgba(253, 224, 71, ${(1 - pulseP).toFixed(2)})`;
      c.lineWidth = 3;
      c.beginPath(); c.arc(92, fy - 18, 22 + pulseP * 64, 0, Math.PI * 2); c.stroke();
    }
  } else if (mode === 'echo_ring') {
    const ringX = 68 + Math.min(1, p / 0.42) * 74;
    const split = p >= 0.42 && p < 0.88;
    drawMiniDummy(c, 146, fy, p > 0.40 && p < 0.56, false);
    drawMiniDummy(c, 178, fy, p > 0.72 && p < 0.88, false);
    drawMiniPuppet(c, 54, fy, 1, '#38bdf8');
    if (p < 0.44) {
      c.strokeStyle = '#38bdf8'; c.lineWidth = 2.6;
      c.beginPath(); c.arc(ringX, fy - 18, 9, -1.1, 1.1); c.stroke();
    }
    if (split) {
      const sp = (p - 0.42) / 0.46;
      const dx = 146 + sp * 32;
      const dy = fy - 24 - Math.sin(sp * Math.PI) * 20;
      c.fillStyle = '#bae6fd';
      c.beginPath(); c.arc(dx, dy, 4, 0, Math.PI * 2); c.fill();
    }
  } else if (mode === 'soul_gather') {
    drawMiniDummy(c, 158, fy, p > 0.48 && p < 0.78, false);
    drawMiniPuppet(c, 52, fy, 1, '#38bdf8');
    if (p > 0.16 && p < 0.76) {
      const sp = (p - 0.16) / 0.60;
      for (let d = 0; d < 4; d++) {
        const dp = Math.max(0, Math.min(1, sp * 1.25 - d * 0.08));
        const dx = 64 + dp * 94;
        const dy = fy - 22 + Math.sin(dp * Math.PI) * ((d - 1.5) * 16);
        c.fillStyle = '#38bdf8';
        c.beginPath(); c.arc(dx, dy, 3.2, 0, Math.PI * 2); c.fill();
      }
    }
    if (p > 0.65) {
      c.fillStyle = '#fde047';
      c.fillRect(46, fy - 46, 8, 8);
    }
  } else if (mode === 'air_flask') {
    const hoverY = fy - 38 + Math.sin(p * Math.PI * 2) * 4;
    drawMiniPuppet(c, 104, hoverY, 1, '#38bdf8');
    // Cyan aerial suspension ring + rising healing droplets
    c.strokeStyle = 'rgba(56, 189, 248, 0.72)';
    c.lineWidth = 1.8;
    c.beginPath(); c.ellipse(104, hoverY + 4, 18, 4.5, 0, 0, Math.PI * 2); c.stroke();
    const healBurst = p > 0.35 && p < 0.80;
    if (healBurst) {
      const bp = (p - 0.35) / 0.45;
      c.strokeStyle = `rgba(186, 230, 253, ${(1 - bp).toFixed(2)})`;
      c.lineWidth = 2.4;
      c.beginPath(); c.arc(104, hoverY - 16, 8 + bp * 32, 0, Math.PI * 2); c.stroke();
    }
  } else if (mode === 'exec_surge') {
    const killed = p > 0.32;
    if (!killed) drawMiniDummy(c, 118, fy, p > 0.24, true);
    const px = killed ? 94 + Math.min(1, (p - 0.32) / 0.48) * 86 : 94;
    if (killed && p < 0.78) {
      drawMiniPuppet(c, px - 18, fy, 1, '#38bdf8', 0.35);
      drawMiniPuppet(c, px - 34, fy, 1, '#a855f7', 0.18);
    }
    drawMiniPuppet(c, px, fy, 1, '#38bdf8');
    if (p > 0.28 && p < 0.48) {
      c.strokeStyle = '#f87171'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(96, fy - 34); c.lineTo(136, fy - 4); c.stroke();
    }
  } else if (mode === 'posture_stat') {
    const hit = p > 0.35 && p < 0.60;
    const stag = p >= 0.56;
    drawMiniDummy(c, 138, fy, hit, stag);
    drawMiniPuppet(c, 88, fy, 1, '#fde047');
    // Posture bar above dummy filling & breaking
    const ratio = stag ? 1 : Math.min(1, p / 0.55);
    c.fillStyle = '#1e293b'; c.fillRect(120, fy - 48, 36, 5);
    c.fillStyle = stag ? '#f87171' : '#fde047'; c.fillRect(120, fy - 48, 36 * ratio, 5);
    if (hit) {
      c.strokeStyle = '#fde047'; c.lineWidth = 2.6;
      c.beginPath(); c.arc(116, fy - 20, 14, 0, Math.PI * 2); c.stroke();
    }
  } else if (mode === 'forge_stat') {
    drawMiniPuppet(c, 104, fy, 1, '#38bdf8');
    const r = 12 + Math.sin(p * Math.PI) * 26;
    c.strokeStyle = 'rgba(248, 113, 113, 0.75)'; c.lineWidth = 2;
    c.beginPath(); c.arc(104, fy - 18, r, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(56, 189, 248, 0.75)';
    c.beginPath(); c.arc(104, fy - 18, r * 0.68, 0, Math.PI * 2); c.stroke();
  } else {
    // blade_stat & core
    const swing = p > 0.25 && p < 0.70;
    drawMiniDummy(c, 144, fy, swing, false);
    drawMiniPuppet(c, 92, fy, 1, '#fde047');
    if (swing) {
      c.strokeStyle = '#fde047'; c.lineWidth = 3.2;
      c.beginPath(); c.arc(108, fy - 18, 28, -1.2, 1.1); c.stroke();
    }
  }
}
