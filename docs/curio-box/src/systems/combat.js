(() => {
  const CB = window.CB;
  const game = CB.game;

  const PRISM_SPLIT_SPREAD = 0.23;    // ~13.2° 棱镜双光束夹角
  const SPLIT_BOUNCE_SPREAD = 0.21;   // 折射分裂晶反弹一分二夹角
  const SLINGSHOT_RAD = 0.40;         // 累计引力弯折 ≥ 23° 触发「星轨弹弓」充能
  const SIM_STEP_DT = 1 / 75;         // 弹道与预判线共用的高精度物理积分步长

  // 单一核心标志性工具：星露弹射器（轻点 = 静音点射 | 按住蓄力 = 物理重弹）
  const LAUNCHER = {
    tapThreshold: 0.20,
    maxCharge: 0.64,
    light: {
      cooldown: 0.17,
      speed: 900,
      damage: 16,
      ricochetMult: 1.45,
      sneakMult: 1.75,
      maxBounces: 1,
      range: 760,
      previewRange: 300,
      noiseRadius: 68,
      bulletRadius: 3.4,
      crateImpulse: 185,
      color: '#5cc4d6',
      trailColor: '#3ea3b5',
      bouncedColor: '#e05848',
      recoilKick: 0.52,
      shake: 1.0,
    },
    heavy: {
      cooldown: 0.30,
      baseSpeed: 780,
      maxBonusSpeed: 200,
      baseDamage: 25,
      maxBonusDamage: 18,
      ricochetMult: 1.55,
      sneakMult: 1.25,
      maxBounces: 2,
      fullChargeBonusBounce: 1,
      baseRange: 980,
      maxBonusRange: 260,
      basePreviewRange: 540,
      maxBonusPreviewRange: 210,
      baseNoiseRadius: 175,
      maxBonusNoiseRadius: 95,
      bulletRadius: 5.2,
      baseCrateImpulse: 410,
      maxBonusCrateImpulse: 210,
      color: '#f2b838',
      trailColor: '#de9524',
      bouncedColor: '#e04838',
      recoilKick: 1.15,
      shake: 2.8,
    },
  };

  function hasBuildCurio(id) {
    return !!(CB.extraction && CB.extraction.hasCurio(id));
  }

  // ==================== 低摩擦露水滑道查询 ====================
  function getDewSlideAt(x, y) {
    const map = game.map;
    if (!map || !map.dewSlides) return null;
    for (let i = 0; i < map.dewSlides.length; i++) {
      const s = map.dewSlides[i];
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
        return s;
      }
    }
    return null;
  }

  // ==================== 2D 射线求交 ====================
  function rayRect(ox, oy, dx, dy, maxDist, rx, ry, rw, rh) {
    const minX = rx;
    const maxX = rx + rw;
    const minY = ry;
    const maxY = ry + rh;

    let tmin = 0;
    let tmax = maxDist;
    let nx = 0;
    let ny = 0;

    if (Math.abs(dx) < 1e-8) {
      if (ox < minX || ox > maxX) return null;
    } else {
      const inv = 1 / dx;
      let t1 = (minX - ox) * inv;
      let t2 = (maxX - ox) * inv;
      let sign = -1;
      if (t1 > t2) {
        const tmp = t1; t1 = t2; t2 = tmp;
        sign = 1;
      }
      if (t1 > tmin) {
        tmin = t1;
        nx = sign;
        ny = 0;
      }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }

    if (Math.abs(dy) < 1e-8) {
      if (oy < minY || oy > maxY) return null;
    } else {
      const inv = 1 / dy;
      let t1 = (minY - oy) * inv;
      let t2 = (maxY - oy) * inv;
      let sign = -1;
      if (t1 > t2) {
        const tmp = t1; t1 = t2; t2 = tmp;
        sign = 1;
      }
      if (t1 > tmin) {
        tmin = t1;
        nx = 0;
        ny = sign;
      }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }

    if (tmin < 0 || tmin > maxDist || (nx === 0 && ny === 0)) return null;
    return { dist: tmin, x: ox + dx * tmin, y: oy + dy * tmin, nx, ny };
  }

  function rayCircle(ox, oy, dx, dy, maxDist, cx, cy, cr) {
    const fx = ox - cx;
    const fy = oy - cy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - cr * cr;
    let disc = b * b - 4 * c;
    if (disc < 0) return null;
    disc = Math.sqrt(disc);
    const t = (-b - disc) / 2;
    if (t < 0 || t > maxDist) return null;
    const hx = ox + dx * t;
    const hy = oy + dy * t;
    const len = Math.hypot(hx - cx, hy - cy) || 1;
    return { dist: t, x: hx, y: hy, nx: (hx - cx) / len, ny: (hy - cy) / len };
  }

  function raycastScene(ox, oy, dx, dy, maxDist, opts = {}) {
    const map = game.map;
    if (!map) {
      return { hit: false, dist: maxDist, x: ox + dx * maxDist, y: oy + dy * maxDist, nx: 0, ny: 0 };
    }

    const pad = opts.pad || 0;
    const includeGuards = !!opts.includeGuards;
    const includeDestructibles = opts.includeDestructibles !== false;
    const includeClosedGates = !!opts.includeClosedGates;
    const includeRailings = opts.includeRailings !== false;
    const includeOpenCliffs = !!opts.includeOpenCliffs;
    const ignorePrismId = opts.ignorePrismId || null;
    const ignoreProp = opts.ignoreProp || null;
    const ignoreGuard = opts.ignoreGuard || null;

    let best = null;
    let bestDist = maxDist;

    const consider = (res, kind, target) => {
      if (res && res.dist < bestDist) {
        bestDist = res.dist;
        best = { hit: true, kind, target, ...res };
      }
    };

    for (const w of map.walls) {
      consider(rayRect(ox, oy, dx, dy, bestDist, w.x - pad, w.y - pad, w.w + pad * 2, w.h + pad * 2), 'wall', w);
    }
    for (const post of map.posts) {
      consider(rayRect(ox, oy, dx, dy, bestDist, post.x - pad, post.y - pad, post.w + pad * 2, post.h + pad * 2), 'wall', post);
    }

    if (includeClosedGates && map.vineGates) {
      for (const gate of map.vineGates) {
        if (gate.open) continue;
        consider(rayRect(ox, oy, dx, dy, bestDist, gate.x - pad, gate.y - pad, gate.w + pad * 2, gate.h + pad * 2), 'wall', gate);
      }
    }

    if ((includeRailings || includeOpenCliffs) && map.cliffEdges) {
      for (const edge of map.cliffEdges) {
        if (edge.kind === 'railing' && !edge.broken) {
          if (includeRailings) {
            consider(rayRect(ox, oy, dx, dy, bestDist, edge.x - pad, edge.y - pad, edge.w + pad * 2, edge.h + pad * 2), 'railing', edge);
          }
        } else if (includeOpenCliffs) {
          consider(rayRect(ox, oy, dx, dy, bestDist, edge.x - pad, edge.y - pad, edge.w + pad * 2, edge.h + pad * 2), 'cliff_open', edge);
        }
      }
    }

    for (const prop of map.props) {
      if (prop.broken || prop === ignoreProp) continue;
      if (prop.type === 'prism' && ignorePrismId && prop.id === ignorePrismId) continue;
      if (prop.destructible && !includeDestructibles) continue;

      let kind = 'prop';
      if (prop.type === 'prism') kind = 'prism';
      else if (prop.type === 'orrery') kind = 'orrery';
      else if (prop.type === 'chime') kind = 'chime';
      else if (prop.type === 'sunflower_switch') kind = 'sunflower_switch';
      else if (prop.destructible) kind = 'destructible';

      if (prop.shape === 'circle') {
        consider(rayCircle(ox, oy, dx, dy, bestDist, prop.x, prop.y, prop.r + pad), kind, prop);
      } else {
        consider(rayRect(ox, oy, dx, dy, bestDist, prop.x - pad, prop.y - pad, prop.w + pad * 2, prop.h + pad * 2), kind, prop);
      }
    }

    if (includeGuards) {
      for (const g of game.guards) {
        if (g.dead || g === ignoreGuard) continue;
        consider(rayCircle(ox, oy, dx, dy, bestDist, g.x, g.y, g.radius + pad), 'guard', g);
      }
    }

    if (!best) {
      return { hit: false, dist: maxDist, x: ox + dx * maxDist, y: oy + dy * maxDist, nx: 0, ny: 0 };
    }
    return best;
  }

  // ==================== 统一平面引力场求解（星轨仪 + 引力漩涡 + 吸星弹弓镜） ====================
  function computeGravityAccel(x, y, curveAccum = 0, opts = {}) {
    const map = game.map;
    let ax = 0;
    let ay = 0;
    let maxU = 0;
    let nearestOrrery = null;

    const grandBoost = hasBuildCurio('orrery') ? 1.35 : 1.0;
    const taper = Math.max(0.18, 1.0 - Math.max(0, curveAccum - 2.3) * 0.65);

    if (map) {
      for (const prop of map.props) {
        if (prop.type !== 'orrery') continue;
        const dx = prop.x - x;
        const dy = prop.y - y;
        const dSq = dx * dx + dy * dy;
        const R = prop.fieldRadius || 215;
        if (dSq >= R * R || dSq < 225) continue;

        const d = Math.sqrt(dSq);
        const u = 1 - d / R;
        const gStrength = (prop.gravity || 5200) * grandBoost;
        const acc = prop.polarity * gStrength * Math.pow(u, 1.05) * (88 / Math.max(42, d)) * taper;
        ax += (dx / d) * acc;
        ay += (dy / d) * acc;
        if (u > maxU) {
          maxU = u;
          nearestOrrery = prop;
        }
      }
    }

    if (game.vortices && game.vortices.length > 0) {
      for (const v of game.vortices) {
        const dx = v.x - x;
        const dy = v.y - y;
        const dSq = dx * dx + dy * dy;
        const R = v.radius * Math.min(1, v.grow);
        if (dSq >= R * R || dSq < 256) continue;

        const d = Math.sqrt(dSq);
        const u = 1 - d / R;
        const fade = Math.min(1, v.life / 0.8);
        const acc = (v.bulletGravity || 4200) * grandBoost * fade * Math.pow(u, 1.05) * (76 / Math.max(40, d)) * taper;
        ax += (dx / d) * acc;
        ay += (dy / d) * acc;
        if (u > maxU) maxU = u;
      }
    }

    if (opts.applyLensHoming && hasBuildCurio('slingshot_lens')) {
      for (const g of game.guards) {
        if (g.dead) continue;
        const dx = g.x - x;
        const dy = g.y - y;
        const dSq = dx * dx + dy * dy;
        const R = 148;
        if (dSq >= R * R || dSq < 144) continue;
        const d = Math.sqrt(dSq);
        const u = 1 - d / R;
        const acc = 2700 * Math.pow(u, 1.1) * taper;
        ax += (dx / d) * acc;
        ay += (dy / d) * acc;
        if (u * 0.8 > maxU) maxU = u * 0.8;
      }
    }

    return { ax, ay, maxU, nearestOrrery };
  }

  /**
   * 实时曲线数值积分预判线（星轨仪弯道 + 引力漩涡 + 台球木箱推射轨迹 + 1次折射 + 棱镜/分裂晶）
   */
  function computeAimPreview() {
    const p = game.player;
    const isCharging = !!p.charging;
    const chargeRatio = isCharging ? (p.chargeRatio || 0) : 0;
    const isHeavyPreview = isCharging && p.chargeTime >= LAUNCHER.tapThreshold * 0.45;
    const dx0 = Math.cos(p.aimAngle);
    const dy0 = Math.sin(p.aimAngle);

    const muzzleCheck = raycastScene(p.x, p.y, dx0, dy0, 22, { pad: 1, includeGuards: false });
    const startDist = muzzleCheck.hit ? Math.max(4, muzzleCheck.dist - 3) : 20;
    const ox = p.x + dx0 * startDist;
    const oy = p.y + dy0 * startDist;

    const speedMult = hasBuildCurio('pocket_core') ? 1.18 : 1.0;
    const baseSpeed = (isHeavyPreview
      ? LAUNCHER.heavy.baseSpeed + LAUNCHER.heavy.maxBonusSpeed * chargeRatio
      : LAUNCHER.light.speed) * speedMult;
    const previewRange = isHeavyPreview
      ? LAUNCHER.heavy.basePreviewRange + LAUNCHER.heavy.maxBonusPreviewRange * chargeRatio
      : LAUNCHER.light.previewRange;
    const hasSplitCurio = isHeavyPreview && hasBuildCurio('split_crystal');
    const hasVortexCurio = isHeavyPreview && hasBuildCurio('vortex_core');
    const pad = (isHeavyPreview ? LAUNCHER.heavy.bulletRadius : LAUNCHER.light.bulletRadius) * 0.55;
    const w = {
      id: isHeavyPreview ? 'heavy' : 'light',
      pellets: 1,
      spread: 0,
      previewRange,
      previewBounce: isHeavyPreview,
      isCharging,
      chargeRatio,
    };

    const paths = [];
    const bouncePoints = [];
    const lockTargets = [];
    const cratePreviews = [];
    const guardPreviews = [];
    let vortexPreviewPoint = null;

    const isLockable = (kind) =>
      kind === 'guard' || kind === 'destructible' || kind === 'chime' || kind === 'sunflower_switch';

    const buildGuardKnockbackPreview = (guard, hitDx, hitDy, flags = {}) => {
      if (!guard || guard.dead || guardPreviews.length >= 3) return;
      const isVulnerable = guard.aiState === 'stunned' || guard.armorBrokenTimer > 0;
      const fromCrate = !!flags.fromCrate;
      const isSling = !!flags.slingshot;
      const isPrismHit = !!flags.isPrism;
      const isBouncedHit = !!flags.bounced;
      const isStealthHit = !!flags.fromPollen || guard.aiState === 'patrol' || guard.aiState === 'investigate';

      if (!fromCrate) {
        const faceDot = hitDx * Math.cos(guard.facing) + hitDy * Math.sin(guard.facing);
        const isFrontHit = faceDot < -0.18;
        if (guard.hasFrontShield && !isVulnerable && isFrontHit) return;
        if (guard.hasStarMembrane && !isVulnerable && !isSling && !isPrismHit && !isBouncedHit) return;
        if (guard.hasThornShell && guard.shellClosed && !isVulnerable) return;
        if (guard.hasColossusArmor && !isVulnerable && !isSling && !isPrismHit && !isStealthHit) return;
      }

      const willLaunch = fromCrate || isHeavyPreview || isSling || isVulnerable || !!guard.skidding;
      if (!willLaunch) return;

      const hasWax = hasBuildCurio('billiard_wax');
      const hasFan = hasBuildCurio('gale_fan');
      const hasChainCue = hasBuildCurio('chain_cue');
      const massInv = 1 / Math.sqrt(guard.mass || 1);
      const startOnSlide = !!getDewSlideAt(guard.x, guard.y);
      const dewBoost = startOnSlide ? 1.24 : 1.0;
      const fanBoost = hasFan ? 1.35 : 1.0;

      const activeGust = CB.extraction && CB.extraction.getActiveGust ? CB.extraction.getActiveGust() : null;
      const gustAlign = activeGust ? Math.max(0, hitDx * activeGust.dirX + hitDy * activeGust.dirY) : 0;
      const gustBoost = activeGust && gustAlign > 0.1 ? 1 + 0.45 * gustAlign : 1.0;

      let launchSpd = fromCrate
        ? Math.max(540, (flags.crateSpd || 420) * 1.18) * (flags.crateOnSlide ? 1.15 : 1.0) * massInv
        : isSling
        ? 560 * massInv * fanBoost
        : isHeavyPreview
        ? (440 + chargeRatio * 230) * massInv * fanBoost
        : 400 * massInv;
      launchSpd *= dewBoost * gustBoost;

      let sx = guard.x;
      let sy = guard.y;
      let spd = launchSpd;
      let hitSlide = startOnSlide;
      let willCliffDrop = false;
      let eliteBounce = false;
      let willBreakRailing = false;
      let railingPoint = null;
      let willChain = false;
      let chainTarget = null;
      let willExplode = null;
      let willSuperBounce = false;
      let willHitCrate = false;

      const simDt = 1 / 40;
      const padG = Math.max(12, guard.radius * 0.82);
      const willBreakArmorOnHit = fromCrate || isSling || isPrismHit || isBouncedHit;
      const eliteProtected =
        guard.isElite &&
        guard.armorBrokenTimer <= 0 &&
        !willBreakArmorOnHit &&
        guard.hp > guard.maxHp * 0.38;

      for (let k = 0; k < 46 && spd > 80; k++) {
        const onS = !!getDewSlideAt(sx, sy);
        if (onS) hitSlide = true;
        if (!onS && spd < 112) break;

        const stepD = spd * simDt;
        const h = raycastScene(sx, sy, hitDx, hitDy, stepD, {
          pad: padG,
          includeGuards: true,
          ignoreGuard: guard,
          includeClosedGates: true,
          includeRailings: true,
          includeOpenCliffs: true,
        });

        sx = h.x;
        sy = h.y;

        if (h.hit) {
          if (h.kind === 'railing') {
            if (spd > 155) {
              willBreakRailing = true;
              railingPoint = { x: h.x, y: h.y };
              if (eliteProtected) eliteBounce = true;
              else willCliffDrop = true;
              sx = h.x + (h.target ? h.target.outwardX * 18 : hitDx * 18);
              sy = h.y + (h.target ? h.target.outwardY * 18 : hitDy * 18);
            }
            break;
          }
          if (h.kind === 'cliff_open') {
            if (eliteProtected) eliteBounce = true;
            else willCliffDrop = true;
            sx = h.x + (h.target ? h.target.outwardX * 16 : hitDx * 16);
            sy = h.y + (h.target ? h.target.outwardY * 16 : hitDy * 16);
            break;
          }
          if (h.kind === 'guard' && h.target) {
            willChain = true;
            const tg = h.target;
            const cdx = tg.x - sx;
            const cdy = tg.y - sy;
            const clen = Math.hypot(cdx, cdy) || 1;
            const cnx = cdx / clen;
            const cny = cdy / clen;
            const secDist = hasChainCue ? 112 : 84;
            chainTarget = {
              x: tg.x,
              y: tg.y,
              r: tg.radius,
              secX: tg.x + cnx * secDist,
              secY: tg.y + cny * secDist,
            };
            break;
          }
          if (h.kind === 'destructible' && h.target) {
            if (h.target.type === 'inkwell' || h.target.type === 'pollen_bud') {
              willExplode = h.target.type;
            } else if (h.target.type === 'crate') {
              willHitCrate = true;
            }
            break;
          }
          if (h.kind === 'prop' && h.target && (h.target.type === 'eraser' || h.target.type === 'bumper')) {
            willSuperBounce = true;
            break;
          }
          break;
        }

        const rawDecel = onS ? 105 : 1120;
        const gDecelMult = activeGust && gustAlign > 0.15 ? 0.62 : 1.0;
        spd = Math.max(0, spd - (hasWax ? rawDecel * 0.65 : rawDecel) * gDecelMult * simDt);
      }

      if (Math.hypot(sx - guard.x, sy - guard.y) > 18 || willCliffDrop || eliteBounce || willChain) {
        guardPreviews.push({
          x1: guard.x,
          y1: guard.y,
          x2: sx,
          y2: sy,
          onDewSlide: hitSlide,
          willCliffDrop,
          eliteBounce,
          willBreakRailing,
          railingPoint,
          willChain,
          chainTarget,
          willExplode,
          willSuperBounce,
          willHitCrate,
          fromCrate,
        });
      }
    };

    const buildCrateSlidePreview = (crate, pushDx, pushDy) => {
      const startX = crate.x + crate.w / 2;
      const startY = crate.y + crate.h / 2;
      const hasWax = hasBuildCurio('billiard_wax');
      const fanCrateBoost = hasBuildCurio('gale_fan') ? 1.25 : 1.0;
      const startOnSlide = !!getDewSlideAt(startX, startY);
      const activeGustC = CB.extraction && CB.extraction.getActiveGust ? CB.extraction.getActiveGust() : null;
      const gustAlignC = activeGustC ? Math.max(0, pushDx * activeGustC.dirX + pushDy * activeGustC.dirY) : 0;
      const gustBoostC = activeGustC && gustAlignC > 0.1 ? 1 + 0.45 * gustAlignC : 1.0;
      const initImp = (LAUNCHER.heavy.baseCrateImpulse + LAUNCHER.heavy.maxBonusCrateImpulse * chargeRatio) * fanCrateBoost * gustBoostC * (startOnSlide ? 1.38 : 0.76);

      // 真实两极摩擦力步进积分：粗糙石砖立刻刹停（短棕箭头），露水滑道超远飙滑（长天青箭头）
      let sx = startX;
      let sy = startY;
      let spd = initImp;
      let hitSlide = startOnSlide;
      let hitsGuard = false;
      const simDt = 1 / 40;
      for (let k = 0; k < 50 && spd > 25; k++) {
        const onS = !!getDewSlideAt(sx, sy);
        if (onS) hitSlide = true;
        const stepD = spd * simDt;
        const h = raycastScene(sx, sy, pushDx, pushDy, stepD, {
          pad: 19,
          includeGuards: true,
          includeClosedGates: true,
          includeRailings: spd <= 195,
          ignoreProp: crate,
        });
        sx = h.x;
        sy = h.y;
        if (h.hit) {
          if (h.kind === 'guard' && h.target) {
            hitsGuard = true;
            buildGuardKnockbackPreview(h.target, pushDx, pushDy, {
              fromCrate: true,
              crateSpd: spd,
              crateOnSlide: onS,
            });
          }
          break;
        }
        const rawDecel = onS ? 95 : 2650;
        spd = Math.max(0, spd - (hasWax ? rawDecel * 0.58 : rawDecel) * simDt);
      }

      cratePreviews.push({
        x1: startX,
        y1: startY,
        x2: sx,
        y2: sy,
        onDewSlide: hitSlide,
        hitsGuard,
      });
    };

    function traceBranch(startX, startY, dirX, dirY, maxRange, state) {
      let x = startX;
      let y = startY;
      let vx = dirX * baseSpeed;
      let vy = dirY * baseSpeed;
      let speed = baseSpeed;
      let traveled = 0;
      let curveAccum = state.curveAccum || 0;
      let slingshot = !!state.slingshot;
      let bounced = !!state.bounced;
      let isPrism = !!state.isPrism;
      let isSuper = !!state.isSuper;
      let ignorePrismId = state.ignorePrismId || null;

      let curPoints = [{ x, y }];
      const flushPath = () => {
        if (curPoints.length >= 2) {
          paths.push({
            points: curPoints,
            bounced,
            isPrism,
            isSuper,
            slingshot,
          });
        }
      };

      const maxSteps = state.maxSteps || 85;
      for (let step = 0; step < maxSteps && traveled < maxRange; step++) {
        const grav = computeGravityAccel(x, y, curveAccum, { applyLensHoming: true });
        const inField = grav.maxU > 0.005;
        const dt = inField ? SIM_STEP_DT : SIM_STEP_DT * 2.1;

        if (inField) {
          const prevAng = Math.atan2(vy, vx);
          vx += grav.ax * dt;
          vy += grav.ay * dt;
          const spdNow = Math.hypot(vx, vy) || 1;
          const targetSpd = baseSpeed * (slingshot ? 1.16 : 1 + 0.14 * grav.maxU);
          vx = (vx / spdNow) * targetSpd;
          vy = (vy / spdNow) * targetSpd;
          speed = targetSpd;

          const newAng = Math.atan2(vy, vx);
          let da = newAng - prevAng;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          curveAccum += Math.abs(da);

          if (!slingshot && curveAccum >= SLINGSHOT_RAD) {
            flushPath();
            slingshot = true;
            curPoints = [{ x, y }];
          }
        }

        const stepDist = Math.min(speed * dt, maxRange - traveled);
        const ndx = vx / (speed || 1);
        const ndy = vy / (speed || 1);
        const hit = raycastScene(x, y, ndx, ndy, stepDist, {
          pad,
          includeGuards: true,
          ignorePrismId,
        });

        x = hit.x;
        y = hit.y;
        traveled += hit.dist;
        curPoints.push({ x, y });

        if (!hit.hit) continue;

        flushPath();

        if (hasVortexCurio && !vortexPreviewPoint && !state.isSecondary) {
          if (hit.kind === 'wall' || hit.kind === 'prop' || hit.kind === 'orrery' || hit.kind === 'guard' || hit.kind === 'destructible') {
            vortexPreviewPoint = { x: hit.x, y: hit.y };
          }
        }

        if (isLockable(hit.kind)) {
          lockTargets.push({ x: hit.x, y: hit.y, kind: hit.kind, bounced, isPrism, slingshot });
          if (hit.kind === 'destructible' && hit.target && hit.target.type === 'crate' && !state.isSecondary) {
            if (isHeavyPreview) buildCrateSlidePreview(hit.target, ndx, ndy);
          } else if (hit.kind === 'guard' && hit.target) {
            buildGuardKnockbackPreview(hit.target, ndx, ndy, {
              slingshot,
              isPrism,
              bounced,
              fromPollen: !!p.inPollen,
            });
          }
          return;
        }

        if (hit.kind === 'railing') {
          if (isHeavyPreview || slingshot || isPrism) {
            lockTargets.push({ x: hit.x, y: hit.y, kind: 'railing', bounced, isPrism, slingshot });
            return;
          }
          if (w.previewBounce && state.depth < 1) {
            const dot = ndx * hit.nx + ndy * hit.ny;
            const rx = ndx - 2 * dot * hit.nx;
            const ry = ndy - 2 * dot * hit.ny;
            bouncePoints.push({ x: hit.x, y: hit.y, isSuper: false });
            traceBranch(hit.x + hit.nx * 1.4, hit.y + hit.ny * 1.4, rx, ry, Math.max(160, maxRange - traveled), {
              bounced: true,
              isSuper: false,
              slingshot,
              curveAccum,
              depth: state.depth + 1,
              maxSteps: 40,
              isSecondary: true,
            });
          }
          return;
        }

        if (hit.kind === 'prism' && state.depth < 2) {
          const prism = hit.target;
          bouncePoints.push({ x: prism.x, y: prism.y, isPrism: true });
          const angles = [prism.angle - PRISM_SPLIT_SPREAD, prism.angle + PRISM_SPLIT_SPREAD];
          for (const a of angles) {
            const pdx = Math.cos(a);
            const pdy = Math.sin(a);
            traceBranch(
              prism.x + pdx * (prism.r + 2),
              prism.y + pdy * (prism.r + 2),
              pdx,
              pdy,
              270,
              {
                bounced: true,
                isPrism: true,
                slingshot,
                curveAccum,
                ignorePrismId: prism.id,
                depth: state.depth + 1,
                maxSteps: 42,
                isSecondary: true,
              }
            );
          }
          return;
        }

        if (w.previewBounce && state.depth < 1 && (hit.kind === 'wall' || hit.kind === 'prop' || hit.kind === 'orrery')) {
          const dot = ndx * hit.nx + ndy * hit.ny;
          const rx = ndx - 2 * dot * hit.nx;
          const ry = ndy - 2 * dot * hit.ny;
          const superHit = !!(hit.target && (hit.target.type === 'eraser' || hit.target.type === 'bumper'));
          bouncePoints.push({ x: hit.x, y: hit.y, isSuper: superHit });

          const remain = Math.max(185, Math.min(390, maxRange - traveled + (superHit ? 120 : 80)));
          const bx = hit.x + hit.nx * 1.4;
          const by = hit.y + hit.ny * 1.4;

          if (hasSplitCurio) {
            const baseAng = Math.atan2(ry, rx);
            [-SPLIT_BOUNCE_SPREAD, SPLIT_BOUNCE_SPREAD].forEach((off) => {
              const a = baseAng + off;
              traceBranch(bx, by, Math.cos(a), Math.sin(a), remain * 0.85, {
                bounced: true,
                isSuper: superHit,
                slingshot,
                curveAccum,
                depth: state.depth + 1,
                maxSteps: 42,
                isSecondary: true,
              });
            });
          } else {
            traceBranch(bx, by, rx, ry, remain, {
              bounced: true,
              isSuper: superHit,
              slingshot,
              curveAccum,
              depth: state.depth + 1,
              maxSteps: 48,
              isSecondary: true,
            });
          }
          return;
        }
        return;
      }

      flushPath();
    }

    traceBranch(ox, oy, dx0, dy0, w.previewRange, {
      bounced: false,
      isPrism: false,
      slingshot: false,
      curveAccum: 0,
      depth: 0,
      maxSteps: 86,
      isSecondary: false,
    });

    return {
      weapon: w,
      ox,
      oy,
      aimAngle: p.aimAngle,
      paths,
      bouncePoints,
      lockTargets,
      cratePreviews,
      guardPreviews,
      vortexPreviewPoint,
    };
  }

  // ==================== 声波涟漪与守卫听觉广播 ====================
  function emitSoundRipple(x, y, radius, sourceType = 'gunshot', color = null) {
    if (radius <= 10) return;

    const palette = {
      gunshot: '#3c8594',
      loud: '#e05a47',
      ricochet: '#e0a224',
      break: '#d96452',
      ink: '#38a6ba',
      dash: '#68b0bf',
      slam: '#b83227',
      chime_lure: '#38b5cc',
      pollen: '#e8b931',
      vortex: '#5298e0',
    };

    game.ripples.push({
      x,
      y,
      radius: 10,
      maxRadius: radius,
      speed: Math.max(290, radius * 2.25),
      alpha: 0.8,
      sourceType,
      color: color || palette[sourceType] || '#3c8594',
    });

    if (CB.guards && CB.guards.notifySound) {
      CB.guards.notifySound(x, y, radius, sourceType);
    }
  }

  // ==================== 可滑动台球木箱物理引擎 ====================
  function pushCrate(crate, impVx, impVy, playSfx = true) {
    if (!crate || crate.broken || crate.type !== 'crate') return;
    const cx = crate.x + crate.w / 2;
    const cy = crate.y + crate.h / 2;
    const onSlide = !!getDewSlideAt(cx, cy);

    // 极化启动手感：滑道上水膜加持 ×1.38 瞬间高速飞出；粗糙苔石砖上仅 ×0.72 沉闷挪动
    const surfaceBoost = onSlide ? 1.38 : 0.72;
    const activeGust = CB.extraction && CB.extraction.getActiveGust ? CB.extraction.getActiveGust() : null;
    const impLen = Math.hypot(impVx, impVy) || 1;
    const gAlign = activeGust ? Math.max(0, (impVx * activeGust.dirX + impVy * activeGust.dirY) / impLen) : 0;
    const gustMult = activeGust && gAlign > 0.1 ? 1 + 0.45 * gAlign : 1.0;
    crate.vx = (crate.vx || 0) + impVx * surfaceBoost * gustMult;
    crate.vy = (crate.vy || 0) + impVy * surfaceBoost * gustMult;

    const spd = Math.hypot(crate.vx, crate.vy);
    const maxSpd = onSlide ? 960 : 520;
    if (spd > maxSpd) {
      crate.vx = (crate.vx / spd) * maxSpd;
      crate.vy = (crate.vy / spd) * maxSpd;
    }

    if (spd > 35) {
      crate.sliding = true;
      crate.wobble = Math.max(crate.wobble || 0, 0.75);
      if (playSfx && CB.audio) {
        if (onSlide && CB.audio.playCratePush) CB.audio.playCratePush(true);
        else if (CB.audio.playRoughScrape) CB.audio.playRoughScrape();
      }
      CB.player.spawnDust(cx, cy, onSlide ? '#88e6f7' : '#b8a284', onSlide ? 7 : 5, onSlide ? 1.25 : 0.85);
    }
  }

  // ==================== 易碎木质花栏碎裂逻辑 ====================
  function breakRailing(edge, hitX, hitY, dirX = 0, dirY = 0) {
    if (!edge || edge.kind !== 'railing' || edge.broken) return false;
    edge.broken = true;
    edge.hp = 0;
    edge.hitFlash = 1;
    edge.wobble = 0;

    const cx = hitX ?? (edge.x + edge.w / 2);
    const cy = hitY ?? (edge.y + edge.h / 2);

    if (CB.audio && CB.audio.playRailingBreak) CB.audio.playRailingBreak();
    game.camera.shake = Math.max(game.camera.shake, 4.8);

    // 沿整段木花栏飞溅木屑、绿叶与花瓣
    const count = 14;
    for (let i = 0; i < count; i++) {
      const frac = (i + 0.5) / count;
      const px = edge.orient === 'h' ? edge.x + edge.w * frac : edge.x + edge.w * 0.5;
      const py = edge.orient === 'h' ? edge.y + edge.h * 0.5 : edge.y + edge.h * frac;
      const outBias = 0.65 + Math.random() * 0.85;
      const spd = 75 + Math.random() * 145;
      const vx = (edge.outwardX * outBias + dirX * 0.55 + (Math.random() - 0.5) * 0.9) * spd;
      const vy = (edge.outwardY * outBias + dirY * 0.55 + (Math.random() - 0.5) * 0.9) * spd;
      const colors = ['#c9945a', '#9c6838', '#68be7c', '#ffa6be', '#ffe278'];
      game.particles.push({
        x: px,
        y: py - 8,
        vx,
        vy,
        r: 3.0 + Math.random() * 4.2,
        life: 0.34 + Math.random() * 0.28,
        maxLife: 0.62,
        color: colors[i % colors.length],
      });
    }

    emitSoundRipple(cx, cy, 195, 'break', '#c98842');
    CB.player.spawnPopup(cx - edge.outwardX * 16, cy - edge.outwardY * 16 - 24, '🪵 花栏碎裂 · 露出崖口!', '#b56e28');

    // 狂风蒲公英扇：破栏瞬间喷出向外风压推飞周边守卫直奔云海！
    if (hasBuildCurio('gale_fan') && CB.guards && CB.guards.launchGuardBilliard) {
      let pushedAny = false;
      for (const g of game.guards) {
        if (g.dead) continue;
        const dx = g.x - cx;
        const dy = g.y - cy;
        const d = Math.hypot(dx, dy);
        if (d < 185) {
          const rdx = d > 1 ? dx / d : edge.outwardX;
          const rdy = d > 1 ? dy / d : edge.outwardY;
          const wx = edge.outwardX * 1.45 + rdx * 0.45;
          const wy = edge.outwardY * 1.45 + rdy * 0.45;
          const wlen = Math.hypot(wx, wy) || 1;
          const gustSpd = 560 / Math.sqrt(g.mass || 1);
          CB.guards.launchGuardBilliard(g, (wx / wlen) * gustSpd, (wy / wlen) * gustSpd, { stunDuration: 1.1 });
          pushedAny = true;
        }
      }
      if (CB.audio && CB.audio.playWindGust) CB.audio.playWindGust();
      CB.player.spawnDust(cx, cy - 8, '#8ef5e4', 12, 1.55);
      if (pushedAny) {
        CB.player.spawnPopup(cx - edge.outwardX * 22, cy - edge.outwardY * 22 - 44, '🌬️ 破栏风压!', '#229688');
      }
    }
    return true;
  }

  function damageRailing(edge, dmg, hitX, hitY, dirX = 0, dirY = 0) {
    if (!edge || edge.kind !== 'railing' || edge.broken) return false;
    edge.hp -= dmg;
    edge.hitFlash = 1;
    edge.wobble = 1;
    if (edge.hp <= 0) {
      return breakRailing(edge, hitX, hitY, dirX, dirY);
    }
    if (CB.audio) CB.audio.playHit(false);
    CB.player.spawnDust(hitX, hitY - 8, '#c9945a', 5, 1.0);
    return false;
  }

  function updateCrates(dt) {
    const map = game.map;
    if (!map) return;

    const crates = map.props.filter((p) => !p.broken && p.type === 'crate');
    if (crates.length === 0) return;

    const hasWax = hasBuildCurio('billiard_wax');
    const wallRestitution = hasWax ? 0.84 : 0.72;

    for (const crate of crates) {
      let cx = crate.x + crate.w / 2;
      let cy = crate.y + crate.h / 2;
      const cr = Math.min(crate.w, crate.h) * 0.48;

      // 1. 活跃引力漩涡牵引台球木箱
      if (game.vortices && game.vortices.length > 0) {
        for (const v of game.vortices) {
          const dx = v.x - cx;
          const dy = v.y - cy;
          const d = Math.hypot(dx, dy);
          const R = v.radius * Math.min(1, v.grow);
          if (d < R && d > 18) {
            const u = 1 - d / R;
            const pullAcc = 540 * (0.4 + u);
            crate.vx += (dx / d) * pullAcc * dt;
            crate.vy += (dy / d) * pullAcc * dt;
          }
        }
      }

      const spd0 = Math.hypot(crate.vx || 0, crate.vy || 0);
      crate.onDewSlide = !!getDewSlideAt(cx, cy);

      if (spd0 < 6) {
        crate.vx = 0;
        crate.vy = 0;
        crate.sliding = false;
        if (crate.trail && crate.trail.length > 0) crate.trail.shift();
        continue;
      }

      crate.sliding = true;
      const steps = spd0 > 340 ? 2 : 1;
      const subDt = dt / steps;

      for (let s = 0; s < steps; s++) {
        if (crate.broken) break;
        crate.x += crate.vx * subDt;
        crate.y += crate.vy * subDt;
        cx = crate.x + crate.w / 2;
        cy = crate.y + crate.h / 2;

        // 2A. 碰撞墙体、角柱、闭合藤蔓花闸与不可破坏家具
        const bounceOffRect = (rx, ry, rw, rh, rest = wallRestitution, isSuper = false) => {
          const nearX = Math.max(rx, Math.min(cx, rx + rw));
          const nearY = Math.max(ry, Math.min(cy, ry + rh));
          const dx = cx - nearX;
          const dy = cy - nearY;
          const dSq = dx * dx + dy * dy;
          if (dSq >= cr * cr) return false;

          const d = Math.sqrt(dSq) || 0.001;
          const nx = dx / d;
          const ny = dy / d;
          const pen = cr - d;
          crate.x += nx * pen;
          crate.y += ny * pen;
          cx += nx * pen;
          cy += ny * pen;

          const vn = crate.vx * nx + crate.vy * ny;
          if (vn < 0) {
            if (isSuper) {
              const outSpd = Math.max(540, Math.hypot(crate.vx, crate.vy) * 1.38);
              crate.vx = nx * outSpd;
              crate.vy = ny * outSpd;
            } else {
              crate.vx -= (1 + rest) * vn * nx;
              crate.vy -= (1 + rest) * vn * ny;
            }
            crate.slideBounceCount = (crate.slideBounceCount || 0) + 1;
            if (Math.abs(vn) > 95 && CB.audio && CB.audio.playCrateClack) {
              CB.audio.playCrateClack(false);
            }
            CB.player.spawnDust(nearX, nearY, isSuper ? '#ff9db2' : '#e6cfb2', 5, 1.1);
          }
          return true;
        };

        const bounceOffCircle = (ox, oy, orad, rest = wallRestitution, isSuper = false) => {
          const dx = cx - ox;
          const dy = cy - oy;
          const minD = cr + orad;
          const dSq = dx * dx + dy * dy;
          if (dSq >= minD * minD) return false;

          const d = Math.sqrt(dSq) || 0.001;
          const nx = dx / d;
          const ny = dy / d;
          const pen = minD - d;
          crate.x += nx * pen;
          crate.y += ny * pen;
          cx += nx * pen;
          cy += ny * pen;

          const vn = crate.vx * nx + crate.vy * ny;
          if (vn < 0) {
            if (isSuper) {
              const outSpd = Math.max(560, Math.hypot(crate.vx, crate.vy) * 1.42);
              crate.vx = nx * outSpd;
              crate.vy = ny * outSpd;
            } else {
              crate.vx -= (1 + rest) * vn * nx;
              crate.vy -= (1 + rest) * vn * ny;
            }
            if (Math.abs(vn) > 95 && CB.audio && CB.audio.playCrateClack) {
              CB.audio.playCrateClack(false);
            }
            CB.player.spawnDust(ox + nx * orad, oy + ny * orad, isSuper ? '#ffe47a' : '#d8e6e2', 5, 1.1);
          }
          return true;
        };

        for (const w of map.walls) bounceOffRect(w.x, w.y, w.w, w.h);
        for (const post of map.posts) bounceOffRect(post.x, post.y, post.w, post.h);
        if (map.vineGates) {
          for (const gate of map.vineGates) {
            if (!gate.open) bounceOffRect(gate.x, gate.y, gate.w, gate.h);
          }
        }
        if (map.cliffEdges) {
          let fellOff = false;
          for (const edge of map.cliffEdges) {
            const nearX = Math.max(edge.x, Math.min(cx, edge.x + edge.w));
            const nearY = Math.max(edge.y, Math.min(cy, edge.y + edge.h));
            const dSq = (cx - nearX) ** 2 + (cy - nearY) ** 2;
            if (dSq >= cr * cr) continue;

            const spdNow = Math.hypot(crate.vx, crate.vy);
            if (edge.kind === 'railing' && !edge.broken) {
              if (spdNow > 195) {
                breakRailing(edge, cx, cy, crate.vx / (spdNow || 1), crate.vy / (spdNow || 1));
                crate.vx *= 0.86;
                crate.vy *= 0.86;
              } else {
                bounceOffRect(edge.x, edge.y, edge.w, edge.h);
                continue;
              }
            }

            // 敞开崖边或已碎花栏：木箱滑出即坠入云海，但金币安全弹回岛内
            const outDot = crate.vx * edge.outwardX + crate.vy * edge.outwardY;
            if (outDot > 35 || dSq < (cr * 0.45) ** 2) {
              crate.broken = true;
              fellOff = true;
              const safeX = cx - edge.outwardX * 52;
              const safeY = cy - edge.outwardY * 52;
              spawnCoins(safeX, safeY, 3, 0.9);
              for (let ci = Math.max(0, game.coinsList.length - 3); ci < game.coinsList.length; ci++) {
                game.coinsList[ci].vx += -edge.outwardX * 75;
                game.coinsList[ci].vy += -edge.outwardY * 75;
              }
              game.fallingCrates.push({
                x: cx,
                y: cy,
                w: crate.w,
                h: crate.h,
                vx: edge.outwardX * Math.max(120, Math.abs(outDot) * 0.6) + crate.vx * 0.25,
                vy: edge.outwardY * Math.max(120, Math.abs(outDot) * 0.6) + crate.vy * 0.25,
                fallVy: 45,
                outwardY: edge.outwardY,
                angle: 0,
                spin: (Math.random() < 0.5 ? 1 : -1) * 8,
                scale: 1,
                life: 0.9,
                maxLife: 0.9,
              });
              if (CB.audio) CB.audio.playDash();
              CB.player.spawnDust(cx, cy, '#eef9ff', 8, 1.15);
              CB.player.spawnPopup(safeX, safeY - 22, '📦 木箱坠入云海!', '#2e8da8');
              break;
            }
          }
          if (fellOff) break;
        }

        // 2B. 与其他场景道具交互（撞碎花蜜瓶/花粉苞、敲响风铃、点亮向日葵、台球木箱互撞！）
        for (const other of map.props) {
          if (other === crate || other.broken) continue;

          if (other.type === 'crate') {
            // 台球木箱碰撞传递动量！
            const ocx = other.x + other.w / 2;
            const ocy = other.y + other.h / 2;
            const ocr = Math.min(other.w, other.h) * 0.48;
            const dx = ocx - cx;
            const dy = ocy - cy;
            const minD = cr + ocr;
            const dSq = dx * dx + dy * dy;
            if (dSq < minD * minD && dSq > 0.001) {
              const d = Math.sqrt(dSq);
              const nx = dx / d;
              const ny = dy / d;
              const overlap = (minD - d) * 0.5;
              crate.x -= nx * overlap;
              crate.y -= ny * overlap;
              other.x += nx * overlap;
              other.y += ny * overlap;
              cx -= nx * overlap;
              cy -= ny * overlap;

              const rvx = (other.vx || 0) - crate.vx;
              const rvy = (other.vy || 0) - crate.vy;
              const velAlongNormal = rvx * nx + rvy * ny;
              if (velAlongNormal < 0) {
                const e = 0.88;
                const j = (-(1 + e) * velAlongNormal) / 2;
                crate.vx -= j * nx;
                crate.vy -= j * ny;
                other.vx = (other.vx || 0) + j * nx;
                other.vy = (other.vy || 0) + j * ny;
                other.sliding = true;
                other.wobble = 0.75;
                if (CB.audio && CB.audio.playCrateClack) CB.audio.playCrateClack(false);
                CB.player.spawnDust((cx + ocx) / 2, (cy + ocy) / 2 - 8, '#ffe694', 7, 1.2);
              }
            }
            continue;
          }

          if (other.type === 'inkwell' || other.type === 'pollen_bud') {
            const d = Math.hypot(cx - other.x, cy - other.y);
            if (d < cr + other.r) {
              damageProp(other, 999, other.x, other.y);
              crate.vx *= 0.78;
              crate.vy *= 0.78;
            }
            continue;
          }

          if (other.type === 'chime') {
            if (bounceOffCircle(other.x, other.y, other.r, 0.8, false)) {
              ringChime(other);
            }
            continue;
          }

          if (other.type === 'sunflower_switch') {
            if (bounceOffCircle(other.x, other.y, other.r, 0.75, false)) {
              activateSunflowerSwitch(other);
            }
            continue;
          }

          if (other.shape === 'circle') {
            const isSuper = other.type === 'bumper';
            if (bounceOffCircle(other.x, other.y, other.r, wallRestitution, isSuper) && isSuper) {
              other.hitFlash = 1;
              if (CB.audio) CB.audio.playRicochet(1, true);
              CB.player.spawnPopup(other.x, other.y - 32, '风铃弹箱!', '#2494a8');
            }
          } else {
            const isSuper = other.type === 'eraser';
            if (bounceOffRect(other.x, other.y, other.w, other.h, wallRestitution, isSuper) && isSuper) {
              other.hitFlash = 1;
              if (CB.audio) CB.audio.playRicochet(1, true);
              CB.player.spawnPopup(cx, cy - 32, '菌伞弹箱!', '#e06488');
            }
          }
        }

        // 2C. 滑行台球木箱撞击守卫（高速滑道撞击触发砸碎大盾 + 巨额台球伤害 + 眩晕！）
        const curSpd = Math.hypot(crate.vx, crate.vy);
        if (curSpd > 145 && CB.guards && CB.guards.damageGuard) {
          for (const g of game.guards) {
            if (g.dead) continue;
            const dx = g.x - cx;
            const dy = g.y - cy;
            const minD = g.radius + cr + 4;
            const dSq = dx * dx + dy * dy;
            if (dSq < minD * minD) {
              const d = Math.sqrt(dSq) || 0.001;
              const nx = dx / d;
              const ny = dy / d;
              g.x += nx * (minD - d + 3);
              g.y += ny * (minD - d + 3);

              const waxMult = hasWax ? 1.45 : 1.0;
              const slideBonus = crate.onDewSlide ? 1.25 : 1.0;
              const impactDmg = Math.round((22 + (curSpd / 320) * 32) * waxMult * slideBonus);
              const launchSpd = Math.max(540, curSpd * 1.18) * (crate.onDewSlide ? 1.15 : 1.0);
              CB.guards.damageGuard(g, impactDmg, nx, ny, true, '🎱 滑道台球!', true, {
                source: 'billiard',
                launchSpeed: launchSpd,
              });
              if (!g.dead) {
                g.aiState = 'stunned';
                g.stateTimer = Math.max(g.stateTimer, 1.95);
              }
              if (game.run) game.run.billiardHits += 1;
              if (CB.extraction && CB.extraction.addStuntBounty) CB.extraction.addStuntBounty(12);
              if (CB.audio && CB.audio.playCrateClack) CB.audio.playCrateClack(true);
              game.hitStop = Math.max(game.hitStop, 0.042);
              game.camera.shake = Math.max(game.camera.shake, 6.4);
              CB.player.spawnDust((cx + g.x) / 2, (cy + g.y) / 2 - 10, '#ffe278', 13, 1.6);
              emitSoundRipple(cx, cy, 210, 'slam');

              crate.vx = -nx * curSpd * 0.42;
              crate.vy = -ny * curSpd * 0.42;
              break;
            }
          }
        }
      }

      // 3. 表面动摩擦衰减（低摩擦露水滑道阻尼极小，普通石砖正常摩擦）
      cx = crate.x + crate.w / 2;
      cy = crate.y + crate.h / 2;
      crate.onDewSlide = !!getDewSlideAt(cx, cy);
      const spdAfter = Math.hypot(crate.vx, crate.vy);

      if (spdAfter > 0) {
        // 彻底两极化摩擦反差：粗糙苔石砖 2650（立刻刹停），冰镜露水滑道仅 95（约 1/28 摩擦，如气垫冰壶横穿全房！）
        const activeGust = CB.extraction && CB.extraction.getActiveGust ? CB.extraction.getActiveGust() : null;
        const gAlign = activeGust && spdAfter > 1
          ? (crate.vx * activeGust.dirX + crate.vy * activeGust.dirY) / spdAfter
          : 0;
        const baseDecel = crate.onDewSlide ? 95 : 2650;
        const gustDecelMult = activeGust && gAlign > 0.15 ? 0.65 : 1.0;
        const decel = (hasWax ? baseDecel * 0.58 : baseDecel) * gustDecelMult * dt;
        const nextSpd = Math.max(0, spdAfter - decel);
        crate.vx = (crate.vx / spdAfter) * nextSpd;
        crate.vy = (crate.vy / spdAfter) * nextSpd;
        if (activeGust && nextSpd > 30) {
          crate.vx += activeGust.dirX * 260 * dt;
          crate.vy += activeGust.dirY * 260 * dt;
        }

        // 露水滑道上滑行时水花与提示音效
        if (crate.onDewSlide && nextSpd > 85) {
          if (Math.random() < 0.45) {
            CB.player.spawnDust(cx, cy + 4, '#8ae8f7', 1, 0.65);
          }
          crate.slideSoundTimer = Math.max(0, (crate.slideSoundTimer || 0) - dt);
          if (crate.slideSoundTimer <= 0) {
            crate.slideSoundTimer = 0.24;
            if (CB.audio && CB.audio.playDewSlide) CB.audio.playDewSlide();
          }
        }

        if (nextSpd > 65) {
          crate.trail = crate.trail || [];
          crate.trail.push({ x: cx, y: cy, dew: crate.onDewSlide });
          if (crate.trail.length > 7) crate.trail.shift();
        } else if (crate.trail && crate.trail.length > 0) {
          crate.trail.shift();
        }
      }
    }
  }

  // ==================== 单一核心工具发射（轻点静音 / 蓄力重弹） ====================
  function fireLauncher(chargeRatio = 0, isHeavy = false) {
    const p = game.player;
    const cfg = isHeavy ? LAUNCHER.heavy : LAUNCHER.light;
    const t = isHeavy ? Math.max(0, Math.min(1, chargeRatio)) : 0;

    p.fireCooldown = cfg.cooldown;
    const kick = isHeavy ? cfg.recoilKick * (0.75 + 0.55 * t) : cfg.recoilKick;
    p.recoil = Math.min(1.45, kick);
    p.squashVel -= 2.0 * kick;
    game.camera.shake = Math.max(game.camera.shake, isHeavy ? cfg.shake * (0.75 + 0.65 * t) : cfg.shake);

    const dx0 = Math.cos(p.aimAngle);
    const dy0 = Math.sin(p.aimAngle);
    const muzzleCheck = raycastScene(p.x, p.y, dx0, dy0, 22, { pad: 2, includeGuards: false });
    const startDist = muzzleCheck.hit ? Math.max(4, muzzleCheck.dist - 3) : 20;
    const mx = p.x + dx0 * startDist;
    const my = p.y + dy0 * startDist;

    const speedMult = hasBuildCurio('pocket_core') ? 1.18 : 1.0;
    const extraBounce = hasBuildCurio('monocle') ? 1 : 0;

    const spd = (isHeavy ? cfg.baseSpeed + cfg.maxBonusSpeed * t : cfg.speed) * speedMult;
    const dmg = isHeavy ? Math.round(cfg.baseDamage + cfg.maxBonusDamage * t) : cfg.damage;
    const bounces = isHeavy
      ? cfg.maxBounces + (t >= 0.85 ? cfg.fullChargeBonusBounce : 0) + extraBounce
      : cfg.maxBounces + extraBounce;
    const range = isHeavy ? cfg.baseRange + cfg.maxBonusRange * t : cfg.range;
    const fanCrateBoost = isHeavy && hasBuildCurio('gale_fan') ? 1.25 : 1.0;
    const crateImpulse = (isHeavy ? cfg.baseCrateImpulse + cfg.maxBonusCrateImpulse * t : cfg.crateImpulse) * fanCrateBoost;
    const noiseR = isHeavy ? cfg.baseNoiseRadius + cfg.maxBonusNoiseRadius * t : cfg.noiseRadius;

    game.bullets.push({
      x: mx,
      y: my,
      vx: dx0 * spd,
      vy: dy0 * spd,
      speed: spd,
      baseSpeed: spd,
      damage: dmg,
      ricochetMult: cfg.ricochetMult,
      sneakMult: cfg.sneakMult,
      bouncesLeft: bounces,
      bounceCount: 0,
      traveled: 0,
      maxRange: range,
      radius: isHeavy ? cfg.bulletRadius + t * 1.1 : cfg.bulletRadius,
      crateImpulse,
      color: isHeavy && t >= 0.85 ? '#ffe052' : cfg.color,
      trailColor: cfg.trailColor,
      bouncedColor: cfg.bouncedColor,
      weaponId: isHeavy ? 'heavy' : 'needle',
      isHeavy,
      chargeRatio: t,
      fromPollen: !!p.inPollen,
      isPrismBeam: false,
      prismSplits: 0,
      lastPrismId: null,
      curveAccum: 0,
      slingshotCharged: false,
      spawnedVortex: !isHeavy, // 轻点静音弹不乱刷漩涡，蓄力重弹才触发引力漩涡核！
      splitGen: isHeavy ? 0 : 1, // 蓄力重弹触发折射分裂晶
      trail: [{ x: mx, y: my }],
    });

    CB.player.spawnDust(
      mx,
      my - 10,
      isHeavy ? (t >= 0.85 ? '#fff08a' : '#ffd870') : '#9cebf7',
      isHeavy ? (t >= 0.85 ? 9 : 6) : 3,
      isHeavy ? 1.45 : 1.0
    );
    if (CB.audio) CB.audio.playShoot(isHeavy ? 'heavy' : 'light', t);

    const pollenDamp = p.inPollen ? 0.68 : 1.0;
    emitSoundRipple(mx, my, noiseR * pollenDamp, isHeavy ? 'gunshot' : 'dash');
  }

  // ==================== 空中花房特色机关触发逻辑 ====================
  function triggerPrismSplit(prism, b) {
    prism.hitFlash = 1;
    prism.pulse = 1;
    if (game.run) game.run.prismsUsed += 1;

    const angles = b.prismSplits < 1
      ? [prism.angle - PRISM_SPLIT_SPREAD, prism.angle + PRISM_SPLIT_SPREAD]
      : [prism.angle];

    const newSpd = Math.min(1150, b.speed * 1.15);
    for (const ang of angles) {
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      const sx = prism.x + dx * (prism.r + 3);
      const sy = prism.y + dy * (prism.r + 3);
      game.bullets.push({
        x: sx,
        y: sy,
        vx: dx * newSpd,
        vy: dy * newSpd,
        speed: newSpd,
        baseSpeed: newSpd,
        damage: Math.round(b.damage * 1.25),
        ricochetMult: b.ricochetMult,
        sneakMult: b.sneakMult,
        bouncesLeft: Math.max(1, b.bouncesLeft),
        bounceCount: b.bounceCount + 1,
        traveled: 0,
        maxRange: 740,
        radius: Math.max(4.4, b.radius),
        color: '#ffe45e',
        trailColor: '#f5a623',
        bouncedColor: '#ff7043',
        weaponId: b.weaponId,
        fromPollen: b.fromPollen,
        isPrismBeam: true,
        prismSplits: b.prismSplits + 1,
        lastPrismId: prism.id,
        curveAccum: b.curveAccum,
        slingshotCharged: b.slingshotCharged,
        spawnedVortex: b.spawnedVortex,
        splitGen: b.splitGen + 1,
        trail: [{ x: prism.x, y: prism.y }, { x: sx, y: sy }],
      });
    }

    if (CB.audio) CB.audio.playPrismSplit();
    game.camera.shake = Math.max(game.camera.shake, 3.0);
    CB.player.spawnDust(prism.x, prism.y - 14, '#fff29c', 11, 1.5);
    CB.player.spawnDust(prism.x, prism.y - 14, '#7ae8ff', 6, 1.25);
    emitSoundRipple(prism.x, prism.y, 155, 'ricochet', '#f2b705');
    if (hasBuildCurio('star_jar') && CB.guards && CB.guards.stunNearbyGuards) {
      CB.guards.stunNearbyGuards(prism.x, prism.y, 92, 1.1);
    }
    if (b.prismSplits < 1) {
      CB.player.spawnPopup(prism.x, prism.y - 32, '✦ 棱镜双光束!', '#d48d14');
    }
  }

  function ringChime(prop) {
    prop.hitFlash = 1;
    prop.ringAnim = 1;
    if (prop.ringCooldown > 0) return;
    prop.ringCooldown = 0.55;

    if (CB.audio) CB.audio.playChimeChord();
    CB.player.spawnDust(prop.x, prop.y - 18, '#8be8f5', 9, 1.25);
    CB.player.spawnDust(prop.x, prop.y - 18, '#ffe680', 5, 1.0);
    emitSoundRipple(prop.x, prop.y, 440, 'chime_lure', '#38b5cc');
    CB.player.spawnPopup(prop.x, prop.y - 36, '🎐 风铃诱敌声波!', '#1e8da3');
  }

  function activateSunflowerSwitch(prop) {
    prop.hitFlash = 1;
    prop.wobble = 1;
    if (prop.activated) return;

    prop.activated = true;
    prop.bloomAnim = 1;
    if (game.run) game.run.gatesOpened += 1;

    if (CB.audio) CB.audio.playGateOpen();
    game.camera.shake = Math.max(game.camera.shake, 4.5);
    CB.player.spawnDust(prop.x, prop.y - 14, '#ffd84d', 14, 1.55);
    CB.player.spawnPopup(prop.x, prop.y - 34, '🌻 向日葵绽放 · 花闸开启!', '#c98212');

    if (game.map && game.map.vineGates) {
      const gate = game.map.vineGates.find((g) => g.id === prop.gateId);
      if (gate && !gate.open) {
        gate.open = true;
        CB.player.spawnDust(gate.cx, gate.cy - 10, '#72c984', 14, 1.5);
        CB.player.spawnDust(gate.cx, gate.cy - 10, '#ffe47a', 8, 1.3);
        CB.player.spawnPopup(gate.cx, gate.cy - 30, '捷径已通!', '#2e8f62');
      }
    }
  }

  function spawnPollenCloud(x, y) {
    const puffs = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      puffs.push({
        ang: a,
        dist: 0.34 + Math.random() * 0.36,
        r: 0.38 + Math.random() * 0.24,
        phase: Math.random() * 6.28,
      });
    }
    game.pollenClouds.push({
      x,
      y,
      radius: 92,
      life: 7.5,
      maxLife: 7.5,
      grow: 0.18,
      puffs,
    });
  }

  function isInPollen(x, y) {
    for (const pc of game.pollenClouds) {
      const r = pc.radius * Math.min(1, pc.grow);
      if (Math.hypot(x - pc.x, y - pc.y) <= r) return true;
    }
    return false;
  }

  function damageProp(prop, dmg, hitX, hitY) {
    if (!prop || !prop.destructible || prop.broken) return;
    prop.hp -= dmg;
    prop.hitFlash = 1;
    prop.wobble = 1;

    if (prop.hp > 0) {
      if (CB.audio) CB.audio.playHit(false);
      CB.player.spawnDust(hitX, hitY - 8, prop.type === 'crate' ? '#cfa06b' : '#ffd859', 5, 1.1);
      return;
    }

    prop.broken = true;
    const cx = prop.shape === 'circle' ? prop.x : prop.x + prop.w / 2;
    const cy = prop.shape === 'circle' ? prop.y : prop.y + prop.h / 2;

    if (prop.type === 'crate') {
      if (game.run) game.run.cratesBroken += 1;
      if (CB.audio) CB.audio.playBreak('crate');
      game.camera.shake = Math.max(game.camera.shake, 4.2);
      CB.player.spawnDust(cx, cy - 8, '#c89258', 12, 1.6);
      CB.player.spawnDust(cx, cy - 8, '#6ec27e', 6, 1.3);
      emitSoundRipple(cx, cy, 235, 'break');
      spawnCoins(cx, cy, 3 + Math.floor(Math.random() * 3));
      CB.player.spawnPopup(cx, cy - 26, '藤箱碎裂!', '#9c6c2d');
    } else if (prop.type === 'inkwell') {
      if (CB.audio) CB.audio.playBreak('inkwell');
      game.camera.shake = Math.max(game.camera.shake, 4.5);
      CB.player.spawnDust(cx, cy - 8, prop.color || '#3cb6c9', 14, 1.75);
      CB.player.spawnDust(cx, cy - 8, '#eef6ff', 5, 1.4);
      emitSoundRipple(cx, cy, 285, 'ink', prop.color || '#3cb6c9');
      spawnInkPuddle(cx, cy, prop.color || '#3cb6c9');
      spawnCoins(cx, cy, 1 + Math.floor(Math.random() * 2));
      CB.player.spawnPopup(cx, cy - 26, '秘露飞溅!', prop.color || '#2b95a8');
    } else if (prop.type === 'pollen_bud') {
      if (CB.audio) CB.audio.playPollenBurst();
      game.camera.shake = Math.max(game.camera.shake, 3.6);
      CB.player.spawnDust(cx, cy - 10, '#ffe26a', 18, 1.65);
      CB.player.spawnDust(cx, cy - 10, '#fff7cc', 10, 1.3);
      spawnPollenCloud(cx, cy);
      emitSoundRipple(cx, cy, 170, 'pollen', '#e8b931');
      CB.player.spawnPopup(cx, cy - 30, '🌼 花粉隐身雾绽放!', '#c48914');
    }
  }

  function spawnInkPuddle(x, y, color) {
    const lobes = [];
    const count = 9;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      lobes.push({
        ang: a,
        dist: 0.45 + Math.random() * 0.42,
        r: 0.36 + Math.random() * 0.28,
      });
    }
    const droplets = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      droplets.push({
        dx: Math.cos(a) * (58 + Math.random() * 28),
        dy: Math.sin(a) * (46 + Math.random() * 24),
        r: 4 + Math.random() * 6,
      });
    }

    game.inkPuddles.push({
      x,
      y,
      radius: 68,
      color,
      life: 14.0,
      maxLife: 14.0,
      grow: 0.15,
      lobes,
      droplets,
    });
  }

  function getInkAt(x, y) {
    for (const p of game.inkPuddles) {
      const r = p.radius * Math.min(1, p.grow);
      if (Math.hypot(x - p.x, y - p.y) <= r) return p;
    }
    return null;
  }

  function spawnCoins(x, y, count = 3, boostSpeed = 1) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (80 + Math.random() * 115) * boostSpeed;
      game.coinsList.push({
        x,
        y,
        z: 10 + Math.random() * 10,
        vz: 110 + Math.random() * 75,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        value: 1,
        age: 0,
        spin: Math.random() * Math.PI * 2,
        pickupDelay: 0.16,
      });
    }
  }

  function rustleGrassAt(x, y, radius, dirX) {
    const map = game.map;
    if (!map || !map.groundDecors) return;
    for (const d of map.groundDecors) {
      if (d.kind !== 'grass') continue;
      if (Math.abs(d.x - x) > radius || Math.abs(d.y - y) > radius) continue;
      if (Math.hypot(d.x - x, d.y - y) < radius) {
        d.swayVel += (dirX >= 0 ? 1 : -1) * 7.5;
      }
    }
  }

  // ==================== 引力漩涡生成与物理更新 ====================
  function spawnGravityVortex(x, y, opts = {}) {
    const duration = opts.duration || 3.2;
    const radius = opts.radius || 156;
    const pullForce = opts.pullForce || 235;
    const bulletGravity = opts.bulletGravity || 4200;

    for (const v of game.vortices) {
      if (Math.hypot(v.x - x, v.y - y) < 62) {
        v.life = Math.max(v.life, duration);
        v.maxLife = Math.max(v.maxLife, duration);
        v.pulse = 1;
        return v;
      }
    }

    if (game.vortices.length >= 3) {
      game.vortices.shift();
    }

    const vortex = {
      x,
      y,
      radius,
      pullForce,
      bulletGravity,
      life: duration,
      maxLife: duration,
      grow: 0.16,
      spin: Math.random() * Math.PI * 2,
      pulse: 1,
    };
    game.vortices.push(vortex);

    if (game.run) game.run.vorticesSpawned += 1;
    if (CB.audio) CB.audio.playVortexSpawn();
    CB.player.spawnDust(x, y - 8, '#7ad8ff', 10, 1.35);
    CB.player.spawnDust(x, y - 8, '#ffe67a', 6, 1.1);
    return vortex;
  }

  function updateVortices(dt) {
    for (let i = game.vortices.length - 1; i >= 0; i--) {
      const v = game.vortices[i];
      v.grow = Math.min(1, v.grow + dt * 5.2);
      v.spin += dt * 4.8;
      if (v.pulse > 0) v.pulse = Math.max(0, v.pulse - dt * 3.2);
      v.life -= dt;

      const curR = v.radius * Math.min(1, v.grow);
      const fade = Math.min(1, v.life / 0.65);

      if (CB.guards && CB.guards.applyExternalPull) {
        for (const g of game.guards) {
          if (g.dead) continue;
          const dx = v.x - g.x;
          const dy = v.y - g.y;
          const d = Math.hypot(dx, dy);
          if (d < curR && d > 16) {
            const u = 1 - d / curR;
            const spd = v.pullForce * (0.45 + u * 0.95) * fade * (g.aiState === 'charging' ? 0.35 : 1);
            CB.guards.applyExternalPull(g, (dx / d) * spd * dt, (dy / d) * spd * dt);
          }
        }
      }

      for (const c of game.coinsList) {
        const dx = v.x - c.x;
        const dy = v.y - c.y;
        const d = Math.hypot(dx, dy);
        if (d < curR * 1.15 && d > 10) {
          const pull = (220 + (1 - d / (curR * 1.15)) * 240) * fade;
          c.x += (dx / d) * pull * dt;
          c.y += (dy / d) * pull * dt;
        }
      }

      if (v.life <= 0) {
        CB.player.spawnDust(v.x, v.y - 8, '#9be4ff', 7, 1.15);
        game.vortices.splice(i, 1);
      }
    }
  }

  // ==================== 每帧更新：曲线弹道、台球木箱、星轨仪、引力漩涡、涟漪、金币 ====================
  function updateCombat(dt) {
    const map = game.map;
    const player = game.player;

    if (map) {
      for (const prop of map.props) {
        if (prop.hitFlash > 0) prop.hitFlash = Math.max(0, prop.hitFlash - dt * 5.5);
        if (prop.wobble > 0) prop.wobble = Math.max(0, prop.wobble - dt * 6.5);
        if (prop.type === 'prism') {
          if (prop.pulse > 0) prop.pulse = Math.max(0, prop.pulse - dt * 3.5);
          let diff = prop.angle - prop.visualAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          prop.visualAngle += diff * (1 - Math.exp(-16 * dt));
        } else if (prop.type === 'orrery') {
          if (prop.pulse > 0) prop.pulse = Math.max(0, prop.pulse - dt * 3.2);
          if (prop.slingshotGlow > 0) prop.slingshotGlow = Math.max(0, prop.slingshotGlow - dt * 2.5);
        } else if (prop.type === 'chime') {
          if (prop.ringAnim > 0) prop.ringAnim = Math.max(0, prop.ringAnim - dt * 1.4);
          if (prop.ringCooldown > 0) prop.ringCooldown = Math.max(0, prop.ringCooldown - dt);
        } else if (prop.type === 'sunflower_switch') {
          if (prop.bloomAnim > 0) prop.bloomAnim = Math.max(0, prop.bloomAnim - dt * 2.2);
        }
      }

      if (map.vineGates) {
        for (const gate of map.vineGates) {
          const target = gate.open ? 1 : 0;
          gate.openAnim += (target - gate.openAnim) * (1 - Math.exp(-8 * dt));
        }
      }

      if (map.cliffEdges) {
        for (const edge of map.cliffEdges) {
          if (edge.hitFlash > 0) edge.hitFlash = Math.max(0, edge.hitFlash - dt * 5.5);
          if (edge.wobble > 0) edge.wobble = Math.max(0, edge.wobble - dt * 7.0);
        }
      }

      if (map.groundDecors) {
        for (const d of map.groundDecors) {
          if (d.kind !== 'grass') continue;
          const acc = -55 * d.sway - 6.5 * d.swayVel;
          d.swayVel += acc * dt;
          d.sway += d.swayVel * dt;
        }
      }
    }

    const hasVortexCurio = hasBuildCurio('vortex_core');
    const hasSplitCurio = hasBuildCurio('split_crystal');
    const hasLensCurio = hasBuildCurio('slingshot_lens');
    const hasPocketCore = hasBuildCurio('pocket_core');
    const hasStarJar = hasBuildCurio('star_jar');
    const hasOrreryGrand = hasBuildCurio('orrery');
    const hasMonocle = hasBuildCurio('monocle');

    // 1. 玩家弹丸曲线物理积分 + 连续扫掠更新
    for (let i = game.bullets.length - 1; i >= 0; i--) {
      const b = game.bullets[i];
      let remainDt = dt;
      let alive = true;
      let subIter = 0;

      while (remainDt > 1e-4 && alive && subIter < 4) {
        subIter++;
        const subDt = Math.min(remainDt, SIM_STEP_DT);
        remainDt -= subDt;

        const grav = computeGravityAccel(b.x, b.y, b.curveAccum, { applyLensHoming: true });
        if (grav.maxU > 0.005) {
          const prevAng = Math.atan2(b.vy, b.vx);
          b.vx += grav.ax * subDt;
          b.vy += grav.ay * subDt;
          const spdNow = Math.hypot(b.vx, b.vy) || 1;
          const base = b.baseSpeed || b.speed;
          const targetSpd = base * (b.slingshotCharged ? 1.16 : 1 + 0.14 * grav.maxU);
          b.vx = (b.vx / spdNow) * targetSpd;
          b.vy = (b.vy / spdNow) * targetSpd;
          b.speed = targetSpd;

          const newAng = Math.atan2(b.vy, b.vx);
          let da = newAng - prevAng;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          b.curveAccum += Math.abs(da);

          if (grav.nearestOrrery) {
            grav.nearestOrrery.slingshotGlow = Math.max(grav.nearestOrrery.slingshotGlow, 0.7);
          }

          if (!b.slingshotCharged && b.curveAccum >= SLINGSHOT_RAD) {
            b.slingshotCharged = true;
            if (CB.audio) CB.audio.playSlingshotCharge();
            CB.player.spawnDust(b.x, b.y - 10, '#72e8ff', 6, 1.2);
          }
        }

        if (hasLensCurio) {
          for (const c of game.coinsList) {
            const dCoin = Math.hypot(b.x - c.x, b.y - c.y);
            if (dCoin < 58 && dCoin > 1) {
              c.vx += ((player.x - c.x) / Math.max(20, Math.hypot(player.x - c.x, player.y - c.y))) * 460 * subDt;
              c.vy += ((player.y - c.y) / Math.max(20, Math.hypot(player.x - c.x, player.y - c.y))) * 460 * subDt;
            }
          }
        }

        const stepDist = b.speed * subDt;
        const dx = b.vx / (b.speed || 1);
        const dy = b.vy / (b.speed || 1);
        const hit = raycastScene(b.x, b.y, dx, dy, stepDist, {
          pad: b.radius * 0.75,
          includeGuards: true,
          includeClosedGates: false,
          ignorePrismId: b.lastPrismId,
        });

        b.x = hit.x;
        b.y = hit.y;
        b.traveled += hit.dist;

        rustleGrassAt(b.x, b.y, 26, dx);

        if (hit.hit) {
          if (hit.kind === 'guard') {
            const g = hit.target;
            const wasUnaware = g.aiState === 'patrol' || g.aiState === 'investigate';
            const isSlingshotHit = b.slingshotCharged;
            const isPrismHit = b.isPrismBeam;
            const isRicochetCrit = b.bounceCount > 0 && !isPrismHit && !isSlingshotHit;
            const isPollenAmbush = b.fromPollen && (b.weaponId === 'needle' || wasUnaware);
            const isSneakCrit = b.weaponId === 'needle' && wasUnaware;
            const isStunCrit = g.aiState === 'stunned';

            let dmg = b.damage;
            const monocleBoost = hasMonocle ? 1.25 : 1.0;

            if (isSlingshotHit) {
              const slingMult = (hasOrreryGrand ? 1.95 : hasLensCurio ? 1.75 : 1.45) * monocleBoost;
              dmg *= slingMult;
              if (game.run) {
                game.run.slingshotCrits += 1;
                game.run.ricochetCrits += 1;
              }
              if (CB.extraction && CB.extraction.addStuntBounty) CB.extraction.addStuntBounty(15);
            }
            if (isPrismHit) {
              dmg *= 1.35 * monocleBoost;
              if (game.run) game.run.ricochetCrits += 1;
              if (!isSlingshotHit && CB.extraction && CB.extraction.addStuntBounty) CB.extraction.addStuntBounty(8);
            } else if (isRicochetCrit) {
              dmg *= Math.pow(b.ricochetMult, Math.min(2, b.bounceCount)) * monocleBoost;
              if (game.run) game.run.ricochetCrits += 1;
              if (CB.extraction && CB.extraction.addStuntBounty) CB.extraction.addStuntBounty(8);
            }
            if (isPollenAmbush) dmg *= 1.6;
            else if (isSneakCrit) dmg *= b.sneakMult;
            if (isStunCrit) dmg *= 1.35;
            dmg = Math.round(dmg);

            const critTag = isSlingshotHit
              ? '🪐 星轨弹弓!'
              : isPrismHit
              ? '✦ 棱镜光束!'
              : isPollenAmbush
              ? '🌼 花粉偷袭!'
              : isRicochetCrit
              ? (b.bounceCount >= 2 ? '连弹暴击!' : '折射暴击!')
              : isSneakCrit
              ? '潜行暴击!'
              : isStunCrit
              ? '破防重击!'
              : null;

            if (isSlingshotHit && CB.audio) CB.audio.playSlingshotCrit();
            CB.guards.damageGuard(g, dmg, dx, dy, !!critTag, critTag, isSlingshotHit, {
              source: 'bullet',
              isHeavy: !!b.isHeavy,
              chargeRatio: b.chargeRatio || 0,
              slingshot: isSlingshotHit,
              prism: isPrismHit,
              bounced: b.bounceCount > 0,
              stealthAmbush: isPollenAmbush || isSneakCrit,
              fromPollen: b.fromPollen,
            });
            CB.player.spawnDust(
              hit.x,
              hit.y - 10,
              isSlingshotHit ? '#70ebff' : isPrismHit ? '#ffe45e' : (critTag ? '#ff7c52' : '#ffe08a'),
              isSlingshotHit ? 14 : (critTag ? 10 : 6),
              isSlingshotHit ? 1.65 : 1.45
            );

            if (hasVortexCurio && !b.spawnedVortex) {
              b.spawnedVortex = true;
              spawnGravityVortex(hit.x, hit.y);
            }
            if (hasStarJar && isSlingshotHit && CB.guards && CB.guards.stunNearbyGuards) {
              CB.guards.stunNearbyGuards(hit.x, hit.y, 96, 1.15);
            }
            alive = false;
            break;
          }

          if (hit.kind === 'prism') {
            triggerPrismSplit(hit.target, b);
            alive = false;
            break;
          }

          if (hit.kind === 'railing') {
            if (b.isHeavy || b.slingshotCharged || b.isPrismBeam) {
              breakRailing(hit.target, hit.x, hit.y, dx, dy);
              b.x += dx * 6;
              b.y += dy * 6;
              continue;
            }
            const broke = damageRailing(hit.target, b.damage, hit.x, hit.y, dx, dy);
            if (broke) {
              alive = false;
              break;
            }
            if (b.bouncesLeft > 0) {
              const dot = dx * hit.nx + dy * hit.ny;
              const rx = dx - 2 * dot * hit.nx;
              const ry = dy - 2 * dot * hit.ny;
              b.bouncesLeft--;
              b.bounceCount++;
              b.vx = rx * b.speed;
              b.vy = ry * b.speed;
              b.x += hit.nx * 2;
              b.y += hit.ny * 2;
              b.color = b.bouncedColor;
              b.trail.push({ x: b.x, y: b.y });
              if (CB.audio) CB.audio.playRicochet(b.bounceCount, false);
              continue;
            }
            alive = false;
            break;
          }

          if (hit.kind === 'chime') {
            ringChime(hit.target);
            if (b.bouncesLeft > 0) {
              const dot = dx * hit.nx + dy * hit.ny;
              const rx = dx - 2 * dot * hit.nx;
              const ry = dy - 2 * dot * hit.ny;
              b.bouncesLeft--;
              b.bounceCount++;
              b.vx = rx * b.speed;
              b.vy = ry * b.speed;
              b.x += hit.nx * 2;
              b.y += hit.ny * 2;
              b.color = b.bouncedColor;
              b.trail.push({ x: b.x, y: b.y });
            } else {
              alive = false;
            }
            continue;
          }

          if (hit.kind === 'sunflower_switch') {
            activateSunflowerSwitch(hit.target);
            alive = false;
            break;
          }

          if (hit.kind === 'destructible') {
            const targetProp = hit.target;
            const dmg = Math.round(b.damage * (b.bounceCount > 0 || b.slingshotCharged ? b.ricochetMult : 1));
            const wasBrokenBefore = targetProp.broken;

            // 台球木箱受击按轻弹/蓄力重弹精确传递台球冲量！
            if (targetProp.type === 'crate' && !targetProp.broken) {
              const impMag = (b.crateImpulse || 380) * (b.slingshotCharged ? 1.3 : 1.0);
              pushCrate(targetProp, dx * impMag, dy * impMag, true);
            }

            damageProp(targetProp, dmg, hit.x, hit.y);
            if (hasVortexCurio && !b.spawnedVortex) {
              b.spawnedVortex = true;
              spawnGravityVortex(hit.x, hit.y);
            }
            if (hasPocketCore && !wasBrokenBefore && targetProp.broken) {
              b.x += dx * 6;
              b.y += dy * 6;
              continue;
            }
            alive = false;
            break;
          }

          if (hit.kind === 'orrery' && hit.target) {
            hit.target.hitFlash = 1;
            hit.target.pulse = 1;
          }
          const isSuper = hit.target && (hit.target.type === 'eraser' || hit.target.type === 'bumper');
          if (isSuper && hit.target) hit.target.hitFlash = 1;

          if (hasVortexCurio && !b.spawnedVortex) {
            b.spawnedVortex = true;
            spawnGravityVortex(hit.x + hit.nx * 14, hit.y + hit.ny * 14);
          }

          if (b.bouncesLeft > 0 || isSuper) {
            const dot = dx * hit.nx + dy * hit.ny;
            const rx = dx - 2 * dot * hit.nx;
            const ry = dy - 2 * dot * hit.ny;
            if (isSuper) {
              b.speed = Math.min(1160, b.speed * 1.18);
              b.baseSpeed = b.speed;
              b.maxRange += 220;
            } else {
              b.bouncesLeft--;
            }
            b.bounceCount++;
            b.x += hit.nx * 1.6;
            b.y += hit.ny * 1.6;
            if (!b.isPrismBeam && !b.slingshotCharged) b.color = b.bouncedColor;

            if (hasSplitCurio && b.splitGen === 0 && b.bounceCount === 1) {
              const baseAng = Math.atan2(ry, rx);
              b.splitGen = 1;
              b.vx = Math.cos(baseAng - SPLIT_BOUNCE_SPREAD) * b.speed;
              b.vy = Math.sin(baseAng - SPLIT_BOUNCE_SPREAD) * b.speed;
              b.trail.push({ x: b.x, y: b.y });

              game.bullets.push({
                ...b,
                vx: Math.cos(baseAng + SPLIT_BOUNCE_SPREAD) * b.speed,
                vy: Math.sin(baseAng + SPLIT_BOUNCE_SPREAD) * b.speed,
                damage: Math.round(b.damage * 0.85),
                splitGen: 1,
                spawnedVortex: true,
                trail: [{ x: b.x, y: b.y }],
              });
              if (CB.audio) CB.audio.playSplitBounce();
              CB.player.spawnDust(hit.x, hit.y - 10, '#88e4ff', 8, 1.35);
            } else {
              b.vx = rx * b.speed;
              b.vy = ry * b.speed;
              b.trail.push({ x: b.x, y: b.y });
              if (CB.audio) CB.audio.playRicochet(b.bounceCount, isSuper);
            }

            CB.player.spawnDust(hit.x, hit.y - 10, isSuper ? '#ff9db2' : '#ffcf66', isSuper ? 9 : 6, 1.3);
            emitSoundRipple(hit.x, hit.y, isSuper ? 175 : 138, 'ricochet');
            if (hasStarJar && CB.guards && CB.guards.stunNearbyGuards) {
              CB.guards.stunNearbyGuards(hit.x, hit.y, 76, 0.85);
            }
            if (isSuper) {
              CB.player.spawnPopup(hit.x, hit.y - 26, '共鸣加速!', '#e06086');
            }
          } else {
            CB.player.spawnDust(hit.x, hit.y - 10, '#cde0d8', 5, 1.0);
            alive = false;
          }
        }

        if (b.traveled >= b.maxRange) alive = false;
      }

      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > (b.slingshotCharged ? 11 : 7)) b.trail.shift();

      if (!alive) {
        game.bullets.splice(i, 1);
      }
    }

    // 2. 更新可滑动台球木箱物理（滑行、露水低摩擦、木箱互撞、撞晕守卫）
    updateCrates(dt);

    // 3. 主题守卫弹幕更新（露水泡弹性反弹 / 星弧弹强烈受星轨仪引力弯曲 / 荆棘高速毒刺）
    for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
      const eb = game.enemyBullets[i];
      const gravMult = eb.gravityMult || 0.55;
      const grav = computeGravityAccel(eb.x, eb.y, 0, { applyLensHoming: false });
      if (grav.maxU > 0.01) {
        eb.vx += grav.ax * gravMult * dt;
        eb.vy += grav.ay * gravMult * dt;
        const s = Math.hypot(eb.vx, eb.vy) || 1;
        eb.vx = (eb.vx / s) * eb.speed;
        eb.vy = (eb.vy / s) * eb.speed;
      }

      const step = eb.speed * dt;
      const dx = eb.vx / (eb.speed || 1);
      const dy = eb.vy / (eb.speed || 1);
      const wallHit = raycastScene(eb.x, eb.y, dx, dy, step, {
        pad: eb.radius * 0.6,
        includeGuards: false,
        includeClosedGates: true,
      });

      eb.x = wallHit.x;
      eb.y = wallHit.y;
      eb.traveled += wallHit.dist;

      const pDist = Math.hypot(player.x - eb.x, player.y - eb.y);
      if (pDist < player.radius + eb.radius - 3 && player.dashTimer <= 0) {
        CB.player.damagePlayer(eb.damage, dx, dy);
        CB.player.spawnDust(eb.x, eb.y - 10, eb.color || '#e05848', 7, 1.2);
        game.enemyBullets.splice(i, 1);
        continue;
      }

      if (wallHit.hit) {
        if (wallHit.kind === 'destructible') {
          if (wallHit.target.type === 'crate') pushCrate(wallHit.target, dx * 95, dy * 95, false);
          damageProp(wallHit.target, 8, wallHit.x, wallHit.y);
          game.enemyBullets.splice(i, 1);
        } else if ((eb.bouncesLeft || 0) > 0) {
          const dot = dx * wallHit.nx + dy * wallHit.ny;
          eb.vx = (dx - 2 * dot * wallHit.nx) * eb.speed;
          eb.vy = (dy - 2 * dot * wallHit.ny) * eb.speed;
          eb.x += wallHit.nx * 2;
          eb.y += wallHit.ny * 2;
          eb.bouncesLeft--;
          CB.player.spawnDust(wallHit.x, wallHit.y - 10, eb.color || '#7ae8f7', 4, 0.8);
        } else {
          CB.player.spawnDust(wallHit.x, wallHit.y - 10, eb.color || '#c95c4b', 4, 0.9);
          game.enemyBullets.splice(i, 1);
        }
      } else if (eb.traveled >= eb.maxRange) {
        game.enemyBullets.splice(i, 1);
      }
    }

    // 4. 更新活跃引力漩涡
    updateVortices(dt);

    // 5. 声波涟漪扩散
    for (let i = game.ripples.length - 1; i >= 0; i--) {
      const r = game.ripples[i];
      r.radius += r.speed * dt;
      const progress = r.radius / r.maxRadius;
      r.alpha = Math.max(0, (1 - progress) * 0.8);
      if (r.radius >= r.maxRadius) game.ripples.splice(i, 1);
    }

    // 6. 地面秘露减速池更新
    for (let i = game.inkPuddles.length - 1; i >= 0; i--) {
      const ink = game.inkPuddles[i];
      ink.grow = Math.min(1, ink.grow + dt * 5.2);
      ink.life -= dt;
      if (ink.life <= 0) game.inkPuddles.splice(i, 1);
    }

    // 7. 金色花粉隐身雾更新
    for (let i = game.pollenClouds.length - 1; i >= 0; i--) {
      const pc = game.pollenClouds[i];
      pc.grow = Math.min(1, pc.grow + dt * 4.4);
      pc.life -= dt;
      if (pc.life <= 0) game.pollenClouds.splice(i, 1);
    }

    // 8. 掉落金币弹跳与主角拾取
    if (game.coinComboTimer > 0) {
      game.coinComboTimer -= dt;
      if (game.coinComboTimer <= 0) game.coinCombo = 0;
    }

    for (let i = game.coinsList.length - 1; i >= 0; i--) {
      const c = game.coinsList[i];
      c.age += dt;
      c.spin += dt * 7;
      if (c.pickupDelay > 0) c.pickupDelay -= dt;

      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vx *= Math.exp(-5.5 * dt);
      c.vy *= Math.exp(-5.5 * dt);

      if (c.z > 0 || c.vz > 0) {
        c.z += c.vz * dt;
        c.vz -= 520 * dt;
        if (c.z <= 0) {
          c.z = 0;
          c.vz = Math.abs(c.vz) > 45 ? Math.abs(c.vz) * 0.42 : 0;
        }
      }

      if (map) {
        for (const w of map.walls) {
          const cx = Math.max(w.x, Math.min(c.x, w.x + w.w));
          const cy = Math.max(w.y, Math.min(c.y, w.y + w.h));
          const dx = c.x - cx;
          const dy = c.y - cy;
          const d = Math.hypot(dx, dy);
          if (d < 8 && d > 0.001) {
            c.x += (dx / d) * (8 - d);
            c.y += (dy / d) * (8 - d);
            c.vx *= -0.4;
            c.vy *= -0.4;
          }
        }
        if (map.cliffEdges) {
          for (const edge of map.cliffEdges) {
            const cx = Math.max(edge.x, Math.min(c.x, edge.x + edge.w));
            const cy = Math.max(edge.y, Math.min(c.y, edge.y + edge.h));
            const d = Math.hypot(c.x - cx, c.y - cy);
            if (d < 14) {
              c.x -= edge.outwardX * (16 - d);
              c.y -= edge.outwardY * (16 - d);
              const vn = c.vx * edge.outwardX + c.vy * edge.outwardY;
              if (vn > 0) {
                c.vx -= edge.outwardX * vn * 1.4;
                c.vy -= edge.outwardY * vn * 1.4;
              }
            }
          }
        }
      }

      if (c.pickupDelay <= 0) {
        const coinPullR = (CB.extraction && CB.extraction.getMetaBonuses) ? CB.extraction.getMetaBonuses().coinPickupR : 68;
        const dist = Math.hypot(player.x - c.x, player.y - c.y);
        if (dist < coinPullR) {
          const pull = (1 - dist / coinPullR) * 340 + 135;
          c.x += ((player.x - c.x) / (dist || 1)) * pull * dt;
          c.y += ((player.y - c.y) / (dist || 1)) * pull * dt;
        }
        if (dist < player.radius + 7) {
          player.coins += c.value;
          player.lootCount = Math.min(20, Math.floor(player.coins / 3) + 2);
          if (CB.audio) CB.audio.playCoin(game.coinCombo);
          game.coinCombo = Math.min(10, game.coinCombo + 1);
          game.coinComboTimer = 0.85;
          CB.player.spawnDust(c.x, c.y - 6, '#ffe066', 4, 0.8);
          game.coinsList.splice(i, 1);
        }
      }
    }
  }

  CB.combat = {
    LAUNCHER,
    getDewSlideAt,
    pushCrate,
    raycastScene,
    computeGravityAccel,
    computeAimPreview,
    emitSoundRipple,
    spawnGravityVortex,
    fireLauncher,
    damageProp,
    breakRailing,
    damageRailing,
    ringChime,
    activateSunflowerSwitch,
    spawnInkPuddle,
    getInkAt,
    spawnPollenCloud,
    isInPollen,
    rustleGrassAt,
    spawnCoins,
    updateCombat,
  };
})();
