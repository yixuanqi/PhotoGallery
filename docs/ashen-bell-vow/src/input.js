// Keyboard (customizable keybinds), mouse preset, Gamepad API (+ Dual-Rumble Haptics) & mobile touch input system
import { COLORS, DEFAULT_KEYBINDS, ACTION_META } from './config.js';
import { G, hooks } from './state.js';
import { audio } from './audio.js';
import { spawnFloatText } from './vfx.js';
import { ensureOverlayFocus, navigateOverlay, confirmOverlayFocus, clearGamepadFocus } from './uiNav.js';

export const keysHeld = {};
export const gpHeld = {};
export const keysPressed = {};
export const keysReleased = {};
export const mouseHeldButtons = {};

// Action-level virtual channels for Gamepad, Mouse & Mobile Touch (immune to keyboard rebinding!)
const actionHeld = {};
const actionPressed = {};
const actionReleased = {};

const ACTION_ALTS = {};
for (const m of ACTION_META) ACTION_ALTS[m.id] = m.alts || [];

const LEGACY_KEY_TO_ACTION = {
  KeyA: 'left',
  KeyD: 'right',
  KeyW: 'up',
  KeyS: 'down',
  Space: 'jump',
  KeyJ: 'attack',
  KeyK: 'parry',
  ShiftLeft: 'dash',
  KeyU: 'spell',
  KeyI: 'grapple',
  KeyL: 'seal',
  KeyH: 'heal',
  KeyE: 'interact',
  KeyM: 'map'
};

let capturingAction = null;
let captureCallback = null;

export function isCapturingKey() {
  return capturingAction !== null;
}

export function startKeyCapture(action, onDone) {
  capturingAction = action;
  captureCallback = typeof onDone === 'function' ? onDone : null;
}

export function cancelKeyCapture() {
  capturingAction = null;
  captureCallback = null;
}

export function resetDefaultKeybinds() {
  G.settings.keybinds = { ...DEFAULT_KEYBINDS };
  syncControlModeUI();
}

export function getActionKeyCode(action) {
  const kb = G.settings && G.settings.keybinds ? G.settings.keybinds : DEFAULT_KEYBINDS;
  return kb[action] || DEFAULT_KEYBINDS[action] || '';
}

export function formatKeyCode(code) {
  if (!code) return '?';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map = {
    Space: 'Space',
    ShiftLeft: 'Shift',
    ShiftRight: 'R-Shift',
    ControlLeft: 'Ctrl',
    ControlRight: 'R-Ctrl',
    AltLeft: 'Alt',
    AltRight: 'R-Alt',
    Tab: 'Tab',
    Enter: 'Enter',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/'
  };
  return map[code] || code;
}

const GAMEPAD_LABELS = {
  left: '←', right: '→', up: '↑', down: '↓',
  jump: 'A', attack: 'X/RB', parry: 'LB', dash: 'B',
  spell: 'Y', grapple: 'LT', seal: 'RT', heal: '↑键',
  interact: 'R3/↓', map: 'View'
};

function setActiveInputDevice(dev) {
  if (G.inputDevice === dev) return;
  G.inputDevice = dev;
  if (dev !== 'gamepad') clearGamepadFocus();
  syncControlModeUI();
}

export function getActionKeyLabel(action) {
  if (G.inputDevice === 'gamepad' && GAMEPAD_LABELS[action]) return GAMEPAD_LABELS[action];
  return formatKeyCode(getActionKeyCode(action));
}

function getActionCodes(action) {
  const kb = G.settings && G.settings.keybinds ? G.settings.keybinds : DEFAULT_KEYBINDS;
  const primary = kb[action] || DEFAULT_KEYBINDS[action];
  const codes = primary ? [primary] : [];
  const alts = ACTION_ALTS[action] || [];
  for (let i = 0; i < alts.length; i++) {
    const alt = alts[i];
    let claimedByOther = false;
    for (const k of Object.keys(kb)) {
      if (k !== action && kb[k] === alt) {
        claimedByOther = true;
        break;
      }
    }
    if (!claimedByOther && !codes.includes(alt)) codes.push(alt);
  }
  return codes;
}

