// Zero-dependency Minimal Web Level Editor for Room-Based JSON Data Stream
import { COLORS, PREVIEW_STORAGE_KEY } from './config.js';

const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');
const roomListEl = document.getElementById('room-list');
const roomPropsEl = document.getElementById('room-props');
const inspectorEl = document.getElementById('obj-inspector');
const statusPosEl = document.getElementById('status-pos');
const statusInfoEl = document.getElementById('status-info');
const toastEl = document.getElementById('ed-toast');

const RECT_TOOLS = new Set(['ground', 'pillar', 'platform', 'crumble', 'secretWall', 'river']);

const state = {
  bundle: null, // { world, rooms: [...] }
  activeRoomIdx: 0,
  viewMode: 'room', // 'room' | 'world'
  tool: 'select',
  gridSize: 10,
  cam: { x: -60, y: -40, zoom: 0.72 },
  selection: null, // { kind, index, subIndex? }
  undoStack: [],
  redoStack: [],
  drag: null,
  hoverWorld: { x: 0, y: 0 },
  toastTimer: null
};

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  if (state.toastTimer) clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function snap(v) {
  const g = state.gridSize;
  return g <= 1 ? Math.round(v) : Math.round(v / g) * g;
}

function cloneBundle() {
  return JSON.parse(JSON.stringify(state.bundle));
}

function pushUndo() {
  state.undoStack.push(cloneBundle());
  if (state.undoStack.length > 50) state.undoStack.shift();
  state.redoStack.length = 0;
}

function getActiveRoom() {
  return state.bundle && state.bundle.rooms[state.activeRoomIdx] ? state.bundle.rooms[state.activeRoomIdx] : null;
}

function syncManifestFromRooms() {
  if (!state.bundle) return;
  state.bundle.world.rooms = state.bundle.rooms.map(rm => ({
    id: rm.id,
    file: `./data/rooms/${rm.id}.json`,
    zoneName: rm.zoneName,
    name: rm.name,
    theme: rm.theme,
    bounds: rm.bounds,
    connections: rm.connections || []
  }));
}

function screenToWorld(sx, sy) {
  return {
    x: sx / state.cam.zoom + state.cam.x,
    y: sy / state.cam.zoom + state.cam.y
  };
}

function worldToScreen(wx, wy) {
  return {
    x: (wx - state.cam.x) * state.cam.zoom,
    y: (wy - state.cam.y) * state.cam.zoom
  };
}

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function fitView() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const vw = Math.max(300, rect.width);
  const vh = Math.max(240, rect.height);
  if (state.viewMode === 'world' && state.bundle) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of state.bundle.rooms) {
      minX = Math.min(minX, r.bounds.x);
      minY = Math.min(minY, r.bounds.y);
      maxX = Math.max(maxX, r.bounds.x + r.bounds.w);
      maxY = Math.max(maxY, r.bounds.y + r.bounds.h);
    }
    const bw = Math.max(600, maxX - minX + 160);
    const bh = Math.max(400, maxY - minY + 160);
    state.cam.zoom = Math.max(0.12, Math.min(1.0, Math.min(vw / bw, vh / bh)));
    state.cam.x = minX - (vw / state.cam.zoom - (maxX - minX)) * 0.5;
    state.cam.y = minY - (vh / state.cam.zoom - (maxY - minY)) * 0.5;
  } else {
    const rm = getActiveRoom();
    if (!rm) return;
    const pad = 90;
    const bw = rm.bounds.w + pad * 2;
    const bh = rm.bounds.h + pad * 2;
    state.cam.zoom = Math.max(0.25, Math.min(1.3, Math.min(vw / bw, vh / bh)));
    state.cam.x = rm.bounds.x - (vw / state.cam.zoom - rm.bounds.w) * 0.5;
    state.cam.y = rm.bounds.y - (vh / state.cam.zoom - rm.bounds.h) * 0.5;
  }
  draw();
}

// ==================== OBJECT ACCESSORS & HIT TESTING ====================
function getRoomObjects(rm) {
  const items = [];
  const ox = rm.bounds.x;
  const oy = rm.bounds.y;
  const addRect = (kind, arr, idx, obj, w, h, resizable = true) => {
    items.push({
      kind, arr, idx, obj, resizable,
      wx: ox + obj.x, wy: oy + obj.y, w, h
    });
  };
  const addPoint = (kind, arr, idx, obj, xKey, yKey, r = 20) => {
    const wx = ox + obj[xKey];
    const wy = oy + obj[yKey];
    items.push({
      kind, arr, idx, obj, xKey, yKey, resizable: false,
      wx: wx - r, wy: wy - r, w: r * 2, h: r * 2, cx: wx, cy: wy
    });
  };

  (rm.solids || []).forEach((o, i) => addRect('solid', rm.solids, i, o, o.w, o.h, true));
  (rm.crumblePlatforms || []).forEach((o, i) => addRect('crumble', rm.crumblePlatforms, i, o, o.w, o.h, true));
  (rm.secretWalls || []).forEach((o, i) => addRect('secretWall', rm.secretWalls, i, o, o.w, o.h, true));
  (rm.gates || []).forEach((o, i) => addRect('gate', rm.gates, i, o, o.w, o.h, true));
  (rm.rivers || []).forEach((o, i) => addRect('river', rm.rivers, i, o, o.w, 22, true));
  (rm.enemies || []).forEach((o, i) => {
    const ew = o.kind === 'golem' ? 46 : 36;
    const eh = o.kind === 'golem' ? 78 : o.kind === 'wraith' ? 48 : 62;
    addRect('enemy', rm.enemies, i, o, ew, eh, false);
  });
  (rm.bosses || []).forEach((o, i) => addRect('boss', rm.bosses, i, o, 58, 102, false));
  (rm.altars || []).forEach((o, i) => addPoint('altar', rm.altars, i, o, 'x', 'y', 26));
  (rm.pickups || []).forEach((o, i) => addPoint('pickup', rm.pickups, i, o, 'x', 'y', 22));
  (rm.loreTablets || []).forEach((o, i) => addPoint('lore', rm.loreTablets, i, o, 'x', 'y', 24));
  (rm.lanterns || []).forEach((o, i) => {
    const lx = ox + o.x;
    const ly = oy + o.anchorY + o.len;
    items.push({
      kind: 'lantern', arr: rm.lanterns, idx: i, obj: o, xKey: 'x', yKey: 'anchorY', resizable: false,
      wx: lx - 18, wy: ly - 18, w: 36, h: 36, cx: lx, cy: ly
    });
  });
  (rm.grappleAnchors || []).forEach((o, i) => addPoint('anchor', rm.grappleAnchors, i, o, 'x', 'y', 18));
  (rm.pendulums || []).forEach((o, i) => {
    const px = ox + o.x;
    const py = oy + o.anchorY + o.len;
    items.push({
      kind: 'pendulum', arr: rm.pendulums, idx: i, obj: o, xKey: 'x', yKey: 'anchorY', resizable: false,
      wx: px - 28, wy: py - 28, w: 56, h: 56, cx: px, cy: py
    });
  });
  (rm.resonancePuzzles || []).forEach((pz, pi) => {
    const cx = ox + pz.cageX;
    const cy = oy + pz.cageY - 26;
    items.push({
      kind: 'puzzleCage', arr: rm.resonancePuzzles, idx: pi, obj: pz, xKey: 'cageX', yKey: 'cageY', resizable: false,
      wx: cx - 24, wy: cy - 32, w: 48, h: 64, cx, cy
    });
    (pz.bells || []).forEach((bl, bi) => {
      const bx = ox + bl.x;
      const by = oy + bl.y;
      items.push({
        kind: 'puzzleBell', arr: pz.bells, idx: bi, parentIdx: pi, obj: bl, xKey: 'x', yKey: 'y', resizable: false,
        wx: bx - 18, wy: by - 18, w: 36, h: 36, cx: bx, cy: by
      });
    });
  });
  (rm.inscriptions || []).forEach((o, i) => addPoint('inscription', rm.inscriptions, i, o, 'x', 'y', 24));
  const props = rm.props || {};
  (props.banners || []).forEach((o, i) => addPoint('banner', props.banners, i, o, 'x', 'y', 20));
  (props.candles || []).forEach((o, i) => addPoint('candle', props.candles, i, o, 'x', 'y', 18));
  return items;
}

