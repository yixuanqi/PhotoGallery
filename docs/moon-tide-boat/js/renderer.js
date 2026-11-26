window.MT = window.MT || {};

window.MT.Renderer = (function () {
  var canvas = null;
  var ctx = null;
  var dpr = 1;
  var W = 1280;
  var H = 720;

  var camX = 0;
  var camY = 0;
  var camZoom = 1.0;

  var moonCanvas = null;
  var beamSprite = null;
  var paperPattern = null;
  var fogCanvas = null;
  var fogCtx = null;
  var fogScale = 0.5;
  var cloudSprites = [];
  var stars = [];
  var backClouds = [];
  var frontClouds = [];

  function lerp(a, b, t) { return a + (b - a) * t; }

  function lerpColor(c1, c2, t) {
    return [
      lerp(c1[0], c2[0], t),
      lerp(c1[1], c2[1], t),
      lerp(c1[2], c2[2], t)
    ];
  }

  function rgb(c, a) {
    var r = Math.round(c[0]);
    var g = Math.round(c[1]);
    var b = Math.round(c[2]);
    return typeof a === 'number'
      ? 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'
      : 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function buildPaperPattern() {
    var c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    var g = c.getContext('2d');
    var img = g.createImageData(256, 256);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = 215 + Math.floor((Math.random() - 0.5) * 60);
      img.data[i] = v;
      img.data[i + 1] = v - 4;
      img.data[i + 2] = v - 10;
      img.data[i + 3] = Math.floor(Math.random() * 13);
    }
    g.putImageData(img, 0, 0);
    paperPattern = ctx.createPattern(c, 'repeat');
  }

  // 无缝离屏水彩流云贴图（彻底消除圆圈叠痕）
  function buildCloudSprites() {
    cloudSprites = [];
    var presets = [
      [{ x: 0.24, y: 0.62, rx: 0.19, ry: 0.22 }, { x: 0.42, y: 0.48, rx: 0.22, ry: 0.30 }, { x: 0.62, y: 0.53, rx: 0.20, ry: 0.26 }, { x: 0.78, y: 0.64, rx: 0.16, ry: 0.19 }],
      [{ x: 0.20, y: 0.64, rx: 0.17, ry: 0.18 }, { x: 0.38, y: 0.55, rx: 0.24, ry: 0.24 }, { x: 0.58, y: 0.46, rx: 0.23, ry: 0.31 }, { x: 0.76, y: 0.60, rx: 0.18, ry: 0.21 }],
      [{ x: 0.22, y: 0.62, rx: 0.18, ry: 0.16 }, { x: 0.45, y: 0.56, rx: 0.28, ry: 0.22 }, { x: 0.70, y: 0.60, rx: 0.22, ry: 0.18 }],
      [{ x: 0.28, y: 0.58, rx: 0.22, ry: 0.24 }, { x: 0.50, y: 0.45, rx: 0.24, ry: 0.32 }, { x: 0.72, y: 0.58, rx: 0.20, ry: 0.22 }],
      [{ x: 0.18, y: 0.66, rx: 0.15, ry: 0.15 }, { x: 0.36, y: 0.56, rx: 0.21, ry: 0.24 }, { x: 0.54, y: 0.58, rx: 0.22, ry: 0.22 }, { x: 0.74, y: 0.52, rx: 0.18, ry: 0.24 }, { x: 0.85, y: 0.65, rx: 0.12, ry: 0.14 }]
    ];

    presets.forEach(function (puffs) {
      var cw = 360;
      var ch = 140;
      var raw = document.createElement('canvas');
      raw.width = cw;
      raw.height = ch;
      var rg = raw.getContext('2d');

      rg.fillStyle = '#e8d7d2';
      rg.beginPath();
      puffs.forEach(function (pf) {
        rg.moveTo(pf.x * cw + pf.rx * cw, pf.y * ch);
        rg.ellipse(pf.x * cw, pf.y * ch, pf.rx * cw, pf.ry * ch, 0, 0, Math.PI * 2);
      });
      rg.rect(cw * 0.2, ch * 0.58, cw * 0.6, ch * 0.21);
      rg.fill();

      rg.globalCompositeOperation = 'source-atop';
      var bodyGrad = rg.createLinearGradient(0, ch * 0.18, 0, ch * 0.84);
      bodyGrad.addColorStop(0, '#c2bed9');
      bodyGrad.addColorStop(0.58, '#e3cbca');
      bodyGrad.addColorStop(1, '#ffdfb8');
      rg.fillStyle = bodyGrad;
      rg.fillRect(0, 0, cw, ch);

      var rimGlow = rg.createRadialGradient(cw * 0.56, ch * 0.78, cw * 0.04, cw * 0.56, ch * 0.78, cw * 0.42);
      rimGlow.addColorStop(0, 'rgba(255, 236, 198, 0.55)');
      rimGlow.addColorStop(1, 'rgba(255, 236, 198, 0)');
      rg.fillStyle = rimGlow;
      rg.fillRect(0, 0, cw, ch);

      var finalC = document.createElement('canvas');
      finalC.width = cw;
      finalC.height = ch;
      var fg = finalC.getContext('2d');
      if (typeof fg.filter === 'string') {
        fg.filter = 'blur(4.5px)';
      }
      fg.drawImage(raw, 0, 0);
      if (typeof fg.filter === 'string') {
        fg.filter = 'none';
      }
      fg.globalAlpha = 0.55;
      fg.drawImage(raw, 0, 0);
      cloudSprites.push(finalC);
    });
  }

  function buildMoonSprite() {
    var size = 512;
    var c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    var g = c.getContext('2d');
    var cx = size / 2;
    var cy = size / 2;
    var r = size * 0.44;

    g.save();
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.clip();

    var grad = g.createRadialGradient(cx - r * 0.25, cy - r * 0.28, r * 0.08, cx, cy, r);
    grad.addColorStop(0, '#fffaf0');
    grad.addColorStop(0.58, '#f6e4c0');
    grad.addColorStop(1, '#c9ab88');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);

    var washes = [
      { x: -0.25, y: -0.15, rx: 0.34, ry: 0.24, a: 0.14 },
      { x: 0.18, y: -0.22, rx: 0.26, ry: 0.2, a: 0.12 },
      { x: 0.22, y: 0.18, rx: 0.33, ry: 0.25, a: 0.16 },
      { x: -0.12, y: 0.28, rx: 0.24, ry: 0.18, a: 0.11 },
      { x: -0.34, y: 0.15, rx: 0.2, ry: 0.18, a: 0.13 }
    ];
    washes.forEach(function (w) {
      var mx = cx + w.x * r;
      var my = cy + w.y * r;
      var mr = Math.max(w.rx, w.ry) * r;
      var mg = g.createRadialGradient(mx, my, mr * 0.12, mx, my, mr);
      mg.addColorStop(0, 'rgba(128, 102, 86, ' + w.a + ')');
      mg.addColorStop(1, 'rgba(128, 102, 86, 0)');
      g.fillStyle = mg;
      g.beginPath();
      g.ellipse(mx, my, w.rx * r, w.ry * r, 0.35, 0, Math.PI * 2);
      g.fill();
    });

    for (var i = 0; i < 20; i++) {
      var ang = (i * 2.39996) % (Math.PI * 2);
      var dist = Math.sqrt((i + 1) / 22) * r * 0.78;
      var cr = (0.025 + (i % 4) * 0.015) * r;
      g.beginPath();
      g.arc(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, cr, 0, Math.PI * 2);
      g.strokeStyle = 'rgba(136, 108, 86, 0.14)';
      g.lineWidth = 1.6;
      g.stroke();
    }

    var rim = g.createRadialGradient(cx, cy, r * 0.8, cx, cy, r);
    rim.addColorStop(0, 'rgba(255,255,255,0)');
    rim.addColorStop(0.92, 'rgba(255, 248, 232, 0.36)');
    rim.addColorStop(1, 'rgba(204, 174, 134, 0.28)');
    g.fillStyle = rim;
    g.fillRect(0, 0, size, size);
    g.restore();

    moonCanvas = c;
  }

  // Phase 1 · 预烘焙离屏高斯羽化探雾光束贴图（彻底消除硬边三角形切痕，柔如水彩晕染）
  function buildBeamSprite() {
    var cw = 512;
    var ch = 320;
    var raw = document.createElement('canvas');
    raw.width = cw;
    raw.height = ch;
    var rg = raw.getContext('2d');
    var cy = ch * 0.5;
    var ox = 36;

    // 7 组沿光轴逐级展宽的柔光椭圆叠染，天然形成无硬角的扩散光晕
    var steps = [
      { t: 0.08, rx: 46,  ry: 24, a: 0.52 },
      { t: 0.20, rx: 78,  ry: 42, a: 0.42 },
      { t: 0.34, rx: 112, ry: 62, a: 0.34 },
      { t: 0.50, rx: 144, ry: 82, a: 0.26 },
      { t: 0.66, rx: 168, ry: 102, a: 0.18 },
      { t: 0.80, rx: 176, ry: 118, a: 0.11 },
      { t: 0.90, rx: 162, ry: 124, a: 0.06 }
    ];
    steps.forEach(function (st) {
      var cx = ox + st.t * (cw - ox - 48);
      rg.save();
      rg.translate(cx, cy);
      rg.scale(1, st.ry / st.rx);
      var grad = rg.createRadialGradient(0, 0, st.rx * 0.05, 0, 0, st.rx);
      grad.addColorStop(0, 'rgba(255, 232, 168, ' + st.a + ')');
      grad.addColorStop(0.55, 'rgba(255, 198, 118, ' + (st.a * 0.45) + ')');
      grad.addColorStop(1, 'rgba(255, 174, 92, 0)');
      rg.fillStyle = grad;
      rg.beginPath();
      rg.arc(0, 0, st.rx, 0, Math.PI * 2);
      rg.fill();
      rg.restore();
    });

    // 远端与上下外廓再罩一层纯柔和渐隐遮罩（即便旧版 WebView 不支持 blur 也绝对无硬边）
    var finalC = document.createElement('canvas');
    finalC.width = cw;
    finalC.height = ch;
    var fg = finalC.getContext('2d');
    if (typeof fg.filter === 'string') {
      fg.filter = 'blur(16px)';
    }
    fg.drawImage(raw, 0, 0);
    if (typeof fg.filter === 'string') {
      fg.filter = 'none';
    }
    fg.globalCompositeOperation = 'destination-in';
    var mask = fg.createRadialGradient(ox + 150, cy, 32, ox + 190, cy, 265);
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(0.65, 'rgba(0,0,0,0.72)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    fg.fillStyle = mask;
    fg.fillRect(0, 0, cw, ch);

    beamSprite = finalC;
  }

  function seedSkyDecor() {
    stars = [];
    for (var i = 0; i < 115; i++) {
      stars.push({
        nx: Math.random(),
        ny: Math.random() * 0.64,
        r: 0.6 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
        speed: 0.7 + Math.random() * 1.6
      });
    }

    backClouds = [];
    frontClouds = [];
    for (var c = 0; c < 6; c++) {
      backClouds.push({
        x: (c / 6) * 1.4 - 0.2 + Math.random() * 0.12,
        y: 0.14 + Math.random() * 0.28,
        scale: 0.75 + Math.random() * 0.65,
        speed: 0.0035 + Math.random() * 0.0035,
        alpha: 0.24 + Math.random() * 0.14,
        variant: c % 5
      });
    }
    for (var f = 0; f < 4; f++) {
      frontClouds.push({
        x: (f / 4) * 1.4 - 0.15 + Math.random() * 0.15,
        y: 0.24 + Math.random() * 0.22,
        scale: 0.65 + Math.random() * 0.55,
        speed: 0.007 + Math.random() * 0.006,
        alpha: 0.30 + Math.random() * 0.16,
        variant: (f + 2) % 5
      });
    }
  }

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    buildPaperPattern();
    buildCloudSprites();
    buildMoonSprite();
    buildBeamSprite();
    seedSkyDecor();
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!fogCanvas) {
      fogCanvas = document.createElement('canvas');
      fogCtx = fogCanvas.getContext('2d');
    }
    fogCanvas.width = Math.max(2, Math.ceil(W * fogScale));
    fogCanvas.height = Math.max(2, Math.ceil(H * fogScale));
  }

  function worldToScreen(wx, wy) {
    var seaAnchorY = getSeaAnchorY();
    return {
      x: (wx - camX) * camZoom + W * 0.5,
      y: (wy - camY) * camZoom + seaAnchorY
    };
  }

  function getSeaAnchorY() {
    return H * 0.63;
  }

  function screenToWorld(sx, sy) {
    var seaAnchorY = getSeaAnchorY();
    return {
      x: (sx - W * 0.5) / camZoom + camX,
      y: (sy - seaAnchorY) / camZoom + camY
    };
  }

  function drawCloudLayer(list, t, skyH, parallax, yShift) {
    if (cloudSprites.length === 0) return;
    ctx.save();
    list.forEach(function (cl) {
      var sp = cloudSprites[cl.variant];
      var xNorm = (((cl.x + t * cl.speed - camX * parallax) % 1.45) + 1.45) % 1.45 - 0.22;
      var dw = sp.width * cl.scale;
      var dh = sp.height * cl.scale;
      var cx = xNorm * W - dw * 0.5;
      var cy = cl.y * skyH - dh * 0.5 + yShift;
      ctx.globalAlpha = cl.alpha;
      ctx.drawImage(sp, cx, cy, dw, dh);
    });
    ctx.restore();
  }

  function render(dt, endingMode) {
    var world = window.MT.World;
    var boat = window.MT.Boat.getState();
    var t = world.getTime();
    var tide = world.getTide();
    var seaAnchorY = getSeaAnchorY();

    // 平滑紧跟 + 高空缩放视野
    var alt = Math.max(0, -boat.y);
    var targetZoom = 1.0 - Math.min(1, alt / 680) * 0.34;
    camZoom += (targetZoom - camZoom) * Math.min(1, dt * 3.4);

    var targetCamX = boat.x + boat.facing * Math.min(110, W * 0.08);
    var desiredCamY = Math.min(0, boat.y * 0.65);
    var maxAllowedCamY = boat.y + (seaAnchorY - H * 0.28) / camZoom;
    var targetCamY = Math.min(desiredCamY, maxAllowedCamY);

    camX += (targetCamX - camX) * Math.min(1, dt * 4.2);
    camY += (targetCamY - camY) * Math.min(1, dt * 4.5);

    // 根据当前镜头位置平滑采样四海域色板与海雾
    var zb = world.getZoneBlend(camX);
    var pal = zb.palette;

    var seaScreenY = seaAnchorY - camY * camZoom;
    var skyHorizonY = Math.max(H * 0.45, Math.min(H + 120, seaScreenY + 20));

    // 1. 海域自适应暮光水彩天空
    var skyGrad = ctx.createLinearGradient(0, 0, 0, skyHorizonY);
    skyGrad.addColorStop(0, rgb(pal.skyTop));
    skyGrad.addColorStop(0.58, rgb(pal.skyMid));
    skyGrad.addColorStop(1, rgb(pal.skyHorizon));
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. 柔光星点
    var starBoost = (1 + Math.min(0.45, alt / 520)) * (1 - zb.fogDensity * 0.45);
    stars.forEach(function (st) {
      var tw = 0.4 + 0.6 * Math.sin(t * st.speed + st.phase);
      ctx.fillStyle = 'rgba(255, 248, 232, ' + Math.min(0.95, tw * 0.62 * starBoost) + ')';
      ctx.beginPath();
      ctx.arc(st.nx * W, st.ny * skyHorizonY, st.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. 后景无缝水彩流云
    var cloudParallaxY = -camY * 0.16;
    drawCloudLayer(backClouds, t, seaAnchorY, 0.00004, cloudParallaxY * 0.6);

    // 4. 暖象牙金巨型月球（越往东驶入深海，月球越近越大；终章演出时泛起共鸣月晕）
    var baseUnit = Math.min(W, H);
    var moonProgress = Math.max(tide, zb.moonBias * 0.85);
    var endingBoost = endingMode ? 0.08 : 0;
    var moonR = baseUnit * (0.10 + moonProgress * 0.24 + endingBoost) * (1 + Math.min(0.14, alt / 1600));
    var ringPhase = (world.wrapX(camX) / world.getWorldLength()) * Math.PI * 2;
    var moonX = W * 0.60 + Math.sin(ringPhase) * W * 0.09;
    var moonY = seaAnchorY * (0.44 - moonProgress * 0.06) - camY * 0.12;

    var symPulse = endingMode === 'symphony' ? (0.06 * Math.sin(t * 2.2)) : 0;
    var halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.7, moonX, moonY, moonR * (endingMode ? 4.0 : 3.4));
    halo.addColorStop(0, 'rgba(255, 238, 198, ' + (0.28 + moonProgress * 0.14 + (endingMode ? 0.14 : 0) + symPulse) + ')');
    halo.addColorStop(0.45, 'rgba(235, 186, 152, ' + (0.12 + moonProgress * 0.06 + (endingMode ? 0.08 : 0)) + ')');
    halo.addColorStop(1, 'rgba(235, 186, 152, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, skyHorizonY + 80);

    if (endingMode === 'symphony') {
      ctx.save();
      for (var mr = 0; mr < 3; mr++) {
        var rp = ((t * 0.28 + mr * 0.33) % 1);
        ctx.strokeStyle = 'rgba(204, 246, 224, ' + ((1 - rp) * 0.28) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR * (1.08 + rp * 0.95), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    var moonDrawSize = moonR / 0.44;
    ctx.drawImage(moonCanvas, moonX - moonDrawSize / 2, moonY - moonDrawSize / 2, moonDrawSize, moonDrawSize);

    // 5. 前景无缝水彩流云
    drawCloudLayer(frontClouds, t, seaAnchorY, 0.00008, cloudParallaxY);

    // === 进入统一世界缩放坐标系 ===
    var halfWWorld = (W * 0.5) / camZoom + 60;
    var viewLeft = camX - halfWWorld;
    var viewRight = camX + halfWWorld;
    var viewTop = camY - seaAnchorY / camZoom - 60;
    var viewBottom = camY + (H - seaAnchorY) / camZoom + 80;
    var moonWorldX = (moonX - W * 0.5) / camZoom + camX;

    ctx.save();
    ctx.translate(W * 0.5, seaAnchorY);
    ctx.scale(camZoom, camZoom);
    ctx.translate(-camX, -camY);

    // 6. 四海域专属雾化远景地标（按真实地理分布）
    drawZoneLandmarks(world, pal, t, tide, viewLeft, viewRight);

    // 7. 东端潮汐光柱
    drawTidePillar(world, t, viewTop, viewLeft, viewRight);

    // 8. 天降人类残骸火光（含第三海域火箭坠海预警光束）
    drawSkyMeteors(world, boat, t, viewTop);

    // 9. 远海背景波浪层
    drawWaveLayer(-14, t * 0.75, 0.26, 10 * zb.waveMult, pal.farSea, 0.72, false, viewLeft, viewRight, viewBottom);

    // 10. 主海面 + 半透明水下世界
    drawMainSeaAndUnderwater(world, boat, pal, t, moonWorldX, viewLeft, viewRight, viewBottom);

    // 10b. 四大海域可交互古迹、全环海互动地形、钟摆气球锚点、月风加速环与高空遗物
    drawLandmarkPuzzles(world, boat, t, viewLeft, viewRight, viewTop);
    drawRocketHulksSurface(world, boat, t, viewLeft, viewRight);
    drawThermalPlumes(world, boat, t, viewLeft, viewRight);
    drawShockwaves(world, boat, t, viewLeft, viewRight);
    drawGravityStreams(world, boat, t, viewLeft, viewRight);
    drawCloudIslands(world, boat, t, viewLeft, viewRight);
    drawGrappleBuoys(world, t, viewLeft, viewRight);
    drawWindRings(world, t, viewLeft, viewRight);
    drawAirborneRelics(world, t, viewLeft, viewRight);
    drawSkyLanterns(world, t, viewLeft, viewRight);

    // 11. 铁钩与绳索
    drawHook(boat, t);

    // 12. 尾流漂流灯
    drawWakeLanterns(world, boat, t, viewLeft, viewRight);

    // 13. 孤舟本体与实体拼装挂件
    drawBoat(boat, t, endingMode);

    // 14. 前景半透明浪花层
    drawWaveLayer(18, t * 1.25 + 2.1, 1.0, 15 * zb.waveMult, pal.frontSea, 0.58, true, viewLeft, viewRight, viewBottom);

    // 15. 粒子（放在雾层之前，让深水光点与声波同受浓雾景深包裹）
    drawParticles(world);

    ctx.restore();

    // 16. 海域浓雾遮蔽与船头灯火驱雾光束（离屏 destination-out 软驱雾）
    if (zb.fogDensity > 0.08) {
      drawDenseFogOverlay(world, zb, boat, t, seaScreenY);
    }

    // 16b. 主动声波回声定位光环（可穿透浓雾显现未点亮古迹与重物方向）
    drawEchoPingsScreen(world, t);

    // 17. 水彩画纸肌理叠层
    if (paperPattern) {
      ctx.fillStyle = paperPattern;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawZoneLandmarks(world, pal, t, tide, viewLeft, viewRight) {
    var list = world.getLandmarks();
    var fogColor = lerpColor(pal.skyHorizon, pal.farSea, 0.50);
    ctx.save();
    ctx.fillStyle = rgb(fogColor, 0.56);
    ctx.strokeStyle = rgb(fogColor, 0.58);

    list.forEach(function (lm) {
      var projX = world.projectNear(lm.x, camX);
      var wx = projX + (camX - projX) * 0.22;
      if (wx < viewLeft - 280 || wx > viewRight + 280) return;
      var by = -6;
      var sc = lm.scale;

      if (lm.type === 'cottage') {
        // 半沉水边旧木屋（暖黄小窗）
        ctx.fillRect(wx - 22 * sc, by - 26 * sc, 44 * sc, 30 * sc);
        ctx.beginPath();
        ctx.moveTo(wx - 28 * sc, by - 25 * sc);
        ctx.lineTo(wx, by - 44 * sc);
        ctx.lineTo(wx + 28 * sc, by - 25 * sc);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 224, 156, 0.65)';
        ctx.fillRect(wx - 5 * sc, by - 18 * sc, 9 * sc, 8 * sc);
        ctx.fillStyle = rgb(fogColor, 0.56);
      } else if (lm.type === 'pier') {
        // 残破木码头木桩
        for (var p = -2; p <= 2; p++) {
          ctx.fillRect(wx + p * 18 * sc, by - (14 + (p % 2) * 5) * sc, 4.5 * sc, 20 * sc);
        }
        ctx.fillRect(wx - 40 * sc, by - 13 * sc, 78 * sc, 4 * sc);
      } else if (lm.type === 'lighthouse') {
        ctx.beginPath();
        ctx.moveTo(wx - 12 * sc, by);
        ctx.lineTo(wx - 7 * sc, by - 60 * sc);
        ctx.lineTo(wx + 7 * sc, by - 60 * sc);
        ctx.lineTo(wx + 12 * sc, by);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(wx, by - 64 * sc, 9 * sc, Math.PI, 0);
        ctx.fill();
        var pulse = 0.45 + 0.55 * Math.sin(t * 1.8 + lm.seed);
        ctx.fillStyle = 'rgba(255, 224, 162, ' + (0.62 * pulse) + ')';
        ctx.beginPath();
        ctx.arc(wx, by - 61 * sc, 3.4 * sc, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb(fogColor, 0.56);
      } else if (lm.type === 'seastack') {
        // 雾锁暗礁海高耸海蚀岩柱
        ctx.beginPath();
        ctx.moveTo(wx - 28 * sc, by + 6);
        ctx.lineTo(wx - 15 * sc, by - 82 * sc);
        ctx.lineTo(wx + 4 * sc, by - 96 * sc);
        ctx.lineTo(wx + 24 * sc, by - 46 * sc);
        ctx.lineTo(wx + 32 * sc, by + 6);
        ctx.closePath();
        ctx.fill();
      } else if (lm.type === 'arch') {
        for (var a = -1; a <= 1; a++) {
          var ax = wx + a * 44 * sc;
          ctx.beginPath();
          ctx.arc(ax, by + 6, 18 * sc, Math.PI, 0);
          ctx.lineTo(ax + 24 * sc, by + 6);
          ctx.lineTo(ax + 24 * sc, by - 28 * sc);
          ctx.lineTo(ax - 24 * sc, by - 28 * sc);
          ctx.lineTo(ax - 24 * sc, by + 6);
          ctx.closePath();
          ctx.fill();
        }
      } else if (lm.type === 'seawall') {
        // 半没入海的旧混凝土防波堤
        ctx.fillRect(wx - 55 * sc, by - 18 * sc, 110 * sc, 24 * sc);
        ctx.fillRect(wx - 22 * sc, by - 32 * sc, 18 * sc, 16 * sc);
      } else if (lm.type === 'gantry') {
        // 倾斜的人类推月发射塔架
        ctx.save();
        ctx.translate(wx, by + 4);
        ctx.rotate(0.14);
        ctx.lineWidth = 3 * sc;
        ctx.strokeRect(-14 * sc, -98 * sc, 28 * sc, 98 * sc);
        ctx.beginPath();
        ctx.moveTo(-14 * sc, -98 * sc); ctx.lineTo(14 * sc, -50 * sc);
        ctx.moveTo(14 * sc, -98 * sc); ctx.lineTo(-14 * sc, -50 * sc);
        ctx.moveTo(-14 * sc, -50 * sc); ctx.lineTo(14 * sc, 0);
        ctx.moveTo(14 * sc, -50 * sc); ctx.lineTo(-14 * sc, 0);
        ctx.stroke();
        ctx.restore();
      } else if (lm.type === 'rocket_hulk') {
        // 斜插在海面上的巨型失败火箭壳体
        ctx.save();
        ctx.translate(wx, by + 10);
        ctx.rotate(-0.34);
        ctx.beginPath();
        ctx.moveTo(-13 * sc, 0);
        ctx.lineTo(-12 * sc, -76 * sc);
        ctx.quadraticCurveTo(0, -104 * sc, 12 * sc, -76 * sc);
        ctx.lineTo(13 * sc, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (lm.type === 'broken_bridge') {
        // 断裂的高架海桥远景
        ctx.fillRect(wx - 68 * sc, by - 46 * sc, 10 * sc, 54 * sc);
        ctx.fillRect(wx + 24 * sc, by - 42 * sc, 10 * sc, 50 * sc);
        ctx.beginPath();
        ctx.moveTo(wx - 82 * sc, by - 46 * sc);
        ctx.lineTo(wx + 48 * sc, by - 42 * sc);
        ctx.lineTo(wx + 40 * sc, by - 34 * sc);
        ctx.lineTo(wx - 82 * sc, by - 38 * sc);
        ctx.closePath();
        ctx.fill();
      } else if (lm.type === 'float_island') {
        // 浮空云海区的漂浮石岛
        var iy = by - (78 + (lm.seed % 45)) * sc + Math.sin(t * 0.9 + lm.seed) * 7;
        ctx.beginPath();
        ctx.ellipse(wx, iy, 44 * sc, 12 * sc, 0, Math.PI, 0);
        ctx.lineTo(wx + 18 * sc, iy + 26 * sc);
        ctx.lineTo(wx - 6 * sc, iy + 36 * sc);
        ctx.lineTo(wx - 28 * sc, iy + 18 * sc);
        ctx.closePath();
        ctx.fill();
      } else if (lm.type === 'observatory_float') {
        // 悬空旧天文台圆顶岛
        var oy = by - 96 * sc + Math.cos(t * 0.8 + lm.seed) * 6;
        ctx.beginPath();
        ctx.ellipse(wx, oy, 38 * sc, 11 * sc, 0, Math.PI, 0);
        ctx.lineTo(wx + 12 * sc, oy + 24 * sc);
        ctx.lineTo(wx - 16 * sc, oy + 22 * sc);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(wx - 16 * sc, oy - 18 * sc, 32 * sc, 18 * sc);
        ctx.beginPath();
        ctx.arc(wx, oy - 18 * sc, 14 * sc, Math.PI, 0);
        ctx.fill();
      } else if (lm.type === 'sky_balloon') {
        // 远空漂浮的巨型人类反光气球群
        var by2 = by - 130 * sc + Math.sin(t * 1.1 + lm.seed) * 8;
        ctx.beginPath();
        ctx.ellipse(wx, by2, 18 * sc, 22 * sc, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(wx, by2 + 22 * sc);
        ctx.lineTo(wx + Math.sin(t + lm.seed) * 6, by2 + 64 * sc);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  // Step 3A · 离屏浓雾遮蔽层 + 船头灯火/漂流灯/声波/水母柔化驱雾 + 暖金探雾光锥
  function drawDenseFogOverlay(world, zb, boat, t, seaScreenY) {
    if (!fogCanvas || !fogCtx) return;
    var mr = window.MT.Config.MIST_REEFS;
    var lv = boat.parts.lantern || 0;
    var fogAmt = Math.min(1, (zb.fogDensity - 0.08) / 0.48);
    if (fogAmt <= 0.01) return;

    var fctx = fogCtx;
    fctx.save();
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
    fctx.setTransform(fogScale, 0, 0, fogScale, 0, 0);

    var fc = zb.palette.fogColor;
    var deepMist = [
      Math.round(fc[0] * 0.24),
      Math.round(fc[1] * 0.34),
      Math.round(fc[2] * 0.44)
    ];
    var topY = Math.max(0, seaScreenY - H * 0.48);
    var fogGrad = fctx.createLinearGradient(0, topY, 0, H);
    fogGrad.addColorStop(0, rgb(fc, 0.04 * fogAmt));
    fogGrad.addColorStop(0.32, rgb(fc, 0.56 * fogAmt));
    fogGrad.addColorStop(0.55, rgb(fc, 0.78 * fogAmt));
    fogGrad.addColorStop(0.76, rgb(lerpColor(fc, deepMist, 0.65), 0.72 * fogAmt));
    fogGrad.addColorStop(1, rgb(deepMist, 0.68 * fogAmt));
    fctx.fillStyle = fogGrad;
    fctx.fillRect(0, 0, W, H);

    if (cloudSprites.length > 0) {
      for (var i = 0; i < 5; i++) {
        var sp = cloudSprites[i % cloudSprites.length];
        var drift = (((i * 0.27 + t * (0.008 + i * 0.002) - camX * 0.00024) % 1.45) + 1.45) % 1.45 - 0.22;
        var dw = sp.width * (1.25 + (i % 2) * 0.45);
        var dh = sp.height * (0.95 + (i % 3) * 0.22);
        var mx = drift * W - dw * 0.5;
        var my = seaScreenY - 76 + (i % 3) * 44 + Math.sin(t * 0.55 + i * 1.4) * 8;
        fctx.globalAlpha = 0.24 * fogAmt;
        fctx.drawImage(sp, mx, my, dw, dh);
      }
      fctx.globalAlpha = 1;
    }

    fctx.globalCompositeOperation = 'destination-out';

    var cosA = Math.cos(boat.angle);
    var sinA = Math.sin(boat.angle);
    var lampWX = boat.x + cosA * boat.facing * 46 - sinA * (-12);
    var lampWY = boat.y + sinA * boat.facing * 46 + cosA * (-12);
    var lampS = worldToScreen(lampWX, lampWY);
    var boatS = worldToScreen(boat.x, boat.y - 6);
    var flicker = 0.96 + 0.04 * Math.sin(t * 6.5);

    var hullR = (96 + lv * 34) * camZoom * flicker;
    var hullCut = fctx.createRadialGradient(boatS.x, boatS.y, hullR * 0.14, boatS.x, boatS.y, hullR);
    hullCut.addColorStop(0, 'rgba(0,0,0,0.94)');
    hullCut.addColorStop(0.58, 'rgba(0,0,0,0.68)');
    hullCut.addColorStop(1, 'rgba(0,0,0,0)');
    fctx.fillStyle = hullCut;
    fctx.beginPath();
    fctx.arc(boatS.x, boatS.y, hullR, 0, Math.PI * 2);
    fctx.fill();

    var coreR = (mr.FOG_BASE_RADIUS + lv * mr.FOG_RADIUS_PER_LV) * camZoom * flicker;
    var coreCut = fctx.createRadialGradient(lampS.x, lampS.y + 8 * camZoom, coreR * 0.12, lampS.x, lampS.y + 8 * camZoom, coreR);
    coreCut.addColorStop(0, 'rgba(0,0,0,0.97)');
    coreCut.addColorStop(0.52, 'rgba(0,0,0,0.76)');
    coreCut.addColorStop(0.82, 'rgba(0,0,0,0.28)');
    coreCut.addColorStop(1, 'rgba(0,0,0,0)');
    fctx.fillStyle = coreCut;
    fctx.beginPath();
    fctx.arc(lampS.x, lampS.y + 8 * camZoom, coreR, 0, Math.PI * 2);
    fctx.fill();

    // 多段重叠柔光径向圆驱雾（彻底告别生硬椭圆形切口）
    var beamReach = (mr.FOG_BEAM_BASE + lv * mr.FOG_BEAM_PER_LV) * camZoom;
    var beamNodes = [
      { f: 0.24, r: 0.42, y: 18, a: 0.84 },
      { f: 0.52, r: 0.56, y: 36, a: 0.66 },
      { f: 0.82, r: 0.68, y: 54, a: 0.46 },
      { f: 1.08, r: 0.72, y: 66, a: 0.24 }
    ];
    for (var bn = 0; bn < beamNodes.length; bn++) {
      var node = beamNodes[bn];
      var nx = lampS.x + boat.facing * beamReach * node.f;
      var ny = lampS.y + (node.y + lv * 8) * camZoom;
      var nr = beamReach * node.r;
      var nCut = fctx.createRadialGradient(nx, ny, nr * 0.08, nx, ny, nr);
      nCut.addColorStop(0, 'rgba(0,0,0,' + Math.min(0.95, node.a + lv * 0.05) + ')');
      nCut.addColorStop(0.55, 'rgba(0,0,0,' + (node.a * 0.45) + ')');
      nCut.addColorStop(1, 'rgba(0,0,0,0)');
      fctx.fillStyle = nCut;
      fctx.beginPath();
      fctx.arc(nx, ny, nr, 0, Math.PI * 2);
      fctx.fill();
    }

    var wakes = world.getWakeLanterns();
    for (var w = 0; w < wakes.length; w++) {
      var wl = wakes[w];
      var wlx = world.projectNear(wl.x, camX);
      var wy = world.getWaveHeight(wl.x, t, lv) - 3;
      var ws = worldToScreen(wlx, wy);
      if (ws.x < -120 || ws.x > W + 120) continue;
      var wa = Math.min(1, wl.life / 3);
      var wr = mr.WAKE_CLEAR_RADIUS * camZoom;
      var wCut = fctx.createRadialGradient(ws.x, ws.y, 4, ws.x, ws.y, wr);
      wCut.addColorStop(0, 'rgba(0,0,0,' + (0.82 * wa) + ')');
      wCut.addColorStop(1, 'rgba(0,0,0,0)');
      fctx.fillStyle = wCut;
      fctx.beginPath();
      fctx.arc(ws.x, ws.y, wr, 0, Math.PI * 2);
      fctx.fill();
    }

    if (boat.boosting) {
      var sternS = worldToScreen(boat.x - boat.facing * 42, boat.y - 6);
      var sr = (95 + boat.parts.thruster * 24) * camZoom;
      var sCut = fctx.createRadialGradient(sternS.x, sternS.y, 6, sternS.x, sternS.y, sr);
      sCut.addColorStop(0, 'rgba(0,0,0,0.75)');
      sCut.addColorStop(1, 'rgba(0,0,0,0)');
      fctx.fillStyle = sCut;
      fctx.beginPath();
      fctx.arc(sternS.x, sternS.y, sr, 0, Math.PI * 2);
      fctx.fill();
    }

    // 点亮浅湾灯塔后，巨鲸的荧光体也具备驱散深海雾气的效果
    var whaleFog = world.getMoonWhale();
    if (whaleFog && whaleFog.active) {
      var wfx = world.projectNear(whaleFog.x, camX);
      var wfs = worldToScreen(wfx, whaleFog.y);
      if (wfs.x > -240 && wfs.x < W + 240) {
        var wfr = 165 * camZoom;
        var wfCut = fctx.createRadialGradient(wfs.x, wfs.y, 12, wfs.x, wfs.y, wfr);
        wfCut.addColorStop(0, 'rgba(0,0,0,0.72)');
        wfCut.addColorStop(1, 'rgba(0,0,0,0)');
        fctx.fillStyle = wfCut;
        fctx.beginPath();
        fctx.arc(wfs.x, wfs.y, wfr, 0, Math.PI * 2);
        fctx.fill();
      }
    }

    var jellies = world.getJellyfish();
    for (var ji = 0; ji < jellies.length; ji++) {
      var jf = jellies[ji];
      if (!jf.lifting) continue;
      var jfx = world.projectNear(jf.x, camX);
      var js = worldToScreen(jfx, jf.depth);
      if (js.x < -100 || js.x > W + 100) continue;
      var jr = 64 * camZoom;
      var jCut = fctx.createRadialGradient(js.x, js.y, 4, js.x, js.y, jr);
      jCut.addColorStop(0, 'rgba(0,0,0,0.58)');
      jCut.addColorStop(1, 'rgba(0,0,0,0)');
      fctx.fillStyle = jCut;
      fctx.beginPath();
      fctx.arc(js.x, js.y, jr, 0, Math.PI * 2);
      fctx.fill();
    }

    var pts = world.getParticles();
    for (var pi = 0; pi < pts.length; pi++) {
      var pt = pts[pi];
      if (pt.kind !== 'ring') continue;
      var ps = worldToScreen(pt.x, pt.y);
      var pa = Math.max(0, pt.life / pt.maxLife) * 0.45;
      var prR = pt.size * camZoom;
      fctx.strokeStyle = 'rgba(0,0,0,' + pa + ')';
      fctx.lineWidth = 26 * camZoom;
      fctx.beginPath();
      fctx.arc(ps.x, ps.y, prR, 0, Math.PI * 2);
      fctx.stroke();
    }

    fctx.restore();

    ctx.save();
    ctx.drawImage(fogCanvas, 0, 0, W, H);

    // 使用预烘焙的高斯羽化水彩光束贴图，边缘自然“洇”入海雾，零几何切边
    if (beamSprite) {
      ctx.globalCompositeOperation = 'screen';
      var drawLen = (235 + lv * 105) * camZoom * flicker;
      var drawH = (165 + lv * 56) * camZoom * flicker;
      ctx.save();
      ctx.translate(lampS.x, lampS.y);
      ctx.scale(boat.facing, 1);
      ctx.rotate(0.18 + Math.sin(t * 1.4) * 0.025 + boat.angle * boat.facing * 0.45);
      ctx.globalAlpha = Math.min(0.85, (0.50 + lv * 0.12) * fogAmt);
      ctx.drawImage(beamSprite, -drawLen * 0.07, -drawH * 0.5, drawLen, drawH);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawTidePillar(world, t, viewTop, viewLeft, viewRight) {
    var p = world.getPillar();
    if (!p.active) return;
    var px = world.projectNear(p.x, camX);
    if (px < viewLeft - 360 || px > viewRight + 360) return;

    var awake = !!p.awakened;
    ctx.save();
    var w = (awake ? 132 : 92) + Math.sin(t * 1.8) * 12;
    var grad = ctx.createLinearGradient(px - w, 0, px + w, 0);
    if (awake) {
      grad.addColorStop(0, 'rgba(255, 240, 200, 0)');
      grad.addColorStop(0.35, 'rgba(210, 232, 255, 0.18)');
      grad.addColorStop(0.5, 'rgba(255, 244, 212, 0.40)');
      grad.addColorStop(0.65, 'rgba(210, 232, 255, 0.18)');
      grad.addColorStop(1, 'rgba(255, 240, 200, 0)');
    } else {
      grad.addColorStop(0, 'rgba(170, 204, 238, 0)');
      grad.addColorStop(0.5, 'rgba(178, 212, 245, 0.16)');
      grad.addColorStop(1, 'rgba(170, 204, 238, 0)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(px - w, viewTop, w * 2, 36 - viewTop);

    var baseGlow = ctx.createRadialGradient(px, 4, 8, px, 4, awake ? 150 : 105);
    baseGlow.addColorStop(0, awake ? 'rgba(255, 246, 216, 0.52)' : 'rgba(182, 216, 248, 0.24)');
    baseGlow.addColorStop(0.5, awake ? 'rgba(196, 226, 255, 0.20)' : 'rgba(156, 190, 230, 0.10)');
    baseGlow.addColorStop(1, 'rgba(196, 226, 255, 0)');
    ctx.fillStyle = baseGlow;
    ctx.beginPath();
    ctx.ellipse(px, 6, awake ? 150 : 105, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = awake ? 'rgba(255, 246, 224, 0.52)' : 'rgba(186, 216, 248, 0.24)';
    ctx.lineWidth = awake ? 1.8 : 1.2;
    for (var i = -2; i <= 2; i++) {
      var lx = px + i * 22 + Math.sin(t * 1.8 + i) * 7;
      ctx.beginPath();
      ctx.moveTo(lx, 12);
      ctx.lineTo(lx + Math.sin(t + i) * 16, viewTop);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSkyMeteors(world, boat, t, viewTop) {
    var list = world.getSkyMeteors();
    ctx.save();
    list.forEach(function (m) {
      var mx = world.projectNear(m.x, camX);
      var shiftX = mx - m.x;
      var mtX = m.targetX + shiftX;
      if (m.isRocketStage) {
        var surfY = world.getWaveHeight(m.targetX, t, boat.parts.lantern);
        var prog = Math.max(0, Math.min(1, (m.age || 0) / (m.leadTime || 2.4)));
        var pulse = 0.6 + 0.4 * Math.sin(t * 11);
        var bw = 38 * (1 - prog * 0.45);
        var warnGrad = ctx.createLinearGradient(0, viewTop, 0, surfY + 12);
        warnGrad.addColorStop(0, 'rgba(255, 168, 122, 0)');
        warnGrad.addColorStop(0.65, 'rgba(255, 168, 122, ' + (0.09 + prog * 0.14) + ')');
        warnGrad.addColorStop(1, 'rgba(255, 206, 148, ' + ((0.22 + prog * 0.25) * pulse) + ')');
        ctx.fillStyle = warnGrad;
        ctx.fillRect(mtX - bw, viewTop, bw * 2, (surfY + 12) - viewTop);

        ctx.strokeStyle = 'rgba(255, 198, 138, ' + ((0.35 + prog * 0.5) * pulse) + ')';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(mtX, surfY + 2, 16 + (1 - prog) * 34, 5 + (1 - prog) * 7, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (m.trail.length < 2) return;
      for (var i = 1; i < m.trail.length; i++) {
        var p0 = m.trail[i - 1];
        var p1 = m.trail[i];
        var a = i / m.trail.length;
        if (m.isRocketStage) {
          ctx.strokeStyle = 'rgba(218, 152, 136, ' + (a * 0.35) + ')';
          ctx.lineWidth = a * 11;
          ctx.beginPath();
          ctx.moveTo(p0.x + shiftX, p0.y);
          ctx.lineTo(p1.x + shiftX, p1.y);
          ctx.stroke();
        }
        ctx.strokeStyle = m.isRocketStage
          ? 'rgba(255, 178, 118, ' + (a * 0.88) + ')'
          : 'rgba(255, 214, 152, ' + (a * 0.78) + ')';
        ctx.lineWidth = a * (m.isRocketStage ? 5.2 : 3.5);
        ctx.beginPath();
        ctx.moveTo(p0.x + shiftX, p0.y);
        ctx.lineTo(p1.x + shiftX, p1.y);
        ctx.stroke();
      }

      if (m.isRocketStage) {
        var ang = Math.atan2(m.vy, m.vx);
        ctx.save();
        ctx.translate(mx, m.y);
        ctx.rotate(ang);
        var glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
        glow.addColorStop(0, 'rgba(255, 244, 214, 0.92)');
        glow.addColorStop(0.5, 'rgba(255, 148, 92, 0.45)');
        glow.addColorStop(1, 'rgba(255, 120, 70, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e8d8c4';
        ctx.strokeStyle = '#584452';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(-12, -4.5, 20, 9, 3);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = '#fff5dc';
        ctx.beginPath();
        ctx.arc(mx, m.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  // Step 3B · 半沉火箭残骸海面跳台与喷口渲染
  function drawRocketHulksSurface(world, boat, t, viewLeft, viewRight) {
    var list = world.getRocketHulks();
    if (!list || list.length === 0) return;
    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var h = list[i];
      var hx = world.projectNear(h.x, camX);
      if (hx < viewLeft - 240 || hx > viewRight + 240) continue;
      var surfY = world.getWaveHeight(h.x, t, boat.parts.lantern);

      if (h.kind === 'ramp') {
        var halfL = h.length * 0.5;
        var x0 = hx - halfL;
        var x1 = hx + halfL;
        var y0 = 24;
        var y1 = -h.height;
        var tilt = Math.atan2(y1 - y0, x1 - x0);
        var span = Math.hypot(x1 - x0, y1 - y0);

        ctx.save();
        ctx.translate(x0, y0);
        ctx.rotate(tilt);

        var bodyGrad = ctx.createLinearGradient(0, -4, 0, 34);
        bodyGrad.addColorStop(0, '#ead9c4');
        bodyGrad.addColorStop(0.28, '#c9ab94');
        bodyGrad.addColorStop(0.65, '#6d5564');
        bodyGrad.addColorStop(1, '#392c3e');
        ctx.fillStyle = bodyGrad;
        ctx.strokeStyle = 'rgba(255, 234, 204, 0.55)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-8, 28);
        ctx.lineTo(0, 0);
        ctx.lineTo(span - 14, -2);
        ctx.quadraticCurveTo(span + 8, 8, span - 4, 24);
        ctx.lineTo(-8, 34);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(222, 114, 88, 0.72)';
        ctx.fillRect(span * 0.58, 1, 18, 24);
        ctx.fillStyle = 'rgba(42, 34, 52, 0.45)';
        ctx.fillRect(span * 0.24, 2, 10, 26);

        var blink = 0.5 + 0.5 * Math.sin(t * 3.4 + h.id);
        var tipGlow = ctx.createRadialGradient(span - 4, -2, 1, span - 4, -2, 24);
        tipGlow.addColorStop(0, 'rgba(255, 214, 134, ' + (0.72 * blink) + ')');
        tipGlow.addColorStop(1, 'rgba(255, 168, 92, 0)');
        ctx.fillStyle = tipGlow;
        ctx.beginPath();
        ctx.arc(span - 4, -2, 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffe9ba';
        ctx.beginPath();
        ctx.arc(span - 4, -2, 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 232, 186, ' + (0.28 + 0.22 * blink) + ')';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(16, -4);
        ctx.lineTo(span - 12, -6);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        ctx.strokeStyle = 'rgba(255, 240, 216, 0.42)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0 - 10, surfY + 2);
        ctx.quadraticCurveTo(x0 + 26, surfY - 5, x0 + 60, surfY + 3);
        ctx.stroke();
      } else if (h.kind === 'vent') {
        var glowAmt = 0.22 + h.plumeStrength * 0.78;
        var bellY = surfY + 8;
        ctx.fillStyle = '#4c3d52';
        ctx.strokeStyle = 'rgba(232, 192, 152, 0.52)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(hx - 36, bellY + 24);
        ctx.lineTo(hx - 24, bellY - 6);
        ctx.lineTo(hx + 24, bellY - 6);
        ctx.lineTo(hx + 36, bellY + 24);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        var mouthGlow = ctx.createRadialGradient(hx, bellY - 4, 2, hx, bellY - 4, 42);
        mouthGlow.addColorStop(0, 'rgba(255, 232, 174, ' + (0.68 * glowAmt) + ')');
        mouthGlow.addColorStop(0.45, 'rgba(138, 214, 255, ' + (0.34 * glowAmt) + ')');
        mouthGlow.addColorStop(1, 'rgba(138, 214, 255, 0)');
        ctx.fillStyle = mouthGlow;
        ctx.beginPath();
        ctx.arc(hx, bellY - 4, 42, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Step 3B · 上升热流蒸汽柱水彩视觉渲染
  function drawThermalPlumes(world, boat, t, viewLeft, viewRight) {
    var sources = [];
    var hulks = world.getRocketHulks();
    for (var i = 0; i < hulks.length; i++) {
      var h = hulks[i];
      if (h.kind === 'vent' && h.plumeStrength > 0.04) {
        sources.push({ x: h.x, radius: h.radius, height: h.height, strength: h.plumeStrength, seed: h.id * 2.1 });
      }
    }
    var temps = world.getThermalPlumes();
    for (var j = 0; j < temps.length; j++) {
      var tp = temps[j];
      var s = Math.min(1, tp.life / 2.2) * Math.min(1, (tp.maxLife - tp.life) / 0.5 + 0.25);
      if (s > 0.04) {
        sources.push({ x: tp.x, radius: tp.radius, height: tp.height, strength: s, seed: tp.x * 0.01 });
      }
    }
    if (sources.length === 0) return;

    ctx.save();
    for (var k = 0; k < sources.length; k++) {
      var p = sources[k];
      var px = world.projectNear(p.x, camX);
      if (px < viewLeft - 140 || px > viewRight + 140) continue;
      var surfY = world.getWaveHeight(p.x, t, boat.parts.lantern);
      var colTop = surfY - p.height * (0.45 + 0.55 * p.strength);

      var colGrad = ctx.createLinearGradient(px, surfY + 8, px, colTop);
      colGrad.addColorStop(0, 'rgba(255, 226, 178, ' + (0.28 * p.strength) + ')');
      colGrad.addColorStop(0.45, 'rgba(220, 236, 250, ' + (0.20 * p.strength) + ')');
      colGrad.addColorStop(1, 'rgba(220, 236, 250, 0)');
      ctx.fillStyle = colGrad;
      ctx.beginPath();
      ctx.moveTo(px - p.radius * 0.52, surfY + 6);
      ctx.quadraticCurveTo(px - p.radius * 0.92, (surfY + colTop) * 0.5, px - p.radius * 0.72, colTop);
      ctx.lineTo(px + p.radius * 0.72, colTop);
      ctx.quadraticCurveTo(px + p.radius * 0.92, (surfY + colTop) * 0.5, px + p.radius * 0.52, surfY + 6);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 242, 214, ' + (0.34 * p.strength) + ')';
      ctx.lineWidth = 1.6;
      for (var r = -1; r <= 1; r++) {
        var rx = px + r * p.radius * 0.34;
        var shift = ((t * 110 + r * 42 + p.seed * 20) % Math.max(40, p.height * 0.85));
        var segY = surfY - shift;
        if (segY < colTop + 14) continue;
        ctx.beginPath();
        ctx.moveTo(rx + Math.sin(t * 3 + r) * 5, segY + 18);
        ctx.quadraticCurveTo(rx - Math.sin(t * 3 + r) * 6, segY, rx + Math.cos(t * 2.5 + r) * 5, segY - 22);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Step 3B · 坠海激波海面光环
  function drawShockwaves(world, boat, t, viewLeft, viewRight) {
    var list = world.getShockwaves();
    if (!list || list.length === 0) return;
    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var sw = list[i];
      var swx = world.projectNear(sw.x, camX);
      if (swx + sw.maxRadius < viewLeft || swx - sw.maxRadius > viewRight) continue;
      var decay = Math.max(0, 1 - sw.radius / sw.maxRadius);
      var leftX = swx - sw.radius;
      var rightX = swx + sw.radius;
      var ly = world.getWaveHeight(leftX, t, boat.parts.lantern);
      var ry = world.getWaveHeight(rightX, t, boat.parts.lantern);

      ctx.strokeStyle = 'rgba(255, 236, 198, ' + (0.65 * decay) + ')';
      ctx.lineWidth = 2.6 * decay + 0.8;
      ctx.beginPath();
      ctx.arc(leftX, ly, 10 + decay * 8, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rightX, ry, 10 + decay * 8, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Step 3B · 高空悬垂降落伞遗物渲染
  function drawAirborneRelics(world, t, viewLeft, viewRight) {
    var list = world.getRelics();
    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (!r.isAirborne) continue;
      var rx = world.projectNear(r.x, camX);
      if (rx < viewLeft - 90 || rx > viewRight + 90) continue;
      var ry = r.y;
      var sway = Math.sin(t * 1.6 + r.id) * 0.14;

      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(sway);

      var gRad = ctx.createRadialGradient(0, 0, 3, 0, 0, 44);
      gRad.addColorStop(0, r.glow);
      gRad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gRad;
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, Math.PI * 2);
      ctx.fill();

      if (r.isCloudRelic) {
        ctx.strokeStyle = 'rgba(212, 238, 255, 0.72)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 23, 9, Math.sin(t * 1.4 + r.id) * 0.2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 238, 198, 0.52)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, 17, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();

        ctx.restore();
        drawRelicIcon(rx, ry, r, t);
        continue;
      }

      var canopyY = -28;
      var canopyR = 24;
      ctx.strokeStyle = 'rgba(246, 234, 214, 0.56)';
      ctx.lineWidth = 1.1;
      for (var c = -1; c <= 1; c++) {
        ctx.beginPath();
        ctx.moveTo(c * 17, canopyY + 2);
        ctx.lineTo(c * 3, -6);
        ctx.stroke();
      }

      var cGrad = ctx.createLinearGradient(0, canopyY - canopyR, 0, canopyY + 4);
      cGrad.addColorStop(0, r.type === 'balloon' ? '#b8e4ff' : '#ffb892');
      cGrad.addColorStop(1, '#fff2dc');
      ctx.fillStyle = cGrad;
      ctx.strokeStyle = 'rgba(255, 246, 232, 0.78)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(0, canopyY + 2, canopyR, Math.PI, 0);
      ctx.quadraticCurveTo(12, canopyY - 2, 0, canopyY + 2);
      ctx.quadraticCurveTo(-12, canopyY - 2, -canopyR, canopyY + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = r.type === 'balloon' ? 'rgba(128, 190, 235, 0.45)' : 'rgba(232, 120, 88, 0.45)';
      ctx.beginPath();
      ctx.moveTo(0, canopyY - canopyR + 2);
      ctx.quadraticCurveTo(-8, canopyY - 10, -7, canopyY + 1);
      ctx.lineTo(7, canopyY + 1);
      ctx.quadraticCurveTo(8, canopyY - 10, 0, canopyY - canopyR + 2);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      drawRelicIcon(rx, ry, r, t);
    }
    ctx.restore();
  }

  function drawWaveLayer(baseY, tShift, parallax, amp, color, alpha, foam, viewLeft, viewRight, viewBottom) {
    ctx.save();
    ctx.beginPath();
    var step = 24;
    var startX = Math.floor(viewLeft / step) * step;
    for (var wx = startX; wx <= viewRight + step; wx += step) {
      var px = wx * parallax;
      var y = baseY +
        Math.sin(px * 0.006 + tShift) * amp +
        Math.sin(px * 0.015 - tShift * 1.4) * (amp * 0.35);
      if (wx === startX) ctx.moveTo(wx, y);
      else ctx.lineTo(wx, y);
    }
    ctx.lineTo(viewRight + step, viewBottom);
    ctx.lineTo(startX, viewBottom);
    ctx.closePath();
    ctx.fillStyle = rgb(color, alpha);
    ctx.fill();

    if (foam) {
      ctx.strokeStyle = 'rgba(255, 240, 214, 0.22)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (var fx = startX; fx <= viewRight + step; fx += step) {
        var fpx = fx * parallax;
        var fy = baseY +
          Math.sin(fpx * 0.006 + tShift) * amp +
          Math.sin(fpx * 0.015 - tShift * 1.4) * (amp * 0.35);
        if (fx === startX) ctx.moveTo(fx, fy);
        else ctx.lineTo(fx, fy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMainSeaAndUnderwater(world, boat, pal, t, moonWorldX, viewLeft, viewRight, viewBottom) {
    ctx.save();
    ctx.beginPath();
    var step = 18;
    var startX = Math.floor(viewLeft / step) * step;
    for (var wx = startX; wx <= viewRight + step; wx += step) {
      var wy = world.getWaveHeight(wx, t, boat.parts.lantern);
      if (wx === startX) ctx.moveTo(wx, wy);
      else ctx.lineTo(wx, wy);
    }
    ctx.lineTo(viewRight + step, viewBottom);
    ctx.lineTo(startX, viewBottom);
    ctx.closePath();

    var seaGrad = ctx.createLinearGradient(0, -25, 0, Math.max(360, viewBottom));
    seaGrad.addColorStop(0, rgb(pal.midSeaTop, 0.88));
    seaGrad.addColorStop(0.55, rgb(lerpColor(pal.midSeaTop, pal.midSeaDeep, 0.65), 0.94));
    seaGrad.addColorStop(1, rgb(pal.midSeaDeep, 0.98));
    ctx.fillStyle = seaGrad;
    ctx.fill();

    ctx.save();
    ctx.clip();

    for (var b = -1; b <= 1; b++) {
      var bx = moonWorldX + b * 120;
      var beamGrad = ctx.createLinearGradient(bx, 0, bx - 40, viewBottom);
      beamGrad.addColorStop(0, 'rgba(255, 240, 206, 0.11)');
      beamGrad.addColorStop(1, 'rgba(255, 240, 206, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(bx - 36, -30);
      ctx.lineTo(bx + 36, -30);
      ctx.lineTo(bx + 80, viewBottom);
      ctx.lineTo(bx - 96, viewBottom);
      ctx.closePath();
      ctx.fill();
    }

    // 水下柔和船灯折射暖晕（自然漫反射，无几何棱角）
    var lanternR = 145 + boat.parts.lantern * 82;
    var warmX = boat.x + boat.facing * (48 + boat.parts.lantern * 18);
    var warmWater = ctx.createRadialGradient(warmX, boat.y + 24, 14, warmX + boat.facing * 26, boat.y + 62, lanternR);
    warmWater.addColorStop(0, 'rgba(255, 212, 134, ' + (0.28 + boat.parts.lantern * 0.08) + ')');
    warmWater.addColorStop(0.55, 'rgba(255, 196, 114, ' + (0.12 + boat.parts.lantern * 0.04) + ')');
    warmWater.addColorStop(1, 'rgba(255, 184, 102, 0)');
    ctx.fillStyle = warmWater;
    ctx.fillRect(warmX - lanternR - 60, boat.y - 40, lanternR * 2 + 160, lanternR + 160);

    // 水下暗礁地形层 + 深海发光巨鲸巡游
    drawUnderwaterReefs(world, boat, pal, t, viewLeft, viewRight, viewBottom);
    drawMoonWhale(world, t, viewLeft, viewRight);

    world.getJellyfish().forEach(function (j) {
      var jx = world.projectNear(j.x, camX);
      if (jx < viewLeft - 60 || jx > viewRight + 60) return;
      var jy = j.depth;
      var pulse = 0.72 + 0.28 * Math.sin(j.phase);
      var boost = j.lifting ? 1.85 : 1.0;

      if (j.lifting) {
        var tx = world.projectNear(j.tetherX, jx);
        var jGlow = ctx.createRadialGradient(jx, jy - 2, 2, jx, jy - 2, j.size * 3.0);
        jGlow.addColorStop(0, 'rgba(164, 246, 218, ' + (0.36 * pulse) + ')');
        jGlow.addColorStop(1, 'rgba(164, 246, 218, 0)');
        ctx.fillStyle = jGlow;
        ctx.beginPath();
        ctx.arc(jx, jy - 2, j.size * 3.0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(176, 248, 224, ' + (0.48 * pulse) + ')';
        ctx.lineWidth = 1.3;
        for (var lf = -1; lf <= 1; lf += 2) {
          ctx.beginPath();
          ctx.moveTo(jx + lf * j.size * 0.28, jy - j.size * 0.55);
          ctx.quadraticCurveTo(
            (jx + tx) * 0.5 + lf * 9 + Math.sin(j.phase + lf) * 4,
            (jy + j.tetherY) * 0.5,
            tx + lf * 6,
            j.tetherY
          );
          ctx.stroke();
        }
      }

      ctx.fillStyle = j.hue + Math.min(0.75, 0.28 * pulse * boost) + ')';
      ctx.beginPath();
      ctx.arc(jx, jy, j.size * (0.9 + 0.14 * pulse), Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = j.hue + Math.min(0.6, 0.22 * pulse * boost) + ')';
      ctx.lineWidth = 1;
      for (var tt = -1; tt <= 1; tt++) {
        ctx.beginPath();
        ctx.moveTo(jx + tt * j.size * 0.35, jy);
        ctx.quadraticCurveTo(jx + tt * j.size * 0.4 + Math.sin(j.phase + tt) * 4, jy + j.size * 0.8, jx + tt * j.size * 0.3, jy + j.size * 1.4);
        ctx.stroke();
      }
    });

    world.getRelics().forEach(function (r) {
      if (r.isAirborne) return;
      var rx = world.projectNear(r.x, camX);
      if (rx < viewLeft - 80 || rx > viewRight + 80) return;
      var waveAtR = world.getWaveHeight(r.x, t, boat.parts.lantern);
      var ry = waveAtR + r.depth + (r.caught ? 0 : Math.sin(r.bobPhase) * (r.isHeavy ? 4 : 6));
      var clarity = world.getFogClarityAt(r.x, ry, boat);
      if (r.isHeavy && r.jellyAssist > 0.1) {
        clarity = Math.max(clarity, 0.45 + r.jellyAssist * 0.55);
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0.26, Math.min(1, 0.2 + clarity * 0.85));

      var glowR = r.isHeavy ? 46 : 34;
      var gRad = ctx.createRadialGradient(rx, ry, 2, rx, ry, glowR);
      gRad.addColorStop(0, r.glow);
      gRad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gRad;
      ctx.beginPath();
      ctx.arc(rx, ry, glowR, 0, Math.PI * 2);
      ctx.fill();

      if (r.isHeavy && r.jellyAssist > 0.12) {
        var liftGlow = ctx.createRadialGradient(rx, ry + 12, 3, rx, ry + 12, 34);
        liftGlow.addColorStop(0, 'rgba(164, 246, 218, ' + (0.48 * r.jellyAssist) + ')');
        liftGlow.addColorStop(1, 'rgba(164, 246, 218, 0)');
        ctx.fillStyle = liftGlow;
        ctx.beginPath();
        ctx.arc(rx, ry + 12, 34, 0, Math.PI * 2);
        ctx.fill();
      }

      drawRelicIcon(rx, ry, r, t);
      ctx.restore();
    });

    for (var m = 0; m < 12; m++) {
      var p = m / 12;
      var my = 6 + p * 75;
      var mw = (26 + p * 68) * (0.65 + 0.35 * Math.sin(t * 1.7 + m * 1.9));
      var mx = moonWorldX + Math.sin(t * 1.3 + m * 2.1) * 14;
      ctx.fillStyle = 'rgba(255, 240, 208, ' + ((1 - p) * 0.32) + ')';
      ctx.fillRect(mx - mw / 2, my, mw, 2);
    }

    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 236, 206, 0.48)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var hx = startX; hx <= viewRight + step; hx += step) {
      var hwy = world.getWaveHeight(hx, t, boat.parts.lantern);
      if (hx === startX) ctx.moveTo(hx, hwy);
      else ctx.lineTo(hx, hwy);
    }
    ctx.stroke();

    ctx.restore();
  }

  // Step 3A · 第二海域水下暗礁地形渲染（远层礁影 + 实景玄武岩轮廓 + 海草 + 灯火暖边 + 浅峰碎沫）
  function drawUnderwaterReefs(world, boat, pal, t, viewLeft, viewRight, viewBottom) {
    var list = world.getReefs();
    if (!list || list.length === 0) return;

    var lv = boat.parts.lantern || 0;
    var lampX = boat.x + Math.cos(boat.angle) * boat.facing * 46;
    var lampY = boat.y + Math.sin(boat.angle) * boat.facing * 46 - 10;
    var lampRange = 190 + lv * 95;

    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var rf = list[i];
      var rfx = world.projectNear(rf.x, camX);
      if (rfx + rf.halfW < viewLeft - 90 || rfx - rf.halfW > viewRight + 90) continue;

      var clarity = world.getFogClarityAt(rf.x, rf.topY + 30, boat);
      var distLamp = Math.hypot(rfx - lampX, (rf.topY + 20) - lampY);
      var warmLit = Math.max(0, 1 - distLamp / lampRange);

      ctx.fillStyle = 'rgba(10, 24, 42, 0.42)';
      ctx.beginPath();
      var pts = rf.profile;
      var bgShift = (camX - rfx) * 0.08 + 18;
      ctx.moveTo(rfx + pts[0].dx * 1.15 + bgShift, Math.max(390, viewBottom));
      for (var b = 0; b < pts.length; b++) {
        ctx.lineTo(rfx + pts[b].dx * 1.12 + bgShift, pts[b].y + 18);
      }
      ctx.lineTo(rfx + pts[pts.length - 1].dx * 1.15 + bgShift, Math.max(390, viewBottom));
      ctx.closePath();
      ctx.fill();

      var rGrad = ctx.createLinearGradient(rfx, rf.topY, rfx, Math.max(360, viewBottom));
      var topTint = lerpColor([28, 52, 72], [116, 102, 86], warmLit * 0.52);
      rGrad.addColorStop(0, rgb(topTint, 0.88));
      rGrad.addColorStop(0.35, 'rgba(15, 31, 50, 0.94)');
      rGrad.addColorStop(1, 'rgba(6, 14, 28, 0.98)');

      ctx.fillStyle = rGrad;
      ctx.beginPath();
      ctx.moveTo(rfx + pts[0].dx, Math.max(390, viewBottom));
      for (var p = 0; p < pts.length; p++) {
        ctx.lineTo(rfx + pts[p].dx, pts[p].y);
      }
      ctx.lineTo(rfx + pts[pts.length - 1].dx, Math.max(390, viewBottom));
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(7, 16, 30, 0.34)';
      ctx.beginPath();
      var midIdx = Math.floor(pts.length * 0.5);
      ctx.moveTo(rfx + pts[midIdx].dx, pts[midIdx].y + 4);
      for (var m = midIdx; m < pts.length; m++) {
        ctx.lineTo(rfx + pts[m].dx, pts[m].y + 4);
      }
      ctx.lineTo(rfx + pts[pts.length - 1].dx, Math.max(390, viewBottom));
      ctx.lineTo(rfx + pts[midIdx].dx - 10, Math.max(390, viewBottom));
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      for (var s = 1; s < pts.length - 1; s++) {
        var sx = rfx + pts[s].dx;
        var sy = pts[s].y;
        if (s === 1) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      var rimAlpha = 0.16 + clarity * 0.22 + warmLit * 0.42;
      ctx.strokeStyle = warmLit > 0.18
        ? 'rgba(255, 214, 144, ' + Math.min(0.78, rimAlpha) + ')'
        : 'rgba(148, 186, 208, ' + Math.min(0.42, rimAlpha) + ')';
      ctx.lineWidth = warmLit > 0.25 ? 2.1 : 1.3;
      ctx.stroke();

      if (rf.kelp) {
        ctx.strokeStyle = 'rgba(42, 92, 96, ' + (0.45 + warmLit * 0.3) + ')';
        ctx.lineWidth = 2.0;
        ctx.lineCap = 'round';
        for (var k = 0; k < rf.kelp.length; k++) {
          var kp = rf.kelp[k];
          var kx = rfx + kp.dx;
          var ky = kp.y + 3;
          var sway = Math.sin(t * 1.4 + kp.phase) * 7;
          ctx.beginPath();
          ctx.moveTo(kx, ky);
          ctx.quadraticCurveTo(kx + sway * 0.6, ky - kp.len * 0.55, kx + sway, ky - kp.len);
          ctx.stroke();
        }
      }

      if (rf.kind === 'shallow') {
        var waveAtTop = world.getWaveHeight(rf.x, t, lv);
        var gap = rf.topY - waveAtTop;
        if (gap < 36) {
          var foamStrength = Math.max(0, Math.min(1, (36 - gap) / 34));
          ctx.strokeStyle = 'rgba(232, 244, 252, ' + (0.24 + foamStrength * 0.42) + ')';
          ctx.lineWidth = 1.6;
          var fw = 18 + foamStrength * 22;
          ctx.beginPath();
          ctx.moveTo(rfx - fw, waveAtTop + 3);
          ctx.quadraticCurveTo(rfx, waveAtTop - 4 * foamStrength + Math.sin(t * 4 + rf.seed) * 2, rfx + fw, waveAtTop + 3);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // Step 3C · 第四海域月光失重上升流渲染
  function drawGravityStreams(world, boat, t, viewLeft, viewRight) {
    var list = world.getGravityStreams();
    if (!list || list.length === 0) return;

    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var st = list[i];
      var stx = world.projectNear(st.x, camX);
      if (stx < viewLeft - 140 || stx > viewRight + 140) continue;
      var surfY = world.getWaveHeight(st.x, t, boat.parts.lantern);
      var pulse = 0.78 + 0.22 * Math.sin(t * 1.8 + st.phase);

      var sGrad = ctx.createLinearGradient(stx, surfY + 8, stx, st.topY);
      sGrad.addColorStop(0, 'rgba(182, 224, 255, ' + (0.24 * pulse) + ')');
      sGrad.addColorStop(0.55, 'rgba(232, 240, 255, ' + (0.14 * pulse) + ')');
      sGrad.addColorStop(1, 'rgba(255, 242, 212, 0)');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.moveTo(stx - st.radius * 0.56, surfY + 6);
      ctx.quadraticCurveTo(stx - st.radius * 0.78, (surfY + st.topY) * 0.5, stx - st.radius * 0.42, st.topY);
      ctx.lineTo(stx + st.radius * 0.42, st.topY);
      ctx.quadraticCurveTo(stx + st.radius * 0.78, (surfY + st.topY) * 0.5, stx + st.radius * 0.56, surfY + 6);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(226, 244, 255, ' + (0.34 * pulse) + ')';
      ctx.lineWidth = 1.4;
      for (var k = -1; k <= 1; k++) {
        var rx = stx + k * st.radius * 0.3;
        var span = Math.max(80, surfY - st.topY);
        var prog = ((t * 0.36 + k * 0.31 + st.phase) % 1 + 1) % 1;
        var sy = surfY - prog * span;
        ctx.beginPath();
        ctx.moveTo(rx + Math.sin(t * 2.2 + k) * 4, sy + 14);
        ctx.quadraticCurveTo(rx - Math.sin(t * 2.2 + k) * 5, sy, rx + Math.cos(t * 1.9 + k) * 4, sy - 16);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Step 3C · 第四海域反重力浮空云石岛渲染（手绘倒锥悬岩 + 月苔草甸 + 岛屿微地标 + 悬浮碎石）
  function drawCloudIslands(world, boat, t, viewLeft, viewRight) {
    var list = world.getCloudIslands();
    if (!list || list.length === 0) return;

    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var isl = list[i];
      var ix = world.projectNear(isl.x, camX);
      if (ix + isl.halfW < viewLeft - 120 || ix - isl.halfW > viewRight + 120) continue;
      var hw = isl.halfW;
      var iy = isl.y;

      var underGlow = ctx.createRadialGradient(ix, iy + 24, 6, ix, iy + 24, hw * 1.15);
      underGlow.addColorStop(0, 'rgba(182, 224, 255, 0.24)');
      underGlow.addColorStop(1, 'rgba(182, 224, 255, 0)');
      ctx.fillStyle = underGlow;
      ctx.beginPath();
      ctx.ellipse(ix, iy + 26, hw * 1.15, 34, 0, 0, Math.PI * 2);
      ctx.fill();

      var rockGrad = ctx.createLinearGradient(ix, iy - 6, ix, iy + 68);
      rockGrad.addColorStop(0, '#4f6282');
      rockGrad.addColorStop(0.42, '#2d3f62');
      rockGrad.addColorStop(1, '#182440');
      ctx.fillStyle = rockGrad;
      ctx.strokeStyle = 'rgba(206, 228, 252, 0.42)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(ix - hw, iy + 2);
      ctx.quadraticCurveTo(ix, iy - 12, ix + hw, iy + 2);
      ctx.lineTo(ix + hw * 0.66, iy + 26);
      ctx.lineTo(ix + hw * 0.24, iy + 54);
      ctx.lineTo(ix - hw * 0.08, iy + 64);
      ctx.lineTo(ix - hw * 0.44, iy + 40);
      ctx.lineTo(ix - hw * 0.78, iy + 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      var mossGrad = ctx.createLinearGradient(ix - hw, iy - 10, ix + hw, iy + 4);
      mossGrad.addColorStop(0, '#7eb4b8');
      mossGrad.addColorStop(0.5, '#b8e0ce');
      mossGrad.addColorStop(1, '#79a8b8');
      ctx.fillStyle = mossGrad;
      ctx.beginPath();
      ctx.moveTo(ix - hw + 2, iy + 2);
      ctx.quadraticCurveTo(ix, iy - 14, ix + hw - 2, iy + 2);
      ctx.quadraticCurveTo(ix, iy + 4, ix - hw + 2, iy + 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(54, 74, 108, 0.85)';
      for (var st = -1; st <= 1; st++) {
        var sx = ix + st * hw * 0.36;
        var sy = iy + 66 + (st === 0 ? 12 : 4) + Math.sin(t * 1.4 + isl.phase + st) * 5;
        ctx.beginPath();
        ctx.ellipse(sx, sy, 6 + (st === 0 ? 2 : 0), 4, st * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      var topY = iy - 7;
      if (isl.decor === 'lantern_post') {
        ctx.strokeStyle = '#d4b898';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ix + hw * 0.45, topY + 3);
        ctx.lineTo(ix + hw * 0.45, topY - 26);
        ctx.lineTo(ix + hw * 0.34, topY - 26);
        ctx.stroke();
        ctx.fillStyle = '#ffdf9e';
        ctx.beginPath();
        ctx.arc(ix + hw * 0.34, topY - 21, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (isl.decor === 'wind_chime') {
        ctx.strokeStyle = '#c4e4dc';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(ix - hw * 0.38, topY + 2);
        ctx.lineTo(ix - hw * 0.38, topY - 28);
        ctx.lineTo(ix - hw * 0.16, topY - 28);
        ctx.stroke();
        for (var ch = 0; ch < 3; ch++) {
          var cx = ix - hw * 0.32 + ch * 6;
          ctx.beginPath();
          ctx.moveTo(cx, topY - 28);
          ctx.lineTo(cx + Math.sin(t * 2.4 + ch) * 2.5, topY - 14);
          ctx.stroke();
        }
      } else if (isl.decor === 'observatory') {
        ctx.fillStyle = 'rgba(214, 224, 238, 0.55)';
        ctx.fillRect(ix + hw * 0.18, topY - 14, 22, 16);
        ctx.beginPath();
        ctx.arc(ix + hw * 0.18 + 11, topY - 14, 11, Math.PI, 0);
        ctx.fill();
      } else if (isl.decor === 'shrine_arch') {
        ctx.strokeStyle = 'rgba(232, 166, 138, 0.72)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(ix - 18, topY + 2); ctx.lineTo(ix - 18, topY - 24);
        ctx.moveTo(ix + 18, topY + 2); ctx.lineTo(ix + 18, topY - 24);
        ctx.moveTo(ix - 25, topY - 24); ctx.quadraticCurveTo(ix, topY - 20, ix + 25, topY - 24);
        ctx.stroke();
      } else if (isl.decor === 'moon_bell') {
        ctx.strokeStyle = '#e8cf9a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ix, topY + 2);
        ctx.lineTo(ix, topY - 26);
        ctx.stroke();
        ctx.fillStyle = '#ffe5b0';
        ctx.beginPath();
        ctx.arc(ix, topY - 28, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Phase 2 · 主动声波回声定位光环（穿透海雾提示附近古迹/重物方向）
  function drawEchoPingsScreen(world, t) {
    var list = world.getEchoPings();
    if (!list || list.length === 0) return;

    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var ep = list[i];
      var px = world.projectNear(ep.x, camX);
      var s = worldToScreen(px, ep.y);
      var a = Math.max(0, ep.life / ep.maxLife);
      var prog = 1 - a;

      // 如果目标在屏幕外侧，则在对应屏幕边缘显示柔和的边沿月光回波弧
      if (s.x < 28 || s.x > W - 28) {
        var edgeX = s.x < 28 ? 22 : (W - 22);
        var edgeY = Math.max(96, Math.min(H - 86, s.y));
        var dirSign = s.x < 28 ? 1 : -1;
        ctx.strokeStyle = ep.isLandmark
          ? 'rgba(255, 228, 156, ' + (0.78 * a) + ')'
          : 'rgba(169, 240, 204, ' + (0.65 * a) + ')';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(edgeX, edgeY, 12 + prog * 22, dirSign > 0 ? -Math.PI * 0.42 : Math.PI * 0.58, dirSign > 0 ? Math.PI * 0.42 : Math.PI * 1.42);
        ctx.stroke();

        ctx.fillStyle = ep.isLandmark
          ? 'rgba(255, 238, 184, ' + (0.85 * a) + ')'
          : 'rgba(182, 244, 214, ' + (0.72 * a) + ')';
        ctx.beginPath();
        ctx.arc(edgeX + dirSign * 4, edgeY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      var r = (14 + prog * (ep.isLandmark ? 72 : 46)) * camZoom;
      ctx.strokeStyle = ep.color || '#ffe39c';
      ctx.globalAlpha = a * 0.72;
      ctx.lineWidth = ep.isLandmark ? 2.2 : 1.6;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(s.x, s.y, r * 0.48, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Phase 2 · 深海发光巨鲸水下巡游渲染
  function drawMoonWhale(world, t, viewLeft, viewRight) {
    var w = world.getMoonWhale();
    if (!w || !w.active) return;
    var wx = world.projectNear(w.x, camX);
    if (wx < viewLeft - 260 || wx > viewRight + 260) return;

    var dir = w.vx >= 0 ? 1 : -1;
    var wy = w.y;
    var tailWave = Math.sin(w.phase * 2.1) * 14;

    ctx.save();
    ctx.translate(wx, wy);
    ctx.scale(dir, 1);

    // 柔和生物荧光外晕
    var glow = ctx.createRadialGradient(12, -4, 16, 0, 0, 145);
    glow.addColorStop(0, 'rgba(148, 242, 220, 0.30)');
    glow.addColorStop(0.55, 'rgba(130, 210, 255, 0.12)');
    glow.addColorStop(1, 'rgba(130, 210, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, 0, 145, 72, 0, 0, Math.PI * 2);
    ctx.fill();

    // 水彩巨鲸优雅流线体型
    var bodyGrad = ctx.createLinearGradient(-110, -28, 92, 30);
    bodyGrad.addColorStop(0, 'rgba(72, 146, 172, 0.74)');
    bodyGrad.addColorStop(0.5, 'rgba(116, 198, 212, 0.80)');
    bodyGrad.addColorStop(1, 'rgba(182, 240, 232, 0.82)');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(86, -4);
    ctx.quadraticCurveTo(64, -34, 8, -28);
    ctx.quadraticCurveTo(-48, -22, -96, tailWave * 0.45 - 6);
    ctx.lineTo(-124, tailWave - 22);
    ctx.quadraticCurveTo(-110, tailWave, -126, tailWave + 18);
    ctx.lineTo(-94, tailWave * 0.45 + 7);
    ctx.quadraticCurveTo(-36, 28, 32, 26);
    ctx.quadraticCurveTo(78, 24, 86, -4);
    ctx.closePath();
    ctx.fill();

    // 胸鳍
    ctx.fillStyle = 'rgba(156, 234, 224, 0.56)';
    ctx.beginPath();
    ctx.moveTo(22, 16);
    ctx.quadraticCurveTo(6, 42 + Math.sin(w.phase) * 4, -22, 34);
    ctx.quadraticCurveTo(-2, 20, 22, 16);
    ctx.closePath();
    ctx.fill();

    // 鲸背星辰光斑与柔和鲸眼
    ctx.fillStyle = 'rgba(255, 248, 218, 0.85)';
    for (var s = 0; s < 6; s++) {
      ctx.beginPath();
      ctx.arc(46 - s * 18, -14 + Math.sin(s * 1.3) * 5, 2.2 + (s % 2) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff9df';
    ctx.beginPath();
    ctx.arc(62, -2, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Phase 2 · 高空钟摆气球锚点渲染
  function drawGrappleBuoys(world, t, viewLeft, viewRight) {
    var list = world.getGrappleBuoys();
    if (!list || list.length === 0) return;

    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      var bx = world.projectNear(b.x, camX);
      if (bx < viewLeft - 90 || bx > viewRight + 90) continue;
      var by = b.y;
      var sway = (b.sway || 0) + Math.sin(t * 1.8 + b.phase) * 4;

      // 悬空小浮囊
      var g = ctx.createRadialGradient(bx + sway * 0.4, by - 20, 2, bx + sway * 0.4, by - 20, 34);
      g.addColorStop(0, 'rgba(255, 232, 182, 0.42)');
      g.addColorStop(1, 'rgba(255, 232, 182, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx + sway * 0.4, by - 20, 34, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(245, 226, 192, 0.58)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bx + sway * 0.4, by - 10);
      ctx.lineTo(bx, by);
      ctx.stroke();

      var bGrad = ctx.createRadialGradient(bx + sway * 0.4 - 4, by - 25, 2, bx + sway * 0.4, by - 22, 14);
      bGrad.addColorStop(0, '#fff7e8');
      bGrad.addColorStop(0.6, '#d9e8ff');
      bGrad.addColorStop(1, '#7ea2c9');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.ellipse(bx + sway * 0.4, by - 22, 12, 14, sway * 0.015, 0, Math.PI * 2);
      ctx.fill();

      // 下方黄铜挂钩环（清晰的物理摆荡视觉引导）
      ctx.strokeStyle = '#ffd588';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(bx, by, 7.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 222, 152, ' + (0.28 + 0.22 * Math.sin(t * 3 + b.phase)) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(bx, by, 13, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Phase 2 · 四大海域核心可交互古迹机关渲染
  function drawLandmarkPuzzles(world, boat, t, viewLeft, viewRight, viewTop) {
    var list = world.getLandmarkPuzzles();
    if (!list || list.length === 0) return;

    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var lm = list[i];
      var lx = world.projectNear(lm.x, camX);
      if (lx < viewLeft - 420 || lx > viewRight + 420) continue;

      if (lm.id === 'shallows_lighthouse') {
        var surfL = world.getWaveHeight(lm.x, t, boat.parts.lantern);
        // 1. 礁石基座与高耸手绘水彩灯塔
        ctx.fillStyle = '#333b5c';
        ctx.beginPath();
        ctx.ellipse(lx, surfL + 10, 56, 18, 0, Math.PI, 0);
        ctx.fill();

        var tGrad = ctx.createLinearGradient(lx - 20, -135, lx + 20, 12);
        tGrad.addColorStop(0, '#f0dec6');
        tGrad.addColorStop(0.55, '#c4a694');
        tGrad.addColorStop(1, '#5d4c66');
        ctx.fillStyle = tGrad;
        ctx.strokeStyle = 'rgba(255, 238, 210, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lx - 22, surfL + 8);
        ctx.lineTo(lx - 13, -112);
        ctx.lineTo(lx + 13, -112);
        ctx.lineTo(lx + 22, surfL + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 灯塔红暖漆环与玻璃灯室
        ctx.fillStyle = 'rgba(208, 108, 88, 0.72)';
        ctx.fillRect(lx - 17, -58, 34, 16);
        ctx.fillStyle = lm.solved ? '#ffe8a8' : 'rgba(130, 152, 182, 0.55)';
        ctx.fillRect(lx - 12, -134, 24, 22);
        ctx.fillStyle = '#483b58';
        ctx.beginPath();
        ctx.arc(lx, -134, 15, Math.PI, 0);
        ctx.fill();

        // 2. 倾倒/拉正的黄铜铜镜浮标（位于灯塔西侧）
        var bx = world.projectNear(lm.buoyX, camX);
        var by = world.getWaveHeight(lm.buoyX, t, boat.parts.lantern) - 4;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(lm.buoyTilt || 0);
        ctx.fillStyle = '#6c4836';
        ctx.strokeStyle = '#e5be7e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 4, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#e5be7e';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -32);
        ctx.stroke();
        // 铜镜圆盘
        ctx.fillStyle = lm.solved ? '#fff2c4' : '#e8c488';
        ctx.beginPath();
        ctx.ellipse(4, -32, 7, 13, -0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // 拉钩环提示
        if (!lm.solved) {
          ctx.strokeStyle = 'rgba(255, 222, 148, ' + (0.55 + 0.35 * Math.sin(t * 4)) + ')';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(-10, -14, 7, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

        // 拉正进度弧
        if (!lm.solved && lm.pullProgress > 0.02) {
          ctx.strokeStyle = 'rgba(255, 228, 156, 0.88)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(bx, by - 20, 26, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * lm.pullProgress);
          ctx.stroke();
        }

        // 点亮后：铜镜折射束 -> 灯塔主灯扫海金光
        if (lm.solved) {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          var linkGrad = ctx.createLinearGradient(bx, by - 32, lx, -124);
          linkGrad.addColorStop(0, 'rgba(255, 232, 168, 0.55)');
          linkGrad.addColorStop(1, 'rgba(255, 240, 196, 0.82)');
          ctx.strokeStyle = linkGrad;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(bx, by - 32);
          ctx.lineTo(lx, -124);
          ctx.stroke();

          var sweepAng = -0.14 + Math.sin(t * 0.65) * 0.22;
          ctx.translate(lx, -124);
          ctx.rotate(sweepAng);
          if (beamSprite) {
            ctx.globalAlpha = 0.72;
            ctx.drawImage(beamSprite, -24, -145, 560, 290);
          }
          ctx.restore();
        }
      } else if (lm.id === 'mist_bells' && lm.bells) {
        // 第二海域 · 三座海雾沉钟石拱
        for (var bi = 0; bi < lm.bells.length; bi++) {
          var bell = lm.bells[bi];
          var bbx = world.projectNear(bell.x, camX);
          var bSurf = world.getWaveHeight(bell.x, t, boat.parts.lantern);
          var topY = bell.y - 42;

          ctx.fillStyle = '#253952';
          ctx.strokeStyle = bell.lit ? 'rgba(176, 246, 214, 0.75)' : 'rgba(148, 184, 206, 0.35)';
          ctx.lineWidth = 1.6;
          ctx.fillRect(bbx - 24, topY, 9, (bSurf + 56) - topY);
          ctx.fillRect(bbx + 15, topY, 9, (bSurf + 56) - topY);
          ctx.fillRect(bbx - 28, topY - 6, 56, 10);
          ctx.strokeRect(bbx - 28, topY - 6, 56, 10);

          // 悬挂古铜钟
          var swing = bell.ringFlash > 0 ? Math.sin(t * 18) * 0.25 * bell.ringFlash : Math.sin(t * 1.2 + bi) * 0.04;
          ctx.save();
          ctx.translate(bbx, topY + 4);
          ctx.rotate(swing);
          if (bell.lit || bell.ringFlash > 0.05) {
            var bg = ctx.createRadialGradient(0, 22, 4, 0, 22, 46);
            bg.addColorStop(0, 'rgba(178, 248, 220, ' + (bell.lit ? 0.52 : 0.35 * bell.ringFlash) + ')');
            bg.addColorStop(1, 'rgba(178, 248, 220, 0)');
            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.arc(0, 22, 46, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = bell.lit ? '#ffe29c' : '#8d8a78';
          ctx.strokeStyle = bell.lit ? '#fff6dc' : '#b8b29c';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(-8, 12);
          ctx.quadraticCurveTo(-13, 28, -16, 36);
          ctx.lineTo(16, 36);
          ctx.quadraticCurveTo(13, 28, 8, 12);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      } else if (lm.id === 'rocket_gantry') {
        // 第三海域 · 第 19 号推月发射台与双锈蚀拉索卡扣
        var gSurf = world.getWaveHeight(lm.x, t, boat.parts.lantern);
        ctx.strokeStyle = 'rgba(220, 174, 152, 0.62)';
        ctx.lineWidth = 3;
        ctx.strokeRect(lx - 26, -168, 52, 194);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (var gy = -168; gy < 16; gy += 36) {
          ctx.moveTo(lx - 26, gy); ctx.lineTo(lx + 26, gy + 36);
          ctx.moveTo(lx + 26, gy); ctx.lineTo(lx - 26, gy + 36);
        }
        ctx.stroke();

        // 发射台内的推月火箭主体（解锁后冲天升空）
        var riseOffset = lm.solved ? ((1 - (lm.launchAnim || 0)) * 520) : 0;
        if (!lm.solved || riseOffset < 480) {
          var ry = -20 - riseOffset;
          var rGrad = ctx.createLinearGradient(lx - 14, ry - 125, lx + 14, ry);
          rGrad.addColorStop(0, '#f5e8d6');
          rGrad.addColorStop(0.7, '#d8bca6');
          rGrad.addColorStop(1, '#765b68');
          ctx.fillStyle = rGrad;
          ctx.beginPath();
          ctx.moveTo(lx - 14, ry);
          ctx.lineTo(lx - 13, ry - 102);
          ctx.quadraticCurveTo(lx, ry - 136, lx + 13, ry - 102);
          ctx.lineTo(lx + 14, ry);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(226, 114, 86, 0.78)';
          ctx.fillRect(lx - 13, ry - 72, 26, 16);

          if (lm.solved) {
            var plGrad = ctx.createLinearGradient(lx, ry, lx, ry + 130);
            plGrad.addColorStop(0, 'rgba(255, 250, 224, 0.95)');
            plGrad.addColorStop(0.45, 'rgba(255, 174, 98, 0.65)');
            plGrad.addColorStop(1, 'rgba(255, 140, 80, 0)');
            ctx.fillStyle = plGrad;
            ctx.beginPath();
            ctx.moveTo(lx - 12, ry);
            ctx.lineTo(lx, ry + 130);
            ctx.lineTo(lx + 12, ry);
            ctx.closePath();
            ctx.fill();
          }
        }

        // 双钢缆锚扣
        if (lm.clamps) {
          for (var ci = 0; ci < lm.clamps.length; ci++) {
            var cl = lm.clamps[ci];
            if (cl.released) continue;
            var clx = world.projectNear(cl.x, camX);
            ctx.strokeStyle = 'rgba(240, 184, 134, 0.72)';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(lx + cl.side * 16, -98);
            ctx.lineTo(clx, cl.y);
            ctx.lineTo(clx + cl.side * 16, gSurf + 18);
            ctx.stroke();

            // 锚扣光环（钩索可锁定）
            ctx.strokeStyle = 'rgba(255, 186, 120, ' + (0.62 + 0.35 * Math.sin(t * 4.5 + ci)) + ')';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.arc(clx, cl.y, 11, 0, Math.PI * 2);
            ctx.stroke();

            if (cl.progress > 0.02) {
              ctx.strokeStyle = '#ffe59c';
              ctx.lineWidth = 3.2;
              ctx.beginPath();
              ctx.arc(clx, cl.y, 20, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * cl.progress);
              ctx.stroke();
            }
          }
        }
      } else if (lm.id === 'cloud_observatory') {
        // 第四海域 · 悬空观月天文台黄铜月相浑天仪
        var oy = lm.y;
        ctx.save();
        ctx.translate(lx, oy - 18);

        var og = ctx.createRadialGradient(0, 0, 4, 0, 0, lm.solved ? 72 : 44);
        og.addColorStop(0, lm.solved ? 'rgba(255, 240, 190, 0.65)' : 'rgba(182, 224, 255, 0.35)');
        og.addColorStop(1, 'rgba(182, 224, 255, 0)');
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.arc(0, 0, lm.solved ? 72 : 44, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(lm.dialAngle || 0);
        ctx.strokeStyle = lm.solved ? '#ffe9ac' : '#c6e2ff';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 9, Math.PI * 0.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(0, 28);
        ctx.stroke();
        ctx.fillStyle = lm.solved ? '#fff6d8' : '#a8dcff';
        ctx.beginPath();
        ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 校准完成后射向潮汐光柱的银金星轨光束
        if (lm.solved) {
          var pillarProj = world.projectNear(world.getPillar().x, lx);
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          var starBeam = ctx.createLinearGradient(lx, oy - 18, pillarProj, -160);
          starBeam.addColorStop(0, 'rgba(255, 242, 198, 0.68)');
          starBeam.addColorStop(1, 'rgba(196, 232, 255, 0.22)');
          ctx.strokeStyle = starBeam;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(lx, oy - 18);
          ctx.lineTo(pillarProj, -160);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  // Phase 1 · 全环海平流层月风加速环渲染（双层旋转风纹光圈 + 穿环脉冲）
  function drawWindRings(world, t, viewLeft, viewRight) {
    var list = world.getWindRings();
    if (!list || list.length === 0) return;

    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var ring = list[i];
      var rx = world.projectNear(ring.x, camX);
      if (rx < viewLeft - 100 || rx > viewRight + 100) continue;
      var ry = ring.y;
      var rad = ring.radius;
      var fl = ring.flash || 0;
      var ready = ring.cooldown <= 0.15;
      var pulse = 0.76 + 0.24 * Math.sin(t * 2.4 + ring.phase);

      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(ring.tilt);

      // 柔和空气流晕
      var halo = ctx.createRadialGradient(0, 0, rad * 0.2, 0, 0, rad * (1.7 + fl * 0.55));
      halo.addColorStop(0, 'rgba(204, 240, 255, ' + ((ready ? 0.14 : 0.06) + fl * 0.32) + ')');
      halo.addColorStop(0.55, 'rgba(255, 232, 182, ' + ((ready ? 0.09 : 0.03) + fl * 0.22) + ')');
      halo.addColorStop(1, 'rgba(204, 240, 255, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, rad * (1.7 + fl * 0.55), 0, Math.PI * 2);
      ctx.fill();

      // 扁椭圆侧视风环（呈 3D 穿环透视感）
      var rxEll = rad * 0.44;
      var ryEll = rad;

      ctx.strokeStyle = fl > 0.05
        ? 'rgba(255, 244, 204, ' + Math.min(0.95, 0.55 + fl * 0.4) + ')'
        : 'rgba(196, 236, 255, ' + ((ready ? 0.48 : 0.22) * pulse) + ')';
      ctx.lineWidth = 2.2 + fl * 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, rxEll, ryEll, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 内层旋转流动风丝弧
      var rot = t * 2.4 + ring.phase;
      ctx.strokeStyle = 'rgba(255, 236, 194, ' + ((ready ? 0.55 : 0.2) * pulse + fl * 0.35) + ')';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, rxEll * 0.78, ryEll * 0.78, 0, rot, rot + Math.PI * 0.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, rxEll * 0.78, ryEll * 0.78, 0, rot + Math.PI, rot + Math.PI * 1.75);
      ctx.stroke();

      // 中心月风微点
      ctx.fillStyle = 'rgba(255, 246, 218, ' + ((ready ? 0.65 : 0.25) * pulse + fl * 0.35) + ')';
      ctx.beginPath();
      ctx.arc(0, 0, 2.6 + fl * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();
  }

  // Step 3C · 终章升空孔明微灯渲染
  function drawSkyLanterns(world, t, viewLeft, viewRight) {
    var list = world.getSkyLanterns();
    if (!list || list.length === 0) return;
    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var sl = list[i];
      var slx = world.projectNear(sl.x, camX);
      if (slx < viewLeft - 60 || slx > viewRight + 60) continue;
      var a = Math.min(1, sl.life / 3.5);
      var r = 18 * sl.size;
      var g = ctx.createRadialGradient(slx, sl.y, 1, slx, sl.y, r);
      g.addColorStop(0, 'rgba(255, 224, 148, ' + (0.8 * a) + ')');
      g.addColorStop(0.45, 'rgba(255, 174, 96, ' + (0.34 * a) + ')');
      g.addColorStop(1, 'rgba(255, 160, 82, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(slx, sl.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 238, 192, ' + a + ')';
      ctx.beginPath();
      ctx.roundRect(slx - 3.2 * sl.size, sl.y - 4.4 * sl.size, 6.4 * sl.size, 8.8 * sl.size, 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRelicIcon(rx, ry, r, t) {
    ctx.save();
    ctx.translate(rx, ry);
    if (r.isHeavy) {
      ctx.rotate(Math.sin(t * 0.6 + r.id) * 0.08);
      ctx.strokeStyle = r.jellyAssist > 0.25
        ? 'rgba(169, 240, 204, 0.72)'
        : 'rgba(224, 186, 134, 0.56)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.stroke();

      if ((r.effectiveWeight || 1) > 0.35) {
        ctx.strokeStyle = 'rgba(196, 166, 132, 0.62)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(0, 22);
        ctx.moveTo(-5, 19);
        ctx.quadraticCurveTo(0, 24, 5, 19);
        ctx.stroke();
      }
      ctx.scale(1.36, 1.36);
    } else {
      ctx.rotate(Math.sin(t + r.id) * 0.22);
    }
    ctx.fillStyle = r.color;
    ctx.strokeStyle = '#fff5e4';
    ctx.lineWidth = 1.4;

    if (r.type === 'thruster') {
      ctx.beginPath();
      ctx.roundRect(-9, -6, 16, 12, 4);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-9, -4);
      ctx.lineTo(-14, -7);
      ctx.lineTo(-14, 7);
      ctx.lineTo(-9, 4);
      ctx.closePath();
      ctx.fill();
    } else if (r.type === 'balloon') {
      ctx.beginPath();
      ctx.arc(-4, -4, 6, 0, Math.PI * 2);
      ctx.arc(5, -6, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.lineTo(0, 13);
      ctx.stroke();
    } else if (r.type === 'gramophone') {
      ctx.beginPath();
      ctx.arc(0, 3, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-2, -1);
      ctx.lineTo(9, -11);
      ctx.lineTo(12, -3);
      ctx.closePath();
      ctx.fill();
    } else if (r.type === 'lantern') {
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.roundRect(-5, -8, 10, 16, 4);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHook(boat, t) {
    var h = boat.hook;
    if (h.mode === 'idle') return;
    var ax = boat.x + Math.cos(boat.angle) * boat.facing * 24;
    var ay = boat.y + Math.sin(boat.angle) * boat.facing * 24 + 4;
    var isAnchorPull = h.mode === 'latched' || h.mode === 'swing';
    var isHeavyPull = isAnchorPull || !!(h.caughtRelic && h.caughtRelic.isHeavy);
    var tension = isHeavyPull ? (h.tension || (h.mode === 'swing' ? 0.35 : 0)) : 0;
    var swell = isHeavyPull ? (h.swellAssist || 0) : 0;

    ctx.save();

    var ropeColor;
    if (tension > 0.55) {
      var warn = Math.min(1, (tension - 0.55) / 0.45);
      ropeColor = rgb(lerpColor([248, 206, 134], [255, 118, 92], warn), 0.92);
    } else if (swell > 0.3) {
      ropeColor = 'rgba(244, 246, 224, 0.88)';
    } else {
      ropeColor = 'rgba(245, 224, 186, 0.76)';
    }

    var vib = tension > 0.4 ? Math.sin((t || 0) * 52) * tension * 2.6 : 0;
    var sag = isHeavyPull ? Math.max(1.5, 11 * (1 - Math.min(1, tension * 1.25))) : 14;

    ctx.strokeStyle = ropeColor;
    ctx.lineWidth = isHeavyPull ? (1.8 + tension * 0.8) : 1.6;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    if (h.scrapePoint) {
      ctx.lineTo(h.scrapePoint.x + vib * 0.4, h.scrapePoint.y);
      ctx.lineTo(h.x, h.y);
    } else {
      ctx.quadraticCurveTo(
        (ax + h.x) * 0.5 - boat.vx * 0.04 + vib,
        (ay + h.y) * 0.5 + sag,
        h.x,
        h.y
      );
    }
    ctx.stroke();

    if (isHeavyPull && swell > 0.28) {
      var pulsePos = 1 - (((t || 0) * 1.15) % 1);
      var px = ax + (h.x - ax) * pulsePos;
      var py = ay + (h.y - ay) * pulsePos;
      var sg = ctx.createRadialGradient(px, py, 1, px, py, 11);
      sg.addColorStop(0, 'rgba(255, 248, 220, ' + (0.75 * swell) + ')');
      sg.addColorStop(1, 'rgba(255, 248, 220, 0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isHeavyPull && tension > 0.24) {
      var arcR = 17;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255, 240, 220, 0.22)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(ax, ay, arcR, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();

      ctx.strokeStyle = tension > 0.7 ? 'rgba(255, 122, 96, 0.92)' : 'rgba(255, 212, 136, 0.88)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(ax, ay, arcR, Math.PI * 0.15, Math.PI * (0.15 + 0.7 * Math.min(1, tension)));
      ctx.stroke();
    }

    ctx.strokeStyle = '#f5c982';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(h.x, h.y + 4, 6, 0, Math.PI * 1.3);
    ctx.stroke();
    ctx.restore();
  }

  function drawWakeLanterns(world, boat, t, viewLeft, viewRight) {
    var list = world.getWakeLanterns();
    list.forEach(function (wl) {
      var wlx = world.projectNear(wl.x, camX);
      if (wlx < viewLeft - 40 || wlx > viewRight + 40) return;
      var sy = world.getWaveHeight(wl.x, t, boat.parts.lantern) - 3;
      var a = Math.min(1, wl.life / 3);
      var g = ctx.createRadialGradient(wlx, sy, 1, wlx, sy, 22);
      g.addColorStop(0, 'rgba(255, 212, 128, ' + (0.75 * a) + ')');
      g.addColorStop(1, 'rgba(255, 212, 128, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(wlx, sy, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 236, 186, ' + a + ')';
      ctx.beginPath();
      ctx.roundRect(wlx - 3, sy - 5, 6, 7, 2);
      ctx.fill();
    });
  }

  function drawBoat(boat, t, endingMode) {
    var dir = boat.facing;

    // Phase 1 · 完美跃浪 / 穿风环滑翔时的冰蓝破风流光弧
    if (boat.crestFlash > 0.02 || boat.skyCombo > 0) {
      var aura = Math.max(boat.crestFlash || 0, boat.skyCombo > 0 ? 0.38 : 0);
      ctx.save();
      ctx.translate(boat.x, boat.y - 6);
      ctx.rotate(boat.angle);
      ctx.scale(dir, 1);
      ctx.strokeStyle = 'rgba(176, 234, 255, ' + (aura * 0.72) + ')';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(16, 0, 34, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();
      ctx.restore();
    }

    // 合成装船时的柔和暖金辉光脉冲
    if (boat.upgradeFlash > 0.02) {
      ctx.save();
      var ur = 55 + (1 - boat.upgradeFlash) * 40;
      var ug = ctx.createRadialGradient(boat.x, boat.y - 12, 4, boat.x, boat.y - 12, ur);
      ug.addColorStop(0, 'rgba(255, 236, 186, ' + (boat.upgradeFlash * 0.45) + ')');
      ug.addColorStop(1, 'rgba(255, 236, 186, 0)');
      ctx.fillStyle = ug;
      ctx.beginPath();
      ctx.arc(boat.x, boat.y - 12, ur, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 贴身极细暖光燃料弧
    if (boat.fuelHudAlpha > 0.02) {
      ctx.save();
      ctx.translate(boat.x, boat.y);
      var arcR = 46;
      var startA = Math.PI * 0.18;
      var endA = Math.PI * 0.82;
      var span = endA - startA;

      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255, 240, 220, ' + (0.18 * boat.fuelHudAlpha) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 6, arcR, startA, endA);
      ctx.stroke();

      var fuelColor = boat.fuelDepleted
        ? 'rgba(255, 134, 112, ' + (0.85 * boat.fuelHudAlpha) + ')'
        : 'rgba(255, 206, 132, ' + (0.88 * boat.fuelHudAlpha) + ')';
      ctx.strokeStyle = fuelColor;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, 6, arcR, startA, startA + span * Math.max(0.01, boat.fuel));
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(boat.x, boat.y);
    ctx.rotate(boat.angle);
    ctx.scale(dir, 1);

    if (boat.parts.balloon > 0 || boat.parts.lantern > 0) {
      ctx.strokeStyle = '#6b452d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-4, -8);
      ctx.lineTo(-4, -64);
      ctx.stroke();
    }

    if (boat.parts.balloon > 0) {
      var sway = boat.balloonSway * dir;
      if (boat.parts.balloon >= 2) {
        ctx.fillStyle = 'rgba(255, 236, 206, 0.78)';
        ctx.strokeStyle = 'rgba(180, 122, 92, 0.65)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-4, -60);
        ctx.quadraticCurveTo(22 + sway * 0.3, -44, 18 + sway * 0.2, -16);
        ctx.lineTo(-4, -18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      var bCount = boat.parts.balloon === 1 ? 3 : (boat.parts.balloon === 2 ? 5 : 7);
      for (var i = 0; i < bCount; i++) {
        var bx = -14 + (i % 4) * 9 + sway + Math.sin(t * 2.2 + i) * 3;
        var by = -78 - Math.floor(i / 4) * 14 - (i % 2) * 8 + Math.cos(t * 1.9 + i) * 2;
        ctx.strokeStyle = 'rgba(235, 240, 250, 0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-4, -58);
        ctx.quadraticCurveTo(-4 + sway * 0.4, -68, bx, by + 6);
        ctx.stroke();

        var bGrad = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, 8.5);
        bGrad.addColorStop(0, '#ffffff');
        bGrad.addColorStop(0.55, i % 2 === 0 ? '#b7e2ff' : '#f7d9c4');
        bGrad.addColorStop(1, '#7ea8cc');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.ellipse(bx, by, 7.5, 9, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (boat.parts.thruster > 0) {
      ctx.fillStyle = '#53455c';
      ctx.strokeStyle = '#d9b58b';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(-42, -14, 16, 11, 3);
      ctx.fill();
      ctx.stroke();

      if (boat.parts.thruster >= 2) {
        ctx.fillStyle = '#c8805a';
        ctx.beginPath();
        ctx.roundRect(-36, -22, 12, 8, 3);
        ctx.fill();
      }
      if (boat.parts.thruster >= 3) {
        ctx.strokeStyle = '#9be0ff';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(-43, -8, 7, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();
      }
      if (boat.boosting) {
        var flameLen = 18 + Math.random() * 16 + boat.parts.thruster * 6;
        var fGrad = ctx.createLinearGradient(-43, -8, -43 - flameLen, -8);
        fGrad.addColorStop(0, '#ffffff');
        fGrad.addColorStop(0.4, '#8ad9ff');
        fGrad.addColorStop(1, 'rgba(255, 146, 92, 0)');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.moveTo(-43, -13);
        ctx.lineTo(-43 - flameLen, -8);
        ctx.lineTo(-43, -3);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (boat.parts.gramophone > 0) {
      ctx.fillStyle = '#7e5534';
      ctx.fillRect(6, -15, 11, 8);
      ctx.fillStyle = '#e5be79';
      ctx.beginPath();
      ctx.moveTo(11, -15);
      ctx.quadraticCurveTo(14, -27, 24, -28);
      ctx.lineTo(22, -18);
      ctx.closePath();
      ctx.fill();
      if (boat.parts.gramophone >= 2) {
        ctx.strokeStyle = '#a9f0cc';
        ctx.lineWidth = 1.2;
        for (var ch = 0; ch < 3; ch++) {
          ctx.beginPath();
          ctx.moveTo(-10 + ch * 3, -44);
          ctx.lineTo(-10 + ch * 3 + Math.sin(t * 3 + ch) * 2, -34);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = '#33344f';
    ctx.beginPath();
    ctx.moveTo(-14, -8);
    ctx.quadraticCurveTo(-8, -28, -2, -28);
    ctx.quadraticCurveTo(4, -28, 5, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f5dfc8';
    ctx.beginPath();
    ctx.arc(-5, -32, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e68c65';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, -27);
    ctx.quadraticCurveTo(-18, -28 + Math.sin(boat.scarfPhase) * 4, -28, -24 + Math.cos(boat.scarfPhase) * 5);
    ctx.stroke();

    var hullGrad = ctx.createLinearGradient(0, -10, 0, 12);
    hullGrad.addColorStop(0, '#8d5939');
    hullGrad.addColorStop(1, '#4c2c1b');
    ctx.fillStyle = hullGrad;
    ctx.strokeStyle = '#c89468';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-36, -8);
    ctx.quadraticCurveTo(0, -4, 40, -10);
    ctx.quadraticCurveTo(32, 10, 18, 11);
    ctx.lineTo(-22, 11);
    ctx.quadraticCurveTo(-34, 8, -36, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    var oarAng = Math.sin(boat.oarPhase) * 0.55;
    ctx.strokeStyle = '#b9855a';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-4, -10);
    ctx.lineTo(-4 + Math.sin(oarAng) * 18, 15 + Math.cos(oarAng) * 6);
    ctx.stroke();

    if (boat.parts.lantern > 0) {
      ctx.strokeStyle = 'rgba(245, 208, 152, 0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-4, -52);
      ctx.quadraticCurveTo(16, -28, 36, -12);
      ctx.stroke();

      var lCount = boat.parts.lantern + 2;
      for (var li = 0; li < lCount; li++) {
        var u = (li + 1) / (lCount + 1);
        var lx = (1 - u) * (1 - u) * (-4) + 2 * (1 - u) * u * 16 + u * u * 36;
        var ly = (1 - u) * (1 - u) * (-52) + 2 * (1 - u) * u * (-28) + u * u * (-12) + 4;
        var lg = ctx.createRadialGradient(lx, ly, 1, lx, ly, 14);
        lg.addColorStop(0, 'rgba(255, 222, 142, 0.85)');
        lg.addColorStop(1, 'rgba(255, 178, 86, 0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(lx, ly, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffdf9e';
        ctx.beginPath();
        ctx.ellipse(lx, ly, 3.2, 4.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = '#c89468';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(35, -9);
    ctx.quadraticCurveTo(44, -22, 47, -18);
    ctx.stroke();

    var lampX = 47;
    var lampY = -12;
    var flicker = 0.92 + 0.08 * Math.sin(t * 7.2);
    var glowR = (42 + boat.parts.lantern * 18) * flicker;
    var lampGlow = ctx.createRadialGradient(lampX, lampY, 2, lampX, lampY, glowR);
    lampGlow.addColorStop(0, 'rgba(255, 232, 168, 0.92)');
    lampGlow.addColorStop(0.35, 'rgba(255, 176, 88, 0.42)');
    lampGlow.addColorStop(1, 'rgba(255, 156, 70, 0)');
    ctx.fillStyle = lampGlow;
    ctx.beginPath();
    ctx.arc(lampX, lampY, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff5d6';
    ctx.beginPath();
    ctx.roundRect(lampX - 3, lampY - 4, 6, 8, 2);
    ctx.fill();

    ctx.restore();
  }

  function drawParticles(world) {
    var list = world.getParticles();
    ctx.save();
    list.forEach(function (pt) {
      var a = Math.max(0, pt.life / pt.maxLife);
      if (pt.kind === 'ring') {
        ctx.strokeStyle = pt.color || '#a9f0cc';
        ctx.globalAlpha = a * 0.55;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (pt.kind === 'steam') {
        ctx.globalAlpha = a * 0.34;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = a * 0.88;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  return {
    init: init,
    resize: resize,
    render: render,
    screenToWorld: screenToWorld,
    getCamera: function () { return { x: camX, y: camY, zoom: camZoom }; }
  };
})();
