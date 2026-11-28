window.MT = window.MT || {};

// v13 Step 3：《霜穹冰海》3 座冰海共鸣碑 + 声呐控角冰棱镜折光解谜 + 极光冰穹圣殿终章演出
window.MT.IceShrines = (function () {
  var shrines = [];
  var prismChains = [];   // 两组极光冰棱镜折光解谜链（西深谷 2 棱镜 / 东深谷 3 棱镜！）
  var crystalLanterns = [];
  var ripples = [];
  var finaleTimer = 0;
  var finaleWitnessed = false;

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function getBedY(x) {
    var pIce = window.MT.LevelEngine && window.MT.LevelEngine.getPlugin('frost_sea');
    if (pIce && typeof pIce.getSeabedY === 'function') return pIce.getSeabedY(x);
    return 398;
  }

  function buildShrinesAndPrisms() {
    shrines = [];
    prismChains = [];
    ripples = [];
    finaleTimer = 0;

    var shop = window.MT.Shop;
    var specs = [
      {
        id: 'frost_shrine_tusk',
        name: '暖泉霜碑',
        puzzleKind: 'narwhal_strike',
        x: 2660,
        h: 78,
        tilt: -0.04,
        runeCol: '154, 248, 240',
        accentCol: '255, 232, 166'
      },
      {
        id: 'frost_shrine_prism2',
        name: '棱镜极光碑',
        puzzleKind: 'prism_chain',
        chainIdx: 0,
        x: 4180,
        h: 82,
        tilt: 0.04,
        runeCol: '132, 248, 224',
        accentCol: '255, 238, 174'
      },
      {
        id: 'frost_shrine_prism3',
        name: '冰渊圣殿碑',
        puzzleKind: 'prism_chain',
        chainIdx: 1,
        x: 6780,
        h: 86,
        tilt: -0.03,
        runeCol: '202, 186, 255',
        accentCol: '156, 252, 238'
      }
    ];

    specs.forEach(function (sp, idx) {
      var awake = !!(shop && shop.hasFrostShrine && shop.hasFrostShrine(sp.id));
      shrines.push(Object.assign({}, sp, {
        awake: awake,
        wakeAnim: awake ? 1.0 : 0.0,
        meltProg: awake ? 1.0 : 0.0,
        pulse: 0,
        phase: idx * 1.9 + 0.5
      }));
    });

    // 两组「声呐控角冰棱镜折光解谜」：每枚棱镜有 3 个离散冰面角度，其中 1 个精准指向下一枚棱镜/目标古碑！
    var sh2Awake = shrines[1].awake;
    var sh3Awake = shrines[2].awake;
    var sh2Y = getBedY(shrines[1].x) - shrines[1].h * 0.56;
    var sh3Y = getBedY(shrines[2].x) - shrines[2].h * 0.56;

    // 链 0：西深谷 2 枚棱镜（入口极光 x=3650 -> 棱镜 A -> 棱镜 B -> 棱镜极光碑 x=4180）
    prismChains.push({
      shrineIdx: 1,
      entryX: 3650,
      entryTopY: 16,
      targetX: shrines[1].x,
      targetY: sh2Y,
      beamCol: '136, 250, 224',
      prisms: [
        {
          id: 'p2_a',
          x: 3650, y: 418,
          states: [
            { tx: 3820, ty: 310 },  // 偏移角 0（偏上）
            { tx: 3940, ty: 478 },  // 正确角 1 -> 精准射向棱镜 B！
            { tx: 3840, ty: 575 }   // 偏移角 2（偏下）
          ],
          correctState: 1,
          stateIdx: sh2Awake ? 1 : 0,
          drawAngle: 0,
          lit: true,
          glow: sh2Awake ? 1 : 0.5
        },
        {
          id: 'p2_b',
          x: 3940, y: 478,
          states: [
            { tx: 4140, ty: 385 },
            { tx: 4120, ty: 615 },
            { tx: shrines[1].x, ty: sh2Y } // 正确角 2 -> 精准射向棱镜极光碑！
          ],
          correctState: 2,
          stateIdx: sh2Awake ? 2 : 0,
          drawAngle: 0,
          lit: sh2Awake,
          glow: sh2Awake ? 1 : 0
        }
      ]
    });

    // 链 1：东深谷 3 枚进阶棱镜（入口极光 x=6160 -> 棱镜 1 -> 棱镜 2 -> 棱镜 3 -> 冰渊圣殿碑 x=6780）
    prismChains.push({
      shrineIdx: 2,
      entryX: 6160,
      entryTopY: 16,
      targetX: shrines[2].x,
      targetY: sh3Y,
      beamCol: '186, 228, 255',
      prisms: [
        {
          id: 'p3_a',
          x: 6160, y: 415,
          states: [
            { tx: 6380, ty: 340 },
            { tx: 6460, ty: 520 }, // 正确角 1 -> 射向棱镜 2
            { tx: 6340, ty: 605 }
          ],
          correctState: 1,
          stateIdx: sh3Awake ? 1 : 0,
          drawAngle: 0,
          lit: true,
          glow: sh3Awake ? 1 : 0.5
        },
        {
          id: 'p3_b',
          x: 6460, y: 520,
          states: [
            { tx: 6640, ty: 435 }, // 正确角 0 -> 射向棱镜 3
            { tx: 6690, ty: 560 },
            { tx: 6600, ty: 635 }
          ],
          correctState: 0,
          stateIdx: sh3Awake ? 0 : 1,
          drawAngle: 0,
          lit: sh3Awake,
          glow: sh3Awake ? 1 : 0
        },
        {
          id: 'p3_c',
          x: 6640, y: 435,
          states: [
            { tx: 6820, ty: 375 },
            { tx: shrines[2].x, ty: sh3Y }, // 正确角 1 -> 精准射向冰渊圣殿碑！
            { tx: 6790, ty: 650 }
          ],
          correctState: 1,
          stateIdx: sh3Awake ? 1 : 0,
          drawAngle: 0,
          lit: sh3Awake,
          glow: sh3Awake ? 1 : 0
        }
      ]
    });

    // 极光圣殿全唤醒后升腾的冰晶浮灯
    crystalLanterns = [];
    for (var i = 0; i < 20; i++) {
      crystalLanterns.push({
        x: 260 + (i / 19) * 920 + Math.sin(i * 4.1) * 26,
        y: -16 - (i % 6) * 34,
        vy: 6.5 + (i % 4) * 3.2,
        phase: i * 1.3,
        r: 2.2 + (i % 3) * 0.8,
        col: i % 2 === 0 ? 'rgba(164, 254, 236,' : 'rgba(255, 240, 186,'
      });
    }
  }

  function reset() {
    finaleWitnessed = !!(window.MT.Shop && window.MT.Shop.isFrostFinaleWitnessed && window.MT.Shop.isFrostFinaleWitnessed());
    buildShrinesAndPrisms();
  }

  function getAwakenedCount() {
    var n = 0;
    for (var i = 0; i < shrines.length; i++) if (shrines[i].awake) n++;
    return n;
  }

  function isSanctuaryAwake() {
    if (window.MT.Shop && window.MT.Shop.isFrostSanctuaryAwake && window.MT.Shop.isFrostSanctuaryAwake()) return true;
    return shrines.length > 0 && getAwakenedCount() >= shrines.length;
  }

  function getFinaleCinematicFactor() {
    if (finaleTimer <= 0) return 0;
    return Math.sin(clamp(finaleTimer / 4.2, 0, 1) * Math.PI);
  }

  function getShrineListForCompass() {
    return shrines.map(function (sh) {
      return { id: sh.id, name: sh.name, x: sh.x, awake: !!sh.awake };
    });
  }

  function awakenOneShrine(sh, boat, eras, onLevelEvent) {
    if (!sh || sh.awake) return;
    sh.awake = true;
    sh.meltProg = 1.0;
    sh.pulse = 1.0;
    var shop = window.MT.Shop;
    if (shop && shop.awakenFrostShrine) shop.awakenFrostShrine(sh.id);
    var cnt = getAwakenedCount();
    var sy = getBedY(sh.x) - sh.h * 0.52;

    ripples.push({ x: sh.x, y: sy, r: 22, maxR: 270, life: 1.55, maxLife: 1.55, col: sh.accentCol });
    ripples.push({ x: sh.x, y: sy, r: 12, maxR: 185, life: 1.25, maxLife: 1.25, col: sh.runeCol });

    if (boat) {
      var mult = (boat.stats && boat.stats.starMult) || 1;
      var bonus = Math.round(50 * mult);
      boat.runStars += bonus;
      boat.breath = 1.0;
      boat.frostChill = 0;
      boat.fuel = window.MT.Config.SURF.MAX_FUEL;
      if (eras && eras.addPopup) {
        eras.addPopup(sh.x, sy - 54, '✦ 唤醒冰海古碑「' + sh.name + '」(' + cnt + '/3) +' + bonus + '✦', '#d4fff6');
      }
    }
    if (window.MT.Audio && window.MT.Audio.playShrineAwaken) window.MT.Audio.playShrineAwaken(cnt);
    if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
      window.MT.RenderWorld.triggerImpact(0.028, 0.044, 4.6);
    }

    if (cnt >= shrines.length) {
      if (shop && shop.markFrostSanctuaryAwake) shop.markFrostSanctuaryAwake();
      triggerSanctuaryFinale(boat, eras, onLevelEvent);
    } else if (typeof window.MT.onCodexDiscover === 'function') {
      window.MT.onCodexDiscover({ kind: 'shrine', id: sh.id, name: sh.name + ' (' + cnt + '/3)' });
    }
  }

  function triggerSanctuaryFinale(boat, eras, onLevelEvent) {
    if (finaleWitnessed) return;
    finaleWitnessed = true;
    finaleTimer = 4.2;
    if (window.MT.Shop && window.MT.Shop.markFrostFinaleWitnessed) window.MT.Shop.markFrostFinaleWitnessed();
    if (window.MT.Shop && window.MT.Shop.discoverWonder) window.MT.Shop.discoverWonder('wonder_frost_sanctuary');
    if (window.MT.Audio && window.MT.Audio.playHarborAwakenFinale) window.MT.Audio.playHarborAwakenFinale();
    if (eras && eras.addPopup && boat) {
      eras.addPopup(boat.x, boat.y - 68, '✦ 三座冰海古碑齐鸣 · 极光冰穹圣殿永恒盛放！', '#fff4c6');
    }
    setTimeout(function () {
      var bNow = (window.MT.Physics && window.MT.Physics.getBoat) ? window.MT.Physics.getBoat() : boat;
      var snapUrl = (window.MT.Snapshot && window.MT.Snapshot.captureFromLiveCanvas)
        ? window.MT.Snapshot.captureFromLiveCanvas('wonder_frost_sanctuary', '极光冰穹圣殿', bNow ? bNow.x : 6480, bNow ? bNow.y : 420)
        : null;
      if (window.MT.Snapshot) window.MT.Snapshot.triggerShutterFlash();
      if (typeof window.MT.onCodexDiscover === 'function') {
        window.MT.onCodexDiscover({ kind: 'wonder', id: 'wonder_frost_sanctuary', name: '极光冰穹圣殿', snapshot: snapUrl });
      } else if (typeof onLevelEvent === 'function') {
        onLevelEvent('codex_discover', { kind: 'wonder', id: 'wonder_frost_sanctuary', name: '极光冰穹圣殿', snapshot: snapUrl });
      }
    }, 520);
  }

  // === 主动声呐（Q 键）核心交互：转动最近冰棱镜 / 召唤独角鲸撞破暖泉霜碑冰壳！===
  function onActiveSonar(boatX, boatY, radius, boat, eras, onLevelEvent) {
    var hit = false;

    // 1. 优先检测附近的「极光冰棱镜」-> 声呐精准旋转最近一枚棱镜！
    var bestPrism = null;
    var bestDist = 235;
    for (var ci = 0; ci < prismChains.length; ci++) {
      var ch = prismChains[ci];
      if (shrines[ch.shrineIdx] && shrines[ch.shrineIdx].awake) continue;
      for (var pi = 0; pi < ch.prisms.length; pi++) {
        var pr = ch.prisms[pi];
        var dp = Math.hypot(boatX - pr.x, boatY - pr.y);
        if (dp < bestDist) {
          bestDist = dp;
          bestPrism = pr;
        }
      }
    }
    if (bestPrism) {
      bestPrism.stateIdx = (bestPrism.stateIdx + 1) % bestPrism.states.length;
      bestPrism.glow = 1.0;
      var aligned = bestPrism.stateIdx === bestPrism.correctState;
      ripples.push({ x: bestPrism.x, y: bestPrism.y, r: 12, maxR: 115, life: 0.95, maxLife: 0.95, col: aligned ? '156, 254, 232' : '188, 224, 248' });
      if (window.MT.Audio && window.MT.Audio.playPrismRotate) window.MT.Audio.playPrismRotate(aligned);
      if (eras && eras.addPopup) {
        eras.addPopup(bestPrism.x, bestPrism.y - 36, aligned ? '✦ 冰棱镜折光对齐！' : '◈ 声呐旋转冰棱镜倾角', aligned ? '#c8fff4' : '#d8ecff');
      }
      hit = true;
    }

    // 2. 检测 3 座冰海古碑：碑①召唤独角鲸撞碎厚冰壳；碑②/③提示调整谷中冰棱镜！
    for (var si = 0; si < shrines.length; si++) {
      var sh = shrines[si];
      var sy = getBedY(sh.x) - sh.h * 0.52;
      if (Math.hypot(boatX - sh.x, boatY - sy) > radius + 110) continue;

      sh.pulse = 1.0;
      hit = true;

      if (sh.awake) {
        ripples.push({ x: sh.x, y: sy, r: 16, maxR: 160, life: 1.1, maxLife: 1.1, col: sh.runeCol });
        if (boat) {
          boat.breath = Math.min(1.0, (boat.breath || 0) + 0.35);
          boat.frostChill = 0;
        }
        continue;
      }

      if (sh.puzzleKind === 'narwhal_strike') {
        var struck = window.MT.IceFauna && window.MT.IceFauna.summonNarwhalStrike && window.MT.IceFauna.summonNarwhalStrike(
          sh.x, sy,
          function () {
            if (window.MT.Audio && window.MT.Audio.playIceCrack) window.MT.Audio.playIceCrack();
            awakenOneShrine(sh, boat, eras, onLevelEvent);
          },
          eras
        );
        if (!struck) {
          awakenOneShrine(sh, boat, eras, onLevelEvent);
        }
      } else if (!bestPrism && eras && eras.addPopup) {
        eras.addPopup(sh.x, sy - 48, '◈ 古碑被厚冰封锁 · 用 Q 旋转深谷冰棱镜折射极光融冰', '#c8f8ff');
      }
    }

    return hit;
  }

  function update(dt, boat, eras, onLevelEvent) {
    var inSub = !!(boat.isDiving || boat.inAbyss);

    for (var i = 0; i < shrines.length; i++) {
      var sh = shrines[i];
      sh.phase += dt * 1.9;
      if (sh.pulse > 0) sh.pulse = Math.max(0, sh.pulse - dt * 1.2);
      var targetA = sh.awake ? 1.0 : 0.0;
      sh.wakeAnim += (targetA - sh.wakeAnim) * Math.min(1, dt * 2.2);
    }

    // 更新两条冰棱镜折光光路，并检测极光光束是否成功汇聚于冰封古碑！
    prismChains.forEach(function (ch) {
      var sh = shrines[ch.shrineIdx];
      var beamAlive = true;
      for (var pi = 0; pi < ch.prisms.length; pi++) {
        var pr = ch.prisms[pi];
        pr.lit = beamAlive;
        if (pr.glow > (beamAlive ? 0.55 : 0.1)) pr.glow = Math.max(beamAlive ? 0.55 : 0.1, pr.glow - dt * 0.9);
        var tgt = pr.states[pr.stateIdx];
        var wantAng = Math.atan2(tgt.ty - pr.y, tgt.tx - pr.x);
        // 平滑旋转插值
        var diff = wantAng - pr.drawAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        pr.drawAngle += diff * Math.min(1, dt * 8.5);
        beamAlive = beamAlive && (pr.stateIdx === pr.correctState);
      }

      if (sh && !sh.awake) {
        if (beamAlive) {
          sh.meltProg = Math.min(1.0, (sh.meltProg || 0) + dt / 1.25);
          if (sh.meltProg >= 1.0) {
            if (window.MT.Audio && window.MT.Audio.playIceCrack) window.MT.Audio.playIceCrack();
            awakenOneShrine(sh, boat, eras, onLevelEvent);
          }
        } else {
          sh.meltProg = Math.max(0, (sh.meltProg || 0) - dt * 0.45);
        }
      }
    });

    // 全唤醒后：海底向西流淌的「极光归航暖流」加速返航 & 冰晶浮灯升腾
    if (isSanctuaryAwake()) {
      if (finaleTimer > 0) finaleTimer = Math.max(0, finaleTimer - dt);
      if (inSub && boat.x > 520 && boat.x < 7000) {
        var streamY = getBedY(boat.x) - 96;
        if (Math.abs(boat.y - streamY) < 82) {
          if (boat.vx < -20 || boat.facing < 0) boat.vx = Math.max(-440, boat.vx - 190 * dt);
          boat.frostChill = Math.max(0, (boat.frostChill || 0) - 0.55 * dt);
          boat.breath = Math.min(1.0, (boat.breath || 0) + 0.16 * dt);
        }
      }
      crystalLanterns.forEach(function (cl) {
        cl.phase += dt * 1.5;
        cl.y -= cl.vy * dt;
        if (cl.y < -250) { cl.y = -14; cl.x = 260 + Math.random() * 920; }
      });
    }

    for (var ri = ripples.length - 1; ri >= 0; ri--) {
      var rp = ripples[ri];
      rp.life -= dt;
      rp.r = rp.maxR * (1 - Math.max(0, rp.life / rp.maxLife));
      if (rp.life <= 0) ripples.splice(ri, 1);
    }
  }

  // 绘制柔和羽化水彩折光极光束（3 层透明柔边光带 + 漂浮星尘，零生硬激光线！）
  function drawSoftAuroraRay(ctx, x0, y0, x1, y1, rgbStr, t, intensity) {
    ctx.save();
    ctx.lineCap = 'round';
    var gOuter = ctx.createLinearGradient(x0, y0, x1, y1);
    gOuter.addColorStop(0.0, 'rgba(' + rgbStr + ', ' + (0.20 * intensity) + ')');
    gOuter.addColorStop(0.5, 'rgba(' + rgbStr + ', ' + (0.14 * intensity) + ')');
    gOuter.addColorStop(1.0, 'rgba(255, 246, 206, ' + (0.18 * intensity) + ')');
    ctx.strokeStyle = gOuter;
    ctx.lineWidth = 28;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();

    ctx.strokeStyle = 'rgba(' + rgbStr + ', ' + (0.34 * intensity) + ')';
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();

    ctx.strokeStyle = 'rgba(244, 255, 252, ' + (0.62 * intensity) + ')';
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();

    // 沿光束缓缓流淌的极光微粒
    for (var m = 0; m < 4; m++) {
      var u = ((t * 0.45 + m * 0.25) % 1);
      var mx = x0 + (x1 - x0) * u;
      var my = y0 + (y1 - y0) * u + Math.sin(u * 10 + t * 3 + m) * 4;
      ctx.fillStyle = 'rgba(255, 254, 232, ' + (Math.sin(u * Math.PI) * 0.78 * intensity) + ')';
      ctx.beginPath(); ctx.arc(mx, my, 2.0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawUnderWater(ctx, state) {
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;

    ctx.save();

    // 1. 全唤醒后的海底极光归航暖流
    if (isSanctuaryAwake() && viewLeft < 7000 && viewRight > 460) {
      var x0 = Math.max(480, Math.floor(viewLeft / 36) * 36);
      var x1 = Math.min(6900, viewRight + 36);
      if (x1 > x0 + 36) {
        ctx.lineCap = 'round';
        for (var ln = -1; ln <= 1; ln++) {
          ctx.strokeStyle = ln === 0 ? 'rgba(164, 254, 234, 0.36)' : 'rgba(214, 186, 255, 0.18)';
          ctx.lineWidth = ln === 0 ? 3.2 : 1.5;
          ctx.beginPath();
          for (var sx = x0; sx <= x1; sx += 36) {
            var sy = getBedY(sx) - 96 + ln * 16 + Math.sin(sx * 0.014 + t * 3.8 + ln) * 9;
            if (sx === x0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        }
      }
    }

    // 2. 两组极光冰棱镜折光光路与六棱水晶棱镜台座！
    prismChains.forEach(function (ch) {
      if (ch.targetX < viewLeft - 420 || ch.entryX > viewRight + 420) return;

      // 从海面冰洞斜射入第一枚棱镜的柔边极光天柱
      var p0 = ch.prisms[0];
      drawSoftAuroraRay(ctx, ch.entryX, ch.entryTopY, p0.x, p0.y, ch.beamCol, t, 0.85);

      // 逐级折射光束与六棱水晶棱镜
      for (var pi = 0; pi < ch.prisms.length; pi++) {
        var pr = ch.prisms[pi];
        if (pr.lit) {
          var tgt = pr.states[pr.stateIdx];
          var aligned = pr.stateIdx === pr.correctState;
          drawSoftAuroraRay(ctx, pr.x, pr.y, tgt.tx, tgt.ty, aligned ? '164, 254, 234' : ch.beamCol, t, aligned ? 0.96 : 0.62);
        }

        // 棱镜石座（细长冰岩柱深扎海床）
        var pBed = getBedY(pr.x);
        ctx.fillStyle = '#254a68';
        ctx.fillRect(pr.x - 5, pr.y + 16, 10, Math.max(18, pBed - pr.y));

        // 旋转六棱冰晶本体
        ctx.save();
        ctx.translate(pr.x, pr.y);
        var pHalo = ctx.createRadialGradient(0, 0, 3, 0, 0, 36);
        pHalo.addColorStop(0, 'rgba(218, 255, 252, ' + (0.34 + pr.glow * 0.44) + ')');
        pHalo.addColorStop(1, 'rgba(116, 224, 242, 0)');
        ctx.fillStyle = pHalo;
        ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.fill();

        ctx.rotate(pr.drawAngle);
        // 柔和菱形冰棱镜体 + 前端指示尖峰
        var pg = ctx.createLinearGradient(-16, -14, 18, 14);
        pg.addColorStop(0.0, '#f2ffff');
        pg.addColorStop(0.5, pr.lit ? '#88f4ec' : '#6ca8c8');
        pg.addColorStop(1.0, '#2a6286');
        ctx.fillStyle = pg;
        ctx.strokeStyle = 'rgba(232, 254, 255, 0.82)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(2, -13);
        ctx.lineTo(-16, -7);
        ctx.lineTo(-16, 7);
        ctx.lineTo(2, 13);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // 黄铜转轴芯与微光折射芯
        ctx.fillStyle = '#ffe89e';
        ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    });

    // 3. 3 座冰海共鸣碑（未唤醒时包裹半透明冰封晶壳，极光照射时冰壳融退、符文渐亮！）
    shrines.forEach(function (sh) {
      if (sh.x < viewLeft - 160 || sh.x > viewRight + 160) return;
      var bedY = getBedY(sh.x);
      var wa = sh.wakeAnim || 0;
      var melt = sh.meltProg || 0;
      var breathe = 0.86 + 0.14 * Math.sin(t * 2.5 + sh.phase);

      ctx.save();
      ctx.translate(sh.x, bedY + 12);
      ctx.rotate(sh.tilt);

      if (wa > 0.12 || melt > 0.12 || sh.pulse > 0.1) {
        var rG = 56 + Math.max(wa, melt) * 86;
        var hg = ctx.createRadialGradient(0, -sh.h * 0.56, 6, 0, -sh.h * 0.56, rG);
        hg.addColorStop(0.0, 'rgba(' + sh.accentCol + ', ' + (0.38 * Math.max(wa, melt, sh.pulse * 0.6) * breathe) + ')');
        hg.addColorStop(0.55, 'rgba(' + sh.runeCol + ', ' + (0.18 * Math.max(wa, melt, sh.pulse * 0.6) * breathe) + ')');
        hg.addColorStop(1.0, 'rgba(' + sh.runeCol + ', 0)');
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.arc(0, -sh.h * 0.56, rG, 0, Math.PI * 2); ctx.fill();
      }

      // 冰海雪岩古石碑身
      var sg = ctx.createLinearGradient(-18, -sh.h, 20, 16);
      sg.addColorStop(0.0, wa > 0.4 ? '#6e9eb8' : '#4a6882');
      sg.addColorStop(0.55, '#2b4a66');
      sg.addColorStop(1.0, '#142a42');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(-21, 24);
      ctx.lineTo(-17, -sh.h * 0.70);
      ctx.quadraticCurveTo(-15, -sh.h - 4, 0, -sh.h - 8);
      ctx.quadraticCurveTo(15, -sh.h - 4, 17, -sh.h * 0.70);
      ctx.lineTo(21, 24);
      ctx.closePath();
      ctx.fill();

      // 冰晶雪花星环符文
      var rA = clamp((0.22 + wa * 0.78 + melt * 0.5 + sh.pulse * 0.4) * breathe, 0, 1);
      ctx.strokeStyle = 'rgba(' + sh.runeCol + ', ' + rA + ')';
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(0, -sh.h * 0.68, 7.6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -sh.h * 0.52); ctx.lineTo(0, -14); ctx.stroke();
      ctx.fillStyle = 'rgba(' + sh.accentCol + ', ' + clamp(wa * 0.92 + melt * 0.6, 0.14, 1) + ')';
      ctx.beginPath(); ctx.arc(0, -sh.h * 0.68, 3.8, 0, Math.PI * 2); ctx.fill();

      // 半透明厚冰封壳（未唤醒时包裹古碑，极光融冰时随 meltProg 丝滑消融！）
      if (!sh.awake && melt < 0.98) {
        var iceA = (1 - melt) * 0.72;
        ctx.fillStyle = 'rgba(182, 240, 255, ' + iceA + ')';
        ctx.strokeStyle = 'rgba(240, 254, 255, ' + (iceA * 0.9) + ')';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-28, 22);
        ctx.lineTo(-24, -sh.h * 0.62);
        ctx.lineTo(-6, -sh.h - 14);
        ctx.lineTo(14, -sh.h - 8);
        ctx.lineTo(26, -sh.h * 0.55);
        ctx.lineTo(28, 22);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }

      if (wa > 0.25) {
        var orbY = -sh.h - 20 + Math.sin(t * 2.8 + sh.phase) * 3.5;
        ctx.globalAlpha = wa;
        ctx.fillStyle = '#e8fffc';
        ctx.beginPath(); ctx.arc(0, orbY, 4.0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });

    ripples.forEach(function (rp) {
      var a = clamp(rp.life / rp.maxLife, 0, 1);
      ctx.strokeStyle = 'rgba(' + rp.col + ', ' + (a * 0.64) + ')';
      ctx.lineWidth = 2.2 * a + 0.6;
      ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2); ctx.stroke();
    });

    ctx.restore();
  }

  // 全唤醒后在霜穹冰港与极光圣殿海面上空升腾的晶莹冰晶浮灯！
  function drawSanctuaryWorld(ctx, state) {
    if (!isSanctuaryAwake()) return;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    var lampGlow = window.MT.Art.getLampGlowSprite ? window.MT.Art.getLampGlowSprite() : null;

    ctx.save();
    crystalLanterns.forEach(function (cl) {
      if (cl.x < viewLeft - 40 || cl.x > viewRight + 40) return;
      var lx = cl.x + Math.sin(cl.phase) * 10;
      var fade = clamp(1 - Math.abs(cl.y + 130) / 140, 0.16, 0.92);
      if (lampGlow) {
        ctx.save();
        ctx.globalAlpha = fade * 0.38;
        ctx.drawImage(lampGlow, lx - 18, cl.y - 18, 36, 36);
        ctx.restore();
      }
      ctx.fillStyle = cl.col + (fade * 0.90) + ')';
      ctx.beginPath(); ctx.arc(lx, cl.y, cl.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  return {
    reset: reset,
    getAwakenedCount: getAwakenedCount,
    isSanctuaryAwake: isSanctuaryAwake,
    getFinaleCinematicFactor: getFinaleCinematicFactor,
    getShrineListForCompass: getShrineListForCompass,
    onActiveSonar: onActiveSonar,
    update: update,
    drawUnderWater: drawUnderWater,
    drawSanctuaryWorld: drawSanctuaryWorld
  };
})();
