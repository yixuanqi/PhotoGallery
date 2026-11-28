window.MT = window.MT || {};

window.MT.Shop = (function () {
  var STORAGE_KEY = 'mt_v6_fog_save';
  var freshBlueprints = {};

  function createDefaultData() {
    return {
      bank: 0,
      bestDist: 0,
      bestEndlessDist: 0,
      totalVoyages: 0,
      rebirthWitnessed: false,
      unlockedEras: {
        moon_sea: true,
        fire_sea: false,
        ice_winter: false,
        thawed_wasteland: false,
        sprout_meadow: false,
        giant_forest: false
      },
      selectedEraId: 'moon_sea',
      selectedSeaStart: 'surface', // 'surface' (x=120) | 'abyss' (x=14760 直入落月撞击沉渊)
      abyssReached: false,
      relics: {
        moon_sea: {},
        frost_sea: {},
        fire_sea: {}
      },
      fauna: {},
      wonders: {},
      snapshots: {},
      shrines: {},
      frostShrines: {},
      harborIlluminated: false,
      harborFinaleWitnessed: false,
      frostUnlocked: false,
      frostSanctuaryAwake: false,
      frostFinaleWitnessed: false,
      timeWatchUnlocked: false,
      settings: { musicVol: 0.85, sfxVol: 0.90, quality: 'high' },
      tutorials: { dive: false, sonar: false },
      commissions: {},
      unlockedSkins: { cream: true },
      selectedSubSkin: 'cream',
      clearedLevels: {},
      bestTimes: {},
      upgrades: {
        deep_fins: 0,
        sky_sail: 0,
        tide_sonar: 0,
        warm_breaker: 0,
        heat_shield: 0,
        quilt: 0,
        springs: 0,
        glider: 0,
        prow: 0,
        rocket: 0,
        hull: 0,
        magnet: 0
      }
    };
  }

  var data = createDefaultData();

  function load() {
    data = createDefaultData();
    try {
      var raw = window.localStorage && window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      data.bank = Math.max(0, Math.floor(Number(parsed.bank) || 0));
      data.bestDist = Math.max(0, Math.floor(Number(parsed.bestDist) || 0));
      data.bestEndlessDist = Math.max(0, Math.floor(Number(parsed.bestEndlessDist) || 0));
      data.totalVoyages = Math.max(0, Math.floor(Number(parsed.totalVoyages) || 0));
      data.rebirthWitnessed = !!parsed.rebirthWitnessed;
      if (parsed.unlockedEras && typeof parsed.unlockedEras === 'object') {
        Object.keys(data.unlockedEras).forEach(function (k) {
          if (parsed.unlockedEras[k]) data.unlockedEras[k] = true;
        });
      }
      data.unlockedEras.moon_sea = true;
      if (parsed.selectedEraId && data.unlockedEras[parsed.selectedEraId]) {
        data.selectedEraId = parsed.selectedEraId;
      }
      if (parsed.relics && typeof parsed.relics === 'object') {
        Object.keys(parsed.relics).forEach(function (eraKey) {
          if (parsed.relics[eraKey] && typeof parsed.relics[eraKey] === 'object') {
            data.relics[eraKey] = Object.assign({}, parsed.relics[eraKey]);
          }
        });
      }
      if (!data.relics.moon_sea) data.relics.moon_sea = {};
      if (!data.relics.frost_sea) data.relics.frost_sea = {};
      if (!data.relics.fire_sea) data.relics.fire_sea = {};
      if (parsed.fauna && typeof parsed.fauna === 'object') {
        data.fauna = Object.assign({}, parsed.fauna);
      }
      if (parsed.wonders && typeof parsed.wonders === 'object') {
        data.wonders = Object.assign({}, parsed.wonders);
      }
      var legacySnaps = (parsed.snapshots && typeof parsed.snapshots === 'object') ? Object.assign({}, parsed.snapshots) : null;
      data.snapshots = {};
      if (window.MT.StorageDB && window.MT.StorageDB.init) {
        window.MT.StorageDB.init(legacySnaps);
      } else if (legacySnaps) {
        data.snapshots = legacySnaps;
      }
      if (parsed.shrines && typeof parsed.shrines === 'object') {
        data.shrines = Object.assign({}, parsed.shrines);
      }
      if (parsed.frostShrines && typeof parsed.frostShrines === 'object') {
        data.frostShrines = Object.assign({}, parsed.frostShrines);
      }
      data.harborIlluminated = !!parsed.harborIlluminated;
      data.harborFinaleWitnessed = !!parsed.harborFinaleWitnessed;
      data.frostUnlocked = !!(parsed.frostUnlocked || parsed.harborIlluminated);
      data.frostSanctuaryAwake = !!parsed.frostSanctuaryAwake;
      data.frostFinaleWitnessed = !!parsed.frostFinaleWitnessed;
      data.timeWatchUnlocked = !!(parsed.timeWatchUnlocked || parsed.harborIlluminated || parsed.rebirthWitnessed);
      if (parsed.settings && typeof parsed.settings === 'object') {
        data.settings = {
          musicVol: Math.max(0, Math.min(1, typeof parsed.settings.musicVol === 'number' ? parsed.settings.musicVol : 0.85)),
          sfxVol: Math.max(0, Math.min(1, typeof parsed.settings.sfxVol === 'number' ? parsed.settings.sfxVol : 0.90)),
          quality: parsed.settings.quality === 'eco' ? 'eco' : 'high'
        };
      }
      if (parsed.tutorials && typeof parsed.tutorials === 'object') {
        data.tutorials = { dive: !!parsed.tutorials.dive, sonar: !!parsed.tutorials.sonar };
      }
      if (parsed.commissions && typeof parsed.commissions === 'object') {
        data.commissions = Object.assign({}, parsed.commissions);
      }
      if (parsed.unlockedSkins && typeof parsed.unlockedSkins === 'object') {
        data.unlockedSkins = Object.assign({ cream: true }, parsed.unlockedSkins);
      }
      if (parsed.selectedSubSkin && data.unlockedSkins[parsed.selectedSubSkin]) {
        data.selectedSubSkin = parsed.selectedSubSkin;
      }
      // 如果旧存档里有大量 base64 邮票，迁移到 IndexedDB 后立刻精简重写 localStorage！
      if (legacySnaps && Object.keys(legacySnaps).length > 0 && window.MT.StorageDB) {
        save();
      }
      data.abyssReached = !!parsed.abyssReached;
      if (parsed.selectedSeaStart === 'abyss' || parsed.selectedSeaStart === 'surface') {
        data.selectedSeaStart = parsed.selectedSeaStart;
      }
      if (parsed.clearedLevels && typeof parsed.clearedLevels === 'object') {
        data.clearedLevels = Object.assign({}, parsed.clearedLevels);
      }
      if (parsed.bestTimes && typeof parsed.bestTimes === 'object') {
        data.bestTimes = Object.assign({}, parsed.bestTimes);
      }
      if (parsed.upgrades && typeof parsed.upgrades === 'object') {
        Object.keys(data.upgrades).forEach(function (k) {
          var v = Math.floor(Number(parsed.upgrades[k]) || 0);
          data.upgrades[k] = Math.max(0, Math.min(3, v));
        });
      }
    } catch (e) {}
  }

  function save() {
    try {
      if (window.localStorage) {
        // 剥离大体积快照图片（已托管给 IndexedDB），确保 localStorage 永远保持轻盈 < 5KB！
        var slim = Object.assign({}, data, { snapshots: {} });
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
      }
    } catch (e) {}
  }

  function resetProgress() {
    data = createDefaultData();
    freshBlueprints = {};
    if (window.MT.StorageDB && window.MT.StorageDB.clear) window.MT.StorageDB.clear();
    save();
  }

  function getLevel(id) { return data.upgrades[id] || 0; }

  function getItemConfig(id) {
    var list = window.MT.Config.SHOP_ITEMS || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function getItemByEra(eraId) {
    var list = window.MT.Config.SHOP_ITEMS || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].eraReq === eraId) return list[i];
    }
    return null;
  }

  function isBlueprintUnlocked(itemId) {
    var item = getItemConfig(itemId);
    if (!item) return false;
    var cat = item.category || 'era';
    if (cat === 'core' || cat === 'ocean') return true;
    if (getLevel(itemId) > 0) return true;
    return !!(item.eraReq && data.unlockedEras[item.eraReq]);
  }

  function isBlueprintFresh(itemId) {
    return !!freshBlueprints[itemId];
  }

  function clearFreshBlueprints() {
    freshBlueprints = {};
  }

  function getUnlockedEraCount() {
    var n = 0;
    Object.keys(data.unlockedEras).forEach(function (k) { if (data.unlockedEras[k]) n++; });
    return n;
  }

  function getUnlockedBlueprintCount() {
    var items = window.MT.Config.SHOP_ITEMS || [];
    var n = 0;
    items.forEach(function (it) {
      if (it.category === 'era' && isBlueprintUnlocked(it.id)) n++;
    });
    return n;
  }

  function getNextCost(id) {
    var item = getItemConfig(id);
    if (!item) return null;
    var lv = getLevel(id);
    if (lv >= item.maxLevel) return null;
    return item.costs[lv];
  }

  function canBuy(id) {
    if (!isBlueprintUnlocked(id)) return false;
    var cost = getNextCost(id);
    return cost !== null && data.bank >= cost;
  }

  function buy(id) {
    if (!isBlueprintUnlocked(id)) return false;
    var cost = getNextCost(id);
    if (cost === null || data.bank < cost) return false;
    data.bank -= cost;
    data.upgrades[id] = getLevel(id) + 1;
    delete freshBlueprints[id];
    save();
    return true;
  }

  function unlockEra(eraId) {
    if (!eraId || typeof data.unlockedEras[eraId] === 'undefined') return false;
    if (!data.unlockedEras[eraId]) {
      data.unlockedEras[eraId] = true;
      var bp = getItemByEra(eraId);
      if (bp) freshBlueprints[bp.id] = true;
      save();
      return true;
    }
    return false;
  }

  function collectRelic(eraId, relicId) {
    if (!eraId || !relicId) return false;
    if (!data.relics) data.relics = {};
    if (!data.relics[eraId]) data.relics[eraId] = {};
    if (!data.relics[eraId][relicId]) {
      data.relics[eraId][relicId] = true;
      save();
      return true;
    }
    return false;
  }

  function hasRelic(eraId, relicId) {
    return !!(data.relics && data.relics[eraId] && data.relics[eraId][relicId]);
  }

  function getRelicCount(eraId) {
    if (!data.relics || !data.relics[eraId]) return 0;
    var n = 0;
    Object.keys(data.relics[eraId]).forEach(function (k) {
      if (data.relics[eraId][k]) n++;
    });
    return n;
  }

  function discoverFauna(faunaId) {
    if (!faunaId) return false;
    if (!data.fauna) data.fauna = {};
    if (!data.fauna[faunaId]) {
      data.fauna[faunaId] = true;
      save();
      return true;
    }
    return false;
  }

  function hasFauna(faunaId) {
    return !!(data.fauna && data.fauna[faunaId]);
  }

  function getFaunaCount() {
    if (!data.fauna) return 0;
    var n = 0;
    Object.keys(data.fauna).forEach(function (k) {
      if (data.fauna[k]) n++;
    });
    return n;
  }

  function discoverWonder(wonderId) {
    if (!wonderId) return false;
    if (!data.wonders) data.wonders = {};
    if (!data.wonders[wonderId]) {
      data.wonders[wonderId] = true;
      save();
      return true;
    }
    return false;
  }

  function hasWonder(wonderId) {
    return !!(data.wonders && data.wonders[wonderId]);
  }

  function getWonderCount() {
    if (!data.wonders) return 0;
    var n = 0;
    Object.keys(data.wonders).forEach(function (k) {
      if (data.wonders[k]) n++;
    });
    return n;
  }

  function saveSnapshot(entryId, dataUrl) {
    if (!entryId || !dataUrl) return false;
    if (window.MT.StorageDB && window.MT.StorageDB.put) {
      return window.MT.StorageDB.put(entryId, dataUrl);
    }
    if (!data.snapshots) data.snapshots = {};
    data.snapshots[entryId] = dataUrl;
    return true;
  }

  function getSnapshot(entryId) {
    if (window.MT.StorageDB && window.MT.StorageDB.get) {
      var fromDb = window.MT.StorageDB.get(entryId);
      if (fromDb) return fromDb;
    }
    return (data.snapshots && data.snapshots[entryId]) ? data.snapshots[entryId] : null;
  }

  function awakenShrine(shrineId) {
    if (!shrineId) return false;
    if (!data.shrines) data.shrines = {};
    if (!data.shrines[shrineId]) {
      data.shrines[shrineId] = true;
      save();
      return true;
    }
    return false;
  }

  function hasShrine(shrineId) {
    return !!(data.shrines && data.shrines[shrineId]);
  }

  function getShrineCount() {
    if (!data.shrines) return 0;
    var n = 0;
    Object.keys(data.shrines).forEach(function (k) {
      if (data.shrines[k]) n++;
    });
    return n;
  }

  function markHarborIlluminated() {
    if (!data.harborIlluminated) {
      data.harborIlluminated = true;
      data.frostUnlocked = true;
      data.timeWatchUnlocked = true;
      save();
      return true;
    }
    return false;
  }

  function unlockFrostRealm() {
    if (!data.frostUnlocked) {
      data.frostUnlocked = true;
      save();
      return true;
    }
    return false;
  }

  function isFrostUnlocked() {
    return !!(data.frostUnlocked || data.harborIlluminated);
  }

  function awakenFrostShrine(shrineId) {
    if (!shrineId) return false;
    if (!data.frostShrines) data.frostShrines = {};
    if (!data.frostShrines[shrineId]) {
      data.frostShrines[shrineId] = true;
      save();
      return true;
    }
    return false;
  }

  function hasFrostShrine(shrineId) {
    return !!(data.frostShrines && data.frostShrines[shrineId]);
  }

  function getFrostShrineCount() {
    if (!data.frostShrines) return 0;
    var n = 0;
    Object.keys(data.frostShrines).forEach(function (k) {
      if (data.frostShrines[k]) n++;
    });
    return n;
  }

  function markFrostSanctuaryAwake() {
    if (!data.frostSanctuaryAwake) {
      data.frostSanctuaryAwake = true;
      save();
      return true;
    }
    return false;
  }

  function markFrostFinaleWitnessed() {
    if (!data.frostFinaleWitnessed) {
      data.frostFinaleWitnessed = true;
      save();
      return true;
    }
    return false;
  }

  function unlockTimeWatch() {
    if (!data.timeWatchUnlocked) {
      data.timeWatchUnlocked = true;
      save();
      return true;
    }
    return false;
  }

  function isTimeWatchUnlocked() {
    return !!(data.timeWatchUnlocked || data.harborIlluminated);
  }

  function markTutorialDone(key) {
    if (!key) return;
    if (!data.tutorials) data.tutorials = { dive: false, sonar: false };
    if (!data.tutorials[key]) {
      data.tutorials[key] = true;
      save();
    }
  }

  function getSettings() {
    if (!data.settings) data.settings = { musicVol: 0.85, sfxVol: 0.90, quality: 'high' };
    return Object.assign({}, data.settings);
  }

  function updateSettings(patch) {
    if (!data.settings) data.settings = { musicVol: 0.85, sfxVol: 0.90, quality: 'high' };
    if (patch && typeof patch === 'object') {
      if (typeof patch.musicVol === 'number') data.settings.musicVol = Math.max(0, Math.min(1, patch.musicVol));
      if (typeof patch.sfxVol === 'number') data.settings.sfxVol = Math.max(0, Math.min(1, patch.sfxVol));
      if (patch.quality === 'eco' || patch.quality === 'high') data.settings.quality = patch.quality;
      save();
    }
    return getSettings();
  }

  function isTutorialDone(key) {
    return !!(data.tutorials && data.tutorials[key]);
  }

  function isSkinUnlocked(skinId) {
    return !!(skinId === 'cream' || (data.unlockedSkins && data.unlockedSkins[skinId]));
  }

  function unlockSkin(skinId) {
    if (!skinId) return false;
    if (!data.unlockedSkins) data.unlockedSkins = { cream: true };
    if (!data.unlockedSkins[skinId]) {
      data.unlockedSkins[skinId] = true;
      save();
      return true;
    }
    return false;
  }

  function selectSubSkin(skinId) {
    if (!isSkinUnlocked(skinId)) return false;
    data.selectedSubSkin = skinId;
    save();
    return true;
  }

  function getSelectedSubSkin() {
    return (data.selectedSubSkin && isSkinUnlocked(data.selectedSubSkin)) ? data.selectedSubSkin : 'cream';
  }

  function isCommissionClaimed(commId) {
    return !!(data.commissions && data.commissions[commId]);
  }

  function isCommissionReady(comm) {
    if (!comm || isCommissionClaimed(comm.id)) return false;
    if (comm.reqKind === 'fauna') return hasFauna(comm.reqId);
    if (comm.reqKind === 'wonder') return hasWonder(comm.reqId);
    if (comm.reqKind === 'relic') return hasRelic('moon_sea', comm.reqId);
    return false;
  }

  function claimCommission(commId) {
    var list = (window.MT.Config && window.MT.Config.COMMISSIONS) || [];
    var comm = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === commId) { comm = list[i]; break; }
    }
    if (!comm || !isCommissionReady(comm)) return null;
    if (!data.commissions) data.commissions = {};
    data.commissions[comm.id] = true;
    data.bank += (comm.rewardStars || 0);
    if (comm.rewardSkin) {
      unlockSkin(comm.rewardSkin);
      data.selectedSubSkin = comm.rewardSkin;
    }
    if (comm.rewardWatch) {
      data.timeWatchUnlocked = true;
    }
    save();
    return comm;
  }

  function markHarborFinaleWitnessed() {
    if (!data.harborFinaleWitnessed) {
      data.harborFinaleWitnessed = true;
      save();
      return true;
    }
    return false;
  }

  function getCodexProgress() {
    var ce = (window.MT.Config && window.MT.Config.CODEX_ENTRIES) || { relics: [], fauna: [], wonders: [] };
    var rTotal = ce.relics ? ce.relics.length : 9;
    var fTotal = ce.fauna ? ce.fauna.length : 10;
    var wTotal = ce.wonders ? ce.wonders.length : 7;
    var rFound = getRelicCount('moon_sea') + getRelicCount('frost_sea');
    var fFound = getFaunaCount();
    var wFound = getWonderCount();
    return {
      relicsFound: rFound,
      relicsTotal: rTotal,
      faunaFound: fFound,
      faunaTotal: fTotal,
      wondersFound: wFound,
      wondersTotal: wTotal,
      found: rFound + fFound + wFound,
      total: rTotal + fTotal + wTotal
    };
  }

  function recordStageClear(eraId, timeSec) {
    if (!eraId) return { isBest: false, bestTime: null };
    if (!data.clearedLevels) data.clearedLevels = {};
    if (!data.bestTimes) data.bestTimes = {};
    data.clearedLevels[eraId] = true;
    var sec = Math.max(1, Number(timeSec) || 0);
    var prev = data.bestTimes[eraId];
    var isBest = !prev || sec < prev;
    if (isBest) data.bestTimes[eraId] = Math.round(sec * 10) / 10;
    save();
    return { isBest: isBest, bestTime: data.bestTimes[eraId] };
  }

  function isStageCleared(eraId) {
    return !!(data.clearedLevels && data.clearedLevels[eraId]);
  }

  function getBestStageTime(eraId) {
    return (data.bestTimes && data.bestTimes[eraId]) ? data.bestTimes[eraId] : null;
  }

  function unlockAbyssCheckpoint() {
    if (!data.abyssReached) {
      data.abyssReached = true;
      save();
      return true;
    }
    return false;
  }

  function setSelectedSeaStart(mode) {
    data.selectedSeaStart = (mode === 'abyss') ? 'abyss' : 'surface';
    save();
  }

  function getSelectedSeaStart() {
    return data.selectedSeaStart || 'surface';
  }

  function markRebirthWitnessed() {
    if (!data.rebirthWitnessed) {
      data.rebirthWitnessed = true;
      save();
      return true;
    }
    return false;
  }

  function isEraUnlocked(eraId) { return !!data.unlockedEras[eraId]; }

  function selectStartEra(eraId) {
    if (data.unlockedEras[eraId]) {
      data.selectedEraId = eraId;
      save();
      return true;
    }
    return false;
  }

  function getSelectedStartEra() {
    var eras = window.MT.Config.ERAS || [];
    for (var i = 0; i < eras.length; i++) {
      if (eras[i].id === data.selectedEraId && data.unlockedEras[eras[i].id]) {
        return eras[i];
      }
    }
    return eras[0];
  }

  function depositRun(starsEarned, distM, reachedErasMap, isEndless) {
    var earned = Math.max(0, Math.floor(starsEarned || 0));
    data.bank += earned;
    data.totalVoyages += 1;
    if (isEndless) {
      if (distM > data.bestEndlessDist) data.bestEndlessDist = Math.floor(distM);
    } else {
      if (distM > data.bestDist) data.bestDist = Math.floor(distM);
    }
    if (reachedErasMap && typeof reachedErasMap === 'object') {
      Object.keys(reachedErasMap).forEach(function (k) {
        if (reachedErasMap[k] && typeof data.unlockedEras[k] !== 'undefined' && !data.unlockedEras[k]) {
          data.unlockedEras[k] = true;
          var bp = getItemByEra(k);
          if (bp) freshBlueprints[bp.id] = true;
        }
      });
    }
    save();
  }

  function getStats() {
    var cfg = window.MT.Config.SURF;
    var rLv = getLevel('rocket');
    var hLv = getLevel('hull');
    var mLv = getLevel('magnet');
    var dfLv = getLevel('deep_fins');
    var ssLv = getLevel('sky_sail');
    var tsLv = getLevel('tide_sonar');
    var wbLv = getLevel('warm_breaker');
    var hsLv = getLevel('heat_shield');
    var qLv = getLevel('quilt');
    var spLv = getLevel('springs');
    var gLv = getLevel('glider');
    var pLv = getLevel('prow');

    var maxHullTable = [100, 140, 185, 240];
    var resistTable = [0, 0.65, 0.90, 1.0];
    var magnetTable = [cfg.MAGNET_RADIUS, 130, 182, 236];
    var starMultTable = [1.0, 1.0, 1.25, 1.50];
    var glideLiftTable = [0, 0.42, 0.64, 0.80];

    var breathDrainTable = [1.0, 0.70, 0.56, 0.46];
    var diveChargeTable  = [1.0, 1.25, 1.45, 1.72];
    var breachPowerTable = [1.0, 1.07, 1.15, 1.25];
    var shockRadTable    = [0, 0, 260, 380];
    var sailGlideTable   = [0, 0.36, 0.56, 0.70];
    var cloudBonusTable  = [1.0, 1.35, 2.00, 2.40];
    var sonarPeriodTable = [0, 4.4, 3.3, 2.4];
    var sonarRangeTable  = [0, 440, 620, 820];
    var sonarStarTable   = [1.0, 1.0, 1.25, 1.45];
    var sonarRelicTable  = [1.0, 1.0, 1.35, 2.00];

    var baseStarMult = starMultTable[mLv] || 1.0;

    return {
      rocketLv: rLv,
      hullLv: hLv,
      magnetLv: mLv,
      deepFinsLv: dfLv,
      skySailLv: ssLv,
      tideSonarLv: tsLv,
      warmBreakerLv: wbLv,
      frostChillResist: wbLv >= 3 ? 1.0 : (wbLv === 2 ? 0.75 : (wbLv === 1 ? 0.45 : 0.0)),
      canBreakThinIce: wbLv >= 1,
      canBreakThickIce: wbLv >= 3,
      iceBreakRefills: wbLv >= 2,
      heatShieldLv: hsLv,
      quiltLv: qLv,
      springsLv: spLv,
      gliderLv: gLv,
      prowLv: pLv,

      // 三套海洋专属流派 Build 属性
      breathDrainMult: breathDrainTable[dfLv] || 1.0,
      diveChargeMult: diveChargeTable[dfLv] || 1.0,
      breachPowerMult: breachPowerTable[dfLv] || 1.0,
      breachShockRadius: shockRadTable[dfLv] || 0,
      deepMaxBonus: dfLv * 14,
      breachRefillsFuel: dfLv >= 3,

      sailGlideFrac: sailGlideTable[ssLv] || 0,
      cloudBonusMult: cloudBonusTable[ssLv] || 1.0,
      sailFuelRegen: ssLv >= 2 ? (ssLv >= 3 ? 0.24 : 0.14) : 0,
      cloudDoubleJump: ssLv >= 3,

      sonarPeriod: sonarPeriodTable[tsLv] || 0,
      sonarRange: sonarRangeTable[tsLv] || 0,
      sonarRelicMult: sonarRelicTable[tsLv] || 1.0,
      sonarRevealRelics: tsLv >= 1,

      maxHull: maxHullTable[hLv] || 100,
      crashDamageMult: 1 - hLv * 0.18,
      thrustMult: 1 + rLv * 0.18,
      liftMult: 1 + rLv * 0.14,
      burnRateMult: Math.max(0.58, 1 - rLv * 0.13),
      maxSpeed: cfg.MAX_SPEED + rLv * 48 + (pLv >= 2 ? 22 : 0) + (dfLv >= 2 ? 20 : 0) + (ssLv >= 2 ? 18 : 0),
      magnetRadius: (magnetTable[mLv] || cfg.MAGNET_RADIUS) + (tsLv >= 2 ? 56 : (tsLv === 1 ? 24 : 0)),
      starMult: Math.round(baseStarMult * (sonarStarTable[tsLv] || 1.0) * 100) / 100,

      heatResist: resistTable[hsLv] || 0,
      fireFuelRegen: hsLv >= 2 ? (hsLv >= 3 ? 0.34 : 0.22) : 0,
      fireHullRegen: hsLv >= 3 ? 2.8 : 0,

      coldResist: resistTable[qLv] || 0,
      iceControlBonus: qLv >= 1 ? 1.0 : 0.0,
      iceFuelRegen: qLv >= 2 ? (qLv >= 3 ? 0.34 : 0.22) : 0,
      iceHullRegen: qLv >= 3 ? 2.6 : 0,

      bumpResist: resistTable[spLv] || 0,
      roughFrictionRelief: spLv * 0.065,
      springBounceBonus: spLv >= 2 ? (spLv >= 3 ? 135 : 80) : 0,

      glideLiftFrac: glideLiftTable[gLv] || 0,
      airFuelRegen: gLv >= 2 ? (gLv >= 3 ? 0.24 : 0.14) : 0,
      updraftMult: 1 + gLv * 0.42,

      vineDamageMult: pLv >= 2 ? 0 : (pLv === 1 ? 0.30 : 1.0),
      vineSliceBoost: pLv >= 1 ? (60 + pLv * 38) : 0,
      vineSliceFuel: pLv >= 2 ? 0.34 : (pLv === 1 ? 0.18 : 0),
      vineSliceHeal: pLv >= 3 ? 8 : 0
    };
  }

  load();

  return {
    load: load,
    save: save,
    resetProgress: resetProgress,
    getLevel: getLevel,
    getItemByEra: getItemByEra,
    isBlueprintUnlocked: isBlueprintUnlocked,
    isBlueprintFresh: isBlueprintFresh,
    clearFreshBlueprints: clearFreshBlueprints,
    getUnlockedEraCount: getUnlockedEraCount,
    getUnlockedBlueprintCount: getUnlockedBlueprintCount,
    getNextCost: getNextCost,
    canBuy: canBuy,
    buy: buy,
    unlockEra: unlockEra,
    collectRelic: collectRelic,
    hasRelic: hasRelic,
    getRelicCount: getRelicCount,
    discoverFauna: discoverFauna,
    hasFauna: hasFauna,
    getFaunaCount: getFaunaCount,
    discoverWonder: discoverWonder,
    hasWonder: hasWonder,
    getWonderCount: getWonderCount,
    saveSnapshot: saveSnapshot,
    getSnapshot: getSnapshot,
    awakenShrine: awakenShrine,
    hasShrine: hasShrine,
    getShrineCount: getShrineCount,
    markHarborIlluminated: markHarborIlluminated,
    isHarborIlluminated: function () { return !!data.harborIlluminated; },
    markHarborFinaleWitnessed: markHarborFinaleWitnessed,
    isHarborFinaleWitnessed: function () { return !!data.harborFinaleWitnessed; },
    unlockFrostRealm: unlockFrostRealm,
    isFrostUnlocked: isFrostUnlocked,
    awakenFrostShrine: awakenFrostShrine,
    hasFrostShrine: hasFrostShrine,
    getFrostShrineCount: getFrostShrineCount,
    markFrostSanctuaryAwake: markFrostSanctuaryAwake,
    isFrostSanctuaryAwake: function () { return !!data.frostSanctuaryAwake; },
    markFrostFinaleWitnessed: markFrostFinaleWitnessed,
    isFrostFinaleWitnessed: function () { return !!data.frostFinaleWitnessed; },
    unlockTimeWatch: unlockTimeWatch,
    isTimeWatchUnlocked: isTimeWatchUnlocked,
    markTutorialDone: markTutorialDone,
    getSettings: getSettings,
    updateSettings: updateSettings,
    isTutorialDone: isTutorialDone,
    isSkinUnlocked: isSkinUnlocked,
    unlockSkin: unlockSkin,
    selectSubSkin: selectSubSkin,
    getSelectedSubSkin: getSelectedSubSkin,
    isCommissionClaimed: isCommissionClaimed,
    isCommissionReady: isCommissionReady,
    claimCommission: claimCommission,
    getCodexProgress: getCodexProgress,
    recordStageClear: recordStageClear,
    isStageCleared: isStageCleared,
    getBestStageTime: getBestStageTime,
    unlockAbyssCheckpoint: unlockAbyssCheckpoint,
    setSelectedSeaStart: setSelectedSeaStart,
    getSelectedSeaStart: getSelectedSeaStart,
    isAbyssReached: function () { return !!data.abyssReached; },
    markRebirthWitnessed: markRebirthWitnessed,
    isRebirthWitnessed: function () { return !!data.rebirthWitnessed; },
    isEndlessUnlocked: function () { return !!data.rebirthWitnessed; },
    isEraUnlocked: isEraUnlocked,
    selectStartEra: selectStartEra,
    getSelectedStartEra: getSelectedStartEra,
    depositRun: depositRun,
    getStats: getStats,
    getBank: function () { return data.bank; },
    getBestDist: function () { return data.bestDist; },
    getBestEndlessDist: function () { return data.bestEndlessDist; },
    getTotalVoyages: function () { return data.totalVoyages; },
    getUnlockedEras: function () { return data.unlockedEras; },
    getUpgrades: function () { return data.upgrades; }
  };
})();
