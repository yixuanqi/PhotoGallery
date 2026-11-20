// Keyboard, mouse preset, Gamepad API & mobile touch input system
import { COLORS } from './config.js';
import { G, hooks } from './state.js';
import { audio } from './audio.js';
import { spawnFloatText } from './vfx.js';

export const keysHeld = {};
export const gpHeld = {};
export const keysPressed = {};
export const keysReleased = {};
export const mouseHeldButtons = {};

export function onKeyDown(e) {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }
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

export function clearFrameInputs() {
  for (const code of Object.keys(keysPressed)) keysPressed[code] = false;
  for (const code of Object.keys(keysReleased)) keysReleased[code] = false;
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
      shortGrapple: '索'
    };
  }
  if (G.controlMode === 'kbmouse') {
    return {
      slash: '左键 / J',
      parry: '右键 / K',
      grapple: 'F / 中键 / I',
      spell: 'R / U',
      seal: 'C / L',
      heal: 'Q / H',
      shortGrapple: 'F / 索'
    };
  }
  return {
    slash: 'J',
    parry: 'K',
    grapple: 'I / F / 右键',
    spell: 'U / R',
    seal: 'L / C',
    heal: 'H / Q',
    shortGrapple: 'I / 索'
  };
}

export function syncHelpModalText() {
  const el = document.getElementById('help-modal-body');
  if (!el) return;
  const k = getControlLabels();
  el.innerHTML =
    `<strong>1. 立体断刃剑技 [${k.slash}]</strong>：轻按三连（上挑 → 横扫 → 踏步重劈）；<strong>长按 [${k.slash}]</strong> 沉身收刀蓄力释放<strong>「居合 · 一闪」</strong>；配合 <strong>[W+斩]</strong> 上挑斩、空中 <strong>[S+斩]</strong> 踩头与悬灯/钟摆/共鸣钟下劈弹跳。<br>` +
    `<strong>2. 双魂火法术 [${k.spell}] / [W+${k.spell}] &amp; 幽丝钩索 [${k.grapple}]</strong>：平按 <strong>[${k.spell}]</strong> 发射水平穿透「幽鸣灵刃」(耗30)；按住 <strong>[W+${k.spell}]</strong> 施放对空与 360° 范围爆发<strong>「镇魂钟鸣」</strong>(耗40)，可直接破重盾、震散法球并一次敲响周围多口悬灯与共鸣钟！<br>` +
    `<strong>3. 精准弹反 [${k.parry}] &amp; 识破反击 [${k.parry} → 斩]</strong>：0–140ms 完美弹反零伤打铁（可反弹怨灵火球与青铜钟摆！）并攒墨印；弹反后 0.56 秒内接斩派生<strong>「断钟返 · 十字反击斩」</strong>，双倍吸血狂削架势。<br>` +
    `<strong>4. 悬钟共鸣机关 &amp; 双圣物槽</strong>：在限时内以剑技、钩索或魂法敲响成组青铜共鸣钟，即可震开封印钟笼获取秘宝与永久上限提升；祭坛可同时铭刻<strong>主印 + 副印两枚圣物</strong>自由组合流派！<br>` +
    `<strong>5. 墨印引爆 [${k.seal}]、灯油回血 [${k.heal}] 与处决 [斩]</strong>：攒墨印后按 <strong>[${k.seal}]</strong> 突刺贴符引爆；敌方架势崩溃跪地时，近身按斩触发黑白反色处决！`;
}

export function syncControlModeUI() {
  const btn = document.getElementById('btn-ctrl');
  const bar = document.getElementById('quick-bar');
  if (btn) btn.textContent = G.controlMode === 'kbmouse' ? '操控: 键鼠' : '操控: 纯键';
  if (bar) {
    bar.textContent = G.controlMode === 'kbmouse'
      ? 'A/D 移 · Space 跳 · 左键/J 斩/居合 · 右键/K 弹反 · F/中键/I 钩索 · R/U 灵刃 · W+R/U 镇魂钟鸣 · Shift 闪 · C/L 墨印 · Q/H 回血 · E 交互 · M 舆图'
      : 'A/D 移 · Space 跳 · J 斩/居合 · W+J 上挑 · S+J 下劈 · K→J 弹反 · U 灵刃 · W+U 镇魂钟鸣 · I/F/右键 钩索 · Shift 闪 · L 墨印 · H 回血 · E 交互 · M 舆图';
  }
  syncHelpModalText();
}

