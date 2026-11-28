window.MT = window.MT || {};

// 天空、星尘、薄云、羽化光束与 4 层大气透视天际线（离屏棱面「月陨巨山」五纪元无痕演进）
window.MT.RenderSky = (function () {
  var stars = [];
  var backClouds = [];
  var frontClouds = [];
  var smokePuffs = [];

  function hash(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function seed() {
    stars = [];
    for (var i = 0; i < 120; i++) {
      stars.push({
        nx: Math.random(),
        ny: Math.random() * 0.60,
        r: 0.55 + Math.random() * 1.35,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.5
      });
    }

    backClouds = [];
    frontClouds = [];
    for (var c = 0; c < 5; c++) {
      backClouds.push({
        x: (c / 5) * 1.45 - 0.18 + Math.random() * 0.14,
        y: 0.14 + Math.random() * 0.22,
        scale: 0.85 + Math.random() * 0.55,
        speed: 0.0022 + Math.random() * 0.0024,
        alpha: 0.18 + Math.random() * 0.09,
        variant: c % 3
      });
    }
    for (var f = 0; f < 3; f++) {
      frontClouds.push({
        x: (f / 3) * 1.45 - 0.12 + Math.random() * 0.16,
        y: 0.24 + Math.random() * 0.18,
        scale: 0.70 + Math.random() * 0.45,
        speed: 0.0044 + Math.random() * 0.0032,
        alpha: 0.20 + Math.random() * 0.08,
        variant: (f + 1) % 3
      });
    }

    smokePuffs = [];
    for (var sp = 0; sp < 9; sp++) {
      smokePuffs.push({
        phase: sp / 9,
        drift: 0.72 + hash(sp * 3.1) * 0.55,
        spread: (hash(sp * 7.3) - 0.5) * 0.16
      });
    }
  }

  function drawCloudLayer(ctx, list, W, skyH, camX, t, parallax, yShift, opacityMult) {
    var sprites = window.MT.Art.getCloudSprites();
    if (!sprites || sprites.length === 0) return;
    ctx.save();
    list.forEach(function (cl) {
      var sp = sprites[cl.variant % sprites.length];
      var xNorm = (((cl.x + t * cl.speed - camX * parallax) % 1.45) + 1.45) % 1.45 - 0.22;
      var dw = sp.width * cl.scale;
      var dh = sp.height * cl.scale;
      ctx.globalAlpha = Math.min(0.45, cl.alpha * opacityMult);
      ctx.drawImage(sp, xNorm * W - dw * 0.5, cl.y * skyH - dh * 0.5 + yShift, dw, dh);
    });
    ctx.restore();
  }

  // 远景大气透视群山轮廓带（极远层 parallax 0.04，为天际线提供丰富纵深层次）
  function drawDistantAtmosphereRidge(ctx, W, skyHorizonY, camX, eb) {
    var art = window.MT.Art;
    var postSea = Math.min(1, eb.fireMix + eb.iceMix + eb.wasteMix + eb.meadowMix + eb.forestMix);
    if (postSea < 0.02) return;

    var pal = eb.palette;
    var ridgeCol = art.lerpColor(pal.skyHorizon, pal.farSea, 0.36);
    var shift = camX * 0.045;
    var baseY = skyHorizonY + 14;

    ctx.save();
    ctx.globalAlpha = 0.55 * postSea;
    ctx.beginPath();
    ctx.moveTo(-20, baseY + 20);
    for (var sx = -20; sx <= W + 40; sx += 26) {
      var wx = sx + shift;
      // 多频不规则棱角山脊（冰原/火海更锋利，青野/林海更舒缓）
      var jagged = Math.abs(Math.sin(wx * 0.0028 + 0.6)) * 68 + Math.abs(Math.sin(wx * 0.0071 + 1.9)) * 28;
      var rolling = (0.5 + 0.5 * Math.sin(wx * 0.0022 + 0.4)) * 58 + (0.5 + 0.5 * Math.cos(wx * 0.0054)) * 22;
      var sharpWeight = eb.fireMix + eb.iceMix + eb.wasteMix * 0.7;
      var h = art.lerp(rolling, jagged, Math.min(1, sharpWeight));
      ctx.lineTo(sx, baseY - 12 - h);
    }
    ctx.lineTo(W + 40, baseY + 20);
    ctx.closePath();

    var rGrad = ctx.createLinearGradient(0, baseY - 115, 0, baseY + 10);
    rGrad.addColorStop(0, art.rgb(ridgeCol, 0.85));
    rGrad.addColorStop(1, art.rgb(pal.haze, 0.15));
    ctx.fillStyle = rGrad;
    ctx.fill();
    ctx.restore();
  }

  // 离屏棱面「月陨巨山」五纪元无痕演进（彻底取代光滑 M 双峰与生硬半透明残影圆！）
  function drawMoonfallMountain(ctx, W, skyHorizonY, camX, t, eb, impactFlash) {
    var art = window.MT.Art;
    var sprites = art.getMountainSprites();
    if (!sprites || !sprites.fire) return;

    var wFire = eb.fireMix;
    var wIce = eb.iceMix;
    var wWaste = eb.wasteMix;
    var wMeadow = eb.meadowMix;
    var wForest = eb.forestMix;
    var postImpact = Math.min(1, wFire + wIce + wWaste + wMeadow + wForest);
    if (postImpact < 0.02) return;

    var hitX = window.MT.Config.IMPACT.HIT_X || 9600;
    var drift = ((camX - hitX) * 0.0024) % (W * 0.42);
    var drawW = Math.min(W * 0.90, 940);
    var drawH = drawW * (360 / 960);
    var drawX = W * 0.56 - drawW * 0.5 - drift * 0.25;
    var drawY = skyHorizonY + 20 - drawH;

    // 1. 巨山背后柔和大气逆光（广域柔晕，无硬圆圈边缘）
    var backCol = wFire > 0.4
      ? [255, 134, 72]
      : (wIce > 0.4 ? [204, 230, 248]
        : (wWaste > 0.4 ? [240, 188, 138]
          : (wForest > 0.4 ? [196, 244, 186] : [236, 244, 200])));
    var cx = drawX + drawW * 0.52;
    var cy = drawY + drawH * 0.58;
    var haloR = drawW * 0.58;
    ctx.save();
    var mHalo = ctx.createRadialGradient(cx, cy, haloR * 0.08, cx, cy, haloR);
    mHalo.addColorStop(0, art.rgb(backCol, (0.22 + wFire * 0.16 + impactFlash * 0.26) * postImpact));
    mHalo.addColorStop(0.55, art.rgb(backCol, 0.08 * postImpact));
    mHalo.addColorStop(1, art.rgb(backCol, 0));
    ctx.fillStyle = mHalo;
    ctx.fillRect(0, 0, W, skyHorizonY + 80);

    // 2. 火山烟羽（纪元 II 火海滚滚升腾，纪元 III 冰原化作微岚）
    var smokeVis = wFire + wIce * 0.26;
    var puffSp = art.getSmokePuffSprite();
    if (smokeVis > 0.05 && puffSp) {
      smokePuffs.forEach(function (sp) {
        var age = (sp.phase + t * 0.058 * sp.drift) % 1;
        var sx = drawX + drawW * (0.52 + sp.spread) + age * 90;
        var sy = drawY + drawH * 0.42 - age * drawH * 0.88;
        var sz = (66 + age * 165) * (0.85 + wFire * 0.28);
        ctx.globalAlpha = Math.sin(age * Math.PI) * 0.30 * smokeVis;
        ctx.drawImage(puffSp, sx - sz * 0.5, sy - sz * 0.5, sz, sz);
      });
    }

    // 3. 按当前纪元权重无缝交叉淡入 5 张离屏精绘棱面「月陨巨山」
    var layers = [
      { key: 'fire',   w: wFire },
      { key: 'ice',    w: wIce },
      { key: 'waste',  w: wWaste },
      { key: 'meadow', w: wMeadow },
      { key: 'forest', w: wForest }
    ];
    layers.forEach(function (ly) {
      if (ly.w > 0.01 && sprites[ly.key]) {
        ctx.globalAlpha = Math.min(1, ly.w * 1.05);
        ctx.drawImage(sprites[ly.key], drawX, drawY, drawW, drawH);
      }
    });
    ctx.restore();
  }

  function drawSoftSunbeams(ctx, W, H, t, meadowMix, forestMix) {
    var beamVis = Math.min(1, meadowMix * 0.36 + forestMix * 0.72);
    if (beamVis < 0.03) return;
    var sp = window.MT.Art.getSunbeamSprite();
    if (!sp) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var shafts = [
      { nx: 0.20, w: 230, a: 0.34, rot: 0.24 },
      { nx: 0.46, w: 300, a: 0.42, rot: 0.26 },
      { nx: 0.74, w: 240, a: 0.36, rot: 0.23 }
    ];
    shafts.forEach(function (sh, idx) {
      var sway = Math.sin(t * 0.26 + idx * 1.9) * 24;
      var breathe = 0.80 + 0.20 * Math.sin(t * 0.52 + idx * 2.4);
      ctx.save();
      ctx.translate(W * sh.nx + sway, -30);
      ctx.rotate(sh.rot);
      ctx.globalAlpha = beamVis * sh.a * breathe;
      ctx.drawImage(sp, -sh.w * 0.5, 0, sh.w, H * 1.12);
      ctx.restore();
    });
    ctx.restore();
  }

  function draw(ctx, state) {
    var art = window.MT.Art;
    var W = state.W, H = state.H;
    var camX = state.camX, camY = state.camY;
    var seaAnchorY = state.seaAnchorY;
    var skyHorizonY = state.skyHorizonY;
    var t = state.t;
    var alt = state.alt;
    var moonProg = state.moonProg;
    var impactTriggered = state.impactTriggered;
    var impactAge = state.impactAge;
    var impactFlash = state.impactFlash;
    var eb = state.eb;
    var pal = eb.palette;

    var fireMix = eb.fireMix;
    var iceMix = eb.iceMix;
    var wasteMix = eb.wasteMix;
    var meadowMix = eb.meadowMix;
    var forestMix = eb.forestMix;

    // 1. 六大纪元无缝水彩天空渐变
    var skyGrad = ctx.createLinearGradient(0, 0, 0, skyHorizonY);
    skyGrad.addColorStop(0, art.rgb(pal.skyTop));
    skyGrad.addColorStop(0.50, art.rgb(pal.skyMid));
    skyGrad.addColorStop(0.84, art.rgb(art.lerpColor(pal.skyMid, pal.skyHorizon, 0.72)));
    skyGrad.addColorStop(1, art.rgb(pal.skyHorizon));
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    var seaPhase = eb.seaPhase || null;
    var frostPhase = eb.frostPhase || null;
    var spBiolum = seaPhase ? seaPhase.biolum : 0;
    var spStorm  = seaPhase ? seaPhase.storm  : 0;
    var spAbyss  = seaPhase ? (seaPhase.abyssMix || 0) : 0;
    var spDawn   = seaPhase ? seaPhase.dawn   : 0;

    // 2. 星点（冰海极光夜繁星清冽闪烁，极昼冰雾柔和淡隐）
    var starVis = frostPhase
      ? Math.max(0, frostPhase.aurora * 1.05 + frostPhase.polarMist * 0.14 + frostPhase.thaw * 0.18)
      : Math.max(0.0, (1 + spBiolum * 0.45 - spDawn * 0.88 - spStorm * 0.25 - spAbyss * 1.15) - fireMix * 0.58 - iceMix * 0.82 - wasteMix * 0.40 - meadowMix * 0.96 - forestMix * 0.94);
    if (starVis > 0.02) {
      stars.forEach(function (st) {
        var tw = 0.4 + 0.6 * Math.sin(t * st.speed + st.phase);
        var sCol = spBiolum > 0.35 ? 'rgba(218, 246, 255, ' : 'rgba(255, 248, 232, ';
        ctx.fillStyle = sCol + Math.min(0.95, tw * 0.62 * starVis) + ')';
        ctx.beginPath(); ctx.arc(st.nx * W, st.ny * skyHorizonY, st.r * (1 + spBiolum * 0.22), 0, Math.PI * 2); ctx.fill();
      });
    }

    // 2b. 第二幕「蓝眼泪深潮」高空极淡星海青岚极光帷幕（克制柔美，绝不荧光刺眼！）
    if (spBiolum > 0.04) {
      ctx.save();
      ctx.globalAlpha = spBiolum * 0.42;
      for (var au = 0; au < 2; au++) {
        var ax = W * (0.28 + au * 0.38) + Math.sin(t * 0.25 + au * 2.1) * 45;
        var ay = skyHorizonY * (0.26 + au * 0.14);
        var ag = ctx.createRadialGradient(ax, ay, 14, ax, ay, W * 0.36);
        ag.addColorStop(0.00, au === 0 ? 'rgba(116, 234, 242, 0.36)' : 'rgba(154, 194, 255, 0.28)');
        ag.addColorStop(0.55, 'rgba(66, 152, 198, 0.12)');
        ag.addColorStop(1.00, 'rgba(32, 82, 128, 0)');
        ctx.fillStyle = ag;
        ctx.beginPath(); ctx.ellipse(ax, ay, W * 0.36, skyHorizonY * 0.24, -0.08 + au * 0.14, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // 2c. 终章永久焕新：西端「暮光灯塔港」上空柔美双色极光帷幕（翡翠 × 暖金，随接近港湾温柔绽放！）
    var harborLit = !!(window.MT.Shrines && window.MT.Shrines.isHarborIlluminated && window.MT.Shrines.isHarborIlluminated());
    if (harborLit && camX < 2400) {
      var hProx = Math.max(0, Math.min(1, 1 - (camX - 1050) / 1350));
      if (hProx > 0.02) {
        ctx.save();
        ctx.globalAlpha = hProx * 0.56;
        for (var ha = 0; ha < 3; ha++) {
          var hx = W * (0.20 + ha * 0.28) + Math.sin(t * 0.28 + ha * 1.9) * 38;
          var hy = skyHorizonY * (0.22 + (ha % 2) * 0.14);
          var hRad = W * 0.34;
          var hg = ctx.createRadialGradient(hx, hy, 12, hx, hy, hRad);
          if (ha % 2 === 0) {
            hg.addColorStop(0.00, 'rgba(116, 242, 206, 0.40)');
            hg.addColorStop(0.50, 'rgba(84, 198, 212, 0.16)');
            hg.addColorStop(1.00, 'rgba(64, 142, 184, 0)');
          } else {
            hg.addColorStop(0.00, 'rgba(255, 226, 152, 0.36)');
            hg.addColorStop(0.50, 'rgba(244, 178, 134, 0.14)');
            hg.addColorStop(1.00, 'rgba(182, 132, 148, 0)');
          }
          ctx.fillStyle = hg;
          ctx.beginPath();
          ctx.ellipse(hx, hy, hRad, skyHorizonY * 0.26, -0.10 + ha * 0.09, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // 2d. 第 2 海域《霜穹冰海》专属极地水彩极光帷幕（翡翠薄荷 × 冰青 × 粉紫星岚，柔和流动！）
    if (frostPhase) {
      var frostSanctOn = !!(window.MT.IceShrines && window.MT.IceShrines.isSanctuaryAwake && window.MT.IceShrines.isSanctuaryAwake());
      var auStr = Math.min(1.18, Math.max(frostSanctOn ? 0.82 : 0.18, frostPhase.aurora * 0.92 + frostPhase.polarMist * 0.22 + frostPhase.thaw * 0.28 + (frostSanctOn ? 0.32 : 0)));
      ctx.save();
      for (var fa = 0; fa < 3; fa++) {
        var fax = W * (0.18 + fa * 0.30) + Math.sin(t * 0.22 + fa * 2.1) * 55;
        var fay = skyHorizonY * (0.24 + (fa % 2) * 0.14);
        var faRx = W * (0.34 + fa * 0.04);
        var faRy = skyHorizonY * 0.28;
        var fg = ctx.createRadialGradient(fax, fay, 12, fax, fay, faRx);
        if (fa === 0) {
          fg.addColorStop(0.00, 'rgba(116, 248, 214, ' + (0.34 * auStr) + ')');
          fg.addColorStop(0.55, 'rgba(72, 204, 214, ' + (0.14 * auStr) + ')');
          fg.addColorStop(1.00, 'rgba(42, 132, 172, 0)');
        } else if (fa === 1) {
          fg.addColorStop(0.00, 'rgba(196, 168, 248, ' + (0.28 * auStr) + ')');
          fg.addColorStop(0.55, 'rgba(136, 178, 236, ' + (0.12 * auStr) + ')');
          fg.addColorStop(1.00, 'rgba(64, 118, 178, 0)');
        } else {
          fg.addColorStop(0.00, 'rgba(132, 244, 234, ' + (0.30 * auStr) + ')');
          fg.addColorStop(0.55, 'rgba(232, 176, 212, ' + (0.11 * auStr) + ')');
          fg.addColorStop(1.00, 'rgba(84, 146, 192, 0)');
        }
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.ellipse(fax, fay, faRx, faRy, -0.14 + fa * 0.11, 0, Math.PI * 2);
        ctx.fill();
      }
      // 柔和极光竖向垂丝流带（极光夜清晰浮现）
      var ribVis = Math.max(frostPhase.aurora, frostSanctOn ? 0.85 : 0);
      if (ribVis > 0.08) {
        ctx.globalAlpha = ribVis * (frostSanctOn ? 0.48 : 0.34);
        for (var rib = 0; rib < 2; rib++) {
          ctx.beginPath();
          var baseRy = skyHorizonY * (0.24 + rib * 0.12);
          for (var rx = -40; rx <= W + 40; rx += 32) {
            var ry = baseRy + Math.sin(rx * 0.0045 + t * 0.55 + rib * 2.2) * 28 + Math.cos(rx * 0.009 - t * 0.38) * 12;
            if (rx === -40) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
          }
          ctx.strokeStyle = rib === 0 ? 'rgba(156, 252, 224, 0.72)' : 'rgba(218, 186, 255, 0.56)';
          ctx.lineWidth = rib === 0 ? 18 : 12;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 3. 后景水彩薄云
    var cloudOpacity = 0.90 + iceMix * 0.55 + meadowMix * 0.22 - fireMix * 0.20;
    drawCloudLayer(ctx, backClouds, W, seaAnchorY, camX, t, 0.00004, -camY * 0.10, cloudOpacity);

    // 4a. 纪元 I 月潮之海：清透绘本满月（进入火海即完全消隐，不再在火山背后留半透明灰圆圈！）
    var moonSp = art.getMoonSprite();
    var baseUnit = Math.min(W, H);
    var moonR = baseUnit * (0.12 + moonProg * 0.25) * (1 + Math.min(0.08, alt / 1800));
    var moonX = W * (0.70 - moonProg * 0.07);
    var moonY = seaAnchorY * (0.34 + moonProg * 0.52) - camY * 0.08;

    var finaleMix = eb.finaleMix || 0;
    var isEndless = window.MT.Eras && window.MT.Eras.isEndlessMode && window.MT.Eras.isEndlessMode();
    var moonVis = frostPhase
      ? 0
      : (seaPhase
      ? Math.max(0.0, (1 - spAbyss * 1.4) * (1 - spDawn * 0.82))
      : (isEndless
        ? Math.max(0, (eb.weights.moon_sea || 0) * 1.15 - 0.05)
        : Math.max(0, 1 - (fireMix + iceMix + wasteMix + meadowMix + forestMix) * 1.45)));

    // 4a-frost. 霜穹冰海专属：清雅高悬的银白极地冷月 / 冰潮玫瑰低日（绝不坠海，静谧守望冰原！）
    if (frostPhase && moonSp) {
      var fmX = W * 0.74;
      var fmY = skyHorizonY * (0.34 + frostPhase.thaw * 0.24);
      var fmR = baseUnit * 0.095;
      ctx.save();
      var fHalo = ctx.createRadialGradient(fmX, fmY, fmR * 0.5, fmX, fmY, fmR * 3.8);
      if (frostPhase.thaw > 0.45) {
        fHalo.addColorStop(0.0, 'rgba(255, 238, 212, 0.42)');
        fHalo.addColorStop(0.45, 'rgba(244, 198, 186, 0.16)');
        fHalo.addColorStop(1.0, 'rgba(244, 198, 186, 0)');
      } else {
        fHalo.addColorStop(0.0, 'rgba(222, 252, 255, 0.36)');
        fHalo.addColorStop(0.45, 'rgba(146, 224, 240, 0.14)');
        fHalo.addColorStop(1.0, 'rgba(116, 198, 228, 0)');
      }
      ctx.fillStyle = fHalo;
      ctx.fillRect(0, 0, W, skyHorizonY + 80);
      ctx.globalAlpha = 0.86;
      var fmDraw = fmR * 2.4;
      ctx.drawImage(moonSp, fmX - fmDraw * 0.5, fmY - fmDraw * 0.5, fmDraw, fmDraw);
      ctx.restore();
    }
    if (moonVis > 0.01) {
      ctx.save();
      ctx.globalAlpha = moonVis;
      var halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.65, moonX, moonY, moonR * 3.4);
      var hInner = spStorm > 0.25
        ? art.lerpColor([255, 240, 200], [255, 174, 124], spStorm * 0.78)
        : (spBiolum > 0.25 ? art.lerpColor([255, 240, 200], [202, 242, 255], spBiolum * 0.55) : [255, 240, 200]);
      var hOuter = spStorm > 0.25
        ? art.lerpColor([238, 192, 156], [234, 108, 86], spStorm * 0.85)
        : (spBiolum > 0.25 ? art.lerpColor([238, 192, 156], [116, 204, 232], spBiolum * 0.65) : [238, 192, 156]);
      halo.addColorStop(0, art.rgb(hInner, 0.28 + moonProg * 0.14 + spStorm * 0.12 + impactFlash * 0.28));
      halo.addColorStop(0.42, art.rgb(hOuter, 0.12 + moonProg * 0.06 + spStorm * 0.08));
      halo.addColorStop(1, art.rgb(hOuter, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, skyHorizonY + 120);

      if (moonSp) {
        var moonDraw = moonR / 0.43;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, W, skyHorizonY + 14); ctx.clip();
        ctx.drawImage(moonSp, moonX - moonDraw * 0.5, moonY - moonDraw * 0.5, moonDraw, moonDraw);
        // 第三幕血潮风暴：给巨月蒙上一层温润绯金血月薄纱
        if (spStorm > 0.05) {
          var bm = ctx.createRadialGradient(moonX, moonY, moonR * 0.1, moonX, moonY, moonR * 1.02);
          bm.addColorStop(0, 'rgba(255, 168, 118, ' + (0.28 * spStorm) + ')');
          bm.addColorStop(0.75, 'rgba(226, 98, 76, ' + (0.36 * spStorm) + ')');
          bm.addColorStop(1, 'rgba(226, 98, 76, 0)');
          ctx.fillStyle = bm;
          ctx.beginPath(); ctx.arc(moonX, moonY, moonR * 1.02, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();
    }

    // 4b. 纪元 III..VI 复苏之日 & 第四幕「破晓彼岸」温润玫瑰金晨曦朝阳
    var omen = eb.omen || {};
    var sunVis = Math.min(1, iceMix + wasteMix + meadowMix + forestMix + finaleMix + spDawn + (omen.ashFall || 0) * 0.25);
    var sunX = W * (0.24 + meadowMix * 0.08 + forestMix * 0.12 + spDawn * 0.12);
    if (sunVis > 0.02) {
      var brightWarm = Math.min(1, wasteMix * 0.65 + meadowMix * 1.0 + forestMix * 0.96 + spDawn * 0.92);
      var sunY = seaAnchorY * (0.35 - brightWarm * 0.10);
      var sunR = baseUnit * (0.064 + brightWarm * 0.026);
      ctx.save();
      ctx.globalAlpha = sunVis;
      var sHalo = ctx.createRadialGradient(sunX, sunY, sunR * 0.22, sunX, sunY, sunR * (3.8 + brightWarm * 2.2));
      var sc1 = art.lerpColor([210, 224, 236], [255, 248, 212], brightWarm);
      var sc2 = art.lerpColor([142, 162, 184], [244, 218, 158], brightWarm);
      sHalo.addColorStop(0, art.rgb(sc1, 0.36 + brightWarm * 0.28));
      sHalo.addColorStop(0.45, art.rgb(sc2, 0.14 + brightWarm * 0.12));
      sHalo.addColorStop(1, art.rgb(sc2, 0));
      ctx.fillStyle = sHalo;
      ctx.fillRect(0, 0, W, skyHorizonY + 100);

      var disc = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR * 1.15);
      disc.addColorStop(0, art.rgb(art.lerpColor([238, 244, 250], [255, 254, 240], brightWarm), 0.92));
      disc.addColorStop(0.80, art.rgb(art.lerpColor([220, 232, 244], [255, 244, 206], brightWarm), 0.68));
      disc.addColorStop(1, 'rgba(255, 244, 206, 0)');
      ctx.fillStyle = disc;
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR * 1.15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // 4c. 撞击瞬间地平线赤金冲击波弧
    if (impactTriggered && impactAge < 3.6 && (moonVis > 0.02 || fireMix > 0.2)) {
      var p = impactAge / 3.6;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 232, 178, ' + ((1 - p) * 0.62) + ')';
      ctx.lineWidth = 3 + (1 - p) * 7;
      ctx.beginPath(); ctx.arc(W * 0.56, skyHorizonY, baseUnit * (0.22 + p * 1.25), Math.PI, 0); ctx.stroke();
      ctx.restore();
    }

    // 5. 极远群山大气层 + 离屏棱面「月陨巨山」
    drawDistantAtmosphereRidge(ctx, W, skyHorizonY, camX, eb);
    drawMoonfallMountain(ctx, W, skyHorizonY, camX, t, eb, impactFlash);

    // 6. 前景薄云 + 羽化林间光束 + 尘冬灰雾 + 地平线柔雾带
    drawCloudLayer(ctx, frontClouds, W, seaAnchorY, camX, t, 0.00008, -camY * 0.15, cloudOpacity);
    drawSoftSunbeams(ctx, W, H, t, Math.max(meadowMix, spDawn * 0.85), Math.max(forestMix, finaleMix, spDawn * 0.55));

    if (iceMix > 0.05) {
      var dustVeil = ctx.createLinearGradient(0, 0, 0, skyHorizonY * 0.65);
      dustVeil.addColorStop(0, 'rgba(34, 42, 60, ' + (0.38 * iceMix * (1 - (omen.thawCrack || 0) * 0.55)) + ')');
      dustVeil.addColorStop(1, 'rgba(96, 112, 130, 0)');
      ctx.fillStyle = dustVeil;
      ctx.fillRect(0, 0, W, skyHorizonY * 0.65);
    }

    var haze = ctx.createLinearGradient(0, skyHorizonY - 105, 0, skyHorizonY + 42);
    haze.addColorStop(0, art.rgb(pal.haze, 0));
    haze.addColorStop(0.66, art.rgb(pal.haze, 0.22 + fireMix * 0.10 + iceMix * 0.14 + forestMix * 0.12));
    haze.addColorStop(1, art.rgb(pal.haze, 0));
    ctx.fillStyle = haze;
    ctx.fillRect(0, skyHorizonY - 105, W, 147);

    return sunVis > 0.5 ? sunX : moonX;
  }

  seed();

  return {
    seed: seed,
    draw: draw
  };
})();