function getSelectedItem() {
  const rm = getActiveRoom();
  if (!rm || !state.selection) return null;
  const items = getRoomObjects(rm);
  return items.find(it =>
    it.kind === state.selection.kind &&
    it.idx === state.selection.idx &&
    it.parentIdx === state.selection.parentIdx
  ) || null;
}

function hitTestHandle(item, wx, wy) {
  if (!item || !item.resizable) return null;
  const tol = 10 / state.cam.zoom;
  const corners = [
    { name: 'nw', x: item.wx, y: item.wy },
    { name: 'ne', x: item.wx + item.w, y: item.wy },
    { name: 'sw', x: item.wx, y: item.wy + item.h },
    { name: 'se', x: item.wx + item.w, y: item.wy + item.h }
  ];
  for (const c of corners) {
    if (Math.abs(wx - c.x) <= tol && Math.abs(wy - c.y) <= tol) return c.name;
  }
  return null;
}

function hitTestObject(rm, wx, wy) {
  const items = getRoomObjects(rm);
  // Test top-layer points/entities first (reverse order so foreground wins over huge ground blocks)
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (wx >= it.wx && wx <= it.wx + it.w && wy >= it.wy && wy <= it.wy + it.h) {
      return it;
    }
  }
  return null;
}

// ==================== RENDERING ====================
function drawRoomContents(rm, isGhost = false) {
  const ox = rm.bounds.x;
  const oy = rm.bounds.y;
  ctx.save();
  if (isGhost) ctx.globalAlpha = 0.24;

  // Room Bounds Frame
  ctx.fillStyle = isGhost ? 'rgba(14, 20, 32, 0.35)' : 'rgba(13, 19, 32, 0.55)';
  ctx.fillRect(ox, oy, rm.bounds.w, rm.bounds.h);

  // Solids
  for (const s of (rm.solids || [])) {
    if (s.type === 'ground') {
      ctx.fillStyle = '#1b2436';
      ctx.strokeStyle = 'rgba(216, 207, 184, 0.55)';
    } else if (s.type === 'pillar') {
      ctx.fillStyle = '#253147';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
    } else {
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#d8cfb8';
    }
    ctx.lineWidth = 1.6 / state.cam.zoom;
    ctx.fillRect(ox + s.x, oy + s.y, s.w, s.h);
    ctx.strokeRect(ox + s.x, oy + s.y, s.w, s.h);
  }

  // Crumble Platforms
  for (const cp of (rm.crumblePlatforms || [])) {
    ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
    ctx.strokeStyle = COLORS.goldBright;
    ctx.lineWidth = 1.6 / state.cam.zoom;
    ctx.fillRect(ox + cp.x, oy + cp.y, cp.w, cp.h);
    ctx.strokeRect(ox + cp.x, oy + cp.y, cp.w, cp.h);
  }

  // Secret Walls
  for (const sw of (rm.secretWalls || [])) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.strokeStyle = COLORS.cyanBright;
    ctx.lineWidth = 2 / state.cam.zoom;
    ctx.fillRect(ox + sw.x, oy + sw.y, sw.w, sw.h);
    ctx.strokeRect(ox + sw.x, oy + sw.y, sw.w, sw.h);
  }

  // Gates
  for (const g of (rm.gates || [])) {
    ctx.fillStyle = 'rgba(220, 38, 38, 0.25)';
    ctx.strokeStyle = COLORS.goldBright;
    ctx.lineWidth = 2 / state.cam.zoom;
    ctx.fillRect(ox + g.x, oy + g.y, g.w, g.h);
    ctx.strokeRect(ox + g.x, oy + g.y, g.w, g.h);
    if (g.leverX !== undefined) {
      ctx.strokeStyle = COLORS.goldBright;
      ctx.beginPath();
      ctx.moveTo(ox + g.x + g.w / 2, oy + g.y + g.h / 2);
      ctx.lineTo(ox + g.leverX, oy + g.leverY - 12);
      ctx.stroke();
      ctx.fillStyle = COLORS.goldBright;
      ctx.beginPath(); ctx.arc(ox + g.leverX, oy + g.leverY - 12, 6, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Rivers
  for (const rv of (rm.rivers || [])) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.48)';
    ctx.strokeStyle = COLORS.cyanBright;
    ctx.lineWidth = 1.6 / state.cam.zoom;
    ctx.fillRect(ox + rv.x, oy + rv.y, rv.w, 18);
    ctx.strokeRect(ox + rv.x, oy + rv.y, rv.w, 18);
  }

  // Props (Banners & Candles)
  const props = rm.props || {};
  for (const bn of (props.banners || [])) {
    ctx.fillStyle = bn.color || '#33151e';
    ctx.strokeStyle = 'rgba(216, 207, 184, 0.35)';
    ctx.fillRect(ox + bn.x - 10, oy + bn.y, 20, bn.len || 140);
    ctx.strokeRect(ox + bn.x - 10, oy + bn.y, 20, bn.len || 140);
  }
  for (const cl of (props.candles || [])) {
    ctx.fillStyle = COLORS.goldBright;
    ctx.beginPath(); ctx.arc(ox + cl.x, oy + cl.y - 10, 5, 0, Math.PI * 2); ctx.fill();
  }

  // Lanterns
  for (const l of (rm.lanterns || [])) {
    const lx = ox + l.x;
    const ay = oy + l.anchorY;
    const ly = ay + l.len;
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
    ctx.lineWidth = 1.4 / state.cam.zoom;
    ctx.beginPath(); ctx.moveTo(lx, oy + (l.topY !== undefined ? l.topY : 0)); ctx.lineTo(lx, ly); ctx.stroke();
    ctx.fillStyle = COLORS.goldBright;
    ctx.beginPath(); ctx.arc(lx, ly, 10, 0, Math.PI * 2); ctx.fill();
  }

  // Grapple Anchors
  for (const a of (rm.grappleAnchors || [])) {
    const ax = ox + a.x;
    const ay = oy + a.y;
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
    ctx.lineWidth = 1.2 / state.cam.zoom;
    ctx.beginPath(); ctx.moveTo(ax, oy + (a.topY !== undefined ? a.topY : 0)); ctx.lineTo(ax, ay); ctx.stroke();
    ctx.strokeStyle = COLORS.cyanBright;
    ctx.lineWidth = 2.4 / state.cam.zoom;
    ctx.beginPath(); ctx.arc(ax, ay, 10, 0, Math.PI * 2); ctx.stroke();
  }

  // Pendulums
  for (const pd of (rm.pendulums || [])) {
    const px = ox + pd.x;
    const ay = oy + pd.anchorY;
    const by = ay + pd.len;
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.45)';
    ctx.lineWidth = 2 / state.cam.zoom;
    ctx.beginPath(); ctx.moveTo(px, ay); ctx.lineTo(px, by); ctx.stroke();
    ctx.beginPath(); ctx.arc(px, ay, pd.len, Math.PI * 0.5 - pd.amp, Math.PI * 0.5 + pd.amp); ctx.stroke();
    ctx.fillStyle = 'rgba(220, 38, 38, 0.65)';
    ctx.strokeStyle = COLORS.crimsonBright;
    ctx.beginPath(); ctx.arc(px, by, pd.r || 28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // Resonance Puzzles
  for (const pz of (rm.resonancePuzzles || [])) {
    const cx = ox + pz.cageX;
    const cy = oy + pz.cageY - 28;
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
    ctx.setLineDash([5, 5]);
    for (const b of (pz.bells || [])) {
      ctx.beginPath(); ctx.moveTo(ox + b.x, oy + b.y); ctx.lineTo(cx, cy); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = COLORS.goldBright;
    ctx.lineWidth = 2 / state.cam.zoom;
    ctx.strokeRect(cx - 22, oy + pz.cageY - 60, 44, 60);
    for (const b of (pz.bells || [])) {
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath(); ctx.arc(ox + b.x, oy + b.y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.stroke();
    }
  }

  // Altars, Lore, Pickups
  for (const a of (rm.altars || [])) {
    ctx.fillStyle = COLORS.cyan;
    ctx.beginPath(); ctx.arc(ox + a.x, oy + a.y - 32, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('坛', ox + a.x, oy + a.y - 28);
  }
  for (const lt of (rm.loreTablets || [])) {
    ctx.fillStyle = '#253147';
    ctx.strokeStyle = COLORS.parchment;
    ctx.fillRect(ox + lt.x - 14, oy + lt.y - 50, 28, 50);
    ctx.strokeRect(ox + lt.x - 14, oy + lt.y - 50, 28, 50);
  }
  for (const pk of (rm.pickups || [])) {
    ctx.fillStyle = pk.kind === 'relic' ? COLORS.goldBright : COLORS.cyanBright;
    ctx.beginPath(); ctx.arc(ox + pk.x, oy + pk.y - 24, 11, 0, Math.PI * 2); ctx.fill();
  }

  // Enemies + Patrol Bars
  for (const e of (rm.enemies || [])) {
    const ew = e.kind === 'golem' ? 46 : 36;
    const eh = e.kind === 'golem' ? 78 : e.kind === 'wraith' ? 48 : 62;
    if (e.minX !== undefined && e.maxX !== undefined) {
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.35)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(ox + e.minX, oy + e.y + eh - 4);
      ctx.lineTo(ox + e.maxX + ew, oy + e.y + eh - 4);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = e.kind === 'golem' ? 'rgba(251, 146, 60, 0.72)' : e.kind === 'wraith' ? 'rgba(244, 63, 94, 0.72)' : 'rgba(220, 38, 38, 0.72)';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.4 / state.cam.zoom;
    ctx.fillRect(ox + e.x, oy + e.y, ew, eh);
    ctx.strokeRect(ox + e.x, oy + e.y, ew, eh);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(e.kind === 'golem' ? '铁' : e.kind === 'wraith' ? '灵' : '矛', ox + e.x + ew / 2, oy + e.y + eh / 2 + 4);
  }

  // Bosses
  for (const b of (rm.bosses || [])) {
    ctx.fillStyle = 'rgba(185, 28, 28, 0.75)';
    ctx.strokeStyle = COLORS.goldBright;
    ctx.lineWidth = 2.4 / state.cam.zoom;
    ctx.fillRect(ox + b.x, oy + b.y, 58, 102);
    ctx.strokeRect(ox + b.x, oy + b.y, 58, 102);
    ctx.fillStyle = COLORS.goldBright;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.id === 'boss_ji' ? '寂' : '晦', ox + b.x + 29, oy + b.y + 54);
  }

  // Inscriptions
  ctx.font = '11px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  for (const ins of (rm.inscriptions || [])) {
    ctx.fillStyle = 'rgba(216, 207, 184, 0.72)';
    ctx.fillText(ins.text || `[${ins.dynamicKey}]`, ox + ins.x, oy + ins.y);
  }

  // Room Outline
  ctx.strokeStyle = isGhost ? 'rgba(216, 207, 184, 0.28)' : COLORS.gold;
  ctx.lineWidth = (isGhost ? 1.2 : 2.2) / state.cam.zoom;
  ctx.setLineDash(isGhost ? [6, 6] : []);
  ctx.strokeRect(ox, oy, rm.bounds.w, rm.bounds.h);
  ctx.setLineDash([]);

  // Room Title Tag
  ctx.fillStyle = isGhost ? 'rgba(216, 207, 184, 0.65)' : COLORS.goldBright;
  ctx.font = `bold ${Math.round(13 / Math.max(0.45, state.cam.zoom))}px "Noto Serif SC", serif`;
  ctx.textAlign = 'left';
  ctx.fillText(`${rm.id} · ${rm.name}`, ox + 8, oy - 8 / state.cam.zoom);

  ctx.restore();
}

function draw() {
  if (!state.bundle) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  const vw = rect.width;
  const vh = rect.height;
  ctx.clearRect(0, 0, vw, vh);

  ctx.save();
  ctx.scale(state.cam.zoom, state.cam.zoom);
  ctx.translate(-state.cam.x, -state.cam.y);

  // Subtle Grid
  const step = Math.max(20, state.gridSize * (state.cam.zoom < 0.45 ? 4 : 2));
  const x0 = Math.floor(state.cam.x / step) * step;
  const y0 = Math.floor(state.cam.y / step) * step;
  const x1 = state.cam.x + vw / state.cam.zoom;
  const y1 = state.cam.y + vh / state.cam.zoom;
  ctx.strokeStyle = 'rgba(216, 207, 184, 0.05)';
  ctx.lineWidth = 1 / state.cam.zoom;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += step) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
  for (let y = y0; y <= y1; y += step) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
  ctx.stroke();

  if (state.viewMode === 'world') {
    state.bundle.rooms.forEach((rm, idx) => {
      drawRoomContents(rm, idx !== state.activeRoomIdx);
    });
  } else {
    // Draw neighbor rooms ghosted so room exits align cleanly
    state.bundle.rooms.forEach((rm, idx) => {
      if (idx !== state.activeRoomIdx) drawRoomContents(rm, true);
    });
    const active = getActiveRoom();
    if (active) drawRoomContents(active, false);
  }

  // Active Selection Outline & Resize Handles
  if (state.viewMode === 'room') {
    const sel = getSelectedItem();
    if (sel) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2 / state.cam.zoom;
      ctx.setLineDash([5 / state.cam.zoom, 3 / state.cam.zoom]);
      ctx.strokeRect(sel.wx - 2, sel.wy - 2, sel.w + 4, sel.h + 4);
      ctx.setLineDash([]);
      if (sel.resizable) {
        const hs = 8 / state.cam.zoom;
        ctx.fillStyle = COLORS.goldBright;
        [
          [sel.wx, sel.wy],
          [sel.wx + sel.w, sel.wy],
          [sel.wx, sel.wy + sel.h],
          [sel.wx + sel.w, sel.wy + sel.h]
        ].forEach(([hx, hy]) => {
          ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
        });
      }
      ctx.restore();
    }

    // Rect Creation Preview
    if (state.drag && state.drag.mode === 'createRect') {
      const rx = Math.min(state.drag.startX, state.drag.curX);
      const ry = Math.min(state.drag.startY, state.drag.curY);
      const rw = Math.abs(state.drag.curX - state.drag.startX);
      const rh = Math.abs(state.drag.curY - state.drag.startY);
      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.strokeStyle = COLORS.cyanBright;
      ctx.lineWidth = 2 / state.cam.zoom;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.restore();
    }
  }

  ctx.restore();
}

