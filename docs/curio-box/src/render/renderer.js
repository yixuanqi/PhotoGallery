(() => {
  const CB = window.CB;
  const game = CB.game;
  const {
    drawWallBlock,
    drawCliffEdge,
    drawRailing,
    drawFallingCrate,
    drawCornerPost,
    drawProp,
    drawDewSlide,
    drawOrreryField,
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
    drawInteractPrompt,
  } = CB.brush;
  const { drawMochiPlayer } = CB.drawPlayer;
  const { drawGuardFloorAura, drawGuardBody, drawFallingGuard } = CB.guards;

  const INK = '#2e4a52';
  let paperPattern = null;
  let fogCanvas = null;
  let fogCtx = null;

  function fogHash(x, y, k = 0) {
    const s = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453;
    return s - Math.floor(s);
  }

  const SKY_CLOUDS = Array.from({ length: 14 }, (_, i) => ({
    x: (i * 237) % 1600,
    y: 40 + ((i * 151) % 780),
    scale: 0.72 + (i % 4) * 0.28,
    speed: 6 + (i % 3) * 5,
    layer: i < 7 ? 0 : 1,
    seed: i * 19 + 7,
  }));

  const DISTANT_ISLES = [
    { x: 180, y: 150, s: 0.75, speed: 0.04 },
    { x: 1120, y: 220, s: 0.9, speed: 0.05 },
    { x: 640, y: 690, s: 0.65, speed: 0.035 },
  ];

  const POLLEN_MOTES = Array.from({ length: 26 }, (_, i) => ({
    x: (i * 193) % 1600,
    y: (i * 127) % 900,
    r: 1.6 + (i % 3) * 0.9,
    speedX: 10 + (i % 4) * 5,
    phase: i * 1.3,
  }));

  // 预生成星象天文台繁星、星座连线与暮光萤火虫
  const NIGHT_STARS = Array.from({ length: 110 }, (_, i) => ({
    x: (i * 173 + (i % 7) * 53) % 1800,
    y: (i * 113 + (i % 5) * 41) % 1000,
    r: 0.9 + (i % 4) * 0.65,
    twinkle: 1.5 + (i % 5) * 0.7,
    phase: i * 1.17,
    gold: i % 5 === 0,
  }));

  const CONSTELLATIONS = [
    { cx: 340, cy: 240, pts: [[-55, -20], [-10, -48], [38, -16], [62, 28], [4, 42], [-42, 16]] },
    { cx: 1120, cy: 280, pts: [[-60, 10], [-18, -32], [28, -40], [58, -6], [22, 34]] },
    { cx: 740, cy: 640, pts: [[-46, -24], [0, -8], [48, -30], [34, 24], [-22, 36]] },
  ];

  const FIREFLIES = Array.from({ length: 34 }, (_, i) => ({
    x: (i * 197) % 1700,
    y: (i * 131) % 940,
    phase: i * 1.7,
    speed: 12 + (i % 4) * 6,
    r: 2.0 + (i % 3) * 0.9,
  }));

  function initRenderer(ctx) {
    paperPattern = CB.brush.createPaperPattern(ctx);
  }

  function refreshStageTheme(ctx, stage) {
    paperPattern = CB.brush.createPaperPattern(ctx, stage);
    if (stage && stage.palette) {
      document.body.style.background = stage.palette.bodyBg || '#8fd0f0';
      const mini = document.getElementById('minimapCanvas');
      if (mini && stage.palette.miniBg) {
        mini.style.background = stage.palette.miniBg;
      }
    }
  }

  function renderWorld(ctx) {
    const {
      viewW,
      viewH,
      camera,
      map,
      player,
      particles,
      footprints,
      popups,
      inkPuddles,
      pollenClouds,
      vortices,
      ripples,
      bullets,
      enemyBullets,
      coinsList,
      curioDrops,
      guards,
      fallingGuards,
      fallingCrates,
      butterflies,
      interactHint,
      time,
    } = game;
    if (!map) return;

    const sx = (Math.random() - 0.5) * camera.shake * 2;
    const sy = (Math.random() - 0.5) * camera.shake * 2;

    // 1. 明快水彩云海晴空背景
    drawSkyBackdrop(ctx, viewW, viewH, camera, time);

    ctx.save();
    ctx.translate(viewW / 2 + sx, viewH / 2 + sy);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // 1.4. 向北坠入云海的守卫/木箱（位于浮岛后方，自然下沉消失于云海！）
    if (fallingCrates) {
      for (const fc of fallingCrates) {
        if (fc.outwardY < 0) drawFallingCrate(ctx, fc);
      }
    }
    if (fallingGuards) {
      for (const fg of fallingGuards) {
        if (fg.outwardY < 0) drawFallingGuard(ctx, fg, time);
      }
    }

    // 1.5. 按细胞精确绘制浮岛悬崖底座与垂藤（支持非矩形 L 型花廊！）
    for (const room of map.rooms) {
      drawIslandUnderside(ctx, room, map, time);
    }

    // 2. 绘制每个房间的阳光石灰石地砖、3 大生态区分色与职能地标
    for (const room of map.rooms) {
      drawRoomFloor(ctx, room, map, time);
    }

    // 2.2. 云海崖边低矮石边线与向下飘散云雾提示
    if (map.cliffEdges) {
      for (const edge of map.cliffEdges) {
        drawCliffEdge(ctx, edge, time);
      }
    }

    // 2.4. 贴地肌理层（柔和青苔晕染、对齐砖格色差石板、有机荷塘洼、落英、摇曳草丛）
    if (map.groundDecors) {
      for (const d of map.groundDecors) {
        drawGroundDecor(ctx, d, time);
      }
    }

    // 2.5. 嵌入式低摩擦露水冰镜滑道（始终位于贴地肌理之上，零遮挡叠压）
    if (map.dewSlides) {
      for (const slide of map.dewSlides) {
        drawDewSlide(ctx, slide, time);
      }
    }

    // 2.8. 藤蔓花闸 <-> 向日葵花盘地面发光藤蔓导管（一眼看清机关联动关系！）
    if (map.vineGates) {
      for (const gate of map.vineGates) {
        drawGateConduit(ctx, gate, time);
      }
    }

    // 3. 绘制连接石桥/云海木桥门槛
    for (const door of map.doorways) {
      drawDoorwayThreshold(ctx, door);
    }

    // 3.4. 浮空星轨仪引力/斥力场光环与活跃引力漩涡
    for (const prop of map.props) {
      if (prop.type === 'orrery') {
        drawOrreryField(ctx, prop, time);
      }
    }
    if (vortices) {
      for (const v of vortices) {
        drawGravityVortex(ctx, v, time);
      }
    }

    // 3.5. 地面水彩秘露减速池
    for (const ink of inkPuddles) {
      drawInkPuddle(ctx, ink);
    }

    // 3.6. 守卫视野锥、冲锋预警通道与风铃吸金磁场
    for (const g of guards) {
      drawGuardFloorAura(ctx, g, time);
    }

    // 3.7. 声波涟漪扩散警戒环
    for (const r of ripples) {
      drawSoundRipple(ctx, r);
    }

    // 4. 跑动小脚印
    for (const fp of footprints) {
      const a = (fp.life / fp.maxLife) * (fp.color ? 0.54 : 0.22);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = fp.color || '#6a8e8a';
      ctx.beginPath();
      ctx.ellipse(fp.x, fp.y, fp.r * 1.2, fp.r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4.5. 1 次墙面折射预判线 + 日光折射棱镜双光束预判
    if (!game.mapOverview && !game.titleOpen && !game.paused && !game.input.aimCancelHover && game.run.phase === 'playing' && CB.combat) {
      const preview = CB.combat.computeAimPreview();
      drawAimPreview(ctx, preview, time);
    }

    // 5. 统一 Y 轴深度排序（墙体、角柱、藤蔓花闸、沿墙园艺装饰、家具机关、金币、奇物、守卫、主角、热气球）
    const drawList = [];
    for (const w of map.walls) {
      drawList.push({ sortY: w.y + w.h, draw: () => drawWallBlock(ctx, w) });
    }
    if (map.cliffEdges) {
      for (const edge of map.cliffEdges) {
        if (edge.kind === 'railing' && !edge.broken) {
          drawList.push({ sortY: edge.y + edge.h, draw: () => drawRailing(ctx, edge, time) });
        }
      }
    }
    for (const post of map.posts) {
      drawList.push({ sortY: post.y + post.h + 1, draw: () => drawCornerPost(ctx, post) });
    }
    if (map.vineGates) {
      for (const gate of map.vineGates) {
        if ((gate.openAnim || 0) < 0.98) {
          drawList.push({ sortY: gate.y + gate.h + 2, draw: () => drawVineGate(ctx, gate, time) });
        }
      }
    }
    if (map.edgeDecors) {
      for (const ed of map.edgeDecors) {
        drawList.push({ sortY: ed.y + 4, draw: () => drawEdgeDecor(ctx, ed, time) });
      }
    }
    for (const prop of map.props) {
      if (prop.broken) continue;
      const syProp = prop.shape === 'circle' ? prop.y + prop.r * 0.7 : prop.y + prop.h;
      drawList.push({ sortY: syProp, draw: () => drawProp(ctx, prop, time) });
    }
    for (const c of coinsList) {
      drawList.push({ sortY: c.y, draw: () => drawCoin(ctx, c) });
    }
    for (const cd of curioDrops) {
      drawList.push({ sortY: cd.y + 2, draw: () => drawCurioDrop(ctx, cd, time) });
    }
    for (const g of guards) {
      if (g.dead) continue;
      drawList.push({ sortY: g.y + 3, draw: () => drawGuardBody(ctx, g, time) });
    }
    drawList.push({
      sortY: player.y + 4,
      draw: () => drawMochiPlayer(ctx, player, time, game.variant, 0, 0),
    });

    const extRoom = map.rooms[map.extractRoomId];
    if (extRoom) {
      const bx = extRoom.x + extRoom.w / 2;
      const by = extRoom.y + extRoom.h / 2;
      drawList.push({
        sortY: by - 46,
        draw: () => drawExtractBalloon(ctx, bx, by, time),
      });
    }

    drawList.sort((a, b) => a.sortY - b.sortY);
    for (const item of drawList) item.draw();

    // 5.2. 向南/东/西坠入云海的守卫与木箱（旋转缩小坠落演出）
    if (fallingCrates) {
      for (const fc of fallingCrates) {
        if (fc.outwardY >= 0) drawFallingCrate(ctx, fc);
      }
    }
    if (fallingGuards) {
      for (const fg of fallingGuards) {
        if (fg.outwardY >= 0) drawFallingGuard(ctx, fg, time);
      }
    }

    // 5.4. 金色花粉隐身雾（半透明轻覆于角色之上，营造钻入花雾的沉浸包裹感）
    for (const pc of pollenClouds) {
      drawPollenCloud(ctx, pc, time);
    }

    // 5.5. 弹射子弹、棱镜光束、守卫弹丸与打击火花粒子
    for (const b of bullets) drawBullet(ctx, b);
    for (const eb of enemyBullets) drawEnemyBullet(ctx, eb);
    for (const pt of particles) {
      const a = Math.max(0, pt.life / pt.maxLife);
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 5.6. 热气球撤离「高空阵风」世界空间水彩风带流线
    drawExtractionGustWorld(ctx, map, time);

    // 5.7. 高空温室前景层：极轻半透明玻璃顶棚投影 + 飞舞小白蝶
    drawOverheadGreenhouseCanopy(ctx, map, time);
    if (butterflies) {
      for (const bf of butterflies) {
        drawButterfly(ctx, bf, time);
      }
    }

    // 6. 整片无缝融合的宫崎骏水彩云海战争迷雾（告别方块贴片与印章重复）
    if (game.showFog && !game.titleOpen) {
      drawUnifiedCloudFog(ctx, map, time, viewW, viewH, camera, sx, sy);
    }

    // 6.5. 浮空交互气泡 [E]
    if (interactHint && game.run.phase === 'playing' && !game.mapOverview && !game.titleOpen && !game.paused) {
      drawInteractPrompt(ctx, interactHint, time);
    }

    // 7. 房间标题、暴击数字与弹射飘字反馈
    for (const pop of popups) {
      const a = Math.min(1, pop.life / (pop.maxLife * 0.4));
      const rise = (1 - pop.life / pop.maxLife) * 30;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = '700 14.5px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(255, 253, 248, 0.95)';
      ctx.lineWidth = 4;
      ctx.strokeText(pop.text, pop.x, pop.y - rise);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y - rise);
      ctx.restore();
    }

    ctx.restore();

    // 8. 屏幕空间柔和日光浮尘 + 关卡开场水彩横幅 + 警报晕边 + 边缘罗盘方向指针
    drawSunbeamAndPollen(ctx, viewW, viewH, time);
    if (game.run.phase === 'playing' && !game.titleOpen) {
      drawAlarmVignette(ctx, viewW, viewH, time);
      if (!game.mapOverview) {
        drawOffscreenCompass(ctx, viewW, viewH, time);
      }
      drawExtractionGustBanner(ctx, viewW, time);
      if (game.stageBannerTimer > 0 && map.stage) {
        drawStageEntryBanner(ctx, viewW, map.stage, game.stageBannerTimer);
      }
    }
  }

  // ==================== 四大关卡专属天空奇观背景 ====================
  function drawSkyBackdrop(ctx, W, H, camera, time) {
    const stage = game.map && game.map.stage ? game.map.stage : null;
    const skyType = (stage && stage.skyType) || 'day_clouds';
    const cols = (stage && stage.skyColors) ? stage.skyColors : ['#54b2e6', '#9fdcf7', '#eafbff'];

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, cols[0]);
    sky.addColorStop(0.52, cols[1]);
    sky.addColorStop(1, cols[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    if (skyType === 'starry_night') {
      // ===== 第 2 关：深蓝星夜天文台（银河星云 + 闪烁繁星 + 旋转黄金星座连线） =====
      const neb1 = ctx.createRadialGradient(W * 0.25, H * 0.28, 20, W * 0.25, H * 0.28, W * 0.45);
      neb1.addColorStop(0, 'rgba(116, 86, 204, 0.26)');
      neb1.addColorStop(0.55, 'rgba(64, 122, 212, 0.14)');
      neb1.addColorStop(1, 'rgba(20, 34, 72, 0)');
      ctx.fillStyle = neb1;
      ctx.fillRect(0, 0, W, H);

      const neb2 = ctx.createRadialGradient(W * 0.78, H * 0.68, 20, W * 0.78, H * 0.68, W * 0.42);
      neb2.addColorStop(0, 'rgba(62, 168, 214, 0.22)');
      neb2.addColorStop(1, 'rgba(20, 34, 72, 0)');
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, W, H);

      // 闪烁繁星（带轻微视差）
      for (const st of NIGHT_STARS) {
        const wrapW = W + 120;
        const wrapH = H + 120;
        const sx = ((st.x - camera.x * 0.04) % wrapW + wrapW) % wrapW - 60;
        const sy = ((st.y - camera.y * 0.04) % wrapH + wrapH) % wrapH - 60;
        const alpha = 0.35 + 0.65 * Math.abs(Math.sin(time * st.twinkle + st.phase));
        ctx.fillStyle = st.gold ? `rgba(255, 228, 124, ${alpha})` : `rgba(220, 240, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, st.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 黄金星象星座连线
      ctx.save();
      for (const con of CONSTELLATIONS) {
        const wrapW = W + 260;
        const wrapH = H + 200;
        const ox = ((con.cx - camera.x * 0.06) % wrapW + wrapW) % wrapW - 130;
        const oy = ((con.cy - camera.y * 0.06) % wrapH + wrapH) % wrapH - 100;
        ctx.strokeStyle = 'rgba(246, 208, 114, 0.24)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        con.pts.forEach(([px, py], idx) => {
          if (idx === 0) ctx.moveTo(ox + px, oy + py);
          else ctx.lineTo(ox + px, oy + py);
        });
        ctx.stroke();

        for (const [px, py] of con.pts) {
          ctx.fillStyle = 'rgba(255, 232, 146, 0.72)';
          ctx.beginPath();
          ctx.arc(ox + px, oy + py, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // 淡蓝星夜低云
      for (const c of SKY_CLOUDS) {
        if (c.layer === 0) continue;
        const wrapW = W + 420;
        const wrapH = H + 260;
        const cx = ((c.x + time * c.speed * 0.6 - camera.x * 0.12) % wrapW + wrapW) % wrapW - 210;
        const cy = ((c.y - camera.y * 0.12) % wrapH + wrapH) % wrapH - 130;
        drawWatercolorCloud(ctx, cx, cy, c.scale * 0.9, 0.24, '#1b2b54', '#384f8a');
      }
      return;
    }

    if (skyType === 'twilight_forest') {
      // ===== 第 3 关：暮光古藤雾林（暖琥珀微光 + 幽绿森雾 + 飘飞暖金萤火虫） =====
      const glow = ctx.createRadialGradient(W * 0.5, H * 0.85, 20, W * 0.5, H * 0.85, W * 0.65);
      glow.addColorStop(0, 'rgba(255, 212, 128, 0.26)');
      glow.addColorStop(1, 'rgba(32, 74, 72, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      for (const c of SKY_CLOUDS) {
        const parallax = c.layer === 0 ? 0.07 : 0.14;
        const wrapW = W + 420;
        const wrapH = H + 260;
        const cx = ((c.x + time * c.speed * 0.5 - camera.x * parallax) % wrapW + wrapW) % wrapW - 210;
        const cy = ((c.y - camera.y * parallax) % wrapH + wrapH) % wrapH - 130;
        drawWatercolorCloud(ctx, cx, cy, c.scale, c.layer === 0 ? 0.34 : 0.48, '#2d5c5a', '#6fa394');
      }

      // 飘飞暖金萤火虫光点
      for (const ff of FIREFLIES) {
        const wrapW = W + 80;
        const wrapH = H + 80;
        const fx = ((ff.x + time * ff.speed - camera.x * 0.08) % wrapW + wrapW) % wrapW - 40;
        const fy = ((ff.y + Math.sin(time * 1.9 + ff.phase) * 32 - camera.y * 0.08) % wrapH + wrapH) % wrapH - 40;
        const a = 0.25 + 0.7 * Math.abs(Math.sin(time * 2.4 + ff.phase));
        const g = ctx.createRadialGradient(fx, fy, 0.5, fx, fy, ff.r * 4.2);
        g.addColorStop(0, `rgba(255, 232, 118, ${a})`);
        g.addColorStop(1, 'rgba(255, 212, 82, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(fx, fy, ff.r * 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    // ===== 第 1 关（晴昼云海） & 第 4 关（金粉晚霞云海） =====
    const isSunset = skyType === 'sunset_clouds';
    const sunGrad = ctx.createRadialGradient(
      W * (isSunset ? 0.82 : 0.14),
      H * (isSunset ? 0.18 : 0.12),
      18,
      W * (isSunset ? 0.82 : 0.14),
      H * (isSunset ? 0.18 : 0.12),
      Math.max(W, H) * 0.58
    );
    sunGrad.addColorStop(0, isSunset ? 'rgba(255, 234, 152, 0.72)' : 'rgba(255, 252, 224, 0.62)');
    sunGrad.addColorStop(0.38, isSunset ? 'rgba(255, 168, 134, 0.26)' : 'rgba(255, 246, 206, 0.18)');
    sunGrad.addColorStop(1, 'rgba(255, 246, 206, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, W, H);

    for (const isle of DISTANT_ISLES) {
      const wrapW = W + 320;
      const ix = ((isle.x - camera.x * isle.speed) % wrapW + wrapW) % wrapW - 160;
      const iy = ((isle.y - camera.y * isle.speed) % (H + 200) + (H + 200)) % (H + 200) - 100;
      const bob = Math.sin(time * 0.7 + isle.x) * 4;
      const s = isle.s;

      ctx.save();
      ctx.translate(ix, iy + bob);
      ctx.scale(s, s);
      ctx.globalAlpha = 0.42;

      ctx.fillStyle = isSunset ? '#9e7088' : '#7dbad6';
      ctx.beginPath();
      ctx.moveTo(-48, 0); ctx.lineTo(48, 0); ctx.lineTo(24, 34); ctx.lineTo(-4, 46); ctx.lineTo(-32, 26);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = isSunset ? '#c9888e' : '#8cc9b8';
      ctx.beginPath();
      ctx.ellipse(0, -1, 50, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-16, -15, 13, 0, Math.PI * 2);
      ctx.arc(4, -18, 16, 0, Math.PI * 2);
      ctx.arc(22, -13, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const c of SKY_CLOUDS) {
      const parallax = c.layer === 0 ? 0.08 : 0.16;
      const wrapW = W + 420;
      const wrapH = H + 260;
      const cx = ((c.x + time * c.speed - camera.x * parallax) % wrapW + wrapW) % wrapW - 210;
      const cy = ((c.y - camera.y * parallax) % wrapH + wrapH) % wrapH - 130;
      drawWatercolorCloud(
        ctx,
        cx,
        cy,
        c.scale,
        c.layer === 0 ? 0.56 : 0.84,
        isSunset ? '#d699a8' : '#cae8f7',
        isSunset ? '#fff2d8' : '#f9fdff'
      );
    }
  }

  function drawWatercolorCloud(ctx, x, y, scale, alpha, shadeColor = '#cae8f7', topColor = '#f9fdff') {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    ctx.fillStyle = shadeColor;
    ctx.beginPath();
    ctx.arc(-44, 14, 34, 0, Math.PI * 2);
    ctx.arc(4, 18, 42, 0, Math.PI * 2);
    ctx.arc(52, 14, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.arc(-50, 4, 32, 0, Math.PI * 2);
    ctx.arc(-14, -12, 44, 0, Math.PI * 2);
    ctx.arc(30, -6, 38, 0, Math.PI * 2);
    ctx.arc(62, 6, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ==================== 按格绘制浮岛岩崖底座与垂藤（支持 L 型异形房） ====================
  function drawIslandUnderside(ctx, room, map, time) {
    if (game.showFog && !game.titleOpen && room.fogAlpha >= 0.95) return;
    const { cellW, cellH } = map;
    const skirtH = 54;

    ctx.save();
    if (game.showFog && !game.titleOpen && room.fogAlpha > 0.02) {
      ctx.globalAlpha = Math.max(0, 1 - room.fogAlpha);
    }
    ctx.lineJoin = 'round';

    for (const c of room.cells) {
      const x = c.gx * cellW;
      const y = c.gy * cellH;
      const baseY = y + cellH;

      // 浮岛投在云海上的柔影
      ctx.fillStyle = 'rgba(72, 134, 174, 0.14)';
      ctx.beginPath();
      ctx.roundRect(x + 12, y + 24, cellW, cellH + 34, 18);
      ctx.fill();

      // 仅在该格下方没有邻格时绘制悬崖底部岩面与垂藤
      const hasSouth = map.cells.has(`${c.gx},${c.gy + 1}`);
      if (hasSouth) continue;

      const segs = 4;
      const palCliff = (map.stage && map.stage.palette) || {};
      ctx.fillStyle = palCliff.cliffMain || '#c9a684';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(x - 8, baseY - 2);
      ctx.lineTo(x + cellW + 8, baseY - 2);
      ctx.lineTo(x + cellW - 4, baseY + skirtH * 0.64);
      for (let i = segs - 1; i >= 0; i--) {
        const px = x + ((i + 0.5) / segs) * cellW;
        const depth = skirtH * (0.62 + (((room.id + c.gx * 3 + i * 7) % 5) * 0.12));
        ctx.lineTo(px, baseY + depth);
      }
      ctx.lineTo(x + 4, baseY + skirtH * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = palCliff.cliffShade || 'rgba(78, 118, 128, 0.24)';
      ctx.beginPath();
      ctx.moveTo(x + 12, baseY + 14);
      ctx.lineTo(x + cellW - 12, baseY + 14);
      ctx.lineTo(x + cellW * 0.72, baseY + skirtH * 0.84);
      ctx.lineTo(x + cellW * 0.28, baseY + skirtH * 0.78);
      ctx.closePath();
      ctx.fill();

      for (let i = 0; i < segs; i++) {
        const vx = x + ((i + 0.5) / segs) * cellW;
        const sway = Math.sin(time * 2.1 + room.id + c.gx + i * 1.4) * 5;
        const len = 24 + ((room.id * 11 + c.gx * 5 + i * 17) % 28);

        ctx.strokeStyle = '#4e9c68';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(vx, baseY + 2);
        ctx.quadraticCurveTo(vx + sway * 0.5, baseY + len * 0.5, vx + sway, baseY + len);
        ctx.stroke();

        ctx.fillStyle = '#6ec27e';
        ctx.beginPath();
        ctx.ellipse(vx + sway * 0.55 - 4, baseY + len * 0.48, 4.5, 2.5, -0.4, 0, Math.PI * 2);
        ctx.ellipse(vx + sway * 0.85 + 3, baseY + len * 0.78, 4, 2.3, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (room.role === 'atrium' || room.role === 'vault' || room.biome === 'lotus_pond') {
        const wx = x + cellW * 0.76;
        const wfGrad = ctx.createLinearGradient(wx, baseY, wx, baseY + 86);
        wfGrad.addColorStop(0, 'rgba(128, 224, 242, 0.85)');
        wfGrad.addColorStop(0.65, 'rgba(216, 248, 255, 0.65)');
        wfGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = wfGrad;
        ctx.fillRect(wx - 7, baseY - 2, 14, 86);

        const shift = (time * 48) % 22;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.7;
        for (let fy = baseY + shift; fy < baseY + 64; fy += 22) {
          ctx.beginPath();
          ctx.moveTo(wx - 2.5, fy);
          ctx.lineTo(wx - 2.5, fy + 10);
          ctx.moveTo(wx + 3.5, fy - 6);
          ctx.lineTo(wx + 3.5, fy + 5);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  // ==================== 空中花房地板、3 大生态区与职能地标 ====================
  function drawRoomFloor(ctx, room, map, time) {
    const { x, y, w, h, role, biome, cells } = room;
    const { cellW, cellH } = map;
    ctx.save();

    const biomeTints = {
      sun_glasshouse: 'rgba(255, 232, 162, 0.14)',
      lotus_pond: 'rgba(122, 214, 226, 0.15)',
      ancient_vine: 'rgba(148, 206, 152, 0.14)',
    };
    const roleTints = {
      spawn: 'rgba(136, 214, 178, 0.12)',
      vault: 'rgba(255, 218, 108, 0.2)',
      extract: 'rgba(104, 204, 236, 0.16)',
      atrium: 'rgba(116, 214, 224, 0.14)',
      gallery: 'rgba(164, 220, 198, 0.12)',
      treasure: 'rgba(255, 228, 142, 0.14)',
    };

    // 按细胞绘制地板与生态区洗色（完美支持 L 型异形房间！）
    for (const c of cells) {
      const cx0 = c.gx * cellW;
      const cy0 = c.gy * cellH;
      ctx.fillStyle = paperPattern;
      ctx.fillRect(cx0, cy0, cellW, cellH);

      ctx.fillStyle = roleTints[role] || biomeTints[biome] || 'rgba(255,255,255,0)';
      ctx.fillRect(cx0, cy0, cellW, cellH);

      // 外围极淡雅装饰框线（只在非内部连通边绘制，与地砖柔和融为一体）
      const isDarkFloor = !!(map.stage && map.stage.palette && map.stage.palette.isDark);
      ctx.strokeStyle = isDarkFloor ? 'rgba(236, 204, 122, 0.14)' : 'rgba(72, 122, 120, 0.12)';
      ctx.lineWidth = 1.25;
      const m = 28;
      const hasN = room.cellKeys.has(`${c.gx},${c.gy - 1}`);
      const hasS = room.cellKeys.has(`${c.gx},${c.gy + 1}`);
      const hasW = room.cellKeys.has(`${c.gx - 1},${c.gy}`);
      const hasE = room.cellKeys.has(`${c.gx + 1},${c.gy}`);
      ctx.beginPath();
      if (!hasN) { ctx.moveTo(cx0 + (hasW ? 0 : m), cy0 + m); ctx.lineTo(cx0 + cellW - (hasE ? 0 : m), cy0 + m); }
      if (!hasS) { ctx.moveTo(cx0 + (hasW ? 0 : m), cy0 + cellH - m); ctx.lineTo(cx0 + cellW - (hasE ? 0 : m), cy0 + cellH - m); }
      if (!hasW) { ctx.moveTo(cx0 + m, cy0 + (hasN ? 0 : m)); ctx.lineTo(cx0 + m, cy0 + cellH - (hasS ? 0 : m)); }
      if (!hasE) { ctx.moveTo(cx0 + cellW - m, cy0 + (hasN ? 0 : m)); ctx.lineTo(cx0 + cellW - m, cy0 + cellH - (hasS ? 0 : m)); }
      ctx.stroke();

      // 日照温室区每格铺一层温暖的 45° 斜射天窗光斑
      if (biome === 'sun_glasshouse' && role !== 'atrium') {
        ctx.fillStyle = 'rgba(255, 250, 212, 0.19)';
        ctx.beginPath();
        ctx.moveTo(cx0 + 70, cy0 + 30);
        ctx.lineTo(cx0 + 185, cy0 + 30);
        ctx.lineTo(cx0 + 105, cy0 + cellH - 30);
        ctx.lineTo(cx0 + 25, cy0 + cellH - 30);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx0 + 290, cy0 + 30);
        ctx.lineTo(cx0 + 395, cy0 + 30);
        ctx.lineTo(cx0 + 310, cy0 + cellH - 30);
        ctx.lineTo(cx0 + 225, cy0 + cellH - 30);
        ctx.closePath();
        ctx.fill();
      }
    }

    const cx = x + w / 2;
    const cy = y + h / 2;

    if (role === 'spawn') {
      const compY = cy - 22;
      const compR = 64;
      const isDarkSt = !!(map.stage && map.stage.palette && map.stage.palette.isDark);

      const cg = ctx.createRadialGradient(cx, compY, 8, cx, compY, compR);
      cg.addColorStop(0, isDarkSt ? 'rgba(246, 212, 120, 0.12)' : 'rgba(116, 206, 168, 0.18)');
      cg.addColorStop(1, isDarkSt ? 'rgba(92, 138, 224, 0.04)' : 'rgba(102, 194, 152, 0.04)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(cx, compY, compR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isDarkSt ? 'rgba(246, 212, 120, 0.36)' : 'rgba(54, 134, 114, 0.42)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(cx, compY, compR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = isDarkSt ? 'rgba(246, 212, 120, 0.22)' : 'rgba(54, 134, 114, 0.22)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, compY, compR - 7, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = isDarkSt ? 'rgba(246, 212, 120, 0.28)' : 'rgba(54, 134, 114, 0.28)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const len = i % 2 === 0 ? compR - 12 : compR - 26;
        ctx.beginPath();
        ctx.moveTo(cx, compY);
        ctx.lineTo(cx + Math.cos(a) * len, compY + Math.sin(a) * len);
        ctx.stroke();
      }

      ctx.fillStyle = isDarkSt ? 'rgba(246, 218, 134, 0.6)' : 'rgba(54, 134, 114, 0.55)';
      ctx.beginPath();
      ctx.arc(cx, compY, 4.2, 0, Math.PI * 2);
      ctx.fill();

      // 登船台短铭牌置于罗盘上方洁净区，彻底避免与下方露水滑道和木箱重叠
      ctx.fillStyle = isDarkSt ? 'rgba(246, 218, 134, 0.86)' : 'rgba(46, 108, 96, 0.78)';
      ctx.font = '700 12.5px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      const st = game.map && game.map.stage ? game.map.stage : null;
      const dockLabel = st ? `⚓ 第 ${st.id} 关 · ${st.name}` : '⚓ 浮岛登船台';
      ctx.fillText(dockLabel, cx, y + 54);
    } else if (role === 'vault') {
      const alarmFlash = game.run.alarmActive ? 0.16 + 0.14 * Math.sin(time * 7) : 0.18;
      ctx.fillStyle = game.run.alarmActive
        ? `rgba(224, 82, 68, ${alarmFlash})`
        : 'rgba(255, 208, 76, 0.18)';
      ctx.strokeStyle = game.run.vaultOpened ? '#d95344' : '#d99e26';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.roundRect(cx - 148, cy - 98, 296, 196, 16);
      ctx.fill();
      ctx.stroke();

      const sunPool = ctx.createRadialGradient(cx, cy, 12, cx, cy, 135);
      sunPool.addColorStop(0, 'rgba(255, 245, 180, 0.38)');
      sunPool.addColorStop(1, 'rgba(255, 245, 180, 0)');
      ctx.fillStyle = sunPool;
      ctx.beginPath();
      ctx.arc(cx, cy, 135, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = game.run.vaultOpened ? '#ff7062' : ((map.stage && map.stage.palette && map.stage.palette.isDark) ? '#ffe27a' : 'rgba(168, 112, 18, 0.88)');
      ctx.font = '700 13px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        game.run.vaultOpened ? '⚠ 温室警报已响 · 速往热气球撤离!' : '☀ 太阳花穹金库 · SUNLIT VAULT',
        cx,
        y + h - 42
      );
    } else if (role === 'extract') {
      const ex = game.run.extraction;
      const active = ex.active;
      const pulse = 0.88 + 0.12 * Math.sin(time * (active ? 8 : 3.5));

      if (active) {
        const waveR = 88 + ((time * 60) % 48);
        const waveA = Math.max(0, 1 - (waveR - 88) / 48) * 0.5;
        ctx.strokeStyle = ex.inside ? `rgba(64, 198, 232, ${waveA})` : `rgba(232, 132, 52, ${waveA})`;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = active
        ? (ex.inside ? `rgba(82, 206, 238, ${0.22 * pulse})` : `rgba(242, 154, 68, ${0.2 * pulse})`)
        : `rgba(98, 198, 228, ${0.15 * pulse})`;
      ctx.strokeStyle = active ? (ex.inside ? '#2498c4' : '#d96b27') : '#3896bd';
      ctx.lineWidth = active ? 4 : 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 88, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * (active ? 2.8 : 0.7));
      ctx.strokeStyle = 'rgba(52, 158, 192, 0.45)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.arc(0, 0, 66, a, a + 0.65);
        ctx.stroke();
      }
      ctx.restore();

      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        const mx = cx + Math.cos(a) * 82;
        const my = cy + Math.sin(a) * 82;
        ctx.fillStyle = '#f2c350';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(mx, my, 5.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      if (active) {
        const pct = Math.max(0, Math.min(1, 1 - ex.timeLeft / ex.duration));
        ctx.strokeStyle = ex.inside ? '#f6c844' : '#e67e32';
        ctx.lineWidth = 7.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 95, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        ctx.stroke();

        ctx.font = '800 26px "PingFang SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(255, 253, 248, 0.96)';
        ctx.lineWidth = 5;
        const secStr = `${ex.timeLeft.toFixed(1)}s`;
        ctx.strokeText(secStr, cx, cy + 16);
        ctx.fillStyle = ex.inside ? '#1c789c' : '#c95c1e';
        ctx.fillText(secStr, cx, cy + 16);
      }

      ctx.fillStyle = (map.stage && map.stage.palette && map.stage.palette.isDark) ? '#9ae8ff' : 'rgba(34, 114, 146, 0.9)';
      ctx.font = '700 13px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(
        active
          ? (ex.inside ? '🎈 热气球充气升空中 · 守住登机台!' : '⚠ 已离开登机台 · 充气暂停')
          : '🎈 热气球撤离坞 · 按 E 点火起飞',
        cx,
        cy + 114
      );
    } else if (role === 'atrium') {
      ctx.fillStyle = 'rgba(104, 206, 224, 0.24)';
      ctx.strokeStyle = 'rgba(66, 162, 186, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 186, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const rip = 128 + Math.sin(time * 2.2) * 8;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx, cy, rip, 0, Math.PI * 2);
      ctx.stroke();

      const pads = [
        { dx: -135, dy: -65, r: 16, bloom: true },
        { dx: 142, dy: 58, r: 18, bloom: true },
        { dx: -110, dy: 112, r: 14, bloom: false },
        { dx: 120, dy: -102, r: 15, bloom: false },
      ];
      for (const pad of pads) {
        ctx.fillStyle = 'rgba(92, 178, 122, 0.72)';
        ctx.beginPath();
        ctx.arc(cx + pad.dx, cy + pad.dy, pad.r, 0.25, Math.PI * 1.92);
        ctx.lineTo(cx + pad.dx, cy + pad.dy);
        ctx.closePath();
        ctx.fill();
        if (pad.bloom) {
          ctx.fillStyle = '#ffa6be';
          ctx.beginPath();
          ctx.arc(cx + pad.dx + 2, cy + pad.dy - 2, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff5b8';
          ctx.beginPath();
          ctx.arc(cx + pad.dx + 2, cy + pad.dy - 2, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  // ==================== 向日葵花盘 <-> 藤蔓花闸地面光脉连线 ====================
  function drawGateConduit(ctx, gate, time) {
    ctx.save();
    ctx.lineCap = 'round';
    const mx = (gate.cx + gate.switchX) * 0.5;
    const my = (gate.cy + gate.switchY) * 0.5 + 18;

    ctx.strokeStyle = gate.open ? 'rgba(246, 200, 68, 0.42)' : 'rgba(66, 166, 108, 0.58)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(gate.switchX, gate.switchY);
    ctx.quadraticCurveTo(mx, my, gate.cx, gate.cy);
    ctx.stroke();

    ctx.strokeStyle = gate.open ? '#ffe875' : '#ffd84d';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -(time * (gate.open ? 18 : 34));
    ctx.beginPath();
    ctx.moveTo(gate.switchX, gate.switchY);
    ctx.quadraticCurveTo(mx, my, gate.cx, gate.cy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ==================== 系泊热气球撤离艇 ====================
  function drawExtractBalloon(ctx, cx, cy, time) {
    const ex = game.run.extraction;
    const active = ex.active;
    const pct = active ? Math.max(0, Math.min(1, 1 - ex.timeLeft / ex.duration)) : 0;
    const lift = (active ? 18 + pct * 28 : 0) + Math.sin(time * (active ? 5.2 : 2.3)) * 5;
    const swayX = Math.sin(time * (active ? 3.8 : 1.5)) * (active ? 4.5 : 3);
    const balloonX = cx + swayX;
    const balloonY = cy - 68 - lift;
    const swell = 1 + (active ? 0.06 + pct * 0.08 : 0);

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.strokeStyle = 'rgba(72, 108, 114, 0.65)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - 58, cy - 58);
    ctx.lineTo(balloonX - 10, balloonY + 26);
    ctx.moveTo(cx + 58, cy - 58);
    ctx.lineTo(balloonX + 10, balloonY + 26);
    ctx.stroke();

    ctx.fillStyle = 'rgba(52, 92, 108, 0.16)';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 36, 26, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d9a96c';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(balloonX - 12, balloonY + 18, 24, 15, 4);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(balloonX - 9, balloonY + 18);
    ctx.lineTo(balloonX - 11, balloonY + 4);
    ctx.moveTo(balloonX + 9, balloonY + 18);
    ctx.lineTo(balloonX + 11, balloonY + 4);
    ctx.stroke();

    if (active) {
      const fSize = 7 + Math.sin(time * 28) * 2.5;
      const fg = ctx.createRadialGradient(balloonX, balloonY + 9, 1, balloonX, balloonY + 9, fSize * 2.2);
      fg.addColorStop(0, 'rgba(255, 244, 156, 0.95)');
      fg.addColorStop(0.55, 'rgba(255, 138, 56, 0.72)');
      fg.addColorStop(1, 'rgba(255, 138, 56, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(balloonX, balloonY + 9, fSize * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(balloonX, balloonY - 22);
    ctx.scale(swell, swell);

    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.bezierCurveTo(32, -34, 34, 2, 13, 25);
    ctx.lineTo(-13, 25);
    ctx.bezierCurveTo(-34, 2, -32, -34, 0, -34);
    ctx.closePath();
    ctx.fillStyle = '#fff9eb';
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#e86f68';
    ctx.fillRect(-36, -38, 17, 70);
    ctx.fillRect(19, -38, 17, 70);
    ctx.fillStyle = '#56b8d4';
    ctx.beginPath();
    ctx.ellipse(0, -4, 12, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6cc58';
    ctx.fillRect(-34, -2, 68, 7);
    ctx.restore();

    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-12, -16, 6, 12, -0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  function drawDoorwayThreshold(ctx, door) {
    ctx.save();
    // 跨生态区的通道表现为暖木云海栈桥，同生态区为清透石阶门槛
    ctx.fillStyle = door.isBridge ? '#e3c496' : '#e4eadc';
    ctx.strokeStyle = door.isBridge ? 'rgba(116, 84, 52, 0.55)' : 'rgba(64, 108, 112, 0.48)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(door.cx - door.w / 2, door.cy - door.h / 2, door.w, door.h, 5);
    ctx.fill();
    ctx.stroke();

    if (door.isBridge) {
      ctx.strokeStyle = 'rgba(130, 92, 54, 0.35)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      if (door.orient === 'h') {
        for (let px = door.cx - door.w * 0.38; px <= door.cx + door.w * 0.38; px += 18) {
          ctx.moveTo(px, door.cy - door.h / 2 + 2);
          ctx.lineTo(px, door.cy + door.h / 2 - 2);
        }
      } else {
        for (let py = door.cy - door.h * 0.38; py <= door.cy + door.h * 0.38; py += 18) {
          ctx.moveTo(door.cx - door.w / 2 + 2, py);
          ctx.lineTo(door.cx + door.w / 2 - 2, py);
        }
      }
      ctx.stroke();
    }

    ctx.fillStyle = door.isBridge ? '#e5b84b' : '#6ec27e';
    if (door.orient === 'h') {
      ctx.beginPath();
      ctx.arc(door.cx - door.w * 0.38, door.cy, 3.2, 0, Math.PI * 2);
      ctx.arc(door.cx + door.w * 0.38, door.cy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(door.cx, door.cy - door.h * 0.38, 3.2, 0, Math.PI * 2);
      ctx.arc(door.cx, door.cy + door.h * 0.38, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ==================== 高空温室前景层：极轻玻璃拱肋投影 + 飞舞小白蝶 ====================
  function drawOverheadGreenhouseCanopy(ctx, map, time) {
    if (game.mapOverview) return;
    ctx.save();
    for (const room of map.rooms) {
      if (game.showFog && room.fogAlpha > 0.75) continue;
      if (room.biome !== 'sun_glasshouse' && room.role !== 'atrium') continue;

      ctx.strokeStyle = 'rgba(46, 98, 114, 0.065)';
      ctx.lineWidth = 4;
      for (const c of room.cells) {
        const x0 = c.gx * map.cellW;
        const y0 = c.gy * map.cellH;
        const drift = Math.sin(time * 0.35) * 6;
        ctx.beginPath();
        ctx.moveTo(x0 + 40 + drift, y0);
        ctx.lineTo(x0 + 190 + drift, y0 + map.cellH);
        ctx.moveTo(x0 + 270 + drift, y0);
        ctx.lineTo(x0 + 420 + drift, y0 + map.cellH);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawButterfly(ctx, bf, time) {
    const flap = Math.max(0.25, Math.abs(Math.sin(time * 14 + bf.phase)));
    ctx.save();
    ctx.translate(bf.x, bf.y - 24 + Math.sin(time * 3.5 + bf.phase) * 5);
    ctx.rotate(bf.angle);
    ctx.fillStyle = bf.color;
    ctx.strokeStyle = 'rgba(46, 74, 82, 0.55)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.ellipse(-2, -3.5 * flap, 4.5, 3.2 * flap, -0.35, 0, Math.PI * 2);
    ctx.ellipse(-2, 3.5 * flap, 4.5, 3.2 * flap, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ==================== 无缝融合的宫崎骏水彩云海遮罩（彻底告别方块格子与重复印章） ====================
  function getCloudFogPalette(stage) {
    const theme = stage ? stage.theme : 'friction';
    if (theme === 'gravity') {
      return {
        shadow: '#0d1836',
        mid: '#1b2d5c',
        body: '#2a417a',
        highlight: '#4965a8',
        rim: 'rgba(255, 232, 146, 0.32)',
        sparkle: '#ffe484',
        isNight: true,
      };
    }
    if (theme === 'stealth') {
      return {
        shadow: '#214242',
        mid: '#386864',
        body: '#52877d',
        highlight: '#86baa9',
        rim: 'rgba(224, 248, 228, 0.34)',
        sparkle: '#ffe082',
        isNight: false,
      };
    }
    if (theme === 'fusion') {
      return {
        shadow: '#c98d98',
        mid: '#e4b3b0',
        body: '#f7d8cb',
        highlight: '#fff4e6',
        rim: 'rgba(255, 236, 178, 0.52)',
        sparkle: '#ffd86b',
        isNight: false,
      };
    }
    // 第 1 关 晨露荷塘：纯净晴空奶白水彩云海
    return {
      shadow: '#b3daf0',
      mid: '#d8effa',
      body: '#eff9fe',
      highlight: '#ffffff',
      rim: 'rgba(255, 255, 255, 0.72)',
      sparkle: '#7ccfeb',
      isNight: false,
    };
  }

  function buildCellCloudPuffs(c, map, keySet, time, disperse = 0) {
    const { cellW, cellH, cells } = map;
    const rx = c.gx * cellW;
    const ry = c.gy * cellH;
    const cx = rx + cellW / 2;
    const cy = ry + cellH / 2;
    const puffs = [];

    const kN = `${c.gx},${c.gy - 1}`;
    const kS = `${c.gx},${c.gy + 1}`;
    const kW = `${c.gx - 1},${c.gy}`;
    const kE = `${c.gx + 1},${c.gy}`;

    const hasFogN = keySet.has(kN);
    const hasFogS = keySet.has(kS);
    const hasFogW = keySet.has(kW);
    const hasFogE = keySet.has(kE);

    const isOpenN = !hasFogN && cells.has(kN);
    const isOpenS = !hasFogS && cells.has(kS);
    const isOpenW = !hasFogW && cells.has(kW);
    const isOpenE = !hasFogE && cells.has(kE);

    const pushPuff = (px, py, r, seedIdx, layer = 1) => {
      const h1 = fogHash(c.gx, c.gy, seedIdx * 3 + 1);
      const h2 = fogHash(c.gx, c.gy, seedIdx * 3 + 2);
      const driftX = Math.sin(time * (0.42 + h1 * 0.35) + h2 * 6.28) * (6 + h1 * 6);
      const driftY = Math.cos(time * (0.36 + h2 * 0.3) + h1 * 6.28) * (3.5 + h2 * 4);
      const outX = px - cx;
      const outY = py - cy;
      puffs.push({
        x: px + driftX + outX * disperse * 0.38,
        y: py + driftY + outY * disperse * 0.38,
        r: Math.max(12, r * (1 - disperse * 0.28)),
        layer,
        h1,
        h2,
      });
    };

    // 1. 外露边缘波浪云岸：朝向外部天空更舒展蓬松，朝向已探索房间则收紧贴门框不挡视野！
    if (!hasFogN) {
      const count = 5;
      for (let i = 0; i < count; i++) {
        const frac = (i + 0.3 + fogHash(c.gx, c.gy, 10 + i) * 0.4) / count;
        const r = (isOpenN ? 46 : 66) + fogHash(c.gx, c.gy, 20 + i) * (isOpenN ? 20 : 34);
        const yOff = isOpenN ? -6 : (-18 - fogHash(c.gx, c.gy, 30 + i) * 18);
        pushPuff(rx + cellW * frac, ry + yOff, r, 10 + i, 0);
      }
    }
    if (!hasFogS) {
      const count = 5;
      for (let i = 0; i < count; i++) {
        const frac = (i + 0.3 + fogHash(c.gx, c.gy, 40 + i) * 0.4) / count;
        const r = (isOpenS ? 46 : 70) + fogHash(c.gx, c.gy, 50 + i) * (isOpenS ? 20 : 34);
        const yOff = isOpenS ? -2 : (14 + fogHash(c.gx, c.gy, 60 + i) * 18);
        pushPuff(rx + cellW * frac, ry + cellH + yOff, r, 40 + i, 0);
      }
    }
    if (!hasFogW) {
      const count = 4;
      for (let i = 0; i < count; i++) {
        const frac = (i + 0.3 + fogHash(c.gx, c.gy, 70 + i) * 0.4) / count;
        const r = (isOpenW ? 44 : 66) + fogHash(c.gx, c.gy, 80 + i) * (isOpenW ? 18 : 32);
        const xOff = isOpenW ? 2 : (-14 - fogHash(c.gx, c.gy, 90 + i) * 16);
        pushPuff(rx + xOff, ry + cellH * frac, r, 70 + i, 0);
      }
    }
    if (!hasFogE) {
      const count = 4;
      for (let i = 0; i < count; i++) {
        const frac = (i + 0.3 + fogHash(c.gx, c.gy, 100 + i) * 0.4) / count;
        const r = (isOpenE ? 44 : 66) + fogHash(c.gx, c.gy, 110 + i) * (isOpenE ? 18 : 32);
        const xOff = isOpenE ? -2 : (14 + fogHash(c.gx, c.gy, 120 + i) * 16);
        pushPuff(rx + cellW + xOff, ry + cellH * frac, r, 100 + i, 0);
      }
    }

    // 外角补云（柔和包住外墙转角灯柱，呈现圆润饱满云团廓形）
    const corners = [
      [!hasFogN && !hasFogW && !isOpenN && !isOpenW, rx - 10, ry - 16, 131],
      [!hasFogN && !hasFogE && !isOpenN && !isOpenE, rx + cellW + 10, ry - 16, 132],
      [!hasFogS && !hasFogW && !isOpenS && !isOpenW, rx - 10, ry + cellH + 12, 133],
      [!hasFogS && !hasFogE && !isOpenS && !isOpenE, rx + cellW + 10, ry + cellH + 12, 134],
    ];
    for (const [cond, px, py, sid] of corners) {
      if (cond) pushPuff(px, py, 68 + fogHash(c.gx, c.gy, sid) * 26, sid, 0);
    }

    // 2. 内部错落起伏的有机云峰（大小/位置各异且跨格交织，彻底打破格子感）
    for (let k = 0; k < 5; k++) {
      const fx = 0.08 + fogHash(c.gx, c.gy, 150 + k * 2) * 0.84;
      const fy = 0.08 + fogHash(c.gx, c.gy, 151 + k * 2) * 0.84;
      const r = 68 + fogHash(c.gx, c.gy, 170 + k) * 52;
      pushPuff(rx + cellW * fx, ry + cellH * fy, r, 150 + k, 1);
    }

    return puffs;
  }

  function drawUnifiedCloudFog(ctx, map, time, viewW, viewH, camera, sx, sy) {
    const solidRooms = [];
    const fadingRooms = [];
    for (const room of map.rooms) {
      if (room.fogAlpha >= 0.96) solidRooms.push(room);
      else if (room.fogAlpha > 0.02) fadingRooms.push(room);
    }
    if (solidRooms.length === 0 && fadingRooms.length === 0) return;

    const { cellW, cellH } = map;
    const fp = getCloudFogPalette(map.stage);

    // A. 将所有厚云覆盖区合批绘制到离屏 Canvas，实现 0 接缝连绵大云海！
    if (solidRooms.length > 0) {
      const fogScale = Math.min(window.devicePixelRatio || 1, 1.5);
      const targetW = Math.max(1, Math.floor(viewW * fogScale));
      const targetH = Math.max(1, Math.floor(viewH * fogScale));
      if (!fogCanvas) {
        fogCanvas = document.createElement('canvas');
        fogCtx = fogCanvas.getContext('2d');
      }
      if (fogCanvas.width !== targetW || fogCanvas.height !== targetH) {
        fogCanvas.width = targetW;
        fogCanvas.height = targetH;
      }

      const solidCells = [];
      const solidKeySet = new Set();
      for (const room of solidRooms) {
        for (const c of room.cells) {
          solidCells.push({ cell: c, room });
          solidKeySet.add(`${c.gx},${c.gy}`);
        }
      }

      const allPuffs = [];
      for (const item of solidCells) {
        const list = buildCellCloudPuffs(item.cell, map, solidKeySet, time, 0);
        for (let i = 0; i < list.length; i++) allPuffs.push(list[i]);
      }

      fogCtx.save();
      fogCtx.setTransform(fogScale, 0, 0, fogScale, 0, 0);
      fogCtx.clearRect(0, 0, viewW, viewH);
      fogCtx.translate(viewW / 2 + sx, viewH / 2 + sy);
      fogCtx.scale(camera.zoom, camera.zoom);
      fogCtx.translate(-camera.x, -camera.y);

      // Layer 1：整片云海柔和底部云影（向下偏移 16px，呈现漂浮厚重体积感）
      fogCtx.fillStyle = fp.shadow;
      fogCtx.beginPath();
      for (const item of solidCells) {
        const c = item.cell;
        fogCtx.rect(c.gx * cellW - 4, c.gy * cellH - 10, cellW + 8, cellH + 28);
      }
      for (const pf of allPuffs) {
        fogCtx.moveTo(pf.x + pf.r * 1.03, pf.y + 16);
        fogCtx.arc(pf.x, pf.y + 16, pf.r * 1.03, 0, Math.PI * 2);
      }
      fogCtx.fill();

      // Layer 2：中层云影柔光过渡（三阶水彩云体积层次）
      fogCtx.fillStyle = fp.mid;
      fogCtx.beginPath();
      for (const item of solidCells) {
        const c = item.cell;
        fogCtx.rect(c.gx * cellW - 3, c.gy * cellH - 14, cellW + 6, cellH + 22);
      }
      for (const pf of allPuffs) {
        fogCtx.moveTo(pf.x + pf.r * 0.98, pf.y + 6);
        fogCtx.arc(pf.x, pf.y + 6, pf.r * 0.98, 0, Math.PI * 2);
      }
      fogCtx.fill();

      // Layer 3：纯净无缝的主云海层（完全消除内部格子缝与外露石墙直边！）
      fogCtx.fillStyle = fp.body;
      fogCtx.beginPath();
      for (const item of solidCells) {
        const c = item.cell;
        fogCtx.rect(c.gx * cellW - 2, c.gy * cellH - 18, cellW + 4, cellH + 20);
      }
      for (const pf of allPuffs) {
        fogCtx.moveTo(pf.x + pf.r * 0.94, pf.y - 2);
        fogCtx.arc(pf.x, pf.y - 2, pf.r * 0.94, 0, Math.PI * 2);
      }
      fogCtx.fill();

      // Layer 4：错落有致的手绘奶油高光云顶
      for (const pf of allPuffs) {
        if (pf.layer === 0 && pf.h1 < 0.32) continue;
        const hr = pf.r * (0.56 + pf.h2 * 0.24);
        const hx = pf.x - pf.r * 0.14;
        const hy = pf.y - pf.r * 0.22;
        fogCtx.fillStyle = fp.highlight;
        fogCtx.globalAlpha = pf.layer === 1 ? 0.62 : 0.44;
        fogCtx.beginPath();
        fogCtx.arc(hx, hy, hr, 0, Math.PI * 2);
        fogCtx.fill();
      }

      // Layer 5：轻盈水彩云脊高光弧线
      fogCtx.globalAlpha = 1;
      fogCtx.strokeStyle = fp.rim;
      fogCtx.lineWidth = 2.4;
      fogCtx.lineCap = 'round';
      for (let i = 0; i < allPuffs.length; i += 2) {
        const pf = allPuffs[i];
        if (pf.r < 68) continue;
        fogCtx.beginPath();
        fogCtx.arc(pf.x - pf.r * 0.08, pf.y - pf.r * 0.14, pf.r * 0.56, Math.PI * 1.12, Math.PI * 1.78);
        fogCtx.stroke();
      }

      // 相邻可探索未知房间的极轻呼吸星芒指引（克制优雅，不再满屏盖大 ☁ 印章）
      for (const room of solidRooms) {
        if (!room.adjacentSeen) continue;
        const fc = room.cells[0];
        const icx = fc.gx * cellW + cellW / 2;
        const icy = fc.gy * cellH + cellH / 2;
        const pulse = 0.32 + 0.24 * Math.sin(time * 2.4 + room.id * 1.3);

        fogCtx.save();
        fogCtx.globalAlpha = pulse;
        fogCtx.fillStyle = fp.sparkle;
        fogCtx.beginPath();
        for (let s = 0; s < 8; s++) {
          const rad = s % 2 === 0 ? 11 : 4.2;
          const a = (s * Math.PI) / 4;
          const px = icx + Math.cos(a) * rad;
          const py = icy + Math.sin(a) * rad;
          if (s === 0) fogCtx.moveTo(px, py);
          else fogCtx.lineTo(px, py);
        }
        fogCtx.closePath();
        fogCtx.fill();
        fogCtx.restore();
      }

      fogCtx.restore();

      // 将完整无缝云海一次合成回主画布屏幕空间
      ctx.save();
      const dpr = ctx.canvas.width / Math.max(1, viewW);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 0.985;
      ctx.drawImage(fogCanvas, 0, 0, viewW, viewH);
      ctx.restore();
    }

    // B. 正在揭开的房间：拨云见日动态散开过渡动画
    for (const room of fadingRooms) {
      const a = room.fogAlpha;
      const disperse = 1 - a;
      ctx.save();
      ctx.globalAlpha = a * 0.94;
      const fadeSet = new Set();
      for (const c of room.cells) fadeSet.add(`${c.gx},${c.gy}`);
      for (const c of room.cells) {
        const list = buildCellCloudPuffs(c, map, fadeSet, time, disperse);
        ctx.fillStyle = fp.mid;
        ctx.beginPath();
        for (const pf of list) {
          ctx.moveTo(pf.x + pf.r, pf.y + 8);
          ctx.arc(pf.x, pf.y + 8, pf.r, 0, Math.PI * 2);
        }
        ctx.fill();

        ctx.fillStyle = fp.body;
        ctx.beginPath();
        for (const pf of list) {
          ctx.moveTo(pf.x + pf.r * 0.92, pf.y - 2);
          ctx.arc(pf.x, pf.y - 2, pf.r * 0.92, 0, Math.PI * 2);
        }
        ctx.fill();

        ctx.fillStyle = fp.highlight;
        ctx.globalAlpha = a * 0.55;
        ctx.beginPath();
        for (const pf of list) {
          if (pf.layer === 1) {
            ctx.moveTo(pf.x + pf.r * 0.56, pf.y - pf.r * 0.16);
            ctx.arc(pf.x - pf.r * 0.1, pf.y - pf.r * 0.16, pf.r * 0.56, 0, Math.PI * 2);
          }
        }
        ctx.fill();
        ctx.globalAlpha = a * 0.94;
      }
      ctx.restore();
    }
  }

  function drawSunbeamAndPollen(ctx, W, H, time) {
    ctx.save();
    for (const m of POLLEN_MOTES) {
      const px = ((m.x + time * m.speedX) % (W + 40)) - 20;
      const py = ((m.y + Math.sin(time * 1.4 + m.phase) * 26) % H + H) % H;
      const a = 0.25 + 0.22 * Math.sin(time * 2.5 + m.phase);
      ctx.fillStyle = `rgba(255, 252, 224, ${a})`;
      ctx.beginPath();
      ctx.arc(px, py, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawAlarmVignette(ctx, W, H, time) {
    const ex = game.run.extraction;
    if (!game.run.alarmActive && !ex.active) return;

    const pulse = 0.5 + 0.5 * Math.sin(time * (ex.active ? 6.5 : 4.2));
    const color = ex.active
      ? `rgba(60, 186, 224, ${0.11 + pulse * 0.1})`
      : `rgba(224, 78, 62, ${0.09 + pulse * 0.1})`;

    ctx.save();
    const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.34, W / 2, H / 2, Math.max(W, H) * 0.68);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawOffscreenCompass(ctx, W, H, time) {
    if (!CB.extraction) return;
    const { camera, run } = game;

    let target = null;
    let label = '';
    let color = '#2489b0';

    if (run.vaultOpened || run.hasGrandCurio || run.extraction.active) {
      const ext = CB.extraction.getExtractCenter();
      if (ext) {
        target = { x: ext.x, y: ext.y };
        label = run.extraction.active ? `🎈 ${run.extraction.timeLeft.toFixed(1)}s` : '🎈 热气球坞';
        color = '#2489b0';
      }
    } else {
      const v = CB.extraction.getVaultCenter();
      if (v && v.room && (v.room.discovered || v.room.adjacentSeen)) {
        target = { x: v.x, y: v.y };
        label = '☀ 花穹金库';
        color = '#d48d18';
      }
    }

    if (!target) return;

    const sx = (target.x - camera.x) * camera.zoom + W / 2;
    const sy = (target.y - camera.y) * camera.zoom + H / 2;
    const margin = 58;
    if (sx > margin && sx < W - margin && sy > margin && sy < H - margin) return;

    const ang = Math.atan2(sy - H / 2, sx - W / 2);
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const rx = W / 2 - 64;
    const ry = H / 2 - 78;
    const scale = 1 / Math.max(Math.abs(cos) / rx, Math.abs(sin) / ry);
    const px = W / 2 + cos * scale;
    const py = H / 2 + sin * scale;
    const pulse = 1 + Math.sin(time * 7) * 0.08;

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(pulse, pulse);

    ctx.fillStyle = color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.rotate(ang);
    ctx.fillStyle = '#fffdf8';
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-5, -6);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.font = '700 11.5px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(255, 253, 248, 0.95)';
    ctx.lineWidth = 3.5;
    ctx.strokeText(label, 0, 28);
    ctx.fillStyle = color;
    ctx.fillText(label, 0, 28);

    ctx.restore();
  }

  function drawStageEntryBanner(ctx, W, stage, timer) {
    const fadeIn = Math.min(1, (3.4 - timer) * 3.2);
    const fadeOut = Math.min(1, timer * 1.4);
    const alpha = Math.max(0, Math.min(fadeIn, fadeOut));
    if (alpha <= 0.01) return;

    const cx = W / 2;
    const cy = 112 - (1 - alpha) * 10;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';

    const title = `第 ${stage.id} 关 · ${stage.name}`;
    const sub = stage.introHint || stage.tagline;

    ctx.font = '700 13px "PingFang SC", sans-serif';
    const boxW = Math.max(320, ctx.measureText(sub).width + 52);
    const boxH = 62;

    ctx.fillStyle = 'rgba(255, 253, 248, 0.93)';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#24454d';
    ctx.font = '800 18px "PingFang SC", sans-serif';
    ctx.fillText(title, cx, cy - 5);

    ctx.fillStyle = '#3c7a88';
    ctx.font = '600 12.5px "PingFang SC", sans-serif';
    ctx.fillText(sub, cx, cy + 17);
    ctx.restore();
  }


  // ==================== 热气球撤离「高空阵风」流线与风向指示 ====================
  function drawExtractionGustWorld(ctx, map, time) {
    const gust = CB.extraction && CB.extraction.getActiveGust ? CB.extraction.getActiveGust() : null;
    if (!gust || !map) return;
    const ext = CB.extraction.getExtractCenter ? CB.extraction.getExtractCenter() : null;
    if (!ext) return;

    const ang = Math.atan2(gust.dirY, gust.dirX);
    const stage = map.stage;
    const isDark = !!(stage && stage.palette && stage.palette.isDark);

    ctx.save();
    ctx.translate(ext.x, ext.y);
    ctx.rotate(ang);
    ctx.lineCap = 'round';

    // 14 道穿行撤离平台及周边的流动水彩风痕
    for (let i = 0; i < 14; i++) {
      const laneY = ((i / 13) - 0.5) * 440 + Math.sin(time * 2.4 + i) * 14;
      const cycle = ((time * 1.45 + i * 0.27) % 1);
      const headX = -320 + cycle * 660;
      const len = 72 + (i % 3) * 34;
      const alpha = Math.sin(cycle * Math.PI) * (isDark ? 0.52 : 0.62);

      ctx.strokeStyle = i % 3 === 0
        ? `rgba(255, 245, 196, ${alpha})`
        : `rgba(142, 236, 255, ${alpha})`;
      ctx.lineWidth = i % 2 === 0 ? 3.0 : 2.0;
      ctx.beginPath();
      ctx.moveTo(headX - len, laneY);
      ctx.quadraticCurveTo(headX - len * 0.45, laneY + Math.sin(time * 6 + i) * 9, headX, laneY);
      ctx.stroke();

      // 顺风小花瓣/星尘粒
      if (i % 2 === 0) {
        ctx.fillStyle = isDark ? `rgba(255, 232, 134, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(headX + 8, laneY, 4.2, 2.2, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 中央地面轻透顺风指示双箭头
    const chevShift = ((time * 65) % 44) - 22;
    ctx.strokeStyle = isDark ? 'rgba(255, 232, 128, 0.48)' : 'rgba(32, 168, 212, 0.46)';
    ctx.lineWidth = 3.2;
    [-36, 0, 36].forEach((ox) => {
      const x = ox + chevShift;
      ctx.beginPath();
      ctx.moveTo(x - 10, -16);
      ctx.lineTo(x + 8, 0);
      ctx.lineTo(x - 10, 16);
      ctx.stroke();
    });

    ctx.restore();
  }

  function drawExtractionGustBanner(ctx, W, time) {
    const gust = CB.extraction && CB.extraction.getActiveGust ? CB.extraction.getActiveGust() : null;
    if (!gust) return;

    const pulse = 0.92 + 0.08 * Math.sin(time * 8);
    const cx = W / 2;
    const cy = 76;
    const text = `🌬️ 云海高空阵风（${gust.label}）· 顺风击退/台球 +45%`;

    ctx.save();
    ctx.font = '800 13px "PingFang SC", sans-serif';
    const boxW = ctx.measureText(text).width + 44;
    const boxH = 34;

    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(26, 132, 174, 0.92)';
    ctx.strokeStyle = '#fff5cc';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 999);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0.5);
    ctx.restore();
  }

  CB.renderer = { initRenderer, refreshStageTheme, renderWorld };
})();
