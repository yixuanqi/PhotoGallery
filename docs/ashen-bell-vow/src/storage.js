// Storage abstraction layer: decouples save/settings persistence from browser localStorage
// so future Electron / Tauri / Steam Cloud backends can swap in without touching gameplay code.

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

let activeAdapter = new LocalStorageAdapter();

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
  }
};