// ==================== UI SIDEBARS ====================
function renderRoomList() {
  if (!state.bundle) return;
  roomListEl.innerHTML = '';
  state.bundle.rooms.forEach((rm, idx) => {
    const btn = document.createElement('button');
    btn.className = `room-item${idx === state.activeRoomIdx ? ' active' : ''}`;
    const count = (rm.solids || []).length + (rm.enemies || []).length + (rm.lanterns || []).length + (rm.pickups || []).length;
    btn.innerHTML = `
      <div class="room-item-title"><span>${rm.name}</span><span style="font-size:10.5px;color:var(--dim);">${rm.id}</span></div>
      <div class="room-item-meta">${rm.bounds.w}×${rm.bounds.h} · 偏移 (${rm.bounds.x}, ${rm.bounds.y}) · ${count} 物件</div>
    `;
    btn.addEventListener('click', () => {
      state.activeRoomIdx = idx;
      state.selection = null;
      renderAllUI();
      fitView();
    });
    roomListEl.appendChild(btn);
  });
}

function addField(parent, labelText, value, type, onChange) {
  const lbl = document.createElement('label');
  lbl.textContent = labelText;
  let inp;
  if (type === 'textarea') {
    inp = document.createElement('textarea');
    inp.className = 'prop-input';
    inp.value = value ?? '';
  } else if (Array.isArray(type)) {
    inp = document.createElement('select');
    inp.className = 'prop-input';
    for (const optVal of type) {
      const opt = document.createElement('option');
      opt.value = optVal;
      opt.textContent = optVal;
      if (optVal === value) opt.selected = true;
      inp.appendChild(opt);
    }
  } else {
    inp = document.createElement('input');
    inp.type = type;
    inp.className = 'prop-input';
    inp.value = value ?? '';
  }
  inp.addEventListener('change', () => {
    pushUndo();
    const val = type === 'number' ? Number(inp.value) : inp.value;
    onChange(val);
    syncManifestFromRooms();
    renderRoomList();
    draw();
  });
  parent.append(lbl, inp);
}

