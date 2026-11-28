window.MT = window.MT || {};

// v12.1 重绘：自然海底深谷与宏伟海蚀石拱圣殿（彻底摒弃生硬竖井切口、悬浮泥条与霓虹线框！）
// 两处深海秘境通过平滑高斯海谷自然下沉，并在谷底矗立深扎岩床的手绘水彩巨型天然石拱门
window.MT.Caves = (function () {
  var sanctuaries = [];
  var shards = [];
  var spores = [];
  var exitBurstCd = 0;
  var nextId = 1;

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function h1(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  function isExplore() {
    return !!(window.MT.Config && window.MT.Config.EXPLORE_MODE);
  }

  // 平滑自然的海底峡谷凹陷曲线（纯高斯钟形深谷，C∞ 光滑过渡，彻底消灭直角缺口！）
  function getValleyDepthOffset(worldX) {
    if (!isExplore()) return 0;
    var d1 = (worldX - 3150) / 390;
    var v1 = Math.exp(-d1 * d1) * 245;
    var d2 = (worldX - 7820) / 435;
    var v2 = Math.exp(-d2 * d2) * 280;
    return v1 + v2;
  }

  function getBedY(x) {
    if (window.MT.Abyss && window.MT.Abyss.getSeabedY) {
      return window.MT.Abyss.getSeabedY(x);
    }
    return 396 + getValleyDepthOffset(x);
  }

  function makeSanctuary(cfg) {
    var pearls = [];
    var pCnt = cfg.pearlCount || 7;
    for (var i = 0; i < pCnt; i++) {
      var u = (i + 0.5) / pCnt;
      var px = cfg.cx - cfg.archSpan * 0.44 + u * (cfg.archSpan * 0.88);
      var py = cfg.floorRef - 64 - Math.sin(u * Math.PI) * 58 + (h1(cfg.seed + i * 3.1) - 0.5) * 18;
      pearls.push({ x: px, y: py, phase: i * 0.7 + cfg.seed, collected: false, value: cfg.pearlValue || 6 });
    }

    var crystals = [];
    (cfg.crystalXs || []).forEach(function (cx, idx) {
      crystals.push({
        id: nextId++,
        x: cx,
        h: 52 + (idx % 2) * 18,
        w: 22,
        smashed: false,
        phase: idx * 1.6 + cfg.seed
      });
    });

    // 柔和垂挂在石拱内顶的海苔流苏丝（替代生硬锯齿钟乳石，极具宫崎骏水彩感！）
    var mossFronds = [];
    for (var m = 0; m < 11; m++) {
      var mu = (m + 0.5) / 11;
      mossFronds.push({
        u: mu,
        len: 20 + h1(cfg.seed + m * 5.3) * 34,
        phase: m * 1.1 + cfg.seed,
        glow: (m % 3 === 1)
      });
    }

    return Object.assign({}, cfg, {
      pearls: pearls,
      crystals: crystals,
      mossFronds: mossFronds,
      pocketGlow: 0,
      pocketCd: 0,
      sonarEcho: 0,
      centerResonance: 0,
      discovered: false
    });
  }

  function buildCaves() {
    sanctuaries = [];
    shards = [];
    spores = [];
    if (!isExplore()) return;

    // 1. 西深谷圣殿：「沉钟石窟」（x = 3150，谷底水深 y ≈ 640，柔和巨型海蚀石拱跨立谷中）
    sanctuaries.push(makeSanctuary({
      id: 'cave_bell_grotto',
      name: '沉钟石窟',
      theme: 'grotto',
      seed: 17.3,
      cx: 3150,
      archSpan: 640,
      archApexY: 458,
      archThickness: 44,
      floorRef: 640,
      exitX: 3560,
      centerpieceKind: 'sunken_bell',
      crystalXs: [2935, 3365],
      pearlCount: 7,
      pearlValue: 6,
      tintRgba: '132, 232, 240',
      accentRgba: '255, 224, 152'
    }));

    // 2. 东深谷圣殿：「月核晶洞」（x = 7820，谷底水深 y ≈ 678，宏伟幽蓝珊瑚岩拱庇护月核母晶）
    sanctuaries.push(makeSanctuary({
      id: 'cave_crystal_vault',
      name: '月核晶洞',
      theme: 'crystal',
      seed: 41.9,
      cx: 7820,
      archSpan: 720,
      archApexY: 478,
      archThickness: 48,
      floorRef: 678,
      exitX: 8275,
      centerpieceKind: 'moon_geode',
      crystalXs: [7575, 8065],
      pearlCount: 8,
      pearlValue: 8,
      tintRgba: '116, 238, 255',
      accentRgba: '255, 236, 170'
    }));
  }

  function reset() {
    exitBurstCd = 0;
    buildCaves();
  }

  // 自然拱形海蚀桥内顶曲线（平滑半椭圆拱，无任何突兀折角！）
  function getArchInnerY(cv, x) {
    var half = cv.archSpan * 0.5;
    var u = clamp((x - cv.cx) / half, -1, 1);
    var archLift = Math.sqrt(Math.max(0, 1 - u * u));
    var springY = cv.floorRef - 4;
    return springY - archLift * (springY - cv.archApexY);
  }

  function getArchOuterY(cv, x) {
    var half = cv.archSpan * 0.56;
    var u = clamp((x - cv.cx) / half, -1, 1);
    var archLift = Math.sqrt(Math.max(0, 1 - u * u));
    var baseTop = cv.archApexY - cv.archThickness;
    var wobble = Math.sin(x * 0.011 + cv.seed) * 7 + Math.cos(x * 0.023 + cv.seed) * 3.5;
    return (cv.floorRef + 40) - archLift * ((cv.floorRef + 40) - baseTop) + wobble * archLift;
  }

  function findSanctuaryAtX(x) {
    for (var i = 0; i < sanctuaries.length; i++) {
      var cv = sanctuaries[i];
      if (Math.abs(x - cv.cx) <= cv.archSpan * 0.78) return cv;
    }
    return null;
  }

  function isInsideCaveAirPocket(x, y) {
    for (var i = 0; i < sanctuaries.length; i++) {
      var cv = sanctuaries[i];
      var apex = cv.archApexY;
      if (Math.abs(x - cv.cx) < 84 && y >= apex - 8 && y <= apex + 58) {
        return true;
      }
    }
    return false;
  }

  function getCaveListForCompass() {
    return sanctuaries.map(function (cv) {
      return {
        id: cv.id,
        name: cv.name,
        x: cv.cx,
        centerX: cv.cx,
        discovered: !!cv.discovered
      };
    });
  }

  // === 物理交互：自然顺着宽阔海谷滑下，自由穿行巨型天然石拱下（或从石拱上方掠过），东坡享柔和上升洋流托举！===
  function handlePhysics(dt, boat, eras, st) {
    if (!isExplore() || sanctuaries.length === 0) return false;
    var cv = findSanctuaryAtX(boat.x);
    if (exitBurstCd > 0) exitBurstCd = Math.max(0, exitBurstCd - dt);

    if (!cv) {
      boat.inCave = false;
      boat.activeCaveName = '';
      return false;
    }

    var half = cv.archSpan * 0.5;
    var underArch = Math.abs(boat.x - cv.cx) < half * 0.88 && boat.y > getArchInnerY(cv, boat.x) - 6;
    var inDeepValley = Math.abs(boat.x - cv.cx) < half * 1.15 && boat.y > 435;

    if (underArch || inDeepValley) {
      boat.inCave = true;
      boat.activeCaveName = cv.name;
      if (!cv.discovered) {
        cv.discovered = true;
        if (window.MT.Audio && window.MT.Audio.playZoneChime) window.MT.Audio.playZoneChime();
        eras.addPopup(boat.x, boat.y - 46, '◈ 发现深谷秘境 · ' + cv.name, '#c8f8ff');
      }
    } else {
      boat.inCave = false;
      boat.activeCaveName = '';
    }

    // 东坡柔和上升洋流（顺着自然山谷坡势优雅上浮回中层海域！）
    if (Math.abs(boat.x - cv.exitX) < 62 && boat.y > 315 && boat.y < getBedY(boat.x) - 10) {
      boat.vy += (-240 - boat.vy) * Math.min(1, dt * 3.8);
      boat.vx += 45 * dt;
      boat.breath = Math.min(1.0, (boat.breath || 0) + 0.55 * dt);
      boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.35 * dt);
      if (exitBurstCd <= 0 && boat.y < 460) {
        exitBurstCd = 3.0;
        if (window.MT.Audio) window.MT.Audio.playUpdraft();
        eras.emitRing(boat.x, boat.y, '#9ef6ff');
      }
    }

    // 始终交回给常规平滑海床贴滑（因为现在海床本身就是连续光滑的深谷曲线，零硬墙卡顿！）
    return false;
  }

  function update(dt, boat, eras) {
    if (!isExplore() || sanctuaries.length === 0) return;
    var st = boat.stats || { starMult: 1, magnetRadius: 82, sonarRelicMult: 1, deepFinsLv: 0 };

    for (var i = 0; i < sanctuaries.length; i++) {
      var cv = sanctuaries[i];
      if (cv.pocketCd > 0) cv.pocketCd = Math.max(0, cv.pocketCd - dt);
      if (cv.pocketGlow > 0) cv.pocketGlow = Math.max(0, cv.pocketGlow - dt * 1.4);
      if (cv.sonarEcho > 0) cv.sonarEcho = Math.max(0, cv.sonarEcho - dt * 0.45);
      if (cv.centerResonance > 0) cv.centerResonance = Math.max(0, cv.centerResonance - dt * 0.72);

      if (Math.abs(boat.x - cv.cx) > 950) continue;

      // 拱顶隐藏亮银气室换气
      var apex = cv.archApexY;
      if (Math.abs(boat.x - cv.cx) < 82 && boat.y >= apex - 8 && boat.y <= apex + 58) {
        boat.breath = 1.0;
        boat.fuel = window.MT.Config.SURF.MAX_FUEL;
        cv.pocketGlow = 1.0;
        if (cv.pocketCd <= 0) {
          cv.pocketCd = 4.2;
          boat.hull = Math.min(boat.maxHull, boat.hull + 18);
          var pStar = Math.round(14 * st.starMult);
          boat.runStars += pStar;
          if (window.MT.Audio && window.MT.Audio.playAirPocketRefill) window.MT.Audio.playAirPocketRefill();
          eras.emitRing(cv.cx, apex + 22, '#a8f6ff');
          eras.addPopup(cv.cx, apex + 4, '✦ 石拱气室 · 气息回满 +' + pStar + '✦', '#c8f8ff');
        }
      }

      // 圣殿星珠收集
      var magR = Math.max(120, st.magnetRadius * 1.1);
      cv.pearls.forEach(function (pl) {
        if (pl.collected) return;
        pl.phase += dt * 3.0;
        var py = pl.y + Math.sin(pl.phase) * 4;
        var d = Math.hypot(boat.x - pl.x, boat.y - py);
        if (d < 46) {
          pl.collected = true;
          var val = Math.max(3, Math.round(pl.value * st.starMult));
          boat.runStars += val;
          boat.breath = Math.min(1.0, (boat.breath || 0) + 0.16);
          boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.06);
          if (window.MT.Audio) window.MT.Audio.playHookCatch();
        } else if ((boat.isDiving || boat.inAbyss) && d < magR) {
          pl.x += (boat.x - pl.x) * Math.min(1, dt * 10);
          pl.y += (boat.y - pl.y) * Math.min(1, dt * 10);
        }
      });

      // 圣殿月核晶簇震碎
      var dashRad = (st.deepFinsLv || 0) >= 2 ? 122 : 68;
      cv.crystals.forEach(function (cr) {
        if (cr.smashed) return;
        cr.phase += dt * 2.5;
        var cy = getBedY(cr.x) - cr.h * 0.5;
        if ((boat.isDiving || boat.inAbyss) && Math.hypot(boat.x - cr.x, boat.y - cy) < dashRad &&
            (boat.abyssDashTimer > 0 || boat.breachSmashTimer > 0 || boat.feverTimer > 0)) {
          cr.smashed = true;
          var cStar = Math.round(24 * st.starMult * (st.sonarRelicMult || 1));
          boat.runStars += cStar;
          boat.breath = Math.min(1.0, (boat.breath || 0) + 0.25);
          boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.35);
          for (var s = 0; s < 9; s++) {
            shards.push({
              x: cr.x + (Math.random() - 0.5) * 22,
              y: cy + (Math.random() - 0.5) * 26,
              vx: (Math.random() - 0.5) * 200,
              vy: -80 - Math.random() * 140,
              ang: Math.random() * Math.PI * 2,
              vAng: (Math.random() - 0.5) * 10,
              r: 4 + Math.random() * 5,
              life: 1.0 + Math.random() * 0.4,
              maxLife: 1.4
            });
          }
          if (window.MT.Audio && window.MT.Audio.playCrystalShatter) window.MT.Audio.playCrystalShatter();
          eras.emitRing(cr.x, cy, '#9ef6ff');
          eras.addPopup(cr.x, cy - 38, '✦ 深谷月核晶簇 +' + cStar + '✦', '#d4fbff');
          if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
            window.MT.RenderWorld.triggerImpact(0.028, 0.042, 4.6);
          }
        }
      });

      // 从深谷柔和上升的荧光矿尘微粒（游在上层也能隐约看到深谷在发光呼吸！）
      if (Math.random() < dt * 7) {
        if (spores.length > 60) spores.shift();
        var spX = cv.cx + (Math.random() - 0.5) * cv.archSpan * 0.78;
        spores.push({
          x: spX,
          y: getBedY(spX) - 18 - Math.random() * 110,
          vx: (Math.random() - 0.5) * 12,
          vy: -12 - Math.random() * 18,
          r: 1.5 + Math.random() * 2.1,
          col: Math.random() < 0.65 ? cv.tintRgba : cv.accentRgba,
          life: 2.0 + Math.random() * 1.4,
          maxLife: 3.4
        });
      }
    }

    for (var si = shards.length - 1; si >= 0; si--) {
      var sh = shards[si];
      sh.life -= dt;
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.vy += 240 * dt;
      sh.ang += sh.vAng * dt;
      if (sh.life <= 0) shards.splice(si, 1);
    }

    for (var pi = spores.length - 1; pi >= 0; pi--) {
      var sp = spores[pi];
      sp.life -= dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      if (sp.life <= 0) spores.splice(pi, 1);
    }
  }

  // === 绘制层 1：绘制在海床实体剪影之前！巨型天然水彩石拱双脚深扎峡谷岩底，随后由平滑海床泥沙半埋融接，零悬浮板、零硬线框！===
  function drawSanctuaryBack(ctx, state) {
    if (!isExplore() || sanctuaries.length === 0) return;
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    var ash = (window.MT.Abyss && window.MT.Abyss.getAshMix) ? window.MT.Abyss.getAshMix((viewLeft + viewRight) * 0.5) : 0;

    sanctuaries.forEach(function (cv) {
      if (cv.cx + cv.archSpan * 0.75 < viewLeft - 180 || cv.cx - cv.archSpan * 0.75 > viewRight + 180) return;
      var half = cv.archSpan * 0.5;
      var halfOut = cv.archSpan * 0.56;
      var step = 18;
      var echo = cv.sonarEcho || 0;

      ctx.save();

      // 1. 远景幽深海蚀拱内层阴影（极柔雾感多层透视，烘托大教堂般深邃空间！）
      var backGlow = ctx.createRadialGradient(cv.cx, cv.floorRef - 60, 20, cv.cx, cv.floorRef - 60, half * 0.95);
      backGlow.addColorStop(0.0, 'rgba(' + cv.tintRgba + ', ' + (0.14 + echo * 0.14) + ')');
      backGlow.addColorStop(0.55, 'rgba(14, 32, 54, 0.22)');
      backGlow.addColorStop(1.0, 'rgba(10, 22, 42, 0)');
      ctx.fillStyle = backGlow;
      ctx.beginPath();
      ctx.ellipse(cv.cx, cv.floorRef - 45, half * 0.96, 175, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      // 2. 宏伟天然手绘水彩海蚀石拱（厚重圆润的天然拱岩，双脚深扎海底 +120px，零霓虹描边！）
      ctx.beginPath();
      var xOutL = cv.cx - halfOut;
      var xOutR = cv.cx + halfOut;
      ctx.moveTo(xOutL, cv.floorRef + 120);
      for (var ox = xOutL; ox <= xOutR; ox += step) {
        ctx.lineTo(ox, getArchOuterY(cv, ox));
      }
      ctx.lineTo(xOutR, cv.floorRef + 120);
      // 镂空内侧优雅半圆石拱孔洞（潜艇自在穿行其中！）
      var xInR = cv.cx + half;
      var xInL = cv.cx - half;
      ctx.lineTo(xInR, cv.floorRef + 120);
      for (var ix = xInR; ix >= xInL; ix -= step) {
        ctx.lineTo(ix, getArchInnerY(cv, ix));
      }
      ctx.lineTo(xInL, cv.floorRef + 120);
      ctx.closePath();

      var archG = ctx.createLinearGradient(0, cv.archApexY - cv.archThickness - 10, 0, cv.floorRef + 40);
      if (ash > 0.35) {
        archG.addColorStop(0.00, '#44484d');
        archG.addColorStop(0.45, '#2b3138');
        archG.addColorStop(1.00, '#161b22');
      } else if (cv.theme === 'crystal') {
        archG.addColorStop(0.00, '#2a465f');
        archG.addColorStop(0.45, '#1b3149');
        archG.addColorStop(1.00, '#0e1d32');
      } else {
        archG.addColorStop(0.00, '#32425c');
        archG.addColorStop(0.45, '#1e2c44');
        archG.addColorStop(1.00, '#101b30');
      }
      ctx.fillStyle = archG;
      ctx.fill();

      // 石拱内部柔和沉积水彩岩纹与拱背柔光（零生硬描边，纯靠光影明暗立住体积！）
      ctx.save();
      ctx.clip();
      ctx.fillStyle = 'rgba(182, 224, 240, ' + (0.09 + echo * 0.10) + ')';
      ctx.beginPath();
      ctx.ellipse(cv.cx, cv.archApexY - cv.archThickness + 8, half * 0.72, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(12, 22, 38, 0.24)';
      ctx.lineWidth = 2.2;
      for (var rl = 0; rl < 2; rl++) {
        ctx.beginPath();
        for (var rx = xOutL + 20; rx <= xOutR - 20; rx += step) {
          var ry = getArchOuterY(cv, rx) + 14 + rl * 15;
          if (rx === xOutL + 20) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
        }
        ctx.stroke();
      }
      ctx.restore();

      // 拱腹内侧柔和微光反射（被圣殿古钟/月核母晶照亮的温柔漫反射，声呐扫过时如呼吸般泛起暖青微晕！）
      if (echo > 0.03) {
        var underG = ctx.createRadialGradient(cv.cx, cv.archApexY + 14, 14, cv.cx, cv.archApexY + 34, half * 0.78);
        underG.addColorStop(0, 'rgba(' + cv.tintRgba + ', ' + (0.28 * echo) + ')');
        underG.addColorStop(1, 'rgba(' + cv.tintRgba + ', 0)');
        ctx.fillStyle = underG;
        ctx.beginPath();
        ctx.ellipse(cv.cx, cv.archApexY + 26, half * 0.78, 52, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. 垂挂在石拱内壁的柔和海苔丝带（随暗流轻轻摇曳，取代尖硬钟乳石！）
      cv.mossFronds.forEach(function (mf) {
        var mx = cv.cx - half * 0.72 + mf.u * (half * 1.44);
        if (Math.abs(mx - cv.cx) < 76) return; // 避开正中气室
        var my = getArchInnerY(cv, mx) - 2;
        var sway = Math.sin(t * 1.5 + mf.phase) * 7;
        ctx.strokeStyle = mf.glow ? ('rgba(' + cv.tintRgba + ', 0.44)') : 'rgba(42, 92, 108, 0.48)';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.quadraticCurveTo(mx + sway * 0.5, my + mf.len * 0.55, mx + sway, my + mf.len);
        ctx.stroke();

        if (mf.glow) {
          var dg = ctx.createRadialGradient(mx + sway, my + mf.len, 0.5, mx + sway, my + mf.len, 7);
          dg.addColorStop(0, 'rgba(' + cv.tintRgba + ', 0.72)');
          dg.addColorStop(1, 'rgba(' + cv.tintRgba + ', 0)');
          ctx.fillStyle = dg;
          ctx.beginPath(); ctx.arc(mx + sway, my + mf.len, 7, 0, Math.PI * 2); ctx.fill();
        }
      });

      // 4. 拱顶柔和亮银空气气室（自然紧贴石拱内穹最高处！）
      var apex = cv.archApexY;
      var pGlowA = 0.30 + cv.pocketGlow * 0.38 + Math.sin(t * 2.5 + cv.seed) * 0.06;
      var airG = ctx.createRadialGradient(cv.cx, apex + 8, 6, cv.cx, apex + 16, 98);
      airG.addColorStop(0.0, 'rgba(232, 254, 255, ' + (0.62 + cv.pocketGlow * 0.25) + ')');
      airG.addColorStop(0.5, 'rgba(136, 228, 248, ' + pGlowA + ')');
      airG.addColorStop(1.0, 'rgba(84, 178, 212, 0)');
      ctx.fillStyle = airG;
      ctx.beginPath();
      ctx.ellipse(cv.cx, apex + 16, 74, 28, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(240, 254, 255, 0.82)';
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cv.cx - 54, apex + 18);
      ctx.quadraticCurveTo(cv.cx, apex + 18 + Math.sin(t * 3.4 + cv.seed) * 3, cv.cx + 54, apex + 18);
      ctx.stroke();

      // 5. 谷底中央地标奇观（古青铜沉钟 / 五棱月核母晶圣殿，半埋于下方海床淤泥之中！）
      var cpy = getBedY(cv.cx);
      if (cv.centerpieceKind === 'sunken_bell') {
        ctx.save();
        ctx.translate(cv.cx, cpy + 6);
        ctx.rotate(-0.16);
        var bHalo = ctx.createRadialGradient(0, -34, 8, 0, -34, 128);
        bHalo.addColorStop(0, 'rgba(255, 224, 152, ' + (0.30 + cv.centerResonance * 0.28) + ')');
        bHalo.addColorStop(0.6, 'rgba(126, 232, 240, 0.10)');
        bHalo.addColorStop(1, 'rgba(126, 232, 240, 0)');
        ctx.fillStyle = bHalo;
        ctx.beginPath(); ctx.arc(0, -34, 128, 0, Math.PI * 2); ctx.fill();

        var bGrad = ctx.createLinearGradient(-34, -68, 36, 12);
        bGrad.addColorStop(0.0, '#465864');
        bGrad.addColorStop(0.5, '#6e7e7a');
        bGrad.addColorStop(1.0, '#c8ae82');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.moveTo(-16, -64);
        ctx.bezierCurveTo(-28, -58, -28, -22, -42, 16);
        ctx.lineTo(42, 16);
        ctx.bezierCurveTo(28, -22, 28, -58, 16, -64);
        ctx.quadraticCurveTo(0, -76, -16, -64);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 236, 178, 0.45)';
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(-25, -24); ctx.quadraticCurveTo(0, -18, 25, -24); ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(cv.cx, cpy + 8);
        var gPulse = 0.80 + 0.20 * Math.sin(t * 2.4);
        var gHalo = ctx.createRadialGradient(0, -56, 12, 0, -56, 178);
        gHalo.addColorStop(0, 'rgba(168, 248, 255, ' + (0.44 * gPulse + cv.centerResonance * 0.25) + ')');
        gHalo.addColorStop(0.5, 'rgba(255, 228, 152, ' + (0.18 * gPulse) + ')');
        gHalo.addColorStop(1, 'rgba(92, 204, 240, 0)');
        ctx.fillStyle = gHalo;
        ctx.beginPath(); ctx.arc(0, -56, 178, 0, Math.PI * 2); ctx.fill();

        var mSpikes = [
          { ox: -32, h: 74, w: 14, tilt: -0.34 },
          { ox: -14, h: 98, w: 16, tilt: -0.14 },
          { ox:   2, h: 122, w: 20, tilt:  0.03 },
          { ox:  22, h: 92, w: 15, tilt:  0.22 },
          { ox:  38, h: 66, w: 13, tilt:  0.38 }
        ];
        mSpikes.forEach(function (sp) {
          ctx.save();
          ctx.translate(sp.ox, 0);
          ctx.rotate(sp.tilt);
          var sg = ctx.createLinearGradient(-sp.w, -sp.h, sp.w, 16);
          sg.addColorStop(0.0, '#e6feff');
          sg.addColorStop(0.45, '#64d6ec');
          sg.addColorStop(1.0, '#1b4a6e');
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.moveTo(-sp.w, 22); ctx.lineTo(-sp.w * 0.72, -sp.h * 0.74);
          ctx.lineTo(0, -sp.h); ctx.lineTo(sp.w * 0.72, -sp.h * 0.72);
          ctx.lineTo(sp.w, 22); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255, 252, 228, 0.72)';
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(0, -sp.h); ctx.lineTo(0, -sp.h * 0.16); ctx.stroke();
          ctx.restore();
        });
        ctx.restore();
      }

      // 奇观声呐共鸣柔和扩散涟漪
      if (cv.centerResonance > 0.03) {
        var crU = 1 - cv.centerResonance;
        var crY = cpy - 44;
        ctx.strokeStyle = 'rgba(' + cv.accentRgba + ', ' + (cv.centerResonance * 0.56) + ')';
        ctx.lineWidth = 2.0 * cv.centerResonance + 0.6;
        ctx.beginPath(); ctx.arc(cv.cx, crY, 24 + crU * 185, 0, Math.PI * 2); ctx.stroke();
      }

      // 6. 东坡柔和上升洋流光丝（沿山谷东坡柔美斜升，替代生硬垂直管道！）
      var ex = cv.exitX;
      var exBot = getBedY(ex) - 8;
      var exTop = exBot - 220;
      ctx.save();
      ctx.lineCap = 'round';
      for (var ln = -1; ln <= 1; ln++) {
        var eg = ctx.createLinearGradient(ex, exBot, ex + 48, exTop);
        eg.addColorStop(0.0, 'rgba(' + cv.tintRgba + ', 0)');
        eg.addColorStop(0.35, 'rgba(' + cv.tintRgba + ', ' + (ln === 0 ? 0.42 : 0.20) + ')');
        eg.addColorStop(0.75, 'rgba(' + cv.accentRgba + ', ' + (ln === 0 ? 0.42 : 0.20) + ')');
        eg.addColorStop(1.0, 'rgba(' + cv.accentRgba + ', 0)');
        ctx.strokeStyle = eg;
        ctx.lineWidth = ln === 0 ? 3.8 : 1.6;
        ctx.beginPath();
        for (var k = 0; k <= 12; k++) {
          var ku = k / 12;
          var ky = exBot * (1 - ku) + exTop * ku;
          var kx = ex + ku * 42 + ln * 16 + Math.sin(ku * 8 - t * 5.2 + ln) * 8;
          if (k === 0) ctx.moveTo(kx, ky); else ctx.lineTo(kx, ky);
        }
        ctx.stroke();
      }
      ctx.restore();

      // 7. 圣殿两侧可震碎月核晶簇 & 星珠
      cv.crystals.forEach(function (cr) {
        if (cr.smashed) return;
        var cfy = getBedY(cr.x) + 8;
        var pul = 0.78 + 0.22 * Math.sin(t * 3.0 + cr.phase);
        var cg = ctx.createRadialGradient(cr.x, cfy - cr.h * 0.5, 4, cr.x, cfy - cr.h * 0.5, cr.h * 1.1);
        cg.addColorStop(0, 'rgba(' + cv.tintRgba + ', ' + (0.38 * pul) + ')');
        cg.addColorStop(1, 'rgba(' + cv.tintRgba + ', 0)');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(cr.x, cfy - cr.h * 0.5, cr.h * 1.1, 0, Math.PI * 2); ctx.fill();

        [-10, 0, 11].forEach(function (ox, idx2) {
          var sh = idx2 === 1 ? cr.h : cr.h * 0.72;
          var sw = idx2 === 1 ? 10 : 7.5;
          ctx.save();
          ctx.translate(cr.x + ox, cfy);
          ctx.rotate((idx2 - 1) * 0.22);
          var sg = ctx.createLinearGradient(-sw, -sh, sw, 10);
          sg.addColorStop(0, '#dcfeff');
          sg.addColorStop(0.5, '#5ccce2');
          sg.addColorStop(1, '#1c4d70');
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.moveTo(-sw, 14); ctx.lineTo(-sw * 0.7, -sh * 0.75);
          ctx.lineTo(0, -sh); ctx.lineTo(sw * 0.7, -sh * 0.72);
          ctx.lineTo(sw, 14); ctx.closePath(); ctx.fill();
          ctx.restore();
        });
      });

      cv.pearls.forEach(function (pl) {
        if (pl.collected) return;
        var py = pl.y + Math.sin(pl.phase) * 4;
        var tw = 0.80 + 0.20 * Math.sin(pl.phase * 1.5);
        var pg = ctx.createRadialGradient(pl.x, py, 1, pl.x, py, 19 * tw);
        pg.addColorStop(0, 'rgba(255, 250, 218, 0.92)');
        pg.addColorStop(0.45, 'rgba(' + cv.tintRgba + ', 0.40)');
        pg.addColorStop(1, 'rgba(' + cv.tintRgba + ', 0)');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(pl.x, py, 19 * tw, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff9df';
        ctx.beginPath(); ctx.arc(pl.x, py, 3.6 * tw, 0, Math.PI * 2); ctx.fill();
      });

      ctx.restore();
    });

    if (shards.length > 0) {
      ctx.save();
      shards.forEach(function (sh) {
        var a = clamp(sh.life / sh.maxLife, 0, 1);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(sh.x, sh.y);
        ctx.rotate(sh.ang);
        ctx.fillStyle = '#c4fbff';
        ctx.beginPath(); ctx.moveTo(0, -sh.r); ctx.lineTo(sh.r * 0.6, 0); ctx.lineTo(0, sh.r); ctx.lineTo(-sh.r * 0.6, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    }

    if (spores.length > 0) {
      ctx.save();
      spores.forEach(function (sp) {
        if (sp.x < viewLeft - 20 || sp.x > viewRight + 20) return;
        var a = Math.sin(clamp(sp.life / sp.maxLife, 0, 1) * Math.PI) * 0.58;
        ctx.fillStyle = 'rgba(' + sp.col + ', ' + a + ')';
        ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }
  }

  function drawSanctuaryFront(ctx, state) {
    // 保持水体通透清爽，不加遮挡潜艇的暗色前景硬条
  }

  function onActiveSonar(boatX, boatY, radius, boat, eras) {
    var hitAny = false;
    for (var i = 0; i < sanctuaries.length; i++) {
      var cv = sanctuaries[i];
      if (Math.hypot(boatX - cv.cx, boatY - (cv.floorRef - 80)) > radius + 280) continue;

      cv.sonarEcho = 1.0;
      cv.pocketGlow = Math.max(cv.pocketGlow, 0.9);
      hitAny = true;

      var cpy = getBedY(cv.cx) - 44;
      if (Math.hypot(boatX - cv.cx, boatY - cpy) <= radius + 140 && cv.centerResonance < 0.25) {
        cv.centerResonance = 1.0;
        var isBell = cv.centerpieceKind === 'sunken_bell';
        if (window.MT.Audio && window.MT.Audio.playResonanceChord) {
          window.MT.Audio.playResonanceChord(isBell ? 'bell' : 'crystal');
        }
        if (boat) {
          var mult = (boat.stats && boat.stats.starMult) || 1;
          var rStar = Math.round(14 * mult);
          boat.runStars += rStar;
          boat.breath = Math.min(1.0, (boat.breath || 0) + 0.18);
          if (eras && eras.addPopup) {
            eras.addPopup(cv.cx, cpy - 40, (isBell ? '✦ 沉钟回响共振 +' : '✦ 月核母晶吟唱 +') + rStar + '✦', '#fff2ba');
          }
        }
        for (var k = 0; k < 10; k++) {
          spores.push({
            x: cv.cx + (Math.random() - 0.5) * 60,
            y: cpy + (Math.random() - 0.5) * 35,
            vx: (Math.random() - 0.5) * 44,
            vy: -24 - Math.random() * 40,
            r: 2.0 + Math.random() * 2.0,
            col: isBell ? cv.accentRgba : cv.tintRgba,
            life: 1.8 + Math.random() * 0.9,
            maxLife: 2.7
          });
        }
      }
    }
    return hitAny;
  }

  return {
    reset: reset,
    getValleyDepthOffset: getValleyDepthOffset,
    isEntranceOpenAt: function () { return false; },
    isShaftOpeningAt: function () { return false; },
    isInsideCaveAirPocket: isInsideCaveAirPocket,
    getCaveListForCompass: getCaveListForCompass,
    onActiveSonar: onActiveSonar,
    handlePhysics: handlePhysics,
    update: update,
    drawCavernBack: drawSanctuaryBack,
    drawCavernFront: drawSanctuaryFront
  };
})();