function setVirtualAction(action, down) {
  if (!action) return;
  const prev = !!actionHeld[action];
  if (down && !prev) actionPressed[action] = true;
  if (!down && prev) actionReleased[action] = true;
  actionHeld[action] = down;
}

function pulseVirtualAction(action) {
  if (!action) return;
  actionPressed[action] = true;
}

export function onKeyDown(e) {
  if (capturingAction) {
    e.preventDefault();
    e.stopPropagation();
    const done = captureCallback;
    const act = capturingAction;
    capturingAction = null;
    captureCallback = null;
    if (e.code === 'Escape') {
      if (done) done(false, null);
      return;
    }
    const kb = G.settings.keybinds;
    const prevCode = kb[act];
    for (const other of Object.keys(kb)) {
      if (other !== act && kb[other] === e.code) {
        kb[other] = prevCode;
      }
    }
    kb[act] = e.code;
    syncControlModeUI();
    if (done) done(true, e.code);
    return;
  }

  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }
  setActiveInputDevice('kbmouse');
  if (!keysHeld[e.code]) keysPressed[e.code] = true;
  keysHeld[e.code] = true;
  if (G.gameState === 'playing') audio.init();
}

export function onKeyUp(e) {
  if (keysHeld[e.code]) keysReleased[e.code] = true;
  keysHeld[e.code] = false;
}

export function isHeld(codes) {
  return codes.some(c => keysHeld[c] || gpHeld[c]);
}

export function consumePress(codes) {
  for (const c of codes) {
    if (keysPressed[c]) {
      keysPressed[c] = false;
      return true;
    }
  }
  return false;
}

export function consumeRelease(codes) {
  for (const c of codes) {
    if (keysReleased[c]) {
      keysReleased[c] = false;
      return true;
    }
  }
  return false;
}

export function isActionHeld(action) {
  if (actionHeld[action]) return true;
  const codes = getActionCodes(action);
  return codes.some(c => keysHeld[c] || gpHeld[c]);
}

export function consumeActionPress(action) {
  if (actionPressed[action]) {
    actionPressed[action] = false;
    return true;
  }
  return consumePress(getActionCodes(action));
}

export function consumeActionRelease(action) {
  if (actionReleased[action]) {
    actionReleased[action] = false;
    return true;
  }
  return consumeRelease(getActionCodes(action));
}

export function clearFrameInputs() {
  for (const code of Object.keys(keysPressed)) keysPressed[code] = false;
  for (const code of Object.keys(keysReleased)) keysReleased[code] = false;
  for (const act of Object.keys(actionPressed)) actionPressed[act] = false;
  for (const act of Object.keys(actionReleased)) actionReleased[act] = false;
}

// ==================== GAMEPAD DUAL-RUMBLE HAPTIC FEEDBACK ====================
const HAPTIC_PRESETS = {
  lightHit:    { duration: 48,  weak: 0.24, strong: 0.14 },
  heavyHit:    { duration: 105, weak: 0.45, strong: 0.62 },
  parry:       { duration: 92,  weak: 0.78, strong: 0.44 },
  block:       { duration: 75,  weak: 0.30, strong: 0.38 },
  shieldBreak: { duration: 150, weak: 0.72, strong: 0.85 },
  iai:         { duration: 120, weak: 0.68, strong: 0.72 },
  execution:   { duration: 240, weak: 0.82, strong: 1.00 },
  bossPhase:   { duration: 280, weak: 0.65, strong: 0.92 },
  hurt:        { duration: 135, weak: 0.55, strong: 0.78 },
  test:        { duration: 160, weak: 0.75, strong: 0.75 }
};