function renderRoomProps() {
  const rm = getActiveRoom();
  roomPropsEl.innerHTML = '';
  if (!rm) return;
  addField(roomPropsEl, '房间ID', rm.id, 'text', v => { rm.id = v.trim() || rm.id; });
  addField(roomPropsEl, '大区名', rm.zoneName, 'text', v => { rm.zoneName = v; });
  addField(roomPropsEl, '房间名', rm.name, 'text', v => { rm.name = v; });
  addField(roomPropsEl, '生态主题', rm.theme || 'corridor', ['sanctuary', 'corridor', 'chapel', 'bell_well', 'foundry'], v => { rm.theme = v; });
  addField(roomPropsEl, '世界 X', rm.bounds.x, 'number', v => { rm.bounds.x = v; });
  addField(roomPropsEl, '世界 Y', rm.bounds.y, 'number', v => { rm.bounds.y = v; });
  addField(roomPropsEl, '宽度 W', rm.bounds.w, 'number', v => { rm.bounds.w = Math.max(320, v); });
  addField(roomPropsEl, '高度 H', rm.bounds.h, 'number', v => { rm.bounds.h = Math.max(320, v); });
}

function renderInspector() {
  const sel = getSelectedItem();
  inspectorEl.innerHTML = '';
  if (!sel) {
    inspectorEl.textContent = '点击画布中的任意平台、敌兵或机关以编辑属性（均为房间内局部坐标）。';
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'prop-grid';
  const o = sel.obj;

  addField(grid, '类别', sel.kind, 'text', () => {});
  grid.lastChild.disabled = true;

  if (o.id !== undefined) addField(grid, 'ID', o.id, 'text', v => { o.id = v; });
  if (o.type !== undefined) addField(grid, '形态', o.type, ['ground', 'pillar', 'platform'], v => { o.type = v; });
  if (o.kind !== undefined && sel.kind === 'enemy') addField(grid, '兵种', o.kind, ['sentinel', 'wraith', 'golem'], v => { o.kind = v; });
  if (o.kind !== undefined && sel.kind === 'pickup') addField(grid, '秘宝类', o.kind, ['flaskCore', 'relic', 'ability'], v => { o.kind = v; });

  if (o.x !== undefined) addField(grid, '局部 X', o.x, 'number', v => { o.x = v; });
  if (o.y !== undefined) addField(grid, '局部 Y', o.y, 'number', v => { o.y = v; });
  if (o.cageX !== undefined) addField(grid, '钟笼 X', o.cageX, 'number', v => { o.cageX = v; });
  if (o.cageY !== undefined) addField(grid, '钟笼 Y', o.cageY, 'number', v => { o.cageY = v; });
  if (o.anchorY !== undefined) addField(grid, '挂点 Y', o.anchorY, 'number', v => { o.anchorY = v; });
  if (o.w !== undefined) addField(grid, '宽度 W', o.w, 'number', v => { o.w = Math.max(12, v); });
  if (o.h !== undefined) addField(grid, '高度 H', o.h, 'number', v => { o.h = Math.max(10, v); });
  if (o.len !== undefined) addField(grid, '索长', o.len, 'number', v => { o.len = Math.max(40, v); });
  if (o.minX !== undefined) addField(grid, '巡逻左', o.minX, 'number', v => { o.minX = v; });
  if (o.maxX !== undefined) addField(grid, '巡逻右', o.maxX, 'number', v => { o.maxX = v; });
  if (o.maxHp !== undefined) addField(grid, '耐久', o.maxHp, 'number', v => { o.maxHp = Math.max(1, v); });
  if (o.noteFreq !== undefined) addField(grid, '音高Hz', o.noteFreq, 'number', v => { o.noteFreq = v; });
  if (o.timeLimit !== undefined) addField(grid, '限时(s)', o.timeLimit, 'number', v => { o.timeLimit = Math.max(2, v); });
  if (o.name !== undefined) addField(grid, '名称', o.name, 'text', v => { o.name = v; });
  if (o.title !== undefined) addField(grid, '标题', o.title, 'text', v => { o.title = v; });
  if (o.text !== undefined) addField(grid, '铭文', o.text, 'text', v => { o.text = v; });
  if (o.desc !== undefined) addField(grid, '描述', o.desc, 'textarea', v => { o.desc = v; });

  inspectorEl.appendChild(grid);

  const actions = document.createElement('div');
  actions.className = 'prop-actions';
  const dupBtn = document.createElement('button');
  dupBtn.className = 'ed-btn';
  dupBtn.textContent = '复制 [Ctrl+D]';
  dupBtn.addEventListener('click', duplicateSelected);

  const delBtn = document.createElement('button');
  delBtn.className = 'ed-btn danger';
  delBtn.textContent = '删除 [Del]';
  delBtn.addEventListener('click', deleteSelected);

  actions.append(dupBtn, delBtn);
  inspectorEl.appendChild(actions);
}

function renderAllUI() {
  renderRoomList();
  renderRoomProps();
  renderInspector();
  const rm = getActiveRoom();
  statusInfoEl.textContent = rm
    ? `房间 ${rm.id} (${rm.bounds.w}×${rm.bounds.h}) · 工具: ${state.tool} · 缩放: ${Math.round(state.cam.zoom * 100)}%`
    : '就绪';
}

// ==================== OBJECT CREATION / EDITING ====================
function createPointObject(tool, lx, ly) {
  const rm = getActiveRoom();
  if (!rm) return;
  pushUndo();
  const uid = `${tool}_${Date.now().toString(36).slice(-4)}`;
  if (tool === 'sentinel' || tool === 'wraith' || tool === 'golem') {
    const obj = tool === 'wraith'
      ? { id: uid, kind: 'wraith', x: lx - 18, y: ly - 24 }
      : { id: uid, kind: tool, x: lx - 20, y: ly - (tool === 'golem' ? 78 : 62), minX: lx - 160, maxX: lx + 160 };
    rm.enemies.push(obj);
    state.selection = { kind: 'enemy', idx: rm.enemies.length - 1 };
  } else if (tool === 'lantern') {
    rm.lanterns.push({ id: uid, x: lx, anchorY: Math.max(0, ly - 150), len: 150, angle: 0.05 });
    state.selection = { kind: 'lantern', idx: rm.lanterns.length - 1 };
  } else if (tool === 'anchor') {
    rm.grappleAnchors.push({ id: uid, x: lx, y: ly, topY: 0 });
    state.selection = { kind: 'anchor', idx: rm.grappleAnchors.length - 1 };
  } else if (tool === 'pendulum') {
    rm.pendulums.push({ id: uid, x: lx, anchorY: Math.max(0, ly - 180), len: 180, amp: 0.65, speed: 1.7, phase: 0, r: 28 });
    state.selection = { kind: 'pendulum', idx: rm.pendulums.length - 1 };
  } else if (tool === 'altar') {
    rm.altars.push({ id: uid, x: lx, y: ly, name: `${rm.name} · 祭坛`, shortName: `${rm.name}祭坛`, defaultLit: false });
    state.selection = { kind: 'altar', idx: rm.altars.length - 1 };
  } else if (tool === 'pickup') {
    rm.pickups.push({ id: uid, kind: 'flaskCore', x: lx, y: ly, name: '灯油残芯', desc: '灯油上限永久 +1！' });
    state.selection = { kind: 'pickup', idx: rm.pickups.length - 1 };
  } else if (tool === 'lore') {
    rm.loreTablets.push({ id: uid, x: lx, y: ly, title: '风化残碑', sub: rm.name, html: '“新刻的晦渊铭文……”' });
    state.selection = { kind: 'lore', idx: rm.loreTablets.length - 1 };
  } else if (tool === 'inscription') {
    rm.inscriptions.push({ x: lx, y: ly, text: '「在此镌刻指引」' });
    state.selection = { kind: 'inscription', idx: rm.inscriptions.length - 1 };
  } else if (tool === 'banner') {
    rm.props.banners.push({ x: lx, y: ly, len: 150, color: '#33151e' });
    state.selection = { kind: 'banner', idx: rm.props.banners.length - 1 };
  } else if (tool === 'candle') {
    rm.props.candles.push({ x: lx, y: ly, count: 3 });
    state.selection = { kind: 'candle', idx: rm.props.candles.length - 1 };
  }
  renderAllUI();
  draw();
}

function createRectObject(tool, lx, ly, w, h) {
  const rm = getActiveRoom();
  if (!rm) return;
  if (w < 16 || h < 10) return;
  pushUndo();
  const uid = `${tool}_${Date.now().toString(36).slice(-4)}`;
  if (tool === 'ground' || tool === 'pillar' || tool === 'platform') {
    rm.solids.push({ x: lx, y: ly, w, h: tool === 'platform' ? Math.max(18, Math.min(28, h)) : h, type: tool });
    state.selection = { kind: 'solid', idx: rm.solids.length - 1 };
  } else if (tool === 'crumble') {
    rm.crumblePlatforms.push({ id: uid, x: lx, y: ly, w, h: 20 });
    state.selection = { kind: 'crumble', idx: rm.crumblePlatforms.length - 1 };
  } else if (tool === 'secretWall') {
    rm.secretWalls.push({ id: uid, x: lx, y: ly, w, h, maxHp: 3 });
    state.selection = { kind: 'secretWall', idx: rm.secretWalls.length - 1 };
  } else if (tool === 'river') {
    rm.rivers.push({ id: uid, x: lx, y: ly, w });
    state.selection = { kind: 'river', idx: rm.rivers.length - 1 };
  }
  renderAllUI();
  draw();
}

function deleteSelected() {
  const sel = getSelectedItem();
  if (!sel || !sel.arr) return;
  if (sel.kind === 'boss') {
    showToast('Boss 节点受保护，可在右侧调整其坐标');
    return;
  }
  pushUndo();
  sel.arr.splice(sel.idx, 1);
  state.selection = null;
  renderAllUI();
  draw();
}

function duplicateSelected() {
  const sel = getSelectedItem();
  if (!sel || !sel.arr || sel.kind === 'boss') return;
  pushUndo();
  const copy = JSON.parse(JSON.stringify(sel.obj));
  if (copy.id) copy.id = `${copy.id}_c`;
  if (copy.x !== undefined) copy.x += 30;
  if (copy.y !== undefined) copy.y -= 20;
  if (copy.minX !== undefined) copy.minX += 30;
  if (copy.maxX !== undefined) copy.maxX += 30;
  sel.arr.push(copy);
  state.selection = { kind: sel.kind, idx: sel.arr.length - 1, parentIdx: sel.parentIdx };
  renderAllUI();
  draw();
}

// ==================== MOUSE & KEYBOARD INTERACTION ====================
canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('mousedown', e => {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const wpt = screenToWorld(sx, sy);

  // Pan with Right or Middle Mouse
  if (e.button === 1 || e.button === 2) {
    state.drag = { mode: 'pan', startSx: sx, startSy: sy, origCamX: state.cam.x, origCamY: state.cam.y };
    return;
  }
  if (e.button !== 0) return;

  // World Overview: select & drag entire rooms
  if (state.viewMode === 'world') {
    for (let i = state.bundle.rooms.length - 1; i >= 0; i--) {
      const b = state.bundle.rooms[i].bounds;
      if (wpt.x >= b.x && wpt.x <= b.x + b.w && wpt.y >= b.y && wpt.y <= b.y + b.h) {
        state.activeRoomIdx = i;
        state.selection = null;
        state.drag = {
          mode: 'moveRoom',
          roomIdx: i,
          startWx: wpt.x,
          startWy: wpt.y,
          origX: b.x,
          origY: b.y,
          pushed: false
        };
        renderAllUI();
        draw();
        return;
      }
    }
    return;
  }

  const rm = getActiveRoom();
  if (!rm) return;

  // Select / Move / Resize
  if (state.tool === 'select') {
    const curSel = getSelectedItem();
    const handle = hitTestHandle(curSel, wpt.x, wpt.y);
    if (handle) {
      state.drag = {
        mode: 'resize',
        handle,
        item: curSel,
        startWx: wpt.x,
        startWy: wpt.y,
        orig: { x: curSel.obj.x, y: curSel.obj.y, w: curSel.obj.w, h: curSel.obj.h },
        pushed: false
      };
      return;
    }
    const hit = hitTestObject(rm, wpt.x, wpt.y);
    if (hit) {
      state.selection = { kind: hit.kind, idx: hit.idx, parentIdx: hit.parentIdx };
      const xKey = hit.xKey || 'x';
      const yKey = hit.yKey || 'y';
      state.drag = {
        mode: 'moveObj',
        item: hit,
        xKey,
        yKey,
        startWx: wpt.x,
        startWy: wpt.y,
        origX: hit.obj[xKey],
        origY: hit.obj[yKey],
        origMinX: hit.obj.minX,
        origMaxX: hit.obj.maxX,
        pushed: false
      };
      renderInspector();
      draw();
      return;
    }
    state.selection = null;
    renderInspector();
    draw();
    return;
  }

  // Drawing Rectangle Tools
  if (RECT_TOOLS.has(state.tool)) {
    const sxSnap = snap(wpt.x);
    const sySnap = snap(wpt.y);
    state.drag = { mode: 'createRect', startX: sxSnap, startY: sySnap, curX: sxSnap, curY: sySnap };
    draw();
    return;
  }

  // Point Placement Tools
  const lx = snap(wpt.x - rm.bounds.x);
  const ly = snap(wpt.y - rm.bounds.y);
  createPointObject(state.tool, lx, ly);
});

window.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const wpt = screenToWorld(sx, sy);
  state.hoverWorld = wpt;
  const rm = getActiveRoom();
  if (rm) {
    statusPosEl.textContent = `房间坐标: (${Math.round(wpt.x - rm.bounds.x)}, ${Math.round(wpt.y - rm.bounds.y)}) | 世界坐标: (${Math.round(wpt.x)}, ${Math.round(wpt.y)})`;
  }

  if (!state.drag) return;
  if (state.drag.mode === 'pan') {
    state.cam.x = state.drag.origCamX - (sx - state.drag.startSx) / state.cam.zoom;
    state.cam.y = state.drag.origCamY - (sy - state.drag.startSy) / state.cam.zoom;
    draw();
  } else if (state.drag.mode === 'moveRoom') {
    if (!state.drag.pushed) { pushUndo(); state.drag.pushed = true; }
    const b = state.bundle.rooms[state.drag.roomIdx].bounds;
    b.x = snap(state.drag.origX + (wpt.x - state.drag.startWx));
    b.y = snap(state.drag.origY + (wpt.y - state.drag.startWy));
    syncManifestFromRooms();
    draw();
  } else if (state.drag.mode === 'moveObj') {
    if (!state.drag.pushed) { pushUndo(); state.drag.pushed = true; }
    const dx = snap(wpt.x - state.drag.startWx);
    const dy = snap(wpt.y - state.drag.startWy);
    const o = state.drag.item.obj;
    o[state.drag.xKey] = state.drag.origX + dx;
    o[state.drag.yKey] = state.drag.origY + dy;
    if (state.drag.origMinX !== undefined) {
      o.minX = state.drag.origMinX + dx;
      o.maxX = state.drag.origMaxX + dx;
    }
    draw();
  } else if (state.drag.mode === 'resize') {
    if (!state.drag.pushed) { pushUndo(); state.drag.pushed = true; }
    const dx = snap(wpt.x - state.drag.startWx);
    const dy = snap(wpt.y - state.drag.startWy);
    const o = state.drag.item.obj;
    const orig = state.drag.orig;
    const h = state.drag.handle;
    if (h.includes('e')) o.w = Math.max(20, orig.w + dx);
    if (h.includes('s') && o.h !== undefined) o.h = Math.max(14, orig.h + dy);
    if (h.includes('w')) {
      const nw = Math.max(20, orig.w - dx);
      o.x = orig.x + (orig.w - nw);
      o.w = nw;
    }
    if (h.includes('n') && o.h !== undefined) {
      const nh = Math.max(14, orig.h - dy);
      o.y = orig.y + (orig.h - nh);
      o.h = nh;
    }
    draw();
  } else if (state.drag.mode === 'createRect') {
    state.drag.curX = snap(wpt.x);
    state.drag.curY = snap(wpt.y);
    draw();
  }
});

