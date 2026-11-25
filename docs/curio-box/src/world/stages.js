(() => {
  const CB = (window.CB = window.CB || {});

  const CLIMATES = {
    day_lotus: {
      id: 'day_lotus',
      audioStageId: 1,
      biome: 'lotus_pond',
      skyType: 'day_clouds',
      skyColors: ['#54b2e6', '#9fdcf7', '#eafbff'],
      palette: {
        ink: '#2d4b52',
        floorBase: '#efeadd',
        floorLine: 'rgba(116, 134, 118, 0.22)',
        floorWashA: 'rgba(162, 212, 178, 0.18)',
        floorWashB: 'rgba(235, 214, 174, 0.22)',
        floorRoughDot: 'rgba(112, 98, 76, 0.14)',
        wallSide: '#b8cbb8',
        wallTop: '#ecf3e6',
        wallTrim: 'rgba(130, 212, 234, 0.34)',
        postSide: '#9db5a5',
        postTop: '#e2ece0',
        lampColor: '#76d4eb',
        lampGlow: 'rgba(255, 232, 132, 0.65)',
        cliffMain: '#c8a684',
        cliffShade: 'rgba(78, 118, 128, 0.25)',
        fogTop: '#eef8fd',
        fogBottom: '#cbe8f7',
        fogCloud: 'rgba(255, 255, 255, 0.85)',
        fogGlyph: '☁',
        fogGlyphColor: 'rgba(72, 134, 168, 0.44)',
        miniBg: 'linear-gradient(180deg, #cbeafb, #e8f7fc)',
        bodyBg: '#8fd0f0',
        isDark: false,
      },
    },
    starry_night: {
      id: 'starry_night',
      audioStageId: 2,
      biome: 'sun_glasshouse',
      skyType: 'starry_night',
      skyColors: ['#0b1633', '#192b59', '#314478'],
      palette: {
        ink: '#182442',
        floorBase: '#263356',
        floorLine: 'rgba(232, 198, 114, 0.17)',
        floorWashA: 'rgba(92, 132, 214, 0.20)',
        floorWashB: 'rgba(138, 96, 194, 0.16)',
        floorRoughDot: 'rgba(255, 236, 168, 0.16)',
        wallSide: '#2c3d69',
        wallTop: '#465c91',
        wallTrim: 'rgba(244, 202, 98, 0.44)',
        postSide: '#223157',
        postTop: '#3e5285',
        lampColor: '#ffe073',
        lampGlow: 'rgba(255, 224, 115, 0.85)',
        cliffMain: '#2d3a5e',
        cliffShade: 'rgba(14, 20, 44, 0.48)',
        fogTop: '#16254a',
        fogBottom: '#263b6e',
        fogCloud: 'rgba(72, 102, 168, 0.55)',
        fogGlyph: '✦',
        fogGlyphColor: 'rgba(248, 216, 126, 0.55)',
        miniBg: 'linear-gradient(180deg, #162447, #273c6e)',
        bodyBg: '#122042',
        isDark: true,
      },
    },
    twilight_vine: {
      id: 'twilight_vine',
      audioStageId: 3,
      biome: 'ancient_vine',
      skyType: 'twilight_forest',
      skyColors: ['#1c3e45', '#326363', '#87b59e'],
      palette: {
        ink: '#1d3632',
        floorBase: '#d4e2d2',
        floorLine: 'rgba(54, 96, 78, 0.22)',
        floorWashA: 'rgba(84, 156, 114, 0.22)',
        floorWashB: 'rgba(232, 188, 108, 0.14)',
        floorRoughDot: 'rgba(48, 92, 68, 0.16)',
        wallSide: '#5b7d6f',
        wallTop: '#90b29e',
        wallTrim: 'rgba(242, 186, 98, 0.36)',
        postSide: '#466659',
        postTop: '#7a9e8b',
        lampColor: '#ffba5a',
        lampGlow: 'rgba(255, 194, 92, 0.78)',
        cliffMain: '#637a6d',
        cliffShade: 'rgba(26, 46, 42, 0.36)',
        fogTop: '#2e5756',
        fogBottom: '#4b7e76',
        fogCloud: 'rgba(136, 188, 170, 0.56)',
        fogGlyph: '🌿',
        fogGlyphColor: 'rgba(255, 226, 132, 0.55)',
        miniBg: 'linear-gradient(180deg, #355f5d, #6e9e8e)',
        bodyBg: '#274d50',
        isDark: false,
      },
    },
    sunset_dome: {
      id: 'sunset_dome',
      audioStageId: 4,
      biome: 'fusion',
      skyType: 'sunset_clouds',
      skyColors: ['#51629e', '#de8a82', '#ffe0a3'],
      palette: {
        ink: '#422d36',
        floorBase: '#f7ece0',
        floorLine: 'rgba(168, 114, 88, 0.2)',
        floorWashA: 'rgba(255, 198, 134, 0.2)',
        floorWashB: 'rgba(235, 152, 168, 0.16)',
        floorRoughDot: 'rgba(164, 112, 82, 0.12)',
        wallSide: '#c9998a',
        wallTop: '#faeee2',
        wallTrim: 'rgba(246, 196, 84, 0.5)',
        postSide: '#b07d72',
        postTop: '#f2dfd0',
        lampColor: '#ffcb66',
        lampGlow: 'rgba(255, 206, 98, 0.78)',
        cliffMain: '#b88276',
        cliffShade: 'rgba(84, 48, 62, 0.3)',
        fogTop: '#f5d4c4',
        fogBottom: '#e0a6a0',
        fogCloud: 'rgba(255, 240, 224, 0.82)',
        fogGlyph: '☀',
        fogGlyphColor: 'rgba(168, 86, 72, 0.45)',
        miniBg: 'linear-gradient(180deg, #8b7ba8, #f0b99e)',
        bodyBg: '#8c7296',
        isDark: false,
      },
    },
    thunder_violet: {
      id: 'thunder_violet',
      audioStageId: 5,
      biome: 'lotus_pond',
      skyType: 'thunder_violet',
      skyColors: ['#1c1833', '#362e5c', '#695b91'],
      palette: {
        ink: '#221b3b',
        floorBase: '#33304f',
        floorLine: 'rgba(132, 220, 255, 0.18)',
        floorWashA: 'rgba(128, 92, 224, 0.22)',
        floorWashB: 'rgba(70, 198, 240, 0.16)',
        floorRoughDot: 'rgba(196, 226, 255, 0.14)',
        wallSide: '#443c6b',
        wallTop: '#665b96',
        wallTrim: 'rgba(104, 228, 255, 0.46)',
        postSide: '#362f59',
        postTop: '#5c528a',
        lampColor: '#7ceeff',
        lampGlow: 'rgba(136, 232, 255, 0.88)',
        cliffMain: '#3e385c',
        cliffShade: 'rgba(18, 14, 36, 0.5)',
        fogTop: '#2a2448',
        fogBottom: '#463b73',
        fogCloud: 'rgba(128, 114, 186, 0.58)',
        fogGlyph: '⚡',
        fogGlyphColor: 'rgba(132, 234, 255, 0.62)',
        miniBg: 'linear-gradient(180deg, #272044, #4e427d)',
        bodyBg: '#231d3d',
        isDark: true,
      },
    },
    aurora_frost: {
      id: 'aurora_frost',
      audioStageId: 6,
      biome: 'lotus_pond',
      skyType: 'aurora_frost',
      skyColors: ['#0a2136', '#154a61', '#53a3a8'],
      palette: {
        ink: '#1d404d',
        floorBase: '#e1f1f7',
        floorLine: 'rgba(72, 148, 174, 0.24)',
        floorWashA: 'rgba(116, 232, 212, 0.22)',
        floorWashB: 'rgba(154, 210, 245, 0.24)',
        floorRoughDot: 'rgba(72, 138, 166, 0.13)',
        wallSide: '#8bb8c9',
        wallTop: '#e8f6fb',
        wallTrim: 'rgba(102, 238, 206, 0.42)',
        postSide: '#72a3b8',
        postTop: '#d7eef7',
        lampColor: '#78ffd6',
        lampGlow: 'rgba(120, 255, 214, 0.78)',
        cliffMain: '#6e94a8',
        cliffShade: 'rgba(24, 58, 78, 0.36)',
        fogTop: '#d4f3f7',
        fogBottom: '#9cd6e6',
        fogCloud: 'rgba(236, 252, 255, 0.86)',
        fogGlyph: '❄',
        fogGlyphColor: 'rgba(42, 140, 168, 0.52)',
        miniBg: 'linear-gradient(180deg, #1b4f66, #6ec4cc)',
        bodyBg: '#18475c',
        isDark: false,
      },
    },
    crystal_prism: {
      id: 'crystal_prism',
      audioStageId: 7,
      biome: 'sun_glasshouse',
      skyType: 'crystal_prism',
      skyColors: ['#70c5f5', '#cceeff', '#fffcf0'],
      palette: {
        ink: '#31505e',
        floorBase: '#f6f7fb',
        floorLine: 'rgba(116, 156, 186, 0.20)',
        floorWashA: 'rgba(255, 224, 148, 0.18)',
        floorWashB: 'rgba(168, 224, 255, 0.20)',
        floorRoughDot: 'rgba(122, 152, 182, 0.10)',
        wallSide: '#b8d0de',
        wallTop: '#fbfdff',
        wallTrim: 'rgba(255, 212, 108, 0.48)',
        postSide: '#9ebccf',
        postTop: '#eef6fa',
        lampColor: '#ffe46e',
        lampGlow: 'rgba(255, 238, 140, 0.82)',
        cliffMain: '#c2b0a2',
        cliffShade: 'rgba(84, 118, 138, 0.24)',
        fogTop: '#ffffff',
        fogBottom: '#d9f0fc',
        fogCloud: 'rgba(255, 254, 250, 0.90)',
        fogGlyph: '🔆',
        fogGlyphColor: 'rgba(218, 158, 36, 0.52)',
        miniBg: 'linear-gradient(180deg, #b5e4fc, #fff7e0)',
        bodyBg: '#a4dcf8',
        isDark: false,
      },
    },
    horizon_void: {
      id: 'horizon_void',
      audioStageId: 8,
      biome: 'sun_glasshouse',
      skyType: 'horizon_void',
      skyColors: ['#090a18', '#1a1736', '#402c57'],
      palette: {
        ink: '#1a162e',
        floorBase: '#201e36',
        floorLine: 'rgba(246, 200, 102, 0.18)',
        floorWashA: 'rgba(156, 98, 235, 0.20)',
        floorWashB: 'rgba(240, 174, 78, 0.14)',
        floorRoughDot: 'rgba(255, 224, 148, 0.15)',
        wallSide: '#322b52',
        wallTop: '#4e4478',
        wallTrim: 'rgba(255, 206, 94, 0.50)',
        postSide: '#272242',
        postTop: '#453c6b',
        lampColor: '#ffd464',
        lampGlow: 'rgba(255, 212, 100, 0.90)',
        cliffMain: '#2d2647',
        cliffShade: 'rgba(10, 8, 22, 0.58)',
        fogTop: '#16132b',
        fogBottom: '#2d224a',
        fogCloud: 'rgba(94, 72, 145, 0.56)',
        fogGlyph: '🕳',
        fogGlyphColor: 'rgba(255, 214, 108, 0.58)',
        miniBg: 'linear-gradient(180deg, #141229, #362752)',
        bodyBg: '#121024',
        isDark: true,
      },
    },
  };

  // v9.5b 深空环境变异词缀（改变全局物理手感与风险收益）
  const MUTATORS = {
    low_gravity: {
      id: 'low_gravity',
      icon: '🪶',
      name: '低重力空域',
      short: '🪶 低重力+35%击飞',
      desc: '全体击退、台球推箱与滑行初速 +35%，更易连撞与推崖',
      haulBonus: 0.15,
    },
    global_frost: {
      id: 'global_frost',
      icon: '❄️',
      name: '全岛覆霜',
      short: '❄️ 全岛半滑行',
      desc: '全图石砖摩擦大幅降低 60%，守卫与木箱随处可飙滑',
      haulBonus: 0.15,
    },
    periodic_gust: {
      id: 'periodic_gust',
      icon: '🌬️',
      name: '周期强乱流',
      short: '🌬️ 周期顺风+45%',
      desc: '每 12 秒吹起 4.5 秒高空顺风，顺风击退与推箱 +45%',
      haulBonus: 0.2,
    },
    double_vault: {
      id: 'double_vault',
      icon: '💎',
      name: '双倍秘宝 · 强敌',
      short: '💎 估值×1.4·双精英',
      desc: '本空域估值与赏金额外 ×1.40，但金库增派 1 名精英守卫',
      haulBonus: 0.3,
    },
    static_overcharge: {
      id: 'static_overcharge',
      icon: '⚡',
      name: '静电过载',
      short: '⚡ 蓄力+25%·怪速+15%',
      desc: '星露重弹蓄力提速 25% 且回珠更快，但守卫移速 +15%',
      haulBonus: 0.2,
    },
  };
  const MUTATOR_IDS = Object.keys(MUTATORS);

  const ANOMALIES = {
    friction: {
      id: 'friction',
      icon: '❄️',
      name: '晨露冰镜',
      omenTitle: '低温结霜征兆',
      omenCue: '冰镜滑道 · 台球木箱高速破盾',
      defaultClimate: 'day_lotus',
      biome: 'lotus_pond',
      starterCurioId: 'billiard_wax',
      curioPool: ['dew_skates', 'billiard_wax', 'gale_fan', 'chain_cue', 'cliff_chime', 'aero_feather', 'monocle'],
      grandCurioIds: ['pocket_core', 'scarab'],
      guardPool: ['shield_charger', 'dew_hopper'],
      vaultElite: 'lotus_warden',
      hint: '星露重弹仅 3 颗！推木箱上冰滑道砸盾、怪物连撞或击落云海立刻回弹珠',
    },
    gravity: {
      id: 'gravity',
      icon: '🪐',
      name: '星轨畸变',
      omenTitle: '强引力畸变征兆',
      omenCue: '浮空星轨 · 弯道弹弓与棱镜破膜',
      defaultClimate: 'starry_night',
      biome: 'sun_glasshouse',
      starterCurioId: 'vortex_core',
      curioPool: ['vortex_core', 'slingshot_lens', 'lorentz_prism', 'event_horizon', 'split_crystal', 'gale_fan', 'cliff_chime', 'monocle'],
      grandCurioIds: ['orrery', 'star_jar'],
      guardPool: ['astro_sentinel', 'comet_orbiter'],
      vaultElite: 'astro_archon',
      hint: '占星光膜抗直线弹！蓄力绕星轨打弯道或借棱镜分光破膜并瞬间返还星露珠',
    },
    stealth: {
      id: 'stealth',
      icon: '🌿',
      name: '暮雾古藤',
      omenTitle: '声波雾林征兆',
      omenCue: '花粉隐身 · 轻点星针敲风铃绝杀',
      defaultClimate: 'twilight_vine',
      biome: 'ancient_vine',
      starterCurioId: 'aero_feather',
      curioPool: ['aero_feather', 'gale_fan', 'chain_cue', 'monocle', 'split_crystal', 'vortex_core'],
      grandCurioIds: ['scarab', 'star_jar'],
      guardPool: ['vine_stalker', 'vine_magnet'],
      vaultElite: 'vine_elder',
      hint: '轻点无限星针敲风铃引开缩壳警哨，钻花粉雾绝杀或推落云海回充重弹！',
    },
    relativity: {
      id: 'relativity',
      icon: '🕳️',
      name: '时空畸变',
      omenTitle: '黑洞时空畸变征兆',
      omenCue: '深空视界时间膨胀 · 虫洞折跃与相对论质增',
      defaultClimate: 'horizon_void',
      biome: 'sun_glasshouse',
      starterCurioId: 'lorentz_prism',
      curioPool: ['event_horizon', 'lorentz_prism', 'vortex_core', 'slingshot_lens', 'gale_fan', 'chain_cue', 'monocle'],
      grandCurioIds: ['orrery', 'star_jar', 'pocket_core'],
      guardPool: ['astro_sentinel', 'comet_orbiter'],
      vaultElite: 'astro_archon',
      hint: '击活黑洞奇点冻结敌方时间蓄积动量，或将怪物撞入星轨公转加速/穿虫洞触发相对论质增破甲！',
    },
    thermal: {
      id: 'thermal',
      icon: '🔥',
      name: '极光热变',
      omenTitle: '极光冰火相变征兆',
      omenCue: '霜晶冰水汽三态相变 · 高压热膨胀爆破',
      defaultClimate: 'aurora_frost',
      biome: 'lotus_pond',
      starterCurioId: 'thermo_valve',
      curioPool: ['thermo_valve', 'billiard_wax', 'dew_skates', 'gale_fan', 'chain_cue', 'cliff_chime'],
      grandCurioIds: ['pocket_core', 'scarab'],
      guardPool: ['frost_snail', 'shield_charger'],
      vaultElite: 'lotus_warden',
      hint: '加热冰道融为导电积水或沸腾隐身蒸汽！连续加热高压罐使其膨胀红温后引爆掀翻整房',
    },
    optics: {
      id: 'optics',
      icon: '🔆',
      name: '琉璃光廊',
      omenTitle: '强光折射征兆',
      omenCue: '琉璃凸透镜聚光灼烧 · 镜面光网切割',
      defaultClimate: 'crystal_prism',
      biome: 'sun_glasshouse',
      starterCurioId: 'mirror_prism',
      curioPool: ['mirror_prism', 'thermo_valve', 'split_crystal', 'slingshot_lens', 'monocle', 'gale_fan'],
      grandCurioIds: ['orrery', 'star_jar'],
      guardPool: ['prism_weaver', 'astro_sentinel'],
      vaultElite: 'astro_archon',
      hint: '射穿凸透镜聚光灼烧（可融冰/引爆高压罐/烧穿护甲），点亮双镜面织成激光光网切割撞入守卫！',
    },
    electro: {
      id: 'electro',
      icon: '⚡',
      name: '雷云紫电',
      omenTitle: '雷云静电征兆',
      omenCue: '紫电水域导电链 · 正负电荷同极爆斥',
      defaultClimate: 'thunder_violet',
      biome: 'lotus_pond',
      starterCurioId: 'faraday_coil',
      curioPool: ['faraday_coil', 'billiard_wax', 'chain_cue', 'vortex_core', 'cliff_chime', 'gale_fan'],
      grandCurioIds: ['star_jar', 'scarab'],
      guardPool: ['volt_automaton', 'vine_magnet'],
      vaultElite: 'vine_elder',
      hint: '射击正/负电荷桩触发水域导电链并给守卫与木箱涂装电荷——同极靠近猛烈爆斥下崖，异极强吸对撞！',
    },
  };

  const BASIC_ANOMALY_IDS = ['friction', 'gravity', 'stealth', 'relativity', 'thermal', 'optics', 'electro'];

  const STAGES = [
    buildSectorSpec({ leg: 1, altitude: 1200, climateId: 'day_lotus', anomalies: ['friction'], haulMult: 1.0, dangerLabel: '轻风空域' }),
    buildSectorSpec({ leg: 2, altitude: 2300, climateId: 'starry_night', anomalies: ['gravity'], haulMult: 1.3, dangerLabel: '乱流空域' }),
    buildSectorSpec({ leg: 3, altitude: 3400, climateId: 'twilight_vine', anomalies: ['stealth'], haulMult: 1.6, dangerLabel: '强畸变区' }),
    buildSectorSpec({ leg: 4, altitude: 4600, climateId: 'sunset_dome', anomalies: ['friction', 'gravity', 'stealth'], haulMult: 2.0, dangerLabel: '深空秘境', wantAtrium: true }),
  ];

  function buildSectorSpec(node = {}) {
    const leg = Math.max(1, Number(node.leg) || 1);
    const nodeType = node.nodeType || 'standard';
    const altitude = Number(node.altitude) || (1200 + (leg - 1) * 1150);
    const anomalies = Array.isArray(node.anomalies) && node.anomalies.length > 0
      ? node.anomalies.slice()
      : ['friction'];
    const isMulti = anomalies.length >= 2;
    const isFullFusion = anomalies.length >= 3;
    const primaryId = anomalies[0];
    const primary = ANOMALIES[primaryId] || ANOMALIES.friction;
    const climate = CLIMATES[node.climateId] || CLIMATES[isFullFusion ? 'sunset_dome' : primary.defaultClimate] || CLIMATES.day_lotus;
    const mutators = Array.isArray(node.mutators) ? node.mutators.filter((id) => !!MUTATORS[id]) : [];
    const mutatorObjs = mutators.map((id) => MUTATORS[id]);

    const mergedCurios = new Set();
    const mergedGrands = new Set();
    const mergedGuards = new Set();
    for (const aid of anomalies) {
      const a = ANOMALIES[aid];
      if (!a) continue;
      a.curioPool.forEach((c) => mergedCurios.add(c));
      a.grandCurioIds.forEach((c) => mergedGrands.add(c));
      a.guardPool.forEach((g) => mergedGuards.add(g));
    }

    const omenIcons = nodeType === 'trial'
      ? '🎯'
      : nodeType === 'boss'
      ? `👑 ${anomalies.map((aid) => (ANOMALIES[aid] ? ANOMALIES[aid].icon : '☁')).join(' ')}`
      : anomalies.map((aid) => (ANOMALIES[aid] ? ANOMALIES[aid].icon : '☁')).join(' ');
    const anomalyNames = anomalies.map((aid) => (ANOMALIES[aid] ? ANOMALIES[aid].name : '')).filter(Boolean);

    const trialVariant = node.trialVariant !== undefined ? node.trialVariant : (leg % 3);
    const trialTitles = ['冰镜台球靶场', '光热电连锁靶场', '星轨虫洞靶场'];
    const sectorName = nodeType === 'trial'
      ? (trialTitles[trialVariant % 3] || '物理试炼靶场')
      : nodeType === 'boss'
      ? `霸主空域 · ${isMulti ? anomalyNames[0] + '×' + anomalyNames[1] : primary.name}`
      : isFullFusion
      ? '穹顶交汇空域'
      : isMulti
      ? `${anomalyNames[0]} × ${anomalyNames[1]}`
      : primary.name;

    const tagline = nodeType === 'trial'
      ? '单房物理谜题 · 2 发重弹内全清即赠传说大金！'
      : nodeType === 'boss'
      ? '阶段霸主镇守 · 丰厚秘宝与连航荣耀里程碑'
      : isFullFusion
      ? '多重物理法则交织 · 精英巨像镇守'
      : isMulti
      ? `双异常叠合 · ${anomalies.map((aid) => ANOMALIES[aid].icon + ANOMALIES[aid].name).join(' + ')}`
      : primary.omenCue;

    const introHint = nodeType === 'trial'
      ? '🎯 物理试炼：用机关连锁清光全部 3 名靶场守卫自动凯旋！2 发重弹内清台直接掉落传说大金！'
      : nodeType === 'boss'
      ? '👑 阶段霸主空域！打破霸主护甲或借云海崖口/相对论质增击败巨像，夺取丰厚秘宝！'
      : isFullFusion
      ? '多重物理异常交汇！善用仅有的 3 颗星露弹珠打出连撞/崖杀/破防循环回珠'
      : isMulti
      ? `侦测到 ${anomalyNames.join(' + ')} 双法则叠合！用物理连锁瞬间返还星露弹珠`
      : primary.hint;

    const minCells = nodeType === 'boss' ? 9 : Math.min(15, 9 + Math.floor((leg - 1) * 1.0));
    const maxCells = nodeType === 'boss' ? 11 : Math.min(16, minCells + 2);
    const minRooms = nodeType === 'boss' ? 5 : Math.min(7, 5 + Math.floor(leg / 2));
    const wantAtrium = !!(node.wantAtrium || nodeType === 'boss' || isFullFusion || (leg >= 4 && isMulti));
    const hasStealth = anomalies.includes('stealth');
    const mutBonus = mutatorObjs.reduce((acc, m) => acc + (m.haulBonus || 0), 0);
    const haulMult = Number(node.haulMult) || Number((1.0 + (leg - 1) * 0.35 + (isMulti ? 0.2 : 0) + (nodeType === 'boss' ? 0.55 : 0) + mutBonus).toFixed(2));
    const vaultElite = nodeType === 'boss' || isFullFusion || leg >= 4 ? 'colossus' : primary.vaultElite;

    return {
      id: climate.audioStageId,
      leg,
      nodeType,
      trialVariant,
      altitude,
      code: `LEG ${leg}`,
      name: sectorName,
      shortName: `${omenIcons} ${sectorName}`,
      theme: isMulti ? 'fusion' : primaryId,
      primaryAnomaly: primaryId,
      anomalies,
      mutators,
      mutatorObjs,
      climateId: climate.id,
      biome: isMulti ? 'fusion' : primary.biome,
      omenIcons,
      dangerLabel: node.dangerLabel || (nodeType === 'boss' ? '👑 阶段霸主' : nodeType === 'trial' ? '🎯 试炼靶场' : isFullFusion ? '深空秘境' : isMulti ? '双法则乱流' : leg === 1 ? '轻风空域' : '未知空域'),
      tagline,
      introHint,
      starterCurioId: isFullFusion ? 'split_crystal' : primary.starterCurioId,
      curioPool: Array.from(mergedCurios),
      grandCurioIds: Array.from(mergedGrands),
      guardPool: Array.from(mergedGuards),
      vaultElite,
      haulMult,
      mapSpec: {
        minCells,
        maxCells,
        minRooms,
        wantAtrium,
        maxLShapes: nodeType === 'boss' ? 0 : 1,
        maxCorridors: 1,
        desiredCycles: leg >= 3 || isMulti ? 3 : 2,
        maxVineGates: hasStealth && nodeType !== 'trial' ? 2 : 0,
        minVaultDist: nodeType === 'boss' ? 2 : (leg >= 2 ? 3 : 2),
        minExtractDist: nodeType === 'boss' ? 2 : (leg >= 3 ? 3 : 2),
        minVaultExtract: 2,
      },
      skyType: climate.skyType,
      skyColors: climate.skyColors,
      palette: climate.palette,
    };
  }

  function createInitialVoyageNode(isFirstRun = true) {
    if (isFirstRun) {
      return {
        id: 'leg1_lotus',
        leg: 1,
        nodeType: 'standard',
        altitude: 1200,
        climateId: 'day_lotus',
        anomalies: ['friction'],
        mutators: [],
        omenIcons: '❄️',
        omenTitle: '晨露结霜征兆',
        omenCue: '高摩擦苔石与冰镜滑道 · 适合台球做局',
        dangerLabel: '轻风空域',
        haulMult: 1.0,
        wantAtrium: false,
      };
    }
    const starters = ['friction', 'optics', 'thermal', 'electro', 'gravity'];
    const pickId = starters[Math.floor(Math.random() * starters.length)];
    const a = ANOMALIES[pickId];
    return {
      id: `leg1_${pickId}_${Date.now().toString(36).slice(-3)}`,
      leg: 1,
      nodeType: 'standard',
      altitude: 1200,
      climateId: a.defaultClimate,
      anomalies: [pickId],
      mutators: [],
      omenIcons: a.icon,
      omenTitle: a.omenTitle,
      omenCue: a.omenCue,
      dangerLabel: '轻风空域',
      haulMult: 1.0,
      wantAtrium: false,
    };
  }

  function pickMutatorsForNode(nextLeg, count = 1) {
    if (nextLeg < 2 || count <= 0) return [];
    const pool = MUTATOR_IDS.slice().sort(() => Math.random() - 0.5);
    return pool.slice(0, Math.min(count, pool.length));
  }

  function generateNextChoices(nextLeg, prevNode = null) {
    const pickFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const altBase = 1200 + (nextLeg - 1) * 1150;
    const altJitter = (idx) => altBase + idx * 140 + Math.floor(Math.random() * 90);

    const makeSingleNode = (aid, idx, mult, dangerLabel, mutCount = 0) => {
      const a = ANOMALIES[aid];
      return {
        id: `n_${nextLeg}_${aid}_${idx}`,
        leg: nextLeg,
        nodeType: 'standard',
        altitude: altJitter(idx),
        climateId: a.defaultClimate,
        anomalies: [aid],
        mutators: pickMutatorsForNode(nextLeg, mutCount),
        omenIcons: a.icon,
        omenTitle: a.omenTitle,
        omenCue: a.omenCue,
        dangerLabel,
        haulMult: Number(mult.toFixed(2)),
        wantAtrium: false,
      };
    };

    const makeDualNode = (a1, a2, idx, climateId, mult, dangerLabel, wantAtrium = false, mutCount = 1) => {
      const d1 = ANOMALIES[a1];
      const d2 = ANOMALIES[a2];
      return {
        id: `n_${nextLeg}_${a1}_${a2}_${idx}`,
        leg: nextLeg,
        nodeType: 'standard',
        altitude: altJitter(idx),
        climateId,
        anomalies: [a1, a2],
        mutators: pickMutatorsForNode(nextLeg, mutCount),
        omenIcons: `${d1.icon} ${d2.icon}`,
        omenTitle: '双异常叠合征兆',
        omenCue: `${d1.name} × ${d2.name} · 交叉物理连锁`,
        dangerLabel,
        haulMult: Number(mult.toFixed(2)),
        wantAtrium,
      };
    };

    const makeTrialNode = (idx) => {
      const variant = (nextLeg + idx + Math.floor(Math.random() * 3)) % 3;
      const cfg = [
        { climate: 'aurora_frost', anom: ['friction'], title: '冰镜保龄球试炼', cue: '单房一杆清台 · 2 发重弹内全清必得传说大金！' },
        { climate: 'thunder_violet', anom: ['thermal', 'optics', 'electro'], title: '光热电连锁试炼', cue: '聚光融冰→导电链全清 · 2 发内全清必得传说大金！' },
        { climate: 'horizon_void', anom: ['gravity', 'relativity'], title: '星轨虫洞试炼', cue: '轨道捕获/虫洞推崖 · 2 发重弹内全清必得传说大金！' },
      ][variant];
      return {
        id: `n_${nextLeg}_trial_${variant}_${idx}`,
        leg: nextLeg,
        nodeType: 'trial',
        trialVariant: variant,
        altitude: altJitter(idx),
        climateId: cfg.climate,
        anomalies: cfg.anom,
        mutators: [],
        omenIcons: '🎯',
        omenTitle: cfg.title,
        omenCue: cfg.cue,
        dangerLabel: '物理谜题岛',
        haulMult: Number((1.35 + (nextLeg - 1) * 0.25).toFixed(2)),
        wantAtrium: false,
      };
    };

    const makeBossNode = (a1, a2, climateId, idx, mult) => {
      const d1 = ANOMALIES[a1];
      const d2 = ANOMALIES[a2];
      return {
        id: `n_${nextLeg}_boss_${a1}_${a2}_${idx}`,
        leg: nextLeg,
        nodeType: 'boss',
        altitude: altJitter(idx) + 220,
        climateId,
        anomalies: [a1, a2],
        mutators: pickMutatorsForNode(nextLeg, nextLeg >= 6 ? 2 : 1),
        omenIcons: `👑 ${d1.icon}${d2.icon}`,
        omenTitle: `阶段霸主 · ${d1.name}×${d2.name}`,
        omenCue: '高能花穹霸主镇守 · 击败即获海量资产与连航荣耀',
        dangerLabel: '👑 阶段终战',
        haulMult: Number(mult.toFixed(2)),
        wantAtrium: true,
      };
    };

    // 每逢第 3、6、9... 航段：阶段霸主终战里程碑！
    if (nextLeg % 3 === 0) {
      const bossMult = 1.9 + (nextLeg / 3 - 1) * 0.65;
      return [
        makeBossNode('thermal', 'electro', 'thunder_violet', 0, bossMult),
        makeBossNode('optics', 'relativity', 'horizon_void', 1, bossMult + 0.15),
        makeBossNode('friction', 'gravity', 'sunset_dome', 2, bossMult + 0.1),
      ];
    }

    const makeMarketNode = (idx) => ({
      id: `n_${nextLeg}_market_${idx}`,
      leg: nextLeg,
      nodeType: 'market',
      altitude: altJitter(idx),
      climateId: 'crystal_prism',
      anomalies: ['optics'],
      mutators: [],
      omenIcons: '⚖️',
      omenTitle: '浮空补给黑市',
      omenCue: '零战斗整备 · 购买奇物、满血超频休整或两件熔铸传说大金',
      dangerLabel: '安全休整点',
      haulMult: 1.0,
      wantAtrium: false,
    });

    // 第 2 航段：新气候异象 + 单房一杆清台试炼靶场 + 浮空补给黑市（四大节点一次体验！）
    if (nextLeg === 2) {
      const freshAnom = pickFrom(['electro', 'thermal', 'optics', 'relativity']);
      return [
        makeSingleNode(freshAnom, 0, 1.38, '新空域异象', 1),
        makeTrialNode(1),
        makeMarketNode(2),
      ];
    }

    // 其余非霸主航段（4、5、7、8...）：跨学科双法则 + 试炼靶场 + 浮空黑市 / 高危深空变异空域！
    const crossPairs = [
      ['optics', 'thermal', 'aurora_frost'],
      ['thermal', 'electro', 'thunder_violet'],
      ['optics', 'electro', 'crystal_prism'],
      ['relativity', 'electro', 'horizon_void'],
      ['relativity', 'thermal', 'horizon_void'],
      ['gravity', 'optics', 'crystal_prism'],
      ['friction', 'relativity', 'aurora_frost'],
    ];
    const pA = pickFrom(crossPairs);
    const pB = pickFrom(crossPairs.filter((p) => p !== pA));
    const baseM = 1.65 + (nextLeg - 2) * 0.3;
    const prevWasMarket = !!(prevNode && prevNode.nodeType === 'market');
    const showMarket = !prevWasMarket && (nextLeg % 3 === 2 || Math.random() < 0.55);
    return [
      makeDualNode(pA[0], pA[1], 0, pA[2], baseM, '跨学科空域', false, nextLeg >= 5 ? 2 : 1),
      makeTrialNode(1),
      showMarket
        ? makeMarketNode(2)
        : makeDualNode(pB[0], pB[1], 2, pB[2], baseM + 0.25, '高危深空域', nextLeg >= 5, 2),
    ];
  }

  function hasMutator(mutId) {
    const st = CB.game && CB.game.map && CB.game.map.stage;
    return !!(st && Array.isArray(st.mutators) && st.mutators.includes(mutId));
  }

  function getStage(stageOrSpec) {
    if (stageOrSpec && typeof stageOrSpec === 'object' && stageOrSpec.palette) {
      return stageOrSpec;
    }
    return STAGES.find((s) => s.id === stageOrSpec) || STAGES[0];
  }

  function getNextStage(stageId) {
    return STAGES.find((s) => s.id === stageId + 1) || null;
  }

  CB.stages = {
    CLIMATES,
    MUTATORS,
    ANOMALIES,
    STAGES,
    buildSectorSpec,
    createInitialVoyageNode,
    generateNextChoices,
    hasMutator,
    getStage,
    getNextStage,
  };
})();
