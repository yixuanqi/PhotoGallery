// Hand-Drawn Ink & Light Renderer for Generic Arena Hazards (v47.0)
// Forest Thorns (thornCarpet, brambleCage, rootSpike) & Radiant Judgment (solarPillar, prismBeam, radiantCross)
import { COLORS, FLOOR_Y } from '../config.js';
import { G } from '../state.js';
import { drawGlowSprite, boilLine, boilCircle } from '../vfx.js';
import { clipRayToSolids, getHazardArenaBounds } from '../arenaHazards.js';

function drawBeamImpactFlare(ctx, end, spriteKey, coreCol, ringCol, radius, alpha, now) {
  if (!end || !end.hit) return;
  const isWall = Math.abs(end.nx) > 0.5;
  const rx = isWall ? 5.5 : radius;
  const ry = isWall ? radius : 5.5;
  const pulse = 0.88 + Math.sin(now * 28) * 0.14;
  drawGlowSprite(spriteKey, end.x, end.y, radius * 2.1, 0.72 * alpha);
  ctx.save();
  ctx.fillStyle = coreCol;
  ctx.beginPath();
  ctx.ellipse(end.x, end.y, rx * 0.65 * pulse, ry * 0.65 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ringCol;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.ellipse(end.x, end.y, rx * pulse, ry * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

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
      const hw = h.halfW || 92;
      const ch = h.h || 132;
      const ww = h.wallW || 18;
      if (isTel) {
        // Organic closing thorny tendril silhouettes (no boxy rectangles!)
        const slideOff = (1 - telP) * 48;
        const lMid = h.cx - hw - ww * 0.5 - slideOff;
        const rMid = h.cx + hw + ww * 0.5 + slideOff;
        const alpha = 0.42 + telP * 0.55;
        ctx.strokeStyle = telP > 0.72 ? COLORS.crimsonBright : '#4ade80';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([6, 5]);
        for (const mx of [lMid, rMid]) {
          ctx.beginPath();
          ctx.moveTo(mx - 6, fy);
          ctx.quadraticCurveTo(mx + 6, fy - ch * 0.35, mx - 4, fy - ch * 0.68);
          ctx.quadraticCurveTo(mx + 5, fy - ch * 0.86, mx, fy - ch);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(mx, fy - 2, 14, 4.5, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(lMid, fy - ch);
        ctx.quadraticCurveTo(h.cx, fy - ch - 26, rMid, fy - ch);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(lMid - 14, fy - ch * 0.5 - 7); ctx.lineTo(lMid - 5, fy - ch * 0.5); ctx.lineTo(lMid - 14, fy - ch * 0.5 + 7);
        ctx.moveTo(rMid + 14, fy - ch * 0.5 - 7); ctx.lineTo(rMid + 5, fy - ch * 0.5); ctx.lineTo(rMid + 14, fy - ch * 0.5 + 7);
        ctx.stroke();
      } else {
        // v47.8 Organic Intertwined Thorny Vine Pillars + Woven Canopy Arch (seamlessly rooted into floor)
        const flash = h.hurtFlash > 0;
        const grow = isFade ? fadeA : Math.min(1, (h.activeDur - h.timer) / 0.14);
        const curH = ch * Math.max(0.22, grow);
        const lMid = h.cx - hw - ww * 0.5;
        const rMid = h.cx + hw + ww * 0.5;

        const drawVinePillar = (mx, side) => {
          // 1. Rooted mossy mound gripping the stone floor
          ctx.fillStyle = flash ? '#ffffff' : '#0f2f1f';
          ctx.strokeStyle = flash ? '#fef08a' : '#22c55e';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(mx - 15, fy);
          ctx.quadraticCurveTo(mx - 10, fy - 14, mx - 6, fy - 24);
          ctx.lineTo(mx + 6, fy - 24);
          ctx.quadraticCurveTo(mx + 10, fy - 14, mx + 15, fy);
          ctx.closePath();
          ctx.fill(); ctx.stroke();

          // 2. Dark thorny core stalk tapering smoothly into the arch
          ctx.fillStyle = flash ? '#ffffff' : '#113322';
          ctx.strokeStyle = flash ? '#fef08a' : '#4ade80';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(mx - 8, fy);
          ctx.bezierCurveTo(mx - 10, fy - curH * 0.35, mx - 5, fy - curH * 0.72, mx - 4, fy - curH);
          ctx.lineTo(mx + 4, fy - curH);
          ctx.bezierCurveTo(mx + 5, fy - curH * 0.72, mx + 10, fy - curH * 0.35, mx + 8, fy);
          ctx.closePath();
          ctx.fill(); ctx.stroke();

          // 3. Double-braided bright emerald vines twisting up the stalk
          ctx.strokeStyle = flash ? '#fef08a' : '#86efac';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          const segs = 6;
          for (let s = 0; s <= segs; s++) {
            const frac = s / segs;
            const vy = fy - frac * curH;
            const vx = mx + Math.sin(frac * Math.PI * 3.0 + side) * (7.2 * (1 - frac * 0.35));
            if (s === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
          }
          ctx.stroke();

          // 4. Curved rose-thorn barbs pointing inward & outward
          ctx.fillStyle = flash ? '#fef08a' : '#14532d';
          ctx.strokeStyle = flash ? '#ffffff' : '#86efac';
          ctx.lineWidth = 1.4;
          for (let ry = fy - 18; ry > fy - curH + 12; ry -= 20) {
            const inDir = side < 0 ? 1 : -1;
            const bx = mx + inDir * 6;
            ctx.beginPath();
            ctx.moveTo(bx, ry - 4);
            ctx.quadraticCurveTo(bx + inDir * 7, ry - 3, bx + inDir * 12, ry + 1);
            ctx.quadraticCurveTo(bx + inDir * 5, ry + 4, bx, ry + 5);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            // Smaller outer counter-barb
            const obx = mx - inDir * 6;
            ctx.beginPath();
            ctx.moveTo(obx, ry - 8);
            ctx.lineTo(obx - inDir * 8, ry - 5);
            ctx.lineTo(obx, ry - 1);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
          }
        };

        drawVinePillar(lMid, -1);
        drawVinePillar(rMid, 1);

        // 5. Woven double-braid thorny arch seamlessly bridging both vine stalks
        ctx.strokeStyle = flash ? '#fef08a' : '#22c55e';
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.moveTo(lMid, fy - curH + 2);
        ctx.quadraticCurveTo(h.cx, fy - curH - 26, rMid, fy - curH + 2);
        ctx.stroke();
        ctx.strokeStyle = flash ? '#ffffff' : '#86efac';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(lMid + 2, fy - curH + 5);
        ctx.bezierCurveTo(h.cx - 38, fy - curH - 24, h.cx + 38, fy - curH - 12, rMid - 2, fy - curH + 5);
        ctx.stroke();

        // 6. Crisp breakable HP bar hovering above vine arch apex
        const hpRatio = Math.max(0, Math.min(1, (h.hp || 0) / Math.max(1, h.maxHp || 52)));
        ctx.fillStyle = 'rgba(8, 12, 18, 0.85)';
        ctx.fillRect(h.cx - 28, fy - curH - 30, 56, 6);
        ctx.fillStyle = hpRatio > 0.45 ? '#4ade80' : '#f59e0b';
        ctx.fillRect(h.cx - 27, fy - curH - 29, 54 * hpRatio, 4);
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
      // v47.8 Keep strictly inside room ceiling with smooth 80px vertical top fade-in + grounded golden impact seat!
      const topY = h.topY !== undefined ? h.topY : (fy - 660);
      const colH = Math.max(60, fy - topY);
      const topFadeStop = Math.min(0.22, 82 / colH);
      if (isTel) {
        const railHalf = pw * (0.52 - telP * 0.36);
        const g = ctx.createLinearGradient(h.x, topY, h.x, fy);
        g.addColorStop(0, 'rgba(254, 240, 138, 0)');
        g.addColorStop(topFadeStop, `rgba(254, 240, 138, ${(0.07 + telP * 0.14).toFixed(3)})`);
        g.addColorStop(1, `rgba(245, 158, 11, ${(0.14 + telP * 0.24).toFixed(3)})`);
        ctx.fillStyle = g;
        ctx.fillRect(h.x - pw * 0.46, topY, pw * 0.92, colH);
        const rg = ctx.createLinearGradient(h.x, topY, h.x, fy);
        rg.addColorStop(0, 'rgba(253, 224, 71, 0)');
        rg.addColorStop(topFadeStop, telP > 0.78 ? '#ffffff' : '#fde047');
        rg.addColorStop(1, telP > 0.78 ? '#ffffff' : '#fde047');
        ctx.strokeStyle = rg;
        ctx.lineWidth = 1.5 + telP * 1.4;
        ctx.beginPath();
        ctx.moveTo(h.x - railHalf, topY); ctx.lineTo(h.x - railHalf, fy - 2);
        ctx.moveTo(h.x + railHalf, topY); ctx.lineTo(h.x + railHalf, fy - 2);
        ctx.stroke();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.ellipse(h.x, fy - 2, pw * 0.58, 8.5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(h.x, fy - 2, pw * (0.58 * (1 - telP * 0.65)), 5, 0, 0, Math.PI * 2); ctx.stroke();
      } else {
        const halfW = pw * 0.5 * (isFade ? (0.4 + 0.6 * fadeA) : 1);
        // Tapered pillar body flaring gently into the stone floor + soft top fade-in mask
        const bg = ctx.createLinearGradient(h.x - halfW, 0, h.x + halfW, 0);
        bg.addColorStop(0, 'rgba(245, 158, 11, 0)');
        bg.addColorStop(0.22, 'rgba(245, 158, 11, 0.72)');
        bg.addColorStop(0.5, 'rgba(255, 251, 235, 0.94)');
        bg.addColorStop(0.78, 'rgba(245, 158, 11, 0.72)');
        bg.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(h.x - halfW * 0.88, topY + 24);
        ctx.lineTo(h.x - halfW, fy - 18);
        ctx.quadraticCurveTo(h.x - halfW * 1.18, fy, h.x, fy + 2);
        ctx.quadraticCurveTo(h.x + halfW * 1.18, fy, h.x + halfW, fy - 18);
        ctx.lineTo(h.x + halfW * 0.88, topY + 24);
        ctx.closePath();
        ctx.fill();

        // Soft upper glow feather so top edge never hard-cuts at y=0
        const topFeather = ctx.createLinearGradient(h.x, topY, h.x, topY + 84);
        topFeather.addColorStop(0, 'rgba(255, 251, 235, 0)');
        topFeather.addColorStop(1, 'rgba(254, 240, 138, 0.42)');
        ctx.fillStyle = topFeather;
        ctx.fillRect(h.x - halfW * 0.75, topY, halfW * 1.5, 84);

        // Twin incandescent edge filaments fading out cleanly at top & terminating into ground seat
        const fg = ctx.createLinearGradient(h.x, topY, h.x, fy);
        fg.addColorStop(0, 'rgba(254, 240, 138, 0)');
        fg.addColorStop(topFadeStop, 'rgba(254, 240, 138, 0.92)');
        fg.addColorStop(0.95, 'rgba(255, 251, 235, 0.96)');
        fg.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.strokeStyle = fg;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(h.x - halfW * 0.66, topY); ctx.lineTo(h.x - halfW * 0.66, fy - 3);
        ctx.moveTo(h.x + halfW * 0.66, topY); ctx.lineTo(h.x + halfW * 0.66, fy - 3);
        ctx.stroke();

        // Grounded Radiant Impact Seat (layered glow ellipse + pulsing scorch ring + floor light flares!)
        const pulse = 0.90 + Math.sin(now * 26) * 0.12;
        drawGlowSprite('gold', h.x, fy - 10, pw * 1.55, 0.84 * fadeA);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.62)';
        ctx.beginPath(); ctx.ellipse(h.x, fy - 1, halfW * 1.52 * pulse, 11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255, 251, 235, 0.94)';
        ctx.beginPath(); ctx.ellipse(h.x, fy - 1, halfW * 0.92 * pulse, 6.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2.0;
        ctx.beginPath(); ctx.ellipse(h.x, fy - 1, halfW * 1.72 * pulse, 9.5, 0, 0, Math.PI * 2); ctx.stroke();
        // Outward floor light slivers hugging the ground seam
        ctx.strokeStyle = '#fffbeb';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(h.x - halfW * 1.9, fy - 1); ctx.lineTo(h.x - halfW * 0.9, fy - 4);
        ctx.moveTo(h.x + halfW * 1.9, fy - 1); ctx.lineTo(h.x + halfW * 0.9, fy - 4);
        ctx.stroke();
      }
    } else if (h.kind === 'prismBeam') {
      const ang = isTel ? h.startAngle : h.curAngle;
      const end = clipRayToSolids(h.ox, h.oy, ang, h.len || 920, getHazardArenaBounds(h));
      const ex = end.x;
      const ey = end.y;
      if (isTel) {
        const sweepDir = h.endAngle >= h.startAngle ? 1 : -1;
        const fanR = Math.min(180, Math.max(60, end.len * 0.85));
        ctx.fillStyle = `rgba(253, 224, 71, ${(0.05 + telP * 0.07).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(h.ox, h.oy);
        ctx.arc(h.ox, h.oy, fanR, h.startAngle, h.endAngle, sweepDir < 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = telP > 0.75 ? '#ffffff' : '#fde047';
        ctx.lineWidth = 1.5 + telP * 1.6;
        ctx.setLineDash([10, 6]);
        ctx.beginPath(); ctx.moveTo(h.ox, h.oy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.setLineDash([]);
        if (end.hit) {
          drawBeamImpactFlare(ctx, end, 'gold', 'rgba(254, 240, 138, 0.55)', '#fde047', 16, 0.65, now);
        }
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
        drawBeamImpactFlare(ctx, end, 'gold', 'rgba(255, 251, 235, 0.92)', '#fde047', bw * 1.15, fadeA, now);
      }
    } else if (h.kind === 'radiantCross') {
      const halfL = (h.len || 760) * 0.5;
      const baseA = h.baseAngle || 0;
      const rcBounds = getHazardArenaBounds(h);
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
        for (let r = 0; r < 4; r++) {
          const ang = baseA + r * Math.PI * 0.5;
          const end = clipRayToSolids(h.cx, h.cy, ang, halfL, rcBounds);
          const nx = -Math.sin(ang);
          const ny = Math.cos(ang);
          const off = (1 - telP) * 16;
          ctx.strokeStyle = telP > 0.75 ? '#ffffff' : 'rgba(253, 224, 71, 0.82)';
          ctx.lineWidth = 1.4 + telP * 1.6;
          ctx.setLineDash([10, 7]);
          ctx.beginPath();
          ctx.moveTo(h.cx + nx * off, h.cy + ny * off);
          ctx.lineTo(end.x + nx * off, end.y + ny * off);
          ctx.moveTo(h.cx - nx * off, h.cy - ny * off);
          ctx.lineTo(end.x - nx * off, end.y - ny * off);
          ctx.stroke();
          ctx.setLineDash([]);
          if (end.hit) {
            drawBeamImpactFlare(ctx, end, 'gold', 'rgba(254, 240, 138, 0.45)', '#fde047', 14, 0.55, now);
          }
        }
      } else {
        const bw = (h.width || 30) * (isFade ? fadeA : 1);
        ctx.lineCap = 'round';
        const ends = [];
        for (let r = 0; r < 4; r++) {
          const ang = baseA + r * Math.PI * 0.5;
          const end = clipRayToSolids(h.cx, h.cy, ang, halfL, rcBounds);
          ends.push(end);
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.44)';
          ctx.lineWidth = bw * 1.6;
          ctx.beginPath(); ctx.moveTo(h.cx, h.cy); ctx.lineTo(end.x, end.y); ctx.stroke();
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = bw * 0.88;
          ctx.beginPath(); ctx.moveTo(h.cx, h.cy); ctx.lineTo(end.x, end.y); ctx.stroke();
          ctx.strokeStyle = '#fffbeb';
          ctx.lineWidth = bw * 0.40;
          ctx.beginPath(); ctx.moveTo(h.cx, h.cy); ctx.lineTo(end.x, end.y); ctx.stroke();
        }
        drawGlowSprite('gold', h.cx, h.cy, 88, 0.90 * fadeA);
        for (let r = 0; r < ends.length; r++) {
          drawBeamImpactFlare(ctx, ends[r], 'gold', 'rgba(255, 251, 235, 0.90)', '#fde047', bw * 1.08, fadeA, now);
        }
      }
    } else if (h.kind === 'moltenGeyser') {
      const gw = h.w || 62;
      const gh = h.h || 205;
      const seed = (Math.round(h.x) * 13) % 97;
      if (isTel) {
        // Scorching ground magma crater + tapered flame-contour telegraph (no flat mid-air cutoff!)
        const pulse = 0.55 + Math.sin(now * 24 + seed) * 0.35;
        const previewH = gh * (0.28 + telP * 0.68);
        drawGlowSprite('gold', h.x, fy - 8, gw * (0.75 + telP * 0.55), 0.44);
        const tg = ctx.createLinearGradient(h.x, fy, h.x, fy - previewH);
        tg.addColorStop(0, `rgba(249, 115, 22, ${(0.22 + telP * 0.24).toFixed(3)})`);
        tg.addColorStop(0.7, `rgba(251, 146, 60, ${(0.08 + telP * 0.12).toFixed(3)})`);
        tg.addColorStop(1, 'rgba(251, 146, 60, 0)');
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.moveTo(h.x - gw * 0.48, fy);
        ctx.quadraticCurveTo(h.x - gw * 0.36, fy - previewH * 0.58, h.x, fy - previewH);
        ctx.quadraticCurveTo(h.x + gw * 0.36, fy - previewH * 0.58, h.x + gw * 0.48, fy);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = telP > 0.72 ? '#fef08a' : `rgba(251, 146, 60, ${(0.68 + 0.28 * pulse).toFixed(3)})`;
        ctx.lineWidth = 2.0;
        ctx.beginPath(); ctx.ellipse(h.x, fy - 2, gw * 0.54, 7.5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(h.x - gw * 0.36, fy - 4);
        ctx.quadraticCurveTo(h.x - gw * 0.28, fy - previewH * 0.62, h.x, fy - previewH);
        ctx.quadraticCurveTo(h.x + gw * 0.28, fy - previewH * 0.62, h.x + gw * 0.36, fy - 4);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // v47.7 Organic Hand-Drawn Erupting Magma Plume: tapered 3-tongue flame crown + vertical fade (ZERO flat top cutoff!)
        const ext = isFade ? fadeA : Math.min(1, (h.activeDur - h.timer) / 0.14);
        const curH = gh * Math.max(0.20, ext);
        const halfW = gw * 0.52;
        const sway1 = Math.sin(now * 13.5 + seed) * 7.5;
        const sway2 = Math.cos(now * 16.0 + seed * 1.7) * 6.5;
        const tipPeak = fy - curH * (1.14 + Math.sin(now * 19 + seed) * 0.06);
        const sideLPeak = fy - curH * (0.86 + Math.cos(now * 15 + seed) * 0.07);
        const sideRPeak = fy - curH * (0.84 + Math.sin(now * 17 + seed + 1.1) * 0.07);

        // 1. Outer roaring crimson-orange magma plume silhouette with smooth vertical dissipation at tips
        const outerG = ctx.createLinearGradient(h.x, fy, h.x, tipPeak);
        outerG.addColorStop(0, 'rgba(234, 88, 12, 0.92)');
        outerG.addColorStop(0.42, 'rgba(249, 115, 22, 0.84)');
        outerG.addColorStop(0.78, 'rgba(251, 146, 60, 0.56)');
        outerG.addColorStop(1, 'rgba(254, 215, 170, 0)');
        ctx.fillStyle = outerG;
        ctx.beginPath();
        ctx.moveTo(h.x - halfW * 1.04, fy);
        ctx.quadraticCurveTo(h.x - halfW * 1.12, fy - curH * 0.38, h.x - halfW * 0.64 + sway2 * 0.4, sideLPeak);
        ctx.quadraticCurveTo(h.x - halfW * 0.34, fy - curH * 0.72, h.x + sway1, tipPeak);
        ctx.quadraticCurveTo(h.x + halfW * 0.34, fy - curH * 0.70, h.x + halfW * 0.64 - sway2 * 0.4, sideRPeak);
        ctx.quadraticCurveTo(h.x + halfW * 1.12, fy - curH * 0.38, h.x + halfW * 1.04, fy);
        ctx.closePath();
        ctx.fill();

        // 2. Inner incandescent amber-gold flame core (tapered teardrop plume)
        const corePeak = fy - curH * (0.94 + Math.cos(now * 21 + seed) * 0.05);
        const coreG = ctx.createLinearGradient(h.x, fy, h.x, corePeak);
        coreG.addColorStop(0, 'rgba(255, 251, 235, 0.96)');
        coreG.addColorStop(0.45, 'rgba(254, 240, 138, 0.92)');
        coreG.addColorStop(0.80, 'rgba(251, 191, 36, 0.58)');
        coreG.addColorStop(1, 'rgba(251, 146, 60, 0)');
        ctx.fillStyle = coreG;
        ctx.beginPath();
        ctx.moveTo(h.x - halfW * 0.56, fy);
        ctx.bezierCurveTo(h.x - halfW * 0.64, fy - curH * 0.42, h.x - halfW * 0.18 + sway2 * 0.4, fy - curH * 0.74, h.x + sway1 * 0.7, corePeak);
        ctx.bezierCurveTo(h.x + halfW * 0.18 + sway2 * 0.4, fy - curH * 0.74, h.x + halfW * 0.64, fy - curH * 0.42, h.x + halfW * 0.56, fy);
        ctx.closePath();
        ctx.fill();

        // 3. Hand-inked curling flame contour filaments converging organically toward the flame apex
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.82)';
        ctx.lineWidth = 1.7;
        boilLine(ctx, h.x - halfW * 0.48, fy - 6, h.x - halfW * 0.08 + sway1 * 0.5, fy - curH * 0.88, 7610 + seed, 2.8, 5);
        boilLine(ctx, h.x + halfW * 0.48, fy - 6, h.x + halfW * 0.08 + sway1 * 0.5, fy - curH * 0.88, 7640 + seed, 2.8, 5);

        // 4. Floating detached ember flame-licks dancing above the crown so the plume dissipates naturally
        for (let em = 0; em < 3; em++) {
          const ph = ((now * 2.1 + seed * 0.13 + em * 0.33) % 1);
          const ey = fy - curH * (0.82 + ph * 0.42);
          const ex = h.x + Math.sin(now * 9 + em * 2.4 + seed) * (halfW * 0.48);
          const er = (1 - ph) * 5.2;
          if (er > 0.6) {
            ctx.fillStyle = `rgba(254, 240, 138, ${(0.82 * (1 - ph)).toFixed(3)})`;
            ctx.beginPath();
            ctx.ellipse(ex, ey, er * 0.7, er * 1.45, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 5. Boiling molten base pool & warm ambient glow
        ctx.fillStyle = '#ea580c';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(h.x, fy - 2, halfW * 1.10, 8.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        drawGlowSprite('gold', h.x, fy - curH * 0.36, gw * 1.5, 0.56 * fadeA);
      }
    } else if (h.kind === 'chainDrop') {
      const cw = h.w || 58;
      const topY = (h.topY !== undefined ? h.topY : (fy - 580)) - 36;
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
        fg.addColorStop(1, 'rgba(224, 242, 254, 0)');
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
      const ang = h.angle || 0;
      const end = clipRayToSolids(h.ox, h.oy, ang, h.len || 760, getHazardArenaBounds(h));
      const ex = end.x;
      const ey = end.y;
      if (isTel) {
        // Ice-blue aiming laser clipped cleanly at floor/walls + floating crystalline frost sword!
        ctx.strokeStyle = h.locked ? '#ffffff' : 'rgba(125, 211, 252, 0.78)';
        ctx.lineWidth = h.locked ? 2.4 : 1.5;
        ctx.setLineDash(h.locked ? [] : [9, 6]);
        ctx.beginPath(); ctx.moveTo(h.ox, h.oy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.setLineDash([]);
        if (end.hit) {
          drawBeamImpactFlare(ctx, end, 'cyan', 'rgba(186, 230, 253, 0.45)', '#7dd3fc', 12, 0.55, now);
        }
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
        drawBeamImpactFlare(ctx, end, 'cyan', 'rgba(240, 249, 255, 0.92)', '#7dd3fc', bw * 1.12, fadeA, now);
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
