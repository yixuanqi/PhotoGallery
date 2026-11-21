// Player, enemy & boss entity factories
import { FLOOR_Y, WELL_BOTTOM_Y, ENEMIES_DEF, BOSSES_DEF } from './config.js';
import { getPlayerMaxHp, getPlayerMaxSoul, getPlayerMaxFlasks, getPlayerMaxSeals, getCombatScaling } from './state.js';
import { createCloak } from './vfx.js';

export function createPlayer(x = 340, y = FLOOR_Y - 56) {
  return {
    x, y,
    w: 28,
    h: 54,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: false,
    wasGrounded: false,
    onPlatform: false,
    dropThroughTimer: 0,
    wallDir: 0,
    coyoteTimer: 0,
    airJumpsLeft: 1,
    jumpBufTimer: 0,
    attackBufTimer: 0,
    parryBufTimer: 0,
    dashBufTimer: 0,
    castBufTimer: 0,
    grappleBufTimer: 0,
    sealBufTimer: 0,
    wallJumpLock: 0,

    hp: getPlayerMaxHp(),
    maxHp: getPlayerMaxHp(),
    grayHp: 0,
    grayTimer: 0,

    flasks: getPlayerMaxFlasks(),
    maxFlasks: getPlayerMaxFlasks(),
    soul: getPlayerMaxSoul(),
    maxSoul: getPlayerMaxSoul(),
    seals: 0,
    maxSeals: getPlayerMaxSeals(),

    // Attack / Combo / Charge Iai / Riposte
    attackTimer: 0,
    attackDuration: 0.22,
    attackCd: 0,
    attackType: 'slash1',
    activeAttack: null,
    sealLunge: null,
    comboStep: 0,
    comboResetTimer: 0,
    isCharging: false,
    chargeTime: 0,
    chargeReadyPlayed: false,
    iaiLungeTimer: 0,
    riposteWindow: 0,

    // 3-Tier Parry
    parryActive: false,
    parryElapsedMs: 0,
    parryCooldown: 0,
    parryStreak: 0,
    parryStreakTimer: 0,
    freeSealProc: false,

    // Dash, Seal Lunge, Spell, Grapple, Heal, Execution
    dashTimer: 0,
    dashCd: 0,
    dashDir: 1,
    shadeDashCd: 0,
    shadeDashActive: false,
    shadePassTimer: 0,
    shadeHitIds: null,
    shadeGrappleBoostTimer: 0,
    barrierHintCd: 0,
    detonateLungeTimer: 0,
    castTimer: 0,
    castCd: 0,
    grappleState: 'none', // none, extending, pulling
    grappleTimer: 0,
    grappleCd: 0,
    grappleTarget: null,
    grappleTx: 0,
    grappleTy: 0,
    lastGrappleRef: null,
    lastGrappleIgnoreTimer: 0,
    healTimer: 0,
    healDone: false,
    execTimer: 0,

    lastSafeX: x,
    lastSafeY: y,
    riverCd: 0,
    iframeTimer: 0,
    hurtTimer: 0,
    deathTimer: 0,
    stepSfxAccum: 0,
    squashX: 1,
    squashY: 1,
    bodyLean: 0,
    landCrouch: 0,
    prevVx: 0,
    runCycle: 0,
    lanternSwing: 0,
    cloak: createCloak(x, y + 18, 6, 8),
    scarf: createCloak(x, y + 16, 7, 7)
  };
}

export function makeSentinel(id, x, y, minX, maxX) {
  return {
    id,
    name: '持矛枯骨哨兵',
    kind: 'sentinel',
    isBoss: false,
    x, y,
    w: 36,
    h: 62,
    vx: 0,
    vy: 0,
    facing: -1,
    minX, maxX,
    hp: 115,
    maxHp: 115,
    posture: 0,
    maxPosture: 65,
    postureDecayDelay: 0,
    alive: true,
    state: 'patrol', // patrol, chase, windup, attack, recover, stagger
    stateTimer: 0,
    attackKind: 'thrust', // thrust (gold), redLunge (crimson)
    didHit: false,
    hurtFlash: 0,
    walkCycle: 0,
    cloak: createCloak(x, y + 20, 5, 9)
  };
}