window.addEventListener('mouseup', () => {
  if (!state.drag) return;
  const d = state.drag;
  state.drag = null;
  if (d.mode === 'createRect') {
    const rm = getActiveRoom();
    if (rm) {
      const rx = Math.min(d.startX, d.curX) - rm.bounds.x;
      const ry = Math.min(d.startY, d.curY) - rm.bounds.y;
      const rw = Math.abs(d.curX - d.startX);
      const rh = Math.abs(d.curY - d.startY);
      createRectObject(state.tool, rx, ry, rw, rh);
    }
  } else if (d.mode === 'moveObj' || d.mode === 'resize' || d.mode === 'moveRoom') {
    renderAllUI();
    draw();
  }
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const before = screenToWorld(sx, sy);
  const factor = e.deltaY < 0 ? 1.12 : 0.89;
  state.cam.zoom = Math.max(0.15, Math.min(2.5, state.cam.zoom * factor));
  state.cam.x = before.x - sx / state.cam.zoom;
  state.cam.y = before.y - sy / state.cam.zoom;
  renderAllUI();
  draw();
}, { passive: false });

window.addEventListener('keydown', e => {
  if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  if (e.code === 'KeyV') setTool('select');
  else if (e.code === 'KeyF') fitView();
  else if (e.code === 'Delete' || e.code === 'Backspace') { e.preventDefault(); deleteSelected(); }
  else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') { e.preventDefault(); duplicateSelected(); }
  else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); doUndo(); }
  else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') { e.preventDefault(); doRedo(); }
});

