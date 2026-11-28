window.MT = window.MT || {};

// v8 独立关卡插件调度器：支持三幕进度追踪、独立物理钩子、分层渲染委派与未重构关卡平滑兜底
window.MT.LevelEngine = (function () {
  var registry = {};
  var activeEraId = 'moon_sea';

  function register(eraId, plugin) {
    if (!eraId || !plugin) return;
    registry[eraId] = plugin;
  }

  function getPlugin(eraId) {
    return (eraId && registry[eraId]) ? registry[eraId] : null;
  }

  function getActivePlugin(worldX) {
    var eras = window.MT.Eras;
    if (!eras) return null;
    var era = eras.getCurrentEra(worldX);
    return era ? getPlugin(era.id) : null;
  }

  // 三幕剧关卡进度查询（第 1 幕 0~30% 教学 / 第 2 幕 30~75% 变奏分叉 / 第 3 幕 75~100% 灾变高潮）
  function getActInfo(worldX) {
    var eras = window.MT.Eras;
    if (!eras) return { act: 1, progress: 0, eraId: 'moon_sea' };
    var eb = eras.getEraBlend(worldX);
    var p = eb ? (eb.eraProgress || 0) : 0;
    var act = p < 0.30 ? 1 : (p < 0.75 ? 2 : 3);
    return {
      act: act,
      progress: p,
      eraId: (eb && eb.era) ? eb.era.id : 'moon_sea'
    };
  }

  function reset(startX, mode) {
    var sx = typeof startX === 'number' ? startX : 120;
    var eras = window.MT.Eras;
    var startEra = eras ? eras.getCurrentEra(sx) : { id: 'moon_sea' };
    activeEraId = startEra ? startEra.id : 'moon_sea';

    Object.keys(registry).forEach(function (key) {
      var p = registry[key];
      if (p && typeof p.reset === 'function') {
        p.reset(sx, mode || 'story');
      }
    });
  }

  function update(dt, boat, eras, onLevelEvent) {
    var cur = eras ? eras.getCurrentEra(boat.x) : null;
    var curId = cur ? cur.id : activeEraId;
    // 若上一关正在执行过关结算延迟，优先允许其完成演出再退出
    var prevP = getPlugin(activeEraId);
    var prevClearing = prevP && typeof prevP.isClearing === 'function' && prevP.isClearing();

    if (curId !== activeEraId && !prevClearing) {
      if (prevP && typeof prevP.onExit === 'function') {
        prevP.onExit(boat, eras);
      }
      activeEraId = curId;
    }

    var active = getPlugin(activeEraId);
    if (active && typeof active.update === 'function') {
      active.update(dt, boat, eras, getActInfo(boat.x), onLevelEvent);
    }
  }

  function isStageClearing() {
    var p = getPlugin(activeEraId);
    return !!(p && typeof p.isClearing === 'function' && p.isClearing());
  }

  function finishStageClearing(boat) {
    var p = getPlugin(activeEraId);
    if (p && typeof p.finishClearing === 'function') {
      p.finishClearing(boat);
    }
  }

  function getClimaxState() {
    var p = getPlugin(activeEraId);
    if (p && typeof p.getClimaxState === 'function') {
      return p.getClimaxState();
    }
    return { active: false, tension: 0, progress: 0 };
  }

  // 允许独立关卡插件对主地形/海面高度做实时物理叠加（例如第 1 关第 3 幕真实物理卷涌巨浪！）
  function getSurfaceOffset(worldX, t) {
    var p = getPlugin(activeEraId);
    if (p && typeof p.getSurfaceOffset === 'function') {
      return p.getSurfaceOffset(worldX, t) || 0;
    }
    return 0;
  }

  // 落地/入水瞬间委派（如第 1 关持 D 俯冲入海直接切入潜海蓄力，不触发翻船磕碰）
  function handleLanding(ctxObj) {
    var plugin = getActivePlugin(ctxObj.boat.x);
    if (plugin && typeof plugin.handleLanding === 'function') {
      return !!plugin.handleLanding(ctxObj);
    }
    return false;
  }

  // 表面/水下专属物理委派（返回 true 表示本帧由该关卡插件全权接管表面物理）
  function handleSurfacePhysics(ctxObj) {
    var plugin = getActivePlugin(ctxObj.boat.x);
    if (plugin && typeof plugin.handleSurfacePhysics === 'function') {
      return !!plugin.handleSurfacePhysics(ctxObj);
    }
    return false;
  }

  // 关卡专属手工区块交互委派（上层桥面滑行、暗礁涌流、钟楼敲钟、巨水母弹射、鲸群连跃、遗物拾取）
  function handleChunkInteractions(ctxObj) {
    var plugin = getActivePlugin(ctxObj.boat.x);
    if (plugin && typeof plugin.handleChunkInteractions === 'function') {
      return !!plugin.handleChunkInteractions(ctxObj);
    }
    return false;
  }

  function getRelicStatus(eraId) {
    var plugin = getPlugin(eraId);
    if (plugin && typeof plugin.getRelicStatus === 'function') {
      return plugin.getRelicStatus();
    }
    return null;
  }

  function drawUnderWater(ctx, state) {
    var plugin = getActivePlugin(state.camX);
    if (plugin && typeof plugin.drawUnderWater === 'function') {
      plugin.drawUnderWater(ctx, state);
    }
  }

  function drawWorldBack(ctx, state) {
    var plugin = getActivePlugin(state.camX);
    if (plugin && typeof plugin.drawWorldBack === 'function') {
      plugin.drawWorldBack(ctx, state);
    }
  }

  // 海面之上、木舟之前的结构层（高架桥面、钟楼、灯塔栈桥、浮鲸群与遗物光环）
  function drawWorldStructures(ctx, state) {
    var plugin = getActivePlugin(state.camX);
    if (plugin && typeof plugin.drawWorldStructures === 'function') {
      plugin.drawWorldStructures(ctx, state);
    }
  }

  function drawWorldFront(ctx, state) {
    var plugin = getActivePlugin(state.camX);
    if (plugin && typeof plugin.drawWorldFront === 'function') {
      plugin.drawWorldFront(ctx, state);
    }
  }

  function drawHudOverlay(ctx, state) {
    var plugin = getActivePlugin(state.camX);
    if (plugin && typeof plugin.drawHudOverlay === 'function') {
      plugin.drawHudOverlay(ctx, state);
    }
  }

  function getSubmergeRatio(boat) {
    if (!boat || !boat.isDiving) return 0;
    return Math.max(0, Math.min(1, boat.submergeDepth / 115));
  }

  return {
    register: register,
    getPlugin: getPlugin,
    getActivePlugin: getActivePlugin,
    getActInfo: getActInfo,
    reset: reset,
    update: update,
    handleLanding: handleLanding,
    handleSurfacePhysics: handleSurfacePhysics,
    handleChunkInteractions: handleChunkInteractions,
    getRelicStatus: getRelicStatus,
    isStageClearing: isStageClearing,
    finishStageClearing: finishStageClearing,
    getClimaxState: getClimaxState,
    getSurfaceOffset: getSurfaceOffset,
    drawUnderWater: drawUnderWater,
    drawWorldBack: drawWorldBack,
    drawWorldStructures: drawWorldStructures,
    drawWorldFront: drawWorldFront,
    drawHudOverlay: drawHudOverlay,
    getSubmergeRatio: getSubmergeRatio
  };
})();
