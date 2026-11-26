// Camera Tracking, Boss Intro Framing, Room Occlusion/Visibility & Biome Weather/Theme Blending (split from src/world.js in v43.0)
import {
  COLORS, ROOM_THEMES, ROOMS, WORLD_MIN_X, WORLD_MIN_Y, WORLD_W, WORLD_H, FLOOR_Y, ABYSSAL_RIVERS, PUDDLES
} from './config.js';
import {
  G, getAwakeBoss, isSkyBridgeOpen, isWorldSwitchOn, isBoss4Unlocked, triggerZoneBanner
} from './state.js';
import { getRoomAt } from './levelLoader.js';
import { spawnWeatherRipple } from './vfx.js';
import { t, locZoneName } from './i18n.js';

function lerpRgb(cur, dst, alpha) {
  cur[0] += (dst[0] - cur[0]) * alpha;
  cur[1] += (dst[1] - cur[1]) * alpha;
  cur[2] += (dst[2] - cur[2]) * alpha;
}

export function updateThemeAndWeather(dt) {
  const focusX = G.player ? (G.player.x + G.player.w * 0.5) : (G.cam.x + G.canvasW * 0.5);
  const focusY = G.player ? (G.player.y + G.player.h * 0.5) : (G.cam.y + G.canvasH * 0.5);
  const room = getRoomAt(focusX, focusY);
  const themeKey = (room && room.theme && ROOM_THEMES[room.theme]) ? room.theme : 'sanctuary';
  const target = ROOM_THEMES[themeKey];
  const tb = G.themeBlend;
  tb.activeTheme = themeKey;
  tb.weather = target.weather;

  const activeBoss = getAwakeBoss();
  const isPhase2 = !!(activeBoss && activeBoss.phase >= 2);
  const blendT = Math.min(1, dt * 2.6);
  if (isPhase2 && activeBoss.id === 'boss_hui') {
    lerpRgb(tb.skyTop, [26, 9, 15], blendT);
    lerpRgb(tb.skyMid, [40, 14, 22], blendT);
    lerpRgb(tb.skyBot, [9, 4, 8], blendT);
    lerpRgb(tb.mist, [38, 10, 16], blendT);
    lerpRgb(tb.accent, [248, 113, 113], blendT);
  } else if (isPhase2 && activeBoss.id === 'boss_ji') {
    lerpRgb(tb.skyTop, [32, 14, 9], blendT);
    lerpRgb(tb.skyMid, [56, 24, 12], blendT);
    lerpRgb(tb.skyBot, [13, 6, 4], blendT);
    lerpRgb(tb.mist, [58, 26, 10], blendT);
    lerpRgb(tb.accent, [253, 224, 71], blendT);
  } else if (isPhase2 && activeBoss.id === 'boss_yuan') {
    const isP3 = activeBoss.phase >= 3;
    lerpRgb(tb.skyTop, isP3 ? [38, 12, 10] : [26, 10, 28], blendT);
    lerpRgb(tb.skyMid, isP3 ? [68, 24, 14] : [46, 16, 44], blendT);
    lerpRgb(tb.skyBot, isP3 ? [16, 6, 5] : [11, 5, 14], blendT);
    lerpRgb(tb.mist, isP3 ? [72, 28, 12] : [48, 14, 46], blendT);
    lerpRgb(tb.accent, isP3 ? [254, 240, 138] : [216, 180, 254], blendT);
  } else {
    lerpRgb(tb.skyTop, target.skyTop, blendT);
    lerpRgb(tb.skyMid, target.skyMid, blendT);
    lerpRgb(tb.skyBot, target.skyBot, blendT);
    lerpRgb(tb.mist, target.mist, blendT);
    lerpRgb(tb.accent, target.accent, blendT);
  }

  const wType = tb.weather;
  const cw = Math.max(640, G.canvasW);
  const ch = Math.max(360, G.canvasH);
  for (let i = 0; i < G.weatherParticles.length; i++) {
    const wp = G.weatherParticles[i];
    if (wType === 'rain') {
      wp.x -= (155 * wp.speed) * dt;
      wp.y += (560 * wp.speed) * dt;
      if (wp.y > ch + 20 || wp.x < -30) {
        wp.x = Math.random() * (cw + 220);
        wp.y = -15 - Math.random() * 80;
      }
    } else if (wType === 'embers') {
      wp.x += Math.sin(G.globalTime * 2.6 + wp.phase) * 32 * dt - 12 * dt;
      wp.y -= (72 * wp.speed) * dt;
      if (wp.y < -20) {
        wp.x = Math.random() * cw;
        wp.y = ch + 10 + Math.random() * 40;
      }
    } else if (wType === 'mist') {
      if (i % 3 === 0) {
        // Vertical cave shaft water drips
        wp.y += (340 * wp.speed) * dt;
        if (wp.y > ch + 20) {
          wp.x = Math.random() * cw;
          wp.y = -20 - Math.random() * 100;
        }
      } else {
        // Slow rising humid mist wisps
        wp.x += Math.sin(G.globalTime * 0.9 + wp.phase) * 20 * dt;
        wp.y -= (24 * wp.speed) * dt;
        if (wp.y < -30) {
          wp.x = Math.random() * cw;
          wp.y = ch + 20;
        }
      }
    } else {
      // snow / ash
      wp.x += (Math.sin(G.globalTime * 1.4 + wp.phase) * 26 - 18) * dt;
      wp.y += (32 * wp.speed) * dt;
      if (wp.y > ch + 15 || wp.x < -20) {
        wp.x = Math.random() * (cw + 80);
        wp.y = -12 - Math.random() * 40;
      }
    }
  }

  // Procedural Rain-on-Puddle & Drip-on-River Ripples (zero per-frame array allocation)
  if (wType === 'rain' && Math.random() < dt * 8 && PUDDLES.length > 0) {
    const p = PUDDLES[Math.floor(Math.random() * PUDDLES.length)];
    const py = p.y !== undefined ? p.y : FLOOR_Y;
    if (p.x + p.w > G.cam.x && p.x < G.cam.x + G.canvasW && py >= G.cam.y - 40 && py <= G.cam.y + G.canvasH + 40) {
      spawnWeatherRipple(p.x + 8 + Math.random() * Math.max(8, p.w - 16), py + 1, 14 + Math.random() * 14, 'rgba(186, 230, 253, 0.52)');
    }
  } else if (wType === 'mist' && Math.random() < dt * 6 && ABYSSAL_RIVERS.length > 0) {
    const rv = ABYSSAL_RIVERS[Math.floor(Math.random() * ABYSSAL_RIVERS.length)];
    if (rv.w > 0 && rv.x + rv.w > G.cam.x && rv.x < G.cam.x + G.canvasW && rv.y > G.cam.y - 40 && rv.y < G.cam.y + G.canvasH + 40) {
      spawnWeatherRipple(rv.x + 12 + Math.random() * Math.max(12, rv.w - 24), rv.y + 3, 18 + Math.random() * 16, 'rgba(125, 211, 252, 0.56)');
    }
  }

  for (let i = G.weatherRipples.length - 1; i >= 0; i--) {
    const rp = G.weatherRipples[i];
    rp.life -= dt;
    rp.r = rp.maxR * (1 - Math.max(0, rp.life / rp.maxLife));
    if (rp.life <= 0) G.weatherRipples.splice(i, 1);
  }
}

