(() => {
  const CB = window.CB;
  const game = CB.game;

  function getInk() {
    const pal = game.map && game.map.stage && game.map.stage.palette;
    return (pal && pal.ink) || '#2d4b52';
  }

  // ==================== 7 种关卡主题专属守卫配置 ====================
  const GUARD_SPECS = {
    // Stage 1: 晨露荷塘
    shield_charger: {
      name: '荷叶盾甲冲锋卫',
      hp: 105,
      speed: 82,
      chaseSpeed: 102,
      radius: 21,
      sightRange: 255,
      fov: 0.85,
      hearingBonus: 18,
      bodyColor: '#4e8a72',
      accentColor: '#e8c15a',
      touchDamage: 16,
      baseCoins: 5,
      hasFrontShield: true,
      mass: 1.25,
      stageTag: '第 1 关 · 晨露荷塘',
      traitBadge: '🛡️ 正面挡直',
      counterBadge: '🎱 滑道木箱 / 绕背',
      tip: '正面青铜荷叶大盾弹开直线弹；引它踩滑道撞墙或用木箱砸盾直接破防。',
    },
    dew_hopper: {
      name: '露泡跳蛙偶',
      hp: 68,
      speed: 85,
      chaseSpeed: 110,
      radius: 17,
      sightRange: 230,
      fov: 0.92,
      hearingBonus: 24,
      bodyColor: '#58b09c',
      accentColor: '#8ee8f7',
      touchDamage: 12,
      baseCoins: 4,
      mass: 0.9,
      stageTag: '第 1 关 · 晨露荷塘',
      traitBadge: '💧 四向露泡',
      counterBadge: '🎱 台球双倍重创',
      tip: '蛙跃落地溅射弹跳水泡；被木箱或怪物台球撞击承受近双倍伤害。',
    },

    // Stage 2: 星象天文台
    astro_sentinel: {
      name: '占星光盾偶',
      hp: 92,
      speed: 86,
      chaseSpeed: 108,
      radius: 19,
      sightRange: 270,
      fov: 0.9,
      hearingBonus: 28,
      bodyColor: '#364d8a',
      accentColor: '#ffd866',
      touchDamage: 13,
      baseCoins: 5,
      hasStarMembrane: true,
      mass: 1.0,
      stageTag: '第 2 关 · 星象天文台',
      traitBadge: '✨ 折光减伤80%',
      counterBadge: '🪐 星轨弯道 / 棱镜',
      tip: '周身折光膜抗直线射击；借星轨仪打弯道、日光棱镜或引力漩涡瞬间破膜。',
    },
    comet_orbiter: {
      name: '彗星双子偶',
      hp: 76,
      speed: 124,
      chaseSpeed: 148,
      radius: 17,
      sightRange: 260,
      fov: 1.05,
      hearingBonus: 30,
      bodyColor: '#5278b8',
      accentColor: '#8cf0ff',
      touchDamage: 12,
      baseCoins: 5,
      mass: 0.9,
      stageTag: '第 2 关 · 星象天文台',
      traitBadge: '☄️ 绕圈星环',
      counterBadge: '☀ 斥力星轨弹飞',
      tip: '游走发射 6 向星环；将星轨仪切换为斥力场可直接将其弹飞连撞或推下云海。',
    },

    // Stage 3: 暮光古藤廊
    vine_stalker: {
      name: '荆棘警哨眼',
      hp: 84,
      speed: 96,
      chaseSpeed: 118,
      radius: 18,
      sightRange: 305,
      fov: 0.62, // 窄而远的警戒光束，适合侧面/风铃绕背
      hearingBonus: 48,
      bodyColor: '#3a6652',
      accentColor: '#ffba42',
      touchDamage: 14,
      baseCoins: 5,
      hasThornShell: true,
      mass: 1.0,
      stageTag: '第 3 关 · 暮光古藤廊',
      traitBadge: '🌵 警戒缩壳75%',
      counterBadge: '🌼 花粉雾 / 🎐 风铃',
      tip: '正面遇袭立刻缩壳减伤并摇人；敲风铃引开或钻花粉雾伏击触发 2.45× 绝杀。',
    },
    vine_magnet: {
      name: '吸金藤妖偶',
      hp: 74,
      speed: 114,
      chaseSpeed: 136,
      radius: 18,
      sightRange: 225,
      fov: 0.88,
      hearingBonus: 42,
      bodyColor: '#2e7d6c',
      accentColor: '#ff8a5c',
      touchDamage: 10,
      baseCoins: 5,
      mass: 0.95,
      stageTag: '第 3 关 · 暮光古藤廊',
      traitBadge: '🧲 吸金藤网',
      counterBadge: '🌻 开花闸拦截',
      tip: '近身吸走金币并抛藤蔓减速网；击倒或推落云海可全数夺回被吸金币。',
    },

    // Stage 1~3 金库专属主题精英（共享破甲/残血崖杀规则）
    lotus_warden: {
      name: '荷叶巨盾领主',
      hp: 175,
      speed: 78,
      chaseSpeed: 98,
      radius: 25,
      sightRange: 275,
      fov: 0.92,
      hearingBonus: 26,
      bodyColor: '#36755d',
      accentColor: '#ffd659',
      touchDamage: 18,
      baseCoins: 9,
      isElite: true,
      hasFrontShield: true,
      mass: 1.9,
      stageTag: '第 1 关 · 金库精英',
      traitBadge: '👑 巨盾冲锋波',
      counterBadge: '🎱 滑道木箱破盾',
      tip: '第 1 关太阳花穹金库守卫！双层青铜荷叶巨盾格挡正面弹并掀 5 向水浪，破盾或残血后可直接击落云海。',
    },
    astro_archon: {
      name: '双环占星仪偶',
      hp: 165,
      speed: 82,
      chaseSpeed: 104,
      radius: 24,
      sightRange: 290,
      fov: 1.0,
      hearingBonus: 34,
      bodyColor: '#293e7a',
      accentColor: '#ffe066',
      touchDamage: 16,
      baseCoins: 9,
      isElite: true,
      hasStarMembrane: true,
      mass: 1.7,
      stageTag: '第 2 关 · 金库精英',
      traitBadge: '👑 双环星膜',
      counterBadge: '🪐 星轨弯道 / 棱镜',
      tip: '第 2 关金库精英！悬浮双黄金星环轮换 5 连星弧与星环扩散波，用星轨弹弓或棱镜破膜后即可推崖秒杀。',
    },
    vine_elder: {
      name: '古藤警哨长老',
      hp: 160,
      speed: 88,
      chaseSpeed: 112,
      radius: 24,
      sightRange: 320,
      fov: 0.78,
      hearingBonus: 54,
      bodyColor: '#2b5442',
      accentColor: '#ffb845',
      touchDamage: 16,
      baseCoins: 9,
      isElite: true,
      hasThornShell: true,
      mass: 1.75,
      stageTag: '第 3 关 · 金库精英',
      traitBadge: '👑 棘甲藤网',
      counterBadge: '🌼 花粉绝杀 / 风铃',
      tip: '第 3 关金库精英！警戒即缩壳减伤 75% 并施放 5 连毒刺与藤蔓减速网，用花粉雾破壳后可直接击落云海。',
    },

    // Stage 4: 落日鎏金穹 精英 Boss
    colossus: {
      name: '花穹守卫巨像',
      hp: 240,
      speed: 78,
      chaseSpeed: 98,
      radius: 27,
      sightRange: 300,
      fov: 1.15,
      hearingBonus: 45,
      bodyColor: '#b85c52',
      accentColor: '#ffd659',
      touchDamage: 20,
      baseCoins: 12,
      isElite: true,
      hasColossusArmor: true,
      mass: 2.3,
      stageTag: '第 4 关 · 落日鎏金穹',
      traitBadge: '👑 精英金甲',
      counterBadge: '💥 破甲/残血可崖杀',
      tip: '同时吃滑道台球、星轨弯道与花粉破防；未破甲高血量触崖会弹回，破甲后可秒杀。',
    },
  };

  function resolveKind(kind) {
    if (GUARD_SPECS[kind]) return kind;
    const st = game.map && game.map.stage;
    const theme = st ? st.theme : 'friction';
    if (kind === 'charger') return theme === 'gravity' ? 'astro_sentinel' : theme === 'stealth' ? 'vine_stalker' : 'shield_charger';
    if (kind === 'magnet') return theme === 'gravity' ? 'comet_orbiter' : theme === 'friction' ? 'dew_hopper' : 'vine_magnet';
    return theme === 'gravity' ? 'astro_sentinel' : theme === 'stealth' ? 'vine_stalker' : 'dew_hopper';
  }

  function makeGuard(rawKind, x, y, room) {
    const kind = resolveKind(rawKind);
    const spec = GUARD_SPECS[kind] || GUARD_SPECS.shield_charger;
    const waypoints = buildPatrolWaypoints(x, y, room);
    return {
      id: Math.random().toString(36).slice(2, 9),
      kind,
      name: spec.name,
      roomId: room.id,
      x,
      y,
      vx: 0,
      vy: 0,
      knockVx: 0,
      knockVy: 0,
      hp: spec.hp,
      maxHp: spec.hp,
      speed: spec.speed,
      chaseSpeed: spec.chaseSpeed,
      radius: spec.radius,
      sightRange: spec.sightRange,
      fov: spec.fov,
      hearingBonus: spec.hearingBonus,
      bodyColor: spec.bodyColor,
      accentColor: spec.accentColor,
      touchDamage: spec.touchDamage,
      baseCoins: spec.baseCoins,
      isElite: !!spec.isElite,

      // 防直护甲/破防状态
      hasFrontShield: !!spec.hasFrontShield,
      hasStarMembrane: !!spec.hasStarMembrane,
      hasThornShell: !!spec.hasThornShell,
      hasColossusArmor: !!spec.hasColossusArmor,
      armorBrokenTimer: 0, // >0 时盾碎/膜破/壳开，受到双倍脆弱伤害！
      shellClosed: false,  // 荆棘警哨眼警戒缩壳状态

      facing: Math.random() * Math.PI * 2,
      walkPhase: Math.random() * 6,
      keyAngle: Math.random() * 6,
      hopZ: 0,
      hopTimer: 0.7 + Math.random() * 0.8,
      hopVx: 0,
      hopVy: 0,
      hopping: false,
      orbitDir: Math.random() < 0.5 ? 1 : -1,
      squash: 0,
      hitFlash: 0,
      dead: false,

      // AI 状态机
      aiState: 'patrol',
      stateTimer: 0,
      waypoints,
      wpIndex: 0,
      investigatePos: null,
      lookPause: 0,
      fireCooldown: 1.0 + Math.random() * 0.6,
      bossCycle: 0,

      // v9.1 力学轨道捕获 / 相对论质增 / 引力时间膨胀 / 虫洞折跃状态
      orbitOrreryId: null,
      orbitAngle: 0,
      orbitRadius: 80,
      orbitSpeed: 0,
      orbitTime: 0,
      orbitReleaseCd: 0,
      wormholeCd: 0,
      dilatedStoredVx: 0,
      dilatedStoredVy: 0,
      dilatedStoredDmg: 0,
      relGamma: 1.0,
      isTimeDilated: false,

      // 冲锋与打滑状态
      chargeDirX: 1,
      chargeDirY: 0,
      chargeCooldown: 0,
      skidding: false,

      // 磁铁/藤妖专属
      magnetPulse: Math.random() * 6,
      siphonCooldown: 0,
      snareCooldown: 2.2,
      stolenCoins: 0,
      siphonBeam: null,
      sneezeCooldown: 0,
      hintCooldown: 0,

      // 怪物台球弹飞态物理参数
      mass: spec.mass || 1.0,
      billiardMode: false,
      billiardChain: 0,
      billiardSpin: 0,
      billiardTrail: [],
      billiardHitCd: {},
      orreryLaunchCd: 0,
      slideSoundTimer: 0,
      onDewSlide: false,
    };
  }

  function buildPatrolWaypoints(sx, sy, room) {
    const cellW = game.map ? game.map.cellW : 540;
    const cellH = game.map ? game.map.cellH : 420;
    const cells = room.cells && room.cells.length ? room.cells : [{ gx: room.gx, gy: room.gy }];

    if (cells.length >= 2) {
      const pts = [{ x: sx, y: sy }];
      for (const c of cells) {
        pts.push({
          x: c.gx * cellW + cellW * (0.36 + Math.random() * 0.28),
          y: c.gy * cellH + cellH * (0.36 + Math.random() * 0.28),
        });
      }
      return pts;
    }

    const pad = 76;
    const x1 = room.x + pad;
    const x2 = room.x + room.w - pad;
    const y1 = room.y + pad;
    const y2 = room.y + room.h - pad;
    const cx = room.x + room.w / 2;
    const cy = room.y + room.h / 2;

    return [
      { x: sx, y: sy },
      { x: Math.max(x1, Math.min(x2, cx + (sx < cx ? 95 : -95))), y: sy },
      { x: Math.max(x1, Math.min(x2, cx + (sx < cx ? 95 : -95))), y: Math.max(y1, Math.min(y2, cy + (sy < cy ? 75 : -75))) },
      { x: sx, y: Math.max(y1, Math.min(y2, cy + (sy < cy ? 75 : -75))) },
    ];
  }

  function isSpotClear(x, y, r, map) {
    for (const w of map.walls) {
      if (circleHitsRect(x, y, r + 10, w.x, w.y, w.w, w.h)) return false;
    }
    for (const post of map.posts) {
      if (circleHitsRect(x, y, r + 10, post.x, post.y, post.w, post.h)) return false;
    }
    if (map.cliffEdges) {
      for (const edge of map.cliffEdges) {
        if (circleHitsRect(x, y, r + 14, edge.x, edge.y, edge.w, edge.h)) return false;
      }
    }
    for (const prop of map.props) {
      if (prop.broken) continue;
      if (prop.shape === 'circle') {
        if (Math.hypot(x - prop.x, y - prop.y) < r + prop.r + 12) return false;
      } else {
        if (circleHitsRect(x, y, r + 10, prop.x, prop.y, prop.w, prop.h)) return false;
      }
    }
    for (const d of map.doorways) {
      if (Math.hypot(x - d.cx, y - d.cy) < 76) return false;
    }
    return true;
  }

  function findSpawnSpotInRoom(room, r, map, existing) {
    const pad = 74;
    const cells = room.cells && room.cells.length ? room.cells : [{ gx: room.gx, gy: room.gy }];
    for (let t = 0; t < 32; t++) {
      const cell = cells[Math.floor(Math.random() * cells.length)];
      const x = cell.gx * map.cellW + pad + Math.random() * Math.max(20, map.cellW - pad * 2);
      const y = cell.gy * map.cellH + pad + Math.random() * Math.max(20, map.cellH - pad * 2);
      if (!isSpotClear(x, y, r, map)) continue;
      let tooClose = false;
      for (const g of existing) {
        if (Math.hypot(x - g.x, y - g.y) < 88) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) return { x, y };
    }
    const c0 = cells[0];
    return { x: c0.gx * map.cellW + map.cellW / 2, y: c0.gy * map.cellH + map.cellH / 2 };
  }

  // 根据关卡与房间所属物理主题投放专属守卫（第 4 关在金库/大中庭部署花穹巨像！）
  function populateGuardsForMap(map) {
    const guards = [];
    if (!map) return guards;

    const stage = map.stage || (CB.stages ? CB.stages.getStage(game.currentStageId) : null);
    const nonSpawnRooms = map.rooms
      .filter((r) => r.role !== 'spawn')
      .sort((a, b) => a.distFromSpawn - b.distFromSpawn);

    const themePairs = {
      friction: ['shield_charger', 'dew_hopper'],
      gravity: ['astro_sentinel', 'comet_orbiter'],
      stealth: ['vine_stalker', 'vine_magnet'],
      fusion: ['shield_charger', 'astro_sentinel', 'vine_stalker'],
    };

    let cursor = 0;
    for (const room of nonSpawnRooms) {
      const t = room.subTheme || (stage ? stage.theme : 'friction');
      const pair = themePairs[t] || themePairs.friction;
      let plan = [];

      if (room.role === 'atrium') {
        plan = ['colossus', 'astro_sentinel', 'dew_hopper'];
      } else if (room.role === 'vault') {
        const eliteKind = stage && stage.vaultElite ? stage.vaultElite : (stage && stage.id === 4 ? 'colossus' : 'lotus_warden');
        const escortKind = eliteKind === 'colossus'
          ? 'vine_stalker'
          : eliteKind === 'astro_archon'
          ? 'comet_orbiter'
          : eliteKind === 'vine_elder'
          ? 'vine_magnet'
          : 'dew_hopper';
        plan = [eliteKind, escortKind];
      } else if (room.role === 'gallery') {
        plan = [pair[0], pair[1]];
      } else if (room.role === 'corridor') {
        plan = [pair[0], pair[1]];
      } else if (room.role === 'extract') {
        plan = [pair[0]];
      } else if (room.role === 'treasure') {
        plan = [pair[1 % pair.length]];
      } else {
        plan = [pair[cursor % pair.length]];
        cursor++;
      }

      for (const kind of plan) {
        const spec = GUARD_SPECS[resolveKind(kind)];
        const spot = findSpawnSpotInRoom(room, spec.radius, map, guards);
        guards.push(makeGuard(kind, spot.x, spot.y, room));
      }
    }

    game.guards = guards;
    return guards;
  }

  function notifySound(nx, ny, radius, sourceType) {
    for (const g of game.guards) {
      if (g.dead) continue;
      if (g.aiState === 'charging' || g.aiState === 'stunned' || g.aiState === 'windup') continue;

      const dist = Math.hypot(g.x - nx, g.y - ny);
      if (dist > radius + g.hearingBonus) continue;

      const isChime = sourceType === 'chime_lure';
      const canDistractChase = isChime && g.aiState === 'chase' && !canSeePlayer(g, game.player);

      if (g.aiState === 'patrol' || g.aiState === 'investigate' || canDistractChase) {
        const wasPatrol = g.aiState === 'patrol';
        g.aiState = 'investigate';
        g.investigatePos = { x: nx, y: ny };
        g.stateTimer = isChime ? 7.2 : 4.6;
        g.lookPause = 0;
        g.squash = 0.25;
        if (isChime) {
          g.shellClosed = false; // 风铃引开警哨眼，使其解除缩壳露出破绽！
          CB.player.spawnPopup(g.x, g.y - g.radius - 22, '🎐 被风铃引开', '#1e8da3');
        } else if (wasPatrol) {
          if (CB.audio) CB.audio.playGuardState('suspicious');
          CB.player.spawnPopup(g.x, g.y - g.radius - 22, '? 听见动静', '#c4761c');
        }
      }
    }
  }

  function getGustBoostForDir(dirX, dirY) {
    const gust = CB.extraction && CB.extraction.getActiveGust ? CB.extraction.getActiveGust() : null;
    if (!gust) return { mult: 1.0, addVx: 0, addVy: 0 };
    const align = dirX * gust.dirX + dirY * gust.dirY;
    if (align > 0.1) {
      return { mult: 1 + 0.45 * align, addVx: gust.dirX * 95 * align, addVy: gust.dirY * 95 * align };
    }
    return { mult: 1.0, addVx: gust.dirX * 42, addVy: gust.dirY * 42 };
  }

  function launchGuardBilliard(g, vx, vy, opts = {}) {
    if (!g || g.dead) return;
    g.knockVx = vx;
    g.knockVy = vy;
    g.billiardMode = true;
    g.billiardTrail = g.billiardTrail || [];
    if (opts.chain !== undefined) {
      g.billiardChain = Math.max(g.billiardChain || 1, opts.chain);
    } else if (!opts.keepChain) {
      g.billiardChain = 1;
    }
    if (g.aiState === 'windup' || g.aiState === 'charging') {
      g.aiState = 'stunned';
      g.stateTimer = Math.max(g.stateTimer, 1.35);
      g.skidding = false;
    }
    if (opts.stunDuration && opts.stunDuration > 0) {
      g.aiState = 'stunned';
      g.stateTimer = Math.max(g.stateTimer, opts.stunDuration);
    }
    g.hopping = false;
    g.hopZ = 0;
    g.squash = -0.34;
  }

  function computeSafeInwardPoint(x, y, edge, map) {
    let sx = x - edge.outwardX * 60;
    let sy = y - edge.outwardY * 60;
    const room = map && map.rooms ? map.rooms[edge.roomId] : null;
    if (room) {
      const margin = map.wallT / 2 + 26;
      sx = Math.max(room.x + margin, Math.min(room.x + room.w - margin, sx));
      sy = Math.max(room.y + margin, Math.min(room.y + room.h - margin, sy));
    }
    return { x: sx, y: sy };
  }

  function triggerGuardCliffDrop(g, edge, map) {
    if (!g || g.dead) return true;

    // 精英巨像保护机制：未破甲且血量高于 38% 时，在崖边惊险弹回并扣大血！
    if (g.isElite && g.armorBrokenTimer <= 0 && g.hp > g.maxHp * 0.38) {
      const inX = -edge.outwardX;
      const inY = -edge.outwardY;
      const safe = computeSafeInwardPoint(g.x, g.y, edge, map);
      g.x = safe.x;
      g.y = safe.y;

      const slamDmg = 42;
      g.hp = Math.max(1, g.hp - slamDmg);
      g.hitFlash = 1;
      g.squash = -0.46;
      g.billiardMode = false;
      g.skidding = false;
      g.aiState = 'stunned';
      g.stateTimer = Math.max(g.stateTimer, 1.45);
      g.knockVx = inX * 350;
      g.knockVy = inY * 350;

      if (CB.audio && CB.audio.playShieldClang) CB.audio.playShieldClang();
      if (CB.audio) CB.audio.playGuardState('stun');
      game.hitStop = Math.max(game.hitStop, 0.045);
      game.camera.shake = Math.max(game.camera.shake, 8.5);
      CB.player.spawnDust(g.x, g.y - 10, '#ffd859', 16, 1.65);
      CB.player.spawnPopup(
        g.x,
        g.y - g.radius - 28,
        `👑 ${g.name}攀崖弹回! -${slamDmg}（破甲/残血可击落）`,
        '#c95c1e'
      );
      return false;
    }

    // 秒杀击落云海！
    g.dead = true;
    g.billiardMode = false;
    if (game.run) {
      game.run.guardsDefeated += 1;
      game.run.cliffDrops += 1;
    }
    if (CB.extraction && CB.extraction.recordGuardDefeated) CB.extraction.recordGuardDefeated(g.kind);

    const curSpd = Math.hypot(g.knockVx || 0, g.knockVy || 0);
    const outSpd = Math.max(155, Math.min(340, curSpd * 0.58 + 125));
    game.fallingGuards.push({
      kind: g.kind,
      bodyColor: g.bodyColor,
      accentColor: g.accentColor,
      radius: g.radius,
      isElite: g.isElite,
      outwardX: edge.outwardX,
      outwardY: edge.outwardY,
      x: g.x + edge.outwardX * 10,
      y: g.y + edge.outwardY * 10,
      vx: edge.outwardX * outSpd + (g.knockVx || 0) * 0.22,
      vy: edge.outwardY * outSpd + (g.knockVy || 0) * 0.22 + 32,
      fallVy: 55,
      angle: 0,
      spin: (Math.random() < 0.5 ? 1 : -1) * (9.5 + Math.random() * 5),
      scale: 1,
      life: 1.05,
      maxLife: 1.05,
      trailTimer: 0,
    });

    if (CB.audio && CB.audio.playCliffDrop) CB.audio.playCliffDrop();
    game.hitStop = Math.max(game.hitStop, g.isElite ? 0.055 : 0.036);
    game.camera.shake = Math.max(game.camera.shake, g.isElite ? 9.5 : 6.4);

    // 掉落战利品与金币自动向岛内安全地面弹出，绝不让玩家损失收益！
    const hasCliffChime = !!(CB.extraction && CB.extraction.hasCurio('cliff_chime'));
    const safe = computeSafeInwardPoint(g.x, g.y, edge, map);
    const dropCoins = g.baseCoins + (g.stolenCoins || 0) + 2 + (hasCliffChime ? 4 : 0);
    const beforeLen = game.coinsList.length;
    CB.combat.spawnCoins(safe.x, safe.y, dropCoins, 1.05);
    for (let ci = beforeLen; ci < game.coinsList.length; ci++) {
      game.coinsList[ci].vx = game.coinsList[ci].vx * 0.55 - edge.outwardX * 95;
      game.coinsList[ci].vy = game.coinsList[ci].vy * 0.55 - edge.outwardY * 95;
      game.coinsList[ci].vz += 55;
    }

    const eliteBaseBounty = g.kind === 'colossus' ? 60 : 45;
    const cliffBounty = (g.isElite ? eliteBaseBounty : 25) + (hasCliffChime ? 15 : 0);
    if (CB.extraction && CB.extraction.addStuntBounty) {
      CB.extraction.addStuntBounty(cliffBounty);
    }
    if (CB.combat && CB.combat.grantOrbRefund) {
      CB.combat.grantOrbRefund(2, safe.x, safe.y, '崖杀回珠');
    }

    // 云海悬赏风铃：击落云海额外回 8 血 + 绿金星尘粒子！
    if (hasCliffChime && game.player && game.player.hp > 0) {
      const healed = Math.min(8, game.player.maxHp - game.player.hp);
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 8);
      CB.player.spawnDust(game.player.x, game.player.y - 12, '#6ee8a8', 9, 1.25);
      CB.player.spawnPopup(
        game.player.x,
        game.player.y - 46,
        healed > 0 ? `🔔 悬赏 +4金 · ♥+${Math.round(healed)}` : '🔔 悬赏 +4金!',
        '#259472'
      );
    }

    if (CB.extraction && CB.extraction.hasCurio('scarab') && CB.combat && CB.combat.spawnGravityVortex) {
      CB.combat.spawnGravityVortex(safe.x, safe.y, { duration: 3.6, radius: 176, pullForce: 265 });
    }

    CB.player.spawnDust(g.x, g.y - 8, '#ffffff', 12, 1.45);
    CB.player.spawnDust(g.x, g.y - 8, '#8ce8ff', 10, 1.55);
    CB.player.spawnPopup(
      safe.x,
      safe.y - 30,
      g.kind === 'colossus'
        ? `☁ 巨像击落云海! +${cliffBounty}💎`
        : g.isElite
        ? `☁ 精英击落云海! +${cliffBounty}💎`
        : `☁ 击落云海! +${cliffBounty}💎`,
      '#1d94c4'
    );
    return true;
  }

  function checkGuardOverCliffEdge(g, edge, map, forceAllow = false) {
    const nearX = Math.max(edge.x, Math.min(g.x, edge.x + edge.w));
    const nearY = Math.max(edge.y, Math.min(g.y, edge.y + edge.h));
    const dSq = (g.x - nearX) ** 2 + (g.y - nearY) ** 2;
    const triggerR = g.radius * 0.92;
    if (dSq >= triggerR * triggerR) return false;

    const outDot = (g.knockVx || 0) * edge.outwardX + (g.knockVy || 0) * edge.outwardY;
    const chargeDot = g.aiState === 'charging' ? (g.chargeDirX * edge.outwardX + g.chargeDirY * edge.outwardY) : 0;
    if (forceAllow || outDot > 25 || chargeDot > 0.25 || dSq < (g.radius * 0.45) ** 2) {
      triggerGuardCliffDrop(g, edge, map);
      return true;
    }
    return false;
  }

  /**
   * 统一受击与物理破防结算引擎
   * hitMeta = { source: 'bullet'|'billiard', slingshot, prism, bounced, stealthAmbush, fromPollen }
   */
  function damageGuard(g, rawDmg, dirX, dirY, isCrit, critTag, skipHitSfx = false, hitMeta = {}) {
    if (g.dead) return;
    if (CB.extraction && CB.extraction.recordGuardSeen) CB.extraction.recordGuardSeen(g.kind);

    const src = hitMeta.source || 'bullet';
    const isBilliard = src === 'billiard';
    const isSlingshot = !!hitMeta.slingshot;
    const isPrism = !!hitMeta.prism;
    const isBounced = !!hitMeta.bounced;
    const isStealth = !!hitMeta.stealthAmbush;
    const isVulnerable = g.aiState === 'stunned' || g.armorBrokenTimer > 0;

    let dmg = rawDmg;
    let finalTag = critTag;
    let finalCrit = isCrit;
    let blocked = false;
    let armorJustBroken = false;

    // 计算子弹入射方向是否打在守卫正面（dot < -0.22 表示迎面正面命中）
    const faceDot = dirX * Math.cos(g.facing) + dirY * Math.sin(g.facing);
    const isFrontHit = faceDot < -0.18;
    const isBackHit = faceDot > 0.25;

    // ===== 0. 相对论质增破甲（高速陨石/木箱携带 γ >= 1.55 直接轰碎任意重甲与巨像金甲！） =====
    const relGamma = hitMeta.relGamma || 1.0;
    if (relGamma >= 1.55 && (g.hasFrontShield || g.hasStarMembrane || g.hasThornShell || g.hasColossusArmor) && !isVulnerable) {
      g.armorBrokenTimer = 5.6;
      g.shellClosed = false;
      armorJustBroken = true;
      dmg = Math.round(dmg * 1.45);
      finalTag = `⚡ 相对论质增破甲 ×${relGamma.toFixed(1)}!`;
      finalCrit = true;
    }

    // ===== 0.5. 黑洞时间膨胀场内受击：蓄积动量与伤害，待奇点坍缩一瞬间全部引爆！ =====
    if (!hitMeta.skipDilationStore && CB.combat && CB.combat.getActiveSingularityAt && CB.combat.getActiveSingularityAt(g.x, g.y)) {
      const storeDmg = Math.max(8, Math.round(dmg * 0.72));
      const storeImp = hitMeta.launchSpeed
        ? hitMeta.launchSpeed
        : (hitMeta.isHeavy ? 520 + (hitMeta.chargeRatio || 0) * 240 : 180);
      g.dilatedStoredDmg = (g.dilatedStoredDmg || 0) + storeDmg;
      g.dilatedStoredVx = (g.dilatedStoredVx || 0) + dirX * storeImp;
      g.dilatedStoredVy = (g.dilatedStoredVy || 0) + dirY * storeImp;
      dmg = Math.max(4, Math.round(dmg * 0.32));
      g.hitFlash = 1;
      g.squash = -0.25;
      g.hp -= dmg;
      CB.player.spawnDust(g.x, g.y - 10, '#c699ff', 7, 1.1);
      CB.player.spawnPopup(g.x, g.y - g.radius - 26, `⏳ 动量蓄积 +${Math.round(storeImp)}`, '#884ee0');
      if (CB.audio && !skipHitSfx) CB.audio.playHit(true);
      if (g.hp <= 0) {
        g.hp = 1;
      }
      return { blocked: false, armorJustBroken, killed: false, dilatedStored: true };
    }

    // ===== 1. 荷叶盾甲冲锋卫：正面举盾格挡直线弹！ =====
    if (g.hasFrontShield && !isVulnerable && !armorJustBroken) {
      if (isBilliard) {
        // 台球木箱高速直接砸碎青铜荷叶大盾！
        g.armorBrokenTimer = 5.2;
        armorJustBroken = true;
        dmg = Math.round(dmg * 1.65);
        finalTag = '💥 砸碎荷叶大盾!';
        finalCrit = true;
      } else if (isFrontHit) {
        // 正面直线命中直接被大盾弹开！
        blocked = true;
        dmg = 2;
        finalCrit = false;
        finalTag = g.hintCooldown <= 0 ? '🛡️ 举盾格挡! 用滑道木箱/绕背' : '🛡️ 格挡!';
        g.hintCooldown = 1.6;
      } else if (isBackHit || isBounced) {
        dmg = Math.round(dmg * 1.55);
        finalTag = '⚡ 绕背破盾!';
        finalCrit = true;
      }
    }

    // ===== 2. 露泡跳蛙偶：台球撞击双倍重创 =====
    if (g.kind === 'dew_hopper' && isBilliard) {
      dmg = Math.round(dmg * 1.85);
      finalTag = '🎱 滑道全垒打!';
      finalCrit = true;
    }

    // ===== 3. 占星光盾偶：折光膜抵御 80% 直线子弹，星轨弯道/棱镜一击破膜！ =====
    if (g.hasStarMembrane && !isVulnerable) {
      if (isSlingshot || isPrism) {
        g.armorBrokenTimer = 6.2;
        armorJustBroken = true;
        dmg = Math.round(dmg * 1.85);
        finalTag = isSlingshot ? '🪐 星轨击碎光膜!' : '✦ 棱镜穿透光膜!';
        finalCrit = true;
      } else if (isBounced) {
        g.armorBrokenTimer = 3.2;
        armorJustBroken = true;
        dmg = Math.round(dmg * 1.25);
        finalTag = '✨ 折射裂膜!';
        finalCrit = true;
      } else if (!isBilliard) {
        blocked = true;
        dmg = Math.max(3, Math.round(dmg * 0.2));
        finalCrit = false;
        finalTag = g.hintCooldown <= 0 ? '✨ 光膜抗直! 用星轨弯道/棱镜' : '✨ 光膜抵御!';
        g.hintCooldown = 1.6;
      }
    }

    // ===== 4. 彗星双子偶：星轨/棱镜双倍克制 =====
    if (g.kind === 'comet_orbiter' && (isSlingshot || isPrism)) {
      dmg = Math.round(dmg * 1.7);
      finalTag = isSlingshot ? '🪐 彗星拦截暴击!' : '✦ 棱镜破星!';
      finalCrit = true;
    }

    // ===== 5. 荆棘警哨眼：未警觉/花粉偷袭触发绝杀伏击；正面硬刚则缩壳减伤 75%！ =====
    if (g.hasThornShell) {
      const unaware = g.aiState === 'patrol' || g.aiState === 'investigate';
      if ((isStealth || unaware) && !g.shellClosed) {
        dmg = Math.round(dmg * 2.45);
        finalTag = '🌼 绝杀伏击!';
        finalCrit = true;
        armorJustBroken = true;
      } else if (g.shellClosed && !isVulnerable && !isBilliard) {
        blocked = true;
        dmg = Math.max(3, Math.round(dmg * 0.25));
        finalCrit = false;
        finalTag = g.hintCooldown <= 0 ? '🌵 缩壳硬甲! 用花粉雾/风铃偷袭' : '🌵 荆棘硬甲!';
        g.hintCooldown = 1.6;
      }
    }

    // ===== 6. 花穹守卫巨像（第 4 关精英）：吃全部三种物理破防！ =====
    if (g.hasColossusArmor && !isVulnerable) {
      if (isBilliard || isSlingshot || isPrism || isStealth) {
        g.armorBrokenTimer = 4.6;
        armorJustBroken = true;
        dmg = Math.round(dmg * 1.65);
        finalTag = '👑 物理破防巨像!';
        finalCrit = true;
      } else {
        blocked = true;
        dmg = Math.max(4, Math.round(dmg * 0.35));
        finalCrit = false;
        finalTag = g.hintCooldown <= 0 ? '👑 金甲抗直! 用滑道/星轨/花粉破防' : '👑 金甲减伤!';
        g.hintCooldown = 1.6;
      }
    }

    // 破防脆弱期额外增伤
    if (isVulnerable && !blocked) {
      dmg = Math.round(dmg * 1.35);
    }

    g.hp -= dmg;
    g.hitFlash = 1;
    g.squash = blocked ? -0.14 : -0.36;

    const isHeavyShot = !!hitMeta.isHeavy;
    const isOverclock = !!hitMeta.isOverclock;
    const isNeedle = !!hitMeta.isNeedle;
    const chargeRatio = hitMeta.chargeRatio || 0;
    const isChainHit = !!hitMeta.isChain;
    const onDew = !!(CB.combat && CB.combat.getDewSlideAt && CB.combat.getDewSlideAt(g.x, g.y));

    if (blocked) {
      g.knockVx += dirX * (isNeedle ? 12 : 45);
      g.knockVy += dirY * (isNeedle ? 12 : 45);
    } else if (!isChainHit) {
      const shouldBilliard = isBilliard || isHeavyShot || isSlingshot || armorJustBroken || (!isNeedle && (isVulnerable || !!g.skidding));
      if (shouldBilliard) {
        const massInv = 1 / Math.sqrt(g.mass || 1);
        const dewBoost = onDew ? 1.24 : 1.0;
        const hasGaleFan = !!(CB.extraction && CB.extraction.hasCurio('gale_fan'));
        const fanBoost = hasGaleFan && (isHeavyShot || isSlingshot) ? 1.35 : 1.0;
        const ocBoost = isOverclock ? 1.30 : 1.0;
        let launchSpd = hitMeta.launchSpeed
          ? hitMeta.launchSpeed * massInv
          : isBilliard
          ? 575 * massInv
          : isSlingshot
          ? 560 * massInv * fanBoost * ocBoost
          : isHeavyShot
          ? (440 + chargeRatio * 230) * massInv * fanBoost * ocBoost
          : 400 * massInv;
        const gustInfo = getGustBoostForDir(dirX, dirY);
        launchSpd *= dewBoost * gustInfo.mult;
        const stunDur = isBilliard ? 1.85 : (isHeavyShot && (chargeRatio >= 0.72 || isOverclock) ? 0.95 : 0);
        launchGuardBilliard(g, dirX * launchSpd + gustInfo.addVx, dirY * launchSpd + gustInfo.addVy, { stunDuration: stunDur });
      } else if (!isNeedle) {
        const kb = (isCrit ? 265 : 150) / Math.sqrt(g.mass || 1);
        g.knockVx += dirX * kb;
        g.knockVy += dirY * kb;
      }
    }

    if (blocked) {
      if (CB.audio && CB.audio.playShieldClang) CB.audio.playShieldClang();
      CB.player.spawnDust(g.x - dirX * g.radius * 0.8, g.y - 12, '#fff0a8', 6, 1.0);
    } else if (armorJustBroken) {
      if (CB.audio && CB.audio.playShieldBreak) CB.audio.playShieldBreak();
      g.aiState = 'stunned';
      g.stateTimer = Math.max(g.stateTimer, g.isElite ? 1.8 : 2.1);
      g.shellClosed = false;
      game.hitStop = Math.max(game.hitStop, 0.052);
      game.camera.shake = Math.max(game.camera.shake, 7.2);
      CB.player.spawnDust(g.x, g.y - 12, '#ffe475', 16, 1.75);
      CB.player.spawnDust(g.x, g.y - 12, '#80ecff', 10, 1.5);
    } else {
      if (CB.audio && !skipHitSfx) CB.audio.playHit(finalCrit);
      game.hitStop = Math.max(game.hitStop, finalCrit ? 0.038 : 0.018);
      game.camera.shake = Math.max(game.camera.shake, finalCrit ? 5.0 : 2.4);
    }

    const dmgColor = blocked ? '#7a8a96' : (armorJustBroken ? '#e07a18' : (finalCrit ? '#e03e2d' : '#2d4b52'));
    const label = finalTag ? `${finalTag} -${dmg}` : `-${dmg}`;
    CB.player.spawnPopup(g.x, g.y - g.radius - 20, label, dmgColor);

    // 受击反应：荆棘警哨眼被正面非绝杀打中会立刻缩壳摇人！
    if (g.aiState === 'patrol' || g.aiState === 'investigate') {
      if (g.hasThornShell && !armorJustBroken && !isStealth && g.hp > 0) {
        g.shellClosed = true;
        g.aiState = 'chase';
        if (CB.audio) CB.audio.playGuardState('alert');
        CB.combat.emitSoundRipple(g.x, g.y, 340, 'loud', '#e07248');
      } else if (!armorJustBroken) {
        g.aiState = g.kind === 'vine_magnet' && g.stolenCoins >= 3 ? 'flee' : 'chase';
        if (CB.audio) CB.audio.playGuardState('alert');
      }
    }

    if (g.hp <= 0) {
      g.dead = true;
      if (game.run) game.run.guardsDefeated += 1;
      if (CB.extraction && CB.extraction.recordGuardDefeated) CB.extraction.recordGuardDefeated(g.kind);
      if (CB.audio) CB.audio.playGuardDefeat();
      game.camera.shake = Math.max(game.camera.shake, g.isElite ? 9.0 : 6.0);
      CB.player.spawnDust(g.x, g.y - 10, g.bodyColor, 14, 1.7);
      CB.player.spawnDust(g.x, g.y - 10, '#ffe07d', 8, 1.4);

      const dropCoins = g.baseCoins + (g.stolenCoins || 0);
      CB.combat.spawnCoins(g.x, g.y, dropCoins, 1.25);
      if (CB.extraction && CB.extraction.hasCurio('scarab') && CB.combat && CB.combat.spawnGravityVortex) {
        CB.combat.spawnGravityVortex(g.x, g.y, { duration: 3.6, radius: 176, pullForce: 265 });
      }
      const deathText = g.stolenCoins > 0
        ? `夺回 +${g.stolenCoins} 金币!`
        : `${g.name} 击破!`;
      CB.player.spawnPopup(g.x, g.y - 34, deathText, '#d49014');
    }
    return { blocked, armorJustBroken, killed: g.dead };
  }

  function canSeePlayer(g, player) {
    const dx = player.x - g.x;
    const dy = player.y - g.y;
    const dist = Math.hypot(dx, dy);
    if (dist > g.sightRange) return false;
    if (player.inPollen && dist > 42) return false;

    const ang = Math.atan2(dy, dx);
    let diff = ang - g.facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > g.fov) return false;

    const ray = CB.combat.raycastScene(g.x, g.y, dx / (dist || 1), dy / (dist || 1), dist, {
      pad: 2,
      includeGuards: false,
      includeDestructibles: true,
      includeClosedGates: true,
    });
    return !ray.hit;
  }

  function updateGuards(dt) {
    const map = game.map;
    const player = game.player;
    if (!map) return;

    for (let i = game.guards.length - 1; i >= 0; i--) {
      const g = game.guards[i];
      if (g.dead) {
        game.guards.splice(i, 1);
        continue;
      }

      const timeScale = CB.combat && CB.combat.getTimeScaleAt ? CB.combat.getTimeScaleAt(g.x, g.y) : 1.0;
      g.isTimeDilated = timeScale < 0.5;
      const gDt = dt * timeScale;

      if (g.hitFlash > 0) g.hitFlash = Math.max(0, g.hitFlash - dt * 6);
      if (g.wormholeCd > 0) g.wormholeCd = Math.max(0, g.wormholeCd - dt);
      if (g.orbitReleaseCd > 0) g.orbitReleaseCd = Math.max(0, g.orbitReleaseCd - dt);
      if (g.armorBrokenTimer > 0) g.armorBrokenTimer = Math.max(0, g.armorBrokenTimer - gDt);
      if (g.chargeCooldown > 0) g.chargeCooldown -= gDt;
      if (g.siphonCooldown > 0) g.siphonCooldown -= gDt;
      if (g.snareCooldown > 0) g.snareCooldown -= gDt;
      if (g.fireCooldown > 0) g.fireCooldown -= gDt;
      if (g.sneezeCooldown > 0) g.sneezeCooldown -= gDt;
      if (g.hintCooldown > 0) g.hintCooldown -= gDt;
      if (g.orreryLaunchCd > 0) g.orreryLaunchCd = Math.max(0, g.orreryLaunchCd - gDt);
      if (g.slideSoundTimer > 0) g.slideSoundTimer = Math.max(0, g.slideSoundTimer - gDt);

      // ===== 真实轨道捕获公转加速（守卫化身高速红温卫星，点射或满圈切线甩出！） =====
      if (g.orbitOrreryId) {
        const orr = map.props.find((p) => p.id === g.orbitOrreryId && p.type === 'orrery');
        if (!orr || orr.polarity < 0) {
          g.orbitOrreryId = null;
        } else {
          const lorentzAcc = CB.extraction && CB.extraction.hasCurio('lorentz_prism') ? 1.28 : 1.0;
          g.orbitTime = (g.orbitTime || 0) + gDt;
          g.orbitSpeed = Math.min(980, (g.orbitSpeed || 460) + 310 * lorentzAcc * gDt);
          const angSpd = g.orbitSpeed / Math.max(54, g.orbitRadius || 78);
          g.orbitAngle += (g.orbitDir || 1) * angSpd * gDt;
          g.x = orr.x + Math.cos(g.orbitAngle) * g.orbitRadius;
          g.y = orr.y + Math.sin(g.orbitAngle) * g.orbitRadius;
          const tangA = g.orbitAngle + (g.orbitDir || 1) * (Math.PI / 2);
          g.knockVx = Math.cos(tangA) * g.orbitSpeed;
          g.knockVy = Math.sin(tangA) * g.orbitSpeed;
          g.billiardMode = true;
          g.billiardSpin += gDt * (12 + g.orbitSpeed * 0.02);
          g.relGamma = CB.combat && CB.combat.getRelativisticGamma ? CB.combat.getRelativisticGamma(g.orbitSpeed) : 1.0;
          orr.orbitGlow = Math.max(orr.orbitGlow || 0, 0.95);
          g.billiardTrail.push({ x: g.x, y: g.y, dew: false, rel: g.relGamma > 1.3 });
          if (g.billiardTrail.length > 10) g.billiardTrail.shift();

          for (const other of game.guards) {
            if (other === g || other.dead) continue;
            if (Math.hypot(other.x - g.x, other.y - g.y) < g.radius + other.radius + 5) {
              if (CB.combat && CB.combat.releaseOrbitingBodies) CB.combat.releaseOrbitingBodies(orr, g);
              break;
            }
          }
          if (g.orbitOrreryId && g.orbitTime >= 1.65) {
            if (CB.combat && CB.combat.releaseOrbitingBodies) CB.combat.releaseOrbitingBodies(orr, g);
          }
          continue;
        }
      }
      if (g.billiardHitCd) {
        for (const key in g.billiardHitCd) {
          g.billiardHitCd[key] -= dt;
          if (g.billiardHitCd[key] <= 0) delete g.billiardHitCd[key];
        }
      }
      if (g.siphonBeam) {
        g.siphonBeam.timer -= dt;
        if (g.siphonBeam.timer <= 0) g.siphonBeam = null;
      }
      g.squash *= Math.exp(-12 * dt);

      const onDewSlide = !!(CB.combat && CB.combat.getDewSlideAt && CB.combat.getDewSlideAt(g.x, g.y));
      g.onDewSlide = onDewSlide;

      // 守卫被活跃引力漩涡吸中：占星光盾偶的折光膜会被引力撕裂！
      if (g.hasStarMembrane && g.armorBrokenTimer <= 0 && game.vortices) {
        for (const v of game.vortices) {
          if (Math.hypot(g.x - v.x, g.y - v.y) < v.radius * 0.65) {
            g.armorBrokenTimer = 4.2;
            if (CB.audio && CB.audio.playShieldBreak) CB.audio.playShieldBreak();
            CB.player.spawnPopup(g.x, g.y - g.radius - 22, '🌀 漩涡撕裂光膜!', '#2498c4');
            break;
          }
        }
      }

      // 斥力星轨仪：将靠近的守卫直接高速弹飞进入「怪物台球弹飞态」！
      if (g.orreryLaunchCd <= 0 && !g.billiardMode) {
        for (const prop of map.props) {
          if (prop.type === 'orrery' && prop.polarity < 0) {
            const dx = g.x - prop.x;
            const dy = g.y - prop.y;
            const d = Math.hypot(dx, dy);
            const triggerR = g.kind === 'comet_orbiter' ? 158 : 132;
            if (d < triggerR && d > 1) {
              g.orreryLaunchCd = 0.85;
              const spd = (g.kind === 'comet_orbiter' ? 620 : 540) / Math.sqrt(g.mass || 1);
              launchGuardBilliard(g, (dx / d) * spd, (dy / d) * spd, { stunDuration: 1.5 });
              prop.pulse = 1;
              if (CB.audio && CB.audio.playRepelWave) CB.audio.playRepelWave();
              CB.player.spawnDust(g.x, g.y - 10, '#ffae66', 10, 1.35);
              CB.player.spawnPopup(g.x, g.y - g.radius - 24, '☀ 斥力星轨弹飞!', '#d96b27');
              break;
            }
          }
        }
      }

      // ==================== 怪物台球高速滑行与两极摩擦引擎 ====================
      const kSpd0 = Math.hypot(g.knockVx, g.knockVy);
      if (g.billiardMode) {
        g.billiardSpin += dt * (8 + kSpd0 * 0.018);
        g.relGamma = CB.combat && CB.combat.getRelativisticGamma ? CB.combat.getRelativisticGamma(kSpd0) : 1.0;
        const steps = kSpd0 > 320 ? 3 : 2;
        const subDt = gDt / steps;
        for (let s = 0; s < steps; s++) {
          if (g.dead || !g.billiardMode || g.orbitOrreryId) break;
          moveGuardBilliardStep(g, subDt, map);
        }
        if (g.dead) {
          game.guards.splice(i, 1);
          continue;
        }

        const nowOnSlide = !!(CB.combat && CB.combat.getDewSlideAt && CB.combat.getDewSlideAt(g.x, g.y));
        g.onDewSlide = nowOnSlide;
        const kSpdNow = Math.hypot(g.knockVx, g.knockVy);
        const hasWax = !!(CB.extraction && CB.extraction.hasCurio('billiard_wax'));
        const activeGust = CB.extraction && CB.extraction.getActiveGust ? CB.extraction.getActiveGust() : null;
        const gustAlign = activeGust && kSpdNow > 1
          ? (g.knockVx * activeGust.dirX + g.knockVy * activeGust.dirY) / kSpdNow
          : 0;
        // 两极摩擦：冰镜露水滑道极低阻尼超远飙滑（105/s），粗糙石砖高阻尼（1120/s）；顺阵风大幅减阻并持续吹推！
        const baseDecel = nowOnSlide ? 105 : 1120;
        const gustDecelMult = activeGust && gustAlign > 0.15 ? 0.62 : 1.0;
        const decel = (hasWax ? baseDecel * 0.65 : baseDecel) * gustDecelMult * gDt;
        const nextSpd = Math.max(0, kSpdNow - decel);
        if (kSpdNow > 0.001) {
          g.knockVx = (g.knockVx / kSpdNow) * nextSpd;
          g.knockVy = (g.knockVy / kSpdNow) * nextSpd;
        }
        if (activeGust) {
          const windAcc = 390 / Math.sqrt(g.mass || 1);
          g.knockVx += activeGust.dirX * windAcc * dt;
          g.knockVy += activeGust.dirY * windAcc * dt;
          if (Math.random() < 0.45) {
            CB.player.spawnDust(g.x, g.y - 8, '#c8f5ff', 1, 0.9);
          }
        }

        if (nowOnSlide && nextSpd > 90) {
          if (Math.random() < 0.5) CB.player.spawnDust(g.x, g.y + 3, '#8ae8f7', 1, 0.7);
          if (g.slideSoundTimer <= 0) {
            g.slideSoundTimer = 0.25;
            if (CB.audio && CB.audio.playDewSlide) CB.audio.playDewSlide();
          }
        }

        g.billiardTrail.push({ x: g.x, y: g.y, dew: nowOnSlide, rel: (g.relGamma || 1) > 1.35 });
        if (g.billiardTrail.length > 7) g.billiardTrail.shift();

        if (nextSpd < (nowOnSlide ? 80 : 112)) {
          g.billiardMode = false;
          g.billiardChain = 0;
        }
        // 台球弹飞期间暂停普通 AI 动作，专注纯粹物理滑行与连撞
        g.keyAngle += dt * 4.5;
        continue;
      } else {
        if (g.billiardTrail && g.billiardTrail.length > 0) g.billiardTrail.shift();
        if (kSpd0 > 5) {
          moveGuardWithCollisions(g, g.knockVx * dt, g.knockVy * dt, map, false, kSpd0 > 105);
          if (g.dead) {
            game.guards.splice(i, 1);
            continue;
          }
          const damp = onDewSlide ? 2.4 : 10;
          g.knockVx *= Math.exp(-damp * dt);
          g.knockVy *= Math.exp(-damp * dt);
        }
      }

      const ink = CB.combat.getInkAt(g.x, g.y);
      const slowMult = (ink ? 0.52 : 1.0) * timeScale;

      // 踏入金色花粉隐身雾：打喷嚏眩晕并强制解除荆棘缩壳/护盾！
      if (g.aiState !== 'stunned' && g.sneezeCooldown <= 0 && CB.combat.isInPollen(g.x, g.y)) {
        g.aiState = 'stunned';
        g.stateTimer = 2.2;
        g.sneezeCooldown = 4.5;
        g.shellClosed = false;
        g.armorBrokenTimer = Math.max(g.armorBrokenTimer, 4.0);
        g.squash = -0.35;
        if (CB.audio) CB.audio.playSneeze();
        CB.player.spawnDust(g.x, g.y - 12, '#ffe46b', 10, 1.25);
        CB.player.spawnPopup(g.x, g.y - g.radius - 24, '阿嚏! 🤧 破防眩晕', '#c98812');
        CB.combat.emitSoundRipple(g.x, g.y, 175, 'pollen', '#e8b931');
      }

      // 视野检测
      const sees = canSeePlayer(g, player);
      if (g.aiState === 'chase' && player.inPollen && !sees) {
        g.aiState = 'investigate';
        g.shellClosed = false;
        g.investigatePos = { x: g.x + Math.cos(g.facing) * 60, y: g.y + Math.sin(g.facing) * 60 };
        g.stateTimer = 2.6;
        CB.player.spawnPopup(g.x, g.y - g.radius - 22, '? 失去视野', '#c4761c');
      } else if (sees && g.aiState !== 'windup' && g.aiState !== 'charging' && g.aiState !== 'stunned') {
        const wasPassive = g.aiState === 'patrol' || g.aiState === 'investigate';
        if (wasPassive) {
          if (CB.audio) CB.audio.playGuardState('alert');
          CB.player.spawnPopup(g.x, g.y - g.radius - 22, g.hasThornShell ? '! 缩壳警报' : '! 发现入侵者', '#c83e30');
          g.squash = 0.28;
          if (g.hasThornShell) {
            g.shellClosed = true;
            CB.combat.emitSoundRipple(g.x, g.y, 320, 'loud', '#e07248');
          }
        }
        g.aiState = g.kind === 'vine_magnet' && g.stolenCoins >= 4 ? 'flee' : 'chase';
      }

      // 吸金藤妖偶专属：吸附地面金币 + 近距吸走玩家金币 + 抛减速藤网
      if (g.kind === 'vine_magnet' && g.aiState !== 'stunned') {
        g.magnetPulse += dt * 4.6;
        const pullR = 175;
        for (let ci = game.coinsList.length - 1; ci >= 0; ci--) {
          const c = game.coinsList[ci];
          const d = Math.hypot(g.x - c.x, g.y - c.y);
          if (d < pullR) {
            const pull = 280 + (1 - d / pullR) * 180;
            c.x += ((g.x - c.x) / (d || 1)) * pull * dt;
            c.y += ((g.y - c.y) / (d || 1)) * pull * dt;
            if (d < g.radius + 9) {
              g.stolenCoins += c.value;
              g.squash = 0.22;
              if (CB.audio) CB.audio.playGuardState('magnet');
              game.coinsList.splice(ci, 1);
            }
          }
        }

        const pDist = Math.hypot(player.x - g.x, player.y - g.y);
        if (pDist < 155 && g.siphonCooldown <= 0 && player.coins > 0 && (g.aiState === 'chase' || g.aiState === 'flee')) {
          player.coins = Math.max(0, player.coins - 1);
          g.stolenCoins += 1;
          g.siphonCooldown = 1.4;
          g.siphonBeam = { tx: player.x, ty: player.y, timer: 0.32 };
          g.squash = 0.26;
          if (CB.audio) CB.audio.playGuardState('magnet');
          CB.player.spawnPopup(g.x, g.y - g.radius - 24, '吸金藤蔓 +1!', '#2e8b75');
          if (g.stolenCoins >= 4) g.aiState = 'flee';
        }
      }

      // ================= 分主题 AI 行为与多样攻击模式 =================
      const distToPlayer = Math.hypot(player.x - g.x, player.y - g.y);
      let movedSpeed = 0;

      if (g.aiState === 'patrol') {
        g.shellClosed = false;
        const wp = g.waypoints[g.wpIndex];
        const dist = Math.hypot(wp.x - g.x, wp.y - g.y);
        if (dist < 18) {
          g.lookPause += dt;
          g.facing += Math.sin(game.time * 2.2) * dt * 0.9;
          if (g.lookPause > 0.85) {
            g.lookPause = 0;
            g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
          }
        } else {
          const spd = g.speed * slowMult;
          steerGuardToward(g, wp.x, wp.y, spd, dt, map);
          movedSpeed = spd;
        }
      } else if (g.aiState === 'investigate' && g.investigatePos) {
        g.shellClosed = false;
        const dist = Math.hypot(g.investigatePos.x - g.x, g.investigatePos.y - g.y);
        g.stateTimer -= dt;
        if (dist < 28) {
          g.facing += Math.sin(game.time * 5.2) * dt * 2.4;
          if (g.stateTimer <= 1.2) g.aiState = 'patrol';
        } else {
          const spd = g.speed * 1.18 * slowMult;
          steerGuardToward(g, g.investigatePos.x, g.investigatePos.y, spd, dt, map);
          movedSpeed = spd;
        }
        if (g.stateTimer <= 0) g.aiState = 'patrol';
      } else if (g.aiState === 'chase') {
        if (distToPlayer > 560 && !sees) {
          g.aiState = 'patrol';
          g.shellClosed = false;
        } else if (g.kind === 'shield_charger' || g.kind === 'lotus_warden' || g.kind === 'colossus') {
          // 荷叶盾甲冲锋卫 / 荷叶巨盾领主 / 巨像：举盾推进 + 蓄力冲锋 + 精英专属水浪/星环
          const canCharge = distToPlayer < (g.kind === 'lotus_warden' ? 285 : 265) && g.chargeCooldown <= 0 && sees;
          if (g.kind === 'colossus' && g.fireCooldown <= 0 && sees) {
            g.bossCycle = (g.bossCycle + 1) % 2;
            if (g.bossCycle === 0) {
              g.fireCooldown = 2.6;
              fireStarRing(g, 8, 255, '#ffd859');
              CB.player.spawnPopup(g.x, g.y - g.radius - 22, '☀ 太阳星弹环!', '#d48d14');
            } else if (canCharge) {
              startChargeWindup(g, player);
              g.fireCooldown = 2.4;
            } else {
              g.fireCooldown = 1.6;
              fireStarVolley(g, 3);
            }
          } else if (g.kind === 'lotus_warden' && g.fireCooldown <= 0 && sees && !canCharge) {
            g.fireCooldown = 2.3;
            g.facing = Math.atan2(player.y - g.y, player.x - g.x);
            fireWaterFan(g, 5);
            CB.player.spawnPopup(g.x, g.y - g.radius - 22, '🌊 巨盾荷浪!', '#218ba8');
          } else if (canCharge) {
            startChargeWindup(g, player);
          } else {
            const spd = g.chaseSpeed * slowMult;
            steerGuardToward(g, player.x, player.y, spd, dt, map);
            movedSpeed = spd;
          }
        } else if (g.kind === 'dew_hopper') {
          // 露泡跳蛙偶：蓄力蛙跃 + 落地四向弹跳露泡！
          if (g.hopping) {
            g.hopTimer -= dt;
            const t = Math.max(0, 1 - g.hopTimer / 0.42);
            g.hopZ = Math.sin(t * Math.PI) * 32;
            moveGuardWithCollisions(g, g.hopVx * dt, g.hopVy * dt, map, false);
            movedSpeed = Math.hypot(g.hopVx, g.hopVy);
            if (g.hopTimer <= 0) {
              g.hopping = false;
              g.hopZ = 0;
              g.hopTimer = 1.05;
              g.squash = -0.35;
              fireBubbleSplash(g);
              // 若落在露水滑道上额外滑行一小段
              if (CB.combat.getDewSlideAt && CB.combat.getDewSlideAt(g.x, g.y)) {
                g.knockVx += g.hopVx * 0.55;
                g.knockVy += g.hopVy * 0.55;
              }
            }
          } else {
            g.facing = Math.atan2(player.y - g.y, player.x - g.x);
            g.hopTimer -= dt;
            if (g.hopTimer <= 0) {
              g.hopping = true;
              g.hopTimer = 0.42;
              const jumpSpd = 290 * slowMult;
              g.hopVx = Math.cos(g.facing) * jumpSpd;
              g.hopVy = Math.sin(g.facing) * jumpSpd;
              g.squash = 0.36;
              if (CB.audio && CB.audio.playFrogHop) CB.audio.playFrogHop();
            }
          }
        } else if (g.kind === 'astro_sentinel' || g.kind === 'astro_archon') {
          // 占星光盾偶 & 双环占星仪偶：悬浮拉距，精英轮换 5 连弯曲星弧与 6 向金星环！
          g.facing = Math.atan2(player.y - g.y, player.x - g.x);
          const spd = g.chaseSpeed * slowMult;
          if (distToPlayer > 190) {
            steerGuardToward(g, player.x, player.y, spd, dt, map);
            movedSpeed = spd;
          } else if (distToPlayer < 115) {
            steerGuardToward(g, g.x - (player.x - g.x), g.y - (player.y - g.y), spd * 0.7, dt, map);
            movedSpeed = spd * 0.7;
          }
          if (g.fireCooldown <= 0 && sees) {
            if (g.kind === 'astro_archon') {
              g.bossCycle = (g.bossCycle + 1) % 2;
              if (g.bossCycle === 0) {
                g.fireCooldown = 2.15;
                fireStarVolley(g, 5);
                CB.player.spawnPopup(g.x, g.y - g.radius - 22, '🪐 双环星弧!', '#d99e26');
              } else {
                g.fireCooldown = 2.35;
                fireStarRing(g, 6, 240, '#ffe066');
              }
            } else {
              g.fireCooldown = 1.95;
              fireStarVolley(g, 3);
            }
          }
        } else if (g.kind === 'comet_orbiter') {
          // 彗星双子偶：切向绕圈游走 + 释放 6 向星环扩散波
          const angToP = Math.atan2(player.y - g.y, player.x - g.x);
          g.facing = angToP;
          const tangent = angToP + g.orbitDir * (Math.PI * 0.44);
          const radialBias = distToPlayer > 210 ? 0.35 : (distToPlayer < 120 ? -0.35 : 0);
          const moveAng = tangent - g.orbitDir * radialBias;
          const spd = g.chaseSpeed * slowMult;
          const res = moveGuardWithCollisions(g, Math.cos(moveAng) * spd * dt, Math.sin(moveAng) * spd * dt, map, false);
          if (res.hitSolid) g.orbitDir *= -1;
          movedSpeed = spd;
          if (g.fireCooldown <= 0 && sees) {
            g.fireCooldown = 2.35;
            fireStarRing(g, 6, 230, '#8cf0ff');
          }
        } else if (g.kind === 'vine_stalker' || g.kind === 'vine_elder') {
          // 荆棘警哨眼 & 古藤警哨长老：警戒缩壳减伤，长老轮换 5 连毒刺与减速藤网！
          g.shellClosed = g.armorBrokenTimer <= 0;
          g.facing = Math.atan2(player.y - g.y, player.x - g.x);
          const spd = g.chaseSpeed * 0.82 * slowMult;
          if (distToPlayer > 145) {
            steerGuardToward(g, player.x, player.y, spd, dt, map);
            movedSpeed = spd;
          }
          if (g.fireCooldown <= 0 && sees) {
            if (g.kind === 'vine_elder') {
              g.fireCooldown = 1.95;
              fireThornBurst(g, 5);
            } else {
              g.fireCooldown = 1.85;
              fireThornBurst(g, 3);
            }
          }
          if (g.kind === 'vine_elder' && g.snareCooldown <= 0 && distToPlayer < 260 && sees) {
            g.snareCooldown = 4.2;
            CB.combat.spawnInkPuddle(player.x, player.y, '#3e8c60');
            CB.player.spawnPopup(player.x, player.y - 32, '🌿 长老古藤网!', '#2a754c');
          }
        } else {
          // 吸金藤妖偶：贴近吸金 + 抛藤蔓减速网
          const spd = g.chaseSpeed * slowMult;
          steerGuardToward(g, player.x, player.y, spd, dt, map);
          movedSpeed = spd;
          if (g.snareCooldown <= 0 && distToPlayer < 230 && sees) {
            g.snareCooldown = 3.8;
            CB.combat.spawnInkPuddle(player.x, player.y, '#4c9c6e');
            CB.player.spawnPopup(player.x, player.y - 30, '🌿 藤蔓缠足!', '#2f7a52');
          }
        }
      } else if (g.aiState === 'windup') {
        g.stateTimer -= dt;
        if (g.stateTimer > 0.25) {
          g.facing = Math.atan2(player.y - g.y, player.x - g.x);
          g.chargeDirX = Math.cos(g.facing);
          g.chargeDirY = Math.sin(g.facing);
        }
        if (g.stateTimer <= 0) {
          g.aiState = 'charging';
          g.stateTimer = 0.72;
          g.skidding = false;
          g.squash = 0.35;
          CB.player.spawnDust(g.x, g.y, '#e3c39b', 8, 1.3);
        }
      } else if (g.aiState === 'charging') {
        const onSlide = !!(CB.combat && CB.combat.getDewSlideAt && CB.combat.getDewSlideAt(g.x, g.y));
        if (onSlide && !g.skidding) {
          g.skidding = true;
          g.stateTimer = Math.max(g.stateTimer, 1.15);
          if (CB.audio && CB.audio.playDewSlide) CB.audio.playDewSlide();
          CB.player.spawnPopup(g.x, g.y - g.radius - 24, '⛸ 露水打滑失控!', '#1e8da3');
        }

        const chargeSpd = (g.skidding ? 515 : 445) * slowMult;
        movedSpeed = chargeSpd;
        const res = moveGuardWithCollisions(g, g.chargeDirX * chargeSpd * dt, g.chargeDirY * chargeSpd * dt, map, true, true);
        if (g.dead) {
          game.guards.splice(i, 1);
          continue;
        }

        if (Math.random() < 0.6) {
          CB.player.spawnDust(g.x - g.chargeDirX * 14, g.y, g.skidding ? '#8ae8f7' : '#e6cfb2', 1, 0.85);
        }

        if (Math.hypot(player.x - g.x, player.y - g.y) < player.radius + g.radius && player.dashTimer <= 0) {
          CB.player.damagePlayer(g.touchDamage, g.chargeDirX, g.chargeDirY);
        }

        g.stateTimer -= onSlide ? gDt * 0.2 : gDt;
        if (res.hitSolid) {
          const wasSkid = g.skidding;
          g.skidding = false;
          g.aiState = 'stunned';
          g.stateTimer = wasSkid ? 2.8 : 2.0;
          g.chargeCooldown = 2.1;
          // 荷叶盾甲冲锋卫/巨像在滑道上打滑狠狠撞墙 -> 直接震落大盾破防！
          if (wasSkid || res.isSuper) {
            g.armorBrokenTimer = 5.5;
            if (CB.audio && CB.audio.playShieldBreak) CB.audio.playShieldBreak();
          } else {
            if (CB.audio) CB.audio.playGuardState('stun');
          }
          g.squash = -0.44;
          if (res.isSuper) {
            launchGuardBilliard(g, res.nx * 600, res.ny * 600, { stunDuration: 2.3 });
          } else {
            g.knockVx = res.nx * 175;
            g.knockVy = res.ny * 175;
          }
          game.camera.shake = Math.max(game.camera.shake, wasSkid ? 9.0 : 7.5);
          CB.combat.emitSoundRipple(g.x, g.y, 240, 'slam');
          CB.player.spawnDust(g.x, g.y - 10, '#ffd870', 14, 1.6);
          CB.player.spawnPopup(
            g.x,
            g.y - g.radius - 26,
            wasSkid ? '💥 滑道撞墙破盾! 💫' : (res.isSuper ? '💥 弹飞破盾! 💫' : '撞墙眩晕! 💫'),
            '#d9483b'
          );
        } else if (g.stateTimer <= 0) {
          g.skidding = false;
          g.aiState = 'chase';
          g.chargeCooldown = 1.6;
          // 冲锋刹停后顺势向前泼出 3 颗短距水波冲击
          if (g.kind === 'shield_charger') fireWaterFan(g, 3);
          else if (g.kind === 'lotus_warden') fireWaterFan(g, 5);
        }
      } else if (g.aiState === 'stunned') {
        g.stateTimer -= gDt;
        if (g.stateTimer <= 0) g.aiState = 'chase';
      } else if (g.aiState === 'flee') {
        const awayX = g.x + (g.x - player.x);
        const awayY = g.y + (g.y - player.y);
        const spd = g.chaseSpeed * 1.18 * slowMult;
        steerGuardToward(g, awayX, awayY, spd, dt, map);
        movedSpeed = spd;
        if (distToPlayer > 360) g.aiState = 'patrol';
      }

      if (g.aiState !== 'stunned' && g.aiState !== 'windup' && g.aiState !== 'charging') {
        const pd = Math.hypot(player.x - g.x, player.y - g.y);
        if (pd < player.radius + g.radius - 2 && player.dashTimer <= 0) {
          const nx = (player.x - g.x) / (pd || 1);
          const ny = (player.y - g.y) / (pd || 1);
          CB.player.damagePlayer(g.touchDamage, nx, ny);
        }
      }

      if (movedSpeed > 15) g.walkPhase += dt * (8 + movedSpeed * 0.03);
      g.keyAngle += dt * (g.aiState === 'stunned' ? 0.3 : 2.2 + movedSpeed * 0.025);
    }
  }

  function startChargeWindup(g, player) {
    g.aiState = 'windup';
    g.stateTimer = 0.62;
    g.facing = Math.atan2(player.y - g.y, player.x - g.x);
    g.chargeDirX = Math.cos(g.facing);
    g.chargeDirY = Math.sin(g.facing);
    if (CB.audio) CB.audio.playGuardState('windup');
    CB.player.spawnPopup(g.x, g.y - g.radius - 22, '冲锋蓄力!', '#c93c2b');
  }

  // ===== 4 套截然不同的关卡专属怪物弹幕 =====
  function fireWaterFan(g, count = 3) {
    const baseA = g.facing;
    const offsets = count >= 5 ? [-0.52, -0.26, 0, 0.26, 0.52] : [-0.32, 0, 0.32];
    offsets.forEach((off) => {
      const a = baseA + off;
      const spd = 250;
      game.enemyBullets.push({
        x: g.x + Math.cos(a) * (g.radius + 6),
        y: g.y + Math.sin(a) * (g.radius + 6),
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        speed: spd,
        radius: 6,
        damage: 9,
        traveled: 0,
        maxRange: 210,
        style: 'bubble',
        color: '#62d4eb',
        bouncesLeft: 0,
      });
    });
  }

  function fireBubbleSplash(g) {
    const base = Math.random() * Math.PI * 0.5;
    for (let k = 0; k < 4; k++) {
      const a = base + (k * Math.PI) / 2;
      const spd = 225;
      game.enemyBullets.push({
        x: g.x + Math.cos(a) * 14,
        y: g.y + Math.sin(a) * 14,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        speed: spd,
        radius: 6.5,
        damage: 9,
        traveled: 0,
        maxRange: 300,
        style: 'bubble',
        color: '#66dff2',
        bouncesLeft: 1, // 露水泡撞墙弹一次！
      });
    }
    CB.player.spawnDust(g.x, g.y, '#8ce8f7', 7, 1.1);
  }

  function fireStarVolley(g, count = 3) {
    const baseA = g.facing;
    for (let k = 0; k < count; k++) {
      const off = ((k - (count - 1) / 2) * 0.24);
      const a = baseA + off;
      const spd = 290;
      game.enemyBullets.push({
        x: g.x + Math.cos(a) * (g.radius + 6),
        y: g.y + Math.sin(a) * (g.radius + 6),
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        speed: spd,
        radius: 5.8,
        damage: 10,
        traveled: 0,
        maxRange: 440,
        style: 'star',
        color: '#ffd859',
        gravityMult: 1.35, // 强烈受星轨仪引力/斥力场弯曲！
        bouncesLeft: 0,
      });
    }
    g.squash = -0.2;
    if (CB.audio && CB.audio.playStarVolley) CB.audio.playStarVolley();
  }

  function fireStarRing(g, count = 6, spd = 235, color = '#8cf0ff') {
    const offset = game.time * 1.1;
    for (let k = 0; k < count; k++) {
      const a = offset + (k * Math.PI * 2) / count;
      game.enemyBullets.push({
        x: g.x + Math.cos(a) * (g.radius + 4),
        y: g.y + Math.sin(a) * (g.radius + 4),
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        speed: spd,
        radius: 5.5,
        damage: 10,
        traveled: 0,
        maxRange: 390,
        style: 'star',
        color,
        gravityMult: 1.15,
        bouncesLeft: 0,
      });
    }
    g.squash = -0.22;
    if (CB.audio && CB.audio.playStarVolley) CB.audio.playStarVolley();
  }

  function fireThornBurst(g, count = 3) {
    const baseA = g.facing;
    const offsets = count >= 5 ? [-0.30, -0.15, 0, 0.15, 0.30] : [-0.14, 0, 0.14];
    offsets.forEach((off) => {
      const a = baseA + off;
      const spd = 385;
      game.enemyBullets.push({
        x: g.x + Math.cos(a) * (g.radius + 6),
        y: g.y + Math.sin(a) * (g.radius + 6),
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        speed: spd,
        radius: 4.8,
        damage: 11,
        traveled: 0,
        maxRange: 420,
        style: 'thorn',
        color: '#a3e66e',
        bouncesLeft: 0,
      });
    });
    g.squash = -0.2;
    if (CB.audio) CB.audio.playGuardState('enemyShoot');
  }

  function steerGuardToward(g, tx, ty, speed, dt, map) {
    const dx = tx - g.x;
    const dy = ty - g.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    const dirX = dx / dist;
    const dirY = dy / dist;
    g.facing = Math.atan2(dirY, dirX);
    moveGuardWithCollisions(g, dirX * speed * dt, dirY * speed * dt, map, false);
  }

  function moveGuardBilliardStep(g, subDt, map) {
    g.x += g.knockVx * subDt;
    g.y += g.knockVy * subDt;

    // 1. 优先判定云海崖边与易碎木花栏：高速台球态直接撞碎花栏冲出云海！
    if (map.cliffEdges) {
      for (const edge of map.cliffEdges) {
        const nearX = Math.max(edge.x, Math.min(g.x, edge.x + edge.w));
        const nearY = Math.max(edge.y, Math.min(g.y, edge.y + edge.h));
        const dSq = (g.x - nearX) ** 2 + (g.y - nearY) ** 2;
        if (dSq >= g.radius * g.radius) continue;

        const curSpd = Math.hypot(g.knockVx, g.knockVy);
        if (edge.kind === 'railing' && !edge.broken) {
          if (curSpd > 155) {
            if (CB.combat && CB.combat.breakRailing) {
              CB.combat.breakRailing(edge, g.x, g.y, g.knockVx / (curSpd || 1), g.knockVy / (curSpd || 1));
            }
            g.knockVx *= 0.9;
            g.knockVy *= 0.9;
          } else {
            // 速度太慢被木栏挡下反弹
            const d = Math.sqrt(dSq) || 0.001;
            const nx = (g.x - nearX) / d;
            const ny = (g.y - nearY) / d;
            g.x += nx * (g.radius - d);
            g.y += ny * (g.radius - d);
            const vn = g.knockVx * nx + g.knockVy * ny;
            if (vn < 0) {
              g.knockVx -= 1.65 * vn * nx;
              g.knockVy -= 1.65 * vn * ny;
            }
            continue;
          }
        }

        if (checkGuardOverCliffEdge(g, edge, map, true)) {
          return;
        }
      }
    }

    // 兜底：若守卫已被高速抛出岛外无格虚空，立刻执行云海坠落秒杀
    if (!CB.mapGen.findRoomAt(map, g.x, g.y) && map.cliffEdges && map.cliffEdges.length > 0) {
      let nearest = map.cliffEdges[0];
      let bestD = Infinity;
      for (const edge of map.cliffEdges) {
        const d = Math.hypot(g.x - (edge.x + edge.w / 2), g.y - (edge.y + edge.h / 2));
        if (d < bestD) { bestD = d; nearest = edge; }
      }
      triggerGuardCliffDrop(g, nearest, map);
      return;
    }

    const bounceRect = (rx, ry, rw, rh, rest = 0.78, isSuper = false) => {
      const cx = Math.max(rx, Math.min(g.x, rx + rw));
      const cy = Math.max(ry, Math.min(g.y, ry + rh));
      const dx = g.x - cx;
      const dy = g.y - cy;
      const dSq = dx * dx + dy * dy;
      if (dSq >= g.radius * g.radius) return false;
      const d = Math.sqrt(dSq) || 0.001;
      const nx = dx / d;
      const ny = dy / d;
      g.x += nx * (g.radius - d);
      g.y += ny * (g.radius - d);
      const vn = g.knockVx * nx + g.knockVy * ny;
      if (vn < 0) {
        if (isSuper) {
          const outSpd = Math.max(640, Math.hypot(g.knockVx, g.knockVy) * 1.32);
          g.knockVx = nx * outSpd;
          g.knockVy = ny * outSpd;
        } else {
          g.knockVx -= (1 + rest) * vn * nx;
          g.knockVy -= (1 + rest) * vn * ny;
          if (Math.abs(vn) > 260 && !g.dead) {
            const wallDmg = 10;
            if (CB.audio && CB.audio.playCrateClack) CB.audio.playCrateClack(false);
            CB.player.spawnDust(cx, cy, '#ffe08a', 7, 1.25);
            damageGuard(g, wallDmg, nx, ny, false, '💥 撞墙!', true, { source: 'billiard', isChain: true });
          } else if (Math.abs(vn) > 90 && CB.audio && CB.audio.playCrateClack) {
            CB.audio.playCrateClack(false);
            CB.player.spawnDust(cx, cy, '#e6cfb2', 4, 0.9);
          }
        }
      }
      return true;
    };

    const bounceCircle = (ox, oy, orad, rest = 0.78, isSuper = false) => {
      const dx = g.x - ox;
      const dy = g.y - oy;
      const minD = g.radius + orad;
      const dSq = dx * dx + dy * dy;
      if (dSq >= minD * minD) return false;
      const d = Math.sqrt(dSq) || 0.001;
      const nx = dx / d;
      const ny = dy / d;
      g.x += nx * (minD - d);
      g.y += ny * (minD - d);
      const vn = g.knockVx * nx + g.knockVy * ny;
      if (vn < 0) {
        if (isSuper) {
          const outSpd = Math.max(660, Math.hypot(g.knockVx, g.knockVy) * 1.35);
          g.knockVx = nx * outSpd;
          g.knockVy = ny * outSpd;
        } else {
          g.knockVx -= (1 + rest) * vn * nx;
          g.knockVy -= (1 + rest) * vn * ny;
        }
      }
      return true;
    };

    // 2. 撞实心墙、角柱与闭合藤蔓花闸
    for (const w of map.walls) bounceRect(w.x, w.y, w.w, w.h, 0.78, false);
    for (const post of map.posts) bounceRect(post.x, post.y, post.w, post.h, 0.78, false);
    if (map.vineGates) {
      for (const gate of map.vineGates) {
        if (!gate.open) bounceRect(gate.x, gate.y, gate.w, gate.h, 0.75, false);
      }
    }
    if (g.dead) return;

    // 3. 与场景机关和道具连环交互
    for (const prop of map.props) {
      if (prop.broken) continue;

      // 直接引爆秘露花蜜瓶 / 花粉花苞！
      if (prop.type === 'inkwell' || prop.type === 'pollen_bud') {
        if (Math.hypot(g.x - prop.x, g.y - prop.y) < g.radius + prop.r + 3) {
          CB.combat.damageProp(prop, 999, prop.x, prop.y);
          g.knockVx *= 0.88;
          g.knockVy *= 0.88;
          continue;
        }
      }

      // 撞击可滑动木箱：传递台球动量！
      if (prop.type === 'crate') {
        const cx = prop.x + prop.w / 2;
        const cy = prop.y + prop.h / 2;
        const cr = Math.min(prop.w, prop.h) * 0.48;
        const dx = cx - g.x;
        const dy = cy - g.y;
        const minD = g.radius + cr;
        const dSq = dx * dx + dy * dy;
        if (dSq < minD * minD && dSq > 0.001) {
          const d = Math.sqrt(dSq);
          const nx = dx / d;
          const ny = dy / d;
          const ov = (minD - d) * 0.55;
          g.x -= nx * ov;
          g.y -= ny * ov;
          prop.x += nx * ov;
          prop.y += ny * ov;

          const curSpd = Math.hypot(g.knockVx, g.knockVy);
          const pushSpd = Math.max(380, curSpd * 1.05);
          if (CB.combat && CB.combat.pushCrate) {
            CB.combat.pushCrate(prop, nx * pushSpd, ny * pushSpd, true);
          }
          g.knockVx = -nx * curSpd * 0.48;
          g.knockVy = -ny * curSpd * 0.48;
          if (CB.audio && CB.audio.playCrateClack) CB.audio.playCrateClack(false);
          CB.player.spawnDust((g.x + cx) / 2, (g.y + cy) / 2 - 8, '#ffe694', 8, 1.3);
          CB.player.spawnPopup(cx, cy - 26, '🎱 撞飞木箱!', '#2a8eb8');
        }
        continue;
      }

      if (prop.type === 'wormhole') {
        if ((g.wormholeCd || 0) <= 0 && Math.hypot(g.x - prop.x, g.y - prop.y) < g.radius + prop.r + 4) {
          const exitWh = CB.combat && CB.combat.findPairedWormhole ? CB.combat.findPairedWormhole(prop) : null;
          if (exitWh) {
            const curS = Math.hypot(g.knockVx, g.knockVy);
            const boost = (CB.extraction && CB.extraction.hasCurio('lorentz_prism')) ? 1.42 : 1.18;
            const outS = Math.min(1140, Math.max(540, curS * boost));
            const ndx = curS > 1 ? g.knockVx / curS : 1;
            const ndy = curS > 1 ? g.knockVy / curS : 0;
            g.x = exitWh.x + ndx * (exitWh.r + g.radius + 4);
            g.y = exitWh.y + ndy * (exitWh.r + g.radius + 4);
            g.knockVx = ndx * outS;
            g.knockVy = ndy * outS;
            g.relGamma = CB.combat.getRelativisticGamma(outS);
            g.wormholeCd = 0.42;
            g.billiardTrail = [{ x: exitWh.x, y: exitWh.y, dew: false, rel: true }];
            prop.pulse = 1;
            exitWh.pulse = 1;
            if (CB.audio && CB.audio.playWormholeWarp) CB.audio.playWormholeWarp();
            if (CB.extraction && CB.extraction.addStuntBounty) CB.extraction.addStuntBounty(18);
            if (CB.combat && CB.combat.grantOrbRefund) CB.combat.grantOrbRefund(1, exitWh.x, exitWh.y, '虫洞回珠');
            CB.player.spawnDust(prop.x, prop.y - 10, prop.color, 10, 1.35);
            CB.player.spawnDust(exitWh.x, exitWh.y - 10, exitWh.color, 12, 1.5);
            CB.player.spawnPopup(exitWh.x, exitWh.y - g.radius - 26, '🌀 虫洞折跃喷射! +18💎', '#7c52e0');
          }
        }
        continue;
      }

      if (prop.type === 'orrery' && prop.polarity > 0) {
        const distO = Math.hypot(g.x - prop.x, g.y - prop.y);
        const spdO = Math.hypot(g.knockVx, g.knockVy);
        if ((g.orbitReleaseCd || 0) <= 0 && !g.orbitOrreryId && spdO > 230 && distO < 126 && distO > prop.r + g.radius + 6) {
          const rdx = (g.x - prop.x) / distO;
          const rdy = (g.y - prop.y) / distO;
          const cross = rdx * g.knockVy - rdy * g.knockVx;
          g.orbitOrreryId = prop.id;
          g.orbitAngle = Math.atan2(g.y - prop.y, g.x - prop.x);
          g.orbitRadius = Math.max(66, Math.min(100, distO));
          g.orbitDir = cross >= 0 ? 1 : -1;
          g.orbitSpeed = Math.max(460, spdO);
          g.orbitTime = 0;
          prop.pulse = 0.9;
          if (CB.audio && CB.audio.playOrbitCapture) CB.audio.playOrbitCapture();
          CB.player.spawnDust(g.x, g.y - 10, '#72e8ff', 10, 1.35);
          CB.player.spawnPopup(prop.x, prop.y - 36, '🪐 轨道捕获 · 轻点星针切线甩射!', '#1f98c4');
          return;
        }
      }

      if (prop.type === 'singularity') {
        if (Math.hypot(g.x - prop.x, g.y - prop.y) < g.radius + prop.r + 4 && (prop.activeTimer || 0) <= 0 && CB.combat && CB.combat.activateSingularity) {
          CB.combat.activateSingularity(prop, false);
        }
        bounceCircle(prop.x, prop.y, prop.r, 0.8, false);
        continue;
      }

      if (prop.type === 'chime') {
        if (bounceCircle(prop.x, prop.y, prop.r, 0.8, false) && CB.combat.ringChime) {
          CB.combat.ringChime(prop);
        }
        continue;
      }

      if (prop.type === 'sunflower_switch') {
        if (bounceCircle(prop.x, prop.y, prop.r, 0.75, false) && CB.combat.activateSunflowerSwitch) {
          CB.combat.activateSunflowerSwitch(prop);
        }
        continue;
      }

      if (prop.shape === 'circle') {
        const isSuper = prop.type === 'bumper';
        if (bounceCircle(prop.x, prop.y, prop.r, 0.76, isSuper) && isSuper) {
          prop.hitFlash = 1;
          if (CB.audio) CB.audio.playRicochet(1, true);
          game.camera.shake = Math.max(game.camera.shake, 5.4);
          CB.player.spawnDust(prop.x, prop.y - 10, '#ffe278', 10, 1.45);
          CB.player.spawnPopup(prop.x, prop.y - 34, '🔔 风铃弹射!', '#2494a8');
        }
      } else {
        const isSuper = prop.type === 'eraser';
        if (bounceRect(prop.x, prop.y, prop.w, prop.h, 0.76, isSuper) && isSuper) {
          prop.hitFlash = 1;
          if (CB.audio) CB.audio.playRicochet(1, true);
          game.camera.shake = Math.max(game.camera.shake, 5.4);
          CB.player.spawnDust(g.x, g.y - 10, '#ff9db2', 10, 1.45);
          CB.player.spawnPopup(g.x, g.y - 34, '💥 菌伞弹射!', '#e06488');
        }
      }
    }
    if (g.dead) return;

    // 4. 怪物台球连锁撞击（弹性动量传递 + 连锁伤害 + 打断眩晕 + 连撞计数）
    for (const other of game.guards) {
      if (other === g || other.dead) continue;
      const dx = other.x - g.x;
      const dy = other.y - g.y;
      const minD = g.radius + other.radius + 2;
      const dSq = dx * dx + dy * dy;
      if (dSq >= minD * minD || dSq < 0.0001) continue;

      const d = Math.sqrt(dSq);
      const nx = dx / d;
      const ny = dy / d;
      const overlap = (minD - d) * 0.55;
      g.x -= nx * overlap;
      g.y -= ny * overlap;
      other.x += nx * overlap;
      other.y += ny * overlap;

      if ((g.billiardHitCd[other.id] || 0) > 0) continue;
      const gvn = g.knockVx * nx + g.knockVy * ny;
      const rvn = ((other.knockVx || 0) - g.knockVx) * nx + ((other.knockVy || 0) - g.knockVy) * ny;
      if (gvn < 70 && rvn > -70) continue;

      g.billiardHitCd[other.id] = 0.22;
      other.billiardHitCd = other.billiardHitCd || {};
      other.billiardHitCd[g.id] = 0.22;

      const relG = g.relGamma || 1.0;
      const m1 = (g.mass || 1.0) * relG;
      const m2 = other.mass || 1.0;
      const e = 0.92;
      const j = (-(1 + e) * Math.min(rvn, -gvn)) / (1 / m1 + 1 / m2);

      const hasChainCue = !!(CB.extraction && CB.extraction.hasCurio('chain_cue'));
      const cueSpeedMult = hasChainCue ? 1.18 : 1.0;

      g.knockVx -= (j / m1) * nx;
      g.knockVy -= (j / m1) * ny;
      let otherVx = ((other.knockVx || 0) + (j / m2) * nx * 1.15) * cueSpeedMult;
      let otherVy = ((other.knockVy || 0) + (j / m2) * ny * 1.15) * cueSpeedMult;

      // 保证被撞飞的下一只怪物获得爽快的台球传球初速度
      const chainGust = getGustBoostForDir(nx, ny);
      otherVx = otherVx * chainGust.mult + chainGust.addVx;
      otherVy = otherVy * chainGust.mult + chainGust.addVy;
      const minTransfer = ((hasChainCue ? 565 : 475) * chainGust.mult) / Math.sqrt(m2);
      const oSpd = Math.hypot(otherVx, otherVy);
      if (oSpd < minTransfer) {
        otherVx = nx * minTransfer;
        otherVy = ny * minTransfer;
      }

      const nextChain = Math.max(2, (g.billiardChain || 1) + 1);
      g.billiardChain = nextChain;
      other.billiardChain = nextChain;
      if (game.run) game.run.monsterChains += 1;

      const chainBounty = nextChain >= 4 ? 38 : nextChain === 3 ? 28 : 18;
      if (CB.extraction && CB.extraction.addStuntBounty) {
        CB.extraction.addStuntBounty(chainBounty);
      }
      if (CB.combat && CB.combat.grantOrbRefund) {
        CB.combat.grantOrbRefund(1, other.x, other.y, '连撞回珠');
      }

      // 连环撞球母徽：直接刷新目标破防状态，顺带提升连撞伤害 +25%
      if (hasChainCue) {
        other.armorBrokenTimer = Math.max(other.armorBrokenTimer || 0, 4.5);
        other.shellClosed = false;
      }

      const impactSpd = Math.max(Math.abs(rvn), Math.abs(gvn));
      const cueDmgMult = hasChainCue ? 1.25 : 1.0;
      const isRelChain = relG >= 1.55;
      const chainDmg = Math.round((24 + (impactSpd / 250) * 24) * (1 + Math.min(4, nextChain - 2) * 0.22) * cueDmgMult * (isRelChain ? relG * 0.88 : 1.0));
      damageGuard(other, chainDmg, nx, ny, true, isRelChain ? `⚡ 相对论撞击 ×${relG.toFixed(1)}! +${chainBounty}💎` : `🎱 怪物连撞 ×${nextChain}! +${chainBounty}💎`, true, {
        source: 'billiard',
        isChain: true,
        chainNum: nextChain,
        relGamma: relG,
      });
      if (isRelChain && CB.audio && CB.audio.playRelativisticBoom) CB.audio.playRelativisticBoom();

      if (!other.dead) {
        launchGuardBilliard(other, otherVx, otherVy, {
          chain: nextChain,
          keepChain: true,
          stunDuration: hasChainCue ? 2.35 : 1.85,
        });
      }

      if (CB.audio && CB.audio.playMonsterClack) CB.audio.playMonsterClack(nextChain);
      else if (CB.audio && CB.audio.playCrateClack) CB.audio.playCrateClack(true);

      game.hitStop = Math.max(game.hitStop, Math.min(0.052, 0.032 + (nextChain - 2) * 0.006));
      game.camera.shake = Math.max(game.camera.shake, Math.min(9.0, 5.2 + (nextChain - 2) * 1.1));
      CB.player.spawnDust((g.x + other.x) / 2, (g.y + other.y) / 2 - 10, '#ffe278', 12, 1.55);
      CB.player.spawnDust((g.x + other.x) / 2, (g.y + other.y) / 2 - 10, '#72e8ff', 7, 1.35);
      CB.combat.emitSoundRipple((g.x + other.x) / 2, (g.y + other.y) / 2, 195, 'slam');
    }
  }

  function moveGuardWithCollisions(g, vx, vy, map, smashDestructibles, allowCliffFall = false) {
    g.x += vx;
    g.y += vy;

    let hitSolid = false;
    let isSuper = false;
    let hitNx = 0;
    let hitNy = 0;

    const pushRect = (rx, ry, rw, rh, superBounce = false) => {
      const cx = Math.max(rx, Math.min(g.x, rx + rw));
      const cy = Math.max(ry, Math.min(g.y, ry + rh));
      const dx = g.x - cx;
      const dy = g.y - cy;
      const dSq = dx * dx + dy * dy;
      if (dSq >= g.radius * g.radius) return false;
      const d = Math.sqrt(dSq) || 0.001;
      const nx = dx / d;
      const ny = dy / d;
      g.x += nx * (g.radius - d);
      g.y += ny * (g.radius - d);
      hitSolid = true;
      hitNx = nx;
      hitNy = ny;
      if (superBounce) isSuper = true;
      return true;
    };

    const pushCircle = (cx, cy, cr, superBounce = false) => {
      const dx = g.x - cx;
      const dy = g.y - cy;
      const minD = g.radius + cr;
      const dSq = dx * dx + dy * dy;
      if (dSq >= minD * minD) return false;
      const d = Math.sqrt(dSq) || 0.001;
      const nx = dx / d;
      const ny = dy / d;
      g.x += nx * (minD - d);
      g.y += ny * (minD - d);
      hitSolid = true;
      hitNx = nx;
      hitNy = ny;
      if (superBounce) isSuper = true;
      return true;
    };

    for (const w of map.walls) pushRect(w.x, w.y, w.w, w.h, false);
    for (const post of map.posts) pushRect(post.x, post.y, post.w, post.h, false);
    if (map.vineGates) {
      for (const gate of map.vineGates) {
        if (!gate.open) pushRect(gate.x, gate.y, gate.w, gate.h, false);
      }
    }
    if (map.cliffEdges) {
      for (const edge of map.cliffEdges) {
        if (edge.kind === 'railing' && !edge.broken) {
          const hitsRail = circleHitsRect(g.x, g.y, g.radius + 2, edge.x, edge.y, edge.w, edge.h);
          if (hitsRail && (smashDestructibles || g.skidding)) {
            if (CB.combat && CB.combat.breakRailing) {
              const mvSpd = Math.hypot(vx, vy) || 1;
              CB.combat.breakRailing(edge, g.x, g.y, vx / mvSpd, vy / mvSpd);
            }
            if (checkGuardOverCliffEdge(g, edge, map, true)) {
              return { hitSolid: false, isSuper: false, nx: 0, ny: 0 };
            }
          } else {
            pushRect(edge.x, edge.y, edge.w, edge.h, false);
          }
        } else {
          // 敞开云海崖边 / 已碎花栏：冲锋、打滑、击退或漩涡牵引可直接坠崖；普通巡逻守卫不主动自杀
          if (allowCliffFall || g.aiState === 'charging' || g.skidding) {
            if (checkGuardOverCliffEdge(g, edge, map, g.aiState === 'charging' || g.skidding)) {
              return { hitSolid: false, isSuper: false, nx: 0, ny: 0 };
            }
          } else {
            pushRect(edge.x, edge.y, edge.w, edge.h, false);
          }
        }
      }
    }

    for (const prop of map.props) {
      if (prop.broken) continue;
      if (smashDestructibles && prop.destructible && prop.type !== 'crate') {
        const hit = prop.shape === 'circle'
          ? Math.hypot(g.x - prop.x, g.y - prop.y) < g.radius + prop.r + 3
          : circleHitsRect(g.x, g.y, g.radius + 3, prop.x, prop.y, prop.w, prop.h);
        if (hit) {
          CB.combat.damageProp(prop, 999, g.x, g.y);
          continue;
        }
      }

      if (prop.shape === 'circle') {
        const hit = pushCircle(prop.x, prop.y, prop.r, prop.type === 'bumper');
        if (hit && prop.type === 'bumper') prop.hitFlash = 1;
      } else {
        const hit = pushRect(prop.x, prop.y, prop.w, prop.h, prop.type === 'eraser');
        if (hit && prop.type === 'eraser') prop.hitFlash = 1;
      }
    }

    for (const other of game.guards) {
      if (other === g || other.dead) continue;
      const dx = g.x - other.x;
      const dy = g.y - other.y;
      const minD = g.radius + other.radius - 2;
      const dSq = dx * dx + dy * dy;
      if (dSq < minD * minD && dSq > 0.001) {
        const d = Math.sqrt(dSq);
        const push = (minD - d) * 0.5;
        g.x += (dx / d) * push;
        g.y += (dy / d) * push;
      }
    }

    return { hitSolid, isSuper, nx: hitNx, ny: hitNy };
  }

  function circleHitsRect(cx, cy, cr, rx, ry, rw, rh) {
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    return (cx - nx) ** 2 + (cy - ny) ** 2 < cr * cr;
  }

  // ==================== 主题化手绘怪物渲染 ====================
  function drawGuardFloorAura(ctx, g, time) {
    if (g.dead) return;
    ctx.save();
    ctx.translate(g.x, g.y);

    // 1. 视野锥（荆棘警哨眼采用更醒目的琥珀探照光束）
    if (g.aiState !== 'stunned') {
      const alert = g.aiState === 'chase' || g.aiState === 'windup' || g.aiState === 'charging';
      const susp = g.aiState === 'investigate';
      if (g.kind === 'vine_stalker' || g.kind === 'vine_elder') {
        ctx.fillStyle = alert ? 'rgba(232, 84, 58, 0.2)' : 'rgba(255, 202, 74, 0.17)';
      } else {
        ctx.fillStyle = alert
          ? 'rgba(217, 74, 56, 0.15)'
          : susp
          ? 'rgba(232, 165, 58, 0.16)'
          : 'rgba(110, 152, 180, 0.10)';
      }
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, g.sightRange * 0.74, g.facing - g.fov, g.facing + g.fov);
      ctx.closePath();
      ctx.fill();
    }

    // 2. 冲锋蓄力红线通道
    if (g.aiState === 'windup') {
      const pulse = 0.5 + 0.5 * Math.sin(time * 28);
      ctx.strokeStyle = `rgba(214, 54, 40, ${0.55 + pulse * 0.4})`;
      ctx.lineWidth = g.radius * 1.45;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(g.chargeDirX * 260, g.chargeDirY * 260);
      ctx.stroke();

      ctx.strokeStyle = '#fff3d6';
      ctx.lineWidth = 2.4;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(g.chargeDirX * 260, g.chargeDirY * 260);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. 吸金藤妖偶电磁环与吸金光束
    if (g.kind === 'vine_magnet') {
      const r1 = 26 + ((g.magnetPulse * 24) % 95);
      const a1 = Math.max(0, 1 - (r1 - 26) / 95) * 0.44;
      ctx.strokeStyle = `rgba(52, 168, 134, ${a1})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, r1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (g.siphonBeam) {
        const bx = g.siphonBeam.tx - g.x;
        const by = g.siphonBeam.ty - g.y;
        ctx.strokeStyle = 'rgba(242, 198, 72, 0.85)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.quadraticCurveTo(bx * 0.5, by * 0.5 - 32, bx, by - 14);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function drawGuardBody(ctx, g, time) {
    if (g.dead) return;
    const INK = getInk();
    const hop = g.hopping ? g.hopZ : (g.aiState === 'stunned' ? 0 : Math.abs(Math.sin(g.walkPhase)) * 4.2);
    const floatY = (g.kind === 'astro_sentinel' || g.kind === 'astro_archon' || g.kind === 'comet_orbiter') ? 6 + Math.sin(time * 4 + g.x) * 3.5 : 0;
    const lift = hop + floatY;
    const wobbleX = g.aiState === 'windup' ? Math.sin(time * 55) * 3 : 0;
    const sx = 1 - g.squash * 0.35;
    const sy = 1 + g.squash * 0.35;
    const faceSign = Math.cos(g.facing) >= 0 ? 1 : -1;
    const r = g.radius;

    // 台球弹飞态残影轨迹 + 相对论质增蓝移/红移拖尾
    if (g.billiardTrail && g.billiardTrail.length > 1) {
      ctx.save();
      for (let i = 0; i < g.billiardTrail.length - 1; i++) {
        const t = g.billiardTrail[i];
        const frac = (i + 1) / g.billiardTrail.length;
        ctx.globalAlpha = frac * (t.rel ? 0.52 : 0.34);
        ctx.fillStyle = t.rel
          ? (frac > 0.55 ? '#66ecff' : '#d67cff')
          : (t.dew ? '#7ce8ff' : '#ffd86b');
        ctx.beginPath();
        ctx.arc(t.x, t.y - 10, r * (0.45 + frac * (t.rel ? 0.52 : 0.42)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 黑洞时间膨胀冻结光环 & 蓄积动量矢量箭头
    const storedSpd = Math.hypot(g.dilatedStoredVx || 0, g.dilatedStoredVy || 0);
    if (g.isTimeDilated || storedSpd > 25) {
      ctx.save();
      ctx.strokeStyle = 'rgba(156, 108, 245, 0.85)';
      ctx.lineWidth = 2.4;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(g.x, g.y - 10, r + 9, time * 0.6, time * 0.6 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (storedSpd > 25) {
        const len = Math.min(82, 26 + storedSpd * 0.065);
        const ang = Math.atan2(g.dilatedStoredVy, g.dilatedStoredVx);
        const ax = g.x + Math.cos(ang) * len;
        const ay = g.y - 10 + Math.sin(ang) * len;
        ctx.strokeStyle = '#ffe052';
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(g.x, g.y - 10);
        ctx.lineTo(ax, ay);
        ctx.stroke();

        ctx.fillStyle = '#ffe052';
        ctx.translate(ax, ay);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-4, -5.5);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-4, 5.5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    CB.brush.drawSoftShadow(ctx, g.x, g.y + 4, r * 0.98, r * 0.56, 0.24);

    if (g.billiardMode) {
      ctx.save();
      ctx.strokeStyle = g.onDewSlide ? 'rgba(110, 232, 255, 0.85)' : 'rgba(255, 212, 92, 0.82)';
      ctx.lineWidth = 2.6;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(g.x, g.y - 10, r + 6, g.billiardSpin, g.billiardSpin + Math.PI * 1.65);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(g.x + wobbleX, g.y - lift);
    if (g.billiardMode) {
      ctx.translate(0, -10);
      ctx.rotate(g.billiardSpin);
      ctx.translate(0, 10);
    }
    ctx.scale(sx, sy);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const hitWhite = g.hitFlash > 0.15;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.3;

    // ===== 按 7 种主题绘制高辨识度专属造型 =====
    if (g.kind === 'shield_charger' || g.kind === 'lotus_warden') {
      const isWarden = g.kind === 'lotus_warden';
      // 荷叶盾甲冲锋卫 & 荷叶巨盾领主（领主配莲瓣金冠 + 双层鎏金荷叶巨盾！）
      drawFeet(ctx, g.walkPhase, '#315447');
      ctx.fillStyle = hitWhite ? '#fff8e8' : g.bodyColor;
      ctx.beginPath();
      ctx.roundRect(-r, -r * 1.4, r * 2, r * 1.45, 11);
      ctx.fill();
      ctx.stroke();

      // 胸甲金带
      ctx.fillStyle = '#e5be58';
      ctx.fillRect(-r + 2, -13, r * 2 - 4, 6);
      ctx.strokeRect(-r + 2, -13, r * 2 - 4, 6);

      // 头盔双撞角
      ctx.fillStyle = '#fff0b8';
      ctx.beginPath();
      ctx.moveTo(faceSign * 5, -r * 1.3);
      ctx.lineTo(faceSign * (r + 9), -r * 1.65);
      ctx.lineTo(faceSign * 12, -r * 0.96);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      drawEyes(ctx, g, faceSign * 4, -r * 0.85, faceSign, INK);

      // 醒目正面弧形青铜荷叶大盾（未破盾时完整举在面对方向！）
      if (g.armorBrokenTimer <= 0 && g.aiState !== 'stunned') {
        ctx.save();
        ctx.translate(0, -14);
        ctx.rotate(g.facing);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 9.5;
        ctx.beginPath();
        ctx.arc(0, 0, r + 5, -0.95, 0.95);
        ctx.stroke();

        ctx.strokeStyle = '#6ad49c';
        ctx.lineWidth = 6.2;
        ctx.stroke();

        ctx.strokeStyle = '#ffe178';
        ctx.lineWidth = isWarden ? 3.2 : 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, r + (isWarden ? 7.5 : 6.5), isWarden ? -1.05 : -0.78, isWarden ? 1.05 : 0.78);
        ctx.stroke();
        ctx.restore();
      }

      if (isWarden) {
        // 荷叶巨盾领主头顶三瓣莲花金冠
        ctx.fillStyle = '#ffd859';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.moveTo(-11, -r * 1.4);
        ctx.lineTo(-8, -r * 1.78);
        ctx.lineTo(-2, -r * 1.5);
        ctx.lineTo(0, -r * 1.88);
        ctx.lineTo(2, -r * 1.5);
        ctx.lineTo(8, -r * 1.78);
        ctx.lineTo(11, -r * 1.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (g.kind === 'dew_hopper') {
      // 露泡跳蛙偶：圆润青绿蛙身 + 背部晶莹水囊 + 头顶鼓大眼
      ctx.fillStyle = hitWhite ? '#ffffff' : g.bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, -10, r * 1.05, r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 晶莹玻璃露囊
      ctx.fillStyle = 'rgba(136, 236, 252, 0.85)';
      ctx.beginPath();
      ctx.arc(-faceSign * 6, -18, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 头顶两颗大蛙眼
      [-7, 7].forEach((ox) => {
        ctx.fillStyle = '#fffdf5';
        ctx.beginPath();
        ctx.arc(ox + faceSign * 3, -21, 5.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1d3a42';
        ctx.beginPath();
        ctx.arc(ox + faceSign * 4.2, -21, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (g.kind === 'astro_sentinel' || g.kind === 'astro_archon') {
      const isArchon = g.kind === 'astro_archon';
      // 占星光盾偶 & 双环占星仪偶（精英配双向公转大星环 + 耀眼星辰冕！）
      ctx.fillStyle = hitWhite ? '#ffffff' : g.bodyColor;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.65);
      ctx.quadraticCurveTo(r * 1.05, -r * 0.7, r * 0.9, 2);
      ctx.lineTo(-r * 0.9, 2);
      ctx.quadraticCurveTo(-r * 1.05, -r * 0.7, 0, -r * 1.65);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 金色领纹与发光头顶星辰
      ctx.strokeStyle = '#ffd866';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-9, -6); ctx.lineTo(0, -12); ctx.lineTo(9, -6);
      ctx.stroke();

      ctx.fillStyle = '#fff299';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, -r * 1.85, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      drawEyes(ctx, g, faceSign * 3, -r * 0.88, faceSign, INK, '#ffe675');

      // 醒目半透明「直线折光膜」+ 两面公转黄金星环盾（未破膜时明显可见！）
      if (g.armorBrokenTimer <= 0 && g.aiState !== 'stunned') {
        ctx.save();
        ctx.translate(0, -14);
        ctx.strokeStyle = 'rgba(130, 224, 255, 0.78)';
        ctx.fillStyle = 'rgba(110, 198, 255, 0.15)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.rotate(time * 2.2);
        ctx.strokeStyle = '#ffe066';
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.arc(0, 0, r + 9, -0.55, 0.55);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r + 9, Math.PI - 0.55, Math.PI + 0.55);
        ctx.stroke();
        if (isArchon) {
          ctx.rotate(-time * 4.0);
          ctx.strokeStyle = '#7ceeff';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.ellipse(0, 0, r + 13, 10, 0.4, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (isArchon) {
        ctx.fillStyle = '#ffe46b';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.6;
        [-8, 8].forEach((ox) => {
          ctx.beginPath();
          ctx.arc(ox, -r * 1.72, 3.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      }
    } else if (g.kind === 'comet_orbiter') {
      // 彗星双子偶：银蓝晶核 + 倾斜公转双星环
      ctx.save();
      ctx.translate(0, -14);
      ctx.strokeStyle = '#8cf0ff';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, r + 6, 7, time * 2.1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#ffe073';
      ctx.beginPath();
      ctx.ellipse(0, 0, r + 4, 6, -time * 1.7, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = hitWhite ? '#ffffff' : g.bodyColor;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#dffbff';
      ctx.beginPath();
      ctx.arc(faceSign * 3, -1, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (g.kind === 'vine_stalker' || g.kind === 'vine_elder') {
      const isElder = g.kind === 'vine_elder';
      // 荆棘警哨眼 & 古藤警哨长老（长老配黄金荆棘冠 + 双重荆棘刺环！）
      drawFeet(ctx, g.walkPhase, '#244234');
      ctx.fillStyle = hitWhite ? '#ffffff' : (g.shellClosed ? '#254a36' : g.bodyColor);
      ctx.beginPath();
      ctx.roundRect(-r * 0.92, -r * 1.48, r * 1.84, r * 1.5, 11);
      ctx.fill();
      ctx.stroke();

      // 缩壳硬甲尖刺环
      if (g.shellClosed && g.armorBrokenTimer <= 0 && g.aiState !== 'stunned') {
        ctx.fillStyle = '#8cd668';
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + time * 0.6;
          const sx1 = Math.cos(a) * (r + 2);
          const sy1 = -13 + Math.sin(a) * (r * 0.85);
          ctx.beginPath();
          ctx.arc(sx1, sy1, 4.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // 中央发光琥珀大眼
      ctx.fillStyle = g.shellClosed ? '#ff7043' : '#ffd84d';
      ctx.beginPath();
      ctx.ellipse(faceSign * 4, -r * 0.82, 7.2, 5.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#241a10';
      ctx.beginPath();
      ctx.ellipse(faceSign * 5.2, -r * 0.82, 2.0, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // 头顶警示小铜钟 / 长老荆棘金冠
      if (isElder) {
        ctx.fillStyle = '#ffca4d';
        ctx.beginPath();
        ctx.moveTo(-12, -r * 1.44);
        ctx.lineTo(-9, -r * 1.84);
        ctx.lineTo(-3, -r * 1.54);
        ctx.lineTo(0, -r * 1.92);
        ctx.lineTo(3, -r * 1.54);
        ctx.lineTo(9, -r * 1.84);
        ctx.lineTo(12, -r * 1.44);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = '#e5b84b';
        ctx.beginPath();
        ctx.arc(0, -r * 1.56, 5.2, Math.PI, 0);
        ctx.lineTo(6, -r * 1.44);
        ctx.lineTo(-6, -r * 1.44);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (g.kind === 'vine_magnet') {
      // 吸金藤妖偶
      drawFeet(ctx, g.walkPhase, '#245247');
      ctx.fillStyle = hitWhite ? '#ffffff' : g.bodyColor;
      ctx.beginPath();
      ctx.roundRect(-r * 0.88, -r * 1.35, r * 1.76, r * 1.38, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = g.stolenCoins > 0 ? '#f5cb5c' : '#1e423a';
      ctx.beginPath();
      ctx.arc(0, -8, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 头顶马蹄形红蓝磁铁
      ctx.lineWidth = 6.2;
      ctx.strokeStyle = '#d9483b';
      ctx.beginPath();
      ctx.arc(0, -r * 1.5, 10, Math.PI, Math.PI * 1.5);
      ctx.stroke();
      ctx.strokeStyle = '#3c78b8';
      ctx.beginPath();
      ctx.arc(0, -r * 1.5, 10, Math.PI * 1.5, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      drawEyes(ctx, g, faceSign * 4, -r * 0.85, faceSign, INK);
    } else {
      // 花穹守卫巨像（第 4 关精英 Boss）：白玉鎏金巨身 + 太阳花冠 + 双重金甲光环！
      drawFeet(ctx, g.walkPhase, '#5e2c2a');
      ctx.fillStyle = hitWhite ? '#ffffff' : g.bodyColor;
      ctx.beginPath();
      ctx.roundRect(-r, -r * 1.45, r * 2, r * 1.5, 14);
      ctx.fill();
      ctx.stroke();

      // 胸口鎏金太阳徽
      ctx.fillStyle = '#ffd859';
      ctx.beginPath();
      ctx.arc(0, -r * 0.52, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 太阳花冠
      ctx.fillStyle = '#ffcf4d';
      ctx.beginPath();
      ctx.moveTo(-14, -r * 1.42);
      ctx.lineTo(-10, -r * 1.78);
      ctx.lineTo(-3, -r * 1.52);
      ctx.lineTo(0, -r * 1.88);
      ctx.lineTo(3, -r * 1.52);
      ctx.lineTo(10, -r * 1.78);
      ctx.lineTo(14, -r * 1.42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      drawEyes(ctx, g, faceSign * 5, -r * 0.96, faceSign, INK, '#ffe675');

      if (g.armorBrokenTimer <= 0 && g.aiState !== 'stunned') {
        ctx.save();
        ctx.translate(0, -18);
        ctx.strokeStyle = 'rgba(255, 218, 92, 0.82)';
        ctx.lineWidth = 3.2;
        ctx.setLineDash([10, 6]);
        ctx.rotate(time * 1.2);
        ctx.beginPath();
        ctx.arc(0, 0, r + 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 眩晕旋转星星
    if (g.aiState === 'stunned') {
      for (let s = 0; s < 3; s++) {
        const a = time * 5.2 + (s * Math.PI * 2) / 3;
        const sx2 = Math.cos(a) * (r * 0.8);
        const sy2 = -r * 1.85 + Math.sin(a) * 4.5;
        ctx.fillStyle = '#ffd652';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(sx2, sy2, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();

    // 头顶状态标识气泡 + 破防提示 + 血条
    ctx.save();
    ctx.textAlign = 'center';
    const topY = g.y - g.radius * 1.9 - lift;

    if (g.armorBrokenTimer > 0) {
      drawBadge(ctx, g.x, topY - 10, '破', '#e67e22', '#fffdf8', INK);
    } else if (g.aiState === 'investigate') {
      drawBadge(ctx, g.x, topY - 10, '?', '#e69b35', '#fffaf0', INK);
    } else if (g.aiState === 'chase' || g.aiState === 'windup' || g.aiState === 'charging') {
      drawBadge(ctx, g.x, topY - 10, '!', '#d94436', '#fffaf0', INK);
    } else if (g.aiState === 'flee') {
      drawBadge(ctx, g.x, topY - 10, '溜!', '#2f8c73', '#fffaf0', INK);
    }

    if (g.kind === 'vine_magnet' && g.stolenCoins > 0) {
      ctx.font = '700 12px "PingFang SC", sans-serif';
      ctx.strokeStyle = 'rgba(255, 250, 240, 0.92)';
      ctx.lineWidth = 3.5;
      const txt = `🪙×${g.stolenCoins}`;
      ctx.strokeText(txt, g.x, topY - 28);
      ctx.fillStyle = '#d49014';
      ctx.fillText(txt, g.x, topY - 28);
    }

    if (g.hp < g.maxHp || g.isElite) {
      const bw = g.isElite ? 54 : 36;
      const bh = g.isElite ? 6.5 : 5;
      const bx = g.x - bw / 2;
      const by = g.y + 11;
      ctx.fillStyle = 'rgba(28, 44, 54, 0.78)';
      ctx.beginPath();
      ctx.roundRect(bx - 1, by - 1, bw + 2, bh + 2, 3);
      ctx.fill();
      ctx.fillStyle = g.armorBrokenTimer > 0 ? '#ffa726' : (g.isElite ? '#f2c144' : '#e05344');
      ctx.beginPath();
      ctx.roundRect(bx, by, bw * Math.max(0, g.hp / g.maxHp), bh, 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawFeet(ctx, walkPhase, color) {
    const swing = Math.sin(walkPhase) * 4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(-6, 1 + swing * 0.4, 5, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(6, 1 - swing * 0.4, 5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEyes(ctx, g, ex, ey, faceSign, INK, alertEyeColor = '#ffe066') {
    if (g.aiState === 'stunned') {
      ctx.strokeStyle = '#fff5d6';
      ctx.lineWidth = 2;
      [-4, 5].forEach((ox) => {
        ctx.beginPath();
        ctx.moveTo(ex + ox - 2.5, ey - 2.5);
        ctx.lineTo(ex + ox + 2.5, ey + 2.5);
        ctx.moveTo(ex + ox + 2.5, ey - 2.5);
        ctx.lineTo(ex + ox - 2.5, ey + 2.5);
        ctx.stroke();
      });
    } else {
      ctx.fillStyle = g.aiState === 'chase' || g.aiState === 'windup' || g.aiState === 'charging'
        ? alertEyeColor
        : '#fff8e8';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(ex - 4.5, ey, 3.3, 0, Math.PI * 2);
      ctx.arc(ex + 4.5, ey, 3.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1f363d';
      ctx.beginPath();
      ctx.arc(ex - 4.5 + faceSign * 1.1, ey, 1.5, 0, Math.PI * 2);
      ctx.arc(ex + 4.5 + faceSign * 1.1, ey, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBadge(ctx, x, y, text, bg, fg, INK) {
    ctx.fillStyle = bg;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = fg;
    ctx.font = '800 11.5px "PingFang SC", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 0.5);
  }

  function alertAllToward(tx, ty, maxDist = 800) {
    for (const g of game.guards) {
      if (g.dead) continue;
      if (Math.hypot(g.x - tx, g.y - ty) > maxDist) continue;
      if (g.aiState === 'patrol' || g.aiState === 'investigate') {
        g.aiState = 'investigate';
        g.investigatePos = { x: tx, y: ty };
        g.stateTimer = 8.0;
        g.squash = 0.25;
      }
    }
  }

  function spawnReinforcement(kind, room, targetX, targetY) {
    const map = game.map;
    if (!map || !room) return null;
    const resolved = resolveKind(kind);
    const spec = GUARD_SPECS[resolved] || GUARD_SPECS.shield_charger;
    const spot = findSpawnSpotInRoom(room, spec.radius, map, game.guards);
    const g = makeGuard(resolved, spot.x, spot.y, room);
    g.aiState = 'investigate';
    g.investigatePos = { x: targetX, y: targetY };
    g.stateTimer = 10.0;
    game.guards.push(g);
    CB.player.spawnDust(g.x, g.y - 10, '#f29b6e', 8, 1.3);
    return g;
  }

  function applyExternalPull(g, dx, dy) {
    if (!g || g.dead || !game.map) return;
    moveGuardWithCollisions(g, dx, dy, game.map, false, true);
  }

  function stunNearbyGuards(x, y, radius, duration = 1.1) {
    for (const g of game.guards) {
      if (g.dead) continue;
      if (Math.hypot(g.x - x, g.y - y) <= radius) {
        g.aiState = 'stunned';
        g.stateTimer = Math.max(g.stateTimer, duration);
        g.armorBrokenTimer = Math.max(g.armorBrokenTimer, 2.8);
        g.squash = -0.32;
        CB.player.spawnPopup(g.x, g.y - g.radius - 20, '✦ 星尘震晕!', '#2a8eb8');
      }
    }
  }

  function repelGuardsFrom(x, y, radius, pushSpeed = 340) {
    for (const g of game.guards) {
      if (g.dead) continue;
      const dx = g.x - x;
      const dy = g.y - y;
      const d = Math.hypot(dx, dy);
      if (d < radius && d > 1) {
        const fanMult = (CB.extraction && CB.extraction.hasCurio('gale_fan')) ? 1.35 : 1.0;
        const rdx = dx / d;
        const rdy = dy / d;
        const gustInfo = getGustBoostForDir(rdx, rdy);
        const spd = (Math.max(430, pushSpeed * 1.25) * fanMult * gustInfo.mult) / Math.sqrt(g.mass || 1);
        launchGuardBilliard(g, rdx * spd + gustInfo.addVx, rdy * spd + gustInfo.addVy, { stunDuration: 0.75 });
      }
    }
  }


  function drawFallingGuard(ctx, fg, time) {
    const INK = getInk();
    const alpha = Math.max(0, Math.min(1, (fg.life / fg.maxLife) * 1.4));
    const r = fg.radius;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(fg.x, fg.y);
    ctx.rotate(fg.angle);
    ctx.scale(fg.scale, fg.scale);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 下坠云雾旋环
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, 0, Math.PI * 1.45);
    ctx.stroke();

    // 守卫主体简化轮廓 + 惊慌旋眼
    ctx.fillStyle = fg.bodyColor || '#4e8a72';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.roundRect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8, 10);
    ctx.fill();
    ctx.stroke();

    if (fg.accentColor) {
      ctx.fillStyle = fg.accentColor;
      ctx.beginPath();
      ctx.arc(0, -r * 0.45, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 惊慌转圈小眼 (><)
    ctx.strokeStyle = '#fff9e6';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-7, -3); ctx.lineTo(-3, 0); ctx.lineTo(-7, 3);
    ctx.moveTo(7, -3); ctx.lineTo(3, 0); ctx.lineTo(7, 3);
    ctx.stroke();

    ctx.restore();
  }


  // 图鉴迷你画布守卫肖像渲染（复用实机手绘逻辑；未遭遇时绘制神秘水彩剪影）
  function drawGuardPortrait(ctx, kind, size, time = 0, locked = false) {
    const spec = GUARD_SPECS[kind];
    if (!spec) return;
    ctx.save();
    ctx.clearRect(0, 0, size, size);

    // 柔和主题圆形水彩底衬
    const cx = size / 2;
    const cy = size / 2;
    const bg = ctx.createRadialGradient(cx, cy - 4, 4, cx, cy, size * 0.48);
    if (locked) {
      bg.addColorStop(0, 'rgba(130, 156, 166, 0.28)');
      bg.addColorStop(1, 'rgba(130, 156, 166, 0.04)');
    } else if (kind === 'astro_sentinel' || kind === 'astro_archon' || kind === 'comet_orbiter') {
      bg.addColorStop(0, 'rgba(62, 92, 166, 0.34)');
      bg.addColorStop(1, 'rgba(28, 42, 86, 0.06)');
    } else if (kind === 'colossus' || kind === 'lotus_warden' || kind === 'vine_elder') {
      bg.addColorStop(0, 'rgba(246, 194, 92, 0.38)');
      bg.addColorStop(1, 'rgba(214, 118, 92, 0.05)');
    } else {
      bg.addColorStop(0, 'rgba(126, 206, 184, 0.32)');
      bg.addColorStop(1, 'rgba(126, 206, 184, 0.04)');
    }
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.44, 0, Math.PI * 2);
    ctx.fill();

    const dummy = {
      kind,
      radius: spec.radius,
      bodyColor: spec.bodyColor,
      accentColor: spec.accentColor,
      hp: spec.hp,
      maxHp: spec.hp,
      isElite: !!spec.isElite,
      hasFrontShield: !!spec.hasFrontShield,
      hasStarMembrane: !!spec.hasStarMembrane,
      hasThornShell: !!spec.hasThornShell,
      hasColossusArmor: !!spec.hasColossusArmor,
      armorBrokenTimer: 0,
      shellClosed: false,
      x: 0,
      y: 0,
      facing: 0.25,
      walkPhase: time * 2.2,
      hopZ: 0,
      hopping: false,
      squash: 0,
      hitFlash: 0,
      dead: false,
      aiState: 'patrol',
      billiardMode: false,
      billiardTrail: [],
      billiardSpin: 0,
      stolenCoins: 0,
    };

    const sc = (size / 76) * (spec.isElite ? 0.78 : 0.96);
    if (locked) {
      // 使用离屏 Canvas + source-atop 纯色剪影替代 ctx.filter，100% 兼容 iOS WKWebView
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const octx = off.getContext('2d');
      octx.save();
      octx.translate(cx, cy + size * 0.22);
      octx.scale(sc, sc);
      drawGuardBody(octx, dummy, time);
      octx.restore();
      octx.globalCompositeOperation = 'source-atop';
      octx.fillStyle = '#2d4b54';
      octx.fillRect(0, 0, size, size);

      ctx.save();
      ctx.globalAlpha = 0.56;
      ctx.drawImage(off, 0, 0);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(cx, cy + size * 0.22);
      ctx.scale(sc, sc);
      drawGuardBody(ctx, dummy, time);
      ctx.restore();
    }

    if (locked) {
      ctx.fillStyle = '#365c66';
      ctx.font = '900 22px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cx, cy + 2);
    }
    ctx.restore();
  }

  CB.guards = {
    GUARD_SPECS,
    populateGuardsForMap,
    notifySound,
    alertAllToward,
    spawnReinforcement,
    applyExternalPull,
    stunNearbyGuards,
    repelGuardsFrom,
    damageGuard,
    updateGuards,
    drawGuardFloorAura,
    drawGuardBody,
    drawFallingGuard,
    drawGuardPortrait,
    launchGuardBilliard,
  };
})();