function setTool(tool) {
  state.tool = tool;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
  renderAllUI();
}

function doUndo() {
  if (state.undoStack.length === 0) return;
  state.redoStack.push(cloneBundle());
  state.bundle = state.undoStack.pop();
  state.activeRoomIdx = Math.min(state.activeRoomIdx, state.bundle.rooms.length - 1);
  state.selection = null;
  renderAllUI();
  draw();
  showToast('已撤销');
}

function doRedo() {
  if (state.redoStack.length === 0) return;
  state.undoStack.push(cloneBundle());
  state.bundle = state.redoStack.pop();
  state.selection = null;
  renderAllUI();
  draw();
  showToast('已重做');
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ==================== WIRE BUTTONS ====================
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});
document.getElementById('sel-grid').addEventListener('change', e => {
  state.gridSize = Number(e.target.value) || 10;
  draw();
});
document.getElementById('btn-view-room').addEventListener('click', () => {
  state.viewMode = 'room';
  document.getElementById('btn-view-room').classList.add('active');
  document.getElementById('btn-view-world').classList.remove('active');
  fitView();
});
document.getElementById('btn-view-world').addEventListener('click', () => {
  state.viewMode = 'world';
  document.getElementById('btn-view-world').classList.add('active');
  document.getElementById('btn-view-room').classList.remove('active');
  fitView();
});
document.getElementById('btn-fit').addEventListener('click', fitView);
document.getElementById('btn-undo').addEventListener('click', doUndo);
document.getElementById('btn-redo').addEventListener('click', doRedo);