function isSecretWallBroken(wallId) {
  if (!G.worldState || !Array.isArray(G.worldState.secretWalls)) return false;
  for (let i = 0; i < G.worldState.secretWalls.length; i++) {
    if (G.worldState.secretWalls[i].id === wallId) return !!G.worldState.secretWalls[i].broken;
  }
  return true;
}

function roomsOverlapVertically(a, b) {
  const ay0 = a.bounds.y, ay1 = a.bounds.y + a.bounds.h;
  const by0 = b.bounds.y, by1 = b.bounds.y + b.bounds.h;
  return Math.min(ay1, by1) - Math.max(ay0, by0) >= 80;
}

function roomsTouchHorizontally(a, b) {
  const ax0 = a.bounds.x, ax1 = a.bounds.x + a.bounds.w;
  const bx0 = b.bounds.x, bx1 = b.bounds.x + b.bounds.w;
  return Math.abs(ax1 - bx0) <= 12 || Math.abs(bx1 - ax0) <= 12;
}

function roomsOverlapHorizontally(a, b) {
  const ax0 = a.bounds.x, ax1 = a.bounds.x + a.bounds.w;
  const bx0 = b.bounds.x, bx1 = b.bounds.x + b.bounds.w;
  return Math.min(ax1, bx1) - Math.max(ax0, bx0) >= 60;
}

