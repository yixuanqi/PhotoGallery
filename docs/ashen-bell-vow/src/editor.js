// Zero-dependency Web Level Editor v34.0 for Full-Biome Room-Based JSON Data Stream
import { COLORS, GRAVITY, PREVIEW_STORAGE_KEY, RELICS, ENEMY_ECHO_REWARDS, SMITH_UPGRADES, RELIC_REFINE_COST } from './config.js';
import { STAMP_DEFS, getStampDef, drawStampPreview } from './stampAtlas.js';
import { runTopologyAndShaftAudit } from './editorTopology.js';
import { TERRAIN_OVERLAY_OPTIONS, drawEditorRoomBackdrop, drawEditorRoomSolids } from './renderTerrain.js';

const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');
const roomListEl = document.getElementById('room-list');
const roomPropsEl = document.getElementById('room-props');
const inspectorEl = document.getElementById('obj-inspector');
const statusPosEl = document.getElementById('status-pos');
const statusInfoEl = document.getElementById('status-info');
const toastEl = document.getElementById('ed-toast');
const auditPanelEl = document.getElementById('audit-panel');
const auditListEl = document.getElementById('audit-list');
const auditSummaryEl = document.getElementById('audit-summary');

const RECT_TOOLS = new Set([
  'ground', 'pillar', 'platform', 'crumble', 'secretWall', 'voidBarrier', 'river', 'windZone', 'bouncePad'
]);

const ENEMY_META = {
  sentinel:        { w: 36, h: 62, glyph: '矛', color: 'rgba(220, 38, 38, 0.74)',  patrol: 160, label: '持矛哨兵' },
  wraith:          { w: 36, h: 48, glyph: '灵', color: 'rgba(244, 63, 94, 0.76)',  patrol: 0,   label: '悬灯怨灵', flying: true },
  golem:           { w: 46, h: 78, glyph: '铁', color: 'rgba(251, 146, 60, 0.78)', patrol: 160, label: '守钟铁卫' },
  priest:          { w: 36, h: 66, glyph: '祭', color: 'rgba(192, 132, 252, 0.80)', patrol: 0,  label: '敲钟祭司' },
  duelist:         { w: 34, h: 60, glyph: '刃', color: 'rgba(239, 68, 68, 0.84)',  patrol: 170, label: '连刃武者' },
  leech:           { w: 34, h: 38, glyph: '蛭', color: 'rgba(56, 189, 248, 0.78)', patrol: 0,   label: '倒挂墨蛭', ceiling: true },
  dummy:           { w: 38, h: 68, glyph: '偶', color: 'rgba(245, 158, 11, 0.80)', patrol: 120, label: '演武钟偶' },
  falcon:          { w: 44, h: 34, glyph: '隼', color: 'rgba(56, 189, 248, 0.86)', patrol: 0,   label: '衔铃风隼', flying: true },
  fungus:          { w: 40, h: 58, glyph: '菌', color: 'rgba(34, 197, 94, 0.82)',  patrol: 150, label: '孢蚀菌傀' },
  frostguard:      { w: 40, h: 68, glyph: '寒', color: 'rgba(125, 211, 252, 0.84)', patrol: 160, label: '寒戟骸卫' },
  drowned:         { w: 36, h: 60, glyph: '溺', color: 'rgba(14, 165, 233, 0.86)',  patrol: 160, label: '溺钟潜行者' },
  anchorite:       { w: 48, h: 78, glyph: '锚', color: 'rgba(148, 163, 184, 0.86)', patrol: 150, label: '锈锚重锤兵' },
  weaver:          { w: 44, h: 36, glyph: '蛛', color: 'rgba(110, 231, 183, 0.86)', patrol: 150, label: '墨丝织蛛' },
  crawler:         { w: 50, h: 42, glyph: '炉', color: 'rgba(251, 146, 60, 0.88)',  patrol: 160, label: '熔铜炉奴' },
  cantor:          { w: 36, h: 72, glyph: '侍', color: 'rgba(253, 224, 71, 0.88)',  patrol: 0,   label: '金钟执灯侍', flying: true },
  warden_wind:     { w: 44, h: 72, glyph: '朔', color: 'rgba(14, 165, 233, 0.90)', patrol: 240, label: '截风巡塔使·朔', isWarden: true },
  warden_forest:   { w: 64, h: 98, glyph: '枯', color: 'rgba(22, 163, 74, 0.90)',  patrol: 150, label: '盘根古钟精·枯', isWarden: true },
  warden_mountain: { w: 42, h: 74, glyph: '凛', color: 'rgba(96, 165, 250, 0.90)', patrol: 210, label: '断剑霜侯·凛',   isWarden: true }
};

const ENEMY_KINDS = Object.keys(ENEMY_META);
const STAMP_CATS = ['全部', '通用', '风', '林', '火', '山', '渊'];

const state = {
  bundle: null, // { world, rooms: [...] }
  activeRoomIdx: 0,
  viewMode: 'room', // 'room' | 'world'
  renderMode: 'ink', // 'ink' (WYSIWYG procedural terrain) | 'wireframe'
  tool: 'select',
  activeStampType: 'broken_arch',
  stampCatFilter: '全部',
  gridSize: 10,
  cam: { x: -60, y: -40, zoom: 0.72 },
  selection: null, // { kind, idx, parentIdx? }
  undoStack: [],
  redoStack: [],
  drag: null,
  hoverWorld: { x: 0, y: 0 },
  hoverInsideCanvas: false,
  toastTimer: null,
  auditHighlight: false,
  auditTierOverlay: null, // null | 'T0_Start' .. 'T4_Endgame'
  lastAuditIssues: [],
  lastAuditTopo: null,
  roomAuditMap: new Map(),
  auditDebounceTimer: null
};

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  if (state.toastTimer) clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
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
  scheduleLiveAudit();
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

function centerCameraOn(wx, wy, targetZoom = null) {
  const rect = canvas.parentElement.getBoundingClientRect();
  const vw = Math.max(300, rect.width);
  const vh = Math.max(240, rect.height);
  if (targetZoom !== null) state.cam.zoom = targetZoom;
  state.cam.x = wx - vw / (2 * state.cam.zoom);
  state.cam.y = wy - vh / (2 * state.cam.zoom);
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

  // Large background volumes first so foreground platforms/entities win hit-testing
  (rm.windZones || []).forEach((o, i) => addRect('windZone', rm.windZones, i, o, Number(o.w) || 120, Number(o.h) || 320, true));
  (rm.solids || []).forEach((o, i) => addRect('solid', rm.solids, i, o, o.w, o.h, true));
  (rm.crumblePlatforms || []).forEach((o, i) => addRect('crumble', rm.crumblePlatforms, i, o, o.w, o.h, true));
  (rm.secretWalls || []).forEach((o, i) => addRect('secretWall', rm.secretWalls, i, o, o.w, o.h, true));
  (rm.voidBarriers || []).forEach((o, i) => addRect('voidBarrier', rm.voidBarriers, i, o, o.w, o.h, true));
  (rm.gates || []).forEach((o, i) => addRect('gate', rm.gates, i, o, o.w, o.h, true));
  (rm.rivers || []).forEach((o, i) => addRect('river', rm.rivers, i, o, o.w, 22, true));
  // BouncePads use bottom-center (x, y) in room JSON, matching player.js & renderer.js
  (rm.bouncePads || []).forEach((o, i) => {
    const bw = Number(o.w) || 78;
    const bh = Number(o.h) || 26;
    items.push({
      kind: 'bouncePad', arr: rm.bouncePads, idx: i, obj: o, resizable: true, bottomCenter: true,
      wx: ox + o.x - bw * 0.5, wy: oy + o.y - bh, w: bw, h: bh
    });
  });

  (rm.enemies || []).forEach((o, i) => {
    const m = ENEMY_META[o.kind] || ENEMY_META.sentinel;
    addRect('enemy', rm.enemies, i, o, m.w, m.h, false);
  });
  (rm.bosses || []).forEach((o, i) => addRect('boss', rm.bosses, i, o, 58, 102, false));
  (rm.altars || []).forEach((o, i) => addPoint('altar', rm.altars, i, o, 'x', 'y', 26));
  (rm.npcs || []).forEach((o, i) => addPoint('npc', rm.npcs, i, o, 'x', 'y', 26));
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
  (props.stamps || []).forEach((o, i) => {
    const def = getStampDef(o.type);
    const sc = Number(o.scale) || 1;
    const sw = def ? Math.max(36, def.w * sc) : 64;
    const sh = def ? Math.max(36, def.h * sc) : 64;
    const ax = def ? def.ax : 0.5;
    const ay = def ? def.ay : 0.5;
    const wx = ox + (Number(o.x) || 0);
    const wy = oy + (Number(o.y) || 0);
    items.push({
      kind: 'stamp', arr: props.stamps, idx: i, obj: o, xKey: 'x', yKey: 'y', resizable: false,
      wx: wx - sw * ax, wy: wy - sh * ay, w: sw, h: sh, cx: wx, cy: wy
    });
  });
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
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (wx >= it.wx && wx <= it.wx + it.w && wy >= it.wy && wy <= it.wy + it.h) {
      return it;
    }
  }
  return null;
}

// ==================== RENDERING ====================
function drawWindZonesInRoom(rm, ox, oy) {
  for (const wz of (rm.windZones || [])) {
    const x = ox + wz.x;
    const y = oy + wz.y;
    const w = Number(wz.w) || 120;
    const h = Number(wz.h) || 320;
    const vx = Number(wz.vx) || 0;
    const vy = Number(wz.vy) || -1480;

    ctx.save();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.13)';
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.72)';
    ctx.lineWidth = 1.6 / state.cam.zoom;
    ctx.setLineDash([7 / state.cam.zoom, 5 / state.cam.zoom]);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Flow chevrons along wind vector
    const mag = Math.max(1, Math.hypot(vx, vy));
    const ux = vx / mag;
    const uy = vy / mag;
    const ang = Math.atan2(uy, ux);
    const cols = Math.max(1, Math.min(4, Math.floor(w / 52)));
    const rows = Math.max(2, Math.min(7, Math.floor(h / 72)));
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.56)';
    ctx.lineWidth = 1.8 / state.cam.zoom;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const cx = x + ((c + 0.5) / cols) * w;
        const cy = y + ((r + 0.5) / rows) * h;
        const len = 14;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(-len * 0.6, 0);
        ctx.lineTo(len * 0.6, 0);
        ctx.moveTo(len * 0.12, -5.5);
        ctx.lineTo(len * 0.6, 0);
        ctx.lineTo(len * 0.12, 5.5);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Label readout
    ctx.fillStyle = '#bae6fd';
    ctx.font = `bold ${Math.round(10.5 / Math.max(0.55, state.cam.zoom))}px ui-monospace, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`风 (${vx}, ${vy})`, x + w * 0.5, y + 16 / Math.max(0.55, state.cam.zoom));
    ctx.restore();
  }
}

function drawBouncePadsInRoom(rm, ox, oy, isActiveRoom) {
  const sel = isActiveRoom ? getSelectedItem() : null;
  (rm.bouncePads || []).forEach((bp, idx) => {
    const bx = ox + bp.x;
    const by = oy + bp.y;
    const w = Number(bp.w) || 78;
    const h = Number(bp.h) || 26;
    const boostVy = Number(bp.boostVy) || -790;
    const hw = w * 0.5;
    const isSel = sel && sel.kind === 'bouncePad' && sel.idx === idx;

    ctx.save();
    // Physics Jump-Apex Trajectory Preview (H = v^2 / (2g))
    if (boostVy < 0) {
      const apexH = (boostVy * boostVy) / (2 * GRAVITY);
      const topY = by - h - apexH;
      ctx.strokeStyle = isSel ? 'rgba(110, 231, 183, 0.92)' : 'rgba(110, 231, 183, 0.36)';
      ctx.lineWidth = (isSel ? 2.0 : 1.3) / state.cam.zoom;
      ctx.setLineDash([6 / state.cam.zoom, 5 / state.cam.zoom]);
      ctx.beginPath();
      ctx.moveTo(bx, by - h);
      ctx.lineTo(bx, topY);
      ctx.stroke();
      ctx.setLineDash([]);
      // Apex horizontal clearance bar
      ctx.beginPath();
      ctx.moveTo(bx - 18, topY);
      ctx.lineTo(bx + 18, topY);
      ctx.stroke();
      ctx.fillStyle = isSel ? '#a7f3d0' : 'rgba(167, 243, 208, 0.72)';
      ctx.font = `bold ${Math.round(10 / Math.max(0.55, state.cam.zoom))}px ui-monospace, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`↑${Math.round(apexH)}px`, bx, topY - 4 / state.cam.zoom);
    }

    // Stalk
    ctx.fillStyle = '#142622';
    ctx.strokeStyle = 'rgba(110, 231, 183, 0.65)';
    ctx.lineWidth = 1.5 / state.cam.zoom;
    ctx.fillRect(bx - 9, by - h * 0.6, 18, h * 0.6);
    ctx.strokeRect(bx - 9, by - h * 0.6, 18, h * 0.6);

    // Emerald Mushroom Bounce Dome
    ctx.fillStyle = '#11332c';
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 2.0 / state.cam.zoom;
    ctx.beginPath();
    ctx.moveTo(bx - hw, by - h * 0.35);
    ctx.quadraticCurveTo(bx - hw * 0.8, by - h * 1.15, bx, by - h * 1.12);
    ctx.quadraticCurveTo(bx + hw * 0.8, by - h * 1.15, bx + hw, by - h * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('伞', bx, by - h * 0.45);
    ctx.restore();
  });
}

