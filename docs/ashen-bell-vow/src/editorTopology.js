// Real-Time 5-Tier Directed Reachability, Anti-Softlock, Boss-Bypass & Vertical Shaft Clearance Solver (v41.1)
// Mirrors verify_project.py's check_world_topology_and_shafts() directly inside editor.html!

function subtractSeg(segs, a, b) {
  const out = [];
  for (let i = 0; i < segs.length; i++) {
    const [s0, s1] = segs[i];
    if (b <= s0 || a >= s1) {
      out.push([s0, s1]);
    } else {
      if (a > s0) out.push([s0, a]);
      if (b < s1) out.push([b, s1]);
    }
  }
  return out;
}

const POST_JI_FORBIDDEN = new Set([
  'r07_ascent', 'r08_heart', 'r09_wind_spire', 'r11_frost_ridge', 'r12_wind_bridge',
  'r13_wind_peak', 'r16_frost_tomb', 'r17_frost_summit',
  'r21_cistern_west', 'r22_cistern_nave', 'r23_cistern_lock', 'r24_frost_seep', 'r25_mirror_abyss'
]);

const STARTER_T0_ALLOWED = new Set(['r01_sanctuary', 'r02_corridor', 'r03_chapel']);

const TIER_DEFS = [
  { id: 'T0_Start',   label: 'T0 开荒期',    short: 'T0', caps: { boss1: false, grapple: false, doubleJump: false, shadeDash: false, boss2: false, bellDive: false, boss4Unlocked: false } },
  { id: 'T1_Grapple', label: 'T1 幽丝钩索',  short: 'T1', caps: { boss1: true,  grapple: true,  doubleJump: false, shadeDash: false, boss2: false, bellDive: false, boss4Unlocked: false } },
  { id: 'T2_PreJi',   label: 'T2 战寂前',    short: 'T2', caps: { boss1: true,  grapple: true,  doubleJump: true,  shadeDash: true,  boss2: false, bellDive: false, boss4Unlocked: false } },
  { id: 'T3_PostJi',  label: 'T3 斩寂后',    short: 'T3', caps: { boss1: true,  grapple: true,  doubleJump: true,  shadeDash: true,  boss2: true,  bellDive: true,  boss4Unlocked: false } },
  { id: 'T4_Endgame', label: 'T4 终局全境',  short: 'T4', caps: { boss1: true,  grapple: true,  doubleJump: true,  shadeDash: true,  boss2: true,  bellDive: true,  boss4Unlocked: true } }
];

const KNOWN_SWITCH_GATE_EDGES = {
  'r01_sanctuary>r19_belfry_outer': 'belfryHatchOpen',
  'r19_belfry_outer>r01_sanctuary': 'belfryHatchOpen',
  'r01_sanctuary>r10_ink_woods':    'forestHatchOpen',
  'r10_ink_woods>r01_sanctuary':    'forestHatchOpen',
  'r02_corridor>r06_crypt':         'cryptHatchOpen',
  'r06_crypt>r02_corridor':         'cryptHatchOpen',
  'r05_foundry>r09_wind_spire':     'foundryValveOpen',
  'r09_wind_spire>r05_foundry':     'foundryValveOpen',
  'r07_ascent>r09_wind_spire':      'windAscentOpen',
  'r09_wind_spire>r07_ascent':      'windAscentOpen',
  'r04_bell_well>r09_wind_spire':   'windWestOpen',
  'r09_wind_spire>r04_bell_well':   'windWestOpen',
  'r20_bell_galleries>r12_wind_bridge': 'galleryWindOpen',
  'r12_wind_bridge>r20_bell_galleries': 'galleryWindOpen',
  'r14_woods_cavern>r21_cistern_west':  'cisternWestOpen',
  'r21_cistern_west>r14_woods_cavern':  'cisternWestOpen'
};