export function triggerHaptic(preset = 'lightHit', scale = 1.0) {
  if (!G.settings || !G.settings.haptics || !navigator.getGamepads) return false;
  const p = HAPTIC_PRESETS[preset] || HAPTIC_PRESETS.lightHit;
  const pads = navigator.getGamepads();
  let fired = false;
  for (let i = 0; i < pads.length; i++) {
    const pad = pads[i];
    if (!pad || !pad.connected) continue;
    const act = pad.vibrationActuator || (pad.hapticActuators && pad.hapticActuators[0]);
    if (!act) continue;
    const weak = Math.max(0, Math.min(1, p.weak * scale));
    const strong = Math.max(0, Math.min(1, p.strong * scale));
    const dur = Math.round(p.duration * Math.min(1.4, Math.max(0.75, scale)));
    try {
      if (typeof act.playEffect === 'function') {
        const res = act.playEffect('dual-rumble', {
          startDelay: 0,
          duration: dur,
          weakMagnitude: weak,
          strongMagnitude: strong
        });
        if (res && typeof res.catch === 'function') res.catch(() => {});
        fired = true;
      } else if (typeof act.pulse === 'function') {
        const res = act.pulse(Math.max(weak, strong), dur);
        if (res && typeof res.catch === 'function') res.catch(() => {});
        fired = true;
      }
    } catch {
      // Ignore unsupported browser gamepad actuators
    }
  }
  return fired;
}

export function isMobileDevice() {
  const coarse = !!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches);
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile|MicroMessenger/i.test(navigator.userAgent || '');
  return coarse || (mobileUA && ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0));
}

export function isForceLandscape() {
  return document.body.classList.contains('force-landscape');
}

export function updateMobileOrientationLayout() {
  const mobile = isMobileDevice();
  const portrait = window.innerHeight > window.innerWidth;
  document.body.classList.toggle('is-mobile', mobile);
  document.body.classList.toggle('force-landscape', mobile && portrait);
  return { mobile, forceLandscape: mobile && portrait };
}

export function requestMobileLandscapeFullscreen() {
  if (!isMobileDevice()) return;
  const el = document.documentElement;
  const reqFs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  const tryLock = () => {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  };
  if (reqFs && !document.fullscreenElement && !document.webkitFullscreenElement) {
    try {
      const p = reqFs.call(el);
      if (p && typeof p.then === 'function') p.then(tryLock).catch(tryLock);
      else tryLock();
    } catch {
      tryLock();
    }
  } else {
    tryLock();
  }
}

export function getControlLabels() {
  if (document.body.classList.contains('is-mobile')) {
    return {
      slash: '普攻',
      parry: '弹反',
      grapple: '钩锁',
      spell: '法术',
      seal: '墨印',
      heal: '灯油',
      interact: '交互',
      shortGrapple: '索'
    };
  }
  if (G.inputDevice === 'gamepad') {
    return {
      slash: 'X / RB',
      parry: 'LB',
      grapple: 'LT',
      spell: 'Y',
      seal: 'RT',
      heal: '十字↑',
      interact: 'R3 / ↓',
      shortGrapple: 'LT'
    };
  }
  const atk = getActionKeyLabel('attack');
  const par = getActionKeyLabel('parry');
  const grp = getActionKeyLabel('grapple');
  const spl = getActionKeyLabel('spell');
  const sel = getActionKeyLabel('seal');
  const hea = getActionKeyLabel('heal');
  const inter = getActionKeyLabel('interact');
  if (G.controlMode === 'kbmouse') {
    return {
      slash: `左键 / ${atk}`,
      parry: `右键 / ${par}`,
      grapple: `F / 中键 / ${grp}`,
      spell: `R / ${spl}`,
      seal: `C / ${sel}`,
      heal: `Q / ${hea}`,
      interact: inter,
      shortGrapple: `${grp} / 索`
    };
  }
  return {
    slash: atk,
    parry: par,
    grapple: `${grp} / F / 右键`,
    spell: `${spl} / R`,
    seal: `${sel} / C`,
    heal: `${hea} / Q`,
    interact: inter,
    shortGrapple: `${grp} / 索`
  };
}

