// Player, enemy & boss entity factories
import { FLOOR_Y, WELL_BOTTOM_Y, ENEMIES_DEF, BOSSES_DEF } from './config.js';
import { G, getPlayerMaxHp, getPlayerMaxSoul, getPlayerMaxFlasks, getPlayerMaxSeals, getCombatScaling } from './state.js';
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
    pogoChain: 0,
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
    airComboStep: 0,
    airComboResetTimer: 0,
    airHoverStalls: 0,
    dashAttackWindow: 0,
    isCharging: false,
    chargeTime: 0,
    chargeReadyPlayed: false,
    iaiLungeTimer: 0,
    riposteWindow: 0,
    switchStrikeWindow: 0,
    grappleStrikeWindow: 0,
    airSlamState: 'none',
    airSlamTimer: 0,
    airSlamEmpowered: false,
    airSlamHitIds: null,
    diveState: 'none',
    diveTimer: 0,
    diveHitIds: null,
    bellAirStalls: 0,
    shieldArmorTimer: 0,
    shieldArmorMult: 1.0,
    bulwarkCd: 0,
    weaponSwapCd: 0,
    bellSwing: 0,
    bellSealHits: 0,
    bellSealCd: 0,

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
    thornGraceTimer: 0,
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
    frostMeter: 0,
    frostChilledTimer: 0,
    webSlowTimer: 0,
    wetTimer: 0,
    wetHintCd: 0,
    sporeDmgCd: 0,
    galeSurgeTimer: 0,
    surgeTimer: 0,
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
    hp: 88,
    maxHp: 88,
    posture: 0,
    maxPosture: 52,
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
    hp: 58,
    maxHp: 58,
    posture: 0,
    maxPosture: 38,
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
    hp: 155,
    maxHp: 155,
    posture: 0,
    maxPosture: 90,
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
    hp: 72,
    maxHp: 72,
    posture: 0,
    maxPosture: 44,
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
    hp: 126,
    maxHp: 126,
    posture: 0,
    maxPosture: 78,
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
    hp: 52,
    maxHp: 52,
    posture: 0,
    maxPosture: 34,
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
    walkCycle: 0,
    inflictsFrost: 0,
    meter: { hits: [], totalDmg: 0, totalPosture: 0, maxHit: 0, dps: 0, pps: 0, lastHitTime: -99 }
  };
}

function applyFoeScaling(ent) {
  if (!ent) return ent;
  ent.squashX = 1;
  ent.squashY = 1;
  ent.recoilLean = 0;
  ent.hitFreezeTimer = 0;
  ent.hitTremor = 0;
  ent.launchTimer = 0;
  ent.launchDir = 0;
  ent.launchHitIds = null;
  if (ent.isDummy) return ent;
  const sc = getCombatScaling();
  ent.maxHp = Math.round(ent.maxHp * sc.hpMult);
  ent.hp = ent.maxHp;
  ent.maxPosture = Math.round(ent.maxPosture * sc.postureMult);
  return ent;
}

export function makeFalcon(id, x, y) {
  return {
    id,
    name: '衔铃风隼',
    kind: 'falcon',
    isBoss: false,
    x, y,
    homeX: x,
    homeY: y,
    w: 44,
    h: 34,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 66,
    maxHp: 66,
    posture: 0,
    maxPosture: 42,
    postureDecayDelay: 0,
    alive: true,
    state: 'hover', // hover, windup, dive, recover, stagger
    stateTimer: 1.0 + Math.random() * 0.6,
    diveTx: x,
    diveTy: y,
    didHit: false,
    hurtFlash: 0,
    wingPhase: Math.random() * Math.PI * 2
  };
}

export function makeFungus(id, x, y, minX, maxX) {
  return {
    id,
    name: '孢蚀菌傀',
    kind: 'fungus',
    isBoss: false,
    x, y,
    w: 40,
    h: 58,
    vx: 0,
    vy: 0,
    facing: -1,
    minX, maxX,
    hp: 98,
    maxHp: 98,
    posture: 0,
    maxPosture: 56,
    postureDecayDelay: 0,
    alive: true,
    state: 'patrol', // patrol, chase, windup, attack, recover, stagger
    stateTimer: 0,
    attackKind: 'slam', // slam (parryable), sporeBurst (toxic cloud)
    didHit: false,
    hurtFlash: 0,
    sporeCd: 0,
    walkCycle: 0
  };
}

