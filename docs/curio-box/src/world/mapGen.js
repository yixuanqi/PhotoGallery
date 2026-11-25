(() => {
  const CB = window.CB;

  const GRID_SIZE = 6;
  const CELL_W = 540;
  const CELL_H = 420;
  const WALL_T = 32;
  const HALF_T = WALL_T / 2;
  const DOOR_W = 138;

  const FUSION_BIOMES = ['lotus_pond', 'sun_glasshouse', 'ancient_vine'];

  function createRng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const DIRS = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  const keyOf = (x, y) => `${x},${y}`;
  const edgeKey = (x1, y1, x2, y2) =>
    x1 < x2 || (x1 === x2 && y1 < y2)
      ? `${x1},${y1}|${x2},${y2}`
      : `${x2},${y2}|${x1},${y1}`;

  function generateMap(stageOrSpec = 1, inputSeed = undefined) {
    const t0 = performance.now();
    const stage = CB.stages.getStage(stageOrSpec);
    const baseSeed = inputSeed ?? Math.floor(Math.random() * 899999 + 100000);

    for (let attempt = 0; attempt < 56; attempt++) {
      const seed = baseSeed + attempt * 997;
      const rng = createRng(seed);
      const candidate = tryGenerateOnce(rng, seed, stage, false);
      if (candidate) {
        candidate.stats.genMs = Number((performance.now() - t0).toFixed(2));
        candidate.stats.attempts = attempt + 1;
        return candidate;
      }
    }

    const fallbackRng = createRng(baseSeed + 12345);
    const fallback = tryGenerateOnce(fallbackRng, baseSeed, stage, true);
    fallback.stats.genMs = Number((performance.now() - t0).toFixed(2));
    fallback.stats.attempts = 57;
    return fallback;
  }

  function tryGenerateOnce(rng, seed, stage, relaxed = false) {
    const spec = stage.mapSpec;
    const targetCells = spec.minCells + Math.floor(rng() * (spec.maxCells - spec.minCells + 1));

    // ================= Step A: 6×6 云海岛群骨架生长 =================
    const cells = new Map();
    const startX = 2 + Math.floor(rng() * 2);
    const startY = 2 + Math.floor(rng() * 2);
    const queue = [{ gx: startX, gy: startY }];
    cells.set(keyOf(startX, startY), { gx: startX, gy: startY, roomId: -1 });

    let guard = 0;
    while (cells.size < targetCells && guard < 260) {
      guard++;
      const list = Array.from(cells.values());
      const cur = queue.length > 0 ? queue.shift() : list[Math.floor(rng() * list.length)];

      const dirs = DIRS.slice().sort(() => rng() - 0.5);
      for (const d of dirs) {
        if (cells.size >= targetCells) break;
        const nx = cur.gx + d.dx;
        const ny = cur.gy + d.dy;
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        const nk = keyOf(nx, ny);
        if (cells.has(nk)) continue;

        let filledNeighbors = 0;
        for (const nd of DIRS) {
          if (cells.has(keyOf(nx + nd.dx, ny + nd.dy))) filledNeighbors++;
        }
        if (filledNeighbors > 2 && rng() > 0.22) continue;

        const cell = { gx: nx, gy: ny, roomId: -1 };
        cells.set(nk, cell);
        queue.push(cell);
      }
    }

    if (cells.size < Math.max(7, spec.minCells - 1)) return null;

    // ================= Step B: 关卡专属房型合并（L型花廊 + 长廊 + 终章2×2大中庭） =================
    const rooms = [];
    const assignRoom = (cellList, kind) => {
      const id = rooms.length;
      let minGx = Infinity, minGy = Infinity, maxGx = -Infinity, maxGy = -Infinity;
      const cellKeys = new Set();
      for (const c of cellList) {
        c.roomId = id;
        cellKeys.add(keyOf(c.gx, c.gy));
        if (c.gx < minGx) minGx = c.gx;
        if (c.gy < minGy) minGy = c.gy;
        if (c.gx > maxGx) maxGx = c.gx;
        if (c.gy > maxGy) maxGy = c.gy;
      }
      const gw = maxGx - minGx + 1;
      const gh = maxGy - minGy + 1;
      const room = {
        id,
        gx: minGx,
        gy: minGy,
        gw,
        gh,
        kind,        // 'atrium' | 'lshape' | 'corridor' | 'single'
        role: 'normal',
        biome: stage.biome === 'fusion' ? 'sun_glasshouse' : stage.biome,
        subTheme: stage.theme, // 供房间命题与装饰严格分家
        x: minGx * CELL_W,
        y: minGy * CELL_H,
        w: gw * CELL_W,
        h: gh * CELL_H,
        cells: cellList,
        cellKeys,
        neighbors: new Set(),
        distFromSpawn: 0,
        discovered: false,
        adjacentSeen: false,
        fogAlpha: 1,
      };
      rooms.push(room);
      return room;
    };

    const countFreeCells = () => {
      let cnt = 0;
      for (const c of cells.values()) if (c.roomId < 0) cnt++;
      return cnt;
    };

    // B1. 终极第 4 关专属 2×2 水镜大中庭
    let hasAtrium = false;
    if (spec.wantAtrium) {
      const quadCandidates = [];
      for (let gx = 0; gx < GRID_SIZE - 1; gx++) {
        for (let gy = 0; gy < GRID_SIZE - 1; gy++) {
          const c00 = cells.get(keyOf(gx, gy));
          const c10 = cells.get(keyOf(gx + 1, gy));
          const c01 = cells.get(keyOf(gx, gy + 1));
          const c11 = cells.get(keyOf(gx + 1, gy + 1));
          if (c00 && c10 && c01 && c11 && c00.roomId < 0 && c10.roomId < 0 && c01.roomId < 0 && c11.roomId < 0) {
            quadCandidates.push([c00, c10, c01, c11]);
          }
        }
      }
      if (quadCandidates.length > 0 && countFreeCells() - 4 >= 5) {
        const chosen = quadCandidates[Math.floor(rng() * quadCandidates.length)];
        const r = assignRoom(chosen, 'atrium');
        r.role = 'atrium';
        hasAtrium = true;
      }
    }

    // B2. L 型 3 格空中花廊
    const lCandidates = [];
    for (const pivot of cells.values()) {
      if (pivot.roomId >= 0) continue;
      const horiz = [cells.get(keyOf(pivot.gx + 1, pivot.gy)), cells.get(keyOf(pivot.gx - 1, pivot.gy))].filter(
        (c) => c && c.roomId < 0
      );
      const vert = [cells.get(keyOf(pivot.gx, pivot.gy + 1)), cells.get(keyOf(pivot.gx, pivot.gy - 1))].filter(
        (c) => c && c.roomId < 0
      );
      for (const hCell of horiz) {
        for (const vCell of vert) {
          lCandidates.push([pivot, hCell, vCell]);
        }
      }
    }
    lCandidates.sort(() => rng() - 0.5);

    let lShapeCount = 0;
    for (const tri of lCandidates) {
      if (lShapeCount >= spec.maxLShapes) break;
      if (tri[0].roomId >= 0 || tri[1].roomId >= 0 || tri[2].roomId >= 0) continue;
      if (countFreeCells() - 3 < 4) break;
      const r = assignRoom(tri, 'lshape');
      r.role = 'gallery';
      lShapeCount++;
    }

    // B3. 2×1 或 1×2 拱廊
    const pairCandidates = [];
    for (const c of cells.values()) {
      if (c.roomId >= 0) continue;
      const right = cells.get(keyOf(c.gx + 1, c.gy));
      if (right && right.roomId < 0) pairCandidates.push([c, right]);
      const down = cells.get(keyOf(c.gx, c.gy + 1));
      if (down && down.roomId < 0) pairCandidates.push([c, down]);
    }
    pairCandidates.sort(() => rng() - 0.5);

    let corridorCount = 0;
    for (const pair of pairCandidates) {
      if (corridorCount >= spec.maxCorridors) break;
      if (pair[0].roomId >= 0 || pair[1].roomId >= 0) continue;
      if (countFreeCells() - 2 < 4) break;
      const r = assignRoom(pair, 'corridor');
      r.role = 'corridor';
      corridorCount++;
    }

    // B4. 其余单格花室
    for (const c of cells.values()) {
      if (c.roomId < 0) assignRoom([c], 'single');
    }

    const singles = rooms.filter((r) => r.kind === 'single');
    if (!relaxed) {
      if (rooms.length < spec.minRooms || singles.length < 3) return null;
      if (spec.wantAtrium && !hasAtrium) return null;
    }

    // ================= Step C: 生成树 + 战术环路 =================
    const crossLinks = [];
    const seenPairs = new Set();
    for (const c of cells.values()) {
      for (const d of [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }]) {
        const nb = cells.get(keyOf(c.gx + d.dx, c.gy + d.dy));
        if (!nb || nb.roomId === c.roomId) continue;
        const ek = edgeKey(c.gx, c.gy, nb.gx, nb.gy);
        if (seenPairs.has(ek)) continue;
        seenPairs.add(ek);
        crossLinks.push({ c1: c, c2: nb, r1: c.roomId, r2: nb.roomId, eKey: ek });
      }
    }

    const parent = rooms.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const union = (a, b) => {
      const ra = find(a), rb = find(b);
      if (ra === rb) return false;
      parent[ra] = rb;
      return true;
    };

    const shuffledLinks = crossLinks.slice().sort(() => rng() - 0.5);
    const doorEdges = new Set();
    const cycleEdges = new Set();
    const roomPairConnected = new Set();
    const pairKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

    const addDoor = (link, isCycle = false) => {
      doorEdges.add(link.eKey);
      if (isCycle) cycleEdges.add(link.eKey);
      roomPairConnected.add(pairKey(link.r1, link.r2));
      rooms[link.r1].neighbors.add(link.r2);
      rooms[link.r2].neighbors.add(link.r1);
    };

    for (const link of shuffledLinks) {
      if (union(link.r1, link.r2)) addDoor(link, false);
    }

    const root0 = find(0);
    for (let i = 1; i < rooms.length; i++) {
      if (find(i) !== root0) return null;
    }

    let cyclesAdded = 0;
    for (const link of shuffledLinks) {
      if (cyclesAdded >= spec.desiredCycles) break;
      const pk = pairKey(link.r1, link.r2);
      if (roomPairConnected.has(pk)) continue;
      addDoor(link, true);
      cyclesAdded++;
    }

    // ================= Step D: BFS 职能分配 + 严格单关物理分家 =================
    const bfsFrom = (startId) => {
      const dist = new Array(rooms.length).fill(-1);
      const q = [startId];
      dist[startId] = 0;
      while (q.length) {
        const u = q.shift();
        for (const v of rooms[u].neighbors) {
          if (dist[v] === -1) {
            dist[v] = dist[u] + 1;
            q.push(v);
          }
        }
      }
      return dist;
    };

    const sortedForSpawn = singles
      .slice()
      .sort((a, b) => a.neighbors.size - b.neighbors.size || (rng() - 0.5));
    const spawnRoom = sortedForSpawn[0];
    const distFromSpawn = bfsFrom(spawnRoom.id);
    for (let i = 0; i < rooms.length; i++) rooms[i].distFromSpawn = distFromSpawn[i];

    const otherSingles = singles.filter((r) => r.id !== spawnRoom.id);
    otherSingles.sort(
      (a, b) =>
        distFromSpawn[b.id] - distFromSpawn[a.id] ||
        a.neighbors.size - b.neighbors.size ||
        (rng() - 0.5)
    );
    const vaultRoom = otherSingles[0];
    const distFromVault = bfsFrom(vaultRoom.id);

    const extractPool = otherSingles.filter((r) => r.id !== vaultRoom.id);
    extractPool.sort((a, b) => {
      const scoreA = distFromSpawn[a.id] * 1.15 + distFromVault[a.id];
      const scoreB = distFromSpawn[b.id] * 1.15 + distFromVault[b.id];
      return scoreB - scoreA;
    });
    const extractRoom = extractPool[0];

    const dSpawnVault = distFromSpawn[vaultRoom.id];
    const dSpawnExtract = distFromSpawn[extractRoom.id];
    const dVaultExtract = distFromVault[extractRoom.id];

    if (!relaxed) {
      if (
        dSpawnVault < spec.minVaultDist ||
        dSpawnExtract < spec.minExtractDist ||
        dVaultExtract < spec.minVaultExtract ||
        cyclesAdded < 1
      ) {
        return null;
      }
    }

    spawnRoom.role = 'spawn';
    vaultRoom.role = 'vault';
    extractRoom.role = 'extract';

    const midNormal = extractPool.find(
      (r) => r.id !== extractRoom.id && distFromSpawn[r.id] >= 2
    );
    if (midNormal) midNormal.role = 'treasure';

    // 为每座房间确定生态区与物理子主题：
    // 第 1~3 关严格统一专属生态与物理主题；第 4 关按支路分三区，中庭与金库为全物理融合！
    const biomeToTheme = {
      lotus_pond: 'friction',
      sun_glasshouse: 'gravity',
      ancient_vine: 'stealth',
    };

    const themeToBiome = {
      friction: 'lotus_pond',
      gravity: 'sun_glasshouse',
      stealth: 'ancient_vine',
      relativity: 'sun_glasshouse',
      thermal: 'lotus_pond',
      optics: 'sun_glasshouse',
      electro: 'lotus_pond',
    };
    const sectorAnomalies = Array.isArray(stage.anomalies) && stage.anomalies.length > 0
      ? stage.anomalies
      : (stage.theme === 'fusion' ? ['friction', 'gravity', 'stealth'] : [stage.theme]);

    if (sectorAnomalies.length === 1) {
      const onlyTheme = sectorAnomalies[0];
      const onlyBiome = themeToBiome[onlyTheme] || stage.biome;
      for (const r of rooms) {
        r.biome = onlyBiome;
        r.subTheme = onlyTheme;
      }
    } else {
      const order = sectorAnomalies.slice().sort(() => rng() - 0.5);
      let idx = 0;
      for (const r of rooms) {
        if (r.role === 'atrium' || r.role === 'vault' || r.role === 'spawn' || r.role === 'extract') {
          const lead = order[0];
          r.biome = themeToBiome[lead] || 'sun_glasshouse';
          r.subTheme = 'fusion';
          r.sectorAnomalies = sectorAnomalies;
        } else {
          const th = order[idx % order.length];
          idx++;
          r.subTheme = th;
          r.biome = themeToBiome[th] || 'sun_glasshouse';
        }
      }
    }

    // ================= Step E: 边去重烘焙墙体、云海崖边/易碎花栏、角柱、门洞与藤蔓花闸 =================
    const walls = [];
    const cliffEdges = [];
    const outerCandidates = [];
    const posts = [];
    const doorways = [];
    const vineGates = [];
    const postMap = new Set();

    const addPost = (vx, vy) => {
      const k = keyOf(vx, vy);
      if (postMap.has(k)) return;
      postMap.add(k);
      posts.push({
        x: vx * CELL_W - HALF_T,
        y: vy * CELL_H - HALF_T,
        w: WALL_T,
        h: WALL_T,
        height: 36,
      });
    };

    const registerDoorway = (cx, cy, orient, r1, r2, eKey, cellA, cellB) => {
      const isCycle = cycleEdges.has(eKey);
      const isBridge = rooms[r1].biome !== rooms[r2].biome;
      doorways.push({
        cx,
        cy,
        w: orient === 'h' ? DOOR_W : WALL_T + 14,
        h: orient === 'h' ? WALL_T + 14 : DOOR_W,
        orient,
        r1,
        r2,
        cellA,
        cellB,
        isCycle,
        isBridge,
        gateId: null,
      });
    };

    for (let gy = 0; gy <= GRID_SIZE; gy++) {
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const up = cells.get(keyOf(gx, gy - 1));
        const down = cells.get(keyOf(gx, gy));
        if (!up && !down) continue;
        if (up && down && up.roomId === down.roomId) continue;

        addPost(gx, gy);
        addPost(gx + 1, gy);

        const isOuter = (up && !down) || (!up && down);
        const ek = up && down ? edgeKey(up.gx, up.gy, down.gx, down.gy) : '';
        const isDoor = !!(up && down && doorEdges.has(ek));
        const wx0 = gx * CELL_W + HALF_T;
        const spanW = CELL_W - WALL_T;
        const wy = gy * CELL_H - HALF_T;

        if (isOuter) {
          const hostCell = up || down;
          outerCandidates.push({
            x: wx0,
            y: wy,
            w: spanW,
            h: WALL_T,
            orient: 'h',
            outwardX: 0,
            outwardY: up ? 1 : -1,
            roomId: hostCell.roomId,
          });
        } else if (!isDoor) {
          walls.push({ x: wx0, y: wy, w: spanW, h: WALL_T, height: 32, orient: 'h' });
        } else {
          const stubW = (spanW - DOOR_W) / 2;
          walls.push({ x: wx0, y: wy, w: stubW, h: WALL_T, height: 32, orient: 'h' });
          walls.push({ x: wx0 + stubW + DOOR_W, y: wy, w: stubW, h: WALL_T, height: 32, orient: 'h' });
          registerDoorway(gx * CELL_W + CELL_W / 2, gy * CELL_H, 'h', up.roomId, down.roomId, ek, up, down);
        }
      }
    }

    for (let gx = 0; gx <= GRID_SIZE; gx++) {
      for (let gy = 0; gy < GRID_SIZE; gy++) {
        const left = cells.get(keyOf(gx - 1, gy));
        const right = cells.get(keyOf(gx, gy));
        if (!left && !right) continue;
        if (left && right && left.roomId === right.roomId) continue;

        addPost(gx, gy);
        addPost(gx, gy + 1);

        const isOuter = (left && !right) || (!left && right);
        const ek = left && right ? edgeKey(left.gx, left.gy, right.gx, right.gy) : '';
        const isDoor = !!(left && right && doorEdges.has(ek));
        const wx = gx * CELL_W - HALF_T;
        const wy0 = gy * CELL_H + HALF_T;
        const spanH = CELL_H - WALL_T;

        if (isOuter) {
          const hostCell = left || right;
          outerCandidates.push({
            x: wx,
            y: wy0,
            w: WALL_T,
            h: spanH,
            orient: 'v',
            outwardX: left ? 1 : -1,
            outwardY: 0,
            roomId: hostCell.roomId,
          });
        } else if (!isDoor) {
          walls.push({ x: wx, y: wy0, w: WALL_T, h: spanH, height: 32, orient: 'v' });
        } else {
          const stubH = (spanH - DOOR_W) / 2;
          walls.push({ x: wx, y: wy0, w: WALL_T, h: stubH, height: 32, orient: 'v' });
          walls.push({ x: wx, y: wy0 + stubH + DOOR_W, w: WALL_T, h: stubH, height: 32, orient: 'v' });
          registerDoorway(gx * CELL_W, gy * CELL_H + CELL_H / 2, 'v', left.roomId, right.roomId, ek, left, right);
        }
      }
    }

    // 按房间分组改造朝向云海虚空的外围实心墙：敞开式云海崖边 + 易碎木质花栏 + 保留反射石墙
    const outerByRoom = new Map();
    for (const cand of outerCandidates) {
      if (!outerByRoom.has(cand.roomId)) outerByRoom.set(cand.roomId, []);
      outerByRoom.get(cand.roomId).push(cand);
    }

    let openCliffCount = 0;
    let railingCount = 0;
    for (const [rid, list] of outerByRoom.entries()) {
      const room = rooms[rid];
      const shuffled = list.slice().sort(() => rng() - 0.5);
      for (let i = 0; i < shuffled.length; i++) {
        const cand = shuffled[i];
        let edgeType = 'solid';

        if (shuffled.length === 1) {
          edgeType = room && room.role === 'spawn' ? 'railing' : (rng() < 0.5 ? 'open' : 'railing');
        } else if (shuffled.length === 2) {
          if (i === 0) edgeType = rng() < 0.56 ? 'open' : 'railing';
          else edgeType = rng() < 0.55 ? 'railing' : 'solid';
        } else {
          if (i === 0) edgeType = 'open';
          else if (i === 1) edgeType = 'railing';
          else if (i === 2) edgeType = 'solid';
          else {
            const rv = rng();
            edgeType = rv < 0.38 ? 'open' : (rv < 0.72 ? 'railing' : 'solid');
          }
        }

        if (edgeType === 'solid') {
          walls.push({
            x: cand.x,
            y: cand.y,
            w: cand.w,
            h: cand.h,
            height: 32,
            orient: cand.orient,
          });
        } else {
          if (edgeType === 'open') openCliffCount++;
          else railingCount++;
          cliffEdges.push({
            id: `cliff_${cliffEdges.length}`,
            x: cand.x,
            y: cand.y,
            w: cand.w,
            h: cand.h,
            orient: cand.orient,
            outwardX: cand.outwardX,
            outwardY: cand.outwardY,
            roomId: cand.roomId,
            kind: edgeType, // 'open' | 'railing'
            broken: false,
            hp: 24,
            maxHp: 24,
            height: 22,
            hitFlash: 0,
            wobble: 0,
            seed: Math.floor(rng() * 9999),
          });
        }
      }
    }

    // 仅在古藤密廊（第3关）与终极花穹（第4关）装配向日葵藤蔓花闸
    const props = [];
    if (spec.maxVineGates > 0) {
      const cycleDoors = doorways.filter((d) => d.isCycle);
      cycleDoors.sort((a, b) => {
        const da = Math.min(rooms[a.r1].distFromSpawn, rooms[a.r2].distFromSpawn);
        const db = Math.min(rooms[b.r1].distFromSpawn, rooms[b.r2].distFromSpawn);
        return da - db;
      });

      const maxGates = Math.min(spec.maxVineGates, cycleDoors.length);
      for (let i = 0; i < maxGates; i++) {
        const door = cycleDoors[i];
        const gateId = `gate_${i}`;
        door.gateId = gateId;

        const useR1 = rooms[door.r1].distFromSpawn <= rooms[door.r2].distFromSpawn;
        const switchRoom = rooms[useR1 ? door.r1 : door.r2];
        const hostCell = useR1 ? door.cellA : door.cellB;
        const cellCx = hostCell.gx * CELL_W + CELL_W / 2;
        const cellCy = hostCell.gy * CELL_H + CELL_H / 2;

        let sx = door.cx;
        let sy = door.cy;
        const sideSign = rng() < 0.5 ? 1 : -1;
        if (door.orient === 'h') {
          const inwardY = cellCy < door.cy ? -1 : 1;
          sx = door.cx + sideSign * 136;
          sy = door.cy + inwardY * 108;
        } else {
          const inwardX = cellCx < door.cx ? -1 : 1;
          sx = door.cx + inwardX * 126;
          sy = door.cy + sideSign * 116;
        }
        const minSx = hostCell.gx * CELL_W + 64;
        const maxSx = (hostCell.gx + 1) * CELL_W - 64;
        const minSy = hostCell.gy * CELL_H + 64;
        const maxSy = (hostCell.gy + 1) * CELL_H - 64;
        sx = Math.max(minSx, Math.min(maxSx, sx));
        sy = Math.max(minSy, Math.min(maxSy, sy));

        vineGates.push({
          id: gateId,
          cx: door.cx,
          cy: door.cy,
          orient: door.orient,
          x: door.orient === 'h' ? door.cx - DOOR_W / 2 : door.cx - WALL_T / 2,
          y: door.orient === 'h' ? door.cy - WALL_T / 2 : door.cy - DOOR_W / 2,
          w: door.orient === 'h' ? DOOR_W : WALL_T,
          h: door.orient === 'h' ? WALL_T : DOOR_W,
          height: 30,
          r1: door.r1,
          r2: door.r2,
          open: false,
          openAnim: 0,
          switchX: sx,
          switchY: sy,
          switchRoomId: switchRoom.id,
        });

        props.push({
          type: 'sunflower_switch',
          shape: 'circle',
          x: sx,
          y: sy,
          r: 18,
          height: 24,
          gateId,
          activated: false,
          bloomAnim: 0,
          hitFlash: 0,
          wobble: 0,
          bounce: 0.7,
          destructible: false,
          roomId: switchRoom.id,
        });
      }
    }

    // ================= Step F: 按房间专属命题生成道具 + 低摩擦滑道 + 三层环境装饰 =================
    const groundDecors = [];
    const edgeDecors = [];
    const dewSlides = [];

    // 为同关内常规单格轮换不重复的命题编号，让每间房各具辨识度！
    let roomPropIndex = Math.floor(rng() * 4);

    for (const room of rooms) {
      room.archetypeIdx = roomPropIndex % 4;
      if (room.kind === 'single' && (room.role === 'normal' || room.role === 'treasure')) {
        roomPropIndex++;
      }

      if (CB.roomTemplates.buildRoomDecors) {
        const { ground, edge } = CB.roomTemplates.buildRoomDecors(room, doorways, rng, { CELL_W, CELL_H }, stage);
        for (const g of ground) {
          g.roomId = room.id;
          if (g.kind === 'dew_slide') dewSlides.push(g);
          else groundDecors.push(g);
        }
        for (const e of edge) {
          let nearOpenCliff = false;
          for (const ce of cliffEdges) {
            if (ce.roomId !== room.id || ce.kind !== 'open') continue;
            const nx = Math.max(ce.x, Math.min(e.x, ce.x + ce.w));
            const ny = Math.max(ce.y, Math.min(e.y, ce.y + ce.h));
            if (Math.hypot(e.x - nx, e.y - ny) < 30) {
              nearOpenCliff = true;
              break;
            }
          }
          if (nearOpenCliff) continue;
          e.roomId = room.id;
          edgeDecors.push(e);
        }
      }

      const candidates = CB.roomTemplates.buildRoomProps(room, rng, { CELL_W, CELL_H }, stage);
      for (const prop of candidates) {
        if (prop.keepExactPos || placePropSafely(prop, room, doorways, props)) {
          prop.roomId = room.id;
          props.push(prop);
        }
      }
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of cells.values()) {
      const x0 = c.gx * CELL_W;
      const y0 = c.gy * CELL_H;
      if (x0 < minX) minX = x0;
      if (y0 < minY) minY = y0;
      if (x0 + CELL_W > maxX) maxX = x0 + CELL_W;
      if (y0 + CELL_H > maxY) maxY = y0 + CELL_H;
    }

    spawnRoom.discovered = true;
    spawnRoom.fogAlpha = 0;
    for (const nid of spawnRoom.neighbors) {
      rooms[nid].adjacentSeen = true;
    }

    return {
      stageId: stage.id,
      stage,
      seed,
      cellW: CELL_W,
      cellH: CELL_H,
      wallT: WALL_T,
      rooms,
      cells,
      walls,
      cliffEdges,
      posts,
      doorways,
      vineGates,
      props,
      dewSlides,
      groundDecors,
      edgeDecors,
      spawnRoomId: spawnRoom.id,
      vaultRoomId: vaultRoom.id,
      extractRoomId: extractRoom.id,
      spawnPoint: { x: spawnRoom.x + spawnRoom.w / 2, y: spawnRoom.y + spawnRoom.h / 2 },
      bounds: {
        minX: minX - WALL_T,
        minY: minY - WALL_T,
        maxX: maxX + WALL_T,
        maxY: maxY + WALL_T,
        w: maxX - minX + WALL_T * 2,
        h: maxY - minY + WALL_T * 2,
        cx: (minX + maxX) / 2,
        cy: (minY + maxY) / 2,
      },
      stats: {
        roomCount: rooms.length,
        cellCount: cells.size,
        cycles: cyclesAdded,
        hasAtrium,
        lShapes: lShapeCount,
        corridors: corridorCount,
        vineGates: vineGates.length,
        openCliffs: openCliffCount,
        railings: railingCount,
        dSpawnVault,
        dSpawnExtract,
        dVaultExtract,
        genMs: 0,
        attempts: 1,
      },
    };
  }

  function placePropSafely(prop, room, doorways, existingProps) {
    const getCenter = () => ({
      px: prop.shape === 'circle' ? prop.x : prop.x + prop.w / 2,
      py: prop.shape === 'circle' ? prop.y : prop.y + prop.h / 2,
      pr: prop.shape === 'circle' ? prop.r : Math.max(prop.w, prop.h) * 0.52,
    });

    const isInsideRoomCell = (px, py, pad) => {
      const gx = Math.floor(px / CELL_W);
      const gy = Math.floor(py / CELL_H);
      if (!room.cellKeys.has(keyOf(gx, gy))) return false;
      const cx0 = gx * CELL_W + pad;
      const cy0 = gy * CELL_H + pad;
      const cx1 = (gx + 1) * CELL_W - pad;
      const cy1 = (gy + 1) * CELL_H - pad;
      if (px < cx0 && !room.cellKeys.has(keyOf(gx - 1, gy))) return false;
      if (px > cx1 && !room.cellKeys.has(keyOf(gx + 1, gy))) return false;
      if (py < cy0 && !room.cellKeys.has(keyOf(gx, gy - 1))) return false;
      if (py > cy1 && !room.cellKeys.has(keyOf(gx, gy + 1))) return false;
      return true;
    };

    const hasConflict = () => {
      const { px, py, pr } = getCenter();
      if (!isInsideRoomCell(px, py, Math.min(46, pr + 20))) return 'wall';
      for (const d of doorways) {
        if (Math.hypot(px - d.cx, py - d.cy) < pr + 76) return d;
      }
      for (const other of existingProps) {
        const ox = other.shape === 'circle' ? other.x : other.x + other.w / 2;
        const oy = other.shape === 'circle' ? other.y : other.y + other.h / 2;
        const or = other.shape === 'circle' ? other.r : Math.max(other.w, other.h) * 0.52;
        if (Math.hypot(px - ox, py - oy) < pr + or + 14) return other;
      }
      return null;
    };

    for (let step = 0; step < 3; step++) {
      const conf = hasConflict();
      if (!conf) return true;
      if (conf === 'wall') return false;
      const { px, py } = getCenter();
      const ox = conf.cx !== undefined ? conf.cx : (conf.shape === 'circle' ? conf.x : conf.x + conf.w / 2);
      const oy = conf.cy !== undefined ? conf.cy : (conf.shape === 'circle' ? conf.y : conf.y + conf.h / 2);
      const dx = px - ox;
      const dy = py - oy;
      const len = Math.hypot(dx, dy) || 1;
      prop.x += (dx / len) * 42;
      prop.y += (dy / len) * 42;
    }
    return !hasConflict();
  }

  function findRoomAt(map, x, y) {
    if (!map) return null;
    const gx = Math.floor(x / map.cellW);
    const gy = Math.floor(y / map.cellH);
    const cell = map.cells.get(keyOf(gx, gy));
    if (!cell) return null;
    return map.rooms[cell.roomId] || null;
  }

  CB.mapGen = { generateMap, findRoomAt };
})();
