(() => {
  const CB = (window.CB = window.CB || {});
  const game = CB.game;
  const chargedBodiesPool = [];

  function hasCurio(id) {
    return !!(CB.extraction && CB.extraction.hasCurio && CB.extraction.hasCurio(id));
  }

  function hasSynergy(discId) {
    return !!(CB.extraction && CB.extraction.hasSynergy && CB.extraction.hasSynergy(discId));
  }

  function getInk() {
    const pal = game.map && game.map.stage && game.map.stage.palette;
    return (pal && pal.ink) || '#2d4b52';
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const lenSq = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / lenSq));
    const cx = x1 + vx * t;
    const cy = y1 + vy * t;
    return { dist: Math.hypot(px - cx, py - cy), cx, cy, t };
  }

  // ==================== 一、热学：三态相变（冰 → 导电水 → 隐身浮力汽）与热膨胀高压罐 ====================
  function getSlidePhase(slide) {
    return (slide && slide.phase) || 'ice';
  }

  function getSurfaceStateAt(x, y) {
    const map = game.map;
    if (!map || !map.dewSlides) return { slide: null, phase: 'stone' };
    for (let i = 0; i < map.dewSlides.length; i++) {
      const s = map.dewSlides[i];
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
        return { slide: s, phase: s.phase || 'ice' };
      }
    }
    return { slide: null, phase: 'stone' };
  }

  function isInSteam(x, y) {
    const st = getSurfaceStateAt(x, y);
    return st.phase === 'steam';
  }

  function heatSlide(slide, deltaHeat) {
    if (!slide) return;
    const mult = hasCurio('thermo_valve') ? 1.45 : 1.0;
    const prevPhase = slide.phase || 'ice';
    slide.heat = Math.max(0, Math.min(100, (slide.heat || 0) + deltaHeat * mult));
    slide.coolDelay = 3.2;

    if (slide.heat >= 72) slide.phase = 'steam';
    else if (slide.heat >= 34) slide.phase = 'water';
    else slide.phase = 'ice';

    if (slide.phase !== prevPhase) {
      const cx = slide.x + slide.w * 0.5;
      const cy = slide.y + slide.h * 0.5;
      if (slide.phase === 'water' && prevPhase === 'ice') {
        if (CB.audio && CB.audio.playPhaseShift) CB.audio.playPhaseShift('water');
        CB.player.spawnDust(cx, cy - 6, '#74d6f5', 10, 1.3);
        CB.player.spawnPopup(cx, cy - 22, '💧 冰融导电积水!', '#248db8');
      } else if (slide.phase === 'steam') {
        if (CB.audio && CB.audio.playPhaseShift) CB.audio.playPhaseShift('steam');
        CB.player.spawnDust(cx, cy - 10, '#ffffff', 14, 1.5);
        CB.player.spawnPopup(cx, cy - 26, '♨️ 沸腾蒸汽 · 隐身浮空!', '#529eb0');
      }
    }
  }

  function applyHeatAt(x, y, radius, amount) {
    const map = game.map;
    if (!map) return;

    // 1. 加热冰镜滑道触发三态相变
    if (map.dewSlides) {
      for (const s of map.dewSlides) {
        const nx = Math.max(s.x, Math.min(x, s.x + s.w));
        const ny = Math.max(s.y, Math.min(y, s.y + s.h));
        if (Math.hypot(x - nx, y - ny) <= radius + 12) {
          heatSlide(s, amount);
        }
      }
    }

    // 2. 加热密封热膨胀高压罐
    if (map.props) {
      for (const prop of map.props) {
        if (prop.broken || prop.type !== 'pressure_can') continue;
        if (Math.hypot(prop.x - x, prop.y - y) <= radius + prop.r + 10) {
          heatPressureCan(prop, amount, false);
        }
      }
    }

    // 3. 加热融化霜壳蜗卫的冰晶硬壳（冰→水！）
    if (CB.guards && CB.guards.meltFrostShell) {
      for (const g of game.guards) {
        if (g.dead || !g.hasFrostShell) continue;
        if (Math.hypot(g.x - x, g.y - y) <= radius + g.radius + 14) {
          CB.guards.meltFrostShell(g, amount);
        }
      }
    }
  }

  function heatPressureCan(can, deltaHeat, isHeavy = false) {
    if (!can || can.broken || can.type !== 'pressure_can') return;
    const mult = hasCurio('thermo_valve') ? 1.45 : 1.0;
    can.heat = Math.min(100, (can.heat || 0) + deltaHeat * mult);
    can.hitFlash = 0.85;
    can.wobble = 1;
    can.coolDelay = 2.6;

    if (can.heat >= 100 || (isHeavy && can.heat >= 54)) {
      explodePressureCan(can);
    } else if (CB.audio && CB.audio.playThermalHiss) {
      CB.audio.playThermalHiss(can.heat / 100);
    }
  }

  function explodePressureCan(can) {
    if (!can || can.broken) return;
    can.broken = true;
    const radMult = hasCurio('thermo_valve') ? 1.30 : 1.0;
    const R = 188 * radMult;
    const cx = can.x;
    const cy = can.y;

    if (CB.audio && CB.audio.playThermalBlast) CB.audio.playThermalBlast();
    if (CB.extraction && CB.extraction.recordDailyLabTrigger) CB.extraction.recordDailyLabTrigger();
    game.hitStop = Math.max(game.hitStop, 0.048);
    game.camera.shake = Math.max(game.camera.shake, 8.8);
    CB.player.spawnDust(cx, cy - 10, '#ff8648', 22, 1.9);
    CB.player.spawnDust(cx, cy - 10, '#ffe478', 16, 1.7);
    CB.player.spawnDust(cx, cy - 10, '#ffffff', 12, 1.55);
    if (CB.combat && CB.combat.emitSoundRipple) CB.combat.emitSoundRipple(cx, cy, 290, 'slam', '#ff7a3c');

    // 连锁加热周边冰道与邻近高压罐！
    applyHeatAt(cx, cy, R * 0.9, 55);

    let hitCount = 0;
    for (const g of game.guards) {
      if (g.dead) continue;
      const dx = g.x - cx;
      const dy = g.y - cy;
      const d = Math.hypot(dx, dy);
      if (d <= R + g.radius) {
        hitCount++;
        const nx = d > 1 ? dx / d : 1;
        const ny = d > 1 ? dy / d : 0;
        const dmg = Math.round(44 * (1.15 - (d / (R + 40)) * 0.4));
        if (CB.guards && CB.guards.damageGuard) {
          CB.guards.damageGuard(g, dmg, nx, ny, true, '🔥 热膨胀爆破!', true, {
            source: 'billiard',
            isHeavy: true,
            thermal: true,
            launchSpeed: 740,
            relGamma: 1.62,
          });
        }
      }
    }

    // 冲击波同步掀飞周边木箱！
    if (game.map && game.map.props) {
      for (const prop of game.map.props) {
        if (prop.broken || prop.type !== 'crate') continue;
        const px = prop.x + prop.w / 2;
        const py = prop.y + prop.h / 2;
        const dx = px - cx;
        const dy = py - cy;
        const d = Math.hypot(dx, dy);
        if (d <= R + 24 && d > 1 && CB.combat && CB.combat.pushCrate) {
          CB.combat.pushCrate(prop, (dx / d) * 680, (dy / d) * 680, false);
        }
      }
    }

    if (CB.combat && CB.combat.spawnCoins) CB.combat.spawnCoins(cx, cy, 4);
    if (hitCount > 0) {
      if (CB.extraction && CB.extraction.addStuntBounty) CB.extraction.addStuntBounty(22 * hitCount);
      if (CB.combat && CB.combat.grantOrbRefund) CB.combat.grantOrbRefund(1, cx, cy, '热爆回珠');
      CB.player.spawnPopup(cx, cy - 36, `🔥 高压热爆 ×${hitCount}!`, '#e05626');
    } else {
      CB.player.spawnPopup(cx, cy - 32, '🔥 高压罐爆裂!', '#e05626');
    }
  }

  // ==================== 二、光学：凸透镜聚光灼烧（光→热）与镜面光网 ====================
  function triggerConvexLens(lens, bullet) {
    if (!lens || lens.type !== 'convex_lens') return;
    lens.hitFlash = 1;
    lens.pulse = 1;

    // 聚光焦点沿透镜法向聚焦（若子弹射入则偏向前进侧）
    const bAng = bullet ? Math.atan2(bullet.vy, bullet.vx) : lens.angle;
    const dot = Math.cos(bAng) * Math.cos(lens.angle) + Math.sin(bAng) * Math.sin(lens.angle);
    const outAng = dot >= 0 ? lens.angle : lens.angle + Math.PI;
    const focalDist = lens.focalDist || 124;
    let fx = lens.x + Math.cos(outAng) * focalDist;
    let fy = lens.y + Math.sin(outAng) * focalDist;

    if (CB.combat && CB.combat.raycastScene) {
      const ray = CB.combat.raycastScene(lens.x + Math.cos(outAng) * (lens.r + 2), lens.y + Math.sin(outAng) * (lens.r + 2), Math.cos(outAng), Math.sin(outAng), focalDist, {
        pad: 2,
        includeGuards: false,
        includeDestructibles: false,
        includeClosedGates: true,
      });
      if (ray.hit) {
        fx = ray.x - Math.cos(outAng) * 8;
        fy = ray.y - Math.sin(outAng) * 8;
      }
    }

    const dur = 4.4 + (hasCurio('mirror_prism') ? 1.8 : 0);
    // 复用同一透镜的现有焦斑或新建
    let existing = game.focusSpots.find((fs) => fs.lensId === lens.id);
    if (existing) {
      existing.x = fx;
      existing.y = fy;
      existing.life = dur;
      existing.maxLife = dur;
      existing.lx = lens.x;
      existing.ly = lens.y;
    } else {
      game.focusSpots.push({
        lensId: lens.id,
        lx: lens.x,
        ly: lens.y,
        x: fx,
        y: fy,
        radius: hasSynergy('optics') ? 60 : 48,
        life: dur,
        maxLife: dur,
        tickTimer: 0,
        refunded: false,
      });
    }

    if (CB.audio && CB.audio.playFocusBeam) CB.audio.playFocusBeam();
    if (CB.extraction && CB.extraction.recordDailyLabTrigger) CB.extraction.recordDailyLabTrigger();
    CB.player.spawnDust(fx, fy - 8, '#ffe66d', 12, 1.45);
    CB.player.spawnPopup(fx, fy - 30, '🔆 凸透镜聚光灼烧!', '#d98814');
    applyHeatAt(fx, fy, 58, 36);
  }

  function triggerMirrorPost(mirror, bullet) {
    if (!mirror || mirror.type !== 'mirror_post') return;
    mirror.hitFlash = 1;
    mirror.pulse = 1;

    const map = game.map;
    if (!map || !map.props) return;

    // 寻找同房或近距的配对镜柱建立「往返镜面光网」！
    let partner = null;
    let bestD = 380;
    for (const p of map.props) {
      if (p === mirror || p.broken || p.type !== 'mirror_post') continue;
      if (mirror.pairId && p.pairId === mirror.pairId) {
        partner = p;
        break;
      }
      const d = Math.hypot(p.x - mirror.x, p.y - mirror.y);
      if (d < bestD) {
        bestD = d;
        partner = p;
      }
    }

    if (!partner) return false;
    partner.pulse = 1;
    partner.hitFlash = 0.85;

    const dur = 5.5 + (hasCurio('mirror_prism') ? 2.5 : 0);
    const webKey = [mirror.id, partner.id].sort().join('|');
    let existing = game.laserWebs.find((w) => w.key === webKey);
    if (existing) {
      existing.life = dur;
      existing.maxLife = dur;
    } else {
      game.laserWebs.push({
        key: webKey,
        x1: mirror.x,
        y1: mirror.y,
        x2: partner.x,
        y2: partner.y,
        life: dur,
        maxLife: dur,
        hitCd: {},
      });
    }

    if (CB.audio && CB.audio.playLaserWeb) CB.audio.playLaserWeb();
    if (CB.extraction && CB.extraction.recordDailyLabTrigger) CB.extraction.recordDailyLabTrigger();
    CB.player.spawnDust((mirror.x + partner.x) * 0.5, (mirror.y + partner.y) * 0.5 - 10, '#ffe875', 14, 1.5);
    CB.player.spawnPopup((mirror.x + partner.x) * 0.5, (mirror.y + partner.y) * 0.5 - 28, '🪞 镜面光网已织成!', '#d49014');

    if (bullet && bullet.isHeavy && !bullet.orbHandled && CB.combat && CB.combat.grantOrbRefund) {
      bullet.orbHandled = true;
      CB.combat.grantOrbRefund(1, mirror.x, mirror.y, '光网回珠');
    }
    return true;
  }

  // ==================== 三、电学：水域导电链（水→电）与正负电荷库仑力 ====================
  function applyElectroCharge(entity, sign, dur = 7.5) {
    if (!entity) return;
    entity.chargeSign = sign >= 0 ? 1 : -1;
    entity.chargeTimer = Math.max(entity.chargeTimer || 0, dur);
  }

  function spawnLightningArc(x1, y1, x2, y2, sign = 1) {
    const pts = [];
    const segs = 6;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 0; i <= segs; i++) {
      const f = i / segs;
      const jitter = (i === 0 || i === segs) ? 0 : (Math.random() - 0.5) * Math.min(26, len * 0.16);
      pts.push({ x: x1 + dx * f + nx * jitter, y: y1 + dy * f + ny * jitter });
    }
    if (game.lightningArcs.length >= 24) game.lightningArcs.shift();
    game.lightningArcs.push({
      pts,
      life: 0.34,
      maxLife: 0.34,
      color: sign >= 0 ? '#ff8570' : '#68e2ff',
    });
  }

  function triggerChargePylon(pylon, bullet) {
    if (!pylon || pylon.type !== 'charge_pylon') return;
    pylon.hitFlash = 1;
    pylon.pulse = 1;
    const sign = pylon.chargeSign >= 0 ? 1 : -1;
    const jumpMult = hasCurio('faraday_coil') ? 1.40 : 1.0;
    const baseR = 205 * jumpMult;

    if (CB.audio && CB.audio.playElectroChain) CB.audio.playElectroChain();
    if (CB.extraction && CB.extraction.recordDailyLabTrigger) CB.extraction.recordDailyLabTrigger();
    CB.player.spawnDust(pylon.x, pylon.y - 12, sign > 0 ? '#ff826e' : '#68e4ff', 14, 1.5);

    const shockedGuards = new Set();
    const conductivePools = [];

    // 1. 检测周边可导电水域（已融化成 'water' 的滑道 + 地面秘露水池）
    if (game.map && game.map.dewSlides) {
      for (const s of game.map.dewSlides) {
        if (s.phase !== 'water') continue;
        const nx = Math.max(s.x, Math.min(pylon.x, s.x + s.w));
        const ny = Math.max(s.y, Math.min(pylon.y, s.y + s.h));
        if (Math.hypot(pylon.x - nx, pylon.y - ny) <= baseR) {
          conductivePools.push({ kind: 'slide', obj: s, cx: s.x + s.w * 0.5, cy: s.y + s.h * 0.5 });
          spawnLightningArc(pylon.x, pylon.y - 14, nx, ny - 6, sign);
          s.electrifiedTimer = 1.4;
        }
      }
    }
    if (game.inkPuddles) {
      for (const ink of game.inkPuddles) {
        if (Math.hypot(pylon.x - ink.x, pylon.y - ink.y) <= baseR + ink.radius) {
          conductivePools.push({ kind: 'ink', obj: ink, cx: ink.x, cy: ink.y });
          spawnLightningArc(pylon.x, pylon.y - 14, ink.x, ink.y - 4, sign);
        }
      }
    }

    const shockGuard = (g, fromX, fromY, viaWater) => {
      if (g.dead || shockedGuards.has(g.id)) return;
      shockedGuards.add(g.id);
      applyElectroCharge(g, sign, 7.8);
      spawnLightningArc(fromX, fromY - 12, g.x, g.y - 12, sign);
      const dmg = viaWater ? 26 : 16;
      if (CB.guards && CB.guards.damageGuard) {
        CB.guards.damageGuard(g, dmg, 0, 0, true, viaWater ? '⚡ 水域导电麻痹!' : (sign > 0 ? '⚡ 带正电 (+)' : '⚡ 带负电 (-)'), true, {
          source: 'bullet',
          isHeavy: false,
          electro: true,
          slingshot: viaWater,
        });
      }
      if (!g.dead) {
        g.aiState = 'stunned';
        g.stateTimer = Math.max(g.stateTimer || 0, viaWater ? 2.1 : 1.15);
        if (viaWater) g.armorBrokenTimer = Math.max(g.armorBrokenTimer || 0, 4.2);
      }
    };

    // 2. 直接电击桩周守卫 & 给周边木箱涂装电荷！
    for (const g of game.guards) {
      if (g.dead) continue;
      if (Math.hypot(g.x - pylon.x, g.y - pylon.y) <= baseR) {
        shockGuard(g, pylon.x, pylon.y, false);
      }
    }
    if (game.map && game.map.props) {
      for (const p of game.map.props) {
        if (p.broken || p.type !== 'crate') continue;
        const cx = p.x + p.w * 0.5;
        const cy = p.y + p.h * 0.5;
        if (Math.hypot(cx - pylon.x, cy - pylon.y) <= baseR) {
          applyElectroCharge(p, sign, 8.5);
          spawnLightningArc(pylon.x, pylon.y - 14, cx, cy - 10, sign);
        }
      }
    }

    // 3. 水域导电连锁跳电：整片积水上的所有守卫与临近目标瞬间麻痹破甲！
    let waterChainHits = 0;
    for (const pool of conductivePools) {
      for (const g of game.guards) {
        if (g.dead || shockedGuards.has(g.id)) continue;
        let inOrNear = false;
        if (pool.kind === 'slide') {
          const s = pool.obj;
          const nx = Math.max(s.x, Math.min(g.x, s.x + s.w));
          const ny = Math.max(s.y, Math.min(g.y, s.y + s.h));
          inOrNear = Math.hypot(g.x - nx, g.y - ny) <= 84 * jumpMult;
        } else {
          inOrNear = Math.hypot(g.x - pool.cx, g.y - pool.cy) <= (pool.obj.radius + 78) * jumpMult;
        }
        if (inOrNear) {
          waterChainHits++;
          shockGuard(g, pool.cx, pool.cy, true);
        }
      }
    }

    // 4. 守卫之间金属链跳电（最多连锁 1 跳）
    const firstWave = game.guards.filter((g) => !g.dead && shockedGuards.has(g.id));
    for (const srcG of firstWave) {
      for (const other of game.guards) {
        if (other.dead || shockedGuards.has(other.id)) continue;
        if (Math.hypot(other.x - srcG.x, other.y - srcG.y) <= 155 * jumpMult) {
          shockGuard(other, srcG.x, srcG.y, waterChainHits > 0);
        }
      }
    }

    if (shockedGuards.size > 0) {
      const bounty = waterChainHits > 0 ? 18 * shockedGuards.size : 10 * shockedGuards.size;
      if (CB.extraction && CB.extraction.addStuntBounty) CB.extraction.addStuntBounty(bounty);
      if (bullet && !bullet.orbHandled && CB.combat && CB.combat.grantOrbRefund) {
        bullet.orbHandled = true;
        CB.combat.grantOrbRefund(1, pylon.x, pylon.y, waterChainHits > 0 ? '水电回珠' : '电荷回珠');
      }
      if (waterChainHits > 0) {
        CB.player.spawnPopup(pylon.x, pylon.y - 38, `⚡ 水域导电链 ×${shockedGuards.size}!`, '#1d9cd4');
      }
    }
  }

  // ==================== 四、每帧统一物理实验室更新 ====================

  // ==================== v9.6b 学科羁绊共鸣：疾电弧步 & 微型时间膨胀泡 ====================
  function triggerDashElectroArc(x1, y1, x2, y2) {
    const sign = (Math.floor(game.time * 2) % 2 === 0) ? 1 : -1;
    spawnLightningArc(x1, y1 - 10, x2, y2 - 10, sign);
    if (CB.audio && CB.audio.playElectroChain) CB.audio.playElectroChain();

    const shocked = new Set();
    const hitGuard = (g, fromX, fromY, viaWater) => {
      if (g.dead || shocked.has(g.id)) return;
      shocked.add(g.id);
      applyElectroCharge(g, sign, 7.5);
      spawnLightningArc(fromX, fromY - 12, g.x, g.y - 12, sign);
      if (CB.guards && CB.guards.damageGuard) {
        CB.guards.damageGuard(g, viaWater ? 24 : 15, 0, 0, true, viaWater ? '⚡ 弧步导电链!' : '⚡ 疾电弧步!', true, {
          source: 'bullet',
          electro: true,
          slingshot: viaWater,
        });
      }
      if (!g.dead) {
        g.aiState = 'stunned';
        g.stateTimer = Math.max(g.stateTimer || 0, viaWater ? 1.85 : 1.0);
        if (viaWater) g.armorBrokenTimer = Math.max(g.armorBrokenTimer || 0, 3.8);
      }
    };

    for (const g of game.guards) {
      if (g.dead) continue;
      const seg = distToSegment(g.x, g.y, x1, y1, x2, y2);
      if (seg.dist <= g.radius + 54) {
        hitGuard(g, seg.cx, seg.cy, false);
      }
    }

    const mx = (x1 + x2) * 0.5;
    const my = (y1 + y2) * 0.5;
    let poolHits = 0;
    if (game.map && game.map.dewSlides) {
      for (const s of game.map.dewSlides) {
        if (s.phase !== 'water') continue;
        const nx = Math.max(s.x, Math.min(mx, s.x + s.w));
        const ny = Math.max(s.y, Math.min(my, s.y + s.h));
        if (Math.hypot(mx - nx, my - ny) <= 64 || Math.hypot(x2 - nx, y2 - ny) <= 44) {
          s.electrifiedTimer = 1.4;
          for (const g of game.guards) {
            if (g.dead || shocked.has(g.id)) continue;
            const gnx = Math.max(s.x, Math.min(g.x, s.x + s.w));
            const gny = Math.max(s.y, Math.min(g.y, s.y + s.h));
            if (Math.hypot(g.x - gnx, g.y - gny) <= 88) {
              poolHits++;
              hitGuard(g, gnx, gny, true);
            }
          }
        }
      }
    }
    if (game.inkPuddles) {
      for (const ink of game.inkPuddles) {
        if (distToSegment(ink.x, ink.y, x1, y1, x2, y2).dist <= ink.radius + 26) {
          for (const g of game.guards) {
            if (g.dead || shocked.has(g.id)) continue;
            if (Math.hypot(g.x - ink.x, g.y - ink.y) <= ink.radius + 82) {
              poolHits++;
              hitGuard(g, ink.x, ink.y, true);
            }
          }
        }
      }
    }

    if (shocked.size > 0 && CB.extraction && CB.extraction.addStuntBounty) {
      CB.extraction.addStuntBounty(poolHits > 0 ? 18 : 10);
      if (poolHits > 0 && CB.combat && CB.combat.grantOrbRefund) {
        CB.combat.grantOrbRefund(1, mx, my, '电步回珠');
      }
    }
  }

  function spawnMiniDilationBubble(x, y) {
    if (!game.dilationBubbles) game.dilationBubbles = [];
    if (game.dilationBubbles.length >= 3) game.dilationBubbles.shift();
    const dur = 1.6 + (hasCurio('event_horizon') ? 0.6 : 0);
    game.dilationBubbles.push({
      x,
      y,
      fieldRadius: 118,
      activeTimer: dur,
      maxDuration: dur,
      isMiniBubble: true,
    });
    if (CB.audio && CB.audio.playSingularityDilate) CB.audio.playSingularityDilate();
    CB.player.spawnDust(x, y - 10, '#c090ff', 10, 1.35);
    CB.player.spawnPopup(x, y - 34, '🕳️ 微型时间膨胀泡!', '#884ee0');
  }

  function updatePhysicsLab(dt) {
    const map = game.map;
    if (!map) return;

    // 1. 露水滑道三态相变自然冷却 + 沸腾蒸汽浮力升举效果！
    if (map.dewSlides) {
      for (const s of map.dewSlides) {
        if ((s.electrifiedTimer || 0) > 0) s.electrifiedTimer = Math.max(0, s.electrifiedTimer - dt);
        if ((s.coolDelay || 0) > 0) {
          s.coolDelay -= dt;
        } else if ((s.heat || 0) > 0) {
          s.heat = Math.max(0, s.heat - dt * 5.2);
          if (s.heat >= 72) s.phase = 'steam';
          else if (s.heat >= 34) s.phase = 'water';
          else s.phase = 'ice';
        }

        // 蒸汽态：持续上浮气浪（守卫在蒸汽中浮空失重且略微向外飘移）
        if (s.phase === 'steam') {
          if (Math.random() < dt * 7) {
            CB.player.spawnDust(s.x + Math.random() * s.w, s.y + Math.random() * s.h, '#ffffff', 1, 1.05);
          }
          for (const g of game.guards) {
            if (g.dead) continue;
            if (g.x >= s.x && g.x <= s.x + s.w && g.y >= s.y && g.y <= s.y + s.h) {
              g.steamFloat = Math.min(1, (g.steamFloat || 0) + dt * 4);
              g.hopZ = Math.max(g.hopZ || 0, 12 + Math.sin(game.time * 8 + g.x) * 4);
              if (g.hasFrostShell && (g.meltedWetTimer || 0) <= 0 && CB.guards && CB.guards.meltFrostShell) {
                CB.guards.meltFrostShell(g, dt * 45);
              }
            }
          }
        }
      }
    }

    // 2. 更新新增场景道具动画（高压罐、凸透镜、镜柱、电荷桩）
    if (map.props) {
      for (const prop of map.props) {
        if (prop.broken) continue;
        if (prop.pulse > 0) prop.pulse = Math.max(0, prop.pulse - dt * 3.2);
        if (prop.type === 'pressure_can') {
          if ((prop.coolDelay || 0) > 0) prop.coolDelay -= dt;
          else if ((prop.heat || 0) > 0) prop.heat = Math.max(0, prop.heat - dt * 7);
          if ((prop.heat || 0) > 55 && Math.random() < dt * 10) {
            CB.player.spawnDust(prop.x, prop.y - 24, '#ff9e66', 1, 0.9);
          }
        } else if (prop.type === 'charge_pylon') {
          // 守卫或高速木箱贴近电荷桩时自动涂装对应电荷！
          const sign = prop.chargeSign >= 0 ? 1 : -1;
          for (const g of game.guards) {
            if (g.dead) continue;
            if (Math.hypot(g.x - prop.x, g.y - prop.y) < prop.r + g.radius + 26) {
              applyElectroCharge(g, sign, 7.5);
            }
          }
          for (const cr of map.props) {
            if (cr.broken || cr.type !== 'crate') continue;
            const cx = cr.x + cr.w * 0.5;
            const cy = cr.y + cr.h * 0.5;
            if (Math.hypot(cx - prop.x, cy - prop.y) < prop.r + 42) {
              applyElectroCharge(cr, sign, 8.0);
            }
          }
        }
      }
    }

    // 3. 更新凸透镜聚光灼烧焦斑（光 → 热 持续融冰、引爆高压罐、灼穿守卫护甲！）
    const optMult = hasCurio('mirror_prism') ? 1.35 : 1.0;
    for (let i = game.focusSpots.length - 1; i >= 0; i--) {
      const fs = game.focusSpots[i];
      fs.life -= dt;
      if (fs.life <= 0) {
        game.focusSpots.splice(i, 1);
        continue;
      }
      fs.tickTimer -= dt;
      if (fs.tickTimer <= 0) {
        fs.tickTimer = 0.28;
        applyHeatAt(fs.x, fs.y, fs.radius + 10, 18);
        CB.player.spawnDust(fs.x + (Math.random() - 0.5) * 26, fs.y - 6, '#ffe066', 2, 0.85);

        for (const g of game.guards) {
          if (g.dead) continue;
          if (Math.hypot(g.x - fs.x, g.y - fs.y) <= fs.radius + g.radius) {
            const brokeArmor = g.armorBrokenTimer <= 0 && (g.hasFrontShield || g.hasStarMembrane || g.hasThornShell || g.hasColossusArmor);
            if (brokeArmor) {
              g.armorBrokenTimer = 5.0;
              g.shellClosed = false;
              if (CB.audio && CB.audio.playShieldBreak) CB.audio.playShieldBreak();
              CB.player.spawnPopup(g.x, g.y - g.radius - 26, '🔆 聚光灼穿护甲!', '#e69214');
              if (!fs.refunded && CB.combat && CB.combat.grantOrbRefund) {
                fs.refunded = true;
                CB.combat.grantOrbRefund(1, fs.x, fs.y, '聚光回珠');
              }
            }
            if (CB.guards && CB.guards.damageGuard) {
              CB.guards.damageGuard(g, Math.round(11 * optMult), 0, 0, true, null, true, {
                source: 'bullet',
                prism: true,
              });
            }
          }
        }
      }
    }

    // 4. 更新镜面光网切割判定（把守卫撞进往返光网即触发高额切割与回珠！）
    for (let i = game.laserWebs.length - 1; i >= 0; i--) {
      const w = game.laserWebs[i];
      w.life -= dt;
      if (w.life <= 0) {
        game.laserWebs.splice(i, 1);
        continue;
      }
      for (const k in w.hitCd) {
        w.hitCd[k] -= dt;
        if (w.hitCd[k] <= 0) delete w.hitCd[k];
      }

      for (const g of game.guards) {
        if (g.dead || (w.hitCd[g.id] || 0) > 0) continue;
        const seg = distToSegment(g.x, g.y, w.x1, w.y1, w.x2, w.y2);
        if (seg.dist <= g.radius + 8) {
          w.hitCd[g.id] = 0.55;
          const cutDmg = Math.round((g.billiardMode ? 36 : 22) * optMult);
          const nx = (g.x - seg.cx) / (seg.dist || 1);
          const ny = (g.y - seg.cy) / (seg.dist || 1);
          g.armorBrokenTimer = Math.max(g.armorBrokenTimer || 0, 4.4);
          if (CB.guards && CB.guards.damageGuard) {
            CB.guards.damageGuard(g, cutDmg, nx, ny, true, '🪞 镜面光网切割!', true, {
              source: 'bullet',
              prism: true,
              laserWeb: true,
              isHeavy: true,
            });
          }
          if (CB.audio && CB.audio.playLaserSlice) CB.audio.playLaserSlice();
          CB.player.spawnDust(seg.cx, seg.cy - 10, '#ffe878', 11, 1.45);
          if (CB.extraction && CB.extraction.addStuntBounty) CB.extraction.addStuntBounty(18);
          if (CB.combat && CB.combat.grantOrbRefund) CB.combat.grantOrbRefund(1, seg.cx, seg.cy, '光网回珠');
        }
      }
    }

    // 5. 更新正负电荷计时与库仑力相互作用（复用模块数组零 GC 分配！）
    chargedBodiesPool.length = 0;
    const chargedBodies = chargedBodiesPool;
    for (const g of game.guards) {
      if (g.dead) continue;
      if ((g.chargeTimer || 0) > 0) {
        g.chargeTimer -= dt;
        if (g.chargeTimer <= 0) g.chargeSign = 0;
      }
      if ((g.coulombCd || 0) > 0) g.coulombCd = Math.max(0, g.coulombCd - dt);
      if (g.chargeSign) {
        chargedBodies.push({ kind: 'guard', ref: g, x: g.x, y: g.y, r: g.radius, sign: g.chargeSign });
      }
    }
    if (map.props) {
      for (const p of map.props) {
        if (p.broken || p.type !== 'crate') continue;
        if ((p.chargeTimer || 0) > 0) {
          p.chargeTimer -= dt;
          if (p.chargeTimer <= 0) p.chargeSign = 0;
        }
        if ((p.coulombCd || 0) > 0) p.coulombCd = Math.max(0, p.coulombCd - dt);
        if (p.chargeSign) {
          chargedBodies.push({ kind: 'crate', ref: p, x: p.x + p.w * 0.5, y: p.y + p.h * 0.5, r: 22, sign: p.chargeSign });
        }
      }
    }

    const coulombMult = hasCurio('faraday_coil') ? 1.35 : 1.0;
    for (let i = 0; i < chargedBodies.length; i++) {
      for (let j = i + 1; j < chargedBodies.length; j++) {
        const a = chargedBodies[i];
        const b = chargedBodies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d < 4 || d > 235) continue;
        const nx = dx / d;
        const ny = dy / d;
        const samePole = a.sign === b.sign;

        if (samePole && d < 122) {
          // 同极相斥：近距猛烈库仑爆斥，双向直接进入台球弹飞态（极易推落云海！）
          if ((a.ref.coulombCd || 0) <= 0 && (b.ref.coulombCd || 0) <= 0) {
            a.ref.coulombCd = 0.95;
            b.ref.coulombCd = 0.95;
            const repelSpd = 610 * coulombMult;
            if (a.kind === 'guard' && CB.guards && CB.guards.launchGuardBilliard) {
              CB.guards.launchGuardBilliard(a.ref, -nx * repelSpd, -ny * repelSpd, { stunDuration: 1.55 });
            } else if (a.kind === 'crate' && CB.combat && CB.combat.pushCrate) {
              CB.combat.pushCrate(a.ref, -nx * repelSpd, -ny * repelSpd, false);
            }
            if (b.kind === 'guard' && CB.guards && CB.guards.launchGuardBilliard) {
              CB.guards.launchGuardBilliard(b.ref, nx * repelSpd, ny * repelSpd, { stunDuration: 1.55 });
            } else if (b.kind === 'crate' && CB.combat && CB.combat.pushCrate) {
              CB.combat.pushCrate(b.ref, nx * repelSpd, ny * repelSpd, false);
            }
            spawnLightningArc(a.x, a.y - 10, b.x, b.y - 10, a.sign);
            if (CB.audio && CB.audio.playCoulombPop) CB.audio.playCoulombPop(true);
            if (CB.extraction && CB.extraction.addStuntBounty) CB.extraction.addStuntBounty(20);
            if (CB.combat && CB.combat.grantOrbRefund) CB.combat.grantOrbRefund(1, (a.x + b.x) * 0.5, (a.y + b.y) * 0.5, '同极斥飞');
            CB.player.spawnPopup((a.x + b.x) * 0.5, (a.y + b.y) * 0.5 - 28, '⚡ 同极爆斥!', a.sign > 0 ? '#e05244' : '#2498c9');
          }
        } else if (!samePole) {
          // 异极相吸：跨房间持续拖拽相撞！
          const pullAcc = (320 + (1 - d / 235) * 440) * coulombMult;
          if (a.kind === 'guard') {
            a.ref.knockVx = (a.ref.knockVx || 0) + nx * pullAcc * dt;
            a.ref.knockVy = (a.ref.knockVy || 0) + ny * pullAcc * dt;
            if (d < 165 && !a.ref.billiardMode && CB.guards && CB.guards.launchGuardBilliard) {
              CB.guards.launchGuardBilliard(a.ref, nx * 380 * coulombMult, ny * 380 * coulombMult, { stunDuration: 1.1 });
            }
          } else if (a.kind === 'crate') {
            a.ref.vx = (a.ref.vx || 0) + nx * pullAcc * dt;
            a.ref.vy = (a.ref.vy || 0) + ny * pullAcc * dt;
            a.ref.sliding = true;
          }
          if (b.kind === 'guard') {
            b.ref.knockVx = (b.ref.knockVx || 0) - nx * pullAcc * dt;
            b.ref.knockVy = (b.ref.knockVy || 0) - ny * pullAcc * dt;
            if (d < 165 && !b.ref.billiardMode && CB.guards && CB.guards.launchGuardBilliard) {
              CB.guards.launchGuardBilliard(b.ref, -nx * 380 * coulombMult, -ny * 380 * coulombMult, { stunDuration: 1.1 });
            }
          } else if (b.kind === 'crate') {
            b.ref.vx = (b.ref.vx || 0) - nx * pullAcc * dt;
            b.ref.vy = (b.ref.vy || 0) - ny * pullAcc * dt;
            b.ref.sliding = true;
          }
          if (Math.random() < dt * 4) {
            spawnLightningArc(a.x, a.y - 10, b.x, b.y - 10, -1);
          }
        }
      }
    }

    // 5.5. 更新相对论共鸣生成的「微型时间膨胀泡」
    if (game.dilationBubbles && game.dilationBubbles.length > 0) {
      for (let i = game.dilationBubbles.length - 1; i >= 0; i--) {
        const b = game.dilationBubbles[i];
        b.activeTimer -= dt;
        if (b.activeTimer <= 0) {
          b.activeTimer = 0.01;
          if (CB.combat && CB.combat.collapseSingularity) CB.combat.collapseSingularity(b);
          game.dilationBubbles.splice(i, 1);
        }
      }
    }

    // 6. 闪电弧生命周期衰减
    for (let i = game.lightningArcs.length - 1; i >= 0; i--) {
      game.lightningArcs[i].life -= dt;
      if (game.lightningArcs[i].life <= 0) game.lightningArcs.splice(i, 1);
    }
  }

  // ==================== 五、手绘水彩渲染（道具本体 + 贴地场 + 前景光束与电弧） ====================
  function drawPressureCan(ctx, prop, time) {
    const INK = getInk();
    const heatFrac = Math.max(0, Math.min(1, (prop.heat || 0) / 100));
    const swell = 1 + heatFrac * 0.30 + (heatFrac > 0.45 ? Math.sin(time * (18 + heatFrac * 24)) * 0.04 * heatFrac : 0);
    const rattleX = heatFrac > 0.35 ? Math.sin(time * 55) * heatFrac * 3.2 : 0;

    if (CB.brush && CB.brush.drawSoftShadow) {
      CB.brush.drawSoftShadow(ctx, prop.x, prop.y + 4, prop.r * swell * 1.05, prop.r * 0.56, 0.24);
    }

    ctx.save();
    ctx.translate(prop.x + rattleX, prop.y);
    ctx.scale(swell, swell);
    ctx.lineJoin = 'round';

    if (heatFrac > 0.15) {
      const hg = ctx.createRadialGradient(0, -12, 3, 0, -12, 30);
      hg.addColorStop(0, `rgba(255, 118, 52, ${heatFrac * 0.65})`);
      hg.addColorStop(1, 'rgba(255, 118, 52, 0)');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(0, -12, 30, 0, Math.PI * 2);
      ctx.fill();
    }

    // 高压铜罐主体（随温度从暖陶红渐变为炽烈橙金）
    const bodyCol = prop.hitFlash > 0.15
      ? '#ffffff'
      : heatFrac > 0.68
      ? '#ff5a36'
      : heatFrac > 0.32
      ? '#e87842'
      : '#c96b54';
    ctx.fillStyle = bodyCol;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.roundRect(-12, -24, 24, 26, 9);
    ctx.fill();
    ctx.stroke();

    // 黄铜压力箍与顶部安全阀
    ctx.fillStyle = '#f2c352';
    ctx.fillRect(-12, -14, 24, 5);
    ctx.strokeRect(-12, -14, 24, 5);

    ctx.beginPath();
    ctx.roundRect(-6, -30, 12, 7, 3);
    ctx.fill();
    ctx.stroke();

    // 圆形压力表指针
    ctx.fillStyle = '#fff9eb';
    ctx.beginPath();
    ctx.arc(0, -11.5, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const gaugeAng = -Math.PI * 0.8 + heatFrac * Math.PI * 1.6;
    ctx.strokeStyle = '#d93829';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -11.5);
    ctx.lineTo(Math.cos(gaugeAng) * 4, -11.5 + Math.sin(gaugeAng) * 4);
    ctx.stroke();

    ctx.restore();
  }

  function drawConvexLens(ctx, prop, time) {
    const INK = getInk();
    const { x, y, r, angle, hitFlash, pulse } = prop;
    const sc = 1 + (pulse || 0) * 0.16;

    if (CB.brush && CB.brush.drawSoftShadow) {
      CB.brush.drawSoftShadow(ctx, x, y + 4, r * 1.0, r * 0.55, 0.2);
    }

    ctx.save();
    ctx.translate(x, y);

    // 极轻焦点方向预览虚线
    const fDist = prop.focalDist || 124;
    ctx.save();
    ctx.strokeStyle = 'rgba(242, 186, 52, 0.34)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(Math.cos(angle) * fDist, -16 + Math.sin(angle) * fDist);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 石座
    ctx.fillStyle = '#d2ded0';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 旋转黄铜双面凸透镜架
    ctx.translate(0, -18);
    ctx.rotate(angle);
    ctx.scale(sc, sc);

    // 聚光玻璃镜片
    ctx.fillStyle = hitFlash > 0.15 ? '#ffffff' : 'rgba(176, 240, 255, 0.82)';
    ctx.strokeStyle = '#d99e26';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7.5, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 镜片日光高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.beginPath();
    ctx.ellipse(-2, -6, 2.2, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 焦点箭头小金标
    ctx.fillStyle = '#ffe052';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(9, -4.5);
    ctx.lineTo(9, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  function drawMirrorPost(ctx, prop, time) {
    const INK = getInk();
    const { x, y, r, angle, hitFlash, pulse } = prop;
    const sc = 1 + (pulse || 0) * 0.16;

    if (CB.brush && CB.brush.drawSoftShadow) {
      CB.brush.drawSoftShadow(ctx, x, y + 4, r * 0.95, r * 0.52, 0.2);
    }

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#c8d6cc';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.translate(0, -18);
    ctx.rotate(angle || 0);
    ctx.scale(sc, sc);

    // 银白高反光花园镜面
    ctx.fillStyle = hitFlash > 0.15 ? '#ffffff' : '#e6f8ff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.roundRect(-5, -18, 10, 36, 4);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ffd652';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(2, -14);
    ctx.lineTo(2, 14);
    ctx.stroke();

    ctx.restore();
  }

  function drawChargePylon(ctx, prop, time) {
    const INK = getInk();
    const { x, y, r, chargeSign, hitFlash, pulse } = prop;
    const isPos = (chargeSign || 1) >= 0;
    const mainCol = isPos ? '#f0685a' : '#4cc8f0';
    const sc = 1 + (pulse || 0) * 0.18;

    if (CB.brush && CB.brush.drawSoftShadow) {
      CB.brush.drawSoftShadow(ctx, x, y + 4, r * 1.0, r * 0.55, 0.22);
    }

    ctx.save();
    ctx.translate(x, y);

    // 柔和静电感应底圈
    ctx.strokeStyle = isPos ? 'rgba(240, 104, 90, 0.34)' : 'rgba(76, 200, 240, 0.34)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, r + 26 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 陶瓷绝缘石座 + 铜线圈柱
    ctx.fillStyle = '#cbd6cc';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#c89448';
    ctx.fillRect(-5, -18, 10, 18);
    ctx.strokeRect(-5, -18, 10, 18);

    // 顶部正/负电荷球
    ctx.translate(0, -23);
    ctx.scale(sc, sc);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 19);
    g.addColorStop(0, isPos ? 'rgba(255, 132, 112, 0.72)' : 'rgba(104, 226, 255, 0.72)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hitFlash > 0.15 ? '#ffffff' : mainCol;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 清晰醒目的 + / - 极性符号
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-4.5, 0);
    ctx.lineTo(4.5, 0);
    if (isPos) {
      ctx.moveTo(0, -4.5);
      ctx.lineTo(0, 4.5);
    }
    ctx.stroke();

    ctx.restore();
  }

  function renderPhysicsFloor(ctx, time) {
    if (game.dilationBubbles && game.dilationBubbles.length > 0 && CB.brush && CB.brush.drawSingularityField) {
      for (let i = 0; i < game.dilationBubbles.length; i++) {
        CB.brush.drawSingularityField(ctx, game.dilationBubbles[i], time);
      }
    }

    // 1. 凸透镜聚光灼烧焦斑与光锥
    if (game.focusSpots && game.focusSpots.length > 0) {
      ctx.save();
      for (const fs of game.focusSpots) {
        const fade = Math.min(1, fs.life / 0.7);
        const pulse = 1 + Math.sin(time * 14) * 0.08;

        // 从透镜汇聚到焦点的半透明暖金光锥
        const ang = Math.atan2(fs.y - fs.ly, fs.x - fs.lx);
        const px = -Math.sin(ang) * 16;
        const py = Math.cos(ang) * 16;
        ctx.fillStyle = `rgba(255, 232, 120, ${0.22 * fade})`;
        ctx.beginPath();
        ctx.moveTo(fs.lx + px, fs.ly - 16 + py);
        ctx.lineTo(fs.lx - px, fs.ly - 16 - py);
        ctx.lineTo(fs.x, fs.y);
        ctx.closePath();
        ctx.fill();

        // 灼烧焦斑热圈
        const rg = ctx.createRadialGradient(fs.x, fs.y, 4, fs.x, fs.y, fs.radius * pulse);
        rg.addColorStop(0, `rgba(255, 248, 175, ${0.88 * fade})`);
        rg.addColorStop(0.45, `rgba(255, 146, 56, ${0.52 * fade})`);
        rg.addColorStop(1, 'rgba(255, 110, 40, 0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(fs.x, fs.y, fs.radius * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(235, 110, 38, ${0.55 * fade})`;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.arc(fs.x, fs.y, fs.radius * 0.88, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
  }

  function renderPhysicsOverlay(ctx, time) {
    // 1. 镜面光网（高能金青往返激光绊线）
    if (game.laserWebs && game.laserWebs.length > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      for (const w of game.laserWebs) {
        const fade = Math.min(1, w.life / 0.8);
        const flicker = 0.82 + Math.sin(time * 28) * 0.18;
        ctx.strokeStyle = `rgba(255, 224, 88, ${0.42 * fade * flicker})`;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(w.x1, w.y1 - 16);
        ctx.lineTo(w.x2, w.y2 - 16);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 250, 212, ${0.95 * fade})`;
        ctx.lineWidth = 2.8;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. 闪电导电弧
    if (game.lightningArcs && game.lightningArcs.length > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const arc of game.lightningArcs) {
        const a = Math.max(0, arc.life / arc.maxLife);
        if (!arc.pts || arc.pts.length < 2) continue;
        ctx.strokeStyle = arc.color || '#68e2ff';
        ctx.globalAlpha = a * 0.65;
        ctx.lineWidth = 6.2;
        ctx.beginPath();
        ctx.moveTo(arc.pts[0].x, arc.pts[0].y);
        for (let k = 1; k < arc.pts.length; k++) ctx.lineTo(arc.pts[k].x, arc.pts[k].y);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = a * 0.95;
        ctx.lineWidth = 2.1;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. 带正/负电荷的守卫与木箱悬浮电荷徽标（极高可读性！）
    const drawChargeBadge = (x, y, sign, r) => {
      const isPos = sign > 0;
      const col = isPos ? '#f05a4c' : '#32b8e8';
      ctx.save();
      ctx.strokeStyle = isPos ? 'rgba(240, 90, 76, 0.72)' : 'rgba(50, 184, 232, 0.72)';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(x, y - 10, r + 7, time * 2.5, time * 2.5 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const bx = x + r * 0.75;
      const by = y - r - 10;
      ctx.fillStyle = col;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(bx, by, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(bx - 3.4, by);
      ctx.lineTo(bx + 3.4, by);
      if (isPos) {
        ctx.moveTo(bx, by - 3.4);
        ctx.lineTo(bx, by + 3.4);
      }
      ctx.stroke();
      ctx.restore();
    };

    for (const g of game.guards) {
      if (!g.dead && g.chargeSign) drawChargeBadge(g.x, g.y, g.chargeSign, g.radius);
    }
    if (game.map && game.map.props) {
      for (const p of game.map.props) {
        if (!p.broken && p.type === 'crate' && p.chargeSign) {
          drawChargeBadge(p.x + p.w * 0.5, p.y + p.h * 0.5, p.chargeSign, 20);
        }
      }
    }
  }

  CB.physicsLab = {
    getSlidePhase,
    getSurfaceStateAt,
    isInSteam,
    heatSlide,
    applyHeatAt,
    heatPressureCan,
    explodePressureCan,
    triggerConvexLens,
    triggerMirrorPost,
    applyElectroCharge,
    spawnLightningArc,
    triggerChargePylon,
    triggerDashElectroArc,
    spawnMiniDilationBubble,
    updatePhysicsLab,
    drawPressureCan,
    drawConvexLens,
    drawMirrorPost,
    drawChargePylon,
    renderPhysicsFloor,
    renderPhysicsOverlay,
  };
})();