function drawRoomContents(rm, isGhost = false) {
  const ox = rm.bounds.x;
  const oy = rm.bounds.y;
  ctx.save();
  if (isGhost) ctx.globalAlpha = 0.24;

  // Room Bounds Frame / WYSIWYG Procedural Biome Sky Backdrop
  const isInk = state.renderMode === 'ink';
  if (isInk) {
    drawEditorRoomBackdrop(ctx, rm);
  } else {
    ctx.fillStyle = isGhost ? 'rgba(14, 20, 32, 0.35)' : 'rgba(13, 19, 32, 0.55)';
    ctx.fillRect(ox, oy, rm.bounds.w, rm.bounds.h);
  }

  // Background Procedural Ink Stamps (WYSIWYG preview)
  const rmProps = rm.props || {};
  for (const st of (rmProps.stamps || [])) {
    const def = getStampDef(st.type);
    const ly = st.layer || (def ? def.defaultLayer : 'bg');
    if (ly === 'bg') drawStampPreview(ctx, st, ox, oy);
  }

  // Wind Updraft Zones (behind solids/entities)
  drawWindZonesInRoom(rm, ox, oy);

  // Solids (WYSIWYG Procedural Organic Terrain vs Technical Wireframe)
  if (isInk) {
    ctx.save();
    // Clip slightly padded around room bounds so snow/icicle overhangs stay crisp
    ctx.beginPath();
    ctx.rect(ox - 24, oy - 24, rm.bounds.w + 48, rm.bounds.h + 48);
    ctx.clip();
    drawEditorRoomSolids(ctx, rm);
    ctx.restore();
    // Subtle badge indicator on solids with custom per-block terrain modifiers
    for (const s of (rm.solids || [])) {
      if (s.mod && (s.mod.overlay || s.mod.weathering !== undefined || s.mod.cracks !== undefined || s.mod.overlayDensity !== undefined)) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
        ctx.lineWidth = 1.1 / state.cam.zoom;
        ctx.setLineDash([4 / state.cam.zoom, 4 / state.cam.zoom]);
        ctx.strokeRect(ox + s.x + 1, oy + s.y + 1, Math.max(2, s.w - 2), Math.max(2, s.h - 2));
        ctx.setLineDash([]);
      }
    }
  } else {
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

  // Void Barriers
  for (const vb of (rm.voidBarriers || [])) {
    ctx.fillStyle = 'rgba(168, 85, 247, 0.34)';
    ctx.strokeStyle = '#d8b4fe';
    ctx.lineWidth = 2 / state.cam.zoom;
    ctx.fillRect(ox + vb.x, oy + vb.y, vb.w, vb.h);
    ctx.strokeRect(ox + vb.x, oy + vb.y, vb.w, vb.h);
  }

  // Gates (incl. v34.0 skyBridgeGate & v41.0 one-way bronze switchGates)
  for (const g of (rm.gates || [])) {
    const isSky = g.role === 'skyBridge' || g.id === 'gate_sky_bridge';
    const isSwGate = g.role === 'switchGate';
    ctx.fillStyle = isSky ? 'rgba(56, 189, 248, 0.28)' : isSwGate ? 'rgba(245, 158, 11, 0.30)' : 'rgba(220, 38, 38, 0.25)';
    ctx.strokeStyle = isSky ? '#bae6fd' : isSwGate ? '#fde047' : COLORS.goldBright;
    ctx.lineWidth = 2 / state.cam.zoom;
    ctx.fillRect(ox + g.x, oy + g.y, g.w, g.h);
    ctx.strokeRect(ox + g.x, oy + g.y, g.w, g.h);
    if (isSky) {
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.72)';
      ctx.lineWidth = 1.4 / state.cam.zoom;
      for (let bx = g.x + 8; bx < g.x + g.w - 4; bx += 10) {
        ctx.beginPath(); ctx.moveTo(ox + bx, oy + g.y); ctx.lineTo(ox + bx, oy + g.y + g.h); ctx.stroke();
      }
      ctx.fillStyle = '#e0f2fe';
      ctx.font = `bold ${Math.round(10.5 / Math.max(0.55, state.cam.zoom))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('天顶石门', ox + g.x + g.w * 0.5, oy + g.y - 6 / Math.max(0.55, state.cam.zoom));
    }
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

  // Glowing Spore Bounce Pads + Apex Preview
  drawBouncePadsInRoom(rm, ox, oy, !isGhost);

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

  // Altars, NPCs, Lore, Pickups
  for (const a of (rm.altars || [])) {
    ctx.fillStyle = COLORS.cyan;
    ctx.beginPath(); ctx.arc(ox + a.x, oy + a.y - 32, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('坛', ox + a.x, oy + a.y - 28);
  }
  for (const npc of (rm.npcs || [])) {
    ctx.fillStyle = npc.kind === 'keeper' ? COLORS.cyanBright : npc.kind === 'chronicler' ? COLORS.goldBright : COLORS.gold;
    ctx.beginPath(); ctx.arc(ox + npc.x, oy + npc.y - 30, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#090c12';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    const g = npc.kind === 'keeper' ? '汐' : npc.kind === 'chronicler' ? '墨' : '匠';
    ctx.fillText(g, ox + npc.x, oy + npc.y - 26);
  }
  for (const lt of (rm.loreTablets || [])) {
    ctx.fillStyle = '#253147';
    ctx.strokeStyle = COLORS.parchment;
    ctx.fillRect(ox + lt.x - 14, oy + lt.y - 50, 28, 50);
    ctx.strokeRect(ox + lt.x - 14, oy + lt.y - 50, 28, 50);
  }
  for (const bf of (rm.breakableFloors || [])) {
    ctx.fillStyle = bf.style === 'ice' ? 'rgba(56, 189, 248, 0.32)' : 'rgba(245, 158, 11, 0.32)';
    ctx.strokeStyle = bf.style === 'ice' ? '#bae6fd' : COLORS.goldBright; ctx.lineWidth = 2 / state.cam.zoom;
    ctx.fillRect(ox + bf.x, oy + bf.y, bf.w, bf.h); ctx.strokeRect(ox + bf.x, oy + bf.y, bf.w, bf.h);
  }
  for (const sw of (rm.worldSwitches || [])) {
    ctx.strokeStyle = sw.kind === 'sluice' ? COLORS.cyanBright : COLORS.goldBright; ctx.lineWidth = 2.4 / state.cam.zoom;
    ctx.beginPath(); ctx.arc(ox + sw.x, oy + sw.y - 36, 16, 0, Math.PI * 2); ctx.stroke();
  }
  for (const wv of (rm.windVanes || [])) {
    ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 2.2 / state.cam.zoom;
    ctx.beginPath(); ctx.moveTo(ox + wv.x, oy + wv.y); ctx.lineTo(ox + wv.x, oy + wv.y - 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox + wv.x - 16, oy + wv.y - 38); ctx.lineTo(ox + wv.x + 16, oy + wv.y - 38); ctx.stroke();
  }
  for (const ip of (rm.icePillars || [])) {
    ctx.fillStyle = 'rgba(125, 211, 252, 0.42)'; ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 1.8 / state.cam.zoom;
    ctx.beginPath(); ctx.moveTo(ox + ip.x - 16, oy + ip.topY); ctx.lineTo(ox + ip.x + 16, oy + ip.topY);
    ctx.lineTo(ox + ip.x, oy + ip.topY + ip.len); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)'; ctx.setLineDash([4, 4]);
    ctx.strokeRect(ox + ip.bridgeX, oy + ip.bridgeY, ip.bridgeW, ip.bridgeH); ctx.setLineDash([]);
  }
  for (const sw of (rm.slickWalls || [])) {
    ctx.fillStyle = 'rgba(185, 28, 28, 0.36)'; ctx.strokeStyle = '#f87171'; ctx.lineWidth = 2 / state.cam.zoom;
    ctx.fillRect(ox + sw.x, oy + sw.y, sw.w, sw.h); ctx.strokeRect(ox + sw.x, oy + sw.y, sw.w, sw.h);
  }
  for (const pk of (rm.pickups || [])) {
    const px = ox + pk.x;
    const py = oy + pk.y;
    if (pk.kind === 'realmSeal') {
      const sCol = pk.sealId === 'forest' ? '#6ee7b7' : pk.sealId === 'mountain' ? '#bae6fd' : '#7dd3fc';
      ctx.fillStyle = 'rgba(168, 85, 247, 0.22)';
      ctx.fillRect(px - 18, py - 84, 36, 84);
      ctx.fillStyle = '#182132';
      ctx.strokeStyle = sCol;
      ctx.lineWidth = 2 / state.cam.zoom;
      ctx.fillRect(px - 14, py - 12, 28, 12);
      ctx.strokeRect(px - 14, py - 12, 28, 12);
      ctx.fillStyle = sCol;
      ctx.beginPath();
      ctx.moveTo(px, py - 46); ctx.lineTo(px + 13, py - 28); ctx.lineTo(px, py - 12); ctx.lineTo(px - 13, py - 28);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = COLORS.goldBright;
      ctx.stroke();
      ctx.fillStyle = '#fef9c3';
      ctx.font = `bold ${Math.round(10 / Math.max(0.55, state.cam.zoom))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`印:${pk.sealId || 'wind'}`, px, py - 52);
    } else {
      ctx.fillStyle = pk.kind === 'weapon' ? '#38bdf8' : (pk.kind === 'relic' ? COLORS.goldBright : pk.kind === 'echoCache' ? '#fbbf24' : COLORS.cyanBright);
      ctx.beginPath(); ctx.arc(px, py - 24, 11, 0, Math.PI * 2); ctx.fill();
    }
    if (pk.requiresBoss) {
      // Crossed bronze-crimson boss seal lock chain preview
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.90)';
      ctx.lineWidth = 1.8 / state.cam.zoom;
      ctx.strokeRect(px - 18, py - 46, 36, 44);
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.90)';
      ctx.beginPath();
      ctx.moveTo(px - 16, py - 44); ctx.lineTo(px + 16, py - 6);
      ctx.moveTo(px + 16, py - 44); ctx.lineTo(px - 16, py - 6);
      ctx.stroke();
      ctx.fillStyle = '#fecaca';
      ctx.font = `bold ${Math.round(9.5 / Math.max(0.55, state.cam.zoom))}px ui-monospace, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`🔒${pk.requiresBoss}`, px, py + 12 / Math.max(0.55, state.cam.zoom));
    }
  }

  // Enemies & Biome Wardens + Patrol Bars
  for (const e of (rm.enemies || [])) {
    const m = ENEMY_META[e.kind] || ENEMY_META.sentinel;
    const ew = m.w;
    const eh = m.h;
    if (e.minX !== undefined && e.maxX !== undefined) {
      ctx.strokeStyle = m.isWarden ? 'rgba(253, 224, 71, 0.55)' : 'rgba(248, 113, 113, 0.35)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5 / state.cam.zoom;
      ctx.beginPath();
      ctx.moveTo(ox + e.minX, oy + e.y + eh - 4);
      ctx.lineTo(ox + e.maxX + ew, oy + e.y + eh - 4);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = m.color;
    ctx.strokeStyle = m.isWarden ? COLORS.goldBright : '#fff';
    ctx.lineWidth = (m.isWarden ? 2.4 : 1.4) / state.cam.zoom;
    ctx.fillRect(ox + e.x, oy + e.y, ew, eh);
    ctx.strokeRect(ox + e.x, oy + e.y, ew, eh);
    if (m.isWarden) {
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.55)';
      ctx.lineWidth = 1.2 / state.cam.zoom;
      ctx.strokeRect(ox + e.x - 3, oy + e.y - 3, ew + 6, eh + 6);
    }
    ctx.fillStyle = m.isWarden ? '#fef9c3' : '#fff';
    ctx.font = `bold ${m.isWarden ? 13 : 11}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(m.glyph, ox + e.x + ew / 2, oy + e.y + eh / 2 + 4);
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
    ctx.fillText(b.id === 'boss_yuan' ? '渊' : b.id === 'boss_ji' ? '寂' : '晦', ox + b.x + 29, oy + b.y + 54);
  }

  // Foreground Procedural Ink Stamps (WYSIWYG preview)
  for (const st of (rmProps.stamps || [])) {
    const def = getStampDef(st.type);
    const ly = st.layer || (def ? def.defaultLayer : 'bg');
    if (ly === 'fg') drawStampPreview(ctx, st, ox, oy);
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


function drawAuditOverlays() {
  if (!state.bundle) return;
  const showViol = state.auditHighlight;
  const activeTierId = state.auditTierOverlay;
  if (!showViol && !activeTierId) return;

  const rooms = state.bundle.rooms || [];
  const z = Math.max(0.25, state.cam.zoom);

  // 1. Optional 5-Tier Reachability Overlay
  if (activeTierId && state.lastAuditTopo && state.lastAuditTopo.tiers) {
    const tier = state.lastAuditTopo.tiers.find(t => t.id === activeTierId);
    if (tier) {
      ctx.save();
      for (const rm of rooms) {
        const b = rm.bounds;
        const isSoft = tier.softlocked.has(rm.id);
        const isLeak = tier.leaked.has(rm.id);
        const isUnreach = tier.unreachable.has(rm.id);
        const isVis = tier.visited.has(rm.id);
        if (isSoft || isLeak || isUnreach) {
          ctx.fillStyle = 'rgba(220, 38, 38, 0.28)';
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 3.5 / z;
        } else if (isVis) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
          ctx.strokeStyle = '#6ee7b7';
          ctx.lineWidth = 2.4 / z;
        } else {
          ctx.fillStyle = 'rgba(6, 9, 15, 0.62)';
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
          ctx.lineWidth = 1.2 / z;
        }
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        const tag = isSoft ? '✖ 软锁' : isLeak ? '✖ 越界绕后' : isUnreach ? '✖ 终局孤岛' : isVis ? `✓ ${tier.short} 可达` : '🔒 未解锁';
        const tagCol = (isSoft || isLeak || isUnreach) ? '#fecaca' : isVis ? '#6ee7b7' : '#94a3b8';
        ctx.font = `bold ${Math.round(13 / Math.max(0.32, z))}px "Noto Serif SC", sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillStyle = tagCol;
        ctx.fillText(tag, b.x + b.w - 10 / z, b.y + 22 / Math.max(0.45, z));
      }
      ctx.restore();
    }
  }

  // 2. Violating Rooms & Specific Conflict Boxes Highlight
  if (showViol) {
    ctx.save();
    for (const rm of rooms) {
      const st = state.roomAuditMap.get(rm.id);
      if (!st || (st.err === 0 && st.warn === 0)) continue;
      const b = rm.bounds;
      const isErr = st.err > 0;
      ctx.fillStyle = isErr ? 'rgba(220, 38, 38, 0.20)' : 'rgba(245, 158, 11, 0.15)';
      ctx.strokeStyle = isErr ? '#f87171' : '#f59e0b';
      ctx.lineWidth = (isErr ? 4.2 : 3.0) / z;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      const pillTxt = isErr ? `✖ 违规 ${st.err}${st.warn ? ` · ⚠${st.warn}` : ''}` : `⚠ 警告 ${st.warn}`;
      const fontSize = Math.round(14 / Math.max(0.30, z));
      ctx.font = `bold ${fontSize}px "Noto Serif SC", sans-serif`;
      const tw = ctx.measureText(pillTxt).width + 14 / Math.max(0.35, z);
      const th = fontSize + 8 / Math.max(0.35, z);
      const px = b.x + 8 / Math.max(0.4, z);
      const py = b.y + 8 / Math.max(0.4, z);
      ctx.fillStyle = isErr ? 'rgba(127, 29, 29, 0.92)' : 'rgba(120, 53, 15, 0.90)';
      ctx.fillRect(px, py, tw, th);
      ctx.strokeStyle = isErr ? '#fca5a5' : '#fde047';
      ctx.lineWidth = 1.4 / z;
      ctx.strokeRect(px, py, tw, th);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(pillTxt, px + 7 / Math.max(0.35, z), py + 4 / Math.max(0.35, z));
      ctx.textBaseline = 'alphabetic';
    }

    for (const iss of state.lastAuditIssues) {
      if (!iss.highlightBox) continue;
      const hb = iss.highlightBox;
      ctx.fillStyle = iss.sev === 'err' ? 'rgba(248, 113, 113, 0.28)' : 'rgba(253, 224, 71, 0.22)';
      ctx.strokeStyle = iss.sev === 'err' ? '#ff4d4f' : '#fde047';
      ctx.lineWidth = 2.6 / z;
      ctx.setLineDash([8 / z, 4 / z]);
      ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
      ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
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
    drawWorldConnections();
  } else {
    state.bundle.rooms.forEach((rm, idx) => {
      if (idx !== state.activeRoomIdx) drawRoomContents(rm, true);
    });
    const active = getActiveRoom();
    if (active) drawRoomContents(active, false);
  }

  drawAuditOverlays();

  // Active Selection Outline, Resize Handles, Creation & Cursor Ghosts
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
      const isBounce = state.tool === 'bouncePad';
      const isWind = state.tool === 'windZone';
      ctx.fillStyle = isBounce ? 'rgba(110, 231, 183, 0.28)' : isWind ? 'rgba(125, 211, 252, 0.22)' : 'rgba(56, 189, 248, 0.25)';
      ctx.strokeStyle = isBounce ? '#6ee7b7' : COLORS.cyanBright;
      ctx.lineWidth = 2 / state.cam.zoom;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.restore();
    }

    // Live Ghost Preview for Stamp Placement or Pinpoint Playtest
    if (!state.drag && state.hoverInsideCanvas) {
      const rm = getActiveRoom();
      if (rm && state.tool === 'stamp') {
        const lx = snap(state.hoverWorld.x - rm.bounds.x);
        const ly = snap(state.hoverWorld.y - rm.bounds.y);
        const def = getStampDef(state.activeStampType);
        if (def) {
          ctx.save();
          ctx.globalAlpha = 0.45;
          drawStampPreview(ctx, { type: def.id, x: lx, y: ly, scale: 1, flip: false, layer: def.defaultLayer || 'bg', alpha: 0.9, seed: 0 }, rm.bounds.x, rm.bounds.y);
          ctx.restore();
        }
      } else if (state.tool === 'playtestPin') {
        const wx = snap(state.hoverWorld.x);
        const wy = snap(state.hoverWorld.y);
        ctx.save();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.24)';
        ctx.strokeStyle = COLORS.goldBright;
        ctx.lineWidth = 2 / state.cam.zoom;
        ctx.fillRect(wx - 14, wy - 54, 28, 54);
        ctx.strokeRect(wx - 14, wy - 54, 28, 54);
        ctx.beginPath();
        ctx.moveTo(wx - 18, wy); ctx.lineTo(wx + 18, wy);
        ctx.moveTo(wx, wy - 12); ctx.lineTo(wx, wy + 12);
        ctx.stroke();
        ctx.fillStyle = COLORS.goldBright;
        ctx.font = `bold ${Math.round(11 / Math.max(0.5, state.cam.zoom))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🎯 点击在此空降试玩', wx, wy - 60);
        ctx.restore();
      }
    }
  }

  ctx.restore();
}

function drawWorldConnections() {
  if (!state.bundle) return;
  const byId = new Map(state.bundle.rooms.map(r => [r.id, r]));
  const drawnPairs = new Set();
  ctx.save();
  for (const rm of state.bundle.rooms) {
    const c1x = rm.bounds.x + rm.bounds.w * 0.5;
    const c1y = rm.bounds.y + rm.bounds.h * 0.5;
    for (const tid of (rm.connections || [])) {
      const dst = byId.get(tid);
      if (!dst) continue;
      const pairKey = [rm.id, tid].sort().join('<>');
      const isBi = Array.isArray(dst.connections) && dst.connections.includes(rm.id);
      if (isBi && drawnPairs.has(pairKey)) continue;
      drawnPairs.add(pairKey);

      const c2x = dst.bounds.x + dst.bounds.w * 0.5;
      const c2y = dst.bounds.y + dst.bounds.h * 0.5;
      const mx = (c1x + c2x) * 0.5;
      const my = (c1y + c2y) * 0.5 - 55;
      const isSel = rm === getActiveRoom() || dst === getActiveRoom();

      ctx.strokeStyle = isSel ? COLORS.cyanBright : 'rgba(56, 189, 248, 0.52)';
      ctx.lineWidth = (isSel ? 3.2 : 2.0) / state.cam.zoom;
      ctx.setLineDash([8 / state.cam.zoom, 6 / state.cam.zoom]);
      ctx.beginPath();
      ctx.moveTo(c1x, c1y);
      ctx.quadraticCurveTo(mx, my, c2x, c2y);
      ctx.stroke();
      ctx.setLineDash([]);

      const drawArrow = (px, py, ang) => {
        const sz = 11 / state.cam.zoom;
        ctx.fillStyle = isSel ? COLORS.goldBright : COLORS.cyanBright;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(ang) * sz, py + Math.sin(ang) * sz);
        ctx.lineTo(px + Math.cos(ang + 2.4) * sz * 0.78, py + Math.sin(ang + 2.4) * sz * 0.78);
        ctx.lineTo(px + Math.cos(ang - 2.4) * sz * 0.78, py + Math.sin(ang - 2.4) * sz * 0.78);
        ctx.closePath();
        ctx.fill();
      };
      const qx = 0.25 * c1x + 0.5 * mx + 0.25 * c2x;
      const qy = 0.25 * c1y + 0.5 * my + 0.25 * c2y;
      const angFwd = Math.atan2(c2y - c1y, c2x - c1x);
      if (isBi) {
        const off = 14 / state.cam.zoom;
        drawArrow(qx + Math.cos(angFwd) * off, qy + Math.sin(angFwd) * off, angFwd);
        drawArrow(qx - Math.cos(angFwd) * off, qy - Math.sin(angFwd) * off, angFwd + Math.PI);
      } else {
        drawArrow(qx, qy, angFwd);
      }
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
    const st = state.roomAuditMap ? state.roomAuditMap.get(rm.id) : null;
    const violCls = st && st.err > 0 ? ' has-err' : st && st.warn > 0 ? ' has-warn' : '';
    btn.className = `room-item${idx === state.activeRoomIdx ? ' active' : ''}${violCls}`;
    const badgeHtml = st && st.err > 0
      ? `<span class="room-audit-pill err">✖${st.err}</span>`
      : st && st.warn > 0
        ? `<span class="room-audit-pill warn">⚠${st.warn}</span>`
        : '';
    const count = (rm.solids || []).length + (rm.enemies || []).length + (rm.windZones || []).length +
      (rm.bouncePads || []).length + (rm.lanterns || []).length + (rm.pickups || []).length +
      ((rm.props && rm.props.stamps) ? rm.props.stamps.length : 0);
    btn.innerHTML = `
      <div class="room-item-title"><span>${rm.name}${badgeHtml}</span><span style="font-size:10px;color:var(--dim);">${rm.id}</span></div>
      <div class="room-item-meta">${rm.bounds.w}×${rm.bounds.h} · (${rm.bounds.x}, ${rm.bounds.y}) · ${count} 物件</div>
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
  } else if (type === 'checkbox') {
    inp = document.createElement('input');
    inp.type = 'checkbox';
    inp.checked = !!value;
    inp.style.width = '16px';
    inp.style.height = '16px';
    inp.style.cursor = 'pointer';
  } else if (Array.isArray(type)) {
    inp = document.createElement('select');
    inp.className = 'prop-input';
    for (const optVal of type) {
      const opt = document.createElement('option');
      if (typeof optVal === 'object') {
        opt.value = optVal.value;
        opt.textContent = optVal.label;
      } else {
        opt.value = optVal;
        opt.textContent = optVal;
      }
      if (opt.value === value) opt.selected = true;
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
    const val = type === 'checkbox' ? !!inp.checked : (type === 'number' ? Number(inp.value) : inp.value);
    onChange(val);
    syncManifestFromRooms();
    renderRoomList();
    renderInspector();
    draw();
  });
  parent.append(lbl, inp);
}


function addRangeField(parent, labelText, value, min, max, step, onChange) {
  const lbl = document.createElement('label');
  lbl.textContent = labelText;
  const wrap = document.createElement('div');
  wrap.className = 'mod-range-wrap';
  const rng = document.createElement('input');
  rng.type = 'range';
  rng.className = 'mod-range';
  rng.min = String(min);
  rng.max = String(max);
  rng.step = String(step);
  rng.value = String(value);
  const valSpan = document.createElement('span');
  valSpan.className = 'mod-range-val';
  valSpan.textContent = Number(value).toFixed(1);
  let pushed = false;
  rng.addEventListener('input', () => {
    if (!pushed) { pushUndo(); pushed = true; }
    const v = Number(rng.value);
    valSpan.textContent = v.toFixed(1);
    onChange(v);
    draw();
  });
  rng.addEventListener('change', () => {
    pushed = false;
    syncManifestFromRooms();
    renderRoomList();
    draw();
  });
  wrap.append(rng, valSpan);
  parent.append(lbl, wrap);
}

function cleanModObj(mod) {
  if (!mod || typeof mod !== 'object') return null;
  const out = {};
  if (mod.overlay && mod.overlay !== 'auto' && mod.overlay !== 'inherit') out.overlay = mod.overlay;
  if (mod.weathering !== undefined && mod.weathering !== null && Math.abs(Number(mod.weathering) - 1) > 0.001) out.weathering = Number(mod.weathering);
  if (mod.cracks !== undefined && mod.cracks !== null && Math.abs(Number(mod.cracks) - 1) > 0.001) out.cracks = Number(mod.cracks);
  if (mod.overlayDensity !== undefined && mod.overlayDensity !== null && Math.abs(Number(mod.overlayDensity) - 1) > 0.001) out.overlayDensity = Number(mod.overlayDensity);
  return Object.keys(out).length > 0 ? out : null;
}

function renderRoomProps() {
  const rm = getActiveRoom();
  roomPropsEl.innerHTML = '';
  if (!rm) return;
  addField(roomPropsEl, '房间ID', rm.id, 'text', v => { rm.id = v.trim() || rm.id; });
  addField(roomPropsEl, '大区名', rm.zoneName, 'text', v => { rm.zoneName = v; });
  addField(roomPropsEl, '房间名', rm.name, 'text', v => { rm.name = v; });
  addField(roomPropsEl, '生态主题', rm.theme || 'corridor', [
    'sanctuary', 'corridor', 'chapel', 'bell_well', 'foundry', 'crypt', 'ascent', 'heart', 'wind', 'forest', 'mountain'
  ], v => { rm.theme = v; });
  addField(roomPropsEl, '世界 X', rm.bounds.x, 'number', v => { rm.bounds.x = v; });
  addField(roomPropsEl, '世界 Y', rm.bounds.y, 'number', v => { rm.bounds.y = v; });
  addField(roomPropsEl, '宽度 W', rm.bounds.w, 'number', v => { rm.bounds.w = Math.max(320, v); });
  addField(roomPropsEl, '高度 H', rm.bounds.h, 'number', v => { rm.bounds.h = Math.max(320, v); });

  // v30.0 Room-Level Procedural Terrain Modifiers
  const rmModDiv = document.createElement('div');
  rmModDiv.className = 'mod-divider';
  rmModDiv.innerHTML = '<span>房间默认地形修饰</span>';
  const rmResetBtn = document.createElement('button');
  rmResetBtn.type = 'button';
  rmResetBtn.className = 'mod-reset-btn';
  rmResetBtn.textContent = '重置默认';
  rmResetBtn.addEventListener('click', () => {
    pushUndo();
    delete rm.terrainMod;
    renderRoomProps();
    draw();
    showToast('已重置房间默认地形修饰器');
  });
  rmModDiv.appendChild(rmResetBtn);
  roomPropsEl.appendChild(rmModDiv);

  const curRmMod = rm.terrainMod || {};
  const setRmMod = (k, v) => {
    const next = { ...(rm.terrainMod || {}), [k]: v };
    const cleaned = cleanModObj(next);
    if (cleaned) rm.terrainMod = cleaned;
    else delete rm.terrainMod;
  };
  addField(roomPropsEl, '默认覆层', curRmMod.overlay || 'auto', TERRAIN_OVERLAY_OPTIONS, v => setRmMod('overlay', v));
  addRangeField(roomPropsEl, '风化度', curRmMod.weathering !== undefined ? curRmMod.weathering : 1.0, 0, 2, 0.1, v => setRmMod('weathering', v));
  addRangeField(roomPropsEl, '裂隙密度', curRmMod.cracks !== undefined ? curRmMod.cracks : 1.0, 0, 2, 0.1, v => setRmMod('cracks', v));
  addRangeField(roomPropsEl, '覆层浓度', curRmMod.overlayDensity !== undefined ? curRmMod.overlayDensity : 1.0, 0, 2, 0.1, v => setRmMod('overlayDensity', v));

  const connBox = document.getElementById('room-conn-pills');
  if (connBox && state.bundle) {
    connBox.innerHTML = '';
    if (!Array.isArray(rm.connections)) rm.connections = [];
    for (const other of state.bundle.rooms) {
      if (other.id === rm.id) continue;
      const linked = rm.connections.includes(other.id);
      const pill = document.createElement('button');
      pill.className = `conn-pill${linked ? ' linked' : ''}`;
      pill.textContent = `${linked ? '⇄ ' : '+ '}${other.name}`;
      pill.title = `切换与 ${other.id} 的双向跨房连接`;
      pill.addEventListener('click', () => {
        pushUndo();
        if (!Array.isArray(other.connections)) other.connections = [];
        if (linked) {
          rm.connections = rm.connections.filter(id => id !== other.id);
          other.connections = other.connections.filter(id => id !== rm.id);
        } else {
          if (!rm.connections.includes(other.id)) rm.connections.push(other.id);
          if (!other.connections.includes(rm.id)) other.connections.push(rm.id);
        }
        syncManifestFromRooms();
        renderRoomProps();
        draw();
      });
      connBox.appendChild(pill);
    }
  }
}

function renderInspector() {
  const sel = getSelectedItem();
  inspectorEl.innerHTML = '';
  if (!sel) {
    inspectorEl.textContent = '点击画布中的任意平台、生态机关、敌兵或图章以编辑属性（均为房间内局部坐标）。';
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'prop-grid';
  const o = sel.obj;

  addField(grid, '类别', sel.kind, 'text', () => {});
  grid.lastChild.disabled = true;

  if (o.id !== undefined) addField(grid, 'ID', o.id, 'text', v => { o.id = v; });

  if (sel.kind === 'stamp') {
    addField(grid, '图章类型', o.type, STAMP_DEFS.map(d => ({ value: d.id, label: `[${d.cat}] ${d.label}` })), v => { o.type = v; });
    addField(grid, '前后图层', o.layer || 'bg', ['bg', 'fg'], v => { o.layer = v; });
    addField(grid, '缩放倍率', o.scale !== undefined ? o.scale : 1, 'number', v => { o.scale = Math.max(0.25, Math.min(3.0, Number(v) || 1)); });
    addField(grid, '水平翻转', !!o.flip, 'checkbox', v => { o.flip = !!v; });
    addField(grid, '变体种子', o.seed !== undefined ? o.seed : 0, 'number', v => { o.seed = Math.max(0, Math.floor(v || 0)) % 3; });
    addField(grid, '透明度', o.alpha !== undefined ? o.alpha : 0.85, 'number', v => { o.alpha = Math.max(0.1, Math.min(1.0, Number(v) || 0.85)); });
    addField(grid, '旋转弧度', o.rotate || 0, 'number', v => { o.rotate = Number(v) || 0; });
  } else if (sel.kind === 'windZone') {
    addField(grid, '水平风 vx', o.vx !== undefined ? o.vx : 0, 'number', v => { o.vx = Number(v) || 0; });
    addField(grid, '升力 vy', o.vy !== undefined ? o.vy : -1480, 'number', v => { o.vy = Number(v) || -1480; });
    const note = document.createElement('div');
    note.className = 'prop-note';
    note.textContent = `提示：负 vy 向上托举（标准值 -1380 ~ -1580），正/负 vx 提供侧向罡风偏移。`;
    grid.appendChild(note);
  } else if (sel.kind === 'bouncePad') {
    addField(grid, '弹跳初速', o.boostVy !== undefined ? o.boostVy : -790, 'number', v => { o.boostVy = Number(v) || -790; });
    const apex = Math.round(((Number(o.boostVy) || -790) ** 2) / (2 * GRAVITY));
    const note = document.createElement('div');
    note.className = 'prop-note';
    note.textContent = `物理弹跳顶点 ≈ ${apex} px（按重力 g=${GRAVITY} 实时换算，画布虚线即最高落脚点）`;
    grid.appendChild(note);
  } else if (o.type !== undefined) {
    addField(grid, '形态', o.type, ['ground', 'pillar', 'platform'], v => { o.type = v; });
  }

  if (o.kind !== undefined && sel.kind === 'enemy') {
    addField(grid, '兵种', o.kind, ENEMY_KINDS.map(k => ({ value: k, label: `${ENEMY_META[k].label} (${k})` })), v => {
      o.kind = v;
      const m = ENEMY_META[v];
      if (m && m.patrol > 0 && (o.minX === undefined || o.maxX === undefined)) {
        o.minX = Math.round(o.x - m.patrol);
        o.maxX = Math.round(o.x + m.patrol);
      }
    });
  }
  if (sel.kind === 'gate') {
    addField(grid, '石门角色', o.role || 'shortcut', [
      { value: 'shortcut', label: '捷径锁链闸 (shortcut)' },
      { value: 'chapelExit', label: '礼拜堂东门 (chapelExit)' },
      { value: 'foundryEntry', label: '铸钟殿入口 (foundryEntry)' },
      { value: 'foundryExit', label: '铸钟殿出口 (foundryExit)' },
      { value: 'skyBridge', label: '天顶断桥石门 (skyBridge)' },
      { value: 'foundryValve', label: '古炉泄压铁闸 (foundryValve)' },
      { value: 'mirrorAbyss', label: '初铸镜渊天门 (mirrorAbyss)' },
      { value: 'switchGate', label: '单向机关闸门 (switchGate)' }
    ], v => { o.role = v; });
  }
  if (o.kind !== undefined && sel.kind === 'npc') addField(grid, 'NPC类', o.kind, ['smith', 'chronicler', 'keeper', 'scavenger'], v => { o.kind = v; });
  if (o.kind !== undefined && sel.kind === 'pickup') {
    addField(grid, '秘宝类', o.kind, ['flaskCore', 'relic', 'realmSeal', 'ability', 'weapon', 'echoCache', 'statCore', 'keyItem'], v => {
      o.kind = v;
      if (v === 'realmSeal') {
        if (!o.sealId) o.sealId = 'wind';
        if (!o.relicId) o.relicId = 'galefather';
        if (!o.requiresBoss) o.requiresBoss = 'warden_wind_boss';
        if (o.echoAmount === undefined) o.echoAmount = 60;
      }
    });
    if (o.kind === 'realmSeal' || o.sealId !== undefined) {
      addField(grid, '铭印境', o.sealId || 'wind', [
        { value: 'wind', label: '绝风铭印 (wind)' },
        { value: 'forest', label: '枯林铭印 (forest)' },
        { value: 'mountain', label: '霜脊铭印 (mountain)' }
      ], v => { o.sealId = v; });
    }
    const bossOpts = [
      { value: '', label: '无封印（直接可拾）' },
      { value: 'warden_wind_boss', label: '守誓 · 朔 (warden_wind_boss)' },
      { value: 'warden_forest_boss', label: '守誓 · 枯 (warden_forest_boss)' },
      { value: 'warden_mountain_boss', label: '守誓 · 凛 (warden_mountain_boss)' },
      { value: 'boss_hui', label: '首领 · 晦 (boss_hui)' },
      { value: 'boss_ji', label: '首领 · 寂 (boss_ji)' },
      { value: 'boss_yuan', label: '首领 · 渊 (boss_yuan)' }
    ];
    addField(grid, '战后解封', o.requiresBoss || '', bossOpts, v => {
      if (v) o.requiresBoss = v;
      else delete o.requiresBoss;
    });
  }
  if (o.weaponId !== undefined) addField(grid, '兵刃ID', o.weaponId, ['blade', 'hammer', 'bell'], v => { o.weaponId = v; });
  if (o.relicId !== undefined || (sel.kind === 'pickup' && (o.kind === 'relic' || o.kind === 'realmSeal'))) {
    const relicOpts = RELICS.map(r => ({ value: r.id, label: `${r.name} (${r.id})` }));
    addField(grid, '圣物ID', o.relicId || RELICS[0].id, relicOpts, v => { o.relicId = v; });
  }
  if (o.abilityId !== undefined) addField(grid, '能力ID', o.abilityId, ['grappleHook', 'doubleJump', 'shadeDash', 'bellDive'], v => { o.abilityId = v; });
  if (o.echoAmount !== undefined || (sel.kind === 'pickup' && (o.kind === 'echoCache' || o.kind === 'realmSeal'))) {
    addField(grid, '残响量', o.echoAmount !== undefined ? o.echoAmount : 0, 'number', v => { o.echoAmount = Math.max(0, Math.round(v || 0)); });
  }

  if (o.x !== undefined) addField(grid, sel.kind === 'bouncePad' ? '底心 X' : '局部 X', o.x, 'number', v => { o.x = v; });
  if (o.y !== undefined) addField(grid, sel.kind === 'bouncePad' ? '底心 Y' : '局部 Y', o.y, 'number', v => { o.y = v; });
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

  if (sel.kind === 'solid') {
    const rm = getActiveRoom();
    const rmMod = (rm && rm.terrainMod) ? rm.terrainMod : {};
    const curSMod = o.mod || {};
    const solidModDiv = document.createElement('div');
    solidModDiv.className = 'mod-divider';
    solidModDiv.innerHTML = '<span>单块程序化地形修饰器</span>';
    const sReset = document.createElement('button');
    sReset.type = 'button';
    sReset.className = 'mod-reset-btn';
    sReset.textContent = '恢复继承';
    sReset.addEventListener('click', () => {
      pushUndo();
      delete o.mod;
      renderInspector();
      draw();
      showToast('该地形块已恢复继承房间默认样式');
    });
    solidModDiv.appendChild(sReset);
    grid.appendChild(solidModDiv);

    const setSMod = (k, v) => {
      const next = { ...(o.mod || {}), [k]: v };
      const cleaned = cleanModObj(next);
      if (cleaned) o.mod = cleaned;
      else delete o.mod;
    };
    const solidOvOpts = [
      { value: 'inherit', label: '继承房间默认' },
      ...TERRAIN_OVERLAY_OPTIONS.filter(op => op.value !== 'auto')
    ];
    addField(grid, '覆层覆盖', curSMod.overlay || 'inherit', solidOvOpts, v => setSMod('overlay', v));
    addRangeField(grid, '边缘风化', curSMod.weathering !== undefined ? curSMod.weathering : (rmMod.weathering !== undefined ? rmMod.weathering : 1.0), 0, 2, 0.1, v => setSMod('weathering', v));
    addRangeField(grid, '裂隙密度', curSMod.cracks !== undefined ? curSMod.cracks : (rmMod.cracks !== undefined ? rmMod.cracks : 1.0), 0, 2, 0.1, v => setSMod('cracks', v));
    addRangeField(grid, '覆层浓度', curSMod.overlayDensity !== undefined ? curSMod.overlayDensity : (rmMod.overlayDensity !== undefined ? rmMod.overlayDensity : 1.0), 0, 2, 0.1, v => setSMod('overlayDensity', v));
  }

  inspectorEl.appendChild(grid);

  if (sel.kind === 'solid') {
    const pbar = document.createElement('div');
    pbar.className = 'mod-preset-bar';
    const presets = [
      ['素石精砌', { overlay: 'none', weathering: 0.2, cracks: 0.2, overlayDensity: 0 }],
      ['风化崩岩', { overlay: 'wind', weathering: 1.8, cracks: 1.8, overlayDensity: 1.4 }],
      ['厚雪冰棱', { overlay: 'snow', weathering: 1.1, cracks: 0.8, overlayDensity: 1.7 }],
      ['熔金锻纹', { overlay: 'molten', weathering: 0.7, cracks: 1.6, overlayDensity: 1.6 }],
      ['幽林浓苔', { overlay: 'forest_moss', weathering: 1.4, cracks: 1.2, overlayDensity: 1.8 }]
    ];
    presets.forEach(([label, modCfg]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ed-btn';
      b.textContent = label;
      b.addEventListener('click', () => {
        pushUndo();
        o.mod = { ...modCfg };
        if (state.renderMode !== 'ink') toggleRenderMode();
        renderInspector();
        draw();
        showToast(`已应用地形修饰预设「${label}」`);
      });
      pbar.appendChild(b);
    });
    inspectorEl.appendChild(pbar);
  }

  if (sel.kind === 'stamp') {
    const qbar = document.createElement('div');
    qbar.className = 'prop-hotkey-bar';
    [
      ['缩小 [', () => mutateSelectedStamp(st => { st.scale = Math.max(0.25, +((Number(st.scale) || 1) - 0.1).toFixed(2)); })],
      ['放大 ]', () => mutateSelectedStamp(st => { st.scale = Math.min(3.0, +((Number(st.scale) || 1) + 0.1).toFixed(2)); })],
      ['镜像 H', () => mutateSelectedStamp(st => { st.flip = !st.flip; })],
      ['切层 L', () => mutateSelectedStamp(st => { st.layer = (st.layer || 'bg') === 'bg' ? 'fg' : 'bg'; })],
      ['换变体 R', () => mutateSelectedStamp(st => { st.seed = ((Number(st.seed) || 0) + 1) % 3; })]
    ].forEach(([lbl, fn]) => {
      const b = document.createElement('button');
      b.className = 'ed-btn';
      b.textContent = lbl;
      b.addEventListener('click', fn);
      qbar.appendChild(b);
    });
    inspectorEl.appendChild(qbar);
  }

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

function mutateSelectedStamp(fn) {
  const sel = getSelectedItem();
  if (!sel || sel.kind !== 'stamp') return;
  pushUndo();
  fn(sel.obj);
  renderInspector();
  draw();
}

function renderStampPalette() {
  const tabsEl = document.getElementById('stamp-cat-tabs');
  const palEl = document.getElementById('stamp-palette');
  if (tabsEl && !tabsEl.dataset.built) {
    tabsEl.dataset.built = '1';
    for (const cat of STAMP_CATS) {
      const b = document.createElement('button');
      b.className = `stamp-cat-btn${state.stampCatFilter === cat ? ' active' : ''}`;
      b.textContent = cat;
      b.addEventListener('click', () => {
        state.stampCatFilter = cat;
        tabsEl.querySelectorAll('.stamp-cat-btn').forEach(x => x.classList.toggle('active', x.textContent === cat));
        renderStampPalette();
      });
      tabsEl.appendChild(b);
    }
  }
  if (!palEl) return;
  palEl.innerHTML = '';
  for (const def of STAMP_DEFS) {
    if (state.stampCatFilter !== '全部' && def.cat !== state.stampCatFilter) continue;
    const btn = document.createElement('button');
    btn.className = `tool-btn${state.tool === 'stamp' && state.activeStampType === def.id ? ' active' : ''}`;
    btn.dataset.tool = 'stamp';
    btn.dataset.stampType = def.id;
    btn.title = `${def.cat} · ${def.label} (${def.w}×${def.h}, 默认层: ${def.defaultLayer})`;
    btn.innerHTML = `<span class="stamp-cat-tag">${def.cat}</span><span>${def.label}</span>`;
    btn.addEventListener('click', () => {
      state.activeStampType = def.id;
      setTool('stamp');
    });
    palEl.appendChild(btn);
  }
}

function renderAllUI() {
  renderRoomList();
  renderRoomProps();
  renderInspector();
  const rm = getActiveRoom();
  statusInfoEl.textContent = rm
    ? `房间 ${rm.id} (${rm.bounds.w}×${rm.bounds.h}) · 视图: ${state.renderMode === 'ink' ? '实景水墨' : '线框'} · 工具: ${state.tool}${state.tool === 'stamp' ? ':' + state.activeStampType : ''} · 缩放: ${Math.round(state.cam.zoom * 100)}%`
    : '就绪';
}

// ==================== OBJECT CREATION / EDITING ====================
function createPointObject(tool, lx, ly) {
  const rm = getActiveRoom();
  if (!rm) return;
  pushUndo();
  const uid = `${tool}_${Date.now().toString(36).slice(-4)}`;
  if (ENEMY_META[tool]) {
    if (!Array.isArray(rm.enemies)) rm.enemies = [];
    const m = ENEMY_META[tool];
    const obj = {
      id: uid,
      kind: tool,
      x: Math.round(lx - m.w * 0.5),
      y: Math.round(m.ceiling ? ly : (m.flying ? ly - m.h * 0.5 : ly - m.h))
    };
    if (m.patrol > 0) {
      obj.minX = Math.round(lx - m.patrol);
      obj.maxX = Math.round(lx + m.patrol);
    }
    rm.enemies.push(obj);
    state.selection = { kind: 'enemy', idx: rm.enemies.length - 1 };
    showToast(`已放置「${m.label}」`);
  } else if (tool === 'npc') {
    if (!Array.isArray(rm.npcs)) rm.npcs = [];
    rm.npcs.push({ id: uid, kind: 'smith', name: '老铸钟匠 · 砺', x: lx, y: ly });
    state.selection = { kind: 'npc', idx: rm.npcs.length - 1 };
  } else if (tool === 'lantern') {
    if (!Array.isArray(rm.lanterns)) rm.lanterns = [];
    rm.lanterns.push({ id: uid, x: lx, anchorY: Math.max(0, ly - 150), len: 150, angle: 0.05 });
    state.selection = { kind: 'lantern', idx: rm.lanterns.length - 1 };
  } else if (tool === 'anchor') {
    if (!Array.isArray(rm.grappleAnchors)) rm.grappleAnchors = [];
    rm.grappleAnchors.push({ id: uid, x: lx, y: ly, topY: 0 });
    state.selection = { kind: 'anchor', idx: rm.grappleAnchors.length - 1 };
  } else if (tool === 'pendulum') {
    if (!Array.isArray(rm.pendulums)) rm.pendulums = [];
    rm.pendulums.push({ id: uid, x: lx, anchorY: Math.max(0, ly - 180), len: 180, amp: 0.65, speed: 1.7, phase: 0, r: 28 });
    state.selection = { kind: 'pendulum', idx: rm.pendulums.length - 1 };
  } else if (tool === 'resonancePuzzle') {
    const pzId = `puzzle_${Date.now().toString(36).slice(-4)}`;
    if (!Array.isArray(rm.resonancePuzzles)) rm.resonancePuzzles = [];
    if (!Array.isArray(rm.pickups)) rm.pickups = [];
    rm.resonancePuzzles.push({
      id: pzId,
      name: `${rm.name} · 三钟共鸣`,
      timeLimit: 8.0,
      cageX: lx,
      cageY: ly,
      bells: [
        { id: `${pzId}_b1`, x: lx - 120, y: Math.max(60, ly - 120), topY: 0, noteFreq: 392.0 },
        { id: `${pzId}_b2`, x: lx, y: Math.max(50, ly - 220), topY: 0, noteFreq: 493.88 },
        { id: `${pzId}_b3`, x: lx + 120, y: Math.max(60, ly - 120), topY: 0, noteFreq: 587.33 }
      ]
    });
    rm.pickups.push({
      id: `pk_${pzId}`,
      kind: 'flaskCore',
      requiresPuzzle: pzId,
      x: lx,
      y: ly,
      name: '共鸣灯油残芯',
      desc: '灯油上限永久 +1！'
    });
    state.selection = { kind: 'puzzleCage', idx: rm.resonancePuzzles.length - 1 };
    showToast(`已放置三钟共鸣机关 ${pzId}（含封印钟笼与秘宝）`);
  } else if (tool === 'altar') {
    if (!Array.isArray(rm.altars)) rm.altars = [];
    rm.altars.push({ id: uid, x: lx, y: ly, name: `${rm.name} · 祭坛`, shortName: `${rm.name}祭坛`, defaultLit: false });
    state.selection = { kind: 'altar', idx: rm.altars.length - 1 };
  } else if (tool === 'pickup') {
    if (!Array.isArray(rm.pickups)) rm.pickups = [];
    rm.pickups.push({ id: uid, kind: 'flaskCore', x: lx, y: ly, name: '灯油残芯', desc: '灯油上限永久 +1！' });
    state.selection = { kind: 'pickup', idx: rm.pickups.length - 1 };
  } else if (tool === 'realmSeal') {
    if (!Array.isArray(rm.pickups)) rm.pickups = [];
    rm.pickups.push({
      id: `pickup_seal_${Date.now().toString(36).slice(-4)}`,
      kind: 'realmSeal',
      sealId: 'wind',
      relicId: 'galefather',
      requiresBoss: 'warden_wind_boss',
      echoAmount: 60,
      x: lx,
      y: ly,
      name: '绝风铭印 · 朔风铃羽',
      desc: '斩落守誓后解封！赐予三境铭印与对应秘境圣物'
    });
    state.selection = { kind: 'pickup', idx: rm.pickups.length - 1 };
    showToast('已放置三境铭印神龛（右侧可配置铭印境与战后解封目标）');
  } else if (tool === 'skyBridgeGate') {
    if (!Array.isArray(rm.gates)) rm.gates = [];
    rm.gates.push({
      id: 'gate_sky_bridge',
      role: 'skyBridge',
      x: lx,
      y: Math.max(0, ly - 200),
      w: 36,
      h: 200
    });
    state.selection = { kind: 'gate', idx: rm.gates.length - 1 };
    showToast('已放置天顶断桥石门 (skyBridge)');
  } else if (tool === 'lore') {
    if (!Array.isArray(rm.loreTablets)) rm.loreTablets = [];
    rm.loreTablets.push({ id: uid, x: lx, y: ly, title: '风化残碑', sub: rm.name, html: '“新刻的晦渊铭文……”' });
    state.selection = { kind: 'lore', idx: rm.loreTablets.length - 1 };
  } else if (tool === 'inscription') {
    if (!Array.isArray(rm.inscriptions)) rm.inscriptions = [];
    rm.inscriptions.push({ x: lx, y: ly, text: '「在此镌刻指引」' });
    state.selection = { kind: 'inscription', idx: rm.inscriptions.length - 1 };
  } else if (tool === 'banner') {
    if (!rm.props) rm.props = { puddles: [], banners: [], candles: [], boneCairns: [], stamps: [] };
    if (!Array.isArray(rm.props.banners)) rm.props.banners = [];
    rm.props.banners.push({ x: lx, y: ly, len: 150, color: '#33151e' });
    state.selection = { kind: 'banner', idx: rm.props.banners.length - 1 };
  } else if (tool === 'candle') {
    if (!rm.props) rm.props = { puddles: [], banners: [], candles: [], boneCairns: [], stamps: [] };
    if (!Array.isArray(rm.props.candles)) rm.props.candles = [];
    rm.props.candles.push({ x: lx, y: ly, count: 3 });
    state.selection = { kind: 'candle', idx: rm.props.candles.length - 1 };
  } else if (tool === 'stamp') {
    if (!rm.props) rm.props = { puddles: [], banners: [], candles: [], boneCairns: [], stamps: [] };
    if (!Array.isArray(rm.props.stamps)) rm.props.stamps = [];
    const def = getStampDef(state.activeStampType) || STAMP_DEFS[0];
    rm.props.stamps.push({
      type: def.id,
      x: lx,
      y: ly,
      scale: 1,
      flip: false,
      layer: def.defaultLayer || 'bg',
      alpha: def.defaultLayer === 'fg' ? 0.72 : 0.78,
      seed: rm.props.stamps.length % 3
    });
    state.selection = { kind: 'stamp', idx: rm.props.stamps.length - 1 };
    showToast(`已放置图章「${def.label}」`);
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
    if (!Array.isArray(rm.solids)) rm.solids = [];
    rm.solids.push({ x: lx, y: ly, w, h: tool === 'platform' ? Math.max(18, Math.min(28, h)) : h, type: tool });
    state.selection = { kind: 'solid', idx: rm.solids.length - 1 };
  } else if (tool === 'crumble') {
    if (!Array.isArray(rm.crumblePlatforms)) rm.crumblePlatforms = [];
    rm.crumblePlatforms.push({ id: uid, x: lx, y: ly, w, h: 20 });
    state.selection = { kind: 'crumble', idx: rm.crumblePlatforms.length - 1 };
  } else if (tool === 'secretWall') {
    if (!Array.isArray(rm.secretWalls)) rm.secretWalls = [];
    rm.secretWalls.push({ id: uid, x: lx, y: ly, w, h, maxHp: 3 });
    state.selection = { kind: 'secretWall', idx: rm.secretWalls.length - 1 };
  } else if (tool === 'voidBarrier') {
    if (!Array.isArray(rm.voidBarriers)) rm.voidBarriers = [];
    rm.voidBarriers.push({ id: uid, x: lx, y: ly, w: Math.max(18, w), h });
    state.selection = { kind: 'voidBarrier', idx: rm.voidBarriers.length - 1 };
  } else if (tool === 'river') {
    if (!Array.isArray(rm.rivers)) rm.rivers = [];
    rm.rivers.push({ id: uid, x: lx, y: ly, w });
    state.selection = { kind: 'river', idx: rm.rivers.length - 1 };
  } else if (tool === 'windZone') {
    if (!Array.isArray(rm.windZones)) rm.windZones = [];
    rm.windZones.push({
      id: `wz_${Date.now().toString(36).slice(-4)}`,
      x: lx, y: ly, w: Math.max(60, w), h: Math.max(80, h),
      vx: 0, vy: -1480
    });
    state.selection = { kind: 'windZone', idx: rm.windZones.length - 1 };
    showToast('已绘制罡风上升气流（右侧可微调 vx / vy）');
  } else if (tool === 'bouncePad') {
    if (!Array.isArray(rm.bouncePads)) rm.bouncePads = [];
    const bw = Math.max(54, Math.min(140, w));
    const bh = Math.max(22, Math.min(40, h));
    rm.bouncePads.push({
      id: `bp_${Date.now().toString(36).slice(-4)}`,
      x: Math.round(lx + w * 0.5),
      y: Math.round(ly + h),
      w: Math.round(bw),
      h: Math.round(bh),
      boostVy: -800
    });
    state.selection = { kind: 'bouncePad', idx: rm.bouncePads.length - 1 };
    showToast('已放置荧光弹性孢伞（虚线显示弹跳最高落脚点）');
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

// ==================== PLAYTEST LAUNCHERS ====================
function launchPlaytest(pinWorldPt = null) {
  if (!state.bundle) return;
  syncManifestFromRooms();
  try {
    localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(state.bundle));
    let rm = getActiveRoom();
    let q = rm ? `&room=${encodeURIComponent(rm.id)}` : '';
    if (pinWorldPt && Number.isFinite(pinWorldPt.x) && Number.isFinite(pinWorldPt.y)) {
      const hitRm = state.bundle.rooms.find(r =>
        pinWorldPt.x >= r.bounds.x && pinWorldPt.x <= r.bounds.x + r.bounds.w &&
        pinWorldPt.y >= r.bounds.y && pinWorldPt.y <= r.bounds.y + r.bounds.h
      ) || rm;
      if (hitRm) q = `&room=${encodeURIComponent(hitRm.id)}`;
      q += `&sx=${Math.round(pinWorldPt.x)}&sy=${Math.round(pinWorldPt.y)}`;
    }
    window.location.href = `./index.html?preview=1${q}`;
  } catch (err) {
    showToast(`写入试玩缓存失败: ${err.message}`);
  }
}

// ==================== WORLD INTEGRITY AUDIT ====================
function runWorldAudit() {
  if (!state.bundle) return [];
  const rooms = state.bundle.rooms || [];
  const byId = new Map(rooms.map((r, i) => [r.id, { rm: r, idx: i }]));
  const issues = [];

  // 1. Overlapping room bounds
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i].bounds;
      const b = rooms[j].bounds;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 0 && oy > 0) {
        issues.push({
          sev: 'err',
          title: `房间边界重叠：${rooms[i].id} ↔ ${rooms[j].id}`,
          msg: `两房间世界区域重叠 ${Math.round(ox)}×${Math.round(oy)} px，可能导致镜头或房间归属抖动。`,
          roomIdx: i
        });
      }
    }
  }

  // 2. Connections validity, symmetry & adjacency gap (> 32px allows 20px floor thickness)
  for (let i = 0; i < rooms.length; i++) {
    const rm = rooms[i];
    const b = rm.bounds;
    for (const cid of (rm.connections || [])) {
      const target = byId.get(cid);
      if (!target) {
        issues.push({
          sev: 'err',
          title: `无效跨房连接：${rm.id} → ${cid}`,
          msg: `目标房间「${cid}」不存在，请重新配置跨房连接。`,
          roomIdx: i
        });
        continue;
      }
      if (!Array.isArray(target.rm.connections) || !target.rm.connections.includes(rm.id)) {
        issues.push({
          sev: 'warn',
          title: `单向跨房连接：${rm.id} → ${cid}`,
          msg: `房间 ${cid} 未反向连接回 ${rm.id}，建议补齐双向连接。`,
          roomIdx: i
        });
      }
      const ob = target.rm.bounds;
      const gx = Math.max(0, Math.max(b.x - (ob.x + ob.w), ob.x - (b.x + b.w)));
      const gy = Math.max(0, Math.max(b.y - (ob.y + ob.h), ob.y - (b.y + b.h)));
      if (gx > 32 || gy > 32) {
        issues.push({
          sev: 'warn',
          title: `跨房缝隙过大：${rm.id} ↔ ${cid}`,
          msg: `边界间隔 (${Math.round(gx)}, ${Math.round(gy)}) px 超过 32px，切房过渡可能出现断层。`,
          roomIdx: i
        });
      }
    }
  }

  // 3. Graph reachability from start room
  const startAltarId = state.bundle.world.startAltarId || 'altar_start';
  let startIdx = rooms.findIndex(r => (r.altars || []).some(a => a.id === startAltarId));
  if (startIdx < 0) startIdx = 0;
  if (rooms.length > 0) {
    const visited = new Set([rooms[startIdx].id]);
    const queue = [rooms[startIdx]];
    while (queue.length > 0) {
      const cur = queue.shift();
      for (const cid of (cur.connections || [])) {
        if (!visited.has(cid) && byId.has(cid)) {
          visited.add(cid);
          queue.push(byId.get(cid).rm);
        }
      }
    }
    rooms.forEach((rm, idx) => {
      if (!visited.has(rm.id)) {
        issues.push({
          sev: 'err',
          title: `孤立不可达房间：${rm.name} (${rm.id})`,
          msg: `从起点房间无法经由 connections 到达此房间。`,
          roomIdx: idx
        });
      }
    });
  }

  // 4. Duplicate IDs, Start Altar check & Per-Object Sanity Checks
  const seenIds = new Map();
  let totalAltars = 0;
  let hasStartAltar = false;
  const trackId = (scope, id, roomIdx, sel) => {
    if (!id) return;
    const key = `${scope}:${id}`;
    if (seenIds.has(key)) {
      issues.push({
        sev: 'warn',
        title: `重复 ID (${scope})：${id}`,
        msg: `与房间 ${seenIds.get(key)} 存在重复 ID，可能引起存档/击杀状态冲突。`,
        roomIdx,
        sel
      });
    } else {
      seenIds.set(key, rooms[roomIdx].id);
    }
  };

  rooms.forEach((rm, ri) => {
    const rw = rm.bounds.w;
    const rh = rm.bounds.h;
    (rm.altars || []).forEach((a, ai) => {
      totalAltars++;
      if (a.id === startAltarId) hasStartAltar = true;
      trackId('altar', a.id, ri, { kind: 'altar', idx: ai });
    });
    (rm.pickups || []).forEach((pk, pi) => {
      trackId('pickup', pk.id, ri, { kind: 'pickup', idx: pi });
    });
    (rm.windZones || []).forEach((wz, wi) => {
      trackId('windZone', wz.id, ri, { kind: 'windZone', idx: wi });
      if ((Number(wz.vy) || 0) > 0) {
        issues.push({
          sev: 'warn',
          title: `罡风方向向下：${rm.id} · ${wz.id || wi}`,
          msg: `当前 vy=${wz.vy} 为正值（向下吹），上升气流通常应为负值（如 -1480）。`,
          roomIdx: ri,
          sel: { kind: 'windZone', idx: wi },
          wx: rm.bounds.x + wz.x + (wz.w || 100) * 0.5,
          wy: rm.bounds.y + wz.y + (wz.h || 100) * 0.5
        });
      }
    });
    (rm.bouncePads || []).forEach((bp, bi) => {
      trackId('bouncePad', bp.id, ri, { kind: 'bouncePad', idx: bi });
      if ((Number(bp.boostVy) || 0) >= -100) {
        issues.push({
          sev: 'warn',
          title: `孢伞弹力异常：${rm.id} · ${bp.id || bi}`,
          msg: `当前 boostVy=${bp.boostVy} 过弱或为正值，建议设为 -760 ~ -860。`,
          roomIdx: ri,
          sel: { kind: 'bouncePad', idx: bi },
          wx: rm.bounds.x + bp.x,
          wy: rm.bounds.y + bp.y
        });
      }
    });
    if (rm.terrainMod) {
      for (const mk of ['weathering', 'cracks', 'overlayDensity']) {
        const mv = rm.terrainMod[mk];
        if (mv !== undefined && (Number(mv) < 0 || Number(mv) > 2 || !Number.isFinite(Number(mv)))) {
          issues.push({
            sev: 'warn',
            title: `房间地形修饰越界：${rm.id} · ${mk}`,
            msg: `当前 ${mk}=${mv} 超出建议区间 [0, 2]。`,
            roomIdx: ri
          });
        }
      }
    }
    (rm.solids || []).forEach((s, si) => {
      if (!s.mod) return;
      for (const mk of ['weathering', 'cracks', 'overlayDensity']) {
        const mv = s.mod[mk];
        if (mv !== undefined && (Number(mv) < 0 || Number(mv) > 2 || !Number.isFinite(Number(mv)))) {
          issues.push({
            sev: 'warn',
            title: `地形块修饰越界：${rm.id} · solid#${si} (${mk})`,
            msg: `当前 ${mk}=${mv} 超出建议区间 [0, 2]。`,
            roomIdx: ri,
            sel: { kind: 'solid', idx: si },
            wx: rm.bounds.x + s.x + s.w * 0.5,
            wy: rm.bounds.y + s.y + s.h * 0.5
          });
        }
      }
    });
    (rm.enemies || []).forEach((e, ei) => {
      trackId('enemy', e.id, ri, { kind: 'enemy', idx: ei });
      if (e.minX !== undefined && e.maxX !== undefined) {
        if (e.minX > e.maxX) {
          issues.push({
            sev: 'err',
            title: `巡逻区间倒置：${rm.id} · ${e.id}`,
            msg: `minX (${e.minX}) 大于 maxX (${e.maxX})。`,
            roomIdx: ri,
            sel: { kind: 'enemy', idx: ei },
            wx: rm.bounds.x + e.x,
            wy: rm.bounds.y + e.y
          });
        }
      }
      if (e.x < -120 || e.x > rw + 120 || e.y < -120 || e.y > rh + 120) {
        issues.push({
          sev: 'warn',
          title: `敌兵越出房间边界：${rm.id} · ${e.id}`,
          msg: `局部坐标 (${e.x}, ${e.y}) 超出房间范围 ${rw}×${rh}。`,
          roomIdx: ri,
          sel: { kind: 'enemy', idx: ei },
          wx: rm.bounds.x + e.x,
          wy: rm.bounds.y + e.y
        });
      }
    });
  });

  // 5. Unregistered stamp types & river blocking vertical drop seams
  rooms.forEach((rm, ri) => {
    const stamps = (rm.props && Array.isArray(rm.props.stamps)) ? rm.props.stamps : [];
    stamps.forEach((st, si) => {
      if (!getStampDef(st.type)) {
        issues.push({
          sev: 'err',
          title: `未注册图章类型：${rm.id} · ${st.type}`,
          msg: `图章类型「${st.type}」未在 stampAtlas.js 注册，运行时会被静默跳过。`,
          roomIdx: ri,
          sel: { kind: 'stamp', idx: si },
          wx: rm.bounds.x + (Number(st.x) || 0),
          wy: rm.bounds.y + (Number(st.y) || 0)
        });
      }
    });
    const b = rm.bounds;
    const belowRooms = (rm.connections || [])
      .map(cid => byId.get(cid))
      .filter(x => x && Math.abs(x.rm.bounds.y - (b.y + b.h)) <= 24);
    if (belowRooms.length > 0) {
      (rm.rivers || []).forEach((rv, rvi) => {
        const rx0 = b.x + rv.x;
        const rx1 = rx0 + (rv.w || 0);
        const ry = b.y + rv.y;
        if (ry >= b.y + b.h - 190) {
          for (const br of belowRooms) {
            const ob = br.rm.bounds;
            if (Math.min(rx1, ob.x + ob.w) - Math.max(rx0, ob.x) > 40) {
              issues.push({
                sev: 'warn',
                title: `暗河覆盖下方垂直通道：${rm.id} → ${br.rm.id}`,
                msg: `暗河 ${rv.id || rvi} 位于底部连通口上方，可能导致玩家落井前被暗河扣血传回。`,
                roomIdx: ri,
                sel: { kind: 'river', idx: rvi },
                wx: (rx0 + rx1) * 0.5,
                wy: ry
              });
            }
          }
        }
      });
    }
  });

  // 6. v34.0 Ecological Mechanics, Realm Seals, requiresBoss & skyBridgeGate Audit + 1x Economy Accounting
  const allActorIds = new Set(['boss_hui', 'boss_ji', 'boss_yuan', 'boss_zhu']);
  const foundSeals = new Set();
  const validRelicIds = new Set(RELICS.map(r => r.id));
  let skyBridgeCount = 0;
  const eco = { regEnemies: 0, regCount: 0, wardens: 0, bosses: 0, echoCaches: 0, otherPickups: 0, npcQuests: 580 };

  rooms.forEach(rm => {
    (rm.enemies || []).forEach(e => { if (e.id) allActorIds.add(e.id); });
    (rm.bosses || []).forEach(b => { if (b.id) allActorIds.add(b.id); });
  });

  rooms.forEach((rm, ri) => {
    const rw = rm.bounds.w;
    const rh = rm.bounds.h;
    (rm.windZones || []).forEach((wz, wi) => {
      if ((Number(wz.w) || 0) < 40 || (Number(wz.h) || 0) < 60) {
        issues.push({
          sev: 'warn',
          title: `罡风尺寸过窄：${rm.id} · ${wz.id || wi}`,
          msg: `风区尺寸 ${wz.w}×${wz.h} 偏小，可能导致玩家滑脱气流。`,
          roomIdx: ri,
          sel: { kind: 'windZone', idx: wi },
          wx: rm.bounds.x + wz.x,
          wy: rm.bounds.y + wz.y
        });
      }
      if (wz.x < -40 || wz.x + (wz.w || 0) > rw + 40) {
        issues.push({
          sev: 'warn',
          title: `罡风水平越界：${rm.id} · ${wz.id || wi}`,
          msg: `风区水平区间 [${wz.x}, ${wz.x + (wz.w || 0)}] 超出房间宽度 ${rw}。`,
          roomIdx: ri,
          sel: { kind: 'windZone', idx: wi }
        });
      }
    });
    (rm.bouncePads || []).forEach((bp, bi) => {
      if ((Number(bp.w) || 0) < 36 || (Number(bp.h) || 0) < 14 || bp.x < 0 || bp.x > rw || bp.y < 0 || bp.y > rh + 20) {
        issues.push({
          sev: 'warn',
          title: `孢伞位置或尺寸异常：${rm.id} · ${bp.id || bi}`,
          msg: `坐标 (${bp.x}, ${bp.y}) 尺寸 ${bp.w}×${bp.h} 建议保持在房间内且 ≥ 36×14。`,
          roomIdx: ri,
          sel: { kind: 'bouncePad', idx: bi },
          wx: rm.bounds.x + bp.x,
          wy: rm.bounds.y + bp.y
        });
      }
    });
    (rm.gates || []).forEach((g, gi) => {
      if (g.role === 'skyBridge' || g.id === 'gate_sky_bridge') {
        skyBridgeCount++;
        if ((Number(g.w) || 0) <= 0 || (Number(g.h) || 0) <= 0) {
          issues.push({
            sev: 'err',
            title: `天顶石门尺寸为零：${rm.id} · ${g.id}`,
            msg: `skyBridge 石门宽高必须 > 0，否则无法阻挡未解封通路。`,
            roomIdx: ri,
            sel: { kind: 'gate', idx: gi }
          });
        }
      }
    });
    (rm.pickups || []).forEach((pk, pi) => {
      const amt = Number(pk.echoAmount) || 0;
      if (amt > 0) {
        if (pk.kind === 'echoCache') eco.echoCaches += amt;
        else eco.otherPickups += amt;
      }
      if (pk.kind === 'realmSeal') {
        if (pk.sealId) foundSeals.add(pk.sealId);
        if (pk.relicId && !validRelicIds.has(pk.relicId)) {
          issues.push({
            sev: 'err',
            title: `铭印神龛圣物ID无效：${rm.id} · ${pk.id}`,
            msg: `relicId「${pk.relicId}」不在 RELICS 注册表中。`,
            roomIdx: ri,
            sel: { kind: 'pickup', idx: pi },
            wx: rm.bounds.x + pk.x,
            wy: rm.bounds.y + pk.y
          });
        }
      }
      if (pk.requiresBoss && !allActorIds.has(pk.requiresBoss)) {
        issues.push({
          sev: 'err',
          title: `战后解封目标不存在：${rm.id} · ${pk.id}`,
          msg: `requiresBoss「${pk.requiresBoss}」在全境敌兵/首领中未找到。`,
          roomIdx: ri,
          sel: { kind: 'pickup', idx: pi },
          wx: rm.bounds.x + pk.x,
          wy: rm.bounds.y + pk.y
        });
      }
    });
    (rm.enemies || []).forEach(e => {
      const r = Number(ENEMY_ECHO_REWARDS[e.kind]) || 0;
      if (e.kind === 'dummy') return;
      if (e.kind && e.kind.startsWith('warden_')) eco.wardens += r;
      else { eco.regEnemies += r; eco.regCount++; }
    });
  });

  eco.bosses = (ENEMY_ECHO_REWARDS.boss || 0) + (ENEMY_ECHO_REWARDS.boss2 || 0) + (ENEMY_ECHO_REWARDS.boss3 || 0) + (ENEMY_ECHO_REWARDS.boss4 || 0);
  eco.total1x = eco.regEnemies + eco.wardens + eco.bosses + eco.echoCaches + eco.otherPickups + eco.npcQuests;
  eco.smithTotal = SMITH_UPGRADES.reduce((acc, u) => acc + u.costs.reduce((a, b) => a + b, 0), 0);
  eco.coreSink = eco.smithTotal + 140 * 3 + 200 + RELIC_REFINE_COST * 3;
  state.lastAuditEco = eco;

  for (const needSeal of ['wind', 'forest', 'mountain']) {
    if (!foundSeals.has(needSeal)) {
      issues.push({
        sev: 'warn',
        title: `缺失三境铭印神龛：${needSeal}`,
        msg: `全境未检测到 sealId="${needSeal}" 的 realmSeal 秘宝，玩家将无法解封第三圣物槽。`,
        roomIdx: 0
      });
    }
  }
  if (skyBridgeCount === 0) {
    issues.push({
      sev: 'warn',
      title: `缺失天顶断桥石门 (skyBridge)`,
      msg: `未检测到 role="skyBridge" 石门（通常位于 r17_frost_summit 西侧边界）。`,
      roomIdx: 0
    });
  }
  if (eco.total1x < 5200 || eco.total1x > 7200) {
    issues.push({
      sev: 'warn',
      title: `全境 1× 残响经济偏离目标区间：${eco.total1x}`,
      msg: `25 房经济目标为 5,200 ~ 7,200 残响（当前 ${eco.total1x}），建议核查 echoCache 与守誓奖励。`,
      roomIdx: 0
    });
  }

  if (totalAltars === 0 || !hasStartAltar) {
    issues.push({
      sev: 'err',
      title: `缺少起点祭坛 (${startAltarId})`,
      msg: `全境未找到与 world.startAltarId 匹配的出生祭坛。`,
      roomIdx: 0
    });
  }

  // 7. v45.5 Real-Time 5-Tier Directed Topology, Anti-Softlock, Boss-Bypass & Shaft Clearance Audit
  const topo = runTopologyAndShaftAudit(state.bundle);
  state.lastAuditTopo = topo;
  for (const tiss of topo.issues) {
    issues.push(tiss);
  }

  // Build per-room violation map for instant canvas & sidebar highlighting
  const rMap = new Map();
  const addRoomIssue = (rid, sev) => {
    if (!rid) return;
    let rec = rMap.get(rid);
    if (!rec) { rec = { err: 0, warn: 0 }; rMap.set(rid, rec); }
    if (sev === 'err') rec.err++;
    else rec.warn++;
  };
  for (const iss of issues) {
    if (Array.isArray(iss.roomIds) && iss.roomIds.length > 0) {
      for (const rid of iss.roomIds) addRoomIssue(rid, iss.sev);
    } else if (iss.roomIdx !== undefined && rooms[iss.roomIdx]) {
      addRoomIssue(rooms[iss.roomIdx].id, iss.sev);
    }
  }
  state.roomAuditMap = rMap;
  state.lastAuditIssues = issues;

  return issues;
}