export function makeFrostguard(id, x, y, minX, maxX) {
  return {
    id,
    name: '寒戟骸卫',
    kind: 'frostguard',
    isBoss: false,
    inflictsFrost: 38,
    x, y,
    w: 40,
    h: 68,
    vx: 0,
    vy: 0,
    facing: -1,
    minX, maxX,
    hp: 140,
    maxHp: 140,
    posture: 0,
    maxPosture: 82,
    postureDecayDelay: 0,
    alive: true,
    state: 'patrol', // patrol, chase, windup, attack, recover, stagger
    stateTimer: 0,
    attackKind: 'halberd', // halberd (parryable), frostLunge (crimson peril)
    didHit: false,
    hurtFlash: 0,
    walkCycle: 0,
    cloak: createCloak(x, y + 20, 6, 9)
  };
}


export function makeDrowned(id, x, y, minX, maxX) {
  return applyFoeScaling({
    id,
    kind: 'drowned',
    x,
    y,
    w: 36,
    h: 60,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 96,
    maxHp: 96,
    posture: 0,
    maxPosture: 58,
    postureDecayDelay: 0,
    alive: true,
    grounded: false,
    state: 'patrol',
    stateTimer: 0,
    minX,
    maxX,
    attackKind: 'hookSwipe',
    didHit: false,
    submergeCd: 2.2,
    submergeAlpha: 1,
    ambushX: x,
    hurtFlash: 0,
    walkCycle: 0,
    cloak: createCloak(x + 18, y + 16, 6, 9)
  });
}

export function makeAnchorite(id, x, y, minX, maxX) {
  return applyFoeScaling({
    id,
    kind: 'anchorite',
    x,
    y,
    w: 48,
    h: 78,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 158,
    maxHp: 158,
    posture: 0,
    maxPosture: 96,
    postureDecayDelay: 0,
    alive: true,
    grounded: false,
    state: 'patrol',
    stateTimer: 0,
    minX,
    maxX,
    attackKind: 'anchorDrag',
    didHit: false,
    hurtFlash: 0,
    walkCycle: 0,
    cloak: createCloak(x + 24, y + 20, 7, 10)
  });
}


export function makeWeaver(id, x, y, minX, maxX) {
  return applyFoeScaling({
    id,
    kind: 'weaver',
    x,
    y,
    w: 44,
    h: 36,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 92,
    maxHp: 92,
    posture: 0,
    maxPosture: 52,
    postureDecayDelay: 0,
    alive: true,
    grounded: false,
    state: 'patrol',
    stateTimer: 0,
    minX,
    maxX,
    attackKind: 'fangCombo',
    comboIdx: 0,
    didHit: false,
    webCd: 1.6,
    dropCd: 2.2,
    silkTopY: y - 165,
    hurtFlash: 0,
    walkCycle: 0
  });
}

export function makeCrawler(id, x, y, minX, maxX) {
  return applyFoeScaling({
    id,
    kind: 'crawler',
    x,
    y,
    w: 50,
    h: 42,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 118,
    maxHp: 118,
    posture: 0,
    maxPosture: 68,
    postureDecayDelay: 0,
    alive: true,
    grounded: false,
    state: 'patrol',
    stateTimer: 0,
    minX,
    maxX,
    attackKind: 'emberRoll',
    didHit: false,
    spitCd: 1.8,
    flippedTimer: 0,
    hurtFlash: 0,
    walkCycle: 0
  });
}

export function makeCantor(id, x, y) {
  return applyFoeScaling({
    id,
    kind: 'cantor',
    x,
    y,
    homeX: x,
    homeY: y,
    w: 36,
    h: 72,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 114,
    maxHp: 114,
    posture: 0,
    maxPosture: 62,
    postureDecayDelay: 0,
    alive: true,
    grounded: false,
    state: 'hover',
    stateTimer: 0.75,
    attackKind: 'triChimeVolley',
    volleyLeft: 0,
    volleySubTimer: 0,
    blinkCd: 2.0,
    repelCd: 0,
    quickHits: 0,
    quickHitDecay: 0,
    bobPhase: Math.random() * Math.PI * 2,
    didHit: false,
    hurtFlash: 0,
    cloak: createCloak(x + 18, y + 22, 7, 10)
  });
}

export function makeWardenWind(id, x, y, minX, maxX) {
  return {
    id,
    name: '截风巡塔使 · 朔',
    phase1Title: '绝风守誓 · 乘风双刃',
    phase2Title: '绝风狂澜 · 断塔追魂',
    kind: 'warden_wind',
    isBoss: false,
    isMiniBoss: true,
    awake: false,
    phase: 1,
    x, y,
    homeX: x,
    homeY: y,
    minX, maxX,
    w: 44,
    h: 72,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 500,
    maxHp: 500,
    posture: 0,
    maxPosture: 160,
    postureDecayDelay: 0,
    alive: true,
    state: 'idle', // idle, stalk, windup, strike, recover, stagger
    stateTimer: 0.7,
    moveKind: 'galeCombo', // galeCombo, windDashCut, updraftBarrage
    comboIdx: 0,
    comboTotal: 2,
    isDelayedHit: false,
    windupDuration: 0.5,
    didHit: false,
    overheadPressure: 0,
    antiAirCd: 0,
    pogoHitsTaken: 0,
    canopyThornTimer: 0,
    hurtFlash: 0,
    walkCycle: 0,
    cloak: createCloak(x, y + 20, 7, 10)
  };
}

