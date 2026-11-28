window.MT = window.MT || {};

// 第 2 关《陨落火海》独立关卡插件（Step A：沉浮玄武岩浮板连跳 + 间歇热柱节奏 + 6 套火海手工区块 + 3 枚炽海遗物）
(function () {
  var RELIC_DEFS = [
    { id: 'relic_ember_heart',      name: '月核余烬晶', hint: '月陨弹坑熔炉火盆上方' },
    { id: 'relic_obsidian_compass', name: '黑曜星盘',   hint: '冷却黑曜岩拱道下层秘窟' },
    { id: 'relic_phoenix_feather',  name: '熔岩鎏金羽', hint: '赤金熔岩瀑崖最高岩台' }
  ];

  var chunks = [];
  var relics = [];
  var fireSparks = [];
  var activeRaft = null;
  var activeDeck = null;
  var basaltChain = 0;
  var basaltChainTimer = 0;
  var nextEndlessChunkX = 14200;
  var nextId = 1;
  var lastMode = 'story';
  var artCache = null;

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function h1(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  function emitEmber(x, y, vx, vy, col, r, life) {
    if (fireSparks.length > 110) fireSparks.shift();
    fireSparks.push({
      x: x, y: y,
      vx: vx || (Math.random() - 0.5) * 40,
      vy: vy || (-55 - Math.random() * 65),
      col: col || (Math.random() < 0.55 ? '#ffcf76' : '#ff7b47'),
      r: r || (1.8 + Math.random() * 2.4),
      life: life || (0.55 + Math.random() * 0.45),
      maxLife: life || 0.9
    });
  }

  function makeArcStars(x0, span, baseY, peakAmp, count, val) {
    var arr = [];
    for (var i = 0; i < count; i++) {
      var u = count > 1 ? (i / (count - 1)) : 0.5;
      arr.push({
        x: x0 + u * span,
        y: baseY - Math.sin(u * Math.PI) * peakAmp,
        phase: i * 0.52 + Math.random(),
        collected: false,
        value: val || 3
      });
    }
    return arr;
  }

  function addRelic(defIdx, x, y) {
    var def = RELIC_DEFS[defIdx];
    if (!def) return;
    relics.push({
      id: def.id,
      name: def.name,
      x: x,
      y: y,
      phase: defIdx * 2.1,
      pickedThisRun: false
    });
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
      var u = clamp((x - deck.x0) / span, 0, 1);
      return (2 * (1 - u) * (deck.cy - deck.y0) + 2 * u * (deck.y1 - deck.cy)) / span;
    }
    return (deck.y1 - deck.y0) / span;
  }

  function getRaftTopY(raft, eras, t) {
    var surf = eras.getSurfaceY(raft.x, t);
    var bob = Math.sin(t * 2.2 + raft.phase) * 3.5;
    return surf + raft.baseOffset + raft.sinkY + bob;
  }

  // === 6 套火海专属手工结构区块工厂 ===
  function buildChunk(type, x0, opts) {
    opts = opts || {};
    var id = nextId++;

    // 1. 沉浮玄武岩浮桥阵（踩上即缓沉、裂缝泛红，逼出干脆的浮岩连跳节奏！）
    if (type === 'basalt_chain') {
      var count = opts.count || 4;
      var gap = opts.gap || 215;
      var rafts = [];
      for (var i = 0; i < count; i++) {
        var rx = x0 + 90 + i * gap;
        rafts.push({
          id: nextId++,
          x: rx,
          halfW: 62 - (i % 2) * 6,
          baseOffset: -14 - (i % 2) * 14,
          sinkY: 0,
          sinkVel: 0,
          maxSink: 46,
          stepped: false,
          vaulted: false,
          glow: 0,
          phase: i * 1.4 + Math.random(),
          variant: i % 2
        });
      }
      var len = 140 + (count - 1) * gap + 120;
      var stars = [];
      for (var s = 0; s < count - 1; s++) {
        var midX = (rafts[s].x + rafts[s + 1].x) * 0.5;
        stars.push({ x: midX - 24, y: -96, phase: s * 0.8, collected: false, value: 3 });
        stars.push({ x: midX,      y: -118, phase: s * 0.8 + 0.4, collected: false, value: 3 });
        stars.push({ x: midX + 24, y: -96, phase: s * 0.8 + 0.8, collected: false, value: 3 });
      }
      return {
        id: id, type: 'basalt_chain', x0: x0, x1: x0 + len,
        rafts: rafts,
        airStars: stars,
        phase: Math.random() * 6
      };
    }

    // 2. 冷却黑曜岩拱道（上下双路线：上层黑曜石脊高速跃过 vs 下层岩拱热风穿行取秘窟遗物！）
    if (type === 'obsidian_arch') {
      var aLen = opts.len || 740;
      var deck = {
        x0: x0 + 55, x1: x0 + aLen - 55,
        y0: -48, cy: -138, y1: -56,
        kind: 'obsidian_arch', launched: false
      };
      var lowerStars = [];
      for (var ls = 0; ls < 5; ls++) {
        var lu = (ls + 0.5) / 5;
        lowerStars.push({
          x: x0 + 140 + lu * (aLen - 280),
          y: -40 - Math.sin(lu * Math.PI) * 26,
          phase: ls * 0.6, collected: false, value: 3
        });
      }
      var cA = {
        id: id, type: 'obsidian_arch', x0: x0, x1: x0 + aLen,
        deck: deck,
        underDraftBoosted: false,
        airStars: makeArcStars(x0 + 100, aLen - 200, -138, 44, 7, 3).concat(lowerStars),
        phase: Math.random() * 6
      };
      if (opts.relicIdx === 1) {
        addRelic(1, x0 + aLen * 0.50, -54);
      }
      return cA;
    }

    // 3. 间歇热柱阶梯（3 根错相呼吸喷发的熔岩热柱 + 中途落脚浮岩！）
    if (type === 'geyser_steps') {
      var gLen = 820;
      var geysers = [
        { id: nextId++, x: x0 + 150, radius: 52, maxH: 235, period: 4.4, phaseOffset: 0.2, state: 'dormant', power: 0, boosted: false, hurtCd: 0 },
        { id: nextId++, x: x0 + 420, radius: 56, maxH: 260, period: 4.4, phaseOffset: 1.7, state: 'dormant', power: 0, boosted: false, hurtCd: 0 },
        { id: nextId++, x: x0 + 685, radius: 54, maxH: 245, period: 4.4, phaseOffset: 3.1, state: 'dormant', power: 0, boosted: false, hurtCd: 0 }
      ];
      var restRafts = [
        { id: nextId++, x: x0 + 285, halfW: 54, baseOffset: -14, sinkY: 0, sinkVel: 0, maxSink: 42, stepped: false, vaulted: false, glow: 0, phase: 0.7, variant: 0 },
        { id: nextId++, x: x0 + 555, halfW: 54, baseOffset: -16, sinkY: 0, sinkVel: 0, maxSink: 42, stepped: false, vaulted: false, glow: 0, phase: 2.3, variant: 1 }
      ];
      return {
        id: id, type: 'geyser_steps', x0: x0, x1: x0 + gLen,
        geysers: geysers,
        rafts: restRafts,
        airStars: makeArcStars(x0 + 130, 560, -172, 72, 8, 3),
        phase: Math.random() * 6
      };
    }

    // 4. 月陨弹坑熔炉（双侧火山岩峰环抱悬链古铜熔炉火盆，跃过点燃熔炉圣火并托举直达遗物！）
    if (type === 'crater_caldera') {
      var cLen = 580;
      var cx = x0 + cLen * 0.50;
      var cC = {
        id: id, type: 'crater_caldera', x0: x0, x1: x0 + cLen,
        centerX: cx,
        brazierY: -138,
        lit: false,
        flameWave: 0,
        geysers: [
          { id: nextId++, x: cx, radius: 58, maxH: 210, period: 3.8, phaseOffset: 0.9, state: 'dormant', power: 0, boosted: false, hurtCd: 0 }
        ],
        rafts: [
          { id: nextId++, x: x0 + 105, halfW: 56, baseOffset: -16, sinkY: 0, sinkVel: 0, maxSink: 40, stepped: false, vaulted: false, glow: 0, phase: 0.4, variant: 0 },
          { id: nextId++, x: x0 + cLen - 105, halfW: 56, baseOffset: -16, sinkY: 0, sinkVel: 0, maxSink: 40, stepped: false, vaulted: false, glow: 0, phase: 1.9, variant: 1 }
        ],
        airStars: makeArcStars(cx - 170, 340, -145, 76, 6, 3),
        phase: Math.random() * 6
      };
      if (opts.relicIdx === 0) {
        addRelic(0, cx, -224);
      }
      return cC;
    }

    // 5. 赤金熔岩瀑崖（宏伟黑曜岩峭壁倾泻炽金熔岩瀑 + 高阶玄武岩踏台攀跃取高空遗物！）
    if (type === 'magma_cascade') {
      var mLen = 760;
      var cliffX = x0 + mLen * 0.56;
      var ledges = [
        { x0: x0 + 50,  x1: x0 + 215, y0: -38,  y1: -66,  kind: 'basalt_ledge', launched: false },
        { x0: x0 + 270, x1: x0 + 465, y0: -96,  y1: -124, kind: 'basalt_ledge', launched: false },
        { x0: x0 + 520, x1: x0 + 705, y0: -132, y1: -158, kind: 'basalt_ledge', launched: false }
      ];
      var cM = {
        id: id, type: 'magma_cascade', x0: x0, x1: x0 + mLen,
        cliffX: cliffX,
        ledges: ledges,
        airStars: makeArcStars(x0 + 110, 560, -158, 72, 7, 3),
        phase: Math.random() * 6
      };
      if (opts.relicIdx === 2) {
        addRelic(2, x0 + 675, -214);
      }
      return cM;
    }

    // 6. 熔断黑铁残桥（半沉斜倾的黑铁黑曜岩残桥跳台，冲桥高速起飞！）
    var bLen = 620;
    return {
      id: id, type: 'collapsed_bridge', x0: x0, x1: x0 + bLen,
      deck: { x0: x0 + 38, x1: x0 + 430, y0: -26, y1: -102, kind: 'iron_slag_bridge', launched: false },
      geysers: [
        { id: nextId++, x: x0 + 525, radius: 52, maxH: 230, period: 4.0, phaseOffset: 1.5, state: 'dormant', power: 0, boosted: false, hurtCd: 0 }
      ],
      airStars: makeArcStars(x0 + 360, 260, -148, 86, 6, 3),
      phase: Math.random() * 6
    };
  }

  // 故事模式第 2 关《陨落火海》Act 1 + Act 2 手工区块布局（13600..22200，22200+ 预留给 Step B 火山大喷发高潮！）
  function buildStoryLayout() {
    chunks = [];
    relics = [];
    // Act 1（13600..17300）：初识沉浮玄武岩浮桥 -> 熔断残桥 -> 月陨弹坑熔炉（藏遗物 I）
    chunks.push(buildChunk('basalt_chain',     14220, { count: 4, gap: 205 }));
    chunks.push(buildChunk('collapsed_bridge', 15380));
    chunks.push(buildChunk('crater_caldera',   16320, { relicIdx: 0 }));

    // Act 2（17300..22200）：黑曜岩拱道双路线（藏遗物 II）-> 间歇热柱阶梯 -> 玄武岩急流长阵 -> 赤金熔岩瀑崖（藏遗物 III）
    chunks.push(buildChunk('obsidian_arch',    17360, { len: 760, relicIdx: 1 }));
    chunks.push(buildChunk('geyser_steps',     18540));
    chunks.push(buildChunk('basalt_chain',     19760, { count: 5, gap: 220 }));
    chunks.push(buildChunk('magma_cascade',    21120, { relicIdx: 2 }));
  }

  function spawnEndlessFireChunk(anchorX) {
    var types = ['basalt_chain', 'obsidian_arch', 'geyser_steps', 'crater_caldera', 'magma_cascade', 'collapsed_bridge'];
    var pick = types[Math.floor(Math.random() * types.length)];
    var ch = buildChunk(pick, anchorX, { count: 4 });
    chunks.push(ch);
    return (ch.x1 - ch.x0) + 420 + Math.random() * 220;
  }

  function reset(startX, mode) {
    lastMode = mode || 'story';
    chunks = [];
    relics = [];
    fireSparks = [];
    activeRaft = null;
    activeDeck = null;
    basaltChain = 0;
    basaltChainTimer = 0;

    if (lastMode === 'story') {
      buildStoryLayout();
    } else {
      nextEndlessChunkX = Math.max(680, (startX || 120) + 480);
    }
  }

  function onExit(boat) {
    activeRaft = null;
    activeDeck = null;
    if (boat) boat.ridingDeck = false;
  }

  function getRelicStatus() {
    var collected = window.MT.Shop && window.MT.Shop.getRelicCount ? window.MT.Shop.getRelicCount('fire_sea') : 0;
    return { collected: collected, total: RELIC_DEFS.length };
  }

  // === 第 2 关专属表面物理：高粘稠熔岩阻力（逼出“少落岩浆、多踏浮岩连跳”的鲜明手感差异！）===
  function handleSurfacePhysics(ctxObj) {
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

    if (boat.ridingDeck) return true;
    if (!eb || eb.fireMix < 0.55 || (eras.isFinaleActive && eras.isFinaleActive())) return false;

    // 熔岩更粘稠厚重：吃水阻尼更强、爬坡更吃力，但顺浪峰点火可借热流跃起寻找下一块浮岩！
    if (!wantBoost) {
      boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + cfg.WATER_PASSIVE_REFILL * 0.85 * dt);
    }
    boat.vx += slope * cfg.SLOPE_GRAVITY_FLOW * 0.86 * dt;

    if (input.right && slope > 0.04) {
      boat.carving = true;
      boat.hasCarved = true;
      boat.vx += (cfg.CARVE_DOWN_ACCEL * 0.88 * (0.45 + Math.min(1, slope * 3.2))) * dt;
      boat.vy += 110 * dt;
    } else if (input.left && slope < -0.06 && boat.vx > 180) {
      boat.angle -= 1.0 * dt;
      boat.vy -= 175 * dt;
    }

    var minLavaCruise = cfg.MIN_CRUISE_SPEED - 10 + st.rocketLv * 12 + (st.heatShieldLv >= 2 ? 22 : 0);
    if (!reverseThrusting && boat.vx < minLavaCruise) boat.vx += 175 * dt;

    // 高粘稠重浮力（比海水沉 35%，落地缓冲更厚实）
    var submerge = boat.y - waveY;
    if (submerge > -2) {
      var buoy = -submerge * (cfg.WATER_BUOYANCY * 0.82) - boat.vy * (cfg.WATER_DAMPING * 1.35);
      boat.vy += (buoy + cfg.GRAVITY * 0.28) * dt;
    } else {
      boat.vy += cfg.GRAVITY * 0.45 * dt;
    }

    var diffA = ctxObj.normalizeAngle(slopeAngle - boat.angle);
    boat.angularVel += (diffA * 18 - boat.angularVel * 7.8) * dt;
    boat.angle += boat.angularVel * dt;

    // 未装满级隔热壳在熔岩里阻力更大，装黑曜石隔热壳后顺滑得多！
    var lavaFric = st.heatShieldLv >= 1 ? 0.88 : 0.78;
    boat.vx *= Math.pow(lavaFric, dt);

    if (Math.random() < dt * 14) {
      emitEmber(boat.x - 18, waveY - 2, -boat.vx * 0.22, -32 - Math.random() * 48, '#ff9848', 2.4, 0.45);
    }
    return true;
  }

  // === 第 2 关核心交互：沉浮玄武岩浮板连跳、黑曜岩拱道/瀑崖踏台/熔断残桥、间歇热柱、熔炉火盆与 3 枚遗物 ===
  function handleChunkInteractions(ctxObj) {
    var dt = ctxObj.dt;
    var boat = ctxObj.boat;
    var input = ctxObj.input;
    var eb = ctxObj.eb;
    var eras = ctxObj.eras;
    var cfg = ctxObj.cfg;
    var eco = ctxObj.eco;
    var st = ctxObj.st;
    var t = eras.getTime();
    var wantBoost = ctxObj.wantBoost;
    var boostJustStarted = ctxObj.boostJustStarted;

    if (!eb || eb.fireMix < 0.35 || (eras.isFinaleActive && eras.isFinaleActive())) {
      activeRaft = null;
      activeDeck = null;
      boat.ridingDeck = false;
      return false;
    }

    if (basaltChainTimer > 0) {
      basaltChainTimer -= dt;
      if (basaltChainTimer <= 0) basaltChain = 0;
    }

    // 1. 正在踩踏一块「沉浮玄武岩浮板」（浮板在船重下持续下沉，跃离瞬间触发浮岩连跳爆发！）
    if (activeRaft) {
      var rTopY = getRaftTopY(activeRaft, eras, t);
      var offRight = boat.x > activeRaft.x + activeRaft.halfW + 10;
      var offLeft = boat.x < activeRaft.x - activeRaft.halfW - 14;
      var sunken = activeRaft.sinkY >= activeRaft.maxSink - 2;
      var manualVault = (wantBoost && boostJustStarted) || input.left;

      if (offRight || offLeft || sunken || manualVault) {
        if (!sunken && !offLeft && !activeRaft.vaulted) {
          activeRaft.vaulted = true;
          basaltChain += 1;
          basaltChainTimer = 4.2;
          boat.runBasaltHops = (boat.runBasaltHops || 0) + 1;
          var heavyBonus = input.right ? 42 : 0;
          var hopVy = -(285 + Math.min(3, basaltChain - 1) * 24 + heavyBonus);
          boat.vy = Math.min(boat.vy, hopVy);
          boat.vx = Math.min(st.maxSpeed + 135, Math.max(boat.vx + 68, 320 + basaltChain * 18));
          boat.angle = -0.42;
          boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.36);
          boat.trickAura = Math.max(boat.trickAura, 0.85);
          var hopStar = Math.round((6 + (basaltChain - 1) * 5) * st.starMult);
          boat.runStars += hopStar;

          if (window.MT.Audio && window.MT.Audio.playBasaltStep) window.MT.Audio.playBasaltStep(basaltChain);
          eras.emitRing(activeRaft.x, rTopY, basaltChain >= 3 ? '#ffe89c' : '#ffaa64');
          for (var sp = 0; sp < 10; sp++) {
            emitEmber(boat.x + (Math.random() - 0.5) * 40, rTopY, (Math.random() - 0.5) * 90, -55 - Math.random() * 85, sp % 2 === 0 ? '#ffe498' : '#ff7a44', 2.4, 0.55);
          }
          var hopTxt = basaltChain >= 2 ? ('浮岩连跳 ×' + basaltChain + '! +' + hopStar + '✦') : ('踏岩跃起 +' + hopStar + '✦');
          eras.addPopup(boat.x, rTopY - 48, hopTxt, basaltChain >= 3 ? '#fff0a4' : '#ffd296');
          ctxObj.addComboAndCheckFever(1, 6.2);
          if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
            window.MT.RenderWorld.triggerImpact(0.024, 0.036, 4.0);
          }
        }
        activeRaft = null;
        boat.ridingDeck = false;
        boat.deckGrace = 0.22;
      } else {
        // 踩在玄武岩浮板上：完全免疫岩浆高温，同时浮板在脚下加速沉降、裂缝泛出灼热赤金警告！
        var sinkRate = input.right ? 72 : 50;
        activeRaft.sinkY = Math.min(activeRaft.maxSink, activeRaft.sinkY + sinkRate * dt);
        activeRaft.glow = clamp(activeRaft.sinkY / activeRaft.maxSink, 0.25, 1.0);
        boat.ridingDeck = true;
        boat.inWater = false;
        boat.y = getRaftTopY(activeRaft, eras, t) - 7;
        boat.vx = Math.max(boat.vx + (input.right ? 150 : 75) * dt, 290 + st.rocketLv * 22);
        boat.vy = 0;
        boat.angle += ctxObj.normalizeAngle(0 - boat.angle) * Math.min(1, dt * 18);
        boat.angularVel = 0;
        boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.34 * dt);
        if (Math.random() < dt * 24) {
          emitEmber(boat.x - 14 + (Math.random() - 0.5) * 24, boat.y + 8, -boat.vx * 0.24, -40 - Math.random() * 55, '#ffaa58', 2.0, 0.42);
        }
      }
    }

    // 2. 正在滑行于上层静态岩拱/瀑崖踏台/熔断残桥
    if (activeDeck && !activeRaft) {
      var dOffR = boat.x > activeDeck.x1;
      var dOffL = boat.x < activeDeck.x0 - 16;
      var dJump = wantBoost && boostJustStarted;
      if (dOffR || dOffL || dJump) {
        if (dOffR && !activeDeck.launched) {
          activeDeck.launched = true;
          var isBridge = activeDeck.kind === 'iron_slag_bridge';
          var dBonus = Math.round((isBridge ? 10 : 8) * st.starMult);
          boat.runStars += dBonus;
          boat.vy = Math.min(boat.vy, isBridge ? -285 : -245);
          boat.vx = Math.min(st.maxSpeed + 135, boat.vx + 78);
          boat.trickAura = 0.90;
          if (window.MT.Audio && window.MT.Audio.playBasaltStep) window.MT.Audio.playBasaltStep(2);
          eras.emitRing(boat.x, boat.y, '#ffd88a');
          var lbl = isBridge ? '断桥腾空 +' : (activeDeck.kind === 'obsidian_arch' ? '黑曜岩拱飞跃 +' : '熔崖跃升 +');
          eras.addPopup(boat.x, boat.y - 46, lbl + dBonus + '✦', '#ffe69e');
          ctxObj.addComboAndCheckFever(1, 6.4);
          if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
            window.MT.RenderWorld.triggerImpact(0.026, 0.040, 4.2);
          }
        } else if (dJump) {
          boat.vy = -255;
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
        boat.vx = Math.max(boat.vx + (input.right ? 160 : 90) * dt, 320 + st.rocketLv * 24);
        boat.vy = boat.vx * dSlope;
        boat.angle += ctxObj.normalizeAngle(Math.atan(dSlope) - boat.angle) * Math.min(1, dt * 20);
        boat.angularVel = 0;
        boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.36 * dt);
        if (Math.random() < dt * 24) {
          emitEmber(boat.x - 14, dy, -boat.vx * 0.25, -35 - Math.random() * 45, '#ffc676', 2.0, 0.38);
        }
      }
    }

    // 3. 遍历视距内所有火海手工区块
    for (var i = 0; i < chunks.length; i++) {
      var ch = chunks[i];
      if (boat.x < ch.x0 - 180 || boat.x > ch.x1 + 180) continue;

      // A) 沉浮玄武岩浮板着陆检测
      if (ch.rafts && !activeRaft && !activeDeck && boat.deckGrace <= 0 && boat.vy >= -65) {
        for (var ri = 0; ri < ch.rafts.length; ri++) {
          var rf = ch.rafts[ri];
          if (rf.sinkY >= rf.maxSink - 6) continue;
          if (Math.abs(boat.x - rf.x) <= rf.halfW + 14) {
            var rfY = getRaftTopY(rf, eras, t);
            if (boat.y >= rfY - 28 && boat.y <= rfY + 28) {
              activeRaft = rf;
              rf.stepped = true;
              rf.glow = Math.max(rf.glow, 0.45);
              rf.sinkY = Math.min(rf.maxSink, rf.sinkY + 8);
              boat.ridingDeck = true;
              boat.inWater = false;
              boat.y = rfY - 7;
              var flips = boat.flipsInJump || 0;
              if (flips > 0) {
                var fb = Math.round(eco.FLIP_STAR_BONUS * flips * Math.max(1, boat.trickCombo + 1) * st.starMult);
                boat.runTricks += flips;
                boat.runFlips += flips;
                boat.runStars += fb;
                boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + cfg.FLIP_FUEL_REWARD * flips);
                ctxObj.addComboAndCheckFever(flips, 6.8);
                eras.addPopup(boat.x, rfY - 54, '浮岩空翻落脚! +' + fb + '✦', '#ffe89e');
              }
              boat.airTime = 0;
              boat.airSpin = 0;
              boat.flipsInJump = 0;
              if (window.MT.Audio && window.MT.Audio.playBasaltStep) window.MT.Audio.playBasaltStep(1);
              for (var k = 0; k < 6; k++) {
                emitEmber(rf.x + (Math.random() - 0.5) * rf.halfW * 1.4, rfY + 4, (Math.random() - 0.5) * 65, -40 - Math.random() * 55, '#ffae62', 2.0, 0.44);
              }
              break;
            }
          }
        }
      }

      // B) 上层黑曜岩拱道 / 瀑崖阶梯踏台 / 熔断铁桥着陆检测
      var deckList = ch.ledges ? ch.ledges : (ch.deck ? [ch.deck] : null);
      if (deckList && !activeRaft && !activeDeck && boat.deckGrace <= 0 && boat.vy >= -65) {
        for (var di = 0; di < deckList.length; di++) {
          var dk = deckList[di];
          if (boat.x >= dk.x0 - 16 && boat.x <= dk.x1 - 12) {
            var targetDy = getDeckY(dk, boat.x);
            if (boat.y >= targetDy - 28 && boat.y <= targetDy + 26) {
              activeDeck = dk;
              boat.ridingDeck = true;
              boat.inWater = false;
              boat.y = targetDy - 7;
              var fl2 = boat.flipsInJump || 0;
              if (fl2 > 0) {
                var fb2 = Math.round(eco.FLIP_STAR_BONUS * fl2 * Math.max(1, boat.trickCombo + 1) * st.starMult);
                boat.runTricks += fl2;
                boat.runFlips += fl2;
                boat.runStars += fb2;
                boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + cfg.FLIP_FUEL_REWARD * fl2);
                ctxObj.addComboAndCheckFever(fl2, 6.8);
                eras.addPopup(boat.x, targetDy - 52, '黑曜岩空翻落脚! +' + fb2 + '✦', '#ffe8a4');
              } else {
                var dName = dk.kind === 'obsidian_arch' ? '驰上黑曜岩拱道!' : (dk.kind === 'iron_slag_bridge' ? '冲上熔断黑铁桥!' : '踏上熔崖高台!');
                eras.addPopup(boat.x, targetDy - 42, dName, '#ffd9a2');
              }
              boat.airTime = 0;
              boat.airSpin = 0;
              boat.flipsInJump = 0;
              if (window.MT.Audio) window.MT.Audio.playHookCatch();
              break;
            }
          }
        }
      }

      // C) 黑曜岩拱道下层秘窟热风通道加速（鼓励下路穿拱拿遗物 II！）
      if (ch.type === 'obsidian_arch' && !activeDeck && boat.x > ch.x0 + 90 && boat.x < ch.x1 - 90) {
        var archRoofY = getDeckY(ch.deck, boat.x);
        if (boat.y > archRoofY + 24) {
          boat.vx = Math.min(st.maxSpeed + 135, boat.vx + 220 * dt);
          boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.35 * dt);
          if (!ch.underDraftBoosted) {
            ch.underDraftBoosted = true;
            eras.addPopup(boat.x, archRoofY + 46, '✦ 穿行黑曜拱窟热流!', '#ffd294');
            if (window.MT.Audio) window.MT.Audio.playUpdraft();
          }
        }
      }

      // D) 间歇喷发节奏热柱（上半部金色上升热浪永远安全托举充能，仅底部灼热核心会烫伤未穿黑曜壳的船！）
      if (ch.geysers) {
        for (var gi = 0; gi < ch.geysers.length; gi++) {
          var gy = ch.geysers[gi];
          if (gy.power < 0.25) continue;
          var gSurf = eras.getSurfaceY(gy.x, t);
          var gH = gy.maxH * gy.power;
          if (Math.abs(boat.x - gy.x) < gy.radius + 14 && boat.y > gSurf - gH - 18 && boat.y < gSurf + 22) {
            var inLowCore = boat.y > gSurf - 44 && st.heatShieldLv === 0 && boat.feverTimer <= 0;
            if (inLowCore) {
              if (gy.hurtCd <= 0) {
                gy.hurtCd = 0.85;
                var gDmg = Math.max(5, Math.round(9 * st.crashDamageMult));
                boat.hull = Math.max(0, boat.hull - gDmg);
                boat.hurtFlash = 0.85;
                boat.vy = -215;
                eras.addPopup(gy.x, gSurf - 48, '熔岩柱核心灼伤 -' + gDmg + '（高空借热流无伤）', '#ff986e');
                if (window.MT.Audio) window.MT.Audio.playSplash(1.0);
              }
            } else {
              // 安全强劲上升热气流！
              boat.vy = Math.max(-360, boat.vy - (640 + st.heatShieldLv * 85) * dt);
              boat.vx = Math.min(st.maxSpeed + 125, boat.vx + 135 * dt);
              boat.fuel = Math.min(cfg.MAX_FUEL, boat.fuel + 0.85 * dt);
              if (!gy.boosted) {
                gy.boosted = true;
                boat.runGeysersRidden = (boat.runGeysersRidden || 0) + 1;
                var gb = Math.round(10 * st.starMult);
                boat.runStars += gb;
                boat.trickAura = 0.92;
                if (window.MT.Audio && window.MT.Audio.playGeyserErupt) window.MT.Audio.playGeyserErupt();
                eras.emitRing(gy.x, boat.y, '#ffda86');
                eras.addPopup(gy.x, boat.y - 44, '✦ 乘炽热喷柱冲天! +' + gb + '✦', '#ffe89c');
                ctxObj.addComboAndCheckFever(1, 6.4);
                if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
                  window.MT.RenderWorld.triggerImpact(0.024, 0.036, 4.0);
                }
              }
            }
          }
        }
      }

      // E) 月陨弹坑熔炉：跃过悬链古铜火盆 -> 点亮熔炉圣火 + 强力托举直取顶空遗物！
      if (ch.type === 'crater_caldera' && !ch.lit) {
        if (Math.hypot(boat.x - ch.centerX, boat.y - ch.brazierY) < 76) {
          ch.lit = true;
          ch.flameWave = 1.0;
          boat.runBraziersLit = (boat.runBraziersLit || 0) + 1;
          var brBonus = Math.round(22 * st.starMult);
          boat.runStars += brBonus;
          boat.fuel = cfg.MAX_FUEL;
          boat.vy = Math.min(boat.vy, -265);
          boat.trickAura = 1.0;
          if (window.MT.Audio && window.MT.Audio.playBrazierIgnite) window.MT.Audio.playBrazierIgnite();
          eras.emitRing(ch.centerX, ch.brazierY, '#ffe694');
          eras.emitRing(ch.centerX, ch.brazierY, '#ff8f52');
          for (var fb = 0; fb < 16; fb++) {
            emitEmber(ch.centerX, ch.brazierY, (Math.random() - 0.5) * 140, -70 - Math.random() * 120, fb % 2 === 0 ? '#fff0a8' : '#ff864c', 2.8, 0.85);
          }
          eras.addPopup(ch.centerX, ch.brazierY - 46, '✦ 点亮月陨熔炉圣火! +' + brBonus + '✦', '#fff0aa');
          ctxObj.addComboAndCheckFever(2, 7.2);
          if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
            window.MT.RenderWorld.triggerImpact(0.036, 0.052, 5.2);
          }
        }
      }
    }

    // 4. 3 枚「炽海遗物」拾取判定
    for (var rIdx = 0; rIdx < relics.length; rIdx++) {
      var rel = relics[rIdx];
      if (rel.pickedThisRun) continue;
      var ry = rel.y + Math.sin(rel.phase) * 5;
      if (Math.hypot(boat.x - rel.x, boat.y - ry) < 58) {
        rel.pickedThisRun = true;
        boat.runRelicsFound = (boat.runRelicsFound || 0) + 1;
        var isNew = window.MT.Shop && window.MT.Shop.collectRelic ? window.MT.Shop.collectRelic('fire_sea', rel.id) : true;
        var rVal = Math.round((isNew ? 40 : 14) * st.starMult);
        boat.runStars += rVal;
        boat.fuel = cfg.MAX_FUEL;
        boat.trickAura = 1.0;
        if (window.MT.Audio && window.MT.Audio.playRelicFound) window.MT.Audio.playRelicFound();
        eras.emitRing(rel.x, ry, '#ffe89e');
        eras.emitRing(rel.x, ry, '#ff985c');
        var rStat = getRelicStatus();
        eras.addPopup(
          rel.x, ry - 48,
          isNew ? ('◈ 发现炽海遗物「' + rel.name + '」(' + rStat.collected + '/' + rStat.total + ') +' + rVal + '✦') : ('◈ 重逢「' + rel.name + '」+' + rVal + '✦'),
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

  function update(dt, boat, eras) {
    var t = eras.getTime();
    var eb = eras.getEraBlend(boat.x);
    var inFire = eb && eb.fireMix > 0.35 && !(eras.isFinaleActive && eras.isFinaleActive());

    if (lastMode === 'endless' && inFire) {
      if (nextEndlessChunkX < boat.x + 280) nextEndlessChunkX = boat.x + 480;
      while (nextEndlessChunkX < boat.x + 2400) {
        nextEndlessChunkX += spawnEndlessFireChunk(nextEndlessChunkX);
      }
    }

    var st = boat.stats || { magnetRadius: 82, starMult: 1 };
    var magRad = boat.feverTimer > 0 ? Math.max(250, st.magnetRadius * 1.65) : st.magnetRadius;

    for (var ci = chunks.length - 1; ci >= 0; ci--) {
      var ch = chunks[ci];
      ch.phase += dt * 2.0;
      if (ch.flameWave > 0) ch.flameWave = Math.max(0, ch.flameWave - dt * 0.85);

      // 更新浮岩浮力恢复（船离开后缓缓浮回原位）
      if (ch.rafts) {
        ch.rafts.forEach(function (rf) {
          if (rf !== activeRaft) {
            rf.sinkY = Math.max(0, rf.sinkY - 18 * dt);
            rf.glow = Math.max(0, rf.glow - 0.8 * dt);
            if (rf.sinkY < 2) rf.vaulted = false;
          }
        });
      }

      // 更新间歇喷发节奏热柱（dormant 1.6s -> telegraph 0.85s -> erupt 1.95s 循环）
      if (ch.geysers) {
        ch.geysers.forEach(function (gy) {
          if (gy.hurtCd > 0) gy.hurtCd = Math.max(0, gy.hurtCd - dt);
          var cycle = (t + gy.phaseOffset) % gy.period;
          var pDorm = gy.period * 0.34;
          var pTele = gy.period * 0.54;
          if (cycle < pDorm) {
            gy.state = 'dormant';
            gy.power = Math.max(0, gy.power - dt * 3.5);
            gy.boosted = false;
          } else if (cycle < pTele) {
            gy.state = 'telegraph';
            gy.power = clamp((cycle - pDorm) / Math.max(0.1, pTele - pDorm) * 0.22, 0, 0.22);
          } else {
            gy.state = 'erupt';
            var eU = (cycle - pTele) / Math.max(0.1, gy.period - pTele);
            var env = eU < 0.14 ? (eU / 0.14) : (eU > 0.84 ? ((1 - eU) / 0.16) : 1.0);
            gy.power = clamp(env, 0, 1);
            if (Math.abs(gy.x - boat.x) < 720 && Math.random() < dt * 16 * gy.power) {
              var gsy = eras.getSurfaceY(gy.x, t);
              emitEmber(gy.x + (Math.random() - 0.5) * gy.radius * 0.8, gsy - Math.random() * gy.maxH * gy.power * 0.8, (Math.random() - 0.5) * 35, -140 - Math.random() * 110, '#ffe088', 2.2, 0.55);
            }
          }
        });
      }

      // 区块空中星火收集
      if (ch.airStars) {
        for (var ai = 0; ai < ch.airStars.length; ai++) {
          var as = ch.airStars[ai];
          if (as.collected) continue;
          as.phase += dt * 3.2;
          var asy = as.y + Math.sin(as.phase) * 3.5;
          var da = Math.hypot(as.x - boat.x, asy - (boat.y - 10));
          if (da < 44) {
            as.collected = true;
            var av = Math.max(2, Math.round(as.value * st.starMult));
            boat.runStars += av;
            boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.045);
            if (window.MT.Audio) window.MT.Audio.playHookCatch();
          } else if (da < magRad) {
            as.x += (boat.x - as.x) * Math.min(1, dt * 12);
            as.y += ((boat.y - 10) - as.y) * Math.min(1, dt * 12);
          }
        }
      }

      if (lastMode === 'endless' && ch.x1 < boat.x - 1200) chunks.splice(ci, 1);
    }

    relics.forEach(function (rel) { rel.phase += dt * 2.5; });

    for (var fi = fireSparks.length - 1; fi >= 0; fi--) {
      var sp = fireSparks[fi];
      sp.life -= dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vy += 120 * dt;
      if (sp.life <= 0) fireSparks.splice(fi, 1);
    }
  }

  // =========================================================================
  // 离屏不透明遮罩火海地标精灵工厂（棱面黑曜岩柱、火山瀑崖、沉浮玄武岩浮板）
  // 统一火海暮紫-赤金底光-火山薄雾调色，零平面几何贴纸、零平底截断！
  // =========================================================================
  function buildBasaltRaftSprite(variant) {
    var cw = 180, ch = 120;
    var cx = cw * 0.5, topY = 26;
    var out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    var ctx = out.getContext('2d');

    var sil = document.createElement('canvas');
    sil.width = cw; sil.height = ch;
    var g = sil.getContext('2d');
    g.fillStyle = '#ffffff';

    // 厚实饱满的六边形棱面浮岩块（上平可稳落脚，底部深圆融进熔岩，绝非薄木板！）
    var hw = variant === 0 ? 64 : 58;
    g.beginPath();
    g.moveTo(cx - hw, topY + 6);
    g.lineTo(cx - hw + 10, topY);
    g.lineTo(cx + hw - 10, topY);
    g.lineTo(cx + hw, topY + 7);
    g.lineTo(cx + hw - 6, topY + 26);
    g.lineTo(cx + hw * 0.62, topY + 52);
    g.lineTo(cx + hw * 0.14, topY + 66);
    g.lineTo(cx - hw * 0.36, topY + 60);
    g.lineTo(cx - hw * 0.78, topY + 42);
    g.lineTo(cx - hw - 2, topY + 22);
    g.closePath();
    g.fill();

    g.globalCompositeOperation = 'source-atop';
    // 顶冷黑曜深紫灰 -> 底受沸腾熔岩烘烤的赤金橙反光！
    var bg = g.createLinearGradient(0, topY, 0, topY + 66);
    bg.addColorStop(0.00, '#5a4350');
    bg.addColorStop(0.24, '#362332');
    bg.addColorStop(0.62, '#5a242c');
    bg.addColorStop(0.88, '#c85432');
    bg.addColorStop(1.00, '#ffae58');
    g.fillStyle = bg;
    g.fillRect(0, 0, cw, ch);

    // 棱面玄武岩体块明暗切面
    g.fillStyle = 'rgba(255, 206, 152, 0.22)';
    g.fillRect(cx - hw, topY, hw * 2, 7);

    g.fillStyle = 'rgba(22, 12, 24, 0.42)';
    g.beginPath();
    g.moveTo(cx - hw, topY + 8); g.lineTo(cx - 8, topY + 8);
    g.lineTo(cx - 22, topY + 62); g.lineTo(cx - hw, topY + 42);
    g.closePath(); g.fill();

    // 熔岩裂纹微光脉络
    g.strokeStyle = 'rgba(255, 168, 86, 0.62)';
    g.lineWidth = 1.6;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - 18, topY + 50); g.lineTo(cx - 8, topY + 26); g.lineTo(cx + 6, topY + 14);
    g.moveTo(cx + 24, topY + 44); g.lineTo(cx + 16, topY + 22);
    g.stroke();

    ctx.drawImage(sil, 0, 0);

    // 顶面可落脚冷金微光边缘（让玩家高速中 0.1 秒看清落脚点！）
    ctx.strokeStyle = 'rgba(255, 224, 174, 0.72)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - hw + 10, topY + 0.5);
    ctx.lineTo(cx + hw - 10, topY + 0.5);
    ctx.stroke();

    return { canvas: out, w: cw, h: ch, anchorX: cx, anchorY: topY };
  }

  // 宏伟棱面黑曜岩瀑崖巨峰（深扎火海海底，崖体受下方熔岩赤金逆光映照！）
  function buildMagmaCliffSprite() {
    var cw = 440, ch = 460;
    var cx = cw * 0.5, waterY = 268;
    var out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    var ctx = out.getContext('2d');

    var sil = document.createElement('canvas');
    sil.width = cw; sil.height = ch;
    var g = sil.getContext('2d');
    g.fillStyle = '#ffffff';

    g.beginPath();
    g.moveTo(cx - 165, ch);
    g.lineTo(cx - 142, waterY - 26);
    g.lineTo(cx - 104, waterY - 98);
    g.lineTo(cx - 64,  waterY - 122);
    g.lineTo(cx - 32,  waterY - 178);
    g.lineTo(cx + 12,  waterY - 224);
    g.lineTo(cx + 68,  waterY - 196);
    g.lineTo(cx + 108, waterY - 134);
    g.lineTo(cx + 144, waterY - 62);
    g.lineTo(cx + 174, ch);
    g.closePath();
    g.fill();

    g.globalCompositeOperation = 'source-atop';
    // 顶部暗紫黑曜岩 -> 底部火海炽金反射红光
    var bodyG = g.createLinearGradient(0, waterY - 224, 0, waterY + 90);
    bodyG.addColorStop(0.00, '#3a2234');
    bodyG.addColorStop(0.45, '#522838');
    bodyG.addColorStop(0.80, '#8a383a');
    bodyG.addColorStop(1.00, '#ce623c');
    g.fillStyle = bodyG;
    g.fillRect(0, 0, cw, ch);

    // 棱面受光雕刻（左侧深紫背光面 + 右侧暖赤金受光面）
    g.fillStyle = 'rgba(22, 12, 26, 0.44)';
    g.beginPath();
    g.moveTo(cx + 12, waterY - 224);
    g.lineTo(cx - 10, waterY - 108);
    g.lineTo(cx - 36, waterY + 40);
    g.lineTo(0, ch); g.lineTo(0, 0);
    g.closePath(); g.fill();

    g.fillStyle = 'rgba(255, 176, 112, 0.22)';
    g.beginPath();
    g.moveTo(cx + 12, waterY - 224);
    g.lineTo(cx - 6, waterY - 108);
    g.lineTo(cx + 22, waterY + 25);
    g.lineTo(cw, ch); g.lineTo(cw, 0);
    g.closePath(); g.fill();

    // 统一火海晚霞热雾大气透视
    var haze = g.createLinearGradient(0, waterY - 220, 0, waterY + 40);
    haze.addColorStop(0.00, 'rgba(92, 34, 48, 0.20)');
    haze.addColorStop(0.65, 'rgba(232, 124, 78, 0.24)');
    haze.addColorStop(1.00, 'rgba(186, 68, 42, 0.45)');
    g.fillStyle = haze;
    g.fillRect(0, 0, cw, ch);

    ctx.drawImage(sil, 0, 0);
    return { canvas: out, w: cw, h: ch, anchorX: cx, anchorY: waterY };
  }

  // 月陨弹坑单侧岩柱（左右镜像构成巍峨弹坑熔炉）
  function buildCalderaSpireSprite() {
    var cw = 180, ch = 360;
    var cx = cw * 0.5, waterY = 220;
    var out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    var ctx = out.getContext('2d');

    var sil = document.createElement('canvas');
    sil.width = cw; sil.height = ch;
    var g = sil.getContext('2d');
    g.fillStyle = '#ffffff';

    g.beginPath();
    g.moveTo(cx - 62, ch);
    g.lineTo(cx - 46, waterY - 32);
    g.lineTo(cx - 26, waterY - 122);
    g.lineTo(cx + 4,  waterY - 178);
    g.lineTo(cx + 30, waterY - 144);
    g.lineTo(cx + 44, waterY - 66);
    g.lineTo(cx + 58, ch);
    g.closePath();
    g.fill();

    g.globalCompositeOperation = 'source-atop';
    var bg = g.createLinearGradient(0, waterY - 178, 0, waterY + 80);
    bg.addColorStop(0.00, '#462a3c');
    bg.addColorStop(0.55, '#683440');
    bg.addColorStop(1.00, '#c85e3c');
    g.fillStyle = bg;
    g.fillRect(0, 0, cw, ch);

    // 内侧朝向熔炉火盆的暖金高光面
    g.fillStyle = 'rgba(255, 198, 126, 0.26)';
    g.beginPath();
    g.moveTo(cx + 4, waterY - 178);
    g.lineTo(cx - 4, waterY - 50);
    g.lineTo(cx + 60, ch);
    g.lineTo(cw, 0);
    g.closePath(); g.fill();

    ctx.drawImage(sil, 0, 0);
    return { canvas: out, w: cw, h: ch, anchorX: cx, anchorY: waterY };
  }

  function ensureArtCache() {
    if (artCache) return artCache;
    artCache = {
      rafts: [buildBasaltRaftSprite(0), buildBasaltRaftSprite(1)],
      magmaCliff: buildMagmaCliffSprite(),
      calderaSpire: buildCalderaSpireSprite()
    };
    return artCache;
  }

  // === 分层绘制 1：所有深扎火海海底的岩体、拱道、熔岩瀑崖、铁桥墩与沉浮浮岩（位于主熔岩液面之前！）===
  function drawWorldBack(ctx, state) {
    var cache = ensureArtCache();
    var eras = window.MT.Eras;
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    var viewBottom = state.viewBottom;
    var fireMix = state.eb ? (state.eb.fireMix || 0) : 0;
    if (fireMix < 0.05 || chunks.length === 0) return;

    ctx.save();
    ctx.globalAlpha = fireMix;

    chunks.forEach(function (ch) {
      if (ch.x1 < viewLeft - 280 || ch.x0 > viewRight + 280) return;
      var abyssY = Math.max(290, viewBottom + 80);

      // 1) 冷却黑曜岩拱道（雄浑天然火山石拱 + 柔和棱面石肌 + 下方沸腾熔岩暖金漫反射！）
      if (ch.type === 'obsidian_arch' && ch.deck) {
        var dk = ch.deck;
        var midX = (ch.x0 + ch.x1) * 0.5;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ch.x0 - 34, abyssY);
        ctx.lineTo(ch.x0 - 16, dk.y0 + 34);
        ctx.lineTo(dk.x0, dk.y0);
        ctx.quadraticCurveTo(midX, dk.cy, dk.x1, dk.y1);
        ctx.lineTo(ch.x1 + 16, dk.y1 + 34);
        ctx.lineTo(ch.x1 + 36, abyssY);
        ctx.lineTo(ch.x1 - 74, abyssY);
        ctx.lineTo(ch.x1 - 88, 12);
        ctx.quadraticCurveTo(midX, dk.cy + 56, ch.x0 + 88, 12);
        ctx.lineTo(ch.x0 + 74, abyssY);
        ctx.closePath();

        var aGrad = ctx.createLinearGradient(0, dk.cy, 0, 110);
        aGrad.addColorStop(0.00, '#5a3444');
        aGrad.addColorStop(0.42, '#432435');
        aGrad.addColorStop(0.78, '#8d3b38');
        aGrad.addColorStop(1.00, '#d05f38');
        ctx.fillStyle = aGrad;
        ctx.fill();

        // 在拱体剪影内添加几道柔和玄武岩棱面切光与底部赤金反光，增强立体手绘感
        ctx.save();
        ctx.clip();
        for (var fa = 0; fa < 6; fa++) {
          var fx = ch.x0 + 70 + fa * ((ch.x1 - ch.x0 - 140) / 5);
          ctx.fillStyle = fa % 2 === 0 ? 'rgba(255, 192, 132, 0.08)' : 'rgba(22, 10, 24, 0.16)';
          ctx.beginPath();
          ctx.moveTo(fx - 34, dk.cy - 20); ctx.lineTo(fx + 28, dk.cy - 20);
          ctx.lineTo(fx + 4, 80); ctx.lineTo(fx - 46, 80);
          ctx.closePath(); ctx.fill();
        }
        var uGlow = ctx.createRadialGradient(midX, 20, 20, midX, 10, (ch.x1 - ch.x0) * 0.48);
        uGlow.addColorStop(0, 'rgba(255, 176, 88, 0.30)');
        uGlow.addColorStop(1, 'rgba(255, 112, 48, 0)');
        ctx.fillStyle = uGlow;
        ctx.fillRect(ch.x0 - 40, dk.cy - 20, (ch.x1 - ch.x0) + 80, 180);
        ctx.restore();

        // 拱腹受下方沸腾岩浆烘烤的炽金内反光边缘
        ctx.strokeStyle = 'rgba(255, 186, 104, 0.42)';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(ch.x0 + 86, 12);
        ctx.quadraticCurveTo(midX, dk.cy + 56, ch.x1 - 86, 12);
        ctx.stroke();

        // 拱腹倒挂的自然火山钟乳石尖
        ctx.fillStyle = '#422334';
        [-115, 0, 118].forEach(function (ox, idx) {
          var sx = midX + ox;
          var sy = getDeckY(dk, sx) + 28;
          var sl = 16 + (idx === 1 ? 8 : 0);
          ctx.beginPath();
          ctx.moveTo(sx - 8, sy); ctx.lineTo(sx + 8, sy); ctx.lineTo(sx + 1, sy + sl);
          ctx.closePath(); ctx.fill();
        });
        ctx.restore();
      }

      // 2) 月陨弹坑熔炉（左右两座镜像火山岩柱 + 悬挂古铜火盆的铁链）
      if (ch.type === 'crater_caldera' && cache.calderaSpire) {
        var sp = cache.calderaSpire;
        var lx = ch.centerX - 148;
        var rx = ch.centerX + 148;

        ctx.save();
        ctx.translate(lx, 20);
        ctx.drawImage(sp.canvas, -sp.anchorX, -sp.anchorY);
        ctx.restore();

        ctx.save();
        ctx.translate(rx, 20);
        ctx.scale(-1, 1);
        ctx.drawImage(sp.canvas, -sp.anchorX, -sp.anchorY);
        ctx.restore();

        // 优雅悬垂铁链连接双岩柱与中央熔炉火盆
        ctx.strokeStyle = 'rgba(64, 34, 42, 0.85)';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(lx + 8, -148);
        ctx.quadraticCurveTo(lx + 72, ch.brazierY + 8, ch.centerX - 18, ch.brazierY - 6);
        ctx.moveTo(rx - 8, -148);
        ctx.quadraticCurveTo(rx - 72, ch.brazierY + 8, ch.centerX + 18, ch.brazierY - 6);
        ctx.stroke();
      }

      // 3) 赤金熔岩瀑崖（宏伟黑曜岩巨峰 + 畅通闪耀的流动赤金熔岩瀑 + 轻巧悬挑玄武岩踏石！）
      if (ch.type === 'magma_cascade' && cache.magmaCliff) {
        var mc = cache.magmaCliff;
        ctx.save();
        ctx.drawImage(mc.canvas, ch.cliffX - mc.anchorX, 22 - mc.anchorY);

        // 两条顺着岩崖奔涌直下的流动赤金熔岩瀑布（伴随柔和暖光晕与水雾蒸汽，绝不被遮挡！）
        var falls = [
          { x: ch.cliffX - 28, yTop: -124, w: 18 },
          { x: ch.cliffX + 38, yTop: -156, w: 22 }
        ];
        falls.forEach(function (fl, fi) {
          var fallHalo = ctx.createRadialGradient(fl.x, (fl.yTop + 20) * 0.5, 4, fl.x, (fl.yTop + 20) * 0.5, 64);
          fallHalo.addColorStop(0, 'rgba(255, 192, 98, 0.34)');
          fallHalo.addColorStop(1, 'rgba(255, 92, 42, 0)');
          ctx.fillStyle = fallHalo;
          ctx.beginPath(); ctx.ellipse(fl.x, (fl.yTop + 20) * 0.5, 46, 95, 0, 0, Math.PI * 2); ctx.fill();

          var fg = ctx.createLinearGradient(fl.x, fl.yTop, fl.x, 45);
          fg.addColorStop(0.00, 'rgba(255, 244, 188, 0.94)');
          fg.addColorStop(0.45, 'rgba(255, 152, 68, 0.88)');
          fg.addColorStop(1.00, 'rgba(226, 78, 42, 0.72)');
          ctx.fillStyle = fg;
          var wob = Math.sin(t * 5.2 + fi * 2.1) * 2.5;
          ctx.beginPath();
          ctx.moveTo(fl.x - fl.w * 0.36, fl.yTop);
          ctx.quadraticCurveTo(fl.x - fl.w * 0.45 + wob, (fl.yTop + 30) * 0.5, fl.x - fl.w * 0.68, 45);
          ctx.lineTo(fl.x + fl.w * 0.68, 45);
          ctx.quadraticCurveTo(fl.x + fl.w * 0.45 - wob, (fl.yTop + 30) * 0.5, fl.x + fl.w * 0.36, fl.yTop);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 250, 214, 0.72)';
          ctx.lineWidth = 2.0;
          ctx.lineCap = 'round';
          ctx.beginPath();
          var segY = fl.yTop + ((t * 95 + fi * 60) % 130);
          ctx.moveTo(fl.x + wob * 0.4, segY);
          ctx.lineTo(fl.x - wob * 0.3, Math.min(32, segY + 36));
          ctx.stroke();
        });

        // 轻巧修长的三阶悬挑玄武岩踏台 + 纤细斜向岩肋支柱（彻底替代巨型深色纸板梯形！）
        if (ch.ledges) {
          ch.ledges.forEach(function (lg, lIdx) {
            var midX = (lg.x0 + lg.x1) * 0.5;
            var midY = (lg.y0 + lg.y1) * 0.5;
            // 仅用 2 根修长收分的火山岩柱支撑，留出宽阔通透的岩瀑视野！
            [lg.x0 + 28, lg.x1 - 28].forEach(function (px) {
              var py = getDeckY(lg, px);
              var pGrad = ctx.createLinearGradient(px - 6, py, px + 6, 70);
              pGrad.addColorStop(0, '#442636');
              pGrad.addColorStop(0.7, '#582934');
              pGrad.addColorStop(1, '#c45234');
              ctx.fillStyle = pGrad;
              ctx.beginPath();
              ctx.moveTo(px - 6, py + 12); ctx.lineTo(px + 6, py + 12);
              ctx.lineTo(px + 10, abyssY); ctx.lineTo(px - 10, abyssY);
              ctx.closePath(); ctx.fill();
            });

            // 悬挑棱面玄武岩踏板本体（厚约 20px，底面受岩浆橙光烘烤）
            var sGrad = ctx.createLinearGradient(0, lg.y1, 0, lg.y0 + 24);
            sGrad.addColorStop(0.0, '#623a48');
            sGrad.addColorStop(0.55, '#3b2131');
            sGrad.addColorStop(1.0, '#b84f34');
            ctx.fillStyle = sGrad;
            ctx.beginPath();
            ctx.moveTo(lg.x0, lg.y0);
            ctx.lineTo(lg.x1, lg.y1);
            ctx.lineTo(lg.x1 - 8, lg.y1 + 16);
            ctx.lineTo(midX + 18, midY + 21);
            ctx.lineTo(midX - 24, midY + 18);
            ctx.lineTo(lg.x0 + 10, lg.y0 + 15);
            ctx.closePath();
            ctx.fill();
          });
        }
        ctx.restore();
      }

      // 4) 熔断黑铁残桥深扎海底的暗红炙热桥墩与桁架
      if (ch.type === 'collapsed_bridge' && ch.deck) {
        var bdk = ch.deck;
        ctx.save();
        var xs = [];
        for (var p = 0; p < 5; p++) {
          var pu = p / 4;
          var px = bdk.x0 + 12 + pu * (bdk.x1 - bdk.x0 - 24);
          var py = getDeckY(bdk, px);
          xs.push({ x: px, y: py });
          var pg = ctx.createLinearGradient(px - 5, py, px + 5, 65);
          pg.addColorStop(0, '#3a222c');
          pg.addColorStop(0.7, '#5a2a30');
          pg.addColorStop(1, '#be4e34');
          ctx.fillStyle = pg;
          ctx.fillRect(px - 4.5, py + 2, 9, abyssY - py);
        }
        ctx.strokeStyle = 'rgba(72, 34, 42, 0.85)';
        ctx.lineWidth = 3.0;
        for (var br = 0; br < xs.length - 1; br++) {
          ctx.beginPath();
          ctx.moveTo(xs[br].x, xs[br].y + 8); ctx.lineTo(xs[br + 1].x, xs[br + 1].y + 44);
          ctx.moveTo(xs[br + 1].x, xs[br + 1].y + 8); ctx.lineTo(xs[br].x, xs[br].y + 44);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 5) 沉浮玄武岩浮板（底部常驻柔和沸腾赤金熔岩反光晕 + 踩踏沉降警示辉光！）
      if (ch.rafts && cache.rafts) {
        ch.rafts.forEach(function (rf) {
          var rsp = cache.rafts[rf.variant % cache.rafts.length];
          var ry = getRaftTopY(rf, eras, t);
          var sc = rf.halfW / (rf.variant === 0 ? 64 : 58);
          ctx.save();
          ctx.translate(rf.x, ry);
          var baseGlow = 0.22 + rf.glow * 0.45;
          var rg = ctx.createRadialGradient(0, 18, 6, 0, 18, rf.halfW * 1.48);
          rg.addColorStop(0, 'rgba(255, 188, 94, ' + baseGlow + ')');
          rg.addColorStop(0.6, 'rgba(255, 102, 46, ' + (baseGlow * 0.42) + ')');
          rg.addColorStop(1, 'rgba(255, 82, 36, 0)');
          ctx.fillStyle = rg;
          ctx.beginPath(); ctx.ellipse(0, 18, rf.halfW * 1.48, 28, 0, 0, Math.PI * 2); ctx.fill();
          ctx.drawImage(rsp.canvas, -rsp.anchorX * sc, -rsp.anchorY * sc, rsp.w * sc, rsp.h * sc);
          ctx.restore();
        });
      }
    });

    ctx.restore();
  }

  // 炽海遗物（无黑边柔光余烬菱晶）
  function drawFireRelic(ctx, rel, x, y, t) {
    var owned = window.MT.Shop && window.MT.Shop.hasRelic && window.MT.Shop.hasRelic('fire_sea', rel.id);
    var breathe = 0.88 + 0.12 * Math.sin(t * 3.0 + rel.phase);
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = owned ? 0.44 : 0.96;

    var halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 46 * breathe);
    halo.addColorStop(0, owned ? 'rgba(255, 224, 178, 0.55)' : 'rgba(255, 240, 174, 0.84)');
    halo.addColorStop(0.48, owned ? 'rgba(255, 148, 86, 0.22)' : 'rgba(255, 126, 62, 0.38)');
    halo.addColorStop(1, 'rgba(255, 100, 48, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, 46 * breathe, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.rotate(-t * 0.85);
    ctx.strokeStyle = owned ? 'rgba(255, 212, 168, 0.48)' : 'rgba(255, 230, 152, 0.78)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, 16, 0.25, Math.PI * 1.75); ctx.stroke();
    ctx.restore();

    // 炽热余烬棱晶核心
    var cg = ctx.createRadialGradient(0, -2, 1, 0, 0, 12);
    cg.addColorStop(0, '#fffdf0');
    cg.addColorStop(0.55, '#ffc462');
    cg.addColorStop(1, '#e85a32');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(0, -11); ctx.lineTo(8, 0); ctx.lineTo(0, 11); ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // === 分层绘制 2：熔岩之上的前景光效（间歇热柱三态可视化、熔炉火盆圣火、黑曜桥顶沿高光、星火与遗物）===
  function drawWorldStructures(ctx, state) {
    var eras = window.MT.Eras;
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    var fireMix = state.eb ? (state.eb.fireMix || 0) : 0;
    if (fireMix < 0.05) return;

    ctx.save();
    ctx.globalAlpha = fireMix;

    chunks.forEach(function (ch) {
      if (ch.x1 < viewLeft - 240 || ch.x0 > viewRight + 240) return;

      // 1) 黑曜岩拱道 / 瀑崖阶梯 / 熔断残桥的可落脚清晰顶沿亮线
      if (ch.type === 'obsidian_arch' && ch.deck) {
        var dk = ch.deck;
        var midX = (ch.x0 + ch.x1) * 0.5;
        ctx.strokeStyle = 'rgba(255, 214, 152, 0.72)';
        ctx.lineWidth = 2.8;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(dk.x0, dk.y0 - 1.5); ctx.quadraticCurveTo(midX, dk.cy - 1.5, dk.x1, dk.y1 - 1.5); ctx.stroke();
      }
      if (ch.type === 'magma_cascade' && ch.ledges) {
        ctx.strokeStyle = 'rgba(255, 216, 154, 0.78)';
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ch.ledges.forEach(function (lg) {
          ctx.beginPath(); ctx.moveTo(lg.x0 + 4, lg.y0 - 1.5); ctx.lineTo(lg.x1 - 4, lg.y1 - 1.5); ctx.stroke();
        });
      }
      if (ch.type === 'collapsed_bridge' && ch.deck) {
        var bdk = ch.deck;
        ctx.strokeStyle = '#522c34';
        ctx.lineWidth = 9.0;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(bdk.x0, bdk.y0 + 1.5); ctx.lineTo(bdk.x1, bdk.y1 + 1.5); ctx.stroke();

        ctx.strokeStyle = '#ffcb86';
        ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(bdk.x0, bdk.y0 - 2.2); ctx.lineTo(bdk.x1, bdk.y1 - 2.2); ctx.stroke();
      }

      // 2) 间歇喷发节奏热柱（多层径向羽化热浪烟羽 + 流动上升丝光，彻底告别硬边塑料管子！）
      if (ch.geysers) {
        ch.geysers.forEach(function (gy) {
          var surfY = eras.getSurfaceY(gy.x, t);
          var r = gy.radius;

          if (gy.state === 'dormant') {
            var dPulse = 0.55 + 0.45 * Math.sin(t * 4.5 + gy.phaseOffset);
            var dg = ctx.createRadialGradient(gy.x, surfY, 2, gy.x, surfY, r * 0.95);
            dg.addColorStop(0, 'rgba(255, 198, 104, ' + (0.44 * dPulse) + ')');
            dg.addColorStop(0.55, 'rgba(255, 108, 48, ' + (0.20 * dPulse) + ')');
            dg.addColorStop(1, 'rgba(255, 92, 42, 0)');
            ctx.fillStyle = dg;
            ctx.beginPath(); ctx.ellipse(gy.x, surfY, r * 0.95, 12, 0, 0, Math.PI * 2); ctx.fill();
          } else if (gy.state === 'telegraph') {
            var blink = 0.65 + 0.35 * Math.sin(t * 16);
            // 柔和羽化预警热晕（零硬边多边形）
            for (var tb = 0; tb < 3; tb++) {
              var tu = tb / 2;
              var ty = surfY - 12 - tu * 58;
              var tr = r * (0.85 - tu * 0.24);
              var tg = ctx.createRadialGradient(gy.x, ty, 2, gy.x, ty, tr);
              tg.addColorStop(0, 'rgba(255, 228, 138, ' + (0.48 * blink * (1 - tu * 0.4)) + ')');
              tg.addColorStop(1, 'rgba(255, 132, 58, 0)');
              ctx.fillStyle = tg;
              ctx.beginPath(); ctx.ellipse(gy.x, ty, tr, tr * 0.72, 0, 0, Math.PI * 2); ctx.fill();
            }
          } else if (gy.power > 0.05) {
            var h = gy.maxH * gy.power;
            var wob = Math.sin(t * 7.5 + gy.phaseOffset) * 8;

            // 层叠 7 朵极度柔化的暖金上升热浪烟羽（边缘 100% 径向羽化归零，零硬切边！）
            var puffs = 7;
            for (var pf = 0; pf < puffs; pf++) {
              var pu = pf / (puffs - 1);
              var py = surfY - pu * h * 0.92;
              var px = gy.x + Math.sin(t * 6.2 + pf * 1.1 + gy.phaseOffset) * (4 + pu * 9) + wob * pu * 0.4;
              var prX = r * (0.96 - pu * 0.30);
              var prY = (h / puffs) * 1.25;
              var a = (0.48 - pu * 0.28) * gy.power;
              var pg = ctx.createRadialGradient(px, py, 2, px, py, Math.max(prX, prY));
              pg.addColorStop(0.00, pu < 0.28 ? ('rgba(255, 232, 146, ' + (a * 1.15) + ')') : ('rgba(255, 212, 128, ' + a + ')'));
              pg.addColorStop(0.50, 'rgba(255, 138, 64, ' + (a * 0.56) + ')');
              pg.addColorStop(1.00, 'rgba(255, 96, 44, 0)');
              ctx.fillStyle = pg;
              ctx.beginPath(); ctx.ellipse(px, py, prX, prY, 0, 0, Math.PI * 2); ctx.fill();
            }

            // 柔和上升暖光热流曲线丝（两端渐隐）
            ctx.lineCap = 'round';
            for (var s = -1; s <= 1; s++) {
              var sx = gy.x + s * r * 0.26;
              var sy0 = surfY - ((t * 200 + (s + 2) * 62) % Math.max(40, h * 0.88));
              var sy1 = Math.max(surfY - h, sy0 - 52);
              var sg = ctx.createLinearGradient(sx, sy0, sx, sy1);
              sg.addColorStop(0, 'rgba(255, 248, 206, 0)');
              sg.addColorStop(0.5, 'rgba(255, 248, 206, ' + (0.64 * gy.power) + ')');
              sg.addColorStop(1, 'rgba(255, 248, 206, 0)');
              ctx.strokeStyle = sg;
              ctx.lineWidth = s === 0 ? 2.4 : 1.5;
              ctx.beginPath();
              ctx.moveTo(sx, sy0);
              ctx.quadraticCurveTo(sx + wob * 0.25, (sy0 + sy1) * 0.5, sx - wob * 0.15, sy1);
              ctx.stroke();
            }
          }
        });
      }

      // 3) 月陨弹坑熔炉：悬链古铜火盆（点燃前后火焰清晰切换 + 圣火扩散光环）
      if (ch.type === 'crater_caldera') {
        var bx = ch.centerX, by = ch.brazierY;
        var sw = Math.sin(t * 2.2 + ch.phase) * 3;
        ctx.save();
        ctx.translate(bx + sw * 0.3, by);

        // 火焰光晕
        var fRad = ch.lit ? 74 : 38;
        var fg = ctx.createRadialGradient(0, -10, 4, 0, -10, fRad);
        fg.addColorStop(0, ch.lit ? 'rgba(255, 248, 194, 0.88)' : 'rgba(255, 194, 108, 0.42)');
        fg.addColorStop(0.5, ch.lit ? 'rgba(255, 146, 62, 0.42)' : 'rgba(255, 112, 54, 0.16)');
        fg.addColorStop(1, 'rgba(255, 92, 42, 0)');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(0, -10, fRad, 0, Math.PI * 2); ctx.fill();

        // 盆中跃动火焰（点燃后化为高耸明金圣火）
        var flH = (ch.lit ? 42 : 16) + Math.sin(t * 11) * 4;
        ctx.fillStyle = ch.lit ? '#fff2b0' : '#ffaa5c';
        ctx.beginPath();
        ctx.moveTo(-12, -2);
        ctx.quadraticCurveTo(-8, -flH * 0.65, 0, -flH);
        ctx.quadraticCurveTo(8, -flH * 0.65, 12, -2);
        ctx.closePath();
        ctx.fill();

        // 沉稳青铜锻铁盆体
        var bowlG = ctx.createLinearGradient(-22, -4, 22, 14);
        bowlG.addColorStop(0, '#3e242c');
        bowlG.addColorStop(0.55, '#6c3e40');
        bowlG.addColorStop(1, '#c87e58');
        ctx.fillStyle = bowlG;
        ctx.beginPath();
        ctx.moveTo(-22, -4); ctx.lineTo(22, -4);
        ctx.quadraticCurveTo(16, 13, 0, 14);
        ctx.quadraticCurveTo(-16, 13, -22, -4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        if (ch.flameWave > 0.02) {
          var rRad = 32 + (1 - ch.flameWave) * 165;
          ctx.strokeStyle = 'rgba(255, 226, 142, ' + (ch.flameWave * 0.78) + ')';
          ctx.lineWidth = 3.0;
          ctx.beginPath(); ctx.arc(bx, by, rRad, 0, Math.PI * 2); ctx.stroke();
        }
      }

      // 4) 区块空中炽金星火弧
      if (ch.airStars) {
        ch.airStars.forEach(function (as) {
          if (as.collected || as.x < viewLeft - 40 || as.x > viewRight + 40) return;
          var ay = as.y + Math.sin(as.phase) * 3.5;
          var tw = 0.78 + 0.22 * Math.sin(t * 4.5 + as.phase);
          var g = ctx.createRadialGradient(as.x, ay, 1, as.x, ay, 20 * tw);
          g.addColorStop(0, 'rgba(255, 246, 204, 0.94)');
          g.addColorStop(0.45, 'rgba(255, 174, 88, 0.42)');
          g.addColorStop(1, 'rgba(255, 130, 62, 0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(as.x, ay, 20 * tw, 0, Math.PI * 2); ctx.fill();

          ctx.fillStyle = '#fff9e0';
          ctx.beginPath();
          for (var s = 0; s < 8; s++) {
            var r = s % 2 === 0 ? (7.0 * tw) : (2.2 * tw);
            var ang = (s * Math.PI) / 4;
            if (s === 0) ctx.moveTo(as.x + Math.cos(ang) * r, ay + Math.sin(ang) * r);
            else ctx.lineTo(as.x + Math.cos(ang) * r, ay + Math.sin(ang) * r);
          }
          ctx.closePath(); ctx.fill();
        });
      }
    });

    // 3 枚炽海遗物
    relics.forEach(function (rel) {
      if (rel.pickedThisRun) return;
      if (rel.x < viewLeft - 90 || rel.x > viewRight + 90) return;
      drawFireRelic(ctx, rel, rel.x, rel.y + Math.sin(rel.phase) * 5, t);
    });

    ctx.restore();
  }

  // === 分层绘制 3：木舟前方飞溅火星粒子 ===
  function drawWorldFront(ctx, state) {
    if (fireSparks.length === 0) return;
    var viewLeft = state.viewLeft, viewRight = state.viewRight;
    ctx.save();
    for (var i = 0; i < fireSparks.length; i++) {
      var sp = fireSparks[i];
      if (sp.x < viewLeft - 20 || sp.x > viewRight + 20) continue;
      var a = clamp(sp.life / sp.maxLife, 0, 1);
      ctx.globalAlpha = a * 0.92;
      ctx.fillStyle = sp.col;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r * (0.5 + a * 0.6), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  window.MT.LevelEngine.register('fire_sea', {
    id: 'fire_sea',
    reset: reset,
    onExit: onExit,
    getRelicStatus: getRelicStatus,
    handleSurfacePhysics: handleSurfacePhysics,
    handleChunkInteractions: handleChunkInteractions,
    update: update,
    drawWorldBack: drawWorldBack,
    drawWorldStructures: drawWorldStructures,
    drawWorldFront: drawWorldFront
  });
})();
