(() => {
  const CB = window.CB;
  const game = CB.game;

  const META_STORAGE_KEY = 'curio_box_meta_v2';

  // ==================== 局内物理构筑词条奇物库 ====================
  // ==================== v9.6b 四大学科羁绊共鸣定义（集齐 2 件同科奇物激活质变） ====================
  const SYNERGY_DEFS = {
    thermal: {
      id: 'thermal',
      icon: '🔥',
      name: '热学共鸣',
      short: '🔥 炽热星弹',
      threshold: 2,
      color: '#e65d2e',
      perk: '蓄力重弹自带灼热轨迹：沿途融冰化水/沸腾、融化霜壳蜗卫，直击高压罐一发红温引爆！',
    },
    optics: {
      id: 'optics',
      icon: '🔆',
      name: '光学共鸣',
      short: '🔆 光网分光',
      threshold: 2,
      color: '#d99814',
      perk: '星针与重弹穿过镜面光网自动分光为双折光束（伤害×1.25 破镜甲），凸透镜焦斑 +25%！',
    },
    electro: {
      id: 'electro',
      icon: '⚡',
      name: '电学共鸣',
      short: '⚡ 疾电弧步',
      threshold: 2,
      color: '#229fd4',
      perk: '冲刺路径留下瞬时高压电弧：经过导电积水直接全池跳电麻痹，近距给守卫涂装电荷！',
    },
    relativity: {
      id: 'relativity',
      icon: '🕳️',
      name: '相对论共鸣',
      short: '🕳️ 微型视界',
      threshold: 2,
      color: '#884ee0',
      perk: '满蓄重弹或超频金珠命中落点自动展开 1.6s 微型时间膨胀泡（0.15× 冻结蓄能并坍缩引爆）！',
    },
  };

  const REGULAR_CURIOS = [
    {
      id: 'vortex_core',
      discipline: 'relativity',
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
      discipline: 'optics',
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
      discipline: 'optics',
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
      discipline: 'optics',
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
      discipline: 'electro',
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
      discipline: 'thermal',
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
      discipline: 'thermal',
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
      discipline: 'thermal',
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
      discipline: 'electro',
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
      discipline: 'electro',
      name: '云海悬赏风铃',
      icon: '🔔',
      rarity: 'epic',
      value: 70,
      color: '#4ec8e8',
      shortPerk: '崖杀+4金·回8血',
      perk: '每次击落云海额外喷出 4 金币、回复 8 生命值，且特技赏金额外 +15',
    },
    {
      id: 'event_horizon',
      discipline: 'relativity',
      name: '视界怀表',
      icon: '⏳',
      rarity: 'epic',
      value: 74,
      color: '#9b6ee8',
      shortPerk: '时膨+1.2s·坍缩+40%',
      perk: '黑洞时间膨胀场持续时间 +1.2s，奇点坍缩引爆的蓄积动量与伤害 +40%',
    },
    {
      id: 'lorentz_prism',
      discipline: 'relativity',
      name: '洛伦兹飞轮',
      icon: '⚡',
      rarity: 'epic',
      value: 76,
      color: '#46c8f5',
      shortPerk: '质增提速·虫洞+25%',
      perk: '轨道公转加速与相对论质增阈值降低 20%，虫洞折跃喷射速度额外 +25%',
    },
    {
      id: 'thermo_valve',
      discipline: 'thermal',
      name: '热力学活门',
      icon: '🌡️',
      rarity: 'epic',
      value: 76,
      color: '#e86838',
      shortPerk: '升温+45%·热爆+30%',
      perk: '聚光融冰、沸腾与高压罐升温速率 +45%，热膨胀爆破冲击半径 +30%',
    },
    {
      id: 'mirror_prism',
      discipline: 'optics',
      name: '全反射晶镜',
      icon: '🪞',
      rarity: 'epic',
      value: 78,
      color: '#e8b62c',
      shortPerk: '光网+2.5s·光伤+35%',
      perk: '镜面光网持续时间 +2.5s，光网切割与凸透镜聚光灼烧伤害 +35%',
    },
    {
      id: 'faraday_coil',
      discipline: 'electro',
      name: '法拉第线圈',
      icon: '🔋',
      rarity: 'epic',
      value: 78,
      color: '#32a8dc',
      shortPerk: '跳电+40%·库仑+35%',
      perk: '水域导电链跳跃距离 +40%，正负电荷同极斥飞与异极强吸力度 +35%',
    },
  ];

  const GRAND_CURIOS = [
    {
      id: 'orrery',
      discipline: 'relativity',
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
      discipline: 'relativity',
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
      discipline: 'thermal',
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
      discipline: 'optics',
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
      orbRecharge: [4.2, 3.7, 3.2, 2.7],
      labels: ['蓄力标准 · 4.2s回珠', '蓄力-10% · 3.7s回珠', '蓄力-20% · 3.2s回珠', '蓄力-30% · 2.7s回珠'],
      shortPerk: '重弹蓄力 & 星珠回充',
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
      orbRadius: [84, 122, 160, 202],
      startCoins: [12, 16, 20, 25],
      labels: ['起手12金 · 吸珠标准', '吸金/珠+ · 16金', '吸金/珠++ · 20金', '吸金/珠+++ · 25金'],
      shortPerk: '吸金/吸珠范围 & 起手金币',
    },
    {
      id: 'orbCap',
      name: '星露珠匣扩容',
      icon: '💠',
      color: '#1e9cd4',
      maxLv: 1,
      costs: [680],
      values: [3, 4],
      labels: ['上限 3 颗星露珠', '上限 4 颗星露珠'],
      shortPerk: '高阶扩建 · 永久 +1 弹珠上限',
    },
    {
      id: 'salvagePod',
      name: '云海打捞保险舱',
      icon: '🛡️',
      color: '#4f8c68',
      maxLv: 3,
      costs: [220, 440, 720],
      ratios: [0.20, 0.30, 0.40, 0.50],
      labels: ['失利打捞 20%', '失利打捞 30%', '失利打捞 40%', '失利打捞 50%'],
      shortPerk: '高阶扩建 · 深空失利打捞率',
    },
    {
      id: 'chartScope',
      name: '深空航图望远镜',
      icon: '🔭',
      color: '#8856d6',
      maxLv: 2,
      costs: [200, 480],
      rerolls: [0, 1, 2],
      labels: ['航图 0 次重抽', '每趟 1 次重抽航线', '每趟 2 次重抽航线'],
      shortPerk: '高阶扩建 · 罗盘航线重抽',
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
      badge: '从第2航段撤离或金库解锁',
      desc: '天青瓷釉光环与双飘带',
    },
    {
      id: 'sprout',
      code: 'C',
      name: '嫩芽软绒团子',
      cost: 340,
      freeStage: 3,
      badge: '从第3航段撤离或金库解锁',
      desc: '摇曳嫩绿双芽与金铃斗篷',
    },
  ];

  // ==================== v9.6 纯离线「每日云海挑战 & 3 条物理悬赏令」 ====================
  const DAILY_BOUNTY_POOL = [
    {
      id: 'cliff_drop_2',
      icon: '☁️',
      title: '云海清场者',
      desc: '单趟将至少 2 名守卫击落云海崖边',
      reward: 95,
      check: (r) => (r.cliffDrops || 0) >= 2,
    },
    {
      id: 'monster_chain_2',
      icon: '🎱',
      title: '动量台球手',
      desc: '单趟触发至少 2 次怪物台球连撞',
      reward: 100,
      check: (r) => (r.monsterChains || 0) >= 2,
    },
    {
      id: 'physics_lab_3',
      icon: '⚗️',
      title: '跨学科实验家',
      desc: '单趟触发至少 3 次热/光/电/相对论高阶机关反应',
      reward: 110,
      check: (r) => (r.dailyLabTriggers || 0) >= 3,
    },
    {
      id: 'stunt_bounty_80',
      icon: '✨',
      title: '物理特技大师',
      desc: '单趟累计获得至少 80 💎 物理特技赏金',
      reward: 115,
      check: (r) => (r.stuntBounty || 0) >= 80,
    },
    {
      id: 'slingshot_prism_3',
      icon: '🪐',
      title: '星轨折光射手',
      desc: '单趟触发至少 3 次星轨弹弓/棱镜/折射暴击',
      reward: 100,
      check: (r) => (r.ricochetCrits || 0) >= 3,
    },
    {
      id: 'daily_extract_win',
      icon: '🎈',
      title: '每日凯旋撤离',
      desc: '安全乘热气球从今日每日云海空域撤离',
      reward: 140,
      check: (r, outcome) => outcome === 'extracted',
    },
  ];

  function getLocalDateKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function hashStringSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (Math.abs(h) % 899999) + 100000;
  }

  function getDailyChallengeSpec() {
    ensureMetaShape();
    const dateKey = getLocalDateKey();
    const seed = hashStringSeed(`CURIO_DAILY_${dateKey}`);
    const combos = [
      { anomalies: ['optics', 'thermal'], climateId: 'aurora_frost', title: '极光光热实验场' },
      { anomalies: ['thermal', 'electro'], climateId: 'thunder_violet', title: '雷云水电实验场' },
      { anomalies: ['optics', 'electro'], climateId: 'crystal_prism', title: '琉璃电光实验场' },
      { anomalies: ['relativity', 'electro'], climateId: 'horizon_void', title: '深空时空雷暴带' },
      { anomalies: ['friction', 'relativity'], climateId: 'aurora_frost', title: '霜晶引力滑道域' },
      { anomalies: ['gravity', 'optics'], climateId: 'starry_night', title: '星夜棱镜观测穹' },
    ];
    const combo = combos[seed % combos.length];
    const mutKeys = CB.stages && CB.stages.MUTATORS ? Object.keys(CB.stages.MUTATORS) : ['low_gravity'];
    const mutId = mutKeys[(seed >> 3) % mutKeys.length];

    // 固定 3 条不重复每日悬赏（第 3 条固定为每日凯旋撤离，前 2 条由今日种子确定性抽取）
    const nonExtract = DAILY_BOUNTY_POOL.slice(0, DAILY_BOUNTY_POOL.length - 1);
    const idxA = (seed >> 5) % nonExtract.length;
    const idxB = (idxA + 1 + ((seed >> 9) % (nonExtract.length - 1))) % nonExtract.length;
    const bounties = [
      nonExtract[idxA],
      nonExtract[idxB],
      DAILY_BOUNTY_POOL[DAILY_BOUNTY_POOL.length - 1],
    ];

    const node = {
      id: `daily_${dateKey}`,
      leg: 2,
      nodeType: 'standard',
      isDaily: true,
      dailyDateKey: dateKey,
      altitude: 2880,
      climateId: combo.climateId,
      anomalies: combo.anomalies.slice(),
      mutators: [mutId],
      omenIcons: '📅',
      omenTitle: `每日云海 · ${combo.title}`,
      omenCue: '全球统一种子 · 完成 3 条物理悬赏领丰厚母港金库奖励',
      dangerLabel: '📅 每日挑战',
      haulMult: 1.65,
      wantAtrium: false,
    };

    const dailyMeta = game.meta.daily;
    const claimedSet = new Set(dailyMeta.claimedIds || []);
    return {
      dateKey,
      seed,
      title: combo.title,
      node,
      mutator: CB.stages && CB.stages.MUTATORS ? CB.stages.MUTATORS[mutId] : null,
      bounties: bounties.map((b) => ({
        ...b,
        claimed: claimedSet.has(b.id),
      })),
      unclaimedCount: bounties.filter((b) => !claimedSet.has(b.id)).length,
      bestHaul: dailyMeta.bestHaul || 0,
      cleared: !!dailyMeta.cleared,
    };
  }

  function recordDailyLabTrigger() {
    if (game.run && game.run.phase === 'playing') {
      game.run.dailyLabTriggers = (game.run.dailyLabTriggers || 0) + 1;
    }
  }

  function evaluateDailyBounties(outcome, totalHaul) {
    if (!game.run || !game.run.isDaily) return { newlyClaimed: [], totalReward: 0 };
    const spec = getDailyChallengeSpec();
    const dm = game.meta.daily;
    const newlyClaimed = [];
    let totalReward = 0;

    if (outcome === 'extracted') {
      dm.cleared = true;
      if (totalHaul > (dm.bestHaul || 0)) dm.bestHaul = totalHaul;
    }

    for (const b of spec.bounties) {
      if (b.claimed) continue;
      if (b.check(game.run, outcome)) {
        dm.claimedIds.push(b.id);
        newlyClaimed.push(b);
        totalReward += b.reward;
      }
    }

    if (totalReward > 0) {
      game.meta.bankValue += totalReward;
    }
    return { newlyClaimed, totalReward };
  }

  function ensureMetaShape() {
    const m = game.meta;
    if (!m.upgrades || typeof m.upgrades !== 'object') {
      m.upgrades = { maxHp: 0, chargeSpeed: 0, dashCd: 0, magnet: 0, orbCap: 0, salvagePod: 0, chartScope: 0 };
    } else {
      m.upgrades.maxHp = Math.max(0, Math.min(3, Number(m.upgrades.maxHp) || 0));
      m.upgrades.chargeSpeed = Math.max(0, Math.min(3, Number(m.upgrades.chargeSpeed) || 0));
      m.upgrades.dashCd = Math.max(0, Math.min(3, Number(m.upgrades.dashCd) || 0));
      m.upgrades.magnet = Math.max(0, Math.min(3, Number(m.upgrades.magnet) || 0));
      m.upgrades.orbCap = Math.max(0, Math.min(1, Number(m.upgrades.orbCap) || 0));
      m.upgrades.salvagePod = Math.max(0, Math.min(3, Number(m.upgrades.salvagePod) || 0));
      m.upgrades.chartScope = Math.max(0, Math.min(2, Number(m.upgrades.chartScope) || 0));
    }
    const todayKey = getLocalDateKey();
    if (!m.daily || typeof m.daily !== 'object' || m.daily.dateKey !== todayKey) {
      m.daily = { dateKey: todayKey, claimedIds: [], bestHaul: 0, cleared: false };
    } else if (!Array.isArray(m.daily.claimedIds)) {
      m.daily.claimedIds = [];
    }
    if (!Array.isArray(m.unlockedSkins) || !m.unlockedSkins.includes('explorer')) {
      m.unlockedSkins = Array.isArray(m.unlockedSkins) ? ['explorer', ...m.unlockedSkins] : ['explorer'];
    }
    m.deepestLeg = Math.max(Number(m.deepestLeg) || 0, Array.isArray(m.clearedStages) ? m.clearedStages.length : 0);
    m.maxAltitude = Math.max(Number(m.maxAltitude) || 0, m.deepestLeg > 0 ? 1200 + (m.deepestLeg - 1) * 1150 : 0);
    m.bossesCleared = Number(m.bossesCleared) || 0;
    m.trialsCleared = Number(m.trialsCleared) || 0;
    for (const sk of SKIN_DEFS) {
      if (sk.freeStage > 0 && (m.deepestLeg >= sk.freeStage || (Array.isArray(m.clearedStages) && m.clearedStages.includes(sk.freeStage)))) {
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
    const orbDef = UPGRADE_DEFS[4];
    const salvDef = UPGRADE_DEFS[5];
    const scopeDef = UPGRADE_DEFS[6];
    return {
      maxHp: hpDef.values[u.maxHp] || 100,
      chargeMult: chDef.mults[u.chargeSpeed] || 1.0,
      tapMult: chDef.tapMults[u.chargeSpeed] || 1.0,
      orbRecharge: chDef.orbRecharge[u.chargeSpeed] || 4.2,
      dashCdMult: dsDef.mults[u.dashCd] || 1.0,
      coinPickupR: mgDef.coinRadius[u.magnet] || 68,
      curioPickupR: mgDef.curioRadius[u.magnet] || 115,
      orbPickupR: mgDef.orbRadius[u.magnet] || 84,
      startCoins: mgDef.startCoins[u.magnet] || 12,
      maxOrbs: (orbDef && orbDef.values[u.orbCap]) || 3,
      salvageRatio: (salvDef && salvDef.ratios[u.salvagePod]) || 0.20,
      chartRerolls: (scopeDef && scopeDef.rerolls[u.chartScope]) || 0,
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
          if (parsed.deepestLeg) game.meta.deepestLeg = Number(parsed.deepestLeg) || 0;
          if (parsed.maxAltitude) game.meta.maxAltitude = Number(parsed.maxAltitude) || 0;
          if (parsed.bossesCleared) game.meta.bossesCleared = Number(parsed.bossesCleared) || 0;
          if (parsed.trialsCleared) game.meta.trialsCleared = Number(parsed.trialsCleared) || 0;
          if (parsed.daily && typeof parsed.daily === 'object') game.meta.daily = parsed.daily;
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
    game.meta.deepestLeg = 0;
    game.meta.maxAltitude = 0;
    game.meta.bossesCleared = 0;
    game.meta.trialsCleared = 0;
    game.meta.daily = { dateKey: getLocalDateKey(), claimedIds: [], bestHaul: 0, cleared: false };
    game.variant = 'explorer';
    saveMeta();
  }

  function resetRunState(keepCurios = false) {
    const carried = keepCurios ? game.player.curios.slice() : [];
    const curSt = getCurrentSectorSpec();
    const curNodeType = (curSt && curSt.nodeType) || 'standard';
    game.run = {
      stageId: game.currentStageId,
      nodeType: curNodeType,
      phase: 'playing',
      trialHeavyShots: 0,
      trialGraceTimer: curNodeType === 'trial' ? 4.5 : 0,
      trialPerfect: false,
      periodicGustTimer: 5.5,
      periodicGustActiveTimer: 0,
      isDaily: !!(game.voyage && game.voyage.isDaily),
      dailyDateKey: (game.voyage && game.voyage.isDaily) ? getLocalDateKey() : null,
      dailyLabTriggers: 0,
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

  function getSynergyCounts() {
    const counts = { thermal: 0, optics: 0, electro: 0, relativity: 0 };
    const list = (game.player && game.player.curios) || [];
    for (let i = 0; i < list.length; i++) {
      const d = list[i].discipline;
      if (d && counts[d] !== undefined) counts[d]++;
    }
    return counts;
  }

  function getActiveSynergies() {
    const counts = getSynergyCounts();
    const res = [];
    for (const k in SYNERGY_DEFS) {
      const def = SYNERGY_DEFS[k];
      if ((counts[k] || 0) >= def.threshold) res.push(def);
    }
    return res;
  }

  function hasSynergy(discId) {
    const def = SYNERGY_DEFS[discId];
    if (!def) return false;
    const counts = getSynergyCounts();
    return (counts[discId] || 0) >= def.threshold;
  }

  function checkAndAnnounceSynergy(addedCurio) {
    if (!addedCurio || !addedCurio.discipline) return null;
    const def = SYNERGY_DEFS[addedCurio.discipline];
    if (!def) return null;
    const counts = getSynergyCounts();
    if (counts[addedCurio.discipline] === def.threshold) {
      if (CB.audio && CB.audio.playTrialWin) CB.audio.playTrialWin();
      if (CB.player && CB.player.spawnPopup) {
        CB.player.spawnPopup(game.player.x, game.player.y - 72, `✨ 激活 ${def.short}（${def.name}）!`, def.color);
      }
      return def;
    }
    return null;
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

  function getCurrentSectorSpec() {
    if (game.map && game.map.stage) return game.map.stage;
    return CB.stages ? CB.stages.getStage(game.currentStageId) : null;
  }

  function getTotalHaulValue() {
    const stage = getCurrentSectorSpec();
    const sectorMult = stage ? (stage.haulMult || 1.0) : 1.0;
    const chainMult = (game.voyage && game.voyage.active && game.voyage.chainMult) ? game.voyage.chainMult : 1.0;
    const dblVaultMult = (CB.stages && CB.stages.hasMutator && CB.stages.hasMutator('double_vault')) ? 1.4 : 1.0;
    const bossBonus = (stage && stage.nodeType === 'boss') ? 1.25 : 1.0;
    return Math.round((getCurioHaulValue() + game.player.coins * 2 + getStuntBounty()) * sectorMult * chainMult * dblVaultMult * bossBonus);
  }

  function startNewVoyage(firstNode = null) {
    const isFirst = (game.meta.runs || 0) === 0;
    const node = firstNode || (CB.stages ? CB.stages.createInitialVoyageNode(isFirst) : null);
    game.voyage = {
      active: true,
      leg: node ? node.leg : 1,
      altitude: node ? node.altitude : 1200,
      pendingHaul: 0,
      chainMult: 1.0,
      currentNode: node,
      nextChoices: [],
      visitedAnomalies: node && node.anomalies ? node.anomalies.slice() : [],
      nextStartOverclock: false,
      rerollsLeft: getMetaBonuses().chartRerolls || 0,
      isDaily: !!(node && node.isDaily),
    };
    return node;
  }

  function advanceVoyageToNode(node) {
    if (!node) return null;
    const v = game.voyage;
    v.active = true;
    v.leg = node.leg || (v.leg + 1);
    v.altitude = node.altitude || (1200 + (v.leg - 1) * 1150);
    v.chainMult = Number((1.0 + (v.leg - 1) * 0.25).toFixed(2));
    v.currentNode = node;
    v.nextChoices = [];
    if (Array.isArray(node.anomalies)) {
      for (const a of node.anomalies) {
        if (!v.visitedAnomalies.includes(a)) v.visitedAnomalies.push(a);
      }
    }
    return node;
  }

  function bankVoyageAndFinish() {
    const v = game.voyage;
    const banked = Math.max(0, Math.round(v.pendingHaul || 0));
    if (banked > 0) {
      game.meta.bankValue += banked;
      if (banked > game.meta.bestHaul) game.meta.bestHaul = banked;
    }
    v.active = false;
    v.pendingHaul = 0;
    v.chainMult = 1.0;
    v.nextChoices = [];
    v.nextStartOverclock = false;
    saveMeta();
    return banked;
  }

  function pickCurio(isGiant, fixedId = null) {
    if (fixedId) {
      const exact = ALL_CURIOS.find((c) => c.id === fixedId);
      if (exact && !hasCurio(fixedId)) return { ...exact };
    }
    const stage = getCurrentSectorSpec();
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
          checkAndAnnounceSynergy(d.curio);
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

    const stage = getCurrentSectorSpec();
    const v = game.voyage;
    const curLeg = (v && v.leg) || (stage && stage.leg) || 1;
    const curAlt = (v && v.altitude) || (stage && stage.altitude) || 1200;
    const totalHaul = getTotalHaulValue();
    const grade = outcome === 'extracted' ? computeRunGrade(totalHaul) : 'F';

    let salvagedHaul = 0;
    let lostPending = 0;

    if (outcome === 'extracted') {
      game.meta.extractions += 1;
      if (stage && stage.nodeType === 'boss') game.meta.bossesCleared = (game.meta.bossesCleared || 0) + 1;
      if (stage && stage.nodeType === 'trial') game.meta.trialsCleared = (game.meta.trialsCleared || 0) + 1;
      v.active = true;
      v.pendingHaul = Math.round((v.pendingHaul || 0) + totalHaul);
      if (v.pendingHaul > game.meta.bestHaul) game.meta.bestHaul = v.pendingHaul;
      if (curLeg > (game.meta.deepestLeg || 0)) game.meta.deepestLeg = curLeg;
      if (curAlt > (game.meta.maxAltitude || 0)) game.meta.maxAltitude = curAlt;

      for (const c of game.player.curios) {
        if (!game.meta.unlockedCurios.includes(c.id)) game.meta.unlockedCurios.push(c.id);
      }
      if (!game.meta.clearedStages.includes(curLeg)) {
        game.meta.clearedStages.push(curLeg);
      }
      for (const sk of SKIN_DEFS) {
        if (sk.freeStage > 0 && curLeg >= sk.freeStage && !game.meta.unlockedSkins.includes(sk.id)) {
          game.meta.unlockedSkins.push(sk.id);
          CB.player.spawnPopup(game.player.x, game.player.y - 54, `✨ 解锁新外观 · ${sk.name}!`, '#c98212');
        }
      }

      if (CB.stages && CB.stages.generateNextChoices) {
        v.nextChoices = CB.stages.generateNextChoices(curLeg + 1, v.currentNode);
      }

      if (CB.audio) CB.audio.playExtractSuccess();
      CB.player.spawnDust(game.player.x, game.player.y - 16, '#ffd65c', 26, 2.1);
      CB.player.spawnDust(game.player.x, game.player.y - 16, '#6bc5e8', 18, 1.8);
    } else {
      lostPending = Math.round((v.pendingHaul || 0) + totalHaul);
      if ((v.pendingHaul || 0) > 0) {
        const salvRatio = getMetaBonuses().salvageRatio || 0.20;
        salvagedHaul = Math.round(v.pendingHaul * salvRatio);
        game.meta.bankValue += salvagedHaul;
      }
      v.active = false;
      v.pendingHaul = 0;
      v.chainMult = 1.0;
      v.nextChoices = [];
      if (CB.audio) CB.audio.playRunFail();
    }

    const dailyEval = evaluateDailyBounties(outcome, totalHaul);
    saveMeta();
    if (CB.ui && CB.ui.showRunSummary) {
      CB.ui.showRunSummary({
        stageId: curLeg,
        leg: curLeg,
        nodeType: (stage && stage.nodeType) || 'standard',
        isDaily: !!game.run.isDaily,
        dailyBountiesClaimed: dailyEval.newlyClaimed,
        dailyRewardGold: dailyEval.totalReward,
        trialPerfect: !!game.run.trialPerfect,
        trialHeavyShots: game.run.trialHeavyShots || 0,
        mutatorObjs: (stage && stage.mutatorObjs) || [],
        altitude: curAlt,
        stageName: stage ? stage.name : '未知云域',
        stageTagline: stage ? stage.tagline : '',
        omenIcons: stage ? (stage.omenIcons || '☁') : '☁',
        haulMult: stage ? (stage.haulMult || 1.0) : 1.0,
        chainMult: v.chainMult || 1.0,
        pendingHaul: v.pendingHaul || 0,
        salvagedHaul,
        lostPending,
        nextChoices: v.nextChoices || [],
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
      if (prop.type !== 'prism' && prop.type !== 'orrery' && prop.type !== 'convex_lens' && prop.type !== 'charge_pylon') continue;
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
        if (nearest.polarity < 0 && CB.combat && CB.combat.releaseOrbitingBodies) {
          CB.combat.releaseOrbitingBodies(nearest);
        }
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
    } else if (nearest.type === 'convex_lens') {
      game.interactHint = {
        x: nearest.x,
        y: nearest.y - nearest.height - 24,
        key: 'E',
        text: '旋转凸透镜焦向 45°',
        accent: '#d9961c',
        progress: 0,
      };
      if (inp.interactPressed) {
        nearest.angle = (nearest.angle || 0) + Math.PI / 4;
        nearest.hitFlash = 0.85;
        nearest.pulse = 0.85;
        if (CB.audio) CB.audio.playPrismRotate();
        CB.player.spawnDust(nearest.x, nearest.y - 14, '#ffe675', 8, 1.2);
        CB.player.spawnPopup(nearest.x, nearest.y - 40, '🔆 调整聚光焦向', '#c98412');
      }
    } else if (nearest.type === 'charge_pylon') {
      const isPos = (nearest.chargeSign || 1) >= 0;
      game.interactHint = {
        x: nearest.x,
        y: nearest.y - nearest.height - 24,
        key: 'E',
        text: isPos ? '切换电荷桩 → 负电极 (-)' : '切换电荷桩 → 正电极 (+)',
        accent: isPos ? '#2ca8d6' : '#e05a4c',
        progress: 0,
      };
      if (inp.interactPressed) {
        nearest.chargeSign = isPos ? -1 : 1;
        nearest.hitFlash = 0.85;
        nearest.pulse = 0.9;
        const nowPos = nearest.chargeSign > 0;
        if (CB.audio) CB.audio.playPolarityFlip(nowPos);
        CB.player.spawnDust(nearest.x, nearest.y - 16, nowPos ? '#ff8270' : '#68e4ff', 9, 1.25);
        CB.player.spawnPopup(
          nearest.x,
          nearest.y - 42,
          nowPos ? '⚡ 正电荷桩 (+)' : '⚡ 负电荷桩 (-)',
          nowPos ? '#d9483b' : '#2498c9'
        );
      }
    }
  }

  function updatePeriodicGust(dt) {
    if (!(CB.stages && CB.stages.hasMutator && CB.stages.hasMutator('periodic_gust'))) return;
    const ex = game.run.extraction;
    if (!ex || ex.active || !ex.gust) return;
    if (game.run.periodicGustActiveTimer > 0) {
      game.run.periodicGustActiveTimer -= dt;
      if (game.run.periodicGustActiveTimer <= 0) {
        ex.gust.active = false;
        if (CB.audio && CB.audio.setAmbienceGust) CB.audio.setAmbienceGust(false);
        game.run.periodicGustTimer = 11.5;
      }
      return;
    }
    game.run.periodicGustTimer -= dt;
    if (game.run.periodicGustTimer <= 0) {
      const dirs = [
        { dirX: 1, dirY: 0, label: '东向阵风' },
        { dirX: -1, dirY: 0, label: '西向阵风' },
        { dirX: 0, dirY: 1, label: '南向阵风' },
        { dirX: 0, dirY: -1, label: '北向阵风' },
      ];
      const pickD = dirs[Math.floor(Math.random() * dirs.length)];
      ex.gust.active = true;
      ex.gust.dirX = pickD.dirX;
      ex.gust.dirY = pickD.dirY;
      ex.gust.strength = 1;
      ex.gust.label = pickD.label;
      game.run.periodicGustActiveTimer = 4.5;
      if (CB.audio && CB.audio.playGustStart) CB.audio.playGustStart();
      if (CB.audio && CB.audio.setAmbienceGust) CB.audio.setAmbienceGust(true);
      CB.player.spawnPopup(game.player.x, game.player.y - 52, `🌬️ 周期乱流（${pickD.label} · 顺风+45%）!`, '#1b8ab8');
    }
  }

  function updateTrialVictory(dt) {
    if (game.run.nodeType !== 'trial') return;
    if (game.run.trialGraceTimer > 0) {
      game.run.trialGraceTimer = Math.max(0, game.run.trialGraceTimer - dt);
    }
    if (game.guards.length === 0 && (!game.fallingGuards || game.fallingGuards.length === 0)) {
      const perfect = (game.run.trialHeavyShots || 0) <= 2;
      game.run.trialPerfect = perfect;
      addStuntBounty(perfect ? 140 : 70);
      if (perfect) {
        const owned = new Set(game.player.curios.map((c) => c.id));
        const pool = GRAND_CURIOS.filter((c) => !owned.has(c.id));
        const prize = pool.length > 0
          ? pool[Math.floor(Math.random() * pool.length)]
          : GRAND_CURIOS[Math.floor(Math.random() * GRAND_CURIOS.length)];
        if (prize) {
          game.player.curios.push({ ...prize });
          game.run.hasGrandCurio = true;
          recordCurioUnlocked(prize.id);
          CB.player.spawnPopup(game.player.x, game.player.y - 68, `✦ 一杆完美清台 · 获传说大金 ${prize.icon}${prize.name}!`, '#c98212');
        }
      } else {
        CB.player.spawnPopup(game.player.x, game.player.y - 54, '🎯 试炼通关! +70💎', '#249472');
      }
      if (CB.audio && CB.audio.playTrialWin) CB.audio.playTrialWin();
      completeRun('extracted');
    }
  }

  // ==================== v9.5 浮空补给黑市经济引擎 ====================
  function getMarketOffers() {
    const owned = new Set(game.player.curios.map((c) => c.id));
    const pool = REGULAR_CURIOS.filter((c) => !owned.has(c.id)).sort(() => Math.random() - 0.5);
    const picks = (pool.length >= 3 ? pool : REGULAR_CURIOS.slice().sort(() => Math.random() - 0.5)).slice(0, 3);
    return picks.map((c) => ({
      curio: c,
      cost: c.rarity === 'epic' ? 75 : 55,
      bought: false,
    }));
  }

  function getMarketBudget() {
    const v = game.voyage || {};
    return Math.round((v.pendingHaul || 0) + (game.meta.bankValue || 0));
  }

  function spendMarketFunds(cost) {
    const v = game.voyage;
    const avail = getMarketBudget();
    if (avail < cost) return false;
    if ((v.pendingHaul || 0) >= cost) {
      v.pendingHaul = Math.round(v.pendingHaul - cost);
    } else {
      const rem = cost - (v.pendingHaul || 0);
      v.pendingHaul = 0;
      game.meta.bankValue = Math.max(0, Math.round((game.meta.bankValue || 0) - rem));
      saveMeta();
    }
    return true;
  }

  function buyMarketRest(cost = 35) {
    if (!spendMarketFunds(cost)) {
      if (CB.audio && CB.audio.playUiLocked) CB.audio.playUiLocked();
      return { ok: false, reason: 'funds' };
    }
    game.player.hp = game.player.maxHp;
    game.voyage.nextStartOverclock = true;
    if (CB.audio && CB.audio.playMarketBuy) CB.audio.playMarketBuy();
    return { ok: true };
  }

  function buyMarketCurio(curioId, cost = 60) {
    const def = REGULAR_CURIOS.find((c) => c.id === curioId);
    if (!def) return { ok: false, reason: 'invalid' };
    if (!spendMarketFunds(cost)) {
      if (CB.audio && CB.audio.playUiLocked) CB.audio.playUiLocked();
      return { ok: false, reason: 'funds' };
    }
    game.player.curios.push({ ...def });
    recordCurioUnlocked(def.id);
    const syn = checkAndAnnounceSynergy(def);
    if (!syn && CB.audio && CB.audio.playMarketBuy) CB.audio.playMarketBuy();
    return { ok: true, curio: def, activatedSynergy: syn };
  }

  function fuseMarketCurios(cost = 40) {
    const regulars = game.player.curios.filter((c) => c.rarity !== 'legendary');
    if (regulars.length < 2) {
      if (CB.audio && CB.audio.playUiLocked) CB.audio.playUiLocked();
      return { ok: false, reason: 'need_two' };
    }
    if (!spendMarketFunds(cost)) {
      if (CB.audio && CB.audio.playUiLocked) CB.audio.playUiLocked();
      return { ok: false, reason: 'funds' };
    }
    for (let k = 0; k < 2; k++) {
      for (let i = game.player.curios.length - 1; i >= 0; i--) {
        if (game.player.curios[i].rarity !== 'legendary') {
          game.player.curios.splice(i, 1);
          break;
        }
      }
    }
    const ownedIds = new Set(game.player.curios.map((c) => c.id));
    const grandPool = GRAND_CURIOS.filter((c) => !ownedIds.has(c.id));
    const forged = grandPool.length > 0
      ? grandPool[Math.floor(Math.random() * grandPool.length)]
      : GRAND_CURIOS[Math.floor(Math.random() * GRAND_CURIOS.length)];
    game.player.curios.push({ ...forged });
    recordCurioUnlocked(forged.id);
    const syn = checkAndAnnounceSynergy(forged);
    if (!syn && CB.audio && CB.audio.playTrialWin) CB.audio.playTrialWin();
    return { ok: true, forged, activatedSynergy: syn };
  }

  function updateExtractionLoop(dt) {
    if (game.run.phase !== 'playing') return;
    game.run.elapsed += dt;
    game.interactHint = null;

    if (game.run.nodeType === 'trial') {
      updateDeviceInteract();
      updateTrialVictory(dt);
      game.input.interactPressed = false;
      return;
    }

    updatePeriodicGust(dt);

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
    SYNERGY_DEFS,
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
    getSynergyCounts,
    getActiveSynergies,
    hasSynergy,
    getCurioHaulValue,
    getStuntBounty,
    addStuntBounty,
    getCurrentSectorSpec,
    getTotalHaulValue,
    startNewVoyage,
    advanceVoyageToNode,
    bankVoyageAndFinish,
    getMarketOffers,
    getMarketBudget,
    buyMarketRest,
    buyMarketCurio,
    fuseMarketCurios,
    getDailyChallengeSpec,
    recordDailyLabTrigger,
    getExtractCenter,
    getActiveGust,
    getVaultCenter,
    updateExtractionLoop,
    triggerFailure,
  };
})();
