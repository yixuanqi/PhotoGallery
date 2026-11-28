window.MT = window.MT || {};

// 手绘水彩与离屏遮罩精灵工厂（零外链、彻底消灭半透明泡泡叠层与重复贴图感）
window.MT.Art = (function () {
  var paperPattern = null;
  var moonSprite = null;
  var cloudSprites = [];
  var lampGlowSprite = null;
  var softBeamSprite = null;
  var glowSprites = {};
  var bubbleSprite = null;
  var sunbeamSprite = null;
  var smokePuffSprite = null;
  var treeSprites = { giant: [], sapling: [], pine: [], bush: [] };
  var mountainSprites = {};
  var worldTreeSprite = null;

  function hash1(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function lerpColor(c1, c2, t) {
    return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
  }

  function rgb(c, a) {
    var r = Math.round(c[0]), g = Math.round(c[1]), b = Math.round(c[2]);
    return typeof a === 'number'
      ? 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'
      : 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function inkLine(ctx, x0, y0, x1, y1, seed, amp) {
    var dist = Math.hypot(x1 - x0, y1 - y0);
    var segs = Math.max(2, Math.min(10, Math.round(dist / 16)));
    var jitter = typeof amp === 'number' ? amp : 0.9;
    var nx = dist > 0.01 ? -(y1 - y0) / dist : 0;
    var ny = dist > 0.01 ? (x1 - x0) / dist : 0;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (var i = 1; i < segs; i++) {
      var u = i / segs;
      var w = (hash1((seed || 1) * 19.3 + i * 7.1) - 0.5) * 2 * jitter;
      ctx.lineTo(lerp(x0, x1, u) + nx * w, lerp(y0, y1, u) + ny * w);
    }
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  function traceSmoothSpline(ctx, pts, closeBottom, leftX, rightX, bottomY) {
    if (!pts || pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i].x + pts[i + 1].x) * 0.5;
      var my = (pts[i].y + pts[i + 1].y) * 0.5;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    var last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    if (closeBottom) {
      ctx.lineTo(rightX, bottomY);
      ctx.lineTo(leftX, bottomY);
      ctx.closePath();
    }
  }

  function drawRoundedRect(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') { ctx.roundRect(x, y, w, h, r); return; }
    var rr = Math.max(0, Math.min(r || 0, Math.abs(w) * 0.5, Math.abs(h) * 0.5));
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  // 有机手绘水彩斑块（仅在离屏 100% 不透明遮罩内绘制，杜绝半透明泡泡叠边）
  function watercolorBlob(ctx, cx, cy, rx, ry, seed, fillStyle) {
    var steps = 14;
    var pts = [];
    for (var i = 0; i < steps; i++) {
      var a = (i / steps) * Math.PI * 2;
      var wob = 0.80 + hash1((seed || 1) * 13.7 + i * 5.3) * 0.40;
      pts.push({ x: cx + Math.cos(a) * rx * wob, y: cy + Math.sin(a) * ry * wob });
    }
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo((pts[steps - 1].x + pts[0].x) * 0.5, (pts[steps - 1].y + pts[0].y) * 0.5);
    for (var j = 0; j < steps; j++) {
      var nxt = pts[(j + 1) % steps];
      ctx.quadraticCurveTo(pts[j].x, pts[j].y, (pts[j].x + nxt.x) * 0.5, (pts[j].y + nxt.y) * 0.5);
    }
    ctx.closePath();
    ctx.fill();
  }

  // 在不透明叶冠遮罩上绘制宫崎骏绘本风柔和叶簇花边（彻底告别仙人掌尖刺边缘！）
  function stampLeafClusterMask(g, cx, cy, rx, ry, seed) {
    watercolorBlob(g, cx, cy, rx * 0.96, ry * 0.94, seed, '#ffffff');
    var tufts = 14;
    g.fillStyle = '#ffffff';
    for (var i = 0; i < tufts; i++) {
      var ang = (i / tufts) * Math.PI * 2 + hash1(seed + i * 2.1) * 0.32;
      var dist = 0.68 + hash1(seed * 3.1 + i * 4.7) * 0.24;
      var lx = cx + Math.cos(ang) * rx * dist;
      var ly = cy + Math.sin(ang) * ry * dist;
      // 柔和饱满的圆润叶丛剪影，略微顺切线舒展而非向外扎刺
      var trX = (rx + ry) * 0.17 * (0.72 + hash1(seed + i * 7.7) * 0.45);
      var trY = trX * (0.64 + hash1(seed + i * 11.3) * 0.24);
      g.save();
      g.translate(lx, ly);
      g.rotate(ang + Math.PI * 0.5 + (hash1(seed + i * 5.9) - 0.5) * 0.45);
      g.beginPath();
      g.ellipse(0, 0, trX, trY, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }

  // 1. 细腻冷压水彩画纸肌理
  function buildPaperPattern(ctx) {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    var g = c.getContext('2d');
    var img = g.createImageData(256, 256);
    for (var i = 0; i < img.data.length; i += 4) {
      var grain = 226 + Math.floor((Math.random() - 0.5) * 40);
      img.data[i] = grain;
      img.data[i + 1] = grain - 3;
      img.data[i + 2] = grain - 8;
      img.data[i + 3] = Math.floor(Math.random() * 10);
    }
    g.putImageData(img, 0, 0);
    paperPattern = ctx.createPattern(c, 'repeat');
  }

  // 2. 柔边手绘水彩满月（外缘自然晕融进暮光夜空 + 层次丰富的不规则水彩月海，彻底告别圆贴纸感！）
  function buildMoonSprite() {
    var size = 512;
    var c = document.createElement('canvas');
    c.width = size; c.height = size;
    var g = c.getContext('2d');
    var cx = size * 0.5, cy = size * 0.5, r = size * 0.42;

    // 独立画布绘制柔边月面主体
    var bodyC = document.createElement('canvas');
    bodyC.width = size; bodyC.height = size;
    var bg = bodyC.getContext('2d');

    var baseGrad = bg.createRadialGradient(cx - r * 0.26, cy - r * 0.28, r * 0.05, cx, cy, r * 1.04);
    baseGrad.addColorStop(0.00, '#fffef7');
    baseGrad.addColorStop(0.45, '#f9edd2');
    baseGrad.addColorStop(0.78, '#e6cba6');
    baseGrad.addColorStop(1.00, '#caa88a');
    bg.fillStyle = baseGrad;
    bg.beginPath(); bg.arc(cx, cy, r * 1.02, 0, Math.PI * 2); bg.fill();

    // 纯径向柔雾渐变月海晕染（完全不依赖 ctx.filter，在任何浏览器与无头引擎下都清透无硬边灰块！）
    var softMaria = [
      { x: -0.28, y: -0.18, rx: 0.42, ry: 0.30, rot: -0.32, rgb: '154,132,126', a: 0.15 },
      { x: -0.05, y: -0.32, rx: 0.32, ry: 0.24, rot:  0.22, rgb: '162,138,124', a: 0.12 },
      { x:  0.24, y: -0.12, rx: 0.38, ry: 0.30, rot:  0.34, rgb: '146,128,134', a: 0.16 },
      { x:  0.28, y:  0.20, rx: 0.36, ry: 0.26, rot: -0.22, rgb: '152,132,128', a: 0.13 },
      { x: -0.26, y:  0.24, rx: 0.32, ry: 0.24, rot:  0.38, rgb: '158,138,130', a: 0.11 },
      { x:  0.04, y:  0.34, rx: 0.34, ry: 0.22, rot: -0.14, rgb: '148,130,132', a: 0.10 }
    ];
    softMaria.forEach(function (m) {
      bg.save();
      bg.translate(cx + m.x * r, cy + m.y * r);
      bg.rotate(m.rot);
      bg.scale(m.rx, m.ry);
      var mg = bg.createRadialGradient(0, 0, 0, 0, 0, r);
      mg.addColorStop(0.00, 'rgba(' + m.rgb + ',' + m.a + ')');
      mg.addColorStop(0.48, 'rgba(' + m.rgb + ',' + (m.a * 0.55) + ')');
      mg.addColorStop(1.00, 'rgba(' + m.rgb + ',0)');
      bg.fillStyle = mg;
      bg.beginPath(); bg.arc(0, 0, r, 0, Math.PI * 2); bg.fill();
      bg.restore();
    });

    // 淡雅象牙月面高地微光
    var hiSpots = [
      { x: -0.18, y: 0.42, rad: 0.26, a: 0.18 },
      { x:  0.34, y: -0.34, rad: 0.22, a: 0.16 }
    ];
    hiSpots.forEach(function (hs) {
      var hg = bg.createRadialGradient(cx + hs.x * r, cy + hs.y * r, 0, cx + hs.x * r, cy + hs.y * r, hs.rad * r);
      hg.addColorStop(0, 'rgba(255, 253, 244, ' + hs.a + ')');
      hg.addColorStop(1, 'rgba(255, 253, 244, 0)');
      bg.fillStyle = hg;
      bg.beginPath(); bg.arc(cx + hs.x * r, cy + hs.y * r, hs.rad * r, 0, Math.PI * 2); bg.fill();
    });

    // 右下侧轻柔暮光紫影，塑造温润球体层次
    var term = bg.createRadialGradient(cx + r * 0.56, cy + r * 0.48, r * 0.22, cx + r * 0.32, cy + r * 0.30, r * 1.15);
    term.addColorStop(0, 'rgba(84, 72, 108, 0.28)');
    term.addColorStop(0.55, 'rgba(104, 88, 116, 0.11)');
    term.addColorStop(1, 'rgba(104, 88, 116, 0)');
    bg.fillStyle = term;
    bg.fillRect(0, 0, size, size);

    // 关键：用径向羽化遮罩柔化月亮最外 6% 轮廓边缘，让月亮自然融进夜空雾气里！
    bg.globalCompositeOperation = 'destination-in';
    var feather = bg.createRadialGradient(cx, cy, r * 0.88, cx, cy, r * 1.01);
    feather.addColorStop(0.00, 'rgba(255,255,255,1)');
    feather.addColorStop(0.55, 'rgba(255,255,255,0.94)');
    feather.addColorStop(0.84, 'rgba(255,255,255,0.45)');
    feather.addColorStop(1.00, 'rgba(255,255,255,0)');
    bg.fillStyle = feather;
    bg.fillRect(0, 0, size, size);

    // 最终合成：外圈极柔大气暖晕 + 柔边月面主体
    var outerGlow = g.createRadialGradient(cx, cy, r * 0.78, cx, cy, size * 0.49);
    outerGlow.addColorStop(0.00, 'rgba(255, 244, 212, 0.42)');
    outerGlow.addColorStop(0.45, 'rgba(255, 224, 178, 0.16)');
    outerGlow.addColorStop(1.00, 'rgba(255, 214, 168, 0)');
    g.fillStyle = outerGlow;
    g.fillRect(0, 0, size, size);
    g.drawImage(bodyC, 0, 0);

    moonSprite = c;
  }

  // 3. 轻盈飘逸的横长水彩薄云（消除厚重灰团感）
  function buildCloudSprites() {
    cloudSprites = [];
    var presets = [
      [{ x: 0.22, y: 0.66, rx: 0.18, ry: 0.12 }, { x: 0.42, y: 0.56, rx: 0.24, ry: 0.18 }, { x: 0.65, y: 0.60, rx: 0.20, ry: 0.14 }, { x: 0.82, y: 0.67, rx: 0.14, ry: 0.09 }],
      [{ x: 0.18, y: 0.67, rx: 0.16, ry: 0.10 }, { x: 0.46, y: 0.58, rx: 0.28, ry: 0.15 }, { x: 0.74, y: 0.65, rx: 0.20, ry: 0.11 }],
      [{ x: 0.26, y: 0.65, rx: 0.20, ry: 0.13 }, { x: 0.52, y: 0.53, rx: 0.22, ry: 0.20 }, { x: 0.75, y: 0.64, rx: 0.18, ry: 0.12 }]
    ];
    presets.forEach(function (puffs) {
      var cw = 420, ch = 120;
      var c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      var g = c.getContext('2d');
      // 纯柔边径向梯度云团（不依赖 ctx.filter 也能自然羽化，零生硬叠边！）
      puffs.forEach(function (pf) {
        g.save();
        g.translate(pf.x * cw, pf.y * ch);
        g.scale(pf.rx * cw, pf.ry * ch);
        var gr = g.createRadialGradient(0, -0.22, 0.08, 0, 0, 1.0);
        gr.addColorStop(0.00, 'rgba(255, 248, 242, 0.52)');
        gr.addColorStop(0.55, 'rgba(242, 226, 224, 0.26)');
        gr.addColorStop(1.00, 'rgba(236, 214, 214, 0)');
        g.fillStyle = gr;
        g.beginPath(); g.arc(0, 0, 1.0, 0, Math.PI * 2); g.fill();
        g.restore();
      });
      cloudSprites.push(c);
    });
  }

  // 4. 柔和羽化暖灯光晕、丁达尔光束、烟羽贴图
  function buildLampGlowSprite() {
    var s = 192;
    var c = document.createElement('canvas');
    c.width = s; c.height = s;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(s * 0.5, s * 0.5, 2, s * 0.5, s * 0.5, s * 0.48);
    gr.addColorStop(0, 'rgba(255, 244, 198, 0.92)');
    gr.addColorStop(0.24, 'rgba(255, 206, 122, 0.44)');
    gr.addColorStop(0.58, 'rgba(255, 174, 92, 0.14)');
    gr.addColorStop(1, 'rgba(255, 160, 82, 0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
    lampGlowSprite = c;
  }

  // 预烘焙 2D 像素级超柔边体积光束精灵（纵向 + 横向双高斯余弦羽化，彻底消灭三角形光锥硬边，零滤镜依赖！）
  function buildSoftBeamSprite() {
    var cw = 360, ch = 220;
    var ox = 24, oy = ch * 0.5;
    var maxR = 326;
    var c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    var g = c.getContext('2d');
    var img = g.createImageData(cw, ch);
    var d = img.data;

    function sstep(e0, e1, x) {
      var u = (x - e0) / (e1 - e0);
      if (u < 0) u = 0; else if (u > 1) u = 1;
      return u * u * (3 - 2 * u);
    }

    for (var y = 0; y < ch; y++) {
      var dy = y - oy;
      var ady = Math.abs(dy);
      for (var x = 0; x < cw; x++) {
        var dx = x - ox;
        var r = Math.sqrt(dx * dx + dy * dy);
        if (r >= maxR) continue;
        var u = r / maxR;

        // 1) 灯口极柔和的球形暖光核心（与潜艇前灯/灯塔灯室无缝相融）
        var lensGlow = 0;
        if (r < 48) {
          var lu = 1 - r / 48;
          lensGlow = lu * lu * 0.48;
        }

        // 2) 柔和扩散的体积光束（横向使用 cos^3.0 极柔羽化，边缘完全融进海水零切线！）
        var beamVal = 0;
        if (dx > -10) {
          var ang = Math.atan2(ady, Math.max(0.5, dx + 10));
          var halfCone = 0.34 + 0.06 * u; // 约 20~23 度柔散射角
          var an = ang / halfCone;
          if (an < 1) {
            var cAng = Math.cos(an * Math.PI * 0.5);
            var latSoft = cAng * cAng * cAng; // 三次余弦超柔边缘衰减
            var lonSoft = Math.pow(1 - u, 1.55) * sstep(0.0, 0.055, u);
            // 叠加内芯微亮束 + 外层宽柔漫射光雾
            var innerAng = Math.min(1, ang / (halfCone * 0.52));
            var innerSoft = innerAng < 1 ? Math.pow(Math.cos(innerAng * Math.PI * 0.5), 2.2) : 0;
            beamVal = lonSoft * (latSoft * 0.52 + innerSoft * 0.26);
          }
        }

        var alpha = Math.min(1, lensGlow + beamVal);
        if (alpha <= 0.002) continue;

        // 暖象牙金 -> 温润琥珀雾 -> 极淡月光青白远端自然过渡
        var idx = (y * cw + x) * 4;
        d[idx]     = Math.round(255 - u * 34);
        d[idx + 1] = Math.round(246 - u * 22);
        d[idx + 2] = Math.round(208 + u * 12);
        d[idx + 3] = Math.round(alpha * 255);
      }
    }
    g.putImageData(img, 0, 0);
    softBeamSprite = { canvas: c, w: cw, h: ch, anchorX: ox, anchorY: oy };
  }

  // v13 Step 4：预烘焙高频辉光与晶莹气泡离屏精灵图集（彻底消除每帧数百次 createRadialGradient GC 抖动！）
  function buildGlowAndBubbleAtlas() {
    var tones = {
      cyan:  ['rgba(218, 254, 255, 0.92)', 'rgba(104, 232, 250, 0.40)', 'rgba(72, 198, 236, 0)'],
      gold:  ['rgba(255, 252, 224, 0.94)', 'rgba(255, 218, 134, 0.42)', 'rgba(255, 186, 102, 0)'],
      mint:  ['rgba(224, 255, 242, 0.92)', 'rgba(116, 244, 216, 0.40)', 'rgba(76, 208, 196, 0)'],
      pink:  ['rgba(255, 230, 242, 0.92)', 'rgba(255, 178, 212, 0.38)', 'rgba(224, 138, 192, 0)'],
      ice:   ['rgba(242, 254, 255, 0.94)', 'rgba(136, 240, 248, 0.42)', 'rgba(102, 196, 232, 0)'],
      amber: ['rgba(255, 236, 182, 0.92)', 'rgba(244, 152, 92, 0.38)',  'rgba(232, 118, 64, 0)']
    };
    var s = 96;
    Object.keys(tones).forEach(function (key) {
      var c = document.createElement('canvas');
      c.width = s; c.height = s;
      var g = c.getContext('2d');
      var stops = tones[key];
      var gr = g.createRadialGradient(s * 0.5, s * 0.5, 1.5, s * 0.5, s * 0.5, s * 0.48);
      gr.addColorStop(0.0, stops[0]);
      gr.addColorStop(0.45, stops[1]);
      gr.addColorStop(1.0, stops[2]);
      g.fillStyle = gr;
      g.fillRect(0, 0, s, s);
      glowSprites[key] = c;
    });

    var bs = 48;
    var bc = document.createElement('canvas');
    bc.width = bs; bc.height = bs;
    var bg = bc.getContext('2d');
    var bGr = bg.createRadialGradient(bs * 0.36, bs * 0.34, 1.5, bs * 0.5, bs * 0.5, bs * 0.44);
    bGr.addColorStop(0.0, 'rgba(255, 255, 255, 0.72)');
    bGr.addColorStop(0.4, 'rgba(196, 244, 255, 0.22)');
    bGr.addColorStop(0.84, 'rgba(164, 236, 255, 0.38)');
    bGr.addColorStop(1.0, 'rgba(164, 236, 255, 0)');
    bg.fillStyle = bGr;
    bg.beginPath(); bg.arc(bs * 0.5, bs * 0.5, bs * 0.44, 0, Math.PI * 2); bg.fill();
    bg.strokeStyle = 'rgba(232, 252, 255, 0.78)';
    bg.lineWidth = 1.6;
    bg.beginPath(); bg.arc(bs * 0.5, bs * 0.5, bs * 0.40, 0, Math.PI * 2); bg.stroke();
    bg.fillStyle = 'rgba(255, 255, 255, 0.92)';
    bg.beginPath(); bg.arc(bs * 0.36, bs * 0.34, 3.2, 0, Math.PI * 2); bg.fill();
    bubbleSprite = bc;
  }

  function buildSunbeamSprite() {
    var cw = 260, ch = 560;
    var raw = document.createElement('canvas');
    raw.width = cw; raw.height = ch;
    var rg = raw.getContext('2d');
    var grad = rg.createLinearGradient(cw * 0.5, 0, cw * 0.5, ch);
    grad.addColorStop(0.00, 'rgba(255, 250, 224, 0.00)');
    grad.addColorStop(0.16, 'rgba(255, 248, 214, 0.50)');
    grad.addColorStop(0.58, 'rgba(220, 244, 202, 0.20)');
    grad.addColorStop(1.00, 'rgba(210, 238, 198, 0.00)');
    rg.fillStyle = grad;
    rg.beginPath();
    rg.moveTo(cw * 0.36, 0); rg.lineTo(cw * 0.64, 0);
    rg.lineTo(cw * 0.92, ch); rg.lineTo(cw * 0.08, ch);
    rg.closePath(); rg.fill();

    rg.globalCompositeOperation = 'destination-in';
    var mask = rg.createLinearGradient(0, 0, cw, 0);
    mask.addColorStop(0.00, 'rgba(255,255,255,0)');
    mask.addColorStop(0.30, 'rgba(255,255,255,0.62)');
    mask.addColorStop(0.50, 'rgba(255,255,255,1)');
    mask.addColorStop(0.70, 'rgba(255,255,255,0.62)');
    mask.addColorStop(1.00, 'rgba(255,255,255,0)');
    rg.fillStyle = mask;
    rg.fillRect(0, 0, cw, ch);

    var fin = document.createElement('canvas');
    fin.width = cw; fin.height = ch;
    var fg = fin.getContext('2d');
    if (typeof fg.filter === 'string') fg.filter = 'blur(18px)';
    fg.drawImage(raw, 0, 0);
    if (typeof fg.filter === 'string') fg.filter = 'none';
    sunbeamSprite = fin;
  }

  function buildSmokePuffSprite() {
    var s = 160;
    var c = document.createElement('canvas');
    c.width = s; c.height = s;
    var g = c.getContext('2d');
    var cx = s * 0.5, cy = s * 0.5;
    [{ x: 0, y: 0, r: 44, a: 0.38 }, { x: -18, y: 6, r: 34, a: 0.28 }, { x: 19, y: -5, r: 36, a: 0.26 }].forEach(function (b) {
      var gr = g.createRadialGradient(cx + b.x, cy + b.y, 4, cx + b.x, cy + b.y, b.r);
      gr.addColorStop(0, 'rgba(246, 236, 224, ' + b.a + ')');
      gr.addColorStop(0.6, 'rgba(220, 212, 214, ' + (b.a * 0.42) + ')');
      gr.addColorStop(1, 'rgba(200, 196, 206, 0)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(cx + b.x, cy + b.y, b.r, 0, Math.PI * 2); g.fill();
    });
    smokePuffSprite = c;
  }

  // =========================================================================
  // 5. 离屏不透明遮罩 + 连续平滑中心线树干工厂（彻底消除断层台阶、尖刺叶与泡泡树！）
  // =========================================================================
  function evalQuadPt(x0, y0, cx, cy, x1, y1, u) {
    var inv = 1 - u;
    return {
      x: inv * inv * x0 + 2 * inv * u * cx + u * u * x1,
      y: inv * inv * y0 + 2 * inv * u * cy + u * u * y1
    };
  }

  // 沿精确二次贝塞尔中心线采样并生成平滑渐变宽度的无缝枝干（主干底部自然平滑外展板根！）
  function drawSmoothBranchRibbon(tg, x0, y0, cx, cy, x1, y1, w0, w1, flareAmt, fillCol) {
    var segs = 16;
    var leftPts = [], rightPts = [];
    for (var i = 0; i <= segs; i++) {
      var u = i / segs;
      var p = evalQuadPt(x0, y0, cx, cy, x1, y1, u);
      var dx = 2 * (1 - u) * (cx - x0) + 2 * u * (x1 - cx);
      var dy = 2 * (1 - u) * (cy - y0) + 2 * u * (y1 - cy);
      var dLen = Math.hypot(dx, dy) || 1;
      var nx = -dy / dLen, ny = dx / dLen;
      var halfW = lerp(w0, w1, u) * 0.5;
      if (flareAmt > 0) {
        halfW += w0 * flareAmt * Math.pow(1 - u, 3.0);
      }
      leftPts.push({ x: p.x + nx * halfW, y: p.y + ny * halfW });
      rightPts.push({ x: p.x - nx * halfW, y: p.y - ny * halfW });
    }
    tg.fillStyle = fillCol;
    tg.beginPath();
    tg.moveTo(leftPts[0].x, leftPts[0].y);
    for (var l = 1; l <= segs; l++) tg.lineTo(leftPts[l].x, leftPts[l].y);
    for (var r = segs; r >= 0; r--) tg.lineTo(rightPts[r].x, rightPts[r].y);
    tg.closePath();
    tg.fill();

    // 末端与起点圆滑封口，杜绝任何分叉缺口与尖角台阶
    tg.beginPath(); tg.arc(x0, y0, w0 * 0.48, 0, Math.PI * 2); tg.fill();
    tg.beginPath(); tg.arc(x1, y1, w1 * 0.48, 0, Math.PI * 2); tg.fill();
  }

  function buildMaskedBroadleafTree(cw, ch, seed, isGiant) {
    var out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    var ctx = out.getContext('2d');

    var baseX = cw * 0.50;
    var baseY = ch - 42; // 底部留足 42px 深埋地根空间，确保任何斜坡绝不露根底！
    var trunkH = isGiant ? (ch * 0.34) : (ch * 0.34);
    var trunkW = isGiant ? 28 : 9;
    var windLean = (hash1(seed * 2.7) - 0.5) * 0.14;
    var anchors = [];

    // Step A: 连续无断层手绘树干与自然分叉枝桠
    var trunkC = document.createElement('canvas');
    trunkC.width = cw; trunkC.height = ch;
    var tg = trunkC.getContext('2d');
    var barkFill = isGiant ? '#1c312b' : '#3a4638';

    function grow(x0, y0, len, ang, w, depth, bs, isRoot) {
      var bend = (hash1(bs * 9.3) - 0.5) * (isRoot ? 0.20 : 0.30);
      var x1 = x0 + Math.cos(ang) * len;
      var y1 = y0 + Math.sin(ang) * len;
      var cx = (x0 + x1) * 0.5 - Math.sin(ang) * len * bend;
      var cy = (y0 + y1) * 0.5 + Math.cos(ang) * len * bend;
      var wEnd = Math.max(2.0, w * (isRoot ? 0.66 : 0.58));

      drawSmoothBranchRibbon(tg, x0, y0, cx, cy, x1, y1, w, wEnd, isRoot ? (isGiant ? 0.85 : 0.42) : 0, barkFill);

      if (depth <= 1) {
        anchors.push({ x: x1, y: y1, rx: len * (isGiant ? 0.88 : 0.90), ry: len * (isGiant ? 0.54 : 0.60), s: bs });
        anchors.push({ x: cx, y: cy, rx: len * (isGiant ? 0.64 : 0.68), ry: len * (isGiant ? 0.42 : 0.46), s: bs + 5.2 });
        return;
      }

      var nChild = (depth === 3 && isGiant) ? 3 : 2;
      for (var c = 0; c < nChild; c++) {
        var sp = nChild === 3 ? (c - 1) * 0.56 : (c === 0 ? -0.46 : 0.46);
        var nextAng = ang + sp + (hash1(bs * 5.7 + c * 11.1) - 0.5) * 0.20;
        var nextLen = len * (0.58 + hash1(bs * 3.1 + c * 7.3) * 0.14);
        // 严格取父级二次贝塞尔曲线上的真实点作为分叉起点，永不错位、永无台阶缺口！
        var at = (nChild === 3 && c !== 1) ? (0.76 + hash1(bs + c) * 0.14) : 0.96;
        var pt = evalQuadPt(x0, y0, cx, cy, x1, y1, at);
        var childW = lerp(w, wEnd, at) * (nChild === 3 && c === 1 ? 0.72 : 0.66);
        grow(pt.x, pt.y, nextLen, nextAng, childW, depth - 1, bs * 2.13 + c * 19.7 + 1.3, false);
      }
      if (depth === 2) {
        anchors.push({ x: x1, y: y1, rx: len * 0.70, ry: len * 0.44, s: bs + 12.1 });
      }
    }

    // 主干从 baseY + 38 深埋地底平滑向上生长，与外展根部浑然一体！
    grow(baseX, baseY + 38, trunkH + 34, -Math.PI * 0.5 + windLean, trunkW, isGiant ? 3 : 2, seed + 2.3, true);

    // source-atop 统一给树干刷柔和侧光（左侧深林荫 -> 右侧暖阳受光）
    tg.globalCompositeOperation = 'source-atop';
    var barkLight = tg.createLinearGradient(baseX - cw * 0.16, 0, baseX + cw * 0.18, 0);
    barkLight.addColorStop(0.00, isGiant ? '#132420' : '#2a342a');
    barkLight.addColorStop(0.58, isGiant ? '#264239' : '#4b5745');
    barkLight.addColorStop(1.00, isGiant ? '#58826a' : '#86996e');
    tg.fillStyle = barkLight;
    tg.fillRect(0, 0, cw, ch);

    // Step B: 100% 不透明柔和云簇树冠遮罩
    var crownC = document.createElement('canvas');
    crownC.width = cw; crownC.height = ch;
    var cg = crownC.getContext('2d');

    var padX = isGiant ? 30 : 18;
    var padTop = isGiant ? 30 : 18;
    var minY = ch, maxY = 0, minX = cw, maxX = 0;
    anchors.forEach(function (a) {
      a.rx = Math.min(a.rx, cw * 0.30);
      a.ry = Math.min(a.ry, ch * 0.19);
      var marginX = a.rx * 1.25 + padX;
      var marginY = a.ry * 1.25 + padTop;
      a.x = Math.max(marginX, Math.min(cw - marginX, a.x));
      a.y = Math.max(marginY, Math.min(baseY - 40, a.y));
      stampLeafClusterMask(cg, a.x, a.y, a.rx, a.ry, a.s);
      if (a.y - a.ry < minY) minY = a.y - a.ry;
      if (a.y + a.ry > maxY) maxY = a.y + a.ry;
      if (a.x - a.rx < minX) minX = a.x - a.rx;
      if (a.x + a.rx > maxX) maxX = a.x + a.rx;
    });

    // source-atop 清透绘本水彩树冠光影（摒弃脏灰暗斑，采用冷青暗影 + 暖黄绿受光！）
    cg.globalCompositeOperation = 'source-atop';

    var volGrad = cg.createLinearGradient(maxX, minY, minX, maxY);
    if (isGiant) {
      volGrad.addColorStop(0.00, '#cdeca0');
      volGrad.addColorStop(0.28, '#72bd82');
      volGrad.addColorStop(0.66, '#357960');
      volGrad.addColorStop(1.00, '#1c4a44');
    } else {
      volGrad.addColorStop(0.00, '#e4f4aa');
      volGrad.addColorStop(0.32, '#96d07e');
      volGrad.addColorStop(0.70, '#528e5c');
      volGrad.addColorStop(1.00, '#2e5c46');
    }
    cg.fillStyle = volGrad;
    cg.fillRect(0, 0, cw, ch);

    // 温柔克制的体块明暗过渡
    anchors.forEach(function (a, idx) {
      var shG = cg.createRadialGradient(a.x - a.rx * 0.18, a.y + a.ry * 0.45, 2, a.x - a.rx * 0.18, a.y + a.ry * 0.45, a.rx * 0.90);
      shG.addColorStop(0, isGiant ? 'rgba(20, 62, 56, 0.28)' : 'rgba(38, 78, 54, 0.24)');
      shG.addColorStop(1, 'rgba(20, 62, 56, 0)');
      cg.fillStyle = shG;
      cg.beginPath(); cg.arc(a.x - a.rx * 0.18, a.y + a.ry * 0.45, a.rx * 0.90, 0, Math.PI * 2); cg.fill();

      if (a.y < (minY + maxY) * 0.56 || idx % 2 === 0) {
        var hiG = cg.createRadialGradient(a.x + a.rx * 0.22, a.y - a.ry * 0.36, 2, a.x + a.rx * 0.22, a.y - a.ry * 0.36, a.rx * 0.72);
        hiG.addColorStop(0, isGiant ? 'rgba(228, 250, 178, 0.38)' : 'rgba(246, 252, 190, 0.44)');
        hiG.addColorStop(1, 'rgba(228, 250, 178, 0)');
        cg.fillStyle = hiG;
        cg.beginPath(); cg.arc(a.x + a.rx * 0.22, a.y - a.ry * 0.36, a.rx * 0.72, 0, Math.PI * 2); cg.fill();
      }
    });

    // 柔和成簇的绘本树冠高光叶弧（克制自然，告别零碎白米粒）
    for (var lf = 0; lf < (isGiant ? 20 : 10); lf++) {
      var pick = anchors[lf % anchors.length];
      var lx = pick.x + (hash1(seed + lf * 3.7) - 0.32) * pick.rx * 1.1;
      var ly = pick.y + (hash1(seed + lf * 8.1) - 0.62) * pick.ry * 0.95;
      cg.fillStyle = lf % 2 === 0 ? 'rgba(232, 250, 186, 0.26)' : 'rgba(24, 68, 58, 0.18)';
      cg.beginPath();
      cg.ellipse(lx, ly, isGiant ? 10 : 6, isGiant ? 5.5 : 3.5, (hash1(lf * 5.1) - 0.5) * 0.6, 0, Math.PI * 2);
      cg.fill();
    }

    // 合成最终精灵：树干底层 -> 悬垂细丝气根 -> 不透明遮罩树冠
    ctx.drawImage(trunkC, 0, 0);
    if (isGiant) {
      ctx.strokeStyle = 'rgba(42, 86, 66, 0.34)';
      ctx.lineWidth = 1.4;
      for (var vr = 0; vr < 4; vr++) {
        var va = anchors[(vr * 3) % anchors.length];
        var vLen = 38 + hash1(seed + vr * 4.3) * 44;
        ctx.beginPath();
        ctx.moveTo(va.x, va.y + va.ry * 0.5);
        ctx.quadraticCurveTo(va.x + 6, va.y + va.ry * 0.5 + vLen * 0.5, va.x - 4, va.y + va.ry * 0.5 + vLen);
        ctx.stroke();
      }
    }
    ctx.drawImage(crownC, 0, 0);

    return { canvas: out, w: cw, h: ch, anchorX: baseX, anchorY: baseY };
  }

  // 离屏不透明遮罩霜雪针叶松（冰原专用，零三角块感）
  function buildMaskedPine(cw, ch, seed) {
    var out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    var ctx = out.getContext('2d');
    var baseX = cw * 0.5, baseY = ch - 10;

    // 树干
    ctx.fillStyle = '#253344';
    ctx.fillRect(baseX - 4, baseY - ch * 0.72, 8, ch * 0.72 + 4);

    // 100% 不透明松枝轮廓遮罩
    var maskC = document.createElement('canvas');
    maskC.width = cw; maskC.height = ch;
    var mg = maskC.getContext('2d');
    mg.fillStyle = '#ffffff';

    var tiers = 6;
    for (var ti = 0; ti < tiers; ti++) {
      var u = ti / (tiers - 1);
      var ty = ch * (0.12 + u * 0.62);
      var halfW = cw * (0.10 + u * 0.34) * (0.88 + hash1(seed + ti * 3.1) * 0.24);
      var drop = 16 + u * 18;
      mg.beginPath();
      mg.moveTo(baseX, ty - 14);
      mg.quadraticCurveTo(baseX + halfW * 0.5, ty + drop * 0.2, baseX + halfW, ty + drop);
      mg.lineTo(baseX + halfW * 0.62, ty + drop - 4);
      mg.lineTo(baseX + halfW * 0.45, ty + drop + 5);
      mg.lineTo(baseX, ty + drop - 6);
      mg.lineTo(baseX - halfW * 0.45, ty + drop + 5);
      mg.lineTo(baseX - halfW * 0.62, ty + drop - 4);
      mg.lineTo(baseX - halfW, ty + drop);
      mg.quadraticCurveTo(baseX - halfW * 0.5, ty + drop * 0.2, baseX, ty - 14);
      mg.closePath();
      mg.fill();
    }

    // source-atop 内部松针冷暗面 + 枝头方向性厚雪层
    mg.globalCompositeOperation = 'source-atop';
    var pineGrad = mg.createLinearGradient(0, ch * 0.1, cw, ch * 0.9);
    pineGrad.addColorStop(0, '#5a7c96');
    pineGrad.addColorStop(0.5, '#355068');
    pineGrad.addColorStop(1, '#1d2f42');
    mg.fillStyle = pineGrad;
    mg.fillRect(0, 0, cw, ch);

    for (var s = 0; s < tiers; s++) {
      var su = s / (tiers - 1);
      var sy = ch * (0.12 + su * 0.62);
      var sw = cw * (0.10 + su * 0.34);
      var sGrad = mg.createLinearGradient(0, sy - 14, 0, sy + 14);
      sGrad.addColorStop(0, 'rgba(240, 250, 255, 0.90)');
      sGrad.addColorStop(0.65, 'rgba(202, 228, 244, 0.45)');
      sGrad.addColorStop(1, 'rgba(202, 228, 244, 0)');
      mg.fillStyle = sGrad;
      mg.fillRect(baseX - sw, sy - 14, sw * 2, 28);
    }

    ctx.drawImage(maskC, 0, 0);
    return { canvas: out, w: cw, h: ch, anchorX: baseX, anchorY: baseY };
  }

  // 离屏不透明遮罩灌木丛（青野/林海坡面用）
  function buildMaskedBush(cw, ch, seed) {
    var c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    var g = c.getContext('2d');
    var cx = cw * 0.5, by = ch - 6;
    stampLeafClusterMask(g, cx - cw * 0.18, by - ch * 0.34, cw * 0.24, ch * 0.30, seed + 1.1);
    stampLeafClusterMask(g, cx + cw * 0.16, by - ch * 0.32, cw * 0.24, ch * 0.28, seed + 4.3);
    stampLeafClusterMask(g, cx, by - ch * 0.46, cw * 0.28, ch * 0.36, seed + 7.9);

    g.globalCompositeOperation = 'source-atop';
    var grad = g.createLinearGradient(cw * 0.75, 0, cw * 0.25, ch);
    grad.addColorStop(0, '#c6ea96');
    grad.addColorStop(0.42, '#6cb26a');
    grad.addColorStop(1, '#26523c');
    g.fillStyle = grad;
    g.fillRect(0, 0, cw, ch);
    return { canvas: c, w: cw, h: ch, anchorX: cx, anchorY: by };
  }

  function buildTreeAtlas() {
    treeSprites = { giant: [], sapling: [], pine: [], bush: [] };
    for (var i = 0; i < 4; i++) {
      treeSprites.giant.push(buildMaskedBroadleafTree(540, 490, 11.7 + i * 23.3, true));
    }
    for (var j = 0; j < 3; j++) {
      treeSprites.sapling.push(buildMaskedBroadleafTree(250, 250, 41.3 + j * 17.9, false));
    }
    for (var k = 0; k < 3; k++) {
      treeSprites.pine.push(buildMaskedPine(210, 280, 73.1 + k * 19.7));
    }
    for (var b = 0; b < 3; b++) {
      treeSprites.bush.push(buildMaskedBush(170, 110, 97.3 + b * 13.1));
    }
  }

  // =========================================================================
  // 6. 离屏不透明遮罩 + 棱面受光「月陨巨山」五纪元演进图集（彻底淘汰光滑 M 双峰！）
  // =========================================================================
  function buildMoonfallMountainAtlas() {
    mountainSprites = {};
    var cw = 960, ch = 360;
    var baseY = ch - 12;

    // 统一的非对称崩裂月陨环形山脉骨架（嶙峋峭壁、倾斜阶梯断崖、偏心撞击山口）
    var ridge = [
      [0.02, 0.00], [0.09, 0.09], [0.15, 0.16], [0.19, 0.13],
      [0.24, 0.28], [0.29, 0.44], [0.33, 0.38], [0.38, 0.68],
      [0.42, 0.84], [0.45, 0.78], [0.49, 0.56], // 左侧崩裂锯齿峭峰 -> 撞击凹口
      [0.54, 0.52], [0.58, 0.62], [0.63, 0.94], // 右侧偏心巍峨主峰
      [0.67, 0.82], [0.71, 0.86], [0.76, 0.60],
      [0.81, 0.42], [0.86, 0.36], [0.91, 0.18], [0.98, 0.00]
    ];

    // 山体内部的几道主峰分水棱线，用于绘制立体的明暗岩面（Alto's Odyssey 标志性山脉质感！）
    var ridgeLines = [
      [[0.42, 0.84], [0.39, 0.56], [0.34, 0.32], [0.26, 0.00]],
      [[0.63, 0.94], [0.60, 0.64], [0.57, 0.34], [0.52, 0.00]],
      [[0.71, 0.86], [0.74, 0.54], [0.79, 0.24], [0.84, 0.00]],
      [[0.29, 0.44], [0.27, 0.22], [0.21, 0.00]]
    ];

    function buildEraMountain(mode) {
      var c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      var g = c.getContext('2d');

      // 1) 先画 100% 不透明嶙峋山体主剪影
      g.beginPath();
      g.moveTo(ridge[0][0] * cw, baseY);
      for (var i = 1; i < ridge.length; i++) {
        g.lineTo(ridge[i][0] * cw, baseY - ridge[i][1] * (ch * 0.82));
      }
      g.lineTo(ridge[ridge.length - 1][0] * cw, baseY + 14);
      g.lineTo(ridge[0][0] * cw, baseY + 14);
      g.closePath();
      g.fillStyle = '#ffffff';
      g.fill();

      // 纪元 VI 巨木林海：山肩与山麓直接并入不透明森林轮廓，再统一做光影！
      if (mode === 'forest') {
        var crownAnchors = [
          [0.24, 0.26, 36], [0.32, 0.38, 42], [0.42, 0.78, 34],
          [0.52, 0.50, 44], [0.63, 0.88, 38], [0.72, 0.78, 40],
          [0.80, 0.40, 44], [0.87, 0.24, 34]
        ];
        crownAnchors.forEach(function (ca, idx) {
          stampLeafClusterMask(g, ca[0] * cw, baseY - ca[1] * (ch * 0.82), ca[2], ca[2] * 0.62, 200 + idx * 7.3);
        });
      }

      // 2) source-atop 在实心山体内刷立体渐变 + 棱面受光面/背光面
      g.globalCompositeOperation = 'source-atop';

      var baseGrad = g.createLinearGradient(0, ch * 0.14, 0, baseY);
      if (mode === 'fire') {
        baseGrad.addColorStop(0, '#44222e');
        baseGrad.addColorStop(0.55, '#2b1420');
        baseGrad.addColorStop(1, '#582226');
      } else if (mode === 'ice') {
        baseGrad.addColorStop(0, '#c2dce9');
        baseGrad.addColorStop(0.50, '#6a8ba6');
        baseGrad.addColorStop(1, '#3c5874');
      } else if (mode === 'waste') {
        baseGrad.addColorStop(0, '#8a6252');
        baseGrad.addColorStop(0.55, '#593c36');
        baseGrad.addColorStop(1, '#3b2626');
      } else if (mode === 'meadow') {
        baseGrad.addColorStop(0, '#789886');
        baseGrad.addColorStop(0.45, '#56886c');
        baseGrad.addColorStop(1, '#3b6a56');
      } else {
        baseGrad.addColorStop(0, '#4e9472');
        baseGrad.addColorStop(0.50, '#2a6254');
        baseGrad.addColorStop(1, '#163c3a');
      }
      g.fillStyle = baseGrad;
      g.fillRect(0, 0, cw, ch);

      // 方向性陡峭岩面阴影（左坡背光、右坡受光 -> 立刻立出雕塑级山体体积感！）
      var shadowFaceCol = mode === 'fire'
        ? 'rgba(20, 8, 16, 0.56)'
        : (mode === 'ice' ? 'rgba(34, 54, 78, 0.42)'
          : (mode === 'waste' ? 'rgba(36, 20, 22, 0.44)'
            : (mode === 'meadow' ? 'rgba(38, 64, 56, 0.30)' : 'rgba(14, 42, 38, 0.38)')));
      var lightFaceCol = mode === 'fire'
        ? 'rgba(255, 162, 92, 0.24)'
        : (mode === 'ice' ? 'rgba(242, 250, 255, 0.48)'
          : (mode === 'waste' ? 'rgba(242, 196, 148, 0.26)'
            : (mode === 'meadow' ? 'rgba(232, 246, 184, 0.28)' : 'rgba(196, 240, 168, 0.26)')));

      // 每个主峰左侧铺背光阴影面，右侧铺受光亮面
      ridgeLines.forEach(function (rl, idx) {
        g.fillStyle = shadowFaceCol;
        g.beginPath();
        g.moveTo(rl[0][0] * cw, baseY - rl[0][1] * (ch * 0.82));
        for (var k = 1; k < rl.length; k++) g.lineTo(rl[k][0] * cw, baseY - rl[k][1] * (ch * 0.82));
        g.lineTo((rl[0][0] - 0.16) * cw, baseY + 10);
        g.closePath();
        g.fill();

        g.fillStyle = lightFaceCol;
        g.beginPath();
        g.moveTo(rl[0][0] * cw, baseY - rl[0][1] * (ch * 0.82));
        for (var m = 1; m < rl.length; m++) g.lineTo(rl[m][0] * cw, baseY - rl[m][1] * (ch * 0.82));
        g.lineTo((rl[0][0] + 0.14) * cw, baseY + 10);
        g.closePath();
        g.fill();
      });

      // 各纪元山体专属地貌细节
      if (mode === 'fire') {
        // 凹陷撞击山口内柔和炽热熔岩辉光（绝不用直黄线）
        var cg = g.createRadialGradient(cw * 0.52, baseY - ch * 0.42, 8, cw * 0.52, baseY - ch * 0.36, cw * 0.20);
        cg.addColorStop(0, 'rgba(255, 224, 138, 0.86)');
        cg.addColorStop(0.45, 'rgba(255, 114, 54, 0.46)');
        cg.addColorStop(1, 'rgba(255, 86, 40, 0)');
        g.fillStyle = cg;
        g.fillRect(0, 0, cw, ch);
      } else if (mode === 'ice') {
        // 山脊厚雪高光带
        var sg = g.createLinearGradient(0, ch * 0.14, 0, ch * 0.62);
        sg.addColorStop(0, 'rgba(246, 252, 255, 0.58)');
        sg.addColorStop(1, 'rgba(246, 252, 255, 0)');
        g.fillStyle = sg;
        g.fillRect(0, 0, cw, ch);
      } else if (mode === 'meadow') {
        // 山脚向山腰温柔攀升的新绿春草
        var mg = g.createLinearGradient(0, baseY - ch * 0.46, 0, baseY);
        mg.addColorStop(0, 'rgba(136, 198, 118, 0)');
        mg.addColorStop(0.55, 'rgba(128, 192, 114, 0.46)');
        mg.addColorStop(1, 'rgba(84, 148, 92, 0.72)');
        g.fillStyle = mg;
        g.fillRect(0, baseY - ch * 0.46, cw, ch * 0.50);
      } else if (mode === 'forest') {
        // 旧月坑山口倾泻而下的柔和银白悬瀑与谷雾
        var wfX = cw * 0.525;
        var wfTop = baseY - ch * 0.43;
        var wfg = g.createLinearGradient(wfX, wfTop, wfX, baseY);
        wfg.addColorStop(0, 'rgba(232, 252, 244, 0.62)');
        wfg.addColorStop(0.75, 'rgba(192, 242, 226, 0.34)');
        wfg.addColorStop(1, 'rgba(192, 242, 226, 0)');
        g.fillStyle = wfg;
        g.beginPath();
        g.moveTo(wfX - 4, wfTop); g.lineTo(wfX + 5, wfTop);
        g.lineTo(wfX + 12, baseY); g.lineTo(wfX - 9, baseY);
        g.closePath(); g.fill();
      }

      // 山脚温柔雾化渐变（让巨山底边自然融进地平线空气透视）
      g.globalCompositeOperation = 'destination-out';
      var mistFade = g.createLinearGradient(0, baseY - 64, 0, baseY + 6);
      mistFade.addColorStop(0, 'rgba(0,0,0,0)');
      mistFade.addColorStop(1, 'rgba(0,0,0,0.85)');
      g.fillStyle = mistFade;
      g.fillRect(0, baseY - 64, cw, 78);

      return c;
    }

    ['fire', 'ice', 'waste', 'meadow', 'forest'].forEach(function (m) {
      mountainSprites[m] = buildEraMountain(m);
    });
  }

  // =========================================================================
  // 7. 终章核心地标：离屏不透明遮罩「新生世界树」(760x640，零裁切、零泡泡感)
  // =========================================================================
  function buildWorldTreeSprite() {
    var cw = 760, ch = 640;
    var out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    var ctx = out.getContext('2d');

    var baseX = cw * 0.50;
    var baseY = ch - 52;

    // A. 巍峨盘根古树干与伸展巨枝（100% 不透明遮罩 + source-atop 光影与翡翠灵脉）
    var trunkC = document.createElement('canvas');
    trunkC.width = cw; trunkC.height = ch;
    var tg = trunkC.getContext('2d');
    tg.fillStyle = '#1b2d28';

    // 宏伟外展板根抓牢翡翠海角
    tg.beginPath();
    tg.moveTo(baseX - 150, baseY + 42);
    tg.quadraticCurveTo(baseX - 74, baseY - 22, baseX - 50, baseY - 120);
    tg.quadraticCurveTo(baseX - 42, baseY - 210, baseX - 34, baseY - 268);
    tg.lineTo(baseX + 34, baseY - 268);
    tg.quadraticCurveTo(baseX + 46, baseY - 205, baseX + 56, baseY - 116);
    tg.quadraticCurveTo(baseX + 86, baseY - 20, baseX + 162, baseY + 42);
    tg.closePath();
    tg.fill();

    // 几条主巨枝向左右天际舒展
    var mainBoughs = [
      { x0: -26, y0: -220, cx: -110, cy: -280, x1: -215, y1: -328, w0: 36, w1: 12 },
      { x0: -18, y0: -245, cx: -68,  cy: -340, x1: -120, y1: -410, w0: 30, w1: 10 },
      { x0:   0, y0: -255, cx:   8,  cy: -360, x1:    4, y1: -445, w0: 32, w1: 11 },
      { x0:  20, y0: -242, cx:  82,  cy: -338, x1:  142, y1: -408, w0: 30, w1: 10 },
      { x0:  28, y0: -216, cx: 124,  cy: -275, x1:  224, y1: -322, w0: 36, w1: 12 }
    ];
    mainBoughs.forEach(function (b) {
      var x0 = baseX + b.x0, y0 = baseY + b.y0;
      var cx = baseX + b.cx, cy = baseY + b.cy;
      var x1 = baseX + b.x1, y1 = baseY + b.y1;
      var ang = Math.atan2(y1 - y0, x1 - x0);
      var nx = -Math.sin(ang), ny = Math.cos(ang);
      tg.beginPath();
      tg.moveTo(x0 + nx * b.w0 * 0.5, y0 + ny * b.w0 * 0.5);
      tg.quadraticCurveTo(cx + nx * (b.w0 + b.w1) * 0.28, cy + ny * (b.w0 + b.w1) * 0.28, x1 + nx * b.w1 * 0.5, y1 + ny * b.w1 * 0.5);
      tg.lineTo(x1 - nx * b.w1 * 0.5, y1 - ny * b.w1 * 0.5);
      tg.quadraticCurveTo(cx - nx * (b.w0 + b.w1) * 0.28, cy - ny * (b.w0 + b.w1) * 0.28, x0 - nx * b.w0 * 0.5, y0 - ny * b.w0 * 0.5);
      tg.closePath();
      tg.fill();
    });

    // source-atop 给世界树树干刷晨曦侧光 + 树心微光脉络
    tg.globalCompositeOperation = 'source-atop';
    var bkGrad = tg.createLinearGradient(baseX - 140, 0, baseX + 150, 0);
    bkGrad.addColorStop(0.00, '#132422');
    bkGrad.addColorStop(0.48, '#26423a');
    bkGrad.addColorStop(0.80, '#4f7a62');
    bkGrad.addColorStop(1.00, '#96be84');
    tg.fillStyle = bkGrad;
    tg.fillRect(0, 0, cw, ch);

    // 树干中心温暖发光生命脉络（克制温润）
    tg.strokeStyle = 'rgba(218, 250, 198, 0.36)';
    tg.lineWidth = 3.2;
    tg.lineCap = 'round';
    tg.beginPath();
    tg.moveTo(baseX - 18, baseY + 12);
    tg.bezierCurveTo(baseX - 6, baseY - 78, baseX + 14, baseY - 150, baseX - 4, baseY - 245);
    tg.stroke();
    tg.strokeStyle = 'rgba(255, 244, 194, 0.30)';
    tg.lineWidth = 2.0;
    tg.beginPath();
    tg.moveTo(baseX + 26, baseY + 16);
    tg.bezierCurveTo(baseX + 12, baseY - 68, baseX - 8, baseY - 135, baseX + 10, baseY - 236);
    tg.stroke();

    // B. 遮天蔽日的多层云冠（100% 不透明有机碎叶遮罩 + 暖金晨曦立体着色）
    var crownC = document.createElement('canvas');
    crownC.width = cw; crownC.height = ch;
    var cg = crownC.getContext('2d');

    var clusters = [
      { x: -222, y: -332, rx: 106, ry: 62, s: 301 },
      { x: -138, y: -404, rx: 122, ry: 72, s: 307 },
      { x:  -46, y: -458, rx: 132, ry: 78, s: 313 },
      { x:   56, y: -454, rx: 134, ry: 76, s: 319 },
      { x:  152, y: -396, rx: 118, ry: 68, s: 325 },
      { x:  232, y: -326, rx: 102, ry: 60, s: 331 },
      { x:  -92, y: -320, rx: 114, ry: 64, s: 337 },
      { x:   14, y: -348, rx: 136, ry: 74, s: 343 },
      { x:  112, y: -316, rx: 116, ry: 64, s: 349 },
      { x:    2, y: -508, rx: 106, ry: 62, s: 355 }
    ];

    clusters.forEach(function (cl) {
      stampLeafClusterMask(cg, baseX + cl.x, baseY + cl.y, cl.rx, cl.ry, cl.s);
    });

    cg.globalCompositeOperation = 'source-atop';
    var vol = cg.createLinearGradient(baseX + 220, baseY - 560, baseX - 240, baseY - 240);
    vol.addColorStop(0.00, '#f4f6b2'); // 晨曦金绿树顶
    vol.addColorStop(0.24, '#92d88e'); // 明朗翠绿
    vol.addColorStop(0.58, '#3d8a6c'); // 丰茂翡翠中调
    vol.addColorStop(1.00, '#18443e'); // 深海冷翠阴影
    cg.fillStyle = vol;
    cg.fillRect(0, 0, cw, ch);

    // 团块立体明暗晕染
    clusters.forEach(function (cl, idx) {
      var ax = baseX + cl.x, ay = baseY + cl.y;
      var sh = cg.createRadialGradient(ax - cl.rx * 0.16, ay + cl.ry * 0.44, 4, ax - cl.rx * 0.16, ay + cl.ry * 0.44, cl.rx * 0.95);
      sh.addColorStop(0, 'rgba(14, 46, 42, 0.42)');
      sh.addColorStop(1, 'rgba(14, 46, 42, 0)');
      cg.fillStyle = sh;
      cg.beginPath(); cg.arc(ax - cl.rx * 0.16, ay + cl.ry * 0.44, cl.rx * 0.95, 0, Math.PI * 2); cg.fill();

      if (cl.y < -370 || idx % 2 === 0) {
        var hi = cg.createRadialGradient(ax + cl.rx * 0.24, ay - cl.ry * 0.36, 4, ax + cl.rx * 0.24, ay - cl.ry * 0.36, cl.rx * 0.80);
        hi.addColorStop(0, 'rgba(252, 252, 198, 0.50)');
        hi.addColorStop(1, 'rgba(252, 252, 198, 0)');
        cg.fillStyle = hi;
        cg.beginPath(); cg.arc(ax + cl.rx * 0.24, ay - cl.ry * 0.36, cl.rx * 0.80, 0, Math.PI * 2); cg.fill();
      }
    });

    // 冠内星点花蕾与碎叶笔触
    for (var lf = 0; lf < 76; lf++) {
      var pk = clusters[lf % clusters.length];
      var lx = baseX + pk.x + (hash1(401 + lf * 3.7) - 0.42) * pk.rx * 1.45;
      var ly = baseY + pk.y + (hash1(401 + lf * 8.1) - 0.58) * pk.ry * 1.35;
      cg.fillStyle = lf % 5 === 0
        ? 'rgba(255, 248, 206, 0.62)'
        : (lf % 2 === 0 ? 'rgba(220, 248, 178, 0.34)' : 'rgba(24, 62, 52, 0.26)');
      cg.beginPath();
      cg.ellipse(lx, ly, lf % 5 === 0 ? 3.2 : 6.2, lf % 5 === 0 ? 3.2 : 2.6, hash1(lf * 5.3) * Math.PI, 0, Math.PI * 2);
      cg.fill();
    }

    // 合成：柔和树冠暖金光晕 -> 垂挂银绿发光藤丝 -> 实心树干 -> 实心云冠
    var aura = ctx.createRadialGradient(baseX, baseY - 360, 40, baseX, baseY - 340, 340);
    aura.addColorStop(0, 'rgba(246, 252, 204, 0.26)');
    aura.addColorStop(0.55, 'rgba(154, 232, 180, 0.10)');
    aura.addColorStop(1, 'rgba(154, 232, 180, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, cw, ch);

    ctx.drawImage(trunkC, 0, 0);

    // 枝干下垂落的柔和发光细藤帘
    ctx.lineCap = 'round';
    for (var dv = 0; dv < 10; dv++) {
      var cRef = clusters[dv % 9];
      var vx = baseX + cRef.x + (hash1(501 + dv * 7.3) - 0.5) * 60;
      var vy = baseY + cRef.y + cRef.ry * 0.45;
      var vLen = 78 + hash1(501 + dv * 11.1) * 95;
      ctx.strokeStyle = dv % 2 === 0 ? 'rgba(168, 238, 186, 0.36)' : 'rgba(72, 134, 96, 0.42)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.quadraticCurveTo(vx + 8, vy + vLen * 0.5, vx - 5, vy + vLen);
      ctx.stroke();
    }

    ctx.drawImage(crownC, 0, 0);
    worldTreeSprite = { canvas: out, w: cw, h: ch, anchorX: baseX, anchorY: baseY };
  }

  function init(ctx) {
    buildPaperPattern(ctx);
    buildMoonSprite();
    buildCloudSprites();
    buildLampGlowSprite();
    buildSoftBeamSprite();
    buildGlowAndBubbleAtlas();
    buildSunbeamSprite();
    buildSmokePuffSprite();
    buildTreeAtlas();
    buildMoonfallMountainAtlas();
    buildWorldTreeSprite();
  }

  return {
    init: init,
    lerp: lerp,
    lerpColor: lerpColor,
    rgb: rgb,
    inkLine: inkLine,
    traceSmoothSpline: traceSmoothSpline,
    drawRoundedRect: drawRoundedRect,
    watercolorBlob: watercolorBlob,
    getPaperPattern: function () { return paperPattern; },
    getMoonSprite: function () { return moonSprite; },
    getCloudSprites: function () { return cloudSprites; },
    getLampGlowSprite: function () { return lampGlowSprite; },
    getSoftBeamSprite: function () { return softBeamSprite; },
    getGlowSprite: function (tone) { return glowSprites[tone || 'cyan'] || glowSprites.cyan || null; },
    getBubbleSprite: function () { return bubbleSprite; },
    getSunbeamSprite: function () { return sunbeamSprite; },
    getSmokePuffSprite: function () { return smokePuffSprite; },
    getTreeSprites: function () { return treeSprites; },
    getMountainSprites: function () { return mountainSprites; },
    getWorldTreeSprite: function () { return worldTreeSprite; }
  };
})();
