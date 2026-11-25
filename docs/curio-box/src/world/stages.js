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
  };

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
      omenCue: '引力时间膨胀 · 虫洞折跃与相对论质增',
      defaultClimate: 'starry_night',
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
      name: '热学相变',
      omenTitle: '热流相变征兆',
      omenCue: '冰水汽三态相变 · 高压热膨胀爆破',
      defaultClimate: 'sunset_dome',
      biome: 'lotus_pond',
      starterCurioId: 'thermo_valve',
      curioPool: ['thermo_valve', 'billiard_wax', 'dew_skates', 'gale_fan', 'chain_cue', 'cliff_chime'],
      grandCurioIds: ['pocket_core', 'scarab'],
      guardPool: ['shield_charger', 'dew_hopper'],
      vaultElite: 'lotus_warden',
      hint: '加热冰道融为导电积水或沸腾隐身蒸汽！连续加热高压罐使其膨胀红温后引爆掀翻整房',
    },
    optics: {
      id: 'optics',
      icon: '🔆',
      name: '光学聚焦',
      omenTitle: '强光折射征兆',
      omenCue: '凸透镜聚光灼烧 · 镜面光网切割',
      defaultClimate: 'day_lotus',
      biome: 'sun_glasshouse',
      starterCurioId: 'mirror_prism',
      curioPool: ['mirror_prism', 'thermo_valve', 'split_crystal', 'slingshot_lens', 'monocle', 'gale_fan'],
      grandCurioIds: ['orrery', 'star_jar'],
      guardPool: ['astro_sentinel', 'shield_charger'],
      vaultElite: 'astro_archon',
      hint: '射穿凸透镜聚光灼烧（可融冰/引爆高压罐/烧穿护甲），点亮双镜面织成激光光网切割撞入守卫！',
    },
    electro: {
      id: 'electro',
      icon: '⚡',
      name: '雷电电荷',
      omenTitle: '雷云静电征兆',
      omenCue: '水域导电链 · 正负电荷同极爆斥',
      defaultClimate: 'twilight_vine',
      biome: 'lotus_pond',
      starterCurioId: 'faraday_coil',
      curioPool: ['faraday_coil', 'billiard_wax', 'chain_cue', 'vortex_core', 'cliff_chime', 'gale_fan'],
      grandCurioIds: ['star_jar', 'scarab'],
      guardPool: ['vine_magnet', 'shield_charger'],
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
    const altitude = Number(node.altitude) || (1200 + (leg - 1) * 1150);
    const anomalies = Array.isArray(node.anomalies) && node.anomalies.length > 0
      ? node.anomalies.slice()
      : ['friction'];
    const isMulti = anomalies.length >= 2;
    const isFullFusion = anomalies.length >= 3;
    const primaryId = anomalies[0];
    const primary = ANOMALIES[primaryId] || ANOMALIES.friction;
    const climate = CLIMATES[node.climateId] || CLIMATES[isFullFusion ? 'sunset_dome' : primary.defaultClimate] || CLIMATES.day_lotus;

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

    const omenIcons = anomalies.map((aid) => (ANOMALIES[aid] ? ANOMALIES[aid].icon : '☁')).join(' ');
    const anomalyNames = anomalies.map((aid) => (ANOMALIES[aid] ? ANOMALIES[aid].name : '')).filter(Boolean);
    const sectorName = isFullFusion
      ? '穹顶交汇空域'
      : isMulti
      ? `${anomalyNames[0]} × ${anomalyNames[1]}`
      : primary.name;

    const tagline = isFullFusion
      ? '多重物理法则交织 · 精英巨像镇守'
      : isMulti
      ? `双异常叠合 · ${anomalies.map((aid) => ANOMALIES[aid].icon + ANOMALIES[aid].name).join(' + ')}`
      : primary.omenCue;

    const introHint = isFullFusion
      ? '多重物理异常交汇！善用仅有的 3 颗星露弹珠打出连撞/崖杀/破防循环回珠'
      : isMulti
      ? `侦测到 ${anomalyNames.join(' + ')} 双法则叠合！用物理连锁瞬间返还星露弹珠`
      : primary.hint;

    const minCells = Math.min(15, 9 + Math.floor((leg - 1) * 1.1));
    const maxCells = Math.min(16, minCells + 2);
    const minRooms = Math.min(7, 5 + Math.floor(leg / 2));
    const wantAtrium = !!(node.wantAtrium || isFullFusion || (leg >= 4 && isMulti));
    const hasStealth = anomalies.includes('stealth');
    const haulMult = Number(node.haulMult) || Number((1.0 + (leg - 1) * 0.35 + (isMulti ? 0.2 : 0)).toFixed(2));
    const vaultElite = isFullFusion || leg >= 4 ? 'colossus' : primary.vaultElite;

    return {
      id: climate.audioStageId,
      leg,
      altitude,
      code: `LEG ${leg}`,
      name: sectorName,
      shortName: `${omenIcons} ${sectorName}`,
      theme: isMulti ? 'fusion' : primaryId,
      primaryAnomaly: primaryId,
      anomalies,
      climateId: climate.id,
      biome: isMulti ? 'fusion' : primary.biome,
      omenIcons,
      dangerLabel: node.dangerLabel || (isFullFusion ? '深空秘境' : isMulti ? '双法则乱流' : leg === 1 ? '轻风空域' : '未知空域'),
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
        maxLShapes: 1,
        maxCorridors: 1,
        desiredCycles: leg >= 3 || isMulti ? 3 : 2,
        maxVineGates: hasStealth ? 2 : 0,
        minVaultDist: leg >= 2 ? 3 : 2,
        minExtractDist: leg >= 3 ? 3 : 2,
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
        altitude: 1200,
        climateId: 'day_lotus',
        anomalies: ['friction'],
        omenIcons: '❄️',
        omenTitle: '晨露结霜征兆',
        omenCue: '高摩擦苔石与冰镜滑道 · 适合台球做局',
        dangerLabel: '轻风空域',
        haulMult: 1.0,
        wantAtrium: false,
      };
    }
    const pickId = BASIC_ANOMALY_IDS[Math.floor(Math.random() * BASIC_ANOMALY_IDS.length)];
    const a = ANOMALIES[pickId];
    return {
      id: `leg1_${pickId}_${Date.now().toString(36).slice(-3)}`,
      leg: 1,
      altitude: 1200,
      climateId: a.defaultClimate,
      anomalies: [pickId],
      omenIcons: a.icon,
      omenTitle: a.omenTitle,
      omenCue: a.omenCue,
      dangerLabel: '轻风空域',
      haulMult: 1.0,
      wantAtrium: false,
    };
  }

  function generateNextChoices(nextLeg, prevNode = null) {
    const prevPrimary = prevNode && prevNode.anomalies ? prevNode.anomalies[0] : 'friction';
    const altBase = 1200 + (nextLeg - 1) * 1150;
    const altJitter = (idx) => altBase + idx * 140 + Math.floor(Math.random() * 90);
    const others = BASIC_ANOMALY_IDS.filter((id) => id !== prevPrimary);
    const randOther = others[Math.floor(Math.random() * others.length)] || 'gravity';
    const secondOther = others.find((id) => id !== randOther) || 'stealth';

    const makeSingleNode = (aid, idx, mult, dangerLabel) => {
      const a = ANOMALIES[aid];
      return {
        id: `n_${nextLeg}_${aid}_${idx}`,
        leg: nextLeg,
        altitude: altJitter(idx),
        climateId: a.defaultClimate,
        anomalies: [aid],
        omenIcons: a.icon,
        omenTitle: a.omenTitle,
        omenCue: a.omenCue,
        dangerLabel,
        haulMult: Number(mult.toFixed(2)),
        wantAtrium: false,
      };
    };

    const makeDualNode = (a1, a2, idx, climateId, mult, dangerLabel, wantAtrium = false) => {
      const d1 = ANOMALIES[a1];
      const d2 = ANOMALIES[a2];
      return {
        id: `n_${nextLeg}_${a1}_${a2}_${idx}`,
        leg: nextLeg,
        altitude: altJitter(idx),
        climateId,
        anomalies: [a1, a2],
        omenIcons: `${d1.icon} ${d2.icon}`,
        omenTitle: '双异常叠合征兆',
        omenCue: `${d1.name} × ${d2.name} · 交叉物理连锁`,
        dangerLabel,
        haulMult: Number(mult.toFixed(2)),
        wantAtrium,
      };
    };

    const makeApexNode = (idx, mult) => ({
      id: `n_${nextLeg}_apex_${idx}`,
      leg: nextLeg,
      altitude: altJitter(idx) + 180,
      climateId: 'sunset_dome',
      anomalies: ['thermal', 'optics', 'electro', 'relativity'],
      omenIcons: '🔥 🔆 ⚡ 🕳️',
      omenTitle: '强穹顶交汇征兆',
      omenCue: '三重异常法则交织 · 巨像守卫与丰厚秘宝',
      dangerLabel: '深空秘境',
      haulMult: Number(mult.toFixed(2)),
      wantAtrium: true,
    });

    const pickFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    if (nextLeg === 2) {
      const sciPick = pickFrom(['optics', 'thermal', 'electro']);
      const pairPick = sciPick === 'optics' ? ['optics', 'thermal'] : sciPick === 'thermal' ? ['thermal', 'electro'] : ['optics', 'electro'];
      return [
        makeSingleNode(sciPick, 0, 1.35, '异象空域'),
        makeSingleNode('relativity', 1, 1.4, '时空奇点区'),
        makeDualNode(pairPick[0], pairPick[1], 2, ANOMALIES[pairPick[0]].defaultClimate, 1.65, '跨学科连锁'),
      ];
    }

    if (nextLeg === 3) {
      const dualA = pickFrom([['optics', 'thermal'], ['thermal', 'electro'], ['optics', 'electro']]);
      return [
        makeSingleNode(pickFrom(['electro', 'optics', 'stealth']), 0, 1.6, '迷雾空域'),
        makeDualNode(dualA[0], dualA[1], 1, ANOMALIES[dualA[1]].defaultClimate, 1.9, '跨学科乱流'),
        makeDualNode('relativity', 'electro', 2, 'starry_night', 2.0, '时空雷暴带'),
      ];
    }

    if (nextLeg === 4) {
      return [
        makeDualNode('optics', 'thermal', 0, 'sunset_dome', 2.1, '光热熔融域', false),
        makeApexNode(1, 2.4),
        makeDualNode('thermal', 'electro', 2, 'twilight_vine', 2.15, '水电雷鸣域', false),
      ];
    }

    const climateKeys = Object.keys(CLIMATES);
    const pickClimate = (i) => climateKeys[(nextLeg + i + Math.floor(Math.random() * 2)) % climateKeys.length];
    const baseM = 2.1 + (nextLeg - 3) * 0.35;
    const crossPairs = [
      ['optics', 'thermal'],
      ['thermal', 'electro'],
      ['optics', 'electro'],
      ['relativity', 'electro'],
      ['relativity', 'thermal'],
      ['gravity', 'optics'],
    ];
    const pA = pickFrom(crossPairs);
    const pB = pickFrom(crossPairs.filter((p) => p !== pA));
    return [
      makeDualNode(pA[0], pA[1], 0, pickClimate(0), baseM, '深空连锁', false),
      makeDualNode(pB[0], pB[1], 1, pickClimate(1), baseM + 0.2, '强异常叠合', nextLeg % 2 === 1),
      makeApexNode(2, baseM + 0.5),
    ];
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
    ANOMALIES,
    STAGES,
    buildSectorSpec,
    createInitialVoyageNode,
    generateNextChoices,
    getStage,
    getNextStage,
  };
})();
