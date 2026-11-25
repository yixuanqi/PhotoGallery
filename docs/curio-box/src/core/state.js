(() => {
  // 兼容低版本 Android WebView (< Chrome 99) 与 iOS <= 15.3 的 Canvas roundRect 垫片
  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
      let tl = 0, tr = 0, br = 0, bl = 0;
      if (typeof radii === 'number') {
        tl = tr = br = bl = Math.max(0, radii);
      } else if (Array.isArray(radii)) {
        if (radii.length === 1) {
          tl = tr = br = bl = Math.max(0, Number(radii[0]) || 0);
        } else if (radii.length === 2) {
          tl = br = Math.max(0, Number(radii[0]) || 0);
          tr = bl = Math.max(0, Number(radii[1]) || 0);
        } else if (radii.length >= 4) {
          tl = Math.max(0, Number(radii[0]) || 0);
          tr = Math.max(0, Number(radii[1]) || 0);
          br = Math.max(0, Number(radii[2]) || 0);
          bl = Math.max(0, Number(radii[3]) || 0);
        }
      }
      const maxR = Math.min(Math.abs(w) * 0.5, Math.abs(h) * 0.5);
      tl = Math.min(tl, maxR);
      tr = Math.min(tr, maxR);
      br = Math.min(br, maxR);
      bl = Math.min(bl, maxR);
      this.moveTo(x + tl, y);
      this.lineTo(x + w - tr, y);
      if (tr > 0) this.quadraticCurveTo(x + w, y, x + w, y + tr);
      this.lineTo(x + w, y + h - br);
      if (br > 0) this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
      this.lineTo(x + bl, y + h);
      if (bl > 0) this.quadraticCurveTo(x, y + h, x, y + h - bl);
      this.lineTo(x, y + tl);
      if (tl > 0) this.quadraticCurveTo(x, y, x + tl, y);
      this.closePath();
      return this;
    };
  }

  const CB = (window.CB = window.CB || {});

  CB.game = {
    viewW: window.innerWidth,
    viewH: window.innerHeight,
    time: 0,
    hitStop: 0,

    // 摄像机（支持平滑缩放，便于 M 键全图俯瞰拓扑）
    camera: {
      x: 0,
      y: 0,
      zoom: 1,
      targetZoom: 1,
      shake: 0,
    },

    // 统一输入状态（单一核心工具：轻点静音点射 / 按住蓄力物理重弹）
    input: {
      up: false,
      down: false,
      left: false,
      right: false,
      dashPressed: false,
      fireHeld: false,
      firePressed: false,
      fireReleased: false,
      interactPressed: false,
      interactHeld: false,
      mouseScreenX: window.innerWidth / 2,
      mouseScreenY: window.innerHeight / 2,
      mouseWorldX: 0,
      mouseWorldY: 0,
      moveAxisX: 0,
      moveAxisY: 0,
      aimStickActive: false,
      aimStickAngle: 0,
      useTouchAim: false,
      aimCancelHover: false,
    },

    // 默认选中 A 方案作为正式主角，B/C 完整保留
    variant: 'explorer',
    showFog: true,
    mapOverview: false,
    audioMuted: false,
    hubOpen: false,
    introActive: true,
    titleOpen: false,
    settingsOpen: false,
    menuOpen: false,
    touchMode: 'auto', // 'auto' | 'on' | 'off'
    platform: 'pc', // 'pc' | 'mobile'
    lastInputKind: null, // null | 'mouse' | 'touch'
    touchActive: false,
    portraitBlocked: false,
    portraitDismissed: false,
    appPaused: false,
    paused: false,

    // 当前关卡制进度（1~4 关）
    currentStageId: 1,
    stageBannerTimer: 0,

    // 当前生成的关卡拓扑地图数据（由 mapGen.js 写入）
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

      // 生命与受击无敌
      hp: 100,
      maxHp: 100,
      invulnTimer: 0,
      hitFlash: 0,

      // 移动、冲刺与环境物理状态
      dashTimer: 0,
      dashCooldown: 0,
      dashDirX: 1,
      dashDirY: 0,
      inInkColor: null,
      inPollen: false,
      onDewSlide: false,
      slideSoundTimer: 0,

      // 单一核心武器：轻点 / 蓄力状态
      fireCooldown: 0,
      recoil: 0,
      charging: false,
      chargeTime: 0,
      chargeRatio: 0,
      chargeStageNotified: 0, // 0: 未过重弹阈值 | 1: 进入重弹 | 2: 满蓄力

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

      // 颜艺、金币与物理构筑奇物背包
      expr: 'normal',
      exprLock: null,
      exprTimer: 0,
      blinkTimer: 2.4,
      isBlinking: false,
      lootCount: 4,
      coins: 10,
      curios: [],
    },

    // 单关撤离闭环状态
    run: {
      stageId: 1,
      phase: 'playing', // 'playing' | 'extracted' | 'failed'
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
    },

    // 局外持久化母港资产、工坊升级、出发补给、皮肤与双图鉴记录
    meta: {
      bankValue: 0,
      extractions: 0,
      runs: 0,
      bestHaul: 0,
      unlockedCurios: [],
      clearedStages: [],
      upgrades: {
        maxHp: 0,
        chargeSpeed: 0,
        dashCd: 0,
        magnet: 0,
      },
      unlockedSkins: ['explorer'],
      selectedSkin: 'explorer',
      loadoutCurioId: null,
      seenGuards: [],
      defeatedGuards: {},
      autoPlayIntro: true,
    },

    // 当前画面交互浮标提示
    interactHint: null,

    // 战斗与物理环境动态实体（每关重置）
    bullets: [],
    enemyBullets: [],
    ripples: [],
    inkPuddles: [],
    pollenClouds: [],
    vortices: [],
    coinsList: [],
    curioDrops: [],
    guards: [],
    fallingGuards: [],
    fallingCrates: [],
    butterflies: [],
    coinCombo: 0,
    coinComboTimer: 0,

    // 地面脚印、尘土粒子与飘字提示
    footprints: [],
    particles: [],
    popups: [],
  };
})();
