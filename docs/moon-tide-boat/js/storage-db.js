window.MT = window.MT || {};

// v13 Step 1：独立 IndexedDB 实景邮票存储底座
// 目的：彻底将实景水彩邮票（最高 26+ 张 JPEG）迁出 localStorage，根治 iOS/微信/TapTap 5MB 限额坏档风险，
//      同时维护同步内存缓存，确保手记界面读取 get(id) 零闪烁、零延迟。
window.MT.StorageDB = (function () {
  var DB_NAME = 'moon_tide_stamps_db';
  var DB_VER = 1;
  var STORE_NAME = 'stamps';
  var db = null;
  var cache = {};
  var ready = false;
  var readyCallbacks = [];

  function flushReady() {
    ready = true;
    while (readyCallbacks.length > 0) {
      var cb = readyCallbacks.shift();
      try { cb(); } catch (e) {}
    }
  }

  function openDB(onDone) {
    try {
      var idb = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB;
      if (!idb) {
        if (onDone) onDone(null);
        return;
      }
      var req = idb.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function (e) {
        var d = e.target.result;
        if (!d.objectStoreNames.contains(STORE_NAME)) {
          d.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = function (e) {
        db = e.target.result;
        if (onDone) onDone(db);
      };
      req.onerror = function () {
        db = null;
        if (onDone) onDone(null);
      };
    } catch (e) {
      db = null;
      if (onDone) onDone(null);
    }
  }

  function putToDB(id, dataUrl) {
    if (!db || !id || !dataUrl) return;
    try {
      var tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ id: id, dataUrl: dataUrl, updatedAt: Date.now() });
    } catch (e) {}
  }

  function init(legacyMap, onReady) {
    if (onReady) {
      if (ready) {
        try { onReady(); } catch (e) {}
      } else {
        readyCallbacks.push(onReady);
      }
    }
    // 先将旧存档传入的快照注入内存缓存（保证首帧可读）
    if (legacyMap && typeof legacyMap === 'object') {
      Object.keys(legacyMap).forEach(function (k) {
        if (legacyMap[k]) cache[k] = legacyMap[k];
      });
    }

    openDB(function (opened) {
      if (!opened) {
        flushReady();
        return;
      }
      try {
        var tx = opened.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var req = store.openCursor();
        req.onsuccess = function (e) {
          var cursor = e.target.result;
          if (cursor) {
            var val = cursor.value;
            if (val && val.id && val.dataUrl) {
              cache[val.id] = val.dataUrl;
            }
            cursor.continue();
          } else {
            // 将旧 localStorage 迁移来的邮票写回 IndexedDB
            if (legacyMap && typeof legacyMap === 'object') {
              Object.keys(legacyMap).forEach(function (k) {
                if (legacyMap[k]) putToDB(k, legacyMap[k]);
              });
            }
            flushReady();
          }
        };
        req.onerror = function () { flushReady(); };
      } catch (e) {
        flushReady();
      }
    });
  }

  function put(id, dataUrl) {
    if (!id || !dataUrl) return false;
    cache[id] = dataUrl;
    putToDB(id, dataUrl);
    return true;
  }

  function get(id) {
    return (id && cache[id]) ? cache[id] : null;
  }

  function getAll() {
    return Object.assign({}, cache);
  }

  function clear() {
    cache = {};
    if (!db) return;
    try {
      var tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    } catch (e) {}
  }

  return {
    init: init,
    put: put,
    get: get,
    getAll: getAll,
    clear: clear,
    isReady: function () { return ready; }
  };
})();
