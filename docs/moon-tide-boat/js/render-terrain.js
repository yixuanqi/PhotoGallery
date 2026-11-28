window.MT = window.MT || {};

// v6 剪影层次 + 离屏遮罩美术管线（零重复平铺纹样、零泡泡树、电影级前景视差）
window.MT.RenderTerrain = (function () {
  var ctx = null;
  var camX = 120;

  function h1(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  function clamp01(v) {
    return v < 0 ? 0 : (v > 1 ? 1 : v);
  }

  function drawMaskedSprite(sprite, anchorX, anchorY, scale, alpha, flipX) {
    if (!sprite || !sprite.canvas) return;
    ctx.save();
    ctx.globalAlpha = typeof alpha === 'number' ? alpha : 1.0;
    ctx.translate(anchorX, anchorY);
    if (flipX) ctx.scale(-1, 1);
    var dw = sprite.w * scale;
    var dh = sprite.h * scale;
    ctx.drawImage(sprite.canvas, -sprite.anchorX * scale, -sprite.anchorY * scale, dw, dh);
    ctx.restore();
  }

  function drawBack(context, state) {
    ctx = context;
    camX = state.camX;
    var eras = window.MT.Eras;
    var boat = state.boat;
    var eb = state.eb;
    var pal = eb.palette;
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    var viewTop = state.viewTop;
    var viewBottom = state.viewBottom;
    var moonWorldX = state.moonWorldX;

    // 1. 远层地标（严格坐落在中远景坡脊之上，先画再被中远景坡体盖住根脚 -> 100% 扎地不悬空！）
    drawLayerLandmarks(eras, pal, eb, t, viewLeft, viewRight, 'far');

    // 2. 中远景柔雾剪影山脉 / 树海远景层
    drawMidFarParallaxBand(eb, pal, t, viewLeft, viewRight, viewBottom);

    // 3. 主坡树木（world-locked 零视差，根部深埋进主坡面下方 22px，随后被主地表自然遮盖根基！）
    drawLayerLandmarks(eras, pal, eb, t, viewLeft, viewRight, 'near');

    // 3. 纪元氛围粒子（无缝叠加后段演进征兆：火海末期飘灰雪、荒土末期落春雨、青野末期起孢子！）
    var om = eb.omen || {};
    var emberStrength = Math.max(eb.fireMix * (1 - (om.ashFall || 0) * 0.55), (om.fireApproach || 0) * 0.65);
    var snowStrength  = Math.max(eb.iceMix * (1 - (om.thawCrack || 0) * 0.45), (om.ashFall || 0) * 0.78);
    var rainStrength  = Math.max(eb.meadowMix * (1 - (om.canopyRise || 0) * 0.55), (om.firstRain || 0) * 0.82);
    var sporeStrength = Math.max(eb.forestMix, (om.canopyRise || 0) * 0.68);

    if (emberStrength > 0.05) drawEmberMotes(eras, camX, t, emberStrength);
    if (snowStrength  > 0.05) drawAshSnow(eras, camX, t, snowStrength);
    if (rainStrength  > 0.05) drawSpringRain(eras, camX, rainStrength);
    if (sporeStrength > 0.05) drawForestSpores(eras, camX, t, sporeStrength);

    drawLavaPlumes(eras, t, viewLeft, viewRight);
    drawDandelionGusts(eras, t, viewLeft, viewRight);
    drawSporeCurrents(eras, t, viewLeft, viewRight);

    // 3b. 故事模式终章《翡翠海岸 · 新生世界树》：海角巨岩与巍峨世界树矗立重逢之海彼岸！
    if (eb.finaleMix > 0.02 || (eras.getMode && eras.getMode() === 'story' && viewRight > eras.getFinaleX() - 600)) {
      drawWorldTreeSanctuary(eras, t, viewLeft, viewRight, viewBottom);
    }

    // 3c. 独立关卡海面后景建筑（如高架桥远侧石拱、沉海钟楼塔身、倾斜灯塔）
    if (window.MT.LevelEngine && window.MT.LevelEngine.drawWorldBack) {
      window.MT.LevelEngine.drawWorldBack(ctx, state);
    }

    // 4. 干净克制的 Alto 式主地表剪影（彻底删除所有机械平铺纹样，靠材质边缘光与自然簇群立住品质！）
    drawCleanTerrainSilhouette(eras, boat, pal, eb, t, moonWorldX, viewLeft, viewRight, viewBottom);

    // 4b. 独立关卡海面之上实体结构（可滑行桥面/栈桥、钟楼铜钟、暗礁尖峰、月下蓝鲸群与沉海遗物！）
    if (window.MT.LevelEngine && window.MT.LevelEngine.drawWorldStructures) {
      window.MT.LevelEngine.drawWorldStructures(ctx, state);
    }

    // 5. 海面浮鲸、三纪元高速滑轨、林海藤帘、补给浮灯与星火弧
    drawWhales(eras, t, viewLeft, viewRight);
    drawGrindRails(eras, t, viewLeft, viewRight, viewBottom);
    drawVineCurtains(eras, t, viewLeft, viewRight, viewTop);
    drawBuoys(eras, t, viewLeft, viewRight);
    drawStarArcs(eras, t, viewLeft, viewRight);
  }

  function drawWorldTreeSanctuary(eras, t, viewLeft, viewRight, viewBottom) {
    var art = window.MT.Art;
    var wt = art.getWorldTreeSprite ? art.getWorldTreeSprite() : null;
    if (!wt) return;
    var fx = eras.getFinaleX ? eras.getFinaleX() : 63600;
    var islandX = fx + 275;
    if (islandX < viewLeft - 550 || islandX > viewRight + 550) return;

    ctx.save();
    // 1. 世界树后方温暖晨曦神圣光晕
    var pulse = 0.88 + 0.12 * Math.sin(t * 1.4);
    var halo = ctx.createRadialGradient(islandX, -210, 30, islandX, -195, 420);
    halo.addColorStop(0, 'rgba(255, 250, 212, ' + (0.38 * pulse) + ')');
    halo.addColorStop(0.45, 'rgba(176, 242, 198, ' + (0.16 * pulse) + ')');
    halo.addColorStop(1, 'rgba(176, 242, 198, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(islandX, -195, 420, 0, Math.PI * 2); ctx.fill();

    // 2. 翡翠海角小岛剪影（稳稳托起新生世界树的宏伟板根，自然探入海面）
    var shoreGrad = ctx.createLinearGradient(islandX - 240, -18, islandX + 240, 140);
    shoreGrad.addColorStop(0, '#5ba678');
    shoreGrad.addColorStop(0.5, '#2b6652');
    shoreGrad.addColorStop(1, '#143836');
    ctx.fillStyle = shoreGrad;
    ctx.beginPath();
    ctx.moveTo(islandX - 240, 62);
    ctx.quadraticCurveTo(islandX - 155, -2, islandX - 64, -12);
    ctx.quadraticCurveTo(islandX + 42, -24, islandX + 180, -8);
    ctx.quadraticCurveTo(islandX + 340, 10, islandX + 440, 68);
    ctx.lineTo(islandX + 440, Math.max(220, viewBottom));
    ctx.lineTo(islandX - 240, Math.max(220, viewBottom));
    ctx.closePath();
    ctx.fill();

    // 海角柔绿高光边
    ctx.strokeStyle = 'rgba(220, 248, 194, 0.56)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(islandX - 220, 48);
    ctx.quadraticCurveTo(islandX - 135, -2, islandX - 58, -12);
    ctx.quadraticCurveTo(islandX + 44, -24, islandX + 180, -8);
    ctx.stroke();

    // 3. 离屏不透明遮罩精绘「新生世界树」主体
    drawMaskedSprite(wt, islandX, 2, 0.88, 1.0, false);

    // 4. 树下漂浮的柔和暖光星萤
    for (var fi = 0; fi < 14; fi++) {
      var angle = t * 0.45 + fi * 1.15;
      var px = islandX + Math.sin(angle * 1.3 + fi) * (160 + (fi % 3) * 45);
      var py = -65 - (fi * 24) + Math.cos(angle * 1.7) * 26;
      var tw = 0.45 + 0.55 * Math.sin(t * 2.6 + fi * 2.1);
      var rg = ctx.createRadialGradient(px, py, 0.5, px, py, 10);
      rg.addColorStop(0, 'rgba(255, 250, 206, ' + (0.78 * tw) + ')');
      rg.addColorStop(1, 'rgba(182, 248, 202, 0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  }

  function drawFront(context, state) {
    ctx = context;
    camX = state.camX;
    var eras = window.MT.Eras;
    var eb = state.eb;
    var pal = eb.palette;
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    var viewBottom = state.viewBottom;
    var solidRatio = Math.max(0, Math.min(1, eb.solidMix || 0));

    // 委派独立关卡插件前景层（潜海折射薄纱、晶莹上升气泡、破水扇形浪幕）
    if (window.MT.LevelEngine && window.MT.LevelEngine.drawWorldFront) {
      window.MT.LevelEngine.drawWorldFront(ctx, state);
    }

    // 液态纪元（月海/火海）保留柔和前景涌浪
    if (solidRatio < 0.85) {
      drawWaveLayer(26, t * 1.25 + 2.1, 1.0, 13, pal.frontSea, 0.44 * (1 - solidRatio), true, eb, viewLeft, viewRight, viewBottom);
    }

    drawParticles(eras);
    drawPopups(eras);
  }

  // 中远景坡线统一高度函数（确保远层树根、灯塔、山坡 100% 精准咬合，永不悬空！）
  function getMidFarY(wx, eb, tShift) {
    var px = wx * 0.25;
    if (eb.forestMix > 0.45) {
      return -22 + Math.sin(px * 0.0042) * 24 + Math.cos(px * 0.011 + 0.9) * 10;
    } else if (eb.meadowMix > 0.45) {
      return -16 + Math.sin(px * 0.0048 + 0.4) * 20 + Math.cos(px * 0.0095) * 9;
    } else if (eb.wasteMix > 0.45) {
      return -14 + Math.tanh(Math.sin(px * 0.0062 + 0.7) * 2.5) * 20;
    } else if (eb.iceMix > 0.45) {
      return -18 - Math.abs(Math.sin(px * 0.0085 + 0.2)) * 26 - Math.sin(px * 0.019) * 6;
    }
    return -14 + Math.sin(px * 0.0055 + tShift) * 10 + Math.sin(px * 0.0135 - tShift * 1.4) * 3.5;
  }

  // === Layer 1.5：中远景大气剪影层（按六大纪元独立轮廓）===
  function drawMidFarParallaxBand(eb, pal, t, viewLeft, viewRight, viewBottom) {
    var art = window.MT.Art;
    var solidRatio = Math.min(1, eb.iceMix + eb.wasteMix + eb.meadowMix + eb.forestMix);
    var tShift = solidRatio > 0.5 ? 0 : (t * 0.72 * (1 - solidRatio));

    var pts = [];
    var step = 28;
    var startX = Math.floor(viewLeft / step) * step;
    for (var wx = startX; wx <= viewRight + step; wx += step) {
      pts.push({ x: wx, y: getMidFarY(wx, eb, tShift) });
    }

    ctx.save();
    art.traceSmoothSpline(ctx, pts, true, startX, viewRight + step, viewBottom);
    // 关键视觉修复：中远景山坡改为 100% 不透明大气混色（用 RGB 与地平线雾色混合替代半透明 Alpha），
    // 彻底杜绝远树平底根脚和山脉三角底座透过中远景坡体露馅！
    var topFog = art.lerpColor(pal.farSea, pal.skyHorizon, solidRatio > 0.35 ? 0.30 : 0.22);
    var botFog = art.lerpColor(pal.farSea, pal.midSeaMid, 0.26);
    var grad = ctx.createLinearGradient(0, -64, 0, 120);
    grad.addColorStop(0, art.rgb(topFog, 1.0));
    grad.addColorStop(1, art.rgb(botFog, 1.0));
    ctx.fillStyle = grad;
    ctx.fill();

    if (solidRatio > 0.5) {
      art.traceSmoothSpline(ctx, pts, false);
      ctx.strokeStyle = art.rgb(pal.haze, 0.24);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // === Layer 2：严格分层扎地的树木与地标（far 层扎进中远景坡脊，near 层 0 视差扎进主地表，彻底消灭树在空中！）===
  function drawLayerLandmarks(eras, pal, eb, t, viewLeft, viewRight, pass) {
    var art = window.MT.Art;
    var trees = art.getTreeSprites();
    var list = eras.getLandmarks();
    var fogCol = art.lerpColor(pal.skyHorizon, pal.farSea, 0.54);
    var solidRatio = Math.min(1, eb.iceMix + eb.wasteMix + eb.meadowMix + eb.forestMix);
    var tShift = solidRatio > 0.5 ? 0 : (t * 0.72 * (1 - solidRatio));

    ctx.save();
    list.forEach(function (lm) {
      var isTreeLike = (lm.type === 'giant_tree' || lm.type === 'ancient_torii_tree' || lm.type === 'canopy_arch' || lm.type === 'frozen_pine' || lm.type === 'sprout_hill');
      // 树类按奇偶分别扎根在主地表（near）与中远景坡脊（far），建筑礁石统一扎在中远景坡脊（far）
      var isNear = isTreeLike && (lm.id % 2 === 0);
      if ((pass === 'near') !== isNear) return;

      var wx = isNear ? lm.x : (lm.x + (camX - lm.x) * 0.25);
      if (wx < viewLeft - 420 || wx > viewRight + 420) return;

      var sc = lm.scale * (isNear ? 1.0 : 0.78);
      // 严格深埋树根：near 树锚点下沉 16px 埋进 100% 不透明主坡；far 树锚点下沉 18px 埋进 100% 不透明中远景坡线！
      var by = isNear ? (eras.getSurfaceY(wx, t) + 16) : (getMidFarY(wx, eb, tShift) + 18);
      var flip = (lm.id % 3 === 0);

      // 1. 巨木林海：无裁切离屏不透明遮罩参天古树（根基稳稳扎入地表之下！）
      if (lm.type === 'giant_tree' && trees.giant.length > 0) {
        var spG = trees.giant[lm.id % trees.giant.length];
        drawMaskedSprite(spG, wx, by, 0.62 * sc, isNear ? 0.96 : 0.64, flip);
        return;
      }
      if (lm.type === 'ancient_torii_tree' && trees.giant.length > 0) {
        var spG1 = trees.giant[lm.id % trees.giant.length];
        var spG2 = trees.giant[(lm.id + 2) % trees.giant.length];
        var y1 = isNear ? (eras.getSurfaceY(wx - 62 * sc, t) + 16) : (getMidFarY(wx - 62 * sc, eb, tShift) + 18);
        var y2 = isNear ? (eras.getSurfaceY(wx + 52 * sc, t) + 16) : (getMidFarY(wx + 52 * sc, eb, tShift) + 18);
        drawMaskedSprite(spG1, wx - 62 * sc, y1, 0.48 * sc, isNear ? 0.84 : 0.58, flip);
        drawMaskedSprite(spG2, wx + 52 * sc, y2, 0.58 * sc, isNear ? 0.94 : 0.68, !flip);
        return;
      }
      if (lm.type === 'canopy_arch' && trees.giant.length > 0) {
        var spA = trees.giant[(lm.id + 1) % trees.giant.length];
        drawMaskedSprite(spA, wx, by, 0.68 * sc, isNear ? 0.92 : 0.62, flip);
        return;
      }

      // 2. 尘冬冰原：每棵松树独立贴合自己所在位置的真实坡高！
      if (lm.type === 'frozen_pine' && trees.pine.length > 0) {
        var p1 = trees.pine[lm.id % trees.pine.length];
        var p2 = trees.pine[(lm.id + 1) % trees.pine.length];
        var px1 = wx - 30 * sc, px2 = wx + 12 * sc, px3 = wx + 48 * sc;
        var py1 = isNear ? (eras.getSurfaceY(px1, t) + 8) : (getMidFarY(px1, eb, tShift) + 8);
        var py2 = isNear ? (eras.getSurfaceY(px2, t) + 8) : (getMidFarY(px2, eb, tShift) + 8);
        var py3 = isNear ? (eras.getSurfaceY(px3, t) + 8) : (getMidFarY(px3, eb, tShift) + 8);
        drawMaskedSprite(p1, px1, py1, 0.40 * sc, isNear ? 0.84 : 0.60, flip);
        drawMaskedSprite(p2, px2, py2, 0.56 * sc, isNear ? 0.94 : 0.72, !flip);
        if (lm.id % 2 === 0) drawMaskedSprite(p1, px3, py3, 0.34 * sc, isNear ? 0.78 : 0.52, !flip);
        return;
      }

      // 3. 萌芽青野：春芽幼树 + 贴坡灌木
      if (lm.type === 'sprout_hill' && trees.sapling.length > 0) {
        var s1 = trees.sapling[lm.id % trees.sapling.length];
        var b1 = trees.bush[lm.id % trees.bush.length];
        drawMaskedSprite(s1, wx, by, 0.54 * sc, isNear ? 0.92 : 0.66, flip);
        if (b1) {
          var bby = isNear ? (eras.getSurfaceY(wx + 32 * sc, t) + 6) : (getMidFarY(wx + 32 * sc, eb, tShift) + 6);
          drawMaskedSprite(b1, wx + 32 * sc, bby, 0.38 * sc, isNear ? 0.86 : 0.62, !flip);
        }
        return;
      }

      // 4. 其余水彩剪影建筑与礁石地标
      var grad = ctx.createLinearGradient(0, by - 140 * sc, 0, by + 26);
      grad.addColorStop(0, art.rgb(fogCol, 0.62));
      grad.addColorStop(0.78, art.rgb(fogCol, 0.34));
      grad.addColorStop(1, art.rgb(fogCol, 0.04));
      ctx.fillStyle = grad;

      if (lm.type === 'cottage') {
        ctx.fillRect(wx - 22 * sc, by - 26 * sc, 44 * sc, 34 * sc);
        ctx.beginPath(); ctx.moveTo(wx - 28 * sc, by - 25 * sc); ctx.lineTo(wx, by - 44 * sc); ctx.lineTo(wx + 28 * sc, by - 25 * sc); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255, 228, 162, 0.70)';
        ctx.fillRect(wx - 5 * sc, by - 18 * sc, 9 * sc, 8 * sc);
      } else if (lm.type === 'pier') {
        for (var p = -2; p <= 2; p++) ctx.fillRect(wx + p * 18 * sc, by - (14 + (p % 2) * 4) * sc, 4.5 * sc, 24 * sc);
        ctx.fillRect(wx - 40 * sc, by - 13 * sc, 78 * sc, 4 * sc);
      } else if (lm.type === 'lighthouse') {
        ctx.beginPath(); ctx.moveTo(wx - 11 * sc, by + 8); ctx.lineTo(wx - 6.5 * sc, by - 64 * sc); ctx.lineTo(wx + 6.5 * sc, by - 64 * sc); ctx.lineTo(wx + 11 * sc, by + 8); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(wx, by - 67 * sc, 8.5 * sc, Math.PI, 0); ctx.fill();
        var pulse = 0.45 + 0.55 * Math.sin(t * 2.0 + lm.seed);
        var lg = ctx.createRadialGradient(wx, by - 64 * sc, 1, wx, by - 64 * sc, 18 * sc);
        lg.addColorStop(0, 'rgba(255, 232, 170, ' + (0.76 * pulse) + ')'); lg.addColorStop(1, 'rgba(255, 232, 170, 0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(wx, by - 64 * sc, 18 * sc, 0, Math.PI * 2); ctx.fill();
      } else if (lm.type === 'arch') {
        for (var a = -1; a <= 1; a++) {
          var ax = wx + a * 44 * sc;
          ctx.beginPath(); ctx.arc(ax, by + 8, 18 * sc, Math.PI, 0);
          ctx.lineTo(ax + 24 * sc, by + 8); ctx.lineTo(ax + 24 * sc, by - 26 * sc); ctx.lineTo(ax - 24 * sc, by - 26 * sc); ctx.lineTo(ax - 24 * sc, by + 8);
          ctx.closePath(); ctx.fill();
        }
      } else if (lm.type === 'seastack') {
        ctx.beginPath(); ctx.moveTo(wx - 28 * sc, by + 10); ctx.quadraticCurveTo(wx - 16 * sc, by - 78 * sc, wx + 4 * sc, by - 92 * sc); ctx.quadraticCurveTo(wx + 22 * sc, by - 48 * sc, wx + 32 * sc, by + 10); ctx.closePath(); ctx.fill();
      } else if (lm.type === 'basalt_spire') {
        ctx.beginPath(); ctx.moveTo(wx - 26 * sc, by + 12); ctx.lineTo(wx - 12 * sc, by - 88 * sc); ctx.lineTo(wx + 2 * sc, by - 104 * sc); ctx.lineTo(wx + 16 * sc, by - 56 * sc); ctx.lineTo(wx + 28 * sc, by + 12); ctx.closePath(); ctx.fill();
      } else if (lm.type === 'shattered_arch') {
        ctx.beginPath(); ctx.moveTo(wx - 54 * sc, by + 12); ctx.lineTo(wx - 36 * sc, by - 64 * sc); ctx.lineTo(wx - 12 * sc, by - 72 * sc); ctx.lineTo(wx - 22 * sc, by - 44 * sc); ctx.lineTo(wx - 32 * sc, by + 12); ctx.closePath(); ctx.fill();
      } else if (lm.type === 'volcano_crag') {
        ctx.beginPath(); ctx.moveTo(wx - 58 * sc, by + 12); ctx.lineTo(wx - 22 * sc, by - 66 * sc); ctx.lineTo(wx + 14 * sc, by - 58 * sc); ctx.lineTo(wx + 56 * sc, by + 12); ctx.closePath(); ctx.fill();
      } else if (lm.type === 'iceberg') {
        // 棱面冰山（左暗右亮，与月陨冰山光影一致）
        ctx.beginPath(); ctx.moveTo(wx - 48 * sc, by + 12); ctx.lineTo(wx - 18 * sc, by - 62 * sc); ctx.lineTo(wx + 6 * sc, by - 96 * sc); ctx.lineTo(wx + 28 * sc, by - 48 * sc); ctx.lineTo(wx + 52 * sc, by + 12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(232, 248, 255, 0.30)';
        ctx.beginPath(); ctx.moveTo(wx + 6 * sc, by - 96 * sc); ctx.lineTo(wx + 28 * sc, by - 48 * sc); ctx.lineTo(wx + 52 * sc, by + 12); ctx.lineTo(wx + 2 * sc, by + 12); ctx.closePath(); ctx.fill();
      } else if (lm.type === 'glacier_arch') {
        ctx.beginPath(); ctx.moveTo(wx - 58 * sc, by + 12); ctx.lineTo(wx - 26 * sc, by - 68 * sc); ctx.lineTo(wx + 18 * sc, by - 62 * sc); ctx.lineTo(wx + 54 * sc, by + 12); ctx.lineTo(wx + 28 * sc, by + 12); ctx.lineTo(wx + 8 * sc, by - 32 * sc); ctx.lineTo(wx - 18 * sc, by - 34 * sc); ctx.lineTo(wx - 32 * sc, by + 12); ctx.closePath(); ctx.fill();
      } else if (lm.type === 'crater_ridge' || lm.type === 'boulder_mesa') {
        ctx.beginPath(); ctx.moveTo(wx - 64 * sc, by + 12); ctx.lineTo(wx - 38 * sc, by - 48 * sc); ctx.lineTo(wx + 28 * sc, by - 44 * sc); ctx.lineTo(wx + 60 * sc, by + 12); ctx.closePath(); ctx.fill();
      } else if (lm.type === 'rusted_pylon') {
        ctx.save(); ctx.translate(wx, by + 10); ctx.rotate(0.16);
        ctx.strokeStyle = art.rgb(fogCol, 0.56); ctx.lineWidth = 2.4 * sc;
        ctx.beginPath(); ctx.moveTo(-13 * sc, 0); ctx.lineTo(-4 * sc, -80 * sc); ctx.moveTo(13 * sc, 0); ctx.lineTo(4 * sc, -80 * sc); ctx.moveTo(-20 * sc, -56 * sc); ctx.lineTo(20 * sc, -56 * sc); ctx.stroke();
        ctx.restore();
      } else if (lm.type === 'ruin_ivy') {
        ctx.fillRect(wx - 22 * sc, by - 62 * sc, 13 * sc, 72 * sc);
        ctx.fillRect(wx + 12 * sc, by - 46 * sc, 13 * sc, 56 * sc);
        if (trees.bush.length > 0) drawMaskedSprite(trees.bush[0], wx - 14 * sc, by - 44 * sc, 0.36 * sc, 0.72, false);
      } else if (lm.type === 'windmill_ruin') {
        ctx.beginPath(); ctx.moveTo(wx - 14 * sc, by + 10); ctx.lineTo(wx - 7 * sc, by - 58 * sc); ctx.lineTo(wx + 7 * sc, by - 58 * sc); ctx.lineTo(wx + 14 * sc, by + 10); ctx.closePath(); ctx.fill();
        ctx.save(); ctx.translate(wx, by - 52 * sc); ctx.rotate(t * 0.42 + lm.seed);
        ctx.strokeStyle = art.rgb(fogCol, 0.65); ctx.lineWidth = 2.2 * sc;
        for (var b = 0; b < 4; b++) {
          ctx.rotate(Math.PI * 0.5);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -34 * sc); ctx.stroke();
          ctx.fillStyle = 'rgba(246, 240, 224, 0.32)';
          ctx.fillRect(1.5 * sc, -32 * sc, 6.5 * sc, 22 * sc);
        }
        ctx.restore();
      }
    });
    ctx.restore();
  }

  function drawEmberMotes(eras, centerX, t, fireMix) {
    ctx.save();
    eras.getEmberMotes().forEach(function (em) {
      var tw = 0.45 + 0.55 * Math.sin(t * 3.5 + em.phase);
      ctx.fillStyle = 'rgba(255, 206, 126, ' + (0.58 * tw * fireMix) + ')';
      ctx.beginPath(); ctx.arc(centerX + em.ox, em.oy, em.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  function drawAshSnow(eras, centerX, t, iceMix) {
    ctx.save();
    eras.getAshSnow().forEach(function (sn) {
      ctx.fillStyle = 'rgba(226, 238, 248, ' + (0.48 * iceMix) + ')';
      ctx.beginPath(); ctx.arc(centerX + sn.ox, sn.oy, sn.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  function drawSpringRain(eras, centerX, meadowMix) {
    ctx.save();
    ctx.strokeStyle = 'rgba(232, 248, 238, ' + (0.24 * meadowMix) + ')';
    ctx.lineWidth = 1.0;
    ctx.lineCap = 'round';
    eras.getRainDrops().forEach(function (rd) {
      var x = centerX + rd.ox, y = rd.oy;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3.5, y + rd.len); ctx.stroke();
    });
    ctx.restore();
  }

  function drawForestSpores(eras, centerX, t, forestMix) {
    ctx.save();
    eras.getForestSpores().forEach(function (fs) {
      var x = centerX + fs.ox, y = fs.oy;
      var tw = 0.45 + 0.55 * Math.sin(t * 2.8 + fs.phase);
      var col = fs.gold ? '255, 242, 178' : '168, 248, 198';
      var g = ctx.createRadialGradient(x, y, 0.5, x, y, fs.r * 4.0);
      g.addColorStop(0, 'rgba(' + col + ', ' + (0.64 * tw * forestMix) + ')');
      g.addColorStop(1, 'rgba(' + col + ', 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, fs.r * 4.0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  function drawLavaPlumes(eras, t, viewLeft, viewRight) {
    var list = eras.getLavaPlumes();
    if (!list || list.length === 0) return;
    ctx.save();
    list.forEach(function (pl) {
      if (pl.x < viewLeft - 120 || pl.x > viewRight + 120) return;
      var surfY = eras.getSurfaceY(pl.x, t), topY = surfY - pl.height;
      var pulse = 0.80 + 0.20 * Math.sin(pl.phase);
      var colGrad = ctx.createLinearGradient(pl.x, surfY + 12, pl.x, topY);
      colGrad.addColorStop(0, 'rgba(255, 168, 86, ' + (0.42 * pulse) + ')');
      colGrad.addColorStop(0.45, 'rgba(255, 126, 72, ' + (0.22 * pulse) + ')');
      colGrad.addColorStop(1, 'rgba(255, 126, 72, 0)');
      ctx.fillStyle = colGrad;
      ctx.beginPath();
      ctx.moveTo(pl.x - pl.radius * 0.55, surfY + 8);
      ctx.quadraticCurveTo(pl.x - pl.radius * 0.95, (surfY + topY) * 0.5, pl.x - pl.radius * 0.65, topY);
      ctx.lineTo(pl.x + pl.radius * 0.65, topY);
      ctx.quadraticCurveTo(pl.x + pl.radius * 0.95, (surfY + topY) * 0.5, pl.x + pl.radius * 0.55, surfY + 8);
      ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }

  function drawDandelionGusts(eras, t, viewLeft, viewRight) {
    var list = eras.getDandelionGusts();
    if (!list || list.length === 0) return;
    ctx.save();
    list.forEach(function (gu) {
      if (gu.x < viewLeft - 140 || gu.x > viewRight + 140) return;
      var surfY = eras.getSurfaceY(gu.x, t), topY = surfY - gu.height;
      var pulse = 0.80 + 0.20 * Math.sin(gu.phase);
      var g = ctx.createLinearGradient(gu.x, surfY + 6, gu.x, topY);
      g.addColorStop(0, 'rgba(220, 248, 214, ' + (0.24 * pulse) + ')');
      g.addColorStop(0.55, 'rgba(255, 250, 224, ' + (0.14 * pulse) + ')');
      g.addColorStop(1, 'rgba(255, 250, 224, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(gu.x - gu.radius * 0.52, surfY + 6);
      ctx.quadraticCurveTo(gu.x - gu.radius * 0.88, (surfY + topY) * 0.5, gu.x - gu.radius * 0.52, topY);
      ctx.lineTo(gu.x + gu.radius * 0.52, topY);
      ctx.quadraticCurveTo(gu.x + gu.radius * 0.88, (surfY + topY) * 0.5, gu.x + gu.radius * 0.52, surfY + 6);
      ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }

  function drawSporeCurrents(eras, t, viewLeft, viewRight) {
    var list = eras.getSporeCurrents();
    if (!list || list.length === 0) return;
    ctx.save();
    list.forEach(function (spc) {
      if (spc.x < viewLeft - 160 || spc.x > viewRight + 160) return;
      var pulse = 0.82 + 0.18 * Math.sin(spc.phase);
      var g = ctx.createRadialGradient(spc.x, spc.y, 10, spc.x, spc.y, spc.rx * 1.25);
      g.addColorStop(0, 'rgba(182, 250, 206, ' + (0.36 * pulse) + ')');
      g.addColorStop(0.55, 'rgba(232, 246, 178, ' + (0.16 * pulse) + ')');
      g.addColorStop(1, 'rgba(182, 250, 206, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(spc.x, spc.y, spc.rx * 1.25, spc.ry * 1.25, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  // === 纪元 I 月潮之海：柔和暮光浮鲸背脊（带星斑与呼气水雾，可踩背二次飞升！）===
  function drawWhales(eras, t, viewLeft, viewRight) {
    var list = eras.getWhales ? eras.getWhales() : [];
    if (!list || list.length === 0) return;
    ctx.save();
    list.forEach(function (wh) {
      if (wh.x < viewLeft - 180 || wh.x > viewRight + 180) return;
      var wy = eras.getSurfaceY(wh.x, t) + Math.sin(wh.phase) * 7;
      var rx = wh.radiusX;

      ctx.save();
      ctx.translate(wh.x, wy);

      var glowR = rx * 1.15;
      var wg = ctx.createRadialGradient(0, -14, 6, 0, -10, glowR);
      wg.addColorStop(0, 'rgba(196, 238, 255, ' + (0.28 + wh.bounceFlash * 0.36) + ')');
      wg.addColorStop(1, 'rgba(166, 224, 255, 0)');
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.arc(0, -10, glowR, 0, Math.PI * 2); ctx.fill();

      var bodyGrad = ctx.createLinearGradient(0, -24, 0, 22);
      bodyGrad.addColorStop(0, '#446d96');
      bodyGrad.addColorStop(0.55, '#254468');
      bodyGrad.addColorStop(1, '#122642');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(-rx, 14);
      ctx.bezierCurveTo(-rx * 0.72, -24, rx * 0.42, -26, rx * 0.92, 6);
      ctx.quadraticCurveTo(rx * 0.35, 20, -rx, 14);
      ctx.closePath();
      ctx.fill();

      var tailSway = Math.sin(wh.phase * 1.4) * 5;
      ctx.beginPath();
      ctx.moveTo(rx * 0.78, 4);
      ctx.quadraticCurveTo(rx * 1.06, -12 + tailSway, rx * 1.24, -18 + tailSway);
      ctx.quadraticCurveTo(rx * 1.05, 4 + tailSway * 0.5, rx * 1.20, 12 + tailSway * 0.4);
      ctx.quadraticCurveTo(rx * 0.96, 10, rx * 0.72, 10);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(224, 246, 255, 0.58)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-rx * 0.76, 2);
      ctx.bezierCurveTo(-rx * 0.52, -21, rx * 0.34, -22, rx * 0.72, -2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(240, 250, 255, 0.72)';
      [-30, -10, 14, 34].forEach(function (ox, idx) {
        ctx.beginPath(); ctx.arc(ox, -9 + (idx % 2) * 4, 2.2, 0, Math.PI * 2); ctx.fill();
      });

      var spoutH = 18 + Math.sin(t * 3 + wh.phase) * 7 + wh.bounceFlash * 28;
      ctx.strokeStyle = 'rgba(224, 246, 255, 0.44)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-rx * 0.44, -12);
      ctx.quadraticCurveTo(-rx * 0.52, -12 - spoutH, -rx * 0.64, -10 - spoutH * 0.75);
      ctx.moveTo(-rx * 0.44, -12);
      ctx.quadraticCurveTo(-rx * 0.36, -12 - spoutH, -rx * 0.26, -10 - spoutH * 0.75);
      ctx.stroke();

      ctx.restore();
    });
    ctx.restore();
  }

  // === 三纪元高速滑轨机关（冰原晶莹冰桥 / 荒土旧铁残桥 / 林海发光树根轨）===
  function drawGrindRails(eras, t, viewLeft, viewRight, viewBottom) {
    var list = eras.getGrindRails ? eras.getGrindRails() : [];
    if (!list || list.length === 0) return;
    ctx.save();

    list.forEach(function (rl) {
      if (rl.x1 < viewLeft - 120 || rl.x0 > viewRight + 120) return;
      var glow = rl.glow || 0;

      var pillarCount = 4;
      for (var p = 0; p < pillarCount; p++) {
        var u = 0.08 + (p / (pillarCount - 1)) * 0.84;
        var px = rl.x0 + (rl.x1 - rl.x0) * u;
        var pyTop = eras.getRailY(rl, px);
        var pyBot = eras.getSurfaceY(px, t) + 18;
        if (pyBot <= pyTop + 4) continue;

        if (rl.style === 'ice_bridge') {
          var ig = ctx.createLinearGradient(px - 6, pyTop, px + 6, pyBot);
          ig.addColorStop(0, 'rgba(196, 238, 255, 0.72)');
          ig.addColorStop(1, 'rgba(64, 114, 148, 0.48)');
          ctx.fillStyle = ig;
          ctx.beginPath();
          ctx.moveTo(px - 5, pyTop + 2); ctx.lineTo(px + 5, pyTop + 2);
          ctx.lineTo(px + 9, pyBot); ctx.lineTo(px - 9, pyBot);
          ctx.closePath(); ctx.fill();
        } else if (rl.style === 'iron_bridge') {
          ctx.strokeStyle = 'rgba(92, 62, 48, 0.82)';
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.moveTo(px - 4, pyTop + 3); ctx.lineTo(px - 8, pyBot);
          ctx.moveTo(px + 4, pyTop + 3); ctx.lineTo(px + 8, pyBot);
          ctx.moveTo(px - 6, (pyTop + pyBot) * 0.5); ctx.lineTo(px + 6, (pyTop + pyBot) * 0.5);
          ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(34, 62, 48, 0.86)';
          ctx.lineWidth = 6.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(px, pyTop + 2);
          ctx.quadraticCurveTo(px + (p % 2 === 0 ? -12 : 12), (pyTop + pyBot) * 0.5, px, pyBot);
          ctx.stroke();
        }
      }

      ctx.lineCap = 'round';
      if (rl.style === 'ice_bridge') {
        ctx.strokeStyle = 'rgba(98, 166, 206, 0.86)';
        ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(rl.x0, rl.y0); ctx.quadraticCurveTo((rl.x0 + rl.x1) * 0.5, rl.cy, rl.x1, rl.y1); ctx.stroke();

        ctx.strokeStyle = 'rgba(238, 252, 255, ' + (0.84 + glow * 0.16) + ')';
        ctx.lineWidth = 3.4 + glow * 2.0;
        ctx.beginPath(); ctx.moveTo(rl.x0, rl.y0 - 2.5); ctx.quadraticCurveTo((rl.x0 + rl.x1) * 0.5, rl.cy - 2.5, rl.x1, rl.y1 - 2.5); ctx.stroke();
      } else if (rl.style === 'iron_bridge') {
        ctx.strokeStyle = '#4e3328';
        ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(rl.x0, rl.y0); ctx.quadraticCurveTo((rl.x0 + rl.x1) * 0.5, rl.cy, rl.x1, rl.y1); ctx.stroke();

        ctx.strokeStyle = glow > 0.1 ? '#ffe49e' : '#dfa86e';
        ctx.lineWidth = 3.2 + glow * 1.8;
        ctx.beginPath(); ctx.moveTo(rl.x0, rl.y0 - 2.5); ctx.quadraticCurveTo((rl.x0 + rl.x1) * 0.5, rl.cy - 2.5, rl.x1, rl.y1 - 2.5); ctx.stroke();
      } else {
        ctx.strokeStyle = '#254a3a';
        ctx.lineWidth = 11;
        ctx.beginPath(); ctx.moveTo(rl.x0, rl.y0); ctx.quadraticCurveTo((rl.x0 + rl.x1) * 0.5, rl.cy, rl.x1, rl.y1); ctx.stroke();

        ctx.strokeStyle = glow > 0.1 ? '#e2ffe8' : '#8ef0b2';
        ctx.lineWidth = 3.4 + glow * 2.2;
        ctx.beginPath(); ctx.moveTo(rl.x0, rl.y0 - 3); ctx.quadraticCurveTo((rl.x0 + rl.x1) * 0.5, rl.cy - 3, rl.x1, rl.y1 - 3); ctx.stroke();
      }
    });
    ctx.restore();
  }

  // === 从屏幕最顶端自然垂落的弯曲巨藤帘（彻底告别凭空悬停的小帽盖与竹竿！）===
  function drawVineCurtains(eras, t, viewLeft, viewRight, viewTop) {
    var list = eras.getVineCurtains();
    if (!list || list.length === 0) return;
    ctx.save();

    list.forEach(function (vn) {
      if (vn.x < viewLeft - 140 || vn.x > viewRight + 140) return;
      if (vn.sliced && vn.sliceFlash <= 0.02) return;
      var surfY = eras.getSurfaceY(vn.x, t);
      var topY = Math.min(viewTop - 40, surfY - 460);
      var alpha = vn.sliced ? vn.sliceFlash : 0.94;
      var splitAmp = vn.sliced ? (1 - vn.sliceFlash) * 52 : 0;

      ctx.save();
      ctx.globalAlpha = alpha;
      var strands = [
        { dx: -15, w: 3.2, curve: -26, lenFrac: 0.90 },
        { dx:  -1, w: 4.8, curve:  22, lenFrac: 0.96 },
        { dx:  12, w: 2.8, curve: -18, lenFrac: 0.86 }
      ];

      strands.forEach(function (st, idx) {
        var sx0 = vn.x + st.dx;
        var endY = topY + (surfY - 14 - topY) * st.lenFrac;
        var sway = Math.sin(t * 1.6 + vn.phase + idx * 1.3) * 12;
        var sideSplit = (idx % 2 === 0 ? -1 : 1) * splitAmp;

        var c1x = sx0 + st.curve + sway * 0.6 + sideSplit * 0.4;
        var c1y = topY + (endY - topY) * 0.36;
        var c2x = sx0 - st.curve * 0.8 + sway + sideSplit * 0.9;
        var c2y = topY + (endY - topY) * 0.72;
        var ex = sx0 + sway * 1.2 + sideSplit * 1.3;

        ctx.strokeStyle = idx === 1 ? '#1d3c2e' : '#2a523e';
        ctx.lineWidth = st.w;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx0, topY);
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, endY);
        ctx.stroke();

        // 沿藤条错落分布尖卵形叶片与发光琥珀荆棘
        for (var l = 2; l <= 7; l++) {
          var u = l / 8.2;
          var inv = 1 - u;
          var px = inv * inv * inv * sx0 + 3 * inv * inv * u * c1x + 3 * inv * u * u * c2x + u * u * u * ex;
          var py = inv * inv * inv * topY + 3 * inv * inv * u * c1y + 3 * inv * u * u * c2y + u * u * u * endY;
          var dir = (l + idx) % 2 === 0 ? 1 : -1;

          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(dir * (0.48 + 0.22 * Math.sin(t * 2 + l)));
          ctx.fillStyle = (l % 3 === 0) ? '#6cb67a' : '#336b4c';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(dir * 6, -4.2, dir * 13, 0);
          ctx.quadraticCurveTo(dir * 6, 4.2, 0, 0);
          ctx.fill();
          ctx.restore();

          if (idx === 1 && !vn.sliced && l >= 4 && l % 2 === 0) {
            ctx.fillStyle = '#eab068';
            ctx.beginPath();
            ctx.moveTo(px, py - 2); ctx.lineTo(px - dir * 8, py + 1); ctx.lineTo(px, py + 4);
            ctx.closePath(); ctx.fill();
          }
        }
      });
      ctx.restore();
    });
    ctx.restore();
  }

  function drawWaveLayer(baseY, tShift, parallax, amp, color, alpha, foam, eb, viewLeft, viewRight, viewBottom) {
    var art = window.MT.Art;
    var pts = [];
    var step = 28;
    var startX = Math.floor(viewLeft / step) * step;
    for (var wx = startX; wx <= viewRight + step; wx += step) {
      var px = wx * parallax;
      var y = baseY + Math.sin(px * 0.0055 + tShift) * amp + Math.sin(px * 0.0135 - tShift * 1.4) * (amp * 0.35);
      pts.push({ x: wx, y: y });
    }
    ctx.save();
    art.traceSmoothSpline(ctx, pts, true, startX, viewRight + step, viewBottom);
    ctx.fillStyle = art.rgb(color, alpha);
    ctx.fill();
    if (foam) {
      art.traceSmoothSpline(ctx, pts, false);
      ctx.strokeStyle = eb.fireMix > 0.5 ? 'rgba(255, 198, 126, 0.22)' : 'rgba(255, 242, 218, 0.14)';
      ctx.lineWidth = 2.0;
      ctx.stroke();
    }
    ctx.restore();
  }

  // =========================================================================
  // Layer 3: 干净深沉的 Alto 式主地表剪影（0 机械重复纹样，靠光影层次与自然簇群出高级感！）
  // =========================================================================
  function drawCleanTerrainSilhouette(eras, boat, pal, eb, t, moonWorldX, viewLeft, viewRight, viewBottom) {
    var art = window.MT.Art;
    var trees = art.getTreeSprites();
    var finaleMix = eb.finaleMix || 0;
    var seaMix = eb.weights.moon_sea || 0;
    var frostMix = eb.weights.frost_sea || 0;
    var fireMix = eb.fireMix;
    var iceMix = eb.iceMix;
    var wasteMix = eb.wasteMix;
    var meadowMix = eb.meadowMix;
    var forestMix = eb.forestMix * (1 - finaleMix);
    var landMix = Math.min(1, wasteMix + meadowMix + forestMix);

    var pts = [];
    var step = wasteMix > 0.2 ? 12 : 16;
    var startX = Math.floor(viewLeft / step) * step;
    var minSurfY = -64;
    for (var wx = startX; wx <= viewRight + step; wx += step) {
      var wy = eras.getSurfaceY(wx, t);
      if (wy < minSurfY) minSurfY = wy;
      pts.push({ x: wx, y: wy });
    }

    ctx.save();
    art.traceSmoothSpline(ctx, pts, true, startX, viewRight + step, viewBottom);

    // 1. 纯净深邃的垂直深度渐变主体（顶部自适应追踪真实巨浪峰值，让百米巨浪浑然一体！）
    var surfAlpha = landMix > 0.45 ? 1.0 : Math.min(1.0, 0.82 + fireMix * 0.14 + iceMix * 0.18 + landMix * 0.22);
    var midAlpha = (landMix > 0.45 || iceMix > 0.45) ? 1.0 : 0.96;
    var gradTopY = Math.min(-64, minSurfY - 6);
    var bodyGrad = ctx.createLinearGradient(0, gradTopY, 0, Math.max(360, viewBottom));
    var crestSeaCol = (seaMix > 0.5 && minSurfY < -90)
      ? art.lerpColor(pal.midSeaTop, [98, 178, 198], 0.42)
      : pal.midSeaTop;
    bodyGrad.addColorStop(0.00, art.rgb(crestSeaCol, surfAlpha));
    bodyGrad.addColorStop(0.28, art.rgb(pal.midSeaMid, midAlpha));
    bodyGrad.addColorStop(1.00, art.rgb(pal.midSeaDeep, 1.00));
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    ctx.save();
    ctx.clip();

    // A. 纪元 I 月潮之海：彻底删除原先 3 道生硬直边梯形光柱，改用极柔广域月光水下漫射！
    if (frostMix > 0.05 && window.MT.LevelEngine && window.MT.LevelEngine.drawUnderWater) {
      window.MT.LevelEngine.drawUnderWater(ctx, {
        t: t, eb: eb, boat: boat, viewLeft: viewLeft, viewRight: viewRight, viewBottom: viewBottom
      });
    }

    if (seaMix > 0.05) {
      ctx.save();
      ctx.globalAlpha = seaMix;
      var moonGlowY = eras.getSurfaceY(moonWorldX, t) + 18;
      var subGlow = ctx.createRadialGradient(moonWorldX, moonGlowY, 16, moonWorldX, moonGlowY + 30, 260);
      subGlow.addColorStop(0.00, 'rgba(255, 242, 206, 0.11)');
      subGlow.addColorStop(0.45, 'rgba(182, 224, 248, 0.05)');
      subGlow.addColorStop(1.00, 'rgba(182, 224, 248, 0)');
      ctx.fillStyle = subGlow;
      ctx.beginPath(); ctx.arc(moonWorldX, moonGlowY + 30, 260, 0, Math.PI * 2); ctx.fill();

      // 第二幕「蓝眼泪深潮」：海面下轻盈飘动的生物荧光浮游光尘（随波微曳，极度清透梦幻！）
      var bioM = (eb.seaPhase && eb.seaPhase.biolum) ? eb.seaPhase.biolum : 0;
      var cyanGlowSp = art.getGlowSprite ? art.getGlowSprite('cyan') : null;
      if (bioM > 0.05 && cyanGlowSp) {
        ctx.save();
        var ecoStep = (window.MT.Shop && window.MT.Shop.getSettings && window.MT.Shop.getSettings().quality === 'eco') ? 220 : 140;
        var pStart = Math.floor(viewLeft / ecoStep) * ecoStep;
        for (var px = pStart; px <= viewRight + ecoStep; px += ecoStep) {
          var seedP = px * 0.037;
          var rx = px + (h1(seedP) - 0.5) * 90 + Math.sin(t * 1.4 + seedP) * 12;
          var ry = eras.getSurfaceY(rx, t) + 14 + h1(seedP + 5.1) * 155;
          var tw = 0.45 + 0.55 * Math.sin(t * 3.2 + seedP * 4.2);
          var sz = (3.5 + h1(seedP + 9.3) * 4.5) * 4.8;
          ctx.globalAlpha = seaMix * bioM * tw * 0.85;
          ctx.drawImage(cyanGlowSp, rx - sz * 0.5, ry - sz * 0.5, sz, sz);
        }
        ctx.restore();
      }
      // 委派当前独立关卡插件的水下元素（如第 1 关深海发光星流、潜流丝线）
      if (window.MT.LevelEngine && window.MT.LevelEngine.drawUnderWater) {
        window.MT.LevelEngine.drawUnderWater(ctx, {
          t: t, eb: eb, boat: boat, viewLeft: viewLeft, viewRight: viewRight, viewBottom: viewBottom
        });
      }

      // 动态呼吸伸缩水母（各异倾角、深浅层次、透明伞盖内核与摇曳波浪长触须，绝不复制粘贴！）
      eras.getJellyfish().forEach(function (j) {
        if (j.x < viewLeft - 90 || j.x > viewRight + 90) return;
        var jy = j.depth;
        var contract = Math.sin(j.phase); // +1=收缩推进(变窄拉高), -1=舒张滑行(变宽扁)
        var tierAlpha = j.tier === 0 ? 0.34 : (j.tier === 1 ? 0.56 : 0.78);
        var rx = j.size * (1.06 - contract * 0.17);
        var ry = j.size * (j.bellRatio || 0.9) * (0.86 + contract * 0.20);

        ctx.save();
        ctx.translate(j.x, jy);
        ctx.rotate(j.tilt || 0);

        // 柔和深海生物微光晕
        var glowR = j.size * 2.5;
        var jg = ctx.createRadialGradient(0, -ry * 0.3, 1, 0, -ry * 0.2, glowR);
        jg.addColorStop(0, j.coreHue + (0.22 * tierAlpha) + ')');
        jg.addColorStop(1, j.rimHue + '0)');
        ctx.fillStyle = jg;
        ctx.beginPath(); ctx.arc(0, -ry * 0.2, glowR, 0, Math.PI * 2); ctx.fill();

        // 飘逸波浪长触须（长度、相位各异，滞后于伞盖搏动）
        var tCount = j.tentacles || 5;
        ctx.lineCap = 'round';
        for (var ti = 0; ti < tCount; ti++) {
          var frac = (ti / (tCount - 1)) - 0.5;
          var tx0 = frac * rx * 1.42;
          var tLen = j.size * (1.65 + (1 - Math.abs(frac) * 1.3) * 1.35 + h1(j.seed + ti * 3.1) * 0.65);
          var w1 = Math.sin(j.phase - 0.8 + ti * 1.1) * (j.size * 0.38);
          var w2 = Math.cos(j.phase - 1.5 + ti * 0.9) * (j.size * 0.48);
          ctx.strokeStyle = j.rimHue + ((0.22 + (1 - Math.abs(frac)) * 0.18) * tierAlpha) + ')';
          ctx.lineWidth = Math.abs(frac) < 0.2 ? 1.35 : 0.85;
          ctx.beginPath();
          ctx.moveTo(tx0, 1);
          ctx.bezierCurveTo(tx0 + w1, tLen * 0.36, tx0 - w2 * 0.7, tLen * 0.72, tx0 + w2, tLen);
          ctx.stroke();
        }

        // 柔美双瓣半透明水母伞盖
        var bellGrad = ctx.createRadialGradient(0, -ry * 0.55, ry * 0.1, 0, -ry * 0.2, rx * 1.25);
        bellGrad.addColorStop(0, j.coreHue + (0.52 * tierAlpha) + ')');
        bellGrad.addColorStop(0.65, j.rimHue + (0.34 * tierAlpha) + ')');
        bellGrad.addColorStop(1, j.rimHue + (0.12 * tierAlpha) + ')');
        ctx.fillStyle = bellGrad;
        ctx.beginPath();
        ctx.moveTo(-rx, 1);
        ctx.bezierCurveTo(-rx * 1.05, -ry * 1.15, rx * 1.05, -ry * 1.15, rx, 1);
        ctx.quadraticCurveTo(rx * 0.45, -2.5, 0, 2.2);
        ctx.quadraticCurveTo(-rx * 0.45, -2.5, -rx, 1);
        ctx.closePath();
        ctx.fill();

        // 伞盖内柔和发光核与极细亮边
        ctx.fillStyle = j.coreHue + (0.48 * tierAlpha) + ')';
        ctx.beginPath();
        ctx.ellipse(0, -ry * 0.42, rx * 0.36, ry * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = j.coreHue + (0.42 * tierAlpha) + ')';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-rx * 0.88, -1);
        ctx.bezierCurveTo(-rx * 0.82, -ry * 0.98, rx * 0.82, -ry * 0.98, rx * 0.88, -1);
        ctx.stroke();

        ctx.restore();
      });
      ctx.restore();
    }

    // B. 纪元 II 陨落火海：广域柔和熔岩底火微光（无重复巧克力豆！）
    if (fireMix > 0.05) {
      ctx.save();
      ctx.globalAlpha = fireMix;
      var glowGrad = ctx.createLinearGradient(0, -40, 0, 140);
      glowGrad.addColorStop(0, 'rgba(255, 198, 108, 0.32)');
      glowGrad.addColorStop(0.35, 'rgba(214, 72, 38, 0.16)');
      glowGrad.addColorStop(1, 'rgba(42, 12, 18, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(viewLeft, -80, viewRight - viewLeft, 240);
      ctx.restore();
    }

    // C. 纪元 III 尘冬冰原：宽幅柔和冰川折射泛光（无重复斜条纹与 Y 字！）
    if (iceMix > 0.05) {
      ctx.save();
      ctx.globalAlpha = iceMix;
      // 紧贴雪面下方的冷青半透明冰壳浅层带
      art.traceSmoothSpline(ctx, pts, false);
      ctx.strokeStyle = 'rgba(186, 232, 248, 0.30)';
      ctx.lineWidth = 26;
      ctx.stroke();

      // 单一宽阔天光斜射折射面（随镜头缓慢掠过，呈现整块巨冰的通透感）
      var sheenX = camX - 180 + Math.sin(camX * 0.0008) * 140;
      var sheen = ctx.createLinearGradient(sheenX, -60, sheenX - 220, 260);
      sheen.addColorStop(0, 'rgba(226, 248, 255, 0.16)');
      sheen.addColorStop(0.55, 'rgba(164, 214, 240, 0.05)');
      sheen.addColorStop(1, 'rgba(164, 214, 240, 0)');
      ctx.fillStyle = sheen;
      ctx.beginPath();
      ctx.moveTo(sheenX - 80, -80); ctx.lineTo(sheenX + 160, -80);
      ctx.lineTo(sheenX - 60, viewBottom); ctx.lineTo(sheenX - 300, viewBottom);
      ctx.closePath(); ctx.fill();

      // 实时冰面镜面船影（直接映在坚冰内部，起跳时对称沉降淡出，瞬间拉满滑冰实感！）
      if (window.MT.RenderBoat && window.MT.RenderBoat.drawIceReflection) {
        var boatIceY = eras.getSurfaceY(boat.x, t);
        window.MT.RenderBoat.drawIceReflection(ctx, boat, boatIceY, t, iceMix);
      }
      ctx.restore();
    }

    // D. 陆地纪元（荒土/青野/林海）：仅在表层下方压一道干净克制的次表层暗带（Alto 标志性立体厚边）
    if (landMix > 0.05) {
      ctx.save();
      ctx.globalAlpha = landMix;
      art.traceSmoothSpline(ctx, pts, false);
      ctx.strokeStyle = forestMix > 0.5
        ? 'rgba(16, 46, 38, 0.44)'
        : (meadowMix > 0.5 ? 'rgba(42, 74, 46, 0.34)' : 'rgba(56, 34, 26, 0.38)');
      ctx.lineWidth = 22;
      ctx.stroke();
      ctx.restore();
    }

    // 船头暖灯水下/冰下折射光晕 & 月光倒影
    if (landMix < 0.85) {
      var lampR = 165;
      var lx = boat.x + 34, ly = boat.y + 22;
      var warmWater = ctx.createRadialGradient(lx, ly, 10, lx + 14, ly + 36, lampR);
      warmWater.addColorStop(0, 'rgba(255, 212, 134, ' + (0.30 * (1 - landMix)) + ')');
      warmWater.addColorStop(1, 'rgba(255, 178, 96, 0)');
      ctx.fillStyle = warmWater;
      ctx.beginPath(); ctx.arc(lx + 14, ly + 36, lampR, 0, Math.PI * 2); ctx.fill();

      var reflTop = eras.getSurfaceY(moonWorldX, t) + 12;
      var rCol = iceMix > 0.5 ? '220, 244, 255' : (fireMix > 0.5 ? '255, 196, 118' : '255, 242, 206');
      for (var m = 0; m < 8; m++) {
        var p = m / 7;
        var my = reflTop + p * 78;
        var rx = (28 + p * 50) * (0.72 + 0.28 * Math.sin(t * 1.5 + m * 1.9));
        var mx = moonWorldX + Math.sin(t * 1.2 + m * 2.1) * (10 + p * 12);
        var rg = ctx.createRadialGradient(mx, my, 2, mx, my, rx);
        var pa = (1 - p * 0.78) * 0.24 * (1 - landMix);
        rg.addColorStop(0, 'rgba(' + rCol + ', ' + pa + ')');
        rg.addColorStop(1, 'rgba(' + rCol + ', 0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.ellipse(mx, my, rx, 5 + p * 4.5, 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.restore(); // end clip

    // === 2. 精致干练的材质顶光釉边（立住表面质感）===
    art.traceSmoothSpline(ctx, pts, false);
    if (forestMix > 0.5) {
      ctx.strokeStyle = 'rgba(136, 208, 134, 0.36)'; ctx.lineWidth = 6.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(208, 244, 176, 0.52)'; ctx.lineWidth = 1.6; ctx.stroke();
    } else if (meadowMix > 0.5) {
      ctx.strokeStyle = 'rgba(176, 224, 128, 0.42)'; ctx.lineWidth = 6.0; ctx.stroke();
      ctx.strokeStyle = 'rgba(236, 250, 194, 0.56)'; ctx.lineWidth = 1.6; ctx.stroke();
    } else if (wasteMix > 0.5) {
      ctx.strokeStyle = 'rgba(222, 176, 130, 0.42)'; ctx.lineWidth = 4.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(250, 218, 178, 0.46)'; ctx.lineWidth = 1.3; ctx.stroke();
    } else if (iceMix > 0.5) {
      ctx.strokeStyle = 'rgba(196, 232, 248, 0.55)'; ctx.lineWidth = 8.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(246, 252, 255, 0.92)'; ctx.lineWidth = 3.2; ctx.stroke();
    } else if (eb.seaPhase && eb.seaPhase.biolum > 0.15) {
      // 第二幕「蓝眼泪深潮」：波脊绽放流动的星海蓝眼泪荧光釉边！
      var bm = eb.seaPhase.biolum;
      ctx.strokeStyle = 'rgba(104, 232, 255, ' + (0.18 + bm * 0.26) + ')'; ctx.lineWidth = 7.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(202, 252, 255, ' + (0.52 + bm * 0.38) + ')'; ctx.lineWidth = 2.2; ctx.stroke();
    } else if (eb.seaPhase && eb.seaPhase.storm > 0.25) {
      // 第三幕「落月血潮风暴」：波脊映照绯金血月微光
      var sm = eb.seaPhase.storm;
      ctx.strokeStyle = 'rgba(255, 174, 128, ' + (0.16 + sm * 0.16) + ')'; ctx.lineWidth = 6.8; ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 234, 196, ' + (0.48 + sm * 0.22) + ')'; ctx.lineWidth = 2.1; ctx.stroke();
    } else {
      ctx.strokeStyle = fireMix > 0.5 ? 'rgba(255, 184, 96, 0.26)' : 'rgba(255, 242, 214, 0.16)'; ctx.lineWidth = 6.5; ctx.stroke();
      ctx.strokeStyle = fireMix > 0.5 ? 'rgba(255, 234, 166, 0.72)' : 'rgba(255, 244, 218, 0.48)'; ctx.lineWidth = 2.0; ctx.stroke();
    }

    // === 2b. 冰原滑行留下的实时冰刃划痕（双轨晶莹霜白细痕，随时间温柔淡隐）===
    if (iceMix > 0.12 && eras.getIceScratches) {
      var scratches = eras.getIceScratches();
      if (scratches.length >= 2) {
        ctx.save();
        ctx.lineCap = 'round';
        for (var scI = 1; scI < scratches.length; scI++) {
          var p0 = scratches[scI - 1], p1 = scratches[scI];
          if (p1.breakBefore || p1.x < viewLeft - 40 || p0.x > viewRight + 40) continue;
          var sa = Math.max(0, p1.life / p1.maxLife) * iceMix;
          ctx.strokeStyle = p1.carving
            ? 'rgba(255, 255, 255, ' + (sa * 0.92) + ')'
            : 'rgba(222, 248, 255, ' + (sa * 0.62) + ')';
          ctx.lineWidth = p1.carving ? 2.6 : 1.5;
          ctx.beginPath(); ctx.moveTo(p0.x, p0.y - 0.5); ctx.lineTo(p1.x, p1.y - 0.5); ctx.stroke();

          ctx.strokeStyle = 'rgba(182, 232, 252, ' + (sa * 0.35) + ')';
          ctx.lineWidth = 1.0;
          ctx.beginPath(); ctx.moveTo(p0.x, p0.y + 3.2); ctx.lineTo(p1.x, p1.y + 3.2); ctx.stroke();
        }
        ctx.restore();
      }
    }

    // === 3. 非均匀自然生态簇群（用大间距随机聚落替代机械等距循环！）===

    // 荒土：稀疏不规则剪影砾石堆（留出大片安静地面）
    if (wasteMix > 0.25) {
      ctx.save();
      ctx.globalAlpha = wasteMix * 0.90;
      var bStart = Math.floor(viewLeft / 240) * 240;
      for (var bx2 = bStart; bx2 <= viewRight + 240; bx2 += 240) {
        if (h1(bx2 * 0.037) < 0.42) continue;
        var rx2 = bx2 + (h1(bx2 * 0.11) - 0.5) * 140;
        var ry2 = eras.getSurfaceY(rx2, t);
        var rw2 = 8 + h1(bx2 * 0.29) * 10;
        var rh2 = 4 + h1(bx2 * 0.43) * 6;
        ctx.fillStyle = '#5c3c2e';
        ctx.beginPath();
        ctx.moveTo(rx2 - rw2, ry2 + 2); ctx.lineTo(rx2 - rw2 * 0.45, ry2 - rh2);
        ctx.lineTo(rx2 + rw2 * 0.35, ry2 - rh2 * 0.8); ctx.lineTo(rx2 + rw2, ry2 + 2);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    // 荒土末期（firstRain 征兆）率先从石缝冒出稀疏嫩绿草芽 -> 顺滑过渡到萌芽青野的草丛/野花/灌木/幼树！
    var om2 = eb.omen || {};
    var earlySprout = (om2.firstRain || 0) * 0.9;
    if (meadowMix > 0.12 || earlySprout > 0.12) {
      var activeS = eb.activeSeg || window.MT.Config.ERAS[4];
      var mStartX = (activeS && activeS.id === 'sprout_meadow') ? activeS.startX : (window.MT.Config.ERAS[4].startX || 41800);
      var mSpan = (activeS && activeS.id === 'sprout_meadow') ? Math.max(2000, activeS.endX - activeS.startX) : 10800;
      ctx.save();
      ctx.globalAlpha = Math.max(meadowMix, earlySprout) * 0.95;
      ctx.lineCap = 'round';
      var clStart = Math.floor(viewLeft / 180) * 180;
      for (var clx = clStart; clx <= viewRight + 180; clx += 180) {
        var gProg = meadowMix > 0.12 ? clamp01((clx - mStartX) / mSpan) : (earlySprout * 0.22);
        if (h1(clx * 0.071) > 0.45 + gProg * 0.48) continue;
        var cx = clx + (h1(clx * 0.13) - 0.5) * 95;
        var cy = eras.getSurfaceY(cx, t);
        var blades = 3 + Math.floor(gProg * 4);
        var sway = Math.sin(t * 2.4 + cx * 0.03) * (3 + gProg * 3);

        ctx.strokeStyle = gProg < 0.35 ? '#a8db7e' : '#7ac26e';
        ctx.lineWidth = 1.6;
        for (var bi = 0; bi < blades; bi++) {
          var ox = (bi - blades * 0.5) * 4.5 + (h1(clx + bi * 5.1) - 0.5) * 4;
          var hb = 6 + gProg * 14 + h1(clx * 0.19 + bi * 3.7) * 8;
          ctx.beginPath();
          ctx.moveTo(cx + ox, cy + 2);
          ctx.quadraticCurveTo(cx + ox + sway * 0.4, cy - hb * 0.55, cx + ox + sway + (bi - blades * 0.5) * 2.2, cy - hb);
          ctx.stroke();
          if (gProg > 0.28 && bi === 1 && h1(clx * 0.37) > 0.45) {
            ctx.fillStyle = h1(clx * 0.61) > 0.5 ? '#fff6be' : '#ffffff';
            ctx.beginPath(); ctx.arc(cx + ox + sway, cy - hb - 1.5, 2.2, 0, Math.PI * 2); ctx.fill();
          }
        }

        // 中后段偶发手绘灌木或嫩绿幼树
        if (gProg > 0.45 && h1(clx * 0.53) > 0.64 && trees.bush.length > 0) {
          drawMaskedSprite(trees.bush[Math.abs(Math.floor(clx)) % trees.bush.length], cx + 18, cy + 5, 0.32 + gProg * 0.18, 0.88, h1(clx) > 0.5);
        }
        if (gProg > 0.70 && h1(clx * 0.83) > 0.72 && trees.sapling.length > 0) {
          drawMaskedSprite(trees.sapling[Math.abs(Math.floor(clx)) % trees.sapling.length], cx - 12, cy + 6, 0.42 + gProg * 0.16, 0.90, h1(clx + 2) > 0.5);
        }
      }
      ctx.restore();
    }

    // 巨木林海：稀有自然成簇的剪影蕨叶与零星发光小蘑菇（绝不每 42px 排成灯带！）
    if (forestMix > 0.18) {
      ctx.save();
      ctx.globalAlpha = forestMix * 0.95;
      ctx.lineCap = 'round';
      var fClStart = Math.floor(viewLeft / 210) * 210;
      for (var fx = fClStart; fx <= viewRight + 210; fx += 210) {
        if (h1(fx * 0.043) < 0.34) continue;
        var fcx = fx + (h1(fx * 0.17) - 0.5) * 110;
        var fcy = eras.getSurfaceY(fcx, t);
        var fSway = Math.sin(t * 2.1 + fcx * 0.03) * 4;

        // 2~3 簇羽状蕨叶剪影
        ctx.strokeStyle = '#3f9664';
        ctx.lineWidth = 1.7;
        for (var fi = -1; fi <= 1; fi++) {
          var fxo = fcx + fi * 9;
          var fh = 12 + h1(fx + fi * 7.3) * 11;
          ctx.beginPath();
          ctx.moveTo(fxo, fcy + 2);
          ctx.quadraticCurveTo(fxo + fi * 6, fcy - fh * 0.8, fxo + fi * 14 + fSway, fcy - fh);
          ctx.stroke();
        }

        // 零星点缀 1~2 朵柔和微光森林蘑菇（稀缺才显珍贵意境）
        if (h1(fx * 0.67) > 0.58) {
          var mx = fcx + 14, my = fcy;
          var mg = ctx.createRadialGradient(mx, my - 7, 1, mx, my - 7, 18);
          mg.addColorStop(0, 'rgba(182, 252, 212, 0.48)');
          mg.addColorStop(1, 'rgba(182, 252, 212, 0)');
          ctx.fillStyle = mg;
          ctx.beginPath(); ctx.arc(mx, my - 7, 18, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#d4f6df'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(mx, my + 1); ctx.lineTo(mx, my - 6); ctx.stroke();
          ctx.fillStyle = '#c4fce0';
          ctx.beginPath(); ctx.arc(mx, my - 6, 4.2, Math.PI, 0); ctx.fill();
        }
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // =========================================================================
  // Layer 4: 电影级镜头前景暗色剪影视差（Alto's Odyssey / Gris 纵深速度感核心！）
  // =========================================================================
  function drawLensForeground(context, state) {
    var W = state.W, H = state.H;
    var eb = state.eb;
    var t = state.t;
    var cam = state.camX;
    var shift = cam * 1.42; // 比船更快掠过屏幕边缘，瞬间拉出极强电影景深！

    context.save();

    // 1. 巨木林海：屏幕上方两侧掠过的深色树冠叶影 + 底部高速掠过的巨蕨暗影
    if (eb.forestMix > 0.08) {
      context.save();
      context.globalAlpha = eb.forestMix * 0.52;
      context.fillStyle = '#0c221d';
      // 底部高速掠过的暗色巨蕨剪影
      var fgSpacing = 440;
      var firstFg = Math.floor((shift - 120) / fgSpacing) * fgSpacing;
      for (var x = firstFg; x < shift + W + 240; x += fgSpacing) {
        if (h1(x * 0.013) < 0.35) continue;
        var sx = x - shift;
        var hF = 54 + h1(x * 0.029) * 52;
        var sway = Math.sin(t * 2.2 + x * 0.01) * 10;
        context.beginPath();
        context.moveTo(sx - 24, H + 8);
        context.quadraticCurveTo(sx - 8, H - hF * 0.65, sx + 18 + sway, H - hF);
        context.quadraticCurveTo(sx + 14, H - hF * 0.45, sx + 28, H + 8);
        context.closePath();
        context.fill();
      }
      context.restore();
    }

    // 2. 萌芽青野：底部边缘轻扫镜头的高草暗色剪影
    if (eb.meadowMix > 0.08) {
      context.save();
      context.globalAlpha = eb.meadowMix * 0.42;
      context.strokeStyle = '#1f3b26';
      context.lineCap = 'round';
      var mSpacing = 360;
      var firstM = Math.floor((shift - 100) / mSpacing) * mSpacing;
      for (var mx = firstM; mx < shift + W + 200; mx += mSpacing) {
        var msx = mx - shift;
        var swayM = Math.sin(t * 2.8 + mx * 0.02) * 14;
        for (var k = 0; k < 3; k++) {
          var bh = 42 + h1(mx + k * 7) * 44;
          context.lineWidth = 3.2;
          context.beginPath();
          context.moveTo(msx + k * 14, H + 6);
          context.quadraticCurveTo(msx + k * 14 + swayM * 0.5, H - bh * 0.55, msx + k * 14 + swayM + k * 6, H - bh);
          context.stroke();
        }
      }
      context.restore();
    }

    // 3. 融冰荒土 / 陨落火海：底缘高速掠过的低矮暗色碎石/焦岩剪影
    var rockVis = Math.max(eb.wasteMix, eb.fireMix * 0.85);
    if (rockVis > 0.08) {
      context.save();
      context.globalAlpha = rockVis * 0.48;
      context.fillStyle = eb.fireMix > 0.5 ? '#1c0b10' : '#261814';
      var rSpacing = 520;
      var firstR = Math.floor((shift - 120) / rSpacing) * rSpacing;
      for (var rx = firstR; rx < shift + W + 220; rx += rSpacing) {
        if (h1(rx * 0.019) < 0.38) continue;
        var rsx = rx - shift;
        var rh = 28 + h1(rx * 0.031) * 34;
        var rw = 44 + h1(rx * 0.047) * 42;
        context.beginPath();
        context.moveTo(rsx - rw, H + 8);
        context.lineTo(rsx - rw * 0.35, H - rh);
        context.lineTo(rsx + rw * 0.25, H - rh * 0.76);
        context.lineTo(rsx + rw, H + 8);
        context.closePath();
        context.fill();
      }
      context.restore();
    }

    // 4. 尘冬冰原：贴近镜头的柔焦大雪花飘掠（景深虚化氛围）
    if (eb.iceMix > 0.08) {
      context.save();
      context.globalAlpha = eb.iceMix * 0.34;
      for (var sf = 0; sf < 8; sf++) {
        var sx2 = (((sf * 217 - shift * 0.65 - t * 65) % (W + 120)) + (W + 120)) % (W + 120) - 60;
        var sy2 = ((sf * 139 + t * (55 + (sf % 3) * 18)) % (H + 80)) - 40;
        var rad = 6 + (sf % 3) * 4;
        var sg = context.createRadialGradient(sx2, sy2, 1, sx2, sy2, rad);
        sg.addColorStop(0, 'rgba(240, 250, 255, 0.72)');
        sg.addColorStop(1, 'rgba(240, 250, 255, 0)');
        context.fillStyle = sg;
        context.beginPath(); context.arc(sx2, sy2, rad, 0, Math.PI * 2); context.fill();
      }
      context.restore();
    }

    // 5. 极速或火箭点火时的柔美渐隐风丝（仅在上空轻掠，两端透明羽化，绝不横穿水下或建筑！）
    var bRef = state.boat;
    if (bRef && !bRef.isDiving && (bRef.boosting || Math.abs(bRef.vx) > 470)) {
      var spdInt = Math.min(1, (bRef.boosting ? 0.45 : 0) + Math.max(0, (Math.abs(bRef.vx) - 440) / 260));
      var dirSign = bRef.vx >= 0 ? 1 : -1;
      context.save();
      context.lineWidth = 1.2;
      context.lineCap = 'round';
      for (var wl = 0; wl < 4; wl++) {
        var wy = H * (0.14 + wl * 0.105);
        var wLen = 64 + (wl % 2) * 36 + spdInt * 42;
        var wx = (((wl * 389 - t * (980 + spdInt * 540) * dirSign) % (W + 280)) + (W + 280)) % (W + 280) - 140;
        var wg = context.createLinearGradient(wx, wy, wx + wLen, wy);
        wg.addColorStop(0, 'rgba(255, 248, 234, 0)');
        wg.addColorStop(0.5, 'rgba(255, 248, 234, ' + (0.095 * spdInt) + ')');
        wg.addColorStop(1, 'rgba(255, 248, 234, 0)');
        context.strokeStyle = wg;
        context.beginPath();
        context.moveTo(wx, wy);
        context.lineTo(wx + wLen, wy);
        context.stroke();
      }
      context.restore();
    }

    context.restore();
  }

  function drawStarArcs(eras, t, viewLeft, viewRight) {
    var list = eras.getStarArcs();
    ctx.save();
    list.forEach(function (st) {
      if (st.collected || st.x < viewLeft - 50 || st.x > viewRight + 50) return;
      var tw = 0.76 + 0.24 * Math.sin(t * 4.5 + st.phase);
      var isBig = (st.value || 1) >= 2;
      var rGlow = (isBig ? 21 : 17) * tw;
      var g = ctx.createRadialGradient(st.x, st.y, 1, st.x, st.y, rGlow);
      if (st.theme === 'giant_forest') {
        g.addColorStop(0, 'rgba(244, 255, 224, 0.94)');
        g.addColorStop(0.42, 'rgba(156, 240, 178, 0.42)');
        g.addColorStop(1, 'rgba(156, 240, 178, 0)');
      } else if (st.theme === 'sprout_meadow') {
        g.addColorStop(0, 'rgba(255, 252, 214, 0.92)');
        g.addColorStop(0.42, 'rgba(196, 242, 148, 0.40)');
        g.addColorStop(1, 'rgba(196, 242, 148, 0)');
      } else if (st.theme === 'ice_winter') {
        g.addColorStop(0, 'rgba(236, 252, 255, 0.92)');
        g.addColorStop(0.42, 'rgba(146, 218, 255, 0.40)');
        g.addColorStop(1, 'rgba(146, 218, 255, 0)');
      } else if (st.theme === 'fire_sea') {
        g.addColorStop(0, 'rgba(255, 244, 196, 0.94)');
        g.addColorStop(0.42, 'rgba(255, 162, 88, 0.42)');
        g.addColorStop(1, 'rgba(255, 120, 62, 0)');
      } else {
        g.addColorStop(0, 'rgba(255, 246, 210, 0.90)');
        g.addColorStop(0.42, 'rgba(255, 214, 134, 0.34)');
        g.addColorStop(1, 'rgba(255, 204, 118, 0)');
      }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(st.x, st.y, rGlow, 0, Math.PI * 2); ctx.fill();

      ctx.save();
      ctx.translate(st.x, st.y);
      ctx.rotate(Math.sin(t * 1.8 + st.phase) * 0.25);
      ctx.fillStyle = st.theme === 'giant_forest' ? '#efffdf' : (st.theme === 'ice_winter' ? '#eefcff' : '#fff9e4');
      var rOut = (isBig ? 7.2 : 6.2) * tw, rIn = (isBig ? 2.2 : 1.9) * tw;
      ctx.beginPath();
      for (var i = 0; i < 8; i++) {
        var r = i % 2 === 0 ? rOut : rIn;
        var a = (i * Math.PI) / 4;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  function drawBuoys(eras, t, viewLeft, viewRight) {
    var art = window.MT.Art;
    var list = eras.getBuoys();
    ctx.save();
    list.forEach(function (by) {
      if (by.x < viewLeft - 70 || by.x > viewRight + 70) return;
      var wy = eras.getSurfaceY(by.x, t);
      var solid = by.theme !== 'moon_sea' && by.theme !== 'fire_sea';
      var tilt = solid ? 0 : Math.sin(by.phase) * 0.16;

      ctx.save();
      ctx.translate(by.x, wy);
      ctx.rotate(tilt);

      if (by.lit || by.flash > 0.05) {
        var gr = (by.lit ? 40 : 64) + by.flash * 24;
        var bg = ctx.createRadialGradient(0, -22, 2, 0, -22, gr);
        bg.addColorStop(0, by.theme === 'giant_forest' ? 'rgba(182, 250, 206, 0.68)' : 'rgba(255, 224, 152, ' + (by.lit ? 0.64 : by.flash * 0.48) + ')');
        bg.addColorStop(1, 'rgba(255, 180, 100, 0)');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(0, -22, gr, 0, Math.PI * 2); ctx.fill();
      }

      ctx.fillStyle = by.theme === 'giant_forest' ? '#365640' : (by.theme === 'ice_winter' ? '#4c3e44' : '#7a4e32');
      ctx.strokeStyle = '#342018';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(0, 2, 12, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      ctx.strokeStyle = '#c89668';
      ctx.lineWidth = 1.9;
      art.inkLine(ctx, 0, 0, 0, -24, by.id, 0.4);

      ctx.fillStyle = by.lit ? (by.theme === 'giant_forest' ? '#e2ffe8' : '#fff4d2') : 'rgba(210, 198, 182, 0.55)';
      ctx.beginPath(); art.drawRoundedRect(ctx, -4.2, -28, 8.4, 9.6, 3); ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  function drawParticles(eras) {
    var list = eras.getParticles();
    ctx.save();
    list.forEach(function (pt) {
      var a = Math.max(0, pt.life / pt.maxLife);
      if (pt.kind === 'ring') {
        ctx.strokeStyle = pt.color || '#ffe29c';
        ctx.globalAlpha = a * 0.55;
        ctx.lineWidth = 2.0;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.globalAlpha = a * 0.88;
        ctx.fillStyle = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.restore();
  }

  function drawPopups(eras) {
    var list = eras.getPopups();
    if (!list || list.length === 0) return;
    ctx.save();
    ctx.font = '15px "Songti SC", "Noto Serif SC", Georgia, serif';
    ctx.textAlign = 'center';
    list.forEach(function (po) {
      var a = Math.min(1, po.life / (po.maxLife * 0.45));
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(14, 18, 38, 0.65)';
      ctx.fillText(po.text, po.x + 1, po.y + 1.5);
      ctx.fillStyle = po.color;
      ctx.fillText(po.text, po.x, po.y);
    });
    ctx.restore();
  }

  return {
    drawBack: drawBack,
    drawFront: drawFront,
    drawLensForeground: drawLensForeground
  };
})();
