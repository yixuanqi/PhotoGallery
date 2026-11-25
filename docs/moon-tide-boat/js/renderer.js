window.MT = window.MT || {};

window.MT.Renderer = (function () {
  var canvas = null;
  var ctx = null;
  var dpr = 1;
  var W = 1280;
  var H = 720;

  var camX = 0;
  var camY = 0;

  // 离屏纹理缓存（启动生成一次，144Hz 零 GC）
  var moonCanvas = null;
  var paperPattern = null;
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

  function samplePalette(tide) {
    var P = window.MT.Config.PALETTES;
    var p1, p2, localT;
    if (tide < 0.5) {
      p1 = P[0];
      p2 = P[1];
      localT = tide * 2;
    } else {
      p1 = P[1];
      p2 = P[2];
      localT = (tide - 0.5) * 2;
    }
    var out = {};
    Object.keys(p1).forEach(function (k) {
      out[k] = lerpColor(p1[k], p2[k], localT);
    });
    return out;
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

  // 象牙暖金水彩月球纹理缓存
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

    // 柔和暖灰月海晕染
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

    // 淡笔环形山
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

    // 柔润边沿亮晕
    var rim = g.createRadialGradient(cx, cy, r * 0.8, cx, cy, r);
    rim.addColorStop(0, 'rgba(255,255,255,0)');
    rim.addColorStop(0.92, 'rgba(255, 248, 232, 0.36)');
    rim.addColorStop(1, 'rgba(204, 174, 134, 0.28)');
    g.fillStyle = rim;
    g.fillRect(0, 0, size, size);
    g.restore();

    moonCanvas = c;
  }

  function seedSkyDecor() {
    stars = [];
    for (var i = 0; i < 95; i++) {
      stars.push({
        nx: Math.random(),
        ny: Math.random() * 0.56,
        r: 0.6 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
        speed: 0.7 + Math.random() * 1.6
      });
    }

    backClouds = [];
    frontClouds = [];
    for (var c = 0; c < 7; c++) {
      backClouds.push({
        x: Math.random() * 1.4 - 0.2,
        y: 0.16 + Math.random() * 0.28,
        w: 170 + Math.random() * 190,
        h: 26 + Math.random() * 24,
        speed: 0.004 + Math.random() * 0.004,
        alpha: 0.16 + Math.random() * 0.12
      });
    }
    for (var f = 0; f < 5; f++) {
      frontClouds.push({
        x: Math.random() * 1.4 - 0.2,
        y: 0.22 + Math.random() * 0.22,
        w: 150 + Math.random() * 170,
        h: 20 + Math.random() * 18,
        speed: 0.008 + Math.random() * 0.007,
        alpha: 0.22 + Math.random() * 0.14
      });
    }
  }

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    buildPaperPattern();
    buildMoonSprite();
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
  }

  function getSeaBaseY() {
    return H * 0.62;
  }

  function screenToWorld(sx, sy) {
    var seaBaseY = getSeaBaseY();
    return {
      x: sx - W * 0.5 + camX,
      y: sy - seaBaseY + camY
    };
  }

  function drawWatercolorCloud(cx, cy, w, h, color, alpha) {
    ctx.save();
    ctx.fillStyle = rgb(color, alpha);
    var puffs = [
      { ox: -0.34, oy: 0.12, rx: 0.28, ry: 0.72 },
      { ox: -0.1, oy: -0.14, rx: 0.34, ry: 1.0 },
      { ox: 0.18, oy: -0.04, rx: 0.3, ry: 0.85 },
      { ox: 0.38, oy: 0.16, rx: 0.24, ry: 0.64 }
    ];
    puffs.forEach(function (pf) {
      ctx.beginPath();
      ctx.ellipse(cx + pf.ox * w, cy + pf.oy * h, pf.rx * w, pf.ry * h, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function render(dt, endingMode) {
    var world = window.MT.World;
    var boat = window.MT.Boat.getState();
    var t = world.getTime();
    var tide = world.getTide();
    var pal = samplePalette(tide);
    var seaBaseY = getSeaBaseY();

    // 平滑镜头跟随（带航向预判和空中轻柔抬头）
    var targetCamX = boat.x + boat.facing * Math.min(110, W * 0.08);
    var targetCamY = Math.min(0, boat.y * 0.48);
    camX += (targetCamX - camX) * Math.min(1, dt * 3.8);
    camY += (targetCamY - camY) * Math.min(1, dt * 3.2);

    // 1. 暮光水彩天空渐变（顶部靛蓝 -> 中段暮紫 -> 地平暖杏金）
    var skyGrad = ctx.createLinearGradient(0, 0, 0, seaBaseY + 30);
    skyGrad.addColorStop(0, rgb(pal.skyTop));
    skyGrad.addColorStop(0.56, rgb(pal.skyMid));
    skyGrad.addColorStop(1, rgb(pal.skyHorizon));
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. 柔光星点
    stars.forEach(function (st) {
      var tw = 0.4 + 0.6 * Math.sin(t * st.speed + st.phase);
      ctx.fillStyle = 'rgba(255, 248, 232, ' + (tw * 0.62) + ')';
      ctx.beginPath();
      ctx.arc(st.nx * W, st.ny * seaBaseY, st.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. 后景流云
    backClouds.forEach(function (cl) {
      var x = (((cl.x + t * cl.speed - camX * 0.00004) % 1.4) + 1.4) % 1.4 - 0.2;
      drawWatercolorCloud(x * W, cl.y * seaBaseY, cl.w, cl.h, pal.cloudTint, cl.alpha);
    });

    // 4. 暖象牙金巨型月球（随潮汐进度从小到大压迫但不冰冷）
    var baseUnit = Math.min(W, H);
    var moonR = baseUnit * (0.11 + tide * 0.21);
    var moonX = W * 0.62 - (camX * 0.008) % (W * 0.25);
    var moonY = seaBaseY * (0.44 - tide * 0.04) - camY * 0.14;

    // 柔暖多层月晕
    var halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.7, moonX, moonY, moonR * 3.4);
    halo.addColorStop(0, 'rgba(255, 235, 194, ' + (0.28 + tide * 0.14) + ')');
    halo.addColorStop(0.45, 'rgba(235, 186, 152, ' + (0.12 + tide * 0.06) + ')');
    halo.addColorStop(1, 'rgba(235, 186, 152, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, seaBaseY + 80);

    var moonDrawSize = moonR / 0.44;
    ctx.drawImage(moonCanvas, moonX - moonDrawSize / 2, moonY - moonDrawSize / 2, moonDrawSize, moonDrawSize);

    // 5. 前景半透明水彩流云（轻轻遮过巨月前缘，立住空间纵深）
    frontClouds.forEach(function (cl) {
      var x = (((cl.x + t * cl.speed - camX * 0.00009) % 1.4) + 1.4) % 1.4 - 0.2;
      drawWatercolorCloud(x * W, cl.y * seaBaseY, cl.w, cl.h, pal.cloudTint, cl.alpha);
    });

    // 6. 雾化远景地标（半沉灯塔、断桥拱、飘浮小岛）
    drawFarLandmarks(world, pal, seaBaseY, t, tide);

    // 7. 远景潮汐光柱（结局召唤点）
    drawTidePillar(world, seaBaseY, t);

    // 8. 天降人类残骸火光尾迹
    drawSkyMeteors(world, seaBaseY);

    // 9. 远海背景波浪层
    drawWaveLayer(seaBaseY - 12, t * 0.75, 0.22, 10, pal.farSea, 0.72, false);

    // 10. 主海面 + 半透明水下世界（海带、月光柱、水母、发光残骸）
    drawMainSeaAndUnderwater(world, boat, pal, seaBaseY, t, tide, moonX);

    // 11. 铁钩与绳索
    drawHook(boat, seaBaseY);

    // 12. 尾流漂流灯（灯火系特技）
    drawWakeLanterns(world, boat, seaBaseY, t);

    // 13. 孤舟本体与所有实体拼装挂件
    drawBoat(boat, seaBaseY, t, endingMode);

    // 14. 前景暗色半透明浪花层（包覆船底，产生真实吃水感）
    drawWaveLayer(seaBaseY + 18, t * 1.25 + 2.1, 1.08, 16, pal.frontSea, 0.62, true);

    // 15. 粒子（水花、推进火花、声波光环、失重上浮水珠）
    drawParticles(world, seaBaseY);

    // 16. 轻微水彩画纸肌理叠层
    if (paperPattern) {
      ctx.fillStyle = paperPattern;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawFarLandmarks(world, pal, seaBaseY, t, tide) {
    var list = world.getLandmarks();
    var fogColor = lerpColor(pal.skyHorizon, pal.farSea, 0.52);
    ctx.save();
    ctx.fillStyle = rgb(fogColor, 0.55);

    list.forEach(function (lm) {
      var sx = (lm.x - camX * 0.28) + W * 0.5;
      if (sx < -220 || sx > W + 220) return;
      var by = seaBaseY - 4 - camY * 0.35;
      var sc = lm.scale;

      if (lm.type === 'lighthouse') {
        ctx.beginPath();
        ctx.moveTo(sx - 12 * sc, by);
        ctx.lineTo(sx - 7 * sc, by - 58 * sc);
        ctx.lineTo(sx + 7 * sc, by - 58 * sc);
        ctx.lineTo(sx + 12 * sc, by);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx, by - 62 * sc, 9 * sc, Math.PI, 0);
        ctx.fill();
        // 远处灯塔微弱暖点
        var pulse = 0.45 + 0.55 * Math.sin(t * 1.8 + lm.x);
        ctx.fillStyle = 'rgba(255, 224, 162, ' + (0.55 * pulse) + ')';
        ctx.beginPath();
        ctx.arc(sx, by - 59 * sc, 3.2 * sc, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb(fogColor, 0.55);
      } else if (lm.type === 'arch') {
        // 半沉入海的石桥残拱
        for (var a = -1; a <= 1; a++) {
          var ax = sx + a * 42 * sc;
          ctx.beginPath();
          ctx.arc(ax, by + 6, 18 * sc, Math.PI, 0);
          ctx.lineTo(ax + 24 * sc, by + 6);
          ctx.lineTo(ax + 24 * sc, by - 24 * sc);
          ctx.lineTo(ax - 24 * sc, by - 24 * sc);
          ctx.lineTo(ax - 24 * sc, by + 6);
          ctx.closePath();
          ctx.fill();
        }
      } else if (lm.type === 'island') {
        // 随月球引力微微浮空的远方小石岛
        var lift = tide > 0.35 ? (tide - 0.35) * 65 + Math.sin(t + lm.x) * 4 : 0;
        var iy = by - 16 * sc - lift;
        ctx.beginPath();
        ctx.ellipse(sx, iy, 36 * sc, 11 * sc, 0, Math.PI, 0);
        ctx.lineTo(sx + 18 * sc, iy + 18 * sc);
        ctx.lineTo(sx - 12 * sc, iy + 22 * sc);
        ctx.closePath();
        ctx.fill();
      } else {
        // 半沉的旧观测塔架
        ctx.fillRect(sx - 18 * sc, by - 24 * sc, 36 * sc, 28 * sc);
        ctx.beginPath();
        ctx.arc(sx, by - 24 * sc, 16 * sc, Math.PI, 0);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  function drawTidePillar(world, seaBaseY, t) {
    var p = world.getPillar();
    if (!p.active) return;
    var sx = p.x - camX + W * 0.5;
    if (sx < -260 || sx > W + 260) return;

    ctx.save();
    var w = 105 + Math.sin(t * 2) * 10;
    var grad = ctx.createLinearGradient(sx - w, 0, sx + w, 0);
    grad.addColorStop(0, 'rgba(255, 240, 200, 0)');
    grad.addColorStop(0.5, 'rgba(255, 242, 206, 0.28)');
    grad.addColorStop(1, 'rgba(255, 240, 200, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx - w, 0, w * 2, seaBaseY + 30 - camY);

    // 上升的水光细丝
    ctx.strokeStyle = 'rgba(255, 246, 224, 0.42)';
    ctx.lineWidth = 1.5;
    for (var i = -2; i <= 2; i++) {
      var lx = sx + i * 18 + Math.sin(t * 1.8 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(lx, seaBaseY + 10 - camY);
      ctx.lineTo(lx + Math.sin(t + i) * 14, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSkyMeteors(world, seaBaseY) {
    var list = world.getSkyMeteors();
    ctx.save();
    list.forEach(function (m) {
      if (m.trail.length < 2) return;
      for (var i = 1; i < m.trail.length; i++) {
        var p0 = m.trail[i - 1];
        var p1 = m.trail[i];
        var a = i / m.trail.length;
        ctx.strokeStyle = 'rgba(255, 214, 152, ' + (a * 0.78) + ')';
        ctx.lineWidth = a * 3.5;
        ctx.beginPath();
        ctx.moveTo(p0.x - camX + W * 0.5, p0.y + seaBaseY - camY);
        ctx.lineTo(p1.x - camX + W * 0.5, p1.y + seaBaseY - camY);
        ctx.stroke();
      }
      var sx = m.x - camX + W * 0.5;
      var sy = m.y + seaBaseY - camY;
      ctx.fillStyle = '#fff5dc';
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawWaveLayer(baseY, tShift, parallax, amp, color, alpha, foam) {
    ctx.save();
    ctx.beginPath();
    var step = 22;
    for (var sx = -step; sx <= W + step; sx += step) {
      var wx = sx + camX * parallax;
      var y = baseY - camY * (parallax > 0.5 ? 1 : 0.45) +
        Math.sin(wx * 0.006 + tShift) * amp +
        Math.sin(wx * 0.015 - tShift * 1.4) * (amp * 0.35);
      if (sx === -step) ctx.moveTo(sx, y);
      else ctx.lineTo(sx, y);
    }
    ctx.lineTo(W + step, H + 40);
    ctx.lineTo(-step, H + 40);
    ctx.closePath();
    ctx.fillStyle = rgb(color, alpha);
    ctx.fill();

    if (foam) {
      ctx.strokeStyle = 'rgba(255, 240, 214, 0.22)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (var fx = -step; fx <= W + step; fx += step) {
        var fwx = fx + camX * parallax;
        var fy = baseY - camY +
          Math.sin(fwx * 0.006 + tShift) * amp +
          Math.sin(fwx * 0.015 - tShift * 1.4) * (amp * 0.35);
        if (fx === -step) ctx.moveTo(fx, fy);
        else ctx.lineTo(fx, fy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMainSeaAndUnderwater(world, boat, pal, seaBaseY, t, tide, moonX) {
    ctx.save();

    // 构造主波浪剪裁路径
    ctx.beginPath();
    var step = 16;
    for (var sx = -step; sx <= W + step; sx += step) {
      var wx = sx - W * 0.5 + camX;
      var wy = seaBaseY - camY + world.getWaveHeight(wx, t, boat.parts.lantern);
      if (sx === -step) ctx.moveTo(sx, wy);
      else ctx.lineTo(sx, wy);
    }
    ctx.lineTo(W + step, H + 60);
    ctx.lineTo(-step, H + 60);
    ctx.closePath();

    var seaGrad = ctx.createLinearGradient(0, seaBaseY - 25 - camY, 0, H);
    seaGrad.addColorStop(0, rgb(pal.midSeaTop, 0.88));
    seaGrad.addColorStop(0.55, rgb(lerpColor(pal.midSeaTop, pal.midSeaDeep, 0.65), 0.94));
    seaGrad.addColorStop(1, rgb(pal.midSeaDeep, 0.98));
    ctx.fillStyle = seaGrad;
    ctx.fill();

    // 在海水内部绘制水下世界（剪裁在波浪以下）
    ctx.save();
    ctx.clip();

    // 水下柔和月光体积光束
    for (var b = -1; b <= 1; b++) {
      var bx = moonX + b * 110;
      var beamGrad = ctx.createLinearGradient(bx, seaBaseY - camY, bx - 40, H);
      beamGrad.addColorStop(0, 'rgba(255, 240, 206, 0.11)');
      beamGrad.addColorStop(1, 'rgba(255, 240, 206, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(bx - 35, seaBaseY - 30 - camY);
      ctx.lineTo(bx + 35, seaBaseY - 30 - camY);
      ctx.lineTo(bx + 75, H);
      ctx.lineTo(bx - 95, H);
      ctx.closePath();
      ctx.fill();
    }

    // 船头暖灯投射到水下的暖金色光域（灯火系升级后会变大更明亮）
    var boatSx = boat.x - camX + W * 0.5;
    var boatSy = boat.y + seaBaseY - camY;
    var lanternR = 120 + boat.parts.lantern * 68;
    var warmWater = ctx.createRadialGradient(boatSx + boat.facing * 26, boatSy + 18, 12, boatSx + boat.facing * 26, boatSy + 48, lanternR);
    warmWater.addColorStop(0, 'rgba(255, 206, 122, ' + (0.26 + boat.parts.lantern * 0.08) + ')');
    warmWater.addColorStop(1, 'rgba(255, 206, 122, 0)');
    ctx.fillStyle = warmWater;
    ctx.fillRect(boatSx - lanternR - 40, boatSy - 30, lanternR * 2 + 120, lanternR + 120);

    // 发光水母
    world.getJellyfish().forEach(function (j) {
      var jx = j.x - camX + W * 0.5;
      if (jx < -50 || jx > W + 50) return;
      var jy = seaBaseY - camY + j.depth;
      var pulse = 0.72 + 0.28 * Math.sin(j.phase);
      ctx.fillStyle = j.hue + (0.28 * pulse) + ')';
      ctx.beginPath();
      ctx.arc(jx, jy, j.size * (0.9 + 0.14 * pulse), Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = j.hue + (0.22 * pulse) + ')';
      ctx.lineWidth = 1;
      for (var tt = -1; tt <= 1; tt++) {
        ctx.beginPath();
        ctx.moveTo(jx + tt * j.size * 0.35, jy);
        ctx.quadraticCurveTo(jx + tt * j.size * 0.4 + Math.sin(j.phase + tt) * 4, jy + j.size * 0.8, jx + tt * j.size * 0.3, jy + j.size * 1.4);
        ctx.stroke();
      }
    });

    // 水下发光残骸（可打捞目标）
    world.getRelics().forEach(function (r) {
      var rx = r.x - camX + W * 0.5;
      if (rx < -80 || rx > W + 80) return;
      var waveAtR = world.getWaveHeight(r.x, t, boat.parts.lantern);
      var ry = seaBaseY - camY + waveAtR + r.depth + (r.caught ? 0 : Math.sin(r.bobPhase) * 6);

      var gRad = ctx.createRadialGradient(rx, ry, 2, rx, ry, 34);
      gRad.addColorStop(0, r.glow);
      gRad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gRad;
      ctx.beginPath();
      ctx.arc(rx, ry, 34, 0, Math.PI * 2);
      ctx.fill();

      drawRelicIcon(rx, ry, r, t);
    });

    // 海面碎裂的月光波光倒影
    for (var m = 0; m < 12; m++) {
      var p = m / 12;
      var my = seaBaseY - camY + 6 + p * 75;
      var mw = (26 + p * 68) * (0.65 + 0.35 * Math.sin(t * 1.7 + m * 1.9));
      var mx = moonX + Math.sin(t * 1.3 + m * 2.1) * 14;
      ctx.fillStyle = 'rgba(255, 240, 208, ' + ((1 - p) * 0.32) + ')';
      ctx.fillRect(mx - mw / 2, my, mw, 2);
    }

    ctx.restore();

    // 主波浪边缘暖银色高光细线
    ctx.strokeStyle = 'rgba(255, 236, 206, 0.48)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var hx = -step; hx <= W + step; hx += step) {
      var hwx = hx - W * 0.5 + camX;
      var hwy = seaBaseY - camY + world.getWaveHeight(hwx, t, boat.parts.lantern);
      if (hx === -step) ctx.moveTo(hx, hwy);
      else ctx.lineTo(hx, hwy);
    }
    ctx.stroke();

    ctx.restore();
  }

  function drawRelicIcon(rx, ry, r, t) {
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(Math.sin(t + r.id) * 0.22);
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
      // 漂流瓶
      ctx.beginPath();
      ctx.roundRect(-5, -8, 10, 16, 4);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHook(boat, seaBaseY) {
    var h = boat.hook;
    if (h.mode === 'idle') return;
    var ax = boat.x + Math.cos(boat.angle) * boat.facing * 24 - camX + W * 0.5;
    var ay = boat.y + Math.sin(boat.angle) * boat.facing * 24 + 4 + seaBaseY - camY;
    var hx = h.x - camX + W * 0.5;
    var hy = h.y + seaBaseY - camY;

    ctx.save();
    ctx.strokeStyle = 'rgba(245, 224, 186, 0.72)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo((ax + hx) * 0.5 - boat.vx * 0.04, (ay + hy) * 0.5 + 14, hx, hy);
    ctx.stroke();

    // 铜制小钩
    ctx.strokeStyle = '#f5c982';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(hx, hy + 4, 6, 0, Math.PI * 1.3);
    ctx.stroke();
    ctx.restore();
  }

  function drawWakeLanterns(world, boat, seaBaseY, t) {
    var list = world.getWakeLanterns();
    list.forEach(function (wl) {
      var sx = wl.x - camX + W * 0.5;
      if (sx < -40 || sx > W + 40) return;
      var sy = seaBaseY - camY + world.getWaveHeight(wl.x, t, boat.parts.lantern) - 3;
      var a = Math.min(1, wl.life / 3);
      var g = ctx.createRadialGradient(sx, sy, 1, sx, sy, 22);
      g.addColorStop(0, 'rgba(255, 212, 128, ' + (0.75 * a) + ')');
      g.addColorStop(1, 'rgba(255, 212, 128, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 236, 186, ' + a + ')';
      ctx.beginPath();
      ctx.roundRect(sx - 3, sy - 5, 6, 7, 2);
      ctx.fill();
    });
  }

  function drawBoat(boat, seaBaseY, t, endingMode) {
    var sx = boat.x - camX + W * 0.5;
    var sy = boat.y + seaBaseY - camY;
    var dir = boat.facing;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(boat.angle);
    ctx.scale(dir, 1);

    // 1. 桅杆与浮空系挂件（气球束 + 彩绘风筝帆）
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
      // 2级起展开暖色手绘风筝布帆
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

    // 2. 船尾推进系挂件
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

    // 3. 甲板共振系挂件（旋转黄铜留声机）
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
        // 桅杆挂风铃
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

    // 4. 船上孤独的小主角（披风 + 随风飘动的围巾）
    ctx.fillStyle = '#33344f';
    ctx.beginPath();
    ctx.moveTo(-14, -8);
    ctx.quadraticCurveTo(-8, -28, -2, -28);
    ctx.quadraticCurveTo(4, -28, 5, -8);
    ctx.closePath();
    ctx.fill();
    // 脑袋与草帽/兜帽
    ctx.fillStyle = '#f5dfc8';
    ctx.beginPath();
    ctx.arc(-5, -32, 5.2, 0, Math.PI * 2);
    ctx.fill();
    // 暖橘围巾随风飘扬
    ctx.strokeStyle = '#e68c65';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, -27);
    ctx.quadraticCurveTo(-18, -28 + Math.sin(boat.scarfPhase) * 4, -28, -24 + Math.cos(boat.scarfPhase) * 5);
    ctx.stroke();

    // 5. 木舟船身（暖木色弧形手工船壳）
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

    // 木桨划动动画
    var oarAng = Math.sin(boat.oarPhase) * 0.55;
    ctx.strokeStyle = '#b9855a';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-4, -10);
    ctx.lineTo(-4 + Math.sin(oarAng) * 18, 15 + Math.cos(oarAng) * 6);
    ctx.stroke();

    // 6. 船舷灯火系挂件（纸灯笼串）
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

    // 7. 船头标志性暖橘煤油灯（整幅画面的温暖锚点）
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

  function drawParticles(world, seaBaseY) {
    var list = world.getParticles();
    ctx.save();
    list.forEach(function (pt) {
      var sx = pt.x - camX + W * 0.5;
      var sy = pt.y + seaBaseY - camY;
      var a = Math.max(0, pt.life / pt.maxLife);
      if (pt.kind === 'ring') {
        ctx.strokeStyle = 'rgba(169, 240, 204, ' + (a * 0.52) + ')';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(sx, sy, pt.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.globalAlpha = a * 0.88;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(sx, sy, pt.size, 0, Math.PI * 2);
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
    getCamera: function () { return { x: camX, y: camY }; }
  };
})();
