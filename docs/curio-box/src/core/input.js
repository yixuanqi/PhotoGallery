(() => {
  const CB = window.CB;
  const game = CB.game;

  const STICK_MAX_R = 44;

  function detectMobileDevice() {
    const ua = navigator.userAgent || '';
    const isMobileUA = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    // 兼容 iPadOS 桌面模式 UA（Macintosh + 多点触控 + 无鼠标悬停）
    const isIPadDesktopUA =
      /Macintosh/i.test(ua) &&
      (navigator.maxTouchPoints || 0) > 1 &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: none)').matches;
    // 严格要求主指针为粗指针且无悬停能力，彻底杜绝 Windows 触屏/数位板 PC 被误判为移动端！
    const isPrimaryTouch =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse) and (hover: none)').matches;
    return isMobileUA || isIPadDesktopUA || isPrimaryTouch;
  }

  function detectCoarseTouch() {
    return detectMobileDevice();
  }

  function clearAllHeldInputs() {
    const keys = game.input;
    keys.up = keys.down = keys.left = keys.right = false;
    keys.moveAxisX = 0;
    keys.moveAxisY = 0;
    keys.aimStickActive = false;
    keys.aimCancelHover = false;
    keys.fireHeld = false;
    keys.firePressed = false;
    keys.fireReleased = false;
    keys.interactHeld = false;
    keys.skillPressed = false;
    game.player.charging = false;
    game.player.chargeTime = 0;
    game.player.chargeRatio = 0;
    game.player.chargeStageNotified = 0;
  }

  function initInput(canvas, onQuickKey, onInputKindChange) {
    const keys = game.input;

    const unlockAudio = () => {
      if (CB.audio && CB.audio.unlock) CB.audio.unlock();
    };

    const notifyKind = (kind) => {
      if (game.lastInputKind !== kind) {
        game.lastInputKind = kind;
        if (onInputKindChange) onInputKindChange(kind);
      }
    };

    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') notifyKind('touch');
      else if (e.pointerType === 'mouse') notifyKind('mouse');
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
      unlockAudio();
      notifyKind('mouse');
      const code = e.code;
      const gameplayActive = !game.introGateOpen && !game.introActive && !game.hubOpen && !game.titleOpen && !game.menuOpen && !game.settingsOpen && !game.paused && !game.chartOpen && !game.marketOpen && !game.dailyOpen && !game.portraitBlocked;
      if (gameplayActive) {
        if (code === 'KeyW' || code === 'ArrowUp') keys.up = true;
        if (code === 'KeyS' || code === 'ArrowDown') keys.down = true;
        if (code === 'KeyA' || code === 'ArrowLeft') keys.left = true;
        if (code === 'KeyD' || code === 'ArrowRight') keys.right = true;
        if (code === 'KeyE') {
          if (!e.repeat) keys.interactPressed = true;
          keys.interactHeld = true;
        }
        if (code === 'Space') {
          e.preventDefault();
          if (game.run.phase === 'playing') keys.dashPressed = true;
        }
        if (code === 'KeyQ') {
          e.preventDefault();
          if (game.run.phase === 'playing') keys.skillPressed = true;
        }
      }
      if (onQuickKey) onQuickKey(code);
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') keys.up = false;
      if (code === 'KeyS' || code === 'ArrowDown') keys.down = false;
      if (code === 'KeyA' || code === 'ArrowLeft') keys.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') keys.right = false;
      if (code === 'KeyE') keys.interactHeld = false;
    });

    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      keys.mouseScreenX = e.clientX;
      keys.mouseScreenY = e.clientY;
      keys.useTouchAim = false;
      notifyKind('mouse');
    });

    canvas.addEventListener('mousedown', (e) => {
      unlockAudio();
      if (game.run.phase !== 'playing' || game.introGateOpen || game.introActive || game.hubOpen || game.titleOpen || game.menuOpen || game.settingsOpen || game.paused || game.chartOpen || game.marketOpen || game.dailyOpen || game.portraitBlocked) return;
      keys.useTouchAim = false;
      if (e.button === 0) {
        keys.fireHeld = true;
        keys.firePressed = true;
      }
      if (e.button === 2) keys.dashPressed = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0 && keys.fireHeld && !keys.aimStickActive) {
        keys.fireHeld = false;
        keys.fireReleased = true;
      }
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', clearAllHeldInputs);
  }

  // ==================== v7.1 移动端横屏精修：左半屏浮空摇杆 + 右摇杆蓄力取消 + 智能浮钮 ====================
  function initTouchControls(els) {
    if (!els) return;
    const keys = game.input;
    const unlockAudio = () => {
      if (CB.audio && CB.audio.unlock) CB.audio.unlock();
    };

    const setKnob = (knobEl, dx, dy) => {
      if (!knobEl) return;
      knobEl.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    };

    // 1. 左半屏浮空移动摇杆（在左半屏任意处按下即刻于拇指处浮现，松手优雅复位）
    const moveHost = els.movePad || els.moveZone;
    if (moveHost && els.moveZone && els.moveKnob) {
      let movePid = null;
      let originX = 0;
      let originY = 0;

      const placeFloatingStick = (cx, cy) => {
        const halfW = (els.moveZone.offsetWidth || 118) / 2;
        const clampedX = Math.max(halfW + 10, Math.min(window.innerWidth * 0.46 - halfW, cx));
        const clampedY = Math.max(76 + halfW, Math.min(window.innerHeight - halfW - 10, cy));
        originX = clampedX;
        originY = clampedY;
        els.moveZone.classList.add('floating-pos');
        els.moveZone.style.left = `${(clampedX - halfW).toFixed(1)}px`;
        els.moveZone.style.top = `${(clampedY - halfW).toFixed(1)}px`;
        els.moveZone.style.bottom = 'auto';
      };

      const resetFloatingStick = () => {
        els.moveZone.classList.remove('floating-pos');
        els.moveZone.style.left = '';
        els.moveZone.style.top = '';
        els.moveZone.style.bottom = '';
      };

      const updateMove = (cx, cy) => {
        const dx = cx - originX;
        const dy = cy - originY;
        const dist = Math.hypot(dx, dy);
        const clamped = Math.min(STICK_MAX_R, dist);
        const nx = dist > 0.01 ? dx / dist : 0;
        const ny = dist > 0.01 ? dy / dist : 0;
        setKnob(els.moveKnob, nx * clamped, ny * clamped);
        const mag = clamped / STICK_MAX_R;
        if (mag > 0.12) {
          keys.moveAxisX = nx * mag;
          keys.moveAxisY = ny * mag;
        } else {
          keys.moveAxisX = 0;
          keys.moveAxisY = 0;
        }
      };

      const endMove = (pid) => {
        if (pid !== null && pid !== movePid) return;
        movePid = null;
        keys.moveAxisX = 0;
        keys.moveAxisY = 0;
        setKnob(els.moveKnob, 0, 0);
        els.moveZone.classList.remove('active');
        resetFloatingStick();
      };

      moveHost.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        unlockAudio();
        if (game.run.phase !== 'playing' || game.introGateOpen || game.introActive || game.hubOpen || game.titleOpen || game.paused || game.chartOpen || game.marketOpen || game.dailyOpen || game.portraitBlocked) return;
        if (movePid !== null) return;
        movePid = e.pointerId;
        if (moveHost.setPointerCapture) {
          try { moveHost.setPointerCapture(e.pointerId); } catch (_) {}
        }
        placeFloatingStick(e.clientX, e.clientY);
        els.moveZone.classList.add('active');
        updateMove(e.clientX, e.clientY);
      });

      moveHost.addEventListener('pointermove', (e) => {
        if (e.pointerId !== movePid) return;
        e.preventDefault();
        updateMove(e.clientX, e.clientY);
      });

      moveHost.addEventListener('pointerup', (e) => endMove(e.pointerId));
      moveHost.addEventListener('pointercancel', (e) => endMove(e.pointerId));
      moveHost.addEventListener('lostpointercapture', (e) => endMove(e.pointerId));
    }

    // 2. 右手虚拟瞄准 & 蓄力发射摇杆（支持滑入左上角 ✕ 取消区撤回发射，潜行零误触！）
    if (els.aimZone && els.aimKnob) {
      let aimPid = null;
      let originX = 0;
      let originY = 0;

      const checkCancelHover = (cx, cy) => {
        if (!els.cancelZone) return false;
        const rect = els.cancelZone.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        const ccx = rect.left + rect.width / 2;
        const ccy = rect.top + rect.height / 2;
        const hitR = Math.max(rect.width, rect.height) * 0.5 + 16;
        return Math.hypot(cx - ccx, cy - ccy) <= hitR;
      };

      const setCancelVisual = (hovering) => {
        const changed = keys.aimCancelHover !== hovering;
        keys.aimCancelHover = hovering;
        if (els.cancelZone) els.cancelZone.classList.toggle('cancel-active', hovering);
        els.aimZone.classList.toggle('canceling', hovering);
        if (changed && hovering && CB.audio && CB.audio.playUiClick) {
          CB.audio.playUiClick();
        }
      };

      const updateAim = (cx, cy) => {
        const hoveringCancel = checkCancelHover(cx, cy);
        setCancelVisual(hoveringCancel);

        const dx = cx - originX;
        const dy = cy - originY;
        const dist = Math.hypot(dx, dy);
        const clamped = Math.min(STICK_MAX_R, dist);
        const nx = dist > 0.01 ? dx / dist : 0;
        const ny = dist > 0.01 ? dy / dist : 0;
        setKnob(els.aimKnob, nx * clamped, ny * clamped);
        if (!hoveringCancel && dist > 8) {
          keys.aimStickAngle = Math.atan2(dy, dx);
        }
      };

      const endAim = (pid, forceCancel = false) => {
        if (pid !== null && pid !== aimPid) return;
        const canceled = forceCancel || keys.aimCancelHover;
        aimPid = null;
        keys.aimStickActive = false;
        setCancelVisual(false);
        setKnob(els.aimKnob, 0, 0);
        els.aimZone.classList.remove('active');
        if (els.cancelZone) els.cancelZone.classList.remove('visible');

        if (canceled) {
          keys.fireHeld = false;
          keys.firePressed = false;
          keys.fireReleased = false;
          game.player.charging = false;
          game.player.chargeTime = 0;
          game.player.chargeRatio = 0;
          game.player.chargeStageNotified = 0;
          if (CB.audio && CB.audio.playUiLocked) CB.audio.playUiLocked();
        } else if (keys.fireHeld) {
          keys.fireHeld = false;
          keys.fireReleased = true;
        }
      };

      els.aimZone.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        unlockAudio();
        if (game.run.phase !== 'playing' || game.introGateOpen || game.introActive || game.hubOpen || game.titleOpen || game.paused || game.chartOpen || game.marketOpen || game.dailyOpen || game.portraitBlocked) return;
        if (aimPid !== null) return;
        aimPid = e.pointerId;
        if (els.aimZone.setPointerCapture) {
          try { els.aimZone.setPointerCapture(e.pointerId); } catch (_) {}
        }
        const rect = els.aimZone.getBoundingClientRect();
        originX = rect.left + rect.width / 2;
        originY = rect.top + rect.height / 2;
        keys.useTouchAim = true;
        keys.aimStickActive = true;
        keys.aimCancelHover = false;
        if (Math.hypot(e.clientX - originX, e.clientY - originY) <= 8) {
          keys.aimStickAngle = game.player.aimAngle || 0;
        }
        keys.fireHeld = true;
        keys.firePressed = true;
        els.aimZone.classList.add('active');
        if (els.cancelZone) els.cancelZone.classList.add('visible');
        updateAim(e.clientX, e.clientY);
      });

      els.aimZone.addEventListener('pointermove', (e) => {
        if (e.pointerId !== aimPid) return;
        e.preventDefault();
        updateAim(e.clientX, e.clientY);
      });

      els.aimZone.addEventListener('pointerup', (e) => endAim(e.pointerId, false));
      els.aimZone.addEventListener('pointercancel', (e) => endAim(e.pointerId, true));
      els.aimZone.addEventListener('lostpointercapture', (e) => endAim(e.pointerId, false));
    }

    // 3. 大图标冲刺按钮
    if (els.dashBtn) {
      els.dashBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        unlockAudio();
        if (game.run.phase !== 'playing' || game.introGateOpen || game.introActive || game.hubOpen || game.titleOpen || game.paused || game.chartOpen || game.marketOpen || game.dailyOpen || game.portraitBlocked) return;
        keys.dashPressed = true;
        els.dashBtn.classList.add('pressed');
      });
      const releaseDash = () => els.dashBtn.classList.remove('pressed');
      els.dashBtn.addEventListener('pointerup', releaseDash);
      els.dashBtn.addEventListener('pointercancel', releaseDash);
      els.dashBtn.addEventListener('pointerleave', releaseDash);
    }

    // 3.5. 移动端动态主动技能浮钮（仅拾取稀有/传说主动技时浮现）
    if (els.skillBtn) {
      els.skillBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        unlockAudio();
        if (game.run.phase !== 'playing' || game.introGateOpen || game.introActive || game.hubOpen || game.titleOpen || game.paused || game.chartOpen || game.marketOpen || game.dailyOpen || game.portraitBlocked) return;
        keys.skillPressed = true;
        els.skillBtn.classList.add('pressed');
      });
      const releaseSkill = () => els.skillBtn.classList.remove('pressed');
      els.skillBtn.addEventListener('pointerup', releaseSkill);
      els.skillBtn.addEventListener('pointercancel', releaseSkill);
      els.skillBtn.addEventListener('pointerleave', releaseSkill);
    }

    // 4. 大图标智能交互按钮（短按翻转星轨/棱镜/点火，长按启封宝箱）
    if (els.interactBtn) {
      let intPid = null;
      els.interactBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        unlockAudio();
        if (game.run.phase !== 'playing' || game.introGateOpen || game.introActive || game.hubOpen || game.titleOpen || game.paused || game.chartOpen || game.marketOpen || game.dailyOpen || game.portraitBlocked) return;
        intPid = e.pointerId;
        if (els.interactBtn.setPointerCapture) {
          try { els.interactBtn.setPointerCapture(e.pointerId); } catch (_) {}
        }
        keys.interactPressed = true;
        keys.interactHeld = true;
        els.interactBtn.classList.add('pressed');
      });
      const endInt = (e) => {
        if (intPid !== null && e && e.pointerId !== undefined && e.pointerId !== intPid) return;
        intPid = null;
        keys.interactHeld = false;
        els.interactBtn.classList.remove('pressed');
      };
      els.interactBtn.addEventListener('pointerup', endInt);
      els.interactBtn.addEventListener('pointercancel', endInt);
      els.interactBtn.addEventListener('lostpointercapture', endInt);
    }
  }

  function syncMouseWorld() {
    const { input, camera, player, viewW, viewH } = game;
    if (input.useTouchAim && player) {
      input.mouseWorldX = player.x + Math.cos(input.aimStickAngle) * 210;
      input.mouseWorldY = (player.y - 10) + Math.sin(input.aimStickAngle) * 210;
      return;
    }
    const z = camera.zoom || 1;
    input.mouseWorldX = (input.mouseScreenX - viewW / 2) / z + camera.x;
    input.mouseWorldY = (input.mouseScreenY - viewH / 2) / z + camera.y;
  }

  CB.input = {
    detectMobileDevice,
    detectCoarseTouch,
    clearAllHeldInputs,
    initInput,
    initTouchControls,
    syncMouseWorld,
  };
})();
