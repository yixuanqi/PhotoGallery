(() => {
  const CB = window.CB;
  const INK = '#2e4a52';

  function getPal() {
    const st = CB.game && CB.game.map && CB.game.map.stage;
    return (st && st.palette) || {
      ink: '#2d4b52',
      floorBase: '#efeadd',
      floorLine: 'rgba(116, 134, 118, 0.22)',
      floorWashA: 'rgba(162, 212, 178, 0.18)',
      floorWashB: 'rgba(235, 214, 174, 0.22)',
      floorRoughDot: 'rgba(112, 98, 76, 0.14)',
      wallSide: '#b8cbb8',
      wallTop: '#ecf3e6',
      wallTrim: 'rgba(130, 212, 234, 0.34)',
      postSide: '#9db5a5',
      postTop: '#e2ece0',
      lampColor: '#76d4eb',
      lampGlow: 'rgba(255, 232, 132, 0.65)',
      isDark: false,
    };
  }

  function hash2D(x, y) {
    const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return s - Math.floor(s);
  }

  // 四大关卡专属手绘地砖纹理（384×384 大幅面无缝水彩砖，消除机械拼凑感）
  function getClimateId(st) {
    if (st && st.climateId) return st.climateId;
    const th = st ? st.theme : 'friction';
    if (th === 'gravity') return 'starry_night';
    if (th === 'stealth') return 'twilight_vine';
    if (th === 'fusion') return 'sunset_dome';
    return 'day_lotus';
  }

  function createPaperPattern(ctx, stage = null) {
    const st = stage || (CB.game && CB.game.map && CB.game.map.stage) || null;
    const pal = (st && st.palette) || getPal();
    const cid = getClimateId(st);
    const isGridTile = cid === 'starry_night' || cid === 'thunder_violet' || cid === 'horizon_void';

    const S = 384;
    const tile = document.createElement('canvas');
    tile.width = S;
    tile.height = S;
    const tctx = tile.getContext('2d');

    tctx.fillStyle = pal.floorBase;
    tctx.fillRect(0, 0, S, S);

    // 1. 柔和无缝平铺冷暖水彩大晕染（四边跨界绘制保证无接缝）
    const washes = [
      { x: 76, y: 84, r: 124, c: pal.floorWashA },
      { x: 268, y: 108, r: 132, c: pal.floorWashB },
      { x: 172, y: 278, r: 126, c: pal.floorWashA },
      { x: 332, y: 318, r: 112, c: pal.floorWashB },
      { x: 42, y: 324, r: 98, c: pal.floorWashB },
    ];
    for (const w of washes) {
      for (const ox of [-S, 0, S]) {
        for (const oy of [-S, 0, S]) {
          const wx = w.x + ox;
          const wy = w.y + oy;
          if (wx + w.r < 0 || wx - w.r > S || wy + w.r < 0 || wy - w.r > S) continue;
          const g = tctx.createRadialGradient(wx, wy, 6, wx, wy, w.r);
          g.addColorStop(0, w.c);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          tctx.fillStyle = g;
          tctx.fillRect(0, 0, S, S);
        }
      }
    }

    // 2. 逐块 64×64 手绘水彩石砖微色差（自然融为一体，不靠突兀贴片）
    for (let row = 0; row < 6; row++) {
      const offset = isGridTile ? 0 : (row % 2) * 32;
      for (let col = 0; col < 6; col++) {
        const h = hash2D(col * 17 + 3, row * 29 + 7);
        const bx = (col * 64 + offset) % S;
        const by = row * 64;
        if (h > 0.62) {
          tctx.fillStyle = pal.isDark ? 'rgba(130, 168, 245, 0.055)' : 'rgba(255, 254, 246, 0.22)';
        } else if (h < 0.28) {
          tctx.fillStyle = pal.isDark ? 'rgba(12, 18, 42, 0.14)' : 'rgba(128, 120, 98, 0.055)';
        } else {
          continue;
        }
        tctx.fillRect(bx + 1, by + 1, 62, 62);
        if (bx + 64 > S) tctx.fillRect(bx - S + 1, by + 1, 62, 62);
      }
    }

    // 3. 纸张与砂岩肌理微粒（确定性分布更自然）
    const dotCount = (cid === 'day_lotus' || cid === 'aurora_frost') ? 980 : 540;
    for (let i = 0; i < dotCount; i++) {
      const x = hash2D(i * 1.37, 11.7) * S;
      const y = hash2D(i * 2.91, 47.3) * S;
      tctx.fillStyle = i % 2 === 0
        ? pal.floorRoughDot
        : (pal.isDark ? 'rgba(180, 215, 255, 0.07)' : 'rgba(255, 255, 252, 0.08)');
      tctx.fillRect(x, y, 1.8 + hash2D(i, 3.1) * 2.4, 1.4 + hash2D(i, 9.7) * 1.8);
    }

    // 4. 柔和砖缝与微高光边缘
    tctx.strokeStyle = pal.floorLine;
    tctx.lineWidth = isGridTile ? 1.2 : 1.15;
    tctx.beginPath();
    for (let row = 0; row < 6; row++) {
      const y = row * 64 + 0.5;
      tctx.moveTo(0, y);
      tctx.lineTo(S, y);
      const offset = isGridTile ? 0 : (row % 2) * 32;
      for (let col = 0; col < 6; col++) {
        const x = (col * 64 + offset) % S + 0.5;
        tctx.moveTo(x, y);
        tctx.lineTo(x, y + 64);
      }
    }
    tctx.stroke();

    // 砖缝上沿极淡日光反光，增强石砖立体拼砌质感
    tctx.strokeStyle = pal.isDark ? 'rgba(255, 232, 160, 0.06)' : 'rgba(255, 255, 252, 0.32)';
    tctx.lineWidth = 1;
    tctx.beginPath();
    for (let row = 0; row < 6; row++) {
      const y = row * 64 + 1.8;
      tctx.moveTo(0, y);
      tctx.lineTo(S, y);
    }
    tctx.stroke();

    if (cid === 'thunder_violet') {
      tctx.strokeStyle = 'rgba(116, 228, 255, 0.14)';
      tctx.lineWidth = 1.4;
      tctx.beginPath();
      tctx.moveTo(32, 64); tctx.lineTo(128, 64); tctx.lineTo(160, 128); tctx.lineTo(288, 128);
      tctx.moveTo(96, 256); tctx.lineTo(224, 256); tctx.lineTo(256, 320);
      tctx.stroke();
    } else if (cid === 'aurora_frost') {
      tctx.strokeStyle = 'rgba(84, 186, 212, 0.18)';
      tctx.lineWidth = 1.25;
      [[96, 96], [288, 288]].forEach(([fx, fy]) => {
        for (let k = 0; k < 3; k++) {
          const a = (k * Math.PI) / 3;
          tctx.beginPath();
          tctx.moveTo(fx - Math.cos(a) * 18, fy - Math.sin(a) * 18);
          tctx.lineTo(fx + Math.cos(a) * 18, fy + Math.sin(a) * 18);
          tctx.stroke();
        }
      });
    } else if (cid === 'crystal_prism') {
      tctx.strokeStyle = 'rgba(232, 186, 78, 0.18)';
      tctx.lineWidth = 1.15;
      tctx.beginPath();
      tctx.moveTo(192, 64); tctx.lineTo(320, 192); tctx.lineTo(192, 320); tctx.lineTo(64, 192); tctx.closePath();
      tctx.stroke();
    } else if (cid === 'horizon_void') {
      tctx.strokeStyle = 'rgba(255, 206, 98, 0.15)';
      tctx.lineWidth = 1.3;
      tctx.beginPath();
      tctx.arc(192, 192, 136, 0, Math.PI * 2);
      tctx.arc(192, 192, 74, 0, Math.PI * 2);
      tctx.stroke();
    } else if (cid === 'starry_night') {
      // 星夜天文台：精致暗金星盘刻度圆弧与闪烁微星
      tctx.strokeStyle = 'rgba(246, 208, 114, 0.14)';
      tctx.lineWidth = 1.3;
      tctx.beginPath();
      tctx.arc(192, 192, 112, 0, Math.PI * 2);
      tctx.arc(192, 192, 54, 0, Math.PI * 2);
      tctx.stroke();
      tctx.fillStyle = 'rgba(255, 232, 146, 0.34)';
      [[64, 64], [320, 64], [64, 320], [320, 320], [192, 192]].forEach(([sx, sy]) => {
        tctx.beginPath();
        tctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
        tctx.fill();
      });
    } else if (cid === 'twilight_vine') {
      // 暮光古藤廊：蜿蜒深苔藤蔓暗纹
      tctx.strokeStyle = 'rgba(46, 108, 76, 0.18)';
      tctx.lineWidth = 1.9;
      tctx.beginPath();
      tctx.moveTo(0, 128);
      tctx.bezierCurveTo(110, 96, 240, 162, S, 128);
      tctx.moveTo(192, 0);
      tctx.bezierCurveTo(164, 126, 224, 256, 192, S);
      tctx.stroke();
    } else if (cid === 'sunset_dome') {
      // 落日鎏金穹：皇家金色菱形镶边拼花
      tctx.strokeStyle = 'rgba(232, 172, 72, 0.21)';
      tctx.lineWidth = 1.25;
      tctx.beginPath();
      tctx.moveTo(192, 24); tctx.lineTo(360, 192); tctx.lineTo(192, 360); tctx.lineTo(24, 192); tctx.closePath();
      tctx.stroke();
    } else {
      // 第 1 关晨露荷塘：石缝点缀零星细小青苔，自然贴合砖缝
      const tufts = [
        { x: 64, y: 64 }, { x: 224, y: 128 }, { x: 128, y: 256 }, { x: 320, y: 320 },
      ];
      tctx.fillStyle = 'rgba(110, 172, 122, 0.22)';
      for (const tf of tufts) {
        tctx.beginPath();
        tctx.ellipse(tf.x, tf.y, 6.5, 3.0, 0.15, 0, Math.PI * 2);
        tctx.fill();
      }
    }

    return ctx.createPattern(tile, 'repeat');
  }

  function drawSoftShadow(ctx, x, y, rx, ry, alpha = 0.18) {
    ctx.save();
    ctx.fillStyle = `rgba(52, 86, 98, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 3/4 关卡主题墙体（荷塘爬藤白石 / 天文台深蓝鎏金石墙 / 古藤厚苔青石 / 落日白玉金墙）
  function drawWallBlock(ctx, w) {
    const { x, y, w: ww, h: hh, height } = w;
    const pal = getPal();
    const st = CB.game && CB.game.map && CB.game.map.stage;
    const cid = getClimateId(st);
    const ink = pal.ink || INK;

    ctx.save();
    ctx.lineJoin = 'round';

    ctx.fillStyle = pal.isDark ? 'rgba(8, 12, 30, 0.38)' : 'rgba(56, 98, 114, 0.18)';
    ctx.fillRect(x + 5, y + 8, ww, hh);

    // 立面
    ctx.fillStyle = pal.wallSide;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.1;
    ctx.fillRect(x, y + hh - height, ww, height);
    ctx.strokeRect(x, y + hh - height, ww, height);

    // 石砖分块线
    ctx.strokeStyle = pal.isDark ? 'rgba(244, 202, 98, 0.22)' : 'rgba(64, 96, 92, 0.24)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + 3, y + hh - height * 0.48);
    ctx.lineTo(x + ww - 3, y + hh - height * 0.48);
    if (ww > 60) {
      for (let bx = x + 44; bx < x + ww - 20; bx += 48) {
        ctx.moveTo(bx, y + hh - height);
        ctx.lineTo(bx, y + hh - height * 0.48);
        ctx.moveTo(bx - 22, y + hh - height * 0.48);
        ctx.lineTo(bx - 22, y + hh);
      }
    }
    ctx.stroke();

    // 顶面
    ctx.fillStyle = pal.wallTop;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.1;
    ctx.fillRect(x, y - height, ww, hh);
    ctx.strokeRect(x, y - height, ww, hh);

    // 顶面装饰镶条（星象关为黄铜金带，荷塘关为玻璃水光，落日关为鎏金条）
    ctx.fillStyle = pal.wallTrim;
    ctx.fillRect(x + 4, y - height + 4, Math.max(0, ww - 8), Math.max(0, hh - 8));

    ctx.strokeStyle = pal.isDark ? 'rgba(255, 232, 150, 0.55)' : 'rgba(255, 255, 252, 0.72)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 3, y - height + 3);
    ctx.lineTo(x + ww - 3, y - height + 3);
    ctx.stroke();

    // 按 8 套气候统一绘制墙面细部（暗色/星象/雷电/奇点用黄铜/青电铆钉；极光用霜晶；花房用藤蔓小花）
    const span = Math.max(ww, hh);
    if (pal.isDark || cid === 'starry_night' || cid === 'thunder_violet' || cid === 'horizon_void') {
      const rivets = Math.max(1, Math.floor(span / 80));
      ctx.fillStyle = cid === 'thunder_violet' ? '#7ceeff' : (cid === 'horizon_void' ? '#ffd464' : '#f5ca5c');
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < rivets; i++) {
        const frac = (i + 0.5) / rivets;
        const rx = ww >= hh ? x + ww * frac : x + ww * 0.5;
        const ry = ww >= hh ? y - height + hh * 0.5 : y - height + hh * frac;
        ctx.beginPath();
        ctx.arc(rx, ry, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (cid === 'aurora_frost') {
      const frostCount = Math.max(1, Math.floor(span / 84));
      for (let i = 0; i < frostCount; i++) {
        const h1 = hash2D(x + i * 29, y + i * 19);
        if (h1 < 0.28) continue;
        const frac = (i + 0.5) / frostCount;
        const fx = ww >= hh ? x + ww * frac : x + ww * 0.5;
        const fy = ww >= hh ? y - height + hh * 0.55 : y - height + hh * frac;
        ctx.fillStyle = h1 > 0.6 ? '#b8f7ff' : '#e6fcff';
        ctx.strokeStyle = 'rgba(42, 118, 146, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(fx, fy - 5.5);
        ctx.lineTo(fx + 5, fy);
        ctx.lineTo(fx, fy + 5.5);
        ctx.lineTo(fx - 5, fy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else {
      const isStealthClimate = cid === 'twilight_vine';
      const vineCount = Math.max(1, Math.floor(span / (isStealthClimate ? 68 : 92)));
      const flowerColors = isStealthClimate
        ? ['#ffd866', '#c89cf2', '#ffad70']
        : cid === 'crystal_prism'
        ? ['#ffe270', '#96e4ff', '#ffb6cf', '#ffffff']
        : ['#ff9bb3', '#ffe066', '#88d4f5', '#fffaf0'];
      for (let i = 0; i < vineCount; i++) {
        const h1 = hash2D(x + i * 31, y + i * 17);
        if (h1 < (isStealthClimate ? 0.14 : 0.3)) continue;
        const frac = (i + 0.5) / vineCount;
        const vx = ww >= hh ? x + ww * frac : x + ww * 0.5;
        const vyTop = ww >= hh ? y - height + hh * 0.65 : y - height + hh * frac;

        ctx.fillStyle = isStealthClimate ? '#3d8a5c' : (h1 > 0.62 ? '#6ab87a' : '#52a16b');
        ctx.strokeStyle = 'rgba(32, 68, 52, 0.65)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(vx - 5, vyTop + 1, 6.5, 4.2, -0.35, 0, Math.PI * 2);
        ctx.ellipse(vx + 5, vyTop + 3, 5.8, 3.8, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (ww >= hh) {
          const dropLen = (isStealthClimate ? 12 : 8) + h1 * 12;
          ctx.fillStyle = isStealthClimate ? '#357d52' : '#5aa86e';
          ctx.beginPath();
          ctx.ellipse(vx, y + hh - height + dropLen * 0.55, 4.5, dropLen * 0.45, 0.15, 0, Math.PI * 2);
          ctx.fill();
        }

        if (h1 > 0.65) {
          ctx.fillStyle = flowerColors[Math.floor(h1 * 17) % flowerColors.length];
          ctx.beginPath();
          ctx.arc(vx + 2, vyTop, 2.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  // 关卡主题转角柱 + 专属色晶灯 / 星灯 / 琥珀灯笼
  function drawCornerPost(ctx, post) {
    const { x, y, w, h, height } = post;
    const pal = getPal();
    const ink = pal.ink || INK;
    const cx = x + w / 2;
    const cyTop = y - height + h / 2;

    ctx.save();
    ctx.lineJoin = 'round';

    ctx.fillStyle = pal.isDark ? 'rgba(8, 12, 30, 0.4)' : 'rgba(56, 98, 114, 0.2)';
    ctx.fillRect(x + 5, y + 8, w, h);

    ctx.fillStyle = pal.postSide;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.1;
    ctx.fillRect(x, y + h - height, w, height);
    ctx.strokeRect(x, y + h - height, w, height);

    ctx.fillStyle = pal.postTop;
    ctx.fillRect(x, y - height, w, h);
    ctx.strokeRect(x, y - height, w, h);

    // 柱顶暖灯晕光
    const glowR = pal.isDark ? 24 : 17;
    const glow = ctx.createRadialGradient(cx, cyTop, 2, cx, cyTop, glowR);
    glow.addColorStop(0, pal.lampGlow);
    glow.addColorStop(1, 'rgba(255, 232, 132, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cyTop, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pal.lampColor;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cyTop, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fffce0';
    ctx.beginPath();
    ctx.arc(cx - 1.6, cyTop - 1.6, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawProp(ctx, prop, time) {
    if (prop.broken) return;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (prop.type === 'book') drawPlanter(ctx, prop, time);
    else if (prop.type === 'eraser') drawCloudMushroom(ctx, prop, time);
    else if (prop.type === 'ruler') drawGlassTrellis(ctx, prop);
    else if (prop.type === 'crate') drawWickerCrate(ctx, prop, time);
    else if (prop.type === 'chest') drawChest(ctx, prop, time);
    else if (prop.type === 'bumper') drawWindChimeBumper(ctx, prop, time);
    else if (prop.type === 'inkwell') drawDewJar(ctx, prop, time);
    else if (prop.type === 'prism') drawPrism(ctx, prop, time);
    else if (prop.type === 'pollen_bud') drawPollenBud(ctx, prop, time);
    else if (prop.type === 'chime') drawChime(ctx, prop, time);
    else if (prop.type === 'sunflower_switch') drawSunflowerSwitch(ctx, prop, time);
    else if (prop.type === 'orrery') drawOrrery(ctx, prop, time);
    else if (prop.type === 'singularity') drawSingularity(ctx, prop, time);
    else if (prop.type === 'wormhole') drawWormhole(ctx, prop, time);
    else if (prop.type === 'pressure_can' && CB.physicsLab) CB.physicsLab.drawPressureCan(ctx, prop, time);
    else if (prop.type === 'convex_lens' && CB.physicsLab) CB.physicsLab.drawConvexLens(ctx, prop, time);
    else if (prop.type === 'mirror_post' && CB.physicsLab) CB.physicsLab.drawMirrorPost(ctx, prop, time);
    else if (prop.type === 'charge_pylon' && CB.physicsLab) CB.physicsLab.drawChargePylon(ctx, prop, time);

    ctx.restore();
  }

  // 1. 彩绘花坛石槽（替代原厚书掩体）
  function drawPlanter(ctx, prop, time) {
    const { x, y, w, h, height, color, spine, bloom, title, seed } = prop;
    const bloomColor = bloom || '#ff9ab0';

    // 阴影
    ctx.fillStyle = 'rgba(56, 98, 114, 0.17)';
    ctx.beginPath();
    ctx.roundRect(x + 7, y + 9, w, h, 8);
    ctx.fill();

    // 石槽正面墙体
    ctx.fillStyle = '#c5d4c2';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(x, y + h - height, w, height, [0, 0, 8, 8]);
    ctx.fill();
    ctx.stroke();

    // 正面浅雕花饰线
    ctx.strokeStyle = 'rgba(58, 92, 96, 0.28)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(x + 8, y + h - height + 5, Math.max(8, w - 16), Math.max(6, height - 10), 4);
    ctx.stroke();

    // 石槽顶框
    ctx.fillStyle = '#eef4e8';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(x, y - height, w, h, 8);
    ctx.fill();
    ctx.stroke();

    // 内部肥沃青苔花土
    ctx.fillStyle = spine || '#3f7d58';
    ctx.beginPath();
    ctx.roundRect(x + 7, y - height + 7, w - 14, h - 14, 5);
    ctx.fill();

    // 蓬松多层水彩绿植叶团
    const cols = Math.max(2, Math.round((w - 20) / 30));
    const rows = Math.max(2, Math.round((h - 20) / 28));
    const sway = Math.sin(time * 2.4 + (seed || 0)) * 1.4;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hVal = hash2D((seed || 1) + c * 19, r * 37);
        const lx = x + 15 + ((w - 30) * (c + 0.5)) / cols + (hVal - 0.5) * 8;
        const ly = y - height + 14 + ((h - 28) * (r + 0.5)) / rows + (hVal - 0.5) * 6;
        const lr = 11 + hVal * 6;

        ctx.fillStyle = (c + r) % 2 === 0 ? (color || '#5ca878') : '#74bf88';
        ctx.strokeStyle = 'rgba(40, 78, 60, 0.55)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(lx + sway * 0.5, ly - 3, lr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 开花簇
        if (hVal > 0.35) {
          ctx.fillStyle = bloomColor;
          ctx.beginPath();
          ctx.arc(lx + sway, ly - 5, 4.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff9d6';
          ctx.beginPath();
          ctx.arc(lx + sway, ly - 5, 1.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 小巧黄铜植物铭牌
    if (title && w >= 92) {
      const pw = 52;
      const ph = 16;
      const px = x + w / 2 - pw / 2;
      const py = y + h - height - 2;
      ctx.fillStyle = '#f8e6b8';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#3c4f49';
      ctx.font = '700 10.5px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, px + pw / 2, py + ph / 2 + 0.5);
    }
  }

  // 2. 巨型弹力云朵菌伞（替代原橡皮擦超级弹射机关）
  function drawCloudMushroom(ctx, prop, time) {
    const { x, y, w, h, height, hitFlash } = prop;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const breathe = Math.sin(time * 3.8 + cx * 0.02) * 0.025;
    const sc = 1 + (hitFlash || 0) * 0.14 + breathe;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    ctx.translate(-cx, -cy);

    // 柔和阴影
    ctx.fillStyle = 'rgba(56, 98, 114, 0.18)';
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy + 10, w * 0.48, h * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();

    // 奶油菌柄与菌褶
    ctx.fillStyle = '#f7eed9';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(x + w * 0.16, y + h - height - 2, w * 0.68, height + 2, [0, 0, 14, 14]);
    ctx.fill();
    ctx.stroke();

    // 浅粉菌褶纹理
    ctx.strokeStyle = 'rgba(218, 146, 152, 0.45)';
    ctx.lineWidth = 1.4;
    for (let gx = x + w * 0.25; gx < x + w * 0.78; gx += 12) {
      ctx.beginPath();
      ctx.moveTo(gx, y + h - height + 2);
      ctx.lineTo(gx, y + h - 4);
      ctx.stroke();
    }

    // 蓬松珊瑚粉云朵菌盖
    const capGrad = ctx.createRadialGradient(cx - w * 0.15, y - height + h * 0.3, 6, cx, y - height + h * 0.5, w * 0.65);
    capGrad.addColorStop(0, (hitFlash || 0) > 0.15 ? '#ffe3ea' : '#ffbfd0');
    capGrad.addColorStop(0.65, '#f28aa4');
    capGrad.addColorStop(1, '#d96c89');
    ctx.fillStyle = capGrad;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.roundRect(x, y - height, w, h, Math.min(w, h) * 0.48);
    ctx.fill();
    ctx.stroke();

    // 奶油白水彩圆点斑纹
    const spots = [
      { dx: -0.28, dy: -0.1, rx: 9, ry: 6 },
      { dx: 0.25, dy: -0.14, rx: 8, ry: 5.5 },
      { dx: 0.0, dy: 0.18, rx: 10, ry: 6.2 },
      { dx: -0.14, dy: -0.26, rx: 5, ry: 3.5 },
      { dx: 0.34, dy: 0.16, rx: 5.5, ry: 3.8 },
    ];
    ctx.fillStyle = 'rgba(255, 252, 244, 0.9)';
    for (const sp of spots) {
      ctx.beginPath();
      ctx.ellipse(cx + w * sp.dx, y - height + h * (0.5 + sp.dy), sp.rx, sp.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // BOUNCE 标识
    ctx.fillStyle = '#fffdf8';
    ctx.strokeStyle = 'rgba(138, 52, 74, 0.65)';
    ctx.lineWidth = 2.6;
    ctx.font = '800 10.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('BOING', cx, y - height + h * 0.48);
    ctx.fillText('BOING', cx, y - height + h * 0.48);

    ctx.restore();
  }

  // 3. 阳光玻璃花架（替代原木尺）
  function drawGlassTrellis(ctx, prop) {
    const { x, y, w, h, height } = prop;
    ctx.fillStyle = 'rgba(56, 98, 114, 0.14)';
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 7, w, h, 5);
    ctx.fill();

    // 淡原木花架底座
    ctx.fillStyle = '#c5a57a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.roundRect(x, y + h - height, w, height, [0, 0, 5, 5]);
    ctx.fill();
    ctx.stroke();

    // 顶面通透天蓝玻璃花格
    ctx.fillStyle = '#cfeef8';
    ctx.beginPath();
    ctx.roundRect(x, y - height, w, h, 5);
    ctx.fill();
    ctx.stroke();

    // 温室阳光反光斜条
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.roundRect(x + 5, y - height + 4, w - 10, h * 0.4, 3);
    ctx.fill();

    // 精致黄铜花格分栏
    ctx.strokeStyle = 'rgba(72, 120, 128, 0.45)';
    ctx.lineWidth = 1.4;
    for (let rx = x + 22; rx < x + w - 12; rx += 22) {
      ctx.beginPath();
      ctx.moveTo(rx, y - height + 2);
      ctx.lineTo(rx, y - height + h - 2);
      ctx.stroke();
    }
  }

  // 4. 可滑动台球藤编木箱（支持低摩擦露水超滑、台球碰撞传递、撞晕守卫）
  function drawWickerCrate(ctx, prop, time) {
    const { x, y, w, h, height, hitFlash, wobble, hp, maxHp, vx, vy, onDewSlide, trail } = prop;
    const spd = Math.hypot(vx || 0, vy || 0);
    const isSliding = spd > 55;
    const shakeX = !isSliding && wobble > 0 ? Math.sin(time * 75) * wobble * 3.5 : 0;

    // 滑行残影拖尾（台球击球感）
    if (trail && trail.length > 1 && isSliding) {
      ctx.save();
      for (let i = 0; i < trail.length - 1; i++) {
        const t = trail[i];
        const a = ((i + 1) / trail.length) * 0.24;
        ctx.fillStyle = t.dew ? `rgba(116, 224, 246, ${a})` : `rgba(218, 174, 114, ${a})`;
        ctx.beginPath();
        ctx.roundRect(t.x - w / 2, t.y - h / 2 - height * 0.35, w, h, 5);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(shakeX, 0);

    // 露水滑道上高速滑行时的水花光环
    if (isSliding && onDewSlide) {
      ctx.strokeStyle = 'rgba(116, 232, 252, 0.78)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2 + 2, w * 0.66, h * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(56, 98, 114, 0.16)';
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 7, w, h, 5);
    ctx.fill();

    // 暖蜜色藤条正面
    ctx.fillStyle = hitFlash > 0.15 ? '#fff3d6' : '#d2a46c';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.roundRect(x, y + h - height, w, height, [0, 0, 5, 5]);
    ctx.fill();
    ctx.stroke();

    // 藤条编织横纹
    ctx.strokeStyle = 'rgba(128, 86, 44, 0.42)';
    ctx.lineWidth = 1.5;
    for (let ly = y + h - height + 6; ly < y + h - 3; ly += 6) {
      ctx.beginPath();
      ctx.moveTo(x + 4, ly);
      ctx.lineTo(x + w - 4, ly);
      ctx.stroke();
    }

    // 顶面浅蜜藤盖
    ctx.fillStyle = hitFlash > 0.15 ? '#fff9eb' : '#edd09f';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.roundRect(x, y - height, w, h, 5);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(148, 102, 54, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x + 6, y - height + 5, w - 12, h - 10);

    // 角落点缀一小片嫩绿花农嫩叶
    ctx.fillStyle = '#6ec27e';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x + w - 9, y - height + 7, 5.5, 3.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 受损裂纹
    if (hp < maxHp) {
      ctx.strokeStyle = '#3c4a46';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.25, y - height + h * 0.2);
      ctx.lineTo(x + w * 0.52, y - height + h * 0.5);
      ctx.lineTo(x + w * 0.78, y - height + h * 0.38);
      ctx.moveTo(x + w * 0.52, y - height + h * 0.5);
      ctx.lineTo(x + w * 0.44, y - height + h * 0.85);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 5. 秘境花匣 / 太阳花穹神匣
  function drawChest(ctx, prop, time) {
    const { x, y, w, h, height, isGiant, opened, openProgress, unlocking, wobble } = prop;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const glow = 0.26 + 0.16 * Math.sin(time * 4.5);
    const shakeX = unlocking ? Math.sin(time * 62) * 2.4 : (wobble > 0 ? Math.sin(time * 70) * wobble * 2.5 : 0);

    if (!opened) {
      const glowR = isGiant ? w * 1.12 : w * 0.8;
      const g = ctx.createRadialGradient(cx, cy - 10, 8, cx, cy - 10, glowR);
      g.addColorStop(0, isGiant ? `rgba(255, 224, 96, ${glow * 1.45})` : `rgba(128, 224, 210, ${glow * 0.95})`);
      g.addColorStop(1, 'rgba(255, 224, 96, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy - 10, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(shakeX, 0);

    ctx.fillStyle = 'rgba(56, 98, 114, 0.22)';
    ctx.beginPath();
    ctx.roundRect(x + 6, y + 8, w, h, 7);
    ctx.fill();

    // 翡翠釉彩 / 象牙金边箱身
    ctx.fillStyle = isGiant ? '#2f8272' : '#4b8a82';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.roundRect(x, y + h - height, w, height, [0, 0, 7, 7]);
    ctx.fill();
    ctx.stroke();

    if (opened) {
      ctx.fillStyle = isGiant ? '#1f4f46' : '#2d5954';
      ctx.beginPath();
      ctx.roundRect(x + 4, y - height * 0.35, w - 8, h * 0.65, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 234, 130, 0.36)';
      ctx.beginPath();
      ctx.ellipse(cx, y - height * 0.05, w * 0.34, h * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isGiant ? '#3da18d' : '#63ab9f';
      ctx.beginPath();
      ctx.roundRect(x - 2, y - height - h * 0.42, w + 4, h * 0.56, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f6cc58';
      ctx.fillRect(x + 9, y - height - h * 0.42, 8, h * 0.56);
      ctx.fillRect(x + w - 17, y - height - h * 0.42, 8, h * 0.56);
      ctx.strokeRect(x + 9, y - height - h * 0.42, 8, h * 0.56);
      ctx.strokeRect(x + w - 17, y - height - h * 0.42, 8, h * 0.56);
    } else {
      ctx.fillStyle = isGiant ? '#3ea38e' : '#65ad9f';
      ctx.beginPath();
      ctx.roundRect(x, y - height, w, h, 8);
      ctx.fill();
      ctx.stroke();

      // 鎏金镶边与太阳纹锁扣
      ctx.fillStyle = '#f6cc58';
      ctx.fillRect(x + 9, y - height, 8, h + height);
      ctx.fillRect(x + w - 17, y - height, 8, h + height);
      ctx.strokeRect(x + 9, y - height, 8, h + height);
      ctx.strokeRect(x + w - 17, y - height, 8, h + height);

      ctx.beginPath();
      ctx.roundRect(cx - 9, y + h - height - 5, 18, 16, 4);
      ctx.fill();
      ctx.stroke();

      // 中央发光天蓝宝石
      ctx.fillStyle = isGiant ? '#fff2a6' : '#96e4f7';
      ctx.beginPath();
      ctx.arc(cx, y + h - height + 3, 4.2, 0, Math.PI * 2);
      ctx.fill();

      // 开锁读条圆环
      if (openProgress > 0.01) {
        const ringY = y - height - 18;
        ctx.fillStyle = 'rgba(255, 253, 246, 0.94)';
        ctx.beginPath();
        ctx.arc(cx, ringY, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(46, 74, 82, 0.22)';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.strokeStyle = isGiant ? '#e67e22' : '#2ea896';
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.arc(cx, ringY, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * openProgress);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // 6. 黄铜共鸣风铃柱（超级弹射柱）
  function drawWindChimeBumper(ctx, prop, time) {
    const { x, y, r, height, hitFlash } = prop;
    const scale = 1 + (hitFlash || 0) * 0.18;

    drawSoftShadow(ctx, x, y + 6, r * 1.05, r * 0.6, 0.2);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // 随风飘动的青色小丝带
    const wave = Math.sin(time * 5.2 + x * 0.05) * 6;
    ctx.strokeStyle = '#62c4d9';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(r * 0.65, -height + 2);
    ctx.quadraticCurveTo(r + 9, -height + 8 + wave * 0.4, r + 15, -height + 15 + wave);
    ctx.stroke();

    // 青铜底座圆柱
    ctx.fillStyle = '#4e9ba3';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.72, 0, 0, Math.PI);
    ctx.lineTo(-r, -height);
    ctx.ellipse(0, -height, r, r * 0.72, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 顶部暖金风铃盘
    ctx.fillStyle = hitFlash > 0.1 ? '#fff6bd' : '#f7d165';
    ctx.beginPath();
    ctx.ellipse(0, -height, r, r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 天青星环
    ctx.fillStyle = '#48b8c9';
    ctx.beginPath();
    ctx.ellipse(0, -height, r * 0.56, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 旋转风向四叶星
    ctx.save();
    ctx.translate(0, -height);
    ctx.rotate(time * 1.9);
    ctx.fillStyle = '#fffdf2';
    ctx.fillRect(-6, -1.6, 12, 3.2);
    ctx.fillRect(-1.6, -6, 3.2, 12);
    ctx.restore();

    ctx.restore();
  }

  // 7. 秘露花蜜瓶（替代原墨水瓶，碎裂后化为水彩花露减速池）
  function drawDewJar(ctx, prop, time) {
    const { x, y, r, height, color, hitFlash, wobble } = prop;
    const shakeX = wobble > 0 ? Math.sin(time * 80) * wobble * 3 : 0;

    drawSoftShadow(ctx, x, y + 4, r, r * 0.6, 0.18);

    ctx.save();
    ctx.translate(shakeX, 0);

    // 透明水彩玻璃瓶身
    ctx.fillStyle = hitFlash > 0.15 ? '#ffffff' : color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(x, y - height * 0.42, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 上半玻璃透亮感
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(x, y - height * 0.64, r * 0.72, Math.PI, 0);
    ctx.fill();

    // 软木塞 + 嫩绿小叶片标签
    ctx.fillStyle = '#ddb481';
    ctx.beginPath();
    ctx.roundRect(x - r * 0.36, y - height - 3, r * 0.72, 9, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#6cc47c';
    ctx.beginPath();
    ctx.ellipse(x + 7, y - height - 2, 5, 2.8, -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 玻璃弧形高光
    ctx.strokeStyle = 'rgba(255,255,255,0.78)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x - 3, y - height * 0.45, r * 0.46, Math.PI * 1.05, Math.PI * 1.55);
    ctx.stroke();

    ctx.restore();
  }

  // ==================== 战斗与交互手绘元素 ====================

  // 破碎秘露花蜜瓶形成的清透水彩减速露池
  function drawInkPuddle(ctx, ink) {
    const sc = Math.min(1, ink.grow);
    const fade = Math.min(1, ink.life / 2.2);
    const baseR = ink.radius * sc;

    ctx.save();
    ctx.translate(ink.x, ink.y);
    ctx.globalAlpha = 0.44 * fade;
    ctx.fillStyle = ink.color;

    ctx.beginPath();
    ctx.ellipse(0, 0, baseR * 0.88, baseR * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();

    for (const l of ink.lobes) {
      const lx = Math.cos(l.ang) * baseR * l.dist;
      const ly = Math.sin(l.ang) * baseR * l.dist * 0.82;
      ctx.beginPath();
      ctx.ellipse(lx, ly, baseR * l.r, baseR * l.r * 0.8, l.ang, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const d of ink.droplets) {
      ctx.beginPath();
      ctx.arc(d.dx * sc, d.dy * sc, d.r * sc, 0, Math.PI * 2);
      ctx.fill();
    }

    // 晶莹露珠反光
    ctx.globalAlpha = 0.42 * fade;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-baseR * 0.25, -baseR * 0.2, baseR * 0.2, baseR * 0.09, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(baseR * 0.22, baseR * 0.14, baseR * 0.07, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 声波涟漪警戒环
  function drawSoundRipple(ctx, r) {
    ctx.save();
    ctx.globalAlpha = r.alpha;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = r.sourceType === 'loud' || r.sourceType === 'slam' ? 2.6 : 1.9;
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.stroke();

    if (r.radius > 26) {
      ctx.globalAlpha = r.alpha * 0.45;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * 0.76, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 实时曲线数值积分预判线（星轨仪弯道弹弓 + 引力漩涡落点 + 1次折射 + 棱镜/分裂晶）
  function drawAimPreview(ctx, preview, time) {
    if (!preview || !preview.paths || !preview.paths.length) return;
    const liftY = -10;
    const w = preview.weapon;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (w.pellets > 1) {
      const halfSpread = w.spread * 0.52;
      const len = 145;
      ctx.strokeStyle = 'rgba(46, 118, 134, 0.24)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 5]);
      [-halfSpread, halfSpread].forEach((off) => {
        const a = preview.aimAngle + off;
        ctx.beginPath();
        ctx.moveTo(preview.ox, preview.oy + liftY);
        ctx.lineTo(preview.ox + Math.cos(a) * len, preview.oy + liftY + Math.sin(a) * len);
        ctx.stroke();
      });
    }

    for (const path of preview.paths) {
      const pts = path.points;
      if (!pts || pts.length < 2) continue;

      const tracePoly = () => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y + liftY);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y + liftY);
        }
      };

      // 星轨弹弓充能段叠加一层通透天青金辉外发光，让玩家一眼识别“弯道暴击甜点”！
      if (path.slingshot) {
        ctx.setLineDash([]);
        ctx.lineWidth = 5.4;
        ctx.strokeStyle = 'rgba(72, 214, 248, 0.28)';
        tracePoly();
        ctx.stroke();
      }

      ctx.lineDashOffset = -(time * (path.slingshot || path.isPrism ? 56 : 38));
      if (path.isPrism) {
        ctx.setLineDash([9, 5]);
        ctx.lineWidth = 2.8;
        ctx.strokeStyle = 'rgba(245, 178, 22, 0.94)';
      } else if (path.slingshot) {
        ctx.setLineDash([9, 5]);
        ctx.lineWidth = 2.9;
        ctx.strokeStyle = path.bounced ? 'rgba(240, 128, 48, 0.95)' : 'rgba(30, 178, 218, 0.95)';
      } else if (path.bounced) {
        ctx.setLineDash([7, 6]);
        ctx.lineWidth = path.isSuper ? 2.8 : 2.3;
        ctx.strokeStyle = path.isSuper ? 'rgba(232, 92, 132, 0.9)' : 'rgba(230, 96, 62, 0.85)';
      } else {
        ctx.setLineDash([8, 6]);
        ctx.lineWidth = 2.0;
        const palAim = getPal();
        ctx.strokeStyle = palAim.isDark
          ? 'rgba(196, 232, 255, 0.78)'
          : (w.id === 'light' ? 'rgba(46, 152, 178, 0.62)' : 'rgba(54, 108, 118, 0.65)');
      }
      tracePoly();
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // 瞄准可滑动台球木箱时，绘制台球推射滑行轨迹箭头（识别是否进入露水滑道或撞击守卫）
    const cPrevs = preview.cratePreviews || [];
    for (const cp of cPrevs) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = cp.hitsGuard ? '#e05848' : (cp.onDewSlide ? '#1fa4cc' : '#b88236');
      ctx.lineWidth = cp.onDewSlide ? 3.2 : 2.6;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -(time * 42);
      ctx.beginPath();
      ctx.moveTo(cp.x1, cp.y1 - 6);
      ctx.lineTo(cp.x2, cp.y2 - 6);
      ctx.stroke();
      ctx.setLineDash([]);

      // 末端滑行方向箭头
      const ang = Math.atan2(cp.y2 - cp.y1, cp.x2 - cp.x1);
      ctx.translate(cp.x2, cp.y2 - 6);
      ctx.rotate(ang);
      ctx.fillStyle = cp.hitsGuard ? '#e05848' : (cp.onDewSlide ? '#24b4de' : '#d49a42');
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-4, -5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 瞄准守卫触发台球击飞时，绘制怪物击飞/崖杀/连撞预判线！
    const gPrevs = preview.guardPreviews || [];
    for (const gp of gPrevs) {
      const ang = Math.atan2(gp.y2 - gp.y1, gp.x2 - gp.x1);
      const isCliff = !!gp.willCliffDrop;
      const isChain = !!gp.willChain;
      const isEliteBounce = !!gp.eliteBounce;
      const isExplode = !!gp.willExplode;

      const mainCol = isCliff
        ? '#1ec2eb'
        : isChain
        ? '#f28c24'
        : isEliteBounce
        ? '#e0a024'
        : isExplode
        ? '#7bc948'
        : gp.onDewSlide
        ? '#26b4db'
        : '#e07a52';

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 高光底晕（崖杀与连撞更醒目，一眼锁定“名场面甜点”！）
      if (isCliff || isChain || isExplode) {
        ctx.strokeStyle = isCliff
          ? 'rgba(72, 224, 255, 0.32)'
          : isChain
          ? 'rgba(255, 192, 66, 0.34)'
          : 'rgba(154, 232, 92, 0.30)';
        ctx.lineWidth = 6.5;
        ctx.beginPath();
        ctx.moveTo(gp.x1, gp.y1 - 8);
        ctx.lineTo(gp.x2, gp.y2 - 8);
        ctx.stroke();
      }

      ctx.strokeStyle = mainCol;
      ctx.lineWidth = isCliff || isChain ? 3.2 : 2.5;
      ctx.setLineDash([7, 5]);
      ctx.lineDashOffset = -(time * 52);
      ctx.beginPath();
      ctx.moveTo(gp.x1, gp.y1 - 8);
      ctx.lineTo(gp.x2, gp.y2 - 8);
      ctx.stroke();
      ctx.setLineDash([]);

      // 末端方向箭头
      ctx.save();
      ctx.translate(gp.x2, gp.y2 - 8);
      ctx.rotate(ang);
      ctx.fillStyle = mainCol;
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-4, -5.5);
      ctx.lineTo(-1.5, 0);
      ctx.lineTo(-4, 5.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 若途经易碎木花栏，标出破栏炸裂火花环
      if (gp.willBreakRailing && gp.railingPoint) {
        const rp = gp.railingPoint;
        ctx.strokeStyle = '#ff9838';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y - 8, 9 + Math.sin(time * 14) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 崖杀标靶徽章 ☁ / 精英弹回徽章 👑 / 引爆徽章 💥
      if (isCliff || isEliteBounce || isExplode) {
        const pulse = 1 + Math.sin(time * 11) * 0.12;
        const bx = gp.x2;
        const by = gp.y2 - 14;
        ctx.save();
        ctx.translate(bx, by);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = isCliff ? '#e6fbff' : isEliteBounce ? '#fff4d4' : '#f2ffd9';
        ctx.strokeStyle = mainCol;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, 12.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.font = '700 13px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isCliff ? '☁' : isEliteBounce ? '👑' : '💥', 0, 0.5);
        ctx.restore();
      }

      // 怪物连撞：在被撞守卫处画 🎱 标靶环 + 二次弹飞方向虚线！
      if (isChain && gp.chainTarget) {
        const ct = gp.chainTarget;
        const pulse = 1 + Math.sin(time * 12) * 0.1;

        ctx.strokeStyle = 'rgba(242, 148, 36, 0.85)';
        ctx.lineWidth = 2.4;
        ctx.setLineDash([5, 4]);
        ctx.lineDashOffset = -(time * 40);
        ctx.beginPath();
        ctx.moveTo(ct.x, ct.y - 8);
        ctx.lineTo(ct.secX, ct.secY - 8);
        ctx.stroke();
        ctx.setLineDash([]);

        const secAng = Math.atan2(ct.secY - ct.y, ct.secX - ct.x);
        ctx.save();
        ctx.translate(ct.secX, ct.secY - 8);
        ctx.rotate(secAng);
        ctx.fillStyle = '#f28c24';
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(-3, -4);
        ctx.lineTo(-1, 0);
        ctx.lineTo(-3, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(ct.x, ct.y - 8);
        ctx.strokeStyle = '#ffae38';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(0, 0, (ct.r + 5) * pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#fff8e0';
        ctx.strokeStyle = '#d97214';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, -(ct.r + 14), 10.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.font = '700 11.5px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎱', 0, -(ct.r + 13.5));
        ctx.restore();
      }

      ctx.restore();
    }

    // 携带「引力漩涡核」时，在首个命中/反弹点绘制柔和微型漩涡落点预判环
    if (preview.vortexPreviewPoint) {
      const vp = preview.vortexPreviewPoint;
      ctx.save();
      ctx.translate(vp.x, vp.y + liftY);
      ctx.rotate(time * 2.4);
      ctx.strokeStyle = 'rgba(56, 168, 224, 0.62)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const bPoints = preview.bouncePoints || [];
    for (const bp of bPoints) {
      ctx.fillStyle = bp.isWormhole ? '#b878ff' : bp.isPrism ? '#ffe45e' : bp.isSuper ? '#ff8fb1' : '#ffd257';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y + liftY, bp.isPrism ? 7 : bp.isSuper ? 6.2 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    const locks = preview.lockTargets || [];
    for (const lt of locks) {
      const pulse = 1 + Math.sin(time * 12) * 0.14;
      ctx.strokeStyle = lt.slingshot ? '#1da8d4' : lt.isPrism ? '#f0a614' : lt.bounced ? '#e0523c' : '#d99324';
      ctx.lineWidth = lt.slingshot ? 2.8 : 2.3;
      ctx.beginPath();
      ctx.arc(lt.x, lt.y + liftY, (lt.slingshot ? 11 : 9.5) * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBullet(ctx, b) {
    const liftY = -10;
    ctx.save();

    if (b.slingshotCharged || b.isPrismBeam || b.isOverclock) {
      const radG = b.isOverclock ? 21 : (b.slingshotCharged ? 18 : 16);
      const g = ctx.createRadialGradient(b.x, b.y + liftY, 1, b.x, b.y + liftY, radG);
      g.addColorStop(0, b.isOverclock ? 'rgba(255, 244, 150, 0.96)' : (b.slingshotCharged ? 'rgba(92, 230, 255, 0.92)' : 'rgba(255, 238, 112, 0.85)'));
      g.addColorStop(0.55, b.isOverclock ? 'rgba(82, 228, 255, 0.52)' : (b.slingshotCharged ? 'rgba(255, 224, 96, 0.45)' : 'rgba(255, 224, 96, 0.25)'));
      g.addColorStop(1, 'rgba(92, 230, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y + liftY, radG, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(52, 86, 98, 0.18)';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + 2, b.radius * 0.9, b.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (b.trail.length > 1) {
      ctx.strokeStyle = b.slingshotCharged ? '#24c4e8' : (b.bounceCount > 0 ? b.bouncedColor : b.trailColor);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < b.trail.length; i++) {
        const a = i / b.trail.length;
        ctx.globalAlpha = a * 0.68;
        ctx.lineWidth = Math.max(1.5, b.radius * 1.35 * a);
        ctx.beginPath();
        ctx.moveTo(b.trail[i - 1].x, b.trail[i - 1].y + liftY);
        ctx.lineTo(b.trail[i].x, b.trail[i].y + liftY);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    if (b.weaponId === 'needle') {
      const ang = Math.atan2(b.vy, b.vx);
      ctx.translate(b.x, b.y + liftY);
      ctx.rotate(ang);
      ctx.fillStyle = b.bounceCount > 0 ? '#e65a47' : '#dcf8ff';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-7, -2.8);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-7, 2.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = b.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(b.x, b.y + liftY, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fffdf0';
      ctx.beginPath();
      ctx.arc(b.x - b.radius * 0.3, b.y + liftY - b.radius * 0.3, b.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawEnemyBullet(ctx, eb) {
    const liftY = -10;
    const style = eb.style || 'default';
    ctx.save();

    ctx.fillStyle = 'rgba(32, 56, 72, 0.2)';
    ctx.beginPath();
    ctx.ellipse(eb.x, eb.y + 2, eb.radius, eb.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(eb.x, eb.y + liftY);
    if (eb.dilated) {
      ctx.strokeStyle = 'rgba(168, 114, 255, 0.85)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, 0, eb.radius + 4.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (style === 'bubble') {
      // 第 1 关：晶莹弹跳露水泡
      ctx.fillStyle = 'rgba(116, 232, 252, 0.78)';
      ctx.strokeStyle = '#1e6e85';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, eb.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-2, -2, eb.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'star') {
      // 第 2/4 关：发光四角星弧弹
      const rot = (CB.game ? CB.game.time : 0) * 6;
      ctx.rotate(rot);
      ctx.fillStyle = eb.color || '#ffd859';
      ctx.strokeStyle = '#24325c';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const rad = i % 2 === 0 ? eb.radius * 1.45 : eb.radius * 0.55;
        const a = (i * Math.PI) / 4;
        if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (style === 'thorn') {
      // 第 3 关：高速荆棘毒刺
      ctx.rotate(Math.atan2(eb.vy, eb.vx));
      ctx.fillStyle = '#9be86b';
      ctx.strokeStyle = '#1d3b28';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-7, -4);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-7, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = eb.color || '#e86858';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.arc(0, 0, eb.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCoin(ctx, c) {
    const squashX = 0.65 + 0.35 * Math.abs(Math.cos(c.spin));
    drawSoftShadow(ctx, c.x, c.y + 3, 6.2, 3.4, 0.2);

    ctx.save();
    ctx.translate(c.x, c.y - c.z - 5);
    ctx.scale(squashX, 1);

    ctx.fillStyle = '#f7ca4d';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, 6.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#bf851d';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#fffbe0';
    ctx.beginPath();
    ctx.arc(-2, -2, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawCurioDrop(ctx, drop, time) {
    const hover = Math.sin(time * 5.2 + drop.x) * 4.5;
    const drawY = drop.y - drop.z - 14 + hover;
    const r = drop.isGrand ? 17 : 13;

    drawSoftShadow(ctx, drop.x, drop.y + 3, r * 0.85, r * 0.45, 0.24);

    ctx.save();
    ctx.translate(drop.x, drawY);

    const auraR = drop.isGrand ? 36 : 25;
    const g = ctx.createRadialGradient(0, 0, 3, 0, 0, auraR);
    g.addColorStop(0, drop.isGrand ? 'rgba(255, 224, 78, 0.78)' : 'rgba(116, 214, 240, 0.62)');
    g.addColorStop(1, 'rgba(255, 224, 78, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = drop.isGrand ? '#fff6cc' : '#f7fdff';
    ctx.strokeStyle = drop.isGrand ? '#c98614' : INK;
    ctx.lineWidth = drop.isGrand ? 2.8 : 2.1;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = `${drop.isGrand ? 18 : 14}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(drop.curio.icon, 0, 1);

    ctx.restore();
  }

  function drawInteractPrompt(ctx, hint, time) {
    if (!hint) return;
    const bob = Math.sin(time * 6) * 3;
    const x = hint.x;
    const y = hint.y + bob;

    ctx.save();
    ctx.font = '700 12.5px "PingFang SC", sans-serif';
    const textW = ctx.measureText(hint.text).width;
    const keyW = Math.max(24, ctx.measureText(hint.key).width + 12);
    const padX = 11;
    const totalW = keyW + textW + padX * 2 + 8;
    const totalH = 30;
    const left = x - totalW / 2;
    const top = y - totalH / 2;

    ctx.fillStyle = 'rgba(46, 74, 82, 0.2)';
    ctx.beginPath();
    ctx.roundRect(left + 2, top + 4, totalW, totalH, 15);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 253, 248, 0.96)';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(left, top, totalW, totalH, 15);
    ctx.fill();
    ctx.stroke();

    if (hint.progress > 0.01) {
      ctx.fillStyle = hint.accent || '#2f9888';
      ctx.beginPath();
      ctx.roundRect(left + 6, top + totalH - 5, (totalW - 12) * Math.min(1, hint.progress), 3, 2);
      ctx.fill();
    }

    ctx.fillStyle = hint.accent || '#2f9888';
    ctx.beginPath();
    ctx.roundRect(left + 5, top + 4.5, keyW, totalH - 9, 10);
    ctx.fill();

    ctx.fillStyle = '#fffdf8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hint.key, left + 5 + keyW / 2, y + 0.5);

    ctx.fillStyle = '#264047';
    ctx.textAlign = 'left';
    ctx.fillText(hint.text, left + 5 + keyW + 7, y + 0.5);

    ctx.restore();
  }


  // ==================== 空中花房 3 大核心机关渲染 ====================

  // 机关 1：日光折射棱镜（黄铜罗盘转盘 + 悬浮晶面棱柱 + 出射方向光翼）
  function drawPrism(ctx, prop, time) {
    const { x, y, r, height, visualAngle, hitFlash, pulse } = prop;
    const ang = visualAngle ?? prop.angle ?? 0;
    const hover = Math.sin(time * 3.8 + x * 0.03) * 3.2;
    const glowR = 32 + (pulse || 0) * 18;

    drawSoftShadow(ctx, x, y + 5, r * 1.05, r * 0.62, 0.22);

    ctx.save();
    ctx.translate(x, y);

    // 柔和日光折射晕
    const g = ctx.createRadialGradient(0, -height * 0.65, 3, 0, -height * 0.65, glowR);
    g.addColorStop(0, (hitFlash || 0) > 0.15 ? 'rgba(255, 244, 150, 0.92)' : 'rgba(130, 234, 248, 0.48)');
    g.addColorStop(1, 'rgba(255, 244, 150, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -height * 0.65, glowR, 0, Math.PI * 2);
    ctx.fill();

    // 地面方向指针圆盘（一眼看清棱镜出射方向！）
    ctx.save();
    ctx.rotate(ang);
    ctx.strokeStyle = 'rgba(232, 168, 28, 0.72)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(r * 0.45, -7);
    ctx.lineTo(r + 12, -13);
    ctx.moveTo(r * 0.45, 7);
    ctx.lineTo(r + 12, 13);
    ctx.stroke();

    // 方向箭头小三角
    ctx.fillStyle = '#ffd64d';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(r + 14, 0);
    ctx.lineTo(r + 3, -5.5);
    ctx.lineTo(r + 3, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 黄铜底座转盘
    ctx.fillStyle = '#d9aa4e';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.92, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f5dc8c';
    ctx.beginPath();
    ctx.ellipse(0, -3, r * 0.66, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 悬浮多面水晶棱柱
    ctx.save();
    ctx.translate(0, -18 + hover);
    ctx.rotate(ang);
    const sc = 1 + (hitFlash || 0) * 0.22;
    ctx.scale(sc, sc);

    ctx.fillStyle = (hitFlash || 0) > 0.15 ? '#fff8c4' : '#8ce8f7';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-9, -12);
    ctx.lineTo(-13, 0);
    ctx.lineTo(-9, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 水晶棱面高光与彩虹折光芯
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-8, -10);
    ctx.lineTo(-2, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffe45e';
    ctx.beginPath();
    ctx.arc(1, 0, 3.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  // 机关 2：花粉隐身花苞（饱满金黄花苞 + 翠绿萼片 + 微微发光花粉芯）
  function drawPollenBud(ctx, prop, time) {
    const { x, y, r, hitFlash, wobble } = prop;
    const sway = Math.sin(time * 3.4 + x * 0.04) * 0.08 + (wobble > 0 ? Math.sin(time * 72) * wobble * 0.2 : 0);

    drawSoftShadow(ctx, x, y + 4, r * 0.95, r * 0.56, 0.2);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sway);

    // 淡淡金色花粉辉光
    const glow = ctx.createRadialGradient(0, -12, 3, 0, -12, 26);
    glow.addColorStop(0, 'rgba(255, 224, 96, 0.55)');
    glow.addColorStop(1, 'rgba(255, 224, 96, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -12, 26, 0, Math.PI * 2);
    ctx.fill();

    // 底部四片舒展翠绿大叶托盘
    ctx.fillStyle = '#55ab70';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.9;
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(i * (Math.PI / 2) + 0.4);
      ctx.beginPath();
      ctx.ellipse(9, 0, 9.5, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 饱满琥珀金色花粉花苞
    const budGrad = ctx.createRadialGradient(-4, -17, 2, 0, -12, 16);
    budGrad.addColorStop(0, hitFlash > 0.15 ? '#ffffff' : '#fff6b8');
    budGrad.addColorStop(0.55, '#ffd44d');
    budGrad.addColorStop(1, '#e09a24');
    ctx.fillStyle = budGrad;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(0, -27);
    ctx.bezierCurveTo(16, -22, 16, -3, 0, 1);
    ctx.bezierCurveTo(-16, -3, -16, -22, 0, -27);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 包裹花苞的嫩绿萼片弧线
    ctx.fillStyle = '#6ec27e';
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.quadraticCurveTo(-8, -14, -2, -16);
    ctx.quadraticCurveTo(-1, -6, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(10, -4);
    ctx.quadraticCurveTo(8, -14, 2, -16);
    ctx.quadraticCurveTo(1, -6, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 浮出花苞顶端的两颗微光花粉粒
    const fp = (time * 18) % 14;
    ctx.fillStyle = `rgba(255, 240, 140, ${1 - fp / 14})`;
    ctx.beginPath();
    ctx.arc(-5, -24 - fp, 2.2, 0, Math.PI * 2);
    ctx.arc(6, -20 - ((fp + 7) % 14), 1.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 绽放后的金色花粉隐身雾云
  function drawPollenCloud(ctx, pc, time) {
    const sc = Math.min(1, pc.grow);
    const fade = Math.min(1, pc.life / 1.8);
    const baseR = pc.radius * sc;

    ctx.save();
    ctx.translate(pc.x, pc.y);

    // 柔和雾云边缘虚线范围提示（清晰标识隐身安全区）
    ctx.globalAlpha = 0.42 * fade;
    ctx.strokeStyle = '#d49a18';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, baseR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 多团缓慢旋流的暖金花粉云
    for (const pf of pc.puffs) {
      const swirl = pf.ang + time * 0.45;
      const px = Math.cos(swirl) * baseR * pf.dist;
      const py = Math.sin(swirl) * baseR * pf.dist * 0.85;
      const pr = baseR * pf.r * (0.94 + Math.sin(time * 2.6 + pf.phase) * 0.08);
      const grad = ctx.createRadialGradient(px, py, 2, px, py, pr);
      grad.addColorStop(0, `rgba(255, 232, 118, ${0.46 * fade})`);
      grad.addColorStop(0.65, `rgba(255, 214, 78, ${0.26 * fade})`);
      grad.addColorStop(1, 'rgba(255, 214, 78, 0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    // 闪烁飘升的金色微粒
    ctx.globalAlpha = 0.82 * fade;
    for (let i = 0; i < 9; i++) {
      const a = i * 0.72 + time * 0.9;
      const dist = baseR * (0.2 + ((i * 19) % 70) / 100);
      const sx = Math.cos(a) * dist;
      const sy = Math.sin(a) * dist * 0.8 - ((time * 16 + i * 9) % 24);
      ctx.fillStyle = i % 2 === 0 ? '#fff7b8' : '#ffd23f';
      ctx.beginPath();
      ctx.arc(sx, sy, 2.2 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // 机关 3：共鸣风铃串（青铜小花架 + 摇曳天青/暖金风铃管）
  function drawChime(ctx, prop, time) {
    const { x, y, r, ringAnim, hitFlash } = prop;
    const swing = Math.sin(time * 24) * (ringAnim || 0) * 0.34 + Math.sin(time * 2.5 + x) * 0.05;

    drawSoftShadow(ctx, x, y + 4, r * 0.9, r * 0.5, 0.2);

    ctx.save();
    ctx.translate(x, y);

    // 响铃时的青色音符光圈
    if (ringAnim > 0.05) {
      ctx.strokeStyle = `rgba(62, 194, 216, ${ringAnim * 0.75})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, -18, 16 + (1 - ringAnim) * 24, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 底座小石墩
    ctx.fillStyle = '#c9d8ca';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 拱形黄铜风铃挂架
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(-10, -26);
    ctx.quadraticCurveTo(0, -37, 10, -26);
    ctx.lineTo(10, -2);
    ctx.stroke();

    ctx.strokeStyle = '#e5b84b';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 摇曳的 3 根风铃琉璃管 + 底部小晴天纸笺
    ctx.save();
    ctx.translate(0, -31);
    ctx.rotate(swing);
    const tubes = [
      { ox: -5.5, len: 14, c: '#72d4e8' },
      { ox: 0, len: 18, c: '#ffe073' },
      { ox: 5.5, len: 13, c: '#8ee6c8' },
    ];
    for (const tb of tubes) {
      ctx.fillStyle = hitFlash > 0.15 ? '#ffffff' : tb.c;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(tb.ox - 2.3, 3, 4.6, tb.len, 2);
      ctx.fill();
      ctx.stroke();
    }
    // 中央风铃纸笺
    ctx.fillStyle = '#ff9cb5';
    ctx.fillRect(-3.2, 22, 6.4, 7.5);
    ctx.strokeRect(-3.2, 22, 6.4, 7.5);
    ctx.restore();

    ctx.restore();
  }

  // 机关 4A：向日葵感应花盘（未点亮为含苞金标靶，击中后灿烂绽放！）
  function drawSunflowerSwitch(ctx, prop, time) {
    const { x, y, r, activated, bloomAnim, hitFlash } = prop;
    const sc = 1 + (bloomAnim || 0) * 0.28;

    drawSoftShadow(ctx, x, y + 5, r * 0.95, r * 0.55, 0.22);

    ctx.save();
    ctx.translate(x, y);

    // 底座青苔石柱
    ctx.fillStyle = '#b9ccb9';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 粗壮嫩绿花茎
    ctx.strokeStyle = '#3d8755';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(0, -18);
    ctx.stroke();

    ctx.save();
    ctx.translate(0, -20);
    ctx.scale(sc, sc);
    ctx.rotate(activated ? time * 0.9 : Math.sin(time * 2.2) * 0.12);

    // 花瓣（未激活偏紧缩半合，激活后明艳舒展！）
    const petalCount = 10;
    const petalLen = activated ? 14 : 9.5;
    const petalW = activated ? 5.2 : 4.2;
    for (let i = 0; i < petalCount; i++) {
      ctx.save();
      ctx.rotate((i / petalCount) * Math.PI * 2);
      ctx.fillStyle = hitFlash > 0.15
        ? '#ffffff'
        : activated
        ? (i % 2 === 0 ? '#ffd83d' : '#ffba26')
        : '#d4be68';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(petalLen * 0.72, 0, petalLen * 0.55, petalW * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 中心向日葵花盘靶心
    ctx.fillStyle = activated ? '#7d4d25' : '#584b3e';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 未激活时的脉冲靶心提示环（清晰告诉玩家：打我！）
    if (!activated) {
      const p = 0.5 + 0.5 * Math.sin(time * 6);
      ctx.strokeStyle = `rgba(255, 224, 96, ${0.5 + p * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffe875';
      ctx.beginPath();
      ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  }

  // 机关 4B：藤蔓花闸（闭合时为带镂空铁艺的荆棘藤门，开启时向两侧优雅收拢！）
  function drawVineGate(ctx, gate, time) {
    const openT = gate.openAnim || 0;
    if (openT >= 0.98) return;

    const { x, y, w, h, orient, height } = gate;
    const closedFrac = 1 - openT;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const drawLeafHalf = (hx, hy, hw, hh) => {
      // 柔和地面投影
      ctx.fillStyle = 'rgba(46, 86, 98, 0.22)';
      ctx.fillRect(hx + 3, hy + 6, hw, hh);

      // 镂空青铜花艺栏杆底框（半透明提示玩家子弹可穿透！）
      ctx.fillStyle = 'rgba(72, 146, 108, 0.72)';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.roundRect(hx, hy - height * 0.85, hw, hh + height * 0.85, 5);
      ctx.fill();
      ctx.stroke();

      // 缠绕的翠绿厚藤与金黄小花苞
      ctx.strokeStyle = '#387d52';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      if (orient === 'h') {
        ctx.moveTo(hx + 4, hy - height * 0.45);
        ctx.quadraticCurveTo(hx + hw * 0.5, hy - height * 0.8, hx + hw - 4, hy - height * 0.25);
        ctx.moveTo(hx + 4, hy - height * 0.15);
        ctx.quadraticCurveTo(hx + hw * 0.5, hy + 4, hx + hw - 4, hy - height * 0.55);
      } else {
        ctx.moveTo(hx + hw * 0.25, hy - height * 0.6);
        ctx.quadraticCurveTo(hx + hw * 0.8, hy + hh * 0.5 - height * 0.5, hx + hw * 0.3, hy + hh - 6);
      }
      ctx.stroke();

      // 叶片簇与锁花
      const cx = hx + hw / 2;
      const cy = hy + hh / 2 - height * 0.45;
      ctx.fillStyle = '#6ec982';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx - 8, cy, 7, 4.5, -0.4, 0, Math.PI * 2);
      ctx.ellipse(cx + 8, cy + 2, 7, 4.5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffd84d';
      ctx.beginPath();
      ctx.arc(cx, cy, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };

    if (orient === 'h') {
      const halfW = (w / 2) * closedFrac;
      if (halfW > 4) {
        drawLeafHalf(x, y, halfW, h);
        drawLeafHalf(x + w - halfW, y, halfW, h);
      }
    } else {
      const halfH = (h / 2) * closedFrac;
      if (halfH > 4) {
        drawLeafHalf(x, y, w, halfH);
        drawLeafHalf(x, y + h - halfH, w, halfH);
      }
    }

    // 中央未解锁向日葵小徽章
    if (closedFrac > 0.7) {
      const pulse = 1 + Math.sin(time * 5) * 0.08;
      ctx.save();
      ctx.translate(gate.cx, gate.cy - height * 0.45);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#fff5cc';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = '12px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🌻', 0, 1);
      ctx.restore();
    }

    ctx.restore();
  }

  // ==================== 三层环境视觉充实装饰渲染 ====================

  function drawGroundDecor(ctx, d, time) {
    ctx.save();
    if (d.kind === 'moss') {
      // 柔和羽化水彩青苔晕染（零硬边椭圆，自然渗入石砖肌理）
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.scale(1, d.ry / Math.max(1, d.rx));
      const g = ctx.createRadialGradient(0, 0, d.rx * 0.12, 0, 0, d.rx);
      const col = d.tone || '#76bf82';
      ctx.globalAlpha = d.alpha * 1.15;
      g.addColorStop(0, col);
      g.addColorStop(0.62, col);
      g.addColorStop(1, 'rgba(118, 191, 130, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, d.rx, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.kind === 'flagstone') {
      // 对齐 64×64 砖格的天然石板微色差块（融入砖缝，彻底消除贴片感）
      const pal = getPal();
      ctx.fillStyle = pal.isDark
        ? (d.warm ? `rgba(246, 212, 126, ${d.alpha * 0.42})` : `rgba(112, 152, 232, ${d.alpha * 0.55})`)
        : (d.warm ? `rgba(255, 252, 240, ${d.alpha * 1.45})` : `rgba(196, 214, 198, ${d.alpha * 1.05})`);
      ctx.fillRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);
      ctx.strokeStyle = pal.isDark ? 'rgba(255, 236, 178, 0.10)' : 'rgba(255, 255, 252, 0.42)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(d.x + 3, d.y + 3);
      ctx.lineTo(d.x + d.w - 3, d.y + 3);
      ctx.stroke();
    } else if (d.kind === 'water_strip') {
      // 有机平滑波浪岸线的浅水荷塘洼（柔和湿润外晕 + 水深渐变 + 柔光波纹 + 荷叶）
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);

      const traceOrganic = (scale = 1) => {
        const pts = d.lobes;
        if (!pts || pts.length < 3) {
          ctx.beginPath();
          ctx.ellipse(0, 0, d.rx * scale, d.ry * scale, 0, 0, Math.PI * 2);
          return;
        }
        const n = pts.length;
        ctx.beginPath();
        const mid0x = ((pts[n - 1].x + pts[0].x) * 0.5) * scale;
        const mid0y = ((pts[n - 1].y + pts[0].y) * 0.5) * scale;
        ctx.moveTo(mid0x, mid0y);
        for (let i = 0; i < n; i++) {
          const p0 = pts[i];
          const p1 = pts[(i + 1) % n];
          const mx = ((p0.x + p1.x) * 0.5) * scale;
          const my = ((p0.y + p1.y) * 0.5) * scale;
          ctx.quadraticCurveTo(p0.x * scale, p0.y * scale, mx, my);
        }
        ctx.closePath();
      };

      // 外圈湿润石岸晕边
      ctx.fillStyle = 'rgba(92, 168, 176, 0.12)';
      traceOrganic(1.12);
      ctx.fill();

      // 水体柔和渐变
      const wg = ctx.createRadialGradient(-d.rx * 0.15, -d.ry * 0.15, 4, 0, 0, Math.max(d.rx, d.ry));
      wg.addColorStop(0, 'rgba(136, 224, 240, 0.34)');
      wg.addColorStop(0.75, 'rgba(84, 192, 214, 0.24)');
      wg.addColorStop(1, 'rgba(68, 168, 192, 0.16)');
      ctx.fillStyle = wg;
      traceOrganic(1.0);
      ctx.fill();

      ctx.strokeStyle = 'rgba(66, 162, 184, 0.28)';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // 细腻水面高光弧纹
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
      ctx.lineWidth = 1.3;
      const sh = Math.sin(time * 2.2 + d.x) * 3.5;
      ctx.beginPath();
      ctx.ellipse(-d.rx * 0.22 + sh, -d.ry * 0.12, d.rx * 0.28, d.ry * 0.18, 0, 0.2, Math.PI - 0.2);
      ctx.stroke();

      if (d.hasLily) {
        const lx = d.rx * 0.24;
        const ly = d.ry * 0.06;
        const rot = d.lilyAng || 0.25;
        ctx.fillStyle = 'rgba(88, 178, 122, 0.82)';
        ctx.strokeStyle = 'rgba(42, 92, 68, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(lx, ly, 9.5, rot + 0.25, rot + Math.PI * 1.9);
        ctx.lineTo(lx, ly);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffa6be';
        ctx.beginPath();
        ctx.arc(lx + 1, ly - 1, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (d.kind === 'petals') {
      ctx.translate(d.x, d.y);
      for (const dot of d.dots) {
        ctx.fillStyle = dot.c;
        ctx.globalAlpha = 0.72;
        ctx.beginPath();
        ctx.ellipse(dot.dx, dot.dy, dot.r, dot.r * 0.65, dot.dx, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (d.kind === 'grass') {
      const wind = Math.sin(time * 2.5 + d.phase) * 0.14 + (d.sway || 0) * 0.18;
      ctx.translate(d.x, d.y);
      ctx.scale(d.scale, d.scale);
      ctx.lineCap = 'round';
      for (let i = 0; i < d.blades; i++) {
        const baseAng = ((i / Math.max(1, d.blades - 1)) - 0.5) * 0.9;
        const h = 11 + (i % 2) * 4;
        const tipX = Math.sin(baseAng + wind) * h;
        const tipY = -Math.cos(baseAng) * h;
        ctx.strokeStyle = i % 2 === 0 ? '#58ab6e' : '#73c484';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo((i - 1) * 2.4, 0);
        ctx.quadraticCurveTo((i - 1) * 2.4 + tipX * 0.4, tipY * 0.5, (i - 1) * 2.4 + tipX, tipY);
        ctx.stroke();
      }
      if (d.flower) {
        ctx.fillStyle = d.flower;
        ctx.beginPath();
        ctx.arc(wind * 9, -12, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawEdgeDecor(ctx, d, time) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (d.kind === 'pot') {
      drawSoftShadow(ctx, 0, 3, 10, 5, 0.18);
      // 暖红陶土小盆栽
      ctx.fillStyle = '#d48262';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(-7.5, -11);
      ctx.lineTo(7.5, -11);
      ctx.lineTo(5.5, 1);
      ctx.lineTo(-5.5, 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#e39676';
      ctx.fillRect(-8.5, -14, 17, 4);
      ctx.strokeRect(-8.5, -14, 17, 4);

      const sw = Math.sin(time * 2.4 + d.seed) * 1.2;
      ctx.fillStyle = '#5fb878';
      ctx.beginPath();
      ctx.arc(-4 + sw, -18, 5.2, 0, Math.PI * 2);
      ctx.arc(4 + sw, -18, 4.8, 0, Math.PI * 2);
      ctx.arc(sw, -21, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = d.bloom || '#ff9bb3';
      ctx.beginPath();
      ctx.arc(sw, -21, 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.kind === 'cloche') {
      drawSoftShadow(ctx, 0, 3, 10, 5, 0.16);
      // 玻璃钟形小温室花罩
      ctx.fillStyle = '#c5a57a';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.ellipse(0, 0, 9.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 内部珍稀小花
      ctx.fillStyle = '#5eb878';
      ctx.beginPath();
      ctx.arc(0, -6, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = d.bloom || '#ffd859';
      ctx.beginPath();
      ctx.arc(0, -10, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // 半透明玻璃穹罩
      ctx.fillStyle = 'rgba(186, 240, 255, 0.42)';
      ctx.strokeStyle = 'rgba(46, 98, 114, 0.72)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, -10, 8.5, Math.PI, 0);
      ctx.lineTo(8.5, -1);
      ctx.lineTo(-8.5, -1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.ellipse(-3.5, -12, 1.8, 4.2, 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.kind === 'watering_can') {
      drawSoftShadow(ctx, 0, 3, 10, 5, 0.18);
      ctx.scale(d.flip || 1, 1);
      // 精致黄铜洒水壶
      ctx.fillStyle = '#e5bc55';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.roundRect(-7, -11, 13, 11, 3);
      ctx.fill();
      ctx.stroke();
      // 壶嘴与提手
      ctx.beginPath();
      ctx.moveTo(6, -5);
      ctx.lineTo(13, -12);
      ctx.moveTo(-7, -9);
      ctx.quadraticCurveTo(-12, -6, -7, -2);
      ctx.stroke();
    } else {
      // 沿墙嫩绿蕨丛
      const sw = Math.sin(time * 2.2 + d.seed) * 1.5;
      ctx.fillStyle = '#5bb374';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(-5 + sw * 0.5, -5, 6.5, 4, -0.45, 0, Math.PI * 2);
      ctx.ellipse(5 + sw * 0.5, -5, 6.5, 4, 0.45, 0, Math.PI * 2);
      ctx.ellipse(sw, -9, 5.5, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }


  // ==================== 引力星轨仪地面引力场光环 ====================
  function drawOrreryField(ctx, prop, time) {
    const { x, y, fieldRadius, polarity, slingshotGlow } = prop;
    const R = fieldRadius || 215;
    const isAttract = polarity >= 0;
    const boost = slingshotGlow || 0;

    ctx.save();
    ctx.translate(x, y);

    // 1. 柔和通透水彩星轨场晕
    const grad = ctx.createRadialGradient(0, 0, 18, 0, 0, R);
    if (isAttract) {
      grad.addColorStop(0, `rgba(74, 188, 224, ${0.22 + boost * 0.14})`);
      grad.addColorStop(0.55, `rgba(98, 198, 232, ${0.09 + boost * 0.06})`);
      grad.addColorStop(1, 'rgba(98, 198, 232, 0)');
    } else {
      grad.addColorStop(0, `rgba(242, 146, 98, ${0.22 + boost * 0.14})`);
      grad.addColorStop(0.55, `rgba(246, 178, 118, ${0.09 + boost * 0.06})`);
      grad.addColorStop(1, 'rgba(246, 178, 118, 0)');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();

    // 2. 外圈旋转虚线星轨边界（清晰界定弯道生效半径）
    ctx.save();
    ctx.rotate(time * (isAttract ? 0.35 : -0.35));
    ctx.strokeStyle = isAttract
      ? `rgba(42, 148, 188, ${0.34 + boost * 0.28})`
      : `rgba(218, 108, 66, ${0.34 + boost * 0.28})`;
    ctx.lineWidth = 1.8 + boost * 0.8;
    ctx.setLineDash([10, 9]);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 3. 中圈辅助黄金星轨环
    ctx.strokeStyle = isAttract ? 'rgba(240, 198, 72, 0.26)' : 'rgba(240, 146, 72, 0.26)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.56, 0, Math.PI * 2);
    ctx.stroke();

    // 4. 动态向内(吸引)或向外(排斥)流动的细微星轨脉冲环 + 绕行微星点
    const flowPhase = (time * 0.55) % 1;
    const flowR = isAttract ? R * (1 - flowPhase * 0.82) : R * (0.18 + flowPhase * 0.82);
    const flowA = Math.sin(flowPhase * Math.PI) * 0.34;
    ctx.strokeStyle = isAttract ? `rgba(52, 186, 224, ${flowA})` : `rgba(236, 128, 74, ${flowA})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, flowR, 0, Math.PI * 2);
    ctx.stroke();

    // 4 颗慢速环绕星尘粒子
    for (let i = 0; i < 4; i++) {
      const a = time * (isAttract ? 0.9 : -0.9) + (i * Math.PI) / 2;
      const orbR = R * (0.56 + (i % 2) * 0.22);
      ctx.fillStyle = isAttract ? 'rgba(255, 232, 120, 0.72)' : 'rgba(255, 190, 130, 0.72)';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * orbR, Math.sin(a) * orbR, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ==================== 浮空星轨仪 3/4 本体 ====================
  function drawOrrery(ctx, prop, time) {
    const { x, y, r, height, polarity, hitFlash, pulse } = prop;
    const isAttract = polarity >= 0;
    const hover = Math.sin(time * 3.2 + x * 0.02) * 3.4;
    const sc = 1 + (pulse || 0) * 0.16;

    drawSoftShadow(ctx, x, y + 5, r * 1.15, r * 0.66, 0.24);

    ctx.save();
    ctx.translate(x, y);

    // 雕花花房白石底座
    ctx.fillStyle = '#c5d4c2';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.02, r * 0.66, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#edf4e8';
    ctx.beginPath();
    ctx.ellipse(0, -4, r * 0.8, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 底座极性小铭色圈
    ctx.strokeStyle = isAttract ? '#32a8cc' : '#e07248';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, -4, r * 0.52, r * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 悬浮旋转黄铜浑天仪星环 + 核心星珠
    ctx.save();
    ctx.translate(0, -height * 0.85 + hover);
    ctx.scale(sc, sc);

    // 外倾黄铜星环 1
    ctx.save();
    ctx.rotate(time * (isAttract ? 1.5 : -1.5));
    ctx.strokeStyle = '#d9a438';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 7.2, 0.35, 0, Math.PI * 2);
    ctx.stroke();
    // 环上附带一颗金色小卫星
    ctx.fillStyle = '#fff099';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(16, 2.5, 3.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 交叉黄铜星环 2
    ctx.save();
    ctx.rotate(-time * (isAttract ? 1.1 : -1.1));
    ctx.strokeStyle = '#f2cc66';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15.5, 6.2, -0.75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 中央浮空星核珠
    const orbGrad = ctx.createRadialGradient(-3, -3, 1.5, 0, 0, 10.5);
    if ((hitFlash || 0) > 0.18) {
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(1, '#ffe680');
    } else if (isAttract) {
      orbGrad.addColorStop(0, '#e0fbff');
      orbGrad.addColorStop(0.5, '#4ac8e8');
      orbGrad.addColorStop(1, '#246b94');
    } else {
      orbGrad.addColorStop(0, '#fff4cc');
      orbGrad.addColorStop(0.5, '#ff9852');
      orbGrad.addColorStop(1, '#c94c2e');
    }
    ctx.fillStyle = orbGrad;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 极性标识（+ 吸引 / - 排斥）
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-3.6, 0);
    ctx.lineTo(3.6, 0);
    if (isAttract) {
      ctx.moveTo(0, -3.6);
      ctx.lineTo(0, 3.6);
    }
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  // ==================== 活跃微型引力漩涡渲染（来自「引力漩涡核」） ====================
  function drawGravityVortex(ctx, v, time) {
    const sc = Math.min(1, v.grow);
    const fade = Math.min(1, v.life / 0.7);
    const R = v.radius * sc;

    ctx.save();
    ctx.translate(v.x, v.y);

    // 1. 柔和星渊蓝金水彩旋涡底晕
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, R);
    grad.addColorStop(0, `rgba(46, 152, 212, ${0.46 * fade})`);
    grad.addColorStop(0.42, `rgba(88, 198, 238, ${0.22 * fade})`);
    grad.addColorStop(0.78, `rgba(146, 224, 248, ${0.08 * fade})`);
    grad.addColorStop(1, 'rgba(146, 224, 248, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();

    // 2. 3 条手绘螺旋引力旋臂
    ctx.save();
    ctx.rotate(v.spin);
    for (let arm = 0; arm < 3; arm++) {
      const baseA = (arm * Math.PI * 2) / 3;
      ctx.strokeStyle = arm === 0
        ? `rgba(255, 226, 98, ${0.65 * fade})`
        : `rgba(54, 178, 224, ${0.58 * fade})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let s = 0; s <= 18; s++) {
        const t = s / 18;
        const rad = 7 + t * (R * 0.86);
        const ang = baseA + t * 2.55;
        const px = Math.cos(ang) * rad;
        const py = Math.sin(ang) * rad;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();

    // 3. 持续剩余时间进度外环
    const lifeFrac = Math.max(0, v.life / v.maxLife);
    ctx.strokeStyle = `rgba(42, 152, 198, ${0.5 * fade})`;
    ctx.lineWidth = 2.0;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.94, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lifeFrac);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. 漩涡中心星核奇点
    const coreR = 9 + Math.sin(time * 14) * 1.8 + (v.pulse || 0) * 5;
    ctx.fillStyle = `rgba(32, 92, 134, ${0.88 * fade})`;
    ctx.strokeStyle = `rgba(255, 232, 118, ${0.92 * fade})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 253, 235, ${0.9 * fade})`;
    ctx.beginPath();
    ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }


  // ==================== 低摩擦露水滑道渲染（晨露镜面冰滑带） ====================
  function drawDewSlide(ctx, slide, time) {
    const { x, y, w, h, orient, seed } = slide;
    const isH = orient === 'h' || w >= h;
    const r = Math.min(w, h) * 0.46;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 0. 嵌入地砖的浅石砌槽外框（让冰镜水道像真正镶嵌在地面的引水渠，零漂浮贴片感！）
    const palS = getPal();
    ctx.fillStyle = palS.isDark ? 'rgba(18, 28, 56, 0.46)' : 'rgba(104, 134, 128, 0.16)';
    ctx.beginPath();
    ctx.roundRect(x - 4, y - 3, w + 8, h + 7, r + 4);
    ctx.fill();

    ctx.strokeStyle = palS.isDark ? 'rgba(232, 198, 114, 0.32)' : 'rgba(92, 128, 122, 0.34)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(x - 3.5, y - 3, w + 7, h + 6, r + 3.5);
    ctx.stroke();

    const phase = slide.phase || 'ice';
    const electrified = (slide.electrifiedTimer || 0) > 0;

    // 1. 三态相变基底（冰镜 / 导电积水 / 沸腾隐身蒸汽）
    const grad = isH
      ? ctx.createLinearGradient(x, y, x, y + h)
      : ctx.createLinearGradient(x, y, x + w, y);
    if (phase === 'water') {
      grad.addColorStop(0, electrified ? 'rgba(116, 224, 255, 0.85)' : 'rgba(54, 152, 198, 0.72)');
      grad.addColorStop(0.5, electrified ? 'rgba(228, 250, 255, 0.88)' : 'rgba(84, 184, 224, 0.76)');
      grad.addColorStop(1, electrified ? 'rgba(116, 224, 255, 0.85)' : 'rgba(44, 134, 180, 0.72)');
    } else if (phase === 'steam') {
      grad.addColorStop(0, 'rgba(232, 248, 252, 0.68)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.82)');
      grad.addColorStop(1, 'rgba(224, 245, 250, 0.68)');
    } else {
      grad.addColorStop(0, 'rgba(104, 206, 234, 0.58)');
      grad.addColorStop(0.18, 'rgba(176, 238, 252, 0.64)');
      grad.addColorStop(0.55, 'rgba(226, 251, 255, 0.72)');
      grad.addColorStop(1, 'rgba(128, 222, 246, 0.58)');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();

    ctx.strokeStyle = phase === 'water'
      ? (electrified ? '#ffe45e' : 'rgba(34, 122, 168, 0.72)')
      : phase === 'steam'
      ? 'rgba(182, 220, 232, 0.75)'
      : 'rgba(48, 162, 196, 0.56)';
    ctx.lineWidth = electrified ? 2.8 : 1.9;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.stroke();

    if (phase === 'steam') {
      const count = Math.max(4, Math.floor(Math.max(w, h) / 48));
      for (let k = 0; k < count; k++) {
        const fx = isH ? x + ((k + 0.5) / count) * w : x + w * 0.5 + Math.sin(time * 3 + k) * 10;
        const fy = isH ? y + h * 0.5 + Math.cos(time * 3.4 + k) * 9 : y + ((k + 0.5) / count) * h;
        const pr = 14 + Math.sin(time * 4.5 + k * 1.7) * 4;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
        ctx.beginPath();
        ctx.arc(fx, fy - 4, pr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. 镜面斜向高光带与流动水膜波纹（裁剪在滑道内部）
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, w - 4, h - 4, Math.max(4, r - 2));
    ctx.clip();

    // 镜面玻璃斜向反光带
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    if (isH) {
      for (let gx = x + 28; gx < x + w - 10; gx += 78) {
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx + 22, y);
        ctx.lineTo(gx + 6, y + h);
        ctx.lineTo(gx - 16, y + h);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      for (let gy = y + 28; gy < y + h - 10; gy += 78) {
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(x + w, gy - 14);
        ctx.lineTo(x + w, gy + 8);
        ctx.lineTo(x, gy + 22);
        ctx.closePath();
        ctx.fill();
      }
    }

    // 双向顺滑箭头提示纹（极轻水彩白线，传达低摩擦双向滑行感）
    const pulse = 0.28 + 0.14 * Math.sin(time * 3.4 + (seed || 0));
    ctx.strokeStyle = `rgba(42, 156, 192, ${pulse})`;
    ctx.lineWidth = 2.0;
    if (isH) {
      const cy = y + h / 2;
      for (let ax = x + 48; ax < x + w - 42; ax += 64) {
        ctx.beginPath();
        ctx.moveTo(ax - 7, cy - 8);
        ctx.lineTo(ax + 3, cy);
        ctx.lineTo(ax - 7, cy + 8);
        ctx.stroke();
      }
    } else {
      const cx = x + w / 2;
      for (let ay = y + 48; ay < y + h - 42; ay += 64) {
        ctx.beginPath();
        ctx.moveTo(cx - 8, ay - 7);
        ctx.lineTo(cx, ay + 3);
        ctx.lineTo(cx + 8, ay - 7);
        ctx.stroke();
      }
    }

    ctx.restore();

    // 4. 滑道边缘点缀几颗晶莹小露珠
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.strokeStyle = 'rgba(56, 174, 206, 0.55)';
    ctx.lineWidth = 1.2;
    const beads = [
      { bx: x + 18, by: y + 7, br: 3.0 },
      { bx: x + w - 22, by: y + h - 8, br: 3.4 },
      { bx: x + w * 0.52, by: y + 6, br: 2.5 },
    ];
    for (const bd of beads) {
      ctx.beginPath();
      ctx.arc(bd.bx, bd.by, bd.br, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }


  // ==================== 云海崖边（低矮石边线 + 向下飘散云雾提示） ====================
  function drawCliffEdge(ctx, edge, time) {
    const { x, y, w, h, orient, outwardX, outwardY, kind, broken, seed } = edge;
    const pal = getPal();
    const st = CB.game && CB.game.map && CB.game.map.stage;
    const cid = getClimateId(st);
    const ink = pal.ink || INK;
    const isH = orient === 'h';

    // 低矮石边线贴在岛内侧边缘（明确留出外侧云海敞口）
    const curbThick = 10;
    let cx = x, cy = y, cw = w, ch = h;
    if (isH) {
      ch = curbThick;
      cy = outwardY > 0 ? y + 1 : y + h - curbThick - 1;
    } else {
      cw = curbThick;
      cx = outwardX > 0 ? x + 1 : x + w - curbThick - 1;
    }

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 1. 外侧柔和云雾飘散提示（严格按 8 套气候 climateId 配色，杜绝双法则串色）
    const cliffMistByClimate = {
      starry_night: ['rgba(130, 178, 255, 0.34)', 'rgba(255, 226, 126, 0.42)'],
      twilight_vine: ['rgba(170, 224, 206, 0.36)', 'rgba(255, 224, 128, 0.34)'],
      sunset_dome: ['rgba(255, 232, 198, 0.45)', 'rgba(255, 196, 152, 0.36)'],
      thunder_violet: ['rgba(132, 114, 208, 0.38)', 'rgba(124, 238, 255, 0.42)'],
      aurora_frost: ['rgba(218, 250, 255, 0.56)', 'rgba(120, 255, 214, 0.42)'],
      crystal_prism: ['rgba(255, 255, 255, 0.68)', 'rgba(255, 228, 126, 0.44)'],
      horizon_void: ['rgba(116, 86, 186, 0.36)', 'rgba(255, 212, 108, 0.42)'],
      day_lotus: ['rgba(255, 255, 255, 0.62)', 'rgba(148, 228, 248, 0.42)'],
    };
    const mistPair = cliffMistByClimate[cid] || cliffMistByClimate.day_lotus;
    const mistCol = mistPair[0];
    const mistAccent = mistPair[1];

    const span = isH ? w : h;
    const puffCount = Math.max(4, Math.floor(span / 76));
    for (let i = 0; i < puffCount; i++) {
      const frac = (i + 0.5) / puffCount;
      const phase = ((time * 0.42 + frac * 1.9 + (seed % 13) * 0.17) % 1);
      const driftOut = 8 + phase * 30;
      const driftDown = phase * 22;
      const alpha = Math.sin(phase * Math.PI) * (kind === 'open' || broken ? 0.92 : 0.48);
      const px = (isH ? x + w * frac : cx + cw * 0.5) + outwardX * driftOut + Math.sin(time * 1.6 + i) * 4;
      const py = (isH ? cy + ch * 0.5 : y + h * frac) + outwardY * driftOut + driftDown;
      const pr = 9 + (i % 3) * 4 + phase * 7;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = i % 2 === 0 ? mistCol : mistAccent;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. 精致低矮石边线（比实心墙低很多，视觉上一眼区分敞开云海崖口）
    ctx.fillStyle = pal.wallSide;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(cx, cy + 3, cw, ch, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = pal.wallTop;
    ctx.beginPath();
    ctx.roundRect(cx, cy, cw, ch, 3);
    ctx.fill();
    ctx.stroke();

    // 石边分缝纹理
    ctx.strokeStyle = pal.isDark ? 'rgba(244, 202, 98, 0.34)' : 'rgba(64, 102, 104, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (isH) {
      for (let bx = cx + 36; bx < cx + cw - 16; bx += 42) {
        ctx.moveTo(bx, cy + 1);
        ctx.lineTo(bx, cy + ch - 1);
      }
    } else {
      for (let by = cy + 36; by < cy + ch - 16; by += 42) {
        ctx.moveTo(cx + 1, by);
        ctx.lineTo(cx + cw - 1, by);
      }
    }
    ctx.stroke();

    // 3. 敞开崖口微光方向小标记（提示“可向此推落云海”）
    if (kind === 'open' || broken) {
      const midX = cx + cw / 2 + outwardX * 14;
      const midY = cy + ch / 2 + outwardY * 14;
      const bob = Math.sin(time * 3.2 + (seed || 0)) * 3;
      const chevX = midX + outwardX * bob;
      const chevY = midY + outwardY * bob;
      ctx.save();
      ctx.translate(chevX, chevY);
      ctx.rotate(Math.atan2(outwardY, outwardX));
      ctx.strokeStyle = pal.isDark ? 'rgba(255, 224, 120, 0.45)' : 'rgba(52, 148, 182, 0.42)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-4, -6);
      ctx.lineTo(3, 0);
      ctx.lineTo(-4, 6);
      ctx.stroke();
      ctx.restore();
    }

    // 4. 若是已撞碎的木质花栏，在两端保留精致断木残桩
    if (kind === 'railing' && broken) {
      const woodColor = theme === 'gravity' ? '#6376a8' : theme === 'stealth' ? '#7a6852' : '#b8824c';
      ctx.fillStyle = woodColor;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.6;
      const drawStub = (sx, sy) => {
        ctx.beginPath();
        ctx.moveTo(sx - 5, sy + 2);
        ctx.lineTo(sx - 4, sy - 11);
        ctx.lineTo(sx + 1, sy - 7);
        ctx.lineTo(sx + 5, sy - 13);
        ctx.lineTo(sx + 5, sy + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };
      if (isH) {
        drawStub(cx + 14, cy + ch * 0.5);
        drawStub(cx + cw - 14, cy + ch * 0.5);
      } else {
        drawStub(cx + cw * 0.5, cy + 14);
        drawStub(cx + cw * 0.5, cy + ch - 14);
      }
    }

    ctx.restore();
  }

  // ==================== 易碎木质花栏（一撞就碎，露出云海崖口） ====================
  function drawRailing(ctx, edge, time) {
    if (edge.kind !== 'railing' || edge.broken) return;
    const { x, y, w, h, orient, outwardX, outwardY, height, hitFlash, wobble, hp, maxHp, seed } = edge;
    const pal = getPal();
    const st = CB.game && CB.game.map && CB.game.map.stage;
    const cid = getClimateId(st);
    const ink = pal.ink || INK;
    const isH = orient === 'h';

    const railPalByClimate = {
      starry_night: ['#6e7da8', '#98aad6', '#ffe066', '#6cb2d8'],
      twilight_vine: ['#8a7254', '#ad926f', '#ffbe55', '#52a36e'],
      sunset_dome: ['#c98862', '#ebba8c', '#ffd866', '#64bd7a'],
      thunder_violet: ['#665b94', '#8e82bd', '#7ceeff', '#5ea6c9'],
      aurora_frost: ['#7eaec2', '#b5dfed', '#78ffd6', '#5ec4b8'],
      crystal_prism: ['#d4b483', '#f2dbb3', '#ffe270', '#6ec992'],
      horizon_void: ['#5a4d7d', '#8675ad', '#ffd464', '#9e7ce0'],
      day_lotus: ['#c9935a', '#e8bd86', '#ff9eb5', '#64bd7a'],
    };
    const [woodMain, woodLight, bloomCol, leafCol] = railPalByClimate[cid] || railPalByClimate.day_lotus;

    const shake = wobble > 0 ? Math.sin(time * 78) * wobble * 3.2 : 0;
    const railH = height || 22;

    ctx.save();
    ctx.translate(isH ? 0 : shake, isH ? shake : 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const flash = hitFlash > 0.15;

    if (isH) {
      const baseY = outwardY > 0 ? y + 6 : y + h - 6;
      const postCount = Math.max(4, Math.floor(w / 62));

      // 细木立柱（镂空设计，一眼可见后方云海！）
      for (let i = 0; i <= postCount; i++) {
        const px = x + 10 + ((w - 20) * i) / postCount;
        ctx.fillStyle = flash ? '#fff6dd' : woodMain;
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.roundRect(px - 3.5, baseY - railH, 7, railH, 2.5);
        ctx.fill();
        ctx.stroke();
      }

      // 上下两条横木花栏杆
      [baseY - railH + 3, baseY - railH * 0.42].forEach((ry, idx) => {
        ctx.fillStyle = flash ? '#fff9e8' : (idx === 0 ? woodLight : woodMain);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(x + 2, ry - 3, w - 4, 6.2, 3);
        ctx.fill();
        ctx.stroke();
      });

      // 缠绕小花藤与花朵点缀
      const blooms = Math.max(3, Math.floor(w / 95));
      for (let i = 0; i < blooms; i++) {
        const bx = x + ((i + 0.5) / blooms) * w;
        const by = baseY - railH + 5 + Math.sin((seed || 1) + i * 2.1) * 3;
        ctx.fillStyle = leafCol;
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(bx - 5, by + 2, 5.2, 3.0, -0.35, 0, Math.PI * 2);
        ctx.ellipse(bx + 5, by + 2, 5.2, 3.0, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = bloomCol;
        ctx.beginPath();
        ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const baseX = outwardX > 0 ? x + 6 : x + w - 6;
      const postCount = Math.max(4, Math.floor(h / 58));

      // 纵向镂空木花栏：立柱 + 双纵木栏杆
      for (let i = 0; i <= postCount; i++) {
        const py = y + 10 + ((h - 20) * i) / postCount;
        ctx.fillStyle = flash ? '#fff6dd' : woodMain;
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.roundRect(baseX - 3.5, py - railH * 0.72, 7, railH * 0.78, 2.5);
        ctx.fill();
        ctx.stroke();
      }

      // 顶部栏杆扶手条
      ctx.fillStyle = flash ? '#fff9e8' : woodLight;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(baseX - 3.5, y + 2 - railH * 0.72, 7, h - 4, 3);
      ctx.fill();
      ctx.stroke();

      // 中段细横条
      ctx.fillStyle = flash ? '#fff6dd' : woodMain;
      ctx.beginPath();
      ctx.roundRect(baseX - 2.5, y + 4 - railH * 0.32, 5, h - 8, 2);
      ctx.fill();
      ctx.stroke();

      // 花藤点缀
      const blooms = Math.max(3, Math.floor(h / 88));
      for (let i = 0; i < blooms; i++) {
        const by = y + ((i + 0.5) / blooms) * h - railH * 0.68;
        ctx.fillStyle = leafCol;
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(baseX - 3, by - 4, 3.2, 4.8, 0.3, 0, Math.PI * 2);
        ctx.ellipse(baseX + 3, by + 4, 3.2, 4.8, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = bloomCol;
        ctx.beginPath();
        ctx.arc(baseX, by, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 受损木裂纹提示
    if (hp < maxHp) {
      const mx = x + w / 2;
      const my = y + h / 2 - railH * 0.5;
      ctx.strokeStyle = '#3b2416';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(mx - 10, my - 5);
      ctx.lineTo(mx, my + 2);
      ctx.lineTo(mx + 9, my - 4);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawFallingCrate(ctx, fc) {
    const pal = getPal();
    const ink = pal.ink || INK;
    const alpha = Math.max(0, Math.min(1, (fc.life / fc.maxLife) * 1.4));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(fc.x, fc.y);
    ctx.rotate(fc.angle);
    ctx.scale(fc.scale, fc.scale);
    ctx.fillStyle = '#d8aa70';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.roundRect(-fc.w / 2, -fc.h / 2, fc.w, fc.h, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }


  function drawDormantOrb(ctx, orb, time) {
    const hover = Math.sin(time * 5.2 + orb.phase) * 3.5;
    const drawY = orb.y - orb.z - 9 + hover;
    const fade = orb.life < 1.4 ? Math.max(0.25, Math.abs(Math.sin(time * 16))) : 1;

    drawSoftShadow(ctx, orb.x, orb.y + 3, 9.5, 5.2, 0.2 * fade);

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(orb.x, drawY);

    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
    g.addColorStop(0, 'rgba(128, 236, 255, 0.78)');
    g.addColorStop(1, 'rgba(128, 236, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();

    const frac = Math.max(0, orb.life / orb.maxLife);
    ctx.strokeStyle = 'rgba(46, 178, 212, 0.65)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, 11.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();

    ctx.fillStyle = '#72e4fa';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.arc(0, 0, 7.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2.3, -2.3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawOrbReturnFly(ctx, f) {
    const col = f.isOverclock ? '#ffe052' : '#74e8ff';
    ctx.save();
    const g = ctx.createRadialGradient(f.x, f.y, 1, f.x, f.y, 15);
    g.addColorStop(0, f.isOverclock ? 'rgba(255, 240, 130, 0.95)' : 'rgba(120, 236, 255, 0.95)');
    g.addColorStop(1, 'rgba(120, 236, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = col;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.isOverclock ? 6.2 : 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }


  // ==================== v9.1 黑洞奇点时间膨胀场 & 空间折叠虫洞环渲染 ====================
  function drawSingularityField(ctx, prop, time) {
    const { x, y, fieldRadius, activeTimer, maxDuration, cooldown } = prop;
    const R = fieldRadius || 195;
    const isActive = (activeTimer || 0) > 0;

    ctx.save();
    ctx.translate(x, y);

    if (isActive) {
      const pct = Math.max(0, Math.min(1, activeTimer / (maxDuration || 3.6)));
      const pulse = 1 + Math.sin(time * 5.5) * 0.03;

      const g = ctx.createRadialGradient(0, 0, 18, 0, 0, R * pulse);
      g.addColorStop(0, 'rgba(92, 42, 168, 0.34)');
      g.addColorStop(0.65, 'rgba(138, 86, 232, 0.16)');
      g.addColorStop(1, 'rgba(138, 86, 232, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, R * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.rotate(time * 0.14);
      ctx.strokeStyle = 'rgba(182, 134, 255, 0.58)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        const inner = i % 3 === 0 ? R - 13 : R - 7;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = pct < 0.25 ? '#ff7c6e' : '#ffe066';
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.arc(0, 0, R + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.stroke();
    } else {
      ctx.strokeStyle = (cooldown || 0) > 0 ? 'rgba(130, 120, 160, 0.22)' : 'rgba(148, 102, 236, 0.32)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  function drawSingularity(ctx, prop, time) {
    const { x, y, r, activeTimer, cooldown, spin, hitFlash, pulse } = prop;
    const isActive = (activeTimer || 0) > 0;
    const hover = Math.sin(time * 3.0 + x * 0.02) * 3.2;
    const sc = 1 + (pulse || 0) * 0.2 + (isActive ? 0.14 : 0);

    drawSoftShadow(ctx, x, y + 6, r * 1.1, r * 0.6, 0.26);

    ctx.save();
    ctx.translate(x, y - 20 + hover);
    ctx.scale(sc, sc);

    ctx.save();
    ctx.rotate(spin || time * 1.8);
    const diskGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 26);
    diskGrad.addColorStop(0, 'rgba(255, 232, 138, 0.85)');
    diskGrad.addColorStop(0.55, isActive ? 'rgba(164, 104, 255, 0.72)' : 'rgba(128, 86, 212, 0.45)');
    diskGrad.addColorStop(1, 'rgba(128, 86, 212, 0)');
    ctx.fillStyle = diskGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 11, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isActive ? '#ffe478' : 'rgba(196, 152, 255, 0.75)';
    ctx.lineWidth = isActive ? 2.4 : 1.7;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 8.5, 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = (hitFlash || 0) > 0.2 ? '#ffffff' : ((cooldown || 0) > 0 ? '#3a3454' : '#120c24');
    ctx.strokeStyle = isActive ? '#ffe066' : '#b78cff';
    ctx.lineWidth = isActive ? 2.8 : 2.1;
    ctx.beginPath();
    ctx.arc(0, 0, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isActive ? '#ffe066' : '#d4b8ff';
    ctx.beginPath();
    ctx.arc(-3, -3, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawWormholeLinks(ctx, map, time) {
    if (!map || !map.props) return;
    if (!map._wormholePairs) {
      const byId = Object.create(null);
      const cached = [];
      for (let i = 0; i < map.props.length; i++) {
        const p = map.props[i];
        if (p.type !== 'wormhole') continue;
        if (!byId[p.pairId]) {
          byId[p.pairId] = p;
        } else {
          cached.push([byId[p.pairId], p]);
        }
      }
      map._wormholePairs = cached;
    }
    const pairList = map._wormholePairs;
    if (!pairList.length) return;

    ctx.save();
    for (let i = 0; i < pairList.length; i++) {
      const pair = pairList[i];
      const a = pair[0];
      const b = pair[1];
      if (a.broken || b.broken) continue;
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5 - 24;
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, 'rgba(70, 216, 247, 0.28)');
      grad.addColorStop(1, 'rgba(196, 124, 255, 0.28)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.4;
      ctx.setLineDash([8, 9]);
      ctx.lineDashOffset = -(time * 28);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawWormhole(ctx, prop, time) {
    const { x, y, r, portalSide, color, spin, pulse } = prop;
    const sc = 1 + (pulse || 0) * 0.22;
    const isA = portalSide === 'A';
    const col = color || (isA ? '#46d8f7' : '#c47cff');

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);

    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, r * 1.45);
    g.addColorStop(0, isA ? 'rgba(70, 216, 247, 0.55)' : 'rgba(196, 124, 255, 0.55)');
    g.addColorStop(0.65, isA ? 'rgba(70, 216, 247, 0.18)' : 'rgba(196, 124, 255, 0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isA ? '#12384f' : '#2a1647';
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.rotate(spin || time * (isA ? 3 : -3));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.54, a, a + 0.95);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  CB.brush = {
    createPaperPattern,
    drawSoftShadow,
    drawWallBlock,
    drawCliffEdge,
    drawRailing,
    drawFallingCrate,
    drawCornerPost,
    drawProp,
    drawDewSlide,
    drawOrreryField,
    drawSingularityField,
    drawWormholeLinks,
    drawGravityVortex,
    drawInkPuddle,
    drawPollenCloud,
    drawVineGate,
    drawGroundDecor,
    drawEdgeDecor,
    drawSoundRipple,
    drawAimPreview,
    drawBullet,
    drawEnemyBullet,
    drawCoin,
    drawCurioDrop,
    drawDormantOrb,
    drawOrbReturnFly,
    drawInteractPrompt,
  };
})();
