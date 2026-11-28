window.MT = window.MT || {};

window.MT.Config = (function () {
  var SURF = {
    GRAVITY: 540,
    WATER_BUOYANCY: 34,
    WATER_DAMPING: 5.4,
    MIN_CRUISE_SPEED: 155,
    MAX_SPEED: 600,
    CARVE_DOWN_ACCEL: 285,
    SLOPE_GRAVITY_FLOW: 275,
    LAUNCH_CREST_BOOST: 155,
    AIR_PITCH_SPEED: 5.60,
    FLIP_THRESHOLD: 4.98,
    PERFECT_LAND_ANGLE: 0.50,
    CRASH_ANGLE: 1.15,
    MAX_FUEL: 1.0,
    BOOST_THRUST_X: 350,
    BOOST_LIFT_Y: 300,
    FUEL_BURN_RATE: 0.54,
    WATER_PASSIVE_REFILL: 0.25,
    FLIP_FUEL_REWARD: 0.52,
    SMOOTH_LAND_FUEL: 0.28,
    BUOY_FUEL_REWARD: 0.45,
    TRICK_SPEED_SURGE: 125,
    MAX_HULL: 100,
    CRASH_DAMAGE: 22,
    SOFT_CEILING: -435,
    HARD_CEILING: -525,
    MAGNET_RADIUS: 82
  };

  // 拉长单纪元体量（约 2 倍）+ 1500px 超宽自然演进过渡带，彻底告别“幻灯片式切场景”
  // v11 开放海域自由探索模式：取消跑酷强制右移与分幕字幕，由缓慢流动的实时世界时钟驱动同一片海域的沧海桑田
  var SINGLE_SCENE_MODE = 'moon_sea';
  var EXPLORE_MODE = true;

  // v13 Step 2：第 2 海域《霜穹冰海》三段极地天象色板（极昼冰雾 -> 翡翠粉紫极光 -> 冰潮碎裂）
  var FROST_VOYAGE = {
    DURATION: 450,
    T_AURORA: 150,
    T_THAW: 320,
    ACTS: [
      {
        id: 'polar_mist',
        name: '极昼冰雾',
        palette: {
          skyTop: [72, 108, 142],
          skyMid: [122, 162, 190],
          skyHorizon: [212, 228, 236],
          farSea: [82, 118, 148],
          midSeaTop: [54, 118, 148],
          midSeaMid: [26, 72, 106],
          midSeaDeep: [12, 34, 58],
          frontSea: [24, 58, 86],
          foam: [236, 250, 255],
          haze: [216, 238, 246]
        }
      },
      {
        id: 'aurora_night',
        name: '翡翠粉紫极光',
        palette: {
          skyTop: [14, 24, 52],
          skyMid: [24, 52, 86],
          skyHorizon: [62, 116, 138],
          farSea: [24, 48, 76],
          midSeaTop: [34, 98, 128],
          midSeaMid: [16, 52, 84],
          midSeaDeep: [8, 22, 44],
          frontSea: [16, 44, 70],
          foam: [188, 252, 244],
          haze: [116, 214, 206]
        }
      },
      {
        id: 'ice_thaw',
        name: '冰潮碎裂',
        palette: {
          skyTop: [64, 96, 138],
          skyMid: [134, 154, 186],
          skyHorizon: [244, 212, 194],
          farSea: [74, 108, 140],
          midSeaTop: [46, 122, 148],
          midSeaMid: [22, 68, 98],
          midSeaDeep: [10, 32, 54],
          frontSea: [22, 56, 82],
          foam: [255, 244, 232],
          haze: [242, 214, 198]
        }
      }
    ]
  };

  var WORLD_CYCLE = {
    DURATION: 450,       // 完整一轮天象演进约 7.5 分钟（缓慢舒展，让玩家沉浸体会环境变迁）
    MIN_X: 160,          // 西端海角边界
    MAX_X: 9840,         // 东端海角边界
    HOME_X: 520,         // 西端「暮光灯塔港」启航锚点
    T_BIOLUM: 75,        // 0..75s 暮光浅海 -> 75..150s 蓝眼泪深潮
    T_OMEN: 150,         // 150..210s 血月低垂前兆
    T_IMPACT: 210,       // 210s 落月撞击 -> 210..275s 撞击沸海
    T_ASH: 275,          // 275..355s 尘幕灰海（浮尘遮日浑浊水域）
    T_KELP: 355,         // 355..405s 沉降新生（海水回清、荧光繁盛）
    T_DAWN: 405          // 405..450s 破晓晨海（玫瑰金朝阳与平静镜海，无缝进入下一轮）
  };

  var SEA_VOYAGE = {
    TOTAL_X: 26400,
    ACT2_X: 4200,        // 蓝眼泪荧光深潮
    ACT3_X: 9200,        // 落月血潮风暴
    IMPACT_X: 14800,     // 落月撞击点 · 紧急深潜避难
    ASH_START_X: 18000,  // 尘幕灰海（浮尘遮日浑浊求生）
    KELP_START_X: 20800, // 月核热泉与巨型发光海藻峡谷
    ASCENT_X: 23600,     // 浮尘渐散 · 破晓重返海面
    ACT4_X: 14800,       // 兼容第三幕风暴终点
    DAWN_BEACON_X: 26100,
    ENDLESS_CYCLE_X: 24000,
    ACTS: [
      {
        id: 'twilight',
        actNum: 1,
        name: '暮光浅海',
        kicker: '第一幕 · 暮光启航',
        subtitle: '满月悬于晚霞天际，长按 D 潜海蓄浮力，松开破水冲天',
        palette: {
          skyTop: [25, 31, 68],
          skyMid: [76, 62, 102],
          skyHorizon: [232, 162, 134],
          farSea: [50, 58, 94],
          midSeaTop: [42, 76, 114],
          midSeaMid: [22, 48, 84],
          midSeaDeep: [10, 22, 46],
          frontSea: [18, 34, 62],
          haze: [228, 178, 158]
        }
      },
      {
        id: 'biolum',
        actNum: 2,
        name: '蓝眼泪深潮',
        kicker: '第二幕 · 幽蓝夜海',
        subtitle: '潮水泛起星海磷光，穿越半沉旧镇与荧光水母深沟',
        palette: {
          skyTop: [10, 17, 46],
          skyMid: [22, 42, 86],
          skyHorizon: [68, 134, 162],
          farSea: [22, 52, 84],
          midSeaTop: [34, 122, 152],
          midSeaMid: [13, 52, 90],
          midSeaDeep: [5, 18, 40],
          frontSea: [12, 48, 78],
          haze: [118, 212, 228]
        }
      },
      {
        id: 'storm',
        actNum: 3,
        name: '落月血潮风暴',
        kicker: '第三幕 · 落月巨潮',
        subtitle: '巨月低垂掀起真实百米巨浪、天降陨星——乘浪冲顶或潜穿浪腹漩涡！',
        palette: {
          skyTop: [26, 16, 46],
          skyMid: [92, 36, 64],
          skyHorizon: [234, 118, 88],
          farSea: [64, 34, 62],
          midSeaTop: [58, 76, 108],
          midSeaMid: [24, 36, 66],
          midSeaDeep: [9, 14, 36],
          frontSea: [20, 26, 54],
          haze: [240, 148, 118]
        }
      },
      {
        id: 'boil_abyss',
        actNum: 4,
        name: '撞击沸海 · 沉渊避难',
        kicker: '第四幕 · 落月撞击',
        subtitle: '海面化作赤红沸海，潜入深海借倒扣沉船气室喘息求生！',
        palette: {
          skyTop: [34, 18, 28],
          skyMid: [108, 44, 42],
          skyHorizon: [212, 98, 66],
          farSea: [68, 34, 40],
          midSeaTop: [96, 52, 54],
          midSeaMid: [30, 32, 46],
          midSeaDeep: [12, 16, 28],
          frontSea: [24, 24, 38],
          haze: [188, 102, 82]
        }
      },
      {
        id: 'ash_sea',
        actNum: 5,
        name: '尘幕灰海 · 浑浊求生',
        kicker: '第五幕 · 浮尘遮日',
        subtitle: '撞击扬尘遮蔽阳光，整片水域灰蒙浑浊——借探照光锥穿越沉没废墟！',
        palette: {
          skyTop: [48, 52, 56],
          skyMid: [82, 86, 86],
          skyHorizon: [134, 134, 128],
          farSea: [62, 68, 70],
          midSeaTop: [68, 76, 78],
          midSeaMid: [38, 46, 50],
          midSeaDeep: [18, 24, 28],
          frontSea: [32, 38, 42],
          haze: [132, 134, 128]
        }
      },
      {
        id: 'kelp_abyss',
        actNum: 6,
        name: '荧光海藻峡谷',
        kicker: '深海新生 · 月核热泉',
        subtitle: '月核矿脉点亮深渊热泉与巨型发光海藻林，随蝠鲼与巨鲸奔向破晓！',
        palette: {
          skyTop: [22, 46, 62],
          skyMid: [44, 86, 98],
          skyHorizon: [112, 174, 172],
          farSea: [24, 62, 74],
          midSeaTop: [36, 108, 118],
          midSeaMid: [16, 56, 72],
          midSeaDeep: [8, 24, 38],
          frontSea: [14, 48, 62],
          haze: [118, 204, 198]
        }
      },
      {
        id: 'dawn',
        actNum: 7,
        name: '破晓彼岸',
        kicker: '终幕 · 晨光破晓',
        subtitle: '浮尘散去，重返玫瑰金晨光洒满的平静翡翠海面，前方即是破晓灯塔',
        palette: {
          skyTop: [40, 74, 118],
          skyMid: [116, 152, 180],
          skyHorizon: [252, 212, 174],
          farSea: [66, 106, 134],
          midSeaTop: [62, 142, 162],
          midSeaMid: [28, 84, 114],
          midSeaDeep: [13, 40, 68],
          frontSea: [24, 70, 98],
          haze: [246, 222, 194]
        }
      }
    ]
  };

  var IMPACT = {
    APPROACH_X: 9200,
    HIT_X: 14800,
    BLEND_BAND: 1500,
    FINALE_X: 67600,
    REBIRTH_MILESTONE_X: 67600
  };

  var ERAS = [
    {
      id: 'moon_sea',
      index: 0,
      isLiquid: true,
      shortName: '月潮之海',
      name: '月潮之海',
      kicker: '启航 · 暮光大洋',
      subtitle: '巨月缓缓坠向海面，乘着长涌驶向未知的彼端',
      omenKey: 'fireApproach',
      omenWhisper: '潮涌骤急，灼热白雾与碎星自天际坠落…',
      startX: 0,
      endX: 13600,
      spawnX: 120,
      waveAmp: 1.0,
      roughness: 0,
      friction: 0.87,
      heatDps: 0,
      coldDps: 0,
      bumpRisk: 0,
      vineRisk: 0,
      starValue: 1,
      palette: {
        skyTop: [25, 31, 68],
        skyMid: [76, 62, 102],
        skyHorizon: [232, 162, 134],
        farSea: [50, 58, 94],
        midSeaTop: [42, 76, 114],
        midSeaMid: [22, 48, 84],
        midSeaDeep: [10, 22, 46],
        frontSea: [18, 34, 62],
        haze: [228, 178, 158]
      }
    },
    {
      id: 'fire_sea',
      index: 1,
      isLiquid: true,
      shortName: '陨落火海',
      name: '陨落火海',
      kicker: '天穹剧变 · 炽海',
      subtitle: '巨月擦撞海平线，大洋在低沉轰鸣中沸腾为赤金火海',
      omenKey: 'ashFall',
      omenWhisper: '焰光渐暗，遮天火山灰与冷雪自苍穹飘落…',
      startX: 13600,
      endX: 24200,
      spawnX: 13900,
      waveAmp: 1.15,
      roughness: 0,
      friction: 0.85,
      heatDps: 11.5,
      coldDps: 0,
      bumpRisk: 0,
      vineRisk: 0,
      starValue: 2,
      palette: {
        skyTop: [28, 15, 36],
        skyMid: [96, 36, 48],
        skyHorizon: [242, 134, 82],
        farSea: [82, 34, 42],
        midSeaTop: [226, 102, 54],
        midSeaMid: [116, 36, 34],
        midSeaDeep: [38, 14, 22],
        frontSea: [54, 22, 28],
        haze: [246, 154, 102]
      }
    },
    {
      id: 'ice_winter',
      index: 2,
      isLiquid: false,
      shortName: '尘冬冰原',
      name: '尘冬冰原',
      kicker: '漫长尘冬 · 封冻',
      subtitle: '大火熄灭、尘云蔽日，沸海凝结为寂静滑冽的无垠坚冰',
      omenKey: 'thawCrack',
      omenWhisper: '尘幕渐散，暖色曙光穿透冰雾，冻原开始消融…',
      startX: 24200,
      endX: 35000,
      spawnX: 24550,
      waveAmp: 1.0,
      roughness: 0,
      friction: 0.95,
      heatDps: 0,
      coldDps: 12.2,
      bumpRisk: 0,
      vineRisk: 0,
      starValue: 3,
      palette: {
        skyTop: [26, 34, 54],
        skyMid: [66, 80, 104],
        skyHorizon: [176, 192, 206],
        farSea: [74, 96, 118],
        midSeaTop: [154, 202, 222],
        midSeaMid: [76, 124, 154],
        midSeaDeep: [26, 48, 76],
        frontSea: [46, 78, 106],
        haze: [192, 206, 218]
      }
    },
    {
      id: 'thawed_wasteland',
      index: 3,
      isLiquid: false,
      shortName: '融冰荒土',
      name: '融冰荒土',
      kicker: '冰雪退去 · 荒原',
      subtitle: '寒冰化尽，露出布满陨石浅坑与碎石的苍茫大地',
      omenKey: 'firstRain',
      omenWhisper: '第一阵温柔细雨落下，干裂岩缝间冒出点点新绿…',
      startX: 35000,
      endX: 45800,
      spawnX: 35350,
      waveAmp: 1.0,
      roughness: 1.0,
      friction: 0.72,
      heatDps: 0,
      coldDps: 0,
      bumpRisk: 1.0,
      vineRisk: 0,
      starValue: 4,
      palette: {
        skyTop: [36, 32, 54],
        skyMid: [98, 74, 78],
        skyHorizon: [222, 174, 134],
        farSea: [94, 72, 64],
        midSeaTop: [164, 118, 86],
        midSeaMid: [112, 74, 56],
        midSeaDeep: [52, 34, 28],
        frontSea: [78, 52, 42],
        haze: [226, 184, 146]
      }
    },
    {
      id: 'sprout_meadow',
      index: 4,
      isLiquid: false,
      shortName: '萌芽青野',
      name: '萌芽青野',
      kicker: '万物苏醒 · 初春',
      subtitle: '春雨润泽大地，缓丘铺满摇曳嫩草与蒲公英暖风',
      omenKey: 'canopyRise',
      omenWhisper: '林雾弥漫，幼树拔节成荫，微光孢子在风中起舞…',
      startX: 45800,
      endX: 56600,
      spawnX: 46150,
      waveAmp: 1.0,
      roughness: 0.08,
      friction: 0.90,
      heatDps: 0,
      coldDps: 0,
      bumpRisk: 0,
      vineRisk: 0,
      starValue: 5,
      palette: {
        skyTop: [48, 92, 136],
        skyMid: [116, 168, 188],
        skyHorizon: [236, 226, 186],
        farSea: [96, 142, 112],
        midSeaTop: [134, 186, 110],
        midSeaMid: [86, 128, 78],
        midSeaDeep: [46, 70, 52],
        frontSea: [68, 108, 70],
        haze: [226, 232, 202]
      }
    },
    {
      id: 'giant_forest',
      index: 5,
      isLiquid: false,
      shortName: '巨木林海',
      name: '巨木林海',
      kicker: '沧海桑田 · 新生',
      subtitle: '参天古木在坠月山麓拔地而起，翡翠云林连绵至天边',
      omenKey: null,
      omenWhisper: '',
      startX: 56600,
      endX: 999999,
      spawnX: 56950,
      waveAmp: 1.0,
      roughness: 0.04,
      friction: 0.93,
      heatDps: 0,
      coldDps: 0,
      bumpRisk: 0,
      vineRisk: 1.0,
      starValue: 7,
      palette: {
        skyTop: [24, 66, 78],
        skyMid: [64, 132, 114],
        skyHorizon: [216, 236, 184],
        farSea: [46, 98, 78],
        midSeaTop: [88, 162, 104],
        midSeaMid: [44, 102, 74],
        midSeaDeep: [18, 46, 40],
        frontSea: [32, 76, 58],
        haze: [204, 232, 188]
      }
    }
  ];

  // 3 项核心强化（初始可见）+ 5 件未知图纸模块（仅在亲历对应天象后由小船夫灵光一现解锁！）
  var SHOP_ITEMS = [
    {
      id: 'rocket',
      category: 'core',
      name: '推进动力',
      tag: '核心属性',
      maxLevel: 3,
      costs: [20, 50, 105],
      descs: [
        '强化船尾铜喷口，推力与跃浪升力 +18%，燃料燃烧更省。',
        '加挂双联液氢铜罐，最高航速提升，空中连翻更加从容。',
        '解锁蓝焰高能尾喷，推力与续航全面蜕变。'
      ]
    },
    {
      id: 'hull',
      category: 'core',
      name: '船体结构',
      tag: '核心属性',
      maxLevel: 3,
      costs: [18, 45, 95],
      descs: [
        '加固木舟龙骨，船体耐久上限提至 140，磕碰减伤 18%。',
        '加厚胡桃木船肋，耐久上限提至 185，抗冲击能力再增。',
        '鎏金船舷精工成型，耐久上限达 240，稳渡未知风浪。'
      ]
    },
    {
      id: 'magnet',
      category: 'core',
      name: '拾光星环',
      tag: '核心属性',
      maxLevel: 3,
      costs: [18, 45, 95],
      descs: [
        '星火吸附半径大幅扩大，腾空抛物线不再漏吃星火。',
        '星光牵引更远，且每颗星火额外带来 25% 船坞收益。',
        '广域拾光共鸣：星火总收益额外提升 50%。'
      ]
    },
    {
      id: 'deep_fins',
      category: 'ocean',
      name: '深潜鱼鳍流',
      tag: '潜海·破矿',
      maxLevel: 3,
      costs: [24, 60, 125],
      descs: [
        '水面潜鳍蓄力 +25%；入渊后化作主推进鳍，气息消耗 -30%，冲刺冷却更短且可震碎月核矿柱。',
        '水面满蓄引爆「炸浪冲击波」；深海冲刺挥出鱼鳍水刃，大范围震碎月陨、矿柱并震退提灯鱼。',
        '月鲸潜鳍完全体：深海气息消耗减半、冲刺高速爆发，破水瞬间回满燃料并叠加连技！'
      ]
    },
    {
      id: 'sky_sail',
      category: 'ocean',
      name: '高空风帆流',
      tag: '云帆·蝠翼',
      maxLevel: 3,
      costs: [24, 60, 125],
      descs: [
        '高空展开月纹布帆减阻滑翔；潜入深渊自动折展为「蝠鲼流体翼」，水下滑行惯性倍增且省气。',
        '云间星环收益翻倍；深海乘热泉与蝠鲼尾流时极速滑行并几乎零耗气，续航极其从容。',
        '云端踏浪帆：高空免费「踏云二段跳」；深海流体翼全力绽放，滑行自动缓回燃料与气息！'
      ]
    },
    {
      id: 'tide_sonar',
      category: 'ocean',
      name: '潮汐声呐流',
      tag: '探渊·破伪',
      maxLevel: 3,
      costs: [22, 55, 115],
      descs: [
        '船首铜制声呐波纹自动标注未收集遗物与深海「沉船气室」方位，并提前戳破提灯鱼伪装。',
        '声呐波纹穿透灰雾勾勒海床地形轮廓，大范围牵引 620px 内深海星珠，星火收益 +25%。',
        '星潮共鸣仪：声呐脉冲直接唤醒蓝鲸共鸣爆星火，敲钟、震碎矿柱与全章遗物奖励翻倍！'
      ]
    },
    {
      id: 'warm_breaker',
      category: 'ocean',
      name: '暖铜破冰舱',
      tag: '破冰·恒温',
      maxLevel: 3,
      costs: [28, 68, 140],
      descs: [
        '加装前鼻圆铜破冰环与恒温暖阀：抵御 45% 冰海极寒减速，冲刺可自下而上撞碎薄冰开辟呼吸冰洞！',
        '升级双循环地热暖阀：抵御 75% 极寒，冲刺撞碎薄冰瞬间回满气息与推进燃料。',
        '满级恒温破冰艇：完全免疫冰海极寒减速，可撞裂厚霜冰盖，靠近海底暖泉缓回船体耐久！'
      ]
    },
    {
      id: 'heat_shield',
      category: 'era',
      name: '黑曜石隔热壳',
      tag: '火海自动展开',
      eraReq: 'fire_sea',
      maxLevel: 3,
      costs: [25, 60, 120],
      descs: [
        '驶入火海时船底自动包覆黑曜石护板：减免 65% 高温，借熔岩热柱升空。',
        '展开紫铜散热翼片：隔热 90%，火海滑行自动为火箭蓄热回气。',
        '满级抗熔护盾：完全免疫火海高温，顺熔岩滑行缓回耐久。'
      ]
    },
    {
      id: 'quilt',
      category: 'era',
      name: '补丁厚棉被 & 暖炉',
      tag: '冰原自动披上',
      eraReq: 'ice_winter',
      maxLevel: 3,
      costs: [35, 85, 160],
      descs: [
        '驶入冰原时自动给船披上彩色补丁厚棉被：抵御 65% 严寒并稳住冰面。',
        '船头点亮迷你暖炉：抵御 90% 严寒，冰原滑行速度与回气提升。',
        '满级羽绒暖被：完全免疫极寒，冰川飞驰时暖意持续回复耐久。'
      ]
    },
    {
      id: 'springs',
      category: 'era',
      name: '黄铜弹簧滑橇',
      tag: '陆地自动放下',
      eraReq: 'thawed_wasteland',
      maxLevel: 3,
      costs: [60, 130, 220],
      descs: [
        '上陆时船底机械放下黄铜大弹簧与滑橇（水中自动收起）：减免 65% 荒土颠簸。',
        '双联避震滑橇：减免 90% 颠簸，碾过陨石坑自动转化为高弹回跃。',
        '全地形鎏金滑橇：完全免疫颠簸，每次落地触发强力弹跳并奖星火。'
      ]
    },
    {
      id: 'glider',
      category: 'era',
      name: '风铃滑翔翼',
      tag: '腾空自动展开',
      eraReq: 'sprout_meadow',
      maxLevel: 3,
      costs: [85, 180, 300],
      descs: [
        '腾空时自动展开手绘麻布双翼（着地收纳）：减缓下坠、放大风口升力。',
        '双层翠叶翼面：空中滑翔更远，并自动缓慢回复火箭燃料。',
        '满级云林风铃大翼：近乎无重滑翔，穿行青野与林海孢子流轻松连翻。'
      ]
    },
    {
      id: 'prow',
      category: 'era',
      name: '破藤鎏金船首',
      tag: '林海自动展开',
      eraReq: 'giant_forest',
      maxLevel: 3,
      costs: [120, 240, 390],
      descs: [
        '进入巨木林海时船首展开弯月鎏金刃：劈开荆棘巨藤减伤 70% 并爆星火。',
        '翡翠叶纹刃口：无伤切碎巨藤障碍，破藤瞬间爆发冲刺与回气。',
        '新生圣金船首：破藤叠连技、奖高额星火并回复船体耐久。'
      ]
    }
  ];

  // v11 探索轻图鉴目录（5 枚沉海遗物 + 6 类深海生态生物）
  var CODEX_ENTRIES = {
    relics: [
      {
        id: 'relic_watch',
        name: '潮汐铜怀表',
        icon: 'watch',
        hint: '悬于沉海古钟楼顶拱高空',
        lore: '指针停在巨月坠落前的那一刻，表盖内侧刻着旧港潮汐时刻。'
      },
      {
        id: 'relic_flute',
        name: '海月珊瑚笛',
        icon: 'flute',
        hint: '藏于深海荧光水母秘沟最深处',
        lore: '由空心蓝珊瑚雕成的古笛，随暗流轻轻吹过时会传出似鲸鸣的余音。'
      },
      {
        id: 'relic_lantern',
        name: '旧镇琉璃灯',
        icon: 'lantern',
        hint: '悬于半沉旧镇高架断桥端头',
        lore: '旧镇守桥人留下的暖琥珀风灯，即便海雾弥漫也未曾熄灭。'
      },
      {
        id: 'relic_moon_core',
        name: '月核晶簇',
        icon: 'crystal',
        hint: '藏于中部黑烟囱热泉上方水域',
        lore: '自坠海巨月剥落的青金矿晶，在深海微压下仍散发温润星辉。'
      },
      {
        id: 'relic_abyss_bell',
        name: '深渊航海钟',
        icon: 'bell',
        hint: '沉睡于东部荧光巨藻峡谷最深处',
        lore: '远航古船失落的青铜船钟，被发光巨藻温柔缠绕于幽蓝海床。'
      },
      {
        id: 'relic_ice_compass',
        realm: 'frost_sea',
        name: '极光星盘',
        icon: 'ice_compass',
        hint: '【霜穹冰海】悬于北风探险号沉船冰桅上方',
        lore: '旧极地船队留下的黄铜星盘，指针总在极光盛放时指向最近的暖泉绿洲。'
      },
      {
        id: 'relic_narwhal_tusk',
        realm: 'frost_sea',
        name: '螺旋冰牙笛',
        icon: 'ice_tusk',
        hint: '【霜穹冰海】藏于西部蓝冰拱廊深谷侧壁',
        lore: '由自然脱落的独角鲸螺旋长牙雕成，水波穿孔而过会发出清越极地长吟。'
      },
      {
        id: 'relic_aurora_prism',
        realm: 'frost_sea',
        name: '折光寒晶核',
        icon: 'ice_prism',
        hint: '【霜穹冰海】沉睡于东部极光冰殿拱顶高处',
        lore: '天然六棱冰晶，能将极夜天穹洒下的微弱极光折射为温暖金绿光束。'
      },
      {
        id: 'relic_frost_lantern',
        realm: 'frost_sea',
        name: '雪夜守望灯',
        icon: 'ice_lantern',
        hint: '【霜穹冰海】安放于东部地热暖泉旁的冰晶崖畔',
        lore: '装有地热余烬的暖铜提灯，在冰封百年的海床下依旧燃烧着不灭暖焰。'
      }
    ],
    fauna: [
      {
        id: 'fauna_sardine',
        name: '银光沙丁鱼群',
        icon: 'sardine',
        hint: '游弋于浅海与沉船气室之间',
        lore: '遇舟自动分流又于船尾合拢；沸海与灰海降临时，它们总会成群引向最近的沉船气室。'
      },
      {
        id: 'fauna_manta',
        name: '月影蝠鲼',
        icon: 'manta',
        hint: '在中层水域优雅振翼巡游',
        lore: '宽大柔美的菱形巨翼划出柔和青白尾流，贴近尾流滑行可大幅节省气息。'
      },
      {
        id: 'fauna_jelly',
        name: '荧光水母群',
        icon: 'jelly',
        hint: '栖息于浅海与深海荧光水母沟',
        lore: '透明伞盖随潮汐呼吸伸缩，轻触柔伞即可借力上浮并拾取逸散氧气泡。'
      },
      {
        id: 'fauna_angler',
        name: '深渊提灯鱼',
        icon: 'angler',
        hint: '仅在撞击沸海与尘幕灰海期现身',
        lore: '隐身于灰蒙浑水暗影中摇曳暖黄诱饵；声呐可提前识破真身，鱼鳍冲刺即可震退。'
      },
      {
        id: 'fauna_kelp',
        name: '发光海藻林',
        icon: 'kelp',
        hint: '扎根于海床峡谷，沉降新生期璀璨盛放',
        lore: '吸收坠海月核矿质而生的巨型丝带海藻，穿行其间会扬起蓝眼泪磷光并拓宽视野。'
      },
      {
        id: 'fauna_whale',
        name: '深渊与月下蓝鲸',
        icon: 'whale',
        hint: '巡游于东部海域水面与深海远景',
        lore: '温柔的深海巨灵；在浑浊灰海里传出低沉远鸣，于清澈与破晓时重返海面伴游。'
      },
      {
        id: 'fauna_sea_angel',
        name: '冰海天使群',
        icon: 'sea_angel',
        hint: '【霜穹冰海】翩跹于冰下暖泉与薄冰裂隙之间',
        lore: '晶莹剔透的极地裸海蝶，胸口泛着樱粉暖光，轻拂潜艇即可驱散极寒。'
      },
      {
        id: 'fauna_aurora_jelly',
        name: '极光水母伞',
        icon: 'aurora_jelly',
        hint: '【霜穹冰海】成群飘浮在孔雀蓝冰下空腔中',
        lore: '半透明伞盖流转着翡翠与粉紫极光色晕，是冰海深处最温柔的呼吸浮标。'
      },
      {
        id: 'fauna_narwhal',
        name: '极地独角鲸',
        icon: 'narwhal',
        hint: '【霜穹冰海】巡游于冰下中层，按 Q 声呐可唤其撞裂冰层',
        lore: '头生象牙螺旋长角的冰海骑士；听见潜艇声呐呼唤时，会欣然助你撞开厚冰封锁。'
      },
      {
        id: 'fauna_ice_turtle',
        name: '沉眠冰渊巨龟',
        icon: 'ice_turtle',
        hint: '【霜穹冰海】静静悬浮于中部深水区，龟背自成暖岩绿洲',
        lore: '背负地热暖岩与发光苔藓穹顶的远古海龟，为迷途旅人提供一处移动的温暖港湾。'
      }
    ],
    wonders: [
      {
        id: 'wonder_boil',
        name: '沸海沉陨',
        icon: 'wonder_boil',
        hint: '落月撞击后潜于炽红沸海下方见证沉陨或裂窟',
        lore: '巨月坠落刹那，海面化作翻涌炽红的沸腾穹顶，灼热碎岩拖着银色泡柱缓缓沉入海底。'
      },
      {
        id: 'wonder_ash',
        name: '尘幕灰海',
        icon: 'wonder_ash',
        hint: '浮尘遮蔽阳光时驾小潜艇穿越灰蒙浑水与黑烟囱',
        lore: '火山灰与淤泥遮蔽天光，唯有一束暖金柔光与声呐回响，在寂静海雪中照亮沉没废墟。'
      },
      {
        id: 'wonder_dawn',
        name: '破晓晨海',
        icon: 'wonder_dawn',
        hint: '浮尘散尽迎来玫瑰金晨光，重返平静海面',
        lore: '漫长尘幕终会沉降，第一缕玫瑰金朝阳洒满翡翠海面，蓝鲸与旧镇钟楼再度沐浴晨曦。'
      },
      {
        id: 'wonder_harbor',
        name: '焕新灯塔港',
        icon: 'wonder_harbor',
        hint: '唤醒全部 3 座沉海月潮共鸣碑后归返暮光灯塔港',
        lore: '三座古碑共鸣贯通归港洋流，旧港重燃万家暖灯，翡翠极光与蓝鲸群从此常伴这座海湾。'
      },
      {
        id: 'wonder_polar_mist',
        name: '极昼冰雾',
        icon: 'wonder_polar_mist',
        hint: '【霜穹冰海】初入冰海，在珍珠白极昼薄雾中守望浮冰与旧船',
        lore: '冷月悬于苍蓝天幕，雪峰与半封冰古帆船在静谧冰雾中缓缓吐露远古航海往事。'
      },
      {
        id: 'wonder_aurora_night',
        name: '翡翠粉紫极光',
        icon: 'wonder_aurora_night',
        hint: '【霜穹冰海】于极光夜幕下浮出冰间湖或折射极光棱镜',
        lore: '翡翠薄荷与星海粉紫交织成漫天轻纱，极光透入厚冰之下，把整座深谷染作琉璃宫殿。'
      },
      {
        id: 'wonder_frost_sanctuary',
        name: '极光冰穹圣殿',
        icon: 'wonder_frost_sanctuary',
        hint: '【霜穹冰海】唤醒全部 3 座冰海共鸣碑见证极光圣殿永恒盛放',
        lore: '三座冰封古碑在独角鲸长鸣与极光折射中苏醒，整片霜穹冰海从此绽放永恒极光与温暖星灯。'
      }
    ]
  };

  // v13 Step 1：4 套纯净 Q 版机械小潜艇涂装（零鱼鳍，仅变换绘本水彩机身与腰带配色）
  var SUB_SKINS = [
    {
      id: 'cream',
      name: '鹅黄经典',
      tag: '初始涂装',
      unlockHint: '初始自带',
      swatch: ['#f6ca6e', '#e5725a'],
      hull: ['#fff3be', '#f6ca6e', '#db8f52', '#8e4e34'],
      tower: ['#fff5c8', '#f4c86e', '#dc9052'],
      accent: '#e5725a',
      vane: '#c86a54',
      belly: 'rgba(255, 248, 232, 0.68)',
      rim: '#e6b466'
    },
    {
      id: 'mint',
      name: '薄荷海盐',
      tag: '委托解锁',
      unlockHint: '完成守望者委托「银鱼流光」',
      swatch: ['#86d8cc', '#e8b974'],
      hull: ['#dcfaf4', '#8cd8cc', '#4ea8a4', '#28646e'],
      tower: ['#e6fcf7', '#94dcd0', '#54aca8'],
      accent: '#e8b86c',
      vane: '#c69454',
      belly: 'rgba(242, 254, 250, 0.72)',
      rim: '#e8be74'
    },
    {
      id: 'coral',
      name: '珊瑚奶橘',
      tag: '委托解锁',
      unlockHint: '完成守望者委托「赤穹沸海」',
      swatch: ['#f29b7e', '#fff0d6'],
      hull: ['#ffe5d8', '#f49c7e', '#d66e5c', '#7e3836'],
      tower: ['#ffece2', '#f6a488', '#d47260'],
      accent: '#f2e0be',
      vane: '#c8725a',
      belly: 'rgba(255, 245, 238, 0.72)',
      rim: '#e6b87a'
    },
    {
      id: 'brass',
      name: '黄铜典藏',
      tag: '委托解锁',
      unlockHint: '完成守望者委托「灰海守望」',
      swatch: ['#d8aa62', '#82dce6'],
      hull: ['#f7e3b2', '#d6a45c', '#9c6a38', '#54351e'],
      tower: ['#fae9be', '#dab068', '#9e6c3a'],
      accent: '#7cd4e0',
      vane: '#9c6d42',
      belly: 'rgba(250, 236, 206, 0.56)',
      rim: '#f4d284'
    }
  ];

  // v13 Step 1：暮光灯塔港守望者「博物委托板」（将实景邮票拍照与潜艇涂装、潮汐怀表奖励打通！）
  var COMMISSIONS = [
    {
      id: 'comm_sardine',
      title: '银鱼流光',
      reqKind: 'fauna',
      reqId: 'fauna_sardine',
      desc: '潜入浅海靠近银光沙丁鱼群，或用 Q 声呐唤起伴游拍下实景邮票。',
      rewardStars: 45,
      rewardSkin: 'mint',
      rewardLabel: '+45✦ · 解锁涂装「薄荷海盐」'
    },
    {
      id: 'comm_boil',
      title: '赤穹沸海',
      reqKind: 'wonder',
      reqId: 'wonder_boil',
      desc: '亲历落月撞击后的沸腾赤海并潜入水下留影「沸海沉陨」。',
      rewardStars: 65,
      rewardSkin: 'coral',
      rewardLabel: '+65✦ · 解锁涂装「珊瑚奶橘」'
    },
    {
      id: 'comm_ash',
      title: '灰海守望',
      reqKind: 'wonder',
      reqId: 'wonder_ash',
      desc: '在浮尘遮蔽阳光的尘幕灰海中点亮探照灯，留影「尘幕灰海」。',
      rewardStars: 75,
      rewardSkin: 'brass',
      rewardLabel: '+75✦ · 解锁涂装「黄铜典藏」'
    },
    {
      id: 'comm_dawn',
      title: '破晓归帆',
      reqKind: 'wonder',
      reqId: 'wonder_dawn',
      desc: '等待漫长灰幕沉降、迎来玫瑰金破晓晨海，留影「破晓晨海」。',
      rewardStars: 90,
      rewardWatch: true,
      rewardLabel: '+90✦ · 获赠「潮汐怀表」拨动天象'
    }
  ];

  var ECONOMY = {
    STAR_VALUE: 1,
    BUOY_STAR_BONUS: 5,
    FLIP_STAR_BONUS: 6,
    SMOOTH_LAND_STAR: 2,
    PLUME_STAR_BONUS: 4,
    SPRING_BOUNCE_STAR: 3,
    VINE_SLICE_STAR: 8,
    STAGE_CLEAR_BONUS: 60,
    REBIRTH_BONUS_STARS: 80,
    DIST_DIVISOR: 14
  };

  return {
    SINGLE_SCENE_MODE: SINGLE_SCENE_MODE,
    EXPLORE_MODE: EXPLORE_MODE,
    WORLD_CYCLE: WORLD_CYCLE,
    SEA_VOYAGE: SEA_VOYAGE,
    FROST_VOYAGE: FROST_VOYAGE,
    SURF: SURF,
    IMPACT: IMPACT,
    ERAS: ERAS,
    SHOP_ITEMS: SHOP_ITEMS,
    CODEX_ENTRIES: CODEX_ENTRIES,
    SUB_SKINS: SUB_SKINS,
    COMMISSIONS: COMMISSIONS,
    ECONOMY: ECONOMY
  };
})();