function syncAuditToolbarButtons() {
  const issues = state.lastAuditIssues || [];
  const errCnt = issues.filter(i => i.sev === 'err').length;
  const warnCnt = issues.filter(i => i.sev === 'warn').length;
  const btn = document.getElementById('btn-audit');
  if (btn) {
    btn.classList.remove('audit-ok-btn', 'audit-warn-btn', 'audit-err-btn');
    if (errCnt > 0) {
      btn.classList.add('audit-err-btn');
      btn.textContent = `🩺 体检 ✖${errCnt}`;
    } else if (warnCnt > 0) {
      btn.classList.add('audit-warn-btn');
      btn.textContent = `🩺 体检 ⚠${warnCnt}`;
    } else {
      btn.classList.add('audit-ok-btn');
      btn.textContent = '🩺 全境体检 ✓';
    }
  }
  const hlBtns = [document.getElementById('btn-audit-highlight'), document.getElementById('btn-audit-highlight-top')];
  for (const hb of hlBtns) {
    if (!hb) continue;
    hb.classList.toggle('highlight-on', !!state.auditHighlight);
    hb.textContent = state.auditHighlight ? '🔦 高亮中 [G]' : '🔦 高亮违规房 [G]';
  }
}

function toggleAuditHighlight(forceVal = null) {
  state.auditHighlight = forceVal !== null ? !!forceVal : !state.auditHighlight;
  if (state.auditHighlight) {
    refreshLiveAudit(false);
    const violRooms = [...state.roomAuditMap.entries()].filter(([, v]) => v.err > 0 || v.warn > 0);
    state.viewMode = 'world';
    const bRoom = document.getElementById('btn-view-room');
    const bWorld = document.getElementById('btn-view-world');
    if (bRoom) bRoom.classList.remove('active');
    if (bWorld) bWorld.classList.add('active');
    fitView();
    showToast(violRooms.length > 0
      ? `已高亮 ${violRooms.length} 个违规/告警房间（红框=错误 · 黄框=警告）`
      : '当前全境 0 违规房间，保持实时监控高亮中');
  } else {
    showToast('已关闭违规房间高亮');
  }
  syncAuditToolbarButtons();
  draw();
}

