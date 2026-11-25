window.MT = window.MT || {};

window.MT.Config = (function () {
  var ARCHETYPES = {
    thruster: {
      id: 'thruster',
      name: '推进系',
      color: '#ff9673',
      glow: 'rgba(255, 150, 115, 0.65)',
      slot: 'stern',
      items: [
        { name: '迷你反推引擎', line: '外壳刻着“第七次推月实验”，喷口还带着一点余温。' },
        { name: '液氢高压铜罐', line: '有人在罐身用油漆写了行小字：再多给它一点推力。' },
        { name: '旧火箭稳定尾翼', line: '原本要飞去三十八万公里外，最后轻轻落进了海湾。' }
      ]
    },
    balloon: {
      id: 'balloon',
      name: '浮空系',
      color: '#a8dcff',
      glow: 'rgba(168, 220, 255, 0.65)',
      slot: 'mast',
      items: [
        { name: '银色反光气球束', line: '贴满锡纸的生日气球，细绳拴着纸条：别掉下来。' },
        { name: '彩绘大风筝帆', line: '半个镇子的孩子一起画的云朵，迎着月风鼓了起来。' },
        { name: '轻质气象浮囊', line: '它似乎很喜欢变轻的重力，拽着桅杆直往云里飘。' }
      ]
    },
    gramophone: {
      id: 'gramophone',
      name: '共振系',
      color: '#a9f0cc',
      glow: 'rgba(169, 240, 204, 0.65)',
      slot: 'deck',
      items: [
        { name: '黄铜老式留声机', line: '黑胶唱片泡了海水，摇起来却还能哼出温柔的拍子。' },
        { name: '鲸骨银风铃', line: '海风吹过时，水底的发光水母好像跟着节拍在游。' },
        { name: '旧电台铜环天线', line: '调准某个频段时，头顶那颗月亮仿佛轻轻应了一声。' }
      ]
    },
    lantern: {
      id: 'lantern',
      name: '灯火系',
      color: '#ffd480',
      glow: 'rgba(255, 212, 128, 0.72)',
      slot: 'hull',
      items: [
        { name: '暖橘纸灯笼串', line: '防波堤那头飘来的灯，把漆黑的浪尖照成了蜂蜜色。' },
        { name: '萤火虫玻璃瓶', line: '瓶塞封得很紧，里面装着一整片陆地上的夏夜。' },
        { name: '涂鸦木漂流箱', line: '箱盖上画着一栋亮灯的小屋，写着：借你一点暖光。' }
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
        { name: '旧怀表', line: '指针停在涨潮那一刻，秒针却还在逆着轻轻跳动。' },
        { name: '折叠纸船', line: '涂了防水蜡的旧报纸折的，居然比铁船漂得还远。' },
        { name: '屋顶小铜镜', line: '人们说，把镜子朝天摆着，也许能把月亮温柔地推远一寸。' }
      ]
    }
  };

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

  // 三阶段暮光水彩调色板（按潮汐进度 0 -> 1 平滑过渡）
  var PALETTES = [
    {
      // 阶段 0：暮紫暖杏黄昏（柔和治愈）
      skyTop: [25, 31, 64],
      skyMid: [66, 58, 96],
      skyHorizon: [219, 154, 132],
      moonCore: [255, 246, 224],
      moonEdge: [232, 198, 152],
      cloudTint: [235, 194, 178],
      farSea: [46, 54, 88],
      midSeaTop: [34, 58, 92],
      midSeaDeep: [13, 24, 46],
      frontSea: [20, 34, 62]
    },
    {
      // 阶段 0.5：瑰紫银月大潮（奇幻深邃）
      skyTop: [19, 26, 58],
      skyMid: [54, 56, 98],
      skyHorizon: [184, 146, 156],
      moonCore: [255, 244, 218],
      moonEdge: [224, 188, 144],
      cloudTint: [208, 186, 206],
      farSea: [35, 48, 84],
      midSeaTop: [25, 54, 88],
      midSeaDeep: [10, 21, 42],
      frontSea: [15, 29, 56]
    },
    {
      // 阶段 1.0：近月失重极光夜（浪漫巨物感）
      skyTop: [16, 24, 54],
      skyMid: [45, 64, 106],
      skyHorizon: [164, 176, 198],
      moonCore: [255, 247, 228],
      moonEdge: [234, 204, 162],
      cloudTint: [208, 216, 232],
      farSea: [32, 52, 86],
      midSeaTop: [24, 62, 98],
      midSeaDeep: [9, 22, 44],
      frontSea: [14, 30, 58]
    }
  ];

  return {
    ARCHETYPES: ARCHETYPES,
    ENDINGS: ENDINGS,
    PALETTES: PALETTES
  };
})();
