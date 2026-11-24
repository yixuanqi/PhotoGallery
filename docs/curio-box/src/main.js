(() => {
  const CB = window.CB;
  const game = CB.game;
  const { initInput, syncMouseWorld } = CB.input;
  const { generateMap } = CB.mapGen;
  const { placePlayerAtSpawn, updatePlayer, setVariant, spawnPopup } = CB.player;
  const { initRenderer, renderWorld } = CB.renderer;
  const { renderMinimap, updateStatsBanner } = CB.ui;

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const miniCanvas = document.getElementById('minimapCanvas');
  const mctx = miniCanvas.getContext('2d');
  const statsEl = document.getElementById('mapStats');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    game.viewW = window.innerWidth;
    game.viewH = window.innerHeight;
    canvas.width = Math.floor(game.viewW * dpr);
    canvas.height = Math.floor(game.viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function buildNewMap() {
    game.map = generateMap();
    placePlayerAtSpawn();
    updateStatsBanner(statsEl);
    spawnPopup(game.player.x, game.player.y - 44, `新地图 #${game.map.seed}`, '#3d7a64');
  }

  function setupUI() {
    const btnRegen = document.getElementById('btnRegen');
    const btnOverview = document.getElementById('btnOverview');
    const btnFog = document.getElementById('btnFog');
    const variantButtons = document.querySelectorAll('[data-variant]');

    const toggleOverview = () => {
      game.mapOverview = !game.mapOverview;
      btnOverview.classList.toggle('active', game.mapOverview);
      btnOverview.textContent = game.mapOverview ? 'M 返回近景' : 'M 全图总览';
    };

    const toggleFog = () => {
      game.showFog = !game.showFog;
      btnFog.classList.toggle('active', game.showFog);
      btnFog.textContent = game.showFog ? 'F 羊皮纸迷雾: 开' : 'F 羊皮纸迷雾: 关';
    };

    const selectVariant = (v) => {
      setVariant(v);
      variantButtons.forEach((b) => b.classList.toggle('active', b.dataset.variant === v));
    };

    btnRegen.addEventListener('click', buildNewMap);
    btnOverview.addEventListener('click', toggleOverview);
    btnFog.addEventListener('click', toggleFog);
    variantButtons.forEach((btn) => {
      btn.addEventListener('click', () => selectVariant(btn.dataset.variant));
    });

    initInput(canvas, (code) => {
      if (code === 'KeyR') buildNewMap();
      if (code === 'KeyM') toggleOverview();
      if (code === 'KeyF') toggleFog();
    });
  }

  function updateEffects(dt) {
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
  }

  function updateCamera(dt) {
    const { camera, player, input, map, viewW, viewH } = game;
    let targetX = player.x;
    let targetY = player.y;

    if (game.mapOverview && map) {
      // 全图俯瞰模式：自动计算适配整张不规则地图的缩放比与中心
      const padW = viewW - 260;
      const padH = viewH - 160;
      camera.targetZoom = Math.max(0.22, Math.min(0.68, Math.min(padW / map.bounds.w, padH / map.bounds.h)));
      targetX = map.bounds.cx;
      targetY = map.bounds.cy;
    } else {
      camera.targetZoom = 1;
      const lookAheadX = (input.mouseWorldX - player.x) * 0.08;
      const lookAheadY = (input.mouseWorldY - player.y) * 0.08;
      targetX = player.x + Math.max(-72, Math.min(72, lookAheadX));
      targetY = player.y + Math.max(-52, Math.min(52, lookAheadY));
    }

    const smooth = 1 - Math.exp(-8.5 * dt);
    camera.x += (targetX - camera.x) * smooth;
    camera.y += (targetY - camera.y) * smooth;
    camera.zoom += (camera.targetZoom - camera.zoom) * (1 - Math.exp(-7 * dt));
    camera.shake *= Math.exp(-16 * dt);
  }

  // 启动
  resize();
  window.addEventListener('resize', resize);
  initRenderer(ctx);
  setupUI();
  buildNewMap();

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    game.time += dt;

    syncMouseWorld();
    updatePlayer(dt);
    updateEffects(dt);
    updateCamera(dt);
    renderWorld(ctx);
    renderMinimap(mctx, miniCanvas);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
