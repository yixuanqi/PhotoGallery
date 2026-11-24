(() => {
  const CB = window.CB;
  const game = CB.game;

  const SCARF_COUNT = 8;
  const SCARF_SEG_LEN = 6.8;

  const ROLE_TITLES = {
    spawn: '出发工坊',
    vault: '高危大金保险库 ★',
    extract: '怀表撤离阵 ⏱',
    atrium: '2×2 橡皮擦大中庭',
    corridor: '书脊弹射长廊',
    treasure: '隐秘奇珍角',
  };

  function placePlayerAtSpawn() {
    const p = game.player;
    const sp = game.map ? game.map.spawnPoint : { x: 0, y: 0 };
    p.x = sp.x;
    p.y = sp.y;
    p.vx = 0;
    p.vy = 0;
    p.dashTimer = 0;
    p.dashCooldown = 0;
    p.currentRoomId = game.map ? game.map.spawnRoomId : -1;
    p.scarfNodes = [];
    for (let i = 0; i < SCARF_COUNT; i++) {
      p.scarfNodes.push({ x: p.x - i * SCARF_SEG_LEN, y: p.y - 6 });
    }
    game.camera.x = p.x;
    game.camera.y = p.y;
    game.footprints = [];
    game.particles = [];
    game.popups = [];
  }

  function setVariant(v) {
    game.variant = v;
    const p = game.player;
    p.squashVel += 6.2;
    spawnDust(p.x, p.y - 12, '#ffe194', 8);
  }

  function spawnDust(x, y, color = '#cbb89d', count = 4, speedScale = 1) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (25 + Math.random() * 65) * speedScale;
      game.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 10,
        r: 2.8 + Math.random() * 3.8,
        life: 0.25 + Math.random() * 0.22,
        maxLife: 0.47,
        color,
      });
    }
  }

  function spawnPopup(x, y, text, color = '#3d2f28') {
    game.popups.push({
      x,
      y,
      text,
      color,
      life: 1.35,
      maxLife: 1.35,
    });
  }

  function updatePlayer(dt) {
    const p = game.player;
    const inp = game.input;
    const map = game.map;

    // 1. 鼠标瞄准与朝向
    p.aimAngle = Math.atan2(inp.mouseWorldY - (p.y - 14), inp.mouseWorldX - p.x);
    if (Math.abs(Math.cos(p.aimAngle)) > 0.12) {
      p.facing = Math.cos(p.aimAngle) >= 0 ? 1 : -1;
    }

    // 2. 试射空枪后坐力视觉测试（Step 3 接入真实弹射子弹）
    if (p.fireCooldown > 0) p.fireCooldown -= dt;
    p.recoil *= Math.exp(-22 * dt);
    if (inp.fireHeld && p.fireCooldown <= 0) {
      p.fireCooldown = 0.22;
      p.recoil = 1;
      p.squashVel -= 2.2;
      const mx = p.x + Math.cos(p.aimAngle) * 32;
      const my = p.y - 12 - p.hopHeight + Math.sin(p.aimAngle) * 24;
      spawnDust(mx, my, '#ffd977', 5, 1.35);
      game.camera.shake = Math.max(game.camera.shake, 1.5);
    }

    // 3. 移动向量
    let ix = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    let iy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    const ilen = Math.hypot(ix, iy);
    if (ilen > 0) {
      ix /= ilen;
      iy /= ilen;
    }

    const weightFactor = 1 - p.lootCount * 0.012;
    const maxSpeed = 335 * weightFactor;

    // 4. 冲刺触发
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    if (inp.dashPressed) {
      inp.dashPressed = false;
      if (p.dashCooldown <= 0 && p.dashTimer <= 0) {
        p.dashDirX = ilen > 0 ? ix : Math.cos(p.aimAngle);
        p.dashDirY = ilen > 0 ? iy : Math.sin(p.aimAngle);
        p.dashTimer = 0.17;
        p.dashCooldown = 0.42;
        p.vx = p.dashDirX * 820 * weightFactor;
        p.vy = p.dashDirY * 820 * weightFactor;
        p.squash = 0.34;
        p.squashVel = 2.0;
        p.expr = 'dash';
        p.exprTimer = 0.26;
        game.camera.shake = Math.max(game.camera.shake, 3.8);
        spawnDust(p.x, p.y, '#e6d8be', 7);
      }
    }

    // 5. 平滑加减速
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      if (Math.random() < 0.65) {
        spawnDust(p.x - p.dashDirX * 14, p.y, '#f5ecd9', 1);
      }
    } else {
      const blend = 1 - Math.exp(-18 * dt);
      p.vx += (ix * maxSpeed - p.vx) * blend;
      p.vy += (iy * maxSpeed - p.vy) * blend;
    }

    // 6. 分步位移 + 地图墙体/角柱/家具精确碰撞（避免高速冲刺穿墙）
    const steps = p.dashTimer > 0 ? 2 : 1;
    for (let s = 0; s < steps; s++) {
      p.x += (p.vx * dt) / steps;
      p.y += (p.vy * dt) / steps;
      if (map) resolveMapCollisions(p, map);
    }

    // 7. 房间探索与羊皮纸迷雾揭开
    if (map) {
      const room = CB.mapGen.findRoomAt(map, p.x, p.y);
      if (room && room.id !== p.currentRoomId) {
        p.currentRoomId = room.id;
        if (!room.discovered) {
          room.discovered = true;
          for (const nid of room.neighbors) {
            map.rooms[nid].adjacentSeen = true;
          }
          if (ROLE_TITLES[room.role]) {
            const c = room.role === 'vault' ? '#b87700' : room.role === 'extract' ? '#1f6f8f' : '#4a3b32';
            spawnPopup(p.x, p.y - 46, `发现 ${ROLE_TITLES[room.role]}`, c);
            if (room.role === 'vault') {
              p.expr = 'happy';
              p.exprTimer = 0.9;
              spawnDust(p.x, p.y - 16, '#ffd65c', 10, 1.3);
            }
          }
        }
      }

      // 平滑更新各房间迷雾透明度与弹簧柱闪光
      for (const r of map.rooms) {
        const targetFog = r.discovered ? 0 : 1;
        r.fogAlpha += (targetFog - r.fogAlpha) * (1 - Math.exp(-6.5 * dt));
      }
      for (const prop of map.props) {
        if (prop.hitFlash > 0) prop.hitFlash = Math.max(0, prop.hitFlash - dt * 5);
      }
    }

    // 8. 果冻弹性、前倾与二级惯性弹簧
    const acc = -195 * p.squash - 13 * p.squashVel;
    p.squashVel += acc * dt;
    p.squash += p.squashVel * dt;

    const targetTilt = Math.max(-0.18, Math.min(0.18, p.vx * 0.00042));
    p.tilt += (targetTilt - p.tilt) * (1 - Math.exp(-14 * dt));

    const targetLagX = Math.max(-12, Math.min(12, -p.vx * 0.028));
    const targetLagY = Math.max(-8, Math.min(8, -p.vy * 0.02 - p.hopHeight * 0.45));
    const lagAx = (targetLagX - p.lagX) * 140 - p.lagVx * 11;
    const lagAy = (targetLagY - p.lagY) * 140 - p.lagVy * 11;
    p.lagVx += lagAx * dt;
    p.lagVy += lagAy * dt;
    p.lagX += p.lagVx * dt;
    p.lagY += p.lagVy * dt;

    // 9. 跑动颠簸、小脚印与发条旋转
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 24 && p.dashTimer <= 0) {
      p.walkPhase += dt * (11.5 + speed * 0.032);
      p.hopHeight = Math.abs(Math.sin(p.walkPhase)) * Math.min(7.5, speed * 0.024);

      p.stepAccum += speed * dt;
      if (p.stepAccum > 40) {
        p.stepAccum = 0;
        p.stepSide *= -1;
        game.footprints.push({ x: p.x + p.stepSide * 6, y: p.y + 3, life: 1.4, maxLife: 1.4, r: 2.5 });
      }
    } else {
      p.hopHeight *= Math.exp(-14 * dt);
    }
    p.keyAngle += dt * (2.0 + speed * 0.028 + (p.dashTimer > 0 ? 15 : 0));

    // 10. 表情与眨眼
    if (p.exprTimer > 0) {
      p.exprTimer -= dt;
      if (p.exprTimer <= 0) p.expr = p.exprLock || 'normal';
    } else if (p.exprLock) {
      p.expr = p.exprLock;
    }

    p.blinkTimer -= dt;
    if (p.blinkTimer <= 0) {
      if (p.isBlinking) {
        p.isBlinking = false;
        p.blinkTimer = 2.1 + Math.random() * 2.8;
      } else {
        p.isBlinking = true;
        p.blinkTimer = 0.11;
      }
    }

    updateScarf(p, dt);
  }

  function resolveMapCollisions(p, map) {
    // 1. 墙体与角柱
    for (const w of map.walls) collideCircleRect(p, w.x, w.y, w.w, w.h, 0.55, false);
    for (const post of map.posts) collideCircleRect(p, post.x, post.y, post.w, post.h, 0.55, false);

    // 2. 房间家具与弹射机关
    for (const prop of map.props) {
      if (prop.shape === 'circle') {
        const hit = collideCircleCircle(p, prop.x, prop.y, prop.r, prop.bounce || 0.65, prop.type === 'bumper');
        if (hit && prop.type === 'bumper') {
          prop.hitFlash = 1;
          spawnPopup(prop.x, prop.y - 34, '弹射!', '#c96f18');
        }
      } else {
        const isSuper = prop.type === 'eraser';
        const hit = collideCircleRect(p, prop.x, prop.y, prop.w, prop.h, prop.bounce || 0.65, isSuper);
        if (hit && isSuper) {
          spawnPopup(p.x, p.y - 34, 'BOING!', '#d95370');
        }
      }
    }
  }

  function collideCircleRect(p, rx, ry, rw, rh, bounce, isSuperBounce) {
    const cx = Math.max(rx, Math.min(p.x, rx + rw));
    const cy = Math.max(ry, Math.min(p.y, ry + rh));
    const dx = p.x - cx;
    const dy = p.y - cy;
    const distSq = dx * dx + dy * dy;
    if (distSq >= p.radius * p.radius) return false;

    const dist = Math.sqrt(distSq) || 0.001;
    const nx = dx / dist;
    const ny = dy / dist;
    p.x += nx * (p.radius - dist);
    p.y += ny * (p.radius - dist);

    const vn = p.vx * nx + p.vy * ny;
    if (vn < -150 || (isSuperBounce && vn < -40)) {
      const boost = isSuperBounce ? Math.max(Math.abs(vn) * bounce, 560) : Math.abs(vn) * bounce;
      p.vx += (boost - vn) * nx;
      p.vy += (boost - vn) * ny;
      p.dashTimer = 0;
      p.squash = -0.32;
      p.squashVel = -3.2;
      p.expr = isSuperBounce ? 'dash' : 'shock';
      p.exprTimer = 0.36;
      game.camera.shake = Math.max(game.camera.shake, isSuperBounce ? 7.5 : 4);
      spawnDust(cx, cy, isSuperBounce ? '#ff9db2' : '#d6c3a5', 7);
      return true;
    } else if (vn < 0) {
      p.vx -= vn * nx;
      p.vy -= vn * ny;
    }
    return false;
  }

  function collideCircleCircle(p, cx, cy, cr, bounce, isBumper) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const minDist = p.radius + cr;
    const distSq = dx * dx + dy * dy;
    if (distSq >= minDist * minDist) return false;

    const dist = Math.sqrt(distSq) || 0.001;
    const nx = dx / dist;
    const ny = dy / dist;
    p.x += nx * (minDist - dist);
    p.y += ny * (minDist - dist);

    const vn = p.vx * nx + p.vy * ny;
    if (isBumper && vn < 40) {
      const kick = Math.max(580, Math.abs(vn) * bounce);
      p.vx = nx * kick;
      p.vy = ny * kick;
      p.dashTimer = 0;
      p.squash = -0.35;
      p.squashVel = -4;
      p.expr = 'dash';
      p.exprTimer = 0.35;
      game.camera.shake = Math.max(game.camera.shake, 7);
      spawnDust(cx + nx * cr, cy + ny * cr, '#ffd76a', 9, 1.3);
      return true;
    } else if (vn < 0) {
      p.vx -= (1 + bounce * 0.4) * vn * nx;
      p.vy -= (1 + bounce * 0.4) * vn * ny;
    }
    return false;
  }

  function updateScarf(p, dt) {
    const nodes = p.scarfNodes;
    if (!nodes.length) return;

    const neckX = p.x - p.facing * 7;
    const neckY = p.y - 11 - p.hopHeight;
    nodes[0].x = neckX;
    nodes[0].y = neckY;

    const flutter = Math.sin(game.time * 9.5) * 20;
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];

      curr.x += (-p.facing * 26 + flutter * 0.45) * dt;
      curr.y += (15 + Math.cos(game.time * 7.2 + i * 0.9) * 16) * dt;

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      if (dist > SCARF_SEG_LEN) {
        curr.x = prev.x + (dx / dist) * SCARF_SEG_LEN;
        curr.y = prev.y + (dy / dist) * SCARF_SEG_LEN;
      }
    }
  }

  CB.player = { placePlayerAtSpawn, updatePlayer, setVariant, spawnDust, spawnPopup };
})();
