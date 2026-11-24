(() => {
  const CB = (window.CB = window.CB || {});

  CB.game = {
    viewW: window.innerWidth,
    viewH: window.innerHeight,
    time: 0,

    // 摄像机（支持平滑缩放，便于 M 键全图俯瞰拓扑）
    camera: {
      x: 0,
      y: 0,
      zoom: 1,
      targetZoom: 1,
      shake: 0,
    },

    // 统一输入状态
    input: {
      up: false,
      down: false,
      left: false,
      right: false,
      dashPressed: false,
      fireHeld: false,
      mouseScreenX: window.innerWidth / 2,
      mouseScreenY: window.innerHeight / 2,
      mouseWorldX: 0,
      mouseWorldY: 0,
    },

    // 默认选中 A 方案作为正式主角，B/C 完整保留供未来解锁
    variant: 'explorer',
    showFog: true,
    mapOverview: false,

    // 当前生成的随机拓扑地图数据（由 mapGen.js 写入）
    map: null,

    // 主角状态
    player: {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 19,
      facing: 1,
      aimAngle: 0,
      currentRoomId: -1,

      // 移动与冲刺
      dashTimer: 0,
      dashCooldown: 0,
      dashDirX: 1,
      dashDirY: 0,

      // 试射后坐力
      fireCooldown: 0,
      recoil: 0,

      // 软萌动画与二级弹性参数
      walkPhase: 0,
      stepAccum: 0,
      stepSide: 1,
      hopHeight: 0,
      keyAngle: 0,
      squash: 0,
      squashVel: 0,
      tilt: 0,
      lagX: 0,
      lagY: 0,
      lagVx: 0,
      lagVy: 0,
      scarfNodes: [],

      // 颜艺与背包
      expr: 'normal',
      exprLock: null,
      exprTimer: 0,
      blinkTimer: 2.4,
      isBlinking: false,
      lootCount: 3,
    },

    // 地面脚印、尘土粒子与飘字提示
    footprints: [],
    particles: [],
    popups: [],
  };
})();