document.getElementById('btn-add-room').addEventListener('click', () => {
  if (!state.bundle) return;
  pushUndo();
  let maxX = 0;
  for (const r of state.bundle.rooms) maxX = Math.max(maxX, r.bounds.x + r.bounds.w);
  const n = state.bundle.rooms.length + 1;
  const rid = `r${String(n).padStart(2, '0')}_custom`;
  const newRoom = {
    schemaVersion: 1,
    id: rid,
    zoneName: '新建区域',
    name: `新房间 ${n}`,
    theme: 'corridor',
    bounds: { x: maxX, y: 0, w: 1200, h: 720 },
    subZones: [{ name: `新建区域 · 新房间 ${n}`, x: 0, y: 0, w: 1200, h: 720 }],
    connections: [],
    solids: [
      { x: 0, y: 580, w: 1200, h: 140, type: 'ground' },
      { x: 480, y: 430, w: 200, h: 22, type: 'platform' }
    ],
    crumblePlatforms: [],
    altars: [],
    loreTablets: [],
    gates: [],
    secretWalls: [],
    pickups: [],
    resonancePuzzles: [],
    pendulums: [],
    rivers: [],
    grappleAnchors: [{ id: `anc_${rid}`, x: 580, y: 240, topY: 0 }],
    lanterns: [{ id: `lan_${rid}`, x: 360, anchorY: 160, len: 150, angle: 0.04 }],
    enemies: [],
    bosses: [],
    inscriptions: [],
    props: { puddles: [], banners: [], candles: [], boneCairns: [] }
  };
  state.bundle.rooms.push(newRoom);
  syncManifestFromRooms();
  state.activeRoomIdx = state.bundle.rooms.length - 1;
  state.selection = null;
  renderAllUI();
  fitView();
  showToast(`已新建房间 ${rid}`);
});

