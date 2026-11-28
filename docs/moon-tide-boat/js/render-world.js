window.MT = window.MT || {};

// 镜头控制、全屏滤镜与三层渲染调度器（RenderSky -> RenderTerrain -> RenderBoat）
window.MT.RenderWorld = (function () {
  var canvas = null;
  var ctx = null;
  var dpr = 1;
  var W = 1280;
  var H = 720;

  var camX = 120;
  var camY = 0;
  var camZoom = 1.0;
  var shakeAmp = 0;
  var zoomPunch = 0;
  var hitstopTimer = 0;

  function addShake(amt) {
    shakeAmp = Math.min(14, Math.max(shakeAmp, amt || 0));
  }

  // 极短顿帧（Hitstop 24~40ms）+ 微幅镜头冲击推进
  function triggerImpact(hitstopSec, zoomAmt, shakeAmt) {
    if (hitstopSec > 0) hitstopTimer = Math.max(hitstopTimer, Math.min(0.055, hitstopSec));
    if (zoomAmt > 0) zoomPunch = Math.min(0.085, Math.max(zoomPunch, zoomAmt));
    if (shakeAmt > 0) addShake(shakeAmt);
  }

  function consumeHitstop(dt) {
    if (hitstopTimer > 0) {
      hitstopTimer = Math.max(0, hitstopTimer - dt);
      return true;
    }
    return false;
  }

  function snapCameraTo(x, y) {
    camX = x + Math.min(230, W * 0.17);
    camY = Math.min(18, y * 0.58);
  }

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    window.MT.Art.init(ctx);
    if (window.MT.RenderSky && window.MT.RenderSky.seed) {
      window.MT.RenderSky.seed();
    }
    resize();
    window.addEventListener('resize', resize);
  }

  function isEcoQuality() {
    return !!(window.MT.Shop && window.MT.Shop.getSettings && window.MT.Shop.getSettings().quality === 'eco');
  }

  function resize() {
    if (!canvas) return;
    W = window.innerWidth;
    H = window.innerHeight;
    var isMobileLike = (W <= 900) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && W <= 1180);
    var maxDpr = isEcoQuality() ? 1.0 : (isMobileLike ? 1.5 : 2);
    dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function render(dt) {
    var art = window.MT.Art;
    var eras = window.MT.Eras;
    var boat = window.MT.Physics.getBoat();
    var t = eras.getTime();
    var seaAnchorY = H * 0.63;

    var alt = Math.max(0, -boat.y);
    var spdFactor = Math.max(0, (boat.vx - 200) / 360);
    var inFinale = eras.isFinaleActive && eras.isFinaleActive();
    var targetZoom, targetCamX, targetCamY;

    if (inFinale) {
      // 终章电影广角构图：左中停泊孤舟，右中巍峨新生世界树，天际舒展翡翠晨曦！
      targetZoom = Math.max(0.60, Math.min(0.76, W / 1680));
      targetCamX = eras.getFinaleX() + 145;
      targetCamY = -98;
      camZoom += (targetZoom - camZoom) * Math.min(1, dt * 1.45);
      camX += (targetCamX - camX) * Math.min(1, dt * 1.65);
      camY += (targetCamY - camY) * Math.min(1, dt * 1.55);
    } else {
      if (window.MT.Config && window.MT.Config.EXPLORE_MODE) {
        var deepRatio = Math.max(0, Math.min(1, (boat.y - 24) / 260));
        var caveZoomOff = boat.inCave ? 0.04 : 0;
        var finaleBreath = Math.max(
          (window.MT.Shrines && window.MT.Shrines.getFinaleCinematicFactor) ? window.MT.Shrines.getFinaleCinematicFactor() : 0,
          (window.MT.IceShrines && window.MT.IceShrines.getFinaleCinematicFactor) ? window.MT.IceShrines.getFinaleCinematicFactor() : 0
        );
        targetZoom = 0.96 - deepRatio * 0.08 - caveZoomOff - finaleBreath * 0.14 - Math.min(0.14, (alt / 420) * 0.14);
        camZoom += (targetZoom - camZoom) * Math.min(1, dt * 2.2);

        var dirF = (typeof boat.facing === 'number') ? boat.facing : 1;
        var expLeadX = dirF * Math.min(125, W * 0.10) + boat.vx * 0.16;
        targetCamX = boat.x + expLeadX;

        if (boat.inCave) {
          // 深入封闭海底洞窟：镜头丝滑下潜居中跟拍，完整框住岩穹顶、钟乳石与洞底奇观！
          targetCamY = Math.max(260, Math.min(685, boat.y - 26));
        } else if (boat.isDiving || boat.y > 28) {
          targetCamY = Math.max(24, Math.min(460, boat.y * 0.88 + 20));
        } else {
          targetCamY = Math.min(18, boat.y * 0.52);
        }
        camX += (targetCamX - camX) * Math.min(1, dt * 3.6);
        camY += (targetCamY - camY) * Math.min(1, dt * 3.2);
      } else if (boat.inAbyss) {
        targetZoom = 0.86;
        camZoom += (targetZoom - camZoom) * Math.min(1, dt * 2.4);
        var aLeadX = Math.min(240, W * 0.19);
        targetCamX = boat.x + aLeadX;
        targetCamY = Math.max(175, Math.min(275, boat.y + 42));
        camX += (targetCamX - camX) * Math.min(1, dt * 4.6);
        camY += (targetCamY - camY) * Math.min(1, dt * 3.4);
      } else {
        targetZoom = Math.max(0.66, 1.0 - Math.min(0.22, (alt / 480) * 0.22) - spdFactor * 0.06);
        camZoom += (targetZoom - camZoom) * Math.min(1, dt * 2.8);

        var boostPushOffset = boat.boosting ? (Math.cos(boat.angle) * -42) : 0;
        var velShift = Math.max(-70, Math.min(55, (boat.vx - 240) * 0.12));
        var leadX = Math.min(210, W * 0.16) + velShift + boostPushOffset;
        targetCamX = boat.x + leadX;
        targetCamY = boat.isDiving
          ? Math.min(110, Math.max(18, boat.y * 0.68))
          : Math.min(18, boat.y * 0.58);
        camX += (targetCamX - camX) * Math.min(1, dt * 4.4);
        camY += (targetCamY - camY) * Math.min(1, dt * 4.2);
      }
    }

    var eb = eras.getEraBlend(camX);
    var seaScreenY = seaAnchorY - camY * camZoom;
    var skyHorizonY = Math.max(H * 0.45, Math.min(H + 120, seaScreenY + 32));
    var impactFlash = eras.getImpactFlash();

    // 1. 天空、薄云、羽化光束与 4 层大气透视天际线（含离屏棱面「月陨巨山」）
    var skyBodyX = window.MT.RenderSky.draw(ctx, {
      W: W, H: H, camX: camX, camY: camY,
      seaAnchorY: seaAnchorY, skyHorizonY: skyHorizonY,
      t: t, alt: alt, eb: eb,
      moonProg: eras.getMoonDescent(),
      impactTriggered: eras.isImpactTriggered(),
      impactAge: eras.getImpactAge(),
      impactFlash: impactFlash
    });

    // 2. 进入统一缩放世界坐标系
    if (zoomPunch > 0.001) zoomPunch *= Math.pow(0.003, dt);
    else zoomPunch = 0;
    var effZoom = camZoom + zoomPunch;

    var halfWWorld = (W * 0.5) / effZoom + 120;
    var worldState = {
      W: W,
      H: H,
      camX: camX,
      camY: camY,
      camZoom: effZoom,
      seaAnchorY: seaAnchorY,
      boat: boat,
      eb: eb,
      t: t,
      viewLeft: camX - halfWWorld,
      viewRight: camX + halfWWorld,
      viewTop: camY - seaAnchorY / effZoom - 80,
      viewBottom: Math.max(920, camY + (H - seaAnchorY) / effZoom + 180),
      moonWorldX: (skyBodyX - W * 0.5) / effZoom + camX
    };

    if (shakeAmp > 0.05) shakeAmp *= Math.pow(0.015, dt);
    else shakeAmp = 0;
    var boostRumble = boat.boosting ? 1.1 : 0;
    var totShake = Math.max(shakeAmp, boostRumble);
    var shkX = totShake > 0 ? Math.sin(t * 58) * totShake : 0;
    var shkY = totShake > 0 ? Math.cos(t * 47) * totShake * 0.7 : 0;

    ctx.save();
    ctx.translate(W * 0.5 + shkX, seaAnchorY + shkY);
    ctx.scale(effZoom, effZoom);
    ctx.translate(-camX, -camY);

    window.MT.RenderTerrain.drawBack(ctx, worldState);
    window.MT.RenderBoat.draw(ctx, boat, t);
    window.MT.RenderTerrain.drawFront(ctx, worldState);

    ctx.restore();

    // 3. 镜头边缘暗色前景剪影视差 + 独立关卡全屏氛围层（如潜海靛蓝水压晕影）
    window.MT.RenderTerrain.drawLensForeground(ctx, {
      W: W, H: H, camX: camX, t: t, eb: eb, boat: boat
    });
    if (window.MT.LevelEngine && window.MT.LevelEngine.drawHudOverlay) {
      window.MT.LevelEngine.drawHudOverlay(ctx, {
        W: W, H: H, camX: camX, camY: camY, camZoom: effZoom, seaAnchorY: seaAnchorY, t: t, eb: eb, boat: boat
      });
    }

    // 4. 撞击天光闪耀、流光狂热暖金边晕 & 环境温差边晕
    if (boat.feverTimer > 0.05) {
      var fStr = Math.min(1, boat.feverTimer / 1.5);
      var fv = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.36, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
      fv.addColorStop(0, 'rgba(0,0,0,0)');
      fv.addColorStop(1, 'rgba(255, 214, 126, ' + (0.18 * fStr) + ')');
      ctx.fillStyle = fv; ctx.fillRect(0, 0, W, H);
    }
    if (impactFlash > 0.02) {
      ctx.fillStyle = 'rgba(255, 240, 206, ' + (impactFlash * 0.58) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (boat.heatStress > 0.06) {
      var hv = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.34, W * 0.5, H * 0.5, Math.max(W, H) * 0.74);
      hv.addColorStop(0, 'rgba(0,0,0,0)');
      hv.addColorStop(1, 'rgba(210, 62, 34, ' + (boat.heatStress * 0.34) + ')');
      ctx.fillStyle = hv; ctx.fillRect(0, 0, W, H);
    }
    if (boat.coldStress > 0.06) {
      var cv = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.34, W * 0.5, H * 0.5, Math.max(W, H) * 0.76);
      cv.addColorStop(0, 'rgba(0,0,0,0)');
      cv.addColorStop(1, 'rgba(136, 204, 244, ' + (boat.coldStress * 0.34) + ')');
      ctx.fillStyle = cv; ctx.fillRect(0, 0, W, H);
    }
    if ((boat.frostChill || 0) > 0.08) {
      var fVig = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.36, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
      fVig.addColorStop(0, 'rgba(168, 232, 255, 0)');
      fVig.addColorStop(1, 'rgba(154, 224, 252, ' + (boat.frostChill * 0.30) + ')');
      ctx.fillStyle = fVig; ctx.fillRect(0, 0, W, H);
    }

    // 5. 冷压水彩画纸肌理（省电流畅档跳过全屏叠加节省像素填充！）
    if (!isEcoQuality()) {
      var paper = art.getPaperPattern();
      if (paper) {
        ctx.fillStyle = paper;
        ctx.fillRect(0, 0, W, H);
      }
    }
  }

  return {
    init: init,
    resize: resize,
    render: render,
    addShake: addShake,
    triggerImpact: triggerImpact,
    consumeHitstop: consumeHitstop,
    snapCameraTo: snapCameraTo,
    applyQualitySettings: resize,
    getCameraInfo: function () {
      return {
        W: W, H: H, dpr: dpr,
        camX: camX, camY: camY,
        camZoom: camZoom + zoomPunch,
        seaAnchorY: H * 0.63
      };
    }
  };
})();