function refreshLiveAudit(openDrawer = false) {
  if (!state.bundle) return;
  const issues = runWorldAudit();
  const errCnt = issues.filter(i => i.sev === 'err').length;
  const warnCnt = issues.filter(i => i.sev === 'warn').length;
  syncAuditToolbarButtons();
  renderRoomList();

  const drawerVisible = openDrawer || (auditPanelEl && !auditPanelEl.classList.contains('hidden'));
  if (drawerVisible) {
    if (auditSummaryEl) {
      auditSummaryEl.textContent = `${state.bundle.rooms.length} 房 · ${errCnt} 错误 · ${warnCnt} 警告`;
    }
    if (auditListEl) {
      auditListEl.innerHTML = '';

      if (state.lastAuditTopo && state.lastAuditTopo.tiers && state.lastAuditTopo.tiers.length > 0) {
        const topoBox = document.createElement('div');
        const anyBad = state.lastAuditTopo.tiers.some(t => t.hasViolation);
        topoBox.className = `audit-topo-box${anyBad ? ' has-err' : ''}`;
        const activeLbl = state.auditTierOverlay
          ? `透视中: ${state.auditTierOverlay} (再点取消)`
          : '点击阶梯透视可达范围';
        topoBox.innerHTML = `
          <div class="audit-topo-head">
            <span>🧭 5阶有向可达图 · 防软锁 & 竖井净空</span>
            <span class="audit-topo-sub">${activeLbl}</span>
          </div>
          <div class="audit-topo-tiers"></div>
        `;
        const tiersRow = topoBox.querySelector('.audit-topo-tiers');
        for (const t of state.lastAuditTopo.tiers) {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = `audit-tier-chip${state.auditTierOverlay === t.id ? ' active' : ''}${t.hasViolation ? ' bad' : ''}`;
          chip.title = `${t.label}：可达 ${t.visited.size}/${state.bundle.rooms.length} 房${t.softlocked.size ? ` · 软锁 ${t.softlocked.size}` : ''}${t.leaked.size ? ` · 绕后 ${t.leaked.size}` : ''}`;
          chip.innerHTML = `<span>${t.short}</span><strong>${t.visited.size}/${state.bundle.rooms.length}</strong>`;
          chip.addEventListener('click', () => {
            state.auditTierOverlay = (state.auditTierOverlay === t.id) ? null : t.id;
            if (state.auditTierOverlay) {
              state.viewMode = 'world';
              document.getElementById('btn-view-room').classList.remove('active');
              document.getElementById('btn-view-world').classList.add('active');
              fitView();
            }
            refreshLiveAudit(true);
            draw();
          });
          tiersRow.appendChild(chip);
        }
        auditListEl.appendChild(topoBox);
      }

      if (state.lastAuditEco) {
        const e = state.lastAuditEco;
        const inRange = e.total1x >= 5200 && e.total1x <= 7200;
        const ecoEl = document.createElement('div');
        ecoEl.className = `audit-eco${inRange ? '' : ' warn'}`;
        ecoEl.innerHTML = `
          <div class="audit-eco-head">
            <span>✦ 全境 1× 残响经济体检 (目标 5,200~7,200)</span>
            <span style="color:${inRange ? 'var(--emerald)' : 'var(--red)'};">${e.total1x} 残响 (${inRange ? '达标' : '偏离'})</span>
          </div>
          <div class="audit-eco-grid">
            <span>常规怪(${e.regCount}只): <strong>${e.regEnemies}</strong></span>
            <span>三境守誓(3位): <strong>${e.wardens}</strong></span>
            <span>主线/隐藏首领: <strong>${e.bosses}</strong></span>
            <span>残响秘宝匣: <strong>${e.echoCaches}</strong></span>
            <span>铭印/核心附赠: <strong>${e.otherPickups}</strong></span>
            <span>NPC支线酬谢: <strong>${e.npcQuests}</strong></span>
            <span>铁匠满级消耗: <strong>${e.smithTotal}</strong></span>
            <span>3槽主力总耗: <strong>${e.coreSink}</strong></span>
          </div>
        `;
        auditListEl.appendChild(ecoEl);
      }

      if (issues.length === 0) {
        const okEl = document.createElement('div');
        okEl.className = 'audit-ok';
        okEl.innerHTML = `✦ 全境 ${state.bundle.rooms.length} 房间实时体检全部通过！<br>0 软锁 · 0 Boss绕后 · 0 横向暗墙 · 竖井净空 / 钩点 / 黑冲结界 / 经济均达标`;
        auditListEl.appendChild(okEl);
      } else {
        for (const iss of issues) {
          const btn = document.createElement('button');
          btn.className = `audit-item ${iss.sev}`;
          btn.innerHTML = `
            <div class="audit-item-head"><span>${iss.sev === 'err' ? '✖' : '⚠'} ${iss.title}</span><span>定位 →</span></div>
            <div class="audit-item-msg">${iss.msg}</div>
          `;
          btn.addEventListener('click', () => {
            state.auditHighlight = true;
            syncAuditToolbarButtons();
            if (iss.tierId) {
              state.auditTierOverlay = iss.tierId;
              state.viewMode = 'world';
              document.getElementById('btn-view-room').classList.remove('active');
              document.getElementById('btn-view-world').classList.add('active');
              state.activeRoomIdx = iss.roomIdx || 0;
              renderAllUI();
              fitView();
            } else {
              state.viewMode = 'room';
              document.getElementById('btn-view-room').classList.add('active');
              document.getElementById('btn-view-world').classList.remove('active');
              state.activeRoomIdx = iss.roomIdx || 0;
              state.selection = iss.sel || null;
              renderAllUI();
              if (iss.wx !== undefined && iss.wy !== undefined) {
                centerCameraOn(iss.wx, iss.wy, Math.max(0.85, state.cam.zoom));
              } else {
                fitView();
              }
            }
            draw();
          });
          auditListEl.appendChild(btn);
        }
      }
    }
    if (openDrawer && auditPanelEl) auditPanelEl.classList.remove('hidden');
  }
  if (state.auditHighlight || state.auditTierOverlay) draw();
}

