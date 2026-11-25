window.MT = window.MT || {};

window.MT.Boat = (function () {
  var state = null;

  function reset() {
    state = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      angularVel: 0,
      facing: 1,
      inWater: true,
      oarPhase: 0,
      oarSoundCooldown: 0,
      boosting: false,
      boostHeat: 0,
      soundRingTimer: 1.5,
      wakeLanternTimer: 0,
      scarfPhase: 0,
      totalParts: 0,
      totalSalvaged: 0,
      parts: {
        thruster: 0,
        balloon: 0,
        gramophone: 0,
        lantern: 0
      },
      // 物理摆动铁钩
      hook: {
        mode: 'idle', // idle | sinking | reeling
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        length: 0,
        maxLength: 260,
        caughtRelic: null
      },
      // 气球柔体尾迹点（营造飘逸手感）
      balloonSway: 0,
      balloonSwayVel: 0
    };
    return state;
  }

  function castHook(aimWorldX, aimWorldY) {
    if (!state) return;
    var h = state.hook;
    if (h.mode !== 'idle') return;
    h.mode = 'sinking';
    h.x = state.x + state.facing * 26;
    h.y = state.y + 6;
    h.length = 12;
    h.caughtRelic = null;

    if (typeof aimWorldX === 'number' && typeof aimWorldY === 'number') {
      var dx = aimWorldX - h.x;
      var dy = Math.max(40, aimWorldY - h.y);
      var dist = Math.hypot(dx, dy) || 1;
      h.vx = state.vx * 0.4 + (dx / dist) * 230;
      h.vy = (dy / dist) * 240;
    } else {
      h.vx = state.vx * 0.45 + state.facing * 36;
      h.vy = 215;
    }
    window.MT.Audio.playSplash(0.45);
    window.MT.World.emitSplash(h.x, state.y + 4, 7, '#d8e8f8', 10);
  }

  function releaseHook() {
    if (!state) return;
    if (state.hook.mode === 'sinking') {
      state.hook.mode = 'reeling';
    }
  }

  function update(dt, input, onSalvage) {
    var world = window.MT.World;
    var t = world.getTime();
    var tide = world.getTide();

    state.scarfPhase += dt * (3.2 + Math.abs(state.vx) * 0.025);

    var waveY = world.getWaveHeight(state.x, t, state.parts.lantern);
    var slope = world.getWaveSlope(state.x, t, state.parts.lantern);
    var targetAngle = Math.atan(slope);

    var prevInWater = state.inWater;
    state.inWater = state.y >= waveY - 6;

    // 腾空落水溅起水花
    if (!prevInWater && state.inWater && state.vy > 70) {
      var impact = Math.min(1.4, state.vy / 220);
      world.emitSplash(state.x, waveY, Math.floor(10 + impact * 14), '#eaf4ff', 25);
      window.MT.Audio.playSplash(impact);
    }

    // 重力（月球越近 + 气球越多，重力越轻盈）
    var balloonLift = state.parts.balloon * 0.17;
    var gravity = 390 * (1 - tide * 0.28) * Math.max(0.36, 1 - balloonLift);

    // 划桨输入
    var moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (moveDir !== 0) {
      state.facing = moveDir;
      state.oarPhase += dt * 6.8;
      var thrust = state.inWater ? 270 : (95 + state.parts.balloon * 45);
      state.vx += moveDir * thrust * dt;

      if (state.inWater) {
        state.oarSoundCooldown -= dt;
        if (state.oarSoundCooldown <= 0) {
          window.MT.Audio.playOarStroke();
          world.emitSplash(state.x - moveDir * 14, waveY + 2, 4, '#d8e8f8', 5);
          state.oarSoundCooldown = 0.58;
        }
      }
    }

    // 船尾迷你推进器喷火（装上 thruster 即可使用）
    var wantBoost = input.boost && state.parts.thruster > 0;
    state.boosting = wantBoost;
    window.MT.Audio.setBoosting(wantBoost);

    if (wantBoost) {
      var power = 320 + state.parts.thruster * 145;
      var boostAngle = state.angle;
      state.vx += Math.cos(boostAngle) * state.facing * power * dt;
      // 顺着上坡浪尖喷火能把船抬离水面！
      if (state.inWater) {
        var liftBoost = Math.max(0, -state.facing * slope) * 520 + (state.parts.balloon * 42);
        state.vy -= (120 + liftBoost) * dt;
      } else {
        state.vy -= (145 + state.parts.balloon * 65 + state.parts.thruster * 25) * dt;
      }
      // 船尾蓝橘双色火花尾迹
      var sternX = state.x - Math.cos(state.angle) * state.facing * 38;
      var sternY = state.y - Math.sin(state.angle) * state.facing * 38 - 4;
      world.emitSpark(
        sternX,
        sternY,
        -state.facing * (120 + Math.random() * 90) + state.vx * 0.2,
        (Math.random() - 0.5) * 55,
        Math.random() < 0.45 ? '#8cd6ff' : '#ffa76d',
        2.8 + Math.random() * 2.5,
        0.38
      );
    }

    if (state.inWater) {
      // 弹簧浮力 + 顺波滑行加速
      var submerge = state.y - waveY;
      var buoyancy = -submerge * 28 - state.vy * 5.2;
      state.vy += (buoyancy + gravity * 0.22) * dt;

      // 顺着波坡往下滑获得真实冲浪感
      state.vx += slope * 155 * dt;
      state.vx *= Math.pow(0.24, dt);

      // 船体柔和贴合波面倾角
      var angleDiff = targetAngle - state.angle;
      state.angularVel += (angleDiff * 18 - state.angularVel * 6.5) * dt;
      state.angle += state.angularVel * dt;
    } else {
      // 空中滑翔物理：有风筝/气球时，向前飞会产生显著升力
      var airLift = state.parts.balloon > 0 ? Math.min(gravity * 0.58, Math.abs(state.vx) * 0.36 * state.parts.balloon) : 0;
      state.vy += (gravity - airLift) * dt;
      state.vx *= Math.pow(0.84, dt);

      var glideTilt = Math.max(-0.42, Math.min(0.42, state.vy * 0.0014 * state.facing));
      state.angle += (glideTilt - state.angle) * Math.min(1, dt * 4);
    }

    // 限速与位置更新
    var maxSpeed = 245 + state.parts.thruster * 85;
    state.vx = Math.max(-maxSpeed, Math.min(maxSpeed, state.vx));
    state.x += state.vx * dt;
    state.y += state.vy * dt;

    // 气球绳索弹性摆动
    var targetSway = -state.vx * 0.09;
    state.balloonSwayVel += ((targetSway - state.balloonSway) * 14 - state.balloonSwayVel * 3.8) * dt;
    state.balloonSway += state.balloonSwayVel * dt;

    // 留声机周期性荡出声波光环
    if (state.parts.gramophone > 0) {
      state.soundRingTimer -= dt;
      if (state.soundRingTimer <= 0) {
        world.emitSoundRing(state.x + state.facing * 6, state.y - 24);
        state.soundRingTimer = Math.max(1.4, 2.8 - state.parts.gramophone * 0.45);
      }
    }

    // 灯火系满级时在尾流自动留下发光小漂流灯
    if (state.parts.lantern >= 2 && state.inWater && Math.abs(state.vx) > 45) {
      state.wakeLanternTimer -= dt;
      if (state.wakeLanternTimer <= 0) {
        world.dropWakeLantern(state.x - state.facing * 32);
        state.wakeLanternTimer = state.parts.lantern >= 3 ? 1.6 : 2.8;
      }
    }

    // 更新铁钩物理与打捞判定
    updateHook(dt, world, onSalvage);
  }

  function updateHook(dt, world, onSalvage) {
    var h = state.hook;
    if (h.mode === 'idle') return;

    var anchorX = state.x + Math.cos(state.angle) * state.facing * 24;
    var anchorY = state.y + Math.sin(state.angle) * state.facing * 24 + 4;

    if (h.mode === 'sinking') {
      h.vy += 260 * dt;
      h.vx *= Math.pow(0.28, dt);
      h.vy *= Math.pow(0.5, dt);
      h.x += h.vx * dt;
      h.y += h.vy * dt;

      var dx = h.x - anchorX;
      var dy = h.y - anchorY;
      var dist = Math.hypot(dx, dy);
      h.length = dist;

      // 超过最大绳长自动开始收线
      if (dist >= h.maxLength) {
        h.mode = 'reeling';
      }

      // 检测是否挂中水下残骸
      var relics = world.getRelics();
      var catchR = 28 + state.parts.lantern * 4;
      for (var i = 0; i < relics.length; i++) {
        var r = relics[i];
        if (r.caught) continue;
        var ry = world.getWaveHeight(r.x, world.getTime(), state.parts.lantern) + r.depth + Math.sin(r.bobPhase) * 6;
        if (Math.hypot(h.x - r.x, h.y - ry) <= catchR + r.radius) {
          r.caught = true;
          h.caughtRelic = r;
          h.mode = 'reeling';
          window.MT.Audio.playHookCatch();
          world.emitSpark(r.x, ry, 0, -24, r.color, 5, 0.7);
          break;
        }
      }
    } else if (h.mode === 'reeling') {
      var rdx = anchorX - h.x;
      var rdy = anchorY - h.y;
      var rDist = Math.hypot(rdx, rdy) || 1;
      var reelSpeed = h.caughtRelic ? 255 : 340;
      h.x += (rdx / rDist) * reelSpeed * dt;
      h.y += (rdy / rDist) * reelSpeed * dt;

      if (h.caughtRelic) {
        h.caughtRelic.x = h.x;
        var waveAtHook = world.getWaveHeight(h.x, world.getTime(), state.parts.lantern);
        h.caughtRelic.depth = h.y - waveAtHook;
      }

      if (rDist < 22) {
        if (h.caughtRelic) {
          var item = h.caughtRelic;
          var relicsList = world.getRelics();
          var idx = relicsList.indexOf(item);
          if (idx !== -1) relicsList.splice(idx, 1);

          mountRelic(item, world, onSalvage);
          h.caughtRelic = null;
        }
        h.mode = 'idle';
      }
    }
  }

  function mountRelic(item, world, onSalvage) {
    state.totalSalvaged += 1;
    var waveY = world.getWaveHeight(state.x, world.getTime(), state.parts.lantern);
    world.emitSplash(state.x + state.facing * 20, waveY, 14, item.color, 45);

    if (item.type !== 'keepsake' && typeof state.parts[item.type] === 'number') {
      if (state.parts[item.type] < 3) {
        state.parts[item.type] += 1;
        state.totalParts += 1;
      }
    }
    window.MT.Audio.playMountChord(item.type);

    if (typeof onSalvage === 'function') {
      onSalvage(item, state);
    }
  }

  function getDominantEndingKey() {
    var p = state.parts;
    var flightScore = p.thruster + p.balloon;
    if (flightScore >= p.gramophone * 2 && flightScore >= p.lantern * 2 && flightScore >= 2) {
      return 'flight';
    }
    if (p.gramophone >= p.lantern && p.gramophone >= 2) {
      return 'symphony';
    }
    return 'lanterns';
  }

  reset();

  return {
    reset: reset,
    update: update,
    castHook: castHook,
    releaseHook: releaseHook,
    getDominantEndingKey: getDominantEndingKey,
    getState: function () { return state; }
  };
})();
