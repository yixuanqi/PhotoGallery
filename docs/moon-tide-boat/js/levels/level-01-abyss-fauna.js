window.MT = window.MT || {};

// v10 Step 2：深海生物多样性生态模块（银光沙丁鱼群、月影蝠鲼、深渊提灯鱼、黑烟囱热泉、巨型发光海藻林、远景深渊巨鲸）
window.MT.AbyssFauna = (function () {
  var sardineSchools = [];
  var mantaRays = [];
  var anglerFish = [];
  var thermalVents = [];
  var kelpForests = [];
  var abyssWhales = [];
  var kelpSpores = [];
  var echoRings = []; // 鲸群与鱼群回应声呐释放的柔和光环
  var whaleSongCd = 4.5;
  var nextId = 1;

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function h1(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  function getBedY(x) {
    if (window.MT.Abyss && window.MT.Abyss.getSeabedY) {
      return window.MT.Abyss.getSeabedY(x);
    }
    return 390;
  }

  // 查询当前时间时钟下的动态生态阶段系数（灾前平静 / 撞击沸海 / 尘幕灰海 / 荧光新生 / 破晓）
  function getEcoState(worldX) {
    var isExp = !!(window.MT.Config && window.MT.Config.EXPLORE_MODE);
    if (!isExp) {
      return { isExp: false, postImpact: 1.0, hazard: 1.0, kelpBloom: 0.85, biolum: 0.5, dawn: 0 };
    }
    var eras = window.MT.Eras;
    var eb = (eras && eras.getEraBlend) ? eras.getEraBlend(worldX || 520) : null;
    var sp = eb ? eb.seaPhase : null;
    var boil = sp ? (sp.boilAbyss || 0) : 0;
    var ash = sp ? (sp.ashSea || 0) : 0;
    var kelp = sp ? (sp.kelpAbyss || 0) : 0;
    var dawn = sp ? (sp.dawn || 0) : 0;
    var biol = sp ? (sp.biolum || 0) : 0;
    var hazard = Math.min(1, boil + ash);
    var postImpact = Math.min(1, boil + ash + kelp);
    var kelpBloom = clamp(0.25 + biol * 0.48 + kelp * 0.85 + dawn * 0.52 - ash * 0.10, 0.20, 1.0);
    return {
      isExp: true,
      boil: boil,
      ash: ash,
      kelp: kelp,
      dawn: dawn,
      biolum: biol,
      hazard: hazard,
      postImpact: postImpact,
      kelpBloom: kelpBloom
    };
  }

  function buildEcosystem() {
    sardineSchools = [];
    mantaRays = [];
    anglerFish = [];
    thermalVents = [];
    kelpForests = [];
    abyssWhales = [];
    kelpSpores = [];

    var isExp = !!(window.MT.Config && window.MT.Config.EXPLORE_MODE);
    var schoolSpecs = isExp ? [
      { x: 1220, y: 195, count: 24, dirY:  0.10 },
      { x: 2940, y: 220, count: 26, dirY:  0.08 },
      { x: 4520, y: 205, count: 28, dirY:  0.10 },
      { x: 6180, y: 230, count: 26, dirY:  0.06 },
      { x: 7620, y: 215, count: 28, dirY:  0.04 },
      { x: 8960, y: 185, count: 30, dirY: -0.14 }
    ] : [
      { x: 15460, y: 215, count: 24, dirY:  0.14 },
      { x: 16820, y: 220, count: 26, dirY:  0.10 },
      { x: 18520, y: 210, count: 28, dirY:  0.12 },
      { x: 19980, y: 235, count: 26, dirY:  0.08 },
      { x: 21780, y: 225, count: 28, dirY:  0.05 },
      { x: 23050, y: 185, count: 30, dirY: -0.22 }
    ];
    schoolSpecs.forEach(function (sp, idx) {
      var fish = [];
      for (var i = 0; i < sp.count; i++) {
        var row = (i % 5) - 2;
        var col = Math.floor(i / 5) - 2.5;
        fish.push({
          ox: col * 19 + (h1(idx * 31 + i * 3.7) - 0.5) * 14,
          oy: row * 12 + (h1(idx * 17 + i * 5.3) - 0.5) * 12,
          dx: 0, dy: 0,
          vx: 0, vy: 0,
          len: 10 + h1(i * 9.1 + idx) * 6,
          phase: i * 0.65 + idx
        });
      }
      sardineSchools.push({
        id: nextId++,
        x: sp.x, y: sp.y,
        baseX: sp.x, baseY: sp.y,
        dirY: sp.dirY,
        phase: idx * 1.4,
        boostCd: 0,
        shimmer: 0,
        resonanceTimer: 0,
        resonanceAngle: 0,
        followTimer: 0,
        fish: fish
      });
    });

    var mantaSpecs = isExp ? [
      { x: 1860, y: 178, span: 68, speed: 28 },
      { x: 3580, y: 192, span: 76, speed: 32 },
      { x: 5280, y: 176, span: 72, speed: 30 },
      { x: 6940, y: 182, span: 82, speed: 34 },
      { x: 8560, y: 168, span: 78, speed: 32 }
    ] : [
      { x: 16320, y: 185, span: 68, speed: 34 },
      { x: 18150, y: 195, span: 76, speed: 38 },
      { x: 19560, y: 180, span: 72, speed: 36 },
      { x: 21240, y: 175, span: 82, speed: 42 },
      { x: 22860, y: 165, span: 78, speed: 44 }
    ];
    mantaSpecs.forEach(function (ms, idx) {
      mantaRays.push({
        id: nextId++,
        x: ms.x, y: ms.y, baseY: ms.y,
        span: ms.span,
        speed: ms.speed,
        phase: idx * 1.85,
        slipCd: 0,
        glow: 0,
        trail: []
      });
    });

    var anglerSpecs = isExp ? [
      { x: 2340, y: 285, scale: 0.96 },
      { x: 4760, y: 278, scale: 1.04 },
      { x: 6420, y: 292, scale: 1.02 },
      { x: 8140, y: 268, scale: 1.08 }
    ] : [
      { x: 17660, y: 278, scale: 0.96 },
      { x: 19380, y: 268, scale: 1.05 },
      { x: 20420, y: 288, scale: 1.02 },
      { x: 21960, y: 256, scale: 1.10 }
    ];
    anglerSpecs.forEach(function (as, idx) {
      anglerFish.push({
        id: nextId++,
        x: as.x, y: as.y, baseX: as.x, baseY: as.y,
        scale: as.scale,
        phase: idx * 2.1,
        state: 'lurk', // lurk | lunge | banished
        exposed: 0,    // 声呐或探照灯照射暴露度 (0..1)
        lungeTimer: 0,
        banishVx: 0, banishVy: 0,
        biteCd: 0,
        warnedSonar: false
      });
    });

    var ventSpecs = isExp ? [
      { x: 2060, h: 86,  plumeH: 225, phase: 0.3 },
      { x: 3780, h: 98,  plumeH: 240, phase: 1.5 },
      { x: 4920, h: 108, plumeH: 255, phase: 2.4 },
      { x: 6680, h: 112, plumeH: 260, phase: 0.9 },
      { x: 8480, h: 102, plumeH: 255, phase: 3.1 },
      { x: 9240, h: 92,  plumeH: 270, phase: 0.0 }
    ] : [
      { x: 16620, h: 86,  plumeH: 225, phase: 0.3 },
      { x: 18760, h: 98,  plumeH: 240, phase: 1.5 },
      { x: 20160, h: 108, plumeH: 255, phase: 2.4 },
      { x: 21080, h: 116, plumeH: 265, phase: 0.9 },
      { x: 22080, h: 102, plumeH: 255, phase: 3.1 },
      { x: 23280, h: 92,  plumeH: 280, phase: 0.0 }
    ];
    ventSpecs.forEach(function (vs, idx) {
      var by = getBedY(vs.x);
      var worms = [];
      for (var w = 0; w < 6; w++) {
        worms.push({
          ox: -28 + w * 11 + (h1(idx * 13 + w) - 0.5) * 4,
          len: 14 + h1(idx * 7 + w * 3) * 14,
          phase: w * 1.1 + idx,
          cyan: (idx >= 3 && w % 2 === 0)
        });
      }
      thermalVents.push({
        id: nextId++,
        x: vs.x, bedY: by,
        chimneyH: vs.h,
        plumeH: vs.plumeH,
        phase: vs.phase,
        boostCd: 0,
        worms: worms
      });
    });

    var kelpSpecs = isExp ? [
      { x0: 1060, count: 6,  span: 260, minH: 115, maxH: 185, biolum: 0.65 },
      { x0: 2560, count: 6,  span: 260, minH: 120, maxH: 195, biolum: 0.78 },
      { x0: 5180, count: 9,  span: 380, minH: 150, maxH: 240, biolum: 0.90 },
      { x0: 7120, count: 8,  span: 320, minH: 145, maxH: 235, biolum: 1.00 },
      { x0: 8740, count: 9,  span: 380, minH: 150, maxH: 245, biolum: 0.96 }
    ] : [
      { x0: 17440, count: 6,  span: 240, minH: 110, maxH: 175, biolum: 0.45 },
      { x0: 19660, count: 7,  span: 290, minH: 130, maxH: 205, biolum: 0.65 },
      { x0: 20880, count: 9,  span: 380, minH: 155, maxH: 245, biolum: 0.88 },
      { x0: 21480, count: 11, span: 440, minH: 165, maxH: 265, biolum: 1.00 },
      { x0: 22520, count: 10, span: 420, minH: 160, maxH: 255, biolum: 1.00 }
    ];
    kelpSpecs.forEach(function (ks, idx) {
      var fronds = [];
      for (var f = 0; f < ks.count; f++) {
        var u = ks.count > 1 ? (f / (ks.count - 1)) : 0.5;
        var fx = ks.x0 + u * ks.span + (h1(idx * 29 + f * 4.1) - 0.5) * 24;
        var fh = ks.minH + h1(idx * 19 + f * 7.3) * (ks.maxH - ks.minH);
        fronds.push({
          x: fx,
          bedY: getBedY(fx),
          h: fh,
          segs: 7,
          swayAmp: 12 + h1(f * 3.3 + idx) * 14,
          phase: f * 0.9 + idx * 1.5,
          disturb: 0,
          hueCyan: f % 3 !== 0
        });
      }
      kelpForests.push({
        id: nextId++,
        x0: ks.x0 - 40,
        x1: ks.x0 + ks.span + 40,
        biolum: ks.biolum,
        fronds: fronds,
        glowCd: 0
      });
    });

    abyssWhales = isExp ? [
      { id: nextId++, x: 2200, y: 175, len: 390, speed: 14, phase: 0.4, dir:  1, alpha: 0.24 },
      { id: nextId++, x: 5600, y: 205, len: 450, speed: 12, phase: 2.3, dir: -1, alpha: 0.22 },
      { id: nextId++, x: 8400, y: 168, len: 420, speed: 15, phase: 4.1, dir:  1, alpha: 0.28 }
    ] : [
      { id: nextId++, x: 16500, y: 170, len: 390, speed: 14, phase: 0.4, dir:  1, alpha: 0.24 },
      { id: nextId++, x: 19800, y: 195, len: 450, speed: 12, phase: 2.3, dir: -1, alpha: 0.22 },
      { id: nextId++, x: 22400, y: 160, len: 420, speed: 16, phase: 4.1, dir:  1, alpha: 0.30 }
    ];
  }

  function reset() {
    whaleSongCd = 3.8;
    echoRings = [];
    buildEcosystem();
  }

  // 潮汐声呐 / 主动声呐扫过深渊：戳破提灯鱼伪装、触发银鱼群星环圆舞、引发深渊巨鲸回唱、自动收录与实景邮票抓拍！
  function onSonarSweep(boatX, boatY, radius, eras, isActivePing, boat, onLevelEvent) {
    var resonated = false;
    var ecoS = getEcoState(boatX);

    // 1) 识破深渊提灯鱼
    for (var i = 0; i < anglerFish.length; i++) {
      var af = anglerFish[i];
      if (af.state === 'banished') continue;
      if (ecoS.isExp && ecoS.hazard < 0.20) continue;
      if (Math.hypot(af.x - boatX, af.y - boatY) <= radius + 45) {
        af.exposed = 1.0;
        if (isActivePing) {
          tryDiscoverFauna('fauna_angler', '深渊提灯鱼', boat, onLevelEvent, af.x, af.y);
          resonated = true;
        }
        if (!af.warnedSonar) {
          af.warnedSonar = true;
          if (eras && eras.addPopup) {
            eras.addPopup(af.x, af.y - 46, '◈ 声呐识破深渊提灯鱼！（空格冲刺反制）', '#ffe49e');
          }
        }
      }
    }

    if (!isActivePing) return resonated;

    // 2) 银光沙丁鱼群星环圆舞共振！
    for (var si = 0; si < sardineSchools.length; si++) {
      var sc = sardineSchools[si];
      if (Math.hypot(sc.x - boatX, sc.y - boatY) <= radius + 60) {
        if ((sc.resonanceTimer || 0) < 0.8) {
          sc.resonanceTimer = 4.4;
          sc.followTimer = 10.0; // 声呐唤起后跟随小潜艇游动 10 秒，方便带领穿环解谜！
          sc.shimmer = 1.0;
          resonated = true;
          echoRings.push({ x: sc.x, y: sc.y, r: 22, maxR: 138, life: 1.15, maxLife: 1.15, col: '214, 250, 255' });
          if (window.MT.Audio && window.MT.Audio.playResonanceChord) window.MT.Audio.playResonanceChord('sardine');
          if (boat) {
            var sm = (boat.stats && boat.stats.starMult) || 1;
            var sB = Math.round(12 * sm);
            boat.runStars += sB;
            boat.breath = Math.min(1.0, (boat.breath || 0) + 0.16);
            if (eras && eras.addPopup) eras.addPopup(sc.x, sc.y - 46, '✦ 银鱼流光伴游! +' + sB + '✦', '#d4faff');
          }
          tryDiscoverFauna('fauna_sardine', '银光沙丁鱼群', boat, onLevelEvent, sc.x, sc.y);
        }
      }
    }

    // 3) 月影蝠鲼共鸣微光与实景收录
    for (var mi = 0; mi < mantaRays.length; mi++) {
      var mt = mantaRays[mi];
      if (Math.hypot(mt.x - boatX, mt.y - boatY) <= radius + 60) {
        mt.glow = 1.0;
        echoRings.push({ x: mt.x, y: mt.y, r: 18, maxR: 118, life: 1.0, maxLife: 1.0, col: '154, 242, 255' });
        tryDiscoverFauna('fauna_manta', '月影蝠鲼', boat, onLevelEvent, mt.x, mt.y);
        resonated = true;
      }
    }

    // 4) 远景深渊巨鲸悠长二重唱回响！
    for (var wi = 0; wi < abyssWhales.length; wi++) {
      var aw = abyssWhales[wi];
      if (Math.abs(aw.x - boatX) <= radius + 280) {
        echoRings.push({ x: aw.x, y: aw.y, r: 34, maxR: 220, life: 1.6, maxLife: 1.6, col: '186, 240, 255' });
        if (window.MT.Audio && window.MT.Audio.playResonanceChord) window.MT.Audio.playResonanceChord('whale');
        if (eras && eras.addPopup) eras.addPopup(boatX, boatY - 52, '✦ 远方深渊巨鲸传回悠长鲸鸣…', '#cbeeff');
        tryDiscoverFauna('fauna_whale', '深渊与月下蓝鲸', boat, onLevelEvent, aw.x, aw.y);
        resonated = true;
        break;
      }
    }

    // 5) 发光海藻林磷光共振
    for (var ki = 0; ki < kelpForests.length; ki++) {
      var kf = kelpForests[ki];
      var kMid = (kf.x0 + kf.x1) * 0.5;
      if (Math.abs(kMid - boatX) <= radius + 120) {
        kf.fronds.forEach(function (fr) { fr.disturb = Math.max(fr.disturb, 0.85); });
        tryDiscoverFauna('fauna_kelp', '发光海藻林', boat, onLevelEvent, kMid, boatY);
      }
    }

    return resonated;
  }

  function tryDiscoverFauna(faunaId, label, boat, onLevelEvent, fx, fy) {
    if (!window.MT.Shop || !window.MT.Shop.discoverFauna) return;
    var isNew = window.MT.Shop.discoverFauna(faunaId);
    var needsSnap = !!(window.MT.Shop.getSnapshot && !window.MT.Shop.getSnapshot(faunaId));
    if (isNew || needsSnap) {
      var snapUrl = null;
      if (window.MT.Snapshot && window.MT.Snapshot.captureFromLiveCanvas) {
        snapUrl = window.MT.Snapshot.captureFromLiveCanvas(faunaId, label, fx, fy);
      }
      if (isNew) {
        if (boat) {
          var mult = (boat.stats && boat.stats.starMult) || 1;
          boat.runStars += Math.round(15 * mult);
        }
        if (window.MT.Audio && window.MT.Audio.playRelicFound) {
          window.MT.Audio.playRelicFound();
        }
        if (typeof onLevelEvent === 'function') {
          onLevelEvent('codex_discover', { kind: 'fauna', id: faunaId, name: label, snapshot: snapUrl });
        } else if (typeof window.MT.onCodexDiscover === 'function') {
          window.MT.onCodexDiscover({ kind: 'fauna', id: faunaId, name: label, snapshot: snapUrl });
        }
      }
    }
  }

  function emitKelpSpore(x, y, cyan) {
    if (kelpSpores.length > 90) kelpSpores.shift();
    kelpSpores.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 44,
      vy: -22 - Math.random() * 42,
      r: 2.0 + Math.random() * 2.6,
      cyan: !!cyan,
      life: 1.0 + Math.random() * 0.7,
      maxLife: 1.7
    });
  }

  function update(dt, boat, eras, addComboFn, onLevelEvent) {
    var t = eras.getTime();
    var st = boat.stats || { starMult: 1, crashDamageMult: 1, skySailLv: 0, tideSonarLv: 0 };
    var mix = (window.MT.Abyss && window.MT.Abyss.getAbyssMix) ? window.MT.Abyss.getAbyssMix(boat.x) : 0;
    if (mix < 0.01 && !boat.inAbyss) return;

    if (boat.kelpGlowTimer > 0) boat.kelpGlowTimer = Math.max(0, boat.kelpGlowTimer - dt);
    if (boat.mantaSlipTimer > 0) boat.mantaSlipTimer = Math.max(0, boat.mantaSlipTimer - dt);

    var isExpU = !!(window.MT.Config && window.MT.Config.EXPLORE_MODE);
    var inSub = !!(boat.inAbyss || boat.isDiving);
    abyssWhales.forEach(function (aw) {
      aw.phase += dt * 0.65;
      aw.x += aw.speed * aw.dir * dt;
      if (isExpU) {
        if (aw.x > 9400) aw.dir = -1;
        else if (aw.x < 600) aw.dir = 1;
      }
      if (inSub && Math.abs(aw.x - boat.x) < 340) {
        tryDiscoverFauna('fauna_whale', '深渊与月下蓝鲸', boat, onLevelEvent);
      }
    });
    if (boat.inAbyss) {
      whaleSongCd -= dt;
      if (whaleSongCd <= 0) {
        whaleSongCd = 11.5 + Math.random() * 6.0;
        if (window.MT.Audio && window.MT.Audio.playDeepWhaleSong) {
          window.MT.Audio.playDeepWhaleSong();
        }
      }
    }

    var ecoNow = getEcoState(boat.x);

    // 1. 银光沙丁鱼群：常态巡游；被声呐唤起后可温柔跟随 Q 版小潜艇穿越浅海石环解谜！
    for (var si = 0; si < sardineSchools.length; si++) {
      var sc = sardineSchools[si];
      sc.phase += dt * 2.4;
      if (sc.boostCd > 0) sc.boostCd = Math.max(0, sc.boostCd - dt);
      if (sc.shimmer > 0) sc.shimmer = Math.max(0, sc.shimmer - dt * 1.4);
      if (sc.followTimer > 0) sc.followTimer = Math.max(0, sc.followTimer - dt);

      if (sc.followTimer > 0 && inSub) {
        var fDirF = (typeof boat.facing === 'number') ? boat.facing : 1;
        var goalX = boat.x - fDirF * 68;
        var goalY = clamp(boat.y - 10, 62, getBedY(goalX) - 36);
        sc.x += (goalX - sc.x) * Math.min(1, dt * 3.2);
        sc.y += (goalY - sc.y) * Math.min(1, dt * 3.2);
        sc.tightness = 0.85;
      } else {
        var hazardDepthShift = ecoNow.isExp ? (ecoNow.hazard * 66 - (1 - ecoNow.postImpact) * 32) : 0;
        var targetScY = clamp(sc.baseY + hazardDepthShift, 96, getBedY(sc.x) - 52);
        sc.x += (sc.baseX - sc.x) * Math.min(1, dt * 0.45);
        sc.y += (targetScY + Math.sin(sc.phase * 0.7) * (14 - ecoNow.hazard * 5) - sc.y) * Math.min(1, dt * 1.8);
        sc.tightness = ecoNow.isExp ? (1.0 - ecoNow.hazard * 0.28) : 1.0;
      }

      if (Math.abs(sc.x - boat.x) > 780) continue;

      var nearSchool = Math.hypot(boat.x - sc.x, boat.y - sc.y) < 140;
      if (inSub && nearSchool) {
        tryDiscoverFauna('fauna_sardine', '银光沙丁鱼群', boat, onLevelEvent);
      }
      if (inSub && nearSchool && sc.boostCd <= 0) {
        sc.boostCd = 2.8;
        sc.shimmer = 1.0;
        boat.vx = Math.min((st.maxSpeed || 560) + 120, boat.vx + 72);
        boat.breath = Math.min(1.0, (boat.breath || 0) + 0.14);
        var sStar = Math.round(10 * st.starMult);
        boat.runStars += sStar;
        boat.runSchoolsPassed = (boat.runSchoolsPassed || 0) + 1;
        if (window.MT.Audio && window.MT.Audio.playSardineShimmer) window.MT.Audio.playSardineShimmer();
        eras.addPopup(sc.x, sc.y - 38, '✦ 银鱼群引路顺流! +' + sStar + '✦', '#ccf6ff');
      }

      if (sc.resonanceTimer > 0) {
        sc.resonanceTimer = Math.max(0, sc.resonanceTimer - dt);
        sc.resonanceAngle = (sc.resonanceAngle || 0) + dt * 2.25;
      }
      var resOn = (sc.resonanceTimer || 0) > 0.05;
      var totalF = sc.fish.length;

      // 每条小鱼：常态弹性避让木舟；声呐共振时优雅聚拢成旋转发光星环圆舞！
      for (var fi = 0; fi < totalF; fi++) {
        var f = sc.fish[fi];
        f.phase += dt * (resOn ? 11.5 : 7.5);
        var tScale = sc.tightness || 1.0;
        if (resOn) {
          // 自然灵动的「流光丝带 8 字游曳」（带错落层深与有机散度，彻底告别死板空心机械圆环！）
          var flowT = (sc.resonanceAngle || 0) * 0.95 - (fi / totalF) * Math.PI * 2.1;
          var band = ((fi % 3) - 1) * 11;
          var jitter = (h1(fi * 7.3 + sc.id) - 0.5) * 16;
          var targetXRel = Math.sin(flowT) * (88 + band * 0.8) + jitter * 0.6;
          var targetYRel = Math.sin(flowT * 2.0) * (28 + Math.abs(band) * 0.45) + band * 0.7;
          var goalDx = targetXRel - f.ox * tScale;
          var goalDy = targetYRel - f.oy * tScale;
          f.vx += ((goalDx - f.dx) * 6.5 - f.vx * 3.4) * dt;
          f.vy += ((goalDy - f.dy) * 6.5 - f.vy * 3.4) * dt;
          f.dx += f.vx * dt;
          f.dy += f.vy * dt;
        } else {
          var fx = sc.x + f.ox * tScale + f.dx;
          var fy = sc.y + f.oy * tScale + f.dy;
          var rx = fx - boat.x;
          var ry = fy - boat.y;
          var dist = Math.hypot(rx, ry);
          if (dist < 82 && dist > 1) {
            var push = (1 - dist / 82) * 320;
            f.vx += (rx / dist) * push * dt;
            f.vy += (ry / dist) * push * dt;
          }
          f.vx += (-f.dx * 7.5 - f.vx * 3.6) * dt;
          f.vy += (-f.dy * 7.5 - f.vy * 3.6) * dt;
          f.dx += f.vx * dt;
          f.dy += f.vy * dt;
        }
      }
    }

    // 2. 月影蝠鲼：优雅行波振翼滑翔 + 「蝠鲼尾流牵引」减耗气滑行！
    for (var mi = 0; mi < mantaRays.length; mi++) {
      var mt = mantaRays[mi];
      mt.phase += dt * 2.1;
      if (mt.slipCd > 0) mt.slipCd = Math.max(0, mt.slipCd - dt);
      if (mt.glow > 0) mt.glow = Math.max(0, mt.glow - dt * 1.4);

      if (Math.abs(mt.x - boat.x) < 1100) {
        mt.x += mt.speed * dt;
        if (isExpU && mt.x > 9400) mt.x = 700;
        mt.y = mt.baseY + Math.sin(mt.phase * 0.85) * 24;
        var mBed = getBedY(mt.x);
        if (mt.y > mBed - 65) mt.y = mBed - 65;

        var dxM = boat.x - mt.x;
        var dyM = boat.y - mt.y;
        if (inSub && Math.hypot(dxM, dyM) < 185) {
          tryDiscoverFauna('fauna_manta', '月影蝠鲼', boat, onLevelEvent);
        }
        if (inSub && dxM > -165 && dxM < 65 && Math.abs(dyM) < 62) {
          mt.glow = 1.0;
          boat.mantaSlipTimer = 0.55;
          var sailMult = 1 + (st.skySailLv || 0) * 0.25;
          boat.vx = Math.min((st.maxSpeed || 560) + 140, Math.max(boat.vx + 165 * sailMult * dt, 355));
          // 贴着蝠鲼尾流大幅减缓耗气甚至微回气！
          boat.breath = Math.min(1.0, (boat.breath || 0) + 0.14 * sailMult * dt);
          boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.22 * dt);
          if (mt.slipCd <= 0) {
            mt.slipCd = 3.2;
            var mStar = Math.round(12 * st.starMult);
            boat.runStars += mStar;
            boat.runMantaGlides = (boat.runMantaGlides || 0) + 1;
            if (window.MT.Audio && window.MT.Audio.playMantaGlide) window.MT.Audio.playMantaGlide();
            eras.emitRing(boat.x, boat.y, '#9ef4ff');
            eras.addPopup(mt.x, mt.y - 44, '✦ 蝠鲼尾流滑翔! +' + mStar + '✦', '#c0f6ff');
          }
        }
      }
    }

    // 3. 深渊提灯鱼：暖灯诱饵博弈 + 声呐/探照灯识破 + 鱼鳍冲刺反制！
    for (var ai = 0; ai < anglerFish.length; ai++) {
      var af = anglerFish[ai];
      af.phase += dt * 2.6;
      if (af.biteCd > 0) af.biteCd = Math.max(0, af.biteCd - dt);

      if (af.state === 'banished') {
        af.x += af.banishVx * dt;
        af.y += af.banishVy * dt;
        af.exposed = Math.max(0, af.exposed - dt * 1.4);
        continue;
      }

      af.y = af.baseY + Math.sin(af.phase * 0.7) * 14;
      var distA = Math.hypot(boat.x - af.x, boat.y - af.y);

      var fDirA = (typeof boat.facing === 'number') ? boat.facing : 1;
      var dxA = (af.x - boat.x) * fDirA;
      var inLight = (dxA > -24 && dxA < 310 && Math.abs(af.y - boat.y) < 115);
      if (inLight && (!isExpU || ((window.MT.Abyss && (window.MT.Abyss.getAshMix(boat.x) + window.MT.Abyss.getBoilMix(boat.x))) > 0.25))) {
        af.exposed = Math.min(1.0, af.exposed + dt * 2.2);
        if (af.exposed > 0.55) {
          tryDiscoverFauna('fauna_angler', '深渊提灯鱼', boat, onLevelEvent);
        }
      } else {
        af.exposed = Math.max(0, af.exposed - dt * 0.45);
      }

      var abyssDark = !isExpU || ((window.MT.Abyss && (window.MT.Abyss.getAshMix(boat.x) + window.MT.Abyss.getBoilMix(boat.x))) > 0.25);
      if (inSub && abyssDark && distA < 185 && af.state === 'lurk') {
        af.state = 'lunge';
        af.lungeTimer = 0.9;
        af.exposed = 1.0;
      }

      if (af.state === 'lunge') {
        af.lungeTimer -= dt;
        // 缓慢而有威慑力地向木舟扑近，留足冲刺反制或闪避反应时间！
        var dirX = (boat.x - af.x) / Math.max(1, distA);
        var dirY = (boat.y - af.y) / Math.max(1, distA);
        af.x += dirX * 92 * dt;
        af.y += dirY * 68 * dt;
        if (af.lungeTimer <= 0 && distA > 150) {
          af.state = 'lurk';
        }
      }

      // 碰撞判定：鱼鳍冲刺 / 破水窗 / 流光狂热直接反制震退爆大星火！
      if (inSub && abyssDark && distA < 52 * af.scale) {
        var canCounter = boat.abyssDashTimer > 0 || boat.breachSmashTimer > 0 || boat.feverTimer > 0;
        if (canCounter) {
          af.state = 'banished';
          af.banishVx = 240;
          af.banishVy = -110;
          var aBonus = Math.round(26 * st.starMult * (st.sonarRelicMult || 1));
          boat.runStars += aBonus;
          boat.breath = Math.min(1.0, (boat.breath || 0) + 0.25);
          boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.35);
          boat.trickAura = 1.0;
          boat.runAnglersBanished = (boat.runAnglersBanished || 0) + 1;
          if (window.MT.Audio && window.MT.Audio.playAnglerBanish) window.MT.Audio.playAnglerBanish();
          eras.emitRing(af.x, af.y, '#ffe89c');
          eras.emitRing(af.x, af.y, '#9ef4ff');
          eras.addPopup(af.x, af.y - 46, '✦ 冲刺震退提灯鱼! +' + aBonus + '✦', '#fff0a4');
          if (typeof addComboFn === 'function') addComboFn(2, 7.0);
          if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
            window.MT.RenderWorld.triggerImpact(0.036, 0.052, 5.5);
          }
        } else if (af.biteCd <= 0) {
          af.biteCd = 1.25;
          af.state = 'banished';
          af.banishVx = 140;
          af.banishVy = 90;
          var aDmg = Math.max(5, Math.round(12 * st.crashDamageMult));
          boat.hull = Math.max(0, boat.hull - aDmg);
          boat.breath = Math.max(0, (boat.breath || 0) - 0.18);
          boat.hurtFlash = 0.9;
          boat.vx = Math.max(130, boat.vx * 0.62);
          eras.addPopup(boat.x, boat.y - 48, '提灯鱼伏击 -' + aDmg + '（空格冲刺可反杀！）', '#ff9e86');
          if (window.MT.Audio) window.MT.Audio.playSplash(1.2);
          if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
            window.MT.RenderWorld.triggerImpact(0.028, 0.030, 7.2);
          }
        }
      }
    }

    // 4. 海底黑烟囱热泉：灾前温和休眠仅冒微气泡，撞击地壳震裂后全面喷涌强劲暖金热流！
    var ventAct = ecoNow.isExp ? clamp(ecoNow.postImpact * 1.35 + (ecoNow.dawn * 0.35), 0.08, 1.0) : 1.0;
    for (var vi = 0; vi < thermalVents.length; vi++) {
      var vt = thermalVents[vi];
      vt.phase += dt * (1.2 + ventAct * 1.2);
      if (vt.boostCd > 0) vt.boostCd = Math.max(0, vt.boostCd - dt);

      var ventMouthY = vt.bedY - vt.chimneyH;
      var effPlumeH = vt.plumeH * (0.28 + ventAct * 0.72);
      if (ventAct > 0.32 && inSub && Math.abs(boat.x - vt.x) < 52 && boat.y < ventMouthY + 12 && boat.y > ventMouthY - effPlumeH) {
        var sailLift = (1 + (st.skySailLv || 0) * 0.22) * ventAct;
        boat.vy -= 420 * sailLift * dt;
        boat.vx = Math.min((st.maxSpeed || 560) + 135, boat.vx + 115 * dt);
        boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.45 * dt);
        if (vt.boostCd <= 0) {
          vt.boostCd = 2.0;
          var vStar = Math.round(10 * st.starMult);
          boat.runStars += vStar;
          if (window.MT.Audio) window.MT.Audio.playUpdraft();
          eras.emitRing(vt.x, boat.y, '#ffd894');
          eras.addPopup(vt.x, boat.y - 40, '✦ 热泉上升洋流! +' + vStar + '✦', '#ffe6a2');
        }
      }
    }

    // 5. 巨型发光海藻林：穿行扰动摇曳 + 漫天蓝眼泪磷光 + 临时扩大探照视野并缓回气息燃料！
    for (var ki = 0; ki < kelpForests.length; ki++) {
      var kf = kelpForests[ki];
      if (kf.glowCd > 0) kf.glowCd = Math.max(0, kf.glowCd - dt);
      if (boat.x < kf.x0 - 120 || boat.x > kf.x1 + 120) continue;

      var brushed = false;
      for (var fi2 = 0; fi2 < kf.fronds.length; fi2++) {
        var fr = kf.fronds[fi2];
        fr.phase += dt * 1.45;
        if (fr.disturb > 0) fr.disturb = Math.max(0, fr.disturb - dt * 1.6);
        if (inSub && Math.abs(boat.x - fr.x) < 36 && boat.y > fr.bedY - fr.h - 14 && boat.y < fr.bedY) {
          fr.disturb = 1.0;
          brushed = true;
          if (Math.random() < dt * 18) {
            emitKelpSpore(fr.x + (Math.random() - 0.5) * 26, boat.y + (Math.random() - 0.5) * 24, fr.hueCyan);
          }
        }
      }
      if (ecoNow.isExp && ecoNow.kelp > 0.35 && Math.abs((kf.x0 + kf.x1) * 0.5 - boat.x) < 620 && Math.random() < dt * 7 * ecoNow.kelp) {
        var pickFr = kf.fronds[Math.floor(Math.random() * kf.fronds.length)];
        if (pickFr) emitKelpSpore(pickFr.x + (Math.random() - 0.5) * 28, pickFr.bedY - pickFr.h * (0.4 + Math.random() * 0.5), pickFr.hueCyan);
      }
      if (brushed) {
        tryDiscoverFauna('fauna_kelp', '发光海藻林', boat, onLevelEvent);
        boat.kelpGlowTimer = Math.max(boat.kelpGlowTimer || 0, 2.4);
        boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.16 * dt);
        boat.breath = Math.min(1.0, (boat.breath || 0) + 0.08 * dt);
        if (kf.glowCd <= 0) {
          kf.glowCd = 3.6;
          var kStar = Math.round(8 * st.starMult);
          boat.runStars += kStar;
          if (window.MT.Audio) window.MT.Audio.playHookCatch();
          eras.addPopup(boat.x, boat.y - 42, '✦ 发光巨藻磷光护佑 +' + kStar + '✦', '#a8f8e8');
        }
      }
    }

    for (var eri = echoRings.length - 1; eri >= 0; eri--) {
      var er = echoRings[eri];
      er.life -= dt;
      er.r = er.maxR * (1 - Math.max(0, er.life / er.maxLife));
      if (er.life <= 0) echoRings.splice(eri, 1);
    }

    for (var sp = kelpSpores.length - 1; sp >= 0; sp--) {
      var ks2 = kelpSpores[sp];
      ks2.life -= dt;
      ks2.x += ks2.vx * dt;
      ks2.y += ks2.vy * dt;
      ks2.vx *= Math.pow(0.4, dt);
      if (ks2.life <= 0) kelpSpores.splice(sp, 1);
    }
  }

  // =========================================================================
  // 绘制层 1：远景深渊巨鲸剪影（超慢视差、浑浊大气透视、带点点荧光星斑）
  // =========================================================================
  function drawFarBackground(ctx, state) {
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    var camX = (viewLeft + viewRight) * 0.5;
    var mix = (window.MT.Abyss && window.MT.Abyss.getAbyssMix) ? window.MT.Abyss.getAbyssMix(camX) : 0;
    if (mix < 0.04) return;

    ctx.save();
    abyssWhales.forEach(function (aw) {
      // 柔和远景视差投影
      var drawX = camX + (aw.x - camX) * 0.45;
      if (drawX < viewLeft - aw.len || drawX > viewRight + aw.len) return;
      var drawY = aw.y + Math.sin(aw.phase) * 14;
      var L = aw.len;
      var tailBeat = Math.sin(aw.phase * 1.4) * 16;

      ctx.save();
      ctx.globalAlpha = mix * aw.alpha;
      ctx.translate(drawX, drawY);
      ctx.scale(aw.dir, 1);

      // 宏伟优雅的深渊巨鲸剪影（水彩灰蓝渐隐体，绝无生硬描边！）
      var wg = ctx.createLinearGradient(-L * 0.5, -52, L * 0.4, 48);
      wg.addColorStop(0.00, '#5a7488');
      wg.addColorStop(0.50, '#2c4258');
      wg.addColorStop(1.00, '#18283c');
      ctx.fillStyle = wg;

      ctx.beginPath();
      // 宽厚圆润鲸首向右
      ctx.moveTo(L * 0.46, 2);
      ctx.bezierCurveTo(L * 0.36, -42, -L * 0.04, -52, -L * 0.32, -16);
      ctx.quadraticCurveTo(-L * 0.46, -6 + tailBeat * 0.4, -L * 0.54, tailBeat * 0.7);
      // 舒展双瓣巨尾
      ctx.quadraticCurveTo(-L * 0.62, -26 + tailBeat, -L * 0.68, -32 + tailBeat);
      ctx.quadraticCurveTo(-L * 0.59, tailBeat * 0.5, -L * 0.66, 26 + tailBeat);
      ctx.quadraticCurveTo(-L * 0.55, 16 + tailBeat * 0.5, -L * 0.46, 8 + tailBeat * 0.3);
      // 饱满修长鲸腹与长胸鳍
      ctx.bezierCurveTo(-L * 0.14, 34, L * 0.24, 38, L * 0.46, 2);
      ctx.closePath();
      ctx.fill();

      // 长胸鳍剪影
      ctx.beginPath();
      ctx.moveTo(L * 0.14, 14);
      ctx.quadraticCurveTo(-L * 0.04, 48 + tailBeat * 0.2, -L * 0.14, 52 + tailBeat * 0.2);
      ctx.quadraticCurveTo(-L * 0.02, 28, L * 0.04, 16);
      ctx.closePath();
      ctx.fill();

      // 鲸侧极淡的星图生物荧光斑点（隐约神秘！）
      ctx.fillStyle = 'rgba(182, 240, 255, 0.55)';
      for (var s = 0; s < 5; s++) {
        ctx.beginPath();
        ctx.arc(L * (0.28 - s * 0.12), -8 + (s % 2) * 8, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();
  }

  // =========================================================================
  // 绘制层 2：中层深海生态（黑烟囱热泉、发光海藻林、银光沙丁鱼群、月影蝠鲼、深渊提灯鱼）
  // =========================================================================
  function drawMidEcosystem(ctx, state) {
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    var camX = (viewLeft + viewRight) * 0.5;
    var mix = (window.MT.Abyss && window.MT.Abyss.getAbyssMix) ? window.MT.Abyss.getAbyssMix(camX) : 0;
    if (mix < 0.02) return;

    ctx.save();
    ctx.globalAlpha = mix;

    var ecoDraw = getEcoState(camX);
    var ventPower = ecoDraw.isExp ? clamp(ecoDraw.postImpact * 1.3 + ecoDraw.dawn * 0.3, 0.0, 1.0) : 1.0;

    // 1. 海底黑烟囱热泉 & 管虫簇（灾前宁静休眠只冒温泉微泡，撞击后黑烟与暖金热流澎湃喷涌！）
    thermalVents.forEach(function (vt) {
      if (vt.x < viewLeft - 140 || vt.x > viewRight + 140) return;
      var mouthY = vt.bedY - vt.chimneyH;

      if (ventPower < 0.22) {
        for (var db = 0; db < 4; db++) {
          var du = ((t * 0.34 + db * 0.25 + vt.phase * 0.1) % 1);
          var dbx = vt.x + Math.sin(du * 8 + db) * 8;
          var dby = mouthY - 4 - du * 95;
          ctx.strokeStyle = 'rgba(202, 238, 250, ' + (Math.sin(du * Math.PI) * 0.55) + ')';
          ctx.lineWidth = 1.0;
          ctx.beginPath(); ctx.arc(dbx, dby, 1.8 + (db % 2), 0, Math.PI * 2); ctx.stroke();
        }
      } else {
        for (var p = 0; p < 7; p++) {
          var pu = ((t * 0.42 + p / 7 + vt.phase * 0.1) % 1);
          var py = mouthY - 8 - pu * vt.plumeH * (0.45 + ventPower * 0.55);
          var px = vt.x + Math.sin(t * 2.4 + pu * 6 + vt.phase) * (6 + pu * 16);
          var pr = (14 + pu * 32) * (0.65 + ventPower * 0.35);
          var a = Math.sin(pu * Math.PI) * 0.36 * ventPower;
        var pg = ctx.createRadialGradient(px, py, 2, px, py, pr);
        if (pu < 0.25) {
          pg.addColorStop(0, 'rgba(255, 198, 108, ' + (a * 1.15) + ')');
          pg.addColorStop(0.55, 'rgba(132, 82, 62, ' + (a * 0.7) + ')');
        } else {
          pg.addColorStop(0, 'rgba(66, 72, 78, ' + a + ')');
          pg.addColorStop(0.55, 'rgba(98, 128, 134, ' + (a * 0.45) + ')');
        }
        pg.addColorStop(1, 'rgba(54, 64, 72, 0)');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
      }

        ctx.strokeStyle = 'rgba(255, 224, 152, ' + (0.34 * ventPower) + ')';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        for (var s = -1; s <= 1; s += 2) {
          var su = ((t * 0.8 + (s + 2) * 0.27) % 1);
          var sy0 = mouthY - su * (vt.plumeH * 0.82 * ventPower);
          var sx = vt.x + s * 10 + Math.sin(su * 8) * 5;
          ctx.globalAlpha = mix * Math.sin(su * Math.PI) * 0.55 * ventPower;
          ctx.beginPath(); ctx.moveTo(sx, sy0); ctx.lineTo(sx, sy0 - 28); ctx.stroke();
        }
        ctx.globalAlpha = mix;
      }

      // B) 棱面深灰玄武岩烟囱主体（粗犷风化火山热泉造型）
      var cGrad = ctx.createLinearGradient(vt.x - 32, mouthY, vt.x + 32, vt.bedY + 40);
      cGrad.addColorStop(0.0, '#4e4852');
      cGrad.addColorStop(0.5, '#302f3a');
      cGrad.addColorStop(1.0, '#1c1e28');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.moveTo(vt.x - 38, vt.bedY + 65);
      ctx.lineTo(vt.x - 28, vt.bedY - 12);
      ctx.lineTo(vt.x - 20, mouthY + vt.chimneyH * 0.42);
      ctx.lineTo(vt.x - 14, mouthY);
      ctx.lineTo(vt.x + 14, mouthY + 3);
      ctx.lineTo(vt.x + 22, mouthY + vt.chimneyH * 0.45);
      ctx.lineTo(vt.x + 30, vt.bedY - 8);
      ctx.lineTo(vt.x + 40, vt.bedY + 65);
      ctx.closePath();
      ctx.fill();

      var mGlow = 0.16 + ventPower * 0.84;
      var mg = ctx.createRadialGradient(vt.x, mouthY + 2, 2, vt.x, mouthY + 2, 14 + ventPower * 14);
      mg.addColorStop(0, 'rgba(255, 214, 128, ' + (0.86 * mGlow) + ')');
      mg.addColorStop(0.5, 'rgba(232, 108, 56, ' + (0.36 * mGlow) + ')');
      mg.addColorStop(1, 'rgba(232, 108, 56, 0)');
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(vt.x, mouthY + 2, 14 + ventPower * 14, 0, Math.PI * 2); ctx.fill();

      // C) 烟囱脚部簇生的柔和热泉管虫（暗褐渐细石灰管 + 微羽化暗珊瑚/青碧鳃羽，融入暗底不刺眼！）
      vt.worms.forEach(function (w) {
        var wx = vt.x + w.ox;
        var wy = vt.bedY + 5;
        var sw = Math.sin(t * 2.4 + w.phase) * 3.0;
        var tipX = wx + sw, tipY = wy - w.len;
        ctx.strokeStyle = 'rgba(138, 132, 126, 0.72)';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + sw * 0.45, wy - w.len * 0.52, tipX, tipY); ctx.stroke();

        // 柔和三丝羽状鳃冠
        ctx.strokeStyle = w.cyan ? 'rgba(122, 232, 224, 0.72)' : 'rgba(222, 114, 92, 0.72)';
        ctx.lineWidth = 1.1;
        for (var g = -1; g <= 1; g++) {
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.quadraticCurveTo(tipX + g * 3.5, tipY - 3.5, tipX + g * 5.2, tipY - 5.5);
          ctx.stroke();
        }
      });
    });

    // 2. 巨型发光海藻林（顺水流柔和垂弯的绘本水彩丝带长叶 + 柔和发光浮孢，彻底告别锯齿菱形叶！）
    kelpForests.forEach(function (kf) {
      if (kf.x1 < viewLeft - 90 || kf.x0 > viewRight + 90) return;
      kf.fronds.forEach(function (fr) {
        if (fr.x < viewLeft - 60 || fr.x > viewRight + 60) return;
        var extraSway = fr.disturb * 15;
        var pts = [{ x: fr.x, y: fr.bedY + 26 }];
        for (var s = 1; s <= fr.segs; s++) {
          var u = s / fr.segs;
          var wave = Math.sin(t * 1.35 + fr.phase - u * 2.4) * (fr.swayAmp + extraSway) * Math.pow(u, 1.18) + u * 10;
          pts.push({ x: fr.x + wave, y: fr.bedY + 12 - u * fr.h });
        }

        // 柔和变细的半透明海藻弯茎（二次贝塞尔平滑连接）
        ctx.strokeStyle = fr.hueCyan ? 'rgba(38, 108, 118, 0.65)' : 'rgba(42, 106, 92, 0.65)';
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var p2 = 1; p2 < pts.length - 1; p2++) {
          var mx = (pts[p2].x + pts[p2 + 1].x) * 0.5;
          var my = (pts[p2].y + pts[p2 + 1].y) * 0.5;
          ctx.quadraticCurveTo(pts[p2].x, pts[p2].y, mx, my);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();

        // 顺水流飘逸舒展的弯曲丝带状海藻叶（不对称弧度、柔渐变透明度！）
        for (var lf = 2; lf < pts.length; lf++) {
          var pt = pts[lf];
          var uL = lf / pts.length;
          var side = (lf % 2 === 0) ? 1 : -1;
          var bLen = (28 + (1 - uL) * 18) * (0.85 + h1(fr.x + lf * 7) * 0.3);
          var flutter = Math.sin(t * 1.9 + fr.phase + lf * 1.2) * 5;
          var tipX = pt.x + side * bLen * 0.85 + 8 + flutter;
          var tipY = pt.y - bLen * 0.34 + Math.cos(t * 1.5 + lf) * 4;
          var ctrl1X = pt.x + side * bLen * 0.38;
          var ctrl1Y = pt.y - bLen * 0.52;
          var ctrl2X = pt.x + side * bLen * 0.54 + 4;
          var ctrl2Y = pt.y - bLen * 0.04;

          var lg = ctx.createLinearGradient(pt.x, pt.y, tipX, tipY);
          var dynBio = ecoDraw.isExp ? (kf.biolum * ecoDraw.kelpBloom) : kf.biolum;
          var baseA = 0.26 + dynBio * 0.34 + fr.disturb * 0.18;
          if (fr.hueCyan) {
            lg.addColorStop(0.0, 'rgba(42, 138, 152, ' + baseA + ')');
            lg.addColorStop(0.65, 'rgba(92, 212, 216, ' + (baseA * 0.72) + ')');
            lg.addColorStop(1.0, 'rgba(164, 248, 248, 0.06)');
          } else {
            lg.addColorStop(0.0, 'rgba(46, 132, 110, ' + baseA + ')');
            lg.addColorStop(0.65, 'rgba(104, 218, 174, ' + (baseA * 0.72) + ')');
            lg.addColorStop(1.0, 'rgba(178, 250, 218, 0.06)');
          }
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.quadraticCurveTo(ctrl1X, ctrl1Y, tipX, tipY);
          ctx.quadraticCurveTo(ctrl2X, ctrl2Y, pt.x, pt.y + 3);
          ctx.closePath();
          ctx.fill();

          if ((lf === pts.length - 1 || lf % 3 === 0) && dynBio > 0.28) {
            var glowD = ((7 + dynBio * 6) + fr.disturb * 7) * 2;
            var gSp = window.MT.Art.getGlowSprite ? window.MT.Art.getGlowSprite(fr.hueCyan ? 'cyan' : 'mint') : null;
            if (gSp) {
              var prevGA = ctx.globalAlpha;
              ctx.globalAlpha = prevGA * clamp(dynBio * 0.90 + fr.disturb * 0.25, 0, 0.96);
              ctx.drawImage(gSp, pt.x + side * 4 - glowD * 0.5, pt.y - 2 - glowD * 0.5, glowD, glowD);
              ctx.globalAlpha = prevGA;
            }
          }
        }
      });
    });

    // 3. 银光沙丁鱼群（灵动流线鱼影 + 声呐星环圆舞柔光！）
    sardineSchools.forEach(function (sc) {
      if (sc.x < viewLeft - 180 || sc.x > viewRight + 180) return;
      ctx.save();
      if ((sc.resonanceTimer || 0) > 0.05) {
        var rGlow = Math.min(1, sc.resonanceTimer / 1.2);
        var rg = ctx.createRadialGradient(sc.x, sc.y, 12, sc.x, sc.y, 82);
        rg.addColorStop(0, 'rgba(218, 252, 255, ' + (0.28 * rGlow) + ')');
        rg.addColorStop(0.65, 'rgba(255, 236, 174, ' + (0.14 * rGlow) + ')');
        rg.addColorStop(1, 'rgba(136, 232, 255, 0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(sc.x, sc.y, 82, 0, Math.PI * 2); ctx.fill();
      }
      sc.fish.forEach(function (f) {
        var tsD = sc.tightness || 1.0;
        var fx = sc.x + f.ox * tsD + f.dx;
        var fy = sc.y + f.oy * tsD + f.dy;
        var ang = (sc.resonanceTimer || 0) > 0.05
          ? Math.atan2(f.vy, Math.abs(f.vx) < 12 ? (f.vx >= 0 ? 12 : -12) : f.vx)
          : Math.atan2(sc.dirY * 40 + f.vy * 0.35, 65 + f.vx * 0.35);
        var wag = Math.sin(f.phase) * 2.2;

        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(ang);
        var L = f.len;
        ctx.fillStyle = (sc.shimmer > 0.15 || (sc.resonanceTimer || 0) > 0.05) ? 'rgba(232, 254, 255, 0.96)' : 'rgba(176, 218, 232, 0.72)';
        ctx.beginPath();
        ctx.moveTo(L * 0.55, 0);
        ctx.quadraticCurveTo(0, -L * 0.24, -L * 0.45, wag * 0.3);
        ctx.lineTo(-L * 0.78, -L * 0.24 + wag);
        ctx.lineTo(-L * 0.78,  L * 0.24 + wag);
        ctx.lineTo(-L * 0.45, wag * 0.3);
        ctx.quadraticCurveTo(0,  L * 0.24, L * 0.55, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    });

    // 4. 月影蝠鲼（柔美菱形行波振翼 + 尾流丝带光痕！）
    mantaRays.forEach(function (mt) {
      if (mt.x < viewLeft - 160 || mt.x > viewRight + 160) return;
      var sp = mt.span;
      var flap = Math.sin(mt.phase) * 16;
      var flapLag = Math.sin(mt.phase - 0.85) * 18;

      ctx.save();
      ctx.translate(mt.x, mt.y);

      // 柔和尾流牵引引导流丝
      var wGrad = ctx.createLinearGradient(0, 0, -sp * 2.1, 0);
      wGrad.addColorStop(0.0, 'rgba(164, 242, 255, ' + (0.28 + mt.glow * 0.38) + ')');
      wGrad.addColorStop(1.0, 'rgba(132, 218, 246, 0)');
      ctx.strokeStyle = wGrad;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-sp * 0.25, 0);
      ctx.quadraticCurveTo(-sp * 1.1, flapLag * 0.45, -sp * 2.0, -flap * 0.25);
      ctx.stroke();

      // 远侧翼（微暗体现空间透视）
      ctx.fillStyle = 'rgba(42, 74, 102, 0.72)';
      ctx.beginPath();
      ctx.moveTo(sp * 0.38, -2);
      ctx.quadraticCurveTo(sp * 0.02, -sp * 0.46 + flap * 0.6, -sp * 0.28, -sp * 0.34 + flapLag * 0.7);
      ctx.quadraticCurveTo(-sp * 0.24, -4, -sp * 0.34, 0);
      ctx.closePath();
      ctx.fill();

      // 蝠鲼主体与近侧优美行波大翼
      var mg = ctx.createLinearGradient(0, -18, 0, sp * 0.45);
      mg.addColorStop(0.0, '#6298ba');
      mg.addColorStop(0.55, '#325a7c');
      mg.addColorStop(1.0, '#1e3c58');
      ctx.fillStyle = mg;
      ctx.beginPath();
      // 头鳍
      ctx.moveTo(sp * 0.48, -3);
      ctx.quadraticCurveTo(sp * 0.34, -12, sp * 0.14, -9);
      ctx.quadraticCurveTo(-sp * 0.20, -6, -sp * 0.40, 2);
      // 细长优雅鞭尾
      ctx.quadraticCurveTo(-sp * 0.85, 6 + flapLag * 0.35, -sp * 1.24, 3 - flap * 0.25);
      ctx.quadraticCurveTo(-sp * 0.82, 9 + flapLag * 0.35, -sp * 0.36, 8);
      // 近侧大幅舒展胸翼
      ctx.quadraticCurveTo(-sp * 0.18, sp * 0.42 + flapLag, -sp * 0.04, sp * 0.44 + flap);
      ctx.quadraticCurveTo(sp * 0.24, sp * 0.24 + flap * 0.5, sp * 0.48, 3);
      ctx.closePath();
      ctx.fill();

      // 翼沿柔白月光边
      ctx.strokeStyle = 'rgba(218, 248, 255, ' + (0.48 + mt.glow * 0.35) + ')';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sp * 0.44, -2);
      ctx.quadraticCurveTo(sp * 0.18, sp * 0.22 + flap * 0.5, -sp * 0.04, sp * 0.44 + flap);
      ctx.stroke();
      ctx.restore();
    });

    // 5. 深渊提灯鱼（灾前藏匿于深海洞隙不可见，撞击沸海与尘幕灰海期才真正现身巡猎！）
    var anglerVis = ecoDraw.isExp ? clamp(ecoDraw.hazard * 1.45, 0, 1) : 1.0;
    if (anglerVis > 0.05) anglerFish.forEach(function (af) {
      if (af.x < viewLeft - 140 || af.x > viewRight + 140) return;
      var sc = af.scale;
      var lureSway = Math.sin(t * 3.8 + af.phase) * 5;
      var lureX = af.x - 42 * sc;
      var lureY = af.y - 16 * sc + lureSway;

      ctx.save();
      // A) 始终亮着的迷人暖黄提灯诱饵（远看酷似漂浮星火！）
      var tw = 0.82 + 0.18 * Math.sin(t * 5.2 + af.phase);
      var lg = ctx.createRadialGradient(lureX, lureY, 1, lureX, lureY, 24 * tw);
      lg.addColorStop(0.0, 'rgba(255, 246, 198, 0.96)');
      lg.addColorStop(0.45, 'rgba(255, 194, 102, 0.45)');
      lg.addColorStop(1.0, 'rgba(255, 152, 72, 0)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(lureX, lureY, 24 * tw, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff9df';
      ctx.beginPath(); ctx.arc(lureX, lureY, 4.2 * tw, 0, Math.PI * 2); ctx.fill();

      var bodyAlpha = clamp(0.24 + af.exposed * 0.72, 0, 0.96) * anglerVis;
      ctx.globalAlpha = mix * bodyAlpha;
      ctx.translate(af.x, af.y);
      ctx.scale(sc, sc);

      // 弯曲钓鱼棘杆连向诱饵
      ctx.strokeStyle = 'rgba(132, 118, 128, 0.75)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-14, -18);
      ctx.quadraticCurveTo(-30, -34, -42, -16 + lureSway / sc);
      ctx.stroke();

      // 柔美半透明流苏背鳍与尾鳍（随呼吸摆动）
      var finWag = Math.sin(af.phase * 1.9) * 5;
      ctx.fillStyle = 'rgba(72, 62, 82, 0.62)';
      ctx.beginPath();
      ctx.moveTo(28, -4);
      ctx.quadraticCurveTo(46, -16 + finWag, 54, -10 + finWag);
      ctx.quadraticCurveTo(48, 0 + finWag * 0.5, 52, 12 + finWag);
      ctx.quadraticCurveTo(42, 14 + finWag * 0.5, 28, 6);
      ctx.closePath();
      ctx.fill();

      // 浑圆厚重的深渊鮟鱇剪影（柔和受光渐变，零生硬外描边！）
      var ag = ctx.createRadialGradient(-10, -8, 4, 2, 0, 38);
      ag.addColorStop(0.0, '#4f4054');
      ag.addColorStop(0.6, '#2b2434');
      ag.addColorStop(1.0, '#171420');
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.moveTo(-29, 7);
      ctx.bezierCurveTo(-32, -18, -4, -27, 16, -18);
      ctx.bezierCurveTo(32, -12, 34, 8, 22, 16);
      ctx.bezierCurveTo(6, 25, -18, 24, -29, 7);
      ctx.closePath();
      ctx.fill();

      // 暴露时仅在额头与微张下颌浮现柔和琥珀反光与幽亮小眼（绘本暗黑奇幻风！）
      if (af.exposed > 0.25) {
        var warnG = ctx.createRadialGradient(-16, -2, 4, -12, 0, 36);
        warnG.addColorStop(0, 'rgba(255, 198, 124, ' + (af.exposed * 0.28) + ')');
        warnG.addColorStop(1, 'rgba(255, 152, 88, 0)');
        ctx.fillStyle = warnG;
        ctx.beginPath(); ctx.arc(-12, 0, 36, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#ffe69e';
        ctx.beginPath(); ctx.arc(-15, -7, 2.4, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = 'rgba(246, 238, 226, ' + (af.exposed * 0.78) + ')';
        for (var th = 0; th < 3; th++) {
          var tx = -25 + th * 5.5;
          ctx.beginPath(); ctx.moveTo(tx, 10); ctx.lineTo(tx + 1.8, 5); ctx.lineTo(tx + 3.6, 10); ctx.closePath(); ctx.fill();
        }
      }
      ctx.restore();
    });

    // 5b. 鲸群与鱼群声呐回应光环
    if (echoRings.length > 0) {
      echoRings.forEach(function (er) {
        var a = clamp(er.life / er.maxLife, 0, 1);
        ctx.strokeStyle = 'rgba(' + er.col + ', ' + (a * 0.72) + ')';
        ctx.lineWidth = 2.4 * a + 0.8;
        ctx.beginPath(); ctx.arc(er.x, er.y, er.r, 0, Math.PI * 2); ctx.stroke();
      });
    }

    // 6. 被船扰动飘起的发光巨藻磷光微粒
    if (kelpSpores.length > 0) {
      kelpSpores.forEach(function (ks) {
        if (ks.x < viewLeft - 20 || ks.x > viewRight + 20) return;
        var a = clamp(ks.life / ks.maxLife, 0, 1);
        ctx.fillStyle = ks.cyan ? ('rgba(176, 252, 255, ' + (a * 0.85) + ')') : ('rgba(186, 255, 222, ' + (a * 0.85) + ')');
        ctx.beginPath(); ctx.arc(ks.x, ks.y, ks.r, 0, Math.PI * 2); ctx.fill();
      });
    }

    ctx.restore();
  }

  // 查询是否有银鱼群正在靠近某坐标（供浅海碑石门环解谜检测）
  function isSardineSchoolNear(x, y, rad) {
    for (var i = 0; i < sardineSchools.length; i++) {
      var sc = sardineSchools[i];
      if (Math.hypot(sc.x - x, sc.y - y) <= rad) return true;
    }
    return false;
  }

  // 在浅海碑附近按声呐时，温柔召唤最近的一支银鱼群前来跟随小潜艇！
  function summonNearestSchool(boatX, boatY) {
    var best = null, bestD = 99999;
    for (var i = 0; i < sardineSchools.length; i++) {
      var d = Math.abs(sardineSchools[i].x - boatX);
      if (d < bestD) { bestD = d; best = sardineSchools[i]; }
    }
    if (best && bestD < 1200) {
      best.followTimer = 11.5;
      best.resonanceTimer = Math.max(best.resonanceTimer || 0, 3.2);
      best.shimmer = 1.0;
      // 如果鱼群较远，将其柔和拉近至视野边缘游来，零冷场等待！
      if (Math.abs(best.x - boatX) > 360) {
        best.x = boatX + (best.x > boatX ? 340 : -340);
        best.y = clamp(boatY - 24, 90, getBedY(best.x) - 55);
      }
      return true;
    }
    return false;
  }

  return {
    reset: reset,
    isSardineSchoolNear: isSardineSchoolNear,
    summonNearestSchool: summonNearestSchool,
    onSonarSweep: onSonarSweep,
    update: update,
    drawFarBackground: drawFarBackground,
    drawMidEcosystem: drawMidEcosystem
  };
})();