let gpConnectedNotified = false;
const gpPrev = {};

function setGpState(code, down) {
  const prev = !!gpPrev[code];
  if (down && !prev) keysPressed[code] = true;
  if (!down && prev) keysReleased[code] = true;
  gpHeld[code] = down;
  gpPrev[code] = down;
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
    for (const code of Object.keys(gpHeld)) {
      if (gpHeld[code]) setGpState(code, false);
    }
    return;
  }

  const b = idx => !!(pad.buttons[idx] && (pad.buttons[idx].pressed || pad.buttons[idx].value > 0.35));
  const axX = pad.axes[0] || 0;
  const axY = pad.axes[1] || 0;

  const btnA = b(0);
  const btnB = b(1);
  const btnMap = b(8) || b(9);

  if (btnMap && !gpPrev._gpMap) {
    if (G.gameState === 'playing' || G.activeModal === 'map') hooks.openMapModal();
  }
  gpPrev._gpMap = btnMap;

  // Allow Gamepad A/B to navigate overlays
  if (G.gameState === 'title') {
    if (btnA && !gpPrev._gpStart) {
      if (hooks.readSaveData()) hooks.continueSavedGame();
      else hooks.startGame();
    }
    gpPrev._gpStart = btnA;
    return;
  }
  if (G.gameState === 'modal') {
    if (btnB && !gpPrev._gpBack && G.activeModal) hooks.closeModal(G.activeModal);
    gpPrev._gpBack = btnB;
    return;
  }
  if (G.gameState === 'dead') {
    if (btnA && !gpPrev._gpRetry) {
      if (G.echoSession) hooks.startEchoChallenge(G.echoSession.mode);
      else hooks.respawnAtActiveAltar();
    }
    gpPrev._gpRetry = btnA;
    return;
  }
  if (G.gameState === 'victory') {
    if (btnA && !gpPrev._gpAgain) {
      if (G.echoSession) hooks.startEchoChallenge(G.echoSession.mode);
      else hooks.continueIntoBellWell();
    }
    gpPrev._gpAgain = btnA;
    return;
  }
  gpPrev._gpStart = btnA;
  gpPrev._gpBack = btnB;
  gpPrev._gpRetry = btnA;
  gpPrev._gpAgain = btnA;

  if (btnA || b(2) || b(4) || b(5)) audio.init();

  setGpState('KeyA', axX < -0.35 || b(14));
  setGpState('KeyD', axX > 0.35 || b(15));
  setGpState('KeyW', axY < -0.45);
  setGpState('KeyS', axY > 0.45 || b(13));
  setGpState('Space', btnA);
  setGpState('KeyJ', b(2) || b(5));         // X / Square or RB / R1 -> Slash / Hold Iai
  setGpState('KeyK', b(4));                 // LB / L1 -> Parry
  setGpState('ShiftLeft', btnB);            // B / Circle -> Ink Dash
  setGpState('KeyU', b(3));                 // Y / Triangle -> Soul Bell-Wave
  setGpState('KeyI', b(6));                 // LT / L2 -> Grapple Hook
  setGpState('KeyL', b(7));                 // RT / R2 -> Ink Seal Detonation
  setGpState('KeyH', b(12) || b(10));       // D-Pad Up / L3 -> Heal Flask
  setGpState('KeyE', b(11) || (b(13) && !b(2) && !b(5))); // R3 or D-Pad Down -> Interact
}

