window.MT = window.MT || {};

window.MT.World = (function () {
  var time = 0;
  var tideProgress = 0.06;
  var maxReachedX = 0;
  var relics = [];
  var skyMeteors = [];
  var jellyfish = [];
  var landmarks = [];
  var reefs = [];
  var rocketHulks = [];
  var shockwaves = [];
  var thermalPlumes = [];
  var cloudIslands = [];
  var gravityStreams = [];
  var windRings = [];
  var grappleBuoys = [];
  var landmarkPuzzles = [];
  var echoPings = [];
  var moonWhale = null;
  var jellyBoostTimer = 0;
  var skyLanterns = [];
  var exploredSectors = [];
  var exploredCount = 0;
  var endingCalm = 0;
  var particles = [];
  var jellyLiftNotified = false;
  var pillarAwakenNotified = false;
  var wakeLanterns = [];
  var nextMeteorTimer = 7.5;
  var nextId = 1;

  // 潮汐光柱坐落于第四海域深处，探索环海或装船达标后苏醒
  var pillar = {
    active: true,
    awakened: false,
    x: 12180,
    triggered: false
  };

  function getWorldLength() {
    return window.MT.Config.PROGRESSION.WORLD_LENGTH || 12800;
  }

  function wrapX(x) {
    var L = getWorldLength();
    return ((x % L) + L) % L;
  }

  // 环形世界最短有符号位移：fromX -> toX，范围 [-L/2, L/2)
  function deltaX(fromX, toX) {
    var L = getWorldLength();
    var d = ((toX - fromX) % L + L) % L;
    if (d >= L * 0.5) d -= L;
    return d;
  }

  // 将环形实体坐标投影到参考点 refX 最近的连续坐标上
  function projectNear(entityX, refX) {
    return refX + deltaX(refX, entityX);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function lerpColor(c1, c2, t) {
    return [
      lerp(c1[0], c2[0], t),
      lerp(c1[1], c2[1], t),
      lerp(c1[2], c2[2], t)
    ];
  }

  function getZoneAt(x) {
    var wx = wrapX(x);
    var zones = window.MT.Config.ZONES;
    for (var i = 0; i < zones.length; i++) {
      if (wx >= zones[i].startX && wx < zones[i].endX) {
        return zones[i];
      }
    }
    return zones[0];
  }

  // 360° 环海四边界（含 12800/0 接缝）平滑 520px 过渡插值
  function getZoneBlend(x) {
    var wx = wrapX(x);
    var zones = window.MT.Config.ZONES;
    var band = 520;
    var halfBand = band * 0.5;
    var z1 = getZoneAt(wx);
    var z2 = z1;
    var mix = 0;

    for (var i = 0; i < zones.length; i++) {
      var border = zones[i].endX; // 3200, 6400, 9600, 12800(=0)
      var d = deltaX(border, wx); // <0 在边界西侧(zones[i]), >0 在边界东侧(zones[(i+1)%4])
      if (Math.abs(d) <= halfBand) {
        z1 = zones[i];
        z2 = zones[(i + 1) % zones.length];
        mix = (d + halfBand) / band;
        mix = mix * mix * (3 - 2 * mix);
        break;
      }
    }

    var pal = {};
    Object.keys(z1.palette).forEach(function (k) {
      pal[k] = mix === 0 ? z1.palette[k] : lerpColor(z1.palette[k], z2.palette[k], mix);
    });

    return {
      zone: mix < 0.5 ? z1 : z2,
      palette: pal,
      waveMult: lerp(z1.waveMult, z2.waveMult, mix),
      gravityMult: lerp(z1.gravityMult, z2.gravityMult, mix),
      fogDensity: lerp(z1.fogDensity, z2.fogDensity, mix),
      meteorInterval: lerp(z1.meteorInterval, z2.meteorInterval, mix),
      moonBias: lerp(z1.moonBias, z2.moonBias, mix)
    };
  }

  function pickTypeForZone(zone, boatParts) {
    var w = zone.weights;
    var keys = ['lantern', 'gramophone', 'thruster', 'balloon', 'keepsake'];
    var maxLv = window.MT.Config.PROGRESSION.MAX_LEVEL;
    var total = 0;
    var adjusted = {};

    keys.forEach(function (k) {
      var weight = w[k] || 0.05;
      // 已满级的部位权重降低，避免浪费玩家时间
      if (k !== 'keepsake' && boatParts && (boatParts[k] || 0) >= maxLv) {
        weight *= 0.25;
      }
      adjusted[k] = weight;
      total += weight;
    });

    var roll = Math.random() * total;
    var acc = 0;
    for (var i = 0; i < keys.length; i++) {
      acc += adjusted[keys[i]];
      if (roll <= acc) return keys[i];
    }
    return 'keepsake';
  }

  function spawnRelicAt(worldX, depth, forceType, boatParts) {
    var wx = wrapX(worldX);
    var zone = getZoneAt(wx);
    var type = forceType || pickTypeForZone(zone, boatParts);
    var arch = window.MT.Config.ARCHETYPES[type];
    var item = arch.items[Math.floor(Math.random() * arch.items.length)];
    // 普通碎片漂浮于浅表月光层，航行掠过即可自然拾取
    var safeDepth = Math.min(58, Math.max(16, depth));
    var reefHit = getReefSurfaceY(wx);
    if (reefHit && safeDepth > reefHit.y - 24) {
      safeDepth = Math.max(16, reefHit.y - 24);
    }
    relics.push({
      id: nextId++,
      x: wx,
      depth: safeDepth,
      vy: 0,
      bobPhase: Math.random() * Math.PI * 2,
      type: type,
      name: item.name,
      line: item.line,
      color: arch.color,
      glow: arch.glow,
      caught: false,
      isHeavy: false,
      shardValue: 1,
      radius: 17
    });
  }

  function spawnAirRelic(spec, isCloudRelic) {
    var arch = window.MT.Config.ARCHETYPES[spec.type];
    var rb = window.MT.Config.ROCKET_BELT;
    var cs = window.MT.Config.CLOUD_SEA;
    var val = isCloudRelic
      ? (cs ? cs.CLOUD_RELIC_SHARD_VALUE : 2)
      : (rb ? rb.AIR_RELIC_SHARD_VALUE : 2);
    relics.push({
      id: nextId++,
      x: wrapX(spec.x),
      homeX: wrapX(spec.x),
      y: -spec.alt,
      alt: spec.alt,
      baseAlt: spec.alt,
      depth: -spec.alt,
      vy: 0,
      bobPhase: Math.random() * Math.PI * 2,
      type: spec.type,
      name: spec.name,
      line: spec.line,
      color: arch.color,
      glow: arch.glow,
      caught: false,
      isHeavy: false,
      isAirborne: true,
      isCloudRelic: !!isCloudRelic,
      shardValue: val,
      radius: 22
    });
  }

  function spawnHeavyRelic(spec) {
    var arch = window.MT.Config.ARCHETYPES[spec.type];
    var mr = window.MT.Config.MIST_REEFS;
    relics.push({
      id: nextId++,
      x: wrapX(spec.x),
      homeX: wrapX(spec.x),
      depth: spec.depth,
      baseDepth: spec.depth,
      liftedDepth: Math.max(82, spec.depth - 96),
      vy: 0,
      bobPhase: Math.random() * Math.PI * 2,
      type: spec.type,
      name: spec.name,
      line: spec.line,
      color: arch.color,
      glow: arch.glow,
      caught: false,
      isHeavy: true,
      weight: 1.0,
      jellyAssist: 0,
      jellyCount: 0,
      effectiveWeight: 1.0,
      sinkReturn: false,
      shardValue: mr ? mr.HEAVY_SHARD_VALUE : 2,
      radius: 23
    });
  }

  function seedWorldRelics() {
    // 1. 第一海域（暮光浅湾 0..3200）：启航点 640 附近布设浅表漂流碎片，航行掠过即收
    var z1Plan = [
      [260, 32, 'thruster'],   [910, 26, 'lantern'],    [1220, 34, 'lantern'],
      [1540, 28, 'lantern'],   [1920, 36, 'thruster'],  [2280, 32, 'gramophone'],
      [2640, 30, 'thruster'],  [2980, 34, 'keepsake']
    ];
    z1Plan.forEach(function (e) { spawnRelicAt(e[0], e[1], e[2]); });

    // 2. 第二海域（雾锁暗礁海 3200..6400）：浅表顺航碎片 + 4 件暗礁深谷重物
    var z2Plan = [
      [3450, 30, 'gramophone'], [4080, 34, 'lantern'],    [4780, 32, 'gramophone'],
      [5480, 30, 'thruster'],   [6180, 34, 'keepsake']
    ];
    z2Plan.forEach(function (e) { spawnRelicAt(e[0], e[1], e[2]); });

    var heavySpecs = window.MT.Config.HEAVY_RELICS || [];
    heavySpecs.forEach(function (spec) { spawnHeavyRelic(spec); });

    // 3. 第三海域（火箭坠落带 6400..9600）：浅表推进/浮空碎片 + 5 件高空降落伞遗物
    var z3Plan = [
      [6560, 30, 'thruster'], [7080, 34, 'thruster'], [7620, 28, 'balloon'],
      [8220, 34, 'thruster'], [8760, 30, 'balloon'],  [9380, 32, 'gramophone']
    ];
    z3Plan.forEach(function (e) { spawnRelicAt(e[0], e[1], e[2]); });

    var airSpecs = window.MT.Config.AIR_RELICS || [];
    airSpecs.forEach(function (spec) { spawnAirRelic(spec); });

    // 4. 第四海域（浮空云海区 9600..12800）：浅表浮空碎片 + 4 件浮岛上空云端星遗
    var z4Plan = [
      [9720, 28, 'balloon'],  [10140, 32, 'balloon'],  [10580, 30, 'balloon'],
      [11020, 34, 'thruster'], [11480, 28, 'keepsake'], [11920, 30, 'lantern'],
      [12520, 32, 'balloon']
    ];
    z4Plan.forEach(function (e) { spawnRelicAt(e[0], e[1], e[2]); });

    var cloudSpecs = window.MT.Config.CLOUD_RELICS || [];
    cloudSpecs.forEach(function (spec) { spawnAirRelic(spec, true); });
  }

  function seedLandmarks() {
    landmarks = [];
    var zones = window.MT.Config.ZONES;
    zones.forEach(function (z) {
      var span = z.endX - z.startX;
      var count = Math.max(4, Math.floor(span / 480));
      for (var i = 0; i < count; i++) {
        var lx = z.startX + (i + 0.35 + Math.random() * 0.35) * (span / count);
        var kind = z.landmarks[i % z.landmarks.length];
        landmarks.push({
          x: lx,
          type: kind,
          zoneId: z.id,
          scale: 0.82 + Math.random() * 0.42,
          seed: Math.random() * 100
        });
      }
    });
  }

  function buildReefProfile(halfW, topY, seed, kind) {
    var baseY = 390;
    var pts = [];
    var segs = 10;
    for (var i = 0; i <= segs; i++) {
      var u = i / segs;
      var nx = u * 2 - 1;
      var absX = Math.abs(nx);
      var ridge;
      if (kind === 'shallow') {
        ridge = Math.pow(absX, 1.55);
      } else if (kind === 'shelf') {
        ridge = Math.pow(Math.max(0, absX - 0.22) / 0.78, 1.8);
      } else {
        ridge = Math.pow(absX, 1.9);
      }
      var crag = Math.sin(seed * 3.7 + i * 2.15) * (1 - absX * 0.6) * (kind === 'shallow' ? 7 : 12);
      var y = topY + ridge * (baseY - topY) + crag;
      if (i === 0 || i === segs) y = baseY;
      pts.push({ dx: nx * halfW, y: Math.max(topY - 4, Math.min(baseY, y)) });
    }
    return pts;
  }

  function seedReefs() {
    reefs = [];
    // 手工编排第二海域（3200..6400）暗礁节奏：入口礁脊 -> 4 处深海重物礁谷 -> 2 处雾中浅峰
    var specs = [
      { x: 3390, halfW: 82,  topY: 66, kind: 'shelf',   seed: 1.4 },
      { x: 3625, halfW: 74,  topY: 68, kind: 'canyon',  seed: 2.3 },
      { x: 3855, halfW: 76,  topY: 58, kind: 'canyon',  seed: 3.1 },
      { x: 4120, halfW: 66,  topY: 22, kind: 'shallow', seed: 4.7 },
      { x: 4325, halfW: 74,  topY: 64, kind: 'canyon',  seed: 5.2 },
      { x: 4560, halfW: 78,  topY: 60, kind: 'canyon',  seed: 6.4 },
      { x: 4820, halfW: 86,  topY: 52, kind: 'shelf',   seed: 7.6 },
      { x: 5025, halfW: 74,  topY: 62, kind: 'canyon',  seed: 8.3 },
      { x: 5255, halfW: 76,  topY: 56, kind: 'canyon',  seed: 9.1 },
      { x: 5510, halfW: 64,  topY: 20, kind: 'shallow', seed: 10.5 },
      { x: 5725, halfW: 74,  topY: 64, kind: 'canyon',  seed: 11.2 },
      { x: 5960, halfW: 78,  topY: 58, kind: 'canyon',  seed: 12.8 },
      { x: 6210, halfW: 78,  topY: 72, kind: 'shelf',   seed: 13.7 }
    ];

    specs.forEach(function (s, idx) {
      var profile = buildReefProfile(s.halfW, s.topY, s.seed, s.kind);
      var kelp = [];
      for (var k = 0; k < 3; k++) {
        var idxPt = 2 + k * 3;
        var pt = profile[idxPt];
        if (pt) {
          kelp.push({
            dx: pt.dx,
            y: pt.y,
            len: 20 + ((idx * 7 + k * 13) % 24),
            phase: s.seed + k * 1.9
          });
        }
      }
      reefs.push({
        id: idx + 1,
        x: s.x,
        halfW: s.halfW,
        topY: s.topY,
        kind: s.kind,
        seed: s.seed,
        profile: profile,
        kelp: kelp
      });
    });
  }

  // 查询某世界 X 处最高暗礁顶面 Y 与坡度（支持 360° 环形坐标）
  function getReefSurfaceY(worldX) {
    var best = null;
    for (var i = 0; i < reefs.length; i++) {
      var rf = reefs[i];
      var localX = deltaX(rf.x, worldX);
      if (Math.abs(localX) > rf.halfW) continue;
      var pts = rf.profile;
      for (var j = 0; j < pts.length - 1; j++) {
        var p0 = pts[j];
        var p1 = pts[j + 1];
        if (localX >= p0.dx && localX <= p1.dx) {
          var span = (p1.dx - p0.dx) || 1;
          var frac = (localX - p0.dx) / span;
          var y = p0.y + (p1.y - p0.y) * frac;
          var slope = (p1.y - p0.y) / span;
          if (!best || y < best.y) {
            best = { y: y, slope: slope, reef: rf };
          }
          break;
        }
      }
    }
    return best;
  }

  // 计算世界坐标点 (wx, wy) 在海雾中的清晰度（0=深雾遮蔽, 1=清晰可见）
  function getFogClarityAt(wx, wy, boat) {
    var zb = getZoneBlend(wx);
    if (zb.fogDensity <= 0.08) return 1.0;

    var mr = window.MT.Config.MIST_REEFS;
    var lv = boat ? (boat.parts.lantern || 0) : 0;
    var baseClear = Math.max(0.14, 1 - zb.fogDensity * 1.18);
    var clarity = baseClear;

    if (boat) {
      var lampX = boat.x + Math.cos(boat.angle) * boat.facing * 46;
      var lampY = boat.y + Math.sin(boat.angle) * boat.facing * 46 - 10;
      var coreR = mr.FOG_BASE_RADIUS + lv * mr.FOG_RADIUS_PER_LV;
      var dCore = Math.hypot(deltaX(lampX, wx), (wy - lampY) * 0.92);
      if (dCore < coreR) {
        var cTerm = 1 - dCore / coreR;
        clarity = Math.max(clarity, baseClear + (1 - baseClear) * Math.pow(cTerm, 0.72));
      }

      var beamX = lampX + boat.facing * (mr.FOG_BEAM_BASE + lv * mr.FOG_BEAM_PER_LV) * 0.62;
      var beamY = lampY + 42 + lv * 14;
      var beamRx = (mr.FOG_BEAM_BASE + lv * mr.FOG_BEAM_PER_LV) * 0.85;
      var beamRy = (115 + lv * 48);
      var nd = Math.hypot(deltaX(beamX, wx) / beamRx, (wy - beamY) / beamRy);
      if (nd < 1) {
        clarity = Math.max(clarity, baseClear + (1 - baseClear) * (1 - nd * nd) * 0.92);
      }
    }

    for (var w = 0; w < wakeLanterns.length; w++) {
      var wl = wakeLanterns[w];
      var wd = Math.hypot(deltaX(wl.x, wx), wy);
      if (wd < mr.WAKE_CLEAR_RADIUS) {
        var wf = 1 - wd / mr.WAKE_CLEAR_RADIUS;
        clarity = Math.max(clarity, baseClear + (1 - baseClear) * wf * 0.75);
      }
    }

    for (var p = 0; p < particles.length; p++) {
      var pt = particles[p];
      if (pt.kind !== 'ring') continue;
      var rd = Math.abs(Math.hypot(deltaX(pt.x, wx), wy - pt.y) - pt.size);
      if (rd < 36) {
        clarity = Math.max(clarity, baseClear + (1 - baseClear) * (1 - rd / 36) * 0.55);
      }
    }

    return Math.min(1, clarity);
  }

  function seedRocketHulks() {
    rocketHulks = [];
    var specs = window.MT.Config.ROCKET_HULKS || [];
    specs.forEach(function (s) {
      rocketHulks.push({
        id: s.id,
        x: s.x,
        kind: s.kind,
        dir: s.dir || 1,
        length: s.length || 150,
        height: s.height || 80,
        radius: s.radius || 56,
        cycle: s.cycle || 8.0,
        activeFrac: s.activeFrac || 0.65,
        phase: s.phase || 0,
        label: s.label || '14',
        plumeStrength: 0
      });
    });
  }

  // 查询世界 X 是否位于第三海域倾斜火箭残壳跳台表面（支持 360° 环海坐标）
  function getRampSurfaceAt(worldX) {
    for (var i = 0; i < rocketHulks.length; i++) {
      var h = rocketHulks[i];
      if (h.kind !== 'ramp') continue;
      var halfL = h.length * 0.5;
      var localX = deltaX(h.x, worldX);
      if (Math.abs(localX) > halfL) continue;
      var x0 = h.x - halfL;
      var x1 = h.x + halfL;
      var u = (localX + halfL) / h.length;
      if (h.dir < 0) u = 1 - u;
      var startY = 18;
      var topY = -h.height;
      var curve = Math.pow(u, 1.15);
      var y = startY + (topY - startY) * curve;
      var dCurve = 1.15 * Math.pow(Math.max(0.02, u), 0.15) / h.length;
      var slope = (topY - startY) * dCurve * (h.dir >= 0 ? 1 : -1);
      return {
        y: y,
        slope: slope,
        u: u,
        topX: h.dir >= 0 ? x1 : x0,
        topY: topY,
        dir: h.dir,
        hulk: h
      };
    }
    return null;
  }

  // 查询世界点 (wx, wy) 处热流上升蒸汽柱的托举强度（0..1）
  function getThermalForceAt(wx, wy) {
    var best = 0;
    var bestCx = wx;

    for (var i = 0; i < rocketHulks.length; i++) {
      var h = rocketHulks[i];
      if (h.kind !== 'vent' || h.plumeStrength <= 0.05) continue;
      var dx = Math.abs(deltaX(h.x, wx));
      if (dx > h.radius) continue;
      if (wy > 34 || wy < -h.height) continue;
      var xFactor = 1 - (dx / h.radius) * (dx / h.radius);
      var yFactor = wy < 0 ? Math.max(0, 1 - (-wy) / h.height) : 1;
      var s = h.plumeStrength * xFactor * (0.35 + 0.65 * yFactor);
      if (s > best) {
        best = s;
        bestCx = projectNear(h.x, wx);
      }
    }

    for (var j = 0; j < thermalPlumes.length; j++) {
      var tp = thermalPlumes[j];
      var tdx = Math.abs(deltaX(tp.x, wx));
      if (tdx > tp.radius) continue;
      if (wy > 34 || wy < -tp.height) continue;
      var fade = Math.min(1, tp.life / 2.2) * Math.min(1, (tp.maxLife - tp.life) / 0.5 + 0.25);
      var txFactor = 1 - (tdx / tp.radius) * (tdx / tp.radius);
      var tyFactor = wy < 0 ? Math.max(0, 1 - (-wy) / tp.height) : 1;
      var ts = fade * txFactor * (0.4 + 0.6 * tyFactor);
      if (ts > best) {
        best = ts;
        bestCx = projectNear(tp.x, wx);
      }
    }

    return { strength: Math.min(1, best), cx: bestCx };
  }

  function seedCloudSea() {
    cloudIslands = [];
    gravityStreams = [];
    var iSpecs = window.MT.Config.CLOUD_ISLANDS || [];
    iSpecs.forEach(function (s) {
      cloudIslands.push({
        id: s.id,
        x: s.x,
        baseY: s.y,
        y: s.y,
        halfW: s.halfW || 88,
        bobAmp: s.bobAmp || 6,
        phase: s.phase || 0,
        decor: s.decor || 'lantern_post'
      });
    });

    var gSpecs = window.MT.Config.GRAVITY_STREAMS || [];
    gSpecs.forEach(function (s) {
      gravityStreams.push({
        id: s.id,
        x: s.x,
        radius: s.radius || 60,
        topY: s.topY || -280,
        phase: s.phase || 0
      });
    });
  }

  function seedPhase2World() {
    grappleBuoys = [];
    var gSpecs = window.MT.Config.GRAPPLE_BUOYS || [];
    gSpecs.forEach(function (s) {
      grappleBuoys.push({
        id: s.id,
        x: wrapX(s.x),
        baseY: s.y,
        y: s.y,
        radius: s.radius || 16,
        phase: s.id * 1.4,
        sway: 0
      });
    });

    landmarkPuzzles = [];
    var lSpecs = window.MT.Config.LANDMARK_PUZZLES || [];
    lSpecs.forEach(function (s) {
      var obj = {
        id: s.id,
        zoneId: s.zoneId,
        index: s.index,
        name: s.name,
        x: wrapX(s.x),
        y: typeof s.y === 'number' ? s.y : 0,
        rewardType: s.rewardType,
        rewardTitle: s.rewardTitle,
        rewardLine: s.rewardLine,
        solved: false,
        solveFlash: 0
      };
      if (s.id === 'shallows_lighthouse') {
        obj.buoyX = wrapX(s.buoyX);
        obj.buoyTilt = -0.68; // 初始倾倒角度
        obj.pullProgress = 0;
      } else if (s.id === 'mist_bells') {
        obj.bells = s.bells.map(function (b, idx) {
          return {
            id: idx,
            x: wrapX(b.x),
            y: b.y,
            pitch: b.pitch,
            lit: false,
            ringFlash: 0
          };
        });
      } else if (s.id === 'rocket_gantry') {
        obj.clamps = s.clamps.map(function (c, idx) {
          return {
            id: idx,
            x: wrapX(c.x),
            y: c.y,
            side: c.side,
            progress: 0,
            released: false
          };
        });
        obj.launchAnim = 0;
      } else if (s.id === 'cloud_observatory') {
        obj.dialProgress = 0;
        obj.dialAngle = -1.1;
      }
      landmarkPuzzles.push(obj);
    });

    echoPings = [];
    moonWhale = {
      active: false,
      x: 4820,
      y: 86,
      vx: 72,
      phase: 0,
      breachTimer: 5.0
    };
    jellyBoostTimer = 0;
  }

  function getLandmarkById(id) {
    for (var i = 0; i < landmarkPuzzles.length; i++) {
      if (landmarkPuzzles[i].id === id) return landmarkPuzzles[i];
    }
    return null;
  }

  function getSolvedLandmarkCount() {
    var c = 0;
    for (var i = 0; i < landmarkPuzzles.length; i++) {
      if (landmarkPuzzles[i].solved) c++;
    }
    return c;
  }

  function markLandmarkSolved(lm, boat, onEvent) {
    if (!lm || lm.solved) return false;
    lm.solved = true;
    lm.solveFlash = 1.0;
    window.MT.Audio.playLandmarkSolved();

    var visX = projectNear(lm.x, boat ? boat.x : lm.x);
    var vy = lm.id === 'cloud_observatory' ? lm.y : -35;
    emitSoundRing(visX, vy, '#ffe6a4');
    emitSoundRing(visX, vy, '#a9f0cc');
    for (var k = 0; k < 18; k++) {
      var a = (k / 18) * Math.PI * 2;
      emitSpark(visX, vy, Math.cos(a) * 110, Math.sin(a) * 85 - 30, k % 2 === 0 ? '#ffe59c' : '#a8e6ff', 3.4, 1.25);
    }

    if (lm.id === 'mist_bells' && moonWhale) {
      moonWhale.active = true;
      moonWhale.x = wrapX(lm.x - 160);
      moonWhale.y = 82;
      moonWhale.vx = (boat && boat.facing < 0) ? -76 : 76;
      window.MT.Audio.playWhaleSong();
    } else if (lm.id === 'rocket_gantry') {
      lm.launchAnim = 1.0;
      emitSteam(visX, -10, 22);
      emitSplash(visX, 4, 24, '#ffe0a8', 85);
      // 发射台点火后永久化为高空热流柱
      rocketHulks.push({
        id: 99,
        x: lm.x,
        kind: 'vent',
        radius: 74,
        height: 345,
        cycle: 10.0,
        activeFrac: 1.0,
        phase: 0,
        label: '19',
        plumeStrength: 1.0
      });
    }

    if (typeof onEvent === 'function') {
      onEvent('landmark_solved', lm);
    }
    return true;
  }

  // 查询可被铁钩锁定的机关锚点或高空钟摆气球
  function findHookInteractableAt(hx, hy, catchRadius) {
    var r = catchRadius || 32;

    // 1. 浅湾灯塔铜镜浮标锚链
    var lh = getLandmarkById('shallows_lighthouse');
    if (lh && !lh.solved) {
      var bx = projectNear(lh.buoyX, hx);
      var by = getWaveHeight(lh.buoyX, time, 0) - 6;
      if (Math.hypot(hx - bx, hy - by) <= r + 24) {
        return { kind: 'lighthouse_buoy', landmark: lh, x: lh.buoyX, y: by };
      }
    }

    // 2. 火箭发射台双钢缆卡扣
    var rg = getLandmarkById('rocket_gantry');
    if (rg && !rg.solved && rg.clamps) {
      for (var c = 0; c < rg.clamps.length; c++) {
        var cl = rg.clamps[c];
        if (cl.released) continue;
        var cx = projectNear(cl.x, hx);
        if (Math.hypot(hx - cx, hy - cl.y) <= r + 24) {
          return { kind: 'gantry_clamp', landmark: rg, clamp: cl, x: cl.x, y: cl.y };
        }
      }
    }

    // 3. 浮空天文台黄铜月相拨杆
    var ob = getLandmarkById('cloud_observatory');
    if (ob && !ob.solved) {
      var ox = projectNear(ob.x, hx);
      var oy = ob.y - 18;
      if (Math.hypot(hx - ox, hy - oy) <= r + 28) {
        return { kind: 'observatory_dial', landmark: ob, x: ob.x, y: oy };
      }
    }

    // 4. 全环海高空钟摆气球锚点
    for (var b = 0; b < grappleBuoys.length; b++) {
      var gb = grappleBuoys[b];
      var gx = projectNear(gb.x, hx);
      if (Math.hypot(hx - gx, hy - gb.y) <= r + gb.radius + 14) {
        return { kind: 'sky_buoy', buoy: gb, x: gb.x, y: gb.y };
      }
    }

    return null;
  }

  // 主动声波脉冲触发：敲响沉海古钟 / 校准观月天文台 / 召唤水母共鸣 / 发出地标与重物回声定位
  function triggerSonarPulse(boat, onEvent) {
    var sn = window.MT.Config.SONAR;
    var gLv = boat.parts.gramophone || 0;
    var radius = (sn ? sn.BASE_RADIUS : 240) + gLv * (sn ? sn.RADIUS_PER_LV : 85);

    window.MT.Audio.playSonarPulse(gLv);
    emitSoundRing(boat.x, boat.y - 18, '#a9f0cc');
    if (gLv >= 1) {
      emitSoundRing(boat.x, boat.y - 18, '#ffe6b0');
    }

    // 短暂激发水母群托举（即便未装留声机也可借主动声波唤水母助阵）
    jellyBoostTimer = Math.max(jellyBoostTimer, sn ? sn.JELLY_BOOST_SEC : 6.5);

    // 1. 敲响雾海沉钟祭坛古钟
    var mb = getLandmarkById('mist_bells');
    if (mb && !mb.solved && mb.bells) {
      var hitBell = false;
      var litCount = 0;
      for (var i = 0; i < mb.bells.length; i++) {
        var bell = mb.bells[i];
        var dBell = Math.hypot(deltaX(boat.x, bell.x), bell.y - boat.y);
        if (dBell <= Math.max(radius, sn ? sn.BELL_HIT_RADIUS : 230)) {
          if (!bell.lit) {
            bell.lit = true;
            hitBell = true;
          }
          bell.ringFlash = 1.0;
          window.MT.Audio.playBellChime(bell.pitch);
          var bxVis = projectNear(bell.x, boat.x);
          emitSoundRing(bxVis, bell.y, '#ffe39e');
        }
        if (bell.lit) litCount++;
      }
      if (hitBell && litCount < mb.bells.length && typeof onEvent === 'function') {
        onEvent('bell_chime', { count: litCount, total: mb.bells.length });
      }
      if (litCount >= mb.bells.length) {
        markLandmarkSolved(mb, boat, onEvent);
      }
    }

    // 2. 声波校准悬空观月天文台
    var ob = getLandmarkById('cloud_observatory');
    if (ob && !ob.solved) {
      var dObs = Math.hypot(deltaX(boat.x, ob.x), (ob.y - 10) - boat.y);
      if (dObs <= Math.max(radius * 0.9, sn ? sn.OBS_HIT_RADIUS : 210)) {
        ob.dialProgress = 1.0;
        ob.dialAngle = 0;
        markLandmarkSolved(ob, boat, onEvent);
      }
    }

    // 3. 声波回声定位（Ping）：在浓雾/远海映出最近未点亮地标与附近重物/空投的柔光回波
    var nearestLm = null;
    var bestLmDist = 2600;
    for (var li = 0; li < landmarkPuzzles.length; li++) {
      var lp = landmarkPuzzles[li];
      if (lp.solved) continue;
      var dl = Math.abs(deltaX(boat.x, lp.x));
      if (dl < bestLmDist) {
        bestLmDist = dl;
        nearestLm = lp;
      }
    }
    if (nearestLm) {
      echoPings.push({
        x: nearestLm.x,
        y: nearestLm.id === 'cloud_observatory' ? nearestLm.y : -30,
        color: '#ffe39c',
        life: 2.6,
        maxLife: 2.6,
        isLandmark: true
      });
    }

    for (var ri = 0; ri < relics.length; ri++) {
      var rel = relics[ri];
      if (!rel.isHeavy && !rel.isAirborne) continue;
      var dr = Math.abs(deltaX(boat.x, rel.x));
      if (dr < 780) {
        var rwy = rel.isAirborne ? rel.y : (getWaveHeight(rel.x, time, boat.parts.lantern) + rel.depth);
        echoPings.push({
          x: rel.x,
          y: rwy,
          color: rel.color || '#a9f0cc',
          life: 1.9,
          maxLife: 1.9,
          isLandmark: false
        });
      }
    }
  }

  function seedWindRings() {
    windRings = [];
    var specs = window.MT.Config.WIND_RINGS || [];
    specs.forEach(function (s) {
      windRings.push({
        id: s.id,
        x: wrapX(s.x),
        baseY: s.y,
        y: s.y,
        radius: s.radius || 35,
        tilt: s.tilt || 0,
        phase: s.id * 1.15,
        cooldown: 0,
        flash: 0
      });
    });
  }

  function markExplored(worldX, lanternLv) {
    var count = window.MT.Config.PROGRESSION.CHART_SECTORS || 48;
    var L = getWorldLength();
    var wx = wrapX(worldX);
    var center = Math.floor((wx / L) * count) % count;
    var span = 1 + (lanternLv >= 2 ? 1 : 0);
    for (var s = -span; s <= span; s++) {
      var idx = ((center + s) % count + count) % count;
      if (!exploredSectors[idx]) {
        exploredSectors[idx] = 1;
        exploredCount++;
      }
    }
  }

  function getExplorationRatio() {
    var count = window.MT.Config.PROGRESSION.CHART_SECTORS || 48;
    return Math.min(1, exploredCount / count);
  }

  // 查询世界 X 是否位于第四海域反重力浮岛顶面（单向可停泊草甸平台）
  function getCloudIslandSurfaceAt(worldX) {
    for (var i = 0; i < cloudIslands.length; i++) {
      var isl = cloudIslands[i];
      var dx = deltaX(isl.x, worldX);
      if (Math.abs(dx) > isl.halfW) continue;
      var nx = dx / isl.halfW;
      var arch = (1 - nx * nx) * 7;
      var surfaceY = isl.y - arch;
      var slope = (14 * nx) / isl.halfW;
      return {
        y: surfaceY,
        slope: slope,
        island: isl
      };
    }
    return null;
  }

  // 查询世界点 (wx, wy) 处第四海域月光失重上升流强度（含潮汐光柱柔流）
  function getGravityStreamAt(wx, wy) {
    var best = 0;
    var bestCx = wx;

    for (var i = 0; i < gravityStreams.length; i++) {
      var st = gravityStreams[i];
      var dx = Math.abs(deltaX(st.x, wx));
      if (dx > st.radius) continue;
      if (wy > 38 || wy < st.topY) continue;
      var xF = 1 - (dx / st.radius) * (dx / st.radius);
      var yF = wy < 0 ? Math.max(0.18, 1 - (-wy) / (-st.topY)) : 1;
      var pulse = 0.82 + 0.18 * Math.sin(time * 1.9 + st.phase);
      var s = xF * yF * pulse;
      if (s > best) {
        best = s;
        bestCx = projectNear(st.x, wx);
      }
    }

    if (pillar.active) {
      var pdx = Math.abs(deltaX(pillar.x, wx));
      if (pdx < 105 && wy < 32 && wy > -420) {
        var pxF = 1 - (pdx / 105) * (pdx / 105);
        var ps = pxF * (pillar.awakened ? 0.76 : 0.42);
        if (ps > best) {
          best = ps;
          bestCx = projectNear(pillar.x, wx);
        }
      }
    }

    return { strength: Math.min(1, best), cx: bestCx };
  }

  function spawnSkyLantern(worldX, worldY) {
    skyLanterns.push({
      x: worldX,
      y: typeof worldY === 'number' ? worldY : 2,
      vx: (Math.random() - 0.5) * 16,
      vy: -16 - Math.random() * 22,
      phase: Math.random() * Math.PI * 2,
      size: 0.75 + Math.random() * 0.65,
      life: 16 + Math.random() * 10,
      maxLife: 24
    });
    if (skyLanterns.length > 48) skyLanterns.shift();
  }

  function setEndingCalmTarget(val) {
    endingCalm = Math.max(0, Math.min(0.95, val || 0));
  }

  function reset() {
    time = 0;
    tideProgress = 0.06;
    maxReachedX = 0;
    relics = [];
    skyMeteors = [];
    jellyfish = [];
    reefs = [];
    rocketHulks = [];
    shockwaves = [];
    thermalPlumes = [];
    cloudIslands = [];
    gravityStreams = [];
    windRings = [];
    skyLanterns = [];
    var secCount = window.MT.Config.PROGRESSION.CHART_SECTORS || 48;
    exploredSectors = new Array(secCount);
    for (var si = 0; si < secCount; si++) exploredSectors[si] = 0;
    exploredCount = 0;
    endingCalm = 0;
    particles = [];
    wakeLanterns = [];
    nextMeteorTimer = 8.5;
    jellyLiftNotified = false;
    pillarAwakenNotified = false;

    pillar.active = true;
    pillar.awakened = false;
    pillar.x = window.MT.Config.PROGRESSION.PILLAR_X;
    pillar.triggered = false;

    seedReefs();
    seedRocketHulks();
    seedCloudSea();
    seedWindRings();
    seedPhase2World();
    seedWorldRelics();
    seedLandmarks();
    markExplored(window.MT.Config.PROGRESSION.START_X || 640, 0);

    // 发光水母分布于 360° 全环海
    var L = getWorldLength();
    for (var i = 0; i < 30; i++) {
      jellyfish.push({
        x: Math.random() * L,
        homeX: null,
        depth: 65 + Math.random() * 185,
        size: 7 + Math.random() * 9,
        phase: Math.random() * Math.PI * 2,
        speed: 8 + Math.random() * 12,
        hue: Math.random() < 0.5 ? 'rgba(165, 228, 255,' : 'rgba(220, 195, 255,',
        lifting: false,
        tetherX: 0,
        tetherY: 0
      });
    }

    // 第二海域每处暗礁深谷附近额外栖息 4 只发光水母，响应留声机共鸣托举深海重物
    var heavySpecs = window.MT.Config.HEAVY_RELICS || [];
    heavySpecs.forEach(function (spec, sIdx) {
      for (var k = 0; k < 4; k++) {
        var jx = spec.x + (k - 1.5) * 44 + (Math.random() - 0.5) * 18;
        jellyfish.push({
          x: jx,
          homeX: spec.x,
          depth: 95 + (k % 2) * 42 + Math.random() * 30,
          size: 8.5 + (k % 3) * 2.2,
          phase: sIdx * 1.3 + k * 1.5,
          speed: 9 + Math.random() * 8,
          hue: k % 2 === 0 ? 'rgba(154, 244, 212,' : 'rgba(170, 232, 255,',
          lifting: false,
          tetherX: 0,
          tetherY: 0
        });
      }
    });
  }

  // 严格整数周期谐波，确保 getWaveHeight(x + WORLD_LENGTH) === getWaveHeight(x) 零接缝误差
  function getWaveHeight(worldX, t, lanternCalm) {
    var L = getWorldLength();
    var tau = (Math.PI * 2) / L;
    var zb = getZoneBlend(worldX);
    var calmFactor = (1 - Math.min(0.42, (lanternCalm || 0) * 0.13)) * (1 - endingCalm);
    var ampScale = zb.waveMult * calmFactor;
    var w1 = Math.sin(worldX * (11 * tau) + t * 1.15) * 19 * ampScale;
    var w2 = Math.sin(worldX * (23 * tau) - t * 1.75 + 1.3) * 8.5 * ampScale;
    var w3 = Math.sin(worldX * (47 * tau) + t * 2.4) * 3.2 * ampScale;
    var surge = 0;
    for (var s = 0; s < shockwaves.length; s++) {
      var sw = shockwaves[s];
      var dist = Math.abs(deltaX(sw.x, worldX));
      var diff = dist - sw.radius;
      if (Math.abs(diff) < 72) {
        var env = Math.cos((diff / 72) * Math.PI * 0.5);
        var decay = Math.max(0, 1 - sw.radius / sw.maxRadius);
        surge -= sw.amp * env * env * decay;
      }
    }
    return w1 + w2 + w3 + surge;
  }

  function getWaveSlope(worldX, t, lanternCalm) {
    var dx = 6;
    var h1 = getWaveHeight(worldX - dx, t, lanternCalm);
    var h2 = getWaveHeight(worldX + dx, t, lanternCalm);
    return (h2 - h1) / (dx * 2);
  }

  function spawnSkyDebris(boatX, boatParts) {
    var dir = Math.random() < 0.74 ? 1 : -1;
    var pr = window.MT.Config.PROGRESSION;
    var rb = window.MT.Config.ROCKET_BELT;
    var boatZone = getZoneAt(boatX);
    var isRocketStage = boatZone.id === 'rocket_belt' && Math.random() < 0.68;

    var targetX = wrapX(boatX + dir * (isRocketStage ? (190 + Math.random() * 360) : (280 + Math.random() * 480)));
    var zone = getZoneAt(targetX);
    var type = pickTypeForZone(zone, boatParts);

    if (isRocketStage) {
      var lead = rb ? rb.STAGE_LEAD_SEC : 2.45;
      var startY = -560;
      var horizSpan = dir * (260 + Math.random() * 140);
      var vx = horizSpan / lead;
      var vy = (0 - startY) / lead;
      skyMeteors.push({
        x: targetX - horizSpan,
        y: startY,
        vx: vx,
        vy: vy,
        targetX: targetX,
        type: type,
        isRocketStage: true,
        age: 0,
        leadTime: lead,
        trail: []
      });
      if (Math.abs(deltaX(boatX, targetX)) < 920) {
        window.MT.Audio.playRocketWhistle();
      }
      return;
    }

    skyMeteors.push({
      x: targetX - dir * 320,
      y: -540,
      vx: dir * (140 + Math.random() * 55),
      vy: 190 + Math.random() * 45,
      targetX: targetX,
      type: type,
      isRocketStage: false,
      age: 0,
      leadTime: 2.4,
      trail: []
    });
  }

  function emitSplash(worldX, worldY, count, color, upwardBias) {
    for (var i = 0; i < count; i++) {
      var ang = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
      var spd = 45 + Math.random() * 145;
      particles.push({
        x: worldX + (Math.random() - 0.5) * 18,
        y: worldY,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - (upwardBias || 0),
        life: 0.65 + Math.random() * 0.55,
        maxLife: 1.2,
        size: 1.8 + Math.random() * 2.8,
        color: color || '#e6eef8',
        gravity: 240 * (1 - tideProgress * 0.5),
        kind: 'drop'
      });
    }
  }

  function emitSteam(worldX, worldY, count) {
    for (var i = 0; i < count; i++) {
      particles.push({
        x: worldX + (Math.random() - 0.5) * 28,
        y: worldY - 4,
        vx: (Math.random() - 0.5) * 48,
        vy: -32 - Math.random() * 44,
        life: 0.75 + Math.random() * 0.55,
        maxLife: 1.3,
        size: 5 + Math.random() * 7,
        color: '#f4f0e8',
        gravity: -16,
        kind: 'steam'
      });
    }
  }

  function emitSpark(worldX, worldY, vx, vy, color, size, life) {
    particles.push({
      x: worldX,
      y: worldY,
      vx: vx,
      vy: vy,
      life: life || 0.6,
      maxLife: life || 0.6,
      size: size || 3,
      color: color || '#ffd28a',
      gravity: -18,
      kind: 'glow'
    });
  }

  function emitSoundRing(worldX, worldY, color) {
    particles.push({
      x: worldX,
      y: worldY,
      vx: 0,
      vy: -8,
      life: 1.8,
      maxLife: 1.8,
      size: 12,
      color: color || '#a9f0cc',
      gravity: 0,
      kind: 'ring'
    });
  }

  function dropWakeLantern(worldX) {
    wakeLanterns.push({
      x: wrapX(worldX),
      phase: Math.random() * Math.PI * 2,
      life: 14.0
    });
    if (wakeLanterns.length > 20) wakeLanterns.shift();
  }

  function update(dt, boat, onEvent) {
    time += dt;
    var pr = window.MT.Config.PROGRESSION;
    markExplored(boat.x, boat.parts.lantern);

    var exploreRatio = getExplorationRatio();
    var boatZoneBlend = getZoneBlend(boat.x);

    // 潮汐与巨月感由「环海探索度 + 船体组装度 + 当前海域月相」自然驱动
    var partProgress = Math.min(1, boat.totalParts / 6);
    var targetTide = Math.min(1.0, 0.08 + exploreRatio * 0.44 + partProgress * 0.24 + boatZoneBlend.moonBias * 0.28);
    tideProgress += (targetTide - tideProgress) * Math.min(1, dt * 0.65);

    // 潮汐光柱唤醒：点亮 4 座古迹，或点亮≥2座且探索≥60%，或探索≥75%且装船≥4级
    var solvedCount = getSolvedLandmarkCount();
    var canAwaken = solvedCount >= 4
      || (solvedCount >= 2 && exploreRatio >= pr.PILLAR_AWAKEN_EXPLORE)
      || (exploreRatio >= 0.75 && boat.totalParts >= pr.PILLAR_AWAKEN_PARTS);
    if (!pillar.awakened && canAwaken) {
      pillar.awakened = true;
      if (!pillarAwakenNotified) {
        pillarAwakenNotified = true;
        window.MT.Audio.playPillarAwaken();
        if (typeof onEvent === 'function') onEvent('pillar_awaken');
      }
    }

    // Phase 2 · 更新高空钟摆锚点、四大古迹动画、发光巨鲸巡游与声波回声定位
    if (jellyBoostTimer > 0) jellyBoostTimer = Math.max(0, jellyBoostTimer - dt);

    for (var gi = 0; gi < grappleBuoys.length; gi++) {
      var gb = grappleBuoys[gi];
      gb.y = gb.baseY + Math.sin(time * 1.45 + gb.phase) * 7;
      gb.sway *= Math.pow(0.18, dt);
    }

    for (var lmi = 0; lmi < landmarkPuzzles.length; lmi++) {
      var lm = landmarkPuzzles[lmi];
      if (lm.solveFlash > 0) lm.solveFlash = Math.max(0, lm.solveFlash - dt * 0.75);
      if (lm.id === 'mist_bells' && lm.bells) {
        for (var bi = 0; bi < lm.bells.length; bi++) {
          if (lm.bells[bi].ringFlash > 0) lm.bells[bi].ringFlash = Math.max(0, lm.bells[bi].ringFlash - dt * 1.3);
        }
      } else if (lm.id === 'rocket_gantry' && lm.launchAnim > 0) {
        lm.launchAnim = Math.max(0, lm.launchAnim - dt * 0.35);
      } else if (lm.id === 'cloud_observatory') {
        if (lm.solved) {
          lm.dialAngle += (0 - lm.dialAngle) * Math.min(1, dt * 3);
        } else {
          lm.dialAngle = -1.1 + lm.dialProgress * 1.1 + Math.sin(time * 0.9) * 0.08;
        }
      }
    }

    // 深海发光巨鲸巡游：召唤后环绕月海优雅游弋，伴航时激起发光加速洋流
    if (moonWhale && moonWhale.active) {
      moonWhale.phase += dt * 1.65;
      moonWhale.x = wrapX(moonWhale.x + moonWhale.vx * dt);
      moonWhale.y = 74 + Math.sin(moonWhale.phase) * 20;
      var dWhale = Math.abs(deltaX(boat.x, moonWhale.x));
      if (dWhale < 900 && Math.random() < dt * 7) {
        var wxVis = projectNear(moonWhale.x, boat.x);
        emitSpark(wxVis + (Math.random() - 0.5) * 90, moonWhale.y - 12, (Math.random() - 0.5) * 16, -26 - Math.random() * 24, '#a6f4df', 2.4, 1.35);
      }
      moonWhale.breachTimer -= dt;
      if (moonWhale.breachTimer <= 0) {
        moonWhale.breachTimer = 7.5 + Math.random() * 4.5;
        if (dWhale < 1050) {
          window.MT.Audio.playWhaleSong();
        }
      }
    }

    for (var epi = echoPings.length - 1; epi >= 0; epi--) {
      echoPings[epi].life -= dt;
      if (echoPings[epi].life <= 0) echoPings.splice(epi, 1);
    }

    // 天降人类残骸频率随海域改变（火箭坠落带最密集）
    nextMeteorTimer -= dt;
    if (nextMeteorTimer <= 0) {
      spawnSkyDebris(boat.x, boat.parts);
      nextMeteorTimer = boatZoneBlend.meteorInterval * (0.75 + Math.random() * 0.5);
    }

    for (var m = skyMeteors.length - 1; m >= 0; m--) {
      var met = skyMeteors[m];
      met.age = (met.age || 0) + dt;
      met.x += met.vx * dt;
      met.y += met.vy * dt;
      met.trail.push({ x: met.x, y: met.y });
      if (met.trail.length > (met.isRocketStage ? 22 : 16)) met.trail.shift();

      if (met.isRocketStage && Math.random() < dt * 22) {
        emitSpark(
          met.x + (Math.random() - 0.5) * 10,
          met.y + (Math.random() - 0.5) * 10,
          -met.vx * 0.18 + (Math.random() - 0.5) * 35,
          -met.vy * 0.14 - 18,
          Math.random() < 0.5 ? '#ffaa6e' : '#ffe6b8',
          2.2 + Math.random() * 1.8,
          0.55
        );
      }

      var surfaceY = getWaveHeight(met.x, time, boat.parts.lantern);
      if (met.y >= surfaceY) {
        var impactX = wrapX(met.x);
        var impactVisX = projectNear(impactX, boat.x);
        if (met.isRocketStage) {
          var rb = window.MT.Config.ROCKET_BELT;
          emitSplash(impactVisX, surfaceY, 28, '#ffe3b3', 72);
          emitSteam(impactVisX, surfaceY - 4, 14);
          shockwaves.push({
            x: impactX,
            radius: 10,
            maxRadius: rb ? rb.SHOCKWAVE_MAX_R : 290,
            speed: rb ? rb.SHOCKWAVE_SPEED : 320,
            amp: rb ? rb.SHOCKWAVE_AMP : 24,
            hitBoat: false
          });
          thermalPlumes.push({
            x: impactX,
            radius: 54,
            height: 230,
            life: rb ? rb.TEMP_PLUME_DURATION : 9.5,
            maxLife: rb ? rb.TEMP_PLUME_DURATION : 9.5
          });
          spawnRelicAt(impactX, 26 + Math.random() * 24, met.type, boat.parts);
          if (Math.abs(deltaX(boat.x, impactX)) < 1150) {
            window.MT.Audio.playShockwaveSplash(1.1);
          }
        } else {
          emitSplash(impactVisX, surfaceY, 18, '#ffe6bd', 40);
          spawnRelicAt(impactX, 24 + Math.random() * 26, met.type, boat.parts);
          if (Math.abs(deltaX(boat.x, impactX)) < 1050) {
            window.MT.Audio.playSkyFallSplash();
          }
        }
        skyMeteors.splice(m, 1);
      }
    }

    // 更新第三海域火箭喷口周期热流与临时沸腾蒸汽柱
    for (var hk = 0; hk < rocketHulks.length; hk++) {
      var rh = rocketHulks[hk];
      if (rh.kind !== 'vent') continue;
      var cyc = ((time + rh.phase) % rh.cycle) / rh.cycle;
      var targetPlume = 0;
      if (cyc < rh.activeFrac) {
        var edgeIn = Math.min(1, cyc / 0.12);
        var edgeOut = Math.min(1, (rh.activeFrac - cyc) / 0.12);
        targetPlume = Math.min(edgeIn, edgeOut);
      }
      rh.plumeStrength += (targetPlume - rh.plumeStrength) * Math.min(1, dt * 5.0);
      if (rh.plumeStrength > 0.25 && Math.abs(deltaX(boat.x, rh.x)) < 1050 && Math.random() < dt * 9 * rh.plumeStrength) {
        var rhProjX = projectNear(rh.x, boat.x);
        var vySurf = getWaveHeight(rh.x, time, boat.parts.lantern);
        emitSteam(rhProjX + (Math.random() - 0.5) * 34, vySurf - 6, 1);
        emitSpark(rhProjX + (Math.random() - 0.5) * 36, vySurf - 8, (Math.random() - 0.5) * 18, -85 - Math.random() * 65, '#ffe0ad', 2.0, 1.0);
      }
    }

    for (var tpIdx = thermalPlumes.length - 1; tpIdx >= 0; tpIdx--) {
      var tp = thermalPlumes[tpIdx];
      tp.life -= dt;
      if (tp.life <= 0) {
        thermalPlumes.splice(tpIdx, 1);
        continue;
      }
      if (Math.abs(deltaX(boat.x, tp.x)) < 1050 && Math.random() < dt * 8) {
        var tpProjX = projectNear(tp.x, boat.x);
        var tSurf = getWaveHeight(tp.x, time, boat.parts.lantern);
        emitSteam(tpProjX + (Math.random() - 0.5) * 32, tSurf - 6, 1);
      }
    }

    for (var swIdx = shockwaves.length - 1; swIdx >= 0; swIdx--) {
      var sw = shockwaves[swIdx];
      sw.radius += sw.speed * dt;
      if (sw.radius >= sw.maxRadius) {
        shockwaves.splice(swIdx, 1);
      }
    }

    // 第四海域浮空岛轻盈呼吸、全环海月风加速环微动与月光上升流粒子
    for (var ci = 0; ci < cloudIslands.length; ci++) {
      var isl = cloudIslands[ci];
      isl.y = isl.baseY + Math.sin(time * 0.85 + isl.phase) * isl.bobAmp;
    }

    for (var wr = 0; wr < windRings.length; wr++) {
      var ring = windRings[wr];
      ring.y = ring.baseY + Math.sin(time * 1.35 + ring.phase) * 7;
      if (ring.cooldown > 0) ring.cooldown = Math.max(0, ring.cooldown - dt);
      if (ring.flash > 0) ring.flash = Math.max(0, ring.flash - dt * 1.8);
    }

    for (var gs = 0; gs < gravityStreams.length; gs++) {
      var st = gravityStreams[gs];
      if (Math.abs(deltaX(boat.x, st.x)) < 980 && Math.random() < dt * 7.5) {
        var stProjX = projectNear(st.x, boat.x);
        var sSurf = getWaveHeight(st.x, time, boat.parts.lantern);
        emitSpark(
          stProjX + (Math.random() - 0.5) * st.radius * 1.1,
          sSurf - Math.random() * 140,
          (Math.random() - 0.5) * 10,
          -48 - Math.random() * 44,
          Math.random() < 0.5 ? '#d8eeff' : '#fff0c8',
          2.0 + Math.random() * 1.4,
          1.65
        );
      }
    }
    if (boatZoneBlend.zone.id === 'cloud_sea' && Math.random() < dt * 10) {
      var rxD = boat.x + (Math.random() - 0.5) * 1250;
      var ryD = getWaveHeight(rxD, time, boat.parts.lantern);
      emitSpark(rxD, ryD - 2, (Math.random() - 0.5) * 12, -32 - Math.random() * 46, '#e6f4ff', 2.0 + Math.random() * 1.8, 3.2);
    }

    for (var sl = skyLanterns.length - 1; sl >= 0; sl--) {
      var skl = skyLanterns[sl];
      skl.life -= dt;
      if (skl.life <= 0) {
        skyLanterns.splice(sl, 1);
        continue;
      }
      skl.phase += dt * 1.4;
      skl.x += (skl.vx + Math.sin(skl.phase) * 9) * dt;
      skl.y += skl.vy * dt;
    }

    // 保持小船附近始终有克制而自然的漂流遗物（360° 无缝环形距离）
    var nearbyCount = 0;
    var heavyTargets = [];
    for (var i = relics.length - 1; i >= 0; i--) {
      var r = relics[i];
      var dBoatToR = deltaX(boat.x, r.x);
      if (Math.abs(dBoatToR) < 1150) nearbyCount++;
      if (r.isHeavy) {
        r.jellyCount = 0;
        if (Math.abs(dBoatToR) < 340 + boat.parts.gramophone * 95) {
          heavyTargets.push(r);
        }
      }
      if (!r.caught) {
        r.bobPhase += dt * (r.isHeavy ? 0.85 : (r.isAirborne ? 1.15 : 1.4));
        if (r.isAirborne) {
          r.x = wrapX(r.homeX + Math.sin(r.bobPhase * 0.72) * 20);
          var gLower = (boat.parts.gramophone > 0 && Math.abs(deltaX(boat.x, r.x)) < 230)
            ? Math.min(28, boat.parts.gramophone * 10)
            : 0;
          var targetAlt = Math.max(82, r.baseAlt - gLower);
          r.alt += (targetAlt - r.alt) * Math.min(1, dt * 1.8);
          r.y = -r.alt + Math.sin(r.bobPhase) * 8;
        } else if (!r.isHeavy && boat.parts.gramophone > 0) {
          var toBoat = deltaX(r.x, boat.x);
          var dist = Math.abs(toBoat);
          if (dist < 260 + boat.parts.gramophone * 90 && dist > 18) {
            r.x = wrapX(r.x + Math.sign(toBoat) * (26 + boat.parts.gramophone * 14) * dt);
            r.depth = Math.max(18, r.depth - 14 * dt);
          }
        }
      }
    }
    if (nearbyCount < 5 && relics.length < 56) {
      var side = Math.random() < 0.72 ? (boat.facing || 1) : -(boat.facing || 1);
      var rx = wrapX(boat.x + side * (520 + Math.random() * 580));
      var rDepth = 20 + Math.random() * 34;
      spawnRelicAt(rx, rDepth, null, boat.parts);
    }

    // 发光水母：安装留声机或释放主动声波脉冲时自动聚拢托举深海重物
    var effectiveGramo = Math.max(boat.parts.gramophone || 0, jellyBoostTimer > 0 ? 2 : 0);
    var maxJelliesPerHeavy = effectiveGramo > 0 ? Math.min(4, 1 + effectiveGramo) : 0;
    jellyfish.forEach(function (j) {
      j.phase += dt * 2.1;
      j.lifting = false;

      var assigned = null;
      if (maxJelliesPerHeavy > 0 && heavyTargets.length > 0) {
        var bestDist = 420;
        for (var hIdx = 0; hIdx < heavyTargets.length; hIdx++) {
          var hr = heavyTargets[hIdx];
          if (hr.jellyCount >= maxJelliesPerHeavy) continue;
          var hd = Math.abs(deltaX(j.x, hr.x));
          if (hd < bestDist) {
            bestDist = hd;
            assigned = hr;
          }
        }
      }

      if (assigned) {
        var slot = assigned.jellyCount;
        assigned.jellyCount += 1;
        var waveAtH = getWaveHeight(assigned.x, time, boat.parts.lantern);
        var hy = waveAtH + assigned.depth + (assigned.caught ? 0 : Math.sin(assigned.bobPhase) * 4);
        var spread = (slot - (Math.min(maxJelliesPerHeavy, 3) - 1) * 0.5) * 26;
        var targetX = wrapX(assigned.x + spread + Math.sin(j.phase * 0.9) * 5);
        var targetY = hy + 26 + (slot % 2) * 10 + Math.cos(j.phase) * 3;

        j.x = wrapX(j.x + deltaX(j.x, targetX) * Math.min(1, dt * 2.6));
        j.depth += (targetY - j.depth) * Math.min(1, dt * 2.6);

        if (Math.hypot(deltaX(j.x, assigned.x), j.depth - hy) < 76) {
          j.lifting = true;
          j.tetherX = assigned.x;
          j.tetherY = hy + 6;
        }
      } else {
        j.depth += Math.sin(j.phase) * 9 * dt;
        if (boat.parts.gramophone > 0) {
          var jdx = deltaX(j.x, boat.x);
          if (Math.abs(jdx) < 420 && Math.abs(jdx) > 45) {
            j.x = wrapX(j.x + Math.sign(jdx) * 18 * dt);
          }
        } else if (typeof j.homeX === 'number') {
          var drift = wrapX(j.homeX + Math.sin(j.phase * 0.25) * 85);
          j.x = wrapX(j.x + deltaX(j.x, drift) * Math.min(1, dt * 0.45));
        } else {
          j.x = wrapX(j.x + Math.cos(j.phase * 0.35) * j.speed * dt);
        }
      }
    });

    // 深海重物托举浮升与回落逻辑
    for (var hi = 0; hi < relics.length; hi++) {
      var hr2 = relics[hi];
      if (!hr2.isHeavy) continue;
      var activeLifters = 0;
      for (var ji = 0; ji < jellyfish.length; ji++) {
        if (jellyfish[ji].lifting && Math.abs(deltaX(jellyfish[ji].tetherX, hr2.x)) < 2) {
          activeLifters++;
        }
      }
      var targetAssist = Math.min(1.0, activeLifters * 0.36);
      var prevAssist = hr2.jellyAssist;
      hr2.jellyAssist += (targetAssist - hr2.jellyAssist) * Math.min(1, dt * 2.4);
      hr2.effectiveWeight = Math.max(0.08, 1.0 - hr2.jellyAssist * 0.90);

      if (prevAssist < 0.22 && hr2.jellyAssist >= 0.22) {
        window.MT.Audio.playJellyLift();
        if (!jellyLiftNotified) {
          jellyLiftNotified = true;
          if (typeof onEvent === 'function') onEvent('jelly_lift', hr2);
        }
      }

      if (!hr2.caught) {
        if (hr2.jellyAssist > 0.16) {
          hr2.sinkReturn = false;
          if (hr2.depth > hr2.liftedDepth) {
            hr2.depth = Math.max(hr2.liftedDepth, hr2.depth - (18 + hr2.jellyAssist * 28) * dt);
            if (Math.random() < dt * 3.5) {
              var wyLift = getWaveHeight(hr2.x, time, boat.parts.lantern);
              var hrProjX = projectNear(hr2.x, boat.x);
              emitSpark(hrProjX + (Math.random() - 0.5) * 26, wyLift + hr2.depth + 8, (Math.random() - 0.5) * 10, -28 - Math.random() * 18, '#a9f0cc', 2.2, 0.9);
            }
          }
        } else if (hr2.depth < hr2.baseDepth) {
          hr2.depth = Math.min(hr2.baseDepth, hr2.depth + (hr2.sinkReturn ? 46 : 14) * dt);
          if (hr2.depth >= hr2.baseDepth - 1) hr2.sinkReturn = false;
        }
        if (hr2.sinkReturn && typeof hr2.homeX === 'number') {
          hr2.x = wrapX(hr2.x + deltaX(hr2.x, hr2.homeX) * Math.min(1, dt * 1.2));
        }
      }
    }

    // 第三/四海域高潮时海面开始出现向上飘落的失重发光水珠
    if (tideProgress > 0.45 && Math.random() < (tideProgress - 0.38) * 0.5) {
      var px = boat.x + (Math.random() - 0.5) * 1450;
      var py = getWaveHeight(px, time, boat.parts.lantern);
      emitSpark(px, py, (Math.random() - 0.5) * 14, -22 - Math.random() * 34, '#e9f2ff', 1.8 + Math.random() * 1.8, 2.8);
    }

    for (var wl = wakeLanterns.length - 1; wl >= 0; wl--) {
      wakeLanterns[wl].life -= dt;
      if (wakeLanterns[wl].life <= 0) wakeLanterns.splice(wl, 1);
    }

    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.life -= dt;
      if (pt.life <= 0) {
        particles.splice(p, 1);
        continue;
      }
      if (pt.kind === 'ring') {
        pt.size += 92 * dt;
        pt.y += pt.vy * dt;
      } else if (pt.kind === 'steam') {
        pt.size += 14 * dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vx *= Math.pow(0.25, dt);
      } else {
        pt.vy += pt.gravity * dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
      }
    }
  }

  return {
    reset: reset,
    update: update,
    getWorldLength: getWorldLength,
    wrapX: wrapX,
    deltaX: deltaX,
    projectNear: projectNear,
    getZoneAt: getZoneAt,
    getZoneBlend: getZoneBlend,
    getWaveHeight: getWaveHeight,
    getWaveSlope: getWaveSlope,
    getReefSurfaceY: getReefSurfaceY,
    getFogClarityAt: getFogClarityAt,
    getRampSurfaceAt: getRampSurfaceAt,
    getThermalForceAt: getThermalForceAt,
    getCloudIslandSurfaceAt: getCloudIslandSurfaceAt,
    getGravityStreamAt: getGravityStreamAt,
    findHookInteractableAt: findHookInteractableAt,
    triggerSonarPulse: triggerSonarPulse,
    markLandmarkSolved: markLandmarkSolved,
    getLandmarkById: getLandmarkById,
    getSolvedLandmarkCount: getSolvedLandmarkCount,
    spawnSkyLantern: spawnSkyLantern,
    setEndingCalmTarget: setEndingCalmTarget,
    emitSplash: emitSplash,
    emitSteam: emitSteam,
    emitSpark: emitSpark,
    emitSoundRing: emitSoundRing,
    dropWakeLantern: dropWakeLantern,
    getTime: function () { return time; },
    getTide: function () { return tideProgress; },
    getRelics: function () { return relics; },
    getSkyMeteors: function () { return skyMeteors; },
    getJellyfish: function () { return jellyfish; },
    getLandmarks: function () { return landmarks; },
    getReefs: function () { return reefs; },
    getRocketHulks: function () { return rocketHulks; },
    getShockwaves: function () { return shockwaves; },
    getThermalPlumes: function () { return thermalPlumes; },
    getCloudIslands: function () { return cloudIslands; },
    getGravityStreams: function () { return gravityStreams; },
    getWindRings: function () { return windRings; },
    getGrappleBuoys: function () { return grappleBuoys; },
    getLandmarkPuzzles: function () { return landmarkPuzzles; },
    getEchoPings: function () { return echoPings; },
    getMoonWhale: function () { return moonWhale; },
    getJellyBoostTimer: function () { return jellyBoostTimer; },
    getSkyLanterns: function () { return skyLanterns; },
    getExploredSectors: function () { return exploredSectors; },
    getExplorationRatio: getExplorationRatio,
    getEndingCalm: function () { return endingCalm; },
    getParticles: function () { return particles; },
    getWakeLanterns: function () { return wakeLanterns; },
    getPillar: function () { return pillar; }
  };
})();