export function syncHelpModalText() {
  const el = document.getElementById('help-modal-body');
  if (!el) return;
  const k = getControlLabels();
  const upK = getActionKeyLabel('up');
  const dnK = getActionKeyLabel('down');
  el.innerHTML =
    `<strong>1. 立体断刃剑技 [${k.slash}]</strong>：轻按三连（上挑 → 横扫 → 踏步重劈）；<strong>长按 [${k.slash}]</strong> 沉身收刀蓄力释放<strong>「居合 · 一闪」</strong>；配合 <strong>[${upK}+斩]</strong> 上挑斩、空中 <strong>[${dnK}+斩]</strong> 踩头与悬灯/钟摆/共鸣钟下劈弹跳。<br>` +
    `<strong>2. 双魂火法术 [${k.spell}] / [${upK}+${k.spell}] &amp; 幽丝钩索 [${k.grapple}]</strong>：平按 <strong>[${k.spell}]</strong> 发射水平穿透「幽鸣灵刃」(耗30)；按住 <strong>[${upK}+${k.spell}]</strong> 施放对空与 360° 范围爆发<strong>「镇魂钟鸣」</strong>(耗40)，可直接破重盾、震散法球并一次敲响周围多口悬灯与共鸣钟！<br>` +
    `<strong>3. 精准弹反 [${k.parry}] &amp; 识破反击 [${k.parry} → 斩]</strong>：完美弹反零伤打铁（可反弹怨灵火球与青铜钟摆！）并攒墨印；弹反后 0.56 秒内接斩派生<strong>「断钟返 · 十字反击斩」</strong>，双倍吸血狂削架势。<br>` +
    `<strong>4. 双圣物槽 &amp; 隐藏羁绊</strong>：祭坛可同时铭刻<strong>主印 + 副印</strong>，特定组合会激活机制质变羁绊（如幽丝断钟+回响钟舌、碎镜之眼+孤灯余烬、噬痛荆棘+裂钟铁心、古钟心核+碎镜之眼）！<br>` +
    `<strong>5. 墨印引爆 [${k.seal}]、灯油回血 [${k.heal}] 与处决 [斩]</strong>：攒墨印后按 <strong>[${k.seal}]</strong> 突刺贴符引爆；敌方架势崩溃跪地时，近身按斩触发黑白反色处决！可在右上角「设置」中自定义键位、开关手柄震动或微调辅助难度。`;
}

export function syncControlModeUI() {
  const btn = document.getElementById('btn-ctrl');
  const bar = document.getElementById('quick-bar');
  const k = getControlLabels();
  const l = getActionKeyLabel('left');
  const r = getActionKeyLabel('right');
  const u = getActionKeyLabel('up');
  const j = getActionKeyLabel('jump');
  const d = getActionKeyLabel('dash');
  const e = getActionKeyLabel('interact');
  const m = getActionKeyLabel('map');
  if (btn) btn.textContent = G.controlMode === 'kbmouse' ? '操控: 键鼠' : '操控: 纯键';
  if (bar) {
    bar.textContent =
      `${l}/${r} 移 · ${j} 跳 · ${k.slash} 斩/居合 · ${k.parry} 弹反 · ${k.grapple} 钩索 · ${k.spell} 灵刃 · ${u}+法 钟鸣 · ${d} 闪 · ${k.seal} 墨印 · ${k.heal} 回血 · ${e} 交互 · ${m} 舆图`;
  }
  syncHelpModalText();
}

let gpConnectedNotified = false;
const gpPrev = {};

function setGpAction(action, down) {
  const prev = !!gpPrev[action];
  if (down !== prev) {
    setVirtualAction(action, down);
    gpPrev[action] = down;
  }
}

