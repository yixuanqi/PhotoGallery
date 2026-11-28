// Storage abstraction layer (v50.0): synchronous local persistence + optional TapTap Cloud Save adapter
// Automatically detects TapTap H5 / mini-game `tap.getCloudSaveManager()` or `tap.getFileSystemManager()`
// and falls back seamlessly to localStorage in standard browsers (blog / itch.io / offline file://).

const CLOUD_ARCHIVE_PREFIX = 'abv_cloud_';
const CLOUD_MIN_INTERVAL_MS = 2500;

class LocalStorageAdapter {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  remove(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
}

function detectTapRuntime() {
  const g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : null);
  if (!g) return null;
  const tapObj = g.tap || g.TapSDK || null;
  if (!tapObj || typeof tapObj !== 'object') return null;
  const hasCloudMgr = typeof tapObj.getCloudSaveManager === 'function';
  const hasFsMgr = typeof tapObj.getFileSystemManager === 'function';
  if (!hasCloudMgr && !hasFsMgr) return null;
  return { tap: tapObj, hasCloudMgr, hasFsMgr };
}

export class TapCloudStorageAdapter {
  constructor(localFallback) {
    this.local = localFallback || new LocalStorageAdapter();
    this.runtime = detectTapRuntime();
    this.provider = this.runtime ? 'taptap' : 'local';
    this.state = this.runtime ? 'ready' : 'local';
    this.lastSyncAt = 0;
    this.lastError = null;
    this._pending = new Map();
    this._flushTimer = null;
    this._lastUploadAt = 0;
    this._listeners = new Set();
    this._cloudMgr = null;
    this._fsMgr = null;
    if (this.runtime) {
      try {
        if (this.runtime.hasCloudMgr) this._cloudMgr = this.runtime.tap.getCloudSaveManager();
      } catch {
        this._cloudMgr = null;
      }
      try {
        if (this.runtime.hasFsMgr) this._fsMgr = this.runtime.tap.getFileSystemManager();
      } catch {
        this._fsMgr = null;
      }
    }
  }

