/* ===== 底层水墨山水与折枝花卉渲染器（支持旧花交叉淡出 + 强制重抽新枝） ===== */
class BotanicalRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = 1920; this.height = 1080; this.dpr = 1;
    this.paperPattern = createPaperGrainPattern(this.ctx, 256);
    this.currentPalette = clonePalette(SEASON_PALETTES[2]);
    this.activeFlower = null;
    this.branchGrowth = 0;
    this.prevFlower = null;
    this.prevPalette = null;
    this.prevGrowth = 0;
    this.prevFade = 0;
    this.stage = "idle";
    this.reducedMotion = false;
    this.resize();
  }
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth; this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
  setStage(stage, flower) {
    const isNewReveal = stage === "reveal" && flower && (
      !this.activeFlower ||
      this.activeFlower.id !== flower.id ||
      this.stage !== "reveal"
    );
    if (isNewReveal) {
      if (this.activeFlower && this.branchGrowth > 0.04) {
        this.prevFlower = this.activeFlower;
        this.prevPalette = paletteFromConfig(this.activeFlower.palette);
        this.prevGrowth = this.branchGrowth;
        this.prevFade = 1.0;
      }
      this.branchGrowth = 0.0;
    } else if (stage === "idle") {
      if (this.activeFlower && this.branchGrowth > 0.04) {
        this.prevFlower = this.activeFlower;
        this.prevPalette = paletteFromConfig(this.activeFlower.palette);
        this.prevGrowth = this.branchGrowth;
        this.prevFade = 0.75;
      }
      this.activeFlower = null;
      this.branchGrowth = 0.0;
    }
    this.stage = stage;
    if (flower) this.activeFlower = flower;
  }
  setReducedMotion(val) { this.reducedMotion = Boolean(val); }
  getIdlePalette(timeSec) {
    const cycle = (timeSec * 0.028) % SEASON_PALETTES.length;
    const i0 = Math.floor(cycle), i1 = (i0 + 1) % SEASON_PALETTES.length, f = cycle - i0;
    return blendPalettes(SEASON_PALETTES[i0], SEASON_PALETTES[i1], f * f * (3 - 2 * f));
  }
  render(timeSec, dt) {
    const ctx = this.ctx, w = this.width, h = this.height;
    const motionScale = this.reducedMotion ? 0.2 : 1.0;
    const targetPalette = (this.stage === "idle" || !this.activeFlower)
      ? this.getIdlePalette(timeSec)
      : paletteFromConfig(this.activeFlower.palette);
    this.currentPalette = blendPalettes(
      this.currentPalette,
      targetPalette,
      Math.min(1, dt * (this.stage === "reveal" ? 2.2 : 1.15))
    );
    const pal = this.currentPalette;

    const targetGrowth = this.stage === "reveal" ? 1.0 : this.stage === "playing" ? 0.82 : this.stage === "blessing" ? 1.0 : 0.0;
    const growthSpeed = this.stage === "reveal" ? 0.64 : this.stage === "returning" ? 0.72 : 0.45;
    this.branchGrowth += (targetGrowth - this.branchGrowth) * Math.min(1, dt * growthSpeed * 2.4);
    if (Math.abs(targetGrowth - this.branchGrowth) < 0.004) this.branchGrowth = targetGrowth;

    const bgGrad = ctx.createLinearGradient(0, 0, w * 0.25, h);
    bgGrad.addColorStop(0, rgba(pal.bg_deep, 1));
    bgGrad.addColorStop(0.55, rgba(pal.bg_mid, 1));
    bgGrad.addColorStop(1, rgba(pal.ink, 1));
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h);

    const haloX = w * (0.34 + Math.sin(timeSec * 0.12 * motionScale) * 0.035);
    const haloY = h * (0.34 + Math.cos(timeSec * 0.1 * motionScale) * 0.025);
    const haloR = Math.max(w, h) * (0.42 + Math.sin(timeSec * 0.32 * motionScale) * 0.02);
    const haloGrad = ctx.createRadialGradient(haloX, haloY, haloR * 0.04, haloX, haloY, haloR);
    haloGrad.addColorStop(0, rgba(pal.glow, this.stage === "reveal" ? 0.10 : 0.065));
    haloGrad.addColorStop(0.42, rgba(pal.mist, 0.09));
    haloGrad.addColorStop(0.78, rgba(pal.bg_mid, 0.04));
    haloGrad.addColorStop(1, rgba(pal.bg_deep, 0));
    ctx.fillStyle = haloGrad; ctx.fillRect(0, 0, w, h);

    this.drawInkMountains(ctx, w, h, timeSec * motionScale, pal);
    this.drawFlowingMistBands(ctx, w, h, timeSec * motionScale, pal);

    const idleFade = this.stage === "idle" ? 1.0 : Math.max(0, 1 - this.branchGrowth * 1.4 - this.prevFade * 0.9);
    if (idleFade > 0.01) this.drawIdleScrollSilhouette(ctx, w, h, timeSec * motionScale, pal, idleFade);

    // 旧花残影平滑淡出并伴随轻微退隐位移
    if (this.prevFlower && this.prevFade > 0.008) {
      this.prevFade = Math.max(0, this.prevFade - dt * (this.reducedMotion ? 2.2 : 1.15));
      const fadeEase = this.prevFade * this.prevFade;
      const drift = (1 - this.prevFade) * 26 * motionScale;
      ctx.save();
      ctx.translate(-drift * 0.6, drift * 0.35);
      this.drawFlowerBotanical(
        ctx, w, h, timeSec * motionScale,
        this.prevFlower, this.prevPalette || pal, this.prevGrowth, fadeEase * 0.72
      );
      ctx.restore();
      if (this.prevFade <= 0.008) {
        this.prevFlower = null;
        this.prevPalette = null;
      }
    }

    // 新花自 0 重新抽枝生长
    if (this.activeFlower && this.branchGrowth > 0.01) {
      this.drawFlowerBotanical(
        ctx, w, h, timeSec * motionScale,
        this.activeFlower, pal, this.branchGrowth, this.stage === "playing" ? 0.35 : 0.96
      );
    }

    ctx.save(); ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = 0.52;
    ctx.fillStyle = this.paperPattern; ctx.fillRect(0, 0, w, h); ctx.restore();
  }
  drawInkMountains(ctx, w, h, t, pal) {
    [
      { baseY: 0.68, amp: 0.09, freq: 0.0021, speed: 0.018, alpha: 0.22, color: pal.mist },
      { baseY: 0.77, amp: 0.075, freq: 0.0031, speed: 0.028, alpha: 0.34, color: pal.bg_mid },
      { baseY: 0.87, amp: 0.055, freq: 0.0044, speed: 0.042, alpha: 0.56, color: pal.ink },
    ].forEach((layer, idx) => {
      ctx.save(); ctx.beginPath(); ctx.moveTo(0, h);
      const step = Math.max(16, Math.floor(w / 72));
      for (let x = 0; x <= w + step; x += step) {
        const nx = x * layer.freq + t * layer.speed + idx * 2.1;
        const ridge = Math.sin(nx) * 0.52 + Math.sin(nx * 2.15 + 1.3) * 0.28 + Math.cos(nx * 0.48 - 0.7) * 0.35;
        ctx.lineTo(x, h * layer.baseY - ridge * h * layer.amp);
      }
      ctx.lineTo(w, h); ctx.closePath();
      const grad = ctx.createLinearGradient(0, h * (layer.baseY - layer.amp), 0, h);
      grad.addColorStop(0, rgba(layer.color, layer.alpha));
      grad.addColorStop(0.65, rgba(pal.bg_deep, layer.alpha * 1.15));
      grad.addColorStop(1, rgba(pal.bg_deep, 0.85));
      ctx.fillStyle = grad; ctx.fill(); ctx.restore();
    });
  }
  drawFlowingMistBands(ctx, w, h, t, pal) {
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const cx = w * ((0.18 + i * 0.26 + Math.sin(t * 0.06 + i * 1.7) * 0.08) % 1.1);
      const cy = h * (0.56 + i * 0.09 + Math.cos(t * 0.08 + i) * 0.03);
      const rx = w * (0.28 + i * 0.06), ry = h * (0.09 + i * 0.02);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx);
      const grad = ctx.createRadialGradient(0, 0, rx * 0.06, 0, 0, rx);
      grad.addColorStop(0, rgba(pal.mist, 0.14)); grad.addColorStop(0.55, rgba(pal.primary, 0.05)); grad.addColorStop(1, rgba(pal.mist, 0));
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
  drawIdleScrollSilhouette(ctx, w, h, t, pal, alpha) {
    ctx.save(); ctx.globalAlpha = alpha * 0.42;
    const sway = Math.sin(t * 0.45) * 14;
    const p0 = { x: -w * 0.03, y: h * 0.18 }, p1 = { x: w * 0.18, y: h * 0.29 + sway * 0.4 }, p2 = { x: w * 0.36, y: h * 0.22 + sway };
    this.drawCalligraphicBranch(ctx, p0, p1, p2, 13, 2.2, rgba(pal.ink, 0.92), 1.0);
    const sub1 = evalQuad(p0, p1, p2, 0.48);
    this.drawCalligraphicBranch(ctx, sub1, { x: sub1.x + w * 0.04, y: sub1.y + h * 0.08 }, { x: sub1.x + w * 0.09, y: sub1.y + h * 0.11 + sway * 0.7 }, 5.5, 1.2, rgba(pal.ink, 0.82), 1.0);
    const sub2 = evalQuad(p0, p1, p2, 0.74);
    this.drawCalligraphicBranch(ctx, sub2, { x: sub2.x + w * 0.05, y: sub2.y - h * 0.02 }, { x: sub2.x + w * 0.11, y: sub2.y - h * 0.06 + sway * 1.1 }, 4.2, 1.0, rgba(pal.ink, 0.76), 1.0);
    [0.35, 0.56, 0.78, 0.94].forEach((u, idx) => {
      const pt = evalQuad(p0, p1, p2, u), r = 10 + (idx % 3) * 5;
      const g = ctx.createRadialGradient(pt.x, pt.y, 1, pt.x, pt.y, r * 2.2);
      g.addColorStop(0, rgba(pal.primary, 0.52)); g.addColorStop(0.5, rgba(pal.glow, 0.16)); g.addColorStop(1, rgba(pal.primary, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pt.x, pt.y, r * 2.2, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }
  drawCalligraphicBranch(ctx, p0, p1, p2, startW, endW, color, progress) {
    const steps = 28, maxStep = Math.floor(steps * Math.max(0, Math.min(1, progress)));
    if (maxStep < 1) return;
    ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = color;
    for (let i = 0; i < maxStep; i++) {
      const t0 = i / steps, a = evalQuad(p0, p1, p2, t0), b = evalQuad(p0, p1, p2, (i + 1) / steps);
      ctx.lineWidth = Math.max(0.8, (startW + (endW - startW) * t0) * (1 + Math.sin(t0 * Math.PI * 5) * 0.12));
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }
  drawSerratedLeaf(ctx, x, y, angle, length, width, fill, veinColor, scale = 1) {
    if (scale <= 0.02) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(length * 0.28, -width * 0.95, length * 0.72, -width * 0.75, length, 0);
    ctx.bezierCurveTo(length * 0.72, width * 0.75, length * 0.28, width * 0.95, 0, 0);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = veinColor; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(length * 0.88, 0); ctx.stroke();
    ctx.restore();
  }
  drawFlowerBotanical(ctx, w, h, t, flower, pal, growth, alpha) {
    const profile = flower.visual_profile || "osmanthus", g = easeOutCubic(growth), sway = Math.sin(t * 0.75 * (flower.motion_tempo || 0.75)) * 10;
    ctx.save(); ctx.globalAlpha = alpha;
    if (profile === "osmanthus") this.drawOsmanthusRealm(ctx, w, h, t, pal, g, sway);
    else if (profile === "plum") this.drawPlumRealm(ctx, w, h, t, pal, g, sway);
    else if (profile === "lotus") this.drawLotusRealm(ctx, w, h, t, pal, g, sway);
    else if (profile === "peony") this.drawPeonyRealm(ctx, w, h, t, pal, g, sway);
    else if (profile === "chrysanthemum") this.drawChrysanthemumRealm(ctx, w, h, t, pal, g, sway);
    else if (profile === "narcissus") this.drawNarcissusRealm(ctx, w, h, t, pal, g, sway);
    else if (profile === "hollyhock") this.drawHollyhockRealm(ctx, w, h, t, pal, g, sway);
    else if (profile === "camellia") this.drawCamelliaRealm(ctx, w, h, t, pal, g, sway);
    else this.drawWoodyBlossomRealm(ctx, w, h, t, profile, pal, g, sway);
    ctx.restore();
  }
  drawOsmanthusRealm(ctx, w, h, t, pal, g, sway) {
    const moonX = w * 0.72, moonY = h * 0.34, moonR = Math.min(w, h) * 0.22 * (0.7 + 0.3 * g);
    const moonGrad = ctx.createRadialGradient(moonX, moonY, moonR * 0.15, moonX, moonY, moonR * 1.45);
    moonGrad.addColorStop(0, rgba(pal.glow, 0.26 * g)); moonGrad.addColorStop(0.55, rgba(pal.primary, 0.12 * g)); moonGrad.addColorStop(1, rgba(pal.primary, 0));
    ctx.fillStyle = moonGrad; ctx.beginPath(); ctx.arc(moonX, moonY, moonR * 1.45, 0, Math.PI * 2); ctx.fill();

    const p0 = { x: w * 1.03, y: h * 0.14 }, p1 = { x: w * 0.79, y: h * 0.32 + sway * 0.35 }, p2 = { x: w * 0.50, y: h * 0.44 + sway };
    const barkColor = "rgba(38, 34, 24, 0.94)";
    this.drawCalligraphicBranch(ctx, p0, p1, p2, 18, 3.0, barkColor, g);

    const clusterAnchors = [];
    [
      { u: 0.28, dx: -0.14, dy: 0.20, w0: 9.5, w1: 1.8 }, { u: 0.52, dx: -0.16, dy: -0.15, w0: 7.5, w1: 1.5 },
      { u: 0.68, dx: -0.13, dy: 0.18, w0: 6.2, w1: 1.4 }, { u: 0.82, dx: -0.11, dy: -0.09, w0: 4.5, w1: 1.1 },
    ].forEach((f, idx) => {
      const subG = Math.max(0, (g - 0.18 - idx * 0.06) / 0.65);
      if (subG <= 0) return;
      const start = evalQuad(p0, p1, p2, f.u), ctrl = { x: start.x + w * f.dx * 0.5, y: start.y + h * f.dy * 0.65 }, end = { x: start.x + w * f.dx, y: start.y + h * f.dy + sway * 0.6 };
      this.drawCalligraphicBranch(ctx, start, ctrl, end, f.w0, f.w1, barkColor, subG);
      [0.35, 0.62, 0.86].forEach((lu, li) => {
        const pt = evalQuad(start, ctrl, end, lu), leafG = easeOutCubic((subG - lu * 0.6) * 2.2), baseAng = Math.atan2(pt.ty, pt.tx), len = 48 + ((idx + li) % 3) * 14;
        this.drawSerratedLeaf(ctx, pt.x, pt.y, baseAng - 0.65, len, len * 0.28, "rgba(38, 56, 44, 0.88)", "rgba(128, 152, 118, 0.35)", leafG);
        this.drawSerratedLeaf(ctx, pt.x, pt.y, baseAng + 0.65, len * 0.92, len * 0.25, "rgba(30, 46, 36, 0.85)", "rgba(116, 138, 108, 0.32)", leafG);
        clusterAnchors.push({ x: pt.x, y: pt.y, scale: leafG, seed: idx * 17 + li * 7 });
      });
    });
    [0.38, 0.58, 0.76, 0.92].forEach((u, i) => {
      const pt = evalQuad(p0, p1, p2, u), cg = easeOutCubic((g - 0.32 - i * 0.08) * 2.2);
      if (cg > 0.02) clusterAnchors.push({ x: pt.x, y: pt.y, scale: cg, seed: 100 + i * 19 });
    });
    clusterAnchors.forEach((anc) => {
      if (anc.scale <= 0.02) return;
      const count = 9 + (anc.seed % 6), glowR = 28 * anc.scale;
      const aura = ctx.createRadialGradient(anc.x, anc.y, 1, anc.x, anc.y, glowR);
      aura.addColorStop(0, rgba(pal.glow, 0.32 * anc.scale)); aura.addColorStop(1, rgba(pal.primary, 0));
      ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(anc.x, anc.y, glowR, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < count; k++) {
        const ang = (k / count) * Math.PI * 2 + anc.seed * 0.7, dist = (5 + ((anc.seed * 13 + k * 7) % 19)) * anc.scale;
        const fx = anc.x + Math.cos(ang) * dist, fy = anc.y + Math.sin(ang) * dist, petalR = (3.4 + ((k + anc.seed) % 3) * 1.1) * anc.scale;
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(ang + Math.sin(t * 1.2 + k) * 0.08);
        ctx.fillStyle = k % 3 === 0 ? rgba(pal.glow, 0.95) : k % 2 === 0 ? rgba(pal.primary, 0.94) : rgba(pal.accent, 0.92);
        for (let p = 0; p < 4; p++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.ellipse(petalR * 0.82, 0, petalR * 0.72, petalR * 0.44, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = "rgba(150, 92, 22, 0.9)"; ctx.beginPath(); ctx.arc(0, 0, petalR * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    });
  }
  drawPlumRealm(ctx, w, h, t, pal, g, sway) {
    // 宋画折枝墨梅：苍劲多节折角枝 + 正/侧/背/蕾四态梅花
    const mainPts = [
      { x: w * 0.99, y: h * 0.94 },
      { x: w * 0.85, y: h * 0.72 + sway * 0.15 },
      { x: w * 0.78, y: h * 0.54 + sway * 0.35 },
      { x: w * 0.64, y: h * 0.36 + sway * 0.55 },
      { x: w * 0.52, y: h * 0.22 + sway * 0.75 },
    ];
    const inkBark = "rgba(22, 26, 34, 0.96)";
    drawGnarledBranch(ctx, mainPts, 20, 2.6, inkBark, g, 11);

    // “女”字形交叉细挺新梢
    const sg1 = Math.max(0, (g - 0.18) / 0.72);
    const twig1 = [
      mainPts[1],
      { x: w * 0.72, y: h * 0.66 + sway * 0.3 },
      { x: w * 0.58, y: h * 0.61 + sway * 0.55 },
    ];
    drawGnarledBranch(ctx, twig1, 7.5, 1.3, inkBark, sg1, 23);

    const sg2 = Math.max(0, (g - 0.28) / 0.68);
    const twig2 = [
      mainPts[2],
      { x: w * 0.84, y: h * 0.40 + sway * 0.35 },
      { x: w * 0.91, y: h * 0.25 + sway * 0.5 },
    ];
    drawGnarledBranch(ctx, twig2, 6.2, 1.1, inkBark, sg2, 37);

    const sg3 = Math.max(0, (g - 0.36) / 0.64);
    const twig3 = [
      mainPts[3],
      { x: w * 0.54, y: h * 0.41 + sway * 0.6 },
      { x: w * 0.45, y: h * 0.38 + sway * 0.75 },
    ];
    drawGnarledBranch(ctx, twig3, 4.8, 1.0, inkBark, sg3, 51);

    const blossoms = [
      { x: twig1[1].x + 6, y: twig1[1].y - 8, s: 17, pose: "front", rot: 0.4, d: 0.26 },
      { x: twig1[2].x + 4, y: twig1[2].y - 4, s: 15, pose: "side", rot: -2.4, d: 0.38 },
      { x: mainPts[2].x - 18, y: mainPts[2].y - 10, s: 20, pose: "front", rot: -0.5, d: 0.28 },
      { x: mainPts[2].x + 14, y: mainPts[2].y + 12, s: 15, pose: "back", rot: 1.1, d: 0.34 },
      { x: twig2[1].x - 6, y: twig2[1].y - 6, s: 16, pose: "side", rot: -0.8, d: 0.40 },
      { x: twig2[2].x, y: twig2[2].y + 4, s: 12, pose: "bud", rot: 0.3, d: 0.46 },
      { x: mainPts[3].x + 10, y: mainPts[3].y - 12, s: 19, pose: "front", rot: 0.8, d: 0.36 },
      { x: twig3[1].x, y: twig3[1].y - 6, s: 14, pose: "back", rot: -0.9, d: 0.44 },
      { x: twig3[2].x + 4, y: twig3[2].y, s: 11, pose: "bud", rot: -1.4, d: 0.52 },
      { x: mainPts[4].x + 14, y: mainPts[4].y + 8, s: 15, pose: "side", rot: -2.1, d: 0.48 },
      { x: mainPts[4].x - 2, y: mainPts[4].y - 4, s: 11, pose: "bud", rot: -0.6, d: 0.55 },
    ];
    blossoms.forEach((b, i) => {
      const sc = easeOutCubic((g - b.d) * 2.1);
      drawArtisticPlum(ctx, b.x, b.y, b.s, pal, sc, b.pose, b.rot, i + 5);
    });
  }
  drawLotusRealm(ctx, w, h, t, pal, g, sway) {
    // 淡墨水晕与柔和波痕
    ctx.save();
    for (let r = 0; r < 3; r++) {
      const rx = w * (0.64 + r * 0.08), ry = h * (0.85 + (r % 2) * 0.04);
      const rad = 52 + ((t * 11 + r * 42) % 95);
      const a = Math.max(0, (1 - rad / 147) * 0.22 * g);
      ctx.strokeStyle = rgba(pal.mist, a);
      ctx.lineWidth = 1.0;
      ctx.beginPath(); ctx.ellipse(rx, ry, rad, rad * 0.20, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();

    // 后景高荷叶 + 前景低斜舒卷荷叶 + 一枝初展卷叶
    const pad1G = easeOutCubic(g * 1.35);
    const p1x = w * 0.83 + sway * 0.45, p1y = h * 0.57;
    this.drawCalligraphicBranch(ctx, { x: w * 0.85, y: h * 1.02 }, { x: w * 0.82, y: h * 0.80 }, { x: p1x, y: p1y }, 6.5, 3.2, "rgba(32, 66, 56, 0.88)", pad1G);
    drawArtisticLotusPad(ctx, p1x, p1y, 138, 52, 0.08, pad1G, 11);

    const pad2G = easeOutCubic((g - 0.12) * 1.45);
    const p2x = w * 0.61 + sway * 0.55, p2y = h * 0.72;
    this.drawCalligraphicBranch(ctx, { x: w * 0.63, y: h * 1.02 }, { x: w * 0.60, y: h * 0.86 }, { x: p2x, y: p2y }, 5.8, 2.8, "rgba(36, 74, 62, 0.86)", pad2G);
    drawArtisticLotusPad(ctx, p2x, p2y, 112, 42, -0.10, pad2G, 23);

    // 一枝小嫩卷叶打破呆板
    const rollG = easeOutCubic((g - 0.20) * 1.55);
    const rx = w * 0.54 + sway * 0.4, ry = h * 0.60;
    this.drawCalligraphicBranch(ctx, { x: w * 0.58, y: h * 1.02 }, { x: w * 0.55, y: h * 0.82 }, { x: rx, y: ry }, 4.2, 2.0, "rgba(42, 82, 68, 0.82)", rollG);
    drawRolledLotusLeaf(ctx, rx, ry, 58, -0.22, rollG);

    // 亭亭玉立主荷花 + 侧枝含苞花蕾
    const stemG = easeOutCubic((g - 0.14) * 1.45);
    const fx = w * 0.72 + sway * 0.65, fy = h * 0.43;
    this.drawCalligraphicBranch(ctx, { x: w * 0.74, y: h * 1.02 }, { x: w * 0.70, y: h * 0.72 }, { x: fx, y: fy }, 7.5, 3.6, "rgba(42, 84, 70, 0.92)", stemG);
    drawArtisticLotus(ctx, fx, fy, Math.min(w, h) * 0.108, pal, easeOutCubic((g - 0.30) * 1.75), 0.96, 3);

    const budG = easeOutCubic((g - 0.28) * 1.7);
    const bx = w * 0.81 + sway * 0.5, by = h * 0.48;
    this.drawCalligraphicBranch(ctx, { x: w * 0.79, y: h * 1.02 }, { x: w * 0.80, y: h * 0.76 }, { x: bx, y: by }, 5.2, 2.4, "rgba(38, 76, 64, 0.88)", budG);
    drawArtisticLotus(ctx, bx, by, Math.min(w, h) * 0.062, pal, easeOutCubic((g - 0.40) * 1.85), 0.28, 7);
  }
  drawPeonyRealm(ctx, w, h, t, pal, g, sway) {
    const cx = w * 0.72 + sway * 0.45, cy = h * 0.46;
    // 淡墨太湖石托底，呼应传统工笔牡丹立意
    drawTaihuRock(ctx, w * 0.84, h * 0.82, Math.min(w, h) * 0.30, Math.min(w, h) * 0.34, pal, 0.72 * g, 17);

    // 苍劲木质牡丹老枝与侧枝
    this.drawCalligraphicBranch(ctx, { x: w * 0.84, y: h * 0.96 }, { x: w * 0.77, y: h * 0.70 }, { x: cx, y: cy + 16 }, 12, 4.2, "rgba(42, 30, 28, 0.92)", g);
    const sideG = Math.max(0, (g - 0.16) / 0.84);
    this.drawCalligraphicBranch(ctx, { x: w * 0.78, y: h * 0.72 }, { x: w * 0.67, y: h * 0.64 }, { x: cx - 108, y: cy + 62 }, 6.5, 2.4, "rgba(44, 32, 30, 0.88)", sideG);
    this.drawCalligraphicBranch(ctx, { x: w * 0.76, y: h * 0.65 }, { x: w * 0.84, y: h * 0.52 }, { x: cx + 88, y: cy - 48 }, 5.2, 2.0, "rgba(44, 32, 30, 0.86)", sideG);

    // 真实三裂掌状牡丹复叶
    const leafG = easeOutCubic((g - 0.14) * 1.65);
    drawPeonyLeafCluster(ctx, cx - 32, cy + 44, 2.55, leafG * 1.05, pal);
    drawPeonyLeafCluster(ctx, cx + 38, cy + 36, 0.45, leafG * 1.0, pal);
    drawPeonyLeafCluster(ctx, cx - 24, cy - 28, -2.25, leafG * 0.86, pal);
    drawPeonyLeafCluster(ctx, cx - 96, cy + 72, 2.1, leafG * 0.82, pal);

    // 主花（3/4 立体工笔牡丹）+ 侧枝半开牡丹 + 枝头花苞
    const mainR = Math.min(w, h) * 0.115;
    drawArtisticPeony(ctx, cx - 108, cy + 56, mainR * 0.64, pal, easeOutCubic((g - 0.34) * 1.75), t + 1.2, 2);
    drawPeonyBud(ctx, cx + 88, cy - 48, mainR * 0.34, 0.25, easeOutCubic((g - 0.3) * 1.8), pal);
    drawArtisticPeony(ctx, cx, cy, mainR, pal, easeOutCubic((g - 0.22) * 1.65), t, 1);
  }
  drawChrysanthemumRealm(ctx, w, h, t, pal, g, sway) {
    [{ x: w * 0.72 + sway * 0.6, y: h * 0.43, r: 88, delay: 0.25 }, { x: w * 0.83 + sway * 0.4, y: h * 0.59, r: 62, delay: 0.38 }].forEach((b, idx) => {
      this.drawCalligraphicBranch(ctx, { x: w * (0.76 + idx * 0.1), y: h * 1.02 }, { x: b.x + 12, y: h * 0.74 }, { x: b.x, y: b.y }, 7, 3, "rgba(50, 54, 38, 0.86)", g);
      const bg = easeOutCubic((g - b.delay) * 1.8); if (bg <= 0.02) return;
      ctx.save(); ctx.translate(b.x, b.y); ctx.scale(bg, bg); ctx.lineCap = "round";
      for (let tier = 0; tier < 3; tier++) {
        const count = 24 - tier * 5, len = b.r * (1 - tier * 0.24);
        ctx.strokeStyle = tier === 2 ? rgba(pal.glow, 0.95) : tier === 1 ? rgba(pal.primary, 0.92) : rgba(pal.accent, 0.82);
        ctx.lineWidth = 4.2 - tier * 0.7;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + tier * 0.22, curve = Math.sin(i * 1.7 + tier) * 0.16;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a + curve) * len * 0.58, Math.sin(a + curve) * len * 0.58, Math.cos(a) * len, Math.sin(a) * len); ctx.stroke();
        }
      }
      ctx.restore();
    });
  }
  drawNarcissusRealm(ctx, w, h, t, pal, g, sway) {
    const baseX = w * 0.73, baseY = h * 0.90;
    // 淡雅水晕与水底浅影
    const pool = ctx.createRadialGradient(baseX, baseY + 12, 8, baseX, baseY + 12, Math.min(w, h) * 0.26);
    pool.addColorStop(0, rgba(pal.mist, 0.18 * g));
    pool.addColorStop(1, rgba(pal.bg_deep, 0));
    ctx.fillStyle = pool;
    ctx.save(); ctx.translate(baseX, baseY + 12); ctx.scale(1.6, 0.42);
    ctx.beginPath(); ctx.arc(0, 0, Math.min(w, h) * 0.24, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 柔韧带状水仙叶丛（前后掩映、中段微拱、叶尖自然轻垂）
    const blades = [
      { ox: -16, cx: -105, cy: -175, ex: -168, ey: -265, w: 12, tone: 1, d: 0.00 },
      { ox: -10, cx: -54,  cy: -235, ex: -82,  ey: -385, w: 13, tone: 0, d: 0.04 },
      { ox: -2,  cx: -14,  cy: -255, ex: -18,  ey: -435, w: 14, tone: 0, d: 0.08 },
      { ox: 8,   cx: 48,   cy: -245, ex: 92,   ey: -395, w: 13, tone: 0, d: 0.06 },
      { ox: 18,  cx: 108,  cy: -190, ex: 176,  ey: -260, w: 11, tone: 1, d: 0.10 },
      { ox: 4,   cx: 74,   cy: -140, ex: 136,  ey: -170, w: 10, tone: 1, d: 0.12 },
    ];
    const scaleH = Math.min(1.15, h / 860);
    blades.forEach((b) => {
      const bg = easeOutCubic((g - b.d) * 1.45);
      drawNarcissusBlade(
        ctx,
        baseX + b.ox, baseY,
        baseX + b.cx * scaleH + sway * 0.25, baseY + b.cy * scaleH,
        baseX + b.ex * scaleH + sway * 0.65, baseY + b.ey * scaleH,
        b.w * scaleH, b.tone, bg
      );
    });

    // 洁白鳞茎与淡墨鹅卵石
    drawNarcissusBulb(ctx, baseX, baseY, easeOutCubic(g * 1.5) * scaleH);

    // 两支凌波垂首水仙花葶（每支开 3 朵带立体金盏的侧仰花序）
    drawNarcissusStemCluster(
      ctx,
      baseX - 8, baseY - 8,
      baseX - 46 * scaleH + sway * 0.3, baseY - 210 * scaleH,
      baseX - 38 * scaleH + sway * 0.65, baseY - 360 * scaleH,
      34 * scaleH, pal, g, -1, 13
    );
    drawNarcissusStemCluster(
      ctx,
      baseX + 12, baseY - 6,
      baseX + 58 * scaleH + sway * 0.25, baseY - 170 * scaleH,
      baseX + 86 * scaleH + sway * 0.55, baseY - 295 * scaleH,
      28 * scaleH, pal, Math.max(0, (g - 0.12) / 0.88), 1, 29
    );
  }
  drawCamelliaRealm(ctx, w, h, t, pal, g, sway) {
    // 冬庭山茶：S 形深褐苍枝 + 蜡质墨绿厚叶 + 1 主 1 副 1 蕾（彻底告别横排甜甜圈）
    const branchPts = [
      { x: w * 1.02, y: h * 0.72 },
      { x: w * 0.86, y: h * 0.58 + sway * 0.2 },
      { x: w * 0.72, y: h * 0.45 + sway * 0.45 },
      { x: w * 0.56, y: h * 0.51 + sway * 0.75 },
    ];
    drawGnarledBranch(ctx, branchPts, 17, 2.8, "rgba(32, 26, 24, 0.96)", g, 41);

    const subG = Math.max(0, (g - 0.18) / 0.82);
    const subTwig = [
      branchPts[1],
      { x: w * 0.82, y: h * 0.38 + sway * 0.3 },
      { x: w * 0.76, y: h * 0.28 + sway * 0.45 },
    ];
    drawGnarledBranch(ctx, subTwig, 8.0, 1.8, "rgba(34, 28, 26, 0.94)", subG, 57);

    // 错落蜡质深绿厚叶（部分带冬雪微白）
    const leafG = easeOutCubic((g - 0.10) * 1.65);
    const leaves = [
      { x: branchPts[1].x - 10, y: branchPts[1].y + 4, a: 0.75, l: 74, w: 28, snow: false },
      { x: branchPts[1].x - 24, y: branchPts[1].y - 12, a: -2.25, l: 68, w: 26, snow: true },
      { x: branchPts[2].x + 12, y: branchPts[2].y + 10, a: 1.05, l: 78, w: 30, snow: false },
      { x: branchPts[2].x - 8,  y: branchPts[2].y - 16, a: -1.95, l: 70, w: 26, snow: true },
      { x: branchPts[3].x + 18, y: branchPts[3].y + 8, a: 2.35, l: 64, w: 24, snow: false },
      { x: subTwig[1].x + 6,    y: subTwig[1].y + 4,   a: -0.35, l: 62, w: 24, snow: true },
    ];
    leaves.forEach((lf, i) => {
      drawCamelliaLeaf(ctx, lf.x, lf.y, lf.a, lf.l, lf.w, easeOutCubic((leafG - i * 0.05) * 1.4), lf.snow);
    });

    // 疏密得当：一朵盛放主花 + 一朵微侧副花 + 一枚饱满绯红花蕾
    const mainR = Math.min(w, h) * 0.072;
    drawArtisticCamellia(ctx, branchPts[2].x - 6, branchPts[2].y - 6, mainR, pal, easeOutCubic((g - 0.22) * 1.75), -0.18, 3);
    drawArtisticCamellia(ctx, branchPts[3].x + 8, branchPts[3].y + 4, mainR * 0.78, pal, easeOutCubic((g - 0.34) * 1.85), 0.28, 9);
    drawCamelliaBud(ctx, subTwig[2].x, subTwig[2].y, mainR * 0.42, -0.32, easeOutCubic((g - 0.42) * 1.9), pal);
  }
  drawHollyhockRealm(ctx, w, h, t, pal, g, sway) {
    const p0 = { x: w * 0.76, y: h * 1.02 }, p1 = { x: w * 0.74, y: h * 0.58 }, p2 = { x: w * 0.75 + sway * 0.55, y: h * 0.15 };
    const s0 = { x: w * 0.83, y: h * 1.02 }, s1 = { x: w * 0.82, y: h * 0.64 }, s2 = { x: w * 0.84 + sway * 0.42, y: h * 0.28 };
    this.drawCalligraphicBranch(ctx, p0, p1, p2, 11, 2.2, "rgba(46, 62, 50, 0.9)", g);
    this.drawCalligraphicBranch(ctx, s0, s1, s2, 8.5, 1.8, "rgba(42, 56, 46, 0.84)", Math.max(0, (g - 0.12) / 0.88));

    // 下部宽大掌状蜀葵叶
    [0.18, 0.34, 0.48].forEach((u, i) => {
      const pt = evalQuad(p0, p1, p2, u);
      const side = i % 2 === 0 ? -1 : 1;
      drawHollyhockLeaf(ctx, pt.x, pt.y, side < 0 ? Math.PI + 0.28 : -0.24, 62 - i * 8, easeOutCubic((g - u * 0.45) * 1.9));
    });

    // 侧仰漏斗碗形工笔蜀葵花朵（带深脉纹与细长雄蕊柱）
    [0.34, 0.52, 0.69, 0.83].forEach((u, i) => {
      const pt = evalQuad(p0, p1, p2, u);
      const side = i % 2 === 0 ? -1 : 1;
      const bg = easeOutCubic((g - 0.18 - i * 0.08) * 1.9);
      drawArtisticHollyhock(ctx, pt.x + side * 24, pt.y, 40 - i * 5.5, pal, bg, side, i + 3);
    });
    // 副株两朵错落呼应
    [0.44, 0.66].forEach((u, i) => {
      const pt = evalQuad(s0, s1, s2, u);
      const side = i === 0 ? 1 : -1;
      drawArtisticHollyhock(ctx, pt.x + side * 20, pt.y, 32 - i * 4, pal, easeOutCubic((g - 0.28 - i * 0.09) * 1.9), side, i + 11);
    });
    // 枝顶纺锤花苞
    const tip1 = evalQuad(p0, p1, p2, 0.96);
    drawHollyhockBud(ctx, tip1.x, tip1.y, 20, 0.08, easeOutCubic((g - 0.55) * 2.2), pal);
    const tip2 = evalQuad(s0, s1, s2, 0.94);
    drawHollyhockBud(ctx, tip2.x, tip2.y, 17, 0.14, easeOutCubic((g - 0.60) * 2.2), pal);
  }
  drawWoodyBlossomRealm(ctx, w, h, t, profile, pal, g, sway) {
    const p0 = { x: w * 1.02, y: h * 0.24 }, p1 = { x: w * 0.77, y: h * 0.42 + sway * 0.4 }, p2 = { x: w * 0.53, y: h * 0.36 + sway * 0.9 };
    this.drawCalligraphicBranch(ctx, p0, p1, p2, 15, 2.6, "rgba(34, 28, 28, 0.92)", g);
    [0.3, 0.5, 0.68, 0.85, 0.96].forEach((u, i) => {
      const pt = evalQuad(p0, p1, p2, u), bg = easeOutCubic((g - 0.22 - i * 0.08) * 2.0); if (bg <= 0.02) return;
      const baseAng = Math.atan2(pt.ty, pt.tx);
      if (["camellia", "pomegranate", "hibiscus", "peach"].includes(profile)) {
        const leafColor = profile === "camellia" ? "rgba(22, 56, 38, 0.92)" : "rgba(44, 70, 50, 0.84)";
        this.drawSerratedLeaf(ctx, pt.x, pt.y, baseAng + (i % 2 ? 0.85 : -0.85), profile === "peach" ? 68 : 56, profile === "peach" ? 11 : profile === "camellia" ? 26 : 18, leafColor, "rgba(155, 180, 145, 0.25)", bg);
      }
      ctx.save(); ctx.translate(pt.x, pt.y); ctx.scale(bg, bg);
      const rad = profile === "hibiscus" ? 42 : profile === "camellia" ? 32 : 24;
      if (profile === "camellia") {
        for (let ring = 0; ring < 3; ring++) {
          const cnt = 8 - ring, r = rad * (1 - ring * 0.26);
          for (let p = 0; p < cnt; p++) { const a = (p / cnt) * Math.PI * 2 + ring * 0.4; ctx.fillStyle = ring === 2 ? rgba(pal.accent, 0.9) : rgba(pal.primary, 0.92 - ring * 0.08); ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.48, 0, Math.PI * 2); ctx.fill(); }
        }
      } else if (profile === "pomegranate") {
        for (let p = 0; p < 6; p++) { const a = (p / 6) * Math.PI * 2; ctx.fillStyle = p % 2 === 0 ? rgba(pal.primary, 0.92) : rgba(pal.accent, 0.86); ctx.beginPath(); ctx.ellipse(Math.cos(a) * rad * 0.55, Math.sin(a) * rad * 0.55, rad * 0.58, rad * 0.36, a + 0.3, 0, Math.PI * 2); ctx.fill(); }
      } else {
        for (let p = 0; p < 5; p++) {
          ctx.save(); ctx.rotate((p / 5) * Math.PI * 2 + i * 0.3);
          const pg = ctx.createRadialGradient(rad * 0.3, 0, 1, rad * 0.5, 0, rad * 0.72);
          pg.addColorStop(0, rgba(pal.accent, 0.82)); pg.addColorStop(0.65, rgba(pal.primary, 0.92)); pg.addColorStop(1, rgba(pal.glow, 0.96));
          ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(rad * 0.4, -rad * 0.5, rad * 0.95, -rad * 0.36, rad, 0); ctx.bezierCurveTo(rad * 0.95, rad * 0.36, rad * 0.4, rad * 0.5, 0, 0); ctx.closePath(); ctx.fill(); ctx.restore();
        }
      }
      ctx.fillStyle = rgba(pal.glow, 0.9); ctx.beginPath(); ctx.arc(0, 0, rad * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });
  }
}
