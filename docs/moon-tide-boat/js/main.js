window.MT = window.MT || {};

window.MT.Main = (function () {
  var dom = {};
  var running = false;
  var paused = false;
  var docked = false;
  var touchMode = false;
  var lastTime = 0;
  var tipTimer = null;
  var bannerTimer = null;
  var coachKey = 'mt_v7_coach_flags';
  var coachDone = {};
  var coachCooldown = 0;
  var activeBounty = null;
  var bountyFlashTimer = null;
  var completedBounties = 0;
  var activeStageClear = null;
  var codexOpen = false;
  var settingsOpen = false;
  var codexToastTimer = null;

  var input = {
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
    joyX: 0,
    joyY: 0
  };

  function cacheDom() {
    dom.canvas = document.getElementById('game-canvas');
    dom.hudTop = document.getElementById('hud-top');
    dom.hullFill = document.getElementById('hull-bar-fill');
    dom.starCount = document.getElementById('star-count');
    dom.relicPill = document.getElementById('relic-pill');
    dom.relicCount = document.getElementById('relic-count');
    dom.comboPill = document.getElementById('combo-pill');
    dom.comboCount = document.getElementById('combo-count');
    dom.envPill = document.getElementById('env-pill');
    dom.eraLabel = document.getElementById('era-label');
    dom.distLabel = document.getElementById('dist-label');
    dom.brassCompass = document.getElementById('brass-compass');
    dom.compassMarks = document.getElementById('compass-marks');
    dom.compassNeedle = document.getElementById('compass-needle');
    dom.compassDepth = document.getElementById('compass-depth');
    dom.climaxBarWrap = document.getElementById('climax-bar-wrap');
    dom.climaxBarFill = document.getElementById('climax-bar-fill');
    dom.btnPhaseDial = document.getElementById('btn-phase-dial');
    dom.btnCodex = document.getElementById('btn-codex');
    dom.codexHudCount = document.getElementById('codex-hud-count');
    dom.codexToast = document.getElementById('codex-toast');
    dom.codexToastThumb = document.getElementById('codex-toast-thumb');
    dom.codexToastText = document.getElementById('codex-toast-text');
    dom.codexScreen = document.getElementById('codex-screen');
    dom.codexTotalProg = document.getElementById('codex-total-prog');
    dom.codexRelicSub = document.getElementById('codex-relic-sub');
    dom.codexFaunaSub = document.getElementById('codex-fauna-sub');
    dom.codexWonderSub = document.getElementById('codex-wonder-sub');
    dom.codexRelicGrid = document.getElementById('codex-relic-grid');
    dom.codexFaunaGrid = document.getElementById('codex-fauna-grid');
    dom.codexWonderGrid = document.getElementById('codex-wonder-grid');
    dom.btnCodexClose = document.getElementById('btn-codex-close');
    dom.btnExportPoster = document.getElementById('btn-export-poster');
    dom.btnSettings = document.getElementById('btn-settings');
    dom.settingsScreen = document.getElementById('settings-screen');
    dom.setMusicVol = document.getElementById('set-music-vol');
    dom.setMusicVal = document.getElementById('set-music-val');
    dom.setSfxVol = document.getElementById('set-sfx-vol');
    dom.setSfxVal = document.getElementById('set-sfx-val');
    dom.setQualityHint = document.getElementById('set-quality-hint');
    dom.btnQualHigh = document.getElementById('btn-qual-high');
    dom.btnQualEco = document.getElementById('btn-qual-eco');
    dom.btnSettingsClose = document.getElementById('btn-settings-close');
    dom.btnSettingsReset = document.getElementById('btn-settings-reset');
    dom.realmTransition = document.getElementById('realm-transition');
    dom.realmTransitionTitle = document.getElementById('realm-transition-title');
    dom.stampLightbox = document.getElementById('stamp-lightbox');
    dom.lightboxImg = document.getElementById('lightbox-img');
    dom.lightboxTitle = document.getElementById('lightbox-title');
    dom.lightboxLore = document.getElementById('lightbox-lore');
    dom.btnLightboxClose = document.getElementById('btn-lightbox-close');
    dom.tcSonar = document.getElementById('tc-sonar');
    dom.tcSnap = document.getElementById('tc-snap');
    dom.btnDock = document.getElementById('btn-dock');
    dom.btnMute = document.getElementById('btn-mute');
    dom.joyZone = document.getElementById('joy-zone');
    dom.joyKnob = document.getElementById('joy-knob');
    dom.controlsTip = document.getElementById('controls-tip');
    dom.bountyPill = document.getElementById('bounty-pill');
    dom.bountyText = document.getElementById('bounty-text');
    dom.bountyProg = document.getElementById('bounty-prog');
    dom.bountyReward = document.getElementById('bounty-reward');

    dom.eraBanner = document.getElementById('era-banner');
    dom.eraBannerKicker = document.getElementById('era-banner-kicker');
    dom.eraBannerTitle = document.getElementById('era-banner-title');
    dom.eraBannerSub = document.getElementById('era-banner-sub');

    dom.touchControls = document.getElementById('touch-controls');
    dom.tcLeft = document.getElementById('tc-left');
    dom.tcRight = document.getElementById('tc-right');
    dom.tcBoost = document.getElementById('tc-boost');

    dom.titleScreen = document.getElementById('title-screen');
    dom.titleRebirthBadge = document.getElementById('title-rebirth-badge');
    dom.btnPlay = document.getElementById('btn-play');
    dom.btnPlayEndless = document.getElementById('btn-play-endless');
    dom.rotateHint = document.getElementById('rotate-hint');

    dom.dockScreen = document.getElementById('dock-screen');
    dom.dockKicker = document.getElementById('dock-kicker');
    dom.dockTitle = document.getElementById('dock-title');
    dom.dockRebirthBadge = document.getElementById('dock-rebirth-badge');
    dom.dockNote = document.getElementById('dock-note');
    dom.dockBank = document.getElementById('dock-bank');
    dom.statDist = document.getElementById('stat-dist');
    dom.statStars = document.getElementById('stat-stars');
    dom.statTricks = document.getElementById('stat-tricks');
    dom.statBest = document.getElementById('stat-best');
    dom.waypointSection = document.getElementById('waypoint-section');
    dom.waypointBar = document.getElementById('waypoint-bar');
    dom.shopCoreGrid = document.getElementById('shop-core-grid');
    dom.shopEraHeading = document.getElementById('shop-era-heading');
    dom.shopEraSub = document.getElementById('shop-era-sub');
    dom.shopEraEmpty = document.getElementById('shop-era-empty');
    dom.shopEraGrid = document.getElementById('shop-era-grid');
    dom.commissionGrid = document.getElementById('commission-grid');
    dom.skinBar = document.getElementById('skin-bar');
    dom.btnRelaunch = document.getElementById('btn-relaunch');
    dom.btnDockEndless = document.getElementById('btn-dock-endless');
    dom.btnResetSave = document.getElementById('btn-reset-save');

    dom.finaleScreen = document.getElementById('finale-screen');
    dom.finDist = document.getElementById('fin-dist');
    dom.finStars = document.getElementById('fin-stars');
    dom.finTricks = document.getElementById('fin-tricks');
    dom.finVoyages = document.getElementById('fin-voyages');
    dom.btnFinaleEndless = document.getElementById('btn-finale-endless');
    dom.btnFinaleDock = document.getElementById('btn-finale-dock');

    dom.stageClearScreen = document.getElementById('stage-clear-screen');
    dom.scKicker = document.getElementById('sc-kicker');
    dom.scTitle = document.getElementById('sc-title');
    dom.scPoem = document.getElementById('sc-poem');
    dom.scMetricLabel = document.getElementById('sc-metric-label');
    dom.scTime = document.getElementById('sc-time');
    dom.scStars = document.getElementById('sc-stars');
    dom.scWalls = document.getElementById('sc-walls');
    dom.scRelicsNum = document.getElementById('sc-relics-num');
    dom.scRelicList = document.getElementById('sc-relic-list');
    dom.scUnlockNote = document.getElementById('sc-unlock-note');
    dom.btnScDockNext = document.getElementById('btn-sc-dock-next');
    dom.btnScContinue = document.getElementById('btn-sc-continue');
    dom.btnScReplay = document.getElementById('btn-sc-replay');
  }

  function updateRebirthBadges() {
    var witnessed = window.MT.Shop && window.MT.Shop.isEndlessUnlocked();
    if (dom.titleRebirthBadge) dom.titleRebirthBadge.classList.toggle('hidden', !witnessed);
    if (dom.dockRebirthBadge) dom.dockRebirthBadge.classList.toggle('hidden', !witnessed);
    if (dom.btnPlayEndless) dom.btnPlayEndless.classList.toggle('hidden', !witnessed);
    if (dom.btnDockEndless) dom.btnDockEndless.classList.toggle('hidden', !witnessed);
  }

  function loadCoachFlags() {
    coachDone = {};
    try {
      var raw = window.localStorage && window.localStorage.getItem(coachKey);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') coachDone = parsed;
      }
    } catch (e) {}
  }

  function markCoachDone(id) {
    if (!id || coachDone[id]) return;
    coachDone[id] = true;
    try {
      if (window.localStorage) window.localStorage.setItem(coachKey, JSON.stringify(coachDone));
    } catch (e) {}
  }

  function resetCoachFlags() {
    coachDone = {};
    try {
      if (window.localStorage) window.localStorage.removeItem(coachKey);
    } catch (e) {}
  }

  function showCoachTip(text, durationMs) {
    if (!dom.controlsTip) return;
    dom.controlsTip.textContent = text;
    dom.controlsTip.classList.remove('hidden', 'fade-out');
    if (tipTimer) clearTimeout(tipTimer);
    tipTimer = setTimeout(function () {
      dom.controlsTip.classList.add('fade-out');
    }, durationMs || 4200);
  }

  function updateContextualCoach(dt, boat, eras) {
    if (window.MT.Config && window.MT.Config.EXPLORE_MODE) return;
    if (coachCooldown > 0) {
      coachCooldown -= dt;
      return;
    }
    if (eras.isFinaleActive && eras.isFinaleActive()) return;

    if (boat.hasCarved) markCoachDone('carve');
    if (boat.hasDived && (boat.runBreaches || 0) > 0) markCoachDone('dive');
    if (boat.runFlips > 0) markCoachDone('flip');
    if (boat.hasBoosted) markCoachDone('boost');
    if (boat.grindingRail || boat.runWhalesBounced > 0) markCoachDone('feature');

    var t = eras.getTime();
    var slope = eras.getSurfaceSlope(boat.x, t);
    var curEraC = eras.getCurrentEra(boat.x);

    // 第 1 关核心招牌教学：长按 D 潜入深海蓄力、松开破水冲天！
    // 第 2 关核心招牌教学：踩沉浮玄武岩浮板连跳避开岩浆，趁浮板沉没前跃起！
    if (!coachDone.basalt && curEraC && curEraC.id === 'fire_sea' && boat.x > 13960) {
      markCoachDone('basalt');
      coachCooldown = 5.4;
      showCoachTip(
        touchMode ? '跃上沉浮玄武岩浮板避开岩浆！浮板会下沉，趁沉没前按「火」连跳！' : '跃上沉浮玄武岩浮板避开岩浆！浮板会下沉，趁沉没前按 空格 / A 连跳！',
        5400
      );
      return;
    }

    if (!coachDone.dive && curEraC && curEraC.id === 'moon_sea' && boat.inWater && !boat.isDiving && boat.distanceM > 12) {
      markCoachDone('dive');
      coachCooldown = 5.4;
      showCoachTip(
        touchMode ? '长按 ↻ 潜入深海吃星流并蓄满浮力，松开瞬间破水冲天！' : '长按 D 潜入深海吃星流并蓄满浮力，松开瞬间破水冲天！',
        5200
      );
      return;
    }

    if (!coachDone.flip && !boat.inWater && boat.airTime > 0.22 && boat.airTime < 0.75) {
      markCoachDone('flip');
      coachCooldown = 5.0;
      showCoachTip(
        touchMode ? '空中按住 ↺ / ↻ 空翻，完美落地立刻回满燃料！' : '空中按住 A / D 空翻，顺坡落地回满燃料并加速！',
        4600
      );
      return;
    }

    if (!coachDone.carve && boat.inWater && slope > 0.14 && boat.distanceM > 8) {
      markCoachDone('carve');
      coachCooldown = 5.0;
      showCoachTip(
        touchMode ? '下坡按住 ↻ 压船贴面吃速！' : '下坡按住 D 压船贴面，吃满重力加速！',
        4200
      );
      return;
    }

    if (!coachDone.boost && boat.inWater && slope < -0.13 && boat.distanceM > 14) {
      markCoachDone('boost');
      coachCooldown = 5.0;
      showCoachTip(
        touchMode ? '冲上浪峰按住「火」点火跃浪腾空！' : '冲上浪峰按住 空格 / W 喷火跃浪腾空！',
        4200
      );
      return;
    }

    if (!coachDone.feature) {
      var rails = eras.getGrindRails ? eras.getGrindRails() : [];
      var whales = eras.getWhales ? eras.getWhales() : [];
      var hasRailAhead = rails.some(function (r) { return r.x0 > boat.x + 80 && r.x0 < boat.x + 560; });
      var hasWhaleAhead = whales.some(function (w) { return w.x > boat.x + 80 && w.x < boat.x + 560; });
      if (hasRailAhead) {
        markCoachDone('feature');
        coachCooldown = 5.0;
        showCoachTip('跃上前方架空滑轨：无阻飙速回气并续连技！', 4600);
      } else if (hasWhaleAhead) {
        markCoachDone('feature');
        coachCooldown = 5.0;
        showCoachTip('跃落前方发光鲸背，借力二次冲天！', 4600);
      }
    }
  }

  function pickNextBounty(boat, eraId) {
    var pool = [
      { id: 'flips',  text: '完成 2 次完美空翻',      target: 2,   reward: 40, base: boat.runFlips,       get: function (b) { return b.runFlips; } },
      { id: 'smooth', text: '顺坡切入着陆 3 次',      target: 3,   reward: 35, base: boat.runSmoothLands, get: function (b) { return b.runSmoothLands; } },
      { id: 'fever',  text: '连技 ×3 触发流光狂热',    target: 1,   reward: 50, base: boat.runFevers,      get: function (b) { return b.runFevers; } },
      { id: 'stars',  text: '沿途掠拾 45 颗星火',     target: 45,  reward: 40, base: boat.runStars,       get: function (b) { return b.runStars; } },
      { id: 'dist',   text: '单趟再向前推进 220 m',   target: 220, reward: 45, base: boat.distanceM,      get: function (b) { return b.distanceM; } }
    ];
    if (eraId === 'moon_sea') {
      if (boat.inAbyss) {
        pool.push({ id: 'school', text: '跟随银光沙丁鱼群顺流 2 次', target: 2, reward: 45, base: boat.runSchoolsPassed || 0, get: function (b) { return b.runSchoolsPassed || 0; } });
        pool.push({ id: 'manta',  text: '贴近月影蝠鲼尾流滑翔 1 次', target: 1, reward: 50, base: boat.runMantaGlides || 0, get: function (b) { return b.runMantaGlides || 0; } });
        pool.push({ id: 'angler', text: '鱼鳍冲刺震退深渊提灯鱼',   target: 1, reward: 60, base: boat.runAnglersBanished || 0, get: function (b) { return b.runAnglersBanished || 0; } });
      } else {
        pool.push({ id: 'breach', text: '潜海蓄力并破水冲天 2 次', target: 2, reward: 45, base: boat.runBreaches || 0, get: function (b) { return b.runBreaches || 0; } });
        pool.push({ id: 'smash',  text: '破水或疾驰撞碎海面浮障 2 次', target: 2, reward: 50, base: boat.runDebrisSmashed || 0, get: function (b) { return b.runDebrisSmashed || 0; } });
        pool.push({ id: 'cloud',  text: '飞入高空云带穿越星环 2 次', target: 2, reward: 55, base: boat.runCloudRings || 0, get: function (b) { return b.runCloudRings || 0; } });
        pool.push({ id: 'bell',   text: '破水跃高敲响沉海钟楼',   target: 1, reward: 50, base: boat.runBellsRung || 0, get: function (b) { return b.runBellsRung || 0; } });
        pool.push({ id: 'whale',  text: '借月下蓝鲸群飞升 2 次',   target: 2, reward: 45, base: boat.runWhalesBounced, get: function (b) { return b.runWhalesBounced; } });
      }
    }
    if (eraId === 'fire_sea') {
      pool.push({ id: 'basalt',  text: '踏沉浮玄武岩浮板连跳 3 次', target: 3, reward: 50, base: boat.runBasaltHops || 0, get: function (b) { return b.runBasaltHops || 0; } });
      pool.push({ id: 'geyser',  text: '乘间歇熔岩热柱升空 2 次',   target: 2, reward: 50, base: boat.runGeysersRidden || 0, get: function (b) { return b.runGeysersRidden || 0; } });
      pool.push({ id: 'brazier', text: '跃起电亮月陨弹坑熔炉火盆', target: 1, reward: 60, base: boat.runBraziersLit || 0, get: function (b) { return b.runBraziersLit || 0; } });
    }
    if (eraId === 'ice_winter' || eraId === 'thawed_wasteland' || eraId === 'giant_forest') {
      pool.push({ id: 'grind', text: '架空滑轨累计飙行 60 m', target: 60, reward: 55, base: Math.floor(boat.grindDistM), get: function (b) { return Math.floor(boat.grindDistM); } });
    }
    if (eraId === 'giant_forest') {
      pool.push({ id: 'vine', text: '劈开 2 道荆棘巨藤', target: 2, reward: 65, base: boat.runVinesSliced, get: function (b) { return b.runVinesSliced; } });
    }
    var prevId = activeBounty ? activeBounty.id : null;
    var filtered = pool.filter(function (item) { return item.id !== prevId; });
    var chosen = filtered[Math.floor(Math.random() * filtered.length)] || pool[0];
    activeBounty = chosen;
    renderBountyPill(boat);
  }

  function renderBountyPill(boat) {
    if (!dom.bountyPill || !activeBounty) return;
    var inFinale = window.MT.Eras && window.MT.Eras.isFinaleActive && window.MT.Eras.isFinaleActive();
    if (!running || docked || inFinale) {
      dom.bountyPill.classList.add('hidden');
      return;
    }
    var cur = Math.max(0, activeBounty.get(boat) - activeBounty.base);
    dom.bountyPill.classList.remove('hidden');
    dom.bountyText.textContent = activeBounty.text;
    dom.bountyProg.textContent = Math.min(activeBounty.target, cur) + '/' + activeBounty.target;
    dom.bountyReward.textContent = '+' + activeBounty.reward + '✦';
  }

  function updateBounty(boat, eras) {
    if (!activeBounty || (eras.isFinaleActive && eras.isFinaleActive())) return;
    var cur = Math.max(0, activeBounty.get(boat) - activeBounty.base);
    if (cur >= activeBounty.target) {
      completedBounties += 1;
      var rw = activeBounty.reward;
      boat.runStars += rw;
      window.MT.Audio.playBountyComplete();
      eras.emitRing(boat.x, boat.y - 16, '#ffe89c');
      eras.addPopup(boat.x, boat.y - 68, '✦ 委托达成！+' + rw + '✦', '#fff2b4');
      if (dom.bountyPill) {
        dom.bountyPill.classList.add('done');
        if (bountyFlashTimer) clearTimeout(bountyFlashTimer);
        bountyFlashTimer = setTimeout(function () {
          if (dom.bountyPill) dom.bountyPill.classList.remove('done');
        }, 700);
      }
      var era = eras.getCurrentEra(boat.x);
      pickNextBounty(boat, era ? era.id : 'moon_sea');
    } else {
      renderBountyPill(boat);
    }
  }

  function handlePause(shouldPause) {
    paused = !!shouldPause;
    if (paused) {
      input.left = false;
      input.right = false;
      input.boost = false;
      if (dom.tcLeft) dom.tcLeft.classList.remove('pressed');
      if (dom.tcRight) dom.tcRight.classList.remove('pressed');
      if (dom.tcBoost) dom.tcBoost.classList.remove('pressed');
      window.MT.Audio.suspend();
    } else {
      lastTime = 0;
      window.MT.Audio.resume();
    }
  }

  function setTouchMode(flag) {
    touchMode = !!flag;
    if (running && !docked && touchMode) {
      dom.touchControls.classList.remove('hidden');
    } else {
      dom.touchControls.classList.add('hidden');
    }
  }

  function showEraBanner(kicker, title, sub, durationMs) {
    dom.eraBannerKicker.textContent = kicker;
    dom.eraBannerTitle.textContent = title;
    dom.eraBannerSub.textContent = sub;
    dom.eraBanner.classList.remove('hidden');
    requestAnimationFrame(function () { dom.eraBanner.classList.add('show'); });
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () { dom.eraBanner.classList.remove('show'); }, durationMs || 4600);
  }

  function renderWaypoints() {
    var shop = window.MT.Shop;
    var singleSea = window.MT.Config.SINGLE_SCENE_MODE === 'moon_sea';
    var eras = window.MT.Config.ERAS || [];
    var selected = shop.getSelectedStartEra();
    var unlockedCount = shop.getUnlockedEraCount();
    dom.waypointBar.innerHTML = '';

    // v13 开放双海域模式：解锁《霜穹冰海》后展示跨海切航栏，随时在月潮之海与霜穹冰海间自由切换！
    if (window.MT.Config && window.MT.Config.EXPLORE_MODE) {
      dom.btnRelaunch.textContent = '继续探索';
      var frostReady = window.MT.Shop && window.MT.Shop.isFrostUnlocked && window.MT.Shop.isFrostUnlocked();
      if (!frostReady) {
        dom.waypointSection.classList.add('hidden');
        return;
      }
      dom.waypointSection.classList.remove('hidden');
      dom.waypointBar.innerHTML = '';
      var curRealm = (window.MT.Eras && window.MT.Eras.getActiveRealm) ? window.MT.Eras.getActiveRealm() : 'moon_sea';
      [
        { id: 'moon_sea', label: '第一海域 · 月潮之海', spawnX: 520 },
        { id: 'frost_sea', label: '第二海域 · 霜穹冰海', spawnX: 540 }
      ].forEach(function (rm) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'waypoint-btn' + (curRealm === rm.id ? ' active' : '');
        b.textContent = rm.label;
        b.addEventListener('click', function () {
          if (curRealm !== rm.id) {
            resumeExploreFromDock();
            switchRealm(rm.id, rm.spawnX);
          }
        });
        dom.waypointBar.appendChild(b);
      });
      return;
    }

    if (singleSea) {
      dom.waypointSection.classList.remove('hidden');
      var curSeaMode = shop.getSelectedSeaStart ? shop.getSelectedSeaStart() : 'surface';
      var seaRoutes = [
        { id: 'surface', label: '✦ 第一幕 · 暮光浅海启航' },
        { id: 'abyss',   label: '◈ 第四幕 · 落月撞击深潜' }
      ];
      seaRoutes.forEach(function (rt) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'wp-btn' + (curSeaMode === rt.id ? ' selected' : '');
        btn.textContent = rt.label;
        btn.addEventListener('click', function () {
          if (shop.setSelectedSeaStart) shop.setSelectedSeaStart(rt.id);
          window.MT.Audio.playHookCatch();
          renderWaypoints();
        });
        dom.waypointBar.appendChild(btn);
      });
      dom.btnRelaunch.textContent = curSeaMode === 'abyss' ? '直入落月撞击 · 深海避难' : '再次启航';
      return;
    }

    if (unlockedCount <= 1) {
      dom.waypointSection.classList.add('hidden');
      dom.btnRelaunch.textContent = '再次启航';
      return;
    }

    dom.waypointSection.classList.remove('hidden');
    eras.forEach(function (era) {
      if (!shop.isEraUnlocked(era.id)) return;
      var cleared = shop.isStageCleared && shop.isStageCleared(era.id);
      var rStat = window.MT.LevelEngine && window.MT.LevelEngine.getRelicStatus ? window.MT.LevelEngine.getRelicStatus(era.id) : null;
      var relicTag = (rStat && rStat.total > 0 && (cleared || rStat.collected > 0)) ? (' ' + rStat.collected + '/' + rStat.total) : '';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wp-btn' + (selected.id === era.id ? ' selected' : '') + (cleared ? ' cleared' : '');
      btn.textContent = (cleared ? '★ ' : '✦ ') + era.shortName + relicTag;
      btn.addEventListener('click', function () {
        if (shop.selectStartEra(era.id)) {
          window.MT.Audio.playHookCatch();
          renderWaypoints();
          dom.btnRelaunch.textContent = '从「' + era.shortName + '」出发';
        }
      });
      dom.waypointBar.appendChild(btn);
    });

    if (unlockedCount < eras.length) {
      var fogBtn = document.createElement('button');
      fogBtn.type = 'button';
      fogBtn.className = 'wp-btn mystery';
      fogBtn.disabled = true;
      fogBtn.textContent = '？ 未知彼端';
      dom.waypointBar.appendChild(fogBtn);
    }

    dom.btnRelaunch.textContent = '从「' + selected.shortName + '」出发';
  }

  function buildShopCard(item, justBoughtId) {
    var shop = window.MT.Shop;
    var lv = shop.getLevel(item.id);
    var cost = shop.getNextCost(item.id);
    var maxed = cost === null;
    var affordable = shop.canBuy(item.id);
    var desc = maxed ? item.descs[item.maxLevel - 1] : item.descs[lv];
    var cat = item.category || 'era';
    var isEra = cat === 'era';
    var isOcean = cat === 'ocean';
    var isFresh = isEra && shop.isBlueprintFresh(item.id);
    var recommended = item.eraReq && shop.isEraUnlocked(item.eraReq) && lv === 0;

    var card = document.createElement('div');
    card.className = 'shop-item'
      + (isFresh ? ' fresh-bp' : (recommended ? ' recommended' : ''))
      + (isOcean && lv >= 1 ? ' ocean-active' : (isEra && lv >= 1 ? ' active-mod' : ''))
      + (justBoughtId === item.id ? ' bought' : '');

    var pipsHtml = '';
    for (var i = 0; i < item.maxLevel; i++) {
      pipsHtml += '<i class="' + (i < lv ? 'filled' : '') + '"></i>';
    }

    var tagClass = isOcean ? 'shop-tag ocean-tag' : (isEra ? 'shop-tag era-tag' : 'shop-tag core-tag');
    var freshHtml = isFresh ? '<span class="fresh-pill">新图纸</span>' : '';
    card.innerHTML =
      '<div class="shop-item-top">' +
        '<div><span class="shop-name">' + item.name + '</span> <span class="' + tagClass + '">' + item.tag + '</span>' + freshHtml + '</div>' +
        '<span class="shop-pips">' + pipsHtml + '</span>' +
      '</div>' +
      '<div class="shop-desc">' + desc + '</div>' +
      '<button type="button" class="shop-buy-btn' + (maxed ? ' maxed' : '') + '"' +
        (maxed || !affordable ? ' disabled' : '') + '>' +
        (maxed ? '已满级 Lv.' + item.maxLevel : ('升级至 Lv.' + (lv + 1) + ' · ' + cost + ' ✦')) +
      '</button>';

    var btn = card.querySelector('.shop-buy-btn');
    btn.addEventListener('click', function () {
      if (shop.buy(item.id)) {
        window.MT.Physics.refreshStats();
        if (item.id === 'tide_sonar' && window.MT.Audio.playSonarPing) {
          window.MT.Audio.playSonarPing();
        } else {
          window.MT.Audio.playMountChord(item.id === 'rocket' || item.id === 'deep_fins' ? 'thruster' : (item.id === 'glider' || item.id === 'sky_sail' ? 'balloon' : 'lantern'), true);
        }
        renderShopGrid(item.id);
      }
    });
    return card;
  }

  function renderShopGrid(justBoughtId) {
    var shop = window.MT.Shop;
    var items = window.MT.Config.SHOP_ITEMS || [];

    dom.dockBank.textContent = String(shop.getBank());
    dom.starCount.textContent = String(shop.getBank());
    dom.shopCoreGrid.innerHTML = '';
    dom.shopEraGrid.innerHTML = '';

    var singleSea = window.MT.Config.SINGLE_SCENE_MODE === 'moon_sea';
    if (dom.shopEraHeading) {
      dom.shopEraHeading.textContent = singleSea ? '二 · 月潮海洋流派改装' : '二 · 生态改装图纸';
    }
    if (dom.shopEraSub) {
      dom.shopEraSub.textContent = singleSea
        ? '深潜鱼鳍 / 高空风帆 / 潮汐声呐 · 自由搭配改变手感与外观'
        : '随远航见闻逐步构思 · 进入对应地貌自动展开';
    }
    dom.shopEraGrid.classList.toggle('shop-grid-ocean', singleSea);
    dom.shopEraGrid.classList.toggle('shop-grid-era', !singleSea);

    var visibleEraCount = 0;
    items.forEach(function (item) {
      var cat = item.category || 'era';
      if (cat === 'core') {
        dom.shopCoreGrid.appendChild(buildShopCard(item, justBoughtId));
      } else if (singleSea && cat === 'ocean') {
        visibleEraCount++;
        dom.shopEraGrid.appendChild(buildShopCard(item, justBoughtId));
      } else if (!singleSea && cat === 'era' && shop.isBlueprintUnlocked(item.id)) {
        visibleEraCount++;
        dom.shopEraGrid.appendChild(buildShopCard(item, justBoughtId));
      }
    });

    if (dom.shopEraEmpty) {
      dom.shopEraEmpty.classList.toggle('hidden', visibleEraCount > 0);
    }
    dom.shopEraGrid.classList.toggle('hidden', visibleEraCount === 0);
  }

  function openDock(reason) {
    if (docked) return;
    docked = true;
    input.left = false;
    input.right = false;
    input.up = false;
    input.down = false;
    input.boost = false;
    input.joyX = 0;
    input.joyY = 0;
    window.MT.Audio.setBoosting(false, 0);
    window.MT.Audio.setGrinding(false, null, 0);
    if (window.MT.Audio.setUnderwater) window.MT.Audio.setUnderwater(0);

    var boat = window.MT.Physics.getBoat();
    var shop = window.MT.Shop;
    var wasEndless = window.MT.Eras.isEndlessMode && window.MT.Eras.isEndlessMode();
    if (reason !== 'from_finale') {
      shop.depositRun(boat.runStars, boat.distanceM, boat.reachedEras, wasEndless);
      if (window.MT.Config && window.MT.Config.EXPLORE_MODE) {
        boat.runStars = 0;
        boat.hull = boat.maxHull;
        boat.fuel = window.MT.Config.SURF.MAX_FUEL;
        boat.breath = 1.0;
        if (reason === 'hull_broken') {
          var homeX2 = (window.MT.Config.WORLD_CYCLE && window.MT.Config.WORLD_CYCLE.HOME_X) || 520;
          boat.x = homeX2;
          boat.y = window.MT.Eras.getSurfaceY(homeX2, window.MT.Eras.getTime());
          boat.vx = 0; boat.vy = 0;
          boat.isDiving = false; boat.inAbyss = false;
          window.MT.RenderWorld.snapCameraTo(boat.x, boat.y);
        }
      }
    }
    updateRebirthBadges();

    if (reason === 'heat_broken') {
      dom.dockKicker.textContent = '火海高温烤毁船底 · 自动返港';
      dom.dockTitle.textContent = '为木舟焊上隔热底壳';
      dom.dockNote.textContent = '购买「黑曜石隔热底壳」即可抵御火海灼烤，还能把熔岩热柱化作升空跳台。';
    } else if (reason === 'cold_broken') {
      dom.dockKicker.textContent = '尘冬极寒冻损船体 · 自动返港';
      dom.dockTitle.textContent = '给木舟裹上厚棉被！';
      dom.dockNote.textContent = '大火熄灭后迎来尘冬冰原！买床「补丁厚棉被 & 暖炉」就能抵御严寒并在冰川疾驰。';
    } else if (reason === 'rough_broken') {
      dom.dockKicker.textContent = '荒土剧烈颠簸散架 · 自动返港';
      dom.dockTitle.textContent = '为船底焊上黄铜弹簧滑橇';
      dom.dockNote.textContent = '融冰后的陨石荒土坑洼剧烈！装上「黄铜弹簧抗震滑橇」可减震并把颠簸化作高弹回跃。';
    } else if (reason === 'vine_broken') {
      dom.dockKicker.textContent = '林海荆棘巨藤缠损 · 自动返港';
      dom.dockTitle.textContent = '锻造破藤鎏金船首！';
      dom.dockNote.textContent = '巨木林海垂落着坚韧荆棘藤帘！锻造「破藤鎏金船首」即可一往无前劈藤加速并爆出星火。';
    } else if (reason === 'harbor') {
      dom.dockKicker.textContent = '暮光灯塔港 · 泊船整备';
      dom.dockTitle.textContent = '已系缆于灯塔港';
      dom.dockNote.textContent = '木舟已修补如新、燃料与气息回满。改装完毕后点击「继续探索」，将原地解缆无缝回到此刻的海面。';
    } else if (reason === 'hull_broken') {
      dom.dockKicker.textContent = window.MT.Config.EXPLORE_MODE ? '船体受损 · 拖航归港' : '船体耐久耗尽 · 自动返港';
      dom.dockTitle.textContent = window.MT.Config.EXPLORE_MODE ? '已护航回暮光灯塔港' : '暮光船坞 · 整备改装';
      dom.dockNote.textContent = window.MT.Config.EXPLORE_MODE
        ? '已为你修补木舟并保留当前天象与全部探索进度，整备后即可再次启航。'
        : '加固船体或升级推进/滑翔装备，也可选择下方已解锁的纪元驿站直达出发。';
    } else {
      dom.dockKicker.textContent = '暮光船坞 · 整备工坊';
      dom.dockTitle.textContent = '暂泊暮光船坞';
      dom.dockNote.textContent = window.MT.Config.SINGLE_SCENE_MODE === 'moon_sea'
        ? '自由搭配「深潜鱼鳍」「高空风帆」与「潮汐声呐」三大海洋流派，探索四幕海域并收集全部沉海遗物。'
        : (shop.getUnlockedBlueprintCount() > 0
          ? '每件生态改装件都会在对应地貌自动展开，在水面则自动收纳，保持木舟轻盈清爽。'
          : '先用沿途拾得的星火强化推进、船体与拾光星环，继续驶向海平线彼端探索未知。');
    }

    var dockSum = document.querySelector('.dock-summary');
    if (window.MT.Config && window.MT.Config.EXPLORE_MODE) {
      if (dockSum) {
        var cpD = shop.getCodexProgress ? shop.getCodexProgress() : { found: 0, total: 26, relicsFound: 0, relicsTotal: 9 };
        var curR2 = (window.MT.Eras && window.MT.Eras.getActiveRealm) ? window.MT.Eras.getActiveRealm() : 'moon_sea';
        var shN = curR2 === 'frost_sea'
          ? ((window.MT.IceShrines && window.MT.IceShrines.getAwakenedCount) ? window.MT.IceShrines.getAwakenedCount() : (shop.getFrostShrineCount ? shop.getFrostShrineCount() : 0))
          : ((window.MT.Shrines && window.MT.Shrines.getAwakenedCount) ? window.MT.Shrines.getAwakenedCount() : (shop.getShrineCount ? shop.getShrineCount() : 0));
        dockSum.innerHTML =
          '<span>' + (curR2 === 'frost_sea' ? '冰海古碑' : '月潮古碑') + ' <strong>' + shN + ' / 3</strong></span>' +
          '<span>博物手记 <strong>' + cpD.found + ' / ' + cpD.total + '</strong></span>' +
          '<span>沉海遗物 <strong>' + cpD.relicsFound + ' / ' + cpD.relicsTotal + '</strong></span>' +
          '<span>潮汐怀表 <strong>' + (shop.isTimeWatchUnlocked && shop.isTimeWatchUnlocked() ? '已获赠' : '未解锁') + '</strong></span>';
      }
    } else {
      dom.statDist.textContent = boat.distanceM + ' m';
      dom.statStars.textContent = '+' + boat.runStars + ' ✦';
      dom.statTricks.textContent = String(boat.runTricks);
      dom.statBest.textContent = wasEndless
        ? ('无尽 ' + shop.getBestEndlessDist() + ' m')
        : (shop.getBestDist() + ' m');
    }

    if (dom.btnResetSave) {
      dom.btnResetSave.classList.remove('arming');
      dom.btnResetSave.textContent = '重置航图';
    }
    renderWaypoints();
    renderShopGrid(null);
    renderCommissionsAndSkins();
    dom.touchControls.classList.add('hidden');
    if (dom.bountyPill) dom.bountyPill.classList.add('hidden');
    if (dom.climaxBarWrap) dom.climaxBarWrap.classList.add('hidden');
    if (dom.stageClearScreen) dom.stageClearScreen.classList.add('hidden');
    dom.finaleScreen.classList.add('hidden');
    dom.dockScreen.classList.remove('hidden');
  }

  function formatStageTime(sec) {
    var s = Math.max(0, Number(sec) || 0);
    var mins = Math.floor(s / 60);
    var rem = s - mins * 60;
    var secStr = rem < 10 ? ('0' + rem.toFixed(1)) : rem.toFixed(1);
    return (mins < 10 ? ('0' + mins) : String(mins)) + ':' + secStr;
  }

  function openStageClearCard(summary) {
    if (docked) return;
    docked = true;
    input.left = false;
    input.right = false;
    input.up = false;
    input.down = false;
    input.boost = false;
    input.joyX = 0;
    input.joyY = 0;
    window.MT.Audio.setBoosting(false, 0);
    window.MT.Audio.setIceScrape(0, false);
    window.MT.Audio.setGrinding(false, null, 0);
    if (window.MT.Audio.setUnderwater) window.MT.Audio.setUnderwater(0);
    if (window.MT.Audio.setClimaxTension) window.MT.Audio.setClimaxTension(0);

    activeStageClear = summary || { eraId: 'moon_sea', eraName: '月潮之海', nextEraId: 'fire_sea', nextEraName: '陨落火海', nextBlueprintName: '黑曜石隔热壳' };
    var boat = window.MT.Physics.getBoat();
    var shop = window.MT.Shop;
    var curEraId = activeStageClear.eraId || 'moon_sea';
    var curEraName = activeStageClear.eraName || '月潮之海';
    var nextEraId = activeStageClear.nextEraId || 'fire_sea';
    var nextEraName = activeStageClear.nextEraName || '陨落火海';
    var nextBpName = activeStageClear.nextBlueprintName || '黑曜石隔热壳';

    var isSingleClear = !!activeStageClear.singleSceneClear;
    var newlyUnlockedNext = isSingleClear ? shop.markRebirthWitnessed() : shop.unlockEra(nextEraId);
    var clearRec = shop.recordStageClear(curEraId, activeStageClear.timeSec || 0);
    shop.depositRun(boat.runStars, boat.distanceM, boat.reachedEras, false);
    updateRebirthBadges();

    if (dom.scKicker && activeStageClear.kicker) dom.scKicker.textContent = activeStageClear.kicker;
    if (dom.scTitle && activeStageClear.stageTitle) dom.scTitle.textContent = activeStageClear.stageTitle;
    if (dom.scPoem && activeStageClear.stagePoem) dom.scPoem.innerHTML = activeStageClear.stagePoem;
    if (dom.scMetricLabel && activeStageClear.clearStatLabel) dom.scMetricLabel.textContent = activeStageClear.clearStatLabel;

    dom.scTime.textContent = formatStageTime(activeStageClear.timeSec || 0) + (clearRec.isBest ? ' ✦新纪录' : '');
    dom.scStars.textContent = '+' + boat.runStars + ' ✦';
    dom.scWalls.textContent = activeStageClear.clearStatValue || (String(activeStageClear.wallsCleared || 0) + ' 道');

    var rList = activeStageClear.relics || [];
    var ownedCount = 0;
    dom.scRelicList.innerHTML = '';
    rList.forEach(function (r) {
      if (r.owned) ownedCount++;
      var chip = document.createElement('span');
      chip.className = 'sc-relic-chip' + (r.owned ? ' owned' : '');
      chip.textContent = r.owned ? ('◈ ' + r.name) : ('◇ ？？？ · ' + r.hint);
      dom.scRelicList.appendChild(chip);
    });
    dom.scRelicsNum.textContent = ownedCount + '/' + Math.max(3, rList.length);

    if (dom.scUnlockNote) {
      if (isSingleClear) {
        dom.scUnlockNote.textContent = '✦ 已永久解锁「无尽月潮漫游」：四幕海洋天象昼夜循环，自在御风飙分！';
      } else {
        dom.scUnlockNote.textContent = newlyUnlockedNext
          ? ('✦ 已探明新地貌「' + nextEraName + '」· 船坞构思「' + nextBpName + '」图纸')
          : ('✦ 可回港整备后从「' + nextEraName + '」启航，或直接续航冲入下一关');
      }
    }
    if (dom.btnScDockNext) dom.btnScDockNext.textContent = isSingleClear ? '返回暮光船坞整备' : ('回港整备 · 启航' + nextEraName);
    if (dom.btnScContinue) dom.btnScContinue.textContent = isSingleClear ? '启程 · 无尽月潮漫游' : ('直接冲进' + nextEraName);
    if (dom.btnScReplay) dom.btnScReplay.textContent = '重游' + curEraName;

    dom.touchControls.classList.add('hidden');
    if (dom.bountyPill) dom.bountyPill.classList.add('hidden');
    if (dom.climaxBarWrap) dom.climaxBarWrap.classList.add('hidden');
    dom.hudTop.classList.add('hidden');
    dom.stageClearScreen.classList.remove('hidden');
  }

  function resumeExploreFromDock() {
    var boat = window.MT.Physics.getBoat();
    window.MT.Physics.refreshStats();
    boat.hull = boat.maxHull;
    boat.fuel = window.MT.Config.SURF.MAX_FUEL;
    boat.breath = 1.0;
    boat.vx = 0;
    boat.vy = 0;
    var curR = (window.MT.Eras && window.MT.Eras.getActiveRealm) ? window.MT.Eras.getActiveRealm() : 'moon_sea';
    var pCur = window.MT.LevelEngine && window.MT.LevelEngine.getPlugin(curR);
    if (pCur && typeof pCur.resetHarborCooldown === 'function') pCur.resetHarborCooldown();

    docked = false;
    input.left = false; input.right = false; input.up = false; input.down = false; input.boost = false;
    input.joyX = 0; input.joyY = 0;
    dom.dockScreen.classList.add('hidden');
    dom.hudTop.classList.remove('hidden');
    setTouchMode(touchMode);
    window.MT.Audio.playHookCatch();
    updateHUD();
  }

  function getCodexSvg(icon, found) {
    var col = found ? '#ffe8a4' : 'rgba(182, 198, 222, 0.32)';
    var col2 = found ? '#9ef2ff' : 'rgba(156, 174, 202, 0.24)';
    var map = {
      watch:   '<circle cx="12" cy="13" r="7" fill="none" stroke="' + col + '" stroke-width="1.6"/><path d="M9 3h6M12 3v3M12 13V9M12 13l3 2" stroke="' + col + '" stroke-width="1.5" stroke-linecap="round"/>',
      flute:   '<path d="M4 18L19 6" stroke="' + col + '" stroke-width="2.4" stroke-linecap="round"/><circle cx="9" cy="14" r="1.2" fill="' + col2 + '"/><circle cx="13" cy="11" r="1.2" fill="' + col2 + '"/><circle cx="16" cy="8.5" r="1.2" fill="' + col2 + '"/>',
      lantern: '<path d="M9 5h6M12 3v2M8 8h8l1 8H7l1-8zM9 19h6" fill="none" stroke="' + col + '" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.2" fill="' + col + '"/>',
      crystal: '<path d="M12 3l4.5 7-4.5 11-4.5-11L12 3z" fill="none" stroke="' + col2 + '" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 3v18" stroke="' + col + '" stroke-width="1.1"/>',
      bell:    '<path d="M12 4v2M7 16c0-4 1.8-8 5-8s5 4 5 8H7zM10.5 18.5a1.5 1.5 0 003 0" fill="none" stroke="' + col + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      sardine: '<path d="M5 10c4-3 8-3 12 0-4 3-8 3-12 0zm12 0l3-2v4l-3-2zM3 16c3-2 6-2 9 0-3 2-6 2-9 0zm9 0l2.5-1.5v3L12 16z" fill="' + col2 + '"/>',
      manta:   '<path d="M12 5c2.5 4 6 6.5 9 7-4 1-6.5 2.5-9 6-2.5-3.5-5-5-9-6 3-.5 6.5-3 9-7zM12 17v4" fill="none" stroke="' + col2 + '" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>',
      jelly:   '<path d="M6 12a6 6 0 0112 0H6z" fill="none" stroke="' + col2 + '" stroke-width="1.6"/><path d="M8 12v7M11 12v8M14 12v7M16.5 12v6" stroke="' + col + '" stroke-width="1.2" stroke-linecap="round"/>',
      angler:  '<ellipse cx="13" cy="14" rx="6" ry="5" fill="none" stroke="' + col2 + '" stroke-width="1.5"/><path d="M19 14l3-3v6l-3-3zM12 9C10 5 6 5 5 9" fill="none" stroke="' + col2 + '" stroke-width="1.4" stroke-linecap="round"/><circle cx="5" cy="10" r="1.8" fill="' + col + '"/>',
      kelp:    '<path d="M9 20c-1-5 2-9 0-15M15 20c1-5-2-9 0-14" fill="none" stroke="' + col2 + '" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="10" r="1.6" fill="' + col + '"/><circle cx="16" cy="9" r="1.6" fill="' + col + '"/>',
      whale:       '<path d="M4 14c1-5 5-7 10-6 2.5.5 4 2.5 5 4l2-3v6l-2-2c-2 2.5-5 3.5-9 3.5-3.5 0-5.5-1-6-2.5z" fill="none" stroke="' + col2 + '" stroke-width="1.6" stroke-linejoin="round"/><circle cx="8" cy="12" r="1" fill="' + col + '"/>',
      wonder_boil: '<path d="M3 10q4.5-3 9 0t9 0" fill="none" stroke="' + col + '" stroke-width="1.6"/><circle cx="12" cy="15" r="3.4" fill="none" stroke="' + col + '" stroke-width="1.5"/><path d="M12 12v6M9.5 14l5 2" stroke="' + col2 + '" stroke-width="1.1"/>',
      wonder_ash:  '<path d="M4 11h16M6 15h12M9 19h6" stroke="' + col2 + '" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="7" r="2.6" fill="none" stroke="' + col + '" stroke-width="1.4"/>',
      wonder_dawn:   '<path d="M3 16h18" stroke="' + col2 + '" stroke-width="1.5" stroke-linecap="round"/><path d="M7 16a5 5 0 0110 0" fill="none" stroke="' + col + '" stroke-width="1.6"/><path d="M12 6v3M6.5 9.5l2 2M17.5 9.5l-2 2" stroke="' + col + '" stroke-width="1.4" stroke-linecap="round"/>',
      wonder_harbor:          '<path d="M9 19l1-10h4l1 10M8 19h8M10 9V6h4v3" fill="none" stroke="' + col + '" stroke-width="1.5" stroke-linejoin="round"/><path d="M4 8l5-1M20 8l-5-1M5 5l4 1M19 5l-4 1" stroke="' + col2 + '" stroke-width="1.3" stroke-linecap="round"/>',
      ice_compass:            '<circle cx="12" cy="12" r="7.5" fill="none" stroke="' + col + '" stroke-width="1.5"/><path d="M12 6l2.2 6-2.2 6-2.2-6L12 6z" fill="none" stroke="' + col2 + '" stroke-width="1.4"/>',
      ice_tusk:               '<path d="M5 17L19 6" stroke="' + col2 + '" stroke-width="2.4" stroke-linecap="round"/><path d="M8 14.5l2 1.2M12 11.5l2 1.2M15.5 8.8l1.6 1" stroke="' + col + '" stroke-width="1.2"/>',
      ice_prism:              '<path d="M12 3l6 9-6 9-6-9 6-9z" fill="none" stroke="' + col2 + '" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 10l6 2M21 14l-6-2" stroke="' + col + '" stroke-width="1.3" stroke-linecap="round"/>',
      ice_lantern:            '<path d="M9 5h6M8 8h8l1 8H7l1-8zM9 19h6" fill="none" stroke="' + col2 + '" stroke-width="1.5"/><circle cx="12" cy="12" r="2.2" fill="' + col + '"/>',
      sea_angel:              '<ellipse cx="12" cy="12" rx="3" ry="6.5" fill="none" stroke="' + col2 + '" stroke-width="1.4"/><path d="M9 11c-3-2-5-1-5 1s2 2 5 1M15 11c3-2 5-1 5 1s-2 2-5 1" fill="none" stroke="' + col2 + '" stroke-width="1.3"/><circle cx="12" cy="10.5" r="1.4" fill="' + col + '"/>',
      aurora_jelly:           '<path d="M6 11a6 6 0 0112 0H6z" fill="none" stroke="' + col2 + '" stroke-width="1.6"/><path d="M8 11v7M12 11v9M16 11v7" stroke="' + col + '" stroke-width="1.2" stroke-linecap="round"/>',
      narwhal:                '<path d="M4 14c1.5-4 5-5.5 9-4.5 2 .5 3 2 3.5 3.5l5-1.5-4.5 2.8c-2 2-5 2.8-8.5 2.5-2.5-.2-4-1-4.5-2.8z" fill="none" stroke="' + col2 + '" stroke-width="1.5" stroke-linejoin="round"/>',
      ice_turtle:             '<path d="M5 15c1-5 5-7 9-6 2.5.6 4 2.5 5 5H5z" fill="none" stroke="' + col2 + '" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 9l2-3 2 3" fill="none" stroke="' + col + '" stroke-width="1.3"/>',
      wonder_polar_mist:      '<path d="M3 16l5-6 4 4 4-5 5 7H3z" fill="none" stroke="' + col2 + '" stroke-width="1.5" stroke-linejoin="round"/><circle cx="17" cy="6.5" r="2" fill="' + col + '"/>',
      wonder_aurora_night:    '<path d="M3 13c4-6 7 3 11-4s5 2 7-1" fill="none" stroke="' + col2 + '" stroke-width="1.8" stroke-linecap="round"/><path d="M4 17c4-4 7 2 11-3s4 1 6-1" fill="none" stroke="' + col + '" stroke-width="1.3" stroke-linecap="round"/>',
      wonder_frost_sanctuary: '<path d="M12 4l4 6-4 10-4-10 4-6z" fill="none" stroke="' + col2 + '" stroke-width="1.6"/><path d="M4 9c4-3 12-3 16 0" fill="none" stroke="' + col + '" stroke-width="1.4" stroke-linecap="round"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (map[icon] || map.crystal) + '</svg>';
  }

  function openStampLightbox(item, snapUrl) {
    if (!dom.stampLightbox || !dom.lightboxImg || !snapUrl) return;
    dom.lightboxImg.src = snapUrl;
    if (dom.lightboxTitle) dom.lightboxTitle.textContent = item.name || '实景手记';
    if (dom.lightboxLore) dom.lightboxLore.textContent = item.lore || '';
    dom.stampLightbox.classList.remove('hidden');
  }

  function closeStampLightbox() {
    if (dom.stampLightbox) dom.stampLightbox.classList.add('hidden');
  }

  function showCodexToast(payload) {
    if (!dom.codexToast || !dom.codexToastText || !payload) return;
    var tag = payload.kind === 'relic' ? '遗物邮票' : (payload.kind === 'wonder' ? '奇观留影' : (payload.kind === 'shrine' ? '共鸣碑苏醒' : '生态邮票'));
    dom.codexToastText.textContent = tag + ' · ' + payload.name;
    if (dom.codexToastThumb) {
      if (payload.snapshot) {
        dom.codexToastThumb.src = payload.snapshot;
        dom.codexToastThumb.classList.remove('hidden');
      } else {
        dom.codexToastThumb.classList.add('hidden');
      }
    }
    dom.codexToast.classList.remove('hidden');
    requestAnimationFrame(function () { dom.codexToast.classList.add('show'); });
    if (codexToastTimer) clearTimeout(codexToastTimer);
    codexToastTimer = setTimeout(function () {
      dom.codexToast.classList.remove('show');
      setTimeout(function () { dom.codexToast.classList.add('hidden'); }, 380);
    }, 3200);
  }

  function buildCodexCard(item, found, extraClass, hiddenLabel, hintPrefix) {
    var shop = window.MT.Shop;
    var snapUrl = found && shop && shop.getSnapshot ? shop.getSnapshot(item.id) : null;
    var card = document.createElement('div');
    card.className = 'codex-entry' + (extraClass ? (' ' + extraClass) : '') + (found ? ' found' : '');

    if (found && snapUrl) {
      card.innerHTML =
        '<div class="codex-stamp-wrap" title="点击放大赏析实景邮票">' +
          '<img class="codex-stamp-img" src="' + snapUrl + '" alt="' + item.name + '" />' +
        '</div>' +
        '<div class="codex-entry-title">' + item.name + '</div>' +
        '<div class="codex-entry-body">' + item.lore + '</div>';
      var sw = card.querySelector('.codex-stamp-wrap');
      if (sw) {
        sw.addEventListener('click', function () { openStampLightbox(item, snapUrl); });
      }
    } else {
      card.innerHTML =
        '<div class="codex-entry-head">' +
          '<div class="codex-svg-wrap">' + getCodexSvg(item.icon, found) + '</div>' +
          '<div class="codex-entry-title">' + (found ? item.name : hiddenLabel) + '</div>' +
        '</div>' +
        '<div class="codex-entry-body">' + (found ? item.lore : (hintPrefix + item.hint)) + '</div>';
    }
    return card;
  }

  function renderCodexModal() {
    var ce = (window.MT.Config && window.MT.Config.CODEX_ENTRIES) || { relics: [], fauna: [], wonders: [] };
    var shop = window.MT.Shop;
    var prog = shop && shop.getCodexProgress ? shop.getCodexProgress() : { found: 0, total: 14, relicsFound: 0, relicsTotal: 5, faunaFound: 0, faunaTotal: 6, wondersFound: 0, wondersTotal: 3 };

    if (dom.codexTotalProg) dom.codexTotalProg.textContent = prog.found + ' / ' + prog.total;
    if (dom.codexRelicSub) dom.codexRelicSub.textContent = prog.relicsFound + '/' + prog.relicsTotal + ' · 散落于海空与深渊之间';
    if (dom.codexFaunaSub) dom.codexFaunaSub.textContent = prog.faunaFound + '/' + prog.faunaTotal + ' · 靠近观察或按 Q 声呐共振即可拍录';
    if (dom.codexWonderSub) dom.codexWonderSub.textContent = prog.wondersFound + '/' + prog.wondersTotal + ' · 亲历落月剧变与破晓晨海自动留影';

    if (dom.codexRelicGrid) {
      dom.codexRelicGrid.innerHTML = '';
      (ce.relics || []).forEach(function (item) {
        var rKey = item.realm || 'moon_sea';
        var found = shop && shop.hasRelic && shop.hasRelic(rKey, item.id);
        dom.codexRelicGrid.appendChild(buildCodexCard(item, found, '', '？？？', '线索：'));
      });
    }

    if (dom.codexFaunaGrid) {
      dom.codexFaunaGrid.innerHTML = '';
      (ce.fauna || []).forEach(function (item) {
        var found = shop && shop.hasFauna && shop.hasFauna(item.id);
        dom.codexFaunaGrid.appendChild(buildCodexCard(item, found, 'fauna-entry', '未记录生灵', '栖息：'));
      });
    }

    if (dom.codexWonderGrid) {
      dom.codexWonderGrid.innerHTML = '';
      (ce.wonders || []).forEach(function (item) {
        var found = shop && shop.hasWonder && shop.hasWonder(item.id);
        dom.codexWonderGrid.appendChild(buildCodexCard(item, found, 'wonder-entry', '未见证天象', '时机：'));
      });
    }
  }

  function openCodex() {
    if (!running || docked || codexOpen) return;
    codexOpen = true;
    docked = true;
    input.left = false; input.right = false; input.up = false; input.down = false; input.boost = false;
    input.joyX = 0; input.joyY = 0;
    window.MT.Audio.setBoosting(false, 0);
    renderCodexModal();
    dom.touchControls.classList.add('hidden');
    if (dom.codexScreen) dom.codexScreen.classList.remove('hidden');
    window.MT.Audio.playHookCatch();
  }

  function closeCodex() {
    if (!codexOpen) return;
    codexOpen = false;
    docked = false;
    if (dom.codexScreen) dom.codexScreen.classList.add('hidden');
    setTouchMode(touchMode);
    window.MT.Audio.playHookCatch();
  }

  function applySavedSettingsToEngine() {
    var st = (window.MT.Shop && window.MT.Shop.getSettings) ? window.MT.Shop.getSettings() : { musicVol: 0.85, sfxVol: 0.90, quality: 'high' };
    if (window.MT.Audio && window.MT.Audio.setVolumes) {
      window.MT.Audio.setVolumes(st.musicVol, st.sfxVol);
    }
    if (window.MT.RenderWorld && window.MT.RenderWorld.applyQualitySettings) {
      window.MT.RenderWorld.applyQualitySettings();
    }
    if (dom.setMusicVol) dom.setMusicVol.value = String(Math.round(st.musicVol * 100));
    if (dom.setMusicVal) dom.setMusicVal.textContent = Math.round(st.musicVol * 100) + '%';
    if (dom.setSfxVol) dom.setSfxVol.value = String(Math.round(st.sfxVol * 100));
    if (dom.setSfxVal) dom.setSfxVal.textContent = Math.round(st.sfxVol * 100) + '%';
    if (dom.btnQualHigh) dom.btnQualHigh.classList.toggle('active', st.quality !== 'eco');
    if (dom.btnQualEco) dom.btnQualEco.classList.toggle('active', st.quality === 'eco');
    if (dom.setQualityHint) {
      dom.setQualityHint.textContent = st.quality === 'eco' ? '流畅省电 · 降像素比并精简微粒' : '高清绘本 · 含冷压画纸肌理';
    }
  }

  function openSettings() {
    if (!running || docked || settingsOpen) return;
    settingsOpen = true;
    docked = true;
    input.left = false; input.right = false; input.up = false; input.down = false; input.boost = false;
    input.joyX = 0; input.joyY = 0;
    window.MT.Audio.setBoosting(false, 0);
    applySavedSettingsToEngine();
    if (dom.btnSettingsReset) {
      dom.btnSettingsReset.classList.remove('arming');
      dom.btnSettingsReset.textContent = '清空全部存档';
    }
    dom.touchControls.classList.add('hidden');
    if (dom.settingsScreen) dom.settingsScreen.classList.remove('hidden');
    window.MT.Audio.playHookCatch();
  }

  function closeSettings() {
    if (!settingsOpen) return;
    settingsOpen = false;
    docked = false;
    if (dom.settingsScreen) dom.settingsScreen.classList.add('hidden');
    setTouchMode(touchMode);
    window.MT.Audio.playHookCatch();
  }

  function renderCommissionsAndSkins() {
    var shop = window.MT.Shop;
    var comms = (window.MT.Config && window.MT.Config.COMMISSIONS) || [];
    var skins = (window.MT.Config && window.MT.Config.SUB_SKINS) || [];

    if (dom.commissionGrid) {
      dom.commissionGrid.innerHTML = '';
      comms.forEach(function (cm) {
        var claimed = shop.isCommissionClaimed && shop.isCommissionClaimed(cm.id);
        var ready = shop.isCommissionReady && shop.isCommissionReady(cm);
        var card = document.createElement('div');
        card.className = 'comm-card' + (claimed ? ' claimed' : (ready ? ' ready' : ''));
        card.innerHTML =
          '<div class="comm-head">' +
            '<span class="comm-title">' + cm.title + '</span>' +
            '<span class="comm-reward">' + cm.rewardLabel + '</span>' +
          '</div>' +
          '<div class="comm-desc">' + cm.desc + '</div>' +
          '<button class="comm-btn" type="button">' + (claimed ? '已交付 ✓' : (ready ? '交付邮票领奖' : '待拍摄留影')) + '</button>';
        var btn = card.querySelector('.comm-btn');
        if (ready && btn) {
          btn.addEventListener('click', function () {
            var res = shop.claimCommission(cm.id);
            if (res) {
              if (window.MT.Audio && window.MT.Audio.playBountyComplete) window.MT.Audio.playBountyComplete();
              renderShopGrid(null);
              renderCommissionsAndSkins();
              updateHUD();
            }
          });
        }
        dom.commissionGrid.appendChild(card);
      });
    }

    if (dom.skinBar) {
      dom.skinBar.innerHTML = '';
      var curSkin = shop.getSelectedSubSkin ? shop.getSelectedSubSkin() : 'cream';
      skins.forEach(function (sk) {
        var unlocked = shop.isSkinUnlocked ? shop.isSkinUnlocked(sk.id) : (sk.id === 'cream');
        var active = curSkin === sk.id;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'skin-pill' + (unlocked ? ' unlocked' : '') + (active ? ' active' : '');
        btn.title = unlocked ? ('切换涂装：' + sk.name) : ('未解锁：' + sk.unlockHint);
        btn.innerHTML =
          '<span class="skin-swatch" style="background:linear-gradient(135deg,' + sk.swatch[0] + ' 55%,' + sk.swatch[1] + ' 55%)"></span>' +
          '<span>' + sk.name + (active ? ' · 使用中' : (unlocked ? '' : '（未解锁）')) + '</span>';
        if (unlocked) {
          btn.addEventListener('click', function () {
            if (shop.selectSubSkin(sk.id)) {
              if (window.MT.Audio) window.MT.Audio.playHookCatch();
              renderCommissionsAndSkins();
            }
          });
        }
        dom.skinBar.appendChild(btn);
      });
    }
  }

  // v13 Step 2：双海域丝滑跨海航门切换（保留全部船体强化、星火与博物手记存档！）
  var switchingRealm = false;
  function switchRealm(targetRealm, spawnX) {
    if (switchingRealm) return;
    switchingRealm = true;
    var nextRealm = (targetRealm === 'frost_sea') ? 'frost_sea' : 'moon_sea';
    if (nextRealm === 'frost_sea' && window.MT.Shop && window.MT.Shop.unlockFrostRealm) {
      window.MT.Shop.unlockFrostRealm();
    }
    if (window.MT.Audio && window.MT.Audio.playPortalTransit) window.MT.Audio.playPortalTransit();
    if (dom.realmTransitionTitle) {
      dom.realmTransitionTitle.textContent = nextRealm === 'frost_sea' ? '霜穹冰海' : '月潮之海';
    }
    if (dom.realmTransition) dom.realmTransition.classList.add('active');

    setTimeout(function () {
      var prevBoat = window.MT.Physics.getBoat();
      var carriedStars = prevBoat ? (prevBoat.runStars || 0) : 0;
      if (window.MT.Eras && window.MT.Eras.setActiveRealm) window.MT.Eras.setActiveRealm(nextRealm);
      var sx = typeof spawnX === 'number' ? spawnX : 540;
      window.MT.Eras.reset(sx, 'story');
      if (window.MT.LevelEngine) window.MT.LevelEngine.reset(sx, 'story');
      var newBoat = window.MT.Physics.reset(sx);
      newBoat.runStars = carriedStars;
      newBoat.facing = nextRealm === 'frost_sea' ? 1 : -1;
      newBoat.facingSmooth = newBoat.facing;
      window.MT.RenderWorld.snapCameraTo(newBoat.x, newBoat.y);
      if (dom.compassMarks) dom.compassMarks.dataset.key = '';
      updateHUD();

      setTimeout(function () {
        if (dom.realmTransition) dom.realmTransition.classList.remove('active');
        switchingRealm = false;
      }, 240);
    }, 420);
  }

  function openFinaleCard() {
    if (docked) return;
    docked = true;
    input.left = false;
    input.right = false;
    input.up = false;
    input.down = false;
    input.boost = false;
    input.joyX = 0;
    input.joyY = 0;
    window.MT.Audio.setBoosting(false, 0);
    window.MT.Audio.setIceScrape(0, false);
    window.MT.Audio.setGrinding(false, null, 0);

    var boat = window.MT.Physics.getBoat();
    var shop = window.MT.Shop;
    shop.markRebirthWitnessed();
    shop.depositRun(boat.runStars, boat.distanceM, boat.reachedEras, false);
    updateRebirthBadges();

    dom.finDist.textContent = boat.distanceM + ' m';
    dom.finStars.textContent = '+' + boat.runStars + ' ✦';
    dom.finTricks.textContent = String(boat.runTricks);
    dom.finVoyages.textContent = shop.getTotalVoyages() + ' 趟';

    dom.touchControls.classList.add('hidden');
    if (dom.bountyPill) dom.bountyPill.classList.add('hidden');
    dom.hudTop.classList.add('hidden');
    dom.finaleScreen.classList.remove('hidden');
  }

  function startRun(modeOrFlag) {
    window.MT.Audio.init();
    applySavedSettingsToEngine();
    window.MT.Shop.clearFreshBlueprints();
    var isEndless = (modeOrFlag === 'endless');
    var startEra = isEndless
      ? null
      : (modeOrFlag === true ? window.MT.Config.ERAS[0] : window.MT.Shop.getSelectedStartEra());
    var singleSeaMode = window.MT.Config.SINGLE_SCENE_MODE === 'moon_sea';
    var seaStartChoice = (!isEndless && singleSeaMode && modeOrFlag !== true && window.MT.Shop.getSelectedSeaStart)
      ? window.MT.Shop.getSelectedSeaStart()
      : 'surface';
    var impactJumpX = ((window.MT.Config.SEA_VOYAGE && window.MT.Config.SEA_VOYAGE.IMPACT_X) || 14800) - 90;
    var isExpRun = !!(window.MT.Config && window.MT.Config.EXPLORE_MODE);
    var homeX = (window.MT.Config.WORLD_CYCLE && window.MT.Config.WORLD_CYCLE.HOME_X) || 520;
    var spawnX = isExpRun
      ? homeX
      : (isEndless ? 120 : (seaStartChoice === 'abyss' ? impactJumpX : (startEra ? startEra.spawnX : 120)));

    window.MT.Eras.reset(spawnX, isEndless ? 'endless' : 'story');
    if (window.MT.LevelEngine) window.MT.LevelEngine.reset(spawnX, isEndless ? 'endless' : 'story');
    var boat = window.MT.Physics.reset(spawnX);
    window.MT.RenderWorld.snapCameraTo(boat.x, boat.y);

    running = true;
    docked = false;
    input.left = false;
    input.right = false;
    input.up = false;
    input.down = false;
    input.boost = false;
    input.joyX = 0;
    input.joyY = 0;

    dom.titleScreen.classList.add('hidden');
    dom.dockScreen.classList.add('hidden');
    dom.finaleScreen.classList.add('hidden');
    if (dom.stageClearScreen) dom.stageClearScreen.classList.add('hidden');
    dom.hudTop.classList.remove('hidden');

    if (isEndless) {
      var firstEra = window.MT.Eras.getCurrentEra(boat.x);
      window.MT.Audio.playEraFanfare(firstEra.id);
      var singleMode = window.MT.Config.SINGLE_SCENE_MODE === 'moon_sea';
      showEraBanner(
        singleMode ? '无尽月潮 · 四幕昼夜' : '无尽漫游 · 六境乱序',
        firstEra.name,
        singleMode ? '暮光、蓝眼泪、血潮风暴与破晓将无缝轮回，尽情深潜破水飙分！' : '六大风貌将随机衔接、自然演变，尽情御风飙分！',
        5000
      );
    } else if (startEra && startEra.index > 0) {
      window.MT.Audio.playEraFanfare(startEra.id);
      showEraBanner('驿站直达 · ' + startEra.kicker, startEra.name, startEra.subtitle);
    }

    setTouchMode(touchMode);
    coachCooldown = 1.2;
    if (dom.controlsTip) dom.controlsTip.classList.add('hidden');
    var startEraNow = window.MT.Eras.getCurrentEra(boat.x);
    activeBounty = null;
    if (window.MT.Config && window.MT.Config.EXPLORE_MODE) {
      if (dom.bountyPill) dom.bountyPill.classList.add('hidden');
    } else {
      pickNextBounty(boat, startEraNow ? startEraNow.id : 'moon_sea');
    }
    updateHUD();
  }

  function onLevelEvent(kind, payload) {
    if (kind === 'codex_discover' && payload) {
      showCodexToast(payload);
      updateHUD();
      return;
    }
    if (window.MT.Config && window.MT.Config.EXPLORE_MODE) {
      if (kind === 'time_watch_unlocked') {
        showCodexToast({ kind: 'shrine', name: '获赠「潮汐怀表」· 可自由拨动天象' });
        updateHUD();
        return;
      }
      if (kind === 'shrine_all_awake') {
        showCodexToast({ kind: 'shrine', name: '三座共鸣碑皆已苏醒 · 归返暮光灯塔港' });
        updateHUD();
        return;
      }
      if (kind === 'realm_transit' && payload && payload.targetRealm) {
        switchRealm(payload.targetRealm, payload.spawnX);
        return;
      }
      if (kind === 'harbor_moor' && !docked) {
        if (window.MT.Audio && window.MT.Audio.playHarborMoor) window.MT.Audio.playHarborMoor();
        openDock('harbor');
      }
      return;
    }
    if ((kind === 'act3_climax' || kind === 'abyss_impact') && payload) {
      showEraBanner(payload.kicker, payload.title, payload.subtitle, 5400);
      if (kind === 'abyss_impact') {
        showCoachTip(
          touchMode ? '深海避难：↺ 上浮 · ↻ 下潜 · 「火」鱼鳍冲刺！钻进倒扣沉船银色气室换气！' : '深海避难：A 上浮 · D 下潜 · 空格 鱼鳍冲刺！钻进倒扣沉船银色气室换气！',
          6200
        );
      }
    } else if (kind === 'stage_clear') {
      openStageClearCard(payload);
    }
  }

  function onEraEvent(kind, era) {
    var isEndless = window.MT.Eras.isEndlessMode && window.MT.Eras.isEndlessMode();
    if (kind === 'era_enter' && era) {
      if (isEndless) {
        showEraBanner(era.kicker, era.name, era.subtitle, 4200);
      } else {
        var newlyUnlocked = window.MT.Shop.unlockEra(era.id);
        var bp = newlyUnlocked ? window.MT.Shop.getItemByEra(era.id) : null;
        var sub = bp ? (era.subtitle + '（已记录航路驿站 · 灵光构思「' + bp.name + '」）') : era.subtitle;
        showEraBanner(era.kicker, era.name, sub, 5200);
      }
    } else if (kind === 'finale_enter') {
      dom.controlsTip.classList.add('fade-out');
      dom.touchControls.classList.add('hidden');
      showEraBanner(
        '终章 · 沧海桑田',
        '翡翠海岸 · 新生世界树',
        '大洋重归彼岸，小小木舟缓缓泊于新生世界树下…',
        4200
      );
    } else if (kind === 'finale_complete') {
      openFinaleCard();
    }
  }

  function updateHUD() {
    var boat = window.MT.Physics.getBoat();
    var era = window.MT.Eras.getCurrentEra(boat.x);
    var shop = window.MT.Shop;
    var st = boat.stats;

    var hullPct = Math.max(0, Math.min(100, (boat.hull / boat.maxHull) * 100));
    dom.hullFill.style.width = hullPct.toFixed(1) + '%';
    dom.hullFill.classList.toggle('low', hullPct < 35);

    dom.starCount.textContent = String(shop.getBank() + boat.runStars);
    if (dom.relicPill && window.MT.LevelEngine && window.MT.LevelEngine.getRelicStatus) {
      var rStat = window.MT.LevelEngine.getRelicStatus(era.id);
      if (rStat && rStat.total > 0 && !(window.MT.Eras.isFinaleActive && window.MT.Eras.isFinaleActive())) {
        dom.relicPill.classList.remove('hidden');
        dom.relicPill.classList.toggle('complete', rStat.collected >= rStat.total);
        dom.relicCount.textContent = rStat.collected + '/' + rStat.total;
      } else {
        dom.relicPill.classList.add('hidden');
      }
    }
    var inFinale = window.MT.Eras.isFinaleActive && window.MT.Eras.isFinaleActive();
    var isEndless = window.MT.Eras.isEndlessMode && window.MT.Eras.isEndlessMode();
    var ebHud = window.MT.Eras.getEraBlend(boat.x);
    var spHud = ebHud && ebHud.seaPhase;
    var isExpHud = !!(window.MT.Config && window.MT.Config.EXPLORE_MODE);
    if (isExpHud) {
      dom.eraLabel.textContent = '';
      dom.distLabel.textContent = '';
      // 更新极简黄铜水深/方位刻度条
      if (dom.brassCompass && dom.compassNeedle && dom.compassDepth) {
        dom.brassCompass.classList.remove('hidden');
        var wcH = window.MT.Config.WORLD_CYCLE || { MIN_X: 160, MAX_X: 9840 };
        var mapCompassPct = function (wx) {
          var u = Math.max(0, Math.min(1, (wx - wcH.MIN_X) / Math.max(1, wcH.MAX_X - wcH.MIN_X)));
          return 5 + u * 90; // 留出左右 5% 边距，绝不与「西」「东」文字拥挤重叠
        };
        dom.compassNeedle.style.left = mapCompassPct(boat.x).toFixed(1) + '%';

        var curRealmHud = (window.MT.Eras && window.MT.Eras.getActiveRealm) ? window.MT.Eras.getActiveRealm() : 'moon_sea';
        if (dom.compassMarks) {
          if (curRealmHud === 'frost_sea') {
            var pIce = window.MT.LevelEngine && window.MT.LevelEngine.getPlugin('frost_sea');
            var lm = (pIce && pIce.getCompassLandmarks) ? pIce.getCompassLandmarks() : { portalX: 320, arches: [], springs: [], shrines: [] };
            var shArr = lm.shrines || [];
            var fKey = 'frost|' + shArr.map(function (s) { return s.id + (s.awake ? '1' : '0'); }).join(',');
            if (dom.compassMarks.dataset.key !== fKey) {
              dom.compassMarks.dataset.key = fKey;
              var hF = '<i class="compass-dot portal" style="left:' + mapCompassPct(lm.portalX).toFixed(1) + '%" title="返航月潮之海"></i>';
              lm.arches.forEach(function (ia) {
                hF += '<i class="compass-dot cave found" style="left:' + mapCompassPct(ia.x).toFixed(1) + '%" title="' + ia.name + '"></i>';
              });
              lm.springs.forEach(function (sp) {
                hF += '<i class="compass-dot spring" style="left:' + mapCompassPct(sp.x).toFixed(1) + '%" title="海底地热暖泉"></i>';
              });
              shArr.forEach(function (sh) {
                hF += '<i class="compass-dot shrine' + (sh.awake ? ' awake' : '') + '" style="left:' + mapCompassPct(sh.x).toFixed(1) + '%" title="' + sh.name + '"></i>';
              });
              dom.compassMarks.innerHTML = hF;
            }
          } else {
            var cavesInfo = (window.MT.Caves && window.MT.Caves.getCaveListForCompass) ? window.MT.Caves.getCaveListForCompass() : [];
            var shrinesInfo = (window.MT.Shrines && window.MT.Shrines.getShrineListForCompass) ? window.MT.Shrines.getShrineListForCompass() : [];
            var frostOpenC = !!(shop && shop.isFrostUnlocked && shop.isFrostUnlocked());
            var cKey = 'moon|' + (frostOpenC ? '1' : '0') + '|'
              + cavesInfo.map(function (c) { return c.id + (c.discovered ? '1' : '0'); }).join(',')
              + '|' + shrinesInfo.map(function (s) { return s.id + (s.awake ? '1' : '0'); }).join(',');
            if (dom.compassMarks.dataset.key !== cKey) {
              dom.compassMarks.dataset.key = cKey;
              var htmlM = '';
              [2900, 4670, 6120, 8500].forEach(function (lx) {
                htmlM += '<i class="compass-dot" style="left:' + mapCompassPct(lx).toFixed(1) + '%"></i>';
              });
              cavesInfo.forEach(function (cv) {
                htmlM += '<i class="compass-dot cave' + (cv.discovered ? ' found' : '') + '" style="left:' + mapCompassPct(cv.x).toFixed(1) + '%"></i>';
              });
              shrinesInfo.forEach(function (sh) {
                htmlM += '<i class="compass-dot shrine' + (sh.awake ? ' awake' : '') + '" style="left:' + mapCompassPct(sh.x).toFixed(1) + '%" title="' + sh.name + '"></i>';
              });
              if (frostOpenC) {
                htmlM += '<i class="compass-dot portal" style="left:' + mapCompassPct(9640).toFixed(1) + '%" title="星潮跨海航门 · 霜穹冰海"></i>';
              }
              dom.compassMarks.innerHTML = htmlM;
            }
          }
        }

        var depthM = Math.max(0, Math.round((boat.submergeDepth || 0) / 5.2));
        dom.compassDepth.classList.remove('deep', 'cave');
        if (boat.inCave) {
          dom.compassDepth.classList.add('cave');
          dom.compassDepth.textContent = (boat.activeCaveName || '海底秘境') + ' · ' + depthM + ' m';
        } else if (boat.isDiving && depthM >= 2) {
          dom.compassDepth.classList.add('deep');
          dom.compassDepth.textContent = (curRealmHud === 'frost_sea' ? '冰下 ' : '水深 ') + depthM + ' m';
        } else {
          dom.compassDepth.textContent = curRealmHud === 'frost_sea'
            ? (boat.inHarborZone ? '霜穹冰港' : '霜穹冰海')
            : (boat.inHarborZone ? '暮光灯塔港' : '海面');
        }
      }
      if (dom.btnPhaseDial) {
        var watchOpen = shop && shop.isTimeWatchUnlocked && shop.isTimeWatchUnlocked();
        dom.btnPhaseDial.classList.toggle('hidden', !watchOpen);
        var fpHud = ebHud && ebHud.frostPhase;
        if (watchOpen && fpHud) {
          var fIcons = { polar_mist: '❄', aurora_night: '✧', ice_thaw: '☀' };
          dom.btnPhaseDial.textContent = (fIcons[fpHud.actId] || '❄') + ' 怀表';
        } else if (watchOpen && spHud) {
          var icons = { twilight: '◐', biolum: '✦', storm: '◉', boil_abyss: '◈', ash_sea: '◌', kelp_abyss: '✧', dawn: '☀' };
          var ic = icons[spHud.actId] || '⏱';
          dom.btnPhaseDial.textContent = ic + ' 怀表';
        }
      }
      if (dom.btnDock) {
        dom.btnDock.textContent = boat.inHarborZone ? '⚓ 泊港整备' : '船坞整备';
        dom.btnDock.classList.toggle('harbor-ready', !!boat.inHarborZone);
      }
      if (dom.codexHudCount && shop && shop.getCodexProgress) {
        var cp = shop.getCodexProgress();
        dom.codexHudCount.textContent = cp.found + '/' + cp.total;
      }
      if (dom.tcSonar) {
        dom.tcSonar.classList.toggle('cooling', (boat.activeSonarCdFrac || 0) > 0.04);
      }
    } else if (spHud) {
      dom.eraLabel.textContent = isEndless
        ? ('无尽月潮 · ' + spHud.actName)
        : ('月潮之海 · ' + spHud.actName);
      dom.distLabel.textContent = boat.distanceM + ' m';
    } else {
      dom.eraLabel.textContent = inFinale
        ? '翡翠海岸 · 新生世界树'
        : (isEndless ? ('无尽第 ' + (era.seqNum || 1) + ' 境 · ' + era.name) : era.name);
      dom.distLabel.textContent = boat.distanceM + ' m';
    }
    if (dom.climaxBarWrap && dom.climaxBarFill && window.MT.LevelEngine && window.MT.LevelEngine.getClimaxState) {
      var cs = window.MT.LevelEngine.getClimaxState();
      dom.climaxBarWrap.classList.toggle('hidden', !cs.active);
      if (cs.active) {
        dom.climaxBarFill.style.width = Math.round(cs.progress * 100) + '%';
      }
    }

    if (window.MT.Config && window.MT.Config.EXPLORE_MODE) {
      dom.comboPill.classList.add('hidden');
    } else if (boat.feverTimer > 0.05) {
      dom.comboPill.classList.remove('hidden');
      dom.comboPill.classList.add('fever');
      dom.comboPill.innerHTML = '✦ 流光狂热 ×<span id="combo-count">' + Math.max(3, boat.trickCombo) + '</span>';
    } else if (boat.trickCombo >= 2) {
      dom.comboPill.classList.remove('hidden', 'fever');
      dom.comboPill.innerHTML = '连技 ×<span id="combo-count">' + boat.trickCombo + '</span>';
    } else {
      dom.comboPill.classList.add('hidden');
      dom.comboPill.classList.remove('fever');
    }

    dom.envPill.classList.remove('shielded', 'cold', 'rough', 'meadow', 'forest', 'vine-warn');
    if (boat.inFireSea) {
      dom.envPill.classList.remove('hidden');
      dom.envPill.classList.toggle('shielded', st.heatShieldLv >= 1);
      if (st.heatShieldLv >= 3) dom.envPill.textContent = '抗熔护盾 · 免疫高温';
      else if (st.heatShieldLv >= 2) dom.envPill.textContent = '铜散热片 · 蓄热中';
      else if (st.heatShieldLv >= 1) dom.envPill.textContent = '黑曜隔热 · 65%防护';
      else dom.envPill.textContent = '高温炙烤 · 持续掉血';
    } else if (boat.inIceWinter) {
      dom.envPill.classList.remove('hidden');
      dom.envPill.classList.add('cold');
      dom.envPill.classList.toggle('shielded', st.quiltLv >= 1);
      if (st.quiltLv >= 3) dom.envPill.textContent = '羽绒暖被 · 免疫严寒';
      else if (st.quiltLv >= 2) dom.envPill.textContent = '棉被暖炉 · 90%保暖';
      else if (st.quiltLv >= 1) dom.envPill.textContent = '补丁棉被 · 65%保暖';
      else dom.envPill.textContent = '尘冬极寒 · 持续冻损';
    } else if (boat.inWasteland) {
      dom.envPill.classList.remove('hidden');
      dom.envPill.classList.add('rough');
      dom.envPill.classList.toggle('shielded', st.springsLv >= 1);
      if (st.springsLv >= 3) dom.envPill.textContent = '鎏金滑橇 · 高弹避震';
      else if (st.springsLv >= 2) dom.envPill.textContent = '双联弹簧 · 坑洼回跃';
      else if (st.springsLv >= 1) dom.envPill.textContent = '黄铜弹簧 · 65%抗震';
      else dom.envPill.textContent = '坑洼荒土 · 颠簸掉血';
    } else if (boat.inMeadow) {
      dom.envPill.classList.remove('hidden');
      dom.envPill.classList.add('meadow');
      dom.envPill.textContent = st.gliderLv >= 1 ? '风铃滑翔 · 借风远飞' : '春雨青野 · 治愈微风';
    } else if (boat.inForest) {
      dom.envPill.classList.remove('hidden');
      if (st.prowLv >= 1) {
        dom.envPill.classList.add('forest');
        dom.envPill.textContent = st.prowLv >= 2 ? '鎏金船首 · 无伤破藤' : '破藤船首 · 70%减伤';
      } else {
        dom.envPill.classList.add('vine-warn');
        dom.envPill.textContent = '荆棘巨藤 · 需破藤船首';
      }
    } else {
      dom.envPill.classList.add('hidden');
    }
  }

  function bindHold(el, onDown, onUp) {
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
    dom.btnPlay.addEventListener('click', function () { startRun('story'); });
    dom.btnRelaunch.addEventListener('click', function () {
      if (window.MT.Config && window.MT.Config.EXPLORE_MODE && running) {
        resumeExploreFromDock();
      } else {
        startRun('story');
      }
    });
    if (dom.btnPlayEndless) {
      dom.btnPlayEndless.addEventListener('click', function () { startRun('endless'); });
    }
    if (dom.btnDockEndless) {
      dom.btnDockEndless.addEventListener('click', function () { startRun('endless'); });
    }
    if (dom.btnFinaleEndless) {
      dom.btnFinaleEndless.addEventListener('click', function () { startRun('endless'); });
    }
    if (dom.btnFinaleDock) {
      dom.btnFinaleDock.addEventListener('click', function () {
        docked = false;
        openDock('from_finale');
      });
    }
    if (dom.btnScDockNext) {
      dom.btnScDockNext.addEventListener('click', function () {
        var boat = window.MT.Physics.getBoat();
        if (window.MT.LevelEngine) window.MT.LevelEngine.finishStageClearing(boat);
        var nextId = (activeStageClear && activeStageClear.nextEraId) || 'fire_sea';
        window.MT.Shop.selectStartEra(nextId);
        docked = false;
        openDock('from_finale');
      });
    }
    if (dom.btnScContinue) {
      dom.btnScContinue.addEventListener('click', function () {
        var boat = window.MT.Physics.getBoat();
        if (window.MT.LevelEngine) window.MT.LevelEngine.finishStageClearing(boat);
        if (activeStageClear && activeStageClear.singleSceneClear) {
          startRun('endless');
          return;
        }
        var nextId = (activeStageClear && activeStageClear.nextEraId) || 'fire_sea';
        boat.runStars = 0;
        docked = false;
        dom.stageClearScreen.classList.add('hidden');
        dom.hudTop.classList.remove('hidden');
        setTouchMode(touchMode);
        window.MT.Audio.playEraFanfare(nextId);
        var erasCfg = window.MT.Config.ERAS || [];
        var nextEra = erasCfg.filter(function (e) { return e.id === nextId; })[0] || erasCfg[1];
        if (nextEra) showEraBanner(nextEra.kicker, nextEra.name, nextEra.subtitle, 4600);
      });
    }
    if (dom.btnScReplay) {
      dom.btnScReplay.addEventListener('click', function () {
        var curId = (activeStageClear && activeStageClear.eraId) || 'moon_sea';
        window.MT.Shop.selectStartEra(curId);
        startRun('story');
      });
    }
    if (dom.btnPhaseDial) {
      dom.btnPhaseDial.addEventListener('click', function () {
        if (window.MT.Shop && window.MT.Shop.isTimeWatchUnlocked && !window.MT.Shop.isTimeWatchUnlocked()) return;
        if (window.MT.Eras && window.MT.Eras.advanceWorldPhase) {
          window.MT.Eras.advanceWorldPhase();
          window.MT.Audio.playHookCatch();
        }
      });
    }

    window.MT.onCodexDiscover = function (payload) {
      showCodexToast(payload);
      updateHUD();
    };

    if (dom.btnCodex) {
      dom.btnCodex.addEventListener('click', function () {
        if (codexOpen) closeCodex();
        else if (running && !docked) openCodex();
      });
    }
    if (dom.btnCodexClose) {
      dom.btnCodexClose.addEventListener('click', function () {
        closeCodex();
      });
    }
    if (dom.btnExportPoster) {
      dom.btnExportPoster.addEventListener('click', function () {
        if (!window.MT.Snapshot || !window.MT.Snapshot.exportStampPoster) return;
        dom.btnExportPoster.textContent = '正在装裱长图…';
        window.MT.Snapshot.exportStampPoster(function (res) {
          dom.btnExportPoster.textContent = '导出水彩邮票长图';
          if (res && res.dataUrl) {
            if (window.MT.Audio && window.MT.Audio.playShutterSnap) window.MT.Audio.playShutterSnap();
            openStampLightbox({
              name: '月潮博物邮票长图（' + res.count + ' 枚实景）',
              lore: '长图已生成并尝试下载；在手机或 TapTap 预览中可直接长按图片保存分享！'
            }, res.dataUrl);
          }
        });
      });
    }
    if (dom.btnSettings) {
      dom.btnSettings.addEventListener('click', function () {
        if (settingsOpen) closeSettings();
        else if (running && !docked) openSettings();
      });
    }
    if (dom.btnSettingsClose) {
      dom.btnSettingsClose.addEventListener('click', function () { closeSettings(); });
    }
    if (dom.setMusicVol) {
      dom.setMusicVol.addEventListener('input', function () {
        var v = Math.max(0, Math.min(1, Number(dom.setMusicVol.value) / 100));
        window.MT.Shop.updateSettings({ musicVol: v });
        applySavedSettingsToEngine();
      });
    }
    if (dom.setSfxVol) {
      dom.setSfxVol.addEventListener('input', function () {
        var v = Math.max(0, Math.min(1, Number(dom.setSfxVol.value) / 100));
        window.MT.Shop.updateSettings({ sfxVol: v });
        applySavedSettingsToEngine();
      });
    }
    if (dom.btnQualHigh) {
      dom.btnQualHigh.addEventListener('click', function () {
        window.MT.Shop.updateSettings({ quality: 'high' });
        applySavedSettingsToEngine();
        window.MT.Audio.playHookCatch();
      });
    }
    if (dom.btnQualEco) {
      dom.btnQualEco.addEventListener('click', function () {
        window.MT.Shop.updateSettings({ quality: 'eco' });
        applySavedSettingsToEngine();
        window.MT.Audio.playHookCatch();
      });
    }
    if (dom.btnSettingsReset) {
      dom.btnSettingsReset.addEventListener('click', function () {
        if (!dom.btnSettingsReset.classList.contains('arming')) {
          dom.btnSettingsReset.classList.add('arming');
          dom.btnSettingsReset.textContent = '再点一次确认清空';
          return;
        }
        window.MT.Shop.resetProgress();
        dom.btnSettingsReset.classList.remove('arming');
        dom.btnSettingsReset.textContent = '已重置，请重新启航';
        applySavedSettingsToEngine();
        if (window.MT.Eras && window.MT.Eras.setActiveRealm) window.MT.Eras.setActiveRealm('moon_sea');
        closeSettings();
        startRun('story');
      });
    }
    if (dom.btnLightboxClose) {
      dom.btnLightboxClose.addEventListener('click', function () {
        closeStampLightbox();
      });
    }
    if (dom.stampLightbox) {
      dom.stampLightbox.addEventListener('click', function (e) {
        if (e.target === dom.stampLightbox) closeStampLightbox();
      });
    }

    function triggerManualSonar() {
      if (!running || docked) return;
      var rId = (window.MT.Eras && window.MT.Eras.getActiveRealm) ? window.MT.Eras.getActiveRealm() : 'moon_sea';
      var pAct = window.MT.LevelEngine && window.MT.LevelEngine.getPlugin(rId);
      if (pAct && typeof pAct.triggerActiveSonar === 'function') {
        pAct.triggerActiveSonar(window.MT.Physics.getBoat(), window.MT.Eras, onLevelEvent);
      }
    }

    // 随时按 P 键重拍当前眼前天象/奇观的实景水彩邮票！
    function triggerManualSnapshot() {
      if (!running || docked || !window.MT.Snapshot) return;
      var boat = window.MT.Physics.getBoat();
      var eb = window.MT.Eras && window.MT.Eras.getEraBlend ? window.MT.Eras.getEraBlend(boat.x) : null;
      var sp = eb && eb.seaPhase;
      var fp = eb && eb.frostPhase;
      var targetId = 'wonder_dawn', targetName = '破晓晨海', targetKind = 'wonder';
      if (fp) {
        if (window.MT.IceShrines && window.MT.IceShrines.isSanctuaryAwake && window.MT.IceShrines.isSanctuaryAwake()) {
          targetId = 'wonder_frost_sanctuary'; targetName = '极光冰穹圣殿';
        } else if (fp.aurora > 0.40) {
          targetId = 'wonder_aurora_night'; targetName = '翡翠粉紫极光';
        } else {
          targetId = 'wonder_polar_mist'; targetName = '极昼冰雾';
        }
      } else {
        if (sp && (sp.boilAbyss || 0) > 0.35) { targetId = 'wonder_boil'; targetName = '沸海沉陨'; }
        else if (sp && (sp.ashSea || 0) > 0.35) { targetId = 'wonder_ash'; targetName = '尘幕灰海'; }
        else if (boat.isDiving) { targetId = 'fauna_kelp'; targetName = '发光海藻林'; targetKind = 'fauna'; }
      }

      if (targetKind === 'wonder' && window.MT.Shop && window.MT.Shop.discoverWonder) window.MT.Shop.discoverWonder(targetId);
      else if (targetKind === 'fauna' && window.MT.Shop && window.MT.Shop.discoverFauna) window.MT.Shop.discoverFauna(targetId);

      var snap = window.MT.Snapshot.captureFromLiveCanvas(targetId, targetName, boat.x, boat.y);
      window.MT.Snapshot.triggerShutterFlash();
      if (window.MT.Audio && window.MT.Audio.playShutterSnap) window.MT.Audio.playShutterSnap();
      showCodexToast({ kind: targetKind, id: targetId, name: targetName, snapshot: snap });
      updateHUD();
    }

    if (dom.tcSonar) {
      dom.tcSonar.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        triggerManualSonar();
      });
    }
    if (dom.tcSnap) {
      dom.tcSnap.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        triggerManualSnapshot();
      });
    }

    dom.btnDock.addEventListener('click', function () {
      if (running && !docked) openDock('manual');
    });

    dom.btnMute.addEventListener('click', function () {
      window.MT.Audio.init();
      var next = !window.MT.Audio.isMuted();
      window.MT.Audio.setMuted(next);
      dom.btnMute.textContent = next ? '声景：关' : '声景：开';
      if (window.MT.Platform) window.MT.Platform.saveMuted(next);
    });

    if (dom.rotateHint) {
      dom.rotateHint.addEventListener('click', function () { dom.rotateHint.classList.add('dismissed'); });
    }

    if (dom.btnResetSave) {
      dom.btnResetSave.addEventListener('click', function () {
        if (!dom.btnResetSave.classList.contains('arming')) {
          dom.btnResetSave.classList.add('arming');
          dom.btnResetSave.textContent = '再次点击确认重置';
          return;
        }
        window.MT.Shop.resetProgress();
        resetCoachFlags();
        window.MT.Physics.refreshStats();
        updateRebirthBadges();
        dom.btnResetSave.classList.remove('arming');
        dom.btnResetSave.textContent = '已重置航图';
        renderWaypoints();
        renderShopGrid(null);
        renderCommissionsAndSkins();
      });
    }

    window.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') setTouchMode(true);
    }, true);

    window.addEventListener('keydown', function (e) {
      if (touchMode) setTouchMode(false);
      if (e.code === 'KeyG' && !e.repeat && codexOpen) { closeCodex(); return; }
      if (e.code === 'Escape' && dom.stampLightbox && !dom.stampLightbox.classList.contains('hidden')) { closeStampLightbox(); return; }
      if (e.code === 'Escape' && settingsOpen) { closeSettings(); return; }
      if (e.code === 'Escape' && codexOpen) { closeCodex(); return; }
      if (e.code === 'Escape' && running && !docked) { openSettings(); return; }
      if (!running || docked) return;
      var expK = !!(window.MT.Config && window.MT.Config.EXPLORE_MODE);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = true;
      if (expK) {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') { e.preventDefault(); input.up = true; }
        if (e.code === 'KeyS' || e.code === 'ArrowDown') { e.preventDefault(); input.down = true; }
        if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { e.preventDefault(); input.boost = true; }
        if (e.code === 'KeyE' && !e.repeat) {
          var bHarbor = window.MT.Physics.getBoat();
          if (bHarbor && bHarbor.inPortalZone) {
            var tgt = bHarbor.inPortalZone;
            switchRealm(tgt, tgt === 'frost_sea' ? 540 : 9380);
          } else if (bHarbor && bHarbor.inHarborZone) {
            if (window.MT.Audio && window.MT.Audio.playHarborMoor) window.MT.Audio.playHarborMoor();
            openDock('harbor');
          }
        }
        // 开发验收快捷切海：Shift + 1 切月潮之海 / Shift + 2 切霜穹冰海
        if (e.shiftKey && !e.repeat && e.code === 'Digit2') {
          switchRealm('frost_sea', 540);
        } else if (e.shiftKey && !e.repeat && e.code === 'Digit1') {
          switchRealm('moon_sea', 520);
        }
        if (e.code === 'KeyQ' && !e.repeat) {
          triggerManualSonar();
        }
        if (e.code === 'KeyP' && !e.repeat) {
          triggerManualSnapshot();
        }
        if (e.code === 'KeyG' && !e.repeat) {
          if (codexOpen) closeCodex();
          else openCodex();
        }
        if (e.code === 'KeyT' && !e.repeat && window.MT.Eras && window.MT.Eras.advanceWorldPhase) {
          var canDial = e.shiftKey || (window.MT.Shop && window.MT.Shop.isTimeWatchUnlocked && window.MT.Shop.isTimeWatchUnlocked());
          if (canDial) {
            window.MT.Eras.advanceWorldPhase();
            window.MT.Audio.playHookCatch();
          }
        }
      } else if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        input.boost = true;
      }
    });

    window.addEventListener('keyup', function (e) {
      var expK = !!(window.MT.Config && window.MT.Config.EXPLORE_MODE);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = false;
      if (expK) {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') input.up = false;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') input.down = false;
        if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.boost = false;
      } else if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        input.boost = false;
      }
    });

    if (dom.joyZone && dom.joyKnob) {
      var joyPtrId = null;
      var joyCenter = { x: 0, y: 0 };
      var maxRad = 40;
      var updateJoy = function (cx, cy) {
        var dx = cx - joyCenter.x;
        var dy = cy - joyCenter.y;
        var d = Math.hypot(dx, dy);
        if (d > maxRad) { dx = (dx / d) * maxRad; dy = (dy / d) * maxRad; }
        input.joyX = dx / maxRad;
        input.joyY = dy / maxRad;
        dom.joyKnob.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      };
      var resetJoy = function () {
        joyPtrId = null;
        input.joyX = 0;
        input.joyY = 0;
        dom.joyKnob.style.transform = 'translate(0px,0px)';
      };
      dom.joyZone.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        var rect = dom.joyZone.getBoundingClientRect();
        joyPtrId = e.pointerId;
        joyCenter.x = rect.left + rect.width * 0.5;
        joyCenter.y = rect.top + rect.height * 0.5;
        if (dom.joyZone.setPointerCapture) dom.joyZone.setPointerCapture(e.pointerId);
        updateJoy(e.clientX, e.clientY);
      });
      dom.joyZone.addEventListener('pointermove', function (e) {
        if (e.pointerId !== joyPtrId) return;
        e.preventDefault();
        updateJoy(e.clientX, e.clientY);
      });
      dom.joyZone.addEventListener('pointerup', function (e) { if (e.pointerId === joyPtrId) resetJoy(); });
      dom.joyZone.addEventListener('pointercancel', function (e) { if (e.pointerId === joyPtrId) resetJoy(); });
    }

    document.addEventListener('visibilitychange', function () { handlePause(document.hidden); });
    window.addEventListener('pagehide', function () { handlePause(true); });
    window.addEventListener('blur', function () { handlePause(true); });
    window.addEventListener('pageshow', function () { handlePause(false); });
    window.addEventListener('focus', function () { if (!document.hidden) handlePause(false); });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    bindHold(dom.tcLeft, function () { input.left = true; }, function () { input.left = false; });
    bindHold(dom.tcRight, function () { input.right = true; }, function () { input.right = false; });
    bindHold(dom.tcBoost, function () { input.boost = true; }, function () { input.boost = false; });
  }

  function loop(ts) {
    if (paused) {
      lastTime = 0;
      requestAnimationFrame(loop);
      return;
    }
    var dt = lastTime ? Math.min(0.05, (ts - lastTime) * 0.001) : 0.016;
    lastTime = ts;

    var boat = window.MT.Physics.getBoat();
    var eras = window.MT.Eras;

    var inHitstop = window.MT.RenderWorld.consumeHitstop && window.MT.RenderWorld.consumeHitstop(dt);

    if (running && !docked) {
      if (!inHitstop) {
        window.MT.Physics.update(dt, input, function (reason) {
          openDock(reason);
        });
        eras.update(dt, boat, onEraEvent);
        if (window.MT.LevelEngine) window.MT.LevelEngine.update(dt, boat, eras, onLevelEvent);
        updateContextualCoach(dt, boat, eras);
        updateBounty(boat, eras);
      }
      updateHUD();
    } else if (!running) {
      eras.update(dt * 0.55, boat, null);
      boat.y = eras.getSurfaceY(boat.x, eras.getTime());
      boat.angle = Math.atan(eras.getSurfaceSlope(boat.x, eras.getTime())) * 0.8;
    }

    var musicLv = boat.feverTimer > 0 ? 3 : (1 + Math.min(2, Math.floor(boat.trickCombo / 2)));
    var curEra = eras.getCurrentEra(boat.x);
    window.MT.Audio.update(dt, musicLv, eras.getMoonDescent(), curEra ? curEra.id : 'moon_sea');
    if (window.MT.Audio.updateBoatAmbience) {
      window.MT.Audio.updateBoatAmbience(boat, dt);
    }
    window.MT.RenderWorld.render(dt);

    requestAnimationFrame(loop);
  }

  function init() {
    cacheDom();
    if (window.MT.Platform) {
      window.MT.Platform.init(handlePause);
      if (window.MT.Platform.loadMuted()) {
        window.MT.Audio.setMuted(true);
        dom.btnMute.textContent = '声景：关';
      }
    }
    loadCoachFlags();
    window.MT.Shop.load();
    updateRebirthBadges();
    window.MT.Eras.reset(120, 'story');
    if (window.MT.LevelEngine) window.MT.LevelEngine.reset(120, 'story');
    window.MT.Physics.reset(120);
    window.MT.RenderWorld.init(dom.canvas);
    bindEvents();
    requestAnimationFrame(loop);
  }

  window.addEventListener('DOMContentLoaded', init);
  return { init: init, startRun: startRun };
})();
