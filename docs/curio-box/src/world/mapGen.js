(() => {
  const CB = window.CB;

  // 网格物理规格（3/4 俯视黄金宽高比）
  const GRID_SIZE = 6;
  const CELL_W = 540;
  const CELL_H = 420;
  const WALL_T = 32;
  const HALF_T = WALL_T / 2;
  const DOOR_W = 138;

  // 可复现 Mulberry32 伪随机数生成器（方便按种子回放同一张图）
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

  function generateMap(inputSeed) {
    const t0 = performance.now();
    const baseSeed = inputSeed ?? Math.floor(Math.random() * 899999 + 100000);

    // 约束校验循环（单次尝试 < 0.3ms，100% 产出高质量合法拓扑）
    for (let attempt = 0; attempt < 40; attempt++) {
      const seed = baseSeed + attempt * 997;
      const rng = createRng(seed);
      const candidate = tryGenerateOnce(rng, seed);
      if (candidate) {
        candidate.stats.genMs = Number((performance.now() - t0).toFixed(2));
        candidate.stats.attempts = attempt + 1;
        return candidate;
      }
    }

    // 极小概率兜底
    const fallbackRng = createRng(baseSeed + 12345);
    const fallback = tryGenerateOnce(fallbackRng, baseSeed, true);
    fallback.stats.genMs = Number((performance.now() - t0).toFixed(2));
    fallback.stats.attempts = 41;
    return fallback;
  }

  function tryGenerateOnce(rng, seed, relaxed = false) {
    // ================= Step A: 6×6 画布上的不规则骨架生长 =================
    const targetCells = 11 + Math.floor(rng() * 3); // 11 ~ 13 个基础格
    const cells = new Map(); // "x,y" -> { gx, gy, roomId: -1 }
    const startX = 2 + Math.floor(rng() * 2);
    const startY = 2 + Math.floor(rng() * 2);
    const queue = [{ gx: startX, gy: startY }];
    cells.set(keyOf(startX, startY), { gx: startX, gy: startY, roomId: -1 });

    let guard = 0;
    while (cells.size < targetCells && guard < 200) {
      guard++;
      const list = Array.from(cells.values());
      const cur = queue.length > 0 ? queue.shift() : list[Math.floor(rng() * list.length)];

      // 随机打乱四个方向
      const dirs = DIRS.slice().sort(() => rng() - 0.5);
      for (const d of dirs) {
        if (cells.size >= targetCells) break;
        const nx = cur.gx + d.dx;
        const ny = cur.gy + d.dy;
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        const nk = keyOf(nx, ny);
        if (cells.has(nk)) continue;

        // 限制已占邻居数，防止滚成实心方块，长出优雅的分支与环岛感
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

    if (cells.size < 9) return null;

    // ================= Step B: 多格合并 (2×2 中庭 + 2×1/1×2 书脊长廊) =================
    const rooms = [];
    const assignRoom = (cellList, gw, gh, kind) => {
      const id = rooms.length;
      let minGx = Infinity, minGy = Infinity;
      for (const c of cellList) {
        c.roomId = id;
        if (c.gx < minGx) minGx = c.gx;
        if (c.gy < minGy) minGy = c.gy;
      }
      const room = {
        id,
        gx: minGx,
        gy: minGy,
        gw,
        gh,
        kind,        // 'atrium' | 'corridor' | 'single'
        role: 'normal', // 'spawn' | 'vault' | 'extract' | 'atrium' | 'corridor' | 'treasure' | 'normal'
        x: minGx * CELL_W,
        y: minGy * CELL_H,
        w: gw * CELL_W,
        h: gh * CELL_H,
        cells: cellList,
        neighbors: new Set(),
        distFromSpawn: 0,
        discovered: false,
        adjacentSeen: false,
        fogAlpha: 1,
      };
      rooms.push(room);
      return room;
    };

    // B1. 优先尝试合并 1 个 2×2 桌面大中庭
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
    let hasAtrium = false;
    if (quadCandidates.length > 0) {
      const chosen = quadCandidates[Math.floor(rng() * quadCandidates.length)];
      const r = assignRoom(chosen, 2, 2, 'atrium');
      r.role = 'atrium';
      hasAtrium = true;
    }

    // B2. 合并 1 ~ 2 条 2×1 或 1×2 书脊长廊（保留足够多的 1×1 给出生/金库/撤离点）
    const pairCandidates = [];
    for (const c of cells.values()) {
      if (c.roomId >= 0) continue;
      const right = cells.get(keyOf(c.gx + 1, c.gy));
      if (right && right.roomId < 0) pairCandidates.push({ list: [c, right], gw: 2, gh: 1 });
      const down = cells.get(keyOf(c.gx, c.gy + 1));
      if (down && down.roomId < 0) pairCandidates.push({ list: [c, down], gw: 1, gh: 2 });
    }
    pairCandidates.sort(() => rng() - 0.5);

    let corridorCount = 0;
    const maxCorridors = hasAtrium ? 1 : 2;
    for (const cand of pairCandidates) {
      if (corridorCount >= maxCorridors) break;
      if (cand.list[0].roomId >= 0 || cand.list[1].roomId >= 0) continue;
      // 保证剩下的未分配单格至少还有 4 个（给出生、金库、撤离点等）
      const remainingFree = Array.from(cells.values()).filter((c) => c.roomId < 0).length;
      if (remainingFree - 2 < 4) break;

      const r = assignRoom(cand.list, cand.gw, cand.gh, 'corridor');
      r.role = 'corridor';
      corridorCount++;
    }

    // B3. 其余格子各自成为 1×1 房间
    for (const c of cells.values()) {
      if (c.roomId < 0) assignRoom([c], 1, 1, 'single');
    }

    const singles = rooms.filter((r) => r.kind === 'single');
    if (!relaxed && (rooms.length < 6 || singles.length < 3 || (!hasAtrium && corridorCount < 1))) {
      return null;
    }

    // ================= Step C: 生成生成树 + 注入战术环路（Cycle Injection） =================
    // 先收集所有跨房间的相邻格子对
    const crossLinks = []; // { c1, c2, r1, r2, eKey }
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

    // 并查集构建 100% 连通的随机生成树
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
    const roomPairConnected = new Set();
    const pairKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

    const addDoor = (link) => {
      doorEdges.add(link.eKey);
      roomPairConnected.add(pairKey(link.r1, link.r2));
      rooms[link.r1].neighbors.add(link.r2);
      rooms[link.r2].neighbors.add(link.r1);
    };

    for (const link of shuffledLinks) {
      if (union(link.r1, link.r2)) {
        addDoor(link);
      }
    }

    // 校验全图是否单连通块
    const root0 = find(0);
    for (let i = 1; i < rooms.length; i++) {
      if (find(i) !== root0) return null;
    }

    // 额外打通 2 ~ 3 条环路捷径（避免被守卫堵死在单线死胡同）
    let cyclesAdded = 0;
    const desiredCycles = 2 + Math.floor(rng() * 2);
    for (const link of shuffledLinks) {
      if (cyclesAdded >= desiredCycles) break;
      const pk = pairKey(link.r1, link.r2);
      if (roomPairConnected.has(pk)) continue;
      addDoor(link);
      cyclesAdded++;
    }

    // ================= Step D: BFS 距离梯度分配职能 + 硬约束校验 =================
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

    // 1) 挑选度数较小（靠边缘）的 1×1 作为出生点
    const sortedForSpawn = singles
      .slice()
      .sort((a, b) => a.neighbors.size - b.neighbors.size || (rng() - 0.5));
    const spawnRoom = sortedForSpawn[0];
    const distFromSpawn = bfsFrom(spawnRoom.id);
    for (let i = 0; i < rooms.length; i++) {
      rooms[i].distFromSpawn = distFromSpawn[i];
    }

    // 2) 选距离出生点最远的 1×1（优先单口/少口密室）作为「高危大金保险库」
    const otherSingles = singles.filter((r) => r.id !== spawnRoom.id);
    otherSingles.sort(
      (a, b) =>
        distFromSpawn[b.id] - distFromSpawn[a.id] ||
        a.neighbors.size - b.neighbors.size ||
        (rng() - 0.5)
    );
    const vaultRoom = otherSingles[0];
    const distFromVault = bfsFrom(vaultRoom.id);

    // 3) 选离出生点和金库都尽量远的另一侧 1×1 作为「怀表撤离点」（逼出战略动线）
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

    // 硬约束检查：不达标立刻丢弃重试
    if (!relaxed) {
      if (dSpawnVault < 3 || dSpawnExtract < 3 || dVaultExtract < 2 || cyclesAdded < 1) {
        return null;
      }
    }

    spawnRoom.role = 'spawn';
    vaultRoom.role = 'vault';
    extractRoom.role = 'extract';

    // 额外指定 1 个中段普通单格为小宝箱房
    const midNormal = extractPool.find(
      (r) => r.id !== extractRoom.id && distFromSpawn[r.id] >= 2
    );
    if (midNormal) midNormal.role = 'treasure';

    // ================= Step E: 边去重烘焙 3/4 墙体、铜钉角柱、门洞与家具 =================
    const walls = [];
    const posts = [];
    const doorways = [];
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

    // 遍历所有水平网格边 (gx, gy) -> 连接 (gx, gy) 到 (gx+1, gy)
    for (let gy = 0; gy <= GRID_SIZE; gy++) {
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const up = cells.get(keyOf(gx, gy - 1));
        const down = cells.get(keyOf(gx, gy));
        if (!up && !down) continue;
        if (up && down && up.roomId === down.roomId) continue; // 合并房间内部无缝打通

        addPost(gx, gy);
        addPost(gx + 1, gy);

        const isDoor = up && down && doorEdges.has(edgeKey(up.gx, up.gy, down.gx, down.gy));
        const wx0 = gx * CELL_W + HALF_T;
        const spanW = CELL_W - WALL_T;
        const wy = gy * CELL_H - HALF_T;

        if (!isDoor) {
          walls.push({ x: wx0, y: wy, w: spanW, h: WALL_T, height: 32, orient: 'h' });
        } else {
          const stubW = (spanW - DOOR_W) / 2;
          walls.push({ x: wx0, y: wy, w: stubW, h: WALL_T, height: 32, orient: 'h' });
          walls.push({ x: wx0 + stubW + DOOR_W, y: wy, w: stubW, h: WALL_T, height: 32, orient: 'h' });
          doorways.push({
            cx: gx * CELL_W + CELL_W / 2,
            cy: gy * CELL_H,
            w: DOOR_W,
            h: WALL_T + 14,
            orient: 'h',
            r1: up.roomId,
            r2: down.roomId,
          });
        }
      }
    }

    // 遍历所有垂直网格边 (gx, gy) -> 连接 (gx, gy) 到 (gx, gy+1)
    for (let gx = 0; gx <= GRID_SIZE; gx++) {
      for (let gy = 0; gy < GRID_SIZE; gy++) {
        const left = cells.get(keyOf(gx - 1, gy));
        const right = cells.get(keyOf(gx, gy));
        if (!left && !right) continue;
        if (left && right && left.roomId === right.roomId) continue;

        addPost(gx, gy);
        addPost(gx, gy + 1);

        const isDoor = left && right && doorEdges.has(edgeKey(left.gx, left.gy, right.gx, right.gy));
        const wx = gx * CELL_W - HALF_T;
        const wy0 = gy * CELL_H + HALF_T;
        const spanH = CELL_H - WALL_T;

        if (!isDoor) {
          walls.push({ x: wx, y: wy0, w: WALL_T, h: spanH, height: 32, orient: 'v' });
        } else {
          const stubH = (spanH - DOOR_W) / 2;
          walls.push({ x: wx, y: wy0, w: WALL_T, h: stubH, height: 32, orient: 'v' });
          walls.push({ x: wx, y: wy0 + stubH + DOOR_W, w: WALL_T, h: stubH, height: 32, orient: 'v' });
          doorways.push({
            cx: gx * CELL_W,
            cy: gy * CELL_H + CELL_H / 2,
            w: WALL_T + 14,
            h: DOOR_W,
            orient: 'v',
            r1: left.roomId,
            r2: right.roomId,
          });
        }
      }
    }

    // ================= Step F: 生成并过滤家具道具（100% 门洞净空保护） =================
    const props = [];
    for (const room of rooms) {
      const candidates = CB.roomTemplates.buildRoomProps(room, rng);
      for (const prop of candidates) {
        if (!isTooCloseToDoor(prop, doorways)) {
          prop.roomId = room.id;
          props.push(prop);
        }
      }
    }

    // 计算整张地图包围盒（用于 M 键全图俯瞰自动缩放居中）
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of rooms) {
      if (r.x < minX) minX = r.x;
      if (r.y < minY) minY = r.y;
      if (r.x + r.w > maxX) maxX = r.x + r.w;
      if (r.y + r.h > maxY) maxY = r.y + r.h;
    }

    // 初始点亮出生房并标出相邻可见房
    spawnRoom.discovered = true;
    spawnRoom.fogAlpha = 0;
    for (const nid of spawnRoom.neighbors) {
      rooms[nid].adjacentSeen = true;
    }

    return {
      seed,
      cellW: CELL_W,
      cellH: CELL_H,
      wallT: WALL_T,
      rooms,
      cells,
      walls,
      posts,
      doorways,
      props,
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
        corridors: corridorCount,
        dSpawnVault,
        dSpawnExtract,
        dVaultExtract,
        genMs: 0,
        attempts: 1,
      },
    };
  }

  function isTooCloseToDoor(prop, doorways) {
    const px = prop.shape === 'circle' ? prop.x : prop.x + prop.w / 2;
    const py = prop.shape === 'circle' ? prop.y : prop.y + prop.h / 2;
    const pr = prop.shape === 'circle' ? prop.r : Math.max(prop.w, prop.h) * 0.52;

    for (const d of doorways) {
      const dist = Math.hypot(px - d.cx, py - d.cy);
      if (dist < pr + 84) return true;
    }
    return false;
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
