// Full Gamepad 2D Spatial Focus, Shoulder-Tab Cycling & Smooth Scroll for All Modals (v43.0)

let currentFocusEl = null;

function getActiveOverlayRoot() {
  const overlays = document.querySelectorAll('.overlay-screen:not(.hidden)');
  if (!overlays.length) return null;
  return overlays[overlays.length - 1];
}

function isInspectableLocked(el) {
  return el.classList.contains('weapon-art-card') ||
    el.classList.contains('bestiary-tile') ||
    el.classList.contains('skill-node-btn');
}

function isVisibleFocusable(el) {
  if (!el || el.disabled) return false;
  if (el.classList.contains('locked') && !isInspectableLocked(el)) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 4 && rect.height > 4;
}

export function getOverlayFocusables() {
  const root = getActiveOverlayRoot();
  if (!root) return [];
  const raw = root.querySelectorAll(
    'button, input[type="range"], [role="button"], .relic-card:not(.locked), .weapon-art-card, .bestiary-tile, .skill-node-btn'
  );
  const list = [];
  for (let i = 0; i < raw.length; i++) {
    if (isVisibleFocusable(raw[i])) list.push(raw[i]);
  }
  return list;
}

function dispatchHoverSync(el, enter) {
  if (!el) return;
  if (!el.classList.contains('relic-card') && !el.classList.contains('skill-node-btn')) return;
  try {
    el.dispatchEvent(new MouseEvent(enter ? 'mouseenter' : 'mouseleave', { bubbles: false }));
  } catch {
    // Ignore synthetic event errors
  }
}

function syncGamepadLegendBar(visible) {
  const bar = document.getElementById('gp-nav-bar');
  if (!bar) return;
  const show = !!(visible && document.body.classList.contains('input-gamepad') && getActiveOverlayRoot());
  bar.classList.toggle('hidden', !show);
}

export function clearGamepadFocus() {
  if (currentFocusEl) {
    currentFocusEl.classList.remove('gp-focus');
    dispatchHoverSync(currentFocusEl, false);
    currentFocusEl = null;
  }
  syncGamepadLegendBar(false);
}

export function setGamepadFocus(el) {
  if (currentFocusEl && currentFocusEl !== el) {
    currentFocusEl.classList.remove('gp-focus');
    dispatchHoverSync(currentFocusEl, false);
  }
  currentFocusEl = el || null;
  if (currentFocusEl) {
    currentFocusEl.classList.add('gp-focus');
    dispatchHoverSync(currentFocusEl, true);
    try {
      currentFocusEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } catch {
      // Ignore scroll errors
    }
  }
}

export function ensureOverlayFocus() {
  const list = getOverlayFocusables();
  if (!list.length) {
    clearGamepadFocus();
    return null;
  }
  syncGamepadLegendBar(true);
  if (!currentFocusEl || !list.includes(currentFocusEl)) {
    const preferred = list.find(el => el.classList.contains('skill-node-btn') && el.classList.contains('selected'))
      || list.find(el => el.classList.contains('bestiary-tile') && el.classList.contains('selected'))
      || list.find(el => el.classList.contains('weapon-art-card') && el.classList.contains('selected'))
      || list.find(el => !el.classList.contains('modal-top-close') && !el.classList.contains('modal-top-link'))
      || list[0];
    setGamepadFocus(preferred);
  }
  return currentFocusEl;
}

export function cycleOverlayTab(delta = 1) {
  const root = getActiveOverlayRoot();
  if (!root) return false;
  const tabBtns = Array.from(root.querySelectorAll('.codex-tab-btn, .map-pin-btn')).filter(isVisibleFocusable);
  if (tabBtns.length < 2) return false;
  let curIdx = tabBtns.findIndex(b => b.classList.contains('active'));
  if (curIdx < 0) curIdx = 0;
  const nextIdx = (curIdx + delta + tabBtns.length) % tabBtns.length;
  tabBtns[nextIdx].click();
  window.setTimeout(() => {
    const fresh = getOverlayFocusables();
    const contentFirst = fresh.find(el =>
      !el.classList.contains('modal-top-close') &&
      !el.classList.contains('modal-top-link') &&
      !el.classList.contains('codex-tab-btn')
    );
    if (contentFirst) setGamepadFocus(contentFirst);
    else ensureOverlayFocus();
  }, 24);
  return true;
}