export function initInputListeners() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('contextmenu', e => {
    if (e.target.id === 'gameCanvas') e.preventDefault();
  });
  window.addEventListener('mousedown', e => {
    if (G.gameState !== 'playing' || e.target.id !== 'gameCanvas') return;
    audio.init();
    if (e.button === 0 && G.controlMode === 'kbmouse') {
      if (!keysHeld['KeyJ']) keysPressed['KeyJ'] = true;
      keysHeld['KeyJ'] = true;
      mouseHeldButtons[0] = 'KeyJ';
    } else if (e.button === 1) {
      e.preventDefault();
      keysPressed['KeyI'] = true;
    } else if (e.button === 2) {
      keysPressed[G.controlMode === 'kbmouse' ? 'KeyK' : 'KeyI'] = true;
    }
  });
  window.addEventListener('mouseup', e => {
    const mapped = mouseHeldButtons[e.button];
    if (mapped) {
      if (keysHeld[mapped]) keysReleased[mapped] = true;
      keysHeld[mapped] = false;
      delete mouseHeldButtons[e.button];
    }
  });

  window.addEventListener('gamepadconnected', () => {
    if (!gpConnectedNotified && G.player) {
      gpConnectedNotified = true;
      spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 42, '手柄已接入 · 支持标准布局', COLORS.cyanBright, 18, 1.4);
    }
  });

  // --- Bottom-Left 360° Virtual Joystick (Multi-Touch + Forced-Landscape Coordinate Mapping) ---
  const joyZone = document.getElementById('joystick-zone');
  const joyBase = document.getElementById('joystick-base');
  const joyKnob = document.getElementById('joystick-knob');
  const joyPrev = { KeyA: false, KeyD: false, KeyW: false, KeyS: false };
  let joyTouchId = null;
  let joyMouseActive = false;
  const dirEls = joyBase ? {
    up: joyBase.querySelector('[data-dir="up"]'),
    down: joyBase.querySelector('[data-dir="down"]'),
    left: joyBase.querySelector('[data-dir="left"]'),
    right: joyBase.querySelector('[data-dir="right"]')
  } : {};

  function setJoyKey(code, down) {
    const prev = !!joyPrev[code];
    if (down && !prev) {
      keysPressed[code] = true;
      keysHeld[code] = true;
    } else if (!down && prev) {
      keysReleased[code] = true;
      keysHeld[code] = false;
    }
    joyPrev[code] = down;
  }

  function resetJoystick() {
    joyTouchId = null;
    joyMouseActive = false;
    if (joyBase) joyBase.classList.remove('active');
    if (joyKnob) joyKnob.style.transform = 'translate3d(0px, 0px, 0)';
    setJoyKey('KeyA', false);
    setJoyKey('KeyD', false);
    setJoyKey('KeyW', false);
    setJoyKey('KeyS', false);
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

    setJoyKey('KeyA', left);
    setJoyKey('KeyD', right);
    setJoyKey('KeyW', up);
    setJoyKey('KeyS', down);
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
    const code = btn.dataset.key;
    if (!code) return;
    const activeIds = new Set();
    const pressBtn = () => {
      audio.init();
      btn.classList.add('pressed');
      if (!keysHeld[code]) keysPressed[code] = true;
      keysHeld[code] = true;
    };
    const releaseBtn = () => {
      btn.classList.remove('pressed');
      if (keysHeld[code]) keysReleased[code] = true;
      keysHeld[code] = false;
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
  const bindTapPulse = (id, code) => {
    const el = document.getElementById(id);
    if (!el) return;
    const fire = e => {
      if (!document.body.classList.contains('is-mobile') || G.gameState !== 'playing') return;
      e.preventDefault();
      e.stopPropagation();
      audio.init();
      keysPressed[code] = true;
    };
    el.addEventListener('touchstart', fire, { passive: false });
    el.addEventListener('click', fire);
  };
  bindTapPulse('flasks-btn', 'KeyH');
  bindTapPulse('seals-btn', 'KeyL');

  window.addEventListener('blur', () => {
    resetJoystick();
    allTouchResetters.forEach(fn => fn());
    for (const code of Object.keys(keysHeld)) keysHeld[code] = false;
    for (const code of Object.keys(gpHeld)) gpHeld[code] = false;
    for (const code of Object.keys(keysPressed)) keysPressed[code] = false;
    for (const code of Object.keys(keysReleased)) keysReleased[code] = false;
    for (const btn of Object.keys(mouseHeldButtons)) delete mouseHeldButtons[btn];
  });
}
