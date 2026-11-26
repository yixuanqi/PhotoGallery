window.MT = window.MT || {};

window.MT.Boat = (function () {
  var state = null;

  function reset() {
    var startX = (window.MT.Config && window.MT.Config.PROGRESSION && window.MT.Config.PROGRESSION.START_X) || 640;
    state = {
      x: startX,
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
      fuel: 1.0,
      fuelDepleted: false,
      fuelHudAlpha: 0,
      upgradeFlash: 0,
      soundRingTimer: 1.5,
      wakeLanternTimer: 0,
      scarfPhase: 0,
      prevWaveY: null,
      waveRise: 0,
      reefBumpCooldown: 0,
      reefBumpNotified: false,
      heavySlipNotified: false,
      rampLaunchNotified: false,
      thermalLiftNotified: false,
      shockwaveNotified: false,
      onRamp: false,
      onCloudIsland: false,
      rampLaunchCooldown: 0,
      thermalGlow: 0,
      streamGlow: 0,
      cloudIslandNotified: false,
      gravityStreamNotified: false,
      perfectCrestNotified: false,
      windRingNotified: false,
      whaleSurfNotified: false,
      swingNotified: false,
      sonarCooldown: 0,
      perfectCrestCooldown: 0,
      freeBoostTimer: 0,
      crestFlash: 0,
      skyCombo: 0,
      skyComboResetTimer: 0,
      cloudTrailTimer: 0,
      totalParts: 0,
      totalSalvaged: 0,
      parts: {
        thruster: 0,
        balloon: 0,
        gramophone: 0,
        lantern: 0
      },
      shards: {
        thruster: 0,
        balloon: 0,
        gramophone: 0,
        lantern: 0
      },
      hook: {
        mode: 'idle',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        length: 0,
        maxLength: 300,
        caughtRelic: null,
        tension: 0,
        swellAssist: 0,
        reefSlideTime: 0,
        scrapePoint: null,
        airCast: false,
        anchorTarget: null,
        ropeRestLen: 0
      },
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
    h.tension = 0;
    h.swellAssist = 0;
    h.reefSlideTime = 0;
    h.scrapePoint = null;
    h.airCast = false;
    h.anchorTarget = null;
    h.ropeRestLen = 0;

    if (typeof aimWorldX === 'number' && typeof aimWorldY === 'number') {
      var dx = aimWorldX - h.x;
      var rawDy = aimWorldY - h.y;
      if (rawDy < -24) {
        h.airCast = true;
        h.y = state.y - 10;
        var aDist = Math.hypot(dx, rawDy) || 1;
        h.vx = state.vx * 0.42 + (dx / aDist) * 330;
        h.vy = (rawDy / aDist) * 355;
      } else {
        var dy = Math.max(40, rawDy);
        var dist = Math.hypot(dx, dy) || 1;
        h.vx = state.vx * 0.4 + (dx / dist) * 235;
        h.vy = (dy / dist) * 245;
      }
    } else {
      h.vx = state.vx * 0.45 + state.facing * 36;
      h.vy = 220;
    }
    if (!h.airCast) {
      window.MT.Audio.playSplash(0.45);
      window.MT.World.emitSplash(h.x, state.y + 4, 7, '#d8e8f8', 10);
    }
  }

  function releaseHook() {
    if (!state) return;
    var h = state.hook;
    if (h.mode === 'sinking') {
      h.mode = 'reeling';
    } else if (h.mode === 'swing') {
      // 钟摆松钩瞬间施加柔和切向甩飞助推
      state.vy = Math.min(state.vy - 45, -135);
      state.vx += state.facing * 52;
      h.anchorTarget = null;
      h.mode = 'reeling';
    } else if (h.mode === 'latched') {
      h.anchorTarget = null;
      h.mode = 'reeling';
    }
  }

  function triggerSonar(onEvent) {
    if (!state) return false;
    if (state.sonarCooldown > 0) return false;
    var sn = window.MT.Config.SONAR;
    state.sonarCooldown = sn ? sn.COOLDOWN : 1.55;
    window.MT.World.triggerSonarPulse(state, onEvent);
    return true;
  }

  function grantLandmarkReward(lm, onSalvage) {
    if (!state || !lm || !lm.rewardType) return;
    var world = window.MT.World;
    var arch = window.MT.Config.ARCHETYPES[lm.rewardType];
    if (!arch) return;
    var syntheticItem = {
      id: 9000 + (lm.index || 0),
      type: lm.rewardType,
      name: lm.name,
      line: lm.rewardLine,
      color: arch.color,
      glow: arch.glow,
      shardValue: window.MT.Config.PROGRESSION.SHARDS_PER_LEVEL || 3,
      isLandmarkReward: true
    };
    mountRelic(syntheticItem, world, onSalvage);
  }

  function update(dt, input, onSalvage, onEvent) {
    var world = window.MT.World;
    var fl = window.MT.Config.FLIGHT;
    var pr = window.MT.Config.PROGRESSION;
    var t = world.getTime();
    var zb = world.getZoneBlend(state.x);

    state.scarfPhase += dt * (3.2 + Math.abs(state.vx) * 0.025);
    if (state.upgradeFlash > 0) state.upgradeFlash = Math.max(0, state.upgradeFlash - dt * 1.4);

    var waveY = world.getWaveHeight(state.x, t, state.parts.lantern);
    var slope = world.getWaveSlope(state.x, t, state.parts.lantern);
    var targetAngle = Math.atan(slope);

    if (state.prevWaveY === null) {
      state.prevWaveY = waveY;
      state.waveRise = 0;
    } else {
      var rawRise = -(waveY - state.prevWaveY) / Math.max(0.008, dt);
      state.waveRise += (rawRise - state.waveRise) * Math.min(1, dt * 7.5);
      state.prevWaveY = waveY;
    }
    if (state.reefBumpCooldown > 0) {
      state.reefBumpCooldown = Math.max(0, state.reefBumpCooldown - dt);
    }
    if (state.rampLaunchCooldown > 0) {
      state.rampLaunchCooldown = Math.max(0, state.rampLaunchCooldown - dt);
    }
    if (state.perfectCrestCooldown > 0) {
      state.perfectCrestCooldown = Math.max(0, state.perfectCrestCooldown - dt);
    }
    if (state.sonarCooldown > 0) {
      state.sonarCooldown = Math.max(0, state.sonarCooldown - dt);
    }
    if (state.freeBoostTimer > 0) {
      state.freeBoostTimer = Math.max(0, state.freeBoostTimer - dt);
    }
    if (state.crestFlash > 0) {
      state.crestFlash = Math.max(0, state.crestFlash - dt * 1.9);
    }
    if (state.inWater && state.skyCombo > 0) {
      state.skyComboResetTimer += dt;
      if (state.skyComboResetTimer > 1.2) {
        state.skyCombo = 0;
        state.skyComboResetTimer = 0;
      }
    } else if (!state.inWater) {
      state.skyComboResetTimer = 0;
    }

    var prevInWater = state.inWater;
    state.inWater = state.y >= waveY - 6;

    // 腾空落水：水花 + 推进器冷却蒸汽回气
    if (!prevInWater && state.inWater) {
      if (state.vy > 65) {
        var impact = Math.min(1.4, state.vy / 220);
        world.emitSplash(state.x, waveY, Math.floor(10 + impact * 14), '#eaf4ff', 25);
        window.MT.Audio.playSplash(impact);
      }
      if (state.parts.thruster > 0 && state.fuel < 0.88) {
        var missing = 1 - state.fuel;
        state.fuel = Math.min(1.0, state.fuel + 0.42);
        state.fuelDepleted = false;
        world.emitSteam(state.x - state.facing * 26, waveY, 9);
        window.MT.Audio.playSteamRefill(missing);
      }
    }

    // 高空软上限衰减
    var altFactor = 1.0;
    if (state.y < fl.SOFT_CEILING_START) {
      altFactor = Math.max(0, 1 - (fl.SOFT_CEILING_START - state.y) / (fl.SOFT_CEILING_START - fl.SOFT_CEILING_MAX));
    }

    // 重力由当前海域重力系数 + 浮空挂件共同决定（第四海域天然更轻盈）
    var balloonLift = state.parts.balloon * 0.14 * (0.35 + 0.65 * altFactor);
    var gravity = 400 * zb.gravityMult * Math.max(0.44, 1 - balloonLift);

    // 划桨输入（浮空云岛上也可轻推起跳）
    var moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (moveDir !== 0) {
      state.facing = moveDir;
      state.oarPhase += dt * 6.8;
      var thrust = (state.inWater || state.onCloudIsland) ? 275 : (105 + state.parts.balloon * 48);
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

    // 船尾推进器燃料逻辑
    var canBoost = state.parts.thruster > 0 && state.fuel > 0.01 && !state.fuelDepleted;
    var wantBoost = !!(input.boost && canBoost);
    state.boosting = wantBoost;
    window.MT.Audio.setBoosting(wantBoost, state.fuel);

    if (wantBoost) {
      var burnSec = fl.BASE_BURN_SEC + (state.parts.thruster - 1) * fl.BURN_PER_LV;
      if (state.freeBoostTimer <= 0) {
        state.fuel = Math.max(0, state.fuel - dt / burnSec);
      }
      if (state.fuel <= 0.005) {
        state.fuel = 0;
        state.fuelDepleted = true;
        state.boosting = false;
        window.MT.Audio.setBoosting(false, 0);
      }

      var power = 310 + state.parts.thruster * 130;
      state.vx += Math.cos(state.angle) * state.facing * power * dt;

      if (state.inWater) {
        var surfCfg = window.MT.Config.SURF;
        var upSlope = -state.facing * slope;
        // Phase 1 · 迎浪峰前坡点火 -> 触发「完美跃浪」蓝焰爆发
        if (upSlope > (surfCfg ? surfCfg.CREST_SLOPE_MIN : 0.105) && state.perfectCrestCooldown <= 0) {
          state.perfectCrestCooldown = surfCfg ? surfCfg.CREST_COOLDOWN : 1.35;
          state.freeBoostTimer = surfCfg ? surfCfg.CREST_FREE_BURN : 0.45;
          state.crestFlash = 1.0;
          var crestVy = (surfCfg ? surfCfg.CREST_LAUNCH_VY : 235) + state.parts.thruster * 26 + state.parts.balloon * 18;
          var crestVx = (surfCfg ? surfCfg.CREST_SURGE_VX : 118) + state.parts.thruster * 22;
          state.vy = Math.min(state.vy, -crestVy);
          state.vx += state.facing * crestVx;
          window.MT.Audio.playPerfectCrest();
          world.emitSoundRing(state.x, waveY, '#8ed8ff');
          world.emitSplash(state.x, waveY, 14, '#d8f4ff', 58);
          for (var pc = 0; pc < 9; pc++) {
            world.emitSpark(
              state.x - state.facing * 18,
              waveY - 4,
              -state.facing * (70 + Math.random() * 90),
              -28 - Math.random() * 68,
              pc % 2 === 0 ? '#92deff' : '#ffe39c',
              3.0,
              0.62
            );
          }
          if (!state.perfectCrestNotified) {
            state.perfectCrestNotified = true;
            if (typeof onEvent === 'function') onEvent('perfect_crest');
          }
        }
        var liftBoost = Math.max(0, upSlope) * 520 + (state.parts.balloon * 38);
        state.vy -= (125 + liftBoost) * dt;
      } else if (state.onCloudIsland) {
        var csJump = window.MT.Config.CLOUD_SEA ? window.MT.Config.CLOUD_SEA.ISLAND_JUMP_BONUS : 165;
        state.vy = Math.min(state.vy, -csJump - state.parts.balloon * 24);
        state.onCloudIsland = false;
      } else {
        var verticalBoost = (155 + state.parts.balloon * 48 + state.parts.thruster * 20) * altFactor;
        state.vy -= verticalBoost * dt;
      }

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
    } else if (state.inWater && state.parts.thruster > 0) {
      if (state.fuel < 1.0) {
        state.fuel = Math.min(1.0, state.fuel + dt * fl.WATER_REFILL_RATE);
        if (state.fuel >= fl.REIGNITE_THRESHOLD) {
          state.fuelDepleted = false;
        }
        if (Math.random() < dt * 7) {
          world.emitSteam(state.x - state.facing * 30, waveY, 1);
        }
      }
    }

    var showFuelHud = state.parts.thruster > 0 && (state.fuel < 0.99 || state.boosting);
    state.fuelHudAlpha += ((showFuelHud ? 1 : 0) - state.fuelHudAlpha) * Math.min(1, dt * 6);

    if (state.inWater) {
      var submerge = state.y - waveY;
      var buoyancy = -submerge * 28 - state.vy * 5.2;
      state.vy += (buoyancy + gravity * 0.22) * dt;

      state.vx += slope * 155 * dt;
      state.vx *= Math.pow(0.24, dt);

      var angleDiff = targetAngle - state.angle;
      state.angularVel += (angleDiff * 18 - state.angularVel * 6.5) * dt;
      state.angle += state.angularVel * dt;
    } else {
      var airLift = state.parts.balloon > 0
        ? Math.min(gravity * 0.56, Math.abs(state.vx) * 0.34 * state.parts.balloon) * altFactor
        : 0;
      state.vy += (gravity - airLift) * dt;
      state.vx *= Math.pow(0.84, dt);

      if (state.y < fl.SOFT_CEILING_MAX) {
        state.vy += (fl.SOFT_CEILING_MAX - state.y) * 5.5 * dt;
      }

      var glideTilt = Math.max(-0.42, Math.min(0.42, state.vy * 0.0014 * state.facing));
      state.angle += (glideTilt - state.angle) * Math.min(1, dt * 4);
    }

    // 360° 无缝环海：彻底移除左右边界墙，自由环游世界
    var comboSpeedBonus = state.skyCombo > 0 ? Math.min(130, state.skyCombo * 30) : 0;
    var maxSpeed = 262 + state.parts.thruster * 82 + comboSpeedBonus;
    state.vx = Math.max(-maxSpeed, Math.min(maxSpeed, state.vx));
    state.x += state.vx * dt;
    state.y += state.vy * dt;

    // Step 3A · 浅层水下暗礁船底轻擦（柔和托起并偏转，永不卡死航线）
    if (state.inWater || state.y > -8) {
      var keelCenter = world.getReefSurfaceY(state.x);
      var keelBow = world.getReefSurfaceY(state.x + state.facing * 20);
      var keelHit = null;
      if (keelCenter && keelBow) {
        keelHit = keelCenter.y < keelBow.y ? keelCenter : keelBow;
      } else {
        keelHit = keelCenter || keelBow;
      }
      if (keelHit && state.y + 11 > keelHit.y) {
        state.y = keelHit.y - 11;
        if (state.vy > -18) state.vy = -30;
        state.vx *= 0.68;
        state.angularVel += (keelHit.slope >= 0 ? 1.5 : -1.5);
        if (state.reefBumpCooldown <= 0) {
          state.reefBumpCooldown = 0.65;
          window.MT.Audio.playReefBump(Math.min(1.15, 0.48 + Math.abs(state.vx) / 145));
          world.emitSplash(state.x + state.facing * 12, keelHit.y, 9, '#dce8f4', 20);
          if (!state.reefBumpNotified) {
            state.reefBumpNotified = true;
            if (typeof onEvent === 'function') onEvent('reef_bump', keelHit.reef);
          }
        }
      }
    }

    // Step 3B · 第三海域倾斜火箭残壳跳台滑行与跃浪发射
    state.onRamp = false;
    var rb = window.MT.Config.ROCKET_BELT;
    var ramp = world.getRampSurfaceAt(state.x);
    if (ramp && state.rampLaunchCooldown <= 0) {
      var movingUpRamp = (state.vx * ramp.dir > 28) || (state.boosting && state.facing === ramp.dir);
      if (state.y >= ramp.y - 14 && state.y <= ramp.y + 42) {
        if (movingUpRamp) {
          state.onRamp = true;
          state.inWater = false;
          state.y = ramp.y - 6;
          var rampAngle = Math.atan(ramp.slope);
          state.angle += (rampAngle - state.angle) * Math.min(1, dt * 12);
          state.angularVel *= 0.6;
          if (state.boosting) {
            state.vx += ramp.dir * 120 * dt;
          }
          var spdAlong = Math.abs(state.vx);
          state.vy = Math.min(state.vy, ramp.slope * state.vx);

          if (Math.random() < dt * 18) {
            world.emitSpark(
              state.x - ramp.dir * 14,
              ramp.y - 2,
              -ramp.dir * (65 + Math.random() * 60),
              -20 - Math.random() * 40,
              '#ffd596',
              2.3,
              0.42
            );
          }

          if (ramp.u >= 0.84 && (spdAlong >= (rb ? rb.RAMP_MIN_LAUNCH_VX : 84) || state.boosting)) {
            var launchVy = (rb ? rb.RAMP_LAUNCH_VY : 235) + Math.min(125, spdAlong * 0.42) + state.parts.thruster * 22 + state.parts.balloon * 16;
            state.vy = -launchVy;
            state.vx += ramp.dir * (48 + state.parts.thruster * 18);
            state.rampLaunchCooldown = 0.55;
            state.onRamp = false;
            window.MT.Audio.playRampLaunch();
            world.emitSplash(state.x, ramp.y, 12, '#ffe0ae', 55);
            for (var rk = 0; rk < 8; rk++) {
              world.emitSpark(state.x, ramp.y, -ramp.dir * (40 + Math.random() * 80), -30 - Math.random() * 70, '#ffba7a', 2.8, 0.55);
            }
            if (!state.rampLaunchNotified) {
              state.rampLaunchNotified = true;
              if (typeof onEvent === 'function') onEvent('ramp_launch', ramp.hulk);
            }
          }
        } else if (state.y + 8 > ramp.y && ramp.u > 0.25) {
          state.y = ramp.y - 8;
          state.vy = Math.min(state.vy, -24);
          state.vx *= 0.82;
        }
      }
    }

    // Step 3B · 热流蒸汽柱托举 + 推进器冷却补气
    var thermal = world.getThermalForceAt(state.x, state.y);
    if (thermal.strength > 0.08) {
      state.thermalGlow += (thermal.strength - state.thermalGlow) * Math.min(1, dt * 6);
      var liftF = ((rb ? rb.VENT_UPWARD_FORCE : 430) + state.parts.balloon * (rb ? rb.VENT_BALLOON_BONUS : 105)) * thermal.strength;
      state.vy -= liftF * dt;
      if (state.vy < -285) state.vy = -285;
      state.vx += (thermal.cx - state.x) * 0.45 * thermal.strength * dt;

      if (state.parts.thruster > 0 && state.fuel < 1.0) {
        state.fuel = Math.min(1.0, state.fuel + (rb ? rb.VENT_FUEL_REFILL : 1.75) * thermal.strength * dt);
        if (state.fuel >= fl.REIGNITE_THRESHOLD) state.fuelDepleted = false;
      }
      if (thermal.strength > 0.28) {
        window.MT.Audio.playThermalLift();
        if (Math.random() < dt * 10) {
          world.emitSpark(state.x + (Math.random() - 0.5) * 32, state.y + 6, (Math.random() - 0.5) * 20, -65 - Math.random() * 45, '#fff0d2', 2.2, 0.65);
        }
        if (!state.thermalLiftNotified && state.y < waveY - 26) {
          state.thermalLiftNotified = true;
          if (typeof onEvent === 'function') onEvent('thermal_lift');
        }
      }
    } else {
      state.thermalGlow *= Math.pow(0.05, dt);
    }

    // Step 3B · 天降火箭激波浪涌推动（环形最短距）
    var waves = world.getShockwaves();
    for (var swi = 0; swi < waves.length; swi++) {
      var sw = waves[swi];
      if (sw.hitBoat) continue;
      var signedSw = world.deltaX(sw.x, state.x);
      var distSw = Math.abs(signedSw);
      if (Math.abs(distSw - sw.radius) < 34 && state.y > -48) {
        sw.hitBoat = true;
        var pushDir = signedSw >= 0 ? 1 : -1;
        var proximity = Math.max(0.28, 1 - sw.radius / sw.maxRadius);
        state.vy -= 135 * proximity;
        state.vx += pushDir * 115 * proximity;
        state.angularVel += pushDir * 1.4 * proximity;
        world.emitSplash(state.x, waveY, 12, '#ffe8c6', 36);
        if (!state.shockwaveNotified) {
          state.shockwaveNotified = true;
          if (typeof onEvent === 'function') onEvent('shockwave_ride');
        }
      }
    }

    // Step 3C · 第四海域反重力浮岛单向停泊平台（可落岛休息、补气与二次跃升）
    var prevOnIsland = state.onCloudIsland;
    state.onCloudIsland = false;
    var cs = window.MT.Config.CLOUD_SEA;
    var islHit = world.getCloudIslandSurfaceAt(state.x);
    if (islHit && state.vy >= -22 && state.y + 10 >= islHit.y - 4 && state.y - 14 <= islHit.y + 18) {
      state.onCloudIsland = true;
      state.inWater = false;
      state.y = islHit.y - 9;
      if (state.vy > 0) state.vy = 0;
      state.vx *= Math.pow(0.42, dt);
      var islAngle = Math.atan(islHit.slope) * 0.65;
      state.angle += (islAngle - state.angle) * Math.min(1, dt * 10);
      state.angularVel *= 0.5;

      if (state.parts.thruster > 0 && state.fuel < 1.0) {
        state.fuel = Math.min(1.0, state.fuel + (cs ? cs.ISLAND_FUEL_REFILL : 2.6) * dt);
        if (state.fuel >= fl.REIGNITE_THRESHOLD) state.fuelDepleted = false;
      }
      if (!prevOnIsland) {
        window.MT.Audio.playCloudTouch();
        for (var ck = 0; ck < 7; ck++) {
          world.emitSpark(state.x + (Math.random() - 0.5) * 34, islHit.y, (Math.random() - 0.5) * 48, -24 - Math.random() * 34, '#e6f5ff', 2.4, 0.75);
        }
        if (!state.cloudIslandNotified) {
          state.cloudIslandNotified = true;
          if (typeof onEvent === 'function') onEvent('cloud_island');
        }
      }
    }

    // Step 3C · 第四海域月光失重上升流（无推进器亦可悠然登云，全流派零软锁）
    var gStream = world.getGravityStreamAt(state.x, state.y);
    if (gStream.strength > 0.06) {
      state.streamGlow += (gStream.strength - state.streamGlow) * Math.min(1, dt * 5.5);
      var sLift = ((cs ? cs.STREAM_UPWARD_FORCE : 355) + state.parts.balloon * (cs ? cs.STREAM_BALLOON_BONUS : 95)) * gStream.strength;
      state.vy -= sLift * dt;
      if (state.vy < -235) state.vy = -235;
      state.vx += (gStream.cx - state.x) * 0.35 * gStream.strength * dt;
      if (state.parts.thruster > 0 && state.fuel < 1.0) {
        state.fuel = Math.min(1.0, state.fuel + (cs ? cs.STREAM_FUEL_REFILL : 1.9) * gStream.strength * dt);
        if (state.fuel >= fl.REIGNITE_THRESHOLD) state.fuelDepleted = false;
      }
      if (gStream.strength > 0.25) {
        window.MT.Audio.playGravityStream();
        if (Math.random() < dt * 8) {
          world.emitSpark(state.x + (Math.random() - 0.5) * 36, state.y + 8, (Math.random() - 0.5) * 14, -55 - Math.random() * 40, '#d8f0ff', 2.2, 0.9);
        }
        if (!state.gravityStreamNotified && state.y < waveY - 30) {
          state.gravityStreamNotified = true;
          if (typeof onEvent === 'function') onEvent('gravity_stream');
        }
      }
    } else {
      state.streamGlow *= Math.pow(0.06, dt);
    }

    // 第四海域高空云海顺风微流与银金航迹
    if (!state.inWater && !state.onCloudIsland && zb.zone.id === 'cloud_sea' && state.parts.balloon > 0) {
      state.vx += state.facing * (cs ? cs.GLIDE_TAILWIND : 46) * (0.4 + state.parts.balloon * 0.25) * dt;
      state.cloudTrailTimer -= dt;
      if (state.cloudTrailTimer <= 0) {
        state.cloudTrailTimer = 0.09;
        world.emitSpark(state.x - state.facing * 24, state.y - 12, -state.vx * 0.12, -6 + (Math.random() - 0.5) * 10, '#e8f4ff', 2.6, 0.95);
      }
    }

    // Phase 2 · 发光深海巨鲸伴航洋流（乘鲸破浪加速与微弱浮力托举）
    var whale = world.getMoonWhale();
    if (whale && whale.active) {
      var wdx = world.deltaX(state.x, whale.x);
      if (Math.abs(wdx) < 185 && state.y > -55) {
        var wDir = whale.vx >= 0 ? 1 : -1;
        state.vx += wDir * 220 * dt;
        if (state.parts.thruster > 0 && state.fuel < 1.0) {
          state.fuel = Math.min(1.0, state.fuel + 1.2 * dt);
          state.fuelDepleted = false;
        }
        if (!state.whaleSurfNotified) {
          state.whaleSurfNotified = true;
          if (typeof onEvent === 'function') onEvent('whale_surf');
        }
      }
    }

    // Phase 2 · 声波激发水母群在船底提供的短暂向上浮力托举
    if (world.getJellyBoostTimer() > 0 && state.inWater && state.parts.gramophone >= 1) {
      state.vy -= 26 * dt;
    }

    // Phase 1 · 全环海平流层月风加速环穿环接力（回满 62% 燃料 + 动量冲刺 + 连击和声）
    var surfP = window.MT.Config.SURF;
    var wRings = world.getWindRings();
    for (var ri = 0; ri < wRings.length; ri++) {
      var wr = wRings[ri];
      if (wr.cooldown > 0) continue;
      var rdx = world.deltaX(state.x, wr.x);
      var rdy = wr.y - (state.y - 14);
      if (Math.hypot(rdx, rdy) <= wr.radius + 26) {
        wr.cooldown = surfP ? surfP.RING_COOLDOWN : 2.5;
        wr.flash = 1.0;
        state.skyCombo += 1;
        state.skyComboResetTimer = 0;
        state.crestFlash = 1.0;

        var ringDir = Math.abs(state.vx) > 25 ? Math.sign(state.vx) : state.facing;
        state.facing = ringDir;
        var rgSolved = world.getLandmarkById('rocket_gantry') && world.getLandmarkById('rocket_gantry').solved;
        var ringBonus = rgSolved ? 46 : 0;
        var targetSpeed = (surfP ? surfP.RING_MIN_VX : 268) + state.parts.thruster * 24 + Math.min(96, state.skyCombo * 22) + ringBonus;
        if (Math.abs(state.vx) < targetSpeed) {
          state.vx = ringDir * targetSpeed;
        } else {
          state.vx += ringDir * 42;
        }
        var upVy = (surfP ? surfP.RING_UP_VY : 155) + state.parts.balloon * 16;
        state.vy = Math.min(state.vy - 70, -upVy);

        if (state.parts.thruster > 0) {
          state.fuel = Math.min(1.0, state.fuel + (surfP ? surfP.RING_FUEL_REFILL : 0.62));
          state.fuelDepleted = false;
        }

        window.MT.Audio.playWindRing(state.skyCombo);
        var ringVisX = world.projectNear(wr.x, state.x);
        world.emitSoundRing(ringVisX, wr.y, '#c8f0ff');
        for (var wk = 0; wk < 12; wk++) {
          var wang = (wk / 12) * Math.PI * 2;
          world.emitSpark(ringVisX, wr.y, Math.cos(wang) * 85 + state.vx * 0.2, Math.sin(wang) * 65, wk % 2 === 0 ? '#b8ebff' : '#ffe8b4', 2.8, 0.72);
        }
        if (!state.windRingNotified) {
          state.windRingNotified = true;
          if (typeof onEvent === 'function') onEvent('wind_ring');
        }
      }
    }

    // Phase 1 · 常规浅表碎片航行掠过自动拾取 + 空中飞舟直掠降落伞/云端星遗
    var allRelics = world.getRelics();
    var autoMagnet = (surfP ? surfP.AUTO_MAGNET_BASE : 76) + state.parts.gramophone * (surfP ? surfP.AUTO_MAGNET_GRAMO : 34);
    var autoCollectR = surfP ? surfP.AUTO_COLLECT_R : 44;

    for (var ar = allRelics.length - 1; ar >= 0; ar--) {
      var arel = allRelics[ar];
      if (arel.caught) continue;
      var adx = world.deltaX(state.x, arel.x);

      if (arel.isAirborne) {
        var adist = Math.hypot(adx, arel.y - (state.y - 16));
        if (adist <= 50) {
          var avisX = state.x + adx;
          allRelics.splice(ar, 1);
          window.MT.Audio.playAirSnatch();
          state.vy = Math.min(state.vy, -115);
          for (var ak = 0; ak < 10; ak++) {
            var angA = (ak / 10) * Math.PI * 2;
            world.emitSpark(avisX, arel.y, Math.cos(angA) * 70, Math.sin(angA) * 55 - 15, arel.color, 3.0, 0.75);
          }
          mountRelic(arel, world, onSalvage);
        }
      } else if (!arel.isHeavy) {
        var rWaveY = world.getWaveHeight(arel.x, t, state.parts.lantern);
        var rySurf = rWaveY + arel.depth + Math.sin(arel.bobPhase) * 5;
        var sdist = Math.hypot(adx, rySurf - (state.y + 4));
        if (sdist <= autoCollectR) {
          var svisX = state.x + adx;
          allRelics.splice(ar, 1);
          window.MT.Audio.playAutoCollect();
          for (var sk = 0; sk < 7; sk++) {
            var sang = (sk / 7) * Math.PI * 2;
            world.emitSpark(svisX, rySurf, Math.cos(sang) * 52, Math.sin(sang) * 44 - 22, arel.color, 2.6, 0.62);
          }
          mountRelic(arel, world, onSalvage);
        } else if (sdist <= autoMagnet) {
          // 靠近船身时丝滑上浮吸附，告别停车甩钩
          arel.x = world.wrapX(arel.x - adx * Math.min(1, dt * 5.2));
          arel.depth = Math.max(8, arel.depth - 72 * dt);
        }
      }
    }

    if (state.y < fl.HARD_CEILING) {
      state.y = fl.HARD_CEILING;
      if (state.vy < 0) state.vy = 0;
    }

    var targetSway = -state.vx * 0.09;
    state.balloonSwayVel += ((targetSway - state.balloonSway) * 14 - state.balloonSwayVel * 3.8) * dt;
    state.balloonSway += state.balloonSwayVel * dt;

    if (state.parts.gramophone > 0) {
      state.soundRingTimer -= dt;
      if (state.soundRingTimer <= 0) {
        world.emitSoundRing(state.x + state.facing * 6, state.y - 24);
        state.soundRingTimer = Math.max(1.4, 2.8 - state.parts.gramophone * 0.45);
      }
    }

    if (state.parts.lantern >= 2 && state.inWater && Math.abs(state.vx) > 45) {
      state.wakeLanternTimer -= dt;
      if (state.wakeLanternTimer <= 0) {
        world.dropWakeLantern(state.x - state.facing * 32);
        state.wakeLanternTimer = state.parts.lantern >= 3 ? 1.6 : 2.8;
      }
    }

    updateHook(dt, world, onSalvage, onEvent);
  }

  function updateHook(dt, world, onSalvage, onEvent) {
    var h = state.hook;
    if (h.mode === 'idle') return;

    var anchorX = state.x + Math.cos(state.angle) * state.facing * 24;
    var anchorY = state.y + Math.sin(state.angle) * state.facing * 24 + 4;

    if (h.mode === 'sinking') {
      if (h.airCast) {
        h.vy += 420 * dt;
        h.vx *= Math.pow(0.68, dt);
      } else {
        h.vy += 260 * dt;
        h.vx *= Math.pow(0.28, dt);
        h.vy *= Math.pow(0.5, dt);
      }
      h.x += h.vx * dt;
      h.y += h.vy * dt;

      // 水下暗礁碰石滑落：铁钩触礁会轻响偏转滑向深谷，避免卡石
      var reefHit = world.getReefSurfaceY(h.x);
      if (reefHit && h.y >= reefHit.y - 4) {
        h.y = reefHit.y - 4;
        var slideDir = Math.abs(reefHit.slope) > 0.08
          ? Math.sign(reefHit.slope)
          : (world.deltaX(reefHit.reef.x, h.x) >= 0 ? 1 : -1);
        h.vx = slideDir * 95;
        h.vy = Math.max(18, Math.abs(reefHit.slope) * 76);
        if (h.reefSlideTime < 0.04) {
          window.MT.Audio.playHookClink();
          world.emitSpark(h.x, h.y, slideDir * 24, -22, '#dce8f4', 2.4, 0.45);
        }
        h.reefSlideTime += dt;
        if (h.reefSlideTime > 0.42) {
          h.mode = 'reeling';
        }
      } else {
        h.reefSlideTime = 0;
      }

      var dx = h.x - anchorX;
      var dy = h.y - anchorY;
      var dist = Math.hypot(dx, dy);
      h.length = dist;

      if (dist >= h.maxLength) {
        h.mode = 'reeling';
      }

      // Phase 2 · 优先检测四大古迹机关锚点与高空钟摆气球
      var interactHit = world.findHookInteractableAt(h.x, h.y, 30 + state.parts.lantern * 3);
      if (interactHit) {
        h.anchorTarget = interactHit;
        h.x = world.projectNear(interactHit.x, state.x);
        h.y = interactHit.y;
        window.MT.Audio.playAnchorLatch();
        world.emitSpark(h.x, h.y, 0, -24, '#ffe5a6', 5.2, 0.7);

        if (interactHit.kind === 'sky_buoy') {
          h.mode = 'swing';
          h.ropeRestLen = Math.max(76, Math.min(235, Math.hypot(h.x - anchorX, h.y - anchorY)));
          if (state.inWater) {
            state.vy = Math.min(state.vy, -135);
          }
          if (!state.swingNotified) {
            state.swingNotified = true;
            if (typeof onEvent === 'function') onEvent('sky_swing');
          }
        } else {
          h.mode = 'latched';
          h.tension = 0.25;
        }
        return;
      }

      var relics = world.getRelics();
      var catchR = 28 + state.parts.lantern * 4;
      for (var i = 0; i < relics.length; i++) {
        var r = relics[i];
        if (r.caught) continue;
        var rProjX = world.projectNear(r.x, h.x);
        var ry = r.isAirborne
          ? r.y
          : (world.getWaveHeight(r.x, world.getTime(), state.parts.lantern) + r.depth + Math.sin(r.bobPhase) * (r.isHeavy ? 4 : 6));
        if (Math.hypot(h.x - rProjX, h.y - ry) <= catchR + r.radius) {
          r.caught = true;
          r.sinkReturn = false;
          h.caughtRelic = r;
          h.mode = 'reeling';
          h.tension = r.isHeavy ? 0.08 : 0;
          h.swellAssist = 0;
          h.scrapePoint = null;
          if (r.isAirborne) window.MT.Audio.playAirSnatch();
          else window.MT.Audio.playHookCatch();
          world.emitSpark(rProjX, ry, 0, -24, r.color, (r.isHeavy || r.isAirborne) ? 6.5 : 5, 0.75);
          break;
        }
      }
    } else if (h.mode === 'latched') {
      // Phase 2 · 锚链机关物理牵引（浅湾灯塔铜镜、发射台双钢缆、天文台拨杆）
      var tgt = h.anchorTarget;
      if (!tgt || (tgt.landmark && tgt.landmark.solved)) {
        h.anchorTarget = null;
        h.mode = 'reeling';
        return;
      }
      var tx = world.projectNear(tgt.x, state.x);
      var ty = tgt.kind === 'lighthouse_buoy'
        ? (world.getWaveHeight(tgt.x, world.getTime(), state.parts.lantern) - 6)
        : tgt.y;
      h.x = tx;
      h.y = ty;

      var distAnchor = Math.hypot(anchorX - tx, anchorY - ty);
      if (distAnchor > 345) {
        h.anchorTarget = null;
        h.mode = 'reeling';
        return;
      }

      // 只要按住拉扯、划船或点火，便持续施加有效拉力
      var tugSpeed = Math.abs(state.vx) + (state.boosting ? 150 : 0);
      var pullRate = 0.34 + Math.min(0.68, tugSpeed / 210);
      h.tension = Math.min(0.92, 0.28 + pullRate * 0.52);

      // 轻微弹性回拽，给予真实的沉重金属锚链手感
      if (distAnchor > 115) {
        var pullBack = (distAnchor - 115) * 1.1;
        state.vx += ((tx - anchorX) / (distAnchor || 1)) * pullBack * dt;
      }

      if (tgt.kind === 'lighthouse_buoy') {
        var lh = tgt.landmark;
        lh.pullProgress = Math.min(1, lh.pullProgress + pullRate * 0.56 * dt);
        lh.buoyTilt = -0.68 * (1 - lh.pullProgress);
        window.MT.Audio.playAnchorWinch(lh.pullProgress);
        if (Math.random() < dt * 8) {
          world.emitSpark(tx, ty - 6, (Math.random() - 0.5) * 45, -35 - Math.random() * 25, '#ffe29c', 2.4, 0.55);
        }
        if (lh.pullProgress >= 1) {
          world.markLandmarkSolved(lh, state, onEvent);
          h.anchorTarget = null;
          h.mode = 'reeling';
        }
      } else if (tgt.kind === 'gantry_clamp') {
        var cl = tgt.clamp;
        var rg = tgt.landmark;
        cl.progress = Math.min(1, cl.progress + pullRate * 0.62 * dt);
        window.MT.Audio.playAnchorWinch(cl.progress);
        if (Math.random() < dt * 12) {
          world.emitSpark(tx, ty, (Math.random() - 0.5) * 85, -30 - Math.random() * 55, '#ffb474', 2.6, 0.5);
        }
        if (cl.progress >= 1) {
          cl.released = true;
          window.MT.Audio.playRopeSnap();
          for (var spk = 0; spk < 12; spk++) {
            world.emitSpark(tx, ty, (Math.random() - 0.5) * 150, -40 - Math.random() * 90, '#ffd48a', 3.2, 0.72);
          }
          var allReleased = true;
          for (var ci = 0; ci < rg.clamps.length; ci++) {
            if (!rg.clamps[ci].released) allReleased = false;
          }
          if (allReleased) {
            world.markLandmarkSolved(rg, state, onEvent);
          } else if (typeof onEvent === 'function') {
            onEvent('clamp_snap');
          }
          h.anchorTarget = null;
          h.mode = 'reeling';
        }
      } else if (tgt.kind === 'observatory_dial') {
        var ob = tgt.landmark;
        ob.dialProgress = Math.min(1, ob.dialProgress + pullRate * 0.72 * dt);
        window.MT.Audio.playAnchorWinch(ob.dialProgress);
        if (ob.dialProgress >= 1) {
          ob.dialAngle = 0;
          world.markLandmarkSolved(ob, state, onEvent);
          h.anchorTarget = null;
          h.mode = 'reeling';
        }
      }
    } else if (h.mode === 'swing') {
      // Phase 2 · 高空钟摆锚点荡飞物理
      var sb = h.anchorTarget;
      if (!sb || !sb.buoy) {
        h.anchorTarget = null;
        h.mode = 'reeling';
        return;
      }
      var bx = world.projectNear(sb.buoy.x, state.x);
      var by = sb.buoy.y;
      h.x = bx;
      h.y = by;

      var sdx = state.x - bx;
      var sdy = state.y - by;
      var sdist = Math.hypot(sdx, sdy) || 1;

      // 绳索径向约束 + 切向摆动加速
      if (sdist > h.ropeRestLen) {
        var nx = sdx / sdist;
        var ny = sdy / sdist;
        state.x = bx + nx * h.ropeRestLen;
        state.y = by + ny * h.ropeRestLen;
        var radialVel = state.vx * nx + state.vy * ny;
        if (radialVel > 0) {
          state.vx -= radialVel * nx;
          state.vy -= radialVel * ny;
        }
      }
      // 略微收绳提升高度，确保荡起后能飞跃更高
      h.ropeRestLen = Math.max(72, h.ropeRestLen - 26 * dt);
      state.vx += state.facing * 175 * dt;
      state.vy -= 55 * dt;
      sb.buoy.sway = Math.max(-14, Math.min(14, sdx * 0.08));

      // 荡过锚点上方或点火加速时自动脱钩甩飞
      if (state.y < by - 26 || state.boosting) {
        releaseHook();
      }
    } else if (h.mode === 'reeling') {
      var rdx = anchorX - h.x;
      var rdy = anchorY - h.y;
      var rDist = Math.hypot(rdx, rdy) || 1;
      var reelSpeed = h.caughtRelic ? 255 : 340;

      if (h.caughtRelic && h.caughtRelic.isHeavy) {
        var hr = h.caughtRelic;
        var mr = window.MT.Config.MIST_REEFS;
        var load = typeof hr.effectiveWeight === 'number' ? hr.effectiveWeight : 1.0;
        var assist = hr.jellyAssist || 0;

        h.scrapePoint = null;
        for (var sp = 1; sp <= 3; sp++) {
          var frac = sp * 0.25;
          var sx = anchorX + (h.x - anchorX) * frac;
          var sy = anchorY + (h.y - anchorY) * frac;
          var sReef = world.getReefSurfaceY(sx);
          if (sReef && sy > sReef.y - 3) {
            h.scrapePoint = { x: sx, y: sReef.y - 3 };
            break;
          }
        }

        state.vy += load * 34 * dt;
        var horizPull = h.x - anchorX;
        state.vx += Math.max(-72, Math.min(72, horizPull * 0.42)) * load * dt;

        var riseNorm = Math.max(0, Math.min(1, state.waveRise / 26));
        h.swellAssist += (riseNorm - h.swellAssist) * Math.min(1, dt * 6);

        var baseReel = mr.HEAVY_BASE_REEL + assist * mr.HEAVY_JELLY_REEL;
        var swellBonus = h.swellAssist * mr.HEAVY_SWELL_BONUS * (0.42 + 0.58 * load);
        var centerFactor = Math.abs(rdx) < 95 ? 1.15 : 0.85;
        reelSpeed = (baseReel + swellBonus) * centerFactor;

        if (h.swellAssist > 0.32 && Math.random() < dt * 7) {
          world.emitSpark(
            h.x + (Math.random() - 0.5) * 18,
            h.y - 6,
            (Math.random() - 0.5) * 14,
            -32 - Math.random() * 22,
            '#fff0cf',
            2.1,
            0.75
          );
        }

        var awayDir = anchorX >= h.x ? 1 : -1;
        var pullAwaySpeed = Math.max(0, state.vx * awayDir);
        var speedOver = Math.max(0, Math.abs(state.vx) - mr.HEAVY_PULL_SAFE_SPEED);

        var strain = 0;
        if (state.boosting) strain += 1.18 * load;
        if (pullAwaySpeed > mr.HEAVY_PULL_SAFE_SPEED) {
          strain += (pullAwaySpeed - mr.HEAVY_PULL_SAFE_SPEED) * 0.0068 * load;
        } else if (speedOver > 25) {
          strain += (speedOver - 25) * 0.004 * load;
        }
        if (h.scrapePoint) strain += 0.36 * load;

        var relief = 0.28 + h.swellAssist * 0.48 + assist * 0.65;
        if (strain > 0.05) {
          h.tension += (strain - relief * 0.32) * dt;
        } else {
          h.tension -= relief * dt;
        }
        h.tension = Math.max(0, Math.min(1.05, h.tension));

        if (h.tension > 0.42) {
          window.MT.Audio.playRopeStrain(h.tension);
        }

        if (h.tension >= 1.0) {
          window.MT.Audio.playRopeSnap();
          world.emitSplash(h.x, h.y, 12, '#ffe0b8', 14);
          hr.caught = false;
          hr.sinkReturn = true;
          h.caughtRelic = null;
          h.tension = 0;
          h.swellAssist = 0;
          h.scrapePoint = null;
          if (!state.heavySlipNotified) {
            state.heavySlipNotified = true;
            if (typeof onEvent === 'function') onEvent('heavy_slip', hr);
          }
          return;
        }
      } else {
        h.tension = 0;
        h.swellAssist = 0;
        h.scrapePoint = null;
      }

      h.x += (rdx / rDist) * reelSpeed * dt;
      h.y += (rdy / rDist) * reelSpeed * dt;

      if (h.caughtRelic) {
        if (h.caughtRelic.isHeavy) {
          var bodyReef = world.getReefSurfaceY(h.x);
          if (bodyReef && h.y > bodyReef.y - 12) {
            var pushDir = world.deltaX(bodyReef.reef.x, h.x) >= 0 ? 1 : -1;
            h.x += pushDir * 68 * dt;
            h.y -= 28 * dt;
          }
        }
        h.caughtRelic.x = world.wrapX(h.x);
        if (h.caughtRelic.isAirborne) {
          h.caughtRelic.y = h.y;
        } else {
          var waveAtHook = world.getWaveHeight(h.x, world.getTime(), state.parts.lantern);
          h.caughtRelic.depth = h.y - waveAtHook;
        }
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
        h.tension = 0;
        h.swellAssist = 0;
        h.scrapePoint = null;
        h.mode = 'idle';
      }
    }
  }

  function mountRelic(item, world, onSalvage) {
    var pr = window.MT.Config.PROGRESSION;
    state.totalSalvaged += 1;
    var waveY = world.getWaveHeight(state.x, world.getTime(), state.parts.lantern);
    world.emitSplash(state.x + state.facing * 20, waveY, 12, item.color, 40);

    var shardGain = item.shardValue || 1;
    var info = {
      isUpgrade: false,
      isMaxed: false,
      level: 0,
      shards: 0,
      shardGain: shardGain,
      shardsNeeded: pr.SHARDS_PER_LEVEL
    };

    if (item.type !== 'keepsake' && typeof state.parts[item.type] === 'number') {
      if (state.parts[item.type] >= pr.MAX_LEVEL) {
        info.isMaxed = true;
        info.level = pr.MAX_LEVEL;
      } else {
        for (var sg = 0; sg < shardGain; sg++) {
          if (state.parts[item.type] >= pr.MAX_LEVEL) break;
          state.shards[item.type] += 1;
          if (state.shards[item.type] >= pr.SHARDS_PER_LEVEL) {
            state.shards[item.type] = 0;
            state.parts[item.type] += 1;
            state.totalParts += 1;
            state.upgradeFlash = 1.0;
            info.isUpgrade = true;
            world.emitSoundRing(state.x, state.y - 16, item.color);
            for (var k = 0; k < 12; k++) {
              var a = (k / 12) * Math.PI * 2;
              world.emitSpark(state.x, state.y - 14, Math.cos(a) * 85, Math.sin(a) * 65 - 25, item.color, 3.6, 0.85);
            }
          }
        }
        info.level = state.parts[item.type];
        info.shards = state.shards[item.type];
      }
    }

    window.MT.Audio.playMountChord(item.type, info.isUpgrade);

    if (typeof onSalvage === 'function') {
      onSalvage(item, state, info);
    }
  }

  function getDominantEndingKey() {
    var p = state.parts;
    var s = state.shards;
    var flightScore = (p.thruster + p.balloon) * 3 + s.thruster + s.balloon;
    var symScore = p.gramophone * 6 + s.gramophone * 2;
    var lanScore = p.lantern * 6 + s.lantern * 2;

    if (flightScore >= symScore && flightScore >= lanScore && (p.thruster + p.balloon) >= 2) {
      return 'flight';
    }
    if (symScore >= lanScore && p.gramophone >= 1) {
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
    triggerSonar: triggerSonar,
    grantLandmarkReward: grantLandmarkReward,
    getDominantEndingKey: getDominantEndingKey,
    getState: function () { return state; }
  };
})();
