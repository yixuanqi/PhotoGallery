window.MT = window.MT || {};

window.MT.Main = (function () {
  var dom = {};
  var running = false;
  var endingActive = false;
  var endingKey = null;
  var endingTimer = 0;
  var endingCardShown = false;
  var endingFxTimer = 0;
  var touchMode = false;
  var lastTime = 0;
  var whisperTimer = null;
  var zoneBannerTimer = null;
  var tipTimer = null;
  var currentZoneId = null;
  var announcedZones = {};
  var dormantPillarNotified = false;
  var chartCtx = null;

  var input = {
    left: false,
    right: false,
    boost: false
  };

  function cacheDom() {
    dom.canvas = document.getElementById('game-canvas');
    dom.hudTop = document.getElementById('hud-top');
    dom.partsBar = document.getElementById('parts-bar');
    dom.zoneLabel = document.getElementById('zone-label');
    dom.chartSub = document.getElementById('chart-sub');
    dom.chartCanvas = document.getElementById('sea-chart-canvas');
    chartCtx = dom.chartCanvas ? dom.chartCanvas.getContext('2d') : null;
    dom.btnMute = document.getElementById('btn-mute');

    dom.zoneBanner = document.getElementById('zone-banner');
    dom.zoneBannerKicker = document.getElementById('zone-banner-kicker');
    dom.zoneBannerTitle = document.getElementById('zone-banner-title');
    dom.zoneBannerSub = document.getElementById('zone-banner-sub');

    dom.whisperBanner = document.getElementById('whisper-banner');
    dom.whisperTitle = document.getElementById('whisper-title');
    dom.whisperLine = document.getElementById('whisper-line');
    dom.controlsTip = document.getElementById('controls-tip');

    dom.touchControls = document.getElementById('touch-controls');
    dom.tcLeft = document.getElementById('tc-left');
    dom.tcRight = document.getElementById('tc-right');
    dom.tcHook = document.getElementById('tc-hook');
    dom.tcPulse = document.getElementById('tc-pulse');
    dom.tcBoost = document.getElementById('tc-boost');

    dom.titleScreen = document.getElementById('title-screen');
    dom.btnPlay = document.getElementById('btn-play');

    dom.endingScreen = document.getElementById('ending-screen');
    dom.endingKicker = document.getElementById('ending-kicker');
    dom.endingTitle = document.getElementById('ending-title');
    dom.endingPoem = document.getElementById('ending-poem');
    dom.endingStats = document.getElementById('ending-stats');
    dom.btnContinue = document.getElementById('btn-continue');
    dom.btnReplay = document.getElementById('btn-replay');
  }

  function setTouchMode(flag) {
    touchMode = !!flag;
    if (running && touchMode) {
      dom.touchControls.classList.remove('hidden');
      dom.controlsTip.classList.add('hidden');
    } else {
      dom.touchControls.classList.add('hidden');
    }
  }

  function updatePartsHUD(highlightType) {
    var boat = window.MT.Boat.getState();
    var maxLv = window.MT.Config.PROGRESSION.MAX_LEVEL;
    var pills = dom.partsBar.querySelectorAll('.part-pill');

    pills.forEach(function (pill) {
      var type = pill.getAttribute('data-type');
      var lv = boat.parts[type] || 0;
      var sh = boat.shards[type] || 0;
      var maxed = lv >= maxLv;

      pill.querySelector('.p-lv').textContent = lv;
      pill.classList.toggle('active', lv > 0 || sh > 0);
      pill.classList.toggle('maxed', maxed);

      var pips = pill.querySelectorAll('.p-pips i');
      pips.forEach(function (pip, idx) {
        pip.classList.toggle('filled', maxed || idx < sh);
      });

      if (type === highlightType) {
        pill.classList.remove('pop');
        void pill.offsetWidth;
        pill.classList.add('pop');
        setTimeout(function () { pill.classList.remove('pop'); }, 360);
      }
    });

    if (boat.parts.thruster > 0) {
      dom.tcBoost.classList.remove('hidden');
    } else {
      dom.tcBoost.classList.add('hidden');
    }
  }

  function drawCircularSeaChart(boatX) {
    if (!chartCtx || !dom.chartCanvas) return;
    var world = window.MT.World;
    var zones = window.MT.Config.ZONES;
    var L = world.getWorldLength();
    var sectors = world.getExploredSectors();
    var secCount = sectors.length || 48;
    var pillar = world.getPillar();

    var cw = dom.chartCanvas.width;
    var ch = dom.chartCanvas.height;
    var cx = cw * 0.5;
    var cy = ch * 0.5;
    var r = cw * 0.37;

    chartCtx.clearRect(0, 0, cw, ch);

    // 1. 淡淡的 360° 迷雾底环
    chartCtx.strokeStyle = 'rgba(246, 239, 228, 0.14)';
    chartCtx.lineWidth = 5;
    chartCtx.beginPath();
    chartCtx.arc(cx, cy, r, 0, Math.PI * 2);
    chartCtx.stroke();

    // 2. 已探索扇区按四海域水彩色温逐段点亮
    var stepAng = (Math.PI * 2) / secCount;
    var startOffset = -Math.PI * 0.5;
    chartCtx.lineWidth = 6;
    chartCtx.lineCap = 'butt';
    for (var i = 0; i < secCount; i++) {
      if (!sectors[i]) continue;
      var zIdx = Math.min(zones.length - 1, Math.floor((i / secCount) * zones.length));
      var a0 = startOffset + i * stepAng - 0.015;
      var a1 = startOffset + (i + 1) * stepAng + 0.015;
      chartCtx.strokeStyle = zones[zIdx].chartColor || '#f5c982';
      chartCtx.beginPath();
      chartCtx.arc(cx, cy, r, a0, a1);
      chartCtx.stroke();
    }

    // 3. 已探索区域内尚未打捞的特殊遗物（深海重物/空投/云端星遗）微光星点
    var relics = world.getRelics();
    for (var ri = 0; ri < relics.length; ri++) {
      var rel = relics[ri];
      if (!rel.isHeavy && !rel.isAirborne) continue;
      var sIdx = Math.floor((world.wrapX(rel.x) / L) * secCount) % secCount;
      if (!sectors[sIdx]) continue;
      var ra = startOffset + (world.wrapX(rel.x) / L) * Math.PI * 2;
      var rx = cx + Math.cos(ra) * (r - 10);
      var ry = cy + Math.sin(ra) * (r - 10);
      chartCtx.fillStyle = 'rgba(255, 242, 206, 0.78)';
      chartCtx.beginPath();
      chartCtx.arc(rx, ry, 2.2, 0, Math.PI * 2);
      chartCtx.fill();
    }

    // 3b. 四大海核心古迹圣星标记（未点亮呈空心银菱形，已点亮呈暖金实心星点）
    var puzzles = world.getLandmarkPuzzles();
    for (var pi = 0; pi < puzzles.length; pi++) {
      var pz = puzzles[pi];
      var pza = startOffset + (world.wrapX(pz.x) / L) * Math.PI * 2;
      var pzx = cx + Math.cos(pza) * (r + 1);
      var pzy = cy + Math.sin(pza) * (r + 1);
      chartCtx.save();
      chartCtx.translate(pzx, pzy);
      chartCtx.rotate(Math.PI * 0.25);
      if (pz.solved) {
        chartCtx.fillStyle = '#ffe69c';
        chartCtx.fillRect(-3.4, -3.4, 6.8, 6.8);
      } else {
        chartCtx.fillStyle = 'rgba(20, 24, 44, 0.85)';
        chartCtx.strokeStyle = 'rgba(246, 232, 204, 0.62)';
        chartCtx.lineWidth = 1.4;
        chartCtx.fillRect(-3, -3, 6, 6);
        chartCtx.strokeRect(-3, -3, 6, 6);
      }
      chartCtx.restore();
    }

    // 4. 东端潮汐光柱星标（休眠银蓝 / 苏醒暖金）
    var pa = startOffset + (world.wrapX(pillar.x) / L) * Math.PI * 2;
    var px = cx + Math.cos(pa) * r;
    var py = cy + Math.sin(pa) * r;
    chartCtx.fillStyle = pillar.awakened ? '#ffe599' : 'rgba(176, 208, 240, 0.58)';
    chartCtx.beginPath();
    chartCtx.arc(px, py, pillar.awakened ? 4.8 : 3.4, 0, Math.PI * 2);
    chartCtx.fill();

    // 5. 当前小船位置亮点
    var ba = startOffset + (world.wrapX(boatX) / L) * Math.PI * 2;
    var bx = cx + Math.cos(ba) * r;
    var by = cy + Math.sin(ba) * r;
    chartCtx.fillStyle = 'rgba(255, 214, 130, 0.35)';
    chartCtx.beginPath();
    chartCtx.arc(bx, by, 8.5, 0, Math.PI * 2);
    chartCtx.fill();
    chartCtx.fillStyle = '#fff5d8';
    chartCtx.beginPath();
    chartCtx.arc(bx, by, 4.2, 0, Math.PI * 2);
    chartCtx.fill();

    // 6. 星图中心迷你月相符号
    chartCtx.fillStyle = pillar.awakened ? 'rgba(255, 234, 174, 0.88)' : 'rgba(232, 236, 248, 0.36)';
    chartCtx.font = '18px Georgia, serif';
    chartCtx.textAlign = 'center';
    chartCtx.textBaseline = 'middle';
    chartCtx.fillText('☾', cx, cy + 1);
  }

  function updateSeaChart(boatX) {
    var world = window.MT.World;
    var zone = world.getZoneAt(boatX);
    var pct = Math.round(world.getExplorationRatio() * 100);
    var pillar = world.getPillar();

    drawCircularSeaChart(boatX);
    var solvedLm = world.getSolvedLandmarkCount();
    if (dom.chartSub) {
      dom.chartSub.textContent = pillar.awakened
        ? ('古迹 ' + solvedLm + '/4 · 光柱已苏醒')
        : ('古迹 ' + solvedLm + '/4 · 探索 ' + pct + '%');
      dom.chartSub.classList.toggle('awakened', !!pillar.awakened);
    }

    if (zone.id !== currentZoneId) {
      currentZoneId = zone.id;
      dom.zoneLabel.textContent = zone.name;
      if (!announcedZones[zone.id]) {
        announcedZones[zone.id] = true;
        showZoneBanner(zone);
        if (zone.index > 0) {
          window.MT.Audio.playZoneChime();
        }
      }
    }
  }

  function showZoneBanner(zone) {
    dom.zoneBannerKicker.textContent = zone.kicker;
    dom.zoneBannerTitle.textContent = zone.name;
    dom.zoneBannerSub.textContent = zone.subtitle;
    dom.zoneBanner.classList.remove('hidden');
    requestAnimationFrame(function () {
      dom.zoneBanner.classList.add('show');
    });
    if (zoneBannerTimer) clearTimeout(zoneBannerTimer);
    zoneBannerTimer = setTimeout(function () {
      dom.zoneBanner.classList.remove('show');
    }, 4200);
  }

  function showWhisper(title, line, isCrafted) {
    dom.whisperTitle.textContent = title;
    dom.whisperLine.textContent = line;
    dom.whisperBanner.classList.toggle('crafted', !!isCrafted);
    dom.whisperBanner.classList.remove('hidden');
    requestAnimationFrame(function () {
      dom.whisperBanner.classList.add('show');
    });
    if (whisperTimer) clearTimeout(whisperTimer);
    whisperTimer = setTimeout(function () {
      dom.whisperBanner.classList.remove('show');
    }, isCrafted ? 4600 : 3500);
  }

  function onSalvage(item, boatState, info) {
    var arch = window.MT.Config.ARCHETYPES[item.type];
    if (item.isLandmarkReward) {
      updatePartsHUD(item.type);
      return;
    }
    if (item.type === 'keepsake') {
      showWhisper(item.name + ' · 海漂拾遗', item.line, false);
      updatePartsHUD(null);
      return;
    }

    if (info.isUpgrade) {
      var upTitle = arch.upgradeTitles[info.level - 1] || arch.name;
      var upLine = arch.upgradeLines[info.level - 1] || item.line;
      showWhisper('✦ 装船完成 · ' + upTitle + '（Lv.' + info.level + '）', upLine, true);
      updatePartsHUD(item.type);
    } else if (info.isMaxed) {
      showWhisper(item.name + ' · ' + arch.name + '已达满级', item.line, false);
      updatePartsHUD(null);
    } else {
      var gainTag = item.isCloudRelic && (info.shardGain || 1) > 1
        ? ' · 云端星遗 +' + info.shardGain + '（'
        : item.isAirborne && (info.shardGain || 1) > 1
        ? ' · 高空空投 +' + info.shardGain + '（'
        : (item.isHeavy && (info.shardGain || 1) > 1
          ? ' · 深海重物 +' + info.shardGain + '（'
          : ' · ' + arch.name + '碎片（');
      showWhisper(
        item.name + gainTag + info.shards + '/' + info.shardsNeeded + '）',
        item.line,
        false
      );
      updatePartsHUD(item.type);
    }
  }

  function onWorldEvent(kind, payload) {
    if (kind === 'jelly_lift') {
      showWhisper(
        '潮汐共鸣 · 水母托举',
        '留声机的余音唤来了深海发光水母，它们正把沉重的遗物轻轻托出暗礁谷。',
        false
      );
    } else if (kind === 'heavy_slip') {
      showWhisper(
        '绳索脱钩 · 深海重物',
        '这件沉海重物太沉了——试着在涌浪抬升时放慢船速顺浪拉起，或装上留声机唤水母托举。',
        false
      );
    } else if (kind === 'reef_bump') {
      showWhisper(
        '暗礁浅峰 · 雾海警示',
        '船底轻擦过了隐在浓雾里的水下暗礁——升级灯火可照破海雾，或借浪峰越过礁尖。',
        false
      );
    } else if (kind === 'ramp_launch') {
      showWhisper(
        '残骸跃浪 · 火箭跳台',
        '木舟顺着倾斜的推月火箭外壳冲上夜空——高空还悬着不少未曾落海的降落伞遗物。',
        false
      );
    } else if (kind === 'thermal_lift') {
      showWhisper(
        '余温上升流 · 蒸汽托举',
        '坠海火箭煮沸的海水化成暖流托起木舟，船尾推进器也顺势补满了气压。',
        false
      );
    } else if (kind === 'shockwave_ride') {
      showWhisper(
        '天降激波 · 铁与火',
        '一截推月火箭坠入海湾，翻涌的激波把小船推上了高高的浪脊，落点也升起了滚烫热流。',
        false
      );
    } else if (kind === 'cloud_island') {
      showWhisper(
        '云海悬岛 · 近月驿站',
        '木舟轻落在浮空石岛的月苔草甸上，推进器气压瞬息回满，东端的光柱就在云隙前方。',
        false
      );
    } else if (kind === 'gravity_stream') {
      showWhisper(
        '潮汐失重流 · 漫步云端',
        '近月的引力将海雾化作向上奔涌的银色光流，即便没有喷火推进，小船也能随月光登云。',
        false
      );
    } else if (kind === 'perfect_crest') {
      showWhisper(
        '✦ 完美跃浪 · 顺坡蓝焰',
        '迎着浪峰前坡顺势点火，木舟撕开浪脊一跃入云——试着串起高空的月风加速环！',
        true
      );
    } else if (kind === 'wind_ring') {
      showWhisper(
        '月风加速环 · 云端接力',
        '穿过平流层的月风环会瞬间补足推进气压并叠加航速，连穿风环即可凌空环游四海。',
        false
      );
    } else if (kind === 'pillar_awaken') {
      showWhisper(
        '✦ 潮汐光柱已苏醒',
        '四海星图亮起暖光，浮空云海深处的潮汐光柱已经点燃——随时可以驶入终章，或继续自由环海。',
        true
      );
    } else if (kind === 'pillar_dormant') {
      showWhisper(
        '休眠的潮汐光柱',
        '光柱仍在沉睡——点亮四海古迹或继续探索环海星图，即可唤醒通往月亮的终章光柱。',
        false
      );
    } else if (kind === 'landmark_solved' && payload) {
      window.MT.Boat.grantLandmarkReward(payload, onSalvage);
      showWhisper(payload.rewardTitle, payload.rewardLine, true);
    } else if (kind === 'bell_chime' && payload) {
      showWhisper(
        '沉海古钟共鸣（' + payload.count + '/' + payload.total + '）',
        '洪亮的钟声穿透海雾——靠近其余沉钟并按 E / 右键释放声波，唤醒雾海巨鲸。',
        false
      );
    } else if (kind === 'clamp_snap') {
      showWhisper(
        '钢缆绷断（1/2）',
        '一侧发射架卡扣已松开！再拉断另一侧钢缆即可点燃第十九号推月发射台。',
        false
      );
    } else if (kind === 'whale_surf') {
      showWhisper(
        '✦ 乘鲸破浪 · 星辉洋流',
        '发光巨鲸正伴随木舟巡游月海，顺着它掀起的暖流航行可获得强劲推进与气压补给。',
        true
      );
    } else if (kind === 'sky_swing') {
      showWhisper(
        '空中钟摆 · 荡跃云端',
        '铁钩稳稳锁住了高空浮囊锚环！松手或点火即可顺着惯性荡飞向高空风环与浮岛。',
        false
      );
    }
  }

  function triggerEnding() {
    endingActive = true;
    endingTimer = 0;
    endingCardShown = false;
    endingFxTimer = 0;
    endingKey = window.MT.Boat.getDominantEndingKey();
    var info = window.MT.Config.ENDINGS[endingKey];
    var boat = window.MT.Boat.getState();
    var p = boat.parts;

    input.left = false;
    input.right = false;
    input.boost = false;
    boat.hook.mode = 'idle';
    boat.hook.caughtRelic = null;
    window.MT.Audio.setBoosting(false, boat.fuel);
    window.MT.Audio.playEndingFinale(endingKey);

    if (endingKey === 'flight') {
      boat.vy = -155;
      boat.vx = boat.facing * 92;
      boat.boosting = true;
      window.MT.World.emitSoundRing(boat.x, boat.y - 18, '#a8dcff');
    } else if (endingKey === 'lanterns') {
      window.MT.World.setEndingCalmTarget(0.68);
      for (var i = -6; i <= 6; i++) {
        window.MT.World.dropWakeLantern(boat.x + i * 48);
        window.MT.World.spawnSkyLantern(boat.x + i * 54 + (Math.random() - 0.5) * 20, -4 - Math.random() * 24);
      }
    } else {
      window.MT.World.setEndingCalmTarget(0.92);
      window.MT.World.emitSoundRing(boat.x, boat.y - 24, '#a9f0cc');
      window.MT.World.emitSoundRing(boat.x, boat.y - 24, '#ffe8ba');
    }

    dom.endingKicker.textContent = info.kicker;
    dom.endingTitle.textContent = info.title;
    dom.endingPoem.innerHTML = info.poem;
    dom.endingStats.textContent =
      '环航四海 · 点亮古迹 ' + window.MT.World.getSolvedLandmarkCount() + '/4 · 收集 ' + boat.totalSalvaged +
      ' 件遗物 · 灯火 ' + p.lantern + ' / 共振 ' + p.gramophone + ' / 推进 ' + p.thruster + ' / 浮空 ' + p.balloon;
  }

  function startVoyage() {
    window.MT.Audio.init();
    window.MT.World.reset();
    window.MT.Boat.reset();
    endingActive = false;
    endingKey = null;
    endingTimer = 0;
    endingCardShown = false;
    endingFxTimer = 0;
    running = true;
    currentZoneId = null;
    announcedZones = {};
    dormantPillarNotified = false;

    dom.titleScreen.classList.add('hidden');
    dom.endingScreen.classList.add('hidden');
    dom.hudTop.classList.remove('hidden');

    setTouchMode(touchMode);

    if (!touchMode) {
      dom.controlsTip.classList.remove('hidden', 'fade-out');
      if (tipTimer) clearTimeout(tipTimer);
      tipTimer = setTimeout(function () {
        dom.controlsTip.classList.add('fade-out');
      }, 10000);
    }

    updatePartsHUD(null);
    updateSeaChart(window.MT.Boat.getState().x);
  }

  function bindHoldButton(el, onDown, onUp) {
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      el.classList.add('pressed');
      onDown();
    });
    var end = function (e) {
      if (e) e.stopPropagation();
      el.classList.remove('pressed');
      onUp();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', end);
  }

  function bindEvents() {
    dom.btnPlay.addEventListener('click', startVoyage);
    dom.btnReplay.addEventListener('click', startVoyage);

    dom.btnContinue.addEventListener('click', function () {
      endingActive = false;
      endingCardShown = false;
      var boat = window.MT.Boat.getState();
      boat.boosting = false;
      window.MT.World.setEndingCalmTarget(0);
      dom.endingScreen.classList.add('hidden');
      var pillar = window.MT.World.getPillar();
      pillar.triggered = true;
    });

    dom.btnMute.addEventListener('click', function () {
      window.MT.Audio.init();
      var next = !window.MT.Audio.isMuted();
      window.MT.Audio.setMuted(next);
      dom.btnMute.textContent = next ? '声景：关' : '声景：开';
    });

    window.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') {
        setTouchMode(true);
      }
    }, true);

    window.addEventListener('keydown', function (e) {
      if (touchMode) setTouchMode(false);
      if (!running || endingActive) return;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = true;
      if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        input.boost = true;
      }
      if (e.code === 'Space' || e.code === 'KeyS' || e.code === 'ArrowDown') {
        e.preventDefault();
        window.MT.Boat.castHook();
      }
      if (e.code === 'KeyE' || e.code === 'KeyF') {
        e.preventDefault();
        window.MT.Boat.triggerSonar(onWorldEvent);
      }
    });

    window.addEventListener('keyup', function (e) {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = false;
      if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        input.boost = false;
      }
      if (e.code === 'Space' || e.code === 'KeyS' || e.code === 'ArrowDown') {
        window.MT.Boat.releaseHook();
      }
    });

    dom.canvas.addEventListener('pointerdown', function (e) {
      if (!running || endingActive) return;
      window.MT.Audio.init();
      if (e.button === 2) {
        e.preventDefault();
        window.MT.Boat.triggerSonar(onWorldEvent);
        return;
      }
      var rect = dom.canvas.getBoundingClientRect();
      var sx = e.clientX - rect.left;
      var sy = e.clientY - rect.top;
      var worldPt = window.MT.Renderer.screenToWorld(sx, sy);
      window.MT.Boat.castHook(worldPt.x, worldPt.y);
    });

    dom.canvas.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });

    window.addEventListener('pointerup', function () {
      if (!running) return;
      window.MT.Boat.releaseHook();
    });

    bindHoldButton(dom.tcLeft, function () { input.left = true; }, function () { input.left = false; });
    bindHoldButton(dom.tcRight, function () { input.right = true; }, function () { input.right = false; });
    bindHoldButton(dom.tcBoost, function () { input.boost = true; }, function () { input.boost = false; });
    bindHoldButton(dom.tcHook, function () { window.MT.Boat.castHook(); }, function () { window.MT.Boat.releaseHook(); });
    if (dom.tcPulse) {
      bindHoldButton(dom.tcPulse, function () {
        if (!running || endingActive) return;
        window.MT.Audio.init();
        window.MT.Boat.triggerSonar(onWorldEvent);
      }, function () {});
    }
  }

  function loop(ts) {
    var dt = lastTime ? Math.min(0.05, (ts - lastTime) * 0.001) : 0.016;
    lastTime = ts;

    var boat = window.MT.Boat.getState();
    var world = window.MT.World;

    if (running) {
      if (!endingActive) {
        window.MT.Boat.update(dt, input, onSalvage, onWorldEvent);
        updateSeaChart(boat.x);

        var pillar = world.getPillar();
        if (pillar.active && !pillar.triggered && Math.abs(world.deltaX(boat.x, pillar.x)) < 88) {
          if (pillar.awakened) {
            triggerEnding();
          } else if (!dormantPillarNotified) {
            dormantPillarNotified = true;
            onWorldEvent('pillar_dormant');
          }
        }
      } else {
        endingTimer += dt;
        endingFxTimer -= dt;
        var cardDelay = window.MT.Config.CLOUD_SEA ? window.MT.Config.CLOUD_SEA.FINALE_CARD_DELAY : 2.6;
        if (!endingCardShown && endingTimer >= cardDelay) {
          endingCardShown = true;
          dom.endingScreen.classList.remove('hidden');
        }

        var waveEnd = world.getWaveHeight(boat.x, world.getTime(), boat.parts.lantern);
        if (endingKey === 'flight') {
          boat.boosting = true;
          boat.x += boat.facing * 52 * dt;
          boat.y += (-335 + Math.sin(endingTimer * 1.4) * 14 - boat.y) * Math.min(1, dt * 1.05);
          boat.angle += (-0.16 * boat.facing - boat.angle) * Math.min(1, dt * 3);
          boat.scarfPhase += dt * 6;
          if (endingFxTimer <= 0) {
            endingFxTimer = 0.08;
            world.emitSpark(boat.x - boat.facing * 36, boat.y + 2, -boat.facing * 95, 22 + Math.random() * 24, Math.random() < 0.5 ? '#9be0ff' : '#ffd89a', 3.0, 0.85);
          }
        } else if (endingKey === 'symphony') {
          var symPillarX = world.projectNear(world.getPillar().x, boat.x);
          boat.vx *= Math.pow(0.2, dt);
          boat.x += (symPillarX - boat.x) * Math.min(1, dt * 0.6);
          boat.y += (waveEnd - boat.y) * Math.min(1, dt * 3.5);
          boat.angle += (0 - boat.angle) * Math.min(1, dt * 3);
          if (endingFxTimer <= 0) {
            endingFxTimer = 1.15;
            world.emitSoundRing(boat.x, boat.y - 24, Math.random() < 0.5 ? '#a9f0cc' : '#ffe8ba');
          }
        } else {
          var lanPillarX = world.projectNear(world.getPillar().x, boat.x);
          boat.vx *= Math.pow(0.2, dt);
          boat.x += (lanPillarX - boat.x) * Math.min(1, dt * 0.55);
          boat.y += (waveEnd - boat.y) * Math.min(1, dt * 3.5);
          boat.angle += (0 - boat.angle) * Math.min(1, dt * 3);
          if (endingFxTimer <= 0) {
            endingFxTimer = 0.42;
            var lx = boat.x + (Math.random() - 0.5) * 680;
            world.spawnSkyLantern(lx, waveEnd - 4);
            if (Math.random() < 0.45) world.dropWakeLantern(lx);
          }
        }
      }
    }

    world.update(dt, boat, onWorldEvent);
    var zbBoat = world.getZoneBlend(boat.x);
    var cloudFactor = zbBoat.zone.id === 'cloud_sea' ? 1.0 : Math.max(0, Math.min(1, (zbBoat.moonBias - 0.55) / 0.4));
    window.MT.Audio.update(dt, boat.parts.gramophone, world.getTide(), zbBoat.fogDensity, cloudFactor);
    window.MT.Renderer.render(dt, endingActive ? endingKey : null);

    requestAnimationFrame(loop);
  }

  function init() {
    cacheDom();
    window.MT.World.reset();
    window.MT.Boat.reset();
    window.MT.Renderer.init(dom.canvas);
    bindEvents();
    requestAnimationFrame(loop);
  }

  window.addEventListener('DOMContentLoaded', init);
  return { init: init, startVoyage: startVoyage };
})();