function roomsTouchVertically(a, b) {
  const ay0 = a.bounds.y, ay1 = a.bounds.y + a.bounds.h;
  const by0 = b.bounds.y, by1 = b.bounds.y + b.bounds.h;
  return Math.abs(ay1 - by0) <= 24 || Math.abs(by1 - ay0) <= 24;
}

function isVerticalLinkOpen(fromRm, toRm) {
  if (!fromRm || !toRm || fromRm.id === toRm.id) return false;
  if (!Array.isArray(fromRm.connections) || !fromRm.connections.includes(toRm.id)) return false;
  if (!roomsTouchVertically(fromRm, toRm) || !roomsOverlapHorizontally(fromRm, toRm)) return false;
  const pair = `${fromRm.id}>${toRm.id}`;
  if (pair === 'r01_sanctuary>r10_ink_woods' || pair === 'r10_ink_woods>r01_sanctuary') return isWorldSwitchOn('forestHatchOpen');
  if (pair === 'r05_foundry>r09_wind_spire' || pair === 'r09_wind_spire>r05_foundry') return isWorldSwitchOn('foundryValveOpen');
  if (pair === 'r13_wind_peak>r25_mirror_abyss' || pair === 'r25_mirror_abyss>r13_wind_peak') return isBoss4Unlocked();
  if (pair === 'r01_sanctuary>r19_belfry_outer' || pair === 'r19_belfry_outer>r01_sanctuary') return isWorldSwitchOn('belfryHatchOpen');
  if (pair === 'r02_corridor>r06_crypt' || pair === 'r06_crypt>r02_corridor') return isWorldSwitchOn('cryptHatchOpen') || !!(G.worldState && G.worldState.breakableFloors && G.worldState.breakableFloors.some(f => f.id === 'floor_corridor_crypt' && f.broken));
  return true;
}

function isHorizontalLinkOpen(fromRm, toRm) {
  if (!fromRm || !toRm || fromRm.id === toRm.id) return false;
  if (!Array.isArray(fromRm.connections) || !fromRm.connections.includes(toRm.id)) return false;
  if (!roomsTouchHorizontally(fromRm, toRm) || !roomsOverlapVertically(fromRm, toRm)) return false;

  const pair = `${fromRm.id}>${toRm.id}`;
  const ws = G.worldState;
  if (!ws) return true;
  if (pair === 'r04_bell_well>r09_wind_spire' || pair === 'r09_wind_spire>r04_bell_well') return isWorldSwitchOn('windWestOpen');
  if (pair === 'r09_wind_spire>r07_ascent' || pair === 'r07_ascent>r09_wind_spire') return isWorldSwitchOn('windAscentOpen');
  if (pair === 'r20_bell_galleries>r12_wind_bridge' || pair === 'r12_wind_bridge>r20_bell_galleries') return isWorldSwitchOn('galleryWindOpen');
  if (pair === 'r14_woods_cavern>r21_cistern_west' || pair === 'r21_cistern_west>r14_woods_cavern') return isWorldSwitchOn('cisternWestOpen');
  if (pair === 'r04_bell_well>r06_crypt') return isSecretWallBroken('wall_crypt_east');
  if (pair === 'r07_ascent>r11_frost_ridge') return isSecretWallBroken('wall_frost_entry');
  if (pair === 'r06_crypt>r10_ink_woods') return !!(ws.abilities && ws.abilities.shadeDash);
  if (pair === 'r04_bell_well>r05_foundry') return !!((ws.abilities && ws.abilities.doubleJump) || G.echoSession);
  if (pair === 'r03_chapel>r04_bell_well') return !!ws.bossDefeated;
  if (pair === 'r05_foundry>r07_ascent') return !!ws.boss2Defeated;
  if (pair === 'r13_wind_peak>r17_frost_summit' || pair === 'r17_frost_summit>r13_wind_peak') return isSkyBridgeOpen();
  return true;
}

