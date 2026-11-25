(() => {
  const CB = window.CB;
  const game = CB.game;

  const SCARF_COUNT = 8;
  const SCARF_SEG_LEN = 6.8;

  const ROLE_TITLES = {
    spawn: '浮岛登船台',
    vault: '太阳花穹金库 ☀',
    extract: '热气球撤离坞 🎈',
    atrium: '2×2 水镜花庭',
    gallery: 'L型空中花廊',
    corridor: '阳光藤蔓拱廊',
    treasure: '晴空秘花角',
  };

  const BIOME_NAMES = {
    sun_glasshouse: '日照温室区',
    lotus_pond: '浅水荷塘区',
    ancient_vine: '古藤垂吊区',
  };

  function placePlayerAtSpawn(resetStats = true) {
    const p = game.player;
    const sp = game.map ? game.map.spawnPoint : { x: 0, y: 0 };
    p.x = sp.x;
    p.y = sp.y;
    p.vx = 0;
    p.vy = 0;
    p.dashTimer = 0;
    p.dashCooldown = 0;
    p.fireCooldown = 0;
    p.charging = false;
    p.chargeTime = 0;
    p.chargeRatio = 0;
    p.chargeStageNotified = 0;
    p.invulnTimer = 0.6;
    p.hitFlash = 0;
    p.inInkColor = null;
    p.currentRoomId = game.map ? game.map.spawnRoomId : -1;

    const metaB = CB.extraction && CB.extraction.getMetaBonuses ? CB.extraction.getMetaBonuses() : null;
    if (metaB) {
      p.maxHp = metaB.maxHp;
    }
    const curStage = game.map && game.map.stage;
    const isTrial = !!(curStage && curStage.nodeType === 'trial');
    p.maxOrbs = metaB && metaB.maxOrbs ? metaB.maxOrbs : 3;
    p.orbs = isTrial ? 2 : p.maxOrbs;
    p.orbRechargeTimer = 0;
    p.orbRechargeDuration = metaB ? metaB.orbRecharge : 4.2;
    p.overclockOrb = !!(game.voyage && game.voyage.nextStartOverclock);
    p.overclockTimer = p.overclockOrb ? 12.0 : 0;
    if (game.voyage && game.voyage.nextStartOverclock) game.voyage.nextStartOverclock = false;
    p.orbEmptyFlash = 0;

    if (resetStats) {
      p.hp = p.maxHp;
      p.coins = metaB ? metaB.startCoins : 12;
      p.lootCount = 6;
    } else {
      p.hp = Math.min(p.maxHp, p.hp + 30);
    }

    p.scarfNodes = [];
    for (let i = 0; i < SCARF_COUNT; i++) {
      p.scarfNodes.push({ x: p.x - i * SCARF_SEG_LEN, y: p.y - 6 });
    }
    game.camera.x = p.x;
    game.camera.y = p.y;
    game.footprints = [];
    game.particles = [];
    game.popups = [];
  }

  function setVariant(v) {
    game.variant = v;
    const p = game.player;
    p.squashVel += 6.2;
    spawnDust(p.x, p.y - 12, '#ffe194', 8);
  }

  function spawnDust(x, y, color = '#cde4dc', count = 4, speedScale = 1) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (25 + Math.random() * 65) * speedScale;
      if (game.particles.length >= 160) game.particles.shift();
      game.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 10,
        r: 2.8 + Math.random() * 3.8,
        life: 0.25 + Math.random() * 0.22,
        maxLife: 0.47,
        color,
      });
    }
  }

  function spawnPopup(x, y, text, color = '#2b4a52') {
    if (game.popups.length >= 24) game.popups.shift();
    game.popups.push({
      x,
      y,
      text,
      color,
      life: 1.3,
      maxLife: 1.3,
    });
  }

  function damagePlayer(amount, pushX = 0, pushY = 0) {
    const p = game.player;
    if (p.invulnTimer > 0 || p.dashTimer > 0) return;

    p.hp = Math.max(0, p.hp - amount);
    p.invulnTimer = 0.85;
    p.hitFlash = 1;
    p.vx += pushX * 320;
    p.vy += pushY * 320;
    p.squash = -0.36;
    p.squashVel = -3.4;
    p.expr = 'shock';
    p.exprTimer = 0.55;
    game.camera.shake = Math.max(game.camera.shake, 7.5);
    game.hitStop = Math.max(game.hitStop, 0.045);

    if (CB.audio) CB.audio.playPlayerHurt();
    spawnPopup(p.x, p.y - 42, `-${amount}`, '#c9382b');
    spawnDust(p.x, p.y - 10, '#f2796b', 10, 1.35);

    if (p.hp <= 0) {
      p.hp = 0;
      if (CB.extraction && CB.extraction.triggerFailure) {
        CB.extraction.triggerFailure();
      }
    }
  }

  function updatePlayer(dt) {
    const p = game.player;
    const inp = game.input;
    const map = game.map;

    if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
    if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt * 6);

    // 1. 鼠标 / 触控右摇杆瞄准与朝向（以枪口高度 y - 10 对齐世界目标，保证预判线精准）
    if (inp.useTouchAim) {
      p.aimAngle = inp.aimStickAngle;
    } else {
      p.aimAngle = Math.atan2(inp.mouseWorldY - (p.y - 10), inp.mouseWorldX - p.x);
    }
    if (Math.abs(Math.cos(p.aimAngle)) > 0.12) {
      p.facing = Math.cos(p.aimAngle) >= 0 ? 1 : -1;
    }

    const metaBonuses = CB.extraction && CB.extraction.getMetaBonuses ? CB.extraction.getMetaBonuses() : null;
    const hasOverchargeMut = !!(CB.stages && CB.stages.hasMutator && CB.stages.hasMutator('static_overcharge'));
    const baseRechargeDur = (metaBonuses ? metaBonuses.orbRecharge : 4.2) * (hasOverchargeMut ? 0.8 : 1.0);
    p.orbRechargeDuration = baseRechargeDur;
    p.orbSpinAngle = (p.orbSpinAngle || 0) + dt * (p.overclockOrb ? 3.2 : 1.9);
    if (p.orbEmptyFlash > 0) p.orbEmptyFlash = Math.max(0, p.orbEmptyFlash - dt * 3.5);

    if (p.overclockOrb) {
      p.overclockTimer -= dt;
      if (p.overclockTimer <= 0) {
        p.overclockOrb = false;
        p.overclockTimer = 0;
      }
    }
    if (p.orbs < p.maxOrbs) {
      const trialPause = game.run && game.run.nodeType === 'trial' && (game.run.trialGraceTimer || 0) > 0;
      if (!trialPause) p.orbRechargeTimer += dt;
      if (p.orbRechargeTimer >= baseRechargeDur) {
        p.orbRechargeTimer -= baseRechargeDur;
        p.orbs = Math.min(p.maxOrbs, p.orbs + 1);
        if (CB.audio && CB.audio.playOrbPickup) CB.audio.playOrbPickup();
        spawnDust(p.x, p.y - 14, '#8ceeff', 5, 0.9);
      }
    } else {
      p.orbRechargeTimer = 0;
    }

    if (p.fireCooldown > 0) p.fireCooldown -= dt;
    p.recoil *= Math.exp(-20 * dt);

    const cfgL = CB.combat.LAUNCHER;
    if (game.mapOverview) {
      p.charging = false;
      p.chargeTime = 0;
      p.chargeRatio = 0;
      inp.firePressed = false;
      inp.fireReleased = false;
    } else {
      if ((inp.firePressed || (inp.fireHeld && !p.charging)) && p.fireCooldown <= 0) {
        p.charging = true;
        p.chargeTime = 0;
        p.chargeRatio = 0;
        p.chargeStageNotified = 0;
      }
      inp.firePressed = false;

      const hasOrbForHeavy = p.orbs > 0 || p.overclockOrb;
      const effTap = cfgL.tapThreshold * (metaBonuses ? metaBonuses.tapMult : 1.0);
      const rawMax = Math.max(effTap + 0.18, cfgL.maxCharge * (metaBonuses ? metaBonuses.chargeMult : 1.0) * (hasOverchargeMut ? 0.75 : 1.0));
      const effMax = p.overclockOrb ? (effTap + (rawMax - effTap) * 0.52) : rawMax;
      p.effectiveMaxCharge = effMax;
      p.effectiveTapThreshold = effTap;

      if (p.charging && inp.fireHeld) {
        if (hasOrbForHeavy) {
          p.chargeTime = Math.min(effMax, p.chargeTime + dt);
          const raw = (p.chargeTime - effTap) / (effMax - effTap);
          p.chargeRatio = Math.max(0, Math.min(1, raw));

          if (p.chargeTime >= effTap && p.chargeStageNotified === 0) {
            p.chargeStageNotified = 1;
            if (CB.audio && CB.audio.playChargeCue) CB.audio.playChargeCue(false);
          } else if (p.chargeRatio >= 0.99 && p.chargeStageNotified < 2) {
            p.chargeStageNotified = 2;
            if (CB.audio && CB.audio.playChargeCue) CB.audio.playChargeCue(true);
            spawnDust(p.x + Math.cos(p.aimAngle) * 24, p.y - 12 + Math.sin(p.aimAngle) * 18, '#fff08a', 5, 0.9);
          }
        } else {
          p.chargeTime = Math.min(effTap * 0.85, p.chargeTime + dt);
          p.chargeRatio = 0;
          if (p.chargeTime >= effTap * 0.82 && p.chargeStageNotified === 0) {
            p.chargeStageNotified = -1;
            p.orbEmptyFlash = 1;
            if (CB.audio && CB.audio.playOrbEmpty) CB.audio.playOrbEmpty();
            spawnPopup(p.x, p.y - 46, '✦ 星露珠凝结中 · 捡珠/冲撞木箱回充', '#3d8aa3');
          }
        }
      }

      if (inp.fireReleased) {
        inp.fireReleased = false;
        if (p.charging) {
          const isHeavy = p.chargeTime >= effTap && (p.orbs > 0 || p.overclockOrb);
          const ratio = isHeavy ? p.chargeRatio : 0;
          p.charging = false;
          p.chargeTime = 0;
          p.chargeRatio = 0;
          p.chargeStageNotified = 0;
          CB.combat.fireLauncher(ratio, isHeavy);
        }
      }
    }

    // 3. 键盘 + 触控左摇杆连续移动向量 + 墨渍减速检测
    let ix = (inp.right ? 1 : 0) - (inp.left ? 1 : 0) + (inp.moveAxisX || 0);
    let iy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0) + (inp.moveAxisY || 0);
    const ilen = Math.hypot(ix, iy);
    if (ilen > 1) {
      ix /= ilen;
      iy /= ilen;
    }

    const inkPuddle = CB.combat ? CB.combat.getInkAt(p.x, p.y) : null;
    p.inInkColor = inkPuddle ? inkPuddle.color : null;
    const inkSlow = inkPuddle ? 0.56 : 1.0;
    const wasInPollen = p.inPollen;
    p.inPollen = CB.combat ? CB.combat.isInPollen(p.x, p.y) : false;
    if (p.inPollen && !wasInPollen) {
      spawnPopup(p.x, p.y - 44, '🌼 花粉隐身中', '#c98d14');
    }

    const dewSlide = CB.combat && CB.combat.getDewSlideAt ? CB.combat.getDewSlideAt(p.x, p.y) : null;
    const wasOnDewSlide = !!p.onDewSlide;
    p.onDewSlide = !!dewSlide;
    const hasDewSkates = !!(CB.extraction && CB.extraction.hasCurio('dew_skates'));

    if (p.onDewSlide && !wasOnDewSlide) {
      if (CB.audio && CB.audio.playDewSlide) CB.audio.playDewSlide();
      spawnDust(p.x, p.y, '#8be8f7', 5, 1.0);
    } else if (!p.onDewSlide && wasOnDewSlide && hasDewSkates) {
      // 晨露滑行靴：离开滑道时释放水花冲击波推开近身守卫
      if (CB.audio && CB.audio.playRepelWave) CB.audio.playRepelWave();
      if (CB.guards && CB.guards.repelGuardsFrom) CB.guards.repelGuardsFrom(p.x, p.y, 128, 330);
      spawnDust(p.x, p.y - 6, '#7ce8f7', 11, 1.45);
    }

    const featherBoost = (CB.extraction && CB.extraction.hasCurio('aero_feather')) ? 1.10 : 1.0;
    const slideSpeedMult = p.onDewSlide ? (hasDewSkates ? 1.42 : 1.24) : 1.0;
    const grandDrag = game.run.hasGrandCurio ? 0.94 : 1.0;
    const weightFactor = Math.max(0.84, 1 - p.lootCount * 0.007) * grandDrag;
    const chargeSlow = (p.charging && p.chargeTime >= 0.16) ? 0.82 : 1.0;
    const maxSpeed = 335 * weightFactor * inkSlow * featherBoost * slideSpeedMult * chargeSlow;

    // 4. 冲刺触发（冲刺附带短暂闪避无敌与轻度声波涟漪）
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    if (inp.dashPressed) {
      inp.dashPressed = false;
      if (p.dashCooldown <= 0 && p.dashTimer <= 0) {
        p.dashDirX = ilen > 0.08 ? ix / Math.min(1, ilen) : Math.cos(p.aimAngle);
        p.dashDirY = ilen > 0.08 ? iy / Math.min(1, ilen) : Math.sin(p.aimAngle);
        p.charging = false;
        p.chargeTime = 0;
        p.chargeRatio = 0;
        p.dashTimer = 0.17;
        p.dashStartX = p.x;
        p.dashStartY = p.y;
        const aeroCd = (CB.extraction && CB.extraction.hasCurio('aero_feather')) ? 0.85 : 1.0;
        const metaDashCd = (CB.extraction && CB.extraction.getMetaBonuses) ? CB.extraction.getMetaBonuses().dashCdMult : 1.0;
        p.dashCooldown = 0.42 * aeroCd * metaDashCd;
        const activeGust = CB.extraction && CB.extraction.getActiveGust ? CB.extraction.getActiveGust() : null;
        const gustAlign = activeGust ? Math.max(0, p.dashDirX * activeGust.dirX + p.dashDirY * activeGust.dirY) : 0;
        const gustDashMult = activeGust && gustAlign > 0.2 ? 1 + 0.16 * gustAlign : 1.0;
        const dashBoost = (p.onDewSlide ? 940 : 820) * gustDashMult;
        p.vx = p.dashDirX * dashBoost * weightFactor;
        p.vy = p.dashDirY * dashBoost * weightFactor;
        p.squash = 0.34;
        p.squashVel = 2.0;
        p.expr = 'dash';
        p.exprTimer = 0.26;
        game.camera.shake = Math.max(game.camera.shake, 3.6);
        spawnDust(p.x, p.y, p.inInkColor || (p.onDewSlide ? '#8ae8f7' : '#d6eef5'), 7);
        if (CB.audio) CB.audio.playDash();
        if (CB.combat) CB.combat.emitSoundRipple(p.x, p.y, 130, 'dash');
      }
    }

    // 5. 平滑加减速（低摩擦露水滑道大幅降低地面摩擦，形成顺滑漂移滑行手感）
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      if (Math.random() < 0.65) {
        spawnDust(p.x - p.dashDirX * 14, p.y, p.inInkColor || (p.onDewSlide ? '#8ae8f7' : '#eef9fc'), 1);
      }
      if (p.dashTimer <= 0 && CB.extraction && CB.extraction.hasSynergy && CB.extraction.hasSynergy('electro')) {
        if (CB.physicsLab && CB.physicsLab.triggerDashElectroArc) {
          CB.physicsLab.triggerDashElectroArc(p.dashStartX ?? p.x, p.dashStartY ?? p.y, p.x, p.y);
        }
      }
      if (p.dashTimer <= 0 && CB.extraction && CB.extraction.hasCurio('aero_feather')) {
        if (CB.audio) CB.audio.playRepelWave();
        if (CB.guards && CB.guards.repelGuardsFrom) CB.guards.repelGuardsFrom(p.x, p.y, 138, 360);
        for (const eb of game.enemyBullets) {
          const dx = eb.x - p.x;
          const dy = eb.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d < 130 && d > 1) {
            eb.vx = (dx / d) * eb.speed * 1.2;
            eb.vy = (dy / d) * eb.speed * 1.2;
          }
        }
        spawnDust(p.x, p.y - 8, '#7be8d0', 12, 1.5);
        if (CB.combat) CB.combat.emitSoundRipple(p.x, p.y, 145, 'dash', '#4ec9b0');
      }
    } else if (p.onDewSlide) {
      // 低摩擦露水滑道：低阻尼惯性滑行 + 轻微侧向转向力
      const slideGrip = hasDewSkates ? 2.6 : 3.4;
      const blend = 1 - Math.exp(-slideGrip * dt);
      p.vx += (ix * maxSpeed - p.vx) * blend;
      p.vy += (iy * maxSpeed - p.vy) * blend;

      const curSpd = Math.hypot(p.vx, p.vy);
      if (curSpd > 85) {
        if (Math.random() < 0.42) {
          spawnDust(p.x, p.y + 2, '#96ecf8', 1, 0.6);
        }
        p.slideSoundTimer = Math.max(0, (p.slideSoundTimer || 0) - dt);
        if (p.slideSoundTimer <= 0) {
          p.slideSoundTimer = 0.34;
          if (CB.audio && CB.audio.playDewSlide) CB.audio.playDewSlide();
        }
      }
    } else {
      const blend = 1 - Math.exp(-18 * dt);
      p.vx += (ix * maxSpeed - p.vx) * blend;
      p.vy += (iy * maxSpeed - p.vy) * blend;
    }

    // 6. 分步位移 + 地图墙体/角柱/未破坏家具精确碰撞
    const steps = p.dashTimer > 0 ? 2 : 1;
    for (let s = 0; s < steps; s++) {
      p.x += (p.vx * dt) / steps;
      p.y += (p.vy * dt) / steps;
      if (map) resolveMapCollisions(p, map);
    }

    // 7. 房间探索与羊皮纸迷雾揭开
    if (map) {
      const room = CB.mapGen.findRoomAt(map, p.x, p.y);
      if (room && room.id !== p.currentRoomId) {
        p.currentRoomId = room.id;
        if (!room.discovered) {
          room.discovered = true;
          for (const nid of room.neighbors) {
            map.rooms[nid].adjacentSeen = true;
          }
          if (CB.extraction && CB.extraction.recordGuardSeen) {
            for (const g of game.guards) {
              if (!g.dead && g.roomId === room.id) CB.extraction.recordGuardSeen(g.kind);
            }
          }
          const title = ROLE_TITLES[room.role] || BIOME_NAMES[room.biome];
          if (title) {
            const c = room.role === 'vault' ? '#c98212' : room.role === 'extract' ? '#1e82a8' : '#2f6a66';
            spawnPopup(p.x, p.y - 46, `抵达 ${title}`, c);
            if (room.role === 'vault') {
              p.expr = 'happy';
              p.exprTimer = 0.9;
              spawnDust(p.x, p.y - 16, '#ffd65c', 10, 1.3);
            }
          }
        }
      }

      for (const r of map.rooms) {
        const targetFog = r.discovered ? 0 : 1;
        r.fogAlpha += (targetFog - r.fogAlpha) * (1 - Math.exp(-6.5 * dt));
      }
    }

    // 8. 果冻弹性、前倾与二级惯性弹簧
    const acc = -195 * p.squash - 13 * p.squashVel;
    p.squashVel += acc * dt;
    p.squash += p.squashVel * dt;

    const targetTilt = Math.max(-0.18, Math.min(0.18, p.vx * 0.00042));
    p.tilt += (targetTilt - p.tilt) * (1 - Math.exp(-14 * dt));

    const targetLagX = Math.max(-12, Math.min(12, -p.vx * 0.028));
    const targetLagY = Math.max(-8, Math.min(8, -p.vy * 0.02 - p.hopHeight * 0.45));
    const lagAx = (targetLagX - p.lagX) * 140 - p.lagVx * 11;
    const lagAy = (targetLagY - p.lagY) * 140 - p.lagVy * 11;
    p.lagVx += lagAx * dt;
    p.lagVy += lagAy * dt;
    p.lagX += p.lagVx * dt;
    p.lagY += p.lagVy * dt;

    // 9. 跑动颠簸、彩色墨迹小脚印与发条旋转
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 45 && CB.combat && CB.combat.rustleGrassAt) {
      CB.combat.rustleGrassAt(p.x, p.y, 28, p.vx);
    }
    if (speed > 24 && p.dashTimer <= 0) {
      p.walkPhase += dt * (11.5 + speed * 0.032);
      p.hopHeight = Math.abs(Math.sin(p.walkPhase)) * Math.min(7.5, speed * 0.024);

      p.stepAccum += speed * dt;
      if (p.stepAccum > 40) {
        p.stepAccum = 0;
        p.stepSide *= -1;
        if (game.footprints.length >= 64) game.footprints.shift();
        game.footprints.push({
          x: p.x + p.stepSide * 6,
          y: p.y + 3,
          life: p.inInkColor ? 3.2 : 1.4,
          maxLife: p.inInkColor ? 3.2 : 1.4,
          r: p.inInkColor ? 3.4 : 2.5,
          color: p.inInkColor || null,
        });
      }
    } else {
      p.hopHeight *= Math.exp(-14 * dt);
    }
    p.keyAngle += dt * (2.0 + speed * 0.028 + (p.dashTimer > 0 ? 15 : 0));

    // 10. 表情与眨眼
    if (p.exprTimer > 0) {
      p.exprTimer -= dt;
      if (p.exprTimer <= 0) p.expr = p.exprLock || 'normal';
    } else if (p.exprLock) {
      p.expr = p.exprLock;
    }

    p.blinkTimer -= dt;
    if (p.blinkTimer <= 0) {
      if (p.isBlinking) {
        p.isBlinking = false;
        p.blinkTimer = 2.1 + Math.random() * 2.8;
      } else {
        p.isBlinking = true;
        p.blinkTimer = 0.11;
      }
    }

    updateScarf(p, dt);
  }

  function resolveMapCollisions(p, map) {
    for (const w of map.walls) collideCircleRect(p, w.x, w.y, w.w, w.h, 0.55, false);
    for (const post of map.posts) collideCircleRect(p, post.x, post.y, post.w, post.h, 0.55, false);

    // 云海崖边与花栏：主角自动防滑边缘吸附（正常行走、露水滑行与冲刺都不会误摔！）
    if (map.cliffEdges) {
      for (const edge of map.cliffEdges) {
        collidePlayerCliffGrip(p, edge);
      }
    }

    if (map.vineGates) {
      for (const gate of map.vineGates) {
        if (gate.open) continue;
        collideCircleRect(p, gate.x, gate.y, gate.w, gate.h, 0.45, false);
      }
    }

    for (const prop of map.props) {
      if (prop.broken || prop.type === 'wormhole') continue;
      // 冲刺撞破花粉隐身花苞，顺手拉出掩护烟雾！
      if (prop.type === 'pollen_bud' && p.dashTimer > 0) {
        if (Math.hypot(p.x - prop.x, p.y - prop.y) < p.radius + prop.r + 4) {
          CB.combat.damageProp(prop, 999, prop.x, prop.y);
          continue;
        }
      }
      if (prop.shape === 'circle') {
        const hit = collideCircleCircle(p, prop.x, prop.y, prop.r, prop.bounce || 0.65, prop.type === 'bumper');
        if (hit && prop.type === 'bumper') {
          prop.hitFlash = 1;
          if (CB.audio) CB.audio.playRicochet(1, true);
          spawnPopup(prop.x, prop.y - 34, '风铃弹射!', '#2494a8');
        }
      } else if (prop.type === 'crate') {
        collidePlayerWithCrate(p, prop);
      } else {
        const isSuper = prop.type === 'eraser';
        const hit = collideCircleRect(p, prop.x, prop.y, prop.w, prop.h, prop.bounce || 0.65, isSuper);
        if (hit && isSuper) {
          prop.hitFlash = 1;
          if (CB.audio) CB.audio.playRicochet(1, true);
          spawnPopup(p.x, p.y - 34, '菌伞弹跳!', '#e06488');
        }
      }
    }

    // 兜底岛内保护：防止极端推挤导致主角脱离岛面
    if (!CB.mapGen.findRoomAt(map, p.x, p.y)) {
      clampPlayerToNearestCell(p, map);
    }
  }

  function collidePlayerCliffGrip(p, edge) {
    const isOpen = edge.kind === 'open' || edge.broken;
    const pad = isOpen ? 2.5 : 0;
    const cx = Math.max(edge.x, Math.min(p.x, edge.x + edge.w));
    const cy = Math.max(edge.y, Math.min(p.y, edge.y + edge.h));
    const dx = p.x - cx;
    const dy = p.y - cy;
    const effR = p.radius + pad;
    const distSq = dx * dx + dy * dy;
    if (distSq >= effR * effR) return;

    const dist = Math.sqrt(distSq) || 0.001;
    let nx = dx / dist;
    let ny = dy / dist;
    // 确保推回方向始终指向岛内，杜绝卡过崖边
    const inwardDot = nx * (-edge.outwardX) + ny * (-edge.outwardY);
    if (inwardDot < 0.25) {
      nx = -edge.outwardX;
      ny = -edge.outwardY;
    }

    p.x += nx * (effR - dist + 0.5);
    p.y += ny * (effR - dist + 0.5);

    const vn = p.vx * nx + p.vy * ny;
    if (vn < 0) {
      // 自动防滑边缘吸附：清除朝向云海的法向分速度，保留沿崖边切向平滑移动
      p.vx -= vn * nx;
      p.vy -= vn * ny;
      if (isOpen && p.dashTimer > 0 && Math.abs(vn) > 220) {
        p.dashTimer = 0;
        spawnDust(cx, cy, '#dff7ff', 4, 0.7);
      }
    }
  }

  function clampPlayerToNearestCell(p, map) {
    let bestCell = null;
    let bestDist = Infinity;
    for (const c of map.cells.values()) {
      const cx = (c.gx + 0.5) * map.cellW;
      const cy = (c.gy + 0.5) * map.cellH;
      const d = Math.hypot(p.x - cx, p.y - cy);
      if (d < bestDist) {
        bestDist = d;
        bestCell = c;
      }
    }
    if (!bestCell) return;
    const margin = map.wallT / 2 + p.radius + 4;
    const minX = bestCell.gx * map.cellW + margin;
    const maxX = (bestCell.gx + 1) * map.cellW - margin;
    const minY = bestCell.gy * map.cellH + margin;
    const maxY = (bestCell.gy + 1) * map.cellH - margin;
    p.x = Math.max(minX, Math.min(maxX, p.x));
    p.y = Math.max(minY, Math.min(maxY, p.y));
  }

  function collidePlayerWithCrate(p, crate) {
    const cx = Math.max(crate.x, Math.min(p.x, crate.x + crate.w));
    const cy = Math.max(crate.y, Math.min(p.y, crate.y + crate.h));
    const dx = p.x - cx;
    const dy = p.y - cy;
    const distSq = dx * dx + dy * dy;
    if (distSq >= p.radius * p.radius) return;

    const dist = Math.sqrt(distSq) || 0.001;
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = p.radius - dist;

    // 推开防重叠（主角与木箱各自退让一部分）
    p.x += nx * overlap * 0.65;
    p.y += ny * overlap * 0.65;
    crate.x -= nx * overlap * 0.35;
    crate.y -= ny * overlap * 0.35;

    const vn = p.vx * nx + p.vy * ny;
    if (vn < 0) {
      const isDashKick = p.dashTimer > 0;
      const launchSpd = isDashKick ? 490 : Math.max(185, Math.abs(vn) * 1.15);
      if (CB.combat && CB.combat.pushCrate) {
        CB.combat.pushCrate(crate, -nx * launchSpd, -ny * launchSpd, isDashKick);
      }
      if (isDashKick) {
        p.vx -= vn * nx * 1.25;
        p.vy -= vn * ny * 1.25;
        p.dashTimer = 0;
        p.squash = -0.28;
        game.camera.shake = Math.max(game.camera.shake, 4.2);
        spawnPopup(crate.x + crate.w / 2, crate.y - 20, '🎱 冲撞开球!', '#2a8eb8');
      } else {
        p.vx -= vn * nx * 0.72;
        p.vy -= vn * ny * 0.72;
      }
    }
  }

  function collideCircleRect(p, rx, ry, rw, rh, bounce, isSuperBounce) {
    const cx = Math.max(rx, Math.min(p.x, rx + rw));
    const cy = Math.max(ry, Math.min(p.y, ry + rh));
    const dx = p.x - cx;
    const dy = p.y - cy;
    const distSq = dx * dx + dy * dy;
    if (distSq >= p.radius * p.radius) return false;

    const dist = Math.sqrt(distSq) || 0.001;
    const nx = dx / dist;
    const ny = dy / dist;
    p.x += nx * (p.radius - dist);
    p.y += ny * (p.radius - dist);

    const vn = p.vx * nx + p.vy * ny;
    if (vn < -150 || (isSuperBounce && vn < -40)) {
      const boost = isSuperBounce ? Math.max(Math.abs(vn) * bounce, 560) : Math.abs(vn) * bounce;
      p.vx += (boost - vn) * nx;
      p.vy += (boost - vn) * ny;
      p.dashTimer = 0;
      p.squash = -0.32;
      p.squashVel = -3.2;
      p.expr = isSuperBounce ? 'dash' : 'shock';
      p.exprTimer = 0.36;
      game.camera.shake = Math.max(game.camera.shake, isSuperBounce ? 7.5 : 4);
      spawnDust(cx, cy, isSuperBounce ? '#ff9db2' : '#d6c3a5', 7);
      return true;
    } else if (vn < 0) {
      p.vx -= vn * nx;
      p.vy -= vn * ny;
    }
    return false;
  }

  function collideCircleCircle(p, cx, cy, cr, bounce, isBumper) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const minDist = p.radius + cr;
    const distSq = dx * dx + dy * dy;
    if (distSq >= minDist * minDist) return false;

    const dist = Math.sqrt(distSq) || 0.001;
    const nx = dx / dist;
    const ny = dy / dist;
    p.x += nx * (minDist - dist);
    p.y += ny * (minDist - dist);

    const vn = p.vx * nx + p.vy * ny;
    if (isBumper && vn < 40) {
      const kick = Math.max(580, Math.abs(vn) * bounce);
      p.vx = nx * kick;
      p.vy = ny * kick;
      p.dashTimer = 0;
      p.squash = -0.35;
      p.squashVel = -4;
      p.expr = 'dash';
      p.exprTimer = 0.35;
      game.camera.shake = Math.max(game.camera.shake, 7);
      spawnDust(cx + nx * cr, cy + ny * cr, '#ffd76a', 9, 1.3);
      return true;
    } else if (vn < 0) {
      p.vx -= (1 + bounce * 0.4) * vn * nx;
      p.vy -= (1 + bounce * 0.4) * vn * ny;
    }
    return false;
  }

  function updateScarf(p, dt) {
    const nodes = p.scarfNodes;
    if (!nodes.length) return;

    const neckX = p.x - p.facing * 7;
    const neckY = p.y - 11 - p.hopHeight;
    nodes[0].x = neckX;
    nodes[0].y = neckY;

    const flutter = Math.sin(game.time * 9.5) * 20;
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];

      curr.x += (-p.facing * 26 + flutter * 0.45) * dt;
      curr.y += (15 + Math.cos(game.time * 7.2 + i * 0.9) * 16) * dt;

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      if (dist > SCARF_SEG_LEN) {
        curr.x = prev.x + (dx / dist) * SCARF_SEG_LEN;
        curr.y = prev.y + (dy / dist) * SCARF_SEG_LEN;
      }
    }
  }

  CB.player = { placePlayerAtSpawn, updatePlayer, setVariant, spawnDust, spawnPopup, damagePlayer };
})();
