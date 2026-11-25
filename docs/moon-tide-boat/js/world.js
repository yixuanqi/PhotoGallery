window.MT = window.MT || {};

window.MT.World = (function () {
  var time = 0;
  var tideProgress = 0; // 0.0 (黄昏初潮) -> 1.0 (近月巨潮)
  var relics = [];
  var skyMeteors = [];
  var jellyfish = [];
  var landmarks = [];
  var particles = [];
  var wakeLanterns = [];
  var nextMeteorTimer = 4.5;
  var nextId = 1;

  // 潮汐光柱位置（装配满 4 件后出现在前方海面）
  var pillar = {
    active: false,
    x: 2600,
    triggered: false
  };

  function reset() {
    time = 0;
    tideProgress = 0.08;
    relics = [];
    skyMeteors = [];
    jellyfish = [];
    landmarks = [];
    particles = [];
    wakeLanterns = [];
    nextMeteorTimer = 4.0;
    pillar.active = false;
    pillar.triggered = false;
    pillar.x = 2600;

    // 预生成初始视野附近的 4 类基础残骸，确保开局 10 秒内就能轻松捞到第一件
    spawnRelicAt(240, 105, 'lantern');
    spawnRelicAt(490, 125, 'thruster');
    spawnRelicAt(-280, 110, 'balloon');
    spawnRelicAt(760, 130, 'gramophone');
    spawnRelicAt(1020, 95, 'keepsake');

    // 预生成发光水母
    for (var i = 0; i < 18; i++) {
      jellyfish.push({
        x: (Math.random() - 0.35) * 2800,
        depth: 65 + Math.random() * 190,
        size: 7 + Math.random() * 9,
        phase: Math.random() * Math.PI * 2,
        speed: 8 + Math.random() * 12,
        hue: Math.random() < 0.5 ? 'rgba(165, 228, 255,' : 'rgba(220, 195, 255,'
      });
    }

    // 雾化远景地标（半沉灯塔、断桥拱、漂浮小岛）
    var types = ['lighthouse', 'arch', 'island', 'crane', 'arch', 'lighthouse'];
    for (var k = -3; k <= 10; k++) {
      landmarks.push({
        x: k * 680 + (Math.random() - 0.5) * 180,
        type: types[(k + 12) % types.length],
        scale: 0.8 + Math.random() * 0.45
      });
    }
  }

  // 核心多层正弦波海面函数（所有物理和渲染共用同一真相）
  function getWaveHeight(worldX, t, lanternCalm) {
    var calmFactor = 1 - Math.min(0.45, (lanternCalm || 0) * 0.14);
    var ampScale = (0.78 + tideProgress * 0.92) * calmFactor;
    var w1 = Math.sin(worldX * 0.0052 + t * 1.15) * 18 * ampScale;
    var w2 = Math.sin(worldX * 0.0115 - t * 1.75 + 1.3) * 8.5 * ampScale;
    var w3 = Math.sin(worldX * 0.023 + t * 2.4) * 3.2 * ampScale;
    return w1 + w2 + w3;
  }

  function getWaveSlope(worldX, t, lanternCalm) {
    var dx = 6;
    var h1 = getWaveHeight(worldX - dx, t, lanternCalm);
    var h2 = getWaveHeight(worldX + dx, t, lanternCalm);
    return (h2 - h1) / (dx * 2);
  }

  function pickArchetypeWeighted(counts) {
    var keys = ['thruster', 'balloon', 'gramophone', 'lantern'];
    // 优先补充玩家还没拿到或等级较低的类型，保证试玩体验顺畅丰富
    var low = keys.filter(function (k) { return (counts[k] || 0) < 2; });
    if (low.length > 0 && Math.random() < 0.78) {
      return low[Math.floor(Math.random() * low.length)];
    }
    if (Math.random() < 0.22) return 'keepsake';
    return keys[Math.floor(Math.random() * keys.length)];
  }

  function spawnRelicAt(worldX, depth, forceType, counts) {
    var type = forceType || pickArchetypeWeighted(counts || {});
    var arch = window.MT.Config.ARCHETYPES[type];
    var item = arch.items[Math.floor(Math.random() * arch.items.length)];
    relics.push({
      id: nextId++,
      x: worldX,
      depth: depth, // 相对海面基准的深度（负数为半浮水面，正数为水下）
      vy: 0,
      bobPhase: Math.random() * Math.PI * 2,
      type: type,
      name: item.name,
      line: item.line,
      color: arch.color,
      glow: arch.glow,
      caught: false,
      radius: 17
    });
  }

  function spawnSkyDebris(boatX, counts) {
    var dir = Math.random() < 0.72 ? 1 : -1;
    var targetX = boatX + dir * (260 + Math.random() * 440);
    var type = pickArchetypeWeighted(counts || {});
    skyMeteors.push({
      x: targetX - dir * 320,
      y: -380,
      vx: dir * (135 + Math.random() * 55),
      vy: 175 + Math.random() * 45,
      targetX: targetX,
      type: type,
      trail: []
    });
  }

  function emitSplash(worldX, worldY, count, color, upwardBias) {
    for (var i = 0; i < count; i++) {
      var ang = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
      var spd = 45 + Math.random() * 145;
      particles.push({
        x: worldX + (Math.random() - 0.5) * 18,
        y: worldY,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - (upwardBias || 0),
        life: 0.65 + Math.random() * 0.55,
        maxLife: 1.2,
        size: 1.8 + Math.random() * 2.8,
        color: color || '#e6eef8',
        gravity: 240 * (1 - tideProgress * 0.55),
        kind: 'drop'
      });
    }
  }

  function emitSpark(worldX, worldY, vx, vy, color, size, life) {
    particles.push({
      x: worldX,
      y: worldY,
      vx: vx,
      vy: vy,
      life: life || 0.6,
      maxLife: life || 0.6,
      size: size || 3,
      color: color || '#ffd28a',
      gravity: -18,
      kind: 'glow'
    });
  }

  function emitSoundRing(worldX, worldY) {
    particles.push({
      x: worldX,
      y: worldY,
      vx: 0,
      vy: -8,
      life: 1.8,
      maxLife: 1.8,
      size: 12,
      color: '#a9f0cc',
      gravity: 0,
      kind: 'ring'
    });
  }

  function dropWakeLantern(worldX) {
    wakeLanterns.push({
      x: worldX,
      phase: Math.random() * Math.PI * 2,
      life: 14.0
    });
    if (wakeLanterns.length > 18) wakeLanterns.shift();
  }

  function update(dt, boat, seaBaseY) {
    time += dt;

    // 潮汐进度随时间与已装配零件自然推进（0.08 -> 1.0）
    var targetTide = Math.min(1.0, 0.08 + boat.totalParts * 0.12 + time * 0.0022);
    tideProgress += (targetTide - tideProgress) * Math.min(1, dt * 0.35);

    // 当零件数 >= 4 时，在前方海面升起通往月亮的巨型发光潮汐光柱
    if (!pillar.active && boat.totalParts >= 4) {
      pillar.active = true;
      pillar.x = boat.x + 1250;
    }

    // 定期天降人类自救残骸，砸进海面化作可打捞物件
    nextMeteorTimer -= dt;
    if (nextMeteorTimer <= 0) {
      spawnSkyDebris(boat.x, boat.parts);
      nextMeteorTimer = 9.5 + Math.random() * 5.5;
    }

    for (var m = skyMeteors.length - 1; m >= 0; m--) {
      var met = skyMeteors[m];
      met.x += met.vx * dt;
      met.y += met.vy * dt;
      met.trail.push({ x: met.x, y: met.y });
      if (met.trail.length > 16) met.trail.shift();

      var surfaceY = getWaveHeight(met.x, time, boat.parts.lantern);
      if (met.y >= surfaceY) {
        emitSplash(met.x, surfaceY, 18, '#ffe6bd', 40);
        spawnRelicAt(met.x, 38 + Math.random() * 55, met.type, boat.parts);
        if (Math.abs(met.x - boat.x) < 950) {
          window.MT.Audio.playSkyFallSplash();
        }
        skyMeteors.splice(m, 1);
      }
    }

    // 保证小船周围始终有充足且分布自然的残骸可捞
    var nearbyCount = 0;
    for (var i = relics.length - 1; i >= 0; i--) {
      var r = relics[i];
      if (Math.abs(r.x - boat.x) < 1200) nearbyCount++;
      if (!r.caught && Math.abs(r.x - boat.x) > 2200) {
        relics.splice(i, 1);
        continue;
      }
      if (!r.caught) {
        r.bobPhase += dt * 1.4;
        // 若装了留声机（共振系），附近残骸会轻柔地被声波吸引靠近小船
        if (boat.parts.gramophone > 0) {
          var dx = boat.x - r.x;
          var dist = Math.abs(dx);
          if (dist < 260 + boat.parts.gramophone * 85 && dist > 26) {
            r.x += Math.sign(dx) * (20 + boat.parts.gramophone * 10) * dt;
            r.depth = Math.max(48, r.depth - 9 * dt);
          }
        }
      }
    }
    if (nearbyCount < 7) {
      var side = Math.random() < 0.7 ? (boat.facing || 1) : -(boat.facing || 1);
      var rx = boat.x + side * (560 + Math.random() * 680);
      var rDepth = 68 + Math.random() * 145;
      spawnRelicAt(rx, rDepth, null, boat.parts);
    }

    // 水母缓慢游动（装了留声机时会向船底聚拢）
    jellyfish.forEach(function (j) {
      j.phase += dt * 2.1;
      j.depth += Math.sin(j.phase) * 9 * dt;
      if (boat.parts.gramophone > 0) {
        var jdx = boat.x - j.x;
        if (Math.abs(jdx) < 420 && Math.abs(jdx) > 45) {
          j.x += Math.sign(jdx) * 18 * dt;
        }
      } else {
        j.x += Math.cos(j.phase * 0.35) * j.speed * dt;
      }
      if (j.x < boat.x - 1600) j.x += 3200;
      if (j.x > boat.x + 1600) j.x -= 3200;
    });

    // 后期高潮时，海面自动飘起向上浮升的发光微光水珠
    if (tideProgress > 0.38 && Math.random() < (tideProgress - 0.3) * 0.45) {
      var px = boat.x + (Math.random() - 0.5) * 1200;
      var py = getWaveHeight(px, time, boat.parts.lantern);
      emitSpark(px, py, (Math.random() - 0.5) * 14, -22 - Math.random() * 34, '#e9f2ff', 1.8 + Math.random() * 1.8, 2.8);
    }

    // 更新尾流漂流灯
    for (var wl = wakeLanterns.length - 1; wl >= 0; wl--) {
      wakeLanterns[wl].life -= dt;
      if (wakeLanterns[wl].life <= 0) wakeLanterns.splice(wl, 1);
    }

    // 更新粒子
    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.life -= dt;
      if (pt.life <= 0) {
        particles.splice(p, 1);
        continue;
      }
      if (pt.kind === 'ring') {
        pt.size += 88 * dt;
        pt.y += pt.vy * dt;
      } else {
        pt.vy += pt.gravity * dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
      }
    }
  }

  return {
    reset: reset,
    update: update,
    getWaveHeight: getWaveHeight,
    getWaveSlope: getWaveSlope,
    emitSplash: emitSplash,
    emitSpark: emitSpark,
    emitSoundRing: emitSoundRing,
    dropWakeLantern: dropWakeLantern,
    getTime: function () { return time; },
    getTide: function () { return tideProgress; },
    getRelics: function () { return relics; },
    getSkyMeteors: function () { return skyMeteors; },
    getJellyfish: function () { return jellyfish; },
    getLandmarks: function () { return landmarks; },
    getParticles: function () { return particles; },
    getWakeLanterns: function () { return wakeLanterns; },
    getPillar: function () { return pillar; }
  };
})();