export function isRoomOccluded(roomId) {
  if (!roomId || !G.roomOcclusion) return false;
  const a = G.roomOcclusion[roomId];
  return a !== undefined && a > 0.86;
}

export function updateRoomVisibility(dt, snap = false) {
  if (!ROOMS.length) return null;
  const fx = G.player ? (G.player.x + G.player.w * 0.5) : (G.cam.x + G.canvasW * 0.5);
  const fy = G.player ? (G.player.y + G.player.h * 0.5) : (G.cam.y + G.canvasH * 0.5);
  const curRoom = getRoomAt(fx, fy) || ROOMS[0];
  if (!curRoom) return null;
  G.currentRoomId = curRoom.id;
  if (!snap && !G.echoSession && !G.benchActive && curRoom.zoneName && curRoom.zoneName !== G.lastZoneName) {
    const prevZ = G.lastZoneName; G.lastZoneName = curRoom.zoneName;
    if (prevZ) {
      const th = ROOM_THEMES[curRoom.theme] || ROOM_THEMES.sanctuary;
      const acc = th && th.accent ? `rgb(${th.accent[0]}, ${th.accent[1]}, ${th.accent[2]})` : COLORS.goldBright;
      const subKey = `zone.sub.${curRoom.theme || 'sanctuary'}`;
      const subTxt = t(subKey);
      triggerZoneBanner(locZoneName(curRoom), subTxt === subKey ? '' : subTxt, acc, 2.85);
    }
  } else if (snap && curRoom.zoneName) { G.lastZoneName = curRoom.zoneName; }

  const vis = G.visibleRoomIds || (G.visibleRoomIds = new Set());
  vis.clear();
  vis.add(curRoom.id);

  // Add horizontally & vertically connected unlocked rooms near the player's band
  for (let i = 0; i < ROOMS.length; i++) {
    const other = ROOMS[i];
    if (isHorizontalLinkOpen(curRoom, other)) {
      const ob = other.bounds;
      if (curRoom.bounds.h <= 900 || (fy >= ob.y - 120 && fy <= ob.y + ob.h + 120)) {
        vis.add(other.id);
      }
    } else if (isVerticalLinkOpen(curRoom, other)) {
      const ob = other.bounds;
      const nearSeamY = Math.abs(fy - ob.y) < 460 || Math.abs(fy - (ob.y + ob.h)) < 460;
      if (nearSeamY && fx >= ob.x - 180 && fx <= ob.x + ob.w + 180) {
        vis.add(other.id);
      }
    }
  }

  const occ = G.roomOcclusion || (G.roomOcclusion = {});
  const step = snap ? 1 : Math.min(1, dt * 11.5);
  for (let i = 0; i < ROOMS.length; i++) {
    const id = ROOMS[i].id;
    const target = vis.has(id) ? 0 : 1;
    if (snap || occ[id] === undefined) {
      occ[id] = target;
    } else {
      occ[id] += (target - occ[id]) * step;
      if (Math.abs(occ[id] - target) < 0.008) occ[id] = target;
    }
  }
  return curRoom;
}

