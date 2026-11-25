window.MT = window.MT || {};

window.MT.Main = (function () {
  var dom = {};
  var running = false;
  var endingActive = false;
  var endingKey = null;
  var lastTime = 0;
  var whisperTimer = null;
  var tipTimer = null;

  var input = {
    left: false,
    right: false,
    boost: false
  };

  function cacheDom() {
    dom.canvas = document.getElementById('game-canvas');
    dom.hudTop = document.getElementById('hud-top');
    dom.partsBar = document.getElementById('parts-bar');
    dom.btnTideHint = document.getElementById('btn-tide-hint');
    dom.btnMute = document.getElementById('btn-mute');

    dom.whisperBanner = document.getElementById('whisper-banner');
    dom.whisperTitle = document.getElementById('whisper-title');
    dom.whisperLine = document.getElementById('whisper-line');
    dom.controlsTip = document.getElementById('controls-tip');

    dom.touchControls = document.getElementById('touch-controls');
    dom.tcLeft = document.getElementById('tc-left');
    dom.tcRight = document.getElementById('tc-right');
    dom.tcHook = document.getElementById('tc-hook');
    dom.tcBoost = document.getElementById('tc-boost');

    dom.titleScreen = document.getElementById('title-screen');
    dom.btnPlay = document.getElementById('btn-play');

    dom.endingScreen = document.getElementById('ending-screen');
    dom.endingKicker = document.getElementById('ending-kicker');
    dom.endingTitle = document.getElementById('ending-title');
    dom.endingPoem = document.getElementById('ending-poem');
    dom.endingStats = document.getElementById('ending-stats');
    dom.btnContinue = document.getElementById('btn-continue');
    dom.btnReplay = document.getElementById('btn-replay');
  }

  function updatePartsHUD(highlightType) {
    var boat = window.MT.Boat.getState();
    var pills = dom.partsBar.querySelectorAll('.part-pill');
    pills.forEach(function (pill) {
      var type = pill.getAttribute('data-type');
      var lv = boat.parts[type] || 0;
      pill.querySelector('.p-lv').textContent = lv;
      pill.classList.toggle('active', lv > 0);
      if (type === highlightType) {
        pill.classList.remove('pop');
        void pill.offsetWidth;
        pill.classList.add('pop');
        setTimeout(function () { pill.classList.remove('pop'); }, 350);
      }
    });

    if (boat.parts.thruster > 0) {
      dom.tcBoost.classList.remove('hidden');
    } else {
      dom.tcBoost.classList.add('hidden');
    }
  }

  function showWhisper(title, line) {
    dom.whisperTitle.textContent = title;
    dom.whisperLine.textContent = line;
    dom.whisperBanner.classList.remove('hidden');
    requestAnimationFrame(function () {
      dom.whisperBanner.classList.add('show');
    });
    if (whisperTimer) clearTimeout(whisperTimer);
    whisperTimer = setTimeout(function () {
      dom.whisperBanner.classList.remove('show');
    }, 3800);
  }

  function onSalvage(item, boatState) {
    var arch = window.MT.Config.ARCHETYPES[item.type];
    var suffix = item.type === 'keepsake'
      ? ' · 海漂拾遗'
      : ' · 已装船（' + arch.name + ' Lv.' + boatState.parts[item.type] + '）';
    showWhisper(item.name + suffix, item.line);
    updatePartsHUD(item.type);
  }

  function triggerEnding() {
    endingActive = true;
    endingKey = window.MT.Boat.getDominantEndingKey();
    var info = window.MT.Config.ENDINGS[endingKey];
    var boat = window.MT.Boat.getState();
    var p = boat.parts;

    input.left = false;
    input.right = false;
    input.boost = false;
    window.MT.Audio.setBoosting(false);
    window.MT.Audio.playMountChord('gramophone');

    // 结局专属视觉小演出
    if (endingKey === 'flight') {
      boat.vy = -210;
      boat.vx = boat.facing * 140;
    } else if (endingKey === 'lanterns') {
      for (var i = -5; i <= 5; i++) {
        window.MT.World.dropWakeLantern(boat.x + i * 52);
      }
    } else {
      window.MT.World.emitSoundRing(boat.x, boat.y - 24);
    }

    dom.endingKicker.textContent = info.kicker;
    dom.endingTitle.textContent = info.title;
    dom.endingPoem.innerHTML = info.poem;
    dom.endingStats.textContent =
      '本航程打捞 ' + boat.totalSalvaged + ' 件遗物 · 推进 ' + p.thruster +
      ' / 浮空 ' + p.balloon + ' / 共振 ' + p.gramophone + ' / 灯火 ' + p.lantern;

    dom.endingScreen.classList.remove('hidden');
  }

  function startVoyage() {
    window.MT.Audio.init();
    window.MT.World.reset();
    window.MT.Boat.reset();
    endingActive = false;
    endingKey = null;
    running = true;

    dom.titleScreen.classList.add('hidden');
    dom.endingScreen.classList.add('hidden');
    dom.hudTop.classList.remove('hidden');
    dom.btnTideHint.classList.add('hidden');

    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      dom.touchControls.classList.remove('hidden');
    }

    dom.controlsTip.classList.remove('hidden', 'fade-out');
    if (tipTimer) clearTimeout(tipTimer);
    tipTimer = setTimeout(function () {
      dom.controlsTip.classList.add('fade-out');
    }, 9000);

    updatePartsHUD(null);
    showWhisper('月潮初起', '点按水下发光处甩出铁钩，捞起人类落在海里的东西。');
  }

  function bindHoldButton(el, onDown, onUp) {
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      el.classList.add('pressed');
      onDown();
    });
    var end = function (e) {
      if (e) e.stopPropagation();
      el.classList.remove('pressed');
      onUp();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', end);
  }

  function bindEvents() {
    dom.btnPlay.addEventListener('click', startVoyage);
    dom.btnReplay.addEventListener('click', startVoyage);

    dom.btnContinue.addEventListener('click', function () {
      endingActive = false;
      dom.endingScreen.classList.add('hidden');
      var pillar = window.MT.World.getPillar();
      pillar.triggered = true;
      pillar.active = false;
      dom.btnTideHint.classList.add('hidden');
    });

    dom.btnMute.addEventListener('click', function () {
      window.MT.Audio.init();
      var next = !window.MT.Audio.isMuted();
      window.MT.Audio.setMuted(next);
      dom.btnMute.textContent = next ? '声景：关' : '声景：开';
    });

    // 键盘操作
    window.addEventListener('keydown', function (e) {
      if (!running || endingActive) return;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = true;
      if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        input.boost = true;
      }
      if (e.code === 'Space' || e.code === 'KeyS' || e.code === 'ArrowDown') {
        e.preventDefault();
        window.MT.Boat.castHook();
      }
    });

    window.addEventListener('keyup', function (e) {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = false;
      if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        input.boost = false;
      }
      if (e.code === 'Space' || e.code === 'KeyS' || e.code === 'ArrowDown') {
        window.MT.Boat.releaseHook();
      }
    });

    // 画布直点抛钩：点按海面直接朝光标/指尖方向抛钩，松手收线
    dom.canvas.addEventListener('pointerdown', function (e) {
      if (!running || endingActive) return;
      window.MT.Audio.init();
      var rect = dom.canvas.getBoundingClientRect();
      var sx = e.clientX - rect.left;
      var sy = e.clientY - rect.top;
      var worldPt = window.MT.Renderer.screenToWorld(sx, sy);
      window.MT.Boat.castHook(worldPt.x, worldPt.y);
    });

    window.addEventListener('pointerup', function () {
      if (!running) return;
      window.MT.Boat.releaseHook();
    });

    // 触屏快捷按钮
    bindHoldButton(dom.tcLeft, function () { input.left = true; }, function () { input.left = false; });
    bindHoldButton(dom.tcRight, function () { input.right = true; }, function () { input.right = false; });
    bindHoldButton(dom.tcBoost, function () { input.boost = true; }, function () { input.boost = false; });
    bindHoldButton(dom.tcHook, function () { window.MT.Boat.castHook(); }, function () { window.MT.Boat.releaseHook(); });
  }

  function loop(ts) {
    var dt = lastTime ? Math.min(0.05, (ts - lastTime) * 0.001) : 0.016;
    lastTime = ts;

    var boat = window.MT.Boat.getState();
    var world = window.MT.World;

    if (running) {
      if (!endingActive) {
        window.MT.Boat.update(dt, input, onSalvage);
        var pillar = world.getPillar();
        if (pillar.active && !pillar.triggered) {
          var dirArrow = pillar.x >= boat.x ? '→' : '←';
          dom.btnTideHint.textContent = '潮汐光柱 ' + dirArrow;
          dom.btnTideHint.classList.remove('hidden');

          if (Math.abs(boat.x - pillar.x) < 72) {
            triggerEnding();
          }
        }
      } else if (endingKey === 'flight') {
        // 飞向月亮的木船：缓慢漂向月光高空
        boat.x += boat.vx * dt * 0.45;
        boat.y -= 36 * dt;
        boat.angle = -0.18 * boat.facing;
      }
    }

    world.update(dt, boat);
    window.MT.Audio.update(dt, boat.parts.gramophone, world.getTide());
    window.MT.Renderer.render(dt, endingActive ? endingKey : null);

    requestAnimationFrame(loop);
  }

  function init() {
    cacheDom();
    window.MT.World.reset();
    window.MT.Boat.reset();
    window.MT.Renderer.init(dom.canvas);
    bindEvents();
    requestAnimationFrame(loop);
  }

  window.addEventListener('DOMContentLoaded', init);
  return { init: init, startVoyage: startVoyage };
})();