  onStatusChange(fn) {
    if (typeof fn === 'function') this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _emitStatus() {
    const snap = this.getStatus();
    for (const fn of this._listeners) {
      try { fn(snap); } catch {}
    }
  }

  getStatus() {
    return {
      provider: this.provider,
      state: this.state,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
      cloudAvailable: !!(this._cloudMgr || this._fsMgr)
    };
  }

  get(key) {
    return this.local.get(key);
  }

  set(key, value) {
    const ok = this.local.set(key, value);
    if (this._isCloudTrackedKey(key) && (this._cloudMgr || this._fsMgr)) {
      this._queueUpload(key, value);
    }
    return ok;
  }

  remove(key) {
    const ok = this.local.remove(key);
    if (this._isCloudTrackedKey(key) && (this._cloudMgr || this._fsMgr)) {
      this._queueUpload(key, null);
    }
    return ok;
  }

  _isCloudTrackedKey(key) {
    return typeof key === 'string' && key.startsWith('ashen_bell_vow_slot_') && !key.endsWith('_bak');
  }

  _queueUpload(key, value) {
    this._pending.set(key, value);
    if (this._flushTimer) return;
    const elapsed = Date.now() - this._lastUploadAt;
    const delay = Math.max(250, CLOUD_MIN_INTERVAL_MS - elapsed);
    this._flushTimer = window.setTimeout(() => {
      this._flushTimer = null;
      this.flushCloudQueue().catch(() => {});
    }, delay);
  }

  async flushCloudQueue() {
    if (!this._cloudMgr && !this._fsMgr) return false;
    if (this._pending.size === 0) return true;
    const batch = Array.from(this._pending.entries());
    this._pending.clear();
    this.state = 'syncing';
    this.lastError = null;
    this._emitStatus();
    try {
      for (let i = 0; i < batch.length; i++) {
        const [key, val] = batch[i];
        await this._writeCloudKey(key, val);
      }
      this._lastUploadAt = Date.now();
      this.lastSyncAt = this._lastUploadAt;
      this.state = 'synced';
      this._emitStatus();
      return true;
    } catch (err) {
      this.state = 'error';
      this.lastError = err && err.message ? err.message : 'Cloud sync failed';
      this._emitStatus();
      return false;
    }
  }

  _writeCloudKey(key, rawValue) {
    const fileName = `${CLOUD_ARCHIVE_PREFIX}${key}.json`;
    if (this._cloudMgr) {
      return new Promise((resolve, reject) => {
        if (rawValue === null) {
          if (typeof this._cloudMgr.deleteArchive === 'function') {
            this._cloudMgr.deleteArchive({
              archiveName: fileName,
              success: () => resolve(true),
              fail: err => reject(err)
            });
          } else {
            resolve(true);
          }
          return;
        }
        const writeFn = typeof this._cloudMgr.updateArchive === 'function'
          ? this._cloudMgr.updateArchive.bind(this._cloudMgr)
          : (typeof this._cloudMgr.createArchive === 'function' ? this._cloudMgr.createArchive.bind(this._cloudMgr) : null);
        if (!writeFn) {
          resolve(false);
          return;
        }
        writeFn({
          archiveName: fileName,
          archiveSummary: 'Ashen Bell Vow Save',
          archiveData: rawValue,
          success: () => resolve(true),
          fail: () => {
            if (typeof this._cloudMgr.createArchive === 'function' && writeFn !== this._cloudMgr.createArchive) {
              this._cloudMgr.createArchive({
                archiveName: fileName,
                archiveSummary: 'Ashen Bell Vow Save',
                archiveData: rawValue,
                success: () => resolve(true),
                fail: err2 => reject(err2)
              });
            } else {
              resolve(false);
            }
          }
        });
      });
    }
    if (this._fsMgr && this.runtime && this.runtime.tap && this.runtime.tap.env && this.runtime.tap.env.USER_DATA_PATH) {
      const fullPath = `${this.runtime.tap.env.USER_DATA_PATH}/${fileName}`;
      return new Promise((resolve, reject) => {
        if (rawValue === null) {
          if (typeof this._fsMgr.unlink === 'function') {
            this._fsMgr.unlink({ filePath: fullPath, success: () => resolve(true), fail: () => resolve(true) });
          } else {
            resolve(true);
          }
          return;
        }
        this._fsMgr.writeFile({
          filePath: fullPath,
          data: rawValue,
          encoding: 'utf8',
          success: () => resolve(true),
          fail: err => reject(err)
        });
      });
    }
    return Promise.resolve(false);
  }

  _readCloudKey(key) {
    const fileName = `${CLOUD_ARCHIVE_PREFIX}${key}.json`;
    if (this._cloudMgr && typeof this._cloudMgr.getArchiveData === 'function') {
      return new Promise(resolve => {
        this._cloudMgr.getArchiveData({
          archiveName: fileName,
          success: res => resolve(res && typeof res.data === 'string' ? res.data : (typeof res === 'string' ? res : null)),
          fail: () => resolve(null)
        });
      });
    }
    if (this._fsMgr && this.runtime && this.runtime.tap && this.runtime.tap.env && this.runtime.tap.env.USER_DATA_PATH) {
      const fullPath = `${this.runtime.tap.env.USER_DATA_PATH}/${fileName}`;
      return new Promise(resolve => {
        this._fsMgr.readFile({
          filePath: fullPath,
          encoding: 'utf8',
          success: res => resolve(res && typeof res.data === 'string' ? res.data : null),
          fail: () => resolve(null)
        });
      });
    }
    return Promise.resolve(null);
  }

  async pullCloudKeys(keys) {
    if (!this._cloudMgr && !this._fsMgr) {
      return { ok: false, updated: 0, conflicts: [], provider: 'local' };
    }
    this.state = 'syncing';
    this.lastError = null;
    this._emitStatus();
    let updated = 0;
    const conflicts = [];
    try {
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const remoteRaw = await this._readCloudKey(key);
        if (!remoteRaw) continue;
        let remoteObj = null;
        try { remoteObj = JSON.parse(remoteRaw); } catch { continue; }
        if (!remoteObj || typeof remoteObj !== 'object' || !remoteObj.v) continue;

        const localRaw = this.local.get(key);
        if (!localRaw) {
          this.local.set(key, remoteRaw);
          updated++;
          continue;
        }
        let localObj = null;
        try { localObj = JSON.parse(localRaw); } catch { localObj = null; }
        const remoteTs = Number(remoteObj.savedAt) || 0;
        const localTs = Number(localObj && localObj.savedAt) || 0;
        if (!localObj || remoteTs > localTs) {
          if (localRaw) this.local.set(`${key}_bak`, localRaw);
          this.local.set(key, remoteRaw);
          updated++;
        } else if (localTs > remoteTs && remoteTs > 0) {
          this._queueUpload(key, localRaw);
          conflicts.push({ key, resolution: 'kept_local', localTs, remoteTs });
        }
      }
      this.lastSyncAt = Date.now();
      this.state = 'synced';
      this._emitStatus();
      return { ok: true, updated, conflicts, provider: 'taptap' };
    } catch (err) {
      this.state = 'error';
      this.lastError = err && err.message ? err.message : 'Cloud pull failed';
      this._emitStatus();
      return { ok: false, updated, conflicts, provider: 'taptap', error: this.lastError };
    }
  }
}

let activeAdapter = new TapCloudStorageAdapter(new LocalStorageAdapter());

export function setStorageAdapter(adapter) {
  if (adapter && typeof adapter.get === 'function' && typeof adapter.set === 'function') {
    activeAdapter = adapter;
  }
}

export const storage = {
  get(key) {
    return activeAdapter.get(key);
  },
  set(key, value) {
    return activeAdapter.set(key, value);
  },
  remove(key) {
    return activeAdapter.remove(key);
  },
  getJSON(key) {
    const raw = activeAdapter.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setJSON(key, obj) {
    try {
      return activeAdapter.set(key, JSON.stringify(obj));
    } catch {
      return false;
    }
  },
  getCloudStatus() {
    if (typeof activeAdapter.getStatus === 'function') return activeAdapter.getStatus();
    return { provider: 'local', state: 'local', lastSyncAt: 0, lastError: null, cloudAvailable: false };
  },
  onCloudStatusChange(fn) {
    if (typeof activeAdapter.onStatusChange === 'function') return activeAdapter.onStatusChange(fn);
    return () => {};
  },
  pullCloudKeys(keys) {
    if (typeof activeAdapter.pullCloudKeys === 'function') return activeAdapter.pullCloudKeys(keys);
    return Promise.resolve({ ok: false, updated: 0, conflicts: [], provider: 'local' });
  },
  flushCloudQueue() {
    if (typeof activeAdapter.flushCloudQueue === 'function') return activeAdapter.flushCloudQueue();
    return Promise.resolve(false);
  }
};
