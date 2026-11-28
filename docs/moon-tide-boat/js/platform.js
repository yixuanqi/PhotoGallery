window.MT = window.MT || {};

// 旧版 Android WebView (Chromium < 99) Canvas roundRect 兼容补丁
(function () {
  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
      var r = 0;
      if (typeof radii === 'number') r = radii;
      else if (Array.isArray(radii) && radii.length > 0) r = Number(radii[0]) || 0;
      r = Math.max(0, Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5));
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
      return this;
    };
  }
})();

// TapTap H5 容器适配与静音偏好轻存档（标准浏览器同样零报错运行）
window.MT.Platform = (function () {
  var MUTE_KEY = 'mt_v4_audio_muted';

  function isTapTapContainer() {
    try {
      if (typeof window.tap !== 'undefined' && window.tap) return true;
      return /TapTap/i.test(navigator.userAgent || '');
    } catch (e) {
      return false;
    }
  }

  function init(onPauseChange) {
    if (isTapTapContainer()) {
      document.documentElement.classList.add('taptap-env');
    }
    try {
      if (typeof window.tap !== 'undefined' && window.tap) {
        if (typeof window.tap.onHide === 'function') {
          window.tap.onHide(function () { if (typeof onPauseChange === 'function') onPauseChange(true); });
        }
        if (typeof window.tap.onShow === 'function') {
          window.tap.onShow(function () { if (typeof onPauseChange === 'function') onPauseChange(false); });
        }
        if (typeof window.tap.setKeepScreenOn === 'function') {
          window.tap.setKeepScreenOn({ keepScreenOn: true });
        }
      }
    } catch (e) {}

    var unlock = function () {
      if (window.MT && window.MT.Audio && window.MT.Audio.resume) {
        window.MT.Audio.resume();
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  function loadMuted() {
    try {
      return window.localStorage && window.localStorage.getItem(MUTE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function saveMuted(flag) {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(MUTE_KEY, flag ? '1' : '0');
      }
    } catch (e) {}
  }

  return {
    init: init,
    isTapTapContainer: isTapTapContainer,
    loadMuted: loadMuted,
    saveMuted: saveMuted
  };
})();
