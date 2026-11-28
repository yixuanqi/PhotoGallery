window.MT = window.MT || {};

window.MT.Physics = (function () {
  var boat = null;

  function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function refreshStats() {
    if (!boat || !window.MT.Shop) return;
    var st = window.MT.Shop.getStats();
    boat.stats = st;
    var ratio = boat.maxHull > 0 ? (boat.hull / boat.maxHull) : 1;
    boat.maxHull = st.maxHull;
    boat.hull = Math.min(st.maxHull, Math.max(boat.hull, Math.round(st.maxHull * ratio)));
  }

  function reset(startX) {
    var cfg = window.MT.Config.SURF;
    var st = window.MT.Shop ? window.MT.Shop.getStats() : {
      rocketLv: 0, hullLv: 0, magnetLv: 0, deepFinsLv: 0, skySailLv: 0, tideSonarLv: 0, heatShieldLv: 0, quiltLv: 0, springsLv: 0, gliderLv: 0, prowLv: 0,
      breathDrainMult: 1, diveChargeMult: 1, breachPowerMult: 1, breachShockRadius: 0, deepMaxBonus: 0, breachRefillsFuel: false,
      sailGlideFrac: 0, cloudBonusMult: 1, sailFuelRegen: 0, cloudDoubleJump: false,
      sonarPeriod: 0, sonarRange: 0, sonarRelicMult: 1, sonarRevealRelics: false,
      maxHull: cfg.MAX_HULL, crashDamageMult: 1, thrustMult: 1, liftMult: 1,
      burnRateMult: 1, maxSpeed: cfg.MAX_SPEED, magnetRadius: cfg.MAGNET_RADIUS,
      starMult: 1, heatResist: 0, fireFuelRegen: 0, fireHullRegen: 0,
      coldResist: 0, iceControlBonus: 0, iceFuelRegen: 0, iceHullRegen: 0,
      bumpResist: 0, roughFrictionRelief: 0, springBounceBonus: 0,
      glideLiftFrac: 0, airFuelRegen: 0, updraftMult: 1,
      vineDamageMult: 1, vineSliceBoost: 0, vineSliceFuel: 0, vineSliceHeal: 0
    };
    var isExp = !!(window.MT.Config && window.MT.Config.EXPLORE_MODE);
    var defaultX = isExp ? ((window.MT.Config.WORLD_CYCLE && window.MT.Config.WORLD_CYCLE.HOME_X) || 520) : 120;
    var sx = typeof startX === 'number' ? startX : defaultX;
    var startY = window.MT.Eras ? window.MT.Eras.getSurfaceY(sx, 0) : 0;
    var startEra = window.MT.Eras ? window.MT.Eras.getCurrentEra(sx) : { id: 'moon_sea' };
    var reachedMap = {};
    reachedMap[startEra.id] = true;

    boat = {
      x: sx,
      y: startY,
      vx: isExp ? 0 : (cfg.MIN_CRUISE_SPEED + 44 + st.rocketLv * 14),
      vy: 0,
      angle: 0,
      localPitch: 0,
      facing: 1,
      facingSmooth: 1,
      angularVel: 0,
      inWater: true,
      boosting: false,
      wasBoosting: false,
      fuel: cfg.MAX_FUEL,
      hull: st.maxHull,
      maxHull: st.maxHull,
      stats: st,

      // 空翻、滑翔与特技状态
      airTime: 0,
      airSpin: 0,
      flipsInJump: 0,
      trickCombo: 0,
      comboTimer: 0,
      feverTimer: 0,
      trickAura: 0,
      hurtFlash: 0,
      crashRecover: 0,
      carving: false,

      grindingRail: null,
      grindGrace: 0,
      grindDistM: 0,
      runFlips: 0,
      runSmoothLands: 0,
      runVinesSliced: 0,
      runWhalesBounced: 0,
      runFevers: 0,
      runBreaches: 0,
      hasCarved: false,
      hasBoosted: false,
      hasDived: false,
      isDiving: false,
      inAbyss: false,
      inCave: false,
      activeCaveName: '',
      canopyOpen: 0,
      subMorph: 0,
      morphFoam: 0,
      wasSubMorphed: false,
      propAngle: 0,
      propSpinRate: 0,
      spotlightStrength: 0,
      abyssDashTimer: 0,
      abyssDashCd: 0,
      wasAbyssBoost: false,
      diveCharge: 0,
      submergeDepth: 0,
      breath: 1.0,
      breathLowPulse: 0,
      breachSmashTimer: 0,
      cloudGliding: false,
      cloudGlideFade: 0,
      ridingDeck: false,
      deckGrace: 0,
      runBellsRung: 0,
      runRelicsFound: 0,
      kelpGlowTimer: 0,
      mantaSlipTimer: 0,
      runDebrisSmashed: 0,
      runCloudRings: 0,
      runSchoolsPassed: 0,
      runMantaGlides: 0,
      runAnglersBanished: 0,
      runBasaltHops: 0,
      runBraziersLit: 0,
      runGeysersRidden: 0,
      gliderOpen: 0,         // 风铃滑翔翼动态展开度 (0..1)
      sailOpen: 0,           // 高空风帆流动态展开度 (0..1)
      mantaWingOpen: 0,      // 高空风帆流深海第二形态「蝠鲼流体滑翔翼」展开度 (0..1)
      finDeploy: 0,          // 深潜鱼鳍流动态展开度 (0..1)
      cloudJumpReady: false, // 高空风帆 Lv.3 踏云二段跳充能就绪
      prowFlash: 0,          // 破藤船首劈斩流光
      // 各纪元模块按当前地貌平滑自动展开/收纳 (0=收纳, 1=展开)，水上永远是清爽木舟！
      deploy: {
        heat: 0,
        quilt: 0,
        springs: 0,
        prow: 0
      },

      // 弹簧抗震压缩形变与硬地刚体接触状态
      springCompress: 0,
      springVel: 0,
      bumpCooldown: 0,
      onSolidGround: false,
      groundY: startY,

      // 六大纪元环境状态
      inFireSea: false,
      inIceWinter: false,
      inWasteland: false,
      inMeadow: false,
      inForest: false,
      reachedEras: reachedMap,
      heatStress: 0,
      coldStress: 0,
      frostChill: 0,
      roughStress: 0,
      vineStress: 0,
      warned: { heat: false, cold: false, rough: false, vine: false },

      // 多节流苏围巾
      scarf: [],
      scarfPhase: 0,

      // 本趟统计
      startX: sx,
      runStars: 0,
      runTricks: 0,
      distanceM: 0
    };
    for (var i = 0; i < 6; i++) {
      boat.scarf.push({ x: sx - 10 - i * 6, y: startY - 26 });
    }
    return boat;
  }

  function updateScarf(dt) {
    var fDir = (typeof boat.facingSmooth === 'number' && Math.abs(boat.facingSmooth) > 0.15) ? (boat.facingSmooth >= 0 ? 1 : -1) : 1;
    var pAng = (window.MT.Config && window.MT.Config.EXPLORE_MODE) ? (boat.localPitch || 0) : boat.angle;
    var cosA = Math.cos(pAng);
    var sinA = Math.sin(pAng);
    var anchorX = boat.x + fDir * (cosA * (-4) - sinA * (-25));
    var anchorY = boat.y + (sinA * (-4) + cosA * (-25));
    boat.scarf[0].x = anchorX;
    boat.scarf[0].y = anchorY;

    var segLen = 5.4;
    var windX = (window.MT.Config && window.MT.Config.EXPLORE_MODE)
      ? (-boat.vx * 0.55 - fDir * 44)
      : (-Math.max(95, boat.vx * 0.72));
    for (var i = 1; i < boat.scarf.length; i++) {
      var prev = boat.scarf[i - 1];
      var cur = boat.scarf[i];
      cur.x += windX * dt * 0.65;
      cur.y += (Math.sin(boat.scarfPhase - i * 0.85) * 42 - boat.vy * 0.14) * dt;
      var dx = cur.x - prev.x;
      var dy = cur.y - prev.y;
      var d = Math.hypot(dx, dy) || 1;
      cur.x = prev.x + (dx / d) * segLen;
      cur.y = prev.y + (dy / d) * segLen;
    }
  }

  function update(dt, input, onRunEvent) {
    var cfg = window.MT.Config.SURF;
    var eco = window.MT.Config.ECONOMY;
    var eras = window.MT.Eras;
    var st = boat.stats;
    var t = eras.getTime();
    var eb = eras.getEraBlend(boat.x);

    boat.inFireSea = eb.fireMix > 0.45;
    boat.inIceWinter = eb.iceMix > 0.45;
    boat.inWasteland = eb.wasteMix > 0.45;
    boat.inMeadow = eb.meadowMix > 0.45;
    boat.inForest = eb.forestMix > 0.45;
    boat.reachedEras[eb.era.id] = true;

    var splashCol = boat.inForest
      ? '#a8f0bc'
      : (boat.inMeadow ? '#c8f0b8' : (boat.inWasteland ? '#d8ad84' : (boat.inIceWinter ? '#dff6ff' : (boat.inFireSea ? '#ffb870' : '#e8f4ff'))));

    boat.scarfPhase += dt * (5.2 + boat.vx * 0.015);
    if (boat.trickAura > 0) boat.trickAura = Math.max(0, boat.trickAura - dt * 1.4);
    if (boat.hurtFlash > 0) boat.hurtFlash = Math.max(0, boat.hurtFlash - dt * 2.2);
    if (boat.prowFlash > 0) boat.prowFlash = Math.max(0, boat.prowFlash - dt * 2.4);
    if (boat.crashRecover > 0) boat.crashRecover = Math.max(0, boat.crashRecover - dt);
    if (boat.bumpCooldown > 0) boat.bumpCooldown = Math.max(0, boat.bumpCooldown - dt);
    if (boat.grindGrace > 0) boat.grindGrace = Math.max(0, boat.grindGrace - dt);
    if (boat.deckGrace > 0) boat.deckGrace = Math.max(0, boat.deckGrace - dt);
    if (boat.breachSmashTimer > 0) boat.breachSmashTimer = Math.max(0, boat.breachSmashTimer - dt);
    if (boat.breathLowPulse > 0) boat.breathLowPulse = Math.max(0, boat.breathLowPulse - dt * 2.2);
    if (boat.cloudGliding) {
      boat.cloudGlideFade = Math.min(1, boat.cloudGlideFade + dt * 5.0);
    } else {
      boat.cloudGlideFade = Math.max(0, boat.cloudGlideFade - dt * 2.8);
    }
    // 离开深海后快速舒缓回复气息（落月深海避难段不可自然回气，必须找气室/气柱！）
    if (!boat.isDiving && !boat.inAbyss && boat.breath < 1.0) {
      boat.breath = Math.min(1.0, boat.breath + 0.85 * dt);
    }
    if (boat.feverTimer > 0) {
      boat.feverTimer = Math.max(0, boat.feverTimer - dt);
      boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.14 * dt);
      if (Math.random() < dt * 22) {
        eras.emitSpark(
          boat.x - 14 + (Math.random() - 0.5) * 18,
          boat.y - 6 + (Math.random() - 0.5) * 16,
          -boat.vx * 0.22,
          (Math.random() - 0.5) * 32,
          Math.random() < 0.55 ? '#ffe89c' : '#b8f2ff',
          2.6 + Math.random() * 1.8,
          0.46
        );
      }
    }
    if (boat.comboTimer > 0) {
      boat.comboTimer -= dt;
      if (boat.comboTimer <= 0 && boat.feverTimer <= 0) boat.trickCombo = 0;
    }

    function addComboAndCheckFever(amount, refreshTime) {
      var prevFever = boat.feverTimer > 0;
      boat.trickCombo = Math.min(6, boat.trickCombo + amount);
      boat.comboTimer = Math.max(boat.comboTimer, refreshTime || 6.5);
      if (boat.trickCombo >= 3) {
        boat.feverTimer = Math.min(9.5, Math.max(boat.feverTimer + 2.4, 7.5));
        if (!prevFever) {
          boat.runFevers += 1;
          boat.trickAura = 1.0;
          window.MT.Audio.playFeverIgnite();
          eras.emitRing(boat.x, boat.y - 10, '#ffe89e');
          eras.emitRing(boat.x, boat.y - 10, '#b8f2ff');
          eras.addPopup(boat.x, boat.y - 62, '✦ 流光狂热！星辉护体', '#fff0a8');
          if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
            window.MT.RenderWorld.triggerImpact(0.038, 0.055, 5.5);
          }
        }
      }
    }

    var springRest = boat.inWater ? 0.18 : 0.0;
    boat.springVel += ((springRest - boat.springCompress) * 62 - boat.springVel * 9.5) * dt;
    boat.springCompress = Math.max(0, Math.min(1.0, boat.springCompress + boat.springVel * dt));

    var waveY = eras.getSurfaceY(boat.x, t);
    var slope = eras.getSurfaceSlope(boat.x, t);
    var slopeAngle = Math.atan(slope);

    // 故事模式终章《翡翠海岸 · 新生世界树》静谧自动泊舟演出
    if (eras.isFinaleActive && eras.isFinaleActive()) {
      boat.inFireSea = false;
      boat.inIceWinter = false;
      boat.inWasteland = false;
      boat.inMeadow = false;
      boat.inForest = false;
      boat.heatStress = 0;
      boat.coldStress = 0;
      boat.frostChill = 0;
      boat.roughStress = 0;
      boat.vineStress = 0;
      boat.boosting = false;
      boat.carving = false;
      boat.onSolidGround = false;
      boat.inWater = boat.y >= waveY - 8;
      boat.grindingRail = null;
      boat.isDiving = false;
      boat.inAbyss = false;
      boat.inCave = false;
      boat.activeCaveName = '';
      boat.canopyOpen = 0;
      boat.subMorph = 0;
      boat.morphFoam = 0;
      boat.wasSubMorphed = false;
      boat.spotlightStrength = 0;
      boat.ridingDeck = false;
      boat.cloudGliding = false;
      boat.diveCharge = 0;
      boat.submergeDepth = 0;
      boat.breath = 1.0;
      boat.breachSmashTimer = 0;
      boat.feverTimer = 0;
      window.MT.Audio.setBoosting(false, 0);
      window.MT.Audio.setIceScrape(0, false);
      window.MT.Audio.setGrinding(false, null, 0);

      // 收起全部纪元武装，回归最初那叶干净纯粹的手绘木舟
      var calmDep = Math.min(1, dt * 2.5);
      boat.deploy.heat *= (1 - calmDep);
      boat.deploy.quilt *= (1 - calmDep);
      boat.deploy.springs *= (1 - calmDep);
      boat.deploy.prow *= (1 - calmDep);
      boat.gliderOpen *= (1 - calmDep);

      var moorX = eras.getFinaleX() - 40;
      var targetVx = Math.max(0, Math.min(130, (moorX - boat.x) * 0.55));
      boat.vx += (targetVx - boat.vx) * Math.min(1, dt * 2.0);
      boat.x += boat.vx * dt;

      var curWave = eras.getSurfaceY(boat.x, t);
      if (boat.y < curWave - 6) {
        boat.vy += cfg.GRAVITY * 0.45 * dt;
        boat.y += boat.vy * dt;
      } else {
        boat.y += (curWave - boat.y) * Math.min(1, dt * 4.5);
        boat.vy = 0;
      }
      var calmAng = Math.atan(eras.getSurfaceSlope(boat.x, t)) * 0.7;
      boat.angle += normalizeAngle(calmAng - boat.angle) * Math.min(1, dt * 4.0);
      boat.distanceM = Math.max(0, Math.floor((boat.x - 120) / eco.DIST_DIVISOR));
      updateScarf(dt);
      return;
    }

    var isSolidSurface = (eb.solidMix || 0) >= 0.45;
    boat.onSolidGround = isSolidSurface;
    boat.groundY = waveY;

    var prevInWater = boat.inWater;
    boat.inWater = boat.isDiving || ((!boat.grindingRail && !boat.ridingDeck) && (isSolidSurface ? (boat.y >= waveY - 3) : (boat.y >= waveY - 8)));

    // 各纪元模块按当前地貌自动展开/收纳（水里收起弹簧和棉被，陆地放下弹簧，火海展黑曜壳，冰原披棉被，林海展破藤刃！）
    var targetGlider = (st.gliderLv >= 1 && !boat.inWater) ? 1.0 : 0.0;
    boat.gliderOpen += (targetGlider - boat.gliderOpen) * Math.min(1, dt * 6.5);

    var targetSail = (st.skySailLv >= 1 && !boat.inWater && !boat.isDiving && !boat.inAbyss && !boat.ridingDeck) ? 1.0 : 0.0;
    boat.sailOpen += (targetSail - boat.sailOpen) * Math.min(1, dt * 7.2);

    var targetMantaWing = (st.skySailLv >= 1 && boat.inAbyss) ? 1.0 : 0.0;
    boat.mantaWingOpen = (boat.mantaWingOpen || 0) + (targetMantaWing - (boat.mantaWingOpen || 0)) * Math.min(1, dt * 5.8);

    var targetFin = (st.deepFinsLv >= 1 && (boat.isDiving || boat.inAbyss || boat.inWater || boat.breachSmashTimer > 0)) ? 1.0 : 0.0;
    boat.finDeploy += (targetFin - boat.finDeploy) * Math.min(1, dt * 7.5);

    var wantSubStd = (boat.isDiving || boat.inAbyss) ? 1.0 : 0.0;
    boat.subMorph = (boat.subMorph || 0) + (wantSubStd - (boat.subMorph || 0)) * Math.min(1, dt * 6.8);
    var stdSpd = Math.hypot(boat.vx || 0, boat.vy || 0);
    var stdTargetSpin = stdSpd > 14 ? Math.min(34, stdSpd * 0.11 + (boat.boosting ? 14 : 0)) : 0;
    boat.propSpinRate = (boat.propSpinRate || 0) + (stdTargetSpin - (boat.propSpinRate || 0)) * Math.min(1, dt * 7.5);
    boat.propAngle = (boat.propAngle || 0) + dt * boat.propSpinRate;

    // 触水、踏桥或进入云带时刷新高空风帆 Lv.3 踏云二段跳！
    if (st.cloudDoubleJump && (boat.inWater || boat.ridingDeck || boat.grindingRail || boat.cloudGliding)) {
      boat.cloudJumpReady = true;
    }

    var wantHeat    = (st.heatShieldLv >= 1 && eb.fireMix > 0.18) ? 1.0 : 0.0;
    var wantQuilt   = (st.quiltLv >= 1 && eb.iceMix > 0.18) ? 1.0 : 0.0;
    var wantSprings = (st.springsLv >= 1 && (eb.wasteMix + eb.meadowMix * 0.6 + eb.forestMix * 0.4) > 0.22) ? 1.0 : 0.0;
    var wantProw    = (st.prowLv >= 1 && eb.forestMix > 0.18) ? 1.0 : 0.0;
    var depSpeed = Math.min(1, dt * 4.5);
    boat.deploy.heat    += (wantHeat - boat.deploy.heat) * depSpeed;
    boat.deploy.quilt   += (wantQuilt - boat.deploy.quilt) * depSpeed;
    boat.deploy.springs += (wantSprings - boat.deploy.springs) * depSpeed;
    boat.deploy.prow    += (wantProw - boat.deploy.prow) * depSpeed;

    // === v11 开放海域自由探索：彻底解除强制右移与跑酷物理，交由海洋插件执行全向自由探索物理！===
    if (window.MT.Config && window.MT.Config.EXPLORE_MODE && window.MT.LevelEngine && window.MT.LevelEngine.handleSurfacePhysics) {
      var targetMantaWingE = (st.skySailLv >= 1 && (boat.isDiving || boat.inAbyss)) ? 1.0 : 0.0;
      boat.mantaWingOpen = (boat.mantaWingOpen || 0) + (targetMantaWingE - (boat.mantaWingOpen || 0)) * Math.min(1, dt * 5.8);
      var targetSailE = (st.skySailLv >= 1 && !boat.inWater && !boat.isDiving && !boat.ridingDeck) ? 1.0 : 0.0;
      boat.sailOpen += (targetSailE - boat.sailOpen) * Math.min(1, dt * 7.2);
      var targetFinE = (st.deepFinsLv >= 1 && (boat.isDiving || boat.inWater || boat.breachSmashTimer > 0)) ? 1.0 : 0.0;
      boat.finDeploy += (targetFinE - boat.finDeploy) * Math.min(1, dt * 7.5);

      // 潜入水下随深度平滑变形为可爱小潜艇，并伴随柔美海沫气泡遮罩，彻底消除生硬跳切！
      var depthNowM = Math.max(0, boat.y - waveY);
      var wantSub;
      if (boat.isDiving || boat.inAbyss) {
        // 下潜过程中按真实入水深度平滑拉满至 1.0（绝不在海面突兀瞬间替换！）
        wantSub = Math.max(0.0, Math.min(1.0, (depthNowM - 4) / 34));
        if (depthNowM > 28) wantSub = 1.0;
      } else {
        wantSub = 0.0;
      }
      var prevMorphVal = boat.subMorph || 0;
      var morphSpeed = wantSub > prevMorphVal ? 5.2 : 4.6;
      boat.subMorph = prevMorphVal + (wantSub - prevMorphVal) * Math.min(1, dt * morphSpeed);
      if (Math.abs(wantSub - boat.subMorph) < 0.008) boat.subMorph = wantSub;

      // 当跨越 0.48 形态交界点时，绽放一团轻柔海沫气泡环包裹船身自然完成变身！
      var prevSub = !!boat.wasSubMorphed;
      var nowSub = boat.subMorph >= 0.48;
      if (nowSub !== prevSub) {
        boat.wasSubMorphed = nowSub;
        boat.morphFoam = 1.0;
        if (window.MT.Audio && window.MT.Audio.playSubMorph) window.MT.Audio.playSubMorph(nowSub);
        if (eras && eras.emitSplash) {
          eras.emitSplash(boat.x, Math.max(waveY, boat.y), 12, '#dff6ff', 36);
        }
      }
      if ((boat.morphFoam || 0) > 0) {
        boat.morphFoam = Math.max(0, boat.morphFoam - dt * 2.15);
      }
      var subSpd = Math.hypot(boat.vx || 0, boat.vy || 0);
      var moveInput = !!(input.left || input.right || input.up || input.down || input.boost ||
        (typeof input.joyX === 'number' && Math.hypot(input.joyX, input.joyY || 0) > 0.1));
      var dashNow = (boat.abyssDashTimer || 0) > 0.02;
      var targetSpin = (subSpd > 12 || moveInput || dashNow)
        ? Math.min(36, Math.max(moveInput ? 9.5 : 0, subSpd * 0.115) + (boat.boosting ? 12 : 0) + (dashNow ? 18 : 0))
        : 0;
      var spinEase = targetSpin > (boat.propSpinRate || 0) ? 10.5 : 4.2;
      boat.propSpinRate = (boat.propSpinRate || 0) + (targetSpin - (boat.propSpinRate || 0)) * Math.min(1, dt * spinEase);
      if (boat.propSpinRate < 0.08 && targetSpin === 0) boat.propSpinRate = 0;
      boat.propAngle = (boat.propAngle || 0) + dt * boat.propSpinRate;

      window.MT.LevelEngine.handleSurfacePhysics({
        dt: dt, boat: boat, input: input, eb: eb, eras: eras,
        cfg: cfg, eco: eco, st: st, waveY: waveY, slope: slope, slopeAngle: slopeAngle,
        wantBoost: !!(input.boost && boat.hull > 0), reverseThrusting: false,
        normalizeAngle: normalizeAngle,
        addComboAndCheckFever: addComboAndCheckFever
      });

      boat.x += boat.vx * dt;
      boat.y += boat.vy * dt;

      var wc = window.MT.Config.WORLD_CYCLE || { MIN_X: 160, MAX_X: 9840 };
      // 真实弹性远洋回流洋流（进入边界缓冲带即产生渐强向内推力，像真实水流托回而非硬撞隐形空气墙！）
      if (boat.x < wc.MIN_X + 95) {
        var wPush = (wc.MIN_X + 95 - boat.x) / 95;
        boat.vx += (520 * wPush * wPush) * dt;
      } else if (boat.x > wc.MAX_X - 110) {
        var ePush = (boat.x - (wc.MAX_X - 110)) / 110;
        boat.vx -= (520 * ePush * ePush) * dt;
      }
      if (boat.x < wc.MIN_X) {
        boat.x = wc.MIN_X;
        if (boat.vx < 0) boat.vx = 42;
      } else if (boat.x > wc.MAX_X) {
        boat.x = wc.MAX_X;
        if (boat.vx > 0) boat.vx = -42;
      }

      if (window.MT.LevelEngine.handleChunkInteractions) {
        window.MT.LevelEngine.handleChunkInteractions({
          dt: dt, boat: boat, input: input, eb: eb, eras: eras,
          cfg: cfg, eco: eco, st: st, waveY: waveY, slope: slope, slopeAngle: slopeAngle,
          wantBoost: !!input.boost, boostJustStarted: false,
          normalizeAngle: normalizeAngle,
          addComboAndCheckFever: addComboAndCheckFever
        });
      }

      updateScarf(dt);
      if (boat.hull <= 0 && typeof onRunEvent === 'function') {
        onRunEvent('hull_broken');
      }
      return;
    }

    // 1. 落地/着水结算（先委派给当前独立关卡插件，如月潮之海支持持 D 俯冲潜海！）
    var landingHandledByLevel = false;
    if (!prevInWater && boat.inWater && window.MT.LevelEngine && window.MT.LevelEngine.handleLanding) {
      landingHandledByLevel = window.MT.LevelEngine.handleLanding({
        dt: dt, boat: boat, input: input, eb: eb, eras: eras,
        cfg: cfg, eco: eco, st: st, waveY: waveY, slope: slope, slopeAngle: slopeAngle,
        normalizeAngle: normalizeAngle,
        addComboAndCheckFever: addComboAndCheckFever
      });
    }

    if (!prevInWater && boat.inWater && !landingHandledByLevel) {
      var relAngle = Math.abs(normalizeAngle(boat.angle - slopeAngle));
      var bigJump = boat.airTime > 0.42;

      if (st.springsLv >= 1) {
        boat.springCompress = Math.min(1.0, 0.45 + Math.min(0.55, Math.max(0, boat.vy) / 380));
        boat.springVel = 2.8;
      }

      if (relAngle > cfg.CRASH_ANGLE && boat.crashRecover <= 0 && boat.feverTimer <= 0) {
        var crashScale = st.crashDamageMult * (boat.inWasteland ? (1 - st.bumpResist * 0.55) : 1);
        var dmg = Math.max(5, Math.round(cfg.CRASH_DAMAGE * crashScale));
        boat.hull = Math.max(0, boat.hull - dmg);
        boat.hurtFlash = 1.0;
        boat.crashRecover = 0.9;
        boat.vx = Math.max(cfg.MIN_CRUISE_SPEED * 0.72, boat.vx * 0.48);
        boat.vy = -85;
        boat.angle = slopeAngle;
        boat.angularVel = 0;
        boat.trickCombo = 0;

        window.MT.Audio.playSplash(1.35);
        eras.emitSplash(boat.x, waveY, 22, splashCol, 48);
        eras.addPopup(boat.x, waveY - 46, '船体磕碰 -' + dmg, '#ff9c86');
        if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) window.MT.RenderWorld.triggerImpact(0.032, 0.03, 8.5);
      } else if (boat.flipsInJump > 0) {
        var flipBonus = Math.round(eco.FLIP_STAR_BONUS * boat.flipsInJump * Math.max(1, boat.trickCombo + 1) * st.starMult);
        boat.runTricks += boat.flipsInJump;
        boat.runFlips += boat.flipsInJump;
        boat.runStars += flipBonus;
        boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + cfg.FLIP_FUEL_REWARD * boat.flipsInJump);
        boat.vx = Math.min(st.maxSpeed + 90, boat.vx + cfg.TRICK_SPEED_SURGE + boat.flipsInJump * 35);
        boat.trickAura = 1.0;
        boat.angle = slopeAngle;
        boat.angularVel = 0;

        if ((st.springsLv >= 3 && boat.inWasteland) || boat.inForest) {
          boat.vy = Math.min(boat.vy, -(boat.inForest ? 120 : st.springBounceBonus));
        }

        window.MT.Audio.playMountChord('thruster', true);
        window.MT.Audio.playSplash(0.65);
        eras.emitSplash(boat.x, waveY, 16, '#ffe8ba', 38);
        eras.emitRing(boat.x, waveY, '#ffe29c');
        var label = (boat.flipsInJump > 1 ? (boat.flipsInJump + '连空翻!') : '完美空翻!') + ' +' + flipBonus + '✦';
        eras.addPopup(boat.x, waveY - 52, label, '#ffe8a4');
        if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
          window.MT.RenderWorld.triggerImpact(0.032, 0.045, 4.6);
        }
        addComboAndCheckFever(boat.flipsInJump, 6.8);
      } else if (bigJump && relAngle <= cfg.PERFECT_LAND_ANGLE) {
        var landStar = Math.round(eco.SMOOTH_LAND_STAR * st.starMult);
        boat.runTricks += 1;
        boat.runSmoothLands += 1;
        boat.runStars += landStar;
        boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + cfg.SMOOTH_LAND_FUEL);
        boat.vx = Math.min(st.maxSpeed + 60, boat.vx + 72);
        boat.trickAura = 0.72;

        if (st.springsLv >= 2 && (boat.inWasteland || boat.vy > 190)) {
          var sStar = Math.round(eco.SPRING_BOUNCE_STAR * st.starMult);
          boat.runStars += sStar;
          boat.vy = -st.springBounceBonus;
          window.MT.Audio.playSpringBounce();
          eras.emitRing(boat.x, waveY, '#ffd88a');
          eras.addPopup(boat.x, waveY - 46, '弹簧回跃 +' + (landStar + sStar) + '✦', '#ffe49e');
          if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) window.MT.RenderWorld.triggerImpact(0.024, 0.035, 3.8);
        } else if (boat.inForest) {
          boat.vy = -95;
          eras.addPopup(boat.x, waveY - 42, '巨根弹跃 +' + landStar + '✦', '#c4f8ce');
        } else {
          eras.addPopup(boat.x, waveY - 42, '顺坡切入 +' + landStar + '✦', '#c6f0ff');
        }
        window.MT.Audio.playSteamRefill(0.6);
        window.MT.Audio.playSplash(0.45);
        eras.emitSplash(boat.x, waveY, 11, splashCol, 24);
        addComboAndCheckFever(1, 5.8);
      } else if (boat.vy > 90) {
        if (boat.inWasteland && st.springsLv === 0 && boat.vy > 180) {
          var joltDmg = Math.max(4, Math.round(9 * st.crashDamageMult));
          boat.hull = Math.max(0, boat.hull - joltDmg);
          boat.hurtFlash = 0.65;
          boat.vx *= 0.72;
          eras.addPopup(boat.x, waveY - 40, '硬地震伤 -' + joltDmg, '#e8aa76');
        }
        if (boat.inIceWinter) {
          window.MT.Audio.playIceLand(Math.min(1.1, boat.vy / 240));
          eras.emitSplash(boat.x - 10, waveY, 12, '#eefaff', 30);
        } else {
          window.MT.Audio.playSplash(Math.min(1.1, boat.vy / 260));
          eras.emitSplash(boat.x, waveY, 10, splashCol, 22);
        }
      }

      boat.airTime = 0;
      boat.airSpin = 0;
      boat.flipsInJump = 0;
    }

    // 2. 纪元 II 火海高温（踏在冷却玄武岩浮板/黑曜岩拱道、流光狂热态或过关演出期间免受岩浆灼烧！）
    var stageClearing = window.MT.LevelEngine && window.MT.LevelEngine.isStageClearing && window.MT.LevelEngine.isStageClearing();
    var effHeatDps = (boat.feverTimer > 0 || stageClearing || boat.ridingDeck) ? 0 : (eb.heatDps * (1 - st.heatResist));
    var surfMult = boat.inWater ? 1.0 : 0.44;
    if (effHeatDps > 0.25) {
      boat.hull = Math.max(0, boat.hull - effHeatDps * surfMult * dt);
      var tHeat = Math.min(1, (effHeatDps / 11.5) * (0.65 + 0.35 * surfMult));
      boat.heatStress += (tHeat - boat.heatStress) * Math.min(1, dt * 4.0);
      if (Math.random() < dt * 10 * boat.heatStress) {
        eras.emitSpark(boat.x + (Math.random() - 0.5) * 44, boat.y + 4, (Math.random() - 0.5) * 35, -35 - Math.random() * 45, Math.random() < 0.5 ? '#ff7c50' : '#ffcf78', 2.4, 0.55);
      }
      if (!boat.warned.heat && st.heatShieldLv === 0) {
        boat.warned.heat = true;
        if (window.MT.Shop) window.MT.Shop.unlockEra('fire_sea');
        eras.addPopup(boat.x + 20, boat.y - 58, '✦ 船底受灼 · 构思图纸：黑曜石隔热壳', '#ffba82');
      }
    } else {
      boat.heatStress *= Math.pow(0.08, dt);
      if (boat.inFireSea && boat.inWater) {
        if (st.fireFuelRegen > 0) boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + st.fireFuelRegen * dt);
        if (st.fireHullRegen > 0 && boat.hull < boat.maxHull) boat.hull = Math.min(boat.maxHull, boat.hull + st.fireHullRegen * dt);
      }
    }

    // 3. 纪元 III 尘冬冰原极寒（流光狂热态下星辉护体免伤！）
    var effColdDps = (boat.feverTimer > 0) ? 0 : (eb.coldDps * (1 - st.coldResist));
    if (effColdDps > 0.25) {
      boat.hull = Math.max(0, boat.hull - effColdDps * dt);
      var tCold = Math.min(1, effColdDps / 12.2);
      boat.coldStress += (tCold - boat.coldStress) * Math.min(1, dt * 4.0);
      if (Math.random() < dt * 9 * boat.coldStress) {
        eras.emitSpark(boat.x + (Math.random() - 0.5) * 46, boat.y - 10, -25, -18 - Math.random() * 24, '#cceeff', 2.2, 0.65);
      }
      if (!boat.warned.cold && st.quiltLv === 0) {
        boat.warned.cold = true;
        if (window.MT.Shop) window.MT.Shop.unlockEra('ice_winter');
        eras.addPopup(boat.x + 20, boat.y - 58, '✦ 寒霜刺骨 · 构思图纸：补丁厚棉被', '#b2e6ff');
      }
    } else {
      boat.coldStress *= Math.pow(0.08, dt);
      if (boat.inIceWinter) {
        if (st.iceFuelRegen > 0) boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + st.iceFuelRegen * dt);
        if (st.iceHullRegen > 0 && boat.hull < boat.maxHull) boat.hull = Math.min(boat.maxHull, boat.hull + st.iceHullRegen * dt);
        if (st.quiltLv >= 2 && Math.random() < dt * 6) {
          eras.emitSpark(boat.x + 24, boat.y - 18, -18, -32 - Math.random() * 18, '#fff2dc', 3.0, 0.65);
        }
      }
    }

    // 4. 纪元 IV 融冰荒土颠簸（滑轨上或流光狂热态免受荒土颠簸！）
    if (eb.bumpRisk > 0.25 && boat.inWater && !boat.grindingRail && boat.feverTimer <= 0) {
      var bumpCurv = eras.getSurfaceRoughnessBump(boat.x, t);
      var speedScale = Math.max(0.5, boat.vx / 240);
      if (bumpCurv > 3.6 && boat.bumpCooldown <= 0) {
        boat.bumpCooldown = 0.55;
        if (st.springsLv >= 1) {
          boat.springCompress = Math.min(1.0, boat.springCompress + 0.55);
          boat.springVel = 3.2;
          var residualDmg = Math.round(7.5 * (1 - st.bumpResist) * st.crashDamageMult);
          if (residualDmg > 0) {
            boat.hull = Math.max(0, boat.hull - residualDmg);
            boat.roughStress = Math.min(1, boat.roughStress + 0.35);
          }
          if (st.springsLv >= 2 && bumpCurv > 5.0) {
            boat.vy = Math.min(boat.vy, -st.springBounceBonus * 0.85);
            boat.vx = Math.min(st.maxSpeed, boat.vx + 36);
            window.MT.Audio.playSpringBounce();
            eras.emitSplash(boat.x, waveY, 7, '#d8b084', 24);
          }
        } else {
          var bDmg = Math.max(4, Math.round((6.5 + bumpCurv * 0.85) * speedScale * st.crashDamageMult));
          boat.hull = Math.max(0, boat.hull - bDmg);
          boat.hurtFlash = 0.72;
          boat.roughStress = 1.0;
          boat.vx = Math.max(95, boat.vx * 0.76);
          boat.vy = Math.min(boat.vy, -48);
          boat.angularVel += (Math.random() - 0.5) * 2.6;
          window.MT.Audio.playSplash(0.55);
          if (window.MT.RenderWorld && window.MT.RenderWorld.addShake) window.MT.RenderWorld.addShake(4.8);
          eras.emitSplash(boat.x, waveY, 8, '#c69972', 20);
          if (!boat.warned.rough) {
            boat.warned.rough = true;
            if (window.MT.Shop) window.MT.Shop.unlockEra('thawed_wasteland');
            eras.addPopup(boat.x + 20, boat.y - 58, '✦ 乱石颠簸 · 构思图纸：黄铜弹簧滑橇', '#f6ca94');
          }
        }
      }
      if (Math.random() < dt * 12) {
        eras.emitSpark(boat.x - 24, waveY + 2, -boat.vx * 0.25, -18 - Math.random() * 24, '#d9b28a', 2.8, 0.55);
      }
    }
    boat.roughStress *= Math.pow(0.18, dt);
    boat.vineStress *= Math.pow(0.16, dt);

    // 5. 纪元 V 萌芽青野：治愈细雨轻回耐久 + 蒲公英上升风口！
    if (boat.inMeadow && boat.hull < boat.maxHull) {
      boat.hull = Math.min(boat.maxHull, boat.hull + 1.4 * dt);
    }
    var gusts = eras.getDandelionGusts();
    for (var gi = 0; gi < gusts.length; gi++) {
      var gu = gusts[gi];
      var gSurf = eras.getSurfaceY(gu.x, t);
      if (Math.abs(boat.x - gu.x) < gu.radius && boat.y > gSurf - gu.height && boat.y < gSurf + 30) {
        var liftPow = 470 * st.updraftMult;
        boat.vy = Math.max(-330, boat.vy - liftPow * dt);
        boat.vx = Math.min(st.maxSpeed, boat.vx + (85 + st.gliderLv * 30) * dt);
        boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.65 * dt);
        if (!gu.boosted) {
          gu.boosted = true;
          boat.trickAura = 0.72;
          window.MT.Audio.playUpdraft();
          eras.emitRing(gu.x, boat.y, '#e2fbd4');
          eras.addPopup(gu.x, boat.y - 36, st.gliderLv >= 1 ? '风铃御风飞升!' : '蒲公英上升气流', '#e4fce0');
        }
      }
    }

    // 6. 纪元 VI 巨木林海：翡翠孢子云流 & 荆棘巨藤帘劈斩！
    var spores = eras.getSporeCurrents();
    for (var spi = 0; spi < spores.length; spi++) {
      var spc = spores[spi];
      var sdx = (boat.x - spc.x) / (spc.rx + 20);
      var sdy = (boat.y - spc.y) / (spc.ry + 20);
      if (sdx * sdx + sdy * sdy <= 1.0) {
        boat.vy += (-360 * st.updraftMult * 0.65 - boat.vy * 2.2) * dt;
        boat.vx = Math.min(st.maxSpeed + 40, boat.vx + 135 * dt);
        boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.9 * dt);
        if (!spc.boosted) {
          spc.boosted = true;
          boat.trickAura = 0.85;
          window.MT.Audio.playHookCatch();
          eras.emitRing(spc.x, spc.y, '#a8f8cb');
          eras.addPopup(spc.x, spc.y - 36, '翡翠孢子云流!', '#c4fce0');
        }
      }
    }

    var vines = eras.getVineCurtains();
    for (var vi = 0; vi < vines.length; vi++) {
      var vn = vines[vi];
      if (vn.sliced) continue;
      var vSurf = eras.getSurfaceY(vn.x, t);
      // 巨藤帘从高空垂落到距地面 20px 处，若高度落在藤帘范围内则碰撞
      if (Math.abs(boat.x - vn.x) < vn.width + 18 && boat.y > vSurf - 210 && boat.y < vSurf + 24) {
        if (st.prowLv >= 1 || boat.feverTimer > 0) {
          // 破藤鎏金船首直接劈碎巨藤帘！
          vn.sliced = true;
          vn.sliceFlash = 1.0;
          boat.prowFlash = 1.0;
          boat.trickAura = 0.88;
          if (st.vineDamageMult > 0) {
            var vResDmg = Math.round(16 * st.vineDamageMult * st.crashDamageMult);
            boat.hull = Math.max(0, boat.hull - vResDmg);
          }
          if (st.vineSliceHeal > 0) {
            boat.hull = Math.min(boat.maxHull, boat.hull + st.vineSliceHeal);
          }
          boat.vx = Math.min(st.maxSpeed + 45, boat.vx + st.vineSliceBoost);
          boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + st.vineSliceFuel);
          var vStars = Math.round(eco.VINE_SLICE_STAR * Math.max(1, st.prowLv) * st.starMult);
          boat.runStars += vStars;
          boat.runVinesSliced += 1;
          addComboAndCheckFever(1, 6.8);
          window.MT.Audio.playVineSlice();
          if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
            window.MT.RenderWorld.triggerImpact(0.036, 0.048, 5.2);
          }
          eras.emitRing(vn.x, boat.y, '#ffe49e');
          for (var lf = 0; lf < 14; lf++) {
            eras.emitSpark(vn.x, boat.y + (Math.random() - 0.5) * 44, 60 + Math.random() * 140, (Math.random() - 0.5) * 120, lf % 2 === 0 ? '#9ef0b2' : '#ffe496', 3.2, 0.72);
          }
          eras.addPopup(vn.x, boat.y - 46, '鎏金破藤! +' + vStars + '✦', '#ffe8a2');
        } else if (vn.hurtCooldown <= 0) {
          // 未装破藤船首：被荆棘巨藤缠刮重伤减速！
          vn.hurtCooldown = 1.0;
          vn.sliced = true;
          vn.sliceFlash = 0.6;
          var snagDmg = Math.max(10, Math.round(24 * st.crashDamageMult));
          boat.hull = Math.max(0, boat.hull - snagDmg);
          boat.hurtFlash = 1.0;
          boat.vineStress = 1.0;
          boat.vx = Math.max(95, boat.vx * 0.45);
          boat.trickCombo = 0;
          window.MT.Audio.playSplash(1.1);
          if (window.MT.RenderWorld && window.MT.RenderWorld.addShake) window.MT.RenderWorld.addShake(8.0);
          eras.emitSplash(vn.x, boat.y, 14, '#7ac68a', 32);
          if (!boat.warned.vine) {
            boat.warned.vine = true;
            if (window.MT.Shop) window.MT.Shop.unlockEra('giant_forest');
            eras.addPopup(vn.x, boat.y - 58, '✦ 巨藤阻路 · 构思图纸：破藤鎏金船首', '#ffd094');
          } else {
            eras.addPopup(vn.x, boat.y - 46, '巨藤刮伤 -' + snagDmg, '#ffaa78');
          }
        }
      }
    }

    // 7. 船尾推进火箭（真实牛顿矢量推力：严格沿船头朝向 (cosB, sinB) 推进！）
    var rawBoostPress = !!input.boost;
    var rawBoostEdge = rawBoostPress && !boat.wasRawBoost;
    boat.wasRawBoost = rawBoostPress;

    // 高空风帆流 Lv.3「踏云二段跳」：空中按空格/W 即可免费触发（即使燃料耗尽也能救场！）
    if (rawBoostEdge && st.cloudDoubleJump && boat.cloudJumpReady && !boat.inWater && !boat.isDiving && !boat.ridingDeck && !boat.grindingRail && boat.airTime > 0.14) {
      boat.cloudJumpReady = false;
      boat.vy = Math.min(boat.vy, -320);
      boat.vx = Math.min(st.maxSpeed + 150, boat.vx + 76);
      boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.25);
      boat.trickAura = 0.92;
      if (window.MT.Audio && window.MT.Audio.playCloudJump) window.MT.Audio.playCloudJump();
      eras.emitRing(boat.x, boat.y + 8, '#fff2c2');
      eras.emitRing(boat.x, boat.y + 8, '#c8f2ff');
      eras.addPopup(boat.x, boat.y - 46, '✦ 踏云二段跳!', '#fff4c4');
      if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
        window.MT.RenderWorld.triggerImpact(0.020, 0.030, 3.2);
      }
    }

    var wantBoost = !!(input.boost && boat.fuel > 0.015 && boat.hull > 0);
    var boostJustStarted = wantBoost && !boat.wasBoosting;
    boat.wasBoosting = wantBoost;
    boat.boosting = wantBoost;
    window.MT.Audio.setBoosting(wantBoost, boat.fuel);

    var reverseThrusting = false;
    if (wantBoost && !boat.inAbyss) {
      boat.hasBoosted = true;
      boat.fuel = Math.max(0, boat.fuel - cfg.FUEL_BURN_RATE * st.burnRateMult * dt);
      var cosB = Math.cos(boat.angle);
      var sinB = Math.sin(boat.angle);
      reverseThrusting = cosB < -0.15;
      var eraBonus = (boat.inFireSea && st.heatShieldLv >= 3) || (boat.inIceWinter && st.quiltLv >= 2) || boat.inForest ? 1.14 : 1.0;
      var surfThrust = 580 * st.thrustMult * eraBonus;
      var airThrust = 760 * st.thrustMult * eraBonus;
      var liftY = cfg.BOOST_LIFT_Y * st.liftMult;

      // 点火瞬间给一记干脆的初始爆发推力，体感立竿见影！
      if (boostJustStarted) {
        var kick = 58 * st.thrustMult;
        boat.vx += cosB * kick;
        boat.vy += (boat.inWater ? Math.min(-32, sinB * kick) : sinB * kick);
      }

      if (boat.isDiving) {
        // 潜海状态下点火：强力推进并助推上浮破水！
        boat.vx += Math.max(0.25, cosB) * surfThrust * 0.9 * dt;
      } else if (boat.inWater || boat.ridingDeck || boat.grindingRail) {
        // 表面点火：真实沿船头朝向加速（正放猛烈前冲，倒扣则产生真实反向制动！）
        boat.vx += cosB * surfThrust * dt;
        var risingFace = Math.max(0, -slope);
        if (cosB > 0.1) {
          var launchLift = liftY * 0.58 + risingFace * 680 + (risingFace > 0.10 ? cfg.LAUNCH_CREST_BOOST : 0);
          boat.vy -= launchLift * dt;
        }
      } else {
        // 空中点火：100% 真实火箭推力矢量！
        // 抬头向上则冲天、俯冲则猛烈加速砸坡、倒扣船头朝左喷火则真实向左刹车甚至倒飞！
        var altRatio = (boat.y < cfg.SOFT_CEILING && sinB < 0)
          ? Math.max(0.12, 1 - (cfg.SOFT_CEILING - boat.y) / 140)
          : 1.0;
        boat.vx += cosB * airThrust * dt;
        boat.vy += sinB * airThrust * altRatio * dt;
      }

      var sx = boat.x - cosB * 38;
      var sy = boat.y - sinB * 38 - 4;
      for (var fk = 0; fk < 3; fk++) {
        var fCol = st.rocketLv >= 3
          ? (Math.random() < 0.65 ? '#9ce6ff' : '#ffffff')
          : (Math.random() < 0.45 ? '#9ce0ff' : '#ffb872');
        eras.emitSpark(
          sx, sy,
          -cosB * (200 + Math.random() * 140) + boat.vx * 0.15,
          -sinB * (200 + Math.random() * 140) + (Math.random() - 0.5) * 48,
          fCol,
          2.8 + Math.random() * 2.4,
          0.36
        );
      }
    }

    // 8. 表面物理彻底分家：液态柔软浮力 vs 固态（冰原/荒土/青野/林海）零下沉刚体贴面滑行！
    boat.carving = false;
    var iceScrapeRatio = 0;

    var levelHandledSurface = false;
    if ((boat.inWater || boat.isDiving || boat.inAbyss || boat.ridingDeck) && window.MT.LevelEngine && window.MT.LevelEngine.handleSurfacePhysics) {
      levelHandledSurface = window.MT.LevelEngine.handleSurfacePhysics({
        dt: dt, boat: boat, input: input, eb: eb, eras: eras,
        cfg: cfg, eco: eco, st: st, waveY: waveY, slope: slope, slopeAngle: slopeAngle,
        wantBoost: wantBoost, reverseThrusting: reverseThrusting,
        normalizeAngle: normalizeAngle,
        addComboAndCheckFever: addComboAndCheckFever
      });
    }

    if (levelHandledSurface) {
      // 本帧表面/潜海物理已由当前独立关卡插件接管
    } else if (boat.inWater) {
      if (!wantBoost) {
        boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + cfg.WATER_PASSIVE_REFILL * dt);
      }

      if (isSolidSurface) {
        // === 固态刚体贴面模型（绝对零下沉！）===
        var tanLen = Math.hypot(1, slope) || 1;
        var tx = 1 / tanLen;
        var ty = slope / tanLen;

        // 切向重力加速度（冰原下坡极度丝滑爽快！）
        var gravGain = boat.inIceWinter ? 1.48 : (boat.inWasteland ? 0.92 : 1.15);
        boat.vx += (slope * cfg.SLOPE_GRAVITY_FLOW * gravGain) * dt;

        if (input.right && slope > 0.03) {
          boat.carving = true;
          boat.hasCarved = true;
          boat.vx += (cfg.CARVE_DOWN_ACCEL * (boat.inIceWinter ? 1.38 : 1.05) * (0.45 + Math.min(1, slope * 3.5))) * dt;
        } else if (input.left) {
          if (boat.inIceWinter && slope >= -0.06 && boat.vx > 180) {
            // 冰面按左微刹漂移，刮出大量白色冰屑
            boat.vx -= 140 * dt;
            boat.carving = true;
          } else if (slope < -0.08 && boat.vx > 210) {
            // 上坡抬头准备飞离冰坡/土坡
            boat.vy = Math.min(boat.vy, slope * boat.vx - 115);
          }
        }

        var minSolidCruise = cfg.MIN_CRUISE_SPEED + boat.trickCombo * 16 + st.rocketLv * 12 + (boat.inIceWinter ? 42 : 0) + (boat.inForest ? 32 : 0);
        if (!reverseThrusting && boat.vx < minSolidCruise) boat.vx += (boat.inIceWinter ? 210 : 185) * dt;

        // 严格零下沉刚体贴合：主动点火起跳或高速冲出上坡凸峰时立刻利落腾空！
        var tangentVy = boat.vx * slope;
        var launchingUp = wantBoost && !reverseThrusting && (slope < -0.02 || boat.vy < tangentVy - 20);
        if (!launchingUp && boat.vy >= tangentVy - 28) {
          boat.y = waveY;
          boat.vy = tangentVy;
        }

        // 固态坡面角度紧咬地面切线（冰面无棉被时仅轻微侧滑抖动）
        var solidWobble = (boat.inIceWinter && st.quiltLv === 0) ? Math.sin(t * 14) * 0.05 : 0;
        var sDiff = normalizeAngle(slopeAngle + solidWobble - boat.angle);
        boat.angle += sDiff * Math.min(1, dt * 20);
        boat.angularVel = 0;

        // 冰原超低摩擦高惯性 vs 荒土高摩擦（装弹簧解除摩擦拖曳）
        var solidFric = boat.inIceWinter ? (boat.carving ? 0.992 : 0.980) : eb.friction;
        if (eb.wasteMix > 0.1) solidFric = Math.min(0.93, solidFric + st.roughFrictionRelief * eb.wasteMix);
        boat.vx *= Math.pow(solidFric, dt);

        // 冰原专属滑冰反馈：持续刻下冰刃划痕 + 飞溅晶莹冰屑 + 冰刃刮冰声！
        if (boat.inIceWinter) {
          eras.addIceScratch(boat.x - 10, waveY + 1, boat.carving);
          iceScrapeRatio = Math.min(1.15, Math.max(0, (boat.vx - 110) / 360));
          var chipRate = boat.carving ? 44 : (14 + iceScrapeRatio * 20);
          if (Math.random() < dt * chipRate) {
            eras.emitSpark(
              boat.x - 18 + (Math.random() - 0.5) * 14,
              waveY - 1,
              -boat.vx * (0.28 + Math.random() * 0.18),
              -36 - Math.random() * (boat.carving ? 88 : 48),
              Math.random() < 0.65 ? '#f2fcff' : '#bae8ff',
              boat.carving ? (2.2 + Math.random() * 1.6) : (1.5 + Math.random() * 1.3),
              0.38 + Math.random() * 0.22
            );
          }
        } else if (boat.inWasteland && Math.random() < dt * (boat.carving ? 26 : 12)) {
          eras.emitSpark(boat.x - 20, waveY, -boat.vx * 0.25, -24 - Math.random() * 44, '#d8ae82', 2.4 + Math.random() * 1.4, 0.45);
        } else if ((boat.inMeadow || boat.inForest) && boat.carving && Math.random() < dt * 18) {
          eras.emitSpark(boat.x - 18, waveY, -boat.vx * 0.22, -32 - Math.random() * 38, boat.inForest ? '#a8f0bc' : '#c8f0a4', 2.2, 0.48);
        }
      } else {
        // === 液态柔软浮力模型（月潮之海 & 陨落火海）===
        var slopeMult = 1.0;
        boat.vx += slope * cfg.SLOPE_GRAVITY_FLOW * slopeMult * dt;

        if (input.right && slope > 0.04) {
          boat.carving = true;
          boat.hasCarved = true;
          boat.vx += (cfg.CARVE_DOWN_ACCEL * (0.45 + Math.min(1, slope * 3.5))) * dt;
          boat.vy += 120 * dt;
          if (Math.random() < dt * 16) {
            eras.emitSpark(boat.x - 16, waveY, -boat.vx * 0.25, -28 - Math.random() * 35, splashCol, 2.4, 0.42);
          }
        } else if (input.left) {
          boat.angle -= 0.9 * dt;
          if (slope < -0.10 && boat.vx > 230) boat.vy -= 140 * dt;
        }

        var minCruise = cfg.MIN_CRUISE_SPEED + boat.trickCombo * 16 + st.rocketLv * 12;
        if (!reverseThrusting && boat.vx < minCruise) boat.vx += 195 * dt;

        var submerge = boat.y - waveY;
        if (submerge > -2) {
          var buoy = -submerge * cfg.WATER_BUOYANCY - boat.vy * cfg.WATER_DAMPING;
          boat.vy += (buoy + cfg.GRAVITY * 0.22) * dt;
        } else {
          boat.vy += cfg.GRAVITY * 0.45 * dt;
        }

        var diffA = normalizeAngle(slopeAngle - boat.angle);
        boat.angularVel += (diffA * 22 - boat.angularVel * 7.2) * dt;
        boat.angle += boat.angularVel * dt;
        boat.vx *= Math.pow(eb.friction, dt);
      }
    } else if (!boat.grindingRail && !boat.ridingDeck) {
      boat.airTime += dt;
      var spinInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (spinInput !== 0) {
        var deltaSpin = spinInput * cfg.AIR_PITCH_SPEED * dt;
        boat.angle += deltaSpin;
        boat.angularVel = spinInput * cfg.AIR_PITCH_SPEED;
        boat.airSpin += deltaSpin;

        var flipsNow = Math.floor(Math.abs(boat.airSpin) / cfg.FLIP_THRESHOLD);
        if (flipsNow > boat.flipsInJump) {
          boat.flipsInJump = flipsNow;
          boat.trickAura = 0.85;
          eras.emitRing(boat.x, boat.y - 10, '#bfeaff');
          window.MT.Audio.playHookCatch();
        }
      } else {
        boat.angularVel *= Math.pow(0.08, dt);
        boat.angle += boat.angularVel * dt;
      }

      // 风铃滑翔翼 + 高空月雾云带无重滑翔升力！
      var effGravity = cfg.GRAVITY;
      if (boat.cloudGliding) {
        // 穿行高空月雾云带：重力削减 68%、柔和尾风前推、自动补燃料并拖出银白云丝！
        if (boat.vy > -35) {
          effGravity = cfg.GRAVITY * 0.30;
          if (boat.vy > 115) boat.vy -= 360 * dt;
        } else {
          effGravity = cfg.GRAVITY * 0.72;
        }
        boat.vx += 95 * dt;
        boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.20 * dt);
        if (Math.random() < dt * 18) {
          eras.emitSpark(boat.x - 18, boat.y + 4, -boat.vx * 0.22, (Math.random() - 0.5) * 18, '#e8f6ff', 2.6, 0.52);
        }
      } else if (st.skySailLv >= 1 || st.gliderLv >= 1) {
        var sailLift = Math.max(st.sailGlideFrac || 0, st.glideLiftFrac || 0);
        var airLv = Math.max(st.skySailLv || 0, st.gliderLv || 0);
        if (boat.vy > -25) {
          effGravity = cfg.GRAVITY * (1 - sailLift * 0.82);
          boat.vx += (44 + airLv * 26) * dt;
          if (Math.random() < dt * 8) {
            eras.emitSpark(boat.x - 16, boat.y - 38, -boat.vx * 0.2, 6, st.skySailLv >= 1 ? '#fff4d0' : '#e8fae4', 2.0, 0.52);
          }
        }
        var regenRate = Math.max(st.sailFuelRegen || 0, st.airFuelRegen || 0);
        if (regenRate > 0 && !wantBoost) {
          boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + regenRate * dt);
        }
      }

      boat.vy += effGravity * dt;
      boat.vx *= Math.pow((boat.cloudGliding || st.skySailLv >= 1 || st.gliderLv >= 1) ? 0.984 : 0.95, dt);
      if (boat.y < cfg.SOFT_CEILING) boat.vy += (cfg.SOFT_CEILING - boat.y) * 5.0 * dt;
    }

    // 8b. 高速滑轨机关（冰桥轨 / 铁桥轨 / 发光树根轨）与海面浮鲸背脊弹射！
    var rails = eras.getGrindRails ? eras.getGrindRails() : [];
    if (boat.grindingRail) {
      var curRail = boat.grindingRail;
      var exitedEnd = boat.x > curRail.x1;
      var jumpOff = wantBoost && boostJustStarted;
      if (exitedEnd || jumpOff || boat.x < curRail.x0 - 20) {
        if (exitedEnd && !curRail.completed) {
          curRail.completed = true;
          var rBonus = Math.round(8 * st.starMult);
          boat.runStars += rBonus;
          boat.vy = Math.min(boat.vy, -210);
          boat.vx = Math.min(st.maxSpeed + 110, boat.vx + 72);
          boat.trickAura = 0.9;
          window.MT.Audio.playMountChord('lantern', true);
          eras.emitRing(boat.x, boat.y, '#ffe69e');
          eras.addPopup(boat.x, boat.y - 46, '飞跃轨端 +' + rBonus + '✦', '#ffe8a4');
          if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
            window.MT.RenderWorld.triggerImpact(0.028, 0.04, 4.0);
          }
          addComboAndCheckFever(1, 6.5);
        } else if (jumpOff) {
          boat.vy = -245;
        }
        boat.grindingRail = null;
        boat.grindGrace = 0.28;
        window.MT.Audio.setGrinding(false, null, 0);
      } else {
        var ry = eras.getRailY(curRail, boat.x);
        var rSlope = eras.getRailSlope(curRail, boat.x);
        curRail.glow = 1.0;
        boat.y = ry - 8;
        boat.vx = Math.max(boat.vx + 110 * dt, 350 + st.rocketLv * 28);
        boat.vy = boat.vx * rSlope;
        boat.angle += normalizeAngle(Math.atan(rSlope) - boat.angle) * Math.min(1, dt * 22);
        boat.angularVel = 0;
        boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.38 * dt);
        boat.comboTimer = Math.max(boat.comboTimer, 4.5);
        boat.grindDistM += (boat.vx * dt) / eco.DIST_DIVISOR;
        window.MT.Audio.setGrinding(true, curRail.style, Math.min(1, boat.vx / 520));

        var gSparkCol = curRail.style === 'ice_bridge' ? '#ccf4ff' : (curRail.style === 'root_rail' ? '#b4f8c8' : '#ffd886');
        if (Math.random() < dt * 36) {
          eras.emitSpark(boat.x - 14, ry - 2, -boat.vx * 0.32, -45 - Math.random() * 75, gSparkCol, 2.2 + Math.random() * 1.4, 0.36);
        }
      }
    } else {
      window.MT.Audio.setGrinding(false, null, 0);
      if (boat.grindGrace <= 0 && boat.vy >= -45) {
        for (var ri = 0; ri < rails.length; ri++) {
          var rl = rails[ri];
          if (boat.x >= rl.x0 - 12 && boat.x <= rl.x1 - 24) {
            var targetRy = eras.getRailY(rl, boat.x);
            if (boat.y >= targetRy - 26 && boat.y <= targetRy + 20) {
              boat.grindingRail = rl;
              boat.y = targetRy - 8;
              boat.airTime = 0;
              boat.airSpin = 0;
              boat.flipsInJump = 0;
              rl.glow = 1.0;
              if (!rl.grinded) {
                rl.grinded = true;
                var railName = rl.style === 'ice_bridge' ? '冰桥飙轨!' : (rl.style === 'root_rail' ? '树根疾轨!' : '铁桥滑轨!');
                eras.addPopup(boat.x, targetRy - 44, railName, '#ffe8a4');
                window.MT.Audio.playHookCatch();
                addComboAndCheckFever(1, 6.2);
              }
              break;
            }
          }
        }
      }
    }

    // 纪元 I 月潮之海：柔和发光浮鲸背脊二次弹射！
    var whaleList = eras.getWhales ? eras.getWhales() : [];
    for (var wi = 0; wi < whaleList.length; wi++) {
      var wh = whaleList[wi];
      if (wh.bounced) continue;
      var whY = eras.getSurfaceY(wh.x, t) + Math.sin(wh.phase) * 7 - 6;
      if (Math.abs(boat.x - wh.x) < wh.radiusX + 16 && boat.y >= whY - 34 && boat.y <= whY + 26) {
        wh.bounced = true;
        wh.bounceFlash = 1.0;
        boat.vy = -325;
        boat.vx = Math.min(st.maxSpeed + 95, Math.max(boat.vx + 85, 310));
        boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.45);
        boat.trickAura = 0.95;
        boat.runWhalesBounced += 1;
        var wBonus = Math.round(8 * st.starMult);
        boat.runStars += wBonus;
        window.MT.Audio.playWhaleBounce();
        eras.emitSplash(wh.x, whY, 20, '#d8f4ff', 65);
        eras.emitRing(wh.x, whY - 12, '#bfeaff');
        eras.addPopup(wh.x, whY - 56, '鲸背借力飞升! +' + wBonus + '✦', '#d4f4ff');
        if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
          window.MT.RenderWorld.triggerImpact(0.028, 0.045, 4.5);
        }
        addComboAndCheckFever(1, 6.5);
      }
    }

    // 8c. 独立关卡手工区块交互（上层高架桥/栈桥滑行、水下暗礁加速涌流、钟楼敲钟、巨水母弹射、鲸群连跃、遗物拾取）
    if (window.MT.LevelEngine && window.MT.LevelEngine.handleChunkInteractions) {
      window.MT.LevelEngine.handleChunkInteractions({
        dt: dt, boat: boat, input: input, eb: eb, eras: eras,
        cfg: cfg, eco: eco, st: st, waveY: waveY, slope: slope, slopeAngle: slopeAngle,
        wantBoost: wantBoost, boostJustStarted: boostJustStarted,
        normalizeAngle: normalizeAngle,
        addComboAndCheckFever: addComboAndCheckFever
      });
    }

    // 9. 火海熔岩热浪喷泉交互
    var plumes = eras.getLavaPlumes();
    for (var plIdx = 0; plIdx < plumes.length; plIdx++) {
      var pl = plumes[plIdx];
      var plSurf = eras.getSurfaceY(pl.x, t);
      if (Math.abs(boat.x - pl.x) < pl.radius + 14 && boat.y > plSurf - pl.height && boat.y < plSurf + 26) {
        if (st.heatShieldLv >= 1) {
          boat.vy = Math.max(-320, boat.vy - 540 * dt);
          boat.vx = Math.min(st.maxSpeed, boat.vx + 115 * dt);
          boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.85 * dt);
          if (!pl.boosted) {
            pl.boosted = true;
            var pBonus = Math.round(eco.PLUME_STAR_BONUS * st.starMult);
            boat.runStars += pBonus;
            boat.trickAura = 0.85;
            window.MT.Audio.playSteamRefill(0.9);
            eras.emitRing(pl.x, boat.y, '#ffd482');
            eras.addPopup(pl.x, boat.y - 38, '黑曜热流升空 +' + pBonus + '✦', '#ffe096');
          }
        } else if (pl.hurtCooldown <= 0) {
          pl.hurtCooldown = 0.85;
          var pDmg = Math.max(6, Math.round(12 * st.crashDamageMult));
          boat.hull = Math.max(0, boat.hull - pDmg);
          boat.hurtFlash = 0.9;
          boat.vy = Math.min(boat.vy, -135);
          window.MT.Audio.playSplash(0.8);
          if (window.MT.RenderWorld && window.MT.RenderWorld.addShake) window.MT.RenderWorld.addShake(6.0);
          eras.addPopup(pl.x, boat.y - 42, '熔岩灼伤 -' + pDmg, '#ff9268');
        }
      }
    }

    window.MT.Audio.setIceScrape(iceScrapeRatio, boat.carving);

    var eraTopBonus = (boat.inIceWinter ? (58 + st.quiltLv * 14) : 0) + (boat.inForest ? 42 : 0);
    var feverBonus = boat.feverTimer > 0 ? 95 : 0;
    var diveBonus = boat.isDiving ? 95 : 0;
    var boostCapBonus = (wantBoost && !reverseThrusting) ? 140 : 0;
    var minVx = (boat.inWater || boat.grindingRail || boat.isDiving || boat.ridingDeck) ? (reverseThrusting ? -140 : 65) : -240;
    boat.vx = Math.max(minVx, Math.min(st.maxSpeed + eraTopBonus + boostCapBonus + feverBonus + diveBonus, boat.vx));
    boat.x += boat.vx * dt;
    boat.y += boat.vy * dt;

    // 固态刚体后置防穿透钳位：保证积分后船底永远不会沉入冰面或荒土之下！
    if (isSolidSurface) {
      var nextGround = eras.getSurfaceY(boat.x, t);
      if (boat.y > nextGround) {
        boat.y = nextGround;
        var nextSlope = eras.getSurfaceSlope(boat.x, t);
        var minVy = boat.vx * nextSlope;
        if (boat.vy > minVy) boat.vy = minVy;
      }
    }
    if (boat.y < cfg.HARD_CEILING) {
      boat.y = cfg.HARD_CEILING;
      if (boat.vy < 0) boat.vy = 0;
    }

    var distOrigin = (eras.isEndlessMode && eras.isEndlessMode()) ? boat.startX : 120;
    boat.distanceM = Math.max(0, Math.floor((boat.x - distOrigin) / eco.DIST_DIVISOR));

    // 10. 掠拾星火
    var stars = eras.getStarArcs();
    for (var s = 0; s < stars.length; s++) {
      var star = stars[s];
      if (star.collected) continue;
      var d = Math.hypot(star.x - boat.x, star.y - (boat.y - 10));
      if (d < 44) {
        star.collected = true;
        var val = Math.max(1, Math.round((star.value || 1) * st.starMult));
        boat.runStars += val;
        boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.036);
        window.MT.Audio.playHookCatch();
        var sc = star.theme === 'giant_forest'
          ? '#a8f8c4'
          : (star.theme === 'sprout_meadow' ? '#dcf8b6' : (star.theme === 'ice_winter' ? '#b8f0ff' : (star.theme === 'fire_sea' ? '#ffae6c' : '#ffe69e')));
        for (var k = 0; k < 5; k++) {
          var a = (k / 5) * Math.PI * 2;
          eras.emitSpark(star.x, star.y, Math.cos(a) * 48 + boat.vx * 0.25, Math.sin(a) * 48, sc, 2.4, 0.45);
        }
      } else if (star.magnetized || d < (boat.feverTimer > 0 ? Math.max(265, st.magnetRadius * 1.75) : st.magnetRadius)) {
        // 锁定磁吸归巢：向船中心高速丝滑收敛，绝不卡在船正上方排队！
        star.magnetized = true;
        var pull = Math.min(1, dt * 13.5);
        star.x += (boat.x - star.x) * pull + boat.vx * dt * 0.35;
        star.y += ((boat.y - 10) - star.y) * pull;
      }
    }

    // 11. 掠过纪元补给浮灯
    var buoys = eras.getBuoys();
    for (var b = 0; b < buoys.length; b++) {
      var by = buoys[b];
      if (!by.lit) continue;
      var byY = eras.getSurfaceY(by.x, t) - 18;
      if (Math.hypot(by.x - boat.x, byY - boat.y) < 58) {
        by.lit = false;
        by.flash = 1.0;
        var mult = by.theme === 'giant_forest' ? 4.5 : (by.theme === 'sprout_meadow' ? 3.5 : (by.theme === 'thawed_wasteland' ? 3 : (by.theme === 'ice_winter' ? 2.5 : (by.theme === 'fire_sea' ? 2 : 1))));
        var bStars = Math.round(eco.BUOY_STAR_BONUS * mult * st.starMult);
        boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + cfg.BUOY_FUEL_REWARD);
        boat.runStars += bStars;
        boat.vx = Math.min(st.maxSpeed + eraTopBonus, boat.vx + 58);
        if (by.theme === 'ice_winter' || by.theme === 'sprout_meadow' || by.theme === 'giant_forest') {
          boat.hull = Math.min(boat.maxHull, boat.hull + 12);
        }
        boat.trickAura = 0.65;
        window.MT.Audio.playSteamRefill(0.8);
        eras.emitRing(by.x, byY, '#ffd88a');
        var bText = by.theme === 'giant_forest' ? ('林灯祝福 +' + bStars + '✦') : (by.theme === 'ice_winter' ? ('暖炭回温 +' + bStars + '✦') : ('浮灯补气 +' + bStars + '✦'));
        eras.addPopup(by.x, byY - 26, bText, '#ffe49e');
      }
    }

    updateScarf(dt);

    // 12. 耐久归零 -> 自动回船坞并提示针对性改装
    if (boat.hull <= 0 && typeof onRunEvent === 'function') {
      var reason = boat.vineStress > 0.2 || (boat.inForest && st.prowLv === 0)
        ? 'vine_broken'
        : (boat.coldStress > 0.2
          ? 'cold_broken'
          : (boat.roughStress > 0.2 || (boat.inWasteland && st.springsLv === 0)
            ? 'rough_broken'
            : (boat.heatStress > 0.2 ? 'heat_broken' : 'hull_broken')));
      onRunEvent(reason);
    }
  }

  reset();

  return {
    reset: reset,
    refreshStats: refreshStats,
    update: update,
    getBoat: function () { return boat; }
  };
})();
