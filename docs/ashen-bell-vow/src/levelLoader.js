// Asynchronous Room-Based JSON Data Stream loader & runtime hydrator
import {
  ROOMS, SOLIDS, ALTARS, NPCS, ALTAR_POS, LORE_TABLETS,
  SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_ENTRY_GATE_DEF, FOUNDRY_EXIT_GATE_DEF,
  SECRET_WALLS_DEF, VOID_BARRIERS, PICKUPS_DEF, RESONANCE_PUZZLES_DEF, CRUMBLE_PLATFORMS_DEF,
  PENDULUMS, ABYSSAL_RIVERS, ABYSSAL_RIVER, WALL_INSCRIPTIONS, GRAPPLE_ANCHORS,
  LANTERNS_DEF, ENEMIES_DEF, BOSSES_DEF, PUDDLES, BANNERS, CANDLE_CLUSTERS, BONE_CAIRNS, STAMPS, WIND_ZONES, BOUNCE_PADS,
  PREVIEW_STORAGE_KEY, setWorldMetrics
} from './config.js';
import { G } from './state.js';
import { t, locZoneName, locRoomName, locSubZone } from './i18n.js';
import { invalidateTerrainCache } from './renderTerrain.js';

function resetArray(arr) {
  arr.length = 0;
}

export function isPreviewMode() {
  try {
    return new URLSearchParams(window.location.search).get('preview') === '1';
  } catch {
    return false;
  }
}

export function getPreviewSpawnRoomId() {
  try {
    return new URLSearchParams(window.location.search).get('room') || null;
  } catch {
    return null;
  }
}