document.getElementById('btn-playtest').addEventListener('click', () => {
  if (!state.bundle) return;
  syncManifestFromRooms();
  try {
    localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(state.bundle));
    const rm = getActiveRoom();
    const q = rm ? `&room=${encodeURIComponent(rm.id)}` : '';
    window.location.href = `./index.html?preview=1${q}`;
  } catch (err) {
    showToast(`写入试玩缓存失败: ${err.message}`);
  }
});

document.getElementById('btn-save-disk').addEventListener('click', async () => {
  if (!state.bundle) return;
  syncManifestFromRooms();
  try {
    const resp = await fetch('/api/save-bundle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.bundle)
    });
    const res = await resp.json();
    if (resp.ok && res.ok) {
      localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(state.bundle));
      showToast(`已直接保存 ${res.saved.length} 个 JSON 文件到本地 data/ 目录！`);
    } else {
      showToast(`保存失败: ${res.error || resp.status}（静态站点请用导出 JSON）`);
    }
  } catch {
    showToast('当前环境无本地写盘服务，请点击「导出房间」或通过 serve_local.py 启动');
  }
});

document.getElementById('btn-export-room').addEventListener('click', () => {
  const rm = getActiveRoom();
  if (!rm) return;
  downloadJson(`${rm.id}.json`, rm);
  showToast(`已导出 ${rm.id}.json`);
});

document.getElementById('btn-export-world').addEventListener('click', () => {
  if (!state.bundle) return;
  syncManifestFromRooms();
  downloadJson('ashen_bell_vow_world_bundle.json', state.bundle);
  showToast('已导出完整世界合并包 JSON');
});

document.getElementById('file-import').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    pushUndo();
    if (data && data.world && Array.isArray(data.rooms)) {
      state.bundle = data;
      state.activeRoomIdx = 0;
      showToast(`已导入完整世界（${data.rooms.length} 个房间）`);
    } else if (data && data.id && data.bounds && Array.isArray(data.solids)) {
      const idx = state.bundle.rooms.findIndex(r => r.id === data.id);
      if (idx >= 0) {
        state.bundle.rooms[idx] = data;
        state.activeRoomIdx = idx;
      } else {
        state.bundle.rooms.push(data);
        state.activeRoomIdx = state.bundle.rooms.length - 1;
      }
      syncManifestFromRooms();
      showToast(`已导入房间 ${data.id}`);
    } else {
      showToast('JSON 格式不符合房间或世界规范');
    }
    state.selection = null;
    renderAllUI();
    fitView();
  } catch (err) {
    showToast(`解析 JSON 失败: ${err.message}`);
  }
  e.target.value = '';
});

// ==================== BOOTSTRAP EDITOR ====================
async function bootEditor() {
  try {
    // Load live preview draft if returning from playtest, otherwise load disk JSON
    let loaded = null;
    try {
      const raw = localStorage.getItem(PREVIEW_STORAGE_KEY);
      if (raw && new URLSearchParams(window.location.search).has('room')) {
        loaded = JSON.parse(raw);
      }
    } catch {}

    if (!loaded) {
      const wResp = await fetch('./data/world.json', { cache: 'no-cache' });
      const world = await wResp.json();
      const rooms = await Promise.all(
        world.rooms.map(async entry => {
          const rResp = await fetch(entry.file, { cache: 'no-cache' });
          const data = await rResp.json();
          return { ...data, bounds: entry.bounds || data.bounds };
        })
      );
      loaded = { world, rooms };
    }

    state.bundle = loaded;
    const reqRoom = new URLSearchParams(window.location.search).get('room');
    if (reqRoom) {
      const idx = state.bundle.rooms.findIndex(r => r.id === reqRoom);
      if (idx >= 0) state.activeRoomIdx = idx;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    renderAllUI();
    fitView();
    showToast(`已载入 ${state.bundle.rooms.length} 个房间 JSON`);
  } catch (err) {
    showToast(`加载失败: ${err.message}（请通过 serve_local.py 启动）`);
  }
}

bootEditor();