export function pollGamepad() {
  if (!navigator.getGamepads) return;
  const pads = navigator.getGamepads();
  let pad = null;
  for (let i = 0; i < pads.length; i++) {
    if (pads[i] && pads[i].connected) {
      pad = pads[i];
      break;
    }
  }
  if (!pad) {
    for (const act of Object.keys(gpPrev)) {
      if (gpPrev[act] && !act.startsWith('_')) setGpAction(act, false);
    }
    return;
  }

  const b = idx => !!(pad.buttons[idx] && (pad.buttons[idx].pressed || pad.buttons[idx].value > 0.35));
  const axX = pad.axes[0] || 0;
  const axY = pad.axes[1] || 0;

  const btnA = b(0);
  const btnB = b(1);
  const btnView = b(8);
  const btnStart = b(9);
  const navUp = axY < -0.55 || b(12);
  const navDown = axY > 0.55 || b(13);
  const navLeft = axX < -0.55 || b(14);
  const navRight = axX > 0.55 || b(15);

  if (btnA || btnB || btnView || btnStart || navUp || navDown || navLeft || navRight || b(2) || b(3) || b(4) || b(5)) {
    setActiveInputDevice('gamepad');
  }

  if (btnView && !gpPrev._gpView) {
    if (G.gameState === 'playing' || G.activeModal === 'map') hooks.openMapModal();
  }
  gpPrev._gpView = btnView;

  if (btnStart && !gpPrev._gpPause) {
    if (G.gameState === 'playing') hooks.openPauseModal();
    else if (G.activeModal === 'pause') hooks.closeModal('pause');
  }
  gpPrev._gpPause = btnStart;

  // Full Gamepad Focus Navigation for all overlays (Title, Pause, Altar, Smith, Settings, Map, Death, Victory)
  if (G.gameState !== 'playing') {
    if (G.inputDevice === 'gamepad') ensureOverlayFocus();
    if (navUp && !gpPrev._navUp) navigateOverlay('up');
    if (navDown && !gpPrev._navDown) navigateOverlay('down');
    if (navLeft && !gpPrev._navLeft) navigateOverlay('left');
    if (navRight && !gpPrev._navRight) navigateOverlay('right');
    if (btnA && !gpPrev._uiConfirm) {
      audio.init();
      confirmOverlayFocus();
    }
    if (btnB && !gpPrev._uiBack && G.gameState === 'modal' && G.activeModal) {
      hooks.closeModal(G.activeModal);
    }
    gpPrev._navUp = navUp; gpPrev._navDown = navDown;
    gpPrev._navLeft = navLeft; gpPrev._navRight = navRight;
    gpPrev._uiConfirm = btnA; gpPrev._uiBack = btnB;
    return;
  }
  clearGamepadFocus();
  gpPrev._navUp = navUp; gpPrev._navDown = navDown;
  gpPrev._navLeft = navLeft; gpPrev._navRight = navRight;
  gpPrev._uiConfirm = btnA; gpPrev._uiBack = btnB;

  if (btnA || b(2) || b(4) || b(5)) audio.init();

  setGpAction('left', axX < -0.35 || b(14));
  setGpAction('right', axX > 0.35 || b(15));
  setGpAction('up', axY < -0.45);
  setGpAction('down', axY > 0.45 || b(13));
  setGpAction('jump', btnA);
  setGpAction('attack', b(2) || b(5));         // X / Square or RB / R1 -> Slash / Hold Iai
  setGpAction('parry', b(4));                  // LB / L1 -> Parry
  setGpAction('dash', btnB);                   // B / Circle -> Ink Dash
  setGpAction('spell', b(3));                  // Y / Triangle -> Soul Bell-Wave / Quake
  setGpAction('grapple', b(6));                // LT / L2 -> Grapple Hook
  setGpAction('seal', b(7));                   // RT / R2 -> Ink Seal Detonation
  setGpAction('heal', b(12) || b(10));         // D-Pad Up / L3 -> Heal Flask
  setGpAction('interact', b(11) || (b(13) && !b(2) && !b(5))); // R3 or D-Pad Down -> Interact
}

