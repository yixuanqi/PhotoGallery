(() => {
  const CB = window.CB;
  const game = CB.game;

  const ROLE_COLORS = {
    spawn: '#7cd49c',
    vault: '#f7ca4d',
    extract: '#64c2e8',
    atrium: '#8be0df',
    gallery: '#a6e0b8',
    corridor: '#c5e3be',
    treasure: '#f2e085',
  };

  const BIOME_COLORS = {
    sun_glasshouse: '#f5ecc8',
    lotus_pond: '#cdeef2',
    ancient_vine: '#d3ebd4',
  };

  const GUARD_DOT_COLORS = {
    shield_charger: '#3c9970',
    lotus_warden: '#f2b705',
    dew_hopper: '#46c4d9',
    astro_sentinel: '#ffd652',
    astro_archon: '#ffae38',
    comet_orbiter: '#8ce8ff',
    vine_stalker: '#ff9642',
    vine_elder: '#e85d3f',
    vine_magnet: '#2f9c88',
    colossus: '#ff4f4f',
  };

  let lastCurioKey = '';
  let lastStuntVal = 0;
  let stuntPopTimer = null;

  function renderMinimap(mctx, canvas) {
    const map = game.map;
    if (!map) return;

    const W = canvas.width;
    const H = canvas.height;
    mctx.clearRect(0, 0, W, H);

    let minGx = Infinity, minGy = Infinity, maxGx = -Infinity, maxGy = -Infinity;
    for (const c of map.cells.values()) {
      if (c.gx < minGx) minGx = c.gx;
      if (c.gy < minGy) minGy = c.gy;
      if (c.gx + 1 > maxGx) maxGx = c.gx + 1;
      if (c.gy + 1 > maxGy) maxGy = c.gy + 1;
    }

    const spanX = Math.max(1, maxGx - minGx);
    const spanY = Math.max(1, maxGy - minGy);
    const pad = 18;
    const cellPx = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
    const ox = (W - spanX * cellPx) / 2 - minGx * cellPx;
    const oy = (H - spanY * cellPx) / 2 - minGy * cellPx;

    // 1. 浮岛石桥连接线（含藤蔓花闸锁定标记）
    mctx.lineCap = 'round';
    for (const d of map.doorways) {
      const r1 = map.rooms[d.r1];
      const r2 = map.rooms[d.r2];
      const visible = !game.showFog || r1.discovered || r2.discovered;
      if (!visible) continue;

      const gate = d.gateId && map.vineGates ? map.vineGates.find((g) => g.id === d.gateId) : null;
      const isLockedGate = !!(gate && !gate.open);

      const gx = d.cx / map.cellW;
      const gy = d.cy / map.cellH;
      const mx = ox + gx * cellPx;
      const my = oy + gy * cellPx;

      mctx.strokeStyle = isLockedGate ? '#2f9c66' : '#5c8d94';
      mctx.lineWidth = Math.max(3, cellPx * 0.17);
      mctx.beginPath();
      if (d.orient === 'h') {
        mctx.moveTo(mx, my - 4);
        mctx.lineTo(mx, my + 4);
      } else {
        mctx.moveTo(mx - 4, my);
        mctx.lineTo(mx + 4, my);
      }
      mctx.stroke();

      if (isLockedGate) {
        mctx.fillStyle = '#ffd84d';
        mctx.strokeStyle = '#2e4a52';
        mctx.lineWidth = 1.2;
        mctx.beginPath();
        mctx.arc(mx, my, 3.6, 0, Math.PI * 2);
        mctx.fill();
        mctx.stroke();
      }
    }

    // 2. 按细胞精准绘制不规则/L型/合并房间块（让 L 型花廊在大地图上一目了然！）
    const gap = 2.6;
    const revealExtract = game.run.vaultOpened || game.run.hasGrandCurio || game.run.extraction.active;

    for (const r of map.rooms) {
      const showFull = !game.showFog || r.discovered;
      const forceExtract = r.role === 'extract' && revealExtract;
      const showHint = r.adjacentSeen || forceExtract;
      if (!showFull && !showHint) continue;

      const fillCol = showFull
        ? (ROLE_COLORS[r.role] || BIOME_COLORS[r.biome] || '#e3f0e4')
        : forceExtract
        ? 'rgba(100, 194, 232, 0.78)'
        : 'rgba(255, 255, 255, 0.65)';
      const strokeCol = r.id === game.player.currentRoomId ? '#e05848' : '#365c66';
      const strokeW = r.id === game.player.currentRoomId ? 2.4 : 1.4;

      // 先铺满房间所有格（带无缝内部连接），再描外轮廓
      mctx.fillStyle = fillCol;
      for (const c of r.cells) {
        const hasE = r.cellKeys.has(`${c.gx + 1},${c.gy}`);
        const hasS = r.cellKeys.has(`${c.gx},${c.gy + 1}`);
        const rx = ox + c.gx * cellPx + gap;
        const ry = oy + c.gy * cellPx + gap;
        const rw = cellPx - gap * 2 + (hasE ? gap * 2 + 1 : 0);
        const rh = cellPx - gap * 2 + (hasS ? gap * 2 + 1 : 0);
        mctx.beginPath();
        mctx.roundRect(rx, ry, rw, rh, 4);
        mctx.fill();
      }

      // 仅描每个细胞的外露边，精确勾勒出 L 型、2×2、2×1 与单格外形
      mctx.strokeStyle = strokeCol;
      mctx.lineWidth = strokeW;
      mctx.beginPath();
      for (const c of r.cells) {
        const x0 = ox + c.gx * cellPx + gap;
        const y0 = oy + c.gy * cellPx + gap;
        const x1 = ox + (c.gx + 1) * cellPx - gap;
        const y1 = oy + (c.gy + 1) * cellPx - gap;
        const hasN = r.cellKeys.has(`${c.gx},${c.gy - 1}`);
        const hasS = r.cellKeys.has(`${c.gx},${c.gy + 1}`);
        const hasW = r.cellKeys.has(`${c.gx - 1},${c.gy}`);
        const hasE = r.cellKeys.has(`${c.gx + 1},${c.gy}`);
        if (!hasN) { mctx.moveTo(x0, y0); mctx.lineTo(x1, y0); }
        if (!hasS) { mctx.moveTo(x0, y1); mctx.lineTo(x1, y1); }
        if (!hasW) { mctx.moveTo(x0, y0); mctx.lineTo(x0, y1); }
        if (!hasE) { mctx.moveTo(x1, y0); mctx.lineTo(x1, y1); }
      }
      mctx.stroke();

      // 房间徽标锚点（取房间重心所在格中心，确保 L 型图标不会落到缺角里）
      const anchorCell = r.cells[0];
      const cx = r.kind === 'lshape'
        ? ox + (anchorCell.gx + 0.5) * cellPx
        : ox + (r.gx + r.gw / 2) * cellPx;
      const cy = r.kind === 'lshape'
        ? oy + (anchorCell.gy + 0.5) * cellPx
        : oy + (r.gy + r.gh / 2) * cellPx;

      if (r.role === 'extract' && revealExtract) {
        const pulseR = 7 + ((game.time * 16) % 14);
        const alpha = Math.max(0, 1 - (pulseR - 7) / 14);
        mctx.strokeStyle = `rgba(36, 152, 196, ${alpha})`;
        mctx.lineWidth = 2;
        mctx.beginPath();
        mctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
        mctx.stroke();
      } else if (r.role === 'vault' && showFull && !game.run.vaultOpened) {
        const pulseR = 6 + ((game.time * 12) % 12);
        const alpha = Math.max(0, 1 - (pulseR - 6) / 12);
        mctx.strokeStyle = `rgba(218, 154, 28, ${alpha})`;
        mctx.lineWidth = 2;
        mctx.beginPath();
        mctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
        mctx.stroke();
      }

      mctx.fillStyle = '#24454d';
      mctx.font = '700 9.5px sans-serif';
      mctx.textAlign = 'center';
      mctx.textBaseline = 'middle';

      if (forceExtract && !showFull) {
        mctx.fillText('🎈', cx, cy);
      } else if (!showFull) {
        mctx.fillStyle = 'rgba(72, 124, 146, 0.68)';
        mctx.fillText('☁', cx, cy);
      } else if (r.role === 'vault') {
        mctx.fillText(game.run.vaultOpened ? '✓' : '☀', cx, cy);
      } else if (r.role === 'extract') {
        mctx.fillText('🎈', cx, cy);
      } else if (r.role === 'atrium') {
        mctx.fillText('2×2', cx, cy);
      } else if (r.role === 'gallery') {
        mctx.fillText('L廊', cx, cy);
      } else if (r.role === 'corridor') {
        mctx.fillText(r.gw > r.gh ? '2×1' : '1×2', cx, cy);
      }
    }

    // 3. 已探索浮岛内的守卫位置
    for (const g of game.guards) {
      if (g.dead) continue;
      const room = CB.mapGen.findRoomAt(map, g.x, g.y);
      if (game.showFog && room && !room.discovered) continue;

      const gx = ox + (g.x / map.cellW) * cellPx;
      const gy = oy + (g.y / map.cellH) * cellPx;
      mctx.fillStyle = GUARD_DOT_COLORS[g.kind] || '#4f8999';
      mctx.strokeStyle = g.isElite ? '#ffe066' : '#ffffff';
      mctx.lineWidth = g.isElite ? 2.0 : 1.4;
      mctx.beginPath();
      mctx.arc(gx, gy, g.isElite ? 4.3 : 3.1, 0, Math.PI * 2);
      mctx.fill();
      mctx.stroke();
    }

    // 4. 主角实时红点位置
    const px = ox + (game.player.x / map.cellW) * cellPx;
    const py = oy + (game.player.y / map.cellH) * cellPx;
    mctx.fillStyle = '#e05244';
    mctx.strokeStyle = '#ffffff';
    mctx.lineWidth = 2;
    mctx.beginPath();
    mctx.arc(px, py, 4.4, 0, Math.PI * 2);
    mctx.fill();
    mctx.stroke();
  }

  function updateStatsBanner(el) {
    const m = game.map;
    if (!m || !el) return;
    const st = m.stage || (CB.stages ? CB.stages.getStage(game.currentStageId) : null);
    const multTxt = st && st.haulMult > 1 ? ` · ×${st.haulMult}估值` : '';
    el.textContent = st
      ? `第 ${st.id} 关 · ${st.name}${multTxt}`
      : `云岛 #${m.seed}`;
  }

  function updateCombatHud(els) {
    const p = game.player;
    const run = game.run;
    const ex = run.extraction;

    if (els.hpFill) els.hpFill.style.width = `${Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100))}%`;
    if (els.hpText) els.hpText.textContent = `${Math.ceil(p.hp)}`;
    if (els.coinEl) els.coinEl.textContent = `${p.coins}`;
    if (els.stuntEl && CB.extraction) {
      const sv = CB.extraction.getStuntBounty();
      els.stuntEl.textContent = `${sv}`;
      if (sv > lastStuntVal) {
        const parent = els.stuntEl.parentElement;
        if (parent) {
          parent.classList.add('stunt-pop');
          if (stuntPopTimer) clearTimeout(stuntPopTimer);
          stuntPopTimer = setTimeout(() => parent.classList.remove('stunt-pop'), 240);
        }
      }
      lastStuntVal = sv;
    }
    if (els.haulEl && CB.extraction) els.haulEl.textContent = `${CB.extraction.getTotalHaulValue()}`;
    if (els.bankEl) els.bankEl.textContent = `${game.meta.bankValue}`;
    if (els.hubBadge && CB.extraction && CB.extraction.canAffordAnyUpgrade) {
      els.hubBadge.classList.toggle('hidden', !CB.extraction.canAffordAnyUpgrade());
    }
    if (els.guardEl) els.guardEl.textContent = `${game.guards.length}`;

    if (els.objEl) {
      els.objEl.classList.remove('obj-alarm', 'obj-extract', 'obj-done');
      if (run.phase === 'extracted') {
        els.objEl.textContent = '🎈 已乘热气球安全返航';
        els.objEl.classList.add('obj-done');
      } else if (run.phase === 'failed') {
        els.objEl.textContent = '✕ 发条停摆 · 返航失败';
        els.objEl.classList.add('obj-alarm');
      } else if (ex.active) {
        const gustActive = !!(ex.gust && ex.gust.active);
        els.objEl.textContent = ex.inside
          ? (gustActive
            ? `🌬️ ${ex.gust.label} +45% · 升空 ${ex.timeLeft.toFixed(1)}s`
            : `🎈 热气球充气升空 ${ex.timeLeft.toFixed(1)}s`)
          : `⚠ 暂停 ${ex.timeLeft.toFixed(1)}s · 回到登机台!`;
        els.objEl.classList.add(ex.inside ? 'obj-extract' : 'obj-alarm');
      } else if (run.hasGrandCurio) {
        els.objEl.textContent = '🏃 已得大金 · 速往 🎈 热气球撤离坞!';
        els.objEl.classList.add('obj-alarm');
      } else if (run.vaultOpened) {
        els.objEl.textContent = '✨ 拾取太阳花大金 · 准备升空!';
        els.objEl.classList.add('obj-alarm');
      } else {
        const vaultRoom = game.map ? game.map.rooms[game.map.vaultRoomId] : null;
        if (vaultRoom && vaultRoom.discovered) {
          els.objEl.textContent = '🔓 靠近太阳花神匣按 E 启封';
        } else {
          const st = game.map && game.map.stage ? game.map.stage : null;
          els.objEl.textContent = st
            ? `第 ${st.id} 关 · ${st.tagline} · 搜寻 ☀ 金库`
            : '☁ 探索空中花房 · 搜寻 ☀ 太阳花穹金库';
        }
      }
    }

    if (els.curioTray) {
      const key = p.curios.map((c) => c.id).join(',');
      if (key !== lastCurioKey) {
        lastCurioKey = key;
        if (p.curios.length === 0) {
          els.curioTray.innerHTML = '<span class="curio-empty">奇物篮空 · 开匣收集</span>';
        } else {
          els.curioTray.innerHTML = p.curios
            .map(
              (c) =>
                `<span class="curio-chip ${c.rarity === 'legendary' ? 'curio-grand' : ''}" title="${c.name}（估值 ${c.value}）：${c.perk}">${c.icon}<small>${c.shortPerk || c.value}</small></span>`
            )
            .join('');
        }
      }
    }
  }

  function showRunSummary(data) {
    const modal = document.getElementById('runModal');
    if (!modal) return;
    const isWin = data.outcome === 'extracted';
    const nextStage = data.nextStage || null;

    const stampEl = document.getElementById('summaryStamp');
    const titleEl = document.getElementById('summaryTitle');
    const subEl = document.getElementById('summarySub');
    const haulEl = document.getElementById('summaryHaul');
    const bankEl = document.getElementById('summaryBank');
    const curiosEl = document.getElementById('summaryCurios');
    const statsEl = document.getElementById('summaryStats');
    const btnNext = document.getElementById('btnNextRun');
    const btnRetry = document.getElementById('btnRetrySeed');

    modal.classList.remove('hidden', 'modal-win', 'modal-fail');
    modal.classList.add(isWin ? 'modal-win' : 'modal-fail');

    stampEl.textContent = isWin ? data.grade : 'FAIL';
    const stuntNote = data.stuntBounty > 0 ? `（含 ✨ 物理特技赏金 +${data.stuntBounty}）` : '';
    if (isWin && !nextStage) {
      titleEl.textContent = '🏆 终极花穹凯旋 · 全四关制霸！';
      subEl.textContent = `热气球冲破云海，第 ${data.stageId} 关（×${data.haulMult} 倍估值）战利品已全部入库${stuntNote}`;
    } else if (isWin) {
      titleEl.textContent = `第 ${data.stageId} 关「${data.stageName}」撤离成功！`;
      subEl.textContent = `战利品已安全入库${stuntNote}，可携当前奇物构筑飞往第 ${nextStage.id} 关「${nextStage.name}」`;
    } else {
      titleEl.textContent = `第 ${data.stageId} 关「${data.stageName}」撤离失败`;
      subEl.textContent = `本关携带的估值 ${data.totalHaul} 战利品${stuntNote}散落在浮岛中，母港金库资产安全保留`;
    }

    if (btnNext) {
      if (isWin && nextStage) {
        btnNext.textContent = `前往第 ${nextStage.id} 关 · ${nextStage.name}（携带奇物）(Enter)`;
      } else if (isWin) {
        btnNext.textContent = '开启新一轮四关远征 (Enter)';
      } else {
        btnNext.textContent = `重新挑战第 ${data.stageId} 关 (Enter / R)`;
      }
    }
    if (btnRetry) {
      btnRetry.textContent = isWin ? `重玩第 ${data.stageId} 关 (R)` : '同种子复仇本关 (T)';
    }

    haulEl.textContent = isWin ? `+${data.totalHaul}` : `-${data.totalHaul}`;
    bankEl.textContent = `${game.meta.bankValue}`;

    if (data.curios.length === 0) {
      curiosEl.innerHTML = '<span class="summary-empty">本关未拾取奇物（启封秘境花匣或太阳花神匣即可获取物理构筑词条）</span>';
    } else {
      curiosEl.innerHTML = data.curios
        .map(
          (c) =>
            `<div class="summary-curio ${c.rarity === 'legendary' ? 'is-grand' : ''}" title="${c.perk}">` +
            `<span class="sc-icon">${c.icon}</span>` +
            `<span class="sc-name">${c.name}</span>` +
            `<span class="sc-val">${c.shortPerk || ('+' + c.value)}</span></div>`
        )
        .join('');
    }

    const mm = Math.floor(data.elapsed / 60);
    const ss = String(Math.floor(data.elapsed % 60)).padStart(2, '0');
    const totalKinds = CB.extraction ? CB.extraction.ALL_CURIOS.length : 11;
    const clearedCnt = (game.meta.clearedStages || []).length;
    statsEl.innerHTML = `
      <div><span>✨ 特技赏金</span><strong>+${data.stuntBounty || 0}</strong></div>
      <div><span>☁ 崖边击落</span><strong>${data.cliffDrops || 0}</strong></div>
      <div><span>🎱 怪物连撞</span><strong>${data.monsterChains || 0}</strong></div>
      <div><span>📦 木箱台球</span><strong>${data.billiardHits || 0}</strong></div>
      <div><span>🪐 星轨/折射</span><strong>${data.slingshotCrits || 0}/${data.ricochetCrits}</strong></div>
      <div><span>击倒守卫</span><strong>${data.guardsDefeated}</strong></div>
      <div><span>本关耗时</span><strong>${mm}:${ss}</strong></div>
      <div><span>关卡进度</span><strong>${clearedCnt}/4</strong></div>
      <div><span>奇物图鉴</span><strong>${game.meta.unlockedCurios.length}/${totalKinds}</strong></div>
    `;
  }

  function hideRunSummary() {
    const modal = document.getElementById('runModal');
    if (modal) modal.classList.add('hidden');
    lastCurioKey = '__reset__';
    lastStuntVal = 0;
  }


  // ==================== v5 飞艇母港整备 & 图标化双图鉴交互 ====================
  let activeHubTab = 'workshop';
  let selectedCodexCurioId = null;
  let onHubChangedCb = null;

  function setHubCallbacks(cbs = {}) {
    onHubChangedCb = cbs.onChanged || null;
  }

  function openHub(tab = 'workshop') {
    const modal = document.getElementById('hubModal');
    if (!modal) return;
    activeHubTab = tab || 'workshop';
    game.hubOpen = true;
    // 清空按住中的输入，防止弹窗后角色惯性走动或意外蓄力
    game.input.up = game.input.down = game.input.left = game.input.right = false;
    game.input.fireHeld = false;
    game.input.firePressed = false;
    game.input.fireReleased = false;
    game.input.interactHeld = false;
    game.player.charging = false;
    game.player.chargeTime = 0;
    game.player.chargeRatio = 0;

    modal.classList.remove('hidden');
    if (CB.audio && CB.audio.playUiClick) CB.audio.playUiClick();
    renderHubModal();
  }

  function closeHub() {
    const modal = document.getElementById('hubModal');
    if (!modal) return;
    modal.classList.add('hidden');
    game.hubOpen = false;
    if (onHubChangedCb) onHubChangedCb();
  }

  function switchHubTab(tab) {
    activeHubTab = tab;
    if (CB.audio && CB.audio.playUiClick) CB.audio.playUiClick();
    renderHubModal();
  }

  function drawSkinPreviewCanvas(canvas, skinId, locked) {
    if (!canvas || !CB.drawPlayer || !CB.drawPlayer.drawMochiPlayer) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const dummy = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      facing: 1,
      aimAngle: -0.15,
      invulnTimer: 0,
      inPollen: false,
      onDewSlide: false,
      squash: 0,
      tilt: 0,
      dashTimer: 0,
      hopHeight: 0,
      walkPhase: 0.4,
      keyAngle: 0.5,
      lagX: 0,
      lagY: 0,
      lootCount: 5,
      expr: locked ? 'normal' : 'happy',
      isBlinking: false,
      charging: false,
      chargeTime: 0,
      chargeRatio: 0,
      recoil: 0,
      scarfNodes: [
        { x: -6, y: -11 },
        { x: -13, y: -10 },
        { x: -19, y: -8 },
        { x: -24, y: -6 },
      ],
    };

    if (locked) {
      // 离屏 Canvas 柔和灰雾剪影蒙层替代 ctx.filter，100% 兼容 iOS WKWebView
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const octx = off.getContext('2d');
      octx.save();
      octx.translate(w / 2 + 2, h * 0.78);
      octx.scale(1.05, 1.05);
      CB.drawPlayer.drawMochiPlayer(octx, dummy, game.time || 0, skinId, 0, 0);
      octx.restore();
      octx.globalCompositeOperation = 'source-atop';
      octx.fillStyle = 'rgba(130, 158, 168, 0.62)';
      octx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.drawImage(off, 0, 0);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(w / 2 + 2, h * 0.78);
      ctx.scale(1.05, 1.05);
      CB.drawPlayer.drawMochiPlayer(ctx, dummy, game.time || 0, skinId, 0, 0);
      ctx.restore();
    }

    if (locked) {
      ctx.fillStyle = 'rgba(36, 69, 77, 0.85)';
      ctx.font = '700 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', w - 15, 15);
    }
  }

  function renderHubModal() {
    if (!CB.extraction) return;
    const {
      UPGRADE_DEFS,
      SKIN_DEFS,
      REGULAR_CURIOS,
      ALL_CURIOS,
      SUPPLY_COST,
      isSkinUnlocked,
      buyUpgrade,
      unlockOrSelectSkin,
      toggleLoadoutCurio,
    } = CB.extraction;

    const bankEl = document.getElementById('hubBankVal');
    if (bankEl) bankEl.textContent = `${game.meta.bankValue}`;

    const curioCntEl = document.getElementById('codexCurioCount');
    if (curioCntEl) curioCntEl.textContent = `${game.meta.unlockedCurios.length}/${ALL_CURIOS.length}`;

    const guardSpecs = (CB.guards && CB.guards.GUARD_SPECS) || {};
    const guardKeys = Object.keys(guardSpecs);
    const seenGuards = game.meta.seenGuards || [];
    const guardCntEl = document.getElementById('codexGuardCount');
    if (guardCntEl) guardCntEl.textContent = `${seenGuards.length}/${guardKeys.length}`;

    // Tab 高亮与面板显隐
    document.querySelectorAll('[data-hub-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.hubTab === activeHubTab);
    });
    const pWork = document.getElementById('hubPaneWorkshop');
    const pCur = document.getElementById('hubPaneCurios');
    const pGrd = document.getElementById('hubPaneGuards');
    if (pWork) pWork.classList.toggle('hidden', activeHubTab !== 'workshop');
    if (pCur) pCur.classList.toggle('hidden', activeHubTab !== 'curios');
    if (pGrd) pGrd.classList.toggle('hidden', activeHubTab !== 'guards');

    // 底部状态提示与启航按钮文案
    const statusEl = document.getElementById('hubStatusText');
    const btnLaunch = document.getElementById('btnHubLaunch');
    const armedCurio = game.meta.loadoutCurioId
      ? REGULAR_CURIOS.find((c) => c.id === game.meta.loadoutCurioId)
      : null;

    if (statusEl) {
      if (armedCurio) {
        statusEl.textContent = `📦 补给舱已装填：${armedCurio.icon} ${armedCurio.name}（下次全新启航自动携带）`;
      } else {
        statusEl.textContent = `🏛 母港累计撤离 ${game.meta.extractions} 次 · 历史最高单关估值 ${game.meta.bestHaul}`;
      }
    }
    if (btnLaunch) {
      btnLaunch.textContent = armedCurio
        ? `🎈 携 ${armedCurio.icon} 启航第 ${game.currentStageId} 关`
        : `🎈 启航第 ${game.currentStageId} 关`;
    }

    if (activeHubTab === 'workshop') {
      // 1. 发条工坊 4 项永久强化
      const upgGrid = document.getElementById('hubUpgradesGrid');
      if (upgGrid) {
        upgGrid.innerHTML = UPGRADE_DEFS.map((def) => {
          const lv = (game.meta.upgrades && game.meta.upgrades[def.id]) || 0;
          const isMax = lv >= def.maxLv;
          const cost = isMax ? 0 : def.costs[lv];
          const canAfford = !isMax && game.meta.bankValue >= cost;
          const pips = Array.from({ length: def.maxLv }, (_, idx) =>
            `<span class="upg-pip ${idx < lv ? 'filled' : ''}"></span>`
          ).join('');
          const curTxt = def.labels[lv] || '';
          const nextTxt = !isMax ? ` → ${def.labels[lv + 1]}` : ' · 已满级';
          const btnClass = isMax ? 'upg-btn is-max' : (canAfford ? 'upg-btn' : 'upg-btn cant-afford');
          const btnLabel = isMax ? '✓ MAX' : `🏛 ${cost}`;
          return `
            <div class="upg-card">
              <div class="upg-left">
                <div class="upg-icon" style="color:${def.color}">${def.icon}</div>
                <div class="upg-info">
                  <div class="upg-title-row">
                    <span class="upg-name">${def.name}</span>
                    <span class="upg-pips">${pips}</span>
                  </div>
                  <span class="upg-sub">${curTxt}${nextTxt}</span>
                </div>
              </div>
              <button class="${btnClass}" data-buy-upg="${def.id}" ${isMax ? 'disabled' : ''}>${btnLabel}</button>
            </div>
          `;
        }).join('');

        upgGrid.querySelectorAll('[data-buy-upg]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const res = buyUpgrade(btn.dataset.buyUpg);
            if (res.ok && onHubChangedCb) onHubChangedCb();
            renderHubModal();
          });
        });
      }

      // 2. 出发奇物补给舱（仅已解锁的常规奇物可装填）
      const supplyGrid = document.getElementById('hubSupplyGrid');
      const supplyHint = document.getElementById('hubSupplyHint');
      if (supplyHint) {
        supplyHint.textContent = armedCurio
          ? `已装填 ${armedCurio.icon} ${armedCurio.name} · 点击已装填奇物可全额退还 ${SUPPLY_COST} 🏛`
          : `选 1 件已解锁常规奇物装填 · ${SUPPLY_COST} 🏛（换装免费 / 取消全额退款）`;
      }
      if (supplyGrid) {
        const unlockedRegular = REGULAR_CURIOS.filter((c) => game.meta.unlockedCurios.includes(c.id));
        if (unlockedRegular.length === 0) {
          supplyGrid.innerHTML = '<span class="supply-empty">尚未收录常规奇物 · 局内启封秘境花匣拾取后即可在此出发装填！</span>';
        } else {
          supplyGrid.innerHTML = unlockedRegular.map((c) => {
            const isArmed = game.meta.loadoutCurioId === c.id;
            return `
              <button class="supply-chip ${isArmed ? 'armed' : ''}" data-supply-id="${c.id}" title="${c.name}：${c.perk}">
                <span>${c.icon}</span>
                <span>${c.name}</span>
                <small>${isArmed ? '✓ 下局携带' : c.shortPerk}</small>
              </button>
            `;
          }).join('');

          supplyGrid.querySelectorAll('[data-supply-id]').forEach((btn) => {
            btn.addEventListener('click', () => {
              const res = toggleLoadoutCurio(btn.dataset.supplyId);
              if (res.ok && onHubChangedCb) onHubChangedCb();
              renderHubModal();
            });
          });
        }
      }

      // 3. 探险家外观衣橱（附实时 Canvas 手绘角色预览）
      const skinsGrid = document.getElementById('hubSkinsGrid');
      if (skinsGrid) {
        skinsGrid.innerHTML = SKIN_DEFS.map((sk) => {
          const unlocked = isSkinUnlocked(sk.id);
          const equipped = game.variant === sk.id;
          const canBuy = !unlocked && game.meta.bankValue >= sk.cost;
          const btnClass = equipped
            ? 'skin-action-btn is-equipped'
            : unlocked
            ? 'skin-action-btn'
            : canBuy
            ? 'skin-action-btn buy-skin'
            : 'skin-action-btn cant-afford';
          const btnText = equipped
            ? '✓ 使用中'
            : unlocked
            ? '切换外观'
            : `🏛 ${sk.cost} 解锁`;
          return `
            <div class="skin-card ${equipped ? 'equipped' : ''} ${unlocked ? '' : 'locked'}">
              <canvas class="skin-canvas" data-skin-canvas="${sk.id}" width="84" height="72"></canvas>
              <div class="skin-name">${sk.code} · ${sk.name}</div>
              <div class="skin-desc">${unlocked ? sk.desc : sk.badge}</div>
              <button class="${btnClass}" data-skin-btn="${sk.id}" ${equipped ? 'disabled' : ''}>${btnText}</button>
            </div>
          `;
        }).join('');

        skinsGrid.querySelectorAll('[data-skin-canvas]').forEach((cv) => {
          const id = cv.dataset.skinCanvas;
          drawSkinPreviewCanvas(cv, id, !isSkinUnlocked(id));
        });

        skinsGrid.querySelectorAll('[data-skin-btn]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const res = unlockOrSelectSkin(btn.dataset.skinBtn);
            if (res.ok && onHubChangedCb) onHubChangedCb();
            renderHubModal();
          });
        });
      }
    } else if (activeHubTab === 'curios') {
      // 图标化奇物图鉴（14 件）
      const grid = document.getElementById('codexCurioGrid');
      const detail = document.getElementById('codexCurioDetail');
      if (grid) {
        grid.innerHTML = ALL_CURIOS.map((c) => {
          const unlocked = game.meta.unlockedCurios.includes(c.id);
          const isSel = selectedCodexCurioId === c.id;
          const rarCls = `rarity-${c.rarity}`;
          return `
            <div class="codex-curio-card ${rarCls} ${unlocked ? '' : 'locked'} ${isSel ? 'selected' : ''}" data-codex-curio="${c.id}">
              <div class="codex-curio-icon">${unlocked ? c.icon : '❓'}</div>
              <div class="codex-curio-name">${unlocked ? c.name : '未收录奇物'}</div>
              <div class="codex-curio-tag">${unlocked ? (c.shortPerk || ('+' + c.value)) : (c.rarity === 'legendary' ? '☀ 金库神匣' : '秘境花匣')}</div>
            </div>
          `;
        }).join('');

        const showDetail = (id) => {
          selectedCodexCurioId = id;
          const c = ALL_CURIOS.find((item) => item.id === id);
          if (!detail || !c) return;
          const unlocked = game.meta.unlockedCurios.includes(id);
          if (unlocked) {
            const tier = c.rarity === 'legendary' ? '☀ 传说大金' : c.rarity === 'epic' ? '✦ 史诗构筑' : '◆ 稀有构筑';
            detail.innerHTML = `<strong>${c.icon} ${c.name}</strong>（${tier} · 基础估值 <strong>${c.value} 💎</strong>）<br/>${c.perk}`;
          } else {
            detail.innerHTML = `<strong>❓ 尚未收录</strong><br/>前往浮岛开启${c.rarity === 'legendary' ? '「☀ 太阳花穹金库神匣」' : '「秘境花匣」'}并拾取即可解锁此奇物图鉴！`;
          }
          grid.querySelectorAll('[data-codex-curio]').forEach((el) => {
            el.classList.toggle('selected', el.dataset.codexCurio === id);
          });
        };

        grid.querySelectorAll('[data-codex-curio]').forEach((el) => {
          el.addEventListener('click', () => {
            if (CB.audio && CB.audio.playUiClick) CB.audio.playUiClick();
            showDetail(el.dataset.codexCurio);
          });
          el.addEventListener('mouseenter', () => showDetail(el.dataset.codexCurio));
        });

        const firstUnlocked = ALL_CURIOS.find((c) => game.meta.unlockedCurios.includes(c.id));
        if (selectedCodexCurioId) showDetail(selectedCodexCurioId);
        else if (firstUnlocked) showDetail(firstUnlocked.id);
      }
    } else if (activeHubTab === 'guards') {
      // 图标化守卫图鉴（7 种 + 实时迷你画布肖像 + 极简破防徽章）
      const grid = document.getElementById('codexGuardGrid');
      if (grid) {
        const defeatedMap = game.meta.defeatedGuards || {};
        grid.innerHTML = guardKeys.map((kind) => {
          const spec = guardSpecs[kind];
          const seen = seenGuards.includes(kind);
          const kills = defeatedMap[kind] || 0;
          return `
            <div class="codex-guard-card ${spec.isElite ? 'is-elite' : ''} ${seen ? '' : 'locked'}">
              <canvas class="guard-portrait-canvas" data-guard-canvas="${kind}" width="76" height="76"></canvas>
              <div class="guard-codex-info">
                <div class="guard-codex-top">
                  <span class="guard-codex-name">${seen ? spec.name : '未知浮岛守卫'}</span>
                  <span class="guard-codex-kills">${seen ? `击破 ×${kills}` : '未遭遇'}</span>
                </div>
                <div class="guard-codex-stage">${spec.stageTag || ''} ${seen ? `· ♥${spec.hp}` : ''}</div>
                <div class="guard-badge-row">
                  <span class="g-badge g-badge-trait">${seen ? (spec.traitBadge || '⚙ 浮岛守卫') : '❓ 未知特性'}</span>
                  <span class="g-badge g-badge-counter">${seen ? (spec.counterBadge || '🎱 物理破防') : '探索遭遇解锁'}</span>
                </div>
                <div class="guard-codex-tip">${seen ? (spec.tip || '') : '进入对应关卡房间或交锋后即可解锁完整破防档案。'}</div>
              </div>
            </div>
          `;
        }).join('');

        grid.querySelectorAll('[data-guard-canvas]').forEach((cv) => {
          const kind = cv.dataset.guardCanvas;
          const seen = seenGuards.includes(kind);
          if (CB.guards && CB.guards.drawGuardPortrait) {
            CB.guards.drawGuardPortrait(cv.getContext('2d'), kind, cv.width, game.time || 0, !seen);
          }
        });
      }
    }
  }


  // ==================== v7 动态标题页数据刷新 & 移动端触控反馈 ====================
  function updateTitleCard() {
    const st = CB.stages ? CB.stages.getStage(game.currentStageId) : null;
    const tagEl = document.getElementById('titleTagline');
    const bankEl = document.getElementById('titleBankVal');
    const clearEl = document.getElementById('titleClearVal');
    const curioEl = document.getElementById('titleCurioVal');
    const guardEl = document.getElementById('titleGuardVal');
    const loadoutEl = document.getElementById('titleLoadoutBanner');
    const startBtn = document.getElementById('btnTitleStart');
    const audioBtn = document.getElementById('btnTitleAudio');

    if (tagEl && st) {
      tagEl.textContent = `第 ${st.id} 关 · ${st.name} · ${st.tagline}`;
    }
    if (bankEl) bankEl.textContent = `${game.meta.bankValue || 0}`;
    if (clearEl) clearEl.textContent = `${(game.meta.clearedStages || []).length}/4`;

    const totalCurios = CB.extraction ? CB.extraction.ALL_CURIOS.length : 14;
    if (curioEl) curioEl.textContent = `${(game.meta.unlockedCurios || []).length}/${totalCurios}`;

    const totalGuards = CB.guards && CB.guards.GUARD_SPECS ? Object.keys(CB.guards.GUARD_SPECS).length : 10;
    if (guardEl) guardEl.textContent = `${(game.meta.seenGuards || []).length}/${totalGuards}`;

    const armed =
      game.meta.loadoutCurioId && CB.extraction && CB.extraction.REGULAR_CURIOS
        ? CB.extraction.REGULAR_CURIOS.find((c) => c.id === game.meta.loadoutCurioId)
        : null;
    if (loadoutEl) {
      if (armed) {
        loadoutEl.textContent = `📦 补给舱已装填：${armed.icon} ${armed.name}（启航自动携带）`;
        loadoutEl.classList.remove('hidden');
      } else {
        loadoutEl.classList.add('hidden');
      }
    }

    if (startBtn && st) {
      const hasProgress = (game.meta.runs || 0) > 0 || (game.meta.bankValue || 0) > 0;
      startBtn.textContent = armed
        ? `🎈 携 ${armed.icon} 启航 · 第 ${st.id} 关`
        : hasProgress
        ? `🎈 继续远征 · 第 ${st.id} 关`
        : `🎈 开始冒险 · 第 ${st.id} 关`;
    }
    const titleHubBadge = document.getElementById('titleHubBadge');
    if (titleHubBadge && CB.extraction && CB.extraction.canAffordAnyUpgrade) {
      titleHubBadge.classList.toggle('hidden', !CB.extraction.canAffordAnyUpgrade());
    }
    if (audioBtn) {
      audioBtn.textContent = game.audioMuted ? '🔇' : '🔊';
    }
    const ctrlMiniEl = document.getElementById('titleControlsMini');
    if (ctrlMiniEl) {
      ctrlMiniEl.textContent = game.platform === 'mobile'
        ? '左手浮空移动 · 右摇杆点射 / 拖拽蓄力（滑入 ✕ 取消）· 右侧冲刺与智能交互'
        : 'WASD 移动 · 左键轻点静音 / 按住蓄力重弹 · 空格冲刺 · E 交互与热气球升空';
    }

    const cleared = game.meta.clearedStages || [];
    document.querySelectorAll('[data-title-stage]').forEach((btn) => {
      const sid = Number(btn.dataset.titleStage);
      const stItem = CB.stages ? CB.stages.getStage(sid) : null;
      const isCleared = cleared.includes(sid);
      btn.classList.toggle('active', sid === game.currentStageId);
      btn.classList.toggle('cleared', isCleared);
      if (stItem) btn.textContent = isCleared ? `✓ ${stItem.shortName}` : stItem.shortName;
    });
  }

  function updateTouchHud(els) {
    if (!els) return;
    const p = game.player;
    const hint = game.interactHint;

    if (els.aimZone) {
      const canceling = !!game.input.aimCancelHover;
      const isHeavy = !canceling && !!(p.charging && p.chargeTime >= (p.effectiveTapThreshold || 0.20));
      const isFull = !canceling && !!(p.charging && p.chargeRatio >= 0.95);
      els.aimZone.classList.toggle('charging-heavy', isHeavy && !isFull);
      els.aimZone.classList.toggle('charging-full', isFull);
      if (els.aimLabel) {
        els.aimLabel.textContent = canceling
          ? '✕ 松手取消发射'
          : isFull
          ? '✦ 满蓄重弹!'
          : isHeavy
          ? '⚡ 蓄力重弹'
          : '点射 / 拖拽蓄力';
      }
    }

    if (els.interactBtn) {
      const hasHint = !!hint;
      els.interactBtn.classList.toggle('hint-active', hasHint);
      if (els.interactIcon) {
        els.interactIcon.textContent = hasHint ? (hint.key || 'E') : 'E';
      }
      if (els.interactLabel) {
        els.interactLabel.textContent = hasHint
          ? (hint.text.includes('热气球') ? '升空' : hint.text.includes('神匣') || hint.text.includes('花匣') ? '开匣' : '机关')
          : '交互';
      }
    }
  }

  CB.ui = {
    renderMinimap,
    updateStatsBanner,
    updateCombatHud,
    showRunSummary,
    hideRunSummary,
    setHubCallbacks,
    openHub,
    closeHub,
    switchHubTab,
    renderHubModal,
    updateTitleCard,
    updateTouchHud,
  };
})();
