window.MT = window.MT || {};

// v12 Step 2：月潮博物手记「实景绘本快照」生成器
// 从真实 #game-canvas 截取小潜艇与奇观邂逅的瞬间，程序化套上手绘锯齿水彩邮票边框与月相邮戳存入存档
window.MT.Snapshot = (function () {
  var stampCanvas = null;
  var stampCtx = null;
  var STAMP_W = 264;
  var STAMP_H = 178;

  function ensureCanvas() {
    if (!stampCanvas) {
      stampCanvas = document.createElement('canvas');
      stampCanvas.width = STAMP_W;
      stampCanvas.height = STAMP_H;
      stampCtx = stampCanvas.getContext('2d');
    }
    return stampCtx;
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  // 绘制手绘水彩邮票锯齿白边与温润月相邮戳
  function drawStampFrame(ctx, w, h, phaseIcon, labelText) {
    var pad = 11;
    var bottomBand = 24;

    // 1. 邮票外框暗蓝纸底（供锯齿半圆镂空衬托立体感）
    ctx.save();
    ctx.fillStyle = '#f6eedc';
    ctx.fillRect(0, 0, w, pad);
    ctx.fillRect(0, h - bottomBand, w, bottomBand);
    ctx.fillRect(0, 0, pad, h);
    ctx.fillRect(w - pad, 0, pad, h);

    // 纸张边缘极淡泛黄水彩晕染
    var paperTint = ctx.createLinearGradient(0, 0, w, h);
    paperTint.addColorStop(0, 'rgba(238, 214, 172, 0.24)');
    paperTint.addColorStop(0.5, 'rgba(255, 250, 240, 0.06)');
    paperTint.addColorStop(1, 'rgba(218, 192, 152, 0.28)');
    ctx.fillStyle = paperTint;
    ctx.fillRect(0, 0, w, pad);
    ctx.fillRect(0, h - bottomBand, w, bottomBand);
    ctx.fillRect(0, 0, pad, h);
    ctx.fillRect(w - pad, 0, pad, h);

    // 2. 照片内框柔和水彩暗角 + 细铜色内描边
    var ix = pad, iy = pad, iw = w - pad * 2, ih = h - pad - bottomBand;
    var vig = ctx.createRadialGradient(ix + iw * 0.5, iy + ih * 0.5, Math.min(iw, ih) * 0.34, ix + iw * 0.5, iy + ih * 0.5, Math.max(iw, ih) * 0.68);
    vig.addColorStop(0, 'rgba(12, 22, 42, 0)');
    vig.addColorStop(1, 'rgba(18, 28, 48, 0.26)');
    ctx.fillStyle = vig;
    ctx.fillRect(ix, iy, iw, ih);

    ctx.strokeStyle = 'rgba(138, 102, 68, 0.52)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);

    // 3. 四周邮票齿孔半圆切口（暗海蓝底色点压出经典邮票锯齿！）
    ctx.fillStyle = '#152038';
    var toothStep = 14;
    var toothR = 3.2;
    for (var tx = 7; tx <= w - 7; tx += toothStep) {
      ctx.beginPath(); ctx.arc(tx, 0, toothR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(tx, h, toothR, 0, Math.PI * 2); ctx.fill();
    }
    for (var ty = 7; ty <= h - 7; ty += toothStep) {
      ctx.beginPath(); ctx.arc(0, ty, toothR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(w, ty, toothR, 0, Math.PI * 2); ctx.fill();
    }

    // 4. 邮票右下角温柔墨印月相邮戳 + 底部手记小铭文
    var px = w - 26, py = h - bottomBand - 16;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.14);
    ctx.strokeStyle = 'rgba(246, 228, 186, 0.55)';
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 9.2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255, 242, 206, 0.78)';
    ctx.font = '600 9px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(phaseIcon || '◐', 0, 3.2);
    ctx.restore();

    ctx.fillStyle = '#5c4636';
    ctx.font = '600 10.5px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(labelText || '月潮实景手记', pad + 3, h - 8.5);

    ctx.fillStyle = 'rgba(116, 90, 68, 0.72)';
    ctx.font = '500 9px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText('MOON TIDE', w - pad - 2, h - 8.5);

    ctx.restore();
  }

  // 截取当前实时画布并构图为居中绘本水彩邮票（自动优先对准小潜艇/目标主体！）
  function captureFromLiveCanvas(entryId, labelText, focusWorldX, focusWorldY) {
    var srcCanvas = document.getElementById('game-canvas');
    if (!srcCanvas || srcCanvas.width < 40 || srcCanvas.height < 40) return null;
    var ctx = ensureCanvas();

    var sw = srcCanvas.width;
    var sh = srcCanvas.height;
    var pad = 11;
    var bottomBand = 24;
    var iw = STAMP_W - pad * 2;
    var ih = STAMP_H - pad - bottomBand;
    var targetAspect = iw / ih;

    // 根据世界坐标反算在源画布上的聚焦中心（支持 dpr 与缩放）
    var camInfo = (window.MT.RenderWorld && window.MT.RenderWorld.getCameraInfo)
      ? window.MT.RenderWorld.getCameraInfo()
      : null;
    var boat = (window.MT.Physics && window.MT.Physics.getBoat) ? window.MT.Physics.getBoat() : null;
    var fx = typeof focusWorldX === 'number' ? focusWorldX : (boat ? boat.x : (camInfo ? camInfo.camX : 0));
    var fy = typeof focusWorldY === 'number' ? focusWorldY : (boat ? boat.y : (camInfo ? camInfo.camY : 0));

    var cx = sw * 0.5;
    var cy = sh * 0.5;
    if (camInfo && camInfo.W > 0 && camInfo.H > 0) {
      var sxCss = camInfo.W * 0.5 + (fx - camInfo.camX) * camInfo.camZoom;
      var syCss = camInfo.seaAnchorY + (fy - camInfo.camY) * camInfo.camZoom;
      cx = (sxCss / camInfo.W) * sw;
      cy = (syCss / camInfo.H) * sh;
    }

    // 取适中景别（约为画布高度的 72%），既能看清小潜艇与奇观细节，又能保留水彩氛围景深！
    var cropH = Math.min(sh, Math.max(sh * 0.68, 260));
    var cropW = cropH * targetAspect;
    if (cropW > sw * 0.92) {
      cropW = sw * 0.92;
      cropH = cropW / targetAspect;
    }

    var sx0 = clamp(cx - cropW * 0.5, 0, Math.max(0, sw - cropW));
    var sy0 = clamp(cy - cropH * 0.5, 0, Math.max(0, sh - cropH));

    ctx.clearRect(0, 0, STAMP_W, STAMP_H);
    ctx.fillStyle = '#0e162c';
    ctx.fillRect(0, 0, STAMP_W, STAMP_H);

    try {
      ctx.drawImage(srcCanvas, sx0, sy0, cropW, cropH, pad, pad, iw, ih);
    } catch (e) {
      return null;
    }

    var phaseIcon = '◐';
    if (window.MT.Eras && window.MT.Eras.getEraBlend && boat) {
      var eb = window.MT.Eras.getEraBlend(boat.x);
      var sp = eb && eb.seaPhase;
      var iconMap = { twilight: '◐', biolum: '✦', storm: '◉', boil_abyss: '◈', ash_sea: '◌', kelp_abyss: '✧', dawn: '☀' };
      if (sp && iconMap[sp.actId]) phaseIcon = iconMap[sp.actId];
    }

    drawStampFrame(ctx, STAMP_W, STAMP_H, phaseIcon, labelText);

    var dataUrl = null;
    try {
      dataUrl = stampCanvas.toDataURL('image/jpeg', 0.80);
    } catch (e) {
      try { dataUrl = stampCanvas.toDataURL('image/png'); } catch (e2) { return null; }
    }

    if (dataUrl && entryId && window.MT.Shop && window.MT.Shop.saveSnapshot) {
      window.MT.Shop.saveSnapshot(entryId, dataUrl);
    }
    return dataUrl;
  }

  function triggerShutterFlash() {
    var el = document.getElementById('shutter-flash');
    if (!el) return;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  // v13 Step 4：一键拼合导出玩家专属「月潮孤舟 · 博物邮票水彩长图」
  function exportStampPoster(onComplete) {
    var ce = (window.MT.Config && window.MT.Config.CODEX_ENTRIES) || { relics: [], fauna: [], wonders: [] };
    var shop = window.MT.Shop;
    var allEntries = []
      .concat((ce.relics || []).map(function (it) { return Object.assign({ _cat: '遗物' }, it); }))
      .concat((ce.fauna || []).map(function (it) { return Object.assign({ _cat: '生态' }, it); }))
      .concat((ce.wonders || []).map(function (it) { return Object.assign({ _cat: '奇观' }, it); }));

    var captured = [];
    allEntries.forEach(function (it) {
      var url = shop && shop.getSnapshot ? shop.getSnapshot(it.id) : null;
      if (url) captured.push({ item: it, url: url });
    });

    var prog = shop && shop.getCodexProgress ? shop.getCodexProgress() : { found: captured.length, total: 26 };
    var cols = 3;
    var cardW = 248, cardH = 168, gapX = 20, gapY = 44;
    var padX = 38, headH = 126, footH = 74;
    var showCount = Math.max(3, captured.length);
    var rows = Math.ceil(showCount / cols);
    var posterW = padX * 2 + cols * cardW + (cols - 1) * gapX;
    var posterH = headH + rows * (cardH + gapY) + footH;

    var pc = document.createElement('canvas');
    pc.width = posterW;
    pc.height = posterH;
    var ctx = pc.getContext('2d');

    var bgG = ctx.createLinearGradient(0, 0, 0, posterH);
    bgG.addColorStop(0.0, '#16203c');
    bgG.addColorStop(0.5, '#12243e');
    bgG.addColorStop(1.0, '#0e192f');
    ctx.fillStyle = bgG;
    ctx.fillRect(0, 0, posterW, posterH);

    for (var s = 0; s < 70; s++) {
      var sx = ((s * 173.7) % posterW);
      var sy = ((s * 291.3) % posterH);
      ctx.fillStyle = s % 3 === 0 ? 'rgba(255, 240, 192, 0.32)' : 'rgba(176, 242, 255, 0.24)';
      ctx.beginPath(); ctx.arc(sx, sy, 1.0 + (s % 2) * 0.7, 0, Math.PI * 2); ctx.fill();
    }

    ctx.strokeStyle = 'rgba(236, 202, 138, 0.42)';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(14, 14, posterW - 28, posterH - 28);
    ctx.strokeStyle = 'rgba(156, 238, 246, 0.20)';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(20, 20, posterW - 40, posterH - 40);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(236, 202, 138, 0.80)';
    ctx.font = '600 11px Georgia, serif';
    ctx.fillText('MOON TIDE SKIFF · COLLECTOR FIELD GUIDE', posterW * 0.5, 48);

    ctx.fillStyle = '#fff5dc';
    ctx.font = '600 28px "PingFang SC", "Microsoft YaHei", serif';
    ctx.fillText('月潮孤舟 · 博物邮票手记', posterW * 0.5, 82);

    ctx.fillStyle = '#a8f2ff';
    ctx.font = '500 12.5px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('双海域典藏录 · 已收录 ' + prog.found + ' / ' + prog.total + ' · 实景邮票 ' + captured.length + ' 枚', posterW * 0.5, 108);

    function finishPoster() {
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(236, 202, 138, 0.28)';
      ctx.lineWidth = 1.0;
      ctx.beginPath(); ctx.moveTo(padX, posterH - footH + 12); ctx.lineTo(posterW - padX, posterH - footH + 12); ctx.stroke();

      ctx.fillStyle = 'rgba(246, 232, 202, 0.76)';
      ctx.font = '500 12px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText('“自暮光灯塔启航，潜越落月深渊与霜穹极光，将每一帧潮汐光影封存于此。”', posterW * 0.5, posterH - 32);

      var finalUrl = null;
      try { finalUrl = pc.toDataURL('image/png'); } catch (e) {}
      if (finalUrl) {
        try {
          var a = document.createElement('a');
          a.href = finalUrl;
          a.download = 'moon-tide-stamps-' + captured.length + '.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (e2) {}
      }
      if (typeof onComplete === 'function') {
        onComplete({ dataUrl: finalUrl, count: captured.length, total: prog.total });
      }
    }

    if (captured.length === 0) {
      for (var e = 0; e < 3; e++) {
        var ex = padX + e * (cardW + gapX);
        var ey = headH;
        ctx.strokeStyle = 'rgba(236, 202, 138, 0.28)';
        ctx.setLineDash([6, 5]);
        ctx.strokeRect(ex, ey, cardW, cardH);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(240, 234, 222, 0.46)';
        ctx.font = '500 12px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('按 P 或靠近奇观留影邮票', ex + cardW * 0.5, ey + cardH * 0.5 + 4);
      }
      finishPoster();
      return;
    }

    var loaded = 0;
    captured.forEach(function (entry, idx) {
      var img = new Image();
      img.onload = function () {
        var col = idx % cols;
        var row = Math.floor(idx / cols);
        var dx = padX + col * (cardW + gapX);
        var dy = headH + row * (cardH + gapY);

        ctx.save();
        ctx.shadowColor = 'rgba(4, 10, 24, 0.55)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 5;
        ctx.drawImage(img, dx, dy, cardW, cardH);
        ctx.restore();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff3d4';
        ctx.font = '600 12.5px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(entry.item._cat + ' · ' + entry.item.name, dx + cardW * 0.5, dy + cardH + 22);

        loaded++;
        if (loaded >= captured.length) finishPoster();
      };
      img.onerror = function () {
        loaded++;
        if (loaded >= captured.length) finishPoster();
      };
      img.src = entry.url;
    });
  }

  return {
    captureFromLiveCanvas: captureFromLiveCanvas,
    triggerShutterFlash: triggerShutterFlash,
    exportStampPoster: exportStampPoster
  };
})();
