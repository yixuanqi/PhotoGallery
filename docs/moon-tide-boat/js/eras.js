window.MT = window.MT || {};

window.MT.Eras = (function () {
  var time = 0;
  var worldClock = 0;
  var moonDescent = 0.08;
  var impactTriggered = false;
  var impactFlash = 0;
  var impactAge = 0;
  var rebirthTriggered = false;
  var announcedEras = {};
  var announcedOmens = {};
  var gameMode = 'story'; // 'story' | 'endless'
  var endlessSegments = [];
  var endlessBag = [];
  var endlessSeqIdx = 0;
  var finaleActive = false;
  var finaleCompleted = false;
  var finaleTimer = 0;

  var landmarks = [];
  var jellyfish = [];
  var iceScratches = [];
  var starArcs = [];
  var buoys = [];
  var lavaPlumes = [];
  var dandelionGusts = [];   // 纪元 V 萌芽青野：蒲公英风口上升气流
  var vineCurtains = [];     // 纪元 VI 巨木林海：垂落荆棘巨藤帘（破藤船首切碎）
  var sporeCurrents = [];    // 纪元 VI 巨木林海：翡翠孢子浮力云团
  var grindRails = [];       // 冰原冰桥轨 / 荒土旧铁桥轨 / 林海翡翠树根轨
  var whales = [];           // 月潮之海：柔和发光浮鲸背脊弹射机关
  var ashSnow = [];
  var emberMotes = [];
  var rainDrops = [];
  var forestSpores = [];
  var particles = [];
  var popups = [];
  var nextPatternX = 420;
  var nextLandmarkX = 240;
  var nextId = 1;

  function smoothstep(edge0, edge1, x) {
    var v = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return v * v * (3 - 2 * v);
  }

  var OMEN_FOR_NEXT = {
    fire_sea:         { key: 'fireApproach', whisper: '远方热浪翻涌，赤金火星随风飘来…' },
    ice_winter:       { key: 'ashFall',      whisper: '寒意骤降，灰雪自苍穹悄然飘落…' },
    thawed_wasteland: { key: 'thawCrack',    whisper: '雾幕渐散，裸露的陨石岩原出现在前方…' },
    sprout_meadow:    { key: 'firstRain',    whisper: '温柔细雨落下，嫩绿草芽在风中苏醒…' },
    giant_forest:     { key: 'canopyRise',   whisper: '翡翠林雾涌来，参天树影矗立天际…' },
    moon_sea:         { key: 'tideReturn',   whisper: '潮声渐起，暮光大洋在前方铺展…' }
  };

  function refillEndlessBag(avoidId) {
    var ids = ['moon_sea', 'fire_sea', 'ice_winter', 'thawed_wasteland', 'sprout_meadow', 'giant_forest'];
    // Fisher-Yates 洗牌，确保每轮 6 个地貌全部出场且不连续重复
    for (var i = ids.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;
    }
    if (avoidId && ids[0] === avoidId && ids.length > 1) {
      var sw = ids[0]; ids[0] = ids[1]; ids[1] = sw;
    }
    endlessBag = ids;
  }

  function findEraTemplate(id) {
    var eras = window.MT.Config.ERAS;
    for (var i = 0; i < eras.length; i++) {
      if (eras[i].id === id) return eras[i];
    }
    return eras[0];
  }

  function appendEndlessSegment() {
    var prev = endlessSegments.length > 0 ? endlessSegments[endlessSegments.length - 1] : null;
    if (endlessBag.length === 0) refillEndlessBag(prev ? prev.id : null);
    var nextIdStr = endlessBag.shift();
    if (prev && nextIdStr === prev.id) {
      if (endlessBag.length === 0) refillEndlessBag(prev.id);
      nextIdStr = endlessBag.shift();
    }

    var tpl = findEraTemplate(nextIdStr);
    var segLen = 6800;
    var startX = prev ? prev.endX : 0;
    var seqNum = ++endlessSeqIdx;
    var starBonusScale = Math.min(2.4, 1 + (seqNum - 1) * 0.14);

    var seg = {
      id: tpl.id,
      index: tpl.index,
      seqNum: seqNum,
      isLiquid: tpl.isLiquid,
      shortName: tpl.shortName,
      name: tpl.shortName,
      kicker: '无尽漫游 · 第 ' + seqNum + ' 境',
      subtitle: tpl.subtitle,
      omenKey: null,
      omenWhisper: '',
      startX: startX,
      endX: startX + segLen,
      spawnX: startX + 120,
      waveAmp: tpl.waveAmp,
      roughness: tpl.roughness,
      friction: tpl.friction,
      heatDps: tpl.heatDps,
      coldDps: tpl.coldDps,
      bumpRisk: tpl.bumpRisk,
      vineRisk: tpl.vineRisk,
      starValue: Math.max(2, Math.round((tpl.starValue || 2) * starBonusScale)),
      palette: tpl.palette
    };

    // 为前一段自动绑定指向本段的自然演进征兆（乱序切换同样有前兆酝酿，绝不突兀！）
    if (prev) {
      var omInfo = OMEN_FOR_NEXT[seg.id];
      if (omInfo) {
        prev.omenKey = omInfo.key;
        prev.omenWhisper = omInfo.whisper;
      }
    }
    endlessSegments.push(seg);
  }

  function ensureEndlessSegments(worldX) {
    if (gameMode !== 'endless') return;
    while (endlessSegments.length < 3 || endlessSegments[endlessSegments.length - 1].endX < worldX + 9500) {
      appendEndlessSegment();
    }
  }

  var singleSeaSegCache = null;
  var frostSeaSegCache = null;
  var activeRealm = 'moon_sea'; // 'moon_sea' | 'frost_sea'

  function isSingleSeaMode() {
    return !!(window.MT.Config && window.MT.Config.SINGLE_SCENE_MODE === 'moon_sea');
  }

  function isExploreMode() {
    return !!(window.MT.Config && window.MT.Config.EXPLORE_MODE);
  }

  function getActiveRealm() {
    return activeRealm;
  }

  function setActiveRealm(realmId) {
    activeRealm = (realmId === 'frost_sea') ? 'frost_sea' : 'moon_sea';
    return activeRealm;
  }

  function getWorldClock() {
    return worldClock;
  }

  function setWorldClock(sec) {
    var dur = (window.MT.Config && window.MT.Config.WORLD_CYCLE && window.MT.Config.WORLD_CYCLE.DURATION) || 450;
    worldClock = ((Number(sec) || 0) % dur + dur) % dur;
  }

  function advanceWorldPhase() {
    if (activeRealm === 'frost_sea') {
      var fv = (window.MT.Config && window.MT.Config.FROST_VOYAGE) || {};
      var fStops = [25, (fv.T_AURORA || 150) + 35, (fv.T_THAW || 320) + 35];
      for (var fi = 0; fi < fStops.length; fi++) {
        if (worldClock < fStops[fi] - 5) {
          worldClock = fStops[fi];
          return worldClock;
        }
      }
      worldClock = fStops[0];
      return worldClock;
    }
    var wc = (window.MT.Config && window.MT.Config.WORLD_CYCLE) || {};
    var stops = [
      10,
      (wc.T_BIOLUM || 75) + 12,
      (wc.T_OMEN || 150) + 18,
      (wc.T_IMPACT || 210) + 4,
      (wc.T_ASH || 275) + 18,
      (wc.T_KELP || 355) + 16,
      (wc.T_DAWN || 405) + 12
    ];
    for (var i = 0; i < stops.length; i++) {
      if (worldClock < stops[i] - 4) {
        worldClock = stops[i];
        return worldClock;
      }
    }
    worldClock = stops[0];
    return worldClock;
  }

  function getSingleSeaSegment() {
    if (activeRealm === 'frost_sea') {
      if (!frostSeaSegCache) {
        var fv0 = window.MT.Config.FROST_VOYAGE;
        var basePal = (fv0 && fv0.ACTS && fv0.ACTS[0]) ? fv0.ACTS[0].palette : window.MT.Config.ERAS[0].palette;
        frostSeaSegCache = [{
          id: 'frost_sea',
          index: 1,
          name: '霜穹冰海',
          kicker: '第二海域 · 极地冰穹',
          subtitle: '半透明冰盖封冻了海面，穿行于孔雀蓝冰下空腔与极光地热之间。',
          startX: 0,
          endX: 999999,
          spawnX: 520,
          waveAmp: 0.36,
          roughness: 0,
          friction: 0.86,
          heatDps: 0,
          coldDps: 0,
          omenKey: null,
          omenWhisper: '',
          palette: basePal
        }];
      }
      return frostSeaSegCache;
    }
    if (!singleSeaSegCache) {
      var baseSea = window.MT.Config.ERAS[0];
      singleSeaSegCache = [Object.assign({}, baseSea, {
        startX: 0,
        endX: 999999,
        omenKey: null,
        omenWhisper: ''
      })];
    }
    return singleSeaSegCache;
  }

  // 计算第 2 海域《霜穹冰海》三段极地天象权重与无缝色板
  function computeFrostPhase() {
    var art = window.MT.Art;
    var fv = window.MT.Config.FROST_VOYAGE;
    if (!fv || !fv.ACTS) return null;
    var acts = fv.ACTS;
    var dur = fv.DURATION || 450;
    var tC = ((worldClock % dur) + dur) % dur;
    var tAu = fv.T_AURORA || 150;
    var tTh = fv.T_THAW || 320;

    var m12 = smoothstep(tAu - 16, tAu + 16, tC);
    var m23 = smoothstep(tTh - 16, tTh + 16, tC);
    var wrap = smoothstep(dur - 16, dur, tC);

    var wMist = (1 - m12) + m23 * wrap;
    var wAurora = m12 * (1 - m23);
    var wThaw = m23 * (1 - wrap);

    var actIdx = wAurora >= 0.5 ? 1 : (wThaw >= 0.5 ? 2 : 0);
    var palKeys = ['skyTop', 'skyMid', 'skyHorizon', 'farSea', 'midSeaTop', 'midSeaMid', 'midSeaDeep', 'frontSea', 'foam', 'haze'];
    var pal = {};
    var weightsArr = [wMist, wAurora, wThaw];
    palKeys.forEach(function (k) {
      var r = 0, g = 0, b = 0, sw = 0;
      for (var i = 0; i < 3; i++) {
        var wi = weightsArr[i];
        if (wi > 0.0001 && acts[i] && acts[i].palette && acts[i].palette[k]) {
          r += acts[i].palette[k][0] * wi;
          g += acts[i].palette[k][1] * wi;
          b += acts[i].palette[k][2] * wi;
          sw += wi;
        }
      }
      pal[k] = sw > 0 ? [Math.round(r / sw), Math.round(g / sw), Math.round(b / sw)] : [40, 80, 110];
    });

    return {
      actId: acts[actIdx].id,
      actName: acts[actIdx].name,
      polarMist: wMist,
      aurora: wAurora,
      thaw: wThaw,
      worldClock: worldClock,
      palette: pal
    };
  }

  // 计算《月潮之海》四幕天象平滑权重（支持故事模式 0..18000 四幕推进 & 无尽模式昼夜循环！）
  function computeSeaPhase(worldX) {
    var art = window.MT.Art;
    var sv = window.MT.Config.SEA_VOYAGE;
    if (!sv || !sv.ACTS) return null;
    var acts = sv.ACTS;
    var x = Math.max(0, worldX || 0);
    var w = { twilight: 0, biolum: 0, storm: 0, boil_abyss: 0, ash_sea: 0, kelp_abyss: 0, dawn: 0 };
    var actIdx = 0;

    if (isExploreMode()) {
      // === v11 自由探索时间时钟驱动（完全解耦距离，整片开放海域随真实时间缓缓演化！）===
      var wc = window.MT.Config.WORLD_CYCLE || {};
      var dur = wc.DURATION || 450;
      var tC = ((worldClock % dur) + dur) % dur;
      var t2 = wc.T_BIOLUM || 75;
      var t3 = wc.T_OMEN   || 150;
      var t4 = wc.T_IMPACT || 210;
      var t5 = wc.T_ASH    || 275;
      var t6 = wc.T_KELP   || 355;
      var t7 = wc.T_DAWN   || 405;

      var m12 = smoothstep(t2 - 14, t2 + 14, tC);
      var m23 = smoothstep(t3 - 14, t3 + 14, tC);
      var m34 = smoothstep(t4 - 2.5, t4 + 4.5, tC);
      var m45 = smoothstep(t5 - 16, t5 + 16, tC);
      var m56 = smoothstep(t6 - 16, t6 + 16, tC);
      var m67 = smoothstep(t7 - 12, t7 + 14, tC);
      var wrapDawn = smoothstep(dur - 14, dur, tC);

      w.twilight   = (1 - m12) + m67 * wrapDawn;
      w.biolum     = m12 * (1 - m23);
      w.storm      = m23 * (1 - m34);
      w.boil_abyss = m34 * (1 - m45);
      w.ash_sea    = m45 * (1 - m56);
      w.kelp_abyss = m56 * (1 - m67);
      w.dawn       = m67 * (1 - wrapDawn);

      if (w.dawn >= 0.5) actIdx = 6;
      else if (w.kelp_abyss >= 0.5) actIdx = 5;
      else if (w.ash_sea >= 0.5) actIdx = 4;
      else if (w.boil_abyss >= 0.5) actIdx = 3;
      else if (w.storm >= 0.5) actIdx = 2;
      else if (w.biolum >= 0.5) actIdx = 1;
      else actIdx = 0;
    } else if (gameMode === 'endless') {
      var cyc = sv.ENDLESS_CYCLE_X || 24000;
      var q = cyc * 0.25;
      var pos = ((x % cyc) + cyc) % cyc;
      var seg = Math.floor(pos / q) % 4;
      var localU = (pos - seg * q) / q;
      var nextSeg = (seg + 1) % 4;
      var blend = smoothstep(0.76, 1.0, localU);
      var eIdxMap = [0, 1, 2, 6];
      var keys = ['twilight', 'biolum', 'storm', 'dawn'];
      w[keys[seg]] = 1 - blend;
      w[keys[nextSeg]] = blend;
      actIdx = blend >= 0.5 ? eIdxMap[nextSeg] : eIdxMap[seg];
    } else {
      var b2 = sv.ACT2_X || 4200;
      var b3 = sv.ACT3_X || 9200;
      var b4 = sv.IMPACT_X || 14800;
      var b5 = sv.ASH_START_X || 18000;
      var b6 = sv.KELP_START_X || 20800;
      var b7 = sv.ASCENT_X || 23600;
      var m12 = smoothstep(b2 - 850, b2 + 850, x);
      var m23 = smoothstep(b3 - 850, b3 + 850, x);
      var m34 = smoothstep(b4 - 220, b4 + 340, x);
      var m45 = smoothstep(b5 - 600, b5 + 600, x);
      var m56 = smoothstep(b6 - 650, b6 + 650, x);
      var m67 = smoothstep(b7 - 480, b7 + 520, x);
      w.twilight   = 1 - m12;
      w.biolum     = m12 * (1 - m23);
      w.storm      = m23 * (1 - m34);
      w.boil_abyss = m34 * (1 - m45);
      w.ash_sea    = m45 * (1 - m56);
      w.kelp_abyss = m56 * (1 - m67);
      w.dawn       = m67;
      if (w.dawn >= 0.5) actIdx = 6;
      else if (w.kelp_abyss >= 0.5) actIdx = 5;
      else if (w.ash_sea >= 0.5) actIdx = 4;
      else if (w.boil_abyss >= 0.5) actIdx = 3;
      else if (w.storm >= 0.5) actIdx = 2;
      else if (w.biolum >= 0.5) actIdx = 1;
      else actIdx = 0;
    }

    var pal = {};
    var palKeys = Object.keys(acts[0].palette);
    var weightsArr = [w.twilight, w.biolum, w.storm, w.boil_abyss, w.ash_sea, w.kelp_abyss, w.dawn];
    for (var k = 0; k < palKeys.length; k++) {
      var pk = palKeys[k];
      var r = 0, g = 0, b = 0;
      for (var ai = 0; ai < acts.length; ai++) {
        var c = acts[ai].palette[pk];
        var wt = weightsArr[ai] || 0;
        r += c[0] * wt;
        g += c[1] * wt;
        b += c[2] * wt;
      }
      pal[pk] = [Math.round(r), Math.round(g), Math.round(b)];
    }

    return {
      act: acts[actIdx].actNum,
      actId: acts[actIdx].id,
      actName: acts[actIdx].name,
      actMeta: acts[actIdx],
      twilight: w.twilight,
      biolum: w.biolum,
      storm: w.storm,
      boilAbyss: w.boil_abyss,
      ashSea: w.ash_sea,
      kelpAbyss: w.kelp_abyss,
      abyssMix: Math.min(1, w.boil_abyss + w.ash_sea + w.kelp_abyss),
      dawn: w.dawn,
      worldClock: worldClock,
      cycleProgress: isExploreMode()
        ? clamp01(worldClock / ((window.MT.Config.WORLD_CYCLE && window.MT.Config.WORLD_CYCLE.DURATION) || 450))
        : clamp01(x / (sv.TOTAL_X || 26400)),
      progress: clamp01(x / (sv.TOTAL_X || 26400)),
      palette: pal
    };
  }

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  function getSegmentList() {
    if (isSingleSeaMode()) return getSingleSeaSegment();
    return (gameMode === 'endless' && endlessSegments.length > 0) ? endlessSegments : window.MT.Config.ERAS;
  }

  function getFinaleMix(worldX) {
    if (isSingleSeaMode() || gameMode !== 'story') return 0;
    var fx = window.MT.Config.IMPACT.FINALE_X || 63600;
    return smoothstep(fx - 1800, fx - 120, worldX);
  }

  function getCurrentEra(worldX) {
    var segs = getSegmentList();
    for (var i = 0; i < segs.length; i++) {
      if (worldX < segs[i].endX || i === segs.length - 1) return segs[i];
    }
    return segs[0];
  }

  // 通用纪元边界水彩融合 + 后段「演进征兆（Omen Phase）」自然酝酿过渡
  function getEraBlend(worldX) {
    var art = window.MT.Art;
    var segs = getSegmentList();
    var band = window.MT.Config.IMPACT.BLEND_BAND || 1500;
    var half = band * 0.5;
    var e1 = segs[0], e2 = segs[0], mix = 0;
    var activeSeg = segs[0];

    for (var i = 0; i < segs.length; i++) {
      if (worldX < segs[i].endX || i === segs.length - 1) {
        activeSeg = segs[i];
        break;
      }
    }

    for (var j = 0; j < segs.length - 1; j++) {
      var border = segs[j].endX;
      if (worldX >= border - half && worldX <= border + half) {
        e1 = segs[j];
        e2 = segs[j + 1];
        var u = (worldX - (border - half)) / band;
        mix = u * u * (3 - 2 * u);
        break;
      } else if (worldX < border - half) {
        e1 = e2 = segs[j];
        mix = 0;
        break;
      } else if (j === segs.length - 2) {
        e1 = e2 = segs[j + 1];
        mix = 0;
      }
    }

    var segLen = Math.max(1000, Math.min(20000, activeSeg.endX - activeSeg.startX));
    var eraProgress = Math.max(0, Math.min(1, (worldX - activeSeg.startX) / segLen));
    var omenRamp = activeSeg.omenKey ? smoothstep(0.66, 0.98, eraProgress) : 0;

    var omen = {
      fireApproach: activeSeg.omenKey === 'fireApproach' ? omenRamp : 0,
      ashFall:      activeSeg.omenKey === 'ashFall'      ? omenRamp : 0,
      thawCrack:    activeSeg.omenKey === 'thawCrack'    ? omenRamp : 0,
      firstRain:    activeSeg.omenKey === 'firstRain'    ? omenRamp : 0,
      canopyRise:   activeSeg.omenKey === 'canopyRise'   ? omenRamp : 0,
      tideReturn:   activeSeg.omenKey === 'tideReturn'   ? omenRamp : 0
    };

    var pal = {};
    Object.keys(e1.palette).forEach(function (k) {
      pal[k] = mix === 0 ? e1.palette[k] : art.lerpColor(e1.palette[k], e2.palette[k], mix);
    });

    // 在征兆阶段提前酝酿天色与雾气微偏，彻底消灭生硬幻灯片切换
    if (omen.fireApproach > 0.02 && mix < 0.5) {
      var fa = omen.fireApproach * 0.28;
      pal.skyHorizon = art.lerpColor(pal.skyHorizon, [246, 128, 76], fa);
      pal.haze = art.lerpColor(pal.haze, [248, 152, 104], fa);
    } else if (omen.ashFall > 0.02 && mix < 0.5) {
      var af = omen.ashFall * 0.36;
      pal.skyTop = art.lerpColor(pal.skyTop, [28, 32, 48], af);
      pal.skyHorizon = art.lerpColor(pal.skyHorizon, [168, 134, 128], af);
      pal.midSeaTop = art.lerpColor(pal.midSeaTop, [148, 86, 68], af);
    } else if (omen.thawCrack > 0.02 && mix < 0.5) {
      var tc = omen.thawCrack * 0.32;
      pal.skyHorizon = art.lerpColor(pal.skyHorizon, [218, 186, 154], tc);
      pal.haze = art.lerpColor(pal.haze, [216, 196, 174], tc);
    } else if (omen.firstRain > 0.02 && mix < 0.5) {
      var fr = omen.firstRain * 0.30;
      pal.skyMid = art.lerpColor(pal.skyMid, [94, 118, 126], fr);
      pal.midSeaTop = art.lerpColor(pal.midSeaTop, [138, 138, 92], fr);
    } else if (omen.canopyRise > 0.02 && mix < 0.5) {
      var cr = omen.canopyRise * 0.28;
      pal.skyTop = art.lerpColor(pal.skyTop, [32, 76, 94], cr);
      pal.midSeaTop = art.lerpColor(pal.midSeaTop, [104, 172, 106], cr);
    } else if (omen.tideReturn > 0.02 && mix < 0.5) {
      var tr = omen.tideReturn * 0.30;
      pal.skyTop = art.lerpColor(pal.skyTop, [28, 36, 74], tr);
      pal.skyHorizon = art.lerpColor(pal.skyHorizon, [226, 164, 138], tr);
    }

    // 故事模式终章《翡翠海岸 · 新生世界树》：清晨鎏金翡翠天色与澄澈重逢之海！
    var fMix = getFinaleMix(worldX);
    if (fMix > 0.01) {
      pal.skyTop     = art.lerpColor(pal.skyTop,     [32, 82, 108], fMix);
      pal.skyMid     = art.lerpColor(pal.skyMid,     [96, 168, 162], fMix);
      pal.skyHorizon = art.lerpColor(pal.skyHorizon, [252, 238, 190], fMix);
      pal.farSea     = art.lerpColor(pal.farSea,     [54, 122, 114], fMix);
      pal.midSeaTop  = art.lerpColor(pal.midSeaTop,  [72, 164, 152], fMix);
      pal.midSeaMid  = art.lerpColor(pal.midSeaMid,  [34, 104, 110], fMix);
      pal.midSeaDeep = art.lerpColor(pal.midSeaDeep, [14, 48, 64], fMix);
      pal.frontSea   = art.lerpColor(pal.frontSea,   [26, 78, 86], fMix);
      pal.haze       = art.lerpColor(pal.haze,       [238, 244, 206], fMix);
    }

    var w = {
      moon_sea: 0, frost_sea: 0, fire_sea: 0, ice_winter: 0,
      thawed_wasteland: 0, sprout_meadow: 0, giant_forest: 0
    };
    if (e1.id === e2.id) {
      w[e1.id] = 1;
    } else {
      w[e1.id] = 1 - mix;
      w[e2.id] = mix;
    }

    var isFrost = isSingleSeaMode() && activeRealm === 'frost_sea';
    var seaPhase = (isSingleSeaMode() && !isFrost) ? computeSeaPhase(worldX) : null;
    var frostPhase = isFrost ? computeFrostPhase() : null;
    if (frostPhase && frostPhase.palette) {
      pal = frostPhase.palette;
      eraProgress = clamp01(worldClock / 450);
    } else if (seaPhase && seaPhase.palette) {
      pal = seaPhase.palette;
      eraProgress = seaPhase.progress;
    }

    var liquidMix = Math.min(1, w.moon_sea + w.frost_sea + w.fire_sea + fMix);
    return {
      era: mix < 0.5 ? e1 : e2,
      activeSeg: activeSeg,
      eraProgress: eraProgress,
      seaPhase: seaPhase,
      frostPhase: frostPhase,
      omen: omen,
      finaleMix: fMix,
      weights: w,
      liquidMix: liquidMix,
      solidMix: 1 - liquidMix,
      fireMix: w.fire_sea,
      iceMix: w.ice_winter,
      wasteMix: w.thawed_wasteland,
      meadowMix: w.sprout_meadow,
      forestMix: w.giant_forest,
      waveAmp: art.lerp(e1.waveAmp, e2.waveAmp, mix),
      roughness: art.lerp(e1.roughness || 0, e2.roughness || 0, mix),
      friction: art.lerp(e1.friction || 0.86, e2.friction || 0.86, mix),
      heatDps: art.lerp(e1.heatDps || 0, e2.heatDps || 0, mix),
      coldDps: art.lerp(e1.coldDps || 0, e2.coldDps || 0, mix),
      bumpRisk: art.lerp(e1.bumpRisk || 0, e2.bumpRisk || 0, mix),
      vineRisk: art.lerp(e1.vineRisk || 0, e2.vineRisk || 0, mix),
      palette: pal
    };
  }

  // === 六纪元独立地形函数：仅海/火海随 t 流动，冰原/荒土/青野/林海 100% 绝对静止！ ===
  function getMoonSeaY(x, t, omenBoost, seaPhase) {
    var hitX = window.MT.Config.IMPACT.HIT_X || 14800;
    var growth;
    var speedMult = 1.0;
    if (seaPhase) {
      growth = seaPhase.twilight * 0.96 + seaPhase.biolum * 1.14 + seaPhase.storm * 1.32
        + (seaPhase.boilAbyss || 0) * 0.85 + (seaPhase.ashSea || 0) * 0.42 + (seaPhase.kelpAbyss || 0) * 0.54 + seaPhase.dawn * 0.56;
      speedMult = seaPhase.twilight * 0.95 + seaPhase.biolum * 1.04 + seaPhase.storm * 1.24
        + (seaPhase.boilAbyss || 0) * 1.15 + (seaPhase.ashSea || 0) * 0.65 + (seaPhase.kelpAbyss || 0) * 0.78 + seaPhase.dawn * 0.72;
    } else {
      growth = 1.0 + Math.min(0.28, Math.max(0, x) / hitX * 0.28) + (omenBoost || 0) * 0.20;
    }
    var tt = t * speedMult;
    var group = 0.68 + 0.34 * Math.sin(x * 0.00103 - tt * 0.24 + 0.5) * Math.cos(x * 0.00067 + tt * 0.17);
    var w1 = Math.sin(x * 0.00365 + tt * 0.82) * 38 * group;
    var w2 = Math.sin(x * 0.00683 - tt * 1.18 + 1.4) * 18;
    var w3 = Math.sin(x * 0.01297 + tt * 1.65 + 2.7) * 6;
    return (w1 + w2 + w3) * growth;
  }

  function getFireSeaY(x, t, coolFactor) {
    // 火海末期（ashFall 征兆）熔岩流速逐步减缓、浪幅收敛，展现逐渐冷却凝冻的真实演进！
    var cool = Math.max(0, Math.min(1, coolFactor || 0));
    var effT = t * (1 - cool * 0.62);
    var group = 0.72 + 0.32 * Math.sin(x * 0.00118 - effT * 0.18 + 1.1);
    var w1 = Math.sin(x * 0.00325 + effT * 0.54) * 46 * group;
    var w2 = Math.sin(x * 0.00615 - effT * 0.76 + 2.0) * 22;
    var w3 = Math.sin(x * 0.0114 + effT * 1.05) * 7;
    return (w1 + w2 + w3) * (1 - cool * 0.18);
  }

  // 纪元 III 冰原（绝对静止）：平滑冻湖段 + 利落冰川跳台坡
  function getIceTerrainY(x) {
    var macro = Math.sin(x * 0.00185 + 0.4) * 24;
    var cycle = ((x % 1180) + 1180) % 1180;
    var ridge = 0;
    if (cycle > 460 && cycle < 980) {
      var u = (cycle - 460) / 520;
      ridge = -Math.pow(Math.sin(u * Math.PI), 1.45) * 62;
    }
    var detail = Math.sin(x * 0.0092) * 4.0;
    return macro + ridge + detail + 10;
  }

  // 纪元 IV 荒土（绝对静止）：平顶荒原台地 + 真实碗状陨石坑 + 碎石坎
  function getWastelandTerrainY(x) {
    var plateau = Math.tanh(Math.sin(x * 0.00215 + 0.9) * 2.1) * 28;
    var cell = 640;
    var local = ((x % cell) + cell) % cell - cell * 0.5;
    var r = Math.abs(local) / 145;
    var crater = 0;
    if (r < 1.35) {
      var bowl = Math.max(0, 1 - r * r) * 30;
      var rim = Math.exp(-Math.pow((r - 0.98) / 0.20, 2)) * 15;
      crater = bowl - rim;
    }
    var rubble = Math.sin(x * 0.047 + 0.6) * 5.0 + Math.cos(x * 0.089 + 1.4) * 3.0;
    return plateau + crater + rubble + 14;
  }

  // 纪元 V 萌芽青野（绝对静止）：舒展柔和的宽阔缓丘
  function getMeadowTerrainY(x) {
    return Math.sin(x * 0.00210 + 0.2) * 44 + Math.sin(x * 0.00445 + 1.9) * 18 + Math.cos(x * 0.00095) * 15 + 6;
  }

  // 纪元 VI 巨木林海（绝对静止）：雄浑起伏的林间巨根长坡
  function getForestTerrainY(x) {
    return Math.sin(x * 0.00205 + 0.7) * 56 + Math.sin(x * 0.00485 + 2.3) * 24 + Math.sin(x * 0.0112) * 4.2;
  }

  function getFrostSeaY(worldX, t) {
    // 霜穹冰海平静清透的极地涌浪（波幅克制，与冰盖完美衔接！）
    return Math.sin(worldX * 0.0044 + t * 0.85) * 6.5
      + Math.sin(worldX * 0.0105 - t * 1.15) * 2.8;
  }

  function getSurfaceY(worldX, t) {
    var tt = typeof t === 'number' ? t : time;
    var eb = getEraBlend(worldX);
    var w = eb.weights;
    var y = 0;
    if (w.moon_sea > 0.0001)         y += w.moon_sea * getMoonSeaY(worldX, tt, eb.omen.fireApproach, eb.seaPhase);
    if (w.frost_sea > 0.0001)        y += w.frost_sea * getFrostSeaY(worldX, tt);
    if (w.fire_sea > 0.0001)         y += w.fire_sea * getFireSeaY(worldX, tt, eb.omen.ashFall);
    if (w.ice_winter > 0.0001)       y += w.ice_winter * getIceTerrainY(worldX);
    if (w.thawed_wasteland > 0.0001) y += w.thawed_wasteland * getWastelandTerrainY(worldX);
    if (w.sprout_meadow > 0.0001)    y += w.sprout_meadow * getMeadowTerrainY(worldX);
    if (w.giant_forest > 0.0001)     y += w.giant_forest * getForestTerrainY(worldX);
    // 故事模式终章：从林海坡地温柔过渡回澄澈平静的重逢翡翠海湾！
    if (eb.finaleMix > 0.001) {
      var calmBayY = 18 + Math.sin(worldX * 0.0042 + tt * 0.72) * 8.5 + Math.sin(worldX * 0.009 - tt * 0.95) * 3.0;
      y = window.MT.Art.lerp(y, calmBayY, eb.finaleMix);
    } else if (window.MT.LevelEngine && window.MT.LevelEngine.getSurfaceOffset) {
      y += window.MT.LevelEngine.getSurfaceOffset(worldX, tt);
    }
    return y;
  }

  function getSurfaceSlope(worldX, t) {
    var dx = 10;
    return (getSurfaceY(worldX + dx, t) - getSurfaceY(worldX - dx, t)) / (dx * 2);
  }

  function getRailY(rail, x) {
    var u = Math.max(0, Math.min(1, (x - rail.x0) / Math.max(1, rail.x1 - rail.x0)));
    var inv = 1 - u;
    return inv * inv * rail.y0 + 2 * inv * u * rail.cy + u * u * rail.y1;
  }

  function getRailSlope(rail, x) {
    var span = Math.max(1, rail.x1 - rail.x0);
    var u = Math.max(0, Math.min(1, (x - rail.x0) / span));
    var dydu = 2 * (1 - u) * (rail.cy - rail.y0) + 2 * u * (rail.y1 - rail.cy);
    return dydu / span;
  }

  function getSurfaceRoughnessBump(worldX, t) {
    var eb = getEraBlend(worldX);
    if (eb.roughness < 0.25) return 0;
    var y0 = getSurfaceY(worldX - 14, t);
    var ym = getSurfaceY(worldX, t);
    var y1 = getSurfaceY(worldX + 14, t);
    return Math.abs((y0 + y1) * 0.5 - ym) * eb.roughness;
  }

  function spawnAheadPattern(anchorX) {
    // 终章神圣海湾保持静谧纯粹，不再刷障碍或杂乱星火
    if (gameMode === 'story' && anchorX > (window.MT.Config.IMPACT.FINALE_X || 63600) - 1200) {
      return 480;
    }
    var era = getCurrentEra(anchorX);
    var eraId = era.id;
    var starVal = era.starValue || 1;
    var roll = Math.random();

    // 当第 1 关独立插件已接管月潮之海手工区块时：第 3 幕巨潮逃亡段保持干净纯逃亡舞台，前两幕适度补浮灯与弧线星火
    if ((eraId === 'moon_sea' || eraId === 'frost_sea') && window.MT.LevelEngine) {
      if (isExploreMode()) return 1400;
      var svC = window.MT.Config.SEA_VOYAGE || {};
      var act3Start = svC.ACT3_X || 9200;
      var act4End = svC.TOTAL_X || 18000;
      if (gameMode === 'story' && anchorX >= act3Start - 200 && anchorX < act4End + 500) {
        return 540;
      }
      if (roll < 0.48) {
        var cntS = 5;
        var spS = 220;
        var pkS = 115 + Math.random() * 55;
        var byS = getSurfaceY(anchorX + spS * 0.5, time);
        for (var si = 0; si < cntS; si++) {
          var su = si / (cntS - 1);
          var ssx = anchorX + su * spS;
          var ssy = byS - 28 - Math.sin(su * Math.PI) * pkS;
          starArcs.push({
            id: nextId++, x: ssx, y: ssy, baseY: ssy, surfFollow: false,
            theme: 'moon_sea', value: starVal, phase: si * 0.5, collected: false, magnetized: false
          });
        }
        return spS + 380 + Math.random() * 180;
      } else {
        buoys.push({
          id: nextId++, x: anchorX + 90, phase: Math.random() * Math.PI * 2,
          lit: true, theme: 'moon_sea', flash: 0
        });
        return 440 + Math.random() * 180;
      }
    }

    // 纪元 I 月潮之海：柔和发光浮鲸背脊（未启用插件时的兜底逻辑）
    if (eraId === 'moon_sea' && roll < 0.30) {
      var wx = anchorX + 160;
      whales.push({
        id: nextId++,
        x: wx,
        radiusX: 74,
        phase: Math.random() * Math.PI * 2,
        bounced: false,
        bounceFlash: 0
      });
      for (var wk = 0; wk < 6; wk++) {
        var wu = wk / 5;
        var wsx = wx + 20 + wu * 280;
        var wsy = -145 - Math.sin(wu * Math.PI) * 115;
        starArcs.push({
          id: nextId++, x: wsx, y: wsy, baseY: wsy, surfFollow: false,
          theme: 'moon_sea', value: starVal, phase: wk * 0.45, collected: false, magnetized: false
        });
      }
      return 490 + Math.random() * 140;
    }

    // 纪元 III 冰原 / IV 荒土 / VI 巨林：高速架空滑轨机关（冰桥轨 / 锈铁残桥 / 发光树根轨！）
    if ((eraId === 'ice_winter' || eraId === 'thawed_wasteland' || eraId === 'giant_forest') && roll < 0.38) {
      var rx0 = anchorX + 90;
      var rLen = 420 + Math.random() * 190;
      var rx1 = rx0 + rLen;
      var liftH = eraId === 'giant_forest' ? 115 : (eraId === 'thawed_wasteland' ? 86 : 92);
      var y0 = getSurfaceY(rx0, time) - liftH * 0.68;
      var y1 = getSurfaceY(rx1, time) - liftH * 0.88;
      var cy = Math.min(y0, y1) - (38 + Math.random() * 34);
      var style = eraId === 'ice_winter' ? 'ice_bridge' : (eraId === 'thawed_wasteland' ? 'iron_bridge' : 'root_rail');
      var rail = {
        id: nextId++,
        x0: rx0, x1: rx1,
        y0: y0, cy: cy, y1: y1,
        style: style,
        theme: eraId,
        grinded: false,
        completed: false,
        glow: 0
      };
      grindRails.push(rail);

      var rStars = 7;
      for (var rs = 0; rs < rStars; rs++) {
        var ru = (rs + 0.5) / rStars;
        var sxR = rx0 + ru * rLen;
        var syR = getRailY(rail, sxR) - 24;
        starArcs.push({
          id: nextId++, x: sxR, y: syR, baseY: syR, surfFollow: false,
          theme: eraId, value: starVal, phase: rs * 0.4, collected: false, magnetized: false
        });
      }
      return rLen + 260 + Math.random() * 130;
    }

    // 当第 2 关独立插件接管火海手工区块时，跳过旧版通用热柱模板避免重叠
    if (eraId === 'fire_sea' && window.MT.LevelEngine && window.MT.LevelEngine.getPlugin('fire_sea')) {
      if (roll < 0.42) {
        buoys.push({
          id: nextId++, x: anchorX + 110, phase: Math.random() * Math.PI * 2,
          lit: true, theme: 'fire_sea', flash: 0
        });
        return 520 + Math.random() * 180;
      }
      return 480 + Math.random() * 180;
    }

    // 纪元 II 火海：熔岩热柱（未启用插件时的兜底逻辑）
    if (eraId === 'fire_sea' && roll < 0.34) {
      var px = anchorX + 120;
      lavaPlumes.push({
        id: nextId++, x: px, radius: 50, height: 215 + Math.random() * 45,
        phase: Math.random() * Math.PI * 2, boosted: false, hurtCooldown: 0
      });
      for (var k = 0; k < 5; k++) {
        var u = k / 4;
        var sx = px - 95 + u * 190;
        var sy = -150 - Math.sin(u * Math.PI) * 90;
        starArcs.push({
          id: nextId++, x: sx, y: sy, baseY: sy, surfFollow: false,
          theme: 'fire_sea', value: starVal, phase: k * 0.5, collected: false
        });
      }
      return 390 + Math.random() * 140;
    }

    // 纪元 V 萌芽青野：蒲公英上升风口 + 高空翡翠星火弧（配风铃滑翔翼飞超远！）
    if (eraId === 'sprout_meadow' && roll < 0.42) {
      var gx = anchorX + 120;
      dandelionGusts.push({
        id: nextId++, x: gx, radius: 66, height: 265,
        phase: Math.random() * Math.PI * 2, boosted: false
      });
      for (var d = 0; d < 7; d++) {
        var du = d / 6;
        var dx = gx + 20 + du * 340;
        var dy = -150 - Math.sin(du * Math.PI) * 110;
        starArcs.push({
          id: nextId++, x: dx, y: dy, baseY: dy, surfFollow: false,
          theme: 'sprout_meadow', value: starVal, phase: d * 0.45, collected: false
        });
      }
      return 480 + Math.random() * 130;
    }

    // 纪元 VI 巨木林海：垂落荆棘巨藤帘（需破藤鎏金船首切开）+ 孢子云海浮力流
    if (eraId === 'giant_forest' && roll < 0.54) {
      var vx = anchorX + 140;
      if (roll < 0.32) {
        vineCurtains.push({
          id: nextId++, x: vx, width: 34, phase: Math.random() * Math.PI * 2,
          sliced: false, sliceFlash: 0, hurtCooldown: 0
        });
        for (var vs = 0; vs < 5; vs++) {
          var vsu = vs / 4;
          starArcs.push({
            id: nextId++, x: vx + 75 + vsu * 210, y: getSurfaceY(vx + 75 + vsu * 210, time) - 44 - Math.sin(vsu * Math.PI) * 65,
            baseY: -44, surfFollow: false, theme: 'giant_forest', value: starVal, phase: vs * 0.5, collected: false
          });
        }
        return 420 + Math.random() * 130;
      } else {
        sporeCurrents.push({
          id: nextId++, x: vx, y: -155 - Math.random() * 65, rx: 92, ry: 54,
          phase: Math.random() * Math.PI * 2, boosted: false
        });
        for (var sc = 0; sc < 6; sc++) {
          var scu = sc / 5;
          var scx = vx - 85 + scu * 250;
          var scy = -170 - Math.sin(scu * Math.PI) * 85;
          starArcs.push({
            id: nextId++, x: scx, y: scy, baseY: scy, surfFollow: false,
            theme: 'giant_forest', value: starVal, phase: sc * 0.45, collected: false
          });
        }
        return 440 + Math.random() * 140;
      }
    }

    if (roll < 0.58) {
      var count = 6 + Math.floor(Math.random() * 3);
      var span = 270 + Math.random() * 90;
      var peak = 125 + Math.random() * 72;
      var baseY = getSurfaceY(anchorX + span * 0.5, time);
      for (var i = 0; i < count; i++) {
        var u2 = i / (count - 1);
        var sx2 = anchorX + u2 * span;
        var sy2 = baseY - 28 - Math.sin(u2 * Math.PI) * peak;
        starArcs.push({
          id: nextId++, x: sx2, y: sy2, baseY: sy2, surfFollow: false,
          theme: eraId, value: starVal, phase: i * 0.45 + Math.random(), collected: false
        });
      }
      return span + 250 + Math.random() * 130;
    } else if (roll < 0.84) {
      var c2 = 6, span2 = 240;
      for (var j = 0; j < c2; j++) {
        var sx3 = anchorX + j * (span2 / (c2 - 1));
        starArcs.push({
          id: nextId++, x: sx3, y: getSurfaceY(sx3, time) - 24, baseY: -24, surfFollow: true,
          theme: eraId, value: starVal, phase: j * 0.5, collected: false
        });
      }
      return span2 + 225 + Math.random() * 120;
    } else {
      buoys.push({
        id: nextId++, x: anchorX + 80, phase: Math.random() * Math.PI * 2,
        lit: true, theme: eraId, flash: 0
      });
      return 330 + Math.random() * 130;
    }
  }

  function spawnAheadLandmark(x) {
    if (gameMode === 'story' && x > (window.MT.Config.IMPACT.FINALE_X || 63600) - 900) return;
    var era = getCurrentEra(x);
    var types;
    if (era.id === 'fire_sea') types = ['basalt_spire', 'shattered_arch', 'volcano_crag'];
    else if (era.id === 'ice_winter') types = ['iceberg', 'frozen_pine', 'glacier_arch'];
    else if (era.id === 'thawed_wasteland') types = ['crater_ridge', 'rusted_pylon', 'boulder_mesa'];
    else if (era.id === 'sprout_meadow') types = ['sprout_hill', 'ruin_ivy', 'windmill_ruin'];
    else if (era.id === 'giant_forest') types = ['giant_tree', 'canopy_arch', 'ancient_torii_tree'];
    else types = ['cottage', 'pier', 'lighthouse', 'arch', 'seastack'];

    landmarks.push({
      id: nextId++,
      x: x,
      type: types[Math.floor(Math.random() * types.length)],
      eraId: era.id,
      scale: 0.86 + Math.random() * 0.50,
      seed: Math.random() * 100
    });
  }

  function reset(startX, mode) {
    gameMode = (mode === 'endless') ? 'endless' : 'story';
    endlessSegments = [];
    endlessBag = [];
    endlessSeqIdx = 0;
    finaleActive = false;
    finaleCompleted = false;
    finaleTimer = 0;

    var sx = (gameMode === 'endless') ? 120 : (typeof startX === 'number' ? startX : 120);
    if (gameMode === 'endless' && !isSingleSeaMode()) {
      ensureEndlessSegments(sx);
    }

    var imp = window.MT.Config.IMPACT;
    time = 0;
    worldClock = 0;
    impactTriggered = isSingleSeaMode() ? false : (gameMode === 'endless' ? true : (sx >= imp.HIT_X - 100));
    moonDescent = isSingleSeaMode() ? 0.12 : (gameMode === 'endless' ? 0.36 : (impactTriggered ? 1.0 : Math.min(1.0, 0.08 + (sx / imp.HIT_X) * 0.92)));
    impactFlash = 0;
    impactAge = impactTriggered ? 10 : 0;
    rebirthTriggered = false;
    announcedEras = {};
    announcedOmens = {};
    var startEra = getCurrentEra(sx);
    announcedEras[startEra.seqNum ? ('seg_' + startEra.seqNum) : startEra.id] = true;

    landmarks = [];
    jellyfish = [];
    iceScratches = [];
    starArcs = [];
    buoys = [];
    lavaPlumes = [];
    dandelionGusts = [];
    vineCurtains = [];
    sporeCurrents = [];
    grindRails = [];
    whales = [];
    ashSnow = [];
    emberMotes = [];
    rainDrops = [];
    forestSpores = [];
    particles = [];
    popups = [];
    nextId = 1;
    nextPatternX = sx + 320;
    nextLandmarkX = sx - 200;

    for (var l = 0; l < 9; l++) {
      spawnAheadLandmark(nextLandmarkX);
      nextLandmarkX += 460 + Math.random() * 240;
    }
    if (gameMode === 'endless' || sx < imp.HIT_X) {
      // 11 只错落深浅、各异倾角与律动节奏的发光水母（绝不复制粘贴！）
      var jellyPalettes = [
        { rim: 'rgba(166, 232, 255,', core: 'rgba(232, 248, 255,' },
        { rim: 'rgba(214, 194, 255,', core: 'rgba(248, 236, 255,' },
        { rim: 'rgba(255, 206, 184,', core: 'rgba(255, 242, 224,' }
      ];
      var jTotal = isExploreMode() ? 24 : 11;
      for (var j = 0; j < jTotal; j++) {
        var tier = j % 3;
        var jp = jellyPalettes[j % jellyPalettes.length];
        jellyfish.push({
          x: isExploreMode() ? (620 + j * 390 + (Math.random() - 0.5) * 160) : (sx - 140 + j * 235 + (Math.random() - 0.5) * 140),
          depth: (tier === 0 ? 115 : (tier === 1 ? 88 : 72)) + Math.random() * (isExploreMode() ? 195 : 125),
          size: (tier === 0 ? 5.5 : (tier === 1 ? 9.5 : 13.5)) + Math.random() * 3.5,
          tier: tier,
          tilt: (Math.random() - 0.5) * 0.95,
          baseTilt: (Math.random() - 0.5) * 0.85,
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: 1.55 + Math.random() * 1.15,
          bellRatio: 0.78 + Math.random() * 0.34,
          tentacles: 4 + (j % 3),
          rimHue: jp.rim,
          coreHue: jp.core,
          seed: j * 13.7 + Math.random() * 5
        });
      }
    }
    for (var e = 0; e < 32; e++) {
      emberMotes.push({ ox: Math.random() * 1600 - 800, oy: -360 + Math.random() * 440, size: 1.2 + Math.random() * 2.4, vy: -18 - Math.random() * 34, phase: Math.random() * Math.PI * 2 });
    }
    for (var s = 0; s < 42; s++) {
      ashSnow.push({ ox: Math.random() * 1600 - 800, oy: -400 + Math.random() * 480, r: 1.2 + Math.random() * 2.4, vy: 26 + Math.random() * 36, vx: -28 - Math.random() * 24, phase: Math.random() * Math.PI * 2 });
    }
    for (var rd = 0; rd < 44; rd++) {
      rainDrops.push({ ox: Math.random() * 1600 - 800, oy: -420 + Math.random() * 500, len: 12 + Math.random() * 14, vy: 310 + Math.random() * 120 });
    }
    for (var sp = 0; sp < 40; sp++) {
      forestSpores.push({ ox: Math.random() * 1600 - 800, oy: -380 + Math.random() * 460, r: 1.4 + Math.random() * 2.6, vy: -8 - Math.random() * 18, phase: Math.random() * Math.PI * 2, gold: sp % 3 === 0 });
    }
    for (var p = 0; p < 5; p++) {
      nextPatternX += spawnAheadPattern(nextPatternX);
    }
  }

  function emitSplash(x, y, count, color, upBias) {
    for (var i = 0; i < count; i++) {
      var ang = -Math.PI * 0.14 - Math.random() * Math.PI * 0.72;
      var spd = 48 + Math.random() * 150;
      particles.push({
        x: x + (Math.random() - 0.5) * 18, y: y,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - (upBias || 0),
        life: 0.55 + Math.random() * 0.5, maxLife: 1.05,
        size: 1.8 + Math.random() * 2.6, color: color || '#ebf4ff',
        gravity: 270, kind: 'drop'
      });
    }
  }

  function emitSpark(x, y, vx, vy, color, size, life) {
    particles.push({
      x: x, y: y, vx: vx, vy: vy,
      life: life || 0.55, maxLife: life || 0.55,
      size: size || 3.0, color: color || '#ffd98c',
      gravity: -22, kind: 'glow'
    });
  }

  function emitRing(x, y, color) {
    particles.push({
      x: x, y: y, vx: 0, vy: -8,
      life: 1.05, maxLife: 1.05,
      size: 14, color: color || '#ffe29c',
      gravity: 0, kind: 'ring'
    });
  }

  function addIceScratch(x, y, carving) {
    var last = iceScratches.length > 0 ? iceScratches[iceScratches.length - 1] : null;
    if (last && Math.hypot(x - last.x, y - last.y) < 10) return;
    iceScratches.push({
      x: x,
      y: y,
      carving: !!carving,
      life: 3.4,
      maxLife: 3.4,
      breakBefore: !last || Math.hypot(x - last.x, y - last.y) > 46
    });
    if (iceScratches.length > 96) iceScratches.shift();
  }

  function addPopup(x, y, text, color) {
    var py = y;
    for (var i = 0; i < popups.length; i++) {
      if (Math.abs(popups[i].x - x) < 150 && Math.abs(popups[i].y - py) < 24) {
        py = popups[i].y - 26;
      }
    }
    popups.push({ x: x, y: py, text: text, color: color || '#ffe7a8', life: 1.35, maxLife: 1.35 });
  }

  function update(dt, boat, onEraEvent) {
    time += dt;
    var imp = window.MT.Config.IMPACT;

    if (isSingleSeaMode()) {
      if (isExploreMode()) {
        var wcDur = (window.MT.Config.WORLD_CYCLE && window.MT.Config.WORLD_CYCLE.DURATION) || 450;
        worldClock = (worldClock + dt) % wcDur;
      }
      var spNow = computeSeaPhase(boat.x);
      var targetM;
      if (isExploreMode()) {
        var tImp = (window.MT.Config.WORLD_CYCLE && window.MT.Config.WORLD_CYCLE.T_IMPACT) || 210;
        if (worldClock < tImp) {
          var preU = clamp01(worldClock / tImp);
          targetM = 0.10 + Math.pow(preU, 1.35) * 0.86;
        } else {
          targetM = (spNow && spNow.dawn > 0.3) ? 0.14 : 1.0;
        }
      } else {
        targetM = spNow
          ? (spNow.twilight * 0.14 + spNow.biolum * 0.38 + spNow.storm * 0.88 + (spNow.boilAbyss || 0) * 1.0 + (spNow.ashSea || 0) * 1.0 + spNow.dawn * 0.18)
          : 0.20;
      }
      moonDescent += (targetM - moonDescent) * Math.min(1, dt * 1.4);
    } else if (gameMode === 'endless') {
      ensureEndlessSegments(boat.x);
      moonDescent += (0.36 - moonDescent) * Math.min(1, dt * 1.2);
    } else {
      var rawProg = Math.max(0, Math.min(1, boat.x / imp.HIT_X));
      var targetMoon = 0.08 + Math.pow(rawProg, 1.15) * 0.92;
      moonDescent += (targetMoon - moonDescent) * Math.min(1, dt * 1.8);

      if (!impactTriggered && boat.x >= imp.HIT_X) {
        impactTriggered = true;
        impactFlash = 1.0;
        impactAge = 0;
        announcedEras.fire_sea = true;
        window.MT.Audio.playEraFanfare('fire_sea');
        window.MT.Audio.playSkyFallSplash();
        if (window.MT.RenderWorld && window.MT.RenderWorld.addShake) window.MT.RenderWorld.addShake(13.0);
        boat.vy = Math.min(boat.vy, -165);
        boat.vx = Math.max(boat.vx + 75, 250);
        emitRing(boat.x, boat.y, '#ffbe78');
        for (var k = 0; k < 24; k++) {
          emitSpark(boat.x + (Math.random() - 0.2) * 320, boat.y - Math.random() * 140, -80 - Math.random() * 140, -60 - Math.random() * 140, k % 2 === 0 ? '#ffe59c' : '#ff8c5a', 3.2 + Math.random() * 2.4, 1.2);
        }
        // 若第 1 关独立关卡插件正在接管「第 1 关通关结算」，由关卡结算卡展示解锁火海，避免横幅叠字
        var l1HandlesClear = window.MT.LevelEngine && window.MT.LevelEngine.getPlugin('moon_sea') && boat.startX < imp.HIT_X - 600;
        if (!l1HandlesClear && typeof onEraEvent === 'function') {
          onEraEvent('era_enter', window.MT.Config.ERAS[1]);
        }
      }
    }

    var curEra = getCurrentEra(boat.x);
    var segKey = curEra.seqNum ? ('seg_' + curEra.seqNum) : curEra.id;
    if (!isExploreMode() && !announcedEras[segKey]) {
      announcedEras[segKey] = true;
      window.MT.Audio.playEraFanfare(curEra.id);
      if (typeof onEraEvent === 'function') onEraEvent('era_enter', curEra);
    }

    // 纪元后段演进征兆：触发诗意轻语 + 征兆微粒（故事与无尽乱序均生效）
    var ebBoat = getEraBlend(boat.x);
    if (curEra.omenKey && ebBoat.eraProgress > 0.70 && !announcedOmens[segKey]) {
      announcedOmens[segKey] = true;
      if (curEra.omenWhisper) {
        addPopup(boat.x + 80, boat.y - 78, curEra.omenWhisper, '#fff0cc');
      }
    }
    if (ebBoat.omen.fireApproach > 0.15 && Math.random() < dt * 8 * ebBoat.omen.fireApproach) {
      var sxM = boat.x + 180 + Math.random() * 520;
      emitSpark(sxM, getSurfaceY(sxM, time) - 6, -24, -46 - Math.random() * 34, 'rgba(255,244,230,0.65)', 3.6, 1.1);
      if (Math.random() < 0.35) {
        emitSpark(boat.x + 260 + Math.random() * 480, -340, -140, 210, '#ffae6c', 2.6, 1.2);
      }
    }

    // 故事模式史诗终章：《翡翠海岸 · 新生世界树》静谧泊舟演出（仅多纪元模式触发）
    if (!isSingleSeaMode() && gameMode === 'story') {
      var finaleX = imp.FINALE_X || 63600;
      if (!finaleActive && boat.x >= finaleX - 440) {
        finaleActive = true;
        finaleTimer = 0;
        rebirthTriggered = true;
        var bonus = window.MT.Config.ECONOMY.REBIRTH_BONUS_STARS || 80;
        boat.runStars += bonus;
        boat.hull = boat.maxHull;
        boat.fuel = 1.0;
        window.MT.Audio.playFinaleChord();
        emitRing(boat.x, boat.y - 14, '#c4fae0');
        emitRing(boat.x, boat.y - 14, '#fff0b2');
        if (typeof onEraEvent === 'function') onEraEvent('finale_enter');
      }
      if (finaleActive) {
        finaleTimer += dt;
        // 终章世界树下漫天上升的暖金与翡翠星萤花瓣
        if (Math.random() < dt * 16) {
          emitSpark(
            finaleX + (Math.random() - 0.35) * 680,
            26 - Math.random() * 140,
            (Math.random() - 0.5) * 18,
            -22 - Math.random() * 38,
            Math.random() < 0.5 ? '#fff2b8' : '#b4f8d2',
            2.4 + Math.random() * 2.2,
            2.2
          );
        }
        if (!finaleCompleted && finaleTimer >= 3.2) {
          finaleCompleted = true;
          if (typeof onEraEvent === 'function') onEraEvent('finale_complete');
        }
      }
    }

    if (impactTriggered) {
      impactAge += dt;
      if (impactFlash > 0) impactFlash = Math.max(0, impactFlash - dt * 0.58);
    }

    while (nextPatternX < boat.x + 1500) { nextPatternX += spawnAheadPattern(nextPatternX); }
    while (nextLandmarkX < boat.x + 1900) {
      spawnAheadLandmark(nextLandmarkX);
      nextLandmarkX += 460 + Math.random() * 260;
    }

    // 修复竖排糖葫芦 Bug：进入 magnetized 磁吸态的星火不再覆写 y，由物理层顺滑归巢飞入船身！
    for (var s = starArcs.length - 1; s >= 0; s--) {
      var st = starArcs[s];
      st.phase += dt * 3.0;
      if (!st.magnetized) {
        if (st.surfFollow) st.y = getSurfaceY(st.x, time) + st.baseY + Math.sin(st.phase) * 3;
        else st.y = st.baseY + Math.sin(st.phase) * 4;
      }
      if (st.collected || st.x < boat.x - 900) starArcs.splice(s, 1);
    }

    for (var b = buoys.length - 1; b >= 0; b--) {
      var by = buoys[b];
      by.phase += dt * 2.2;
      if (by.flash > 0) by.flash = Math.max(0, by.flash - dt * 2.0);
      if (by.x < boat.x - 900) buoys.splice(b, 1);
    }

    for (var lp = lavaPlumes.length - 1; lp >= 0; lp--) {
      var pl = lavaPlumes[lp];
      pl.phase += dt * 2.6;
      if (pl.hurtCooldown > 0) pl.hurtCooldown = Math.max(0, pl.hurtCooldown - dt);
      if (Math.abs(pl.x - boat.x) < 920 && Math.random() < dt * 11) {
        var surf = getSurfaceY(pl.x, time);
        emitSpark(pl.x + (Math.random() - 0.5) * 44, surf - Math.random() * 40, (Math.random() - 0.5) * 28, -110 - Math.random() * 90, Math.random() < 0.5 ? '#ffe09c' : '#ff7b4c', 2.5 + Math.random() * 2.0, 0.95);
      }
      if (pl.x < boat.x - 900) lavaPlumes.splice(lp, 1);
    }

    for (var dg = dandelionGusts.length - 1; dg >= 0; dg--) {
      var gu = dandelionGusts[dg];
      gu.phase += dt * 2.2;
      if (Math.abs(gu.x - boat.x) < 950 && Math.random() < dt * 8) {
        var gSurf = getSurfaceY(gu.x, time);
        emitSpark(gu.x + (Math.random() - 0.5) * 52, gSurf - Math.random() * 50, 18 + Math.random() * 24, -75 - Math.random() * 55, '#fff9e6', 2.4, 1.4);
      }
      if (gu.x < boat.x - 900) dandelionGusts.splice(dg, 1);
    }

    for (var vc = vineCurtains.length - 1; vc >= 0; vc--) {
      var vn = vineCurtains[vc];
      vn.phase += dt * 1.8;
      if (vn.sliceFlash > 0) vn.sliceFlash = Math.max(0, vn.sliceFlash - dt * 2.0);
      if (vn.hurtCooldown > 0) vn.hurtCooldown = Math.max(0, vn.hurtCooldown - dt);
      if (vn.x < boat.x - 900) vineCurtains.splice(vc, 1);
    }

    for (var scIdx = sporeCurrents.length - 1; scIdx >= 0; scIdx--) {
      var spc = sporeCurrents[scIdx];
      spc.phase += dt * 1.6;
      if (spc.x < boat.x - 900) sporeCurrents.splice(scIdx, 1);
    }

    for (var grIdx = grindRails.length - 1; grIdx >= 0; grIdx--) {
      var gr = grindRails[grIdx];
      if (gr.glow > 0) gr.glow = Math.max(0, gr.glow - dt * 2.2);
      if (gr.x1 < boat.x - 950) grindRails.splice(grIdx, 1);
    }

    for (var whIdx = whales.length - 1; whIdx >= 0; whIdx--) {
      var wh = whales[whIdx];
      wh.phase += dt * 1.45;
      wh.x -= 16 * dt;
      if (wh.bounceFlash > 0) wh.bounceFlash = Math.max(0, wh.bounceFlash - dt * 1.8);
      if (wh.x < boat.x - 950) whales.splice(whIdx, 1);
    }

    for (var l = landmarks.length - 1; l >= 0; l--) {
      if (landmarks[l].x < boat.x - 1600) landmarks.splice(l, 1);
    }

    // 水母按自身伞盖收缩脉冲真实推进游动（带微幅摆头与缓沉，彻底告别静止复制粘贴！）
    jellyfish.forEach(function (j) {
      j.phase += dt * j.pulseSpeed;
      var thrust = Math.pow(Math.max(0, Math.sin(j.phase)), 2);
      j.tilt = j.baseTilt + Math.sin(j.phase * 0.42 + j.seed) * 0.24;
      var swimSpd = (14 + j.tier * 6) * thrust;
      j.x += Math.sin(j.tilt) * swimSpd * dt;
      j.depth += (-Math.cos(j.tilt) * swimSpd + 4.8) * dt;
      if (j.depth < 54) j.depth = 54;
      if (j.depth > 255) j.depth = 255;
      var canRecycleJelly = isSingleSeaMode()
        ? true
        : ((gameMode === 'endless')
          ? (ebBoat.weights.moon_sea > 0.05 || ebBoat.omen.tideReturn > 0.1)
          : (boat.x < imp.HIT_X - 400));
      if (!isExploreMode() && j.x < boat.x - 1080 && canRecycleJelly) {
        var nextJx = boat.x + 1050 + Math.random() * 520;
        j.x = (!isSingleSeaMode() && gameMode === 'story') ? Math.min(imp.HIT_X - 260, nextJx) : nextJx;
        j.depth = 68 + Math.random() * 165;
        j.baseTilt = (Math.random() - 0.5) * 0.88;
      }
    });

    for (var isc = iceScratches.length - 1; isc >= 0; isc--) {
      iceScratches[isc].life -= dt;
      if (iceScratches[isc].life <= 0 || iceScratches[isc].x < boat.x - 1000) {
        iceScratches.splice(isc, 1);
      }
    }

    emberMotes.forEach(function (em) {
      em.phase += dt * 1.8; em.oy += em.vy * dt; em.ox += (-38 + Math.sin(em.phase) * 22) * dt;
      if (em.oy < -390) { em.oy = 70; em.ox = Math.random() * 1600 - 800; }
      if (em.ox < -820) em.ox = 820;
    });
    ashSnow.forEach(function (sn) {
      sn.phase += dt * 2.2; sn.oy += sn.vy * dt; sn.ox += (sn.vx + Math.sin(sn.phase) * 18) * dt;
      if (sn.oy > 140) { sn.oy = -390; sn.ox = Math.random() * 1600 - 800; }
      if (sn.ox < -820) sn.ox = 820;
    });
    rainDrops.forEach(function (rd) {
      rd.oy += rd.vy * dt; rd.ox -= 75 * dt;
      if (rd.oy > 140) { rd.oy = -420; rd.ox = Math.random() * 1600 - 800; }
      if (rd.ox < -820) rd.ox = 820;
    });
    forestSpores.forEach(function (fs) {
      fs.phase += dt * 1.5; fs.oy += fs.vy * dt; fs.ox += Math.sin(fs.phase) * 16 * dt;
      if (fs.oy < -390) { fs.oy = 90; fs.ox = Math.random() * 1600 - 800; }
      if (fs.ox < -820) fs.ox = 820;
    });

    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.life -= dt;
      if (pt.life <= 0) { particles.splice(p, 1); continue; }
      if (pt.kind === 'ring') { pt.size += 110 * dt; pt.y += pt.vy * dt; }
      else { pt.vy += pt.gravity * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; }
    }

    for (var pp = popups.length - 1; pp >= 0; pp--) {
      var po = popups[pp];
      po.life -= dt;
      po.y -= 34 * dt;
      if (po.life <= 0) popups.splice(pp, 1);
    }
  }

  return {
    reset: reset,
    update: update,
    getCurrentEra: getCurrentEra,
    getEraBlend: getEraBlend,
    getSurfaceY: getSurfaceY,
    getSurfaceSlope: getSurfaceSlope,
    getRailY: getRailY,
    getRailSlope: getRailSlope,
    getSurfaceRoughnessBump: getSurfaceRoughnessBump,
    emitSplash: emitSplash,
    emitSpark: emitSpark,
    emitRing: emitRing,
    addIceScratch: addIceScratch,
    addPopup: addPopup,
    getMode: function () { return gameMode; },
    isEndlessMode: function () { return gameMode === 'endless'; },
    isFinaleActive: function () { return finaleActive; },
    getFinaleTimer: function () { return finaleTimer; },
    getFinaleX: function () { return window.MT.Config.IMPACT.FINALE_X || 63600; },
    getTime: function () { return time; },
    getWorldClock: getWorldClock,
    setWorldClock: setWorldClock,
    advanceWorldPhase: advanceWorldPhase,
    isExploreMode: isExploreMode,
    getActiveRealm: getActiveRealm,
    setActiveRealm: setActiveRealm,
    getMoonDescent: function () { return moonDescent; },
    isImpactTriggered: function () { return impactTriggered; },
    getImpactFlash: function () { return impactFlash; },
    getImpactAge: function () { return impactAge; },
    getLandmarks: function () { return landmarks; },
    getJellyfish: function () { return jellyfish; },
    getIceScratches: function () { return iceScratches; },
    getStarArcs: function () { return starArcs; },
    getBuoys: function () { return buoys; },
    getLavaPlumes: function () { return lavaPlumes; },
    getDandelionGusts: function () { return dandelionGusts; },
    getVineCurtains: function () { return vineCurtains; },
    getSporeCurrents: function () { return sporeCurrents; },
    getGrindRails: function () { return grindRails; },
    getWhales: function () { return whales; },
    getAshSnow: function () { return ashSnow; },
    getEmberMotes: function () { return emberMotes; },
    getRainDrops: function () { return rainDrops; },
    getForestSpores: function () { return forestSpores; },
    getParticles: function () { return particles; },
    getPopups: function () { return popups; }
  };
})();
