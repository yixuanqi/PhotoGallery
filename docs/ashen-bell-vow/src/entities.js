// Player, enemy & boss entity factories
import { FLOOR_Y, WELL_BOTTOM_Y, ENEMIES_DEF, BOSSES_DEF } from './config.js';
import { getPlayerMaxHp, getPlayerMaxSoul, getPlayerMaxFlasks, getPlayerMaxSeals } from './state.js';
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

    // Dash, Seal Lunge, Spell, Grapple, Heal, Execution
    dashTimer: 0,
    dashCd: 0,
    dashDir: 1,
    detonateLungeTimer: 0,
    castTimer: 0,
    castCd: 0,
    grappleState: 'none', // none, extending, pulling
    grappleTimer: 0,
    grappleCd: 0,
    grappleTarget: null,
    grappleTx: 0,
    grappleTy: 0,
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

export function createSentinels() {
  const list = [];
  for (const e of ENEMIES_DEF) {
    if (e.kind === 'wraith') {
      list.push(makeWraith(e.id, e.x, e.y));
    } else if (e.kind === 'golem') {
      list.push(makeGolem(e.id, e.x, e.y, e.minX !== undefined ? e.minX : e.x - 160, e.maxX !== undefined ? e.maxX : e.x + 160));
    } else {
      list.push(makeSentinel(e.id, e.x, e.y, e.minX !== undefined ? e.minX : e.x - 160, e.maxX !== undefined ? e.maxX : e.x + 160));
    }
  }
  return list;
}

export function createBoss() {
  const cfg = BOSSES_DEF.boss_hui;
  const bx = cfg ? cfg.x : 3420;
  const by = cfg ? cfg.y : (FLOOR_Y - 104);
  return {
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
    hp: 560,
    maxHp: 560,
    posture: 0,
    maxPosture: 150,
    postureDecayDelay: 0,
    phase: 1,
    awake: false,
    alive: true,
    state: 'idle', // idle, stalk, windup, strike, recover, stagger, phaseShift
    stateTimer: 0.7,
    moveKind: 'combo2', // combo2, chargeThrust, delaySlam, redLeap, flurry4
    comboIdx: 0,
    windupDuration: 0.5,
    inkTideCd: 4.0,
    didHit: false,
    leapAirborne: false,
    hurtFlash: 0,
    bellSwing: 0,
    walkCycle: 0,
    cloak: createCloak(bx + 20, by + 28, 8, 12)
  };
}

export function createBoss2() {
  const cfg = BOSSES_DEF.boss_ji;
  const bx = cfg ? cfg.x : 6360;
  const by = cfg ? cfg.y : (WELL_BOTTOM_Y - 142);
  return {
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
    hp: 620,
    maxHp: 620,
    posture: 0,
    maxPosture: 165,
    postureDecayDelay: 0,
    phase: 1,
    awake: false,
    alive: true,
    state: 'idle', // idle, stalk, windup, strike, recover, stagger, phaseShift
    stateTimer: 0.65,
    moveKind: 'bellBarrage', // bellShieldCharge, chainDropSlam, bellBarrage, redSweepHook, resonanceNova
    comboIdx: 0,
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
  };
}
