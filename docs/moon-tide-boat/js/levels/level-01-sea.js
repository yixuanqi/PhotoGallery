window.MT = window.MT || {};

// 第 1 关《月潮之海》独立关卡插件（v8 Step 2：潜海破水物理 + 6 种手工结构区块 + 上下双路线 + 3 枚沉海遗物）
(function () {
  var RELIC_DEFS = [
    { id: 'relic_watch',       name: '潮汐铜怀表', hint: '沉海钟楼高空顶拱' },
    { id: 'relic_flute',       name: '海月珊瑚笛', hint: '荧光水母沟最深处' },
    { id: 'relic_lantern',     name: '旧镇琉璃灯', hint: '半沉旧镇高架断桥' },
    { id: 'relic_moon_core',   name: '月核晶簇',   hint: '尘幕灰海热泉烟囱上方' },
    { id: 'relic_abyss_bell',  name: '深渊航海钟', hint: '荧光巨藻峡谷最深处' }
  ];

  var bubbles = [];
  var breachPlumes = [];
  var splinters = [];        // 破水撞碎海面残木浮障迸发的旋转木片与断链
  var shockwaves = [];       // 深潜鱼鳍 Lv.2+ 满蓄破水「炸浪冲击波」
  var sonarWaves = [];       // 潮汐声呐流与主动声呐（Q键）释放的探测波纹
  var sonarTimer = 1.6;
  var activeSonarCd = 0;     // 主动声呐共振冷却计时
  var activeSonarMaxCd = 2.4;
  var harborMoorProg = 0;    // 西端「暮光灯塔港」慢停系缆归港进度 (0..1)
  var harborMoorCd = 0;      // 离港防重复触发冷却
  var eastPortalProg = 0;    // 东端「星潮跨海洋流门」穿越进度 (0..1)
  var eastPortalCd = 0;
  var wonderCheckCd = 1.2;
  var boundHintCd = 0;
  var chunks = [];
  var relics = [];
  var floatingHazards = [];  // 海面漂浮残木/断桅浮障（破水冲天直接撞碎爆爽！）
  var cloudBanks = [];       // 高空月雾云带（无重滑翔 + 金色云间星环！）
  var tidalWalls = [];
  var moonDebris = [];
  var pressurePulseCd = 0;
  var nextEndlessChunkX = 950;
  var nextId = 1;
  var diveHoldTimer = 0;
  var activeDeck = null;
  var whaleChain = 0;
  var whaleChainTimer = 0;
  var lastMode = 'story';
  var startedInSea = true;

  // 四幕天象推进、第 3 幕「落月血潮风暴」与第 4 幕「破晓彼岸」通关状态
  var stageElapsedSec = 0;
  var announcedActNum = 1;
  var act3Triggered = false;
  var nextWallIdx = 0;
  var WALL_TRIGGER_XS = [9320, 10680, 12540, 13680];
  var debrisTimer = 1.2;
  var wallsCleared = 0;
  var debrisDodged = 0;
  var climaxTension = 0;
  var climaxProgress = 0;
  var stageClearing = false;
  var stageClearDelay = 0;
  var stageClearEmitted = false;

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function spawnBubble(x, y, vx, vy, r) {
    if (bubbles.length > 105) bubbles.shift();
    bubbles.push({
      x: x, y: y,
      vx: vx || (Math.random() - 0.5) * 24,
      vy: vy || (-36 - Math.random() * 54),
      r: r || (1.8 + Math.random() * 3.8),
      phase: Math.random() * Math.PI * 2,
      life: 1.4 + Math.random() * 1.1,
      maxLife: 2.5
    });
  }

  function spawnBreachPlume(x, y, charge) {
    breachPlumes.push({ x: x, y: y, charge: charge, life: 0.72, maxLife: 0.72 });
  }

  function spawnWoodSplinters(x, y, baseVx) {
    for (var i = 0; i < 12; i++) {
      if (splinters.length > 90) splinters.shift();
      splinters.push({
        x: x + (Math.random() - 0.5) * 44,
        y: y + (Math.random() - 0.5) * 18,
        vx: (baseVx || 220) * 0.35 + (Math.random() - 0.35) * 260,
        vy: -140 - Math.random() * 240,
        ang: Math.random() * Math.PI * 2,
        vAng: (Math.random() - 0.5) * 12,
        w: 8 + Math.random() * 14,
        h: 3 + Math.random() * 3.5,
        col: i % 4 === 0 ? '#5c4b58' : (i % 2 === 0 ? '#7d563c' : '#a87854'),
        life: 1.0 + Math.random() * 0.45,
        maxLife: 1.45
      });
    }
  }

  function addFloatingHazard(x, kind) {
    floatingHazards.push({
      id: nextId++,
      x: x,
      kind: kind || 'driftwood_mast', // driftwood_mast | anchor_buoy
      halfW: kind === 'anchor_buoy' ? 36 : 48,
      phase: Math.random() * Math.PI * 2,
      smashed: false,
      hitCd: 0
    });
  }

  function addCloudBank(x0, span, y, ringCount) {
    var rings = [];
    var rc = ringCount || 2;
    for (var i = 0; i < rc; i++) {
      var u = rc === 1 ? 0.5 : (0.28 + (i / (rc - 1)) * 0.44);
      rings.push({
        x: x0 + u * span,
        y: y - 10 - Math.sin(u * Math.PI) * 22,
        phase: i * 1.6 + Math.random(),
        passed: false,
        flash: 0
      });
    }
    cloudBanks.push({
      id: nextId++,
      x0: x0,
      x1: x0 + span,
      y: y,
      thickness: 66,
      phase: Math.random() * Math.PI * 2,
      rings: rings,
      entered: false
    });
  }

  function makeDeepPearls(x0, span, depthBase, archAmp, count, val) {
    var arr = [];
    for (var i = 0; i < count; i++) {
      var u = count > 1 ? (i / (count - 1)) : 0.5;
      arr.push({
        x: x0 + u * span,
        depthRel: depthBase + Math.sin(u * Math.PI) * archAmp,
        phase: i * 0.55 + Math.random(),
        collected: false,
        value: val || 2
      });
    }
    return arr;
  }

  function makeAirStars(x0, span, baseY, peakAmp, count, val) {
    var arr = [];
    for (var i = 0; i < count; i++) {
      var u = count > 1 ? (i / (count - 1)) : 0.5;
      arr.push({
        x: x0 + u * span,
        y: baseY - Math.sin(u * Math.PI) * peakAmp,
        phase: i * 0.5 + Math.random(),
        collected: false,
        value: val || 2
      });
    }
    return arr;
  }

  function addRelic(defIdx, x, yMode, yVal) {
    var def = RELIC_DEFS[defIdx];
    if (!def) return;
    relics.push({
      id: def.id,
      name: def.name,
      x: x,
      yMode: yMode, // 'air' | 'depth'
      yVal: yVal,
      phase: defIdx * 2.1,
      pickedThisRun: false
    });
  }

  // === 6 种手工结构区块工厂 ===
  function buildChunk(type, x0, opts) {
    opts = opts || {};
    var id = nextId++;

    // 1. 半沉旧镇高架桥（上下双路线：上层暖石桥面滑行飞跃 vs 下层水下拱洞潜海高速穿行！）
    if (type === 'viaduct') {
      var len = opts.len || 760;
      var deckY0 = -64, deckY1 = -82;
      var arches = 4;
      var archTriggers = [];
      for (var a = 0; a < arches; a++) {
        archTriggers.push({ x: x0 + ((a + 0.5) / arches) * len, passed: false });
      }
      var cV = {
        id: id, type: 'viaduct', x0: x0, x1: x0 + len,
        deck: { x0: x0 + 24, x1: x0 + len - 18, y0: deckY0, y1: deckY1, kind: 'stone_viaduct', launched: false },
        arches: arches,
        archTriggers: archTriggers,
        airStars: makeAirStars(x0 + 60, len - 120, deckY0 - 30, 38, 7, 2),
        deepPearls: makeDeepPearls(x0 + 48, len - 96, 92, 16, 7, 3),
        phase: Math.random() * 6
      };
      if (opts.relicIdx === 2) {
        addRelic(2, x0 + len - 36, 'air', deckY1 - 46);
      }
      return cV;
    }

    // 2. 深海荧光水母沟（深潜穿越巨型呼吸发光水母群，触碰柔伞弹跳提速并充浮力！）
    if (type === 'jelly_trench') {
      var jLen = opts.len || 680;
      var jellies = [];
      var jCount = opts.deep ? 4 : 3;
      for (var ji = 0; ji < jCount; ji++) {
        var ju = (ji + 0.5) / jCount;
        jellies.push({
          x: x0 + 60 + ju * (jLen - 120),
          depthRel: (opts.deep ? 94 : 78) + (ji % 2) * 32,
          radius: 26 + (ji % 2) * 7,
          phase: ji * 1.45,
          bounceCd: 0,
          flash: 0,
          hue: ji % 2 === 0 ? 'rgba(136, 236, 255,' : 'rgba(202, 182, 255,'
        });
      }
      var cJ = {
        id: id, type: 'jelly_trench', x0: x0, x1: x0 + jLen,
        jellies: jellies,
        deepPearls: makeDeepPearls(x0 + 36, jLen - 72, opts.deep ? 108 : 88, 28, 8, 3),
        phase: Math.random() * 6
      };
      if (opts.relicIdx === 1) {
        addRelic(1, x0 + jLen * 0.52, 'depth', 124);
      }
      return cJ;
    }

    // 3. 暗礁加速涌流（海面尖礁阻路 -> 潜海钻入下方青金加速洋流喷射穿出，或高空破水越过！）
    if (type === 'reef_stream') {
      var rLen = opts.len || 640;
      var spires = [
        { x: x0 + rLen * 0.30, w: 34, h: 66, hitCd: 0 },
        { x: x0 + rLen * 0.68, w: 38, h: 76, hitCd: 0 }
      ];
      return {
        id: id, type: 'reef_stream', x0: x0, x1: x0 + rLen,
        spires: spires,
        streamDepth: 102,
        streamRadius: 42,
        boostedMsg: false,
        airStars: makeAirStars(x0 + 80, rLen - 160, -135, 65, 5, 2),
        deepPearls: makeDeepPearls(x0 + 44, rLen - 88, 102, 12, 7, 3),
        phase: Math.random() * 6
      };
    }

    // 4. 沉海钟楼遗物台（倾斜古石钟楼，铜钟精准悬挂于钟室拱顶木梁正中！）
    if (type === 'bell_tower') {
      var bLen = 460;
      var tx = x0 + bLen * 0.52;
      // 钟楼绕 (tx, 18) 倾角 -0.042 rad -> 拱腔中心 local (0, -148) 精确世界坐标为 (tx - 6.2, -130)
      var cB = {
        id: id, type: 'bell_tower', x0: x0, x1: x0 + bLen,
        towerX: tx,
        bellX: tx - 6.2,
        bellY: -130,
        bellRung: false,
        bellSwing: 0,
        ringWave: 0,
        airStars: makeAirStars(tx - 150, 300, -135, 78, 6, 2),
        deepPearls: makeDeepPearls(x0 + 40, bLen - 80, 90, 20, 5, 2),
        phase: Math.random() * 6
      };
      if (opts.relicIdx === 0) {
        addRelic(0, tx - 10, 'air', -228);
      }
      return cB;
    }

    // 5. 海岸弧石灯塔码头（重绘为曲线风化石砌潮汐拱码头 + 弯钩暖灯 + 旋转灯塔，告别木架子！）
    if (type === 'lighthouse_pier') {
      var lLen = 580;
      var deckX0 = x0 + 22, deckX1 = x0 + 356;
      return {
        id: id, type: 'lighthouse_pier', x0: x0, x1: x0 + lLen,
        towerX: x0 + 445,
        deck: { x0: deckX0, x1: deckX1, y0: -22, cy: -38, y1: -96, kind: 'stone_wharf', launched: false },
        airStars: makeAirStars(deckX1 - 12, 280, -138, 102, 6, 2),
        deepPearls: makeDeepPearls(x0 + 54, 310, 88, 16, 5, 2),
        phase: Math.random() * 6
      };
    }

    // 6. 月下蓝鲸群（3 头错落蓝鲸编队，连续借力踩背空翻实现“鲸群连跃”！）
    var wLen = 780;
    var pod = [
      { x: x0 + 130, rx: 74, scale: 1.00, phase: 0.2, bounced: false, flash: 0 },
      { x: x0 + 390, rx: 56, scale: 0.78, phase: 2.1, bounced: false, flash: 0 },
      { x: x0 + 645, rx: 82, scale: 1.12, phase: 4.0, bounced: false, flash: 0 }
    ];
    return {
      id: id, type: 'whale_pod', x0: x0, x1: x0 + wLen,
      pod: pod,
      airStars: makeAirStars(x0 + 140, 500, -168, 96, 7, 2),
      deepPearls: makeDeepPearls(x0 + 80, 560, 96, 18, 5, 2),
      phase: Math.random() * 6
    };
  }

  // v11 开放海域自由探索布局（0..10,000，可随时往返游弋、随世界时钟见证同一片海域的沧海桑田！）
  function buildExploreLayout() {
    chunks = [];
    relics = [];
    floatingHazards = [];
    cloudBanks = [];

    // 西端大本营「暮光灯塔港」-> 浅海荧光水母沟 -> 沉海钟楼（遗物 I）-> 半沉旧镇高架桥（遗物 III）
    // -> 暗礁海蚀柱与深海秘沟（遗物 II）-> 月下蓝鲸群 -> 东端深渊海角
    chunks.push(buildChunk('lighthouse_pier', 360));
    chunks.push(buildChunk('jelly_trench',    1580, { len: 680, deep: false }));
    chunks.push(buildChunk('bell_tower',      2860, { relicIdx: 0 }));
    chunks.push(buildChunk('viaduct',         4260, { len: 820, relicIdx: 2 }));
    chunks.push(buildChunk('jelly_trench',    5620, { len: 740, deep: true, relicIdx: 1 }));
    chunks.push(buildChunk('reef_stream',     6840, { len: 680 }));
    chunks.push(buildChunk('whale_pod',       8120));

    // 点缀海面的飘摇残木与旧锚浮筒（自由冲刺或破水即可撞碎！）
    addFloatingHazard(1340, 'driftwood_mast');
    addFloatingHazard(2480, 'anchor_buoy');
    addFloatingHazard(3860, 'driftwood_mast');
    addFloatingHazard(5360, 'anchor_buoy');
    addFloatingHazard(6480, 'driftwood_mast');
    addFloatingHazard(7780, 'anchor_buoy');

    // 高空月雾云带与云间星环
    addCloudBank(1020, 560, -245, 2);
    addCloudBank(3040, 620, -278, 2);
    addCloudBank(4980, 660, -266, 2);
    addCloudBank(8240, 720, -282, 2);

    // 2 枚深海专属遗物（热泉烟囱上方 & 荧光巨藻林最深处）
    addRelic(3, 4920, 'depth', 188);
    addRelic(4, 7580, 'depth', 258);
  }

  function buildStoryLayout() {
    if (window.MT.Config && window.MT.Config.EXPLORE_MODE) {
      buildExploreLayout();
      return;
    }
    chunks = [];
    relics = [];
    floatingHazards = [];
    cloudBanks = [];

    chunks.push(buildChunk('lighthouse_pier', 780));
    chunks.push(buildChunk('jelly_trench',    1720, { len: 640, deep: false }));
    chunks.push(buildChunk('bell_tower',      2760, { relicIdx: 0 }));
    chunks.push(buildChunk('viaduct',         4420, { len: 760 }));
    chunks.push(buildChunk('jelly_trench',    5640, { len: 720, deep: true, relicIdx: 1 }));
    chunks.push(buildChunk('reef_stream',     6860, { len: 680 }));
    chunks.push(buildChunk('whale_pod',       7960));
    chunks.push(buildChunk('viaduct',         11560, { len: 720, relicIdx: 2 }));
    chunks.push(buildChunk('whale_pod',       24460));

    addFloatingHazard(1540,  'driftwood_mast');
    addFloatingHazard(2460,  'anchor_buoy');
    addFloatingHazard(3920,  'driftwood_mast');
    addFloatingHazard(5360,  'anchor_buoy');
    addFloatingHazard(6480,  'driftwood_mast');
    addFloatingHazard(9020,  'anchor_buoy');
    addFloatingHazard(11180, 'driftwood_mast');
    addFloatingHazard(13220, 'anchor_buoy');

    addCloudBank(1180,  560, -250, 2);
    addCloudBank(2860,  620, -285, 2);
    addCloudBank(5180,  640, -268, 2);
    addCloudBank(8380,  720, -295, 2);
    addCloudBank(12240, 680, -288, 2);
    addCloudBank(24720, 740, -258, 2);

    addRelic(3, 20160, 'depth', 168);
    addRelic(4, 21740, 'depth', 252);
  }

  function spawnEndlessSeaChunk(anchorX) {
    var types = ['viaduct', 'jelly_trench', 'reef_stream', 'bell_tower', 'lighthouse_pier', 'whale_pod'];
    var pick = types[Math.floor(Math.random() * types.length)];
    var ch = buildChunk(pick, anchorX, { deep: Math.random() < 0.5 });
    chunks.push(ch);
    if (Math.random() < 0.65) {
      addFloatingHazard(ch.x1 + 170 + Math.random() * 90, Math.random() < 0.5 ? 'driftwood_mast' : 'anchor_buoy');
    }
    if (Math.random() < 0.55) {
      addCloudBank(ch.x0 + 180, 580 + Math.random() * 140, -255 - Math.random() * 45, 2);
    }
    return (ch.x1 - ch.x0) + 460 + Math.random() * 240;
  }

  function reset(startX, mode) {
    lastMode = mode || 'story';
    var sx = typeof startX === 'number' ? startX : 120;
    var hitX = (window.MT.Config && window.MT.Config.IMPACT.HIT_X) || 13600;
    startedInSea = (lastMode === 'story') && (sx < hitX - 600);

    bubbles = [];
    breachPlumes = [];
    splinters = [];
    shockwaves = [];
    sonarWaves = [];
    sonarTimer = 1.4;
    activeSonarCd = 0;
    harborMoorProg = 0;
    harborMoorCd = 2.6;
    eastPortalProg = 0;
    eastPortalCd = 2.6;
    wonderCheckCd = 1.2;
    boundHintCd = 0;
    chunks = [];
    relics = [];
    floatingHazards = [];
    cloudBanks = [];
    tidalWalls = [];
    moonDebris = [];
    pressurePulseCd = 0;
    diveHoldTimer = 0;
    activeDeck = null;
    whaleChain = 0;
    whaleChainTimer = 0;

    stageElapsedSec = 0;
    announcedActNum = 1;
    act3Triggered = false;
    nextWallIdx = 0;
    debrisTimer = 1.1;
    wallsCleared = 0;
    debrisDodged = 0;
    climaxTension = 0;
    climaxProgress = 0;
    stageClearing = false;
    stageClearDelay = 0;
    stageClearEmitted = false;

    if (window.MT.Audio && window.MT.Audio.setClimaxTension) {
      window.MT.Audio.setClimaxTension(0);
    }

    if (window.MT.Abyss && window.MT.Abyss.reset) {
      window.MT.Abyss.reset(sx, lastMode);
    }

    if (lastMode === 'story') {
      buildStoryLayout();
    } else {
      nextEndlessChunkX = Math.max(680, sx + 520);
    }
  }

  function onExit(boat) {
    activeDeck = null;
    if (boat) {
      boat.ridingDeck = false;
      if (boat.isDiving) {
        boat.isDiving = false;
        boat.diveCharge = 0;
        boat.submergeDepth = 0;
      }
    }
    climaxTension = 0;
    climaxProgress = 0;
    if (window.MT.Audio && window.MT.Audio.setUnderwater) {
      window.MT.Audio.setUnderwater(0);
    }
    if (window.MT.Audio && window.MT.Audio.setClimaxTension) {
      window.MT.Audio.setClimaxTension(0);
    }
  }

  function isClearing() {
    return stageClearing;
  }

  function finishClearing(boat) {
    stageClearing = false;
    climaxTension = 0;
    climaxProgress = 0;
    if (boat && boat.isDiving) {
      boat.isDiving = false;
      boat.diveCharge = 0;
      boat.submergeDepth = 0;
    }
    if (window.MT.Audio && window.MT.Audio.setClimaxTension) {
      window.MT.Audio.setClimaxTension(0);
    }
    if (window.MT.Audio && window.MT.Audio.setUnderwater) {
      window.MT.Audio.setUnderwater(0);
    }
  }

  function getClimaxState() {
    var sv = window.MT.Config.SEA_VOYAGE || {};
    var inAct3 = act3Triggered && !stageClearing && startedInSea && announcedActNum < 4;
    return {
      active: inAct3,
      tension: inAct3 ? climaxTension : 0,
      progress: climaxProgress
    };
  }

  // 真实物理变形巨浪（直接抬升主海面曲线 getSurfaceY，船可真正爬坡冲顶飞射或潜穿浪腹漩涡！）
  function getSurfaceOffset(worldX, t) {
    if (tidalWalls.length === 0) return 0;
    var off = 0;
    for (var i = 0; i < tidalWalls.length; i++) {
      var wl = tidalWalls[i];
      var dx = worldX - wl.x;
      if (dx < -460 || dx > 680) continue;
      // 非对称孤独巨浪：迎面陡峭爬坡面 (sigma=115)，背面长阔舒展落坡 (sigma=210)，C1 连续零折角！
      var sigma = dx < 0 ? 115 : 210;
      var env = Math.exp(-(dx * dx) / (2 * sigma * sigma));
      off -= wl.height * env;
    }
    return off;
  }

  function spawnTidalWall(boatX, idx) {
    var h = 128 + (idx % 2) * 16 + idx * 4;
    tidalWalls.push({
      id: nextId++,
      x: boatX + 860,
      height: h,
      width: 120,
      speed: -72 - idx * 7,
      state: 'active',
      lipHit: false,
      phase: Math.random() * 6
    });
    if (window.MT.Audio && window.MT.Audio.playTidalRoar) {
      window.MT.Audio.playTidalRoar();
    }
    if (window.MT.RenderWorld && window.MT.RenderWorld.addShake) {
      window.MT.RenderWorld.addShake(4.2);
    }
  }

  function spawnMoonDebris(boatX) {
    var tx = boatX + 440 + Math.random() * 260;
    var sv = window.MT.Config && window.MT.Config.SEA_VOYAGE;
    var stormEnd = (sv && sv.ACT4_X) || 14800;
    if (tx > stormEnd - 300) return;
    // 避开第 3 幕中段高架断桥（11500..12340），确保走桥面与走水下都绝对公平！
    if (tx > 11500 && tx < 12340) return;
    moonDebris.push({
      id: nextId++,
      targetX: tx,
      startX: tx + 240,
      startY: -470,
      telegraph: 1.12,
      maxTelegraph: 1.12,
      fallProg: 0,
      state: 'telegraph', // telegraph -> falling -> splashed
      splashLife: 0,
      radius: 13 + Math.random() * 7
    });
  }

  function getRelicStatus() {
    var collected = window.MT.Shop && window.MT.Shop.getRelicCount ? window.MT.Shop.getRelicCount('moon_sea') : 0;
    return { collected: collected, total: RELIC_DEFS.length };
  }

  function getDeckY(deck, x) {
    var u = clamp((x - deck.x0) / Math.max(1, deck.x1 - deck.x0), 0, 1);
    if (typeof deck.cy === 'number') {
      var inv = 1 - u;
      return inv * inv * deck.y0 + 2 * inv * u * deck.cy + u * u * deck.y1;
    }
    return deck.y0 + (deck.y1 - deck.y0) * u;
  }

  function getDeckSlope(deck, x) {
    var span = Math.max(1, deck.x1 - deck.x0);
    if (typeof deck.cy === 'number') {
      var u = clamp(((typeof x === 'number' ? x : deck.x0) - deck.x0) / span, 0, 1);
      return (2 * (1 - u) * (deck.cy - deck.y0) + 2 * u * (deck.y1 - deck.cy)) / span;
    }
    return (deck.y1 - deck.y0) / span;
  }

  // === Step 1 保留：空中按住 D 俯冲潜海 ===
  function handleLanding(ctxObj) {
    var boat = ctxObj.boat;
    var input = ctxObj.input;
    var eb = ctxObj.eb;
    var eras = ctxObj.eras;
    var cfg = ctxObj.cfg;
    var eco = ctxObj.eco;
    var st = ctxObj.st;
    var waveY = ctxObj.waveY;
    var slopeAngle = ctxObj.slopeAngle;

    if (!eb || eb.weights.moon_sea < 0.55 || (eras.isFinaleActive && eras.isFinaleActive())) return false;
    if (!input.right || boat.ridingDeck) return false;

    var relDown = ctxObj.normalizeAngle(boat.angle - slopeAngle);
    if (relDown < -0.35 || relDown > 1.25) return false;

    var flips = boat.flipsInJump || 0;
    if (flips > 0) {
      var flipBonus = Math.round(eco.FLIP_STAR_BONUS * flips * Math.max(1, boat.trickCombo + 1) * st.starMult);
      boat.runTricks += flips;
      boat.runFlips += flips;
      boat.runStars += flipBonus;
      boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + cfg.FLIP_FUEL_REWARD * flips);
      ctxObj.addComboAndCheckFever(flips, 6.8);
      eras.addPopup(boat.x, waveY - 52, (flips > 1 ? (flips + '连空翻入海!') : '空翻潜海!') + ' +' + flipBonus + '✦', '#a8f0ff');
    } else if (boat.airTime > 0.35) {
      eras.addPopup(boat.x, waveY - 40, '俯冲潜海!', '#a8f0ff');
    }

    boat.isDiving = true;
    boat.hasDived = true;
    boat.inWater = true;
    boat.diveCharge = Math.min(1.0, Math.max(boat.diveCharge, 0.34 + Math.min(0.24, boat.airTime * 0.25)));
    boat.vx = Math.min(st.maxSpeed + 95, Math.max(boat.vx + 48, 255));
    boat.vy = Math.max(135, Math.min(260, Math.abs(boat.vy) * 0.65 + 115));
    boat.y = Math.max(boat.y, waveY + 14);
    boat.angle = 0.44;
    boat.angularVel = 0;
    boat.airTime = 0;
    boat.airSpin = 0;
    boat.flipsInJump = 0;
    boat.trickAura = Math.max(boat.trickAura, 0.65);

    if (window.MT.Audio && window.MT.Audio.playDiveIn) window.MT.Audio.playDiveIn(0.95);
    eras.emitSplash(boat.x, waveY, 18, '#c6ecff', 42);
    eras.emitRing(boat.x, waveY + 6, '#9ce8ff');
    for (var i = 0; i < 12; i++) {
      spawnBubble(boat.x + (Math.random() - 0.5) * 32, waveY + 10 + Math.random() * 24, -boat.vx * 0.14 + (Math.random() - 0.5) * 40, -25 - Math.random() * 45, 2.2 + Math.random() * 3.6);
    }
    return true;
  }

  // === v11 开放海域全向自由探索物理（WASD / 方向键 / 触屏单指摇杆 + 空格冲刺，零强制右移！）===
  function handleFreeExplorePhysics(ctxObj) {
    var dt = ctxObj.dt;
    var boat = ctxObj.boat;
    var input = ctxObj.input;
    var eras = ctxObj.eras;
    var cfg = ctxObj.cfg;
    var st = ctxObj.st;
    var waveY = ctxObj.waveY;
    var slopeAngle = ctxObj.slopeAngle;
    var abyss = window.MT.Abyss;

    // 合成连续移动矢量（兼容键盘 WASD / 方向键 与 移动端单指浮标摇杆 joyX/joyY）
    var ix = (typeof input.joyX === 'number' && Math.abs(input.joyX) > 0.06)
      ? input.joyX
      : ((input.right ? 1 : 0) - (input.left ? 1 : 0));
    var iy = (typeof input.joyY === 'number' && Math.abs(input.joyY) > 0.06)
      ? input.joyY
      : ((input.down ? 1 : 0) - (input.up ? 1 : 0));
    var mag = Math.hypot(ix, iy);
    if (mag > 1) { ix /= mag; iy /= mag; }

    // 自由左右掉头朝向（平滑翻转向不突兀）
    if (ix > 0.14) boat.facing = 1;
    else if (ix < -0.14) boat.facing = -1;
    var fTarget = boat.facing || 1;
    boat.facingSmooth = (typeof boat.facingSmooth === 'number' ? boat.facingSmooth : 1);
    boat.facingSmooth += (fTarget - boat.facingSmooth) * Math.min(1, dt * 10);

    var boil = abyss ? abyss.getBoilMix(boat.x) : 0;
    var ash = abyss ? abyss.getAshMix(boat.x) : 0;
    var hostileRoof = (boil > 0.25 || ash > 0.28);
    var roofY = waveY + 26;
    var bedY = abyss ? abyss.getSeabedY(boat.x) : 410;

    if (boat.abyssDashCd > 0) boat.abyssDashCd = Math.max(0, boat.abyssDashCd - dt);
    if (boat.abyssDashTimer > 0) boat.abyssDashTimer = Math.max(0, boat.abyssDashTimer - dt);
    var rawBoostEdge = !!input.boost && !boat.wasAbyssBoost;
    boat.wasAbyssBoost = !!input.boost;

    var submerged = boat.isDiving || boat.y > waveY + 14;
    if (hostileRoof && boat.y < roofY + 10) {
      submerged = true;
      boat.isDiving = true;
    }

    // 状态 A：全向丝滑深海潜航（可自由停悬、360° 巡游、随时探底或上浮破水！）
    if (submerged) {
      boat.isDiving = true;
      boat.inAbyss = true;
      boat.inWater = true;
      boat.ridingDeck = false;
      boat.cloudGliding = false;
      boat.submergeDepth = Math.max(0, boat.y - waveY);

      var mantaLv = st.skySailLv || 0;
      var finLv = st.deepFinsLv || 0;
      // 深度水压压差区（depth > 225px）：未升级深潜鱼鳍时略感深海沉重水压，Lv.2+ 完全适应，Lv.3 甚至获深渊提速！
      var trenchDepth = clamp((boat.submergeDepth - 225) / 135, 0, 1);
      var rawPress = trenchDepth * (finLv >= 2 ? 0 : (finLv === 1 ? 0.48 : 1.0));
      boat.deepPressure = rawPress;
      var pressSpdMult = finLv >= 3 ? (1 + trenchDepth * 0.10) : (1 - rawPress * 0.16);
      var maxSubSpd = (275 + (st.rocketLv || 0) * 24 + finLv * 22 + mantaLv * 18) * pressSpdMult;
      var boostActive = !!(input.boost && boat.fuel > 0.015);
      boat.boosting = boostActive;

      // 轻点空格触发水下鱼鳍爆发冲刺（震碎月陨、月核矿柱、震退深渊提灯鱼！）
      if (rawBoostEdge && boat.abyssDashCd <= 0) {
        boat.abyssDashCd = Math.max(0.60, 1.15 - finLv * 0.16);
        boat.abyssDashTimer = 0.36;
        boat.breachSmashTimer = Math.max(boat.breachSmashTimer || 0, 0.48 + finLv * 0.12);
        var dxD = Math.abs(ix) > 0.08 || Math.abs(iy) > 0.08 ? ix : fTarget;
        var dyD = Math.abs(ix) > 0.08 || Math.abs(iy) > 0.08 ? iy : 0;
        var dLen = Math.hypot(dxD, dyD) || 1;
        var dashSpd = 460 + (st.rocketLv || 0) * 28 + finLv * 34;
        boat.vx = (dxD / dLen) * dashSpd;
        boat.vy = (dyD / dLen) * dashSpd * 0.88;
        boat.trickAura = Math.max(boat.trickAura, 0.78);
        if (abyss && abyss.addDashBurst) abyss.addDashBurst(boat.x, boat.y);
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

      // 柔和局部俯仰角（始终贴合游动矢量，左右掉头绝不倒立！）
      var pitchTarget = clamp(boat.vy / 290, -0.62, 0.62);
      boat.localPitch = (boat.localPitch || 0) + (pitchTarget - (boat.localPitch || 0)) * Math.min(1, dt * 8.5);
      boat.angle = boat.localPitch;

      // 晶莹水下尾泡
      var spdNow = Math.hypot(boat.vx, boat.vy);
      if (spdNow > 55 && Math.random() < dt * (10 + spdNow * 0.05)) {
        spawnBubble(boat.x - fTarget * 20, boat.y + (Math.random() - 0.5) * 10, -boat.vx * 0.12, -38 - Math.random() * 44, 1.8 + Math.random() * 2.4);
      }

      // 顶面边界处理：灾变沸海/灰海阻止上浮并提示回深海气室；清澈期按 W 随时破水而出或柔和浮回海面！
      if (hostileRoof) {
        if (boat.y < roofY + 42) {
          var prox = clamp(1 - (boat.y - roofY) / 42, 0, 1);
          if (boil > 0.25) {
            boat.heatStress = Math.min(1, Math.max(boat.heatStress || 0, prox * boil));
            boat.vy += (220 + prox * 380) * dt;
            if (boat.y < roofY + 12 && boat.feverTimer <= 0) {
              boat.hull = Math.max(0, boat.hull - 11 * boil * (1 - finLv * 0.15) * dt);
              if (Math.random() < dt * 14) eras.emitSpark(boat.x, roofY, 0, 35, '#ffaa66', 2.4, 0.42);
            }
          } else {
            boat.vy += (150 + prox * 280) * dt;
          }
          if (boat.y < roofY + 4) { boat.y = roofY + 4; if (boat.vy < 0) boat.vy = 20; }
        } else {
          boat.heatStress = Math.max(0, (boat.heatStress || 0) - dt * 2.4);
        }
      } else {
        boat.heatStress = Math.max(0, (boat.heatStress || 0) - dt * 2.4);
        // 浅水贴近海面且玩家不再向下压潜时，轻柔自然上浮变回木舟，避免小潜艇尴尬浮在海面上！
        if (boat.y < waveY + 24 && iy <= 0.12 && boat.vy <= 18) {
          boat.vy -= 95 * dt;
        }
        if (boat.y <= waveY + 12 && (boat.vy < -12 || iy < -0.18)) {
          boat.isDiving = false;
          boat.inAbyss = false;
          boat.submergeDepth = Math.max(0, boat.y - waveY);
          if (boat.vy < -185 || boat.abyssDashTimer > 0) {
            // 高速破水冲天！
            boat.inWater = false;
            boat.y = waveY - 10;
            boat.vy = Math.min(boat.vy * 1.16, -315 - finLv * 28);
            boat.breachSmashTimer = 0.58 + finLv * 0.12;
            spawnBreachPlume(boat.x, waveY, 0.78);
            eras.emitSplash(boat.x, waveY, 22, '#e8f8ff', 84);
            eras.emitRing(boat.x, waveY, '#b8f0ff');
            if (window.MT.Audio && window.MT.Audio.playBreach) window.MT.Audio.playBreach(0.78);
          } else {
            // 丝滑浮回海面（保留自然位置与速度惯性，绝不瞬移！）
            boat.inWater = true;
            boat.vy *= 0.35;
            if (window.MT.Audio) window.MT.Audio.playSplash(0.40);
            eras.emitSplash(boat.x, waveY, 10, '#dff4ff', 28);
          }
        }
      }

      // 优先委派给封闭海底洞窟碰撞（入口竖井打开通往深窟，东端单向暗流喷射回海，其余区间正常贴合海床！）
      var caveHandled = (window.MT.Caves && window.MT.Caves.handlePhysics)
        ? window.MT.Caves.handlePhysics(dt, boat, eras, st)
        : false;
      if (!caveHandled) {
        var floorLimit = bedY - 20;
        if (boat.y >= floorLimit) {
          boat.y = floorLimit;
          if (boat.vy > 0) boat.vy *= 0.2;
          boat.vx *= Math.pow(0.84, dt);
          if (Math.abs(boat.vx) > 45 && Math.random() < dt * 10 && abyss && abyss.emitSilt) {
            abyss.emitSilt(boat.x - fTarget * 18, bedY - 4, 2, -boat.vx * 0.24, ash > 0.35 ? '118, 114, 108' : '116, 98, 92');
          }
        }
      }

      // 舒缓的深海气息博弈（在气室内自动满气，室外深潜缓慢消耗）
      var inPocket = abyss && abyss.isInsideAirPocket && abyss.isInsideAirPocket(boat.x, boat.y);
      if (!inPocket) {
        var dFrac = clamp((boat.y - 90) / 280, 0, 1);
        var mantaSave = mantaLv >= 1 ? (1 - mantaLv * 0.10) : 1.0;
        var pressDrain = 1 + (boat.deepPressure || 0) * 0.38;
        var drain = (0.058 + dFrac * 0.032) * pressDrain * (st.breathDrainMult || 1.0) * mantaSave;
        boat.breath = Math.max(0, (typeof boat.breath === 'number' ? boat.breath : 1.0) - drain * dt);
        if (boat.breath < 0.28 && boat.breath > 0) {
          boat.breathLowPulse = 1.0;
          pressurePulseCd -= dt;
          if (pressurePulseCd <= 0) {
            pressurePulseCd = 0.65;
            if (window.MT.Audio && window.MT.Audio.playPressurePulse) window.MT.Audio.playPressurePulse();
          }
        }
        if (boat.breath <= 0.001) {
          boat.hull = Math.max(0, boat.hull - 7.5 * dt);
          boat.hurtFlash = Math.max(boat.hurtFlash, 0.32);
        }
      }
      return true;
    }

    // 状态 B：海面自由航行 / 静泊随波起伏 / 随时按 S 下潜 / 腾空滑翔！
    boat.inAbyss = false;
    boat.inCave = false;
    boat.activeCaveName = '';
    boat.deepPressure = 0;
    boat.submergeDepth = Math.max(0, boat.y - waveY);
    boat.inWater = boat.y >= waveY - 12;

    if (boat.inWater) {
      boat.cloudGliding = false;
      boat.breath = Math.min(1.0, (boat.breath || 0) + 0.95 * dt);

      // 随时按 S（或摇杆向下）自然压头下沉，丝滑潜入水下完成变形（绝不瞬移！）
      if (iy > 0.28) {
        if (window.MT.Shop && window.MT.Shop.markTutorialDone) window.MT.Shop.markTutorialDone('dive');
        boat.isDiving = true;
        boat.inAbyss = true;
        boat.vy = Math.max(boat.vy + 180 * dt, 128);
        boat.localPitch = (boat.localPitch || 0) + (0.32 - (boat.localPitch || 0)) * Math.min(1, dt * 8);
        if (window.MT.Audio && window.MT.Audio.playDiveIn) window.MT.Audio.playDiveIn(0.62);
        eras.emitSplash(boat.x, waveY, 12, '#d2f0ff', 30);
        return true;
      }

      var boostSurf = !!(input.boost && boat.fuel > 0.015);
      boat.boosting = boostSurf;
      var maxSurfSpd = (boostSurf ? 385 : 255) + (st.rocketLv || 0) * 28;
      if (boostSurf) {
        boat.fuel = Math.max(0, boat.fuel - cfg.FUEL_BURN_RATE * 0.45 * st.burnRateMult * dt);
      } else {
        boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.38 * dt);
      }

      var targetSurfVx = ix * maxSurfSpd;
      var surfDrag = Math.abs(ix) > 0.05 ? 4.4 : 2.5;
      boat.vx += (targetSurfVx - boat.vx) * Math.min(1, dt * surfDrag);

      // 按 W 或空格点火可轻盈跃离浪峰飞向高空云带！
      if ((iy < -0.55 || rawBoostEdge) && (Math.abs(boat.vx) > 130 || boostSurf)) {
        boat.inWater = false;
        boat.vy = -(285 + (boostSurf ? 65 : 0) + (st.rocketLv || 0) * 18);
        boat.y = waveY - 13;
        eras.emitSplash(boat.x, waveY, 12, '#e8f8ff', 42);
        if (window.MT.Audio) window.MT.Audio.playSplash(0.55);
      } else {
        // 温柔真实浮力贴合海浪起伏，松开按键即原地随波静静漂浮！
        var sub = boat.y - waveY;
        var buoy = -sub * 26 - boat.vy * 6.5;
        boat.vy += buoy * dt;
        var localWaveSlope = slopeAngle * fTarget;
        boat.localPitch = (boat.localPitch || 0) + (clamp(localWaveSlope, -0.45, 0.45) - (boat.localPitch || 0)) * Math.min(1, dt * 8.0);
        boat.angle = boat.localPitch;
      }
    } else {
      // 空中自由御风滑翔（支持左右微调 + 随时落海无缝入水，绝不翻船磕碰扣血！）
      var boostAir = !!(input.boost && boat.fuel > 0.015);
      boat.boosting = boostAir;
      if (boostAir) {
        boat.fuel = Math.max(0, boat.fuel - cfg.FUEL_BURN_RATE * 0.55 * st.burnRateMult * dt);
        boat.vx += ix * 360 * dt;
        boat.vy -= 420 * dt;
      } else {
        boat.vx += ix * 170 * dt;
      }
      var effG = boat.cloudGliding ? (cfg.GRAVITY * 0.28) : (st.skySailLv >= 1 && boat.vy > -20 ? cfg.GRAVITY * (1 - (st.sailGlideFrac || 0) * 0.72) : cfg.GRAVITY * 0.85);
      boat.vy += effG * dt;
      boat.vx *= Math.pow(0.92, dt);
      if (boat.y < cfg.SOFT_CEILING) boat.vy += (cfg.SOFT_CEILING - boat.y) * 4.5 * dt;

      var airPitch = clamp(boat.vy / 460, -0.55, 0.55);
      boat.localPitch = (boat.localPitch || 0) + (airPitch - (boat.localPitch || 0)) * Math.min(1, dt * 7);
      boat.angle = boat.localPitch;

      // 落水衔接：按住 S 直接丝滑潜入海底，否则轻盈落回海面！
      if (boat.y >= waveY - 2 && boat.vy > 0) {
        if (iy > 0.25) {
          boat.isDiving = true;
          boat.inAbyss = true;
          boat.inWater = true;
          if (window.MT.Audio && window.MT.Audio.playDiveIn) window.MT.Audio.playDiveIn(0.82);
        } else {
          boat.inWater = true;
          boat.y = waveY;
          boat.vy *= 0.22;
          if (window.MT.Audio) window.MT.Audio.playSplash(0.62);
        }
        eras.emitSplash(boat.x, waveY, 14, '#dff4ff', 42);
      }
    }
    return true;
  }

  // === Step 1 保留：潜海破水物理 ===
  function handleSurfacePhysics(ctxObj) {
    if (window.MT.Config && window.MT.Config.EXPLORE_MODE) {
      return handleFreeExplorePhysics(ctxObj);
    }
    var dt = ctxObj.dt;
    var boat = ctxObj.boat;
    var input = ctxObj.input;
    var eb = ctxObj.eb;
    var eras = ctxObj.eras;
    var cfg = ctxObj.cfg;
    var st = ctxObj.st;
    var waveY = ctxObj.waveY;
    var slope = ctxObj.slope;
    var slopeAngle = ctxObj.slopeAngle;
    var wantBoost = ctxObj.wantBoost;
    var reverseThrusting = ctxObj.reverseThrusting;

    if (boat.inAbyss && window.MT.Abyss && window.MT.Abyss.handlePhysics) {
      return window.MT.Abyss.handlePhysics(ctxObj);
    }
    if (boat.ridingDeck) return true;
    if (!eb || eb.weights.moon_sea < 0.52 || (eras.isFinaleActive && eras.isFinaleActive())) {
      if (boat.isDiving) {
        boat.isDiving = false;
        boat.diveCharge = 0;
        boat.submergeDepth = 0;
      }
      return false;
    }

    if (!boat.isDiving) {
      if (boat.inWater && input.right && !wantBoost) {
        diveHoldTimer += dt;
        boat.carving = true;
        boat.hasCarved = true;
        boat.vx += (cfg.CARVE_DOWN_ACCEL * 0.85 + Math.max(0, slope) * 280) * dt;
        boat.vy += 460 * dt;
        var diveTargetA = clamp(slopeAngle + 0.42, 0.24, 0.64);
        boat.angle += ctxObj.normalizeAngle(diveTargetA - boat.angle) * Math.min(1, dt * 11);
        boat.angularVel = 0;

        if (Math.random() < dt * 18) {
          spawnBubble(boat.x + 12, waveY + 4, -boat.vx * 0.2, -30 - Math.random() * 30, 2.0 + Math.random() * 2.5);
        }

        if (boat.y >= waveY + 12 || diveHoldTimer >= 0.11) {
          boat.isDiving = true;
          boat.hasDived = true;
          boat.diveCharge = Math.max(boat.diveCharge, 0.16);
          boat.y = Math.max(boat.y, waveY + 15);
          boat.vy = Math.max(boat.vy, 152);
          if (window.MT.Audio && window.MT.Audio.playDiveIn) window.MT.Audio.playDiveIn(0.75);
          eras.emitSplash(boat.x + 10, waveY, 12, '#cbeeff', 26);
          for (var b = 0; b < 8; b++) {
            spawnBubble(boat.x + (Math.random() - 0.5) * 24, waveY + 12 + Math.random() * 16, -boat.vx * 0.18, -28 - Math.random() * 42, 2.2 + Math.random() * 3.0);
          }
        }
        return true;
      } else {
        diveHoldTimer = 0;
        boat.submergeDepth = Math.max(0, boat.y - waveY);
        boat.diveCharge = Math.max(0, boat.diveCharge - dt * 0.9);
        return false;
      }
    }

    var depth = boat.y - waveY;
    boat.submergeDepth = Math.max(0, depth);
    boat.inWater = true;
    boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.34 * dt);

    // === 深海气息/水压风险博弈（深潜鱼鳍流大幅减缓气息消耗并加快蓄力！）===
    var depthRatio = clamp(depth / 140, 0, 1);
    var drainRate = (0.165 + depthRatio * 0.125) * (st.breathDrainMult || 1.0) * (boat.feverTimer > 0 ? 0.45 : 1.0);
    boat.breath = Math.max(0, (typeof boat.breath === 'number' ? boat.breath : 1.0) - drainRate * dt);

    if (boat.breath < 0.32 && boat.breath > 0) {
      boat.breathLowPulse = 1.0;
      pressurePulseCd -= dt;
      if (pressurePulseCd <= 0) {
        pressurePulseCd = 0.56;
        if (window.MT.Audio && window.MT.Audio.playPressurePulse) window.MT.Audio.playPressurePulse();
      }
      if (Math.random() < dt * 28) {
        spawnBubble(boat.x + (Math.random() - 0.5) * 26, boat.y - 6, (Math.random() - 0.5) * 30, -85 - Math.random() * 55, 2.5 + Math.random() * 2.8);
      }
    }

    // 气息耗尽：深海水压强制上浮弹出（失去满蓄破水爆发并受轻微水压颠簸，逼出松手时机博弈！）
    var forceEject = boat.breath <= 0.001;
    if (forceEject) {
      boat.diveCharge = Math.min(boat.diveCharge, 0.14);
      boat.vy = Math.min(boat.vy, -245);
      if (boat.breathLowPulse < 0.5) {
        boat.breathLowPulse = 1.0;
        var pDmg = boat.feverTimer > 0 ? 0 : Math.max(3, Math.round(6 * st.crashDamageMult));
        if (pDmg > 0) {
          boat.hull = Math.max(0, boat.hull - pDmg);
          boat.hurtFlash = 0.65;
          eras.addPopup(boat.x, waveY - 38, '水压憋气强制上浮 -' + pDmg + '（提前松 D 破水！）', '#ffa68c');
        }
      }
    }

    // 统一潜海/破水输入状态
    var wantDive = !forceEject && input.right && !input.left && !wantBoost;
    var maxDiveVx = st.maxSpeed + 100 + (st.deepFinsLv || 0) * 26;
    if (wantDive) {
      boat.carving = true;
      var targetDepth = 112 + (st.deepMaxBonus || 0) * 0.55;
      var depthErr = targetDepth - depth;
      var diveAccelY = clamp(depthErr * 6.5, -260, 440);
      boat.vy += (diveAccelY - boat.vy * 4.4) * dt;

      var deepPush = 260 + Math.min(115, depth * 0.95) + (st.deepFinsLv || 0) * 35;
      if (boat.vx < maxDiveVx) boat.vx += deepPush * dt;

      var chargeRate = (0.82 + clamp(depth / 115, 0, 1) * 0.45) * (st.diveChargeMult || 1.0);
      boat.diveCharge = Math.min(1.0, boat.diveCharge + chargeRate * dt);

      var velAngle = Math.atan2(boat.vy, Math.max(120, boat.vx));
      boat.angle += ctxObj.normalizeAngle(clamp(velAngle, -0.35, 0.58) - boat.angle) * Math.min(1, dt * 10);
      boat.angularVel = 0;

      if (depth < 6) {
        boat.y = waveY + 6;
        if (boat.vy < 0) boat.vy = 20;
      } else if (depth > 158) {
        boat.y = waveY + 158;
        if (boat.vy > 0) boat.vy *= 0.3;
      }
    } else {
      var boostExtra = wantBoost ? 240 : 0;
      var upThrust = 680 + boat.diveCharge * 640 + boostExtra;
      boat.vy -= upThrust * dt;
      var targetUpVy = -(275 + boat.diveCharge * 275 + (wantBoost ? 95 : 0));
      if (boat.vy < targetUpVy) boat.vy = targetUpVy;

      if (!reverseThrusting && boat.vx < maxDiveVx) {
        boat.vx += (125 + boat.diveCharge * 135) * dt;
      }

      var riseAngle = clamp(Math.atan2(boat.vy, Math.max(140, boat.vx)), -0.78, -0.22);
      boat.angle += ctxObj.normalizeAngle(riseAngle - boat.angle) * Math.min(1, dt * 14);
      boat.angularVel = 0;
    }

    var bubRate = wantDive ? 26 : 38;
    if (Math.random() < dt * bubRate) {
      spawnBubble(
        boat.x - 18 + (Math.random() - 0.5) * 18,
        boat.y + (Math.random() - 0.5) * 10,
        -boat.vx * 0.14 + (Math.random() - 0.5) * 24,
        -48 - Math.random() * 68,
        1.8 + Math.random() * (boat.diveCharge >= 0.72 ? 4.2 : 2.8)
      );
    }

    // 破水冲天判定 + 空中强解潜海安全兜底
    var shouldBreach = (!wantDive && boat.y <= waveY + 8 && boat.vy < -28) || (boat.y < waveY - 22);
    if (shouldBreach) {
      var ch = boat.diveCharge;
      boat.isDiving = false;
      boat.inWater = false;
      boat.submergeDepth = 0;
      boat.airTime = 0.02;
      boat.airSpin = 0;
      boat.flipsInJump = 0;
      boat.y = Math.min(boat.y, waveY - 10);

      var pMult = st.breachPowerMult || 1.0;
      var breachVy = -(285 + ch * 275 + (wantBoost ? 70 : 0)) * pMult;
      boat.vy = Math.min(boat.vy, breachVy);
      boat.vx = Math.min(st.maxSpeed + 165, boat.vx + (60 + ch * 125) * pMult);
      boat.angle = clamp(Math.atan2(boat.vy, Math.max(160, boat.vx)), -0.74, -0.24);

      if (ch >= 0.20) {
        var fullBurst = ch >= 0.72;
        boat.runBreaches = (boat.runBreaches || 0) + 1;
        boat.breachSmashTimer = (fullBurst ? 0.68 : 0.48) + (st.deepFinsLv || 0) * 0.14;
        var bBonus = Math.round((4 + ch * 11) * st.starMult);
        boat.runStars += bBonus;
        boat.fuel = st.breachRefillsFuel ? cfg.MAX_FUEL : Math.min(cfg.MAX_FUEL, boat.fuel + 0.32 + ch * 0.45);
        boat.trickAura = Math.max(boat.trickAura, 0.75 + ch * 0.25);

        spawnBreachPlume(boat.x, waveY, ch);
        eras.emitSplash(boat.x, waveY, Math.round(16 + ch * 20), '#e8f8ff', 68 + ch * 72);
        eras.emitRing(boat.x, waveY, fullBurst ? '#ffe8a4' : '#b8f0ff');
        for (var k = 0; k < 14; k++) {
          spawnBubble(boat.x + (Math.random() - 0.5) * 44, waveY + Math.random() * 24, (Math.random() - 0.5) * 60, -40 - Math.random() * 55, 2.2 + Math.random() * 3.5);
        }

        // 深潜鱼鳍流 Lv.2+：满蓄破水触发广域「炸浪冲击波」，震碎周边浮障并吸附星火！
        if (fullBurst && (st.breachShockRadius || 0) > 0) {
          var sRad = st.breachShockRadius;
          shockwaves.push({ x: boat.x, y: waveY, r: 24, maxR: sRad, life: 0.62, maxLife: 0.62 });
          if (window.MT.Audio && window.MT.Audio.playBreachShockwave) window.MT.Audio.playBreachShockwave();
          var smashedCnt = 0;
          for (var sf = 0; sf < floatingHazards.length; sf++) {
            var hObj = floatingHazards[sf];
            if (!hObj.smashed && Math.abs(hObj.x - boat.x) < sRad) {
              hObj.smashed = true;
              smashedCnt++;
              boat.runDebrisSmashed = (boat.runDebrisSmashed || 0) + 1;
              spawnWoodSplinters(hObj.x, eras.getSurfaceY(hObj.x, eras.getTime()) - 6, boat.vx);
              eras.emitSplash(hObj.x, eras.getSurfaceY(hObj.x, eras.getTime()), 16, '#dcf6ff', 68);
            }
          }
          var swExtra = smashedCnt * Math.round(14 * st.starMult);
          boat.runStars += swExtra;
          eras.addPopup(boat.x, waveY - 58, (smashedCnt > 0 ? ('✦ 炸浪震碎×' + smashedCnt + '! +') : '✦ 潜鳍炸浪爆发! +') + (bBonus + swExtra) + '✦', '#fff2aa');
        } else {
          var tag = fullBurst ? '深潜爆发!' : '破水冲天!';
          eras.addPopup(boat.x, waveY - 56, tag + ' +' + bBonus + '✦', fullBurst ? '#ffeaa0' : '#c6f4ff');
          if (window.MT.Audio && window.MT.Audio.playBreach) window.MT.Audio.playBreach(ch);
        }
        ctxObj.addComboAndCheckFever(fullBurst ? (st.deepFinsLv >= 3 ? 3 : 2) : 1, 6.8);
        if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
          window.MT.RenderWorld.triggerImpact(fullBurst ? 0.030 : 0.018, 0.025 + ch * 0.032, 3.5 + ch * 3.5);
        }
      } else {
        if (window.MT.Audio) window.MT.Audio.playSplash(0.55);
        eras.emitSplash(boat.x, waveY, 10, '#dff4ff', 36);
      }
      boat.diveCharge = 0;
    }

    return true;
  }

  // === Step 2 核心：6 套手工结构区块实体交互（上层桥面、水下拱洞、巨水母弹射、暗礁涌流、钟楼敲钟、鲸群连跃、3 枚沉海遗物）===
  function handleChunkInteractions(ctxObj) {
    var dt = ctxObj.dt;
    var boat = ctxObj.boat;
    var eb = ctxObj.eb;
    var eras = ctxObj.eras;
    var cfg = ctxObj.cfg;
    var eco = ctxObj.eco;
    var st = ctxObj.st;
    var t = eras.getTime();
    var wantBoost = ctxObj.wantBoost;
    var boostJustStarted = ctxObj.boostJustStarted;

    if (!eb || eb.weights.moon_sea < 0.35 || (eras.isFinaleActive && eras.isFinaleActive())) {
      activeDeck = null;
      boat.ridingDeck = false;
      return false;
    }

    if (whaleChainTimer > 0) {
      whaleChainTimer -= dt;
      if (whaleChainTimer <= 0) whaleChain = 0;
    }

    // 1. 正在滑行于上层实体桥面/木栈桥（打破单层曲线拓扑！）
    if (activeDeck) {
      var offRight = boat.x > activeDeck.x1;
      var offLeft = boat.x < activeDeck.x0 - 16;
      var jumpOff = wantBoost && boostJustStarted;

      if (offRight || offLeft || jumpOff || boat.isDiving) {
        if (offRight && !activeDeck.launched) {
          activeDeck.launched = true;
          var isWharf = activeDeck.kind === 'stone_wharf' || activeDeck.kind === 'wood_pier';
          var bonus = Math.round((isWharf ? 9 : 10) * st.starMult);
          boat.runStars += bonus;
          boat.vy = Math.min(boat.vy, isWharf ? -295 : -248);
          boat.vx = Math.min(st.maxSpeed + 140, boat.vx + 88);
          boat.trickAura = 0.90;
          eras.emitRing(boat.x, boat.y, '#ffe6a2');
          eras.addPopup(boat.x, boat.y - 46, (isWharf ? '石堤冲天跃 +' : '断桥飞跃 +') + bonus + '✦', '#ffeaa4');
          if (window.MT.Audio) window.MT.Audio.playMountChord('lantern', true);
          if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
            window.MT.RenderWorld.triggerImpact(0.026, 0.038, 4.0);
          }
          ctxObj.addComboAndCheckFever(1, 6.2);
        } else if (jumpOff) {
          boat.vy = -240;
        }
        activeDeck = null;
        boat.ridingDeck = false;
        boat.deckGrace = 0.24;
      } else {
        var dy = getDeckY(activeDeck, boat.x);
        var dSlope = getDeckSlope(activeDeck, boat.x);
        boat.ridingDeck = true;
        boat.inWater = false;
        boat.y = dy - 7;
        var deckSprint = ctxObj.input && ctxObj.input.right ? 165 : 95;
        boat.vx = Math.max(boat.vx + deckSprint * dt, 325 + st.rocketLv * 26);
        boat.vy = boat.vx * dSlope;
        boat.angle += ctxObj.normalizeAngle(Math.atan(dSlope) - boat.angle) * Math.min(1, dt * 20);
        boat.angularVel = 0;
        boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.36 * dt);
        boat.comboTimer = Math.max(boat.comboTimer, 4.0);
        if (Math.random() < dt * 26) {
          eras.emitSpark(boat.x - 14, dy - 1, -boat.vx * 0.28, -32 - Math.random() * 48, activeDeck.kind === 'wood_pier' ? '#f2cfa0' : '#ffe6a8', 2.0, 0.34);
        }
      }
    }

    // 2. 遍历视距内的手工结构区块
    for (var i = 0; i < chunks.length; i++) {
      var ch = chunks[i];
      if (boat.x < ch.x0 - 160 || boat.x > ch.x1 + 160) continue;

      // A) 上层桥面/木栈桥着陆检测（放宽微斜边缘捕获窗，接桥丝滑不漏判）
      if (ch.deck && !activeDeck && !boat.isDiving && boat.deckGrace <= 0 && boat.vy >= -65) {
        var dk = ch.deck;
        if (boat.x >= dk.x0 - 18 && boat.x <= dk.x1 - 14) {
          var targetDy = getDeckY(dk, boat.x);
          if (boat.y >= targetDy - 28 && boat.y <= targetDy + 26) {
            activeDeck = dk;
            boat.ridingDeck = true;
            boat.y = targetDy - 7;
            var flips = boat.flipsInJump || 0;
            if (flips > 0) {
              var fBonus = Math.round(eco.FLIP_STAR_BONUS * flips * Math.max(1, boat.trickCombo + 1) * st.starMult);
              boat.runTricks += flips;
              boat.runFlips += flips;
              boat.runStars += fBonus;
              boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + cfg.FLIP_FUEL_REWARD * flips);
              ctxObj.addComboAndCheckFever(flips, 6.8);
              eras.addPopup(boat.x, targetDy - 52, '桥面完美空翻! +' + fBonus + '✦', '#ffe8a4');
              if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
                window.MT.RenderWorld.triggerImpact(0.030, 0.042, 4.4);
              }
            } else {
              eras.addPopup(boat.x, targetDy - 42, (dk.kind === 'stone_wharf' || dk.kind === 'wood_pier') ? '驶上灯塔石堤!' : '上层高架桥疾驰!', '#ffe8bc');
            }
            boat.airTime = 0;
            boat.airSpin = 0;
            boat.flipsInJump = 0;
            if (window.MT.Audio) window.MT.Audio.playHookCatch();
          }
        }
      }

      // B) 高架桥水下拱洞穿行奖励（下层路线！）
      if (ch.type === 'viaduct' && boat.isDiving && ch.archTriggers) {
        for (var a = 0; a < ch.archTriggers.length; a++) {
          var ar = ch.archTriggers[a];
          if (!ar.passed && Math.abs(boat.x - ar.x) < 34) {
            ar.passed = true;
            boat.vx = Math.min(st.maxSpeed + 120, boat.vx + 42);
            boat.diveCharge = Math.min(1.0, boat.diveCharge + 0.22);
            var aStar = Math.round(3 * st.starMult);
            boat.runStars += aStar;
            if (window.MT.Audio) window.MT.Audio.playHookCatch();
            eras.emitRing(boat.x, boat.y, '#9eeeff');
            if (a === ch.archTriggers.length - 1) {
              eras.addPopup(boat.x, boat.y - 44, '穿拱潜行圆满! 松开 D 破水', '#b4f4ff');
            }
          }
        }
      }

      // C) 荧光水母沟：触碰发光巨水母柔伞 -> 柔和弹跳加速 + 大幅充能浮力！
      if (ch.type === 'jelly_trench' && ch.jellies) {
        for (var ji = 0; ji < ch.jellies.length; ji++) {
          var jl = ch.jellies[ji];
          if (jl.bounceCd > 0) continue;
          var jy = eras.getSurfaceY(jl.x, t) + jl.depthRel + Math.sin(jl.phase) * 9;
          var dJ = Math.hypot(boat.x - jl.x, boat.y - jy);
          if (dJ < jl.radius + 22) {
            jl.bounceCd = 0.7;
            jl.flash = 1.0;
            boat.vx = Math.min(st.maxSpeed + 135, boat.vx + 72);
            boat.diveCharge = Math.min(1.0, boat.diveCharge + 0.36);
            boat.breath = Math.min(1.0, (boat.breath || 0) + 0.42);
            boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.22);
            var jBonus = Math.round(6 * st.starMult);
            boat.runStars += jBonus;
            if (window.MT.Shop && window.MT.Shop.discoverFauna && window.MT.Shop.discoverFauna('fauna_jelly')) {
              var jSnap = (window.MT.Snapshot && window.MT.Snapshot.captureFromLiveCanvas)
                ? window.MT.Snapshot.captureFromLiveCanvas('fauna_jelly', '荧光水母群', jl.x, jy)
                : null;
              boat.runStars += Math.round(15 * ((boat.stats && boat.stats.starMult) || 1));
              if (window.MT.Audio && window.MT.Audio.playRelicFound) window.MT.Audio.playRelicFound();
              if (typeof window.MT.onCodexDiscover === 'function') {
                window.MT.onCodexDiscover({ kind: 'fauna', id: 'fauna_jelly', name: '荧光水母群', snapshot: jSnap });
              }
            }
            if (window.MT.Audio) window.MT.Audio.playHookCatch();
            eras.emitRing(jl.x, jy, '#9cf4ff');
            eras.addPopup(jl.x, jy - 36, '水母续气助推 +' + jBonus + '✦', '#b8f6ff');
            for (var bk = 0; bk < 8; bk++) {
              spawnBubble(jl.x + (Math.random() - 0.5) * 30, jy, (Math.random() - 0.5) * 60, -45 - Math.random() * 55, 2.5 + Math.random() * 3.0);
            }
          }
        }
      }

      // D) 暗礁加速涌流：海面尖礁障碍 vs 下方青金超速洋流隧道！
      if (ch.type === 'reef_stream') {
        if (boat.isDiving && boat.x >= ch.x0 && boat.x <= ch.x1) {
          var streamY = eras.getSurfaceY(boat.x, t) + ch.streamDepth;
          if (Math.abs(boat.y - streamY) < ch.streamRadius + 24) {
            boat.vx = Math.min(st.maxSpeed + 165, Math.max(boat.vx + 420 * dt, 460));
            boat.diveCharge = Math.min(1.0, boat.diveCharge + 0.85 * dt);
            boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.45 * dt);
            if (!ch.boostedMsg) {
              ch.boostedMsg = true;
              eras.addPopup(boat.x + 20, streamY - 40, '✦ 暗礁洋流喷射加速!', '#9ef6ff');
              if (window.MT.Audio) window.MT.Audio.playUpdraft();
            }
            if (Math.random() < dt * 36) {
              spawnBubble(boat.x - 16, boat.y + (Math.random() - 0.5) * 20, -boat.vx * 0.35, -24 - Math.random() * 32, 2.2 + Math.random() * 2.8);
            }
          }
        } else if (!boat.isDiving && ch.spires) {
          for (var spI = 0; spI < ch.spires.length; spI++) {
            var sp = ch.spires[spI];
            if (sp.hitCd > 0) continue;
            var spSurf = eras.getSurfaceY(sp.x, t);
            var spTop = spSurf - sp.h;
            if (Math.abs(boat.x - sp.x) < sp.w * 0.72 + 12 && boat.y > spTop + 10 && boat.y < spSurf + 26) {
              sp.hitCd = 0.85;
              if (boat.feverTimer > 0) {
                eras.emitSplash(sp.x, spTop + 10, 14, '#ffe8a8', 50);
                eras.addPopup(sp.x, spTop - 24, '星辉破礁!', '#ffeaa4');
              } else {
                var rDmg = Math.max(5, Math.round(10 * st.crashDamageMult));
                boat.hull = Math.max(0, boat.hull - rDmg);
                boat.hurtFlash = 0.85;
                boat.vx = Math.max(120, boat.vx * 0.56);
                boat.vy = -145;
                eras.emitSplash(sp.x, spTop + 12, 16, '#cfe8ff', 48);
                eras.addPopup(sp.x, spTop - 24, '擦撞暗礁 -' + rDmg + '（可潜海穿越）', '#ffb69c');
                if (window.MT.Audio) window.MT.Audio.playSplash(1.1);
                if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
                  window.MT.RenderWorld.triggerImpact(0.026, 0.025, 6.5);
                }
              }
            }
          }
        }
      }

      // E) 沉海钟楼：破水高跃掠过古铜钟 -> 敲响清越回荡钟声并温柔托举直达钟顶遗物！
      if (ch.type === 'bell_tower' && !ch.bellRung) {
        var bxHit = typeof ch.bellX === 'number' ? ch.bellX : ch.towerX;
        var dBell = Math.hypot(boat.x - bxHit, boat.y - ch.bellY);
        if (dBell < 78) {
          ch.bellRung = true;
          ch.bellSwing = 1.0;
          ch.ringWave = 1.0;
          boat.runBellsRung = (boat.runBellsRung || 0) + 1;
          var bellBonus = Math.round(18 * st.starMult * (st.sonarRelicMult || 1));
          boat.runStars += bellBonus;
          boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.60);
          boat.vy = Math.min(boat.vy, -245);
          boat.trickAura = 1.0;
          if (window.MT.Audio && window.MT.Audio.playBellChime) window.MT.Audio.playBellChime();
          eras.emitRing(bxHit, ch.bellY, '#ffe69e');
          eras.emitRing(bxHit, ch.bellY, '#c8f2ff');
          eras.addPopup(bxHit, ch.bellY - 46, '✦ 敲响沉海古钟! +' + bellBonus + '✦', '#fff0a8');
          ctxObj.addComboAndCheckFever(2, 7.2);
          if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
            window.MT.RenderWorld.triggerImpact(0.036, 0.052, 5.2);
          }
        }
      }

      // F) 月下蓝鲸群（沸海/灰海期潜避深海不浮水面！）
      var whaleHide = (window.MT.Config && window.MT.Config.EXPLORE_MODE && eb && eb.seaPhase && ((eb.seaPhase.boilAbyss || 0) + (eb.seaPhase.ashSea || 0)) > 0.28);
      if (ch.type === 'whale_pod' && ch.pod && !whaleHide) {
        for (var wi = 0; wi < ch.pod.length; wi++) {
          var wh = ch.pod[wi];
          if (wh.bounced) continue;
          var whY = eras.getSurfaceY(wh.x, t) + Math.sin(wh.phase) * 7 - 6;
          if (!boat.isDiving && Math.abs(boat.x - wh.x) < wh.rx + 18 && boat.y >= whY - 36 && boat.y <= whY + 28) {
            wh.bounced = true;
            wh.flash = 1.0;
            whaleChain += 1;
            whaleChainTimer = 4.5;
            boat.vy = -(335 + Math.min(2, whaleChain - 1) * 40);
            boat.vx = Math.min(st.maxSpeed + 125, Math.max(boat.vx + 78, 320));
            boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.48);
            boat.trickAura = 0.95;
            boat.runWhalesBounced += 1;
            var wBonus = Math.round((8 + (whaleChain - 1) * 6) * st.starMult);
            boat.runStars += wBonus;
            if (window.MT.Shop && window.MT.Shop.discoverFauna && window.MT.Shop.discoverFauna('fauna_whale')) {
              var wSnap = (window.MT.Snapshot && window.MT.Snapshot.captureFromLiveCanvas)
                ? window.MT.Snapshot.captureFromLiveCanvas('fauna_whale', '深渊与月下蓝鲸', wh.x, whY)
                : null;
              boat.runStars += Math.round(15 * ((boat.stats && boat.stats.starMult) || 1));
              if (typeof window.MT.onCodexDiscover === 'function') {
                window.MT.onCodexDiscover({ kind: 'fauna', id: 'fauna_whale', name: '深渊与月下蓝鲸', snapshot: wSnap });
              }
            }
            if (window.MT.Audio) window.MT.Audio.playWhaleBounce();
            eras.emitSplash(wh.x, whY, 22, '#dcf6ff', 72);
            eras.emitRing(wh.x, whY - 10, whaleChain >= 2 ? '#ffe89e' : '#bfeaff');
            var wTxt = whaleChain >= 2 ? ('鲸群连跃 ×' + whaleChain + '! +' + wBonus + '✦') : ('鲸背借力飞升! +' + wBonus + '✦');
            eras.addPopup(wh.x, whY - 58, wTxt, whaleChain >= 2 ? '#ffeca0' : '#d4f4ff');
            if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
              window.MT.RenderWorld.triggerImpact(0.030, 0.046, 4.6);
            }
            ctxObj.addComboAndCheckFever(1, 6.8);
          }
        }
      }
    }

    // 2b. 海面漂浮残木/断桅浮障交互（破水冲天/高速冲刺/流光狂热直接撞碎迸木片与微顿帧！）
    for (var fi = 0; fi < floatingHazards.length; fi++) {
      var fh = floatingHazards[fi];
      if (fh.smashed || fh.hitCd > 0) continue;
      if (Math.abs(boat.x - fh.x) > fh.halfW + 34) continue;
      var fhY = eras.getSurfaceY(fh.x, t);
      if (boat.isDiving && boat.submergeDepth > 32) continue; // 潜海可从下方安全钻过准备蓄力反击
      if (boat.y >= fhY - 46 && boat.y <= fhY + 34) {
        var canSmash = boat.breachSmashTimer > 0 || boat.feverTimer > 0 || (boat.boosting && boat.vx > 320) || boat.vx > 410;
        if (canSmash) {
          fh.smashed = true;
          boat.runDebrisSmashed = (boat.runDebrisSmashed || 0) + 1;
          var smBonus = Math.round(16 * st.starMult * (st.sonarRelicMult || 1));
          boat.runStars += smBonus;
          boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.36);
          boat.vx = Math.min(st.maxSpeed + 145, boat.vx + 55);
          boat.trickAura = 0.96;
          spawnWoodSplinters(fh.x, fhY - 6, boat.vx);
          eras.emitSplash(fh.x, fhY, 22, '#e4f6ff', 76);
          eras.emitRing(fh.x, fhY - 8, '#ffe69c');
          if (window.MT.Audio && window.MT.Audio.playWoodSmash) window.MT.Audio.playWoodSmash();
          var smTag = boat.breachSmashTimer > 0 ? '✦ 破水粉碎浮障!' : '✦ 疾驰撞碎浮障!';
          eras.addPopup(fh.x, fhY - 52, smTag + ' +' + smBonus + '✦', '#fff0a4');
          ctxObj.addComboAndCheckFever(1, 6.8);
          if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
            window.MT.RenderWorld.triggerImpact(0.036, 0.048, 5.6);
          }
        } else {
          fh.hitCd = 0.85;
          var bDmg = Math.max(4, Math.round(7 * st.crashDamageMult));
          boat.hull = Math.max(0, boat.hull - bDmg);
          boat.hurtFlash = 0.72;
          boat.vx = Math.max(125, boat.vx * 0.62);
          boat.vy = -120;
          eras.emitSplash(fh.x, fhY, 14, '#d8f0ff', 42);
          eras.addPopup(fh.x, fhY - 46, '擦碰漂浮残木 -' + bDmg + '（潜海破水可直接撞碎！）', '#ffbe9c');
          if (window.MT.Audio) window.MT.Audio.playSplash(1.0);
          if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
            window.MT.RenderWorld.triggerImpact(0.024, 0.022, 5.2);
          }
        }
      }
    }

    // 2c. 高空月雾云带无重滑翔 & 云间金色星环穿梭！
    var inAnyCloud = false;
    if (!boat.inWater && !boat.isDiving && !boat.ridingDeck) {
      for (var ci = 0; ci < cloudBanks.length; ci++) {
        var cb = cloudBanks[ci];
        if (boat.x >= cb.x0 - 24 && boat.x <= cb.x1 + 24 && Math.abs(boat.y - cb.y) < cb.thickness) {
          inAnyCloud = true;
          if (!cb.entered) {
            cb.entered = true;
            if (window.MT.Audio && window.MT.Audio.playCloudGlide) window.MT.Audio.playCloudGlide();
            eras.addPopup(boat.x, cb.y - 42, '✦ 踏入月雾云带 · 无重滑翔!', '#dff4ff');
          }
        }
        // 金色云间星环穿梭判定
        for (var rj = 0; rj < cb.rings.length; rj++) {
          var rg = cb.rings[rj];
          if (rg.passed) continue;
          var rgy = rg.y + Math.sin(t * 2.4 + rg.phase) * 5;
          if (Math.hypot(boat.x - rg.x, boat.y - rgy) < 52) {
            rg.passed = true;
            rg.flash = 1.0;
            boat.runCloudRings = (boat.runCloudRings || 0) + 1;
            var rBonus = Math.round(14 * st.starMult * (st.cloudBonusMult || 1));
            boat.runStars += rBonus;
            boat.vx = Math.min(st.maxSpeed + 155, boat.vx + 86 + (st.skySailLv || 0) * 18);
            boat.vy = Math.min(boat.vy, -152 - (st.skySailLv || 0) * 14);
            boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.42);
            if (st.cloudDoubleJump) boat.cloudJumpReady = true;
            boat.trickAura = 0.96;
            if (window.MT.Audio) window.MT.Audio.playMountChord('lantern', true);
            eras.emitRing(rg.x, rgy, '#ffe89e');
            eras.emitRing(rg.x, rgy, '#c8f2ff');
            eras.addPopup(rg.x, rgy - 42, '✦ 穿越云间星环! +' + rBonus + '✦', '#fff0a8');
            ctxObj.addComboAndCheckFever(1, 6.8);
            if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
              window.MT.RenderWorld.triggerImpact(0.024, 0.036, 3.6);
            }
          }
        }
      }
    }
    boat.cloudGliding = inAnyCloud;

    // 3. 3 枚「沉海遗物」拾取判定
    for (var ri = 0; ri < relics.length; ri++) {
      var rel = relics[ri];
      if (rel.pickedThisRun) continue;
      var ry = rel.yMode === 'depth'
        ? (eras.getSurfaceY(rel.x, t) + rel.yVal + Math.sin(rel.phase) * 5)
        : (rel.yVal + Math.sin(rel.phase) * 5);
      if (Math.hypot(boat.x - rel.x, boat.y - ry) < 58) {
        rel.pickedThisRun = true;
        boat.runRelicsFound = (boat.runRelicsFound || 0) + 1;
        var isNew = window.MT.Shop && window.MT.Shop.collectRelic ? window.MT.Shop.collectRelic('moon_sea', rel.id) : true;
        var rVal = Math.round((isNew ? 35 : 12) * st.starMult * (st.sonarRelicMult || 1));
        boat.runStars += rVal;
        boat.fuel = cfg.MAX_FUEL;
        boat.trickAura = 1.0;
        if (window.MT.Audio && window.MT.Audio.playRelicFound) window.MT.Audio.playRelicFound();
        eras.emitRing(rel.x, ry, '#ffe89e');
        eras.emitRing(rel.x, ry, '#a8f0ff');
        var rStat = getRelicStatus();
        var relSnap = null;
        if ((isNew || (window.MT.Shop && window.MT.Shop.getSnapshot && !window.MT.Shop.getSnapshot(rel.id))) &&
            window.MT.Snapshot && window.MT.Snapshot.captureFromLiveCanvas) {
          relSnap = window.MT.Snapshot.captureFromLiveCanvas(rel.id, rel.name, rel.x, ry);
          window.MT.Snapshot.triggerShutterFlash();
        }
        if (isNew && typeof window.MT.onCodexDiscover === 'function') {
          window.MT.onCodexDiscover({ kind: 'relic', id: rel.id, name: rel.name, snapshot: relSnap });
        }
        eras.addPopup(
          rel.x, ry - 48,
          isNew ? ('◈ 发现沉海遗物「' + rel.name + '」(' + rStat.collected + '/' + rStat.total + ') +' + rVal + '✦') : ('◈ 重逢「' + rel.name + '」+' + rVal + '✦'),
          '#fff4ba'
        );
        ctxObj.addComboAndCheckFever(2, 7.5);
        if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
          window.MT.RenderWorld.triggerImpact(0.042, 0.058, 5.5);
        }
      }
    }

    return true;
  }

  function update(dt, boat, eras, actInfo, onLevelEvent) {
    var t = eras.getTime();
    var eb = eras.getEraBlend(boat.x);
    var sv = window.MT.Config.SEA_VOYAGE || {};
    var singleSea = window.MT.Config.SINGLE_SCENE_MODE === 'moon_sea';
    var act2X = sv.ACT2_X || 4200;
    var act3X = sv.ACT3_X || 9200;
    var act4X = sv.IMPACT_X || 14800;
    var clearX = singleSea ? (sv.DAWN_BEACON_X || 26100) : ((window.MT.Config.IMPACT && window.MT.Config.IMPACT.HIT_X) || 14800);

    // 委派落月撞击与深海避难/尘幕灰海子模块更新
    if (singleSea && window.MT.Abyss && window.MT.Abyss.update) {
      window.MT.Abyss.update(dt, boat, eras, onLevelEvent, null);
    }
    var inSea = eb && eb.weights.moon_sea > 0.35 && !(eras.isFinaleActive && eras.isFinaleActive());
    var seaPhase = eb ? eb.seaPhase : null;

    if (startedInSea && !stageClearing && boat.x < clearX) {
      stageElapsedSec += dt;
    }

    // 第二幕「蓝眼泪深潮」船尾流光尾迹（在海面滑行时拖曳出璀璨蓝眼泪水花！）
    if (seaPhase && seaPhase.biolum > 0.18 && boat.inWater && !boat.isDiving && Math.random() < dt * 22 * seaPhase.biolum) {
      eras.emitSpark(
        boat.x - 22 + (Math.random() - 0.5) * 14,
        eras.getSurfaceY(boat.x - 20, t) + 2,
        -boat.vx * 0.22,
        -12 - Math.random() * 24,
        Math.random() < 0.6 ? '#8ef4ff' : '#d6fcff',
        2.2 + Math.random() * 1.8,
        0.52
      );
    }

    var isExpM = !!(window.MT.Config && window.MT.Config.EXPLORE_MODE);

    // 自由探索模式：物理慢停归港灯塔泊位 + 零分幕弹窗！
    if (isExpM) {
      climaxTension = 0;
      climaxProgress = 0;
      if (window.MT.Audio && window.MT.Audio.setClimaxTension) window.MT.Audio.setClimaxTension(0);

      var homeX = (window.MT.Config.WORLD_CYCLE && window.MT.Config.WORLD_CYCLE.HOME_X) || 520;
      if (harborMoorCd > 0) harborMoorCd = Math.max(0, harborMoorCd - dt);
      var inHarborZone = Math.abs(boat.x - homeX) < 230 && !boat.isDiving && boat.y < eras.getSurfaceY(boat.x, t) + 26;
      boat.inHarborZone = inHarborZone;
      if (inHarborZone && harborMoorCd <= 0 && Math.abs(boat.vx) < 75) {
        harborMoorProg = Math.min(1.0, harborMoorProg + dt / 1.25);
        if (harborMoorProg >= 1.0) {
          harborMoorProg = 0;
          harborMoorCd = 3.2;
          if (typeof onLevelEvent === 'function') {
            onLevelEvent('harbor_moor', { x: boat.x });
          }
        }
      } else {
        harborMoorProg = Math.max(0, harborMoorProg - dt * 1.8);
      }
      boat.harborMoorProg = harborMoorProg;

      if (activeSonarCd > 0) activeSonarCd = Math.max(0, activeSonarCd - dt);
      if (boundHintCd > 0) boundHintCd = Math.max(0, boundHintCd - dt);
      if (eastPortalCd > 0) eastPortalCd = Math.max(0, eastPortalCd - dt);

      // 东端「星潮跨海洋流门」（x=9640）：唤醒全 3 座沉海共鸣碑（或已解锁冰海）后开启，慢停或按 E 直抵第 2 海域《霜穹冰海》！
      var frostOpen = !!((window.MT.Shop && window.MT.Shop.isFrostUnlocked && window.MT.Shop.isFrostUnlocked())
        || (window.MT.Shrines && window.MT.Shrines.isHarborIlluminated && window.MT.Shrines.isHarborIlluminated()));
      var nearEastGate = Math.abs(boat.x - 9640) < 125;
      boat.inPortalZone = (frostOpen && nearEastGate) ? 'frost_sea' : null;
      if (frostOpen && nearEastGate && eastPortalCd <= 0 && Math.abs(boat.vx) < 95) {
        eastPortalProg = Math.min(1.0, eastPortalProg + dt / 0.95);
        if (eastPortalProg >= 1.0) {
          eastPortalProg = 0;
          eastPortalCd = 3.5;
          if (typeof onLevelEvent === 'function') {
            onLevelEvent('realm_transit', { targetRealm: 'frost_sea', spawnX: 540 });
          }
        }
      } else {
        eastPortalProg = Math.max(0, eastPortalProg - dt * 1.8);
      }
      boat.portalProg = eastPortalProg;

      var wcLim = window.MT.Config.WORLD_CYCLE || { MIN_X: 160, MAX_X: 9840 };
      if (boat.x >= wcLim.MAX_X - 35 && boat.facing > 0 && boundHintCd <= 0) {
        boundHintCd = 6.0;
        eras.addPopup(
          boat.x - 55,
          boat.y - 52,
          frostOpen ? '◈ 星潮跨海航门已开启 · 靠近拱门按 E 驶往《霜穹冰海》' : '◈ 远海石门尚未苏醒 · 唤醒 3 座沉海共鸣碑即可开启航道',
          '#d4f6ff'
        );
      } else if (boat.x <= wcLim.MIN_X + 35 && boat.facing < 0 && boundHintCd <= 0) {
        boundHintCd = 6.0;
        eras.addPopup(boat.x + 55, boat.y - 52, '◈ 西海角浅礁 · 向东驶入暮光灯塔港与开阔海域', '#ffe8b4');
      }
      boat.activeSonarCdFrac = activeSonarMaxCd > 0 ? clamp(activeSonarCd / activeSonarMaxCd, 0, 1) : 0;

      // 自动邂逅收录 3 大天象奇观（沸海沉陨 / 尘幕灰海 / 破晓晨海）并自动抓拍实景水彩邮票！
      wonderCheckCd -= dt;
      if (wonderCheckCd <= 0 && seaPhase && window.MT.Shop && window.MT.Shop.discoverWonder) {
        wonderCheckCd = 1.6;
        var wCand = null;
        if ((seaPhase.boilAbyss || 0) > 0.55 && (boat.isDiving || boat.inAbyss)) {
          wCand = { id: 'wonder_boil', name: '沸海沉陨' };
        } else if ((seaPhase.ashSea || 0) > 0.55 && (boat.isDiving || boat.inAbyss)) {
          wCand = { id: 'wonder_ash', name: '尘幕灰海' };
        } else if ((seaPhase.dawn || 0) > 0.55 && !boat.isDiving) {
          wCand = { id: 'wonder_dawn', name: '破晓晨海' };
          // 自然完整见证破晓时，永久获赠「潮汐怀表」（可自由拨动天象时轮！）
          if (window.MT.Shop.unlockTimeWatch && window.MT.Shop.unlockTimeWatch()) {
            if (typeof onLevelEvent === 'function') {
              onLevelEvent('time_watch_unlocked', {});
            }
          }
        }
        if (wCand && window.MT.Shop.discoverWonder(wCand.id)) {
          var wSnapUrl = (window.MT.Snapshot && window.MT.Snapshot.captureFromLiveCanvas)
            ? window.MT.Snapshot.captureFromLiveCanvas(wCand.id, wCand.name, boat.x, boat.y)
            : null;
          if (window.MT.Snapshot) window.MT.Snapshot.triggerShutterFlash();
          if (window.MT.Audio && window.MT.Audio.playShutterSnap) window.MT.Audio.playShutterSnap();
          boat.runStars += Math.round(20 * ((boat.stats && boat.stats.starMult) || 1));
          if (typeof onLevelEvent === 'function') {
            onLevelEvent('codex_discover', { kind: 'wonder', id: wCand.id, name: wCand.name, snapshot: wSnapUrl });
          }
        }
      }
      // 血月前兆期（150..210s）偶发远处坠海流星烘托天象渐紧，无需文字催促！
      if (seaPhase && seaPhase.storm > 0.35) {
        debrisTimer -= dt;
        if (debrisTimer <= 0) {
          var dtx = clamp(boat.x + (Math.random() - 0.5) * 920, 400, 9600);
          moonDebris.push({
            id: nextId++, targetX: dtx, startX: dtx + 240, startY: -470,
            telegraph: 1.35, maxTelegraph: 1.35, fallProg: 0, state: 'telegraph', splashLife: 0, radius: 13 + Math.random() * 6
          });
          debrisTimer = 4.2 + Math.random() * 2.5;
        }
      }
    }

    // === 四幕天象诗意转场播报（仅线性旧模式生效）===
    if (!isExpM && startedInSea && !stageClearing && seaPhase && seaPhase.act > announcedActNum) {
      announcedActNum = seaPhase.act;
      if (seaPhase.act === 2 && typeof onLevelEvent === 'function') {
        onLevelEvent('act3_climax', {
          kicker: seaPhase.actMeta.kicker,
          title: seaPhase.actMeta.name,
          subtitle: seaPhase.actMeta.subtitle
        });
      } else if (seaPhase.act === 4) {
        // 第四幕起由 MT.Abyss 接管撞击沸海演出，清空风暴残余浪墙
        climaxTension = 0;
        climaxProgress = 1.0;
        tidalWalls.forEach(function (w) { if (w.state === 'active') w.state = 'cleared'; });
        moonDebris = [];
        if (window.MT.Audio && window.MT.Audio.setClimaxTension) window.MT.Audio.setClimaxTension(0);
      } else if (seaPhase.act === 7) {
        if (window.MT.Audio) window.MT.Audio.playMountChord('gramophone', true);
        if (typeof onLevelEvent === 'function') {
          onLevelEvent('act3_climax', {
            kicker: seaPhase.actMeta.kicker,
            title: seaPhase.actMeta.name,
            subtitle: seaPhase.actMeta.subtitle
          });
        }
      }
    }

    // === 第三幕高潮：「落月血潮风暴」调度（仅线性旧模式生效）===
    if (!isExpM && startedInSea && !stageClearing) {
      if (!act3Triggered && boat.x >= act3X) {
        act3Triggered = true;
        if (window.MT.Audio && window.MT.Audio.playTidalRoar) window.MT.Audio.playTidalRoar();
        if (window.MT.RenderWorld && window.MT.RenderWorld.addShake) window.MT.RenderWorld.addShake(6.5);
        if (typeof onLevelEvent === 'function') {
          onLevelEvent('act3_climax', {
            kicker: '第三幕 · 落月巨潮',
            title: '落月血潮风暴',
            subtitle: '巨月压低掀起真实百米巨浪、天降陨星——乘浪冲顶或潜穿浪腹漩涡！'
          });
        }
      }

      if (act3Triggered && boat.x < act4X) {
        climaxProgress = clamp((boat.x - act3X) / Math.max(1, act4X - act3X), 0, 1);
        climaxTension = clamp(0.25 + climaxProgress * 0.75, 0, 1);
        if (window.MT.Audio && window.MT.Audio.setClimaxTension) {
          window.MT.Audio.setClimaxTension(climaxTension);
        }

        if (nextWallIdx < WALL_TRIGGER_XS.length && boat.x >= WALL_TRIGGER_XS[nextWallIdx]) {
          spawnTidalWall(boat.x, nextWallIdx);
          nextWallIdx += 1;
        }

        debrisTimer -= dt;
        if (debrisTimer <= 0 && boat.x < act4X - 480) {
          spawnMoonDebris(boat.x);
          debrisTimer = Math.max(1.25, 2.25 - climaxProgress * 0.85) + Math.random() * 0.45;
        }
      }

      // 第四幕破晓彼岸：抵达破晓灯塔 clearX 迎来静谧史诗通关！
      if (boat.x >= clearX) {
        stageClearing = true;
        stageClearDelay = 1.45;
        stageClearEmitted = false;
        climaxProgress = 1.0;
        climaxTension = 0;
        tidalWalls.forEach(function (w) { if (w.state === 'active') w.state = 'cleared'; });
        moonDebris = [];
        var clearBonus = (window.MT.Config.ECONOMY && window.MT.Config.ECONOMY.STAGE_CLEAR_BONUS) || 60;
        boat.runStars += clearBonus;
        boat.hull = boat.maxHull;
        boat.fuel = window.MT.Config.SURF.MAX_FUEL;
        if (window.MT.Audio && window.MT.Audio.playStageClear) window.MT.Audio.playStageClear();
        eras.emitRing(boat.x, boat.y - 12, '#ffe8a4');
        eras.emitRing(boat.x, boat.y - 12, '#a8f0ff');
        eras.addPopup(boat.x, boat.y - 64, '✦ 抵达破晓彼岸！+' + clearBonus + '✦', '#fff2b4');
      }
    }

    // 无尽月潮模式：轮到「血潮风暴」天象时自动随机掀起真实百米巨浪，常玩常新！
    if (lastMode === 'endless' && seaPhase && seaPhase.storm > 0.45) {
      if (tidalWalls.length === 0 && Math.random() < dt * 0.28) {
        spawnTidalWall(boat.x, Math.floor(Math.random() * 4));
      }
      debrisTimer -= dt;
      if (debrisTimer <= 0) {
        spawnMoonDebris(boat.x);
        debrisTimer = 2.0 + Math.random() * 1.1;
      }
    }

    if (stageClearing) {
      stageClearDelay -= dt;
      if (!stageClearEmitted && stageClearDelay <= 0) {
        stageClearEmitted = true;
        if (typeof onLevelEvent === 'function') {
          onLevelEvent('stage_clear', {
            stageNumber: 1,
            singleSceneClear: singleSea,
            kicker: singleSea ? 'MOON TIDE SEA · DAWN ARRIVAL' : 'STAGE 1 CLEAR · MOON TIDE SEA',
            stageTitle: singleSea ? '月潮之海 · 抵达破晓彼岸' : '月潮之海 · 航程达成',
            stagePoem: singleSea
              ? '你驾着这叶小小木舟穿越暮光浅海、蓝眼泪深潮与血月风暴；在落月撞击刹那深潜避难，借沉船气室穿越灰蒙尘海与发光海藻峡谷——<br />最终伴随荧光蓝鲸乘大洋流破晓重返，整片无尽月潮已向你敞开。'
              : '你乘着这叶小小木舟潜穿百米浪墙、躲过坠落陨星，冲破了落月海平线。<br />巨月已然坠海，前方沸腾的赤金火海正等待你整备启航。',
            clearStatLabel: '驾驭巨浪',
            clearStatValue: wallsCleared + ' 道',
            eraId: 'moon_sea',
            eraName: '月潮之海',
            nextEraId: singleSea ? 'moon_sea' : 'fire_sea',
            nextEraName: singleSea ? '无尽月潮' : '陨落火海',
            nextBlueprintName: '黑曜石隔热壳',
            timeSec: stageElapsedSec,
            wallsCleared: wallsCleared,
            debrisDodged: debrisDodged,
            breaches: boat.runBreaches || 0,
            bellsRung: boat.runBellsRung || 0,
            relics: RELIC_DEFS.map(function (d) {
              return {
                id: d.id,
                name: d.name,
                hint: d.hint,
                owned: !!(window.MT.Shop && window.MT.Shop.hasRelic && window.MT.Shop.hasRelic('moon_sea', d.id))
              };
            })
          });
        }
      }
    }

    // 更新真实物理变形巨浪：玩家可顺陡浪爬坡「乘浪顶弹射冲天」或按住 D「潜穿浪腹漩涡」！
    var stC = boat.stats || { starMult: 1, crashDamageMult: 1, maxSpeed: 600 };
    for (var wi = tidalWalls.length - 1; wi >= 0; wi--) {
      var wl = tidalWalls[wi];
      wl.phase += dt * 3.6;
      wl.x += wl.speed * dt;
      var crestY = eras.getSurfaceY(wl.x, t);
      var dxBoat = boat.x - wl.x;

      // 浪冠实时向前抛洒晶莹水花微粒（动态生机，绝非静止贴图！）
      if (Math.abs(wl.x - boat.x) < 950 && Math.random() < dt * 20) {
        eras.emitSpark(
          wl.x - 24 + (Math.random() - 0.5) * 32,
          crestY + 4 + Math.random() * 14,
          wl.speed * 1.4 - 45 - Math.random() * 65,
          -35 - Math.random() * 55,
          Math.random() < 0.65 ? '#eef9ff' : '#a8e8ff',
          1.8 + Math.random() * 1.6,
          0.45 + Math.random() * 0.25
        );
      }

      if (!stageClearing && wl.state === 'active') {
        // 1) 迎浪陡坡区：潜海钻入浪腹漩涡 -> 强力水下推流助推！
        if (boat.isDiving && Math.abs(dxBoat) < 95) {
          boat.vx = Math.min(stC.maxSpeed + 160, boat.vx + 260 * dt);
          boat.diveCharge = Math.min(1.0, boat.diveCharge + 1.2 * dt);
          if (Math.abs(dxBoat) < 42) {
            wl.state = 'cleared';
            wallsCleared += 1;
            var dStar = Math.round(18 * stC.starMult);
            boat.runStars += dStar;
            boat.diveCharge = 1.0;
            boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.50);
            boat.vx = Math.min(stC.maxSpeed + 155, boat.vx + 105);
            boat.trickAura = 0.96;
            if (window.MT.Audio) window.MT.Audio.playUpdraft();
            eras.emitRing(boat.x, boat.y, '#9ef6ff');
            eras.addPopup(boat.x, crestY + 34, '✦ 潜穿巨浪漩涡! +' + dStar + '✦', '#a8f6ff');
            if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
              window.MT.RenderWorld.triggerImpact(0.026, 0.040, 4.2);
            }
          }
        }
        // 2) 乘真实巨浪爬上浪峰 -> 物理弹射冲天！（船真的顺陡坡冲到浪尖飞向高空！）
        else if (!boat.isDiving && dxBoat >= -56 && dxBoat <= 58) {
          wl.state = 'cleared';
          wallsCleared += 1;
          var oStar = Math.round(24 * stC.starMult);
          boat.runStars += oStar;
          boat.inWater = false;
          boat.vy = Math.min(boat.vy, -395 - (boat.boosting ? 75 : 0));
          boat.vx = Math.min(stC.maxSpeed + 145, Math.max(boat.vx + 95, 360));
          boat.angle = -0.58;
          boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.55);
          boat.trickAura = 1.0;
          if (window.MT.Audio && window.MT.Audio.playBreach) window.MT.Audio.playBreach(0.88);
          eras.emitSplash(wl.x, crestY, 24, '#eaf9ff', 95);
          eras.emitRing(wl.x, crestY - 12, '#ffe89e');
          eras.addPopup(wl.x, crestY - 56, '✦ 乘百米巨浪冲天! +' + oStar + '✦', '#fff0a4');
          if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
            window.MT.RenderWorld.triggerImpact(0.034, 0.052, 5.4);
          }
        }
        // 3) 迎面碎浪唇拍击：仅在无加速且航速过慢撞上陡峭碎浪唇时造成真实水流冲击与后推
        else if (!boat.isDiving && !wl.lipHit && dxBoat > -118 && dxBoat < -58 && boat.inWater && !boat.boosting && boat.feverTimer <= 0 && boat.vx < 185) {
          wl.lipHit = true;
          var wDmg = Math.max(5, Math.round(10 * stC.crashDamageMult));
          boat.hull = Math.max(0, boat.hull - wDmg);
          boat.hurtFlash = 0.85;
          boat.vx = Math.max(125, boat.vx * 0.65);
          boat.vy = -125;
          eras.emitSplash(boat.x + 14, boat.y, 18, '#dcf4ff', 68);
          eras.addPopup(boat.x, boat.y - 48, '碎浪拍击 -' + wDmg + '（加速冲顶 或 按D潜穿）', '#ffae94');
          if (window.MT.Audio) window.MT.Audio.playSplash(1.25);
          if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
            window.MT.RenderWorld.triggerImpact(0.026, 0.028, 7.0);
          }
        }
      }
      if (wl.x < boat.x - 950) tidalWalls.splice(wi, 1);
    }

    // 更新天降落月碎屑（预警 -> 坠落 -> 砸海爆蒸气柱）
    for (var di = moonDebris.length - 1; di >= 0; di--) {
      var db = moonDebris[di];
      var dSurf = eras.getSurfaceY(db.targetX, t);
      if (db.state === 'telegraph') {
        db.telegraph -= dt;
        if (db.telegraph <= 0) {
          db.state = 'falling';
          db.fallProg = 0;
        }
      } else if (db.state === 'falling') {
        db.fallProg += dt / 0.40;
        var curX = db.startX + (db.targetX - db.startX) * Math.min(1, db.fallProg);
        var curY = db.startY + (dSurf - db.startY) * Math.min(1, db.fallProg);
        if (Math.random() < dt * 40) {
          eras.emitSpark(curX, curY, 45, -60, Math.random() < 0.5 ? '#ffe49e' : '#ff8a54', 2.6, 0.35);
        }
        if (db.fallProg >= 1) {
          db.state = 'splashed';
          db.splashLife = 0.65;
          if (window.MT.Audio && window.MT.Audio.playMeteorSplash) window.MT.Audio.playMeteorSplash();
          eras.emitSplash(db.targetX, dSurf, 18, '#ffd89c', 82);
          eras.emitRing(db.targetX, dSurf, '#ffbe74');
          if (window.MT.RenderWorld && window.MT.RenderWorld.addShake) window.MT.RenderWorld.addShake(4.8);

          var distHoriz = Math.abs(boat.x - db.targetX);
          var safeDeep = stageClearing || (boat.isDiving && boat.submergeDepth >= 34);
          if (!safeDeep && distHoriz < 50 && boat.y > dSurf - 115) {
            if (boat.feverTimer > 0) {
              var fdStar = Math.round(10 * stC.starMult);
              boat.runStars += fdStar;
              eras.addPopup(boat.x, boat.y - 46, '星辉弹开陨星 +' + fdStar + '✦', '#fff0a8');
            } else {
              var mDmg = Math.max(5, Math.round(12 * stC.crashDamageMult));
              boat.hull = Math.max(0, boat.hull - mDmg);
              boat.hurtFlash = 0.85;
              boat.vy = Math.min(boat.vy, -135);
              eras.addPopup(boat.x, boat.y - 46, '陨星浪涌 -' + mDmg, '#ffa486');
            }
          } else if (distHoriz < 135) {
            debrisDodged += 1;
            var nmStar = Math.round(10 * stC.starMult);
            boat.runStars += nmStar;
            eras.addPopup(boat.x, boat.y - 46, (safeDeep ? '深潜避过陨星 +' : '惊险擦身陨星 +') + nmStar + '✦', '#ffe8a8');
          }
        }
      } else {
        db.splashLife -= dt;
        if (db.splashLife <= 0) moonDebris.splice(di, 1);
      }
    }

    if (window.MT.Audio && window.MT.Audio.setUnderwater) {
      var subRatio = boat.isDiving ? clamp(boat.submergeDepth / 85, 0.35, 0.88) : 0;
      window.MT.Audio.setUnderwater(subRatio);
    }

    // 无尽乱序模式下再次轮到月潮之海时，动态流式刷出 6 套手工结构区块！
    if (lastMode === 'endless' && inSea) {
      if (nextEndlessChunkX < boat.x + 280) nextEndlessChunkX = boat.x + 480;
      while (nextEndlessChunkX < boat.x + 2400) {
        nextEndlessChunkX += spawnEndlessSeaChunk(nextEndlessChunkX);
      }
    }

    var st = boat.stats || { magnetRadius: 82, starMult: 1 };
    var airRad = boat.feverTimer > 0 ? Math.max(250, st.magnetRadius * 1.65) : st.magnetRadius;
    var deepRad = boat.isDiving ? Math.max(135, st.magnetRadius * 1.15) : 48;

    for (var ci = chunks.length - 1; ci >= 0; ci--) {
      var ch = chunks[ci];
      ch.phase += dt * 2.2;
      if (ch.bellSwing > 0) ch.bellSwing = Math.max(0, ch.bellSwing - dt * 0.45);
      if (ch.ringWave > 0) ch.ringWave = Math.max(0, ch.ringWave - dt * 0.85);

      if (ch.jellies) {
        ch.jellies.forEach(function (jl) {
          jl.phase += dt * 1.9;
          if (jl.bounceCd > 0) jl.bounceCd = Math.max(0, jl.bounceCd - dt);
          if (jl.flash > 0) jl.flash = Math.max(0, jl.flash - dt * 1.8);
          if ((boat.isDiving || boat.inAbyss) && Math.abs(boat.x - jl.x) < 150) {
            if (window.MT.Shop && window.MT.Shop.discoverFauna && window.MT.Shop.discoverFauna('fauna_jelly')) {
              var jSnap2 = (window.MT.Snapshot && window.MT.Snapshot.captureFromLiveCanvas)
                ? window.MT.Snapshot.captureFromLiveCanvas('fauna_jelly', '荧光水母群', jl.x, eras.getSurfaceY(jl.x, t) + jl.depth)
                : null;
              boat.runStars += Math.round(15 * ((boat.stats && boat.stats.starMult) || 1));
              if (window.MT.Audio && window.MT.Audio.playRelicFound) window.MT.Audio.playRelicFound();
              if (typeof onLevelEvent === 'function') {
                onLevelEvent('codex_discover', { kind: 'fauna', id: 'fauna_jelly', name: '荧光水母群', snapshot: jSnap2 });
              }
            }
          }
        });
      }
      if (ch.spires) {
        ch.spires.forEach(function (sp) { if (sp.hitCd > 0) sp.hitCd = Math.max(0, sp.hitCd - dt); });
      }
      if (ch.pod) {
        ch.pod.forEach(function (wh) {
          wh.phase += dt * 1.5;
          if (wh.flash > 0) wh.flash = Math.max(0, wh.flash - dt * 1.8);
        });
      }

      // 区块空中星火弧收集
      if (ch.airStars) {
        for (var ai = 0; ai < ch.airStars.length; ai++) {
          var as = ch.airStars[ai];
          if (as.collected) continue;
          as.phase += dt * 3.0;
          var asy = as.y + Math.sin(as.phase) * 3.5;
          var da = Math.hypot(as.x - boat.x, asy - (boat.y - 10));
          if (da < 44) {
            as.collected = true;
            var av = Math.max(1, Math.round(as.value * st.starMult));
            boat.runStars += av;
            boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.04);
            if (window.MT.Audio) window.MT.Audio.playHookCatch();
          } else if (da < airRad) {
            as.x += (boat.x - as.x) * Math.min(1, dt * 12);
            as.y += ((boat.y - 10) - as.y) * Math.min(1, dt * 12);
          }
        }
      }

      // 区块深海星珠收集
      if (ch.deepPearls) {
        for (var pi = 0; pi < ch.deepPearls.length; pi++) {
          var dp = ch.deepPearls[pi];
          if (dp.collected) continue;
          dp.phase += dt * 3.2;
          var dpy = eras.getSurfaceY(dp.x, t) + dp.depthRel + Math.sin(dp.phase) * 4;
          var dd = Math.hypot(dp.x - boat.x, dpy - boat.y);
          if (dd < 46) {
            dp.collected = true;
            var dv = Math.max(2, Math.round(dp.value * st.starMult));
            boat.runStars += dv;
            boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.05);
            if (boat.isDiving) {
              boat.diveCharge = Math.min(1.0, boat.diveCharge + 0.14);
              boat.breath = Math.min(1.0, (boat.breath || 0) + 0.18);
            }
            if (window.MT.Audio) window.MT.Audio.playHookCatch();
            for (var sb = 0; sb < 3; sb++) {
              spawnBubble(dp.x, dpy, (Math.random() - 0.5) * 40, -35 - Math.random() * 42, 2.0 + Math.random() * 2.2);
            }
          } else if (boat.isDiving && dd < deepRad) {
            dp.x += (boat.x - dp.x) * Math.min(1, dt * 11);
            dp.depthRel += ((boat.y - eras.getSurfaceY(dp.x, t)) - dp.depthRel) * Math.min(1, dt * 11);
          }
        }
      }

      if (lastMode === 'endless' && ch.x1 < boat.x - 1200) {
        chunks.splice(ci, 1);
      }
    }

    relics.forEach(function (rel) { rel.phase += dt * 2.4; });

    for (var fhi = floatingHazards.length - 1; fhi >= 0; fhi--) {
      var fh2 = floatingHazards[fhi];
      fh2.phase += dt * 2.2;
      if (fh2.hitCd > 0) fh2.hitCd = Math.max(0, fh2.hitCd - dt);
      if (lastMode === 'endless' && fh2.x < boat.x - 1000) floatingHazards.splice(fhi, 1);
    }

    for (var cbi = cloudBanks.length - 1; cbi >= 0; cbi--) {
      var cb2 = cloudBanks[cbi];
      cb2.phase += dt * 1.1;
      cb2.rings.forEach(function (r) { if (r.flash > 0) r.flash = Math.max(0, r.flash - dt * 2.0); });
      if (lastMode === 'endless' && cb2.x1 < boat.x - 1000) cloudBanks.splice(cbi, 1);
    }

    // 更新深潜鱼鳍炸浪冲击波 & 潮汐声呐自动探测波纹！
    for (var swi = shockwaves.length - 1; swi >= 0; swi--) {
      var sw = shockwaves[swi];
      sw.life -= dt;
      sw.r = sw.maxR * (1 - Math.pow(Math.max(0, sw.life / sw.maxLife), 2));
      if (sw.life <= 0) shockwaves.splice(swi, 1);
    }

    if ((st.tideSonarLv || 0) >= 1 && !stageClearing && inSea) {
      sonarTimer -= dt;
      if (sonarTimer <= 0) {
        sonarTimer = st.sonarPeriod || 4.0;
        sonarWaves.push({
          x: boat.x + (boat.facing || 1) * 32,
          y: boat.y,
          r: 18,
          maxR: st.sonarRange || 440,
          life: 1.35,
          maxLife: 1.35,
          lv: st.tideSonarLv,
          facing: boat.facing || 1,
          active: false
        });
        if (window.MT.Audio && window.MT.Audio.playSonarPing) window.MT.Audio.playSonarPing();
        if (boat.inAbyss && window.MT.Abyss && window.MT.Abyss.triggerSonarReveal) {
          window.MT.Abyss.triggerSonarReveal();
        }
      }
    }

    for (var sni = sonarWaves.length - 1; sni >= 0; sni--) {
      var sn = sonarWaves[sni];
      sn.life -= dt;
      if (!sn.active) {
        sn.x = boat.x + (boat.facing || 1) * 28;
        sn.y = boat.y;
      }
      sn.r = sn.maxR * (1 - Math.max(0, sn.life / sn.maxLife));

      // Lv.2+ 潮汐声呐波纹自动大范围牵引区块深海星珠与空中星火，Lv.3 共鸣水母/蓝鲸额外爆星！
      // 任何等级潮汐声呐扫过深海皆可识破深渊提灯鱼伪装！
      if (window.MT.AbyssFauna && window.MT.AbyssFauna.onSonarSweep) {
        window.MT.AbyssFauna.onSonarSweep(boat.x, boat.y, sn.r, eras);
      }

      if (sn.lv >= 2) {
        for (var sc = 0; sc < chunks.length; sc++) {
          var chk = chunks[sc];
          if (chk.x1 < boat.x - sn.maxR || chk.x0 > boat.x + sn.maxR) continue;
          if (chk.deepPearls) {
            chk.deepPearls.forEach(function (dp) {
              if (!dp.collected && Math.abs(dp.x - boat.x) < sn.r) {
                dp.x += (boat.x - dp.x) * Math.min(1, dt * 6.5);
                dp.depthRel += ((boat.y - eras.getSurfaceY(dp.x, t)) - dp.depthRel) * Math.min(1, dt * 6.5);
              }
            });
          }
          if (chk.airStars) {
            chk.airStars.forEach(function (as) {
              if (!as.collected && Math.hypot(as.x - boat.x, as.y - boat.y) < sn.r) {
                as.x += (boat.x - as.x) * Math.min(1, dt * 6.5);
                as.y += ((boat.y - 10) - as.y) * Math.min(1, dt * 6.5);
              }
            });
          }
          if (sn.lv >= 3 && chk.pod) {
            chk.pod.forEach(function (wh) {
              if (!wh.sonarResonated && Math.abs(wh.x - boat.x) < sn.r) {
                wh.sonarResonated = true;
                wh.flash = 1.0;
                var wStar = Math.round(12 * st.starMult);
                boat.runStars += wStar;
                eras.emitRing(wh.x, eras.getSurfaceY(wh.x, t) - 18, '#a6f4ff');
                eras.addPopup(wh.x, eras.getSurfaceY(wh.x, t) - 52, '✦ 声呐唤醒蓝鲸共鸣 +' + wStar + '✦', '#c8f8ff');
              }
            });
          }
        }
      }
      if (sn.life <= 0) sonarWaves.splice(sni, 1);
    }

    for (var spi = splinters.length - 1; spi >= 0; spi--) {
      var spt = splinters[spi];
      spt.life -= dt;
      spt.x += spt.vx * dt;
      spt.y += spt.vy * dt;
      spt.vy += 520 * dt;
      spt.ang += spt.vAng * dt;
      if (spt.life <= 0) splinters.splice(spi, 1);
    }

    for (var bi = bubbles.length - 1; bi >= 0; bi--) {
      var bub = bubbles[bi];
      bub.life -= dt;
      bub.phase += dt * 5.2;
      bub.x += (bub.vx + Math.sin(bub.phase) * 14) * dt;
      bub.y += bub.vy * dt;
      bub.vx *= Math.pow(0.25, dt);
      if (bub.life <= 0 || bub.y <= eras.getSurfaceY(bub.x, t) + 2) bubbles.splice(bi, 1);
    }

    for (var bp = breachPlumes.length - 1; bp >= 0; bp--) {
      breachPlumes[bp].life -= dt;
      if (breachPlumes[bp].life <= 0) breachPlumes.splice(bp, 1);
    }
  }

  // =========================================================================
  // v8 Lv1 美术融合重构：
  // 1) 巨浪墙、蓝鲸群、钟楼、灯塔、高架桥、暗礁全部先绘于半透明主海面之前（drawWorldBack），
  //    底座自然深浸于深蓝海水中，绝不再出现“贴纸浮在海面上”的平底截断与割裂感！
  // 2) 统一暮光大气透视调色，剔除扁平白椭圆碟子、屋顶绿尖块、竖直矩形切线与僵硬喷水铁丝！
  // =========================================================================
  var artCache = null;

  function h1(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  // 沉海古钟楼（融合暮光大气薄雾、去掉怪异垂挂绿块，柔润水彩石砌）
  function buildBellTowerSprite() {
    var cw = 260, ch = 460;
    var cx = cw * 0.5;
    var waterY = 278;
    var out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    var ctx = out.getContext('2d');

    var sil = document.createElement('canvas');
    sil.width = cw; sil.height = ch;
    var g = sil.getContext('2d');
    g.fillStyle = '#ffffff';

    g.beginPath();
    g.moveTo(cx - 46, ch);
    g.lineTo(cx - 41, waterY - 10);
    g.lineTo(cx - 37, waterY - 18);
    g.lineTo(cx - 33, waterY - 112);
    g.lineTo(cx - 31, waterY - 178);
    g.lineTo(cx - 40, waterY - 182);
    g.lineTo(cx - 40, waterY - 189);
    g.lineTo(cx - 34, waterY - 191);
    g.quadraticCurveTo(cx - 14, waterY - 216, cx, waterY - 248);
    g.quadraticCurveTo(cx + 14, waterY - 216, cx + 34, waterY - 191);
    g.lineTo(cx + 40, waterY - 189);
    g.lineTo(cx + 40, waterY - 182);
    g.lineTo(cx + 31, waterY - 178);
    g.lineTo(cx + 34, waterY - 106);
    g.lineTo(cx + 38, waterY - 18);
    g.lineTo(cx + 42, waterY - 10);
    g.lineTo(cx + 48, ch);
    g.closePath();
    g.fill();

    g.globalCompositeOperation = 'source-atop';

    // 柔润暮光绘本紫灰石墙（进一步柔化暗部边缘反差，与晚霞海雾自然相融）
    var bodyGrad = g.createLinearGradient(cx - 42, waterY - 210, cx + 44, waterY + 90);
    bodyGrad.addColorStop(0.00, '#585276');
    bodyGrad.addColorStop(0.45, '#6e6384');
    bodyGrad.addColorStop(0.82, '#9a7d8e');
    bodyGrad.addColorStop(1.00, '#d2a99c');
    g.fillStyle = bodyGrad;
    g.fillRect(0, 0, cw, ch);

    // 柔和青灰铜绿曲面塔顶（低反差融入夜空靛蓝）
    var roofGrad = g.createLinearGradient(cx - 36, waterY - 248, cx + 36, waterY - 184);
    roofGrad.addColorStop(0.00, '#475c74');
    roofGrad.addColorStop(0.55, '#607a8a');
    roofGrad.addColorStop(1.00, '#a6b6b0');
    g.fillStyle = roofGrad;
    g.fillRect(0, 0, cw, waterY - 183);

    // 极淡的柔和石砌层理（克制而不零碎）
    for (var row = 0; row < 11; row++) {
      var ry = waterY - 170 + row * 19;
      g.fillStyle = row % 2 === 0 ? 'rgba(30, 32, 56, 0.11)' : 'rgba(255, 224, 198, 0.05)';
      g.fillRect(cx - 46, ry, 92, 1.5);
      for (var col = 0; col < 3; col++) {
        var bx = cx - 32 + col * 22 + (row % 2) * 9;
        if (h1(row * 7.3 + col * 3.1) > 0.50) {
          g.fillStyle = h1(row * 11 + col) > 0.5 ? 'rgba(28, 30, 52, 0.10)' : 'rgba(244, 212, 194, 0.07)';
          g.fillRect(bx, ry + 2, 15, 14);
        }
      }
    }

    // 柔和檐下影与海平面湿润过渡
    var eaveSh = g.createLinearGradient(0, waterY - 182, 0, waterY - 166);
    eaveSh.addColorStop(0, 'rgba(22, 24, 46, 0.42)');
    eaveSh.addColorStop(1, 'rgba(22, 24, 46, 0)');
    g.fillStyle = eaveSh;
    g.fillRect(cx - 44, waterY - 182, 88, 17);

    // 统一暮光空气薄雾混色 + 底部柔和海雾羽化（显著降低轮廓锐度，呈现景深空气感）
    var hazeTint = g.createLinearGradient(0, waterY - 240, 0, waterY + 26);
    hazeTint.addColorStop(0.00, 'rgba(124, 102, 138, 0.20)');
    hazeTint.addColorStop(0.58, 'rgba(232, 174, 150, 0.30)');
    hazeTint.addColorStop(0.86, 'rgba(202, 166, 158, 0.34)');
    hazeTint.addColorStop(1.00, 'rgba(28, 54, 88, 0.62)');
    g.fillStyle = hazeTint;
    g.fillRect(0, 0, cw, ch);

    ctx.drawImage(sil, 0, 0);

    // 屋顶纤细新月风向标
    ctx.strokeStyle = 'rgba(62, 58, 84, 0.78)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, waterY - 246); ctx.lineTo(cx, waterY - 268); ctx.stroke();
    ctx.strokeStyle = 'rgba(250, 228, 186, 0.72)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, waterY - 272, 6, Math.PI * 0.2, Math.PI * 1.65); ctx.stroke();

    // 镂空钟室拱洞（柔和深靛底，不刺黑）
    ctx.fillStyle = '#2d2d4a';
    ctx.beginPath();
    ctx.arc(cx, waterY - 154, 16.5, Math.PI, 0);
    ctx.lineTo(cx + 16.5, waterY - 122);
    ctx.lineTo(cx - 16.5, waterY - 122);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(244, 214, 188, 0.28)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, waterY - 154, 17.5, Math.PI, 0);
    ctx.stroke();

    // 拱顶悬挂木横梁（精准承托铜钟挂点）
    ctx.fillStyle = '#3e3346';
    ctx.fillRect(cx - 17, waterY - 160, 34, 3.6);

    // 塔身暖灯小拱窗
    var winG = ctx.createRadialGradient(cx, waterY - 68, 1, cx, waterY - 68, 24);
    winG.addColorStop(0, 'rgba(255, 228, 166, 0.65)');
    winG.addColorStop(0.55, 'rgba(255, 198, 128, 0.16)');
    winG.addColorStop(1, 'rgba(255, 198, 128, 0)');
    ctx.fillStyle = winG;
    ctx.beginPath(); ctx.arc(cx, waterY - 68, 24, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = 'rgba(255, 232, 178, 0.84)';
    ctx.beginPath();
    ctx.arc(cx, waterY - 74, 5.0, Math.PI, 0);
    ctx.lineTo(cx + 5.0, waterY - 56);
    ctx.lineTo(cx - 5.0, waterY - 56);
    ctx.closePath();
    ctx.fill();

    return { canvas: out, w: cw, h: ch, anchorX: cx, anchorY: waterY };
  }

  // 海岸灯塔（融合暮光晚霞与柔雾，不再红白生硬刺眼）
  function buildLighthouseSprite() {
    var cw = 210, ch = 440;
    var cx = cw * 0.5;
    var waterY = 268;
    var out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    var ctx = out.getContext('2d');

    var sil = document.createElement('canvas');
    sil.width = cw; sil.height = ch;
    var g = sil.getContext('2d');
    g.fillStyle = '#ffffff';

    g.beginPath();
    g.moveTo(cx - 30, ch);
    g.lineTo(cx - 22, waterY - 22);
    g.lineTo(cx - 14, waterY - 166);
    g.lineTo(cx - 21, waterY - 169);
    g.lineTo(cx - 21, waterY - 175);
    g.lineTo(cx - 11, waterY - 176);
    g.lineTo(cx - 11, waterY - 196);
    g.quadraticCurveTo(cx - 13, waterY - 207, cx, waterY - 214);
    g.quadraticCurveTo(cx + 13, waterY - 207, cx + 11, waterY - 196);
    g.lineTo(cx + 11, waterY - 176);
    g.lineTo(cx + 21, waterY - 175);
    g.lineTo(cx + 21, waterY - 169);
    g.lineTo(cx + 14, waterY - 166);
    g.lineTo(cx + 22, waterY - 22);
    g.lineTo(cx + 30, ch);
    g.closePath();
    g.fill();

    g.globalCompositeOperation = 'source-atop';
    var bodyG = g.createLinearGradient(cx - 26, 0, cx + 26, 0);
    bodyG.addColorStop(0.00, '#6a6888');
    bodyG.addColorStop(0.45, '#968da2');
    bodyG.addColorStop(0.84, '#d0beb8');
    bodyG.addColorStop(1.00, '#eedbc9');
    g.fillStyle = bodyG;
    g.fillRect(0, 0, cw, ch);

    // 淡雅水彩赭红灯塔横带（进一步柔化饱和度）
    g.fillStyle = 'rgba(164, 94, 94, 0.34)';
    g.fillRect(cx - 28, waterY - 132, 56, 24);
    g.fillRect(cx - 28, waterY - 70, 56, 22);

    g.fillStyle = '#624d64';
    g.fillRect(cx - 18, waterY - 216, 36, 22);

    // 统一暮光大气透视柔雾 + 底部海雾羽化
    var hazeG = g.createLinearGradient(0, waterY - 210, 0, waterY + 55);
    hazeG.addColorStop(0.00, 'rgba(122, 100, 136, 0.20)');
    hazeG.addColorStop(0.56, 'rgba(234, 174, 148, 0.34)');
    hazeG.addColorStop(0.84, 'rgba(206, 168, 160, 0.36)');
    hazeG.addColorStop(1.00, 'rgba(28, 54, 88, 0.68)');
    g.fillStyle = hazeG;
    g.fillRect(0, 0, cw, ch);

    ctx.drawImage(sil, 0, 0);

    // 纤细铁艺护栏与暖光灯室
    ctx.strokeStyle = 'rgba(54, 50, 74, 0.70)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 19, waterY - 182); ctx.lineTo(cx + 19, waterY - 182);
    for (var rp = -18; rp <= 18; rp += 9) {
      ctx.moveTo(cx + rp, waterY - 175); ctx.lineTo(cx + rp, waterY - 182);
    }
    ctx.stroke();

    ctx.fillStyle = '#fff5cf';
    ctx.fillRect(cx - 8, waterY - 193, 16, 16);
    ctx.fillStyle = 'rgba(255, 232, 174, 0.78)';
    ctx.beginPath(); ctx.arc(cx, waterY - 96, 3.8, 0, Math.PI * 2); ctx.fill();

    return { canvas: out, w: cw, h: ch, anchorX: cx, anchorY: waterY };
  }

  // 多棱面月光受光海蚀暗礁柱（带暮光空气雾过渡）
  function buildReefSprite(variant) {
    var cw = 260, ch = 360;
    var cx = cw * 0.5;
    var waterY = 175;
    var out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    var ctx = out.getContext('2d');

    var sil = document.createElement('canvas');
    sil.width = cw; sil.height = ch;
    var g = sil.getContext('2d');
    g.fillStyle = '#ffffff';

    var pts = variant === 0
      ? [
          [cx - 72, ch], [cx - 58, waterY + 26], [cx - 46, waterY - 14],
          [cx - 34, waterY - 36], [cx - 22, waterY - 30], [cx - 10, waterY - 76],
          [cx + 3,  waterY - 94], [cx + 16, waterY - 68], [cx + 28, waterY - 48],
          [cx + 36, waterY - 20], [cx + 52, waterY - 8],  [cx + 62, waterY + 34],
          [cx + 76, ch]
        ]
      : [
          [cx - 78, ch], [cx - 64, waterY + 22], [cx - 50, waterY - 8],
          [cx - 36, waterY - 46], [cx - 24, waterY - 56], [cx - 14, waterY - 38],
          [cx - 2,  waterY - 88], [cx + 10, waterY - 108], [cx + 22, waterY - 74],
          [cx + 34, waterY - 54], [cx + 46, waterY - 16], [cx + 60, waterY + 28],
          [cx + 74, ch]
        ];

    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    g.fill();

    g.globalCompositeOperation = 'source-atop';
    var baseG = g.createLinearGradient(cx - 54, waterY - 110, cx + 56, waterY + 95);
    baseG.addColorStop(0.00, '#625674');
    baseG.addColorStop(0.48, '#3f4462');
    baseG.addColorStop(1.00, '#192644');
    g.fillStyle = baseG;
    g.fillRect(0, 0, cw, ch);

    var peakX = variant === 0 ? (cx + 3) : (cx + 10);
    var peakY = variant === 0 ? (waterY - 94) : (waterY - 108);

    g.fillStyle = 'rgba(24, 28, 52, 0.34)';
    g.beginPath();
    g.moveTo(peakX, peakY);
    g.lineTo(peakX - 10, waterY - 34);
    g.lineTo(peakX - 24, waterY + 38);
    g.lineTo(peakX - 88, ch);
    g.lineTo(0, ch); g.lineTo(0, 0);
    g.closePath();
    g.fill();

    g.fillStyle = 'rgba(246, 206, 178, 0.24)';
    g.beginPath();
    g.moveTo(peakX, peakY);
    g.lineTo(peakX - 8, waterY - 34);
    g.lineTo(peakX + 8, waterY + 32);
    g.lineTo(cx + 80, ch); g.lineTo(cw, 0);
    g.closePath();
    g.fill();

    var wetG = g.createLinearGradient(0, waterY - 18, 0, waterY + 65);
    wetG.addColorStop(0, 'rgba(18, 36, 62, 0)');
    wetG.addColorStop(0.5, 'rgba(16, 34, 60, 0.45)');
    wetG.addColorStop(1, 'rgba(12, 24, 48, 0.82)');
    g.fillStyle = wetG;
    g.fillRect(0, waterY - 18, cw, ch - (waterY - 18));

    ctx.drawImage(sil, 0, 0);

    ctx.strokeStyle = 'rgba(255, 232, 198, 0.36)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(peakX, peakY);
    ctx.lineTo(peakX + 13, peakY + 30);
    ctx.stroke();

    return { canvas: out, w: cw, h: ch, anchorX: cx, anchorY: waterY };
  }

  function ensureArtCache() {
    if (artCache) return artCache;
    artCache = {
      bellTower: buildBellTowerSprite(),
      lighthouse: buildLighthouseSprite(),
      reefs: [buildReefSprite(0), buildReefSprite(1)]
    };
    return artCache;
  }

  // 极其克制的波面细沫碎点（彻底淘汰原先宽大刺眼的白椭圆碟子！）
  function drawSubtleWaveSpray(ctx, x, y, halfW, t, seed) {
    ctx.save();
    ctx.fillStyle = 'rgba(242, 248, 255, 0.46)';
    for (var i = 0; i < 4; i++) {
      var u = (i / 3) - 0.5;
      var px = x + u * halfW * 1.4 + Math.sin(t * 2.8 + seed + i * 2.1) * 5;
      var py = y - 1 - Math.abs(Math.sin(t * 3.5 + seed + i * 1.7)) * 4.5;
      var r = 1.4 + (i % 2) * 1.0;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // 废除贴纸式背景巨浪；巨浪已通过 getSurfaceOffset 真实抬升主海面，本函数仅在真实浪峰绘制利落清透的手绘卷沫与碎浪弧！
  function drawRogueCrestFoam(ctx, eras, wl, t) {
    var crestY = eras.getSurfaceY(wl.x, t);
    ctx.save();
    ctx.lineCap = 'round';

    // 1. 沿真实浪峰顺滑卷向左侧的清脆手绘白浪钩（干净锐利，零模糊棉花球！）
    var curlGrad = ctx.createLinearGradient(wl.x - 68, crestY + 34, wl.x + 68, crestY + 12);
    curlGrad.addColorStop(0.00, 'rgba(255, 250, 238, 0.0)');
    curlGrad.addColorStop(0.24, 'rgba(255, 250, 238, 0.92)');
    curlGrad.addColorStop(0.58, 'rgba(226, 248, 255, 0.85)');
    curlGrad.addColorStop(1.00, 'rgba(226, 248, 255, 0.0)');
    ctx.strokeStyle = curlGrad;
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(wl.x - 56, crestY + 30);
    ctx.bezierCurveTo(wl.x - 58, crestY + 2, wl.x - 26, crestY - 5, wl.x + 2, crestY - 1);
    ctx.quadraticCurveTo(wl.x + 34, crestY + 4, wl.x + 64, crestY + 18);
    ctx.stroke();

    // 2. 浪唇内侧轻盈翻卷的第二道细水彩浪丝（随相位流动）
    var wob = Math.sin(wl.phase * 1.4) * 3;
    ctx.strokeStyle = 'rgba(202, 244, 255, 0.62)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(wl.x - 42, crestY + 24 + wob);
    ctx.quadraticCurveTo(wl.x - 36, crestY + 4, wl.x - 10, crestY + 4);
    ctx.quadraticCurveTo(wl.x + 14, crestY + 6, wl.x + 36, crestY + 16);
    ctx.stroke();

    // 3. 迎风飞散的几颗清脆细碎水珠（替代糊成一片的径向雾球）
    ctx.fillStyle = 'rgba(248, 252, 255, 0.86)';
    for (var dr = 0; dr < 8; dr++) {
      var du = ((t * 1.65 + dr * 0.13 + wl.id) % 1);
      var dx = wl.x - 36 - du * 68;
      var dy = crestY + 4 + du * 42 - Math.sin(du * Math.PI) * 18;
      ctx.globalAlpha = Math.sin(du * Math.PI) * 0.88;
      ctx.beginPath();
      ctx.arc(dx, dy, 1.3 + (dr % 3) * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // =========================================================================
  // 半浸于暮光海面中的灵动蓝鲸（在 drawWorldBack 绘制，圆润深腹自然没入半透明海水，
  // 贴合实时波坡斜率，三头姿态各异，呼吸水雾柔和飘散——彻底告别浮水蓝拖鞋！）
  // =========================================================================
  function drawSubmergedWhale(ctx, eras, wh, idx, t) {
    var surfY = eras.getSurfaceY(wh.x, t);
    var slopeAng = Math.atan(eras.getSurfaceSlope(wh.x, t)) * 0.72;
    // 适度抬高鲸背高度（较上版上浮 12px），既有清晰优雅的月下蓝鲸轮廓，又保留深潜下腹自然浸于海水之中！
    var poseDepth = idx === 1 ? -1 : (idx === 2 ? -8 : -5);
    var posePitch = idx === 0 ? -0.05 : (idx === 1 ? 0.04 : -0.08);
    var archH = (idx === 0 ? 31 : (idx === 1 ? 25 : 34)) * wh.scale;
    var wy = surfY + poseDepth + Math.sin(wh.phase) * 4.5;
    var rx = wh.rx;

    ctx.save();
    ctx.translate(wh.x, wy);
    ctx.rotate(slopeAng + posePitch + Math.sin(wh.phase * 0.8) * 0.035);

    // 1. 鲸背上方柔和月光生物微光
    var wg = ctx.createRadialGradient(-rx * 0.1, -archH * 0.52, 6, 0, -archH * 0.22, rx * 1.12);
    wg.addColorStop(0, 'rgba(208, 242, 255, ' + (0.22 + wh.flash * 0.34) + ')');
    wg.addColorStop(1, 'rgba(166, 224, 255, 0)');
    ctx.fillStyle = wg;
    ctx.beginPath(); ctx.arc(0, -archH * 0.22, rx * 1.12, 0, Math.PI * 2); ctx.fill();

    // 2. 完整圆润的深海蓝鲸躯体（背脊受月光泛清雅灰蓝，深腹向下延至 +48px 稳稳没入半透明海水中）
    var bg = ctx.createLinearGradient(0, -archH - 4, 0, 48 * wh.scale);
    bg.addColorStop(0.00, '#6c96be');
    bg.addColorStop(0.30, '#3a6288');
    bg.addColorStop(0.65, '#1e3c60');
    bg.addColorStop(1.00, '#102442');
    ctx.fillStyle = bg;

    var tailSway = Math.sin(wh.phase * 1.25 + idx) * 5.5;
    ctx.beginPath();
    ctx.moveTo(-rx * 0.96, 16 * wh.scale);
    ctx.bezierCurveTo(-rx * 0.92, -archH * 0.88, -rx * 0.34, -archH * 1.08, rx * 0.22, -archH * 0.72);
    ctx.bezierCurveTo(rx * 0.58, -archH * 0.44, rx * 0.86, -4 + tailSway * 0.3, rx * 1.08, 4 + tailSway * 0.6);
    ctx.quadraticCurveTo(rx * 1.24, -12 + tailSway, rx * 1.36, -16 + tailSway);
    ctx.quadraticCurveTo(rx * 1.20, 4 + tailSway * 0.5, rx * 1.30, 20 + tailSway * 0.4);
    ctx.quadraticCurveTo(rx * 1.10, 18 + tailSway * 0.3, rx * 0.92, 18 + tailSway * 0.2);
    ctx.bezierCurveTo(rx * 0.45, 44 * wh.scale, -rx * 0.48, 48 * wh.scale, -rx * 0.96, 16 * wh.scale);
    ctx.closePath();
    ctx.fill();

    // 淡灰蓝鲸腹褶皱纹理（潜于水面下隐约可见）
    ctx.fillStyle = 'rgba(148, 194, 224, 0.16)';
    ctx.beginPath();
    ctx.ellipse(-rx * 0.18, 18 * wh.scale, rx * 0.56, 12 * wh.scale, 0.08, 0, Math.PI * 2);
    ctx.fill();

    // 背脊柔和满月高光边缘 + 几粒错落月光星斑
    ctx.strokeStyle = 'rgba(232, 248, 255, 0.56)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-rx * 0.76, -archH * 0.36);
    ctx.bezierCurveTo(-rx * 0.46, -archH * 0.96, rx * 0.08, -archH * 0.96, rx * 0.48, -archH * 0.42);
    ctx.stroke();

    ctx.fillStyle = 'rgba(236, 248, 255, 0.52)';
    for (var sp = 0; sp < 3; sp++) {
      var sx = -rx * (0.42 - sp * 0.28) + (idx - 1) * 5;
      var sy = -archH * (0.58 - sp * 0.08);
      ctx.beginPath(); ctx.arc(sx, sy, 1.8 + (sp === 1 ? 0.7 : 0), 0, Math.PI * 2); ctx.fill();
    }

    // 3. 柔和飘散的水彩呼吸雾团（错开呼吸周期，彻底淘汰僵硬对称 Y 字铁丝！）
    var breathCycle = Math.sin(t * 0.95 + idx * 2.3);
    if (breathCycle > 0.15 || wh.flash > 0.1) {
      var bStr = Math.max(wh.flash, (breathCycle - 0.15) / 0.85);
      var bx = -rx * 0.48, by = -archH * 0.78;
      for (var m = 0; m < 4; m++) {
        var mu = m / 3;
        var mx = bx + mu * 12 + Math.sin(t * 2 + m) * 3;
        var my = by - 8 - mu * (22 + wh.flash * 18);
        var mr = 5 + mu * 9;
        var mg = ctx.createRadialGradient(mx, my, 1, mx, my, mr);
        mg.addColorStop(0, 'rgba(234, 248, 255, ' + (0.34 * bStr * (1 - mu * 0.45)) + ')');
        mg.addColorStop(1, 'rgba(216, 242, 255, 0)');
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.restore();
  }

  // === 分层绘制 1：所有与海水交融的建筑、暗礁、蓝鲸群与百米巨浪墙（全部先绘于半透明主海面之前！）===
  function drawWorldBack(ctx, state) {
    var cache = ensureArtCache();
    var eras = window.MT.Eras;
    var t = state.t;
    var pal = state.eb ? state.eb.palette : window.MT.Config.ERAS[0].palette;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    var viewBottom = state.viewBottom;
    var seaMix = state.eb ? (state.eb.weights.moon_sea || 0) : 1;
    if (seaMix < 0.05) return;

    ctx.save();
    ctx.globalAlpha = seaMix;

    chunks.forEach(function (ch) {
      if (ch.x1 < viewLeft - 260 || ch.x0 > viewRight + 260) return;

      // 1) 半沉旧镇高架桥主体（风化崩裂阶梯端头 + 修长罗马石拱 + 暮光大气融合 + 桥墩深扎海底！）
      if (ch.type === 'viaduct') {
        var dk = ch.deck;
        var span = (ch.x1 - ch.x0) / ch.arches;
        var abyssY = Math.max(290, viewBottom + 80);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ch.x0 - 24, abyssY);
        ctx.lineTo(ch.x0 - 20, dk.y0 + 38);
        ctx.lineTo(ch.x0 - 9,  dk.y0 + 34);
        ctx.lineTo(ch.x0 - 5,  dk.y0 + 14);
        ctx.lineTo(ch.x0 + 8,  dk.y0 + 10);
        ctx.lineTo(dk.x0,      dk.y0);
        ctx.lineTo(dk.x1,      dk.y1);
        ctx.lineTo(ch.x1 - 4,  dk.y1 + 12);
        ctx.lineTo(ch.x1 + 8,  dk.y1 + 16);
        ctx.lineTo(ch.x1 + 14, dk.y1 + 36);
        ctx.lineTo(ch.x1 + 24, dk.y1 + 44);
        ctx.lineTo(ch.x1 + 26, abyssY);

        for (var a = ch.arches - 1; a >= 0; a--) {
          var ax0 = ch.x0 + a * span;
          var ax1 = ax0 + span;
          var ayMid = (getDeckY(dk, ax0) + getDeckY(dk, ax1)) * 0.5;
          var pierHalf = 14;
          var innerL = ax0 + pierHalf;
          var innerR = ax1 - pierHalf;
          var springY = ayMid + 58;
          var crownY = ayMid + 18;
          var archMid = (innerL + innerR) * 0.5;

          ctx.lineTo(innerR, abyssY);
          ctx.lineTo(innerR, springY);
          ctx.quadraticCurveTo(innerR, crownY, archMid, crownY);
          ctx.quadraticCurveTo(innerL, crownY, innerL, springY);
          ctx.lineTo(innerL, abyssY);
        }
        ctx.closePath();

        var vGrad = ctx.createLinearGradient(0, dk.y1 - 12, 0, 140);
        vGrad.addColorStop(0.00, '#786680');
        vGrad.addColorStop(0.35, '#554d6c');
        vGrad.addColorStop(0.75, '#30395a');
        vGrad.addColorStop(1.00, '#182442');
        ctx.fillStyle = vGrad;
        ctx.fill();

        ctx.save();
        ctx.clip();

        ctx.strokeStyle = 'rgba(24, 22, 42, 0.34)';
        ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(ch.x0 - 10, dk.y0 + 10); ctx.lineTo(ch.x1 + 10, dk.y1 + 10); ctx.stroke();

        for (var r = 0; r < 4; r++) {
          var dyOff = 16 + r * 15;
          ctx.strokeStyle = r % 2 === 0 ? 'rgba(26, 24, 46, 0.16)' : 'rgba(255, 226, 198, 0.06)';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(ch.x0 - 20, dk.y0 + dyOff); ctx.lineTo(ch.x1 + 20, dk.y1 + dyOff); ctx.stroke();
        }

        for (var a2 = 0; a2 < ch.arches; a2++) {
          var b0 = ch.x0 + a2 * span;
          var b1 = b0 + span;
          var bm = (b0 + b1) * 0.5;
          var byM = (getDeckY(dk, b0) + getDeckY(dk, b1)) * 0.5;
          var iL = b0 + 14, iR = b1 - 14;
          var spY = byM + 58, crY = byM + 18;

          ctx.strokeStyle = 'rgba(244, 214, 188, 0.22)';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(iL - 2, spY);
          ctx.quadraticCurveTo(iL - 2, crY - 2, bm, crY - 2);
          ctx.quadraticCurveTo(iR + 2, crY - 2, iR + 2, spY);
          ctx.stroke();
        }

        // 暮光暖雾混色，与天空晚霞无缝相融
        var vHaze = ctx.createLinearGradient(0, dk.y1, 0, 75);
        vHaze.addColorStop(0.00, 'rgba(228, 174, 150, 0.16)');
        vHaze.addColorStop(0.55, 'rgba(184, 146, 148, 0.12)');
        vHaze.addColorStop(1.00, 'rgba(16, 36, 62, 0.65)');
        ctx.fillStyle = vHaze;
        ctx.fillRect(ch.x0 - 30, dk.y1 - 20, (ch.x1 - ch.x0) + 60, abyssY);

        ctx.restore();

        // 破损低矮石护栏
        ctx.fillStyle = '#655774';
        for (var par = 0; par < 13; par++) {
          if (h1(ch.id * 11 + par * 3.7) < 0.30) continue;
          var pu = 0.04 + (par / 12) * 0.92;
          var ppx = dk.x0 + pu * (dk.x1 - dk.x0);
          var ppy = getDeckY(dk, ppx);
          var ph = 4.5 + h1(par * 5.1) * 4.5;
          ctx.fillRect(ppx - 5.5, ppy - ph, 11, ph + 1);
        }
        ctx.restore();
      }

      // 2) 沉海古钟楼（叠加一层海平面暮光水雾柔化塔基与晚霞衔接）
      if (ch.type === 'bell_tower' && cache.bellTower) {
        var bt = cache.bellTower;
        ctx.save();
        ctx.translate(ch.towerX, 18);
        ctx.rotate(-0.042);
        var bglow = ctx.createRadialGradient(0, -152, 4, 0, -152, ch.bellRung ? 54 : 34);
        bglow.addColorStop(0, 'rgba(255, 232, 162, ' + (ch.bellRung ? 0.52 : 0.22) + ')');
        bglow.addColorStop(1, 'rgba(255, 210, 130, 0)');
        ctx.fillStyle = bglow;
        ctx.beginPath(); ctx.arc(0, -152, ch.bellRung ? 54 : 34, 0, Math.PI * 2); ctx.fill();
        ctx.drawImage(bt.canvas, -bt.anchorX, -bt.anchorY);

        var btMist = ctx.createRadialGradient(0, -16, 12, 0, -14, 96);
        btMist.addColorStop(0, 'rgba(232, 184, 164, 0.24)');
        btMist.addColorStop(0.55, 'rgba(182, 152, 166, 0.10)');
        btMist.addColorStop(1, 'rgba(182, 152, 166, 0)');
        ctx.fillStyle = btMist;
        ctx.beginPath(); ctx.ellipse(0, -14, 96, 42, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // 3) 残破海岸灯塔与深扎海底木桩（叠加海雾羽化带自然退入远海景深）
      if (ch.type === 'lighthouse_pier') {
        if (cache.lighthouse) {
          var lh = cache.lighthouse;
          ctx.save();
          ctx.translate(ch.towerX, 16);
          ctx.rotate(0.052);
          ctx.drawImage(lh.canvas, -lh.anchorX, -lh.anchorY);

          var lhMist = ctx.createRadialGradient(0, -18, 10, 0, -16, 86);
          lhMist.addColorStop(0, 'rgba(236, 186, 162, 0.26)');
          lhMist.addColorStop(0.55, 'rgba(184, 154, 166, 0.11)');
          lhMist.addColorStop(1, 'rgba(184, 154, 166, 0)');
          ctx.fillStyle = lhMist;
          ctx.beginPath(); ctx.ellipse(0, -16, 86, 38, 0, 0, Math.PI * 2); ctx.fill();

          var beamAng = Math.sin(t * 0.85 + ch.phase) * 0.26;
          var softBm = window.MT.Art.getSoftBeamSprite ? window.MT.Art.getSoftBeamSprite() : null;
          ctx.save();
          ctx.translate(0, -186);
          ctx.rotate(beamAng);
          if (softBm) {
            var harborLitL = !!(window.MT.Shrines && window.MT.Shrines.isHarborIlluminated && window.MT.Shrines.isHarborIlluminated());
            // 柔和羽化双侧灯塔光束（永久焕新后升级为更宏阔的暖金 × 翡翠双色极光束！）
            ctx.save();
            ctx.scale(harborLitL ? -1.16 : -0.92, harborLitL ? 0.86 : 0.72);
            ctx.globalAlpha = seaMix * (harborLitL ? 0.72 : 0.56);
            ctx.drawImage(softBm.canvas, -softBm.anchorX, -softBm.anchorY);
            ctx.restore();

            ctx.save();
            ctx.scale(harborLitL ? 0.96 : 0.58, harborLitL ? 0.74 : 0.54);
            ctx.globalAlpha = seaMix * (harborLitL ? 0.58 : 0.38);
            ctx.drawImage(softBm.canvas, -softBm.anchorX, -softBm.anchorY);
            ctx.restore();

            if (harborLitL) {
              // 翡翠极光副光束（与暖金主光束交错旋转！）
              ctx.save();
              ctx.rotate(-beamAng * 1.45 - 0.14);
              var aurG = ctx.createRadialGradient(0, 0, 12, 160, -18, 220);
              aurG.addColorStop(0.0, 'rgba(136, 248, 222, 0.36)');
              aurG.addColorStop(0.55, 'rgba(102, 224, 232, 0.14)');
              aurG.addColorStop(1.0, 'rgba(84, 198, 224, 0)');
              ctx.fillStyle = aurG;
              ctx.beginPath(); ctx.ellipse(130, -16, 210, 46, -0.06, 0, Math.PI * 2); ctx.fill();
              ctx.restore();
            }
          }
          ctx.restore();

          var lGlow = window.MT.Art.getLampGlowSprite ? window.MT.Art.getLampGlowSprite() : null;
          if (lGlow) ctx.drawImage(lGlow, -50, -236, 100, 100);
          ctx.restore();
        }

        // 重绘第一幕跳台：绘本风风化弧石灯塔码头（3 座优雅潮汐石拱深扎海底，与钟楼/高架桥石砌工艺浑然一体，告别木架子！）
        if (ch.deck) {
          var pk = ch.deck;
          var wMidX = (pk.x0 + pk.x1) * 0.5;
          var pBot = Math.max(270, viewBottom + 80);
          var archesW = 3;
          var wSpan = (pk.x1 - pk.x0 - 28) / archesW;

          ctx.save();
          ctx.beginPath();
          // 左端缓入海面的风化石坡脚
          ctx.moveTo(pk.x0 - 28, pBot);
          ctx.lineTo(pk.x0 - 18, pk.y0 + 22);
          ctx.lineTo(pk.x0, pk.y0);
          // 优雅向上弯曲的石码头弧形滑道（贴合二次贝塞尔 deck）
          ctx.quadraticCurveTo(wMidX, pk.cy, pk.x1, pk.y1);
          // 右端厚实弧石灯塔基台端头
          ctx.lineTo(pk.x1 + 16, pk.y1 + 8);
          ctx.lineTo(pk.x1 + 26, pk.y1 + 32);
          ctx.lineTo(pk.x1 + 32, pBot);

          // 从右向左镂空 3 座比例渐高的海岸石拱涵洞（深扎海底，海水自然穿流！）
          for (var wa = archesW - 1; wa >= 0; wa--) {
            var bx0 = pk.x0 + 18 + wa * wSpan;
            var bx1 = bx0 + wSpan;
            var bMid = (bx0 + bx1) * 0.5;
            var bTop = getDeckY(pk, bMid) + 20;
            var iL = bx0 + 11, iR = bx1 - 11;
            var springY = Math.max(bTop + 34, 16);
            ctx.lineTo(iR, pBot);
            ctx.lineTo(iR, springY);
            ctx.quadraticCurveTo(iR, bTop, bMid, bTop);
            ctx.quadraticCurveTo(iL, bTop, iL, springY);
            ctx.lineTo(iL, pBot);
          }
          ctx.closePath();

          var wGrad = ctx.createLinearGradient(0, pk.y1 - 8, 0, 110);
          wGrad.addColorStop(0.00, '#7c6a82');
          wGrad.addColorStop(0.38, '#58506e');
          wGrad.addColorStop(0.76, '#323c5c');
          wGrad.addColorStop(1.00, '#182644');
          ctx.fillStyle = wGrad;
          ctx.fill();

          // 剪影内刷石砖错缝、拱券高光与暮光海雾过渡
          ctx.save();
          ctx.clip();
          for (var wr = 0; wr < 5; wr++) {
            var wyOff = 12 + wr * 14;
            ctx.strokeStyle = wr % 2 === 0 ? 'rgba(24, 24, 46, 0.16)' : 'rgba(255, 226, 198, 0.07)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(pk.x0 - 10, pk.y0 + wyOff);
            ctx.quadraticCurveTo(wMidX, pk.cy + wyOff, pk.x1 + 20, pk.y1 + wyOff);
            ctx.stroke();
          }
          var wHaze = ctx.createLinearGradient(0, pk.y1, 0, 65);
          wHaze.addColorStop(0.00, 'rgba(232, 178, 152, 0.18)');
          wHaze.addColorStop(0.60, 'rgba(182, 148, 154, 0.12)');
          wHaze.addColorStop(1.00, 'rgba(16, 36, 62, 0.62)');
          ctx.fillStyle = wHaze;
          ctx.fillRect(pk.x0 - 36, pk.y1 - 16, (pk.x1 - pk.x0) + 76, pBot);
          ctx.restore();

          // 低矮石系缆柱
          ctx.fillStyle = '#685976';
          ctx.fillRect(pk.x0 + 24, getDeckY(pk, pk.x0 + 24) - 6, 8, 7);
          ctx.fillRect(pk.x1 - 24, getDeckY(pk, pk.x1 - 24) - 7, 9, 8);
          ctx.restore();
        }
      }

      // 4) 暗礁海蚀柱
      if (ch.type === 'reef_stream' && ch.spires && cache.reefs) {
        ch.spires.forEach(function (sp, idx) {
          var rsp = cache.reefs[idx % cache.reefs.length];
          var sc = sp.h / 86;
          var surfBase = eras.getSurfaceY(sp.x, t);
          var rockY = Math.min(24, Math.max(-14, surfBase * 0.45));
          ctx.drawImage(rsp.canvas, sp.x - rsp.anchorX * sc, rockY - rsp.anchorY * sc, rsp.w * sc, rsp.h * sc);
        });
      }

      // 5) 月下蓝鲸群（沸海/灰海期柔和下潜避难，破晓与清澈期重现海面！）
      if (ch.type === 'whale_pod' && ch.pod) {
        var spW = state.eb ? state.eb.seaPhase : null;
        var wHide = (window.MT.Config && window.MT.Config.EXPLORE_MODE && spW)
          ? clamp(((spW.boilAbyss || 0) + (spW.ashSea || 0)) * 1.6, 0, 1)
          : 0;
        if (wHide < 0.95) {
          ctx.save();
          ctx.globalAlpha = seaMix * (1 - wHide);
          ch.pod.forEach(function (wh, idx) {
            drawSubmergedWhale(ctx, eras, wh, idx, t);
          });
          ctx.restore();
        }
      }
    });

    // 6) 自由探索开放海域西端 & 东端柔美低矮海角礁屿（平缓曲线自然落海、融入天雾，绝不切边也不遮挡满月！）
    if (window.MT.Config && window.MT.Config.EXPLORE_MODE) {
      var artC = window.MT.Art;
      var palC = state.eb ? state.eb.palette : window.MT.Config.ERAS[0].palette;
      var cTop = artC.lerpColor(palC.farSea, palC.skyMid, 0.35);
      var cMid = artC.lerpColor(palC.farSea, palC.midSeaMid, 0.45);
      var cBot = artC.lerpColor(palC.midSeaMid, palC.midSeaDeep, 0.62);
      var wcB = window.MT.Config.WORLD_CYCLE || { MIN_X: 160, MAX_X: 9840 };
      var abyssY2 = Math.max(320, viewBottom + 80);

      // 西端「暮光海角」：平缓柔美丘陵海角，向左无缝延展至视口之外，绝无截断硬边
      if (viewLeft < 340) {
        var farLeft = Math.min(-460, viewLeft - 140);
        ctx.save();
        var wCliffG = ctx.createLinearGradient(0, -135, 0, 120);
        wCliffG.addColorStop(0.0, artC.rgb(cTop, 0.92));
        wCliffG.addColorStop(0.55, artC.rgb(cMid, 0.96));
        wCliffG.addColorStop(1.0, artC.rgb(cBot, 1));
        ctx.fillStyle = wCliffG;
        ctx.beginPath();
        ctx.moveTo(farLeft, abyssY2);
        ctx.lineTo(farLeft, -92);
        ctx.quadraticCurveTo(-180, -132, -40, -112);
        ctx.quadraticCurveTo(64, -92, 138, -22);
        ctx.quadraticCurveTo(176, 18, 206, abyssY2);
        ctx.closePath();
        ctx.fill();

        // 柔和海面水雾过渡带
        var wMist = ctx.createRadialGradient(90, 0, 18, 90, 0, 160);
        wMist.addColorStop(0, artC.rgb(palC.haze, 0.24));
        wMist.addColorStop(1, artC.rgb(palC.haze, 0));
        ctx.fillStyle = wMist;
        ctx.beginPath(); ctx.ellipse(90, 6, 160, 56, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // 永久焕新后的灯塔港湾世界元素（万家暖串灯 + 升腾金色浮灯 + 港湾常驻伴游蓝鲸群）
      if (window.MT.Shrines && window.MT.Shrines.drawIlluminatedHarborWorld) {
        window.MT.Shrines.drawIlluminatedHarborWorld(ctx, state);
      }

      // 东端「远海望礁与航标浮灯」：彻底取代原先遮挡月亮的巨型切边石墙！
      // 改为低矮圆润的远海双礁小屿（自然弧线两侧落回海面，绝无垂直切口！）+ 随波微晃的温暖边界浮灯！
      if (viewRight > wcB.MAX_X - 280) {
        var ex = wcB.MAX_X;
        ctx.save();
        // 远层轻雾矮礁（半透明退入天际线，完全不挡满月！）
        ctx.fillStyle = artC.rgb(artC.lerpColor(palC.farSea, palC.haze, 0.32), 0.58);
        ctx.beginPath();
        ctx.moveTo(ex + 90, abyssY2);
        ctx.quadraticCurveTo(ex + 170, -56, ex + 265, -72);
        ctx.quadraticCurveTo(ex + 355, -82, ex + 445, -18);
        ctx.quadraticCurveTo(ex + 495, 16, ex + 520, abyssY2);
        ctx.closePath();
        ctx.fill();

        // 近层圆润低矮海礁小屿（最高仅 -44px，两侧柔美滑入海中，水彩绘本感十足！）
        var eReefG = ctx.createLinearGradient(0, -48, 0, 110);
        eReefG.addColorStop(0.0, artC.rgb(cTop, 0.88));
        eReefG.addColorStop(0.55, artC.rgb(cMid, 0.96));
        eReefG.addColorStop(1.0, artC.rgb(cBot, 1));
        ctx.fillStyle = eReefG;
        ctx.beginPath();
        ctx.moveTo(ex + 16, abyssY2);
        ctx.quadraticCurveTo(ex + 54, -18, ex + 124, -44);
        ctx.quadraticCurveTo(ex + 195, -58, ex + 266, -24);
        ctx.quadraticCurveTo(ex + 312, 4, ex + 340, abyssY2);
        ctx.closePath();
        ctx.fill();

        // 礁屿脚部柔和海雾羽化带
        var eMist = ctx.createRadialGradient(ex + 165, 2, 20, ex + 165, 2, 185);
        eMist.addColorStop(0, artC.rgb(palC.haze, 0.24));
        eMist.addColorStop(1, artC.rgb(palC.haze, 0));
        ctx.fillStyle = eMist;
        ctx.beginPath(); ctx.ellipse(ex + 165, 8, 185, 52, 0, 0, Math.PI * 2); ctx.fill();

        // 东海界温柔航标小灯（随波摇曳提示前方即是远洋边界）
        var bxE = ex + 44;
        var byE = eras.getSurfaceY(bxE, t);
        var bTilt = Math.sin(t * 2.0) * 0.08;
        ctx.save();
        ctx.translate(bxE, byE + 2);
        ctx.rotate(bTilt);
        ctx.fillStyle = '#4e4458';
        ctx.beginPath(); ctx.ellipse(0, 2, 16, 7, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#6c5e72';
        ctx.lineWidth = 2.0;
        ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -28); ctx.stroke();
        var lampGlowE = artC.getLampGlowSprite ? artC.getLampGlowSprite() : null;
        if (lampGlowE) {
          ctx.save();
          ctx.globalAlpha = 0.65 * (0.8 + 0.2 * Math.sin(t * 3.2));
          ctx.drawImage(lampGlowE, -26, -54, 52, 52);
          ctx.restore();
        }
        ctx.fillStyle = '#fff5d2';
        ctx.beginPath(); ctx.arc(0, -30, 3.0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // 东海湾「星潮跨海洋流门」（x=9640）：未全唤醒时为静默双石柱，唤醒 3 碑后绽放翡翠暖金极光星涡！
        var gxP = 9640;
        var gyP = eras.getSurfaceY(gxP, t);
        var gateOpen = !!((window.MT.Shop && window.MT.Shop.isFrostUnlocked && window.MT.Shop.isFrostUnlocked())
          || (window.MT.Shrines && window.MT.Shrines.isHarborIlluminated && window.MT.Shrines.isHarborIlluminated()));
        ctx.save();
        ctx.translate(gxP, gyP);

        if (gateOpen) {
          var pGlow = ctx.createRadialGradient(0, -46, 10, 0, -46, 132);
          pGlow.addColorStop(0.0, 'rgba(146, 250, 232, 0.44)');
          pGlow.addColorStop(0.5, 'rgba(255, 228, 154, 0.18)');
          pGlow.addColorStop(1.0, 'rgba(116, 214, 240, 0)');
          ctx.fillStyle = pGlow;
          ctx.beginPath(); ctx.arc(0, -46, 132, 0, Math.PI * 2); ctx.fill();
        }

        // 双古月石航门柱（底部延入海面以下，绝不悬空！）
        ctx.fillStyle = gateOpen ? '#3e5e78' : '#323c52';
        ctx.beginPath();
        ctx.moveTo(-60, 48); ctx.lineTo(-48, -86); ctx.quadraticCurveTo(-36, -104, -24, -82); ctx.lineTo(-32, 48); ctx.closePath();
        ctx.moveTo( 60, 48); ctx.lineTo( 48, -86); ctx.quadraticCurveTo( 36, -104,  24, -82); ctx.lineTo( 32, 48); ctx.closePath();
        ctx.fill();

        if (gateOpen) {
          for (var rg = 0; rg < 2; rg++) {
            ctx.strokeStyle = rg === 0 ? 'rgba(164, 254, 236, 0.78)' : 'rgba(255, 236, 174, 0.58)';
            ctx.lineWidth = rg === 0 ? 2.5 : 1.5;
            ctx.beginPath();
            ctx.arc(0, -46, 28 + rg * 11, t * (rg === 0 ? 1.5 : -1.1), t * (rg === 0 ? 1.5 : -1.1) + Math.PI * 1.45);
            ctx.stroke();
          }
        }
        ctx.restore();

        // 靠近已开启航门时的柔和进度圆环与微提示
        var bPortal = state.boat;
        if (gateOpen && bPortal && bPortal.inPortalZone === 'frost_sea') {
          var pp2 = bPortal.portalProg || 0;
          ctx.fillStyle = '#d4fff6';
          ctx.font = '500 12px "PingFang SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(pp2 > 0.08 ? '正在穿越星潮航门…' : '慢停或按 E 启航「霜穹冰海」', bPortal.x, bPortal.y - 92);
          if (pp2 > 0.02) {
            ctx.strokeStyle = '#9efce8';
            ctx.lineWidth = 3.2;
            ctx.beginPath(); ctx.arc(bPortal.x, bPortal.y - 70, 13, -Math.PI * 0.5, -Math.PI * 0.5 + pp2 * Math.PI * 2); ctx.stroke();
          }
        }

        ctx.restore();
      }
    }

    if (!window.MT.Config.EXPLORE_MODE && lastMode === 'story' && window.MT.Config.SINGLE_SCENE_MODE === 'moon_sea') {
      var beaconX = (window.MT.Config.SEA_VOYAGE && window.MT.Config.SEA_VOYAGE.DAWN_BEACON_X) || 26100;
      if (beaconX > viewLeft - 380 && beaconX < viewRight + 380 && cache.lighthouse) {
        var lhB = cache.lighthouse;
        ctx.save();
        var bx = beaconX + 120;
        // 温暖宏大的破晓圣光晕
        var dh = ctx.createRadialGradient(bx, -165, 16, bx, -165, 290);
        dh.addColorStop(0, 'rgba(255, 246, 206, 0.56)');
        dh.addColorStop(0.45, 'rgba(255, 214, 168, 0.22)');
        dh.addColorStop(1, 'rgba(255, 204, 162, 0)');
        ctx.fillStyle = dh;
        ctx.beginPath(); ctx.arc(bx, -165, 290, 0, Math.PI * 2); ctx.fill();

        // 温柔海角礁石底座
        var rockG = ctx.createLinearGradient(bx - 160, -24, bx + 160, 120);
        rockG.addColorStop(0, '#6a7c88');
        rockG.addColorStop(0.55, '#3b586e');
        rockG.addColorStop(1, '#1c3852');
        ctx.fillStyle = rockG;
        ctx.beginPath();
        ctx.moveTo(bx - 160, Math.max(240, viewBottom + 40));
        ctx.quadraticCurveTo(bx - 96, -12, bx - 16, -24);
        ctx.quadraticCurveTo(bx + 78, -28, bx + 175, 18);
        ctx.lineTo(bx + 190, Math.max(240, viewBottom + 40));
        ctx.closePath();
        ctx.fill();

        ctx.save();
        ctx.translate(bx, -10);
        ctx.scale(1.18, 1.18);
        ctx.drawImage(lhB.canvas, -lhB.anchorX, -lhB.anchorY);
        ctx.restore();
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // === 分层绘制 2：半透明深海内部（穿拱微光、巨水母沟、暗礁洋流、深海星珠、穿浪腹通道提示与深海遗物）===
  function drawUnderWater(ctx, state) {
    var eras = window.MT.Eras;
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    var seaMix = state.eb ? (state.eb.weights.moon_sea || 0) : 1;
    if (seaMix < 0.05) return;

    ctx.save();
    ctx.globalAlpha = seaMix;

    chunks.forEach(function (ch) {
      if (ch.x1 < viewLeft - 180 || ch.x0 > viewRight + 180) return;

      if (ch.type === 'viaduct' && ch.archTriggers) {
        ch.archTriggers.forEach(function (ar) {
          var ay = eras.getSurfaceY(ar.x, t) + 92;
          var ag = ctx.createRadialGradient(ar.x, ay, 4, ar.x, ay, 44);
          ag.addColorStop(0, ar.passed ? 'rgba(255, 236, 168, 0.32)' : 'rgba(136, 228, 255, 0.22)');
          ag.addColorStop(1, 'rgba(136, 228, 255, 0)');
          ctx.fillStyle = ag;
          ctx.beginPath(); ctx.arc(ar.x, ay, 44, 0, Math.PI * 2); ctx.fill();
        });
      }

      if (ch.type === 'jelly_trench') {
        var midX = (ch.x0 + ch.x1) * 0.5;
        var trenchG = ctx.createRadialGradient(midX, 115, 20, midX, 115, (ch.x1 - ch.x0) * 0.56);
        trenchG.addColorStop(0, 'rgba(72, 186, 228, 0.22)');
        trenchG.addColorStop(1, 'rgba(24, 68, 118, 0)');
        ctx.fillStyle = trenchG;
        ctx.fillRect(ch.x0 - 40, -10, (ch.x1 - ch.x0) + 80, 250);

        ch.jellies.forEach(function (jl) {
          var jy = eras.getSurfaceY(jl.x, t) + jl.depthRel + Math.sin(jl.phase) * 9;
          var contract = Math.sin(jl.phase);
          var rx = jl.radius * (1.06 - contract * 0.14);
          var ry = jl.radius * (0.78 + contract * 0.16);

          ctx.save();
          ctx.translate(jl.x, jy);
          var gRad = jl.radius * (2.2 + jl.flash * 0.8);
          var jg = ctx.createRadialGradient(0, -ry * 0.2, 3, 0, -ry * 0.2, gRad);
          jg.addColorStop(0, jl.hue + (0.42 + jl.flash * 0.34) + ')');
          jg.addColorStop(1, jl.hue + '0)');
          ctx.fillStyle = jg;
          ctx.beginPath(); ctx.arc(0, -ry * 0.2, gRad, 0, Math.PI * 2); ctx.fill();

          ctx.strokeStyle = jl.hue + '0.42)';
          ctx.lineWidth = 1.4;
          ctx.lineCap = 'round';
          for (var ti = -2; ti <= 2; ti++) {
            var tx0 = ti * rx * 0.34;
            var wv = Math.sin(jl.phase - 1.0 + ti) * 8;
            ctx.beginPath();
            ctx.moveTo(tx0, 2);
            ctx.quadraticCurveTo(tx0 + wv, ry * 1.1, tx0 - wv * 0.7, ry * 2.1);
            ctx.stroke();
          }

          var bellG = ctx.createRadialGradient(0, -ry * 0.45, 2, 0, -ry * 0.2, rx * 1.2);
          bellG.addColorStop(0, 'rgba(232, 252, 255, ' + (0.62 + jl.flash * 0.2) + ')');
          bellG.addColorStop(0.6, jl.hue + (0.46 + jl.flash * 0.22) + ')');
          bellG.addColorStop(1, jl.hue + '0.16)');
          ctx.fillStyle = bellG;
          ctx.beginPath();
          ctx.moveTo(-rx, 2);
          ctx.bezierCurveTo(-rx * 1.05, -ry * 1.15, rx * 1.05, -ry * 1.15, rx, 2);
          ctx.quadraticCurveTo(0, -4, -rx, 2);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = 'rgba(232, 252, 255, 0.68)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-rx * 0.86, 0);
          ctx.bezierCurveTo(-rx * 0.80, -ry * 0.96, rx * 0.80, -ry * 0.96, rx * 0.86, 0);
          ctx.stroke();
          ctx.restore();
        });
      }

      if (ch.type === 'reef_stream') {
        ctx.save();
        ctx.lineCap = 'round';
        var sGrad = ctx.createLinearGradient(ch.x0, 0, ch.x1, 0);
        sGrad.addColorStop(0.00, 'rgba(136, 236, 255, 0)');
        sGrad.addColorStop(0.14, 'rgba(154, 246, 255, 0.36)');
        sGrad.addColorStop(0.86, 'rgba(154, 246, 255, 0.36)');
        sGrad.addColorStop(1.00, 'rgba(136, 236, 255, 0)');
        for (var sl = -1; sl <= 1; sl++) {
          ctx.strokeStyle = sGrad;
          ctx.lineWidth = sl === 0 ? 4.2 : 1.8;
          ctx.beginPath();
          for (var s = 0; s <= 18; s++) {
            var u = s / 18;
            var sx = ch.x0 + u * (ch.x1 - ch.x0);
            var sy = eras.getSurfaceY(sx, t) + ch.streamDepth + sl * 15 + Math.sin(u * 10 - t * 6.0 + sl) * 5.5;
            if (s === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        }
        for (var ar = 0; ar < 4; ar++) {
          var au = ((t * 0.62 + ar * 0.25) % 1);
          var ax = ch.x0 + au * (ch.x1 - ch.x0);
          var ay = eras.getSurfaceY(ax, t) + ch.streamDepth;
          ctx.strokeStyle = 'rgba(224, 252, 255, ' + (Math.sin(au * Math.PI) * 0.62) + ')';
          ctx.lineWidth = 2.0;
          ctx.beginPath(); ctx.moveTo(ax - 7, ay - 6); ctx.lineTo(ax + 4, ay); ctx.lineTo(ax - 7, ay + 6); ctx.stroke();
        }
        ctx.restore();
      }

      if (ch.deepPearls && ch.deepPearls.length > 0) {
        ch.deepPearls.forEach(function (dp) {
          if (dp.collected || dp.x < viewLeft - 40 || dp.x > viewRight + 40) return;
          var sy = eras.getSurfaceY(dp.x, t) + dp.depthRel + Math.sin(dp.phase) * 4;
          var tw = 0.78 + 0.22 * Math.sin(dp.phase * 1.4);
          var gr = 20 * tw;
          var g = ctx.createRadialGradient(dp.x, sy, 1, dp.x, sy, gr);
          g.addColorStop(0, 'rgba(224, 252, 255, 0.94)');
          g.addColorStop(0.45, 'rgba(124, 218, 255, 0.42)');
          g.addColorStop(1, 'rgba(124, 218, 255, 0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(dp.x, sy, gr, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ebfcff';
          ctx.beginPath(); ctx.arc(dp.x, sy, 3.8 * tw, 0, Math.PI * 2); ctx.fill();
        });
      }
    });

    // 真实变形巨浪内部透光薄水晕 + 浪腹水下漩涡通道（被主海面自然裁切，100% 融为一体！）
    if (tidalWalls.length > 0) {
      tidalWalls.forEach(function (wl) {
        if (wl.x < viewLeft - 280 || wl.x > viewRight + 280) return;
        var crestY = eras.getSurfaceY(wl.x, t);

        // 1) 真实浪峰内部的清透青翠透光薄水层
        var transG = ctx.createRadialGradient(wl.x - 12, crestY + 34, 8, wl.x, crestY + 52, 130);
        transG.addColorStop(0.00, 'rgba(196, 248, 244, 0.38)');
        transG.addColorStop(0.50, 'rgba(92, 192, 214, 0.16)');
        transG.addColorStop(1.00, 'rgba(42, 86, 128, 0)');
        ctx.fillStyle = transG;
        ctx.beginPath(); ctx.arc(wl.x, crestY + 52, 130, 0, Math.PI * 2); ctx.fill();

        // 2) 浪腹水下青金加速漩涡流（清晰提示：按住 D 潜穿这里能极速充能爆发！）
        var vortY = crestY + wl.height + 54;
        var tg = ctx.createRadialGradient(wl.x, vortY, 10, wl.x, vortY, 72);
        tg.addColorStop(0, wl.state === 'cleared' ? 'rgba(255, 238, 168, 0.30)' : 'rgba(128, 242, 255, 0.30)');
        tg.addColorStop(1, 'rgba(128, 242, 255, 0)');
        ctx.fillStyle = tg;
        ctx.beginPath(); ctx.arc(wl.x, vortY, 72, 0, Math.PI * 2); ctx.fill();

        if (wl.state === 'active') {
          ctx.strokeStyle = 'rgba(218, 252, 255, 0.62)';
          ctx.lineWidth = 2.0;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(wl.x - 12, vortY - 7); ctx.lineTo(wl.x, vortY); ctx.lineTo(wl.x - 12, vortY + 7);
          ctx.moveTo(wl.x + 2, vortY - 7); ctx.lineTo(wl.x + 14, vortY); ctx.lineTo(wl.x + 2, vortY + 7);
          ctx.stroke();
        }
      });
    }

    relics.forEach(function (rel) {
      if (rel.yMode !== 'depth' || rel.pickedThisRun) return;
      if (rel.x < viewLeft - 90 || rel.x > viewRight + 90) return;
      var ry = eras.getSurfaceY(rel.x, t) + rel.yVal + Math.sin(rel.phase) * 5;
      drawRelicArtifact(ctx, rel, rel.x, ry, t);
    });

    // 委派落月撞击后深海地貌、沸海顶盖、灰海浑水与沉船气室绘制
    if (window.MT.Abyss && window.MT.Abyss.drawUnderWater) {
      window.MT.Abyss.drawUnderWater(ctx, state);
    }

    // 开放海域东/西边界可视化「远洋回流洋流」（顺水下礁坡卷涌的水彩流丝与微泡，直观传达边界推力！）
    if (window.MT.Config && window.MT.Config.EXPLORE_MODE) {
      var wcV = window.MT.Config.WORLD_CYCLE || { MIN_X: 160, MAX_X: 9840 };
      if (viewRight > wcV.MAX_X - 280) {
        var exC = wcV.MAX_X;
        ctx.save();
        ctx.lineCap = 'round';
        // 纯径向羽化柔雾光晕（彻底零矩形硬边！）
        var eMistG = ctx.createRadialGradient(exC - 20, 190, 18, exC - 20, 190, 175);
        eMistG.addColorStop(0.0, 'rgba(148, 232, 250, 0.16)');
        eMistG.addColorStop(0.6, 'rgba(122, 208, 236, 0.06)');
        eMistG.addColorStop(1.0, 'rgba(122, 208, 236, 0)');
        ctx.fillStyle = eMistG;
        ctx.beginPath(); ctx.arc(exC - 20, 190, 175, 0, Math.PI * 2); ctx.fill();

        for (var ci = 0; ci < 5; ci++) {
          var cyBase = 48 + ci * 62;
          var cg = ctx.createLinearGradient(exC + 68, cyBase, exC - 165, cyBase);
          cg.addColorStop(0.0, 'rgba(186, 246, 255, 0)');
          cg.addColorStop(0.45, 'rgba(186, 246, 255, 0.40)');
          cg.addColorStop(1.0, 'rgba(156, 232, 252, 0)');
          ctx.strokeStyle = cg;
          ctx.lineWidth = ci % 2 === 0 ? 2.5 : 1.5;
          ctx.beginPath();
          for (var s = 0; s <= 10; s++) {
            var u = s / 10;
            var lx = (exC + 68) - u * 230;
            var ly = cyBase + Math.sin(u * 6.5 + t * 3.8 + ci * 1.3) * 10;
            if (s === 0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
          }
          ctx.stroke();
        }
        for (var bi = 0; bi < 8; bi++) {
          var bu = ((t * 0.55 + bi / 8) % 1);
          var bx2 = (exC + 46) - bu * 195;
          var by2 = 52 + (bi % 4) * 74 + Math.sin(bu * 9 + bi) * 14;
          ctx.strokeStyle = 'rgba(218, 250, 255, ' + (Math.sin(bu * Math.PI) * 0.65) + ')';
          ctx.lineWidth = 1.15;
          ctx.beginPath(); ctx.arc(bx2, by2, 1.8 + (bi % 3) * 0.9, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      }
      if (viewLeft < wcV.MIN_X + 200) {
        var wxC = wcV.MIN_X;
        ctx.save();
        ctx.lineCap = 'round';
        for (var wi = 0; wi < 4; wi++) {
          var wyBase = 52 + wi * 58;
          var wg = ctx.createLinearGradient(wxC - 60, wyBase, wxC + 140, wyBase);
          wg.addColorStop(0.0, 'rgba(232, 224, 198, 0)');
          wg.addColorStop(0.45, 'rgba(202, 238, 252, 0.30)');
          wg.addColorStop(1.0, 'rgba(182, 228, 248, 0)');
          ctx.strokeStyle = wg;
          ctx.lineWidth = 1.9;
          ctx.beginPath();
          for (var ws = 0; ws <= 8; ws++) {
            var wu = ws / 8;
            var wlx = (wxC - 50) + wu * 185;
            var wly = wyBase + Math.sin(wu * 5.5 - t * 3.4 + wi) * 8;
            if (ws === 0) ctx.moveTo(wlx, wly); else ctx.lineTo(wlx, wly);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    ctx.restore();
  }

  function drawRelicArtifact(ctx, rel, x, y, t) {
    var owned = window.MT.Shop && window.MT.Shop.hasRelic && window.MT.Shop.hasRelic('moon_sea', rel.id);
    var breathe = 0.88 + 0.12 * Math.sin(t * 2.8 + rel.phase);
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = owned ? 0.44 : 0.96;

    var halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 44 * breathe);
    halo.addColorStop(0, owned ? 'rgba(196, 232, 255, 0.56)' : 'rgba(255, 244, 188, 0.78)');
    halo.addColorStop(0.48, owned ? 'rgba(148, 208, 255, 0.22)' : 'rgba(176, 238, 255, 0.30)');
    halo.addColorStop(1, 'rgba(176, 238, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, 44 * breathe, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.rotate(t * 0.7);
    ctx.strokeStyle = owned ? 'rgba(210, 238, 255, 0.48)' : 'rgba(255, 236, 178, 0.72)';
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(0, 0, 16, 0.25, Math.PI * 1.75); ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = owned ? '#cdeeff' : '#ffeaa8';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 1, 9.5, Math.PI * 0.12, Math.PI * 0.88);
    ctx.stroke();

    var coreG = ctx.createRadialGradient(-1, -2, 1, 0, -1, 7);
    coreG.addColorStop(0, '#ffffff');
    coreG.addColorStop(0.6, owned ? '#aee4ff' : '#ffe89c');
    coreG.addColorStop(1, owned ? 'rgba(150, 218, 255, 0)' : 'rgba(255, 206, 120, 0)');
    ctx.fillStyle = coreG;
    ctx.beginPath(); ctx.arc(0, -1, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // === 分层绘制 3：海面之上的前景细饰（桥面月光边与吊灯、木栈桥面、摆动古铜钟、轻盈波沫、陨星与空中星火/遗物）===
  function drawWorldStructures(ctx, state) {
    var eras = window.MT.Eras;
    var lampGlow = window.MT.Art.getLampGlowSprite ? window.MT.Art.getLampGlowSprite() : null;
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    var seaMix = state.eb ? (state.eb.weights.moon_sea || 0) : 1;
    if (seaMix < 0.05) return;

    ctx.save();
    ctx.globalAlpha = seaMix;

    chunks.forEach(function (ch) {
      if (ch.x1 < viewLeft - 220 || ch.x0 > viewRight + 220) return;

      // 1) 高架桥桥面顶光沿与铁艺弯钩吊灯
      if (ch.type === 'viaduct') {
        var dk = ch.deck;
        var span = (ch.x1 - ch.x0) / ch.arches;

        ctx.strokeStyle = 'rgba(248, 224, 186, 0.72)';
        ctx.lineWidth = 2.8;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(dk.x0, dk.y0 - 1.5); ctx.lineTo(dk.x1, dk.y1 - 1.5); ctx.stroke();

        for (var lm = 1; lm < ch.arches; lm++) {
          var lx = ch.x0 + lm * span;
          var ly = getDeckY(dk, lx);
          var sway = Math.sin(t * 2.1 + lm * 1.9 + ch.phase) * 2.2;

          ctx.strokeStyle = '#332e4a';
          ctx.lineWidth = 1.9;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(lx, ly - 1);
          ctx.lineTo(lx, ly - 32);
          ctx.quadraticCurveTo(lx, ly - 40, lx + 9, ly - 38);
          ctx.stroke();

          var hx = lx + 9 + sway * 0.4;
          var hy = ly - 32;
          if (lampGlow) {
            ctx.save();
            ctx.globalAlpha = seaMix * 0.65;
            ctx.drawImage(lampGlow, hx - 34, hy - 34, 68, 68);
            ctx.restore();
          }
          ctx.fillStyle = '#fff5d4';
          ctx.beginPath(); ctx.ellipse(hx, hy, 3.0, 4.2, sway * 0.05, 0, Math.PI * 2); ctx.fill();
        }
      }

      // 2) 弧石灯塔码头顶沿暖月石边 + 端头铁艺海港暖灯 + 西端实体系缆泊桩与慢停进度环！
      if (ch.type === 'lighthouse_pier' && ch.deck) {
        if (window.MT.Config && window.MT.Config.EXPLORE_MODE) {
          var postX = 485;
          var postSurf = eras.getSurfaceY(postX, t);
          var boatRef = state.boat;
          var nearHarbor = boatRef && boatRef.inHarborZone;
          var moorP = (boatRef && boatRef.harborMoorProg) || 0;

          ctx.save();
          var hPulse = 0.65 + 0.35 * Math.sin(t * 2.4);
          var ringW = nearHarbor ? 68 : 54;
          ctx.strokeStyle = nearHarbor ? ('rgba(255, 232, 168, ' + (0.62 * hPulse) + ')') : 'rgba(244, 218, 178, 0.30)';
          ctx.lineWidth = nearHarbor ? 2.2 : 1.5;
          ctx.beginPath();
          ctx.ellipse(postX, postSurf + 2, ringW, 11, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#5c3f32';
          ctx.fillRect(postX - 5, postSurf - 34, 10, 44);
          ctx.strokeStyle = '#d4b48a';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(postX - 7, postSurf - 22); ctx.lineTo(postX + 7, postSurf - 22);
          ctx.moveTo(postX - 6, postSurf - 17); ctx.lineTo(postX + 6, postSurf - 17);
          ctx.stroke();

          if (lampGlow) {
            ctx.save();
            ctx.globalAlpha = seaMix * (nearHarbor ? 0.85 : 0.52);
            ctx.drawImage(lampGlow, postX - 38, postSurf - 72, 76, 76);
            ctx.restore();
          }
          ctx.fillStyle = '#fff5d2';
          ctx.beginPath(); ctx.arc(postX, postSurf - 38, 3.4, 0, Math.PI * 2); ctx.fill();

          if (nearHarbor && boatRef) {
            var bxH = boatRef.x, byH = boatRef.y - 84;
            ctx.fillStyle = 'rgba(255, 244, 214, 0.92)';
            ctx.font = '500 11.5px "PingFang SC", "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(moorP > 0.08 ? '正在系缆入港…' : '慢停或按 E 泊港整备', bxH, byH - 16);

            if (moorP > 0.02) {
              ctx.strokeStyle = 'rgba(255, 232, 168, 0.24)';
              ctx.lineWidth = 2.8;
              ctx.beginPath(); ctx.arc(bxH, byH + 6, 13, 0, Math.PI * 2); ctx.stroke();

              ctx.strokeStyle = '#ffe89c';
              ctx.lineWidth = 3.2;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.arc(bxH, byH + 6, 13, -Math.PI * 0.5, -Math.PI * 0.5 + moorP * Math.PI * 2);
              ctx.stroke();
            }
          }
          ctx.restore();
        }
        var pk = ch.deck;
        var wMidX = (pk.x0 + pk.x1) * 0.5;
        ctx.strokeStyle = 'rgba(248, 226, 188, 0.78)';
        ctx.lineWidth = 3.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pk.x0, pk.y0 - 1.5);
        ctx.quadraticCurveTo(wMidX, pk.cy - 1.5, pk.x1, pk.y1 - 1.5);
        ctx.stroke();

        // 码头最高端点的温暖铁艺提灯（引导视觉自然滑向跳台起飞点！）
        var lx = pk.x1 - 10, ly = pk.y1;
        var sway = Math.sin(t * 2.2 + ch.phase) * 2.0;
        ctx.strokeStyle = '#36304c';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(lx, ly - 1); ctx.lineTo(lx, ly - 32);
        ctx.quadraticCurveTo(lx, ly - 40, lx + 9, ly - 38);
        ctx.stroke();

        var hx = lx + 9 + sway * 0.4, hy = ly - 32;
        if (lampGlow) {
          ctx.save();
          ctx.globalAlpha = seaMix * 0.72;
          ctx.drawImage(lampGlow, hx - 36, hy - 36, 72, 72);
          ctx.restore();
        }
        ctx.fillStyle = '#fff5d4';
        ctx.beginPath(); ctx.ellipse(hx, hy, 3.2, 4.4, sway * 0.05, 0, Math.PI * 2); ctx.fill();
      }

      // 3) 沉海钟楼摆动古铜钟：使用与倾斜石塔完全一致的局部坐标系，精准垂挂于钟室拱顶木梁正中！
      if (ch.type === 'bell_tower') {
        var swingAng = Math.sin(t * 13) * ch.bellSwing * 0.44 + Math.sin(t * 1.1 + ch.phase) * 0.035;
        ctx.save();
        ctx.translate(ch.towerX, 18);
        ctx.rotate(-0.042);
        // 拱顶木横梁正中挂点 local (0, -158)
        ctx.translate(0, -158);
        ctx.rotate(0.042 + swingAng); // 受重力竖直下垂并自然摆动

        // 铁艺短挂链
        ctx.strokeStyle = '#4c3e36';
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 6); ctx.stroke();

        // 精巧温润的古铜钟（完整居中嵌于深蓝钟室拱腔内，绝不错位压石墙！）
        var bellG = ctx.createLinearGradient(-10, 6, 11, 24);
        bellG.addColorStop(0.00, ch.bellRung ? '#d4a65a' : '#826b56');
        bellG.addColorStop(0.55, ch.bellRung ? '#f4d282' : '#c09e6e');
        bellG.addColorStop(1.00, ch.bellRung ? '#fff3be' : '#e4c698');
        ctx.fillStyle = bellG;
        ctx.beginPath();
        ctx.moveTo(-5.2, 6);
        ctx.bezierCurveTo(-8.8, 8, -8.2, 16, -11.5, 22);
        ctx.quadraticCurveTo(0, 24.5, 11.5, 22);
        ctx.bezierCurveTo(8.2, 16, 8.8, 8, 5.2, 6);
        ctx.quadraticCurveTo(0, 3.5, -5.2, 6);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(38, 28, 24, 0.46)';
        ctx.beginPath(); ctx.ellipse(0, 22.4, 8.8, 1.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = ch.bellRung ? '#fff2b2' : '#d2af7e';
        ctx.beginPath(); ctx.arc(0, 24.2, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        if (ch.ringWave > 0.02) {
          var rxW = typeof ch.bellX === 'number' ? ch.bellX : (ch.towerX - 6.2);
          var rRad = 26 + (1 - ch.ringWave) * 155;
          ctx.strokeStyle = 'rgba(255, 238, 174, ' + (ch.ringWave * 0.72) + ')';
          ctx.lineWidth = 2.6;
          ctx.beginPath(); ctx.arc(rxW, ch.bellY, rRad, 0, Math.PI * 2); ctx.stroke();
        }
        drawSubtleWaveSpray(ctx, ch.towerX, eras.getSurfaceY(ch.towerX, t), 34, t, ch.id + 3.3);
      }

      // 4) 暗礁水线处轻盈碎浪珠（零大白椭圆）
      if (ch.type === 'reef_stream' && ch.spires) {
        ch.spires.forEach(function (sp, idx) {
          drawSubtleWaveSpray(ctx, sp.x, eras.getSurfaceY(sp.x, t), sp.w * 0.9, t, ch.id + idx * 4.1);
        });
      }

      // 5) 区块上层空中星火弧
      if (ch.airStars) {
        ch.airStars.forEach(function (as) {
          if (as.collected || as.x < viewLeft - 40 || as.x > viewRight + 40) return;
          var ay = as.y + Math.sin(as.phase) * 3.5;
          var tw = 0.76 + 0.24 * Math.sin(t * 4.2 + as.phase);
          var g = ctx.createRadialGradient(as.x, ay, 1, as.x, ay, 19 * tw);
          g.addColorStop(0, 'rgba(255, 246, 210, 0.92)');
          g.addColorStop(0.45, 'rgba(255, 214, 134, 0.36)');
          g.addColorStop(1, 'rgba(255, 204, 118, 0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(as.x, ay, 19 * tw, 0, Math.PI * 2); ctx.fill();

          ctx.fillStyle = '#fff9e4';
          ctx.beginPath();
          for (var s = 0; s < 8; s++) {
            var r = s % 2 === 0 ? (6.8 * tw) : (2.1 * tw);
            var ang = (s * Math.PI) / 4;
            if (s === 0) ctx.moveTo(as.x + Math.cos(ang) * r, ay + Math.sin(ang) * r);
            else ctx.lineTo(as.x + Math.cos(ang) * r, ay + Math.sin(ang) * r);
          }
          ctx.closePath(); ctx.fill();
        });
      }
    });

    // 5a) 高空月雾云带（纯径向羽化柔云）& 旋转金色云间星环！
    if (cloudBanks.length > 0) {
      cloudBanks.forEach(function (cb) {
        if (cb.x1 < viewLeft - 180 || cb.x0 > viewRight + 180) return;
        var span = cb.x1 - cb.x0;
        var puffCnt = 6;
        for (var cp = 0; cp < puffCnt; cp++) {
          var cu = cp / (puffCnt - 1);
          var px = cb.x0 + cu * span + Math.sin(t * 0.9 + cp * 1.4 + cb.phase) * 8;
          var py = cb.y + Math.sin(cu * Math.PI * 2 + cb.phase) * 10;
          var prX = 76 + Math.sin(cu * Math.PI) * 44;
          var prY = 26 + Math.sin(cu * Math.PI) * 14;
          ctx.save();
          ctx.translate(px, py);
          ctx.scale(prX, prY);
          var cg = ctx.createRadialGradient(0, -0.2, 0.06, 0, 0, 1.0);
          cg.addColorStop(0.00, 'rgba(244, 250, 255, 0.36)');
          cg.addColorStop(0.55, 'rgba(198, 228, 248, 0.16)');
          cg.addColorStop(1.00, 'rgba(176, 212, 244, 0)');
          ctx.fillStyle = cg;
          ctx.beginPath(); ctx.arc(0, 0, 1.0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }

        // 云间金色星环（清晰优雅的细双弧星门，引导玩家穿环飙分！）
        cb.rings.forEach(function (rg) {
          var rgy = rg.y + Math.sin(t * 2.4 + rg.phase) * 5;
          var fadeR = rg.passed ? (rg.flash * 0.85) : 0.92;
          if (fadeR <= 0.02) return;
          ctx.save();
          ctx.translate(rg.x, rgy);
          ctx.globalAlpha = seaMix * fadeR;

          var rad = rg.passed ? (30 + (1 - rg.flash) * 34) : 28;
          var halo = ctx.createRadialGradient(0, 0, rad * 0.4, 0, 0, rad * 1.7);
          halo.addColorStop(0, 'rgba(255, 244, 192, 0.28)');
          halo.addColorStop(1, 'rgba(182, 232, 255, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath(); ctx.arc(0, 0, rad * 1.7, 0, Math.PI * 2); ctx.fill();

          ctx.strokeStyle = '#ffeaa4';
          ctx.lineWidth = rg.passed ? 3.2 : 2.2;
          ctx.beginPath(); ctx.ellipse(0, 0, rad * 0.48, rad, 0.12, 0, Math.PI * 2); ctx.stroke();

          ctx.strokeStyle = 'rgba(220, 248, 255, 0.65)';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.ellipse(0, 0, rad * 0.36, rad * 0.84, 0.12, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        });
      });
    }

    // 5a2) 海面可破水撞碎漂浮残木/断桅浮障（随波倾摇、贴合海面，破水直碎迸木片！）
    if (floatingHazards.length > 0) {
      floatingHazards.forEach(function (fh) {
        if (fh.smashed || fh.x < viewLeft - 120 || fh.x > viewRight + 120) return;
        var fSurf = eras.getSurfaceY(fh.x, t);
        var fSlope = Math.atan(eras.getSurfaceSlope(fh.x, t)) * 0.85;
        var bob = Math.sin(fh.phase) * 3.5;

        ctx.save();
        ctx.translate(fh.x, fSurf + bob);
        ctx.rotate(fSlope + Math.sin(fh.phase * 0.7) * 0.06);

        if (fh.kind === 'driftwood_mast') {
          // 半沉手绘残木筏与歪斜断桅（风化旧木暖褐 + 破旧米白残帆带）
          ctx.fillStyle = '#5e3d2e';
          ctx.beginPath();
          ctx.moveTo(-42, 6); ctx.lineTo(-36, -6); ctx.lineTo(38, -5); ctx.lineTo(44, 6);
          ctx.quadraticCurveTo(0, 14, -42, 6);
          ctx.closePath(); ctx.fill();

          ctx.strokeStyle = 'rgba(232, 198, 162, 0.45)';
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(-34, -5); ctx.lineTo(36, -4); ctx.stroke();

          // 歪斜断桅杆与飘动碎帆布
          ctx.strokeStyle = '#4c3228';
          ctx.lineWidth = 4.2;
          ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(10, -44); ctx.stroke();

          var sailFlap = Math.sin(t * 4.5 + fh.phase) * 4;
          ctx.fillStyle = 'rgba(232, 218, 196, 0.72)';
          ctx.beginPath();
          ctx.moveTo(8, -40);
          ctx.quadraticCurveTo(-14, -30 + sailFlap, -22, -16 + sailFlap * 0.6);
          ctx.quadraticCurveTo(-4, -18, 4, -22);
          ctx.closePath(); ctx.fill();
        } else {
          // 锈铁旧锚浮筒（柔和低饱和海港暗铜 + 顶部微亮小警示灯）
          ctx.fillStyle = '#5a4146';
          ctx.beginPath();
          ctx.ellipse(0, 2, 30, 12, 0, Math.PI, 0);
          ctx.quadraticCurveTo(0, 14, -30, 2);
          ctx.closePath(); ctx.fill();

          ctx.strokeStyle = '#382a34';
          ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(0, -34); ctx.lineTo(10, -8); ctx.stroke();

          var blink = 0.55 + 0.45 * Math.sin(t * 5.2 + fh.phase);
          var bg2 = ctx.createRadialGradient(0, -36, 1, 0, -36, 18);
          bg2.addColorStop(0, 'rgba(255, 218, 148, ' + (0.78 * blink) + ')');
          bg2.addColorStop(1, 'rgba(255, 168, 96, 0)');
          ctx.fillStyle = bg2;
          ctx.beginPath(); ctx.arc(0, -36, 18, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff0c4';
          ctx.beginPath(); ctx.arc(0, -36, 2.8, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
      });
    }

    // 5b) 第 3 幕真实物理变形巨浪顶部的清脆手绘卷沫与飞溅水珠（零模糊棉花球！）
    if (tidalWalls.length > 0) {
      tidalWalls.forEach(function (wl) {
        if (wl.x < viewLeft - 240 || wl.x > viewRight + 240) return;
        drawRogueCrestFoam(ctx, eras, wl, t);
      });
    }

    // 6) 第 3 幕高潮：柔和流星轨迹预警 & 落月碎屑（去掉机械虚线，改用柔光流星尾痕 + 海面柔涟漪！）
    if (moonDebris.length > 0) {
      moonDebris.forEach(function (db) {
        if (db.targetX < viewLeft - 240 || db.targetX > viewRight + 320) return;
        var dSurf = eras.getSurfaceY(db.targetX, t);

        if (db.state === 'telegraph') {
          var urg = 1 - (db.telegraph / db.maxTelegraph);
          var blink = 0.62 + 0.38 * Math.sin(t * (9 + urg * 14));
          ctx.save();
          // 柔和羽化流星光带（非机械虚线）
          var tg = ctx.createLinearGradient(db.startX, db.startY, db.targetX, dSurf);
          tg.addColorStop(0.00, 'rgba(255, 212, 146, 0)');
          tg.addColorStop(0.65, 'rgba(255, 196, 120, ' + (0.14 + urg * 0.18) + ')');
          tg.addColorStop(1.00, 'rgba(255, 232, 166, ' + (0.36 * blink) + ')');
          ctx.strokeStyle = tg;
          ctx.lineWidth = 4.0 + urg * 4.5;
          ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(db.startX, db.startY); ctx.lineTo(db.targetX, dSurf); ctx.stroke();

          // 海面柔和暖金落点光晕
          var spotR = 16 + (1 - urg) * 26;
          var sg2 = ctx.createRadialGradient(db.targetX, dSurf, 2, db.targetX, dSurf, spotR);
          sg2.addColorStop(0, 'rgba(255, 234, 168, ' + (0.64 * blink) + ')');
          sg2.addColorStop(1, 'rgba(255, 178, 96, 0)');
          ctx.fillStyle = sg2;
          ctx.beginPath(); ctx.ellipse(db.targetX, dSurf, spotR, spotR * 0.36, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        } else if (db.state === 'falling') {
          var u = clamp(db.fallProg, 0, 1);
          var fx = db.startX + (db.targetX - db.startX) * u;
          var fy = db.startY + (dSurf - db.startY) * u;
          ctx.save();
          var tail = ctx.createLinearGradient(fx, fy, fx + 95, fy - 180);
          tail.addColorStop(0, 'rgba(255, 240, 184, 0.92)');
          tail.addColorStop(0.45, 'rgba(255, 142, 68, 0.52)');
          tail.addColorStop(1, 'rgba(255, 96, 48, 0)');
          ctx.strokeStyle = tail;
          ctx.lineWidth = db.radius * 1.15;
          ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + 95, fy - 180); ctx.stroke();

          ctx.fillStyle = '#fff5d2';
          ctx.beginPath(); ctx.arc(fx, fy, db.radius * 0.65, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        } else if (db.state === 'splashed') {
          var sf = clamp(db.splashLife / 0.65, 0, 1);
          var sh = 105 * (1 - sf * 0.35);
          var sg = ctx.createRadialGradient(db.targetX, dSurf - sh * 0.3, 6, db.targetX, dSurf - sh * 0.3, 64);
          sg.addColorStop(0, 'rgba(255, 244, 210, ' + (sf * 0.72) + ')');
          sg.addColorStop(0.55, 'rgba(255, 168, 92, ' + (sf * 0.34) + ')');
          sg.addColorStop(1, 'rgba(255, 168, 92, 0)');
          ctx.fillStyle = sg;
          ctx.beginPath(); ctx.ellipse(db.targetX, dSurf - sh * 0.32, 46, sh * 0.7, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        }
      });
    }

    // 空中遗物
    relics.forEach(function (rel) {
      if (rel.yMode !== 'air' || rel.pickedThisRun) return;
      if (rel.x < viewLeft - 90 || rel.x > viewRight + 90) return;
      drawRelicArtifact(ctx, rel, rel.x, rel.yVal + Math.sin(rel.phase) * 5, t);
    });

    ctx.restore();
  }

  // === 分层绘制 4：木舟之前的前景海水薄纱、上升气泡与破水浪幕 ===
  function drawWorldFront(ctx, state) {
    var eras = window.MT.Eras;
    var boat = state.boat;
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    var viewBottom = state.viewBottom;

    if (boat && boat.isDiving && boat.submergeDepth > 4) {
      var depthAlpha = clamp(boat.submergeDepth / 95, 0.18, 0.42);
      var startX = Math.floor((boat.x - 180) / 18) * 18;
      var endX = boat.x + 180;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(startX, eras.getSurfaceY(startX, t));
      for (var wx = startX + 18; wx <= endX; wx += 18) ctx.lineTo(wx, eras.getSurfaceY(wx, t));
      ctx.lineTo(endX, viewBottom);
      ctx.lineTo(startX, viewBottom);
      ctx.closePath();
      ctx.clip();

      var veil = ctx.createRadialGradient(boat.x, boat.y, 12, boat.x, boat.y, 130);
      veil.addColorStop(0, 'rgba(28, 72, 114, ' + (depthAlpha * 0.72) + ')');
      veil.addColorStop(1, 'rgba(14, 38, 72, 0)');
      ctx.fillStyle = veil;
      ctx.fillRect(boat.x - 140, boat.y - 120, 280, 240);

      ctx.strokeStyle = 'rgba(182, 236, 255, ' + (depthAlpha * 0.55) + ')';
      ctx.lineWidth = 1.6;
      for (var c = -1; c <= 1; c++) {
        var cy = boat.y - 16 + c * 15 + Math.sin(t * 6 + c * 2) * 3;
        ctx.beginPath();
        ctx.moveTo(boat.x - 36, cy);
        ctx.quadraticCurveTo(boat.x, cy - 5, boat.x + 38, cy + 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (bubbles.length > 0) {
      ctx.save();
      for (var i = 0; i < bubbles.length; i++) {
        var bub = bubbles[i];
        if (bub.x < viewLeft - 20 || bub.x > viewRight + 20) continue;
        var a = clamp(bub.life / 0.5, 0, 1) * 0.76;
        ctx.strokeStyle = 'rgba(210, 244, 255, ' + a + ')';
        ctx.fillStyle = 'rgba(162, 224, 255, ' + (a * 0.24) + ')';
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.arc(bub.x, bub.y, bub.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, ' + (a * 0.9) + ')';
        ctx.beginPath(); ctx.arc(bub.x - bub.r * 0.34, bub.y - bub.r * 0.34, Math.max(0.6, bub.r * 0.26), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // 破水撞碎浮障后漫天飞旋的手绘木片与碎屑
    if (splinters.length > 0) {
      ctx.save();
      for (var si = 0; si < splinters.length; si++) {
        var spt = splinters[si];
        if (spt.x < viewLeft - 40 || spt.x > viewRight + 40) continue;
        ctx.save();
        ctx.globalAlpha = clamp(spt.life / 0.45, 0, 1);
        ctx.translate(spt.x, spt.y);
        ctx.rotate(spt.ang);
        ctx.fillStyle = spt.col;
        ctx.fillRect(-spt.w * 0.5, -spt.h * 0.5, spt.w, spt.h);
        ctx.restore();
      }
      ctx.restore();
    }

    // 深潜鱼鳍「炸浪冲击波」& 潮汐声呐流主动扫描波纹
    if (shockwaves.length > 0) {
      ctx.save();
      shockwaves.forEach(function (sw) {
        var a = clamp(sw.life / sw.maxLife, 0, 1);
        ctx.strokeStyle = 'rgba(182, 246, 255, ' + (a * 0.85) + ')';
        ctx.lineWidth = 4.5 * a;
        ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2); ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 236, 168, ' + (a * 0.55) + ')';
        ctx.lineWidth = 2.0 * a;
        ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r * 0.82, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.restore();
    }

    if (sonarWaves.length > 0) {
      ctx.save();
      sonarWaves.forEach(function (sn) {
        var a = clamp(sn.life / sn.maxLife, 0, 1);
        if (sn.active) {
          // 轻盈通透的水彩水波声呐涟漪（克制柔美，绝不喧宾夺主！）
          var gRing = ctx.createRadialGradient(sn.x, sn.y, Math.max(2, sn.r - 30), sn.x, sn.y, sn.r + 12);
          gRing.addColorStop(0.0, 'rgba(136, 242, 255, 0)');
          gRing.addColorStop(0.68, 'rgba(176, 246, 255, ' + (a * 0.14) + ')');
          gRing.addColorStop(1.0, 'rgba(255, 242, 198, 0)');
          ctx.fillStyle = gRing;
          ctx.beginPath(); ctx.arc(sn.x, sn.y, sn.r + 12, 0, Math.PI * 2); ctx.fill();

          ctx.strokeStyle = 'rgba(202, 252, 255, ' + (a * 0.44) + ')';
          ctx.lineWidth = 1.6 * a + 0.6;
          ctx.beginPath(); ctx.arc(sn.x, sn.y, sn.r, 0, Math.PI * 2); ctx.stroke();

          ctx.strokeStyle = 'rgba(255, 240, 192, ' + (a * 0.24) + ')';
          ctx.lineWidth = 1.0;
          ctx.beginPath(); ctx.arc(sn.x, sn.y, sn.r * 0.82, 0, Math.PI * 2); ctx.stroke();
        } else {
          var fDirS = (sn.facing && sn.facing < 0) ? Math.PI : 0;
          ctx.strokeStyle = sn.lv >= 3 ? ('rgba(255, 240, 178, ' + (a * 0.48) + ')') : ('rgba(136, 242, 255, ' + (a * 0.52) + ')');
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(sn.x, sn.y, sn.r, fDirS - Math.PI * 0.42, fDirS + Math.PI * 0.48);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(164, 246, 255, ' + (a * 0.20) + ')';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(sn.x, sn.y, sn.r * 0.76, fDirS - Math.PI * 0.35, fDirS + Math.PI * 0.40);
          ctx.stroke();
        }
      });
      ctx.restore();
    }

    // 前景微暗钟乳石纵深遮挡（增强钻入洞窟的 2.5D 层次感）
    if (window.MT.Caves && window.MT.Caves.drawCavernFront) {
      window.MT.Caves.drawCavernFront(ctx, state);
    }

    if (breachPlumes.length > 0) {
      ctx.save();
      for (var p = 0; p < breachPlumes.length; p++) {
        var pl = breachPlumes[p];
        var prog = 1 - (pl.life / pl.maxLife);
        var fade = Math.max(0, pl.life / pl.maxLife);
        var h = (55 + pl.charge * 78) * Math.sin(Math.min(1, prog * 1.45) * Math.PI * 0.5);
        var w = (38 + pl.charge * 46) * (0.55 + prog * 0.75);
        var pg = ctx.createRadialGradient(pl.x, pl.y, 4, pl.x, pl.y - h * 0.3, Math.max(w, h));
        pg.addColorStop(0, 'rgba(236, 250, 255, ' + (fade * 0.62) + ')');
        pg.addColorStop(0.55, 'rgba(164, 224, 255, ' + (fade * 0.28) + ')');
        pg.addColorStop(1, 'rgba(164, 224, 255, 0)');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.ellipse(pl.x, pl.y - h * 0.32, w, h * 0.78, 0, Math.PI, 0);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawHudOverlay(ctx, state) {
    var boat = state.boat;
    var W = state.W, H = state.H;
    var t = state.t || 0;

    if (act3Triggered && !stageClearing && climaxTension > 0.05) {
      var pulse = 0.78 + 0.22 * Math.sin(t * (3.2 + climaxTension * 5.0));
      ctx.save();
      var cv = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.34, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
      cv.addColorStop(0, 'rgba(255, 146, 86, 0)');
      cv.addColorStop(1, 'rgba(226, 98, 56, ' + (0.22 * climaxTension * pulse) + ')');
      ctx.fillStyle = cv;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // 潮汐声呐流 Lv.1+：双向探测并标注最近未收集遗物（开放海域左右双向智能指路！）
    if (boat && boat.stats && boat.stats.sonarRevealRelics && !stageClearing && relics.length > 0) {
      var nearest = null;
      var bestAbsDx = 99999;
      var relDir = 1;
      var expRel = !!(window.MT.Config && window.MT.Config.EXPLORE_MODE);
      for (var ri = 0; ri < relics.length; ri++) {
        var rl = relics[ri];
        if (rl.pickedThisRun) continue;
        var ownedR = window.MT.Shop && window.MT.Shop.hasRelic && window.MT.Shop.hasRelic('moon_sea', rl.id);
        if (ownedR) continue;
        var dx = rl.x - boat.x;
        var adx = Math.abs(dx);
        var okDir = expRel ? (adx > 220 && adx < 4600) : (dx > 220 && dx < 2600);
        if (okDir && adx < bestAbsDx) {
          bestAbsDx = adx;
          relDir = dx >= 0 ? 1 : -1;
          nearest = rl;
        }
      }
      if (nearest) {
        var distM = Math.max(1, Math.round(bestAbsDx / ((window.MT.Config.ECONOMY && window.MT.Config.ECONOMY.DIST_DIVISOR) || 14)));
        var isDeep = nearest.yMode === 'depth';
        var byScreen = isDeep ? (H * 0.72) : (H * 0.28);
        var bxScreen = relDir >= 0 ? (W - 92) : 92;
        var pulseR = 0.72 + 0.28 * Math.sin(t * 4.5);

        ctx.save();
        ctx.globalAlpha = 0.86 * pulseR;
        var bgPill = ctx.createRadialGradient(bxScreen, byScreen, 4, bxScreen, byScreen, 44);
        bgPill.addColorStop(0, isDeep ? 'rgba(116, 236, 255, 0.28)' : 'rgba(255, 232, 162, 0.28)');
        bgPill.addColorStop(1, 'rgba(20, 42, 72, 0)');
        ctx.fillStyle = bgPill;
        ctx.beginPath(); ctx.arc(bxScreen, byScreen, 44, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = isDeep ? 'rgba(156, 244, 255, 0.78)' : 'rgba(255, 234, 174, 0.82)';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(bxScreen, byScreen, 15, 0, Math.PI * 2); ctx.stroke();

        ctx.fillStyle = isDeep ? '#c8f8ff' : '#fff4c6';
        ctx.font = '600 11px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('◈ ' + distM + 'm', bxScreen, byScreen + 29);
        ctx.fillText(isDeep ? '潜海深处' : '高空遗物', bxScreen, byScreen - 21);

        ctx.beginPath();
        ctx.moveTo(bxScreen - relDir * 3, byScreen - 5);
        ctx.lineTo(bxScreen + relDir * 5, byScreen);
        ctx.lineTo(bxScreen - relDir * 3, byScreen + 5);
        ctx.stroke();
        ctx.restore();
      }
    }

    // === v13 商业版无字情景微引导（首次出港提示 ↓S 潜海变潜艇、首次水下靠近生态/古碑提示 Q 声呐，学会即永久隐退！）===
    if (boat && window.MT.Config && window.MT.Config.EXPLORE_MODE && window.MT.Shop && window.MT.Shop.isTutorialDone) {
      var camI = (window.MT.RenderWorld && window.MT.RenderWorld.getCameraInfo) ? window.MT.RenderWorld.getCameraInfo() : null;
      if (camI) {
        var bsx = W * 0.5 + (boat.x - camI.camX) * camI.camZoom;
        var bsy = camI.seaAnchorY + (boat.y - camI.camY) * camI.camZoom;
        var bobG = Math.sin(t * 3.6) * 4;

        // 引导 1：驶离灯塔港后尚未潜海过 -> 船底下方浮现极简水滴波纹与 ↓ S 微键帽
        if (!window.MT.Shop.isTutorialDone('dive') && !boat.isDiving && boat.x > 660 && boat.x < 1950) {
          var gx = bsx, gy = bsy + 58 + bobG;
          ctx.save();
          ctx.globalAlpha = 0.86;
          ctx.fillStyle = 'rgba(14, 24, 46, 0.68)';
          ctx.strokeStyle = 'rgba(176, 240, 255, 0.72)';
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(gx, gy, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

          ctx.fillStyle = '#e8fbff';
          ctx.font = '600 12px "PingFang SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('S', gx, gy + 4.5);

          // 下方柔和双层水波向下人字箭头（零大段文字！）
          ctx.strokeStyle = 'rgba(176, 244, 255, 0.78)';
          ctx.lineWidth = 1.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(gx - 6, gy + 22); ctx.lineTo(gx, gy + 28); ctx.lineTo(gx + 6, gy + 22);
          ctx.stroke();
          ctx.restore();
        }
        // 引导 2：已潜海且靠近第一支银鱼群或潮汐浅海碑、尚未按过主动声呐 -> 潜艇上方浮现柔光同心环与 Q 微键帽
        else if (window.MT.Shop.isTutorialDone('dive') && !window.MT.Shop.isTutorialDone('sonar') && boat.isDiving && boat.x > 1020 && boat.x < 2450) {
          var qx = bsx, qy = bsy - 68 - bobG * 0.6;
          var rPulse = 15 + ((t * 18) % 16);
          ctx.save();
          ctx.globalAlpha = 0.88;
          ctx.strokeStyle = 'rgba(164, 244, 255, ' + (0.65 * (1 - (rPulse - 15) / 16)) + ')';
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(qx, qy, rPulse, 0, Math.PI * 2); ctx.stroke();

          ctx.fillStyle = 'rgba(14, 24, 46, 0.72)';
          ctx.strokeStyle = 'rgba(255, 232, 168, 0.78)';
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(qx, qy, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

          ctx.fillStyle = '#fff5cf';
          ctx.font = '600 12px "PingFang SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Q', qx, qy + 4.5);
          ctx.restore();
        }
      }
    }

    // 深渊水压区柔和感知边晕（未装深潜鱼鳍潜至最深海床时浮现深蓝压迫微晕）
    if (boat && (boat.deepPressure || 0) > 0.12) {
      var dp = boat.deepPressure;
      var dpPulse = 0.82 + 0.18 * Math.sin(t * 4.4);
      ctx.save();
      var dpV = ctx.createRadialGradient(W * 0.5, H * 0.52, Math.min(W, H) * 0.30, W * 0.5, H * 0.52, Math.max(W, H) * 0.76);
      dpV.addColorStop(0, 'rgba(10, 26, 56, 0)');
      dpV.addColorStop(1, 'rgba(12, 34, 78, ' + (0.36 * dp * dpPulse) + ')');
      ctx.fillStyle = dpV;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    if (window.MT.Abyss && window.MT.Abyss.drawHudOverlay) {
      window.MT.Abyss.drawHudOverlay(ctx, state);
    }

    if (!boat || !boat.isDiving || boat.submergeDepth < 6) return;
    var sub = clamp(boat.submergeDepth / 95, 0, 1);
    var lowB = (typeof boat.breath === 'number' && boat.breath < 0.34) ? clamp((0.34 - boat.breath) / 0.34, 0, 1) : 0;
    ctx.save();
    var vig = ctx.createRadialGradient(W * 0.5, H * 0.52, Math.min(W, H) * 0.28, W * 0.5, H * 0.52, Math.max(W, H) * 0.76);
    vig.addColorStop(0, 'rgba(14, 46, 86, 0)');
    if (lowB > 0.05) {
      var bp = 0.72 + 0.28 * Math.sin(t * 11);
      vig.addColorStop(1, 'rgba(138, 42, 54, ' + (0.34 * lowB * bp + 0.22 * sub) + ')');
    } else {
      vig.addColorStop(1, 'rgba(8, 28, 62, ' + (0.44 * sub) + ')');
    }
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  window.MT.LevelEngine.register('moon_sea', {
    id: 'moon_sea',
    // v12 Step 2：Q 版小潜艇主动声呐共振（Q 键 / 触屏微键触发，与全海域生态、洞窟、钟楼、鲸群音乐回响并可自动抓拍实景邮票！）
    triggerActiveSonar: function (boat, eras, onLevelEvent) {
      if (!boat || !eras || activeSonarCd > 0) return false;
      var st = boat.stats || { tideSonarLv: 0, starMult: 1 };
      var sLv = st.tideSonarLv || 0;
      activeSonarMaxCd = Math.max(1.35, 2.45 - sLv * 0.35);
      activeSonarCd = activeSonarMaxCd;
      boat.activeSonarCdFrac = 1.0;

      var range = 390 + sLv * 115;
      sonarWaves.push({
        x: boat.x,
        y: boat.y,
        r: 16,
        maxR: range,
        life: 1.45,
        maxLife: 1.45,
        lv: Math.max(1, sLv),
        active: true
      });

      if (window.MT.Shop && window.MT.Shop.markTutorialDone) window.MT.Shop.markTutorialDone('sonar');
      if (window.MT.Audio && window.MT.Audio.playActiveSonarPing) {
        window.MT.Audio.playActiveSonarPing();
      } else if (window.MT.Audio && window.MT.Audio.playSonarPing) {
        window.MT.Audio.playSonarPing();
      }
      if (window.MT.Abyss && window.MT.Abyss.triggerSonarReveal) {
        window.MT.Abyss.triggerSonarReveal();
      }

      // 0. 沉海月潮共鸣碑唤醒与港湾蓝鲸共鸣！
      if (window.MT.Shrines && window.MT.Shrines.onActiveSonar) {
        window.MT.Shrines.onActiveSonar(boat.x, boat.y, range, boat, eras, onLevelEvent);
      }

      // 1. 洞窟岩壁回声照亮 & 沉钟/月核母晶音乐共振
      if (window.MT.Caves && window.MT.Caves.onActiveSonar) {
        window.MT.Caves.onActiveSonar(boat.x, boat.y, range, boat, eras);
      }

      // 2. 深海生物多样性共振（银鱼群星环圆舞、提灯鱼显影、蝠鲼与深渊巨鲸回唱！）
      if (window.MT.AbyssFauna && window.MT.AbyssFauna.onSonarSweep) {
        window.MT.AbyssFauna.onSonarSweep(boat.x, boat.y, range, eras, true, boat, onLevelEvent);
      }

      // 3. 海面沉海钟楼远距声呐敲钟回响 & 月下蓝鲸群共鸣
      var tNow = eras.getTime();
      for (var ci = 0; ci < chunks.length; ci++) {
        var ch = chunks[ci];
        if (ch.type === 'bell_tower' && Math.hypot(boat.x - ch.towerX, boat.y - (-132)) <= range + 90) {
          ch.bellSwing = 1.0;
          if (window.MT.Audio && window.MT.Audio.playResonanceChord) window.MT.Audio.playResonanceChord('bell');
          eras.emitRing(ch.towerX, -148, '#ffe89e');
          eras.addPopup(ch.towerX, -182, '✦ 声呐隔空共鸣古钟！', '#fff2ba');
        }
        if (ch.type === 'whale_pod' && ch.pod) {
          for (var wi = 0; wi < ch.pod.length; wi++) {
            var wh = ch.pod[wi];
            if (Math.abs(boat.x - wh.x) <= range + 80) {
              wh.flash = 1.0;
              eras.emitRing(wh.x, eras.getSurfaceY(wh.x, tNow) - 18, '#a6f4ff');
              if (window.MT.Audio && window.MT.Audio.playResonanceChord) window.MT.Audio.playResonanceChord('whale');
              break;
            }
          }
        }
      }

      // 4. 若当前处于三大天象奇观之一且尚未收录或尚无快照，主动声呐直接将其拍入「月潮博物手记」！
      var ebS = eras.getEraBlend ? eras.getEraBlend(boat.x) : null;
      var spS = ebS ? ebS.seaPhase : null;
      if (spS && window.MT.Shop && window.MT.Snapshot) {
        var wObj = null;
        if ((spS.boilAbyss || 0) > 0.35) wObj = { id: 'wonder_boil', name: '沸海沉陨' };
        else if ((spS.ashSea || 0) > 0.35) wObj = { id: 'wonder_ash', name: '尘幕灰海' };
        else if ((spS.dawn || 0) > 0.35) wObj = { id: 'wonder_dawn', name: '破晓晨海' };
        if (wObj) {
          var isNewW = window.MT.Shop.discoverWonder && window.MT.Shop.discoverWonder(wObj.id);
          if (isNewW || (window.MT.Shop.getSnapshot && !window.MT.Shop.getSnapshot(wObj.id))) {
            var snapU = window.MT.Snapshot.captureFromLiveCanvas(wObj.id, wObj.name, boat.x, boat.y);
            window.MT.Snapshot.triggerShutterFlash();
            if (window.MT.Audio && window.MT.Audio.playShutterSnap) window.MT.Audio.playShutterSnap();
            if (isNewW && typeof onLevelEvent === 'function') {
              onLevelEvent('codex_discover', { kind: 'wonder', id: wObj.id, name: wObj.name, snapshot: snapU });
            }
          }
        }
      }
      return true;
    },
    resetHarborCooldown: function () { harborMoorCd = 3.2; harborMoorProg = 0; eastPortalCd = 3.2; eastPortalProg = 0; },
    reset: reset,
    onExit: onExit,
    getRelicStatus: getRelicStatus,
    isClearing: isClearing,
    finishClearing: finishClearing,
    getClimaxState: getClimaxState,
    getSurfaceOffset: getSurfaceOffset,
    handleLanding: handleLanding,
    handleSurfacePhysics: handleSurfacePhysics,
    handleChunkInteractions: handleChunkInteractions,
    update: update,
    drawWorldBack: drawWorldBack,
    drawUnderWater: drawUnderWater,
    drawWorldStructures: drawWorldStructures,
    drawWorldFront: drawWorldFront,
    drawHudOverlay: drawHudOverlay
  });
})();
