/* ===== 无视频时的 12 景国风工笔水墨动态画卷（完全替代旧版模糊光点人形） ===== */
class ProceduralFilmFallback {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.paperPattern = createPaperGrainPattern(this.ctx, 256);
    this.active = false;
    this.flower = null;
    this.startTime = 0;
    this.duration = 6.5;
    this.motes = [];
    this.resize();
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  start(flower, duration = 6.5) {
    this.flower = flower;
    this.duration = duration;
    this.startTime = performance.now() / 1000;
    this.active = true;
    let seed = 104729 + (flower?.id || 1) * 7919;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    this.motes = Array.from({ length: 42 }, (_, i) => ({
      x: rand(),
      y: rand(),
      vx: (rand() - 0.5) * 0.04,
      vy: 0.02 + rand() * 0.05,
      size: 0.5 + rand() * 1.15,
      phase: rand() * Math.PI * 2,
      idx: i,
    }));
  }
  stop() { this.active = false; }

  /* --- 通用工笔水墨绘制原语 --- */
  drawInkBranch(ctx, p0, p1, p2, w0, w1, color, progress = 1) {
    const steps = 22, maxS = Math.floor(steps * Math.max(0, Math.min(1, progress)));
    if (maxS < 1) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    for (let i = 0; i < maxS; i++) {
      const t0 = i / steps, a = evalQuad(p0, p1, p2, t0), b = evalQuad(p0, p1, p2, (i + 1) / steps);
      ctx.lineWidth = Math.max(0.8, (w0 + (w1 - w0) * t0) * (1 + Math.sin(t0 * Math.PI * 4) * 0.1));
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }

  drawLeaf(ctx, x, y, ang, len, wid, fill, vein = "rgba(255,255,255,0.16)", scale = 1) {
    if (scale <= 0.02) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.28, -wid, len * 0.74, -wid * 0.78, len, 0);
    ctx.bezierCurveTo(len * 0.74, wid * 0.78, len * 0.28, wid, 0, 0);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = vein; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(len * 0.86, 0); ctx.stroke();
    ctx.restore();
  }

