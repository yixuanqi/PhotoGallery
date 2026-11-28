window.MT = window.MT || {};

// v13 Step 2：第 2 海域《霜穹冰海》独立开放海域插件（0 ~ 10,000 px 自由立体探索！）
// 核心机制：封冻海面冰盖与天然冰间湖、冲刺破冰开辟呼吸洞、深海极寒温控与海底地热暖泉绿洲、
//          半封冰古木探险帆船气室、孔雀蓝冰下海蚀石拱圣殿、西端跨海返航门与冰港补给锚桩
(function () {
  var iceCaps = [];        // 海面冰盖区块（thick 厚冰穹 | thin 可冲刺撞碎薄冰）
  var iceFloes = [];       // 撞碎薄冰后浮于水面的碎冰块
  var warmSprings = [];    // 6 处海底地热暖泉绿洲（消寒、回气、补燃料）
  var galleons = [];       // 2 艘半封入冰层的古探险木帆船（船底带温暖空气气室！）
  var iceArches = [];      // 2 座孔雀蓝冰下天然石拱深谷圣殿
  var iceCrystals = [];    // 5 处发光极地冰晶矿簇（冲刺震碎爆星火）
  var icePearls = [];      // 水下星珠流
  var frostRelics = [];    // 4 枚霜穹冰海专属遗物
  var wonderCheckCd = 1.4;
  var sonarWaves = [];
  var shards = [];
  var snowFlakes = [];
  var activeSonarCd = 0;
  var activeSonarMaxCd = 2.4;
  var harborMoorProg = 0;
  var harborMoorCd = 0;
  var portalProg = 0;
  var portalCd = 0;
  var boundHintCd = 0;
  var pressurePulseCd = 0;
  var iceEchoReveal = 0;
  var nextId = 1;

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function smoothstep(e0, e1, x) {
    if (e0 === e1) return x < e0 ? 0 : 1;
    var u = clamp((x - e0) / (e1 - e0), 0, 1);
    return u * u * (3 - 2 * u);
  }

  // 霜穹冰海连续起伏海床：含两处孔雀蓝深冰谷（x=3860 & x=6480）及东西自然缓升冰礁边界！
  function getFrostSeabedY(worldX) {
    var wc = (window.MT.Config && window.MT.Config.WORLD_CYCLE) || { MIN_X: 160, MAX_X: 9840 };
    var baseY = 398
      + Math.sin(worldX * 0.0018 + 0.6) * 34
      + Math.sin(worldX * 0.0044 + 2.1) * 16
      + Math.cos(worldX * 0.0092) * 6;

    // 两大深冰海谷（平滑高斯凹陷，与第 1 海域同等水彩自然美感！）
    var d1 = (worldX - 3860) / 410;
    var d2 = (worldX - 6480) / 440;
    var valley = Math.exp(-d1 * d1) * 235 + Math.exp(-d2 * d2) * 265;
    var shelfW = 1 - smoothstep(260, 1180, worldX);
    var y = baseY - shelfW * 78 + valley;

    // 西/东自然冰礁缓坡（无空气墙错觉！）
    var westRise = 1 - smoothstep(wc.MIN_X - 160, wc.MIN_X + 120, worldX);
    var eastRise = smoothstep(wc.MAX_X - 90, wc.MAX_X + 210, worldX);
    y = y * (1 - westRise) + 46 * westRise;
    y = y * (1 - eastRise) + 44 * eastRise;
    return y;
  }

  function buildFrostWorld() {
    iceCaps = [];
    iceFloes = [];
    warmSprings = [];
    galleons = [];
    iceArches = [];
    iceCrystals = [];
    icePearls = [];
    sonarWaves = [];
    shards = [];
    snowFlakes = [];

    // 1. 封冻海面冰盖分区（天然冰间湖 <-> 厚冰穹 <-> 带裂纹可撞碎薄冰！）
    //    开放冰间湖位于: 0..1180, 2420..2980, 4780..5360, 7380..7960, 9420..10000
    var capSpecs = [
      { x0: 1180, x1: 1660, kind: 'thick', thick: 34, peakH: 38 },
      { x0: 1660, x1: 1940, kind: 'thin',  thick: 16, peakH: 10 },
      { x0: 1940, x1: 2420, kind: 'thick', thick: 36, peakH: 46 },

      { x0: 2980, x1: 3700, kind: 'thick', thick: 40, peakH: 52 },
      { x0: 3700, x1: 4020, kind: 'thin',  thick: 16, peakH: 11 },
      { x0: 4020, x1: 4780, kind: 'thick', thick: 38, peakH: 48 },

      { x0: 5360, x1: 6020, kind: 'thick', thick: 42, peakH: 56 },
      { x0: 6020, x1: 6300, kind: 'thin',  thick: 16, peakH: 10 },
      { x0: 6300, x1: 6860, kind: 'thick', thick: 44, peakH: 60 },
      { x0: 6860, x1: 7120, kind: 'thin',  thick: 16, peakH: 10 },
      { x0: 7120, x1: 7380, kind: 'thick', thick: 36, peakH: 40 },

      { x0: 7960, x1: 8600, kind: 'thick', thick: 40, peakH: 54 },
      { x0: 8600, x1: 8880, kind: 'thin',  thick: 16, peakH: 10 },
      { x0: 8880, x1: 9420, kind: 'thick', thick: 38, peakH: 46 }
    ];
    capSpecs.forEach(function (sp, idx) {
      iceCaps.push(Object.assign({}, sp, {
        id: nextId++,
        broken: false,
        flash: 0,
        seed: idx * 3.7 + 1.1
      }));
    });

    // 2. 6 处海底地热暖泉绿洲（暖琥珀火山裂隙 + 温柔暖流，瞬间融化寒意与补气！）
    var springXs = [1420, 2680, 3860, 5680, 6540, 8360];
    springXs.forEach(function (sx, idx) {
      warmSprings.push({
        id: nextId++,
        x: sx,
        bedY: getFrostSeabedY(sx),
        plumeH: 255 + (idx % 2) * 35,
        phase: idx * 1.4,
        boostCd: 0
      });
    });

    // 3. 2 艘半封入冰层的古木探险帆船（船底受困暖灯空气气室！）
    var galSpecs = [
      { x: 2220, tilt: 0.14, name: '北风探险号气室' },
      { x: 7240, tilt: -0.12, name: '极光旧帆船气室' }
    ];
    galSpecs.forEach(function (gs) {
      galleons.push({
        id: nextId++,
        x: gs.x,
        tilt: gs.tilt,
        name: gs.name,
        w: 190,
        glow: 0,
        refillCd: 0
      });
    });

    // 4. 2 座深谷孔雀蓝天然冰蚀石拱（扎根两大深谷底部，内部穹顶自带换气冰室！）
    iceArches = [
      {
        id: 'ice_arch_west',
        name: '蓝冰拱廊',
        cx: 3860,
        span: 660,
        apexY: 452,
        thickness: 44,
        floorRef: 632,
        seed: 9.2,
        pocketGlow: 0,
        pocketCd: 0,
        echo: 0
      },
      {
        id: 'ice_arch_east',
        name: '极光冰殿',
        cx: 6480,
        span: 720,
        apexY: 468,
        thickness: 48,
        floorRef: 664,
        seed: 23.8,
        pocketGlow: 0,
        pocketCd: 0,
        echo: 0
      }
    ];

    // 5. 5 座冰晶矿柱（水下冲刺震碎爆高额星火！）
    var cryXs = [1820, 3560, 4460, 6220, 8740];
    cryXs.forEach(function (cx, idx) {
      iceCrystals.push({
        id: nextId++,
        x: cx,
        bedY: getFrostSeabedY(cx),
        h: 70 + (idx % 2) * 18,
        smashed: false,
        phase: idx * 1.3
      });
    });

    // 6. 沿途冰海星珠流（引导潜入冰下空腔与暖泉路线）
    var streams = [
      { x0: 1180, span: 540, y: 185, amp: 32, cnt: 6 },
      { x0: 3120, span: 680, y: 310, amp: 44, cnt: 7 },
      { x0: 5480, span: 640, y: 265, amp: 40, cnt: 7 },
      { x0: 6180, span: 680, y: 525, amp: 36, cnt: 7 },
      { x0: 8060, span: 620, y: 235, amp: 38, cnt: 6 }
    ];
    streams.forEach(function (ps, sIdx) {
      for (var i = 0; i < ps.cnt; i++) {
        var u = ps.cnt > 1 ? (i / (ps.cnt - 1)) : 0.5;
        icePearls.push({
          x: ps.x0 + u * ps.span,
          y: ps.y + Math.sin(u * Math.PI * 2 + sIdx) * ps.amp,
          phase: i * 0.7 + sIdx,
          collected: false,
          value: 4
        });
      }
    });

    // 6b. 4 枚霜穹冰海专属沉海遗物（高空冰桅 / 蓝冰拱廊 / 极光冰殿 / 暖泉崖畔）
    frostRelics = [
      { id: 'relic_ice_compass',   name: '极光星盘',   x: 2215, yMode: 'sky',   yVal: -86, pickedThisRun: false, phase: 0.4 },
      { id: 'relic_narwhal_tusk',  name: '螺旋冰牙笛', x: 3860, yMode: 'depth', yVal: 555, pickedThisRun: false, phase: 1.5 },
      { id: 'relic_aurora_prism',  name: '折光寒晶核', x: 6480, yMode: 'depth', yVal: 530, pickedThisRun: false, phase: 2.7 },
      { id: 'relic_frost_lantern', name: '雪夜守望灯', x: 8360, yMode: 'depth', yVal: 245, pickedThisRun: false, phase: 3.9 }
    ];

    // 7. 极地空中轻盈雪花粒子
    for (var sf = 0; sf < 38; sf++) {
      snowFlakes.push({
        x: Math.random() * 1400,
        y: Math.random() * 480,
        r: 1.2 + Math.random() * 2.0,
        vx: -14 - Math.random() * 16,
        vy: 18 + Math.random() * 22,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function reset() {
    activeSonarCd = 0;
    harborMoorProg = 0;
    harborMoorCd = 2.6;
    portalProg = 0;
    portalCd = 3.0;
    boundHintCd = 0;
    pressurePulseCd = 0;
    iceEchoReveal = 0;
    wonderCheckCd = 1.4;
    buildFrostWorld();
    if (window.MT.IceFauna && window.MT.IceFauna.reset) window.MT.IceFauna.reset();
    if (window.MT.IceShrines && window.MT.IceShrines.reset) window.MT.IceShrines.reset();
  }

  function getIceCapAt(x) {
    for (var i = 0; i < iceCaps.length; i++) {
      var ic = iceCaps[i];
      if (!ic.broken && x >= ic.x0 && x <= ic.x1) return ic;
    }
    return null;
  }

  function shatterIceCap(ic, boat, eras, st) {
    if (!ic || ic.broken) return;
    ic.broken = true;
    var midX = (ic.x0 + ic.x1) * 0.5;
    var surfY = eras.getSurfaceY(midX, eras.getTime());

    // 生成漂浮碎冰块（随波起伏！）
    var cnt = 6;
    for (var i = 0; i < cnt; i++) {
      var fx = ic.x0 + 22 + (i / (cnt - 1)) * (ic.x1 - ic.x0 - 44);
      iceFloes.push({
        x: fx,
        y: surfY - 2,
        vx: (fx < boat.x ? -1 : 1) * (25 + Math.random() * 45),
        vy: -55 - Math.random() * 55,
        w: 22 + Math.random() * 22,
        h: 9 + Math.random() * 6,
        rot: (Math.random() - 0.5) * 0.4,
        phase: Math.random() * Math.PI * 2
      });
    }
    for (var s = 0; s < 14; s++) {
      shards.push({
        x: boat.x + (Math.random() - 0.5) * 90,
        y: surfY + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 240,
        vy: -110 - Math.random() * 170,
        ang: Math.random() * Math.PI * 2,
        vAng: (Math.random() - 0.5) * 11,
        r: 4 + Math.random() * 5,
        life: 1.0 + Math.random() * 0.45,
        maxLife: 1.45
      });
    }

    var bonus = Math.round(22 * (st.starMult || 1));
    boat.runStars += bonus;
    if (st.iceBreakRefills) {
      boat.breath = 1.0;
      boat.fuel = window.MT.Config.SURF.MAX_FUEL;
    }
    if (window.MT.Audio && window.MT.Audio.playIceCrack) window.MT.Audio.playIceCrack();
    if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
      window.MT.RenderWorld.triggerImpact(0.036, 0.052, 6.2);
    }
    eras.emitRing(boat.x, surfY, '#c8f8ff');
    eras.addPopup(boat.x, surfY - 46, '✦ 撞碎冰盖开辟呼吸冰洞! +' + bonus + '✦', '#d4fbff');
  }

  function isInsideWarmOasis(x, y) {
    for (var i = 0; i < warmSprings.length; i++) {
      var ws = warmSprings[i];
      if (Math.abs(x - ws.x) < 64 && y < ws.bedY + 14 && y > ws.bedY - ws.plumeH) return true;
    }
    return false;
  }

  function isInsideAnyIceAirPocket(x, y, eras, t) {
    for (var i = 0; i < galleons.length; i++) {
      var g = galleons[i];
      var gy = eras.getSurfaceY(g.x, t) + 56;
      if (Math.abs(x - g.x) < 78 && y > gy - 34 && y < gy + 44) return true;
    }
    for (var j = 0; j < iceArches.length; j++) {
      var ia = iceArches[j];
      if (Math.abs(x - ia.cx) < 82 && y >= ia.apexY - 10 && y <= ia.apexY + 58) return true;
    }
    if (window.MT.IceFauna && window.MT.IceFauna.isInsideTurtleSanctuary && window.MT.IceFauna.isInsideTurtleSanctuary(x, y)) {
      return true;
    }
    return false;
  }

  // === 全向自由探索物理（带冰盖阻挡 / 冲刺破冰 / 极寒温控 / 暖泉回暖！）===
  function handleSurfacePhysics(ctxObj) {
    var dt = ctxObj.dt;
    var boat = ctxObj.boat;
    var input = ctxObj.input;
    var eras = ctxObj.eras;
    var cfg = ctxObj.cfg;
    var st = ctxObj.st;
    var waveY = ctxObj.waveY;
    var slopeAngle = ctxObj.slopeAngle;
    var t = eras.getTime();

    var ix = (typeof input.joyX === 'number' && Math.abs(input.joyX) > 0.06)
      ? input.joyX
      : ((input.right ? 1 : 0) - (input.left ? 1 : 0));
    var iy = (typeof input.joyY === 'number' && Math.abs(input.joyY) > 0.06)
      ? input.joyY
      : ((input.down ? 1 : 0) - (input.up ? 1 : 0));
    var mag = Math.hypot(ix, iy);
    if (mag > 1) { ix /= mag; iy /= mag; }

    if (ix > 0.14) boat.facing = 1;
    else if (ix < -0.14) boat.facing = -1;
    var fTarget = boat.facing || 1;
    boat.facingSmooth = (typeof boat.facingSmooth === 'number' ? boat.facingSmooth : 1);
    boat.facingSmooth += (fTarget - boat.facingSmooth) * Math.min(1, dt * 10);

    if (boat.abyssDashCd > 0) boat.abyssDashCd = Math.max(0, boat.abyssDashCd - dt);
    if (boat.abyssDashTimer > 0) boat.abyssDashTimer = Math.max(0, boat.abyssDashTimer - dt);
    var rawBoostEdge = !!input.boost && !boat.wasAbyssBoost;
    boat.wasAbyssBoost = !!input.boost;

    var capNow = getIceCapAt(boat.x);
    var bedY = getFrostSeabedY(boat.x);
    var submerged = boat.isDiving || boat.y > waveY + 14;

    // 处于冰盖正下方时强制保持水下潜艇形态
    if (capNow && boat.y > waveY - 6) {
      submerged = true;
      boat.isDiving = true;
    }

    if (submerged) {
      boat.isDiving = true;
      boat.inAbyss = true;
      boat.inWater = true;
      boat.submergeDepth = Math.max(0, boat.y - waveY);

      // 判断是否进入两大深冰拱谷
      var activeArch = null;
      for (var ai = 0; ai < iceArches.length; ai++) {
        if (Math.abs(boat.x - iceArches[ai].cx) < iceArches[ai].span * 0.62 && boat.y > 410) {
          activeArch = iceArches[ai];
          break;
        }
      }
      boat.inCave = !!activeArch;
      boat.activeCaveName = activeArch ? activeArch.name : '';

      // 冰海温控系统：水下极寒缓慢积累 frostChill，地热暖泉秒融寒意，暖铜破冰舱大幅减缓寒意！
      var inWarm = isInsideWarmOasis(boat.x, boat.y);
      var chillResist = st.frostChillResist || 0;
      if (inWarm) {
        boat.frostChill = Math.max(0, (boat.frostChill || 0) - 0.85 * dt);
        if ((st.warmBreakerLv || 0) >= 3) {
          boat.hull = Math.min(boat.maxHull, boat.hull + 4.5 * dt);
        }
      } else {
        var deepCold = (capNow ? 0.036 : 0.016) + clamp((boat.submergeDepth - 120) / 340, 0, 1) * 0.032;
        var effCold = deepCold * (1 - chillResist);
        if (effCold > 0.001) {
          boat.frostChill = Math.min(1.0, (boat.frostChill || 0) + effCold * dt);
        } else {
          boat.frostChill = Math.max(0, (boat.frostChill || 0) - 0.25 * dt);
        }
      }

      var chillSlow = 1 - (boat.frostChill || 0) * 0.24;
      var finLv = st.deepFinsLv || 0;
      var mantaLv = st.skySailLv || 0;
      var maxSubSpd = (275 + (st.rocketLv || 0) * 24 + finLv * 22 + mantaLv * 18) * chillSlow;
      var boostActive = !!(input.boost && boat.fuel > 0.015);
      boat.boosting = boostActive;

      // 空格水下爆发冲刺（同时可用于向上撞碎薄冰盖！）
      if (rawBoostEdge && boat.abyssDashCd <= 0) {
        boat.abyssDashCd = Math.max(0.58, 1.12 - finLv * 0.16);
        boat.abyssDashTimer = 0.38;
        boat.breachSmashTimer = 0.50;
        var dxD = (Math.abs(ix) > 0.08 || Math.abs(iy) > 0.08) ? ix : fTarget;
        var dyD = (Math.abs(ix) > 0.08 || Math.abs(iy) > 0.08) ? iy : 0;
        var dLen = Math.hypot(dxD, dyD) || 1;
        var dashSpd = 465 + (st.rocketLv || 0) * 26 + finLv * 32;
        boat.vx = (dxD / dLen) * dashSpd;
        boat.vy = (dyD / dLen) * dashSpd * 0.90;
        if (window.MT.Audio && window.MT.Audio.playHydroDash) window.MT.Audio.playHydroDash();
        if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
          window.MT.RenderWorld.triggerImpact(0.014, 0.020, 2.2);
        }
      }

      var curMax = boostActive ? (maxSubSpd * 1.38) : maxSubSpd;
      if (boostActive) {
        boat.fuel = Math.max(0, boat.fuel - cfg.FUEL_BURN_RATE * 0.48 * st.burnRateMult * dt);
      } else {
        boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + (0.20 + mantaLv * 0.06) * dt);
      }

      if (boat.abyssDashTimer <= 0) {
        var desiredVx = ix * curMax;
        var desiredVy = iy * curMax * 0.88;
        var drag = (Math.abs(ix) > 0.05 || Math.abs(iy) > 0.05) ? 4.8 : (mantaLv >= 1 ? 1.85 : 2.6);
        boat.vx += (desiredVx - boat.vx) * Math.min(1, dt * drag);
        boat.vy += (desiredVy - boat.vy) * Math.min(1, dt * drag);
      }

      var pitchTarget = clamp(boat.vy / 290, -0.60, 0.60);
      boat.localPitch = (boat.localPitch || 0) + (pitchTarget - (boat.localPitch || 0)) * Math.min(1, dt * 8.5);
      boat.angle = boat.localPitch;

      // 顶面冰盖碰撞 & 冲刺破冰判定！
      if (capNow) {
        var iceBottomY = waveY + capNow.thick + 16;
        if (boat.y < iceBottomY) {
          var smashingUp = (boat.abyssDashTimer > 0 || boat.vy < -235);
          var canBreak = (capNow.kind === 'thin' && (st.canBreakThinIce || boat.abyssDashTimer > 0))
            || (capNow.kind === 'thick' && st.canBreakThickIce && boat.abyssDashTimer > 0);
          if (smashingUp && canBreak) {
            shatterIceCap(capNow, boat, eras, st);
          } else {
            boat.y = iceBottomY;
            if (boat.vy < 0) boat.vy = Math.abs(boat.vy) * 0.25 + 18;
            capNow.flash = 0.7;
            if (smashingUp && capNow.kind === 'thick' && !st.canBreakThickIce && boundHintCd <= 0) {
              boundHintCd = 4.2;
              eras.addPopup(boat.x, iceBottomY + 26, '◈ 厚冰穹顶需找冰间湖、薄冰裂口或升级「暖铜破冰舱 Lv.3」', '#d4f6ff');
            }
          }
        }
      } else {
        // 开阔冰间湖：平滑浮回海面变回木舟！
        if (boat.y < waveY + 24 && iy <= 0.12 && boat.vy <= 18) {
          boat.vy -= 95 * dt;
        }
        if (boat.y <= waveY + 12 && (boat.vy < -12 || iy < -0.18)) {
          boat.isDiving = false;
          boat.inAbyss = false;
          boat.inCave = false;
          boat.activeCaveName = '';
          boat.submergeDepth = Math.max(0, boat.y - waveY);
          if (boat.vy < -185 || boat.abyssDashTimer > 0) {
            boat.inWater = false;
            boat.y = waveY - 10;
            boat.vy = Math.min(boat.vy * 1.15, -310);
            eras.emitSplash(boat.x, waveY, 20, '#e8fbff', 76);
            if (window.MT.Audio && window.MT.Audio.playBreach) window.MT.Audio.playBreach(0.74);
          } else {
            boat.inWater = true;
            boat.vy *= 0.35;
            if (window.MT.Audio) window.MT.Audio.playSplash(0.40);
            eras.emitSplash(boat.x, waveY, 10, '#e2f8ff', 28);
          }
        }
      }

      // 海底柔和贴滑
      var floorLimit = bedY - 20;
      if (boat.y >= floorLimit) {
        boat.y = floorLimit;
        if (boat.vy > 0) boat.vy *= 0.2;
        boat.vx *= Math.pow(0.84, dt);
      }

      // 呼吸博弈（船底气室 / 冰拱气室 / 暖泉内自动回气）
      var inPocket = isInsideAnyIceAirPocket(boat.x, boat.y, eras, t);
      if (inPocket || inWarm) {
        boat.breath = Math.min(1.0, (boat.breath || 0) + (inPocket ? 1.4 : 0.45) * dt);
      } else {
        var dFrac = clamp((boat.y - 90) / 300, 0, 1);
        var drain = (0.056 + dFrac * 0.030) * (st.breathDrainMult || 1.0) * (1 + (boat.frostChill || 0) * 0.25);
        boat.breath = Math.max(0, (typeof boat.breath === 'number' ? boat.breath : 1.0) - drain * dt);
        if (boat.breath < 0.28 && boat.breath > 0) {
          pressurePulseCd -= dt;
          if (pressurePulseCd <= 0) {
            pressurePulseCd = 0.65;
            if (window.MT.Audio && window.MT.Audio.playPressurePulse) window.MT.Audio.playPressurePulse();
          }
        }
        if (boat.breath <= 0.001) {
          boat.hull = Math.max(0, boat.hull - 7.0 * dt);
          boat.hurtFlash = Math.max(boat.hurtFlash, 0.32);
        }
      }
      return true;
    }

    // === 海面木舟形态（在冰间湖自在漂浮 / 滑翔，遇到冰盖前沿温柔减速引导下潜！）===
    boat.inAbyss = false;
    boat.inCave = false;
    boat.activeCaveName = '';
    boat.submergeDepth = Math.max(0, boat.y - waveY);
    boat.inWater = boat.y >= waveY - 12;
    boat.frostChill = Math.max(0, (boat.frostChill || 0) - 0.35 * dt);

    if (boat.inWater) {
      boat.breath = Math.min(1.0, (boat.breath || 0) + 0.95 * dt);

      // 若木舟从冰间湖横向撞到冰盖厚边缘，温柔阻挡并提示按 S 下潜进入冰下空腔
      var nextCap = getIceCapAt(boat.x + (boat.vx >= 0 ? 28 : -28));
      if (nextCap) {
        boat.vx *= 0.25;
        if (iy > 0.15) {
          boat.isDiving = true;
          boat.inAbyss = true;
          boat.vy = 135;
          return true;
        }
      }

      if (iy > 0.28) {
        boat.isDiving = true;
        boat.inAbyss = true;
        boat.vy = Math.max(boat.vy + 180 * dt, 128);
        boat.localPitch = (boat.localPitch || 0) + (0.32 - (boat.localPitch || 0)) * Math.min(1, dt * 8);
        if (window.MT.Audio && window.MT.Audio.playDiveIn) window.MT.Audio.playDiveIn(0.62);
        eras.emitSplash(boat.x, waveY, 12, '#d8f6ff', 30);
        return true;
      }

      var boostSurf = !!(input.boost && boat.fuel > 0.015);
      boat.boosting = boostSurf;
      var maxSurfSpd = (boostSurf ? 380 : 255) + (st.rocketLv || 0) * 28;
      if (boostSurf) boat.fuel = Math.max(0, boat.fuel - cfg.FUEL_BURN_RATE * 0.45 * st.burnRateMult * dt);
      else boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.38 * dt);

      var targetSurfVx = ix * maxSurfSpd;
      boat.vx += (targetSurfVx - boat.vx) * Math.min(1, dt * (Math.abs(ix) > 0.05 ? 4.4 : 2.5));

      if ((iy < -0.55 || rawBoostEdge) && (Math.abs(boat.vx) > 130 || boostSurf)) {
        boat.inWater = false;
        boat.vy = -(280 + (boostSurf ? 60 : 0) + (st.rocketLv || 0) * 18);
        boat.y = waveY - 13;
        eras.emitSplash(boat.x, waveY, 12, '#e8fbff', 40);
      } else {
        var sub = boat.y - waveY;
        boat.vy += (-sub * 26 - boat.vy * 6.5) * dt;
        boat.localPitch = (boat.localPitch || 0) + (clamp(slopeAngle * fTarget, -0.42, 0.42) - (boat.localPitch || 0)) * Math.min(1, dt * 8);
        boat.angle = boat.localPitch;
      }
    } else {
      // 空中微滑翔
      boat.vx += ix * 180 * dt;
      boat.vy += cfg.GRAVITY * 0.85 * dt;
      boat.vx *= Math.pow(0.92, dt);
      boat.localPitch = (boat.localPitch || 0) + (clamp(boat.vy / 460, -0.52, 0.52) - (boat.localPitch || 0)) * Math.min(1, dt * 7);
      boat.angle = boat.localPitch;
      if (boat.y >= waveY - 2 && boat.vy > 0) {
        if (iy > 0.25 || capNow) {
          boat.isDiving = true;
          boat.inAbyss = true;
          boat.inWater = true;
          if (capNow && capNow.kind === 'thin' && st.canBreakThinIce) shatterIceCap(capNow, boat, eras, st);
        } else {
          boat.inWater = true;
          boat.y = waveY;
          boat.vy *= 0.22;
        }
        eras.emitSplash(boat.x, waveY, 14, '#e2f8ff', 40);
      }
    }
    return true;
  }

  function update(dt, boat, eras, actInfo, onLevelEvent) {
    var t = eras.getTime();
    var st = boat.stats || { starMult: 1, magnetRadius: 82, deepFinsLv: 0 };
    var inSub = !!(boat.isDiving || boat.inAbyss);

    if (activeSonarCd > 0) activeSonarCd = Math.max(0, activeSonarCd - dt);
    boat.activeSonarCdFrac = activeSonarMaxCd > 0 ? clamp(activeSonarCd / activeSonarMaxCd, 0, 1) : 0;
    if (harborMoorCd > 0) harborMoorCd = Math.max(0, harborMoorCd - dt);
    if (portalCd > 0) portalCd = Math.max(0, portalCd - dt);
    if (boundHintCd > 0) boundHintCd = Math.max(0, boundHintCd - dt);
    if (iceEchoReveal > 0) iceEchoReveal = Math.max(0, iceEchoReveal - dt * 0.45);

    // 探照灯光强随潜深柔和亮起
    var wantSpot = inSub ? clamp(0.42 + clamp((boat.submergeDepth - 30) / 180, 0, 0.50), 0.42, 0.94) : 0;
    boat.spotlightStrength = (boat.spotlightStrength || 0) + (wantSpot - (boat.spotlightStrength || 0)) * Math.min(1, dt * 3.2);

    // 1. 西端冰港补给锚桩（x=580，与第 1 海域完全一致的慢停系缆整备手感！）
    var inOutpost = Math.abs(boat.x - 580) < 155 && !boat.isDiving && boat.y < eras.getSurfaceY(boat.x, t) + 26;
    boat.inHarborZone = inOutpost;
    if (inOutpost && harborMoorCd <= 0 && Math.abs(boat.vx) < 75) {
      harborMoorProg = Math.min(1.0, harborMoorProg + dt / 1.25);
      if (harborMoorProg >= 1.0) {
        harborMoorProg = 0;
        harborMoorCd = 3.2;
        if (typeof onLevelEvent === 'function') onLevelEvent('harbor_moor', { x: boat.x });
      }
    } else {
      harborMoorProg = Math.max(0, harborMoorProg - dt * 1.8);
    }
    boat.harborMoorProg = harborMoorProg;

    // 2. 西端「星潮跨海返航门」（x=320）：驶入慢停 0.9s 或按 E 丝滑返回第 1 海域《月潮之海》！
    var inPortal = Math.abs(boat.x - 320) < 110;
    boat.inPortalZone = inPortal ? 'moon_sea' : null;
    if (inPortal && portalCd <= 0 && Math.abs(boat.vx) < 95) {
      portalProg = Math.min(1.0, portalProg + dt / 0.95);
      if (portalProg >= 1.0) {
        portalProg = 0;
        portalCd = 3.5;
        if (typeof onLevelEvent === 'function') onLevelEvent('realm_transit', { targetRealm: 'moon_sea', spawnX: 9380 });
      }
    } else {
      portalProg = Math.max(0, portalProg - dt * 1.8);
    }
    boat.portalProg = portalProg;

    // 3. 东端极地边界柔提示
    var wcLim = window.MT.Config.WORLD_CYCLE || { MIN_X: 160, MAX_X: 9840 };
    if (boat.x >= wcLim.MAX_X - 35 && boat.facing > 0 && boundHintCd <= 0) {
      boundHintCd = 6.0;
      eras.addPopup(boat.x - 55, boat.y - 52, '◈ 已抵霜穹冰海东端冰礁 · 极地暗流将你温柔推回', '#d4f6ff');
    }

    // 4. 更新冰盖闪光、碎冰浮块、暖泉托举、古帆船气室、冰拱气室、冰晶与星珠
    iceCaps.forEach(function (ic) { if (ic.flash > 0) ic.flash = Math.max(0, ic.flash - dt * 2.4); });

    for (var fi = iceFloes.length - 1; fi >= 0; fi--) {
      var fl = iceFloes[fi];
      fl.phase += dt * 2.2;
      fl.x += fl.vx * dt;
      fl.vx *= Math.pow(0.42, dt);
      var targetY = eras.getSurfaceY(fl.x, t) + Math.sin(fl.phase) * 2.5;
      fl.vy += ((targetY - fl.y) * 14 - fl.vy * 4.5) * dt;
      fl.y += fl.vy * dt;
    }

    warmSprings.forEach(function (ws) {
      ws.phase += dt * 2.0;
      if (ws.boostCd > 0) ws.boostCd = Math.max(0, ws.boostCd - dt);
      if (inSub && Math.abs(boat.x - ws.x) < 58 && boat.y < ws.bedY + 12 && boat.y > ws.bedY - ws.plumeH) {
        boat.vy -= 215 * dt;
        boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.35 * dt);
        if (ws.boostCd <= 0) {
          ws.boostCd = 4.2;
          var bonus = Math.round(10 * st.starMult);
          boat.runStars += bonus;
          if (window.MT.Audio) window.MT.Audio.playUpdraft();
          eras.addPopup(ws.x, boat.y - 36, '✦ 地热暖泉融寒回暖! +' + bonus + '✦', '#ffe6a8');
        }
      }
    });

    galleons.forEach(function (g) {
      if (g.glow > 0) g.glow = Math.max(0, g.glow - dt * 1.4);
      if (g.refillCd > 0) g.refillCd = Math.max(0, g.refillCd - dt);
      var gy = eras.getSurfaceY(g.x, t) + 56;
      if (inSub && Math.abs(boat.x - g.x) < 76 && boat.y > gy - 34 && boat.y < gy + 44) {
        g.glow = 1.0;
        boat.breath = 1.0;
        boat.frostChill = Math.max(0, (boat.frostChill || 0) - 0.9 * dt);
        boat.fuel = window.MT.Config.SURF.MAX_FUEL;
        if (g.refillCd <= 0) {
          g.refillCd = 4.5;
          boat.hull = Math.min(boat.maxHull, boat.hull + 16);
          if (window.MT.Audio && window.MT.Audio.playAirPocketRefill) window.MT.Audio.playAirPocketRefill();
          eras.emitRing(g.x, gy, '#ffe8aa');
          eras.addPopup(g.x, gy - 18, '✦ ' + g.name + ' · 回暖满气', '#fff2c4');
        }
      }
    });

    iceArches.forEach(function (ia) {
      if (ia.pocketGlow > 0) ia.pocketGlow = Math.max(0, ia.pocketGlow - dt * 1.4);
      if (ia.pocketCd > 0) ia.pocketCd = Math.max(0, ia.pocketCd - dt);
      if (ia.echo > 0) ia.echo = Math.max(0, ia.echo - dt * 0.45);
      if (inSub && Math.abs(boat.x - ia.cx) < 82 && boat.y >= ia.apexY - 10 && boat.y <= ia.apexY + 58) {
        ia.pocketGlow = 1.0;
        boat.breath = 1.0;
        if (ia.pocketCd <= 0) {
          ia.pocketCd = 4.2;
          if (window.MT.Audio && window.MT.Audio.playAirPocketRefill) window.MT.Audio.playAirPocketRefill();
          eras.addPopup(ia.cx, ia.apexY + 6, '✦ 冰拱气室 · 气息回满', '#c8f8ff');
        }
      }
    });

    var dashRad = (st.deepFinsLv || 0) >= 2 ? 122 : 70;
    iceCrystals.forEach(function (cr) {
      if (cr.smashed) return;
      cr.phase += dt * 2.5;
      var cy = cr.bedY - cr.h * 0.5;
      if (inSub && Math.hypot(boat.x - cr.x, boat.y - cy) < dashRad && (boat.abyssDashTimer > 0 || boat.breachSmashTimer > 0)) {
        cr.smashed = true;
        var cs = Math.round(22 * st.starMult);
        boat.runStars += cs;
        boat.breath = Math.min(1.0, (boat.breath || 0) + 0.24);
        for (var k = 0; k < 8; k++) {
          shards.push({
            x: cr.x + (Math.random() - 0.5) * 20, y: cy + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 190, vy: -80 - Math.random() * 140,
            ang: Math.random() * 6.28, vAng: (Math.random() - 0.5) * 10,
            r: 4 + Math.random() * 4.5, life: 1.1, maxLife: 1.3
          });
        }
        if (window.MT.Audio && window.MT.Audio.playCrystalShatter) window.MT.Audio.playCrystalShatter();
        eras.emitRing(cr.x, cy, '#a6f6ff');
        eras.addPopup(cr.x, cy - 36, '✦ 极地冰晶矿簇 +' + cs + '✦', '#d8fbff');
      }
    });

    var magR = Math.max(115, st.magnetRadius * 1.1);
    icePearls.forEach(function (pl) {
      if (pl.collected) return;
      pl.phase += dt * 3.0;
      var py = pl.y + Math.sin(pl.phase) * 4;
      var d = Math.hypot(boat.x - pl.x, boat.y - py);
      if (d < 46) {
        pl.collected = true;
        boat.runStars += Math.max(3, Math.round(pl.value * st.starMult));
        boat.breath = Math.min(1.0, (boat.breath || 0) + 0.14);
        if (window.MT.Audio) window.MT.Audio.playHookCatch();
      } else if (inSub && d < magR) {
        pl.x += (boat.x - pl.x) * Math.min(1, dt * 10);
        pl.y += (boat.y - pl.y) * Math.min(1, dt * 10);
      }
    });

    for (var sni = sonarWaves.length - 1; sni >= 0; sni--) {
      var sn = sonarWaves[sni];
      sn.life -= dt;
      sn.r = sn.maxR * (1 - Math.max(0, sn.life / sn.maxLife));
      if (sn.life <= 0) sonarWaves.splice(sni, 1);
    }

    for (var si = shards.length - 1; si >= 0; si--) {
      var sh = shards[si];
      sh.life -= dt;
      sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.vy += 240 * dt; sh.ang += sh.vAng * dt;
      if (sh.life <= 0) shards.splice(si, 1);
    }

    // 拾取 4 枚霜穹冰海遗物 + 实时抓拍水彩邮票！
    frostRelics.forEach(function (rl) {
      if (rl.pickedThisRun) return;
      rl.phase += dt * 2.8;
      var ry = rl.yMode === 'sky' ? (eras.getSurfaceY(rl.x, t) + rl.yVal) : rl.yVal;
      var d = Math.hypot(boat.x - rl.x, boat.y - ry);
      if (d < 54) {
        rl.pickedThisRun = true;
        var isNew = window.MT.Shop && window.MT.Shop.collectRelic ? window.MT.Shop.collectRelic('frost_sea', rl.id) : false;
        var val = Math.round((isNew ? 48 : 18) * (st.starMult || 1));
        boat.runStars += val;
        boat.breath = 1.0;
        var snapUrl = null;
        if ((isNew || (window.MT.Shop && window.MT.Shop.getSnapshot && !window.MT.Shop.getSnapshot(rl.id))) &&
            window.MT.Snapshot && window.MT.Snapshot.captureFromLiveCanvas) {
          snapUrl = window.MT.Snapshot.captureFromLiveCanvas(rl.id, rl.name, rl.x, ry);
          window.MT.Snapshot.triggerShutterFlash();
        }
        if (window.MT.Audio && window.MT.Audio.playRelicFound) window.MT.Audio.playRelicFound();
        eras.emitRing(rl.x, ry, '#ffe89c');
        eras.addPopup(rl.x, ry - 42, (isNew ? '◈ 发现冰海遗物「' : '◈ 重逢「') + rl.name + '」+' + val + '✦', '#fff4c2');
        if (isNew && typeof window.MT.onCodexDiscover === 'function') {
          window.MT.onCodexDiscover({ kind: 'relic', id: rl.id, name: rl.name, snapshot: snapUrl });
        }
      }
    });

    // 自动邂逅收录 2 大极地天象奇观（极昼冰雾 / 翡翠粉紫极光）
    wonderCheckCd -= dt;
    if (wonderCheckCd <= 0 && window.MT.Shop && window.MT.Shop.discoverWonder) {
      wonderCheckCd = 1.8;
      var ebF = eras.getEraBlend ? eras.getEraBlend(boat.x) : null;
      var fp = ebF && ebF.frostPhase;
      var wPick = null;
      if (fp && fp.polarMist > 0.55 && !boat.isDiving) wPick = { id: 'wonder_polar_mist', name: '极昼冰雾' };
      else if (fp && fp.aurora > 0.55) wPick = { id: 'wonder_aurora_night', name: '翡翠粉紫极光' };
      if (wPick && window.MT.Shop.discoverWonder(wPick.id)) {
        var wSnap = (window.MT.Snapshot && window.MT.Snapshot.captureFromLiveCanvas)
          ? window.MT.Snapshot.captureFromLiveCanvas(wPick.id, wPick.name, boat.x, boat.y)
          : null;
        if (window.MT.Snapshot) window.MT.Snapshot.triggerShutterFlash();
        if (window.MT.Audio && window.MT.Audio.playShutterSnap) window.MT.Audio.playShutterSnap();
        boat.runStars += Math.round(22 * (st.starMult || 1));
        if (typeof onLevelEvent === 'function') {
          onLevelEvent('codex_discover', { kind: 'wonder', id: wPick.id, name: wPick.name, snapshot: wSnap });
        } else if (typeof window.MT.onCodexDiscover === 'function') {
          window.MT.onCodexDiscover({ kind: 'wonder', id: wPick.id, name: wPick.name, snapshot: wSnap });
        }
      }
    }

    if (window.MT.IceFauna && window.MT.IceFauna.update) {
      window.MT.IceFauna.update(dt, boat, eras, onLevelEvent);
    }
    if (window.MT.IceShrines && window.MT.IceShrines.update) {
      window.MT.IceShrines.update(dt, boat, eras, onLevelEvent);
    }
    if (window.MT.Audio && window.MT.Audio.setUnderwater) {
      window.MT.Audio.setUnderwater(boat.isDiving ? clamp(boat.submergeDepth / 85, 0.35, 0.85) : 0);
    }
  }

  function triggerActiveSonar(boat, eras, onLevelEvent) {
    if (!boat || !eras || activeSonarCd > 0) return false;
    var st = boat.stats || { tideSonarLv: 0 };
    var sLv = st.tideSonarLv || 0;
    activeSonarMaxCd = Math.max(1.35, 2.45 - sLv * 0.35);
    activeSonarCd = activeSonarMaxCd;
    boat.activeSonarCdFrac = 1.0;
    iceEchoReveal = 1.0;

    var range = 410 + sLv * 115;
    sonarWaves.push({ x: boat.x, y: boat.y, r: 16, maxR: range, life: 1.45, maxLife: 1.45 });
    if (window.MT.Audio && window.MT.Audio.playActiveSonarPing) window.MT.Audio.playActiveSonarPing();

    iceArches.forEach(function (ia) {
      if (Math.hypot(boat.x - ia.cx, boat.y - ia.apexY) < range + 260) {
        ia.echo = 1.0;
        ia.pocketGlow = 0.9;
      }
    });
    // 1. 优先响应 3 座冰海共鸣碑与 2 组声呐控角冰棱镜折光解谜！
    var shrineHandled = false;
    if (window.MT.IceShrines && window.MT.IceShrines.onActiveSonar) {
      shrineHandled = !!window.MT.IceShrines.onActiveSonar(boat.x, boat.y, range, boat, eras, onLevelEvent);
    }

    // 2. 高亮周边薄冰裂纹；若未触发古碑且潜艇正下方/前方有未碎薄冰，可唤醒附近独角鲸助你撞碎薄冰！
    var struckIce = false;
    iceCaps.forEach(function (ic) {
      if (ic.broken) return;
      var icMid = (ic.x0 + ic.x1) * 0.5;
      if (ic.kind === 'thin' && Math.abs(boat.x - icMid) < range + 140) {
        ic.flash = 1.0;
        if (!shrineHandled && !struckIce && Math.abs(boat.x - icMid) < 260 && boat.y > 40 && boat.y < 320) {
          if (window.MT.IceFauna && window.MT.IceFauna.summonNarwhalStrike) {
            struckIce = window.MT.IceFauna.summonNarwhalStrike(
              icMid, eras.getSurfaceY(icMid, eras.getTime()) + 12,
              function () { shatterIceCap(ic, boat, eras, boat.stats || { starMult: 1 }); },
              eras
            );
          }
        }
      }
    });

    if (window.MT.IceFauna && window.MT.IceFauna.onActiveSonar) {
      window.MT.IceFauna.onActiveSonar(boat.x, boat.y, range, boat, eras, onLevelEvent);
    }
    return true;
  }

  // === 分层绘制 1：水下极地地貌、冰盖底面、地热暖泉、古帆船、冰下石拱与极地生态！===
  function drawUnderWater(ctx, state) {
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    var viewBottom = state.viewBottom;
    var eras = window.MT.Eras;
    var art = window.MT.Art;
    var lampGlow = art.getLampGlowSprite ? art.getLampGlowSprite() : null;

    ctx.save();

    // 1. 深谷孔雀蓝天然冰蚀石拱（画于海床剪影前，拱脚自然半埋冰沙之中！）
    iceArches.forEach(function (ia) {
      if (ia.cx + ia.span * 0.7 < viewLeft - 140 || ia.cx - ia.span * 0.7 > viewRight + 140) return;
      var half = ia.span * 0.5;
      var halfOut = ia.span * 0.56;
      var step = 18;
      var innerY = function (x) {
        var u = clamp((x - ia.cx) / half, -1, 1);
        return (ia.floorRef - 4) - Math.sqrt(Math.max(0, 1 - u * u)) * ((ia.floorRef - 4) - ia.apexY);
      };
      var outerY = function (x) {
        var u = clamp((x - ia.cx) / halfOut, -1, 1);
        var lift = Math.sqrt(Math.max(0, 1 - u * u));
        return (ia.floorRef + 40) - lift * ((ia.floorRef + 40) - (ia.apexY - ia.thickness)) + Math.sin(x * 0.012 + ia.seed) * 6 * lift;
      };

      ctx.save();
      var gGlow = ctx.createRadialGradient(ia.cx, ia.floorRef - 60, 16, ia.cx, ia.floorRef - 60, half * 0.95);
      gGlow.addColorStop(0, 'rgba(128, 242, 248, ' + (0.16 + ia.echo * 0.16) + ')');
      gGlow.addColorStop(1, 'rgba(20, 62, 92, 0)');
      ctx.fillStyle = gGlow;
      ctx.beginPath(); ctx.ellipse(ia.cx, ia.floorRef - 45, half * 0.95, 175, 0, Math.PI, 0); ctx.closePath(); ctx.fill();

      ctx.beginPath();
      ctx.moveTo(ia.cx - halfOut, ia.floorRef + 120);
      for (var ox = ia.cx - halfOut; ox <= ia.cx + halfOut; ox += step) ctx.lineTo(ox, outerY(ox));
      ctx.lineTo(ia.cx + halfOut, ia.floorRef + 120);
      ctx.lineTo(ia.cx + half, ia.floorRef + 120);
      for (var ix = ia.cx + half; ix >= ia.cx - half; ix -= step) ctx.lineTo(ix, innerY(ix));
      ctx.lineTo(ia.cx - half, ia.floorRef + 120);
      ctx.closePath();

      var ag = ctx.createLinearGradient(0, ia.apexY - ia.thickness, 0, ia.floorRef + 40);
      ag.addColorStop(0.0, '#4a8eb0');
      ag.addColorStop(0.45, '#255c7e');
      ag.addColorStop(1.0, '#102f4c');
      ctx.fillStyle = ag;
      ctx.fill();

      // 冰拱顶隐藏亮银空气气室
      var airG = ctx.createRadialGradient(ia.cx, ia.apexY + 8, 6, ia.cx, ia.apexY + 14, 96);
      airG.addColorStop(0, 'rgba(236, 254, 255, ' + (0.64 + ia.pocketGlow * 0.25) + ')');
      airG.addColorStop(0.55, 'rgba(148, 236, 252, ' + (0.30 + ia.pocketGlow * 0.30) + ')');
      airG.addColorStop(1, 'rgba(112, 204, 238, 0)');
      ctx.fillStyle = airG;
      ctx.beginPath(); ctx.ellipse(ia.cx, ia.apexY + 14, 72, 26, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    });

    // 2. 6 处海底地热暖泉绿洲（暖琥珀火山裂隙 + 上升暖金热流羽！）
    warmSprings.forEach(function (ws) {
      if (ws.x < viewLeft - 140 || ws.x > viewRight + 140) return;
      ctx.save();
      var baseGlow = ctx.createRadialGradient(ws.x, ws.bedY - 12, 8, ws.x, ws.bedY - 12, 118);
      baseGlow.addColorStop(0.0, 'rgba(255, 224, 146, 0.52)');
      baseGlow.addColorStop(0.45, 'rgba(244, 152, 92, 0.22)');
      baseGlow.addColorStop(1.0, 'rgba(244, 152, 92, 0)');
      ctx.fillStyle = baseGlow;
      ctx.beginPath(); ctx.arc(ws.x, ws.bedY - 12, 118, 0, Math.PI * 2); ctx.fill();

      // 柔和上升暖金热流带
      ctx.lineCap = 'round';
      for (var ln = -1; ln <= 1; ln++) {
        var tg = ctx.createLinearGradient(ws.x, ws.bedY, ws.x, ws.bedY - ws.plumeH);
        tg.addColorStop(0.0, 'rgba(255, 214, 132, ' + (ln === 0 ? 0.48 : 0.24) + ')');
        tg.addColorStop(0.6, 'rgba(164, 242, 224, ' + (ln === 0 ? 0.28 : 0.14) + ')');
        tg.addColorStop(1.0, 'rgba(164, 242, 224, 0)');
        ctx.strokeStyle = tg;
        ctx.lineWidth = ln === 0 ? 4.2 : 1.8;
        ctx.beginPath();
        for (var k = 0; k <= 10; k++) {
          var ku = k / 10;
          var ky = ws.bedY - ku * ws.plumeH;
          var kx = ws.x + ln * 16 + Math.sin(ku * 7 - t * 4.2 + ws.phase + ln) * 9;
          if (k === 0) ctx.moveTo(kx, ky); else ctx.lineTo(kx, ky);
        }
        ctx.stroke();
      }
      // 暖泡上升
      for (var b = 0; b < 6; b++) {
        var bu = ((t * 0.58 + b / 6 + ws.phase * 0.1) % 1);
        var by = ws.bedY - 8 - bu * ws.plumeH * 0.92;
        var bx = ws.x + Math.sin(bu * 10 + b * 2) * 20;
        ctx.strokeStyle = 'rgba(255, 244, 206, ' + (Math.sin(bu * Math.PI) * 0.72) + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(bx, by, 2.0 + (b % 3) * 0.9, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    });

    // 3. 发光冰晶矿簇 & 冰海星珠
    iceCrystals.forEach(function (cr) {
      if (cr.smashed || cr.x < viewLeft - 90 || cr.x > viewRight + 90) return;
      var pul = 0.8 + 0.2 * Math.sin(t * 2.8 + cr.phase);
      var cg = ctx.createRadialGradient(cr.x, cr.bedY - cr.h * 0.5, 4, cr.x, cr.bedY - cr.h * 0.5, cr.h * 1.15);
      cg.addColorStop(0, 'rgba(156, 248, 255, ' + (0.42 * pul) + ')');
      cg.addColorStop(1, 'rgba(116, 212, 242, 0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(cr.x, cr.bedY - cr.h * 0.5, cr.h * 1.15, 0, Math.PI * 2); ctx.fill();

      [-10, 0, 11].forEach(function (ox, idx2) {
        var sh = idx2 === 1 ? cr.h : cr.h * 0.72;
        var sw = idx2 === 1 ? 10 : 7.5;
        ctx.save();
        ctx.translate(cr.x + ox, cr.bedY + 8);
        ctx.rotate((idx2 - 1) * 0.22);
        var sg = ctx.createLinearGradient(-sw, -sh, sw, 10);
        sg.addColorStop(0, '#eefeff');
        sg.addColorStop(0.5, '#76e0f2');
        sg.addColorStop(1, '#245e84');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.moveTo(-sw, 14); ctx.lineTo(-sw * 0.7, -sh * 0.75);
        ctx.lineTo(0, -sh); ctx.lineTo(sw * 0.7, -sh * 0.72);
        ctx.lineTo(sw, 14); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
    });

    var iceGlowSp = art.getGlowSprite ? art.getGlowSprite('ice') : null;
    icePearls.forEach(function (pl) {
      if (pl.collected || pl.x < viewLeft - 40 || pl.x > viewRight + 40) return;
      var py = pl.y + Math.sin(pl.phase) * 4;
      var tw = 0.82 + 0.18 * Math.sin(pl.phase * 1.6);
      if (iceGlowSp) {
        var pd = 36 * tw;
        ctx.drawImage(iceGlowSp, pl.x - pd * 0.5, py - pd * 0.5, pd, pd);
      }
      ctx.fillStyle = '#f4ffff';
      ctx.beginPath(); ctx.arc(pl.x, py, 3.6 * tw, 0, Math.PI * 2); ctx.fill();
    });

    // 3b. 3 座冰海共鸣碑 + 2 组声呐控角冰棱镜与柔边折光极光束（先画再由平滑冰海床压脚！）
    if (window.MT.IceShrines && window.MT.IceShrines.drawUnderWater) {
      window.MT.IceShrines.drawUnderWater(ctx, state);
    }

    // 3c. 水下冰海遗物光环（螺旋冰牙笛、折光寒晶核、雪夜守望灯）
    frostRelics.forEach(function (rl) {
      if (rl.pickedThisRun || rl.yMode !== 'depth' || rl.x < viewLeft - 90 || rl.x > viewRight + 90) return;
      drawFrostRelic(ctx, rl, rl.x, rl.yVal, t);
    });

    // 4. 冰海极地生物生态层（沉眠冰渊巨龟、冰海天使、极光水母、独角鲸群）
    if (window.MT.IceFauna && window.MT.IceFauna.drawUnderWater) {
      window.MT.IceFauna.drawUnderWater(ctx, state);
    }

    // 5. 半封入冰层底部的古探险帆船船腹与受困暖灯空气气室！
    galleons.forEach(function (g) {
      if (g.x < viewLeft - 180 || g.x > viewRight + 180) return;
      var gy = eras.getSurfaceY(g.x, t) + 56;
      ctx.save();
      ctx.translate(g.x, gy);
      ctx.rotate(g.tilt);

      // 船底暖灯空气气室光晕
      var ag = ctx.createRadialGradient(0, 8, 8, 0, 8, 92);
      ag.addColorStop(0.0, 'rgba(255, 244, 202, ' + (0.48 + g.glow * 0.30) + ')');
      ag.addColorStop(0.55, 'rgba(156, 238, 248, ' + (0.22 + g.glow * 0.22) + ')');
      ag.addColorStop(1.0, 'rgba(116, 204, 232, 0)');
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.ellipse(0, 10, 84, 34, 0, 0, Math.PI * 2); ctx.fill();

      // 古木船体剪影
      var hg = ctx.createLinearGradient(0, -48, 0, 26);
      hg.addColorStop(0.0, '#6a483a');
      hg.addColorStop(0.6, '#483332');
      hg.addColorStop(1.0, '#28222c');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.moveTo(-88, -28);
      ctx.quadraticCurveTo(0, -18, 92, -32);
      ctx.quadraticCurveTo(78, 12, 46, 18);
      ctx.lineTo(-50, 18);
      ctx.quadraticCurveTo(-80, 12, -88, -28);
      ctx.closePath();
      ctx.fill();

      // 三扇透出暖琥珀光的小舷窗
      [-34, 0, 34].forEach(function (px) {
        if (lampGlow) {
          ctx.save();
          ctx.globalAlpha = 0.55;
          ctx.drawImage(lampGlow, px - 22, -26, 44, 44);
          ctx.restore();
        }
        ctx.fillStyle = '#fff5cf';
        ctx.beginPath(); ctx.arc(px, -4, 4.2, 0, Math.PI * 2); ctx.fill();
      });

      // 船底亮银水平空气面
      ctx.strokeStyle = 'rgba(242, 254, 255, 0.85)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-54, 20);
      ctx.quadraticCurveTo(0, 20 + Math.sin(t * 3.5) * 2.5, 54, 20);
      ctx.stroke();
      ctx.restore();
    });

    // 6. 水下冰盖厚实蓝冰底面与悬垂蓝冰柱（半透明水彩质地，薄冰显出柔美裂纹指引冲刺破冰！）
    iceCaps.forEach(function (ic) {
      if (ic.broken || ic.x1 < viewLeft - 60 || ic.x0 > viewRight + 60) return;
      var step = 20;
      ctx.save();
      ctx.beginPath();
      for (var x = ic.x0; x <= ic.x1; x += step) {
        var sy = eras.getSurfaceY(x, t) - 2;
        if (x === ic.x0) ctx.moveTo(x, sy); else ctx.lineTo(x, sy);
      }
      ctx.lineTo(ic.x1, eras.getSurfaceY(ic.x1, t) - 2);
      for (var x2 = ic.x1; x2 >= ic.x0; x2 -= step) {
        var edge = Math.min(smoothstep(ic.x0, ic.x0 + 48, x2), smoothstep(ic.x1, ic.x1 - 48, x2));
        var botY = eras.getSurfaceY(x2, t) + ic.thick * (0.35 + edge * 0.65)
          + Math.sin(x2 * 0.025 + ic.seed) * (ic.kind === 'thin' ? 2.5 : 7.0);
        ctx.lineTo(x2, botY);
      }
      ctx.closePath();

      var ig = ctx.createLinearGradient(0, -6, 0, ic.thick + 14);
      if (ic.kind === 'thin') {
        ig.addColorStop(0.0, 'rgba(214, 250, 255, 0.84)');
        ig.addColorStop(1.0, 'rgba(132, 224, 244, 0.66)');
      } else {
        ig.addColorStop(0.0, 'rgba(182, 232, 248, 0.90)');
        ig.addColorStop(0.6, 'rgba(92, 168, 204, 0.84)');
        ig.addColorStop(1.0, 'rgba(46, 108, 148, 0.78)');
      }
      ctx.fillStyle = ig;
      ctx.fill();

      // 可撞碎薄冰：柔美青白冰裂纹（声呐扫过时微微闪亮，一眼认出可以向上冲刺撞碎！）
      if (ic.kind === 'thin') {
        var crackA = clamp(0.45 + ic.flash * 0.5 + iceEchoReveal * 0.35, 0, 0.95);
        ctx.strokeStyle = 'rgba(244, 255, 255, ' + crackA + ')';
        ctx.lineWidth = 1.6 + ic.flash * 1.2;
        var mid = (ic.x0 + ic.x1) * 0.5;
        var syM = eras.getSurfaceY(mid, t) + ic.thick * 0.5;
        ctx.beginPath();
        ctx.moveTo(mid - 74, syM - 4); ctx.lineTo(mid - 26, syM + 5); ctx.lineTo(mid + 18, syM - 3); ctx.lineTo(mid + 68, syM + 4);
        ctx.moveTo(mid - 26, syM + 5); ctx.lineTo(mid - 8, syM - 10);
        ctx.moveTo(mid + 18, syM - 3); ctx.lineTo(mid + 34, syM + 11);
        ctx.stroke();
      }
      ctx.restore();
    });

    // 7. 连续平滑冰海岩床剪影（无缝压住石拱、暖泉与冰晶根部！）
    var deepBot = Math.max(1060, viewBottom + 180);
    var bStep = 22;
    var bs0 = Math.floor(viewLeft / bStep) * bStep;
    ctx.beginPath();
    ctx.moveTo(bs0, deepBot);
    for (var bx = bs0; bx <= viewRight + bStep; bx += bStep) {
      ctx.lineTo(bx, getFrostSeabedY(bx));
    }
    ctx.lineTo(viewRight + bStep, deepBot);
    ctx.closePath();

    var bedG = ctx.createLinearGradient(0, 320, 0, Math.max(820, viewBottom + 80));
    bedG.addColorStop(0.00, '#2a4a68');
    bedG.addColorStop(0.32, '#17304c');
    bedG.addColorStop(1.00, '#0a182c');
    ctx.fillStyle = bedG;
    ctx.fill();

    // 岩床顶沿轻柔雪蓝微光高光线（声呐扫过泛起极光青！）
    ctx.strokeStyle = iceEchoReveal > 0.05
      ? ('rgba(156, 250, 246, ' + (0.34 + iceEchoReveal * 0.52) + ')')
      : 'rgba(154, 212, 236, 0.24)';
    ctx.lineWidth = 2.0 + iceEchoReveal * 1.6;
    ctx.beginPath();
    for (var rx = bs0; rx <= viewRight + bStep; rx += bStep) {
      var ry = getFrostSeabedY(rx);
      if (rx === bs0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
    }
    ctx.stroke();

    // 8. 主动声呐水彩水波涟漪
    sonarWaves.forEach(function (sn) {
      var a = clamp(sn.life / sn.maxLife, 0, 1);
      ctx.strokeStyle = 'rgba(182, 252, 248, ' + (a * 0.48) + ')';
      ctx.lineWidth = 1.6 * a + 0.6;
      ctx.beginPath(); ctx.arc(sn.x, sn.y, sn.r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(218, 198, 255, ' + (a * 0.26) + ')';
      ctx.lineWidth = 1.0;
      ctx.beginPath(); ctx.arc(sn.x, sn.y, sn.r * 0.82, 0, Math.PI * 2); ctx.stroke();
    });

    // 碎冰晶粒
    shards.forEach(function (sh) {
      var a = clamp(sh.life / sh.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(sh.x, sh.y);
      ctx.rotate(sh.ang);
      ctx.fillStyle = '#dcfbff';
      ctx.beginPath(); ctx.moveTo(0, -sh.r); ctx.lineTo(sh.r * 0.65, 0); ctx.lineTo(0, sh.r); ctx.lineTo(-sh.r * 0.65, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    });

    ctx.restore();
  }

  // === 分层绘制 2：水面之上冰山雪丘、半封古帆船桅杆、西端跨海返航门与冰港补给锚桩！===
  function drawWorldBack(ctx, state) {
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    var eras = window.MT.Eras;
    var art = window.MT.Art;
    var pal = state.eb ? state.eb.palette : window.MT.Config.FROST_VOYAGE.ACTS[0].palette;
    var lampGlow = art.getLampGlowSprite ? art.getLampGlowSprite() : null;

    ctx.save();

    // 1. 远景柔和浮冰山峰（贴合各厚冰穹，水彩半透明棱面绝不挡月亮！）
    iceCaps.forEach(function (ic) {
      if (ic.broken || ic.kind !== 'thick' || ic.x1 < viewLeft - 140 || ic.x0 > viewRight + 140) return;
      var mid = (ic.x0 + ic.x1) * 0.5;
      var w = (ic.x1 - ic.x0) * 0.44;
      var h = ic.peakH || 46;
      var baseSurf = eras.getSurfaceY(mid, t) + 6;

      var mg = ctx.createLinearGradient(mid, baseSurf - h - 18, mid, baseSurf + 10);
      mg.addColorStop(0.0, art.rgb(art.lerpColor(pal.foam, [255, 255, 255], 0.35), 0.88));
      mg.addColorStop(0.55, art.rgb(art.lerpColor(pal.farSea, pal.foam, 0.48), 0.82));
      mg.addColorStop(1.0, art.rgb(pal.midSeaTop, 0.72));
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.moveTo(ic.x0 + 14, baseSurf);
      ctx.quadraticCurveTo(mid - w * 0.38, baseSurf - h * 0.85, mid - w * 0.08, baseSurf - h);
      ctx.quadraticCurveTo(mid + w * 0.34, baseSurf - h * 0.65, ic.x1 - 14, baseSurf);
      ctx.closePath();
      ctx.fill();
    });

    // 2. 半封冰古木探险帆船露出海面的倾斜残桅与风帆剪影
    galleons.forEach(function (g) {
      if (g.x < viewLeft - 160 || g.x > viewRight + 160) return;
      var sy = eras.getSurfaceY(g.x, t);
      ctx.save();
      ctx.translate(g.x, sy + 4);
      ctx.rotate(g.tilt);
      ctx.strokeStyle = '#4e3c42';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-12, 4); ctx.lineTo(-12, -88);
      ctx.moveTo(22, 4);  ctx.lineTo(22, -62);
      ctx.moveTo(-36, -54); ctx.lineTo(14, -50);
      ctx.stroke();
      // 结霜破帆
      ctx.fillStyle = 'rgba(222, 238, 248, 0.36)';
      ctx.beginPath();
      ctx.moveTo(-34, -52); ctx.quadraticCurveTo(-16, -34, 12, -48); ctx.quadraticCurveTo(-14, -22, -32, -26);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    });

    // 3. 西端「星潮跨海返航门」（x=320，双月石冰拱 + 翡翠暖金旋转星潮漩涡！）
    if (viewLeft < 620) {
      var px = 320;
      var py = eras.getSurfaceY(px, t);
      ctx.save();
      ctx.translate(px, py);

      var portalHalo = ctx.createRadialGradient(0, -48, 12, 0, -48, 130);
      portalHalo.addColorStop(0.0, 'rgba(156, 252, 234, 0.44)');
      portalHalo.addColorStop(0.5, 'rgba(255, 228, 158, 0.18)');
      portalHalo.addColorStop(1.0, 'rgba(116, 214, 242, 0)');
      ctx.fillStyle = portalHalo;
      ctx.beginPath(); ctx.arc(0, -48, 130, 0, Math.PI * 2); ctx.fill();

      // 拱门双柱
      ctx.fillStyle = '#385874';
      ctx.beginPath();
      ctx.moveTo(-58, 26); ctx.lineTo(-48, -88); ctx.quadraticCurveTo(-36, -108, -24, -84); ctx.lineTo(-32, 26); ctx.closePath();
      ctx.moveTo( 58, 26); ctx.lineTo( 48, -88); ctx.quadraticCurveTo( 36, -108,  24, -84); ctx.lineTo( 32, 26); ctx.closePath();
      ctx.fill();

      // 旋转翡翠星环
      for (var r = 0; r < 2; r++) {
        ctx.strokeStyle = r === 0 ? 'rgba(164, 254, 236, 0.72)' : 'rgba(255, 236, 174, 0.56)';
        ctx.lineWidth = r === 0 ? 2.4 : 1.5;
        ctx.beginPath();
        ctx.arc(0, -48, 28 + r * 11, t * (r === 0 ? 1.4 : -1.1), t * (r === 0 ? 1.4 : -1.1) + Math.PI * 1.45);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 全唤醒极光冰穹圣殿升腾冰晶浮灯
    if (window.MT.IceShrines && window.MT.IceShrines.drawSanctuaryWorld) {
      window.MT.IceShrines.drawSanctuaryWorld(ctx, state);
    }

    ctx.restore();
  }

  function drawFrostRelic(ctx, rl, x, y, t) {
    var owned = window.MT.Shop && window.MT.Shop.hasRelic && window.MT.Shop.hasRelic('frost_sea', rl.id);
    var breathe = 0.88 + 0.12 * Math.sin(t * 2.8 + rl.phase);
    var bob = Math.sin(t * 2.4 + rl.phase) * 5;
    ctx.save();
    ctx.translate(x, y + bob);
    var g = ctx.createRadialGradient(0, 0, 3, 0, 0, 36 * breathe);
    g.addColorStop(0.0, owned ? 'rgba(176, 246, 255, 0.72)' : 'rgba(255, 246, 198, 0.86)');
    g.addColorStop(0.5, owned ? 'rgba(116, 212, 242, 0.24)' : 'rgba(154, 248, 232, 0.32)');
    g.addColorStop(1.0, 'rgba(116, 212, 242, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 36 * breathe, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = owned ? 'rgba(182, 244, 255, 0.75)' : '#ffe99e';
    ctx.lineWidth = 2.0;
    ctx.beginPath(); ctx.arc(0, 0, 11.5, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = owned ? '#d4f8ff' : '#fff8d4';
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(5.5, 0); ctx.lineTo(0, 7); ctx.lineTo(-5.5, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // === 分层绘制 3：海面薄雪顶壳、漂浮碎冰块、冰港锚桩与跨海返航进度提示 ===
  function drawWorldStructures(ctx, state) {
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    var eras = window.MT.Eras;
    var boat = state.boat;
    var art = window.MT.Art;
    var lampGlow = art.getLampGlowSprite ? art.getLampGlowSprite() : null;

    ctx.save();

    // 1. 冰盖顶沿柔美积雪亮边
    iceCaps.forEach(function (ic) {
      if (ic.broken || ic.x1 < viewLeft - 40 || ic.x0 > viewRight + 40) return;
      ctx.strokeStyle = ic.kind === 'thin' ? 'rgba(216, 252, 255, 0.78)' : 'rgba(244, 252, 255, 0.92)';
      ctx.lineWidth = ic.kind === 'thin' ? 3.2 : 5.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (var x = ic.x0 + 4; x <= ic.x1 - 4; x += 20) {
        var sy = eras.getSurfaceY(x, t) - (ic.kind === 'thin' ? 1 : 3);
        if (x === ic.x0 + 4) ctx.moveTo(x, sy); else ctx.lineTo(x, sy);
      }
      ctx.stroke();
    });

    // 2. 被撞碎后随波飘摇的半透明碎冰块
    iceFloes.forEach(function (fl) {
      if (fl.x < viewLeft - 40 || fl.x > viewRight + 40) return;
      ctx.save();
      ctx.translate(fl.x, fl.y);
      ctx.rotate(fl.rot + Math.sin(fl.phase) * 0.08);
      ctx.fillStyle = 'rgba(222, 250, 255, 0.86)';
      ctx.beginPath(); art.drawRoundedRect(ctx, -fl.w * 0.5, -fl.h * 0.5, fl.w, fl.h, 3); ctx.fill();
      ctx.restore();
    });

    // 3. 冰海前哨补给锚桩（x=580，可慢停或按 E 开船坞改装暖铜破冰舱！）
    if (viewLeft < 780) {
      var pxH = 580;
      var pyH = eras.getSurfaceY(pxH, t);
      var nearH = boat && boat.inHarborZone;
      ctx.fillStyle = '#5c4238';
      ctx.fillRect(pxH - 5, pyH - 34, 10, 44);
      if (lampGlow) {
        ctx.save();
        ctx.globalAlpha = nearH ? 0.88 : 0.55;
        ctx.drawImage(lampGlow, pxH - 36, pyH - 70, 72, 72);
        ctx.restore();
      }
      ctx.fillStyle = '#fff5d4';
      ctx.beginPath(); ctx.arc(pxH, pyH - 38, 3.4, 0, Math.PI * 2); ctx.fill();

      if (nearH && boat) {
        var moorP = boat.harborMoorProg || 0;
        ctx.fillStyle = 'rgba(255, 246, 220, 0.94)';
        ctx.font = '500 11.5px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(moorP > 0.08 ? '正在系缆整备…' : '慢停或按 E 冰港整备', boat.x, boat.y - 96);
        if (moorP > 0.02) {
          ctx.strokeStyle = '#ffe89c';
          ctx.lineWidth = 3.2;
          ctx.beginPath(); ctx.arc(boat.x, boat.y - 74, 13, -Math.PI * 0.5, -Math.PI * 0.5 + moorP * Math.PI * 2); ctx.stroke();
        }
      }
    }

    // 3b. 海面/高空冰海遗物（极光星盘）
    frostRelics.forEach(function (rl) {
      if (rl.pickedThisRun || rl.yMode !== 'sky' || rl.x < viewLeft - 90 || rl.x > viewRight + 90) return;
      drawFrostRelic(ctx, rl, rl.x, eras.getSurfaceY(rl.x, t) + rl.yVal, t);
    });

    // 4. 跨海返航门进入提示
    if (boat && boat.inPortalZone === 'moon_sea') {
      var pp = boat.portalProg || 0;
      ctx.fillStyle = '#d4fff6';
      ctx.font = '500 12px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pp > 0.08 ? '正在穿越星潮航门…' : '慢停或按 E 返航「月潮之海」', boat.x, boat.y - 92);
      if (pp > 0.02) {
        ctx.strokeStyle = '#9efce8';
        ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.arc(boat.x, boat.y - 70, 13, -Math.PI * 0.5, -Math.PI * 0.5 + pp * Math.PI * 2); ctx.stroke();
      }
    }

    ctx.restore();
  }

  function drawWorldFront(ctx, state) {
    // 空中轻柔飘落的极地细雪
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewTop = state.viewTop;
    var spanW = Math.max(1200, state.viewRight - viewLeft);
    ctx.save();
    ctx.fillStyle = 'rgba(244, 252, 255, 0.56)';
    snowFlakes.forEach(function (sf) {
      var sx = viewLeft + (((sf.x + t * sf.vx) % spanW) + spanW) % spanW;
      var sy = viewTop + (((sf.y + t * sf.vy) % 420) + 420) % 420;
      if (sy > 12) return; // 雪花落到海面即化
      ctx.beginPath(); ctx.arc(sx + Math.sin(t * 1.8 + sf.phase) * 8, sy, sf.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  function drawHudOverlay() {}

  function getCompassLandmarks() {
    var shList = (window.MT.IceShrines && window.MT.IceShrines.getShrineListForCompass)
      ? window.MT.IceShrines.getShrineListForCompass()
      : [];
    return {
      homeX: 580,
      portalX: 320,
      arches: iceArches.map(function (ia) { return { id: ia.id, name: ia.name, x: ia.cx }; }),
      springs: warmSprings.map(function (ws) { return { x: ws.x }; }),
      shrines: shList
    };
  }

  function getRelicStatus() {
    var cnt = (window.MT.Shop && window.MT.Shop.getRelicCount) ? window.MT.Shop.getRelicCount('frost_sea') : 0;
    return { collected: cnt, total: frostRelics.length || 4 };
  }

  window.MT.LevelEngine.register('frost_sea', {
    reset: reset,
    getSeabedY: getFrostSeabedY,
    resetHarborCooldown: function () { harborMoorCd = 3.2; harborMoorProg = 0; portalCd = 3.2; portalProg = 0; },
    triggerActiveSonar: triggerActiveSonar,
    getCompassLandmarks: getCompassLandmarks,
    getRelicStatus: getRelicStatus,
    handleSurfacePhysics: handleSurfacePhysics,
    update: update,
    drawUnderWater: drawUnderWater,
    drawWorldBack: drawWorldBack,
    drawWorldStructures: drawWorldStructures,
    drawWorldFront: drawWorldFront,
    drawHudOverlay: drawHudOverlay
  });
})();
