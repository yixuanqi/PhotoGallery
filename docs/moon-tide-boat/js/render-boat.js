window.MT = window.MT || {};

window.MT.RenderBoat = (function () {
  function drawCoilSpring(ctx, x, yTop, yBot, coils, halfW, color) {
    ctx.strokeStyle = color || '#e2b46d';
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, yTop);
    var span = yBot - yTop;
    for (var i = 1; i <= coils; i++) {
      var u = i / (coils + 1);
      var sx = x + (i % 2 === 0 ? -halfW : halfW);
      ctx.lineTo(sx, yTop + span * u);
    }
    ctx.lineTo(x, yBot);
    ctx.stroke();
  }

  function draw(ctx, boat, t) {
    var art = window.MT.Art;
    var lampGlow = art.getLampGlowSprite();
    var st = boat.stats || { rocketLv: 0, hullLv: 0, magnetLv: 0, heatShieldLv: 0, quiltLv: 0, springsLv: 0, gliderLv: 0, prowLv: 0 };
    var dep = boat.deploy || { heat: 0, quilt: 0, springs: 0, prow: 0 };

    // 1. 特技流光圈（去掉生硬的常驻大虚线圆圈，保持画面干净有绘本意境）

    // 1a. 流光狂热态（Fever）星辉暖金光羽（柔和绘本光感，提示星辉护体与极速！）
    if (boat.feverTimer > 0.04) {
      ctx.save();
      var fVis = Math.min(1, boat.feverTimer / 1.0);
      var fRad = 64 + Math.sin(t * 9.5) * 6;
      var fg = ctx.createRadialGradient(boat.x, boat.y - 8, 8, boat.x, boat.y - 8, fRad);
      fg.addColorStop(0, 'rgba(255, 246, 198, ' + (0.34 * fVis) + ')');
      fg.addColorStop(0.55, 'rgba(176, 238, 255, ' + (0.18 * fVis) + ')');
      fg.addColorStop(1, 'rgba(176, 238, 255, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(boat.x, boat.y - 8, fRad, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = 'rgba(255, 236, 168, ' + (0.48 * fVis) + ')';
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(boat.x - 24, boat.y - 4);
      ctx.quadraticCurveTo(boat.x - 68, boat.y - 10 + Math.sin(t * 14) * 8, boat.x - 118, boat.y - 2 + Math.cos(t * 12) * 10);
      ctx.stroke();
      ctx.restore();
    }

    // 1b-0. 高空月雾云带滑翔银白流光托翼 + 破水撞碎冲刺水矛光环
    if (boat.cloudGlideFade > 0.04) {
      ctx.save();
      ctx.globalAlpha = boat.cloudGlideFade * 0.72;
      var cg = ctx.createRadialGradient(boat.x, boat.y - 4, 8, boat.x, boat.y - 4, 62);
      cg.addColorStop(0, 'rgba(232, 248, 255, 0.36)');
      cg.addColorStop(0.6, 'rgba(182, 224, 255, 0.14)');
      cg.addColorStop(1, 'rgba(182, 224, 255, 0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(boat.x, boat.y - 4, 62, 0, Math.PI * 2); ctx.fill();

      // 船底托举银白云气飘带
      ctx.strokeStyle = 'rgba(244, 250, 255, 0.62)';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(boat.x + 28, boat.y + 8);
      ctx.quadraticCurveTo(boat.x - 16, boat.y + 18 + Math.sin(t * 10) * 4, boat.x - 94, boat.y + 12 + Math.cos(t * 8) * 6);
      ctx.stroke();
      ctx.restore();
    }

    if (boat.breachSmashTimer > 0.04) {
      ctx.save();
      var bRatio = Math.min(1, boat.breachSmashTimer / 0.42);
      ctx.translate(boat.x, boat.y);
      ctx.rotate(boat.angle);
      ctx.strokeStyle = 'rgba(218, 250, 255, ' + (0.68 * bRatio) + ')';
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(10, 0, 34, -0.78, 0.78);
      ctx.stroke();
      ctx.restore();
    }

    // 1b-1. 深海气息/水压倒计时上弯月弧（随潜艇完全入水柔滑浮现，避免水面突兀闪出！）
    var breathArcAlpha = Math.min(1, Math.max((boat.subMorph || 0) * 1.4, (typeof boat.breath === 'number' && boat.breath < 0.96) ? 1 : 0));
    if (breathArcAlpha > 0.04 && (boat.isDiving || (typeof boat.breath === 'number' && boat.breath < 0.96))) {
      ctx.save();
      var br = Math.max(0, Math.min(1, typeof boat.breath === 'number' ? boat.breath : 1));
      var lowBr = br < 0.32;
      var pulseB = lowBr ? (0.68 + 0.32 * Math.sin(t * 15)) : 1.0;
      var brR = 46 + ((boat.subMorph || 0) * 7);
      var brSpan = br * Math.PI * 0.68;
      ctx.globalAlpha = breathArcAlpha;
      ctx.translate(boat.x, boat.y - 4);
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(182, 232, 255, 0.16)';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 0, brR, -Math.PI * 0.84, -Math.PI * 0.16);
      ctx.stroke();

      ctx.strokeStyle = lowBr
        ? ('rgba(255, 134, 114, ' + (0.94 * pulseB) + ')')
        : (br < 0.58 ? 'rgba(255, 214, 134, 0.86)' : 'rgba(164, 244, 255, 0.84)');
      ctx.lineWidth = lowBr ? 4.2 : 3.2;
      ctx.beginPath();
      ctx.arc(0, 0, brR, -Math.PI * 0.5 - brSpan * 0.5, -Math.PI * 0.5 + brSpan * 0.5);
      ctx.stroke();
      ctx.restore();
    }

    // 1b. 潜海浮力蓄能弯月弧（贴合船底，水青 -> 鎏金满充，直观提示松开 D 破水冲天！）
    if (boat.isDiving && boat.diveCharge > 0.04) {
      ctx.save();
      var ch = Math.max(0, Math.min(1, boat.diveCharge));
      var full = ch >= 0.78;
      var arcR = 44;
      var span = ch * Math.PI * 0.76;
      ctx.translate(boat.x, boat.y);
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(182, 232, 255, 0.22)';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.arc(0, 0, arcR, Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();

      ctx.strokeStyle = full ? '#ffe89e' : '#9eeeff';
      ctx.lineWidth = full ? 5.0 : 4.0;
      ctx.beginPath();
      ctx.arc(0, 0, arcR, Math.PI * 0.5 - span * 0.5, Math.PI * 0.5 + span * 0.5);
      ctx.stroke();

      if (full) {
        var fg2 = ctx.createRadialGradient(0, 6, 6, 0, 6, 56);
        fg2.addColorStop(0, 'rgba(255, 238, 168, 0.30)');
        fg2.addColorStop(1, 'rgba(154, 238, 255, 0)');
        ctx.fillStyle = fg2;
        ctx.beginPath(); ctx.arc(0, 6, 56, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    if (boat.trickAura > 0.02) {
      ctx.save();
      var r = 46 + (1 - boat.trickAura) * 34;
      var ag = ctx.createRadialGradient(boat.x, boat.y - 8, 6, boat.x, boat.y - 8, r);
      ag.addColorStop(0, 'rgba(255, 238, 184, ' + (boat.trickAura * 0.40) + ')');
      ag.addColorStop(0.55, 'rgba(176, 232, 255, ' + (boat.trickAura * 0.22) + ')');
      ag.addColorStop(1, 'rgba(176, 232, 255, 0)');
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.arc(boat.x, boat.y - 8, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // 1c. 冰海极寒感知微弧（仅在霜穹冰海积累寒意时于艇底外圈浮现淡冰晶微光，回暖即隐去！）
    if ((boat.frostChill || 0) > 0.06) {
      ctx.save();
      var fc = Math.max(0, Math.min(1, boat.frostChill));
      ctx.translate(boat.x, boat.y + 4);
      var fSpan = fc * Math.PI * 0.58;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(176, 238, 255, ' + (0.28 + fc * 0.62) + ')';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, 0, 56, Math.PI * 0.5 - fSpan * 0.5, Math.PI * 0.5 + fSpan * 0.5);
      ctx.stroke();
      ctx.restore();
    }

    // 2. 贴身极简火箭燃料暖金弧
    if (boat.fuel < 0.99 || boat.boosting) {
      ctx.save();
      ctx.translate(boat.x, boat.y + 4);
      var arcR = 50;
      var a0 = Math.PI * 0.20, a1 = Math.PI * 0.80, span = a1 - a0;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255, 242, 218, 0.16)';
      ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.arc(0, 0, arcR, a0, a1); ctx.stroke();

      ctx.strokeStyle = boat.fuel < 0.2 ? 'rgba(255, 134, 108, 0.88)' : 'rgba(255, 214, 138, 0.86)';
      ctx.lineWidth = 3.0;
      ctx.beginPath(); ctx.arc(0, 0, arcR, a0, a0 + span * Math.max(0.01, boat.fuel)); ctx.stroke();
      ctx.restore();
    }

    var subM = Math.max(0, Math.min(1, typeof boat.subMorph === 'number' ? boat.subMorph : ((boat.isDiving || boat.inAbyss) ? 1 : 0)));

    // 3. 世界空间多节漂浮珊瑚橘围巾（变形为密封小潜艇时丝滑收进舱内淡隐！）
    if (boat.scarf && boat.scarf.length >= 2 && subM < 0.94) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - subM * 1.15);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#e58662';
      ctx.lineWidth = 3.6;
      art.traceSmoothSpline(ctx, boat.scarf, false);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 212, 178, 0.45)';
      ctx.lineWidth = 1.2;
      art.traceSmoothSpline(ctx, boat.scarf, false);
      ctx.stroke();
      ctx.restore();
    }

    // === 进入船体局部坐标系 ===
    var springDep = dep.springs || 0;
    var springLiftY = (st.springsLv >= 1 && springDep > 0.05) ? -(1 - (boat.springCompress || 0)) * 7 * springDep : 0;
    // 在坚冰/陆地刚体上，船底龙骨恰好吻合表面亮边，绝不浸入冰层下面！
    var solidKeelLift = (boat.onSolidGround && springDep < 0.3) ? -9.5 : 0;

    var isExpBoat = !!(window.MT.Config && window.MT.Config.EXPLORE_MODE);
    var fScale = isExpBoat ? (typeof boat.facingSmooth === 'number' ? boat.facingSmooth : 1) : 1;
    if (Math.abs(fScale) < 0.14) fScale = fScale >= 0 ? 0.14 : -0.14;
    var drawAngle = isExpBoat ? (boat.localPitch || 0) : boat.angle;

    ctx.save();
    ctx.translate(boat.x, boat.y + springLiftY + solidKeelLift);
    ctx.scale(fScale * 1.08, 1.08);
    ctx.rotate(drawAngle);

    // 4. 改装件「黄铜弹簧滑橇」（仅在陆地/荒土自动放下，水上完全收起！）
    if (st.springsLv >= 1 && springDep > 0.04) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, springDep * 1.4);
      var comp = boat.springCompress || 0;
      var springTopY = 10;
      var skidY = 11 + (12 - comp * 8.5) * springDep;

      var coilCol = st.springsLv >= 3 ? '#ffe092' : '#dfb068';
      drawCoilSpring(ctx, -16, springTopY, skidY - 1, st.springsLv >= 2 ? 5 : 4, 4.2, coilCol);
      drawCoilSpring(ctx,  15, springTopY, skidY - 1, st.springsLv >= 2 ? 5 : 4, 4.2, coilCol);
      if (st.springsLv >= 2) drawCoilSpring(ctx, 0, springTopY, skidY - 1, 4, 3.6, '#c88c56');

      ctx.strokeStyle = '#3b241a';
      ctx.lineWidth = 4.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-30, skidY); ctx.lineTo(26, skidY); ctx.quadraticCurveTo(39, skidY - 1, 44, skidY - 11);
      ctx.stroke();

      ctx.strokeStyle = st.springsLv >= 3 ? '#f4cd80' : '#c69462';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-29, skidY); ctx.lineTo(26, skidY); ctx.quadraticCurveTo(38, skidY - 1, 43, skidY - 10);
      ctx.stroke();
      ctx.restore();
    }

    // 4b. 海洋流派「深潜强化」：水面木舟保留流体侧鳍；变形为小潜艇后完全不画鱼鳍，仅保留冲刺破障水环！
    if (st.deepFinsLv >= 1 && (boat.finDeploy || 0) > 0.05) {
      if (subM < 0.45) {
        ctx.save();
        var fd = (boat.finDeploy || 0) * Math.max(0, 1 - subM * 2.2);
        ctx.globalAlpha = Math.min(1, fd * 1.2);
        var finLen = (18 + st.deepFinsLv * 5) * fd;
        var finSway = Math.sin(t * 9.0) * 2.2 * fd;
        var fGrad = ctx.createLinearGradient(10, 4, -finLen - 16, 18);
        fGrad.addColorStop(0.0, st.deepFinsLv >= 3 ? 'rgba(255, 232, 162, 0.86)' : 'rgba(156, 238, 255, 0.82)');
        fGrad.addColorStop(1.0, 'rgba(46, 134, 188, 0.36)');
        ctx.fillStyle = fGrad;
        ctx.strokeStyle = 'rgba(218, 250, 255, 0.72)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(12, 5);
        ctx.quadraticCurveTo(-4, 18 + finSway, -14 - finLen * 0.65, 16 + finSway);
        ctx.quadraticCurveTo(-6, 9, -12, 5);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      if (boat.inAbyss && (boat.abyssDashTimer || 0) > 0.04 && st.deepFinsLv >= 2) {
        ctx.save();
        var dA = Math.min(1, boat.abyssDashTimer / 0.36);
        ctx.strokeStyle = 'rgba(182, 248, 255, ' + (0.78 * dA) + ')';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(16, 0, 38 + (1 - dA) * 16, -0.82, 0.82);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 4b-2. 高空风帆流深海态：以轻盈尾流丝带呈现滑翔感，绝不给小潜艇贴鱼翼/蝠鲼翼！
    if (st.skySailLv >= 1 && (boat.mantaWingOpen || 0) > 0.05 && subM > 0.4) {
      var mw = (boat.mantaWingOpen || 0) * subM;
      var spdSlip = Math.hypot(boat.vx || 0, boat.vy || 0);
      if (spdSlip > 45) {
        var slipL = Math.min(54, 16 + spdSlip * 0.12 + st.skySailLv * 6);
        ctx.save();
        ctx.globalAlpha = Math.min(0.55, mw * 0.52);
        ctx.strokeStyle = st.skySailLv >= 3 ? 'rgba(255, 240, 188, 0.78)' : 'rgba(182, 244, 255, 0.72)';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-24, -9);
        ctx.quadraticCurveTo(-24 - slipL * 0.5, -12 + Math.sin(t * 7) * 3, -24 - slipL, -8);
        ctx.moveTo(-24, 13);
        ctx.quadraticCurveTo(-24 - slipL * 0.5, 16 - Math.sin(t * 7) * 3, -24 - slipL, 12);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 4c. 海洋流派「高空风帆流」（腾空自动舒展月纹新月布帆，Lv.3 踏云二段跳就绪时帆尖亮起星光！）
    if (st.skySailLv >= 1 && (boat.sailOpen || 0) > 0.05) {
      ctx.save();
      var so = boat.sailOpen || 0;
      ctx.globalAlpha = Math.min(1, so * 1.45);
      var sSpan = (28 + st.skySailLv * 7) * so;
      var billow = (8 + st.skySailLv * 2.5) * so + Math.sin(t * 8.5) * 2.2 * so;

      ctx.save();
      ctx.translate(-6, -48);
      var sailGrad = ctx.createLinearGradient(-sSpan, -14, sSpan * 0.6, 12);
      if (st.skySailLv >= 3) {
        sailGrad.addColorStop(0.0, 'rgba(202, 244, 255, 0.88)');
        sailGrad.addColorStop(0.5, 'rgba(255, 248, 224, 0.94)');
        sailGrad.addColorStop(1.0, 'rgba(255, 226, 154, 0.90)');
      } else {
        sailGrad.addColorStop(0.0, 'rgba(232, 244, 255, 0.84)');
        sailGrad.addColorStop(1.0, 'rgba(255, 242, 214, 0.90)');
      }
      ctx.fillStyle = sailGrad;
      ctx.strokeStyle = 'rgba(92, 68, 52, 0.72)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(sSpan * 0.58, -2);
      ctx.quadraticCurveTo(2, -16 - billow * 0.45, -sSpan, -3 + billow * 0.25);
      ctx.quadraticCurveTo(-sSpan * 0.35, 10 + billow * 0.2, sSpan * 0.58, -2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // 帆面手绘鎏金新月纹饰
      ctx.strokeStyle = 'rgba(226, 178, 96, 0.78)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-sSpan * 0.16, -4, 4.8 * so, Math.PI * 0.25, Math.PI * 1.55);
      ctx.stroke();

      // Lv.3 踏云二段跳就绪星芒
      if (boat.cloudJumpReady && so > 0.4) {
        ctx.fillStyle = '#fff5be';
        ctx.beginPath(); ctx.arc(sSpan * 0.56, -2, 3.0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      ctx.restore();
    }

    // 5. 改装件「风铃滑翔翼」（仅在腾空离地时优雅展开，在水面或地面完全收拢不挡轮廓）
    if (st.gliderLv >= 1 && (boat.gliderOpen || 0) > 0.05) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (boat.gliderOpen || 0) * 1.6);
      var open = boat.gliderOpen || 0;
      var spanW = (30 + st.gliderLv * 8) * open;
      var flutter = Math.sin(t * 9.5) * 2.5 * open;

      ctx.save();
      ctx.translate(-6, -46);
      // 柔和布翼渐变（Lv.1 暖麻白 -> Lv.2 淡翡翠 -> Lv.3 暖金翡翠云翼）
      var wg = ctx.createLinearGradient(-spanW, -10, spanW * 0.55, 8);
      if (st.gliderLv >= 3) {
        wg.addColorStop(0, 'rgba(182, 244, 198, 0.86)');
        wg.addColorStop(0.55, 'rgba(255, 246, 212, 0.90)');
        wg.addColorStop(1, 'rgba(255, 224, 152, 0.86)');
      } else if (st.gliderLv === 2) {
        wg.addColorStop(0, 'rgba(168, 232, 186, 0.84)');
        wg.addColorStop(1, 'rgba(252, 246, 228, 0.88)');
      } else {
        wg.addColorStop(0, 'rgba(246, 232, 206, 0.82)');
        wg.addColorStop(1, 'rgba(255, 248, 234, 0.88)');
      }
      ctx.fillStyle = wg;
      ctx.strokeStyle = '#5c4132';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(spanW * 0.52, -3);
      ctx.quadraticCurveTo(4, -14 - 4 * open, -spanW, -4 + flutter);
      ctx.quadraticCurveTo(-spanW * 0.48, 8 + flutter * 0.6, 0, 3);
      ctx.quadraticCurveTo(spanW * 0.28, 7, spanW * 0.52, -3);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // 手绘木质翼骨与翼尖轻晃小铜铃
      ctx.strokeStyle = 'rgba(128, 88, 56, 0.55)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(-spanW * 0.92, -3 + flutter);
      ctx.moveTo(0, -6); ctx.lineTo(spanW * 0.46, -3);
      ctx.stroke();

      if (open > 0.55) {
        ctx.strokeStyle = '#e8c47a';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-spanW * 0.72, 1 + flutter);
        ctx.lineTo(-spanW * 0.72 - 2, 10 + flutter);
        ctx.stroke();
        ctx.fillStyle = '#ffe8a4';
        ctx.beginPath();
        ctx.arc(-spanW * 0.72 - 2, 11 + flutter, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.restore();
    }

    // === 木舟本体层（S 曲线收束 + 海沫泡泡遮罩交接，彻底杜绝半透明双影叠画！）===
    if (subM < 0.56) {
      ctx.save();
      var boatFade = subM < 0.34 ? 1.0 : Math.max(0, 1 - (subM - 0.34) / 0.22);
      ctx.globalAlpha = boatFade * boatFade * (3 - 2 * boatFade);
      var tuck = Math.min(1, subM / 0.52);
      ctx.scale(1 - tuck * 0.14, 1 - tuck * 0.16);

    // 6. 纤细木桅 + 小三角旗 + 磁力风铃
    ctx.strokeStyle = '#6c4730';
    ctx.lineWidth = 2.3;
    ctx.lineCap = 'round';
    art.inkLine(ctx, -6, -8, -6, -56, 11, 0.5);

    var flagWave = Math.sin(t * 7.5) * 4.5;
    ctx.fillStyle = st.magnetLv >= 2 ? 'rgba(186, 236, 255, 0.88)' : 'rgba(246, 212, 152, 0.85)';
    ctx.beginPath();
    ctx.moveTo(-6, -55);
    ctx.quadraticCurveTo(-17, -53 + flagWave * 0.5, -26, -49 + flagWave);
    ctx.quadraticCurveTo(-16, -46 + flagWave * 0.4, -6, -46);
    ctx.closePath(); ctx.fill();

    if (st.magnetLv >= 1) {
      ctx.strokeStyle = '#d4b896';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-14, -40); ctx.lineTo(2, -40); ctx.stroke();
      var chimeCount = st.magnetLv + 1;
      for (var ci = 0; ci < chimeCount; ci++) {
        var cx = -12 + (ci / Math.max(1, chimeCount - 1)) * 12;
        var sway = Math.sin(t * 5.2 + ci * 1.4) * 2.6;
        ctx.strokeStyle = '#c8f0ff';
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(cx, -40); ctx.lineTo(cx + sway, -30 - (ci % 2) * 3); ctx.stroke();
        ctx.fillStyle = '#fff4cc';
        ctx.beginPath(); ctx.arc(cx + sway, -29 - (ci % 2) * 3, 1.7, 0, Math.PI * 2); ctx.fill();
      }
    }

    // 7. 船尾推进火箭
    ctx.fillStyle = st.rocketLv >= 1 ? '#5b475e' : '#4e435c';
    ctx.strokeStyle = '#382824';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    art.drawRoundedRect(ctx, -40 - st.rocketLv * 1.5, -14, 15 + st.rocketLv * 1.5, 10, 3);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d8ae78';
    ctx.fillRect(-35, -14, 3.5, 10);

    if (st.rocketLv >= 2) {
      ctx.fillStyle = '#c87e58';
      ctx.strokeStyle = '#3b241a';
      ctx.lineWidth = 1.1;
      ctx.beginPath(); art.drawRoundedRect(ctx, -37, -22, 13, 8, 3); ctx.fill(); ctx.stroke();
    }
    if (st.rocketLv >= 3) {
      ctx.strokeStyle = '#9be4ff';
      ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.arc(-44, -9, 6.5, -Math.PI * 0.45, Math.PI * 0.45); ctx.stroke();
    }
    if (boat.boosting) {
      var flameLen = 22 + st.rocketLv * 8 + Math.random() * 18;
      var fStart = -41 - st.rocketLv * 1.5;
      var fGrad = ctx.createLinearGradient(fStart, -9, fStart - flameLen, -9);
      fGrad.addColorStop(0, '#ffffff');
      fGrad.addColorStop(0.35, st.rocketLv >= 3 ? '#7ad8ff' : '#92dcff');
      fGrad.addColorStop(0.72, st.rocketLv >= 3 ? 'rgba(130, 198, 255, 0.72)' : 'rgba(255, 168, 104, 0.72)');
      fGrad.addColorStop(1, 'rgba(255, 140, 86, 0)');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.moveTo(fStart, -13.5);
      ctx.quadraticCurveTo(fStart - flameLen * 0.55, -14.5, fStart - flameLen, -9);
      ctx.quadraticCurveTo(fStart - flameLen * 0.55, -3.5, fStart, -4.5);
      ctx.closePath(); ctx.fill();
    }

    // 8. 船夫（装棉被时戴暖帽）
    ctx.save();
    ctx.translate(-3, -7);
    ctx.rotate(boat.carving ? 0.16 : (boat.boosting ? -0.10 : 0.03));
    ctx.fillStyle = '#303454';
    ctx.strokeStyle = '#232038';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-6, -19, 0, -20); ctx.quadraticCurveTo(6, -19, 7, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    if (st.quiltLv >= 1 && dep.quilt > 0.15) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, dep.quilt * 1.4);
      ctx.fillStyle = '#e07a5f';
      ctx.beginPath(); ctx.arc(-1, -25.5, 5.2, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#fff5e2';
      ctx.beginPath(); ctx.arc(-1, -30.5, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#f8e3cc';
    ctx.beginPath(); ctx.arc(-1, -24, 4.9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 9. 手绘木舟本体 + 改装件「胡桃木加固」
    var hullGrad = ctx.createLinearGradient(0, -10, 0, 12);
    if (boat.hurtFlash > 0.2) {
      hullGrad.addColorStop(0, '#df7c62');
      hullGrad.addColorStop(1, '#6e2824');
    } else if (boat.coldStress > 0.25 && st.quiltLv === 0) {
      hullGrad.addColorStop(0, '#8baac4');
      hullGrad.addColorStop(1, '#3a4e6c');
    } else if (st.hullLv >= 2) {
      hullGrad.addColorStop(0, '#a87048');
      hullGrad.addColorStop(0.55, '#78462c');
      hullGrad.addColorStop(1, '#46261a');
    } else {
      hullGrad.addColorStop(0, '#9c6642');
      hullGrad.addColorStop(0.55, '#73442b');
      hullGrad.addColorStop(1, '#442619');
    }
    ctx.fillStyle = hullGrad;
    ctx.strokeStyle = '#3b241a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-36, -8);
    ctx.quadraticCurveTo(0, -3.5, 40, -11);
    ctx.quadraticCurveTo(32, 9.5, 17, 11);
    ctx.lineTo(-22, 11);
    ctx.quadraticCurveTo(-34, 8, -36, -8);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.strokeStyle = st.hullLv >= 3 ? 'rgba(255, 224, 140, 0.85)' : 'rgba(246, 212, 166, 0.56)';
    ctx.lineWidth = st.hullLv >= 3 ? 2.0 : 1.3;
    ctx.beginPath(); ctx.moveTo(-34, -7.5); ctx.quadraticCurveTo(0, -3.5, 39, -10.5); ctx.stroke();

    if (st.hullLv >= 1) {
      ctx.fillStyle = '#d8ae74';
      ctx.fillRect(26, -8, 4.5, 12);
      ctx.fillRect(-28, -6, 4, 12);
      if (st.hullLv >= 2) {
        ctx.fillStyle = '#c49662';
        ctx.fillRect(-8, -4, 3.5, 12);
        ctx.fillRect(9, -5, 3.5, 12);
      }
    }

    // 10. 改装件「补丁厚棉被 & 小暖炉」（仅进入冰原自动披上，离开冰原自动收起）
    if (st.quiltLv >= 1 && dep.quilt > 0.05) {
      var flap = Math.sin(t * 7.8) * 3.5;
      ctx.save();
      ctx.globalAlpha = Math.min(1, dep.quilt * 1.4);
      ctx.beginPath();
      ctx.moveTo(-26, -7);
      ctx.quadraticCurveTo(-2, -13, 24, -10);
      ctx.quadraticCurveTo(22, 6, 14, 7.5);
      ctx.lineTo(-19, 7.5);
      ctx.quadraticCurveTo(-32, 4 + flap * 0.4, -30, -3 + flap * 0.5);
      ctx.closePath();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#f5e7cf';
      ctx.fillRect(-34, -16, 62, 26);
      var patches = [
        { x: -24, y: -11, w: 12, h: 10, c: '#df856a' },
        { x: -12, y: -2,  w: 12, h: 10, c: '#eab86e' },
        { x:   0, y: -12, w: 12, h: 11, c: '#7ea4be' },
        { x:  12, y: -3,  w: 12, h: 10, c: '#df856a' }
      ];
      patches.forEach(function (pt) { ctx.fillStyle = pt.c; ctx.fillRect(pt.x, pt.y, pt.w, pt.h); });
      ctx.strokeStyle = 'rgba(72, 46, 36, 0.45)';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([2.5, 2.5]);
      ctx.beginPath();
      ctx.moveTo(-12, -14); ctx.lineTo(-12, 10);
      ctx.moveTo(0, -14); ctx.lineTo(0, 10);
      ctx.moveTo(12, -14); ctx.lineTo(12, 10);
      ctx.moveTo(-28, -2); ctx.lineTo(26, -2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.strokeStyle = st.quiltLv >= 3 ? '#fff7e6' : '#5e3c2e';
      ctx.lineWidth = st.quiltLv >= 3 ? 2.2 : 1.3;
      ctx.stroke();

      if (st.quiltLv >= 2) {
        ctx.fillStyle = '#4a383c';
        ctx.strokeStyle = '#d4a472';
        ctx.lineWidth = 1.0;
        ctx.beginPath(); art.drawRoundedRect(ctx, 18, -17, 9, 10, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255, 198, 108, ' + (0.7 + 0.3 * Math.sin(t * 8)) + ')';
        ctx.beginPath(); ctx.arc(22.5, -12, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // 11. 改装件「黑曜石隔热底壳 & 紫铜散热片」（仅驶入火海自动展开）
    if (st.heatShieldLv >= 1 && dep.heat > 0.05) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, dep.heat * 1.4);
      var obsGrad = ctx.createLinearGradient(0, 4, 0, 15);
      obsGrad.addColorStop(0, '#3a344a');
      obsGrad.addColorStop(1, '#1d1928');
      ctx.fillStyle = obsGrad;
      ctx.strokeStyle = st.heatShieldLv >= 3 ? '#ffd888' : '#e69b5c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-34, 4);
      ctx.quadraticCurveTo(-24, 14.5, -18, 14.5);
      ctx.lineTo(19, 14.5);
      ctx.quadraticCurveTo(34, 13.5, 42, -5);
      ctx.quadraticCurveTo(33, 9.5, 18, 11);
      ctx.lineTo(-22, 11);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      if (st.heatShieldLv >= 2) {
        ctx.fillStyle = '#d27c54';
        ctx.strokeStyle = '#3b241a';
        ctx.lineWidth = 1.0;
        for (var fi = 0; fi < 3; fi++) {
          ctx.beginPath(); art.drawRoundedRect(ctx, -20 + fi * 13, 2, 8, 4.5, 1.5); ctx.fill(); ctx.stroke();
        }
      }
      ctx.restore();
    } else if (boat.heatStress > 0.12) {
      var sg = ctx.createRadialGradient(2, 10, 4, 2, 10, 34);
      sg.addColorStop(0, 'rgba(255, 110, 62, ' + (boat.heatStress * 0.65) + ')');
      sg.addColorStop(1, 'rgba(255, 90, 48, 0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.ellipse(2, 11, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
    }

    // 12. 改装件「破藤鎏金船首」（仅进入巨木林海自动展开）
    if (st.prowLv >= 1 && dep.prow > 0.05) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, dep.prow * 1.4);
      var prowGrad = ctx.createLinearGradient(32, -14, 56, 8);
      prowGrad.addColorStop(0, '#c89248');
      prowGrad.addColorStop(0.55, '#ffe498');
      prowGrad.addColorStop(1, st.prowLv >= 2 ? '#c4fce0' : '#fff5cf');
      ctx.fillStyle = prowGrad;
      ctx.strokeStyle = '#5a3b20';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(31, -8);
      ctx.quadraticCurveTo(46, -15, 53 + st.prowLv * 2, -11);
      ctx.quadraticCurveTo(49, 4, 28, 11);
      ctx.quadraticCurveTo(36, 1, 31, -8);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // 翡翠灵叶纹饰与劈藤瞬间的金光弧
      if (st.prowLv >= 2) {
        ctx.fillStyle = '#8ef0b2';
        ctx.beginPath();
        ctx.ellipse(42, -3, 4.2, 2.0, -0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      if (boat.prowFlash > 0.05 || st.prowLv >= 3) {
        var pa = Math.max(boat.prowFlash || 0, st.prowLv >= 3 ? 0.35 : 0);
        ctx.strokeStyle = 'rgba(255, 246, 198, ' + (pa * 0.85) + ')';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(46, -2, 14 + (1 - pa) * 12, -Math.PI * 0.45, Math.PI * 0.42);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 12b. 海洋流派「潮汐声呐流」（船首下方精巧铜制水青声呐探照球）
    if (st.tideSonarLv >= 1) {
      ctx.save();
      var pulseS = 0.72 + 0.28 * Math.sin(t * 5.2);
      ctx.fillStyle = '#8e6644';
      ctx.strokeStyle = '#3b241a';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(36, 1, 4.6, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      var sGlow = ctx.createRadialGradient(38, 1, 0.5, 38, 1, 14 + st.tideSonarLv * 3);
      sGlow.addColorStop(0, 'rgba(196, 252, 255, ' + (0.85 * pulseS) + ')');
      sGlow.addColorStop(0.5, 'rgba(116, 232, 255, ' + (0.35 * pulseS) + ')');
      sGlow.addColorStop(1, 'rgba(116, 232, 255, 0)');
      ctx.fillStyle = sGlow;
      ctx.beginPath(); ctx.arc(38, 1, 14 + st.tideSonarLv * 3, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = st.tideSonarLv >= 3 ? '#fff4be' : '#b8f8ff';
      ctx.beginPath(); ctx.arc(38.2, 1, 2.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // 12c. 吹制月玻璃水滴舱罩（水面遇沸海/灰海时保护木舟；潜海变形为潜艇后由潜艇自带圆润玻璃舱接管）
    if ((boat.canopyOpen || 0) > 0.04 && subM < 0.85) {
      var co = Math.min(1, boat.canopyOpen) * Math.max(0, 1 - subM * 1.25);
      ctx.save();
      ctx.globalAlpha = co;

      // 舱内柔和暖灯微光氛围
      var inG = ctx.createRadialGradient(8, -16, 4, 2, -14, 34);
      inG.addColorStop(0, 'rgba(255, 236, 186, 0.24)');
      inG.addColorStop(0.65, 'rgba(148, 224, 248, 0.14)');
      inG.addColorStop(1, 'rgba(116, 198, 232, 0.04)');
      ctx.fillStyle = inG;

      ctx.beginPath();
      ctx.moveTo(-26, -7);
      ctx.bezierCurveTo(-24, -40 * co - 6, 20, -40 * co - 8, 34, -10);
      ctx.quadraticCurveTo(4, -5, -26, -7);
      ctx.closePath();
      ctx.fill();

      // 优雅细铜骨架拱肋
      ctx.strokeStyle = 'rgba(214, 174, 122, 0.76)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-26, -7);
      ctx.bezierCurveTo(-24, -40 * co - 6, 20, -40 * co - 8, 34, -10);
      ctx.stroke();

      // 玻璃穹顶左上柔和月白曲面反光高光丝
      ctx.strokeStyle = 'rgba(232, 250, 255, 0.62)';
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-14, -28 * co - 4);
      ctx.quadraticCurveTo(4, -36 * co - 5, 19, -24 * co - 5);
      ctx.stroke();
      ctx.restore();
    }

    // 13. 船头弯铜灯架与暖琥珀纸灯笼
    ctx.strokeStyle = '#c89464';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(35, -9.5); ctx.quadraticCurveTo(44, -22, 47, -17.5); ctx.stroke();

    var lampX = 47, lampY = -12;
    var flick = 0.93 + 0.07 * Math.sin(t * 7.4);
    if (lampGlow) {
      var gs = 96 * flick;
      ctx.drawImage(lampGlow, lampX - gs * 0.5, lampY - gs * 0.5, gs, gs);
    }
    ctx.fillStyle = '#fff6dc';
    ctx.strokeStyle = '#c48d56';
    ctx.lineWidth = 1.0;
    ctx.beginPath(); art.drawRoundedRect(ctx, lampX - 3, lampY - 4.2, 6, 8.2, 2.5); ctx.fill(); ctx.stroke();

      ctx.restore(); // 结束木舟本体层
    }

    // === 14. 水下形态：纯净 Q 版机械小潜艇（交接区后柔和弹现，彻底告别鱼鳍与半透明叠影！）===
    if (subM > 0.42) {
      var subAppear = Math.min(1, (subM - 0.42) / 0.32);
      var subEase = subAppear * subAppear * (3 - 2 * subAppear);
      drawCuteSubmarine(ctx, boat, st, art, lampGlow, t, subEase);
    }

    // === 14b. 船 ↔ 潜艇丝滑变身「柔美海沫气泡遮罩」（在形态交界处优雅包裹船身，如水彩魔法般自然切换！）===
    var morphWave = Math.sin(subM * Math.PI);
    var veilStr = Math.max(morphWave * (subM > 0.06 && subM < 0.94 ? 1 : 0), (boat.morphFoam || 0) * 0.92);
    if (veilStr > 0.04) {
      drawMorphBubbleVeil(ctx, t, veilStr);
    }

    // === 15. 超柔边体积感前照光束（仅潜艇展开后渐亮，避免在海面突兀闪出！）===
    if ((boat.spotlightStrength || 0) > 0.04 && subM > 0.38) {
      drawSoftSpotlightBeam(ctx, boat, st, art, t, Math.min(1, (subM - 0.38) / 0.42));
    }

    ctx.restore();
  }

  // 纯净超Q绘本风「胖嘟嘟奶油小潜艇」（不显示人物，圆滚滚蛋形机身 + 萌萌小司令塔与弯潜望镜 + 暖光双圆舷窗 + 移动才转起来的立体三叶小螺旋桨！）
  function drawCuteSubmarine(ctx, boat, st, art, lampGlow, t, subM) {
    var popScale = 0.80 + subM * 0.20 + Math.sin(subM * Math.PI) * 0.11;
    var dashBoost = (boat.abyssDashTimer || 0) > 0.04 ? Math.min(1, boat.abyssDashTimer / 0.36) : 0;
    var spinRate = Math.max(0, typeof boat.propSpinRate === 'number' ? boat.propSpinRate : 0);
    var spinNorm = Math.min(1, spinRate / 22);
    var propAng = boat.propAngle || 0;
    var hurting = boat.hurtFlash > 0.2;
    var skinId = (window.MT.Shop && window.MT.Shop.getSelectedSubSkin) ? window.MT.Shop.getSelectedSubSkin() : 'cream';
    var skinList = (window.MT.Config && window.MT.Config.SUB_SKINS) || [];
    var skin = skinList[0] || {
      hull: ['#fff3be', '#f6ca6e', '#db8f52', '#8e4e34'],
      tower: ['#fff5c8', '#f4c86e', '#dc9052'],
      accent: '#e5725a', vane: '#c86a54',
      belly: 'rgba(255, 248, 232, 0.68)', rim: '#e6b466'
    };
    for (var sk = 0; sk < skinList.length; sk++) {
      if (skinList[sk].id === skinId) { skin = skinList[sk]; break; }
    }

    // 软萌果冻弹性：静止轻轻呼吸、移动与冲刺微微拉长带弹性！
    var squish = Math.sin(t * 4.2) * 0.024 + dashBoost * 0.095 + spinNorm * 0.018;
    var sx = popScale * (1 + squish);
    var sy = popScale * (1 - squish * 0.72);

    ctx.save();
    ctx.globalAlpha = Math.min(1, subM * 1.15);
    ctx.scale(sx, sy);

    // === 1. 尾部推进涡流 & 移动时欢快旋转的立体三叶小螺旋桨 ===
    var propX = -35.5, propY = 2.0;

    // 移动时在螺旋桨后方绽放晶莹旋转水涡流丝与小水泡（静止时完全平静！）
    if (spinNorm > 0.12) {
      var wakeLen = 14 + spinNorm * 22 + (boat.boosting ? 16 : 0) + dashBoost * 20;
      var wg = ctx.createLinearGradient(propX - 2, propY, propX - 2 - wakeLen, propY);
      wg.addColorStop(0.0, 'rgba(226, 250, 255, ' + (0.58 * spinNorm) + ')');
      wg.addColorStop(0.55, 'rgba(138, 228, 255, ' + (0.28 * spinNorm) + ')');
      wg.addColorStop(1.0, 'rgba(138, 228, 255, 0)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.moveTo(propX - 2, propY - 5.5);
      ctx.quadraticCurveTo(propX - 2 - wakeLen * 0.5, propY - 7.5 - spinNorm * 2.5, propX - 2 - wakeLen, propY);
      ctx.quadraticCurveTo(propX - 2 - wakeLen * 0.5, propY + 7.5 + spinNorm * 2.5, propX - 2, propY + 5.5);
      ctx.closePath();
      ctx.fill();

      // 随螺旋桨相位向后飘散的 3 颗细小水泡
      ctx.strokeStyle = 'rgba(228, 252, 255, ' + (0.65 * spinNorm) + ')';
      ctx.lineWidth = 1.05;
      for (var bp = 0; bp < 3; bp++) {
        var bu = ((propAng * 0.16 + bp * 0.33) % 1);
        var bpx = propX - 5 - bu * (wakeLen * 0.95);
        var bpy = propY + Math.sin(bu * 9 + bp * 2.4) * (3.5 + bu * 3.5);
        ctx.beginPath(); ctx.arc(bpx, bpy, 1.3 + (bp % 2) * 0.8, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // 简洁利落的机械潜艇尾部稳定舵片 & 铜制副推进筒（100% 纯Q版机械潜艇，绝不像鱼尾！）
    ctx.fillStyle = skin.vane;
    ctx.strokeStyle = '#4a2b22';
    ctx.lineWidth = 1.3;
    ctx.beginPath(); art.drawRoundedRect(ctx, -31.5, -9.2, 7.5, 5.4, 2.0); ctx.fill(); ctx.stroke();
    ctx.beginPath(); art.drawRoundedRect(ctx, -31.5,  7.6, 7.5, 5.4, 2.0); ctx.fill(); ctx.stroke();

    if ((st.deepFinsLv || 0) >= 1) {
      ctx.fillStyle = st.deepFinsLv >= 3 ? '#f4cd78' : '#b88254';
      ctx.strokeStyle = '#4a2b22';
      ctx.lineWidth = 1.15;
      ctx.beginPath(); art.drawRoundedRect(ctx, -18, 14.5, 14, 5.2, 2.4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9ef4ff';
      ctx.beginPath(); ctx.arc(-17.5, 17.1, 1.8, 0, Math.PI * 2); ctx.fill();
    }

    // 铜制螺旋桨短轴
    ctx.fillStyle = '#9c6642';
    ctx.strokeStyle = '#4a2b22';
    ctx.lineWidth = 1.1;
    ctx.beginPath(); art.drawRoundedRect(ctx, -34.2, propY - 2.4, 7.2, 4.8, 1.5); ctx.fill(); ctx.stroke();

    // 旋转动态模糊光晕圆盘（仅在高速转动时显现，强化「小螺旋桨哒哒转起来」的动态感！）
    if (spinNorm > 0.25) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, subM) * spinNorm * 0.42;
      ctx.strokeStyle = '#fff5cf';
      ctx.lineWidth = 2.0;
      ctx.beginPath(); ctx.ellipse(propX, propY, 3.8, 10.6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // 立体透视三叶金铜螺旋桨（按 cos 深度排序，3 片圆润桨叶围绕轴心丝滑公转！）
    var blades = [];
    for (var bk = 0; bk < 3; bk++) {
      var ba = propAng + bk * (Math.PI * 2 / 3);
      blades.push({ sinA: Math.sin(ba), cosA: Math.cos(ba) });
    }
    blades.sort(function (a, b) { return a.cosA - b.cosA; });

    // 先画背面的桨叶，再画圆桨毂，最后画前方的桨叶，立体转动感极强！
    function drawPropBlade(b) {
      var len = Math.abs(b.sinA) * 9.8 + 1.4;
      var midY = propY + b.sinA * 5.6;
      var w = 2.3 + (b.cosA + 1) * 0.65;
      ctx.fillStyle = b.cosA >= 0 ? '#ffe498' : '#d6a45e';
      ctx.strokeStyle = '#4a2b22';
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.ellipse(propX + b.cosA * 0.9, midY, w, Math.max(2.0, len * 0.58), b.sinA * 0.16, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }

    for (var bi = 0; bi < blades.length; bi++) {
      if (blades[bi].cosA < 0) drawPropBlade(blades[bi]);
    }
    // 圆滚滚小铜桨帽
    ctx.fillStyle = '#e5865a';
    ctx.strokeStyle = '#4a2b22';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(propX + 0.6, propY, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    for (var fi = 0; fi < blades.length; fi++) {
      if (blades[fi].cosA >= 0) drawPropBlade(blades[fi]);
    }

    // === 2. 顶部圆嘟嘟司令塔小圆顶 + 短胖弯头小潜望镜（无人物，纯Q版玩具潜艇萌感！）===
    var periBob = Math.sin(t * 4.0) * 0.9;
    // 顶部呆萌短弯潜望镜
    ctx.save();
    ctx.translate(1.5, -23.5);
    ctx.rotate(Math.sin(t * 2.4) * 0.05);
    ctx.strokeStyle = '#4a2b22';
    ctx.lineWidth = 5.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 2); ctx.lineTo(0, -8.5 + periBob); ctx.lineTo(6.5, -8.5 + periBob);
    ctx.stroke();
    ctx.strokeStyle = skin.accent;
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(0, 2); ctx.lineTo(0, -8.5 + periBob); ctx.lineTo(6.5, -8.5 + periBob);
    ctx.stroke();

    // 潜望镜前端闪亮水蓝小镜片
    ctx.fillStyle = '#d6faff';
    ctx.strokeStyle = '#4a2b22';
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.ellipse(7.6, -8.5 + periBob, 2.4, 3.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();

    // 圆滚滚司令塔（跟随所选纯净涂装配色）
    var towerG = ctx.createLinearGradient(0, -27, 0, -11);
    towerG.addColorStop(0.0, skin.tower[0]);
    towerG.addColorStop(0.55, skin.tower[1]);
    towerG.addColorStop(1.0, skin.tower[2]);
    ctx.fillStyle = towerG;
    ctx.strokeStyle = '#4a2b22';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-10.5, -12);
    ctx.quadraticCurveTo(-11, -24.5, 0.5, -24.5);
    ctx.quadraticCurveTo(12, -24.5, 11.5, -12);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // 司令塔顶部可爱装饰帽檐
    ctx.fillStyle = skin.accent;
    ctx.strokeStyle = '#4a2b22';
    ctx.lineWidth = 1.25;
    ctx.beginPath(); art.drawRoundedRect(ctx, -9.5, -25.6, 20, 4.0, 2.0); ctx.fill(); ctx.stroke();

    // 司令塔前方一颗迷你暖光圆窗
    ctx.fillStyle = '#fff9de';
    ctx.strokeStyle = '#4a2b22';
    ctx.lineWidth = 1.05;
    ctx.beginPath(); ctx.arc(4.8, -17.8, 2.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // === 3. 超胖圆滚滚鹅黄奶油蛋形潜艇主机身（纯Q版饱满汤圆造型！）===
    var bodyG = ctx.createLinearGradient(0, -18, 0, 20);
    if (hurting) {
      bodyG.addColorStop(0.00, '#ffb49c');
      bodyG.addColorStop(0.55, '#db6452');
      bodyG.addColorStop(1.00, '#7c2e28');
    } else {
      bodyG.addColorStop(0.00, skin.hull[0]);
      bodyG.addColorStop(0.45, skin.hull[1]);
      bodyG.addColorStop(0.82, skin.hull[2]);
      bodyG.addColorStop(1.00, skin.hull[3]);
    }
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.ellipse(2, 1.5, 29.5, 17.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 机身内部精致绘本涂装：顶部奶油光泽 + 奶白圆肚皮 + 鲜活珊瑚腰带！
    ctx.save();
    ctx.clip();
    // 上方柔软奶油高光豆
    ctx.fillStyle = 'rgba(255, 253, 240, 0.44)';
    ctx.beginPath(); ctx.ellipse(2, -11.5, 20, 4.8, 0, 0, Math.PI * 2); ctx.fill();

    // 圆鼓鼓奶白色小肚皮
    ctx.fillStyle = skin.belly;
    ctx.beginPath(); ctx.ellipse(2, 17.5, 24, 7.8, 0, 0, Math.PI * 2); ctx.fill();

    // 装饰腰带
    ctx.fillStyle = skin.accent;
    ctx.fillRect(-30, 3.6, 66, 4.6);
    ctx.fillStyle = 'rgba(255, 236, 214, 0.46)';
    ctx.fillRect(-30, 3.6, 66, 1.3);
    ctx.restore();

    // 机身温暖手绘深棕外轮廓
    ctx.strokeStyle = '#4a2b22';
    ctx.lineWidth = 1.65;
    ctx.beginPath();
    ctx.ellipse(2, 1.5, 29.5, 17.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 腰带上的可爱闪亮小金铆钉
    ctx.fillStyle = '#fff2c2';
    for (var rv = -18; rv <= 18; rv += 9) {
      ctx.beginPath(); ctx.arc(rv, 5.9, 1.15, 0, Math.PI * 2); ctx.fill();
    }

    // === 4. 两扇温暖发亮的 Q 版圆铜舷窗（大前窗 + 小侧窗，透出温馨小屋暖灯，带晶莹玻璃月牙高光！）===
    var portholes = [
      { x: 11.5, y: -2.2, r: 7.4 },
      { x: -6.5, y: -1.8, r: 5.5 }
    ];
    portholes.forEach(function (ph) {
      // 黄铜外圈
      ctx.fillStyle = skin.rim;
      ctx.strokeStyle = '#4a2b22';
      ctx.lineWidth = 1.25;
      ctx.beginPath(); ctx.arc(ph.x, ph.y, ph.r + 1.9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      // 温润清透蓝金玻璃反光（外青水光 + 内暖灯芯）
      var pg = ctx.createRadialGradient(ph.x - ph.r * 0.25, ph.y - ph.r * 0.28, 0.8, ph.x, ph.y, ph.r);
      pg.addColorStop(0.00, '#fffce8');
      pg.addColorStop(0.52, '#ffe096');
      pg.addColorStop(0.84, '#92d2e2');
      pg.addColorStop(1.00, '#4c7e98');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(ph.x, ph.y, ph.r, 0, Math.PI * 2); ctx.fill();

      // 晶莹玻璃月牙小高光点
      ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
      ctx.beginPath(); ctx.arc(ph.x - ph.r * 0.34, ph.y - ph.r * 0.34, ph.r * 0.24, 0, Math.PI * 2); ctx.fill();
    });

    // 船头一抹软萌淡粉圆腮红
    ctx.fillStyle = 'rgba(246, 134, 122, 0.45)';
    ctx.beginPath(); ctx.ellipse(22.5, 9.2, 3.3, 1.7, -0.1, 0, Math.PI * 2); ctx.fill();

    // （已彻底移除机身旁鱼鳍，保持纯净呆萌 Q 版潜艇圆润轮廓！）

    // === 6. 前鼻大圆嘟嘟暖灯罩 + 改装件「暖铜破冰舱」（纯机械圆铜破冰环与小暖气阀，零鱼鳍！）===
    if ((st.warmBreakerLv || 0) >= 1) {
      // 前鼻外侧圆润铜制破冰保险环（厚实可爱又具破冰辨识度！）
      ctx.strokeStyle = st.warmBreakerLv >= 3 ? '#ffe698' : '#e0a458';
      ctx.lineWidth = st.warmBreakerLv >= 2 ? 3.4 : 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(24.5, 1.0, 12.2, -0.78, 0.78);
      ctx.stroke();

      // 司令塔后侧迷你黄铜恒温暖气阀（遇冷轻吐一缕暖白微汽）
      ctx.fillStyle = '#d89e54';
      ctx.strokeStyle = '#4a2b22';
      ctx.lineWidth = 1.05;
      ctx.beginPath(); art.drawRoundedRect(ctx, -15.5, -18.5, 5.2, 6.2, 2.0); ctx.fill(); ctx.stroke();
      if ((boat.frostChill || 0) > 0.04 || (window.MT.Eras && window.MT.Eras.getActiveRealm && window.MT.Eras.getActiveRealm() === 'frost_sea')) {
        var puffU = (t * 0.9) % 1;
        ctx.fillStyle = 'rgba(255, 248, 232, ' + ((1 - puffU) * 0.48) + ')';
        ctx.beginPath(); ctx.arc(-13.5 - puffU * 8, -21 - puffU * 14, 2.0 + puffU * 2.4, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.fillStyle = skin.accent;
    ctx.strokeStyle = '#4a2b22';
    ctx.lineWidth = 1.25;
    ctx.beginPath(); art.drawRoundedRect(ctx, 27.5, -3.2, 6.0, 8.2, 3.0); ctx.fill(); ctx.stroke();

    var flickS = 0.94 + 0.06 * Math.sin(t * 6.8);
    if (lampGlow) {
      var gsS = 72 * flickS;
      ctx.save();
      ctx.globalAlpha = Math.min(1, subM) * 0.78;
      ctx.drawImage(lampGlow, 33.2 - gsS * 0.5, 0.8 - gsS * 0.5, gsS, gsS);
      ctx.restore();
    }
    ctx.fillStyle = '#fffce4';
    ctx.beginPath(); ctx.ellipse(33.0, 0.8, 2.5, 3.5, 0, 0, Math.PI * 2); ctx.fill();

    // === 7. 潮汐声呐流安装在圆下巴处的水青声呐小珍珠 ===
    if ((st.tideSonarLv || 0) >= 1) {
      var pulseS2 = 0.72 + 0.28 * Math.sin(t * 5.2);
      ctx.fillStyle = '#9c6844';
      ctx.strokeStyle = '#4a2b22';
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(14, 18.2, 4.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = st.tideSonarLv >= 3 ? '#fff4be' : '#b8f8ff';
      ctx.beginPath(); ctx.arc(15.2, 18.2, 2.1, 0, Math.PI * 2); ctx.fill();
      var sg2 = ctx.createRadialGradient(15.2, 18.2, 1, 15.2, 18.2, 13 + st.tideSonarLv * 3);
      sg2.addColorStop(0, 'rgba(182, 250, 255, ' + (0.68 * pulseS2) + ')');
      sg2.addColorStop(1, 'rgba(116, 232, 255, 0)');
      ctx.fillStyle = sg2;
      ctx.beginPath(); ctx.arc(15.2, 18.2, 13 + st.tideSonarLv * 3, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  }

  // 船 ↔ 潜艇切换时的柔美水彩海沫气泡遮罩（自然隐藏形态切换瞬间，充满童话水感！）
  function drawMorphBubbleVeil(ctx, t, str) {
    ctx.save();
    var a = Math.min(1, str);
    var puffs = [
      { x: -16, y: -4, r: 24 }, { x: 0, y: -8, r: 28 }, { x: 18, y: -3, r: 23 },
      { x: -10, y: 8, r: 22 },  { x: 10, y: 7, r: 24 }
    ];
    for (var i = 0; i < puffs.length; i++) {
      var p = puffs[i];
      var drift = (1 - a) * 14;
      var px = p.x + Math.cos(i * 1.4 + t * 4) * drift;
      var py = p.y - (1 - a) * 10 + Math.sin(i * 1.7 + t * 3) * 4;
      var pr = p.r * (0.72 + a * 0.45);
      var g = ctx.createRadialGradient(px, py, 2, px, py, pr);
      g.addColorStop(0.0, 'rgba(232, 252, 255, ' + (0.64 * a) + ')');
      g.addColorStop(0.55, 'rgba(164, 234, 252, ' + (0.30 * a) + ')');
      g.addColorStop(1.0, 'rgba(136, 218, 246, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
    }
    for (var b = 0; b < 9; b++) {
      var ang = (b / 9) * Math.PI * 2 + t * 2.2;
      var dist = 12 + (1 - a) * 32 + (b % 3) * 5;
      var bx = Math.cos(ang) * dist;
      var by = Math.sin(ang) * (dist * 0.65) - (1 - a) * 16;
      var br = 2.0 + (b % 3) * 1.3;
      ctx.strokeStyle = 'rgba(240, 254, 255, ' + (0.82 * a) + ')';
      ctx.fillStyle = 'rgba(196, 244, 255, ' + (0.28 * a) + ')';
      ctx.lineWidth = 1.15;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  // 超柔边体积探照光束（双层预烘焙羽化精灵叠加 + 几粒被光柱照亮的悬浮微尘！）
  function drawSoftSpotlightBeam(ctx, boat, st, art, t, subM) {
    var beamSp = art.getSoftBeamSprite ? art.getSoftBeamSprite() : null;
    if (!beamSp) return;
    var spS = Math.min(1, boat.spotlightStrength);
    var srcX = 33.2;
    var srcY = 0.8;
    spS *= subM;
    var lenScale = (0.94 + (st.tideSonarLv || 0) * 0.12);
    var widScale = (0.98 + (st.tideSonarLv || 0) * 0.12);
    var breathe = 0.96 + 0.04 * Math.sin(t * 3.8);

    ctx.save();
    ctx.translate(srcX, srcY);

    ctx.save();
    ctx.globalAlpha = spS * 0.34 * breathe;
    ctx.scale(lenScale * 1.14, widScale * 1.32);
    ctx.drawImage(beamSp.canvas, -beamSp.anchorX, -beamSp.anchorY);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = spS * 0.72 * breathe;
    ctx.scale(lenScale, widScale);
    ctx.drawImage(beamSp.canvas, -beamSp.anchorX, -beamSp.anchorY);
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 248, 224, ' + (0.42 * spS) + ')';
    for (var m = 0; m < 5; m++) {
      var mu = ((t * 0.16 + m * 0.21) % 1);
      var mx = 32 + mu * 210 * lenScale;
      var my = Math.sin(t * 1.9 + m * 2.4) * (10 + mu * 34);
      var ma = Math.sin(mu * Math.PI) * spS * 0.52;
      ctx.globalAlpha = ma;
      ctx.beginPath(); ctx.arc(mx, my, 1.1 + (m % 2) * 0.7, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  }

  // 在冰面内部绘制实时倒置镜面船影（随起跳高度对称沉降并淡出，立刻拉满滑冰质感！）
  function drawIceReflection(ctx, boat, iceSurfaceY, t, iceMix) {
    if (!boat || iceMix < 0.08) return;
    var alt = Math.max(0, iceSurfaceY - boat.y);
    var vis = Math.max(0, 1 - alt / 165) * iceMix;
    if (vis <= 0.02) return;

    var st = boat.stats || { quiltLv: 0 };
    var dep = boat.deploy || { quilt: 0 };
    var reflY = iceSurfaceY + (iceSurfaceY - boat.y) + 12;

    ctx.save();
    ctx.translate(boat.x, reflY);
    ctx.scale(1.08, -0.78);
    ctx.rotate(-boat.angle);
    ctx.globalAlpha = vis * 0.34;

    // 倒影暖木船体与棉被剪影
    ctx.fillStyle = (st.quiltLv >= 1 && dep.quilt > 0.2) ? '#d9a48c' : '#6c4836';
    ctx.beginPath();
    ctx.moveTo(-36, -8);
    ctx.quadraticCurveTo(0, -3.5, 40, -11);
    ctx.quadraticCurveTo(32, 9.5, 17, 11);
    ctx.lineTo(-22, 11);
    ctx.quadraticCurveTo(-34, 8, -36, -8);
    ctx.closePath();
    ctx.fill();

    // 倒影船夫与桅杆小旗
    ctx.fillStyle = '#24304c';
    ctx.beginPath();
    ctx.moveTo(-10, -7); ctx.quadraticCurveTo(-5, -26, 0, -27); ctx.quadraticCurveTo(5, -26, 5, -7);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(92, 68, 52, 0.7)';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-6, -54); ctx.stroke();

    // 船头琥珀灯在镜面冰层上的温柔拉长倒影光柱
    ctx.globalAlpha = vis * 0.42;
    var lg = ctx.createRadialGradient(47, -12, 2, 47, -12, 44);
    lg.addColorStop(0, 'rgba(255, 234, 172, 0.92)');
    lg.addColorStop(0.5, 'rgba(255, 198, 120, 0.34)');
    lg.addColorStop(1, 'rgba(255, 180, 100, 0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(47, -12, 44, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  return {
    draw: draw,
    drawIceReflection: drawIceReflection
  };
})();