function scheduleLiveAudit() {
  if (state.auditDebounceTimer) clearTimeout(state.auditDebounceTimer);
  state.auditDebounceTimer = setTimeout(() => {
    state.auditDebounceTimer = null;
    refreshLiveAudit(false);
  }, 160);
}

function showAuditPanel() {
  refreshLiveAudit(true);
}

// ==================== MOUSE & KEYBOARD INTERACTION ====================
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('mouseleave', () => {
  state.hoverInsideCanvas = false;
  draw();
});

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

  // Pinpoint Playtest click
  if (state.tool === 'playtestPin') {
    launchPlaytest({ x: snap(wpt.x), y: snap(wpt.y) });
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
  const inside = sx >= 0 && sy >= 0 && sx <= rect.width && sy <= rect.height;
  state.hoverInsideCanvas = inside;
  const wpt = screenToWorld(sx, sy);
  state.hoverWorld = wpt;
  const rm = getActiveRoom();
  if (rm) {
    statusPosEl.textContent = `房间坐标: (${Math.round(wpt.x - rm.bounds.x)}, ${Math.round(wpt.y - rm.bounds.y)}) | 世界坐标: (${Math.round(wpt.x)}, ${Math.round(wpt.y)})`;
  }

  if (!state.drag) {
    if (inside && (state.tool === 'stamp' || state.tool === 'playtestPin')) draw();
    return;
  }
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
    const item = state.drag.item;
    const o = item.obj;
    const orig = state.drag.orig;
    const h = state.drag.handle;
    if (item.bottomCenter) {
      // BouncePad uses bottom-center (x, y)
      let L = orig.x - orig.w * 0.5;
      let R = orig.x + orig.w * 0.5;
      let T = orig.y - orig.h;
      let B = orig.y;
      if (h.includes('e')) R = Math.max(L + 36, R + dx);
      if (h.includes('w')) L = Math.min(R - 36, L + dx);
      if (h.includes('s')) B = Math.max(T + 16, B + dy);
      if (h.includes('n')) T = Math.min(B - 16, T + dy);
      o.w = Math.round(R - L);
      o.h = Math.round(B - T);
      o.x = Math.round((L + R) * 0.5);
      o.y = Math.round(B);
    } else {
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
  if (e.code === 'Escape') {
    if (auditPanelEl && !auditPanelEl.classList.contains('hidden')) {
      auditPanelEl.classList.add('hidden');
      return;
    }
    setTool('select');
  } else if (e.code === 'KeyV') setTool('select');
  else if (e.code === 'KeyF') fitView();
  else if (e.code === 'KeyM') toggleRenderMode();
  else if (e.code === 'KeyG') toggleAuditHighlight();
  else if (e.code === 'KeyP') {
    e.preventDefault();
    if (state.hoverInsideCanvas) {
      launchPlaytest({ x: snap(state.hoverWorld.x), y: snap(state.hoverWorld.y) });
    } else {
      setTool('playtestPin');
      showToast('定点试玩模式：在画布任意位置点击即可空降试玩');
    }
  } else if (e.code === 'BracketLeft') {
    mutateSelectedStamp(st => { st.scale = Math.max(0.25, +((Number(st.scale) || 1) - 0.1).toFixed(2)); });
  } else if (e.code === 'BracketRight') {
    mutateSelectedStamp(st => { st.scale = Math.min(3.0, +((Number(st.scale) || 1) + 0.1).toFixed(2)); });
  } else if (e.code === 'KeyH') {
    mutateSelectedStamp(st => { st.flip = !st.flip; });
  } else if (e.code === 'KeyL') {
    mutateSelectedStamp(st => { st.layer = (st.layer || 'bg') === 'bg' ? 'fg' : 'bg'; });
  } else if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
    mutateSelectedStamp(st => { st.seed = ((Number(st.seed) || 0) + 1) % 3; });
  } else if (e.code === 'Delete' || e.code === 'Backspace') { e.preventDefault(); deleteSelected(); }
  else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') { e.preventDefault(); duplicateSelected(); }
  else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); doUndo(); }
  else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') { e.preventDefault(); doRedo(); }
});