function computeCameraTargets(curRoom) {
  const activeBoss = getAwakeBoss();
  if (activeBoss) {
    const bRoom = (activeBoss.roomId && ROOMS.find(r => r.id === activeBoss.roomId)) || curRoom;
    const arenaMin = activeBoss.arenaMinX - 24;
    const arenaMax = activeBoss.arenaMaxX + 24;
    const arenaW = arenaMax - arenaMin;
    let clampedX;
    if (arenaW <= G.canvasW) {
      clampedX = arenaMin - (G.canvasW - arenaW) * 0.5;
    } else {
      const wantX = (G.player.x + activeBoss.x) * 0.5 - G.canvasW * 0.5 + 24;
      clampedX = Math.max(arenaMin, Math.min(arenaMax - G.canvasW, wantX));
    }
    const minY = bRoom ? bRoom.bounds.y : activeBoss.arenaTopY;
    const maxY = bRoom
      ? Math.max(minY, bRoom.bounds.y + bRoom.bounds.h - G.canvasH)
      : Math.max(minY, WORLD_H - G.canvasH);
    const focusY = (G.player.y * 0.65 + activeBoss.y * 0.35) - G.canvasH * 0.52;
    return {
      x: Math.max(WORLD_MIN_X, Math.min(Math.max(WORLD_MIN_X, WORLD_W - G.canvasW), clampedX)),
      y: Math.min(maxY, Math.max(minY, focusY))
    };
  }

  const rm = curRoom || (ROOMS[0] || { bounds: { x: 0, y: 0, w: WORLD_W, h: WORLD_H } });
  const b = rm.bounds;
  const px = G.player ? (G.player.x + G.player.w * 0.5) : (b.x + b.w * 0.5);
  const py = G.player ? (G.player.y + G.player.h * 0.5) : (b.y + b.h * 0.5);

  // Horizontal camera span: current room + open same-tier horizontal neighbors (up to 2 hops)
  let spanMinX = b.x;
  let spanMaxX = b.x + b.w;
  const visited = new Set([rm.id]);
  let frontier = [rm];
  for (let hop = 0; hop < 2; hop++) {
    const next = [];
    for (let f = 0; f < frontier.length; f++) {
      const cur = frontier[f];
      for (let i = 0; i < ROOMS.length; i++) {
        const nb = ROOMS[i];
        if (visited.has(nb.id)) continue;
        if (!isHorizontalLinkOpen(cur, nb)) continue;
        // For tall shaft rooms, only expand horizontally on the side matching player's elevation
        if (cur.bounds.h > 900 && (py < nb.bounds.y - 60 || py > nb.bounds.y + nb.bounds.h + 60)) continue;
        visited.add(nb.id);
        if (nb.bounds.x < spanMinX) spanMinX = nb.bounds.x;
        if (nb.bounds.x + nb.bounds.w > spanMaxX) spanMaxX = nb.bounds.x + nb.bounds.w;
        next.push(nb);
      }
    }
    frontier = next;
  }

  const wantX = G.player ? (G.player.x + G.player.facing * 88 - G.canvasW * 0.5) : (px - G.canvasW * 0.5);
  let clampedX;
  if (spanMaxX - spanMinX <= G.canvasW) {
    clampedX = spanMinX - (G.canvasW - (spanMaxX - spanMinX)) * 0.5;
  } else {
    clampedX = Math.max(spanMinX, Math.min(spanMaxX - G.canvasW, wantX));
  }
  clampedX = Math.max(WORLD_MIN_X, Math.min(Math.max(WORLD_MIN_X, WORLD_W - G.canvasW), clampedX));

  // Vertical camera span: strictly clamped at solid floors/ceilings, but smoothly glides across open vertical shafts!
  let minCamY = b.y;
  let maxCamY = Math.max(minCamY, b.y + b.h - G.canvasH);
  for (let i = 0; i < ROOMS.length; i++) {
    const nb = ROOMS[i];
    if (!isVerticalLinkOpen(rm, nb)) continue;
    const ob = nb.bounds;
    if (px < ob.x - 140 || px > ob.x + ob.w + 140) continue;
    // Open room directly above current room (e.g., r09 -> r12, r15 -> r10, r14 -> r10, r10 -> r01)
    if (Math.abs((ob.y + ob.h) - b.y) <= 24 && (py - b.y) < 310) {
      minCamY = Math.min(minCamY, b.y - Math.min(220, ob.h * 0.36));
    }
    // Open room directly below current room (e.g., r10 -> r14, r12 -> r09)
    if (Math.abs(ob.y - (b.y + b.h)) <= 24 && ((b.y + b.h) - py) < 310) {
      maxCamY = Math.max(maxCamY, b.y + b.h + Math.min(220, ob.h * 0.36) - G.canvasH);
    }
  }
  const vLook = G.cam.vLookY || 0;
  const focusY = (G.player ? G.player.y : py) + vLook - G.canvasH * 0.56;
  const clampedY = Math.min(maxCamY, Math.max(minCamY, focusY));

  return { x: clampedX, y: clampedY };
}