export function initInputListeners() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('contextmenu', e => {
    if (e.target.id === 'gameCanvas') e.preventDefault();
  });
  window.addEventListener('mousedown', e => {
    setActiveInputDevice('kbmouse');
    if (G.gameState !== 'playing' || e.target.id !== 'gameCanvas') return;
    audio.init();
    if (e.button === 0 && G.controlMode === 'kbmouse') {
      setVirtualAction('attack', true);
      mouseHeldButtons[0] = 'attack';
    } else if (e.button === 1) {
      e.preventDefault();
      pulseVirtualAction('grapple');
    } else if (e.button === 2) {
      pulseVirtualAction(G.controlMode === 'kbmouse' ? 'parry' : 'grapple');
    }
  });
  window.addEventListener('mouseup', e => {
    const mapped = mouseHeldButtons[e.button];
    if (mapped) {
      setVirtualAction(mapped, false);
      delete mouseHeldButtons[e.button];
    }
  });

  window.addEventListener('gamepadconnected', () => {
    if (!gpConnectedNotified && G.player) {
      gpConnectedNotified = true;
      triggerHaptic('test', 0.65);
      spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 42, '手柄已接入 · 震动反馈已就绪', COLORS.cyanBright, 18, 1.4);
    }
  });

  // --- Bottom-Left 360° Virtual Joystick (Multi-Touch + Forced-Landscape Coordinate Mapping) ---
  const joyZone = document.getElementById('joystick-zone');
  const joyBase = document.getElementById('joystick-base');
  const joyKnob = document.getElementById('joystick-knob');
  const joyPrev = { left: false, right: false, up: false, down: false };
  let joyTouchId = null;
  let joyMouseActive = false;
  const dirEls = joyBase ? {
    up: joyBase.querySelector('[data-dir="up"]'),
    down: joyBase.querySelector('[data-dir="down"]'),
    left: joyBase.querySelector('[data-dir="left"]'),
    right: joyBase.querySelector('[data-dir="right"]')
  } : {};

  function setJoyAction(act, down) {
    const prev = !!joyPrev[act];
    if (down !== prev) {
      setVirtualAction(act, down);
      joyPrev[act] = down;
    }
  }

  function resetJoystick() {
    joyTouchId = null;
    joyMouseActive = false;
    if (joyBase) joyBase.classList.remove('active');
    if (joyKnob) joyKnob.style.transform = 'translate3d(0px, 0px, 0)';
    setJoyAction('left', false);
    setJoyAction('right', false);
    setJoyAction('up', false);
    setJoyAction('down', false);
    if (dirEls.up) dirEls.up.classList.remove('active');
    if (dirEls.down) dirEls.down.classList.remove('active');
    if (dirEls.left) dirEls.left.classList.remove('active');
    if (dirEls.right) dirEls.right.classList.remove('active');
  }

  function updateStickFromClient(clientX, clientY) {
    if (!joyBase || !joyKnob) return;
    const rect = joyBase.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const sdx = clientX - cx;
    const sdy = clientY - cy;
    // Compensate for 90deg clockwise CSS rotation when forced-landscape is active
    let dx = isForceLandscape() ? sdy : sdx;
    let dy = isForceLandscape() ? -sdx : sdy;

    const maxR = Math.max(28, (joyBase.clientWidth || 122) * 0.36);
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    joyKnob.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;

    const nx = dx / maxR;
    const ny = dy / maxR;
    const active = dist > maxR * 0.24;
    const left = active && nx < -0.32;
    const right = active && nx > 0.32;
    const up = active && ny < -0.45;
    const down = active && ny > 0.45;

    setJoyAction('left', left);
    setJoyAction('right', right);
    setJoyAction('up', up);
    setJoyAction('down', down);
    if (dirEls.left) dirEls.left.classList.toggle('active', left);
    if (dirEls.right) dirEls.right.classList.toggle('active', right);
    if (dirEls.up) dirEls.up.classList.toggle('active', up);
    if (dirEls.down) dirEls.down.classList.toggle('active', down);
  }

  if (joyZone && joyBase && joyKnob) {
    joyZone.addEventListener('touchstart', e => {
      e.preventDefault();
      audio.init();
      if (joyTouchId === null && e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        joyTouchId = t.identifier;
        joyBase.classList.add('active');
        updateStickFromClient(t.clientX, t.clientY);
      }
    }, { passive: false });
    joyZone.addEventListener('touchmove', e => {
      if (joyTouchId === null) return;
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joyTouchId) {
          updateStickFromClient(t.clientX, t.clientY);
          break;
        }
      }
    }, { passive: false });
    const endJoyTouch = e => {
      if (joyTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joyTouchId) {
          e.preventDefault();
          resetJoystick();
          break;
        }
      }
    };
    joyZone.addEventListener('touchend', endJoyTouch, { passive: false });
    joyZone.addEventListener('touchcancel', endJoyTouch, { passive: false });

    // Mouse fallback for desktop DevTools mobile simulator
    joyZone.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.stopPropagation();
      audio.init();
      joyMouseActive = true;
      joyBase.classList.add('active');
      updateStickFromClient(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', e => {
      if (!joyMouseActive) return;
      updateStickFromClient(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', () => {
      if (joyMouseActive) resetJoystick();
    });
  }

  // --- Bottom-Right 4-Button Fan, Contextual Interact & Aux Multi-Touch Bindings ---
  const allTouchResetters = [];
  document.querySelectorAll('.t-btn').forEach(btn => {
    const act = btn.dataset.action || LEGACY_KEY_TO_ACTION[btn.dataset.key];
    if (!act) return;
    const activeIds = new Set();
    const pressBtn = () => {
      audio.init();
      btn.classList.add('pressed');
      setVirtualAction(act, true);
    };
    const releaseBtn = () => {
      btn.classList.remove('pressed');
      setVirtualAction(act, false);
    };
    allTouchResetters.push(() => {
      activeIds.clear();
      btn.classList.remove('pressed');
    });
    btn.addEventListener('touchstart', e => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) activeIds.add(e.changedTouches[i].identifier);
      pressBtn();
    }, { passive: false });
    const onEnd = e => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) activeIds.delete(e.changedTouches[i].identifier);
      if (activeIds.size === 0) releaseBtn();
    };
    btn.addEventListener('touchend', onEnd, { passive: false });
    btn.addEventListener('touchcancel', onEnd, { passive: false });
    btn.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.stopPropagation();
      pressBtn();
    });
    btn.addEventListener('mouseup', e => {
      e.stopPropagation();
      releaseBtn();
    });
    btn.addEventListener('mouseleave', () => {
      if (btn.classList.contains('pressed')) releaseBtn();
    });
  });

  // Tappable HUD Flasks (Heal) & Ink Seals (Detonate) on Mobile
  const bindTapPulse = (id, act) => {
    const el = document.getElementById(id);
    if (!el) return;
    const fire = e => {
      if (!document.body.classList.contains('is-mobile') || G.gameState !== 'playing') return;
      e.preventDefault();
      e.stopPropagation();
      audio.init();
      pulseVirtualAction(act);
    };
    el.addEventListener('touchstart', fire, { passive: false });
    el.addEventListener('click', fire);
  };
  bindTapPulse('flasks-btn', 'heal');
  bindTapPulse('seals-btn', 'seal');

  // Smooth touch-scroll bridge for .modal-card when portrait-forced-landscape (rotate 90deg) is active
  document.querySelectorAll('.modal-card').forEach(card => {
    let dragId = null;
    let lastX = 0;
    let moved = false;
    card.addEventListener('touchstart', e => {
      if (!isForceLandscape() || e.touches.length !== 1) return;
      const t = e.touches[0];
      dragId = t.identifier;
      lastX = t.clientX;
      moved = false;
    }, { passive: true });
    card.addEventListener('touchmove', e => {
      if (!isForceLandscape() || dragId === null) return;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (t.identifier === dragId) {
          const dx = t.clientX - lastX;
          if (Math.abs(dx) > 4) moved = true;
          if (moved && card.scrollHeight > card.clientHeight) {
            card.scrollTop += dx;
            lastX = t.clientX;
            e.preventDefault();
          }
          break;
        }
      }
    }, { passive: false });
    const endDrag = () => { dragId = null; moved = false; };
    card.addEventListener('touchend', endDrag, { passive: true });
    card.addEventListener('touchcancel', endDrag, { passive: true });
  });

  window.addEventListener('blur', () => {
    resetJoystick();
    allTouchResetters.forEach(fn => fn());
    for (const code of Object.keys(keysHeld)) keysHeld[code] = false;
    for (const code of Object.keys(gpHeld)) gpHeld[code] = false;
    for (const code of Object.keys(keysPressed)) keysPressed[code] = false;
    for (const code of Object.keys(keysReleased)) keysReleased[code] = false;
    for (const act of Object.keys(actionHeld)) actionHeld[act] = false;
    for (const act of Object.keys(actionPressed)) actionPressed[act] = false;
    for (const act of Object.keys(actionReleased)) actionReleased[act] = false;
    for (const btn of Object.keys(mouseHeldButtons)) delete mouseHeldButtons[btn];
  });
}
