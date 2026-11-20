// Full Gamepad focus navigation for Title, Pause, Altar, Smith, Settings, Map, Death & Victory overlays

let currentFocusEl = null;

function getActiveOverlayRoot() {
  const overlays = document.querySelectorAll('.overlay-screen:not(.hidden)');
  if (!overlays.length) return null;
  return overlays[overlays.length - 1];
}

function isVisibleFocusable(el) {
  if (!el || el.disabled) return false;
  if (el.classList.contains('locked')) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 4 && rect.height > 4;
}

export function getOverlayFocusables() {
  const root = getActiveOverlayRoot();
  if (!root) return [];
  const raw = root.querySelectorAll('button, input[type="range"], [role="button"], .relic-card:not(.locked)');
  const list = [];
  for (let i = 0; i < raw.length; i++) {
    if (isVisibleFocusable(raw[i])) list.push(raw[i]);
  }
  return list;
}

export function clearGamepadFocus() {
  if (currentFocusEl) {
    currentFocusEl.classList.remove('gp-focus');
    currentFocusEl = null;
  }
}

export function setGamepadFocus(el) {
  if (currentFocusEl && currentFocusEl !== el) {
    currentFocusEl.classList.remove('gp-focus');
  }
  currentFocusEl = el || null;
  if (currentFocusEl) {
    currentFocusEl.classList.add('gp-focus');
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
  if (!currentFocusEl || !list.includes(currentFocusEl)) {
    setGamepadFocus(list[0]);
  }
  return currentFocusEl;
}

export function navigateOverlay(dir) {
  const list = getOverlayFocusables();
  if (!list.length) return;
  const cur = ensureOverlayFocus();
  if (!cur) return;

  // Range slider: Left/Right adjusts value directly by 10%
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
    const tx = r.left + r.width * 0.5;
    const ty = r.top + r.height * 0.5;
    const dx = tx - cx;
    const dy = ty - cy;

    if (dir === 'up' && dy >= -6) continue;
    if (dir === 'down' && dy <= 6) continue;
    if (dir === 'left' && dx >= -6) continue;
    if (dir === 'right' && dx <= 6) continue;

    const primary = (dir === 'up' || dir === 'down') ? Math.abs(dy) : Math.abs(dx);
    const ortho = (dir === 'up' || dir === 'down') ? Math.abs(dx) : Math.abs(dy);
    const score = primary + ortho * 2.2;
    if (score < bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  if (best) {
    setGamepadFocus(best);
  } else {
    // Wrap sequentially if no spatial neighbor exists in that direction
    const idx = list.indexOf(cur);
    const delta = (dir === 'down' || dir === 'right') ? 1 : -1;
    const nextIdx = (idx + delta + list.length) % list.length;
    setGamepadFocus(list[nextIdx]);
  }
}

export function confirmOverlayFocus() {
  const cur = ensureOverlayFocus();
  if (!cur) return false;
  if (cur.tagName === 'INPUT' && cur.type === 'range') return false;
  cur.click();
  // Re-validate focus in case DOM re-rendered (e.g., relic equip or smith upgrade)
  window.setTimeout(() => {
    if (getActiveOverlayRoot()) ensureOverlayFocus();
  }, 20);
  return true;
}
