/* ===== 6 套差异化切花转场导演层（TransitionDirector） ===== */
class TransitionDirector {
  constructor() {
    this.active = false;
    this.type = "water_ripple";
    this.elapsed = 0;
    this.duration = 2.55;
    this.pal = null;
    this.reducedMotion = false;
    this.seeds = [];
  }
  setReducedMotion(val) { this.reducedMotion = Boolean(val); }
  stop() { this.active = false; }
  trigger(flower) {
    if (!flower) { this.active = false; return; }
    this.type = getFlowerArchetype(flower);
    this.pal = paletteFromConfig(flower.palette);
    this.elapsed = 0;
    this.duration = this.reducedMotion ? 1.2 : 2.55;
    this.active = true;
    let s = 9103 + flower.id * 977;
    const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    this.seeds = Array.from({ length: 28 }, (_, i) => ({
      a: (i / 28) * Math.PI * 2 + (rand() - 0.5) * 0.25,
      r: 0.18 + rand() * 0.82,
      u: rand(),
      v: rand(),
      delay: rand() * 0.34,
      size: 0.65 + rand() * 1.1,
      phase: rand() * Math.PI * 2,
    }));
  }
  render(ctx, w, h, dt) {
    if (!this.active || !this.pal) return;
    this.elapsed += dt;
    const p = this.elapsed / this.duration;
    if (p >= 1) { this.active = false; return; }

    const fade = Math.sin(Math.min(1, p) * Math.PI);
    const pal = this.pal;
    ctx.save();

    if (this.type === "frost_sweep") {
      // 梅花/山茶：斜向寒风气浪横扫 + 冰雾辉光 + 飞白雪线
      const sweep = easeOutCubic(p);
      const bandX = w * (1.28 - sweep * 1.62);
      ctx.save();
      ctx.translate(bandX, h * 0.48);
      ctx.rotate(-0.34);
      const wg = ctx.createLinearGradient(-w * 0.28, 0, w * 0.32, 0);
      wg.addColorStop(0, rgba(pal.glow, 0));
      wg.addColorStop(0.38, rgba(pal.mist, fade * 0.22));
      wg.addColorStop(0.55, rgba(pal.glow, fade * 0.28));
      wg.addColorStop(0.75, rgba(pal.primary, fade * 0.14));
      wg.addColorStop(1, rgba(pal.glow, 0));
      ctx.fillStyle = wg;
      ctx.fillRect(-w * 0.32, -h * 1.1, w * 0.64, h * 2.2);

      // 寒风飞白线条
      ctx.lineCap = "round";
      for (let i = 0; i < 14; i++) {
        const s = this.seeds[i];
        const lx = (s.u - 0.5) * w * 0.36;
        const ly = (s.v - 0.5) * h * 1.25;
        const len = 50 + s.size * 110;
        ctx.strokeStyle = rgba(i % 3 === 0 ? pal.primary : pal.glow, fade * (0.14 + s.u * 0.24));
        ctx.lineWidth = 0.8 + s.size * 0.9;
        ctx.beginPath();
        ctx.moveTo(lx, ly - len * 0.5);
        ctx.lineTo(lx, ly + len * 0.5);
        ctx.stroke();
      }
      ctx.restore();

      // 边缘冷霜闪点
      for (let i = 14; i < this.seeds.length; i++) {
        const s = this.seeds[i];
        const sp = Math.max(0, Math.min(1, (p - s.delay) / 0.62));
        if (sp <= 0 || sp >= 1) continue;
        const sx = w * (1.05 - easeOutCubic(sp) * (0.4 + s.u * 0.72));
        const sy = h * (0.08 + s.v * 0.78 + sp * 0.14);
        const rad = 2.5 + s.size * 3.5;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(sp * 2.4 + s.phase);
        ctx.strokeStyle = rgba(pal.glow, Math.sin(sp * Math.PI) * 0.55);
        ctx.lineWidth = 1.0;
        for (let k = 0; k < 3; k++) {
          ctx.rotate(Math.PI / 3);
          ctx.beginPath(); ctx.moveTo(-rad, 0); ctx.lineTo(rad, 0); ctx.stroke();
        }
        ctx.restore();
      }

    } else if (this.type === "rain_curtain") {
      // 杏花/芙蓉：宣纸水墨毛边晕染脉冲 + 斜织微雨帘幕
      const cx = w * 0.68, cy = h * 0.44;
      for (let ring = 0; ring < 3; ring++) {
        const mp = Math.max(0, Math.min(1, p * 1.18 - ring * 0.15));
        if (mp <= 0) continue;
        const baseR = easeOutCubic(mp) * Math.max(w, h) * (0.28 + ring * 0.14);
        const alpha = Math.sin(mp * Math.PI) * (0.16 - ring * 0.03);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        const segs = 48;
        for (let i = 0; i <= segs; i++) {
          const ang = (i / segs) * Math.PI * 2;
          const wobble = 1 + Math.sin(ang * 5 + ring * 2.1) * 0.055 + Math.cos(ang * 9 - mp * 2.4) * 0.035;
          const px = Math.cos(ang) * baseR * wobble;
          const py = Math.sin(ang) * baseR * wobble * 0.88;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        const ig = ctx.createRadialGradient(0, 0, baseR * 0.45, 0, 0, baseR * 1.08);
        ig.addColorStop(0, rgba(pal.mist, 0));
        ig.addColorStop(0.72, rgba(ring === 1 ? pal.primary : pal.mist, alpha));
        ig.addColorStop(1, rgba(pal.bg_deep, 0));
        ctx.fillStyle = ig;
        ctx.fill();
        ctx.strokeStyle = rgba(pal.primary, alpha * 0.9);
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.restore();
      }

      // 斜雨银丝帘
      ctx.strokeStyle = rgba(pal.glow, fade * 0.24);
      ctx.lineWidth = 0.9;
      for (let i = 0; i < 24; i++) {
        const s = this.seeds[i];
        const rx = ((s.u * 1.25 - p * 0.22 + 1) % 1.25) * w;
        const ry = ((s.v + p * (0.85 + s.size * 0.35)) % 1.15 - 0.1) * h;
        const len = 26 + s.size * 34;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - len * 0.26, ry + len);
        ctx.stroke();
      }

    } else if (this.type === "petal_vortex") {
      // 桃花/桂花：极坐标花阵旋风 + 流光弧线
      const cx = w * 0.67, cy = h * 0.46;
      const maxR = Math.min(w, h) * 0.62;
      ctx.lineCap = "round";
      for (const s of this.seeds) {
        const sp = Math.max(0, Math.min(1, (p - s.delay) / 0.66));
        if (sp <= 0 || sp >= 1) continue;
        const e = easeOutCubic(sp);
        const startAng = s.a + e * 2.55;
        const arcLen = 0.32 + (1 - sp) * 0.55;
        const rad = maxR * s.r * (1.12 - e * 0.52);
        const a = Math.sin(sp * Math.PI) * 0.36;
        ctx.strokeStyle = rgba(s.u > 0.5 ? pal.primary : pal.glow, a);
        ctx.lineWidth = 1.1 + s.size * 1.4;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, startAng, startAng + arcLen);
        ctx.stroke();

        // 弧首飘瓣高光点
        const tipX = cx + Math.cos(startAng + arcLen) * rad;
        const tipY = cy + Math.sin(startAng + arcLen) * rad;
        ctx.save();
        ctx.translate(tipX, tipY);
        ctx.rotate(startAng + arcLen + Math.PI * 0.5);
        ctx.fillStyle = rgba(pal.glow, a * 1.65);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.8 * s.size, 1.9 * s.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

    } else if (this.type === "imperial_bloom") {
      // 牡丹/蜀葵：去 AI 感宣纸泥金晕染 + 细笔云纹弧线 + 飘散金箔微片
      const cx = w * 0.72, cy = h * 0.46;
      const expand = easeOutQuint(p);
      const maxR = Math.max(w, h) * 0.56 * expand;

      const rg = ctx.createRadialGradient(cx, cy, maxR * 0.28, cx, cy, Math.max(12, maxR));
      rg.addColorStop(0, rgba(pal.mist, 0));
      rg.addColorStop(0.62, rgba(pal.primary, fade * 0.11));
      rg.addColorStop(0.84, rgba(pal.accent, fade * 0.13));
      rg.addColorStop(1, rgba(pal.bg_deep, 0));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.fill();

      // 手绘毛边淡金笔环
      ctx.lineCap = "round";
      [0.52, 0.78].forEach((sc, idx) => {
        const ringR = maxR * sc;
        for (let k = 0; k < 4; k++) {
          const a0 = k * Math.PI * 0.5 + p * (idx === 0 ? 0.35 : -0.25) + idx * 0.4;
          ctx.strokeStyle = rgba(idx === 0 ? pal.accent : pal.primary, fade * (0.26 - idx * 0.06));
          ctx.lineWidth = idx === 0 ? 1.5 : 1.0;
          ctx.beginPath();
          ctx.arc(cx, cy, ringR, a0, a0 + 0.95);
          ctx.stroke();
        }
      });

      // 细碎泥金箔片由花心轻缓舒展
      for (let i = 0; i < 20; i++) {
        const s = this.seeds[i];
        const sp = Math.max(0, Math.min(1, (p - s.delay * 0.7) / 0.72));
        if (sp <= 0 || sp >= 1) continue;
        const dist = easeOutCubic(sp) * maxR * (0.35 + s.r * 0.65);
        const fx = cx + Math.cos(s.a + sp * 0.3) * dist;
        const fy = cy + Math.sin(s.a + sp * 0.3) * dist - sp * 18;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(s.phase + sp * 2.2);
        ctx.fillStyle = rgba(i % 3 === 0 ? pal.glow : pal.accent, Math.sin(sp * Math.PI) * 0.62);
        ctx.fillRect(-2.2 * s.size, -1.4 * s.size, 4.4 * s.size, 2.8 * s.size);
        ctx.restore();
      }

    } else if (this.type === "ember_surge") {
      // 石榴/菊花：底部暖色热浪升腾 + 摇曳光焰流线
      const rise = easeOutCubic(p);
      const grad = ctx.createLinearGradient(0, h, 0, h * (1 - rise * 0.92));
      grad.addColorStop(0, rgba(pal.accent, fade * 0.30));
      grad.addColorStop(0.42, rgba(pal.primary, fade * 0.14));
      grad.addColorStop(1, rgba(pal.primary, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.lineCap = "round";
      for (let i = 0; i < 18; i++) {
        const s = this.seeds[i];
        const sp = Math.max(0, Math.min(1, (p - s.delay * 0.8) / 0.72));
        if (sp <= 0 || sp >= 1) continue;
        const baseX = w * (0.15 + s.u * 0.78);
        const curY = h * (1.06 - easeOutCubic(sp) * (0.55 + s.v * 0.55));
        const tailH = 42 + s.size * 58;
        const sway1 = Math.sin(sp * 7 + s.phase) * 18;
        const sway2 = Math.sin(sp * 7 + s.phase - 1.2) * 14;
        const lg = ctx.createLinearGradient(baseX + sway1, curY, baseX + sway2, curY + tailH);
        lg.addColorStop(0, rgba(pal.glow, Math.sin(sp * Math.PI) * 0.65));
        lg.addColorStop(0.45, rgba(pal.accent, Math.sin(sp * Math.PI) * 0.36));
        lg.addColorStop(1, rgba(pal.primary, 0));
        ctx.strokeStyle = lg;
        ctx.lineWidth = 1.2 + s.size * 1.1;
        ctx.beginPath();
        ctx.moveTo(baseX + sway1, curY);
        ctx.quadraticCurveTo(baseX - sway1 * 0.4, curY + tailH * 0.5, baseX + sway2, curY + tailH);
        ctx.stroke();
      }

    } else if (this.type === "water_ripple") {
      // 荷花/水仙：柔和淡墨水波晕开（克制线宽与透明度，去生硬矢量椭圆感）
      const cx = w * 0.72, cy = h * 0.64;
      for (let i = 0; i < 3; i++) {
        const rp = Math.max(0, p * 1.22 - i * 0.18);
        if (rp <= 0 || rp >= 1) continue;
        const rad = easeOutCubic(rp) * Math.max(w, h) * 0.52;
        const a = (1 - rp) * Math.min(1, rp * 4) * 0.24;
        ctx.strokeStyle = rgba(i === 0 ? pal.glow : pal.mist, a);
        ctx.lineWidth = (1 - rp) * 2.0 + 0.5;
        // 断续水波弧段而非闭合硬椭圆
        for (let seg = 0; seg < 2; seg++) {
          const a0 = seg * Math.PI + i * 0.45 + 0.2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rad, rad * 0.24, -0.02, a0, a0 + 2.15);
          ctx.stroke();
        }
      }
      // 柔和水平水雾微光掠过
      const sweepX = w * (1.18 - easeOutCubic(p) * 1.42);
      const sg = ctx.createLinearGradient(sweepX - 240, 0, sweepX + 240, 0);
      sg.addColorStop(0, rgba(pal.mist, 0));
      sg.addColorStop(0.5, rgba(pal.glow, fade * 0.10));
      sg.addColorStop(1, rgba(pal.mist, 0));
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }
}

/* ===== 前景粒子场（解除 reveal 一刀切 + 补全 12 种粒子形态） ===== */
class ParticleField {
  constructor(canvas, transitionDirector) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.transitionDirector = transitionDirector;
    this.width = 1920; this.height = 1080; this.dpr = 1;
    this.stage = "idle";
    this.style = "idle_mist";
    this.archetype = "idle";
    this.reducedMotion = false;
    this.primaryColor = hexToRgb("#e8c872");
    this.accentColor = hexToRgb("#c99638");
    this.glowColor = hexToRgb("#fff6d6");
    this.burstTime = 0;
    this.particles = [];
    this.resize();
    this.initParticles(92);
  }
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth; this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
  initParticles(count) {
    this.particles = Array.from({ length: count }, (_, idx) => this.spawnParticle(true, idx));
  }
  spawnParticle(randomY = false, idx = 0) {
    const depth = 0.38 + Math.random() * 0.92;
    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : -20 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 18 * depth,
      vy: (12 + Math.random() * 24) * depth,
      size: (2.0 + Math.random() * 4.4) * depth,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 1.5,
      phase: Math.random() * Math.PI * 2,
      variant: idx % 3,
      depth,
      alpha: 0.22 + Math.random() * 0.56,
    };
  }
  setStage(stage, flower) {
    const isRevealSwitch = stage === "reveal" && flower;
    this.stage = stage;
    if (flower) {
      this.style = flower.particle_style || "osmanthus_rain";
      this.archetype = getFlowerArchetype(flower);
      this.primaryColor = hexToRgb(flower.palette?.primary || "#e8c872");
      this.accentColor = hexToRgb(flower.palette?.accent || "#c99638");
      this.glowColor = hexToRgb(flower.palette?.glow || "#fff6d6");
      if (isRevealSwitch) {
        this.burstTime = 2.4;
        this.energizeForArchetype();
      }
    } else if (stage === "idle") {
      this.style = "idle_mist";
      this.archetype = "idle";
      this.primaryColor = hexToRgb("#e8dcc4");
      this.accentColor = hexToRgb("#c8b694");
      this.glowColor = hexToRgb("#fff6e4");
      this.burstTime = 0;
    }
  }
  energizeForArchetype() {
    const w = this.width, h = this.height;
    const cx = w * 0.72, cy = h * 0.46;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (this.archetype === "imperial_bloom" && i % 2 === 0) {
        const ang = Math.random() * Math.PI * 2;
        const r = 14 + Math.random() * 78;
        p.x = cx + Math.cos(ang) * r;
        p.y = cy + Math.sin(ang) * r;
      } else if (this.archetype === "ember_surge" && i % 2 === 0) {
        p.y = h * (0.68 + Math.random() * 0.35);
      } else if (this.archetype === "frost_sweep" && i % 3 === 0) {
        p.x = w * (0.65 + Math.random() * 0.4);
      }
    }
  }
  setReducedMotion(val) { this.reducedMotion = Boolean(val); }

  drawSingleParticle(ctx, p, a, timeSec) {
    const s = p.size;
    if (this.style === "osmanthus_rain") {
      ctx.fillStyle = rgba(p.variant === 0 ? this.glowColor : this.primaryColor, a);
      const r = s * 0.76;
      for (let k = 0; k < 4; k++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(r * 0.76, 0, r * 0.66, r * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.style === "snow_petals") {
      if (p.variant === 0) {
        // 梅瓣
        const flip = 0.45 + 0.55 * Math.abs(Math.cos(timeSec * 1.4 + p.phase));
        ctx.scale(1, flip);
        ctx.fillStyle = rgba(this.primaryColor, a * 0.92);
        ctx.beginPath();
        ctx.arc(0, 0, s * 1.05, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 六出雪晶
        ctx.strokeStyle = rgba(this.glowColor, a * 0.92);
        ctx.lineWidth = 0.95;
        const r = s * 1.18;
        for (let k = 0; k < 3; k++) {
          ctx.rotate(Math.PI / 3);
          ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
        }
      }
    } else if (this.style === "winter_flakes") {
      // 山茶冬雪晶
      ctx.strokeStyle = rgba(this.glowColor, a * 0.92);
      ctx.lineWidth = 1.0;
      const r = s * 1.25;
      for (let k = 0; k < 3; k++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
        ctx.moveTo(r * 0.52, -r * 0.24); ctx.lineTo(r * 0.74, 0); ctx.lineTo(r * 0.52, r * 0.24);
        ctx.moveTo(-r * 0.52, -r * 0.24); ctx.lineTo(-r * 0.74, 0); ctx.lineTo(-r * 0.52, r * 0.24);
        ctx.stroke();
      }
    } else if (this.style === "spring_rain") {
      if (p.variant === 0) {
        // 偶见飘落杏瓣
        ctx.fillStyle = rgba(this.primaryColor, a * 0.86);
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 1.15, s * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 细斜春雨
        ctx.rotate(-p.rot); // 雨丝保持统一倾角
        ctx.strokeStyle = rgba(this.glowColor, a * 0.52);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-4.8 * p.depth, 18 * p.depth);
        ctx.stroke();
      }
    } else if (this.style === "drifting_petals" || this.style === "mist_petals") {
      // 带翻转立体感的双曲线花瓣
      const flip = 0.35 + 0.65 * Math.abs(Math.cos(timeSec * 1.6 + p.phase));
      ctx.scale(1, flip);
      const len = s * 1.65, wid = s * 0.92;
      const pg = ctx.createLinearGradient(-len, 0, len, 0);
      pg.addColorStop(0, rgba(this.accentColor, a * 0.85));
      pg.addColorStop(0.65, rgba(this.primaryColor, a * 0.95));
      pg.addColorStop(1, rgba(this.glowColor, a * 0.9));
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.moveTo(-len * 0.8, 0);
      ctx.bezierCurveTo(-len * 0.2, -wid, len * 0.65, -wid * 0.8, len, 0);
      ctx.bezierCurveTo(len * 0.65, wid * 0.8, -len * 0.2, wid, -len * 0.8, 0);
      ctx.closePath();
      ctx.fill();
    } else if (this.style === "autumn_leaves") {
      // 细长秋菊丝瓣 / 秋叶
      const len = s * 2.1, wid = s * 0.48;
      ctx.fillStyle = rgba(p.variant === 0 ? this.accentColor : this.primaryColor, a * 0.9);
      ctx.beginPath();
      ctx.moveTo(-len, 0);
      ctx.quadraticCurveTo(0, -wid, len, 0);
      ctx.quadraticCurveTo(0, wid, -len, 0);
      ctx.closePath();
      ctx.fill();
    } else if (this.style === "warm_embers") {
      // 上升曳尾火星
      ctx.rotate(-p.rot);
      const tail = s * (3.0 + p.depth * 1.8);
      const eg = ctx.createLinearGradient(0, 0, 0, tail);
      eg.addColorStop(0, rgba(this.glowColor, a));
      eg.addColorStop(0.35, rgba(this.accentColor, a * 0.82));
      eg.addColorStop(1, rgba(this.primaryColor, 0));
      ctx.strokeStyle = eg;
      ctx.lineWidth = Math.max(1.1, s * 0.58);
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, tail); ctx.stroke();
      ctx.fillStyle = rgba(this.glowColor, a);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2); ctx.fill();
    } else if (this.style === "water_gleam") {
      // 凌波十字星芒
      ctx.rotate(-p.rot * 0.6);
      const r = s * 2.05;
      ctx.fillStyle = rgba(this.glowColor, a * 0.95);
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(0, 0, r * 0.5, 0);
      ctx.quadraticCurveTo(0, 0, 0, r);
      ctx.quadraticCurveTo(0, 0, -r * 0.5, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r);
      ctx.fill();
      ctx.fillStyle = rgba(this.accentColor, a * 0.45);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2); ctx.fill();
    } else if (this.style === "golden_pollen" || this.style === "summer_motes") {
      // 鎏金花粉 / 晚夏光尘（中心棱星 + 外层光晕）
      const r = s * 1.7;
      const g = ctx.createRadialGradient(0, 0, 0.2, 0, 0, r);
      g.addColorStop(0, rgba(this.glowColor, a));
      g.addColorStop(0.45, rgba(this.accentColor, a * 0.55));
      g.addColorStop(1, rgba(this.primaryColor, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      if (p.variant === 0) {
        ctx.fillStyle = rgba(this.glowColor, a);
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.8); ctx.lineTo(s * 0.32, 0); ctx.lineTo(0, s * 0.8); ctx.lineTo(-s * 0.32, 0);
        ctx.closePath(); ctx.fill();
      }
    } else if (this.style === "water_fireflies") {
      // 碧池萤火
      const pulse = 0.55 + 0.45 * Math.sin(timeSec * 3.4 + p.phase * 2);
      const r = s * 1.9 * (0.85 + 0.25 * pulse);
      const g = ctx.createRadialGradient(0, 0, 0.2, 0, 0, r);
      g.addColorStop(0, rgba(this.glowColor, a * pulse));
      g.addColorStop(0.42, rgba(this.accentColor, a * 0.52 * pulse));
      g.addColorStop(1, rgba(this.accentColor, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    } else {
      // idle_mist 默认浮岚微尘
      const r = s * 1.45;
      const g = ctx.createRadialGradient(0, 0, 0.2, 0, 0, r);
      g.addColorStop(0, rgba(this.glowColor, a));
      g.addColorStop(0.5, rgba(this.primaryColor, a * 0.45));
      g.addColorStop(1, rgba(this.primaryColor, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  render(timeSec, dt) {
    const ctx = this.ctx, w = this.width, h = this.height;
    ctx.clearRect(0, 0, w, h);

    // 先绘制切花瞬间转场特效层
    if (this.transitionDirector) {
      this.transitionDirector.render(ctx, w, h, dt);
    }

    if (this.burstTime > 0) this.burstTime = Math.max(0, this.burstTime - dt);
    const burstFactor = this.burstTime / 2.4;
    const speedMul = this.reducedMotion ? 0.25 : 1.0;
    const globalAlpha = this.stage === "playing" ? 0.52 : this.stage === "reveal" ? 0.98 : this.stage === "returning" ? 0.45 : 0.78;
    const count = this.reducedMotion ? Math.floor(this.particles.length * 0.45) : this.particles.length;

    const cx = w * 0.70, cy = h * 0.46;

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      const sway = Math.sin(timeSec * 1.15 + p.phase) * 16 * p.depth;

      if (this.stage === "reveal") {
        // 6 套原型差异化 reveal 粒子动力学
        const dx = p.x - cx, dy = p.y - cy;
        const dist = Math.hypot(dx, dy) + 1;

        if (this.archetype === "frost_sweep") {
          const gust = 1 + burstFactor * 1.6;
          p.x -= (155 * gust + sway * 0.9) * p.depth * dt * speedMul;
          p.y += (82 * gust + Math.cos(timeSec * 2 + p.phase) * 24) * p.depth * dt * speedMul;
        } else if (this.archetype === "rain_curtain") {
          p.x -= (48 + burstFactor * 36) * p.depth * dt * speedMul;
          p.y += (165 + burstFactor * 115) * p.depth * dt * speedMul;
        } else if (this.archetype === "petal_vortex") {
          const swirl = 145 + burstFactor * 130;
          const pull = 0.24 + burstFactor * 0.16;
          p.x += ((-dy / dist) * swirl - dx * pull) * p.depth * dt * speedMul;
          p.y += ((dx / dist) * swirl - dy * pull) * p.depth * dt * speedMul;
        } else if (this.archetype === "imperial_bloom") {
          const radial = 65 + burstFactor * 115;
          p.x += ((dx / dist) * radial + sway * 0.6) * p.depth * dt * speedMul;
          p.y += ((dy / dist) * radial - 26) * p.depth * dt * speedMul;
        } else if (this.archetype === "ember_surge") {
          p.x += Math.sin(timeSec * 4.5 + p.phase) * (46 + burstFactor * 38) * p.depth * dt * speedMul;
          p.y -= (118 + burstFactor * 125 + p.vy * 1.3) * p.depth * dt * speedMul;
        } else {
          // water_ripple: 轻盈上浮微颤 + 水平涟漪荡漾
          p.x += (Math.cos(timeSec * 1.6 + p.phase) * 26 + sway * 0.8) * dt * speedMul;
          p.y -= (24 + burstFactor * 36 + p.vy * 0.35) * p.depth * dt * speedMul;
        }
      } else if (this.stage === "returning") {
        p.x -= 48 * p.depth * dt * speedMul;
        p.y -= 24 * p.depth * dt * speedMul;
      } else if (["water_fireflies", "warm_embers", "idle_mist", "golden_pollen", "summer_motes"].includes(this.style)) {
        p.x += (p.vx * 0.6 + sway * 0.75) * dt * speedMul;
        p.y -= (10 + p.vy * (this.style === "warm_embers" ? 0.95 : 0.42)) * dt * speedMul;
      } else if (this.style === "spring_rain") {
        p.x -= 30 * p.depth * dt * speedMul;
        p.y += 105 * p.depth * dt * speedMul;
      } else if (this.style === "water_gleam") {
        p.x += (16 + sway * 0.5) * p.depth * dt * speedMul;
        p.y += Math.sin(timeSec * 0.9 + p.phase) * 10 * dt * speedMul;
      } else {
        p.x += (p.vx * 0.5 + sway) * dt * speedMul;
        p.y += p.vy * 0.85 * dt * speedMul;
      }

      p.rot += p.vrot * dt * speedMul;
      if (p.y > h + 32) { p.y = -24; p.x = Math.random() * w; }
      if (p.y < -36) { p.y = h + 24; p.x = Math.random() * w; }
      if (p.x > w + 36) { p.x = -26; p.y = Math.random() * h; }
      if (p.x < -36) { p.x = w + 26; p.y = Math.random() * h; }

      const a = p.alpha * globalAlpha * (0.65 + 0.35 * Math.sin(timeSec * 2.1 + p.phase));
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      this.drawSingleParticle(ctx, p, a, timeSec);
      ctx.restore();
    }
  }
}
