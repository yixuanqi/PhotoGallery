#!/usr/bin/env node
/**
 * Curio Box (云海空中花房) - 全分支无头烟测、多法则防回归与帧率/GC 压力测试脚本 (v9.6.3)
 * 在本地 Node.js 环境直接运行（零第三方依赖）：
 *   node tools/headless_verify.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  return {
    save: noop, restore: noop, translate: noop, scale: noop, rotate: noop, setTransform: noop,
    clearRect: noop, fillRect: noop, strokeRect: noop, beginPath: noop, closePath: noop,
    moveTo: noop, lineTo: noop, quadraticCurveTo: noop, bezierCurveTo: noop, arc: noop,
    ellipse: noop, rect: noop, roundRect: noop, fill: noop, stroke: noop, clip: noop,
    setLineDash: noop, fillText: noop, strokeText: noop, drawImage: noop,
    measureText: (t) => ({ width: String(t || '').length * 8 }),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => ({}),
    canvas: { width: 1280, height: 720 },
  };
}

function makeMockElement(id = '') {
  const classes = new Set();
  return {
    id,
    width: 1280,
    height: 720,
    style: {},
    dataset: {},
    textContent: '',
    innerHTML: '',
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      toggle: (c, force) => (force === undefined ? (classes.has(c) ? classes.delete(c) : classes.add(c)) : (force ? classes.add(c) : classes.delete(c))),
      contains: (c) => classes.has(c),
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelectorAll: () => [],
    querySelector: () => null,
    getContext: () => makeMockCtx(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
    appendChild: () => {},
    removeChild: () => {},
  };
}

function createSandbox() {
  const storage = new Map();
  const elements = new Map();
  const getEl = (id) => {
    if (!elements.has(id)) elements.set(id, makeMockElement(id));
    return elements.get(id);
  };
  const ctxObj = {
    Math, Date, JSON, Array, Object, Set, Map, Number, String, Boolean, RegExp, Error, Promise,
    parseInt, parseFloat, isNaN, isFinite,
    console,
    setTimeout: () => 1,
    clearTimeout: () => {},
    requestAnimationFrame: () => 1,
    performance: { now: () => Date.now() },
    navigator: { userAgent: 'HeadlessVerifier/2.0', maxTouchPoints: 0 },
    localStorage: {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k),
    },
    document: {
      hidden: false,
      fullscreenEnabled: false,
      body: makeMockElement('body'),
      documentElement: makeMockElement('html'),
      getElementById: getEl,
      querySelectorAll: () => [],
      createElement: (tag) => makeMockElement(tag),
      addEventListener: () => {},
    },
    CanvasRenderingContext2D: function () {},
  };
  ctxObj.CanvasRenderingContext2D.prototype = makeMockCtx();
  ctxObj.window = ctxObj;
  ctxObj.window.innerWidth = 1280;
  ctxObj.window.innerHeight = 720;
  ctxObj.window.devicePixelRatio = 1;
  ctxObj.window.addEventListener = () => {};
  ctxObj.window.removeEventListener = () => {};
  ctxObj.window.matchMedia = () => ({ matches: false });
  return vm.createContext(ctxObj);
}

function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function runSuite() {
  const projectRoot = path.dirname(__dirname);
  const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf-8');
  const scripts = [...indexHtml.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1].replace(/^\.\//, ''));
  assert(scripts.length >= 17, `Expected >= 17 scripts, found ${scripts.length}`);

  const sandbox = createSandbox();
  for (const rel of scripts) {
    if (rel === 'src/main.js') continue;
    const code = fs.readFileSync(path.join(projectRoot, rel), 'utf-8');
    vm.runInContext(code, sandbox, { filename: rel });
  }

  const CB = sandbox.window.CB;
  const game = CB.game;
  assert(CB && CB.stages && CB.mapGen && CB.combat && CB.guards && CB.physicsLab && CB.renderer && CB.ui && CB.intro, 'Core CB modules missing');

  const mockCtx = makeMockCtx();
  const mockMiniCtx = makeMockCtx();
  const mockMiniCanvas = makeMockElement('minimapCanvas');
  mockMiniCanvas.width = 160;
  mockMiniCanvas.height = 160;
  CB.renderer.initRenderer(mockCtx);

  // ==================== [1/6] Multi-Anomaly Reachability & Clearance + 3 Trial Arenas ====================
  const anomalySuites = [
    ['friction'], ['gravity'], ['stealth'], ['relativity'], ['thermal'], ['optics'], ['electro'],
    ['friction', 'gravity'], ['optics', 'thermal'], ['thermal', 'electro'], ['optics', 'electro'],
    ['relativity', 'electro'], ['friction', 'relativity'], ['thermal', 'optics', 'electro', 'relativity'],
  ];

  let mapsChecked = 0;
  for (let leg = 1; leg <= 8; leg++) {
    for (let s = 0; s < anomalySuites.length; s++) {
      const anomalies = anomalySuites[s];
      const spec = CB.stages.buildSectorSpec({ leg, anomalies });
      const map = CB.mapGen.generateMap(spec, 10000 + leg * 100 + s);
      assert(map && map.rooms && map.rooms.length >= 4, `Invalid map at leg ${leg} ${anomalies}`);

      const adj = new Map();
      for (const r of map.rooms) adj.set(r.id, new Set());
      for (const d of map.doorways) {
        if (adj.has(d.roomA) && adj.has(d.roomB)) {
          adj.get(d.roomA).add(d.roomB);
          adj.get(d.roomB).add(d.roomA);
        }
      }
      const seen = new Set([map.spawnRoomId]);
      const q = [map.spawnRoomId];
      while (q.length) {
        const cur = q.shift();
        for (const nxt of adj.get(cur) || []) {
          if (!seen.has(nxt)) { seen.add(nxt); q.push(nxt); }
        }
      }
      assert(seen.has(map.vaultRoomId), `Vault unreachable on leg ${leg} ${anomalies}`);
      assert(seen.has(map.extractRoomId), `Extract unreachable on leg ${leg} ${anomalies}`);
      assert(seen.size === map.rooms.length, `Disconnected rooms on leg ${leg} ${anomalies}`);

      for (const d of map.doorways) {
        for (const p of map.props) {
          if (p.type === 'wormhole') continue;
          const px = p.shape === 'circle' ? p.x : p.x + p.w * 0.5;
          const py = p.shape === 'circle' ? p.y : p.y + p.h * 0.5;
          const dist = Math.hypot(px - d.cx, py - d.cy);
          assert(dist > 28, `Prop ${p.type} too close (${dist.toFixed(1)}px) to doorway in ${anomalies}`);
        }
      }
      mapsChecked++;
    }
  }
  for (let tv = 0; tv < 3; tv++) {
    const tSpec = CB.stages.buildSectorSpec({ leg: 2, nodeType: 'trial', trialVariant: tv, anomalies: ['thermal', 'optics', 'electro'] });
    const tMap = CB.mapGen.generateMap(tSpec, 7700 + tv);
    assert(tMap && tMap.rooms.length === 1 && tMap.trialGuardSpawns.length === 3, `Invalid trial arena variant ${tv}`);
    game.map = tMap;
    CB.extraction.resetRunState(false);
    CB.player.placePlayerAtSpawn(true);
    CB.guards.populateGuardsForMap(tMap);
    CB.renderer.refreshStageTheme(mockCtx, tMap.stage);
    CB.renderer.renderWorld(mockCtx);
    mapsChecked++;
  }
  console.log(`✓ [1/6] Multi-Anomaly Reachability & Trial Arenas: ${mapsChecked}/${mapsChecked} maps passed!`);

  // ==================== [2/6] Full 8-Climate Sky / Fog / Tile / Railing / Intro Smoke Test ====================
  const climateIds = Object.keys(CB.stages.CLIMATES);
  assert(climateIds.length >= 8, `Expected >= 8 climates, found ${climateIds.length}`);

  for (let ci = 0; ci < climateIds.length; ci++) {
    const cid = climateIds[ci];
    const spec = CB.stages.buildSectorSpec({
      leg: ci + 1,
      climateId: cid,
      anomalies: ci % 2 === 0 ? ['optics', 'thermal'] : ['relativity', 'electro'],
      wantAtrium: ci === 7,
    });
    game.map = CB.mapGen.generateMap(spec, 88000 + ci);
    CB.extraction.resetRunState(false);
    CB.player.placePlayerAtSpawn(true);
    CB.guards.populateGuardsForMap(game.map);
    CB.renderer.refreshStageTheme(mockCtx, game.map.stage);
    if (CB.audio && CB.audio.setAmbienceStage) CB.audio.setAmbienceStage(game.map.stage.id);

    // Force-exercise broken railing stubs, intact railings, solid fog, fading fog, clear view & overview!
    if (game.map.cliffEdges) {
      let brokeOne = false;
      for (const edge of game.map.cliffEdges) {
        if (edge.kind === 'railing' && !brokeOne) {
          edge.broken = true;
          brokeOne = true;
        }
      }
    }
    if (game.map.rooms.length >= 3) {
      game.map.rooms[1].fogAlpha = 1.0;
      game.map.rooms[2].fogAlpha = 0.5;
    }
    game.titleOpen = false;
    game.introActive = false;
    game.showFog = true;
    game.mapOverview = false;
    game.time = 1.5 + ci * 0.7;
    CB.renderer.renderWorld(mockCtx);

    game.showFog = false;
    game.mapOverview = true;
    CB.renderer.renderWorld(mockCtx);
    CB.ui.renderMinimap(mockMiniCtx, mockMiniCanvas);
  }
  game.mapOverview = false;
  game.showFog = true;

  // Smoke-test Intro Gate & all 4 Intro Cutscene Scenes
  CB.intro.renderIntroGate(mockCtx, 1280, 720, 1.2);
  CB.intro.startIntro(null);
  for (const dtStep of [0.5, 2.5, 3.0, 2.6]) {
    CB.intro.updateIntro(dtStep);
    CB.intro.renderIntro(mockCtx, 1280, 720);
  }
  CB.intro.skipIntro();
  console.log(`✓ [2/6] Full ${climateIds.length}-Climate Render (Sky / Fog / Tiles / Broken Railings / Intro): PASSED!`);

  // ==================== [3/6] Full 13-Guard Render, Portrait & Counter-Mechanics Smoke Test ====================
  const guardKinds = Object.keys(CB.guards.GUARD_SPECS);
  assert(guardKinds.length >= 13, `Expected >= 13 guard specs, found ${guardKinds.length}`);

  const arenaSpec = CB.stages.buildSectorSpec({ leg: 4, climateId: 'horizon_void', anomalies: ['thermal', 'optics', 'electro', 'relativity'], wantAtrium: true });
  game.map = CB.mapGen.generateMap(arenaSpec, 515151);
  CB.extraction.resetRunState(false);
  CB.player.placePlayerAtSpawn(true);
  CB.renderer.refreshStageTheme(mockCtx, game.map.stage);
  const spawnRoom = game.map.rooms[game.map.spawnRoomId];
  const mockPortCtx = makeMockCtx();

  for (let gi = 0; gi < guardKinds.length; gi++) {
    const kind = guardKinds[gi];
    // Test both locked silhouette & unlocked codex portrait
    CB.guards.drawGuardPortrait(mockPortCtx, kind, 76, 1.2, true);
    CB.guards.drawGuardPortrait(mockPortCtx, kind, 76, 1.2, false);

    game.guards = [];
    const g = CB.guards.spawnReinforcement(kind, spawnRoom, game.player.x, game.player.y);
    assert(g && g.kind === kind, `Failed to spawn guard kind ${kind}`);

    // Exercise normal render, billiard trail, time-dilation vector arrow, damage mechanics & AI tick
    g.billiardMode = true;
    g.billiardTrail = [{ x: g.x - 12, y: g.y, dew: true, rel: true }, { x: g.x, y: g.y, dew: false, rel: true }];
    g.isTimeDilated = true;
    g.dilatedStoredVx = 240;
    g.dilatedStoredVy = -120;
    CB.renderer.renderWorld(mockCtx);

    g.isTimeDilated = false;
    g.dilatedStoredVx = 0;
    g.dilatedStoredVy = 0;
    if (kind === 'frost_snail') {
      CB.guards.meltFrostShell(g, 50);
      assert(g.meltedWetTimer > 0, 'frost_snail should melt into wet state!');
      CB.guards.damageGuard(g, 18, 1, 0, true, null, true, { source: 'bullet', electro: true });
    } else if (kind === 'prism_weaver') {
      CB.guards.damageGuard(g, 20, 1, 0, true, null, true, { source: 'bullet', prism: true, laserWeb: true });
    } else if (kind === 'volt_automaton') {
      CB.guards.damageGuard(g, 15, 1, 0, true, null, true, { source: 'bullet', electro: true });
      assert(g.voltOverloadTimer > 0, 'volt_automaton should overload on electro hit!');
    } else {
      CB.guards.damageGuard(g, 22, 1, 0, true, null, true, { source: 'billiard', isHeavy: true, relGamma: 1.8 });
    }
    CB.guards.updateGuards(1 / 60);
    CB.renderer.renderWorld(mockCtx);
  }
  console.log(`✓ [3/6] Full ${guardKinds.length}-Guard Smoke Test (AI / Render / Portraits / Counters): PASSED!`);

  // ==================== [4/6] Orb Economy, High-Tier Upgrades, Black Market & Offline Daily Challenge ====================
  const testSpec = CB.stages.buildSectorSpec({ leg: 4, anomalies: ['thermal', 'optics', 'electro', 'relativity'], wantAtrium: true });
  game.map = CB.mapGen.generateMap(testSpec, 424242);
  CB.extraction.resetRunState(false);
  CB.player.placePlayerAtSpawn(true);
  CB.guards.populateGuardsForMap(game.map);

  assert(game.player.orbs === 3, 'Player should spawn with 3 Star-Dew Orbs');
  CB.combat.fireLauncher(0.9, true);
  CB.combat.fireLauncher(0.9, true);
  CB.combat.fireLauncher(0.9, true);
  assert(game.player.orbs === 0, '3 heavy shots should consume 3 orbs');

  for (let f = 0; f < 300; f++) {
    CB.player.updatePlayer(1 / 60);
  }
  assert(game.player.orbs >= 1, 'Natural slow recharge failed to recover orb at 0 orbs!');

  game.player.orbs = 3;
  CB.combat.grantOrbRefund(1, game.player.x + 60, game.player.y, 'test');
  assert(game.player.overclockOrb === true, 'Full-orb refund failed to condense Overclock Gold Orb!');

  // High-tier workshop expansion check (orbCap -> 4 orbs, salvagePod -> 50%, chartScope -> 2 rerolls)
  game.meta.bankValue = 5000;
  assert(CB.extraction.buyUpgrade('orbCap').ok, 'orbCap upgrade failed');
  assert(CB.extraction.getMetaBonuses().maxOrbs === 4, 'orbCap should raise maxOrbs to 4');
  assert(CB.extraction.buyUpgrade('salvagePod').ok, 'salvagePod upgrade failed');
  assert(CB.extraction.buyUpgrade('chartScope').ok, 'chartScope upgrade failed');

  // Floating Black Market & Offline Daily Challenge
  const offers = CB.extraction.getMarketOffers();
  assert(offers.length === 3, 'Market should offer 3 curios');
  assert(CB.extraction.buyMarketRest(35).ok, 'Market rest failed');
  const dailySpec = CB.extraction.getDailyChallengeSpec();
  assert(dailySpec && dailySpec.bounties.length === 3 && dailySpec.seed >= 100000, 'Invalid Daily Challenge spec');
  // v9.7 Crate Skill Packs: Heal (+30HP / overflow shield) & 18s 2-Layer Shield absorption + expiration
  game.skillPacks = [];
  const pkH = CB.combat.spawnSkillPack('heal', game.player.x, game.player.y);
  const pkS = CB.combat.spawnSkillPack('shield', game.player.x + 28, game.player.y);
  assert(pkH && pkS && game.skillPacks.length === 2, 'Failed to spawn v9.7 heal & shield skill packs');
  CB.renderer.renderWorld(mockCtx);
  game.player.hp = 60;
  CB.player.applySkillHeal(30);
  assert(game.player.hp === 90, `Expected 90 HP after heal, got ${game.player.hp}`);
  CB.player.grantSkillShield(2, 18, false);
  assert(game.player.shieldCharges === 2 && game.player.shieldTimer === 18, '2-layer 18s shield failed to grant');
  CB.renderer.renderWorld(mockCtx);
  CB.player.damagePlayer(25, 1, 0);
  assert(game.player.hp === 90 && game.player.shieldCharges === 1, 'Shield layer 1 should absorb damage without HP loss');
  game.player.invulnTimer = 0;
  CB.player.damagePlayer(25, 1, 0);
  assert(game.player.hp === 90 && game.player.shieldCharges === 0 && game.player.shieldTimer === 0, 'Shield layer 2 should absorb damage and expire cleanly');
  CB.player.grantSkillShield(2, 18, false);
  for (let t = 0; t < 20; t++) CB.player.updatePlayer(1.0);
  assert(game.player.shieldCharges === 0 && game.player.shieldTimer === 0, '18s shield should expire after 18s');
  // v9.8 Rare & Legendary Active Skills (homing / gust_bottle / golden_body / chrono_watch) + Active Slot Swap
  assert(CB.combat.SKILL_PACK_DEFS.length >= 6, 'Expected >= 6 skills in SKILL_PACK_DEFS');
  for (const skId of ['homing', 'gust_bottle', 'golden_body', 'chrono_watch']) {
    const pkA = CB.combat.spawnSkillPack(skId, game.player.x + 20, game.player.y);
    assert(pkA && pkA.kind === 'active', `Failed to spawn active skill pack ${skId}`);
  }
  CB.renderer.renderWorld(mockCtx);

  game.player.heldSkill = { id: 'homing', name: '折光自导', shortLabel: '自导', icon: '🎯', rarity: 'rare', duration: 9.0 };
  assert(CB.player.activateHeldSkill() === true && game.player.homingTimer === 9.0 && game.player.heldSkill === null, 'homing cast failed');
  CB.renderer.renderWorld(mockCtx);

  game.player.heldSkill = { id: 'golden_body', name: '鎏金金身', shortLabel: '金身', icon: '✨', rarity: 'legendary', duration: 5.5 };
  assert(CB.player.activateHeldSkill() === true && game.player.goldenBodyTimer === 5.5, 'golden_body cast failed');
  const hpBeforeGolden = game.player.hp;
  CB.player.damagePlayer(40, 1, 0);
  assert(game.player.hp === hpBeforeGolden, 'golden_body must grant full invulnerability!');
  CB.renderer.renderWorld(mockCtx);

  game.player.heldSkill = { id: 'chrono_watch', name: '时停怀表', shortLabel: '时停', icon: '⏳', rarity: 'legendary', duration: 4.0 };
  assert(CB.player.activateHeldSkill() === true && game.player.chronoWatchTimer === 4.0, 'chrono_watch cast failed');
  assert(CB.combat.getTimeScaleAt(game.player.x, game.player.y) <= 0.2, 'chrono_watch must trigger 0.2x global bullet-time!');
  CB.renderer.renderWorld(mockCtx);

  game.player.heldSkill = { id: 'gust_bottle', name: '顺风狂澜瓶', shortLabel: '狂风瓶', icon: '🌬️', rarity: 'rare', duration: 0 };
  assert(CB.player.activateHeldSkill() === true && game.galeWaves.length >= 1, 'gust_bottle cast failed');
  CB.renderer.renderWorld(mockCtx);
  game.player.homingTimer = 0;
  game.player.goldenBodyTimer = 0;
  game.player.chronoWatchTimer = 0;
  console.log('✓ [4/6] Orb Economy, Upgrades, Market, Daily & v9.8 Full 6-Skill Pack Suite: PASSED!');

  // ==================== [5/6] Cross-Disciplinary Physics & 4 Discipline Synergies ====================
  const slide = game.map.dewSlides && game.map.dewSlides[0];
  if (slide) {
    CB.physicsLab.heatSlide(slide, 45);
    assert(slide.phase === 'water', `Expected water phase, got ${slide.phase}`);
    assert(CB.combat.getDewSlideAt(slide.x + 10, slide.y + 10) === null, 'Water phase must disable low-friction ice slide!');
    CB.physicsLab.heatSlide(slide, 45);
    assert(slide.phase === 'steam', `Expected steam phase, got ${slide.phase}`);
    assert(CB.physicsLab.isInSteam(slide.x + 10, slide.y + 10) === true, 'Steam phase must register stealth cover!');
  }
  assert(CB.combat.getRelativisticGamma(300) === 1.0, 'Low speed gamma should be 1.0');
  assert(CB.combat.getRelativisticGamma(960) >= 1.55, 'High speed gamma should trigger relativistic mass!');
  const sing = game.map.props.find((p) => p.type === 'singularity');
  if (sing) {
    CB.combat.activateSingularity(sing, false);
    assert(CB.combat.getTimeScaleAt(sing.x, sing.y) === 0.15, 'Active singularity must dilate time to 0.15x!');
    CB.combat.collapseSingularity(sing);
    assert(CB.combat.getTimeScaleAt(sing.x, sing.y) === 1.0, 'Collapsed singularity must restore 1.0x time!');
  }

  // Test all 4 Discipline Synergies (2 curios each)
  game.player.curios = [
    CB.extraction.REGULAR_CURIOS.find((c) => c.id === 'thermo_valve'),
    CB.extraction.REGULAR_CURIOS.find((c) => c.id === 'billiard_wax'),
    CB.extraction.REGULAR_CURIOS.find((c) => c.id === 'mirror_prism'),
    CB.extraction.REGULAR_CURIOS.find((c) => c.id === 'split_crystal'),
    CB.extraction.REGULAR_CURIOS.find((c) => c.id === 'faraday_coil'),
    CB.extraction.REGULAR_CURIOS.find((c) => c.id === 'aero_feather'),
    CB.extraction.REGULAR_CURIOS.find((c) => c.id === 'event_horizon'),
    CB.extraction.REGULAR_CURIOS.find((c) => c.id === 'lorentz_prism'),
  ].filter(Boolean);
  assert(CB.extraction.getActiveSynergies().length === 4, 'All 4 discipline synergies should activate!');
  CB.physicsLab.triggerDashElectroArc(game.player.x, game.player.y, game.player.x + 80, game.player.y);
  CB.physicsLab.spawnMiniDilationBubble(game.player.x + 60, game.player.y);
  assert(game.dilationBubbles.length >= 1, 'Relativity synergy failed to spawn mini dilation bubble!');
  console.log('✓ [5/6] Cross-Disciplinary Physics & All 4 Discipline Synergies: PASSED!');

  // ==================== [6/6] 600-Frame Headless Stress Benchmark + Pool Cap Verification ====================
  CB.renderer.refreshStageTheme(mockCtx, game.map.stage);
  const frameTimes = [];
  let maxParticles = 0;
  for (let f = 0; f < 600; f++) {
    const t0 = performance.now();
    game.time += 1 / 60;
    CB.player.updatePlayer(1 / 60);
    CB.combat.updateCombat(1 / 60);
    CB.guards.updateGuards(1 / 60);
    CB.physicsLab.updatePhysicsLab(1 / 60);
    CB.extraction.updateExtractionLoop(1 / 60);
    CB.renderer.renderWorld(mockCtx);
    frameTimes.push(performance.now() - t0);
    if (game.particles.length > maxParticles) maxParticles = game.particles.length;
    assert(game.particles.length <= 160, `Particle cap exceeded: ${game.particles.length}`);
    assert(game.footprints.length <= 64, `Footprint cap exceeded: ${game.footprints.length}`);
    assert(game.popups.length <= 24, `Popup cap exceeded: ${game.popups.length}`);
    assert(game.lightningArcs.length <= 24, `LightningArc cap exceeded: ${game.lightningArcs.length}`);
  }
  frameTimes.sort((a, b) => a - b);
  const avgMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  const p95Ms = frameTimes[Math.floor(frameTimes.length * 0.95)];
  console.log(`✓ [6/6] 600-Frame Stress Benchmark: avg=${avgMs.toFixed(2)}ms, p95=${p95Ms.toFixed(2)}ms, peakParticles=${maxParticles} (<=160)`);
  console.log('\nALL HEADLESS FULL-BRANCH REGRESSION CHECKS PASSED!');
}

runSuite();
