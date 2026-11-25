(() => {
  const CB = window.CB;
  const game = CB.game;

  const DURATION = 10.0; // 10 秒手绘水彩开场过场动画
  const INK = '#2b4750';

  const intro = {
    active: false,
    t: 0,
    duration: DURATION,
    lastCue: -1,
    onDone: null,
  };

  // 缓存一次冷压水彩纸微纹理（零每帧分配、零 ctx.filter）
  let paperOverlayPattern = null;
  function getPaperOverlay(ctx) {
    if (paperOverlayPattern) return paperOverlayPattern;
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 160;
    const g = c.getContext('2d');
    for (let i = 0; i < 420; i++) {
      const x = ((i * 53 + (i % 7) * 19) % 160);
      const y = ((i * 97 + (i % 11) * 13) % 160);
      g.fillStyle = i % 2 === 0 ? 'rgba(130, 108, 84, 0.035)' : 'rgba(255, 253, 245, 0.045)';
      g.fillRect(x, y, 2 + (i % 3), 1.5 + (i % 2));
    }
    paperOverlayPattern = ctx.createPattern(c, 'repeat');
    return paperOverlayPattern;
  }

  // 确定性粒子、晨星、远鸟与飘落花瓣
  const DAWN_STARS = Array.from({ length: 56 }, (_, i) => ({
    nx: ((i * 73 + 19) % 100) / 100,
    ny: ((i * 41 + 7) % 58) / 100,
    r: 0.9 + (i % 4) * 0.55,
    phase: i * 1.13,
    gold: i % 4 === 0,
  }));

  const SKY_BIRDS = Array.from({ length: 7 }, (_, i) => ({
    nx: 0.14 + (i * 0.048) + ((i % 2) * 0.014),
    ny: 0.24 + (i % 3) * 0.045,
    sc: 0.65 + (i % 3) * 0.22,
    phase: i * 1.15,
    spd: 0.022 + (i % 3) * 0.005,
  }));

  const MOTES = Array.from({ length: 34 }, (_, i) => ({
    nx: ((i * 37 + 11) % 100) / 100,
    ny: ((i * 59 + 23) % 100) / 100,
    r: 1.5 + (i % 4) * 0.85,
    spd: 0.024 + (i % 3) * 0.014,
    phase: i * 0.91,
    color: i % 3 === 0 ? '#fff5b8' : i % 3 === 1 ? '#ffffff' : '#ffd2dc',
  }));

  const PETALS = Array.from({ length: 20 }, (_, i) => ({
    nx: ((i * 47 + 9) % 100) / 100,
    ny: ((i * 31 + 13) % 100) / 100,
    rot: i * 0.8,
    spdX: 0.044 + (i % 3) * 0.02,
    spdY: 0.018 + (i % 4) * 0.01,
    color: ['#ffb3c6', '#ffe078', '#9ee8f7', '#fffef4'][i % 4],
  }));

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function smoothstep(a, b, x) {
    const t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpColor(hexA, hexB, t) {
    const k = clamp01(t);
    const a = parseInt(hexA.slice(1), 16);
    const b = parseInt(hexB.slice(1), 16);
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return `rgb(${Math.round(ar + (br - ar) * k)},${Math.round(ag + (bg - ag) * k)},${Math.round(ab + (bb - ab) * k)})`;
  }

  function startIntro(onDone) {
    intro.active = true;
    intro.t = 0;
    intro.lastCue = -1;
    intro.onDone = onDone || null;
    game.introActive = true;
  }

  function skipIntro() {
    if (!intro.active) return;
    intro.active = false;
    intro.t = DURATION;
    game.introActive = false;
    const cb = intro.onDone;
    intro.onDone = null;
    if (cb) cb();
  }

  function isIntroActive() {
    return intro.active;
  }

  function getProgress() {
    return clamp01(intro.t / DURATION);
  }

  function updateIntro(dt) {
    if (!intro.active) return;
    intro.t += dt;

    const cueIdx = intro.t < 2.6 ? 0 : intro.t < 5.5 ? 1 : intro.t < 8.1 ? 2 : 3;
    if (cueIdx !== intro.lastCue) {
      intro.lastCue = cueIdx;
      if (CB.audio && CB.audio.playIntroCue) CB.audio.playIntroCue(cueIdx);
    }

    if (intro.t >= DURATION) {
      skipIntro();
    }
  }

  // ==================== 手绘体积水彩云团（三层光影 + 柔暖顶光） ====================
  function drawPainterlyCloud(ctx, x, y, sc, alpha, pal) {
    if (alpha <= 0.01) return;
    const shade = (pal && pal.shade) || '#b5dbf0';
    const mid = (pal && pal.mid) || '#e2f4fd';
    const top = (pal && pal.top) || '#fffdf8';
    const rim = (pal && pal.rim) || 'rgba(255, 248, 224, 0.85)';

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.globalAlpha = alpha;

    const puffs = [
      [-64, 14, 30], [-32, 6, 40], [6, -6, 48], [46, 4, 38], [76, 15, 27], [-10, 16, 36], [28, 17, 34],
    ];

    // 底层云腹冷影
    ctx.fillStyle = shade;
    ctx.beginPath();
    for (let i = 0; i < puffs.length; i++) {
      const [px, py, r] = puffs[i];
      ctx.moveTo(px + r, py + 11);
      ctx.arc(px, py + 11, r, 0, Math.PI * 2);
    }
    ctx.fill();

    // 中层云体
    ctx.fillStyle = mid;
    ctx.beginPath();
    for (let i = 0; i < puffs.length; i++) {
      const [px, py, r] = puffs[i];
      ctx.moveTo(px + r * 0.96, py + 3);
      ctx.arc(px, py + 3, r * 0.96, 0, Math.PI * 2);
    }
    ctx.fill();

    // 向阳暖白蓬松云顶
    ctx.fillStyle = top;
    ctx.beginPath();
    const tops = [[-54, 4, 24], [-26, -6, 33], [8, -16, 40], [42, -5, 31], [66, 6, 21]];
    for (let i = 0; i < tops.length; i++) {
      const [px, py, r] = tops[i];
      ctx.moveTo(px + r, py);
      ctx.arc(px, py, r, 0, Math.PI * 2);
    }
    ctx.fill();

    // 轻盈晨光云脊弧线
    ctx.strokeStyle = rim;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(6, -15, 31, Math.PI * 1.12, Math.PI * 1.72);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-26, -5, 24, Math.PI * 1.15, Math.PI * 1.65);
    ctx.stroke();

    ctx.restore();
  }

  // 连绵水彩云海地平线（3 层视差，彻底拉出宫崎骏高空层次）
  function drawCloudSeaHorizon(ctx, W, H, t, dawnT) {
    const baseY = H * 0.86;
    const layers = [
      { yOff: -32, amp: 24, freq: 6, speed: 12, color: lerpColor('#6178a8', '#c6e8f8', dawnT), alpha: 0.55 },
      { yOff: -6, amp: 20, freq: 7, speed: 22, color: lerpColor('#8ca4cc', '#e4f6fe', dawnT), alpha: 0.75 },
      { yOff: 22, amp: 16, freq: 8, speed: 34, color: lerpColor('#c7d9ee', '#fbfefe', dawnT), alpha: 0.92 },
    ];

    for (let li = 0; li < layers.length; li++) {
      const L = layers[li];
      ctx.save();
      ctx.globalAlpha = L.alpha;
      ctx.fillStyle = L.color;
      ctx.beginPath();
      ctx.moveTo(-40, H + 40);
      const step = W / L.freq;
      const shift = (t * L.speed) % step;
      for (let i = -1; i <= L.freq + 2; i++) {
        const bx = i * step - shift;
        const by = baseY + L.yOff + Math.sin(i * 1.7 + li * 2.1) * L.amp * 0.45;
        const r = step * 0.46 + Math.cos(i * 1.3 + li) * 14;
        ctx.arc(bx, by, r, Math.PI, 0, false);
      }
      ctx.lineTo(W + 60, H + 40);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawSkyBirds(ctx, W, H, t, alpha) {
    if (alpha <= 0.02) return;
    ctx.save();
    ctx.globalAlpha = alpha * 0.72;
    ctx.strokeStyle = '#fffef6';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    for (const b of SKY_BIRDS) {
      const x = ((b.nx + t * b.spd) % 1.2 - 0.1) * W;
      const y = (b.ny + Math.sin(t * 1.5 + b.phase) * 0.015) * H;
      const flap = Math.sin(t * 7.5 + b.phase) * 4.5 * b.sc;
      const span = 8.5 * b.sc;
      ctx.beginPath();
      ctx.moveTo(x - span, y - flap);
      ctx.quadraticCurveTo(x - span * 0.4, y - 3.5 * b.sc, x, y);
      ctx.quadraticCurveTo(x + span * 0.4, y - 3.5 * b.sc, x + span, y - flap);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ==================== 精绘宫崎骏风飞艇母港 ====================
  function drawCurioAirship(ctx, x, y, scale, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(Math.sin(t * 1.9) * 0.028);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 蓬松水彩尾气蒸汽云
    for (let i = 0; i < 6; i++) {
      const p = ((t * 1.15 + i / 6) % 1);
      const px = -86 - p * 92;
      const py = 14 - Math.sin(p * Math.PI) * 18 + Math.sin(t * 3.2 + i) * 4;
      const pr = 5 + p * 14;
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.62;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 上下尾翼（暖珊瑚红+奶白条纹）
    ctx.fillStyle = '#e26a62';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-54, -15);
    ctx.quadraticCurveTo(-76, -34, -88, -32);
    ctx.quadraticCurveTo(-84, -16, -74, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-56, 12);
    ctx.quadraticCurveTo(-74, 28, -84, 25);
    ctx.quadraticCurveTo(-80, 12, -72, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 随风翻飞的长条红金母港旗帜
    const fw = Math.sin(t * 10.5) * 4.5;
    ctx.fillStyle = '#eb5d54';
    ctx.beginPath();
    ctx.moveTo(-84, -31);
    ctx.bezierCurveTo(-98, -36 + fw, -110, -24 - fw, -122, -29 + fw * 0.5);
    ctx.lineTo(-114, -22 + fw * 0.4);
    ctx.bezierCurveTo(-104, -20 - fw, -94, -28 + fw, -84, -23);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 细密吊索绳网
    ctx.strokeStyle = 'rgba(43, 71, 80, 0.72)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-34, 20); ctx.lineTo(-26, 37);
    ctx.moveTo(-12, 24); ctx.lineTo(-10, 37);
    ctx.moveTo(14, 24); ctx.lineTo(12, 37);
    ctx.moveTo(36, 20); ctx.lineTo(28, 37);
    ctx.stroke();

    // 暖木色飞艇船舱 + 观景甲板围栏 + 发光舷窗
    ctx.fillStyle = '#b97b49';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-38, 35);
    ctx.lineTo(44, 35);
    ctx.bezierCurveTo(48, 49, 36, 56, 22, 56);
    ctx.lineTo(-24, 56);
    ctx.bezierCurveTo(-38, 56, -44, 48, -38, 35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 船舱上沿浅木高光边
    ctx.fillStyle = '#deb07e';
    ctx.beginPath();
    ctx.roundRect(-36, 33, 78, 5, 2.5);
    ctx.fill();
    ctx.stroke();

    // 船尾黄铜护环与高速旋转螺旋桨（带柔和残影）
    const propH = 5 + Math.abs(Math.sin(t * 30)) * 13;
    ctx.fillStyle = 'rgba(255, 232, 146, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-45, 45, 5.5, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.ellipse(-45, 45, 2.8, propH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 四扇发光圆窗（带温暖微晕）
    [-20, -6, 8, 22].forEach((wx) => {
      const wg = ctx.createRadialGradient(wx, 45, 1, wx, 45, 8);
      wg.addColorStop(0, 'rgba(255, 238, 140, 0.7)');
      wg.addColorStop(1, 'rgba(255, 238, 140, 0)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.arc(wx, 45, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff099';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(wx, 45, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // 雕塑感水滴流线气囊（非呆板椭圆！）
    const traceHull = () => {
      ctx.beginPath();
      ctx.moveTo(78, -4);
      ctx.bezierCurveTo(78, -32, 24, -40, -28, -34);
      ctx.bezierCurveTo(-64, -30, -80, -16, -80, -4);
      ctx.bezierCurveTo(-80, 12, -62, 26, -24, 28);
      ctx.bezierCurveTo(26, 31, 78, 20, 78, -4);
      ctx.closePath();
    };

    const hullGrad = ctx.createLinearGradient(0, -38, 0, 30);
    hullGrad.addColorStop(0, '#fffef7');
    hullGrad.addColorStop(0.55, '#fdf1da');
    hullGrad.addColorStop(1, '#d8dceb');
    traceHull();
    ctx.fillStyle = hullGrad;
    ctx.fill();

    ctx.save();
    traceHull();
    ctx.clip();

    // 珊瑚红顶盖、天青下腹与鎏金腰带
    ctx.fillStyle = '#e67268';
    ctx.fillRect(-84, -44, 168, 18);
    ctx.fillStyle = '#5bb8d6';
    ctx.fillRect(-84, 13, 168, 20);
    ctx.fillStyle = '#f5cb58';
    ctx.fillRect(-84, -7, 168, 7);

    // 柔和纵向曲面缝线，增强布面气囊鼓胀体积感
    ctx.strokeStyle = 'rgba(43, 71, 80, 0.22)';
    ctx.lineWidth = 1.3;
    [-16, -3, 10].forEach((ly) => {
      ctx.beginPath();
      ctx.moveTo(-80, -4);
      ctx.quadraticCurveTo(0, ly * 1.4, 78, -4);
      ctx.stroke();
    });

    // 气囊左上向阳柔光反射
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.beginPath();
    ctx.ellipse(-6, -22, 46, 9, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    traceHull();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // 艇首黄铜花冠尖锥
    ctx.fillStyle = '#f6cc5c';
    ctx.beginPath();
    ctx.moveTo(76, -9);
    ctx.quadraticCurveTo(88, -4, 76, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // ==================== 有机手绘水彩主题浮岛（彻底告别多边形拼凑！） ====================
  function drawArtisticThemeIsle(ctx, x, y, sc, kind, t) {
    const bob = Math.sin(t * 1.55 + x * 0.015) * 6;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(sc, sc);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const themes = {
      lotus: {
        aura: 'rgba(138, 228, 248, 0.26)',
        rockLit: '#ddc09c',
        rockMid: '#be9872',
        rockDark: '#7a6f75',
        grassLit: '#96d89e',
        grassDark: '#4f9c73',
        vine: '#52a36e',
        bloom: '#ff9eb5',
      },
      astro: {
        aura: 'rgba(116, 152, 242, 0.34)',
        rockLit: '#5a70a8',
        rockMid: '#374878',
        rockDark: '#1c264a',
        grassLit: '#607cc0',
        grassDark: '#30437a',
        vine: '#7898d4',
        bloom: '#ffe066',
      },
      vine: {
        aura: 'rgba(136, 224, 184, 0.28)',
        rockLit: '#8ba48e',
        rockMid: '#5f7a6c',
        rockDark: '#344c47',
        grassLit: '#79c282',
        grassDark: '#3a7a59',
        vine: '#428f5e',
        bloom: '#ffca57',
      },
      sunset: {
        aura: 'rgba(255, 206, 134, 0.38)',
        rockLit: '#e6b89c',
        rockMid: '#c28778',
        rockDark: '#7a4f5e',
        grassLit: '#f7d8a6',
        grassDark: '#d6997a',
        vine: '#73b37a',
        bloom: '#ffd659',
      },
    };
    const pal = themes[kind] || themes.lotus;

    // 1. 柔和环岛氛围光晕
    const aura = ctx.createRadialGradient(0, -10, 12, 0, -4, 118);
    aura.addColorStop(0, pal.aura);
    aura.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -4, 118, 0, Math.PI * 2);
    ctx.fill();

    // 2. 漂浮在浮岛下方的 3 颗有机小碎岩（营造天空之城失重魔力）
    const pebbles = [
      { px: -54, py: 44 + Math.sin(t * 2.3 + 1) * 4, rx: 10, ry: 7.5 },
      { px: 48, py: 52 + Math.sin(t * 2.0 + 3) * 4.5, rx: 8.5, ry: 6.5 },
      { px: -8, py: 90 + Math.sin(t * 2.6 + 5) * 4, rx: 7, ry: 8.5 },
    ];
    for (const pb of pebbles) {
      ctx.fillStyle = pal.rockMid;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(pb.px - pb.rx, pb.py);
      ctx.bezierCurveTo(pb.px - pb.rx, pb.py - pb.ry, pb.px + pb.rx, pb.py - pb.ry, pb.px + pb.rx, pb.py);
      ctx.bezierCurveTo(pb.px + pb.rx * 0.7, pb.py + pb.ry * 1.2, pb.px - pb.rx * 0.5, pb.py + pb.ry * 1.3, pb.px - pb.rx, pb.py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 3. 有机手绘贝塞尔悬崖岩体（双面明暗 + 岩层水彩肌理，彻底无僵硬折线！）
    const traceCliff = () => {
      ctx.beginPath();
      ctx.moveTo(-74, -2);
      ctx.bezierCurveTo(-76, 20, -56, 30, -44, 42);
      ctx.bezierCurveTo(-34, 54, -26, 70, -6, 78);
      ctx.bezierCurveTo(10, 84, 24, 66, 36, 54);
      ctx.bezierCurveTo(50, 42, 72, 26, 74, -2);
      ctx.closePath();
    };

    const rockGrad = ctx.createLinearGradient(-64, -4, 52, 78);
    rockGrad.addColorStop(0, pal.rockLit);
    rockGrad.addColorStop(0.55, pal.rockMid);
    rockGrad.addColorStop(1, pal.rockDark);
    traceCliff();
    ctx.fillStyle = rockGrad;
    ctx.fill();

    // 岩体内部柔和明暗面与水彩地质纹理
    ctx.save();
    traceCliff();
    ctx.clip();

    // 右下冷色背光岩面
    ctx.fillStyle = pal.rockDark;
    ctx.globalAlpha = 0.42;
    ctx.beginPath();
    ctx.moveTo(6, -4);
    ctx.bezierCurveTo(22, 24, 14, 52, -8, 82);
    ctx.lineTo(80, 82);
    ctx.lineTo(80, -4);
    ctx.closePath();
    ctx.fill();

    // 左侧暖阳受光岩棱
    ctx.fillStyle = 'rgba(255, 250, 232, 0.28)';
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(-66, 2);
    ctx.bezierCurveTo(-48, 20, -34, 38, -18, 62);
    ctx.bezierCurveTo(-26, 40, -34, 22, -40, 2);
    ctx.closePath();
    ctx.fill();

    // 水平柔和岩层刻痕
    ctx.strokeStyle = 'rgba(38, 54, 62, 0.22)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-58, 18); ctx.quadraticCurveTo(-12, 26, 56, 16);
    ctx.moveTo(-40, 40); ctx.quadraticCurveTo(0, 46, 38, 36);
    ctx.stroke();
    ctx.restore();

    traceCliff();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.stroke();

    // 4. 随风轻晃的垂挂青藤与花叶
    const vines = [
      { vx: -52, len: 34, ph: 0.4 },
      { vx: -24, len: 46, ph: 1.7 },
      { vx: 22, len: 40, ph: 2.9 },
      { vx: 52, len: 28, ph: 4.1 },
    ];
    for (const v of vines) {
      const sw = Math.sin(t * 2.1 + v.ph) * 6;
      ctx.strokeStyle = pal.vine;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(v.vx, 4);
      ctx.quadraticCurveTo(v.vx + sw * 0.5, 4 + v.len * 0.5, v.vx + sw, 4 + v.len);
      ctx.stroke();

      ctx.fillStyle = pal.grassLit;
      ctx.beginPath();
      ctx.ellipse(v.vx + sw * 0.5 - 3, 4 + v.len * 0.45, 4.2, 2.3, -0.4, 0, Math.PI * 2);
      ctx.ellipse(v.vx + sw * 0.85 + 3, 4 + v.len * 0.78, 3.8, 2.1, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. 柔和草坡顶台 + 垂落草皮边缘（有机波浪形，告别硬椭圆！）
    const grassGrad = ctx.createLinearGradient(0, -18, 0, 14);
    grassGrad.addColorStop(0, pal.grassLit);
    grassGrad.addColorStop(1, pal.grassDark);
    ctx.fillStyle = grassGrad;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(-76, -2);
    ctx.bezierCurveTo(-74, -18, -32, -22, 0, -20);
    ctx.bezierCurveTo(36, -22, 74, -17, 76, -2);
    ctx.bezierCurveTo(64, 10, 44, 6, 30, 11);
    ctx.bezierCurveTo(14, 15, -6, 9, -22, 12);
    ctx.bezierCurveTo(-44, 16, -64, 8, -76, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 6. 四座主题浮岛的精致手绘微缩建筑与奇观
    if (kind === 'lotus') {
      // 晨露荷塘：晶莹瀑布 + 水雾 + 拱形白铁玻璃温室 + 蓬松樱粉绿树
      const wfGrad = ctx.createLinearGradient(28, 2, 28, 92);
      wfGrad.addColorStop(0, 'rgba(136, 232, 250, 0.92)');
      wfGrad.addColorStop(0.68, 'rgba(214, 248, 255, 0.68)');
      wfGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = wfGrad;
      ctx.beginPath();
      ctx.moveTo(22, 2);
      ctx.quadraticCurveTo(32, 42, 26, 92);
      ctx.lineTo(40, 92);
      ctx.quadraticCurveTo(44, 42, 34, 2);
      ctx.closePath();
      ctx.fill();

      // 瀑布落水云雾
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.arc(32, 82 + Math.sin(t * 4) * 3, 11, 0, Math.PI * 2);
      ctx.arc(22, 86, 8, 0, Math.PI * 2);
      ctx.arc(42, 85, 8, 0, Math.PI * 2);
      ctx.fill();

      // 蓬松水彩树冠
      drawTreeCluster(ctx, -46, -18, 1.0, '#62b87a', '#8be09e', '#ff9eb5');

      // 温室玻璃花穹（带暖黄内光与精致白铁穹肋）
      ctx.fillStyle = '#e7f8fe';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(-28, -8);
      ctx.lineTo(-28, -22);
      ctx.bezierCurveTo(-28, -50, 22, -50, 22, -22);
      ctx.lineTo(22, -8);
      ctx.closePath();
      ctx.fill();

      const innerG = ctx.createRadialGradient(-3, -18, 2, -3, -20, 26);
      innerG.addColorStop(0, 'rgba(255, 236, 150, 0.65)');
      innerG.addColorStop(1, 'rgba(130, 224, 245, 0.15)');
      ctx.fillStyle = innerG;
      ctx.fill();
      ctx.stroke();

      // 玻璃穹肋与斜向高光
      ctx.strokeStyle = 'rgba(62, 118, 134, 0.45)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-3, -43); ctx.lineTo(-3, -8);
      ctx.moveTo(-16, -39); ctx.quadraticCurveTo(-18, -24, -18, -8);
      ctx.moveTo(10, -39); ctx.quadraticCurveTo(12, -24, 12, -8);
      ctx.moveTo(-27, -22); ctx.lineTo(21, -22);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.62)';
      ctx.beginPath();
      ctx.ellipse(-12, -31, 5.5, 9, -0.35, 0, Math.PI * 2);
      ctx.fill();

      // 荷塘水面微光
      ctx.fillStyle = 'rgba(116, 224, 244, 0.72)';
      ctx.beginPath();
      ctx.ellipse(34, -4, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'astro') {
      // 星象天文台：深蓝阶梯塔座 + 黄金星穹顶 + 望远镜筒 + 双倾星环
      ctx.fillStyle = '#2d4176';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.roundRect(-26, -26, 52, 20, 5);
      ctx.fill();
      ctx.stroke();

      // 暖金小拱窗
      [-12, 0, 12].forEach((wx) => {
        ctx.fillStyle = '#ffe278';
        ctx.beginPath();
        ctx.roundRect(wx - 2.6, -21, 5.2, 8.5, 2.5);
        ctx.fill();
      });

      // 天文台穹顶
      const domeG = ctx.createLinearGradient(-24, -54, 24, -22);
      domeG.addColorStop(0, '#5a78be');
      domeG.addColorStop(0.6, '#2f4580');
      domeG.addColorStop(1, '#1c2a54');
      ctx.fillStyle = domeG;
      ctx.beginPath();
      ctx.arc(0, -24, 25, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 伸出的黄铜观星望远镜筒
      ctx.save();
      ctx.translate(10, -40);
      ctx.rotate(-0.55);
      ctx.fillStyle = '#f2c452';
      ctx.beginPath();
      ctx.roundRect(0, -4, 22, 8, 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 双层公转黄金星环
      ctx.save();
      ctx.translate(0, -36);
      ctx.rotate(t * 0.9);
      ctx.strokeStyle = '#ffd859';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, 44, 12, 0.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fff5b8';
      ctx.beginPath();
      ctx.arc(43, 5, 3.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(-t * 1.65);
      ctx.strokeStyle = 'rgba(138, 232, 255, 0.85)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 36, 10, -0.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (kind === 'vine') {
      // 暮光古藤廊：古石拱桥 + 苍翠巨树 + 暖金灯笼 + 萤火虫
      ctx.fillStyle = '#7e998c';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(-42, -22, 84, 14, 4);
      ctx.fill();
      ctx.stroke();

      // 三连拱门洞
      ctx.fillStyle = '#2b4a44';
      [-24, 0, 24].forEach((ax) => {
        ctx.beginPath();
        ctx.arc(ax, -12, 7.5, Math.PI, 0);
        ctx.lineTo(ax + 7.5, -8);
        ctx.lineTo(ax - 7.5, -8);
        ctx.closePath();
        ctx.fill();
      });

      // 粗壮树干与三层翠绿水彩巨冠
      ctx.fillStyle = '#75563e';
      ctx.beginPath();
      ctx.moveTo(-10, -18);
      ctx.quadraticCurveTo(-8, -34, -4, -42);
      ctx.lineTo(8, -42);
      ctx.quadraticCurveTo(10, -32, 14, -18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      drawTreeCluster(ctx, 2, -46, 1.42, '#3d8760', '#70c286', '#ffcf66');
      drawTreeCluster(ctx, -36, -26, 0.86, '#367857', '#62b37a', '#c9a6f5');

      // 悬垂暖金萤火灯笼
      [-18, 22].forEach((lx, idx) => {
        const ly = -24 + Math.sin(t * 3.5 + idx * 2) * 3;
        const lg = ctx.createRadialGradient(lx, ly, 1, lx, ly, 13);
        lg.addColorStop(0, 'rgba(255, 224, 108, 0.9)');
        lg.addColorStop(1, 'rgba(255, 224, 108, 0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(lx, ly, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe57a';
        ctx.beginPath();
        ctx.arc(lx, ly, 3.2, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // 落日鎏金穹：皇家暖玉列柱殿堂 + 鎏金太阳花穹顶 + 彩旗与圣光
      const sunHalo = ctx.createRadialGradient(0, -34, 4, 0, -34, 64);
      sunHalo.addColorStop(0, 'rgba(255, 236, 146, 0.86)');
      sunHalo.addColorStop(0.5, 'rgba(255, 186, 128, 0.32)');
      sunHalo.addColorStop(1, 'rgba(255, 186, 128, 0)');
      ctx.fillStyle = sunHalo;
      ctx.beginPath();
      ctx.arc(0, -34, 64, 0, Math.PI * 2);
      ctx.fill();

      drawTreeCluster(ctx, -46, -18, 0.9, '#e08e88', '#ffb89e', '#ffe478');
      drawTreeCluster(ctx, 46, -18, 0.88, '#e08e88', '#ffb89e', '#ffe478');

      // 暖玉柱廊基座
      ctx.fillStyle = '#faeee0';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.roundRect(-34, -24, 68, 18, 4);
      ctx.fill();
      ctx.stroke();

      // 鎏金柱列
      ctx.strokeStyle = '#d99e32';
      ctx.lineWidth = 2.2;
      [-22, -11, 0, 11, 22].forEach((cx) => {
        ctx.beginPath();
        ctx.moveTo(cx, -23);
        ctx.lineTo(cx, -7);
        ctx.stroke();
      });

      // 大花穹鎏金玻璃穹顶
      const domeG = ctx.createLinearGradient(0, -60, 0, -20);
      domeG.addColorStop(0, '#fff7d4');
      domeG.addColorStop(0.55, '#ffd778');
      domeG.addColorStop(1, '#e89d72');
      ctx.fillStyle = domeG;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, -24, 30, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 太阳花冠金尖塔
      ctx.fillStyle = '#ffd84d';
      ctx.beginPath();
      ctx.arc(0, -58, 7.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 暖金小旗
      const pw = Math.sin(t * 8) * 3;
      ctx.fillStyle = '#e8685c';
      ctx.beginPath();
      ctx.moveTo(0, -65);
      ctx.lineTo(15, -62 + pw);
      ctx.lineTo(0, -58);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  function drawTreeCluster(ctx, x, y, sc, darkCol, litCol, bloomCol) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;

    ctx.fillStyle = darkCol;
    ctx.beginPath();
    ctx.arc(-9, 3, 11, 0, Math.PI * 2);
    ctx.arc(9, 4, 10, 0, Math.PI * 2);
    ctx.arc(0, -5, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = litCol;
    ctx.beginPath();
    ctx.arc(-5, -2, 8.5, 0, Math.PI * 2);
    ctx.arc(3, -8, 9, 0, Math.PI * 2);
    ctx.fill();

    if (bloomCol) {
      ctx.fillStyle = bloomCol;
      ctx.beginPath();
      ctx.arc(-7, -3, 2.6, 0, Math.PI * 2);
      ctx.arc(5, -7, 2.8, 0, Math.PI * 2);
      ctx.arc(8, 2, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHeroHotAirBalloon(ctx, x, y, sc, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.rotate(Math.sin(t * 2.4) * 0.045);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(-10, 24); ctx.lineTo(-12, 8);
    ctx.moveTo(10, 24); ctx.lineTo(12, 8);
    ctx.stroke();

    ctx.fillStyle = '#d9a96c';
    ctx.beginPath();
    ctx.roundRect(-14, 24, 28, 17, 5);
    ctx.fill();
    ctx.stroke();

    const fl = 6 + Math.sin(t * 24) * 2;
    const fg = ctx.createRadialGradient(0, 14, 1, 0, 14, fl * 2.3);
    fg.addColorStop(0, 'rgba(255, 248, 170, 0.95)');
    fg.addColorStop(0.55, 'rgba(255, 142, 62, 0.72)');
    fg.addColorStop(1, 'rgba(255, 142, 62, 0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(0, 14, fl * 2.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, -24);
    ctx.beginPath();
    ctx.moveTo(0, -36);
    ctx.bezierCurveTo(34, -36, 36, 2, 14, 28);
    ctx.lineTo(-14, 28);
    ctx.bezierCurveTo(-36, 2, -34, -36, 0, -36);
    ctx.closePath();
    ctx.fillStyle = '#fff9eb';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#e86f68';
    ctx.fillRect(-38, -40, 18, 76);
    ctx.fillRect(20, -40, 18, 76);
    ctx.fillStyle = '#56b8d4';
    ctx.beginPath();
    ctx.ellipse(0, -4, 13, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6cc58';
    ctx.fillRect(-36, -2, 72, 8);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-12, -16, 7, 15, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.3;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  function drawSubtitle(ctx, W, H, text, alpha) {
    if (!text || alpha <= 0.02) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    const isShort = H < 500;
    const y = H - (isShort ? 34 : 52);
    ctx.font = `700 ${isShort ? 13 : 16}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const tw = ctx.measureText(text).width;
    const padX = isShort ? 16 : 24;
    const boxW = Math.min(W - 24, tw + padX * 2);
    const boxH = isShort ? 30 : 38;

    ctx.fillStyle = 'rgba(252, 254, 248, 0.88)';
    ctx.strokeStyle = 'rgba(53, 94, 104, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(W / 2 - boxW / 2, y - boxH / 2, boxW, boxH, 999);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#24454d';
    ctx.fillText(text, W / 2, y + 0.5);
    ctx.restore();
  }

  // ==================== 10 秒四分镜总渲染入口 ====================
  function renderIntro(ctx, W, H) {
    if (!intro.active) return;
    const t = intro.t;

    const endFade = 1 - smoothstep(8.75, 10.0, t);
    if (endFade <= 0.005) return;

    ctx.save();
    ctx.globalAlpha = endFade;

    // 1. 晨星深蓝 → 晴昼水彩蓝 → 暖金微光天空渐变
    const dawnT = smoothstep(0.2, 2.5, t);
    const warmT = smoothstep(5.3, 8.3, t);
    const cTop = lerpColor(lerpColor('#132144', '#49aae2', dawnT), '#55b3e6', warmT);
    const cMid = lerpColor(lerpColor('#2c4478', '#99daf7', dawnT), '#b6e7fa', warmT);
    const cBot = lerpColor(lerpColor('#8c7b9e', '#eafbff', dawnT), '#fff5dc', warmT);

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, cTop);
    sky.addColorStop(0.55, cMid);
    sky.addColorStop(1, cBot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // 晨星渐隐
    const starA = 1 - smoothstep(0.55, 2.45, t);
    if (starA > 0.01) {
      for (const st of DAWN_STARS) {
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.5 + st.phase));
        ctx.fillStyle = st.gold ? `rgba(255, 236, 150, ${starA * tw})` : `rgba(226, 242, 255, ${starA * tw})`;
        ctx.beginPath();
        ctx.arc(st.nx * W, st.ny * H, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 朝阳晕光与柔和丁达尔日光束
    const sunA = smoothstep(0.65, 2.4, t);
    if (sunA > 0.01) {
      const sunX = W * 0.16;
      const sunY = H * 0.16;
      const sg = ctx.createRadialGradient(sunX, sunY, 16, sunX, sunY, Math.max(W, H) * 0.68);
      sg.addColorStop(0, `rgba(255, 250, 212, ${0.78 * sunA})`);
      sg.addColorStop(0.36, `rgba(255, 236, 176, ${0.28 * sunA})`);
      sg.addColorStop(1, 'rgba(255, 236, 176, 0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalAlpha = 0.11 * sunA;
      ctx.fillStyle = '#fff9d6';
      for (let r = 0; r < 4; r++) {
        const rx = W * (0.04 + r * 0.16 + Math.sin(t * 0.3 + r) * 0.015);
        ctx.beginPath();
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx + W * 0.09, 0);
        ctx.lineTo(rx + W * 0.27, H);
        ctx.lineTo(rx + W * 0.13, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // 远景云海地平线 + 飞鸟
    drawCloudSeaHorizon(ctx, W, H, t, dawnT);
    drawSkyBirds(ctx, W, H, t, smoothstep(1.2, 2.6, t) * (1 - smoothstep(7.4, 8.6, t)));

    // 远景体积云
    const cloudPal = {
      shade: lerpColor('#7a92be', '#badff2', dawnT),
      mid: lerpColor('#a8bce0', '#e3f5fd', dawnT),
      top: lerpColor('#dce6f7', '#fffef8', dawnT),
    };
    drawPainterlyCloud(ctx, ((0.18 + t * 0.012) % 1.25 - 0.12) * W, H * 0.24, Math.min(1.05, W / 1080), 0.62, cloudPal);
    drawPainterlyCloud(ctx, ((0.76 + t * 0.016) % 1.25 - 0.12) * W, H * 0.20, Math.min(0.95, W / 1150), 0.56, cloudPal);

    // ==================== 分镜 1 (0.0s ~ 2.9s)：云海破晓，双幕体积云缓缓舒展 ====================
    const s1Open = smoothstep(0.18, 2.55, t);
    const s1Exit = 1 - smoothstep(2.25, 3.05, t);
    if (s1Exit > 0.01) {
      const spread = s1Open * W * 0.45;
      const baseSc = Math.max(1.15, W / 740);
      drawPainterlyCloud(ctx, W * 0.34 - spread, H * 0.46, baseSc * 1.48, 0.94 * s1Exit, cloudPal);
      drawPainterlyCloud(ctx, W * 0.66 + spread, H * 0.50, baseSc * 1.54, 0.94 * s1Exit, cloudPal);
      drawPainterlyCloud(ctx, W * 0.5, H * 0.66 + s1Open * H * 0.26, baseSc * 1.62, 0.88 * s1Exit, cloudPal);
    }

    // ==================== 分镜 2 (2.1s ~ 5.8s)：飞艇巡览四座手绘水彩奇观浮岛 ====================
    const s2In = smoothstep(2.1, 2.95, t);
    const s2Out = 1 - smoothstep(5.05, 5.8, t);
    const s2Alpha = s2In * s2Out;
    if (s2Alpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = s2Alpha;
      const u2 = clamp01((t - 2.1) / 3.6);
      // 柔和电影感推镜微缩放
      const camSc = lerp(0.96, 1.04, u2);
      ctx.translate(W / 2, H / 2);
      ctx.scale(camSc, camSc);
      ctx.translate(-W / 2, -H / 2);

      const isleSc = Math.max(0.66, Math.min(1.06, Math.min(W / 1140, H / 620)));

      // 按远近景深排列四座主题浮岛
      const isles = [
        { kind: 'astro', x: W * (0.43 - u2 * 0.05), y: H * 0.40, s: isleSc * 0.82 },
        { kind: 'sunset', x: W * (0.83 - u2 * 0.07), y: H * 0.44, s: isleSc * 0.98 },
        { kind: 'lotus', x: W * (0.19 - u2 * 0.04), y: H * 0.58, s: isleSc * 0.96 },
        { kind: 'vine', x: W * (0.62 - u2 * 0.06), y: H * 0.62, s: isleSc * 0.92 },
      ];
      for (const is of isles) {
        drawArtisticThemeIsle(ctx, is.x, is.y, is.s, is.kind, t);
      }

      // 飞艇母港乘风破云航行
      const shipX = lerp(W * 0.07, W * 0.72, smoothstep(2.15, 5.65, t));
      const shipY = H * 0.31 + Math.sin(t * 2.2) * 9;
      const shipSc = Math.max(0.76, Math.min(1.16, W / 1040));
      drawCurioAirship(ctx, shipX, shipY, shipSc, t);

      ctx.restore();
    }

    // ==================== 分镜 3 (5.1s ~ 8.45s)：热气球降临花园露台 + 星露弹弓弯道秀 ====================
    const s3In = smoothstep(5.1, 5.8, t);
    const s3Out = 1 - smoothstep(7.75, 8.45, t);
    const s3Alpha = s3In * s3Out;
    if (s3Alpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = s3Alpha;

      const u3 = clamp01((t - 5.1) / 3.3);
      const stageSc = Math.max(0.72, Math.min(1.14, Math.min(W / 960, H / 560))) * lerp(0.95, 1.05, u3);
      const deckX = W * 0.5;
      const deckY = H * 0.63;

      ctx.save();
      ctx.translate(deckX, deckY);
      ctx.scale(stageSc, stageSc);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // 有机浮岛露台悬崖底座（平滑贝塞尔曲崖 + 瀑布水雾 + 摇曳青藤）
      const traceBalconyCliff = () => {
        ctx.beginPath();
        ctx.moveTo(-228, 12);
        ctx.bezierCurveTo(-216, 48, -162, 68, -112, 84);
        ctx.bezierCurveTo(-56, 102, -16, 118, 22, 112);
        ctx.bezierCurveTo(68, 104, 118, 86, 166, 66);
        ctx.bezierCurveTo(206, 48, 226, 30, 228, 12);
        ctx.closePath();
      };
      const cliffG = ctx.createLinearGradient(-180, 10, 140, 116);
      cliffG.addColorStop(0, '#dfc09b');
      cliffG.addColorStop(0.55, '#be9672');
      cliffG.addColorStop(1, '#7a6c74');
      traceBalconyCliff();
      ctx.fillStyle = cliffG;
      ctx.fill();

      ctx.save();
      traceBalconyCliff();
      ctx.clip();
      ctx.fillStyle = 'rgba(66, 78, 92, 0.34)';
      ctx.beginPath();
      ctx.moveTo(20, 10);
      ctx.bezierCurveTo(42, 48, 30, 86, -4, 120);
      ctx.lineTo(240, 120);
      ctx.lineTo(240, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      traceBalconyCliff();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // 露台右侧倾泻而下的晶莹小瀑布 + 水雾
      const bwG = ctx.createLinearGradient(148, 18, 148, 126);
      bwG.addColorStop(0, 'rgba(130, 228, 248, 0.92)');
      bwG.addColorStop(0.7, 'rgba(218, 249, 255, 0.66)');
      bwG.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = bwG;
      ctx.beginPath();
      ctx.moveTo(140, 18);
      ctx.quadraticCurveTo(152, 68, 144, 126);
      ctx.lineTo(162, 126);
      ctx.quadraticCurveTo(168, 68, 156, 18);
      ctx.closePath();
      ctx.fill();

      // 垂藤绿叶
      [-180, -110, -34, 62, 188].forEach((vx, idx) => {
        const sw = Math.sin(t * 2.2 + idx * 1.4) * 6;
        const len = 34 + (idx % 3) * 14;
        ctx.strokeStyle = '#4e9c68';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(vx, 18);
        ctx.quadraticCurveTo(vx + sw * 0.5, 18 + len * 0.5, vx + sw, 18 + len);
        ctx.stroke();
      });

      // 露台后景蓬松花丛与白石花柱灯
      drawTreeCluster(ctx, -184, -34, 1.05, '#52a36e', '#82d696', '#ff9eb5');
      drawTreeCluster(ctx, 186, -30, 0.98, '#52a36e', '#82d696', '#ffe073');

      // 暖白石灰石花园地板露台（带厚重侧边与石砖纹）
      ctx.fillStyle = '#c4d2c0';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.roundRect(-230, -8, 460, 28, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f2ede0';
      ctx.beginPath();
      ctx.roundRect(-232, -24, 464, 30, 14);
      ctx.fill();
      ctx.stroke();

      // 石砖竖缝细节
      ctx.strokeStyle = 'rgba(104, 126, 118, 0.24)';
      ctx.lineWidth = 1.2;
      for (let sx = -180; sx <= 180; sx += 60) {
        ctx.beginPath();
        ctx.moveTo(sx, -22);
        ctx.lineTo(sx, 4);
        ctx.stroke();
      }

      // 嵌入式冰镜露水滑道（带浅石砌外框与斜光）
      ctx.fillStyle = 'rgba(104, 134, 128, 0.18)';
      ctx.beginPath();
      ctx.roundRect(-130, -14, 248, 22, 11);
      ctx.fill();
      ctx.fillStyle = 'rgba(176, 238, 252, 0.8)';
      ctx.strokeStyle = 'rgba(56, 174, 206, 0.65)';
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.roundRect(-126, -12, 240, 18, 9);
      ctx.fill();
      ctx.stroke();

      // 精致浮空黄铜星轨仪（双倾星环 + 发光蓝星核 + 引力虚线环）
      const orrX = 96;
      const orrY = -26;
      const fieldG = ctx.createRadialGradient(orrX, orrY, 6, orrX, orrY, 74);
      fieldG.addColorStop(0, 'rgba(78, 204, 238, 0.34)');
      fieldG.addColorStop(1, 'rgba(78, 204, 238, 0)');
      ctx.fillStyle = fieldG;
      ctx.beginPath();
      ctx.arc(orrX, orrY, 74, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(orrX, orrY);
      ctx.rotate(t * 0.4);
      ctx.strokeStyle = 'rgba(42, 162, 204, 0.55)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 68, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 星轨仪底座与悬空浑天仪环
      ctx.fillStyle = '#dce6d8';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(orrX, -6, 15, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(orrX, orrY - 6 + Math.sin(t * 3.5) * 3);
      ctx.rotate(t * 1.4);
      ctx.strokeStyle = '#d9a438';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 7, 0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.rotate(-t * 2.5);
      ctx.strokeStyle = '#f5cf66';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 6, -0.7, 0, Math.PI * 2);
      ctx.stroke();

      const orbG = ctx.createRadialGradient(-3, -3, 1.5, 0, 0, 10);
      orbG.addColorStop(0, '#e6fcff');
      orbG.addColorStop(0.55, '#4ac8e8');
      orbG.addColorStop(1, '#246b94');
      ctx.fillStyle = orbG;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 热气球轻盈降落于左侧
      const landT = smoothstep(5.15, 6.42, t);
      const bX = lerp(-182, -142, landT);
      const bY = lerp(-215, -56, landT);
      drawHeroHotAirBalloon(ctx, bX, bY, 0.88, t);

      // 主角蹦跳落地、蓄力并发射星轨弹弓弯道光弹！
      const heroIn = smoothstep(5.95, 6.45, t);
      const firePhase = clamp01((t - 6.75) / 0.98);
      const chargingNow = t >= 6.32 && t < 6.75;
      const chargeRatio = clamp01((t - 6.32) / 0.42);
      const heroX = lerp(-128, -80, heroIn);
      const heroHop = Math.sin(heroIn * Math.PI) * 28;

      if (CB.drawPlayer && CB.drawPlayer.drawMochiPlayer && heroIn > 0.02) {
        const dummyHero = {
          x: heroX,
          y: -3,
          vx: heroIn < 1 ? 95 : 0,
          vy: 0,
          facing: 1,
          aimAngle: -0.22,
          invulnTimer: 0,
          inPollen: false,
          onDewSlide: false,
          squash: heroIn < 1 ? 0.16 : (firePhase > 0 && firePhase < 0.2 ? -0.24 : 0),
          tilt: 0.05,
          dashTimer: 0,
          hopHeight: heroHop,
          walkPhase: t * 9.5,
          keyAngle: t * 3.8,
          lagX: -3,
          lagY: 0,
          lootCount: 6,
          expr: firePhase > 0.14 ? 'happy' : (chargingNow ? 'dash' : 'normal'),
          isBlinking: false,
          charging: chargingNow,
          chargeTime: chargingNow ? chargeRatio * 0.64 : 0,
          chargeRatio: chargingNow ? chargeRatio : 0,
          effectiveTapThreshold: 0.18,
          effectiveMaxCharge: 0.64,
          recoil: firePhase > 0 && firePhase < 0.25 ? (1 - firePhase / 0.25) * 1.15 : 0,
          scarfNodes: [
            { x: heroX - 6, y: -14 - heroHop },
            { x: heroX - 14, y: -13 - heroHop + Math.sin(t * 9) * 2 },
            { x: heroX - 22, y: -11 - heroHop + Math.cos(t * 8) * 3 },
            { x: heroX - 30, y: -10 - heroHop + Math.sin(t * 7) * 3 },
          ],
        };
        CB.drawPlayer.drawMochiPlayer(ctx, dummyHero, t, game.variant || 'explorer', 0, 0);
      }

      // 发射前实时曲线预判虚线（呼应游戏核心预判卖点！）
      const getArcPt = (u) => {
        const p0x = heroX + 24, p0y = -18;
        const p1x = 76, p1y = -98;
        const p2x = 186, p2y = -68;
        const p3x = 152, p3y = 6;
        const m = 1 - u;
        return {
          x: m * m * m * p0x + 3 * m * m * u * p1x + 3 * m * u * u * p2x + u * u * u * p3x,
          y: m * m * m * p0y + 3 * m * m * u * p1y + 3 * m * u * u * p2y + u * u * u * p3y,
        };
      };

      if (chargingNow) {
        ctx.save();
        ctx.strokeStyle = 'rgba(42, 186, 224, 0.78)';
        ctx.lineWidth = 2.4;
        ctx.setLineDash([7, 5]);
        ctx.lineDashOffset = -(t * 58);
        ctx.beginPath();
        for (let k = 0; k <= 24; k++) {
          const pt = getArcPt(k / 24);
          if (k === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
        ctx.restore();
      }

      if (firePhase > 0) {
        const steps = 28;
        const maxIdx = Math.max(1, Math.floor(firePhase * steps));
        ctx.strokeStyle = 'rgba(84, 226, 255, 0.45)';
        ctx.lineWidth = 8.5;
        ctx.beginPath();
        for (let k = 0; k <= maxIdx; k++) {
          const pt = getArcPt(k / steps);
          if (k === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        ctx.strokeStyle = '#ffe259';
        ctx.lineWidth = 3.4;
        ctx.stroke();

        const head = getArcPt(firePhase);
        const hg = ctx.createRadialGradient(head.x, head.y, 2, head.x, head.y, 20);
        hg.addColorStop(0, 'rgba(255, 246, 168, 0.95)');
        hg.addColorStop(1, 'rgba(84, 226, 255, 0)');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff8c4';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 7.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (firePhase > 0.78) {
          const bp = (firePhase - 0.78) / 0.22;
          ctx.strokeStyle = `rgba(255, 214, 72, ${1 - bp})`;
          ctx.lineWidth = 3.6;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 12 + bp * 48, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.restore();
      ctx.restore();
    }

    // ==================== 分镜 4 (7.7s ~ 10.0s)：云幕舒展 + 植物花环金辉标题绽放 ====================
    const s4In = smoothstep(7.7, 8.5, t);
    if (s4In > 0.01) {
      const part = smoothstep(8.45, 9.85, t);
      const sc = Math.max(1.05, W / 800);
      drawPainterlyCloud(ctx, W * 0.26 - part * W * 0.38, H * 0.42, sc * 1.4, 0.86 * s4In * (1 - part * 0.72), cloudPal);
      drawPainterlyCloud(ctx, W * 0.74 + part * W * 0.38, H * 0.56, sc * 1.45, 0.86 * s4In * (1 - part * 0.72), cloudPal);

      const emblemA = s4In * (1 - smoothstep(9.05, 9.85, t));
      if (emblemA > 0.01) {
        ctx.save();
        ctx.globalAlpha = emblemA;
        const scale = 0.92 + s4In * 0.08;
        ctx.translate(W / 2, H * 0.44);
        ctx.scale(scale, scale);

        const glow = ctx.createRadialGradient(0, 0, 12, 0, 0, 195);
        glow.addColorStop(0, 'rgba(255, 248, 212, 0.9)');
        glow.addColorStop(1, 'rgba(255, 248, 212, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 195, 0, Math.PI * 2);
        ctx.fill();

        // 精致金色植物环框
        ctx.strokeStyle = 'rgba(218, 162, 54, 0.65)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.ellipse(0, 6, 168, 56, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 ${Math.max(30, Math.min(54, Math.round(W * 0.048)))}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.strokeStyle = 'rgba(255, 253, 246, 0.96)';
        ctx.lineWidth = 8;
        ctx.strokeText('云海空中花房', 0, -6);
        ctx.fillStyle = '#22444d';
        ctx.fillText('云海空中花房', 0, -6);

        ctx.font = `800 ${Math.max(12, Math.min(16, Math.round(W * 0.016)))}px system-ui, sans-serif`;
        ctx.fillStyle = '#3c7a88';
        ctx.fillText('C U R I O   B O X', 0, 32);
        ctx.restore();
      }
    }

    // 前景飘飞花瓣与柔和日光花粉粒
    for (const m of MOTES) {
      const mx = ((m.nx + t * m.spd * 0.7) % 1) * W;
      const my = ((m.ny - t * m.spd + 2) % 1) * H;
      const ma = 0.25 + 0.34 * Math.sin(t * 2.8 + m.phase);
      ctx.fillStyle = m.color;
      ctx.globalAlpha = ma * endFade;
      ctx.beginPath();
      ctx.arc(mx, my, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = endFade;

    for (const pt of PETALS) {
      const px = ((pt.nx + t * pt.spdX) % 1.15 - 0.08) * W;
      const py = ((pt.ny + t * pt.spdY + Math.sin(t * 2 + pt.rot) * 0.02) % 1.15 - 0.08) * H;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(pt.rot + t * 1.8);
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = 0.76 * endFade;
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.2, 2.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 极轻手绘水彩纸颗粒叠层，增强绘本统一质感
    const paperPat = getPaperOverlay(ctx);
    if (paperPat) {
      ctx.fillStyle = paperPat;
      ctx.fillRect(0, 0, W, H);
    }

    // 电影感上下宽银幕暗幕边条（末尾柔和推开）
    const barMax = H < 500 ? 18 : 34;
    const barH = barMax * (1 - smoothstep(8.4, 9.6, t));
    if (barH > 0.5) {
      ctx.fillStyle = 'rgba(24, 48, 64, 0.78)';
      ctx.fillRect(0, 0, W, barH);
      ctx.fillRect(0, H - barH, W, barH);
    }

    // 3 段诗意水彩字幕
    if (t < 2.65) {
      const a = smoothstep(0.25, 0.75, t) * (1 - smoothstep(2.2, 2.65, t));
      drawSubtitle(ctx, W, H, '在万丈云海之上，悬浮着失落的空中花房……', a);
    } else if (t < 5.5) {
      const a = smoothstep(2.75, 3.25, t) * (1 - smoothstep(5.0, 5.5, t));
      drawSubtitle(ctx, W, H, '四座秘境浮岛随风流转，藏着古老的物理奇物与太阳金库。', a);
    } else if (t < 8.2) {
      const a = smoothstep(5.6, 6.1, t) * (1 - smoothstep(7.7, 8.2, t));
      drawSubtitle(ctx, W, H, '一发蓄力星露弹，借滑道、星轨与云海崖口，破阵夺宝、乘风撤离！', a);
    }

    ctx.restore();
  }

  CB.intro = {
    DURATION,
    startIntro,
    skipIntro,
    isIntroActive,
    getProgress,
    updateIntro,
    renderIntro,
  };
})();