export function hydrateWorldBundle(bundle) {
  if (!bundle || !bundle.world || !Array.isArray(bundle.rooms)) {
    throw new Error(t('err.invalidBundle'));
  }
  const { world, rooms } = bundle;

  resetArray(ROOMS);
  resetArray(SOLIDS);
  resetArray(ALTARS);
  resetArray(NPCS);
  resetArray(LORE_TABLETS);
  resetArray(SECRET_WALLS_DEF);
  resetArray(VOID_BARRIERS);
  resetArray(PICKUPS_DEF);
  resetArray(RESONANCE_PUZZLES_DEF);
  resetArray(CRUMBLE_PLATFORMS_DEF);
  resetArray(PENDULUMS);
  resetArray(ABYSSAL_RIVERS);
  resetArray(WALL_INSCRIPTIONS);
  resetArray(GRAPPLE_ANCHORS);
  resetArray(LANTERNS_DEF);
  resetArray(ENEMIES_DEF);
  for (const k of Object.keys(BOSSES_DEF)) delete BOSSES_DEF[k];
  resetArray(PUDDLES);
  resetArray(BANNERS);
  resetArray(CANDLE_CLUSTERS);
  resetArray(BONE_CAIRNS);
  resetArray(STAMPS);
  resetArray(WIND_ZONES);
  resetArray(BOUNCE_PADS);

  // Reset gate widths so removed gates do not leave phantom collisions
  SHORTCUT_GATE_DEF.w = 0;
  SHORTCUT_GATE_DEF.h = 0;
  CHAPEL_EXIT_GATE_DEF.w = 0;
  CHAPEL_EXIT_GATE_DEF.h = 0;
  FOUNDRY_ENTRY_GATE_DEF.w = 0;
  FOUNDRY_ENTRY_GATE_DEF.h = 0;
  FOUNDRY_EXIT_GATE_DEF.w = 0;
  FOUNDRY_EXIT_GATE_DEF.h = 0;
  ABYSSAL_RIVER.w = 0;

  let maxW = 960;
  let maxH = 720;

  for (const room of rooms) {
    const b = room.bounds || { x: 0, y: 0, w: 1280, h: 720 };
    const ox = Number(b.x) || 0;
    const oy = Number(b.y) || 0;
    const rw = Number(b.w) || 1280;
    const rh = Number(b.h) || 720;
    if (ox + rw > maxW) maxW = ox + rw;
    if (oy + rh > maxH) maxH = oy + rh;

    ROOMS.push({
      id: room.id,
      zoneName: room.zoneName || '晦渊',
      name: room.name || room.id,
      theme: room.theme || 'corridor',
      bounds: { x: ox, y: oy, w: rw, h: rh },
      connections: Array.isArray(room.connections) ? [...room.connections] : [],
      subZones: Array.isArray(room.subZones)
        ? room.subZones.map(sz => ({
            name: sz.name,
            x: ox + (Number(sz.x) || 0),
            y: oy + (Number(sz.y) || 0),
            w: Number(sz.w) || rw,
            h: Number(sz.h) || rh
          }))
        : []
    });

    for (const s of (room.solids || [])) {
      SOLIDS.push({
        x: ox + s.x,
        y: oy + s.y,
        w: s.w,
        h: s.h,
        type: s.type || 'platform',
        roomId: room.id,
        seamLeft: false,
        seamRight: false
      });
    }

    for (const cp of (room.crumblePlatforms || [])) {
      CRUMBLE_PLATFORMS_DEF.push({
        id: cp.id,
        x: ox + cp.x,
        y: oy + cp.y,
        w: cp.w,
        h: cp.h,
        roomId: room.id
      });
    }

    for (const a of (room.altars || [])) {
      ALTARS.push({
        ...a,
        x: ox + a.x,
        y: oy + a.y,
        roomId: room.id
      });
    }

    for (const npc of (room.npcs || [])) {
      NPCS.push({
        ...npc,
        x: ox + npc.x,
        y: oy + npc.y,
        roomId: room.id
      });
    }

    for (const lt of (room.loreTablets || [])) {
      LORE_TABLETS.push({
        ...lt,
        x: ox + lt.x,
        y: oy + lt.y,
        roomId: room.id
      });
    }

    for (const g of (room.gates || [])) {
      const worldGate = {
        ...g,
        x: ox + g.x,
        y: oy + g.y,
        roomId: room.id
      };
      if (g.leverX !== undefined) worldGate.leverX = ox + g.leverX;
      if (g.leverY !== undefined) worldGate.leverY = oy + g.leverY;
      if (g.role === 'shortcut' || g.id === 'gate_skyway') {
        Object.assign(SHORTCUT_GATE_DEF, worldGate);
      } else if (g.role === 'chapelExit' || g.id === 'gate_chapel_exit') {
        Object.assign(CHAPEL_EXIT_GATE_DEF, worldGate);
      } else if (g.role === 'foundryEntry' || g.id === 'gate_foundry_entry') {
        Object.assign(FOUNDRY_ENTRY_GATE_DEF, worldGate);
      } else if (g.role === 'foundryExit' || g.id === 'gate_foundry_exit') {
        Object.assign(FOUNDRY_EXIT_GATE_DEF, worldGate);
      }
    }

    for (const sw of (room.secretWalls || [])) {
      SECRET_WALLS_DEF.push({
        ...sw,
        x: ox + sw.x,
        y: oy + sw.y,
        roomId: room.id
      });
    }

    for (const vb of (room.voidBarriers || [])) {
      VOID_BARRIERS.push({
        ...vb,
        x: ox + vb.x,
        y: oy + vb.y,
        type: 'pillar',
        isVoidBarrier: true,
        roomId: room.id
      });
    }

    for (const pk of (room.pickups || [])) {
      PICKUPS_DEF.push({
        ...pk,
        x: ox + pk.x,
        y: oy + pk.y,
        roomId: room.id
      });
    }

    for (const pz of (room.resonancePuzzles || [])) {
      RESONANCE_PUZZLES_DEF.push({
        ...pz,
        cageX: ox + pz.cageX,
        cageY: oy + pz.cageY,
        roomId: room.id,
        bells: (pz.bells || []).map(bl => ({
          ...bl,
          x: ox + bl.x,
          y: oy + bl.y,
          topY: oy + (bl.topY !== undefined ? bl.topY : 0)
        }))
      });
    }

    for (const pd of (room.pendulums || [])) {
      PENDULUMS.push({
        ...pd,
        x: ox + pd.x,
        anchorY: oy + pd.anchorY,
        hitCd: 0,
        roomId: room.id
      });
    }

    for (const rv of (room.rivers || [])) {
      const worldRv = { id: rv.id || `rv_${room.id}`, x: ox + rv.x, y: oy + rv.y, w: rv.w, roomId: room.id };
      ABYSSAL_RIVERS.push(worldRv);
    }

    for (const wz of (room.windZones || [])) {
      WIND_ZONES.push({
        id: wz.id || `wz_${room.id}_${WIND_ZONES.length}`,
        x: ox + (Number(wz.x) || 0),
        y: oy + (Number(wz.y) || 0),
        w: Number(wz.w) || 120,
        h: Number(wz.h) || 320,
        vx: Number(wz.vx) || 0,
        vy: Number(wz.vy) || -980,
        roomId: room.id
      });
    }

    for (const bp of (room.bouncePads || [])) {
      BOUNCE_PADS.push({
        id: bp.id || `bp_${room.id}_${BOUNCE_PADS.length}`,
        x: ox + (Number(bp.x) || 0),
        y: oy + (Number(bp.y) || 0),
        w: Number(bp.w) || 74,
        h: Number(bp.h) || 26,
        boostVy: Number(bp.boostVy) || -790,
        squish: 0,
        cd: 0,
        roomId: room.id
      });
    }

    for (const anc of (room.grappleAnchors || [])) {
      const entry = { ...anc, x: ox + anc.x, y: oy + anc.y, roomId: room.id };
      if (anc.topY !== undefined) entry.topY = oy + anc.topY;
      GRAPPLE_ANCHORS.push(entry);
    }

    for (const lan of (room.lanterns || [])) {
      const entry = {
        ...lan,
        x: ox + lan.x,
        anchorY: oy + lan.anchorY,
        roomId: room.id
      };
      if (lan.topY !== undefined) entry.topY = oy + lan.topY;
      LANTERNS_DEF.push(entry);
    }

    for (const e of (room.enemies || [])) {
      const entry = { ...e, x: ox + e.x, y: oy + e.y, roomId: room.id };
      if (e.minX !== undefined) entry.minX = ox + e.minX;
      if (e.maxX !== undefined) entry.maxX = ox + e.maxX;
      ENEMIES_DEF.push(entry);
    }

    for (const boss of (room.bosses || [])) {
      BOSSES_DEF[boss.id] = {
        ...boss,
        x: ox + boss.x,
        y: oy + boss.y,
        arenaMinX: ox + boss.arenaMinX,
        arenaMaxX: ox + boss.arenaMaxX,
        arenaFloorY: oy + boss.arenaFloorY,
        arenaTopY: oy + boss.arenaTopY,
        roomId: room.id
      };
    }

    for (const ins of (room.inscriptions || [])) {
      WALL_INSCRIPTIONS.push({
        ...ins,
        x: ox + ins.x,
        y: oy + ins.y,
        roomId: room.id
      });
    }

    const props = room.props || {};
    for (const p of (props.puddles || [])) {
      PUDDLES.push({ x: ox + p.x, w: p.w, roomId: room.id });
    }
    for (const bn of (props.banners || [])) {
      BANNERS.push({ ...bn, x: ox + bn.x, y: oy + bn.y, roomId: room.id });
    }
    for (const cl of (props.candles || [])) {
      CANDLE_CLUSTERS.push({ ...cl, x: ox + cl.x, y: oy + cl.y, roomId: room.id });
    }
    for (const bx of (props.boneCairns || [])) {
      BONE_CAIRNS.push(ox + bx);
    }
    for (const st of (props.stamps || [])) {
      STAMPS.push({
        ...st,
        x: ox + (Number(st.x) || 0),
        y: oy + (Number(st.y) || 0),
        roomId: room.id
      });
    }
  }

  // Mark adjacent ground slabs so room boundaries render seamlessly with zero false cliff seams
  for (let i = 0; i < SOLIDS.length; i++) {
    const a = SOLIDS[i];
    if (a.type !== 'ground') continue;
    for (let j = 0; j < SOLIDS.length; j++) {
      if (i === j) continue;
      const b = SOLIDS[j];
      if (b.type !== 'ground') continue;
      if (Math.abs(a.y - b.y) <= 4) {
        if (Math.abs(a.x - (b.x + b.w)) <= 4) a.seamLeft = true;
        if (Math.abs((a.x + a.w) - b.x) <= 4) a.seamRight = true;
      }
    }
  }

  if (ALTARS.length > 0) {
    const startAltar = ALTARS.find(a => a.id === world.startAltarId) || ALTARS[0];
    Object.assign(ALTAR_POS, startAltar);
  }
  if (ABYSSAL_RIVERS.length > 0) {
    Object.assign(ABYSSAL_RIVER, ABYSSAL_RIVERS[0]);
  }

  setWorldMetrics(maxW, maxH, world.floorY || 580, world.wellBottomY || 1380);
  invalidateTerrainCache();
  G.levelBundle = bundle;
  G.exploreDirty = true;
  G.minimapDirty = true;
  return bundle;
}