export function runTopologyAndShaftAudit(bundle) {
  const rooms = (bundle && bundle.rooms) ? bundle.rooms : [];
  const byId = new Map();
  rooms.forEach((rm, idx) => byId.set(rm.id, { rm, idx }));
  const issues = [];
  const shaftOverlays = [];

  // ==================== LAW 1: No Horizontal secretWalls (w > h) ====================
  for (let ri = 0; ri < rooms.length; ri++) {
    const rm = rooms[ri];
    const ox = rm.bounds.x;
    const oy = rm.bounds.y;
    (rm.secretWalls || []).forEach((sw, si) => {
      const w = Number(sw.w) || 0;
      const h = Number(sw.h) || 0;
      if (w > h) {
        issues.push({
          sev: 'err',
          cat: 'topo',
          title: `铁律1 · 禁止横向暗墙：${rm.id} · ${sw.id || si}`,
          msg: `暗墙尺寸 ${w}×${h} 为水平封板，站于其上平砍难以命中极易造成软锁！请改为单向活板闸 (switchGate) 或镇岳裂石地板 (breakableFloor)。`,
          roomIdx: ri,
          roomIds: [rm.id],
          sel: { kind: 'secretWall', idx: si },
          wx: ox + sw.x + w * 0.5,
          wy: oy + sw.y + h * 0.5,
          highlightBox: { x: ox + sw.x, y: oy + sw.y, w, h }
        });
      }
    });
  }

  // ==================== LAW 2: Vertical Shaft Drop Clearance (BouncePad intrusion) ====================
  for (let ri = 0; ri < rooms.length; ri++) {
    const topRm = rooms[ri];
    const tb = topRm.bounds;
    for (const cid of (topRm.connections || [])) {
      const target = byId.get(cid);
      if (!target) continue;
      const botRm = target.rm;
      const bb = botRm.bounds;
      if (Math.abs((tb.y + tb.h) - bb.y) > 24) continue;
      const ov0 = Math.max(tb.x, bb.x);
      const ov1 = Math.min(tb.x + tb.w, bb.x + bb.w);
      if (ov1 - ov0 < 40) continue;

      let intervals = [[ov0, ov1]];
      for (const s of (topRm.solids || [])) {
        if (s.type !== 'platform' && s.y + s.h >= tb.h - 25) {
          intervals = subtractSeg(intervals, tb.x + s.x, tb.x + s.x + s.w);
        }
      }
      for (const s of (botRm.solids || [])) {
        if (s.type !== 'platform' && s.y <= 40) {
          intervals = subtractSeg(intervals, bb.x + s.x, bb.x + s.x + s.w);
        }
      }

      for (const [a, b] of intervals) {
        if (b - a < 60) continue;
        let free = [[a, b]];
        let hasPad = false;
        let badPadIdx = -1;
        (botRm.bouncePads || []).forEach((bp, bi) => {
          if (bp.y < 200) {
            const bw = Number(bp.w) || 78;
            const bx0 = bb.x + bp.x - bw * 0.5;
            const bx1 = bb.x + bp.x + bw * 0.5;
            if (bx1 > a && bx0 < b) {
              hasPad = true;
              if (badPadIdx < 0) badPadIdx = bi;
              free = subtractSeg(free, bx0, bx1);
            }
          }
        });
        const maxFree = free.reduce((m, seg) => Math.max(m, seg[1] - seg[0]), 0);
        if (hasPad) {
          const ok = maxFree >= 90;
          const box = { x: a, y: bb.y, w: b - a, h: 165 };
          shaftOverlays.push({ ...box, ok, maxFree: Math.round(maxFree), topId: topRm.id, botId: botRm.id });
          if (!ok) {
            issues.push({
              sev: 'err',
              cat: 'shaft',
              title: `铁律2 · 竖井下坠净空不足：${topRm.id} → ${botRm.id}`,
              msg: `井口 X=[${Math.round(a)}..${Math.round(b)}] 下方孢伞侵入直落通道，最大净空仅 ${Math.round(maxFree)}px（须 ≥ 90px），请将孢伞移至单侧形成落/升双道分离！`,
              roomIdx: target.idx,
              roomIds: [topRm.id, botRm.id],
              sel: badPadIdx >= 0 ? { kind: 'bouncePad', idx: badPadIdx } : null,
              wx: (a + b) * 0.5,
              wy: bb.y + 72,
              highlightBox: box
            });
          }
        }
      }
    }
  }

  // ==================== LAW 6 & 7: Anchor/Lantern topY & Static VoidBarrier Top-Seal Guard ====================
  for (let ri = 0; ri < rooms.length; ri++) {
    const rm = rooms[ri];
    const ox = rm.bounds.x;
    const oy = rm.bounds.y;
    (rm.grappleAnchors || []).forEach((anc, ai) => {
      if (!anc.id || (oy !== 0 && anc.topY === undefined)) {
        issues.push({
          sev: 'err',
          cat: 'anchor',
          title: `钩点缺失 id / topY：${rm.id} #${ai}`,
          msg: `位于 y=${oy} 层的钩环缺少 id 或 topY，渲染时可能因负高度被裁剪隐身或拉出穿墙长链。`,
          roomIdx: ri,
          roomIds: [rm.id],
          sel: { kind: 'grappleAnchor', idx: ai },
          wx: ox + anc.x,
          wy: oy + anc.y,
          highlightBox: { x: ox + anc.x - 22, y: oy + anc.y - 22, w: 44, h: 44 }
        });
      }
    });
    (rm.lanterns || []).forEach((lan, li) => {
      if (oy !== 0 && lan.topY === undefined) {
        issues.push({
          sev: 'err',
          cat: 'anchor',
          title: `悬灯缺失 topY：${rm.id} · ${lan.id || li}`,
          msg: `非零 Y 层房间 (${oy}) 的悬灯缺少 topY，视锥裁剪可能导致悬灯消失。`,
          roomIdx: ri,
          roomIds: [rm.id],
          sel: { kind: 'lantern', idx: li },
          wx: ox + lan.x,
          wy: oy + lan.anchorY + (lan.len || 120),
          highlightBox: { x: ox + lan.x - 24, y: oy + lan.anchorY, w: 48, h: (lan.len || 120) + 24 }
        });
      }
    });
    (rm.voidBarriers || []).forEach((vb, vi) => {
      if (vb.sweeping) return;
      const vx = Number(vb.x) || 0;
      const vy = Number(vb.y) || 0;
      const vw = Number(vb.w) || 22;
      const vh = Number(vb.h) || 140;
      const topOk = (rm.solids || []).some(s =>
        s.type !== 'platform' &&
        s.x <= vx + 6 &&
        (s.x + s.w) >= (vx + vw) - 6 &&
        Math.abs((s.y + s.h) - vy) <= 12
      );
      if (!topOk) {
        issues.push({
          sev: 'err',
          cat: 'gate',
          title: `静态黑冲结界未封顶：${rm.id} · ${vb.id || vi}`,
          msg: `静态暗蚀结界顶部缺少实心石梁/天顶封口，玩家可直接跳越逃课！请在其顶部补齐 pillar 封顶。`,
          roomIdx: ri,
          roomIds: [rm.id],
          sel: { kind: 'voidBarrier', idx: vi },
          wx: ox + vx + vw * 0.5,
          wy: oy + vy + vh * 0.5,
          highlightBox: { x: ox + vx - 8, y: oy + vy - 18, w: vw + 16, h: vh + 18 }
        });
      }
    });
  }

  // ==================== LAW 3, 4 & 5: 5-Tier Directed BFS Reachability, Anti-Softlock & Anti-Bypass ====================
  const switchRoom = new Map();
  const switchReqBoss = new Map();
  const dynamicSwitchEdges = new Map();

  // Detect any dynamically placed switchGate on a room boundary to auto-gate that boundary!
  for (let ri = 0; ri < rooms.length; ri++) {
    const rm = rooms[ri];
    for (const sw of (rm.worldSwitches || [])) {
      if (sw.switchKey) {
        switchRoom.set(sw.switchKey, rm.id);
        if (sw.requiresBoss) switchReqBoss.set(sw.switchKey, sw.requiresBoss);
      }
    }
    const b = rm.bounds;
    for (const g of (rm.gates || [])) {
      if (g.role === 'switchGate' && g.switchKey) {
        const gx0 = b.x + g.x, gy0 = b.y + g.y, gx1 = gx0 + (g.w || 36), gy1 = gy0 + (g.h || 36);
        for (const cid of (rm.connections || [])) {
          const t = byId.get(cid);
          if (!t) continue;
          const ob = t.rm.bounds;
          // Check if gate lies within 160px of shared seam with neighbor `cid`
          const nearH = (Math.abs(gx0 - (ob.x + ob.w)) <= 45 || Math.abs(gx1 - ob.x) <= 45) && gy1 > ob.y && gy0 < ob.y + ob.h;
          const nearV = (Math.abs(gy0 - (ob.y + ob.h)) <= 160 || Math.abs(gy1 - ob.y) <= 160) && gx1 > ob.x && gx0 < ob.x + ob.w;
          if (nearH || nearV) {
            dynamicSwitchEdges.set(`${rm.id}>${cid}`, g.switchKey);
            dynamicSwitchEdges.set(`${cid}>${rm.id}`, g.switchKey);
          }
        }
      }
    }
  }

  const startAltarId = (bundle && bundle.world && bundle.world.startAltarId) || 'altar_start';
  const startRoomObj = rooms.find(r => (r.altars || []).some(a => a.id === startAltarId)) || rooms[0];
  const startId = startRoomObj ? startRoomObj.id : 'r01_sanctuary';

  function hasGateRole(rmId, role) {
    const entry = byId.get(rmId);
    return !!(entry && (entry.rm.gates || []).some(g => g.role === role));
  }

  function hasBreakableFloor(rmId, floorId) {
    const entry = byId.get(rmId);
    return !!(entry && (entry.rm.breakableFloors || []).some(f => f.id === floorId));
  }

  function edgeOpen(u, v, caps, activeSwitches) {
    const key = `${u}>${v}`;
    if ((key === 'r03_chapel>r04_bell_well' || key === 'r04_bell_well>r03_chapel') && hasGateRole('r03_chapel', 'chapelExit')) {
      return caps.boss1;
    }
    if ((key === 'r04_bell_well>r05_foundry' || key === 'r05_foundry>r04_bell_well') && hasGateRole('r04_bell_well', 'foundryEntry')) {
      return caps.doubleJump;
    }
    if ((key === 'r05_foundry>r07_ascent' || key === 'r07_ascent>r05_foundry') && hasGateRole('r05_foundry', 'foundryExit')) {
      return caps.boss2;
    }
    if (key === 'r02_corridor>r18_rain_steps') return caps.grapple;
    if (key === 'r04_bell_well>r20_bell_galleries') return caps.grapple;

    // Bell Dive vertical floor shafts
    if ((key === 'r04_bell_well>r22_cistern_nave' || key === 'r22_cistern_nave>r04_bell_well') && hasBreakableFloor('r04_bell_well', 'floor_well_cistern')) return caps.bellDive;
    if ((key === 'r06_crypt>r21_cistern_west' || key === 'r21_cistern_west>r06_crypt') && hasBreakableFloor('r06_crypt', 'floor_crypt_cistern')) return caps.bellDive;
    if ((key === 'r07_ascent>r23_cistern_lock' || key === 'r23_cistern_lock>r07_ascent') && hasBreakableFloor('r07_ascent', 'floor_ascent_cistern')) return caps.bellDive;
    if ((key === 'r11_frost_ridge>r24_frost_seep' || key === 'r24_frost_seep>r11_frost_ridge') && hasBreakableFloor('r11_frost_ridge', 'floor_frost_seep')) return caps.bellDive;

    // Dynamic or known one-way switch gates (only active if the gate actually still exists in rooms!)
    const swKey = dynamicSwitchEdges.get(key) || (switchRoom.has(KNOWN_SWITCH_GATE_EDGES[key]) && hasGateRole(u, 'foundryValve') ? KNOWN_SWITCH_GATE_EDGES[key] : null);
    if (swKey) {
      // Special case: r02_corridor <-> r06_crypt can also open via floor_corridor_crypt if player has bellDive
      if ((key === 'r02_corridor>r06_crypt' || key === 'r06_crypt>r02_corridor') && caps.bellDive && hasBreakableFloor('r02_corridor', 'floor_corridor_crypt')) {
        return true;
      }
      return activeSwitches.has(swKey);
    }
    if ((key === 'r05_foundry>r09_wind_spire' || key === 'r09_wind_spire>r05_foundry') && hasGateRole('r05_foundry', 'foundryValve')) {
      return activeSwitches.has('foundryValveOpen');
    }
    if ((key === 'r13_wind_peak>r25_mirror_abyss' || key === 'r25_mirror_abyss>r13_wind_peak') && hasGateRole('r25_mirror_abyss', 'mirrorAbyss')) {
      return caps.boss4Unlocked;
    }
    if ((key === 'r13_wind_peak>r17_frost_summit' || key === 'r17_frost_summit>r13_wind_peak') && hasGateRole('r17_frost_summit', 'skyBridge')) {
      return caps.boss2;
    }
    return true;
  }

  function solveTier(tierDef) {
    const caps = tierDef.caps;
    const activeSwitches = new Set();
    let visited = new Set([startId]);

    while (true) {
      visited = new Set([startId]);
      const queue = [startId];
      while (queue.length > 0) {
        const u = queue.shift();
        const entry = byId.get(u);
        if (!entry) continue;
        for (const v of (entry.rm.connections || [])) {
          if (byId.has(v) && !visited.has(v) && edgeOpen(u, v, caps, activeSwitches)) {
            visited.add(v);
            queue.push(v);
          }
        }
      }
      let openedNew = false;
      for (const [sk, srm] of switchRoom.entries()) {
        if (activeSwitches.has(sk) || !visited.has(srm)) continue;
        const reqB = switchReqBoss.get(sk);
        if (reqB === 'boss_ji' && !caps.boss2) continue;
        if (reqB === 'boss_hui' && !caps.boss1) continue;
        activeSwitches.add(sk);
        openedNew = true;
      }
      if (!openedNew) break;
    }

    // Reverse BFS: can every visited room return to startId?
    const canReturn = new Set([startId]);
    const rqueue = [startId];
    while (rqueue.length > 0) {
      const v = rqueue.shift();
      for (const u of visited) {
        if (canReturn.has(u)) continue;
        const uEntry = byId.get(u);
        if (uEntry && (uEntry.rm.connections || []).includes(v) && edgeOpen(u, v, caps, activeSwitches)) {
          canReturn.add(u);
          rqueue.push(u);
        }
      }
    }

    const softlocked = new Set();
    for (const u of visited) {
      if (!canReturn.has(u)) softlocked.add(u);
    }

    const leaked = new Set();
    if (!caps.boss1) {
      for (const u of visited) {
        if (!STARTER_T0_ALLOWED.has(u)) leaked.add(u);
      }
    } else if (!caps.boss2) {
      for (const u of visited) {
        if (POST_JI_FORBIDDEN.has(u)) leaked.add(u);
      }
    }

    const unreachable = new Set();
    if (tierDef.id === 'T4_Endgame') {
      for (const rm of rooms) {
        if (!visited.has(rm.id)) unreachable.add(rm.id);
      }
    }

    return {
      id: tierDef.id,
      label: tierDef.label,
      short: tierDef.short,
      visited,
      softlocked,
      leaked,
      unreachable,
      activeSwitches,
      hasViolation: softlocked.size > 0 || leaked.size > 0 || unreachable.size > 0
    };
  }

  const tiers = [];
  if (byId.has(startId)) {
    for (const td of TIER_DEFS) {
      const res = solveTier(td);
      tiers.push(res);

      if (res.softlocked.size > 0) {
        const ids = [...res.softlocked];
        const first = byId.get(ids[0]);
        issues.push({
          sev: 'err',
          cat: 'topo',
          tierId: res.id,
          title: `铁律3 · 软锁告警 (${res.label})：${ids.join(', ')}`,
          msg: `玩家在「${res.label}」能力阶段进入上述房间后无法沿当前能力返回起点祭坛！请检查单向落口或补齐回程通道。`,
          roomIdx: first ? first.idx : 0,
          roomIds: ids
        });
      }
      if (res.leaked.size > 0) {
        const ids = [...res.leaked];
        const first = byId.get(ids[0]);
        const bossHint = td.id === 'T0_Start' ? '一关首领「晦」' : '二关首领「寂」';
        issues.push({
          sev: 'err',
          cat: 'topo',
          tierId: res.id,
          title: `铁律4 · 越界绕后漏洞 (${res.label})：${ids.slice(0, 3).join(', ')}${ids.length > 3 ? ` 等${ids.length}房` : ''}`,
          msg: `未击败${bossHint}前即可提前到达后置区域（可能撞到 Boss 红墙背面）！请确认边界已部署单向机关铁闸 (switchGate)。`,
          roomIdx: first ? first.idx : 0,
          roomIds: ids
        });
      }
      if (res.unreachable.size > 0) {
        const ids = [...res.unreachable];
        const first = byId.get(ids[0]);
        issues.push({
          sev: 'err',
          cat: 'topo',
          tierId: res.id,
          title: `铁律5 · 终局不可达孤岛：${ids.join(', ')}`,
          msg: `即便集齐全部能力与开关，仍无法到达上述房间，请检查 connections 与单向拉杆所在房间是否可达！`,
          roomIdx: first ? first.idx : 0,
          roomIds: ids
        });
      }
    }
  }

  return { issues, tiers, shaftOverlays };
}
