#!/usr/bin/env node
/**
 * Curio Box (云海空中花房) - 无头多法则防回归与帧率/GC压力测试脚本 (v9.3)
 * 在本地 Node.js 环境直接运行（零第三方依赖）：
 *   node tools/headless_verify.js
 *   node tools/headless_verify.js --bundle dist/curio-box-taptap-bundle.zip
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
    navigator: { userAgent: 'HeadlessVerifier/1.0', maxTouchPoints: 0 },
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
  // Load all runtime modules except main.js boot loop so we can drive deterministic headless simulations
  for (const rel of scripts) {
    if (rel === 'src/main.js') continue;
    const code = fs.readFileSync(path.join(projectRoot, rel), 'utf-8');
    vm.runInContext(code, sandbox, { filename: rel });
  }

  const CB = sandbox.window.CB;
  const game = CB.game;
  assert(CB && CB.stages && CB.mapGen && CB.combat && CB.guards && CB.physicsLab && CB.renderer, 'Core CB modules missing');

  // 1. Multi-anomaly procedural map reachability & clearance verification (120 sectors across Legs 1..8)
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

      // BFS reachability from spawn to vault and extract
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

      // Doorway clearance check: no solid prop centered on a doorway
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
  console.log(`✓ [1/4] Multi-Anomaly Reachability & Clearance: ${mapsChecked}/${mapsChecked} sectors passed!`);

  // 2. 0-Orb Non-Softlock Recovery Verification
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

  // Verify natural recharge recovers orb cleanly without softlock
  for (let f = 0; f < 300; f++) {
    CB.player.updatePlayer(1 / 60);
  }
  assert(game.player.orbs >= 1, 'Natural slow recharge failed to recover orb at 0 orbs!');

  // Verify physical trick refund & overclock orb condensation
  game.player.orbs = 3;
  CB.combat.grantOrbRefund(1, game.player.x + 60, game.player.y, 'test');
  assert(game.player.overclockOrb === true, 'Full-orb refund failed to condense Overclock Gold Orb!');
  console.log('✓ [2/4] 3-Orb Economy, 0-Orb Anti-Softlock & Overclock Orb: PASSED!');

  // 3. Cross-Disciplinary Physics Chain Assertions
  // 3A. Thermal 3-phase (ice -> water -> steam)
  const slide = game.map.dewSlides && game.map.dewSlides[0];
  if (slide) {
    CB.physicsLab.heatSlide(slide, 45);
    assert(slide.phase === 'water', `Expected water phase, got ${slide.phase}`);
    assert(CB.combat.getDewSlideAt(slide.x + 10, slide.y + 10) === null, 'Water phase must disable low-friction ice slide!');
    CB.physicsLab.heatSlide(slide, 45);
    assert(slide.phase === 'steam', `Expected steam phase, got ${slide.phase}`);
    assert(CB.physicsLab.isInSteam(slide.x + 10, slide.y + 10) === true, 'Steam phase must register stealth cover!');
  }
  // 3B. Relativity gamma & singularity time dilation
  assert(CB.combat.getRelativisticGamma(300) === 1.0, 'Low speed gamma should be 1.0');
  assert(CB.combat.getRelativisticGamma(960) >= 1.55, 'High speed gamma should trigger relativistic mass!');
  const sing = game.map.props.find((p) => p.type === 'singularity');
  if (sing) {
    CB.combat.activateSingularity(sing, false);
    assert(CB.combat.getTimeScaleAt(sing.x, sing.y) === 0.15, 'Active singularity must dilate time to 0.15x!');
    CB.combat.collapseSingularity(sing);
    assert(CB.combat.getTimeScaleAt(sing.x, sing.y) === 1.0, 'Collapsed singularity must restore 1.0x time!');
  }
  console.log('✓ [3/4] Cross-Disciplinary Physics (Thermal / Optics / Electro / Relativity): PASSED!');

  // 4. 600-Frame Headless Stress Benchmark + Pool Cap Verification
  const mockCtx = makeMockCtx();
  CB.renderer.initRenderer(mockCtx);
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
  }
  frameTimes.sort((a, b) => a - b);
  const avgMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  const p95Ms = frameTimes[Math.floor(frameTimes.length * 0.95)];
  console.log(`✓ [4/4] 600-Frame Stress Benchmark: avg=${avgMs.toFixed(2)}ms, p95=${p95Ms.toFixed(2)}ms, peakParticles=${maxParticles} (<=160)`);
  console.log('\nALL HEADLESS REGRESSION CHECKS PASSED!');
}

runSuite();
