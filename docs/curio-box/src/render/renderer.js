(() => {
  const CB = window.CB;
  const game = CB.game;
  const { drawWallBlock, drawCornerPost, drawProp } = CB.brush;
  const { drawMochiPlayer } = CB.drawPlayer;

  let paperPattern = null;

  function initRenderer(ctx) {
    paperPattern = CB.brush.createPaperPattern(ctx);
  }

  function renderWorld(ctx) {
    const { viewW, viewH, camera, map, player, particles, footprints, popups, time } = game;
    if (!map) return;

    const sx = (Math.random() - 0.5) * camera.shake * 2;
    const sy = (Math.random() - 0.5) * camera.shake * 2;

    // 1. 博物箱外部深色胡桃木桌底背景
    ctx.fillStyle = '#c8b496';
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.save();
    ctx.translate(viewW / 2 + sx, viewH / 2 + sy);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // 2. 绘制每个房间的水彩纸地板与职能地毯/铭文
    for (const room of map.rooms) {
      drawRoomFloor(ctx, room, time);
    }

    // 3. 绘制门洞黄铜门槛与通道引导线
    for (const door of map.doorways) {
      drawDoorwayThreshold(ctx, door);
    }

    // 4. 跑动小脚印与地面尘土粒子
    for (const fp of footprints) {
      const a = (fp.life / fp.maxLife) * 0.24;
      ctx.fillStyle = `rgba(115, 88, 62, ${a})`;
      ctx.beginPath();
      ctx.ellipse(fp.x, fp.y, fp.r * 1.2, fp.r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const pt of particles) {
      const a = Math.max(0, pt.life / pt.maxLife);
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 5. 统一 Y 轴深度排序（墙体、角柱、家具、主角实现真实 3/4 前后遮挡）
    const drawList = [];
    for (const w of map.walls) {
      drawList.push({ sortY: w.y + w.h, draw: () => drawWallBlock(ctx, w) });
    }
    for (const post of map.posts) {
      drawList.push({ sortY: post.y + post.h + 1, draw: () => drawCornerPost(ctx, post) });
    }
    for (const prop of map.props) {
      const syProp = prop.shape === 'circle' ? prop.y + prop.r * 0.7 : prop.y + prop.h;
      drawList.push({ sortY: syProp, draw: () => drawProp(ctx, prop, time) });
    }
    drawList.push({
      sortY: player.y + 4,
      draw: () => drawMochiPlayer(ctx, player, time, game.variant, 0, 0),
    });

    drawList.sort((a, b) => a.sortY - b.sortY);
    for (const item of drawList) item.draw();

    // 6. 羊皮纸云雾迷雾（未探索房间柔光遮盖，按 F 可开关便于检视随机算法）
    if (game.showFog) {
      for (const room of map.rooms) {
        if (room.fogAlpha > 0.02) {
          drawRoomFog(ctx, room, time);
        }
      }
    }

    // 7. 房间标题与弹射飘字反馈
    for (const pop of popups) {
      const a = Math.min(1, pop.life / (pop.maxLife * 0.4));
      const rise = (1 - pop.life / pop.maxLife) * 28;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = '700 15px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(255, 250, 240, 0.92)';
      ctx.lineWidth = 4;
      ctx.strokeText(pop.text, pop.x, pop.y - rise);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y - rise);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawRoomFloor(ctx, room, time) {
    const { x, y, w, h, role } = room;
    ctx.save();

    // 水彩制图纸底层
    ctx.fillStyle = paperPattern;
    ctx.fillRect(x, y, w, h);

    // 按房间职能叠一层极通透的水彩氛围洗色
    const tints = {
      spawn: 'rgba(130, 198, 145, 0.11)',
      vault: 'rgba(240, 185, 70, 0.14)',
      extract: 'rgba(92, 178, 212, 0.13)',
      atrium: 'rgba(235, 160, 178, 0.09)',
      corridor: 'rgba(176, 145, 108, 0.08)',
      treasure: 'rgba(245, 212, 115, 0.1)',
    };
    if (tints[role]) {
      ctx.fillStyle = tints[role];
      ctx.fillRect(x, y, w, h);
    }

    // 房间内边距虚线手账框
    ctx.strokeStyle = 'rgba(125, 98, 72, 0.18)';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(x + 28, y + 28, w - 56, h - 56);

    const cx = x + w / 2;
    const cy = y + h / 2;

    if (role === 'spawn') {
      // 出发工坊绿绒垫
      ctx.fillStyle = 'rgba(104, 168, 122, 0.18)';
      ctx.strokeStyle = 'rgba(72, 125, 88, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 78, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(68, 110, 82, 0.68)';
      ctx.font = '700 13px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('出发工坊 · SPAWN', cx, cy + 102);
    } else if (role === 'vault') {
      // 大金保险库绯红金丝绒毯
      ctx.fillStyle = 'rgba(178, 62, 54, 0.18)';
      ctx.strokeStyle = '#d49d35';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.roundRect(cx - 145, cy - 95, 290, 190, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(166, 108, 18, 0.78)';
      ctx.font = '700 13px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★ 高危大金保险库 ★', cx, y + h - 42);
    } else if (role === 'extract') {
      // 怀表撤离阵（旋转指针 + 发光刻度环）
      const pulse = 0.88 + 0.12 * Math.sin(time * 3.5);
      ctx.fillStyle = `rgba(82, 178, 212, ${0.14 * pulse})`;
      ctx.strokeStyle = '#3b8fb0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 86, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 怀表 12 刻度
      ctx.strokeStyle = '#d49d35';
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 68, cy + Math.sin(a) * 68);
        ctx.lineTo(cx + Math.cos(a) * 79, cy + Math.sin(a) * 79);
        ctx.stroke();
      }

      // 动态旋转时针与分针
      ctx.strokeStyle = '#2d637a';
      ctx.lineCap = 'round';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(time * 0.4) * 38, cy + Math.sin(time * 0.4) * 38);
      ctx.stroke();

      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(time * 2.2) * 58, cy + Math.sin(time * 2.2) * 58);
      ctx.stroke();

      ctx.fillStyle = 'rgba(42, 108, 136, 0.85)';
      ctx.font = '700 13px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⏱ 怀表撤离点 · EXTRACT', cx, cy + 110);
    } else if (role === 'atrium') {
      // 2×2 大中庭罗盘暗纹
      ctx.strokeStyle = 'rgba(186, 118, 134, 0.25)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, 175, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  function drawDoorwayThreshold(ctx, door) {
    ctx.save();
    ctx.fillStyle = '#dec498';
    ctx.strokeStyle = 'rgba(92, 68, 45, 0.42)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(door.cx - door.w / 2, door.cy - door.h / 2, door.w, door.h, 4);
    ctx.fill();
    ctx.stroke();

    // 门槛上的细铜钉装饰
    ctx.fillStyle = '#c89b44';
    if (door.orient === 'h') {
      ctx.beginPath();
      ctx.arc(door.cx - door.w * 0.36, door.cy, 2.5, 0, Math.PI * 2);
      ctx.arc(door.cx + door.w * 0.36, door.cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(door.cx, door.cy - door.h * 0.36, 2.5, 0, Math.PI * 2);
      ctx.arc(door.cx, door.cy + door.h * 0.36, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRoomFog(ctx, room, time) {
    ctx.save();
    ctx.globalAlpha = room.fogAlpha * 0.94;
    ctx.fillStyle = '#e8dbc2';
    ctx.fillRect(room.x - 12, room.y - 38, room.w + 24, room.h + 50);

    // 柔和漂浮的手绘羊皮纸云团
    ctx.fillStyle = 'rgba(255, 249, 236, 0.55)';
    const cx = room.x + room.w / 2;
    const cy = room.y + room.h / 2;
    const drift = Math.sin(time * 0.9 + room.id) * 14;
    ctx.beginPath();
    ctx.arc(cx - 50 + drift, cy - 10, 68, 0, Math.PI * 2);
    ctx.arc(cx + 45 - drift * 0.7, cy + 12, 74, 0, Math.PI * 2);
    ctx.fill();

    // 未探索问号印章
    ctx.fillStyle = 'rgba(130, 102, 74, 0.36)';
    ctx.font = '700 32px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', cx, cy);
    ctx.restore();
  }

  CB.renderer = { initRenderer, renderWorld };
})();
