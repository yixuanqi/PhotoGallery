(() => {
  const CB = window.CB;
  const { drawSoftShadow } = CB.brush;
  const INK = '#3b2b23';

  function drawMochiPlayer(ctx, p, time, variant = 'explorer', offsetX = 0, offsetY = 0) {
    const blinkHide = p.invulnTimer > 0 && Math.floor(time * 22) % 2 === 0;
    const stealthFade = !!p.inPollen;
    const needAlphaWrap = blinkHide || stealthFade;
    if (needAlphaWrap) {
      ctx.save();
      ctx.globalAlpha = blinkHide ? 0.42 : 0.56;
    }
    const px = p.x + offsetX;
    const py = p.y + offsetY;
    const breathe = Math.sin(time * 3.8) * 0.032;
    const stretchY = 1 + p.squash + breathe;
    const stretchX = 1 - p.squash * 0.72 - breathe * 0.7;
    const liftY = p.hopHeight;

    const shadowScale = 1 - liftY * 0.022;
    drawSoftShadow(ctx, px, py + 4, 22 * shadowScale, 9.5 * shadowScale, 0.22);
    if (p.onDewSlide && Math.hypot(p.vx, p.vy) > 65) {
      ctx.save();
      ctx.strokeStyle = 'rgba(116, 234, 255, 0.85)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(px, py + 4, 24, 10.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    drawTailAccessory(ctx, p, offsetX, offsetY, variant, time);
    drawVariantBag(ctx, p, px, py, liftY, variant, time);
    drawLittleFeet(ctx, p, px, py, liftY, variant);

    ctx.save();
    ctx.translate(px, py + 2 - liftY);
    ctx.rotate(p.tilt + (p.dashTimer > 0 ? p.facing * 0.12 : 0));
    ctx.scale(stretchX, stretchY);

    if (variant === 'explorer') {
      drawExplorerBody(ctx, p);
    } else if (variant === 'porcelain') {
      drawPorcelainBody(ctx, p, time);
    } else {
      drawSproutBody(ctx, p, time);
    }

    ctx.restore();

    drawMiniBlaster(ctx, p, px, py, liftY, variant);
    if (typeof p.orbs === 'number') {
      drawOrbitingOrbs(ctx, p, px, py, liftY, time);
    }
    if (needAlphaWrap) ctx.restore();
    if ((p.shieldCharges || 0) > 0 && (p.shieldTimer || 0) > 0) {
      drawPlayerShield(ctx, px, py - liftY, p, time);
    }
    if ((p.goldenBodyTimer || 0) > 0 || (p.chronoWatchTimer || 0) > 0) {
      drawPlayerActiveSkillAura(ctx, px, py - liftY, p, time);
    }
    if (stealthFade) {
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 198, 42, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(px, py + 2, 23, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '700 11px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(255, 253, 246, 0.92)';
      ctx.lineWidth = 3;
      ctx.strokeText('🌼 隐身', px, py - 52 - liftY);
      ctx.fillStyle = '#c48612';
      ctx.fillText('🌼 隐身', px, py - 52 - liftY);
      ctx.restore();
    }
  }

  // 主角方案 A：护目镜冒险团
  function drawExplorerBody(ctx, p) {
    ctx.save();
    ctx.translate(-p.facing * 14, -29);
    ctx.rotate(-p.facing * 0.48);
    drawWindupKey(ctx, p.keyAngle, 0.9);
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(0, -35);
    ctx.bezierCurveTo(22, -35, 25, -13, 23, -2);
    ctx.bezierCurveTo(20, 4.5, -20, 4.5, -23, -2);
    ctx.bezierCurveTo(-25, -13, -22, -35, 0, -35);
    ctx.closePath();

    const grad = ctx.createRadialGradient(-7, -25, 3, 0, -14, 30);
    grad.addColorStop(0, '#fffefb');
    grad.addColorStop(0.68, '#fff2db');
    grad.addColorStop(1, '#ecc8a3');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.ellipse(-9, -24, 5, 2.7, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    drawFace(ctx, p, 'explorer');
    drawExplorerCollar(ctx, p.facing);

    // 焦糖贝雷帽 + 黄铜护目镜
    ctx.save();
    ctx.translate(p.lagX * 0.25, -31 + p.lagY * 0.2);
    ctx.rotate(p.facing * 0.12 + p.lagX * 0.015);

    ctx.fillStyle = 'rgba(115, 76, 52, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 19, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8b573c';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-18, 1);
    ctx.bezierCurveTo(-22, -10, -6, -15, 6, -14);
    ctx.bezierCurveTo(20, -13, 22, -4, 17, 2);
    ctx.quadraticCurveTo(0, 5, -18, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#6c402a';
    ctx.beginPath();
    ctx.arc(p.facing * 2, -14.5, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#5c3824';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-17, -2);
    ctx.quadraticCurveTo(0, 1.5, 17, -2);
    ctx.stroke();

    const gx = p.facing * 3;
    for (const dx of [-6.5, 6.5]) {
      ctx.fillStyle = '#e7b54f';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.arc(gx + dx, -3.5, 5.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#bfe7ee';
      ctx.beginPath();
      ctx.arc(gx + dx, -3.5, 3.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(gx + dx - 1.2, -4.8, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 预留可解锁皮肤 B：青花釉面精灵
  function drawPorcelainBody(ctx, p, time) {
    const haloFloat = Math.sin(time * 4.5) * 2.2;
    ctx.save();
    ctx.translate(p.lagX * 0.35, -39 + haloFloat + p.lagY * 0.25);

    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, -1, 14, 4.2, p.lagX * 0.02, 0, Math.PI * 2);
    ctx.stroke();

    const orbX = Math.cos(time * 3.2) * 14;
    const orbY = -1 + Math.sin(time * 3.2) * 4.2;
    ctx.fillStyle = '#ffdf78';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(orbX, orbY, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    drawWindupKey(ctx, p.keyAngle, 0.85);
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(0, -37);
    ctx.bezierCurveTo(20, -37, 23, -15, 20.5, -2);
    ctx.bezierCurveTo(18, 4.5, -18, 4.5, -20.5, -2);
    ctx.bezierCurveTo(-23, -15, -20, -37, 0, -37);
    ctx.closePath();

    const grad = ctx.createRadialGradient(-7, -27, 2, 2, -14, 30);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.55, '#f7fafc');
    grad.addColorStop(0.86, '#dde9f0');
    grad.addColorStop(1, '#c3d6e2');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.beginPath();
    ctx.ellipse(-9.5, -25, 4.2, 8.2, -0.32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3c6896';
    ctx.beginPath();
    ctx.moveTo(0, -32.5);
    ctx.lineTo(2.4, -29.5);
    ctx.lineTo(0, -26.8);
    ctx.lineTo(-2.4, -29.5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#2d3446';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    drawFace(ctx, p, 'porcelain');
    drawPorcelainCapelet(ctx, p.facing);
  }

  // 预留可解锁皮肤 C：嫩芽软绒团子
  function drawSproutBody(ctx, p, time) {
    ctx.beginPath();
    ctx.moveTo(0, -33);
    ctx.bezierCurveTo(23, -33, 27.5, -13, 25, -1.5);
    ctx.bezierCurveTo(22.5, 5, -22.5, 5, -25, -1.5);
    ctx.bezierCurveTo(-27.5, -13, -23, -33, 0, -33);
    ctx.closePath();

    const grad = ctx.createRadialGradient(-6, -24, 3, 0, -14, 30);
    grad.addColorStop(0, '#fffefd');
    grad.addColorStop(0.65, '#fff4e6');
    grad.addColorStop(1, '#f7d6c7');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(-10, -23, 5.5, 3.2, -0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#4a352c';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.save();
    ctx.translate(0, -32.5);
    const sway = p.lagX * 0.045 + Math.sin(time * 4.2) * 0.07;

    ctx.strokeStyle = '#3f6e3a';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.quadraticCurveTo(p.lagX * 0.4, -7, p.lagX * 0.85, -13);
    ctx.stroke();

    ctx.translate(p.lagX * 0.85, -13);
    ctx.rotate(sway);

    ctx.fillStyle = '#7ac15a';
    ctx.strokeStyle = '#324d2c';
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.ellipse(-7, -2, 7.5, 4.3, -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#96d46d';
    ctx.beginPath();
    ctx.ellipse(6.5, -3.5, 6.2, 3.6, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const dewGlow = 0.8 + 0.2 * Math.sin(time * 7);
    ctx.fillStyle = `rgba(255, 224, 102, ${dewGlow})`;
    ctx.strokeStyle = '#6b4d18';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-11, -5.5, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    drawFace(ctx, p, 'sprout');
    drawSproutPoncho(ctx, p, time);
  }

  function drawExplorerCollar(ctx, facing) {
    ctx.save();
    ctx.fillStyle = '#d94d3f';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-19, -5.5);
    ctx.quadraticCurveTo(0, 2, 19, -5.5);
    ctx.quadraticCurveTo(20, 1, 16, 3.2);
    ctx.quadraticCurveTo(0, 8.8, -16, 3.2);
    ctx.quadraticCurveTo(-20, 1, -19, -5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#fff3dc';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-8, -1.2); ctx.lineTo(-9.5, 4.2);
    ctx.moveTo(8, -1.2);  ctx.lineTo(9.5, 4.2);
    ctx.stroke();

    ctx.fillStyle = '#f5ca64';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(facing * 3, 2.4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawPorcelainCapelet(ctx, facing) {
    ctx.save();
    ctx.fillStyle = '#3e6c9c';
    ctx.strokeStyle = '#26344a';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(-18.5, -5.5);
    ctx.quadraticCurveTo(0, -1, 18.5, -5.5);
    ctx.lineTo(20, 2);
    ctx.quadraticCurveTo(13, 8, 6.5, 3.8);
    ctx.quadraticCurveTo(0, 9.5, -6.5, 3.8);
    ctx.quadraticCurveTo(-13, 8, -20, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#f0ca6a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.quadraticCurveTo(0, 2.2, 16, -2);
    ctx.stroke();

    ctx.fillStyle = '#7ad6f0';
    ctx.strokeStyle = '#f0ca6a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(facing * 2, 1.8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawSproutPoncho(ctx, p, time) {
    ctx.save();
    ctx.fillStyle = '#e06358';
    ctx.strokeStyle = '#4a352c';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-21, -5.5);
    ctx.quadraticCurveTo(0, 1.5, 21, -5.5);
    ctx.quadraticCurveTo(22.5, 2.5, 16, 4.8);
    ctx.quadraticCurveTo(0, 9.5, -16, 4.8);
    ctx.quadraticCurveTo(-22.5, 2.5, -21, -5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const bellSwing = Math.sin(p.walkPhase * 1.3 + time * 2) * 1.4;
    ctx.translate(p.facing * 2 + bellSwing, 4.5);
    ctx.fillStyle = '#ffd55a';
    ctx.strokeStyle = '#4a352c';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(0, 0, 4.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#7a4d19';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-2.5, 1.2);
    ctx.lineTo(2.5, 1.2);
    ctx.stroke();
    ctx.restore();
  }

  function drawTailAccessory(ctx, p, offsetX, offsetY, variant, time) {
    const nodes = p.scarfNodes;
    if (!nodes || nodes.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (variant === 'explorer') {
      ctx.strokeStyle = '#6e211a';
      ctx.lineWidth = 11.5;
      traceNodes(ctx, nodes, offsetX, offsetY, 0, 0);
      ctx.stroke();

      ctx.strokeStyle = '#d94d3f';
      ctx.lineWidth = 7;
      ctx.stroke();

      ctx.strokeStyle = '#fff1d6';
      ctx.lineWidth = 6.5;
      ctx.setLineDash([3, 9]);
      ctx.stroke();
      ctx.setLineDash([]);

      const tail = nodes[nodes.length - 1];
      ctx.fillStyle = '#f5cc6c';
      ctx.beginPath();
      ctx.arc(tail.x + offsetX, tail.y + offsetY, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (variant === 'porcelain') {
      for (const dy of [-3, 3.5]) {
        ctx.strokeStyle = '#253752';
        ctx.lineWidth = 6.2;
        traceNodes(ctx, nodes, offsetX, offsetY, 0, dy + Math.sin(time * 8 + dy) * 1.5);
        ctx.stroke();

        ctx.strokeStyle = dy < 0 ? '#5084b8' : '#7aa9d6';
        ctx.lineWidth = 3.4;
        ctx.stroke();
      }
    } else {
      const anchor = nodes[2] || nodes[0];
      ctx.fillStyle = '#fff8ee';
      ctx.strokeStyle = '#4a352c';
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.arc(anchor.x + offsetX, anchor.y + offsetY + 4, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function traceNodes(ctx, nodes, ox, oy, dx, dy) {
    ctx.beginPath();
    ctx.moveTo(nodes[0].x + ox, nodes[0].y + oy);
    for (let i = 1; i < nodes.length; i++) {
      const ratio = i / (nodes.length - 1);
      ctx.lineTo(nodes[i].x + ox + dx * ratio, nodes[i].y + oy + dy * ratio);
    }
  }

  function drawVariantBag(ctx, p, px, py, liftY, variant, time) {
    const fullness = p.lootCount / 10;
    const r = 9.5 + fullness * 9;
    const wobble = Math.sin(p.walkPhase * 1.1) * (1.2 + fullness * 1.8);
    const bx = px - p.facing * (16 + fullness * 3.8);
    const by = py - 11 - liftY + wobble * 0.5;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(-p.facing * (0.2 + fullness * 0.14));

    if (variant === 'porcelain') {
      ctx.fillStyle = '#d7b377';
      ctx.strokeStyle = '#2d3446';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4575a8';
      ctx.fillRect(-r * 0.88, -r * 0.88, r * 1.76, 4.5);
    } else {
      ctx.fillStyle = variant === 'sprout' ? '#d8b282' : '#c69563';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.ellipse(0, 2, r * 0.92, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = variant === 'sprout' ? '#e7c69b' : '#d8ad7c';
      ctx.beginPath();
      ctx.moveTo(-4, -r + 2);
      ctx.lineTo(-7, -r - 5);
      ctx.lineTo(6, -r - 5);
      ctx.lineTo(4, -r + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#75472b';
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(-5, -r + 2);
      ctx.lineTo(5, -r + 2);
      ctx.stroke();
    }

    const hasGrand = CB.game && CB.game.run && CB.game.run.hasGrandCurio;
    if (hasGrand) {
      const pulse = 0.72 + 0.28 * Math.sin(time * 9);
      ctx.strokeStyle = `rgba(255, 206, 56, ${pulse})`;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 1, r + 4, 0, Math.PI * 2);
      ctx.stroke();
      drawMiniStar(ctx, 0, -r - 5, 5.2, '#ffd642');
    } else if (p.lootCount >= 4) {
      const sparkle = 0.65 + 0.35 * Math.sin(time * 8);
      ctx.fillStyle = `rgba(255, 220, 96, ${sparkle})`;
      ctx.beginPath();
      ctx.arc(0, -r - 3, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWindupKey(ctx, angle, scale = 1) {
    const spinW = Math.max(2.2, Math.abs(Math.cos(angle)) * 7.2);
    ctx.save();
    ctx.scale(scale, scale);

    ctx.strokeStyle = INK;
    ctx.lineWidth = 4.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(0, -6.5);
    ctx.stroke();

    ctx.strokeStyle = '#ebb950';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.fillStyle = '#f6cc68';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.ellipse(-spinW, -9.5, spinW, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(spinW, -9.5, spinW, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawLittleFeet(ctx, p, px, py, liftY, variant) {
    const speed = Math.hypot(p.vx, p.vy);
    const swing = speed > 20 ? Math.sin(p.walkPhase) * 5.8 : 0;

    ctx.save();
    ctx.fillStyle = variant === 'porcelain' ? '#587fa6' : variant === 'sprout' ? '#f2c7ae' : '#8a593d';
    ctx.strokeStyle = variant === 'porcelain' ? '#26344a' : INK;
    ctx.lineWidth = 2.1;

    ctx.beginPath();
    ctx.ellipse(px - 8 + swing, py + 1.5 - liftY * 0.3, 5.2, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(px + 8 - swing, py + 1.5 - liftY * 0.3, 5.2, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawFace(ctx, p, variant) {
    const lookX = Math.cos(p.aimAngle) * 4.2;
    const lookY = Math.sin(p.aimAngle) * 2.1;
    const baseY = variant === 'sprout' ? -14.5 : -15.5;
    const eyeColor = variant === 'porcelain' ? '#253554' : INK;

    ctx.save();
    ctx.translate(lookX, baseY + lookY);

    ctx.fillStyle = p.expr === 'happy' ? 'rgba(255, 118, 112, 0.78)' : 'rgba(255, 150, 138, 0.52)';
    ctx.beginPath();
    ctx.ellipse(-11, 3.4, 4.2, 2.5, 0, 0, Math.PI * 2);
    ctx.ellipse(11, 3.4, 4.2, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = eyeColor;
    ctx.fillStyle = eyeColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (p.expr === 'dash') {
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-9.5, -3); ctx.lineTo(-5.2, -0.5); ctx.lineTo(-9.5, 2);
      ctx.moveTo(9.5, -3);  ctx.lineTo(5.2, -0.5);  ctx.lineTo(9.5, 2);
      ctx.stroke();

      ctx.fillStyle = '#e56f68';
      ctx.beginPath();
      ctx.moveTo(-3.2, 2.2);
      ctx.lineTo(3.2, 2.2);
      ctx.quadraticCurveTo(0, 7.2, -3.2, 2.2);
      ctx.fill();
      ctx.stroke();
    } else if (p.expr === 'happy') {
      drawMiniStar(ctx, -6.8, -1, 4.7, '#f5b228');
      drawMiniStar(ctx, 6.8, -1, 4.7, '#f5b228');
      ctx.lineWidth = 2;
      ctx.fillStyle = '#e86f68';
      ctx.beginPath();
      ctx.arc(0, 3.2, 3.5, 0, Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (p.expr === 'shock') {
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-6.8, -1, 4.3, 0, Math.PI * 2);
      ctx.arc(6.8, -1, 4.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(-6.8, -1, 1.5, 0, Math.PI * 2);
      ctx.arc(6.8, -1, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-4, 5);
      ctx.quadraticCurveTo(-2, 3, 0, 5);
      ctx.quadraticCurveTo(2, 7, 4, 5);
      ctx.stroke();
    } else {
      if (p.isBlinking) {
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-10, -0.5); ctx.lineTo(-4.2, -0.5);
        ctx.moveTo(4.2, -0.5); ctx.lineTo(10, -0.5);
        ctx.stroke();
      } else {
        const erx = variant === 'sprout' ? 3.8 : 3.2;
        const ery = variant === 'sprout' ? 4.4 : 3.8;
        const ex = variant === 'sprout' ? 7.2 : 6.6;

        ctx.beginPath();
        ctx.ellipse(-ex, -1, erx, ery, 0, 0, Math.PI * 2);
        ctx.ellipse(ex, -1, erx, ery, 0, 0, Math.PI * 2);
        ctx.fill();

        if (variant === 'sprout') {
          ctx.fillStyle = '#c97e42';
          ctx.beginPath();
          ctx.arc(-ex, 1.2, 2.0, 0.1 * Math.PI, 0.9 * Math.PI);
          ctx.arc(ex, 1.2, 2.0, 0.1 * Math.PI, 0.9 * Math.PI);
          ctx.fill();
        }

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-ex - 1.0, -2.5, 1.35, 0, Math.PI * 2);
        ctx.arc(ex - 1.0, -2.5, 1.35, 0, Math.PI * 2);
        ctx.arc(-ex + 1.0, 0.5, 0.65, 0, Math.PI * 2);
        ctx.arc(ex + 1.0, 0.5, 0.65, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.lineWidth = 1.9;
      if (variant === 'sprout') {
        ctx.beginPath();
        ctx.moveTo(-3.6, 2.6);
        ctx.quadraticCurveTo(-1.8, 5.2, 0, 3.0);
        ctx.quadraticCurveTo(1.8, 5.2, 3.6, 2.6);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 2.4, 2.7, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawMiniStar(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rad = i % 2 === 0 ? r : r * 0.42;
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawMiniBlaster(ctx, p, px, py, liftY, variant) {
    const charging = !!p.charging;
    const ratio = charging ? (p.chargeRatio || 0) : 0;
    const isHeavy = charging && p.chargeTime >= (p.effectiveTapThreshold || 0.20);
    const recoilOffset = p.recoil * 5.8 + (charging ? 1.5 + ratio * 3.5 : 0);
    const handDist = 23 - recoilOffset;
    const hx = px + Math.cos(p.aimAngle) * handDist;
    const hy = py - 12 - liftY + Math.sin(p.aimAngle) * (handDist * 0.72);

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(p.aimAngle);
    if (Math.cos(p.aimAngle) < 0) ctx.scale(1, -1);

    // 软萌小手
    ctx.fillStyle = variant === 'porcelain' ? '#f5f9fc' : '#fff5e2';
    ctx.strokeStyle = variant === 'porcelain' ? '#26344a' : INK;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.arc(-4.5, 2, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 唯一核心标志性工具：星露弹射器（温润黄铜/青花筒身 + 晶莹星露蓄力核心）
    ctx.fillStyle = variant === 'porcelain' ? '#4d7fb3' : '#dca952';
    ctx.beginPath();
    ctx.roundRect(-2, -4.5, 16, 8.2, 3.2);
    ctx.fill();
    ctx.stroke();

    // 前端花瓣状星露收束口
    ctx.fillStyle = isHeavy ? '#ffe270' : '#7ad6eb';
    ctx.beginPath();
    ctx.roundRect(12, -5.8, 5.2, 10.8, 2.4);
    ctx.fill();
    ctx.stroke();

    // 筒身中央蓄力晶石（随蓄力从清透天蓝渐变为耀眼日光金）
    ctx.fillStyle = isHeavy ? (ratio >= 0.9 ? '#fff6a6' : '#ffd24d') : '#9cebf7';
    ctx.beginPath();
    ctx.arc(5.5, -0.4, 2.6 + ratio * 1.4, 0, Math.PI * 2);
    ctx.fill();

    // 蓄力过程枪口聚能星光 + 环形进度弧
    if (charging && p.chargeTime >= 0.08) {
      const orbR = 3.2 + ratio * 5.2;
      const g = ctx.createRadialGradient(21, -0.4, 1, 21, -0.4, orbR * 2.1);
      g.addColorStop(0, ratio >= 0.9 ? 'rgba(255, 248, 168, 0.95)' : (isHeavy ? 'rgba(255, 218, 92, 0.85)' : 'rgba(116, 232, 248, 0.72)'));
      g.addColorStop(1, 'rgba(255, 218, 92, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(21, -0.4, orbR * 2.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isHeavy ? '#fff5b8' : '#d6f8ff';
      ctx.beginPath();
      ctx.arc(21, -0.4, orbR * 0.65, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.recoil > 0.42) {
      ctx.fillStyle = '#ffe585';
      ctx.beginPath();
      ctx.arc(21, -0.4, 4.8 * Math.min(1.2, p.recoil), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 角色脚下极轻巧的弧形蓄力进度环（不遮挡画面，余光即可精准把握满蓄力节奏）
    if (charging && p.chargeTime >= 0.12) {
      const progress = Math.min(1, p.chargeTime / (p.effectiveMaxCharge || 0.64));
      ctx.save();
      ctx.strokeStyle = 'rgba(46, 74, 82, 0.22)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(px, py - 14 - liftY, 27, -Math.PI * 0.85, -Math.PI * 0.15);
      ctx.stroke();

      ctx.strokeStyle = ratio >= 0.9 ? '#ffcf33' : (isHeavy ? '#f29f24' : '#4ec9de');
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(px, py - 14 - liftY, 27, -Math.PI * 0.85, -Math.PI * 0.85 + Math.PI * 0.7 * progress);
      ctx.stroke();
      ctx.restore();
    }
  }


  function drawOrbitingOrbs(ctx, p, px, py, liftY, time) {
    const maxOrbs = p.maxOrbs || 3;
    const orbs = Math.max(0, p.orbs || 0);
    const spin = p.orbSpinAngle || (time * 1.9);
    const centerX = px;
    const centerY = py - 18 - liftY;
    const rx = 28;
    const ry = 13;

    ctx.save();
    for (let i = 0; i < maxOrbs; i++) {
      const a = spin + (i * Math.PI * 2) / maxOrbs;
      const ox = centerX + Math.cos(a) * rx;
      const oy = centerY + Math.sin(a) * ry + Math.sin(time * 4.5 + i * 2) * 1.8;
      const isFilled = i < orbs;
      const isRecharging = i === orbs && orbs < maxOrbs;

      if (isFilled) {
        const glow = ctx.createRadialGradient(ox, oy, 1, ox, oy, 9.5);
        glow.addColorStop(0, 'rgba(130, 236, 255, 0.85)');
        glow.addColorStop(1, 'rgba(130, 236, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ox, oy, 9.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#6fe2f7';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ox, oy, 4.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ox - 1.3, oy - 1.3, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const flashCol = (p.orbEmptyFlash || 0) > 0.1 ? 'rgba(232, 92, 74, 0.72)' : 'rgba(56, 118, 134, 0.36)';
        ctx.strokeStyle = flashCol;
        ctx.lineWidth = 1.3;
        ctx.setLineDash([2.5, 2.5]);
        ctx.beginPath();
        ctx.arc(ox, oy, 4.1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        if (isRecharging) {
          const pct = Math.max(0.08, Math.min(1, (p.orbRechargeTimer || 0) / (p.orbRechargeDuration || 4.2)));
          ctx.fillStyle = 'rgba(110, 224, 248, 0.72)';
          ctx.beginPath();
          ctx.arc(ox, oy, 3.6 * pct, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (p.overclockOrb) {
      const ga = -spin * 1.45;
      const gx = centerX + Math.cos(ga) * (rx + 5);
      const gy = centerY - 12 + Math.sin(ga) * (ry * 0.75);
      const pulse = 1 + Math.sin(time * 12) * 0.14;

      const gg = ctx.createRadialGradient(gx, gy, 1.5, gx, gy, 14 * pulse);
      gg.addColorStop(0, 'rgba(255, 244, 150, 0.95)');
      gg.addColorStop(0.55, 'rgba(255, 206, 56, 0.45)');
      gg.addColorStop(1, 'rgba(255, 206, 56, 0)');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(gx, gy, 14 * pulse, 0, Math.PI * 2);
      ctx.fill();

      drawMiniStar(ctx, gx, gy, 6.2 * pulse, '#ffe052');
    }

    ctx.restore();
  }


  function drawPlayerShield(ctx, px, py, p, time) {
    const charges = Math.max(0, p.shieldCharges || 0);
    const maxDur = p.shieldMaxDuration || 18;
    const frac = Math.max(0, Math.min(1, (p.shieldTimer || 0) / maxDur));
    const expiring = (p.shieldTimer || 0) <= 3.0;
    const blink = expiring ? (0.45 + 0.55 * Math.abs(Math.sin(time * 14))) : 1.0;
    const flash = p.shieldHitFlash || 0;
    const cy = py - 18;
    const R = 30 + Math.sin(time * 4.5) * 1.3 + flash * 3.5;

    ctx.save();
    ctx.globalAlpha = blink;

    // 1. 半透明水彩青蓝泡泡护膜
    const grad = ctx.createRadialGradient(px - 6, cy - 8, 5, px, cy, R);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
    grad.addColorStop(0.68, flash > 0.1 ? 'rgba(255, 246, 178, 0.28)' : 'rgba(96, 224, 255, 0.16)');
    grad.addColorStop(1, charges >= 2 ? 'rgba(72, 208, 252, 0.42)' : 'rgba(104, 218, 246, 0.30)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, cy, R, 0, Math.PI * 2);
    ctx.fill();

    // 2. 护膜描边（双层时亮青双环，单层时轻盈单环）
    ctx.strokeStyle = flash > 0.1 ? '#fff29c' : (charges >= 2 ? 'rgba(84, 224, 255, 0.88)' : 'rgba(116, 218, 242, 0.68)');
    ctx.lineWidth = charges >= 2 ? 2.4 : 1.7;
    ctx.beginPath();
    ctx.arc(px, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    // 3. 18 秒剩余时长细弧（顶部顺时针收缩，不用盯 HUD 也能感知余时）
    ctx.strokeStyle = expiring ? '#ffd452' : '#ffffff';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(px, cy, R + 3.2, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * frac);
    ctx.stroke();

    // 4. 泡泡左上高光月牙
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(px, cy, R - 4.5, Math.PI * 1.12, Math.PI * 1.48);
    ctx.stroke();

    // 5. 1～2 颗环绕护膜星珠（直观显示当前剩余 2 层 / 1 层！）
    for (let i = 0; i < charges; i++) {
      const a = -time * 2.4 + i * Math.PI;
      const sx = px + Math.cos(a) * (R + 1);
      const sy = cy + Math.sin(a) * (R + 1);
      ctx.fillStyle = '#e8fdff';
      ctx.strokeStyle = '#1b8eb8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(sx, sy, 4.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }


  function drawPlayerActiveSkillAura(ctx, px, py, p, time) {
    const cy = py - 18;
    ctx.save();

    // 1. ✨ 鎏金撞球金身：璀璨金辉护体 + 旋转冲撞环 + 余时细弧
    if ((p.goldenBodyTimer || 0) > 0) {
      const frac = Math.max(0, Math.min(1, p.goldenBodyTimer / (p.goldenBodyMaxDuration || 5.5)));
      const exp = p.goldenBodyTimer <= 1.8;
      const a = exp ? (0.45 + 0.55 * Math.abs(Math.sin(time * 16))) : 1.0;
      const R = 33 + Math.sin(time * 9) * 1.8;

      ctx.save();
      ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(px, cy, 4, px, cy, R + 6);
      g.addColorStop(0, 'rgba(255, 250, 200, 0.22)');
      g.addColorStop(0.65, 'rgba(255, 212, 66, 0.34)');
      g.addColorStop(1, 'rgba(255, 190, 40, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, cy, R + 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffd64a';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(px, cy, R, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * frac);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 248, 198, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.arc(px, cy, R - 4, time * 5.2, time * 5.2 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 3. ⏳ 时停怀表：靛蓝星盘刻度环 + 旋转表针
    if ((p.chronoWatchTimer || 0) > 0) {
      const frac = Math.max(0, Math.min(1, p.chronoWatchTimer / (p.chronoWatchMaxDuration || 4.0)));
      const R = 38;
      ctx.save();
      ctx.strokeStyle = 'rgba(128, 152, 255, 0.86)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(px, cy, R, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * frac);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 224, 118, 0.72)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([2, 8]);
      ctx.beginPath();
      ctx.arc(px, cy, R - 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.restore();
  }

  CB.drawPlayer = { drawMochiPlayer };
})();
