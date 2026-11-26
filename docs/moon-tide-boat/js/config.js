window.MT = window.MT || {};

window.MT.Config = (function () {
  var PROGRESSION = {
    SHARDS_PER_LEVEL: 3,   // 每攒满 3 份碎片升 1 级，拉出自然探索节奏
    MAX_LEVEL: 3,
    WORLD_LENGTH: 12800,   // 360° 无缝环形月海周长（四海域各占 3200px，无左右空气墙）
    START_X: 640,          // 开局启航点（暮光浅湾）
    PILLAR_X: 12180,       // 潮汐光柱坐落于浮空云海深处
    CHART_SECTORS: 48,     // 环形星图迷雾扇区数
    PILLAR_AWAKEN_EXPLORE: 0.60,
    PILLAR_AWAKEN_PARTS: 4
  };

  var ARCHETYPES = {
    lantern: {
      id: 'lantern',
      name: '灯火系',
      upgradeTitles: ['船舷纸灯笼串', '暖潮照海灯阵', '万灯静海之舟'],
      upgradeLines: [
        '几盏橘色纸灯沿着缆绳亮起，水下的暗礁与海雾顿时温柔了许多。',
        '暖光在水面拉出蜂蜜色的波纹，小船驶过之处，身后会留下一串漂流灯。',
        '整艘木舟像陆地上搬来的一座灯火小屋，再狂躁的大潮也在你身旁平息。'
      ],
      color: '#ffd480',
      glow: 'rgba(255, 212, 128, 0.72)',
      slot: 'hull',
      items: [
        { name: '暖橘纸灯笼碎片', line: '防波堤那头飘来的灯纸，还留着一点松油与蜡烛的气味。' },
        { name: '萤火虫玻璃瓶', line: '瓶塞封得很紧，里面装着一整片陆地上的夏夜。' },
        { name: '涂鸦木漂流箱', line: '箱盖上画着一栋亮灯的小屋，写着：借你一点暖光。' },
        { name: '港口旧煤油罩', line: '玻璃罩虽然裂了一角，擦干后依然透出令人安心的琥珀色。' },
        { name: '红绳祈愿小灯', line: '灯底压着一枚硬币和半句话：天黑了，别迷路。' }
      ]
    },
    gramophone: {
      id: 'gramophone',
      name: '共振系',
      upgradeTitles: ['甲板黄铜留声机', '鲸骨风铃声阵', '月潮共鸣乐匣'],
      upgradeLines: [
        '泡过海水的黑胶重新转动，温柔的声波把附近漂流的遗物轻轻唤来船边。',
        '桅杆下挂起一串银色鲸骨风铃，水底发光的水母开始成群追随你的航迹。',
        '每一次船身起伏都像在拨动整片海面的琴弦，月光和声在夜色里久久回荡。'
      ],
      color: '#a9f0cc',
      glow: 'rgba(169, 240, 204, 0.65)',
      slot: 'deck',
      items: [
        { name: '黄铜留声机碎片', line: '弯曲的铜喇叭口还沾着海盐，凑近听像有极轻的节拍。' },
        { name: '鲸骨银风铃', line: '海风吹过时，水底的发光水母好像跟着节拍在游。' },
        { name: '旧电台铜环天线', line: '调准某个频段时，头顶那颗月亮仿佛轻轻应了一声。' },
        { name: '半张黑胶唱片', line: '标签早被海水泡白，只剩手写的曲名：《给不眠的海湾》。' },
        { name: '天文台音叉', line: '敲一下会响很久，频率竟与今晚退潮的浪声严丝合缝。' }
      ]
    },
    thruster: {
      id: 'thruster',
      name: '推进系',
      upgradeTitles: ['船尾迷你反推管', '双联液氢推进炉', '逆潮蓝焰尾喷'],
      upgradeLines: [
        '简易推进器在船尾焊牢了——按住 W / Shift 可喷火冲浪，落水即刻冷却补气。',
        '副燃料铜罐接通完毕，迎着巨浪波峰点火，木舟已能优雅地跃出海面。',
        '高能蓝焰喷口成型，配合浮空挂件，连高耸云端也不再遥不可及。'
      ],
      color: '#ff9673',
      glow: 'rgba(255, 150, 115, 0.65)',
      slot: 'stern',
      items: [
        { name: '迷你反推喷口', line: '外壳刻着“第七次推月实验”，金属还带着一点余温。' },
        { name: '液氢高压铜罐', line: '有人在罐身用油漆写了行小字：再多给它一点推力。' },
        { name: '旧火箭稳定尾翼', line: '原本要飞去三十八万公里外，最后轻轻落进了海湾。' },
        { name: '焦黑点火线圈', line: '擦掉表层的海草，里面的黄铜绕组依旧闪着微光。' },
        { name: '失压燃料阀门', line: '手写标签写着“祝你好运，第 14 号推月舱”。' }
      ]
    },
    balloon: {
      id: 'balloon',
      name: '浮空系',
      upgradeTitles: ['银色反光气球束', '彩绘大风筝布帆', '云海浮空翼阵'],
      upgradeLines: [
        '一束贴满锡纸的银色气球系上桅杆，船身立刻变轻，腾空后能顺风滑翔更远。',
        '孩子们画满云朵的大风筝帆在桅杆展开，借着微弱的月风就能托起船头。',
        '七只浮空囊与风帆在月光下鼓胀，你几乎能听见云端轻声唤你上去看看。'
      ],
      color: '#a8dcff',
      glow: 'rgba(168, 220, 255, 0.65)',
      slot: 'mast',
      items: [
        { name: '银色反光气球束', line: '贴满锡纸的生日气球，细绳拴着纸条：别掉下来。' },
        { name: '彩绘大风筝布片', line: '半个镇子的孩子一起画的云朵，迎着月风鼓了起来。' },
        { name: '轻质气象浮囊', line: '它似乎很喜欢变轻的重力，拽着绳子直往云里飘。' },
        { name: '银漆太阳帆角', line: '薄得像蝉翼，本想借太阳光压把月亮轻轻推回轨道。' },
        { name: '热气球编织篮绳', line: '绳结打得很笨拙，却稳稳托起过谁不肯放弃的念头。' }
      ]
    },
    keepsake: {
      id: 'keepsake',
      name: '海漂拾遗',
      color: '#f5d7b0',
      glow: 'rgba(245, 215, 176, 0.55)',
      slot: 'none',
      items: [
        { name: '漂流玻璃瓶', line: '“如果月亮真的停在海面上，我想踩着浪去散步。”' },
        { name: '停摆的旧怀表', line: '指针停在涨潮那一刻，秒针却还在逆着轻轻跳动。' },
        { name: '防水蜡纸船', line: '旧报纸折的小船，居然比岸边停着的铁船漂得还远。' },
        { name: '屋顶小铜镜', line: '人们说，把镜子朝天摆着，也许能把月亮温柔地推远一寸。' },
        { name: '受潮的观测手记', line: '最后一页写着：它坠落得太轻，更像是凑过来看看我们。' },
        { name: '漆皮小口琴', line: '吹口里卡着一颗白沙，轻轻一晃仿佛有海风穿过。' }
      ]
    }
  };

  // 四片连续海域骨架（色温、海雾、波高、重力、天降频率与掉落倾向平滑过渡）
  var ZONES = [
    {
      id: 'shallows',
      index: 0,
      kicker: '第一海域 · 启航',
      name: '暮光浅湾',
      subtitle: '余晖未散的旧海岸，水面漂来小镇的灯火与信笺',
      startX: 0,
      endX: 3200,
      chartColor: '#f0b892',
      waveMult: 0.82,
      gravityMult: 1.0,
      fogDensity: 0.05,
      meteorInterval: 15.0,
      moonBias: 0.12,
      landmarks: ['cottage', 'pier', 'lighthouse'],
      weights: { lantern: 0.44, gramophone: 0.18, thruster: 0.14, balloon: 0.06, keepsake: 0.18 },
      palette: {
        skyTop: [26, 31, 66],
        skyMid: [72, 60, 98],
        skyHorizon: [224, 156, 132],
        farSea: [48, 55, 90],
        midSeaTop: [36, 60, 96],
        midSeaDeep: [13, 24, 46],
        frontSea: [21, 35, 64],
        fogColor: [218, 178, 168]
      }
    },
    {
      id: 'mist_reefs',
      index: 1,
      kicker: '第二海域 · 迷雾',
      name: '雾锁暗礁海',
      subtitle: '湿冷海雾漫过沉没的石拱，水底回荡着古老的潮汐余音',
      startX: 3200,
      endX: 6400,
      chartColor: '#8ebcd0',
      waveMult: 1.08,
      gravityMult: 0.94,
      fogDensity: 0.54,
      meteorInterval: 12.5,
      moonBias: 0.36,
      landmarks: ['seastack', 'arch', 'seawall', 'lighthouse'],
      weights: { lantern: 0.22, gramophone: 0.42, thruster: 0.16, balloon: 0.08, keepsake: 0.12 },
      palette: {
        skyTop: [20, 28, 56],
        skyMid: [52, 62, 92],
        skyHorizon: [152, 166, 182],
        farSea: [38, 52, 76],
        midSeaTop: [26, 54, 78],
        midSeaDeep: [9, 21, 38],
        frontSea: [16, 32, 52],
        fogColor: [168, 184, 200]
      }
    },
    {
      id: 'rocket_belt',
      index: 2,
      kicker: '第三海域 · 铁与火',
      name: '火箭坠落带',
      subtitle: '人类推月实验的残骸与火光不断划破夜空，浪峰开始汹涌',
      startX: 6400,
      endX: 9600,
      chartColor: '#eb9b88',
      waveMult: 1.38,
      gravityMult: 0.85,
      fogDensity: 0.18,
      meteorInterval: 6.2,
      moonBias: 0.66,
      landmarks: ['gantry', 'rocket_hulk', 'broken_bridge'],
      weights: { lantern: 0.08, gramophone: 0.14, thruster: 0.46, balloon: 0.22, keepsake: 0.10 },
      palette: {
        skyTop: [22, 20, 52],
        skyMid: [66, 46, 86],
        skyHorizon: [204, 134, 128],
        farSea: [42, 40, 74],
        midSeaTop: [30, 48, 84],
        midSeaDeep: [11, 18, 38],
        frontSea: [18, 25, 52],
        fogColor: [198, 148, 146]
      }
    },
    {
      id: 'cloud_sea',
      index: 3,
      kicker: '第四海域 · 近月',
      name: '浮空云海区',
      subtitle: '重力悄然变轻，礁石浮上云端，巨大的月亮就在光柱尽头',
      startX: 9600,
      endX: 12800,
      chartColor: '#a8d8ff',
      waveMult: 1.24,
      gravityMult: 0.72,
      fogDensity: 0.22,
      meteorInterval: 9.5,
      moonBias: 0.94,
      landmarks: ['float_island', 'observatory_float', 'sky_balloon'],
      weights: { lantern: 0.10, gramophone: 0.14, thruster: 0.22, balloon: 0.44, keepsake: 0.10 },
      palette: {
        skyTop: [15, 24, 54],
        skyMid: [44, 66, 108],
        skyHorizon: [172, 186, 210],
        farSea: [32, 54, 90],
        midSeaTop: [25, 64, 102],
        midSeaDeep: [9, 22, 46],
        frontSea: [14, 32, 60],
        fogColor: [188, 204, 226]
      }
    }
  ];

  var ENDINGS = {
    flight: {
      kicker: '终章 · 逆潮升空',
      title: '《飞向月亮的木船》',
      poem: '推进器吐出最后一缕蓝火，一束银色气球猛地拽起船头。<br />你没有等潮汐落下——你的小木舟挣脱海面，载着人类散落的梦，慢悠悠飞进了暖金色的月晕云海里。'
    },
    symphony: {
      kicker: '终章 · 潮汐回响',
      title: '《月下留声机》',
      poem: '甲板上的黄铜喇叭在巨月正下方轻轻转动，清澈的和弦一圈圈荡开。<br />翻涌的海浪安静成一面银镜，头顶那颗庞大而孤独的月亮，仿佛听懂了曲子，温柔地停在了云端。'
    },
    lanterns: {
      kicker: '终章 · 万灯浮海',
      title: '《灯火满海》',
      poem: '你收起木桨，在触手可及的月光下静静停船。<br />四周漆黑的海面忽然浮起成千上万盏暖橘色漂流灯，像整片人间的星河，陪你安静看完了这场最盛大的月潮。'
    }
  };

  var FLIGHT = {
    BASE_BURN_SEC: 2.35,
    BURN_PER_LV: 0.38,
    REIGNITE_THRESHOLD: 0.22,
    WATER_REFILL_RATE: 1.55,
    SOFT_CEILING_START: -380,
    SOFT_CEILING_MAX: -680,
    HARD_CEILING: -750
  };

  // Step 3A · 第二海域（雾锁暗礁海）专属参数与深海重物池
  var MIST_REEFS = {
    FOG_BASE_RADIUS: 138,
    FOG_RADIUS_PER_LV: 88,
    FOG_BEAM_BASE: 155,
    FOG_BEAM_PER_LV: 82,
    WAKE_CLEAR_RADIUS: 84,
    HEAVY_SHARD_VALUE: 2,
    HEAVY_BASE_REEL: 24,
    HEAVY_SWELL_BONUS: 118,
    HEAVY_JELLY_REEL: 150,
    HEAVY_PULL_SAFE_SPEED: 88
  };

  var HEAVY_RELICS = [
    {
      x: 3740,
      depth: 178,
      type: 'gramophone',
      name: '沉钟铜共鸣箱',
      line: '从雾海灯塔塌落下来的厚重铜钟残壳，潮水涌过时竟发出大提琴般的余音。'
    },
    {
      x: 4440,
      depth: 192,
      type: 'lantern',
      name: '百年灯塔菲涅耳透镜',
      line: '沉甸甸的切面玻璃还封存着旧港口的琥珀余温，点亮它，浓雾便会悄然让路。'
    },
    {
      x: 5140,
      depth: 204,
      type: 'gramophone',
      name: '沉船黄铜留声座',
      line: '静卧在暗礁谷底不知多少年，唱针旁缠满发光水草，只需水母托举就能重见月光。'
    },
    {
      x: 5840,
      depth: 196,
      type: 'thruster',
      name: '沉海气压推进舱',
      line: '推月计划早期的重型试验舱，铁壳虽沉，舱底仍锁着半罐澄澈的液氢。'
    }
  ];

  // Step 3B · 第三海域（火箭坠落带）专属参数、半沉火箭跳台/热流喷口与高空降落伞遗物
  var ROCKET_BELT = {
    STAGE_LEAD_SEC: 2.45,
    SHOCKWAVE_SPEED: 320,
    SHOCKWAVE_MAX_R: 290,
    SHOCKWAVE_AMP: 24,
    VENT_UPWARD_FORCE: 430,
    VENT_BALLOON_BONUS: 105,
    VENT_MAX_HEIGHT: 265,
    VENT_FUEL_REFILL: 1.75,
    TEMP_PLUME_DURATION: 9.5,
    RAMP_MIN_LAUNCH_VX: 84,
    RAMP_LAUNCH_VY: 235,
    AIR_RELIC_SHARD_VALUE: 2
  };

  var ROCKET_HULKS = [
    { id: 1, x: 6780, kind: 'ramp', dir: 1, length: 148, height: 76, label: '07' },
    { id: 2, x: 7340, kind: 'vent', radius: 58, height: 260, cycle: 8.4, activeFrac: 0.68, phase: 0.5, label: '11' },
    { id: 3, x: 7920, kind: 'ramp', dir: 1, length: 158, height: 86, label: '14' },
    { id: 4, x: 8480, kind: 'vent', radius: 62, height: 274, cycle: 8.0, activeFrac: 0.70, phase: 3.2, label: '17' },
    { id: 5, x: 9040, kind: 'ramp', dir: 1, length: 166, height: 92, label: '19' }
  ];

  var AIR_RELICS = [
    {
      x: 6915,
      alt: 132,
      type: 'thruster',
      name: '推月舱矢量喷管',
      line: '降落伞绳还缠在烧焦的喷管上，海风一吹，仿佛随时准备再次点火升空。'
    },
    {
      x: 7340,
      alt: 168,
      type: 'balloon',
      name: '高空测风银囊组',
      line: '原本系在气象火箭顶端的反光浮囊，借着滚烫蒸汽悬在半空迟迟不肯落海。'
    },
    {
      x: 8065,
      alt: 152,
      type: 'thruster',
      name: '二级液氢主推核',
      line: '舱门内侧贴着一张便签：哪怕只把月亮推远一毫米，也算替地球道过晚安。'
    },
    {
      x: 8480,
      alt: 184,
      type: 'balloon',
      name: '彩绸减速巨伞',
      line: '橘白相间的降落伞鼓满夜风，绑上桅杆后，连沉重的木舟也生出云间双翼。'
    },
    {
      x: 9185,
      alt: 166,
      type: 'thruster',
      name: '末级蓝焰点火器',
      line: '第十九号推月实验留下的最后火种，冷却的外壳深处仍有微弱的蓝光脉动。'
    }
  ];

  // Step 3C · 第四海域（浮空云海区）反重力浮岛阶梯、月光上升流、云端遗物与潮汐终章参数
  var CLOUD_SEA = {
    STREAM_UPWARD_FORCE: 355,
    STREAM_BALLOON_BONUS: 95,
    STREAM_FUEL_REFILL: 1.9,
    ISLAND_FUEL_REFILL: 2.6,
    ISLAND_JUMP_BONUS: 165,
    GLIDE_TAILWIND: 46,
    CLOUD_RELIC_SHARD_VALUE: 2,
    FINALE_CARD_DELAY: 2.6
  };

  var CLOUD_ISLANDS = [
    { id: 1, x: 9890,  y: -98,  halfW: 86, bobAmp: 6, phase: 0.4, decor: 'lantern_post' },
    { id: 2, x: 10350, y: -148, halfW: 92, bobAmp: 7, phase: 1.7, decor: 'wind_chime' },
    { id: 3, x: 10810, y: -196, halfW: 98, bobAmp: 8, phase: 2.9, decor: 'observatory' },
    { id: 4, x: 11260, y: -236, halfW: 90, bobAmp: 7, phase: 4.1, decor: 'shrine_arch' },
    { id: 5, x: 11680, y: -178, halfW: 84, bobAmp: 6, phase: 5.3, decor: 'moon_bell' }
  ];

  var GRAVITY_STREAMS = [
    { id: 1, x: 9740,  radius: 58, topY: -225, phase: 0.2 },
    { id: 2, x: 10185, radius: 62, topY: -275, phase: 1.6 },
    { id: 3, x: 10640, radius: 64, topY: -325, phase: 3.1 },
    { id: 4, x: 11095, radius: 66, topY: -360, phase: 4.5 },
    { id: 5, x: 11530, radius: 64, topY: -320, phase: 5.4 }
  ];

  var CLOUD_RELICS = [
    {
      x: 9890,
      alt: 146,
      type: 'balloon',
      name: '云海月风银帆',
      line: '挂在第一座浮岛石柱上的银丝风帆，只要沾到月光便会自动鼓起。'
    },
    {
      x: 10350,
      alt: 198,
      type: 'gramophone',
      name: '悬浮云磬共鸣片',
      line: '被潮汐托上云端的古旧铜磬片，轻触时连整片云海都泛起和弦涟漪。'
    },
    {
      x: 10810,
      alt: 250,
      type: 'thruster',
      name: '近月微重力蓝焰芯',
      line: '浮空天文台封存的最后一枚蓝焰晶核，专为挣脱海面的最后一跃而生。'
    },
    {
      x: 11260,
      alt: 286,
      type: 'lantern',
      name: '云端守夜琉璃灯',
      line: '离月亮最近的一盏人间灯火，灯芯里映着海湾尽头尚未熄灭的晚霞。'
    }
  ];

  // Phase 1 · 航行掠拾、完美跃浪与全环海平流层月风加速环
  var SURF = {
    AUTO_MAGNET_BASE: 76,
    AUTO_MAGNET_GRAMO: 34,
    AUTO_COLLECT_R: 44,
    CREST_SLOPE_MIN: 0.105,
    CREST_COOLDOWN: 1.35,
    CREST_FREE_BURN: 0.45,
    CREST_LAUNCH_VY: 235,
    CREST_SURGE_VX: 118,
    RING_FUEL_REFILL: 0.62,
    RING_COOLDOWN: 2.5,
    RING_MIN_VX: 268,
    RING_UP_VY: 155
  };

  // 17 座贯通四海的高空月风加速环（含跨越 12800/0 环海接缝的星环航道）
  var WIND_RINGS = [
    // 暮光浅湾高空风环
    { id: 1,  x: 420,   y: -156, radius: 34, tilt: -0.10 },
    { id: 2,  x: 1320,  y: -148, radius: 34, tilt: -0.14 },
    { id: 3,  x: 2060,  y: -195, radius: 36, tilt: -0.06 },
    { id: 4,  x: 2820,  y: -168, radius: 34, tilt:  0.08 },
    // 雾锁暗礁海雾顶穿云风环
    { id: 5,  x: 3640,  y: -178, radius: 35, tilt: -0.12 },
    { id: 6,  x: 4380,  y: -222, radius: 36, tilt: -0.05 },
    { id: 7,  x: 5120,  y: -236, radius: 36, tilt:  0.04 },
    { id: 8,  x: 5860,  y: -186, radius: 35, tilt:  0.10 },
    // 火箭坠落带接力风环
    { id: 9,  x: 7080,  y: -172, radius: 36, tilt: -0.12 },
    { id: 10, x: 7640,  y: -224, radius: 36, tilt: -0.04 },
    { id: 11, x: 8240,  y: -205, radius: 36, tilt:  0.06 },
    { id: 12, x: 8820,  y: -242, radius: 37, tilt: -0.08 },
    // 浮空云海区星环航道（直跨环海接缝回到浅湾）
    { id: 13, x: 10110, y: -178, radius: 36, tilt: -0.14 },
    { id: 14, x: 10580, y: -232, radius: 37, tilt: -0.10 },
    { id: 15, x: 11040, y: -282, radius: 38, tilt: -0.04 },
    { id: 16, x: 11500, y: -258, radius: 37, tilt:  0.08 },
    { id: 17, x: 12480, y: -182, radius: 36, tilt:  0.04 }
  ];

  // Phase 2 · 主动声波脉冲、高空钟摆锚点与四大海域核心可交互地标机关
  var SONAR = {
    COOLDOWN: 1.55,
    BASE_RADIUS: 240,
    RADIUS_PER_LV: 85,
    BELL_HIT_RADIUS: 230,
    OBS_HIT_RADIUS: 210,
    JELLY_BOOST_SEC: 6.5
  };

  var GRAPPLE_BUOYS = [
    { id: 1, x: 1680,  y: -138, radius: 16 },
    { id: 2, x: 3980,  y: -152, radius: 16 },
    { id: 3, x: 6180,  y: -146, radius: 16 },
    { id: 4, x: 7640,  y: -162, radius: 16 },
    { id: 5, x: 9440,  y: -158, radius: 16 },
    { id: 6, x: 11890, y: -176, radius: 16 }
  ];

  var LANDMARK_PUZZLES = [
    {
      id: 'shallows_lighthouse',
      zoneId: 'shallows',
      index: 0,
      name: '旧港聚光灯塔',
      x: 2480,
      buoyX: 2290,
      rewardType: 'lantern',
      rewardTitle: '✦ 地标苏醒 · 旧港聚光灯塔',
      rewardLine: '铜镜浮标咔嗒归位，暖金光柱穿透灯塔主镜洒满海湾——雾海入口的浓雾随之退散。'
    },
    {
      id: 'mist_bells',
      zoneId: 'mist_reefs',
      index: 1,
      name: '沉钟与巨鲸祭坛',
      x: 4820,
      bells: [
        { x: 4675, y: -18, pitch: 293.66 },
        { x: 4820, y: -26, pitch: 369.99 },
        { x: 4965, y: -18, pitch: 440.00 }
      ],
      rewardType: 'gramophone',
      rewardTitle: '✦ 地标苏醒 · 深海发光巨鲸',
      rewardLine: '三口沉海古钟在雾中齐鸣，沉睡的荧光巨鲸自海底浮现，为你掀开奔涌的星辉洋流。'
    },
    {
      id: 'rocket_gantry',
      zoneId: 'rocket_belt',
      index: 2,
      name: '第十九号推月发射台',
      x: 8760,
      clamps: [
        { x: 8645, y: -32, side: -1 },
        { x: 8875, y: -32, side: 1 }
      ],
      rewardType: 'thruster',
      rewardTitle: '✦ 地标苏醒 · 第十九号推月发射台',
      rewardLine: '锈蚀钢缆应声绷断，残留液氢化作金色星火直冲夜空，永恒热流柱与强化风环全线贯通！'
    },
    {
      id: 'cloud_observatory',
      zoneId: 'cloud_sea',
      index: 3,
      name: '悬空观月天文台',
      x: 10810,
      y: -236,
      rewardType: 'balloon',
      rewardTitle: '✦ 地标苏醒 · 悬空观月天文台',
      rewardLine: '黄铜月相浑天仪精准归位，一道银金星束跨越云海直抵潮汐光柱——终章航道彻底澄明。'
    }
  ];

  return {
    PROGRESSION: PROGRESSION,
    ARCHETYPES: ARCHETYPES,
    ZONES: ZONES,
    ENDINGS: ENDINGS,
    FLIGHT: FLIGHT,
    MIST_REEFS: MIST_REEFS,
    HEAVY_RELICS: HEAVY_RELICS,
    ROCKET_BELT: ROCKET_BELT,
    ROCKET_HULKS: ROCKET_HULKS,
    AIR_RELICS: AIR_RELICS,
    CLOUD_SEA: CLOUD_SEA,
    CLOUD_ISLANDS: CLOUD_ISLANDS,
    GRAVITY_STREAMS: GRAVITY_STREAMS,
    CLOUD_RELICS: CLOUD_RELICS,
    SURF: SURF,
    WIND_RINGS: WIND_RINGS,
    SONAR: SONAR,
    GRAPPLE_BUOYS: GRAPPLE_BUOYS,
    LANDMARK_PUZZLES: LANDMARK_PUZZLES
  };
})();
