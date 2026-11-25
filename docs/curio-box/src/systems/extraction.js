(() => {
  const CB = window.CB;
  const game = CB.game;

  const META_STORAGE_KEY = 'curio_box_meta_v2';

  // ==================== 局内物理构筑词条奇物库 ====================
  const REGULAR_CURIOS = [
    {
      id: 'vortex_core',
      name: '引力漩涡核',
      icon: '🌀',
      rarity: 'epic',
      value: 65,
      color: '#4ea8de',
      shortPerk: '撞墙生漩涡',
      perk: '子弹首次撞墙/命中生成 3.2s 引力漩涡，聚拢守卫与金币并弯曲后续弹道',
    },
    {
      id: 'slingshot_lens',
      name: '吸星弹弓镜',
      icon: '🔭',
      rarity: 'epic',
      value: 65,
      color: '#56bfe0',
      shortPerk: '微引力吸附',
      perk: '弹丸掠过守卫时微引力自动弯曲吸附，星轨弹弓暴击 +30% 且沿途吸金',
    },
    {
      id: 'split_crystal',
      name: '折射分裂晶',
      icon: '💠',
      rarity: 'epic',
      value: 70,
      color: '#6ec4e8',
      shortPerk: '反弹一分二',
      perk: '子弹首次墙面反弹时分裂为 2 发夹角弹丸（可叠加棱镜与引力漩涡）',
    },
    {
      id: 'monocle',
      name: '阳光棱镜露',
      icon: '💎',
      rarity: 'rare',
      value: 60,
      color: '#f0b844',
      shortPerk: '反弹+1·暴击+',
      perk: '全武器墙面反弹次数 +1，折射 / 棱镜 / 弹弓暴击伤害 +25%',
    },
    {
      id: 'aero_feather',
      name: '反重力风羽',
      icon: '🪶',
      rarity: 'rare',
      value: 55,
      color: '#64c2a6',
      shortPerk: '冲刺斥力波',
      perk: '移速 +10%，冲刺冷却 -15%，冲刺结束释放斥力冲击波推开守卫与敌弹',
    },
    {
      id: 'billiard_wax',
      name: '滑蜡台球徽',
      icon: '🎱',
      rarity: 'epic',
      value: 68,
      color: '#4ea88e',
      shortPerk: '木箱超滑+45%伤',
      perk: '台球木箱滑行摩擦减半、撞击伤害 +45%，木箱撞墙额外反弹一次',
    },
    {
      id: 'dew_skates',
      name: '晨露滑行靴',
      icon: '⛸',
      rarity: 'rare',
      value: 60,
      color: '#5ecae0',
      shortPerk: '露水疾滑波',
      perk: '露水滑道滑行速度与漂移惯性 +25%，离开滑道释放水花推开近身守卫',
    },
    {
      id: 'gale_fan',
      name: '狂风蒲公英扇',
      icon: '🌬️',
      rarity: 'rare',
      value: 65,
      color: '#5ec9b8',
      shortPerk: '击退+35%·破栏风压',
      perk: '重弹/冲刺击退力 +35%，撞碎易碎木花栏时喷出向外风压推飞周边守卫',
    },
    {
      id: 'chain_cue',
      name: '连环撞球母徽',
      icon: '🎯',
      rarity: 'epic',
      value: 72,
      color: '#f09a38',
      shortPerk: '连撞加速·续破防',
      perk: '怪物台球连撞动量传递 +18%、连撞伤害 +25%，且直接击碎/刷新目标破防状态',
    },
    {
      id: 'cliff_chime',
      name: '云海悬赏风铃',
      icon: '🔔',
      rarity: 'epic',
      value: 70,
      color: '#4ec8e8',
      shortPerk: '崖杀+4金·回8血',
      perk: '每次击落云海额外喷出 4 金币、回复 8 生命值，且特技赏金额外 +15',
    },
  ];

  const GRAND_CURIOS = [
    {
      id: 'orrery',
      name: '天空星象仪',
      icon: '🪐',
      rarity: 'legendary',
      value: 195,
      color: '#f2b705',
      shortPerk: '引力场+35%',
      perk: '星轨仪与漩涡引力 +35%，星轨弹弓暴击伤害大幅飙升！',
    },
    {
      id: 'scarab',
      name: '翡翠浮空核',
      icon: '🌿',
      rarity: 'legendary',
      value: 205,
      color: '#2ea87e',
      shortPerk: '击杀生漩涡',
      perk: '击倒守卫原地引爆一次强力引力漩涡，聚拢周边敌兵与战利品',
    },
    {
      id: 'pocket_core',
      name: '太阳花冠金芯',
      icon: '🌻',
      rarity: 'legendary',
      value: 220,
      color: '#f0a61c',
      shortPerk: '高速穿箱弹',
      perk: '全武器弹速 +18%，击碎藤箱与花苞直接穿透不减速',
    },
    {
      id: 'star_jar',
      name: '云海琉璃灯',
      icon: '🏮',
      rarity: 'legendary',
      value: 195,
      color: '#4ebce0',
      shortPerk: '弹弓震荡晕',
      perk: '星轨弹弓命中与棱镜分光附带星尘震荡波，短暂眩晕附近守卫',
    },
  ];

  const ALL_CURIOS = [...REGULAR_CURIOS, ...GRAND_CURIOS];

  // ==================== 飞艇母港工坊永久强化、外观与出发补给配置 ====================
  const SUPPLY_COST = 45;

  const UPGRADE_DEFS = [
    {
      id: 'maxHp',
      name: '发条护心',
      icon: '♥',
      color: '#e05a5a',
      maxLv: 3,
      costs: [120, 260, 440],
      values: [100, 115, 130, 145],
      labels: ['100 HP', '115 HP', '130 HP', '145 HP'],
      shortPerk: '生命上限 +15/级',
    },
    {
      id: 'chargeSpeed',
      name: '星露快充',
      icon: '⚡',
      color: '#e69f24',
      maxLv: 3,
      costs: [140, 290, 480],
      mults: [1.0, 0.90, 0.80, 0.70],
      tapMults: [1.0, 0.95, 0.90, 0.85],
      labels: ['标准蓄力', '耗时 -10%', '耗时 -20%', '耗时 -30%'],
      shortPerk: '重弹蓄力提速',
    },
    {
      id: 'dashCd',
      name: '轻风踏靴',
      icon: '💨',
      color: '#2fa0bf',
      maxLv: 3,
      costs: [130, 270, 450],
      mults: [1.0, 0.90, 0.82, 0.75],
      labels: ['标准冷却', '冷却 -10%', '冷却 -18%', '冷却 -25%'],
      shortPerk: '冲刺冷却缩减',
    },
    {
      id: 'magnet',
      name: '磁吸花囊',
      icon: '🧲',
      color: '#349c7e',
      maxLv: 3,
      costs: [110, 240, 400],
      coinRadius: [68, 102, 136, 172],
      curioRadius: [115, 150, 185, 225],
      startCoins: [12, 16, 20, 25],
      labels: ['起手12金', '吸金+ · 16金', '吸金++ · 20金', '吸金+++ · 25金'],
      shortPerk: '吸金范围 & 起手金币',
    },
  ];

  const SKIN_DEFS = [
    {
      id: 'explorer',
      code: 'A',
      name: '护目镜冒险团',
      cost: 0,
      freeStage: 0,
      badge: '初始外观',
      desc: '焦糖贝雷帽与黄铜护目镜',
    },
    {
      id: 'porcelain',
      code: 'B',
      name: '青花釉面精灵',
      cost: 220,
      freeStage: 2,
      badge: '通关第2关或金库解锁',
      desc: '天青瓷釉光环与双飘带',
    },
    {
      id: 'sprout',
      code: 'C',
      name: '嫩芽软绒团子',
      cost: 340,
      freeStage: 3,
      badge: '通关第3关或金库解锁',
      desc: '摇曳嫩绿双芽与金铃斗篷',
    },
  ];

  function ensureMetaShape() {
    const m = game.meta;
    if (!m.upgrades || typeof m.upgrades !== 'object') {
      m.upgrades = { maxHp: 0, chargeSpeed: 0, dashCd: 0, magnet: 0 };
    } else {
      m.upgrades.maxHp = Math.max(0, Math.min(3, Number(m.upgrades.maxHp) || 0));
      m.upgrades.chargeSpeed = Math.max(0, Math.min(3, Number(m.upgrades.chargeSpeed) || 0));
      m.upgrades.dashCd = Math.max(0, Math.min(3, Number(m.upgrades.dashCd) || 0));
      m.upgrades.magnet = Math.max(0, Math.min(3, Number(m.upgrades.magnet) || 0));
    }
    if (!Array.isArray(m.unlockedSkins) || !m.unlockedSkins.includes('explorer')) {
      m.unlockedSkins = Array.isArray(m.unlockedSkins) ? ['explorer', ...m.unlockedSkins] : ['explorer'];
    }
    for (const sk of SKIN_DEFS) {
      if (sk.freeStage > 0 && Array.isArray(m.clearedStages) && m.clearedStages.includes(sk.freeStage)) {
        if (!m.unlockedSkins.includes(sk.id)) m.unlockedSkins.push(sk.id);
      }
    }
    if (!m.selectedSkin || !m.unlockedSkins.includes(m.selectedSkin)) {
      m.selectedSkin = 'explorer';
    }
    if (m.loadoutCurioId && !REGULAR_CURIOS.some((c) => c.id === m.loadoutCurioId)) {
      m.loadoutCurioId = null;
    }
    if (!Array.isArray(m.seenGuards)) m.seenGuards = [];
    if (!m.defeatedGuards || typeof m.defeatedGuards !== 'object') m.defeatedGuards = {};
    if (typeof m.autoPlayIntro !== 'boolean') m.autoPlayIntro = true;
  }

  function getMetaBonuses() {
    ensureMetaShape();
    const u = game.meta.upgrades;
    const hpDef = UPGRADE_DEFS[0];
    const chDef = UPGRADE_DEFS[1];
    const dsDef = UPGRADE_DEFS[2];
    const mgDef = UPGRADE_DEFS[3];
    return {
      maxHp: hpDef.values[u.maxHp] || 100,
      chargeMult: chDef.mults[u.chargeSpeed] || 1.0,
      tapMult: chDef.tapMults[u.chargeSpeed] || 1.0,
      dashCdMult: dsDef.mults[u.dashCd] || 1.0,
      coinPickupR: mgDef.coinRadius[u.magnet] || 68,
      curioPickupR: mgDef.curioRadius[u.magnet] || 115,
      startCoins: mgDef.startCoins[u.magnet] || 12,
    };
  }

  function isSkinUnlocked(skinId) {
    ensureMetaShape();
    return game.meta.unlockedSkins.includes(skinId);
  }

  function buyUpgrade(id) {
    ensureMetaShape();
    const def = UPGRADE_DEFS.find((u) => u.id === id);
    if (!def) return { ok: false, reason: 'invalid' };
    const lv = game.meta.upgrades[id] || 0;
    if (lv >= def.maxLv) return { ok: false, reason: 'max' };
    const cost = def.costs[lv];
    if (game.meta.bankValue < cost) {
      if (CB.audio && CB.audio.playUiLocked) CB.audio.playUiLocked();
      return { ok: false, reason: 'funds', cost };
    }
    game.meta.bankValue -= cost;
    game.meta.upgrades[id] = lv + 1;

    // 实时同步升级效果到当前角色，立竿见影！
    const b = getMetaBonuses();
    if (id === 'maxHp') {
      const diff = b.maxHp - game.player.maxHp;
      game.player.maxHp = b.maxHp;
      if (diff > 0) game.player.hp = Math.min(game.player.maxHp, game.player.hp + diff);
    }

    saveMeta();
    if (CB.audio && CB.audio.playUpgradeBuy) CB.audio.playUpgradeBuy();
    return { ok: true, level: lv + 1 };
  }

  function unlockOrSelectSkin(skinId) {
    ensureMetaShape();
    const def = SKIN_DEFS.find((s) => s.id === skinId);
    if (!def) return { ok: false };
    if (isSkinUnlocked(skinId)) {
      game.meta.selectedSkin = skinId;
      saveMeta();
      if (CB.player && CB.player.setVariant) CB.player.setVariant(skinId);
      else game.variant = skinId;
      if (CB.audio && CB.audio.playUiClick) CB.audio.playUiClick();
      return { ok: true, action: 'selected' };
    }
    if (game.meta.bankValue < def.cost) {
      if (CB.audio && CB.audio.playUiLocked) CB.audio.playUiLocked();
      return { ok: false, reason: 'funds', cost: def.cost };
    }
    game.meta.bankValue -= def.cost;
    game.meta.unlockedSkins.push(skinId);
    game.meta.selectedSkin = skinId;
    saveMeta();
    if (CB.player && CB.player.setVariant) CB.player.setVariant(skinId);
    else game.variant = skinId;
    if (CB.audio && CB.audio.playUpgradeBuy) CB.audio.playUpgradeBuy();
    return { ok: true, action: 'unlocked' };
  }

  function toggleLoadoutCurio(curioId) {
    ensureMetaShape();
    const def = REGULAR_CURIOS.find((c) => c.id === curioId);
    if (!def) return { ok: false, reason: 'invalid' };
    if (!game.meta.unlockedCurios.includes(curioId)) {
      if (CB.audio && CB.audio.playUiLocked) CB.audio.playUiLocked();
      return { ok: false, reason: 'locked' };
    }
    if (game.meta.loadoutCurioId === curioId) {
      // 取消装填并全额退还补给费
      game.meta.loadoutCurioId = null;
      game.meta.bankValue += SUPPLY_COST;
      saveMeta();
      if (CB.audio && CB.audio.playUiClick) CB.audio.playUiClick();
      return { ok: true, action: 'unloaded' };
    }
    if (game.meta.loadoutCurioId) {
      // 已支付补给费，免费切换为另一件已解锁奇物
      game.meta.loadoutCurioId = curioId;
      saveMeta();
      if (CB.audio && CB.audio.playUiClick) CB.audio.playUiClick();
      return { ok: true, action: 'switched' };
    }
    if (game.meta.bankValue < SUPPLY_COST) {
      if (CB.audio && CB.audio.playUiLocked) CB.audio.playUiLocked();
      return { ok: false, reason: 'funds', cost: SUPPLY_COST };
    }
    game.meta.bankValue -= SUPPLY_COST;
    game.meta.loadoutCurioId = curioId;
    saveMeta();
    if (CB.audio && CB.audio.playUpgradeBuy) CB.audio.playUpgradeBuy();
    return { ok: true, action: 'loaded' };
  }

  function canAffordAnyUpgrade() {
    ensureMetaShape();
    for (const def of UPGRADE_DEFS) {
      const lv = game.meta.upgrades[def.id] || 0;
      if (lv < def.maxLv && game.meta.bankValue >= def.costs[lv]) return true;
    }
    return false;
  }

  function recordCurioUnlocked(curioId) {
    if (!curioId) return;
    if (!game.meta.unlockedCurios.includes(curioId)) {
      game.meta.unlockedCurios.push(curioId);
      saveMeta();
    }
  }

  function recordGuardSeen(kind) {
    if (!kind) return;
    ensureMetaShape();
    if (!game.meta.seenGuards.includes(kind)) {
      game.meta.seenGuards.push(kind);
      saveMeta();
    }
  }

  function recordGuardDefeated(kind) {
    if (!kind) return;
    ensureMetaShape();
    if (!game.meta.seenGuards.includes(kind)) {
      game.meta.seenGuards.push(kind);
    }
    game.meta.defeatedGuards[kind] = (game.meta.defeatedGuards[kind] || 0) + 1;
    saveMeta();
  }

  function loadMeta() {
    try {
      const raw = localStorage.getItem(META_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          game.meta.bankValue = Number(parsed.bankValue) || 0;
          game.meta.extractions = Number(parsed.extractions) || 0;
          game.meta.runs = Number(parsed.runs) || 0;
          game.meta.bestHaul = Number(parsed.bestHaul) || 0;
          game.meta.unlockedCurios = Array.isArray(parsed.unlockedCurios) ? parsed.unlockedCurios : [];
          game.meta.clearedStages = Array.isArray(parsed.clearedStages) ? parsed.clearedStages : [];
          if (parsed.upgrades && typeof parsed.upgrades === 'object') {
            game.meta.upgrades = {
              maxHp: Number(parsed.upgrades.maxHp) || 0,
              chargeSpeed: Number(parsed.upgrades.chargeSpeed) || 0,
              dashCd: Number(parsed.upgrades.dashCd) || 0,
              magnet: Number(parsed.upgrades.magnet) || 0,
            };
          }
          if (Array.isArray(parsed.unlockedSkins)) game.meta.unlockedSkins = parsed.unlockedSkins;
          if (typeof parsed.selectedSkin === 'string') game.meta.selectedSkin = parsed.selectedSkin;
          if (typeof parsed.loadoutCurioId === 'string') game.meta.loadoutCurioId = parsed.loadoutCurioId;
          if (Array.isArray(parsed.seenGuards)) game.meta.seenGuards = parsed.seenGuards;
          if (parsed.defeatedGuards && typeof parsed.defeatedGuards === 'object') {
            game.meta.defeatedGuards = parsed.defeatedGuards;
          }
          if (typeof parsed.autoPlayIntro === 'boolean') {
            game.meta.autoPlayIntro = parsed.autoPlayIntro;
          }
        }
      }
    } catch (_) {}
    ensureMetaShape();
    game.variant = game.meta.selectedSkin || 'explorer';
  }

  function saveMeta() {
    try {
      localStorage.setItem(META_STORAGE_KEY, JSON.stringify(game.meta));
    } catch (_) {}
  }

  function resetMeta() {
    try {
      localStorage.removeItem(META_STORAGE_KEY);
    } catch (_) {}
    game.meta.bankValue = 0;
    game.meta.extractions = 0;
    game.meta.runs = 0;
    game.meta.bestHaul = 0;
    game.meta.unlockedCurios = [];
    game.meta.clearedStages = [];
    game.meta.upgrades = { maxHp: 0, chargeSpeed: 0, dashCd: 0, magnet: 0 };
    game.meta.unlockedSkins = ['explorer'];
    game.meta.selectedSkin = 'explorer';
    game.meta.loadoutCurioId = null;
    game.meta.seenGuards = [];
    game.meta.defeatedGuards = {};
    game.meta.autoPlayIntro = true;
    game.variant = 'explorer';
    saveMeta();
  }

  function resetRunState(keepCurios = false) {
    const carried = keepCurios ? game.player.curios.slice() : [];
    game.run = {
      stageId: game.currentStageId,
      phase: 'playing',
      elapsed: 0,
      vaultOpened: false,
      hasGrandCurio: false,
      alarmActive: false,
      alarmPulseTimer: 0,
      chestsOpened: 0,
      guardsDefeated: 0,
      ricochetCrits: 0,
      slingshotCrits: 0,
      vorticesSpawned: 0,
      billiardHits: 0,
      monsterChains: 0,
      cliffDrops: 0,
      stuntBounty: 0,
      cratesBroken: 0,
      prismsUsed: 0,
      gatesOpened: 0,
      extraction: {
        active: false,
        inside: false,
        duration: 10,
        timeLeft: 10,
        tickAccum: 0,
        tickParity: true,
        midWaveSpawned: false,
        ringPulse: 0,
        gust: { active: false, dirX: 1, dirY: 0, strength: 0, label: '' },
      },
    };
    game.curioDrops = [];
    game.vortices = [];
    game.interactHint = null;
    game.run.deployedLoadoutCurio = null;
    if (!keepCurios && game.meta.loadoutCurioId) {
      const armed = REGULAR_CURIOS.find((c) => c.id === game.meta.loadoutCurioId);
      if (armed) {
        carried.push({ ...armed });
        game.run.deployedLoadoutCurio = armed;
      }
      game.meta.loadoutCurioId = null;
      saveMeta();
    }
    game.player.curios = carried;
    if (CB.audio && CB.audio.setAmbienceGust) CB.audio.setAmbienceGust(false);
    if (CB.ui && CB.ui.hideRunSummary) CB.ui.hideRunSummary();
  }

  function hasCurio(id) {
    return game.player.curios.some((c) => c.id === id);
  }

  function getCurioHaulValue() {
    let sum = 0;
    for (const c of game.player.curios) sum += c.value;
    return sum;
  }

  function getStuntBounty() {
    return (game.run && game.run.stuntBounty) || 0;
  }

  function addStuntBounty(amount, label = '', x = null, y = null) {
    if (!game.run || game.run.phase !== 'playing' || !amount || amount <= 0) return;
    game.run.stuntBounty = (game.run.stuntBounty || 0) + amount;
    if (CB.audio && CB.audio.playBountyChime) CB.audio.playBountyChime();
    if (x !== null && y !== null && label) {
      CB.player.spawnPopup(x, y, `${label} +${amount}💎`, '#c98614');
    }
  }

  function getTotalHaulValue() {
    const stage = CB.stages ? CB.stages.getStage(game.currentStageId) : null;
    const mult = stage ? stage.haulMult : 1.0;
    return Math.round((getCurioHaulValue() + game.player.coins * 2 + getStuntBounty()) * mult);
  }

  function pickCurio(isGiant, fixedId = null) {
    if (fixedId) {
      const exact = ALL_CURIOS.find((c) => c.id === fixedId);
      if (exact && !hasCurio(fixedId)) return { ...exact };
    }
    const stage = CB.stages ? CB.stages.getStage(game.currentStageId) : null;
    const basePool = isGiant ? GRAND_CURIOS : REGULAR_CURIOS;
    const preferredIds = stage ? (isGiant ? stage.grandCurioIds : stage.curioPool) : null;
    const stagePool = preferredIds
      ? basePool.filter((c) => preferredIds.includes(c.id))
      : basePool;
    const freshStage = stagePool.filter((c) => !hasCurio(c.id));
    if (freshStage.length > 0) return { ...freshStage[Math.floor(Math.random() * freshStage.length)] };
    const freshAll = basePool.filter((c) => !hasCurio(c.id));
    const list = freshAll.length > 0 ? freshAll : basePool;
    return { ...list[Math.floor(Math.random() * list.length)] };
  }

  function spawnCurioDrop(x, y, curio, isGrand) {
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
    const spd = isGrand ? 95 : 80;
    game.curioDrops.push({
      x,
      y,
      z: 18,
      vz: isGrand ? 195 : 155,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd + 35,
      curio,
      isGrand,
      age: 0,
      pickupDelay: 0.28,
    });
  }

  function getExtractCenter() {
    const map = game.map;
    if (!map) return null;
    const room = map.rooms[map.extractRoomId];
    if (!room) return null;
    return { room, x: room.x + room.w / 2, y: room.y + room.h / 2, radius: 96 };
  }

  function getVaultCenter() {
    const map = game.map;
    if (!map) return null;
    const room = map.rooms[map.vaultRoomId];
    if (!room) return null;
    return { room, x: room.x + room.w / 2, y: room.y + room.h / 2 };
  }

  // ==================== 宝箱开锁与太阳花穹警报 ====================
  function openChest(prop) {
    prop.opened = true;
    prop.unlocking = false;
    prop.openProgress = 1;
    prop.openAnim = 1;
    game.run.chestsOpened += 1;

    const cx = prop.x + prop.w / 2;
    const cy = prop.y + prop.h / 2;
    const curio = pickCurio(prop.isGiant, prop.fixedCurioId);

    spawnCurioDrop(cx, cy, curio, !!prop.isGiant);
    CB.combat.spawnCoins(cx, cy, prop.isGiant ? 10 : (prop.isStarterChest ? 2 : 4), prop.isGiant ? 1.4 : 1.1);
    if (CB.audio) CB.audio.playChestOpen(!!prop.isGiant);

    if (prop.isGiant) {
      game.run.vaultOpened = true;
      game.run.alarmActive = true;
      game.run.alarmPulseTimer = 1.6;
      game.camera.shake = Math.max(game.camera.shake, 9.5);
      game.hitStop = Math.max(game.hitStop, 0.055);

      const p = game.player;
      p.expr = 'happy';
      p.exprTimer = 1.4;

      CB.player.spawnDust(cx, cy - 16, '#ffd65c', 22, 2.0);
      CB.player.spawnDust(cx, cy - 16, '#fff3bf', 12, 1.6);
      CB.player.spawnPopup(cx, cy - 42, '☀ 太阳花穹神匣已启封!', '#c98212');

      const ext = getExtractCenter();
      if (ext && ext.room) ext.room.adjacentSeen = true;

      if (CB.audio) CB.audio.playVaultAlarm();
      CB.combat.emitSoundRipple(cx, cy, 520, 'loud', '#d94436');
      if (CB.guards && CB.guards.alertAllToward) CB.guards.alertAllToward(cx, cy, 880);
      summonPursuitSquad(game.map.vaultRoomId, cx, cy, ['charger', 'magnet']);
    } else {
      game.camera.shake = Math.max(game.camera.shake, 4.2);
      CB.player.spawnDust(cx, cy - 12, prop.isStarterChest ? '#78d4f5' : '#ffe08a', 12, 1.4);
      if (!prop.isStarterChest) {
        CB.combat.emitSoundRipple(cx, cy, 225, 'ricochet');
      }
      CB.player.spawnPopup(
        cx,
        cy - 34,
        prop.isStarterChest ? '🌀 启封构筑奇物匣!' : '开启秘境花匣!',
        '#24829c'
      );
    }
  }

  function summonPursuitSquad(centerRoomId, tx, ty, kinds) {
    const map = game.map;
    if (!map || !CB.guards || !CB.guards.spawnReinforcement) return;
    if (game.guards.length >= 16) return;

    const room = map.rooms[centerRoomId];
    if (!room) return;
    const neighborIds = Array.from(room.neighbors).filter((nid) => map.rooms[nid].role !== 'spawn');
    if (neighborIds.length === 0) return;

    kinds.forEach((kind, idx) => {
      if (game.guards.length >= 16) return;
      const nid = neighborIds[idx % neighborIds.length];
      const spawnRoom = map.rooms[nid];
      CB.guards.spawnReinforcement(kind, spawnRoom, tx, ty);
    });
  }

  function updateChests(dt) {
    const map = game.map;
    const p = game.player;
    const inp = game.input;
    if (!map) return;

    let nearest = null;
    let nearestDist = Infinity;

    for (const prop of map.props) {
      if (prop.type !== 'chest') continue;
      if (prop.openAnim > 0) prop.openAnim = Math.max(0, prop.openAnim - dt * 2.5);
      if (prop.opened) continue;

      const cx = prop.x + prop.w / 2;
      const cy = prop.y + prop.h / 2;
      const maxR = prop.isGiant ? 102 : 86;
      const dist = Math.hypot(p.x - cx, p.y - cy);

      if (dist <= maxR) {
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = { prop, cx, cy };
        }
      } else {
        prop.unlocking = false;
        if (prop.openProgress > 0) prop.openProgress = Math.max(0, prop.openProgress - dt * 0.38);
      }
    }

    if (nearest) {
      const { prop, cx, cy } = nearest;
      if (inp.interactPressed || inp.interactHeld) prop.unlocking = true;

      if (prop.unlocking) {
        prop.openProgress = Math.min(1, prop.openProgress + dt / prop.openDuration);
        prop.wobble = 0.65;
        prop.lockTickAccum += dt;
        if (prop.lockTickAccum >= 0.2) {
          prop.lockTickAccum = 0;
          if (CB.audio) CB.audio.playLockTick(prop.openProgress);
          CB.player.spawnDust(cx + (Math.random() - 0.5) * 32, cy - 16, '#ffe07a', 2, 0.8);
        }

        const pct = Math.round(prop.openProgress * 100);
        game.interactHint = {
          x: cx,
          y: prop.y - prop.height - 26,
          key: `${pct}%`,
          text: prop.isGiant ? '正在启封太阳花神匣...' : '正在开启秘境花匣...',
          accent: '#d4941e',
          progress: prop.openProgress,
        };

        if (prop.openProgress >= 1) {
          openChest(prop);
          game.interactHint = null;
        }
      } else {
        game.interactHint = {
          x: cx,
          y: prop.y - prop.height - 22,
          key: 'E',
          text: prop.isGiant
            ? '启封太阳花神匣 (触发警报!)'
            : prop.isStarterChest
            ? (() => {
                const sc = ALL_CURIOS.find((c) => c.id === prop.fixedCurioId);
                return sc && !hasCurio(sc.id)
                  ? `启封本关奇物匣 (得 ${sc.icon} ${sc.name})`
                  : '启封本关奇物匣 (得物理构筑词条)';
              })()
            : '开启秘境花匣 (得物理构筑词条)',
          accent: prop.isGiant ? '#c93c2b' : prop.isStarterChest ? '#2489b0' : '#c98628',
          progress: prop.openProgress,
        };
      }
    }
  }

  // ==================== 奇物掉落拾取 ====================
  function updateCurioDrops(dt) {
    const p = game.player;
    for (let i = game.curioDrops.length - 1; i >= 0; i--) {
      const d = game.curioDrops[i];
      d.age += dt;
      if (d.pickupDelay > 0) d.pickupDelay -= dt;

      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= Math.exp(-5 * dt);
      d.vy *= Math.exp(-5 * dt);

      if (d.z > 0 || d.vz > 0) {
        d.z += d.vz * dt;
        d.vz -= 540 * dt;
        if (d.z <= 0) {
          d.z = 0;
          d.vz = Math.abs(d.vz) > 40 ? Math.abs(d.vz) * 0.45 : 0;
        }
      }

      if (game.map && game.map.cliffEdges) {
        for (const edge of game.map.cliffEdges) {
          const cx = Math.max(edge.x, Math.min(d.x, edge.x + edge.w));
          const cy = Math.max(edge.y, Math.min(d.y, edge.y + edge.h));
          const dx = d.x - cx;
          const dy = d.y - cy;
          const dist = Math.hypot(dx, dy);
          if (dist < 16) {
            d.x -= edge.outwardX * (18 - dist);
            d.y -= edge.outwardY * (18 - dist);
            const vn = d.vx * edge.outwardX + d.vy * edge.outwardY;
            if (vn > 0) {
              d.vx -= edge.outwardX * vn * 1.5;
              d.vy -= edge.outwardY * vn * 1.5;
            }
          }
        }
      }

      if (d.pickupDelay <= 0) {
        const curioPullR = getMetaBonuses().curioPickupR;
        const dist = Math.hypot(p.x - d.x, p.y - d.y);
        if (dist < curioPullR) {
          const pull = 280 + (1 - dist / curioPullR) * 280;
          d.x += ((p.x - d.x) / (dist || 1)) * pull * dt;
          d.y += ((p.y - d.y) / (dist || 1)) * pull * dt;
        }
        if (dist < p.radius + 14) {
          p.curios.push(d.curio);
          recordCurioUnlocked(d.curio.id);
          p.lootCount = Math.min(20, p.lootCount + (d.isGrand ? 6 : 2));
          if (d.isGrand) {
            game.run.hasGrandCurio = true;
            p.expr = 'happy';
            p.exprTimer = 1.6;
          }
          if (CB.audio) CB.audio.playCurioPickup(d.isGrand);
          CB.player.spawnDust(d.x, d.y - 12, d.curio.color, d.isGrand ? 16 : 10, 1.5);
          CB.player.spawnPopup(
            p.x,
            p.y - 52,
            `${d.curio.icon} ${d.curio.name} · ${d.curio.shortPerk}`,
            d.isGrand ? '#b87700' : '#247e9c'
          );
          game.curioDrops.splice(i, 1);
        }
      }
    }
  }

  function getActiveGust() {
    const g = game.run && game.run.extraction && game.run.extraction.gust;
    if (g && g.active && game.run.phase === 'playing') return g;
    return null;
  }

  function pickExtractionGustDirection(ext) {
    const map = game.map;
    let dx = 1;
    let dy = 0;
    if (map && map.cliffEdges && ext && ext.room) {
      const roomEdges = map.cliffEdges.filter((e) => e.roomId === ext.room.id);
      const openOrBroken = roomEdges.filter((e) => e.kind === 'open' || e.broken);
      const pool = openOrBroken.length > 0 ? openOrBroken : roomEdges;
      if (pool.length > 0) {
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        dx = chosen.outwardX;
        dy = chosen.outwardY;
      } else {
        const ang = Math.atan2(ext.y - map.bounds.cy, ext.x - map.bounds.cx);
        dx = Math.cos(ang);
        dy = Math.sin(ang);
      }
    }
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const label = Math.abs(dx) >= Math.abs(dy)
      ? (dx >= 0 ? '→ 向东阵风' : '← 向西阵风')
      : (dy >= 0 ? '↓ 向南阵风' : '↑ 向北阵风');
    return { dirX: dx, dirY: dy, label };
  }

  // ==================== 热气球撤离倒计时闭环 ====================
  function updateExtractionZone(dt) {
    const ext = getExtractCenter();
    if (!ext) return;

    const p = game.player;
    const ex = game.run.extraction;
    const inp = game.input;

    const dist = Math.hypot(p.x - ext.x, p.y - ext.y);
    ex.inside = dist <= ext.radius + 8;
    ex.ringPulse += dt * (ex.active ? 5.5 : 2.4);

    if (!ex.active) {
      if (ex.inside && !game.interactHint) {
        const dur = game.run.hasGrandCurio || game.run.vaultOpened ? 10 : 7;
        game.interactHint = {
          x: ext.x,
          y: ext.y - 68,
          key: 'E',
          text: game.run.hasGrandCurio
            ? `点燃热气球升空 (${dur}秒 · 携带大金)`
            : `点燃热气球升空 (${dur}秒 · 当前估值 ${getTotalHaulValue()})`,
          accent: '#2b7a9c',
          progress: 0,
        };

        if (inp.interactPressed) {
          ex.active = true;
          ex.duration = dur;
          ex.timeLeft = dur;
          ex.tickAccum = 0;
          ex.tickParity = true;
          ex.midWaveSpawned = false;
          ex.gust = { active: false, dirX: 1, dirY: 0, strength: 0, label: '' };

          if (CB.audio) CB.audio.playWatchStart();
          game.camera.shake = Math.max(game.camera.shake, 5.2);
          CB.player.spawnDust(ext.x, ext.y, '#6bc5e8', 16, 1.6);
          CB.player.spawnPopup(ext.x, ext.y - 54, `🎈 热气球点火充气！坚守 ${dur} 秒`, '#1c7ea6');
          CB.combat.emitSoundRipple(ext.x, ext.y, 440, 'loud', '#3b8fb0');
          if (CB.guards && CB.guards.alertAllToward) CB.guards.alertAllToward(ext.x, ext.y, 760);
          summonPursuitSquad(ext.room.id, ext.x, ext.y, game.run.hasGrandCurio ? ['charger', 'patrol'] : ['patrol']);
        }
      }
      return;
    }

    if (ex.inside) {
      ex.timeLeft = Math.max(0, ex.timeLeft - dt);
      const urgent = ex.timeLeft <= 3.2;
      const tickStep = urgent ? 0.5 : 1.0;
      ex.tickAccum += dt;
      if (ex.tickAccum >= tickStep) {
        ex.tickAccum -= tickStep;
        ex.tickParity = !ex.tickParity;
        if (CB.audio) CB.audio.playWatchTick(urgent, ex.tickParity);
        if (urgent) {
          CB.player.spawnDust(ext.x + (Math.random() - 0.5) * 90, ext.y + (Math.random() - 0.5) * 70, '#7ad6f0', 4, 1.0);
        }
      }

      if (!ex.midWaveSpawned && ex.timeLeft <= ex.duration * 0.5) {
        ex.midWaveSpawned = true;
        CB.combat.emitSoundRipple(ext.x, ext.y, 400, 'ricochet', '#3b8fb0');
        if (CB.guards && CB.guards.alertAllToward) CB.guards.alertAllToward(ext.x, ext.y, 680);
        if (game.run.hasGrandCurio) summonPursuitSquad(ext.room.id, ext.x, ext.y, ['magnet']);
      }

      // 撤离最后 5.5 秒触发「高空阵风」：朝向云海崖口吹起顺风，顺风击退/台球 +45%！
      if (ex.gust && !ex.gust.active && ex.timeLeft <= Math.min(5.5, ex.duration * 0.65)) {
        const picked = pickExtractionGustDirection(ext);
        ex.gust.active = true;
        ex.gust.dirX = picked.dirX;
        ex.gust.dirY = picked.dirY;
        ex.gust.strength = 1;
        ex.gust.label = picked.label;
        if (CB.audio && CB.audio.playGustStart) CB.audio.playGustStart();
        if (CB.audio && CB.audio.setAmbienceGust) CB.audio.setAmbienceGust(true);
        game.camera.shake = Math.max(game.camera.shake, 5.0);
        CB.player.spawnDust(ext.x, ext.y - 10, '#bff4ff', 18, 1.85);
        CB.player.spawnPopup(
          ext.x,
          ext.y - 72,
          `🌬️ 高空阵风来袭（${picked.label} · 顺风击退 +45%）!`,
          '#1b8ab8'
        );
      }

      if (ex.timeLeft <= 0) completeRun('extracted');
    } else if (!game.interactHint) {
      game.interactHint = {
        x: ext.x,
        y: ext.y - 68,
        key: '🎈',
        text: `充气暂停 (${ex.timeLeft.toFixed(1)}s) · 请回到登机台`,
        accent: '#d96b27',
        progress: 1 - ex.timeLeft / ex.duration,
      };
    }
  }

  function computeRunGrade(totalHaul) {
    const r = game.run;
    const stunt = r.stuntBounty || 0;
    if ((r.hasGrandCurio && (totalHaul >= 260 || (totalHaul >= 220 && game.player.hp >= 70))) || (r.hasGrandCurio && stunt >= 80) || totalHaul >= 380) return 'S';
    if (r.hasGrandCurio || totalHaul >= 165 || stunt >= 75) return 'A';
    if (totalHaul >= 85) return 'B';
    return 'C';
  }

  function completeRun(outcome) {
    if (game.run.phase !== 'playing') return;
    game.run.phase = outcome;
    if (game.run.extraction && game.run.extraction.gust) game.run.extraction.gust.active = false;
    if (CB.audio && CB.audio.setAmbienceGust) CB.audio.setAmbienceGust(false);
    game.input.fireHeld = false;
    game.input.interactHeld = false;
    game.interactHint = null;
    game.meta.runs += 1;

    const totalHaul = getTotalHaulValue();
    const grade = outcome === 'extracted' ? computeRunGrade(totalHaul) : 'F';

    if (outcome === 'extracted') {
      game.meta.extractions += 1;
      game.meta.bankValue += totalHaul;
      if (totalHaul > game.meta.bestHaul) game.meta.bestHaul = totalHaul;
      for (const c of game.player.curios) {
        if (!game.meta.unlockedCurios.includes(c.id)) game.meta.unlockedCurios.push(c.id);
      }
      if (!game.meta.clearedStages.includes(game.currentStageId)) {
        game.meta.clearedStages.push(game.currentStageId);
      }
      for (const sk of SKIN_DEFS) {
        if (sk.freeStage === game.currentStageId && !game.meta.unlockedSkins.includes(sk.id)) {
          game.meta.unlockedSkins.push(sk.id);
          CB.player.spawnPopup(game.player.x, game.player.y - 54, `✨ 解锁新外观 · ${sk.name}!`, '#c98212');
        }
      }
      if (CB.audio) CB.audio.playExtractSuccess();
      CB.player.spawnDust(game.player.x, game.player.y - 16, '#ffd65c', 26, 2.1);
      CB.player.spawnDust(game.player.x, game.player.y - 16, '#6bc5e8', 18, 1.8);
    } else {
      if (CB.audio) CB.audio.playRunFail();
    }

    saveMeta();
    if (CB.ui && CB.ui.showRunSummary) {
      const stage = CB.stages ? CB.stages.getStage(game.currentStageId) : null;
      const nextStage = CB.stages ? CB.stages.getNextStage(game.currentStageId) : null;
      CB.ui.showRunSummary({
        stageId: game.currentStageId,
        stageName: stage ? stage.name : '',
        stageTagline: stage ? stage.tagline : '',
        haulMult: stage ? stage.haulMult : 1.0,
        nextStage,
        outcome,
        grade,
        totalHaul,
        curioValue: getCurioHaulValue(),
        stuntBounty: getStuntBounty(),
        coinValue: game.player.coins * 2,
        coins: game.player.coins,
        curios: game.player.curios.slice(),
        elapsed: game.run.elapsed,
        guardsDefeated: game.run.guardsDefeated,
        ricochetCrits: game.run.ricochetCrits,
        slingshotCrits: game.run.slingshotCrits,
        vorticesSpawned: game.run.vorticesSpawned,
        billiardHits: game.run.billiardHits,
        monsterChains: game.run.monsterChains,
        cliffDrops: game.run.cliffDrops,
        chestsOpened: game.run.chestsOpened,
        hasGrandCurio: game.run.hasGrandCurio,
        seed: game.map ? game.map.seed : 0,
      });
    }
  }

  function triggerFailure() {
    completeRun('failed');
  }

  // ==================== 日光棱镜旋转 & 星轨仪极性翻转 [E] 交互 ====================
  function updateDeviceInteract() {
    if (game.interactHint || !game.map) return;
    const p = game.player;
    const inp = game.input;

    let nearest = null;
    let bestD = 82;
    for (const prop of game.map.props) {
      if (prop.type !== 'prism' && prop.type !== 'orrery') continue;
      const d = Math.hypot(p.x - prop.x, p.y - prop.y);
      if (d < bestD) {
        bestD = d;
        nearest = prop;
      }
    }

    if (!nearest) return;

    if (nearest.type === 'prism') {
      game.interactHint = {
        x: nearest.x,
        y: nearest.y - nearest.height - 22,
        key: 'E',
        text: '旋转日光棱镜 45°',
        accent: '#d48d14',
        progress: 0,
      };
      if (inp.interactPressed) {
        nearest.angle += Math.PI / 4;
        nearest.hitFlash = 0.85;
        nearest.pulse = 0.85;
        if (CB.audio) CB.audio.playPrismRotate();
        CB.player.spawnDust(nearest.x, nearest.y - 16, '#fff099', 6, 1.0);
        CB.player.spawnPopup(nearest.x, nearest.y - 34, '✦ 棱镜转向', '#c98212');
      }
    } else if (nearest.type === 'orrery') {
      const isAttract = nearest.polarity > 0;
      game.interactHint = {
        x: nearest.x,
        y: nearest.y - nearest.height - 24,
        key: 'E',
        text: isAttract ? '切换星轨仪 → 斥力偏折场' : '切换星轨仪 → 引力弯道场',
        accent: isAttract ? '#d96c4a' : '#2a8eb8',
        progress: 0,
      };
      if (inp.interactPressed) {
        nearest.polarity *= -1;
        nearest.hitFlash = 0.9;
        nearest.pulse = 1;
        const nowAttract = nearest.polarity > 0;
        if (CB.audio) CB.audio.playPolarityFlip(nowAttract);
        CB.player.spawnDust(nearest.x, nearest.y - 16, nowAttract ? '#6ed8f5' : '#ff9d7a', 10, 1.25);
        CB.player.spawnPopup(
          nearest.x,
          nearest.y - 38,
          nowAttract ? '🪐 切换 · 引力弯道场' : '☀ 切换 · 斥力偏折场',
          nowAttract ? '#1f84a8' : '#cf5b38'
        );
      }
    }
  }

  function updateExtractionLoop(dt) {
    if (game.run.phase !== 'playing') return;
    game.run.elapsed += dt;
    game.interactHint = null;

    if (game.run.alarmActive) {
      game.run.alarmPulseTimer -= dt;
      if (game.run.alarmPulseTimer <= 0) {
        game.run.alarmPulseTimer = 4.5;
        const v = getVaultCenter();
        if (v) CB.combat.emitSoundRipple(v.x, v.y, 260, 'loud', '#d94436');
      }
    }

    updateChests(dt);
    updateCurioDrops(dt);
    updateExtractionZone(dt);
    updateDeviceInteract();

    game.input.interactPressed = false;
  }

  loadMeta();

  CB.extraction = {
    REGULAR_CURIOS,
    GRAND_CURIOS,
    ALL_CURIOS,
    UPGRADE_DEFS,
    SKIN_DEFS,
    SUPPLY_COST,
    getMetaBonuses,
    isSkinUnlocked,
    buyUpgrade,
    unlockOrSelectSkin,
    toggleLoadoutCurio,
    canAffordAnyUpgrade,
    recordCurioUnlocked,
    recordGuardSeen,
    recordGuardDefeated,
    loadMeta,
    saveMeta,
    resetMeta,
    resetRunState,
    hasCurio,
    getCurioHaulValue,
    getStuntBounty,
    addStuntBounty,
    getTotalHaulValue,
    getExtractCenter,
    getActiveGust,
    getVaultCenter,
    updateExtractionLoop,
    triggerFailure,
  };
})();