export function snapCameraToPlayer(shake = 0) {
  const curRoom = updateRoomVisibility(0, true);
  G.cam.vLookY = 0;
  G.cam.roomTransTimer = 0;
  const tgt = computeCameraTargets(curRoom);
  G.cam.x = tgt.x;
  G.cam.y = tgt.y;
  G.cam.shake = shake;
  G.cam.kickX = 0;
  G.cam.kickY = 0;
  G.cam.zoom = 1;
}

export function updateCamera(dt) {
  const prevRoomId = G.currentRoomId;
  const curRoom = updateRoomVisibility(dt, false);

  // Smooth vertical velocity lookahead for updraft ascents, spore bounces & deep cavern drops
  let targetVLook = 0;
  if (G.player && !G.player.grounded && Math.abs(G.player.vy) > 260) {
    const sign = G.player.vy > 0 ? 1 : -1;
    targetVLook = sign * Math.min(82, (Math.abs(G.player.vy) - 240) * 0.14);
  }
  G.cam.vLookY = (G.cam.vLookY || 0) + (targetVLook - (G.cam.vLookY || 0)) * Math.min(1, dt * 4.5);

  const tgt = computeCameraTargets(curRoom);
  const roomChanged = prevRoomId && curRoom && prevRoomId !== curRoom.id;
  if (roomChanged) {
    G.cam.roomTransTimer = 0.36;
  } else if (G.cam.roomTransTimer > 0) {
    G.cam.roomTransTimer = Math.max(0, G.cam.roomTransTimer - dt);
  }
  const fastBlend = G.cam.roomTransTimer > 0;
  let camTgtX = tgt.x, camTgtY = tgt.y, camZoomTarget = 1.0;
  if (G.bossIntro && G.bossIntro.timer > 0 && G.bossIntro.boss) {
    const ib = G.bossIntro.boss;
    const fx = (ib.x + ib.w * 0.5) - G.canvasW * 0.5, fy = (ib.y + ib.h * 0.5) - G.canvasH * 0.54;
    if (curRoom && curRoom.bounds) {
      const b = curRoom.bounds;
      camTgtX = b.w <= G.canvasW ? (b.x - (G.canvasW - b.w) * 0.5) : Math.max(b.x, Math.min(b.x + b.w - G.canvasW, fx));
      camTgtY = b.h <= G.canvasH ? (b.y - (G.canvasH - b.h) * 0.5) : Math.max(b.y, Math.min(b.y + b.h - G.canvasH, fy));
    } else { camTgtX = fx; camTgtY = fy; }
    camZoomTarget = 1.075;
  }
  G.cam.x += (camTgtX - G.cam.x) * Math.min(1, dt * (fastBlend ? 8.8 : 6.8));
  G.cam.y += (camTgtY - G.cam.y) * Math.min(1, dt * (fastBlend ? 9.6 : 6.8));

  if (G.cam.shake > 0) G.cam.shake = Math.max(0, G.cam.shake - dt * 36);
  const kickDecay = Math.exp(-18 * dt);
  G.cam.kickX *= kickDecay;
  G.cam.kickY *= kickDecay;
  if (Math.abs(G.cam.kickX) < 0.08) G.cam.kickX = 0;
  if (Math.abs(G.cam.kickY) < 0.08) G.cam.kickY = 0;
  G.cam.zoom += (camZoomTarget - G.cam.zoom) * Math.min(1, dt * 7.5);
  if (camZoomTarget === 1 && Math.abs(G.cam.zoom - 1) < 0.0006) G.cam.zoom = 1;
}

export function updateAmbientOnly(dt) {
  updateThemeAndWeather(dt);
  for (const mote of G.ambientMotes) {
    mote.x += mote.vx * dt;
    mote.y += (mote.vy + Math.sin(G.globalTime * 1.5 + mote.phase) * 10) * dt;
    if (mote.x < -10) mote.x = G.canvasW + 10;
    if (mote.y < -10) mote.y = G.canvasH + 10;
    if (mote.y > G.canvasH + 10) mote.y = -10;
  }
}
