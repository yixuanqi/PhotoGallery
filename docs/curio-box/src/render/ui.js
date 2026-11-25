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
    frost_snail: '#76e0ff',
    prism_weaver: '#ffd84d',
    volt_automaton: '#ff944d',
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

    if (!map._miniBounds) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const c of map.cells.values()) {
        if (c.gx < minX) minX = c.gx;
        if (c.gy < minY) minY = c.gy;
        if (c.gx + 1 > maxX) maxX = c.gx + 1;
        if (c.gy + 1 > maxY) maxY = c.gy + 1;
      }
      map._miniBounds = { minGx: minX, minGy: minY, maxGx: maxX, maxGy: maxY };
    }
    const { minGx, minGy, maxGx, maxGy } = map._miniBounds;

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

  let lastOrbRenderKey = '';

  function updateStatsBanner(el) {
    const m = game.map;
    if (!m || !el) return;
    const st = m.stage || (CB.stages ? CB.stages.getStage(game.currentStageId) : null);
    const leg = (st && st.leg) || (game.voyage && game.voyage.leg) || 1;
    const alt = (st && st.altitude) || (game.voyage && game.voyage.altitude) || 1200;
    const multTxt = st && st.haulMult > 1 ? ` · ×${st.haulMult}` : '';
    el.textContent = st
      ? `第 ${leg} 航段 · ${alt}m${multTxt}`
      : `云岛 #${m.seed}`;

    const dTitle = document.getElementById('drawerSectorTitle');
    const dOmen = document.getElementById('drawerSectorOmen');
    if (dTitle && st) dTitle.textContent = `第 ${leg} 航段 · 海拔 ${alt}m`;
    if (dOmen && st) {
      const mutTxt = st.mutatorObjs && st.mutatorObjs.length > 0
        ? ' · ' + st.mutatorObjs.map((mu) => mu.short).join(' / ')
        : '';
      dOmen.textContent = `${st.omenIcons || '☁'} ${st.name}${mutTxt}`;
    }
  }

  function updateCombatHud(els) {
    const p = game.player;
    const run = game.run;
    const ex = run.extraction;

    if (els.hpFill) els.hpFill.style.width = `${Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100))}%`;
    if (els.hpText) els.hpText.textContent = `${Math.ceil(p.hp)}`;

    if (els.orbTray) {
      const maxOrbs = p.maxOrbs || 3;
      const curOrbs = Math.max(0, p.orbs || 0);
      const rechPct = curOrbs < maxOrbs
        ? Math.round(Math.max(0, Math.min(1, (p.orbRechargeTimer || 0) / (p.orbRechargeDuration || 4.2))) * 20) * 5
        : 0;
      const emptyFlag = (p.orbEmptyFlash || 0) > 0.15 ? 1 : 0;
      const ocFlag = p.overclockOrb ? 1 : 0;
      const orbKey = `${curOrbs}|${maxOrbs}|${rechPct}|${emptyFlag}|${ocFlag}`;
      if (orbKey !== lastOrbRenderKey) {
        lastOrbRenderKey = orbKey;
        let htmlOrbs = '';
        for (let i = 0; i < maxOrbs; i++) {
          if (i < curOrbs) {
            htmlOrbs += '<span class="orb-pip filled"></span>';
          } else if (i === curOrbs) {
            htmlOrbs += `<span class="orb-pip recharging ${emptyFlag ? 'empty-flash' : ''}"><span class="orb-fill-inner" style="height:${rechPct}%"></span></span>`;
          } else {
            htmlOrbs += `<span class="orb-pip ${emptyFlag ? 'empty-flash' : ''}"></span>`;
          }
        }
        if (ocFlag) {
          htmlOrbs += '<span class="orb-overclock-chip" title="超频金珠：下次重弹蓄力减半 + 击退 +30%">✦</span>';
        }
        els.orbTray.innerHTML = htmlOrbs;
      }
    }

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
      } else if (run.nodeType === 'trial') {
        const shots = run.trialHeavyShots || 0;
        const leftG = game.guards.length;
        const perfTxt = shots <= 2 ? `完美余弹 ${Math.max(0, 2 - shots)} 发` : '常规清场';
        els.objEl.textContent = `🎯 试炼靶场 · 剩余 ${leftG} 目标 · ${perfTxt}（≤2重弹赠传说大金）`;
        els.objEl.classList.add('obj-extract');
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
          const mutStr = st && st.mutatorObjs && st.mutatorObjs.length > 0
            ? ' · ' + st.mutatorObjs.map((mu) => mu.short).join(' ')
            : '';
          els.objEl.textContent = st
            ? `第 ${st.leg || 1} 航段 · ${st.omenIcons || '☁'} ${st.name}${mutStr} · 搜寻 ☀ 金库`
            : '☁ 探索未知空域 · 搜寻 ☀ 太阳花穹金库';
        }
      }
    }

    if (els.curioTray) {
      const key = p.curios.map((c) => c.id).join(',');
      if (key !== lastCurioKey) {
        lastCurioKey = key;
        if (p.curios.length === 0) {
          els.curioTray.innerHTML = '<span class="curio-empty">奇物篮空 · 集齐 2 件同学科奇物激活共鸣</span>';
        } else {
          const activeSyns = CB.extraction && CB.extraction.getActiveSynergies ? CB.extraction.getActiveSynergies() : [];
          const synDefs = (CB.extraction && CB.extraction.SYNERGY_DEFS) || {};
          const synHtml = activeSyns
            .map(
              (s) =>
                `<span class="synergy-chip syn-${s.id}" title="✨ ${s.name}（已激活）：${s.perk}">${s.short}</span>`
            )
            .join('');
          const curHtml = p.curios
            .map((c) => {
              const sd = c.discipline ? synDefs[c.discipline] : null;
              const discTxt = sd ? ` · ${sd.icon}${sd.name}` : '';
              return `<span class="curio-chip ${c.rarity === 'legendary' ? 'curio-grand' : ''}" title="${c.name}（估值 ${c.value}${discTxt}）：${c.perk}">${c.icon}<small>${c.shortPerk || c.value}</small></span>`;
            })
            .join('');
          els.curioTray.innerHTML = synHtml + curHtml;
        }
      }
    }
  }

  function showRunSummary(data) {
    const modal = document.getElementById('runModal');
    if (!modal) return;
    const isWin = data.outcome === 'extracted';
    const leg = data.leg || 1;
    const alt = data.altitude || 1200;

    const stampEl = document.getElementById('summaryStamp');
    const titleEl = document.getElementById('summaryTitle');
    const subEl = document.getElementById('summarySub');
    const haulLabelEl = document.getElementById('summaryHaulLabel');
    const bankLabelEl = document.getElementById('summaryBankLabel');
    const haulEl = document.getElementById('summaryHaul');
    const bankEl = document.getElementById('summaryBank');
    const curiosEl = document.getElementById('summaryCurios');
    const statsEl = document.getElementById('summaryStats');
    const btnNext = document.getElementById('btnNextRun');
    const btnBankReturn = document.getElementById('btnBankReturn');
    const btnRetry = document.getElementById('btnRetrySeed');

    modal.classList.remove('hidden', 'modal-win', 'modal-fail');
    modal.classList.add(isWin ? 'modal-win' : 'modal-fail');

    stampEl.textContent = isWin ? data.grade : 'FAIL';
    const dailyGold = data.dailyRewardGold || 0;
    const dailyNote = dailyGold > 0 ? ` · 📅 每日悬赏入库 +${dailyGold} 🏛!` : '';
    const stuntNote = (data.stuntBounty > 0 ? `（含 ✨ 特技赏金 +${data.stuntBounty}）` : '') + dailyNote;

    if (isWin) {
      if (data.nodeType === 'trial') {
        titleEl.textContent = data.trialPerfect
          ? `🎯 第 ${leg} 航段 · 一杆完美清台！`
          : `🎯 第 ${leg} 航段 · 试炼靶场通关！`;
        subEl.textContent = data.trialPerfect
          ? `仅用 ${data.trialHeavyShots || 0} 发重弹全清目标，额外颁赠传说大金奇物${stuntNote}！`
          : `共消耗 ${data.trialHeavyShots || 0} 发重弹清空试炼场${stuntNote}，可继续深入未知云海`;
      } else if (data.nodeType === 'boss') {
        titleEl.textContent = `👑 第 ${leg} 航段霸主空域凯旋！`;
        subEl.textContent = `${data.omenIcons || '👑'} ${data.stageName} · 霸主秘宝已暂存货舱${stuntNote}，可展开航图冲向更深空域或见好就收入库`;
      } else {
        titleEl.textContent = `第 ${leg} 航段（${alt}m）撤离成功！`;
        subEl.textContent = `${data.omenIcons || '☁'} ${data.stageName} · 战利品已暂存飞艇货舱${stuntNote}，可展开航图深入深空或立即返航入库`;
      }
    } else {
      titleEl.textContent = `第 ${leg} 航段（${alt}m）发条停摆`;
      subEl.textContent = data.salvagedHaul > 0
        ? `紧急打捞回 ${data.salvagedHaul} 💎 入库，母港原有金库资产安全保留`
        : `本航段未入库战利品散落在云海中，母港金库资产安全保留`;
    }

    if (haulLabelEl) haulLabelEl.textContent = isWin ? '本航段估值' : '散落战利品估值';
    if (bankLabelEl) bankLabelEl.textContent = isWin ? '本趟货舱暂存（未入库）' : '飞艇母港金库资产';
    haulEl.textContent = isWin ? `+${data.totalHaul}` : `-${data.lostPending || data.totalHaul}`;
    bankEl.textContent = isWin ? `${data.pendingHaul || data.totalHaul}` : `${game.meta.bankValue}`;

    if (btnNext) {
      btnNext.textContent = isWin
        ? '🧭 展开云海航图 · 深入未知空域 (Enter)'
        : '🎈 开启新一趟云海航程 (Enter / R)';
    }
    if (btnBankReturn) {
      btnBankReturn.classList.toggle('hidden', !isWin);
      if (isWin) {
        btnBankReturn.textContent = `⚓ 返航入库 (+${data.pendingHaul || data.totalHaul} 🏛)`;
      }
    }
    if (btnRetry) {
      btnRetry.classList.toggle('hidden', isWin);
      btnRetry.textContent = '⚓ 飞艇母港整备 (H)';
    }

    if (data.curios.length === 0) {
      curiosEl.innerHTML = '<span class="summary-empty">本航段未拾取奇物（启封秘境花匣或太阳花神匣即可获取物理构筑词条）</span>';
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
    statsEl.innerHTML = `
      <div><span>✨ 特技赏金</span><strong>+${data.stuntBounty || 0}</strong></div>
      <div><span>☁ 崖边击落</span><strong>${data.cliffDrops || 0}</strong></div>
      <div><span>🎱 怪物连撞</span><strong>${data.monsterChains || 0}</strong></div>
      <div><span>📦 木箱台球</span><strong>${data.billiardHits || 0}</strong></div>
      <div><span>🪐 星轨/折射</span><strong>${data.slingshotCrits || 0}/${data.ricochetCrits}</strong></div>
      <div><span>击倒守卫</span><strong>${data.guardsDefeated}</strong></div>
      <div><span>航段耗时</span><strong>${mm}:${ss}</strong></div>
      <div><span>空域深度</span><strong>${alt}m</strong></div>
      <div><span>奇物收录</span><strong>${game.meta.unlockedCurios.length} 件</strong></div>
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
    if (curioCntEl) curioCntEl.textContent = `已收录 ${game.meta.unlockedCurios.length}`;

    const guardSpecs = (CB.guards && CB.guards.GUARD_SPECS) || {};
    const guardKeys = Object.keys(guardSpecs);
    const seenGuards = game.meta.seenGuards || [];
    const guardCntEl = document.getElementById('codexGuardCount');
    if (guardCntEl) guardCntEl.textContent = `已遭遇 ${seenGuards.length}`;

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
        statusEl.textContent = `🏛 累计撤离 ${game.meta.extractions} 次 · 最深纪录 ${game.meta.deepestLeg ? '第 ' + game.meta.deepestLeg + ' 航段 (' + game.meta.maxAltitude + 'm)' : '尚未启航'}`;
      }
    }
    if (btnLaunch) {
      btnLaunch.textContent = armedCurio
        ? `🎈 携 ${armedCurio.icon} 启航云海`
        : '🎈 启航云海';
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
        const unlockedCuriosList = ALL_CURIOS.filter((c) => game.meta.unlockedCurios.includes(c.id));
        const lockedCuriosList = ALL_CURIOS.filter((c) => !game.meta.unlockedCurios.includes(c.id));
        const visibleCurios = [...unlockedCuriosList, ...lockedCuriosList.slice(0, 3)];

        grid.innerHTML = visibleCurios.map((c) => {
          const unlocked = game.meta.unlockedCurios.includes(c.id);
          const isSel = selectedCodexCurioId === c.id;
          const rarCls = unlocked ? `rarity-${c.rarity}` : '';
          return `
            <div class="codex-curio-card ${rarCls} ${unlocked ? '' : 'locked'} ${isSel ? 'selected' : ''}" data-codex-curio="${c.id}">
              <div class="codex-curio-icon">${unlocked ? c.icon : '❓'}</div>
              <div class="codex-curio-name">${unlocked ? c.name : '云海未知奇物'}</div>
              <div class="codex-curio-tag">${unlocked ? (c.shortPerk || ('+' + c.value)) : '深空花匣探索'}</div>
            </div>
          `;
        }).join('') + (lockedCuriosList.length > 3 ? '<div class="codex-mystery-note">☁ 更深处的云海空域尚藏有更多未知物理奇物……</div>' : '');

        const showDetail = (id) => {
          selectedCodexCurioId = id;
          const c = ALL_CURIOS.find((item) => item.id === id);
          if (!detail || !c) return;
          const unlocked = game.meta.unlockedCurios.includes(id);
          if (unlocked) {
            const tier = c.rarity === 'legendary' ? '☀ 传说大金' : c.rarity === 'epic' ? '✦ 史诗构筑' : '◆ 稀有构筑';
            const sd = c.discipline && CB.extraction && CB.extraction.SYNERGY_DEFS ? CB.extraction.SYNERGY_DEFS[c.discipline] : null;
            const synNote = sd ? `<br/><span class="codex-disc-badge">${sd.icon} ${sd.name} (2件质变)</span> ${sd.perk}` : '';
            detail.innerHTML = `<strong>${c.icon} ${c.name}</strong>（${tier} · 基础估值 <strong>${c.value} 💎</strong>）<br/>${c.perk}${synNote}`;
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
        const seenList = guardKeys.filter((k) => seenGuards.includes(k));
        const unseenList = guardKeys.filter((k) => !seenGuards.includes(k));
        const visibleGuards = [...seenList, ...unseenList.slice(0, 2)];

        grid.innerHTML = visibleGuards.map((kind) => {
          const spec = guardSpecs[kind];
          const seen = seenGuards.includes(kind);
          const kills = defeatedMap[kind] || 0;
          const cleanTag = (spec.stageTag || '').replace(/第\s*\d+\s*关\s*·\s*/g, '');
          return `
            <div class="codex-guard-card ${spec.isElite && seen ? 'is-elite' : ''} ${seen ? '' : 'locked'}">
              <canvas class="guard-portrait-canvas" data-guard-canvas="${kind}" width="76" height="76"></canvas>
              <div class="guard-codex-info">
                <div class="guard-codex-top">
                  <span class="guard-codex-name">${seen ? spec.name : '未知空域守卫'}</span>
                  <span class="guard-codex-kills">${seen ? `击破 ×${kills}` : '未遭遇'}</span>
                </div>
                <div class="guard-codex-stage">${seen ? `${cleanTag} · ♥${spec.hp}` : '未知海拔云域'}</div>
                <div class="guard-badge-row">
                  <span class="g-badge g-badge-trait">${seen ? (spec.traitBadge || '⚙ 浮岛守卫') : '❓ 未知特性'}</span>
                  <span class="g-badge g-badge-counter">${seen ? (spec.counterBadge || '🎱 物理破防') : '深入空域解锁'}</span>
                </div>
                <div class="guard-codex-tip">${seen ? (spec.tip || '') : '深入更高海拔的云海空域遭遇交锋后，即可记录完整破防档案。'}</div>
              </div>
            </div>
          `;
        }).join('') + (unseenList.length > 2 ? '<div class="codex-mystery-note">☁ 更深处的未知空域仍有未曾谋面的机械守卫游弋……</div>' : '');

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
    const tagEl = document.getElementById('titleTagline');
    const bankEl = document.getElementById('titleBankVal');
    const clearEl = document.getElementById('titleClearVal');
    const curioEl = document.getElementById('titleCurioVal');
    const guardEl = document.getElementById('titleGuardVal');
    const loadoutEl = document.getElementById('titleLoadoutBanner');
    const startBtn = document.getElementById('btnTitleStart');
    const audioBtn = document.getElementById('btnTitleAudio');
    const voyageBadge = document.getElementById('titleVoyageBadge');

    const deepest = game.meta.deepestLeg || 0;
    const maxAlt = game.meta.maxAltitude || 0;
    if (tagEl) tagEl.textContent = '驶入未知云海 · 以物理法则破阵、夺宝、乘风撤离';
    if (bankEl) bankEl.textContent = `${game.meta.bankValue || 0}`;
    if (clearEl) clearEl.textContent = deepest > 0 ? `第 ${deepest} 航段 (${maxAlt}m)` : '未启航';
    if (curioEl) curioEl.textContent = `${(game.meta.unlockedCurios || []).length}`;
    if (guardEl) guardEl.textContent = `${(game.meta.seenGuards || []).length}`;

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

    if (voyageBadge) {
      voyageBadge.textContent = deepest > 0
        ? `🧭 历史最深航迹：第 ${deepest} 航段 · 海拔 ${maxAlt}m · 云海深处仍有未知法则等待发掘`
        : '🧭 3 颗星露弹珠物理循环 · 滑道台球 / 星轨弯道 / 崖边秒杀瞬回弹珠';
    }

    if (startBtn) {
      const hasProgress = (game.meta.runs || 0) > 0 || (game.meta.bankValue || 0) > 0;
      startBtn.textContent = armed
        ? `🎈 携 ${armed.icon} 启航云海`
        : hasProgress
        ? '🎈 再次启航云海'
        : '🎈 启航探索云海';
    }
    const titleHubBadge = document.getElementById('titleHubBadge');
    if (titleHubBadge && CB.extraction && CB.extraction.canAffordAnyUpgrade) {
      titleHubBadge.classList.toggle('hidden', !CB.extraction.canAffordAnyUpgrade());
    }
    const titleDailyBadge = document.getElementById('titleDailyBadge');
    if (titleDailyBadge && CB.extraction && CB.extraction.getDailyChallengeSpec) {
      const dSpec = CB.extraction.getDailyChallengeSpec();
      titleDailyBadge.classList.toggle('hidden', dSpec.unclaimedCount <= 0);
    }
    if (audioBtn) audioBtn.textContent = game.audioMuted ? '🔇' : '🔊';
    const ctrlMiniEl = document.getElementById('titleControlsMini');
    if (ctrlMiniEl) {
      ctrlMiniEl.textContent = game.platform === 'mobile'
        ? '左手浮空移动 · 右摇杆轻点星针 / 拖拽蓄力重弹（滑入 ✕ 取消）· 右侧冲刺与智能交互'
        : 'WASD 移动 · 左键轻点调频星针 / 按住蓄力重弹（3 颗星露珠）· 空格冲刺 · E 交互';
    }
  }

  function openChartModal(onSelectNode, onBankReturn) {
    const modal = document.getElementById('chartModal');
    if (!modal) return;
    hideRunSummary();
    game.chartOpen = true;
    modal.classList.remove('hidden');

    const v = game.voyage;
    const nextLeg = (v.leg || 1) + 1;
    const nextChainMult = Number((1.0 + (nextLeg - 1) * 0.25).toFixed(2));
    const choices = (v.nextChoices && v.nextChoices.length > 0)
      ? v.nextChoices
      : (CB.stages ? CB.stages.generateNextChoices(nextLeg, v.currentNode) : []);
    v.nextChoices = choices;

    const titleEl = document.getElementById('chartTitle');
    const altEl = document.getElementById('chartAltVal');
    const pendEl = document.getElementById('chartPendingVal');
    const chainEl = document.getElementById('chartChainVal');
    const riskEl = document.getElementById('chartRiskNote');
    const grid = document.getElementById('chartNodesGrid');
    const btnBank = document.getElementById('btnChartBank');
    const btnReroll = document.getElementById('btnChartReroll');

    const metaB = CB.extraction && CB.extraction.getMetaBonuses ? CB.extraction.getMetaBonuses() : null;
    const salvPct = Math.round(((metaB && metaB.salvageRatio) || 0.20) * 100);
    if (riskEl) {
      riskEl.textContent = `⚠ 若在深空失利，云海打捞保险舱将紧急打捞 ${salvPct}% 未入库暂存战利品`;
    }

    if (titleEl) titleEl.textContent = `第 ${nextLeg} 航段 · 罗盘侦测到 ${choices.length} 条未知云海航线`;
    if (altEl) altEl.textContent = `${v.altitude || 1200}m`;
    if (pendEl) pendEl.textContent = `${v.pendingHaul || 0} 💎`;
    if (chainEl) chainEl.textContent = `×${nextChainMult}`;

    if (btnReroll) {
      const hasScope = (metaB && metaB.chartRerolls > 0) || (v.rerollsLeft || 0) > 0;
      const left = v.rerollsLeft || 0;
      btnReroll.classList.toggle('hidden', !hasScope);
      btnReroll.disabled = left <= 0;
      btnReroll.textContent = `🔭 重抽航线 (${left})`;
      btnReroll.onclick = () => {
        if ((v.rerollsLeft || 0) <= 0) return;
        v.rerollsLeft -= 1;
        v.nextChoices = CB.stages ? CB.stages.generateNextChoices(nextLeg, v.currentNode) : [];
        if (CB.audio && CB.audio.playChartSelect) CB.audio.playChartSelect();
        openChartModal(onSelectNode, onBankReturn);
      };
    }

    if (btnBank) {
      btnBank.textContent = `⚓ 见好就收 · 返航入库 (+${v.pendingHaul || 0} 🏛)`;
      btnBank.onclick = () => {
        closeChartModal();
        if (onBankReturn) onBankReturn();
      };
    }

    if (grid) {
      grid.innerHTML = choices.map((node, idx) => {
        const isBoss = node.nodeType === 'boss';
        const isTrial = node.nodeType === 'trial';
        const isMarket = node.nodeType === 'market';
        const isApex = !isBoss && !isTrial && !isMarket && node.anomalies && node.anomalies.length >= 3;
        const isMulti = !isBoss && !isTrial && !isMarket && !isApex && node.anomalies && node.anomalies.length >= 2;
        const cls = isBoss ? 'is-boss' : isTrial ? 'is-trial' : isMarket ? 'is-market' : isApex ? 'is-apex' : isMulti ? 'is-multi' : '';
        const effMult = (node.haulMult * nextChainMult).toFixed(2);
        const mutDefs = CB.stages && CB.stages.MUTATORS ? CB.stages.MUTATORS : {};
        const mutTags = Array.isArray(node.mutators)
          ? node.mutators
              .map((mid) => mutDefs[mid])
              .filter(Boolean)
              .map((m) => `<span class="cn-badge cn-mut" title="${m.desc}">${m.short}</span>`)
              .join('')
          : '';
        const altTag = isBoss
          ? `👑 海拔 ${node.altitude}m · 阶段霸主`
          : isTrial
          ? `🎯 海拔 ${node.altitude}m · 单房谜题`
          : isMarket
          ? `⚖️ 海拔 ${node.altitude}m · 零战斗黑市`
          : `▲ 海拔 ${node.altitude}m · 未知空域`;
        const multBadge = isMarket
          ? '<span class="cn-badge cn-mult">购奇物 · 熔传说</span>'
          : `<span class="cn-badge cn-mult">估值 ×${effMult}</span>`;
        return `
          <button class="chart-node-card ${cls}" data-chart-idx="${idx}">
            <span class="chart-node-alt">${altTag}</span>
            <div class="chart-node-icons">${node.omenIcons || '☁'}</div>
            <div class="chart-node-title">${node.omenTitle || '未知异常征兆'}</div>
            <div class="chart-node-cue">${node.omenCue || '罗盘仅捕获到微弱物理波动'}</div>
            <div class="chart-node-badges">
              <span class="cn-badge cn-danger">${node.dangerLabel || '未知空域'}</span>
              ${multBadge}
              ${mutTags}
            </div>
          </button>
        `;
      }).join('');

      grid.querySelectorAll('[data-chart-idx]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const chosen = choices[Number(btn.dataset.chartIdx)];
          if (!chosen) return;
          if (CB.audio && CB.audio.playChartSelect) CB.audio.playChartSelect();
          closeChartModal();
          if (onSelectNode) onSelectNode(chosen);
        });
      });
    }
  }

  function closeChartModal() {
    const modal = document.getElementById('chartModal');
    if (modal) modal.classList.add('hidden');
    game.chartOpen = false;
  }

  // ==================== v9.5 浮空补给黑市弹窗交互 ====================
  function openMarketModal(onContinue, onBankReturn) {
    const modal = document.getElementById('marketModal');
    if (!modal || !CB.extraction) return;
    hideRunSummary();
    closeChartModal();
    game.marketOpen = true;
    modal.classList.remove('hidden');

    const offers = CB.extraction.getMarketOffers();
    let restBought = false;
    let fusedDone = false;

    const titleEl = document.getElementById('marketTitle');
    const pendEl = document.getElementById('marketPendingVal');
    const bankEl = document.getElementById('marketBankVal');
    const hpEl = document.getElementById('marketHpVal');
    const curCntEl = document.getElementById('marketCurioCountVal');
    const grid = document.getElementById('marketOffersGrid');
    const btnRest = document.getElementById('btnMarketRest');
    const btnFuse = document.getElementById('btnMarketFuse');
    const fuseSubEl = document.getElementById('marketFuseSub');
    const fbEl = document.getElementById('marketFeedback');
    const btnCont = document.getElementById('btnMarketContinue');
    const btnBank = document.getElementById('btnMarketBank');

    const setFeedback = (msg) => {
      if (fbEl) fbEl.textContent = msg;
    };

    const refreshMarket = () => {
      const v = game.voyage || {};
      const budget = CB.extraction.getMarketBudget();
      const regCount = game.player.curios.filter((c) => c.rarity !== 'legendary').length;
      if (titleEl) titleEl.textContent = `第 ${v.leg || 2} 航段 · 浮空补给黑市（海拔 ${v.altitude || 2350}m）`;
      if (pendEl) pendEl.textContent = `${v.pendingHaul || 0} 💎`;
      if (bankEl) bankEl.textContent = `${game.meta.bankValue || 0}`;
      if (hpEl) hpEl.textContent = `${Math.ceil(game.player.hp)}/${game.player.maxHp}`;
      if (curCntEl) curCntEl.textContent = `${game.player.curios.length} 件`;

      if (btnBank) {
        btnBank.textContent = `⚓ 见好就收 · 返航入库 (+${v.pendingHaul || 0} 🏛)`;
      }

      if (btnRest) {
        btnRest.disabled = restBought || budget < 35;
        const costSpan = btnRest.querySelector('.ms-cost');
        if (costSpan) costSpan.textContent = restBought ? '✓ 已休整' : '35 💎';
      }

      if (btnFuse) {
        btnFuse.disabled = fusedDone || regCount < 2 || budget < 40;
        const costSpan = btnFuse.querySelector('.ms-cost');
        if (costSpan) costSpan.textContent = fusedDone ? '✓ 已熔铸' : '40 💎';
        if (fuseSubEl) {
          fuseSubEl.textContent = fusedDone
            ? '本停靠点熔炉已使用，传说大金已装入奇物篮'
            : regCount >= 2
            ? `当前可熔铸（持有 ${regCount} 件常规奇物）→ 2 合 1 随机传说大金`
            : `需至少持有 2 件普通/史诗奇物（当前 ${regCount}/2）`;
        }
      }

      if (grid) {
        const synCounts = CB.extraction.getSynergyCounts ? CB.extraction.getSynergyCounts() : {};
        const synDefs = CB.extraction.SYNERGY_DEFS || {};
        grid.innerHTML = offers.map((item, idx) => {
          const c = item.curio;
          const canBuy = !item.bought && budget >= item.cost;
          const sd = c.discipline ? synDefs[c.discipline] : null;
          const curCnt = c.discipline ? (synCounts[c.discipline] || 0) : 0;
          const willActivate = !item.bought && sd && curCnt === (sd.threshold - 1);
          const discBadge = sd
            ? `<span class="mo-disc ${willActivate ? 'will-activate' : ''}">${sd.icon} ${sd.name} ${curCnt}/${sd.threshold}${willActivate ? ' · 购入激活!' : ''}</span>`
            : '';
          const cls = [
            c.rarity === 'epic' ? 'is-epic' : '',
            item.bought ? 'is-bought' : '',
            !item.bought && !canBuy ? 'cant-afford' : '',
          ].filter(Boolean).join(' ');
          return `
            <button class="market-offer-card ${cls}" data-market-idx="${idx}" ${item.bought ? 'disabled' : ''}>
              <div class="mo-icon">${c.icon}</div>
              <div class="mo-name">${c.name}</div>
              ${discBadge}
              <div class="mo-perk">${c.perk}</div>
              <span class="mo-price">${item.bought ? '✓ 已装入奇物篮' : `💎 ${item.cost} 购入`}</span>
            </button>
          `;
        }).join('');

        grid.querySelectorAll('[data-market-idx]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const item = offers[Number(btn.dataset.marketIdx)];
            if (!item || item.bought) return;
            const res = CB.extraction.buyMarketCurio(item.curio.id, item.cost);
            if (res.ok) {
              item.bought = true;
              setFeedback(res.activatedSynergy ? `✨ 购入 ${item.curio.icon} ${item.curio.name} 并激活【${res.activatedSynergy.short}】！${res.activatedSynergy.perk}` : `✨ 已购入 ${item.curio.icon} ${item.curio.name}，构筑立即生效！`);
              refreshMarket();
            } else {
              setFeedback('⚠ 暂存估值与母港金库总额不足，无法购入此奇物');
            }
          });
        });
      }
    };

    if (btnRest) {
      btnRest.onclick = () => {
        if (restBought) return;
        const res = CB.extraction.buyMarketRest(35);
        if (res.ok) {
          restBought = true;
          setFeedback('🍵 生命值已回满，下一航段开局附带 12 秒 ✦ 超频金珠！');
          refreshMarket();
        } else {
          setFeedback('⚠ 资金不足（需要 35 💎）');
        }
      };
    }

    if (btnFuse) {
      btnFuse.onclick = () => {
        if (fusedDone) return;
        const res = CB.extraction.fuseMarketCurios(40);
        if (res.ok && res.forged) {
          fusedDone = true;
          setFeedback(res.activatedSynergy ? `⚗️ 熔铸得 ${res.forged.icon} ${res.forged.name} 并激活【${res.activatedSynergy.short}】！` : `⚗️ 熔铸成功！获得传说大金 ${res.forged.icon} ${res.forged.name}（${res.forged.shortPerk}）！`);
          refreshMarket();
        } else if (res.reason === 'need_two') {
          setFeedback('⚠ 至少需要 2 件普通/史诗奇物才可启动熔炉');
        } else {
          setFeedback('⚠ 资金不足（需要 40 💎）');
        }
      };
    }

    if (btnCont) {
      btnCont.onclick = () => {
        if (CB.audio && CB.audio.playChartSelect) CB.audio.playChartSelect();
        closeMarketModal();
        if (onContinue) onContinue();
      };
    }

    if (btnBank) {
      btnBank.onclick = () => {
        closeMarketModal();
        if (onBankReturn) onBankReturn();
      };
    }

    setFeedback('☁ 挑选心仪补给后，点击右侧启航按钮展开前方云海航图');
    refreshMarket();
  }

  function closeMarketModal() {
    const modal = document.getElementById('marketModal');
    if (modal) modal.classList.add('hidden');
    game.marketOpen = false;
  }

  // ==================== v9.6 纯离线每日云海挑战弹窗 ====================
  function openDailyModal(onStartDaily) {
    const modal = document.getElementById('dailyModal');
    if (!modal || !CB.extraction || !CB.extraction.getDailyChallengeSpec) return;
    game.dailyOpen = true;
    modal.classList.remove('hidden');

    const spec = CB.extraction.getDailyChallengeSpec();
    const titleEl = document.getElementById('dailyTitle');
    const dateEl = document.getElementById('dailyDateVal');
    const seedEl = document.getElementById('dailySeedVal');
    const mutEl = document.getElementById('dailyMutatorVal');
    const bestEl = document.getElementById('dailyBestVal');
    const listEl = document.getElementById('dailyBountiesList');
    const btnStart = document.getElementById('btnStartDaily');
    const btnClose = document.getElementById('btnCloseDaily');

    if (titleEl) titleEl.textContent = `今日云海 · ${spec.title}`;
    if (dateEl) dateEl.textContent = spec.dateKey;
    if (seedEl) seedEl.textContent = `#${spec.seed}`;
    if (mutEl) mutEl.textContent = spec.mutator ? spec.mutator.short : '标准空域';
    if (bestEl) bestEl.textContent = spec.cleared ? `${spec.bestHaul} 💎 ✓` : '尚未通关';

    if (listEl) {
      listEl.innerHTML = spec.bounties
        .map((b) => `
          <div class="daily-bounty-row ${b.claimed ? 'is-claimed' : ''}">
            <span class="db-icon">${b.icon}</span>
            <div class="db-info">
              <strong>${b.title}</strong>
              <small>${b.desc}</small>
            </div>
            <span class="db-reward">${b.claimed ? '✓ 已入库' : `+${b.reward} 🏛`}</span>
          </div>
        `)
        .join('');
    }

    if (btnClose) {
      btnClose.onclick = () => {
        if (CB.audio && CB.audio.playUiClick) CB.audio.playUiClick();
        closeDailyModal();
      };
    }

    if (btnStart) {
      btnStart.textContent = spec.unclaimedCount > 0
        ? `🎈 挑战今日空域（尚有 ${spec.unclaimedCount} 项悬赏）`
        : '🎈 再次刷榜 · 今日每日云海';
      btnStart.onclick = () => {
        if (CB.audio) {
          CB.audio.unlock();
          if (CB.audio.playChartSelect) CB.audio.playChartSelect();
        }
        closeDailyModal();
        if (onStartDaily) onStartDaily(spec);
      };
    }
  }

  function closeDailyModal() {
    const modal = document.getElementById('dailyModal');
    if (modal) modal.classList.add('hidden');
    game.dailyOpen = false;
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
    openChartModal,
    closeChartModal,
    openMarketModal,
    closeMarketModal,
    openDailyModal,
    closeDailyModal,
  };
})();
