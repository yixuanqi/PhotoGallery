window.MT = window.MT || {};

// v13 Step 3：《霜穹冰海》完整极地生态模块
// 包含：冰海天使群、极光水母伞、极地独角鲸群（支持声呐召唤冲撞破冰与破除冰碑冰封！）、
//      沉眠冰渊巨龟（背负地热暖岩苔藓穹顶的移动换气回暖绿洲！）+ 4 类极地生物实景邮票收录
window.MT.IceFauna = (function () {
  var angelFlocks = [];
  var auroraJellies = [];
  var narwhals = [];
  var iceTurtle = null;
  var echoRings = [];
  var tuskSparks = [];
  var nextId = 1;

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function tryDiscoverPolarFauna(faunaId, label, boat, onLevelEvent, fx, fy) {
    if (!window.MT.Shop || !window.MT.Shop.discoverFauna) return;
    var isNew = window.MT.Shop.discoverFauna(faunaId);
    var needsSnap = !!(window.MT.Shop.getSnapshot && !window.MT.Shop.getSnapshot(faunaId));
    if (isNew || needsSnap) {
      var snapUrl = null;
      if (window.MT.Snapshot && window.MT.Snapshot.captureFromLiveCanvas) {
        snapUrl = window.MT.Snapshot.captureFromLiveCanvas(faunaId, label, fx, fy);
      }
      if (isNew) {
        if (boat) {
          var mult = (boat.stats && boat.stats.starMult) || 1;
          boat.runStars += Math.round(18 * mult);
        }
        if (window.MT.Audio && window.MT.Audio.playRelicFound) window.MT.Audio.playRelicFound();
        if (typeof onLevelEvent === 'function') {
          onLevelEvent('codex_discover', { kind: 'fauna', id: faunaId, name: label, snapshot: snapUrl });
        } else if (typeof window.MT.onCodexDiscover === 'function') {
          window.MT.onCodexDiscover({ kind: 'fauna', id: faunaId, name: label, snapshot: snapUrl });
        }
      }
    }
  }

  function buildFauna() {
    angelFlocks = [];
    auroraJellies = [];
    narwhals = [];
    echoRings = [];
    tuskSparks = [];

    // 1. 冰海天使群（5 群轻盈振翅的粉青裸海蝶）
    var flockSpecs = [
      { x: 1520, y: 185, cnt: 8 },
      { x: 3420, y: 265, cnt: 10 },
      { x: 5120, y: 205, cnt: 9 },
      { x: 6780, y: 275, cnt: 10 },
      { x: 8420, y: 215, cnt: 9 }
    ];
    flockSpecs.forEach(function (sp, idx) {
      var list = [];
      for (var i = 0; i < sp.cnt; i++) {
        list.push({
          ox: (Math.random() - 0.5) * 140,
          oy: (Math.random() - 0.5) * 76,
          size: 7.5 + Math.random() * 4.5,
          phase: Math.random() * Math.PI * 2,
          speed: 2.8 + Math.random() * 1.4
        });
      }
      angelFlocks.push({
        id: nextId++,
        x: sp.x, y: sp.y,
        baseY: sp.y,
        phase: idx * 1.5,
        boostCd: 0,
        glow: 0,
        angels: list
      });
    });

    // 2. 极光水母伞（18 只半透明翡翠/粉紫水母）
    var jPalettes = [
      { rim: 'rgba(132, 248, 224,', core: 'rgba(222, 255, 248,' },
      { rim: 'rgba(196, 174, 255,', core: 'rgba(240, 232, 255,' },
      { rim: 'rgba(142, 228, 255,', core: 'rgba(228, 248, 255,' }
    ];
    for (var j = 0; j < 18; j++) {
      var pal = jPalettes[j % jPalettes.length];
      auroraJellies.push({
        x: 780 + j * 490 + (Math.random() - 0.5) * 160,
        y: 120 + Math.random() * 235,
        size: 13 + Math.random() * 12,
        phase: Math.random() * Math.PI * 2,
        speed: 1.2 + Math.random() * 0.65,
        tilt: (Math.random() - 0.5) * 0.45,
        rim: pal.rim,
        core: pal.core,
        flash: 0
      });
    }

    // 3. 极地独角鲸群（5 头温柔独角鲸，其中 1 头常巡游于暖泉霜碑附近方便响应撞冰！）
    var narSpecs = [
      { x: 1920, y: 195, len: 148, dir:  1, speed: 34 },
      { x: 2560, y: 235, len: 158, dir:  1, speed: 30 },
      { x: 4380, y: 270, len: 164, dir: -1, speed: 30 },
      { x: 6250, y: 235, len: 156, dir:  1, speed: 36 },
      { x: 8680, y: 225, len: 152, dir: -1, speed: 32 }
    ];
    narSpecs.forEach(function (ns, idx) {
      narwhals.push({
        id: nextId++,
        x: ns.x, y: ns.y, baseY: ns.y,
        len: ns.len, dir: ns.dir, speed: ns.speed,
        phase: idx * 1.9 + 0.4,
        flash: 0,
        boostCd: 0,
        charge: null // { x, y, onImpact }
      });
    });

    // 4. 沉眠冰渊巨龟（x ≈ 5240, y ≈ 315，背负地热暖岩与发光苔藓气室穹顶的宏伟远古海龟！）
    iceTurtle = {
      x: 5240,
      baseX: 5240,
      y: 315,
      baseY: 315,
      dir: 1,
      phase: 0.6,
      blinkTimer: 0,
      warmGlow: 0,
      refillCd: 0
    };
  }

  function reset() {
    buildFauna();
  }

  // 召唤最近的一头独角鲸冲向目标点（薄冰裂口 / 暖泉霜碑冰壳）用螺旋长角华丽撞裂冰封！
  function summonNarwhalStrike(targetX, targetY, onImpact, eras) {
    var best = null;
    var bestD = 99999;
    for (var i = 0; i < narwhals.length; i++) {
      var nw = narwhals[i];
      if (nw.charge) continue;
      var d = Math.hypot(nw.x - targetX, nw.y - targetY);
      if (d < bestD) { bestD = d; best = nw; }
    }
    if (!best || bestD > 1150) return false;
    // 若独角鲸偏远，温和将其拉至视野边缘游来，确保玩家亲眼见证冲刺撞冰演出！
    if (bestD > 420) {
      best.x = targetX + (best.x < targetX ? -350 : 350);
      best.y = clamp(targetY + 55, 110, 360);
    }
    best.dir = targetX >= best.x ? 1 : -1;
    best.flash = 1.0;
    best.charge = { x: targetX, y: targetY, onImpact: onImpact };
    echoRings.push({ x: best.x, y: best.y, r: 20, maxR: 150, life: 1.15, maxLife: 1.15, col: '216, 254, 246' });
    if (window.MT.Audio && window.MT.Audio.playResonanceChord) window.MT.Audio.playResonanceChord('whale');
    if (eras && eras.addPopup) eras.addPopup(best.x, best.y - 44, '✦ 独角鲸响应声呐，挥角冲向冰层！', '#d4fff6');
    return true;
  }

  function isInsideTurtleSanctuary(x, y) {
    if (!iceTurtle) return false;
    return Math.abs(x - iceTurtle.x) < 105 && y >= iceTurtle.y - 96 && y <= iceTurtle.y - 6;
  }

  function onActiveSonar(boatX, boatY, radius, boat, eras, onLevelEvent) {
    var hit = false;
    angelFlocks.forEach(function (fl) {
      if (Math.hypot(fl.x - boatX, fl.y - boatY) <= radius + 80) {
        fl.glow = 1.0;
        echoRings.push({ x: fl.x, y: fl.y, r: 16, maxR: 120, life: 1.1, maxLife: 1.1, col: '255, 210, 232' });
        if (window.MT.Audio && window.MT.Audio.playResonanceChord) window.MT.Audio.playResonanceChord('sardine');
        tryDiscoverPolarFauna('fauna_sea_angel', '冰海天使群', boat, onLevelEvent, fl.x, fl.y);
        hit = true;
      }
    });
    narwhals.forEach(function (nw) {
      if (Math.hypot(nw.x - boatX, nw.y - boatY) <= radius + 160) {
        nw.flash = 1.0;
        echoRings.push({ x: nw.x, y: nw.y, r: 22, maxR: 165, life: 1.3, maxLife: 1.3, col: '176, 250, 242' });
        if (window.MT.Audio && window.MT.Audio.playResonanceChord) window.MT.Audio.playResonanceChord('whale');
        if (!nw.charge && eras && eras.addPopup) eras.addPopup(nw.x, nw.y - 44, '✦ 独角鲸群传回空灵极光鲸鸣…', '#c8fff4');
        tryDiscoverPolarFauna('fauna_narwhal', '极地独角鲸', boat, onLevelEvent, nw.x, nw.y);
        hit = true;
      }
    });
    if (iceTurtle && Math.hypot(iceTurtle.x - boatX, iceTurtle.y - boatY) <= radius + 180) {
      iceTurtle.warmGlow = 1.0;
      echoRings.push({ x: iceTurtle.x, y: iceTurtle.y - 36, r: 28, maxR: 190, life: 1.45, maxLife: 1.45, col: '255, 234, 168' });
      if (window.MT.Audio && window.MT.Audio.playResonanceChord) window.MT.Audio.playResonanceChord('crystal');
      if (eras && eras.addPopup) eras.addPopup(iceTurtle.x, iceTurtle.y - 98, '✦ 沉眠冰渊巨龟缓缓睁眼，龟背暖泉微亮…', '#fff0be');
      tryDiscoverPolarFauna('fauna_ice_turtle', '沉眠冰渊巨龟', boat, onLevelEvent, iceTurtle.x, iceTurtle.y - 24);
      hit = true;
    }
    return hit;
  }

  function update(dt, boat, eras, onLevelEvent) {
    var inSub = !!(boat.isDiving || boat.inAbyss);
    var st = boat.stats || { starMult: 1 };

    angelFlocks.forEach(function (fl) {
      fl.phase += dt * 1.8;
      fl.y = fl.baseY + Math.sin(fl.phase) * 18;
      if (fl.boostCd > 0) fl.boostCd = Math.max(0, fl.boostCd - dt);
      if (fl.glow > 0) fl.glow = Math.max(0, fl.glow - dt * 1.1);
      fl.angels.forEach(function (ag) { ag.phase += dt * ag.speed; });

      if (inSub && Math.hypot(boat.x - fl.x, boat.y - fl.y) < 125) {
        tryDiscoverPolarFauna('fauna_sea_angel', '冰海天使群', boat, onLevelEvent, fl.x, fl.y);
        if (fl.boostCd <= 0) {
          fl.boostCd = 3.6;
          fl.glow = 1.0;
          boat.frostChill = Math.max(0, (boat.frostChill || 0) - 0.34);
          boat.breath = Math.min(1.0, (boat.breath || 0) + 0.18);
          var bonus = Math.round(10 * st.starMult);
          boat.runStars += bonus;
          if (window.MT.Audio && window.MT.Audio.playSardineShimmer) window.MT.Audio.playSardineShimmer();
          if (eras && eras.addPopup) eras.addPopup(fl.x, fl.y - 36, '✦ 冰海天使暖辉护佑 +' + bonus + '✦', '#ffdcf0');
        }
      }
    });

    auroraJellies.forEach(function (jl) {
      jl.phase += dt * jl.speed;
      if (jl.flash > 0) jl.flash = Math.max(0, jl.flash - dt * 1.4);
      if (inSub && Math.hypot(boat.x - jl.x, boat.y - jl.y) < jl.size + 46) {
        tryDiscoverPolarFauna('fauna_aurora_jelly', '极光水母伞', boat, onLevelEvent, jl.x, jl.y);
        if (jl.flash <= 0.1) {
          jl.flash = 1.0;
          boat.breath = Math.min(1.0, (boat.breath || 0) + 0.16);
          if (window.MT.Audio) window.MT.Audio.playHookCatch();
        }
      }
    });

    narwhals.forEach(function (nw) {
      nw.phase += dt * (nw.charge ? 3.4 : 1.5);
      if (nw.flash > 0) nw.flash = Math.max(0, nw.flash - dt * 1.1);
      if (nw.boostCd > 0) nw.boostCd = Math.max(0, nw.boostCd - dt);

      if (nw.charge) {
        var dx = nw.charge.x - nw.x;
        var dy = nw.charge.y - nw.y;
        var dist = Math.hypot(dx, dy) || 1;
        nw.dir = dx >= 0 ? 1 : -1;
        var cSpd = 340;
        nw.x += (dx / dist) * cSpd * dt;
        nw.y += (dy / dist) * cSpd * dt;
        // 冲刺时沿螺旋长角洒落冰晶星屑！
        if (Math.random() < dt * 28) {
          tuskSparks.push({
            x: nw.x + nw.dir * (nw.len * 0.65),
            y: nw.y - 4,
            vx: -nw.dir * (30 + Math.random() * 50),
            vy: (Math.random() - 0.5) * 45,
            r: 2.0 + Math.random() * 2.0,
            life: 0.65,
            maxLife: 0.65
          });
        }
        if (dist < 42) {
          var cb = nw.charge.onImpact;
          nw.charge = null;
          nw.flash = 1.0;
          nw.y = clamp(nw.y + 42, 130, 320);
          echoRings.push({ x: nw.x, y: nw.y, r: 18, maxR: 160, life: 1.1, maxLife: 1.1, col: '255, 244, 198' });
          if (typeof cb === 'function') cb();
        }
      } else {
        nw.x += nw.speed * nw.dir * dt;
        if (nw.x > 9100) nw.dir = -1;
        else if (nw.x < 950) nw.dir = 1;
        nw.y += (nw.baseY + Math.sin(nw.phase * 0.7) * 20 - nw.y) * Math.min(1, dt * 2.2);
      }

      if (inSub && Math.hypot(boat.x - nw.x, boat.y - nw.y) < 120) {
        tryDiscoverPolarFauna('fauna_narwhal', '极地独角鲸', boat, onLevelEvent, nw.x, nw.y);
        if (nw.boostCd <= 0 && !nw.charge) {
          nw.boostCd = 4.0;
          nw.flash = 1.0;
          boat.frostChill = Math.max(0, (boat.frostChill || 0) - 0.30);
          boat.breath = Math.min(1.0, (boat.breath || 0) + 0.22);
          var nb = Math.round(14 * st.starMult);
          boat.runStars += nb;
          if (window.MT.Audio && window.MT.Audio.playMantaGlide) window.MT.Audio.playMantaGlide();
          if (eras && eras.addPopup) eras.addPopup(nw.x, nw.y - 42, '✦ 独角鲸伴游破寒 +' + nb + '✦', '#c8fff4');
        }
      }
    });

    // 4. 沉眠冰渊巨龟：极慢速在中部深海优雅缓游，龟背暖岩苔藓穹顶自动为潜艇回满气息与融寒！
    if (iceTurtle) {
      iceTurtle.phase += dt * 0.72;
      iceTurtle.x = iceTurtle.baseX + Math.sin(iceTurtle.phase * 0.28) * 165;
      iceTurtle.y = iceTurtle.baseY + Math.sin(iceTurtle.phase * 0.85) * 11;
      iceTurtle.dir = Math.cos(iceTurtle.phase * 0.28) >= 0 ? 1 : -1;
      if (iceTurtle.warmGlow > 0) iceTurtle.warmGlow = Math.max(0, iceTurtle.warmGlow - dt * 0.8);
      if (iceTurtle.refillCd > 0) iceTurtle.refillCd = Math.max(0, iceTurtle.refillCd - dt);

      if (inSub && Math.hypot(boat.x - iceTurtle.x, boat.y - (iceTurtle.y - 24)) < 175) {
        tryDiscoverPolarFauna('fauna_ice_turtle', '沉眠冰渊巨龟', boat, onLevelEvent, iceTurtle.x, iceTurtle.y - 24);
      }
      if (inSub && isInsideTurtleSanctuary(boat.x, boat.y)) {
        iceTurtle.warmGlow = 1.0;
        boat.breath = 1.0;
        boat.frostChill = 0;
        boat.fuel = window.MT.Config.SURF.MAX_FUEL;
        if (iceTurtle.refillCd <= 0) {
          iceTurtle.refillCd = 4.6;
          boat.hull = Math.min(boat.maxHull, boat.hull + 20);
          var tb = Math.round(16 * st.starMult);
          boat.runStars += tb;
          if (window.MT.Audio && window.MT.Audio.playAirPocketRefill) window.MT.Audio.playAirPocketRefill();
          if (eras && eras.addPopup) eras.addPopup(iceTurtle.x, iceTurtle.y - 102, '✦ 巨龟暖岩穹顶 · 融寒满气 +' + tb + '✦', '#fff2ba');
        }
      }
    }

    for (var i = echoRings.length - 1; i >= 0; i--) {
      var er = echoRings[i];
      er.life -= dt;
      er.r = er.maxR * (1 - Math.max(0, er.life / er.maxLife));
      if (er.life <= 0) echoRings.splice(i, 1);
    }
    for (var ti = tuskSparks.length - 1; ti >= 0; ti--) {
      var ts = tuskSparks[ti];
      ts.life -= dt;
      ts.x += ts.vx * dt; ts.y += ts.vy * dt;
      if (ts.life <= 0) tuskSparks.splice(ti, 1);
    }
  }

  function drawGiantIceTurtle(ctx, tu, t) {
    ctx.save();
    ctx.translate(tu.x, tu.y);
    ctx.scale(tu.dir, 1);

    var flipSwing = Math.sin(tu.phase * 1.4) * 0.16;
    var warmStr = 0.42 + tu.warmGlow * 0.45 + Math.sin(t * 2.1) * 0.08;

    // 1. 龟背上方温柔暖琥珀苔藓气室穹顶（让旅人一眼看懂这里是安全温暖的移动避风港！）
    var domeG = ctx.createRadialGradient(-6, -54, 10, -6, -54, 118);
    domeG.addColorStop(0.0, 'rgba(255, 246, 206, ' + (0.48 * warmStr) + ')');
    domeG.addColorStop(0.5, 'rgba(136, 238, 224, ' + (0.24 * warmStr) + ')');
    domeG.addColorStop(1.0, 'rgba(92, 188, 212, 0)');
    ctx.fillStyle = domeG;
    ctx.beginPath(); ctx.ellipse(-6, -42, 108, 66, 0, Math.PI, 0); ctx.closePath(); ctx.fill();

    // 透明亮银穹顶气室薄膜轮廓
    ctx.strokeStyle = 'rgba(232, 254, 252, ' + (0.42 + tu.warmGlow * 0.36) + ')';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(-6, -30, 86, 54, 0, Math.PI * 1.04, Math.PI * 1.96); ctx.stroke();

    // 2. 远侧后鳍
    ctx.fillStyle = '#254a60';
    ctx.beginPath();
    ctx.ellipse(-68, 26, 26, 11, -0.35 + flipSwing * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // 3. 宏伟圆润的青岩苔藓古龟壳（深海玄武岩绿 × 翡翠发光苔藓斑纹）
    var shellG = ctx.createLinearGradient(-86, -44, 72, 26);
    shellG.addColorStop(0.0, '#44767e');
    shellG.addColorStop(0.55, '#2b5566');
    shellG.addColorStop(1.0, '#183448');
    ctx.fillStyle = shellG;
    ctx.beginPath();
    ctx.moveTo(-92, 14);
    ctx.bezierCurveTo(-84, -46, 48, -50, 84, 6);
    ctx.quadraticCurveTo(6, 28, -92, 14);
    ctx.closePath();
    ctx.fill();

    // 龟背中央簇生的柔和暖岩晶体与翡翠发光苔藓丛
    ctx.fillStyle = 'rgba(122, 234, 206, 0.52)';
    ctx.beginPath(); ctx.ellipse(-18, -32, 34, 11, -0.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 224, 146, 0.72)';
    [-26, -8, 12].forEach(function (ox, idx) {
      var h = idx === 1 ? 16 : 11;
      ctx.beginPath();
      ctx.moveTo(ox - 5, -34); ctx.lineTo(ox, -34 - h); ctx.lineTo(ox + 5, -34);
      ctx.closePath(); ctx.fill();
    });

    // 龟壳边缘温柔柔和暖金脉纹
    ctx.strokeStyle = 'rgba(196, 242, 228, 0.36)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-84, 10); ctx.quadraticCurveTo(-4, 20, 76, 4); ctx.stroke();

    // 4. 慈祥沉眠的圆润龟首（微闭或暖光唤醒时温柔睁眼！）
    var headBob = Math.sin(tu.phase * 1.1) * 3;
    var hg = ctx.createLinearGradient(74, -14, 126, 20);
    hg.addColorStop(0.0, '#5a8e9c');
    hg.addColorStop(1.0, '#2c586e');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(74, -4);
    ctx.quadraticCurveTo(96, -18 + headBob, 118, -8 + headBob);
    ctx.quadraticCurveTo(128, 2 + headBob, 116, 12 + headBob);
    ctx.quadraticCurveTo(94, 18 + headBob, 72, 12);
    ctx.closePath();
    ctx.fill();

    // 龟眼（沉眠弯月眼 / 声呐唤醒微亮琥珀眼）
    if (tu.warmGlow > 0.35) {
      ctx.fillStyle = '#ffeeb8';
      ctx.beginPath(); ctx.arc(105, -2 + headBob, 2.8, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(226, 248, 250, 0.72)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(105, -2 + headBob, 3.6, 0.15, Math.PI - 0.15); ctx.stroke();
    }

    // 5. 宽大优雅缓慢划水的前长鳍
    ctx.save();
    ctx.translate(42, 16);
    ctx.rotate(flipSwing);
    var fg = ctx.createLinearGradient(0, 0, -24, 34);
    fg.addColorStop(0.0, '#4c8494');
    fg.addColorStop(1.0, '#1e4258');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(-12, -4);
    ctx.quadraticCurveTo(18, 12, 8, 36);
    ctx.quadraticCurveTo(-18, 24, -22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  function drawUnderWater(ctx, state) {
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;

    ctx.save();

    // 0. 沉眠冰渊巨龟（宏伟远古移动暖岩绿洲！）
    if (iceTurtle && iceTurtle.x > viewLeft - 260 && iceTurtle.x < viewRight + 260) {
      drawGiantIceTurtle(ctx, iceTurtle, t);
    }

    // 1. 极地独角鲸群
    narwhals.forEach(function (nw) {
      if (nw.x < viewLeft - 220 || nw.x > viewRight + 220) return;
      var tailSway = Math.sin(nw.phase * 1.9) * (nw.charge ? 11 : 8);
      var rx = nw.len * 0.5;
      ctx.save();
      ctx.translate(nw.x, nw.y);
      ctx.scale(nw.dir, 1);

      var halo = ctx.createRadialGradient(0, 0, 10, 0, 0, rx * 1.15);
      halo.addColorStop(0, 'rgba(156, 248, 236, ' + (0.14 + nw.flash * 0.30 + (nw.charge ? 0.22 : 0)) + ')');
      halo.addColorStop(1, 'rgba(112, 212, 232, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(0, 0, rx * 1.15, 0, Math.PI * 2); ctx.fill();

      // 象牙螺旋长角（冲刺撞冰时绽放璀璨亮金微光！）
      var tuskG = ctx.createLinearGradient(rx * 0.72, -3, rx * 1.58, -8);
      tuskG.addColorStop(0.0, '#fff9e6');
      tuskG.addColorStop(0.65, nw.charge ? '#ffe89c' : '#d4f6ff');
      tuskG.addColorStop(1.0, nw.charge ? '#ffffff' : 'rgba(202, 250, 255, 0.76)');
      ctx.fillStyle = tuskG;
      ctx.beginPath();
      ctx.moveTo(rx * 0.70, -5.5);
      ctx.lineTo(rx * 1.58, -7.5);
      ctx.lineTo(rx * 0.72, -1.0);
      ctx.closePath();
      ctx.fill();

      var bg = ctx.createLinearGradient(0, -24, 0, 22);
      bg.addColorStop(0.0, '#78b4cf');
      bg.addColorStop(0.55, '#3b6d92');
      bg.addColorStop(1.0, '#1e3f60');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(rx * 0.80, -2);
      ctx.bezierCurveTo(rx * 0.52, -22, -rx * 0.38, -22, -rx * 0.82, -2 + tailSway * 0.25);
      ctx.quadraticCurveTo(-rx * 1.05, -14 + tailSway, -rx * 1.18, -12 + tailSway);
      ctx.quadraticCurveTo(-rx * 0.98, tailSway * 0.5, -rx * 1.14, 14 + tailSway);
      ctx.quadraticCurveTo(-rx * 0.94, 8 + tailSway * 0.4, -rx * 0.76, 5 + tailSway * 0.2);
      ctx.bezierCurveTo(-rx * 0.26, 20, rx * 0.54, 18, rx * 0.80, -2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(222, 248, 255, 0.42)';
      ctx.beginPath(); ctx.ellipse(rx * 0.14, -10, 14, 4, -0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255, 250, 232, 0.82)';
      ctx.beginPath(); ctx.arc(rx * 0.52, -3, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    // 2. 极光水母伞
    auroraJellies.forEach(function (jl) {
      if (jl.x < viewLeft - 90 || jl.x > viewRight + 90) return;
      var contract = Math.sin(jl.phase);
      var rx = jl.size * (1 - contract * 0.14);
      var ry = jl.size * (0.72 + contract * 0.14);
      var jy = jl.y + Math.sin(jl.phase * 0.7) * 14;

      ctx.save();
      ctx.translate(jl.x, jy);
      ctx.rotate(jl.tilt);

      var gRad = rx * 2.4;
      var jg = ctx.createRadialGradient(0, -ry * 0.2, 2, 0, -ry * 0.2, gRad);
      jg.addColorStop(0, jl.rim + (0.34 + jl.flash * 0.34) + ')');
      jg.addColorStop(1, jl.rim + '0)');
      ctx.fillStyle = jg;
      ctx.beginPath(); ctx.arc(0, -ry * 0.2, gRad, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = jl.rim + '0.46)';
      ctx.lineWidth = 1.25;
      ctx.lineCap = 'round';
      for (var ti = -2; ti <= 2; ti++) {
        var tx0 = ti * rx * 0.32;
        var wv = Math.sin(jl.phase - 1.0 + ti) * 6.5;
        ctx.beginPath();
        ctx.moveTo(tx0, 2);
        ctx.quadraticCurveTo(tx0 + wv, ry * 1.15, tx0 - wv * 0.6, ry * 2.2);
        ctx.stroke();
      }

      var bg2 = ctx.createRadialGradient(0, -ry * 0.4, 2, 0, -ry * 0.2, rx * 1.2);
      bg2.addColorStop(0, jl.core + '0.78)');
      bg2.addColorStop(0.65, jl.rim + '0.42)');
      bg2.addColorStop(1, jl.rim + '0.10)');
      ctx.fillStyle = bg2;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, Math.PI, 0);
      ctx.quadraticCurveTo(rx * 0.5, 5, 0, 2.5);
      ctx.quadraticCurveTo(-rx * 0.5, 5, -rx, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // 3. 冰海天使群
    angelFlocks.forEach(function (fl) {
      if (fl.x < viewLeft - 180 || fl.x > viewRight + 180) return;
      fl.angels.forEach(function (ag) {
        var ax = fl.x + ag.ox + Math.sin(ag.phase * 0.7) * 14;
        var ay = fl.y + ag.oy + Math.cos(ag.phase * 0.9) * 10;
        var flap = Math.sin(ag.phase * 2.2) * 0.55;
        var sz = ag.size;

        ctx.save();
        ctx.translate(ax, ay);
        var haloA = ctx.createRadialGradient(0, 0, 1, 0, 0, sz * 2.3);
        haloA.addColorStop(0, 'rgba(255, 198, 224, ' + (0.34 + fl.glow * 0.34) + ')');
        haloA.addColorStop(0.55, 'rgba(154, 242, 255, ' + (0.16 + fl.glow * 0.16) + ')');
        haloA.addColorStop(1, 'rgba(154, 242, 255, 0)');
        ctx.fillStyle = haloA;
        ctx.beginPath(); ctx.arc(0, 0, sz * 2.3, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = 'rgba(202, 248, 255, 0.52)';
        ctx.beginPath(); ctx.ellipse(-sz * 0.78, -sz * 0.1, sz * 0.72, sz * 0.34, -0.35 + flap, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse( sz * 0.78, -sz * 0.1, sz * 0.72, sz * 0.34,  0.35 - flap, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = 'rgba(226, 252, 255, 0.76)';
        ctx.beginPath(); ctx.ellipse(0, 0, sz * 0.42, sz * 0.88, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255, 162, 178, 0.88)';
        ctx.beginPath(); ctx.arc(0, -sz * 0.12, sz * 0.25, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    });

    if (tuskSparks.length > 0) {
      tuskSparks.forEach(function (ts) {
        var a = clamp(ts.life / ts.maxLife, 0, 1);
        ctx.fillStyle = 'rgba(240, 254, 255, ' + (a * 0.85) + ')';
        ctx.beginPath(); ctx.arc(ts.x, ts.y, ts.r, 0, Math.PI * 2); ctx.fill();
      });
    }

    if (echoRings.length > 0) {
      echoRings.forEach(function (er) {
        var a = clamp(er.life / er.maxLife, 0, 1);
        ctx.strokeStyle = 'rgba(' + er.col + ', ' + (a * 0.65) + ')';
        ctx.lineWidth = 2.0 * a + 0.6;
        ctx.beginPath(); ctx.arc(er.x, er.y, er.r, 0, Math.PI * 2); ctx.stroke();
      });
    }

    ctx.restore();
  }

  return {
    reset: reset,
    summonNarwhalStrike: summonNarwhalStrike,
    isInsideTurtleSanctuary: isInsideTurtleSanctuary,
    onActiveSonar: onActiveSonar,
    update: update,
    drawUnderWater: drawUnderWater
  };
})();
