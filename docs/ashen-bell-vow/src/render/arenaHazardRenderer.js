// Hand-Drawn Ink & Light Renderer for Generic Arena Hazards (v47.0)
// Forest Thorns (thornCarpet, brambleCage, rootSpike) & Radiant Judgment (solarPillar, prismBeam, radiantCross)
import { COLORS, FLOOR_Y } from '../config.js';
import { G } from '../state.js';
import { drawGlowSprite, boilLine, boilCircle } from '../vfx.js';

export function drawArenaHazards() {
  if (!Array.isArray(G.arenaHazards) || G.arenaHazards.length === 0) return;
  const ctx = G.ctx;
  const now = G.globalTime || 0;

  for (let i = 0; i < G.arenaHazards.length; i++) {
    const h = G.arenaHazards[i];
    const fy = h.y !== undefined ? h.y : FLOOR_Y;
    const isTel = h.phase === 'telegraph';
    const isFade = h.phase === 'fade';
    const telP = isTel ? (1 - Math.max(0, h.timer / Math.max(0.01, h.maxTelegraph))) : 1;
    const fadeA = isFade ? Math.max(0, h.timer / Math.max(0.01, h.fadeDur)) : 1;

    ctx.save();
    ctx.globalAlpha = fadeA;

    if (h.kind === 'thornCarpet') {
      const w = h.w || 360;
      const th = h.h || 30;
      if (isTel) {
        const pulse = 0.55 + Math.sin(now * 26) * 0.35;
        ctx.fillStyle = `rgba(34, 197, 94, ${(0.12 + telP * 0.20).toFixed(3)})`;
        ctx.fillRect(h.x, fy - 12, w, 12);
        ctx.strokeStyle = `rgba(74, 222, 128, ${(0.62 + 0.35 * pulse).toFixed(3)})`;
        ctx.lineWidth = 2.0;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(h.x, fy - 2);
        ctx.lineTo(h.x + w, fy - 2);
        ctx.stroke();
        ctx.setLineDash([]);
        const buds = Math.max(6, Math.floor(w / 28));
        ctx.strokeStyle = '#86efac';
        ctx.lineWidth = 1.6;
        for (let b = 0; b <= buds; b++) {
          const bx = h.x + (w * b) / buds;
          const bh = 5 + telP * 11;
          ctx.beginPath();
          ctx.moveTo(bx - 4, fy); ctx.lineTo(bx, fy - bh); ctx.lineTo(bx + 4, fy);
          ctx.stroke();
        }
      } else {
        const grow = isFade ? fadeA : Math.min(1, (h.activeDur - h.timer) / 0.14);
        const curH = th * Math.max(0.15, grow);
        ctx.fillStyle = 'rgba(12, 42, 26, 0.90)';
        ctx.fillRect(h.x, fy - curH * 0.42, w, curH * 0.42);
        const teeth = Math.max(10, Math.floor(w / 20));
        ctx.fillStyle = '#14532d';
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(h.x, fy);
        for (let k = 0; k < teeth; k++) {
          const x0 = h.x + (w * k) / teeth;
          const x1 = h.x + (w * (k + 1)) / teeth;
          const xm = (x0 + x1) * 0.5 + (k % 2 === 0 ? 3 : -3);
          const pk = curH * (k % 2 === 0 ? 1.08 : 0.78);
          ctx.lineTo(xm, fy - pk);
          ctx.lineTo(x1, fy - 4);
        }
        ctx.lineTo(h.x + w, fy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#86efac';
        ctx.lineWidth = 1.3;
        boilLine(ctx, h.x + 4, fy - curH * 0.35, h.x + w - 4, fy - curH * 0.35, 7200 + Math.round(h.x), 2.2, 6);
      }
    } else if (h.kind === 'brambleCage') {
      const hw = h.halfW || 96;
      const ch = h.h || 148;
      const ww = h.wallW || 18;
      if (isTel) {
        const slideOff = (1 - telP) * 52;
        const lx = h.cx - hw - slideOff;
        const rx = h.cx + hw + slideOff;
        const alpha = 0.40 + telP * 0.55;
        ctx.strokeStyle = telP > 0.72 ? COLORS.crimsonBright : '#4ade80';
        ctx.fillStyle = `rgba(34, 197, 94, ${(0.10 + telP * 0.14).toFixed(3)})`;
        ctx.lineWidth = 2.0;
        ctx.setLineDash([6, 5]);
        ctx.fillRect(lx - ww, fy - ch, ww, ch);
        ctx.strokeRect(lx - ww, fy - ch, ww, ch);
        ctx.fillRect(rx, fy - ch, ww, ch);
        ctx.strokeRect(rx, fy - ch, ww, ch);
        ctx.beginPath();
        ctx.moveTo(lx - ww * 0.5, fy - ch);
        ctx.quadraticCurveTo(h.cx, fy - ch - 32, rx + ww * 0.5, fy - ch);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(lx - 14, fy - ch * 0.5 - 7); ctx.lineTo(lx - 5, fy - ch * 0.5); ctx.lineTo(lx - 14, fy - ch * 0.5 + 7);
        ctx.moveTo(rx + 14, fy - ch * 0.5 - 7); ctx.lineTo(rx + 5, fy - ch * 0.5); ctx.lineTo(rx + 14, fy - ch * 0.5 + 7);
        ctx.stroke();
      } else {
        const flash = h.hurtFlash > 0;
        const drawBar = (bx, side) => {
          ctx.fillStyle = flash ? '#ffffff' : '#113322';
          ctx.strokeStyle = flash ? '#fef08a' : '#4ade80';
          ctx.lineWidth = 2.2;
          ctx.fillRect(bx, fy - ch, ww, ch);
          ctx.strokeRect(bx, fy - ch, ww, ch);
          ctx.strokeStyle = flash ? '#fef08a' : '#86efac';
          ctx.lineWidth = 1.6;
          for (let ry = fy - 18; ry > fy - ch + 10; ry -= 22) {
            ctx.beginPath();
            ctx.moveTo(bx, ry); ctx.lineTo(bx + ww, ry - 10);
            ctx.stroke();
            const tipX = side < 0 ? (bx + ww + 9) : (bx - 9);
            const baseX = side < 0 ? (bx + ww) : bx;
            ctx.beginPath();
            ctx.moveTo(baseX, ry - 4); ctx.lineTo(tipX, ry); ctx.lineTo(baseX, ry + 5);
            ctx.stroke();
          }
        };
        drawBar(h.cx - hw - ww, -1);
        drawBar(h.cx + hw, 1);
        ctx.strokeStyle = flash ? '#fef08a' : '#4ade80';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(h.cx - hw - ww * 0.5, fy - ch + 4);
        ctx.quadraticCurveTo(h.cx, fy - ch - 28, h.cx + hw + ww * 0.5, fy - ch + 4);
        ctx.stroke();
        const hpRatio = Math.max(0, Math.min(1, (h.hp || 0) / Math.max(1, h.maxHp || 52)));
        ctx.fillStyle = 'rgba(8, 12, 18, 0.85)';
        ctx.fillRect(h.cx - 28, fy - ch - 30, 56, 6);
        ctx.fillStyle = hpRatio > 0.45 ? '#4ade80' : '#f59e0b';
        ctx.fillRect(h.cx - 27, fy - ch - 29, 54 * hpRatio, 4);
      }
    } else if (h.kind === 'rootSpike') {
      const sw = h.w || 46;
      const sh = h.h || 112;
      if (isTel) {
        drawGlowSprite('cyan', h.x, fy - 6, 36 + telP * 24, 0.34);
        ctx.strokeStyle = telP > 0.7 ? COLORS.crimsonBright : '#4ade80';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.ellipse(h.x, fy - 2, sw * (0.72 - telP * 0.16), 7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(h.x, fy); ctx.lineTo(h.x, fy - sh * (0.28 + telP * 0.72));
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const ext = isFade ? fadeA : Math.min(1, (h.activeDur - h.timer) / 0.08);
        const curH = sh * ext;
        ctx.fillStyle = 'rgba(15, 62, 36, 0.94)';
        ctx.strokeStyle = '#6ee7b7';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(h.x - sw * 0.48, fy);
        ctx.lineTo(h.x - sw * 0.22, fy - curH * 0.62);
        ctx.lineTo(h.x - sw * 0.34, fy - curH * 0.68);
        ctx.lineTo(h.x, fy - curH);
        ctx.lineTo(h.x + sw * 0.34, fy - curH * 0.66);
        ctx.lineTo(h.x + sw * 0.22, fy - curH * 0.60);
        ctx.lineTo(h.x + sw * 0.48, fy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#bbf7d0';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(h.x, fy - 4); ctx.lineTo(h.x, fy - curH * 0.88); ctx.stroke();
      }
    } else if (h.kind === 'solarPillar') {
      const pw = h.w || 68;
      const topY = h.topY !== undefined ? h.topY : (fy - 660);
      const colH = fy - topY;
      if (isTel) {
        const railHalf = pw * (0.52 - telP * 0.36);
        const g = ctx.createLinearGradient(h.x, topY, h.x, fy);
        g.addColorStop(0, `rgba(254, 240, 138, ${(0.05 + telP * 0.14).toFixed(3)})`);
        g.addColorStop(1, `rgba(245, 158, 11, ${(0.12 + telP * 0.22).toFixed(3)})`);
        ctx.fillStyle = g;
        ctx.fillRect(h.x - pw * 0.46, topY, pw * 0.92, colH);
        ctx.strokeStyle = telP > 0.78 ? '#ffffff' : '#fde047';
        ctx.lineWidth = 1.5 + telP * 1.4;
        ctx.beginPath();
        ctx.moveTo(h.x - railHalf, topY); ctx.lineTo(h.x - railHalf, fy);
        ctx.moveTo(h.x + railHalf, topY); ctx.lineTo(h.x + railHalf, fy);
        ctx.stroke();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.ellipse(h.x, fy - 2, pw * 0.56, 8, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(h.x, fy - 2, pw * (0.56 * (1 - telP * 0.65)), 5, 0, 0, Math.PI * 2); ctx.stroke();
      } else {
        const halfW = pw * 0.5 * (isFade ? (0.4 + 0.6 * fadeA) : 1);
        const bg = ctx.createLinearGradient(h.x - halfW, 0, h.x + halfW, 0);
        bg.addColorStop(0, 'rgba(245, 158, 11, 0)');
        bg.addColorStop(0.22, 'rgba(245, 158, 11, 0.72)');
        bg.addColorStop(0.5, 'rgba(255, 251, 235, 0.94)');
        bg.addColorStop(0.78, 'rgba(245, 158, 11, 0.72)');
        bg.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = bg;
        ctx.fillRect(h.x - halfW, topY, halfW * 2, colH);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(h.x - halfW * 0.68, topY); ctx.lineTo(h.x - halfW * 0.68, fy);
        ctx.moveTo(h.x + halfW * 0.68, topY); ctx.lineTo(h.x + halfW * 0.68, fy);
        ctx.stroke();
        drawGlowSprite('gold', h.x, fy - 12, pw * 1.4, 0.76 * fadeA);
      }
    } else if (h.kind === 'prismBeam') {
      const ang = isTel ? h.startAngle : h.curAngle;
      const len = h.len || 920;
      const ex = h.ox + Math.cos(ang) * len;
      const ey = h.oy + Math.sin(ang) * len;
      if (isTel) {
        const sweepDir = h.endAngle >= h.startAngle ? 1 : -1;
        ctx.fillStyle = `rgba(253, 224, 71, ${(0.05 + telP * 0.07).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(h.ox, h.oy);
        ctx.arc(h.ox, h.oy, 190, h.startAngle, h.endAngle, sweepDir < 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = telP > 0.75 ? '#ffffff' : '#fde047';
        ctx.lineWidth = 1.5 + telP * 1.6;
        ctx.setLineDash([10, 6]);
        ctx.beginPath(); ctx.moveTo(h.ox, h.oy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.setLineDash([]);
        drawGlowSprite('gold', h.ox, h.oy, 36 + telP * 24, 0.72);
        ctx.strokeStyle = '#fef9c3';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(h.ox, h.oy - 12); ctx.lineTo(h.ox + 12, h.oy); ctx.lineTo(h.ox, h.oy + 12); ctx.lineTo(h.ox - 12, h.oy);
        ctx.closePath(); ctx.stroke();
      } else {
        const bw = (h.width || 28) * (isFade ? fadeA : 1);
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.42)';
        ctx.lineWidth = bw * 1.65;
        ctx.beginPath(); ctx.moveTo(h.ox, h.oy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = bw * 0.92;
        ctx.beginPath(); ctx.moveTo(h.ox, h.oy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#fffbeb';
        ctx.lineWidth = bw * 0.42;
        ctx.beginPath(); ctx.moveTo(h.ox, h.oy); ctx.lineTo(ex, ey); ctx.stroke();
        drawGlowSprite('gold', h.ox, h.oy, 62, 0.85 * fadeA);
      }
    } else if (h.kind === 'radiantCross') {
      const halfL = (h.len || 760) * 0.5;
      const baseA = h.baseAngle || 0;
      if (isTel) {
        drawGlowSprite('gold', h.cx, h.cy, 54 + telP * 32, 0.65);
        ctx.save();
        ctx.translate(h.cx, h.cy);
        ctx.rotate(baseA + now * 1.6);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2.0;
        boilCircle(ctx, 0, 0, 26 * (1.25 - telP * 0.35), 8810, 1.1, 16);
        ctx.stroke();
        ctx.restore();
        for (let r = 0; r < 2; r++) {
          const ang = baseA + r * Math.PI * 0.5;
          const cA = Math.cos(ang);
          const sA = Math.sin(ang);
          const nx = -sA;
          const ny = cA;
          const off = (1 - telP) * 16;
          ctx.strokeStyle = telP > 0.75 ? '#ffffff' : 'rgba(253, 224, 71, 0.82)';
          ctx.lineWidth = 1.4 + telP * 1.6;
          ctx.setLineDash([10, 7]);
          ctx.beginPath();
          ctx.moveTo(h.cx - cA * halfL + nx * off, h.cy - sA * halfL + ny * off);
          ctx.lineTo(h.cx + cA * halfL + nx * off, h.cy + sA * halfL + ny * off);
          ctx.moveTo(h.cx - cA * halfL - nx * off, h.cy - sA * halfL - ny * off);
          ctx.lineTo(h.cx + cA * halfL - nx * off, h.cy + sA * halfL - ny * off);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        const bw = (h.width || 30) * (isFade ? fadeA : 1);
        ctx.lineCap = 'round';
        for (let r = 0; r < 2; r++) {
          const ang = baseA + r * Math.PI * 0.5;
          const cA = Math.cos(ang);
          const sA = Math.sin(ang);
          const x1 = h.cx - cA * halfL;
          const y1 = h.cy - sA * halfL;
          const x2 = h.cx + cA * halfL;
          const y2 = h.cy + sA * halfL;
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.44)';
          ctx.lineWidth = bw * 1.6;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = bw * 0.88;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.strokeStyle = '#fffbeb';
          ctx.lineWidth = bw * 0.40;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        drawGlowSprite('gold', h.cx, h.cy, 88, 0.90 * fadeA);
      }
    } else if (h.kind === 'moltenGeyser') {
      const gw = h.w || 62;
      const gh = h.h || 205;
      if (isTel) {
        // Scorching ground magma crack + upward rising heat rails
        const pulse = 0.55 + Math.sin(now * 24) * 0.35;
        drawGlowSprite('gold', h.x, fy - 6, gw * (0.7 + telP * 0.5), 0.42);
        ctx.fillStyle = `rgba(249, 115, 22, ${(0.18 + telP * 0.28).toFixed(3)})`;
        ctx.fillRect(h.x - gw * 0.48, fy - 12, gw * 0.96, 12);
        ctx.strokeStyle = telP > 0.72 ? '#fef08a' : `rgba(251, 146, 60, ${(0.65 + 0.3 * pulse).toFixed(3)})`;
        ctx.lineWidth = 2.0;
        ctx.beginPath(); ctx.ellipse(h.x, fy - 2, gw * 0.54, 7.5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(h.x - gw * 0.32, fy); ctx.lineTo(h.x - gw * 0.32, fy - gh * (0.30 + telP * 0.70));
        ctx.moveTo(h.x + gw * 0.32, fy); ctx.lineTo(h.x + gw * 0.32, fy - gh * (0.30 + telP * 0.70));
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const ext = isFade ? fadeA : Math.min(1, (h.activeDur - h.timer) / 0.14);
        const curH = gh * Math.max(0.18, ext);
        const halfW = gw * 0.5;
        const mg = ctx.createLinearGradient(h.x - halfW, 0, h.x + halfW, 0);
        mg.addColorStop(0, 'rgba(185, 28, 28, 0)');
        mg.addColorStop(0.20, 'rgba(234, 88, 12, 0.78)');
        mg.addColorStop(0.50, 'rgba(254, 240, 138, 0.94)');
        mg.addColorStop(0.80, 'rgba(234, 88, 12, 0.78)');
        mg.addColorStop(1, 'rgba(185, 28, 28, 0)');
        ctx.fillStyle = mg;
        ctx.fillRect(h.x - halfW, fy - curH, gw, curH);
        // Swirling hand-inked flame filaments & bubbling base slag pool
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.8;
        boilLine(ctx, h.x - halfW * 0.38, fy - 4, h.x - halfW * 0.25, fy - curH * 0.94, 7610 + Math.round(h.x), 3.0, 5);
        boilLine(ctx, h.x + halfW * 0.38, fy - 4, h.x + halfW * 0.25, fy - curH * 0.94, 7640 + Math.round(h.x), 3.0, 5);
        ctx.fillStyle = '#ea580c';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(h.x, fy - 2, halfW * 1.08, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        drawGlowSprite('gold', h.x, fy - curH * 0.45, gw * 1.45, 0.52 * fadeA);
      }
    } else if (h.kind === 'chainDrop') {
      const cw = h.w || 58;
      const topY = h.topY !== undefined ? h.topY : (fy - 580);
      if (isTel) {
        const jx = (Math.random() - 0.5) * 4 * telP;
        ctx.strokeStyle = telP > 0.7 ? COLORS.crimsonBright : '#f59e0b';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(h.x + jx, topY);
        ctx.lineTo(h.x + jx, fy);
        ctx.stroke();
        ctx.setLineDash([]);
        // Ground crimson drop reticle + hovering maul shadow at ceiling
        ctx.strokeStyle = COLORS.crimsonBright;
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.ellipse(h.x, fy - 2, cw * (0.62 - telP * 0.16), 8, 0, 0, Math.PI * 2); ctx.stroke();
        const maulY = topY + 26 + telP * 48;
        ctx.fillStyle = 'rgba(53, 34, 20, 0.72)';
        ctx.strokeStyle = '#fb923c';
        ctx.fillRect(h.x - 16, maulY - 14, 32, 28);
        ctx.strokeRect(h.x - 16, maulY - 14, 32, 28);
      } else {
        const dropP = isFade ? 1 : Math.min(1, (h.activeDur - h.timer) / 0.08);
        const curY = topY + (fy - topY) * dropP;
        // Heavy riveted iron chain links descending from vault
        ctx.strokeStyle = '#d8cfb8';
        ctx.lineWidth = 2.6;
        for (let ly = topY; ly < curY - 26; ly += 22) {
          ctx.beginPath();
          ctx.ellipse(h.x, ly + 11, 7, 11, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Heated colossal bronze weight hammering floor
        ctx.fillStyle = '#3b1d12';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(h.x - cw * 0.44, curY - 46);
        ctx.lineTo(h.x + cw * 0.44, curY - 46);
        ctx.lineTo(h.x + cw * 0.50, curY);
        ctx.lineTo(h.x - cw * 0.50, curY);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        drawGlowSprite('gold', h.x, curY - 14, cw * 1.4, 0.78 * fadeA);
      }
    } else if (h.kind === 'galeTornado') {
      const tw = h.w || 68;
      const th = h.h || 265;
      if (isTel) {
        drawGlowSprite('cyan', h.x, fy - 12, tw * (0.8 + telP * 0.5), 0.42);
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 2.0;
        for (let r = 0; r < 3; r++) {
          const ry = fy - 6 - r * (22 + telP * 38);
          const rx = tw * (0.28 + r * 0.14);
          ctx.beginPath();
          ctx.ellipse(h.x, ry, rx, 6.5, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Direction arrow showing tornado travel vector
        const dSign = (h.vx || 1) >= 0 ? 1 : -1;
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(h.x, fy - 54); ctx.lineTo(h.x + dSign * 42, fy - 54);
        ctx.moveTo(h.x + dSign * 34, fy - 61); ctx.lineTo(h.x + dSign * 42, fy - 54); ctx.lineTo(h.x + dSign * 34, fy - 47);
        ctx.stroke();
      } else {
        const grow = isFade ? fadeA : Math.min(1, (h.activeDur - h.timer) / 0.16);
        const curH = th * Math.max(0.2, grow);
        // Translucent tapered cyan-parchment funnel core
        const fg = ctx.createLinearGradient(h.x, fy, h.x, fy - curH);
        fg.addColorStop(0, 'rgba(56, 189, 248, 0.34)');
        fg.addColorStop(0.5, 'rgba(186, 230, 253, 0.24)');
        fg.addColorStop(1, 'rgba(224, 242, 254, 0.08)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(h.x - tw * 0.26, fy);
        ctx.lineTo(h.x - tw * 0.62, fy - curH);
        ctx.lineTo(h.x + tw * 0.62, fy - curH);
        ctx.lineTo(h.x + tw * 0.26, fy);
        ctx.closePath();
        ctx.fill();
        // Hand-drawn spinning horizontal spiral ribbons
        const rings = 7;
        for (let k = 0; k < rings; k++) {
          const frac = (k + ((now * 3.8) % 1)) / rings;
          const ry = fy - frac * curH;
          const radX = tw * (0.24 + frac * 0.42);
          const sway = Math.sin(now * 11 + k * 1.4) * 6;
          ctx.strokeStyle = k % 2 === 0 ? 'rgba(224, 242, 254, 0.86)' : 'rgba(56, 189, 248, 0.72)';
          ctx.lineWidth = 2.2 - frac * 0.7;
          ctx.beginPath();
          ctx.ellipse(h.x + sway, ry, radX, 6 + frac * 4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        drawGlowSprite('cyan', h.x, fy - curH * 0.35, tw * 1.4, 0.45 * fadeA);
      }
    } else if (h.kind === 'iceLance') {
      const len = h.len || 760;
      const ang = h.angle || 0;
      const ex = h.ox + Math.cos(ang) * len;
      const ey = h.oy + Math.sin(ang) * len;
      if (isTel) {
        // Ice-blue aiming laser + floating crystalline frost sword!
        ctx.strokeStyle = h.locked ? '#ffffff' : 'rgba(125, 211, 252, 0.78)';
        ctx.lineWidth = h.locked ? 2.4 : 1.5;
        ctx.setLineDash(h.locked ? [] : [9, 6]);
        ctx.beginPath(); ctx.moveTo(h.ox, h.oy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.setLineDash([]);
        // Floating crystalline broken sword silhouette at origin
        ctx.save();
        ctx.translate(h.ox, h.oy);
        ctx.rotate(ang);
        const pullBack = h.locked ? -10 : -4 * telP;
        drawGlowSprite('cyan', pullBack, 0, 40, h.locked ? 0.85 : 0.56);
        ctx.fillStyle = h.locked ? '#ffffff' : '#bae6fd';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(pullBack - 16, 0);
        ctx.lineTo(pullBack - 6, -7);
        ctx.lineTo(pullBack + 28, -3.5);
        ctx.lineTo(pullBack + 44, 0);
        ctx.lineTo(pullBack + 28, 3.5);
        ctx.lineTo(pullBack - 6, 7);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      } else {
        const bw = (h.width || 22) * (isFade ? fadeA : 1);
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.44)';
        ctx.lineWidth = bw * 1.55;
        ctx.beginPath(); ctx.moveTo(h.ox, h.oy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = bw * 0.85;
        ctx.beginPath(); ctx.moveTo(h.ox, h.oy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#f0f9ff';
        ctx.lineWidth = bw * 0.36;
        ctx.beginPath(); ctx.moveTo(h.ox, h.oy); ctx.lineTo(ex, ey); ctx.stroke();
        drawGlowSprite('cyan', h.ox, h.oy, 52, 0.78 * fadeA);
      }
    } else if (h.kind === 'frostPatch') {
      const pw = h.w || 320;
      const ph = h.h || 28;
      if (isTel) {
        const pulse = 0.55 + Math.sin(now * 24) * 0.35;
        ctx.fillStyle = `rgba(125, 211, 252, ${(0.12 + telP * 0.22).toFixed(3)})`;
        ctx.fillRect(h.x, fy - 10, pw, 10);
        ctx.strokeStyle = `rgba(186, 230, 253, ${(0.65 + 0.3 * pulse).toFixed(3)})`;
        ctx.lineWidth = 2.0;
        ctx.setLineDash([7, 6]);
        ctx.beginPath(); ctx.moveTo(h.x, fy - 2); ctx.lineTo(h.x + pw, fy - 2); ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const grow = isFade ? fadeA : Math.min(1, (h.activeDur - h.timer) / 0.14);
        const curH = ph * Math.max(0.2, grow);
        ctx.fillStyle = 'rgba(14, 44, 68, 0.86)';
        ctx.fillRect(h.x, fy - curH * 0.38, pw, curH * 0.38);
        const crystals = Math.max(9, Math.floor(pw / 24));
        ctx.fillStyle = 'rgba(56, 189, 248, 0.78)';
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(h.x, fy);
        for (let k = 0; k < crystals; k++) {
          const x0 = h.x + (pw * k) / crystals;
          const x1 = h.x + (pw * (k + 1)) / crystals;
          const xm = (x0 + x1) * 0.5;
          const ch = curH * (k % 2 === 0 ? 1.15 : 0.75);
          ctx.lineTo(xm, fy - ch);
          ctx.lineTo(x1, fy - 3);
        }
        ctx.lineTo(h.x + pw, fy);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
    }

    ctx.restore();
  }
}
