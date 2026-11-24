(() => {
  const CB = window.CB;
  const INK = '#3c2e26';

  function createPaperPattern(ctx) {
    const tile = document.createElement('canvas');
    tile.width = 256;
    tile.height = 256;
    const tctx = tile.getContext('2d');

    tctx.fillStyle = '#f4ebd7';
    tctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 650; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const alpha = Math.random() * 0.045;
      tctx.fillStyle = i % 2 === 0
        ? `rgba(120, 95, 65, ${alpha})`
        : `rgba(255, 252, 245, ${alpha * 1.4})`;
      tctx.fillRect(x, y, 2 + Math.random() * 3, 1 + Math.random() * 2);
    }

    tctx.strokeStyle = 'rgba(135, 114, 86, 0.11)';
    tctx.lineWidth = 1;
    tctx.beginPath();
    for (let p = 0; p <= 256; p += 64) {
      tctx.moveTo(p + 0.5, 0);
      tctx.lineTo(p + 0.5, 256);
      tctx.moveTo(0, p + 0.5);
      tctx.lineTo(256, p + 0.5);
    }
    tctx.stroke();

    return ctx.createPattern(tile, 'repeat');
  }

  function drawSoftShadow(ctx, x, y, rx, ry, alpha = 0.2) {
    ctx.save();
    ctx.fillStyle = `rgba(68, 50, 38, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 3/4 手绘博物箱木质隔板墙
  function drawWallBlock(ctx, w) {
    const { x, y, w: ww, h: hh, height } = w;
    ctx.save();
    ctx.lineJoin = 'round';

    // 地面投影
    ctx.fillStyle = 'rgba(68, 49, 34, 0.2)';
    ctx.fillRect(x + 5, y + 8, ww, hh);

    // 正面厚木板立面
    ctx.fillStyle = '#8b613d';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.fillRect(x, y + hh - height, ww, height);
    ctx.strokeRect(x, y + hh - height, ww, height);

    // 立面木纹细线
    ctx.strokeStyle = 'rgba(60, 38, 22, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + hh - height * 0.45);
    ctx.lineTo(x + ww - 4, y + hh - height * 0.45);
    ctx.stroke();

    // 顶面温润胡桃木
    ctx.fillStyle = '#b98958';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.fillRect(x, y - height, ww, hh);
    ctx.strokeRect(x, y - height, ww, hh);

    // 顶面高光倒角线
    ctx.strokeStyle = 'rgba(255, 238, 206, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + 3, y - height + 3);
    ctx.lineTo(x + ww - 3, y - height + 3);
    ctx.stroke();

    ctx.restore();
  }

  // 带黄铜铆钉的木盒转角立柱（彻底消除墙角拼接缝隙，手账盒质感拉满）
  function drawCornerPost(ctx, post) {
    const { x, y, w, h, height } = post;
    ctx.save();
    ctx.lineJoin = 'round';

    ctx.fillStyle = 'rgba(68, 49, 34, 0.22)';
    ctx.fillRect(x + 5, y + 8, w, h);

    // 立面
    ctx.fillStyle = '#734e30';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.fillRect(x, y + h - height, w, height);
    ctx.strokeRect(x, y + h - height, w, height);

    // 顶面
    ctx.fillStyle = '#a37245';
    ctx.fillRect(x, y - height, w, h);
    ctx.strokeRect(x, y - height, w, h);

    // 顶面中央黄铜钉
    ctx.fillStyle = '#ecc25e';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x + w / 2, y - height + h / 2, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff5cf';
    ctx.beginPath();
    ctx.arc(x + w / 2 - 1.4, y - height + h / 2 - 1.4, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 各类 3/4 立体桌面道具与机关
  function drawProp(ctx, prop, time) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (prop.type === 'book') {
      drawBook(ctx, prop);
    } else if (prop.type === 'eraser') {
      drawEraser(ctx, prop);
    } else if (prop.type === 'ruler') {
      drawRuler(ctx, prop);
    } else if (prop.type === 'crate') {
      drawCrate(ctx, prop);
    } else if (prop.type === 'chest') {
      drawChest(ctx, prop, time);
    } else if (prop.type === 'bumper') {
      drawBumper(ctx, prop, time);
    } else if (prop.type === 'inkwell') {
      drawInkwell(ctx, prop);
    }

    ctx.restore();
  }

  function drawBook(ctx, prop) {
    const { x, y, w, h, height } = prop;
    ctx.fillStyle = 'rgba(72, 54, 40, 0.18)';
    ctx.beginPath();
    ctx.roundRect(x + 7, y + 9, w, h, 6);
    ctx.fill();

    ctx.fillStyle = '#efe5cf';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.roundRect(x, y + h - height, w, height, [0, 0, 6, 6]);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(120, 96, 74, 0.36)';
    ctx.lineWidth = 1.1;
    for (let ly = y + h - height + 7; ly < y + h - 4; ly += 6) {
      ctx.beginPath();
      ctx.moveTo(x + 16, ly);
      ctx.lineTo(x + w - 5, ly);
      ctx.stroke();
    }

    ctx.fillStyle = prop.spine;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.roundRect(x, y + h - height, 16, height, [0, 0, 0, 6]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = prop.color;
    ctx.beginPath();
    ctx.roundRect(x, y - height, w, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#e6c47a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x + 20, y - height + 9, w - 28, h - 18, 3);
    ctx.stroke();

    ctx.fillStyle = '#f5dfb0';
    ctx.font = '700 12px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(prop.title, x + w * 0.54, y - height + h * 0.54);
  }

  function drawEraser(ctx, prop) {
    const { x, y, w, h, height } = prop;
    ctx.fillStyle = 'rgba(72, 54, 40, 0.18)';
    ctx.beginPath();
    ctx.roundRect(x + 7, y + 9, w, h, 7);
    ctx.fill();

    ctx.fillStyle = '#e88b9c';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.roundRect(x, y + h - height, w, height, [0, 0, 7, 7]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffadc0';
    ctx.beginPath();
    ctx.roundRect(x, y - height, w, h, 7);
    ctx.fill();
    ctx.stroke();

    const sleeve = Math.min(26, w * 0.24);
    ctx.fillStyle = '#4e79a7';
    ctx.fillRect(x + sleeve, y - height, w - sleeve * 2, h);
    ctx.fillStyle = '#385d85';
    ctx.fillRect(x + sleeve, y + h - height, w - sleeve * 2, height);
    ctx.strokeRect(x + sleeve, y - height, w - sleeve * 2, h);

    ctx.fillStyle = '#fffaf0';
    ctx.font = '700 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BOUNCE', x + w / 2, y - height + h / 2 + 4);
  }

  function drawRuler(ctx, prop) {
    const { x, y, w, h, height } = prop;
    ctx.fillStyle = 'rgba(72, 54, 40, 0.15)';
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 7, w, h, 4);
    ctx.fill();

    ctx.fillStyle = '#b98952';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.roundRect(x, y + h - height, w, height, [0, 0, 4, 4]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e1b87d';
    ctx.beginPath();
    ctx.roundRect(x, y - height, w, h, 4);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#5c4228';
    ctx.lineWidth = 1.3;
    for (let rx = x + 14; rx < x + w - 10; rx += 14) {
      const longTick = Math.round((rx - x) / 14) % 4 === 0;
      ctx.beginPath();
      ctx.moveTo(rx, y - height);
      ctx.lineTo(rx, y - height + (longTick ? 14 : 8));
      ctx.stroke();
    }
  }

  function drawCrate(ctx, prop) {
    const { x, y, w, h, height } = prop;
    ctx.fillStyle = 'rgba(72, 54, 40, 0.18)';
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 7, w, h, 4);
    ctx.fill();

    // 正面
    ctx.fillStyle = '#b48251';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.roundRect(x, y + h - height, w, height, [0, 0, 4, 4]);
    ctx.fill();
    ctx.stroke();

    // 斜撑木条
    ctx.strokeStyle = '#7c5530';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + h - height + 4);
    ctx.lineTo(x + w - 5, y + h - 4);
    ctx.stroke();

    // 顶面
    ctx.fillStyle = '#d4a672';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.roundRect(x, y - height, w, h, 4);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#8b6138';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 5, y - height + 5, w - 10, h - 10);
  }

  function drawChest(ctx, prop, time) {
    const { x, y, w, h, height, isGiant } = prop;
    const glow = 0.22 + 0.14 * Math.sin(time * 4.5);

    // 珍宝柔和金晕
    if (isGiant) {
      const g = ctx.createRadialGradient(x + w / 2, y + h / 2 - 10, 10, x + w / 2, y + h / 2 - 10, w * 0.95);
      g.addColorStop(0, `rgba(255, 215, 92, ${glow})`);
      g.addColorStop(1, 'rgba(255, 215, 92, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2 - 10, w * 0.95, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(72, 54, 40, 0.22)';
    ctx.beginPath();
    ctx.roundRect(x + 6, y + 8, w, h, 6);
    ctx.fill();

    // 箱体正面
    ctx.fillStyle = isGiant ? '#8a2f2a' : '#7b4d31';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.roundRect(x, y + h - height, w, height, [0, 0, 6, 6]);
    ctx.fill();
    ctx.stroke();

    // 弧形拱顶盖
    ctx.fillStyle = isGiant ? '#a83c34' : '#9c6340';
    ctx.beginPath();
    ctx.roundRect(x, y - height, w, h, 8);
    ctx.fill();
    ctx.stroke();

    // 黄铜镶边与中央金锁扣
    ctx.fillStyle = '#f2c350';
    ctx.fillRect(x + 9, y - height, 8, h + height);
    ctx.fillRect(x + w - 17, y - height, 8, h + height);
    ctx.strokeRect(x + 9, y - height, 8, h + height);
    ctx.strokeRect(x + w - 17, y - height, 8, h + height);

    ctx.beginPath();
    ctx.roundRect(x + w / 2 - 8, y + h - height - 5, 16, 15, 3);
    ctx.fill();
    ctx.stroke();
  }

  function drawBumper(ctx, prop, time) {
    const { x, y, r, height, hitFlash } = prop;
    const scale = 1 + (hitFlash || 0) * 0.18;

    drawSoftShadow(ctx, x, y + 6, r * 1.05, r * 0.6, 0.22);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // 圆柱侧面底座
    ctx.fillStyle = '#b57b2a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.72, 0, 0, Math.PI);
    ctx.lineTo(-r, -height);
    ctx.ellipse(0, -height, r, r * 0.72, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 顶部弹力星盘
    ctx.fillStyle = hitFlash > 0.1 ? '#fff1a6' : '#f4c653';
    ctx.beginPath();
    ctx.ellipse(0, -height, r, r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 红白靶心环
    ctx.fillStyle = '#d95344';
    ctx.beginPath();
    ctx.ellipse(0, -height, r * 0.56, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 中心旋转小十字
    ctx.save();
    ctx.translate(0, -height);
    ctx.rotate(time * 1.4);
    ctx.fillStyle = '#fff8e2';
    ctx.fillRect(-5, -1.5, 10, 3);
    ctx.fillRect(-1.5, -5, 3, 10);
    ctx.restore();

    ctx.restore();
  }

  function drawInkwell(ctx, prop) {
    const { x, y, r, height, color } = prop;
    drawSoftShadow(ctx, x, y + 4, r, r * 0.6, 0.2);

    // 玻璃墨水瓶身
    ctx.fillStyle = color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.roundRect(x - r * 0.85, y - height + 4, r * 1.7, height, 6);
    ctx.fill();
    ctx.stroke();

    // 瓶口软木塞
    ctx.fillStyle = '#d1a473';
    ctx.beginPath();
    ctx.roundRect(x - r * 0.45, y - height - 4, r * 0.9, 10, 3);
    ctx.fill();
    ctx.stroke();

    // 玻璃反光条
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(x - r * 0.52, y - height + 8, 3.5, height - 10);
  }

  CB.brush = {
    createPaperPattern,
    drawSoftShadow,
    drawWallBlock,
    drawCornerPost,
    drawProp,
  };
})();