function setTool(tool) {
  state.tool = tool;
  document.querySelectorAll('.tool-btn').forEach(b => {
    if (b.dataset.stampType) {
      b.classList.toggle('active', tool === 'stamp' && b.dataset.stampType === state.activeStampType);
    } else {
      b.classList.toggle('active', b.dataset.tool === tool);
    }
  });
  const pinBtn = document.getElementById('btn-playtest-pin');
  if (pinBtn) pinBtn.classList.toggle('active', tool === 'playtestPin');
  renderAllUI();
  draw();
}

function doUndo() {
  if (state.undoStack.length === 0) return;
  state.redoStack.push(cloneBundle());
  state.bundle = state.undoStack.pop();
  state.activeRoomIdx = Math.min(state.activeRoomIdx, state.bundle.rooms.length - 1);
  state.selection = null;
  renderAllUI();
  refreshLiveAudit(false);
  draw();
  showToast('已撤销');
}

function doRedo() {
  if (state.redoStack.length === 0) return;
  state.undoStack.push(cloneBundle());
  state.bundle = state.redoStack.pop();
  state.selection = null;
  renderAllUI();
  refreshLiveAudit(false);
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

renderStampPalette();

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
function toggleRenderMode() {
  state.renderMode = state.renderMode === 'ink' ? 'wireframe' : 'ink';
  const btn = document.getElementById('btn-render-ink');
  if (btn) {
    const isInk = state.renderMode === 'ink';
    btn.classList.toggle('active', isInk);
    btn.classList.toggle('gold', isInk);
    btn.textContent = isInk ? '🎨 实景水墨 [M]' : '📐 工程线框 [M]';
  }
  renderAllUI();
  draw();
  showToast(state.renderMode === 'ink' ? '已切换至 WYSIWYG 实景水墨预览' : '已切换至工程线框模式');
}
document.getElementById('btn-render-ink').addEventListener('click', toggleRenderMode);
document.getElementById('btn-fit').addEventListener('click', fitView);
document.getElementById('btn-undo').addEventListener('click', doUndo);
document.getElementById('btn-redo').addEventListener('click', doRedo);
document.getElementById('btn-audit').addEventListener('click', showAuditPanel);
document.getElementById('btn-audit-rerun').addEventListener('click', showAuditPanel);
const btnAuditHl = document.getElementById('btn-audit-highlight');
if (btnAuditHl) btnAuditHl.addEventListener('click', () => toggleAuditHighlight());
const btnAuditHlTop = document.getElementById('btn-audit-highlight-top');
if (btnAuditHlTop) btnAuditHlTop.addEventListener('click', () => toggleAuditHighlight());
document.getElementById('btn-audit-close').addEventListener('click', () => {
  if (auditPanelEl) auditPanelEl.classList.add('hidden');
});

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
    windZones: [],
    bouncePads: [],
    altars: [],
    npcs: [],
    loreTablets: [],
    gates: [],
    secretWalls: [],
    voidBarriers: [],
    pickups: [],
    resonancePuzzles: [],
    pendulums: [],
    rivers: [],
    grappleAnchors: [{ id: `anc_${rid}`, x: 580, y: 240, topY: 0 }],
    lanterns: [{ id: `lan_${rid}`, x: 360, anchorY: 160, len: 150, angle: 0.04 }],
    enemies: [],
    bosses: [],
    inscriptions: [],
    props: { puddles: [], banners: [], candles: [], boneCairns: [], stamps: [] }
  };
  state.bundle.rooms.push(newRoom);
  syncManifestFromRooms();
  state.activeRoomIdx = state.bundle.rooms.length - 1;
  state.selection = null;
  renderAllUI();
  fitView();
  showToast(`已新建房间 ${rid}`);
});