  drawMoon(ctx, x, y, r, pal, alpha = 1) {
    ctx.save();
    // 克制的宣纸淡月晕（去除数码光斑感）
    const halo = ctx.createRadialGradient(x, y, r * 0.72, x, y, r * 1.75);
    halo.addColorStop(0, rgba(pal.glow, 0.16 * alpha));
    halo.addColorStop(0.55, rgba(pal.mist, 0.06 * alpha));
    halo.addColorStop(1, rgba(pal.bg_deep, 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(x, y, r * 1.75, 0, Math.PI * 2); ctx.fill();

    const disc = ctx.createRadialGradient(x - r * 0.18, y - r * 0.18, r * 0.1, x, y, r);
    disc.addColorStop(0, rgba(pal.glow, 0.88 * alpha));
    disc.addColorStop(0.82, rgba(pal.primary, 0.42 * alpha));
    disc.addColorStop(1, rgba(pal.mist, 0.16 * alpha));
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawFivePetalBloom(ctx, x, y, rad, pal, scale = 1, rot = 0, roundPetals = false) {
    if (scale <= 0.02) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(scale, scale);
    for (let p = 0; p < 5; p++) {
      ctx.save(); ctx.rotate((p / 5) * Math.PI * 2);
      if (roundPetals) {
        const px = rad * 0.58;
        const pg = ctx.createRadialGradient(px * 0.4, 0, 1, px, 0, rad * 0.65);
        pg.addColorStop(0, rgba(pal.accent, 0.88));
        pg.addColorStop(0.55, rgba(pal.primary, 0.95));
        pg.addColorStop(1, rgba(pal.glow, 0.98));
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(px, 0, rad * 0.48, 0, Math.PI * 2); ctx.fill();
      } else {
        const pg = ctx.createLinearGradient(0, 0, rad, 0);
        pg.addColorStop(0, rgba(pal.accent, 0.85));
        pg.addColorStop(0.6, rgba(pal.primary, 0.94));
        pg.addColorStop(1, rgba(pal.glow, 0.96));
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(rad * 0.35, -rad * 0.52, rad * 0.92, -rad * 0.4, rad, 0);
        ctx.bezierCurveTo(rad * 0.92, rad * 0.4, rad * 0.35, rad * 0.52, 0, 0);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // 细密花蕊
    ctx.strokeStyle = "rgba(248, 224, 162, 0.85)";
    ctx.lineWidth = 0.85;
    for (let s = 0; s < 9; s++) {
      const a = (s / 9) * Math.PI * 2, l = rad * (0.34 + (s % 2) * 0.09);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l); ctx.stroke();
      ctx.fillStyle = "#fce4a6";
      ctx.beginPath(); ctx.arc(Math.cos(a) * l, Math.sin(a) * l, 1.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  drawPeonyBloom(ctx, x, y, rad, pal, scale = 1, t = 0) {
    if (scale <= 0.02) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    const rings = [
      { cnt: 11, r: rad, col: pal.mist, a: 0.74 },
      { cnt: 10, r: rad * 0.82, col: pal.primary, a: 0.88 },
      { cnt: 8, r: rad * 0.62, col: pal.glow, a: 0.86 },
      { cnt: 6, r: rad * 0.42, col: pal.primary, a: 0.94 },
    ];
    rings.forEach((ring, ri) => {
      for (let i = 0; i < ring.cnt; i++) {
        ctx.save();
        ctx.rotate((i / ring.cnt) * Math.PI * 2 + ri * 0.42 + Math.sin(t * 0.5 + ri) * 0.03);
        ctx.fillStyle = rgba(ring.col, ring.a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(ring.r * 0.42, -ring.r * 0.52, ring.r * 0.9, -ring.r * 0.42, ring.r, -ring.r * 0.12);
        ctx.quadraticCurveTo(ring.r * 1.08, 0, ring.r, ring.r * 0.12);
        ctx.bezierCurveTo(ring.r * 0.9, ring.r * 0.42, ring.r * 0.42, ring.r * 0.52, 0, 0);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = rgba(pal.glow, 0.2); ctx.lineWidth = 0.8; ctx.stroke();
        ctx.restore();
      }
    });
    // 鎏金花蕊
    const core = ctx.createRadialGradient(0, 0, 2, 0, 0, rad * 0.26);
    core.addColorStop(0, "#fff4c2");
    core.addColorStop(0.55, rgba(pal.accent, 0.96));
    core.addColorStop(1, rgba(pal.accent, 0));
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(0, 0, rad * 0.26, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawLotusBloom(ctx, x, y, rad, pal, scale = 1, openAmt = 1) {
    if (scale <= 0.02) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    const tiers = [
      { cnt: 7, spread: 1.32 * openAmt, len: rad, wid: rad * 0.28, a: 0.82 },
      { cnt: 5, spread: 0.92 * openAmt, len: rad * 0.92, wid: rad * 0.26, a: 0.92 },
      { cnt: 3, spread: 0.44 * openAmt, len: rad * 0.78, wid: rad * 0.24, a: 0.98 },
    ];
    tiers.forEach((tier) => {
      for (let i = 0; i < tier.cnt; i++) {
        const frac = tier.cnt === 1 ? 0 : (i / (tier.cnt - 1)) * 2 - 1;
        ctx.save(); ctx.rotate(-Math.PI / 2 + frac * tier.spread);
        const pg = ctx.createLinearGradient(0, 0, tier.len, 0);
        pg.addColorStop(0, rgba(pal.glow, tier.a));
        pg.addColorStop(0.58, rgba(pal.primary, tier.a));
        pg.addColorStop(1, "rgba(218, 92, 128, 0.96)");
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(tier.len * 0.46, -tier.wid, tier.len, 0);
        ctx.quadraticCurveTo(tier.len * 0.46, tier.wid, 0, 0);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    });
    ctx.fillStyle = "rgba(240, 206, 98, 0.95)";
    ctx.beginPath(); ctx.ellipse(0, -rad * 0.16, rad * 0.18, rad * 0.11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* --- 12 花专属诗意动态场景 --- */
  drawScenePlum(ctx, w, h, t, u, pal) {
    // 正月梅花：宋画册页式雪夜疏梅（彻底撤除矢量月洞窗、高亮光球与复制贴图花朵）
    const minDim = Math.min(w, h);

    // 1. 远景微茫雪山淡墨轮廓
    ctx.fillStyle = rgba(pal.bg_mid, 0.48);
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.72);
    ctx.quadraticCurveTo(w * 0.22, h * 0.62, w * 0.46, h * 0.71);
    ctx.quadraticCurveTo(w * 0.74, h * 0.63, w, h * 0.73);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // 2. 素雅宣纸留白冷月（极淡纸晕，绝不做亮白高斯发光球）
    const mx = w * 0.44, my = h * 0.38, mr = minDim * 0.165;
    const moonDisc = ctx.createRadialGradient(mx - mr * 0.18, my - mr * 0.16, mr * 0.12, mx, my, mr);
    moonDisc.addColorStop(0, "rgba(232, 236, 240, 0.34)");
    moonDisc.addColorStop(0.75, "rgba(186, 198, 212, 0.18)");
    moonDisc.addColorStop(1, "rgba(128, 148, 168, 0.04)");
    ctx.fillStyle = moonDisc;
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    // 淡淡月廓与横掠轻云
    ctx.strokeStyle = "rgba(226, 232, 240, 0.14)";
    ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.stroke();

    ctx.save();
    for (let c = 0; c < 2; c++) {
      const cx = mx + (c === 0 ? -42 : 48) + Math.sin(t * 0.22 + c) * 16;
      const cy = my + (c === 0 ? 28 : -18);
      const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, mr * 0.9);
      cg.addColorStop(0, rgba(pal.bg_deep, 0.44));
      cg.addColorStop(1, rgba(pal.bg_deep, 0));
      ctx.fillStyle = cg;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(2.1, 0.32);
      ctx.beginPath(); ctx.arc(0, 0, mr * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // 3. 左下角覆雪淡墨崖石（压住画面左下角，形成留白呼吸）
    drawTaihuRock(ctx, w * 0.24, h * 0.84, minDim * 0.32, minDim * 0.24, pal, 0.72, 91);
    ctx.strokeStyle = "rgba(232, 238, 244, 0.32)";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(w * 0.12, h * 0.75);
    ctx.quadraticCurveTo(w * 0.23, h * 0.69, w * 0.34, h * 0.77);
    ctx.stroke();

    // 4. 焦墨虬劲老梅干“横斜”破月而出（多节曲折拐角，绝非直棍）
    const sway = Math.sin(t * 0.68) * 5;
    const grow = easeOutCubic(Math.min(1, u * 1.85));
    const trunkPts = [
      { x: w * 0.94, y: h * 0.92 },
      { x: w * 0.79, y: h * 0.69 + sway * 0.15 },
      { x: w * 0.69, y: h * 0.56 + sway * 0.3 },
      { x: w * 0.56, y: h * 0.43 + sway * 0.5 },
      { x: w * 0.41, y: h * 0.35 + sway * 0.7 },
      { x: w * 0.27, y: h * 0.27 + sway * 0.85 },
    ];
    drawGnarledBranch(ctx, trunkPts, 19, 2.2, "rgba(18, 22, 30, 0.96)", grow, 15);

    // 穿插新梢（上挑、下垂、斜出，形成“疏影横斜”）
    const gA = Math.max(0, (grow - 0.18) / 0.75);
    const twigA = [
      trunkPts[2],
      { x: w * 0.61, y: h * 0.64 + sway * 0.4 },
      { x: w * 0.48, y: h * 0.67 + sway * 0.6 },
    ];
    drawGnarledBranch(ctx, twigA, 6.8, 1.2, "rgba(20, 24, 32, 0.94)", gA, 29);

    const gB = Math.max(0, (grow - 0.26) / 0.72);
    const twigB = [
      trunkPts[3],
      { x: w * 0.60, y: h * 0.26 + sway * 0.45 },
      { x: w * 0.68, y: h * 0.16 + sway * 0.55 },
    ];
    drawGnarledBranch(ctx, twigB, 5.8, 1.1, "rgba(20, 24, 32, 0.92)", gB, 43);

    const gC = Math.max(0, (grow - 0.34) / 0.66);
    const twigC = [
      trunkPts[4],
      { x: w * 0.38, y: h * 0.48 + sway * 0.7 },
      { x: w * 0.32, y: h * 0.53 + sway * 0.85 },
    ];
    drawGnarledBranch(ctx, twigC, 4.4, 1.0, "rgba(22, 26, 34, 0.90)", gC, 61);

    // 5. 疏密有致的多姿态写意寒梅（正面 / 侧视 / 背花 / 朱砂小蕾交错点染）
    const flowers = [
      { x: trunkPts[2].x - 10, y: trunkPts[2].y - 12, s: 21, pose: "front", rot: -0.35, d: 0.14 },
      { x: trunkPts[2].x + 18, y: trunkPts[2].y + 8,  s: 15, pose: "back",  rot: 0.9,   d: 0.18 },
      { x: twigA[1].x - 6,     y: twigA[1].y - 8,     s: 17, pose: "side",  rot: -2.3,  d: 0.22 },
      { x: twigA[2].x + 6,     y: twigA[2].y - 4,     s: 12, pose: "bud",   rot: -1.8,  d: 0.28 },
      { x: trunkPts[3].x - 8,  y: trunkPts[3].y - 14, s: 22, pose: "front", rot: 0.55,  d: 0.18 },
      { x: trunkPts[3].x + 14, y: trunkPts[3].y + 10, s: 16, pose: "side",  rot: 0.45,  d: 0.24 },
      { x: twigB[1].x - 4,     y: twigB[1].y - 4,     s: 18, pose: "front", rot: 1.1,   d: 0.26 },
      { x: twigB[2].x - 6,     y: twigB[2].y + 8,     s: 13, pose: "bud",   rot: 0.4,   d: 0.32 },
      { x: trunkPts[4].x + 4,  y: trunkPts[4].y - 10, s: 18, pose: "side",  rot: -1.9,  d: 0.24 },
      { x: twigC[1].x - 8,     y: twigC[1].y + 4,     s: 15, pose: "back",  rot: -0.6,  d: 0.30 },
      { x: twigC[2].x + 2,     y: twigC[2].y + 2,     s: 11, pose: "bud",   rot: -2.4,  d: 0.36 },
      { x: trunkPts[5].x + 16, y: trunkPts[5].y + 6,  s: 16, pose: "front", rot: -0.9,  d: 0.32 },
      { x: trunkPts[5].x - 4,  y: trunkPts[5].y - 3,  s: 11, pose: "bud",   rot: -0.8,  d: 0.38 },
    ];
    flowers.forEach((f, idx) => {
      const sc = easeOutCubic(Math.max(0, (u - f.d * 0.65) * 2.1));
      drawArtisticPlum(ctx, f.x, f.y, f.s, pal, sc, f.pose, f.rot, idx + 19);
    });

    // 6. 宣纸留白式细雪轻飘（不规则柔和雪点）
    for (let i = 0; i < 28; i++) {
      const m = this.motes[i];
      const sx = ((m.x - t * 0.025 + Math.sin(t * 0.9 + m.phase) * 0.015 + 10) % 1) * w;
      const sy = ((m.y + t * (0.045 + m.size * 0.022)) % 1) * h;
      ctx.fillStyle = `rgba(242, 246, 250, ${0.24 + (i % 3) * 0.14})`;
      ctx.beginPath(); ctx.arc(sx, sy, 1.3 + m.size * 1.1, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawSceneApricot(ctx, w, h, t, u, pal) {
    // 二月杏花：江南粉墙黛瓦 · 细雨杏巷 · 檐下暖灯
    const wallY = h * 0.54;
    // 远景马头墙叠影
    ctx.fillStyle = rgba(pal.bg_mid, 0.72);
    ctx.beginPath();
    ctx.moveTo(0, h); ctx.lineTo(0, h * 0.42);
    ctx.lineTo(w * 0.14, h * 0.42); ctx.lineTo(w * 0.14, h * 0.49);
    ctx.lineTo(w * 0.26, h * 0.49); ctx.lineTo(w * 0.26, h * 0.56);
    ctx.lineTo(w * 0.42, h * 0.56); ctx.lineTo(w * 0.42, h); ctx.closePath(); ctx.fill();

    // 右侧粉墙主体与黛瓦飞檐
    const wallGrad = ctx.createLinearGradient(w * 0.55, wallY, w * 0.55, h);
    wallGrad.addColorStop(0, "rgba(232, 224, 214, 0.18)");
    wallGrad.addColorStop(1, "rgba(24, 20, 26, 0.78)");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(w * 0.52, wallY, w * 0.48, h - wallY);

    // 飞檐黛瓦
    ctx.fillStyle = rgba(pal.ink, 0.92);
    ctx.beginPath();
    ctx.moveTo(w * 0.46, wallY + 6);
    ctx.quadraticCurveTo(w * 0.62, wallY - 10, w * 1.02, wallY - 26);
    ctx.lineTo(w * 1.02, wallY + 12);
    ctx.lineTo(w * 0.50, wallY + 18); ctx.closePath(); ctx.fill();

    // 檐下暖纸灯笼
    const lx = w * 0.56, ly = wallY + 58 + Math.sin(t * 1.6) * 2.5;
    ctx.strokeStyle = rgba(pal.mist, 0.6); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(lx, wallY + 12); ctx.lineTo(lx, ly - 18); ctx.stroke();
    const lg = ctx.createRadialGradient(lx, ly, 4, lx, ly, 120);
    lg.addColorStop(0, "rgba(255, 224, 178, 0.48)");
    lg.addColorStop(0.45, rgba(pal.accent, 0.16));
    lg.addColorStop(1, rgba(pal.bg_deep, 0));
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, 120, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255, 226, 186, 0.85)";
    ctx.beginPath(); ctx.ellipse(lx, ly, 12, 18, 0, 0, Math.PI * 2); ctx.fill();

    // 探出粉墙的一枝春杏
    const sway = Math.sin(t * 0.9) * 8;
    const grow = easeOutCubic(Math.min(1, u * 1.8));
    const p0 = { x: w * 0.86, y: wallY - 4 };
    const p1 = { x: w * 0.64, y: h * 0.34 + sway * 0.4 };
    const p2 = { x: w * 0.30, y: h * 0.36 + sway };
    this.drawInkBranch(ctx, p0, p1, p2, 14, 2.2, "rgba(38, 28, 32, 0.92)", grow);

    const sub = evalQuad(p0, p1, p2, 0.48);
    const subE = { x: sub.x - w * 0.16, y: sub.y - h * 0.14 + sway * 0.5 };
    this.drawInkBranch(ctx, sub, { x: sub.x - w * 0.08, y: sub.y - h * 0.05 }, subE, 6.5, 1.2, "rgba(38, 28, 32, 0.9)", Math.max(0, (grow - 0.25) / 0.75));

    [0.28, 0.46, 0.64, 0.82, 0.95].forEach((pos, idx) => {
      const pt = evalQuad(p0, p1, p2, pos);
      const sc = easeOutCubic(Math.max(0, (u - idx * 0.06) * 2.1));
      this.drawFivePetalBloom(ctx, pt.x, pt.y, 17 + (idx % 3) * 4, pal, sc, idx * 0.7, true);
    });
    this.drawFivePetalBloom(ctx, subE.x, subE.y, 18, pal, easeOutCubic(Math.max(0, (u - 0.3) * 2)), 0.4, true);

    // 细斜春雨与檐上水花
    ctx.strokeStyle = rgba(pal.glow, 0.32); ctx.lineWidth = 0.9;
    for (const m of this.motes) {
      const rx = ((m.x - t * 0.08 + 10) % 1) * w;
      const ry = ((m.y + t * (0.45 + m.size * 0.15)) % 1) * h;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 9, ry + 34 * m.size); ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const rp = (t * 1.1 + i * 0.27) % 1;
      const sx = w * (0.56 + i * 0.1), sy = wallY - 6 - i * 4;
      ctx.strokeStyle = rgba(pal.glow, (1 - rp) * 0.45);
      ctx.beginPath(); ctx.ellipse(sx, sy, 4 + rp * 18, 2 + rp * 5, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  drawScenePeach(ctx, w, h, t, u, pal) {
    // 三月桃花：桃林春溪 · 远山扁舟 · 灼灼落英
    const waterY = h * 0.62;
    // 远山粉岚
    ctx.fillStyle = rgba(pal.mist, 0.28);
    ctx.beginPath(); ctx.moveTo(0, waterY);
    for (let x = 0; x <= w; x += 24) {
      ctx.lineTo(x, waterY - h * 0.14 - Math.sin(x * 0.004 + 1.1) * h * 0.07 - Math.cos(x * 0.009) * h * 0.03);
    }
    ctx.lineTo(w, waterY); ctx.closePath(); ctx.fill();

    // 春溪水面与柔和霞光倒影
    const wg = ctx.createLinearGradient(0, waterY, 0, h);
    wg.addColorStop(0, rgba(pal.primary, 0.18));
    wg.addColorStop(0.45, rgba(pal.bg_mid, 0.82));
    wg.addColorStop(1, rgba(pal.bg_deep, 0.96));
    ctx.fillStyle = wg; ctx.fillRect(0, waterY, w, h - waterY);

    // 水面轻舟缓缓漂过
    const bx = w * (0.34 + u * 0.22), by = waterY + h * 0.14 + Math.sin(t * 1.4) * 2.5;
    ctx.save(); ctx.translate(bx, by);
    // 尾波涟漪
    ctx.strokeStyle = rgba(pal.glow, 0.34); ctx.lineWidth = 1.1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-28 * i, 6, 18 + i * 16, 3 + i * 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 船身与乌篷剪影
    ctx.fillStyle = rgba(pal.ink, 0.9);
    ctx.beginPath();
    ctx.moveTo(-46, 0); ctx.quadraticCurveTo(0, 15, 48, -2);
    ctx.quadraticCurveTo(8, 6, -46, 0); ctx.fill();
    ctx.beginPath();
    ctx.arc(-4, -1, 16, Math.PI, 0); ctx.fill();
    ctx.restore();

    // 左右双桃枝夹岸入画
    const sway = Math.sin(t * 0.95) * 9;
    const grow = easeOutCubic(Math.min(1, u * 1.8));
    const branches = [
      { p0: { x: -w * 0.02, y: h * 0.22 }, p1: { x: w * 0.22, y: h * 0.34 + sway * 0.4 }, p2: { x: w * 0.44, y: h * 0.26 + sway } },
      { p0: { x: w * 1.02, y: h * 0.16 }, p1: { x: w * 0.78, y: h * 0.34 - sway * 0.3 }, p2: { x: w * 0.56, y: h * 0.32 - sway * 0.8 } },
    ];
    branches.forEach((br, bi) => {
      this.drawInkBranch(ctx, br.p0, br.p1, br.p2, 15, 2.4, "rgba(42, 24, 30, 0.92)", grow);
      [0.32, 0.55, 0.76, 0.94].forEach((pos, idx) => {
        const pt = evalQuad(br.p0, br.p1, br.p2, pos);
        const ang = Math.atan2(pt.ty, pt.tx);
        const sc = easeOutCubic(Math.max(0, (u - idx * 0.05) * 2.0));
        this.drawLeaf(ctx, pt.x, pt.y, ang + 0.75, 52, 9, "rgba(48, 78, 56, 0.78)", "rgba(160, 195, 155, 0.25)", sc);
        this.drawFivePetalBloom(ctx, pt.x, pt.y, 20 + ((idx + bi) % 3) * 4, pal, sc, idx + bi, false);
      });
    });

    // 落英拂水飘飞
    for (const m of this.motes) {
      const px = ((m.x + t * 0.07 + Math.sin(t + m.phase) * 0.02) % 1) * w;
      const py = ((m.y + t * 0.06) % 1) * h;
      ctx.save(); ctx.translate(px, py); ctx.rotate(t * 1.2 + m.phase);
      ctx.fillStyle = rgba(pal.primary, 0.68);
      ctx.beginPath(); ctx.ellipse(0, 0, 5.5 * m.size, 2.7 * m.size, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  drawScenePeony(ctx, w, h, t, u, pal) {
    // 四月牡丹：太湖石畔 · 折枝国色 · 洒金宣纸（彻底撤除僵硬朱栏与 AI 光柱）
    const cx = w * 0.54, cy = h * 0.47;
    const minDim = Math.min(w, h);

    // 淡墨流云轻岚托底（不抢花冠，不用霓虹光斑）
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const mx = w * (0.34 + i * 0.22 + Math.sin(t * 0.18 + i) * 0.03);
      const my = h * (0.32 + i * 0.16);
      const mr = minDim * (0.28 + i * 0.05);
      const cg = ctx.createRadialGradient(mx, my, mr * 0.1, mx, my, mr);
      cg.addColorStop(0, rgba(pal.mist, 0.10));
      cg.addColorStop(1, rgba(pal.bg_deep, 0));
      ctx.fillStyle = cg;
      ctx.save(); ctx.translate(mx, my); ctx.scale(1.65, 0.55);
      ctx.beginPath(); ctx.arc(0, 0, mr, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // 庭院淡墨太湖石（右侧沉稳托底 + 左下小石呼应）
    drawTaihuRock(ctx, w * 0.72, h * 0.76, minDim * 0.36, minDim * 0.42, pal, 0.88, 53);
    drawTaihuRock(ctx, w * 0.30, h * 0.86, minDim * 0.22, minDim * 0.18, pal, 0.58, 89);

    // 苍劲木本牡丹主干与斜出老枝
    const sway = Math.sin(t * 0.62) * 5;
    const grow = easeOutCubic(Math.min(1, u * 1.75));
    const mainP0 = { x: w * 0.66, y: h * 0.94 };
    const mainP1 = { x: w * 0.59, y: h * 0.70 };
    const mainP2 = { x: cx + sway, y: cy + 18 };
    this.drawInkBranch(ctx, mainP0, mainP1, mainP2, 13, 4.5, "rgba(38, 26, 26, 0.94)", grow);

    const leftBranchG = Math.max(0, (grow - 0.14) / 0.86);
    const leftEnd = { x: cx - minDim * 0.21 + sway * 0.7, y: cy + minDim * 0.10 };
    this.drawInkBranch(ctx, { x: w * 0.61, y: h * 0.76 }, { x: cx - minDim * 0.10, y: cy + minDim * 0.14 }, leftEnd, 7.5, 3.0, "rgba(42, 28, 28, 0.9)", leftBranchG);

    const budBranchG = Math.max(0, (grow - 0.20) / 0.80);
    const budEnd = { x: cx + minDim * 0.19 + sway * 0.55, y: cy - minDim * 0.11 };
    this.drawInkBranch(ctx, { x: w * 0.60, y: h * 0.68 }, { x: cx + minDim * 0.12, y: cy - minDim * 0.02 }, budEnd, 6.2, 2.4, "rgba(42, 28, 28, 0.88)", budBranchG);

    // 真实三裂掌状牡丹复叶（层次错落，石绿花青托红花）
    const leafSpecs = [
      { x: cx - minDim * 0.08, y: cy + minDim * 0.09, a: 2.55, s: 1.18, d: 0.06 },
      { x: cx + minDim * 0.08, y: cy + minDim * 0.07, a: 0.42, s: 1.14, d: 0.09 },
      { x: cx - minDim * 0.06, y: cy - minDim * 0.08, a: -2.28, s: 0.96, d: 0.12 },
      { x: leftEnd.x - 16, y: leftEnd.y + 24, a: 2.15, s: 0.94, d: 0.16 },
      { x: budEnd.x - 24, y: budEnd.y + 30, a: -0.45, s: 0.86, d: 0.20 },
    ];
    leafSpecs.forEach((ls) => {
      const sc = easeOutCubic(Math.max(0, (u - ls.d) * 2.0)) * ls.s;
      drawPeonyLeafCluster(ctx, ls.x + sway * 0.5, ls.y, ls.a, sc, pal);
    });

    // 一主、一侧、一蕾：3/4 立体工笔牡丹
    const mainR = minDim * 0.142;
    drawArtisticPeony(ctx, leftEnd.x, leftEnd.y - 6, mainR * 0.68, pal, easeOutCubic(Math.max(0, (u - 0.16) * 1.9)), t + 1.4, 2);
    drawPeonyBud(ctx, budEnd.x, budEnd.y, mainR * 0.36, 0.22, easeOutCubic(Math.max(0, (u - 0.22) * 2.0)), pal);
    drawArtisticPeony(ctx, cx + sway, cy, mainR, pal, easeOutCubic(Math.max(0, (u - 0.08) * 1.75)), t, 1);

    // 传统宣纸细碎洒金箔片（极克制、自然呼吸）
    for (let i = 0; i < 18; i++) {
      const m = this.motes[i];
      const px = m.x * w, py = ((m.y - t * 0.018 + 10) % 1) * h;
      const a = 0.20 + 0.32 * Math.sin(t * 1.9 + m.phase);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(m.phase + t * 0.3);
      ctx.fillStyle = rgba(pal.accent, a);
      ctx.fillRect(-2.0 * m.size, -1.2 * m.size, 4.0 * m.size, 2.4 * m.size);
      ctx.restore();
    }
  }

  drawScenePomegranate(ctx, w, h, t, u, pal) {
    // 五月石榴：榴火初夏 · 八角花窗 · 浓绿万枝一点红
    const cx = w * 0.56, cy = h * 0.48, r = Math.min(w, h) * 0.34;
    // 庭院手绘八角花窗轮廓与柔和初夏暖纸光
    const sun = ctx.createRadialGradient(cx, cy - r * 0.08, 12, cx, cy, r * 1.25);
    sun.addColorStop(0, rgba(pal.accent, 0.16));
    sun.addColorStop(0.55, rgba(pal.primary, 0.06));
    sun.addColorStop(1, rgba(pal.bg_deep, 0));
    ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(cx, cy, r * 1.25, 0, Math.PI * 2); ctx.fill();

    drawHandPolygon(ctx, cx, cy, r, 8, Math.PI / 8, 2.2, rgba(pal.accent, 0.38), 2.1, 71);
    drawHandPolygon(ctx, cx, cy, r + 9, 8, Math.PI / 8, 0.9, rgba(pal.mist, 0.22), 1.6, 83);

    // 浓绿石榴枝叶与绯红花果
    const sway = Math.sin(t * 1.05) * 7;
    const grow = easeOutCubic(Math.min(1, u * 1.8));
    const p0 = { x: w * 0.96, y: h * 0.24 }, p1 = { x: w * 0.66, y: h * 0.42 + sway * 0.4 }, p2 = { x: w * 0.34, y: h * 0.54 + sway };
    this.drawInkBranch(ctx, p0, p1, p2, 15, 2.8, "rgba(42, 28, 22, 0.94)", grow);

    [0.24, 0.38, 0.52, 0.68, 0.82, 0.94].forEach((pos, idx) => {
      const pt = evalQuad(p0, p1, p2, pos), ang = Math.atan2(pt.ty, pt.tx);
      const sc = easeOutCubic(Math.max(0, (u - idx * 0.05) * 2.2));
      this.drawLeaf(ctx, pt.x, pt.y, ang - 0.9, 64, 15, "rgba(26, 66, 40, 0.92)", "rgba(128, 178, 118, 0.3)", sc);
      this.drawLeaf(ctx, pt.x, pt.y, ang + 0.85, 58, 14, "rgba(34, 82, 48, 0.88)", "rgba(138, 188, 128, 0.28)", sc);
      if (idx === 2 || idx === 4) {
        // 饱满红榴果垂枝
        ctx.save(); ctx.translate(pt.x, pt.y + 28 * sc); ctx.scale(sc, sc);
        const fg = ctx.createRadialGradient(-8, -8, 2, 0, 0, 26);
        fg.addColorStop(0, "#ffb97a");
        fg.addColorStop(0.45, rgba(pal.primary, 0.96));
        fg.addColorStop(1, "rgba(138, 28, 20, 0.96)");
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
        // 榴果花冠蒂
        ctx.fillStyle = "rgba(166, 42, 28, 0.95)";
        ctx.beginPath(); ctx.moveTo(-7, 22); ctx.lineTo(-4, 30); ctx.lineTo(0, 24); ctx.lineTo(4, 30); ctx.lineTo(7, 22); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else {
        // 炽烈石榴花
        ctx.save(); ctx.translate(pt.x, pt.y); ctx.scale(sc, sc);
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + idx;
          ctx.fillStyle = k % 2 === 0 ? rgba(pal.primary, 0.94) : rgba(pal.accent, 0.88);
          ctx.beginPath(); ctx.ellipse(Math.cos(a) * 14, Math.sin(a) * 14, 15, 9, a + 0.3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = "#ffe5a3"; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    });
  }

  drawSceneLotus(ctx, w, h, t, u, pal) {
    // 六月荷花：宋画莲池清韵 · 舒卷荷叶 · 舟瓣红莲与嫩绿莲蓬 · 碧池流萤
    const horizon = h * 0.56;
    const minDim = Math.min(w, h);

    // 淡青碧水渐隐远景
    const water = ctx.createLinearGradient(0, horizon, 0, h);
    water.addColorStop(0, rgba(pal.bg_mid, 0.54));
    water.addColorStop(1, rgba(pal.bg_deep, 0.96));
    ctx.fillStyle = water;
    ctx.fillRect(0, horizon, w, h - horizon);

    // 素雅远月淡映池上
    this.drawMoon(ctx, w * 0.32, h * 0.27, minDim * 0.095, pal, 0.72);

    // 柔和断续水波弧纹
    for (let i = 0; i < 4; i++) {
      const rp = (t * 0.25 + i * 0.25) % 1;
      const rx = w * (0.48 + (i % 2) * 0.15), ry = h * (0.76 + (i % 3) * 0.045);
      const rad = 28 + rp * 145;
      ctx.strokeStyle = rgba(pal.mist, (1 - rp) * 0.26);
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(rx, ry, rad, rad * 0.22, 0, 0.25, Math.PI - 0.25);
      ctx.stroke();
    }

    const sway = Math.sin(t * 0.68) * 6;
    const grow = easeOutCubic(Math.min(1, u * 1.75));

    // 后景高叶 + 前景宽大舒卷荷叶 + 卷筒小嫩叶
    const pads = [
      { bx: 0.72, lx: 0.74, ly: 0.62, rx: 146, ry: 52, rot: 0.07, d: 0.00, s: 13 },
      { bx: 0.42, lx: 0.39, ly: 0.69, rx: 124, ry: 44, rot: -0.09, d: 0.08, s: 29 },
      { bx: 0.58, lx: 0.62, ly: 0.79, rx: 108, ry: 38, rot: 0.04, d: 0.14, s: 47 },
    ];
    pads.forEach((pd, idx) => {
      const pg = easeOutCubic(Math.max(0, (grow - pd.d) * 1.35));
      if (pg <= 0.02) return;
      const ex = w * pd.lx + sway * (idx === 0 ? -0.45 : 0.55), ey = h * pd.ly;
      this.drawInkBranch(ctx, { x: w * pd.bx, y: h * 1.02 }, { x: (w * pd.bx + ex) * 0.5, y: h * 0.85 }, { x: ex, y: ey }, 6.0, 3.0, "rgba(30, 68, 58, 0.88)", pg);
      drawArtisticLotusPad(ctx, ex, ey, pd.rx, pd.ry, pd.rot, pg, pd.s);
    });

    // 小荷卷叶点缀
    const rollG = easeOutCubic(Math.max(0, (grow - 0.18) * 1.5));
    const rlx = w * 0.33 + sway * 0.4, rly = h * 0.57;
    this.drawInkBranch(ctx, { x: w * 0.36, y: h * 1.02 }, { x: w * 0.34, y: h * 0.80 }, { x: rlx, y: rly }, 4.2, 2.0, "rgba(38, 78, 66, 0.85)", rollG);
    drawRolledLotusLeaf(ctx, rlx, rly, 64, -0.24, rollG);

    // 盛放工笔重瓣红莲 + 右侧含苞花蕾
    const fx = w * 0.54 + sway * 0.65, fy = h * 0.45;
    this.drawInkBranch(ctx, { x: w * 0.56, y: h * 1.02 }, { x: w * 0.52, y: h * 0.74 }, { x: fx, y: fy }, 8.0, 3.8, "rgba(40, 86, 72, 0.92)", grow);
    const openAmt = 0.52 + 0.48 * easeOutCubic(Math.min(1, u * 1.4));
    drawArtisticLotus(ctx, fx, fy, minDim * 0.132, pal, easeOutCubic(Math.max(0, (u - 0.08) * 1.8)), openAmt, 5);

    const bx = w * 0.66 + sway * 0.45, by = h * 0.52;
    this.drawInkBranch(ctx, { x: w * 0.64, y: h * 1.02 }, { x: w * 0.65, y: h * 0.78 }, { x: bx, y: by }, 5.4, 2.5, "rgba(36, 78, 66, 0.88)", grow);
    drawArtisticLotus(ctx, bx, by, minDim * 0.072, pal, easeOutCubic(Math.max(0, (u - 0.20) * 1.85)), 0.26, 9);

    // 碧池流萤轻点
    for (let i = 0; i < 14; i++) {
      const m = this.motes[i];
      const px = (m.x + Math.sin(t * 0.48 + m.phase) * 0.03) * w;
      const py = (0.34 + m.y * 0.54 + Math.cos(t * 0.65 + m.phase) * 0.022) * h;
      const glow = 0.28 + 0.56 * Math.abs(Math.sin(t * 1.7 + m.phase));
      ctx.fillStyle = rgba(pal.glow, glow * 0.78);
      ctx.beginPath(); ctx.arc(px, py, 2.0 * m.size, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawSceneHollyhock(ctx, w, h, t, u, pal) {
    // 七月蜀葵：五尺阑干遮不尽 · 尚留一半与人看（手绘淡墨竹栏 + 工笔侧仰漏斗花瓣 + 雄蕊柱）
    const railTop = h * 0.58;
    const sway = Math.sin(t * 0.72) * 7;
    const grow = easeOutCubic(Math.min(1, u * 1.75));
    const minDim = Math.min(w, h);

    // 淡雅晚夏霞色宣纸底晕（去紫霓虹感）
    const twilight = ctx.createLinearGradient(0, h * 0.12, 0, h * 0.72);
    twilight.addColorStop(0, rgba(pal.mist, 0.10));
    twilight.addColorStop(0.55, rgba(pal.primary, 0.06));
    twilight.addColorStop(1, rgba(pal.bg_deep, 0));
    ctx.fillStyle = twilight;
    ctx.fillRect(0, 0, w, h * 0.75);

    // 远景庭院粉墙淡影
    ctx.fillStyle = rgba(pal.bg_mid, 0.35);
    ctx.fillRect(w * 0.12, h * 0.62, w * 0.76, h * 0.38);

    // 三株高挺修长蜀葵自五尺阑干后向阳而生
    const stalks = [
      { x: 0.46, topY: 0.25, w0: 9.5, delay: 0.08, seed: 3 },
      { x: 0.57, topY: 0.14, w0: 11.5, delay: 0.0, seed: 7 },
      { x: 0.68, topY: 0.29, w0: 8.5, delay: 0.14, seed: 13 },
    ];
    stalks.forEach((st, si) => {
      const sg = Math.max(0, (grow - st.delay) / (1 - st.delay));
      const p0 = { x: w * st.x, y: h * 0.98 };
      const p1 = { x: w * st.x - 10 + sway * 0.3, y: h * 0.58 };
      const p2 = { x: w * st.x + sway * (0.68 + si * 0.14), y: h * st.topY };
      this.drawInkBranch(ctx, p0, p1, p2, st.w0, 2.0, "rgba(46, 64, 52, 0.9)", sg);

      // 掌状五裂蜀葵宽叶
      [0.24, 0.40, 0.54].forEach((lu, li) => {
        const pt = evalQuad(p0, p1, p2, lu);
        const side = (li + si) % 2 === 0 ? -1 : 1;
        const lsc = easeOutCubic(Math.max(0, (u - st.delay - li * 0.05) * 2.0));
        drawHollyhockLeaf(ctx, pt.x, pt.y, side < 0 ? Math.PI + 0.32 : -0.28, (64 - li * 9) * (si === 1 ? 1.08 : 0.92), lsc);
      });

      // 错落侧仰的工笔漏斗大花（带放射绛紫脉纹 + 乳黄雄蕊柱）
      [0.42, 0.59, 0.74, 0.86].forEach((pos, bi) => {
        if (si !== 1 && bi === 3) return;
        const pt = evalQuad(p0, p1, p2, pos);
        const side = (bi + si) % 2 === 0 ? -1 : 1;
        const sc = easeOutCubic(Math.max(0, (u - st.delay - 0.08 - bi * 0.07) * 2.1));
        const rad = (si === 1 ? 42 : 35) - bi * 4.5;
        drawArtisticHollyhock(ctx, pt.x + side * (rad * 0.58), pt.y, rad, pal, sc, side, st.seed * 10 + bi);
      });

      // 枝顶未开纺锤花苞（自下而上依次开放的真实植物秩序）
      const tipA = evalQuad(p0, p1, p2, 0.94);
      const tipB = evalQuad(p0, p1, p2, 0.99);
      drawHollyhockBud(ctx, tipA.x - 8, tipA.y, 18, -0.25, easeOutCubic(Math.max(0, (u - 0.32 - st.delay) * 2.2)), pal);
      drawHollyhockBud(ctx, tipB.x + 2, tipB.y, 15, 0.08, easeOutCubic(Math.max(0, (u - 0.38 - st.delay) * 2.2)), pal);
    });

    // 前景虚化手绘淡墨五尺木阑干（枯润墨线，半隐蜀葵下部而不抢主体）
    ctx.save();
    // 栏杆阴影遮罩，营造景深
    const railShade = ctx.createLinearGradient(0, railTop, 0, h);
    railShade.addColorStop(0, "rgba(18, 14, 24, 0.14)");
    railShade.addColorStop(1, "rgba(14, 10, 20, 0.62)");
    ctx.fillStyle = railShade;
    ctx.fillRect(w * 0.14, railTop, w * 0.72, h - railTop);

    // 手绘横栏与寻杖
    drawHandLine(ctx, w * 0.14, railTop, w * 0.86, railTop - 2, 6.2, "rgba(26, 20, 32, 0.72)", 2.2, 201);
    drawHandLine(ctx, w * 0.14, railTop + 2, w * 0.86, railTop, 1.2, rgba(pal.mist, 0.24), 1.4, 202);
    drawHandLine(ctx, w * 0.16, railTop + 24, w * 0.84, railTop + 23, 3.0, "rgba(32, 24, 38, 0.58)", 1.8, 203);
    drawHandLine(ctx, w * 0.14, h * 0.86, w * 0.86, h * 0.855, 5.2, "rgba(24, 18, 30, 0.76)", 2.0, 204);

    // 手绘竖棂与望柱
    let idx = 0;
    for (let x = w * 0.18; x <= w * 0.82 + 2; x += w * 0.08) {
      const isPost = idx === 0 || idx === 4 || idx === 8;
      const topY = isPost ? railTop - 14 : railTop;
      drawHandLine(ctx, x, topY, x + 2, h, isPost ? 7.0 : 3.6, isPost ? "rgba(24, 18, 30, 0.78)" : "rgba(32, 24, 40, 0.56)", 1.7, 210 + idx * 7);
      if (isPost) {
        drawHandLine(ctx, x - 5, topY + 2, x + 6, topY + 2, 2.2, rgba(pal.mist, 0.26), 1.0, 260 + idx);
      }
      idx++;
    }
    ctx.restore();
  }

  drawSceneOsmanthus(ctx, w, h, t, u, pal) {
    // 八月桂花：中秋玉轮满月 · 远山飞阁 · 月下金桂纷雨
    const mx = w * 0.56, my = h * 0.42, mr = Math.min(w, h) * 0.24;
    this.drawMoon(ctx, mx, my, mr, pal, 1.0);

    // 淡云横月
    ctx.save();
    for (let i = 0; i < 2; i++) {
      const cx = mx + Math.sin(t * 0.22 + i * 2) * 38 + (i === 0 ? -45 : 55);
      const cy = my + (i === 0 ? -24 : 38);
      const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, mr * 0.85);
      cg.addColorStop(0, rgba(pal.bg_mid, 0.38));
      cg.addColorStop(1, rgba(pal.bg_mid, 0));
      ctx.fillStyle = cg;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1.8, 0.34);
      ctx.beginPath(); ctx.arc(0, 0, mr * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // 远山与山巅亭阁剪影
    ctx.fillStyle = rgba(pal.ink, 0.84);
    ctx.beginPath();
    ctx.moveTo(0, h); ctx.lineTo(0, h * 0.78);
    ctx.quadraticCurveTo(w * 0.24, h * 0.68, w * 0.48, h * 0.79);
    ctx.quadraticCurveTo(w * 0.76, h * 0.70, w, h * 0.77);
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();

    // 远亭飞檐小剪影
    const px = w * 0.24, py = h * 0.725;
    ctx.beginPath();
    ctx.moveTo(px - 22, py); ctx.quadraticCurveTo(px, py - 14, px + 22, py);
    ctx.lineTo(px + 14, py + 4); ctx.lineTo(px + 12, py + 18); ctx.lineTo(px - 12, py + 18);
    ctx.lineTo(px - 14, py + 4); ctx.closePath(); ctx.fill();

    // 剪影桂枝斜掠满月
    const sway = Math.sin(t * 0.75) * 7;
    const grow = easeOutCubic(Math.min(1, u * 1.8));
    const p0 = { x: w * 0.98, y: h * 0.18 }, p1 = { x: w * 0.68, y: h * 0.36 + sway * 0.3 }, p2 = { x: w * 0.36, y: h * 0.46 + sway };
    this.drawInkBranch(ctx, p0, p1, p2, 16, 2.8, "rgba(28, 26, 18, 0.94)", grow);

    [0.28, 0.46, 0.64, 0.80, 0.94].forEach((pos, idx) => {
      const pt = evalQuad(p0, p1, p2, pos), ang = Math.atan2(pt.ty, pt.tx);
      const sc = easeOutCubic(Math.max(0, (u - idx * 0.05) * 2.2));
      this.drawLeaf(ctx, pt.x, pt.y, ang - 0.7, 56, 15, "rgba(34, 48, 34, 0.92)", "rgba(155, 168, 122, 0.3)", sc);
      this.drawLeaf(ctx, pt.x, pt.y, ang + 0.75, 50, 14, "rgba(26, 38, 28, 0.9)", "rgba(145, 158, 112, 0.25)", sc);
      // 簇簇金桂
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + idx, d = (6 + (k % 3) * 7) * sc;
        const fx = pt.x + Math.cos(a) * d, fy = pt.y + Math.sin(a) * d;
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(a);
        ctx.fillStyle = k % 2 === 0 ? rgba(pal.glow, 0.95) : rgba(pal.primary, 0.94);
        for (let q = 0; q < 4; q++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath(); ctx.ellipse(3.6 * sc, 0, 3.2 * sc, 1.9 * sc, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    });

    // 月下细密桂雨飘落
    for (const m of this.motes) {
      const gx = ((m.x - t * 0.03 + Math.sin(t + m.phase) * 0.015 + 10) % 1) * w;
      const gy = ((m.y + t * (0.09 + m.size * 0.04)) % 1) * h;
      ctx.fillStyle = rgba(m.idx % 2 === 0 ? pal.glow : pal.primary, 0.78);
      ctx.beginPath(); ctx.arc(gx, gy, 2.2 * m.size, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawSceneChrysanthemum(ctx, w, h, t, u, pal) {
    // 九月菊花：采菊东篱下 · 悠然见南山 · 秋暮远雁
    // 秋阳落霞暖晕
    const sun = ctx.createRadialGradient(w * 0.36, h * 0.38, 12, w * 0.36, h * 0.42, Math.min(w, h) * 0.44);
    sun.addColorStop(0, rgba(pal.glow, 0.28));
    sun.addColorStop(0.45, rgba(pal.accent, 0.14));
    sun.addColorStop(1, rgba(pal.bg_deep, 0));
    ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(w * 0.36, h * 0.42, Math.min(w, h) * 0.44, 0, Math.PI * 2); ctx.fill();

    // 悠然南山远峰
    ctx.fillStyle = rgba(pal.mist, 0.28);
    ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, h * 0.64);
    ctx.quadraticCurveTo(w * 0.25, h * 0.44, w * 0.52, h * 0.62);
    ctx.quadraticCurveTo(w * 0.78, h * 0.48, w, h * 0.65);
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();

    // 一行远雁斜掠秋空
    ctx.strokeStyle = rgba(pal.ink, 0.72); ctx.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) {
      const gx = w * (0.26 + u * 0.14) + i * 24, gy = h * 0.26 + Math.abs(i - 2) * 11 + Math.sin(t * 4 + i) * 2.5;
      ctx.beginPath();
      ctx.moveTo(gx - 8, gy + 3); ctx.quadraticCurveTo(gx - 3, gy - 4, gx, gy);
      ctx.quadraticCurveTo(gx + 3, gy - 4, gx + 8, gy + 3); ctx.stroke();
    }

    // 手绘东篱枯墨竹笆
    const fenceY = h * 0.72;
    [fenceY, fenceY + 34, fenceY + 68].forEach((fy, fi) => {
      drawHandLine(ctx, w * 0.08, fy, w * 0.92, fy + (fi - 1) * 3, 2.8, "rgba(116, 98, 66, 0.44)", 2.6, 301 + fi * 13);
    });
    let bi = 0;
    for (let x = w * 0.14; x <= w * 0.88; x += w * 0.075) {
      drawHandLine(ctx, x, fenceY - 22 + (bi % 3) * 5, x + 7, h, 2.4, "rgba(104, 88, 58, 0.46)", 2.2, 330 + bi * 9);
      bi++;
    }

    // 东篱金菊三朵绽放
    const sway = Math.sin(t * 0.8) * 7;
    const grow = easeOutCubic(Math.min(1, u * 1.8));
    const heads = [
      { x: w * 0.56 + sway, y: h * 0.45, r: Math.min(w, h) * 0.125, d: 0.05 },
      { x: w * 0.69 + sway * 0.7, y: h * 0.57, r: Math.min(w, h) * 0.095, d: 0.16 },
      { x: w * 0.43 + sway * 0.8, y: h * 0.60, r: Math.min(w, h) * 0.082, d: 0.24 },
    ];
    heads.forEach((hd, idx) => {
      this.drawInkBranch(ctx, { x: hd.x + 18, y: h * 0.98 }, { x: hd.x + 10, y: h * 0.74 }, { x: hd.x, y: hd.y }, 7, 3, "rgba(56, 62, 42, 0.9)", grow);
      const sc = easeOutCubic(Math.max(0, (u - hd.d) * 2.0));
      if (sc <= 0.02) return;
      ctx.save(); ctx.translate(hd.x, hd.y); ctx.scale(sc, sc); ctx.lineCap = "round";
      for (let tier = 0; tier < 3; tier++) {
        const cnt = 26 - tier * 6, len = hd.r * (1 - tier * 0.24);
        ctx.strokeStyle = tier === 2 ? rgba(pal.glow, 0.96) : tier === 1 ? rgba(pal.primary, 0.94) : rgba(pal.accent, 0.86);
        ctx.lineWidth = 4.2 - tier * 0.7;
        for (let i = 0; i < cnt; i++) {
          const a = (i / cnt) * Math.PI * 2 + tier * 0.24;
          const curve = Math.sin(i * 1.6 + tier + idx) * 0.16;
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(Math.cos(a + curve) * len * 0.58, Math.sin(a + curve) * len * 0.58, Math.cos(a) * len, Math.sin(a) * len);
          ctx.stroke();
        }
      }
      ctx.restore();
    });
  }

  drawSceneHibiscus(ctx, w, h, t, u, pal) {
    // 十月芙蓉：秋水澄明 · 拒霜照水双影
    const waterY = h * 0.58;
    const sway = Math.sin(t * 0.75) * 6;
    const grow = easeOutCubic(Math.min(1, u * 1.8));

    const drawBranchesAndBlooms = (alphaMul, isReflection) => {
      ctx.save();
      if (isReflection) {
        ctx.translate(0, waterY);
        ctx.scale(1, -0.72);
        ctx.translate(0, -waterY);
        ctx.globalAlpha = 0.36 * alphaMul;
      } else {
        ctx.globalAlpha = alphaMul;
      }
      const p0 = { x: w * 0.96, y: h * 0.22 };
      const p1 = { x: w * 0.68, y: h * 0.36 + sway * 0.3 };
      const p2 = { x: w * 0.38, y: h * 0.44 + sway };
      this.drawInkBranch(ctx, p0, p1, p2, 14, 2.5, "rgba(42, 30, 38, 0.9)", grow);

      [0.36, 0.62, 0.88].forEach((pos, idx) => {
        const pt = evalQuad(p0, p1, p2, pos), sc = easeOutCubic(Math.max(0, (u - idx * 0.08) * 2.0));
        this.drawLeaf(ctx, pt.x, pt.y, 1.8 + idx * 0.4, 62, 26, "rgba(46, 66, 56, 0.84)", "rgba(155, 178, 160, 0.25)", sc);
        this.drawPeonyBloom(ctx, pt.x, pt.y, 38 - idx * 5, pal, sc, t + idx);
      });
      ctx.restore();
    };

    // 先画水中倒影 + 水平波纹掩映
    ctx.save();
    ctx.beginPath(); ctx.rect(0, waterY, w, h - waterY); ctx.clip();
    const wg = ctx.createLinearGradient(0, waterY, 0, h);
    wg.addColorStop(0, rgba(pal.mist, 0.22));
    wg.addColorStop(1, rgba(pal.bg_deep, 0.94));
    ctx.fillStyle = wg; ctx.fillRect(0, waterY, w, h - waterY);
    drawBranchesAndBlooms(1, true);
    // 水平水波细纹切碎倒影
    for (let i = 0; i < 16; i++) {
      const ly = waterY + 12 + i * ((h - waterY) / 16);
      const lx = w * 0.32 + Math.sin(t * 1.1 + i * 1.3) * 45;
      ctx.strokeStyle = rgba(pal.glow, 0.14);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + w * 0.38, ly); ctx.stroke();
    }
    ctx.restore();

    // 水天微光分界线
    const lineG = ctx.createLinearGradient(0, waterY, w, waterY);
    lineG.addColorStop(0, rgba(pal.glow, 0));
    lineG.addColorStop(0.5, rgba(pal.glow, 0.35));
    lineG.addColorStop(1, rgba(pal.glow, 0));
    ctx.fillStyle = lineG; ctx.fillRect(0, waterY - 1, w, 2);

    // 上半实景拒霜芙蓉
    drawBranchesAndBlooms(1, false);
  }

  drawSceneCamellia(ctx, w, h, t, u, pal) {
    // 十一月山茶：冬庭覆雪太湖石 · 曲折苍枝 · 绿丛数枝红（一主、一副、一蕾）
    const minDim = Math.min(w, h);
    const sway = Math.sin(t * 0.62) * 5;
    const grow = easeOutCubic(Math.min(1, u * 1.8));

    // 左下冬庭覆雪奇石（工笔皴擦 + 顶部轻雪）
    drawTaihuRock(ctx, w * 0.28, h * 0.82, minDim * 0.34, minDim * 0.28, pal, 0.82, 67);
    ctx.strokeStyle = "rgba(236, 242, 244, 0.36)";
    ctx.lineWidth = 3.0;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(w * 0.16, h * 0.74);
    ctx.quadraticCurveTo(w * 0.27, h * 0.66, w * 0.38, h * 0.73);
    ctx.stroke();

    // S 形苍老山茶主枝与斜出细枝
    const branchPts = [
      { x: w * 0.96, y: h * 0.80 },
      { x: w * 0.78, y: h * 0.63 + sway * 0.18 },
      { x: w * 0.60, y: h * 0.46 + sway * 0.45 },
      { x: w * 0.42, y: h * 0.52 + sway * 0.72 },
    ];
    drawGnarledBranch(ctx, branchPts, 17, 2.8, "rgba(28, 24, 22, 0.96)", grow, 73);

    const subG = Math.max(0, (grow - 0.18) / 0.82);
    const subTwig = [
      branchPts[1],
      { x: w * 0.72, y: h * 0.38 + sway * 0.32 },
      { x: w * 0.65, y: h * 0.26 + sway * 0.48 },
    ];
    drawGnarledBranch(ctx, subTwig, 8.2, 1.8, "rgba(30, 26, 24, 0.94)", subG, 81);

    // 浓郁墨绿蜡质厚叶（叶面轻点薄雪）
    const leafSpecs = [
      { x: branchPts[1].x - 8,  y: branchPts[1].y + 8,  a: 0.72,  l: 78, w: 30, snow: false, d: 0.04 },
      { x: branchPts[1].x - 24, y: branchPts[1].y - 10, a: -2.28, l: 74, w: 28, snow: true,  d: 0.06 },
      { x: branchPts[2].x + 18, y: branchPts[2].y + 12, a: 0.92,  l: 84, w: 32, snow: false, d: 0.08 },
      { x: branchPts[2].x - 14, y: branchPts[2].y - 16, a: -1.92, l: 76, w: 29, snow: true,  d: 0.10 },
      { x: branchPts[3].x + 22, y: branchPts[3].y + 6,  a: 2.38,  l: 68, w: 26, snow: false, d: 0.14 },
      { x: branchPts[3].x - 4,  y: branchPts[3].y - 12, a: -2.65, l: 64, w: 24, snow: true,  d: 0.16 },
      { x: subTwig[1].x + 6,    y: subTwig[1].y + 4,    a: -0.32, l: 68, w: 26, snow: true,  d: 0.14 },
    ];
    leafSpecs.forEach((lf) => {
      const sc = easeOutCubic(Math.max(0, (u - lf.d) * 2.1));
      drawCamelliaLeaf(ctx, lf.x, lf.y, lf.a, lf.l, lf.w, sc, lf.snow);
    });

    // 工笔重瓣绯红山茶：1 盛放主花 + 1 侧开副花 + 1 枝头红蕾
    const mainR = minDim * 0.092;
    drawArtisticCamellia(ctx, branchPts[2].x - 4, branchPts[2].y - 6, mainR, pal, easeOutCubic(Math.max(0, (u - 0.10) * 1.9)), -0.16, 5);
    drawArtisticCamellia(ctx, branchPts[3].x + 6, branchPts[3].y + 4, mainR * 0.78, pal, easeOutCubic(Math.max(0, (u - 0.20) * 1.95)), 0.26, 11);
    drawCamelliaBud(ctx, subTwig[2].x, subTwig[2].y, mainR * 0.44, -0.28, easeOutCubic(Math.max(0, (u - 0.28) * 2.0)), pal);

    // 缓缓飘落的柔和冬雪
    for (let i = 0; i < 28; i++) {
      const m = this.motes[i];
      const sx = ((m.x - t * 0.018 + Math.sin(t * 0.8 + m.phase) * 0.014 + 10) % 1) * w;
      const sy = ((m.y + t * (0.048 + m.size * 0.024)) % 1) * h;
      ctx.fillStyle = `rgba(244, 248, 250, ${0.26 + (i % 3) * 0.14})`;
      ctx.beginPath(); ctx.arc(sx, sy, 1.4 + m.size * 1.1, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawSceneNarcissus(ctx, w, h, t, u, pal) {
    // 十二月水仙：凌波水境 · 清波青瓷水盘 · 柔韧丝带剑叶 · 伞形金盏玉花
    const cx = w * 0.56, poolY = h * 0.77;
    const minDim = Math.min(w, h);
    const scaleH = Math.min(1.18, h / 800);

    // 素雅浅池水月微晕
    const pool = ctx.createRadialGradient(cx, poolY + 8, 16, cx, poolY + 8, minDim * 0.46);
    pool.addColorStop(0, rgba(pal.mist, 0.22));
    pool.addColorStop(0.55, rgba(pal.bg_mid, 0.18));
    pool.addColorStop(1, rgba(pal.bg_deep, 0));
    ctx.fillStyle = pool;
    ctx.save(); ctx.translate(cx, poolY + 8); ctx.scale(1.65, 0.38);
    ctx.beginPath(); ctx.arc(0, 0, minDim * 0.36, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 淡雅水波轻弧
    for (let i = 0; i < 3; i++) {
      const rp = (t * 0.22 + i * 0.33) % 1;
      const rad = 54 + rp * 185;
      ctx.strokeStyle = rgba(pal.glow, (1 - rp) * 0.24);
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(cx, poolY + 10, rad, rad * 0.20, 0, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    // 青瓷浅水盘剪影与雨花卵石
    ctx.fillStyle = "rgba(38, 62, 70, 0.52)";
    ctx.beginPath(); ctx.ellipse(cx, poolY + 14, 148 * scaleH, 34 * scaleH, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(182, 212, 220, 0.30)";
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(cx, poolY + 12, 146 * scaleH, 30 * scaleH, 0, 0, Math.PI * 2); ctx.stroke();

    [[-76, 10, 32, 13], [22, 16, 38, 15], [82, 9, 28, 12], [-28, 16, 26, 11]].forEach(([dx, dy, rx, ry]) => {
      ctx.fillStyle = "rgba(22, 34, 42, 0.72)";
      ctx.beginPath(); ctx.ellipse(cx + dx * scaleH, poolY + dy * scaleH, rx * scaleH, ry * scaleH, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(148, 178, 192, 0.24)"; ctx.lineWidth = 0.85; ctx.stroke();
    });

    // 柔韧带状水仙叶丛（前后高低错落，自然微拱下垂）
    const sway = Math.sin(t * 0.65) * 6;
    const grow = easeOutCubic(Math.min(1, u * 1.75));
    const blades = [
      { ox: -22, cx: -128, cy: -155, ex: -206, ey: -215, w: 13, tone: 1, d: 0.00 },
      { ox: -14, cx: -72,  cy: -225, ex: -108, ey: -368, w: 14, tone: 0, d: 0.04 },
      { ox: -4,  cx: -18,  cy: -248, ex: -26,  ey: -420, w: 15, tone: 0, d: 0.06 },
      { ox: 8,   cx: 48,   cy: -235, ex: 84,   ey: -385, w: 14, tone: 0, d: 0.05 },
      { ox: 18,  cx: 118,  cy: -185, ex: 194,  ey: -255, w: 12, tone: 1, d: 0.09 },
      { ox: 10,  cx: 96,   cy: -120, ex: 170,  ey: -135, w: 11, tone: 1, d: 0.12 },
      { ox: -10, cx: -92,  cy: -105, ex: -162, ey: -115, w: 11, tone: 1, d: 0.11 },
    ];
    blades.forEach((b) => {
      const bg = easeOutCubic(Math.max(0, (grow - b.d) * 1.4));
      drawNarcissusBlade(
        ctx,
        cx + b.ox * scaleH, poolY + 4,
        cx + b.cx * scaleH + sway * 0.25, poolY + b.cy * scaleH,
        cx + b.ex * scaleH + sway * 0.65, poolY + b.ey * scaleH,
        b.w * scaleH, b.tone, bg
      );
    });

    // 浸水洁白鳞茎与根须
    drawNarcissusBulb(ctx, cx, poolY + 2, easeOutCubic(Math.min(1, u * 2.2)) * scaleH);

    // 三支凌波水仙花葶（每支盛开 3 朵微倾立体的玉瓣金盏水仙）
    drawNarcissusStemCluster(
      ctx,
      cx - 10 * scaleH, poolY - 6,
      cx - 56 * scaleH + sway * 0.3, poolY - 210 * scaleH,
      cx - 48 * scaleH + sway * 0.65, poolY - 355 * scaleH,
      36 * scaleH, pal, grow, -1, 17
    );
    drawNarcissusStemCluster(
      ctx,
      cx + 10 * scaleH, poolY - 4,
      cx + 62 * scaleH + sway * 0.28, poolY - 185 * scaleH,
      cx + 96 * scaleH + sway * 0.58, poolY - 308 * scaleH,
      31 * scaleH, pal, Math.max(0, (grow - 0.10) / 0.90), 1, 31
    );
    drawNarcissusStemCluster(
      ctx,
      cx - 24 * scaleH, poolY - 2,
      cx - 106 * scaleH + sway * 0.2, poolY - 135 * scaleH,
      cx - 144 * scaleH + sway * 0.45, poolY - 225 * scaleH,
      26 * scaleH, pal, Math.max(0, (grow - 0.18) / 0.82), -1, 47
    );
  }

  render(nowSec) {
    if (!this.active || !this.flower) return;
    const ctx = this.ctx, w = this.w, h = this.h;
    const elapsed = Math.max(0, nowSec - this.startTime);
    const u = Math.min(1, elapsed / this.duration);
    const pal = paletteFromConfig(this.flower.palette);

    // 1. 宣纸底色渐变
    const bg = ctx.createLinearGradient(0, 0, w * 0.25, h);
    bg.addColorStop(0, rgba(pal.bg_deep, 0.97));
    bg.addColorStop(0.55, rgba(pal.bg_mid, 0.95));
    bg.addColorStop(1, rgba(pal.ink, 0.98));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // 2. 缓慢电影感推镜（Ken Burns 缓慢推进 + 柔和呼吸平移）
    const zoom = 1.0 + easeOutCubic(u) * 0.055;
    const panX = Math.sin(u * Math.PI * 0.5) * -14;
    const panY = Math.sin(u * Math.PI * 0.5) * -6;

    ctx.save();
    ctx.translate(w * 0.5 + panX, h * 0.5 + panY);
    ctx.scale(zoom, zoom);
    ctx.translate(-w * 0.5, -h * 0.5);

    const profile = this.flower.visual_profile;
    if (profile === "plum") this.drawScenePlum(ctx, w, h, elapsed, u, pal);
    else if (profile === "apricot") this.drawSceneApricot(ctx, w, h, elapsed, u, pal);
    else if (profile === "peach") this.drawScenePeach(ctx, w, h, elapsed, u, pal);
    else if (profile === "peony") this.drawScenePeony(ctx, w, h, elapsed, u, pal);
    else if (profile === "pomegranate") this.drawScenePomegranate(ctx, w, h, elapsed, u, pal);
    else if (profile === "lotus") this.drawSceneLotus(ctx, w, h, elapsed, u, pal);
    else if (profile === "hollyhock") this.drawSceneHollyhock(ctx, w, h, elapsed, u, pal);
    else if (profile === "osmanthus") this.drawSceneOsmanthus(ctx, w, h, elapsed, u, pal);
    else if (profile === "chrysanthemum") this.drawSceneChrysanthemum(ctx, w, h, elapsed, u, pal);
    else if (profile === "hibiscus") this.drawSceneHibiscus(ctx, w, h, elapsed, u, pal);
    else if (profile === "camellia") this.drawSceneCamellia(ctx, w, h, elapsed, u, pal);
    else this.drawSceneNarcissus(ctx, w, h, elapsed, u, pal);

    ctx.restore();

    // 3. 宣纸纤维质感叠加
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = this.paperPattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