export async function loadWorldData() {
  // 1. Live Preview Mode from editor.html (?preview=1)
  if (isPreviewMode()) {
    try {
      const raw = localStorage.getItem(PREVIEW_STORAGE_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && draft.world && Array.isArray(draft.rooms) && draft.rooms.length > 0) {
          G.isEditorPreview = true;
          return hydrateWorldBundle(draft);
        }
      }
    } catch {
      // Fall back to static JSON files
    }
  }

  const fetchJsonWithRetry = async (url, retries = 2) => {
    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const resp = await fetch(url, { cache: 'no-cache' });
        if (!resp.ok) throw new Error(t('err.fetchFail', url, resp.status));
        return await resp.json();
      } catch (err) {
        lastErr = err;
        if (attempt < retries) await new Promise(r => setTimeout(r, 450 * (attempt + 1)));
      }
    }
    throw lastErr;
  };

  // 2. Fetch data/world.json and all room JSON files concurrently with mobile retry
  const world = await fetchJsonWithRetry('./data/world.json', 2);
  if (!world || !Array.isArray(world.rooms) || world.rooms.length === 0) {
    throw new Error(t('err.noRooms'));
  }

  const rooms = await Promise.all(
    world.rooms.map(async entry => {
      const data = await fetchJsonWithRetry(entry.file, 2);
      // Keep world.json manifest bounds authoritative if edited in world overview
      return {
        ...data,
        id: entry.id || data.id,
        zoneName: entry.zoneName || data.zoneName,
        name: entry.name || data.name,
        theme: entry.theme || data.theme,
        bounds: entry.bounds || data.bounds,
        connections: entry.connections || data.connections || []
      };
    })
  );

  G.isEditorPreview = false;
  return hydrateWorldBundle({ world, rooms });
}