export function makeWardenForest(id, x, y, minX, maxX) {
  return {
    id,
    name: '盘根古钟精 · 枯',
    phase1Title: '古林守誓 · 盘根钟铠',
    phase2Title: '古林狂孢 · 万藤噬魂',
    kind: 'warden_forest',
    isBoss: false,
    isMiniBoss: true,
    awake: false,
    phase: 1,
    x, y,
    homeX: x,
    homeY: y,
    minX, maxX,
    w: 64,
    h: 98,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 640,
    maxHp: 640,
    posture: 0,
    maxPosture: 200,
    postureDecayDelay: 0,
    alive: true,
    barkArmor: true,
    shieldBrokenTimer: 0,
    state: 'idle', // idle, stalk, windup, strike, recover, stagger
    stateTimer: 0.8,
    moveKind: 'rootSlam', // rootSlam, vineWave, sporeEruption
    isDelayedHit: false,
    windupDuration: 0.62,
    didHit: false,
    overheadPressure: 0,
    antiAirCd: 0,
    pogoHitsTaken: 0,
    canopyThornTimer: 0,
    hurtFlash: 0,
    pulsePhase: 0
  };
}

export function makeWardenMountain(id, x, y, minX, maxX) {
  return {
    id,
    name: '断剑霜侯 · 凛',
    phase1Title: '霜脊守誓 · 寒刃居合',
    phase2Title: '霜脊寂灭 · 冰髓绝斩',
    kind: 'warden_mountain',
    isBoss: false,
    isMiniBoss: true,
    inflictsFrost: 34,
    awake: false,
    phase: 1,
    x, y,
    homeX: x,
    homeY: y,
    minX, maxX,
    w: 42,
    h: 74,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 740,
    maxHp: 740,
    posture: 0,
    maxPosture: 225,
    postureDecayDelay: 0,
    alive: true,
    state: 'idle', // idle, stalk, windup, strike, recover, stagger
    stateTimer: 0.7,
    moveKind: 'frostCombo', // frostCombo, frostIai, glacialThrust
    comboIdx: 0,
    comboTotal: 3,
    isDelayedHit: false,
    windupDuration: 0.46,
    didHit: false,
    overheadPressure: 0,
    antiAirCd: 0,
    pogoHitsTaken: 0,
    canopyThornTimer: 0,
    hurtFlash: 0,
    walkCycle: 0,
    cloak: createCloak(x, y + 20, 7, 10)
  };
}