const delRoomBtn = document.getElementById('btn-del-room');
if (delRoomBtn) {
  delRoomBtn.addEventListener('click', () => {
    if (!state.bundle || state.bundle.rooms.length <= 1) {
      showToast('至少需要保留 1 个房间，无法继续删除');
      return;
    }
    const rm = getActiveRoom();
    if (!rm) return;
    if (!window.confirm(`确定要删除房间「${rm.name} (${rm.id})」吗？（删除后仍可按 Ctrl+Z 撤销）`)) return;
    pushUndo();
    const removedId = rm.id;
    state.bundle.rooms.splice(state.activeRoomIdx, 1);
    for (const r of state.bundle.rooms) {
      if (Array.isArray(r.connections)) {
        r.connections = r.connections.filter(id => id !== removedId);
      }
    }
    state.activeRoomIdx = Math.max(0, Math.min(state.activeRoomIdx, state.bundle.rooms.length - 1));
    state.selection = null;
    syncManifestFromRooms();
    renderAllUI();
    fitView();
    showToast(`已删除房间 ${removedId}（可按 Ctrl+Z 撤销）`);
  });
}

document.getElementById('btn-playtest').addEventListener('click', () => launchPlaytest(null));
document.getElementById('btn-playtest-pin').addEventListener('click', () => {
  if (state.tool === 'playtestPin') {
    setTool('select');
  } else {
    state.viewMode = 'room';
    document.getElementById('btn-view-room').classList.add('active');
    document.getElementById('btn-view-world').classList.remove('active');
    setTool('playtestPin');
    showToast('点击画布任意位置即可在此空降试玩（Esc 取消）');
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
    refreshLiveAudit(false);
    fitView();
    showToast(`v45.5 已载入 ${state.bundle.rooms.length} 个全境房间 JSON · 实时拓扑体检就绪`);
  } catch (err) {
    showToast(`加载失败: ${err.message}（请通过 serve_local.py 启动）`);
  }
}

bootEditor();
