window.MT = window.MT || {};

// v10 Step 1：第一章《月潮之海 · 落月沉渊》后半程独立深海子模块
// 负责：落月撞击紧急下潜转场 -> 沸腾赤海顶盖 -> 尘幕灰海浑浊光学 -> 双边界深海地形与流体潜航 -> 倒扣沉船气室与缓沉月陨
window.MT.Abyss = (function () {
  var airPockets = [];      // 倒扣沉船 / 半沉石拱空气气室（回满气息、燃料与微回耐久）
  var bubbleVents = [];     // 海底裂隙气柱（快速续气 + 柔和上托）
  var sinkingRocks = [];    // 撞击后从沸海缓缓沉降的炽热月陨岩块（拖沸腾气泡、砸海床爆泥沙烟幕、冲刺可撞碎）
  var deepPearls = [];      // 深海散落月尘星珠
  var siltClouds = [];      // 擦碰海床或陨石砸底扬起的灰褐色泥沙浑浊烟团
  var marineSnow = [];      // 尘幕灰海漫天缓降的火山灰絮 / 海雪微粒
  var buriedRuins = [];     // 灾后沉没环境叙事（倾倒路灯、折断铁桥架、微闪避难声呐浮标）
  var moonCrystals = [];    // 沉海月核矿柱（深潜鱼鳍冲刺可震碎爆星火与续气！）
  var fracturedVault = null; // 灾后震裂开启的隐藏海底月核秘窟（灾前被巨石封口，撞击后崩开露星火秘宝！）
  var escortWhales = [];    // 破晓上升大洋流伴游荧光蓝鲸（随船一路跃出破晓海面！）
  var crystalShards = [];   // 震碎月核矿柱飞散的青金发光晶屑
  var steamBubbles = [];    // 沸腾海面穹顶下方翻滚的气泡与蒸汽
  var dashBursts = [];      // 水下鱼鳍冲刺流光尾环
  var sonarTerrainReveal = 0; // 潮汐声呐扫过时短暂点亮海床轮廓的强度 (0..1)
  var ascentFanfarePlayed = false;

  var impactDone = false;
  var impactFlashLocal = 0;
  var rockSpawnTimer = 1.4;
  var pressurePulseCd = 0;
  var siltTrailCd = 0;
  var announcedAsh = false;
  var announcedKelp = false;
  var announcedAscent = false;
  var nextId = 1;

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function smoothstep(e0, e1, x) {
    var u = clamp((x - e0) / Math.max(0.0001, e1 - e0), 0, 1);
    return u * u * (3 - 2 * u);
  }

  function h1(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  function getCfg() {
    var sv = (window.MT.Config && window.MT.Config.SEA_VOYAGE) || {};
    return {
      impactX: sv.IMPACT_X || 14800,
      ashX: sv.ASH_START_X || 18000,
      kelpX: sv.KELP_START_X || 20800,
      ascentX: sv.ASCENT_X || 23600,
      dawnX: sv.DAWN_BEACON_X || 26100
    };
  }

  function isExplore() {
    return !!(window.MT.Config && window.MT.Config.EXPLORE_MODE);
  }

  function getLiveSeaPhase(worldX) {
    if (!window.MT.Eras || !window.MT.Eras.getEraBlend) return null;
    var eb = window.MT.Eras.getEraBlend(worldX || 520);
    return eb ? eb.seaPhase : null;
  }

  function getSeabedY(worldX) {
    var baseDepth = 396
      + Math.sin(worldX * 0.0017) * 38
      + Math.sin(worldX * 0.0041 + 1.4) * 18
      + Math.cos(worldX * 0.0089 + 0.7) * 7;
    if (isExplore()) {
      var wcS = (window.MT.Config && window.MT.Config.WORLD_CYCLE) || { MIN_X: 160, MAX_X: 9840 };
      var harborShelf = 1 - smoothstep(260, 1280, worldX);
      var valleyDip = (window.MT.Caves && window.MT.Caves.getValleyDepthOffset)
        ? window.MT.Caves.getValleyDepthOffset(worldX)
        : 0;
      var yBed = baseDepth - harborShelf * 84 + valleyDip;
      // 西端与东端水下礁坡自然缓升接通水面海角礁屿，彻底消灭水下“空旷深蓝撞空气墙”错觉！
      var westRise = 1 - smoothstep(wcS.MIN_X - 160, wcS.MIN_X + 120, worldX);
      var eastRise = smoothstep(wcS.MAX_X - 90, wcS.MAX_X + 210, worldX);
      yBed = yBed * (1 - westRise) + 46 * westRise;
      yBed = yBed * (1 - eastRise) + 44 * eastRise;
      return yBed;
    }
    var c = getCfg();
    var enterRamp = smoothstep(c.impactX - 420, c.impactX + 460, worldX);
    var exitRamp = 1 - smoothstep(c.ascentX - 240, c.ascentX + 680, worldX);
    var active = enterRamp * exitRamp;
    return baseDepth * active + 620 * (1 - active);
  }

  function getSeabedSlope(worldX) {
    return (getSeabedY(worldX + 12) - getSeabedY(worldX - 12)) / 24;
  }

  function getAbyssMix(worldX) {
    if (isExplore()) return 1.0;
    var c = getCfg();
    var enter = smoothstep(c.impactX - 160, c.impactX + 340, worldX);
    var exit = 1 - smoothstep(c.ascentX - 180, c.ascentX + 420, worldX);
    return enter * exit;
  }

  function getAshMix(worldX) {
    if (isExplore()) {
      var sp = getLiveSeaPhase(worldX);
      return sp ? (sp.ashSea || 0) : 0;
    }
    var c = getCfg();
    var enter = smoothstep(c.ashX - 520, c.ashX + 520, worldX);
    var fadeIntoKelp = 1 - smoothstep(c.kelpX - 420, c.kelpX + 680, worldX);
    return enter * fadeIntoKelp;
  }

  function getKelpMix(worldX) {
    if (isExplore()) {
      var sp = getLiveSeaPhase(worldX);
      return sp ? (sp.kelpAbyss || 0) : 0;
    }
    var c = getCfg();
    var enter = smoothstep(c.kelpX - 520, c.kelpX + 520, worldX);
    var exit = 1 - smoothstep(c.ascentX - 280, c.ascentX + 260, worldX);
    return enter * exit;
  }

  function getBoilMix(worldX) {
    if (isExplore()) {
      var sp = getLiveSeaPhase(worldX);
      return sp ? (sp.boilAbyss || 0) : 0;
    }
    var c = getCfg();
    var enter = smoothstep(c.impactX - 100, c.impactX + 240, worldX);
    var fade = 1 - smoothstep(c.ashX - 240, c.ashX + 680, worldX);
    return enter * fade;
  }

  function emitSilt(x, y, count, spreadVx, baseCol) {
    var n = count || 6;
    for (var i = 0; i < n; i++) {
      if (siltClouds.length > 85) siltClouds.shift();
      siltClouds.push({
        x: x + (Math.random() - 0.5) * 34,
        y: y - Math.random() * 14,
        vx: (spreadVx || 0) + (Math.random() - 0.5) * 58,
        vy: -16 - Math.random() * 44,
        r: 14 + Math.random() * 24,
        grow: 18 + Math.random() * 20,
        life: 1.4 + Math.random() * 0.9,
        maxLife: 2.3,
        col: baseCol || '118, 108, 98'
      });
    }
  }

  function seedMarineSnow() {
    marineSnow = [];
    for (var i = 0; i < 68; i++) {
      marineSnow.push({
        ox: Math.random() * 1400,
        oy: Math.random() * 560,
        r: 1.0 + Math.random() * 2.4,
        vy: 10 + Math.random() * 22,
        vx: -6 - Math.random() * 16,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.22 + Math.random() * 0.34
      });
    }
  }

  // 构建 14,800..23,400 深海避难带 & 尘幕灰海的手工气室、气柱、灾后废墟与深海星珠布局
  function buildAbyssLayout() {
    airPockets = [];
    bubbleVents = [];
    sinkingRocks = [];
    deepPearls = [];
    buriedRuins = [];

    var exp = isExplore();
    var pocketSpecs = exp ? [
      { x: 1480, kind: 'shipwreck',  w: 176, archH: 74, tilt: -0.06, name: '浅海渔船气室' },
      { x: 2340, kind: 'stone_arch', w: 192, archH: 82, tilt:  0.03, name: '西谷石拱气室' },
      { x: 5260, kind: 'shipwreck',  w: 186, archH: 76, tilt:  0.05, name: '旧镇旧船气室' },
      { x: 6960, kind: 'stone_arch', w: 196, archH: 84, tilt: -0.04, name: '海礁穹顶气室' },
      { x: 8780, kind: 'shipwreck',  w: 182, archH: 76, tilt: -0.05, name: '深渊避难气室' }
    ] : [
      { x: 15820, kind: 'shipwreck',  w: 176, archH: 74, tilt: -0.06, name: '倾覆渔船气室' },
      { x: 17260, kind: 'stone_arch', w: 192, archH: 82, tilt:  0.03, name: '沉没石拱气室' },
      { x: 19120, kind: 'shipwreck',  w: 186, archH: 76, tilt:  0.05, name: '灰海旧船气室' },
      { x: 20760, kind: 'stone_arch', w: 196, archH: 84, tilt: -0.04, name: '旧镇穹顶气室' },
      { x: 22340, kind: 'shipwreck',  w: 182, archH: 76, tilt: -0.05, name: '深海避难气室' }
    ];
    pocketSpecs.forEach(function (sp, idx) {
      var bedY = getSeabedY(sp.x);
      airPockets.push({
        id: nextId++,
        x: sp.x,
        y: bedY - sp.archH * 0.52,
        bedY: bedY,
        w: sp.w,
        archH: sp.archH,
        tilt: sp.tilt,
        kind: sp.kind,
        name: sp.name,
        refilledCd: 0,
        glow: 0,
        phase: idx * 1.7
      });
    });

    var ventXs = exp ? [960, 2140, 3880, 4640, 5880, 6540, 7180, 9160] : [15340, 16520, 17940, 18620, 19880, 20320, 21480, 22920];
    ventXs.forEach(function (vx, idx) {
      bubbleVents.push({
        id: nextId++,
        x: vx,
        bedY: getSeabedY(vx),
        height: 210 + (idx % 2) * 45,
        radius: 36,
        phase: idx * 1.3,
        boostCd: 0
      });
    });

    var pearlStreams = exp ? [
      { x0: 1120, span: 520, y: 200, amp: 36, cnt: 6 },
      { x0: 2680, span: 580, y: 245, amp: 42, cnt: 7 },
      { x0: 4240, span: 620, y: 220, amp: 40, cnt: 7 },
      { x0: 5760, span: 640, y: 260, amp: 48, cnt: 7 },
      { x0: 7340, span: 620, y: 235, amp: 46, cnt: 7 },
      { x0: 8580, span: 560, y: 185, amp: 40, cnt: 6 }
    ] : [
      { x0: 15140, span: 520, y: 190, amp: 38, cnt: 6 },
      { x0: 16180, span: 580, y: 245, amp: 46, cnt: 7 },
      { x0: 17620, span: 620, y: 210, amp: 40, cnt: 7 },
      { x0: 19480, span: 660, y: 260, amp: 52, cnt: 7 },
      { x0: 21160, span: 620, y: 235, amp: 48, cnt: 7 },
      { x0: 22660, span: 540, y: 175, amp: 42, cnt: 6 }
    ];
    pearlStreams.forEach(function (ps) {
      for (var i = 0; i < ps.cnt; i++) {
        var u = i / Math.max(1, ps.cnt - 1);
        deepPearls.push({
          x: ps.x0 + u * ps.span,
          y: ps.y + Math.sin(u * Math.PI) * ps.amp,
          phase: i * 0.55 + Math.random(),
          collected: false,
          value: 3
        });
      }
    });

    var ruinXs = exp ? [1280, 2420, 3560, 4480, 5540, 6360, 7420, 8260, 9120] : [15560, 16840, 18180, 18840, 19620, 20460, 21240, 21960, 22740];
    var ruinKinds = ['lamp', 'truss', 'beacon', 'lamp', 'beacon', 'truss', 'lamp', 'beacon', 'truss'];
    ruinXs.forEach(function (rx, idx) {
      buriedRuins.push({
        x: rx,
        bedY: getSeabedY(rx),
        kind: ruinKinds[idx % ruinKinds.length],
        tilt: (idx % 2 === 0 ? -1 : 1) * (0.14 + h1(idx * 3.1) * 0.16),
        phase: idx * 1.9
      });
    });

    if (!exp) {
      sinkingRocks.push({
        id: nextId++, x: 15540, y: 86, vx: -18, vy: 58,
        radius: 26, rot: 0.4, vRot: 0.45,
        smashed: false, grounded: false, glow: 1.0, phase: 0.3
      });
      sinkingRocks.push({
        id: nextId++, x: 16240, y: 138, vx: -14, vy: 54,
        radius: 30, rot: 1.2, vRot: -0.35,
        smashed: false, grounded: false, glow: 0.95, phase: 2.1
      });
    }

    moonCrystals = [];
    var crystalXs = exp ? [1840, 3620, 5420, 7180, 8860] : [16140, 17780, 19420, 20940, 22480];
    crystalXs.forEach(function (cx, idx) {
      moonCrystals.push({
        id: nextId++,
        x: cx,
        bedY: getSeabedY(cx),
        h: 72 + (idx % 2) * 20,
        w: 30,
        smashed: false,
        phase: idx * 1.4
      });
    });

    if (exp) {
      var vx = 6120;
      var vBed = getSeabedY(vx);
      var vStars = [];
      for (var vs = 0; vs < 6; vs++) {
        var vu = (vs / 5) - 0.5;
        vStars.push({
          x: vx + vu * 124,
          y: vBed - 36 - Math.cos(vu * Math.PI) * 24,
          phase: vs * 0.9,
          collected: false,
          value: 8
        });
      }
      fracturedVault = {
        x: vx,
        bedY: vBed,
        w: 210,
        h: 96,
        opened: false,
        openAnim: 0,
        stars: vStars
      };
    } else {
      fracturedVault = null;
    }

    // 7. 2 头破晓上升大洋流荧光护航蓝鲸（在大洋流两侧同步攀升，最终跃破晨光海面！）
    escortWhales = [
      { id: nextId++, x: 23060, y: 275, vx: 0, vy: 0, scale: 1.08, phase: 0.3, breached: false, active: false },
      { id: nextId++, x: 23240, y: 318, vx: 0, vy: 0, scale: 0.84, phase: 2.0, breached: false, active: false }
    ];
  }

  function reset(startX, mode) {
    siltClouds = [];
    crystalShards = [];
    steamBubbles = [];
    dashBursts = [];
    sonarTerrainReveal = 0;
    ascentFanfarePlayed = false;
    rockSpawnTimer = 1.2;
    pressurePulseCd = 0;
    siltTrailCd = 0;
    seedMarineSnow();
    buildAbyssLayout();

    var c = getCfg();
    var sx = typeof startX === 'number' ? startX : 120;
    impactDone = (mode === 'story' && sx >= c.impactX - 40);
    impactFlashLocal = 0;
    announcedAsh = sx >= c.ashX;
    announcedKelp = sx >= c.kelpX;
    announcedAscent = sx >= c.ascentX;
    if (window.MT.AbyssFauna && window.MT.AbyssFauna.reset) {
      window.MT.AbyssFauna.reset();
    }
    if (window.MT.Caves && window.MT.Caves.reset) {
      window.MT.Caves.reset();
    }
    if (window.MT.Shrines && window.MT.Shrines.reset) {
      window.MT.Shrines.reset();
    }
  }

  function spawnSinkingRock(boatX) {
    var c = getCfg();
    var exp = isExplore();
    var rx = exp
      ? clamp(boatX + (Math.random() - 0.5) * 980, 360, 9640)
      : (boatX + 460 + Math.random() * 340);
    if (!exp && rx > c.ascentX - 380) return;
    // 避开气室正上方，确保气室庇护绝对安全！
    for (var i = 0; i < airPockets.length; i++) {
      if (Math.abs(rx - airPockets[i].x) < 165) return;
    }
    var boil = getBoilMix(rx);
    sinkingRocks.push({
      id: nextId++,
      x: rx,
      y: 28,
      vx: -12 - Math.random() * 24,
      vy: 44 + Math.random() * 28,
      radius: 20 + Math.random() * 14,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 1.1,
      smashed: false,
      grounded: false,
      glow: clamp(0.35 + boil * 0.65, 0.25, 1.0),
      phase: Math.random() * 6
    });
  }

  // === 核心：深海流体潜航全向物理（A 上浮 / D 下潜 / 空格 水下鱼鳍冲刺，零新增按键！）===
  function handlePhysics(ctxObj) {
    var dt = ctxObj.dt;
    var boat = ctxObj.boat;
    var input = ctxObj.input;
    var eras = ctxObj.eras;
    var cfg = ctxObj.cfg;
    var st = ctxObj.st;
    var t = eras.getTime();

    if (!boat.inAbyss) return false;

    var c = getCfg();
    var waveY = eras.getSurfaceY(boat.x, t);
    var roofY = waveY + 26;
    var bedY = getSeabedY(boat.x);
    var boil = getBoilMix(boat.x);
    var ash = getAshMix(boat.x);

    boat.inWater = true;
    boat.isDiving = true;
    boat.ridingDeck = false;
    boat.cloudGliding = false;
    boat.submergeDepth = Math.max(0, boat.y - waveY);

    // 1. 丝滑俯仰舵控：A 抬头向上游，D 压头向下潜，松手柔和回正水平
    var finAgility = 1 + (st.deepFinsLv || 0) * 0.16;
    var targetAngle = 0;
    if (input.left && !input.right) targetAngle = -0.66;
    else if (input.right && !input.left) targetAngle = 0.66;

    var angleRate = (input.left || input.right) ? (6.8 * finAgility) : 3.8;
    boat.angle += ctxObj.normalizeAngle(targetAngle - boat.angle) * Math.min(1, dt * angleRate);
    boat.angularVel = 0;

    // 2. 水下鱼鳍爆发冲刺（轻点空格触发）+ 持续推进（按住空格）
    if (boat.abyssDashCd > 0) boat.abyssDashCd = Math.max(0, boat.abyssDashCd - dt);
    if (boat.abyssDashTimer > 0) boat.abyssDashTimer = Math.max(0, boat.abyssDashTimer - dt);

    var rawBoostEdge = !!input.boost && !boat.wasAbyssBoost;
    boat.wasAbyssBoost = !!input.boost;

    var cosA = Math.cos(boat.angle);
    var sinA = Math.sin(boat.angle);

    if (rawBoostEdge && boat.abyssDashCd <= 0) {
      var dashCooldown = Math.max(0.65, 1.25 - (st.deepFinsLv || 0) * 0.18);
      boat.abyssDashCd = dashCooldown;
      boat.abyssDashTimer = 0.36;
      boat.breachSmashTimer = Math.max(boat.breachSmashTimer || 0, 0.46 + (st.deepFinsLv || 0) * 0.10);
      var dashSpd = 465 + (st.rocketLv || 0) * 28 + (st.deepFinsLv || 0) * 32;
      boat.vx = Math.max(boat.vx + 135, cosA * dashSpd);
      boat.vy = sinA * dashSpd * 0.85;
      boat.trickAura = Math.max(boat.trickAura, 0.78);
      dashBursts.push({ x: boat.x, y: boat.y, r: 14, maxR: 58, life: 0.42, maxLife: 0.42 });
      if (window.MT.Audio && window.MT.Audio.playHydroDash) window.MT.Audio.playHydroDash();
      if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
        window.MT.RenderWorld.triggerImpact(0.014, 0.022, 2.4);
      }
    }

    // 流畅巡航矢量速度（高空风帆流深海第二形态「蝠鲼流体滑翔翼」大幅提升滑行惯性与续航！）
    var mantaLv = st.skySailLv || 0;
    var cruiseSpd = 265 + (st.rocketLv || 0) * 22 + (st.deepFinsLv || 0) * 18 + mantaLv * 16;
    var boostSpd = 405 + (st.rocketLv || 0) * 30 + (st.deepFinsLv || 0) * 24 + mantaLv * 14;
    var activeThrust = !!(input.boost && boat.fuel > 0.015);
    boat.boosting = activeThrust;

    if (activeThrust) {
      boat.fuel = Math.max(0, boat.fuel - cfg.FUEL_BURN_RATE * (0.58 - mantaLv * 0.06) * st.burnRateMult * dt);
      var desiredVx = Math.max(190, cosA * boostSpd);
      var desiredVy = sinA * boostSpd * 0.82;
      boat.vx += (desiredVx - boat.vx) * Math.min(1, dt * 4.6);
      boat.vy += (desiredVy - boat.vy) * Math.min(1, dt * 5.2);
    } else {
      // 蝠鲼流体滑翔翼（Lv.3）：滑行时缓回燃料与微回气息，减慢速度衰减留住超长滑行惯性！
      boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + (0.16 + mantaLv * 0.06) * dt);
      var targetVx = Math.max(175, cosA * cruiseSpd);
      var targetVy = sinA * cruiseSpd * 0.86;
      var glideDrag = mantaLv >= 1 ? Math.max(1.15, 2.8 - mantaLv * 0.52) : 2.8;
      if (boat.abyssDashTimer <= 0) {
        boat.vx += (targetVx - boat.vx) * Math.min(1, dt * glideDrag);
        boat.vy += (targetVy - boat.vy) * Math.min(1, dt * 4.4);
      }
    }

    // 3. 顶部边界：沸腾赤海穹顶（热浪下推 + 灼伤警示） / 尘幕灰海浮尘顶壳（阻止换气）
    if (boat.y < roofY + 42) {
      var roofProximity = clamp(1 - (boat.y - roofY) / 42, 0, 1);
      if (boil > 0.25) {
        boat.heatStress = Math.min(1, Math.max(boat.heatStress || 0, roofProximity * boil));
        boat.vy += (240 + roofProximity * 420) * dt;
        if (boat.y < roofY + 12 && boat.feverTimer <= 0) {
          var burnDps = 14 * boil * (1 - (st.deepFinsLv || 0) * 0.15);
          boat.hull = Math.max(0, boat.hull - burnDps * dt);
          if (Math.random() < dt * 16) {
            eras.emitSpark(boat.x + (Math.random() - 0.5) * 32, roofY, -boat.vx * 0.2, 35, '#ffaa66', 2.4, 0.45);
          }
        }
      } else {
        // 尘幕灰海阶段：海面被厚重灰渣覆盖，柔和压回水下并扬起浮灰
        boat.vy += (160 + roofProximity * 320) * dt;
        if (boat.y < roofY + 10 && Math.random() < dt * 10) {
          emitSilt(boat.x, roofY + 6, 1, -boat.vx * 0.18, '124, 122, 118');
        }
      }
      if (boat.y < roofY + 4) {
        boat.y = roofY + 4;
        if (boat.vy < 0) boat.vy = 25;
      }
    } else {
      boat.heatStress = Math.max(0, (boat.heatStress || 0) - dt * 2.2);
    }

    // 4. 底部边界：断裂海床柔和贴滑 + 真实泥沙尾烟！
    var floorLimit = bedY - 20;
    if (boat.y >= floorLimit) {
      boat.y = floorLimit;
      var bedSlope = getSeabedSlope(boat.x);
      var bedAng = Math.atan(bedSlope);
      if (boat.vy > 0) boat.vy *= 0.2;
      boat.angle += ctxObj.normalizeAngle(Math.min(0, bedAng) - boat.angle) * Math.min(1, dt * 8);
      boat.vx *= Math.pow(0.84, dt);
      siltTrailCd -= dt;
      if (siltTrailCd <= 0) {
        siltTrailCd = 0.085;
        emitSilt(boat.x - 18, bedY - 4, 2, -boat.vx * 0.26, ash > 0.35 ? '118, 114, 108' : '116, 98, 92');
      }
    }

    // 5. 深海气息博弈（相比短潜节奏更舒展：无改装约 10.5s 满气，配合气室与气泡柱张弛有度！）
    var inSafePocket = false;
    for (var pi = 0; pi < airPockets.length; pi++) {
      var ap = airPockets[pi];
      if (Math.abs(boat.x - ap.x) < ap.w * 0.44 && boat.y > ap.bedY - ap.archH - 6 && boat.y < ap.bedY + 12) {
        inSafePocket = true;
        break;
      }
    }

    if (!inSafePocket) {
      var depthFactor = clamp((boat.y - 120) / 260, 0, 1);
      var mantaBreathSave = (st.skySailLv || 0) >= 1 ? (1 - (st.skySailLv * 0.10)) : 1.0;
      var baseDrain = (0.082 + depthFactor * 0.036) * (st.breathDrainMult || 1.0) * mantaBreathSave * (boat.feverTimer > 0 ? 0.40 : 1.0);
      boat.breath = Math.max(0, (typeof boat.breath === 'number' ? boat.breath : 1.0) - baseDrain * dt);

      if (boat.breath < 0.30 && boat.breath > 0) {
        boat.breathLowPulse = 1.0;
        pressurePulseCd -= dt;
        if (pressurePulseCd <= 0) {
          pressurePulseCd = 0.62;
          if (window.MT.Audio && window.MT.Audio.playPressurePulse) window.MT.Audio.playPressurePulse();
        }
      }
      if (boat.breath <= 0.001 && boat.feverTimer <= 0) {
        // 深海窒息持续扣耐久，催促立刻钻进前方气室或气柱！
        boat.hull = Math.max(0, boat.hull - 9.5 * dt);
        boat.hurtFlash = Math.max(boat.hurtFlash, 0.35);
      }
    }

    // 6. 乘「海底上升大洋流」（x >= ascentX - 650）伴随荧光蓝鲸扶摇直上、冲破冷却海面迎来破晓！
    var currentStartX = c.ascentX - 650;
    if (boat.x >= currentStartX) {
      var cu = clamp((boat.x - currentStartX) / 860, 0, 1);
      boat.breath = 1.0;
      boat.fuel = window.MT.Config.SURF.MAX_FUEL;
      boat.heatStress = 0;
      boat.vx = Math.max(boat.vx + 185 * dt, 340 + cu * 120);
      boat.vy += ((-260 - cu * 155) - boat.vy) * Math.min(1, dt * 4.2);
      boat.angle += ctxObj.normalizeAngle(-0.46 - boat.angle) * Math.min(1, dt * 6.5);

      if (boat.y <= waveY + 12) {
        boat.inAbyss = false;
        boat.isDiving = false;
        boat.inWater = false;
        boat.y = waveY - 14;
        boat.vy = -385;
        boat.vx = Math.max(boat.vx, 395);
        boat.angle = -0.52;
        boat.breath = 1.0;
        boat.heatStress = 0;
        boat.trickAura = 1.0;
        if (window.MT.Audio && window.MT.Audio.playDawnAscentFanfare) {
          window.MT.Audio.playDawnAscentFanfare();
        } else if (window.MT.Audio && window.MT.Audio.playBreach) {
          window.MT.Audio.playBreach(1.0);
        }
        if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
          window.MT.RenderWorld.triggerImpact(0.036, 0.055, 5.2);
        }
        eras.emitSplash(boat.x, waveY, 34, '#fff4dc', 110);
        eras.emitRing(boat.x, waveY, '#ffe8a4');
        eras.emitRing(boat.x, waveY, '#a6f4ff');
        eras.addPopup(boat.x, waveY - 62, '✦ 乘大洋流破晓重返！', '#fff4be');
      }
    }

    return true;
  }

  // === 核心：深海世界更新、撞击触发、气室换气、气柱续气与缓沉月陨交互 ===
  function update(dt, boat, eras, onLevelEvent, addComboFn) {
    var t = eras.getTime();
    var c = getCfg();
    var st = boat.stats || { starMult: 1, crashDamageMult: 1, magnetRadius: 82 };
    var isStory = !(eras.isEndlessMode && eras.isEndlessMode());

    if (impactFlashLocal > 0) impactFlashLocal = Math.max(0, impactFlashLocal - dt * 1.1);

    var exp = isExplore();
    var ashNow = getAshMix(boat.x);
    var boilNow = getBoilMix(boat.x);
    var kelpNow = getKelpMix(boat.x);

    if (exp) {
      var wClk = eras.getWorldClock ? eras.getWorldClock() : 0;
      var tImp = (window.MT.Config.WORLD_CYCLE && window.MT.Config.WORLD_CYCLE.T_IMPACT) || 210;
      if (wClk < tImp - 20) {
        impactDone = false;
      } else if (!impactDone && wClk >= tImp && wClk < tImp + 12) {
        impactDone = true;
        impactFlashLocal = 1.0;
        if (window.MT.Audio && window.MT.Audio.playImpactBoom) window.MT.Audio.playImpactBoom();
        if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
          window.MT.RenderWorld.triggerImpact(0.045, 0.068, 12.0);
        }
        var surfNow = eras.getSurfaceY(boat.x, t);
        if (boat.y < surfNow + 48) {
          boat.isDiving = true;
          boat.inAbyss = true;
          boat.y = Math.max(boat.y, surfNow + 52);
          boat.vy = Math.max(boat.vy, 110);
        }
      }

      var deepNow = boat.isDiving && (boat.submergeDepth > 44 || boilNow > 0.2 || ashNow > 0.2);
      var wantCanopyE = (deepNow || boilNow > 0.22 || ashNow > 0.22) ? 1.0 : 0.0;
      boat.canopyOpen = (boat.canopyOpen || 0) + (wantCanopyE - (boat.canopyOpen || 0)) * Math.min(1, dt * 4.2);

      var wantSpotE = boat.isDiving
        ? clamp(0.32 + clamp((boat.submergeDepth - 40) / 160, 0, 0.35) + ashNow * 0.55 + boilNow * 0.25, 0.32, 1.0)
        : (ashNow * 0.45);
      boat.spotlightStrength = (boat.spotlightStrength || 0) + (wantSpotE - (boat.spotlightStrength || 0)) * Math.min(1, dt * 3.0);
    } else {
      if (isStory && !impactDone && boat.x >= c.impactX && boat.x < c.ascentX) {
        impactDone = true;
        impactFlashLocal = 1.0;
        boat.inAbyss = true;
        boat.isDiving = true;
        boat.inWater = true;
        boat.ridingDeck = false;
        boat.cloudGliding = false;
        boat.breath = 1.0;
        boat.fuel = window.MT.Config.SURF.MAX_FUEL;
        boat.y = Math.max(boat.y, eras.getSurfaceY(boat.x, t) + 75);
        boat.vy = 145;
        boat.vx = Math.max(boat.vx, 285);
        boat.angle = 0.34;
        if (window.MT.Shop && window.MT.Shop.unlockAbyssCheckpoint) window.MT.Shop.unlockAbyssCheckpoint();
        if (window.MT.Audio && window.MT.Audio.playImpactBoom) window.MT.Audio.playImpactBoom();
        if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) window.MT.RenderWorld.triggerImpact(0.045, 0.075, 13.0);
      }
      var wantCanopy = boat.inAbyss ? 1.0 : 0.0;
      boat.canopyOpen = (boat.canopyOpen || 0) + (wantCanopy - (boat.canopyOpen || 0)) * Math.min(1, dt * 4.5);
      var wantSpot = boat.inAbyss ? clamp(0.45 + ashNow * 0.55 + boilNow * 0.22, 0.45, 1.0) : 0;
      boat.spotlightStrength = (boat.spotlightStrength || 0) + (wantSpot - (boat.spotlightStrength || 0)) * Math.min(1, dt * 3.0);
    }

    if (sonarTerrainReveal > 0) sonarTerrainReveal = Math.max(0, sonarTerrainReveal - dt * 0.45);

    if (window.MT.Audio && window.MT.Audio.setSeaMood) {
      var moodNow = 'surface';
      var liveSp = getLiveSeaPhase(boat.x);
      if (exp && liveSp) {
        if (liveSp.dawn > 0.4) moodNow = 'dawn';
        else if (liveSp.kelpAbyss > 0.35) moodNow = 'kelp';
        else if (liveSp.ashSea > 0.35) moodNow = 'ash';
        else if (liveSp.boilAbyss > 0.25) moodNow = 'boil';
        else moodNow = 'surface';
      } else {
        if (boat.x >= c.ascentX + 260 && !boat.inAbyss) moodNow = 'dawn';
        else if (boat.x >= c.ascentX - 650 && boat.inAbyss) moodNow = 'ascent';
        else if (kelpNow > 0.35) moodNow = 'kelp';
        else if (ashNow > 0.35) moodNow = 'ash';
        else if (boilNow > 0.25) moodNow = 'boil';
      }
      window.MT.Audio.setSeaMood(moodNow);
    }

    // 伴游荧光护航蓝鲸演出（接近上升大洋流即激活，与木舟齐头并进跃出破晓海面！）
    var currentStartX2 = c.ascentX - 650;
    if (boat.x >= currentStartX2 - 420) {
      escortWhales.forEach(function (ew, idx) {
        ew.phase += dt * 2.2;
        if (!ew.active) {
          ew.active = true;
          ew.x = Math.max(ew.x, boat.x - 160 + idx * 140);
          ew.y = Math.min(340, boat.y + 55 + idx * 38);
        }
        var targetX = boat.x + (idx === 0 ? 115 : -88);
        var targetY = boat.inAbyss
          ? (boat.y + (idx === 0 ? -36 : 52))
          : (eras.getSurfaceY(ew.x, t) - (ew.breached ? 4 : 58));
        ew.vx += (targetX - ew.x) * 3.0 * dt;
        ew.vy += (targetY - ew.y) * 2.8 * dt;
        ew.vx *= Math.pow(0.22, dt);
        ew.vy *= Math.pow(0.22, dt);
        ew.x += ew.vx * dt + Math.max(240, boat.vx * 0.92) * dt;
        ew.y += ew.vy * dt;

        var eSurf = eras.getSurfaceY(ew.x, t);
        if (!ew.breached && ew.y < eSurf - 6 && boat.x >= currentStartX2) {
          ew.breached = true;
          eras.emitSplash(ew.x, eSurf, 20, '#dcf8ff', 88);
          eras.emitRing(ew.x, eSurf, '#a8f4ff');
          if (!ascentFanfarePlayed) {
            ascentFanfarePlayed = true;
            if (window.MT.Audio && window.MT.Audio.playWhaleBounce) window.MT.Audio.playWhaleBounce();
          }
        }
      });
    }

    var mixNow = getAbyssMix(boat.x);
    if (mixNow < 0.01 && !boat.inAbyss) return;

    if (window.MT.AbyssFauna && window.MT.AbyssFauna.update) {
      window.MT.AbyssFauna.update(dt, boat, eras, addComboFn, onLevelEvent);
    }
    if (window.MT.Caves && window.MT.Caves.update) {
      window.MT.Caves.update(dt, boat, eras);
    }
    if (window.MT.Shrines && window.MT.Shrines.update) {
      window.MT.Shrines.update(dt, boat, eras, onLevelEvent);
    }

    // 深海月核矿柱交互（鱼鳍冲刺直接震碎爆海量星火与续气！）
    var dashRad = (st.deepFinsLv || 0) >= 2 ? 128 : 66;
    for (var mci = 0; mci < moonCrystals.length; mci++) {
      var mc = moonCrystals[mci];
      if (mc.smashed) continue;
      mc.phase += dt * 2.4;
      var cy = mc.bedY - mc.h * 0.55;
      var dM = Math.hypot(boat.x - mc.x, boat.y - cy);
      if ((boat.inAbyss || boat.isDiving) && dM < dashRad && (boat.abyssDashTimer > 0 || boat.breachSmashTimer > 0 || boat.feverTimer > 0)) {
        mc.smashed = true;
        var cStar = Math.round(24 * st.starMult * (st.sonarRelicMult || 1));
        boat.runStars += cStar;
        boat.breath = Math.min(1.0, (boat.breath || 0) + 0.24);
        boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.35);
        for (var sh = 0; sh < 10; sh++) {
          crystalShards.push({
            x: mc.x + (Math.random() - 0.5) * 26,
            y: cy + (Math.random() - 0.5) * 34,
            vx: (Math.random() - 0.35) * 210,
            vy: -90 - Math.random() * 150,
            ang: Math.random() * Math.PI * 2,
            vAng: (Math.random() - 0.5) * 10,
            r: 4 + Math.random() * 6,
            life: 1.0 + Math.random() * 0.45,
            maxLife: 1.45
          });
        }
        if (window.MT.Audio && window.MT.Audio.playCrystalShatter) window.MT.Audio.playCrystalShatter();
        eras.emitRing(mc.x, cy, '#9ef6ff');
        eras.emitRing(mc.x, cy, '#ffe89c');
        eras.addPopup(mc.x, cy - 42, '✦ 潜鳍震碎月核晶柱! +' + cStar + '✦', '#c8f8ff');
        if (typeof addComboFn === 'function') addComboFn(1, 6.8);
        if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
          window.MT.RenderWorld.triggerImpact(0.032, 0.046, 5.0);
        }
      }
    }

    if (fracturedVault && exp) {
      var wClkV = eras.getWorldClock ? eras.getWorldClock() : 0;
      var tImpV = (window.MT.Config.WORLD_CYCLE && window.MT.Config.WORLD_CYCLE.T_IMPACT) || 210;
      var shouldOpen = wClkV >= tImpV;
      if (shouldOpen && !fracturedVault.opened) {
        fracturedVault.opened = true;
        emitSilt(fracturedVault.x, fracturedVault.bedY, 12, 0, '124, 114, 108');
      } else if (!shouldOpen && fracturedVault.opened && wClkV < 30) {
        fracturedVault.opened = false;
        fracturedVault.openAnim = 0;
        fracturedVault.stars.forEach(function (stV) { stV.collected = false; });
      }
      var targetO = fracturedVault.opened ? 1.0 : 0.0;
      fracturedVault.openAnim += (targetO - fracturedVault.openAnim) * Math.min(1, dt * 1.8);

      if (fracturedVault.opened && (boat.isDiving || boat.inAbyss)) {
        fracturedVault.stars.forEach(function (vs) {
          if (vs.collected) return;
          vs.phase += dt * 3.2;
          var vy = vs.y + Math.sin(vs.phase) * 4;
          var dv = Math.hypot(boat.x - vs.x, boat.y - vy);
          if (dv < 52) {
            vs.collected = true;
            var sv2 = Math.round(vs.value * st.starMult * (st.sonarRelicMult || 1));
            boat.runStars += sv2;
            boat.breath = Math.min(1.0, (boat.breath || 0) + 0.20);
            boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.15);
            if (window.MT.Audio && window.MT.Audio.playCrystalShatter) window.MT.Audio.playCrystalShatter();
            eras.emitRing(vs.x, vy, '#ffe89e');
            eras.addPopup(vs.x, vy - 34, '✦ 秘窟月核星火 +' + sv2 + '✦', '#fff2b4');
          } else if (dv < 135) {
            vs.x += (boat.x - vs.x) * Math.min(1, dt * 8);
            vs.y += (boat.y - vs.y) * Math.min(1, dt * 8);
          }
        });
      }
    }

    for (var csi = crystalShards.length - 1; csi >= 0; csi--) {
      var shObj = crystalShards[csi];
      shObj.life -= dt;
      shObj.x += shObj.vx * dt;
      shObj.y += shObj.vy * dt;
      shObj.vy += 260 * dt;
      shObj.ang += shObj.vAng * dt;
      if (shObj.life <= 0) crystalShards.splice(csi, 1);
    }

    // 2. 更新水下低通滤波（深海段保持沉浸温润低通）
    if (boat.inAbyss && window.MT.Audio && window.MT.Audio.setUnderwater) {
      window.MT.Audio.setUnderwater(0.82);
    }

    // 3. 沸腾海面穹顶下方持续生成翻滚蒸汽泡
    if (boilNow > 0.12 && Math.random() < dt * 24 * boilNow) {
      if (steamBubbles.length > 65) steamBubbles.shift();
      var sbx = boat.x + (Math.random() - 0.35) * 960;
      steamBubbles.push({
        x: sbx,
        y: eras.getSurfaceY(sbx, t) + 12 + Math.random() * 24,
        vx: -20 - Math.random() * 25,
        vy: 14 + Math.random() * 26,
        r: 2.5 + Math.random() * 5.0,
        life: 0.9 + Math.random() * 0.7,
        maxLife: 1.6
      });
    }
    for (var sb = steamBubbles.length - 1; sb >= 0; sb--) {
      var stB = steamBubbles[sb];
      stB.life -= dt;
      stB.x += stB.vx * dt;
      stB.y += stB.vy * dt;
      if (stB.life <= 0) steamBubbles.splice(sb, 1);
    }

    var allowRocks = exp ? (boilNow > 0.25 || ashNow > 0.25) : (boat.inAbyss && boat.x > c.impactX + 240 && boat.x < c.ascentX - 520);
    if (allowRocks) {
      rockSpawnTimer -= dt;
      if (rockSpawnTimer <= 0) {
        spawnSinkingRock(boat.x);
        rockSpawnTimer = (boilNow > 0.4 ? 2.1 : 3.2) + Math.random() * 0.9;
      }
    }

    // 5. 更新缓沉月陨块 & 冲刺撞碎 / 擦碰 / 砸海床爆泥沙烟幕
    for (var ri = sinkingRocks.length - 1; ri >= 0; ri--) {
      var rk = sinkingRocks[ri];
      rk.phase += dt * 3.0;
      if (!rk.grounded && !rk.smashed) {
        rk.x += rk.vx * dt;
        rk.y += rk.vy * dt;
        rk.rot += rk.vRot * dt;
        var rBed = getSeabedY(rk.x);
        if (rk.y + rk.radius * 0.75 >= rBed) {
          rk.y = rBed - rk.radius * 0.55;
          rk.grounded = true;
          rk.vx = 0; rk.vy = 0;
          emitSilt(rk.x, rBed, 9, 0, '112, 102, 94');
          if (Math.abs(rk.x - boat.x) < 560 && window.MT.RenderWorld && window.MT.RenderWorld.addShake) {
            window.MT.RenderWorld.addShake(2.8);
          }
        }
      }

      if (!rk.smashed && (boat.inAbyss || boat.isDiving)) {
        var distR = Math.hypot(boat.x - rk.x, boat.y - rk.y);
        if (distR < rk.radius + 26) {
          var canBreak = boat.breachSmashTimer > 0 || boat.abyssDashTimer > 0 || boat.feverTimer > 0;
          if (canBreak) {
            rk.smashed = true;
            var rStar = Math.round(18 * st.starMult);
            boat.runStars += rStar;
            boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.30);
            boat.breath = Math.min(1.0, (boat.breath || 0) + 0.16);
            emitSilt(rk.x, rk.y, 6, boat.vx * 0.15, '148, 128, 118');
            eras.emitRing(rk.x, rk.y, '#ffd89a');
            eras.addPopup(rk.x, rk.y - 38, '✦ 鱼鳍震碎月陨! +' + rStar + '✦', '#ffe8a8');
            if (window.MT.Audio && window.MT.Audio.playWoodSmash) window.MT.Audio.playWoodSmash();
            if (typeof addComboFn === 'function') addComboFn(1, 6.5);
            if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
              window.MT.RenderWorld.triggerImpact(0.030, 0.042, 4.8);
            }
          } else {
            rk.smashed = true;
            var rDmg = Math.max(5, Math.round(11 * st.crashDamageMult));
            boat.hull = Math.max(0, boat.hull - rDmg);
            boat.hurtFlash = 0.85;
            boat.vx = Math.max(130, boat.vx * 0.60);
            emitSilt(rk.x, rk.y, 7, 0, '124, 108, 102');
            eras.addPopup(boat.x, boat.y - 44, '擦撞沉落月陨 -' + rDmg + '（空格冲刺可震碎！）', '#ffaa8e');
            if (window.MT.Audio) window.MT.Audio.playSplash(1.1);
            if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
              window.MT.RenderWorld.triggerImpact(0.024, 0.026, 6.2);
            }
          }
        }
      }

      if (rk.smashed || rk.x < boat.x - 950) sinkingRocks.splice(ri, 1);
    }

    // 6. 倒扣沉船 / 石拱气室换气与疗愈交互！
    for (var ai = 0; ai < airPockets.length; ai++) {
      var ap = airPockets[ai];
      ap.phase += dt * 2.2;
      if (ap.refilledCd > 0) ap.refilledCd = Math.max(0, ap.refilledCd - dt);
      if (ap.glow > 0) ap.glow = Math.max(0, ap.glow - dt * 1.4);

      if ((boat.inAbyss || boat.isDiving) && Math.abs(boat.x - ap.x) < ap.w * 0.44 && boat.y > ap.bedY - ap.archH - 6 && boat.y < ap.bedY + 10) {
        boat.breath = 1.0;
        boat.fuel = window.MT.Config.SURF.MAX_FUEL;
        ap.glow = 1.0;
        if (ap.refilledCd <= 0) {
          ap.refilledCd = 4.0;
          boat.hull = Math.min(boat.maxHull, boat.hull + 16);
          var pStar = Math.round(14 * st.starMult);
          boat.runStars += pStar;
          boat.trickAura = 0.9;
          if (window.MT.Audio && window.MT.Audio.playAirPocketRefill) window.MT.Audio.playAirPocketRefill();
          eras.emitRing(ap.x, ap.bedY - ap.archH * 0.55, '#a8f6ff');
          eras.addPopup(ap.x, ap.bedY - ap.archH - 22, '✦ ' + ap.name + ' · 气息回满 +' + pStar + '✦', '#c8f8ff');
        }
      }
    }

    // 7. 海底裂隙气柱续气交互
    for (var vi = 0; vi < bubbleVents.length; vi++) {
      var bv = bubbleVents[vi];
      bv.phase += dt * 3.2;
      if (bv.boostCd > 0) bv.boostCd = Math.max(0, bv.boostCd - dt);
      if ((boat.inAbyss || boat.isDiving) && Math.abs(boat.x - bv.x) < bv.radius + 18 && boat.y > bv.bedY - bv.height && boat.y < bv.bedY + 10) {
        boat.breath = Math.min(1.0, (boat.breath || 0) + 0.55 * dt);
        boat.vy -= 145 * dt;
        if (bv.boostCd <= 0) {
          bv.boostCd = 1.4;
          var vStar = Math.round(5 * st.starMult);
          boat.runStars += vStar;
          if (window.MT.Audio) window.MT.Audio.playHookCatch();
          eras.addPopup(bv.x, boat.y - 34, '气泡幕续气 +' + vStar + '✦', '#b8f4ff');
        }
      }
    }

    // 8. 深海月尘星珠收集（吃珠同步续气！）
    var collectRad = Math.max(135, st.magnetRadius * 1.15);
    for (var dpi = 0; dpi < deepPearls.length; dpi++) {
      var dp = deepPearls[dpi];
      if (dp.collected) continue;
      dp.phase += dt * 3.0;
      var py = dp.y + Math.sin(dp.phase) * 4;
      var dd = Math.hypot(dp.x - boat.x, py - boat.y);
      if (dd < 46) {
        dp.collected = true;
        var val = Math.max(2, Math.round(dp.value * st.starMult));
        boat.runStars += val;
        boat.breath = Math.min(1.0, (boat.breath || 0) + 0.14);
        boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.05);
        if (window.MT.Audio) window.MT.Audio.playHookCatch();
      } else if ((boat.inAbyss || boat.isDiving) && dd < collectRad) {
        dp.x += (boat.x - dp.x) * Math.min(1, dt * 11);
        dp.y += (boat.y - dp.y) * Math.min(1, dt * 11);
      }
    }

    // 9. 更新泥沙烟团、冲刺尾环与漫天灰雪微粒
    for (var si = siltClouds.length - 1; si >= 0; si--) {
      var sc = siltClouds[si];
      sc.life -= dt;
      sc.x += sc.vx * dt;
      sc.y += sc.vy * dt;
      sc.vx *= Math.pow(0.28, dt);
      sc.vy *= Math.pow(0.45, dt);
      sc.r += sc.grow * dt;
      if (sc.life <= 0) siltClouds.splice(si, 1);
    }

    for (var di = dashBursts.length - 1; di >= 0; di--) {
      var db = dashBursts[di];
      db.life -= dt;
      db.r = db.maxR * (1 - Math.max(0, db.life / db.maxLife));
      if (db.life <= 0) dashBursts.splice(di, 1);
    }

    marineSnow.forEach(function (ms) {
      ms.ox = (ms.ox + ms.vx * dt + 1400) % 1400;
      ms.oy = (ms.oy + ms.vy * dt + 560) % 560;
      ms.phase += dt * 1.6;
    });
  }

  // =========================================================================
  // 深海分层渲染（在主海面 clip 内部绘制，水体、沸顶、灰雾、废墟、气室与海床浑然一体！）
  // =========================================================================
  function drawUnderWater(ctx, state) {
    var eras = window.MT.Eras;
    var boat = state.boat;
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    var viewBottom = state.viewBottom;
    var camX = (viewLeft + viewRight) * 0.5;

    var mix = getAbyssMix(camX);
    if (mix < 0.01) return;
    var boil = getBoilMix(camX);
    var ash = getAshMix(camX);

    ctx.save();

    // 1. 水体光学演进底色覆盖（撞击沸海赤灰暗影 -> 尘幕灰海浑浊青灰土褐水柱！）
    if (boil > 0.02) {
      var boilG = ctx.createLinearGradient(0, -30, 0, 320);
      boilG.addColorStop(0.00, 'rgba(186, 58, 36, ' + (0.48 * boil) + ')');
      boilG.addColorStop(0.22, 'rgba(98, 42, 46, ' + (0.34 * boil) + ')');
      boilG.addColorStop(0.65, 'rgba(26, 30, 46, ' + (0.22 * boil) + ')');
      boilG.addColorStop(1.00, 'rgba(14, 18, 32, 0)');
      ctx.fillStyle = boilG;
      ctx.fillRect(viewLeft - 40, -60, (viewRight - viewLeft) + 80, 480);
    }
    if (ash > 0.02) {
      // 浮尘遮日：整片水域浸入低饱和灰蒙蒙的浑浊灰绿/土灰雾气！
      var ashG = ctx.createLinearGradient(0, -40, 0, Math.max(460, viewBottom));
      ashG.addColorStop(0.00, 'rgba(72, 74, 72, ' + (0.58 * ash) + ')');
      ashG.addColorStop(0.45, 'rgba(54, 62, 64, ' + (0.52 * ash) + ')');
      ashG.addColorStop(1.00, 'rgba(30, 34, 38, ' + (0.64 * ash) + ')');
      ctx.fillStyle = ashG;
      ctx.fillRect(viewLeft - 40, -60, (viewRight - viewLeft) + 80, Math.max(600, viewBottom + 120));
    }

    // 1b. 深海新生段「荧光海藻峡谷」清澈碧蓝微光回清层
    var kelpM = getKelpMix(camX);
    if (kelpM > 0.02) {
      var kG = ctx.createLinearGradient(0, -40, 0, Math.max(460, viewBottom));
      kG.addColorStop(0.00, 'rgba(32, 104, 118, ' + (0.34 * kelpM) + ')');
      kG.addColorStop(0.55, 'rgba(16, 62, 78, ' + (0.28 * kelpM) + ')');
      kG.addColorStop(1.00, 'rgba(10, 32, 46, ' + (0.38 * kelpM) + ')');
      ctx.fillStyle = kG;
      ctx.fillRect(viewLeft - 40, -60, (viewRight - viewLeft) + 80, Math.max(600, viewBottom + 120));
    }

    // 2. 远景海底峡谷与幽暗沉没轮廓（极低对比度，增加深渊纵深空间感）
    ctx.save();
    ctx.globalAlpha = mix * 0.55;
    ctx.fillStyle = ash > 0.4 ? '#2b3236' : '#182236';
    ctx.beginPath();
    var fStart = Math.floor((viewLeft - 80) / 60) * 60;
    ctx.moveTo(fStart, viewBottom + 120);
    for (var fx = fStart; fx <= viewRight + 120; fx += 60) {
      var fShift = fx + camX * 0.25;
      var fy = 265 + Math.sin(fShift * 0.0024) * 52 + Math.cos(fShift * 0.0061) * 24;
      ctx.lineTo(fx, fy);
    }
    ctx.lineTo(viewRight + 120, viewBottom + 120);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2b. 远景深渊巨鲸慢速巡游剪影（位于远景峡谷前方、中层生物后方，拉满深海尺度与敬畏感！）
    if (window.MT.AbyssFauna && window.MT.AbyssFauna.drawFarBackground) {
      window.MT.AbyssFauna.drawFarBackground(ctx, state);
    }

    // 3. 顶部边界视觉：沸腾赤海穹顶发光底面（阶段 1） / 压抑灰渣尘幕顶盖（阶段 2）
    if (boil > 0.04) {
      ctx.save();
      ctx.globalAlpha = boil;
      // 沿着真实海面曲线下方刷出炽红翻滚的沸海顶光层
      var step = 22;
      var sx0 = Math.floor(viewLeft / step) * step;
      ctx.beginPath();
      ctx.moveTo(sx0, eras.getSurfaceY(sx0, t) - 4);
      for (var wx = sx0; wx <= viewRight + step; wx += step) {
        ctx.lineTo(wx, eras.getSurfaceY(wx, t) - 4);
      }
      for (var wx2 = viewRight + step; wx2 >= sx0; wx2 -= step) {
        var ripple = Math.sin(wx2 * 0.022 + t * 5.2) * 8;
        ctx.lineTo(wx2, eras.getSurfaceY(wx2, t) + 52 + ripple);
      }
      ctx.closePath();
      var roofGrad = ctx.createLinearGradient(0, -35, 0, 72);
      roofGrad.addColorStop(0.00, 'rgba(255, 198, 108, 0.88)');
      roofGrad.addColorStop(0.32, 'rgba(232, 86, 44, 0.62)');
      roofGrad.addColorStop(0.75, 'rgba(136, 38, 34, 0.22)');
      roofGrad.addColorStop(1.00, 'rgba(92, 24, 30, 0)');
      ctx.fillStyle = roofGrad;
      ctx.fill();

      // 沸海下翻滚蒸汽泡
      steamBubbles.forEach(function (sb) {
        if (sb.x < viewLeft - 20 || sb.x > viewRight + 20) return;
        var a = clamp(sb.life / sb.maxLife, 0, 1) * 0.72;
        ctx.strokeStyle = 'rgba(255, 224, 162, ' + a + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(sb.x, sb.y, sb.r, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.restore();
    }

    if (ash > 0.04) {
      ctx.save();
      ctx.globalAlpha = ash;
      var stepA = 26;
      var ax0 = Math.floor(viewLeft / stepA) * stepA;
      ctx.beginPath();
      ctx.moveTo(ax0, eras.getSurfaceY(ax0, t) - 6);
      for (var ax = ax0; ax <= viewRight + stepA; ax += stepA) {
        ctx.lineTo(ax, eras.getSurfaceY(ax, t) - 6);
      }
      for (var ax2 = viewRight + stepA; ax2 >= ax0; ax2 -= stepA) {
        var sag = 34 + Math.sin(ax2 * 0.015 + t * 1.1) * 10;
        ctx.lineTo(ax2, eras.getSurfaceY(ax2, t) + sag);
      }
      ctx.closePath();
      var crustG = ctx.createLinearGradient(0, -30, 0, 62);
      crustG.addColorStop(0.00, 'rgba(46, 48, 52, 0.92)');
      crustG.addColorStop(0.55, 'rgba(72, 74, 72, 0.56)');
      crustG.addColorStop(1.00, 'rgba(72, 74, 72, 0)');
      ctx.fillStyle = crustG;
      ctx.fill();
      ctx.restore();
    }

    // 4. 灾后沉没环境叙事剪影（半埋海床淤泥里的倾倒路灯、折断铁桥、微闪声呐浮标）
    ctx.save();
    ctx.globalAlpha = mix * 0.78;
    buriedRuins.forEach(function (ru) {
      if (ru.x < viewLeft - 120 || ru.x > viewRight + 120) return;
      ctx.save();
      ctx.translate(ru.x, ru.bedY + 6);
      ctx.rotate(ru.tilt);
      if (ru.kind === 'lamp') {
        ctx.strokeStyle = '#383d46';
        ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, -56); ctx.quadraticCurveTo(0, -68, 14, -64); ctx.stroke();
        var flicker = Math.sin(t * 7.5 + ru.phase) > -0.25 ? 0.55 : 0.14;
        var lg = ctx.createRadialGradient(14, -58, 1, 14, -58, 22);
        lg.addColorStop(0, 'rgba(255, 220, 148, ' + flicker + ')');
        lg.addColorStop(1, 'rgba(255, 190, 110, 0)');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(14, -58, 22, 0, Math.PI * 2); ctx.fill();
      } else if (ru.kind === 'truss') {
        ctx.strokeStyle = '#343a44';
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(-26, 14); ctx.lineTo(-10, -48); ctx.lineTo(22, -38); ctx.lineTo(14, 14);
        ctx.moveTo(-18, -18); ctx.lineTo(16, -12);
        ctx.stroke();
      } else {
        // 闪烁青蓝避难声呐浮标
        ctx.fillStyle = '#3a424c';
        ctx.beginPath(); ctx.ellipse(0, 2, 16, 10, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#48525e'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, -28); ctx.stroke();
        var bp = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(t * 2.8 + ru.phase)), 3);
        var bg = ctx.createRadialGradient(0, -30, 1, 0, -30, 20);
        bg.addColorStop(0, 'rgba(136, 236, 255, ' + bp + ')');
        bg.addColorStop(1, 'rgba(136, 236, 255, 0)');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(0, -30, 20, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();

    // 5. 海底裂隙气柱（柔美渐宽锥形水波流光 + 错落大小银青气泡帘，彻底告别矩形竖条！）
    bubbleVents.forEach(function (bv) {
      if (bv.x < viewLeft - 90 || bv.x > viewRight + 90) return;
      ctx.save();
      var ventTop = bv.bedY - bv.height;
      var cGlow = window.MT.Art.getGlowSprite ? window.MT.Art.getGlowSprite('cyan') : null;
      if (cGlow) {
        for (var p = 0; p < 5; p++) {
          var pu = p / 4;
          var py = bv.bedY - 14 - pu * (bv.height * 0.84);
          var px = bv.x + Math.sin(t * 2.2 + bv.phase + p * 1.1) * (4 + pu * 10);
          var pd = (18 + pu * 20) * 2;
          ctx.globalAlpha = mix * 0.24 * (1 - pu * 0.65);
          ctx.drawImage(cGlow, px - pd * 0.5, py - pd * 0.5, pd, pd);
        }
        ctx.globalAlpha = mix;
      }

      // 摇曳上升的错落空心晶莹气泡链
      for (var k = 0; k < 10; k++) {
        var u = ((t * 0.52 + k / 10 + bv.phase * 0.1) % 1);
        var sway = Math.sin(u * 10 + k * 1.7 + bv.phase) * (5 + u * 12);
        var bx = bv.x + sway;
        var by = bv.bedY - 6 - u * bv.height;
        var br = (1.8 + (k % 3) * 1.4) * (0.7 + u * 0.45);
        var ba = Math.sin(u * Math.PI) * 0.78;
        ctx.strokeStyle = 'rgba(218, 250, 255, ' + ba + ')';
        ctx.fillStyle = 'rgba(168, 236, 255, ' + (ba * 0.20) + ')';
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    });

    // 6. 倒扣沉船 / 风化古石拱气室庇护所（双脚深扎海底 +85px，随后被实体海床泥沙自然半埋，零贴纸平底！）
    airPockets.forEach(function (ap) {
      if (ap.x < viewLeft - 240 || ap.x > viewRight + 240) return;
      var hw = ap.w * 0.5;
      var ah = ap.archH;

      ctx.save();
      ctx.translate(ap.x, ap.bedY + 8);
      ctx.rotate(ap.tilt);

      // A) 内部受困亮银青空气气室（柔美扩散水光 + 晃动水银液面）
      var glowBoost = 0.28 + ap.glow * 0.36 + Math.sin(t * 2.6 + ap.phase) * 0.06;
      var airG = ctx.createRadialGradient(0, -ah * 0.56, 6, 0, -ah * 0.46, hw * 0.96);
      airG.addColorStop(0.00, 'rgba(232, 254, 255, ' + (0.64 + ap.glow * 0.26) + ')');
      airG.addColorStop(0.52, 'rgba(136, 228, 248, ' + glowBoost + ')');
      airG.addColorStop(1.00, 'rgba(84, 178, 212, 0)');
      ctx.fillStyle = airG;
      ctx.beginPath();
      ctx.ellipse(0, -ah * 0.50, hw * 0.80, ah * 0.52, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      // 气室内部亮银弯月液面与从缝隙逸出的引路微泡
      ctx.strokeStyle = 'rgba(240, 254, 255, 0.90)';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-hw * 0.62, -ah * 0.48);
      ctx.quadraticCurveTo(0, -ah * 0.48 + Math.sin(t * 3.8 + ap.phase) * 4, hw * 0.62, -ah * 0.48);
      ctx.stroke();

      for (var eb = 0; eb < 3; eb++) {
        var eu = ((t * 0.65 + eb * 0.33 + ap.phase) % 1);
        var ex = (eb - 1) * 14 + Math.sin(eu * 7 + eb) * 5;
        var ey = -ah - 14 - eu * 48;
        ctx.strokeStyle = 'rgba(210, 248, 255, ' + (Math.sin(eu * Math.PI) * 0.68) + ')';
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.arc(ex, ey, 2.2 + (eb % 2), 0, Math.PI * 2); ctx.stroke();
      }

      // B) 外部手绘倒扣旧渔船壳 / 风化罗马石拱（底座深延至 +85px，完全融进下方泥沙海床！）
      if (ap.kind === 'shipwreck') {
        // 船尾折断歪斜的小舵柱剪影
        ctx.strokeStyle = '#3d2f34';
        ctx.lineWidth = 4.2;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hw * 0.78, -ah * 0.32); ctx.lineTo(hw * 1.02, -ah * 0.78); ctx.stroke();

        var hullG = ctx.createLinearGradient(-hw, -ah - 24, hw, 40);
        hullG.addColorStop(0.00, '#6a4e44');
        hullG.addColorStop(0.45, '#46353a');
        hullG.addColorStop(1.00, '#22202c');
        ctx.fillStyle = hullG;
        ctx.beginPath();
        ctx.moveTo(-hw - 6, 85);
        ctx.lineTo(-hw - 2, 12);
        ctx.quadraticCurveTo(-hw * 0.90, -ah * 0.96, 0, -ah - 22);
        ctx.quadraticCurveTo(hw * 0.90, -ah * 0.96, hw + 2, 12);
        ctx.lineTo(hw + 6, 85);
        ctx.lineTo(hw * 0.70, 85);
        ctx.lineTo(hw * 0.68, 6);
        ctx.quadraticCurveTo(hw * 0.64, -ah * 0.72, 0, -ah + 6);
        ctx.quadraticCurveTo(-hw * 0.64, -ah * 0.72, -hw * 0.68, 6);
        ctx.lineTo(-hw * 0.70, 85);
        ctx.closePath();
        ctx.fill();

        // 柔和木船肋骨弧线与龙骨月光边
        ctx.strokeStyle = 'rgba(222, 198, 178, 0.30)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(-hw * 0.86, -ah * 0.34);
        ctx.quadraticCurveTo(0, -ah - 21, hw * 0.86, -ah * 0.34);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(26, 18, 24, 0.28)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-hw * 0.78, -ah * 0.14);
        ctx.quadraticCurveTo(0, -ah - 8, hw * 0.78, -ah * 0.14);
        ctx.stroke();
      } else {
        // 风化有机残垣石拱（带自然崩裂阶梯顶肩与石券拱框，告别死板梯形！）
        var stG = ctx.createLinearGradient(-hw, -ah - 28, hw, 45);
        stG.addColorStop(0.00, '#626272');
        stG.addColorStop(0.50, '#444656');
        stG.addColorStop(1.00, '#242836');
        ctx.fillStyle = stG;
        ctx.beginPath();
        ctx.moveTo(-hw - 12, 85);
        ctx.lineTo(-hw - 8, -ah * 0.22);
        ctx.lineTo(-hw + 6, -ah * 0.68);
        ctx.lineTo(-hw * 0.56, -ah * 0.92);
        ctx.lineTo(-hw * 0.28, -ah - 18);
        ctx.quadraticCurveTo(0, -ah - 26, hw * 0.32, -ah - 16);
        ctx.lineTo(hw * 0.64, -ah * 0.86);
        ctx.lineTo(hw - 4, -ah * 0.58);
        ctx.lineTo(hw + 10, -ah * 0.18);
        ctx.lineTo(hw + 14, 85);
        ctx.lineTo(hw * 0.66, 85);
        ctx.lineTo(hw * 0.64, 4);
        ctx.quadraticCurveTo(hw * 0.62, -ah * 0.56, 0, -ah + 6);
        ctx.quadraticCurveTo(-hw * 0.62, -ah * 0.56, -hw * 0.64, 4);
        ctx.lineTo(-hw * 0.66, 85);
        ctx.closePath();
        ctx.fill();

        // 拱券石框边缘微光
        ctx.strokeStyle = 'rgba(206, 224, 236, 0.26)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-hw * 0.64, -ah * 0.18);
        ctx.quadraticCurveTo(-hw * 0.60, -ah * 0.60, 0, -ah + 4);
        ctx.quadraticCurveTo(hw * 0.60, -ah * 0.60, hw * 0.64, -ah * 0.18);
        ctx.stroke();
      }
      ctx.restore();
    });

    // 7. 缓沉灼热月陨岩块（多棱面立体暗月岩 + 自然渐隐气泡蒸汽羽流，彻底告别竖直矩形条！）
    sinkingRocks.forEach(function (rk) {
      if (rk.x < viewLeft - 90 || rk.x > viewRight + 90) return;
      ctx.save();
      // 有机飘散的沸腾气泡羽流（5 朵错落径向柔雾 + 上升细泡）
      if (!rk.grounded) {
        for (var tp = 0; tp < 5; tp++) {
          var tu = tp / 4;
          var ty = rk.y - rk.radius * 0.6 - tu * 74;
          var tx = rk.x + Math.sin(t * 5.2 + rk.phase + tp * 1.3) * (3 + tu * 9);
          var tr = rk.radius * (0.68 - tu * 0.25);
          var tg = ctx.createRadialGradient(tx, ty, 1, tx, ty, tr * 1.4);
          tg.addColorStop(0, 'rgba(255, 218, 168, ' + (0.28 * rk.glow * (1 - tu * 0.72)) + ')');
          tg.addColorStop(1, 'rgba(200, 224, 240, 0)');
          ctx.fillStyle = tg;
          ctx.beginPath(); ctx.arc(tx, ty, tr * 1.4, 0, Math.PI * 2); ctx.fill();

          ctx.strokeStyle = 'rgba(246, 238, 224, ' + (0.52 * (1 - tu * 0.75)) + ')';
          ctx.lineWidth = 1.0;
          ctx.beginPath(); ctx.arc(tx + (tp % 2 === 0 ? 5 : -5), ty - 4, 2.0 + (tp % 2), 0, Math.PI * 2); ctx.stroke();
        }
      }

      ctx.translate(rk.x, rk.y);
      ctx.rotate(rk.rot);
      var r = rk.radius;
      if (rk.glow > 0.18) {
        var rg = ctx.createRadialGradient(0, 0, r * 0.35, 0, 0, r * 1.9);
        rg.addColorStop(0, 'rgba(255, 148, 78, ' + (0.38 * rk.glow) + ')');
        rg.addColorStop(1, 'rgba(255, 92, 48, 0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.9, 0, Math.PI * 2); ctx.fill();
      }
      var rGrad = ctx.createLinearGradient(-r, -r, r, r);
      rGrad.addColorStop(0.0, '#5a4a58');
      rGrad.addColorStop(0.55, '#342c3a');
      rGrad.addColorStop(1.0, '#221c28');
      ctx.fillStyle = rGrad;
      ctx.beginPath();
      for (var v = 0; v < 7; v++) {
        var ang = (v / 7) * Math.PI * 2;
        var rad = r * (0.78 + h1(rk.id * 5 + v * 3.1) * 0.28);
        if (v === 0) ctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
        else ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
      }
      ctx.closePath();
      ctx.fill();

      // 内部灼热月核裂纹
      ctx.strokeStyle = 'rgba(255, 194, 114, ' + (0.78 * rk.glow) + ')';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.42, -r * 0.2); ctx.lineTo(0, r * 0.08); ctx.lineTo(r * 0.45, -r * 0.14);
      ctx.moveTo(0, r * 0.08); ctx.lineTo(-r * 0.15, r * 0.45);
      ctx.stroke();
      ctx.restore();
    });

    // 8. 深海星珠
    deepPearls.forEach(function (dp) {
      if (dp.collected || dp.x < viewLeft - 40 || dp.x > viewRight + 40) return;
      var py = dp.y + Math.sin(dp.phase) * 4;
      var tw = 0.78 + 0.22 * Math.sin(dp.phase * 1.4);
      var gr = 19 * tw;
      var g = ctx.createRadialGradient(dp.x, py, 1, dp.x, py, gr);
      g.addColorStop(0, 'rgba(228, 252, 255, 0.94)');
      g.addColorStop(0.45, 'rgba(128, 224, 255, 0.42)');
      g.addColorStop(1, 'rgba(128, 224, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(dp.x, py, gr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#edfcff';
      ctx.beginPath(); ctx.arc(dp.x, py, 3.8 * tw, 0, Math.PI * 2); ctx.fill();
    });

    // 8a. 海底上升大洋流光带（x=22950..23850，盘旋直通破晓海面的翡翠鎏金奔涌水流！）
    var cCfg = getCfg();
    var ascX0 = cCfg.ascentX - 650;
    var ascX1 = cCfg.ascentX + 260;
    if (ascX1 > viewLeft - 140 && ascX0 < viewRight + 140) {
      ctx.save();
      ctx.lineCap = 'round';
      for (var ln = -2; ln <= 2; ln++) {
        var cg = ctx.createLinearGradient(ascX0, 320, ascX1, -10);
        cg.addColorStop(0.00, 'rgba(116, 236, 238, 0)');
        cg.addColorStop(0.25, ln === 0 ? 'rgba(176, 252, 248, 0.56)' : 'rgba(118, 234, 242, 0.28)');
        cg.addColorStop(0.75, ln === 0 ? 'rgba(255, 242, 194, 0.62)' : 'rgba(255, 224, 162, 0.30)');
        cg.addColorStop(1.00, 'rgba(255, 242, 198, 0)');
        ctx.strokeStyle = cg;
        ctx.lineWidth = ln === 0 ? 7.5 : 3.2;
        ctx.beginPath();
        for (var s = 0; s <= 18; s++) {
          var u = s / 18;
          var sx = ascX0 + u * (ascX1 - ascX0);
          var sy = 310 * (1 - u) - 10 * u + ln * 18 + Math.sin(u * 10 - t * 5.2 + ln) * 9;
          if (s === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
      // 沿大洋流疾驰上升的晶莹光珠流
      for (var ab = 0; ab < 14; ab++) {
        var au = ((t * 0.68 + ab / 14) % 1);
        var abx = ascX0 + au * (ascX1 - ascX0);
        var aby = 310 * (1 - au) - 10 * au + Math.sin(au * 14 + ab) * 26;
        ctx.fillStyle = au > 0.55 ? 'rgba(255, 246, 206, 0.85)' : 'rgba(186, 252, 255, 0.85)';
        ctx.beginPath(); ctx.arc(abx, aby, 2.2 + (ab % 3), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // 8a1. 灾前封印 -> 灾后震裂敞开的「海底月核秘窟」（x=6120）
    if (fracturedVault && fracturedVault.x > viewLeft - 240 && fracturedVault.x < viewRight + 240) {
      var fv = fracturedVault;
      var hwV = fv.w * 0.5;
      var oA = fv.openAnim || 0;
      ctx.save();
      ctx.translate(fv.x, fv.bedY + 8);

      var vGlow = ctx.createRadialGradient(0, -fv.h * 0.45, 6, 0, -fv.h * 0.42, hwV * (0.65 + oA * 0.55));
      vGlow.addColorStop(0.0, 'rgba(218, 252, 255, ' + (0.22 + oA * 0.52) + ')');
      vGlow.addColorStop(0.5, 'rgba(136, 224, 246, ' + (0.10 + oA * 0.28) + ')');
      vGlow.addColorStop(1.0, 'rgba(84, 178, 212, 0)');
      ctx.fillStyle = vGlow;
      ctx.beginPath(); ctx.ellipse(0, -fv.h * 0.42, hwV * 0.92, fv.h * 0.62, 0, Math.PI, 0); ctx.closePath(); ctx.fill();

      var vg = ctx.createLinearGradient(-hwV, -fv.h, hwV, 35);
      vg.addColorStop(0.0, '#5a5a6c');
      vg.addColorStop(0.5, '#363b4c');
      vg.addColorStop(1.0, '#1d2230');
      ctx.fillStyle = vg;
      ctx.beginPath();
      ctx.moveTo(-hwV - 14, 85);
      ctx.lineTo(-hwV + 4, -fv.h * 0.58);
      ctx.lineTo(-hwV * 0.42, -fv.h - 14);
      ctx.quadraticCurveTo(0, -fv.h - 24, hwV * 0.45, -fv.h - 10);
      ctx.lineTo(hwV - 6, -fv.h * 0.54);
      ctx.lineTo(hwV + 16, 85);
      ctx.lineTo(hwV * 0.64, 85);
      ctx.lineTo(hwV * 0.60, 4);
      ctx.quadraticCurveTo(0, -fv.h * 0.96, -hwV * 0.60, 4);
      ctx.lineTo(-hwV * 0.64, 85);
      ctx.closePath();
      ctx.fill();

      if (oA < 0.96) {
        var split = oA * 46;
        ctx.save();
        ctx.globalAlpha = 1 - oA * 0.88;
        ctx.fillStyle = '#404556';
        ctx.beginPath();
        ctx.moveTo(-hwV * 0.62 - split, 28);
        ctx.lineTo(-hwV * 0.52 - split, -fv.h * 0.58);
        ctx.lineTo(-4 - split, -fv.h * 0.72);
        ctx.lineTo(-8 - split, 28);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4 + split, -fv.h * 0.70);
        ctx.lineTo(hwV * 0.54 + split, -fv.h * 0.56);
        ctx.lineTo(hwV * 0.62 + split, 28);
        ctx.lineTo(2 + split, 28);
        ctx.closePath(); ctx.fill();

        ctx.strokeStyle = 'rgba(182, 246, 255, 0.72)';
        ctx.lineWidth = 2.0;
        ctx.beginPath(); ctx.moveTo(-2, -fv.h * 0.68); ctx.lineTo(-4, -18); ctx.lineTo(2, 12); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      if (oA > 0.25) {
        ctx.save();
        ctx.globalAlpha = oA;
        fv.stars.forEach(function (vs) {
          if (vs.collected) return;
          var vy = vs.y + Math.sin(vs.phase) * 4;
          var sg = ctx.createRadialGradient(vs.x, vy, 1, vs.x, vy, 22);
          sg.addColorStop(0, 'rgba(255, 250, 214, 0.96)');
          sg.addColorStop(0.5, 'rgba(154, 242, 255, 0.45)');
          sg.addColorStop(1, 'rgba(154, 242, 255, 0)');
          ctx.fillStyle = sg;
          ctx.beginPath(); ctx.arc(vs.x, vy, 22, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff9df';
          ctx.beginPath(); ctx.arc(vs.x, vy, 4.5, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
      }
    }

    // 8a2. 深海发光月核矿柱（青金多棱晶簇，深潜鱼鳍冲刺即可震碎！）
    moonCrystals.forEach(function (mc) {
      if (mc.smashed || mc.x < viewLeft - 90 || mc.x > viewRight + 90) return;
      var pulse = 0.78 + 0.22 * Math.sin(t * 3.2 + mc.phase);
      ctx.save();
      ctx.translate(mc.x, mc.bedY + 8);
      var cg2 = ctx.createRadialGradient(0, -mc.h * 0.5, 4, 0, -mc.h * 0.5, mc.h * 1.15);
      cg2.addColorStop(0, 'rgba(148, 246, 255, ' + (0.42 * pulse) + ')');
      cg2.addColorStop(0.55, 'rgba(255, 226, 152, ' + (0.18 * pulse) + ')');
      cg2.addColorStop(1, 'rgba(104, 212, 242, 0)');
      ctx.fillStyle = cg2;
      ctx.beginPath(); ctx.arc(0, -mc.h * 0.5, mc.h * 1.15, 0, Math.PI * 2); ctx.fill();

      // 三根错落棱面青金月核晶柱
      var spikes = [
        { ox: -14, h: mc.h * 0.68, w: 10, tilt: -0.22 },
        { ox:  0,  h: mc.h,        w: 13, tilt:  0.04 },
        { ox:  15, h: mc.h * 0.76, w: 10, tilt:  0.24 }
      ];
      spikes.forEach(function (sp) {
        ctx.save();
        ctx.translate(sp.ox, 0);
        ctx.rotate(sp.tilt);
        var sg = ctx.createLinearGradient(-sp.w, -sp.h, sp.w, 12);
        sg.addColorStop(0.0, '#d6fcff');
        sg.addColorStop(0.45, '#5ccce2');
        sg.addColorStop(1.0, '#1e5272');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.moveTo(-sp.w, 18); ctx.lineTo(-sp.w * 0.72, -sp.h * 0.76);
        ctx.lineTo(0, -sp.h); ctx.lineTo(sp.w * 0.72, -sp.h * 0.72);
        ctx.lineTo(sp.w, 18); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = 'rgba(242, 254, 255, 0.75)';
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(0, -sp.h); ctx.lineTo(0, -sp.h * 0.15); ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    });

    // 震碎月核晶柱飞散的青金发光晶屑
    if (crystalShards.length > 0) {
      ctx.save();
      crystalShards.forEach(function (sh) {
        var a = clamp(sh.life / sh.maxLife, 0, 1);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(sh.x, sh.y);
        ctx.rotate(sh.ang);
        ctx.fillStyle = '#b8f8ff';
        ctx.beginPath(); ctx.moveTo(0, -sh.r); ctx.lineTo(sh.r * 0.6, 0); ctx.lineTo(0, sh.r); ctx.lineTo(-sh.r * 0.6, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    }

    // 8a3. 破晓上升大洋流荧光护航蓝鲸（与木舟同步攀升！）
    escortWhales.forEach(function (ew) {
      if (!ew.active || ew.x < viewLeft - 240 || ew.x > viewRight + 240) return;
      var rx = 86 * ew.scale;
      var ang = Math.atan2(ew.vy - 95, Math.max(160, ew.vx + 220));
      var tail = Math.sin(ew.phase * 1.7) * 9;
      ctx.save();
      ctx.translate(ew.x, ew.y);
      ctx.rotate(clamp(ang, -0.62, 0.25));

      var eg = ctx.createRadialGradient(0, 0, 10, 0, 0, rx * 1.25);
      eg.addColorStop(0, 'rgba(154, 244, 255, 0.34)');
      eg.addColorStop(1, 'rgba(116, 224, 255, 0)');
      ctx.fillStyle = eg;
      ctx.beginPath(); ctx.arc(0, 0, rx * 1.25, 0, Math.PI * 2); ctx.fill();

      var bg = ctx.createLinearGradient(0, -28 * ew.scale, 0, 28 * ew.scale);
      bg.addColorStop(0.0, '#72c2dc');
      bg.addColorStop(0.5, '#2c6890');
      bg.addColorStop(1.0, '#163858');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(rx * 0.92, -2);
      ctx.bezierCurveTo(rx * 0.65, -26 * ew.scale, -rx * 0.25, -28 * ew.scale, -rx * 0.86, tail * 0.3);
      ctx.quadraticCurveTo(-rx * 1.10, -18 + tail, -rx * 1.26, -22 + tail);
      ctx.quadraticCurveTo(-rx * 1.06, tail * 0.5, -rx * 1.22, 18 + tail);
      ctx.quadraticCurveTo(-rx * 0.96, 12 + tail * 0.3, -rx * 0.72, 10);
      ctx.bezierCurveTo(-rx * 0.15, 24 * ew.scale, rx * 0.56, 22 * ew.scale, rx * 0.92, -2);
      ctx.closePath();
      ctx.fill();

      // 荧光星斑与脊背流光
      ctx.strokeStyle = 'rgba(218, 252, 255, 0.78)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(rx * 0.72, -8 * ew.scale);
      ctx.quadraticCurveTo(0, -24 * ew.scale, -rx * 0.58, -6 * ew.scale);
      ctx.stroke();

      ctx.fillStyle = 'rgba(232, 254, 255, 0.86)';
      [-28, -4, 20, 42].forEach(function (ox, sIdx) {
        ctx.beginPath(); ctx.arc(ox * ew.scale, (-6 + (sIdx % 2) * 6) * ew.scale, 2.3, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    });

    // 8b-0. 深谷天然石拱圣殿 + 3 座沉海月潮共鸣碑 & 归港荧光洋流（位于实体海床之前，碑脚自然半埋入泥沙！）
    if (window.MT.Caves && window.MT.Caves.drawCavernBack) {
      window.MT.Caves.drawCavernBack(ctx, state);
    }
    if (window.MT.Shrines && window.MT.Shrines.drawUnderWater) {
      window.MT.Shrines.drawUnderWater(ctx, state);
    }

    // 8b. 深海生物多样性生态层（黑烟囱热泉、巨型发光海藻林、银光沙丁鱼群、月影蝠鲼与深渊提灯鱼！）
    if (window.MT.AbyssFauna && window.MT.AbyssFauna.drawMidEcosystem) {
      window.MT.AbyssFauna.drawMidEcosystem(ctx, state);
    }

    // 9. 连续平滑起伏的有机水彩海床实体剪影（无缝压住石拱、废墟、沉船与热泉脚部！）
    var deepRockBot = Math.max(1060, viewBottom + 180);
    ctx.save();
    ctx.globalAlpha = mix;
    var bStep = 22;
    var bs0 = Math.floor(viewLeft / bStep) * bStep;
    ctx.beginPath();
    ctx.moveTo(bs0, deepRockBot);
    for (var bx = bs0; bx <= viewRight + bStep; bx += bStep) {
      ctx.lineTo(bx, getSeabedY(bx));
    }
    ctx.lineTo(viewRight + bStep, deepRockBot);
    ctx.closePath();

    var bedGrad = ctx.createLinearGradient(0, 330, 0, Math.max(820, viewBottom + 80));
    if (ash > 0.35) {
      bedGrad.addColorStop(0.00, '#4c4d4e');
      bedGrad.addColorStop(0.32, '#2d3136');
      bedGrad.addColorStop(1.00, '#14171c');
    } else {
      bedGrad.addColorStop(0.00, '#363d52');
      bedGrad.addColorStop(0.32, '#1d2438');
      bedGrad.addColorStop(1.00, '#0d1222');
    }
    ctx.fillStyle = bedGrad;
    ctx.fill();

    // 海床内部细微沉积岩层曲线纹理
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = ash > 0.35 ? 'rgba(156, 154, 148, 0.14)' : 'rgba(128, 156, 186, 0.12)';
    ctx.lineWidth = 2.0;
    for (var sl = 1; sl <= 2; sl++) {
      ctx.beginPath();
      for (var lx = bs0; lx <= viewRight + bStep; lx += bStep) {
        var ly = getSeabedY(lx) + sl * 26 + Math.sin(lx * 0.008 + sl) * 6;
        if (lx === bs0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
      }
      ctx.stroke();
    }
    ctx.restore();

    // 海床顶沿柔和沉积灰砂高光线（潮汐声呐扫过时短暂焕发水青轮廓高亮！）
    if (sonarTerrainReveal > 0.04) {
      ctx.strokeStyle = 'rgba(148, 246, 255, ' + (0.35 + sonarTerrainReveal * 0.55) + ')';
      ctx.lineWidth = 2.4 + sonarTerrainReveal * 1.8;
    } else {
      ctx.strokeStyle = ash > 0.35 ? 'rgba(182, 180, 172, 0.38)' : 'rgba(152, 178, 202, 0.28)';
      ctx.lineWidth = 2.2;
    }
    ctx.beginPath();
    var rimDown = false;
    var hasCaves = !!(window.MT.Caves && window.MT.Caves.isShaftOpeningAt);
    for (var rx = bs0; rx <= viewRight + bStep; rx += bStep) {
      if (hasCaves && window.MT.Caves.isShaftOpeningAt(rx)) { rimDown = false; continue; }
      var ry = getSeabedY(rx);
      if (!rimDown) { ctx.moveTo(rx, ry); rimDown = true; } else ctx.lineTo(rx, ry);
    }
    ctx.stroke();
    ctx.restore();

    // 10. 扬起的灰褐色泥沙烟团（贴合海床与撞击点缓缓弥散！）
    if (siltClouds.length > 0) {
      ctx.save();
      siltClouds.forEach(function (sc) {
        if (sc.x < viewLeft - 90 || sc.x > viewRight + 90) return;
        var a = clamp(sc.life / sc.maxLife, 0, 1) * 0.44;
        var sg = ctx.createRadialGradient(sc.x, sc.y, 2, sc.x, sc.y, sc.r);
        sg.addColorStop(0, 'rgba(' + sc.col + ', ' + a + ')');
        sg.addColorStop(0.6, 'rgba(' + sc.col + ', ' + (a * 0.45) + ')');
        sg.addColorStop(1, 'rgba(' + sc.col + ', 0)');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(sc.x, sc.y, sc.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }

    var snowStr = isExplore()
      ? clamp(0.08 + boil * 0.30 + ash * 0.85 + kelpM * 0.20, 0, 1)
      : clamp(mix * (0.28 + ash * 0.72), 0, 1);
    if (snowStr > 0.05) {
      ctx.save();
      var baseOffX = Math.floor(viewLeft / 1400) * 1400;
      marineSnow.forEach(function (ms) {
        var mx = baseOffX + ms.ox;
        if (mx < viewLeft - 20) mx += 1400;
        if (mx > viewRight + 20) return;
        var my = -20 + ms.oy + Math.sin(ms.phase) * 6;
        ctx.fillStyle = ash > 0.35
          ? ('rgba(202, 198, 190, ' + (ms.alpha * snowStr) + ')')
          : ('rgba(218, 224, 232, ' + (ms.alpha * snowStr * 0.75) + ')');
        ctx.beginPath(); ctx.arc(mx, my, ms.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }

    // 12. 鱼鳍冲刺流光尾环
    if (dashBursts.length > 0) {
      ctx.save();
      dashBursts.forEach(function (db) {
        var a = clamp(db.life / db.maxLife, 0, 1);
        ctx.strokeStyle = 'rgba(182, 246, 255, ' + (a * 0.72) + ')';
        ctx.lineWidth = 2.4 * a;
        ctx.beginPath(); ctx.arc(db.x, db.y, db.r, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.restore();
    }

    ctx.restore();
  }

  // 屏幕空间浑浊灰海暗雾遮罩（以木舟和船头探照光锥前方为中心镂空清晰视野！）
  function drawHudOverlay(ctx, state) {
    var boat = state.boat;
    var W = state.W, H = state.H;
    var camX = state.camX || (boat ? boat.x : 0);
    var camY = state.camY || 0;
    var camZoom = state.camZoom || 1.0;
    var seaAnchorY = state.seaAnchorY || (H * 0.63);

    // 1. 落月撞击瞬间的炽白金天光闪耀
    if (impactFlashLocal > 0.02) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 236, 194, ' + (impactFlashLocal * 0.72) + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    if (!boat) return;
    var ash = getAshMix(boat.x);
    var boil = getBoilMix(boat.x);
    if (!boat.inAbyss && !boat.isDiving && ash < 0.05 && boil < 0.05) return;

    var fSign = (isExplore() && typeof boat.facing === 'number') ? boat.facing : 1;
    var pAng = isExplore() ? (boat.localPitch || 0) : boat.angle;
    var focusWorldX = boat.x + fSign * Math.cos(pAng) * 145;
    var focusWorldY = boat.y + Math.sin(pAng) * 115;
    var sx = W * 0.5 + (focusWorldX - camX) * camZoom;
    var sy = seaAnchorY + (focusWorldY - camY) * camZoom;

    // 2. 尘幕灰海：压抑灰蒙浑浊视野边晕（留出探照灯前方的清晰阅读区，既灰蒙压迫又不糊眼！）
    if (ash > 0.05) {
      var kelpVisionBonus = (boat.kelpGlowTimer || 0) > 0 ? 0.10 : 0;
      var clearR = Math.min(W, H) * (0.28 + kelpVisionBonus + (boat.stats && boat.stats.tideSonarLv ? boat.stats.tideSonarLv * 0.04 : 0));
      var outerR = Math.max(W, H) * 0.76;
      ctx.save();
      var fogV = ctx.createRadialGradient(sx, sy, clearR, sx, sy, outerR);
      fogV.addColorStop(0.00, 'rgba(48, 52, 54, 0)');
      fogV.addColorStop(0.55, 'rgba(42, 46, 50, ' + (0.34 * ash) + ')');
      fogV.addColorStop(1.00, 'rgba(26, 30, 34, ' + (0.66 * ash) + ')');
      ctx.fillStyle = fogV;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // 3. 撞击沸海顶部炽红压迫微光晕
    if (boil > 0.05) {
      ctx.save();
      var topHeat = ctx.createLinearGradient(0, 0, 0, H * 0.24);
      topHeat.addColorStop(0, 'rgba(224, 78, 42, ' + (0.26 * boil) + ')');
      topHeat.addColorStop(1, 'rgba(224, 78, 42, 0)');
      ctx.fillStyle = topHeat;
      ctx.fillRect(0, 0, W, H * 0.24);
      ctx.restore();
    }

    if ((boat.inAbyss || boat.isDiving) && boat.stats && boat.stats.sonarRevealRelics && airPockets.length > 0) {
      var nearAp = null;
      var minAbsDx = 99999;
      var nearDir = 1;
      var expBi = isExplore();
      for (var i = 0; i < airPockets.length; i++) {
        var ap = airPockets[i];
        var dx = ap.x - boat.x;
        var adx = Math.abs(dx);
        var validDir = expBi ? (adx > 180 && adx < 2600) : (dx > 180 && dx < 2200);
        if (validDir && adx < minAbsDx) {
          minAbsDx = adx;
          nearDir = dx >= 0 ? 1 : -1;
          nearAp = ap;
        }
      }
      if (nearAp) {
        var dm = Math.max(1, Math.round(minAbsDx / ((window.MT.Config.ECONOMY && window.MT.Config.ECONOMY.DIST_DIVISOR) || 14)));
        var pxS = nearDir >= 0 ? (W - 92) : 92;
        var pyS = H * 0.52;
        var pulseP = 0.72 + 0.28 * Math.sin((state.t || 0) * 4.8);
        ctx.save();
        ctx.globalAlpha = 0.88 * pulseP;
        var pg = ctx.createRadialGradient(pxS, pyS, 3, pxS, pyS, 40);
        pg.addColorStop(0, 'rgba(136, 244, 255, 0.30)');
        pg.addColorStop(1, 'rgba(24, 58, 86, 0)');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(pxS, pyS, 40, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = 'rgba(176, 248, 255, 0.82)';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(pxS, pyS, 14, 0, Math.PI * 2); ctx.stroke();

        ctx.fillStyle = '#d4fbff';
        ctx.font = '600 11px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('沉船气室', pxS, pyS - 20);
        ctx.fillText('○ ' + dm + 'm', pxS, pyS + 28);
        ctx.beginPath();
        ctx.moveTo(pxS - nearDir * 3, pyS - 5);
        ctx.lineTo(pxS + nearDir * 5, pyS);
        ctx.lineTo(pxS - nearDir * 3, pyS + 5);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function triggerSonarReveal() {
    sonarTerrainReveal = 1.0;
  }

  function isInsideAirPocket(x, y) {
    for (var i = 0; i < airPockets.length; i++) {
      var ap = airPockets[i];
      if (Math.abs(x - ap.x) < ap.w * 0.44 && y > ap.bedY - ap.archH - 6 && y < ap.bedY + 12) return true;
    }
    if (window.MT.Caves && window.MT.Caves.isInsideCaveAirPocket && window.MT.Caves.isInsideCaveAirPocket(x, y)) {
      return true;
    }
    return false;
  }

  function addDashBurst(x, y) {
    dashBursts.push({ x: x, y: y, r: 14, maxR: 58, life: 0.42, maxLife: 0.42 });
  }

  return {
    reset: reset,
    getSeabedY: getSeabedY,
    getSeabedSlope: getSeabedSlope,
    emitSilt: emitSilt,
    isInsideAirPocket: isInsideAirPocket,
    addDashBurst: addDashBurst,
    getAbyssMix: getAbyssMix,
    getAshMix: getAshMix,
    getKelpMix: getKelpMix,
    getBoilMix: getBoilMix,
    handlePhysics: handlePhysics,
    update: update,
    triggerSonarReveal: triggerSonarReveal,
    drawUnderWater: drawUnderWater,
    drawHudOverlay: drawHudOverlay
  };
})();