export function createSentinels() {
  const list = [];
  const slainMinis = G.worldState && G.worldState.defeatedMiniBosses ? G.worldState.defeatedMiniBosses : null;
  for (const e of ENEMIES_DEF) {
    if (slainMinis && slainMinis.has(e.id)) continue;
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
    } else if (e.kind === 'falcon') {
      ent = makeFalcon(e.id, e.x, e.y);
    } else if (e.kind === 'fungus') {
      ent = makeFungus(e.id, e.x, e.y, e.minX !== undefined ? e.minX : e.x - 150, e.maxX !== undefined ? e.maxX : e.x + 150);
    } else if (e.kind === 'frostguard') {
      ent = makeFrostguard(e.id, e.x, e.y, e.minX !== undefined ? e.minX : e.x - 160, e.maxX !== undefined ? e.maxX : e.x + 160);
    } else if (e.kind === 'drowned') {
      ent = makeDrowned(e.id, e.x, e.y, e.minX !== undefined ? e.minX : e.x - 160, e.maxX !== undefined ? e.maxX : e.x + 160);
    } else if (e.kind === 'anchorite') {
      ent = makeAnchorite(e.id, e.x, e.y, e.minX !== undefined ? e.minX : e.x - 150, e.maxX !== undefined ? e.maxX : e.x + 150);
    } else if (e.kind === 'weaver') {
      ent = makeWeaver(e.id, e.x, e.y, e.minX !== undefined ? e.minX : e.x - 150, e.maxX !== undefined ? e.maxX : e.x + 150);
    } else if (e.kind === 'crawler') {
      ent = makeCrawler(e.id, e.x, e.y, e.minX !== undefined ? e.minX : e.x - 160, e.maxX !== undefined ? e.maxX : e.x + 160);
    } else if (e.kind === 'cantor') {
      ent = makeCantor(e.id, e.x, e.y);
    } else if (e.kind === 'warden_wind') {
      ent = makeWardenWind(e.id, e.x, e.y, e.minX !== undefined ? e.minX : e.x - 220, e.maxX !== undefined ? e.maxX : e.x + 220);
    } else if (e.kind === 'warden_forest') {
      ent = makeWardenForest(e.id, e.x, e.y, e.minX !== undefined ? e.minX : e.x - 150, e.maxX !== undefined ? e.maxX : e.x + 150);
    } else if (e.kind === 'warden_mountain') {
      ent = makeWardenMountain(e.id, e.x, e.y, e.minX !== undefined ? e.minX : e.x - 200, e.maxX !== undefined ? e.maxX : e.x + 200);
    } else {
      ent = makeSentinel(e.id, e.x, e.y, e.minX !== undefined ? e.minX : e.x - 160, e.maxX !== undefined ? e.maxX : e.x + 160);
    }
    ent.roomId = e.roomId || null;
    ent.bounceCd = 0;
    ent.windLiftedTimer = 0;
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
    roomId: cfg ? cfg.roomId : 'r03_chapel',
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
    maxPosture: 155,
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
    overheadPressure: 0,
    antiAirCd: 0,
    pogoHitsTaken: 0,
    canopyThornTimer: 0,
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
    roomId: cfg ? cfg.roomId : 'r05_foundry',
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
    hp: 820,
    maxHp: 820,
    posture: 0,
    maxPosture: 215,
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
    overheadPressure: 0,
    antiAirCd: 0,
    pogoHitsTaken: 0,
    canopyThornTimer: 0,
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
    roomId: cfg ? cfg.roomId : 'r08_heart',
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
    hp: 1320,
    maxHp: 1320,
    posture: 0,
    maxPosture: 295,
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
    overheadPressure: 0,
    antiAirCd: 0,
    pogoHitsTaken: 0,
    canopyThornTimer: 0,
    hurtFlash: 0,
    haloAngle: 0,
    walkCycle: 0,
    cloak: createCloak(bx + 30, by + 30, 9, 13)
  });
}


export function createBoss4(forEcho = false) {
  const cfg = (!forEcho && BOSSES_DEF.boss_zhu) ? BOSSES_DEF.boss_zhu : BOSSES_DEF.boss_yuan;
  const bx = cfg ? cfg.x : 8720;
  const by = cfg ? (forEcho ? cfg.y + 8 : cfg.y) : (-880 - 108);
  const aliveInWorld = !forEcho && !(G.worldState && G.worldState.boss4Defeated);
  return applyFoeScaling({
    id: 'boss_zhu',
    roomId: cfg ? cfg.roomId : 'r25_mirror_abyss',
    name: '初铸残影 · 铸',
    phase1Title: '第一幕 · 三刃初鸣',
    phase2Title: '第二幕 · 铃阵双映',
    phase3Title: '终幕 · 初铸归寂',
    kind: 'boss4',
    isBoss: true,
    arenaMinX: cfg ? cfg.arenaMinX : 8378,
    arenaMaxX: cfg ? cfg.arenaMaxX : 9632,
    arenaFloorY: cfg ? cfg.arenaFloorY : FLOOR_Y,
    arenaTopY: cfg ? cfg.arenaTopY : 0,
    x: bx,
    y: by,
    w: 56,
    h: 108,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 1600,
    maxHp: 1600,
    posture: 0,
    maxPosture: 335,
    postureDecayDelay: 0,
    phase: 1,
    awake: false,
    alive: aliveInWorld,
    state: 'idle',
    stateTimer: 0.55,
    stance: 'blade',
    nextStance: 'blade',
    stanceFlash: 0,
    movesInStance: 0,
    ultimateReactCd: 0,
    moveKind: 'bladeFlurry',
    lastMoveKind: '',
    comboIdx: 0,
    comboTotal: 3,
    isDelayedHit: false,
    glintPlayed: false,
    finisherParried: false,
    apexHangTimer: 0,
    windupDuration: 0.44,
    didHit: false,
    leapAirborne: false,
    blinkAlpha: 1,
    overheadPressure: 0,
    antiAirCd: 0,
    pogoHitsTaken: 0,
    canopyThornTimer: 0,
    hurtFlash: 0,
    haloAngle: 0,
    walkCycle: 0,
    cloak: createCloak(bx + 28, by + 26, 9, 12)
  });
}
