(() => {
  const CB = window.CB;
  const game = CB.game;
  const { detectMobileDevice, clearAllHeldInputs, initInput, initTouchControls, syncMouseWorld } = CB.input;
  const { buildSectorSpec, createInitialVoyageNode } = CB.stages;
  const { generateMap } = CB.mapGen;
  const { placePlayerAtSpawn, updatePlayer, setVariant, spawnPopup } = CB.player;
  const { updateCombat } = CB.combat;
  const { populateGuardsForMap, updateGuards } = CB.guards;
  const { resetRunState, updateExtractionLoop, startNewVoyage, advanceVoyageToNode, bankVoyageAndFinish } = CB.extraction;
  const { initRenderer, refreshStageTheme, renderWorld } = CB.renderer;
  const { startIntro, skipIntro, isIntroActive, getProgress: getIntroProgress, updateIntro, renderIntro, renderIntroGate } = CB.intro;
  const {
    renderMinimap,
    updateStatsBanner,
    updateCombatHud,
    setHubCallbacks,
    openHub,
    closeHub,
    switchHubTab,
    updateTitleCard,
    updateTouchHud,
    openChartModal,
    closeChartModal,
    openMarketModal,
    closeMarketModal,
    openDailyModal,
    closeDailyModal,
  } = CB.ui;

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const miniCanvas = document.getElementById('minimapCanvas');
  const mctx = miniCanvas.getContext('2d');
  const statsEl = document.getElementById('mapStats');
  const hudTopEl = document.getElementById('hudTop');
  const minimapWrapEl = document.getElementById('minimapWrap');
  const pcHintBarEl = document.getElementById('pcHintBar');
  const titleOverlayEl = document.getElementById('titleOverlay');
  const touchControlsEl = document.getElementById('touchControls');
  const quickDrawerEl = document.getElementById('quickDrawer');
  const portraitOverlayEl = document.getElementById('portraitOverlay');
  const introGateOverlayEl = document.getElementById('introGateOverlay');
  const introGatePromptEl = document.getElementById('introGatePrompt');
  const introOverlayEl = document.getElementById('introOverlay');
  const introProgressFillEl = document.getElementById('introProgressFill');
  const settingsModalEl = document.getElementById('settingsModal');
  const pauseModalEl = document.getElementById('pauseModal');

  const hudEls = {
    hpFill: document.getElementById('hpFill'),
    hpText: document.getElementById('hpText'),
    shieldPill: document.getElementById('shieldPill'),
    shieldText: document.getElementById('shieldText'),
    activeSkillPill: document.getElementById('activeSkillPill'),
    activeSkillText: document.getElementById('activeSkillText'),
    orbTray: document.getElementById('orbTray'),
    coinEl: document.getElementById('coinCount'),
    stuntEl: document.getElementById('stuntValue'),
    haulEl: document.getElementById('haulValue'),
    bankEl: document.getElementById('bankValue'),
    hubBadge: document.getElementById('hubBadge'),
    guardEl: document.getElementById('guardCount'),
    objEl: document.getElementById('objectiveBanner'),
    curioTray: document.getElementById('curioTray'),
  };

  const touchEls = {
    movePad: document.getElementById('touchMovePad'),
    moveZone: document.getElementById('touchMoveZone'),
    moveKnob: document.getElementById('touchMoveKnob'),
    aimZone: document.getElementById('touchAimZone'),
    aimRing: document.getElementById('touchAimRing'),
    aimKnob: document.getElementById('touchAimKnob'),
    aimLabel: document.getElementById('touchAimLabel'),
    cancelZone: document.getElementById('touchCancelZone'),
    dashBtn: document.getElementById('touchDashBtn'),
    skillBtn: document.getElementById('touchSkillBtn'),
    skillIcon: document.getElementById('touchSkillIcon'),
    skillLabel: document.getElementById('touchSkillLabel'),
    interactBtn: document.getElementById('touchInteractBtn'),
    interactIcon: document.getElementById('touchInteractIcon'),
    interactLabel: document.getElementById('touchInteractLabel'),
  };

  let stageButtons = [];
  let variantButtons = [];
  let btnMenuToggleRef = null;
  let btnAudioRef = null;
  let btnOverviewRef = null;
  let btnTouchModeRef = null;
  let btnFullscreenRef = null;
  let btnTitleFullscreenRef = null;
  let btnPauseFullscreenRef = null;
  let reopenPauseAfterHub = false;
  let lastTime = performance.now();
  let lastMinimapTime = 0;

  function getViewportSize() {
    const vv = window.visualViewport;
    if (vv && vv.width > 0 && vv.height > 0) {
      return { w: Math.round(vv.width), h: Math.round(vv.height) };
    }
    return { w: window.innerWidth, h: window.innerHeight };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vp = getViewportSize();
    game.viewW = vp.w;
    game.viewH = vp.h;
    canvas.width = Math.floor(game.viewW * dpr);
    canvas.height = Math.floor(game.viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    syncOrientationGuide();
    syncTouchControlsUI();
  }

  function resolvePlatform() {
    if (game.touchMode === 'on') return 'mobile';
    if (game.touchMode === 'off') return 'pc';
    // 自动模式：根据真实输入源与设备特征分离 PC / 移动端
    if (game.lastInputKind === 'touch') return 'mobile';
    if (game.lastInputKind === 'mouse') return 'pc';
    return detectMobileDevice() ? 'mobile' : 'pc';
  }

  function syncOrientationGuide() {
    const plat = resolvePlatform();
    const isPortrait = window.innerHeight > window.innerWidth * 1.06;
    if (!isPortrait) {
      game.portraitDismissed = false;
    }
    const shouldPrompt = isPortrait && plat === 'mobile' && !game.portraitDismissed;
    game.portraitBlocked = shouldPrompt;
    if (shouldPrompt) clearAllHeldInputs();
    if (portraitOverlayEl) {
      portraitOverlayEl.classList.toggle('hidden', !shouldPrompt);
    }
  }

  function isEmbeddedH5Container() {
    const ua = navigator.userAgent || '';
    const inIframe = (() => {
      try { return window.self !== window.top; } catch (_) { return true; }
    })();
    const isWebViewUA = /TapTap|TapPlay|InstantGame|wv\)|WebView|MicroMessenger|QQ\//i.test(ua);
    const hasTapBridge = !!(window.TapTap || window.tap || window.jsBridge || window.webkit?.messageHandlers);
    return inIframe || isWebViewUA || hasTapBridge;
  }

  function canUseFullscreen() {
    if (isEmbeddedH5Container()) return false;
    const docEl = document.documentElement;
    const hasApi = !!(docEl && (docEl.requestFullscreen || docEl.webkitRequestFullscreen));
    const enabled = document.fullscreenEnabled !== false && document.webkitFullscreenEnabled !== false;
    const isStandalone = !!(window.navigator && window.navigator.standalone);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    return hasApi && enabled && !isStandalone && !isIOS;
  }

  function isFullscreenActive() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function syncFullscreenUI() {
    const supported = canUseFullscreen();
    const active = isFullscreenActive();
    if (btnFullscreenRef) {
      btnFullscreenRef.classList.toggle('hidden', !supported);
      btnFullscreenRef.textContent = active ? '⛶ 退出全屏' : '⛶ 全屏显示';
      btnFullscreenRef.classList.toggle('active', active);
    }
    if (btnTitleFullscreenRef) {
      btnTitleFullscreenRef.classList.toggle('hidden', !supported);
      btnTitleFullscreenRef.textContent = active ? '🗗' : '⛶';
      btnTitleFullscreenRef.title = active ? '退出全屏' : '全屏显示';
    }
    if (btnPauseFullscreenRef) {
      btnPauseFullscreenRef.classList.toggle('hidden', !supported);
      btnPauseFullscreenRef.textContent = active ? '⛶ 退出全屏' : '⛶ 全屏';
      btnPauseFullscreenRef.classList.toggle('active', active);
    }
  }

  function toggleFullscreen() {
    if (!canUseFullscreen()) return;
    if (CB.audio) {
      CB.audio.unlock();
      if (CB.audio.playUiClick) CB.audio.playUiClick();
    }
    const docEl = document.documentElement;
    const active = isFullscreenActive();
    if (active) {
      const exitFn = document.exitFullscreen || document.webkitExitFullscreen;
      if (exitFn) {
        Promise.resolve(exitFn.call(document)).catch(() => {});
      }
      return;
    }
    const reqFn = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
    if (!reqFn) return;
    Promise.resolve(reqFn.call(docEl))
      .then(() => {
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          window.screen.orientation.lock('landscape').catch(() => {});
        }
        syncFullscreenUI();
      })
      .catch(() => {});
  }

  function syncStageUI() {}

  function syncSkinUI() {
    const isUnlocked = (id) => (CB.extraction && CB.extraction.isSkinUnlocked ? CB.extraction.isSkinUnlocked(id) : true);
    const codeMap = { explorer: 'A', porcelain: 'B', sprout: 'C' };
    variantButtons.forEach((btn) => {
      const id = btn.dataset.variant;
      const unlocked = isUnlocked(id);
      btn.classList.toggle('active', game.variant === id);
      btn.classList.toggle('skin-locked', !unlocked);
      btn.textContent = unlocked ? codeMap[id] : `${codeMap[id]} 🔒`;
      btn.title = unlocked ? '点击切换探险家外观' : '未解锁外观 · 点击打开飞艇母港解锁';
    });
  }

  function syncTouchControlsUI() {
    const plat = resolvePlatform();
    const isMobile = plat === 'mobile';
    game.platform = plat;
    game.touchActive = isMobile;

    document.body.classList.toggle('platform-pc', !isMobile);
    document.body.classList.toggle('platform-mobile', isMobile);

    const showTouch = isMobile && !game.introGateOpen && !game.introActive && !game.titleOpen && !game.hubOpen && !game.paused && !game.chartOpen && !game.marketOpen && !game.dailyOpen && !game.portraitBlocked && game.run.phase === 'playing';
    if (touchControlsEl) {
      touchControlsEl.classList.toggle('hidden', !showTouch);
    }
    if (pcHintBarEl) {
      const showPcHint = !isMobile && !game.introGateOpen && !game.introActive && !game.titleOpen && !game.hubOpen && !game.paused && !game.chartOpen && !game.marketOpen && !game.dailyOpen && game.run.phase === 'playing';
      pcHintBarEl.classList.toggle('hud-hidden', !showPcHint);
    }
    if (btnTouchModeRef) {
      const labelMap = {
        auto: isMobile ? '📱 布局: 自动(移动)' : '💻 布局: 自动(PC)',
        on: '📱 布局: 移动端',
        off: '💻 布局: PC端',
      };
      btnTouchModeRef.textContent = labelMap[game.touchMode] || '💻 布局: 自动(PC)';
      btnTouchModeRef.classList.toggle('active', game.touchMode !== 'auto');
    }
    if (introGatePromptEl) {
      introGatePromptEl.textContent = isMobile
        ? '🔊 轻触任意处 · 开启声画序幕'
        : '🔊 点击任意处 / 按空格 · 开启声画序幕';
    }
    if (game.titleOpen) updateTitleCard();
  }

  function setDrawerOpen(open) {
    game.menuOpen = !!open;
    if (quickDrawerEl) quickDrawerEl.classList.toggle('hidden', !game.menuOpen);
    if (btnMenuToggleRef) btnMenuToggleRef.classList.toggle('active', game.menuOpen);
  }

  function syncChromeVisibility() {
    const inGate = !!game.introGateOpen;
    const inIntro = !!game.introActive && !inGate;
    const onTitle = !!game.titleOpen && !inIntro && !inGate;
    const hidePlayHud = inGate || inIntro || onTitle;
    if (introGateOverlayEl) introGateOverlayEl.classList.toggle('hidden', !inGate);
    if (introOverlayEl) introOverlayEl.classList.toggle('hidden', !inIntro);
    if (titleOverlayEl) titleOverlayEl.classList.toggle('hidden', !onTitle);
    if (hudTopEl) hudTopEl.classList.toggle('hud-hidden', hidePlayHud);
    if (minimapWrapEl) minimapWrapEl.classList.toggle('hud-hidden', hidePlayHud);
    if (hidePlayHud) {
      setDrawerOpen(false);
    }
    if (onTitle) {
      updateTitleCard();
    }
    syncTouchControlsUI();
  }

  function syncSettingsUI() {
    const btnSetAudio = document.getElementById('btnSetAudio');
    const btnSetLayout = document.getElementById('btnSetLayout');
    const btnSetAutoIntro = document.getElementById('btnSetAutoIntro');
    if (btnSetAudio) {
      btnSetAudio.textContent = game.audioMuted ? '静音' : '开启';
      btnSetAudio.classList.toggle('active', !game.audioMuted);
    }
    if (btnSetLayout) {
      const lbl = {
        auto: game.platform === 'mobile' ? '自动(移动)' : '自动(PC)',
        on: '强制移动',
        off: '强制PC',
      }[game.touchMode] || '自动';
      btnSetLayout.textContent = lbl;
      btnSetLayout.classList.toggle('active', game.touchMode !== 'auto');
    }
    if (btnSetAutoIntro) {
      const autoOn = game.meta.autoPlayIntro !== false;
      btnSetAutoIntro.textContent = autoOn ? '开启' : '跳过';
      btnSetAutoIntro.classList.toggle('active', autoOn);
    }
  }

  function setSettingsOpen(open) {
    game.settingsOpen = !!open;
    if (settingsModalEl) settingsModalEl.classList.toggle('hidden', !game.settingsOpen);
    if (game.settingsOpen) syncSettingsUI();
  }

  function syncPauseUI() {
    const st = (game.map && game.map.stage) || null;
    const stageEl = document.getElementById('pauseStageBadge');
    const hpEl = document.getElementById('pauseHp');
    const haulEl = document.getElementById('pauseHaul');
    const guardsEl = document.getElementById('pauseGuards');
    const timeEl = document.getElementById('pauseTime');
    const btnPAudio = document.getElementById('btnPauseAudio');
    const btnPLayout = document.getElementById('btnPauseLayout');

    if (stageEl && st) stageEl.textContent = `第 ${st.leg || 1} 航段 · ${st.altitude || 1200}m`;
    if (hpEl) hpEl.textContent = `${Math.ceil(game.player.hp)}/${game.player.maxHp}`;
    if (haulEl && CB.extraction) haulEl.textContent = `${CB.extraction.getTotalHaulValue()}`;
    if (guardsEl) guardsEl.textContent = `${game.guards.length}`;
    if (timeEl) {
      const mm = Math.floor(game.run.elapsed / 60);
      const ss = String(Math.floor(game.run.elapsed % 60)).padStart(2, '0');
      timeEl.textContent = `${mm}:${ss}`;
    }
    if (btnPAudio) {
      btnPAudio.textContent = game.audioMuted ? '🔇 音效: 关' : '🔊 音效: 开';
      btnPAudio.classList.toggle('active', !game.audioMuted);
    }
    if (btnPLayout) {
      const lbl = {
        auto: game.platform === 'mobile' ? '📱 布局: 自动(移动)' : '💻 布局: 自动(PC)',
        on: '📱 布局: 移动端',
        off: '💻 布局: PC端',
      }[game.touchMode] || '💻 布局: 自动';
      btnPLayout.textContent = lbl;
      btnPLayout.classList.toggle('active', game.touchMode !== 'auto');
    }
    syncFullscreenUI();
  }

  function setGamePaused(paused, silent = false) {
    const want = !!paused;
    if (want && (game.run.phase !== 'playing' || game.titleOpen || game.introActive)) return;
    game.paused = want;
    if (want) {
      clearAllHeldInputs();
      setDrawerOpen(false);
      syncPauseUI();
    } else {
      lastTime = performance.now();
    }
    if (pauseModalEl) pauseModalEl.classList.toggle('hidden', !game.paused);
    if (!silent && CB.audio && CB.audio.playUiClick) CB.audio.playUiClick();
    syncTouchControlsUI();
  }

  function openIntroGate() {
    clearAllHeldInputs();
    reopenPauseAfterHub = false;
    setGamePaused(false, true);
    if (game.chartOpen) closeChartModal();
    if (game.marketOpen) closeMarketModal();
    if (game.dailyOpen) closeDailyModal();
    if (game.hubOpen) closeHub();
    setDrawerOpen(false);
    setSettingsOpen(false);
    game.titleOpen = false;
    game.introActive = false;
    game.introGateOpen = true;
    syncChromeVisibility();
  }

  function launchFromIntroGate(skipToTitle = false) {
    if (!game.introGateOpen) return;
    game.introGateOpen = false;
    const proceed = () => {
      if (skipToTitle) {
        if (CB.audio && CB.audio.playUiClick) CB.audio.playUiClick();
        openTitleScreen();
      } else {
        playOpeningCutscene();
      }
    };
    if (CB.audio && CB.audio.unlock) {
      CB.audio.unlock(proceed);
    } else {
      proceed();
    }
  }

  function playOpeningCutscene() {
    clearAllHeldInputs();
    reopenPauseAfterHub = false;
    setGamePaused(false, true);
    if (game.chartOpen) closeChartModal();
    if (game.marketOpen) closeMarketModal();
    if (game.dailyOpen) closeDailyModal();
    if (game.hubOpen) closeHub();
    reopenPauseAfterHub = false;
    setGamePaused(false, true);
    setDrawerOpen(false);
    setSettingsOpen(false);
    game.introGateOpen = false;
    game.titleOpen = false;
    game.introActive = true;
    if (titleOverlayEl) titleOverlayEl.classList.remove('title-reveal');
    if (introProgressFillEl) introProgressFillEl.style.width = '0%';
    startIntro(() => {
      game.introActive = false;
      game.titleOpen = true;
      if (titleOverlayEl) {
        titleOverlayEl.classList.remove('title-reveal');
        void titleOverlayEl.offsetWidth;
        titleOverlayEl.classList.add('title-reveal');
      }
      syncFullscreenUI();
      syncOrientationGuide();
      syncChromeVisibility();
    });
    syncChromeVisibility();
  }

  function enterGameFromTitle(relaunch = false) {
    if (CB.audio) {
      CB.audio.unlock();
      if (CB.audio.setAmbienceStage) CB.audio.setAmbienceStage(game.currentStageId);
      if (CB.audio.playUiClick) CB.audio.playUiClick();
    }
    game.titleOpen = false;
    game.mapOverview = false;
    if (btnOverviewRef) {
      btnOverviewRef.classList.remove('active');
      btnOverviewRef.textContent = '🗺 全图';
    }
    if (relaunch || game.meta.loadoutCurioId) {
      startStage(null, { keepCurios: false, stayOnTitle: false });
    } else {
      game.stageBannerTimer = 3.2;
      syncChromeVisibility();
      const st = game.map && game.map.stage;
      spawnPopup(game.player.x, game.player.y - 46, st ? `第 ${st.leg || 1} 航段 · 海拔 ${st.altitude || 1200}m` : '启航云海', '#24808f');
    }
  }

  function openTitleScreen() {
    clearAllHeldInputs();
    reopenPauseAfterHub = false;
    setGamePaused(false, true);
    if (game.hubOpen) closeHub();
    setDrawerOpen(false);
    game.introGateOpen = false;
    game.titleOpen = true;
    game.mapOverview = false;
    if (btnOverviewRef) {
      btnOverviewRef.classList.remove('active');
      btnOverviewRef.textContent = '🗺 全图';
    }
    syncFullscreenUI();
    syncOrientationGuide();
    syncChromeVisibility();
  }

  function startStage(nodeOrStage = null, opts = {}) {
    const keepCurios = !!opts.keepCurios;
    const customSeed = opts.customSeed ?? null;
    const stayOnTitle = !!opts.stayOnTitle;

    let sectorNode = null;
    if (nodeOrStage && typeof nodeOrStage === 'object' && nodeOrStage.anomalies) {
      sectorNode = nodeOrStage;
    } else if (!keepCurios) {
      sectorNode = startNewVoyage(createInitialVoyageNode((game.meta.runs || 0) === 0));
    } else {
      sectorNode = (game.voyage && game.voyage.currentNode) || startNewVoyage(createInitialVoyageNode(false));
    }

    const sectorSpec = buildSectorSpec(sectorNode);
    game.currentStageId = sectorSpec.id;
    game.map = generateMap(sectorSpec, customSeed ?? undefined);
    refreshStageTheme(ctx, game.map.stage);
    if (CB.audio && CB.audio.setAmbienceStage) CB.audio.setAmbienceStage(sectorSpec.id);

    game.bullets = [];
    game.enemyBullets = [];
    game.ripples = [];
    game.inkPuddles = [];
    game.pollenClouds = [];
    game.vortices = [];
    game.coinsList = [];
    game.droppedOrbs = [];
    game.orbReturnFlies = [];
    game.skillPacks = [];
    game.galeWaves = [];
    game.focusSpots = [];
    game.laserWebs = [];
    game.lightningArcs = [];
    game.dilationBubbles = [];
    game.fallingGuards = [];
    game.fallingCrates = [];
    game.hitStop = 0;
    game.stageBannerTimer = stayOnTitle ? 0 : 3.4;

    if (!stayOnTitle) {
      game.titleOpen = false;
    }

    const savedLoadout = stayOnTitle ? game.meta.loadoutCurioId : null;
    if (stayOnTitle) game.meta.loadoutCurioId = null;
    resetRunState(keepCurios);
    if (stayOnTitle && savedLoadout) {
      game.meta.loadoutCurioId = savedLoadout;
    }

    placePlayerAtSpawn(!keepCurios);
    populateGuardsForMap(game.map);
    spawnButterflies(game.map);
    reopenPauseAfterHub = false;
    setGamePaused(false, true);
    if (game.chartOpen) closeChartModal();
    if (game.marketOpen) closeMarketModal();
    if (game.dailyOpen) closeDailyModal();
    if (game.hubOpen) closeHub();
    setDrawerOpen(false);
    lastMinimapTime = 0;
    updateStatsBanner(statsEl);
    updateCombatHud(hudEls);
    syncSkinUI();
    syncChromeVisibility();

    if (!stayOnTitle) {
      if (game.run.deployedLoadoutCurio) {
        const dc = game.run.deployedLoadoutCurio;
        spawnPopup(game.player.x, game.player.y - 72, `📦 补给舱装填 · ${dc.icon} ${dc.name}`, '#1f8a70');
      }

      spawnPopup(
        game.player.x,
        game.player.y - 46,
        keepCurios
          ? `飞抵第 ${sectorSpec.leg} 航段 · ${sectorSpec.altitude}m（续航 +30HP）`
          : `第 ${sectorSpec.leg} 航段 · 海拔 ${sectorSpec.altitude}m · ${sectorSpec.omenIcons}`,
        '#24808f'
      );
    }
  }

  function handleBankAndReturnToPort() {
    const banked = bankVoyageAndFinish();
    if (CB.audio && CB.audio.playUpgradeBuy) CB.audio.playUpgradeBuy();
    startStage(null, { keepCurios: false, stayOnTitle: true });
    openTitleScreen();
    openHub('workshop');
    if (banked > 0) {
      spawnPopup(game.player.x, game.player.y - 46, `🏛 已安全入库 +${banked} 资产!`, '#248a72');
    }
  }

  function startDailyChallenge(spec) {
    if (!spec || !spec.node) return;
    startNewVoyage(spec.node);
    startStage(spec.node, { keepCurios: false, customSeed: spec.seed, stayOnTitle: false });
    spawnPopup(game.player.x, game.player.y - 74, `📅 每日云海 #${spec.seed} · 达成 3 项悬赏赢金库奖励!`, '#c98212');
  }

  function openVoyageChart() {
    openChartModal(
      (chosenNode) => {
        if (chosenNode && chosenNode.nodeType === 'market') {
          advanceVoyageToNode(chosenNode);
          if (CB.stages && CB.stages.generateNextChoices) {
            game.voyage.nextChoices = CB.stages.generateNextChoices((game.voyage.leg || 1) + 1, chosenNode);
          }
          openMarketModal(
            () => {
              openVoyageChart();
            },
            () => {
              handleBankAndReturnToPort();
            }
          );
          return;
        }
        advanceVoyageToNode(chosenNode);
        startStage(chosenNode, { keepCurios: true, stayOnTitle: false });
      },
      () => {
        handleBankAndReturnToPort();
      }
    );
  }

  function advanceAfterSummary() {
    if (game.run.phase === 'extracted') {
      openVoyageChart();
    } else {
      startStage(null, { keepCurios: false, stayOnTitle: false });
    }
  }

  function setupUI() {
    const btnRegen = document.getElementById('btnRegen');
    if (hudEls.activeSkillPill) {
      hudEls.activeSkillPill.addEventListener('click', () => {
        if (game.run.phase === 'playing' && CB.player && CB.player.activateHeldSkill) {
          CB.player.activateHeldSkill();
        }
      });
    }
    const btnOverview = document.getElementById('btnOverview');
    const btnAudio = document.getElementById('btnAudio');
    const btnResetSave = document.getElementById('btnResetSave');
    const btnAgeBadge = document.getElementById('btnAgeBadge');
    const ageModal = document.getElementById('ageModal');
    const btnCloseAge = document.getElementById('btnCloseAge');
    const btnConfirmAge = document.getElementById('btnConfirmAge');
    const btnMenuToggle = document.getElementById('btnMenuToggle');
    const btnCloseDrawer = document.getElementById('btnCloseDrawer');
    const btnTouchMode = document.getElementById('btnTouchMode');
    const btnFullscreen = document.getElementById('btnFullscreen');
    const btnBackTitle = document.getElementById('btnBackTitle');
    const btnDismissPortrait = document.getElementById('btnDismissPortrait');
    const btnNextRun = document.getElementById('btnNextRun');
    const btnBankReturn = document.getElementById('btnBankReturn');
    const btnRetrySeed = document.getElementById('btnRetrySeed');
    const btnOpenHub = document.getElementById('btnOpenHub');
    const btnOpenCodex = document.getElementById('btnOpenCodex');
    const btnPauseGame = document.getElementById('btnPauseGame');
    const btnPauseResume = document.getElementById('btnPauseResume');
    const btnPauseHub = document.getElementById('btnPauseHub');
    const btnPauseCodex = document.getElementById('btnPauseCodex');
    const btnPauseRestart = document.getElementById('btnPauseRestart');
    const btnPauseTitle = document.getElementById('btnPauseTitle');
    const btnPauseAudio = document.getElementById('btnPauseAudio');
    const btnPauseLayout = document.getElementById('btnPauseLayout');
    const btnPauseFullscreen = document.getElementById('btnPauseFullscreen');
    const btnCloseHub = document.getElementById('btnCloseHub');
    const btnHubResume = document.getElementById('btnHubResume');
    const btnHubLaunch = document.getElementById('btnHubLaunch');
    const btnGateSkip = document.getElementById('btnGateSkip');
    const btnSkipIntro = document.getElementById('btnSkipIntro');
    const btnReplayIntro = document.getElementById('btnReplayIntro');
    const btnTitleStart = document.getElementById('btnTitleStart');
    const btnTitleDaily = document.getElementById('btnTitleDaily');
    const dailyModalEl = document.getElementById('dailyModal');
    const btnTitleHub = document.getElementById('btnTitleHub');
    const btnTitleCodex = document.getElementById('btnTitleCodex');
    const btnTitleSettings = document.getElementById('btnTitleSettings');
    const btnTitleAudio = document.getElementById('btnTitleAudio');
    const btnTitleFullscreen = document.getElementById('btnTitleFullscreen');
    const btnCloseSettings = document.getElementById('btnCloseSettings');
    const btnSetAudio = document.getElementById('btnSetAudio');
    const btnSetLayout = document.getElementById('btnSetLayout');
    const btnSetAutoIntro = document.getElementById('btnSetAutoIntro');
    const btnSetReplayIntro = document.getElementById('btnSetReplayIntro');
    const btnSetResetSave = document.getElementById('btnSetResetSave');
    const hubModal = document.getElementById('hubModal');
    const hubTabs = document.querySelectorAll('[data-hub-tab]');

    btnMenuToggleRef = btnMenuToggle;
    btnAudioRef = btnAudio;
    btnOverviewRef = btnOverview;
    btnTouchModeRef = btnTouchMode;
    btnFullscreenRef = btnFullscreen;
    btnTitleFullscreenRef = btnTitleFullscreen;
    btnPauseFullscreenRef = btnPauseFullscreen;
    variantButtons = Array.from(document.querySelectorAll('[data-variant]'));
    stageButtons = [];

    const toggleOverview = () => {
      if (game.run.phase !== 'playing' || game.titleOpen) return;
      game.mapOverview = !game.mapOverview;
      if (btnOverview) {
        btnOverview.classList.toggle('active', game.mapOverview);
        btnOverview.textContent = game.mapOverview ? '🗺 近景' : '🗺 全图';
      }
    };



    const toggleAudio = () => {
      const nextMuted = !game.audioMuted;
      if (CB.audio) {
        CB.audio.unlock();
        CB.audio.setMuted(nextMuted);
      }
      if (btnAudio) {
        btnAudio.classList.toggle('active', !nextMuted);
        btnAudio.textContent = nextMuted ? '🔇 静音' : '🔊 音效';
      }
      updateTitleCard();
      syncSettingsUI();
      if (game.paused) syncPauseUI();
    };

    const cycleTouchMode = () => {
      const order = ['auto', 'on', 'off'];
      const nextIdx = (order.indexOf(game.touchMode) + 1) % order.length;
      game.touchMode = order[nextIdx];
      if (CB.audio && CB.audio.playUiClick) CB.audio.playUiClick();
      syncOrientationGuide();
      syncTouchControlsUI();
      syncSettingsUI();
      if (game.paused) syncPauseUI();
    };

    const selectVariant = (v) => {
      if (CB.extraction && CB.extraction.isSkinUnlocked && !CB.extraction.isSkinUnlocked(v)) {
        if (CB.audio && CB.audio.playUiLocked) CB.audio.playUiLocked();
        setDrawerOpen(false);
        openHub('workshop');
        return;
      }
      if (CB.extraction && CB.extraction.unlockOrSelectSkin) {
        CB.extraction.unlockOrSelectSkin(v);
      } else {
        setVariant(v);
      }
      syncSkinUI();
    };

    if (btnRegen) btnRegen.addEventListener('click', () => startStage(null, { keepCurios: false }));
    if (btnOverview) btnOverview.addEventListener('click', toggleOverview);
    let resetConfirmTimer = null;
    let resetArmed = false;
    const clearResetConfirm = () => {
      resetArmed = false;
      if (resetConfirmTimer) {
        clearTimeout(resetConfirmTimer);
        resetConfirmTimer = null;
      }
      if (btnResetSave) {
        btnResetSave.classList.remove('confirming');
        btnResetSave.textContent = '🗑 重置本地存档';
      }
    };
    if (btnResetSave) {
      btnResetSave.addEventListener('click', () => {
        if (!resetArmed) {
          resetArmed = true;
          btnResetSave.classList.add('confirming');
          btnResetSave.textContent = '⚠ 再次点击确认清空';
          if (CB.audio && CB.audio.playUiLocked) CB.audio.playUiLocked();
          resetConfirmTimer = setTimeout(clearResetConfirm, 3200);
          return;
        }
        clearResetConfirm();
        if (CB.extraction && CB.extraction.resetMeta) CB.extraction.resetMeta();
        if (CB.audio && CB.audio.playUiClick) CB.audio.playUiClick();
        setDrawerOpen(false);
        startStage(null, { keepCurios: false, stayOnTitle: false });
        spawnPopup(game.player.x, game.player.y - 46, '已重置本地存档', '#c95c1e');
      });
    }

    const setAgeModalOpen = (open) => {
      if (!ageModal) return;
      ageModal.classList.toggle('hidden', !open);
      if (CB.audio && CB.audio.playUiClick) CB.audio.playUiClick();
    };
    if (btnAgeBadge) btnAgeBadge.addEventListener('click', () => setAgeModalOpen(true));
    if (btnCloseAge) btnCloseAge.addEventListener('click', () => setAgeModalOpen(false));
    if (btnConfirmAge) btnConfirmAge.addEventListener('click', () => setAgeModalOpen(false));
    if (ageModal) {
      ageModal.addEventListener('click', (e) => {
        if (e.target === ageModal) setAgeModalOpen(false);
      });
    }
    if (btnAudio) btnAudio.addEventListener('click', toggleAudio);
    if (btnTouchMode) btnTouchMode.addEventListener('click', cycleTouchMode);
    if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);
    if (btnBackTitle) btnBackTitle.addEventListener('click', openTitleScreen);
    if (btnDismissPortrait) {
      btnDismissPortrait.addEventListener('click', () => {
        if (CB.audio) {
          CB.audio.unlock();
          if (CB.audio.playUiClick) CB.audio.playUiClick();
        }
        game.portraitDismissed = true;
        syncOrientationGuide();
        syncTouchControlsUI();
      });
    }

    // 触控快捷手势：直接点击右上角小地图即可一键切换全图俯瞰（且不穿透误射）
    if (minimapWrapEl) {
      minimapWrapEl.addEventListener('mousedown', (e) => e.stopPropagation());
      minimapWrapEl.addEventListener('pointerdown', (e) => e.stopPropagation());
    }
    if (miniCanvas) {
      miniCanvas.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.run.phase !== 'playing' || game.titleOpen || game.hubOpen) return;
        if (CB.audio && CB.audio.playUiClick) CB.audio.playUiClick();
        toggleOverview();
      });
    }

    document.addEventListener('fullscreenchange', syncFullscreenUI);
    document.addEventListener('webkitfullscreenchange', syncFullscreenUI);

    if (btnMenuToggle) {
      btnMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (CB.audio && CB.audio.playUiClick) CB.audio.playUiClick();
        setDrawerOpen(!game.menuOpen);
      });
    }
    if (btnCloseDrawer) {
      btnCloseDrawer.addEventListener('click', () => setDrawerOpen(false));
    }
    window.addEventListener('mousedown', (e) => {
      if (!game.menuOpen) return;
      if (quickDrawerEl && !quickDrawerEl.contains(e.target) && e.target !== btnMenuToggle) {
        setDrawerOpen(false);
      }
    });

    // 云海启幕门扉交互（点击任意处同步解锁 Web Audio 并从 0.0s 完整播片头）
    if (btnGateSkip) {
      btnGateSkip.addEventListener('click', (e) => {
        e.stopPropagation();
        launchFromIntroGate(true);
      });
    }
    if (introGateOverlayEl) {
      introGateOverlayEl.addEventListener('click', () => {
        launchFromIntroGate(false);
      });
    }

    // 10 秒开场动画交互（点跳过立刻进主菜单；轻触画面解锁音频）
    if (btnSkipIntro) {
      btnSkipIntro.addEventListener('click', (e) => {
        e.stopPropagation();
        if (CB.audio) {
          CB.audio.unlock();
          if (CB.audio.playUiClick) CB.audio.playUiClick();
        }
        skipIntro();
      });
    }
    if (introOverlayEl) {
      introOverlayEl.addEventListener('pointerdown', () => {
        if (CB.audio) CB.audio.unlock();
      });
    }

    // 动态开场初始化主菜单交互
    if (btnReplayIntro) {
      btnReplayIntro.addEventListener('click', () => {
        if (CB.audio) {
          CB.audio.unlock();
          if (CB.audio.playUiClick) CB.audio.playUiClick();
        }
        playOpeningCutscene();
      });
    }
    if (btnTitleStart) btnTitleStart.addEventListener('click', () => enterGameFromTitle(false));
    if (btnTitleDaily) {
      btnTitleDaily.addEventListener('click', () => {
        if (CB.audio) {
          CB.audio.unlock();
          if (CB.audio.playUiClick) CB.audio.playUiClick();
        }
        openDailyModal((spec) => startDailyChallenge(spec));
      });
    }
    if (dailyModalEl) {
      dailyModalEl.addEventListener('click', (e) => {
        if (e.target === dailyModalEl) closeDailyModal();
      });
    }
    if (btnTitleHub) btnTitleHub.addEventListener('click', () => {
      if (CB.audio) CB.audio.unlock();
      openHub('workshop');
    });
    if (btnTitleCodex) btnTitleCodex.addEventListener('click', () => {
      if (CB.audio) CB.audio.unlock();
      openHub('curios');
    });
    if (btnTitleSettings) {
      btnTitleSettings.addEventListener('click', () => {
        if (CB.audio) {
          CB.audio.unlock();
          if (CB.audio.playUiClick) CB.audio.playUiClick();
        }
        setSettingsOpen(true);
      });
    }
    if (btnTitleAudio) btnTitleAudio.addEventListener('click', toggleAudio);
    if (btnTitleFullscreen) btnTitleFullscreen.addEventListener('click', toggleFullscreen);

    // 初始化设置弹窗交互
    if (btnCloseSettings) {
      btnCloseSettings.addEventListener('click', () => {
        if (CB.audio && CB.audio.playUiClick) CB.audio.playUiClick();
        setSettingsOpen(false);
      });
    }
    if (settingsModalEl) {
      settingsModalEl.addEventListener('click', (e) => {
        if (e.target === settingsModalEl) setSettingsOpen(false);
      });
    }
    if (btnSetAudio) btnSetAudio.addEventListener('click', toggleAudio);
    if (btnSetLayout) btnSetLayout.addEventListener('click', cycleTouchMode);
    if (btnSetAutoIntro) {
      btnSetAutoIntro.addEventListener('click', () => {
        game.meta.autoPlayIntro = !(game.meta.autoPlayIntro !== false);
        if (CB.extraction && CB.extraction.saveMeta) CB.extraction.saveMeta();
        if (CB.audio && CB.audio.playUiClick) CB.audio.playUiClick();
        syncSettingsUI();
      });
    }
    if (btnSetReplayIntro) {
      btnSetReplayIntro.addEventListener('click', () => {
        if (CB.audio) {
          CB.audio.unlock();
          if (CB.audio.playUiClick) CB.audio.playUiClick();
        }
        playOpeningCutscene();
      });
    }

    let setResetTimer = null;
    let setResetArmed = false;
    const clearSetReset = () => {
      setResetArmed = false;
      if (setResetTimer) { clearTimeout(setResetTimer); setResetTimer = null; }
      if (btnSetResetSave) {
        btnSetResetSave.classList.remove('confirming');
        btnSetResetSave.textContent = '🗑 重置本地存档';
      }
    };
    if (btnSetResetSave) {
      btnSetResetSave.addEventListener('click', () => {
        if (!setResetArmed) {
          setResetArmed = true;
          btnSetResetSave.classList.add('confirming');
          btnSetResetSave.textContent = '⚠ 再次点击确认清空';
          if (CB.audio && CB.audio.playUiLocked) CB.audio.playUiLocked();
          setResetTimer = setTimeout(clearSetReset, 3200);
          return;
        }
        clearSetReset();
        if (CB.extraction && CB.extraction.resetMeta) CB.extraction.resetMeta();
        if (CB.audio && CB.audio.playUiClick) CB.audio.playUiClick();
        setSettingsOpen(false);
        startStage(null, { keepCurios: false, stayOnTitle: true });
        updateTitleCard();
        syncSettingsUI();
      });
    }


    if (btnNextRun) btnNextRun.addEventListener('click', advanceAfterSummary);
    if (btnBankReturn) btnBankReturn.addEventListener('click', handleBankAndReturnToPort);
    if (btnRetrySeed) {
      btnRetrySeed.addEventListener('click', () => {
        openHub('workshop');
      });
    }

    variantButtons.forEach((btn) => {
      btn.addEventListener('click', () => selectVariant(btn.dataset.variant));
    });

    if (btnOpenHub) btnOpenHub.addEventListener('click', () => { setDrawerOpen(false); openHub('workshop'); syncTouchControlsUI(); });
    if (btnOpenCodex) btnOpenCodex.addEventListener('click', () => { setDrawerOpen(false); openHub('curios'); syncTouchControlsUI(); });
    if (btnPauseGame) {
      btnPauseGame.addEventListener('click', () => {
        if (game.paused) setGamePaused(false);
        else setGamePaused(true);
      });
    }
    if (btnPauseResume) btnPauseResume.addEventListener('click', () => setGamePaused(false));
    if (pauseModalEl) {
      pauseModalEl.addEventListener('click', (e) => {
        if (e.target === pauseModalEl) setGamePaused(false);
      });
    }
    if (btnPauseAudio) btnPauseAudio.addEventListener('click', toggleAudio);
    if (btnPauseLayout) btnPauseLayout.addEventListener('click', cycleTouchMode);
    if (btnPauseFullscreen) btnPauseFullscreen.addEventListener('click', toggleFullscreen);
    if (btnPauseHub) {
      btnPauseHub.addEventListener('click', () => {
        reopenPauseAfterHub = true;
        setGamePaused(false, true);
        openHub('workshop');
        syncTouchControlsUI();
      });
    }
    if (btnPauseCodex) {
      btnPauseCodex.addEventListener('click', () => {
        reopenPauseAfterHub = true;
        setGamePaused(false, true);
        openHub('curios');
        syncTouchControlsUI();
      });
    }
    if (btnPauseRestart) {
      btnPauseRestart.addEventListener('click', () => {
        setGamePaused(false, true);
        startStage(null, { keepCurios: false });
      });
    }
    if (btnPauseTitle) {
      btnPauseTitle.addEventListener('click', () => {
        openTitleScreen();
      });
    }
    if (btnCloseHub) btnCloseHub.addEventListener('click', closeHub);
    if (btnHubResume) btnHubResume.addEventListener('click', closeHub);
    if (btnHubLaunch) {
      btnHubLaunch.addEventListener('click', () => {
        closeHub();
        startStage(null, { keepCurios: false, stayOnTitle: false });
      });
    }
    if (hubModal) {
      hubModal.addEventListener('click', (e) => {
        if (e.target === hubModal) closeHub();
      });
    }
    hubTabs.forEach((btn) => {
      btn.addEventListener('click', () => switchHubTab(btn.dataset.hubTab));
    });
    setHubCallbacks({
      onChanged: () => {
        updateCombatHud(hudEls);
        syncSkinUI();
        if (game.titleOpen) updateTitleCard();
        if (!game.hubOpen && reopenPauseAfterHub && !game.titleOpen && game.run.phase === 'playing') {
          reopenPauseAfterHub = false;
          setGamePaused(true, true);
        } else {
          syncTouchControlsUI();
        }
      },
    });

    initTouchControls(touchEls);

    initInput(canvas, (code) => {
      if (game.introGateOpen) {
        if (code === 'Escape') {
          launchFromIntroGate(true);
        } else if (code === 'Space' || code === 'Enter') {
          launchFromIntroGate(false);
        }
        return;
      }
      if (game.introActive) {
        if (code === 'Escape' || code === 'Space' || code === 'Enter') {
          skipIntro();
        }
        return;
      }
      if (code === 'Escape') {
        if (game.dailyOpen) { closeDailyModal(); return; }
        if (ageModal && !ageModal.classList.contains('hidden')) { setAgeModalOpen(false); return; }
        if (game.settingsOpen) { setSettingsOpen(false); return; }
        if (game.hubOpen) { closeHub(); return; }
        if (game.menuOpen) { setDrawerOpen(false); return; }
        if (!game.titleOpen && game.run.phase === 'playing') {
          setGamePaused(!game.paused);
        }
        return;
      }
      if (code === 'KeyP' && !game.titleOpen && !game.hubOpen && !game.settingsOpen && game.run.phase === 'playing') {
        setGamePaused(!game.paused);
        return;
      }
      if (game.settingsOpen) return;
      if (code === 'KeyH') {
        setDrawerOpen(false);
        if (game.paused) { reopenPauseAfterHub = true; setGamePaused(false, true); }
        if (game.hubOpen) closeHub();
        else openHub('workshop');
        return;
      }
      if (code === 'KeyB') {
        setDrawerOpen(false);
        if (game.paused) { reopenPauseAfterHub = true; setGamePaused(false, true); }
        if (game.hubOpen) closeHub();
        else openHub('curios');
        return;
      }
      if (game.hubOpen) return;

      if (game.titleOpen) {
        if (code === 'Enter' || code === 'Space') {
          enterGameFromTitle(false);
        } else if (code === 'KeyV') {
          toggleAudio();
        }
        return;
      }

      if (game.paused) {
        if (code === 'KeyV') toggleAudio();
        return;
      }
      if (game.chartOpen || game.marketOpen || game.dailyOpen) return;
      if (code === 'KeyR') startStage(null, { keepCurios: false });
      if (code === 'Enter' && game.run.phase !== 'playing') advanceAfterSummary();
      if (code === 'KeyM') toggleOverview();
      if (code === 'KeyV') toggleAudio();
    }, () => {
      if (game.touchMode === 'auto') {
        syncOrientationGuide();
        syncTouchControlsUI();
      }
    });

    syncStageUI();
    syncSkinUI();
    syncChromeVisibility();
  }

  function spawnButterflies(map) {
    const list = [];
    if (!map) {
      game.butterflies = list;
      return;
    }
    const colors = ['#fffdf2', '#ffe27a', '#9ee6f7', '#ffb5c8'];
    for (const room of map.rooms) {
      const c = room.cells[0];
      const bx = c.gx * map.cellW + 120 + Math.random() * (map.cellW - 240);
      const by = c.gy * map.cellH + 100 + Math.random() * (map.cellH - 200);
      list.push({
        x: bx,
        y: by,
        homeX: bx,
        homeY: by,
        angle: Math.random() * Math.PI * 2,
        turnTimer: 0.6 + Math.random() * 1.4,
        phase: Math.random() * 6.28,
        color: colors[list.length % colors.length],
      });
    }
    game.butterflies = list;
  }

  function updateEffects(dt) {
    if (game.stageBannerTimer > 0 && !game.titleOpen) {
      game.stageBannerTimer = Math.max(0, game.stageBannerTimer - dt);
    }

    for (let i = game.fallingGuards.length - 1; i >= 0; i--) {
      const fg = game.fallingGuards[i];
      fg.life -= dt;
      fg.x += fg.vx * dt;
      fg.y += (fg.vy + fg.fallVy) * dt;
      fg.vx *= Math.exp(-1.6 * dt);
      fg.vy *= Math.exp(-1.4 * dt);
      fg.fallVy += 270 * dt;
      fg.angle += fg.spin * dt;
      const t = Math.max(0, fg.life / fg.maxLife);
      fg.scale = Math.max(0.08, Math.pow(t, 0.85));
      fg.trailTimer -= dt;
      if (fg.trailTimer <= 0 && t > 0.2) {
        fg.trailTimer = 0.065;
        game.particles.push({
          x: fg.x,
          y: fg.y,
          vx: (Math.random() - 0.5) * 32,
          vy: -18 - Math.random() * 24,
          r: (3.2 + Math.random() * 3.5) * fg.scale,
          life: 0.28,
          maxLife: 0.28,
          color: '#eef9ff',
        });
      }
      if (fg.life <= 0) game.fallingGuards.splice(i, 1);
    }

    for (let i = game.fallingCrates.length - 1; i >= 0; i--) {
      const fc = game.fallingCrates[i];
      fc.life -= dt;
      fc.x += fc.vx * dt;
      fc.y += (fc.vy + fc.fallVy) * dt;
      fc.vx *= Math.exp(-1.5 * dt);
      fc.vy *= Math.exp(-1.3 * dt);
      fc.fallVy += 260 * dt;
      fc.angle += fc.spin * dt;
      fc.scale = Math.max(0.1, Math.pow(Math.max(0, fc.life / fc.maxLife), 0.85));
      if (fc.life <= 0) game.fallingCrates.splice(i, 1);
    }

    for (let i = game.particles.length - 1; i >= 0; i--) {
      const pt = game.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= Math.exp(-5 * dt);
      pt.vy *= Math.exp(-5 * dt);
      pt.life -= dt;
      if (pt.life <= 0) game.particles.splice(i, 1);
    }

    for (let i = game.footprints.length - 1; i >= 0; i--) {
      game.footprints[i].life -= dt;
      if (game.footprints[i].life <= 0) game.footprints.splice(i, 1);
    }

    for (let i = game.popups.length - 1; i >= 0; i--) {
      game.popups[i].life -= dt;
      if (game.popups[i].life <= 0) game.popups.splice(i, 1);
    }

    for (const bf of game.butterflies) {
      bf.turnTimer -= dt;
      if (bf.turnTimer <= 0) {
        bf.turnTimer = 0.8 + Math.random() * 1.6;
        const toHome = Math.atan2(bf.homeY - bf.y, bf.homeX - bf.x);
        const dHome = Math.hypot(bf.homeX - bf.x, bf.homeY - bf.y);
        bf.angle = dHome > 140 ? toHome + (Math.random() - 0.5) * 0.7 : bf.angle + (Math.random() - 0.5) * 2.1;
      }
      bf.x += Math.cos(bf.angle) * 26 * dt;
      bf.y += Math.sin(bf.angle) * 26 * dt;
    }
  }

  function updateCamera(dt) {
    const { camera, player, input, map, viewW, viewH } = game;
    let targetX = player.x;
    let targetY = player.y;

    if (game.titleOpen && map) {
      // 动态开场页：镜头柔和巡航整个云海浮岛全貌！
      const orbitA = game.time * 0.16;
      const rx = Math.min(260, map.bounds.w * 0.14);
      const ry = Math.min(180, map.bounds.h * 0.14);
      targetX = map.bounds.cx + Math.cos(orbitA) * rx;
      targetY = map.bounds.cy + Math.sin(orbitA) * ry;
      camera.targetZoom = Math.max(0.55, Math.min(0.82, Math.min(viewW / 1400, viewH / 880) * 0.92));
    } else if (game.mapOverview && map) {
      const padW = viewW - 260;
      const padH = viewH - 160;
      camera.targetZoom = Math.max(0.22, Math.min(0.68, Math.min(padW / map.bounds.w, padH / map.bounds.h)));
      targetX = map.bounds.cx;
      targetY = map.bounds.cy;
    } else {
      camera.targetZoom = 1;
      const lookAheadX = (input.mouseWorldX - player.x) * 0.1;
      const lookAheadY = (input.mouseWorldY - player.y) * 0.1;
      targetX = player.x + Math.max(-84, Math.min(84, lookAheadX));
      targetY = player.y + Math.max(-60, Math.min(60, lookAheadY));
    }

    const smooth = 1 - Math.exp(-(game.titleOpen ? 2.4 : 8.5) * dt);
    camera.x += (targetX - camera.x) * smooth;
    camera.y += (targetY - camera.y) * smooth;
    camera.zoom += (camera.targetZoom - camera.zoom) * (1 - Math.exp(-(game.titleOpen ? 3.5 : 7) * dt));
    camera.shake *= Math.exp(-16 * dt);
  }

  // 轻量级真机异常诊断浮层（仅在出现未捕获 JS 异常时显现，正常运行时完全零存在感）
  (function installErrorDiag() {
    let diagEl = null;
    const showDiag = (msg) => {
      try {
        if (!diagEl) {
          diagEl = document.createElement('div');
          diagEl.style.cssText =
            'position:fixed;left:8px;right:8px;top:8px;z-index:99999;background:rgba(168,36,28,0.94);color:#fff;' +
            'font:600 11.5px/1.4 monospace;padding:8px 10px;border-radius:10px;border:2px solid #ffd8c2;' +
            'max-height:38vh;overflow:auto;word-break:break-all;pointer-events:auto;';
          diagEl.addEventListener('click', () => {
            if (diagEl && diagEl.parentNode) diagEl.parentNode.removeChild(diagEl);
            diagEl = null;
          });
          document.body.appendChild(diagEl);
        }
        const row = document.createElement('div');
        row.textContent = `[Diag] ${String(msg).slice(0, 260)}`;
        diagEl.appendChild(row);
      } catch (_) {}
    };
    window.addEventListener('error', (e) => {
      showDiag(`${e.message || 'Error'} @ ${e.lineno || 0}:${e.colno || 0}`);
    });
    window.addEventListener('unhandledrejection', (e) => {
      const r = e && e.reason;
      showDiag(`Promise: ${(r && r.message) || r || 'Rejected'}`);
    });
  })();

  // 启动：以实时漂浮的未知云海首航段为背景进入手绘开场标题页
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 120));
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resize);
  }

  // TapTap / iOS / Android WebView 前后台生命周期管理：切后台自动静音并暂停对局
  const handleAppHide = () => {
    game.appPaused = true;
    clearAllHeldInputs();
    if (game.run.phase === 'playing' && !game.titleOpen && !game.introActive && !game.hubOpen && !game.paused) {
      setGamePaused(true, true);
    }
    if (CB.audio && CB.audio.suspendAudio) CB.audio.suspendAudio();
  };
  const handleAppShow = () => {
    game.appPaused = false;
    lastTime = performance.now();
    if (CB.audio && CB.audio.resumeAudio) CB.audio.resumeAudio();
    resize();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) handleAppHide();
    else handleAppShow();
  });
  window.addEventListener('pagehide', handleAppHide);
  window.addEventListener('pageshow', handleAppShow);
  initRenderer(ctx);
  setupUI();
  startStage(null, { keepCurios: false, stayOnTitle: true });
  if (game.map) {
    game.camera.x = game.map.bounds.cx;
    game.camera.y = game.map.bounds.cy;
    game.camera.zoom = 0.72;
  }
  if (game.meta.autoPlayIntro !== false) {
    if (CB.audio && CB.audio.isAudioUnlocked && CB.audio.isAudioUnlocked()) {
      playOpeningCutscene();
    } else {
      openIntroGate();
    }
  } else {
    game.introGateOpen = false;
    game.introActive = false;
    game.titleOpen = true;
    syncChromeVisibility();
  }

  lastTime = performance.now();
  function loop(now) {
    if (game.appPaused || document.hidden) {
      lastTime = now;
      requestAnimationFrame(loop);
      return;
    }

    const rawDt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (game.hitStop > 0) {
      game.hitStop = Math.max(0, game.hitStop - rawDt);
      game.camera.shake *= Math.exp(-16 * rawDt);
      renderWorld(ctx);
      if (!game.titleOpen) renderMinimap(mctx, miniCanvas);
      requestAnimationFrame(loop);
      return;
    }

    if (game.paused && !game.titleOpen && !game.introActive && !game.introGateOpen) {
      renderWorld(ctx);
      renderMinimap(mctx, miniCanvas);
      requestAnimationFrame(loop);
      return;
    }

    game.time += rawDt;
    syncMouseWorld();

    if (game.introGateOpen) {
      renderIntroGate(ctx, game.viewW, game.viewH, game.time);
      requestAnimationFrame(loop);
      return;
    }

    if (game.introActive && isIntroActive()) {
      if (!game.portraitBlocked) {
        updateIntro(rawDt);
      }
      if (introProgressFillEl) {
        introProgressFillEl.style.width = `${(getIntroProgress() * 100).toFixed(1)}%`;
      }
      updateEffects(rawDt);
      // 过场动画期间让镜头在背后预热巡航，确保末尾淡出无缝衔接到实时云海浮岛！
      const prevTitle = game.titleOpen;
      game.titleOpen = true;
      updateCamera(rawDt);
      renderWorld(ctx);
      game.titleOpen = prevTitle;
      renderIntro(ctx, game.viewW, game.viewH);
      requestAnimationFrame(loop);
      return;
    }

    if (game.run.phase === 'playing' && !game.introGateOpen && !game.hubOpen && !game.titleOpen && !game.chartOpen && !game.marketOpen && !game.dailyOpen && !game.portraitBlocked) {
      updatePlayer(rawDt);
      updateCombat(rawDt);
      updateGuards(rawDt);
      if (CB.physicsLab && CB.physicsLab.updatePhysicsLab) CB.physicsLab.updatePhysicsLab(rawDt);
      updateExtractionLoop(rawDt);
    }

    updateEffects(rawDt);
    updateCamera(rawDt);

    if (!game.titleOpen) {
      updateCombatHud(hudEls);
      if (game.touchActive) {
        const shouldShowTouch = !game.hubOpen && !game.chartOpen && !game.marketOpen && !game.dailyOpen && !game.paused && !game.portraitBlocked && game.run.phase === 'playing';
        if (touchControlsEl) touchControlsEl.classList.toggle('hidden', !shouldShowTouch);
        if (shouldShowTouch) updateTouchHud(touchEls);
      } else if (pcHintBarEl) {
        const shouldShowPc = !game.hubOpen && !game.chartOpen && !game.marketOpen && !game.dailyOpen && !game.paused && game.run.phase === 'playing';
        pcHintBarEl.classList.toggle('hud-hidden', !shouldShowPc);
      }
      syncStageUI();
    }

    renderWorld(ctx);
    if (!game.titleOpen && (now - lastMinimapTime >= 55 || game.mapOverview)) {
      lastMinimapTime = now;
      renderMinimap(mctx, miniCanvas);
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