export function scrollOverlay(deltaY) {
  const root = getActiveOverlayRoot();
  if (!root || !deltaY) return;
  const targets = [root.querySelector('.codex-body:not(.hidden)'), root.querySelector('.modal-card')];
  for (let i = 0; i < targets.length; i++) {
    const el = targets[i];
    if (el && el.scrollHeight > el.clientHeight + 8) {
      el.scrollTop += deltaY;
      return;
    }
  }
}

export function navigateOverlay(dir) {
  const list = getOverlayFocusables();
  if (!list.length) return;
  const cur = ensureOverlayFocus();
  if (!cur) return;

  if (cur.tagName === 'INPUT' && cur.type === 'range' && (dir === 'left' || dir === 'right')) {
    const step = Number(cur.step) || 5;
    const min = Number(cur.min) || 0;
    const max = Number(cur.max) || 100;
    const curVal = Number(cur.value) || 0;
    const nextVal = Math.max(min, Math.min(max, curVal + (dir === 'right' ? step * 2 : -step * 2)));
    if (nextVal !== curVal) {
      cur.value = String(nextVal);
      cur.dispatchEvent(new Event('input', { bubbles: true }));
      cur.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return;
  }

  const cr = cur.getBoundingClientRect();
  const cx = cr.left + cr.width * 0.5;
  const cy = cr.top + cr.height * 0.5;
  let best = null;
  let bestScore = Infinity;

  for (let i = 0; i < list.length; i++) {
    const cand = list[i];
    if (cand === cur) continue;
    const r = cand.getBoundingClientRect();
    const dx = (r.left + r.width * 0.5) - cx;
    const dy = (r.top + r.height * 0.5) - cy;
    if (dir === 'up' && dy >= -6) continue;
    if (dir === 'down' && dy <= 6) continue;
    if (dir === 'left' && dx >= -6) continue;
    if (dir === 'right' && dx <= 6) continue;
    const primary = (dir === 'up' || dir === 'down') ? Math.abs(dy) : Math.abs(dx);
    const ortho = (dir === 'up' || dir === 'down') ? Math.abs(dx) : Math.abs(dy);
    const score = primary + ortho * 2.1;
    if (score < bestScore) { bestScore = score; best = cand; }
  }

  if (best) {
    setGamepadFocus(best);
  } else {
    const idx = list.indexOf(cur);
    const delta = (dir === 'down' || dir === 'right') ? 1 : -1;
    setGamepadFocus(list[(idx + delta + list.length) % list.length]);
  }
}

export function confirmOverlayFocus() {
  const cur = ensureOverlayFocus();
  if (!cur) return false;
  if (cur.tagName === 'INPUT' && cur.type === 'range') return false;
  const prevId = cur.id || '';
  const prevNodeId = cur.dataset ? (cur.dataset.nodeId || cur.dataset.relicId || '') : '';
  cur.click();
  window.setTimeout(() => {
    const root = getActiveOverlayRoot();
    if (!root) { clearGamepadFocus(); return; }
    if (prevId) {
      const same = document.getElementById(prevId);
      if (same && isVisibleFocusable(same)) { setGamepadFocus(same); return; }
    }
    if (prevNodeId) {
      const sameData = root.querySelector(`[data-node-id="${prevNodeId}"], [data-relic-id="${prevNodeId}"]`);
      if (sameData && isVisibleFocusable(sameData)) { setGamepadFocus(sameData); return; }
    }
    ensureOverlayFocus();
  }, 24);
  return true;
}