export function makeWraith(id, x, y) {
  return {
    id,
    name: '悬灯怨灵',
    kind: 'wraith',
    isBoss: false,
    x, y,
    homeX: x,
    homeY: y,
    w: 36,
    h: 48,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 72,
    maxHp: 72,
    posture: 0,
    maxPosture: 45,
    postureDecayDelay: 0,
    alive: true,
    state: 'hover', // hover, windup, recover, stagger
    stateTimer: 1.2 + Math.random() * 0.7,
    hurtFlash: 0,
    bobPhase: Math.random() * Math.PI * 2,
    cloak: createCloak(x, y + 18, 5, 8)
  };
}

export function makeGolem(id, x, y, minX, maxX) {
  return {
    id,
    name: '守钟铁卫',
    kind: 'golem',
    isBoss: false,
    x, y,
    w: 46,
    h: 78,
    vx: 0,
    vy: 0,
    facing: -1,
    minX, maxX,
    hp: 165,
    maxHp: 165,
    posture: 0,
    maxPosture: 95,
    postureDecayDelay: 0,
    alive: true,
    state: 'patrol', // patrol, chase, windup, attack, recover, stagger
    stateTimer: 0,
    attackKind: 'smash', // smash (gold parryable), redBash (crimson unparryable)
    shieldBrokenTimer: 0,
    didHit: false,
    hurtFlash: 0,
    cloak: createCloak(x, y + 26, 6, 10)
  };
}

export function makePriest(id, x, y) {
  return {
    id,
    name: '敲钟祭司',
    kind: 'priest',
    isBoss: false,
    x, y,
    w: 36,
    h: 66,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 86,
    maxHp: 86,
    posture: 0,
    maxPosture: 52,
    postureDecayDelay: 0,
    alive: true,
    state: 'idle', // idle, chant, pulse, recover, stagger
    stateTimer: 1.0,
    chantTargetId: null,
    wardShield: 0,
    didHit: false,
    hurtFlash: 0,
    cloak: createCloak(x, y + 20, 6, 9)
  };
}

export function makeDuelist(id, x, y, minX, maxX) {
  return {
    id,
    name: '连刃武者',
    kind: 'duelist',
    isBoss: false,
    x, y,
    w: 34,
    h: 60,
    vx: 0,
    vy: 0,
    facing: -1,
    minX, maxX,
    hp: 138,
    maxHp: 138,
    posture: 0,
    maxPosture: 82,
    postureDecayDelay: 0,
    alive: true,
    state: 'patrol', // patrol, chase, windup, attack, recover, stagger
    stateTimer: 0,
    attackKind: 'combo3', // combo3 (fast-fast-delayed parry rhythm), redDash (crimson)
    comboIdx: 0,
    wardShield: 0,
    didHit: false,
    hurtFlash: 0,
    walkCycle: 0,
    cloak: createCloak(x, y + 18, 6, 8)
  };
}

export function makeLeech(id, x, y) {
  return {
    id,
    name: '倒挂墨蛭',
    kind: 'leech',
    isBoss: false,
    x, y,
    homeX: x,
    homeY: y,
    w: 34,
    h: 38,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 68,
    maxHp: 68,
    posture: 0,
    maxPosture: 42,
    postureDecayDelay: 0,
    alive: true,
    state: 'cling', // cling, telegraph, drop, crawl, climb, stagger
    stateTimer: 0.4,
    wardShield: 0,
    didHit: false,
    hurtFlash: 0,
    pulsePhase: Math.random() * Math.PI * 2
  };
}

