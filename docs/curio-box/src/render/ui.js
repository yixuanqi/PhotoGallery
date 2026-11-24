(() => {
  const CB = window.CB;
  const game = CB.game;

  const ROLE_COLORS = {
    spawn: '#7ac78c',
    vault: '#f2c14e',
    extract: '#5cb3d4',
    atrium: '#efa0b0',
    corridor: '#d6b78f',
    treasure: '#e9d282',
    normal: '#e6d6bc',
  };

  function renderMinimap(mctx, canvas) {
    const map = game.map;
    if (!map) return;

    const W = canvas.width;
    const H = canvas.height;
    mctx.clearRect(0, 0, W, H);

    // 计算网格自适应居中缩放
    let minGx = Infinity, minGy = Infinity, maxGx = -Infinity, maxGy = -Infinity;
    for (const r of map.rooms) {
      if (r.gx < minGx) minGx = r.gx;
      if (r.gy < minGy) minGy = r.gy;
      if (r.gx + r.gw > maxGx) maxGx = r.gx + r.gw;
      if (r.gy + r.gh > maxGy) maxGy = r.gy + r.gh;
    }

    const spanX = Math.max(1, maxGx - minGx);
    const spanY = Math.max(1, maxGy - minGy);
    const pad = 18;
    const cellPx = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
    const ox = (W - spanX * cellPx) / 2 - minGx * cellPx;
    const oy = (H - spanY * cellPx) / 2 - minGy * cellPx;

    // 1. 先绘制门洞连接线（一眼看清环路拓扑！）
    mctx.strokeStyle = '#735842';
    mctx.lineWidth = Math.max(3, cellPx * 0.16);
    mctx.lineCap = 'round';
    for (const d of map.doorways) {
      const r1 = map.rooms[d.r1];
      const r2 = map.rooms[d.r2];
      const visible = !game.showFog || r1.discovered || r2.discovered;
      if (!visible) continue;

      const gx = d.cx / map.cellW;
      const gy = d.cy / map.cellH;
      const mx = ox + gx * cellPx;
      const my = oy + gy * cellPx;

      mctx.beginPath();
      if (d.orient === 'h') {
        mctx.moveTo(mx, my - 4);
        mctx.lineTo(mx, my + 4);
      } else {
        mctx.moveTo(mx - 4, my);
        mctx.lineTo(mx + 4, my);
      }
      mctx.stroke();
    }

    // 2. 绘制每个不规则/合并房间块（1×1 / 2×1 / 1×2 / 2×2）
    const gap = 3;
    for (const r of map.rooms) {
      const showFull = !game.showFog || r.discovered;
      const showHint = r.adjacentSeen;
      if (!showFull && !showHint) continue;

      const rx = ox + r.gx * cellPx + gap;
      const ry = oy + r.gy * cellPx + gap;
      const rw = r.gw * cellPx - gap * 2;
      const rh = r.gh * cellPx - gap * 2;

      mctx.fillStyle = showFull ? (ROLE_COLORS[r.role] || '#e6d6bc') : 'rgba(182, 162, 134, 0.45)';
      mctx.strokeStyle = r.id === game.player.currentRoomId ? '#d9483b' : '#4a3b32';
      mctx.lineWidth = r.id === game.player.currentRoomId ? 2.4 : 1.4;

      mctx.beginPath();
      mctx.roundRect(rx, ry, rw, rh, 5);
      mctx.fill();
      mctx.stroke();

      // 房间职能小图标
      mctx.fillStyle = '#3b2b23';
      mctx.font = '700 10px sans-serif';
      mctx.textAlign = 'center';
      mctx.textBaseline = 'middle';
      const cx = rx + rw / 2;
      const cy = ry + rh / 2;

      if (!showFull) {
        mctx.fillStyle = 'rgba(84, 66, 52, 0.65)';
        mctx.fillText('?', cx, cy);
      } else if (r.role === 'vault') {
        mctx.fillText('★', cx, cy);
      } else if (r.role === 'extract') {
        mctx.fillText('⏱', cx, cy);
      } else if (r.role === 'atrium') {
        mctx.fillText('2×2', cx, cy);
      } else if (r.role === 'corridor') {
        mctx.fillText(r.gw > r.gh ? '2×1' : '1×2', cx, cy);
      }
    }

    // 3. 主角实时红点位置
    const px = ox + (game.player.x / map.cellW) * cellPx;
    const py = oy + (game.player.y / map.cellH) * cellPx;
    mctx.fillStyle = '#d94436';
    mctx.strokeStyle = '#fffdf8';
    mctx.lineWidth = 2;
    mctx.beginPath();
    mctx.arc(px, py, 4.4, 0, Math.PI * 2);
    mctx.fill();
    mctx.stroke();
  }

  function updateStatsBanner(el) {
    const m = game.map;
    if (!m || !el) return;
    const s = m.stats;
    el.textContent =
      `种子 #${m.seed} · ${s.roomCount} 房间(${s.cellCount}格) · ` +
      `${s.cycles} 环路 · 出生→金库 ${s.dSpawnVault}步 · 出生→撤离 ${s.dSpawnExtract}步 · ${s.genMs}ms`;
  }

  CB.ui = { renderMinimap, updateStatsBanner };
})();