export function getRoomAt(x, y) {
  for (let i = 0; i < ROOMS.length; i++) {
    const b = ROOMS[i].bounds;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      return ROOMS[i];
    }
  }
  return ROOMS[0] || null;
}

export function getZoneLabelAt(x, y) {
  const room = getRoomAt(x, y);
  if (!room) return locZoneName('晦渊');
  if (room.subZones && room.subZones.length > 0) {
    for (let i = 0; i < room.subZones.length; i++) {
      const sz = room.subZones[i];
      if (x >= sz.x && x <= sz.x + sz.w && y >= sz.y && y <= sz.y + sz.h) {
        return locSubZone(sz.name);
      }
    }
  }
  const z = locZoneName(room);
  const n = locRoomName(room);
  return z && n && z !== n ? `${z} · ${n}` : (n || z || locZoneName('晦渊'));
}

export function getRoomSpawnPoint(roomId) {
  const room = ROOMS.find(r => r.id === roomId) || ROOMS[0];
  if (!room) return { x: 316, y: 526 };
  // Prefer an altar inside this room
  const altar = ALTARS.find(a => a.roomId === room.id);
  if (altar) return { x: altar.x - 14, y: altar.y - 54 };
  // Otherwise find the first solid ground/platform inside this room and place player cleanly on top
  const roomSolids = SOLIDS.filter(s => s.roomId === room.id && (s.type === 'ground' || s.type === 'platform') && s.w >= 60);
  if (roomSolids.length > 0) {
    const s = roomSolids[0];
    return { x: Math.round(s.x + Math.min(120, s.w * 0.5) - 14), y: Math.round(s.y - 54) };
  }
  return { x: Math.round(room.bounds.x + 120), y: Math.round(room.bounds.y + room.bounds.h * 0.5) };
}