export function makeDummy(id, x, y, minX, maxX) {
  return {
    id,
    name: '青铜演武钟偶',
    kind: 'dummy',
    isDummy: true,
    isBoss: false,
    x, y,
    homeX: x,
    minX, maxX,
    w: 38,
    h: 68,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 260,
    maxHp: 260,
    posture: 0,
    maxPosture: 90,
    postureDecayDelay: 0,
    alive: true,
    active: false, // Dormant until struck or toggled via [E]
    modeIdx: 0,    // 0: cycle, 1: parryOnly, 2: redOnly, 3: dormant
    drillStep: 0,
    idleResetTimer: 0,
    hitPlayerDuringDrill: false,
    state: 'idle', // idle, stalk, windup, attack, shieldGuard, recover, stagger
    stateTimer: 0.6,
    windupDuration: 0.56,
    attackKind: 'parry1', // parry1, combo2, redThrust
    comboIdx: 0,
    comboTotal: 1,
    isDelayedHit: false,
    glintPlayed: false,
    shieldUp: false,
    shieldBrokenTimer: 0,
    didHit: false,
    hurtFlash: 0,
    bellShake: 0,
    walkCycle: 0
  };
}

function applyFoeScaling(ent) {
  if (!ent || ent.isDummy) return ent;
  const sc = getCombatScaling();
  ent.maxHp = Math.round(ent.maxHp * sc.hpMult);
  ent.hp = ent.maxHp;
  ent.maxPosture = Math.round(ent.maxPosture * sc.postureMult);
  return ent;
}

export function createSentinels() {
  const list = [];
  for (const e of ENEMIES_DEF) {
    let ent;
    if (e.kind === 'dummy') {
      ent = makeDummy(e.id, e.x, e.y, e.minX !== undefined ? e.minX : e.x - 110, e.maxX !== undefined ? e.maxX : e.x + 130);
    } else if (e.kind === 'wraith') {
      ent = makeWraith(e.id, e.x, e.y);
    } else if (e.kind === 'golem') {
      ent = makeGolem(e.id, e.x, e.y, e.minX !== undefined ? e.minX : e.x - 160, e.maxX !== undefined ? e.maxX : e.x + 160);
    } else if (e.kind === 'priest') {
      ent = makePriest(e.id, e.x, e.y);
    } else if (e.kind === 'duelist') {
      ent = makeDuelist(e.id, e.x, e.y, e.minX !== undefined ? e.minX : e.x - 170, e.maxX !== undefined ? e.maxX : e.x + 170);
    } else if (e.kind === 'leech') {
      ent = makeLeech(e.id, e.x, e.y);
    } else {
      ent = makeSentinel(e.id, e.x, e.y, e.minX !== undefined ? e.minX : e.x - 160, e.maxX !== undefined ? e.maxX : e.x + 160);
    }
    list.push(applyFoeScaling(ent));
  }
  return list;
}

export function createBoss() {
  const cfg = BOSSES_DEF.boss_hui;
  const bx = cfg ? cfg.x : 3420;
  const by = cfg ? cfg.y : (FLOOR_Y - 104);
  return applyFoeScaling({
    id: 'boss_hui',
    name: '断钟骑士 · 晦',
    phase1Title: '第一幕 · 寂静守誓',
    phase2Title: '第二幕 · 墨钟长鸣',
    kind: 'boss',
    isBoss: true,
    arenaMinX: cfg ? cfg.arenaMinX : 2648,
    arenaMaxX: cfg ? cfg.arenaMaxX : 3738,
    arenaFloorY: cfg ? cfg.arenaFloorY : FLOOR_Y,
    arenaTopY: cfg ? cfg.arenaTopY : 0,
    x: bx,
    y: by,
    w: 58,
    h: 104,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 580,
    maxHp: 580,
    posture: 0,
    maxPosture: 150,
    postureDecayDelay: 0,
    phase: 1,
    awake: false,
    alive: true,
    state: 'idle', // idle, stalk, windup, strike, recover, stagger, phaseShift
    stateTimer: 0.7,
    moveKind: 'combo2', // combo2, chargeThrust, delaySlam, redLeap, flurry4
    lastMoveKind: '',
    comboIdx: 0,
    comboTotal: 2,
    isDelayedHit: false,
    glintPlayed: false,
    finisherParried: false,
    windupDuration: 0.5,
    inkTideCd: 4.0,
    didHit: false,
    leapAirborne: false,
    hurtFlash: 0,
    bellSwing: 0,
    walkCycle: 0,
    cloak: createCloak(bx + 20, by + 28, 8, 12)
  });
}

export function createBoss2() {
  const cfg = BOSSES_DEF.boss_ji;
  const bx = cfg ? cfg.x : 6360;
  const by = cfg ? cfg.y : (WELL_BOTTOM_Y - 142);
  return applyFoeScaling({
    id: 'boss_ji',
    name: '沉渊铸钟师 · 寂',
    phase1Title: '第一幕 · 铸魂悬丝',
    phase2Title: '第二幕 · 万钟齐喑',
    kind: 'boss2',
    isBoss: true,
    arenaMinX: cfg ? cfg.arenaMinX : 5584,
    arenaMaxX: cfg ? cfg.arenaMaxX : 6716,
    arenaFloorY: cfg ? cfg.arenaFloorY : WELL_BOTTOM_Y,
    arenaTopY: cfg ? cfg.arenaTopY : 820,
    x: bx,
    y: by,
    w: 56,
    h: 98,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 740,
    maxHp: 740,
    posture: 0,
    maxPosture: 195,
    postureDecayDelay: 0,
    phase: 1,
    awake: false,
    alive: true,
    state: 'idle', // idle, stalk, windup, strike, recover, stagger, phaseShift
    stateTimer: 0.65,
    moveKind: 'bellBarrage', // bellShieldCharge, chainDropSlam, bellBarrage, redSweepHook, resonanceNova
    lastMoveKind: '',
    comboIdx: 0,
    comboTotal: 1,
    isDelayedHit: false,
    glintPlayed: false,
    finisherParried: false,
    windupDuration: 0.55,
    novaCd: 4.5,
    shieldUp: false,
    shieldBrokenTimer: 0,
    hoverTargetX: bx,
    hoverTargetY: by - 6,
    didHit: false,
    hurtFlash: 0,
    orbitAngle: 0,
    cloak: createCloak(bx + 28, by + 27, 8, 12)
  });
}

export function createBoss3() {
  const cfg = BOSSES_DEF.boss_yuan;
  const bx = cfg ? cfg.x : 9220;
  const by = cfg ? cfg.y : (FLOOR_Y - 116);
  return applyFoeScaling({
    id: 'boss_yuan',
    name: '初钟圣骸 · 渊',
    phase1Title: '第一幕 · 初钟苏醒',
    phase2Title: '第二幕 · 碎钟双影',
    phase3Title: '终幕 · 寂灭初鸣',
    kind: 'boss3',
    isBoss: true,
    arenaMinX: cfg ? cfg.arenaMinX : 8378,
    arenaMaxX: cfg ? cfg.arenaMaxX : 9632,
    arenaFloorY: cfg ? cfg.arenaFloorY : FLOOR_Y,
    arenaTopY: cfg ? cfg.arenaTopY : 0,
    x: bx,
    y: by,
    w: 62,
    h: 116,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 1050,
    maxHp: 1050,
    posture: 0,
    maxPosture: 240,
    postureDecayDelay: 0,
    phase: 1,
    awake: false,
    alive: true,
    state: 'idle', // idle, stalk, windup, strike, recover, stagger, phaseShift
    stateTimer: 0.7,
    moveKind: 'tripleChime',
    lastMoveKind: '',
    comboIdx: 0,
    comboTotal: 3,
    isDelayedHit: false,
    glintPlayed: false,
    finisherParried: false,
    apexHangTimer: 0,
    windupDuration: 0.48,
    tideCd: 5.0,
    didHit: false,
    leapAirborne: false,
    blinkAlpha: 1,
    hurtFlash: 0,
    haloAngle: 0,
    walkCycle: 0,
    cloak: createCloak(bx + 30, by + 30, 9, 13)
  });
}
